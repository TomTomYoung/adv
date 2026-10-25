import {isRecord} from './expression.js';

const groups=['maps','dungeons','locations','scripts'];
const validId=id=>/^[a-z][a-z0-9_]*$/.test(id)&&!['constructor','prototype','__proto__'].includes(id);
export async function geographyFingerprint(value){
  const bytes=new TextEncoder().encode(JSON.stringify(value));
  return [...new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
}

// Verify every precondition before modifying any collection. Base JSON remains
// the first edition; a stale edition patch is an error, never a best-effort merge.
export async function applyEditionGeography(data,bundle){
  if(!isRecord(bundle)||bundle.schemaVersion!==1||!isRecord(bundle.additions)||!Array.isArray(bundle.patches)||!isRecord(bundle.travel)||Object.keys(bundle).some(k=>!['schemaVersion','additions','patches','travel'].includes(k)))throw Error('版別地理の形式が不正です。');
  const used=new Set();
  for(const [group,entries] of Object.entries(bundle.additions)){
    if(!groups.includes(group)||!isRecord(entries))throw Error('版別地理の追加先が不正です。');
    for(const [id,value] of Object.entries(entries)){
      if(!validId(id)||!isRecord(value)||Object.hasOwn(data[group],id))throw Error(`版別地理の追加ID重複または不正: ${group}/${id}`);
      used.add(`${group}/${id}`);
    }
  }
  for(const patch of bundle.patches){
    if(!isRecord(patch)||Object.keys(patch).some(k=>!['group','id','sha256','value'].includes(k))||!groups.includes(patch.group)||!validId(patch.id)||!isRecord(patch.value)||!Object.hasOwn(data[patch.group],patch.id)||used.has(`${patch.group}/${patch.id}`))throw Error('版別地理の差替え対象が不正または重複しています。');
    if(patch.sha256!==await geographyFingerprint(data[patch.group][patch.id]))throw Error(`版別地理の基点指紋が一致しません: ${patch.group}/${patch.id}`);
    used.add(`${patch.group}/${patch.id}`);
  }
  for(const [group,entries] of Object.entries(bundle.additions))Object.assign(data[group],structuredClone(entries));
  for(const patch of bundle.patches)data[patch.group][patch.id]=structuredClone(patch.value);
  data.worldTravel=structuredClone(bundle.travel);
}
