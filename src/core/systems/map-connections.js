import {validateConnections} from '../connection-geometry.js';
import {object,available} from './common.js';
import {compartmentBlocked} from './compartment-water.js';

export const opposite={north:'south',south:'north',east:'west',west:'east'};
export function connectionSide(link,map){return link.a.map===map?{from:link.a,to:link.b}:link.b.map===map?{from:link.b,to:link.a}:null;}
export function connectionPlan(ctx,intent){
  const link=ctx.spec.links.find(l=>l.id===intent.target),side=link&&connectionSide(link,ctx.state.location.map),loc=ctx.state.location;
  if(!side||loc.x!==side.from.x||loc.y!==side.from.y)return {ok:false,reason:'接続口まで歩いて移動する。'};
  const reason=compartmentBlocked(ctx.data,ctx.state,side.to.map);
  if(reason)return {ok:false,reason};
  const map=ctx.data.maps[side.to.map],p=side.to;
  if(!ctx.canOccupy(map,p.x,p.y))return {ok:false,reason:'接続先の足場が塞がれている。'};
  return {ok:true,link,...side};
}
export function connectionMove(data,state,direction){
  const d=data.dungeons?.[state.dungeons?.active?.id],loc=state.location;
  if(!d||!loc)return null;
  for(const [id,spec] of Object.entries(d.systems))if(spec.use==='map_connections'&&spec.enabled!==false){
    const link=spec.links.find(l=>{const s=connectionSide(l,loc.map);return s&&s.from.x===loc.x&&s.from.y===loc.y&&(direction===null||s.from.side===direction);});
    if(link)return {type:'dungeon.action',system:id,action:'cross',target:link.id};
  }
  return null;
}
export function connectionSurfaces(data,state){
  const d=data.dungeons?.[state.dungeons?.active?.id],loc=state.location,boundaries={},doors={};
  if(!d||!loc)return {boundaries,doors};
  for(const spec of Object.values(d.systems))if(spec.use==='map_connections'&&spec.enabled!==false)for(const link of spec.links){
    const s=connectionSide(link,loc.map);if(!s?.from.side)continue;
    const key=`${s.from.x},${s.from.y}/${s.from.side}`;
    boundaries[key]=true;doors[key]={kind:link.kind,name:link.name,closed:Boolean(compartmentBlocked(data,state,s.to.map)),destination:data.maps[s.to.map].name};
  }
  return {boundaries,doors};
}
export const mapConnections={
  createPersistent:()=>({}),createRun:()=>({}),
  plan(ctx,intent){return intent.action==='cross'?connectionPlan(ctx,intent):{ok:false,reason:'接続口の操作が不正。'};},
  act(ctx,_intent,p){
    const {engine}=ctx,map=ctx.data.maps[p.to.map];
    if(!engine.walkable(map,p.to.x,p.to.y)){engine.notify('接続先の足場が塞がれている。');return;}
    engine.teleport(p.to.map,p.to.x,p.to.y,p.to.facing??opposite[p.to.side]??'north');
    engine.notify(`${map.name}へ移動した。`);
    engine.finishMove({x:p.to.x,y:p.to.y});
  },
  project(ctx){
    const loc=ctx.state.location,links=ctx.spec.links.map(l=>({link:l,side:connectionSide(l,loc.map)})).filter(v=>v.side);
    return {kind:'map_connections',id:ctx.id,title:'区画の出入口',summary:'出入口まで歩き、隣の区画へ移動する。',actions:[],
      cards:links.filter(({side})=>loc.x===side.from.x&&loc.y===side.from.y).map(({link,side})=>({name:link.name,text:`行き先：${ctx.data.maps[side.to.map].name}${compartmentBlocked(ctx.data,ctx.state,side.to.map)?'／完全水没・水密扉施錠':''}`,actions:[available(ctx,{type:'dungeon.action',system:ctx.id,action:'cross',target:link.id},connectionPlan,'隣の区画へ進む')]})),
      markers:links.map(({link,side})=>({id:link.id,name:`${link.name} → ${ctx.data.maps[side.to.map].name}${compartmentBlocked(ctx.data,ctx.state,side.to.map)?'（完全水没・施錠）':''}`,x:side.from.x,y:side.from.y,kind:'map_connection',glyph:link.kind==='stairs'?'⇵':compartmentBlocked(ctx.data,ctx.state,side.to.map)?'▣':'▯',closed:Boolean(compartmentBlocked(ctx.data,ctx.state,side.to.map))}))};
  },
  validate:validateConnections,
  validateState:(_s,p,r)=>object(p)&&!Object.keys(p).length&&(!r||object(r)&&!Object.keys(r).length)?[]:['接続の保存が不正です']
};
