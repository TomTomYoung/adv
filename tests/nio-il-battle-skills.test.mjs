import test from 'node:test';
import assert from 'node:assert/strict';
import {data, drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {xpThreshold} from '../src/core/progression.js';
import {applySkill, battleSkillPlan} from '../src/core/battle.js';
import {grantsFor} from '../src/core/jobs.js';
import {applyStatus} from '../src/core/status-effects.js';
import {abilityCategory} from '../src/core/ability-category.js';

function atLevel(g,id,level) {
  return g.award(0,xpThreshold(data,level-1)-g.state.actors[id].xp,[id]);
}
function setup(mode,id,roster=['kagaribi_oil_beetle','kagaribi_oil_beetle','kagaribi_oil_beetle','kagaribi_oil_beetle']) {
  const encounter={id:'skill_trial',text:'技能試験',enemies:roster,escape:true};
  const g=new GameEngine({...data,encounters:{...data.encounters,skill_trial:encounter}},97);
  drain(g);
  atLevel(g,id,6);
  g.startBattle('skill_trial',{}, {battleMode:mode,manualTurns:true,enemyScale:4});
  const b=g.state.battle;
  b.preemptive=null;
  b.turnQueue=['actor:'+id,...b.enemies.map(e=>'enemy:'+e.instance)];
  b.turnIndex=0;
  if(mode==='grid') {
    b.grid.positions['actor:'+id]={x:2,y:3};
    const occupant=Object.entries(b.grid.positions).find(([key,pos])=>key!=='actor:'+id && key.startsWith('actor:') && pos.x===2 && pos.y===3);
    if(occupant)b.grid.positions[occupant[0]]={x:0,y:5};
    b.grid.positions['enemy:enemy_0']={x:2,y:2};
  }
  return g;
}
const cast=(g,skill,target)=>assert.ok(g.dispatch({type:'battle',action:'skill',skill,target}),g.state.notice);

test('ニオ・イルの習得通知、探索の奇襲、転職後と別隊員の習得条件',()=>{
  const g=new GameEngine(data,11); drain(g);
  assert.ok(!g.skills('nio').includes('trip'));
  assert.ok(atLevel(g,'nio',3).at(-1).skills.includes('trip'));
  assert.ok(atLevel(g,'nio',4).at(-1).skills.includes('ambush'));
  assert.ok(grantsFor(data,g.state,'nio').some(r=>r.skill==='ambush'&&r.api==='party.ambush'&&r.level===4));
  assert.ok(atLevel(g,'nio',5).at(-1).skills.includes('aegis_field'));
  assert.ok(atLevel(g,'nio',6).at(-1).skills.includes('white_fang'));
  assert.equal(g.skills('nio').filter(s=>s==='trip').length,1);
  assert.ok(atLevel(g,'il',6).at(-1).skills.includes('twin_thunder'));
  assert.equal(abilityCategory('twin_thunder'),'magic');
  g.load(g.save());
  assert.ok(g.dispatch({type:'job.change',actor:'nio',job:'mage'}));
  assert.ok(g.skills('nio').includes('white_fang'));
  assert.ok(grantsFor(data,g.state,'nio').some(r=>r.skill==='ambush'&&r.api==='party.ambush'));
  assert.ok(!g.skills('nio').includes('twin_thunder'));
  assert.ok(g.dispatch({type:'job.change',actor:'ada',job:'scout'}));
  assert.equal(grantsFor(data,g.state,'ada').find(r=>r.skill==='trip').level,5);
});
for (const mode of ['classic','grid','frontline']) {
  test(mode+' イージスは対象ごとに命中した飛び道具だけを追加効果ごと一度防ぐ',()=>{
    const g=setup(mode,'nio'),s=g.state,b=s.battle,nio=s.actors.nio,other=s.actors.ada,enemy=b.enemies[0],mp=nio.mp;
    cast(g,'aegis_field');
    assert.equal(nio.mp,mp-data.skills.aegis_field.mp);
    assert.ok(s.members.every(id=>s.actors[id].statuses.includes('aegis_ward')));
    const hit=id=>applySkill(g,enemy,nio,data.skills[id],id,true,null,false);
    assert.ok(hit('attack')>0);assert.ok(hit('lightning')>0);
    assert.ok(nio.statuses.includes('aegis_ward'));
    const hp=nio.hp;
    assert.equal(hit('mark'),0);assert.equal(nio.hp,hp);
    assert.ok(!b.buffs.some(v=>v.target==='actor:nio' && v.id==='mark'));
    assert.ok(!nio.statuses.includes('aegis_ward') && other.statuses.includes('aegis_ward'));
    assert.ok(hit('mark')>0);
    const shot=(weapon)=>{s.actors.il.equipment.weapon=weapon;return applySkill(g,s.actors.il,other,data.skills.attack,'attack',false,null,false);};
    assert.ok(shot('sword')>0);
    assert.equal(shot('bow'),0);
  });
  test(mode+' ホワイトファングは同じ相手に2回、MPと行動消費は1回',()=>{
    const g=setup(mode,'nio'),s=g.state,b=s.battle,nio=s.actors.nio,mp=nio.mp;
    const before=b.enemies.map(e=>e.hp);
    cast(g,'white_fang',b.enemies[0].instance);
    assert.equal(nio.mp,mp-data.skills.white_fang.mp);
    assert.ok(b.enemies[0].hp<before[0]);
    assert.deepEqual(b.enemies.slice(1).map(e=>e.hp),before.slice(1));
    assert.equal(b.log.filter(v=>v.includes('のホワイトファング。')).length,2);
    assert.equal(g.feedback.events.filter(e=>e.action?.includes('ホワイトファング')&&e.phase==='impact').length,2);
  });
  test(mode+' 双雷は実行時に重複なしで抽選し、1体なら一発だけ',()=>{
    for(const count of [1,4]){
      const g=setup(mode,'il',Array(count).fill('kagaribi_soot_rat')),b=g.state.battle,hp=b.enemies.map(e=>e.hp);
      g.random=()=>{throw Error('対象のプレビューで乱数を使いました');};
      assert.ok(battleSkillPlan(g,'il','twin_thunder').ok);
      g.random=()=>0.999;
      cast(g,'twin_thunder');
      const damaged=b.enemies.flatMap((e,i)=>e.hp<hp[i]?[i]:[]);
      assert.equal(damaged.length,Math.min(2,count));
      if(count>2)assert.ok(damaged.some(i=>i>=2));
      assert.equal(b.log.filter(v=>v.includes('の双雷。')).length,Math.min(2,count));
    }
  });
  test(mode+' 油状態の火術は命中・空振りを問わず攻撃後に一度だけ自分に引火する',()=>{
    for(const missed of [false,true]){
      const g=setup(mode,'il',Array(3).fill('kagaribi_soot_rat')),s=g.state,b=s.battle,a=s.actors.il;
      applyStatus(g.data,s,a,'oiled'); if(missed)applyStatus(g.data,s,a,'blindness');
      g.random=()=>missed?0.99:0;
      const hp=a.hp,foe=b.enemies[0],before=foe.hp;
      cast(g,'fire',foe.instance);
      assert.equal(foe.hp===before,missed);
      assert.equal(a.hp,hp);
      assert.ok(a.statuses.includes('ablaze')&&!a.statuses.includes('oiled'));
      const log=b.log.filter(v=>v.includes('灯火の術')||v.includes('油に引火'));
      assert.match(log.at(-1),/イルの油に引火/);
      assert.equal(log.filter(v=>v.includes('油に引火')).length,1);
    }
  });
}

for (const mode of ['classic','grid','frontline']) {
  test(mode+' 火つけ小僧の火遊びも、油を浴びていれば実行後に自身に引火する',()=>{
    const g=setup(mode,'nio',['kagaribi_torch_prankster','kagaribi_oil_beetle']);
    const s=g.state,b=s.battle,imp=b.enemies[0];
    b.preemptive=null;b.turnQueue=['enemy:'+imp.instance,'actor:nio'];b.turnIndex=0;
    applyStatus(g.data,s,imp,'oiled');
    g.random=()=>0;
    assert.ok(g.dispatch({type:'battle.step'}));
    assert.ok(imp.statuses.includes('ablaze') && !imp.statuses.includes('oiled'));
    const log=b.log.join('\n');
    assert.match(log,/火遊び[\s\S]*火つけ小僧の油に引火/);
  });
}
