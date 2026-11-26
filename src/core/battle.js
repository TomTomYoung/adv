import {fatalHitHabit} from './monster-habits.js';
import {familyTurn} from './monster-family-actions.js';
import {depth, familyAccuracy, familyAfterHit, familyAfterMove, familyIntercept, familyPower, syncFamilyBattle} from './monster-family-field.js';
import {EMBER_MOTH, hasWhistled, joinReinforcements, mothSummonPositions, summonMoths} from './battle-reinforcements.js';
import {cleanseCandidates, consumeWaterWard, hasActiveStatus} from './status-effects.js';
import {battleAlive,frontlinePresent,frontlineState,removeFrontline,knockbackFrontline,syncFrontlineDefeats} from './frontline-lifecycle.js';
import {isFrontline,frontPosition,frontlineUnits,frontlineMovePlan,moveFrontline,prepareFrontlineRound,traceFrontline,frontlineRevivePosition} from './battle-frontline.js';
import {frontlineTargetPlan,frontlineSelections,frontlineProfile} from './frontline-targeting.js';
import {resolveFrontlineAttack} from './frontline-resolution.js';
const spatial=s=>isGrid(s)||isFrontline(s);
const targetPlan=(...args)=>(isFrontline(args[0].state)?frontlineTargetPlan:gridTargetPlan)(...args);
const targetSelections=(...args)=>(isFrontline(args[0].state)?frontlineSelections:gridSelections)(...args);
import {isGrid,gridStart,gridMovePlan,gridCells,position,distance,revivePosition} from './battle-grid.js';
import {gridTargetPlan,gridSelections,targetingProfile} from './battle-targeting.js';
import {effectiveSkill,recordSkillUse} from './skill-levels.js';
import {resolvePreemptive,applyStun,consumeStun,applyGuard,clearGuard,stunned,guardLevel,guardDamageRate} from './battle-turns.js';
import {applyStatus,removeStatus,statusStats,tickStatuses,applyStatusClock,recoverStatuses,statusAbilityReason,statusActionReason,rollActionStatus,statusAccuracy,statusEffectAtLevel,activeStatuses,statusControl,clearBattleStatuses,wakeOnDamage,criticalChance,CRITICAL_DAMAGE_MULTIPLIER} from './status-effects.js';
import {ignitionReason} from './fire-hazards.js';
import {beginBattleResult} from './battle-results.js';
import {wetResistance,wetAfterSkill,wetSkillBlocked} from './wet.js';
import {canRepel,kindlePortable} from './systems/fire-network.js';
import {dungeonBattleStart,dungeonBattleRound,dungeonBattleEnd,dungeonAbilityReason,dungeonEffectActive,dungeonBuffs,dungeonDamageScale} from './dungeons.js';
import {scaledEnemy} from './enemy.js';
import {recordDefeated,recordResult} from './records.js';
import {skillDefinitionErrors} from './job-validation.js';
import {clone} from './expression.js';
import {pushBranch,pump} from './script.js';
import {passives,permission,costProblem,payCost} from './jobs.js';
import {buffAccuracy,unitKey,buffStats,buffResistance,addBuff,tickBuffs,actionBuffs,actionPower,takePhysicalHit} from './buffs.js';
import {triggerBattleEvent} from './battle-events.js';
import {consumeFieldBattleSignals} from './field-signals.js';
import {describeTarget,emitFeedback,playBattleCue} from './feedback.js';
export function startBattle(engine,id,continuations,options={}){
  if(engine.state.battle||engine.state.battleResult)throw new Error('戦闘は重複して開始できません');
  const encounter=engine.data.encounters[id];if(!encounter)throw new Error(`不明な戦闘: ${id}`);
  let enemyScale=options.enemyScale??1;
  if(encounter.progression){
    const {actors,members}=engine.state;
    const levels=members.filter(id=>actors[id].hp>0).map(id=>actors[id].level);
    if(levels.length){
      const partyLevel=Math.round(levels.reduce((a,b)=>a+b,0)/levels.length);
      const {dungeon,level}=encounter.progression;
      const {underlevelMultipliers,fullPressureLevel}=engine.data.encounterGroups.dungeons[dungeon].progression;
      const gap=Math.max(0,Math.min(level-partyLevel,underlevelMultipliers.length-1));
      enemyScale*=1+(underlevelMultipliers[gap]-1)*Math.min(1,level/fullPressureLevel);
    }
  }
  const layout=gridStart(engine.data,engine.state,encounter,options);
  consumeFieldBattleSignals(engine.data,engine.state);
  dungeonBattleStart(engine);
  engine.state.records.battles++;
  engine.state.battle={...layout,recordedKills:[],encounter:id,round:1,enemies:encounter.enemies.map((id,i)=>scaledEnemy(engine.data.enemies[id],i,enemyScale)),acted:[],turnQueue:null,turnIndex:0,guards:[],buffs:[],covers:[],analyzed:[],continuations:clone(continuations),log:[encounter.text],musicBefore:engine.state.presentation.music};
  if(isFrontline(engine.state))for(const key of encounter.frontlineDown??[]){const u=frontlineUnits(engine.state).find(u=>unitKey(u)===key);u.hp=0;}
  if(enemyScale!==1)engine.state.battle.enemyScale=enemyScale;
  // Battles saved before the pace change finish with their original reward.
  if(encounter.progression)engine.state.battle.pacedExperience=true;
  Object.assign(engine.state.battle,{firedEvents:[],event:null,pendingResult:null});
  if(options.manualTurns===true)engine.state.battle.manualTurns=true;
  if(encounter.reinforcements)engine.state.battle.reinforcements=[];
  syncFamilyBattle(engine);
  resolvePreemptive(engine,encounter,options);
  prepareFrontlineRound(engine,(u,on,attacker)=>frontlineReact(engine,u,on,attacker));
  engine.state.waiting={type:'battle'};engine.state.presentation.music='battle';engine.log(encounter.text);engine.eventCue('encounter');
  if(engine.state.members.every(id=>!battleAlive(engine.state,engine.state.actors[id])))endBattle(engine,'lose');
  else if(!triggerBattleEvent(engine,'start'))continuePreemptive(engine);
}
export function activeActor(engine){
  const s=engine.state,b=s.battle;if(!b||b.event||b.preemptive?.side==='enemies')return null;
  if(b.preemptive?.side==='allies')return [...s.members].sort((a,c)=>engine.stats(c).agi-engine.stats(a).agi).find(id=>battleAlive(s,s.actors[id]))??null;
  const key=b.turnQueue?.[b.turnIndex],id=key?.startsWith('actor:')?key.slice(6):null;
  return id&&battleAlive(s,s.actors[id])?id:null;
}
export function enemyStats(engine,enemy) {
  const stats=buffStats(engine.data,dungeonBuffs(engine.data,engine.state),unitKey(enemy),statusStats(engine.data,engine.state,enemy,enemy.stats));
  if (enemy.classSkill==='family_ogre_5_rock' && enemy.tactics?.spent) stats.agi+=4;
  return stats;
}
export function endBattle(engine,result,skipEvents=false){
  const s=engine.state,b=s.battle,continuation=b.continuations;
  if(!skipEvents){b.pendingResult=result;if(triggerBattleEvent(engine,'before_end'))return;}
  recordResult(engine,result);
  dungeonBattleEnd(engine,b,result);
  for(const actor of Object.values(s.actors))clearBattleStatuses(engine.data,actor);
  s.presentation.music=b.musicBefore;s.battle=null;s.waiting=null;
  if(result==='lose'){
    const rolledBack=engine.defeat();
    if(continuation.frame&&!rolledBack){pushBranch(engine,continuation.frame,continuation.index,[continuation.lose]);pump(engine);}
    return;
  }
  if(result!=='interrupted')engine.eventCue(result==='win'?'victory':'escape');
  if(result==='win'){
    beginBattleResult(engine,b);return;
  }else if(result==='repel')engine.notify('くらがりは火を恐れ、通路の奥へ逃げ去りました。携帯松明にくらがり除けの火が灯っています。');
  else if(result==='interrupted')engine.notify('戦闘が終了した。');
  else engine.notify('戦闘から離脱しました。依頼の決着はついていません。');
  if(continuation.frame)pushBranch(engine,continuation.frame,continuation.index,[result==='interrupted'?'on_interrupt':continuation[result==='repel'?'escape':result]]);
  pump(engine);
}
function effectsProblem(data,skill,s){const errors=skillDefinitionErrors(data,skill);if(errors.length)return errors.join(' / ');return !isFrontline(s)&&[...skill.effects,...(skill.selfEffects??[])].some(e=>e.type.startsWith('frontline_'))?'前中後衛専用の技能です。':'';}

export function battleSkillPlan(engine,actorId,skillId,targetId,options={}){
  const s=engine.state,b=s.battle,skill=Object.hasOwn(engine.data.skills,skillId??'')?effectiveSkill(engine.data,s,actorId,skillId):null;
  const fail=reason=>({ok:false,reason});
  if(!b||b.event||!s.members.includes(actorId)||!s.actors[actorId])return fail('戦闘の行動待ちではありません。');
  if(!skill)return fail('技能がありません。');
  const restriction=dungeonAbilityReason(engine.data,s,skillId,'battle.skill');if(restriction)return fail(restriction);
  const grant=permission(engine.data,s,actorId,skillId,'battle.skill');
  if(!grant)return fail('この職業・レベルでは習得していません。');
  const reason=statusAbilityReason(engine.data,s,s.actors[actorId],skillId)||effectsProblem(engine.data,skill,s)||costProblem(engine.data,s,actorId,skill);if(reason)return fail(reason);
  if(skill.effects.some(e=>e.type==='repel')){
    if(!canRepel(engine.data,s,skill))return fail('この火で撃退できるのは、篝火の迷宮のくらがりです。');
    const wetReason=ignitionReason(engine.data,s);if(wetReason)return fail(wetReason);
  }
  if(spatial(s)){
    if(!Number.isInteger(grant.maxTargets)||grant.maxTargets<1)return fail('対象数の許可が不正です。');
    return targetPlan(engine,s.actors[actorId],skill,skillId,targetId,{limit:Math.min(grant.maxTargets,skill.maxTargets??grant.maxTargets),...options});
  }
  let targets;
  if(skill.target==='all_enemies')targets=b.enemies.filter(e=>battleAlive(s,e));
  else if(skill.target==='all_allies')targets=s.members.map(id=>s.actors[id]).filter(a=>battleAlive(s,a));
  else if(skill.target==='self')targets=[s.actors[actorId]];
  else if(skill.target==='ally')targets=s.members.includes(targetId)&&battleAlive(s,s.actors[targetId])?[s.actors[targetId]]:[];
  else if(skill.target==='enemy')targets=b.enemies.filter(e=>e.instance===targetId&&battleAlive(s,e));
  else return fail('対象種別が未対応です。');
  if(skill.selection==='lowest_hp_ratio')targets.sort((a,c)=>a.hp/engine.stats(a.id).hp-c.hp/engine.stats(c.id).hp);
  if(!Number.isInteger(grant.maxTargets)||grant.maxTargets<1)return fail('対象数の許可が不正です。');
  if (skill.selection !== 'random_distinct') targets=targets.slice(0,Math.min(grant.maxTargets,skill.maxTargets??grant.maxTargets));
  if(!targets.length)return fail('生存する対象を選んでください。');
  if(skill.effects.some(e=>e.type==='cover')&&targets.some(t=>t.id===actorId||t.instance))return fail('かばう相手は自分以外の味方です。');
  if(skill.effects.some(e=>e.type==='analyze')&&targets.some(t=>!t.instance))return fail('解析の対象は敵です。');
  if(skill.requiresAnalyzed&&targets.some(t=>!b.analyzed.includes(t.instance)))return fail('先にこの敵を魔物解析してください。');
  return {ok:true,skill,targets};
}
// A habit is a hit reaction, not a turn. The blast uses the dead monster's
// magic and normal damage mitigation, but spends no MP and ignores casting restrictions.
function resolveFatalHit(engine, monster, habit, habitImpacts) {
  const {state, data} = engine;
  const hp = monster.hp;
  monster.hp = 0;
  state.battle.log.push(`${monster.name}の習性「${habit.name}」が発動し、燃え尽きた。`);
  recordDefeated(engine);
  if (!habit.burstSkill) return hp;
  const living = state.members.map(id => state.actors[id]).filter(actor => battleAlive(state, actor));
  if (living.length) {
    const target = living[Math.floor(engine.random() * living.length)];
    const skill = data.skills[habit.burstSkill];
    const result = {...describeTarget(engine, unitKey(target)), hpBefore: target.hp};
    result.damage = applySkill(engine, monster, target, {...skill, name: habit.name}, null, true, null, false, null, 1, result);
    result.hpAfter = target.hp;
    result.defeated = target.hp === 0;
    const cue = data.presentation?.cues[data.presentation.bindings.skills[habit.burstSkill]];
    if (cue) {
      const impact = {effects: cue.effects, sound: cue.sound, source: describeTarget(engine, unitKey(monster)), targets: [result], phase: 'impact', action: habit.name};
      if (habitImpacts) habitImpacts.push(impact);
      else emitFeedback(engine, impact);
    }
  }
  return hp;
}
function igniteOil(engine,unit) {
  const {data,state} = engine;
  if (unit.hp <= 0 || !hasActiveStatus(data,state,unit,'oiled')) return;
  removeStatus(unit,'oiled');
  if (applyStatus(data,state,unit,'ablaze')) state.battle.log.push(`${unit.name ?? data.actors[unit.id].name}の油に引火し、火だるまになった。`);
}
function isProjectile(data,source,skill,skillId) {
  if (skill.projectile) return true;
  if (skillId !== 'attack') return false;
  if (source.instance) return source.classSkill === 'family_orc_10_cart' && source.tactics?.spent;
  return data.items[source.equipment?.weapon]?.equipmentType === 'bow';
}
export function applySkill(engine,source,target,skill,skillId,enemySource=false,itemId=null,checkAccuracy=true,series=null,physicalPower=1,feedback=null,habitImpacts=null){
  let damageTotal=0,critical=null,wakeChecked=false;
  const b=engine.state.battle,s=engine.state;
  if(isFrontline(s)&&!frontlinePresent(s,target))return 0;
  const sourceStats=series?.snapshot.sourceStats??(enemySource?enemyStats(engine,source):engine.stats(source.id));
  const targetStats=series?.snapshot.targetStats??(target.instance?enemyStats(engine,target):engine.stats(target.id));
  const powers=enemySource?{}:passives(engine.data,s,source.id),targetName=target.name??engine.data.actors[target.id]?.name;
  if(skillId!==null&&!dungeonEffectActive(engine.data,s,'skill',skillId)){(b?.log??s.log).push(`${skill.name}の効果は境界に遮られました。`);return;}
  if(target.hp<=0&&skill.effects.some(e=>e.type==='purge_undead')){
    if(isFrontline(s)&&target.instance&&engine.data.enemies[target.id]?.undead&&frontlineState(s,target)==='down'){removeFrontline(engine,target);b.log.push(`${target.name}の残骸を祓った。`);}
    return 0;
  }
  const offensive=skill.effects.some(e=>['damage','drain_mp','stun','frontline_remove','frontline_knockback'].includes(e.type)||e.type==='status'&&!statusEffectAtLevel(engine.data,e.status,e.level??1)?.beneficial||e.type==='buff'&&(engine.data.buffs[e.buff]?.blocksMovement||engine.data.buffs[e.buff]?.classicAccuracyPenalty>0||Object.values(engine.data.buffs[e.buff]?.stats??{}).some(n=>n<1)||Object.values(engine.data.buffs[e.buff]?.resist??{}).some(n=>n>1)));
  const accuracy=offensive&&checkAccuracy?(series?.snapshot.accuracy??buffAccuracy(engine.data,s.battle,source,statusAccuracy(engine.data,s,source))):1;
  const chanceToHit=offensive&&checkAccuracy?familyAccuracy(engine,source,target,accuracy):accuracy;
  if(chanceToHit<1&&engine.random()>=chanceToHit){if(series)series.didHit=false;if(feedback)feedback.missed=true;(b?.log??s.log).push(`${source.name??engine.data.actors[source.id]?.name}の${skill.name}は${targetName}に当たらなかった。`);return 0;}
  if (offensive && hasActiveStatus(engine.data,s,target,'aegis_ward') && isProjectile(engine.data,source,skill,skillId)) {
    removeStatus(target,'aegis_ward');
    if (feedback) { feedback.guarded=true; feedback.blocked=true; }
    b.log.push(`${targetName}の飛び道具の結界が${skill.name}を防いで消えた。`);
    return 0;
  }
  for(const effect of skill.effects){
    if(effect.type==='frontline_remove'){removeFrontline(engine,target);break;}
    if(effect.type==='frontline_knockback'){const loss=knockbackFrontline(engine,target,effect);damageTotal+=loss;if(loss)wakeOnDamage(engine,target);recordDefeated(engine);continue;}
    if(effect.type==='stun'){if(applyStun(engine,target,effect))(b?.log??s.log).push(`${targetName}はスタンした。`);continue;}
    if(effect.type==='guard'){
      applyGuard(b,target,effect.level??1);
      (b?.log??s.log).push(`${targetName}は守りを固めた。`);continue;
    }
    if(effect.type==='buff'){if(dungeonEffectActive(engine.data,s,'buff',effect.buff)){addBuff(engine,effect.buff,target,source,skillId);(b?.log??s.log).push(`${targetName}：${engine.data.buffs[effect.buff].name}。`);}continue;}
    if(effect.type==='cover'){
      b.covers=b.covers.filter(c=>c.sourceActor!==source.id);
      b.covers.push({target:unitKey(target),sourceActor:source.id,sourceJob:source.job,sourceSkill:skillId,remaining:1});
      (b?.log??s.log).push(`${engine.data.actors[source.id].name}は${targetName}をかばう。`);continue;
    }
    if(effect.type==='analyze'){if(!b.analyzed.includes(target.instance))b.analyzed.push(target.instance);(b?.log??s.log).push(`${targetName}の能力と耐性を記録した。`);continue;}
    const factor=series?.basis==='power'?series.factor:1;
    const context={source:{...source,stats:{...sourceStats,str:sourceStats.str*factor,int:sourceStats.int*factor}},target:{...target,stats:targetStats}};
    const raw=Math.max(0,effect.formula?engine.value(engine.data.formulas[effect.formula],context):(effect.amount??0)*factor);
    if(effect.type==='damage'){
      const physical = effect.element === 'physical';
      const element = physical && hasActiveStatus(engine.data,s,source,'water_infusion') ? 'water' : effect.element;
      const habit=b && fatalHitHabit(engine.data,target,element);
      if(habit){
        if (consumeWaterWard(engine.data,s,target,'炎')) continue;
        damageTotal+=resolveFatalHit(engine,target,habit,habitImpacts);
        break;
      }
      if(critical===null){const chance=checkAccuracy?(series?.snapshot.criticalChance??criticalChance(engine.data,s,source,target)):0;critical=chance>0&&(chance>=1||engine.random()<chance);}
      const guardRate=series?.snapshot.guardRate??guardDamageRate(engine.data,guardLevel(b,target));
      const elementScale=series?.snapshot.resist[element]??(target.resist?.[element]??engine.data.actors[target.id]?.resist?.[element]??1)*buffResistance(engine.data,dungeonBuffs(engine.data,s),unitKey(target),element)*(dungeonEffectActive(engine.data,s,'status','wet')?wetResistance(engine.data,target,element):1);
      const power=(physical?physicalPower:1)*dungeonDamageScale(engine.data,s,element)*(powers[physical?'physicalPower':'magicPower']??1)*(powers.elementPower?.[element]??1);
      const fireRate = element === 'fire' ? fireDamageTaken(engine.data, s, target) : 1;
      if(feedback){feedback.critical=Boolean(critical);feedback.guarded=guardRate<1;feedback.weak=elementScale*fireRate>1;feedback.resisted=elementScale*fireRate<1;}
      const taken=series?.snapshot.taken??(target.instance?1:(passives(engine.data,s,target.id).damageTaken??1));
      const familyScale=familyPower(engine,source,target);
      let damage=guardRate===0?0:Math.max(1,Math.floor(Math.floor(raw)*power*guardRate*elementScale*taken*familyScale*(critical?CRITICAL_DAMAGE_MULTIPLIER:1)));
      if(series?.basis==='final'){const index=skill.effects.indexOf(effect);series.finalBase[index]??=damage;damage=Math.max(0,Math.floor(series.finalBase[index]*series.factor));}
      if(series?.basis==='power'&&series.factor===0)damage=0;
      if (element === 'fire' && damage > 0 && consumeWaterWard(engine.data,s,target,'炎')) {
        if (feedback) { feedback.guarded = true; feedback.weak = false; }
        continue;
      }
      if (fireRate !== 1) damage = Math.floor(damage * fireRate);
      if(physical)damage=takePhysicalHit(engine.data,b,unitKey(target),damage,dungeonBuffs(engine.data,s));
      target.hp=Math.max(0,target.hp-damage);damageTotal+=damage;recordDefeated(engine);(b?.log??s.log).push(`${enemySource?source.name:engine.data.actors[source.id].name}の${skill.name}。${critical?'クリティカル！':''}${targetName}に${damage}。`);
      if (damage > 0 && element === 'fire') igniteOil(engine,target);
      if(damage>0&&!wakeChecked){wakeOnDamage(engine,target);wakeChecked=true;}
    }
    if(effect.type==='heal'){
      const multiplier=effect.itemHealing||itemId==='potion'?(powers.itemHealing??1):itemId?1:(powers.healingPower??1);
      const amount=Math.floor(raw*multiplier*(effect.scale??1)),restored=Math.min(targetStats.hp-target.hp,amount);
      if(isFrontline(s)&&target.hp<=0&&restored>0){const next=frontlineRevivePosition(s,target);if(next===false)return 0;b.frontline.positions[unitKey(target)]={...next};}
      if(isGrid(s)&&target.hp<=0&&restored>0){const next=revivePosition(s,target);if(next===false)return 0;b.grid.positions[unitKey(target)]={...next};}
      target.hp+=restored;(b?.log??s.log).push(`${targetName}のHPが${restored}回復。`);
    }
    if(effect.type==='drain_mp'){const spent=Math.min(target.mp,Math.floor(raw));target.mp-=spent;(b?.log??s.log).push(`${targetName}のMPが${spent}減少。`);}
    if(effect.type==='restore_mp'){const restored=Math.min(targetStats.mp-target.mp,Math.floor(raw));target.mp+=restored;(b?.log??s.log).push(`${targetName}のMPが${restored}回復。`);}
    if(effect.type==='status'&&dungeonEffectActive(engine.data,s,'status',effect.status)&&(target.hp>0||isFrontline(s)&&frontlineState(s,target)==='down')&&engine.random()<(effect.chance??1)&&applyStatus(engine.data,s,target,effect.status,effect.duration,effect.level??1)){
      (b?.log??s.log).push(`${targetName}は${engine.data.statuses[effect.status].name}になりました。`);
    }
    if(effect.type==='cleanse'){
      if(effect.statuses){for(const id of cleanseCandidates(target,effect)){removeStatus(target,id);(b?.log??s.log).push(`${targetName}：${skill.name}で${engine.data.statuses[id].name}を解除した。`);}}
      else removeStatus(target,effect.status);
    }
  }
  syncFrontlineDefeats(engine);return damageTotal;
}
function misfireTargets(engine,source,targets,skill,skillId,itemId){
  if(itemId||['attack','guard'].includes(skillId)||skill.effects.some(e=>e.type==='repel'))return targets;
  const {data:d,state:s}=engine,b=s.battle;
  if(spatial(s)){
    const limit=source.instance?skill.maxTargets??1:Math.min(skill.maxTargets??Infinity,permission(d,s,source.id,skillId,'battle.skill')?.maxTargets??1);
    const choices=targetSelections(engine,source,skill,skillId,{limit,anySide:true}).filter(p=>p.ok&&p.targets.length&&!p.targets.some(t=>targets.includes(t)));
    if(!choices.length||!rollActionStatus(engine,source,'misfireChance'))return targets;
    b.log.push(`${source.name??d.actors[source.id].name}の${skill.name}が暴発した。`);return choices[Math.floor(engine.random()*choices.length)].targets;
  }
  const all=[...s.members.map(id=>s.actors[id]),...b.enemies].filter(t=>battleAlive(s,t)),group=['all_enemies','all_allies'].includes(skill.target);
  // A misfire changes only targets. Keep special action prerequisites and the
  // learned target limit, and exclude the originally selected targets.
  let pool=all.filter(t=>!targets.includes(t));
  if(group)pool=pool.filter(t=>Boolean(t.instance)!==Boolean(targets[0]?.instance));
  if(skill.effects.some(e=>e.type==='cover'))pool=pool.filter(t=>!t.instance&&t.id!==source.id);
  if(skill.effects.some(e=>e.type==='analyze'))pool=pool.filter(t=>t.instance);
  if(skill.requiresAnalyzed)pool=pool.filter(t=>t.instance&&b.analyzed.includes(t.instance));
  if(!pool.length)return targets;
  const status=rollActionStatus(engine,source,'misfireChance');if(!status)return targets;
  const limit=group?Math.min(skill.maxTargets??Infinity,source.instance?Infinity:permission(d,s,source.id,skillId,'battle.skill')?.maxTargets??1):1,next=[];
  while(pool.length&&next.length<limit){const at=Math.floor(engine.random()*pool.length);next.push(...pool.splice(at,1));}
  b.log.push(`${source.name??d.actors[source.id].name}の${skill.name}が${d.statuses[status].name}した。`);
  return next.map(t=>t.instance?t:coveredTarget(engine,t,skill));
}
// A torch action chooses its own legal targets, including when confusion
// changes which skill is used. Previewing the action never rolls the lottery.
function torchTargets(engine, source, skillId) {
  if (!source.instance) return null;
  const s = engine.state, b = s.battle;
  switch (skillId) {
    case 'torch_play':
      return [...s.members.map(id => s.actors[id]), ...b.enemies].filter(unit => battleAlive(s, unit));
    case 'moth_whistle':
      return mothSummonPositions(engine, source).length >= 2 ? [source] : [];
    case 'torch_festival':
      return hasWhistled(b, source) ? b.enemies.filter(unit => battleAlive(s, unit) && unit.id === EMBER_MOTH) : [];
    default:
      return null;
  }
}
function sampleSkillTargets(engine,source,skill,skillId,targets) {
  if (skill.selection !== 'random_distinct') return targets;
  const grant = source.instance ? null : permission(engine.data,engine.state,source.id,skillId,'battle.skill');
  const limit = Math.min(skill.maxTargets,grant?.maxTargets ?? Infinity);
  if (targets.length <= limit) return targets;
  const pool = [...targets], selected = [];
  while (selected.length < limit) selected.push(pool.splice(Math.floor(engine.random()*pool.length),1)[0]);
  return selected;
}
function useSkill(engine,source,targets,skill,skillId,enemySource=false,itemId=null){
  const physicalPower=actionPower(engine.data,dungeonBuffs(engine.data,engine.state),unitKey(source));
  const origin=describeTarget(engine,unitKey(source)),sourceName=source.name??engine.data.actors[source.id]?.name??'対象';
  if(wetSkillBlocked(engine,source,skill)){
    (engine.state.battle?.log??engine.state.log).push(`${sourceName}の術は濡れに阻まれて発動しなかった。`);
    wetAfterSkill(engine,source,skill);return false;
  }
  const torchPool = torchTargets(engine, source, skillId);
  if (torchPool) {
    if (!torchPool.length) return false;
    targets = skillId === 'torch_play' ? [torchPool[Math.floor(engine.random() * torchPool.length)]] : torchPool;
    if (skillId === 'torch_play') {
      const target = targets[0];
      engine.state.battle.log.push(`${sourceName}の火遊び。${target.name ?? engine.data.actors[target.id].name}に松明を向けた。`);
    } else if (skillId === 'torch_festival') {
      engine.state.battle.log.push(`${sourceName}の火祭り。灯蛾${targets.length}体に一斉に松明をかざした。`);
    }
  } else targets=misfireTargets(engine,source,targets,skill,skillId,itemId);
  if(!torchPool&&spatial(engine.state)&&targets.length===1&&!targets[0].instance)targets=[coveredTarget(engine,targets[0],skill)];
  targets=sampleSkillTargets(engine,source,skill,skillId,targets);
  targets=familyIntercept(engine,source,targets,skill);
  const strikes = skill.hitCount ? targets.flatMap(target => Array(skill.hitCount).fill(target)) : targets;
  const ignitesSource = hasActiveStatus(engine.data,engine.state,source,'oiled') && skill.effects.some(e=>e.type==='damage' && e.element==='fire');
  const habitImpacts=[];
  const hit=(target,context)=>{
    const result={...describeTarget(engine,unitKey(target)),hpBefore:target.hp,mpBefore:target.mp};
    const statuses=[...target.statuses];
    const damage=applySkill(engine,source,target,skill,skillId,enemySource,itemId,true,context,physicalPower,result,habitImpacts);
    if(damage>0)result.damage=damage;
    result.hpAfter=target.hp;result.mpAfter=target.mp;
    if(target.hp>result.hpBefore)result.healing=target.hp-result.hpBefore;
    result.defeated=result.hpBefore>0&&target.hp<=0;
    result.statusAdded=target.statuses.filter(id=>!statuses.includes(id)).map(id=>engine.data.statuses[id].name);
    result.statusRemoved=statuses.filter(id=>!target.statuses.includes(id)).map(id=>engine.data.statuses[id].name);
    result.hit=!result.missed&&!result.blocked&&context?.didHit!==false&&skill.effects.some(e=>['damage','stun','drain_mp','frontline_remove','frontline_knockback'].includes(e.type));
    return result;
  };
  const results = [];
  if (isFrontline(engine.state)) {
    results.push(...resolveFrontlineAttack(engine,source,strikes,skill,skillId,{
      snapshot:target=>damageSnapshot(engine,source,target,enemySource),hit,
      react:(unit,on,attacker)=>frontlineReact(engine,unit,on,attacker)
    }));
  } else {
    for (const target of strikes) {
      if (skill.hitCount && (target.hp<=0 || source.hp<=0)) break;
      results.push(hit(target,null));
    }
  }
  const attacking=skill.effects.some(effect=>effect.type==='damage');
  const bindings=engine.data.presentation?.bindings;
  const weapon=!enemySource&&skillId==='attack'?engine.data.items[source.equipment?.weapon]?.equipmentType:null;
  const cue=bindings?.weapons?.[weapon]??bindings?.skills[skillId];
  if (skill.hitCount) {
    for (const result of results) playBattleCue(engine,cue,origin,[result],attacking,`${sourceName}・${skill.name}`);
  } else playBattleCue(engine,cue,origin,results,attacking,`${sourceName}・${skill.name}`);
  if (skillId === 'moth_whistle' && torchPool && dungeonEffectActive(engine.data, engine.state, 'skill', skillId)) summonMoths(engine, source);
  for(const impact of habitImpacts)emitFeedback(engine,impact);
  familyAfterHit(engine,source,targets,skillId,skill,results,(enemy,victim)=>familyCast(engine,enemy,[victim],'attack'));
  if (ignitesSource && dungeonEffectActive(engine.data,engine.state,'skill',skillId)) igniteOil(engine,source);
  wetAfterSkill(engine,source,skill);
  return results;
}
function coveredTarget(engine,target,skill){
  if(!battleAlive(engine.state,target)||skill.target!=='enemy'||!skill.effects.some(e=>e.type==='damage'))return target;
  if(isFrontline(engine.state)&&frontlineProfile(engine.data,{},skill,'').area.shape!=='single')return target;
  if(isGrid(engine.state)&&targetingProfile(engine.data,{},skill,'').area.shape!=='single')return target;
  const s=engine.state,b=s.battle;
  const id=s.members.find(id=>id!==target.id&&battleAlive(s,s.actors[id])&&(!spatial(s)||(isFrontline(s)?Math.abs(frontPosition(s,s.actors[id]).depth-frontPosition(s,target).depth)+Math.abs(frontPosition(s,s.actors[id]).lane-frontPosition(s,target).lane)<=1:distance(position(s,s.actors[id]),position(s,target))<=1))&&b.covers.some(c=>c.target===unitKey(target)&&c.sourceActor===id&&c.remaining>0));
  if(!id)return target;
  b.log.push(`${engine.data.actors[id].name}が${engine.data.actors[target.id].name}をかばった。`);
  return s.actors[id]; // One redirect only: no cover chains.
}
export function battleItemPlan(engine,actorId,itemId,targetId){
  const {data:d,state:s}=engine,item=d.items[itemId],actor=s.actors[actorId],target=s.actors[targetId],fail=reason=>({ok:false,reason});
  if(!s.battle||s.battle.event||!s.members.includes(actorId)||!actor||!battleAlive(s,actor))return fail('戦闘の行動待ちではありません。');
  const reason=statusActionReason(d,s,actor,'items');if(reason)return fail(reason);
  if(!item?.battleSkill||!(s.inventory[itemId]>0))return fail('使用できるアイテムがありません。');
  if(!spatial(s)&&(!s.members.includes(targetId)||!target||target.hp<=0))return fail('生存する仲間を選んでください。');
  const skill=d.skills[item.battleSkill];
  if(!skill||effectsProblem(d,skill,s)||dungeonAbilityReason(d,s,item.battleSkill,'battle.skill')||!dungeonEffectActive(d,s,'item',itemId))return fail('この場所ではアイテムを使用できません。');
  if(spatial(s)){const plan=targetPlan(engine,actor,skill,item.battleSkill,targetId,{limit:1});return {...plan,skillId:item.battleSkill,itemId};}
  return {ok:true,skill,skillId:item.battleSkill,itemId,targets:[target]};
}
function performSkill(engine,source,selection){
  const {skill,skillId,targets,itemId}=selection,enemySource=Boolean(source.instance),s=engine.state;
  if(itemId)engine.give(itemId,-1);
  else if(enemySource)source.mp-=skill.mp;
  else{
    payCost(engine,source.id,skill);
    recordSkillUse(engine,source.id,skillId,{weapon:skill.effects.some(e=>e.type==='damage'&&e.element==='physical')});
  }
  if(skill.effects.some(e=>e.type==='repel')){
    const lit=kindlePortable(engine.data,s,skill.fireEffect,engine);
    if(s.battle&&lit){
      const bindings=engine.data.presentation?.bindings;
      engine.cue(bindings?.skills?.[skillId]??bindings?.events?.light);
      endBattle(engine,'repel');
    }
    return;
  }
  const results=useSkill(engine,source,targets,skill,skillId,enemySource,itemId);
  if(results&&skill.selfEffects?.length)applySkill(engine,source,source,{...skill,effects:skill.selfEffects},skillId,enemySource,null,false);
  return results;
}
function confusedAction(engine,source){
  if(spatial(engine.state)){gridConfusedAction(engine,source);return;}
  const {data:d,state:s}=engine,b=s.battle,enemySource=Boolean(source.instance),candidates=[];
  const friends=(enemySource?b.enemies:s.members.map(id=>s.actors[id])).filter(a=>battleAlive(s,a));
  const foes=(enemySource?s.members.map(id=>s.actors[id]):b.enemies).filter(a=>battleAlive(s,a)),all=[...friends,...foes];
  const ids=enemySource?availableEnemySkills(engine,source):engine.skills(source.id);
  for(const skillId of ids){
    const skill=enemySource?d.skills[skillId]:effectiveSkill(d,s,source.id,skillId);
    if(!skill||statusAbilityReason(d,s,source,skillId)||dungeonAbilityReason(d,s,skillId,'battle.skill')||effectsProblem(d,skill,s))continue;
    // Special actions retain their own target constraints, rather than inventing
    // invalid cover, analysis or fire-network operations under confusion.
    let valid;
    if(enemySource){
      if(source.mp<skill.mp||skill.effects.some(e=>['cover','analyze','repel'].includes(e.type)))continue;
      valid=all;
    }else{
      valid=all.filter(t=>battleSkillPlan(engine,source.id,skillId,t.instance??t.id).ok);
      if(!valid.length)continue;
    }
    const special=skill.requiresAnalyzed||skill.effects.some(e=>['cover','analyze','repel'].includes(e.type));
    candidates.push({skill,skillId,pool:special?valid:all,friends,foes,maxTargets:enemySource?skill.maxTargets??Infinity:Math.min(permission(d,s,source.id,skillId,'battle.skill').maxTargets,skill.maxTargets??Infinity)});
  }
  if(!enemySource)for(const [itemId,count] of Object.entries(s.inventory))if(count>0){
    const plan=battleItemPlan(engine,source.id,itemId,source.id);
    if(plan.ok)candidates.push({...plan,pool:all,maxTargets:1});
  }
  if(!candidates.length){b.log.push(`${source.name??d.actors[source.id].name}はこんらんしているが、使える行動がない。`);return;}
  const pick=values=>values[Math.floor(engine.random()*values.length)],selection=pick(candidates);
  let targets;
  if(selection.skill.target==='self')targets=[source];
  else if(!selection.itemId&&['all_enemies','all_allies'].includes(selection.skill.target)){
    const pool=[...pick([selection.friends,selection.foes].filter(group=>group.length))];targets=[];
    while(pool.length&&targets.length<selection.maxTargets){const at=Math.floor(engine.random()*pool.length);targets.push(...pool.splice(at,1));}
  }else targets=[pick(selection.pool)];
  performSkill(engine,source,{...selection,targets});
}
function actionOverridden(engine,source){
  const name=source.name??engine.data.actors[source.id].name;
  const effects=activeStatuses(engine.data,engine.state,source),sleep=effects.find(e=>e.actionDisabled);
  if(sleep){engine.state.battle.log.push(`${name}は${sleep.name}で行動できない。`);return true;}
  const stopped=rollActionStatus(engine,source,'actionFailureChance');
  if(stopped){engine.state.battle.log.push(`${name}は${engine.data.statuses[stopped].name}で行動できない。`);return true;}
  const berserk=effects.find(e=>e.forcedAttack);
  if(berserk){
    const {data:d,state:s}=engine,enemy=Boolean(source.instance),skill=enemy?d.skills.attack:effectiveSkill(d,s,source.id,'attack');
    const foes=(enemy?s.members.map(id=>s.actors[id]):s.battle.enemies).filter(t=>battleAlive(s,t));
    const valid=foes.filter(t=>enemy?(!spatial(s)||targetPlan(engine,source,skill,'attack',unitKey(t)).ok)&&!dungeonAbilityReason(d,s,'attack','battle.skill')&&!effectsProblem(d,skill,s)&&source.mp>=skill.mp:battleSkillPlan(engine,source.id,'attack',t.instance).ok);
    if(valid.length){const target=valid[Math.floor(engine.random()*valid.length)];s.battle.log.push(`${name}は${berserk.name}して襲いかかった。`);performSkill(engine,source,{skill,skillId:'attack',targets:[enemy&&!spatial(s)?coveredTarget(engine,target,skill):target]});}
    else s.battle.log.push(`${name}は${berserk.name}しているが、攻撃できない。`);
    return true;
  }
  const confused=rollActionStatus(engine,source,'confusionChance');
  if(confused){engine.state.battle.log.push(`${name}は${engine.data.statuses[confused].name}で勝手に行動した。`);confusedAction(engine,source);return true;}
  return false;
}
function afflictedTargets(engine,skill){
  return engine.state.battle.enemies.filter(t=>battleAlive(engine.state,t)&&skill.effects.some(e=>e.type==='cleanse'&&cleanseCandidates(t,e).length));
}
function unbuffedTargets(engine,skill){
  const {state:s}=engine,b=s.battle;
  return b.enemies.filter(t=>battleAlive(s,t)&&skill.effects.every(e=>e.type==='buff'&&!b.buffs.some(entry=>entry.target===unitKey(t)&&entry.id===e.buff&&entry.remaining>0)));
}
function supportTargets(engine,rule){
  const skill=engine.data.skills[rule.skill];
  return rule.target==='afflicted'?afflictedTargets(engine,skill):rule.target==='unbuffed'?unbuffedTargets(engine,skill):null;
}
function enemyContext(engine,enemy){
  const b=engine.state.battle;
  return {self:{...enemy,hp_ratio:enemy.hp/enemy.stats.hp,round:b.round,buffs:b.buffs.filter(entry=>entry.target===unitKey(enemy)&&entry.remaining>0).map(entry=>entry.id)}};
}
function availableEnemySkills(engine,enemy){
  // Confusion changes the choice and target, but cannot skip a windup or other
  // authored use condition. A shared skill is available if any rule allows it.
  return [...new Set(enemy.ai.filter(rule=>(!rule.condition||engine.value(rule.condition,enemyContext(engine,enemy)))&&torchTargets(engine,enemy,rule.skill)?.length!==0).map(rule=>rule.skill))];
}
function enemyAction(engine,enemy){
  return consumeEnemyActionBuffs(engine,enemy,()=>performEnemyAction(engine,enemy));
}
function consumeEnemyActionBuffs(engine,enemy,act){
  const b=engine.state.battle,consumed=actionBuffs(engine.data,b,unitKey(enemy));
  try{return act();}finally{b.buffs=b.buffs.filter(entry=>!consumed.includes(entry));}
}
function familyCast(engine,source,targets,skillId) {
  const {data,state}=engine,skill=data.skills[skillId];
  if (!targets.length||!skill||source.mp<skill.mp||statusAbilityReason(data,state,source,skillId)||dungeonAbilityReason(data,state,skillId,'battle.skill')) return;
  if (!spatial(state)&&targets.length===1&&!targets[0].instance) targets=[coveredTarget(engine,targets[0],skill)];
  return performSkill(engine,source,{skill,skillId,targets});
}

function performEnemyAction(engine,enemy,bonus=false){
  const s=engine.state,b=s.battle;
    if(!battleAlive(s,enemy))return;clearGuard(b,enemy);if(consumeStun(engine,enemy)||actionOverridden(engine,enemy))return;
    if(enemy.classSkill&&b.familyField) {
      if (statusAbilityReason(engine.data,s,enemy,enemy.classSkill)||dungeonAbilityReason(engine.data,s,enemy.classSkill,'battle.skill')) {
        const victim=s.members.map(id=>s.actors[id]).find(u=>battleAlive(s,u));
        if(victim)familyCast(engine,enemy,[victim],'attack');
        return;
      }
      familyTurn(engine,enemy,{
        cast:(source,targets,id)=>familyCast(engine,source,targets,id),
        order:unit=>consumeEnemyActionBuffs(engine,unit,()=>performEnemyAction(engine,unit,true))
      },bonus);
      return;
    }
    if(isFrontline(s)){frontlineEnemyAction(engine,enemy);return;}
    if(isGrid(s)){gridEnemyAction(engine,enemy);return;}
    const alive=s.members.filter(id=>battleAlive(s,s.actors[id]));if(!alive.length)return;
    const rule=[...enemy.ai].sort((a,c)=>c.priority-a.priority).find(r=>!statusAbilityReason(engine.data,s,enemy,r.skill)&&!dungeonAbilityReason(engine.data,s,r.skill,'battle.skill')&&(!r.condition||engine.value(r.condition,enemyContext(engine,enemy)))&&enemy.mp>=engine.data.skills[r.skill].mp&&supportTargets(engine,r)?.length!==0&&torchTargets(engine,enemy,r.skill)?.length!==0);
    if(!rule){b.log.push(`${enemy.name}は使える行動がない。`);return;}
    const skill=engine.data.skills[rule.skill], torchPool=torchTargets(engine,enemy,rule.skill);
    if (torchPool) { performSkill(engine,enemy,{skill,skillId:rule.skill,targets:torchPool}); return; }
    enemy.mp-=skill.mp;
    const targetId=rule.target==='weakest'?alive.reduce((a,c)=>s.actors[c].hp<s.actors[a].hp?c:a):alive[Math.floor(engine.random()*alive.length)];
    let targets;
    if(supportTargets(engine,rule))targets=supportTargets(engine,rule).slice(0,1);
    else if(skill.target==='all_enemies')targets=alive.map(id=>s.actors[id]);
    else if(skill.target==='all_allies')targets=b.enemies.filter(e=>battleAlive(s,e));
    else if(rule.target==='self'||skill.target==='self')targets=[enemy];
    else if(skill.target==='ally')targets=[b.enemies.filter(e=>battleAlive(s,e)).sort((a,c)=>a.hp/a.stats.hp-c.hp/c.stats.hp)[0]];
    else targets=[coveredTarget(engine,s.actors[targetId],skill)];
    if(!skill.effects.length)b.log.push(`${enemy.name}は${skill.name}。`);
    const activated=useSkill(engine,enemy,targets,skill,rule.skill,true);
    if(activated&&skill.selfEffects?.length)applySkill(engine,enemy,enemy,{...skill,effects:skill.selfEffects},rule.skill,true,null,false);
}
// The mixed queue is a snapshot of the living units' AGI at each round start.
// Equal AGI is stable: party order first, then encounter order.
function buildTurnQueue(engine){
  const s=engine.state,b=s.battle;
  const entries=[
    ...s.members.filter(id=>battleAlive(s,s.actors[id])&&!b.acted.includes(id)).map((id,i)=>({key:'actor:'+id,agi:engine.stats(id).agi,order:i})),
    ...b.enemies.filter(e=>battleAlive(s,e)).map((enemy,i)=>({key:unitKey(enemy),agi:enemyStats(engine,enemy).agi,order:s.members.length+i}))
  ];
  return entries.sort((a,c)=>c.agi-a.agi||a.order-c.order).map(entry=>entry.key);
}
// Buffs and debuffs can change AGI during a round. Only future slots are reordered.
function resortRemainingQueue(engine){
  const s=engine.state,b=s.battle,order=[...s.members.map(id=>'actor:'+id),...b.enemies.map(e=>unitKey(e))],rank=new Map(order.map((key,i)=>[key,i]));
  const speed=key=>key.startsWith('actor:')?engine.stats(key.slice(6)).agi:enemyStats(engine,b.enemies.find(e=>unitKey(e)===key)).agi;
  const remaining=b.turnQueue.slice(b.turnIndex).sort((a,c)=>speed(c)-speed(a)||rank.get(a)-rank.get(c));
  b.turnQueue.splice(b.turnIndex,remaining.length,...remaining);
}
function finishRound(engine){
  const s=engine.state,b=s.battle;
  dungeonBattleRound(engine);
  if(s.members.every(id=>!battleAlive(engine.state,s.actors[id]))){endBattle(engine,'lose');return;}
  for(const enemy of b.enemies)if(battleAlive(s,enemy))for(const status of enemy.statuses){const loss=applyStatusClock(engine.data,s,enemy,status,'turns',enemy.stats);recordDefeated(engine);if(loss.hp||loss.mp)b.log.push(`${enemy.name}は${engine.data.statuses[status].name}で${loss.hp?`HP${loss.hp}`:''}${loss.hp&&loss.mp?'・':''}${loss.mp?`MP${loss.mp}`:''}を失った。`);}
  if(b.enemies.every(e=>!battleAlive(s,e))){endBattle(engine,'win');return;}
  for(const id of s.members){const a=s.actors[id];if(!battleAlive(s,a))continue;const max=engine.stats(id);for(const status of a.statuses){const loss=applyStatusClock(engine.data,s,a,status,'turns',max);if(loss.hp||loss.mp)b.log.push(`${engine.data.actors[id].name}は${engine.data.statuses[status].name}で${loss.hp?`HP${loss.hp}`:''}${loss.hp&&loss.mp?'・':''}${loss.mp?`MP${loss.mp}`:''}を失った。`);}}
  if(s.members.every(id=>!battleAlive(engine.state,s.actors[id]))){endBattle(engine,'lose');return;}
  for(const unit of [...s.members.map(id=>s.actors[id]),...b.enemies])if(battleAlive(s,unit)){tickStatuses(engine.data,s,unit,'turns');recoverStatuses(engine,unit);}
  tickBuffs(b,engine.data);b.acted=[];for(const id of [...b.guards])clearGuard(b,s.actors[id]);b.turnQueue=null;b.turnIndex=0;b.round++;b.log=b.log.slice(-30);
  joinReinforcements(engine);
  prepareFrontlineRound(engine,(u,on,attacker)=>frontlineReact(engine,u,on,attacker));
  tickBuffs(b,engine.data,'after_advance');
  triggerBattleEvent(engine,'round_start');
}
function advanceBattleTurns(engine){
  const s=engine.state,b=s.battle;
  syncFrontlineDefeats(engine);
  while(s.battle===b&&!b.event&&!b.preemptive){
    if(s.members.every(id=>!battleAlive(engine.state,s.actors[id]))){endBattle(engine,'lose');return;}
    if(b.enemies.every(e=>!battleAlive(s,e))){endBattle(engine,'win');return;}
    if(!Array.isArray(b.turnQueue)){b.turnQueue=buildTurnQueue(engine);b.turnIndex=0;}
    if(b.turnIndex>=b.turnQueue.length){finishRound(engine);continue;}
    resortRemainingQueue(engine);
    const key=b.turnQueue[b.turnIndex];
    if(key.startsWith('actor:')){
      if(battleAlive(s,s.actors[key.slice(6)]))return;
      b.turnIndex++;continue; // A defeated actor cannot use this round's slot.
    }
    const enemy=b.enemies.find(e=>unitKey(e)===key);
    if(b.manualTurns&&battleAlive(s,enemy))return;
    b.turnIndex++;
    if(battleAlive(s,enemy))enemyAction(engine,enemy); // Stun also consumes exactly one slot.
  }
}
export function continuePreemptive(engine){
  const s=engine.state,b=s.battle;if(!b||b.event)return;
  while(s.battle===b&&b.preemptive?.side==='enemies'){
    const enemy=[...b.enemies].filter(e=>battleAlive(s,e)).sort((a,c)=>enemyStats(engine,c).agi-enemyStats(engine,a).agi)[0];
    if(!enemy){endBattle(engine,'win');return;}
    if(b.manualTurns)return;
    enemyAction(engine,enemy);
    if(--b.preemptive.remaining===0)delete b.preemptive;
    if(s.members.every(id=>!battleAlive(engine.state,s.actors[id]))){endBattle(engine,'lose');return;}
  }
  advanceBattleTurns(engine);
}
function finishAction(engine,actorId,consumed=[]){
  const s=engine.state,b=s.battle;if(!b)return;
  b.buffs=b.buffs.filter(entry=>!consumed.includes(entry));
  if(b.preemptive?.side==='allies'){if(--b.preemptive.remaining===0)delete b.preemptive;}
  else{b.acted.push(actorId);b.turnIndex++;}
  if(s.members.every(id=>!battleAlive(engine.state,s.actors[id]))){endBattle(engine,'lose');return;}
  if(b.enemies.every(e=>!battleAlive(s,e))){endBattle(engine,'win');return;}
  advanceBattleTurns(engine);
}
export function battleAction(engine,intent){
  const s=engine.state,b=s.battle,actorId=activeActor(engine);if(!b||b.event||s.waiting?.type!=='battle'||!actorId)return false;
  const actor=s.actors[actorId],consumed=actionBuffs(engine.data,b,unitKey(actor));
  if(spatial(s)&&stunned(b,actor)&&intent.action!=='wait')return false;
  if(consumeStun(engine,actor)){finishAction(engine,actorId,consumed);return true;}
  if(statusControl(engine.data,s,actor)){
    if(intent.action!=='wait')return false;
    actionOverridden(engine,actor);if(s.battle===b)finishAction(engine,actorId,consumed);return true;
  }
  let selection;
  if(intent.action==='escape'){
    if(!engine.data.encounters[b.encounter].escape)return false;
  }else if(intent.action==='move'){
    selection=isFrontline(s)?frontlineMovePlan(s,actor,intent.to,engine.data):gridMovePlan(s,actor,intent.to,engine.data);
    if(!selection.ok){engine.notify(selection.reason);return false;}
  }else if(intent.action==='item'){
    selection=battleItemPlan(engine,actorId,intent.item,intent.target);
    if(!selection.ok){engine.notify(selection.reason);return false;}
  }else if(intent.action==='skill'){
    selection=battleSkillPlan(engine,actorId,intent.skill,intent.target);
    if(!selection.ok){engine.notify(selection.reason);return false;}
    selection.skillId=intent.skill;
  }else return false;
  // Only a valid, committed action rolls. Previews, invalid commands and menu
  // cancellation never consume RNG, costs or a slot.
  if(actionOverridden(engine,actor)){if(s.battle===b)finishAction(engine,actorId,consumed);return true;}
  if(intent.action==='escape'){
    if(engine.random()<Math.min(1,engine.data.system.escapeRate+engine.partyEffect('escapeBonus',0,'max')))endBattle(engine,'escape');
    else{b.log.push('退路を塞がれました。');finishAction(engine,actorId,consumed);}return true;
  }
  const oldDepth=intent.action==='move'&&b.familyField?depth(s,actor):null;
  if(intent.action==='move'&&isFrontline(s))moveFrontline(engine,actor,selection.to);
  else if(intent.action==='move'){b.grid.positions[unitKey(actor)]=selection.to;b.log.push(`${engine.data.actors[actorId].name}は移動した。`);}
  else performSkill(engine,actor,selection);
  if(oldDepth!==null)familyAfterMove(engine,actor,oldDepth,(enemy,victim)=>familyCast(engine,enemy,[victim],'attack'));
  if(s.battle===b)finishAction(engine,actorId,consumed);
  return true;
}

function gridEnemyChoices(engine,enemy,skillId,{anySide=false,origin=null}={}){
  const {data:d,state:s}=engine,skill=d.skills[skillId];
  if(!skill||enemy.mp<skill.mp||statusAbilityReason(d,s,enemy,skillId)||dungeonAbilityReason(d,s,skillId,'battle.skill')||effectsProblem(d,skill,s))return [];
  const targets = torchTargets(engine, enemy, skillId);
  if (targets) return targets.length ? [{ok:true, id:unitKey(targets[0]), targets, skill, skillId}] : [];
  return targetSelections(engine,enemy,skill,skillId,{limit:skill.maxTargets??(skill.target.startsWith('all_')?8:1),anySide,origin}).filter(p=>p.ok).map(p=>({...p,skillId}));
}
function gridConfusedAction(engine,source){
  const {state:s,data:d}=engine,enemy=Boolean(source.instance),choices=[];
  for(const id of enemy?availableEnemySkills(engine,source):engine.skills(source.id)){
    if(enemy)choices.push(...gridEnemyChoices(engine,source,id,{anySide:true}));
    else{const skill=effectiveSkill(d,s,source.id,id);for(const p of targetSelections(engine,source,skill,id,{anySide:true})){const plan=battleSkillPlan(engine,source.id,id,p.id,{anySide:true});if(plan.ok)choices.push({...plan,skillId:id});}}
  }
  if(!enemy)for(const [itemId,n] of Object.entries(s.inventory))if(n>0&&d.items[itemId]?.battleSkill){
    const skillId=d.items[itemId].battleSkill,skill=d.skills[skillId];
    if(statusActionReason(d,s,source,'items')||effectsProblem(d,skill,s)||dungeonAbilityReason(d,s,skillId,'battle.skill')||!dungeonEffectActive(d,s,'item',itemId))continue;
    choices.push(...targetSelections(engine,source,skill,skillId,{limit:1,anySide:true}).filter(p=>p.ok).map(p=>({...p,itemId,skillId})));
  }
  if(choices.length)performSkill(engine,source,choices[Math.floor(engine.random()*choices.length)]);
  else s.battle.log.push(`${source.name??d.actors[source.id].name}は使える行動がない。`);
}
function gridEnemyAction(engine,enemy){
  const {state:s,data:d}=engine,b=s.battle;
  for(const rule of [...enemy.ai].sort((a,c)=>c.priority-a.priority)){
    if(rule.condition&&!engine.value(rule.condition,enemyContext(engine,enemy)))continue;
    let choices=gridEnemyChoices(engine,enemy,rule.skill);
    if(rule.target==='self')choices=choices.filter(p=>p.targets.length===1&&p.targets[0]===enemy);
    if(supportTargets(engine,rule)){const valid=supportTargets(engine,rule);choices=choices.filter(p=>p.targets.length===1&&valid.includes(p.targets[0]));}
    if(!choices.length)continue;
    if(rule.target==='weakest')choices.sort((a,c)=>Math.min(...a.targets.map(t=>t.hp))-Math.min(...c.targets.map(t=>t.hp)));
    performSkill(engine,enemy,choices[rule.target==='random'?Math.floor(engine.random()*choices.length):0]);return;
  }
  // Score all legal steps without changing state or RNG. Prefer a step which
  // reaches any usable attack's distance band, then the closest opponent.
  const foes=s.members.map(id=>s.actors[id]).filter(a=>battleAlive(s,a)),from=position(s,enemy);
  const skills=enemy.ai.filter(r=>(!r.condition||engine.value(r.condition,enemyContext(engine,enemy)))&&!statusAbilityReason(d,s,enemy,r.skill)&&!dungeonAbilityReason(d,s,r.skill,'battle.skill')&&enemy.mp>=d.skills[r.skill].mp).map(r=>targetingProfile(d,enemy,d.skills[r.skill],r.skill));
  const score=p=>enemy.ai.some(r=>(!r.condition||engine.value(r.condition,enemyContext(engine,enemy)))&&gridEnemyChoices(engine,enemy,r.skill,{origin:p}).length)?-1:Math.min(...foes.flatMap(t=>skills.map(v=>{const n=distance(p,position(s,t));return Math.max(v.range.min-n,0,n-v.range.max)*10+n;})));
  const steps=gridCells().map(p=>gridMovePlan(s,enemy,p,engine.data)).filter(p=>p.ok).sort((a,c)=>score(a.to)-score(c.to));
  if(steps.length&&score(steps[0].to)<score(from)){b.grid.positions[unitKey(enemy)]=steps[0].to;b.log.push(`${enemy.name}は移動した。`);}
  else{applyGuard(b,enemy);b.log.push(`${enemy.name}は守りを固めた。`);}
}

function fireDamageTaken(data, state, target) {
  return activeStatuses(data, state, target).reduce((scale, status) => scale * (status.fireDamageTaken ?? 1), 1);
}

function damageSnapshot(engine,source,target,enemySource){
 const {data:d,state:s}=engine;
 return {accuracy:buffAccuracy(d,s.battle,source,statusAccuracy(d,s,source)),sourceStats:clone(enemySource?enemyStats(engine,source):engine.stats(source.id)),targetStats:clone(target.instance?enemyStats(engine,target):engine.stats(target.id)),guardRate:guardDamageRate(d,guardLevel(s.battle,target)),taken:target.instance?1:passives(d,s,target.id).damageTaken??1,criticalChance:criticalChance(d,s,source,target),resist:Object.fromEntries(['physical','fire','ice','lightning','water','light','earth','dark'].map(e=>[e,(target.resist?.[e]??d.actors[target.id]?.resist?.[e]??1)*buffResistance(d,dungeonBuffs(d,s),unitKey(target),e)*(dungeonEffectActive(d,s,'status','wet')?wetResistance(d,target,e):1)]))};
}
function frontlineReact(engine,reactor,on,attacker){
 const {data:d,state:s}=engine,b=s.battle;if(!isFrontline(s)||!battleAlive(s,reactor))return false;
 let cancel=false;
 for(const rule of b.frontline.reactions[unitKey(reactor)]??[]){
  if(rule.on!==on||!battleAlive(s,reactor)||stunned(b,reactor)||statusControl(d,s,reactor)||statusAbilityReason(d,s,reactor,rule.skill)||dungeonAbilityReason(d,s,rule.skill,'battle.skill'))continue;
  const skill=reactor.instance?d.skills[rule.skill]:effectiveSkill(d,s,reactor.id,rule.skill),target=skill?.target==='self'||['ally','all_allies'].includes(skill?.target)?reactor:attacker;
  if(!skill||!target||effectsProblem(d,skill,s)||skill.effects.some(e=>e.type==='repel'))continue;
  const plan=reactor.instance?frontlineTargetPlan(engine,reactor,skill,rule.skill,unitKey(target)):battleSkillPlan(engine,reactor.id,rule.skill,unitKey(target));
  if(!plan.ok||reactor.instance&&reactor.mp<skill.mp)continue;
  if(reactor.instance)reactor.mp-=skill.mp;else{payCost(engine,reactor.id,skill);recordSkillUse(engine,reactor.id,rule.skill);}
  // Reactions use shared effects but do not recursively trigger onHit reactions.
  const wasOiled=hasActiveStatus(d,s,reactor,'oiled');
  for(const target of sampleSkillTargets(engine,reactor,skill,rule.skill,plan.targets)){
    for(let hit=0;hit<(skill.hitCount??1);hit++){
      if(skill.hitCount && (!battleAlive(s,reactor)||!battleAlive(s,target)))break;
      applySkill(engine,reactor,target,skill,rule.skill,Boolean(reactor.instance));
    }
  }
  if(wasOiled && skill.effects.some(e=>e.type==='damage' && e.element==='fire'))igniteOil(engine,reactor);
  if(skill.selfEffects?.length)applySkill(engine,reactor,reactor,{...skill,effects:skill.selfEffects},rule.skill,Boolean(reactor.instance),null,false);
  cancel||=rule.cancelRemaining;traceFrontline(engine,'reaction',{unit:unitKey(reactor),on,skill:rule.skill,cancelRemaining:rule.cancelRemaining});
  b.log.push(`${reactor.name??d.actors[reactor.id].name}の被反応：${skill.name}${rule.cancelRemaining?'（後続命中中止）':''}。`);
 }
 return cancel;
}
function frontlineEnemyAction(engine,enemy){
 const {state:s}=engine,b=s.battle;
 for(const rule of [...enemy.ai].sort((a,c)=>c.priority-a.priority)){
  if(rule.condition&&!engine.value(rule.condition,enemyContext(engine,enemy)))continue;
  let choices=gridEnemyChoices(engine,enemy,rule.skill);if(rule.target==='self')choices=choices.filter(p=>p.targets.length===1&&p.targets[0]===enemy);
  if(supportTargets(engine,rule)){const valid=supportTargets(engine,rule);choices=choices.filter(p=>p.targets.length===1&&valid.includes(p.targets[0]));}
  if(!choices.length)continue;if(rule.target==='weakest')choices.sort((a,c)=>Math.min(...a.targets.map(t=>t.hp))-Math.min(...c.targets.map(t=>t.hp)));
  performSkill(engine,enemy,choices[rule.target==='random'?Math.floor(engine.random()*choices.length):0]);return;
 }
 // Lack of range is not a move command. Hold formation until the side has no
 // living front and prepareFrontlineRound advances it at the next round start.
 applyGuard(b,enemy);b.log.push(`${enemy.name}は守りを固めた。`);
}
// Manual stepping is a diagnostic pacing option of the same queue, not another
// battle implementation. Normal play still drains enemy turns automatically.
export function stepBattle(engine,intent={}){
 const s=engine.state,b=s.battle;if(!b?.manualTurns||b.event||s.waiting?.type!=='battle')return false;
 const actor=activeActor(engine);if(actor)return battleAction(engine,{action:stunned(b,s.actors[actor])||statusControl(engine.data,s,s.actors[actor])?'wait':'skill',skill:'guard',target:actor});
 const enemy=b.preemptive?.side==='enemies'?[...b.enemies].filter(e=>battleAlive(s,e)).sort((a,c)=>enemyStats(engine,c).agi-enemyStats(engine,a).agi)[0]:b.enemies.find(e=>unitKey(e)===b.turnQueue?.[b.turnIndex]);
 if(!enemy)return false;
 let selected;if(intent.skill){selected=gridEnemyChoices(engine,enemy,intent.skill).find(p=>p.id===intent.target);if(!selected)return false;}
 const act=()=>{if(!selected)enemyAction(engine,enemy);else consumeEnemyActionBuffs(engine,enemy,()=>{clearGuard(b,enemy);if(!consumeStun(engine,enemy)&&!actionOverridden(engine,enemy))performSkill(engine,enemy,selected);});};
 if(b.preemptive){act();if(--b.preemptive.remaining===0)delete b.preemptive;}
 else{b.turnIndex++;act();}
 if(s.battle!==b)return true;
 if(s.members.every(id=>!battleAlive(engine.state,s.actors[id])))endBattle(engine,'lose');else if(b.enemies.every(e=>!battleAlive(s,e)))endBattle(engine,'win');else advanceBattleTurns(engine);return true;
}
