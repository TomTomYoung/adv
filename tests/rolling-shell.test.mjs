import test from 'node:test';
import assert from 'node:assert/strict';
import {data, newGame} from './helpers.mjs';
import {applySkill,battleSkillPlan} from '../src/core/battle.js';
import {applyGuard} from '../src/core/battle-turns.js';
import {applyStatus} from '../src/core/status-effects.js';
import {xpThreshold} from '../src/core/progression.js';

function garden(mode){
  const game=newGame();
  game.award(0,xpThreshold(data,2),['sera']);
  game.startBattle('garden_root_guardian',{}, {battleMode:mode,manualTurns:true});
  if(mode==='frontline'){
    const positions=game.state.battle.frontline.positions;
    positions['enemy:enemy_0']={depth:0,lane:2};
    positions['actor:sera']={depth:0,lane:4};
  }
  game.random=()=>0.5;
  return game;
}
// Put the requested unit at the next slot; subsequent slots use the normal scheduler.
function next(game,key){
  const b=game.state.battle;
  delete b.preemptive;
  b.acted=[];
  b.turnQueue=[key,...['enemy:enemy_0','enemy:enemy_1','actor:sera','actor:il'].filter(k=>k!==key)];
  b.turnIndex=0;
}
function shellAct(game){
  next(game,'enemy:enemy_1');
  assert.ok(game.dispatch({type:'battle.step'}));
}
function cast(game,actor,skill,target){
  next(game,'actor:'+actor);
  if(game.state.battle.grid){
    const positions=game.state.battle.grid.positions;
    const pos=positions['enemy:'+target.instance], key='actor:'+actor;
    const dest={x:pos.x,y:3};
    const occupant=Object.keys(positions).find(k=>k!==key&&positions[k].x===dest.x&&positions[k].y===dest.y);
    if(occupant)positions[occupant]=positions[key];
    positions[key]=dest;
  }
  const plan=battleSkillPlan(game,actor,skill,target.instance);
  assert.ok(plan.ok,plan.reason);
  assert.ok(game.dispatch({type:'battle',action:'skill',skill,target:target.instance}));
}
test('セラだけがLv3で習得し、旧セーブのアルマジロにも習性が働く',()=>{
  const g=newGame();
  g.award(0,xpThreshold(data,1),['sera']);
  assert.ok(!g.skills('sera').includes('stun_break'));
  const levels=g.award(0,xpThreshold(data,2)-g.state.actors.sera.xp,['sera']);
  assert.ok(levels.at(-1).skills.includes('stun_break'));
  assert.ok(!g.skills('ada').includes('stun_break'));
  assert.ok(g.dispatch({type:'job.change',actor:'sera',job:'mage'}));
  assert.ok(g.skills('sera').includes('stun_break'));
  g.startBattle('garden_root_guardian',{}, {manualTurns:true});
  const old=JSON.parse(g.save()),unit=old.state.battle.enemies[1];
  unit.name='根殻甲';delete unit.habits;
  g.load(JSON.stringify(old));
  assert.equal(g.state.battle.enemies[1].name,'殻甲アルマジロ');
  shellAct(g);
  assert.equal(g.state.battle.enemies[1].guardTurns,1);
});
for(const mode of ['classic','grid','frontline']){
  test(mode+' 割り込みは各巡1回。魔法は素通りし、2手番の防御後は甲羅を開く',()=>{
    const g=garden(mode),b=g.state.battle,[boss,shell]=b.enemies;
    shellAct(g);assert.ok(shell.guard);assert.equal(shell.guardTurns,1);
    cast(g,'il','fire',boss);
    assert.ok(boss.hp<boss.stats.hp);assert.equal(shell.hp,shell.stats.hp);
    assert.equal(shell.rollingShellRound,undefined);
    const hp=boss.hp;
    cast(g,'sera','stun_break',boss);
    assert.equal(boss.hp,hp);assert.ok(shell.hp<shell.stats.hp);
    assert.equal(shell.rollingShellRound,b.round);
    const h=garden(mode),b2=h.state.battle,[victim,armor]=b2.enemies;
    shellAct(h);
    cast(h,'sera','attack',victim);
    assert.ok(armor.guard);assert.ok(armor.hp<armor.stats.hp);assert.equal(victim.hp,victim.stats.hp);
    const armoredHP=armor.hp;
    const saved=h.save();h.load(saved);
    const [loadedBoss,loadedShell]=h.state.battle.enemies;
    cast(h,'sera','attack',loadedBoss);
    assert.equal(loadedShell.hp,armoredHP);assert.ok(loadedBoss.hp<loadedBoss.stats.hp);
    h.state.battle.round++;
    shellAct(h);assert.ok(loadedShell.guard);assert.equal(loadedShell.guardTurns,2);
    const bossHP=loadedBoss.hp;
    cast(h,'sera','attack',loadedBoss);assert.equal(loadedBoss.hp,bossHP);assert.ok(loadedShell.hp<armoredHP);
    shellAct(h);assert.equal(loadedShell.guard,false);assert.equal(loadedShell.guardTurns,undefined);
    shellAct(h);assert.ok(loadedShell.guard);assert.equal(loadedShell.guardTurns,1);
  });
  test(mode+' 単体連撃は一度の割り込みで全段を引き受け、範囲攻撃には割り込まない',()=>{
    const g=garden(mode),b=g.state.battle,[boss,shell]=b.enemies;
    g.award(0,xpThreshold(data,5),['nio']);
    shellAct(g);
    const original=g.data.skills.stun_break;
    const area={...original,effects:[{type:'damage',element:'physical',amount:20}],
      targeting:{...original.targeting,area:{shape:'column'}},
      frontlineTargeting:{...original.frontlineTargeting,area:{shape:'column'}}};
    g.data={...g.data,skills:{...g.data.skills,stun_break:area}};
    cast(g,'sera','stun_break',boss);
    assert.ok(boss.hp<boss.stats.hp);assert.equal(shell.hp,shell.stats.hp);
    assert.equal(shell.rollingShellRound,undefined);
    const bossHP=boss.hp;
    cast(g,'nio','white_fang',boss);
    assert.equal(boss.hp,bossHP);assert.ok(shell.hp<shell.stats.hp);assert.ok(shell.guard);
    assert.equal(b.log.filter(line=>line.includes('転がり甲羅で')).length,1);
    assert.equal(b.log.filter(line=>line.includes('ホワイトファング。')&&line.includes('殻甲アルマジロに')).length,2);
  });
  test(mode+' 割り込んだ実対象の防御をダメージ前に解除し、続く行動を2回消費する',()=>{
    const g=garden(mode),b=g.state.battle,[boss,shell]=b.enemies,mp=g.state.actors.sera.mp;
    shellAct(g);
    const control=garden(mode),unarmored=control.state.battle.enemies[1];
    cast(control,'sera','stun_break',unarmored);
    assert.equal(control.state.battle.stuns?.['enemy:enemy_1'],undefined);
    cast(g,'sera','stun_break',boss);
    assert.equal(shell.hp,unarmored.hp);assert.ok(shell.hp<shell.stats.hp);
    assert.equal(boss.hp,boss.stats.hp);assert.equal(shell.guard,false);
    assert.equal(b.stuns['enemy:enemy_1'],2);assert.equal(g.state.actors.sera.mp,mp-3);
    const saved=g.save();g.load(saved);
    const [victim,armor]=g.state.battle.enemies;
    cast(g,'sera','attack',victim);assert.ok(victim.hp<victim.stats.hp);
    for(const remaining of [1,0]){
      shellAct(g);assert.equal(g.state.battle.stuns['enemy:enemy_1']??0,remaining);
      assert.equal(armor.guard,false);
    }
    shellAct(g);assert.equal(armor.guard,false);
    shellAct(g);assert.equal(armor.guard,true);
  });
  test(mode+' 通常の防御にも有効。外れた打撃は防御を崩さない',()=>{
    const g=garden(mode),b=g.state.battle,boss=b.enemies[0];
    applyGuard(b,boss,3);
    applyStatus(g.data,g.state,g.state.actors.sera,'blindness');g.random=()=>0.999;
    cast(g,'sera','stun_break',boss);
    assert.ok(boss.guard);assert.equal(boss.hp,boss.stats.hp);assert.equal(b.stuns,undefined);
    g.random=()=>0;
    cast(g,'sera','stun_break',boss);
    assert.equal(boss.guard,false);assert.ok(boss.hp<boss.stats.hp);assert.equal(b.stuns['enemy:enemy_0'],2);
  });
}
for(const mode of ['classic','grid','frontline']){
  test(mode+' 習性を付け替えても両者の手番の行動は変わらず、防御中の個体だけが割り込む',()=>{
    const g=garden(mode),[boss,shell]=g.state.battle.enemies;
    const enemyDefs={...g.data.enemies,
      [shell.id]:{...g.data.enemies[shell.id],habits:[]},
      [boss.id]:{...g.data.enemies[boss.id],habits:['rolling_shell']}};
    g.data={...g.data,enemies:enemyDefs};
    shellAct(g);
    assert.ok(shell.guard);assert.equal(shell.guardTurns,1);
    cast(g,'sera','attack',boss);
    assert.ok(boss.hp<boss.stats.hp);assert.equal(shell.hp,shell.stats.hp);
    shellAct(g);assert.equal(shell.guardTurns,2);
    shellAct(g);assert.equal(shell.guard,false);
    assert.equal(boss.guardTurns,undefined);
    applyGuard(g.state.battle,boss);
    const hp=boss.hp;
    cast(g,'sera','attack',shell);
    assert.equal(shell.hp,shell.stats.hp);assert.ok(boss.hp<hp);
    assert.equal(boss.rollingShellRound,g.state.battle.round);
  });
}

test('旧版の戦闘セーブから防御2手目を再開し、次の手番で通常攻撃に移る',()=>{
  const g=garden('classic');
  shellAct(g);shellAct(g);
  const old=JSON.parse(g.save()),u=old.state.battle.enemies[1];
  u.rollingShellTurns=u.guardTurns;delete u.guardTurns;
  u.ai[0].condition={op:'eq',left:{op:'mod',args:[{ref:'self.round'},2]},right:1};
  g.load(JSON.stringify(old));
  const shell=g.state.battle.enemies[1];
  assert.equal(shell.guardTurns,2);
  shellAct(g);assert.equal(shell.guard,false);
  u.ai[0].condition.right=0;
  assert.throws(()=>g.load(JSON.stringify(old)),/敵状態不正/);
});
