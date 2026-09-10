import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {chooseBattleAction} from './simulate-balance.mjs';
const root=path.resolve(import.meta.dirname,'..');
export function simulateJobs(data){
  const results=[];
  for(const job of Object.values(data.jobs))for(const level of [1,5,10,30]){
    const region=Math.min(level,10),encounter=`wild_pair_${region}`,runs=[];
    for(const seed of [17,101,901]){
      const g=new GameEngine(data,seed);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});
      if(job.id!=='warrior')g.dispatch({type:'job.change',actor:'ada',job:job.id});
      g.award(0,data.system.xpBase*(level-1)*level);
      const media=job.grants.map(grant=>data.skills[grant.skill]).filter(Boolean),required=media.find(s=>s.equippedItem)?.equippedItem;
      const item=required??Object.keys(data.items).find(id=>data.items[id].slot==='weapon'&&job.equipment.weapon.includes(data.items[id].equipmentType));
      if(item){g.give(item,1);g.dispatch({type:'equip',actor:'ada',item});}
      for(const skill of media)for(const id of Object.keys(skill.materials??{}))g.give(id,10);
      g.healAll();g.dispatch({type:'travel',region});g.startBattle(encounter,{win:[],lose:[],escape:[]});
      let actions=0,rounds=1,loss=0;const total=g.state.members.reduce((sum,id)=>sum+g.stats(id).hp,0);
      while(g.state.battle&&actions<200){rounds=g.state.battle.round;const ok=g.dispatch(chooseBattleAction(g));if(!ok)throw new Error(`Illegal simulation action: ${job.id}/${level}`);actions++;loss=Math.max(loss,g.state.members.reduce((sum,id)=>sum+g.stats(id).hp-g.state.actors[id].hp,0)/total);}
      runs.push({seed,win:!g.state.battle&&g.state.mode==='dungeon',actions,rounds,maxHpLossPercent:Math.round(loss*100)});
    }
    results.push({job:job.id,name:job.name,level,encounter,wins:runs.filter(r=>r.win).length,runs});
  }
  return {version:data.game.version,policy:'Replace Ada only in the standard four-person party. Current-job growth from Lv1; one legal weapon and ten skill materials supplied; no mid-battle debug recovery. Fixed reference policy, not optimal job play.',battles:results.reduce((sum,r)=>sum+r.runs.length,0),passed:results.every(r=>r.wins===r.runs.length),results};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const data=await loadContent(file=>fs.readFile(path.join(root,file),'utf8').then(JSON.parse)),report=simulateJobs(data);
  await fs.writeFile(path.join(root,'doc/JOB_BALANCE_RESULTS.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,battles:report.battles,failed:report.results.filter(r=>r.wins!==r.runs.length)},null,2));if(!report.passed)process.exitCode=1;
}
