import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './library-helpers.mjs';
import {previousQ048,q048Routes,q048AcceptedRoutes,q048Cast,q048ClientPlace,q048Engine,q048AcceptedEngine,loadQ048,chooseQ048,proofreaderArtFixtures} from '../tools/proofreader-art-fixtures.mjs';

const places=data.quests.q048.story.worldPlaces;
const story=g=>g.state.stories.q048,values=g=>story(g).values;
const people=g=>{assert.equal(values(g).proofreaderAt,'entry');assert.equal(values(g).manuscriptClientAt,q048ClientPlace(story(g).events));};
const travel=g=>{const a=g.data.quests.q048.story.actions[g.state.journey.action];go(g,places[a.journey.to]);drain(g);assert.equal(g.state.journey,null);};

test('q048 preserves prose and existing state while adding three role links and independent client arrivals',()=>{
 const q=structuredClone(data.quests.q048);assert.equal(q.story.revision,2);assert.equal(q.model.edition.revision,2);
 assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ048.story);
 const arrived=action=>({op:'in',left:action,right:{ref:'stories.q048.events'}});
 assert.deepEqual(q.model.storyUpgrades[0].values,[{key:'proofreaderAt',value:'entry'},{key:'manuscriptClientAt',value:'entry'},{key:'manuscriptClientAt',value:'morning',when:arrived('entry_correct')},{key:'manuscriptClientAt',value:'contract',when:arrived('morning_freeze')}]);
 for(const id of ['proofreader','manuscriptClient','team']){assert.equal(q.story.entities[id].character,'q048_'+id);for(const key of ['portrait','sprite'])assert.equal(data.characters['q048_'+id][key],undefined);delete q.story.entities[id].character;}
 assert.equal(q.story.entities.team.kind,'group');assert.deepEqual(q.story.registry.proofreaderAt.values,['entry']);assert.deepEqual(q.story.registry.manuscriptClientAt.values,['entry','morning','contract']);
 for(const id of ['proofreader','manuscriptClient']){delete q.story.entities[id];delete q.story.registry[id+'At'];}
 assert.equal(Object.values(q.story.scenes).filter(s=>s.cast.length).length,5);for(const scene of ['again','sealed'])assert.deepEqual(q.story.scenes[scene].cast,[]);for(const s of Object.values(q.story.scenes))s.cast=[];
 for(const id of ['entry_correct','morning_freeze']){const a=q.story.actions[id],moves=a.effects.filter(e=>e.entities?.includes('manuscriptClient'));assert.equal(moves.length,1);assert.deepEqual(moves[0].entities,['manuscriptClient']);assert.deepEqual(a.journey.companions,[]);a.effects=a.effects.filter(e=>!e.entities?.includes('manuscriptClient'));}
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ048);
});

test('q048 all seven scenes, eight journeys and twelve actions resume from current and previous saves',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),now=loadQ048(raw),before=projectGame(g).dialog,after=projectGame(now).dialog,s=story(now);assert.equal(g.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);people(now);
  phases.add(g.state.journey?'journey':g.state.quests.q048.stage==='completed'?'completed':g.state.waiting?.type);if(s.scene)scenes.add(s.scene);if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q048Cast(s.scene));
  if(now.state.journey){const id=now.state.journey.action,a=data.quests.q048.story.actions[id];journeys.add(id);assert.equal(s.scene,null);assert.equal(after?.scene,undefined);assert.deepEqual(a.journey.companions,id==='team_escort'?['team']:[]);assert.equal(s.values.partyAt,'transit');assert.equal(now.dispatch({type:'story.resume',quest:'q048'}),false);travel(now);checkpoint(now);people(now);assert.equal(values(now).partyAt,a.journey.to);}
 };
 for(const legacy of [false,true])for(const route of q048Routes){const g=q048Engine({legacy});observe(g);for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){go(g,places[g.data.quests.q048.story.actions[g.state.journey.action].journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q048.outcome,route.outcome);}
 assert.equal(scenes.size,7);assert.equal(journeys.size,8);assert.equal(actions.size,12);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q048.story.actions).sort());for(const p of ['text','choice','journey','completed'])assert.ok(phases.has(p),p);
});

test('q048 the manuscript client arrives independently and is not dragged back on repeated correction',()=>{
 for(const legacy of [false,true]){
  let g=q048Engine({legacy});assert.deepEqual(projectGame(loadQ048(g.save())).dialog.scene.cast.map(c=>c.id),['q048_proofreader','q048_manuscriptClient']);
  assert.ok(g.dispatch({type:'choose',id:'correct'}));drain(g);g=loadQ048(g.save());assert.equal(values(g).manuscriptClientAt,'entry');assert.equal(values(g).teamAt,'morning');assert.deepEqual(data.quests.q048.story.actions.entry_correct.journey.companions,[]);assert.ok(!story(g).events.includes('entry_correct'));
  go(g,{kind:'town',location:'e2_academy'});assert.equal(g.state.journey.action,'entry_correct');g=loadQ048(g.save());assert.equal(values(g).manuscriptClientAt,'entry');travel(g);assert.equal(values(g).manuscriptClientAt,'morning');assert.deepEqual(story(g).knowledge,{});
  chooseQ048(g,'again');assert.equal(values(g).manuscriptClientAt,'morning');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);chooseQ048(g,'next');assert.equal(values(g).manuscriptClientAt,'morning');
  assert.ok(g.dispatch({type:'choose',id:'freeze'}));drain(g);g=loadQ048(g.save());assert.equal(values(g).manuscriptClientAt,'morning');assert.deepEqual(story(g).knowledge,{});travel(g);assert.equal(values(g).manuscriptClientAt,'contract');assert.deepEqual(story(g).knowledge.party,['truth']);
  chooseQ048(g,'continue');assert.equal(values(g).manuscriptClientAt,'contract');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q048_team']);people(g);
 }
});

test('q048 correction can repeat only once and commits its flag on arrival rather than departure',()=>{
 for(const legacy of [false,true]){let g=q048Engine({legacy});chooseQ048(g,'correct');assert.equal(values(g).repeated,false);assert.ok(g.dispatch({type:'choose',id:'again'}));drain(g);assert.equal(values(g).repeated,false);g=loadQ048(g.save());assert.equal(values(g).repeated,false);travel(g);assert.equal(values(g).repeated,true);assert.equal(story(g).scene,'again');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);chooseQ048(g,'next');assert.equal(story(g).scene,'morning');const before=structuredClone(values(g));assert.equal(g.dispatch({type:'choose',id:'again'}),false);assert.deepEqual(values(g),before);assert.equal(g.state.journey,null);chooseQ048(g,'freeze');chooseQ048(g,'seal');chooseQ048(g,'finish');assert.equal(g.state.quests.q048.outcome,'informed');}
});

test('q048 signing at the office and returning to the table do not prematurely seal the final draft',()=>{
 for(const legacy of [false,true])for(const repeat of [false,true]){let g=q048Engine({legacy});chooseQ048(g,'correct');if(repeat){chooseQ048(g,'again');chooseQ048(g,'next');}chooseQ048(g,'freeze');g=loadQ048(g.save());assert.equal(values(g).manuscriptClientAt,'contract');const gold=g.state.gold;
  for(const key of ['additionsClosed','sealed','teamWorked','finished','broken'])assert.equal(values(g)[key],false);assert.ok(g.dispatch({type:'choose',id:'seal'}));drain(g);people(g);loadQ048(g.save());travel(g);assert.equal(story(g).scene,'sealed');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);assert.equal(values(g).additionsClosed,false);assert.equal(values(g).sealed,false);assert.equal(values(g).finished,false);assert.equal(g.state.gold,gold);chooseQ048(g,'finish');assert.equal(values(g).additionsClosed,true);assert.equal(values(g).sealed,true);assert.equal(values(g).teamWorked,false);assert.equal(values(g).resolution,'informed');assert.equal(g.state.gold,gold+105);people(g);loadQ048(g.save());
 }
});

test('q048 all five relief routes keep their client location and escort only the existing team',()=>{
 for(const legacy of [false,true])for(const route of q048Routes.filter(r=>r.outcome==='compromise')){let g=q048Engine({legacy});for(const id of route.path.slice(0,-2))chooseQ048(g,id);g=loadQ048(g.save());assert.equal(story(g).scene,'team');assert.equal(values(g).teamAt,'morning');const client=values(g).manuscriptClientAt,gold=g.state.gold;assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q048_team']);assert.ok(g.dispatch({type:'choose',id:'escort'}));drain(g);assert.equal(values(g).teamAt,'transit');assert.equal(values(g).manuscriptClientAt,client);assert.equal(values(g).teamWorked,false);loadQ048(g.save());travel(g);assert.equal(values(g).teamAt,'entry');assert.equal(values(g).manuscriptClientAt,client);assert.equal(values(g).teamWorked,false);assert.equal(values(g).finished,false);assert.equal(g.state.gold,gold);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q048_team']);chooseQ048(g,'finish');assert.equal(values(g).teamWorked,true);assert.equal(values(g).additionsClosed,false);assert.equal(values(g).sealed,false);assert.equal(values(g).resolution,'compromise');assert.equal(g.state.gold,gold+68);people(g);loadQ048(g.save());}
});

test('q048 all eight routes retain three one-time rewards without adding the source spirit battle',()=>{
 assert.equal(q048Routes.length,8);const rewards={contract:[125,75],compromise:[68,75],informed:[105,100]};
 for(const legacy of [false,true])for(const route of q048Routes){const g=loadQ048(q048Engine({legacy}).save()),gold=g.state.gold,inventory=structuredClone(g.state.inventory),members=[...g.state.members],battles=g.state.records.battles;let count=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],rewards[route.outcome]);count++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(count,0);chooseQ048(g,id);}assert.equal(g.state.quests.q048.outcome,route.outcome);assert.equal(count,1);assert.equal(g.state.gold,gold+rewards[route.outcome][0]);assert.deepEqual(g.state.inventory,inventory);assert.deepEqual(g.state.members,members);assert.equal(g.state.records.battles,battles);assert.equal(g.state.battle,null);assert.equal(values(g).broken,route.outcome==='contract');
  const raw=g.save();assert.throws(()=>g.complete('q048',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q048.model.entryScript);drain(g);assert.equal(count,1);loadQ048(g.save());
 }
});

test('q048 accepted pre-relocation saves keep three scenes and eight direct routes',()=>{
 assert.equal(q048AcceptedRoutes.length,8);const scenes=new Set();
 for(const route of q048AcceptedRoutes){const g=loadQ048(q048AcceptedEngine().save());let count=0;const award=g.award.bind(g);g.award=(gold,xp,who)=>{const o=data.previousQuestRoutes.q048.outcomes[route.outcome];assert.deepEqual([gold,xp],[o.gold,o.xp]);count++;return award(gold,xp,who);};for(const id of route.path){scenes.add(g.state.flags.flow.q048.node);loadQ048(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ048(g.save());drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q048,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}assert.equal(g.state.quests.q048.outcome,route.outcome);assert.equal(count,1);loadQ048(g.save());}assert.deepEqual([...scenes].sort(),['entry','final','morning']);
});

test('q048 rejects malformed old flags, mixed routes and forged new person locations atomically',()=>{
 const g=q048Engine(),raw=g.save(),old=q048Engine({legacy:true}).save();
 for(const input of [raw,old])for(const mutate of [s=>s.stories.q048.values.teamAt='missing',s=>s.stories.q048.values.repeated=1,s=>s.stories.q048.revision=3,s=>(s.flags.legacyStoryRoutes??={}).q048=true]){const saved=JSON.parse(input);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
 for(const [key,bad] of [['proofreaderAt',[undefined,'morning','contract','transit']],['manuscriptClientAt',[undefined,'transit','team','missing']]])for(const value of bad){const saved=JSON.parse(raw);if(value===undefined)delete saved.state.stories.q048.values[key];else saved.state.stories.q048.values[key]=value;assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
 for(const key of ['proofreaderAt','manuscriptClientAt']){const forged=JSON.parse(old);forged.state.stories.q048.values[key]='entry';assert.throws(()=>g.load(JSON.stringify(forged)));assert.equal(g.save(),raw);}
});

test('q048 browser checkpoints cover repeated correction, five relief approaches and accepted saves',async()=>{
 const {fixtures,outcomes}=await proofreaderArtFixtures();assert.equal(fixtures.length,41);assert.equal(outcomes.length,3);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,41);
 for(const prefix of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(prefix));assert.equal(rows.length,18);for(const scene of ['morning','final','sealed'])assert.equal(rows.filter(f=>f.scene===scene).length,2);for(const scene of ['team','team_work'])assert.equal(rows.filter(f=>f.scene===scene).length,5);for(const row of rows.filter(f=>['again','sealed'].includes(f.scene)))assert.deepEqual(row.cast,[]);}
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,5);
});
