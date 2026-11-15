import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain} from './machine-helpers.mjs';
import {previousQ076,q076Routes,acceptedQ076Routes,q076LegacyScene,q076Engine,q076AcceptedEngine,loadQ076,chooseQ076,departQ076,arriveQ076,ironLullabyArtFixtures} from '../tools/iron-lullaby-art-fixtures.mjs';
const story=g=>g.state.stories.q076,values=g=>story(g).values;

test('q076 changes only three timing sentences and retains empty casts and the entire original state definition',()=>{
 const q=structuredClone(data.quests.q076);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);
 assert.deepEqual(q.story,previousQ076.story);assert.deepEqual(q.outcomes,previousQ076.outcomes);
 assert.ok(Object.values(q.story.scenes).every(s=>s.cast.length===0));assert.ok(Object.values(q.story.entities).every(e=>e.kind!=='person'&&!e.character));
 for(const a of Object.values(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,[]);
 for(const id of ['fetch','stopped','recorded']){
  const n=q.model.graph.find(n=>n.id===id),now=n.text,old=previousQ076.model.graph.find(n=>n.id===id).text;assert.notEqual(now,old);n.text=old;let count=0;
  const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);
 }
 assert.deepEqual(q,previousQ076);
});

test('q076 state-aware enumeration yields exactly six possible current paths despite the apparent graph loop',()=>{
 const results=[],queue=[{g:q076Engine(),path:[]}];
 for(let i=0;i<queue.length;i++){
  const {g,path}=queue[i];assert.ok(path.length<9);
  if(g.state.quests.q076.stage==='completed'){results.push({path,outcome:g.state.quests.q076.outcome});continue;}
  const options=projectGame(g).dialog.options.filter(o=>o.enabled);assert.ok(options.length);
  for(const o of options){const h=loadQ076(g.save());chooseQ076(h,o.id);queue.push({g:h,path:[...path,o.id]});}
 }
 assert.deepEqual(results.map(JSON.stringify).sort(),q076Routes.map(JSON.stringify).sort());assert.equal(results.length,6);
});

test('q076 all six scenes, seven journeys and ten actions resume in text, choice, travel and completion phases',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),now=loadQ076(raw);assert.equal(g.save(),raw);const before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  assert.equal(g.state.battle,null);phases.add(g.state.journey?'journey':g.state.quests.q076.stage==='completed'?'completed':g.state.waiting?.type);
  if(story(g).scene)scenes.add(story(g).scene);if(after?.scene)assert.deepEqual(after.scene.cast,[]);
  if(g.state.journey){journeys.add(g.state.journey.action);assert.equal(story(g).scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q076'}),false);arriveQ076(now);}
 };
 for(const legacy of [false,true])for(const route of q076Routes){const g=q076Engine({legacy});observe(g);for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q076.story.actions[g.state.journey.action];go(g,g.data.quests.q076.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q076.outcome,route.outcome);}
 assert.equal(scenes.size,6);assert.equal(journeys.size,7);assert.equal(actions.size,10);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q076.story.actions).sort());for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
});

test('q076 both medicine approaches carry at departure, protect at actual receipt and stop only on finish',()=>{
 for(const legacy of [false,true])for(const controlFirst of [false,true]){
  let g=q076Engine({legacy});assert.equal(values(g).medicineBoxAt,'entry');
  if(controlFirst){chooseQ076(g,'line');chooseQ076(g,'move');assert.equal(story(g).scene,'fetch');assert.equal(values(g).medicineBoxAt,'entry');assert.equal(values(g).protected,false);}
  departQ076(g,controlFirst?'carry':'medicine');assert.equal(values(g).medicineBoxAt,'party');assert.equal(values(g).protected,false);assert.equal(values(g).stopped,false);g=loadQ076(g.save());arriveQ076(g);
  assert.equal(values(g).medicineBoxAt,'fridge');assert.equal(values(g).protected,true);assert.equal(values(g).stopped,false);
  departQ076(g,'stop');assert.equal(values(g).stopped,false);arriveQ076(g);g=loadQ076(g.save());assert.equal(values(g).stopped,false);assert.equal(values(g).finished,false);
  chooseQ076(g,'finish');assert.equal(values(g).stopped,true);assert.equal(values(g).medicineLost,false);assert.equal(values(g).medicineBoxAt,'fridge');assert.equal(values(g).recorded,false);
 }
});

test('q076 protected medicine cannot be fetched again and rejecting the option is atomic',()=>{
 for(const legacy of [false,true]){
  let g=q076Engine({legacy});chooseQ076(g,'line');assert.equal(projectGame(g).dialog.options.find(o=>o.id==='move').enabled,true);
  chooseQ076(g,'move');chooseQ076(g,'carry');chooseQ076(g,'keep');g=loadQ076(g.save());assert.equal(values(g).protected,true);
  assert.equal(projectGame(g).dialog.options.find(o=>o.id==='move').enabled,false);const before=g.save();assert.equal(g.dispatch({type:'choose',id:'move'}),false);assert.equal(g.save(),before);
  assert.equal(projectGame(g).dialog.options.find(o=>o.id==='rewire').enabled,true);chooseQ076(g,'rewire');chooseQ076(g,'finish');assert.equal(values(g).medicineBoxAt,'fridge');
 }
});

test('q076 circuit separation, physical medicine storage and recording deposit are independent facts',()=>{
 for(const legacy of [false,true])for(const moveFirst of [false,true]){
  let g=q076Engine({legacy});for(const id of moveFirst?['medicine','keep']:['line'])chooseQ076(g,id);
  assert.equal(values(g).songRecordAt,'control_place');assert.equal(values(g).separateCircuit,false);
  departQ076(g,'rewire');assert.equal(values(g).separateCircuit,true);assert.equal(values(g).songRecordAt,'party');assert.equal(values(g).recorded,false);assert.equal(values(g).protected,moveFirst);
  g=loadQ076(g.save());arriveQ076(g);assert.equal(values(g).songRecordAt,'party');assert.equal(values(g).recorded,false);assert.equal(values(g).finished,false);assert.equal(values(g).medicineBoxAt,moveFirst?'fridge':'entry');
  chooseQ076(g,'finish');assert.equal(values(g).songRecordAt,'record');assert.equal(values(g).recorded,true);assert.equal(values(g).protected,true);assert.equal(values(g).medicineLost,false);assert.equal(values(g).medicineBoxAt,moveFirst?'fridge':'entry');
 }
});

test('q076 immediate power-off is the existing non-combat loss ending, not an invented boss fight',()=>{
 for(const legacy of [false,true]){const g=q076Engine({legacy});chooseQ076(g,'off');assert.equal(g.state.battle,null);assert.equal(g.state.quests.q076.outcome,'contract');assert.equal(values(g).stopped,true);assert.equal(values(g).medicineLost,true);assert.equal(values(g).protected,false);assert.equal(values(g).medicineBoxAt,'entry');assert.equal(values(g).songRecordAt,'control_place');loadQ076(g.save());}
});

test('q076 every journey retains medicines, recordings and phase flags through retreat and defeat',()=>{
 const seen=new Set();for(const legacy of [false,true])for(const route of q076Routes){
  const g=q076Engine({legacy});for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.journey){const key=legacy+'/'+g.state.journey.action;if(!seen.has(key)){seen.add(key);const raw=g.save();for(const interruption of ['mark','defeat']){const h=loadQ076(raw);if(h.state.mode==='town')go(h,{kind:'dungeon',dungeon:'region_8',map:'region_8_f1',x:1,y:1});assert.ok(h.state.journey);const s=structuredClone(story(h)),j=structuredClone(h.state.journey);if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);const resumed=loadQ076(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q076'}),false);arriveQ076(resumed);assert.equal(values(resumed).finished,false);}}arriveQ076(g);}}
 }assert.equal(seen.size,14);
});

test('q076 all six current and previous-start paths award each outcome exactly once',()=>{
 for(const legacy of [false,true])for(const route of q076Routes){const g=loadQ076(q076Engine({legacy}).save()),gold=g.state.gold,reward=data.quests.q076.outcomes[route.outcome];let awards=0,total=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{total+=gp;if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};for(const id of route.path){assert.equal(awards,0);chooseQ076(g,id);}assert.equal(awards,1);assert.equal(g.state.gold,gold+total);assert.equal(g.state.quests.q076.outcome,route.outcome);const raw=g.save();assert.throws(()=>g.complete('q076',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q076'),false);g.run(data.quests.q076.model.entryScript);drain(g);assert.equal(awards,1);loadQ076(g.save());}
});

test('q076 accepted old routes preserve three scenes and twelve bounded paths, including repeat moves',()=>{
 const routes=acceptedQ076Routes();assert.equal(routes.length,12);const scenes=new Set();for(const route of routes){const g=loadQ076(q076AcceptedEngine().save()),reward=data.quests.q076.outcomes[route.outcome];let awards=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};for(const id of route.path){scenes.add(q076LegacyScene(g));loadQ076(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ076(g.save());drain(g);assert.equal(g.state.battle,null);assert.equal(g.state.stories.q076,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}assert.equal(g.state.quests.q076.outcome,route.outcome);assert.equal(awards,1);loadQ076(g.save());}assert.deepEqual([...scenes].sort(),['control','entry','moved']);
});

test('q076 malformed old and current saves reject atomically without changing the loaded save',()=>{
 const g=q076Engine(),before=g.save();for(const raw of [before,q076Engine({legacy:true}).save()])for(const mutate of [s=>s.stories.q076.values.medicineBoxAt='nowhere',s=>s.stories.q076.values.songRecordAt='nobody',s=>s.stories.q076.values.protected=1,s=>delete s.stories.q076.values.medicineLost,s=>s.stories.q076.revision=2,s=>s.stories.q076.events.push('unwritten'),s=>(s.flags.legacyStoryRoutes??={}).q076=true]){const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
});

test('q076 browser fixtures cover all empty scenes, protected choice gating, rescue, old text and accepted saves',async()=>{
 const {fixtures,outcomes}=await ironLullabyArtFixtures();assert.equal(fixtures.length,21);assert.equal(outcomes.length,3);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);assert.ok(fixtures.every(f=>f.cast.length===0));
 for(const gen of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(gen));assert.equal(new Set(rows.map(f=>f.scene)).size,6);assert.ok(rows.some(f=>f.scene==='control'&&f.blockedChoice==='move'));assert.ok(rows.some(f=>f.variant===gen+'-rescued'));}
 for(const scene of ['fetch','stopped','recorded']){const f=fixtures.find(f=>f.scene===scene&&f.variant.startsWith('previous'));assert.ok(f);assert.equal(projectGame(loadQ076(f.save)).dialog.text,f.expectedText);assert.equal(f.expectedText,previousQ076.model.graph.find(n=>n.id===scene).text);assert.notEqual(f.expectedText,data.quests.q076.model.graph.find(n=>n.id===scene).text);}
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,3);
});
