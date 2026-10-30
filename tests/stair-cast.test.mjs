import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain,checkpoint} from './pilgrimage-helpers.mjs';
import {q133Engine,q133Routes,q133Cast,previousQ133,previousQ133Data,upgradedQ133Save,q133AcceptedEngine,q133AcceptedChoose,acceptedQ133Data,stairArtFixtures} from '../tools/stair-art-fixtures.mjs';
import {previousQ132,upgradedQ132Save} from '../tools/treasury-art-fixtures.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;const fixtures=()=>fixturePromise??=stairArtFixtures();
const roles=['doma','mason'];
const checkPeople=g=>{const s=g.state.stories.q133;for(const role of roles)assert.equal(s.values[role+'At'],s.values.partyAt);checkpoint(g);};
function step(g,id,check=()=>{}){
 assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);
 if(g.state.journey){const action=g.data.quests.q133.story.actions[g.state.journey.action];go(g,g.data.quests.q133.story.worldPlaces[action.journey.to]);check(g);drain(g);check(g);}
}

test('q133 adds only two people, their five casts and four escorted journeys to the previous definition',()=>{
 const q=structuredClone(data.quests.q133);assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ133.story);
 for(const role of roles){assert.equal(q.story.entities[role].character,'q133_'+role);assert.equal(q.story.registry[role+'At'].initial,'entry');delete q.story.entities[role];delete q.story.registry[role+'At'];}
 for(const r of Object.values(q.story.registry))if(r.values)r.values=r.values.filter(v=>!roles.includes(v));
 for(const s of Object.values(q.story.scenes)){assert.deepEqual(s.cast.map(c=>c.entity),roles);s.cast=[];}
 let journeys=0;for(const a of Object.values(q.story.actions))if(a.journey){journeys++;assert.deepEqual(a.journey.companions,roles);a.journey.companions=[];assert.deepEqual(a.effects[0].entities,['party',...roles]);a.effects[0].entities=['party'];}
 assert.equal(journeys,4);delete q.model.storyUpgrades;q.story.revision=1;q.model.edition.revision=1;assert.deepEqual(q,previousQ133);assert.equal(q.model.preserveAcceptedRoute,true);assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);
});

test('q133 browser fixtures distinguish both preparations at all three later scenes and preserve old routes',async()=>{
 const {fixtures:states,outcomes}=await fixtures();assert.equal(states.length,19);assert.equal(outcomes.length,2);assert.equal(states.filter(f=>f.absentStoryScene).length,3);
 for(const f of states){const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);if(f.absentStoryScene){assert.equal(g.state.stories.q133,undefined);assert.equal(projectGame(g).dialog.scene,undefined);}else{checkPeople(g);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q133Cast);}}
});

test('q133 previous saves migrate only two locations and revision through all scenes, journeys and endings',()=>{
 const phases=new Set(),scenes=new Set(),places=new Set();let checks=0;
 const check=g=>{const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);const current=new GameEngine(data);current.load(raw);assert.deepEqual(JSON.parse(current.save()),upgradedQ133Save(raw));assert.equal(g.save(),raw);checkPeople(current);checks++;
  const before=projectGame(g).dialog,after=projectGame(current).dialog;assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  phases.add(g.state.journey?'journey':g.state.quests.q133.stage==='completed'?'completed':g.state.waiting?.type);if(g.state.stories.q133.scene)scenes.add(g.state.stories.q133.scene);places.add(current.state.stories.q133.values.domaAt);
 };
 for(const route of q133Routes){const g=q133Engine({legacy:true});check(g);for(const id of ['step','back',...route.path])step(g,id,check);assert.equal(g.state.quests.q133.outcome,route.outcome);}
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);assert.deepEqual([...scenes].sort(),['entry','warning','platform','drawing','stairs'].sort());assert.deepEqual([...places].sort(),['entry','platform','transit'].sort());assert.ok(checks>=60);
});

test('q133 current and resumed routes keep both escorts, preparation flags, two endings and one reward',()=>{
 for(const legacy of [false,true])for(const warning of [false,true])for(const route of q133Routes){const old=q133Engine({legacy}),g=new GameEngine(data);g.load(old.save());g.random=()=>.999999;const members=[...g.state.members];let payments=0;const complete=g.complete.bind(g);
  g.complete=(id,outcome)=>{const gold=g.state.gold,result=complete(id,outcome);if(id==='q133'){payments++;assert.equal(g.state.gold-gold,data.quests.q133.outcomes[outcome].gold);}return result;};
  for(const id of [...(warning?['step','back']:[]),...route.path])step(g,id,current=>{checkPeople(current);assert.deepEqual(current.state.members,members);if(current.state.journey){const s=current.state.stories.q133;assert.equal(s.scene,null);assert.equal(s.values.partyAt,'transit');assert.deepEqual(data.quests.q133.story.actions[current.state.journey.action].journey.companions,roles);assert.equal(current.dispatch({type:'story.resume',quest:'q133'}),false);}});
  const s=g.state.stories.q133;assert.equal(s.values.weightChecked,route.preparation==='weight');assert.equal(s.values.fixed,route.preparation==='fix');assert.equal(s.values.partyAt,'entry');assert.equal(g.state.quests.q133.outcome,route.outcome);assert.equal(payments,1);
  const before=g.save();assert.throws(()=>complete('q133',route.outcome));assert.equal(g.save(),before);const gold=g.state.gold;g.run(data.quests.q133.model.entryScript);drain(g);assert.equal(g.state.gold,gold);assert.equal(payments,1);
 }
});

test('q133 each old journey resumes after retreat without setting preparation before arrival',()=>{
 const seen=new Set();
 for(const route of q133Routes){const old=q133Engine({legacy:true});for(const id of route.path)step(old,id,g=>{
  const j=g.state.journey;if(!j||seen.has(j.action))return;seen.add(j.action);const current=new GameEngine(data);current.load(g.save());const before=structuredClone(current.state.stories.q133.values),dest=data.quests.q133.story.actions[j.action].journey.to;
  checkPeople(current);assert.equal(before.partyAt,'transit');if(j.action.startsWith('entry_')){assert.equal(before.weightChecked,false);assert.equal(before.fixed,false);}
  assert.ok(current.dispatch({type:'retreat'}));go(current,{kind:'town',location:'pilgrim_board'});assert.equal(current.dispatch({type:'story.resume',quest:'q133'}),false);assert.deepEqual(current.state.stories.q133.values,before);checkPeople(current);
  go(current,data.quests.q133.story.worldPlaces[dest]);drain(current);assert.equal(current.state.journey,null);assert.equal(current.state.stories.q133.values.partyAt,dest);checkPeople(current);
  if(j.action==='entry_weight'){assert.equal(current.state.stories.q133.values.weightChecked,true);assert.equal(current.state.stories.q133.values.fixed,false);}if(j.action==='entry_fix'){assert.equal(current.state.stories.q133.values.fixed,true);assert.equal(current.state.stories.q133.values.weightChecked,false);}
 });}
 assert.deepEqual([...seen].sort(),['entry_weight','entry_fix','platform_save','platform_stairs'].sort());
});

test('q133 warning is a safe same-place retry and both preparations remain free without inventory',()=>{
 for(const legacy of [false,true])for(const preparation of ['weight','fix']){const old=q133Engine({legacy}),g=new GameEngine(data);g.load(old.save());g.state.gold=0;for(const item of Object.keys(g.state.inventory))g.state.inventory[item]=0;
  const health=Object.fromEntries(Object.entries(g.state.actors).map(([id,a])=>[id,a.hp]));const items=structuredClone(g.state.inventory);
  for(let n=0;n<2;n++){choose(g,'q133','step');assert.equal(g.state.stories.q133.scene,'warning');assert.equal(g.state.journey,null);checkPeople(g);choose(g,'q133','back');assert.equal(g.state.stories.q133.scene,'entry');}
  assert.deepEqual(Object.fromEntries(Object.entries(g.state.actors).map(([id,a])=>[id,a.hp])),health);assert.deepEqual(g.state.inventory,items);assert.equal(g.state.gold,0);assert.equal(g.state.stories.q133.values.weightChecked,false);assert.equal(g.state.stories.q133.values.fixed,false);
  assert.ok(g.dispatch({type:'choose',id:preparation}));drain(g);assert.equal(g.state.gold,0);assert.deepEqual(g.state.inventory,items);checkPeople(g);assert.equal(g.state.stories.q133.values.weightChecked,false);assert.equal(g.state.stories.q133.values.fixed,false);
 }
});

test('q133 accepted legacy saves retain six phases and unaccepted old saves start the current route',()=>{
 for(const phase of ['available','accepted','dungeon','text','choice','completed']){const old=q133AcceptedEngine({accepted:phase!=='available',entered:!['available','accepted'].includes(phase),started:['text','choice','completed'].includes(phase)});if(['choice','completed'].includes(phase))drain(old);if(phase==='completed')for(const id of ['fix','stairs'])q133AcceptedChoose(old,id);
  const raw=old.save(),expected=JSON.parse(raw),g=new GameEngine(data);assert.deepEqual(validateSave(expected,acceptedQ133Data),[]);g.load(raw);if(phase!=='available')(expected.state.flags.legacyStoryRoutes??={}).q133=true;assert.deepEqual(JSON.parse(g.save()),expected);assert.equal(old.save(),raw);assert.equal(g.state.stories.q133,undefined);checkpoint(g);
  if(phase==='available'){assert.ok(g.accept('q133'));assert.equal(g.state.flags.currentStoryRoutes.q133,true);go(g,data.quests.q133.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q133'}));drain(g);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q133Cast);}
 }
});

test('q133 accepted old routes keep the original direct endings and warning loop without typed stories',()=>{
 for(const route of q133Routes){const old=q133AcceptedEngine();drain(old);const g=new GameEngine(data);g.load(old.save());for(const id of ['step','back',...route.path.slice(0,-1)]){assert.equal(projectGame(g).dialog.scene,undefined);q133AcceptedChoose(g,id);checkpoint(g);assert.equal(g.state.stories.q133,undefined);assert.equal(g.state.journey,null);}assert.equal(g.state.quests.q133.outcome,route.outcome);}
});

test('q133 corrupt old and current saves reject atomically before accepting new locations',()=>{
 const old=q133Engine({legacy:true}),g=q133Engine(),before=g.save();
 for(const mutate of [s=>s.stories.q133.values.partyAt='nowhere',s=>delete s.stories.q133.values.weightChecked,s=>s.stories.q133.values.domaAt='entry',s=>s.stories.q133.values.masonAt='entry',s=>s.stories.q133.values.extra=true,s=>s.stories.q133.events.push('unwritten'),s=>s.stories.q133.revision=99,s=>(s.flags.legacyStoryRoutes??={}).q133=true]){const raw=JSON.parse(old.save());mutate(raw.state);assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);}
 for(const role of roles){const raw=JSON.parse(before);raw.state.stories.q133.values[role+'At']='nowhere';assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);}
});

test('q133 journey migration composes with an older q132 while preserving a completed current q131',()=>{
 const oldData={...previousQ133Data,quests:{...previousQ133Data.quests,q132:previousQ132},scripts:{...previousQ133Data.scripts,...previousQ132.scripts}};
 const old=new GameEngine(oldData);old.load(ready().save());old.random=()=>.999999;start(old,'q131');for(const id of ['test','sample','finish'])choose(old,'q131',id);start(old,'q132');for(const id of ['room','decoy','seal'])choose(old,'q132',id);start(old,'q133');assert.ok(old.dispatch({type:'choose',id:'fix'}));drain(old);
 const raw=old.save(),expected=upgradedQ132Save(JSON.stringify(upgradedQ133Save(raw))),g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),expected);checkPeople(g);go(g,data.quests.q133.story.worldPlaces.platform);drain(g);choose(g,'q133','save');choose(g,'q133','finish');assert.equal(g.state.stories.q132.values.managerAt,'seal');assert.equal(g.state.stories.q131.values.teacherAt,'room');
});

for(const layout of ['classic','scene'])test(layout+': q133 renders both present escorts and no portraits on accepted old routes',async()=>{
 const dom=installDOM();let view;
 try{for(const f of (await fixtures()).fixtures){const g=new GameEngine(data);g.load(f.save);view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));assert.equal(dom.root.querySelectorAll('[data-character]').length,f.cast.length);for(const id of f.cast){const person=dom.root.querySelector(`[data-character="${id}"]`);assert.ok(person.textContent.includes(data.characters[id].name));assert.equal(person.querySelector('img').src,data.assets.images['npc_'+id]);}}}finally{view?.destroy();dom.restore();}
});
