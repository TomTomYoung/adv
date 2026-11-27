import assert from 'node:assert/strict';
import test from 'node:test';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {applySkill,endBattle} from '../src/core/battle.js';
import {applyStun} from '../src/core/battle-turns.js';
import {applyStatus,removeStatus} from '../src/core/status-effects.js';
import {depth,moveTo} from '../src/core/monster-family-field.js';
import {slimeSprite} from '../src/core/slime-actions.js';
import {reinforcementRoster} from '../src/core/battle-reinforcements.js';
import {validateSave} from '../src/core/save.js';
import {shiftingDungeonData,SHIFTING_DUNGEON} from '../src/core/shifting-dungeon.js';

const catalog=shiftingDungeonData(data);
function start(mode,level=9,group='oil_globe_firebrand',legacy=false){
  const g=new GameEngine(catalog,91);drain(g);
  g.award(0,1000000,g.state.members);
  for(const id of g.state.members)g.state.actors[id].hp=g.stats(id).hp;
  g.dispatch({type:'travel',dungeon:SHIFTING_DUNGEON});
  const map=g.data.maps[g.data.dungeons[SHIFTING_DUNGEON].maps[level-1]];
  g.teleport(map.id,map.entrance.x,map.entrance.y,map.entrance.facing);
  const encounter=legacy ? map.id+'_lv'+level+'_'+group : map.encounterPool.find(row=>row.encounter.endsWith('_'+group)).encounter;
  g.startBattle(encounter,{win:[],escape:[],lose:[]},{battleMode:mode,manualTurns:true});
  g.random=()=>.49;return g;
}
const unit=(g,key)=>g.state.battle.enemies.find(u=>u.classSkill?.endsWith('_'+key));
function hit(g,target,element='physical',amount=1,id='attack',extra={}){
  return applySkill(g,g.state.actors.ada,target,{name:'試験',target:'enemy',effects:[{type:'damage',element,amount}],...extra},id,false,null,false);
}
function turn(g,u){
  const b=g.state.battle,key='enemy:'+u.instance;
  for(let i=0;b.turnQueue[b.turnIndex]!==key;i++){
    assert.ok(i<45,'enemy reaches its turn');assert.ok(g.dispatch({type:'battle.step'}));
  }
  assert.ok(g.dispatch({type:'battle.step'}));
}
for(const mode of ['classic','grid','frontline']){
  test(mode+' 命のしずくは他の生きた魔物のうち最も弱った1体を中回復し、自身の撃破を1回記録する',()=>{
    const g=start(mode,5,'slime_squad_1',true), b=g.state.battle, [slime,first,second]=b.enemies;
    while(b.turnQueue[b.turnIndex]!=='enemy:'+slime.instance) assert.ok(g.dispatch({type:'battle.step'}));
    slime.hp=1;
    first.hp=Math.floor(first.stats.hp/2);
    second.hp=Math.floor(second.stats.hp/4);
    const hp=b.enemies.map(e=>e.hp), party=g.state.members.map(id=>g.state.actors[id].hp);
    turn(g,slime);
    assert.deepEqual(b.enemies.map(e=>e.hp),[0,hp[1],hp[2]+Math.ceil(second.stats.hp*.4)]);
    assert.deepEqual(g.state.members.map(id=>g.state.actors[id].hp),party);
    assert.equal(g.state.records.kills[slime.id],1);
    g.load(g.save());
    assert.equal(g.state.records.kills[slime.id],1);
    assert.equal(g.state.battle.enemies.length,3);
  });

  test(mode+' Lv7では分裂せず、Lv8の分裂は同レベルの独立した全快個体を1体増やす',()=>{
    const young=start(mode,7,'slime_squad_4',true), low=unit(young,'drop'), lowBattle=young.state.battle;
    young.random=()=>0;
    turn(young,low);
    assert.equal(lowBattle.enemies.length,2);
    assert.equal(low.tactics.phase,'stretch');
    const row={kind:'division',caller:low.instance,round:1};
    assert.equal(reinforcementRoster(young.data.encounters[lowBattle.encounter],[row],1,young.data.enemies),null);

    const g=start(mode,8,'drop_stone_escort'), b=g.state.battle, parent=unit(g,'drop');
    parent.hp-=7;parent.mp=0;
    const hp=parent.hp,round=b.round;
    g.random=()=>0;
    turn(g,parent);
    assert.equal(b.enemies.length,3);
    const child=b.enemies.at(-1);
    assert.deepEqual([parent.hp,parent.mp],[hp,0]);
    assert.equal(child.id,parent.id);
    assert.equal(child.level,8);
    assert.notEqual(child.instance,parent.instance);
    assert.deepEqual([child.hp,child.mp,child.statuses],[child.stats.hp,child.stats.mp,[]]);
    assert.ok(!parent.tactics.half&&!child.tactics.half);
    if(b.round===round) assert.ok(!b.turnQueue.includes('enemy:'+child.instance));
    assert.deepEqual(validateSave(JSON.parse(g.save()),g.data),[]);
    g.load(g.save());
    const resumed=g.state.battle, copy=resumed.enemies.at(-1);
    assert.equal(copy.instance,child.instance);
    turn(g,copy);
    assert.ok(resumed.round>round);
    assert.equal(resumed.reinforcements.at(-1).caller,copy.instance);
    assert.equal(resumed.enemies.at(-1).id,parent.id);
    for(let i=0;resumed.enemies.length<5;i++){assert.ok(i<3);turn(g,resumed.enemies[0]);}
    const full=5;
    turn(g,copy);
    assert.equal(resumed.enemies.length,full);
    assert.deepEqual(validateSave(JSON.parse(g.save()),g.data),[]);
    for(const e of resumed.enemies)hit(g,e,'light',2*e.stats.hp,'fire');
    endBattle(g,'win');
    assert.deepEqual(validateSave(JSON.parse(g.save()),g.data),[]);
    g.load(g.save());drain(g);
    assert.equal(g.state.records.kills[parent.id],full-1);
  });

  test(mode+' 油玉の体当たり・直接接触・遠隔・炎弱点・消火を区別する',()=>{
    const g=start(mode),u=unit(g,'oil'),a=g.state.actors.ada;
    hit(g,u,'physical',1,'volley',{projectile:true});
    assert.ok(!a.statuses.includes('oiled'));
    const bow=g.data.items.bow;const previous=a.equipment.weapon;a.equipment.weapon=bow.id;
    hit(g,u);assert.ok(!a.statuses.includes('oiled'));a.equipment.weapon=previous;
    applyStatus(g.data,g.state,a,'water_ward');hit(g,u);
    assert.ok(!a.statuses.includes('oiled')&&!a.statuses.includes('water_ward'));
    hit(g,u);assert.ok(a.statuses.includes('oiled'));
    removeStatus(a,'oiled');turn(g,u);
    assert.ok(g.state.members.some(id=>g.state.actors[id].statuses.includes('oiled')));
    assert.equal(hit(g,u,'fire',2,'fire'),4);assert.ok(u.statuses.includes('ablaze'));
    assert.match(slimeSprite(g.data,u),/oil_lit/);
    applyStatus(g.data,g.state,u,'water_ward');assert.ok(!u.statuses.includes('ablaze'));
    assert.match(slimeSprite(g.data,u),/5_oil/);
  });
  test(mode+' 着火後の手番なら一度だけ全体自爆、スタンなら巡末に燃え尽きる',()=>{
    for(const explode of [true,false]){
      const g=start(mode),u=unit(g,'oil'),b=g.state.battle;
      while(b.turnQueue[b.turnIndex]!=='enemy:'+u.instance)assert.ok(g.dispatch({type:'battle.step'}));
      hit(g,u,'fire',1,'fire');
      if(!explode)applyStun(g,u,{count:1});
      const before=g.state.members.map(id=>g.state.actors[id].hp);
      g.load(g.save());
      assert.ok(g.dispatch({type:'battle.step'}));
      const resumed=unit(g,'oil');
      if(explode){
        assert.equal(resumed.hp,0);
        assert.ok(g.state.members.every((id,i)=>g.state.actors[id].hp<before[i]));
        assert.equal(g.state.battle.log.filter(x=>x.includes('自爆して燃え尽きた')).length,1);
      }else{
        for(let i=0;resumed.hp>0;i++){assert.ok(i<20);assert.ok(g.dispatch({type:'battle.step'}));}
        assert.ok(g.state.battle.log.some(x=>x.includes('巡の終わりに燃え尽きた')));
        assert.ok(!g.state.battle.log.some(x=>x.includes('油玉の自爆')));
      }
      assert.equal(g.state.records.kills[resumed.id],1);
    }
  });
  test(mode+' 双子は残HPを二分し、後列の分体は再読込後も再分裂しない',()=>{
    const g=start(mode,20,'twins_escort'),u=unit(g,'twins'),b=g.state.battle;
    const n=b.enemies.length,amount=Math.ceil(u.hp/2);
    const before=u.hp;hit(g,u,'light',amount,'fire');
    assert.equal(b.enemies.length,n+1);const child=b.enemies.at(-1);
    assert.equal(u.hp+child.hp,before-amount);
    assert.equal(depth(g.state,u),0);assert.equal(depth(g.state,child),2);
    assert.deepEqual(validateSave(JSON.parse(g.save()),g.data),[]);g.load(g.save());
    const siblings=g.state.battle.enemies.filter(e=>e.tactics?.half);
    hit(g,siblings[1],'light',1,'fire');assert.equal(g.state.battle.enemies.length,n+1);
    assert.ok(siblings.every(v=>slimeSprite(g.data,v).endsWith('twin_half.webp')));
    const old=siblings[0].hp;turn(g,siblings[1]);assert.ok(siblings[0].hp>old);
  });
}

test('泡は連撃の最初の一撃だけを防ぎ、糸と粒は実際の列移動に反応する',()=>{
  const g=start('classic',8,'bubble_escort'),u=unit(g,'bubble');turn(g,u);
  const covered=g.state.battle.enemies.find(e=>e.tactics?.foam);assert.ok(covered);
  assert.equal(hit(g,covered),0);assert.ok(hit(g,covered)>0);
  const t=start('classic',17,'thread_escort'),thread=unit(t,'thread');turn(t,thread);
  const mate=t.state.battle.enemies.find(e=>e.instance===thread.tactics.link);
  moveTo(t,mate,1);moveTo(t,thread,2);
  thread.tactics.link=mate.instance;t.state.battle.familyField.beads={0:true};
  moveTo(t,mate,0);assert.equal(depth(t.state,thread),1);
  assert.equal(t.state.battle.stuns['enemy:'+mate.instance],1);
});

test('三つの戦闘方式で油玉を一撃で倒した場合は着火も自爆も発生しない',()=>{
  for(const mode of ['classic','grid','frontline']){
    const g=start(mode),u=unit(g,'oil'),b=g.state.battle;
    hit(g,u,'fire',u.hp,'fire');
    assert.equal(u.hp,0);assert.ok(!u.statuses.includes('ablaze'));
    while(b.round===1)assert.ok(g.dispatch({type:'battle.step'}));
    assert.ok(!b.log.some(line=>line.includes('自爆して燃え尽きた')));
  }
});

test('木の実は食べる前に倒した場合だけ、戦闘結果の読込後も受け取れる',()=>{
  for(const eaten of [false,true]){
    const g=start('classic',8,'berry_escort'),u=unit(g,'berry');
    const count=g.state.inventory.slime_berry??0;
    if(eaten){hit(g,u,'light',4,'fire');turn(g,u);assert.ok(u.tactics.spent);}
    for(const e of g.state.battle.enemies)hit(g,e,'light',2*e.stats.hp,'fire');
    endBattle(g,'win');
    assert.deepEqual(validateSave(JSON.parse(g.save()),g.data),[]);g.load(g.save());drain(g);
    assert.equal(g.state.inventory.slime_berry??0,count+Number(!eaten));
  }
});

test('鏡面は単体魔法を一度反射し、打撃で割れた瓶は同じ列に一度だけ飛び散る',()=>{
  const g=start('classic',18,'mirror_escort'),u=unit(g,'mirror'),a=g.state.actors.ada;
  turn(g,u);const before=a.hp,enemyHp=u.hp;
  assert.equal(hit(g,u,'light',4,'fire'),0);assert.ok(a.hp<before);assert.equal(u.hp,enemyHp);
  assert.equal(hit(g,u,'light',4,'fire'),4);
  const h=start('classic',11,'bottle_escort'),bottle=unit(h,'bottle');
  hit(h,bottle,'physical',2,'power');assert.ok(bottle.tactics.open);
  assert.match(slimeSprite(h.data,bottle),/bottle_open/);
  hit(h,bottle,'physical',2,'power');
  assert.equal(h.state.battle.log.filter(line=>line.includes('瓶が割れた')).length,1);
});

test('油膜と易燃体を外すと被弾反応だけが消え、旧戦闘の行動表を復元して火だるまなら自爆する',()=>{
  const g=start('classic'),u=unit(g,'oil'),a=g.state.actors.ada;
  g.data.enemies={...g.data.enemies,[u.id]:{...g.data.enemies[u.id],habits:[]}};
  hit(g,u);assert.ok(!a.statuses.includes('oiled'));
  hit(g,u,'fire',1,'fire');assert.ok(!u.statuses.includes('ablaze'));
  const old=JSON.parse(g.save());
  const saved=old.state.battle.enemies.find(e=>e.instance===u.instance);
  saved.ai=saved.ai.filter(r=>r.skill!=='slime_burst');
  g.load(JSON.stringify(old));
  const loaded=unit(g,'oil');
  assert.ok(loaded.ai.some(r=>r.skill==='slime_burst'));
  applyStatus(g.data,g.state,loaded,'ablaze');
  turn(g,loaded);
  assert.ok(g.state.battle.log.some(x=>x.includes('自爆して燃え尽きた')));
});

test('しずくスライム1体だけでは自滅せず、ちょうど半分の仲間の回復は分裂に優先する',()=>{
  const g=start('classic',8,'drop_stone_escort'), [slime,mate]=g.state.battle.enemies;
  g.random=()=>.24;
  while(g.state.battle.turnQueue[g.state.battle.turnIndex]!=='enemy:'+slime.instance) assert.ok(g.dispatch({type:'battle.step'}));
  mate.hp=Math.floor(mate.stats.hp/2);
  turn(g,slime);
  assert.equal(slime.hp,0);
  assert.equal(g.state.battle.enemies.length,2);

  const solo=start('classic',5,'drop_escort'), [last,other]=solo.state.battle.enemies;
  hit(solo,other,'light',other.stats.hp*2,'fire');
  last.hp=1;
  turn(solo,last);
  assert.equal(last.hp,1);
  assert.equal(last.tactics.phase,'stretch');
});
