import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain,checkpoint} from './royal-helpers.mjs';
import {previousQ061,previousQ061Data,q061Routes,q061Cast,upgradedQ061Save,q061Engine,q061AcceptedEngine,q061AcceptedRoutes,q061AcceptedChoose,acceptedQ061Data,sunkenArtFixtures} from '../tools/sunken-art-fixtures.mjs';
import {previousQ140,upgradedQ140Save,q140Engine} from '../tools/maintenance-art-fixtures.mjs';
import {choose as chapelChoose} from './pilgrimage-helpers.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;const fixtures=()=>fixturePromise??=sunkenArtFixtures();
const values=g=>g.state.stories.q061.values;
function checkGroup(g){assert.equal(values(g).rescuersAt,'rescue');checkpoint(g);}
function step(g,id,check=()=>{}){assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);if(g.state.journey){const a=g.data.quests.q061.story.actions[g.state.journey.action];go(g,g.data.quests.q061.story.worldPlaces[a.journey.to]);check(g);drain(g);check(g);}}
function oldPhase(phase){const g=new GameEngine(previousQ061Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'royal_board'});if(phase!=='available')assert.ok(g.accept('q061'));if(!['available','accepted'].includes(phase))go(g,previousQ061.story.worldPlaces.entry);if(['text','choice','completed'].includes(phase))assert.ok(g.dispatch({type:'story.resume',quest:'q061'}));if(['choice','completed'].includes(phase))drain(g);if(phase==='completed')choose(g,'q061','local');return g;}

test('q061 adds only the stationary collective, one cast and the declared save upgrade',()=>{
 const q=structuredClone(data.quests.q061);assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ061.story);assert.equal(q.story.entities.rescuers.kind,'group');delete q.story.registry.rescuersAt;delete q.story.entities.rescuers;
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>'q061_'+c.entity),q061Cast(id));s.cast=[];}
 delete q.model.storyUpgrades;q.story.revision=1;q.model.edition.revision=1;assert.deepEqual(q,previousQ061);
 assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);assert.equal(data.characters.q061_rescuers.portrait,undefined);assert.equal(data.characters.q061_rescuers.sprite,undefined);
});

test('q061 browser fixtures cover five scenes, three endings and old air-room branches',async()=>{
 const r=await fixtures();assert.equal(r.fixtures.length,13);assert.equal(r.outcomes.length,3);assert.equal(r.fixtures.filter(f=>f.absentStoryScene).length,3);
 for(const f of r.fixtures){const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);if(!f.absentStoryScene){checkGroup(g);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),f.cast);}}
});

test('q061 six old save phases and every reachable journey add only the receiving group location',()=>{
 const scenes=new Set(),journeys=new Set();
 const check=g=>{const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);const n=new GameEngine(data);n.load(raw);assert.deepEqual(JSON.parse(n.save()),upgradedQ061Save(raw));if(n.state.stories.q061)checkGroup(n);else checkpoint(n);assert.equal(projectGame(n).dialog?.text,projectGame(g).dialog?.text);assert.deepEqual(projectGame(n).dialog?.options,projectGame(g).dialog?.options);if(g.state.journey)journeys.add(g.state.journey.action);if(g.state.stories.q061?.scene)scenes.add(g.state.stories.q061.scene);};
 for(const phase of ['available','accepted','dungeon','text','choice','completed'])check(oldPhase(phase));
 for(const route of q061Routes){const g=q061Engine({legacy:true});check(g);for(const id of route.path)step(g,id,check);}
 assert.deepEqual([...journeys].sort(),['entry_trial','entry_sea','air_next','second_air_rescue'].sort());assert.deepEqual([...scenes].sort(),Object.keys(data.quests.q061.story.scenes).sort());
});

test('q061 current and migrated routes preserve three unequal rewards, chart ownership and free choices',()=>{
 const rewards={informed:[129,116],contract:[149,89],compromise:[83,87]};
 for(const legacy of [false,true])for(const route of q061Routes){const g=new GameEngine(data);g.load(q061Engine({legacy}).save());g.random=()=>.999999;g.state.gold=0;for(const key of Object.keys(g.state.inventory))g.state.inventory[key]=0;const members=[...g.state.members],inventory=structuredClone(g.state.inventory);let payments=0;const complete=g.complete.bind(g),award=g.award.bind(g);
  g.award=(gold,xp)=>{assert.deepEqual([gold,xp],rewards[route.outcome]);payments++;return award(gold,xp);};
  for(const id of route.path)step(g,id,n=>{checkGroup(n);assert.deepEqual(n.state.members,members);if(n.state.journey){assert.equal(n.state.stories.q061.scene,null);assert.deepEqual(n.data.quests.q061.story.actions[n.state.journey.action].journey.companions,[]);assert.equal(n.dispatch({type:'story.resume',quest:'q061'}),false);}});
  assert.equal(values(g).tested,route.path.includes('next')?1:0);assert.equal(values(g).chartAt,route.outcome==='informed'?'rescue':route.outcome==='contract'?'harbor':'party');assert.equal(g.state.quests.q061.outcome,route.outcome);assert.equal(payments,1);assert.deepEqual(g.state.inventory,inventory);
  const raw=g.save();assert.throws(()=>complete('q061',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q061.model.entryScript);drain(g);assert.equal(payments,1);
 }
});

test('q061 requires both real air rooms and delivers the chart only upon rescue-facility arrival',()=>{
 for(const legacy of [false,true]){const g=new GameEngine(data);g.load(q061Engine({legacy}).save());g.random=()=>.999999;assert.deepEqual(projectGame(g).dialog.scene.cast,[]);choose(g,'q061','trial');assert.equal(g.state.dungeons.active.systems.air.air,36);assert.equal(values(g).tested,0);assert.equal(g.dispatch({type:'choose',id:'rescue'}),false);
  assert.ok(g.dispatch({type:'choose',id:'next'}));drain(g);assert.equal(values(g).tested,0);assert.equal(values(g).chartAt,'party');go(g,data.quests.q061.story.worldPlaces.air_two);drain(g);assert.equal(g.state.dungeons.active.systems.air.air,36);assert.equal(values(g).tested,1);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);
  assert.ok(g.dispatch({type:'choose',id:'rescue'}));drain(g);assert.equal(values(g).chartAt,'party');checkGroup(g);go(g,{kind:'town',location:'royal_harbor'});assert.equal(g.dispatch({type:'story.resume',quest:'q061'}),false);assert.equal(values(g).chartAt,'party');go(g,data.quests.q061.story.worldPlaces.rescue);drain(g);assert.equal(values(g).chartAt,'rescue');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q061_rescuers']);assert.equal(g.state.quests.q061.stage,'active');choose(g,'q061','finish');assert.equal(g.state.quests.q061.outcome,'informed');
 }
});

test('q061 old journeys survive retreat and detours without moving the receiving group or handing over early',()=>{
 const seen=new Set();for(const route of q061Routes){const old=q061Engine({legacy:true});for(const id of route.path)step(old,id,g=>{const j=g.state.journey;if(!j||seen.has(j.action))return;seen.add(j.action);const n=new GameEngine(data);n.load(g.save());n.random=()=>.999999;const before=structuredClone(values(n));assert.ok(n.dispatch({type:'retreat'}));assert.equal(n.state.townLocation,'oddland_village');go(n,{kind:'town',location:'royal_board'});assert.equal(n.dispatch({type:'story.resume',quest:'q061'}),false);assert.deepEqual(values(n),before);checkpoint(n);go(n,data.quests.q061.story.worldPlaces[data.quests.q061.story.actions[j.action].journey.to]);drain(n);assert.equal(n.state.journey,null);checkGroup(n);assert.equal(values(n).chartAt,j.action==='second_air_rescue'?'rescue':j.action==='entry_sea'?'harbor':'party');});}assert.equal(seen.size,4);
});

test('q061 accepted old routes preserve six phases and five paths without new people or journeys',()=>{
 for(const phase of ['available','accepted','dungeon','text','choice','completed']){const old=q061AcceptedEngine({accepted:phase!=='available',entered:!['available','accepted'].includes(phase),started:['text','choice','completed'].includes(phase)});if(['choice','completed'].includes(phase))drain(old);if(phase==='completed')q061AcceptedChoose(old,'local');const raw=old.save(),expected=JSON.parse(raw),g=new GameEngine(data);assert.deepEqual(validateSave(expected,acceptedQ061Data),[]);g.load(raw);g.random=()=>.999999;if(phase!=='available')(expected.state.flags.legacyStoryRoutes??={}).q061=true;assert.deepEqual(JSON.parse(g.save()),expected);assert.equal(g.state.stories.q061,undefined);checkpoint(g);if(phase==='available'){assert.ok(g.accept('q061'));go(g,data.quests.q061.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q061'}));drain(g);assert.equal(g.state.stories.q061.revision,2);}}
 for(const route of q061AcceptedRoutes){const old=q061AcceptedEngine();drain(old);const g=new GameEngine(data);g.load(old.save());for(const id of route.path){q061AcceptedChoose(g,id);checkpoint(g);assert.equal(g.state.stories.q061,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}assert.equal(g.state.quests.q061.outcome,route.outcome);}
});

test('q061 malformed old and current saves are rejected atomically without widening chart ownership',()=>{
 for(const legacy of [false,true]){const old=q061Engine({legacy}),g=q061Engine(),before=g.save();for(const mutate of [s=>s.stories.q061.values.chartAt='rescuers',s=>s.stories.q061.values.tested=2,s=>delete s.stories.q061.values.chartAt,s=>s.stories.q061.events.push('unwritten'),s=>s.stories.q061.revision=3,s=>(s.flags.legacyStoryRoutes??={}).q061=true]){const raw=JSON.parse(old.save());mutate(raw.state);assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);}}
 const g=q061Engine(),before=g.save();for(const mutate of [s=>delete s.stories.q061.values.rescuersAt,s=>s.stories.q061.values.rescuersAt='unknown']){const bad=JSON.parse(before);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
});

test('q061 and q140 old story migrations coexist and validate together before either is applied',()=>{
 const oldData={...previousQ061Data,quests:{...previousQ061Data.quests,q140:previousQ140},scripts:{...previousQ061Data.scripts,...previousQ140.scripts}},old=new GameEngine(oldData);const base=q140Engine({legacy:true});for(const id of ['loot','leave','finish'])chapelChoose(base,'q140',id);old.load(base.save());old.random=()=>.999999;start(old,'q061');const raw=old.save(),g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),upgradedQ061Save(JSON.stringify(upgradedQ140Save(raw))));checkGroup(g);
 const before=g.save(),bad=JSON.parse(raw);bad.state.stories.q140.values.workerAt='unknown';assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
});

for(const layout of ['classic','scene'])test(layout+': q061 collective label has no portrait and dialogue pages keep every branch readable',async()=>{
 const dom=installDOM();let view;try{for(const f of (await fixtures()).fixtures){const g=new GameEngine(data);g.load(f.save);view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));assert.equal(dom.root.querySelectorAll('[data-character]').length,f.cast.length);for(const id of f.cast){const person=dom.root.querySelector(`[data-character="${id}"]`);assert.ok(person.textContent.includes(data.characters[id].name));assert.equal(person.querySelector('img'),null);assert.ok(person.className.includes('name-only'));}
  const pages=[dom.root.querySelector('.story-text').textContent],choice=`[data-focus="choice:${f.availableChoice}"]`;for(let n=0;!dom.root.querySelector(choice)&&n<32;n++){const next=dom.root.querySelector(layout==='scene'?'[data-focus="message:next"]':'.message-window .continue');assert.ok(next);next.click();view.render(projectGame(g));pages.push(dom.root.querySelector('.story-text').textContent);}assert.ok(dom.root.querySelector(choice));assert.ok(pages.join('').includes(f.expectedText));if(f.blockedChoice)assert.equal(g.dispatch({type:'choose',id:f.blockedChoice}),false);
 }}finally{view?.destroy();dom.restore();}
});
