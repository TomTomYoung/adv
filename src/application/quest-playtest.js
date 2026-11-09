import {GameEngine} from '../core/engine.js';
import {nextFormation} from '../core/battle-formation.js';
import {canEquip} from '../core/jobs.js';
import {syncSkillGrowth} from '../core/skill-levels.js';
import {nextQuestPlace} from '../core/quest-navigation.js';
import {snapshotRecords} from '../core/records.js';
import {freshFeedback} from '../core/feedback.js';
import {locationRoot} from '../core/world.js';

const own=(o,k)=>typeof k==='string'&&Object.hasOwn(o??{},k);
const integer=(n,min,max)=>Number.isInteger(n)&&n>=min&&n<=max;
const record=x=>x&&typeof x==='object'&&!Array.isArray(x);
export function requiredQuestMembers(expression){
  if(!record(expression))return [];
  if(expression.op==='has_member')return [expression.actor];
  return [...new Set((expression.args??[]).flatMap(requiredQuestMembers))];
}
export function questPartyErrors(data,catalog,edition=data.scenarioEdition){
  const errors=[],fail=m=>errors.push(m),plans=catalog?.quests?.[edition];
  if(catalog?.schemaVersion!==1||!integer(catalog.revision,1,1e9)||!record(plans)||!record(catalog.parties)||!record(catalog.loadouts)||!record(catalog.supplies))return ['クエスト試遊定義の版・形式が不正です。'];
  for(const [id,p] of Object.entries(catalog.parties)){
    if(!p?.name||!p.tactic||!Array.isArray(p.members)||!integer(p.members.length,1,data.system.maxParty)||new Set(p.members).size!==p.members.length||p.members.some(a=>!own(data.actors,a)))fail(`${id}: 編成が不正です。`);
  }
  for(const [id,l] of Object.entries(catalog.loadouts)){
    if(!own(data.actors,id)||!own(data.jobs,l?.job)||!Array.isArray(l.equipment)){fail(`${id}: 職業・装備が不正です。`);continue;}
    const slots=new Set();
    for(const item of l.equipment){const slot=data.items[item]?.slot;if(!slot||slots.has(slot)||!canEquip(data,{actors:{[id]:{job:l.job}}},id,item))fail(`${id}: 装備不可・装備枠の重複 ${item}`);slots.add(slot);}
  }
  for(const [id,s] of Object.entries(catalog.supplies))if(!integer(s?.gold,0,1e6)||!record(s.items)||Object.entries(s.items).some(([item,n])=>!own(data.items,item)||data.items[item].slot||!integer(n,0,data.system.maxStack)))fail(`${id}: 支給品が不正です。`);
  for(const id of Object.keys(plans))if(!own(data.quests,id))fail(`${id}: 対象版にないクエストです。`);
  for(const [id,q] of Object.entries(data.quests)){
    const p=plans[id],l=p?.level;
    if(!record(p)){fail(`${id}: 想定がありません。`);continue;}
    if(!l||!integer(l.min,1,data.system.maxLevel)||!integer(l.max,l.min,data.system.maxLevel)||!integer(l.standard,l.min,l.max))fail(`${id}: レベル帯が不正です。`);
    if(!Array.isArray(p.parties)||p.parties.length<2||new Set(p.parties).size!==p.parties.length){fail(`${id}: 異なる2編成以上が必要です。`);continue;}
    const compositions=new Set();
    for(const key of p.parties){const party=catalog.parties[key];if(!party?.members){fail(`${id}: 未定義の編成 ${key}`);continue;}
      compositions.add([...party.members].sort().join(','));
      if(party.members.some(a=>!own(catalog.loadouts,a)))fail(`${id}: 初期装備の定義がありません。`);
      if(requiredQuestMembers(q.requires).some(a=>!party.members.includes(a)))fail(`${id}/${key}: 同伴条件を満たしません。`);
    }
    if(compositions.size<2)fail(`${id}: メンバーが異なる編成が必要です。`);
    if(!own(catalog.supplies,p.supplies))fail(`${id}: 支給品がありません。`);
    if(!Array.isArray(p.expectedOutcomes)||!p.expectedOutcomes.length||p.expectedOutcomes.some(o=>!own(q.outcomes,o)))fail(`${id}: 検証対象の結末が不正です。`);
  }
  return errors;
}

// Only prerequisite history is synthesized. Target events, battles, rewards,
// inventory use and completion always run through the unmodified GameEngine.
function preparePrerequisites(engine,id){
  const {data,state}=engine,prepared=new Set(),visiting=new Set();
  const recount=()=>{state.vars.completed=0;for(const q of Object.values(data.quests))state.vars[`region_${q.region}`]=0;for(const q of Object.values(data.quests))if(state.quests[q.id].stage==='completed'){state.vars.completed++;state.vars[`region_${q.region}`]++;}};
  const complete=key=>{
    if(key===id||visiting.has(key)||!own(data.quests,key))throw Error(`前提依頼の循環・参照不正: ${key}`);
    if(prepared.has(key))return;
    visiting.add(key);satisfy(data.quests[key].requires,false);visiting.delete(key);
    state.quests[key]={stage:'completed',evidence:[],outcome:Object.keys(data.quests[key].outcomes)[0]};
    if(data.quests[key].story)(state.flags.legacyStoryRoutes??={})[key]=true;
    state.records.baselines[key]=snapshotRecords(state.records);prepared.add(key);recount();
  };
  const satisfy=(x,current=true)=>{
    if(x==null||x===true)return;
    if(x?.op==='and'){x.args.forEach(v=>satisfy(v,current));return;}
    if(x?.op==='or'&&x.args?.length){satisfy(x.args[0],current);return;}
    if(x?.op==='has_member'){if(current&&!state.members.includes(x.actor))throw Error(`同伴必須: ${x.actor}`);return;}
    const quest=x?.left?.ref?.match(/^quests\.(q\d+)\.stage$/);
    if(x?.op==='eq'&&quest&&x.right==='completed'){complete(quest[1]);return;}
    const variable=x?.left?.ref?.match(/^vars\.(completed|region_(\d+))$/);
    if(x?.op==='gte'&&variable&&integer(x.right,0,Object.keys(data.quests).length)){
      recount();for(const q of Object.values(data.quests).filter(q=>q.id!==id&&(!variable[2]||q.region===Number(variable[2])))){
        if((state.vars[variable[1]]??0)>=x.right)break;
        if(!visiting.has(q.id)&&state.quests[q.id].stage!=='completed')complete(q.id);
      }
      if((state.vars[variable[1]]??0)>=x.right)return;
    }
    throw Error(`未対応の受注前提です: ${x?.op??'不明'}`);
  };
  satisfy(data.quests[id].requires);return [...prepared];
}

export function createQuestTrial(data,catalog,options){
  const {quest,party,level,seed=1907,start='reception',battleMode='auto',outcome}=options;
  const plan=catalog.quests?.[data.scenarioEdition]?.[quest],team=catalog.parties?.[party];
  if(!plan||!plan.parties.includes(party)||!team||!integer(level,plan.level.min,plan.level.max)||!integer(seed,1,4294967295)||!['reception','site'].includes(start)||!['auto','classic','grid','frontline'].includes(battleMode)||outcome!==undefined&&!own(data.quests[quest].outcomes,outcome))throw Error('依頼・編成・レベル帯・シード・開始条件を確認してください。');
  const engine=new GameEngine(data,seed),s=engine.state;
  s.vm=[];s.waiting=null;s.battle=null;s.battleResult=null;s.notice='';s.log=[];
  delete s.presentation.message;delete s.presentation.cast;delete s.presentation.castCue;
  s.members=[...team.members];s.partyFormation=nextFormation(s.members);s.partyFrontlineFormation=Object.fromEntries(s.members.map(id=>[id,{depth:s.partyFormation[id].y,lane:s.partyFormation[id].x}]));s.battleModePreference=battleMode;
  const kit=catalog.supplies[plan.supplies];s.gold=kit.gold;s.inventory={};s.carried={};
  for(const [item,n] of Object.entries(kit.items))engine.give(item,n);
  for(const id of s.members){
    const a=s.actors[id],loadout=catalog.loadouts[id];a.job=loadout.job;a.level=level;a.xp=data.system.xpBase*(level-1)*level;a.growthHistory={[a.job]:level-1};
    for(const item of loadout.equipment){engine.give(item,1);if(!engine.equip(id,item))throw Error(`${id}: 装備できません ${item}`);}
    a.hp=engine.stats(id).hp;a.mp=engine.stats(id).mp;a.statuses=[];
  }
  syncSkillGrowth(engine);
  const prerequisites=preparePrerequisites(engine,quest),owner=data.worldTravel?.questSettlements[quest]??data.worldTravel?.home,settlement=data.worldTravel?.settlements[owner];
  s.townLocation=data.quests[quest].receptionLocations?.[0]??settlement?.root??data.game.world.townRoot;
  const setupActions=[];
  const register=(settlementId,map)=>{
    if(!s.worldTravel)return;
    if(settlementId){s.worldTravel.visited[settlementId]=true;const reg=data.worldTravel.settlements[settlementId].registration;if(reg)s.worldTravel.registrations[reg]=true;}
    const registration=data.worldTravel.mapRegistrations[map];if(registration)s.worldTravel.registrations[registration]=true;
  };
  if(s.worldTravel){register(owner);s.worldTravel.returnAnchor=owner;}
  if(!engine.dispatch({type:'accept',id:quest}))throw Error(`受注できません: ${quest} / ${s.notice}`);
  const initial=partySnapshot(engine),inventory=structuredClone(s.inventory);
  if(start==='site'){
    const place=nextQuestPlace(data,s,quest);if(!place)throw Error(`${quest}: 最初の現場がありません。`);
    if(place.kind==='town'){
      const root=locationRoot(data,place.location)?.id,here=Object.entries(data.worldTravel?.settlements??{}).find(([,s])=>s.root===root)?.[0];register(here);engine.arriveSettlement(place.location);
    }else{
      const owner=data.worldTravel?.dungeonSettlements[place.dungeon];register(owner,place.map);if(owner)s.worldTravel.returnAnchor=owner;
      for(const [system,spec] of Object.entries(data.dungeons[place.dungeon].systems))if(spec.use==='compartment_water'){
        const zone=spec.zones.find(z=>z.map===place.map&&z.initiallyFlooded);if(!zone)continue;
        const control=spec.controls.find(c=>c.id===zone.control);engine.teleport(control.map,control.x,control.y);
        if(!engine.dispatch({type:'dungeon.action',system,action:'close',target:control.id}))throw Error('現場の排水準備に失敗しました。');
        setupActions.push(`${place.map}: 開始前に${control.name}で排水`);
      }
      engine.teleport(place.map,place.x,place.y,place.facing??'north',place.z??0);
    }
    // The authored entry script checks its own scene/action requirements.
    const q=data.quests[quest],script=q.model.entryScript??q.events?.find(e=>e.role==='decision')?.script;
    if(!script||!own(data.scripts,script))throw Error(`${quest}: 開始イベントがありません。`);
    engine.run(script);
  }
  engine.feedback=freshFeedback();
  const trial={engine,config:{edition:data.scenarioEdition,quest,party,level,seed,start,battleMode,expectedOutcomes:outcome?[outcome]:[...plan.expectedOutcomes],catalogRevision:catalog.revision},prerequisites,setupActions,initial,inventory,gold:kit.gold,actions:0,rescues:0,changedParty:false,finished:null};
  const defeat=engine.defeat.bind(engine);engine.defeat=(...args)=>{trial.rescues++;return defeat(...args);};
  return trial;
}
function partySnapshot(engine){return engine.state.members.map(id=>{const a=engine.state.actors[id];return {id,job:a.job,level:a.level,hp:a.hp,mp:a.mp,maxHp:engine.stats(id).hp,maxMp:engine.stats(id).mp,equipment:{...a.equipment}};});}
export function questTrialReport(trial){
  if(trial.finished)return structuredClone(trial.finished);
  const {engine,config}=trial,s=engine.state,q=s.quests[config.quest],party=partySnapshot(engine),r=s.records;
  const changed=trial.changedParty||party.length!==trial.initial.length||party.some(a=>!trial.initial.some(b=>b.id===a.id&&b.job===a.job));
  const status=r.losses>0||trial.rescues>0?'defeated':q.stage==='completed'?(changed?'changed_party':config.expectedOutcomes.includes(q.outcome)?'cleared':'other_outcome'):'playing';
  const allItems=new Set([...Object.keys(trial.inventory),...Object.keys(s.inventory)]);
  return {schemaVersion:1,config:{...config,expectedOutcomes:[...config.expectedOutcomes]},contentVersion:engine.data.game.version,status,stage:q.stage,outcome:q.outcome,actions:trial.actions,rescues:trial.rescues,steps:s.steps,records:snapshotRecords(r),initial:structuredClone(trial.initial),party,gold:{start:trial.gold,end:s.gold},items:Object.fromEntries([...allItems].filter(id=>(trial.inventory[id]??0)!==(s.inventory[id]??0)).map(id=>[id,{start:trial.inventory[id]??0,end:s.inventory[id]??0}])),setup:{prerequisites:[...trial.prerequisites],actions:[...trial.setupActions],skippedApproach:config.start==='site'}};
}
export function dispatchQuestTrial(trial,intent){
  if(trial.finished)return false;
  const changed=trial.engine.dispatch(intent);
  if(changed){trial.actions++;const party=partySnapshot(trial.engine);trial.changedParty||=party.length!==trial.initial.length||party.some(a=>!trial.initial.some(b=>b.id===a.id&&b.job===a.job));}
  const report=questTrialReport(trial);if(report.status!=='playing')trial.finished=report;
  return changed;
}
