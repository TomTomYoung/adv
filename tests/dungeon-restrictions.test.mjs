import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain} from './helpers.mjs';
import {prepareQuest,finishJourney} from './structure-routes.mjs';
import {GameEngine} from '../src/core/engine.js';
import {setDungeonRestriction,clearDungeonRestriction,dungeonRestrictionReason} from '../src/core/dungeon-restrictions.js';
import {commandTargets} from '../src/core/player-commands.js';
import {projectGame} from '../src/application/projection.js';
import {validateContent} from '../src/core/validation.js';
import {validateSave} from '../src/core/save.js';
import {GameView} from '../src/view/view.js';
import {SceneView} from '../src/view/scene-view.js';
import {installDOM} from './view-dom.mjs';

const seal={dungeon:'kagaribi',action:'return',source:'test.trap',reason:'罠により帰還が封印されている。'};
const start=()=>{const g=newGame();assert.ok(g.dispatch({type:'travel',dungeon:'kagaribi'}));return g;};
const checkpoint=g=>{const save=g.save();assert.deepEqual(validateSave(JSON.parse(save),g.data),[]);g.load(save);assert.equal(g.save(),save);};
const resources=g=>structuredClone({location:g.state.location,mode:g.state.mode,gold:g.state.gold,steps:g.state.steps,light:g.state.light,rng:g.state.rng,dungeons:g.state.dungeons,events:g.state.events,inventory:g.state.inventory,actors:g.state.actors});
function elder(){
 const g=prepareQuest('q001');assert.equal(dungeonRestrictionReason(g.state,'return_mark'),'');
 for(const id of ['talk','inspect','follow']){assert.ok(g.dispatch({type:'choose',id}));drain(g);finishJourney(g);}
 assert.equal(g.state.stories.q001.scene,'old');assert.equal(g.state.dungeonRestrictions.length,1);return g;
}
function outage(){const g=elder();assert.ok(g.dispatch({type:'choose',id:'support'}));drain(g);finishJourney(g);assert.equal(g.state.battle.encounter,'kuragari_hunt');return g;}

test('q001 seals on meeting the elder, survives pause/reload and the walk home, then clears at event battle end',()=>{
 const g=elder();checkpoint(g);assert.ok(g.dispatch({type:'choose',id:'pause'}));
 assert.match(dungeonRestrictionReason(g.state,'return'),/封印/);
 const before=resources(g);
 for(const intent of [{type:'retreat'},{type:'player.command',id:'retreat'}])assert.equal(g.dispatch(intent),false);
 assert.equal(g.returnTown(),false);assert.equal(g.returnTown(true),false);assert.deepEqual(resources(g),before);
 checkpoint(g);assert.ok(g.dispatch({type:'story.resume',quest:'q001'}));drain(g);assert.equal(g.state.dungeonRestrictions.length,1);
 assert.ok(g.dispatch({type:'choose',id:'support'}));assert.ok(g.state.journey);checkpoint(g);
 assert.match(dungeonRestrictionReason(g.state,'return_mark'),/封印/);finishJourney(g);
 assert.ok(g.state.battle);checkpoint(g);
 for(let i=0;i<10&&!g.state.battle.event;i++)assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard'}));
 assert.equal(g.state.waiting.speaker,'新人灯番');assert.match(dungeonRestrictionReason(g.state,'return_mark'),/封印/);checkpoint(g);
 assert.ok(g.dispatch({type:'advance'}));assert.equal(g.state.battle,null);assert.equal(g.state.stories.q001.scene,'rescue');
 assert.equal(dungeonRestrictionReason(g.state,'return_mark'),'');assert.equal(g.state.waiting.type,'text');checkpoint(g);
 drain(g);assert.ok(g.dispatch({type:'choose',id:'home'}));
 assert.ok(projectGame(g).commands.actions.find(c=>c.id==='retreat').enabled);
 const gold=g.state.gold,cost=Math.ceil(gold*data.system.retreatGoldRate*g.partyEffect('retreatCost'));
 assert.ok(g.dispatch({type:'player.command',id:'retreat'}));assert.ok(g.dispatch({type:'choose',id:'confirm'}));assert.equal(g.state.mode,'town');assert.equal(g.state.gold,gold-cost);
});

for(const result of ['win','escape','repel'])test(`q001 ${result} keeps the seal through rookie speech, clears only its own source after interruption`,()=>{
 const g=outage();setDungeonRestriction(g,seal);g.finishBattle(result);
 assert.equal(g.state.battle.pendingResult,result);assert.equal(g.state.dungeonRestrictions.length,2);checkpoint(g);
 drain(g);assert.equal(g.state.battle,null);assert.deepEqual(g.state.dungeonRestrictions,[seal]);assert.equal(g.returnTown(true),false);
});

test('ordinary battles preserve q001 seals but defeat rolls the event back to the elder',()=>{
 const g=elder();g.dispatch({type:'choose',id:'pause'});
 g.startBattle('wild_pair_1',{win:[],escape:[],lose:[]});g.finishBattle('win');assert.equal(g.state.dungeonRestrictions.length,1);
 g.defeat();assert.equal(g.state.mode,'town');assert.equal(g.state.dungeonRestrictions.length,0);checkpoint(g);
 assert.equal(g.state.stories.q001.scene,'old');assert.equal(g.state.journey,null);
 assert.equal(g.state.stories.q001.values.elderAt,'branch');
 g.teleport('kagaribi_f1',13,3);g.run('q001.v11.old');drain(g);assert.match(dungeonRestrictionReason(g.state,'return_mark'),/封印/);checkpoint(g);
 assert.ok(g.dispatch({type:'choose',id:'support'}));finishJourney(g);g.finishBattle('win');drain(g);assert.equal(g.state.dungeonRestrictions.length,0);
});

test('an entered trap uses the shared DSL; return-mark-only seals allow the normal exit and persist across visits',()=>{
 const d=structuredClone(data),effect={...seal,action:'return_mark'};
 d.scripts.seal_trap={commands:[{op:'dungeon.restriction.set',...effect}]};
 d.scripts.release_trap={commands:[{op:'dungeon.restriction.clear',dungeon:effect.dungeon,action:effect.action,source:effect.source}]};
 d.maps.kagaribi_f1.objects.push({id:'seal_trap',name:'帰還印封印の罠',kind:'trap',trigger:'enter',x:1,y:2,script:'seal_trap'});
 const g=new GameEngine(d);drain(g);g.dispatch({type:'travel',dungeon:'kagaribi'});
 g.state.location.facing='south';assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.deepEqual(g.state.dungeonRestrictions,[effect]);checkpoint(g);
 assert.equal(g.dispatch({type:'retreat'}),false);assert.ok(g.returnTown());
 g.dispatch({type:'travel',dungeon:'kagaribi'});assert.equal(g.dispatch({type:'retreat'}),false);
 g.run('seal_trap');assert.equal(g.state.dungeonRestrictions.length,1);g.run('release_trap');assert.ok(g.dispatch({type:'retreat'}));
});

test('full return prohibition blocks exit objects, town.return and stale confirmation without spending resources',()=>{
 const g=start();assert.ok(g.dispatch({type:'player.command',id:'retreat'}));setDungeonRestriction(g,seal);checkpoint(g);
 const before=resources(g);assert.equal(projectGame(g).dialog.options.find(o=>o.id==='confirm').enabled,false);
 assert.equal(g.dispatch({type:'choose',id:'confirm'}),false);assert.deepEqual(resources(g),before);
 g.dispatch({type:'choose',id:'cancel'});
 const exit=g.map().objects.find(o=>o.kind==='exit');g.teleport('kagaribi_f1',exit.x,exit.y);
 const atExit=resources(g),target=commandTargets(g,'inspect').find(t=>t.id===`object:${exit.id}`);
 assert.equal(target.actions[0].enabled,false);assert.equal(target.actions[0].reason,seal.reason);
 assert.equal(g.trigger('interact',exit.id),false);assert.deepEqual(resources(g),atExit);
 g.run(exit.script);assert.deepEqual(resources(g),atExit);assert.equal(g.state.notice,seal.reason);
 clearDungeonRestriction(g,{...seal,source:'another'});assert.equal(g.returnTown(),false);
 clearDungeonRestriction(g,seal);assert.ok(g.trigger('interact',exit.id));assert.equal(g.state.mode,'town');assert.equal(g.state.gold,atExit.gold);
});

test('malformed saved seals and invalid authored commands fail validation before replacing state',()=>{
 const g=start();setDungeonRestriction(g,seal);const save=g.save();
 for(const value of [null,{},[null],[{...seal,dungeon:'missing'}],[{...seal,action:'typo'}],[{...seal,source:''}],[{...seal,reason:''}],[{...seal,extra:true}],[seal,seal]]){
  const bad=JSON.parse(save);bad.state.dungeonRestrictions=value;assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),save);
 }
 for(const patch of [{dungeon:'missing'},{action:'typo'},{source:''},{reason:' '}]){
  const d=structuredClone(data);d.scripts.bad_restriction={commands:[{op:'dungeon.restriction.set',...seal,...patch}]};
  assert.ok(validateContent(d).some(e=>e.includes('封印・禁止')));
 }
});

test('both views show the disabled seal button and reason, and restore the command on release',()=>{
 const dom=installDOM();try{
  const g=start();setDungeonRestriction(g,seal);
  for(const View of [GameView,SceneView]){
   const parent=dom.document.createElement('div'),view=Object.assign(Object.create(View.prototype),{act:()=>{}});
   const before=g.save(),model=projectGame(g);view.commandWindow(parent,model.commands);assert.equal(g.save(),before);
   const button=[...parent.querySelectorAll('button')].find(b=>b.textContent==='帰還印封印中');assert.ok(button.disabled);assert.equal(button.title,seal.reason);
   assert.equal(parent.querySelector('.dungeon-restriction').textContent,seal.reason);
  }
  clearDungeonRestriction(g,seal);assert.equal(projectGame(g).commands.actions.find(c=>c.id==='retreat').enabled,true);
 }finally{dom.restore();}
});
