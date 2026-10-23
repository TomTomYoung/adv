import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,goTownLocation,walk} from './helpers.mjs';
import {fieldActionPlan,permission} from '../src/core/jobs.js';
import {skillPurchasePlan,expeditionView} from '../src/core/expedition.js';
import {validateSave} from '../src/core/save.js';
import {measureCampRoute,campRouteText} from '../src/core/camp-route.js';
import {projectActorJob} from '../src/application/job-projection.js';
import {oilLamp} from '../src/core/expedition-oil.js';

const cast=(g,actor,ability)=>g.dispatch({type:'job.action',actor,ability});
const town=g=>{assert.ok(g.returnTown());goTownLocation(g,'hikarigaeri_shop');};
const roundtrip=g=>{const saved=g.save();assert.deepEqual(validateSave(JSON.parse(saved),g.data),[]);g.load(saved);assert.equal(g.save(),saved);};
function repair(g,id){const c=g.data.expedition.camps.find(c=>c.id===id);g.teleport(c.map,c.x,c.y,c.facing);assert.ok(g.dispatch({type:'expedition.action',action:'repair',camp:id}));}
function setup({unlock=true}={}){
 const g=newGame();g.data=structuredClone(data);delete g.data.quests.q001.story;g.accept('q001');g.complete('q001','informed');drain(g);
 g.give('rope',6);g.state.flags.kagaribi={kilnGate:true,altarGuardianWon:true};
 repair(g,'kagaribi_gate');
 if(unlock){repair(g,'kagaribi_relay');assert.ok(g.dispatch({type:'expedition.action',camp:'kagaribi_relay',action:'relay'}));repair(g,'kagaribi_central');}
 town(g);g.state.expedition.gems=1000;
 for(const [actor,job,item] of [['sera','lantern_keeper','staff'],['nio','scout','bow']]){
  if(g.state.actors[actor].job!==job)assert.ok(g.dispatch({type:'job.change',actor,job}));g.give(item,1);assert.ok(g.dispatch({type:'equip',actor,item}));
 }
 g.healAll();return g;
}
function buy(g,actor,skill){assert.ok(g.dispatch({type:'skill.buy',actor,skill,level:1}));}
function quiet(g,map='kagaribi_f1',x=1,y=1){
 // Isolate movement accounting from random battles and authored entry scenes.
 g.data.system.encounterCheckSteps=100000;g.data.maps[map].objects=[];g.data.maps[map].encounterRate=0;
 g.teleport(map,x,y,'east');
}
function revealMap(g,id){const m=g.data.maps[id];g.state.discovered[id]=m.tiles.flatMap((row,y)=>[...row].map((_,x)=>`${x},${y}`));}

test('exploration instruction has personal camp/job/weapon gates and grants only field APIs',()=>{
 const g=setup({unlock:false});
 assert.equal(skillPurchasePlan(g.data,g.state,'sera','exp_oil_spark',1).ok,false);
 assert.equal(skillPurchasePlan(g.data,g.state,'nio','exp_route_survey',1).ok,false);
 repair(g,'kagaribi_relay');town(g);assert.equal(skillPurchasePlan(g.data,g.state,'sera','exp_oil_spark',1).ok,false);
 repair(g,'mine_upper');assert.ok(g.dispatch({type:'expedition.action',camp:'mine_upper',action:'relay'}));town(g);assert.equal(skillPurchasePlan(g.data,g.state,'sera','exp_oil_spark',1).ok,false,'a different dungeon relay cannot substitute for 7F');
 g.teleport('kagaribi_relay',1,1);assert.ok(g.dispatch({type:'expedition.action',camp:'kagaribi_relay',action:'relay'}));repair(g,'kagaribi_central');town(g);
 assert.equal(skillPurchasePlan(g.data,g.state,'ada','exp_oil_spark',1).ok,false);
 assert.ok(g.dispatch({type:'unequip',actor:'sera',slot:'weapon'}));assert.equal(skillPurchasePlan(g.data,g.state,'sera','exp_oil_spark',1).ok,false);
 assert.ok(g.dispatch({type:'equip',actor:'sera',item:'staff'}));
 const gems=g.state.expedition.gems;buy(g,'sera','exp_oil_spark');buy(g,'nio','exp_route_survey');assert.equal(g.state.expedition.gems,gems-340);
 for(const [actor,id,api] of [['sera','exp_oil_spark','party.oil_saving'],['nio','exp_route_survey','camp.route']]){
  assert.ok(permission(g.data,g.state,actor,id,api));assert.equal(g.skills(actor).includes(id),false);
  assert.equal(g.dispatch({type:'skill.buy',actor,skill:id,level:2}),false);
  assert.equal(cast(g,actor,id),false,'not usable in town');
 }
 const invalid=JSON.parse(g.save());invalid.state.expedition.camps.kagaribi_relay.relay=false;invalid.state.expedition.capacity=180;assert.ok(validateSave(invalid,g.data).length,'purchased oil aid requires its own relay in saves too');
 roundtrip(g);assert.ok(g.dispatch({type:'job.change',actor:'sera',job:'priest'}));assert.equal(permission(g.data,g.state,'sera','exp_oil_spark','party.oil_saving'),null);
 assert.ok(g.dispatch({type:'job.change',actor:'sera',job:'lantern_keeper'}));assert.ok(permission(g.data,g.state,'sera','exp_oil_spark','party.oil_saving'));
});
for(const map of ['kagaribi_f1','region_1_f1'])test(`${map}: next 60 successful steps save exactly 30 oil without stacking or changing fire`,()=>{
 const g=setup();buy(g,'sera','exp_oil_spark');quiet(g,map);
 const before=oilLamp(g.data,g.state),mp=g.state.actors.sera.mp;assert.ok(cast(g,'sera','exp_oil_spark'));assert.equal(g.state.actors.sera.mp,mp-10);
 const steps=g.state.steps;for(let n=0;n<4;n++)assert.ok(g.dispatch({type:'move',direction:'right'}));assert.equal(g.dispatch({type:'move',direction:'back'}),false);
 assert.equal(g.state.expedition.oilSaving.remaining,60);assert.equal(g.state.steps,steps);
 for(let n=0;n<60;n++){
  assert.ok(g.dispatch({type:'move',direction:n%2?'back':'forward'}));
  if(n===0){roundtrip(g);assert.equal(g.state.expedition.oilSaving.remaining,59);}
 }
 assert.equal(oilLamp(g.data,g.state).fuel,before.fuel-30);assert.equal(oilLamp(g.data,g.state).effect,before.effect);assert.equal(g.state.expedition.oilSaving,undefined);
 const fuel=oilLamp(g.data,g.state).fuel;for(const direction of ['forward','back','forward'])assert.ok(g.dispatch({type:'move',direction}));assert.equal(oilLamp(g.data,g.state).fuel,fuel-2,'passive resumes');roundtrip(g);
});
test('oil aid refreshes without adding duration, survives battle/map/save and ends on return or defeat',()=>{
 const g=setup();buy(g,'sera','exp_oil_spark');quiet(g);assert.ok(cast(g,'sera','exp_oil_spark'));
 assert.ok(g.dispatch({type:'move',direction:'forward'}));g.healAll();assert.ok(cast(g,'sera','exp_oil_spark'));assert.equal(g.state.expedition.oilSaving.remaining,60);
 g.startBattle('kagaribi_ossuary_bones',{win:[],lose:[],escape:[]},{manualTurns:true});const mp=g.state.actors.sera.mp;assert.equal(cast(g,'sera','exp_oil_spark'),false);assert.equal(g.state.actors.sera.mp,mp);roundtrip(g);assert.equal(g.state.expedition.oilSaving.remaining,60);
 g.defeat();assert.equal(g.state.expedition.oilSaving,undefined);g.healAll();quiet(g);assert.ok(cast(g,'sera','exp_oil_spark'));quiet(g,'kagaribi_relay');assert.equal(g.state.expedition.oilSaving.remaining,60);roundtrip(g);assert.ok(g.returnTown());assert.equal(g.state.expedition.oilSaving,undefined);
});
test('route measurement uses actual walked discovery, pays once, advances and survives reload',()=>{
 const g=setup();buy(g,'nio','exp_route_survey');quiet(g);walk(g,4,1);const mp=g.state.actors.nio.mp,discovered=structuredClone(g.state.discovered),rng=g.state.rng;
 assert.ok(cast(g,'nio','exp_route_survey'));assert.equal(g.state.actors.nio.mp,mp-6);assert.equal(g.state.rng,rng);assert.deepEqual(g.state.discovered,discovered);
 assert.equal(g.state.expedition.route.path.length-1,3);assert.match(campRouteText(g.data,g.state),/西 3歩/);roundtrip(g);
 for(let n=0;n<3;n++){assert.ok(g.dispatch({type:'move',direction:'back'}));assert.equal(g.state.expedition.route.path.length-1,2-n);}
 assert.match(campRouteText(g.data,g.state),/到着/);assert.equal(g.state.actors.nio.mp,mp-6);roundtrip(g);
 assert.ok(expeditionView(g.data,g.state).cards.some(c=>c.name==='帰路測定'));assert.ok(projectActorJob(g,'nio').fieldAbilities.some(a=>a.id==='exp_route_survey'));
 g.returnTown();assert.equal(g.state.expedition.route,undefined);
});
test('route excludes unseen cells, closed objects and shared edges; failed measurement costs nothing',()=>{
 const g=setup();buy(g,'nio','exp_route_survey');quiet(g,'kagaribi_f3',5,1);
 g.state.discovered.kagaribi_f3=['3,1','5,1'];const mp=g.state.actors.nio.mp;assert.equal(cast(g,'nio','exp_route_survey'),false);assert.equal(g.state.actors.nio.mp,mp);
 g.state.discovered.kagaribi_f3.push('4,1');assert.ok(cast(g,'nio','exp_route_survey'));assert.equal(g.state.expedition.route.path.length,3);
 const map=g.data.maps.kagaribi_f3;map.objects.push({id:'test-door',x:4,y:1,blocking:true,initialState:'closed'});assert.equal(measureCampRoute(g.data,g.state).ok,false);assert.match(campRouteText(g.data,g.state),/再計算/);roundtrip(g);
 g.state.objects['kagaribi_f3/test-door']='open';assert.equal(measureCampRoute(g.data,g.state).ok,true);
 const blocked=Object.keys(g.data.edgeTypes).find(id=>g.data.edgeTypes[id].passage==='#');(map.cells.edges??={})['v:5,1']={preset:blocked};assert.equal(measureCampRoute(g.data,g.state).ok,false);
 assert.equal(g.state.actors.nio.mp,mp-6);
});
test('cross-floor known routes count the connection as one real step and honor door conditions',()=>{
 const g=setup();buy(g,'nio','exp_route_survey');quiet(g,'kagaribi_kilns',7,1);revealMap(g,'kagaribi_kilns');revealMap(g,'kagaribi_relay');
 assert.ok(cast(g,'nio','exp_route_survey'));const route=g.state.expedition.route,initial=route.path.length-1;assert.equal(route.camp,'kagaribi_relay');assert.equal(route.path[1].map,'kagaribi_relay');
 roundtrip(g);const steps=g.state.steps;assert.ok(g.dispatch({type:'dungeon.action',system:'connections',action:'cross',target:'kiln_escape'}));assert.equal(g.state.steps,steps+1);assert.equal(g.state.expedition.route.path.length-1,initial-1);assert.doesNotMatch(campRouteText(g.data,g.state),/再計算/);roundtrip(g);
 g.data.dungeons.kagaribi.systems.connections.links.find(l=>l.id==='kiln_escape').condition=false;
 quiet(g,'kagaribi_kilns',7,1);g.state.discovered.kagaribi_kilns=['7,1'];assert.equal(measureCampRoute(g.data,g.state).ok,false);
});
test('saved aid/route reject malformed state and old saves need no new fields',()=>{
 const g=setup();buy(g,'sera','exp_oil_spark');buy(g,'nio','exp_route_survey');quiet(g);roundtrip(g);
 assert.ok(cast(g,'sera','exp_oil_spark'));assert.ok(cast(g,'nio','exp_route_survey'));roundtrip(g);
 for(const invalid of [null,{},[],{remaining:0},{remaining:61},{remaining:1.5},{remaining:3,extra:true}]){const save=JSON.parse(g.save());save.state.expedition.oilSaving=invalid;assert.ok(validateSave(save,g.data).length);}
 for(const invalid of [null,{},[],{camp:'bad',path:[]},{camp:'kagaribi_gate',path:[{map:'kagaribi_f1',x:999,y:1}]}]){const save=JSON.parse(g.save());save.state.expedition.route=invalid;assert.ok(validateSave(save,g.data).length);}
});
