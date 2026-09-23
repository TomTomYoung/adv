import {permission,costProblem,payCost} from '../jobs.js';
import {object,identifier,closeTo,validPoint,knownPoint,available} from './common.js';
import {cellLayersValid} from '../cell-layers.js';

function plan(ctx,intent){
  const wall=ctx.spec.walls.find(w=>w.id===intent.target);
  if(!wall||!closeTo(ctx.state,wall))return {ok:false,reason:'正面の破壊壁を選んでください。'};
  if(ctx.persistent.broken.includes(wall.id))return {ok:false,reason:'この壁はすでに開通しています。'};
  if(intent.action==='item'){
    if(!wall.items.includes(intent.item))return {ok:false,reason:'この壁を破壊できる道具ではありません。'};
    if(!(ctx.state.inventory[intent.item]>0))return {ok:false,reason:`${ctx.data.items[intent.item].name}が1個必要です。`};
    return {ok:true,wall};
  }
  if(intent.action==='skill'){
    const ability=ctx.data.fieldAbilities[intent.ability];
    if(!wall.abilities.includes(intent.ability)||!ability||!ctx.state.members.includes(intent.actor)||!permission(ctx.data,ctx.state,intent.actor,intent.ability,'wall.break'))return {ok:false,reason:'対応する探索スキルを習得した隊員が必要です。'};
    const reason=costProblem(ctx.data,ctx.state,intent.actor,ability);
    return reason?{ok:false,reason}:{ok:true,wall,ability};
  }
  return {ok:false,reason:'対応する道具か探索スキルを選んでください。'};
}
function act(ctx,intent,p){
  if(p.ability)payCost(ctx.engine,intent.actor,p.ability);else ctx.engine.give(intent.item,-1);
  ctx.persistent.broken.push(p.wall.id);ctx.engine.reveal();ctx.engine.eventCue('unlock');ctx.engine.notify(`${p.wall.name}を破壊し、通路を開きました。`);
}
const target=(ctx)=>ctx.spec.walls.find(w=>closeTo(ctx.state,w)&&!ctx.persistent.broken.includes(w.id));
function project(ctx){
  const walls=ctx.spec.walls.filter(w=>closeTo(ctx.state,w)).map(w=>{
    const actions=w.items.map(item=>available(ctx,{type:'dungeon.action',system:ctx.id,action:'item',target:w.id,item},plan,`${ctx.data.items[item].name}で破壊（1個）`));
    for(const actor of ctx.state.members)for(const ability of w.abilities)if(permission(ctx.data,ctx.state,actor,ability,'wall.break'))actions.push(available(ctx,{type:'dungeon.action',system:ctx.id,action:'skill',target:w.id,actor,ability},plan,`${ctx.data.actors[actor].name}：${ctx.data.fieldAbilities[ability].name}（MP${ctx.data.fieldAbilities[ability].mp}）`));
    return {id:w.id,name:w.name,broken:ctx.persistent.broken.includes(w.id),actions};
  });
  const markers=ctx.spec.walls.filter(w=>knownPoint(ctx.state,w)).map(w=>({id:w.id,name:w.name+(ctx.persistent.broken.includes(w.id)?'（開通）':''),x:w.x,y:w.y,kind:'breakable_wall',glyph:ctx.persistent.broken.includes(w.id)?'◇':'砕'}));
  return {kind:'breakable_walls',id:ctx.id,title:'破壊できる壁',walls,markers};
}
function validate(data,definition,spec){
  if(!Array.isArray(spec.walls)||!spec.walls.length)return ['破壊壁がありません'];
  const errors=[],ids=new Set(),cells=new Set();
  for(const w of spec.walls){
    if(!object(w)){errors.push('破壊壁が不正です');continue;}
    const map=data.maps[w.map],key=`${w.map}/${w.x},${w.y}`;
    if(data.game.cellLayerVersion&&!cellLayersValid(data,{...w.openedLayers,passage:'.'}))errors.push('破壊後のセルレイヤーが不正です');
    if(!identifier(w.id)||ids.has(w.id)||!w.name||!validPoint(data,definition,w,'#')||w.x===0||w.y===0||w.x===map?.tiles[0].length-1||w.y===map?.tiles.length-1||cells.has(key))errors.push('破壊壁は重複しない内壁に配置してください');ids.add(w.id);cells.add(key);
    if(!Array.isArray(w.items)||!Array.isArray(w.abilities)||w.items.length+w.abilities.length===0||w.items.some(id=>!data.items[id]||data.items[id].slot)||w.abilities.some(id=>data.fieldAbilities[id]?.api!=='wall.break'))errors.push('壁破壊のアイテム・スキル参照が不正です');
    if(map&&![[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>map.tiles[w.y+dy]?.[w.x+dx]==='.'))errors.push('壁に接近できる床がありません');
  }
  return errors;
}
export const breakableWalls={createPersistent:()=>({broken:[]}),createRun:()=>({}),plan,act,project,validate,
  cell:(ctx,map,x,y)=>{const wall=ctx.spec.walls.find(w=>w.map===map.id&&w.x===x&&w.y===y&&ctx.persistent.broken.includes(w.id));return wall?{...wall.openedLayers,passage:'.'}:null;},
  tile:(ctx,map,x,y)=>ctx.spec.walls.some(w=>w.map===map.id&&w.x===x&&w.y===y&&ctx.persistent.broken.includes(w.id))?'.':null,
  itemIntent:(ctx,item)=>ctx.spec.walls.some(w=>w.items.includes(item))?{action:'item',target:target(ctx)?.id,item}:null,
  fieldIntent:(ctx,actor,ability)=>ctx.data.fieldAbilities[ability]?.api==='wall.break'?{action:'skill',target:target(ctx)?.id,actor,ability}:null,
  validateState:(spec,persistent,run)=>!object(persistent)||!Array.isArray(persistent.broken)||Object.keys(persistent).some(k=>k!=='broken')||new Set(persistent.broken).size!==persistent.broken.length||persistent.broken.some(id=>!spec.walls.some(w=>w.id===id))||run&&(!object(run)||Object.keys(run).length)?['破壊壁の保存が不正です']:[]
};
