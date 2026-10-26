import {loadStages} from '../tools/audit-regional-relocation.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {validateContent} from '../src/core/validation.js';
import {projectGame} from '../src/application/projection.js';
import {commandDialog} from '../src/core/player-commands.js';
import {oilStore,oilTotal} from '../src/core/expedition-oil.js';
import {applyEditionGeography} from '../src/core/edition-geography.js';
import {drain,walk,navigateMaps,fight} from './helpers.mjs';
import {finishJourney} from './structure-routes.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
import {handleGameKey} from '../src/view/keyboard.js';

const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8').then(JSON.parse);
const data=await loadContent(read,{edition:'e2'}),first=await loadContent(read),preCut=await loadStages();
const fresh=()=>{const g=new GameEngine(data,1907);drain(g);g.random=()=>.999999;return g;};
const save=g=>{const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),data),[]);g.load(raw);assert.equal(g.save(),raw);};
function gate(g){assert.ok(g.dispatch({type:'travel',dungeon:'region_1'}));navigateMaps(g,'region_1_landing');walk(g,15,3);}
function cross(g,route){assert.ok(g.dispatch({type:'world.cross',route}),`${route}: ${g.state.notice}`);drain(g);save(g);}
function outward(g){
  const run=g.state.dungeons.active.run,next=g.state.dungeons.nextRun;
  cross(g,'oddland_checkpoint');assert.equal(g.state.worldTravel.visited.oddland,undefined);
  for(const route of ['trade_refuge','border_customs']){walk(g,9,3);cross(g,route);assert.equal(g.state.dungeons.active.run,run);assert.equal(g.state.dungeons.nextRun,next);}
  walk(g,9,3);const fuel=g.state.light,hp=g.state.members.map(id=>g.state.actors[id].hp);cross(g,'oddland_surface');
  assert.equal(g.state.townLocation,'oddland_border');assert.equal(g.state.light,fuel);assert.deepEqual(g.state.members.map(id=>g.state.actors[id].hp),hp);assert.equal(g.state.worldTravel.visited.oddland,true);
}
function inward(g){
  cross(g,'oddland_surface');const run=g.state.dungeons.active.run;
  for(const route of ['border_customs','trade_refuge','oddland_checkpoint']){walk(g,1,1);cross(g,route);assert.equal(g.state.dungeons.active.run,run);}
  navigateMaps(g,'region_1_f1');walk(g,1,1);cross(g,'waterway_surface');assert.equal(g.state.townLocation,'hikarigaeri_square');
}

test('first-edition geography stays byte-derived and only the second edition has the border',async()=>{
  assert.equal(Object.keys(first.maps).length,56);assert.equal(Object.keys(data.maps).length,83);
  assert.equal(first.worldTravel,undefined);assert.equal(first.locations.oddland_border,undefined);
  assert.deepEqual(first.maps.region_1_landing.tiles,(await read('data/maps/region_1_landing.json')).tiles);
  assert.equal(data.maps.region_1_landing.objects.filter(o=>o.id==='oddland_route_sign').length,1);
  for(const id of Object.keys(first.locations).filter(id=>id!=='hikarigaeri_square'))assert.deepEqual(data.locations[id],first.locations[id]);
  assert.deepEqual(data.locations.hikarigaeri_square.dungeons,first.locations.hikarigaeri_square.dungeons.filter(id=>!['region_4','region_5','region_7','region_8','region_9'].includes(id)));
  assert.deepEqual(data.quests.q004,first.quests.q004);assert.equal(Object.keys(data.quests).length,300);
  const g=new GameEngine(first);drain(g);assert.equal(g.dispatch({type:'world.cross',route:'oddland_checkpoint'}),false);
});

test('walk from town through the checkpoint and all three passage maps, save at each border, then return on foot',()=>{
  const g=fresh();assert.equal(g.state.quests.q004.stage,'available');gate(g);
  const before={light:g.state.light,steps:g.state.steps};cross(g,'oddland_checkpoint');
  assert.equal(g.state.light,before.light-1);assert.equal(g.state.steps,before.steps+1);assert.equal(g.state.worldTravel.visited.oddland,undefined);
  cross(g,'oddland_checkpoint');assert.equal(g.state.location.map,'region_1_landing');
  outward(g);assert.equal(g.state.quests.q004.stage,'available');inward(g);
  assert.equal(g.state.worldTravel.returnAnchor,'oddland','walking home does not rewrite an in-flight return anchor');
  assert.ok(g.dispatch({type:'travel',dungeon:'region_1'}));assert.equal(g.state.worldTravel.returnAnchor,'hikarigaeri');
  save(g);
});

test('crossing is selected through inspection and can be cancelled without registering or moving',()=>{
  const g=fresh();gate(g);const before=structuredClone(g.state.worldTravel);
  assert.ok(g.dispatch({type:'player.command',id:'inspect'}));
  const target=commandDialog(g).options.find(o=>o.target==='world-route:oddland_checkpoint');assert.ok(target);
  assert.ok(g.dispatch({type:'choose',id:target.id}));save(g);
  assert.equal(g.state.location.map,'region_1_landing');assert.deepEqual(g.state.worldTravel,before);
  assert.ok(g.dispatch({type:'choose',id:'cancel'}));assert.ok(g.dispatch({type:'choose',id:'cancel'}));
  assert.ok(g.dispatch({type:'player.command',id:'inspect'}));assert.ok(g.dispatch({type:'choose',id:target.id}));
  const action=commandDialog(g).options.find(o=>o.intent?.type==='world.cross');assert.ok(action);
  assert.ok(g.dispatch({type:'choose',id:action.id}));drain(g);assert.equal(g.state.location.map,'e2_trade_corridor');save(g);
});

for(const action of ['normal','mark','defeat'])for(const foreign of [false,true])test(`${action} returns to the actual departure settlement (${foreign?'Oddland':'Hikarigaeri'})`,()=>{
  const g=fresh();gate(g);
  if(foreign){outward(g);assert.ok(g.dispatch({type:'location.move',id:'oddland_inn'}));assert.equal(g.state.worldTravel.returnAnchor,'hikarigaeri');assert.ok(g.dispatch({type:'location.move',id:'oddland_border'}));cross(g,'oddland_surface');}
  else cross(g,'oddland_checkpoint');
  save(g);
  if(action==='normal')assert.ok(g.returnTown());
  else if(action==='mark')assert.ok(g.dispatch({type:'retreat'}));
  else {g.startBattle('roaming_1',{win:[],escape:[],lose:[]});g.finishBattle('lose');drain(g);}
  assert.equal(g.state.townLocation,foreign?'oddland_border':'hikarigaeri_square');save(g);
});

test('foreign facilities support free treatment, oil, the shared party and purchases without remote access to home storage',()=>{
  const g=fresh();g.accept('q001');g.state.flags.legacyStoryRoutes={q001:true};g.complete('q001','compromise');gate(g);
  // A completed legacy q001 fixture unlocks a real supply point before crossing to enable capacity/storage rules.
  walk(g,1,1);assert.ok(g.dispatch({type:'expedition.action',camp:'water_landing',action:'repair'}));walk(g,15,3);
  g.give('torch',8);const homeOil=structuredClone({storedOil:g.state.expedition.storedOil,storedBottles:g.state.expedition.storedBottles});assert.ok(homeOil.storedBottles);
  outward(g);g.state.gold=0;
  for(const id of g.state.members){g.state.actors[id].hp=1;g.state.actors[id].mp=0;}
  assert.ok(g.dispatch({type:'location.move',id:'oddland_clinic'}));assert.ok(g.dispatch({type:'service',id:'clinic'}));drain(g);assert.equal(g.state.gold,0);assert.ok(g.state.actors.ada.hp>1);
  assert.ok(g.dispatch({type:'location.move',id:'oddland_border'}));assert.ok(g.dispatch({type:'location.move',id:'oddland_supply'}));
  assert.equal(projectGame(g).expedition.storedOil,0);assert.equal(g.dispatch({type:'expedition.action',action:'withdraw'}),false);
  assert.ok(g.dispatch({type:'world.supply'}));assert.equal(oilTotal(data,g.state),g.state.expedition.capacity);
  g.state.expedition.reserve+=g.state.expedition.lamp.fuel;g.state.expedition.lamp.fuel=0;g.state.light=0;
  assert.ok(g.dispatch({type:'world.supply'}));assert.equal(g.state.light,90);assert.equal(oilTotal(data,g.state),g.state.expedition.capacity);
  assert.equal(g.dispatch({type:'buy',item:'rope'}),false);g.state.gold=500;assert.ok(g.dispatch({type:'buy',item:'rope'}));
  g.give('torch',1);assert.equal(oilStore(data,g.state).storedBottles,1);assert.deepEqual({storedOil:g.state.expedition.storedOil,storedBottles:g.state.expedition.storedBottles},homeOil);
  assert.ok(g.dispatch({type:'location.move',id:'oddland_border'}));assert.ok(g.dispatch({type:'location.move',id:'oddland_inn'}));assert.ok(g.dispatch({type:'party',action:'join',actor:'berg'}));
  assert.ok(g.dispatch({type:'location.move',id:'oddland_border'}));save(g);inward(g);save(g);
});

test('unvisited towns, remote quest departures, relays, interiors and busy states cannot bypass the crossing',()=>{
  const g=fresh();assert.equal(g.dispatch({type:'location.move',id:'oddland_border'}),false);assert.equal(g.dispatch({type:'world.cross',route:'oddland_surface'}),false);
  assert.ok(g.accept('q001'));gate(g);walk(g,13,3);assert.ok(g.dispatch({type:'location.enter',id:'waterway_checkpoint'}));
  assert.equal(g.dispatch({type:'world.cross',route:'oddland_checkpoint'}),false);save(g);assert.ok(g.dispatch({type:'location.exit'}));walk(g,15,3);
  g.run('e2_oddland_route_sign');const position=structuredClone(g.state.location);assert.equal(g.dispatch({type:'world.cross',route:'oddland_checkpoint'}),false);assert.deepEqual(g.state.location,position);drain(g);
  g.startBattle('roaming_1',{win:[],escape:[],lose:[]});assert.equal(g.dispatch({type:'world.cross',route:'oddland_checkpoint'}),false);g.finishBattle('escape');drain(g);
  outward(g);assert.equal(g.dispatch({type:'quest.travel',id:'q001'}),false);assert.match(g.state.notice,/灯帰り/);assert.equal(g.dispatch({type:'travel',dungeon:'kagaribi'}),false);
  assert.equal(g.accept('q221'),false);assert.match(g.state.notice,/灯帰り/);assert.equal(g.dispatch({type:'checkpoint.travel',camp:'water_relay_4'}),false);
  assert.equal(g.state.quests.q001.stage,'active');save(g);
});

test('pre-cut e2 saves with companion and border states are rejected without altering either record',()=>{
  for(const oldData of Object.values(preCut)){
    const old=new GameEngine(oldData,91),raw=old.save(),g=fresh(),before=g.save();
    assert.throws(()=>g.load(raw),/旧記録は非対応/);assert.equal(g.save(),before);assert.equal(old.save(),raw);
  }
});

test('partial, forged or missing world state fails atomically; foreign locations cannot be migrated as old saves',()=>{
  const g=fresh();gate(g);outward(g);cross(g,'oddland_surface');const valid=g.save();
  for(const mutate of [s=>delete s.worldTravel,s=>s.worldTravel={},s=>s.worldTravel.returnAnchor='unknown',s=>delete s.worldTravel.visited.oddland,s=>s.worldTravel.registrations={},s=>s.worldTravel.oilStores.oddland={storedOil:-1,storedBottles:0}]){
    const bad=JSON.parse(valid);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),valid);
  }
  const old=new GameEngine(preCut.companions),bad=JSON.parse(old.save());delete bad.state.quests.q225;assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),valid);
});

test('edition geography rejects stale fingerprints, duplicate replacements and invalid routes before use',async()=>{
  for(const change of [b=>b.patches[0].sha256='0'.repeat(64),b=>b.patches.push(b.patches[0]),b=>b.additions.maps.region_1_f1=b.additions.maps.e2_trade_corridor]){
    const base=structuredClone(preCut.companions),bundle=await read('data/scenario-editions/e2/geography.json');
    // This API receives raw maps before the quest projection pass.
    base.maps.region_1_landing=await read('data/maps/region_1_landing.json');const before=JSON.stringify(base);change(bundle);
    await assert.rejects(applyEditionGeography(base,bundle));assert.equal(JSON.stringify(base),before);
  }
  for(const change of [d=>d.worldTravel.routes[1].a.x=0,d=>d.worldTravel.settlements.oddland.root='missing',d=>d.worldTravel.routes[1].b.dungeon='kagaribi',d=>d.worldTravel.mapRegistrations.e2_trade_corridor='unknown',d=>d.worldTravel.settlements.oddland.registration='unknown',d=>d.worldTravel.routes[0].exitObject.id='missing']){const bad=structuredClone(data);change(bad);assert.ok(validateContent(bad).length);}
});

for(const layout of ['scene','classic'])test(`${layout}: real view controls cross the border, show only the local board and confirm the named return anchor`,()=>{
  const g=fresh();gate(g);const dom=installDOM();let view;
  const render=()=>view.render(projectGame(g)),dispatch=intent=>{const ok=g.dispatch(intent);render();return ok;};
  const click=label=>{const b=[...dom.root.querySelectorAll('button')].find(b=>b.textContent===label);assert.ok(b,`missing ${label}; visible: ${[...dom.root.querySelectorAll('button')].map(b=>b.textContent).join(' / ')}`);assert.ok(!b.disabled);b.click();};
  const key=key=>handleGameKey({key,preventDefault(){}},{view,model:view.model,dispatch,activeElement:dom.document.activeElement});
  const route=id=>{const label=projectGame(g).worldTravel.actions.find(a=>a.intent.route===id).label;click('任意調べる');click(label);click(label);drain(g);render();};
  try{
    view=replaceView(null,layout,dom.root,dispatch,{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();
    const initial=structuredClone(g.state.worldTravel);click('任意調べる');click('探索隊を記帳してオッドランド方面へ進む（無料）');key('Escape');key('Escape');assert.deepEqual(g.state.worldTravel,initial);
    route('oddland_checkpoint');save(g);
    for(const id of ['trade_refuge','border_customs','oddland_surface']){walk(g,9,3);render();route(id);}
    assert.equal(g.state.townLocation,'oddland_border');assert.match(dom.root.querySelector('.world-travel-status').textContent,/オッドランド/);
    click('国境宿場の補給店');click('携行油を補充する（無料）');assert.equal(g.state.light,90);
    click('オッドランド・国境宿場へ戻る');click('国境宿場の共同依頼所');click('依頼掲示板を見る');
    assert.equal(dom.root.querySelectorAll('.quest-card').length,10);assert.ok(!dom.root.querySelector('.quest-list').textContent.includes('帰らない灯番'));
    if(layout==='scene')key('Escape');else click('オッドランド・国境宿場へ戻る');
    if(g.state.townLocation!=='oddland_border')click('オッドランド・国境宿場へ戻る');
    click('国境宿場と出入窓口の石段');assert.equal(g.state.worldTravel.returnAnchor,'oddland');
    click('帰還印で町へ戻る');assert.match(projectGame(g).dialog.text,/オッドランド/);click('帰還する');drain(g);render();
    assert.equal(g.state.townLocation,'oddland_border');save(g);
  }finally{view?.destroy();dom.restore();}
});

for(const [outcome,choices] of [['informed',['window','inspect','return','file','submit','accompany','issue','leave','finish']],['compromise',['window','fine','leave','finish']],['contract',['force','break','escort','finish']]])test(`q004 ${outcome} keeps its real route and permits independent border registration afterwards`,()=>{
  const g=fresh();g.award(0,data.system.xpBase*24*25);g.healAll();g.state.gold=5000;for(const item of ['rope','ration','potion','torch'])g.state.inventory[item]=99;
  for(const id of ['q001','q002','q003']){assert.ok(g.accept(id));(g.state.flags.legacyStoryRoutes??={})[id]=true;g.complete(id,'compromise');}
  assert.ok(g.accept('q004'));const p=data.quests.q004.story.worldPlaces[data.quests.q004.story.scenes.entry.place];g.teleport(p.map,p.x,p.y);g.run(data.quests.q004.model.entryScript);drain(g);
  for(const id of choices){assert.ok(g.dispatch({type:'choose',id}),`${id}: ${g.state.notice}`);drain(g);if(g.state.battle)fight(g);finishJourney(g);save(g);}
  assert.equal(g.state.quests.q004.outcome,outcome);assert.equal(g.state.worldTravel.registrations.oddland_entry,undefined);
  const sister=g.state.stories.q004.values.sisterAt;walk(g,15,3);outward(g);assert.equal(g.state.quests.q004.outcome,outcome);assert.equal(g.state.stories.q004.values.sisterAt,sister);save(g);
});
