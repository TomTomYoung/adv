import {parseJSON,serialize,at,pathLabel} from '../model.js';
const clone=value=>structuredClone(value);
function assertJSON(value,depth=0){if(depth>100)throw Error('入れ子が深すぎます。');if(value===null||typeof value==='boolean'||typeof value==='string')return;if(typeof value==='number'&&Number.isFinite(value)&&(!Number.isInteger(value)||Number.isSafeInteger(value)))return;if(value&&typeof value==='object'&&(Array.isArray(value)||Object.getPrototypeOf(value)===Object.prototype)){for(const v of Object.values(value))assertJSON(v,depth+1);return;}throw Error('JSONで精度を保てない値です。');}
const blocked=new Set(['__proto__','prototype','constructor']);
export function get(value,path){try{return at(value,path);}catch{return undefined;}}
export function put(value,path,next){
 if(path.some(k=>blocked.has(String(k))))throw Error('予約された項目は編集できません。');
 if(!path.length)return clone(next);
 let parent=value;for(let i=0;i<path.length-1;i++){const k=path[i];if(parent[k]===undefined)parent[k]=typeof path[i+1]==='number'?[]:{};parent=parent[k];if(!parent||typeof parent!=='object')throw Error('編集位置の親がありません。');}const key=path.at(-1);
 if(next===undefined){if(Array.isArray(parent))parent.splice(Number(key),1);else delete parent[key];}
 else parent[key]=clone(next);
 return value;
}
export function diffValues(before,after,path=[],out=[]){
 if(JSON.stringify(before)===JSON.stringify(after))return out;
 if(before&&after&&typeof before==='object'&&typeof after==='object'&&Array.isArray(before)===Array.isArray(after)){
  if(Array.isArray(before)&&before.length!==after.length){out.push({path,before,after,added:after.filter(v=>!before.some(b=>JSON.stringify(b)===JSON.stringify(v))),removed:before.filter(v=>!after.some(a=>JSON.stringify(a)===JSON.stringify(v)))});return out;}
  for(const key of new Set([...Object.keys(before),...Object.keys(after)]))diffValues(before[key],after[key],[...path,Array.isArray(after)?Number(key):key],out);
 }else out.push({path,before,after});
 return out;
}
export class Workspace{
 constructor(read){this.read=read;this.documents=new Map();this.loading=new Map();this.history=[];this.future=[];this.revision=0;this.output=null;this.listeners=new Set();}
 async load(file){
  if(this.documents.has(file))return this.documents.get(file).value;
  if(!this.loading.has(file))this.loading.set(file,Promise.resolve().then(()=>this.read('config/'+file)).then(text=>{
   const value=typeof text==='string'?parseJSON(text):parseJSON(serialize(text));
   if(!this.documents.has(file))this.documents.set(file,{original:clone(value),value});return this.documents.get(file).value;
  }).finally(()=>this.loading.delete(file)));
  return this.loading.get(file);
 }
 value(file){const doc=this.documents.get(file);if(!doc)throw Error(`設定を読み込んでください: ${file}`);return doc.value;}
 changed(){return [...this.documents].filter(([,d])=>serialize(d.original)!==serialize(d.value)).map(([file])=>file);}
 get dirty(){return this.changed().length>0;}
 subscribe(listener){this.listeners.add(listener);return ()=>this.listeners.delete(listener);}
 signal(){this.revision++;this.output=null;for(const listener of this.listeners)listener();}
 transaction(label,files,edit){
  const unique=[...new Set(files)],before=Object.fromEntries(unique.map(f=>[f,clone(this.value(f))])),after=clone(before);edit(after);
  for(const f of unique){assertJSON(after[f]);after[f]=parseJSON(serialize(after[f]));}
  if(unique.every(f=>serialize(before[f])===serialize(after[f])))return false;
  for(const f of unique)this.documents.get(f).value=after[f];
  this.history.push({label,before,after});if(this.history.length>60)this.history.shift();this.future=[];this.signal();return true;
 }
 set(file,path,value,label){return this.transaction(label,[file],docs=>{docs[file]=put(docs[file],path,value);});}
 replace(file,text){const value=parseJSON(text);return this.set(file,[],value,'JSONファイルの内容を反映');}
 undo(){const edit=this.history.pop();if(!edit)return false;for(const [f,v] of Object.entries(edit.before))this.documents.get(f).value=clone(v);this.future.push(edit);this.signal();return true;}
 redo(){const edit=this.future.pop();if(!edit)return false;for(const [f,v] of Object.entries(edit.after))this.documents.get(f).value=clone(v);this.history.push(edit);this.signal();return true;}
 discard(){const files=this.changed();return this.transaction('変更をすべて破棄',files,docs=>{for(const f of files)docs[f]=clone(this.documents.get(f).original);});}
 differences(){return this.changed().flatMap(file=>diffValues(this.documents.get(file).original,this.value(file)).map(change=>({file,...change})));}
 async validate(validate,checkReferences=()=>[],files=this.changed()){
  const revision=this.revision,snapshot=new Map([...this.documents].map(([f,d])=>[f,clone(d.value)])),errors=[];
  for(const f of files){for(const message of await validate(f,snapshot.get(f))){const pointer=message.match(/^(\/[^:]*):/)?.[1];let cursor=snapshot.get(f);const path=pointer&&pointer!=='/'?pointer.slice(1).split('/').map(part=>{const key=part.replaceAll('~1','/').replaceAll('~0','~');const result=Array.isArray(cursor)?Number(key):key;cursor=cursor?.[result];return result;}):[];errors.push({file:f,path,message});}}
  errors.push(...await checkReferences(snapshot,files));
  if(revision!==this.revision)return {stale:true,errors:[],outputs:[]};
  this.output=errors.length?null:files.map(file=>({file,text:serialize(snapshot.get(file))}));
  return {stale:false,errors,outputs:this.output??[]};
 }
}
export function nextId(collection,prefix='new'){
 const ids=new Set(Array.isArray(collection)?collection.map(v=>v?.id):Object.keys(collection??{}));let i=1;while(ids.has(`${prefix}_${i}`))i++;return `${prefix}_${i}`;
}
export {pathLabel};
