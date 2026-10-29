import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,choose,go,drain,checkpoint} from './pilgrimage-helpers.mjs';
import {recipientKeys,previousQ037,q037Engine,q037Cast,confessionArtFixtures} from '../tools/confession-art-fixtures.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;
const fixtures=()=>fixturePromise??=confessionArtFixtures();

test('q037 adds only three character links and home casts to the existing quest',()=>{
 const q=structuredClone(data.quests.q037);
 for(const key of recipientKeys){
  assert.equal(q.story.entities['owner_'+key].character,'q037_owner_'+key);
  delete q.story.entities['owner_'+key].character;
  assert.deepEqual(q.story.scenes[key].cast.map(c=>c.entity),['owner_'+key]);q.story.scenes[key].cast=[];
 }
 assert.deepEqual(q,previousQ037);
 assert.equal(q.story.revision,1);assert.equal(q.model.storyUpgrades,undefined);
});

test('q037 fixtures cover each home and all return progress states in current and legacy saves',async()=>{
 const {fixtures:states,outcomes}=await fixtures();assert.equal(states.length,16);assert.equal(outcomes.length,3);
 for(const f of states){
  const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q037Cast(f.scene));
  for(const key of recipientKeys)assert.equal(g.state.stories.q037.values['owner_'+key+'At'],key);
 }
});

test('q037 all six delivery orders preserve old text, choices, journeys and single rewards',()=>{
 const orders=[['first','second','third'],['first','third','second'],['second','first','third'],['second','third','first'],['third','first','second'],['third','second','first']];
 let checks=0;
 for(const order of orders){
  const g=q037Engine({legacy:true}),gold=g.state.gold,members=[...g.state.members],inventory=structuredClone(g.state.inventory),xp=Object.fromEntries(members.map(id=>[id,g.state.actors[id].xp]));
  const verify=()=>{
   const raw=g.save(),current=new GameEngine(data);current.load(raw);assert.equal(current.save(),raw);checkpoint(current);checks++;
   const values=g.state.stories.q037.values;
   for(const key of recipientKeys)assert.equal(values['owner_'+key+'At'],key);
   assert.deepEqual(g.state.members,members);assert.deepEqual(g.state.inventory,inventory);
  };
  verify();
  for(const id of ['move',...order.flatMap(key=>[key,'back']),'finish']){
   const before=structuredClone(g.state.stories.q037.values);
   assert.ok(g.dispatch({type:'choose',id}));verify();drain(g);verify();
   if(g.state.journey){
    const a=g.data.quests.q037.story.actions[g.state.journey.action],values=g.state.stories.q037.values;
    assert.deepEqual(a.journey.companions,[]);assert.equal(values.partyAt,'transit');
    if(recipientKeys.includes(id)){assert.equal(values['letter_'+id+'At'],'party');assert.equal(values[id],false);}
    assert.equal(g.state.gold,gold);assert.equal(g.state.quests.q037.stage,'active');
    go(g,g.data.quests.q037.story.worldPlaces[a.journey.to]);drain(g);verify();
    if(recipientKeys.includes(id)){
     assert.equal(g.state.stories.q037.values['letter_'+id+'At'],'owner_'+id);
     assert.equal(g.state.stories.q037.values[id],true);
     for(const other of recipientKeys.filter(k=>k!==id))assert.equal(g.state.stories.q037.values['letter_'+other+'At'],before['letter_'+other+'At']);
    }
   }
  }
  assert.equal(g.state.quests.q037.outcome,'informed');assert.equal(g.state.gold,gold+93);
  for(const id of members)assert.equal(g.state.actors[id].xp,xp[id]+92);
  const before=g.save();assert.throws(()=>g.complete('q037','informed'));assert.equal(g.save(),before);
 }
 assert.ok(checks>=120);
});

test('q037 depositing any undelivered subset keeps recipients and delivered letters in their houses',()=>{
 for(let mask=0;mask<8;mask++){
  const g=q037Engine();choose(g,'q037','move');
  for(let i=0;i<3;i++)if(mask&(1<<i)){choose(g,'q037',recipientKeys[i]);choose(g,'q037','back');}
  const gold=g.state.gold;choose(g,'q037','deposit');
  assert.equal(g.state.quests.q037.outcome,'compromise');assert.equal(g.state.gold,gold+60);
  for(let i=0;i<3;i++){
   const key=recipientKeys[i];assert.equal(g.state.stories.q037.values['letter_'+key+'At'],mask&(1<<i)?'owner_'+key:'quiet');
   assert.equal(g.state.stories.q037.values['owner_'+key+'At'],key);
  }
  assert.equal(g.state.stories.q037.values.cageAt,'quiet');checkpoint(g);
 }
});

test('q037 malformed legacy states are rejected without changing the running game',()=>{
 const old=q037Engine({legacy:true}),g=q037Engine(),before=g.save();
 for(const mutate of [s=>s.values.owner_firstAt='unknown',s=>delete s.values.letter_secondAt,s=>s.values.extra=true,s=>s.knowledge.party=['unwritten'],s=>s.events.push('unwritten')]){
  const saved=JSON.parse(old.save());mutate(saved.state.stories.q037);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),before);
 }
});

for(const layout of ['classic','scene'])test(`${layout}: q037 renders only the correct recipient at each home`,async()=>{
 const dom=installDOM();let view;
 try{for(const f of (await fixtures()).fixtures){
  const g=new GameEngine(data);g.load(f.save);
  view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));
  const people=dom.root.querySelectorAll('[data-character]');assert.deepEqual([...people].map(p=>p.dataset.character),q037Cast(f.scene));
  for(const p of people){assert.equal(p.querySelector('img').src,data.assets.images['npc_'+p.dataset.character]);assert.ok(p.textContent.includes(data.characters[p.dataset.character].name));}
  if(layout==='classic'&&recipientKeys.includes(f.scene))assert.deepEqual([...dom.root.querySelectorAll('.town-character')].map(i=>i.src),[data.assets.images['npc_q037_owner_'+f.scene]]);
 }}finally{view?.destroy();dom.restore();}
});
