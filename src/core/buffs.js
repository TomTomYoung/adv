// Battle-only modifiers keep their provenance; definitions are never mutated.
export const unitKey=unit=>unit.instance?`enemy:${unit.instance}`:`actor:${unit.id}`;
export function buffStats(data,battle,target,base){
  const stats={...base};
  for(const key of ['str','vit','agi','int']){
    let up=1,down=1;
    for(const entry of battle?.buffs??[]){
      if(entry.target!==target||entry.remaining<=0)continue;
      const factor=data.buffs[entry.id].stats[key]??1;
      up=Math.max(up,factor);down=Math.min(down,factor);
    }
    stats[key]=Math.max(0,Math.floor(stats[key]*up*down));
  }
  return stats;
}
export function buffResistance(data,battle,target,element){
  let result=1;
  for(const entry of battle?.buffs??[])if(entry.target===target&&entry.remaining>0)result=Math.min(result,data.buffs[entry.id].resist[element]??1);
  return result;
}
export function addBuff(engine,id,target,source,skill){
  const b=engine.state.battle,def=engine.data.buffs[id];
  if(!def||!b)throw new Error(`未登録の戦闘補正: ${id}`);
  const record={id,target:unitKey(target),sourceActor:source.id,sourceJob:source.job,sourceSkill:skill,remaining:def.turns};
  const at=b.buffs.findIndex(x=>x.id===id&&x.target===record.target);
  if(at<0)b.buffs.push(record);else b.buffs[at]=record;
}
export const actionBuffs=(data,battle,target)=>(battle?.buffs??[]).filter(b=>b.target===target&&data.buffs[b.id].consume==='next_action');
export const actionPower=(data,battle,target)=>Math.max(1,...actionBuffs(data,battle,target).map(b=>data.buffs[b.id].physicalPower??1));
export function takePhysicalHit(data,battle,target,damage,active=battle){
  if(damage<=0)return damage;
  const buffs=(active?.buffs??[]).filter(b=>b.target===target&&data.buffs[b.id].consume==='physical_hit'),rate=Math.min(1,...buffs.map(b=>data.buffs[b.id].physicalTaken??1));
  if(battle)battle.buffs=battle.buffs.filter(b=>!buffs.includes(b));
  return Math.max(1,Math.floor(damage*rate));
}
export function tickBuffs(battle,data){
  battle.buffs=battle.buffs.map(b=>({...b,remaining:b.remaining-(data?.buffs[b.id].consume==='next_action'?0:1)})).filter(b=>b.remaining>0);
  battle.covers=battle.covers.map(b=>({...b,remaining:b.remaining-1})).filter(b=>b.remaining>0);
}
export function buffView(data,battle,target){
  return (battle?.buffs??[]).filter(b=>b.target===target).map(b=>({id:b.id,name:data.buffs[b.id].name,remaining:b.remaining,...(data.buffs[b.id].consume==='next_action'?{untilNextAction:true}:{}),sourceActor:b.sourceActor,sourceJob:b.sourceJob}));
}
