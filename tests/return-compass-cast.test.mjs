import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,audit} from './royal-helpers.mjs';
import {previousQ085,q085Routes,q085Cast,q085LegacyScene,q085Engine,q085AcceptedEngine,loadQ085,chooseQ085,departQ085,arriveQ085,boundedQ085Paths,returnCompassArtFixtures} from '../tools/return-compass-art-fixtures.mjs';
const story=g=>g.state.stories.q085,values=g=>story(g).values;

test('q085 only adds two existing character references, five scene casts and two pending-action sentences',()=>{
 const q=structuredClone(data.quests.q085);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 assert.deepEqual(q.story.registry,previousQ085.story.registry);assert.deepEqual(q.story.actions,previousQ085.story.actions);
 for(const id of ['guide','nextGuide']){assert.equal(q.story.entities[id].character,'q085_'+id);delete q.story.entities[id].character;for(const key of ['portrait','sprite'])assert.equal(data.characters['q085_'+id][key],undefined);}
 for(const a of Object.values(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,['guide','nextGuide']);
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>q.story.entities[c.entity].kind),q085Cast(id).map(()=> 'person'));assert.deepEqual(s.cast.map(c=>'q085_'+c.entity),q085Cast(id));s.cast=[];}
 for(const id of ['place_marker','fixed']){const n=q.model.graph.find(n=>n.id===id),now=n.text,old=previousQ085.model.graph.find(n=>n.id===id).text;assert.notEqual(now,old);n.text=old;let count=0;const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);}
 assert.deepEqual(q,previousQ085);
});

test('q085 bounded path sets cover all three endings but do not claim to enumerate infinite repeated paths',()=>{
 const key=x=>JSON.stringify(x),expected=q085Routes.map(({path,outcome})=>({path,outcome}));
 assert.deepEqual(boundedQ085Paths(data.quests.q085.model.graph),expected);
 assert.deepEqual(boundedQ085Paths(data.previousQuestRoutes.q085.model.graph),q085Routes.map(({accepted:path,outcome})=>({path,outcome})));
 assert.equal(expected.length,9);assert.equal(new Set(expected.map(x=>x.outcome)).size,3);
 assert.ok(boundedQ085Paths(data.quests.q085.model.graph,3).length>9);
 const result=audit('q085');assert.equal(result.states,31);assert.deepEqual(Object.keys(result.ends).sort(),['compromise','contract','informed']);
});

test('q085 all scenes, journeys, actions and text/choice phases retain exact saves in both generations',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),h=loadQ085(raw);assert.equal(g.save(),raw);assert.deepEqual(JSON.parse(h.save()),JSON.parse(raw));const before=projectGame(g).dialog,after=projectGame(h).dialog;assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  if(story(h).scene)scenes.add(story(h).scene);phases.add(h.state.journey?'journey':h.state.quests.q085.stage==='completed'?'completed':h.state.waiting?.type);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q085Cast(story(h).scene));
  if(h.state.journey){journeys.add(h.state.journey.action);assert.equal(story(h).scene,null);assert.equal(after?.scene,undefined);assert.equal(h.dispatch({type:'story.resume',quest:'q085'}),false);arriveQ085(h);}
 };
 for(const legacy of [false,true])for(const route of q085Routes){const g=q085Engine({legacy});observe(g);for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q085.story.actions[g.state.journey.action];go(g,g.data.quests.q085.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q085.outcome,route.outcome);}
 assert.equal(scenes.size,7);assert.equal(journeys.size,7);assert.equal(actions.size,11);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q085.story.actions).sort());for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
});

test('q085 placement occurs at walk departure, not first arrival; fixed registration waits for finish',()=>{
 for(const legacy of [false,true]){let g=q085Engine({legacy});assert.equal(values(g).markerAt,'bag');chooseQ085(g,'bag');assert.equal(values(g).markerAt,'party');departQ085(g,'entrance');assert.equal(values(g).markerAt,'party');g=loadQ085(g.save());arriveQ085(g);assert.equal(values(g).markerAt,'party');assert.equal(values(g).fixed,false);
  departQ085(g,'walk');assert.equal(values(g).markerAt,'exit');arriveQ085(g);assert.equal(values(g).partyAt,'corner');assert.equal(values(g).markerAt,'exit');chooseQ085(g,'exit');assert.equal(story(g).scene,'fixed');assert.equal(values(g).fixed,false);assert.equal(values(g).finished,false);chooseQ085(g,'finish');assert.equal(values(g).fixed,true);assert.equal(values(g).markerAt,'exit');
 }
});

test('q085 recovery arrival leaves the marker at the entrance; departure and arrival have distinct holders',()=>{
 for(const legacy of [false,true]){let g=q085Engine({legacy});for(const id of ['bag','entrance','walk','leader'])chooseQ085(g,id);assert.equal(story(g).scene,'recover_marker');assert.equal(values(g).markerAt,'exit');
  departQ085(g,'leader');assert.equal(values(g).markerAt,'guide');assert.equal(values(g).guideAt,'transit');assert.equal(values(g).nextGuideAt,'transit');g=loadQ085(g.save());arriveQ085(g);assert.equal(values(g).markerAt,'nextGuide');assert.equal(values(g).guideAt,'corner');assert.equal(values(g).nextGuideAt,'corner');
 }
});

test('q085 direct leader trial transfers at departure and arrival and both guides remain with the party',()=>{
 for(const legacy of [false,true]){let g=q085Engine({legacy});chooseQ085(g,'bag');departQ085(g,'leader');assert.equal(values(g).markerAt,'guide');g=loadQ085(g.save());arriveQ085(g);assert.equal(values(g).markerAt,'nextGuide');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q085Cast('leader'));chooseQ085(g,'relay');assert.equal(values(g).fixed,false);assert.equal(values(g).markerAt,'nextGuide');}
});

test('q085 repeated switching preserves one marker and reuses original escorts for six complete loops',()=>{
 for(const legacy of [false,true]){let g=q085Engine({legacy});chooseQ085(g,'bag');chooseQ085(g,'leader');for(let round=0;round<6;round++){
  departQ085(g,'entrance');assert.equal(values(g).markerAt,'party');arriveQ085(g);assert.equal(values(g).markerAt,'party');chooseQ085(g,'walk');assert.equal(values(g).markerAt,'exit');chooseQ085(g,'leader');assert.equal(values(g).markerAt,'exit');chooseQ085(g,'leader');assert.equal(values(g).markerAt,'nextGuide');assert.equal(values(g).fixed,false);
  assert.equal(values(g).guideAt,values(g).partyAt);assert.equal(values(g).nextGuideAt,values(g).partyAt);assert.equal(values(g).bagAt,'party');assert.equal(values(g).compassAt,'party');g=loadQ085(g.save());
 }chooseQ085(g,'relay');assert.equal(g.state.quests.q085.outcome,'compromise');}
});

test('q085 magnetization keeps the old non-combat ending and does not fix or retrieve the return marker',()=>{
 for(const legacy of [false,true]){const g=loadQ085(q085Engine({legacy}).save());chooseQ085(g,'north');assert.equal(g.state.battle,null);assert.equal(g.state.quests.q085.outcome,'contract');assert.equal(values(g).magnetized,true);assert.equal(values(g).fixed,false);assert.equal(values(g).markerAt,'bag');loadQ085(g.save());}
});

test('q085 every journey survives retreat and defeat without losing its marker or escorts',()=>{
 const seen=new Set();for(const legacy of [false,true])for(const route of q085Routes){const g=q085Engine({legacy});for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.journey){const key=legacy+'/'+g.state.journey.action;if(!seen.has(key)){seen.add(key);const raw=g.save();for(const interruption of ['mark','defeat']){const h=loadQ085(raw),s=structuredClone(story(h)),j=structuredClone(h.state.journey);if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);const resumed=loadQ085(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q085'}),false);arriveQ085(resumed);assert.equal(values(resumed).guideAt,values(resumed).partyAt);assert.equal(values(resumed).nextGuideAt,values(resumed).partyAt);assert.equal(values(resumed).finished,false);}}arriveQ085(g);}}}assert.equal(seen.size,14);
});

test('q085 rewards remain one-time for all nine bounded paths across old and current saves',()=>{
 for(const legacy of [false,true])for(const route of q085Routes){const g=loadQ085(q085Engine({legacy}).save()),reward=data.quests.q085.outcomes[route.outcome],gold=g.state.gold;let awards=0,total=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{total+=gp;if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};for(const id of route.path){assert.equal(awards,0);chooseQ085(g,id);}assert.equal(awards,1);assert.equal(g.state.gold,gold+total);assert.equal(g.state.quests.q085.outcome,route.outcome);const raw=g.save();assert.throws(()=>g.complete('q085',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q085'),false);g.run(data.quests.q085.model.entryScript);drain(g);assert.equal(awards,1);loadQ085(g.save());}
});

test('q085 accepted old routes retain four scenes and nine bounded paths without new story actors',()=>{
 const scenes=new Set();for(const route of q085Routes){const g=loadQ085(q085AcceptedEngine().save());for(const id of route.accepted){scenes.add(q085LegacyScene(g));loadQ085(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ085(g.save());drain(g);assert.equal(g.state.battle,null);assert.equal(g.state.stories.q085,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}assert.equal(g.state.quests.q085.outcome,route.outcome);loadQ085(g.save());}assert.deepEqual([...scenes].sort(),['entrance','entry','leader','marker']);
});

test('q085 malformed saves reject atomically without altering the current valid game',()=>{
 const g=q085Engine(),before=g.save();for(const raw of [before,q085Engine({legacy:true}).save()])for(const mutate of [s=>s.stories.q085.values.markerAt='unknown',s=>s.stories.q085.values.guideAt='bag',s=>s.stories.q085.values.fixed=1,s=>delete s.stories.q085.values.nextGuideAt,s=>s.stories.q085.revision=2,s=>s.stories.q085.events.push('unwritten'),s=>(s.flags.legacyStoryRoutes??={}).q085=true]){const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
});

test('q085 browser fixtures cover both holders, repeated visits, rescues and old waiting text',async()=>{
 const {fixtures,outcomes}=await returnCompassArtFixtures();assert.equal(outcomes.length,3);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const gen of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(gen));assert.equal(new Set(rows.map(f=>f.scene)).size,7);assert.ok(rows.some(f=>f.variant.endsWith('visit2')));assert.equal(rows.filter(f=>f.variant.includes('rescued')).length,2);}
 for(const scene of ['place_marker','fixed']){const f=fixtures.find(f=>f.scene===scene&&f.variant.startsWith('previous'));assert.equal(projectGame(loadQ085(f.save)).dialog.text,f.expectedText);assert.equal(f.expectedText,previousQ085.model.graph.find(n=>n.id===scene).text);assert.notEqual(f.expectedText,data.quests.q085.model.graph.find(n=>n.id===scene).text);}
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,4);
});
