import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {JSONDocument,parseJSON,serialize} from '../config/shared/model.js';
import {validateSchema} from '../config/shared/schema.js';
import {createValidator} from '../config/shared/validation.js';
import {mountEditor} from '../config/shared/editor.js';
import {editors} from '../config/shared/catalog.js';
import {installDOM} from './view-dom.mjs';
const read=async path=>JSON.parse(await fs.readFile(new URL('../'+path,import.meta.url),'utf8'));
const validator=createValidator(read);
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const btn=(root,text)=>{const result=root.querySelectorAll('button').find(b=>b.textContent===text);assert.ok(result,text);return result;};
const input=(root,path)=>{const result=root.querySelectorAll('input,textarea').find(e=>e.getAttribute('aria-label')===path);assert.ok(result,path);return result;};
function enter(element,value){element.value=value;element.dispatchEvent({type:'input'});}
const sample={name:'灯り',count:2,enabled:true,extra:{future:{text:'<img src=x onerror=alert(1)>',order:[3,1,2]}},list:[{id:'b'},{id:'a'}]};
async function ui(t,options={}){const dom=installDOM();t.after(()=>dom.restore());const app=mountEditor(dom.root,{file:'sample.json',title:'設定',hint:'テスト'},{read:async()=>serialize(sample),validate:async()=>[],confirm:()=>true,...options});await app.ready;return {...dom,app};}

test('JSON parser rejects lossy or ambiguous input without executing text',()=>{
 assert.deepEqual(parseJSON('{"text":"<script>alert(1)</script>","x":1.25,"s":"\\\"\\n日本"}'),{text:'<script>alert(1)</script>',x:1.25,s:'"\n日本'});
 for(const text of ['{"x":1,"\\u0078":2}','{"__proto__":{}}','{"a":{"constructor":0}}','9007199254740993','1e999','1e-999','[1,]','{"x":1} true','[01]','"\\x"','[\n','['.repeat(102)+']'.repeat(102)])assert.throws(()=>parseJSON(text),text);
 assert.throws(()=>parseJSON('"'+'灯'.repeat(1_700_000)+'"'),/5MB/);
});
test('targeted edits preserve unknown deep fields, object order and unrelated array order',async()=>{
 const doc=new JSONDocument(serialize(sample));doc.replace(['name'],'月');
 await doc.validate(async()=>[]);const output=doc.output;assert.deepEqual(JSON.parse(output),{...sample,name:'月'});
 assert.equal(output,serialize({...sample,name:'月'}));assert.deepEqual(Object.keys(JSON.parse(output)),Object.keys(sample));assert.equal(serialize(parseJSON(output)),output);
 assert.equal(doc.dirty,true);doc.undo();assert.equal(doc.dirty,false);assert.equal(doc.output,null);
});
test('structural edits are explicit and failed mutations are atomic',()=>{
 const doc=new JSONDocument('{"rows":["a","b","c"],"meta":{}}');doc.move(['rows',1],-1);doc.add(['rows'],2,'d');doc.remove(['rows',3]);doc.add(['meta'],'future',{a:2});
 assert.deepEqual(doc.value,{rows:['b','a','d'],meta:{future:{a:2}}});const before=serialize(doc.value),revision=doc.revision;
 for(const edit of [()=>doc.add(['meta'],'future',3),()=>doc.add(['meta'],'__proto__',3),()=>doc.move(['rows',0],-1),()=>doc.remove(['missing'])])assert.throws(edit);
 assert.equal(serialize(doc.value),before);assert.equal(doc.revision,revision);doc.replace([],[]);assert.deepEqual(doc.value,[]);doc.undo();assert.equal(serialize(doc.value),before);
});
test('validation never returns an export for an older revision',async()=>{
 const doc=new JSONDocument('{"x":1}'),gate=deferred(),result=doc.validate(()=>gate.promise);doc.replace(['x'],2);gate.resolve([]);
 assert.equal((await result).stale,true);assert.equal(doc.output,null);await doc.validate(async()=>['invalid']);assert.equal(doc.output,null);
 await doc.validate(async()=>[]);assert.equal(doc.output,serialize({x:2}));
});
test('schema uses required, bounds, conditionals, refs, exact alternatives and uniqueness',()=>{
 const schema={$defs:{id:{type:'string',pattern:'^[a-z]+$'}},type:'object',required:['id','rows'],properties:{id:{$ref:'#/$defs/id'},rows:{type:'array',minItems:1,uniqueItems:true,items:{type:'integer',minimum:0,maximum:9}},mode:{enum:['on','off']}},additionalProperties:false,if:{properties:{mode:{const:'on'}},required:['mode']},then:{required:['id']}};
 assert.deepEqual(validateSchema({id:'a',rows:[0,9]},schema),[]);
 for(const value of [{rows:[1]},{id:'!',rows:[1]},{id:'a',rows:[]},{id:'a',rows:[1,1]},{id:'a',rows:[10]},{id:'a',rows:[1],extra:true}])assert.ok(validateSchema(value,schema).length);
 assert.ok(validateSchema(1,{oneOf:[{type:'number'},{type:'integer'}]}).length);
 assert.deepEqual(validateSchema(1,{anyOf:[{type:'number'},{type:'integer'}]}),[]);
 assert.ok(validateSchema(1,{if:false,else:false}).length);assert.ok(validateSchema(1,{not:true}).length);
 assert.ok(validateSchema([{a:1,b:2},{b:2,a:1}],{uniqueItems:true}).length);
});
test('unsupported or unresolved rules and exhausted negation fail closed',()=>{
 assert.ok(validateSchema(1,{anyOf:[true,{format:'secret'}]}).some(e=>e.includes('未対応')));
 assert.ok(validateSchema(1,{$ref:'#/$defs/missing'}).length);
 const schema={$defs:{loop:{$ref:'#/$defs/loop'}},not:{$ref:'#/$defs/loop'}};
 assert.ok(validateSchema(1,schema).some(e=>e.includes('複雑さ')));
});
test('real quest DSL rejects unknown commands, invalid edges and duplicate placements',async()=>{
 const entry=editors.find(e=>e.id==='q001'),original=await read('config/'+entry.file);assert.deepEqual(await validator(entry,original),[]);
 const command=structuredClone(original);command.scripts[Object.keys(command.scripts)[0]]=[{op:'execute.javascript',code:'alert(1)'}];assert.ok((await validator(entry,command)).length);
 const duplicate=structuredClone(original);duplicate.events.push(structuredClone(duplicate.events[0]));assert.ok((await validator(entry,duplicate)).some(e=>e.includes('重複')));
 const edge=structuredClone(original);edge.events[0].points[0].edge='north';edge.events[0].trigger='enter';assert.ok((await validator(entry,edge)).length);
});
test('real dungeon, location, job, cell and presentation inconsistencies are blocked',async()=>{
 for(const [family,mutate] of [
  ['dungeon',v=>{v.entries.main.map='not-in-this-dungeon';}],
  ['locations',v=>{const first=Object.values(v)[0];first.parent=first.id;}],
  ['jobs',v=>{v.initialJobs[Object.keys(v.initialJobs)[0]]='missing';}],
  ['cells',v=>{const map=Object.values(v.maps)[0];map.legend[Object.keys(map.legend)[0]]='missing';}],
  ['presentation',v=>{Object.values(v.cues)[0].sound='missing';}],
 ]){const entry=editors.find(e=>e.family===family),value=await read('config/'+entry.file);assert.deepEqual(await validator(entry,value),[],family);mutate(value);assert.ok((await validator(entry,value)).length,family);}
});
test('editor changes a field and copies the entire document including unseen fields',async t=>{
 let copied;const {root,app}=await ui(t,{clipboard:{writeText:async text=>{copied=text;}}});enter(input(root,'/name'),'新しい灯り');btn(root,'検証して全JSONを出力').click();await tick();btn(root,'全JSONをコピー').click();await tick();
 assert.deepEqual(JSON.parse(copied),{...sample,name:'新しい灯り'});assert.equal(root.querySelectorAll('img,script').length,0);
 enter(input(root,'/name'),'別の灯り');assert.equal(app.document.output,null);assert.equal(root.querySelector('.output').hidden,true);assert.equal(btn(root,'全JSONをコピー').disabled,true);
});
test('invalid numeric input blocks export and navigation until corrected',async t=>{
 const {root,app}=await ui(t);enter(input(root,'/count'),'');assert.equal(btn(root,'検証して全JSONを出力').disabled,true);btn(root,'詳細を開く').click();assert.ok(input(root,'/count'));btn(root,'全JSONを直接編集').click();assert.equal(root.querySelector('.raw-panel').hidden,true);
 enter(input(root,'/count'),'3');btn(root,'検証して全JSONを出力').click();await tick();assert.equal(JSON.parse(app.document.output).count,3);
});
test('unapplied raw JSON blocks output and malformed JSON cannot alter the document',async t=>{
 const {root,app}=await ui(t);btn(root,'全JSONを直接編集').click();enter(input(root,'JSON編集'),'{"name":1,"name":2}');btn(root,'JSON編集を反映').click();assert.deepEqual(app.document.value,sample);assert.equal(btn(root,'検証して全JSONを出力').disabled,true);
 enter(input(root,'JSON編集'),'{"new":{"hidden":[1,2]}}');btn(root,'JSON編集を反映').click();assert.deepEqual(app.document.value,{new:{hidden:[1,2]}});assert.equal(root.querySelector('.raw-panel').hidden,true);
 btn(root,'一つ戻す').click();assert.deepEqual(app.document.value,sample);
});
test('edits during asynchronous validation cannot expose a stale export',async t=>{
 const gate=deferred(),{root,app}=await ui(t,{validate:()=>gate.promise});btn(root,'検証して全JSONを出力').click();enter(input(root,'/name'),'changed');gate.resolve([]);await tick();assert.equal(app.document.output,null);assert.equal(root.querySelector('.output').hidden,true);assert.match(app.status,/もう一度検証/);
});
test('clipboard failure selects all JSON for manual copying',async t=>{
 const {root,document}=await ui(t,{clipboard:{writeText:async()=>{throw Error('denied');}}});btn(root,'検証して全JSONを出力').click();await tick();btn(root,'全JSONをコピー').click();await tick();const output=input(root,'検証済みの全JSON');assert.equal(document.activeElement,output);assert.equal(output.selectionStart,0);assert.equal(output.selectionEnd,output.value.length);
});
test('reload and import preserve edits made while reads are pending',async t=>{
 const gate=deferred();let reads=0;const {root,app}=await ui(t,{read:()=>++reads===1?serialize(sample):gate.promise});btn(root,'元のJSONを再読込').click();enter(input(root,'/name'),'during reload');gate.resolve(serialize(sample));await tick();assert.equal(app.document.value.name,'during reload');
 const imported=deferred(),file=root.querySelectorAll('input').find(e=>e.type==='file');file.files=[{text:()=>imported.promise}];file.dispatchEvent({type:'change'});enter(input(root,'/name'),'during import');imported.resolve('{"name":"imported"}');await tick();assert.equal(app.document.value.name,'during import');
 file.files=[{text:async()=>'{"name":1,"name":2}'}];file.dispatchEvent({type:'change'});await tick();assert.equal(app.document.value.name,'during import');assert.match(app.status,/重複/);
});
test('loading failures can recover by file import without a server response',async t=>{
 const {root,app}=await ui(t,{read:async()=>{throw Error('offline');}});assert.equal(app.document,null);assert.equal(btn(root,'全JSONを直接編集').disabled,true);const file=root.querySelectorAll('input').find(e=>e.type==='file');file.files=[{text:async()=>serialize(sample)}];file.dispatchEvent({type:'change'});await tick();assert.deepEqual(app.document.value,sample);assert.equal(btn(root,'全JSONを直接編集').disabled,false);
});
test('paging preserves every unseen value and array movement requires an explicit action',async t=>{
 const values=Array.from({length:75},(_,i)=>i),{root,app}=await ui(t,{read:async()=>serialize(values)});btn(root,'次の60件').click();enter(input(root,'/60'),'999');btn(root,'検証して全JSONを出力').click();await tick();const expected=[...values];expected[60]=999;assert.deepEqual(JSON.parse(app.document.output),expected);
 const row=input(root,'/60').closest('.field');btn(row,'上へ').click();[expected[59],expected[60]]=[expected[60],expected[59]];assert.deepEqual(app.document.value,expected);assert.equal(app.document.output,null);
});
