import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {activeActor,battleSkillPlan} from '../src/core/battle.js';
const root=path.resolve(import.meta.dirname,'..');
export function chooseBattleAction(g){
  const s=g.state,b=s.battle,id=activeActor(g),actor=s.actors[id],known=g.skills(id);
  const allies=s.members.filter(id=>s.actors[id].hp>0),injured=[...allies].sort((a,c)=>s.actors[a].hp/g.stats(a).hp-s.actors[c].hp/g.stats(c).hp)[0];
  const can=(skill,target=injured)=>known.includes(skill)&&battleSkillPlan(g,id,skill,target).ok;
  const intent=(skill,target)=>({type:'battle',action:'skill',skill,target});
  if(can('group_heal')&&allies.filter(id=>s.actors[id].hp<g.stats(id).hp*.7).length>=2)return intent('group_heal');
  if(can('heal')&&s.actors[injured].hp<g.stats(injured).hp*.6)return intent('heal',injured);
  if(can('party_guard')&&b.enemies.filter(e=>e.hp>0).length>1&&!b.guards.length)return intent('party_guard');
  const empty=allies.find(other=>other!==id&&s.actors[other].mp<4&&g.skills(other).some(skill=>['fire','ice','lightning','group_heal'].includes(skill)));
  if(can('inspire')&&empty)return intent('inspire',empty);
  let best={score:-1,intent:intent('attack',b.enemies.find(e=>e.hp>0).instance)};
  for(const skillId of known){const skill=g.data.skills[skillId];if(actor.mp<skill.mp||!['enemy','all_enemies'].includes(skill.target)||!skill.effects.some(e=>e.type==='damage'))continue;
    for(const target of b.enemies.filter(e=>e.hp>0)){
      if(!battleSkillPlan(g,id,skillId,target.instance).ok)continue;
      let score=0;for(const victim of skill.target==='all_enemies'?b.enemies.filter(e=>e.hp>0):[target])for(const effect of skill.effects.filter(e=>e.type==='damage')){
        const amount=g.value(g.data.formulas[effect.formula],{source:{...actor,stats:g.stats(id)},target:{...victim,stats:victim.stats}});
        score+=Math.min(victim.hp,Math.max(1,Math.floor(amount*(victim.resist?.[effect.element]??1)*(victim.guard?.5:1))));
      }
      score-=skill.mp*.05;if(score>best.score)best={score,intent:intent(skillId,target.instance)};
    }
  }
  return best.intent;
}
export function simulateBalance(data,{seeds=20}={}){
  const teams={standard:['ada','nio','sera','il'],newcomers:['luka','toma','mica','dora','ren']},results=[];
  const ids=Object.keys(data.encounters).filter(id=>id.startsWith('wild_'));
  for(const [team,members] of Object.entries(teams))for(const id of ids){
    const region=data.enemies[data.encounters[id].enemies[0]].region,runs=[];
    for(let seed=1;seed<=seeds;seed++){
      const g=new GameEngine(data,seed);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});
      g.state.members=[...members];g.award(0,data.system.xpBase*(region-1)*region);g.healAll();g.dispatch({type:'travel',region});g.startBattle(id,{win:[],lose:[],escape:[]});
      let rounds=1,actions=0,peakLoss=0;const total=g.state.members.reduce((n,id)=>n+g.stats(id).hp,0);
      while(g.state.battle&&actions<500){rounds=g.state.battle.round;if(!g.dispatch(chooseBattleAction(g)))throw Error(`Invalid policy action ${id}`);actions++;const missing=g.state.members.reduce((n,id)=>n+g.stats(id).hp-g.state.actors[id].hp,0);peakLoss=Math.max(peakLoss,missing/total);}
      runs.push({win:!g.state.battle&&g.state.mode==='dungeon',rounds,peakLoss});
    }
    const ordered=runs.map(r=>r.rounds).sort((a,c)=>a-c),median=ordered[Math.floor(ordered.length/2)];
    results.push({team,encounter:id,region,battles:seeds,wins:runs.filter(r=>r.win).length,medianRounds:median,maxRounds:Math.max(...ordered),maxHpLossPercent:Math.round(Math.max(...runs.map(r=>r.peakLoss))*100)});
  }
  const passed=results.every(r=>r.wins===r.battles&&r.medianRounds<=6&&r.maxRounds<=10);
  return {version:data.game.version,seeds,policy:'Fixed skill/target selection; full HP/MP, no bonus gear, no items, no debug healing during combat.',passed,battles:results.reduce((n,r)=>n+r.battles,0),results};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const data=await loadContent(file=>fs.readFile(path.join(root,file),'utf8').then(JSON.parse));
  const report=simulateBalance(data);await fs.writeFile(path.join(root,'doc/BALANCE_RESULTS.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({passed:report.passed,battles:report.battles,maxRounds:Math.max(...report.results.map(r=>r.maxRounds)),maxHpLoss:Math.max(...report.results.map(r=>r.maxHpLossPercent)),failed:report.results.filter(r=>r.wins!==r.battles||r.medianRounds>6||r.maxRounds>10)},null,2));if(!report.passed)process.exitCode=1;
}
