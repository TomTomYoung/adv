import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain,checkpoint} from './pilgrimage-helpers.mjs';
import {fight} from './helpers.mjs';
import {resolveBattle} from '../tools/audit-regional-relocation.mjs';
import {q136Engine,q136Routes,q136Cast,q136TuriAt,previousQ136,previousQ136Data,upgradedQ136Save,q136AcceptedEngine,q136AcceptedRoutes,q136AcceptedChoose,acceptedQ136Data,doorArtFixtures} from '../tools/door-art-fixtures.mjs';
import {previousQ134,upgradedQ134Save} from '../tools/vault-art-fixtures.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;const fixtures=()=>fixturePromise??=doorArtFixtures();
const people=g=>{const s=g.state.stories.q136;assert.equal(s.values.turiAt,q136TuriAt(g.state));assert.equal(s.values.mercenariesAt,'entry');checkpoint(g);};
function step(g,id,check=()=>{}){
 assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);
 if(g.state.battle){g.healAll();fight(g);check(g);}
 if(g.state.journey){const a=g.data.quests.q136.story.actions[g.state.journey.action];go(g,g.data.quests.q136.story.worldPlaces[a.journey.to]);check(g);drain(g);check(g);}
}

test('q136 adds only Turi, an unnumbered mercenary label, eight casts and five escorted journeys',()=>{
 const q=structuredClone(data.quests.q136);assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ136.story);
 assert.equal(q.story.entities.turi.kind,'person');assert.equal(q.story.entities.mercenaries.kind,'group');assert.equal(q.story.entities.mercenaries.character,'q136_mercenary');assert.equal(data.characters.q136_mercenary.portrait,undefined);
 for(const role of ['turi','mercenaries']){assert.equal(q.story.registry[role+'At'].initial,'entry');delete q.story.entities[role];delete q.story.registry[role+'At'];}
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>c.entity==='turi'?'q136_turi':'q136_mercenary'),q136Cast(id));s.cast=[];}
 let journeys=0;for(const a of Object.values(q.story.actions))if(a.journey){journeys++;assert.deepEqual(a.journey.companions,['turi']);a.journey.companions=[];assert.deepEqual(a.effects[0].entities,['party','turi']);a.effects[0].entities=['party'];}
 assert.equal(journeys,5);delete q.model.storyUpgrades;q.story.revision=1;q.model.edition.revision=1;assert.deepEqual(q,previousQ136);assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);
});

test('q136 fixtures cover all eight scenes, both name branches and six accepted old states',async()=>{
 const {fixtures:states,outcomes}=await fixtures();assert.equal(states.length,30);assert.equal(outcomes.length,4);assert.equal(states.filter(f=>f.absentStoryScene).length,6);
 for(const f of states){const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);if(f.absentStoryScene){assert.equal(g.state.stories.q136,undefined);assert.equal(projectGame(g).dialog.scene,undefined);}else{people(g);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q136Cast(f.scene));}}
});

test('q136 old physical saves migrate only two locations and revision in every scene, journey and ending',()=>{
 const phases=new Set(),scenes=new Set(),places=new Set();
 const check=g=>{const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);const current=new GameEngine(data);current.load(raw);assert.deepEqual(JSON.parse(current.save()),upgradedQ136Save(raw));assert.equal(g.save(),raw);people(current);
  const before=projectGame(g).dialog,after=projectGame(current).dialog;assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  phases.add(g.state.battle?'battle':g.state.journey?'journey':g.state.quests.q136.stage==='completed'?'completed':g.state.waiting?.type);if(g.state.stories.q136.scene)scenes.add(g.state.stories.q136.scene);places.add(current.state.stories.q136.values.turiAt);
 };
 for(const route of q136Routes){const g=q136Engine({legacy:true});check(g);for(const id of route.path)step(g,id,check);assert.equal(g.state.quests.q136.outcome,route.outcome);}
 for(const phase of ['text','choice','journey','battle','completed'])assert.ok(phases.has(phase),phase);assert.deepEqual([...scenes].sort(),Object.keys(data.quests.q136.story.scenes).sort());assert.deepEqual([...places].sort(),['entry','record','study','shelter','breach','transit'].sort());
});

test('q136 current and resumed routes preserve name, permissions, knowledge, four endings and one reward',()=>{
 for(const legacy of [false,true])for(const route of q136Routes){const old=q136Engine({legacy}),g=new GameEngine(data);g.load(old.save());g.random=()=>.999999;const members=[...g.state.members],inventory=structuredClone(g.state.inventory);let payments=0;const complete=g.complete.bind(g);
  g.complete=(id,outcome)=>{const gold=g.state.gold,result=complete(id,outcome);if(id==='q136'){payments++;assert.equal(g.state.gold-gold,93);}return result;};
  for(const id of route.path)step(g,id,current=>{people(current);assert.deepEqual(current.state.members,members);if(current.state.journey){assert.equal(current.state.stories.q136.scene,null);assert.equal(current.state.stories.q136.values.turiAt,'transit');assert.equal(current.dispatch({type:'story.resume',quest:'q136'}),false);}});
  assert.equal(g.state.stories.q136.values.name,route.name);assert.equal(g.state.quests.q136.outcome,route.outcome);assert.equal(payments,1);assert.deepEqual(g.state.inventory,inventory);
  const values=g.state.stories.q136.values;assert.equal(values.partyAt,{study:'study',shelter:'shelter',leave:'entry',break:'breach'}[route.outcome]);assert.equal(values.resolution,route.outcome);
  const before=g.save();assert.throws(()=>complete('q136',route.outcome));assert.equal(g.save(),before);g.run(data.quests.q136.model.entryScript);drain(g);assert.equal(payments,1);
 }
});

test('q136 all five old journeys can retreat and resume without early names or permissions',()=>{
 const seen=new Set();for(const route of q136Routes){const old=q136Engine({legacy:true});for(const id of route.path)step(old,id,g=>{
  const j=g.state.journey;if(!j||seen.has(j.action))return;seen.add(j.action);const current=new GameEngine(data);current.load(g.save());const values=structuredClone(current.state.stories.q136.values),dest=data.quests.q136.story.actions[j.action].journey.to;
  if(j.action==='record_reply')assert.equal(values.name,'unspoken');assert.equal(values.finished,false);assert.equal(values.resolution,'pending');assert.equal(values.turiAt,'transit');
  assert.ok(current.dispatch({type:'retreat'}));go(current,{kind:'town',location:'pilgrim_board'});assert.equal(current.dispatch({type:'story.resume',quest:'q136'}),false);assert.deepEqual(current.state.stories.q136.values,values);people(current);
  go(current,data.quests.q136.story.worldPlaces[dest]);drain(current);assert.equal(current.state.journey,null);assert.equal(current.state.stories.q136.values.partyAt,dest);people(current);
 });}
 assert.deepEqual([...seen].sort(),['entry_record','record_reply','purpose_study','purpose_shelter','entry_break_ready_continue'].sort());
});

test('q136 saved guardian fights preserve both locations during escape and defeat then permit retry',()=>{
 for(const legacy of [false,true])for(const result of ['escape','lose']){const old=q136Engine({legacy});choose(old,'q136','break',{combat:'pending'});assert.equal(old.state.battle.encounter,'guard_4');old.random=()=>result==='escape'?0:.5;resolveBattle(old,result);const raw=old.save(),g=new GameEngine(data);g.load(raw);if(legacy)assert.deepEqual(JSON.parse(g.save()),upgradedQ136Save(raw));people(g);assert.equal(g.state.stories.q136.values.turiAt,'entry');assert.equal(g.state.stories.q136.values.name,'unspoken');assert.equal(g.state.quests.q136.stage,'active');
  if(result==='lose'){go(g,data.quests.q136.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q136'}));drain(g);}assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q136Cast('entry'));
  for(const id of ['break','continue','finish'])choose(g,'q136',id);assert.equal(g.state.quests.q136.outcome,'break');people(g);
 }
});

test('q136 alias, refusal and free retry keep the recorded name and do not create food or entry permits',()=>{
 const g=q136Engine();g.state.gold=0;for(const key of Object.keys(g.state.inventory))g.state.inventory[key]=0;const inventory=structuredClone(g.state.inventory);
 choose(g,'q136','alias');assert.equal(g.state.stories.q136.values.name,'alias');assert.ok(g.state.log.some(line=>(typeof line==='string'?line:line.text??'').includes('旅の仮名')));
 for(let n=0;n<2;n++){choose(g,'q136','loot');assert.equal(g.state.stories.q136.scene,'refused');choose(g,'q136','again');assert.equal(g.state.stories.q136.values.name,'alias');assert.equal(g.state.journey,null);people(g);}
 choose(g,'q136','loot');choose(g,'q136','leave');assert.equal(g.state.gold,93);assert.deepEqual(g.state.inventory,inventory);assert.equal(g.state.quests.q136.outcome,'leave');
});

test('q136 accepted old saves retain seven phases and unaccepted old saves start the current route',()=>{
 for(const phase of ['available','accepted','dungeon','text','choice','battle','completed']){const old=q136AcceptedEngine({accepted:phase!=='available',entered:!['available','accepted'].includes(phase),started:['text','choice','battle','completed'].includes(phase)});if(['choice','battle','completed'].includes(phase))drain(old);if(phase==='battle')q136AcceptedChoose(old,'break',{combat:false});if(phase==='completed')for(const id of ['alias','loot','leave'])q136AcceptedChoose(old,id);
  const raw=old.save(),expected=JSON.parse(raw),g=new GameEngine(data);assert.deepEqual(validateSave(expected,acceptedQ136Data),[]);g.load(raw);if(phase!=='available')(expected.state.flags.legacyStoryRoutes??={}).q136=true;assert.deepEqual(JSON.parse(g.save()),expected);assert.equal(old.save(),raw);assert.equal(g.state.stories.q136,undefined);checkpoint(g);
  if(phase==='available'){assert.ok(g.accept('q136'));assert.equal(g.state.flags.currentStoryRoutes.q136,true);go(g,data.quests.q136.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q136'}));drain(g);people(g);}
 }
});

test('q136 accepted old routes retain direct endings and both name variants without cast or journeys',()=>{
 for(const route of q136AcceptedRoutes){const old=q136AcceptedEngine();drain(old);const g=new GameEngine(data);g.load(old.save());for(const id of route.path){assert.equal(projectGame(g).dialog.scene,undefined);q136AcceptedChoose(g,id);checkpoint(g);assert.equal(g.state.stories.q136,undefined);assert.equal(g.state.journey,null);}assert.equal(g.state.quests.q136.outcome,route.outcome);}
});

test('q136 corrupt old and current saves reject atomically before adding locations',()=>{
 const old=q136Engine({legacy:true}),g=q136Engine(),before=g.save();
 for(const mutate of [s=>s.stories.q136.values.partyAt='nowhere',s=>delete s.stories.q136.values.name,s=>s.stories.q136.values.turiAt='entry',s=>s.stories.q136.values.mercenariesAt='entry',s=>s.stories.q136.values.extra=true,s=>s.stories.q136.events.push('unwritten'),s=>s.stories.q136.revision=99,s=>(s.flags.legacyStoryRoutes??={}).q136=true]){const raw=JSON.parse(old.save());mutate(raw.state);assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);}
 for(const role of ['turi','mercenaries']){const raw=JSON.parse(before);raw.state.stories.q136.values[role+'At']='nowhere';assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);}
});

test('q136 journey migration composes with old q134 and preserves completed q135',()=>{
 const oldData={...previousQ136Data,quests:{...previousQ136Data.quests,q134:previousQ134},scripts:{...previousQ136Data.scripts,...previousQ134.scripts}};
 const old=new GameEngine(oldData);old.load(ready().save());old.random=()=>.999999;start(old,'q134');choose(old,'q134','decline');start(old,'q135');for(const id of ['listen','answer'])choose(old,'q135',id);start(old,'q136');assert.ok(old.dispatch({type:'choose',id:'record'}));drain(old);
 const raw=old.save(),expected=upgradedQ134Save(JSON.stringify(upgradedQ136Save(raw))),g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),expected);people(g);go(g,data.quests.q136.story.worldPlaces.record);drain(g);for(const id of ['reply','study','finish'])choose(g,'q136',id);assert.equal(g.state.stories.q134.values.custodianAt,'keeper');assert.equal(g.state.quests.q135.outcome,'stop');
});

for(const layout of ['classic','scene'])test(layout+': q136 renders Turi, the entry-only label and no new cast on accepted routes',async()=>{
 const dom=installDOM();let view;
 try{for(const f of (await fixtures()).fixtures){const g=new GameEngine(data);g.load(f.save);view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));assert.equal(dom.root.querySelectorAll('[data-character]').length,f.cast.length);for(const id of f.cast){const person=dom.root.querySelector(`[data-character="${id}"]`);assert.ok(person.textContent.includes(data.characters[id].name));if(id==='q136_turi')assert.equal(person.querySelector('img').src,data.assets.images.npc_q136_turi);else assert.equal(person.querySelector('img'),null);}}}finally{view?.destroy();dom.restore();}
});
