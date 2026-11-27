import assert from 'node:assert/strict';
import test from 'node:test';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {applySkill,battleSkillPlan} from '../src/core/battle.js';
import {applyStatus} from '../src/core/status-effects.js';
import {applyGuard} from '../src/core/battle-turns.js';
import {unitKey} from '../src/core/buffs.js';
import {xpThreshold} from '../src/core/progression.js';
import {validateSave} from '../src/core/save.js';
import {recordDefeated} from '../src/core/records.js';
import {reviveBones} from '../src/core/feigned-death.js';
import {shiftingDungeonData} from '../src/core/shifting-dungeon.js';
import {trapSkillChoices} from '../src/core/trap-skills.js';

const beetle='stone_beetle',slinger='goblin_5_slinger',trapper='goblin_5_trapper',dummy='kagaribi_soot_rat';
const follow={win:[],lose:[],escape:[]};
function trial(mode,roster,skill='attack') {
  const d={...data,enemies:{...data.enemies},encounters:{...data.encounters,trial:{id:'trial',text:'罠の試験',enemies:roster,escape:true}}};
  d.enemies[dummy]={...d.enemies[dummy],stats:{hp:500,mp:50,str:28,vit:5,int:20,agi:4},ai:[{priority:0,skill,target:'random'}]};
  const g=new GameEngine(d,71);drain(g);
  g.award(0,xpThreshold(data,24-1),['nio']);
  for(const id of g.state.members)if(id!=='nio')g.state.actors[id].hp=0;
  g.startBattle('trial',follow,{battleMode:mode,manualTurns:true});
  g.random=()=>.75;return g;
}
// Keep the ordinary skill/AI entry points and target validation; select the next diagnostic turn.
function next(g,unit) {
  const s=g.state,b=s.battle;
  delete b.preemptive;b.acted=[];
  const keys=[...s.members.map(id=>s.actors[id]),...b.enemies].filter(u=>u.hp>0).map(unitKey);
  b.turnQueue=[unitKey(unit),...keys.filter(k=>k!==unitKey(unit))];b.turnIndex=0;
}
function nioCast(g,skill,target) {
  next(g,g.state.actors.nio);
  const id=target?(g.state.battle.mode==='classic'||!g.state.battle.mode?target.instance??target.id:unitKey(target)):undefined;
  assert.ok(g.dispatch({type:'battle',action:'skill',skill,target:id}),g.state.notice);
}
function enemyTurn(g,u) {next(g,u);assert.ok(g.dispatch({type:'battle.step'}));}
function reload(g) {
  const save=g.save();assert.deepEqual(validateSave(JSON.parse(save),g.data),[]);
  g.load(save);g.random=()=>.75;
}

test('ニオ自身とゴブリン罠師の習得段階が一致し、高位罠は低Lvで選べない',()=>{
  const g=new GameEngine(data,7);
  for(const level of [1,2,4,5,7,9,12,15,18,21,24]){
    g.award(0,xpThreshold(data,level-1)-g.state.actors.nio.xp,['nio']);
    const skills=trapSkillChoices(data,level);
    assert.deepEqual(new Set(g.skills('nio').filter(id=>id.startsWith('trap_'))),new Set(skills));
    assert.ok(!g.skills('ada').some(id=>id.startsWith('trap_')));
    assert.equal(skills.includes('trap_coffin'),level>=24);
    assert.equal(skills.includes('trap_ceiling'),level>=15);
  }
});

for(const mode of ['classic','grid','frontline']){
  test(mode+' 石虫投げは1匹を消費して2倍の威力。結界で止めても石虫は復帰しない',()=>{
    function incoming(roster,ward=false){
      const g=trial(mode,roster),b=g.state.battle,nio=g.state.actors.nio;
      if(ward)applyStatus(g.data,g.state,nio,'aegis_ward');
      const before=nio.hp;enemyTurn(g,b.enemies[0]);
      return {g,b,nio,damage:before-nio.hp};
    }
    const normal=incoming([slinger,dummy]);
    const strong=incoming([slinger,beetle,beetle]);
    assert.ok(normal.damage>0);assert.equal(strong.damage,2*normal.damage);
    assert.equal(strong.b.enemies[1].hp,0);assert.ok(strong.b.enemies[2].hp>0);
    assert.equal(strong.g.state.records.kills[beetle],1);
    const blocked=incoming([slinger,beetle],true);
    assert.equal(blocked.damage,0);assert.ok(!blocked.nio.statuses.includes('aegis_ward'));
    reload(blocked.g);
    enemyTurn(blocked.g,blocked.g.state.battle.enemies[0]);
    assert.equal(blocked.g.state.records.kills[beetle],1);
    assert.match(blocked.g.state.battle.log.at(-1),/飛礫/);
  });
  test(mode+' ニオの設置は1手で1基。罠師も設置し、次は足くくりを使う',()=>{
    const g=trial(mode,[trapper,dummy]),s=g.state;
    nioCast(g,'trap_barb');assert.deepEqual(s.battle.traps[0],{owner:'actor:nio',target:'actor:nio',skill:'trap_barb'});
    nioCast(g,'trap_soot',s.actors.nio);assert.equal(s.battle.traps.length,1);assert.equal(s.battle.traps[0].skill,'trap_soot');
    const gob=s.battle.enemies[0];enemyTurn(g,gob);
    const theirs=s.battle.traps.find(t=>t.owner===unitKey(gob));assert.ok(trapSkillChoices(data,5).includes(theirs.skill));
    reload(g);enemyTurn(g,g.state.battle.enemies[0]);
    assert.ok(g.state.battle.buffs.some(e=>e.id==='exp_rooted'&&e.target==='actor:nio'));
  });
}

test('軽い罠は初回だけ発動し、反撃・投射軽減・有料魔法後のMPを処理する',()=>{
  const g=trial('classic',[dummy]),s=g.state,nio=s.actors.nio,foe=s.battle.enemies[0];
  nioCast(g,'trap_barb');let before=foe.hp;enemyTurn(g,foe);
  assert.ok(foe.hp<before);assert.ok(!s.battle.traps);
  before=foe.hp;enemyTurn(g,foe);assert.equal(foe.hp,before);
  const arrows=trial('classic',[slinger]),a=arrows.state;
  let hp=a.actors.nio.hp;enemyTurn(arrows,a.battle.enemies[0]);const full=hp-a.actors.nio.hp;
  nioCast(arrows,'trap_net');hp=a.actors.nio.hp;enemyTurn(arrows,a.battle.enemies[0]);
  assert.equal(hp-a.actors.nio.hp,Math.floor(full*.75));assert.ok(!a.battle.traps);
  const caster=trial('classic',[dummy],'heal'),mage=caster.state.battle.enemies[0];
  mage.hp--;nioCast(caster,'trap_siphon');const mp=mage.mp;enemyTurn(caster,mage);
  assert.equal(mage.mp,mp-data.skills.heal.mp-2);assert.ok(!caster.state.battle.traps);
});

test('煤袋は防御中、追い足縄は同じ相手の2行動目、吊り天井は同巡の異なる2体で発動',()=>{
  const g=trial('classic',[dummy,dummy]),s=g.state,nio=s.actors.nio;
  let [a,b]=s.battle.enemies;
  nioCast(g,'trap_soot',nio);enemyTurn(g,a);assert.ok(s.battle.traps);
  applyGuard(s.battle,nio);enemyTurn(g,a);assert.ok(a.statuses.includes('blindness'));a.statuses=[];
  nioCast(g,'trap_snare',nio);enemyTurn(g,a);reload(g);
  [a,b]=g.state.battle.enemies;const target=g.state.actors.nio,hp=target.hp;
  enemyTurn(g,a);assert.equal(target.hp,hp);assert.ok(!g.state.battle.traps);
  nioCast(g,'trap_ceiling',target);const initial=[a.hp,b.hp];enemyTurn(g,a);enemyTurn(g,a);
  assert.deepEqual([a.hp,b.hp],initial);enemyTurn(g,b);
  assert.ok(a.hp<initial[0]&&b.hp<initial[1]);assert.ok(!g.state.battle.traps);
});

test('逆巻き鈴は指定属性だけを防ぎ、火走り溝は油のある相手にだけ引火させる',()=>{
  const g=trial('classic',[dummy,dummy,dummy],'fire'),s=g.state,nio=s.actors.nio,[a,b,c]=s.battle.enemies;
  nioCast(g,'trap_bell_ice');let hp=nio.hp;enemyTurn(g,a);const full=hp-nio.hp;
  assert.ok(full>0&&s.battle.traps);nioCast(g,'trap_bell_fire');hp=nio.hp;enemyTurn(g,a);
  assert.equal(hp-nio.hp,Math.floor(full*.5));
  nioCast(g,'trap_fireline');applyStatus(g.data,s,a,'oiled');applyStatus(g.data,s,b,'oiled');
  applySkill(g,nio,a,{name:'点火',effects:[{type:'damage',element:'fire',amount:1}]},'fire',false,null,false);
  assert.ok(a.statuses.includes('ablaze')&&b.statuses.includes('ablaze'));
  assert.ok(!b.statuses.includes('oiled')&&!c.statuses.includes('ablaze')&&!s.battle.traps);
});

test('甲割り万力は2度目のかばいを解除して本来の標的に命中させる',()=>{
  const g=trial('classic',['garden_root_shell',dummy]),s=g.state,[shell,target]=s.battle.enemies;
  nioCast(g,'trap_vise');applyGuard(s.battle,shell);const before=target.hp;
  nioCast(g,'attack',target);assert.equal(target.hp,before);
  s.battle.round++;nioCast(g,'attack',target);assert.ok(target.hp<before);
  assert.ok(!shell.guard&&!s.battle.traps);assert.equal(s.battle.stuns[unitKey(shell)],2);
});

test('骨封じ棺は仮死の敵だけを選べて、他の敵の撃破で封印、先に復活した時は消える',()=>{
  for(const revive of [true,false]){
    const g=trial('classic',['guard_2',dummy,dummy]),s=g.state,[bones,other]=s.battle.enemies;
    assert.ok(!battleSkillPlan(g,'nio','trap_coffin',bones.instance).ok);
    bones.hp=0;recordDefeated(g);assert.ok(bones.reviveRound);
    nioCast(g,'trap_coffin',bones);reload(g);
    const [restored,victim]=g.state.battle.enemies;
    if(revive){assert.ok(reviveBones(g,restored));assert.ok(!restored.sealed);}
    else{victim.hp=0;recordDefeated(g,false,g.state.actors.nio);assert.ok(restored.sealed);assert.equal(g.state.records.kills.guard_2,1);}
    assert.ok(!g.state.battle.traps);
  }
});

test('千変地下6階の通常遭遇と高層の罠師が実戦の個体Lvを持つ',()=>{
  const d=shiftingDungeonData(data);
  const pair=d.maps.shifting_labyrinth_f6.encounterPool.find(e=>e.encounter.endsWith('_stone_sling'));
  assert.ok(pair.weight>0);assert.deepEqual(d.encounters[pair.encounter].enemies.map(id=>d.enemies[id].species),[slinger,beetle]);
  const high=d.maps.shifting_labyrinth_f24.encounterPool.find(e=>e.encounter.endsWith('_trapper_patrol'));
  assert.ok(high.weight>0);assert.equal(d.enemies[d.encounters[high.encounter].enemies[0]].level,24);
});

test('逆巻き鈴で範囲魔法の全対象を守り、次の魔法には効果が残らない',()=>{
  const g=trial('classic',[dummy],'firestorm'),s=g.state,caster=s.battle.enemies[0],ids=['nio','ada'];
  g.award(0,xpThreshold(data,23),['ada']);
  const fire=()=>{for(const id of ids)s.actors[id].hp=g.stats(id).hp;const before=ids.map(id=>s.actors[id].hp);enemyTurn(g,caster);return ids.map((id,i)=>before[i]-s.actors[id].hp);};
  const full=fire();assert.ok(full.every(d=>d>0));
  nioCast(g,'trap_bell_fire');assert.deepEqual(fire(),full.map(d=>Math.floor(d*.5)));assert.deepEqual(fire(),full);
});

test('追い足縄は二連撃を1行動と数え、保存後の次の二連撃を丸ごと止める',()=>{
  const g=trial('classic',[dummy],'white_fang'),s=g.state;
  nioCast(g,'trap_snare',s.actors.nio);
  enemyTurn(g,s.battle.enemies[0]);assert.equal(s.battle.traps[0].followers.length,1);
  assert.equal(s.battle.log.filter(line=>line.includes('ホワイトファング。')).length,2);
  reload(g);const hp=g.state.actors.nio.hp;enemyTurn(g,g.state.battle.enemies[0]);
  assert.equal(g.state.actors.nio.hp,hp);assert.ok(!g.state.battle.traps);
});

test('罠のない旧戦闘を読み込めて、設置者の重複・別陣営への設置・実在しない追跡先は拒否する',()=>{
  const g=trial('classic',[dummy]);reload(g);
  nioCast(g,'trap_snare',g.state.actors.nio);
  const good=g.save();for(const spoil of [
    ts=>ts.push({...ts[0]}),ts=>{ts[0].target='enemy:enemy_0';},ts=>{ts[0].followers=['enemy:enemy_42'];},
    ts=>{ts[0].skill='attack';}
  ]){
    const bad=JSON.parse(good);spoil(bad.state.battle.traps);assert.ok(validateSave(bad,g.data).length);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),good);
  }
});
