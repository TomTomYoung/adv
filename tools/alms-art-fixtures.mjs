import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,checkpoint} from '../tests/pilgrimage-helpers.mjs';

export const previousQ035=await read('tests/fixtures/e2-q035-before-cast.json');
export const previousQ035Data={...data,quests:{...data.quests,q035:previousQ035},scripts:{...data.scripts,...previousQ035.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q035_')))};
export const q035Routes=[
 {path:['break'],outcome:'contract'},
 {path:['table'],outcome:'compromise'},
 {path:['deliver','food'],outcome:'meal'},
 {path:['deliver','record'],outcome:'compromise'},
 {path:['deliver','ask','repair'],outcome:'informed'},
 {path:['deliver','ask','table'],outcome:'compromise'}
];
export function q035Engine({legacy=false}={}){
 const base=ready(),g=legacy?new GameEngine(previousQ035Data,1935):base;
 if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q035');return g;
}
export const q035Cast=scene=>scene==='entry'?['q035_server']:['q035_server','q035_patient'];
// The patient's sampled head region is opaque cloth, never an exposed face.
const regions={q035_server:[.43,.075,.54,.135],q035_patient:[.45,.115,.55,.185]};
export async function almsArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});
 for(const id of ['q035_server','q035_patient'])assert.equal(first.characters[id],undefined);
 assert.deepEqual(first.quests.q035,await read('data/quests/q035.json'));
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set();
  for(const route of q035Routes){
   const g=q035Engine({legacy});
   const capture=()=>{
    const story=g.state.stories.q035,scene=story.scene;if(seen.has(scene))return;seen.add(scene);
    const place=data.quests.q035.story.scenes[scene].place,cast=q035Cast(scene);
    assert.equal(story.values.serverAt,place);assert.equal(story.values.partyAt,place);assert.equal(story.values.patientAt,'patient');
    assert.equal(story.values.mealAt,scene==='entry'?'server':'patient');assert.equal(story.values.repairConsent,scene==='consent');
    assert.equal(story.knowledge.party?.includes('truth')??false,scene!=='entry');
    for(const ration of [0,1]){
     const old=new GameEngine(g.data);old.load(g.save());old.state.inventory.ration=ration;
     const raw=old.save(),current=new GameEngine(data);current.load(raw);assert.equal(current.save(),raw);checkpoint(current);
     assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),cast);
     fixtures.push({edition:'e2',quest:'q035',scene,variant:`${legacy?'legacy':'current'}-ration-${ration}`,cast,save:raw,
      faces:Object.fromEntries(cast.map(id=>[id,regions[id]])),clearOfHud:true,
      availableChoice:scene==='entry'?'deliver':scene==='consent'?'repair':ration?'food':'ask',
      ...(scene==='patient'&&!ration?{blockedChoice:'food'}:{}),expectedText:data.quests.q035.model.graph.find(n=>n.id===scene).text});
    }
   };
   capture();for(const action of route.path){choose(g,'q035',action);if(g.state.quests.q035.stage!=='completed')capture();}
   assert.equal(g.state.quests.q035.outcome,route.outcome);outcomes.add(`e2/q035/${route.outcome}`);
  }
  assert.deepEqual([...seen].sort(),['entry','patient','consent'].sort());
 }
 return {fixtures,outcomes:[...outcomes]};
}
