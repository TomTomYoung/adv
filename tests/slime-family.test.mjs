import assert from 'node:assert/strict';
import test from 'node:test';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {applySkill,endBattle} from '../src/core/battle.js';
import {applyStun} from '../src/core/battle-turns.js';
import {applyStatus,removeStatus} from '../src/core/status-effects.js';
import {depth,moveTo} from '../src/core/monster-family-field.js';
import {slimeSprite} from '../src/core/slime-actions.js';
import {validateSave} from '../src/core/save.js';
import {shiftingDungeonData,SHIFTING_DUNGEON} from '../src/core/shifting-dungeon.js';

const catalog=shiftingDungeonData(data);
function start(mode,level=5,squad=4){
  const g=new GameEngine(catalog,91);drain(g);
  g.award(0,1000000,g.state.members);
  for(const id of g.state.members)g.state.actors[id].hp=g.stats(id).hp;
  g.dispatch({type:'travel',dungeon:SHIFTING_DUNGEON});
  const map=g.data.maps[g.data.dungeons[SHIFTING_DUNGEON].maps[level-1]];
  g.teleport(map.id,map.entrance.x,map.entrance.y,map.entrance.facing);
  const enc=map.encounterPool.find(row=>row.encounter.endsWith('_slime_squad_'+squad));
  g.startBattle(enc.encounter,{win:[],escape:[],lose:[]},{battleMode:mode,manualTurns:true});
  g.random=()=>.49;return g;
}
const unit=(g,key)=>g.state.battle.enemies.find(u=>u.classSkill.endsWith('_'+key));
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
    const g=start(mode,20,1),u=unit(g,'twins'),b=g.state.battle;
    const n=b.enemies.length,amount=Math.ceil(u.hp/2);
    const before=u.hp;hit(g,u,'light',amount,'fire');
    assert.equal(b.enemies.length,n+1);const child=b.enemies.at(-1);
    assert.equal(u.hp+child.hp,before-amount);
    assert.equal(depth(g.state,u),0);assert.equal(depth(g.state,child),2);
    assert.deepEqual(validateSave(JSON.parse(g.save()),g.data),[]);g.load(g.save());
    const siblings=g.state.battle.enemies.filter(e=>e.tactics.half);
    hit(g,siblings[1],'light',1,'fire');assert.equal(g.state.battle.enemies.length,n+1);
    assert.ok(siblings.every(v=>slimeSprite(g.data,v).endsWith('twin_half.webp')));
    const old=siblings[0].hp;turn(g,siblings[1]);assert.ok(siblings[0].hp>old);
  });
}

test('泡は連撃の最初の一撃だけを防ぎ、糸と粒は実際の列移動に反応する',()=>{
  const g=start('classic',5,1),u=unit(g,'bubble');turn(g,u);
  const covered=g.state.battle.enemies.find(e=>e.tactics.foam);assert.ok(covered);
  assert.equal(hit(g,covered),0);assert.ok(hit(g,covered)>0);
  const t=start('classic',15,3),thread=unit(t,'thread');turn(t,thread);
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
    const g=start('classic',5,2),u=unit(g,'berry');
    const count=g.state.inventory.slime_berry??0;
    if(eaten){hit(g,u,'light',4,'fire');turn(g,u);assert.ok(u.tactics.spent);}
    for(const e of g.state.battle.enemies)hit(g,e,'light',2*e.stats.hp,'fire');
    endBattle(g,'win');
    assert.deepEqual(validateSave(JSON.parse(g.save()),g.data),[]);g.load(g.save());drain(g);
    assert.equal(g.state.inventory.slime_berry??0,count+Number(!eaten));
  }
});

test('鏡面は単体魔法を一度反射し、打撃で割れた瓶は同じ列に一度だけ飛び散る',()=>{
  const g=start('classic',15,2),u=unit(g,'mirror'),a=g.state.actors.ada;
  turn(g,u);const before=a.hp,enemyHp=u.hp;
  assert.equal(hit(g,u,'light',4,'fire'),0);assert.ok(a.hp<before);assert.equal(u.hp,enemyHp);
  assert.equal(hit(g,u,'light',4,'fire'),4);
  const h=start('classic',10,2),bottle=unit(h,'bottle');
  hit(h,bottle,'physical',2,'power');assert.ok(bottle.tactics.open);
  assert.match(slimeSprite(h.data,bottle),/bottle_open/);
  hit(h,bottle,'physical',2,'power');
  assert.equal(h.state.battle.log.filter(line=>line.includes('瓶が割れた')).length,1);
});
