import {isRecord} from './expression.js';
import {STAT_KEYS,FIELD_APIS,SKILL_EFFECTS} from './jobs.js';
export const ELEMENTS=['physical','fire','ice','lightning','water','light','earth','dark'];
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const own=(object,key)=>typeof key==='string'&&Object.hasOwn(object??{},key);
const list=(value)=>Array.isArray(value)&&new Set(value).size===value.length;
const finite=(n,min,max)=>Number.isFinite(n)&&n>=min&&n<=max;
const forbidden=new Set(['__proto__','prototype','constructor']);
const passiveRules={physicalPower:[.1,3],magicPower:[.1,3],damageTaken:[.1,3],healingPower:[.1,3],itemHealing:[.1,3],revealRadius:[1,8],trapDamage:[0,1],encounterRate:[.1,1],escapeBonus:[0,.5],lightSaveEvery:[2,100],shopDiscount:[0,.5],retreatCost:[0,1]};
export function skillDefinitionErrors(data,skill){
  const errors=[],fail=m=>errors.push(m);
  if(!isRecord(skill))return ['技能定義がありません'];
  if(!integer(skill.mp,0,999)||!integer(skill.hp??0,0,999))fail('技能消費不正');
  if(!['enemy','ally','self','all_enemies','all_allies'].includes(skill.target))fail('技能対象不正');
  if(!Array.isArray(skill.effects)||skill.effects.length>16)fail('技能効果列不正');
  if(skill.selfEffects!==undefined&&(!Array.isArray(skill.selfEffects)||skill.selfEffects.length>16))fail('自己効果列不正');
  const effects=[...(Array.isArray(skill.effects)?skill.effects:[]),...(Array.isArray(skill.selfEffects)?skill.selfEffects:[])];
  for(const effect of effects){
    if(!isRecord(effect)||!SKILL_EFFECTS.has(effect.type)){fail('未知の技能効果');continue;}
    if(effect.formula!==undefined&&!own(data.formulas,effect.formula))fail('技能式参照不正');
    if(effect.amount!==undefined&&!finite(effect.amount,0,1e6))fail('効果量不正');
    if(effect.scale!==undefined&&!finite(effect.scale,0,3))fail('効果倍率不正');
    if(effect.chance!==undefined&&!finite(effect.chance,0,1))fail('確率不正');
    if(effect.element!==undefined&&!ELEMENTS.includes(effect.element))fail('属性不正');
    if(effect.itemHealing!==undefined&&typeof effect.itemHealing!=='boolean')fail('道具回復指定不正');
    if(effect.type==='buff'&&!own(data.buffs,effect.buff))fail('バフ参照不正');
    if(effect.type==='status'&&!own(data.statuses,effect.status))fail('状態異常参照不正');
    if(['damage','heal','drain_mp','restore_mp'].includes(effect.type)&&effect.formula===undefined&&effect.amount===undefined)fail('効果量未定義');
    const common=['type','formula','amount','scale','chance','element','itemHealing','buff','status'];
    if(Object.keys(effect).some(key=>!common.includes(key)))fail('未知の効果項目');
  }
  if(skill.maxTargets!==undefined&&!integer(skill.maxTargets,1,8))fail('対象数不正');
  if(skill.selection!==undefined&&skill.selection!=='lowest_hp_ratio')fail('対象選択不正');
  if(skill.requiresAnalyzed!==undefined&&typeof skill.requiresAnalyzed!=='boolean')fail('解析条件不正');
  if(skill.weaponTypes!==undefined&&(!list(skill.weaponTypes)||!skill.weaponTypes.length||skill.weaponTypes.some(t=>!data.jobProfile?.equipmentTypes.weapon.includes(t))))fail('必要武器不正');
  if(skill.equippedItem!==undefined&&!data.items[skill.equippedItem]?.slot)fail('必要媒体不正');
  if(skill.materials!==undefined&&(!isRecord(skill.materials)||Object.entries(skill.materials).some(([id,n])=>!own(data.items,id)||!integer(n,1,data.system.maxStack))))fail('材料不正');
  if(skill.effects?.some(e=>e.type==='cover')&&skill.target!=='ally')fail('かばう対象不正');
  if(skill.effects?.some(e=>e.type==='analyze')&&skill.target!=='enemy')fail('解析対象不正');
  if(skill.requiresAnalyzed&&!['enemy','all_enemies'].includes(skill.target))fail('解析対象条件不正');
  if(skill.selfEffects?.some(e=>['cover','analyze'].includes(e.type)))fail('自己効果対象不正');
  return errors;
}
export function validateJobs(data){
  const errors=[],fail=(p,m)=>errors.push(`${p}: ${m}`),ref=(objects,id,p)=>{if(!own(objects,id))fail(p,`参照不正: ${id}`);};
  if(!data.jobs)return errors;
  const profile=data.jobProfile;
  if(!isRecord(profile)||!isRecord(profile.equipmentTypes)||!list(profile.commonSkills))return ['職業プロファイル不正'];
  for(const id of profile.commonSkills){ref(data.skills,id,'commonSkills');if(!['attack','guard'].includes(id))fail('commonSkills','共通技能は攻撃・防御です');}
  if(!profile.commonSkills.includes('attack')||!profile.commonSkills.includes('guard'))fail('commonSkills','攻撃・防御が必要です');
  for(const slot of ['weapon','armor','charm'])if(!list(profile.equipmentTypes[slot])||!profile.equipmentTypes[slot].length)fail('equipmentTypes',`${slot}不正`);
  const stats=(values,p,lo,hi,required=false)=>{if(!isRecord(values)){fail(p,'能力辞書不正');return;}if(required&&STAT_KEYS.some(key=>!Object.hasOwn(values,key)))fail(p,'能力が不足しています');for(const [key,n] of Object.entries(values))if(!STAT_KEYS.includes(key)||!finite(n,lo,hi))fail(p,'未知または範囲外の能力');};
  stats(profile.legacyGrowth,'legacyGrowth',0,100,true);
  for(const [id,job] of Object.entries(data.jobs)){
    const p=`jobs.${id}`;
    if(forbidden.has(id)||!isRecord(job)||job.id!==id||typeof job.name!=='string'||!job.name){fail(p,'職業構造不正');continue;}
    stats(job.growth,`${p}.growth`,0,100,true);stats(job.stats,`${p}.stats`,-100,100);
    if(!isRecord(job.equipment)||Object.keys(job.equipment).some(slot=>!['weapon','armor','charm'].includes(slot)))fail(p,'装備枠不正');
    for(const slot of ['weapon','armor','charm'])if(!list(job.equipment?.[slot])||job.equipment[slot].some(t=>!profile.equipmentTypes[slot]?.includes(t)))fail(p,'装備種類不正');
    if(!isRecord(job.passives))fail(p,'常時効果不正');
    for(const [key,value] of Object.entries(job.passives??{})){
      if(key==='elementPower'){if(!isRecord(value)||Object.entries(value).some(([el,n])=>!ELEMENTS.includes(el)||!finite(n,.1,3)))fail(p,'属性倍率不正');}
      else if(!passiveRules[key]||!finite(value,...passiveRules[key])||(['revealRadius','lightSaveEvery'].includes(key)&&!Number.isInteger(value)))fail(p,`未知または範囲外の常時効果: ${key}`);
    }
    if(!Array.isArray(job.grants)||!job.grants.length){fail(p,'技能許可が必要です');continue;}
    const seen=new Set();
    for(const grant of job.grants){
      if(!isRecord(grant)){fail(p,'技能許可不正');continue;}
      const key=`${grant.api}/${grant.skill}`;if(seen.has(key))fail(p,'技能許可重複');seen.add(key);
      const skill=grant.api==='battle.skill'?data.skills?.[grant.skill]:data.fieldAbilities?.[grant.skill];
      if(!skill||!(grant.api==='battle.skill'||FIELD_APIS.has(grant.api))||grant.api!=='battle.skill'&&skill.api!==grant.api||grant.target!==skill.target||!integer(grant.level,1,data.system.maxLevel)||grant.lifetime!=='equipped'||!integer(grant.maxTargets,1,8))fail(p,'技能のAPI・対象・期限・段階不正');
      if(['enemy','ally','self','location'].includes(grant.target)&&grant.maxTargets!==1)fail(p,'単体技能の対象上限不正');
      if(skill?.weaponTypes&&!skill.weaponTypes.some(type=>job.equipment?.weapon?.includes(type)))fail(p,'技能に必要な武器を装備できません');
    }
  }
  for(const [id,actor] of Object.entries(data.actors))ref(data.jobs,actor.initialJob,`actors.${id}`);
  for(const [id,item] of Object.entries(data.items))if(item.slot&&!profile.equipmentTypes[item.slot]?.includes(item.equipmentType))fail(`items.${id}`,'装備種類不正');
  for(const [id,buff] of Object.entries(data.buffs??{})){
    if(!isRecord(buff)||buff.id!==id||!integer(buff.turns,1,10)||typeof buff.name!=='string'){fail(`buffs.${id}`,'バフ構造不正');continue;}
    if(!isRecord(buff.stats)||Object.entries(buff.stats).some(([key,n])=>!['str','vit','agi','int'].includes(key)||!finite(n,.1,3)))fail(id,'バフ能力不正');
    if(!isRecord(buff.resist)||Object.entries(buff.resist).some(([key,n])=>!ELEMENTS.includes(key)||!finite(n,0,1)))fail(id,'バフ耐性不正');
    if(Object.keys(buff).some(key=>!['id','name','turns','stats','resist'].includes(key)))fail(id,'未知のバフ項目');
  }
  for(const [id,skill] of Object.entries(data.skills))for(const message of skillDefinitionErrors(data,skill))fail(`skills.${id}`,message);
  for(const [id,a] of Object.entries(data.fieldAbilities??{})){
    if(!isRecord(a)||a.id!==id||!FIELD_APIS.has(a.api)||typeof a.name!=='string'||!integer(a.mp,0,999)||!integer(a.hp??0,0,999)||!list(a.modes)||!a.modes.length||a.modes.some(m=>!['town','dungeon'].includes(m))){fail(id,'探索特技構造不正');continue;}
    if(a.api==='map.reveal'&&(a.target!=='location'||!integer(a.radius,1,8)||a.modes.includes('town')||a.output!==undefined))fail(id,'測量範囲不正');
    if(a.api==='inventory.convert'&&(a.target!=='self'||!isRecord(a.materials)||!Object.keys(a.materials).length||!isRecord(a.output)||!Object.keys(a.output).length))fail(id,'変換入出力不正');
    for(const field of ['materials','output'])if(a[field]!==undefined&&(!isRecord(a[field])||Object.entries(a[field]).some(([item,n])=>!own(data.items,item)||!integer(n,1,data.system.maxStack))))fail(id,'材料・出力不正');
  }
  for(const [id,enemy] of Object.entries(data.enemies))for(const rule of enemy.ai)if([...(data.skills[rule.skill]?.effects??[]),...(data.skills[rule.skill]?.selfEffects??[])].some(e=>['buff','cover','analyze'].includes(e.type)))fail(id,'職業専用効果は敵AIへ割り当てられません');
  return errors;
}
export function validateJobState(data,state){
  const errors=[],fail=m=>errors.push(m);if(!data.jobs)return errors;
  for(const [id,a] of Object.entries(state.actors)){
    if(!isRecord(a)||!own(data.jobs,a.job)||!isRecord(a.growthHistory)){fail('職業・成長履歴不正');continue;}
    let count=0;for(const [job,n] of Object.entries(a.growthHistory)){if(job!=='legacy'&&!own(data.jobs,job)||!integer(n,0,data.system.maxLevel-1))fail('職業成長履歴不正');count+=n;}
    if(count!==state.level-1)fail('職業成長回数がレベルと一致しません');
    for(const [slot,item] of Object.entries(a.equipment??{}))if(!data.jobs[a.job].equipment[slot]?.includes(data.items[item]?.equipmentType))fail('職業に適合しない装備です');
  }
  const b=state.battle;if(!b)return errors;
  if(!Array.isArray(b.buffs)||!Array.isArray(b.covers)||!Array.isArray(b.analyzed)||!Array.isArray(b.enemies)){fail('職業戦闘状態不正');return errors;}
  const enemyKeys=b.enemies.map(e=>`enemy:${e?.instance}`),actorKeys=state.members.map(id=>`actor:${id}`),targets=new Set([...enemyKeys,...actorKeys]);
  const source=(record)=>{
    const actor=state.actors[record.sourceActor],job=data.jobs[record.sourceJob],skill=data.skills[record.sourceSkill];
    return actor&&state.members.includes(record.sourceActor)&&actor.job===record.sourceJob&&job?.grants.some(g=>g.skill===record.sourceSkill&&g.api==='battle.skill'&&g.level<=state.level)&&skill;
  };
  const seen=new Set();
  for(const record of b.buffs){
    if(!isRecord(record)){fail('戦闘補正不正');continue;}
    const definition=data.buffs[record.id],skill=source(record),key=`${record.target}/${record.id}`;
    if(!definition||!skill||!targets.has(record.target)||!integer(record.remaining,1,definition?.turns??0)||seen.has(key)){fail('バフ期限・対象・付与元不正');continue;}seen.add(key);
    const main=skill.effects.some(e=>e.type==='buff'&&e.buff===record.id),self=skill.selfEffects?.some(e=>e.type==='buff'&&e.buff===record.id)&&record.target===`actor:${record.sourceActor}`;
    const side=['enemy','all_enemies'].includes(skill.target)?enemyKeys:skill.target==='self'?[`actor:${record.sourceActor}`]:actorKeys;
    if(!(self||main&&side.includes(record.target)))fail('バフ権限不正');
    if(Object.keys(record).some(k=>!['id','target','sourceActor','sourceJob','sourceSkill','remaining'].includes(k)))fail('未知のバフ状態項目');
  }
  const coveredBy=new Set();
  for(const record of b.covers){
    if(!isRecord(record)){fail('かばう状態不正');continue;}
    const skill=source(record);
    if(!skill?.effects.some(e=>e.type==='cover')||!actorKeys.includes(record.target)||record.target===`actor:${record.sourceActor}`||record.remaining!==1||coveredBy.has(record.sourceActor))fail('かばう権限・対象不正');coveredBy.add(record.sourceActor);
    if(Object.keys(record).some(k=>!['target','sourceActor','sourceJob','sourceSkill','remaining'].includes(k)))fail('未知のかばう状態項目');
  }
  if(new Set(b.analyzed).size!==b.analyzed.length||b.analyzed.some(id=>!enemyKeys.includes(`enemy:${id}`)))fail('解析対象不正');
  return errors;
}
