import {integer} from './common.js';
import {empty,exact,cellsValid,panel,sameCell,noAction,noAct} from './environment.js';
const vectorAt=(ctx,p)=>ctx.spec.vectors.find(v=>sameCell(v,p));
export const vectorCurse={createPersistent:()=>({}),createRun:()=>({stacks:0}),plan:noAction,act:noAct,
  step(ctx){const m=ctx.movement;if(!m||m.from.map!==m.to.map)return;const v=vectorAt(ctx,m.from);if(v&&(m.to.x-m.from.x)*v.dx+(m.to.y-m.from.y)*v.dy<0){ctx.run.stacks=Math.min(ctx.spec.maxStacks,ctx.run.stacks+ctx.spec.perStep);ctx.engine.notify(`流れに逆らい、帰還の呪いが${ctx.run.stacks}重に累積しました。`);}},
  actorStats(ctx,id,base){const stats={...base},factor=Math.pow(ctx.spec.factor,ctx.run.stacks);for(const key of ctx.spec.stats)stats[key]=Math.max(0,Math.floor(stats[key]*factor));return stats;},
  project(ctx){const v=vectorAt(ctx,ctx.state.location),arrow=v?{'0,-1':'↑','1,0':'→','0,1':'↓','-1,0':'←','0,0':'・'}[`${v.dx},${v.dy}`]:'・';return panel(ctx,'帰還の呪い',`足元の流れ ${arrow} ／ ${ctx.run.stacks}重 ／ 能力倍率 ${(Math.pow(ctx.spec.factor,ctx.run.stacks)*100).toFixed(1)}%。逆らう移動のたびに急激に弱体化し、深淵を出るまで解除されません。`,[],{markers:ctx.spec.vectors.filter(v=>v.map===ctx.state.location.map&&(ctx.state.discovered[v.map]??[]).includes(`${v.x},${v.y}`)).map(v=>({id:`flow_${v.x}_${v.y}`,name:'流れの向き',x:v.x,y:v.y,kind:'vector',glyph:{'0,-1':'↑','1,0':'→','0,1':'↓','-1,0':'←','0,0':'・'}[`${v.dx},${v.dy}`]}))});},
  validate(data,d,s){
    if(!cellsValid(data,d,s.vectors)||s.vectors.some(v=>!Number.isInteger(v.dx)||!Number.isInteger(v.dy)||Math.abs(v.dx)+Math.abs(v.dy)>1)||!integer(s.perStep,1,100)||!integer(s.maxStacks,1,1000)||!Number.isFinite(s.factor)||s.factor<=0||s.factor>=1||!Array.isArray(s.stats)||!s.stats.length||s.stats.some(k=>!['str','vit','agi','int'].includes(k)))return ['流れ・弱体化係数が不正です'];
    for(const map of d.maps)for(let y=0;y<data.maps[map].tiles.length;y++)for(let x=0;x<data.maps[map].tiles[y].length;x++)if(data.maps[map].tiles[y][x]==='.'&&!s.vectors.some(v=>sameCell(v,{map,x,y})))return ['全ての床セルに流れが必要です'];
    return [];
  },
  validateState:(s,p,r)=>!empty(p)||r&&(!exact(r,['stacks'])||!integer(r.stacks,0,s.maxStacks))?['帰還の呪いの保存が不正です']:[]
};
