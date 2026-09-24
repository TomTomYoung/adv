import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {connectionPlan,connectionSurfaces} from '../src/core/systems/map-connections.js';
import {validateConnections} from '../src/core/connection-geometry.js';
import {currentIllumination} from '../src/core/lighting.js';
import {edgeKey,authoredEdge,edgePlacementErrors} from '../src/core/edge-layers.js';
import {traceDungeonRay} from '../src/view/dungeon.js';
import {MapStudio} from '../config/shared/map-studio.js';
import {Workspace} from '../config/shared/studio/workspace.js';
import {EditorContext} from '../config/shared/studio/context.js';
import {paintCell,projectMap} from '../config/shared/studio/map-model.js';
import {paintEdge,componentAt,setComponentField,resetComponentField,resizeMap,resizeReferences} from '../config/shared/studio/map-components.js';
import {installDOM} from './view-dom.mjs';
const read=f=>fs.readFile(new URL('../'+f,import.meta.url),'utf8');
const readJSON=async f=>JSON.parse(await read(f));
async function workspace(){const w=new Workspace(read),c=new EditorContext(w,read);await c.ensureMap('kagaribi_f1');return {w,c};}
async function ui(t){const dom=installDOM();t.after(()=>dom.restore());const app=new MapStudio(dom.root,{read,confirm:()=>true});await app.start('kagaribi');t.after(()=>app.destroy());return {...dom,app};}
test('a shared boundary has one placement, supports replacement policies and resets each exception',async()=>{
 const {w,c}=await workspace();paintEdge(w,'kagaribi_f1',2,1,'east','stone_partition');assert.equal(edgeKey(2,1,'east'),edgeKey(3,1,'west'));
 const p={x:3,y:1,side:'west'};setComponentField(w,'kagaribi_f1',p,['passage'],'.');setComponentField(w,'kagaribi_f1',p,['visual','opaque'],false);assert.equal(componentAt(w,'kagaribi_f1',p).effective.visual.wall,true);
 resetComponentField(w,'kagaribi_f1',p,['passage']);assert.equal(componentAt(w,'kagaribi_f1',p).effective.passage,'#');assert.equal(componentAt(w,'kagaribi_f1',p).effective.visual.opaque,false);
 paintEdge(w,'kagaribi_f1',2,1,'east','wood_partition','keep');assert.equal(componentAt(w,'kagaribi_f1',p).effective.visual.opaque,false);paintEdge(w,'kagaribi_f1',2,1,'east','open_passage','reset');assert.deepEqual(componentAt(w,'kagaribi_f1',p).override,{});
 assert.equal(Object.keys(w.value('cell-layers.json').maps.kagaribi_f1.edges).length,1);assert.equal(projectMap(c,'kagaribi_f1').edges.edges['3,1/west'].passage,'.');w.undo();assert.equal(componentAt(w,'kagaribi_f1',p).preset,'wood_partition');
});
test('cell replacement inherits only chosen exceptions and shared edits continue to propagate',async()=>{
 const {w}=await workspace(),map='kagaribi_f1',p={x:2,y:1};setComponentField(w,map,p,['passage'],'#');setComponentField(w,map,p,['parameters','illumination'],3);paintCell(w,map,2,1,'wood_floor','keep');assert.equal(componentAt(w,map,p).effective.passage,'#');
 w.set('cell-layers.json',['presets','wood_floor','visual','opaque'],true,'shared');assert.equal(componentAt(w,map,p).effective.visual.opaque,true);resetComponentField(w,map,p,['passage']);assert.equal(componentAt(w,map,p).effective.passage,'.');assert.equal(componentAt(w,map,p).effective.parameters.illumination,3);
 paintCell(w,map,2,1,'stone_floor','reset');assert.deepEqual(componentAt(w,map,p).override,{});
});
test('edge settings affect both directions of walking, sight and light independently',async()=>{
 const d=await loadContent(readJSON),g=new GameEngine(d),m=d.maps.region_2_f1;while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});m.objects=[];g.teleport(m.id,1,1,'east');g.state.waiting=null;g.state.vm=[];
 for(const x of [1,2,3]){m.cells.overrides[`${x},1`]=structuredClone(d.cellTypes.stone_floor);m.tiles[1]=m.tiles[1].slice(0,x)+'.'+m.tiles[1].slice(x+1);}
 m.cells.edges={[edgeKey(1,1,'east')]:{preset:'stone_partition'}};const before=g.state.steps;assert.equal(g.move('forward'),false);assert.equal(g.state.steps,before);assert.equal(g.state.location.x,1);
 let view=projectGame(g).dungeon;assert.equal(traceDungeonRay(view,1.5,1.5,1,0).distance,.5);assert.equal(view.lighting.levels[1][2],0);assert.equal(currentIllumination(d,g.state),view.lighting.current);
 g.teleport(m.id,2,1,'west');assert.equal(g.move('forward'),false);
 m.cells.edges[edgeKey(1,1,'east')].overrides={passage:'.',visual:{opaque:false,wall:false}};assert.equal(g.move('forward'),true);view=projectGame(g).dungeon;assert.ok(traceDungeonRay(view,1.5,1.5,1,0).distance>.5);assert.ok(view.lighting.levels[1][2]>0);
 assert.equal(authoredEdge(d,m,2,1,'west').passage,'.');assert.equal(edgePlacementErrors(d.edgeTypes,{'v:99,0':{preset:'missing'}},5,5,d.assets).length,2);
});
test('resizing preserves coordinates and rejects references, overrides and edges without mutating drafts',async t=>{
 const {app}=await ui(t),id=await app.createMap('サイズ試験',8,8);await app.context.ensureMap(id);const before=app.workspace.history.length;resizeMap(app.workspace,app.context,id,10,9);let p=app.workspace.value('cell-layers.json').maps[id];assert.equal(p.rows.length,9);assert.equal(p.rows[0].length,10);assert.equal(p.legend[p.rows[4][9]],'stone_wall');assert.equal(app.context.map(id).entrance.x,1);
 app.workspace.undo();assert.equal(app.workspace.history.length,before);paintEdge(app.workspace,id,6,6,'east','stone_partition');assert.throws(()=>resizeMap(app.workspace,app.context,id,6,6),/エッジ/);app.workspace.undo();setComponentField(app.workspace,id,{x:7,y:7},['parameters','illumination'],4);assert.throws(()=>resizeMap(app.workspace,app.context,id,6,6),/個別設定/);app.workspace.undo();
 const count=app.workspace.history.length;assert.throws(()=>resizeMap(app.workspace,app.context,id,6,6,[['data/scripts/example.json',{scripts:{go:{commands:[{op:'teleport',map:id,x:7,y:1}]}}}]]),/座標 7,1/);assert.equal(app.workspace.history.length,count);
 resizeMap(app.workspace,app.context,id,6,6);assert.equal(app.context.map(id).tiles.length,6);assert.equal(app.workspace.value('cell-layers.json').maps[id].rows[0].length,6);
});
test('resize scans nested inherited points, script destinations and directional cells',()=>{
 const issues=resizeReferences([['config/test.json',{systems:{portal:{map:'m',exit:{x:8,y:1}},flow:{vectorRows:{m:['#########','#.......→']}}},maps:{m:{entrance:{x:1,y:8}}},scripts:{s:{commands:[{op:'teleport',map:'m',x:9,y:0}]}}}]],'m',8,8);assert.equal(issues.length,4);
});
test('eight tabs share the same exceptions and output rejects a deleted used edge preset',async t=>{
 const {app,root}=await ui(t);assert.deepEqual(root.querySelector('.collection-tabs').children.map(b=>b.textContent),['マップサイズ','セル','エッジ','入口・配置物','通行可否','イベント','仕掛け','マップ間の接続']);
 assert.equal(root.querySelectorAll('.palette-choice').length,24);assert.equal(root.querySelectorAll('.map-marker').length,0);await app.selectTask('edges');app.edgeBrush='stone_partition';app.changeComponent(2,1,'east');await app.selectTask('passage');app.changeComponent(3,1,'west');setComponentField(app.workspace,app.mapId,app.selectedCell,['passage'],'.');assert.equal(componentAt(app.workspace,app.mapId,{x:2,y:1,side:'east'}).effective.passage,'.');
 await app.reviewChanges();assert.ok(app.workspace.output,app.status.textContent);app.workspace.set('cell-layers.json',['edgePresets','stone_partition'],undefined,'delete');await app.reviewChanges();assert.equal(app.workspace.output,null);assert.match(app.review.textContent,/エッジ種/);
});

test('connection doors accept a wall edge and enforce its passage on either endpoint',async()=>{
 const d=await loadContent(readJSON),dungeon=d.dungeons.region_2,link=structuredClone(dungeon.systems.connections.links[0]);link.kind='door';link.a.side='east';link.b.side='west';
 for(const p of [link.a,link.b]){const m=d.maps[p.map];m.cells.edges={[edgeKey(p.x,p.y,p.side)]:{preset:'stone_partition',overrides:{passage:'.'}}};}
 assert.deepEqual(validateConnections(d,{...dungeon,maps:[link.a.map,link.b.map],entries:{main:link.a}},{links:[link]}),[]);
 const state={location:{...link.a},dungeons:{active:{id:'region_2'}}},ctx={data:d,state,spec:{links:[link]},canOccupy:()=>true},intent={target:link.id};assert.equal(connectionPlan(ctx,intent).ok,true);
 d.dungeons.region_2.systems.connections.links=[link];delete d.maps[link.b.map].cells.edges[edgeKey(link.b.x,link.b.y,link.b.side)].overrides;
 assert.equal(connectionPlan(ctx,intent).ok,false);assert.match(connectionPlan(ctx,intent).reason,/境界/);assert.equal(connectionSurfaces(d,state).doors[`${link.a.x},${link.a.y}/east`].closed,true);
 state.location={...link.b};assert.equal(connectionPlan(ctx,intent).ok,false);
});
test('replacing a modified cell asks to keep, reset or cancel before changing the draft',async t=>{
 const {app,root}=await ui(t),p={x:2,y:1};setComponentField(app.workspace,app.mapId,p,['passage'],'#');app.brush='wood_floor';app.changeComponent(p.x,p.y);assert.equal(componentAt(app.workspace,app.mapId,p).preset,'stone_floor');
 const buttons=()=>root.querySelectorAll('button');buttons().find(b=>b.textContent==='置き換えを取り消す').click();assert.equal(componentAt(app.workspace,app.mapId,p).preset,'stone_floor');app.changeComponent(p.x,p.y);buttons().find(b=>b.textContent==='個別設定を引き継ぐ').click();assert.equal(componentAt(app.workspace,app.mapId,p).effective.passage,'#');
 app.brush='stone_floor';app.changeComponent(p.x,p.y);buttons().find(b=>b.textContent==='新しい種類の標準に戻す').click();assert.deepEqual(componentAt(app.workspace,app.mapId,p).override,{});
});
