import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain,checkpoint} from './pilgrimage-helpers.mjs';
import {previousQ140,previousQ140Data,q140Routes,q140Cast,q140NewTake,upgradedQ140Save,q140Engine,q140AcceptedEngine,q140AcceptedRoutes,q140AcceptedChoose,acceptedQ140Data,maintenanceArtFixtures} from '../tools/maintenance-art-fixtures.mjs';
import {previousQ139,upgradedQ139Save} from '../tools/rescue-art-fixtures.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;const fixtures=()=>fixturePromise??=maintenanceArtFixtures();
const oldTake=previousQ140.model.graph.find(n=>n.id==='take').text;
function people(g){assert.equal(g.state.stories.q140.values.boroAt,'maintenance');checkpoint(g);}
function step(g,id,check=()=>{}){assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);if(g.state.journey){const a=g.data.quests.q140.story.actions[g.state.journey.action];go(g,g.data.quests.q140.story.worldPlaces[a.journey.to]);check(g);drain(g);check(g);}}
function oldPhase(phase){const g=new GameEngine(previousQ140Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'pilgrim_board'});if(phase!=='available')assert.ok(g.accept('q140'));if(!['available','accepted'].includes(phase))go(g,previousQ140.story.worldPlaces.entry);if(['text','choice','completed'].includes(phase))assert.ok(g.dispatch({type:'story.resume',quest:'q140'}));if(['choice','completed'].includes(phase))drain(g);if(phase==='completed')for(const id of ['loot','leave','finish'])choose(g,'q140',id);return g;}

test('q140 adds only Boro, two character bindings, two casts, one sentence and the declared upgrade',()=>{
 const q=structuredClone(data.quests.q140);assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ140.story);delete q.story.registry.boroAt;delete q.story.entities.boro;delete q.story.entities.worker.character;
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>'q140_'+c.entity),q140Cast(id,true));s.cast=[];}
 delete q.model.storyUpgrades;q.story.revision=1;q.model.edition.revision=1;assert.deepEqual(JSON.parse(JSON.stringify(q).replaceAll(q140NewTake,oldTake)),previousQ140);assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);
});

test('q140 fixtures cover eight scenes, direct and rescued talks, four endings and accepted old routes',async()=>{
 const r=await fixtures();assert.equal(r.fixtures.length,26);assert.equal(r.outcomes.length,4);assert.equal(r.fixtures.filter(f=>f.absentStoryScene).length,2);
 for(const f of r.fixtures){const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);if(!f.absentStoryScene){people(g);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),f.cast);}}
});

test('q140 old phases, text, choices, eight journeys and completions add only Boro location and revision',()=>{
 const phases=new Set(),scenes=new Set(),journeys=new Set();
 const check=g=>{const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);const n=new GameEngine(data);n.load(raw);assert.deepEqual(JSON.parse(n.save()),upgradedQ140Save(raw));if(n.state.stories.q140)people(n);else checkpoint(n);assert.equal(projectGame(n).dialog?.text,projectGame(g).dialog?.text);assert.deepEqual(projectGame(n).dialog?.options,projectGame(g).dialog?.options);if(g.state.journey)journeys.add(g.state.journey.action);if(g.state.stories.q140?.scene)scenes.add(g.state.stories.q140.scene);};
 for(const phase of ['available','accepted','dungeon','text','choice','completed']){check(oldPhase(phase));phases.add(phase);}
 for(const route of q140Routes){const g=q140Engine({legacy:true});check(g);for(const id of route.path)step(g,id,check);}
 assert.equal(phases.size,6);assert.equal(journeys.size,8);assert.equal(journeys.size,Object.values(data.quests.q140.story.actions).filter(a=>a.journey).length);assert.deepEqual([...scenes].sort(),Object.keys(data.quests.q140.story.scenes).sort());
});

test('q140 current and resumed routes keep free choices, four endings, ownership, party and one reward',()=>{
 for(const legacy of [false,true])for(const route of q140Routes){const g=new GameEngine(data);g.load(q140Engine({legacy}).save());g.random=()=>.999999;g.state.gold=0;for(const key of Object.keys(g.state.inventory))g.state.inventory[key]=0;const members=[...g.state.members],inventory=structuredClone(g.state.inventory);let payments=0;const complete=g.complete.bind(g),award=g.award.bind(g);
  g.award=(gold,xp)=>{assert.deepEqual([gold,xp],[93,69]);return award(gold,xp);};g.complete=(id,outcome)=>{const gold=g.state.gold,result=complete(id,outcome);if(id==='q140'){payments++;assert.equal(g.state.gold-gold,93);}return result;};
  for(const id of route.path)step(g,id,n=>{people(n);assert.deepEqual(n.state.members,members);if(n.state.journey){assert.equal(n.state.stories.q140.scene,null);assert.equal(n.dispatch({type:'story.resume',quest:'q140'}),false);}});
  const v=g.state.stories.q140.values;assert.equal(v.helped,route.help);assert.equal(v.declared,route.outcome==='treaty');assert.equal(v.goodsAt,route.outcome==='loot'?'party':'treasure');assert.equal(v.workerAt,route.help?'maintenance':'accident');assert.equal(v.partyAt,'union');assert.equal(g.state.quests.q140.outcome,route.outcome);assert.equal(payments,1);assert.deepEqual(g.state.inventory,inventory);
  const raw=g.save();assert.throws(()=>complete('q140',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q140.model.entryScript);drain(g);assert.equal(payments,1);
 }
});

test('q140 worker appears at the accident and only after actual rescue arrival at Boro, never at the union',()=>{
 for(const legacy of [false,true])for(const help of [false,true]){const g=new GameEngine(data);g.load(q140Engine({legacy}).save());g.random=()=>.999999;assert.deepEqual(projectGame(g).dialog.scene.cast,[]);choose(g,'q140',help?'rescue':'talk');
  if(help){assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q140_worker']);assert.ok(g.dispatch({type:'choose',id:'carry'}));drain(g);assert.equal(g.state.stories.q140.values.workerAt,'transit');assert.equal(g.state.stories.q140.values.helped,false);people(g);go(g,data.quests.q140.story.worldPlaces.maintenance);drain(g);}
  assert.equal(g.state.stories.q140.values.helped,help);assert.equal(g.state.stories.q140.values.workerAt,help?'maintenance':'accident');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q140Cast('talk',help));
  choose(g,'q140','declare');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);assert.equal(g.state.stories.q140.values.workerAt,help?'maintenance':'accident');people(g);
 }
});

test('q140 take prose describes pending collection while goods move only at departure, including old waiting text',()=>{
 for(const legacy of [false,true]){const old=q140Engine({legacy});choose(old,'q140','loot');const raw=old.save(),g=new GameEngine(data);g.load(raw);g.random=()=>.999999;assert.equal(g.state.stories.q140.values.goodsAt,'treasure');assert.equal(projectGame(g).dialog.text,legacy?oldTake:q140NewTake);assert.ok(g.dispatch({type:'choose',id:'leave'}));drain(g);assert.equal(g.state.stories.q140.values.goodsAt,'party');assert.equal(g.state.quests.q140.stage,'active');assert.equal(g.state.stories.q140.values.declared,false);go(g,data.quests.q140.story.worldPlaces.union);drain(g);assert.equal(g.state.stories.q140.values.goodsAt,'party');choose(g,'q140','finish');assert.equal(g.state.quests.q140.outcome,'loot');}
 const old=q140Engine({legacy:true}),g=new GameEngine(data);g.load(old.save());g.random=()=>.999999;choose(g,'q140','loot');assert.equal(projectGame(g).dialog.text,q140NewTake);
});

test('q140 every old journey survives retreat and detours without moving the worker or collecting goods again',()=>{
 const seen=new Set();for(const route of q140Routes){const old=q140Engine({legacy:true});for(const id of route.path)step(old,id,g=>{const j=g.state.journey;if(!j||seen.has(j.action))return;seen.add(j.action);const n=new GameEngine(data);n.load(g.save());n.random=()=>.999999;const before=structuredClone(n.state.stories.q140.values);assert.ok(n.dispatch({type:'retreat'}));go(n,{kind:'town',location:'pilgrim_board'});assert.equal(n.dispatch({type:'story.resume',quest:'q140'}),false);assert.deepEqual(n.state.stories.q140.values,before);checkpoint(n);go(n,data.quests.q140.story.worldPlaces[data.quests.q140.story.actions[j.action].journey.to]);drain(n);assert.equal(n.state.journey,null);people(n);if(j.action==='accident_carry'){assert.equal(n.state.stories.q140.values.helped,true);assert.equal(n.state.stories.q140.values.workerAt,'maintenance');}});}assert.equal(seen.size,8);
});

test('q140 accepted old routes keep six phases and seven direct paths without new people or journeys',()=>{
 for(const phase of ['available','accepted','dungeon','text','choice','completed']){const old=q140AcceptedEngine({accepted:phase!=='available',entered:!['available','accepted'].includes(phase),started:['text','choice','completed'].includes(phase)});if(['choice','completed'].includes(phase))drain(old);if(phase==='completed')q140AcceptedChoose(old,'loot');const raw=old.save(),expected=JSON.parse(raw),g=new GameEngine(data);assert.deepEqual(validateSave(expected,acceptedQ140Data),[]);g.load(raw);if(phase!=='available')(expected.state.flags.legacyStoryRoutes??={}).q140=true;assert.deepEqual(JSON.parse(g.save()),expected);assert.equal(g.state.stories.q140,undefined);checkpoint(g);if(phase==='available'){assert.ok(g.accept('q140'));go(g,data.quests.q140.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q140'}));drain(g);assert.equal(g.state.stories.q140.revision,2);}}
 for(const route of q140AcceptedRoutes){const old=q140AcceptedEngine();drain(old);const g=new GameEngine(data);g.load(old.save());for(const id of route.path){q140AcceptedChoose(g,id);checkpoint(g);assert.equal(g.state.stories.q140,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}assert.equal(g.state.quests.q140.outcome,route.outcome);}
});

test('q140 malformed old and current states are rejected atomically, including undeclared goods holders',()=>{
 for(const legacy of [false,true]){const old=q140Engine({legacy}),g=q140Engine(),before=g.save();for(const mutate of [s=>s.stories.q140.values.workerAt='unknown',s=>s.stories.q140.values.goodsAt='boro',s=>s.stories.q140.values.helped=3,s=>delete s.stories.q140.values.workerAt,s=>s.stories.q140.events.push('unwritten'),s=>s.stories.q140.revision=3,s=>(s.flags.legacyStoryRoutes??={}).q140=true]){const raw=JSON.parse(old.save());mutate(raw.state);assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);}}
 const g=q140Engine(),before=g.save(),bad=JSON.parse(before);delete bad.state.stories.q140.values.boroAt;assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
});

test('q140 goods and rescued worker survive alongside q139 migration without resetting either story',()=>{
 const oldData={...previousQ140Data,quests:{...previousQ140Data.quests,q139:previousQ139},scripts:{...previousQ140Data.scripts,...previousQ139.scripts}},old=new GameEngine(oldData);old.load(ready().save());old.random=()=>.999999;start(old,'q140');for(const id of ['rescue','carry','declare','finish'])choose(old,'q140',id);start(old,'q139');const raw=old.save(),g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),upgradedQ140Save(JSON.stringify(upgradedQ139Save(raw))));assert.equal(g.state.stories.q140.values.workerAt,'maintenance');assert.equal(g.state.stories.q140.values.goodsAt,'treasure');checkpoint(g);
});

for(const layout of ['classic','scene'])test(layout+': q140 present people and current or saved text survive real dialogue page buttons',async()=>{
 const dom=installDOM();let view;try{for(const f of (await fixtures()).fixtures){const g=new GameEngine(data);g.load(f.save);view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));assert.equal(dom.root.querySelectorAll('[data-character]').length,f.cast.length);for(const id of f.cast){const person=dom.root.querySelector(`[data-character="${id}"]`);assert.ok(person.textContent.includes(data.characters[id].name));assert.equal(person.querySelector('img').src,data.assets.images['npc_'+id]);}
  const pages=[dom.root.querySelector('.story-text').textContent],choice=`[data-focus="choice:${f.availableChoice}"]`;for(let n=0;!dom.root.querySelector(choice)&&n<32;n++){const next=dom.root.querySelector(layout==='scene'?'[data-focus="message:next"]':'.message-window .continue');assert.ok(next);next.click();view.render(projectGame(g));pages.push(dom.root.querySelector('.story-text').textContent);}assert.ok(dom.root.querySelector(choice));assert.ok(pages.join('').includes(f.expectedText));
 }}finally{view?.destroy();dom.restore();}
});
