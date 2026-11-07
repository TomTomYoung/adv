import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,choose,go,drain,checkpoint} from './machine-helpers.mjs';
import {previousQ179,q179Routes,q179AcceptedRoutes,q179Cast,q179Engine,q179AcceptedEngine,upgradeQ179,gardenVisit,gardenArtFixtures} from '../tools/garden-art-fixtures.mjs';

test('q179 preserves every action effect and owner while adding four roles and clarifying three confirmations',()=>{
 const q=structuredClone(data.quests.q179);assert.deepEqual(q.model.storyUpgrades[0],{fromRevision:1,toRevision:2,previous:previousQ179.story,values:[1,2,3].map(i=>({key:'house'+i+'PersonAt',value:'house'+i}))});
 delete q.story.entities.keeper.character;for(let i=1;i<=3;i++){delete q.story.entities['house'+i+'Person'];delete q.story.registry['house'+i+'PersonAt'];}
 for(const s of Object.values(q.story.scenes))s.cast=[];
 for(const id of ['burned','rush','damaged']){
  const old=previousQ179.model.graph.find(n=>n.id===id),node=q.model.graph.find(n=>n.id===id);assert.notEqual(node.text,old.text);node.text=old.text;
  const commands=q.scripts['q179.machine.'+id].commands;commands.find(c=>c.op==='narrate').text=old.text;
 }
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ179);
 for(const id of ['q179_keeper','q179_house1','q179_house2','q179_house3']){assert.equal(data.characters[id].portrait,undefined);assert.equal(data.characters[id].sprite,undefined);}
});

test('q179 migrates every waiting phase, all 17 scenes, all 15 journeys and completion without replaying effects',()=>{
 const phases=new Set(),scenes=new Set(),journeys=new Set();
 const observe=g=>{const raw=g.save(),now=upgradeQ179(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(g.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);phases.add(g.state.journey?'journey':g.state.quests.q179.stage==='completed'?'completed':g.state.waiting?.type);if(g.state.stories.q179.scene)scenes.add(g.state.stories.q179.scene);if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q179Cast(now.state.stories.q179.scene));
  if(now.state.journey){const j=now.state.journey,a=data.quests.q179.story.actions[j.action];journeys.add(j.action);assert.equal(now.state.stories.q179.scene,null);assert.equal(after?.scene,undefined);assert.equal(now.dispatch({type:'story.resume',quest:'q179'}),false);now.random=()=>.999999;go(now,data.quests.q179.story.worldPlaces[a.journey.to]);drain(now);assert.equal(now.state.journey,null);checkpoint(now);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),q179Cast(now.state.stories.q179.scene));}
 };
 for(const legacy of [false,true])for(const route of q179Routes){const g=q179Engine({legacy});observe(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q179.story.actions[g.state.journey.action];go(g,g.data.quests.q179.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q179.outcome,route.outcome);}
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);assert.equal(scenes.size,17);assert.equal(journeys.size,15);
});

test('q179 all six visit orders and all eight answers retain distinct owners and prevent duplicate responses',()=>{
 for(const legacy of [false,true])for(const order of [[1,2,3],[1,3,2],[2,1,3],[2,3,1],[3,1,2],[3,2,1]])for(let mask=0;mask<8;mask++){
  const g=upgradeQ179(q179Engine({legacy}).save());g.random=()=>.999999;for(const c of ['visit','begin'])choose(g,'q179',c);const gold=g.state.gold,members=[...g.state.members],answers=order.map(i=>mask&(1<<(i-1))?'collect':'reject');
  for(const [k,i] of order.entries()){choose(g,'q179','house'+i);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q179_keeper','q179_house'+i]);choose(g,'q179',answers[k]);choose(g,'q179','return');assert.equal(g.state.stories.q179.values.homes,k+1);assert.equal(g.dispatch({type:'choose',id:'house'+i}),false);if(k<2)assert.equal(g.dispatch({type:'choose',id:'starve'}),false);}
  choose(g,'q179','starve');const v=()=>g.state.stories.q179.values;for(let i=1;i<=3;i++)assert.equal(v()['marker'+i+'At'],mask&(1<<(i-1))?'party':'house'+i);choose(g,'q179','finish');for(let i=1;i<=3;i++){assert.equal(v()['marker'+i+'At'],mask&(1<<(i-1))?'garden':'house'+i);assert.equal(v()['house'+i+'PersonAt'],'house'+i);}assert.equal(v().burned,false);assert.equal(g.state.gold,gold+141);assert.deepEqual(g.state.members,members);const raw=g.save();assert.throws(()=>g.complete('q179','starve'));assert.equal(g.save(),raw);
 }
});

test('q179 rope, cutting, burning and aid become true only at the original confirmations, with one reward',()=>{
 for(const legacy of [false,true])for(const outcome of ['burn','damage'])for(const visited of [false,true]){
  const g=upgradeQ179(q179Engine({legacy}).save());g.random=()=>.999999;const rope=g.state.inventory.rope,members=[...g.state.members];let rewards=0;const award=g.award.bind(g);g.award=(gold,xp,recipients)=>{assert.deepEqual([gold,xp],[141,93]);rewards++;return award(gold,xp,recipients);};for(const c of ['visit','begin',...(visited?gardenVisit():[])])choose(g,'q179',c);
  const v=()=>g.state.stories.q179.values;
  if(outcome==='burn'){choose(g,'q179','cut');assert.equal(g.state.inventory.rope,rope-1);checkpoint(g);choose(g,'q179','continue');for(let i=1;i<=3;i++){assert.equal(v()['root'+i+'Cut'],false);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q179_keeper']);choose(g,'q179','cut');assert.equal(v()['root'+i+'Cut'],true);}assert.equal(v().burned,false);assert.equal(v().homesDamaged,false);choose(g,'q179','finish');assert.equal(v().burned,true);assert.equal(v().homesDamaged,false);assert.equal(v().aidRequested,false);}
  else{choose(g,'q179','rush');assert.equal(v().burned,false);assert.equal(v().homesDamaged,false);assert.ok(g.dispatch({type:'choose',id:'report'}));drain(g);assert.ok(g.state.journey);assert.equal(v().burned,true);assert.equal(v().homesDamaged,true);assert.equal(v().aidRequested,false);const a=data.quests.q179.story.actions[g.state.journey.action];go(g,data.quests.q179.story.worldPlaces[a.journey.to]);drain(g);assert.equal(v().aidRequested,false);choose(g,'q179','finish');assert.equal(v().aidRequested,true);}
  assert.equal(g.state.inventory.rope,rope-(outcome==='burn'?1:0));assert.equal(g.state.quests.q179.outcome,outcome);assert.equal(rewards,1);assert.deepEqual(g.state.members,members);const raw=g.save();assert.throws(()=>g.complete('q179',outcome));assert.equal(g.save(),raw);
 }
});

test('q179 browser checkpoints preserve old text and choices and use corrected text after old journey arrival',async()=>{
 const r=await gardenArtFixtures();assert.equal(r.fixtures.length,39);assert.equal(r.outcomes.length,3);assert.equal(new Set(r.fixtures.map(f=>f.scene+'/'+f.variant)).size,39);
 for(const f of r.fixtures){const dialog=projectGame(upgradeQ179(f.save)).dialog;assert.equal(dialog.text,f.expectedText);if(f.absentStoryScene)assert.equal(dialog.scene,undefined);else assert.deepEqual(dialog.scene.cast.map(c=>c.id),f.cast);}
 for(const scene of ['burned','rush','damaged']){const get=variant=>r.fixtures.find(f=>f.scene===scene&&f.variant===variant).expectedText;assert.notEqual(get('previous'),get('current'));assert.equal(get('previous-arrived'),get('current'));}
});

test('q179 rejects invalid person positions and new marker owners atomically and migrates idempotently',()=>{
 const g=q179Engine(),raw=g.save(),old=q179Engine({legacy:true}).save();
 for(let i=1;i<=3;i++)for(const [key,value] of [['house'+i+'PersonAt','garden'],['marker'+i+'At','house'+i+'Person']]){const saved=JSON.parse(raw);saved.state.stories.q179.values[key]=value;assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
 for(const mutate of [s=>s.stories.q179.values.house1PersonAt='house1',s=>s.stories.q179.values.marker1At='unknown',s=>(s.flags.legacyStoryRoutes??={}).q179=true]){const saved=JSON.parse(old);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}assert.equal(upgradeQ179(raw).save(),raw);
});

test('q179 accepted old routes retain three endings and one reward without relocated scenes',()=>{
 for(const route of q179AcceptedRoutes){const g=upgradeQ179(q179AcceptedEngine().save()),gold=g.state.gold;let rewards=0;const award=g.award.bind(g);g.award=(...args)=>{rewards++;return award(...args);};for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q179,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}assert.equal(g.state.quests.q179.outcome,route.outcome);assert.equal(g.state.gold,gold+141);assert.equal(rewards,1);}
});
