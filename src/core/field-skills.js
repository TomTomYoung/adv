import {permission,costProblem,payCost} from './jobs.js';
import {applySkill} from './battle.js';
import {dungeonEffectActive} from './dungeons.js';

export function fieldSkillPlan(engine,actorId,skillId,targetId){
  const {data:d,state:s}=engine,skill=d.skills[skillId],fail=reason=>({ok:false,reason});
  if(!skill?.fieldUse)return fail('この技能は戦闘時に使用する。');
  if(!['town','dungeon'].includes(s.mode)||s.waiting||s.battle||s.battleResult)return fail('会話や戦闘が終わってから使う。');
  if(!s.members.includes(actorId))return fail('出撃メンバーだけが使える。');
  const grant=permission(d,s,actorId,skillId,'battle.skill');
  if(!grant)return fail('現在の職業・レベルでは使えない。');
  if(!dungeonEffectActive(d,s,'skill',skillId))return fail('この場所では効果が停止している。');
  if(!skill.effects.length||skill.effects.some(e=>!['heal','cleanse','restore_mp'].includes(e.type))||skill.selfEffects?.length)return fail('戦闘外で使えない効果がある。');
  const reason=costProblem(d,s,actorId,skill);if(reason)return fail(reason);
  let ids=skill.target==='self'?[actorId]:skill.target==='all_allies'?s.members:skill.target==='ally'&&s.members.includes(targetId)?[targetId]:[];
  ids=ids.filter(id=>s.actors[id].hp>0);
  if(skill.selection==='lowest_hp_ratio')ids=[...ids].sort((a,b)=>s.actors[a].hp/engine.stats(a).hp-s.actors[b].hp/engine.stats(b).hp);
  ids=ids.slice(0,Math.min(grant.maxTargets,skill.maxTargets??grant.maxTargets));
  if(!ids.length)return fail('生存している仲間を選ぶ。');
  const useful=ids.some(id=>{const a=s.actors[id],stats=engine.stats(id);return skill.effects.some(e=>e.type==='heal'?a.hp<stats.hp:e.type==='restore_mp'?a.mp<stats.mp:a.statuses.some(status=>!e.status||status===e.status));});
  if(!useful)return fail('回復が必要な仲間がいない。');
  return {ok:true,skill,targets:ids.map(id=>s.actors[id])};
}
export function useFieldSkill(engine,actorId,skillId,targetId){
  const plan=fieldSkillPlan(engine,actorId,skillId,targetId);if(!plan.ok){engine.notify(plan.reason);return false;}
  payCost(engine,actorId,plan.skill);
  for(const target of plan.targets)applySkill(engine,engine.state.actors[actorId],target,plan.skill,skillId);
  engine.cue(engine.data.presentation?.bindings.skills[skillId],plan.targets.map(a=>`actor:${a.id}`));
  engine.notify(`${engine.data.actors[actorId].name}は${plan.skill.name}を使った。`);return true;
}
