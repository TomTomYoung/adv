import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './library-helpers.mjs';
import {previousQ149,q149Routes,q149Cast,q149LegacyScene,q149Engine,q149AcceptedEngine,loadQ149,chooseQ149,unsoldSwordArtFixtures} from '../tools/unsold-sword-art-fixtures.mjs';
const story=g=>g.state.stories.q149,values=g=>story(g).values;
const depart=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.ok(g.state.journey);loadQ149(g.save());};
const arrive=g=>{const action=g.data.quests.q149.story.actions[g.state.journey.action];go(g,g.data.quests.q149.story.worldPlaces[action.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);};

test('q149 adds only existing farmer and collector, fixed smith, migration and three timing corrections',()=>{
 const q=structuredClone(data.quests.q149);
 assert.equal(q.story.revision,2);assert.equal(q.model.edition.revision,2);
 assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ149.story);
 assert.deepEqual(q.story.entities.smithPerson,{holder:'smithPersonAt',kind:'person',character:'q149_smithPerson'});
 assert.deepEqual(q.story.registry.smithPersonAt.values,['smith']);
 assert.equal(q.story.registry.smithPersonAt.initial,'smith');
 for(const key of ['portrait','sprite'])assert.equal(data.characters.q149_smithPerson[key],undefined);
 for(const [id,s] of Object.entries(q.story.scenes))assert.deepEqual(s.cast.map(c=>q.story.entities[c.entity].character),q149Cast(id));
 assert.equal(Object.keys(q.story.scenes).length,7);assert.equal(Object.keys(q.story.actions).length,11);
 assert.equal(Object.values(q.story.actions).filter(a=>a.journey).length,6);
 for(const [id,a] of Object.entries(q.story.actions))assert.deepEqual(a,previousQ149.story.actions[id]);
 for(const entity of ['farmer','collector']){assert.equal(q.story.entities[entity].character,'q149_'+entity);delete q.story.entities[entity].character;}
 for(const entity of ['farmer','collector'])for(const key of ['portrait','sprite'])assert.equal(data.characters['q149_'+entity][key],undefined);
 delete q.story.entities.smithPerson;delete q.story.registry.smithPersonAt;
 for(const s of Object.values(q.story.scenes))s.cast=[];
 for(const scene of ['entry','delivered','withdrawn']){
  const n=q.model.graph.find(n=>n.id===scene),now=n.text,old=previousQ149.model.graph.find(n=>n.id===scene).text;assert.notEqual(now,old);n.text=old;let changed=0;
  const restore=x=>{if(!x||typeof x!=='object')return;for(const key of Object.keys(x))if(x[key]===now){x[key]=old;changed++;}else restore(x[key]);};restore(q.scripts);assert.equal(changed,1);
 }
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;
 assert.deepEqual(q,previousQ149);
});

test('q149 all seven scenes, six journeys and eleven actions resume from both story generations',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),now=loadQ149(raw);assert.equal(g.save(),raw);
  const before=projectGame(g).dialog,after=projectGame(now).dialog;
  assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  const s=story(now);assert.equal(s.values.smithPersonAt,'smith');
  phases.add(now.state.journey?'journey':now.state.quests.q149.stage==='completed'?'completed':now.state.waiting?.type);
  if(s.scene)scenes.add(s.scene);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q149Cast(s.scene));
  if(now.state.journey){journeys.add(now.state.journey.action);assert.equal(s.scene,null);assert.equal(after?.scene,undefined);assert.equal(s.values.partyAt,'transit');assert.equal(now.dispatch({type:'story.resume',quest:'q149'}),false);arrive(now);}
 };
 for(const legacy of [false,true])for(const route of q149Routes){
  const g=q149Engine({legacy});observe(g);
  for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);
   if(g.state.journey){const a=g.data.quests.q149.story.actions[g.state.journey.action];go(g,g.data.quests.q149.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}
  }
  assert.equal(g.state.quests.q149.outcome,route.outcome);
 }
 assert.equal(scenes.size,7);assert.equal(journeys.size,6);assert.equal(actions.size,11);
 assert.deepEqual([...actions].sort(),Object.keys(data.quests.q149.story.actions).sort());
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase));
});


test('q149 40G is paid exactly once at the workshop before departing with the farmer',()=>{
 for(const legacy of [false,true]){
  let g=q149Engine({legacy});chooseQ149(g,'carry');chooseQ149(g,'user');g.state.gold=39;
  const before=structuredClone(story(g));assert.equal(g.dispatch({type:'choose',id:'pay'}),false);
  assert.deepEqual(story(g),before);assert.equal(g.state.gold,39);assert.equal(values(g).costPaid,false);
  g.state.gold=40;chooseQ149(g,'pay');g=loadQ149(g.save());
  assert.equal(g.state.gold,0);assert.equal(story(g).scene,'user_pay_ready');assert.equal(values(g).costPaid,true);
  assert.equal(values(g).swordAt,'party');assert.equal(values(g).farmerAt,'smith');assert.equal(values(g).smithPersonAt,'smith');
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q149Cast('user_pay_ready'));
  assert.equal(g.dispatch({type:'choose',id:'pay'}),false);assert.equal(g.state.gold,0);
  depart(g,'continue');assert.equal(values(g).farmerAt,'transit');assert.equal(values(g).smithPersonAt,'smith');
  arrive(g);assert.equal(values(g).farmerAt,'farm');assert.equal(values(g).swordAt,'party');assert.equal(values(g).delivered,false);
  chooseQ149(g,'finish');assert.equal(values(g).swordAt,'farmer');assert.equal(g.state.gold,105);
 }
});

test('q149 every route keeps the sword until finish and leaves non-companions at their real locations',()=>{
 for(const legacy of [false,true])for(const route of q149Routes){
  let g=q149Engine({legacy});assert.equal(values(g).swordAt,'entry');
  depart(g,'carry');assert.equal(values(g).swordAt,'party');assert.equal(values(g).farmerAt,'auction');arrive(g);
  g=loadQ149(g.save());assert.equal(values(g).collectorAt,'auction');assert.equal(values(g).smithPersonAt,'smith');
  for(const id of route.path.slice(1,-1)){
   chooseQ149(g,id);g=loadQ149(g.save());
   assert.equal(values(g).swordAt,'party');assert.equal(values(g).finished,false);
   assert.equal(values(g).collectorAt,'auction');assert.equal(values(g).smithPersonAt,'smith');
   assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q149Cast(story(g).scene));
  }
  const fromWorkshop=route.path.includes('user');
  if(route.outcome==='withdraw')assert.equal(values(g).farmerAt,fromWorkshop?'smith':'auction');
  if(route.outcome==='collector')assert.equal(values(g).farmerAt,'auction');
  if(route.outcome==='user')assert.equal(values(g).farmerAt,'farm');
  chooseQ149(g,'finish');
  assert.equal(values(g).swordAt,{collector:'collector',user:'farmer',withdraw:'storage'}[route.outcome]);
  assert.equal(values(g).sold,route.outcome==='collector');assert.equal(values(g).delivered,route.outcome==='user');
  assert.equal(values(g).withdrawn,route.outcome==='withdraw');assert.equal(values(g).costPaid,route.fee===40);
 }
});

test('q149 old waiting text remains intact while newly entered scenes use accurate pre-handoff prose',()=>{
 for(const scene of ['entry','delivered','withdrawn']){
  const route=q149Routes.find(r=>scene==='delivered'?r.outcome==='user':scene==='withdrawn'?r.outcome==='withdraw':true);
  const g=q149Engine({legacy:true});
  for(const id of route.path){if(story(g).scene===scene)break;chooseQ149(g,id);}
  assert.equal(story(g).scene,scene);
  const saved=g.save(),before=projectGame(g).dialog,now=loadQ149(saved),after=projectGame(now).dialog;
  assert.equal(after.text,before.text);assert.deepEqual(after.options,before.options);
  assert.notEqual(data.quests.q149.model.graph.find(n=>n.id===scene).text,previousQ149.model.graph.find(n=>n.id===scene).text);
 }
});

test('q149 rejects forged current and older saves atomically before adding the fixed smith',()=>{
 const g=q149Engine(),raw=g.save(),old=q149Engine({legacy:true}).save();
 for(const input of [raw,old])for(const mutate of [s=>s.stories.q149.values.swordAt='smithPerson',s=>s.stories.q149.values.costPaid=1,s=>s.stories.q149.revision=3,s=>(s.flags.legacyStoryRoutes??={}).q149=true]){
  const bad=JSON.parse(input);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),raw);
 }
 for(const value of [undefined,'transit','auction','party']){
  const bad=JSON.parse(raw);if(value===undefined)delete bad.state.stories.q149.values.smithPersonAt;else bad.state.stories.q149.values.smithPersonAt=value;
  assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),raw);
 }
 const forged=JSON.parse(old);forged.state.stories.q149.values.smithPersonAt='smith';
 assert.throws(()=>g.load(JSON.stringify(forged)));assert.equal(g.save(),raw);
});

test('q149 browser fixtures cover both save generations, shortage, both withdrawal origins and accepted routes',async()=>{
 const {fixtures,outcomes}=await unsoldSwordArtFixtures();
 assert.equal(fixtures.length,20);assert.equal(outcomes.length,3);
 assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const prefix of ['current','previous']){
  const rows=fixtures.filter(f=>f.variant.startsWith(prefix));assert.equal(new Set(rows.map(f=>f.scene)).size,7);
  for(const place of ['auction','smith'])assert.ok(rows.some(f=>f.scene==='withdrawn'&&f.variant===prefix+'-'+place+'-unpaid'));
  assert.equal(rows.filter(f=>f.blockedChoice==='pay').length,1);
  for(const f of rows)assert.deepEqual(f.cast,q149Cast(f.scene));
 }
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,2);
});

test('q149 retreat and defeat retain every pending journey, possession and paid manufacturing fee',()=>{
 const seen=new Set();
 for(const legacy of [false,true])for(const route of q149Routes){
  const g=q149Engine({legacy});
  for(const id of route.path){
   assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.journey){
    const key=legacy+'/'+g.state.journey.action;
    if(!seen.has(key)){
     seen.add(key);const raw=g.save();
     for(const interruption of ['mark','defeat']){
      const now=loadQ149(raw);
      // Town-to-town trips may detour into a dungeon, but return marks are
      // intentionally unavailable while still standing in town.
      if(now.state.mode==='town')go(now,{kind:'dungeon',dungeon:'region_5',map:'region_5_f1',x:1,y:1});
      assert.ok(now.state.journey);
      const s=structuredClone(story(now)),j=structuredClone(now.state.journey);
      if(interruption==='mark')assert.ok(now.dispatch({type:'retreat'}));else now.defeat();drain(now);
      assert.equal(now.state.mode,'town');assert.deepEqual(story(now),s);assert.deepEqual(now.state.journey,j);
      const resumed=loadQ149(now.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q149'}),false);
      arrive(resumed);assert.equal(values(resumed).smithPersonAt,'smith');assert.equal(values(resumed).finished,false);
     }
    }
    arrive(g);
   }
  }
 }
 assert.equal(seen.size,12);
});

test('q149 all routes keep three once-only rewards and do not award for arriving',()=>{
 for(const legacy of [false,true])for(const route of q149Routes){
  const g=loadQ149(q149Engine({legacy}).save()),gold=g.state.gold;let awards=0;
  const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],[105,75]);awards++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(awards,0);chooseQ149(g,id);}
  assert.equal(awards,1);assert.equal(g.state.gold,gold-route.fee+105);assert.equal(g.state.quests.q149.outcome,route.outcome);
  const raw=g.save();assert.throws(()=>g.complete('q149',route.outcome));assert.equal(g.save(),raw);
  g.run(data.quests.q149.model.entryScript);drain(g);assert.equal(awards,1);loadQ149(g.save());
 }
});

test('q149 old accepted routes retain their two scenes, direct endings and 40G manufacturing payment',()=>{
 const scenes=new Set();
 for(const route of q149Routes){
  const g=loadQ149(q149AcceptedEngine().save()),gold=g.state.gold;let awards=0;
  const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],[105,75]);awards++;return award(gp,xp,who);};
  for(const id of route.accepted){scenes.add(q149LegacyScene(g));loadQ149(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ149(g.save());drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q149,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);}
  assert.equal(g.state.quests.q149.outcome,route.outcome);assert.equal(awards,1);assert.equal(g.state.gold,gold-route.fee+105);loadQ149(g.save());
 }
 assert.deepEqual([...scenes].sort(),['entry','user']);
});
