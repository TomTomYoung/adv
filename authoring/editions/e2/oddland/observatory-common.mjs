import {set,give,ref,eq,and} from '../../../story-kit.mjs';
export function observatorySource(q){
 const x={nodes:structuredClone(q.model.graph),places:{},flags:{},registry:{},entities:{}};
 for(const n of x.nodes)n.place='entry';
 const node=id=>x.nodes.find(n=>n.id===id),choice=(id,key)=>node(id).options.find(a=>a.id===key);
 const town=(key,name,location)=>x.places[key]={name,world:{kind:'town',location}};
 const cell=(key,name,floor,xp,yp)=>x.places[key]={name,world:{kind:'dungeon',dungeon:'region_9',map:'region_9_f'+floor,x:xp,y:yp}};
 const field=(key,name,map,xp,yp)=>x.places[key]={name,world:{kind:'dungeon',dungeon:map==='rescue'?'observatory_rescue':'observatory_sites',map:'e2_observatory_'+map,x:xp,y:yp}};
 const entity=(id,holder,kind='item')=>x.entities[id]={holder,kind};
 const opt=(id,text,to,extra={})=>({id,text,to,...extra});
 const add=(id,place,text,options)=>{const n={id,place,text,options};x.nodes.push(n);return n;};
 const route=(from,key,to,extra={})=>Object.assign(choice(from,key),{to,...extra});
 const end=(id,place,text,outcome,effects=[])=>add(id,place,text,[opt('finish','相手と結果を確かめ、依頼を終える','@'+outcome,{effects})]);
 const v=key=>ref(`stories.${q.id}.values.${key}`);
 const transfer=(id,from,to)=>({...give(id,from,to),when:eq(v(id+'At'),from)});
 const int=(key,max)=>x.registry[key]={type:'integer',initial:0,min:0,max,meaning:key};
 const finish=()=>{
  const rewrite=value=>{
   if(typeof value==='string')return value.replaceAll('$truth',q.model.reveal.newInformation);
   if(Array.isArray(value))return value.map(rewrite);
   if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,a])=>[key,key==='ref'?a.replace(`flags.quest.${q.id}.`,`stories.${q.id}.values.`).replace(`flags.flow.${q.id}.`,`stories.${q.id}.values.`):rewrite(a)]));return value;
  };
  for(const n of x.nodes){n.text=rewrite(n.text);for(const a of n.options){
   for(const [key,value] of Object.entries(a.set??{})){if(!x.registry[key])x.flags[key]??=false;(a.effects??=[]).push(set(key,rewrite(value)));}delete a.set;
   for(const e of [...(a.effects??[]),...(a.preparation??[]),...(a.depart??[])])if(e.op==='set'&&!x.registry[e.key])x.flags[e.key]??=false;
   a.when=rewrite(a.when);a.visible=rewrite(a.visible);if(a.need?.length)a.when=and(a.when??true,...a.need.map(key=>eq(v(key),true)));delete a.need;
  }}
  x.places={entry:x.places.entry,...x.places};return x;
 };
 return {x,node,choice,town,cell,field,entity,opt,add,route,end,v,transfer,int,finish};
}
