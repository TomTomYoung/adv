import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,read,start,choose,go,drain,checkpoint} from './machine-helpers.mjs';
import {previousQ180,previousQ180Data,q180Routes,q180AcceptedRoutes,q180RevisedScenes,q180Cast,q180Engine,q180AcceptedEngine,loadQ180,lastTaleArtFixtures} from '../tools/last-tale-art-fixtures.mjs';

test('q180 changes only two cast roles and six paragraphs, retaining revision one and every action, owner and ending',()=>{
 const q=structuredClone(data.quests.q180);delete q.story.entities.mui.character;delete q.story.entities.listeners.character;for(const s of Object.values(q.story.scenes))s.cast=[];
 for(const id of q180RevisedScenes){const old=previousQ180.model.graph.find(n=>n.id===id).text,n=q.model.graph.find(n=>n.id===id);assert.notEqual(n.text,old);n.text=old;q.scripts['q180.machine.'+id].commands.find(c=>c.op==='narrate').text=old;}
 assert.deepEqual(q,previousQ180);assert.equal(q.story.revision,1);assert.equal(q.model.storyUpgrades,undefined);assert.equal(data.quests.q180.story.entities.listeners.kind,'group');
 for(const id of ['q180_mui','q180_listeners']){assert.equal(data.characters[id].portrait,undefined);assert.equal(data.characters[id].sprite,undefined);}
});

test('q180 loads all nine scenes, eight journeys and waiting phases without changing existing saves or replaying effects',()=>{
 const phases=new Set(),scenes=new Set(),journeys=new Set();
 const observe=g=>{const raw=g.save(),now=loadQ180(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(now.save(),raw);assert.equal(g.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);phases.add(g.state.journey?'journey':g.state.quests.q180.stage==='completed'?'completed':g.state.waiting?.type);if(g.state.stories.q180.scene)scenes.add(g.state.stories.q180.scene);if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q180Cast(now.state.stories.q180.scene));
  if(now.state.journey){const j=now.state.journey,a=data.quests.q180.story.actions[j.action];journeys.add(j.action);assert.equal(now.state.stories.q180.scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q180'}),false);now.random=()=>.999999;go(now,data.quests.q180.story.worldPlaces[a.journey.to]);drain(now);assert.equal(now.state.journey,null);checkpoint(now);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),q180Cast(now.state.stories.q180.scene));}
 };
 for(const legacy of [false,true])for(const route of q180Routes){const g=q180Engine({legacy});observe(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q180.story.actions[g.state.journey.action];go(g,g.data.quests.q180.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q180.outcome,route.outcome);}
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);assert.equal(scenes.size,9);assert.equal(journeys.size,8);
});

test('q180 separates finishing, sealing, evacuation, custody, storage and prohibition across all five paths',()=>{
 for(const legacy of [false,true])for(const route of q180Routes){const g=loadQ180(q180Engine({legacy}).save());g.random=()=>.999999;const members=[...g.state.members],gold=g.state.gold,inventory=structuredClone(g.state.inventory);let rewards=0;const award=g.award.bind(g);g.award=(gold,xp,recipients)=>{assert.deepEqual([gold,xp],[141,93]);rewards++;return award(gold,xp,recipients);};const v=()=>g.state.stories.q180.values;
  for(const id of route.path){const scene=g.state.stories.q180.scene;
   if(scene==='ending'){assert.equal(v().muiAt,'scripts_place');assert.equal(v().listenersAt,'tale');assert.equal(v().scriptPagesAt,'scripts_place');}
   if(['told_original','told_new'].includes(scene)){assert.equal(v().storyFinished,false);assert.equal(v().scriptPagesAt,'party');assert.equal(v().listenersAt,'tale');}
   if(scene==='sealed_here')assert.equal(v().phenomenonSealed,false);
   if(scene==='sealed_refuge'){assert.equal(v().phenomenonSealed,true);assert.equal(v().listenersAt,'refuge');assert.equal(v().scriptPagesAt,'scripts_place');}
   if(scene==='stored'){assert.equal(v().listenersAt,'refuge');assert.equal(v().muiAt,'scripts_place');assert.equal(v().stored,false);}
   if(scene==='banned'){assert.equal(v().listenersAt,'refuge');assert.equal(v().banned,false);}
   assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(scene==='ending'&&['original','new'].includes(id)){assert.ok(g.state.journey);assert.equal(v().scriptPagesAt,'party');assert.equal(v().muiAt,'transit');assert.equal(v().listenersAt,'tale');assert.equal(v().storyFinished,false);}
   if(scene==='sealed_here'){assert.ok(g.state.journey);assert.equal(v().phenomenonSealed,true);assert.equal(v().muiAt,'transit');assert.equal(v().listenersAt,'transit');}
   if(scene==='sealed_refuge'){assert.equal(v().muiAt,'transit');assert.equal(v().listenersAt,'refuge');assert.equal(v().stored,false);}
   if(g.state.journey){const a=data.quests.q180.story.actions[g.state.journey.action];go(g,data.quests.q180.story.worldPlaces[a.journey.to]);drain(g);}checkpoint(g);
  }
  const told=['home','new'].includes(route.outcome);assert.equal(v().storyFinished,told);assert.equal(v().phenomenonSealed,route.outcome==='seal');assert.equal(v().stored,route.outcome==='seal');assert.equal(v().banned,route.outcome==='ban');assert.equal(v().scriptPagesAt,told?'mui':'scripts_place');assert.equal(v().listenersAt,told?'tale':'refuge');assert.equal(v().muiAt,route.outcome==='seal'?'scripts_place':route.outcome==='ban'?'refuge':'tale');assert.equal(g.state.quests.q180.outcome,route.outcome);assert.equal(rewards,1);assert.equal(g.state.gold,gold+141);assert.deepEqual(g.state.members,members);assert.deepEqual(g.state.inventory,inventory);const raw=g.save();assert.throws(()=>g.complete('q180',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q180.model.entryScript);drain(g);assert.equal(rewards,1);
 }
});

test('q180 browser checkpoints distinguish old waiting prose, current arrival prose and accepted old routes',async()=>{
 const r=await lastTaleArtFixtures();assert.equal(r.fixtures.length,26);assert.equal(r.outcomes.length,4);assert.equal(new Set(r.fixtures.map(f=>f.scene+'/'+f.variant)).size,26);
 for(const f of r.fixtures){const dialog=projectGame(loadQ180(f.save)).dialog;assert.equal(dialog.text,f.expectedText);if(f.absentStoryScene)assert.equal(dialog.scene,undefined);else assert.deepEqual(dialog.scene.cast.map(c=>c.id),f.cast);}
 for(const scene of q180RevisedScenes){const get=variant=>r.fixtures.find(f=>f.scene===scene&&f.variant===variant).expectedText;assert.notEqual(get('previous'),get('current'));assert.equal(get('previous-arrived'),get('current'));}
 const old=q180Engine({legacy:true});choose(old,'q180','visit');const now=loadQ180(old.save());choose(now,'q180','seal');assert.equal(projectGame(now).dialog.text,data.quests.q180.model.graph.find(n=>n.id==='sealed_here').text);assert.equal(now.state.stories.q180.values.phenomenonSealed,false);
});

test('q180 rejects invalid holders, revisions and mixed legacy flags atomically',()=>{
 const g=q180Engine(),raw=g.save(),old=q180Engine({legacy:true}).save();for(const input of [raw,old])for(const mutate of [s=>s.stories.q180.values.muiAt='unknown',s=>s.stories.q180.values.listenersAt='unknown',s=>s.stories.q180.values.scriptPagesAt='unknown',s=>s.stories.q180.revision=2,s=>(s.flags.legacyStoryRoutes??={}).q180=true]){const saved=JSON.parse(input);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}assert.equal(loadQ180(raw).save(),raw);
});

test('q180 accepted pre-relocation saves retain five paths, four endings and one reward without relocated cast',()=>{
 for(const route of q180AcceptedRoutes){const g=loadQ180(q180AcceptedEngine().save()),gold=g.state.gold;let rewards=0;const award=g.award.bind(g);g.award=(...args)=>{rewards++;return award(...args);};for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q180,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}assert.equal(g.state.quests.q180.outcome,route.outcome);assert.equal(g.state.gold,gold+141);assert.equal(rewards,1);}
});

test('q180 preserved save composes with q179 revision-one migration without changing either outcome or reward',async()=>{
 const previous=await read('tests/fixtures/e2-q179-before-cast.json'),oldData={...previousQ180Data,quests:{...previousQ180Data.quests,q179:previous},scripts:{...previousQ180Data.scripts,...previous.scripts}},g=new GameEngine(oldData);g.load(q180Engine({legacy:true}).save());g.random=()=>.999999;for(const id of ['visit','ban','finish'])choose(g,'q180',id);start(g,'q179');for(const id of ['visit','begin','rush','report','finish'])choose(g,'q179',id);
 const raw=g.save(),expected=JSON.parse(raw);expected.state.stories.q179.revision=2;for(let i=1;i<=3;i++)expected.state.stories.q179.values['house'+i+'PersonAt']='house'+i;const now=new GameEngine(data);now.load(raw);assert.deepEqual(JSON.parse(now.save()),expected);assert.equal(now.state.stories.q180.revision,1);checkpoint(now);
});
