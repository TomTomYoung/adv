import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain} from './royal-helpers.mjs';
import {previousQ084,q084Routes,q084Cast,q084LegacyScene,q084Engine,q084AcceptedEngine,loadQ084,chooseQ084,departQ084,arriveQ084,returnSignalArtFixtures} from '../tools/return-signal-art-fixtures.mjs';
const story=g=>g.state.stories.q084,values=g=>story(g).values;
const fixed=g=>{assert.equal(values(g).familyGroupAt,'family');assert.equal(values(g).stretcherPartyAt,'survivors');};
const cast=g=>projectGame(g).dialog.scene.cast.map(c=>c.id);

test('q084 changes only three group labels, family migration, six casts and four pending-action sentences',()=>{
 const q=structuredClone(data.quests.q084);assert.equal(q.story.revision,2);assert.equal(q.model.edition.revision,2);
 assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ084.story);
 assert.deepEqual(q.model.storyUpgrades[0].values,[{key:'familyGroupAt',value:'family'}]);
 assert.deepEqual(q.story.entities.familyGroup,{holder:'familyGroupAt',kind:'group',character:'q084_family'});
 assert.deepEqual(q.story.registry.familyGroupAt.values,['family']);assert.equal(q.story.registry.familyGroupAt.initial,'family');
 for(const id of ['q084_family','q084_survivors','q084_specialists'])for(const key of ['portrait','sprite'])assert.equal(data.characters[id][key],undefined);
 assert.equal(q.story.entities.stretcherParty.character,'q084_survivors');assert.equal(q.story.entities.specialists.character,'q084_specialists');
 delete q.story.entities.familyGroup;delete q.story.registry.familyGroupAt;delete q.story.entities.stretcherParty.character;delete q.story.entities.specialists.character;
 assert.deepEqual(q.story.registry,previousQ084.story.registry);assert.deepEqual(q.story.actions,previousQ084.story.actions);
 for(const [id,a] of Object.entries(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,id==='call_report_escort'?['specialists']:[]);
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>data.quests.q084.story.entities[c.entity].character),q084Cast(id));s.cast=[];}
 for(const id of ['recovered','reached','handoff','expert_arrived']){
  const n=q.model.graph.find(n=>n.id===id),now=n.text,old=previousQ084.model.graph.find(n=>n.id===id).text;assert.notEqual(now,old);n.text=old;let count=0;
  const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);
 }
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ084);
});

test('q084 four paths exactly enumerate both acyclic decision graphs',()=>{
 function paths(graph){const result=[],nodes=new Map(graph.map(n=>[n.id,n]));const visit=(scene,route,seen)=>{assert.ok(!seen.has(scene));const next=new Set([...seen,scene]);for(const o of nodes.get(scene).options){const path=[...route,o.id];if(o.to.startsWith('@'))result.push({path,outcome:o.to.slice(1)});else visit(o.to,path,next);}};visit('entry',[],new Set());return result.map(JSON.stringify).sort();}
 assert.equal(q084Routes.length,4);
 assert.deepEqual(paths(data.quests.q084.model.graph),q084Routes.map(({path,outcome})=>JSON.stringify({path,outcome})).sort());
 assert.deepEqual(paths(data.previousQuestRoutes.q084.model.graph),q084Routes.map(({accepted:path,outcome})=>JSON.stringify({path,outcome})).sort());
});

test('q084 ten scenes, nine journeys and thirteen actions resume in both generations and both chart conditions',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),h=loadQ084(raw);assert.equal(g.save(),raw);const before=projectGame(g).dialog,after=projectGame(h).dialog;
  assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);fixed(h);
  assert.equal(h.state.battle,null);if(story(h).scene)scenes.add(story(h).scene);
  phases.add(h.state.journey?'journey':h.state.quests.q084.stage==='completed'?'completed':h.state.waiting?.type);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q084Cast(story(h).scene));
  if(h.state.journey){journeys.add(h.state.journey.action);assert.equal(story(h).scene,null);assert.equal(after?.scene,undefined);assert.equal(h.dispatch({type:'story.resume',quest:'q084'}),false);arriveQ084(h);}
 };
 for(const legacy of [false,true])for(const map of ['none','informed'])for(const route of q084Routes){const g=q084Engine({legacy,map});observe(g);for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q084.story.actions[g.state.journey.action];go(g,g.data.quests.q084.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q084.outcome,route.outcome);}
 assert.equal(scenes.size,10);assert.equal(journeys.size,9);assert.equal(actions.size,13);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q084.story.actions).sort());
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
});

test('q084 chart copy requires q061 handover, not mere acceptance or a different completed outcome',()=>{
 for(const legacy of [false,true])for(const map of ['none','accepted','local','contract','informed']){
  let g=q084Engine({legacy,map});if(map==='informed'){assert.equal(g.state.quests.q061.outcome,'informed');assert.equal(g.state.stories.q061.values.chartAt,'rescue');}
  chooseQ084(g,'source');chooseQ084(g,'trail');assert.equal(values(g).chartCopyAt,'rescue');assert.deepEqual(cast(loadQ084(g.save())),['q084_specialists']);
  departQ084(g,'follow');assert.equal(values(g).chartCopyAt,map==='informed'?'party':'rescue');assert.equal(values(g).specialistsAt,'rescue');
  g=loadQ084(g.save());arriveQ084(g);assert.deepEqual(cast(g),[]);assert.equal(values(g).reached,false);fixed(g);
  assert.equal(g.state.dungeons.active.systems.air.air,64);const text=g.state.log.slice(-2).join('');
  assert.equal(text.includes('救難隊から借りた'),map==='informed');assert.ok(text.includes('遠くから生きた人の返事がある。'));
 }
});

test('q084 recovering the transmitter does not find people and transfers it only at the final confirmation',()=>{
 for(const legacy of [false,true])for(const map of ['none','informed']){let g=q084Engine({legacy,map});chooseQ084(g,'recover');assert.equal(values(g).beaconDeviceAt,'beacon');assert.deepEqual(cast(loadQ084(g.save())),[]);
  departQ084(g,'carry');assert.equal(values(g).beaconDeviceAt,'party');g=loadQ084(g.save());arriveQ084(g);assert.equal(story(g).scene,'recovered');assert.equal(values(g).beaconDeviceAt,'party');assert.deepEqual(cast(g),['q084_family']);
  assert.equal(values(g).finished,false);assert.equal(values(g).reached,false);chooseQ084(g,'finish');assert.equal(values(g).beaconDeviceAt,'family');assert.equal(values(g).reached,false);assert.equal(values(g).chartCopyAt,'rescue');fixed(g);
 }
});

test('q084 distant replies do not display survivors; arrival and final contact confirmation remain distinct',()=>{
 for(const legacy of [false,true])for(const map of ['none','informed']){let g=q084Engine({legacy,map});for(const id of ['source','trail','follow'])chooseQ084(g,id);
  assert.deepEqual(cast(loadQ084(g.save())),[]);assert.equal(values(g).reached,false);departQ084(g,'reach');g=loadQ084(g.save());arriveQ084(g);
  assert.equal(story(g).scene,'reached');assert.deepEqual(cast(g),['q084_survivors']);assert.equal(values(g).reached,false);assert.equal(values(g).finished,false);assert.equal(values(g).beaconDeviceAt,'beacon');assert.equal(values(g).specialistsAt,'rescue');
  chooseQ084(g,'finish');assert.equal(values(g).reached,true);assert.equal(g.state.quests.q084.outcome,'informed');fixed(g);
 }
});

test('q084 specialists travel only on the real escort and do not teleport to the distant survivors',()=>{
 for(const legacy of [false,true])for(const map of ['none','informed']){let g=q084Engine({legacy,map});for(const id of ['source','trail','follow','call'])chooseQ084(g,id);
  assert.deepEqual(cast(loadQ084(g.save())),['q084_specialists']);assert.equal(values(g).specialistsAt,'rescue');departQ084(g,'escort');assert.equal(values(g).specialistsAt,'transit');assert.equal(values(g).partyAt,'transit');
  g=loadQ084(g.save());arriveQ084(g);assert.equal(values(g).specialistsAt,'crossing');assert.equal(values(g).partyAt,'crossing');assert.equal(values(g).stretcherPartyAt,'survivors');assert.deepEqual(cast(g),['q084_specialists']);assert.equal(values(g).finished,false);
  chooseQ084(g,'finish');assert.equal(g.state.quests.q084.outcome,'compromise');assert.equal(values(g).reached,false);assert.equal(values(g).beaconDeviceAt,'beacon');fixed(g);
 }
});

test('q084 direct handoff preserves the beacon and the unborrowed map, with no survivor recovery',()=>{
 for(const legacy of [false,true])for(const map of ['none','informed']){const g=loadQ084(q084Engine({legacy,map}).save());chooseQ084(g,'source');chooseQ084(g,'handoff');
  assert.deepEqual(cast(g),['q084_specialists']);assert.equal(values(g).finished,false);assert.equal(values(g).resolution,'pending');assert.equal(values(g).chartCopyAt,'rescue');
  chooseQ084(g,'finish');assert.equal(values(g).beaconDeviceAt,'beacon');assert.equal(values(g).specialistsAt,'rescue');assert.equal(values(g).reached,false);fixed(g);
 }
});

test('q084 every journey survives retreat and defeat with cargo and specialists preserved in transit',()=>{
 const seen=new Set();for(const legacy of [false,true])for(const map of ['none','informed'])for(const route of q084Routes){const g=q084Engine({legacy,map});for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);
  if(g.state.journey){const key=legacy+'/'+map+'/'+g.state.journey.action;if(!seen.has(key)){seen.add(key);const raw=g.save();
   for(const interruption of ['mark','defeat']){const h=loadQ084(raw);if(h.state.mode==='town')go(h,{kind:'dungeon',dungeon:'region_9',map:'region_9_f1',x:1,y:1});assert.ok(h.state.journey);
    const s=structuredClone(story(h)),j=structuredClone(h.state.journey);if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);
    assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);const resumed=loadQ084(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q084'}),false);arriveQ084(resumed);
    assert.equal(values(resumed).finished,false);fixed(resumed);assert.equal(values(resumed).specialistsAt,j.action==='call_report_escort'?'crossing':'rescue');
   }
  }arriveQ084(g);}
 }}assert.equal(seen.size,36);
});

test('q084 each route pays its original reward once, under both chart conditions and save generations',()=>{
 for(const legacy of [false,true])for(const map of ['none','informed'])for(const route of q084Routes){const g=loadQ084(q084Engine({legacy,map}).save()),gold=g.state.gold,reward=data.quests.q084.outcomes[route.outcome];let awards=0,total=0;const award=g.award.bind(g);
  g.award=(gp,xp,who)=>{total+=gp;if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(awards,0);chooseQ084(g,id);}assert.equal(awards,1);assert.equal(g.state.gold,gold+total);assert.equal(g.state.quests.q084.outcome,route.outcome);
  const raw=g.save();assert.throws(()=>g.complete('q084',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q084'),false);g.run(data.quests.q084.model.entryScript);drain(g);assert.equal(awards,1);loadQ084(g.save());
 }
});

test('q084 accepted routes keep three scenes and all paths without injecting new groups or physical journeys',()=>{
 const scenes=new Set();for(const map of ['none','informed'])for(const route of q084Routes){const g=loadQ084(q084AcceptedEngine({map}).save()),reward=data.quests.q084.outcomes[route.outcome];let awards=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};
  for(const id of route.accepted){scenes.add(q084LegacyScene(g));loadQ084(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ084(g.save());drain(g);assert.equal(g.state.battle,null);assert.equal(g.state.stories.q084,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}
  assert.equal(g.state.quests.q084.outcome,route.outcome);assert.equal(awards,1);loadQ084(g.save());
 }assert.deepEqual([...scenes].sort(),['beacon','crossing','entry']);
});

test('q084 malformed saves reject atomically without accepting the new family as a legacy item holder',()=>{
 const g=q084Engine(),before=g.save(),old=q084Engine({legacy:true}).save();
 for(const raw of [before,old])for(const mutate of [s=>s.stories.q084.values.beaconDeviceAt='familyGroup',s=>s.stories.q084.values.reached=1,s=>delete s.stories.q084.values.chartCopyAt,s=>s.stories.q084.revision=3,s=>s.stories.q084.events.push('unwritten'),s=>(s.flags.legacyStoryRoutes??={}).q084=true]){
  const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
 }
 const bad=JSON.parse(before);bad.state.stories.q084.values.familyGroupAt='crossing';assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
 const oldBad=JSON.parse(old);oldBad.state.stories.q084.values.familyGroupAt='family';assert.throws(()=>g.load(JSON.stringify(oldBad)));assert.equal(g.save(),before);
});

test('q084 browser fixtures cover both map states, rescue, fixed family, real escorts and preserved old sentences',async()=>{
 const {fixtures,outcomes}=await returnSignalArtFixtures();assert.equal(fixtures.length,62);assert.equal(outcomes.length,3);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const gen of ['current','previous'])for(const map of ['none','informed']){const rows=fixtures.filter(f=>f.variant.startsWith(gen+'-'+map+'-'));assert.equal(new Set(rows.map(f=>f.scene)).size,10);assert.equal(rows.filter(f=>f.variant.endsWith('rescued')).length,3);}
 for(const scene of ['recovered','reached','handoff','expert_arrived']){const f=fixtures.find(f=>f.scene===scene&&f.variant.startsWith('previous'));assert.ok(f);assert.equal(projectGame(loadQ084(f.save)).dialog.text,f.expectedText);assert.equal(f.expectedText,previousQ084.model.graph.find(n=>n.id===scene).text);assert.notEqual(f.expectedText,data.quests.q084.model.graph.find(n=>n.id===scene).text);}
 for(const f of fixtures.filter(f=>f.variant.endsWith('-conditional')))assert.equal(f.expectedText.includes('救難隊から借りた'),f.variant.includes('-informed-'));
 assert.equal(fixtures.filter(f=>f.variant.endsWith('-conditional')).length,4);
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,6);
});
