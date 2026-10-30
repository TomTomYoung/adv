import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain,checkpoint} from './pilgrimage-helpers.mjs';
import {fight} from './helpers.mjs';
import {resolveBattle} from '../tools/audit-regional-relocation.mjs';
import {q134Engine,q134Routes,q134Cast,q134KeeperAt,previousQ134,previousQ134Data,upgradedQ134Save,q134AcceptedEngine,q134AcceptedRoutes,q134AcceptedChoose,acceptedQ134Data,vaultArtFixtures} from '../tools/vault-art-fixtures.mjs';
import {previousQ133,upgradedQ133Save} from '../tools/stair-art-fixtures.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;const fixtures=()=>fixturePromise??=vaultArtFixtures();
function step(g,id,check=()=>{}){
 assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);
 if(g.state.battle){g.healAll();fight(g);check(g);}
 if(g.state.journey){const a=g.data.quests.q134.story.actions[g.state.journey.action];go(g,g.data.quests.q134.story.worldPlaces[a.journey.to]);check(g);drain(g);check(g);}
}
const people=g=>{const s=g.state.stories.q134;assert.equal(s.values.custodianAt,q134KeeperAt(g.state));assert.equal(s.values.masterAt,'master');assert.equal(s.values.ownerAt,'owner');checkpoint(g);};

test('q134 adds four character links, seven casts and one escorted keeper journey only',()=>{
 const q=structuredClone(data.quests.q134);assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ134.story);
 for(const role of ['zag','master','owner']){assert.equal(q.story.entities[role].character,'q134_'+role);delete q.story.entities[role].character;}
 assert.equal(q.story.entities.custodian.character,'q134_keeper');assert.equal(q.story.registry.custodianAt.initial,'keeper');delete q.story.entities.custodian;delete q.story.registry.custodianAt;for(const r of Object.values(q.story.registry))if(r.values)r.values=r.values.filter(v=>v!=='custodian');
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>'q134_'+(c.entity==='custodian'?'keeper':c.entity)),q134Cast(id));s.cast=[];}
 const a=q.story.actions.receipt_enter;assert.deepEqual(a.journey.companions,['custodian']);a.journey.companions=[];assert.deepEqual(a.effects[0].entities,['party','custodian']);a.effects[0].entities=['party'];
 delete q.model.storyUpgrades;q.story.revision=1;q.model.edition.revision=1;assert.deepEqual(q,previousQ134);assert.equal(data.scenarioEditions.editions.e2.saveRevision,2);
});

test('q134 fixtures cover eight current, eight migrated and two accepted old scenes',async()=>{
 const {fixtures:states,outcomes}=await fixtures();assert.equal(states.length,18);assert.equal(outcomes.length,4);assert.equal(states.filter(f=>f.absentStoryScene).length,2);
 for(const f of states){const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);if(f.absentStoryScene)assert.equal(projectGame(g).dialog.scene,undefined);else{people(g);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q134Cast(f.scene));}}
});

test('q134 old physical saves migrate only custodianAt and revision in every phase',()=>{
 const phases=new Set(),scenes=new Set(),places=new Set();let checks=0;
 const check=g=>{const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);const current=new GameEngine(data);current.load(raw);assert.deepEqual(JSON.parse(current.save()),upgradedQ134Save(raw));assert.equal(g.save(),raw);people(current);checks++;
  const before=projectGame(g).dialog,after=projectGame(current).dialog;assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  phases.add(g.state.battle?'battle':g.state.journey?'journey':g.state.quests.q134.stage==='completed'?'completed':g.state.waiting?.type);if(g.state.stories.q134.scene)scenes.add(g.state.stories.q134.scene);places.add(current.state.stories.q134.values.custodianAt);
 };
 for(const route of q134Routes){const g=q134Engine({legacy:true});check(g);for(const id of route.path)step(g,id,check);assert.equal(g.state.quests.q134.outcome,route.outcome);check(g);}
 for(const phase of ['text','choice','journey','battle','completed'])assert.ok(phases.has(phase),phase);assert.deepEqual([...scenes].sort(),Object.keys(data.quests.q134.story.scenes).sort());assert.deepEqual([...places].sort(),['keeper','transit','vault']);assert.ok(checks>=50);
});

test('q134 routes preserve cast locations, item handoffs, four endings and a single reward',()=>{
 for(const legacy of [false,true])for(const route of q134Routes){const old=q134Engine({legacy}),g=new GameEngine(data);g.load(old.save());g.random=()=>.999999;const members=[...g.state.members];let payments=0;const complete=g.complete.bind(g);
  g.complete=(id,outcome)=>{const gold=g.state.gold,result=complete(id,outcome);if(id==='q134'){payments++;assert.equal(g.state.gold-gold,data.quests.q134.outcomes[outcome].gold);}return result;};
  for(const id of route.path)step(g,id,current=>{people(current);assert.deepEqual(current.state.members,members);const s=current.state.stories.q134,j=current.state.journey;
   if(j){assert.equal(s.scene,null);assert.equal(s.values.partyAt,'transit');assert.equal(current.dispatch({type:'story.resume',quest:'q134'}),false);
    if(j.action==='return_sword'){assert.equal(s.values.zagAt,'transit');assert.equal(s.values.swordAt,'zag');assert.equal(s.values.practiceAt,'master');}
    if(j.action==='return_parcel'){assert.equal(s.values.zagAt,'keeper');assert.equal(s.values.parcelAt,'party');assert.equal(s.values.receiptAt,'owner');}
    if(j.action==='delivered_back'){assert.equal(s.values.zagAt,'keeper');assert.equal(s.values.parcelAt,'owner');assert.equal(s.values.receiptAt,'party');}
    if(j.action==='receipt_enter'){assert.equal(s.values.zagAt,'keeper');assert.equal(s.values.custodianAt,'transit');assert.equal(s.values.receiptAt,'keeper');}
    if(j.action==='entry_break_ready_continue'){assert.equal(s.values.zagAt,'entry');assert.equal(s.values.custodianAt,'keeper');}
   }
  });
  const v=g.state.stories.q134.values;assert.equal(g.state.quests.q134.outcome,route.outcome);assert.equal(payments,1);
  assert.equal(v.swordAt,route.outcome==='sword'?'master':'zag');assert.equal(v.practiceAt,route.outcome==='sword'?'zag':'master');assert.equal(v.parcelAt,route.outcome==='parcel'?'owner':'keeper');assert.equal(v.receiptAt,route.outcome==='parcel'?'keeper':'owner');
  assert.equal(v.zagAt,route.outcome==='sword'?'master':route.path[0]==='rule'?'keeper':'entry');assert.equal(v.custodianAt,route.outcome==='parcel'?'vault':'keeper');
  const before=g.save();assert.throws(()=>complete('q134',route.outcome));assert.equal(g.save(),before);g.run(data.quests.q134.model.entryScript);drain(g);assert.equal(payments,1);
 }
});

test('q134 all six old journeys can retreat and resume without early handoffs',()=>{
 const seen=new Set();for(const route of q134Routes){const old=q134Engine({legacy:true});for(const id of route.path)step(old,id,g=>{
  const j=g.state.journey;if(!j||seen.has(j.action))return;seen.add(j.action);const current=new GameEngine(data);current.load(g.save());const values=structuredClone(current.state.stories.q134.values),dest=data.quests.q134.story.actions[j.action].journey.to;
  if(current.state.mode==='dungeon')assert.ok(current.dispatch({type:'retreat'}));go(current,{kind:'town',location:'pilgrim_board'});assert.equal(current.dispatch({type:'story.resume',quest:'q134'}),false);assert.deepEqual(current.state.stories.q134.values,values);people(current);
  go(current,data.quests.q134.story.worldPlaces[dest]);drain(current);assert.equal(current.state.journey,null);assert.equal(current.state.stories.q134.values.partyAt,dest);people(current);
 });}assert.deepEqual([...seen].sort(),['entry_rule','return_sword','return_parcel','delivered_back','receipt_enter','entry_break_ready_continue'].sort());
});

test('q134 saved guard fights allow escape and defeat retries without moving Zag or keeper',()=>{
 for(const legacy of [false,true])for(const result of ['escape','lose']){const old=q134Engine({legacy});choose(old,'q134','break',{combat:'pending'});const g=new GameEngine(data);g.load(old.save());assert.equal(g.state.battle.encounter,'guard_4');resolveBattle(g,result);people(g);assert.equal(g.state.stories.q134.values.zagAt,'entry');assert.equal(g.state.stories.q134.values.custodianAt,'keeper');assert.equal(g.state.quests.q134.stage,'active');
  if(result==='lose'){go(g,data.quests.q134.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q134'}));drain(g);}assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q134_zag']);
  for(const id of ['break','continue','finish'])choose(g,'q134',id);assert.equal(g.state.quests.q134.outcome,'break');assert.equal(g.state.stories.q134.values.custodianAt,'keeper');
 }
});

test('q134 both decline paths remain free and do not invent a challenge payment',()=>{
 for(const legacy of [false,true])for(const from of ['entry','return']){const old=q134Engine({legacy});if(from==='return')choose(old,'q134','rule');const g=new GameEngine(data);g.load(old.save());g.state.gold=0;for(const id of Object.keys(g.state.inventory))g.state.inventory[id]=0;choose(g,'q134','decline');assert.equal(g.state.gold,data.quests.q134.outcomes.decline.gold);assert.equal(g.state.quests.q134.outcome,'decline');people(g);}
});

test('q134 accepted old saves preserve seven phases and unaccepted saves start the physical route',()=>{
 for(const phase of ['available','accepted','dungeon','text','choice','battle','completed']){const old=q134AcceptedEngine({accepted:phase!=='available',entered:!['available','accepted'].includes(phase),started:['text','choice','battle','completed'].includes(phase)});if(['choice','battle','completed'].includes(phase))drain(old);if(phase==='battle')q134AcceptedChoose(old,'break',{combat:false});if(phase==='completed')for(const id of ['rule','sword'])q134AcceptedChoose(old,id);
  const raw=old.save(),expected=JSON.parse(raw),g=new GameEngine(data);assert.deepEqual(validateSave(expected,acceptedQ134Data),[]);g.load(raw);if(phase!=='available')(expected.state.flags.legacyStoryRoutes??={}).q134=true;assert.deepEqual(JSON.parse(g.save()),expected);assert.equal(g.state.stories.q134,undefined);checkpoint(g);
  if(phase==='available'){assert.ok(g.accept('q134'));go(g,data.quests.q134.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q134'}));drain(g);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q134_zag']);}
 }
});

test('q134 accepted old routes keep direct endings and combat retries without typed stories',()=>{
 for(const route of q134AcceptedRoutes){const old=q134AcceptedEngine();drain(old);const g=new GameEngine(data);g.load(old.save());for(const id of route.path){assert.equal(projectGame(g).dialog.scene,undefined);q134AcceptedChoose(g,id);checkpoint(g);assert.equal(g.state.stories.q134,undefined);assert.equal(g.state.journey,null);}assert.equal(g.state.quests.q134.outcome,route.outcome);}
 for(const result of ['escape','lose']){const old=q134AcceptedEngine();drain(old);q134AcceptedChoose(old,'break',{combat:false});const g=new GameEngine(data);g.load(old.save());resolveBattle(g,result);checkpoint(g);if(result==='lose'){const p=data.previousQuestRoutes.q134.locations.find(p=>p.role==='decision');go(g,{kind:'dungeon',dungeon:p.dungeon,map:p.map,x:p.x,y:p.y});g.run(data.quests.q134.model.entryScript);drain(g);}q134AcceptedChoose(g,'break');assert.equal(g.state.quests.q134.outcome,'break');assert.equal(g.state.stories.q134,undefined);}
});

test('q134 rejects corrupt old or current locations atomically',()=>{
 const old=q134Engine({legacy:true}),g=q134Engine(),before=g.save();for(const mutate of [s=>s.stories.q134.values.swordAt='nowhere',s=>delete s.stories.q134.values.zagAt,s=>s.stories.q134.values.custodianAt='keeper',s=>s.stories.q134.values.extra=true,s=>s.stories.q134.events.push('unwritten'),s=>s.stories.q134.revision=99,s=>(s.flags.legacyStoryRoutes??={}).q134=true]){const raw=JSON.parse(old.save());mutate(raw.state);assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);}
 const raw=JSON.parse(before);raw.state.stories.q134.values.custodianAt='nowhere';assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);
});

test('q134 migration composes with old q133 and preserves completed current q132',()=>{
 const oldData={...previousQ134Data,quests:{...previousQ134Data.quests,q133:previousQ133},scripts:{...previousQ134Data.scripts,...previousQ133.scripts}},old=new GameEngine(oldData);old.load(ready().save());old.random=()=>.999999;start(old,'q132');for(const id of ['room','decoy','seal'])choose(old,'q132',id);start(old,'q133');for(const id of ['fix','stairs','finish'])choose(old,'q133',id);start(old,'q134');for(const id of ['rule','parcel','back'])choose(old,'q134',id);assert.ok(old.dispatch({type:'choose',id:'enter'}));drain(old);
 const expected=upgradedQ133Save(JSON.stringify(upgradedQ134Save(old.save()))),g=new GameEngine(data);g.load(old.save());assert.deepEqual(JSON.parse(g.save()),expected);people(g);go(g,data.quests.q134.story.worldPlaces.vault);drain(g);choose(g,'q134','finish');assert.equal(g.state.stories.q133.values.masonAt,'entry');assert.equal(g.state.stories.q132.values.managerAt,'seal');
});

for(const layout of ['classic','scene'])test(layout+': q134 renders only characters present in each scene',async()=>{
 const dom=installDOM();let view;try{for(const f of (await fixtures()).fixtures){const g=new GameEngine(data);g.load(f.save);view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));assert.equal(dom.root.querySelectorAll('[data-character]').length,f.cast.length);for(const id of f.cast){const person=dom.root.querySelector(`[data-character="${id}"]`);assert.ok(person.textContent.includes(data.characters[id].name));assert.equal(person.querySelector('img').src,data.assets.images['npc_'+id]);}}}finally{view?.destroy();dom.restore();}
});
