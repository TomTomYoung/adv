import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {validateContent} from '../src/core/validation.js';
import {validateSchema} from '../config/shared/schema.js';
import {createValidator} from '../config/shared/validation.js';
import {ConfigStudio} from '../config/shared/studio.js';
import {editors} from '../config/shared/catalog.js';
import {data} from './helpers.mjs';
import {installDOM} from './view-dom.mjs';

const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8');
const json=async file=>JSON.parse(await read(file));
const enabled={op:'eq',left:{ref:'quests.q001.stage'},right:'active'};

test('marker conditions accept DSL expressions and reject invalid expressions in source and generated schemas',async()=>{
 const validate=createValidator(json),questEntry=editors.find(e=>e.file==='quests/q001.events.json'),mapEntry=editors.find(e=>e.file==='connected-maps.json');
 for(const [entry,select] of [[questEntry,source=>source.events[0]],[mapEntry,source=>Object.values(source.maps)[0].objects[0]]]){
  const source=await json('config/'+entry.file),target=select(source);
  for(const value of [false,enabled]){target.markerWhen=value;assert.deepEqual(await validate(entry,source),[],entry.file);}
  target.markerWhen={op:'invalid_marker_condition'};
  assert.ok((await validate(entry,source)).some(e=>e.includes('markerWhen')),entry.file);
 }
 for(const [name,file,select] of [['quest','data/quests/q001.json',source=>source.events[0]],['map','data/maps/kagaribi_f1.json',source=>source.objects[0]]]){
  const schema=await json(`data/schemas/${name}.schema.json`),source=await json(file),target=select(source);
  target.markerWhen=enabled;assert.deepEqual(validateSchema(source,schema),[],name);
  target.markerWhen={op:'invalid_marker_condition'};assert.ok(validateSchema(source,schema).some(e=>e.includes('markerWhen')),name);
 }
});

test('core validation validates marker conditions for map objects and quest events',()=>{
 for(const select of [d=>d.maps.kagaribi_f1.objects.find(o=>!o.quest),d=>d.quests.q001.events[0]]){
  const copy=structuredClone(data),target=select(copy);
  target.markerWhen=false;assert.deepEqual(validateContent(copy),[]);
  target.markerWhen=enabled;assert.deepEqual(validateContent(copy),[]);
  target.markerWhen={op:'invalid_marker_condition'};
  assert.ok(validateContent(copy).some(e=>e.includes('invalid_marker_condition')));
 }
});

test('quest and map editors add, edit and export marker conditions without changing physical visibility',async t=>{
 const dom=installDOM();t.after(()=>dom.restore());
 const app=new ConfigStudio(dom.root,{read,confirm:()=>true});t.after(()=>app.destroy());
 await app.start('quests/q001.events.json');
 for(const file of ['quests/q001.events.json','connected-maps.json']){
  if(app.entry.file!==file)await app.open(file);
  const row=app.current(),path=file.startsWith('quests/')?[...row.path,'markerWhen']:[...row.path,'objects',0,'markerWhen'];
  app.workspace.set(file,path,undefined,'表示条件を未指定にする');
  const before=structuredClone(app.workspace.value(file));
  app.tab=2;app.refresh();
  const option=dom.root.querySelectorAll('select').find(e=>e.getAttribute('aria-label')==='追加する設定'&&e.options.some(o=>o.value==='markerWhen'));
  assert.ok(option,`${file}: marker condition can be added`);
  option.value='markerWhen';option.dispatchEvent({type:'change'});option.parentElement.querySelector('button').click();
  const marker=dom.root.querySelectorAll('[data-path]').find(e=>e.dataset.path===JSON.stringify(path));
  assert.ok(marker,file);assert.match(marker.textContent,/出現条件に優先/);assert.match(marker.textContent,/通行・操作には影響しません/);
  const mode=marker.querySelectorAll('select').find(e=>e.getAttribute('aria-label')==='！の表示条件の種類');
  assert.equal(mode.value,'boolean');
  const value=marker.querySelectorAll('select').find(e=>e.getAttribute('aria-label')==='！の表示条件の値');
  value.value='false';value.dispatchEvent({type:'change'});
  await app.reviewChanges();assert.ok(app.workspace.output,app.status.textContent);
  const output=JSON.parse(app.workspace.output.find(o=>o.file===file).text);
  const target=file.startsWith('quests/')?before.events[row.key]:before.maps[row.key].objects[0];target.markerWhen=false;
  assert.deepEqual(output,before);
 }
});
