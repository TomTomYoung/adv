import {createHash} from 'node:crypto';
import {proseKeys} from '../authoring/narration.mjs';
// Only Japanese prose leaves are masked. Keys, arrays, references, commands,
// numerical rewards, requirements and story-state operations remain exact.
export function withoutProse(v,key=''){
 if(typeof v==='string')return proseKeys.has(key)&&/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(v)?'<narration>':v;
 if(Array.isArray(v))return v.map(x=>withoutProse(x,key));
 if(v&&typeof v==='object')return Object.fromEntries(Object.keys(v).sort().map(k=>[k,withoutProse(v[k],k)]));
 return v;
}
export const structureHash=v=>createHash('sha256').update(JSON.stringify(withoutProse(v))).digest('hex');
