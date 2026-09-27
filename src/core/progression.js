import {actorStats,knownSkills,grantsFor} from './jobs.js';
export const xpThreshold=(data,level)=>data.system.xpBase*level*(level+1);
export const experienceRecipients=state=>state.members.filter(id=>state.actors[id].hp>0);
export function awardExperience(engine,xp,recipients=experienceRecipients(engine.state)){
  const {data,state}=engine,levels=[];
  for(const id of [...new Set(recipients)]){
    const actor=state.actors[id];if(!actor)continue;
    actor.xp=Math.min(1e9,actor.xp+xp);
    while(actor.level<data.system.maxLevel&&actor.xp>=xpThreshold(data,actor.level)){
      const before=actorStats(data,state,id,false);
      const learned=new Set([...knownSkills(data,state,id),...grantsFor(data,state,id).filter(g=>g.level<=actor.level).map(g=>g.skill)]);
      actor.level++;
      if(data.jobs)actor.growthHistory[actor.job]=(actor.growthHistory[actor.job]??0)+1;
      const after=actorStats(data,state,id,false);
      // Preserve the existing level-up recovery, only for this character.
      actor.hp=after.hp;actor.mp=after.mp;actor.statuses=[];
      const skills=[...new Set([...knownSkills(data,state,id),...grantsFor(data,state,id).filter(g=>g.level<=actor.level).map(g=>g.skill)])].filter(skill=>!learned.has(skill));
      levels.push({actor:id,level:actor.level,growth:Object.fromEntries(Object.keys(before).map(key=>[key,after[key]-before[key]])),skills});
    }
  }
  return levels;
}
