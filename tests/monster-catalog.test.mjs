import test from 'node:test';
import assert from 'node:assert/strict';
import {data} from './helpers.mjs';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
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

test('灯蛾・煤けた灯蛾・鉄喰い蛾・虹彩チョウをそれぞれの絵で掲載する',()=>{
  for(const id of ['kagaribi_ember_moth','kagaribi_soot_moth','iron_moth','iris_butterfly']){
    const file='assets/images/monsters/'+id+'.webp';
    assert.equal(data.assets.images[data.enemies[id].sprite],file);
    assert.ok(entry(id).includes(file));
  }
});

test('緑スライムを共有していた14種とスライム系の全種に、ほかの魔物と重複しない画像を掲載する',async()=>{
  const former=['guard_1','guard_1_elite','guard_3','guard_3_elite','moss_crawler','water_darter','water_predator','water_giant',
    'salt_eater','kagaribi_wax_slime','kagaribi_oil_wax','waterway_young_eel','waterway_low_eel','waterway_low_clam'];
  const enemies=Object.values(data.enemies);
  const files=[...new Set(enemies.map(e=>data.assets.images[e.sprite]))];
  const hashes=new Map(await Promise.all(files.map(async file=>{
    const bytes=await readFile(new URL('../'+file,import.meta.url));
    return [file,createHash('sha256').update(bytes).digest('hex')];
  })));
  const users=new Map();
  for(const e of enemies){
    const hash=hashes.get(data.assets.images[e.sprite]);
    users.set(hash,[...(users.get(hash)??[]),e.id]);
  }
  for(const id of [...former,...enemies.filter(e=>e.family==='slime').map(e=>e.id)]){
    const file=data.assets.images[data.enemies[id].sprite];
    assert.deepEqual(users.get(hashes.get(file)),[id],id);
    assert.ok(entry(id).includes(file),id);
  }
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
  assert.ok(entry('garden_nectar_bee').includes('garden_root_guardian'));
  assert.ok(entry('garden_nectar_bee').includes('有限増援予定：蜜蝋ランプバチ'));
  assert.ok(entry('garden_nectar_bee').includes('garden.root_gate.10'));
});

test('各行動に命中時の効果と自己効果を掲載し、召喚・休み・変化する技能も説明する',()=>{
  assert.match(entry('guard_6_elite'),/物理ダメージ（目安\d+）。続いて命中時25%で毒Lv1.*巡の終わりにHP−3/);
  assert.match(entry('slime_5_oil'),/自爆.*倒れます。.*炎ダメージ/);
  assert.match(entry('slime_25_pot'),/赤い薬：炎ダメージ.*緑の薬：HPを回復/s);
  assert.match(entry('orc_5_drummer'),/物理威力 ×1.3/);
  assert.match(catalog,/行動後、自身に.*防御 ×0.7/);
  assert.match(catalog,/灯蛾を2〜3体呼びます/);
  assert.match(catalog,/息継ぎで、この手番は休む/);
  assert.doesNotMatch(catalog,/目安(?:NaN|undefined)/);
});
