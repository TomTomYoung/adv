import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {storyPlace} from '../src/core/story.js';
import {data,go,drain} from './machine-helpers.mjs';
import {previousQ171,q171Routes,q171Threat,q171AcceptedRoutes,q171WifeScenes,q171FamilyScenes,q171Cast,q171Engine,q171AcceptedEngine,loadQ171,chooseQ171,departQ171,arriveQ171,resolveQ171,resumeQ171,footstepsWifeArtFixtures} from '../tools/footsteps-wife-art-fixtures.mjs';
const story=g=>g.state.stories.q171,values=g=>story(g).values,cast=g=>projectGame(g).dialog.scene?.cast.map(c=>c.id);
const familyLocation=g=>{const d=data.quests.q171.story;assert.equal(values(g).wifeAt,'family');assert.equal(storyPlace(d,story(g),'wife'),storyPlace(d,story(g),'family'));};

test('q171 only adds family membership, four casts and migration; all original actions, prose and rewards remain identical',()=>{
 const q=structuredClone(data.quests.q171);assert.equal(q.story.revision,2);assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ171.story);
 assert.deepEqual(q.model.storyUpgrades[0].values,[{key:'wifeAt',value:'family'}]);
 assert.deepEqual(q.story.entities.wife,{holder:'wifeAt',kind:'person',character:'q171_wife'});
 assert.deepEqual(q.story.registry.wifeAt.values,['family']);assert.equal(q.story.registry.wifeAt.initial,'family');
 for(const key of ['portrait','sprite'])assert.equal(data.characters.q171_wife[key],undefined);
 delete q.story.entities.wife;delete q.story.registry.wifeAt;delete q.model.storyUpgrades;
 for(const id of q171WifeScenes)q.story.scenes[id].cast=structuredClone(previousQ171.story.scenes[id].cast);
 q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ171);
});

test('q171 wife is visible only at the home, never at intake or alongside the family group',()=>{
 for(const r of q171Routes){const g=q171Engine();familyLocation(g);assert.deepEqual(cast(g),[]);
  for(const id of r.path){chooseQ171(g,id);familyLocation(g);if(g.state.quests.q171.stage==='completed')continue;
   assert.deepEqual(cast(g),q171Cast(story(g).scene));assert.ok(!(cast(g).includes('q171_wife')&&cast(g).includes('q171_family')));
   if(q171WifeScenes.includes(story(g).scene))assert.equal(values(g).familyAt,'home');
  }
 }
});

test('q171 every scene, action, journey and battle phase survives current and previous saves with only membership added',()=>{
 const scenes=new Set(),actions=new Set(),journeys=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),h=loadQ171(raw);assert.equal(g.save(),raw);familyLocation(h);
  const before=projectGame(g).dialog,after=projectGame(h).dialog;assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  if(story(h).scene)scenes.add(story(h).scene);phases.add(h.state.battle?'battle':h.state.journey?'journey':h.state.quests.q171.stage==='completed'?'completed':h.state.waiting?.type);
  if(after?.scene)assert.deepEqual(cast(h),q171Cast(story(h).scene));if(h.state.journey){journeys.add(h.state.journey.action);assert.equal(story(h).scene,null);assert.equal(after?.scene,undefined);}
 };
 for(const legacy of [false,true])for(const r of q171Routes){const g=q171Engine({legacy});observe(g);for(const id of r.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.battle){resolveQ171(g,'win');observe(g);}if(g.state.journey){arriveQ171(g);observe(g);}}assert.equal(g.state.quests.q171.outcome,r.outcome);}
 assert.equal(scenes.size,15);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q171.story.actions).sort());
 assert.deepEqual([...journeys].sort(),Object.entries(data.quests.q171.story.actions).filter(([,a])=>a.journey).map(([id])=>id).sort());
 for(const phase of ['text','choice','journey','battle','completed'])assert.ok(phases.has(phase),phase);
});

test('q171 every journey preserves family membership and original progress through retreat and rescue',()=>{
 const seen=new Set();for(const legacy of [false,true])for(const r of q171Routes){const g=q171Engine({legacy});for(const id of r.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.battle)resolveQ171(g,'win');if(!g.state.journey)continue;
  const key=legacy+'/'+g.state.journey.action;if(!seen.has(key)){seen.add(key);const raw=g.save();for(const interruption of ['mark','defeat']){const h=loadQ171(raw);if(h.state.mode==='town')go(h,{kind:'dungeon',dungeon:'region_8',map:'region_8_f1',x:1,y:1});const s=structuredClone(story(h)),j=structuredClone(h.state.journey);
   if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);familyLocation(h);
   const resumed=loadQ171(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q171'}),false);arriveQ171(resumed);familyLocation(resumed);assert.deepEqual(cast(resumed),q171Cast(story(resumed).scene));
  }}arriveQ171(g);
 }}assert.equal(seen.size,2*Object.values(data.quests.q171.story.actions).filter(a=>a.journey).length);
});

test('q171 failed defense keeps the wife with the family and requires actual evacuation before completion',()=>{
 for(const legacy of [false,true])for(const result of ['escape','lose']){let g=q171Engine({legacy});for(const id of [...q171Threat,'fight'])chooseQ171(g,id);chooseQ171(g,'fight',{combat:'pending'});g=loadQ171(g.save());resolveQ171(g,result);
  if(result==='lose'){assert.equal(g.state.mode,'town');assert.equal(values(g).familyAt,'home');g=loadQ171(g.save());resumeQ171(g);}
  assert.equal(values(g).defended,false);assert.equal(g.dispatch({type:'choose',id:'fight'}),false);assert.deepEqual(cast(g),['q171_dai','q171_family']);
  departQ171(g,'evacuate');familyLocation(g);assert.equal(storyPlace(data.quests.q171.story,story(g),'wife'),'transit');assert.equal(values(g).evacuated,false);
  g=loadQ171(g.save());arriveQ171(g);familyLocation(g);assert.equal(values(g).familyAt,'refuge');assert.equal(values(g).evacuated,false);assert.deepEqual(cast(g),['q171_dai','q171_family']);chooseQ171(g,'finish');assert.equal(values(g).evacuated,true);assert.equal(g.state.quests.q171.outcome,'evacuate');
 }
});

test('q171 adding the wife cannot tick the investigation counter or charge for the ward twice',()=>{
 for(const legacy of [false,true]){let g=q171Engine({legacy});for(const id of ['visit','begin','ward'])chooseQ171(g,id);const gold=g.state.gold;assert.equal(values(g).time,0);g=loadQ171(g.save());assert.equal(values(g).wardPaid,true);departQ171(g,'continue');assert.equal(values(g).time,0);arriveQ171(g);assert.equal(values(g).time,1);chooseQ171(g,'return');assert.equal(g.dispatch({type:'choose',id:'ward'}),false);assert.equal(g.state.gold,gold);
  chooseQ171(g,'rule');assert.equal(values(g).time,2);chooseQ171(g,'return');chooseQ171(g,'loop');assert.equal(values(g).sealed,false);chooseQ171(g,'home');assert.equal(values(g).sealed,true);assert.equal(values(g).time,2);familyLocation(g);
 }
});

test('q171 old routes remain playable and rewards are awarded exactly once in all three generations',()=>{
 for(const generation of ['current','previous','accepted'])for(const r of generation==='accepted'?q171AcceptedRoutes:q171Routes){const g=loadQ171(generation==='accepted'?q171AcceptedEngine().save():q171Engine({legacy:generation==='previous'}).save()),reward=data.quests.q171.outcomes[r.outcome];let awards=0;const award=g.award.bind(g);g.award=(gold,xp,who)=>{if(gold===reward.gold&&xp===reward.xp)awards++;return award(gold,xp,who);};
  for(const id of r.path){chooseQ171(g,id);if(generation==='accepted')assert.equal(projectGame(g).dialog?.scene,undefined);}assert.equal(g.state.quests.q171.outcome,r.outcome);assert.equal(awards,1);
  const saved=g.save();const h=loadQ171(saved),before=JSON.stringify({gold:h.state.gold,actors:h.state.actors,vars:h.state.vars});assert.equal(h.accept('q171'),false);assert.throws(()=>h.complete('q171',r.outcome));assert.equal(JSON.stringify({gold:h.state.gold,actors:h.state.actors,vars:h.state.vars}),before);
 }
});

test('q171 malformed old or current saves reject atomically, including family-membership tampering',()=>{
 const target=q171Engine(),before=target.save();
 for(const legacy of [false,true]){const valid=q171Engine({legacy}).save();for(const change of [s=>s.values.time=4,s=>s.values.familyAt='missing',s=>s.events.push('missing'),s=>s.values.wifeAt='home']){const bad=JSON.parse(valid);change(bad.state.stories.q171);assert.throws(()=>target.load(JSON.stringify(bad)));assert.equal(target.save(),before);}}
});

test('q171 display fixtures cover all home appearances and family-only scenes in current and previous saves',async()=>{
 const result=await footstepsWifeArtFixtures();assert.equal(result.outcomes.length,4);
 for(const generation of ['current','previous'])for(const scene of [...q171WifeScenes,...q171FamilyScenes])assert.ok(result.fixtures.some(f=>f.scene===scene&&f.variant.startsWith(generation)));
 assert.ok(result.fixtures.some(f=>f.variant==='accepted'));for(const f of result.fixtures){
  assert.ok(!(f.cast.includes('q171_wife')&&f.cast.includes('q171_family')));
  const options=projectGame(loadQ171(f.save)).dialog.options;
  assert.equal(options.find(o=>o.id===f.availableChoice)?.enabled,true);
  for(const id of f.blockedChoices)assert.equal(options.find(o=>o.id===id)?.enabled,false);
 }
});
