// Objective history. Script commands can read it, but cannot write it.
export const freshRecords=(historyComplete=true)=>({historyComplete,battles:0,wins:0,escapes:0,losses:0,kills:{},encounters:{},baselines:{}});
export function snapshotRecords(records){return {battles:records.battles,wins:records.wins,escapes:records.escapes,losses:records.losses,kills:{...records.kills},encounters:{...records.encounters}};}
export function recordCount(records,{metric,id,sinceQuest}){
  if(!records)return undefined;
  const base=sinceQuest?records.baselines[sinceQuest]:null;
  if(sinceQuest&&!base)return undefined;
  const count=r=>['kills','encounters'].includes(metric)?(r?.[metric]?.[id]??0):(r?.[metric]??0);
  return count(records)-count(base);
}
export function recordDefeated(engine){
  const b=engine.state.battle,r=engine.state.records;
  b.recordedKills??=[];
  for(const enemy of b.enemies)if(enemy.hp===0&&!b.recordedKills.includes(enemy.instance)){
    b.recordedKills.push(enemy.instance);r.kills[enemy.id]=(r.kills[enemy.id]??0)+1;
  }
}
export function recordResult(engine,result){
  recordDefeated(engine);
  const r=engine.state.records;
  r[{win:'wins',escape:'escapes',lose:'losses'}[result]]++;
  if(result==='win'){const id=engine.state.battle.encounter;r.encounters[id]=(r.encounters[id]??0)+1;}
}
export function recordsValid(r,data){
  const n=v=>Number.isInteger(v)&&v>=0&&v<=1e9;
  const dict=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.entries(v).every(([k,x])=>Object.hasOwn(keys,k)&&n(x));
  const counts=v=>v&&['battles','wins','escapes','losses'].every(k=>n(v[k]))&&dict(v.kills,data.enemies)&&dict(v.encounters,data.encounters)&&v.wins+v.escapes+v.losses<=v.battles;
  return typeof r?.historyComplete==='boolean'&&counts(r)&&r.baselines&&typeof r.baselines==='object'&&!Array.isArray(r.baselines)&&Object.entries(r.baselines).every(([id,b])=>Object.hasOwn(data.quests,id)&&counts(b)&&['battles','wins','escapes','losses'].every(k=>b[k]<=r[k])&&['kills','encounters'].every(k=>Object.entries(b[k]).every(([id,n])=>n<=(r[k][id]??0))));
}
