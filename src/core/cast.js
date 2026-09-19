import {isRecord} from './expression.js';

// Author-controlled presentation data; it never changes a person's story location.
export function placementValid(p,data){
  if(p===undefined)return true;
  if(!isRecord(p)||Object.keys(p).some(k=>!['position','x','y','scale','flip','layer','asset'].includes(k)))return false;
  if(p.position!==undefined&&!['left','center','right'].includes(p.position))return false;
  for(const [key,min,max] of [['x',0,100],['y',-25,50],['scale',.5,1.5],['layer',0,99]])if(p[key]!==undefined&&(!Number.isFinite(p[key])||p[key]<min||p[key]>max))return false;
  return (p.flip===undefined||typeof p.flip==='boolean')&&(p.layer===undefined||Number.isInteger(p.layer))&&(p.asset===undefined||typeof p.asset==='string'&&Object.hasOwn(data.assets.images,p.asset));
}
export function castValid(value,data){
  if(!isRecord(value)||!['stage','cards'].includes(value.mode)||!Array.isArray(value.cast)||value.cast.length>8)return false;
  const ids=new Set();
  return value.cast.every(c=>{
    if(!isRecord(c)||typeof c.character!=='string'||!Object.hasOwn(data.characters,c.character)||ids.has(c.character)||!placementValid(c.display,data))return false;
    ids.add(c.character);return true;
  });
}
