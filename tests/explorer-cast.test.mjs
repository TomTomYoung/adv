import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain,checkpoint} from './pilgrimage-helpers.mjs';
import {previousQ138,previousQ138Data,q138Routes,q138Cast,q138NewMediated,q138Engine,q138AcceptedEngine,q138AcceptedRoutes,q138AcceptedChoose,acceptedQ138Data,explorerArtFixtures} from '../tools/explorer-art-fixtures.mjs';
import {previousQ137,upgradedQ137Save} from '../tools/burnt-library-art-fixtures.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;const fixtures=()=>fixturePromise??=explorerArtFixtures();
const oldMediated=previousQ138.model.graph.find(n=>n.id==='mediated').text;
function step(g,id,check=()=>{}){assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);if(g.state.journey){const a=g.data.quests.q138.story.actions[g.state.journey.action];go(g,g.data.quests.q138.story.worldPlaces[a.journey.to]);check(g);drain(g);check(g);}}
function oldPhase(phase){const g=new GameEngine(previousQ138Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'pilgrim_board'});if(phase!=='available')assert.ok(g.accept('q138'));if(!['available','accepted'].includes(phase))go(g,previousQ138.story.worldPlaces.entry);if(['text','choice','completed'].includes(phase))assert.ok(g.dispatch({type:'story.resume',quest:'q138'}));if(['choice','completed'].includes(phase))drain(g);if(phase==='completed')for(const id of ['tracks','solo'])choose(g,'q138',id);return g;}

test('q138 changes only two character bindings, four casts and one premature handoff sentence',()=>{
 const q=structuredClone(data.quests.q138);for(const role of ['ira','narl']){assert.equal(q.story.entities[role].character,'q138_'+role);delete q.story.entities[role].character;}
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>'q138_'+c.entity),q138Cast(id));s.cast=[];}
 assert.deepEqual(JSON.parse(JSON.stringify(q).replaceAll(q138NewMediated,oldMediated)),previousQ138);assert.equal(q.story.revision,1);assert.equal(q.model.storyUpgrades,undefined);assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);
});

test('q138 fixtures retain both clue choices, six scenes, four endings and accepted old routes',async()=>{
 const r=await fixtures();assert.equal(r.fixtures.length,25);assert.equal(r.outcomes.length,4);assert.equal(r.fixtures.filter(f=>f.absentStoryScene).length,3);
 for(const f of r.fixtures){const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);if(f.absentStoryScene)assert.equal(projectGame(g).dialog?.scene,undefined);else assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),f.cast);}
});

test('q138 old physical saves retain all six phases, waiting prose, options and six journeys byte for byte',()=>{
 const phases=new Set(),scenes=new Set(),journeys=new Set();const check=g=>{const raw=g.save(),n=new GameEngine(data);assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);n.load(raw);assert.equal(n.save(),raw);assert.equal(g.save(),raw);checkpoint(n);assert.equal(projectGame(n).dialog?.text,projectGame(g).dialog?.text);assert.deepEqual(projectGame(n).dialog?.options,projectGame(g).dialog?.options);const s=g.state.stories.q138;if(s?.scene)scenes.add(s.scene);if(g.state.journey)journeys.add(g.state.journey.action);};
 for(const phase of ['available','accepted','dungeon','text','choice','completed']){check(oldPhase(phase));phases.add(phase);}
 for(const route of q138Routes){const g=q138Engine({legacy:true});check(g);for(const id of route.path)step(g,id,check);assert.equal(g.state.quests.q138.outcome,route.outcome);}
 assert.equal(phases.size,6);assert.equal(journeys.size,6);assert.deepEqual([...scenes].sort(),Object.keys(data.quests.q138.story.scenes).sort());
});

test('q138 all current and resumed routes keep autonomy, ownership, free choices and one reward',()=>{
 for(const legacy of [false,true])for(const route of q138Routes){const g=new GameEngine(data);g.load(q138Engine({legacy}).save());g.random=()=>.999999;g.state.gold=0;for(const key of Object.keys(g.state.inventory))g.state.inventory[key]=0;const members=[...g.state.members],inventory=structuredClone(g.state.inventory);let payments=0;const complete=g.complete.bind(g),award=g.award.bind(g);
  g.award=(gold,xp)=>{assert.deepEqual([gold,xp],[93,69]);return award(gold,xp);};g.complete=(id,outcome)=>{const before=g.state.gold,result=complete(id,outcome);if(id==='q138'){payments++;assert.equal(g.state.gold-before,93);}return result;};
  for(const id of route.path)step(g,id,n=>{checkpoint(n);assert.deepEqual(n.state.members,members);if(n.state.journey){assert.equal(n.state.stories.q138.scene,null);assert.equal(n.dispatch({type:'story.resume',quest:'q138'}),false);}});
  const v=g.state.stories.q138.values;assert.equal(v.map,route.map);assert.equal(v.resolution,route.outcome);assert.equal(g.state.quests.q138.outcome,route.outcome);assert.equal(payments,1);assert.deepEqual(g.state.inventory,inventory);
  assert.equal(v.iraAt,['together','solo'].includes(route.outcome)?'beyond':'pupil');assert.equal(v.narlAt,route.outcome==='talk'?'pupil':'union');assert.equal(v.partyAt,route.outcome==='together'?'beyond':route.outcome==='correct'?'union':'pupil');assert.equal(v.mapAt,['talk','solo'].includes(route.outcome)?'ira':route.outcome==='correct'?'union':'party');
  const raw=g.save();assert.throws(()=>complete('q138',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q138.model.entryScript);drain(g);assert.equal(payments,1);
 }
});

test('q138 clue knowledge, companions and map handoffs occur at their existing departure or arrival boundaries',()=>{
 for(const first of ['map','tracks']){const g=q138Engine();assert.ok(g.dispatch({type:'choose',id:first}));drain(g);assert.equal(g.state.stories.q138.values.map,false);assert.equal(g.state.stories.q138.values.iraAt,'pupil');assert.equal(g.state.stories.q138.values.narlAt,'union');go(g,data.quests.q138.story.worldPlaces.pupil);drain(g);assert.equal(g.state.stories.q138.values.map,first==='map');}
 for(const action of ['together','talk','correct']){const g=q138Engine();choose(g,'q138','tracks');assert.ok(g.dispatch({type:'choose',id:action}));drain(g);let v=g.state.stories.q138.values;assert.equal(v.iraAt,action==='together'?'transit':'pupil');assert.equal(v.narlAt,'union');assert.equal(v.mapAt,'party');const a=data.quests.q138.story.actions[g.state.journey.action];go(g,data.quests.q138.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.stories.q138.values.mapAt,'party');
  if(action==='talk'){assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q138_narl']);assert.ok(g.dispatch({type:'choose',id:'escort'}));drain(g);assert.equal(g.state.stories.q138.values.narlAt,'transit');assert.equal(g.state.stories.q138.values.iraAt,'pupil');go(g,data.quests.q138.story.worldPlaces.pupil);drain(g);assert.equal(g.state.stories.q138.values.mapAt,'party');}
  choose(g,'q138','finish');assert.equal(g.state.stories.q138.values.mapAt,action==='talk'?'ira':action==='correct'?'union':'party');
 }
 const solo=q138Engine();choose(solo,'q138','tracks');const place=structuredClone(solo.state.location);choose(solo,'q138','solo');assert.deepEqual(solo.state.location,place);assert.equal(solo.state.stories.q138.values.partyAt,'pupil');assert.equal(solo.state.stories.q138.values.iraAt,'beyond');assert.equal(solo.state.journey,null);assert.deepEqual(projectGame(solo).dialog?.scene?.cast??[],[]);
});

test('q138 all six old journeys survive retreat and detours without moving people or handing over the map early',()=>{
 const seen=new Set();for(const route of q138Routes){const old=q138Engine({legacy:true});for(const id of route.path)step(old,id,g=>{const j=g.state.journey;if(!j||seen.has(j.action))return;seen.add(j.action);const n=new GameEngine(data);n.load(g.save());n.random=()=>.999999;const before=structuredClone(n.state.stories.q138.values);if(n.state.mode==='dungeon')assert.ok(n.dispatch({type:'retreat'}));go(n,{kind:'town',location:'pilgrim_board'});assert.equal(n.dispatch({type:'story.resume',quest:'q138'}),false);assert.deepEqual(n.state.stories.q138.values,before);checkpoint(n);go(n,data.quests.q138.story.worldPlaces[data.quests.q138.story.actions[j.action].journey.to]);drain(n);assert.equal(n.state.journey,null);assert.equal(n.state.stories.q138.values.mapAt,'party');checkpoint(n);});}assert.equal(seen.size,6);
});

test('q138 old mediation text remains in saved VM while a new arrival describes the pending map handoff',()=>{
 const old=q138Engine({legacy:true});for(const id of ['map','talk','escort'])choose(old,'q138',id);const raw=old.save(),n=new GameEngine(data);n.load(raw);assert.equal(n.save(),raw);assert.equal(projectGame(n).dialog.text,oldMediated);assert.equal(n.state.stories.q138.values.mapAt,'party');choose(n,'q138','finish');assert.equal(n.state.stories.q138.values.mapAt,'ira');
 const fresh=q138Engine();for(const id of ['map','talk','escort'])choose(fresh,'q138',id);assert.equal(projectGame(fresh).dialog.text,q138NewMediated);assert.equal(fresh.state.stories.q138.values.mapAt,'party');
 // Loading before the final journey uses the current prose on actual arrival.
 const before=q138Engine({legacy:true});for(const id of ['tracks','talk'])choose(before,'q138',id);const resumed=new GameEngine(data);resumed.load(before.save());resumed.random=()=>.999999;choose(resumed,'q138','escort');assert.equal(projectGame(resumed).dialog.text,q138NewMediated);
});

test('q138 accepted old routes preserve their six phases and all eight direct endings',()=>{
 for(const phase of ['available','accepted','dungeon','text','choice','completed']){const old=q138AcceptedEngine({accepted:phase!=='available',entered:!['available','accepted'].includes(phase),started:['text','choice','completed'].includes(phase)});if(['choice','completed'].includes(phase))drain(old);if(phase==='completed')for(const id of ['tracks','solo'])q138AcceptedChoose(old,id);const raw=old.save(),expected=JSON.parse(raw),g=new GameEngine(data);assert.deepEqual(validateSave(expected,acceptedQ138Data),[]);g.load(raw);if(phase!=='available')(expected.state.flags.legacyStoryRoutes??={}).q138=true;assert.deepEqual(JSON.parse(g.save()),expected);assert.equal(g.state.stories.q138,undefined);checkpoint(g);if(phase==='available'){assert.ok(g.accept('q138'));go(g,data.quests.q138.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q138'}));drain(g);assert.equal(g.state.stories.q138.revision,1);}}
 for(const route of q138AcceptedRoutes){const old=q138AcceptedEngine();drain(old);const g=new GameEngine(data);g.load(old.save());for(const id of route.path){q138AcceptedChoose(g,id);checkpoint(g);assert.equal(g.state.stories.q138,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}assert.equal(g.state.quests.q138.outcome,route.outcome);}
});

test('q138 malformed old and current saves reject atomically without changing the existing state',()=>{
 for(const legacy of [false,true]){const old=q138Engine({legacy}),g=q138Engine(),before=g.save();for(const mutate of [s=>s.stories.q138.values.iraAt='unknown',s=>s.stories.q138.values.narlAt='ira',s=>s.stories.q138.values.mapAt='nowhere',s=>s.stories.q138.values.map=3,s=>delete s.stories.q138.values.narlAt,s=>s.stories.q138.events.push('unwritten'),s=>s.stories.q138.revision=2,s=>(s.flags.legacyStoryRoutes??={}).q138=true]){const raw=JSON.parse(old.save());mutate(raw.state);assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);}}
});

test('q138 completed map ownership remains intact alongside q137 evacuation migration',()=>{
 const oldData={...previousQ138Data,quests:{...previousQ138Data.quests,q137:previousQ137},scripts:{...previousQ138Data.scripts,...previousQ137.scripts}},old=new GameEngine(oldData);old.load(ready().save());old.random=()=>.999999;start(old,'q138');for(const id of ['tracks','talk','escort','finish'])choose(old,'q138',id);start(old,'q137');assert.ok(old.dispatch({type:'choose',id:'close'}));drain(old);const raw=old.save(),g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),upgradedQ137Save(raw));assert.equal(g.state.stories.q138.values.mapAt,'ira');assert.equal(g.state.stories.q138.values.narlAt,'pupil');checkpoint(g);
});

for(const layout of ['classic','scene'])test(layout+': q138 shows the present explorers and preserves current or saved prose through real page buttons',async()=>{
 const dom=installDOM();let view;try{for(const f of (await fixtures()).fixtures){const g=new GameEngine(data);g.load(f.save);view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));assert.equal(dom.root.querySelectorAll('[data-character]').length,f.cast.length);for(const id of f.cast){const person=dom.root.querySelector(`[data-character="${id}"]`);assert.ok(person.textContent.includes(data.characters[id].name));assert.equal(person.querySelector('img').src,data.assets.images['npc_'+id]);}
  const pages=[dom.root.querySelector('.story-text').textContent],choice=`[data-focus="choice:${f.availableChoice}"]`;for(let n=0;!dom.root.querySelector(choice)&&n<32;n++){const next=dom.root.querySelector(layout==='scene'?'[data-focus="message:next"]':'.message-window .continue');assert.ok(next);next.click();view.render(projectGame(g));pages.push(dom.root.querySelector('.story-text').textContent);}assert.ok(dom.root.querySelector(choice));assert.ok(pages.join('').includes(f.expectedText));
 }}finally{view?.destroy();dom.restore();}
});
