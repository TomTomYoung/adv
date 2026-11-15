import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain} from './machine-helpers.mjs';
import {previousQ078,q078Routes,q078Cast,q078LegacyScene,q078Engine,q078AcceptedEngine,loadQ078,chooseQ078,departQ078,arriveQ078,partsMemoryArtFixtures} from '../tools/parts-memory-art-fixtures.mjs';
const story=g=>g.state.stories.q078,values=g=>story(g).values;
const visible=g=>projectGame(g).dialog?.scene?.cast.map(c=>c.id);

test('q078 changes only existing actor reference, five casts and the deposit timing sentence',()=>{
 const q=structuredClone(data.quests.q078);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);
 assert.deepEqual(q.story.registry,previousQ078.story.registry);assert.deepEqual(q.story.actions,previousQ078.story.actions);
 assert.deepEqual(q.outcomes,previousQ078.outcomes);assert.equal(q.story.entities.userPerson.character,'q078_user');delete q.story.entities.userPerson.character;
 for(const key of ['portrait','sprite'])assert.equal(data.characters.q078_user[key],undefined);
 for(const s of Object.values(q.story.scenes)){assert.deepEqual(s.cast,[{entity:'userPerson',display:{x:50}}]);s.cast=[];}
 const n=q.model.graph.find(n=>n.id==='saved'),now=n.text,old=previousQ078.model.graph.find(n=>n.id==='saved').text;assert.notEqual(now,old);n.text=old;let count=0;
 const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);
 assert.deepEqual(q,previousQ078);
});

test('q078 all nine state-conditioned paths are enumerated in current and accepted engines',()=>{
 for(const accepted of [false,true]){
  const g=accepted?loadQ078(q078AcceptedEngine().save()):q078Engine(),paths=[];
  const visit=(raw,path)=>{assert.ok(path.length<=8,'training choices must become unavailable');g.load(raw);if(g.state.quests.q078.stage==='completed'){paths.push({path,outcome:g.state.quests.q078.outcome});return;}
   const options=projectGame(g).dialog.options.filter(o=>o.enabled);assert.ok(options.length);
   for(const o of options){g.load(raw);if(accepted){assert.ok(g.dispatch({type:'choose',id:o.id}));drain(g);}else chooseQ078(g,o.id);assert.equal(g.state.battle,null);visit(g.save(),[...path,o.id]);}
  };visit(g.save(),[]);
  assert.equal(paths.length,9);assert.deepEqual(paths.map(JSON.stringify).sort(),q078Routes.map(r=>JSON.stringify({path:accepted?r.accepted:r.path,outcome:r.outcome})).sort());
 }
});

test('q078 all five scenes, four journeys and ten actions survive every old/current save phase',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),h=loadQ078(raw);assert.equal(g.save(),raw);const before=projectGame(g).dialog,after=projectGame(h).dialog;assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  assert.equal(h.state.battle,null);if(story(h).scene)scenes.add(story(h).scene);phases.add(h.state.journey?'journey':h.state.quests.q078.stage==='completed'?'completed':h.state.waiting?.type);
  if(after?.scene){assert.deepEqual(visible(h),q078Cast());assert.equal(values(h).userPersonAt,values(h).partyAt);}
  assert.equal(values(h).armAt,'userPerson');if(h.state.journey){journeys.add(h.state.journey.action);assert.equal(story(h).scene,null);assert.equal(after?.scene,undefined);assert.equal(values(h).userPersonAt,'transit');assert.equal(h.dispatch({type:'story.resume',quest:'q078'}),false);arriveQ078(h);}
 };
 for(const legacy of [false,true])for(const route of q078Routes){const g=q078Engine({legacy});observe(g);for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q078.story.actions[g.state.journey.action];go(g,g.data.quests.q078.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q078.outcome,route.outcome);}
 assert.equal(scenes.size,5);assert.equal(journeys.size,4);assert.equal(actions.size,10);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q078.story.actions).sort());for(const p of ['text','choice','journey','completed'])assert.ok(phases.has(p),p);
});

test('q078 original layout departs with the party and the prosthesis stays with its actual user',()=>{
 for(const legacy of [false,true]){let g=q078Engine({legacy});assert.equal(values(g).oldLayoutAt,'entry');assert.equal(values(g).armAt,'userPerson');
  departQ078(g,'train');assert.equal(values(g).oldLayoutAt,'party');assert.equal(values(g).userPersonAt,'transit');assert.equal(values(g).armAt,'userPerson');assert.equal(values(g).hammer,false);assert.equal(values(g).needle,false);
  g=loadQ078(g.save());arriveQ078(g);assert.equal(values(g).userPersonAt,'hammer_place');assert.equal(values(g).oldLayoutAt,'party');assert.deepEqual(visible(g),['q078_user']);
 }
});

test('q078 hammer and needle learning commit independently on return, not trial entry',()=>{
 for(const legacy of [false,true])for(const order of [['hammer','needle'],['needle','hammer']]){
  let g=q078Engine({legacy});chooseQ078(g,'train');const completed=new Set();
  for(const skill of order){chooseQ078(g,skill);assert.equal(values(g)[skill],false);assert.equal(values(g)[skill==='hammer'?'needle':'hammer'],completed.size>0);
   if(skill==='needle'){departQ078(g,'return');assert.equal(values(g).needle,false);g=loadQ078(g.save());arriveQ078(g);}else{assert.equal(g.state.journey,null);chooseQ078(g,'return');}
   assert.equal(values(g)[skill],true);assert.equal(values(g).userPersonAt,'hammer_place');assert.equal(values(g).oldLayoutAt,'party');assert.equal(values(g).saved,false);completed.add(skill);
  }
 }
});

test('q078 rejects premature save and repeated learned work while retaining manual choice',()=>{
 for(const legacy of [false,true])for(const order of [['hammer','needle'],['needle','hammer']]){
  const g=loadQ078(q078Engine({legacy}).save());chooseQ078(g,'train');const done=[];
  for(let i=0;i<=2;i++){
   const options=projectGame(g).dialog.options;assert.equal(options.find(o=>o.id==='save').enabled,i===2);assert.equal(options.find(o=>o.id==='manual').enabled,true);
   for(const id of [...(i<2?['save']:[]),...done]){const raw=g.save();assert.equal(g.dispatch({type:'choose',id}),false);assert.equal(g.save(),raw);}
   if(i<2){chooseQ078(g,order[i]);chooseQ078(g,'return');done.push(order[i]);}
  }
 }
});

test('q078 both learned orders keep original layout in custody until deposit finish and preserve party capabilities',()=>{
 for(const legacy of [false,true])for(const route of q078Routes.filter(r=>r.outcome==='informed')){
  let g=q078Engine({legacy});for(const id of route.path.slice(0,-2))chooseQ078(g,id);const actors=structuredClone(g.state.actors);
  departQ078(g,'save');assert.equal(values(g).oldLayoutAt,'party');assert.equal(values(g).saved,false);assert.equal(values(g).userPersonAt,'transit');
  g=loadQ078(g.save());arriveQ078(g);assert.equal(story(g).scene,'saved');assert.equal(values(g).oldLayoutAt,'party');assert.equal(values(g).saved,false);assert.equal(values(g).finished,false);assert.equal(values(g).userPersonAt,'record');assert.deepEqual(g.state.actors,actors);
  chooseQ078(g,'finish');assert.equal(values(g).oldLayoutAt,'record');assert.equal(values(g).saved,true);assert.equal(values(g).armAt,'userPerson');assert.equal(g.state.quests.q078.outcome,'informed');
 }
});

test('q078 manual exits preserve learned flags and layout custody; erase remains non-combat',()=>{
 for(const legacy of [false,true])for(const route of q078Routes.filter(r=>r.outcome!=='informed')){
  const g=loadQ078(q078Engine({legacy}).save());for(const id of route.path)chooseQ078(g,id);
  assert.equal(values(g).hammer,route.path.includes('hammer'));assert.equal(values(g).needle,route.path.includes('needle'));assert.equal(values(g).saved,false);
  assert.equal(values(g).oldLayoutAt,route.path.includes('train')?'party':'entry');assert.equal(values(g).armAt,'userPerson');assert.equal(g.state.battle,null);assert.equal(g.state.quests.q078.outcome,route.outcome);
 }
});

test('q078 all pending journeys retain the escorted user, learned flags and original layout through retreat/defeat',()=>{
 const seen=new Set();for(const legacy of [false,true])for(const route of q078Routes){const g=q078Engine({legacy});for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);
  if(g.state.journey){const key=legacy+'/'+g.state.journey.action;if(!seen.has(key)){seen.add(key);const raw=g.save();for(const interruption of ['mark','defeat']){
   const h=loadQ078(raw);if(h.state.mode==='town')go(h,{kind:'dungeon',dungeon:'region_8',map:'region_8_f1',x:1,y:1});assert.ok(h.state.journey);
   const s=structuredClone(story(h)),j=structuredClone(h.state.journey);assert.equal(values(h).userPersonAt,'transit');assert.equal(values(h).oldLayoutAt,'party');
   if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);
   const resumed=loadQ078(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q078'}),false);arriveQ078(resumed);assert.equal(values(resumed).userPersonAt,values(resumed).partyAt);assert.equal(values(resumed).finished,false);assert.equal(values(resumed).oldLayoutAt,'party');assert.equal(values(resumed).armAt,'userPerson');
  }}arriveQ078(g);}
 }}assert.equal(seen.size,8);
});

test('q078 all new and accepted old outcomes award exactly once with unchanged accepted scenes',()=>{
 const acceptedScenes=new Set();for(const generation of ['current','previous','accepted'])for(const route of q078Routes){const g=loadQ078(generation==='accepted'?q078AcceptedEngine().save():q078Engine({legacy:generation==='previous'}).save()),reward=data.quests.q078.outcomes[route.outcome],gold=g.state.gold;let awards=0,total=0;const award=g.award.bind(g);
  g.award=(gp,xp,who)=>{total+=gp;if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of generation==='accepted'?route.accepted:route.path){assert.equal(awards,0);if(generation==='accepted'){acceptedScenes.add(q078LegacyScene(g));loadQ078(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ078(g.save());drain(g);assert.equal(g.state.stories.q078,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}else chooseQ078(g,id);assert.equal(g.state.battle,null);}
  assert.equal(g.state.quests.q078.outcome,route.outcome);assert.equal(awards,1);assert.equal(g.state.gold,gold+total);const raw=g.save();assert.throws(()=>g.complete('q078',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q078'),false);g.run(data.quests.q078.model.entryScript);drain(g);assert.equal(awards,1);loadQ078(g.save());
 }assert.deepEqual([...acceptedScenes].sort(),['bench','entry']);
});

test('q078 malformed old/current saves reject atomically without accepting fictitious actor locations or flags',()=>{
 const g=q078Engine(),before=g.save();for(const raw of [before,q078Engine({legacy:true}).save()])for(const mutate of [s=>s.stories.q078.values.userPersonAt='clinic',s=>s.stories.q078.values.oldLayoutAt='unknown',s=>s.stories.q078.values.hammer=1,s=>delete s.stories.q078.values.needle,s=>s.stories.q078.revision=2,s=>s.stories.q078.events.push('invented'),s=>(s.flags.legacyStoryRoutes??={}).q078=true]){
  const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
 }
});

test('q078 27 browser checkpoints distinguish all learning states, old text, accepted states and rescued escort',async()=>{
 const {fixtures,outcomes}=await partsMemoryArtFixtures();assert.equal(fixtures.length,27);assert.equal(outcomes.length,3);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,27);
 for(const generation of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(generation));assert.equal(new Set(rows.map(f=>f.scene)).size,5);assert.equal(rows.filter(f=>f.scene==='bench'&&f.variant!==generation+'-rescued').length,4);assert.ok(rows.some(f=>f.variant===generation+'-rescued'));}
 const old=fixtures.find(f=>f.scene==='saved'&&f.variant.startsWith('previous'));assert.equal(old.expectedText,previousQ078.model.graph.find(n=>n.id==='saved').text);assert.notEqual(old.expectedText,data.quests.q078.model.graph.find(n=>n.id==='saved').text);assert.equal(projectGame(loadQ078(old.save)).dialog.text,old.expectedText);
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,5);
});
