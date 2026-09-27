import test from 'node:test';
import assert from 'node:assert/strict';
import {data} from './helpers.mjs';
import {questCatalog} from '../tools/quest-catalog.mjs';
import {questRouteSummary,routeArea} from '../tools/quest-route-summary.mjs';

test('all 200 catalog entries contain a readable route before implementation metadata',()=>{
  const catalog=questCatalog(data,'2026-09-27');
  assert.equal((catalog.match(/^経過：$/gm)??[]).length,200);
  assert.equal((catalog.match(/^\* 【[^】]+】\[[^\]]+\]：.+$/gm)??[]).length,522);
  for(const q of Object.values(data.quests)){
    const section=catalog.split(`## ${q.id} `)[1].split('\n## ')[0];
    assert.ok(section.indexOf('経過：')<section.indexOf('モデル:'));
  }
});

test('q004 underground rooms retain their dungeon identity, while the registry is in town',()=>{
  assert.equal(routeArea(data,{location:'waterway_checkpoint'}),'灯守の地下水道');
  assert.equal(routeArea(data,{location:'waterway_checkpoint_holding'}),'灯守の地下水道');
  assert.equal(routeArea(data,{location:'hikarigaeri_pass_registry'}),'灯帰り');
  const route=questRouteSummary(data,data.quests.q004);
  assert.ok(route.includes('【灯守の地下水道】[詰所・窓口]'));
  assert.equal((route.match(/【灯帰り】\[通行資格審査所\]/g)??[]).length,2);
  assert.ok(!route.includes('未接続'));
});

test('q002 retains the school, recovery return trip and hearing in their story order',()=>{
  const route=questRouteSummary(data,data.quests.q002);
  const school=route.indexOf('【灯帰り】[医学校・標本室]');
  const recovery=route.indexOf('【灯守の地下水道】[引き揚げ場]',school);
  const returned=route.indexOf('【灯帰り】[医学校・標本室]',recovery);
  const hearing=route.indexOf('【灯帰り】[保険審査所]');
  assert.ok(school>=0&&school<recovery&&recovery<returned&&returned<hearing);
});

test('unconnected scenes and unnamed towns are distinguished from verified physical routes',()=>{
  assert.ok(questRouteSummary(data,data.quests.q005).includes('実移動は未接続'));
  const village=questRouteSummary(data,data.quests.q101);
  assert.ok(village.includes('【灯守の地下水道周辺】[鍵屋]'));
  assert.ok(village.includes('町名と各施設の実移動先は未設定'));
  assert.ok(questRouteSummary(data,data.quests.q193).includes('【祈りの届かない谷】'));
  assert.ok(questRouteSummary(data,data.quests.q194).includes('【巨獣上の移動集落】'));
});

test('missing summaries and changed story facts fail instead of publishing stale route prose',()=>{
  assert.throws(()=>questRouteSummary(data,data.quests.q001,{}),/missing catalog route/);
  const changed=structuredClone(data.quests.q004);
  changed.model.graph[0].options[0].to='@contract';
  assert.throws(()=>questRouteSummary(data,changed),/catalog route source changed/);
});
