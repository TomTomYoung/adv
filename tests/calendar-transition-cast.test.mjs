import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,audit} from './royal-helpers.mjs';
import {previousQ089,q089Routes,q089Paths,q089Cast,q089LegacyScene,q089Engine,q089AcceptedEngine,loadQ089,chooseQ089,departQ089,arriveQ089,calendarTransitionArtFixtures} from '../tools/calendar-transition-art-fixtures.mjs';
const story=g=>g.state.stories.q089,values=g=>story(g).values;
const fixed=g=>{assert.equal(values(g).weddingPartiesAt,'wedding');assert.equal(values(g).payrollPartiesAt,'wages');};
const cast=g=>projectGame(g).dialog.scene?.cast.map(c=>c.id);
const sorted=rows=>rows.map(JSON.stringify).sort();

test('q089 changes only two fixed groups, migration, two casts and one pending-action sentence',()=>{
 const q=structuredClone(data.quests.q089);assert.equal(q.story.revision,2);assert.equal(q.model.edition.revision,2);
 assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ089.story);
 assert.deepEqual(q.model.storyUpgrades[0].values,[{key:'weddingPartiesAt',value:'wedding'},{key:'payrollPartiesAt',value:'wages'}]);
 for(const [id,place] of [['weddingParties','wedding'],['payrollParties','wages']]){
  assert.deepEqual(q.story.entities[id],{holder:id+'At',kind:'group',character:'q089_'+id});
  assert.deepEqual(q.story.registry[id+'At'].values,[place]);assert.equal(q.story.registry[id+'At'].initial,place);
  for(const prop of ['portrait','sprite'])assert.equal(data.characters['q089_'+id][prop],undefined);
  delete q.story.entities[id];delete q.story.registry[id+'At'];
 }
 assert.deepEqual(q.story.registry,previousQ089.story.registry);assert.deepEqual(q.story.actions,previousQ089.story.actions);
 for(const a of Object.values(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,[]);
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>'q089_'+c.entity),q089Cast(id));s.cast=[];}
 const node=q.model.graph.find(n=>n.id==='dual'),now=node.text,old=previousQ089.model.graph.find(n=>n.id==='dual').text;assert.notEqual(now,old);node.text=old;let count=0;
 const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ089);
});

test('q089 authored predicates yield nine finite paths, twenty-five states and three endings',()=>{
 assert.deepEqual(sorted(q089Paths(data.quests.q089)),sorted(q089Routes.map(({path,outcome})=>({path,outcome}))));
 assert.deepEqual(sorted(q089Paths(data.previousQuestRoutes.q089)),sorted(q089Routes.map(({accepted:path,outcome})=>({path,outcome}))));
 const result=audit('q089');assert.equal(result.states,25);assert.deepEqual(Object.keys(result.ends).sort(),['compromise','contract','informed']);
});

test('q089 all five scenes, six journeys and ten actions preserve old and current save phases',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),h=loadQ089(raw);assert.equal(g.save(),raw);const before=projectGame(g).dialog,after=projectGame(h).dialog;assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);fixed(h);
  if(story(h).scene)scenes.add(story(h).scene);phases.add(h.state.journey?'journey':h.state.quests.q089.stage==='completed'?'completed':h.state.waiting?.type);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q089Cast(story(h).scene));
  if(h.state.journey){journeys.add(h.state.journey.action);assert.equal(story(h).scene,null);assert.equal(after?.scene,undefined);assert.equal(h.dispatch({type:'story.resume',quest:'q089'}),false);arriveQ089(h);fixed(h);}
 };
 for(const legacy of [false,true])for(const r of q089Routes){const g=q089Engine({legacy});observe(g);for(const id of r.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q089.story.actions[g.state.journey.action];go(g,g.data.quests.q089.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q089.outcome,r.outcome);}
 assert.equal(scenes.size,5);assert.equal(journeys.size,6);assert.equal(actions.size,10);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q089.story.actions).sort());for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
});

test('q089 each agreement commits on real arrival, independently in either appointment order',()=>{
 for(const legacy of [false,true])for(const order of [['wedding','wages'],['wages','wedding']]){let g=loadQ089(q089Engine({legacy}).save());chooseQ089(g,'turn');assert.equal(values(g).south,true);assert.equal(values(g).switched,false);
  for(const id of order){assert.equal(values(g)[id],false);departQ089(g,id);assert.equal(values(g)[id],false);fixed(g);g=loadQ089(g.save());arriveQ089(g);assert.equal(values(g)[id],true);assert.equal(values(g).switched,false);assert.equal(values(g).finished,false);assert.deepEqual(cast(g),q089Cast(id+'_agreed'));fixed(g);chooseQ089(g,'return');assert.equal(story(g).scene,'dates');assert.deepEqual(cast(g),[]);}
  chooseQ089(g,'switch');assert.equal(values(g).switched,true);assert.equal(g.state.quests.q089.outcome,'informed');fixed(g);
 }
});

test('q089 cannot switch early or repeat a completed consultation, and refusal changes no saved state',()=>{
 for(const legacy of [false,true])for(const first of ['wedding','wages']){const g=loadQ089(q089Engine({legacy}).save());chooseQ089(g,'turn');let raw=g.save();assert.equal(g.dispatch({type:'choose',id:'switch'}),false);assert.equal(g.save(),raw);
  chooseQ089(g,first);chooseQ089(g,'return');raw=g.save();for(const id of ['switch',first]){assert.equal(g.dispatch({type:'choose',id}),false);assert.equal(g.save(),raw);}
  chooseQ089(g,first==='wedding'?'wages':'wedding');chooseQ089(g,'return');raw=g.save();for(const id of ['wedding','wages']){assert.equal(g.dispatch({type:'choose',id}),false);assert.equal(g.save(),raw);}chooseQ089(g,'switch');
 }
});

test('q089 all six dual-calendar paths keep prior agreements but never imply a calendar switch',()=>{
 for(const legacy of [false,true])for(const r of q089Routes.filter(r=>r.outcome==='compromise')){const g=loadQ089(q089Engine({legacy}).save());for(const id of r.path.slice(0,-1))chooseQ089(g,id);
  assert.equal(story(g).scene,'dual');assert.equal(values(g).finished,false);assert.equal(values(g).switched,false);assert.equal(values(g).ground,false);assert.equal(values(g).wedding,r.path.includes('wedding'));assert.equal(values(g).wages,r.path.includes('wages'));assert.equal(values(g).south,r.path[0]==='turn');assert.deepEqual(cast(g),[]);chooseQ089(g,'finish');assert.equal(values(g).finished,true);assert.equal(values(g).switched,false);fixed(g);
 }
});

test('q089 gear adaptation is a distinct original non-combat result',()=>{
 for(const legacy of [false,true]){const g=loadQ089(q089Engine({legacy}).save());chooseQ089(g,'gears');assert.equal(g.state.battle,null);assert.equal(values(g).ground,true);for(const k of ['south','wedding','wages','switched'])assert.equal(values(g)[k],false);assert.equal(g.state.quests.q089.outcome,'contract');fixed(g);}
});

test('q089 migration preserves every old field, waiting text and options while adding only fixed group positions',()=>{
 for(const r of q089Routes){const g=q089Engine({legacy:true});for(const id of [null,...r.path]){if(id)chooseQ089(g,id);const old=JSON.parse(g.save()),h=loadQ089(g.save()),actual=JSON.parse(h.save());actual.state.stories.q089.revision=1;delete actual.state.stories.q089.values.weddingPartiesAt;delete actual.state.stories.q089.values.payrollPartiesAt;assert.deepEqual(actual,old);fixed(h);}}
});

test('q089 every trip preserves agreements and fixed groups through retreat and defeat rescue',()=>{
 const seen=new Set();for(const legacy of [false,true])for(const r of q089Routes){const g=q089Engine({legacy});for(const id of r.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.journey){const key=legacy+'/'+g.state.journey.action;if(!seen.has(key)){seen.add(key);const raw=g.save();for(const interruption of ['mark','defeat']){const h=loadQ089(raw);if(h.state.mode==='town')go(h,{kind:'dungeon',dungeon:'region_9',map:'region_9_f1',x:1,y:1});assert.ok(h.state.journey);const s=structuredClone(story(h)),j=structuredClone(h.state.journey);if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);const resumed=loadQ089(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q089'}),false);arriveQ089(resumed);fixed(resumed);assert.equal(values(resumed).finished,false);assert.deepEqual(cast(resumed),q089Cast(story(resumed).scene));for(const f of ['wedding','wages'])assert.equal(values(resumed)[f],s.values[f]||j.action==='dates_'+f);}}arriveQ089(g);}}}assert.equal(seen.size,12);
});

test('q089 original rewards occur once on every current and migrated path',()=>{
 for(const legacy of [false,true])for(const r of q089Routes){const g=loadQ089(q089Engine({legacy}).save()),gold=g.state.gold,reward=data.quests.q089.outcomes[r.outcome];let awards=0,total=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{total+=gp;if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of r.path){assert.equal(awards,0);chooseQ089(g,id);}assert.equal(awards,1);assert.equal(g.state.gold,gold+total);assert.equal(g.state.quests.q089.outcome,r.outcome);const raw=g.save();assert.throws(()=>g.complete('q089',r.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q089'),false);g.run(data.quests.q089.model.entryScript);drain(g);assert.equal(awards,1);loadQ089(g.save());
 }
});

test('q089 previously accepted routes retain two scenes and nine conditional paths without actors or journeys',()=>{
 const scenes=new Set();for(const r of q089Routes){const g=loadQ089(q089AcceptedEngine().save()),reward=data.quests.q089.outcomes[r.outcome];let awards=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of r.accepted){scenes.add(q089LegacyScene(g));loadQ089(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ089(g.save());drain(g);assert.equal(g.state.battle,null);assert.equal(g.state.stories.q089,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}assert.equal(g.state.quests.q089.outcome,r.outcome);assert.equal(awards,1);loadQ089(g.save());
 }assert.deepEqual([...scenes].sort(),['dates','entry']);
});

test('q089 malformed current and old saves fail atomically before adding groups',()=>{
 const g=q089Engine(),before=g.save();for(const raw of [before,q089Engine({legacy:true}).save()])for(const mutate of [s=>s.stories.q089.values.partyAt='weddingParties',s=>s.stories.q089.values.wedding=1,s=>delete s.stories.q089.values.wages,s=>s.stories.q089.revision=3,s=>s.stories.q089.events.push('unknown'),s=>(s.flags.legacyStoryRoutes??={}).q089=true]){const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
 for(const key of ['weddingPartiesAt','payrollPartiesAt']){const bad=JSON.parse(before);bad.state.stories.q089.values[key]='entry';assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
});

test('q089 browser checkpoints retain old text, fixed casts and disabled duplicate/missing-consent choices',async()=>{
 const {fixtures,outcomes}=await calendarTransitionArtFixtures();assert.equal(outcomes.length,3);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const gen of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(gen));assert.equal(new Set(rows.map(f=>f.scene)).size,5);assert.equal(rows.filter(f=>f.variant.includes('rescued')).length,4);const dates=rows.filter(f=>f.scene==='dates'&&!f.variant.includes('rescued'));assert.equal(dates.length,4);}
 for(const f of fixtures){const d=projectGame(loadQ089(f.save)).dialog;assert.equal(d.text,f.expectedText);if(f.absentStoryScene){assert.equal(d.scene,undefined);assert.deepEqual(f.cast,[]);}else{assert.deepEqual(d.scene.cast.map(c=>c.id),q089Cast(f.scene));assert.deepEqual(f.textOnlyCast,f.cast);}}
 for(const f of fixtures.filter(f=>f.scene==='dual'&&f.variant.startsWith('previous'))){assert.equal(f.expectedText,previousQ089.model.graph.find(n=>n.id==='dual').text);assert.notEqual(f.expectedText,data.quests.q089.model.graph.find(n=>n.id==='dual').text);}assert.equal(fixtures.filter(f=>f.absentStoryScene).length,5);
});
