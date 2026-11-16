import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,go,drain,choose} from './machine-helpers.mjs';
import {previousQ080,q080Roles,q080Routes,q080Cast,q080LegacyScene,q080Engine,q080AcceptedEngine,q080Ready,loadQ080,chooseQ080,departQ080,arriveQ080,resolveQ080,returnQ080AfterLoss,ironInheritanceArtFixtures} from '../tools/iron-inheritance-art-fixtures.mjs';
const story=g=>g.state.stories.q080,values=g=>story(g).values;
const fixed=g=>{for(const k of q080Roles)assert.equal(values(g)[k+'PersonAt'],k+'_place');};

test('q080 adds only three fixed approval roles, migration, three casts and four timing texts',()=>{
 const q=structuredClone(data.quests.q080);assert.equal(q.story.revision,2);assert.equal(q.model.edition.revision,2);
 assert.deepEqual(q.model.storyUpgrades,[{fromRevision:1,toRevision:2,previous:previousQ080.story,values:q080Roles.map(k=>({key:k+'PersonAt',value:k+'_place'}))}]);
 for(const k of q080Roles){assert.deepEqual(q.story.entities[k+'Person'],{holder:k+'PersonAt',kind:'person',character:'q080_'+k});assert.equal(q.story.registry[k+'PersonAt'].initial,k+'_place');assert.deepEqual(q.story.registry[k+'PersonAt'].values,[k+'_place']);for(const field of ['portrait','sprite'])assert.equal(data.characters['q080_'+k][field],undefined);delete q.story.entities[k+'Person'];delete q.story.registry[k+'PersonAt'];}
 assert.deepEqual(q.story.registry,previousQ080.story.registry);assert.deepEqual(q.story.actions,previousQ080.story.actions);
 for(const a of Object.values(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,[]);
 for(const [id,s] of Object.entries(q.story.scenes)){const key=q080Roles.find(k=>id===k+'_signed');assert.deepEqual(s.cast.map(c=>c.entity),key?[key+'Person']:[]);s.cast=[];}
 for(const id of [...q080Roles.map(k=>k+'_signed'),'restored']){
  const n=q.model.graph.find(n=>n.id===id),now=n.text,old=previousQ080.model.graph.find(n=>n.id===id).text;assert.notEqual(now,old);n.text=old;let count=0;
  const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);
 }delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ080);
});

test('q080 requires three completed machinery quests, without inventing target progress',()=>{
 const g=ready();go(g,{kind:'town',location:'salome_board'});
 for(const [i,[id,key]] of [['q076','off'],['q077','scrape'],['q078','manual']].entries()){
  assert.equal(g.state.vars.region_8??0,i);assert.equal(g.accept('q080'),false);assert.equal(g.state.quests.q080.stage,'available');assert.equal(story(g),undefined);
  start(g,id);choose(g,id,key);assert.equal(g.state.quests[id].stage,'completed');go(g,{kind:'town',location:'salome_board'});
 }
 assert.equal(g.state.vars.region_8,3);assert.ok(g.accept('q080'));assert.equal(g.state.quests.q080.stage,'active');loadQ080(q080Engine().save());
});

test('q080 all 24 paths independently match state-conditioned current and accepted engine choices',()=>{
 for(const accepted of [false,true]){
  const root=accepted?loadQ080(q080AcceptedEngine().save()):q080Engine(),queue=[{raw:root.save(),path:[]}],found=[];let visited=0;
  while(queue.length){const {raw,path}=queue.shift(),g=loadQ080(raw);assert.ok(++visited<400,'bounded choice tree');
   if(g.state.quests.q080.stage==='completed'){found.push({path,outcome:g.state.quests.q080.outcome});continue;}
   for(const option of projectGame(g).dialog.options.filter(o=>o.enabled)){
    const h=loadQ080(raw);if(accepted){assert.ok(h.dispatch({type:'choose',id:option.id}));drain(h);if(h.state.battle)resolveQ080(h,'win');}else chooseQ080(h,option.id);
    queue.push({raw:h.save(),path:[...path,option.id]});
   }
  }
  assert.equal(found.length,24);assert.deepEqual(found.map(JSON.stringify).sort(),q080Routes.map(r=>JSON.stringify({path:accepted?r.accepted:r.path,outcome:r.outcome})).sort());
 }
 assert.equal(q080Routes.filter(r=>r.outcome==='informed').length,6);assert.equal(q080Routes.filter(r=>r.outcome==='compromise').length,17);
});

test('q080 all seven scenes, eight journeys and thirteen actions resume in every current and previous save phase',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),h=loadQ080(raw);assert.equal(g.save(),raw);const a=projectGame(g).dialog,b=projectGame(h).dialog;assert.equal(b?.text,a?.text);assert.deepEqual(b?.options,a?.options);fixed(h);
  phases.add(h.state.battle?'battle':h.state.journey?'journey':h.state.quests.q080.stage==='completed'?'completed':h.state.waiting?.type);if(story(h).scene)scenes.add(story(h).scene);
  if(b?.scene)assert.deepEqual(b.scene.cast.map(c=>c.id),q080Cast(story(h).scene));
  if(h.state.journey){journeys.add(h.state.journey.action);assert.equal(story(h).scene,null);assert.equal(b?.scene,undefined);assert.equal(h.dispatch({type:'story.resume',quest:'q080'}),false);arriveQ080(h);fixed(h);}
 };
 for(const legacy of [false,true])for(const route of q080Routes){const g=q080Engine({legacy});observe(g);for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.battle){resolveQ080(g,'win');observe(g);}if(g.state.journey){const a=g.data.quests.q080.story.actions[g.state.journey.action];go(g,g.data.quests.q080.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q080.outcome,route.outcome);}
 assert.equal(scenes.size,7);assert.equal(journeys.size,8);assert.equal(actions.size,13);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q080.story.actions).sort());for(const p of ['text','choice','journey','battle','completed'])assert.ok(phases.has(p),p);
});

test('q080 each signature commits on departure from its desk, independently of the other two approvals',()=>{
 for(const legacy of [false,true])for(const route of q080Routes.filter(r=>r.outcome==='informed')){
  let g=q080Engine({legacy});chooseQ080(g,'council');const signed=new Set();
  for(const k of route.signatures){departQ080(g,k);assert.equal(values(g)[k],false);g=loadQ080(g.save());arriveQ080(g);fixed(g);
   assert.equal(story(g).scene,k+'_signed');assert.equal(values(g)[k],false);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q080_'+k]);
   for(const other of q080Roles)assert.equal(values(g)[other],signed.has(other));
   departQ080(g,'return');signed.add(k);for(const other of q080Roles)assert.equal(values(g)[other],signed.has(other));assert.equal(values(g).singleKeyAt,'entry');
   g=loadQ080(g.save());arriveQ080(g);fixed(g);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  }
 }
});

test('q080 missing signatures block restore, signed desks reject repetition, and every partial set may defer',()=>{
 for(const legacy of [false,true])for(const route of q080Routes.filter(r=>r.path.at(-1)==='defer')){
  const g=q080Engine({legacy});for(const id of route.path.slice(0,-1))chooseQ080(g,id);
  for(const k of route.signatures){const s=structuredClone(story(g));assert.equal(g.dispatch({type:'choose',id:k}),false);assert.deepEqual(story(g),s);}
  if(route.signatures.length<3){const s=structuredClone(story(g));assert.equal(g.dispatch({type:'choose',id:'restore'}),false);assert.deepEqual(story(g),s);}
  const before=structuredClone(values(g));chooseQ080(g,'defer');for(const k of q080Roles)assert.equal(values(g)[k],before[k]);assert.equal(values(g).singleKeyAt,'entry');assert.equal(values(g).singleKeyDestroyed,false);assert.equal(values(g).sharedControl,false);assert.equal(values(g).singleControl,false);
 }
});

test('q080 key transport, destruction, central return and joint control remain distinct commits in all six signature orders',()=>{
 for(const legacy of [false,true])for(const route of q080Routes.filter(r=>r.outcome==='informed')){
  let g=q080Engine({legacy});for(const id of route.path.slice(0,-3))chooseQ080(g,id);
  departQ080(g,'restore');assert.equal(values(g).singleKeyAt,'party');assert.equal(values(g).singleKeyDestroyed,false);assert.equal(values(g).sharedControl,false);g=loadQ080(g.save());arriveQ080(g);fixed(g);
  assert.equal(story(g).scene,'destroy');assert.equal(values(g).singleKeyAt,'party');assert.equal(values(g).singleKeyDestroyed,false);
  departQ080(g,'return');assert.equal(values(g).singleKeyAt,'destroy');assert.equal(values(g).singleKeyDestroyed,true);assert.equal(values(g).sharedControl,false);g=loadQ080(g.save());arriveQ080(g);fixed(g);
  assert.equal(story(g).scene,'restored');assert.equal(values(g).sharedControl,false);assert.equal(values(g).finished,false);chooseQ080(g,'finish');assert.equal(values(g).sharedControl,true);assert.equal(values(g).singleControl,false);assert.equal(values(g).singleKeyAt,'destroy');
 }
});

test('q080 non-escapable central battle grants no key before victory and permits retry or council after defeat',()=>{
 for(const legacy of [false,true])for(const retry of [false,true]){
  const old=q080Engine({legacy});chooseQ080(old,'rule',{combat:'pending'});const g=loadQ080(old.save());assert.equal(g.state.battle.encounter,'boss_8');assert.equal(g.data.encounters.boss_8.escape,false);
  const s=structuredClone(story(g));assert.equal(g.dispatch({type:'battle',action:'escape'}),false);assert.deepEqual(story(g),s);assert.equal(values(g).singleKeyAt,'entry');assert.equal(values(g).singleControl,false);
  resolveQ080(g,'lose');assert.equal(g.state.mode,'town');assert.equal(g.state.quests.q080.stage,'active');assert.equal(values(g).resolution,'pending');assert.equal(values(g).singleKeyAt,'entry');loadQ080(g.save());returnQ080AfterLoss(g);
  for(const id of retry?['rule']:q080Routes.find(r=>r.outcome==='informed').path)chooseQ080(g,id);assert.equal(g.state.quests.q080.outcome,retry?'contract':'informed');assert.equal(values(g).singleControl,retry);assert.equal(values(g).singleKeyAt,retry?'party':'destroy');
 }
});

test('q080 every journey keeps existing signatures, key custody and fixed representatives through retreat and defeat',()=>{
 const seen=new Set();for(const legacy of [false,true])for(const route of q080Routes.filter(r=>r.outcome==='informed')){
  const g=q080Engine({legacy});for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.journey){const key=legacy+'/'+g.state.journey.action;if(!seen.has(key)){seen.add(key);const raw=g.save();for(const interruption of ['mark','defeat']){
   const h=loadQ080(raw);if(h.state.mode==='town')go(h,{kind:'dungeon',dungeon:'region_8',map:'region_8_f1',x:1,y:1});assert.ok(h.state.journey);const s=structuredClone(story(h)),j=structuredClone(h.state.journey);
   if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);
   const resumed=loadQ080(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q080'}),false);arriveQ080(resumed);fixed(resumed);assert.equal(values(resumed).finished,false);assert.equal(values(resumed).sharedControl,false);
  }}arriveQ080(g);}}
 }assert.equal(seen.size,16);
});

test('q080 all 24 current, previous and accepted routes preserve three endings and award each outcome once',()=>{
 const scenes=new Set();for(const generation of ['current','previous','accepted'])for(const route of q080Routes){
  const accepted=generation==='accepted',g=loadQ080(accepted?q080AcceptedEngine().save():q080Engine({legacy:generation==='previous'}).save()),reward=data.quests.q080.outcomes[route.outcome],gold=g.state.gold;let awards=0,total=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{total+=gp;if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of accepted?route.accepted:route.path){assert.equal(awards,0);if(accepted){scenes.add(q080LegacyScene(g));loadQ080(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ080(g.save());drain(g);if(g.state.battle){loadQ080(g.save());resolveQ080(g,'win');}assert.equal(story(g),undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}else{chooseQ080(g,id);fixed(g);}}
  assert.equal(g.state.quests.q080.outcome,route.outcome);assert.equal(awards,1);assert.equal(g.state.gold,gold+total);const raw=g.save();assert.throws(()=>g.complete('q080',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q080'),false);g.run(data.quests.q080.model.entryScript);drain(g);assert.equal(awards,1);loadQ080(g.save());
 }assert.deepEqual([...scenes].sort(),['council','entry']);
});

test('q080 invalid current and old saves fail atomically without partial migrations or signature changes',()=>{
 const g=q080Engine(),before=g.save();for(const raw of [before,q080Engine({legacy:true}).save()])for(const mutate of [s=>s.stories.q080.values.singleKeyAt='nowhere',s=>s.stories.q080.values.maintenance=1,s=>delete s.stories.q080.values.sharedControl,s=>s.stories.q080.revision=3,s=>s.stories.q080.events.push('unwritten'),s=>(s.flags.legacyStoryRoutes??={}).q080=true]){const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
 for(const k of q080Roles){const bad=JSON.parse(before);bad.state.stories.q080.values[k+'PersonAt']='entry';assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
});

test('q080 59 browser checkpoints distinguish eight approval masks, fixed desks, old text and accepted routes',async()=>{
 const {fixtures,outcomes}=await ironInheritanceArtFixtures();assert.equal(fixtures.length,59);assert.equal(outcomes.length,3);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,59);
 for(const generation of ['current','previous']){const f=fixtures.filter(f=>f.variant.startsWith(generation));assert.equal(f.length,25);assert.equal(new Set(f.map(f=>f.scene)).size,7);assert.equal(f.filter(f=>f.scene==='council').length,8);for(const k of q080Roles)assert.equal(f.filter(f=>f.scene===k+'_signed'&&f.variant!==generation+'-rescued').length,4);assert.ok(f.some(f=>f.variant===generation+'-lose'));assert.ok(f.some(f=>f.variant===generation+'-rescued'));}
 for(const scene of [...q080Roles.map(k=>k+'_signed'),'restored']){const f=fixtures.find(f=>f.scene===scene&&f.variant.startsWith('previous'));assert.equal(projectGame(loadQ080(f.save)).dialog.text,f.expectedText);assert.equal(f.expectedText,previousQ080.model.graph.find(n=>n.id===scene).text);assert.notEqual(f.expectedText,data.quests.q080.model.graph.find(n=>n.id===scene).text);}
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,9);
});
