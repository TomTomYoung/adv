import {librarySource} from './library-common.mjs';
export function machineSource(q){
 const h=librarySource(q),{x}=h;
 const cell=(key,name,floor,xp,yp)=>x.places[key]={name,world:{kind:'dungeon',dungeon:'region_8',map:'region_8_f'+floor,x:xp,y:yp}};
 const field=(key,name,map,xp,yp)=>x.places[key]={name,world:{kind:'dungeon',dungeon:'salome_road',map:'e2_salome_'+map,x:xp,y:yp}};
 const p=q.locations.find(p=>p.role==='decision');cell('entry',q.title+'の現場受付',p.map.endsWith('f1')?1:2,p.x,p.y);
 return {...h,cell,field};
}
