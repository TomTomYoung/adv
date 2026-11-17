import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {routes,oldRoutes,jointLift,investigation,ready,choose,depart,arrive,migrated,resume,checkpoint,fight} from '../tests/q006-helpers.mjs';

export function wageBoxFixtures(){
  const fixtures=[],outcomes=new Set(),seen=new Set();
  const groups={garo:['entry','box','private','summon'],both:['workers','water_joint','lifted_joint','sealed','accounts'],all:['gather','office','office_read','compare','ledger']};
  const size={garo:[1173,1341],workers:[1174,1340],accused:[1173,1341]};
  const images={scene:Object.fromEntries(Object.keys(size).map(id=>[id,{src:`assets/images/characters/sprites/${id}.webp`,size:size[id],cornerAlphas:id==='workers'?[0,0,245,250]:[0,0,0,0]}])),classic:Object.fromEntries(Object.keys(size).map(id=>[id,{src:`assets/images/characters/generated/${id}.webp`,size:[896,id==='workers'?1022:1024],cornerAlphas:[255,255,255,255]}]))};
  const capture=(g,variant)=>{
    if(g.state.quests.q006.stage==='completed')return;
    const scene=g.state.stories.q006.scene,key=variant+'/'+scene;if(seen.has(key))return;seen.add(key);checkpoint(g);
    const cast=groups.garo.includes(scene)?['garo']:groups.both.includes(scene)?['workers','accused']:groups.all.includes(scene)?['garo','workers','accused']:[];
    const dialog=projectGame(g).dialog;assert.deepEqual(dialog.scene.cast.map(c=>c.id),cast);
    const choice=dialog.options.find(o=>o.enabled);assert.ok(choice);
    fixtures.push({edition:'e2',quest:'q006',scene,variant,cast,save:g.save(),expectedText:dialog.text,availableChoice:choice.id,blockedChoices:dialog.options.filter(o=>!o.enabled).map(o=>o.id),imageExpectationsByLayout:images});
  };
  for(const r of routes){const g=ready();capture(g,'current');for(const id of r.path){choose(g,id);capture(g,'current');}assert.equal(g.state.quests.q006.outcome,r.outcome);outcomes.add('e2/q006/'+r.outcome);}
  for(const r of oldRoutes){const g=migrated(ready({old:true}));capture(g,'preserved');for(const id of r.path){choose(g,id);capture(g,'preserved');}}
  for(const r of routes){const g=ready();for(const id of r.path){depart(g,id);if(g.state.battle)fight(g);if(g.state.journey){g.defeat();checkpoint(g);arrive(g);capture(g,'rescued');}}}
  for(const path of [['lift','lift'],[...jointLift,'open'],[...jointLift,'open','ledger','ask','office','read'],[...jointLift,...investigation]]){const g=ready();choose(g,...path);g.defeat();resume(g);capture(g,'work-saved');}
  const g=ready();choose(g,'lift');g.state.inventory.rope=0;capture(g,'shortage');
  return {fixtures,outcomes:[...outcomes]};
}
