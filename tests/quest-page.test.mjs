import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {data} from './helpers.mjs';
import {questCatalog} from '../tools/quest-catalog.mjs';
import {questPageBundle,questPageEvents} from '../tools/quest-page.mjs';

test('q001 is extracted once, retaining every scene and ending and leaving a catalog link',()=>{
  const catalog=questCatalog(data,'2026-09-17'),q=data.quests.q001;
  const page=questPageBundle(data,'q001')['QUEST_Q001.md'];
  const section=catalog.split('## q001 ')[1].split('## q002 ')[0];
  assert.ok(section.includes('](QUEST_Q001.md)'));
  assert.ok(!section.includes('### q001'));
  assert.equal((page.match(/^### q001 \/ /gm)??[]).length,q.model.graph.length);
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
