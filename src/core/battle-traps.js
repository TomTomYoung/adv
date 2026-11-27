import {trapSkillChoices} from './trap-skills.js';
import {unitKey} from './buffs.js';
import {battleAlive} from './frontline-lifecycle.js';
import {feigning,sealBones} from './feigned-death.js';
import {applyStun,clearGuard,guarded} from './battle-turns.js';
import {applyStatus,hasActiveStatus} from './status-effects.js';
import {abilityCategory} from './ability-category.js';

const units = s => [...s.members.map(id=>s.actors[id]),...s.battle.enemies];
const unit = (s,key) => key.startsWith('actor:') ? s.actors[key.slice(6)] : s.battle.enemies.find(u=>unitKey(u)===key);
const name = (engine,u) => u.name ?? engine.data.actors[u.id].name;
const enemySide = key => key.startsWith('enemy:');
const hostile = (trap,u) => enemySide(trap.owner)!==Boolean(u.instance);
const traps = s => s.battle?.traps ?? [];
const spec = (engine,t) => engine.data.skills[t.skill].effects[0];
const owned = (engine,u) => traps(engine.state).find(t=>t.owner===unitKey(u));
function remove(s,t) {
  s.battle.traps=traps(s).filter(entry=>entry!==t);
  if(!s.battle.traps.length)delete s.battle.traps;
}
function trigger(engine,t) {
  remove(engine.state,t);
  engine.state.battle.log.push(name(engine,unit(engine.state,t.owner))+'の'+engine.data.skills[t.skill].name+'が発動した。');
}
export function battleTrapLabels(engine) {
  const s=engine.state;
  return traps(s).map(t=>name(engine,unit(s,t.owner))+'の'+engine.data.skills[t.skill].name+'（'+name(engine,unit(s,t.target))+'）');
}
export function setBattleTrap(engine,owner,target,id) {
  const s=engine.state, effect=engine.data.skills[id]?.effects[0];
  if(!effect || effect.type!=='set_trap' || !s.battle || !battleAlive(s,owner))return;
  const foe=Boolean(owner.instance)!==Boolean(target.instance);
  if(effect.trap==='coffin' ? !foe||!feigning(target) : foe||!battleAlive(s,target))return;
  const previous=owned(engine,owner);
  if(previous)remove(s,previous);
  (s.battle.traps??=[]).push({owner:unitKey(owner),target:unitKey(target),skill:id});
  s.battle.log.push(name(engine,owner)+'は'+name(engine,target)+'に'+engine.data.skills[id].name+'を仕掛けた。');
}
export function goblinTrap(engine,owner,allies,foes) {
  if(owned(engine,owner))return null;
  const s=engine.state, level=engine.data.enemies[owner.id].level??owner.levelBand??1;
  const choices=trapSkillChoices(engine.data,level).filter(id=>{
    const {trap}=engine.data.skills[id].effects[0];
    if(trap==='coffin')return foes.some(feigning);
    if(trap==='fireline')return foes.filter(u=>hasActiveStatus(engine.data,s,u,'oiled')).length>=2;
    if(trap==='ceiling')return foes.filter(u=>battleAlive(s,u)).length>=2;
    return true;
  });
  if(!choices.length)return null;
  // First choose a trap kind so the four elements do not make the bell four times as common.
  const kinds=[...new Set(choices.map(id=>engine.data.skills[id].effects[0].trap))];
  const pick=list=>list[Math.floor(engine.random()*list.length)];
  const kind=pick(kinds),id=pick(choices.filter(id=>engine.data.skills[id].effects[0].trap===kind));
  return {id,target:kind==='coffin'?foes.find(feigning):engine.data.skills[id].target==='ally'?pick(allies):owner};
}
export function snareAttack(engine,source,targets,contact) {
  const key=unitKey(source);let stopped=false;
  for(const t of traps(engine.state)){
    if(spec(engine,t).trap!=='snare'||!hostile(t,source))continue;
    const aimed=contact && targets.some(u=>unitKey(u)===t.target);
    if(!aimed){if(t.followers)t.followers=t.followers.filter(k=>k!==key);continue;}
    if(t.followers?.includes(key)){trigger(engine,t);stopped=true;}
    else (t.followers??=[]).push(key);
  }
  if(stopped)engine.state.battle.log.push(name(engine,source)+'は縄に足を取られ、攻撃できなかった。');
  return stopped;
}
export function trapDamageRate(engine,source,target,element,projectile,action) {
  if(!action || Boolean(source.instance)===Boolean(target.instance))return 1;
  const s=engine.state,side=target.instance?'enemy':'actor',bellKey=side+':'+element;
  let rate=action.bells?.has(bellKey)?0.5:1;
  for(const t of traps(s)){
    if(!hostile(t,source))continue;
    const effect=spec(engine,t);
    if(projectile && effect.trap==='net' && !action.netUsed){
      trigger(engine,t);rate*=0.75;action.netUsed=true;
    } else if(effect.trap==='bell' && effect.element===element && !action.bells?.has(bellKey)){
      trigger(engine,t);(action.bells??=new Set()).add(bellKey);rate*=0.5;
    }
  }
  return rate;
}
export function afterTrapAction(engine,source,targets,results,id,skill,contact,strike,itemId) {
  const s=engine.state;
  for(const t of traps(s)){
    if(!traps(s).includes(t)||!hostile(t,source))continue;
    const kind=spec(engine,t).trap;
    if(kind==='siphon' && !itemId && skill.mp>0 && abilityCategory(id)==='magic'){
      trigger(engine,t);const loss=Math.min(source.mp,2);source.mp-=loss;
      s.battle.log.push(name(engine,source)+'のMPが'+loss+'減った。');continue;
    }
    if(!contact||!['barb','soot','ceiling'].includes(kind))continue;
    const hit=targets.find(u=>!hostile(t,u) && (kind==='barb'||unitKey(u)===t.target) &&
      results.some(r=>r.key===unitKey(u)&&(kind==='ceiling'||r.hit)));
    if(!hit)continue;
    const owner=unit(s,t.owner);
    if(kind==='barb'){
      trigger(engine,t);if(battleAlive(s,source))strike(owner,source,t.skill,0.3);
    }else if(kind==='soot'&&guarded(s.battle,hit)){
      trigger(engine,t);if(applyStatus(engine.data,s,source,'blindness'))s.battle.log.push(name(engine,source)+'の目に煤が入った。');
    }else if(kind==='ceiling'){
      if(t.round===s.battle.round && t.first!==unitKey(source)){
        trigger(engine,t);
        for(const u of [unit(s,t.first),source])if(battleAlive(s,u))strike(owner,u,t.skill,1.5);
      }else{t.first=unitKey(source);t.round=s.battle.round;}
    }
  }
}
export function viseStopsCover(engine,cover) {
  if(!guarded(engine.state.battle,cover))return false;
  for(const t of traps(engine.state)){
    if(spec(engine,t).trap!=='vise'||!hostile(t,cover))continue;
    const key=unitKey(cover);
    if(!t.guards?.includes(key)){(t.guards??=[]).push(key);continue;}
    trigger(engine,t);clearGuard(engine.state.battle,cover);applyStun(engine,cover,{count:2});return true;
  }
  return false;
}
export function spreadTrapFire(engine,burning,ignite) {
  const s=engine.state;
  const t=traps(s).find(t=>spec(engine,t).trap==='fireline'&&hostile(t,burning));
  if(!t)return;
  const others=units(s).filter(u=>u!==burning && hostile(t,u) && battleAlive(s,u) && hasActiveStatus(engine.data,s,u,'oiled'));
  if(others.length){trigger(engine,t);others.forEach(ignite);}
}
export function settleTrapDeaths(engine) {
  const s=engine.state,b=s.battle;
  for(const t of traps(s)){
    const target=unit(s,t.target),kind=spec(engine,t).trap;
    if(!battleAlive(s,unit(s,t.owner)) || (kind==='coffin'&&!feigning(target))){
      remove(s,t);continue;
    }
    if(kind==='coffin' && b.enemies.some(e=>e!==target && hostile(t,e) && e.hp===0 && !feigning(e) && !b.recordedKills?.includes(e.instance))){
      trigger(engine,t);sealBones(engine,target);
    }
  }
}
export function trapsValid(data,s) {
  const list=s.battle?.traps;if(list===undefined)return true;
  if(!Array.isArray(s.battle.enemies)||!Array.isArray(s.members)||!s.actors||!s.battle.enemies.every(u=>u?.instance)||!s.members.every(id=>s.actors[id]))return false;
  if(!Array.isArray(list)||!list.length||list.length>s.members.length+s.battle.enemies.length)return false;
  const keys=new Set(units(s).map(unitKey)),owners=new Set();
  const keyList=(v,side)=>v===undefined||Array.isArray(v)&&v.length<=keys.size&&new Set(v).size===v.length&&v.every(k=>keys.has(k)&&enemySide(k)===side);
  return list.every(t=>{
    if(!t||!keys.has(t.owner)||!keys.has(t.target)||owners.has(t.owner))return false;
    owners.add(t.owner);
    const effect=data.skills[t.skill]?.effects?.[0],kind=effect?.trap,foe=!enemySide(t.owner);
    return effect?.type==='set_trap' && Object.keys(t).every(k=>['owner','target','skill','guards','followers','first','round'].includes(k)) &&
      (enemySide(t.target)===foe)===(kind==='coffin') &&
      (t.guards===undefined||kind==='vise'&&keyList(t.guards,foe)) &&
      (t.followers===undefined||kind==='snare'&&keyList(t.followers,foe)) &&
      (t.first===undefined&&t.round===undefined||kind==='ceiling'&&keys.has(t.first)&&enemySide(t.first)===foe&&Number.isInteger(t.round)&&t.round>=1&&t.round<=s.battle.round);
  });
}
