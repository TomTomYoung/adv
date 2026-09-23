// JSON-only editing. Paths are key arrays, never executable expressions.
const reserved=new Set(['__proto__','prototype','constructor']);
export const kind=value=>value===null?'null':Array.isArray(value)?'array':typeof value;
export const pathLabel=path=>path.length?'/'+path.map(p=>String(p).replaceAll('~','~0').replaceAll('/','~1')).join('/'):'/';
export function parseJSON(text){
  if(typeof text!=='string'||text.length>5_000_000||new TextEncoder().encode(text).byteLength>5_000_000)throw Error('JSONは5MB以内で読み込んでください。');
  let i=0;const fail=message=>{throw Error(`${message}（${i+1}文字目）`);},space=()=>{while(/[\t\n\r ]/.test(text[i]??'x'))i++;};
  function string(){const start=i++;while(i<text.length){const c=text[i++];if(c==='"'){try{return JSON.parse(text.slice(start,i));}catch{fail('文字列が不正です');}}if(c==='\\')i++;}fail('文字列が閉じられていません');}
  function value(depth=0){
    if(depth>100)fail('入れ子が深すぎます');space();const c=text[i];
    if(c==='"')return string();
    if(c==='{'||c==='['){
      i++;const array=c==='[',out=array?[]:{},keys=new Set(),end=array?']':'}';space();if(text[i]===end){i++;return out;}
      while(i<text.length){space();let key;
        if(!array){if(text[i]!=='"')fail('項目名を文字列で指定してください');key=string();if(keys.has(key))fail(`項目名が重複しています: ${key}`);if(reserved.has(key))fail(`予約された項目名です: ${key}`);keys.add(key);space();if(text[i++]!==':')fail('コロンが必要です');}
        const v=value(depth+1);if(array)out.push(v);else out[key]=v;space();if(text[i]===end){i++;return out;}if(text[i++]!==',')fail('カンマが必要です');
      }fail('配列・オブジェクトが閉じられていません');
    }
    for(const [word,v] of [['true',true],['false',false],['null',null]])if(text.startsWith(word,i)){i+=word.length;return v;}
    const token=text.slice(i).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/)?.[0];if(!token)fail('値が不正です');i+=token.length;const n=Number(token);
    if(!Number.isFinite(n)||(n===0&&/[1-9]/.test(token.split(/[eE]/)[0]))||Number.isInteger(n)&&!Number.isSafeInteger(n))fail('精度を維持できない数値です');return n;
  }
  const result=value();space();if(i!==text.length)fail('JSONの後に余分な文字があります');return result;
}
export const serialize=value=>JSON.stringify(value,null,2)+'\n';
export function at(value,path){for(const key of path){if(reserved.has(String(key))||!value||!Object.hasOwn(value,key))throw Error('編集位置がありません。');value=value[key];}return value;}
export class JSONDocument{
  constructor(text){this.value=parseJSON(text);this.original=serialize(this.value);this.history=[];this.revision=0;this.output=null;}
  get dirty(){return serialize(this.value)!==this.original;}
  mutate(edit){const next=structuredClone(this.value);const result=edit(next);const value=result===undefined?next:result;if(serialize(value)===serialize(this.value))return false;this.history.push(this.value);if(this.history.length>30)this.history.shift();this.value=value;this.revision++;this.output=null;return true;}
  replace(path,value){return this.mutate(next=>{if(!path.length)return structuredClone(value);const parent=at(next,path.slice(0,-1));at(next,path);parent[path.at(-1)]=structuredClone(value);});}
  add(path,key,value){return this.mutate(next=>{const parent=at(next,path);if(Array.isArray(parent)){if(!Number.isInteger(key)||key<0||key>parent.length)throw Error('挿入位置が不正です。');parent.splice(key,0,structuredClone(value));}else{if(kind(parent)!=='object'||!key||reserved.has(key)||Object.hasOwn(parent,key))throw Error('新しい項目名を指定してください。');parent[key]=structuredClone(value);}});}
  remove(path){if(!path.length)throw Error('文書全体は削除できません。');return this.mutate(next=>{const parent=at(next,path.slice(0,-1));at(next,path);if(Array.isArray(parent))parent.splice(path.at(-1),1);else delete parent[path.at(-1)];});}
  move(path,delta){return this.mutate(next=>{const parent=at(next,path.slice(0,-1)),i=path.at(-1),to=i+delta;if(!Array.isArray(parent)||!Number.isInteger(i)||![-1,1].includes(delta)||to<0||to>=parent.length)throw Error('移動先がありません。');[parent[i],parent[to]]=[parent[to],parent[i]];});}
  undo(){if(!this.history.length)return false;this.value=this.history.pop();this.revision++;this.output=null;return true;}
  async validate(validator){const revision=this.revision,value=structuredClone(this.value),errors=await validator(value);if(revision!==this.revision)return {stale:true,errors:[]};this.output=errors.length?null:serialize(value);return {stale:false,errors};}
}
