import {syncSkillGrowth} from './skill-levels.js';
import {removeStatus} from './status-effects.js';
import {actorStats,knownSkills,grantsFor} from './jobs.js';
export const xpThreshold=(data,level)=>data.system.xpBase*level*(level+1);
export const experienceRecipients=state=>state.members.filter(id=>state.actors[id].hp>0);
// The last entry repeats through the level cap. A stronger party earns less from shallow floors.
export function formationExperience(data, encounter, actorLevel, victories) {
  const {level, dungeon, rewardFactor} = encounter.progression;
  const {winsPerLevel} = data.encounterGroups.dungeons[dungeon].progression;
  const target = winsPerLevel[Math.min(actorLevel, winsPerLevel.length) - 1];
  const rewardLevel = Math.min(level, actorLevel + 1);
  const budget = xpThreshold(data, rewardLevel) - xpThreshold(data, rewardLevel - 1);
  const average = budget * rewardFactor / target;
  // Successive victories against this formation distribute the fractional XP without a new save counter.
  return Math.round(victories * average) - Math.round((victories - 1) * average);
}

export function awardExperience(engine,xp,recipients=experienceRecipients(engine.state)){
  const {data,state}=engine,levels=[];
  for(const id of [...new Set(recipients)]){
    const actor=state.actors[id];if(!actor)continue;
    actor.xp=Math.min(1e9,actor.xp+(typeof xp==='number'?xp:xp[id]));
    while(actor.level<data.system.maxLevel&&actor.xp>=xpThreshold(data,actor.level)){
      const before=actorStats(data,state,id,false);
      const learned=new Set([...knownSkills(data,state,id),...grantsFor(data,state,id).filter(g=>g.level<=actor.level).map(g=>g.skill)]);
      actor.level++;
      if(data.jobs)actor.growthHistory[actor.job]=(actor.growthHistory[actor.job]??0)+1;
      const after=actorStats(data,state,id,false);
      // Preserve the existing level-up recovery, only for this character.
      actor.hp=after.hp;actor.mp=after.mp;removeStatus(actor);
      const skills=[...new Set([...knownSkills(data,state,id),...grantsFor(data,state,id).filter(g=>g.level<=actor.level).map(g=>g.skill)])].filter(skill=>!learned.has(skill));
      levels.push({actor:id,level:actor.level,growth:Object.fromEntries(Object.keys(before).map(key=>[key,after[key]-before[key]])),skills});
    }
  }
  syncSkillGrowth(engine);
  return levels;
}
