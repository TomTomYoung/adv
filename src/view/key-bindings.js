// Logical actions and browser-local input settings; no game state or intents.
export const KEY_ACTIONS=Object.freeze([
  {id:'confirm',name:'決定／探索では調べる',group:'共通操作',required:true,keys:['Enter','Space']},
  {id:'cancel',name:'キャンセル',group:'共通操作',required:true,keys:['Escape',null]},
  {id:'up',name:'上／探索では前進',group:'共通操作',required:true,keys:['ArrowUp',null]},
  {id:'down',name:'下／探索では後退',group:'共通操作',required:true,keys:['ArrowDown',null]},
  {id:'left',name:'左／探索では左を向く',group:'共通操作',required:true,keys:['ArrowLeft',null]},
  {id:'right',name:'右／探索では右を向く',group:'共通操作',required:true,keys:['ArrowRight',null]},
  {id:'forward',name:'前進',group:'探索の補助キー',keys:['KeyW',null]},
  {id:'backward',name:'後退',group:'探索の補助キー',keys:['KeyS',null]},
  {id:'turnLeft',name:'左へ向く',group:'探索の補助キー',keys:['KeyA',null]},
  {id:'turnRight',name:'右へ向く',group:'探索の補助キー',keys:['KeyD',null]},
  {id:'inspect',name:'調べる',group:'探索の補助キー',keys:['KeyE',null]}
].map(a=>Object.freeze({...a,keys:Object.freeze(a.keys)})));
export const DEFAULT_BINDINGS=Object.freeze(Object.fromEntries(KEY_ACTIONS.map(a=>[a.id,a.keys])));
export const NAVIGATION_KEYS=Object.freeze({up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight'});
const labels={Enter:'Enter',Space:'Space',Escape:'Esc',ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→',Backspace:'Backspace',Home:'Home',End:'End',PageUp:'PageUp',PageDown:'PageDown',Minus:'−',Equal:'＝',BracketLeft:'［',BracketRight:'］',Backslash:'\\',Semicolon:'；',Quote:'引用符',Comma:'，',Period:'．',Slash:'／',Backquote:'バッククォート',IntlYen:'円記号',IntlRo:'ろキー'};
export const keyLabel=code=>code===null?'未設定':labels[code]??(/^(Key|Digit)/.test(code)?code.replace(/^(Key|Digit)/,''):code);
export const supportedKey=code=>typeof code==='string'&&(/^(Key[A-Z]|Digit[0-9])$/.test(code)||Object.hasOwn(labels,code));
export const copyBindings=bindings=>Object.fromEntries(KEY_ACTIONS.map(a=>[a.id,[...bindings[a.id]]]));
export function eventCode(event){
  if(event.code)return event.code==='NumpadEnter'?'Enter':event.code;
  const key=event.key;if(key===' '||key==='Spacebar')return 'Space';
  if(/^[a-z]$/i.test(key??''))return `Key${key.toUpperCase()}`;
  if(/^[0-9]$/.test(key??''))return `Digit${key}`;
  return key;
}
export function validateBindings(bindings){
  if(!bindings||typeof bindings!=='object')return 'キー設定の形式が不正です。';
  const used=new Map();
  for(const action of KEY_ACTIONS){
    const keys=bindings[action.id];
    if(!Array.isArray(keys)||keys.length!==2)return `${action.name}の割り当てが不正です。`;
    if(action.required&&!keys.some(Boolean))return `${action.name}には一つ以上のキーが必要です。`;
    for(const code of keys){
      if(code===null)continue;
      if(!supportedKey(code))return 'このキーは割り当てできません。文字・数字・矢印などの単独キーを選んでください。';
      if(code==='Escape'&&action.id!=='cancel')return 'Escはキャンセル用に残します。';
      if(used.has(code))return `${keyLabel(code)}は「${used.get(code)}」に割り当て済みです。先に変更または解除してください。`;
      used.set(code,action.name);
    }
  }
  return null;
}
export function readKeyConfig(raw){
  const invalid=raw!==undefined&&(raw?.version!==1||Boolean(validateBindings(raw?.bindings)));
  return {config:{version:1,bindings:copyBindings(raw===undefined||invalid?DEFAULT_BINDINGS:raw.bindings)},recovered:invalid};
}
export function changeBinding(bindings,id,slot,code){
  if(!KEY_ACTIONS.some(a=>a.id===id)||![0,1].includes(slot))return {ok:false,error:'変更する操作が不正です。'};
  if(code!==null){const owner=KEY_ACTIONS.find(a=>bindings[a.id].some((key,index)=>key===code&&(a.id!==id||index!==slot)));if(owner)return {ok:false,error:`${keyLabel(code)}は「${owner.name}」に割り当て済みです。先に変更または解除してください。`};}
  const next=copyBindings(bindings);next[id][slot]=code;const error=validateBindings(next);
  return error?{ok:false,error}:{ok:true,bindings:next};
}
export function keyAction(event,bindings=DEFAULT_BINDINGS){
  if(event.ctrlKey||event.metaKey||event.altKey||event.shiftKey||event.isComposing||['Process','Dead'].includes(event.key))return null;
  const code=eventCode(event);if(code==='Escape')return 'cancel';
  return KEY_ACTIONS.find(a=>bindings[a.id]?.includes(code))?.id??null;
}
export const bindingLabel=(bindings,id)=>bindings[id].filter(Boolean).map(keyLabel).join(' / ');
export const inputHint=(bindings=DEFAULT_BINDINGS,exploring=false)=>`${bindingLabel(bindings,'confirm')} ${exploring?'調べる':'決定'} · ${['up','down','left','right'].map(id=>bindingLabel(bindings,id)).join(' ')} ${exploring?'移動・方向転換':'選択'} · ${bindingLabel(bindings,'cancel')}${bindings.cancel.includes('Escape')?'':' / Esc'} 戻る`;
