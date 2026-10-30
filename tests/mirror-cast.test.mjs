import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {data,start,choose,go,drain,checkpoint} from './pilgrimage-helpers.mjs';
import {fight} from './helpers.mjs';
import {resolveBattle} from '../tools/audit-regional-relocation.mjs';
import {q040Engine,q040Routes,q040Cast,previousQ040,previousQ040Data,mirrorArtFixtures} from '../tools/mirror-art-fixtures.mjs';
import {previousQ039} from '../tools/mask-art-fixtures.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;
const fixtures=()=>fixturePromise??=mirrorArtFixtures();

test('q040 changes only the outside witness display and three inconsistent prose strings',()=>{
 const q=structuredClone(data.quests.q040);
 assert.equal(q.story.entities.witness.character,'q040_witness');delete q.story.entities.witness.character;
 assert.deepEqual(q.story.scenes.shadow.cast.map(c=>c.entity),['witness']);q.story.scenes.shadow.cast=[];
 const node=(quest,id)=>quest.model.graph.find(n=>n.id===id);
 const strings=[
  [q.outcomes.fragment.label,previousQ040.outcomes.fragment.label],
  [q.outcomes.fragment.text,previousQ040.outcomes.fragment.text],
  [node(q,'fragment').text,node(previousQ040,'fragment').text]
 ];
 assert.match(q.outcomes.fragment.label,/日付.*鏡はその場に残す/);
 assert.match(q.outcomes.fragment.text,/日付だけ/);assert.match(node(q,'fragment').text,/名前と言葉の続きは空白/);
 let normalized=JSON.stringify(q);for(const [current,old] of strings)normalized=normalized.replaceAll(current,old);
 assert.deepEqual(JSON.parse(normalized),previousQ040);
 assert.equal(q.story.revision,1);assert.equal(q.model.storyUpgrades,undefined);
});

test('q040 fixtures cover all scenes and distinguish isolated mirrors with and without copies',async()=>{
 const {fixtures:states,outcomes}=await fixtures();assert.equal(states.length,16);assert.equal(outcomes.length,4);
 for(const f of states){const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q040Cast(f.scene));}
});

test('q040 old saves stay byte-for-byte while the fragment choice label uses the corrected current definition',()=>{
 const phases=new Set(),scenes=new Set();let checks=0,correctedChoice=false;
 const check=g=>{
  const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);
  const current=new GameEngine(data);current.load(raw);assert.equal(current.save(),raw);checkpoint(current);checks++;
  const oldDialog=projectGame(g).dialog,currentDialog=projectGame(current).dialog;
  if(oldDialog?.type==='choice'){
   assert.equal(currentDialog.text,oldDialog.text);
   const expected=structuredClone(oldDialog.options);
   if(g.state.stories.q040.scene==='after'){
    const fragment=expected.find(o=>o.id==='fragment');assert.equal(fragment.text,'聞き取れた断片だけ記録して鏡を保管する');
    fragment.text='覚えている日付を記録し、鏡はその場に残す';correctedChoice=true;
   }
   assert.deepEqual(currentDialog.options,expected);
  }
  phases.add(g.state.battle?'battle':g.state.journey?'journey':g.state.quests.q040.stage==='completed'?'completed':g.state.waiting?.type);
  if(g.state.stories.q040.scene)scenes.add(g.state.stories.q040.scene);
 };
 for(const route of q040Routes){
  const g=q040Engine({legacy:true});check(g);
  for(const id of route.path){
   assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);
   if(g.state.battle){check(g);g.healAll();fight(g);check(g);}
   if(g.state.journey){const a=g.data.quests.q040.story.actions[g.state.journey.action];go(g,g.data.quests.q040.story.worldPlaces[a.journey.to]);drain(g);check(g);}
  }
  assert.equal(g.state.quests.q040.outcome,route.outcome);check(g);
 }
 for(const phase of ['text','choice','journey','battle','completed'])assert.ok(phases.has(phase),phase);
 assert.deepEqual([...scenes].sort(),Object.keys(data.quests.q040.story.scenes).sort());assert.ok(checks>=70);assert.ok(correctedChoice);
});

test('q040 current and resumed old routes keep the witness stationary and transfer only on the existing arrivals',()=>{
 for(const legacy of [false,true])for(const route of q040Routes){
  const old=q040Engine({legacy}),g=new GameEngine(data);g.load(old.save());g.random=()=>.999999;
  const members=[...g.state.members];let payments=0;const complete=g.complete.bind(g);
  g.complete=(id,outcome)=>{const gold=g.state.gold;const result=complete(id,outcome);if(id==='q040'){payments++;assert.equal(g.state.gold-gold,data.quests.q040.outcomes[outcome].gold);}return result;};
  for(const id of route.path){
   assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.battle){g.healAll();fight(g);}
   if(g.state.journey){
    const a=data.quests.q040.story.actions[g.state.journey.action],v=g.state.stories.q040.values;
    assert.deepEqual(a.journey.companions,[]);assert.equal(v.witnessAt,'record');assert.equal(v.partyAt,'transit');
    if(a.journey.to==='isolation')assert.equal(v.mirrorAt,'party');else assert.equal(v.mirrorAt,'entry');
    if(g.state.journey.action==='witness_copy'){assert.equal(v.copyAt,'party');assert.equal(v.testimony,false);}
    checkpoint(g);go(g,data.quests.q040.story.worldPlaces[a.journey.to]);drain(g);
   }
   assert.equal(g.state.stories.q040.values.witnessAt,'record');assert.deepEqual(g.state.members,members);checkpoint(g);
  }
  const v=g.state.stories.q040.values,copied=route.path.includes('copy');
  assert.equal(g.state.quests.q040.outcome,route.outcome);assert.equal(v.testimony,copied);
  assert.equal(v.mirrorAt,route.outcome==='compromise'?'isolation':'entry');
  assert.equal(v.copyAt,copied?(route.outcome==='informed'?'witness':'isolation'):'party');
  if(route.outcome==='fragment'){assert.equal(v.partyAt,'record');assert.equal(v.testimony,false);assert.equal(g.state.stories.q040.knowledge.party?.includes('truth')??false,false);}
  assert.equal(payments,1);const before=g.save();assert.throws(()=>complete('q040',route.outcome));assert.equal(g.save(),before);
  const gold=g.state.gold;g.run(data.quests.q040.model.entryScript);drain(g);assert.equal(g.state.gold,gold);assert.equal(payments,1);
 }
});

test('q040 saved battles still forbid escape and losses resume without premature outcomes',()=>{
 for(const path of [['seal'],['listen','fight'],['listen','copy','defend']]){
  const old=q040Engine({legacy:true});for(const id of path.slice(0,-1))choose(old,'q040',id);
  choose(old,'q040',path.at(-1),{combat:'pending'});const g=new GameEngine(data);g.load(old.save());assert.equal(g.save(),old.save());
  assert.equal(g.state.battle.encounter,'boss_4');assert.equal(g.dispatch({type:'battle',action:'escape'}),false);
  resolveBattle(g,'lose');checkpoint(g);assert.equal(g.state.quests.q040.stage,'active');assert.equal(g.state.stories.q040.values.finished,false);
  assert.equal(g.state.stories.q040.values.witnessAt,'record');
  const scene=g.state.stories.q040.scene;go(g,data.quests.q040.story.worldPlaces[data.quests.q040.story.scenes[scene].place]);
  assert.ok(g.dispatch({type:'story.resume',quest:'q040'}));drain(g);
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q040Cast(scene));checkpoint(g);
 }
});

test('q040 old saves reject invalid holders, knowledge and events atomically',()=>{
 const old=q040Engine({legacy:true}),g=q040Engine(),before=g.save();
 for(const mutate of [s=>s.values.witnessAt='nowhere',s=>delete s.values.copyAt,s=>s.values.extraState=true,s=>s.knowledge.party=['unwritten'],s=>s.events.push('unwritten')]){
  const raw=JSON.parse(old.save());mutate(raw.state.stories.q040);assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);
 }
});

test('q040 narration can resume alongside a q039 revision migration',()=>{
 const oldData={...previousQ040Data,quests:{...previousQ040Data.quests,q039:previousQ039},scripts:{...previousQ040Data.scripts,...previousQ039.scripts}};
 const old=new GameEngine(oldData);old.load(q040Engine({legacy:true}).save());old.random=()=>.999999;
 choose(old,'q040','listen');choose(old,'q040','copy');choose(old,'q040','remove');choose(old,'q040','carry');choose(old,'q040','finish');
 start(old,'q039');choose(old,'q039','gather');const raw=JSON.parse(old.save()),g=new GameEngine(data);g.load(JSON.stringify(raw));
 const expected=structuredClone(raw);expected.state.stories.q039.revision=2;Object.assign(expected.state.stories.q039.values,{repairerAt:'entry',claimantsAt:'entry'});
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);choose(g,'q039','copies');assert.equal(g.state.quests.q039.outcome,'compromise');
});

for(const layout of ['classic','scene'])test(layout+': q040 renders one outside witness only at the copy handoff',async()=>{
 const dom=installDOM();let view;
 try{for(const f of (await fixtures()).fixtures){
  const g=new GameEngine(data);g.load(f.save);view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));
  const people=dom.root.querySelectorAll('[data-character]');assert.equal(people.length,f.scene==='shadow'?1:0);
  if(people.length){assert.equal(people[0].dataset.character,'q040_witness');assert.equal(people[0].querySelector('img').src,data.assets.images.npc_q040_witness);}
 }}finally{view?.destroy();dom.restore();}
});
