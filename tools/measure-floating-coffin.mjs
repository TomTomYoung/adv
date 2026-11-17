import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {createQuestTrial,dispatchQuestTrial,questTrialReport} from '../src/application/quest-playtest.js';
import {data,routes,drain,fight} from '../tests/q008-helpers.mjs';
import {activeActor} from '../src/core/battle.js';
import {pathTo,maintainParty} from '../tests/helpers.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../playtests/quest-parties.json',import.meta.url)));
// Use the roles advertised by the trial presets, including the runesmith's
// ice rune and lancer's pierce. All actions use the public battle dispatcher.
function partyFight(g){
  let fuel=800;
  while(g.state.battle){
    assert.ok(--fuel,'battle must terminate');
    if(g.state.waiting?.type==='text'){drain(g);continue;}
    const id=activeActor(g),actor=g.state.actors[id],skills=g.skills(id),enemies=g.state.battle.enemies.filter(e=>e.hp>0);
    const injured=g.state.members.filter(id=>g.state.actors[id].hp>0).sort((a,b)=>g.state.actors[a].hp/g.stats(a).hp-g.state.actors[b].hp/g.stats(b).hp)[0];
    let skill='attack',target=enemies[0].instance;
    if(skills.includes('heal')&&actor.mp>=4&&g.state.actors[injured].hp<g.stats(injured).hp*.7){skill='heal';target=injured;}
    else{
      const magic=['fire','ice','lightning'].filter(k=>skills.includes(k)&&actor.mp>=g.data.skills[k].mp);
      if(magic.length){
        const options=magic.flatMap(k=>enemies.map(e=>({skill:k,target:e.instance,multiplier:e.resist?.[k]??1}))).sort((a,b)=>b.multiplier-a.multiplier);
        ({skill,target}=options[0]);
      }else skill=['pierce','power','venom'].find(k=>skills.includes(k)&&actor.mp>=g.data.skills[k].mp)??'attack';
    }
    assert.ok(g.dispatch({type:'battle',action:'skill',skill,target}),`${id}/${skill}: ${g.state.notice}`);
  }
  drain(g);
}
function walkTrial(g,x,y,battle){
  for(const [nx,ny] of pathTo(g,x,y)){
    maintainParty(g);const loc=g.state.location,dx=nx-loc.x,dy=ny-loc.y,wanted=dx===1?'east':dx===-1?'west':dy===1?'south':'north';
    while(loc.facing!==wanted)assert.ok(g.dispatch({type:'move',direction:'right'}));
    assert.ok(g.dispatch({type:'move',direction:'forward'}));drain(g);if(g.state.battle)battle(g);
    if(g.state.mode!=='dungeon')return;
  }
}
export function measureFloatingCoffin({levels=[4,5,6],exploratory=false,strategy='party-skills'}={}){
  const trialCatalog=exploratory?structuredClone(catalog):catalog;
  if(exploratory)trialCatalog.quests.e2.q008.level.max=Math.max(...levels);
  const results=[],battle=strategy==='baseline'?fight:partyFight;
  for(const level of levels)for(const party of ['balanced','sustain','explore'])for(const route of routes){
    const t=createQuestTrial(data,trialCatalog,{quest:'q008',party,level,start:'site',seed:1907,outcome:route.outcome}),g=t.engine;drain(g);
    let stoppedAt=null;
    for(const id of route.path){
      assert.ok(dispatchQuestTrial(t,{type:'choose',id}),party+'/'+id+': '+g.state.notice);
      drain(g);if(g.state.battle)battle(g);
      if(questTrialReport(t).status!=='defeated'&&g.state.journey){
        const a=g.data.quests.q008.story.actions[g.state.journey.action],p=g.data.quests.q008.story.worldPlaces[a.journey.to];
        walkTrial(g,p.x,p.y,battle);
        if(questTrialReport(t).status!=='defeated'&&g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:'q008'}));
        drain(g);
      }
      const saved=g.save();g.load(saved);assert.equal(g.save(),saved);
      if(questTrialReport(t).status==='defeated'){
        stoppedAt={choice:id,scene:g.state.stories.q008.scene,journey:g.state.journey?.action??null};break;
      }
    }
    const r=questTrialReport(t);if(r.status!=='defeated'){assert.equal(r.status,'cleared');assert.equal(r.outcome,route.outcome);}results.push({party,level,strategy,path:route.path,expectedOutcome:route.outcome,status:r.status,outcome:r.outcome,steps:r.steps,records:r.records,rescues:r.rescues,items:r.items,stoppedAt});
  }
  return results;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)console.log(JSON.stringify(measureFloatingCoffin(),null,2));
