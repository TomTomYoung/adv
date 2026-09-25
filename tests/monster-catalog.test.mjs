import test from 'node:test';
import assert from 'node:assert/strict';
import {data} from './helpers.mjs';
import {monsterCatalog,encounterReferences} from '../tools/monster-catalog.mjs';

const catalog=monsterCatalog(data);
const entry=id=>catalog.split(` (${id})\n`)[1]?.split('\n### ')[0];

test('every enemy has one entry with its real image and AI, including enemies without a representative skill',()=>{
  assert.equal((catalog.match(/^### /gm)??[]).length,Object.keys(data.enemies).length);
  for(const [id,enemy] of Object.entries(data.enemies)){
    const text=entry(id);assert.ok(text,id);
    assert.ok(text.includes(data.assets.images[enemy.sprite]),id);
    for(const rule of enemy.ai)assert.ok(text.includes(`(${rule.skill})`),`${id}: ${rule.skill}`);
  }
  assert.ok(entry('guard_6_elite').includes('(heal)'));
  assert.ok(entry('guard_6_elite').includes('(poison_bite)'));
  assert.ok(entry('valley_hexer').includes('(valley_curse)'));
  assert.ok(entry('compass_magpie').includes('現在HPの実数が最も低い'));
  assert.ok(entry('bone_whale').includes('探索隊の生存者全員'));
  assert.ok(entry('waterwheel_beaver').includes('地域分類：灯守の地下水道'));
});

test('single map candidates and direct field battles count as references',()=>{
  const refs=encounterReferences({
    encounters:{direct:{},unused:{}},
    maps:{a:{id:'a',name:'入口',encounter:'direct'}},
    dungeons:{a:{name:'迷宮',systems:{disabled:{enabled:false,encounter:'unused'}},fieldEvents:[{id:'ambush',action:{type:'battle',encounter:'direct'}}]}},
    scripts:{}
  });
  assert.deepEqual(refs.direct,{maps:[{id:'a',name:'入口',weight:null}],systems:['迷宮 / fieldEvents.ambush'],scripts:[]});
  assert.deepEqual(refs.unused,{maps:[],systems:[],scripts:[]});
});

test('encounter definitions distinguish current references from retired water encounters and shared images',()=>{
  const refs=encounterReferences(data);
  const water=Object.entries(data.encounters).filter(([,e])=>e.enemies.some(id=>['water_darter','water_predator','water_giant'].includes(id)));
  assert.equal(water.length,3);
  for(const [id] of water)assert.deepEqual(refs[id],{maps:[],systems:[],scripts:[]});
  assert.ok(refs.kuragari_hunt.systems.length>0);
  assert.ok(refs.kuragari_hunt.scripts.some(id=>id.startsWith('q001.')));
  assert.ok(refs.salt_eater_feeding.systems.length>0);
  assert.ok(entry('kuragari').includes('assets/images/monsters/wraith.webp'));
  assert.ok(entry('kuragari').includes('腐肉鬼'));
  assert.ok(entry('salt_eater').includes('corrosion.battleRound'));
});
