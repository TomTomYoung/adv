import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,audit} from './royal-helpers.mjs';
import {previousQ086,q086Routes,q086Paths,q086LegacyScene,q086Engine,q086AcceptedEngine,loadQ086,chooseQ086,departQ086,arriveQ086,centuryObserverArtFixtures} from '../tools/century-observer-art-fixtures.mjs';
const story=g=>g.state.stories.q086,values=g=>story(g).values;

test('q086 changes only two pending archive sentences and adds no people, migration or state',()=>{
 const q=structuredClone(data.quests.q086);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 assert.deepEqual(q.story,previousQ086.story);assert.ok(Object.keys(data.characters).every(id=>!id.startsWith('q086_')));
 assert.deepEqual(Object.keys(q.story.entities),['party','notice','receiver','reports']);
 for(const id of ['notice','receiver','reports'])assert.equal(q.story.entities[id].kind,'item');
 for(const s of Object.values(q.story.scenes))assert.deepEqual(s.cast,[]);
 for(const a of Object.values(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,[]);
 for(const id of ['mapped','annotated']){const n=q.model.graph.find(n=>n.id===id),now=n.text,old=previousQ086.model.graph.find(n=>n.id===id).text;assert.notEqual(now,old);n.text=old;let count=0;const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);}
 assert.deepEqual(q,previousQ086);
});

test('q086 current and accepted five paths exhaust both acyclic graphs and reach three endings',()=>{
 assert.deepEqual(q086Paths(data.quests.q086.model.graph),q086Routes.map(({path,outcome})=>({path,outcome})));
 assert.deepEqual(q086Paths(data.previousQuestRoutes.q086.model.graph),q086Routes.map(({accepted:path,outcome})=>({path,outcome})));
 const result=audit('q086');assert.equal(result.states,16);assert.deepEqual(Object.keys(result.ends).sort(),['compromise','contract','informed']);
});

test('q086 all seven scenes, five journeys and eleven actions retain exact saves and waiting text',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),h=loadQ086(raw);assert.equal(g.save(),raw);assert.deepEqual(JSON.parse(h.save()),JSON.parse(raw));const before=projectGame(g).dialog,after=projectGame(h).dialog;assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  if(story(h).scene)scenes.add(story(h).scene);phases.add(h.state.journey?'journey':h.state.quests.q086.stage==='completed'?'completed':h.state.waiting?.type);
  if(after?.scene)assert.deepEqual(after.scene.cast,[]);
  if(h.state.journey){journeys.add(h.state.journey.action);assert.equal(story(h).scene,null);assert.equal(after?.scene,undefined);assert.equal(h.dispatch({type:'story.resume',quest:'q086'}),false);arriveQ086(h);}
 };
 for(const legacy of [false,true])for(const route of q086Routes){const g=q086Engine({legacy});observe(g);for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q086.story.actions[g.state.journey.action];go(g,g.data.quests.q086.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q086.outcome,route.outcome);}
 assert.equal(scenes.size,7);assert.equal(journeys.size,5);assert.equal(actions.size,11);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q086.story.actions).sort());for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
});

test('q086 notification is carried at departure and deposited on arrival without repairing the receiver',()=>{
 for(const legacy of [false,true]){let g=q086Engine({legacy});assert.equal(values(g).noticeAt,'entry');assert.equal(values(g).receiverFixed,false);
  departQ086(g,'reply');assert.equal(values(g).noticeAt,'party');assert.equal(values(g).receiverAt,'mail');assert.equal(values(g).reportsAt,'entry');assert.equal(values(g).receiverFixed,false);
  g=loadQ086(g.save());arriveQ086(g);assert.equal(values(g).noticeAt,'receiver');assert.equal(values(g).receiverFixed,false);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  chooseQ086(g,'repair');assert.equal(story(g).scene,'repaired');assert.equal(values(g).receiverFixed,true);assert.equal(values(g).noticeAt,'receiver');assert.equal(values(g).partyAt,'mail');
  departQ086(g,'verify');assert.equal(values(g).receiverFixed,true);assert.equal(values(g).reportsAt,'entry');arriveQ086(g);assert.equal(story(g).scene,'mapping');assert.match(projectGame(g).dialog.text,/自動観測器/);
 }
});

test('q086 mapping preserves historical reports until finish and does not move the communication box',()=>{
 for(const legacy of [false,true]){let g=q086Engine({legacy});for(const id of ['reply','repair','verify'])chooseQ086(g,id);
  assert.equal(values(g).reportsAt,'entry');departQ086(g,'table');assert.equal(values(g).reportsAt,'party');assert.equal(values(g).noticeAt,'receiver');g=loadQ086(g.save());arriveQ086(g);
  assert.equal(story(g).scene,'mapped');assert.equal(values(g).reportsAt,'party');assert.equal(values(g).finished,false);assert.equal(values(g).resolution,'pending');
  chooseQ086(g,'finish');assert.equal(values(g).reportsAt,'archive');assert.equal(values(g).receiverAt,'mail');assert.equal(g.state.quests.q086.outcome,'informed');
 }
});

test('q086 three annotation routes preserve separate notification and repair histories',()=>{
 for(const legacy of [false,true])for(const [path,holder,fixed] of [[['old'],'entry',false],[['reply','manual'],'receiver',false],[['reply','repair','verify','daily'],'receiver',true]]){
  let g=q086Engine({legacy});for(const id of path)chooseQ086(g,id);assert.equal(story(g).scene,'annotate');assert.equal(values(g).noticeAt,holder);assert.equal(values(g).receiverFixed,fixed);assert.equal(values(g).reportsAt,'entry');
  departQ086(g,'save');assert.equal(values(g).reportsAt,'party');g=loadQ086(g.save());arriveQ086(g);assert.equal(story(g).scene,'annotated');assert.equal(values(g).reportsAt,'party');assert.equal(values(g).finished,false);
  chooseQ086(g,'finish');assert.equal(values(g).reportsAt,'archive');assert.equal(values(g).noticeAt,holder);assert.equal(values(g).receiverFixed,fixed);assert.equal(g.state.quests.q086.outcome,'compromise');
 }
});

test('q086 discarding the archive remains non-combat and does not pretend that repair or archival delivery occurred',()=>{
 for(const legacy of [false,true]){const g=loadQ086(q086Engine({legacy}).save());chooseQ086(g,'discard');assert.equal(g.state.battle,null);assert.equal(values(g).discarded,true);assert.equal(values(g).receiverFixed,false);assert.equal(values(g).noticeAt,'entry');assert.equal(values(g).reportsAt,'entry');assert.equal(g.state.quests.q086.outcome,'contract');loadQ086(g.save());}
});

test('q086 every journey survives retreat and defeat without losing notification or report custody',()=>{
 const seen=new Set();for(const legacy of [false,true])for(const route of q086Routes){const g=q086Engine({legacy});for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.journey){const key=legacy+'/'+g.state.journey.action;if(!seen.has(key)){seen.add(key);const raw=g.save();for(const interruption of ['mark','defeat']){const h=loadQ086(raw),s=structuredClone(story(h)),j=structuredClone(h.state.journey);if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);const resumed=loadQ086(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q086'}),false);arriveQ086(resumed);assert.equal(values(resumed).finished,false);assert.equal(values(resumed).receiverAt,'mail');assert.deepEqual(projectGame(resumed).dialog.scene.cast,[]);}}arriveQ086(g);}}}assert.equal(seen.size,10);
});

test('q086 original rewards remain one-time on all five routes and both save generations',()=>{
 for(const legacy of [false,true])for(const route of q086Routes){const g=loadQ086(q086Engine({legacy}).save()),reward=data.quests.q086.outcomes[route.outcome],gold=g.state.gold;let awards=0,total=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{total+=gp;if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};for(const id of route.path){assert.equal(awards,0);chooseQ086(g,id);}assert.equal(awards,1);assert.equal(g.state.gold,gold+total);assert.equal(g.state.quests.q086.outcome,route.outcome);const raw=g.save();assert.throws(()=>g.complete('q086',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q086'),false);g.run(data.quests.q086.model.entryScript);drain(g);assert.equal(awards,1);loadQ086(g.save());}
});

test('q086 accepted old routes keep three scenes and all five paths without new actors or journeys',()=>{
 const scenes=new Set();for(const route of q086Routes){const g=loadQ086(q086AcceptedEngine().save());for(const id of route.accepted){scenes.add(q086LegacyScene(g));loadQ086(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ086(g.save());drain(g);assert.equal(g.state.battle,null);assert.equal(g.state.stories.q086,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}assert.equal(g.state.quests.q086.outcome,route.outcome);loadQ086(g.save());}assert.deepEqual([...scenes].sort(),['entry','mail','mapping']);
});

test('q086 malformed saves reject atomically without altering the current valid game',()=>{
 const g=q086Engine(),before=g.save();for(const raw of [before,q086Engine({legacy:true}).save()])for(const mutate of [s=>s.stories.q086.values.reportsAt='unknown',s=>s.stories.q086.values.receiverAt='receiver',s=>s.stories.q086.values.receiverFixed=1,s=>delete s.stories.q086.values.noticeAt,s=>s.stories.q086.revision=2,s=>s.stories.q086.events.push('unwritten'),s=>(s.flags.legacyStoryRoutes??={}).q086=true]){const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
});

test('q086 display fixtures cover seven empty casts, three annotations, rescues and old waiting text',async()=>{
 const {fixtures,outcomes}=await centuryObserverArtFixtures();assert.equal(outcomes.length,3);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const gen of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(gen));assert.equal(new Set(rows.map(f=>f.scene)).size,7);assert.equal(rows.filter(f=>f.variant.includes('rescued')).length,2);assert.equal(rows.filter(f=>f.scene==='annotated').length,4);}
 for(const f of fixtures){const d=projectGame(loadQ086(f.save)).dialog;assert.equal(d.text,f.expectedText);assert.deepEqual(f.cast,[]);if(f.absentStoryScene)assert.equal(d.scene,undefined);else assert.deepEqual(d.scene.cast,[]);}
 for(const scene of ['mapped','annotated']){const f=fixtures.find(f=>f.scene===scene&&f.variant.startsWith('previous'));assert.equal(f.expectedText,previousQ086.model.graph.find(n=>n.id===scene).text);assert.notEqual(f.expectedText,data.quests.q086.model.graph.find(n=>n.id===scene).text);}
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,3);
});
