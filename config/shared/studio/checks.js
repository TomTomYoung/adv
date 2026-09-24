import {EditorContext} from './context.js';
import {collectReferences} from './references.js';
import {get,pathLabel} from './workspace.js';
import {recordSchemas} from './supplemental.js';
import {validateSchema} from '../schema.js';
export function checkWorkspace(snapshot,files,base,schemas){
 const fake={documents:new Map([...snapshot].map(([f,value])=>[f,{value}])),value:f=>snapshot.get(f)},context=new EditorContext(fake,null,base),errors=[];
 const existingGaps=new Set((base.unresolvedReferences??[]).map(r=>JSON.stringify(r)));
 const fail=(file,path,message)=>errors.push({file,path,message:`${pathLabel(path)}: ${message}`});
 const references=[...(base.references??[]).filter(r=>!snapshot.has(r.file)),...[...snapshot].flatMap(([file,value])=>collectReferences(value,file))];
 const deleted=new Set(Object.entries(base.owners??{}).filter(([,o])=>snapshot.has(o.file)&&(o.id?get(snapshot.get(o.file),o.path)?.id!==o.id:get(snapshot.get(o.file),o.path)===undefined)).map(([key])=>key));
 for(const r of references){if(!files.includes(r.file)&&!deleted.has(r.kind+'/'+r.id))continue;if(!Object.hasOwn(context.names(r.kind),r.id)&&!existingGaps.has(JSON.stringify(r)))fail(r.file,r.path,`参照先がありません：${r.id}`);}
 const maps=context.maps(),cellSource=snapshot.get('cell-layers.json');
 for(const file of files){const value=snapshot.get(file);if(!value)continue;
  function walk(v,path=[]){if(!v||typeof v!=='object')return;
   if(typeof v.map==='string'&&Number.isInteger(v.x)&&Number.isInteger(v.y)){
    const meta=maps[v.map],map=meta?.owner&&snapshot.has(meta.owner.file)?get(snapshot.get(meta.owner.file),meta.owner.path):null;
    const rows=cellSource?.maps?.[v.map]?.rows??map?.tiles,width=rows?.[0]?.length??meta?.width,height=rows?.length??meta?.height;
    if(width!==undefined&&(v.x<0||v.y<0||v.x>=width||v.y>=height))fail(file,path,'配置地点がマップの範囲外です。');
   }
   if(v.a?.map&&v.b?.map&&v.a.map===v.b.map&&v.a.x===v.b.x&&v.a.y===v.b.y)fail(file,path,'接続口AとBが同じ地点です。');
   for(const key of ['materials','harvest','immatureHarvest','supplies','output'])if(v[key]&&typeof v[key]==='object')for(const [id,count] of Object.entries(v[key]))if(!Number.isInteger(count)||count<1)fail(file,[...path,key,id],'個数は1以上の整数です。');
   for(const [key,child] of Object.entries(v))walk(child,[...path,Array.isArray(v)?Number(key):key]);
  }walk(value);
  for(const [key,kind] of [['items','item'],['skills','skill'],['monsters','monster'],['enemies','monster'],['actors','actor']]){
   for(const [id,record] of Object.entries(value[key]??{})){const schema=recordSchemas[kind];for(const message of validateSchema(record,{$defs:schemas.get(file)?.$defs??{},...schema}))fail(file,[key,Array.isArray(value[key])?Number(id):id],message);}
  }
  if(file==='cell-layers.json')for(const [id,c] of Object.entries(value.maps??{})){
   const meta=maps[id],map=meta?.owner&&snapshot.has(meta.owner.file)?get(snapshot.get(meta.owner.file),meta.owner.path):null;
   const width=map?.tiles?.[0]?.length??meta?.width,height=map?.tiles?.length??meta?.height;
   if(width!==undefined&&(c.rows.length!==height||c.rows.some(row=>row.length!==width)))fail(file,['maps',id],'セル配置とマップ原稿の寸法が違います。');
  }
  if(file==='presentation.json')for(const [id,sound] of Object.entries(value.sounds)){if(!['pluck','bell','flute','pulse','pad','bass','kick','snare','hat'].includes(sound.instrument))fail(file,['sounds',id,'instrument'],'音色を候補から選んでください。');if(!sound.notes.length)fail(file,['sounds',id,'notes'],'音符を1つ以上指定してください。');const pitch=({kick:36,snare:38,hat:42})[sound.instrument];if(pitch!==undefined)for(const [i,note] of sound.notes.entries())if(note.pitch!==pitch)fail(file,['sounds',id,'notes',i,'pitch'],`この打楽器の音高は${pitch}です。`);}
  if(file==='catalog-q011-q020.json')for(const [i,q] of value.entries()){const targets=new Set([...(q.nodes??[]).map(n=>n.id),...Object.keys(q.outcomes??{}).map(id=>'@'+id)]);for(const [n,node] of (q.nodes??[]).entries())for(const [o,option] of (node.options??[]).entries())if(option.to&&!targets.has(option.to))fail(file,[i,'nodes',n,'options',o,'to'],'移動先の場面または結末がありません。');}
 }
 return errors;
}
export function costWarnings(value,context){
 const warnings=[];
 function walk(v){if(!v||typeof v!=='object')return;if(v.condition&&Array.isArray(v.commands)){
  const held=new Map();function conditions(c){if(c?.op==='has_item')held.set(c.item,c.count??1);if(c?.op==='and')c.args?.forEach(conditions);}conditions(v.condition);
  for(const c of v.commands)if(c.op==='item.take'&&typeof c.item==='string'&&typeof(c.count??1)==='number'&&held.has(c.item)&&held.get(c.item)<(c.count??1))warnings.push(`${v.text??'条件付き処理'}：${context.name('items',c.item)}の所持条件は${held.get(c.item)}個、消費は${c.count??1}個です。`);
 }for(const child of Object.values(v))walk(child);}walk(value);return warnings;
}
