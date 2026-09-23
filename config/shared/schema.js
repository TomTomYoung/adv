// Implements the keywords used by this repository's schemas. Unsupported
// validation keywords fail closed, rather than silently accepting documents.
import {kind,pathLabel} from './model.js';
const keywords=new Set(['$schema','$defs','$ref','title','description','type','const','enum','allOf','anyOf','oneOf','if','then','else','not','minimum','maximum','exclusiveMinimum','exclusiveMaximum','minLength','maxLength','pattern','minItems','maxItems','uniqueItems','items','minProperties','maxProperties','required','properties','propertyNames','additionalProperties']);
const canonical=v=>Array.isArray(v)?v.map(canonical):kind(v)==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const same=(a,b)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function validateSchema(value,schema){
  let budget=300000,exhausted=false;const root=schema,definitionErrors=[],seen=new Set();
  function inspect(s){
    if(typeof s==='boolean'||seen.has(s))return;seen.add(s);
    if(kind(s)!=='object'){definitionErrors.push('検証定義が不正です。');return;}
    for(const k of Object.keys(s))if(!keywords.has(k))definitionErrors.push(`未対応の検証規則 ${k}`);
    if(s.$ref){if(!s.$ref.startsWith('#/'))definitionErrors.push('外部参照はこの検証器では扱えません。');else{let target=root;for(const part of s.$ref.slice(2).split('/'))target=target?.[part.replaceAll('~1','/').replaceAll('~0','~')];if(target===undefined)definitionErrors.push(`参照先がありません: ${s.$ref}`);}}
    for(const k of ['$defs','properties'])for(const child of Object.values(s[k]??{}))inspect(child);
    for(const k of ['allOf','anyOf','oneOf'])for(const child of s[k]??[])inspect(child);
    for(const k of ['not','if','then','else','items','propertyNames','additionalProperties'])if(s[k]!==undefined)inspect(s[k]);
  }
  inspect(root);if(definitionErrors.length)return [...new Set(definitionErrors)];
  function check(v,s,path=[],depth=0){
    if(--budget<0||depth>160){exhausted=true;return [`${pathLabel(path)}: 検証できる複雑さを超えました。`];}
    if(s===true)return [];if(s===false)return [`${pathLabel(path)}: 許可されていない項目です。`];
    const errors=[],fail=text=>errors.push(`${pathLabel(path)}: ${text}`);
    if(!s||typeof s!=='object')return [`${pathLabel(path)}: 検証定義が不正です。`];
    for(const k of Object.keys(s))if(!keywords.has(k))fail(`未対応の検証規則 ${k}`);
    if(s.$ref){if(!s.$ref.startsWith('#/'))fail('外部参照はこの検証器では扱えません。');else{let target=root;for(const part of s.$ref.slice(2).split('/'))target=target?.[part.replaceAll('~1','/').replaceAll('~0','~')];errors.push(...check(v,target,path,depth+1));}}
    if(s.type){const types=Array.isArray(s.type)?s.type:[s.type];if(!types.some(t=>t==='integer'?Number.isInteger(v):t==='number'?typeof v==='number'&&Number.isFinite(v):kind(v)===t)){fail(`型は ${types.join(' / ')} です。`);return errors;}}
    if(Object.hasOwn(s,'const')&&!same(v,s.const)){fail(`値は ${JSON.stringify(s.const)} です。`);return errors;}
    if(s.enum&&!s.enum.some(x=>same(v,x))){fail(`候補: ${s.enum.map(x=>JSON.stringify(x)).join(', ')}`);return errors;}
    if(kind(v)==='object'){
      for(const key of s.required??[])if(!Object.hasOwn(v,key))fail(`必須項目: ${key}`);
      for(const [key,child] of Object.entries(s.properties??{}))if(Object.hasOwn(v,key)&&Object.hasOwn(child,'const')&&!same(v[key],child.const))fail(`${key}: 値は ${JSON.stringify(child.const)} です。`);
      if(errors.length)return errors;
    }
    for(const child of s.allOf??[])errors.push(...check(v,child,path,depth+1));
    for(const key of ['oneOf','anyOf'])if(s[key]){const options=s[key].map(child=>check(v,child,path,depth+1)),matches=options.filter(e=>!e.length).length;if(key==='oneOf'?matches!==1:!matches){fail(key==='oneOf'?'定義のいずれか一つに一致する必要があります。':'定義のいずれかに一致する必要があります。');if(!matches)errors.push(...options.sort((a,b)=>a.length-b.length)[0].slice(0,4));}}
    if(s.not!==undefined&&!check(v,s.not,path,depth+1).length)fail('禁止された組み合わせです。');
    if(s.if!==undefined){const branch=!check(v,s.if,path,depth+1).length?s.then:s.else;if(branch!==undefined)errors.push(...check(v,branch,path,depth+1));}
    if(typeof v==='number')for(const [k,bad] of [['minimum',v<s.minimum],['maximum',v>s.maximum],['exclusiveMinimum',v<=s.exclusiveMinimum],['exclusiveMaximum',v>=s.exclusiveMaximum]])if(s[k]!==undefined&&bad)fail(`${k}: ${s[k]}`);
    if(typeof v==='string'){const n=Array.from(v).length;if(s.minLength!==undefined&&n<s.minLength)fail(`最低${s.minLength}文字です。`);if(s.maxLength!==undefined&&n>s.maxLength)fail(`最大${s.maxLength}文字です。`);if(s.pattern&&!new RegExp(s.pattern,'u').test(v))fail(`形式: ${s.pattern}`);}
    if(Array.isArray(v)){if(s.minItems!==undefined&&v.length<s.minItems)fail(`最低${s.minItems}件必要です。`);if(s.maxItems!==undefined&&v.length>s.maxItems)fail(`最大${s.maxItems}件です。`);if(s.uniqueItems&&new Set(v.map(x=>JSON.stringify(canonical(x)))).size!==v.length)fail('重複した値があります。');if(s.items!==undefined)v.forEach((x,i)=>errors.push(...check(x,s.items,[...path,i],depth+1)));}
    if(kind(v)==='object'){
      const keys=Object.keys(v);if(s.minProperties!==undefined&&keys.length<s.minProperties)fail(`最低${s.minProperties}項目です。`);if(s.maxProperties!==undefined&&keys.length>s.maxProperties)fail(`最大${s.maxProperties}項目です。`);
      for(const k of s.required??[])if(!Object.hasOwn(v,k))fail(`必須項目: ${k}`);
      for(const k of keys){if(s.propertyNames!==undefined)errors.push(...check(k,s.propertyNames,[...path,k],depth+1));const child=Object.hasOwn(s.properties??{},k)?s.properties[k]:s.additionalProperties;if(child!==undefined)errors.push(...check(v[k],child,[...path,k],depth+1));}
    }
    return errors.slice(0,60);
  }
  const errors=check(value,root);if(exhausted)errors.unshift('検証できる複雑さを超えました。');return [...new Set(errors)];
}
