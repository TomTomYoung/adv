import {battleAlive} from './frontline-lifecycle.js';
import {frontPosition, frontlineMovePlan, moveFrontline} from './battle-frontline.js';
import {unitKey, movementBlockReason} from './buffs.js';
import {position} from './battle-grid.js';
import {clearGuard, applyStun} from './battle-turns.js';

export const profession = unit => unit?.classSkill?.split('_').at(-1);
export const tactics = unit => unit.tactics ??= {};
export const living = (s, units) => units.filter(u => battleAlive(s, u));
export const label = (engine, u) => u.name ?? engine.data.actors[u.id].name;
export const weakest = units => [...units].sort((a,b) => a.hp / a.stats.hp - b.hp / b.stats.hp)[0];

export function depth(s, u) {
  if (s.battle.frontline) return frontPosition(s, u).depth;
  if (s.battle.grid) return u.instance ? 2-position(s,u).y : position(s,u).y-3;
  return s.battle.familyField.depths[unitKey(u)] ?? 0;
}

export function moveTo(engine, u, row) {
  const s=engine.state, b=s.battle;
  if (!u || depth(s,u)===row || movementBlockReason(engine.data,b,u)) return false;
  if (b.frontline) {
    const plan=frontlineMovePlan(s,u,{depth:row},engine.data);
    if (!plan.ok) return false;
    moveFrontline(engine,u,plan.to);
  } else if (b.grid) {
    const y=u.instance ? 2-row : row+3;
    const occupied=living(s,[...b.enemies,...s.members.map(id=>s.actors[id])]).map(v=>position(s,v));
    const old=position(s,u);
    const x=[0,1,2,3,4].sort((a,c)=>Math.abs(a-old.x)-Math.abs(c-old.x)).find(x=>!occupied.some(p=>p.x===x&&p.y===y));
    if (x===undefined) return false;
    b.grid.positions[unitKey(u)]={x,y};
  } else b.familyField.depths[unitKey(u)]=row;
  b.log.push(label(engine,u)+'は'+['前列','中列','後列'][row]+'へ移った。');
  return true;
}

export function syncFamilyBattle(engine) {
  const s=engine.state,b=s.battle;
  if (!b.enemies.some(e=>e.family)) return;
  const field=b.familyField??={depths:{}, deaths:[], broken:{}, mud:{}};
  for (const [i,e] of b.enemies.entries()) field.depths[unitKey(e)]??=engine.data.encounters[b.encounter]?.frontlinePositions?.[i]?.depth ?? e.combatRow ?? 0;
  for (const id of s.members) field.depths['actor:'+id]??=s.partyFormation?.[id]?.y??0;
  for (const e of b.enemies) {
    if (e.tactics?.home!==undefined) continue;
    tactics(e).home=depth(s,e);
    if (profession(e)==='king') field.crown=e.instance;
    if (profession(e)==='chief') {
      const heir=b.enemies.find(v=>v!==e&&v.family==='orc');
      if (heir) { tactics(e).heir=heir.instance; b.log.push(e.name+'は'+heir.name+'を後継者に指名した。'); }
    }
  }
}

export function familyBattleLabels(s,u) {
  const b=s.battle, f=b?.familyField;
  if (!f) return [];
  const t=u.tactics, labels=[];
  if (b.mode==='classic') labels.push(['前列','中列','後列'][depth(s,u)]);
  if (t?.windup) labels.push('構え中');
  if (u.instance&&f.crown===u.instance) labels.push('王冠');
  if (t?.rage>0) labels.push(['','赤角','深紅角','真紅角'][t.rage]);
  if (t?.rest) labels.push('起き上がり待ち');
  if (f.broken[unitKey(u)]>=b.round) labels.push('防御崩れ');
  return labels;
}

export function breakDefense(engine,u) {
  const b=engine.state.battle;
  clearGuard(b,u);
  b.familyField.broken[unitKey(u)]=b.round+1;
}

export function familyPower(engine,source,target) {
  const b=engine.state.battle,f=b?.familyField;
  if (!f) return 1;
  const flag=target.instance&&b.enemies.some(e=>battleAlive(engine.state,e)&&e.tactics?.flag);
  return (1+(source.tactics?.rage??0)*0.18+(source.tactics?.inheritedAxe?0.45:0))*
    (flag?0.75:1)*((f.broken[unitKey(target)]??0)>=b.round?1.2:1);
}

export function familyAccuracy(engine,source,target,initial) {
  const s=engine.state,b=s.battle,f=b?.familyField;
  if (!f) return initial;
  if (source.instance&&target.id===f.firefly) return 1;
  const dark=f.darkUntil>=b.round&&!(source.family==='goblin'&&source.levelBand===15);
  const smoke=target.instance&&f.smokeUntil>=b.round&&depth(s,target)>0;
  return Math.max(0,initial-(dark?0.35:0)-(smoke?0.35:0));
}

export function familyIntercept(engine,source,targets,skill) {
  const s=engine.state,b=s.battle,f=b.familyField;
  if (!f||source.instance||targets.length!==1||!targets[0].instance||!skill.effects.some(e=>e.type==='damage')) return targets;
  const active=living(s,b.enemies);
  const taunt=active.find(e=>profession(e)==='quarrel'&&e.tactics?.challenged?.includes(source.id));
  const target=taunt??targets[0];
  if (taunt&&target!==targets[0]) b.log.push(label(engine,source)+'は'+taunt.name+'の挑発に乗った。');
  if (profession(target)==='quarrel'&&target.tactics?.challenged?.includes(source.id)) {
    const replies=tactics(target).replies??=[];
    if (!replies.includes(source.id)) replies.push(source.id);
  }
  const wall=active.find(e=>e.tactics?.wall===depth(s,target));
  if (wall) { delete wall.tactics.wall; b.log.push(wall.name+'の防壁が一撃を止めた。'); return []; }
  if (f.owl===target.instance) { delete f.owl; b.log.push('梟の声で'+target.name+'は一撃をかわした。'); return []; }
  const royal=(f.falseUntil>=b.round&&active.some(e=>e.instance===f.falseCrown))?f.falseCrown:f.crown;
  const cover=active.find(e=>e!==target&&((profession(e)==='guard'&&royal===target.instance)||e.tactics?.cover===target.instance));
  if (!cover) return [target];
  delete tactics(cover).cover;
  b.log.push(cover.name+'が'+target.name+'をかばった。');
  return [cover];
}

export function recordFamilyDeaths(engine) {
  const b=engine.state.battle,f=b?.familyField;
  if (!f) return;
  for (const dead of b.enemies) {
    if (dead.hp>0||f.deaths.includes(dead.instance)) continue;
    f.deaths.push(dead.instance);
    const heir=b.enemies.find(e=>e.instance===dead.tactics?.heir&&e.hp>0);
    if (heir) { tactics(heir).inheritedAxe=true; b.log.push(heir.name+'は族長の大斧を継いだ。'); }
  }
}

export function familyAfterHit(engine,source,targets,skillId,skill,results,react) {
  const s=engine.state,b=s.battle,f=b.familyField;
  if (!f) return;
  const damage=skill.effects.some(e=>e.type==='damage');
  if (source.instance && damage) {
    tactics(source).lastAttack=skillId;
    if (skillId!=='attack') tactics(source).lastSpecial=skillId;
    const victim=targets.find(t=>!t.instance&&results.some(r=>r.key===unitKey(t)&&r.damage>0));
    if (victim) {
      f.lastVictim=victim.id;
      if (f.omen===victim.id && source.hp>0) {
        source.hp=Math.min(source.stats.hp,source.hp+Math.max(1,Math.ceil(source.stats.hp/5)));
        delete f.omen; b.log.push('牙占いが当たり、'+source.name+'のHPが回復した。');
      }
    }
  }
  for (const target of targets) {
    if (!target.instance||!results.some(r=>r.key===unitKey(target)&&r.damage>0)) continue;
    const t=tactics(target),role=profession(target);
    if (target.family==='ogre'&&target.levelBand===15) {
      t.rage=role==='firewalker'&&skill.effects.some(e=>e.element==='fire')?3:Math.min(3,(t.rage??0)+1);
      b.log.push(target.name+'の角が'+['','赤みを帯びた','赤く染まった','真紅に染まった'][t.rage]+'。');
    }
    if (role==='mountainking'&&t.windup&&target.hp>0) {
      delete t.windup; applyStun(engine,target,{count:1}); b.log.push(target.name+'は軸足を崩され転倒した。');
    }
    if (source.instance||!battleAlive(s,source)||!battleAlive(s,target)) continue;
    if (role==='hex'&&t.windup) react(target,source);
    const statue=living(s,b.enemies).find(e=>e!==target&&e.tactics?.watching);
    if (statue) { delete statue.tactics.watching; react(statue,source); }
  }
  recordFamilyDeaths(engine);
}

export function familyAfterMove(engine,unit,old,react) {
  const s=engine.state,b=s.battle,f=b.familyField;
  if (!f||old===depth(s,unit)) return;
  const row=depth(s,unit);
  if (f.chain?.includes(unitKey(unit))) {
    const other=s.members.map(id=>s.actors[id]).find(u=>u!==unit&&f.chain.includes(unitKey(u))&&battleAlive(s,u));
    if (other) moveTo(engine,other,row);
  }
  if (!unit.instance&&old<row) {
    const hunter=living(s,b.enemies).find(e=>profession(e)==='hunter');
    if (hunter) react(hunter,unit);
  }
}

export function familySaveValid(data,state) {
  const b=state.battle, f=b.familyField;
  const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
  const tier=v=>Number.isInteger(v)&&v>=0&&v<=2;
  const units=b.enemies, enemies=new Set(units.map(e=>e?.instance)), actors=new Set(state.members);
  const keys=new Set([...state.members.map(id=>'actor:'+id),...units.filter(Boolean).map(unitKey)]);
  const hasFamily=units.some(e=>data.enemies[e?.id]?.family);
  if(!hasFamily)return f===undefined&&units.every(e=>!e?.classSkill&&!e?.family&&!e?.tactics);
  if(!record(f)||!record(f.depths)||!record(f.mud)||!record(f.broken)||!Array.isArray(f.deaths))return false;
  if(Object.entries(f.depths).some(([key,v])=>!keys.has(key)||!tier(v))||
    Object.entries(f.mud).some(([k,v])=>!['0','1','2'].includes(k)||!Number.isInteger(v))||
    Object.entries(f.broken).some(([k,v])=>!keys.has(k)||!Number.isInteger(v))||
    f.deaths.some(id=>!enemies.has(id))||new Set(f.deaths).size!==f.deaths.length)return false;
  if(f.chain!==undefined&&(!Array.isArray(f.chain)||f.chain.length!==2||f.chain.some(k=>!keys.has(k))))return false;
  for(const k of ['crown','piper','owl','ordered','falseCrown','bridge'])if(f[k]!==undefined&&!enemies.has(f[k]))return false;
  for(const k of ['focus','omen','lastVictim','firefly'])if(f[k]!==undefined&&!actors.has(f[k]))return false;
  for(const e of units) {
    const def=data.enemies[e?.id],t=e?.tactics;
    if(!def||e.classSkill!==def.classSkill||e.family!==def.family||e.levelBand!==def.levelBand||!record(t)||!tier(t.home))return false;
    if(t.windup!==undefined&&(!record(t.windup)||!tier(t.windup.row)||!tier(t.windup.left)))return false;
    for(const k of ['lastAttack','lastSpecial'])if(t[k]!==undefined&&!Object.hasOwn(data.skills,t[k]))return false;
    if(t.honored!==undefined&&(!Array.isArray(t.honored)||t.honored.some(id=>!enemies.has(id))))return false;
    for(const k of ['replies','challenged'])if(t[k]!==undefined&&(!Array.isArray(t[k])||t[k].some(id=>!actors.has(id))))return false;
    for(const k of ['clay','heir','cover'])if(t[k]!==undefined&&!enemies.has(t[k]))return false;
    if(t.rage!==undefined&&(!Number.isInteger(t.rage)||t.rage<0||t.rage>3))return false;
  }
  return true;
}
