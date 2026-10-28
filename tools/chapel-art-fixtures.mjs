import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,checkpoint} from '../tests/pilgrimage-helpers.mjs';

export const previousQ032=await read('tests/fixtures/e2-q032-before-cast.json');
export const previousQ032Data={...data,quests:{...data.quests,q032:previousQ032},scripts:{...data.scripts,...previousQ032.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q032_')))};
export const q032Routes=[
 {path:['restore'],outcome:'contract'},
 {path:['plate'],outcome:'compromise'},
 {path:['look','leave','finish'],outcome:'compromise'},
 {path:['look','opaque','stone','finish'],outcome:'informed'},
 {path:['look','opaque','original','finish'],outcome:'contract'}
];
export function q032Engine({legacy=false}={}){
 const base=ready(),g=legacy?new GameEngine(previousQ032Data,1907):base;
 if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q032');return g;
}
export const q032Cast=scene=>scene==='cell'?['q032_prisoner']:scene==='workshop'?['q032_craftsperson']:[];
export async function chapelArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});
 for(const id of ['q032_prisoner','q032_craftsperson'])assert.equal(first.characters[id],undefined);
 assert.deepEqual(first.quests.q032,await read('data/quests/q032.json'));
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set();
  for(const route of q032Routes){
   const g=q032Engine({legacy});
   const capture=()=>{
    const scene=g.state.stories.q032.scene;if(!scene||seen.has(scene))return;seen.add(scene);
    const current=new GameEngine(data,1907);current.load(g.save());checkpoint(current);
    const cast=q032Cast(scene);assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),cast);
    assert.equal(current.state.stories.q032.values.prisonerAt,'cell');assert.equal(current.state.stories.q032.values.craftspersonAt,'workshop');
    assert.equal(current.state.stories.q032.values.jewelAt,'entry');
    const faces=scene==='cell'?{q032_prisoner:[.38,.18,.52,.23]}:scene==='workshop'?{q032_craftsperson:[.39,.12,.56,.19]}:undefined;
    fixtures.push({edition:'e2',quest:'q032',scene,variant:legacy?'migrated':'current',cast,save:current.save(),faces,
     ...(scene==='workshop'?{availableChoice:'stone',expectedText:legacy?'職人が透明な宝玉と不透明な石を並べた。':'職人が不透明な石を台に置いた。'}:{})});
   };
   capture();for(const action of route.path){choose(g,'q032',action);if(g.state.quests.q032.stage!=='completed')capture();}
   assert.equal(g.state.quests.q032.outcome,route.outcome);outcomes.add(`e2/q032/${route.outcome}`);
  }
  assert.deepEqual([...seen].sort(),Object.keys(data.quests.q032.story.scenes).sort());
 }
 return {fixtures,outcomes:[...outcomes]};
}
