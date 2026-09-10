import {recordDefeated,recordResult} from './records.js';
import {skillDefinitionErrors} from './job-validation.js';
import {clone} from './expression.js';
import {pushBranch,pump} from './script.js';
import {passives,permission,costProblem,payCost} from './jobs.js';
import {unitKey,buffStats,buffResistance,addBuff,tickBuffs} from './buffs.js';
export function startBattle(engine,id,continuations){
  if(engine.state.battle)throw new Error('戦闘は重複して開始できません');
  const encounter=engine.data.encounters[id];if(!encounter)throw new Error(`不明な戦闘: ${id}`);
  engine.state.records.battles++;
  engine.state.battle={recordedKills:[],encounter:id,round:1,enemies:encounter.enemies.map((id,i)=>({...clone(engine.data.enemies[id]),instance:`enemy_${i}`,hp:engine.data.enemies[id].stats.hp,mp:engine.data.enemies[id].stats.mp,statuses:[],guard:false})),acted:[],guards:[],buffs:[],covers:[],analyzed:[],continuations:clone(continuations),log:[encounter.text],musicBefore:engine.state.presentation.music};
  engine.state.waiting={type:'battle'};engine.state.presentation.music='battle';engine.log(encounter.text);engine.eventCue('encounter');
}
export function activeActor(engine){
  const s=engine.state,b=s.battle;if(!b)return null;
  return [...s.members].sort((a,c)=>engine.stats(c).agi-engine.stats(a).agi).find(id=>s.actors[id].hp>0&&!b.acted.includes(id))??null;
}
export const enemyStats=(engine,enemy)=>buffStats(engine.data,engine.state.battle,unitKey(enemy),enemy.stats);
function endBattle(engine,result){
  const s=engine.state,b=s.battle,continuation=b.continuations;
  recordResult(engine,result);
  s.presentation.music=b.musicBefore;s.battle=null;s.waiting=null;
  if(result==='lose'){
    engine.defeat();
    if(continuation.frame){pushBranch(engine,continuation.frame,continuation.index,[continuation.lose]);pump(engine);}
    return;
  }
  engine.eventCue(result==='win'?'victory':'escape');
  if(result==='win'){
    const gold=b.enemies.reduce((n,e)=>n+e.rewards.gold,0),xp=b.enemies.reduce((n,e)=>n+e.rewards.xp,0);
    engine.award(gold,xp);engine.notify(`勝利しました。${gold}G・${xp}EXP。`);
  }else engine.notify('戦闘から離脱しました。依頼の決着はついていません。');
  if(continuation.frame)pushBranch(engine,continuation.frame,continuation.index,[continuation[result]]);
  pump(engine);
}
function effectsProblem(data,skill){return skillDefinitionErrors(data,skill).join(' / ');}

export function battleSkillPlan(engine,actorId,skillId,targetId){
  const s=engine.state,b=s.battle,skill=Object.hasOwn(engine.data.skills,skillId??'')?engine.data.skills[skillId]:null;
  const fail=reason=>({ok:false,reason});
  if(!b||!s.members.includes(actorId)||!s.actors[actorId])return fail('戦闘中の隊員ではありません。');
  if(!skill)return fail('技能がありません。');
  const grant=permission(engine.data,s,actorId,skillId,'battle.skill');
  if(!grant)return fail('この職業・レベルでは習得していません。');
  const reason=effectsProblem(engine.data,skill)||costProblem(engine.data,s,actorId,skill);if(reason)return fail(reason);
  let targets;
  if(skill.target==='all_enemies')targets=b.enemies.filter(e=>e.hp>0);
  else if(skill.target==='all_allies')targets=s.members.map(id=>s.actors[id]).filter(a=>a.hp>0);
  else if(skill.target==='self')targets=[s.actors[actorId]];
  else if(skill.target==='ally')targets=s.members.includes(targetId)&&s.actors[targetId]?.hp>0?[s.actors[targetId]]:[];
  else if(skill.target==='enemy')targets=b.enemies.filter(e=>e.instance===targetId&&e.hp>0);
  else return fail('対象種別が未対応です。');
  if(skill.selection==='lowest_hp_ratio')targets.sort((a,c)=>a.hp/engine.stats(a.id).hp-c.hp/engine.stats(c.id).hp);
  if(!Number.isInteger(grant.maxTargets)||grant.maxTargets<1)return fail('対象数の許可が不正です。');
  targets=targets.slice(0,Math.min(grant.maxTargets,skill.maxTargets??grant.maxTargets));
  if(!targets.length)return fail('生存する対象を選んでください。');
  if(skill.effects.some(e=>e.type==='cover')&&targets.some(t=>t.id===actorId||t.instance))return fail('かばう相手は自分以外の味方です。');
  if(skill.effects.some(e=>e.type==='analyze')&&targets.some(t=>!t.instance))return fail('解析の対象は敵です。');
  if(skill.requiresAnalyzed&&targets.some(t=>!b.analyzed.includes(t.instance)))return fail('先にこの敵を魔物解析してください。');
  return {ok:true,skill,targets};
}
function applySkill(engine,source,target,skill,skillId,enemySource=false,itemId=null){
  const b=engine.state.battle,s=engine.state;
  const sourceStats=enemySource?enemyStats(engine,source):engine.stats(source.id);
  const targetStats=target.instance?enemyStats(engine,target):engine.stats(target.id);
  const powers=enemySource?{}:passives(engine.data,s,source.id),targetName=target.name??engine.data.actors[target.id]?.name;
  for(const effect of skill.effects){
    if(effect.type==='guard'){
      if(target.instance)target.guard=true;else if(!b.guards.includes(target.id))b.guards.push(target.id);
      b.log.push(`${targetName}は守りを固めた。`);continue;
    }
    if(effect.type==='buff'){addBuff(engine,effect.buff,target,source,skillId);b.log.push(`${targetName}：${engine.data.buffs[effect.buff].name}。`);continue;}
    if(effect.type==='cover'){
      b.covers=b.covers.filter(c=>c.sourceActor!==source.id);
      b.covers.push({target:unitKey(target),sourceActor:source.id,sourceJob:source.job,sourceSkill:skillId,remaining:1});
      b.log.push(`${engine.data.actors[source.id].name}は${targetName}をかばう。`);continue;
    }
    if(effect.type==='analyze'){if(!b.analyzed.includes(target.instance))b.analyzed.push(target.instance);b.log.push(`${targetName}の能力と耐性を記録した。`);continue;}
    const context={source:{...source,stats:sourceStats},target:{...target,stats:targetStats}};
    const raw=Math.max(0,effect.formula?engine.value(engine.data.formulas[effect.formula],context):effect.amount??0);
    if(effect.type==='damage'){
      const guarded=target.instance?target.guard:b.guards.includes(target.id);
      const elementScale=(target.resist?.[effect.element]??engine.data.actors[target.id]?.resist?.[effect.element]??1)*buffResistance(engine.data,b,unitKey(target),effect.element);
      const power=(powers[effect.element==='physical'?'physicalPower':'magicPower']??1)*(powers.elementPower?.[effect.element]??1);
      const taken=target.instance?1:(passives(engine.data,s,target.id).damageTaken??1);
      const damage=Math.max(1,Math.floor(Math.floor(raw)*power*(guarded?engine.data.system.guardRate:1)*elementScale*taken));
      target.hp=Math.max(0,target.hp-damage);recordDefeated(engine);b.log.push(`${enemySource?source.name:engine.data.actors[source.id].name}の${skill.name}。${targetName}に${damage}。`);
    }
    if(effect.type==='heal'){
      const multiplier=effect.itemHealing||itemId==='potion'?(powers.itemHealing??1):itemId?1:(powers.healingPower??1);
      const amount=Math.floor(raw*multiplier*(effect.scale??1)),restored=Math.min(targetStats.hp-target.hp,amount);
      target.hp+=restored;b.log.push(`${targetName}のHPが${restored}回復。`);
    }
    if(effect.type==='drain_mp'){const spent=Math.min(target.mp,Math.floor(raw));target.mp-=spent;b.log.push(`${targetName}のMPが${spent}減少。`);}
    if(effect.type==='restore_mp'){const restored=Math.min(targetStats.mp-target.mp,Math.floor(raw));target.mp+=restored;b.log.push(`${targetName}のMPが${restored}回復。`);}
    if(effect.type==='status'&&target.hp>0&&!(target.statusImmune??engine.data.actors[target.id]?.statusImmune??[]).includes(effect.status)&&engine.random()<(effect.chance??1)&&!target.statuses.includes(effect.status)){
      target.statuses.push(effect.status);b.log.push(`${targetName}は${engine.data.statuses[effect.status].name}になりました。`);
    }
    if(effect.type==='cleanse')target.statuses=[];
  }
}
function coveredTarget(engine,target,skill){
  if(skill.target!=='enemy'||!skill.effects.some(e=>e.type==='damage'))return target;
  const s=engine.state,b=s.battle;
  const id=s.members.find(id=>id!==target.id&&s.actors[id].hp>0&&b.covers.some(c=>c.target===unitKey(target)&&c.sourceActor===id&&c.remaining>0));
  if(!id)return target;
  b.log.push(`${engine.data.actors[id].name}が${engine.data.actors[target.id].name}をかばった。`);
  return s.actors[id]; // One redirect only: no cover chains.
}
function enemiesTurn(engine){
  const s=engine.state,b=s.battle;
  for(const enemy of b.enemies)if(enemy.hp>0)for(const status of enemy.statuses){const damage=engine.data.statuses[status].turnDamage??0;enemy.hp=Math.max(0,enemy.hp-damage);recordDefeated(engine);if(damage)b.log.push(`${enemy.name}は${engine.data.statuses[status].name}で${damage}ダメージ。`);}
  if(b.enemies.every(e=>e.hp<=0)){endBattle(engine,'win');return;}
  for(const enemy of [...b.enemies].sort((a,c)=>enemyStats(engine,c).agi-enemyStats(engine,a).agi)){
    if(enemy.hp<=0)continue;enemy.guard=false;
    const alive=s.members.filter(id=>s.actors[id].hp>0);if(!alive.length)break;
    const rule=[...enemy.ai].sort((a,c)=>c.priority-a.priority).find(r=>(!r.condition||engine.value(r.condition,{self:{...enemy,hp_ratio:enemy.hp/enemy.stats.hp,round:b.round}}))&&enemy.mp>=engine.data.skills[r.skill].mp);
    if(!rule)continue;
    const skill=engine.data.skills[rule.skill];enemy.mp-=skill.mp;
    const targetId=rule.target==='weakest'?alive.reduce((a,c)=>s.actors[c].hp<s.actors[a].hp?c:a):alive[Math.floor(engine.random()*alive.length)];
    let targets;
    if(skill.target==='all_enemies')targets=alive.map(id=>s.actors[id]);
    else if(skill.target==='all_allies')targets=b.enemies.filter(e=>e.hp>0);
    else if(rule.target==='self'||skill.target==='self')targets=[enemy];
    else if(skill.target==='ally')targets=[b.enemies.filter(e=>e.hp>0).sort((a,c)=>a.hp/a.stats.hp-c.hp/c.stats.hp)[0]];
    else targets=[coveredTarget(engine,s.actors[targetId],skill)];
    if(!skill.effects.length)b.log.push(`${enemy.name}は${skill.name}。`);
    engine.cue(engine.data.presentation?.bindings.skills[rule.skill],targets.map(unitKey));
    for(const target of targets)applySkill(engine,enemy,target,skill,rule.skill,true);
  }
  for(const id of s.members){const a=s.actors[id];if(a.hp<=0)continue;for(const status of a.statuses){const damage=engine.data.statuses[status].turnDamage??0;a.hp=Math.max(0,a.hp-damage);if(damage)b.log.push(`${engine.data.actors[id].name}は${engine.data.statuses[status].name}で${damage}ダメージ。`);}}
  if(s.members.every(id=>s.actors[id].hp<=0)){endBattle(engine,'lose');return;}
  tickBuffs(b);b.acted=[];b.guards=[];b.round++;b.log=b.log.slice(-30);
}
export function battleAction(engine,intent){
  const s=engine.state,b=s.battle,actorId=activeActor(engine);if(!b||!actorId)return false;
  const actor=s.actors[actorId];
  if(intent.action==='escape'){
    if(!engine.data.encounters[b.encounter].escape)return false;
    if(engine.random()<Math.min(1,engine.data.system.escapeRate+engine.partyEffect('escapeBonus',0,'max')))endBattle(engine,'escape');
    else{b.log.push('退路を塞がれました。');enemiesTurn(engine);}return true;
  }
  if(intent.action==='item'){
    const item=engine.data.items[intent.item],target=s.actors[intent.target];
    if(!item?.battleSkill||!(s.inventory[intent.item]>0)||!s.members.includes(intent.target)||!target||target.hp<=0)return false;
    const skill=engine.data.skills[item.battleSkill];if(!skill||effectsProblem(engine.data,skill))return false;
    engine.cue(engine.data.presentation?.bindings.skills[item.battleSkill],[unitKey(target)]);
    engine.give(intent.item,-1);applySkill(engine,actor,target,skill,item.battleSkill,false,intent.item);
  }else if(intent.action==='skill'){
    const plan=battleSkillPlan(engine,actorId,intent.skill,intent.target);
    if(!plan.ok){engine.notify(plan.reason);return false;}
    const {skill,targets}=plan;payCost(engine,actorId,skill);
    engine.cue(engine.data.presentation?.bindings.skills[intent.skill],targets.map(unitKey));
    for(const target of targets)applySkill(engine,actor,target,skill,intent.skill);
    if(skill.selfEffects?.length)applySkill(engine,actor,actor,{...skill,effects:skill.selfEffects},intent.skill);
  }else return false;
  b.acted.push(actorId);
  if(b.enemies.every(e=>e.hp<=0)){endBattle(engine,'win');return true;}
  if(!activeActor(engine))enemiesTurn(engine);
  return true;
}
