import {object,closeTo} from './common.js';
import {baseGrantsFor,permission,costProblem,payCost} from '../jobs.js';
import {exact,idList,pointsValid,patchValid,patchTile,patchCell,action,markers,panel} from './environment.js';
const bookSkill=(ctx,book)=>book.api==='battle.skill'?ctx.data.skills[book.skill]:ctx.data.fieldAbilities[book.skill];
function plan(ctx,intent){
  const actor=ctx.state.actors[intent.actor];
  if(!ctx.state.members.includes(intent.actor)||!actor||actor.hp<=0)return {ok:false,reason:'行動できる隊員を選んでください。'};
  if(intent.action==='unlock'){
    const gate=ctx.spec.gates.find(p=>p.id===intent.target),ability=ctx.data.fieldAbilities[gate?.ability];
    if(!gate||!closeTo(ctx.state,gate)||ctx.persistent.opened.includes(gate.id))return {ok:false,reason:'閉じた封印の正面で使ってください。'};
    if(!permission(ctx.data,ctx.state,intent.actor,gate.ability,'archive.unlock'))return {ok:false,reason:'本から開門の技能を借りてください。'};
    const reason=costProblem(ctx.data,ctx.state,intent.actor,ability);return reason?{ok:false,reason}:{ok:true,gate,ability};
  }
  const book=ctx.spec.books.find(p=>p.id===intent.target);
  if(!book||!closeTo(ctx.state,book))return {ok:false,reason:'足元か正面の本を選んでください。'};
  if(intent.action==='return')return ctx.run.loans[intent.actor]?{ok:true,book}:{ok:false,reason:'借りている技能はありません。'};
  if(intent.action!=='borrow')return {ok:false,reason:'読むか、借りた技能を返してください。'};
  const native=baseGrantsFor(ctx.data,ctx.state,intent.actor).filter(g=>g.level<=ctx.state.level);
  const sealed=native.find(g=>g.skill===intent.sealed);
  if(!sealed||native.some(g=>g.skill===book.skill))return {ok:false,reason:'自分の技能一つを封じ、未習得の技能を借りてください。'};
  return {ok:true,book};
}
export const skillLibrary={createPersistent:()=>({opened:[]}),createRun:()=>({loans:{}}),plan,
  act(ctx,intent,p){
    if(p.gate){payCost(ctx.engine,intent.actor,p.ability);ctx.persistent.opened.push(p.gate.id);ctx.engine.reveal();ctx.engine.notify(`${p.gate.name}の通路を開きました。`);return;}
    if(intent.action==='return'){delete ctx.run.loans[intent.actor];ctx.engine.notify('技能を返し、忘却の栞を外しました。');return;}
    ctx.run.loans[intent.actor]={book:p.book.id,sealed:intent.sealed};ctx.engine.notify(`${ctx.data.actors[intent.actor].name}は技能を一つ封じ、${bookSkill(ctx,p.book).name}を借りました。`);
  },
  grants(ctx,actor,base){
    const loan=ctx.run.loans[actor],book=ctx.spec.books.find(b=>b.id===loan?.book);if(!book)return base;
    const skill=bookSkill(ctx,book);return [...base.filter(g=>g.skill!==loan.sealed&&g.skill!==book.skill),{skill:book.skill,api:book.api,target:skill.target,maxTargets:skill.maxTargets??(skill.target.startsWith('all_')?8:1),level:1,lifetime:'equipped'}];
  },
  fieldIntent(ctx,actor,ability){return ctx.spec.gates.some(g=>g.ability===ability)?{action:'unlock',target:ctx.spec.gates.find(g=>g.ability===ability&&closeTo(ctx.state,g)&&!ctx.persistent.opened.includes(g.id))?.id,actor}:null;},
  tile:(ctx,map,x,y)=>patchTile(ctx.spec.gates.filter(g=>ctx.persistent.opened.includes(g.id)).flatMap(g=>g.tiles),map,x,y),
  cell:(ctx,map,x,y)=>patchCell(ctx.spec.gates.filter(g=>ctx.persistent.opened.includes(g.id)).flatMap(g=>g.tiles),map,x,y),
  project(ctx){
    const cards=ctx.spec.books.filter(b=>closeTo(ctx.state,b)).map(b=>{
      const actions=[];
      for(const actor of ctx.state.members){
        for(const grant of baseGrantsFor(ctx.data,ctx.state,actor).filter(g=>g.level<=ctx.state.level))actions.push(action(ctx,plan,`${ctx.data.actors[actor].name}：${(ctx.data.skills[grant.skill]??ctx.data.fieldAbilities[grant.skill]).name}を封じて読む`,{action:'borrow',target:b.id,actor,sealed:grant.skill}));
        if(ctx.run.loans[actor])actions.push(action(ctx,plan,`${ctx.data.actors[actor].name}の技能を返す`,{action:'return',target:b.id,actor}));
      }
      return {name:b.name,text:`借りる技能：${bookSkill(ctx,b).name}。一人一冊。書庫を出ると返却されます。`,actions};
    });
    for(const g of ctx.spec.gates.filter(g=>closeTo(ctx.state,g)))cards.push({name:g.name,text:ctx.persistent.opened.includes(g.id)?'開通済み':'開門の技能が必要です。',actions:ctx.state.members.map(actor=>action(ctx,plan,`${ctx.data.actors[actor].name}が開門する`,{action:'unlock',target:g.id,actor}))});
    const summary=Object.entries(ctx.run.loans).map(([id,v])=>`${ctx.data.actors[id].name}：${(ctx.data.skills[v.sealed]??ctx.data.fieldAbilities[v.sealed]).name}を封印中`).join(' ／ ');
    return panel(ctx,'忘却の栞と借りた技能',summary||'自分の技能を一つ封じ、その探索中だけ別の技能を借ります。',cards,{markers:markers(ctx,[...ctx.spec.books,...ctx.spec.gates],'本')});
  },
  validate(data,d,s){return !pointsValid(data,d,s.books)||s.books.some(b=>b.api==='battle.skill'?!data.skills[b.skill]:b.api!=='archive.unlock'||data.fieldAbilities[b.skill]?.api!==b.api)||!pointsValid(data,d,s.gates)||s.gates.some(g=>!s.books.some(b=>b.skill===g.ability&&b.api==='archive.unlock')||!patchValid(data,d,g.tiles)||g.tiles.some(p=>p.tile!=='.'))?['書物・技能・封印の定義が不正です']:[];},
  validateState(s,p,r,state,data){
    if(!exact(p,['opened'])||!idList(p.opened,s.gates.map(g=>g.id)))return ['書庫の開通状態が不正です'];
    if(r&&(!exact(r,['loans'])||!object(r.loans)||Object.entries(r.loans).some(([id,v])=>!state.members.includes(id)||!exact(v,['book','sealed'])||!s.books.some(b=>b.id===v.book)||!baseGrantsFor(data,state,id).some(g=>g.skill===v.sealed&&g.level<=state.level))))return ['書庫の貸出状態が不正です'];
    return [];
  }
};
