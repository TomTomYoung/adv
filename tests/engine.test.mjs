import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,fight,walk,exploreSpot} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {validateContent} from '../src/core/validation.js';
import {validateSave} from '../src/core/save.js';
import {evaluate,setPath} from '../src/core/expression.js';
import {projectGame} from '../src/application/projection.js';

test('200 unique authored quests with distinct endings, 20 connected maps and complete references',()=>{
  assert.deepEqual(validateContent(data),[]);assert.equal(Object.keys(data.quests).length,200);assert.equal(new Set(Object.values(data.quests).map(q=>q.title)).size,200);assert.equal(new Set(Object.values(data.quests).flatMap(q=>Object.values(q.outcomes).map(o=>o.text))).size,Object.values(data.quests).reduce((n,q)=>n+Object.keys(q.outcomes).length,0));assert.equal(Object.keys(data.maps).length,20);
});
test('safe expression trees reject code and prototype paths',()=>{
  assert.equal(evaluate({op:'add',args:[{ref:'gold'},3]},{gold:2}),5);
  assert.throws(()=>evaluate({op:'javascript',code:'process.exit()'},{}));assert.throws(()=>evaluate({ref:'constructor.prototype'},{}));assert.throws(()=>setPath({},'flags.__proto__.x',true));assert.equal({}.x,undefined);
});
test('broken script references and unknown opcodes fail validation',()=>{
  const bad=structuredClone(data);bad.scripts.prologue.commands.push({op:'call',script:'missing'});bad.quests.q001.scripts['q001.clue_a'].commands.push({op:'eval'});bad.scripts['q001.clue_a'].commands.push({op:'eval'});const errors=validateContent(bad);assert.ok(errors.some(e=>e.includes('missing')));assert.ok(errors.some(e=>e.includes('eval')));
});
test('wall collision does not spend steps or light, doors/cache persist without duplicate reward',()=>{
  const g=newGame();g.dispatch({type:'travel',region:1});g.dispatch({type:'move',direction:'left'});const before=structuredClone(g.state);assert.equal(g.dispatch({type:'move',direction:'forward'}),false);assert.deepEqual(g.state.location,before.location);assert.equal(g.state.steps,before.steps);assert.equal(g.state.light,before.light);
  const box=g.map().objects.find(o=>o.id==='cache');walk(g,box.x,box.y,{heal:true});g.dispatch({type:'interact'});drain(g);const potions=g.state.inventory.potion;g.dispatch({type:'interact'});drain(g);assert.equal(g.state.inventory.potion,potions);
  const door=g.map().objects.find(o=>o.id==='door');assert.equal(g.walkable(g.map(),door.x,door.y),false);const [dx,dy]=[[1,0],[-1,0],[0,1],[0,-1]].find(([dx,dy])=>g.walkable(g.map(),door.x+dx,door.y+dy));walk(g,door.x+dx,door.y+dy,{heal:true});const face=dx===1?'west':dx===-1?'east':dy===1?'north':'south';while(g.state.location.facing!==face)g.dispatch({type:'move',direction:'right'});g.dispatch({type:'interact'});drain(g);const gold=g.state.gold;assert.equal(g.state.objects['region_1_f1/door'],'open');assert.equal(g.walkable(g.map(),door.x,door.y),true);const saved=g.save();g.load(saved);g.dispatch({type:'interact'});drain(g);assert.equal(g.state.gold,gold);
});
test('information stays hidden until observed, choosing disabled options has no effect',()=>{
  const g=newGame();g.dispatch({type:'accept',id:'q001'});assert.equal(JSON.stringify(projectGame(g)).includes(data.quests.q001.model.world.truth),false);exploreSpot(g,data.quests.q001.locations[2],{heal:true});const before=g.save();assert.equal(g.dispatch({type:'choose',id:'informed'}),false);assert.equal(g.save(),before);g.dispatch({type:'choose',id:'pause'});drain(g);
});
test('save/restore during text, choice and battle preserves the continuation and PRNG',()=>{
  const g=new GameEngine(data,8);const copy=new GameEngine(data,99);copy.load(g.save());assert.equal(copy.save(),g.save());drain(g);g.dispatch({type:'accept',id:'q001'});exploreSpot(g,data.quests.q001.locations[2],{heal:true});copy.load(g.save());assert.equal(copy.save(),g.save());g.dispatch({type:'choose',id:'clear'});assert.ok(g.state.battle);copy.load(g.save());fight(g);fight(copy);assert.equal(copy.save(),g.save());g.dispatch({type:'choose',id:'report'});drain(g);assert.equal(g.state.quests.q001.stage,'completed');const reward=g.state.gold;g.dispatch({type:'interact'});drain(g);assert.equal(g.state.gold,reward);
});
test('escape does not complete the quest; defeat rescues the party and leaves a retry',()=>{
  const g=newGame(1);g.dispatch({type:'accept',id:'q001'});exploreSpot(g,data.quests.q001.locations[2],{heal:true});g.dispatch({type:'choose',id:'clear'});const gold=g.state.gold;let tries=0;while(g.state.battle&&tries++<10){g.healAll();g.dispatch({type:'battle',action:'escape'});}drain(g);assert.equal(g.state.quests.q001.stage,'active');assert.equal(g.state.gold,gold);assert.equal(g.state.vm.length,0);
  g.dispatch({type:'interact'});drain(g);g.dispatch({type:'choose',id:'clear'});for(const id of g.state.members)g.state.actors[id].hp=1;let turns=0;while(g.state.battle&&turns++<10)g.dispatch({type:'battle',action:'skill',skill:'guard'});drain(g);assert.equal(g.state.mode,'town');assert.equal(g.state.quests.q001.stage,'active');assert.ok(g.state.members.every(id=>g.state.actors[id].hp>0));assert.equal(g.state.vm.length,0);
});
test('corrupt and foreign saves fail atomically',()=>{
  const g=newGame(),before=g.save();for(const mutate of [s=>s.saveVersion=9,s=>s.gameId='other',s=>s.state.actors.ada.hp=999999,s=>s.state.inventory.potion=-2,s=>s.state.quests.q001.stage='invented',s=>s.state.vm=[{script:'missing',path:[],index:0,local:{}}],s=>s.state.rng=0]){const save=JSON.parse(before);mutate(save);assert.throws(()=>g.load(JSON.stringify(save)));assert.equal(g.save(),before);}
  assert.throws(()=>g.load('{broken'));assert.equal(g.save(),before);assert.deepEqual(validateSave(JSON.parse(before),data),[]);
});
test('free clinic prevents economic dead ends; torch does not cure poison; equipment costs inventory',()=>{
  const g=newGame();g.state.gold=0;for(const id of g.state.members){g.state.actors[id].hp=1;g.state.actors[id].mp=0;g.state.actors[id].statuses=['poison'];}g.dispatch({type:'service',id:'clinic'});drain(g);assert.ok(g.state.actors.ada.hp>1);assert.deepEqual(g.state.actors.ada.statuses,[]);g.state.actors.nio.statuses=['poison'];g.dispatch({type:'item',item:'torch',actor:'nio'});drain(g);assert.deepEqual(g.state.actors.nio.statuses,['poison']);g.state.gold=200;assert.ok(g.dispatch({type:'buy',item:'iron_sword'}));const str=g.stats('ada').str;assert.ok(g.dispatch({type:'equip',actor:'ada',item:'iron_sword'}));assert.equal(g.stats('ada').str,str+5);assert.equal(g.state.inventory.iron_sword,0);assert.equal(g.dispatch({type:'equip',actor:'ada',item:'iron_sword'}),false);
});
test('branch-local mutations and return survive save/reload without escaping call scope',()=>{
  const d=structuredClone(data);d.scripts.test={commands:[{op:'set',target:'local.n',value:1},{op:'if',condition:true,then:[{op:'add',target:'local.n',value:2},{op:'say',text:'pause'}],else:[]},{op:'set',target:'vars.result',value:{ref:'local.n'}},{op:'if',condition:true,then:[{op:'return'}],else:[]},{op:'set',target:'vars.unreachable',value:true}]};const g=new GameEngine(d);drain(g);g.run('test');g.load(g.save());drain(g);assert.equal(g.state.vars.result,3);assert.equal(g.state.vars.unreachable,undefined);
});
test('enemy self healing targets itself, exhausted MP falls back to attack, and defeat epilogues run',()=>{
  const d=structuredClone(data);d.scripts.loss_test={commands:[{op:'battle.start',encounter:'boss_2',on_win:[],on_escape:[],on_lose:[{op:'flag.set',key:'rescued_epilogue',value:true}]}]};
  const g=new GameEngine(d);drain(g);g.run('loss_test');const boss=g.state.battle.enemies[0];boss.hp=1;const before=g.state.actors.ada.hp;
  for(let n=0;n<4;n++)g.dispatch({type:'battle',action:'skill',skill:'guard'});
  assert.ok(boss.hp>1);assert.ok(g.state.actors.ada.hp<=before);
  for(const e of g.state.battle.enemies){e.mp=0;e.hp=Math.floor(e.stats.hp*.8);}for(const id of g.state.members)g.state.actors[id].hp=1;
  for(let n=0;n<12&&g.state.battle;n++)g.dispatch({type:'battle',action:'skill',skill:'guard'});
  assert.equal(g.state.mode,'town');assert.equal(g.state.flags.rescued_epilogue,true);assert.equal(g.state.vm.length,0);
});
