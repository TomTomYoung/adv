import assert from 'node:assert/strict';
import test from 'node:test';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {applySkill,battleSkillPlan,endBattle} from '../src/core/battle.js';
import {applyStatus,statusLevel} from '../src/core/status-effects.js';
import {setBattleTrap} from '../src/core/battle-traps.js';
import {unitKey} from '../src/core/buffs.js';
import {xpThreshold} from '../src/core/progression.js';
import {floorEncounterGroups} from '../src/core/encounter-groups.js';
import {shiftingDungeonData} from '../src/core/shifting-dungeon.js';
import {validateSave} from '../src/core/save.js';

const playable=shiftingDungeonData(data);
function stage(floor,group,mode='classic'){
  const g=new GameEngine(playable,123);
  drain(g);
  assert.ok(g.dispatch({type:'party',action:'join',actor:'toma'}));
  g.award(0,xpThreshold(data,59),g.state.members);
  assert.ok(g.dispatch({type:'travel',dungeon:'shifting_labyrinth'}));
  const map=g.data.maps['shifting_labyrinth_f'+floor];
  g.teleport(map.id,map.entrance.x,map.entrance.y,map.entrance.facing);
  const id=map.id+'_lv'+floor+'_'+group;
  assert.ok(map.encounterPool.some(e=>e.encounter===id&&e.weight>0));
  g.startBattle(id,{win:[],lose:[],escape:[]},{battleMode:mode,manualTurns:true});
  g.random=()=>.75;
  return g;
}
function turn(g,unit,last=false){
  const s=g.state,b=s.battle;
  const others=[...s.members.map(id=>s.actors[id]),...b.enemies].filter(u=>u!==unit&&u.hp>0).map(unitKey);
  delete b.preemptive;b.acted=[];
  b.turnQueue=last?[...others,unitKey(unit)]:[unitKey(unit),...others];b.turnIndex=last?others.length:0;
}
function cast(g,actor,skill,target=actor,last=false){
  turn(g,actor,last);
  const id=g.state.battle.mode==='classic'?(target.instance??target.id):unitKey(target);
  assert.ok(g.dispatch({type:'battle',action:'skill',skill,target:id}),skill+' '+g.state.notice);
}
function reload(g){
  const bytes=g.save();assert.deepEqual(validateSave(JSON.parse(bytes),g.data),[]);
  g.load(bytes);g.random=()=>.75;
}

test('病牙の35%境界・3段階上限・4能力低下・行動不能・解除を実戦で確認',()=>{
  const g=stage(8,'plague_pack'),rat=g.state.battle.enemies[0],ada=g.state.actors.ada;
  const base=g.stats('ada'),bite=()=>applySkill(g,rat,ada,data.skills.plague_bite,'plague_bite',true);
  g.random=()=>.35;bite();assert.ok(!ada.statuses.includes('disease'));
  g.random=()=>.349;
  for(const lv of [1,2,3,3]){
    bite();assert.equal(statusLevel(ada,'disease'),lv);
    for(const key of ['str','vit','agi','int'])assert.equal(g.stats('ada')[key],Math.floor(base[key]*(1-lv/10)));
  }
  g.random=()=>.299;cast(g,ada,'guard');assert.match(g.state.battle.log.join('\n'),/病気で行動できない/);
  reload(g);const restored=g.state.actors.ada;
  assert.equal(statusLevel(restored,'disease'),3);
  applySkill(g,restored,restored,data.skills.purify,'purify');
  assert.deepEqual(g.stats('ada'),base);
});

for(const mode of ['classic','grid','frontline']){
  test(mode+' ハーメルンは同じ隊員に生存・行動可能なネズミだけが1回ずつ攻撃する',()=>{
    const g=stage(12,'piper_swarm',mode),s=g.state,[piper,...rats]=s.battle.enemies;
    assert.deepEqual(rats.map(r=>r.species),[...Array(3).fill('kagaribi_soot_rat'),...Array(3).fill('plague_rat')]);
    applyStatus(g.data,s,rats[0],'sleep');rats[5].hp=0;
    const hp=s.members.map(id=>s.actors[id].hp);
    turn(g,piper);assert.ok(g.dispatch({type:'battle.step'}));
    const lines=s.battle.log;
    assert.ok(lines.some(x=>x.includes('ハーメルン！')));
    assert.equal(lines.filter(x=>x.includes('の攻撃。')).length,2);
    assert.equal(lines.filter(x=>x.includes('の病牙。')).length,2);
    assert.equal(s.members.filter((id,i)=>s.actors[id].hp<hp[i]).length,1);
    reload(g);
  });

  test(mode+' 薬草師がLv帯の最上位を1度だけ使い、服用者に永久変化が付く',()=>{
    const g=stage(24,'herbalist_escort',mode),[herb,rat]=g.state.battle.enemies;
    rat.hp=1;turn(g,herb);assert.ok(g.dispatch({type:'battle.step'}));
    assert.equal(rat.hp,rat.stats.hp);assert.equal(rat.medicineVitLoss,1);
    reload(g);const [h,r]=g.state.battle.enemies;r.hp=1;
    turn(g,h);assert.ok(g.dispatch({type:'battle.step'}));assert.equal(r.hp,1);
  });

  test(mode+' 罠解除は敵陣を優先して1基だけ解除し、罠のない再使用は手番・MPを消費しない',()=>{
    const g=stage(12,'herbalist_escort',mode),s=g.state,nio=s.actors.nio,enemy=s.battle.enemies[0];
    setBattleTrap(g,nio,nio,'trap_barb');setBattleTrap(g,enemy,enemy,'trap_treadle');
    const mp=nio.mp;
    cast(g,nio,'battle_disarm');assert.equal(s.battle.traps.length,1);assert.equal(s.battle.traps[0].owner,'actor:nio');
    reload(g);const actor=g.state.actors.nio;cast(g,actor,'battle_disarm');
    assert.ok(!g.state.battle.traps);assert.equal(actor.mp,mp-4);
    turn(g,actor);const before=g.save();
    assert.equal(battleSkillPlan(g,'nio','battle_disarm',unitKey(actor)).ok,false);
    assert.equal(g.dispatch({type:'battle',action:'skill',skill:'battle_disarm',target:'nio'}),false);
    assert.equal(actor.mp,mp-4);assert.equal(g.state.battle.turnIndex,JSON.parse(before).state.battle.turnIndex);
    assert.equal(actor.skillProgress.trap_disarm.uses,2);
  });
}

test('踏み板罠は設置者本人が直接攻撃を当てても発動し、次の攻撃では発動しない',()=>{
  const g=stage(12,'herbalist_escort'),s=g.state,nio=s.actors.nio;
  cast(g,nio,'trap_treadle');reload(g);
  const n=g.state.actors.nio,target=g.state.battle.enemies[1],before=n.hp;
  cast(g,n,'attack',target);
  assert.ok(n.hp<before);assert.ok(!g.state.battle.traps);
  const hp=n.hp;cast(g,n,'attack',g.state.battle.enemies[0]);assert.equal(n.hp,hp);
});

test('トーマの副作用が服用者に残り、経過2巡・次の魔法・戦闘終了・永久の各時点で処理される',()=>{
  const g=stage(12,'herbalist_escort');
  const toma=()=>g.state.actors.toma,il=()=>g.state.actors.il;
  const original=g.stats('il'),round=()=>cast(g,toma(),'guard',toma(),true);
  const dose=id=>{il().hp=1;cast(g,toma(),id,il());};
  dose('medicine_leaf');assert.equal(il().hp,1+Math.ceil(original.hp*.25));assert.equal(g.stats('il').agi,Math.floor(original.agi*.85));
  round();assert.ok(il().statuses.includes('drug_drowsiness'));round();assert.equal(g.stats('il').agi,original.agi);
  dose('medicine_amber');assert.equal(g.stats('il').str,Math.floor(original.str*.85));
  const mp=il().mp;
  dose('medicine_echo');round();reload(g);assert.equal(il().mp,mp);round();assert.equal(il().mp,mp-6);
  round();assert.equal(il().mp,mp-6);
  dose('medicine_moon');reload(g);cast(g,il(),'guard');assert.equal(il().mp,mp-6);
  cast(g,il(),'fire',g.state.battle.enemies[1]);assert.equal(il().mp,mp-6-data.skills.fire.mp-8);
  assert.ok(!il().statuses.includes('drug_spell_recoil'));
  for(let i=0;i<6;i++)dose('medicine_marrow');
  assert.equal(il().hp,original.hp);assert.equal(g.stats('il').vit,original.vit-5);
  dose('medicine_echo');dose('medicine_moon');const remainingMp=il().mp;
  endBattle(g,'escape');drain(g);reload(g);
  assert.deepEqual(il().statuses,[]);assert.equal(il().mp,remainingMp);
  assert.equal(g.stats('il').str,original.str);assert.equal(g.stats('il').vit,original.vit-5);
});

test('トーマと薬草師は同じLv境界で薬を解放し、群れの自然遭遇はLv12から始まる',()=>{
  const ids=['medicine_leaf','medicine_amber','medicine_echo','medicine_moon','medicine_marrow'];
  const levels=[1,8,12,18,24];
  const g=new GameEngine(playable,91);
  for(const level of [1,7,8,11,12,17,18,23,24]){
    g.award(0,xpThreshold(data,level-1)-g.state.actors.toma.xp,['toma']);
    assert.deepEqual(g.skills('toma').filter(id=>ids.includes(id)),ids.filter((_,i)=>level>=levels[i]));
  }
  for(const [floor,group,index] of [[5,'goblin_squad_1',0],[11,'herbalist_escort',1],[12,'herbalist_escort',2],[18,'herbalist_escort',3],[24,'herbalist_escort',4]]){
    const trial=stage(floor,group),enemies=trial.state.battle.enemies,herb=enemies.find(e=>e.species==='goblin_5_herbalist');
    const patient=enemies.find(e=>e!==herb);patient.hp=1;turn(trial,herb);
    assert.ok(trial.dispatch({type:'battle.step'}));
    assert.ok(trial.state.battle.log.some(line=>line.includes(data.skills[ids[index]].name)));
  }
  const species=floor=>new Set(playable.maps['shifting_labyrinth_f'+floor].encounterPool.flatMap(p=>playable.encounters[p.encounter].enemies.map(id=>playable.enemies[id].species)));
  for(let lv=1;lv<12;lv++){
    assert.equal(species(lv).has('plague_rat'),lv>=8);
    assert.equal(species(lv).has('goblin_5_piper'),false);
  }
  assert.ok(species(12).has('goblin_5_piper'));
  const custom={...data,enemies:{...data.enemies},encounters:{},encounterGroups:structuredClone(data.encounterGroups)};
  for(const [floor,group] of [[6,'plague_pack'],[11,'piper_swarm']]){
    custom.encounterGroups.dungeons.shifting_labyrinth.floors[floor][group]=99;
    const pool=floorEncounterGroups(custom,{id:'custom',dungeon:'shifting_labyrinth',floor,recommendedLevel:floor});
    assert.ok(pool.encounterPool.every(e=>!e.encounter.endsWith('_'+group)));
  }
});

test('ハーメルンは標的が倒れた時点で攻撃を打ち切り、別の隊員に向かわない',()=>{
  const g=stage(12,'piper_swarm'),s=g.state,piper=s.battle.enemies[0];
  for(const id of s.members)s.actors[id].hp=1;
  turn(g,piper);assert.ok(g.dispatch({type:'battle.step'}));
  assert.equal(s.members.filter(id=>s.actors[id].hp===0).length,1);
  assert.equal(s.battle.log.filter(x=>x.includes('の攻撃。')||x.includes('の病牙。')).length,1);
});

test('旧Lv5の笛吹きを含む戦闘は、抽選から外れた編成のまま再開できる',()=>{
  const g=new GameEngine(playable,37);drain(g);
  const id='shifting_labyrinth_f5_lv5_goblin_squad_2';
  assert.ok(!playable.maps.shifting_labyrinth_f5.encounterPool.some(e=>e.encounter===id));
  g.startBattle(id,{win:[],lose:[],escape:[]},{manualTurns:true});
  const save=JSON.parse(g.save()),old=save.state.battle.enemies.find(e=>e.species==='goblin_5_piper');
  old.levelBand=5;
  g.load(JSON.stringify(save));
  const piper=g.state.battle.enemies.find(e=>e.instance===old.instance);
  assert.equal(piper.level,5);assert.equal(piper.levelBand,12);
  turn(g,piper);assert.ok(g.dispatch({type:'battle.step'}));
  assert.ok(g.state.battle.log.some(s=>s.includes('合図笛')));
  assert.ok(!g.state.battle.log.some(s=>s.includes('ハーメルン！')));
});
