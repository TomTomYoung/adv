import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain} from './royal-helpers.mjs';
import {previousQ090,q090Routes,q090Paths,q090Cast,q090LegacyScene,q090Ready,q090Engine,q090AcceptedEngine,loadQ090,chooseQ090,departQ090,arriveQ090,resolveQ090,returnQ090AfterLoss,skyReturnArtFixtures} from '../tools/sky-return-art-fixtures.mjs';
const story=g=>g.state.stories.q090,values=g=>story(g).values,cast=g=>projectGame(g).dialog.scene?.cast.map(c=>c.id);
const noPowerChange=v=>{for(const key of ['lidOpen','backup','exhausted','restored','fullPower'])assert.equal(v[key],false,key);};

test('q090 changes only three character references, ten scene casts and three pending-operation sentences',()=>{
 const q=structuredClone(data.quests.q090);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 assert.deepEqual(q.story.registry,previousQ090.story.registry);assert.deepEqual(q.story.actions,previousQ090.story.actions);
 for(const id of ['mao','visitors','maintenance']){assert.equal(q.story.entities[id].character,'q090_'+id);delete q.story.entities[id].character;for(const key of ['portrait','sprite'])assert.equal(data.characters['q090_'+id][key],undefined);}
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>'q090_'+c.entity),q090Cast(id));s.cast=[];}
 for(const id of ['reserve','close','overrun']){const n=q.model.graph.find(n=>n.id===id),now=n.text,old=previousQ090.model.graph.find(n=>n.id===id).text;assert.notEqual(now,old);n.text=old;
  let count=0;const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);}
 assert.deepEqual(q,previousQ090);
});

test('q090 preparation earns the existing prerequisite by completing three earlier requests',()=>{
 const g=q090Ready();assert.equal(g.state.vars.region_9,3);for(const id of ['q081','q085','q087'])assert.equal(g.state.quests[id].stage,'completed');assert.notEqual(g.state.quests.q090?.stage,'completed');
});

test('q090 five routes exhaust both acyclic graphs and cover seventeen states and four endings',()=>{
 assert.deepEqual(q090Paths(data.quests.q090.model.graph),q090Routes.map(({path,outcome})=>({path,outcome})));
 assert.deepEqual(q090Paths(data.previousQuestRoutes.q090.model.graph),q090Routes.map(({accepted:path,outcome})=>({path,outcome})));
 const states=new Set(),ends=new Set();for(const route of q090Routes){const g=q090Engine(),observe=()=>states.add(JSON.stringify({story:story(g),outcome:g.state.quests.q090.outcome}));observe();for(const id of route.path){chooseQ090(g,id);observe();}ends.add(g.state.quests.q090.outcome);}
 assert.equal(states.size,17);assert.deepEqual([...ends].sort(),['compromise','contract','informed','overrun']);
});

test('q090 current and previous saves preserve all ten scenes, seven journeys, fourteen actions and battle phases',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),h=loadQ090(raw);assert.equal(g.save(),raw);assert.deepEqual(JSON.parse(h.save()),JSON.parse(raw));const before=projectGame(g).dialog,after=projectGame(h).dialog;assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  if(story(h).scene)scenes.add(story(h).scene);phases.add(h.state.battle?'battle':h.state.journey?'journey':h.state.quests.q090.stage==='completed'?'completed':h.state.waiting?.type);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q090Cast(story(h).scene));
  if(h.state.journey){journeys.add(h.state.journey.action);assert.equal(story(h).scene,null);assert.equal(after?.scene,undefined);assert.equal(h.dispatch({type:'story.resume',quest:'q090'}),false);arriveQ090(h);}
 };
 for(const legacy of [false,true])for(const route of q090Routes){const g=q090Engine({legacy});observe(g);for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.battle){resolveQ090(g,'win');observe(g);}if(g.state.journey){const a=g.data.quests.q090.story.actions[g.state.journey.action];go(g,g.data.quests.q090.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q090.outcome,route.outcome);}
 assert.equal(scenes.size,10);assert.equal(journeys.size,7);assert.equal(actions.size,14);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q090.story.actions).sort());for(const phase of ['text','choice','journey','battle','completed'])assert.ok(phases.has(phase),phase);
});

test('q090 Mao inspects the battery alone and neither inspection nor return starts the power transfer',()=>{
 for(const legacy of [false,true]){let g=q090Engine({legacy});assert.deepEqual(cast(loadQ090(g.save())),['q090_mao']);noPowerChange(values(g));departQ090(g,'battery');assert.equal(values(g).maoAt,'transit');assert.equal(values(g).visitorsAt,'entry');assert.equal(values(g).maintenanceAt,'entry');g=loadQ090(g.save());arriveQ090(g);assert.equal(values(g).maoAt,'battery');assert.deepEqual(cast(g),['q090_mao']);noPowerChange(values(g));
  chooseQ090(g,'hour');assert.equal(story(g).scene,'reserve');noPowerChange(values(g));assert.deepEqual(cast(g),['q090_mao']);chooseQ090(g,'start');assert.equal(values(g).backup,true);assert.equal(values(g).lidOpen,true);assert.equal(values(g).fullPower,false);assert.deepEqual(cast(g),['q090_mao','q090_visitors']);
  departQ090(g,'escort');for(const id of ['mao','visitors'])assert.equal(values(g)[id+'At'],'transit');assert.equal(values(g).maintenanceAt,'entry');arriveQ090(g);for(const id of ['mao','visitors'])assert.equal(values(g)[id+'At'],'sky');assert.equal(values(g).backup,true);
 }
});

test('q090 scheduled return closes the lid and restores normal supply only at finish',()=>{
 for(const legacy of [false,true]){let g=q090Engine({legacy});for(const id of ['battery','hour','start','escort'])chooseQ090(g,id);departQ090(g,'close');assert.equal(values(g).lidOpen,true);assert.equal(values(g).backup,true);assert.equal(values(g).restored,false);g=loadQ090(g.save());arriveQ090(g);assert.equal(story(g).scene,'close');assert.deepEqual(cast(g),['q090_mao','q090_visitors']);assert.equal(values(g).lidOpen,true);assert.equal(values(g).backup,true);assert.equal(values(g).exhausted,false);assert.equal(values(g).finished,false);
  chooseQ090(g,'finish');assert.equal(values(g).lidOpen,false);assert.equal(values(g).backup,false);assert.equal(values(g).restored,true);assert.equal(values(g).exhausted,false);assert.equal(g.state.quests.q090.outcome,'informed');
 }
});

test('q090 extending depletes the battery before the return, but maintenance never teleports to the seats',()=>{
 for(const legacy of [false,true]){let g=q090Engine({legacy});for(const id of ['battery','hour','start','escort','longer'])chooseQ090(g,id);assert.equal(story(g).scene,'exhausted');assert.equal(values(g).backup,false);assert.equal(values(g).exhausted,true);assert.equal(values(g).lidOpen,true);assert.equal(values(g).restored,false);assert.equal(values(g).maintenanceAt,'entry');assert.deepEqual(cast(loadQ090(g.save())),['q090_mao','q090_visitors']);
  departQ090(g,'return');g=loadQ090(g.save());arriveQ090(g);assert.equal(story(g).scene,'overrun');assert.deepEqual(cast(g),['q090_mao','q090_visitors','q090_maintenance']);assert.equal(values(g).lidOpen,true);assert.equal(values(g).restored,false);chooseQ090(g,'finish');assert.equal(values(g).lidOpen,false);assert.equal(values(g).restored,true);assert.equal(values(g).backup,false);assert.equal(values(g).exhausted,true);assert.equal(g.state.quests.q090.outcome,'overrun');
 }
});

test('q090 both surface routes assemble and really escort the visitors without changing underground power',()=>{
 for(const legacy of [false,true])for(const inspected of [false,true]){const g=q090Engine({legacy});for(const id of inspected?['battery','trip']:['surface'])chooseQ090(g,id);assert.equal(story(g).scene,'assemble');assert.equal(values(g).maoAt,'entry');assert.equal(values(g).visitorsAt,'entry');noPowerChange(values(g));departQ090(g,'escort');for(const id of ['mao','visitors'])assert.equal(values(g)[id+'At'],'transit');assert.equal(values(g).maintenanceAt,'entry');arriveQ090(g);noPowerChange(values(g));assert.equal(values(g).finished,false);for(const id of ['mao','visitors'])assert.equal(values(g)[id+'At'],'surface');chooseQ090(g,'finish');noPowerChange(values(g));assert.equal(g.state.quests.q090.outcome,'compromise');}
});

test('q090 full-power battle cannot open the lid or finish before victory and still forbids escape',()=>{
 for(const legacy of [false,true]){let g=q090Engine({legacy});chooseQ090(g,'full',{combat:'pending'});assert.ok(g.state.battle);noPowerChange(values(g));assert.equal(values(g).finished,false);assert.equal(g.dispatch({type:'battle',action:'escape'}),false);g=loadQ090(g.save());resolveQ090(g,'win');assert.equal(g.state.quests.q090.outcome,'contract');assert.equal(values(g).lidOpen,true);assert.equal(values(g).fullPower,true);assert.equal(values(g).backup,false);assert.equal(values(g).restored,false);assert.equal(values(g).visitorsAt,'entry');}
});

test('q090 a saved battle loss retains unopened controls and permits retry or surface observation',()=>{
 for(const legacy of [false,true])for(const retry of [false,true]){let g=q090Engine({legacy});chooseQ090(g,'full',{combat:'pending'});g=loadQ090(g.save());resolveQ090(g,'lose');assert.equal(g.state.mode,'town');assert.equal(g.state.quests.q090.stage,'active');noPowerChange(values(g));g=loadQ090(g.save());returnQ090AfterLoss(g);assert.deepEqual(cast(g),['q090_mao']);for(const id of retry?['full']:['surface','escort','finish'])chooseQ090(g,id);assert.equal(g.state.quests.q090.outcome,retry?'contract':'compromise');}
});

test('q090 every journey preserves existing power and escort state through retreat and defeat',()=>{
 const seen=new Set();for(const legacy of [false,true])for(const route of q090Routes.filter(r=>r.outcome!=='contract')){const g=q090Engine({legacy});for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.journey){const key=legacy+'/'+g.state.journey.action;if(!seen.has(key)){seen.add(key);const raw=g.save();for(const interruption of ['mark','defeat']){const h=loadQ090(raw);if(h.state.mode==='town')go(h,{kind:'dungeon',dungeon:'region_9',map:'region_9_f1',x:1,y:1});const s=structuredClone(story(h)),j=structuredClone(h.state.journey);assert.ok(j);if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);const resumed=loadQ090(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q090'}),false);arriveQ090(resumed);assert.deepEqual(cast(resumed),q090Cast(story(resumed).scene));assert.equal(values(resumed).maintenanceAt,'entry');for(const flag of ['lidOpen','backup','exhausted','restored','fullPower','finished'])assert.equal(values(resumed)[flag],s.values[flag]);for(const entity of j.companions??g.data.quests.q090.story.actions[j.action].journey.companions)assert.notEqual(values(resumed)[entity+'At'],'transit');}}arriveQ090(g);}}}assert.equal(seen.size,14);
});

test('q090 current, previous and accepted generations keep all five routes and each reward occurs once',()=>{
 const oldScenes=new Set();for(const generation of ['current','previous','accepted'])for(const route of q090Routes){const accepted=generation==='accepted',g=loadQ090(accepted?q090AcceptedEngine().save():q090Engine({legacy:generation==='previous'}).save()),reward=data.quests.q090.outcomes[route.outcome],gold=g.state.gold;let awards=0,total=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{total+=gp;if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};for(const id of accepted?route.accepted:route.path){assert.equal(awards,0);if(accepted){oldScenes.add(q090LegacyScene(g));assert.ok(g.dispatch({type:'choose',id}));loadQ090(g.save());drain(g);if(g.state.battle){loadQ090(g.save());resolveQ090(g,'win');}assert.equal(story(g),undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}else chooseQ090(g,id);}assert.equal(awards,1);assert.equal(g.state.gold,gold+total);assert.equal(g.state.quests.q090.outcome,route.outcome);const raw=g.save();assert.throws(()=>g.complete('q090',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q090'),false);g.run(data.quests.q090.model.entryScript);drain(g);assert.equal(awards,1);loadQ090(g.save());}assert.deepEqual([...oldScenes].sort(),['entry','open','schedule']);
});

test('q090 malformed current and previous saves reject atomically without changing escort or power state',()=>{
 const g=q090Engine(),before=g.save();for(const raw of [before,q090Engine({legacy:true}).save()])for(const mutate of [s=>s.stories.q090.values.maoAt='unknown',s=>s.stories.q090.values.maintenanceAt='maintenance',s=>s.stories.q090.values.lidOpen=1,s=>delete s.stories.q090.values.backup,s=>s.stories.q090.revision=2,s=>s.stories.q090.events.push('unknown'),s=>(s.flags.legacyStoryRoutes??={}).q090=true]){const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
});

test('q090 browser fixtures cover ten scenes, restricted maintenance, recovery and the original waiting text',async()=>{
 const {fixtures,outcomes}=await skyReturnArtFixtures();assert.equal(fixtures.length,35);assert.equal(outcomes.length,4);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const gen of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(gen));assert.equal(new Set(rows.map(f=>f.scene)).size,10);assert.equal(rows.filter(f=>f.variant.includes('rescued')).length,5);assert.equal(rows.filter(f=>f.variant.includes('battle-defeat')).length,1);}
 for(const f of fixtures){const d=projectGame(loadQ090(f.save)).dialog;assert.equal(d.text,f.expectedText);if(f.absentStoryScene){assert.equal(d.scene,undefined);assert.deepEqual(f.cast,[]);}else{assert.deepEqual(d.scene.cast.map(c=>c.id),q090Cast(f.scene));assert.deepEqual(f.textOnlyCast,f.cast);assert.equal(f.cast.includes('q090_maintenance'),f.scene==='overrun');}}
 for(const scene of ['reserve','close','overrun']){const f=fixtures.find(f=>f.scene===scene&&f.variant.startsWith('previous'));assert.equal(f.expectedText,previousQ090.model.graph.find(n=>n.id===scene).text);assert.notEqual(f.expectedText,data.quests.q090.model.graph.find(n=>n.id===scene).text);}assert.equal(fixtures.filter(f=>f.absentStoryScene).length,3);
});
