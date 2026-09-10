import {clone} from '../core/expression.js';
import {actorJob,grantsFor,jobChangePlan,fieldActionPlan,canEquip} from '../core/jobs.js';
import {buffView} from '../core/buffs.js';
import {battleSkillPlan,enemyStats} from '../core/battle.js';
const labels={physicalPower:'物理威力',magicPower:'魔法威力',damageTaken:'被ダメージ',healingPower:'回復威力',itemHealing:'戦闘中の傷薬',revealRadius:'探索視界',trapDamage:'罠ダメージ',encounterRate:'遭遇率',escapeBonus:'逃走率加算',lightSaveEvery:'灯油節約',shopDiscount:'商店割引',retreatCost:'帰還費用'};
const elements={physical:'物理',fire:'炎',ice:'氷',lightning:'雷',water:'水',light:'光',earth:'地',dark:'闇'};
export function passiveText(values){
  return Object.entries(values).map(([key,n])=>{
    if(key==='elementPower')return Object.entries(n).map(([el,rate])=>`${elements[el]}威力 ×${rate}`).join(' / ');
    if(key==='lightSaveEvery')return `${n}歩ごとに灯油消費を1回節約`;
    if(key==='revealRadius')return `探索視界 ${n}マス`;
    if(['escapeBonus','shopDiscount'].includes(key))return `${labels[key]} ${Math.round(n*100)}%`;
    return `${labels[key]} ×${n}`;
  });
}
export function jobCatalog(engine){
  const d=engine.data;
  return Object.values(d.jobs??{}).map(job=>({id:job.id,name:job.name,role:job.role,limitation:job.limitation,growth:clone(job.growth),equipment:clone(job.equipment),passives:passiveText(job.passives),grants:job.grants.map(g=>({id:g.skill,level:g.level,api:g.api,name:(g.api==='battle.skill'?d.skills[g.skill]:d.fieldAbilities[g.skill]).name}))}));
}
export function projectActorJob(engine,id){
  const d=engine.data,s=engine.state,a=s.actors[id],job=actorJob(d,s,id);
  if(!job)return {};
  return {
    job:job.id,class:job.name,role:job.role,passives:passiveText(job.passives),growth:clone(job.growth),
    growthHistory:Object.entries(a.growthHistory).filter(([,count])=>count>0).map(([id,count])=>({id,name:id==='legacy'?'旧版の成長':d.jobs[id].name,count})),
    buffs:buffView(d,s.battle,`actor:${id}`),
    covering:(s.battle?.covers??[]).filter(c=>c.sourceActor===id).map(c=>({name:d.actors[c.target.slice(6)].name,remaining:c.remaining})),
    jobOptions:Object.values(d.jobs).map(j=>{const plan=jobChangePlan(d,s,id,j.id);return {id:j.id,current:j.id===a.job,enabled:plan.ok,reason:plan.reason??'',stats:plan.ok?clone(plan.stats):null,returned:(plan.returned??[]).map(item=>d.items[item].name)};}),
    fieldAbilities:grantsFor(d,s,id).filter(g=>g.api!=='battle.skill').map(g=>{const spec=d.fieldAbilities[g.skill],plan=fieldActionPlan(d,s,id,g.skill);return {id:g.skill,name:spec.name,level:g.level,mp:spec.mp,description:spec.description,enabled:plan.ok,reason:plan.reason??''};})
  };
}
export function projectBattleSkills(engine,id){
  if(!id)return [];
  const s=engine.state,d=engine.data;
  return engine.skills(id).map(skillId=>{
    const skill=d.skills[skillId],ids=skill.target==='enemy'?s.battle.enemies.map(e=>e.instance):skill.target==='ally'?s.members:[id];
    const availability=Object.fromEntries(ids.map(target=>{const plan=battleSkillPlan(engine,id,skillId,target);return [target,{enabled:plan.ok,reason:plan.reason??''}];}));
    const values=Object.values(availability),enabled=values.some(v=>v.enabled);
    const cost=[skill.mp?`MP${skill.mp}`:'',skill.hp?`HP${skill.hp}`:'',...Object.entries(skill.materials??{}).map(([item,n])=>`${d.items[item].name}×${n}`)].filter(Boolean).join(' / ');
    return {id:skillId,...clone(skill),enabled,availability,cost,reason:enabled?'':values[0]?.reason??'対象がありません。'};
  });
}
export function projectEnemyJob(engine,enemy){
  return {buffs:buffView(engine.data,engine.state.battle,`enemy:${enemy.instance}`),analysis:engine.state.battle.analyzed.includes(enemy.instance)?{stats:enemyStats(engine,enemy),mp:enemy.mp,resist:clone(enemy.resist??{})}:null};
}
export function allowedEquipmentActors(engine,item){return engine.state.members.filter(id=>canEquip(engine.data,engine.state,id,item)&&engine.state.actors[id].hp>0);}
