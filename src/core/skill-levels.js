import {isRecord} from './expression.js';
import {grantsFor} from './jobs.js';

const owns=(o,k)=>typeof k==='string'&&Object.hasOwn(o??{},k);
const int=(n,min=0,max=1e9)=>Number.isInteger(n)&&n>=min&&n<=max;
const safe=k=>typeof k==='string'&&/^[\w./:-]{1,160}$/.test(k)&&!['__proto__','constructor','prototype'].includes(k);
export const skillDefinition=(data,id)=>owns(data.skills,id)?data.skills[id]:owns(data.fieldAbilities,id)?data.fieldAbilities[id]:null;
export const skillLevel=(state,actor,id)=>state.actors[actor]?.skillProgress?.[id]?.level??1;
export const maxSkillLevel=spec=>spec?.maxSkillLevel??3;
export const skillLearned=(data,state,actor,id)=>Boolean(state.actors[actor]&&grantsFor(data,state,actor).some(g=>g.skill===id&&g.level<=state.actors[actor].level));
export function effectiveSkill(data,state,actor,id){
  const spec=skillDefinition(data,id);if(!spec)return null;
  // Each level is a delta from the previous level; identity and permission never change.
  const result={...spec};for(let n=2;n<=skillLevel(state,actor,id);n++)Object.assign(result,spec.levels?.[n]);
  return result;
}
function conditionMet(engine,actor,id,c,event,rolls){
  const {data,state}=engine,a=state.actors[actor],count=(group,key)=>a.skillCounters?.[group]?.[key]??0;
  if(c.all)return c.all.every(v=>conditionMet(engine,actor,id,v,event,rolls));
  if(c.any)return c.any.some(v=>conditionMet(engine,actor,id,v,event,rolls));
  switch(c.kind){
    case 'actor_level':return a.level>=c.level;
    case 'uses':return (a.skillProgress?.[c.skill??id]?.uses??0)>=c.count;
    case 'weapon_uses':return count('weapons',c.weapon)>=c.count;
    case 'action_uses':return count('actions',c.action)>=c.count;
    case 'event':return Boolean(state.events[c.event]);
    case 'flag':return state.flags[c.flag]===(c.value??true);
    case 'training':return count('training',c.skill??id)>=c.count;
    case 'skill':return skillLearned(data,state,actor,c.skill)&&skillLevel(state,actor,c.skill)>=(c.level??1);
    case 'companion':return state.members.includes(c.actor)&&state.actors[c.actor].hp>0;
    case 'random':{
      if(!event||event[c.on]!==c.id)return false;
      if(!rolls.has(c))rolls.set(c,engine.random()<c.chance);
      return rolls.get(c);
    }
    default:return false;
  }
}
function progress(actor,id){return (actor.skillProgress??={})[id]??=({level:1,uses:0});}
function increment(actor,group,key,count=1){const counters=(actor.skillCounters??={})[group]??={};counters[key]=Math.min(1e9,(counters[key]??0)+count);}
export function advanceSkills(engine,actor,event=null){
  const {data,state}=engine,a=state.actors[actor];if(!a)return [];
  const grown=[];
  for(const id of new Set(grantsFor(data,state,actor).filter(g=>g.level<=a.level).map(g=>g.skill))){
    const spec=skillDefinition(data,id),level=skillLevel(state,actor,id),condition=spec?.levelUp?.[level+1];
    // At most one stage per evaluation and one random trial per real action.
    if(level<maxSkillLevel(spec)&&condition&&conditionMet(engine,actor,id,condition,event,new Map())){
      progress(a,id).level++;grown.push(id);engine.log(`${data.actors[actor].name}の${spec.name}が技能Lv${level+1}になりました。`);
    }
  }
  return grown;
}
export function syncSkillGrowth(engine){for(const id of Object.keys(engine.state.actors))advanceSkills(engine,id);}
export function recordSkillUse(engine,actor,id,{weapon=false,action}={}){
  const a=engine.state.actors[actor],p=progress(a,id);p.uses=Math.min(1e9,p.uses+1);
  const weaponId=weapon?a.equipment.weapon:null;if(weaponId)increment(a,'weapons',weaponId);
  if(action)increment(a,'actions',action);
  advanceSkills(engine,actor,{skill:id,...(weaponId?{weapon:weaponId}:{}),...(action?{action}:{})});
}
export function trainSkill(engine,actor,id){
  if(!skillLearned(engine.data,engine.state,actor,id)||!engine.state.members.includes(actor)||engine.state.actors[actor].hp<=0)throw Error('訓練対象の技能・人物が不正です');
  increment(engine.state.actors[actor],'training',id);advanceSkills(engine,actor);
}
export function recordSkillAction(engine,actor,action){
  if(!engine.data.jobProfile.skillActions?.includes(action)||!engine.state.members.includes(actor))throw Error('技能成長用行動が不正です');
  increment(engine.state.actors[actor],'actions',action);advanceSkills(engine,actor,{action});
}
function conditionText(data,state,actor,id,c,progressOnly=false){
  const a=state.actors[actor],counter=(g,k)=>a.skillCounters?.[g]?.[k]??0,name=id=>skillDefinition(data,id)?.name??id;
  if(c.all||c.any)return (c.all??c.any).map(v=>conditionText(data,state,actor,id,v,progressOnly)).filter(Boolean).join(c.all?'・':' または ');
  switch(c.kind){
    case 'actor_level':return `人物Lv ${a.level}/${c.level}`;
    case 'uses':return `${name(c.skill??id)}の使用 ${(a.skillProgress?.[c.skill??id]?.uses??0)}/${c.count}回`;
    case 'weapon_uses':return `${data.items[c.weapon].name}の使用 ${counter('weapons',c.weapon)}/${c.count}回`;
    case 'action_uses':return `${c.action} ${counter('actions',c.action)}/${c.count}回`;
    case 'training':return `訓練 ${counter('training',c.skill??id)}/${c.count}回`;
    case 'skill':return progressOnly?'':`${name(c.skill)} 技能Lv${c.level??1}`;
    case 'companion':return progressOnly?'':`${data.actors[c.actor].name}の同伴`;
    case 'event':return progressOnly?'':`イベント「${c.event}」完了`;
    case 'flag':return progressOnly?'':`条件「${c.flag}」達成`;
    case 'random':return progressOnly?'':`${c.on==='skill'?name(c.id):c.on==='weapon'?data.items[c.id].name:c.id}使用時 ${Math.round(c.chance*100)}%`;
    default:return '';
  }
}
export function skillGrowthView(data,state,actor,id){
  const spec=skillDefinition(data,id),level=skillLevel(state,actor,id),condition=spec?.levelUp?.[level+1],policy=spec?.growthDisplay??'full';
  return {skillLevel:level,maxSkillLevel:maxSkillLevel(spec),growth:condition&&policy!=='hidden'?conditionText(data,state,actor,id,condition,policy==='progress'):''};
}
export const LEVEL_FIELDS=['mp','hp','effects','selfEffects','maxTargets','amount','radius','duration','actions','rate','hidden','difficulty','trapKinds','recover','returnSteps','cells','disarmCount'];
export function skillLevelDefinitionErrors(data,id,spec){
  if(!isRecord(spec))return [`${id}: 技能定義不正`];
  const errors=[],fail=m=>errors.push(`${id}: ${m}`),max=maxSkillLevel(spec);
  if(!int(max,1,20))fail('技能最大Lv不正');
  if(spec.growthDisplay!==undefined&&!['full','progress','hidden'].includes(spec.growthDisplay))fail('技能成長表示不正');
  const visit=(c,depth=0)=>{
    if(!isRecord(c)||depth>12){fail('技能成長条件不正');return;}
    if(c.all||c.any){const key=c.all?'all':'any',list=c[key];if(Object.keys(c).length!==1||!Array.isArray(list)||!list.length||list.length>16)fail('技能成長条件の結合不正');else list.forEach(v=>visit(v,depth+1));return;}
    const keys={actor_level:['level'],uses:['skill','count'],weapon_uses:['weapon','count'],action_uses:['action','count'],event:['event'],flag:['flag','value'],training:['skill','count'],skill:['skill','level'],companion:['actor'],random:['on','id','chance']}[c.kind];
    if(!keys||Object.keys(c).some(k=>k!=='kind'&&!keys.includes(k))){fail('未知の技能成長条件');return;}
    if(['uses','weapon_uses','action_uses','training'].includes(c.kind)&&!int(c.count,1))fail('成長回数不正');
    if(c.kind==='actor_level'&&!int(c.level,1,data.system.maxLevel))fail('成長人物Lv不正');
    if((c.kind==='skill'||c.skill!==undefined)&&!skillDefinition(data,c.skill))fail('成長技能参照不正');
    if(c.kind==='skill'&&(!int(c.level??1,1,maxSkillLevel(skillDefinition(data,c.skill)??{}))))fail('前提技能Lv不正');
    if(c.kind==='weapon_uses'&&data.items[c.weapon]?.slot!=='weapon')fail('成長武器参照不正');
    if(c.kind==='action_uses'&&!data.jobProfile.skillActions?.includes(c.action))fail('成長行動参照不正');
    if(c.kind==='event'&&!safe(c.event)||c.kind==='flag'&&(!safe(c.flag)||c.value!==undefined&&!['boolean','number','string'].includes(typeof c.value)))fail('イベント成長条件不正');
    if(c.kind==='companion'&&!owns(data.actors,c.actor))fail('同伴人物参照不正');
    if(c.kind==='random'&&(!Number.isFinite(c.chance)||c.chance<0||c.chance>1||!['skill','weapon','action'].includes(c.on)||!(c.on==='skill'?skillDefinition(data,c.id):c.on==='weapon'?data.items[c.id]?.slot==='weapon':data.jobProfile.skillActions?.includes(c.id))))fail('技能成長抽選不正');
  };
  for(const field of ['levels','levelUp'])if(spec[field]!==undefined){
    if(!isRecord(spec[field])){fail(`${field}不正`);continue;}
    for(const [n,value] of Object.entries(spec[field])){
      if(!/^[1-9]\d*$/.test(n)||!int(Number(n),2,max))fail('技能段階不正');
      if(field==='levelUp')visit(value);
      else if(!isRecord(value)||Object.keys(value).some(k=>!LEVEL_FIELDS.includes(k)))fail('技能段階の変更項目不正');
    }
  }
  if(spec.levelUp)for(let n=2;n<=Math.max(1,...Object.keys(spec.levelUp).map(Number));n++)if(!spec.levelUp[n])fail('技能成長条件の中間段階が不足');
  return errors;
}
export function skillProgressErrors(data,state){
  const errors=[],fail=()=>errors.push('技能Lv・使用回数・成長カウンター不正');
  for(const a of Object.values(state.actors??{})){
    if(!isRecord(a)){fail();continue;}
    if(a.skillProgress!==undefined){
      if(!isRecord(a.skillProgress)){fail();continue;}
      for(const [id,p] of Object.entries(a.skillProgress)){const spec=skillDefinition(data,id);if(!spec||!isRecord(p)||Object.keys(p).some(k=>!['level','uses'].includes(k))||!int(p.level,1,maxSkillLevel(spec))||!int(p.uses))fail();}
    }
    if(a.skillCounters!==undefined){
      if(!isRecord(a.skillCounters)){fail();continue;}
      for(const [group,counts] of Object.entries(a.skillCounters)){
        if(!['weapons','actions','training'].includes(group)||!isRecord(counts)){fail();continue;}
        for(const [key,n] of Object.entries(counts))if(!int(n)||!(group==='weapons'?data.items[key]?.slot==='weapon':group==='training'?skillDefinition(data,key):data.jobProfile.skillActions?.includes(key)))fail();
      }
    }
  }
  return errors;
}
