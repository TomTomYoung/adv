import {authoredCellLayers} from '../cell-layers.js';
import {destroyGear} from '../equipment.js';
import {object,integer,validPoint} from './common.js';
const copies=ctx=>Object.entries(ctx.state.gear.items);
function equipmentStats(ctx,_item,stats,actor,slot){
 const id=ctx.state.gear.equipped[actor]?.[slot],salt=ctx.state.gear.items[id]?.salt??0;
 return Object.fromEntries(Object.entries(stats).map(([key,n])=>[key,n>0?n-salt:n]));
}
function battleStart(ctx){
 let count=0;for(const actor of ctx.state.members.filter(id=>ctx.state.actors[id].hp>0))for(const id of Object.values(ctx.state.gear.equipped[actor]??{})){ctx.state.gear.items[id].salt+=ctx.spec.perBattle;count++;}
 clamp(ctx);if(count)ctx.engine.notify(`装備ごとに塩が${ctx.spec.perBattle}累積しました。水没区画で洗うか、廃坑を出ると回復します。`);
}
function clamp(ctx){for(const a of Object.values(ctx.state.actors)){const stats=ctx.engine.stats(a.id);a.hp=Math.min(a.hp,stats.hp);a.mp=Math.min(a.mp,stats.mp);}}
function wash(ctx){let changed=false;for(const [,copy] of copies(ctx))if(copy.salt){copy.salt=0;changed=true;}return changed;}
function battleRound(ctx){
 if(!ctx.state.battle?.enemies.some(e=>e.id===ctx.spec.eater.enemy&&e.hp>0))return;
 const target=copies(ctx).filter(([,c])=>c.salt>=ctx.spec.eater.threshold).sort((a,b)=>b[1].salt-a[1].salt||a[0].localeCompare(b[0]))[0];
 if(!target)return;destroyGear(ctx.state,target[0]);clamp(ctx);ctx.state.battle.log.push(`ソルトイーターが塩の積もった${ctx.data.items[target[1].item].name}を食べた。装備が失われた。`);
}
function project(ctx){
 const items=copies(ctx).filter(([,c])=>c.salt>0).map(([id,c])=>{let owner='袋';for(const [a,slots] of Object.entries(ctx.state.gear.equipped))if(Object.values(slots).includes(id))owner=ctx.data.actors[a].name;return {id,name:`${c.item in ctx.data.items?ctx.data.items[c.item].name:c.item}（${owner}）`,penalty:c.salt};});
 return {kind:'corrosion',id:ctx.id,title:'装備ごとの塩',perBattle:ctx.spec.perBattle,items,threshold:ctx.spec.eater.threshold,markers:ctx.spec.washZones.filter(p=>p.map===ctx.state.location.map&&(ctx.state.discovered[p.map]??[]).includes(`${p.x},${p.y}`)).map(p=>({...p,id:`wash/${p.x}/${p.y}`,name:'塩を洗える水没区画',kind:'water',level:1,glyph:'~'}))};
}
export const corrosion={
 createPersistent:()=>({}),createRun:()=>({}),battleStart,battleRound,equipmentStats,project,
 step(ctx){const l=ctx.state.location,p=authoredCellLayers(ctx.data,ctx.data.maps[l.map],l.x,l.y)?.parameters;if(ctx.movement&&p?.corrosion){for(const actor of ctx.state.members.filter(id=>ctx.state.actors[id].hp>0))for(const id of Object.values(ctx.state.gear.equipped[actor]??{}))ctx.state.gear.items[id].salt+=p.corrosion;clamp(ctx);ctx.engine.notify(`腐食床で装備の塩が${p.corrosion}増えた。`);}if(ctx.spec.washZones.some(p=>p.map===l.map&&p.x===l.x&&p.y===l.y)&&wash(ctx))ctx.engine.notify('水没区画の水で、装備に付いた塩を洗い流しました。');},
 leave(ctx){wash(ctx);},
 waterDepth:(ctx,map,x,y)=>ctx.spec.washZones.some(p=>p.map===map.id&&p.x===x&&p.y===y)?1:0,
 encounter:ctx=>({rate:1,enemyScale:1,...(copies(ctx).some(([,c])=>c.salt>=ctx.spec.eater.threshold)?{encounter:ctx.spec.eater.encounter}:{})}),
 plan:()=>({ok:false,reason:'水没区画に入ると装備の塩を洗い流せます。'}),
 validate(data,d,s){return integer(s.perBattle,1,100)&&integer(s.eater?.threshold,1,100)&&data.enemies[s.eater.enemy]&&data.encounters[s.eater.encounter]?.enemies.includes(s.eater.enemy)&&Array.isArray(s.washZones)&&s.washZones.length&&s.washZones.every(p=>validPoint(data,d,p))?[]:['塩・ソルトイーター・洗浄場所が不正です'];},
 validateState:(_s,p,r)=>object(p)&&!Object.keys(p).length&&(!r||object(r)&&!Object.keys(r).length)?[]:['塩環境の保存が不正です']
};
