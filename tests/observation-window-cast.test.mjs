import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,audit} from './royal-helpers.mjs';
import {previousQ088,q088Routes,q088Paths,q088Cast,q088LegacyScene,q088Engine,q088AcceptedEngine,loadQ088,chooseQ088,departQ088,arriveQ088,observationWindowArtFixtures} from '../tools/observation-window-art-fixtures.mjs';
const story=g=>g.state.stories.q088,values=g=>story(g).values;
const cast=g=>projectGame(g).dialog.scene?.cast.map(c=>c.id);

test('q088 changes only one group character, two casts and three pending-action sentences',()=>{
 const q=structuredClone(data.quests.q088);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 assert.deepEqual(q.story.registry,previousQ088.story.registry);assert.deepEqual(q.story.actions,previousQ088.story.actions);
 assert.equal(q.story.entities.experts.kind,'group');assert.equal(q.story.entities.experts.character,'q088_experts');delete q.story.entities.experts.character;
 for(const key of ['portrait','sprite'])assert.equal(data.characters.q088_experts[key],undefined);
 for(const [id,a] of Object.entries(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,id==='experts_escort'?['experts']:[]);
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>'q088_'+c.entity),q088Cast(id));s.cast=[];}
 for(const id of ['spare','lesson','inspected']){const n=q.model.graph.find(n=>n.id===id),now=n.text,old=previousQ088.model.graph.find(n=>n.id===id).text;assert.notEqual(now,old);n.text=old;
  let count=0;const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);}
 assert.deepEqual(q,previousQ088);
});

test('q088 five routes exhaust both acyclic graphs, seventeen states and all three endings',()=>{
 assert.deepEqual(q088Paths(data.quests.q088.model.graph),q088Routes.map(({path,outcome})=>({path,outcome})));
 assert.deepEqual(q088Paths(data.previousQuestRoutes.q088.model.graph),q088Routes.map(({accepted:path,outcome})=>({path,outcome})));
 const result=audit('q088');assert.equal(result.states,17);assert.deepEqual(Object.keys(result.ends).sort(),['compromise','contract','informed']);
});

test('q088 all ten scenes, eight journeys and fourteen actions preserve exact current and old saves',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),h=loadQ088(raw);assert.equal(g.save(),raw);assert.deepEqual(JSON.parse(h.save()),JSON.parse(raw));const before=projectGame(g).dialog,after=projectGame(h).dialog;assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  if(story(h).scene)scenes.add(story(h).scene);phases.add(h.state.journey?'journey':h.state.quests.q088.stage==='completed'?'completed':h.state.waiting?.type);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q088Cast(story(h).scene));
  if(h.state.journey){journeys.add(h.state.journey.action);assert.equal(story(h).scene,null);assert.equal(after?.scene,undefined);assert.equal(h.dispatch({type:'story.resume',quest:'q088'}),false);arriveQ088(h);}
 };
 for(const legacy of [false,true])for(const route of q088Routes){const g=q088Engine({legacy});observe(g);for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q088.story.actions[g.state.journey.action];go(g,g.data.quests.q088.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q088.outcome,route.outcome);}
 assert.equal(scenes.size,10);assert.equal(journeys.size,8);assert.equal(actions.size,14);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q088.story.actions).sort());for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
});

test('q088 layer inspection removes only the measuring panel, never the pressure window',()=>{
 for(const legacy of [false,true]){let g=q088Engine({legacy});assert.equal(values(g).windowAt,'entry');assert.equal(values(g).crackedAt,'entry');assert.equal(values(g).spareAt,'workshop');chooseQ088(g,'layers');g=loadQ088(g.save());assert.equal(values(g).crackedAt,'party');assert.equal(values(g).windowAt,'entry');assert.equal(values(g).checked,false);assert.equal(values(g).covered,false);assert.deepEqual(cast(g),[]);}
});

test('q088 replacement is collected on departure and installed only by the explicit test action',()=>{
 for(const legacy of [false,true]){let g=q088Engine({legacy});chooseQ088(g,'layers');chooseQ088(g,'replace');assert.equal(story(g).scene,'spare');assert.equal(values(g).spareAt,'workshop');assert.deepEqual(cast(g),[]);
  departQ088(g,'carry');assert.equal(values(g).spareAt,'party');assert.equal(values(g).windowAt,'entry');assert.equal(values(g).expertsAt,'workshop');g=loadQ088(g.save());arriveQ088(g);
  assert.equal(story(g).scene,'install');assert.equal(values(g).spareAt,'party');assert.equal(values(g).checked,false);chooseQ088(g,'test');assert.equal(values(g).spareAt,'window');assert.equal(values(g).checked,true);assert.equal(values(g).crackedAt,'party');assert.equal(values(g).observed,false);assert.equal(values(g).windowAt,'entry');assert.deepEqual(cast(g),[]);
 }
});

test('q088 observation is performed before archive travel, and the old panel transfers only on finish',()=>{
 for(const legacy of [false,true]){let g=q088Engine({legacy});for(const id of ['layers','replace','carry','test','observe'])chooseQ088(g,id);assert.equal(values(g).observed,false);
  departQ088(g,'sky');assert.equal(values(g).observed,true);assert.equal(values(g).crackedAt,'party');assert.equal(values(g).spareAt,'window');g=loadQ088(g.save());arriveQ088(g);
  assert.equal(story(g).scene,'lesson');assert.equal(values(g).finished,false);assert.equal(values(g).crackedAt,'party');assert.equal(values(g).expertsAt,'workshop');assert.deepEqual(cast(g),[]);chooseQ088(g,'finish');assert.equal(values(g).crackedAt,'archive');assert.equal(values(g).windowAt,'entry');assert.equal(g.state.quests.q088.outcome,'informed');
 }
});

test('q088 specialist group really escorts the party, with separate direct and detached-panel cases',()=>{
 for(const legacy of [false,true])for(const detached of [false,true]){let g=q088Engine({legacy});if(detached)chooseQ088(g,'layers');chooseQ088(g,detached?'expert':'inspection');assert.equal(values(g).expertsAt,'workshop');assert.equal(values(g).checked,false);assert.deepEqual(cast(loadQ088(g.save())),['q088_experts']);
  departQ088(g,'escort');assert.equal(values(g).expertsAt,'transit');assert.equal(values(g).crackedAt,detached?'party':'entry');g=loadQ088(g.save());arriveQ088(g);
  assert.equal(story(g).scene,'inspected');assert.equal(values(g).expertsAt,'entry');assert.equal(values(g).checked,false);assert.equal(values(g).spareAt,'workshop');assert.equal(values(g).observed,false);assert.deepEqual(cast(g),['q088_experts']);chooseQ088(g,'finish');assert.equal(values(g).checked,true);assert.equal(values(g).observed,false);assert.equal(values(g).crackedAt,detached?'party':'entry');assert.equal(g.state.quests.q088.outcome,'compromise');
 }
});

test('q088 cancelling after replacement does not observe or archive the panel; covering remains non-combat',()=>{
 for(const legacy of [false,true]){const g=q088Engine({legacy});for(const id of ['layers','replace','carry','test','observe','cancel'])chooseQ088(g,id);assert.equal(values(g).finished,false);assert.equal(values(g).checked,true);assert.equal(values(g).observed,false);assert.equal(values(g).crackedAt,'party');assert.equal(values(g).spareAt,'window');assert.deepEqual(cast(g),[]);chooseQ088(g,'finish');assert.equal(g.state.quests.q088.outcome,'compromise');assert.equal(values(g).crackedAt,'party');assert.equal(values(g).expertsAt,'workshop');
  const h=q088Engine({legacy});chooseQ088(h,'metal');assert.equal(h.state.battle,null);assert.equal(values(h).covered,true);assert.equal(values(h).checked,false);assert.equal(values(h).observed,false);assert.equal(values(h).crackedAt,'entry');assert.equal(values(h).spareAt,'workshop');assert.equal(h.state.quests.q088.outcome,'contract');loadQ088(h.save());
 }
});

test('q088 every journey resumes after return mark and defeat without duplicating custody or escorts',()=>{
 const seen=new Set();for(const legacy of [false,true])for(const route of q088Routes){const g=q088Engine({legacy});for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.journey){const key=legacy+'/'+g.state.journey.action;if(!seen.has(key)){seen.add(key);const raw=g.save();for(const interruption of ['mark','defeat']){const h=loadQ088(raw);if(h.state.mode==='town')go(h,{kind:'dungeon',dungeon:'region_9',map:'region_9_f1',x:1,y:1});assert.ok(h.state.journey);const s=structuredClone(story(h)),j=structuredClone(h.state.journey);if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);const resumed=loadQ088(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q088'}),false);arriveQ088(resumed);assert.equal(values(resumed).windowAt,'entry');assert.equal(values(resumed).expertsAt,j.action==='experts_escort'?'entry':'workshop');assert.equal(values(resumed).finished,false);assert.deepEqual(cast(resumed),q088Cast(story(resumed).scene));assert.equal(values(resumed).crackedAt,s.values.crackedAt);assert.equal(values(resumed).spareAt,s.values.spareAt);}}arriveQ088(g);}}}assert.equal(seen.size,16);
});

test('q088 original rewards occur once on all five paths and both save generations',()=>{
 for(const legacy of [false,true])for(const route of q088Routes){const g=loadQ088(q088Engine({legacy}).save()),reward=data.quests.q088.outcomes[route.outcome],gold=g.state.gold;let awards=0,total=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{total+=gp;if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};for(const id of route.path){assert.equal(awards,0);chooseQ088(g,id);}assert.equal(awards,1);assert.equal(g.state.gold,gold+total);assert.equal(g.state.quests.q088.outcome,route.outcome);const raw=g.save();assert.throws(()=>g.complete('q088',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q088'),false);g.run(data.quests.q088.model.entryScript);drain(g);assert.equal(awards,1);loadQ088(g.save());}
});

test('q088 accepted old routes retain all three scenes and five direct paths',()=>{
 const scenes=new Set();for(const route of q088Routes){const g=loadQ088(q088AcceptedEngine().save());for(const id of route.accepted){scenes.add(q088LegacyScene(g));loadQ088(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ088(g.save());drain(g);assert.equal(g.state.battle,null);assert.equal(g.state.stories.q088,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}assert.equal(g.state.quests.q088.outcome,route.outcome);loadQ088(g.save());}assert.deepEqual([...scenes].sort(),['entry','observe','panel']);
});

test('q088 invalid current and older saves reject atomically with panel and specialist state unchanged',()=>{
 const g=q088Engine(),before=g.save();for(const raw of [before,q088Engine({legacy:true}).save()])for(const mutate of [s=>s.stories.q088.values.expertsAt='unknown',s=>s.stories.q088.values.crackedAt='cracked',s=>s.stories.q088.values.checked=1,s=>delete s.stories.q088.values.windowAt,s=>s.stories.q088.revision=2,s=>s.stories.q088.events.push('unknown'),s=>(s.flags.legacyStoryRoutes??={}).q088=true]){const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
});

test('q088 browser fixtures cover ten scenes, custody before completion, expert escort and original text',async()=>{
 const {fixtures,outcomes}=await observationWindowArtFixtures();assert.equal(outcomes.length,3);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const gen of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(gen));assert.equal(new Set(rows.map(f=>f.scene)).size,10);assert.equal(rows.filter(f=>f.variant.includes('rescued')).length,4);assert.equal(rows.filter(f=>f.scene==='experts').length,2);}
 for(const f of fixtures){const d=projectGame(loadQ088(f.save)).dialog;assert.equal(d.text,f.expectedText);if(f.absentStoryScene){assert.equal(d.scene,undefined);assert.deepEqual(f.cast,[]);}else{assert.deepEqual(d.scene.cast.map(c=>c.id),q088Cast(f.scene));assert.deepEqual(f.textOnlyCast,f.cast);}}
 for(const scene of ['spare','lesson','inspected']){const f=fixtures.find(f=>f.scene===scene&&f.variant.startsWith('previous'));assert.equal(f.expectedText,previousQ088.model.graph.find(n=>n.id===scene).text);assert.notEqual(f.expectedText,data.quests.q088.model.graph.find(n=>n.id===scene).text);}assert.equal(fixtures.filter(f=>f.absentStoryScene).length,3);
});
