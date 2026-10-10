import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,walk,goTownLocation,inspect} from './helpers.mjs';
import {prepareQuest,finishJourney} from './structure-routes.mjs';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {commandTargets} from '../src/core/player-commands.js';
import {installDOM} from './view-dom.mjs';
import {mapSection} from '../src/view/minimap.js';
import {visibleDungeonObjects} from '../src/view/dungeon.js';

const markerIds=g=>projectGame(g).dungeon.objects.filter(o=>o.kind==='decision').map(o=>o.id).sort();
const choose=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}),id);drain(g);};
function roundtrip(g){const saved=g.save();g.load(saved);assert.equal(g.save(),saved);}

test('q001 markers appear on acceptance and move from the rookie to the next event after talking',()=>{
 const g=newGame();g.random=()=>.99;
 assert.ok(g.dispatch({type:'travel',dungeon:'kagaribi'}));
 assert.deepEqual(markerIds(g),[],'unaccepted events are not destinations');
 g.returnTown();assert.ok(g.accept('q001'));assert.ok(g.dispatch({type:'quest.travel',id:'q001'}));
 assert.deepEqual(markerIds(g),['q001_decision'],'later events stay hidden until their turn');
 walk(g,2,1);choose(g,'talk');
 assert.deepEqual(markerIds(g),['q001_return']);
 walk(g,1,1);walk(g,2,1);
 assert.equal(g.state.waiting,null);assert.equal(g.state.events['kagaribi_f1/q001_decision'],1);
 assert.deepEqual(markerIds(g),['q001_return'],'leaving a finished cell does not restore its marker');
 roundtrip(g);const saved=g.save();assert.deepEqual(markerIds(g),['q001_return']);assert.equal(g.save(),saved,'projection does not advance the story');
});

test('q001 shows the elder next, restores visited places for new events, and removes all markers before the town report and after completion',()=>{
 const g=prepareQuest('q001');g.random=()=>.99;
 choose(g,'talk');finishJourney(g);choose(g,'inspect');choose(g,'follow');
 assert.deepEqual(markerIds(g),['q001_elder']);
 finishJourney(g);choose(g,'support');
 assert.equal(g.state.events['kagaribi_f1/q001_return'],1);
 assert.deepEqual(markerIds(g),['q001_return','q001_return_south'],'both routes offer the same return event, including the visited corridor');
 roundtrip(g);assert.deepEqual(markerIds(g),['q001_return','q001_return_south']);
 finishJourney(g);assert.ok(g.state.battle);g.finishBattle('win');drain(g);choose(g,'home');
 assert.equal(g.state.events['kagaribi_f1/q001_decision'],1);
 assert.deepEqual(markerIds(g),['q001_decision'],'the rescued party still needs to reach the entrance');
 finishJourney(g);choose(g,'report');
 assert.deepEqual(markerIds(g),[],'the next event is now in town');
 finishJourney(g);choose(g,'rest');assert.equal(g.state.quests.q001.stage,'completed');
 goTownLocation(g,data.game.world.townRoot);assert.ok(g.dispatch({type:'travel',dungeon:'kagaribi'}));
 assert.deepEqual(markerIds(g),[]);roundtrip(g);assert.deepEqual(markerIds(g),[]);
 assert.ok(projectGame(g).dungeon.objects.some(o=>o.id==='q001_empty_west'),'completed quest scenery remains visible');
});

test('a pending q002 return to the landing stays marked while its journey hides the normal interaction object',()=>{
 const g=prepareQuest('q002');g.random=()=>.99;
 choose(g,'school');assert.deepEqual(markerIds(g),[]);finishJourney(g);choose(g,'recover');
 g.teleport('region_1_landing',1,1);
 assert.equal(g.state.journey.action,'school_recover');
 assert.deepEqual(markerIds(g),['q002_decision']);
 roundtrip(g);assert.deepEqual(markerIds(g),['q002_decision']);
});

test('q002 shortages keep the unfinished location marked even after its interaction has already run',()=>{
 const g=prepareQuest('q002');g.state.inventory.rope=0;
 choose(g,'lift_supplies');assert.equal(g.state.waiting,null);assert.deepEqual(markerIds(g),['q002_decision']);
 assert.ok(g.trigger('interact','q002_decision'));drain(g);choose(g,'lift_supplies');
 assert.equal(g.state.events['region_1_landing/q002_decision'],1);
 assert.ok(g.state.flags.questResume.q002);assert.deepEqual(markerIds(g),['q002_decision']);
 roundtrip(g);assert.deepEqual(markerIds(g),['q002_decision']);
});

test('q003 markers follow its next map and disappear when the next event is in town',()=>{
 const g=prepareQuest('q003');g.random=()=>.99;
 choose(g,'warn');assert.deepEqual(markerIds(g),[],'the old alarm and completed q002 marker are both hidden');
 g.teleport('region_1_inspection',1,1);
 assert.deepEqual(markerIds(g),['q003_passage']);
 finishJourney(g);choose(g,'escort');assert.deepEqual(markerIds(g),[]);
 finishJourney(g);choose(g,'return');g.teleport('region_1_landing',1,1);
 assert.deepEqual(markerIds(g),['q003_decision']);
});

test('legacy clue routes reveal the decision marker after both clues while current flow routes use the event hub',()=>{
 const g=prepareQuest('q021');g.teleport('region_3_f1',1,1);
 assert.deepEqual(markerIds(g),['q021_decision']);
 g.state.flags.legacyQuestRoutes={q021:true};
 assert.deepEqual(markerIds(g),[]);
 g.evidence('q021','clue_a','first clue');assert.deepEqual(markerIds(g),[]);
 g.evidence('q021','clue_b','second clue');assert.deepEqual(markerIds(g),['q021_decision']);
});

function objectGame(objects){
 const d=structuredClone(data),map=d.maps.region_2_f1;
 d.dungeons.region_2.systems={};d.dungeons.region_2.fieldEvents=[];map.encounterRate=0;map.objects=objects;
 for(const o of objects)d.scripts[o.script]={commands:[{op:'narrate',text:`${o.id}を調べた。`}]};
 const g=new GameEngine(d);drain(g);g.random=()=>.99;g.teleport(map.id,1,1,'east');return g;
}

test('ordinary event markers wait for their prerequisite flag, respect hidden conditions and disappear after a once event runs',()=>{
 const g=objectGame([
  {id:'ready',name:'ready',kind:'decision',trigger:'enter',x:2,y:1,script:'marker.ready',once:true,visibleWhen:true,condition:{ref:'flags.ready'}},
  {id:'disabled',name:'disabled',kind:'decision',trigger:'enter',x:3,y:1,script:'marker.disabled',visibleWhen:true,condition:false},
  {id:'hidden',name:'hidden',kind:'decision',trigger:'enter',x:4,y:1,script:'marker.hidden',visibleWhen:false,condition:true}
 ]);
 assert.deepEqual(markerIds(g),[]);g.state.flags.ready=true;
 assert.deepEqual(markerIds(g),['ready']);assert.ok(g.dispatch({type:'move',direction:'forward'}));
 assert.equal(g.state.waiting.type,'text');assert.equal(g.state.events['region_2_f1/ready'],1);
 assert.deepEqual(markerIds(g),[]);drain(g);roundtrip(g);assert.deepEqual(markerIds(g),[]);
});

test('reading clues and disabling a physical door do not remove their map objects or change collision',()=>{
 const g=objectGame([
  {id:'note',name:'note',kind:'clue',trigger:'interact',x:1,y:1,script:'marker.note'},
  {id:'door',name:'door',kind:'door',trigger:'interact',x:2,y:1,script:'marker.door',visibleWhen:true,condition:false,blocking:true,initialState:'closed'}
 ]);
 assert.ok(g.dispatch({type:'player.command',id:'interact'}));drain(g);
 assert.equal(commandTargets(g).some(t=>t.id==='object:note'),false,'the information is already read');
 assert.deepEqual(projectGame(g).dungeon.objects.map(o=>o.id).sort(),['door','note']);
 assert.ok(commandTargets(g,'inspect').some(t=>t.id==='object:note'));
 assert.equal(g.walkable(g.map(),2,1),false);
 assert.equal(g.trigger('interact','door'),false);
});

test('the cart, relief crew and kiln hunt markers follow their actual preparation and completion states',()=>{
 const g=newGame();g.random=()=>.99;g.dispatch({type:'travel',dungeon:'kagaribi'});
 for(const [id,map,x,y,cases] of [
  ['cart','kagaribi_oilstore',11,5,[[{},true],[{cartCleared:true},false]]],
  ['relief','kagaribi_oilstore',11,1,[[{},false],[{cargoGate:true},true],[{cargoGate:true,reliefAssigned:true},false]]],
  ['hunt','kagaribi_kilns',9,5,[[{},false,{lit:false,effect:'lure'}],[{kilnGate:true},false,{lit:true,effect:'ward'}],[{kilnGate:true},true,{lit:true,effect:'lure'}],[{kilnGate:true,huntWon:true},false,{lit:true,effect:'lure'}]]]
 ]){
  g.teleport(map,x,y);
  for(const [flags,expected,fire] of cases){
   g.state.flags.kagaribi=flags;
   if(fire)Object.assign(g.state.dungeons.persistent.kagaribi.systems.fires.fixtures.kiln_bait,fire);
   assert.equal(markerIds(g).includes(id),expected,`${id}: ${JSON.stringify({flags,fire})}`);
  }
 }
});

test('completed cart, relief and hunt events remain readable through manual inspection after their markers disappear',()=>{
 const g=newGame();g.random=()=>.99;g.dispatch({type:'travel',dungeon:'kagaribi'});
 g.state.flags.kagaribi={cartCleared:true,cargoGate:true,reliefAssigned:true,kilnGate:true,huntWon:true};
 for(const [id,map,x,y,text] of [
  ['cart','kagaribi_oilstore',11,5,/車輪は溝を抜け/],
  ['relief','kagaribi_oilstore',11,1,/交代の灯番は/],
  ['hunt','kagaribi_kilns',9,5,/炉守りは倒れた/]
 ]){
  g.teleport(map,x,y);assert.equal(markerIds(g).includes(id),false);
  assert.ok(commandTargets(g,'inspect').some(t=>t.id===`object:${id}`));
  const before={gold:g.state.gold,inventory:structuredClone(g.state.inventory)};
  inspect(g,id);assert.equal(g.state.waiting.type,'text');assert.match(g.state.waiting.text,text);drain(g);
  assert.equal(g.state.events[`${map}/${id}`],1);
  assert.deepEqual({gold:g.state.gold,inventory:g.state.inventory},before);
  assert.equal(markerIds(g).includes(id),false);
 }
});

test('the minimap guides the next q001 destination while exploration markers require arrival and never show finished events',()=>{
 const dom=installDOM();try{
  const g=newGame();g.random=()=>.99;g.award(0,data.system.xpBase*24*25);g.healAll();
  g.accept('q001');g.dispatch({type:'quest.travel',id:'q001'});
  g.state.discovered.kagaribi_f1=[...new Set([...g.state.discovered.kagaribi_f1,'2,1','9,1','13,3'])];
  const render=()=>{const model=projectGame(g);dom.root.replaceChildren(mapSection(model));return model;};
  const mapMarkers=()=>dom.root.querySelectorAll('.map-cell').filter(cell=>cell.querySelector('.map-object')?.src.endsWith('/decision.svg')).map(cell=>`${cell.dataset.x},${cell.dataset.y}`);
  const nearby=model=>visibleDungeonObjects(model.dungeon).filter(o=>o.kind==='decision').map(o=>o.id);
  let model=render();assert.deepEqual(mapMarkers(),['2,1']);assert.deepEqual(nearby(model),[],'the entrance event is marked on the map but cannot be drawn one cell ahead');
  g.teleport('kagaribi_f1',8,1,'east');model=render();
  assert.deepEqual(mapMarkers(),['2,1']);assert.deepEqual(nearby(model),[],'facing the future corridor does not reveal its marker');
  g.teleport('kagaribi_f1',1,1,'east');walk(g,2,1);choose(g,'talk');walk(g,1,1);g.state.location.facing='east';model=render();
  assert.deepEqual(mapMarkers(),['9,1']);assert.deepEqual(nearby(model),[],'the completed entrance marker stays hidden after leaving its cell');
  g.teleport('kagaribi_f1',8,1,'east');model=render();assert.deepEqual(nearby(model),[],'the current corridor event waits for arrival at its own cell');
  finishJourney(g);choose(g,'inspect');choose(g,'follow');finishJourney(g);choose(g,'support');finishJourney(g);
  assert.ok(g.state.battle);g.finishBattle('win');drain(g);choose(g,'home');finishJourney(g);choose(g,'report');finishJourney(g);choose(g,'rest');
  goTownLocation(g,data.game.world.townRoot);g.dispatch({type:'travel',dungeon:'kagaribi'});model=render();
  assert.equal(g.state.quests.q001.stage,'completed');assert.deepEqual(mapMarkers(),[]);assert.deepEqual(nearby(model),[]);
 }finally{dom.restore();}
});
