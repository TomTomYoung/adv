import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,read,start,choose,go,drain,checkpoint} from './machine-helpers.mjs';
import {previousQ176,previousQ176Data,q176Routes,q176AcceptedRoutes,q176Cast,q176Locations,q176Engine,q176AcceptedEngine,upgradedQ176Save,upgradeQ176,godSandalsArtFixtures} from '../tools/god-sandals-art-fixtures.mjs';

test('q176 changes only cast, two companion trips, two prose passages and explicit location migration',()=>{
 const q=structuredClone(data.quests.q176);assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ176.story);assert.equal(q.model.storyUpgrades[0].fromRevision,1);assert.equal(q.model.storyUpgrades[0].toRevision,2);
 assert.deepEqual(q.story.registry.sandalsAt,previousQ176.story.registry.sandalsAt);
 for(const id of ['priestPerson','roadkeepers','merchantPerson']){delete q.story.entities[id];delete q.story.registry[id+'At'];}
 delete q.story.entities.godPerson.character;for(const scene of Object.values(q.story.scenes))scene.cast=[];
 for(const [action,companion] of [['onsite_road','priestPerson'],['road_agree','roadkeepers']]){const a=q.story.actions[action];assert.deepEqual(a.journey.companions,[companion]);assert.deepEqual(a.effects[0].entities,['party',companion]);a.journey.companions=[];a.effects[0].entities=['party'];}
 for(const id of ['road','return_shrine']){const old=previousQ176.model.graph.find(n=>n.id===id).text;q.model.graph.find(n=>n.id===id).text=old;q.scripts['q176.machine.'+id].commands.find(c=>c.op==='narrate').text=old;}
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ176);
 for(const id of ['q176_god','q176_priest','q176_roadkeepers','q176_merchant']){assert.equal(data.characters[id].portrait,undefined);assert.equal(data.characters[id].sprite,undefined);}
});

test('q176 current and revision-one saves preserve all phases and can finish every pending journey after migration',()=>{
 const phases=new Set(),scenes=new Set(),journeys=new Set();
 const observe=g=>{
  const raw=g.save(),now=upgradeQ176(raw);assert.equal(g.save(),raw);const before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  const story=now.state.stories.q176;for(const [key,value] of Object.entries(q176Locations(now.state)))assert.equal(story.values[key],value);
  phases.add(g.state.journey?'journey':g.state.quests.q176.stage==='completed'?'completed':g.state.waiting?.type);
  if(story.scene)scenes.add(story.scene);if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q176Cast(story.scene));
  if(now.state.journey){
   const j=now.state.journey,a=data.quests.q176.story.actions[j.action];journeys.add(j.action);assert.equal(story.scene,null);assert.equal(projectGame(now).dialog?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q176'}),false);
   now.random=()=>.999999;go(now,data.quests.q176.story.worldPlaces[a.journey.to]);drain(now);assert.equal(now.state.journey,null);checkpoint(now);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),q176Cast(now.state.stories.q176.scene));
   for(const companion of a.journey.companions)assert.equal(now.state.stories.q176.values[companion+'At'],a.journey.to);
  }
 };
 for(const legacy of [false,true])for(const route of q176Routes){const g=q176Engine({legacy});observe(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q176.story.actions[g.state.journey.action];go(g,g.data.quests.q176.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q176.outcome,route.outcome);}
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
 assert.deepEqual([...scenes].sort(),Object.keys(data.quests.q176.story.scenes).sort());assert.equal(journeys.size,8);
});

test('q176 migrated and new routes keep sandal handovers, god location, ending flags and single rewards',()=>{
 for(const legacy of [false,true])for(const route of q176Routes){
  const g=upgradeQ176(q176Engine({legacy}).save());g.random=()=>.999999;const members=[...g.state.members];let rewards=0;const award=g.award.bind(g);g.award=(gold,xp,recipients)=>{assert.deepEqual([gold,xp],[141,93]);rewards++;return award(gold,xp,recipients);};
  for(const id of route.path){
   assert.ok(g.dispatch({type:'choose',id}));drain(g);const s=g.state.stories.q176;
   if(g.state.journey){const key=g.state.journey.action,a=data.quests.q176.story.actions[key],seeoff=['onsite_give','return_shrine_seeoff','season_return_seeoff'].includes(key);
    assert.equal(s.values.sandalsAt,seeoff?'godPerson':'party');assert.equal(s.values.godPersonAt,seeoff?'transit':'shrine');
    assert.equal(s.values.priestPersonAt,key==='onsite_road'?'transit':s.events.includes('onsite_road')?'priest':'shrine');assert.equal(s.values.roadkeepersAt,key==='road_agree'?'transit':s.events.includes('road_agree')?'road_place':'priest');
    go(g,data.quests.q176.story.worldPlaces[a.journey.to]);drain(g);
   }
   checkpoint(g);if(['road','repair','return_shrine','season_return'].includes(s.scene)){assert.equal(s.values.godPersonAt,'shrine');assert.equal(s.values.sandalsAt,'party');}
  }
  const v=g.state.stories.q176.values;assert.equal(g.state.quests.q176.outcome,route.outcome);assert.equal(rewards,1);assert.deepEqual(g.state.members,members);
  assert.equal(v.heldAsCondition,route.outcome==='stay');assert.equal(v.departed,route.outcome!=='stay');assert.equal(v.maintenanceAgreed,route.outcome==='season');assert.equal(v.absenceAnnounced,route.outcome==='season');assert.equal(v.sandalsAt,route.outcome==='stay'?'party':'godPerson');assert.equal(v.godPersonAt,route.outcome==='stay'?'shrine':'departure');
  const raw=g.save();assert.throws(()=>g.complete('q176',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q176.model.entryScript);drain(g);assert.equal(rewards,1);
 }
});

test('q176 browser fixtures keep old waiting prose and refresh the two corrected passages at resumed journey arrivals',async()=>{
 const r=await godSandalsArtFixtures();assert.equal(r.fixtures.length,20);assert.equal(r.outcomes.length,3);assert.equal(new Set(r.fixtures.map(f=>f.scene+'/'+f.variant)).size,20);
 for(const scene of ['road','return_shrine']){
  const old=r.fixtures.find(f=>f.scene===scene&&f.variant==='previous'),resumed=r.fixtures.find(f=>f.scene===scene&&f.variant==='previous-arrived');
  assert.equal(old.expectedText,previousQ176.model.graph.find(n=>n.id===scene).text);assert.equal(resumed.expectedText,data.quests.q176.model.graph.find(n=>n.id===scene).text);assert.notEqual(old.expectedText,resumed.expectedText);
 }
 for(const f of r.fixtures){const g=upgradeQ176(f.save);if(!f.absentStoryScene)assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),f.cast);}
});

test('q176 rejects invalid new holders, corrupt revision-one saves and mixed legacy flags atomically',()=>{
 const current=q176Engine(),saved=current.save(),old=q176Engine({legacy:true}).save();
 for(const mutate of [s=>s.stories.q176.values.priestPersonAt='departure',s=>s.stories.q176.values.roadkeepersAt='shrine',s=>s.stories.q176.values.merchantPersonAt='transit',s=>s.stories.q176.values.sandalsAt='priestPerson',s=>(s.flags.legacyStoryRoutes??={}).q176=true]){const raw=JSON.parse(saved);mutate(raw.state);assert.throws(()=>current.load(JSON.stringify(raw)));assert.equal(current.save(),saved);}
 for(const mutate of [s=>s.stories.q176.values.godPersonAt='unknown',s=>s.stories.q176.values.priestPersonAt='shrine']){const raw=JSON.parse(old);mutate(raw.state);assert.throws(()=>current.load(JSON.stringify(raw)));assert.equal(current.save(),saved);}
 const again=upgradeQ176(saved);assert.equal(again.save(),saved);
});

test('q176 accepted pre-relocation saves retain their four routes and three original endings',()=>{
 for(const route of q176AcceptedRoutes){const g=upgradeQ176(q176AcceptedEngine().save());g.random=()=>.999999;const gold=g.state.gold;for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);checkpoint(g);assert.equal(g.state.stories.q176,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}assert.equal(g.state.quests.q176.outcome,route.outcome);assert.equal(g.state.gold-gold,141);}
});

test('q176 migration coexists with the released q175 revision-one migration without changing completed progress',async()=>{
 const q175=await read('tests/fixtures/e2-q175-before-cast.json'),base={...previousQ176Data,quests:{...previousQ176Data.quests,q175},scripts:{...previousQ176Data.scripts,...q175.scripts}},old=new GameEngine(base);old.load(q176Engine({legacy:true}).save());old.random=()=>.999999;
 for(const id of q176Routes[3].path)choose(old,'q176',id);start(old,'q175');
 const raw=old.save(),expected=upgradedQ176Save(raw);expected.state.stories.q175.revision=2;expected.state.stories.q175.values.lookoutAt='warning_place';
 const current=new GameEngine(data);current.load(raw);assert.deepEqual(JSON.parse(current.save()),expected);checkpoint(current);assert.equal(current.state.quests.q176.outcome,'season');
});
