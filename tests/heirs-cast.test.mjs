import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain,checkpoint} from './royal-helpers.mjs';
import {previousQ062,previousQ062Data,q062Routes,q062Cast,q062Engine,q062AcceptedEngine,q062AcceptedChoose,acceptedQ062Data,heirsArtFixtures} from '../tools/heirs-art-fixtures.mjs';
import {previousQ061,upgradedQ061Save} from '../tools/sunken-art-fixtures.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;const fixtures=()=>fixturePromise??=heirsArtFixtures();
const values=g=>g.state.stories.q062.values;
function step(g,id,check=()=>{}){assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);if(g.state.journey){const a=g.data.quests.q062.story.actions[g.state.journey.action];go(g,g.data.quests.q062.story.worldPlaces[a.journey.to]);check(g);drain(g);check(g);}}
function oldPhase(phase){const g=new GameEngine(previousQ062Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'royal_board'});if(phase!=='available')assert.ok(g.accept('q062'));if(!['available','accepted'].includes(phase))go(g,previousQ062.story.worldPlaces.entry);if(['text','choice','completed'].includes(phase))assert.ok(g.dispatch({type:'story.resume',quest:'q062'}));if(['choice','completed'].includes(phase))drain(g);if(phase==='completed')for(const id of ['heirs','finish'])choose(g,'q062',id);return g;}

test('q062 adds only a character binding and two casts, keeping all prose, actions and save revisions',()=>{
 const q=structuredClone(data.quests.q062);delete q.story.entities.heirs.character;for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>'q062_'+c.entity),q062Cast(id));s.cast=[];}assert.deepEqual(q,previousQ062);
 assert.equal(q.story.revision,1);assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);assert.equal(data.characters.q062_heirs.portrait,undefined);assert.equal(data.characters.q062_heirs.sprite,undefined);
});

test('q062 browser fixtures cover four current and previous scenes plus the old accepted entry',async()=>{
 const r=await fixtures();assert.equal(r.fixtures.length,9);assert.equal(r.outcomes.length,3);assert.equal(r.fixtures.filter(f=>f.absentStoryScene).length,1);
 for(const f of r.fixtures){const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);if(!f.absentStoryScene)assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),f.cast);}
});

test('q062 six previous save phases, every scene and all three journeys resume byte-for-byte',()=>{
 const scenes=new Set(),journeys=new Set();const check=g=>{const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);const n=new GameEngine(data);n.load(raw);assert.equal(n.save(),raw);checkpoint(n);assert.equal(projectGame(n).dialog?.text,projectGame(g).dialog?.text);assert.deepEqual(projectGame(n).dialog?.options,projectGame(g).dialog?.options);if(g.state.journey)journeys.add(g.state.journey.action);if(g.state.stories.q062?.scene)scenes.add(g.state.stories.q062.scene);};
 for(const phase of ['available','accepted','dungeon','text','choice','completed'])check(oldPhase(phase));
 for(const route of q062Routes){const g=q062Engine({legacy:true});check(g);for(const id of route.path)step(g,id,check);}
 assert.deepEqual([...journeys].sort(),['entry_names','entry_heirs','entry_treasure'].sort());assert.deepEqual([...scenes].sort(),Object.keys(data.quests.q062.story.scenes).sort());
});

test('q062 all branches preserve unequal rewards, free choices, separate holders and optional escort',()=>{
 const rewards={informed:[129,116],contract:[149,89],compromise:[83,87]};
 for(const legacy of [false,true])for(const route of q062Routes){const g=new GameEngine(data);g.load(q062Engine({legacy}).save());g.random=()=>.999999;g.state.gold=0;for(const key of Object.keys(g.state.inventory))g.state.inventory[key]=0;const members=[...g.state.members],inventory=structuredClone(g.state.inventory);let payments=0;const complete=g.complete.bind(g),award=g.award.bind(g);
  g.award=(gold,xp)=>{assert.deepEqual([gold,xp],rewards[route.outcome]);payments++;return award(gold,xp);};
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q062_heirs']);
  step(g,route.path[0],n=>{checkpoint(n);assert.deepEqual(n.state.members,members);if(n.state.journey){assert.equal(n.state.stories.q062.scene,null);assert.equal(values(n).clothAt,'party');assert.equal(values(n).manifestAt,route.outcome==='informed'?'party':'entry');assert.equal(values(n).heirsAt,route.outcome==='compromise'?'transit':'entry');assert.equal(n.dispatch({type:'story.resume',quest:'q062'}),false);}});
  assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),route.outcome==='compromise'?['q062_heirs']:[]);assert.equal(values(g).clothAt,route.outcome==='compromise'?'heirs':'exhibit');assert.equal(values(g).manifestAt,route.outcome==='informed'?'exhibit':'entry');assert.equal(values(g).heirsAt,route.outcome==='compromise'?'witness':'entry');assert.equal(g.state.quests.q062.stage,'active');assert.equal(payments,0);choose(g,'q062','finish');assert.equal(g.state.quests.q062.outcome,route.outcome);assert.equal(payments,1);assert.deepEqual(g.state.inventory,inventory);
  const raw=g.save();assert.throws(()=>complete('q062',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q062.model.entryScript);drain(g);assert.equal(payments,1);
 }
});

test('q062 each previous journey survives retreat, a wrong facility and resumption without early handover',()=>{
 for(const route of q062Routes){const old=q062Engine({legacy:true});assert.ok(old.dispatch({type:'choose',id:route.path[0]}));drain(old);const g=new GameEngine(data);g.load(old.save());g.random=()=>.999999;const before=structuredClone(values(g));assert.ok(g.dispatch({type:'retreat'}));assert.equal(g.state.townLocation,'oddland_village');go(g,{kind:'town',location:route.outcome==='compromise'?'royal_exhibit':'royal_witness'});assert.equal(g.dispatch({type:'story.resume',quest:'q062'}),false);assert.deepEqual(values(g),before);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);
  const action=g.data.quests.q062.story.actions[g.state.journey.action];go(g,g.data.quests.q062.story.worldPlaces[action.journey.to]);drain(g);assert.equal(g.state.journey,null);assert.equal(values(g).heirsAt,route.outcome==='compromise'?'witness':'entry');assert.equal(values(g).clothAt,route.outcome==='compromise'?'heirs':'exhibit');assert.equal(values(g).manifestAt,route.outcome==='informed'?'exhibit':'entry');choose(g,'q062','finish');checkpoint(g);
 }
});

test('q062 old accepted phases and direct endings keep their original route without new cast',()=>{
 for(const phase of ['available','accepted','dungeon','text','choice','completed']){const old=q062AcceptedEngine({accepted:phase!=='available',entered:!['available','accepted'].includes(phase),started:['text','choice','completed'].includes(phase)});if(['choice','completed'].includes(phase))drain(old);if(phase==='completed')q062AcceptedChoose(old,'heirs');const raw=old.save(),expected=JSON.parse(raw),g=new GameEngine(data);assert.deepEqual(validateSave(expected,acceptedQ062Data),[]);g.load(raw);g.random=()=>.999999;if(phase!=='available')(expected.state.flags.legacyStoryRoutes??={}).q062=true;assert.deepEqual(JSON.parse(g.save()),expected);assert.equal(g.state.stories.q062,undefined);checkpoint(g);if(phase==='available'){assert.ok(g.accept('q062'));go(g,data.quests.q062.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q062'}));drain(g);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q062_heirs']);}}
 for(const route of q062Routes){const old=q062AcceptedEngine();drain(old);const g=new GameEngine(data);g.load(old.save());q062AcceptedChoose(g,route.path[0]);checkpoint(g);assert.equal(g.state.stories.q062,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);assert.equal(g.state.quests.q062.outcome,route.outcome);}
});

test('q062 malformed old and current saves fail atomically without adding new holder values',()=>{
 for(const legacy of [false,true]){const old=q062Engine({legacy}),g=q062Engine(),before=g.save();for(const mutate of [s=>s.stories.q062.values.heirsAt='unknown',s=>s.stories.q062.values.clothAt='q062_heirs',s=>delete s.stories.q062.values.manifestAt,s=>s.stories.q062.events.push('unwritten'),s=>s.stories.q062.revision=2,s=>(s.flags.legacyStoryRoutes??={}).q062=true]){const raw=JSON.parse(old.save());mutate(raw.state);assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);}}
});

test('q062 complete physical state remains unchanged alongside the q061 story migration',()=>{
 const oldData={...previousQ062Data,quests:{...previousQ062Data.quests,q061:previousQ061},scripts:{...previousQ062Data.scripts,...previousQ061.scripts}},old=new GameEngine(oldData);old.load(q062Engine({legacy:true}).save());old.random=()=>.999999;for(const id of ['heirs','finish'])choose(old,'q062',id);start(old,'q061');const raw=old.save(),g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),upgradedQ061Save(raw));assert.deepEqual(g.state.stories.q062,old.state.stories.q062);checkpoint(g);
 const before=g.save(),bad=JSON.parse(raw);bad.state.stories.q062.values.heirsAt='unknown';assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
});

for(const layout of ['classic','scene'])test(layout+': q062 shows collective labels without portraits and preserves dialogue page controls',async()=>{
 const dom=installDOM();let view;try{for(const f of (await fixtures()).fixtures){const g=new GameEngine(data);g.load(f.save);view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));assert.equal(dom.root.querySelectorAll('[data-character]').length,f.cast.length);for(const id of f.cast){const person=dom.root.querySelector(`[data-character="${id}"]`);assert.ok(person.textContent.includes(data.characters[id].name));assert.equal(person.querySelector('img'),null);assert.ok(person.className.includes('name-only'));}
  const pages=[dom.root.querySelector('.story-text').textContent],choice=`[data-focus="choice:${f.availableChoice}"]`;for(let n=0;!dom.root.querySelector(choice)&&n<32;n++){const next=dom.root.querySelector(layout==='scene'?'[data-focus="message:next"]':'.message-window .continue');assert.ok(next);next.click();view.render(projectGame(g));pages.push(dom.root.querySelector('.story-text').textContent);}assert.ok(dom.root.querySelector(choice));assert.ok(pages.join('').includes(f.expectedText));
 }}finally{view?.destroy();dom.restore();}
});
