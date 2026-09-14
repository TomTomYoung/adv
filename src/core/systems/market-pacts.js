import {integer,closeTo} from './common.js';
import {exact,idList,pointsValid,patchValid,patchTile,materialsValid,inventoryPlan,action,markers,panel,sameCell} from './environment.js';
const guardActive=(ctx,g)=>ctx.run.alarm>=g.alarm&&!ctx.run.cleared.includes(g.id);
function plan(ctx,intent){
  const guard=ctx.spec.guards.find(g=>g.id===intent.target);
  if(intent.action==='fight'&&guard&&guardActive(ctx,guard)&&closeTo(ctx.state,guard))return {ok:true,guard};
  const offer=ctx.spec.offers.find(o=>o.id===intent.target);
  if(intent.action!=='trade'||!offer||!closeTo(ctx.state,offer))return {ok:false,reason:'取引相手の足元か正面で交渉してください。'};
  if(ctx.run.alarm>=ctx.spec.closeAt)return {ok:false,reason:'警戒により店と交渉窓口が閉じています。市場を出ると警戒が落ち着きます。'};
  if(offer.kind!=='buy'&&ctx.persistent.paid.includes(offer.id))return {ok:false,reason:'すでに契約済みです。'};
  if(ctx.state.gold<offer.gold)return {ok:false,reason:`${offer.gold}G必要です。`};
  if(offer.kind==='escort'&&ctx.run.escort>0)return {ok:false,reason:'護衛はすでに同行しています。'};
  return {...inventoryPlan(ctx,offer.cost,offer.output),offer};
}
export const marketPacts={createPersistent:()=>({paid:[]}),createRun:()=>({alarm:0,escort:0,cleared:[],fighting:null}),plan,
  act(ctx,intent,p){
    if(p.guard){ctx.run.fighting=p.guard.id;ctx.engine.startBattle(ctx.spec.guardEncounter,{win:[],escape:[],lose:[]});return;}
    ctx.state.inventory=p.inventory;ctx.state.gold-=p.offer.gold;
    if(p.offer.kind==='escort')ctx.run.escort=ctx.spec.escortSteps;
    else if(p.offer.kind!=='buy')ctx.persistent.paid.push(p.offer.id);
    ctx.engine.reveal();ctx.engine.notify(`${p.offer.name}との取引が成立しました。${p.offer.description}`);
  },
  step(ctx){if(ctx.run.escort>0)ctx.run.escort--;},
  battleStart(ctx){ctx.run.alarm=Math.min(ctx.spec.maxAlarm,ctx.run.alarm+1);ctx.engine.notify(`市場の警戒 ${ctx.run.alarm}。${ctx.run.alarm>=ctx.spec.closeAt?'店が閉じ、用心棒が配置されました。':'周辺の視線が厳しくなりました。'}`);},
  battleEnd(ctx){if(ctx.run.fighting){if(ctx.result==='win')ctx.run.cleared.push(ctx.run.fighting);ctx.run.fighting=null;}},
  encounter:ctx=>({rate:ctx.run.escort>0?ctx.spec.escortRate:1,enemyScale:ctx.run.escort>0?ctx.spec.escortEnemyScale:1}),
  tile:(ctx,map,x,y)=>patchTile(ctx.spec.offers.filter(o=>ctx.persistent.paid.includes(o.id)).flatMap(o=>o.tiles),map,x,y),
  block:(ctx,map,x,y)=>!sameCell(ctx.state.location,{map:map.id,x,y})&&ctx.spec.guards.some(g=>g.map===map.id&&g.x===x&&g.y===y&&guardActive(ctx,g))?'警戒中の用心棒が通路を塞いでいます。正面で対処してください。':null,
  project(ctx){
    const cards=ctx.spec.offers.filter(o=>closeTo(ctx.state,o)).map(o=>({name:o.name,text:`${o.description}（${o.gold}G${Object.entries(o.cost).map(([id,n])=>`・${ctx.data.items[id].name}×${n}`).join('')}）`,actions:[action(ctx,plan,'取引する',{action:'trade',target:o.id})]}));
    for(const g of ctx.spec.guards.filter(g=>guardActive(ctx,g)&&closeTo(ctx.state,g)))cards.push({name:g.name,text:'警戒で増員された用心棒です。',actions:[action(ctx,plan,'用心棒と戦う',{action:'fight',target:g.id})]});
    return panel(ctx,'市場の取引と警戒',`警戒 ${ctx.run.alarm}/${ctx.spec.maxAlarm} ／ ${ctx.run.alarm>=ctx.spec.closeAt?'閉店中':'取引可能'} ／ 護衛残り ${ctx.run.escort}歩。戦闘で警戒が上がり、退出時に解除されます。`,cards,{markers:[...markers(ctx,ctx.spec.offers,'商'),...markers(ctx,ctx.spec.guards.filter(g=>guardActive(ctx,g)),'衛')]});
  },
  validate(data,d,s){return !pointsValid(data,d,s.offers)||!pointsValid(data,d,s.guards)||!data.encounters[s.guardEncounter]||!integer(s.closeAt,1,20)||!integer(s.maxAlarm,s.closeAt,100)||!integer(s.escortSteps,1,1000)||![s.escortRate,s.escortEnemyScale].every(v=>Number.isFinite(v)&&v>0&&v<=1)||s.offers.some(o=>!['toll','barter','buy','escort'].includes(o.kind)||!o.description||!integer(o.gold,0,1e6)||!materialsValid(data,o.cost)||!materialsValid(data,o.output)||!Array.isArray(o.tiles)||o.tiles.length&&(!patchValid(data,d,o.tiles)||o.tiles.some(p=>p.tile!=='.')))||s.guards.some(g=>!integer(g.alarm,1,s.maxAlarm))?['取引・警戒・用心棒が不正です']:[];},
  validateState(s,p,r){return !exact(p,['paid'])||!idList(p.paid,s.offers.filter(o=>['toll','barter'].includes(o.kind)).map(o=>o.id))||r&&(!exact(r,['alarm','escort','cleared','fighting'])||!integer(r.alarm,0,s.maxAlarm)||!integer(r.escort,0,s.escortSteps)||!idList(r.cleared,s.guards.map(g=>g.id))||r.fighting!==null&&!s.guards.some(g=>g.id===r.fighting))?['取引・警戒の保存が不正です']:[];}
};
