import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame} from './helpers.mjs';
import {xpThreshold} from '../src/core/progression.js';
import {applySkill,battleSkillPlan} from '../src/core/battle.js';
import {projectGame} from '../src/application/projection.js';
import {feigning} from '../src/core/feigned-death.js';
import {createSkeletonTrial} from '../src/application/battle-tester-model.js';

function encounter(mode,ids=['skeleton_5_blades','skeleton_5_ribbow','kagaribi_soot_rat']){
  const g=newGame();
  g.data={...g.data,encounters:{...g.data.encounters,bone_test:{id:'bone_test',enemies:ids,escape:true,text:'仮死試験'}}};
  g.award(0,xpThreshold(data,7),['sera']);
  g.startBattle('bone_test',{}, {battleMode:mode,manualTurns:true});
  g.random=()=>0.5;
  return g;
}
function knockOut(g,u){
  applySkill(g,g.state.actors.sera,u,{name:'試験打撃',effects:[{type:'damage',amount:99999,element:'light'}]},null,false,null,false);
}
function action(g,id,skill,enemy){
  const b=g.state.battle;delete b.preemptive;b.acted=[];
  b.turnQueue=['actor:'+id,...b.enemies.map(e=>'enemy:'+e.instance)];b.turnIndex=0;
  if(b.grid&&skill==='fire'){
    const key='actor:'+id,old=b.grid.positions[key],dest={x:b.grid.positions['enemy:'+enemy.instance].x,y:3};
    const occupant=Object.entries(b.grid.positions).find(([k,p])=>k!==key&&p.x===dest.x&&p.y===dest.y);
    if(occupant)b.grid.positions[occupant[0]]=old;
    b.grid.positions[key]=dest;
  }
  const plan=battleSkillPlan(g,id,skill,enemy.instance);
  assert.ok(plan.ok,plan.reason);
  return g.dispatch({type:'battle',action:'skill',skill,target:enemy.instance});
}
function tick(g){
  const b=g.state.battle,n=b.round;
  for(let i=0;i<40&&b===g.state.battle&&b.round===n;i++)assert.ok(g.dispatch({type:'battle.step'}));
  assert.ok(g.state.battle!==b||b.round===n+1);
}
function restore(g){
  const saved=g.save();g.load(saved);
  assert.equal(g.save(),saved);
}
test('セラはLv8で習得し、転職後も使え、ほかの祈祷師にもLv8で解禁',()=>{
  const g=newGame();
  g.award(0,xpThreshold(data,6),['sera']);assert.ok(!g.skills('sera').includes('lay_to_rest'));
  assert.ok(g.award(0,xpThreshold(data,7)-g.state.actors.sera.xp,['sera']).at(-1).skills.includes('lay_to_rest'));
  assert.ok(g.dispatch({type:'job.change',actor:'sera',job:'mage'}));assert.ok(g.skills('sera').includes('lay_to_rest'));
  g.award(0,xpThreshold(data,7),['ada']);assert.ok(!g.skills('ada').includes('lay_to_rest'));
  assert.ok(g.dispatch({type:'job.change',actor:'ada',job:'priest'}));assert.ok(g.skills('ada').includes('lay_to_rest'));
});
for(const mode of ['classic','grid','frontline']){
  test(mode+' 仮死を選択でき、保存再開後も第3巡の境で半分のHPで復活する',()=>{
    const g=encounter(mode),b=g.state.battle,u=b.enemies[0];
    knockOut(g,u);assert.ok(feigning(u));assert.equal(u.reviveRound,b.round+3);
    assert.equal(g.state.records.kills[u.id],undefined);
    const model=projectGame(g).battle.enemies[0];assert.equal(model.feign,'仮死・復活まで3ターン');
    assert.ok(battleSkillPlan(g,'sera','lay_to_rest',u.instance).ok);
    const ordinary={...data.skills.attack,targeting:data.skills.lay_to_rest.targeting,frontlineTargeting:data.skills.lay_to_rest.frontlineTargeting};
    applySkill(g,g.state.actors.sera,u,ordinary,'attack');assert.equal(u.reviveRound,b.round+3);
    tick(g);tick(g);assert.ok(feigning(u));restore(g);tick(g);
    const healed=g.state.battle.enemies[0];assert.equal(healed.hp,Math.ceil(healed.stats.hp/2));assert.equal(healed.reviveRound,undefined);
    assert.equal(projectGame(g).battle.enemies[0].feign,undefined);
    assert.ok(!battleSkillPlan(g,'sera','lay_to_rest',healed.instance).ok);
    knockOut(g,healed);assert.ok(feigning(healed));restore(g);
  });
  test(mode+' 鎮魂後は復活せず、残敵が全員死亡・仮死の瞬間に勝利する',()=>{
    const g=encounter(mode),b=g.state.battle,[first,second,last]=b.enemies;
    knockOut(g,first);const mp=g.state.actors.sera.mp;
    assert.ok(action(g,'sera','lay_to_rest',first));assert.equal(g.state.actors.sera.mp,mp-3);
    assert.ok(first.sealed);assert.ok(!feigning(first));assert.equal(g.state.records.kills[first.id],1);
    restore(g);for(let i=0;i<3;i++)tick(g);
    const units=g.state.battle.enemies;assert.equal(units[0].hp,0);assert.ok(!battleSkillPlan(g,'sera','lay_to_rest',units[0].instance).ok);
    knockOut(g,units[2]);assert.equal(feigning(units[2]),false);
    units[1].hp=1;
    assert.ok(action(g,'il','fire',units[1]));assert.equal(g.state.battle,null);assert.ok(g.state.battleResult);
    for(const e of [first,second,last])assert.equal(g.state.records.kills[e.id],1);
  });
  test(mode+' 全員仮死でも即勝利し、復活待ちや鎮魂を要求しない',()=>{
    const g=encounter(mode,['skeleton_5_blades','skeleton_5_ribbow']),[a,b]=g.state.battle.enemies;
    knockOut(g,a);b.hp=1;assert.ok(action(g,'il','fire',b));
    assert.equal(g.state.battle,null);assert.equal(g.state.battleResult.phase,'result');
  });
  test(mode+' 試遊は本編のスケルトンとLv8セラで開始',()=>{
    const g=createSkeletonTrial(data,mode);assert.equal(g.state.actors.sera.level,8);
    assert.ok(g.skills('sera').includes('lay_to_rest'));assert.equal(g.state.battle.enemies.length,3);
    assert.ok(g.state.battle.enemies.every(u=>u.family==='skeleton'));
  });
}
test('王冠の継承は仲間がまだ戦えるときだけ発動する',()=>{
  for(const supporter of [false,true]){
    const ids=['skeleton_5_blades','skeleton_25_crowned'];
    if(supporter)ids.push('skeleton_5_collector');
    const g=encounter('classic',ids),[heir,king]=g.state.battle.enemies;
    knockOut(g,heir);king.hp=1;
    assert.ok(action(g,'il','fire',king));
    if(supporter){
      assert.equal(heir.hp,Math.ceil(heir.stats.hp/2));
      assert.ok(heir.tactics.wearsCrown);assert.ok(feigning(king));restore(g);
    }else assert.equal(g.state.battleResult?.phase,'result');
  }
});
