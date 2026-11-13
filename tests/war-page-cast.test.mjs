import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './library-helpers.mjs';
import {previousQ047,q047Routes,q047AcceptedRoutes,q047Cast,q047Engine,q047AcceptedEngine,loadQ047,chooseQ047,warPageArtFixtures} from '../tools/war-page-art-fixtures.mjs';

const places=data.quests.q047.story.worldPlaces;
const holders=g=>g.state.stories.q047.values;
const fixedPeople=g=>{const v=holders(g);for(const [key,value] of Object.entries({homeClerkAt:'home',otherClerkAt:'other',homeRecipientAt:'vault',otherRecipientAt:'vault'}))assert.equal(v[key],value,key);};
const travel=g=>{const a=g.data.quests.q047.story.actions[g.state.journey.action];go(g,places[a.journey.to]);drain(g);assert.equal(g.state.journey,null);};

test('q047 preserves shipped prose and actions while adding four character links and two fixed recordkeepers',()=>{
 const q=structuredClone(data.quests.q047);assert.equal(q.story.revision,2);assert.equal(q.model.edition.revision,2);
 assert.deepEqual(q.model.storyUpgrades,[{fromRevision:1,toRevision:2,previous:previousQ047.story,values:[{key:'homeClerkAt',value:'home'},{key:'otherClerkAt',value:'other'}]}]);
 for(const id of ['homeClerk','otherClerk','homeRecipient','otherRecipient']){assert.equal(q.story.entities[id].kind,'person');assert.equal(q.story.entities[id].character,'q047_'+id);for(const key of ['portrait','sprite'])assert.equal(data.characters['q047_'+id][key],undefined);delete q.story.entities[id].character;}
 for(const [id,place] of [['homeClerk','home'],['otherClerk','other']]){assert.deepEqual(q.story.registry[id+'At'].values,[place]);delete q.story.entities[id];delete q.story.registry[id+'At'];}
 assert.equal(Object.values(q.story.scenes).filter(s=>s.cast.length).length,7);assert.deepEqual(q.story.scenes.entry.cast,[]);
 for(const c of q.story.scenes.parallel.cast)assert.deepEqual(c.when,{op:'in',left:'vault_publish',right:{ref:'stories.q047.events'}});
 for(const s of Object.values(q.story.scenes))s.cast=[];
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ047);
});

test('q047 all eight scenes, nine journeys and thirteen actions resume from current and previous saves',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),now=loadQ047(raw),before=projectGame(g).dialog,after=projectGame(now).dialog,s=now.state.stories.q047;
  assert.equal(g.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);fixedPeople(now);
  phases.add(g.state.journey?'journey':g.state.quests.q047.stage==='completed'?'completed':g.state.waiting?.type);
  if(s.scene)scenes.add(s.scene);if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q047Cast(s.scene,s.events));
  if(now.state.journey){const id=now.state.journey.action,a=data.quests.q047.story.actions[id];journeys.add(id);assert.equal(s.scene,null);assert.equal(after?.scene,undefined);assert.deepEqual(a.journey.companions,[]);assert.equal(s.values.partyAt,'transit');assert.equal(now.dispatch({type:'story.resume',quest:'q047'}),false);travel(now);checkpoint(now);fixedPeople(now);assert.equal(holders(now).partyAt,a.journey.to);}
 };
 for(const legacy of [false,true])for(const route of q047Routes){const g=q047Engine({legacy});observe(g);for(const id of route.path){actions.add(g.state.stories.q047.scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){go(g,places[g.data.quests.q047.story.actions[g.state.journey.action].journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q047.outcome,route.outcome);}
 assert.equal(scenes.size,8);assert.equal(journeys.size,9);assert.equal(actions.size,13);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q047.story.actions).sort());for(const p of ['text','choice','journey','completed'])assert.ok(phases.has(p),p);
});

test('q047 all three departures carry the pages and returning them settles only at finish',()=>{
 for(const legacy of [false,true])for(const id of ['home','other','return']){
  const g=loadQ047(q047Engine({legacy}).save()),v=()=>holders(g),gold=g.state.gold;assert.equal(v().pagesAt,'entry');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(v().pagesAt,'party');assert.equal(v().homeCopyAt,'vault');assert.equal(v().otherCopyAt,'vault');assert.equal(v().finished,false);fixedPeople(g);loadQ047(g.save());
  travel(g);assert.equal(v().pagesAt,'party');assert.equal(v().finished,false);assert.equal(g.state.gold,gold);assert.equal(v().bothReceived,false);assert.equal(v().bothDelivered,false);
  if(id==='return'){assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q047_homeClerk']);assert.deepEqual(g.state.stories.q047.knowledge,{});chooseQ047(g,'finish');assert.equal(v().pagesAt,'home');assert.equal(v().resolution,'contract');assert.equal(g.state.gold,gold+125);}
  loadQ047(g.save());
 }
});

test('q047 both joint-vault recipients receive copies only on confirmation, independently of the recordkeepers',()=>{
 for(const legacy of [false,true])for(const prefix of [['home'],['other'],['home','other']]){
  const g=loadQ047(q047Engine({legacy}).save()),v=()=>holders(g);for(const id of [...prefix,'vault'])chooseQ047(g,id);
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q047_homeRecipient','q047_otherRecipient']);assert.equal(v().pagesAt,'party');for(const key of ['homeCopyAt','otherCopyAt'])assert.equal(v()[key],'vault');assert.equal(v().bothReceived,false);assert.equal(v().bothDelivered,false);fixedPeople(g);
  chooseQ047(g,'deliver');assert.equal(v().pagesAt,'vault');assert.equal(v().homeCopyAt,'homeRecipient');assert.equal(v().otherCopyAt,'otherRecipient');assert.equal(v().bothReceived,true);assert.equal(v().bothDelivered,false);assert.equal(v().resolution,'compromise');fixedPeople(g);loadQ047(g.save());
 }
});

test('q047 drafting inherits recipients only after a meeting and delivers the two copies at separate arrivals',()=>{
 for(const legacy of [false,true])for(const route of q047Routes.filter(r=>r.outcome==='informed')){
  const g=loadQ047(q047Engine({legacy}).save()),v=()=>holders(g),cut=route.path.findIndex(id=>id==='parallel'||id==='publish');for(const id of route.path.slice(0,cut+1))chooseQ047(g,id);
  assert.equal(g.state.stories.q047.scene,'parallel');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),route.path.includes('publish')?['q047_homeRecipient','q047_otherRecipient']:[]);
  assert.equal(v().pagesAt,'party');assert.equal(v().homeCopyAt,'vault');assert.equal(v().otherCopyAt,'vault');assert.equal(v().bothReceived,false);assert.equal(v().bothDelivered,false);loadQ047(g.save());
  assert.ok(g.dispatch({type:'choose',id:'deliver'}));drain(g);assert.equal(v().pagesAt,'vault');assert.equal(v().homeCopyAt,'party');assert.equal(v().otherCopyAt,'party');assert.equal(v().bothDelivered,false);fixedPeople(g);loadQ047(g.save());
  travel(g);assert.equal(v().pagesAt,'vault');assert.equal(v().homeCopyAt,'home');assert.equal(v().otherCopyAt,'party');assert.equal(v().bothDelivered,false);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q047_homeClerk']);loadQ047(g.save());
  assert.ok(g.dispatch({type:'choose',id:'other'}));drain(g);assert.equal(v().homeCopyAt,'home');assert.equal(v().otherCopyAt,'party');assert.equal(v().bothDelivered,false);fixedPeople(g);loadQ047(g.save());travel(g);
  assert.equal(v().otherCopyAt,'other');assert.equal(v().finished,false);assert.equal(v().bothDelivered,false);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q047_otherClerk']);loadQ047(g.save());
  chooseQ047(g,'finish');assert.equal(v().bothDelivered,true);assert.equal(v().bothReceived,false);assert.equal(v().resolution,'informed');assert.equal(v().pagesAt,'vault');assert.equal(v().homeCopyAt,'home');assert.equal(v().otherCopyAt,'other');fixedPeople(g);loadQ047(g.save());
 }
});

test('q047 cross-border saves preserve transit and reveal the other account only after the record-room arrival',()=>{
 for(const legacy of [false,true]){
  let g=q047Engine({legacy});chooseQ047(g,'home');assert.ok(g.dispatch({type:'choose',id:'other'}));drain(g);go(g,{kind:'town',location:'oddland_border'});assert.equal(g.state.journey.action,'home_other');assert.equal(g.dispatch({type:'story.resume',quest:'q047'}),false);assert.deepEqual(g.state.stories.q047.knowledge,{});
  g=loadQ047(g.save());fixedPeople(g);assert.equal(holders(g).pagesAt,'party');assert.equal(holders(g).partyAt,'transit');travel(g);assert.deepEqual(g.state.stories.q047.knowledge.party,['truth']);assert.equal(g.state.townLocation,'library_other_record');
  assert.ok(g.dispatch({type:'choose',id:'vault'}));drain(g);go(g,{kind:'town',location:'hikarigaeri_square'});assert.equal(g.state.journey.action,'other_vault');assert.equal(g.dispatch({type:'story.resume',quest:'q047'}),false);g=loadQ047(g.save());assert.equal(holders(g).pagesAt,'party');assert.deepEqual(g.state.stories.q047.knowledge.party,['truth']);fixedPeople(g);travel(g);assert.equal(g.state.townLocation,'library_joint');assert.equal(holders(g).bothReceived,false);
 }
});

test('q047 all nine routes retain three one-time rewards and do not add the source ghost battle',()=>{
 assert.equal(q047Routes.length,9);const rewards={contract:[125,75],compromise:[68,75],informed:[105,100]};
 for(const legacy of [false,true])for(const route of q047Routes){const g=loadQ047(q047Engine({legacy}).save()),gold=g.state.gold,inventory=structuredClone(g.state.inventory),members=[...g.state.members],battles=g.state.records.battles;let count=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],rewards[route.outcome]);count++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(count,0);chooseQ047(g,id);}assert.equal(g.state.quests.q047.outcome,route.outcome);assert.equal(count,1);assert.equal(g.state.gold,gold+rewards[route.outcome][0]);assert.deepEqual(g.state.inventory,inventory);assert.deepEqual(g.state.members,members);assert.equal(g.state.records.battles,battles);assert.equal(g.state.battle,null);
  const raw=g.save();assert.throws(()=>g.complete('q047',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q047.model.entryScript);drain(g);assert.equal(count,1);loadQ047(g.save());
 }
});

test('q047 accepted pre-relocation saves keep four scenes and all nine direct routes',()=>{
 assert.equal(q047AcceptedRoutes.length,9);const scenes=new Set();
 for(const route of q047AcceptedRoutes){const g=loadQ047(q047AcceptedEngine().save());let count=0;const award=g.award.bind(g);g.award=(gold,xp,who)=>{const o=data.previousQuestRoutes.q047.outcomes[route.outcome];assert.deepEqual([gold,xp],[o.gold,o.xp]);count++;return award(gold,xp,who);};
  for(const id of route.path){scenes.add(g.state.flags.flow.q047.node);loadQ047(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ047(g.save());drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q047,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}assert.equal(g.state.quests.q047.outcome,route.outcome);assert.equal(count,1);loadQ047(g.save());
 }assert.deepEqual([...scenes].sort(),['entry','home','other','vault']);
});

test('q047 rejects invalid old custody, flags, revisions and forged fixed recordkeeper locations atomically',()=>{
 const g=q047Engine(),raw=g.save(),old=q047Engine({legacy:true}).save();
 for(const input of [raw,old])for(const mutate of [s=>s.stories.q047.values.pagesAt='homeClerk',s=>s.stories.q047.values.homeRecipientAt='missing',s=>s.stories.q047.values.bothReceived=1,s=>s.stories.q047.revision=3,s=>(s.flags.legacyStoryRoutes??={}).q047=true]){const saved=JSON.parse(input);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
 for(const key of ['homeClerkAt','otherClerkAt'])for(const value of [undefined,'entry','vault','transit']){const saved=JSON.parse(raw);if(value===undefined)delete saved.state.stories.q047.values[key];else saved.state.stories.q047.values[key]=value;assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
 const forged=JSON.parse(old);forged.state.stories.q047.values.homeClerkAt='home';assert.throws(()=>g.load(JSON.stringify(forged)));assert.equal(g.save(),raw);
});

test('q047 browser checkpoints distinguish all consultation routes and both appearances of the drafting scene',async()=>{
 const {fixtures,outcomes}=await warPageArtFixtures();assert.equal(fixtures.length,53);assert.equal(outcomes.length,3);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,53);
 for(const prefix of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(prefix));assert.equal(rows.length,23);const drafting=rows.filter(f=>f.scene==='parallel');assert.equal(drafting.length,5);assert.equal(drafting.filter(f=>f.cast.length===2).length,3);assert.equal(drafting.filter(f=>f.cast.length===0).length,2);assert.equal(rows.filter(f=>f.scene==='home_delivered').length,5);assert.equal(rows.filter(f=>f.scene==='other_delivered').length,5);}
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,7);
});
