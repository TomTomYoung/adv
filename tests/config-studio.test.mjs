import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {Workspace,get} from '../config/shared/studio/workspace.js';
import {EditorContext} from '../config/shared/studio/context.js';
import {ConfigStudio} from '../config/shared/studio.js';
import {checkWorkspace} from '../config/shared/studio/checks.js';
import {projectMap,movePoint,paintCell,addQuestEvent} from '../config/shared/studio/map-model.js';
import {collections} from '../config/shared/studio/profiles.js';
import {createDefinitions,createValidator} from '../config/shared/validation.js';
import {editors} from '../config/shared/catalog.js';
import {referenceData} from '../config/shared/reference-catalog.js';
import {installDOM} from './view-dom.mjs';
const read=f=>fs.readFile(new URL('../'+f,import.meta.url),'utf8');
const readJSON=async f=>JSON.parse(await read(f));
const entry=f=>editors.find(e=>e.file===f);
const deferred=()=>{let resolve;return {promise:new Promise(r=>resolve=r),resolve:value=>resolve(value)};};
const btn=(root,text)=>{const b=root.querySelectorAll('button').find(b=>b.textContent===text);assert.ok(b,text);return b;};
const field=(root,path)=>{const n=root.querySelectorAll('[data-path]').find(n=>n.dataset.path===JSON.stringify(path));assert.ok(n,JSON.stringify(path));return n.querySelectorAll('input,textarea,select').find(n=>n.type!=='search');};
const enter=(n,value)=>{n.value=value;n.dispatchEvent({type:'input'});};
async function ui(t,file){const dom=installDOM();t.after(()=>dom.restore());const app=new ConfigStudio(dom.root,{read,confirm:()=>true});await app.start(file);t.after(()=>app.destroy());return {...dom,app};}

test('all 225 source documents pass semantic reference and bounds checks without changing source values',async()=>{
 const definition=createDefinitions(readJSON),snapshot=new Map(),schemas=new Map();for(const e of editors){snapshot.set(e.file,await readJSON('config/'+e.file));schemas.set(e.file,await definition(e));}
 assert.deepEqual(checkWorkspace(snapshot,editors.map(e=>e.file),referenceData,schemas),[]);
});
test('workspace transactions are atomic across files, retain unknown fields and support undo/redo',async()=>{
 const w=new Workspace(async f=>JSON.stringify(f.endsWith('a.json')?{name:'a',future:{order:[3,2,1]}}:{count:1}));await Promise.all([w.load('a.json'),w.load('b.json')]);
 w.transaction('two files',['a.json','b.json'],docs=>{docs['a.json'].name='変更';docs['b.json'].count=2;});assert.deepEqual(w.changed(),['a.json','b.json']);assert.deepEqual(w.value('a.json').future,{order:[3,2,1]});
 assert.throws(()=>w.transaction('bad',['a.json','b.json'],docs=>{docs['a.json'].name='bad';docs['b.json'].count=Infinity;}));assert.equal(w.value('a.json').name,'変更');
 w.undo();assert.equal(w.dirty,false);w.redo();assert.equal(w.value('b.json').count,2);
 const gate=deferred(),pending=w.validate(()=>gate.promise);w.set('a.json',['name'],'new','change');gate.resolve([]);assert.equal((await pending).stale,true);assert.equal(w.output,null);
});
test('cell painting keeps local overrides and edge movement preserves event metadata',async()=>{
 const w=new Workspace(read),c=new EditorContext(w,read);await w.load('quests/q001.events.json');await c.ensureMap('kagaribi_f1');
 w.set('cell-layers.json',['maps','kagaribi_f1','overrides','2,2'],{parameters:{illumination:5},future:'kept'},'fixture');paintCell(w,'kagaribi_f1',2,2,'stone_wall');
 assert.equal(projectMap(c,'kagaribi_f1').cells[2][2].passage,'#');assert.equal(w.value('cell-layers.json').maps.kagaribi_f1.overrides['2,2'].future,'kept');
 const target={file:'quests/q001.events.json',path:['events',3,'points',0],eventPath:['events',3],allowEdge:true};const before=structuredClone(w.value(target.file).events[3]);movePoint(w,c,target,'kagaribi_f1',3,1,'west');assert.deepEqual(w.value(target.file).events[3],{...before,points:[{...before.points[0],x:3,y:1,edge:'west'}]});
 assert.throws(()=>movePoint(w,c,{...target,path:['events',0,'points',0],eventPath:['events',0]},'kagaribi_f1',3,1,'north'),/エッジ/);
 assert.throws(()=>movePoint(w,c,target,'kagaribi_f1',999,1),/範囲外/);
});
test('new quest event includes an editable local script, one undo removes both',async()=>{
 const w=new Workspace(read);await w.load('quests/q001.events.json');const original=structuredClone(w.value('quests/q001.events.json'));
 const index=addQuestEvent(w,'quests/q001.events.json','kagaribi_f1',1,1),value=w.value('quests/q001.events.json');assert.ok(value.scripts[value.events[index].script]);assert.deepEqual(await createValidator(readJSON)(entry('quests/q001.events.json'),value),[]);w.undo();assert.deepEqual(w.value('quests/q001.events.json'),original);
});
test('new map creation changes map, cell and dungeon sources atomically and passes all validators',async t=>{
 const {app,root}=await ui(t,'connected-maps.json');await app.addMap();btn(root,'この内容で作成').click();
 for(let i=0;i<100&&!app.workspace.changed().length;i++)await new Promise(r=>setTimeout(r,5));
 assert.equal(app.workspace.changed().length,3);await app.reviewChanges();assert.ok(app.workspace.output,app.status.textContent);assert.equal(app.workspace.output.length,3);app.workspace.undo();assert.equal(app.workspace.dirty,false);
});
test('deleting a named record catches references from files not opened in the editor',async()=>{
 const w=new Workspace(read);await w.load('jobs.json');const id=Object.keys(w.value('jobs.json').skills).find(id=>referenceData.references.some(r=>r.kind==='skills'&&r.id===id&&r.file!=='jobs.json'));assert.ok(id);w.set('jobs.json',['skills',id],undefined,'delete');
 const schemas=new Map([['jobs.json',await createDefinitions(readJSON)(entry('jobs.json'))]]),errors=checkWorkspace(new Map([['jobs.json',w.value('jobs.json')]]),['jobs.json'],referenceData,schemas);assert.ok(errors.some(e=>e.file!=='jobs.json'&&e.message.includes(id)));
});
test('semantic UI changes a named skill cost and exports only its source with untouched metadata',async t=>{
 const {app,root}=await ui(t,'jobs.json');await app.selectCollection('skills');const row=app.current(),original=structuredClone(app.workspace.value('jobs.json'));app.tab=1;app.renderDetail();enter(field(root,[...row.path,'mp']),'7');await app.reviewChanges();
 assert.equal(app.workspace.output.length,1);assert.equal(app.workspace.output[0].file,'jobs.json');original.skills[row.key].mp=7;assert.deepEqual(JSON.parse(app.workspace.output[0].text),original);
 enter(field(root,[...row.path,'mp']),'-1');assert.equal(app.workspace.output,null);await app.reviewChanges();assert.equal(app.workspace.output,null);assert.equal(app.guard(),false);
});
test('invalid UI input during asynchronous validation cannot publish an older valid draft',async t=>{
 const {app,root}=await ui(t,'dungeons/kagaribi.json');enter(field(root,['recommendedLevel']),'2');const gate=deferred();app.validateFile=()=>gate.promise;const pending=app.reviewChanges();await new Promise(r=>setImmediate(r));enter(field(root,['recommendedLevel']),'-1');gate.resolve([]);await pending;assert.equal(app.workspace.output,null);assert.equal(app.review.hidden,true);
});
test('command builder adds consumption by named item and preserves nested choices',async t=>{
 const {app,root}=await ui(t,'quests/q001.events.json');await app.selectCollection('scripts');const row=app.current(),before=structuredClone(row.value.commands);
 const select=root.querySelectorAll('select').filter(s=>s.getAttribute('aria-label')==='追加する処理').at(-1);select.value='item.take';select.dispatchEvent({type:'change'});root.querySelectorAll('button').filter(b=>b.textContent==='処理を追加').at(-1).click();const commands=app.current().value.commands;assert.deepEqual(commands.slice(0,-1),before);assert.equal(commands.at(-1).op,'item.take');assert.ok(app.context.names('items')[commands.at(-1).item]);assert.equal(commands.at(-1).count,1);
});
test('representative domain screens render every collection and tab without dirtying any JSON',async t=>{
 const {app}=await ui(t,'jobs.json');for(const file of ['jobs.json','entities.json','locations.json','presentation.json','dungeon-art.json','cell-layers.json','connected-maps.json','kagaribi-content.json','terrain-content.json','voxel-content.json','catalog-q011-q020.json',...editors.filter(e=>e.family==='dungeon').map(e=>e.file),'quests/q001.events.json','quests/q100.events.json','quests/q200.events.json']){
  await app.open(file);for(const group of collections(entry(file),app.workspace.value(file))){await app.selectCollection(group.key);for(const row of app.rows().slice(0,1)){await app.selectRecord(row.key);for(let i=0;i<5;i++){app.tab=i;app.renderDetail();}}}
 }assert.deepEqual(app.workspace.changed(),[]);
});
