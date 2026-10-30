import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,checkpoint} from '../tests/pilgrimage-helpers.mjs';

export const previousQ039=await read('tests/fixtures/e2-q039-before-cast.json');
export const previousQ039Data={...data,quests:{...data.quests,q039:previousQ039},scripts:{...data.scripts,...previousQ039.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q039_')))};
export const q039Routes=[
 {path:['buyer'],outcome:'contract'},
 {path:['gather','copies'],outcome:'compromise'},
 {path:['gather','marks','register'],outcome:'informed'},
 {path:['gather','marks','replicas'],outcome:'compromise'}
];
export const q039Cast=['q039_repairer','q039_claimants'];
export function q039Engine({legacy=false}={}){
 const base=ready(),g=legacy?new GameEngine(previousQ039Data,1939):base;
 if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q039');return g;
}
export function upgradedQ039Save(raw){
 const expected=JSON.parse(raw);expected.state.stories.q039.revision=2;
 Object.assign(expected.state.stories.q039.values,{repairerAt:'entry',claimantsAt:'entry'});return expected;
}
export async function maskArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});
 for(const id of q039Cast)assert.equal(first.characters[id],undefined);
 assert.deepEqual(first.quests.q039,await read('data/quests/q039.json'));
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set();
  for(const route of q039Routes){
   const g=q039Engine({legacy});
   const capture=()=>{
    const scene=g.state.stories.q039.scene;if(seen.has(scene))return;seen.add(scene);
    const raw=g.save(),current=new GameEngine(data);current.load(raw);
    if(legacy)assert.deepEqual(JSON.parse(current.save()),upgradedQ039Save(raw));else assert.equal(current.save(),raw);
    checkpoint(current);const s=current.state.stories.q039;
    for(const key of ['partyAt','buyerAt','repairerAt','claimantsAt'])assert.equal(s.values[key],'entry');
    assert.equal(s.values.maskAt,'entry');assert.equal(s.values.jointMarks,scene==='account');
    assert.equal(s.knowledge.party?.includes('truth')??false,scene!=='entry');
    assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),q039Cast);
    fixtures.push({edition:'e2',quest:'q039',scene,variant:legacy?'migrated':'current',cast:q039Cast,save:current.save(),
     textOnlyCast:['q039_claimants'],faces:{q039_repairer:[.495,.108,.545,.145]},clearOfHud:true,
     availableChoice:{entry:'gather',owners:'marks',account:'register'}[scene],
     expectedText:data.quests.q039.model.graph.find(n=>n.id===scene).text});
   };
   capture();for(const action of route.path){choose(g,'q039',action);if(g.state.quests.q039.stage!=='completed')capture();}
   assert.equal(g.state.quests.q039.outcome,route.outcome);outcomes.add('e2/q039/'+route.outcome);
  }
  assert.deepEqual([...seen].sort(),['account','entry','owners']);
 }
 return {fixtures,outcomes:[...outcomes]};
}
