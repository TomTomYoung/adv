import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain,checkpoint} from './pilgrimage-helpers.mjs';
import {q034Engine,q034Routes,previousQ034,previousQ034Data,receiptArtFixtures} from '../tools/receipt-art-fixtures.mjs';
import {previousQ032} from '../tools/chapel-art-fixtures.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;
const fixtures=()=>fixturePromise??=receiptArtFixtures();

test('q034 changes only character bindings and scene casts, preserving prose, actions and save revision',()=>{
 const q=structuredClone(data.quests.q034);
 assert.equal(q.story.entities.merchant.character,'q034_merchant');assert.equal(q.story.entities.victims.character,'q034_victims');
 for(const [id,s] of Object.entries(q.story.scenes))assert.deepEqual(s.cast.map(c=>c.entity),id==='consent'?['merchant','victims']:['merchant']);
 delete q.story.entities.merchant.character;delete q.story.entities.victims.character;
 for(const s of Object.values(q.story.scenes))s.cast=[];
 assert.deepEqual(q,previousQ034);assert.equal(q.story.revision,1);
 const group=data.characters.q034_victims;assert.equal(group.name,'被害者たち');assert.equal(group.portrait,undefined);assert.equal(group.sprite,undefined);
});

test('q034 fixtures cover unread/read meetings and the document kept after postponement',async()=>{
 const {fixtures:states,outcomes}=await fixtures();assert.equal(states.length,10);assert.equal(outcomes.length,3);
 for(const f of states){const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),f.cast);}
});

test('q034 old dialogue, choices, return journeys and completion resume byte-for-byte',()=>{
 let checks=0;const phases=new Set();
 const check=g=>{const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);const current=new GameEngine(data);current.load(raw);assert.equal(current.save(),raw);checkpoint(current);checks++;phases.add(g.state.journey?'journey':g.state.quests.q034.stage==='completed'?'completed':g.state.waiting?.type);};
 for(const route of q034Routes){
  const g=q034Engine({legacy:true});check(g);
  for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);if(g.state.journey){const a=g.data.quests.q034.story.actions[g.state.journey.action];go(g,g.data.quests.q034.story.worldPlaces[a.journey.to]);drain(g);check(g);}}
  assert.equal(g.state.quests.q034.outcome,route.outcome);check(g);
 }
 assert.ok(checks>=70);for(const phase of ['choice','journey','completed'])assert.ok(phases.has(phase));
});

test('q034 moves only the merchant, transfers the original once, and records consent only on arrangement',()=>{
 for(const route of q034Routes){
  const g=q034Engine(),members=[...g.state.members],inventory=structuredClone(g.state.inventory),gold=g.state.gold,xp=Object.fromEntries(members.map(id=>[id,g.state.actors[id].xp]));
  for(const id of route.path){
   assert.equal(g.state.stories.q034.values.consent,false);assert.throws(()=>g.complete('q034','compromise'));
   assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.journey){
    const a=g.data.quests.q034.story.actions[g.state.journey.action],s=g.state.stories.q034;
    assert.deepEqual(a.journey.companions,['merchant']);assert.equal(s.values.partyAt,'transit');assert.equal(s.values.merchantAt,'transit');assert.equal(s.values.victimsAt,'meeting');assert.equal(s.values.documentAt,'party');assert.equal(s.values.consent,false);assert.equal(g.state.quests.q034.stage,'active');checkpoint(g);
    const expected=JSON.parse(g.save());expected.state.notice='';assert.equal(g.dispatch({type:'choose',id:'arrange'}),false);assert.deepEqual(JSON.parse(g.save()),expected,'only the existing notice reset is allowed');
    go(g,g.data.quests.q034.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.stories.q034.values.merchantAt,a.journey.to);assert.equal(g.state.quests.q034.stage,'active');
   }
   assert.equal(g.state.stories.q034.values.victimsAt,'meeting');assert.deepEqual(g.state.members,members);assert.deepEqual(g.state.inventory,inventory);checkpoint(g);
  }
  const s=g.state.stories.q034,reward=data.quests.q034.outcomes[route.outcome];
  assert.equal(s.values.documentAt,route.outcome==='compromise'?'party':'merchant');assert.equal(s.values.consent,route.outcome==='compromise');assert.equal(g.state.gold,gold+reward.gold);
  for(const id of members){assert.ok(g.state.actors[id].hp>0);assert.equal(g.state.actors[id].xp,xp[id]+reward.xp);}
  assert.equal(g.state.quests.q034.outcome,route.outcome);const before=g.save();assert.throws(()=>g.complete('q034',route.outcome));assert.equal(g.save(),before);
 }
});

test('q034 invalid holders, knowledge and unrecorded events are rejected atomically',()=>{
 const old=q034Engine({legacy:true}),g=q034Engine(),before=g.save();
 for(const mutate of [s=>s.values.victimsAt='nowhere',s=>delete s.values.documentAt,s=>s.values.extraState=true,s=>s.knowledge.party=['unwritten'],s=>s.events.push('unwritten')]){
  const raw=JSON.parse(old.save());mutate(raw.state.stories.q034);assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);
 }
});

test('q034 unchanged saves coexist with the declared q032 revision migration',()=>{
 const oldData={...previousQ034Data,quests:{...previousQ034Data.quests,q032:previousQ032},scripts:{...previousQ034Data.scripts,...previousQ032.scripts},characters:Object.fromEntries(Object.entries(previousQ034Data.characters).filter(([id])=>!id.startsWith('q032_')))};
 const old=new GameEngine(oldData);old.load(ready().save());old.random=()=>.999999;start(old,'q032');choose(old,'q032','plate');start(old,'q034');choose(old,'q034','meeting');
 const raw=JSON.parse(old.save());assert.deepEqual(validateSave(raw,oldData),[]);const g=new GameEngine(data);g.load(JSON.stringify(raw));const expected=structuredClone(raw);
 expected.state.stories.q032.revision=2;Object.assign(expected.state.stories.q032.values,{prisonerAt:'cell',craftspersonAt:'workshop'});assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);choose(g,'q034','arrange');assert.equal(g.state.quests.q034.outcome,'compromise');
});

for(const layout of ['classic','scene'])test(`${layout}: q034 keeps the collective label in the meeting and shows only the merchant portrait`,async()=>{
 const dom=installDOM();let view;
 try{for(const f of (await fixtures()).fixtures){
  const g=new GameEngine(data);g.load(f.save);view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));
  const people=dom.root.querySelectorAll('[data-character]');assert.equal(people.length,f.cast.length);
  assert.equal(dom.root.querySelector('[data-character="q034_merchant"] img').src,data.assets.images.npc_q034_merchant);
  const group=dom.root.querySelector('[data-character="q034_victims"]');
  if(f.scene==='consent'){assert.ok(group.classList.contains('name-only'));assert.equal(group.querySelector('img'),null);assert.equal(group.querySelector('figcaption').textContent,'被害者たち');if(layout==='classic')assert.deepEqual([...dom.root.querySelectorAll('.town-character')].map(i=>i.src),[data.assets.images.npc_q034_merchant]);}
  else assert.equal(group,null);
 }}finally{view?.destroy();dom.restore();}
});
