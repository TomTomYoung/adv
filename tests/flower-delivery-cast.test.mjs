import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './library-helpers.mjs';
import {previousQ147,q147Routes,q147Cast,q147LegacyScene,q147Engine,q147AcceptedEngine,loadQ147,chooseQ147,flowerDeliveryArtFixtures} from '../tools/flower-delivery-art-fixtures.mjs';
const story=g=>g.state.stories.q147,values=g=>story(g).values;
const depart=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.ok(g.state.journey);loadQ147(g.save());};
const arrive=g=>{const action=g.data.quests.q147.story.actions[g.state.journey.action];go(g,g.data.quests.q147.story.worldPlaces[action.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);};

test('q147 adds only a fixed recipient, migration and three pre-commit descriptions',()=>{
 const q=structuredClone(data.quests.q147);
 assert.equal(q.story.revision,2);assert.equal(q.model.edition.revision,2);
 assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ147.story);
 assert.deepEqual(q.story.entities.recipient,{holder:'recipientAt',kind:'person',character:'q147_recipient'});
 assert.deepEqual(q.story.registry.recipientAt.values,['receiver']);
 assert.equal(q.story.registry.recipientAt.initial,'receiver');
 for(const key of ['portrait','sprite'])assert.equal(data.characters.q147_recipient[key],undefined);
 for(const [id,s] of Object.entries(q.story.scenes))assert.deepEqual(s.cast.map(c=>q.story.entities[c.entity].character),q147Cast(id));
 assert.equal(Object.keys(q.story.scenes).length,10);assert.equal(Object.keys(q.story.actions).length,13);
 assert.equal(Object.values(q.story.actions).filter(a=>a.journey).length,9);
 for(const a of Object.values(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,[]);
 delete q.story.entities.recipient;delete q.story.registry.recipientAt;
 for(const s of Object.values(q.story.scenes))s.cast=[];
 for(const scene of ['quiet_arrival','tomorrow_arrival','recorded']){
  const n=q.model.graph.find(n=>n.id===scene),now=n.text,old=previousQ147.model.graph.find(n=>n.id===scene).text;assert.notEqual(now,old);n.text=old;let changed=0;
  const restore=x=>{if(!x||typeof x!=='object')return;for(const key of Object.keys(x))if(x[key]===now){x[key]=old;changed++;}else restore(x[key]);};restore(q.scripts);assert.equal(changed,1);
 }
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;
 assert.deepEqual(q,previousQ147);
});

test('q147 all ten scenes, nine journeys and thirteen actions resume from both story generations',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),now=loadQ147(raw);assert.equal(g.save(),raw);
  const before=projectGame(g).dialog,after=projectGame(now).dialog;
  assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  const s=story(now);assert.equal(s.values.recipientAt,'receiver');
  phases.add(now.state.journey?'journey':now.state.quests.q147.stage==='completed'?'completed':now.state.waiting?.type);
  if(s.scene)scenes.add(s.scene);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q147Cast(s.scene));
  if(now.state.journey){journeys.add(now.state.journey.action);assert.equal(s.scene,null);assert.equal(after?.scene,undefined);assert.equal(s.values.partyAt,'transit');assert.equal(now.dispatch({type:'story.resume',quest:'q147'}),false);arrive(now);}
 };
 for(const legacy of [false,true])for(const route of q147Routes){
  const g=q147Engine({legacy});observe(g);
  for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);
   if(g.state.journey){const a=g.data.quests.q147.story.actions[g.state.journey.action];go(g,g.data.quests.q147.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}
  }
  assert.equal(g.state.quests.q147.outcome,route.outcome);
 }
 assert.equal(scenes.size,10);assert.equal(journeys.size,9);assert.equal(actions.size,13);
 assert.deepEqual([...actions].sort(),Object.keys(data.quests.q147.story.actions).sort());
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase));
});

test('q147 car rental costs 30G once, before the flower is picked up or its route is chosen',()=>{
 for(const legacy of [false,true]){
  let g=q147Engine({legacy});g.state.gold=29;const before=structuredClone(story(g));
  assert.equal(g.dispatch({type:'choose',id:'car'}),false);assert.equal(g.state.gold,29);assert.deepEqual(story(g),before);
  g.state.gold=30;chooseQ147(g,'car');g=loadQ147(g.save());
  assert.equal(g.state.gold,0);assert.equal(story(g).scene,'entry_car_ready');assert.equal(values(g).carPaid,true);
  assert.equal(values(g).flowerAt,'entry');assert.equal(values(g).deliveryMode,'pending');assert.equal(g.state.journey,null);
  depart(g,'continue');assert.equal(values(g).flowerAt,'party');assert.equal(values(g).deliveryMode,'car');assert.equal(g.state.gold,0);
  arrive(g);assert.equal(story(g).scene,'car');assert.equal(values(g).flowerClosed,false);assert.equal(g.state.gold,0);
  chooseQ147(g,'deliver');assert.equal(values(g).flowerAt,'party');assert.equal(values(g).delivered,false);
  chooseQ147(g,'finish');assert.equal(g.state.gold,105);assert.equal(values(g).flowerAt,'receiver');
 }
});

test('q147 quiet travel retains the flower until recipient confirmation, not just arrival',()=>{
 for(const legacy of [false,true])for(const vehicle of [false,true]){
  let g=q147Engine({legacy});if(vehicle)chooseQ147(g,'car');depart(g,vehicle?'continue':'water');
  assert.equal(values(g).flowerAt,'party');assert.equal(values(g).flowerClosed,false);arrive(g);g=loadQ147(g.save());
  depart(g,'deliver');assert.equal(values(g).delivered,false);arrive(g);
  assert.equal(story(g).scene,'quiet_arrival');assert.equal(values(g).flowerAt,'party');assert.equal(values(g).finished,false);
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q147_recipient']);
  chooseQ147(g,'finish');assert.equal(values(g).flowerAt,'receiver');assert.equal(values(g).delivered,true);
 }
});

test('q147 overnight redelivery stores and retrieves the flower at distinct arrivals and departures',()=>{
 for(const legacy of [false,true]){
  let g=q147Engine({legacy});depart(g,'run');assert.equal(values(g).flowerClosed,false);arrive(g);assert.equal(values(g).flowerClosed,true);
  chooseQ147(g,'deliver');g=loadQ147(g.save());assert.equal(story(g).scene,'closed');assert.equal(values(g).flowerAt,'party');
  depart(g,'tomorrow');assert.equal(values(g).redeliveryAgreed,true);assert.equal(values(g).flowerAt,'party');assert.equal(values(g).overnight,false);
  arrive(g);assert.equal(story(g).scene,'rest');assert.equal(values(g).flowerAt,'rest');assert.equal(values(g).flowerClosed,true);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  g=loadQ147(g.save());depart(g,'next');assert.equal(values(g).flowerAt,'party');assert.equal(values(g).flowerClosed,false);assert.equal(values(g).overnight,true);
  arrive(g);assert.equal(story(g).scene,'tomorrow_arrival');assert.equal(values(g).flowerAt,'party');assert.equal(values(g).delivered,false);
  chooseQ147(g,'finish');assert.equal(values(g).flowerAt,'receiver');assert.equal(values(g).delivered,true);assert.equal(values(g).deliveryFailed,false);
 }
});

test('q147 race-only settlement does not claim delivery and transfers the closed flower only at finish',()=>{
 for(const legacy of [false,true]){
  let g=q147Engine({legacy});chooseQ147(g,'run');chooseQ147(g,'deliver');g=loadQ147(g.save());
  depart(g,'record');assert.equal(values(g).flowerAt,'party');assert.equal(values(g).deliveryFailed,false);arrive(g);
  assert.equal(story(g).scene,'recorded');assert.equal(values(g).flowerAt,'party');assert.equal(values(g).deliveryFailed,false);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  chooseQ147(g,'finish');assert.equal(values(g).flowerAt,'record');assert.equal(values(g).flowerClosed,true);
  assert.equal(values(g).delivered,false);assert.equal(values(g).deliveryFailed,true);assert.equal(values(g).redeliveryAgreed,false);
 }
});

test('q147 retreat and defeat retain every pending journey, possession and paid rental',()=>{
 const seen=new Set();
 for(const legacy of [false,true])for(const route of q147Routes){
  const g=q147Engine({legacy});
  for(const id of route.path){
   assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.journey){
    const key=legacy+'/'+g.state.journey.action;
    if(!seen.has(key)){
     seen.add(key);const raw=g.save();
     for(const interruption of ['mark','defeat']){
      const now=loadQ147(raw);
      // Town-to-town trips may detour into a dungeon, but return marks are
      // intentionally unavailable while still standing in town.
      if(now.state.mode==='town')go(now,{kind:'dungeon',dungeon:'region_5',map:'region_5_f1',x:1,y:1});
      assert.ok(now.state.journey);
      const s=structuredClone(story(now)),j=structuredClone(now.state.journey);
      if(interruption==='mark')assert.ok(now.dispatch({type:'retreat'}));else now.defeat();drain(now);
      assert.equal(now.state.mode,'town');assert.deepEqual(story(now),s);assert.deepEqual(now.state.journey,j);
      const resumed=loadQ147(now.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q147'}),false);
      arrive(resumed);assert.equal(values(resumed).recipientAt,'receiver');assert.equal(values(resumed).finished,false);
     }
    }
    arrive(g);
   }
  }
 }
 assert.equal(seen.size,18);
});

test('q147 all routes keep three once-only rewards and do not award for arriving',()=>{
 for(const legacy of [false,true])for(const route of q147Routes){
  const g=loadQ147(q147Engine({legacy}).save()),gold=g.state.gold;let awards=0;
  const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],[105,75]);awards++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(awards,0);chooseQ147(g,id);}
  assert.equal(awards,1);assert.equal(g.state.gold,gold-route.fee+105);assert.equal(g.state.quests.q147.outcome,route.outcome);
  const raw=g.save();assert.throws(()=>g.complete('q147',route.outcome));assert.equal(g.save(),raw);
  g.run(data.quests.q147.model.entryScript);drain(g);assert.equal(awards,1);loadQ147(g.save());
 }
});

test('q147 old accepted routes retain their two scenes, direct endings and rental payment',()=>{
 const scenes=new Set();
 for(const route of q147Routes){
  const g=loadQ147(q147AcceptedEngine().save()),gold=g.state.gold;let awards=0;
  const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],[105,75]);awards++;return award(gp,xp,who);};
  for(const id of route.accepted){scenes.add(q147LegacyScene(g));loadQ147(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ147(g.save());drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q147,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);}
  assert.equal(g.state.quests.q147.outcome,route.outcome);assert.equal(awards,1);assert.equal(g.state.gold,gold-route.fee+105);loadQ147(g.save());
 }
 assert.deepEqual([...scenes].sort(),['closed','entry']);
});

test('q147 rejects malformed current and previous state atomically before adding the recipient',()=>{
 const g=q147Engine(),raw=g.save(),old=q147Engine({legacy:true}).save();
 for(const input of [raw,old])for(const mutate of [s=>s.stories.q147.values.flowerAt='recipient',s=>s.stories.q147.values.flowerClosed=1,s=>s.stories.q147.revision=3,s=>(s.flags.legacyStoryRoutes??={}).q147=true]){
  const broken=JSON.parse(input);mutate(broken.state);assert.throws(()=>g.load(JSON.stringify(broken)));assert.equal(g.save(),raw);
 }
 for(const bad of [undefined,'transit','entry','party']){const broken=JSON.parse(raw);if(bad===undefined)delete broken.state.stories.q147.values.recipientAt;else broken.state.stories.q147.values.recipientAt=bad;assert.throws(()=>g.load(JSON.stringify(broken)));assert.equal(g.save(),raw);}
 const forged=JSON.parse(old);forged.state.stories.q147.values.recipientAt='receiver';assert.throws(()=>g.load(JSON.stringify(forged)));assert.equal(g.save(),raw);
});

test('q147 browser fixtures cover both story generations, all scenes, rental shortages and accepted routes',async()=>{
 const {fixtures,outcomes}=await flowerDeliveryArtFixtures();
 assert.equal(fixtures.length,26);assert.equal(outcomes.length,3);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const prefix of ['current','previous']){
  const rows=fixtures.filter(f=>f.variant.startsWith(prefix));assert.equal(new Set(rows.map(f=>f.scene)).size,10);
  for(const mode of ['water','car'])assert.ok(rows.some(f=>f.scene==='quiet_arrival'&&f.variant===prefix+'-'+mode));
  assert.equal(rows.filter(f=>f.blockedChoice==='car').length,1);
  for(const f of rows)assert.deepEqual(f.cast,q147Cast(f.scene));
 }
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,2);
});
