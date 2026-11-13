import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './library-helpers.mjs';
import {previousQ046,q046Routes,q046AcceptedRoutes,q046Engine,q046AcceptedEngine,loadQ046,chooseQ046,indexArtFixtures} from '../tools/index-art-fixtures.mjs';

test('q046 adds only the existing reader character link and five casts',()=>{
 const q=structuredClone(data.quests.q046);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 assert.equal(q.story.entities.reader.kind,'person');assert.equal(q.story.entities.reader.character,'q046_reader');assert.equal(data.characters.q046_reader.name,'索引をたどる読者');
 for(const key of ['portrait','sprite'])assert.equal(data.characters.q046_reader[key],undefined);
 assert.equal(Object.keys(q.story.scenes).length,5);for(const s of Object.values(q.story.scenes)){assert.deepEqual(s.cast,[{entity:'reader',display:{x:50}}]);s.cast=[];}
 delete q.story.entities.reader.character;assert.deepEqual(q,previousQ046);
});

test('q046 current and previous saves resume all scenes, journeys and ten actions unchanged',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),now=loadQ046(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(g.save(),raw);assert.equal(now.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  const s=now.state.stories.q046;phases.add(now.state.journey?'journey':now.state.quests.q046.stage==='completed'?'completed':now.state.waiting?.type);
  if(s.scene)scenes.add(s.scene);if(after?.scene){assert.deepEqual(after.scene.cast.map(c=>c.id),['q046_reader']);assert.equal(s.values.readerAt,data.quests.q046.story.scenes[s.scene].place);}
  if(now.state.journey){
   const id=now.state.journey.action,a=data.quests.q046.story.actions[id];journeys.add(id);assert.equal(s.scene,null);assert.equal(after?.scene,undefined);assert.equal(s.values.readerAt,'transit');assert.equal(now.dispatch({type:'story.resume',quest:'q046'}),false);
   go(now,data.quests.q046.story.worldPlaces[a.journey.to]);drain(now);checkpoint(now);assert.equal(now.state.journey,null);assert.equal(now.state.stories.q046.values.readerAt,a.journey.to);assert.equal(now.state.stories.q046.values.finished,false);
  }
 };
 for(const legacy of [false,true])for(const route of q046Routes){const g=q046Engine({legacy});observe(g);for(const id of route.path){
  actions.add(g.state.stories.q046.scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);
  if(g.state.journey){const a=g.data.quests.q046.story.actions[g.state.journey.action];go(g,g.data.quests.q046.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}
 }assert.equal(g.state.quests.q046.outcome,route.outcome);}
 assert.equal(scenes.size,5);assert.equal(journeys.size,7);assert.equal(actions.size,10);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q046.story.actions).sort());for(const p of ['text','choice','journey','completed'])assert.ok(phases.has(p),p);
});

test('q046 three exit origins mark departure, escort the reader and remain unresolved until finish',()=>{
 for(const legacy of [false,true])for(const prefix of [['index'],['index','river'],['index','river','ferry']]){
  const g=loadQ046(q046Engine({legacy}).save());for(const id of prefix)chooseQ046(g,id);const origin=g.state.stories.q046.scene,v=()=>g.state.stories.q046.values,gold=g.state.gold;
  assert.equal(v()[origin+'Exit'],false);assert.ok(g.dispatch({type:'choose',id:'exit'}));drain(g);assert.equal(v()[origin+'Exit'],true);assert.equal(v().readerAt,'transit');assert.equal(v().resolution,'pending');assert.equal(v().finished,false);assert.equal(g.state.gold,gold);loadQ046(g.save());
  for(const other of ['rain','river','ferry'].filter(p=>p!==origin))assert.equal(v()[other+'Exit'],false);
  go(g,data.quests.q046.story.worldPlaces.exit);drain(g);assert.equal(v().readerAt,'exit');assert.equal(v().resolution,'pending');assert.equal(v().finished,false);assert.equal(v().linked,false);assert.match(projectGame(g).dialog.text,/索引の循環自体は残っている/);assert.equal(g.state.gold,gold);loadQ046(g.save());
  chooseQ046(g,'finish');assert.equal(v().resolution,'compromise');assert.equal(v().finished,true);assert.equal(v().linked,false);assert.equal(g.state.gold,gold+68);loadQ046(g.save());
 }
});

test('q046 book observations arrive with their journeys and repeated loops preserve knowledge and the reader',()=>{
 for(const legacy of [false,true]){
  const g=loadQ046(q046Engine({legacy}).save()),v=()=>g.state.stories.q046.values;
  chooseQ046(g,'index');assert.equal(v().rainRead,false);assert.equal(v().riverRead,false);assert.deepEqual(g.state.stories.q046.knowledge,{});
  assert.ok(g.dispatch({type:'choose',id:'river'}));drain(g);assert.equal(v().rainRead,false);loadQ046(g.save());go(g,data.quests.q046.story.worldPlaces.river);drain(g);assert.equal(v().rainRead,true);assert.equal(v().riverRead,false);
  assert.ok(g.dispatch({type:'choose',id:'ferry'}));drain(g);assert.equal(v().riverRead,false);assert.deepEqual(g.state.stories.q046.knowledge,{});loadQ046(g.save());go(g,data.quests.q046.story.worldPlaces.ferry);drain(g);assert.equal(v().riverRead,true);assert.deepEqual(g.state.stories.q046.knowledge.party,['truth']);assert.equal(v().linked,false);
  for(let i=0;i<3;i++){
   const wasLooped=v().looped;assert.ok(g.dispatch({type:'choose',id:'loop'}));drain(g);assert.equal(v().readerAt,'transit');assert.equal(v().looped,wasLooped);loadQ046(g.save());go(g,data.quests.q046.story.worldPlaces.rain);drain(g);assert.equal(v().looped,true);assert.equal(v().readerAt,'rain');
   chooseQ046(g,'river');chooseQ046(g,'ferry');assert.equal(v().readerAt,'ferry');assert.deepEqual(g.state.stories.q046.knowledge.party,['truth']);assert.equal(v().linked,false);assert.equal(v().finished,false);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q046_reader']);loadQ046(g.save());
  }
  chooseQ046(g,'link');assert.equal(v().linked,true);assert.equal(v().straightened,false);assert.equal(v().readerAt,'ferry');assert.equal(v().resolution,'informed');for(const p of ['rain','river','ferry'])assert.equal(v()[p+'Exit'],false);
 }
});

test('q046 straightening stays at the entry and does not invent a librarian or index guardian battle',()=>{
 for(const legacy of [false,true]){const g=loadQ046(q046Engine({legacy}).save()),battles=g.state.records.battles;chooseQ046(g,'straight');const v=g.state.stories.q046.values;assert.equal(v.straightened,true);assert.equal(v.readerAt,'entry');assert.equal(v.linked,false);assert.equal(v.rainRead,false);assert.equal(v.riverRead,false);assert.equal(g.state.records.battles,battles);assert.deepEqual(Object.keys(g.data.quests.q046.story.entities).sort(),['party','reader']);loadQ046(g.save());}
});

test('q046 all exits after zero, one and two loops preserve three one-time rewards',()=>{
 const rewards={contract:[125,75],compromise:[68,75],informed:[105,100]};
 for(const legacy of [false,true])for(const route of q046Routes){
  const g=loadQ046(q046Engine({legacy}).save()),gold=g.state.gold,inventory=structuredClone(g.state.inventory),members=[...g.state.members],battles=g.state.records.battles;let count=0;
  const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],rewards[route.outcome]);count++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(count,0);chooseQ046(g,id);}assert.equal(g.state.quests.q046.outcome,route.outcome);assert.equal(count,1);assert.equal(g.state.gold,gold+rewards[route.outcome][0]);assert.deepEqual(g.state.inventory,inventory);assert.deepEqual(g.state.members,members);assert.equal(g.state.records.battles,battles);
  const raw=g.save();assert.throws(()=>g.complete('q046',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q046.model.entryScript);drain(g);assert.equal(count,1);loadQ046(g.save());
 }
});

test('q046 pre-relocation accepted saves keep four scenes, direct exits and repeatable loops',()=>{
 const scenes=new Set();
 for(const route of q046AcceptedRoutes){const g=loadQ046(q046AcceptedEngine().save());let count=0;const award=g.award.bind(g);g.award=(gold,xp,who)=>{const o=data.previousQuestRoutes.q046.outcomes[route.outcome];assert.deepEqual([gold,xp],[o.gold,o.xp]);count++;return award(gold,xp,who);};
  for(const id of route.path){scenes.add(g.state.flags.flow.q046.node);loadQ046(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ046(g.save());drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q046,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}
  assert.equal(g.state.quests.q046.outcome,route.outcome);assert.equal(count,1);loadQ046(g.save());
 }assert.deepEqual([...scenes].sort(),['entry','ferry','rain','river']);
});

test('q046 rejects invalid reader locations, value types, revisions and mixed legacy routes atomically',()=>{
 const g=q046Engine(),raw=g.save();for(const mutate of [s=>s.stories.q046.values.readerAt='missing',s=>s.stories.q046.values.looped='true',s=>s.stories.q046.values.rainExit=1,s=>s.stories.q046.revision=2,s=>(s.flags.legacyStoryRoutes??={}).q046=true]){const saved=JSON.parse(raw);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
});

test('q046 browser fixtures include every exit origin, initial and repeated shelves, previous and accepted saves',async()=>{
 const {fixtures,outcomes}=await indexArtFixtures();assert.equal(fixtures.length,33);assert.equal(outcomes.length,3);
 for(const prefix of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(prefix));assert.equal(rows.length,13);assert.equal(rows.filter(f=>f.scene==='guided').length,6);for(const p of ['rain','river','ferry'])for(const visit of ['first','looped'])assert.ok(rows.some(f=>f.scene==='guided'&&f.variant===prefix+'-'+p+'-'+visit));for(const f of rows)assert.deepEqual(f.cast,['q046_reader']);}
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,7);
});
