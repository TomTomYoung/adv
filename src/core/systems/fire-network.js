import {objectBlocks,objectVisible} from '../quest-events.js';
import {permission,costProblem,payCost} from '../jobs.js';
import {signalFieldChange} from '../field-signals.js';
import {closeTo as withinReach,actionConsumes} from './common.js';

const faces={north:[0,-1],east:[1,0],south:[0,1],west:[-1,0]};
const freshFlame=(effect,fuel)=>({lit:true,effect,fuel});
const burning=f=>Boolean(f?.lit&&(f.fuel===null||f.fuel>0));
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
const integer=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;

export function fireContext(data,state){
  const active=state.dungeons?.active,d=data.dungeons?.[active?.id];
  if(state.mode!=='dungeon'||!d?.maps.includes(state.location?.map))return null;
  const pair=Object.entries(d.systems).find(([,s])=>s.use==='fire_network'&&s.enabled!==false);if(!pair)return null;
  const [id,spec]=pair;return {data,state,definition:d,id,spec,run:active.systems[id],persistent:state.dungeons.persistent[d.id].systems[id]};
}
function closeTo(ctx,fixture){
  return withinReach(ctx.state,fixture);
}
function passable(ctx,map,x,y){
  return map.tiles[y]?.[x]==='.'&&!map.objects.some(o=>o.x===x&&o.y===y&&objectBlocks(ctx.state,map,o));
}
// Flood through passages, rather than leaking a circular aura through solid walls.
function reaches(ctx,fixture){
  const loc=ctx.state.location;if(fixture.map!==loc.map)return false;
  const map=ctx.data.maps[loc.map],queue=[[fixture.x,fixture.y,0]],seen=new Set([`${fixture.x},${fixture.y}`]);
  for(let i=0;i<queue.length;i++){
    const [x,y,depth]=queue[i];if(x===loc.x&&y===loc.y)return true;if(depth>=fixture.radius)continue;
    for(const [dx,dy] of Object.values(faces)){const nx=x+dx,ny=y+dy,key=`${nx},${ny}`;if(!seen.has(key)&&passable(ctx,map,nx,ny)){seen.add(key);queue.push([nx,ny,depth+1]);}}
  }
  return false;
}
export function fireEnvironment(ctx){
  const active=[];
  for(const fixture of ctx.spec.fixtures){const flame=ctx.persistent.fixtures[fixture.id];if(burning(flame)&&reaches(ctx,fixture))active.push({id:fixture.id,effect:flame.effect??fixture.effect});}
  for(const fixture of ctx.data.maps[ctx.state.location.map].objects){if(!fixture.fire||!objectVisible(ctx.state,ctx.data.maps[ctx.state.location.map],fixture))continue;const status=ctx.state.objects[`${ctx.state.location.map}/${fixture.id}`]??fixture.initialState;if(fixture.fire.litStates.includes(status)&&reaches(ctx,{...fixture,map:ctx.state.location.map,radius:fixture.fire.radius}))active.push({id:fixture.id,effect:fixture.fire.effect});}
  if((ctx.state.inventory[ctx.spec.portable.item]??0)>0&&burning(ctx.run.portable))active.push({id:'portable',effect:ctx.run.portable.effect});
  active.sort((a,b)=>ctx.spec.effects[b.effect].priority-ctx.spec.effects[a.effect].priority||a.id.localeCompare(b.id,'en'));
  const strongest=active.length?ctx.spec.effects[active[0].effect]:null;
  return {protected:active.some(a=>ctx.spec.effects[a.effect].repels),sources:active,rate:strongest?.encounterRate??1,enemyScale:strongest?.enemyScale??1};
}
export function fireSkillPlan(data,state,actor,ability){
  const ctx=fireContext(data,state),spec=data.fieldAbilities?.[ability];
  if(!ctx||!spec||spec.api!=='fire.kindling'||!ctx.spec.effects[spec.effect])return {ok:false,reason:'この迷宮ではその火を灯せません。'};
  if(!state.members.includes(actor)||!permission(data,state,actor,ability,'fire.kindling'))return {ok:false,reason:'この探索特技は習得していません。'};
  if(!(state.inventory[ctx.spec.portable.item]>0))return {ok:false,reason:'携帯松明がありません。'};
  const reason=costProblem(data,state,actor,spec);return reason?{ok:false,reason}:{ok:true,ctx,ability:spec};
}
export function kindlePortable(data,state,effect){
  const ctx=fireContext(data,state);if(!ctx||!ctx.spec.effects[effect])return false;
  state.inventory[ctx.spec.portable.item]=1;ctx.run.portable=freshFlame(effect,ctx.spec.portable.capacity);signalFieldChange(data,state,'light');return true;
}
export function canRepel(data,state,skill){
  const ctx=fireContext(data,state),battle=state.battle;
  return Boolean(ctx&&battle&&battle.encounter===ctx.spec.threat.encounter&&ctx.spec.effects[skill.fireEffect]?.repels);
}
function plan(ctx,intent){
  const {spec,run,persistent,state}=ctx,portable=intent.target==='portable';
  const fixture=portable?null:spec.fixtures.find(f=>f.id===intent.target);
  if(!portable&&(!fixture||!closeTo(ctx,fixture)))return {ok:false,reason:'足元か正面の台座を選んでください。'};
  if(portable&&!(state.inventory[spec.portable.item]>0))return {ok:false,reason:'携帯松明がありません。'};
  const flame=portable?run.portable:persistent.fixtures[fixture.id],lit=burning(flame);
  if(intent.action==='collect')return !lit?{ok:false,reason:'灯っている火から種火を採ってください。'}:run.ember?.effect===(flame.effect??fixture?.effect)?{ok:false,reason:'同じ種火をすでに持っています。'}:{ok:true,fixture,flame};
  if(intent.action==='extinguish')return lit?{ok:true,fixture,flame}:{ok:false,reason:'すでに消えています。'};
  if(!['ignite','transplant','skill','refuel'].includes(intent.action))return {ok:false,reason:'未知の火の操作です。'};
  if(intent.action==='skill'){
    const skill=fireSkillPlan(ctx.data,state,intent.actor,intent.ability);if(!skill.ok)return skill;
    if(!portable&&lit)return {ok:false,reason:'先に台座の火を消してください。'};
    return {ok:true,fixture,flame,effect:skill.ability.effect,ability:skill.ability};
  }
  if(intent.action==='refuel'){
    if(!lit||flame.fuel===null||flame.fuel===(portable?spec.portable.capacity:fixture.capacity))return {ok:false,reason:'燃料補充が必要な火を選んでください。'};
  }else if(lit)return {ok:false,reason:'先に火を消してください。'};
  if(intent.action==='transplant')return run.ember?{ok:true,fixture,flame,effect:run.ember.effect}:{ok:false,reason:'先に種火を採ってください。'};
  if(!(state.inventory[spec.fuelItem]>0))return {ok:false,reason:`${ctx.data.items[spec.fuelItem].name}が1個必要です。`};
  return {ok:true,fixture,flame,effect:intent.action==='refuel'?flame.effect:portable?spec.portable.baseEffect:fixture.effect,fuelCost:true};
}
function act(ctx,intent,p){
  const {engine,spec,run}=ctx,portable=intent.target==='portable',name=portable?'携帯松明':p.fixture.name;
  if(intent.action==='collect'){run.ember={effect:p.flame.effect??p.fixture.effect};ctx.state.inventory[spec.emberItem]=1;engine.notify(`${name}から「${spec.effects[run.ember.effect].name}」の種火を採りました。`);return;}
  if(intent.action==='extinguish'){p.flame.lit=false;p.flame.effect=null;p.flame.fuel=0;engine.notify(`${name}の火を消しました。移した火の効果も消えました。`);return;}
  if(p.ability)payCost(engine,intent.actor,p.ability);
  if(p.fuelCost)engine.give(spec.fuelItem,-1);
  const effect=p.effect??p.fixture?.effect;
  Object.assign(p.flame,freshFlame(effect,portable?spec.portable.capacity:p.fixture.capacity));
  if(intent.action==='transplant'){run.ember=null;ctx.state.inventory[spec.emberItem]=0;}
  engine.eventCue('light');engine.notify(`${name}に「${spec.effects[effect].name}」が灯りました。`);
}
function burn(flame,capacity,warnings,notify,name){
  if(!burning(flame)||flame.fuel===null)return;
  const before=flame.fuel;flame.fuel=Math.max(0,before-1);
  for(const threshold of warnings)if(before>threshold&&flame.fuel<=threshold)notify(`${name}：残り${flame.fuel}歩です。${threshold===warnings.at(-1)?'まもなく消えます。安全な火の近くへ。':'燃料の補充を準備してください。'}`);
  if(flame.fuel===0){flame.lit=false;flame.effect=null;notify(`${name}の火が消えました。`);}
}
function validate(data,definition,spec){
  const errors=[],bad=m=>errors.push(m),ids=new Set(),p=spec.portable;
  if(!object(spec.effects)||!Object.keys(spec.effects).length)return ['火の効果がありません'];
  for(const [id,e] of Object.entries(spec.effects))if(!/^[a-z][a-z0-9_]*$/.test(id)||['constructor','prototype','__proto__'].includes(id)||!object(e)||!e.name||typeof e.repels!=='boolean'||!finite(e.encounterRate,0,5)||!finite(e.enemyScale,.1,5)||!integer(e.priority,0,1000))bad(`火の効果不正 ${id}`);
  if(!p||!integer(p.capacity,2,100000)||!data.items[p.item]||!spec.effects[p.baseEffect]||!spec.effects[p.entryEffect]?.repels||!Array.isArray(p.warnings)||p.warnings.length!==2||!p.warnings.every(n=>integer(n,1,p.capacity-1))||p.warnings[0]<=p.warnings[1])bad('携帯松明・二段階警告が不正です');
  if(!data.items[spec.fuelItem]||!data.items[spec.emberItem]||!data.encounters[spec.threat?.encounter])bad('燃料・脅威の参照不正');
  if(data.encounters[spec.threat?.encounter]?.enemies.some(id=>data.enemies[id]?.rewards.gold||data.enemies[id]?.rewards.xp))bad('脅威の報酬は0にしてください');
  if(!Array.isArray(spec.fixtures))return [...errors,'台座一覧がありません'];
  for(const f of spec.fixtures){
    const map=data.maps[f.map];
    if(f.edge!==undefined&&!Object.hasOwn(faces,f.edge))bad(`台座のエッジ不正 ${f.id}`);
    if(!/^[a-z][a-z0-9_]*$/.test(f.id)||['portable','constructor','prototype','__proto__'].includes(f.id)||ids.has(f.id)||!f.name||!definition.maps.includes(f.map)||!map||map.tiles[f.y]?.[f.x]!=='.'||!integer(f.x,0,10000)||!integer(f.y,0,10000)||!spec.effects[f.effect]||!integer(f.radius,0,30)||!(f.capacity===null||integer(f.capacity,1,100000))||typeof f.initiallyLit!=='boolean')bad(`台座不正 ${f.id}`);ids.add(f.id);
  }
  const entry=spec.fixtures.find(f=>f.id===spec.entryFixture),main=definition.entries.main,at=data.maps[main.map].entrance;
  if(!entry||entry.map!==main.map||entry.x!==at.x||entry.y!==at.y||!spec.effects[entry.effect]?.repels)bad('入口にはくらがり除けの篝火が必要です');
  return errors;
}
function validateState(spec,persistent,run,state){
  const errors=[],bad=m=>errors.push(m);
  if(!object(persistent)||!object(persistent.fixtures))return ['台座の保存がありません'];
  const flame=(f,cap)=>object(f)&&typeof f.lit==='boolean'&&(f.lit?!!spec.effects[f.effect]&&(cap===null?f.fuel===null:integer(f.fuel,1,cap)):f.effect===null&&f.fuel===0);
  if(Object.keys(persistent.fixtures).length!==spec.fixtures.length)bad('台座数が一致しません');
  for(const f of spec.fixtures)if(!flame(persistent.fixtures[f.id],f.capacity))bad(`台座状態不正 ${f.id}`);
  if(persistent.ember!==null&&(!object(persistent.ember)||!spec.effects[persistent.ember.effect]))bad('保持した種火が不正です');
  if(run){if(state.inventory[spec.emberItem]!==Number(run.ember!==null))bad('種火の所持数不正');if(!object(run)||!flame(run.portable,spec.portable.capacity)||run.ember!==null&&(!object(run.ember)||!spec.effects[run.ember.effect]))bad('携帯松明・種火の状態不正');if(state.inventory[spec.portable.item]!==1)bad('携帯松明の所持数不正');}
  return errors;
}
function project(ctx){
  const environment=fireEnvironment(ctx),{spec,run,state}=ctx;
  const makeTarget=(id,name,flame,base,capacity)=>{
    const actions=[];
    for(const [action,label] of [['ignite','普通の火を灯す'],['refuel','燃料を補充'],['collect','種火を採る'],['extinguish','火を消す'],['transplant','種火を移す']]){
      const intent={type:'dungeon.action',system:ctx.id,action,target:id},p=plan(ctx,intent);actions.push({label:(action==='collect'&&run.ember?'種火を持ち替える':label)+(['ignite','refuel'].includes(action)?`（${ctx.data.items[spec.fuelItem].name}×1）`:''),intent,enabled:p.ok&&!state.waiting&&!state.battle,reason:p.reason??'',consumes:actionConsumes(ctx,intent,p)});
    }
    for(const actor of state.members)for(const grant of ctx.data.jobs?.[state.actors[actor].job]?.grants??[])if(grant.api==='fire.kindling'){
      const ability=ctx.data.fieldAbilities[grant.skill],intent={type:'dungeon.action',system:ctx.id,action:'skill',target:id,actor,ability:grant.skill},p=plan(ctx,intent);
      actions.push({label:`${ctx.data.actors[actor].name}：${ability.name}（MP${ability.mp}）`,intent,enabled:p.ok&&!state.waiting&&!state.battle,reason:p.reason??'',consumes:actionConsumes(ctx,intent,p)});
    }
    return {id,name,lit:burning(flame),effect:burning(flame)?spec.effects[flame.effect??base].name:'消灯',baseEffect:spec.effects[base].name,fuel:flame.fuel,capacity,actions};
  };
  const fixtures=spec.fixtures.filter(f=>closeTo(ctx,f)).map(f=>makeTarget(f.id,f.name,ctx.persistent.fixtures[f.id],f.effect,f.capacity));
  const markers=spec.fixtures.filter(f=>f.map===state.location.map&&(state.discovered[f.map]??[]).includes(`${f.x},${f.y}`)).map(f=>({id:f.id,name:f.name,x:f.x,y:f.y,...(f.edge?{edge:f.edge}:{}),kind:'brazier',glyph:burning(ctx.persistent.fixtures[f.id])?'灯':'台',lit:burning(ctx.persistent.fixtures[f.id])}));
  return {kind:'fire_network',id:ctx.id,title:'火と種火',protected:environment.protected,encounterRate:environment.rate,enemyScale:environment.enemyScale,ember:run.ember?spec.effects[run.ember.effect].name:null,portable:makeTarget('portable','携帯松明',run.portable,spec.portable.baseEffect,spec.portable.capacity),fixtures,markers};
}
export const fireNetwork={
  replacesLight:true,
  itemIntent:(ctx,item)=>item===ctx.spec.fuelItem?{target:'portable',action:ctx.run.portable.lit?'refuel':'ignite'}:null,
  createPersistent:spec=>({ember:null,fixtures:Object.fromEntries(spec.fixtures.map(f=>[f.id,f.initiallyLit?freshFlame(f.effect,f.capacity):{lit:false,effect:null,fuel:0}]))}),
  createRun:spec=>({portable:freshFlame(spec.portable.entryEffect,spec.portable.capacity),ember:null}),
  enter:ctx=>{
    ctx.run.ember=ctx.persistent.ember?{...ctx.persistent.ember}:null;ctx.state.inventory[ctx.spec.emberItem]=Number(ctx.run.ember!==null);
    ctx.state.inventory[ctx.spec.portable.item]=1;
    const f=ctx.spec.fixtures.find(f=>f.id===ctx.spec.entryFixture);ctx.persistent.fixtures[f.id]=freshFlame(f.effect,f.capacity);
    ctx.engine.notify('入口の灯番から、くらがり除けの松明を受け取りました。携帯松明と台座の火を確かめて進んでください。');
  },
  leave:ctx=>{ctx.persistent.ember=ctx.run.ember?{...ctx.run.ember}:null;ctx.state.inventory[ctx.spec.portable.item]=0;},
  step:ctx=>{
    burn(ctx.run.portable,ctx.spec.portable.capacity,ctx.spec.portable.warnings,t=>ctx.engine.notify(t),'携帯松明');
    for(const f of ctx.spec.fixtures){const nearby=closeTo(ctx,f);burn(ctx.persistent.fixtures[f.id],f.capacity,[],t=>{if(nearby)ctx.engine.notify(t);},f.name);}
  },
  fieldParameters:ctx=>({...fireEnvironment(ctx),fuel:ctx.run.portable.fuel}),
  encounter:ctx=>fireEnvironment(ctx),
  plan,act,project,validate,validateState
};

export function setPortableFire(data,state,{fuel,effect}){
 const ctx=fireContext(data,state);if(!ctx||!Number.isInteger(fuel)||fuel<0||fuel>ctx.spec.portable.capacity||fuel>0&&!ctx.spec.effects[effect])throw Error("携行松明の状態指定が不正です");
 const next={lit:fuel>0,fuel,effect:fuel>0?effect:null};
 if(Object.entries(next).some(([key,value])=>ctx.run.portable[key]!==value)){Object.assign(ctx.run.portable,next);signalFieldChange(data,state,'light');}
}
