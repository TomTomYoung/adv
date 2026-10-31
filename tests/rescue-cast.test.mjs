import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {data,choose,go,drain,checkpoint} from './pilgrimage-helpers.mjs';
import {previousQ139,q139Routes,q139Cast,upgradedQ139Save,q139Engine,q139AcceptedEngine,q139AcceptedRoutes,q139AcceptedChoose,rescueArtFixtures} from '../tools/rescue-art-fixtures.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;const fixtures=()=>fixturePromise??=rescueArtFixtures();
function people(g){assert.equal(g.state.stories.q139.values.senaAt,'entry');assert.equal(g.state.stories.q139.values.geologistAt,'entry');checkpoint(g);}
function step(g,id,check=()=>{}){assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);if(g.state.journey){const a=g.data.quests.q139.story.actions[g.state.journey.action];go(g,g.data.quests.q139.story.worldPlaces[a.journey.to]);check(g);drain(g);check(g);}}

test('q139 adds only two people, group character links, scene casts and the declared save upgrade',()=>{
 const q=structuredClone(data.quests.q139);assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ139.story);
 for(const role of ['sena','geologist']){delete q.story.registry[role+'At'];delete q.story.entities[role];}
 for(const role of ['crowd','injured','helpers']){assert.equal(q.story.entities[role].kind,'group');assert.equal(data.characters['q139_'+role].portrait,undefined);delete q.story.entities[role].character;}
 for(const scene of Object.values(q.story.scenes))scene.cast=[];
 delete q.model.storyUpgrades;q.story.revision=1;q.model.edition.revision=1;assert.deepEqual(q,previousQ139);
 assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);assert.notEqual(data.characters.q139_sena,data.characters.q202_trainer);
});

test('q139 fixtures cover every scene, both home variants and old accepted choices',async()=>{
 const {fixtures:states,outcomes}=await fixtures();assert.equal(states.length,35);assert.equal(outcomes.length,3);
 for(const f of states){const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);if(!f.absentStoryScene){people(g);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q139Cast(f.scene,f.variant.endsWith('-help')));}}
});

test('q139 all old text, choices, journeys and endings migrate only two locations and revision',()=>{
 const phases=new Set(),scenes=new Set(),journeys=new Set();
 const check=g=>{const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);const n=new GameEngine(data);n.load(raw);assert.deepEqual(JSON.parse(n.save()),upgradedQ139Save(raw));people(n);assert.equal(projectGame(n).dialog?.text,projectGame(g).dialog?.text);assert.deepEqual(projectGame(n).dialog?.options,projectGame(g).dialog?.options);
  phases.add(g.state.journey?'journey':g.state.quests.q139.stage==='completed'?'completed':g.state.waiting?.type);if(g.state.journey)journeys.add(g.state.journey.action);if(g.state.stories.q139.scene)scenes.add(g.state.stories.q139.scene);
 };
 for(const route of q139Routes){const g=q139Engine({legacy:true});check(g);for(const id of route.path)step(g,id,check);}
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
 assert.equal(journeys.size,Object.values(data.quests.q139.story.actions).filter(a=>a.journey).length);assert.deepEqual([...scenes].sort(),Object.keys(data.quests.q139.story.scenes).sort());
});

test('q139 current and resumed routes preserve rescue outcomes, single payment, rope cost and party',()=>{
 for(const legacy of [false,true])for(const route of q139Routes){const g=new GameEngine(data);g.load(q139Engine({legacy}).save());g.random=()=>.999999;const members=[...g.state.members],rope=g.state.inventory.rope;let payments=0;const complete=g.complete.bind(g);
  g.complete=(id,outcome)=>{const gold=g.state.gold,result=complete(id,outcome);if(id==='q139'){payments++;assert.equal(g.state.gold-gold,93);}return result;};
  for(const id of route.path)step(g,id,n=>{people(n);assert.deepEqual(n.state.members,members);if(n.state.journey)assert.equal(n.state.stories.q139.scene,null);});
  const v=g.state.stories.q139.values;assert.equal(g.state.quests.q139.outcome,route.outcome);assert.equal(v.crowdRescued,route.outcome!=='wounded');assert.equal(v.injuredRescued,route.outcome!=='many');assert.equal(g.state.inventory.rope,rope-(route.rope??0));assert.equal(payments,1);
  const raw=g.save();assert.throws(()=>complete('q139',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q139.model.entryScript);drain(g);assert.equal(payments,1);
 }
});

test('q139 voices, pumping and air preparation show no offstage people; helpers require their return event',()=>{
 for(const help of [false,true]){const g=q139Engine();for(const id of ['measure','other','air','ventilate',help?'help':'tools']){choose(g,'q139',id);const s=g.state.stories.q139;if(['listen','drain','air','air_tools_ready'].includes(s.scene))assert.deepEqual(projectGame(g).dialog.scene.cast,[]);}
  choose(g,'q139',help?'return':'continue');choose(g,'q139','next');assert.ok(g.dispatch({type:'choose',id:'escort'}));drain(g);
  const v=g.state.stories.q139.values;assert.equal(v.injuredAt,'transit');assert.equal(v.crowdAt,'transit');assert.equal(v.injuredRescued,false);assert.equal(v.crowdRescued,false);people(g);
  go(g,data.quests.q139.story.worldPlaces.rescue);drain(g);assert.equal(g.state.stories.q139.values.helpersAt,'rescue');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q139Cast('both_home',help));
 }
});

test('q139 no-rope route stays free and preparation cannot charge rope twice',()=>{
 for(const rope of [0,2]){const g=q139Engine();g.state.gold=0;g.state.inventory.rope=rope;for(const id of ['measure','other','air','ventilate'])choose(g,'q139',id);
  if(!rope){const raw=g.save();assert.equal(g.dispatch({type:'choose',id:'tools'}),false);assert.equal(g.save(),raw);for(const id of ['help','return','next','escort','finish'])choose(g,'q139',id);}
  else{choose(g,'q139','tools');assert.equal(g.state.inventory.rope,0);const raw=g.save();assert.equal(g.dispatch({type:'choose',id:'tools'}),false);assert.equal(g.save(),raw);for(const id of ['continue','next','escort','finish'])choose(g,'q139',id);}
  assert.equal(g.state.quests.q139.outcome,'both');assert.equal(g.state.inventory.rope,0);
 }
});

test('q139 old accepted routes retain old scripts and never acquire new story state or cast',()=>{
 for(const route of q139AcceptedRoutes){const old=q139AcceptedEngine();drain(old);const g=new GameEngine(data);g.load(old.save());g.random=()=>.999999;for(const id of route.path){assert.equal(g.state.stories.q139,undefined);assert.equal(projectGame(g).dialog.scene,undefined);q139AcceptedChoose(g,id);checkpoint(g);}assert.equal(g.state.quests.q139.outcome,route.outcome);assert.equal(g.state.stories.q139,undefined);}
});

test('q139 invalid old saves are rejected atomically before adding role locations',()=>{
 const old=q139Engine({legacy:true});for(const id of ['measure','other','air','ventilate','help','return','next'])choose(old,'q139',id);
 const g=q139Engine(),before=g.save();for(const mutate of [s=>s.stories.q139.values.helpersAt='unknown',s=>s.stories.q139.values.injuredAt='unknown',s=>s.stories.q139.revision=99,s=>s.stories.q139.values.invented=true]){const raw=JSON.parse(old.save());mutate(raw.state);assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);}
});

for(const layout of ['classic','scene'])test(layout+': q139 renders individual images and group labels through real page buttons',async()=>{
 const dom=installDOM();let view;try{for(const f of (await fixtures()).fixtures){const g=new GameEngine(data);g.load(f.save);view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));assert.equal(dom.root.querySelectorAll('[data-character]').length,f.cast.length);
  for(const id of f.cast){const person=dom.root.querySelector(`[data-character="${id}"]`);assert.ok(person.textContent.includes(data.characters[id].name));if(f.textOnlyCast?.includes(id))assert.equal(person.querySelector('img'),null);else assert.equal(person.querySelector('img').src,data.assets.images['npc_'+id]);}
  const pages=[dom.root.querySelector('.story-text').textContent],choice=`[data-focus="choice:${f.availableChoice}"]`;for(let n=0;!dom.root.querySelector(choice)&&n<32;n++){const next=dom.root.querySelector(layout==='scene'?'[data-focus="message:next"]':'.message-window .continue');assert.ok(next);next.click();view.render(projectGame(g));pages.push(dom.root.querySelector('.story-text').textContent);}assert.ok(dom.root.querySelector(choice));assert.ok(pages.join('').includes(f.expectedText));
 }}finally{view?.destroy();dom.restore();}
});
