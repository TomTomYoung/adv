import {clone} from './expression.js';
import {pushBranch,pump} from './script.js';
export function startBattle(engine,id,continuations){
  if(engine.state.battle)throw new Error('戦闘は重複して開始できません');
  const encounter=engine.data.encounters[id];if(!encounter)throw new Error(`不明な戦闘: ${id}`);
  engine.state.battle={encounter:id,round:1,enemies:encounter.enemies.map((id,i)=>({...clone(engine.data.enemies[id]),instance:`enemy_${i}`,hp:engine.data.enemies[id].stats.hp,mp:engine.data.enemies[id].stats.mp,statuses:[],guard:false})),acted:[],guards:[],continuations:clone(continuations),log:[encounter.text],musicBefore:engine.state.presentation.music};
  engine.state.waiting={type:'battle'};engine.state.presentation.music='battle';engine.log(encounter.text);
}
export function activeActor(engine){
  const s=engine.state,b=s.battle;if(!b)return null;
  return [...s.members].sort((a,c)=>engine.stats(c).agi-engine.stats(a).agi).find(id=>s.actors[id].hp>0&&!b.acted.includes(id))??null;
}
function endBattle(engine,result){
  const s=engine.state,b=s.battle,enc=engine.data.encounters[b.encounter],continuation=b.continuations;
  s.presentation.music=b.musicBefore;s.battle=null;s.waiting=null;
  if(result==='lose'){
    engine.defeat();
    // The defeated caller is discarded, but an explicit defeat epilogue can run in town.
    if(continuation.frame){pushBranch(engine,continuation.frame,continuation.index,[continuation.lose]);pump(engine);}
    return;
  }
  if(result==='win'){
    const gold=b.enemies.reduce((n,e)=>n+e.rewards.gold,0),xp=b.enemies.reduce((n,e)=>n+e.rewards.xp,0);
    engine.award(gold,xp);engine.notify(`勝利しました。${gold}G・${xp}EXP。`);
  }else engine.notify('戦闘から離脱しました。依頼の決着はついていません。');
  if(continuation.frame){pushBranch(engine,continuation.frame,continuation.index,[continuation[result]]);}
  pump(engine);
}
function applySkill(engine,source,sourceStats,target,targetStats,skill,enemySource){
  const b=engine.state.battle,s=engine.state;
  for(const effect of skill.effects){
    if(effect.type==='guard'){if(enemySource)target.guard=true;else if(!b.guards.includes(target.id))b.guards.push(target.id);b.log.push(`${target.name??engine.data.actors[target.id]?.name}は守りを固めた。`);continue;}
    if(!target)continue;
    const context={source:{...source,stats:sourceStats},target:{...target,stats:targetStats}};
    const amount=Math.max(0,Math.floor(effect.formula?engine.value(engine.data.formulas[effect.formula],context):effect.amount??0));
    if(effect.type==='damage'){
      const guarded=enemySource?b.guards.includes(target.id):target.guard;
      const elementScale=target.resist?.[effect.element]??engine.data.actors[target.id]?.resist?.[effect.element]??1;
      const damage=Math.max(1,Math.floor(amount*(guarded?engine.data.system.guardRate:1)*elementScale));
      target.hp=Math.max(0,target.hp-damage);b.log.push(`${enemySource?source.name:engine.data.actors[source.id].name}の${skill.name}。${target.name??engine.data.actors[target.id]?.name}に${damage}。`);
    }
    if(effect.type==='heal'){target.hp=Math.min(targetStats.hp,target.hp+amount);b.log.push(`${target.name??engine.data.actors[target.id]?.name}のHPが${amount}回復。`);}
    if(effect.type==='drain_mp'){const spent=Math.min(target.mp,amount);target.mp-=spent;b.log.push(`${target.name??engine.data.actors[target.id]?.name}のMPが${spent}減少。`);}
    if(effect.type==='restore_mp'){const restored=Math.min(targetStats.mp-target.mp,amount);target.mp+=restored;b.log.push(`${target.name??engine.data.actors[target.id]?.name}のMPが${restored}回復。`);}
    if(effect.type==='status'&&target.hp>0&&engine.random()<(effect.chance??1)&&!target.statuses.includes(effect.status)){target.statuses.push(effect.status);b.log.push(`${target.name??engine.data.actors[target.id]?.name}は${engine.data.statuses[effect.status].name}になりました。`);}
    if(effect.type==='cleanse')target.statuses=[];
  }
}
function enemiesTurn(engine){
  const s=engine.state,b=s.battle;
  for(const enemy of b.enemies)if(enemy.hp>0)for(const status of enemy.statuses){const damage=engine.data.statuses[status].turnDamage??0;enemy.hp=Math.max(0,enemy.hp-damage);if(damage)b.log.push(`${enemy.name}は${engine.data.statuses[status].name}で${damage}ダメージ。`);}
  if(b.enemies.every(e=>e.hp<=0)){endBattle(engine,'win');return;}
  for(const enemy of [...b.enemies].sort((a,c)=>c.stats.agi-a.stats.agi)){
    if(enemy.hp<=0)continue;enemy.guard=false;
    const alive=s.members.filter(id=>s.actors[id].hp>0);if(!alive.length)break;
    const rule=[...enemy.ai].sort((a,c)=>c.priority-a.priority).find(r=>(!r.condition||engine.value(r.condition,{self:{...enemy,hp_ratio:enemy.hp/enemy.stats.hp,round:b.round}})) && enemy.mp>=engine.data.skills[r.skill].mp);
    if(!rule)continue;
    const skill=engine.data.skills[rule.skill];enemy.mp-=skill.mp;
    const targetId=rule.target==='weakest'?alive.reduce((a,c)=>s.actors[c].hp<s.actors[a].hp?c:a):alive[Math.floor(engine.random()*alive.length)];
    let targets;
    if(skill.target==='all_enemies')targets=alive.map(id=>[s.actors[id],engine.stats(id)]);
    else if(skill.target==='all_allies')targets=b.enemies.filter(e=>e.hp>0).map(e=>[e,e.stats]);
    else if(rule.target==='self'||skill.target==='self')targets=[[enemy,enemy.stats]];
    else if(skill.target==='ally'){const friend=b.enemies.filter(e=>e.hp>0).sort((a,c)=>a.hp/a.stats.hp-c.hp/c.stats.hp)[0];targets=[[friend,friend.stats]];}
    else targets=[[s.actors[targetId],engine.stats(targetId)]];
    if(!skill.effects.length)b.log.push(`${enemy.name}は${skill.name}。`);
    for(const [target,stats] of targets)applySkill(engine,enemy,enemy.stats,target,stats,skill,true);
  }
  for(const id of s.members){const a=s.actors[id];if(a.hp<=0)continue;for(const status of a.statuses){const damage=engine.data.statuses[status].turnDamage??0;a.hp=Math.max(0,a.hp-damage);if(damage)b.log.push(`${engine.data.actors[id].name}は${engine.data.statuses[status].name}で${damage}ダメージ。`);}}
  if(s.members.every(id=>s.actors[id].hp<=0)){endBattle(engine,'lose');return;}
  b.acted=[];b.guards=[];b.round++;b.log=b.log.slice(-30);
}
export function battleAction(engine,intent){
  const s=engine.state,b=s.battle,actorId=activeActor(engine);if(!b||!actorId)return false;
  const actor=s.actors[actorId],definition=engine.data.actors[actorId];
  if(intent.action==='escape'){
    if(!engine.data.encounters[b.encounter].escape)return false;
    if(engine.random()<engine.data.system.escapeRate)endBattle(engine,'escape');
    else{b.log.push('退路を塞がれました。');enemiesTurn(engine);}return true;
  }
  if(intent.action==='item'){
    const item=engine.data.items[intent.item],target=s.actors[intent.target];
    if(!item?.battleSkill||!(s.inventory[intent.item]>0)||!s.members.includes(intent.target)||!target||target.hp<=0)return false;
    engine.give(intent.item,-1);applySkill(engine,actor,engine.stats(actorId),target,engine.stats(intent.target),engine.data.skills[item.battleSkill],false);
  }else{
    const skill=engine.data.skills[intent.skill];
    if(!skill||!definition.skills.includes(intent.skill)||actor.mp<skill.mp)return false;
    let targets;
    if(skill.target==='all_enemies')targets=b.enemies.filter(e=>e.hp>0).map(e=>[e,e.stats]);
    else if(skill.target==='all_allies')targets=s.members.filter(id=>s.actors[id].hp>0).map(id=>[s.actors[id],engine.stats(id)]);
    else if(skill.target==='self')targets=[[actor,engine.stats(actorId)]];
    else if(skill.target==='ally'){
      const target=s.actors[intent.target];if(!s.members.includes(intent.target)||!target||target.hp<=0)return false;targets=[[target,engine.stats(intent.target)]];
    }else{const target=b.enemies.find(e=>e.instance===intent.target&&e.hp>0);if(!target)return false;targets=[[target,target.stats]];}
    actor.mp-=skill.mp;for(const [target,stats] of targets)applySkill(engine,actor,engine.stats(actorId),target,stats,skill,false);
  }
  b.acted.push(actorId);
  if(b.enemies.every(e=>e.hp<=0)){endBattle(engine,'win');return true;}
  if(!activeActor(engine))enemiesTurn(engine);
  return true;
}
