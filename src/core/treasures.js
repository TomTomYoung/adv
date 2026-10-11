import {evaluate,getPath,setPath,pathParts} from './expression.js';
import {signalFieldChange} from './field-signals.js';
export const TREASURE_KINDS=['chest','remains','bookshelf','pot','harvest'];
export const treasureKey=(map,id)=>`treasure/${map}/${id}`;
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export function treasureErrors(data,spec){
  const reward=r=>record(r)&&Object.keys(r).every(k=>['gold','items'].includes(k))&&(r.gold===undefined||Number.isSafeInteger(r.gold)&&r.gold>=0&&r.gold<=1e9)&&(r.items===undefined||record(r.items)&&Object.entries(r.items).every(([id,n])=>data.items?.[id]&&Number.isInteger(n)&&n>0&&n<=data.system.maxStack));
  if(!record(spec)||!TREASURE_KINDS.includes(spec.kind)||Object.keys(spec).some(k=>!['kind','rewards','random','uses','reset','condition','requiredItem','afterText','trap','collectedFlag','message'].includes(k))||!Number.isSafeInteger(spec.uses)||spec.uses<1||spec.uses>1e6||!['never','reentry','manual'].includes(spec.reset)||!reward(spec.rewards)||spec.random!==undefined&&(!Array.isArray(spec.random)||!spec.random.length||spec.random.some(r=>!record(r)||Object.keys(r).some(k=>!['weight','rewards'].includes(k))||!Number.isFinite(r.weight)||r.weight<=0||!reward(r.rewards))||!Number.isFinite(spec.random.reduce((sum,r)=>sum+r.weight,0)))||spec.requiredItem!==undefined&&!data.items?.[spec.requiredItem]||typeof spec.afterText!=='string')return ['トレジャーの設定が不正です'];
  if(spec.collectedFlag!==undefined){try{pathParts('flags.'+spec.collectedFlag);if(typeof spec.collectedFlag!=='string'||spec.reset!=='never'||spec.uses!==1)return ['取得済みフラグは永久・1回の取得に指定します'];}catch{return ['取得済みフラグが不正です'];}}
  return [];
}
const addRewards=(a,b)=>{const items={...a.items};for(const [id,n] of Object.entries(b?.items??{}))items[id]=(items[id]??0)+n;return {gold:(a.gold??0)+(b?.gold??0),items};};
export function treasurePlan(data,state,map,object){
  const t=object?.treasure;if(!t)return {ok:true};
  const count=state.events[treasureKey(map,object.id)]??0;
  if(count>=t.uses||t.collectedFlag&&getPath(state,'flags.'+t.collectedFlag))return {ok:false,exhausted:true,reason:t.afterText,remaining:0};
  if(t.condition!==undefined&&!evaluate(t.condition,state))return {ok:false,reason:'今は取得条件を満たしていません。',remaining:t.uses-count};
  if(t.requiredItem&&!(state.inventory[t.requiredItem]>0))return {ok:false,reason:`${data.items[t.requiredItem].name}が必要です。`,remaining:t.uses-count};
  // Reserve room for every possible outcome before drawing, so retries cannot reroll.
  for(const reward of (t.random??[{rewards:{}}]).map(r=>addRewards(t.rewards,r.rewards))){
    if(state.gold+reward.gold>1e9)return {ok:false,reason:'所持金が上限に達します。',remaining:t.uses-count};
    for(const [id,n] of Object.entries(reward.items))if((state.inventory[id]??0)+n>data.system.maxStack)return {ok:false,reason:`${data.items[id].name}の袋が満杯です。`,remaining:t.uses-count};
  }
  return {ok:true,remaining:t.uses-count};
}
export function collectTreasure(engine,map,id){
  const {data,state}=engine,object=data.maps[map]?.objects.find(o=>o.id===id),plan=treasurePlan(data,state,map,object);
  if(!object?.treasure)throw Error('トレジャーがありません');
  if(!plan.ok){engine.notify(plan.reason);return false;}
  const t=object.treasure;let extra={};
  if(t.random){let roll=engine.random()*t.random.reduce((sum,r)=>sum+r.weight,0);extra=t.random.at(-1).rewards;for(const row of t.random){roll-=row.weight;if(roll<0){extra=row.rewards;break;}}}
  const rewards=addRewards(t.rewards,extra);
  for(const [item,n] of Object.entries(rewards.items))engine.give(item,n);
  state.gold+=rewards.gold;state.events[treasureKey(map,id)]=(state.events[treasureKey(map,id)]??0)+1;
  if(t.collectedFlag)setPath(state,'flags.'+t.collectedFlag,true);
  const receipt=[...(rewards.gold?[`${rewards.gold}G`]:[]),...Object.entries(rewards.items).map(([item,n])=>`${data.items[item].name}×${n}`)];
  engine.notify(t.message??`${object.name}：${receipt.length?receipt.join('、')+'を手に入れた。':'何も見つからなかった。'}`);
  signalFieldChange(data,state,'state');return true;
}
export function resetTreasures(data,state,maps){
  for(const map of maps)for(const o of data.maps[map].objects)if(o.treasure?.reset==='reentry')delete state.events[treasureKey(map,o.id)];
}
export function treasureSaveErrors(data,state){
  const errors=[];for(const [key,n] of Object.entries(state.events))if(key.startsWith('treasure/')){
    const [,map,id,...rest]=key.split('/'),t=data.maps[map]?.objects.find(o=>o.id===id)?.treasure;
    if(rest.length||!t||!Number.isSafeInteger(n)||n<0||n>t.uses)errors.push('トレジャーの取得回数が不正です');
  }return errors;
}
