import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {data} from './helpers.mjs';
import {questCatalog} from '../tools/quest-catalog.mjs';
import {questPageBundle,questPageEvents} from '../tools/quest-page.mjs';

for(const id of ['q001','q002'])test(`${id} is extracted once, retaining every scene and ending and leaving a catalog link`,()=>{
  const catalog=questCatalog(data,'2026-09-17'),q=data.quests[id];
  const page=questPageBundle(data,id)[`QUEST_${id.toUpperCase()}.md`];
  const section=catalog.split(`## ${id} `)[1].split('\n## ')[0];
  assert.ok(section.includes(`](QUEST_${id.toUpperCase()}.md)`));
  assert.ok(!section.includes(`### ${id}`));
  assert.equal((page.match(new RegExp(`^### ${id} / `,'gm'))??[]).length,q.model.graph.length);
  for(const node of q.model.graph){
    const unit=q.model.narrative.units.find(u=>u.id===node.id);
    assert.ok(page.includes(unit.script));
    const walk=commands=>{for(const c of commands){
      if(c.op==='say'||c.op==='narrate')assert.ok(page.includes(c.text));
      for(const o of c.options??[]){assert.ok(page.includes(o.text));walk(o.commands);}
      for(const key of ['then','else','on_win','on_escape','on_lose','on_interrupt'])if(c[key])walk(c[key]);
      for(const e of c.events??[])walk(e.commands);
    }};
    walk(q.scripts[unit.script].commands);
  }
  for(const o of Object.values(q.outcomes))assert.ok(page.includes(o.text));
});

test('all 19 event IDs are unique, stable when reordered, and cover shared map cells',()=>{
  const q=data.quests.q001,entries=questPageEvents(q);
  assert.equal(entries.length,19);assert.equal(new Set(entries.map(e=>e.id)).size,19);
  const reordered=structuredClone(q);reordered.model.graph.reverse();reordered.events.reverse();
  assert.deepEqual(questPageEvents(reordered).map(e=>e.id).sort(),entries.map(e=>e.id).sort());
  const bundle=questPageBundle(data,'q001'),page=bundle['QUEST_Q001.md'],svg=bundle['quest-maps/q001-kagaribi_f1.svg'];
  for(const e of entries){
    assert.ok(page.includes(e.id));
    assert.ok(svg.includes(e.id));
  }
  assert.deepEqual(entries.filter(e=>e.place?.x===9&&e.place?.y===1).map(e=>e.source),['dark','empty','outage','rescue','q001-F-kuragari','q001-B-rookie']);
  const bad=structuredClone(q);bad.events.push({...bad.events[0],id:'decision'});
  assert.throws(()=>questPageEvents(bad),/duplicate/);
});

test('embedded map data is byte-equivalent as JSON to the distribution; all five journeys and town parents are included',async()=>{
  const page=questPageBundle(data,'q001')['QUEST_Q001.md'];
  const raw=JSON.parse(await fs.readFile(new URL('../data/maps/kagaribi_f1.json',import.meta.url),'utf8'));
  const embedded=page.split('### kagaribi_f1 の全マップJSON')[1].match(/```json\n([\s\S]*?)\n```/)[1];
  assert.deepEqual(JSON.parse(embedded),raw);
  assert.equal((page.match(/で出発し、/g)??[]).length,5);
  for(const id of ['entry_talk','empty_follow','old_support','rescue_home','gate_report','hikarigaeri_square','hikarigaeri_guild','hikarigaeri_lamplighter_post','kagaribi_f2'])assert.ok(page.includes(id));
  assert.ok(page.includes('下層への移動は完了条件に含まれない'));
});

test('q002 documents the connected route, all six journeys, exact map JSON and nested choice combat',async()=>{
  const q=data.quests.q002,bundle=questPageBundle(data,q.id),page=bundle['QUEST_Q002.md'];
  for(const map of ['region_1_f1','region_1_canal_a','region_1_landing']){
    const raw=JSON.parse(await fs.readFile(new URL(`../data/maps/${map}.json`,import.meta.url),'utf8'));
    const embedded=page.split(`### ${map} の全マップJSON`)[1].match(/```json\n([\s\S]*?)\n```/)[1];
    assert.deepEqual(JSON.parse(embedded),raw);
    assert.ok(bundle[`quest-maps/q002-${map}.svg`].includes(map));
  }
  assert.equal((page.match(/で出発し、/g)??[]).length,6);
  for(const [id,a] of Object.entries(q.story.actions).filter(([,a])=>a.journey))assert.ok(page.includes(id));
  const ids=questPageEvents(q).map(e=>e.id);
  assert.equal(ids.length,13);assert.equal(new Set(ids).size,13);
  assert.ok(ids.includes('q002-F-entry-tags-guard_1'));
  assert.ok(page.includes('q002_decision は interact'));
  assert.ok(page.includes('目的セルへの進入で recovery が自動開始'));
  for(const id of ['hikarigaeri_medical_specimens','hikarigaeri_insurance','witnessConsent','tagsAt','ledgerAt'])assert.ok(page.includes(id));
  assert.ok(!page.includes('「目的地で続きを進める」を選んで'));
});
