import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,fight,walk,navigateMaps,goWorldLocation} from './helpers.mjs';
import {prepareQuest,finishJourney} from './structure-routes.mjs';
import {projectGame} from '../src/application/projection.js';
import {validateContent} from '../src/core/validation.js';
import {validateSave} from '../src/core/save.js';
import {GameView} from '../src/view/view.js';
import {SceneView} from '../src/view/scene-view.js';
import {installDOM} from './view-dom.mjs';

const choose=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}),id);drain(g);};
const values=g=>g.state.stories.q004.values;
const saved=g=>{const text=g.save();assert.deepEqual(validateSave(JSON.parse(text),data),[]);g.load(text);assert.equal(g.save(),text);};
const atDoor=()=>{const g=newGame();g.random=()=>.999999;g.dispatch({type:'travel',dungeon:'region_1'});navigateMaps(g,'region_1_landing');walk(g,13,3);return g;};

test('expanded waterway has connected wet basins: shallow is walkable, deep and bottomless stay impassable',()=>{
  const g=newGame();g.random=()=>.999999;g.dispatch({type:'travel',dungeon:'region_1'});
  const count={shallow_depression_water:0,deep_depression_water:0,bottomless_depression_water:0};
  for(const id of data.dungeons.region_1.maps){
    const m=data.maps[id];assert.ok(m.tiles.length>=7,id);
    for(const row of m.cells.rows)for(const c of row)if(Object.hasOwn(count,m.cells.legend[c]))count[m.cells.legend[c]]++;
  }
  assert.ok(Object.values(count).every(n=>n>20));
  walk(g,2,5);assert.equal(projectGame(g).dungeon.cells[5][2].waterDepth,1);
  walk(g,5,5);g.state.location.facing='east';const before={steps:g.state.steps,light:g.state.light};
  assert.equal(g.dispatch({type:'move',direction:'forward'}),false);assert.deepEqual({steps:g.state.steps,light:g.state.light},before);
  assert.throws(()=>g.teleport('region_1_f1',6,5),/移動できない/);
  navigateMaps(g,'region_1_gatehouse');walk(g,5,5);g.state.location.facing='east';
  assert.equal(g.dispatch({type:'move',direction:'forward'}),false);
  const cell=projectGame(g).dungeon.cells[5][6];assert.equal(cell.relief.bottomless,true);assert.equal(cell.wall,false);assert.equal(cell.waterDepth,2);
  saved(g);
});

test('checkpoint requires its exact cell and an explicit entry choice, then returns to that cell with the same expedition',()=>{
  const g=newGame();assert.equal(g.dispatch({type:'location.enter',id:'waterway_checkpoint'}),false);
  assert.equal(g.dispatch({type:'location.move',id:'waterway_checkpoint'}),false);
  const h=atDoor();walk(h,13,4);assert.equal(h.dispatch({type:'location.enter',id:'waterway_checkpoint'}),false);walk(h,13,3);
  const before={run:h.state.dungeons.active.run,steps:h.state.steps,light:h.state.light,water:structuredClone(h.state.dungeons.persistent.region_1.systems.water)};
  assert.ok(h.dispatch({type:'interact'}));assert.equal(h.state.mode,'dungeon');
  const option=projectGame(h).dialog.options.find(o=>o.text==='詰所に入る');assert.ok(option);choose(h,option.id);
  const m=projectGame(h);assert.equal(m.town.id,'waterway_checkpoint');assert.match(m.town.background,/checkpoint.webp$/);assert.equal(m.dungeon,null);assert.equal(m.town.interior,true);
  assert.equal(m.tavern.editable,false);assert.ok(m.roster.every(c=>!c.canJoin&&!c.canLeave&&!c.canMoveUp&&!c.canMoveDown));
  for(const intent of [{type:'travel',dungeon:'region_1'},{type:'location.move',id:'hikarigaeri_square'},{type:'service',id:'inn'},{type:'job.change',actor:'ada',job:'merchant'}])assert.equal(h.dispatch(intent),false);
  saved(h);assert.ok(h.dispatch({type:'location.move',id:'waterway_checkpoint_holding'}));saved(h);
  assert.equal(h.dispatch({type:'location.exit'}),false);assert.ok(h.dispatch({type:'location.move',id:'waterway_checkpoint'}));
  assert.ok(h.dispatch({type:'location.exit'}));assert.deepEqual(h.state.location,{map:'region_1_landing',x:13,y:3,facing:'south'});
  assert.deepEqual({run:h.state.dungeons.active.run,steps:h.state.steps,light:h.state.light,water:h.state.dungeons.persistent.region_1.systems.water},before);saved(h);
});

test('q004 records are learned at the registry and the guard confession only after walking back to the desk',()=>{
  const g=prepareQuest('q004');choose(g,'window');assert.equal(g.state.mode,'dungeon');assert.equal(values(g).windowOpen,false);saved(g);
  finishJourney(g);assert.equal(g.state.townLocation,'waterway_checkpoint');assert.equal(values(g).windowOpen,true);
  choose(g,'inspect');assert.deepEqual(g.state.stories.q004.knowledge.party,['shared','duty']);assert.equal(values(g).truthKnown,false);saved(g);
  assert.equal(g.dispatch({type:'story.resume',quest:'q004'}),false);assert.equal(values(g).truthKnown,false);
  finishJourney(g);assert.equal(g.state.townLocation,'hikarigaeri_pass_registry');assert.ok(g.state.stories.q004.knowledge.party.includes('resident'));assert.equal(values(g).truthKnown,false);
  choose(g,'return');assert.equal(values(g).truthKnown,false);finishJourney(g);assert.equal(values(g).truthKnown,true);
  choose(g,'file');assert.equal(values(g).filed,false);assert.equal(values(g).keeperAt,'desk');finishJourney(g);assert.equal(values(g).filed,false);
  choose(g,'submit');assert.equal(values(g).filed,true);choose(g,'accompany');assert.equal(values(g).reviewerAt,'transit');assert.equal(values(g).released,false);saved(g);
  finishJourney(g);assert.equal(values(g).reviewerAt,'desk');assert.equal(values(g).sisterAt,'cell');
  choose(g,'issue');assert.equal(values(g).sisterAt,'desk');assert.equal(g.state.quests.q004.stage,'active');assert.throws(()=>g.complete('q004','informed'));
  choose(g,'leave');assert.equal(g.state.mode,'town');assert.equal(values(g).sisterAt,'transit');saved(g);finishJourney(g);
  assert.deepEqual([g.state.location.x,g.state.location.y],[13,5]);choose(g,'finish');assert.equal(g.state.quests.q004.outcome,'informed');saved(g);
});

test('q004 forced rescue starts combat at the holding room and completes only after escorting the sister outside',()=>{
  const g=prepareQuest('q004');choose(g,'force');assert.equal(g.state.battle,null);assert.equal(values(g).released,false);finishJourney(g);
  assert.equal(g.state.townLocation,'waterway_checkpoint_holding');choose(g,'break');assert.ok(g.state.battle);assert.equal(values(g).released,false);saved(g);
  fight(g);assert.equal(values(g).released,true);assert.equal(values(g).sisterAt,'cell');assert.equal(values(g).originalAt,'keeper');
  choose(g,'escort');finishJourney(g);assert.equal(values(g).sisterAt,'outside');choose(g,'finish');assert.equal(g.state.quests.q004.outcome,'contract');saved(g);
});

test('q004 fine stays local and cannot complete the escort before the party reaches the outside',()=>{
  const g=prepareQuest('q004');choose(g,'window');finishJourney(g);const gold=g.state.gold;
  choose(g,'fine');assert.equal(g.state.gold,gold-20);assert.throws(()=>g.complete('q004','compromise'));assert.equal(values(g).sisterAt,'desk');assert.equal(values(g).originalAt,'sister');assert.equal(g.state.quests.q004.stage,'active');
  choose(g,'leave');assert.equal(g.state.quests.q004.stage,'active');finishJourney(g);choose(g,'finish');assert.equal(g.state.quests.q004.outcome,'compromise');saved(g);
});

test('interior definitions and saves reject blocked entrances, cross-town links, flooding and missing expedition state',()=>{
  for(const change of [
    d=>d.locations.waterway_checkpoint.dungeonEntrance.x=0,
    d=>d.locations.waterway_checkpoint.dungeonEntrance.map='region_1_canal_a',
    d=>d.locations.waterway_checkpoint.links.push('hikarigaeri_square'),
    d=>d.locations.hikarigaeri_square.links.push('waterway_checkpoint'),
    d=>d.locations.waterway_checkpoint.parent='hikarigaeri_square'
  ]){const bad=structuredClone(data);change(bad);assert.ok(validateContent(bad).length);}
  const g=atDoor();g.dispatch({type:'location.enter',id:'waterway_checkpoint'});
  for(const change of [s=>s.dungeons.active=null,s=>s.townLocation='hikarigaeri_square',s=>s.location={map:'region_1_landing',x:13,y:3,facing:'south'}]){
    const bad=JSON.parse(g.save());change(bad.state);assert.ok(validateSave(bad,data).length);
  }
});

for(const View of [GameView,SceneView])test(`${View.name}: location background, explicit exit and cancel work in the checkpoint`,()=>{
  const g=atDoor();goWorldLocation(g,'waterway_checkpoint');const dom=installDOM();
  try{
    const root=dom.document.createElement('main');dom.document.body.append(root);
    const view=new View(root,intent=>{const changed=g.dispatch(intent);view.render(projectGame(g));return changed;},{status(){},menu(){},help(){},sound(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));
    assert.equal(root.querySelector('.town-background').src,'assets/images/locations/checkpoint.webp');
    assert.ok([...root.querySelectorAll('button')].some(b=>b.textContent==='詰所を出る'));
    g.dispatch({type:'location.move',id:'waterway_checkpoint_holding'});view.render(projectGame(g));view.cancel();assert.equal(g.state.townLocation,'waterway_checkpoint');
    view.cancel();assert.equal(g.state.mode,'dungeon');assert.deepEqual([g.state.location.x,g.state.location.y],[13,3]);
  }finally{dom.restore();}
});
