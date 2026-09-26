// Event/trap effects belong to the dungeon and their source, not to a UI button
// or a quest-specific check. They last until that source explicitly clears them.
export const DUNGEON_RESTRICTIONS=['return_mark','return'];
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const sourceValid=v=>typeof v==='string'&&/^[a-z][a-z0-9_.:-]{0,127}$/.test(v);
export function restrictionValid(data,r,withReason=true){
  return object(r)&&Object.hasOwn(data.dungeons??{},r.dungeon)&&DUNGEON_RESTRICTIONS.includes(r.action)&&sourceValid(r.source)&&(!withReason||typeof r.reason==='string'&&r.reason.trim().length>0&&r.reason.length<=500);
}
const same=(a,b)=>a.dungeon===b.dungeon&&a.action===b.action&&a.source===b.source;
export function dungeonRestrictions(state){
  const dungeon=state.dungeons?.active?.id;
  return (state.dungeonRestrictions??[]).filter(r=>r.dungeon===dungeon);
}
export function dungeonRestrictionReason(state,action){
  return [...new Set(dungeonRestrictions(state).filter(r=>r.action===action||action==='return_mark'&&r.action==='return').map(r=>r.reason))].join(' ／ ');
}
export function setDungeonRestriction(engine,command){
  if(!restrictionValid(engine.data,command))throw Error('迷宮の封印・禁止設定が不正です');
  const {dungeon,action,source,reason}=command,entry={dungeon,action,source,reason},list=engine.state.dungeonRestrictions;
  const index=list.findIndex(r=>same(r,entry));
  if(index<0)list.push(entry);else list[index]=entry;
}
export function clearDungeonRestriction(engine,command){
  if(!restrictionValid(engine.data,command,false))throw Error('迷宮の封印・禁止解除が不正です');
  engine.state.dungeonRestrictions=engine.state.dungeonRestrictions.filter(r=>!same(r,command));
}
export function validateDungeonRestrictions(data,state){
  const list=state.dungeonRestrictions;
  if(!Array.isArray(list)||list.some(r=>!restrictionValid(data,r)||Object.keys(r).sort().join(',')!=='action,dungeon,reason,source'))return ['迷宮の封印・禁止状態が不正です'];
  const keys=list.map(r=>JSON.stringify([r.dungeon,r.action,r.source]));
  return new Set(keys).size===keys.length?[]:['迷宮の封印・禁止状態が重複しています'];
}
