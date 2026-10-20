import {expeditionFieldCards,expeditionFieldSaveValid} from './expedition-field.js';
import {skillDefinition} from './skill-levels.js';
import {clone,isRecord,evaluate} from './expression.js';
import {townLocation,dungeonInterior} from './world.js';
import {dungeonEntryReason} from './quest-navigation.js';
import {dungeonRestrictionReason} from './dungeon-restrictions.js';
import {canInteractAt} from './event-interaction.js';
import {managesOil,oilLamp,oilFire,oilTotal,oilRoom,balanceOil,enableOil,useReserve} from './expedition-oil.js';

const own=(o,k)=>typeof k==='string'&&Object.hasOwn(o??{},k);
const int=(n,min=0,max=1e9)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
export const freshExpedition=()=>({version:1,managed:false,gems:0,capacity:180,reserve:0,storedOil:0,storedBottles:0,lamp:{fuel:90,effect:null},camps:{},learned:{}});
const campById=(data,id)=>data.expedition?.camps.find(c=>c.id===id);
const taughtTargets=(data,state,actor,id)=>{let count=skillDefinition(data,id).maxTargets??1;for(let n=2;n<=(state.expedition.learned[actor]?.[id]??1);n++)count=skillDefinition(data,id).levels?.[n]?.maxTargets??count;return count;};
export const campTier=state=>Math.max(0,...Object.values(state.expedition?.camps??{}).map(c=>c.relay?2:c.supply?1:0));
export const expeditionShopTier=(data,state)=>Math.max(state.flags.kagaribi?.legacyShopTier??0,...data.expedition.camps.filter(c=>state.expedition?.camps[c.id]?.supply).map(c=>c.shopTier===2&&!state.expedition.camps[c.id].relay?1:c.shopTier??(c.dungeon==='kagaribi'?0:state.expedition.camps[c.id].relay?2:1)));
export function purchasedGrants(data,state,actor){
  const a=state.actors[actor];if(!data.expedition||!a)return [];
  return Object.keys(state.expedition?.learned[actor]??{}).filter(id=>data.expedition.products[id]?.jobs.includes(a.job)).map(skill=>({skill,level:1,api:skillDefinition(data,skill).api??'battle.skill',target:skillDefinition(data,skill).target,maxTargets:taughtTargets(data,state,actor,skill),lifetime:'equipped'}));
}
export function addGems(state,amount){if(state.expedition)state.expedition.gems=Math.min(1e9,state.expedition.gems+amount);}
export function battleGems(data,battle){return data.expedition?battle.enemies.reduce((sum,e)=>sum+(data.expedition.enemyGems[e.id]??0),0):0;}
export function skillPurchasePlan(data,state,actor,id,level){
  const e=state.expedition,p=data.expedition?.products[id],a=state.actors[actor],skill=skillDefinition(data,id);
  if(!e||!own(data.expedition.products,id)||!own(state.actors,actor)||!p||!a||!int(level,1,3))return {ok:false,reason:'技能・人物・段階を選び直してください。'};
  if(state.mode!=='town'||dungeonInterior(data,state)||state.waiting||state.battle||townLocation(data,state)?.id!==data.expedition.shopLocation)return {ok:false,reason:'町の技能店で習得できます。'};
  if(campTier(state)<p.tier)return {ok:false,reason:p.tier===1?'給油設備を修理すると販売が始まります。':'中継設備を起動すると販売が始まります。'};
  if(p.unlockTier&&expeditionShopTier(data,state)<p.unlockTier)return {ok:false,reason:p.unlockTier===1?'篝火4Fの給油設備を修理すると販売が始まります。':'篝火7Fの給油設備を修理し、中継を起動すると販売が始まります。'};
  if(p.requiresCamp&&!e.camps[p.requiresCamp]?.supply)return {ok:false,reason:`${campById(data,p.requiresCamp).name}を修理すると販売が始まります。`};
  if(p.requiresRelay&&!e.camps[p.requiresCamp]?.relay)return {ok:false,reason:`${campById(data,p.requiresCamp).name}の中継設備を起動すると販売が始まります。`};
  if(!p.jobs.includes(a.job))return {ok:false,reason:'現在の職業ではこの技能を使えません。'};
  if(skill.weaponTypes&&!skill.weaponTypes.includes(data.items[a.equipment.weapon]?.equipmentType))return {ok:false,reason:'対応する武器を装備してから選んでください。'};
  const bought=e.learned[actor]?.[id]??0,current=bought?Math.max(bought,a.skillProgress?.[id]?.level??1):0;
  if(!bought&&(data.jobs[a.job]?.grants??[]).some(g=>g.skill===id&&g.level<=a.level))return {ok:false,reason:'この技能は職業で習得済みです。'};
  if(level!==current+1)return {ok:false,reason:level<=current?'この段階は習得済みです。':'一つ前の段階を習得してください。'};
  if(level>1&&!skill.levels?.[level])return {ok:false,reason:'この技能の上位教習はまだありません。'};
  const price=p.price*(level===1?1:level===2?2:4);
  return e.gems<price?{ok:false,reason:`技能宝石が${price-e.gems}個足りません。`,price}:{ok:true,price};
}
export function buySkill(engine,intent){
  const {data,state}=engine,p=skillPurchasePlan(data,state,intent.actor,intent.skill,intent.level);
  if(!p.ok){engine.notify(p.reason);return false;}
  const e=state.expedition,a=state.actors[intent.actor];e.gems-=p.price;
  (e.learned[intent.actor]??={})[intent.skill]=intent.level;
  const progress=(a.skillProgress??={})[intent.skill]??={level:1,uses:0};progress.level=intent.level;
  engine.notify(`${data.actors[intent.actor].name}が「${skillDefinition(data,intent.skill).name}」Lv${intent.level}を習得しました。`);return true;
}
export function campPlan(data,state,intent){
  const e=state.expedition,c=campById(data,intent.camp),progress=e?.camps[c?.id];
  if(!e||state.waiting||state.battle||state.mode!=='dungeon')return {ok:false,reason:'探索中に操作してください。'};
  if(!c||!canInteractAt(data,state,c))return {ok:false,reason:'設備のあるセルで操作してください。'};
  if(c.requiresQuest&&state.quests[c.requiresQuest]?.stage!=='completed')return {ok:false,reason:'灯番の最初の依頼を終えると、配油設備の復旧を始められます。'};
  if(intent.action==='repair'&&!progress?.supply&&c.condition!==undefined&&!evaluate(c.condition,state))return {ok:false,reason:c.requirement??'給油管の復旧条件を満たしてください。'};
  if(intent.action==='repair')return progress?.supply?{ok:false,reason:'給油設備は修理済みです。'}:(state.inventory.rope??0)<1?{ok:false,reason:'管を固定するロープが1本必要です。'}:{ok:true,c};
  if(!progress?.supply)return {ok:false,reason:'先に給油設備を修理してください。'};
  if(intent.action==='relay')return c.relayEnabled===false?{ok:false,reason:'ここは給油専用です。再出発は4F・7F・10Fの中継所から行えます。'}:progress.relay?{ok:false,reason:'中継設備は起動済みです。'}:{ok:true,c};
  if(intent.action==='draw')return oilRoom(data,state)>0?{ok:true,c}:{ok:false,reason:'隊の携行容量がいっぱいです。'};
  return {ok:false,reason:'未知の設備操作です。'};
}
export function expeditionAction(engine,intent){
  const {data,state}=engine,e=state.expedition;if(!e||state.waiting||state.battle)return false;
  if(intent.action==='refill')return useReserve(engine);
  if(intent.action==='bottle'){
    if(!managesOil(state)||state.mode!=='dungeon'||e.reserve<data.expedition.oil.units||(state.inventory[data.expedition.oil.item]??0)>=data.system.maxStack)return false;
    e.reserve-=data.expedition.oil.units;engine.give(data.expedition.oil.item,1);engine.notify('予備油90単位を、受け渡しに使える灯油1瓶へ詰めました。');return true;
  }
  if(intent.action==='withdraw'){
    if(state.mode!=='town'||dungeonInterior(data,state)||townLocation(data,state)?.id!==data.expedition.shopLocation||!managesOil(state))return false;
    const room=oilRoom(data,state),n=Math.min(room,e.storedOil+e.storedBottles*data.expedition.oil.units);if(!n)return false;
    while(e.storedOil<n&&e.storedBottles>0){e.storedBottles--;e.storedOil+=data.expedition.oil.units;}e.storedOil-=n;e.reserve+=n;engine.notify(`補給所の保管油を${n}単位受け取りました。`);return true;
  }
  const p=campPlan(data,state,intent);if(!p.ok){engine.notify(p.reason);return false;}
  const c=p.c,progress=e.camps[c.id]??={supply:false,relay:false};
  if(intent.action==='repair'){
    engine.give('rope',-1);enableOil(data,state);progress.supply=true;addGems(state,c.gems);balanceOil(data,state);if(c.xp)engine.award(0,c.xp);
    engine.notify(`${c.name}の給油設備を修理しました。油を自由に汲めます。技能宝石${c.gems}個${c.xp?`、生存隊員へ経験値${c.xp}`:''}を受け取りました。余分な灯油は町の補給所で保管します。`);
  }else if(intent.action==='relay'){
    progress.relay=true;e.capacity=Math.max(e.capacity,c.capacity??180);engine.notify(`${c.name}の中継設備を起動しました。次回は町からここへ出発できます。隊の携行容量は${e.capacity}単位です。`);
  }else {const n=oilRoom(data,state);e.reserve+=n;engine.notify(`油を${n}単位汲みました。携行${oilTotal(data,state)}/${e.capacity}。HP・MPは変化しません。`);}
  return true;
}
export function checkpointPlan(engine,id){
  const {data,state}=engine,c=campById(data,id);if(!c||!state.expedition?.camps[id]?.relay)return {ok:false,reason:'まだ起動していない中継設備です。'};
  const reason=dungeonEntryReason(data,state,c.dungeon)||dungeonRestrictionReason(state,'return');
  if(reason)return {ok:false,reason};
  if(!engine.walkable(data.maps[c.map],c.x,c.y))return {ok:false,reason:'中継地点は水没または封鎖中です。入口から確認してください。'};
  return {ok:true,c};
}
export function travelCheckpoint(engine,id){const p=checkpointPlan(engine,id);if(!p.ok){engine.notify(p.reason);return false;}engine.teleport(p.c.map,p.c.x,p.c.y,p.c.facing??'east');return true;}
export function campSafe(data,state){return Boolean(data.expedition?.camps.some(c=>state.expedition?.camps[c.id]?.supply&&state.location?.map===c.map&&Math.abs(state.location.x-c.x)+Math.abs(state.location.y-c.y)<=c.radius));}
export function expeditionView(data,state){
  if(!data.expedition||!state.expedition||state.mode!=='dungeon')return null;
  const e=state.expedition,visible=data.expedition.camps.filter(c=>!c.requiresQuest||state.quests[c.requiresQuest]?.stage==='completed'),camps=visible.filter(c=>canInteractAt(data,state,c));
  if(!camps.length&&!e.managed)return null;
  const cards=camps.map(c=>({name:c.name,text:e.camps[c.id]?.supply?(c.relayEnabled===false?'修理済みの給油専用設備です。':'給油設備は修理済みです。中継設備を起動すると次回の出発点になります。'):'配油管が破損しています。ロープ1本で固定できます。',actions:[['repair','給油設備を修理（ロープ1）'],['relay','中継設備を起動'],['draw','油を容量いっぱい汲む（無料）']].filter(([action])=>action!=='relay'||c.relayEnabled!==false).map(([action,label])=>{const intent={type:'expedition.action',camp:c.id,action},p=campPlan(data,state,intent);return {label,intent,enabled:p.ok,reason:p.reason??'',consumes:action==='repair',explicit:true};})}));
  const lamp=oilLamp(data,state),actions=[],oilText=`携行 ${oilTotal(data,state)}/${e.capacity}単位 ／ 予備油 ${e.reserve} ／ 灯油瓶 ${state.inventory.torch??0}本。補給所の保管 ${e.storedOil+e.storedBottles*90}単位。`;
  cards.push(...expeditionFieldCards(data,state));
  if(e.managed){
    if(!oilFire(data,state))actions.push({label:'予備油を携行灯へ補充',intent:{type:'expedition.action',action:'refill'},enabled:!state.waiting&&!state.battle&&e.reserve>0&&lamp.fuel<lamp.capacity,consumes:true});
    actions.push({label:'予備油90単位を灯油1瓶へ詰める',intent:{type:'expedition.action',action:'bottle'},enabled:!state.waiting&&!state.battle&&e.reserve>=90&&(state.inventory.torch??0)<data.system.maxStack,consumes:true});
    if(camps.length)cards.unshift({name:'隊の携行油',text:oilText,actions});
  }
  return {id:'expedition',kind:'expedition',title:'給油設備と中継所',summary:`技能宝石 ${e.gems}個`,cards,actions:[],portable:e.managed?{name:'予備油を扱う',text:oilText,lit:true,effect:'プレーン油',fuel:e.reserve,capacity:e.capacity,actions}:null,markers:visible.filter(c=>c.map===state.location.map&&(state.discovered[c.map]??[]).includes(`${c.x},${c.y}`)).map(c=>({id:`camp:${c.id}`,name:c.name,x:c.x,y:c.y,kind:'fountain',glyph:e.camps[c.id]?.supply?'営':'修',inInteractionRange:canInteractAt(data,state,c)}))};
}
export function projectExpedition(engine){
  const {data,state}=engine;if(!data.expedition||!state.expedition)return null;
  const e=state.expedition,shop=state.mode==='town'&&!dungeonInterior(data,state)&&townLocation(data,state)?.id===data.expedition.shopLocation;
  return {gems:e.gems,shop,storedOil:e.storedOil+e.storedBottles*90,canWithdraw:shop&&!state.waiting&&!state.battle&&managesOil(state)&&oilRoom(data,state)>0&&(e.storedOil+e.storedBottles)>0,checkpoints:data.expedition.camps.filter(c=>e.camps[c.id]?.relay).map(c=>({id:c.id,dungeon:c.dungeon,name:c.name,...checkpointPlan(engine,c.id)})).map(({c,...row})=>row),products:shop?Object.entries(data.expedition.products).map(([id,p])=>({id,...clone(p),name:skillDefinition(data,id).name,description:skillDefinition(data,id).description,mp:skillDefinition(data,id).mp,weapons:clone(skillDefinition(data,id).weaponTypes),actors:Object.keys(state.actors).map(actor=>{const current=e.learned[actor]?.[id]??0,level=current+1,maxed=current>=(skillDefinition(data,id).maxSkillLevel??1),plan=maxed?{ok:false,reason:'販売中の全段階を習得済みです。'}:skillPurchasePlan(data,state,actor,id,level);return {actor,name:data.actors[actor].name,current,level,maxed,upgrade:!maxed?p.upgrades?.[level]??'':'',price:plan.price??p.price*(level===1?1:level===2?2:4),enabled:plan.ok,reason:plan.reason??'',intent:{type:'skill.buy',actor,skill:id,level}};})})):[]};
}
export function expeditionDefinitionErrors(data){
  if(!data.expedition)return [];
  const d=data.expedition,errors=[],bad=m=>errors.push(`expedition: ${m}`),ids=new Set();
  if(d.version!==1||d.oil?.item!=='torch'||d.oil?.units!==90||!data.locations[d.shopLocation]||!Array.isArray(d.camps)||!isRecord(d.products)||!isRecord(d.enemyGems))return ['expedition: 基本定義不正'];
  for(const c of d.camps){if(!isRecord(c)){bad('設備不正');continue;}if(!/^[a-z][a-z0-9_]*$/.test(c.id)||ids.has(c.id)||!c.name||!['north','east','south','west'].includes(c.facing)||!data.dungeons[c.dungeon]?.maps.includes(c.map)||data.maps[c.map]?.tiles[c.y]?.[c.x]!=='.'||!int(c.x)||!int(c.y)||!int(c.radius,0,2)||!int(c.gems)||![180,270,330,390,450].includes(c.capacity??180)||c.requiresQuest&&!data.quests[c.requiresQuest])bad(`設備不正 ${c.id}`);if(c.xp!==undefined&&!int(c.xp)||c.shopTier!==undefined&&!int(c.shopTier,1,2)||c.relayEnabled!==undefined&&typeof c.relayEnabled!=='boolean')bad(`設備の進行設定不正 ${c.id}`);ids.add(c.id);}
  for(const [id,p] of Object.entries(d.products))if(!isRecord(p)||!skillDefinition(data,id)||!Array.isArray(skillDefinition(data,id).weaponTypes)||!int(p.price,1)||!int(p.tier,1,2)||!Array.isArray(p.jobs)||!p.jobs.length||new Set(p.jobs).size!==p.jobs.length||p.jobs.some(j=>!data.jobs[j]||!skillDefinition(data,id).weaponTypes.some(w=>data.jobs[j].equipment.weapon.includes(w)))||p.requiresCamp!==undefined&&!ids.has(p.requiresCamp)||p.requiresRelay!==undefined&&(typeof p.requiresRelay!=='boolean'||!ids.has(p.requiresCamp))||skillDefinition(data,id).levelUp)bad(`商品不正 ${id}`);
  for(const [id,n] of Object.entries(d.enemyGems))if(!data.enemies[id]||!int(n)||n>0&&data.enemies[id].rewards.xp===0)bad(`宝石ドロップ不正 ${id}`);
  return errors;
}
export function expeditionSaveErrors(data,state){
  if(!data.expedition)return state.expedition===undefined?[]:['旧版に未知の遠征状態があります'];
  const e=state.expedition,fail=()=>['遠征・技能購入の保存状態不正'];
  if(!isRecord(e)||e.version!==1||typeof e.managed!=='boolean'||![180,270,330,390,450].includes(e.capacity)||!['gems','reserve','storedOil','storedBottles'].every(k=>int(e[k]))||!isRecord(e.camps)||!isRecord(e.learned)||!isRecord(e.lamp)||!int(e.lamp.fuel,0,90)||e.lamp.effect!==null&&!Object.values(data.dungeons).some(d=>Object.values(d.systems).some(s=>s.use==='fire_network'&&own(s.effects,e.lamp.effect))))return fail();
  for(const [id,c] of Object.entries(e.camps))if(!campById(data,id)||!isRecord(c)||typeof c.supply!=='boolean'||typeof c.relay!=='boolean'||c.relay&&!c.supply)return fail();
  if(e.managed!==Object.values(e.camps).some(c=>c.supply)||!e.managed&&(e.reserve||e.storedOil||e.storedBottles)||e.managed&&oilTotal(data,state)>e.capacity)return fail();
  const capacity=Math.max(180,...data.expedition.camps.filter(c=>e.camps[c.id]?.relay).map(c=>c.capacity??180));if(e.capacity!==capacity)return fail();
  for(const [actor,skills] of Object.entries(e.learned)){
    if(!own(state.actors,actor)||!isRecord(skills))return fail();
    for(const [id,n] of Object.entries(skills))if(!own(data.expedition.products,id)||!int(n,1,3)||n>1&&!skillDefinition(data,id).levels?.[n]||state.actors[actor].skillProgress?.[id]?.level!==n||campTier(state)<data.expedition.products[id].tier||data.expedition.products[id].requiresCamp&&!e.camps[data.expedition.products[id].requiresCamp]?.supply||data.expedition.products[id].requiresRelay&&!e.camps[data.expedition.products[id].requiresCamp]?.relay)return fail();
  }
  if(!expeditionFieldSaveValid(data,state))return fail();
  return [];
}
