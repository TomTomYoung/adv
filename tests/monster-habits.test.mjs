import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {activeActor,applySkill} from '../src/core/battle.js';
import {applyStatus} from '../src/core/status-effects.js';
import {applyMonsterHabits} from '../tools/build-monster-habits.mjs';
import {xpThreshold} from '../src/core/progression.js';
import {floorEncounterGroups} from '../src/core/encounter-groups.js';

const moth='kagaribi_ember_moth', soot='kagaribi_soot_moth';
const oilBeetle = 'kagaribi_oil_beetle';
const hit={type:'damage',element:'fire',amount:1};
function game(roster,mode='classic',setup=()=>{}) {
  const database={...data,enemies:structuredClone(data.enemies),encounters:{...data.encounters,habit_test:{id:'habit_test',enemies:roster,text:'灯蛾が現れた。',escape:true}}};
  const g=new GameEngine(database,75);
  drain(g);
  g.state.actors.nio.hp=0;
  setup(g);
  g.startBattle('habit_test',{win:[],lose:[],escape:[]},{battleMode:mode,preemptive:{side:'allies',actions:2}});
  g.random=()=>0;
  return g;
}
function damage(g,enemy,skill) {
  return applySkill(g,g.state.actors.il,enemy,skill,'attack');
}

for(const mode of ['classic','grid','frontline'])test(mode+' 火の魔法が灯蛾を即死させ、勝利する前にMP0の灯蛾が術者以外の生存者へ反撃する',()=>{
  const g=game([moth],mode),b=g.state.battle;
  const insect=b.enemies[0],ada=g.state.actors.ada;
  insect.mp=0;
  if(mode==='grid')b.grid.positions['actor:il']={x:2,y:3};
  assert.equal(activeActor(g),'il');
  const before=ada.hp,mp=g.state.actors.il.mp;
  assert.ok(g.dispatch({type:'battle',action:'skill',skill:'fire',target:mode==='frontline'?'enemy:enemy_0':'enemy_0'}),g.state.notice);
  assert.equal(insect.hp,0);
  assert.equal(insect.mp,0);
  assert.equal(g.state.actors.il.mp,mp-data.skills.fire.mp);
  assert.equal(before-ada.hp,Math.floor(g.value(data.formulas.fire,{source:{stats:insect.stats},target:{stats:g.stats('ada')}})));
  assert.equal(g.state.records.kills[moth],1);
  assert.equal(g.state.records.wins,1);
  assert.equal(g.feedback.events.filter(e=>e.action==='引火爆弾'&&e.targets[0]?.key==='actor:ada').length,1);
});

for (const mode of ['classic','grid','frontline']) test(mode+' 火が命中すると油虫だけが燃え尽き、隣の灯蛾と味方には波及しない', () => {
  const g = game([oilBeetle, moth], mode);
  const s = g.state, [bug, neighbor] = s.battle.enemies;
  const partyHP = () => s.members.map(id => s.actors[id].hp);
  const before = partyHP(), neighborHP = neighbor.hp;
  applyStatus(g.data,s,bug,'water_ward');
  const spark = {name:'火花', effects:[hit]};
  assert.equal(damage(g,bug,spark),0);
  assert.equal(bug.hp,bug.stats.hp);
  assert.equal(damage(g,bug,{name:'水滴',effects:[{type:'damage',element:'water',amount:1}]}),1);
  applyStatus(g.data,s,s.actors.il,'blindness');
  g.random = () => 0.99;
  assert.equal(damage(g,bug,spark),0);
  g.random = () => 0;
  if (mode === 'grid') s.battle.grid.positions['actor:il'] = {x:2,y:3};
  assert.ok(g.dispatch({type:'battle',action:'skill',skill:'fire',target:mode==='frontline'?'enemy:enemy_0':'enemy_0'}),s.notice);
  assert.equal(bug.hp,0);
  assert.equal(s.records.kills[oilBeetle],1);
  assert.equal(neighbor.hp,neighborHP);
  assert.deepEqual(partyHP(),before);
  assert.equal(s.battle.log.filter(line => line.includes('習性「燃え尽き」')).length,1);
  assert.ok(!g.feedback.events.some(e => e.action === '引火爆弾' || e.action === '燃え尽き'));
});

test('燃え尽きと引火爆弾を同じ魔物に付けても、設定順にかかわらず一度だけ反撃する', () => {
  for (const ids of [['burn_out','ignition_bomb'],['ignition_bomb','burn_out']]) {
    const g = game([oilBeetle],'classic',g => applyMonsterHabits(g.data.enemies,{[oilBeetle]:ids}));
    const bug = g.state.battle.enemies[0], hp = bug.hp;
    assert.equal(damage(g,bug,{name:'火花',effects:[hit]}),hp);
    assert.equal(g.state.records.kills[oilBeetle],1);
    assert.equal(g.feedback.events.filter(e => e.action === '引火爆弾').length,1);
  }
});

test('燃える打撃は対象ごとに抽選し、戦闘不能者を除外して同じ生存者にも再命中する',()=>{
  const g=game([moth,moth,moth]),b=g.state.battle,party=g.state.actors;
  party.ada.hp=1;
  const selfHp=party.il.hp,seraHp=party.sera.hp;
  const strike={...data.skills.flameblade,effects:[...data.skills.flameblade.effects,hit]};
  for(const enemy of b.enemies)damage(g,enemy,strike);
  assert.equal(party.ada.hp,0);
  assert.equal(party.nio.hp,0);
  assert.ok(party.sera.hp<seraHp);
  assert.equal(party.il.hp,selfHp);
  assert.equal(g.state.records.kills[moth],3);
  assert.deepEqual(g.feedback.events.filter(e=>e.action==='引火爆弾').map(e=>e.targets[0].key),['actor:ada','actor:sera','actor:sera']);
  damage(g,b.enemies[0],strike);
  assert.equal(g.feedback.events.filter(e=>e.action==='引火爆弾').length,3);
});

test('最後の1人が引火爆弾で倒れた場合は敗北する',()=>{
  const g=game([moth],'classic',g=>{for(const id of g.state.members)g.state.actors[id].hp=id==='il'?1:0;});
  assert.ok(g.dispatch({type:'battle',action:'skill',skill:'fire',target:'enemy_0'}));
  assert.equal(g.state.records.losses,1);
  assert.equal(g.state.records.wins,0);
});

test('外れ・火以外の撃破は発動せず、旧セーブの灯蛾は現在の習性で反撃する',()=>{
  const g=game([moth,moth]),s=g.state;
  applyStatus(g.data,s,s.actors.il,'blindness');
  g.random=()=>0.99;
  const [first,second]=s.battle.enemies;
  const before=first.hp;
  damage(g,first,data.skills.fire);
  assert.equal(first.hp,before);
  g.random=()=>0;
  damage(g,first,{name:'打撃',effects:[{type:'damage',amount:1000,element:'physical'}]});
  assert.equal(first.hp,0);
  assert.ok(!g.feedback.events.some(e=>e.action==='引火爆弾'));
  const save=JSON.parse(g.save());
  for(const enemy of save.state.battle.enemies)delete enemy.habits;
  g.load(JSON.stringify(save));
  damage(g,g.state.battle.enemies[1],data.skills.fire);
  assert.equal(g.state.battle.enemies[1].hp,0);
  assert.equal(g.state.battle.enemies[1].id,second.id);
  assert.equal(g.feedback.events.filter(e=>e.action==='引火爆弾').length,1);
});

test('習性を別種に移すと元の魔物は火に耐え、新しく付けた魔物だけが反撃する',()=>{
  assert.deepEqual(Object.values(data.enemies).filter(e=>e.habits?.includes('ignition_bomb')).map(e=>e.id),[moth]);
  const g=game([moth,soot],'classic',g=>applyMonsterHabits(g.data.enemies,{[soot]:['ignition_bomb']}));
  const [plain,armed]=g.state.battle.enemies;
  damage(g,plain,{name:'火花',effects:[hit]});
  assert.equal(plain.hp,plain.stats.hp-1);
  damage(g,armed,{name:'火花',effects:[hit]});
  assert.equal(armed.hp,0);
  assert.throws(()=>applyMonsterHabits(g.data.enemies,{[soot]:['unknown']}));
  assert.throws(()=>applyMonsterHabits(g.data.enemies,{[soot]:['ignition_bomb','ignition_bomb']}));
  assert.throws(()=>applyMonsterHabits(g.data.enemies,{unknown:[]}));
  applyMonsterHabits(g.data.enemies,{});
  assert.equal(g.data.enemies[soot].habits,undefined);
  const d={...data,enemies:{...data.enemies},encounters:{}};
  floorEncounterGroups(d,{dungeon:'shifting_labyrinth',id:'band1',recommendedLevel:1,floor:1});
  assert.deepEqual(d.enemies['band1_lv1_'+moth].habits,['ignition_bomb']);
});

test('範囲魔法1回で灯蛾3匹が引火し、攻撃者自身も生きていれば抽選対象になる',()=>{
  const g=game([moth,moth,moth],'classic',g=>{
    g.state.actors.il.job='pyromancer';
    g.award(0,xpThreshold(g.data,4),['il']);
    g.state.actors.il.hp=g.stats('il').hp;
  });
  const b=g.state.battle;
  g.random=()=>0.99;
  assert.ok(g.dispatch({type:'battle',action:'skill',skill:'firestorm',target:'enemy_0'}),g.state.notice);
  assert.deepEqual(b.enemies.map(e=>e.hp),[0,0,0]);
  assert.equal(g.state.records.kills[moth],3);
  assert.deepEqual(g.feedback.events.filter(e=>e.action==='引火爆弾').map(e=>e.targets[0].key),Array(3).fill('actor:il'));
});
