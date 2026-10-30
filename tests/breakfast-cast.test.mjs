import test from 'node:test';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {data,start,choose,go,drain,checkpoint} from './pilgrimage-helpers.mjs';
import {q135Engine,q135Routes,q135Cast,previousQ135,previousQ135Data,q135AcceptedEngine,q135AcceptedRoutes,q135AcceptedChoose,acceptedQ135Data,breakfastArtFixtures} from '../tools/breakfast-art-fixtures.mjs';
import {previousQ134} from '../tools/vault-art-fixtures.mjs';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
let fixturePromise;const fixtures=()=>fixturePromise??=breakfastArtFixtures();

test('q135 changes only two character bindings, casts and two prose lines, retaining item ownership and revision',()=>{
 const q=structuredClone(data.quests.q135);
 for(const role of ['ane','doll']){assert.equal(q.story.entities[role].character,'q135_'+role);delete q.story.entities[role].character;}
 assert.equal(q.story.entities.doll.kind,'item');
 for(const [id,scene] of Object.entries(q.story.scenes)){assert.deepEqual(scene.cast.map(c=>'q135_'+c.entity),q135Cast(id));scene.cast=[];}
 const normalized=JSON.parse(JSON.stringify(q).replaceAll('工房へ人形を据え、新しい宿の仕事を一つずつ教えた。','職人の前へ人形を据え、新しい宿の仕事を一つずつ教えた。').replaceAll('組合の受取窓口まで魔石を持ち帰った。','組合の受取窓口へ魔石を納めた。'));
 assert.deepEqual(normalized,previousQ135);assert.equal(q.story.revision,1);assert.equal(q.model.storyUpgrades,undefined);assert.equal(q.model.preserveAcceptedRoute,true);
});

test('q135 current and old physical fixtures cover all scenes, rope shortages, and accepted old scenes',async()=>{
 const result=await fixtures();assert.equal(result.fixtures.length,22);assert.equal(result.outcomes.length,3);
 assert.equal(result.fixtures.filter(f=>f.blockedChoice==='lift').length,4);
 for(const f of result.fixtures){const g=new GameEngine(data);g.load(f.save);assert.equal(g.save(),f.save);if(f.absentStoryScene)assert.equal(projectGame(g).dialog?.scene,undefined);else assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),f.cast);}
});

test('q135 previous physical saves retain every waiting phase, journey and completion byte-for-byte, including old prose',()=>{
 const phases=new Set(),scenes=new Set(),journeys=new Set();
 const check=g=>{const raw=g.save();assert.deepEqual(validateSave(JSON.parse(raw),g.data),[]);const now=new GameEngine(data);now.load(raw);assert.equal(now.save(),raw);checkpoint(now);
  const before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  phases.add(g.state.journey?'journey':g.state.quests.q135.stage==='completed'?'completed':g.state.waiting?.type);if(g.state.stories.q135.scene)scenes.add(g.state.stories.q135.scene);if(g.state.journey)journeys.add(g.state.journey.action);
 };
 for(const route of q135Routes){const g=q135Engine({legacy:true});check(g);for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));check(g);drain(g);check(g);if(g.state.journey){const a=data.quests.q135.story.actions[g.state.journey.action];go(g,data.quests.q135.story.worldPlaces[a.journey.to]);check(g);drain(g);check(g);}}assert.equal(g.state.quests.q135.outcome,route.outcome);}
 for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);assert.deepEqual([...scenes].sort(),Object.keys(data.quests.q135.story.scenes).sort());assert.equal(journeys.size,6);
});

test('q135 all current and resumed routes preserve companions, transfer times, one rope payment, three outcomes and one reward',()=>{
 for(const legacy of [false,true])for(const route of q135Routes){const prior=q135Engine({legacy}),g=new GameEngine(data);g.load(prior.save());g.random=()=>.999999;const members=[...g.state.members];let payments=0;const complete=g.complete.bind(g);
  g.complete=(id,outcome)=>{const gold=g.state.gold;const result=complete(id,outcome);if(id==='q135'){payments++;assert.equal(g.state.gold-gold,data.quests.q135.outcomes[outcome].gold);}return result;};
  for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);
   if(g.state.journey){const action=g.state.journey.action,a=data.quests.q135.story.actions[action],v=g.state.stories.q135.values;
    assert.deepEqual(a.journey.companions,action==='entry_break'?[]:['ane']);assert.equal(v.aneAt,action==='entry_break'?'entry':'transit');
    assert.equal(v.dollAt,action.includes('lift_ready')||action==='surfaced_workshop'?'party':'entry');assert.equal(v.stoneAt,action==='entry_break'?'party':'entry');checkpoint(g);
    go(g,data.quests.q135.story.worldPlaces[a.journey.to]);drain(g);
   }
   checkpoint(g);assert.deepEqual(g.state.members,members);const s=g.state.stories.q135;
   if(s.scene==='stone_report'&&g.state.quests.q135.stage==='active'){assert.equal(s.values.stoneAt,'party');assert.deepEqual(projectGame(g).dialog.scene.cast,[]);assert.match(projectGame(g).dialog.text,/持ち帰った/);}
   if(s.scene==='refill'){assert.equal(s.values.dollAt,'entry');assert.equal(s.values.aneAt,'shore');}
   if(s.scene==='retrained')assert.equal(s.values.dollAt,'workshop');
  }
  const v=g.state.stories.q135.values;assert.equal(g.state.quests.q135.outcome,route.outcome);assert.equal(v.dollAt,route.outcome==='lift'?'workshop':'entry');assert.equal(v.stoneAt,route.outcome==='break'?'union':'entry');assert.equal(v.aneAt,route.outcome==='lift'?'workshop':'entry');assert.equal(g.state.inventory.rope,route.outcome==='lift'?0:1);assert.equal(payments,1);
  const before=g.save();assert.throws(()=>complete('q135',route.outcome));assert.equal(g.save(),before);const gold=g.state.gold;g.run(data.quests.q135.model.entryScript);drain(g);assert.equal(g.state.gold,gold);
 }
});

test('q135 no-rope choices stay free and paid preparation survives departure, retreat and resumption',()=>{
 for(const legacy of [false,true])for(const fromReply of [false,true]){
  const prior=q135Engine({legacy,rope:0}),poor=new GameEngine(data);poor.load(prior.save());if(fromReply)choose(poor,'q135','listen');const raw=poor.save();assert.equal(poor.dispatch({type:'choose',id:'lift'}),false);assert.equal(poor.save(),raw);if(!fromReply)choose(poor,'q135','listen');choose(poor,'q135','answer');assert.equal(poor.state.quests.q135.outcome,'stop');
  const old=q135Engine({legacy});if(fromReply)choose(old,'q135','listen');choose(old,'q135','lift');const g=new GameEngine(data);g.load(old.save());g.random=()=>.999999;assert.equal(g.state.inventory.rope,0);assert.equal(g.state.stories.q135.values.dollAt,'entry');
  assert.ok(g.dispatch({type:'choose',id:'continue'}));drain(g);assert.equal(g.state.stories.q135.values.dollAt,'party');assert.equal(g.state.stories.q135.values.aneAt,'transit');assert.ok(g.dispatch({type:'retreat'}));go(g,{kind:'town',location:'pilgrim_board'});assert.equal(g.dispatch({type:'story.resume',quest:'q135'}),false);checkpoint(g);
  go(g,data.quests.q135.story.worldPlaces.shore);drain(g);choose(g,'q135','workshop');choose(g,'q135','finish');assert.equal(g.state.inventory.rope,0);assert.equal(g.state.stories.q135.values.dollAt,'workshop');
 }
});

test('q135 all six physical journeys survive detours and resumption with no early handover',()=>{
 const seen=new Set();for(const route of q135Routes){const g=q135Engine();for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.journey){const action=g.state.journey.action,a=data.quests.q135.story.actions[action];if(!seen.has(action)){seen.add(action);const raw=g.save(),expected=structuredClone(g.state.stories.q135.values),resumed=new GameEngine(data);resumed.load(raw);resumed.random=()=>.999999;if(resumed.state.mode==='dungeon')assert.ok(resumed.dispatch({type:'retreat'}));go(resumed,{kind:'town',location:'pilgrim_board'});assert.equal(resumed.dispatch({type:'story.resume',quest:'q135'}),false);assert.deepEqual(resumed.state.stories.q135.values,expected);checkpoint(resumed);go(resumed,data.quests.q135.story.worldPlaces[a.journey.to]);drain(resumed);checkpoint(resumed);}go(g,data.quests.q135.story.worldPlaces[a.journey.to]);drain(g);}}}assert.equal(seen.size,6);
});

test('q135 routes accepted before relocation retain all save phases and direct endings',()=>{
 for(const stage of ['available','accepted','dungeon','text','choice','battle','completed']){const old=q135AcceptedEngine({accepted:stage!=='available',entered:!['available','accepted'].includes(stage),started:['text','choice','completed'].includes(stage)});if(['choice','completed'].includes(stage))drain(old);if(stage==='battle')old.startBattle(old.map().encounter,{win:[],escape:[],lose:[]});if(stage==='completed')for(const id of q135AcceptedRoutes[0].path)q135AcceptedChoose(old,id);
  const raw=old.save(),expected=JSON.parse(raw),g=new GameEngine(data);assert.deepEqual(validateSave(expected,acceptedQ135Data),[]);g.load(raw);if(stage!=='available')(expected.state.flags.legacyStoryRoutes??={}).q135=true;assert.deepEqual(JSON.parse(g.save()),expected);assert.equal(g.state.stories.q135,undefined);checkpoint(g);
  if(stage==='available'){assert.ok(g.accept('q135'));go(g,data.quests.q135.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q135'}));drain(g);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q135Cast('entry'));}
 }
 for(const route of q135AcceptedRoutes){const old=q135AcceptedEngine();drain(old);const g=new GameEngine(data);g.load(old.save());const gold=g.state.gold;for(const id of route.path){q135AcceptedChoose(g,id);checkpoint(g);assert.equal(g.state.stories.q135,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}assert.equal(g.state.quests.q135.outcome,route.outcome);assert.equal(g.state.inventory.rope,route.outcome==='lift'?0:1);assert.equal(g.state.gold-gold,93);}
});

test('q135 invalid holders and mixed route flags reject saves atomically',()=>{
 for(const legacy of [false,true]){const valid=q135Engine({legacy}),g=q135Engine(),before=g.save();for(const mutate of [s=>s.stories.q135.values.dollAt='nowhere',s=>delete s.stories.q135.values.aneAt,s=>s.stories.q135.values.extra=true,s=>s.stories.q135.events.push('unwritten'),s=>(s.flags.legacyStoryRoutes??={}).q135=true]){const raw=JSON.parse(valid.save());mutate(raw.state);assert.throws(()=>g.load(JSON.stringify(raw)));assert.equal(g.save(),before);}}
});

test('q135 completed physical save stays intact alongside a q134 revision migration',()=>{
 const oldData={...previousQ135Data,quests:{...previousQ135Data.quests,q134:previousQ134},scripts:{...previousQ135Data.scripts,...previousQ134.scripts}},old=new GameEngine(oldData);old.load(q135Engine({legacy:true}).save());old.random=()=>.999999;for(const id of q135Routes[1].path)choose(old,'q135',id);start(old,'q134');choose(old,'q134','rule');const raw=old.save(),expected=JSON.parse(raw);expected.state.stories.q134.revision=2;expected.state.stories.q134.values.custodianAt='keeper';const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);assert.equal(g.state.stories.q135.values.dollAt,'workshop');
});

for(const layout of ['classic','scene'])test(layout+': q135 displays the present person and item without adding portraits to old accepted routes',async()=>{
 const dom=installDOM();let view;try{for(const f of (await fixtures()).fixtures){const g=new GameEngine(data);g.load(f.save);view=replaceView(view,layout,dom.root,intent=>g.dispatch(intent),{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));assert.equal(dom.root.querySelectorAll('[data-character]').length,f.cast.length);for(const id of f.cast){const element=dom.root.querySelector(`[data-character="${id}"]`);assert.ok(element.textContent.includes(data.characters[id].name));assert.equal(element.querySelector('img').src,data.assets.images['npc_'+id]);}}}finally{view?.destroy();dom.restore();}
});
