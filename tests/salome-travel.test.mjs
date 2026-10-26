import test from 'node:test';
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {validateSave,migrateSave} from '../src/core/save.js';
import {validateContent} from '../src/core/validation.js';
import {worldTravelView,shuttlePlan} from '../src/core/world-travel.js';
import {locationRoot} from '../src/core/world.js';
import {oilStore,oilTotal} from '../src/core/expedition-oil.js';
import {read,data,fresh,go,town,walk,drain,checkpoint} from './oddland-helpers.mjs';

const previous=await loadContent(async file=>{const value=await read(file);if(file==='data/scenario-editions.json')delete value.editions.e2.geographyUpgrade;if(file==='data/scenario-editions.json')for(let n=41;n<=50;n++)delete value.editions.e2.questOverrides['q0'+n];return value;},{edition:'e2'});
const city=['e2_academy','e2_archive','e2_stacks','e2_workshop','e2_relic','e2_storage'];
const personal=Object.values(data.quests).filter(q=>['il','mica'].includes(q.model?.companion));
const cross=(g,route)=>assert.ok(g.dispatch({type:'world.cross',route}),g.state.notice);
const place=location=>({kind:'town',location});
const toCity=g=>go(g,place('e2_academy'));
const choose=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}),id+': '+g.state.notice);drain(g);};
function arrive(g){const j=g.state.journey,q=g.data.quests[j.quest];go(g,q.story.worldPlaces[q.story.actions[j.action].journey.to]);if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:j.quest}),g.state.notice);drain(g);}
function start(g,q){go(g,q.story.worldPlaces.base);assert.ok(g.accept(q.id));assert.ok(g.dispatch({type:'story.resume',quest:q.id}));drain(g);}
function finish(g,q){choose(g,'go');arrive(g);choose(g,Object.keys(q.outcomes)[0]);choose(g,'return');arrive(g);choose(g,'finish');}
function oldReady(q){
 const g=new GameEngine(previous,1907);drain(g);
 if(!g.state.members.includes(q.requiredParty[0]))assert.ok(g.dispatch({type:'party',action:'swap',actor:q.requiredParty[0],replace:'il'}));
 for(const earlier of personal.filter(p=>p.model.companion===q.model.companion&&p.number<q.number)){start(g,earlier);finish(g,earlier);}
 return g;
}

test('Salome reuses the six existing facilities, preserves twenty stories and all old dungeon geography',async()=>{
 assert.equal(Object.keys(data.maps).length,82);assert.equal(Object.keys(data.dungeons).length,20);assert.equal(Object.keys(data.quests).length,300);
 assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);assert.equal(data.worldTravel.version,2);
 assert.ok(city.every(id=>locationRoot(data,id).id==='e2_academy'));assert.equal(personal.length,20);
 for(const q of personal){assert.deepEqual(q,previous.quests[q.id]);assert.equal(data.worldTravel.questSettlements[q.id],'salome');}
 for(const id of ['region_5','region_8']){assert.deepEqual(data.dungeons[id],previous.dungeons[id]);for(const m of data.dungeons[id].maps)assert.deepEqual({...data.maps[m],objects:data.maps[m].objects.filter(o=>!o.quest)},{...previous.maps[m],objects:previous.maps[m].objects.filter(o=>!o.quest)});}
 const first=await loadContent(read);assert.equal(Object.keys(first.maps).length,56);assert.equal(Object.keys(first.quests).length,210);assert.equal(first.worldTravel,undefined);
});

test('a new party walks both highland sections for its first visit, keeps expedition state, and returns with no money or oil',()=>{
 const g=fresh();g.state.gold=0;g.state.light=0;g.state.expedition.lamp.fuel=0;g.state.expedition.reserve=0;
 assert.equal(g.accept('q241'),false);assert.equal(g.dispatch({type:'location.move',id:'e2_academy'}),false);assert.equal(g.dispatch({type:'world.ride',route:'salome_coach'}),false);
 assert.equal(g.dispatch({type:'world.cross',route:'salome_road_gate'}),false);
 cross(g,'salome_road_home');const number=g.state.dungeons.active.run;checkpoint(g);
 walk(g,13,5);cross(g,'salome_road_slope');assert.equal(g.state.dungeons.active.run,number);assert.equal(g.state.worldTravel.visited.salome,undefined);checkpoint(g);
 walk(g,13,5);cross(g,'salome_road_gate');assert.equal(g.state.worldTravel.visited.salome,true);assert.deepEqual(g.state.worldTravel.registrations,{});assert.equal(g.state.light,0);
 assert.equal(worldTravelView(g).country,'聖王国トルネア領');const steps=g.state.steps;assert.ok(steps>20);
 for(const id of city){go(g,place(id));checkpoint(g);}
 toCity(g);assert.equal(g.dispatch({type:'world.ride',route:'salome_coach'}),false);go(g,place('hikarigaeri_square'));checkpoint(g);
 assert.equal(g.state.steps,steps*2);assert.equal(g.state.gold,0);assert.equal(g.state.light,0);assert.equal(g.state.battle,null);
});

for(const from of ['hikarigaeri','salome'])for(const kind of ['mark','defeat'])test(`${from}/${kind}: rescue returns to the actual departure settlement`,()=>{
 const g=fresh();if(from==='salome')toCity(g);
 cross(g,from==='salome'?'salome_road_gate':'salome_road_home');checkpoint(g);
 if(kind==='mark')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);
 assert.equal(g.state.townLocation,from==='salome'?'e2_academy':'hikarigaeri_square');assert.equal(g.state.worldTravel.returnAnchor,from);checkpoint(g);
});

test('local services heal, supply, buy and retain separate oil storage',()=>{
 const g=fresh();assert.ok(g.accept('q001'));g.state.flags.legacyStoryRoutes={q001:true};g.complete('q001','compromise');g.teleport('region_1_landing',1,1);assert.ok(g.dispatch({type:'expedition.action',camp:'water_landing',action:'repair'}));assert.ok(g.returnTown());drain(g);const home={storedOil:g.state.expedition.storedOil,storedBottles:g.state.expedition.storedBottles};toCity(g);g.state.gold=0;
 for(const id of g.state.members){g.state.actors[id].hp=1;g.state.actors[id].mp=0;}
 go(g,place('salome_clinic'));assert.ok(g.dispatch({type:'service',id:'clinic'}));drain(g);assert.ok(g.state.actors.ada.hp>1);assert.equal(g.state.gold,0);
 go(g,place('salome_supply'));assert.equal(g.dispatch({type:'buy',item:'rope'}),false);assert.ok(g.dispatch({type:'world.supply'}));assert.equal(oilTotal(data,g.state),g.state.expedition.capacity);
 g.state.gold=500;assert.ok(g.dispatch({type:'buy',item:'rope'}));g.give('torch',1);assert.equal(oilStore(data,g.state).storedBottles,1);
 assert.deepEqual({storedOil:g.state.expedition.storedOil,storedBottles:g.state.expedition.storedBottles},home);
 go(g,place('salome_inn'));assert.ok(g.dispatch({type:'party',action:'join',actor:'berg'}));checkpoint(g);
 go(g,place('salome_skills'));assert.equal(worldTravelView(g).settlement,'学術都市サロメ');checkpoint(g);
 go(g,place('hikarigaeri_shop'));assert.deepEqual({storedOil:oilStore(data,g.state).storedOil,storedBottles:oilStore(data,g.state).storedBottles},home);assert.equal(g.state.worldTravel.oilStores.salome.storedBottles,1);
});

test('coach requires both visits, the actual stop, free interaction and one fare per successful ride',()=>{
 const g=fresh();assert.equal(shuttlePlan(g,'salome_coach').ok,false);toCity(g);g.state.gold=4;
 assert.equal(g.dispatch({type:'world.ride',route:'salome_coach'}),false);assert.equal(g.state.gold,4);
 g.state.gold=10;go(g,place('e2_archive'));assert.equal(g.dispatch({type:'world.ride',route:'salome_coach'}),false);toCity(g);
 g.run('e2_oddland_route_sign');assert.equal(g.dispatch({type:'world.ride',route:'salome_coach'}),false);drain(g);
 const anchor=g.state.worldTravel.returnAnchor,steps=g.state.steps;
 for(const destination of ['hikarigaeri_square','e2_academy']){assert.ok(g.dispatch({type:'world.ride',route:'salome_coach'}));assert.equal(g.state.townLocation,destination);checkpoint(g);}
 assert.equal(g.state.gold,0);assert.equal(g.state.steps,steps);assert.equal(g.state.worldTravel.returnAnchor,anchor);
 cross(g,'salome_road_gate');assert.equal(g.dispatch({type:'world.ride',route:'salome_coach'}),false);
});

test('old visits migrate from current facilities, but acceptance and unvisited definitions do not grant a visit',()=>{
 for(const id of ['hikarigaeri_square',...city]){
  const old=new GameEngine(previous);drain(old);town(old,id);const raw=old.save(),expected=JSON.parse(raw);expected.state.worldTravel.version=2;if(id!=='hikarigaeri_square')expected.state.worldTravel.visited.salome=true;
  const g=fresh();g.load(raw);assert.deepEqual(JSON.parse(g.save()),expected);assert.equal(old.save(),raw);checkpoint(g);
 }
 const old=new GameEngine(previous);drain(old);assert.ok(old.accept('q241'));const g=fresh();g.load(old.save());assert.equal(g.state.worldTravel.visited.salome,undefined);assert.equal(g.state.quests.q241.stage,'active');toCity(g);go(g,place('e2_archive'));assert.ok(g.dispatch({type:'story.resume',quest:'q241'}));drain(g);checkpoint(g);
});

for(const q of personal)test(`${q.id}: every pre-Salome save phase preserves VM, journey, choice, cost, holders and rewards`,()=>{
 const g=oldReady(q),snapshots=[];
 start(g,q);snapshots.push(g.save());choose(g,'go');snapshots.push(g.save());arrive(g);snapshots.push(g.save());
 choose(g,Object.keys(q.outcomes)[0]);snapshots.push(g.save());choose(g,'return');snapshots.push(g.save());arrive(g);snapshots.push(g.save());choose(g,'finish');snapshots.push(g.save());go(g,place('hikarigaeri_square'));snapshots.push(g.save());
 for(const [i,raw] of snapshots.entries()){
  const now=fresh(),expected=JSON.parse(raw);expected.state.worldTravel.version=2;expected.state.worldTravel.visited.salome=true;
  now.load(raw);assert.deepEqual(JSON.parse(now.save()),expected,q.id+'/'+i);checkpoint(now);
  // Continue the *saved* VM or journey, not a recreated starting state.
  for(let step=0;step<10&&now.state.quests[q.id].stage!=='completed';step++){
   drain(now);if(now.state.journey){arrive(now);continue;}
   if(!now.state.waiting){go(now,q.story.worldPlaces.base);assert.ok(now.dispatch({type:'story.resume',quest:q.id}));drain(now);}
   const scene=now.state.stories[q.id].scene;
   choose(now,scene==='entry'?'go':scene==='survey'?Object.keys(q.outcomes)[0]:scene.startsWith('result_')?'return':'finish');
  }
  assert.equal(now.state.quests[q.id].stage,'completed');assert.equal(now.state.quests[q.id].outcome,Object.keys(q.outcomes)[0]);checkpoint(now);
 }
});

test('a pending Mika trip reaches the underground market and returns via both road sections, keeping companion position',()=>{
 const q=data.quests.q286,old=oldReady(q);start(old,q);choose(old,'go');const g=fresh();g.load(old.save());const journey=structuredClone(g.state.journey);
 assert.equal(g.state.stories.q286.values.companionAt,'transit');go(g,place('hikarigaeri_square'));assert.deepEqual(g.state.journey,journey);checkpoint(g);
 arrive(g);choose(g,Object.keys(q.outcomes)[0]);choose(g,'return');const steps=g.state.steps;arrive(g);assert.ok(g.state.steps>steps);choose(g,'finish');checkpoint(g);
});

test('malformed geography saves reject atomically, including deleted modern visits and version downgrades',()=>{
 const g=fresh();toCity(g);const stable=g.save();
 for(const mutate of [s=>delete s.worldTravel.visited.salome,s=>s.worldTravel.version=3,s=>s.worldTravel.version=1,s=>delete s.worldTravel,s=>delete s.quests.q241]){
  const bad=JSON.parse(stable);mutate(bad.state);const copy=structuredClone(bad);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),stable);assert.deepEqual(bad,copy);
 }
 const old=new GameEngine(previous);drain(old);town(old,'e2_archive');const bad=JSON.parse(old.save());delete bad.state.quests.q241;assert.deepEqual(migrateSave(bad,data),bad);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),stable);
 for(const mutate of [d=>d.worldTravel.shuttles[0].cost=-1,d=>d.worldTravel.shuttles[0].stops=['hikarigaeri','oddland'],d=>d.worldTravel.shuttles[0].stops=['salome','salome']]){const broken=structuredClone(data);mutate(broken);assert.ok(validateContent(broken).length);}
 assert.deepEqual(validateSave(JSON.parse(stable),data),[]);
});
