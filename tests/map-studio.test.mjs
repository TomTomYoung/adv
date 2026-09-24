import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {MapStudio,presetUsage} from '../config/shared/map-studio.js';
import {paintCell,projectMap} from '../config/shared/studio/map-model.js';
import {installDOM} from './view-dom.mjs';
const read=f=>fs.readFile(new URL('../'+f,import.meta.url),'utf8');
async function ui(t){const dom=installDOM();t.after(()=>dom.restore());const app=new MapStudio(dom.root,{read,confirm:()=>true});await app.start('kagaribi');t.after(()=>app.destroy());return {...dom,app};}
test('map workspace retains dungeon, map and cell while editing a wall lamp and its script',async t=>{
 const {app}=await ui(t);assert.equal(app.mapId,'kagaribi_f1');assert.deepEqual(app.workspace.changed(),[]);
 const point=app.context.placements(app.mapId).find(p=>p.file==='quests/q001.events.json'&&p.eventPath?.[1]===3);assert.ok(point);await app.openPlacement(point);assert.equal(app.entry.file,point.file);assert.equal(app.current().value.title,'西の壁松明');assert.equal(app.mapId,'kagaribi_f1');assert.equal(app.task,'events');
 app.workspace.set(point.file,['events',3,'title'],'変更した壁灯','名前');paintCell(app.workspace,app.mapId,1,1,'stone_wall');await app.reviewChanges();assert.ok(app.workspace.output,app.status.textContent);assert.deepEqual(app.workspace.output.map(o=>o.file).sort(),['cell-layers.json',point.file].sort());
});
test('shared preset scope is counted separately from cell overrides',async t=>{
 const {app,root}=await ui(t);app.selectedCell={map:app.mapId,x:1,y:1};app.refresh();const source=app.workspace.value('cell-layers.json'),preset=source.maps[app.mapId].legend[source.maps[app.mapId].rows[1][1]];const uses=presetUsage(source,preset);assert.ok(uses.maps>1&&uses.cells>1);assert.match(root.textContent,/全地点|使用地点/);assert.ok(root.querySelectorAll('button').some(b=>b.textContent==='この地点だけの設定を作る'));assert.equal(app.workspace.dirty,false);
});
test('new destination map and connection preserve source ownership and support undo',async t=>{
 const {app}=await ui(t);const id=await app.createMap('接続先',6,6);await app.context.ensureMap(id);assert.equal(app.workspace.changed().length,3);
 const occupied=new Set(Object.values(app.workspace.value(app.dungeonFile()).systems).filter(s=>s.use==='map_connections').flatMap(s=>s.links.flatMap(l=>[l.a,l.b])).filter(p=>p.map===app.mapId).map(p=>`${p.x},${p.y}`));
 const cell=projectMap(app.context,app.mapId).cells.flat().find(c=>c.passage!== '#'&&!occupied.has(`${c.x},${c.y}`));app.connectionDraft={name:'新しい階段',kind:'stairs',a:{map:app.mapId,x:cell.x,y:cell.y},b:{map:id,x:1,y:1}};app.saveConnection();app.connectionDraft=null;await app.reviewChanges();assert.ok(app.workspace.output,app.status.textContent);app.workspace.undo();assert.ok(app.context.maps()[id]);app.workspace.undo();assert.equal(app.workspace.dirty,false);assert.equal(app.context.maps()[id],undefined);
});
test('connections reject unplaced, same-map, wall and invalid door endpoints; unfinished connection blocks export',async t=>{
 const {app}=await ui(t);await app.newConnection();assert.throws(()=>app.saveConnection(),/配置/);app.connectionDraft.a={map:app.mapId,x:0,y:0};assert.throws(()=>app.saveConnection(),/配置/);app.connectionDraft.b={...app.connectionDraft.a};assert.throws(()=>app.saveConnection(),/別々/);await app.reviewChanges();assert.equal(app.workspace.output,null);assert.match(app.status.textContent,/接続の編集中/);
});
test('export rejects connections broken by terrain edits and disconnected destination maps',async t=>{
 const {app}=await ui(t);const link=Object.values(app.workspace.value(app.dungeonFile()).systems).find(s=>s.use==='map_connections').links[0];paintCell(app.workspace,link.a.map,link.a.x,link.a.y,'stone_wall');await app.reviewChanges();assert.equal(app.workspace.output,null);assert.match(app.status.textContent,/足場/);app.workspace.undo();await app.createMap('未接続',5,5);await app.reviewChanges();assert.equal(app.workspace.output,null);assert.match(app.status.textContent,/入口と接続/);
});
test('entrances and connection markers open named source details without losing map context',async t=>{
 const {app}=await ui(t);const entrance=app.context.placements(app.mapId).find(p=>p.name==='マップの入口');await app.openPlacement(entrance);assert.equal(app.task,'objects');assert.equal(app.tab,1);assert.equal(app.entry.file,'kagaribi-content.json');const link=app.context.placements(app.mapId).find(p=>p.system&&p.path.includes('links'));assert.match(link.name,/階段/);await app.openPlacement(link);assert.equal(app.task,'connections');assert.equal(app.connectionDraft.kind,'stairs');
});
