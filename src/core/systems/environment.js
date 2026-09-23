import {object,integer,identifier,knownPoint,available} from './common.js';
import {cellLayersValid} from '../cell-layers.js';

export const sameCell=(a,b)=>a?.map===b?.map&&a.x===b.x&&a.y===b.y;
export const exact=(value,keys)=>object(value)&&Object.keys(value).every(k=>keys.includes(k))&&keys.every(k=>Object.hasOwn(value,k));
export const idList=(value,allowed)=>Array.isArray(value)&&new Set(value).size===value.length&&value.every(id=>allowed.includes(id));
export const empty=value=>exact(value,[]);
export const pointValid=(data,d,p)=>object(p)&&d.maps.includes(p.map)&&integer(p.x,1)&&integer(p.y,1)&&p.x<data.maps[p.map]?.tiles[0].length-1&&p.y<data.maps[p.map]?.tiles.length-1;
export const floorValid=(data,d,p)=>pointValid(data,d,p)&&data.maps[p.map].tiles[p.y][p.x]==='.'&&!data.maps[p.map].objects.some(o=>o.blocking&&o.x===p.x&&o.y===p.y);
export function pointsValid(data,d,points,{floor=true}={}){
  return Array.isArray(points)&&points.length>0&&new Set(points.map(p=>p?.id)).size===points.length&&points.every(p=>identifier(p?.id)&&typeof p.name==='string'&&p.name.length>0&&(floor?floorValid:pointValid)(data,d,p));
}
export const cellsValid=(data,d,cells)=>Array.isArray(cells)&&cells.length>0&&new Set(cells.map(p=>`${p?.map}/${p?.x},${p?.y}`)).size===cells.length&&cells.every(p=>pointValid(data,d,p));
export const materialsValid=(data,items)=>object(items)&&Object.entries(items).every(([id,n])=>data.items[id]&&!data.items[id].slot&&integer(n,1,data.system.maxStack));
export function inventoryPlan(ctx,cost={},output={}){
  const inventory={...ctx.state.inventory};
  for(const [id,n] of Object.entries(cost)){
    if((inventory[id]??0)<n)return {ok:false,reason:`${ctx.data.items[id].name}が${n}個必要です。`};
    inventory[id]-=n;
  }
  for(const [id,n] of Object.entries(output)){
    inventory[id]=(inventory[id]??0)+n;
    if(inventory[id]>ctx.data.system.maxStack)return {ok:false,reason:`${ctx.data.items[id].name}の袋が満杯です。`};
  }
  return {ok:true,inventory};
}
export const action=(ctx,plan,label,intent)=>available(ctx,{type:'dungeon.action',system:ctx.id,...intent},plan,label);
export const markers=(ctx,points,glyph)=>points.filter(p=>knownPoint(ctx.state,p)).map(p=>({id:`${ctx.id}_${p.id}`,name:p.name,x:p.x,y:p.y,kind:ctx.spec.use,glyph}));
export const panel=(ctx,title,summary,cards=[],extra={})=>({kind:ctx.spec.use,id:ctx.id,title,summary,cards,actions:[],markers:[],...extra});
export const patchTile=(patches,map,x,y)=>patches.find(p=>p.map===map.id&&p.x===x&&p.y===y)?.tile??null;
export const patchCell=(patches,map,x,y)=>{const p=patches.find(p=>p.map===map.id&&p.x===x&&p.y===y);return p?{...p.layers,passage:p.tile}:null;};
export const patchValid=(data,d,patches)=>cellsValid(data,d,patches)&&patches.every(p=>['.','#'].includes(p.tile)&&(!data.game.cellLayerVersion||cellLayersValid(data,{...p.layers,passage:p.tile}))&&!data.maps[p.map].objects.some(o=>o.x===p.x&&o.y===p.y)&&!sameCell({...data.maps[p.map].entrance,map:p.map},p));
export function clampParty(ctx){for(const id of ctx.state.members){const a=ctx.state.actors[id],stats=ctx.engine.stats(id);a.hp=Math.min(a.hp,stats.hp);a.mp=Math.min(a.mp,stats.mp);}}
export const noAction=()=>({ok:false,reason:'この環境は操作できません。'});
export const noAct=()=>{};
