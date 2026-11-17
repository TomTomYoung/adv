import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {routes,ready,choose,depart,arrive,migrated,resume,checkpoint} from '../tests/q005-helpers.mjs';

export function drainageFixtures(){
  const fixtures=[],outcomes=new Set(),seen=new Set();
  const capture=(g,variant)=>{
    if(g.state.quests.q005.stage==='completed')return;
    const scene=g.state.stories.q005.scene,key=variant+'/'+scene;if(seen.has(key))return;seen.add(key);
    checkpoint(g);const dialog=projectGame(g).dialog,cast=scene==='furnace'||scene==='burned'?[]:['toto'];
    assert.deepEqual(dialog.scene.cast.map(c=>c.id),cast);
    const choice=dialog.options.find(o=>o.enabled);assert.ok(choice);
    fixtures.push({edition:'e2',quest:'q005',scene,variant,cast,save:g.save(),expectedText:dialog.text,availableChoice:choice.id,blockedChoices:dialog.options.filter(o=>!o.enabled).map(o=>o.id),imageExpectations:{toto:{src:'assets/images/characters/sprites/toto.webp',size:[1173,1341],cornerAlphas:[0,0,248,0]}}});
  };
  for(const r of routes){const g=ready();capture(g,'current');for(const id of r.path){choose(g,id);capture(g,'current');}assert.equal(g.state.quests.q005.outcome,r.outcome);outcomes.add('e2/q005/'+r.outcome);}
  for(const path of [[],['cold'],['warm'],['cold','move'],['net']])capture(migrated((()=>{const g=ready({old:true});choose(g,...path);return g;})()),'preserved');
  for(const [path,id] of [[['cold'],'move'],[[],'burn'],[['burn','burn'],'return']]){const g=ready();choose(g,...path);depart(g,id);g.defeat();checkpoint(g);arrive(g);capture(g,'rescued');}
  for(const scene of ['entry','furnace']){const g=ready();if(scene==='furnace')choose(g,'burn');g.state.inventory.torch=0;capture(g,'shortage');}
  const burned=ready();choose(burned,'burn','burn');burned.defeat();resume(burned);capture(burned,'burned-saved');
  return {fixtures,outcomes:[...outcomes]};
}
