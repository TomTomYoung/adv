import {editors} from './catalog.js';
import {JSONDocument,parseJSON,serialize,kind,at,pathLabel} from './model.js';
import {createValidator,browserRead} from './validation.js';
const node=(tag,text='',className='')=>{const n=document.createElement(tag);n.textContent=text;if(className)n.className=className;return n;};
const button=(text,action,className='')=>{const b=node('button',text,className);b.type='button';b.addEventListener('click',action);return b;};
export function mountEditor(root,entry,{read=browserRead,validate=createValidator(read),clipboard=globalThis.navigator?.clipboard,confirm=message=>globalThis.confirm(message)}={}){
 let doc=null,path=[],page=0,rawPath=null,rawChanged=false,pending=0,loadSequence=0;const inputErrors=new Map();
 const title=node('h1',entry.title),filename=node('p',`config/${entry.file}`,'path'),hint=node('p',entry.hint,'intro');
 const status=node('p','読み込み中…','status');status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const dirty=node('span','','');dirty.id='dirty';
 const fields=node('div'),breadcrumbs=node('nav','','breadcrumbs');breadcrumbs.setAttribute('aria-label','編集位置');
 const output=node('section','','output');output.hidden=true;const outputText=node('textarea');outputText.readOnly=true;outputText.rows=16;outputText.setAttribute('aria-label','検証済みの全JSON');
 const copy=button('全JSONをコピー',async()=>{if(!doc?.output||inputErrors.size||rawChanged)return;outputText.value=doc.output;try{if(!clipboard?.writeText)throw Error('clipboard unavailable');await clipboard.writeText(doc.output);message('全JSONをコピーしました。対応するJSONファイルへ貼り付けてください。');}catch{outputText.focus();outputText.select?.();outputText.setSelectionRange?.(0,outputText.value.length);message('自動コピーを利用できません。選択した全JSONをCtrl+C（Macは⌘C）でコピーしてください。');}},'primary');
 output.append(node('h2','検証済みの全JSON'),node('p',`貼り付け先: config/${entry.file}`,'path'),copy,outputText);
 const raw=node('section','','raw-panel');raw.hidden=true;const rawTitle=node('h2'),rawText=node('textarea');rawText.rows=14;rawText.setAttribute('aria-label','JSON編集');rawText.addEventListener('input',()=>{rawChanged=true;invalidate();});
 const rawApply=button('JSON編集を反映',()=>{try{const value=parseJSON(rawText.value);doc.replace(rawPath,value);rawChanged=false;raw.hidden=true;rawPath=null;path=[];page=0;inputErrors.clear();render();message('JSON編集を反映しました。検証して出力できます。');}catch(e){message(e.message,true);}});
 const rawClose=button('変更せず閉じる',()=>{rawChanged=false;raw.hidden=true;rawPath=null;render();});raw.append(rawTitle,rawText,rawApply,rawClose);
 const check=button('検証して全JSONを出力',async()=>{
  if(!doc||inputErrors.size||rawChanged){message('入力中の不正な値を直すか、JSON編集を反映してください。',true);return;}
  const target=doc,epoch=++pending;check.disabled=true;message('形式・数値・ファイル内の整合を検証しています…');
  try{const result=await target.validate(value=>validate(entry,value));if(epoch!==pending||target!==doc||result.stale||inputErrors.size||rawChanged){target.output=null;message('検証中に変更されました。もう一度検証してください。');return;}
   if(result.errors.length){message(result.errors.join('\n'),true);output.hidden=true;return;}
   outputText.value=doc.output;output.hidden=false;copy.disabled=false;message('形式とファイル内の整合を検証しました。全JSONをコピーできます。');
  }catch(e){target.output=null;output.hidden=true;message(`検証に失敗しました: ${e.message}`,true);}finally{check.disabled=!doc||inputErrors.size>0||rawChanged;}
 },'primary');
 const undo=button('一つ戻す',()=>{if(doc?.undo()){path=[];page=0;inputErrors.clear();rawChanged=false;raw.hidden=true;render();message('直前の変更を戻しました。');}});
 const reload=button('元のJSONを再読込',()=>{if(!doc?.dirty&&!rawChanged&&!inputErrors.size||confirm('編集内容を破棄し、元のJSONを読み込み直しますか？'))load();});
 const rawWhole=button('全JSONを直接編集',()=>openRaw([]));
 const toolbar=node('div','','toolbar');toolbar.append(check,undo,reload,rawWhole,dirty);
 const importer=node('label','JSONファイルを読み込む ','file-input'),file=node('input');file.type='file';file.accept='.json,application/json';file.addEventListener('change',async()=>{const selected=file.files?.[0];if(!selected)return;if((doc?.dirty||rawChanged||inputErrors.size)&&!confirm('現在の編集内容を置き換えますか？')){file.value='';return;}const sequence=++loadSequence,epoch=pending;try{const text=await selected.text(),next=new JSONDocument(text);if(sequence!==loadSequence)return;if(epoch!==pending){message('読込中の編集内容を保持しました。ファイルをもう一度選んでください。');return;}adopt(next);message('ファイルを読み込みました。出力前に検証してください。');}catch(e){message(`読み込めません: ${e.message}`,true);}file.value='';});importer.append(file);
 root.replaceChildren(node('p','JSON EDITOR','eyebrow'),title,filename,hint,toolbar,importer,status,breadcrumbs,fields,raw,output,node('p','検証対象は形式・数値とこのファイル内の整合です。別ファイルのID・画像・生成結果との整合は、反映して再生成した後のプロジェクト検証で確認してください。','validation-note'));
 function message(text,error=false){status.textContent=text;status.className='status'+(error?' error':'');}
 function invalidate(){pending++;if(doc)doc.output=null;output.hidden=true;outputText.value='';copy.disabled=true;check.disabled=!doc||inputErrors.size>0||rawChanged;dirty.textContent=doc?.dirty||rawChanged?'変更あり':'変更なし';undo.disabled=!doc?.history.length;rawWhole.disabled=!doc;}
 function openRaw(target){if(!doc)return;if(inputErrors.size){message('不正な入力を直してからJSON編集を開いてください。',true);return;}if(rawChanged&&!confirm('入力中のJSON編集を破棄しますか？'))return;rawPath=target;rawChanged=false;rawTitle.textContent=`JSON編集: ${pathLabel(target)}`;rawText.value=serialize(at(doc.value,target));raw.hidden=false;fields.inert=true;breadcrumbs.inert=true;rawText.focus();}
 function change(edit){if(inputErrors.size){message('不正な入力を直してから操作してください。',true);return;}try{edit();inputErrors.clear();invalidate();render();}catch(e){message(e.message,true);}}
 function field(key,value,target,array=false){
  const row=node('div','','field'),label=node('label','','field-label'),id='value-'+encodeURIComponent(JSON.stringify(target));label.textContent=String(key);label.append(node('small',kind(value)));label.htmlFor=id;row.append(label);
  if(value!==null&&typeof value==='object'){const detail=node('div','','subtree');detail.append(node('span',`${Object.keys(value).length}項目${value.name?' / '+value.name:value.title?' / '+value.title:''}`),button('詳細を開く',()=>{if(inputErrors.size){message('不正な入力を直してから移動してください。',true);return;}path=target;page=0;render();}));row.append(detail);}
  else if(value===null)row.append(node('span','null'));
  else{
   const input=node(typeof value==='string'?'textarea':'input');input.id=id;input.setAttribute('aria-label',pathLabel(target));if(typeof value==='boolean'){input.type='checkbox';input.checked=value;}else if(typeof value==='number'){input.type='number';input.step='any';input.value=String(value);}else{input.value=value;input.rows=Math.min(6,Math.max(2,value.split('\n').length));}
   input.addEventListener('input',()=>{try{let next;if(typeof value==='boolean')next=input.checked;else if(typeof value==='number'){if(!input.value.trim())throw Error('数値を入力してください。');next=parseJSON(input.value);if(typeof next!=='number')throw Error('数値を入力してください。');}else next=input.value;doc.replace(target,next);inputErrors.delete(id);input.removeAttribute?.('aria-invalid');message('変更しました。検証して出力できます。');}catch(e){inputErrors.set(id,e.message);input.setAttribute('aria-invalid','true');message(`${pathLabel(target)}: ${e.message}`,true);}invalidate();});row.append(input);
  }
  const actions=node('div','','row-actions');actions.append(button('型・JSON',()=>openRaw(target)));
  if(target.length){if(array){const i=Number(key),values=at(doc.value,target.slice(0,-1));const up=button('上へ',()=>change(()=>doc.move(target,-1))),down=button('下へ',()=>change(()=>doc.move(target,1)));up.disabled=i===0;down.disabled=i===values.length-1;actions.append(up,down);}actions.append(button('削除',()=>{if(confirm(`${pathLabel(target)}を削除しますか？`))change(()=>doc.remove(target));},'danger'));}row.append(actions);return row;
 }
 function render(){
  if(!doc)return;fields.inert=!raw.hidden;breadcrumbs.inert=!raw.hidden;invalidate();try{at(doc.value,path);}catch{path=[];}breadcrumbs.replaceChildren();for(let i=0;i<=path.length;i++)breadcrumbs.append(button(i?String(path[i-1]):'文書全体',()=>{if(inputErrors.size){message('不正な入力を直してから移動してください。',true);return;}path=path.slice(0,i);page=0;render();}));fields.replaceChildren(node('p',pathLabel(path),'path'));
  const current=at(doc.value,path);if(!current||typeof current!=='object'){fields.append(field(path.at(-1)??'値',current,path));return;}
  const entries=Object.entries(current);page=Math.min(page,Math.max(0,Math.ceil(entries.length/60)-1));for(const [key,v] of entries.slice(page*60,page*60+60))fields.append(field(key,v,[...path,Array.isArray(current)?Number(key):key],Array.isArray(current)));
  if(entries.length>60){const pager=node('div','','pager'),prev=button('前の60件',()=>{if(inputErrors.size)return message('不正な入力を直してから移動してください。',true);page--;render();}),next=button('次の60件',()=>{if(inputErrors.size)return message('不正な入力を直してから移動してください。',true);page++;render();});prev.disabled=page===0;next.disabled=(page+1)*60>=entries.length;pager.append(prev,node('span',`${page*60+1}〜${Math.min((page+1)*60,entries.length)} / ${entries.length}件`),next);fields.append(pager);}
  const add=node('div','','add-row'),keyLabel=node('label',Array.isArray(current)?'挿入位置（0から）':'新しい項目名'),keyInput=node('input'),valueLabel=node('label','追加する値（JSON）'),valueInput=node('textarea');keyInput.value=Array.isArray(current)?String(current.length):'';keyInput.type=Array.isArray(current)?'number':'text';valueInput.value='""';valueInput.rows=2;keyLabel.append(keyInput);valueLabel.append(valueInput);add.append(keyLabel,valueLabel,button('項目を追加',()=>change(()=>{if(Array.isArray(current)&&!keyInput.value.trim())throw Error('挿入位置を入力してください。');doc.add(path,Array.isArray(current)?Number(keyInput.value):keyInput.value,parseJSON(valueInput.value));})));fields.append(add);
 }
 function adopt(next){doc=next;path=[];page=0;pending++;inputErrors.clear();rawChanged=false;raw.hidden=true;render();}
 async function load(){const sequence=++loadSequence,epoch=pending;message('元のJSONを読み込んでいます…');try{const source=await read(`config/${entry.file}`);if(sequence!==loadSequence)return;if(epoch!==pending){message('読込中の編集内容を保持しました。再読込する場合はもう一度選んでください。');return;}adopt(new JSONDocument(typeof source==='string'?source:serialize(source)));message('JSONを読み込みました。項目の値を変更できます。');}catch(e){message(`読込に失敗しました: ${e.message}\n再読込、またはJSONファイルの読み込みをお試しください。`,true);check.disabled=!doc;}}
 invalidate();const ready=load();return {ready,get document(){return doc;},get dirty(){return Boolean(doc?.dirty||rawChanged||inputErrors.size);},get status(){return status.textContent;}};
}
if(typeof document!=='undefined'&&document.body?.dataset.config){
 const entry=editors.find(e=>e.file===document.body.dataset.config),root=document.getElementById('editor');
 if(!entry)root.textContent='この設定の編集ページは登録されていません。';else{const app=mountEditor(root,entry);window.addEventListener('beforeunload',event=>{if(app.dirty){event.preventDefault();event.returnValue='';}});}
}
