import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain,checkpoint} from './pilgrimage-helpers.mjs';
import {books,q137Roles,previousQ137,previousQ137Data,q137Routes,q137Cast,q137PeopleAt,upgradedQ137Save,q137Engine,q137AcceptedEngine,q137AcceptedRoutes,q137AcceptedChoose,acceptedQ137Data,burntLibraryArtFixtures} from '../tools/burnt-library-art-fixtures.mjs';
import {previousQ136,upgradedQ136Save} from '../tools/door-art-fixtures.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;const fixtures=()=>fixturePromise??=burntLibraryArtFixtures();
function people(g){for(const role of q137Roles)assert.equal(g.state.stories.q137.values[role+'At'],q137PeopleAt(g.state));checkpoint(g);}
function step(g,id,check=()=>{}){assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);if(g.state.journey){const a=g.data.quests.q137.story.actions[g.state.journey.action];go(g,g.data.quests.q137.story.worldPlaces[a.journey.to]);check(g);drain(g);check(g);}}

test('q137 changes only three roles, two casts, two evacuation journeys and the declared upgrade',()=>{
 const q=structuredClone(data.quests.q137);assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ137.story);assert.equal(q.story.entities.firefighter.kind,'group');assert.equal(data.characters.q137_firefighter.portrait,undefined);
 for(const role of q137Roles){assert.equal(q.story.registry[role+'At'].initial,'entry');delete q.story.registry[role+'At'];delete q.story.entities[role];}
 for(const [id,s] of Object.entries(q.story.scenes)){assert.equal(s.cast.length,q137Cast(id).length);s.cast=[];}
 for(const id of ['entry_close','replace_book_seal']){const a=q.story.actions[id];assert.deepEqual(a.journey.companions,q137Roles);a.journey.companions=[];assert.deepEqual(a.effects[0].entities,['party',...q137Roles]);a.effects[0].entities=['party'];}
 delete q.model.storyUpgrades;q.story.revision=1;q.model.edition.revision=1;assert.deepEqual(q,previousQ137);assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);
});

test('q137 fixtures cover all scenes, each book at all four reading stages and accepted old choices',async()=>{
 const {fixtures:states,outcomes}=await fixtures();assert.equal(states.length,67);assert.equal(outcomes.length,5);assert.equal(states.filter(x=>x.absentStoryScene).length,13);
 for(const f of states){const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);if(f.absentStoryScene){assert.equal(g.state.stories.q137,undefined);assert.equal(projectGame(g).dialog.scene,undefined);}else{people(g);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q137Cast(f.scene));}}
});

test('q137 all old text, choices, eleven journeys and endings migrate only three locations and revision',()=>{
 const phases=new Set(),scenes=new Set(),journeys=new Set(),places=new Set();
 const check=g=>{const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);const n=new GameEngine(data);n.load(raw);assert.deepEqual(JSON.parse(n.save()),upgradedQ137Save(raw));assert.equal(g.save(),raw);people(n);assert.equal(projectGame(n).dialog?.text,projectGame(g).dialog?.text);assert.deepEqual(projectGame(n).dialog?.options,projectGame(g).dialog?.options);
  phases.add(g.state.journey?'journey':g.state.quests.q137.stage==='completed'?'completed':g.state.waiting?.type);if(g.state.journey)journeys.add(g.state.journey.action);if(g.state.stories.q137.scene)scenes.add(g.state.stories.q137.scene);places.add(n.state.stories.q137.values.elAt);
 };
 for(const route of q137Routes){const g=q137Engine({legacy:true});check(g);for(const id of route.path)step(g,id,check);assert.equal(g.state.quests.q137.outcome,route.outcome);}
 for(const p of ['text','choice','journey','completed'])assert.ok(phases.has(p),p);assert.equal(journeys.size,11);assert.deepEqual([...scenes].sort(),Object.keys(data.quests.q137.story.scenes).sort());assert.deepEqual([...places].sort(),['entry','exit','transit']);
});

test('q137 current and resumed routes preserve every reading counter, holder, ending and single reward',()=>{
 for(const legacy of [false,true])for(const route of q137Routes){const g=new GameEngine(data);g.load(q137Engine({legacy}).save());g.random=()=>.999999;const members=[...g.state.members],inventory=structuredClone(g.state.inventory);let payments=0;const complete=g.complete.bind(g);
  g.complete=(id,outcome)=>{const gold=g.state.gold,result=complete(id,outcome);if(id==='q137'){payments++;assert.equal(g.state.gold-gold,93);}return result;};
  for(const id of route.path)step(g,id,n=>{people(n);assert.deepEqual(n.state.members,members);if(n.state.journey){assert.equal(n.state.stories.q137.scene,null);assert.equal(n.dispatch({type:'story.resume',quest:'q137'}),false);}});
  const v=g.state.stories.q137.values;assert.equal(v.book,route.book);assert.equal(v.pages,route.pages);assert.equal(v.resolution,route.outcome);assert.equal(g.state.quests.q137.outcome,route.outcome);assert.equal(payments,1);assert.deepEqual(g.state.inventory,inventory);
  for(const book of books){assert.equal(v[book+'Pages'],book===route.book?route.pages:0);assert.equal(v[book+'At'],book===route.book&&route.outcome!=='close'?'archive':'entry');}
  const saved=g.save();assert.throws(()=>complete('q137',route.outcome));assert.equal(g.save(),saved);g.run(data.quests.q137.model.entryScript);drain(g);assert.equal(payments,1);
 }
});

test('q137 unfinished books cannot leave and a finished book cannot be read or handed off twice',()=>{
 for(const book of books){const g=q137Engine();choose(g,'q137',book);for(let pages=0;pages<4;pages++){
  assert.equal(g.state.stories.q137.values.pages,pages);
  for(const id of [...books.map(b=>'carry_'+b),'prepare','page']){const allowed=id==='page'?pages<3:id==='prepare'?pages===3:pages===3&&id==='carry_'+book;if(!allowed){const raw=g.save();assert.equal(g.dispatch({type:'choose',id}),false);assert.equal(g.save(),raw);}}
  if(pages<3)choose(g,'q137','page');
 }choose(g,'q137','carry_'+book);assert.equal(g.state.stories.q137.values[book+'At'],'party');choose(g,'q137','finish');assert.equal(g.state.stories.q137.values[book+'At'],'archive');}
});

test('q137 book transport preserves departure and arrival timing without moving readers or recipients',()=>{
 for(const book of books)for(const method of ['carry_'+book,'prepare','close']){const g=q137Engine();choose(g,'q137',book);for(let n=0;n<3;n++)choose(g,'q137','page');assert.ok(g.dispatch({type:'choose',id:method}));drain(g);const j=g.state.journey;assert.ok(j);assert.equal(g.state.stories.q137.values[book+'At'],'party');people(g);assert.equal(g.state.stories.q137.values.elAt,'entry');
  const a=data.quests.q137.story.actions[j.action];go(g,data.quests.q137.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.stories.q137.values[book+'At'],method==='prepare'?'archive':method==='close'?'entry':'party');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);people(g);
 }
});

test('q137 old journeys retreat and resume without early evacuation, handoff or reading progress',()=>{
 const seen=new Set();for(const route of q137Routes){const old=q137Engine({legacy:true});for(const id of route.path)step(old,id,g=>{
  const j=g.state.journey;if(!j||seen.has(j.action))return;seen.add(j.action);const n=new GameEngine(data);n.load(g.save());const before=structuredClone(n.state.stories.q137.values),dest=data.quests.q137.story.actions[j.action].journey.to;
  n.random=()=>.999999;if(n.state.mode==='dungeon')assert.ok(n.dispatch({type:'retreat'}));go(n,{kind:'town',location:'pilgrim_board'});assert.equal(n.dispatch({type:'story.resume',quest:'q137'}),false);assert.deepEqual(n.state.stories.q137.values,before);people(n);go(n,data.quests.q137.story.worldPlaces[dest]);drain(n);assert.equal(n.state.journey,null);people(n);
 });}assert.equal(seen.size,11);
});

test('q137 accepted old saves retain six phases and all nineteen direct routes',()=>{
 for(const phase of ['available','accepted','dungeon','text','choice','completed']){const old=q137AcceptedEngine({accepted:phase!=='available',entered:!['available','accepted'].includes(phase),started:['text','choice','completed'].includes(phase)});if(['choice','completed'].includes(phase))drain(old);if(phase==='completed')q137AcceptedChoose(old,'close');
  const raw=old.save(),expected=JSON.parse(raw),g=new GameEngine(data);assert.deepEqual(validateSave(expected,acceptedQ137Data),[]);g.load(raw);if(phase!=='available')(expected.state.flags.legacyStoryRoutes??={}).q137=true;assert.deepEqual(JSON.parse(g.save()),expected);assert.equal(g.state.stories.q137,undefined);checkpoint(g);
  if(phase==='available'){assert.ok(g.accept('q137'));go(g,data.quests.q137.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q137'}));drain(g);people(g);}
 }
 for(const route of q137AcceptedRoutes){const old=q137AcceptedEngine();drain(old);const g=new GameEngine(data);g.load(old.save());for(const id of route.path){q137AcceptedChoose(g,id);checkpoint(g);assert.equal(g.state.stories.q137,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}assert.equal(g.state.quests.q137.outcome,route.outcome);}
});

test('q137 invalid old and current saves reject atomically before adding people',()=>{
 const old=q137Engine({legacy:true}),g=q137Engine(),before=g.save();for(const mutate of [s=>s.stories.q137.values.medicineAt='librarian',s=>s.stories.q137.values.pages=4,s=>s.stories.q137.values.medicinePages=-1,s=>delete s.stories.q137.values.book,s=>s.stories.q137.values.elAt='entry',s=>s.stories.q137.events.push('unwritten'),s=>s.stories.q137.revision=99,s=>(s.flags.legacyStoryRoutes??={}).q137=true]){const raw=JSON.parse(old.save());mutate(raw.state);assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);}
 for(const role of q137Roles){const raw=JSON.parse(before);raw.state.stories.q137.values[role+'At']='nowhere';assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);}
});

test('q137 evacuation migration composes with q136 migration and keeps completed name and refusal',()=>{
 const oldData={...previousQ137Data,quests:{...previousQ137Data.quests,q136:previousQ136},scripts:{...previousQ137Data.scripts,...previousQ136.scripts}},old=new GameEngine(oldData);old.load(ready().save());old.random=()=>.999999;start(old,'q136');for(const id of ['alias','loot','leave'])choose(old,'q136',id);start(old,'q137');assert.ok(old.dispatch({type:'choose',id:'close'}));drain(old);
 const raw=old.save(),expected=upgradedQ136Save(JSON.stringify(upgradedQ137Save(raw))),g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),expected);people(g);go(g,data.quests.q137.story.worldPlaces.exit);drain(g);choose(g,'q137','finish');assert.equal(g.state.stories.q136.values.name,'alias');assert.equal(g.state.quests.q136.outcome,'leave');
});

for(const layout of ['classic','scene'])test(layout+': q137 displays only the documented cast and advances through conditional prose',async()=>{
 const dom=installDOM();let view;try{for(const f of (await fixtures()).fixtures){const g=new GameEngine(data);g.load(f.save);view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));assert.equal(dom.root.querySelectorAll('[data-character]').length,f.cast.length);
  for(const id of f.cast){const person=dom.root.querySelector(`[data-character="${id}"]`);assert.ok(person.textContent.includes(data.characters[id].name));if(id==='q137_firefighter')assert.equal(person.querySelector('img'),null);else assert.equal(person.querySelector('img').src,data.assets.images['npc_'+id]);}
  const pages=[dom.root.querySelector('.story-text').textContent],choice=`[data-focus="choice:${f.availableChoice}"]`;
  for(let n=0;!dom.root.querySelector(choice)&&n<32;n++){const next=dom.root.querySelector(layout==='scene'?'[data-focus="message:next"]':'.message-window .continue');assert.ok(next);next.click();view.render(projectGame(g));pages.push(dom.root.querySelector('.story-text').textContent);}
  assert.ok(dom.root.querySelector(choice));assert.ok(pages.join('').includes(f.expectedText));
 }}finally{view?.destroy();dom.restore();}
});
