import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,checkpoint} from '../tests/pilgrimage-helpers.mjs';

export const previousQ040=await read('tests/fixtures/e2-q040-before-cast.json');
export const previousQ040Data={...data,quests:{...data.quests,q040:previousQ040},scripts:{...data.scripts,...previousQ040.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>id!=='q040_witness'))};
export const q040Routes=[
 {path:['seal'],outcome:'contract'},
 {path:['isolate','finish'],outcome:'compromise'},
 {path:['listen','move','finish'],outcome:'compromise'},
 {path:['listen','copy','defend'],outcome:'informed'},
 {path:['listen','copy','remove','carry','finish'],outcome:'compromise'},
 {path:['listen','fight','fragment','finish'],outcome:'fragment'},
 {path:['listen','fight','seal'],outcome:'contract'}
];
export function q040Engine({legacy=false}={}){
 const base=ready(),g=legacy?new GameEngine(previousQ040Data,1940):base;
 if(legacy)g.load(base.save());g.random=()=>.999999;
 // Branch fixtures isolate the existing three-completion prerequisite.
 // The pilgrimage campaign test earns it through ordinary quest completions.
 g.state.vars.region_4=3;start(g,'q040');return g;
}
export const q040Cast=scene=>scene==='shadow'?['q040_witness']:[];
export async function mirrorArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});
 assert.equal(first.characters.q040_witness,undefined);assert.deepEqual(first.quests.q040,await read('data/quests/q040.json'));
 const fixtures=[],outcomes=new Set(),choices={entry:'listen',witness:'copy',shadow:'remove',after:'fragment',collect_mirror:'carry',isolated:'finish',fragment:'finish'};
 for(const legacy of [false,true]){
  const seen=new Set();
  for(const route of q040Routes){
   const g=q040Engine({legacy});
   const capture=()=>{
    const s=g.state.stories.q040,scene=s.scene,copied=scene==='isolated'&&s.values.testimony,key=scene+(copied?'-copied':'');
    if(seen.has(key))return;seen.add(key);
    const raw=g.save(),current=new GameEngine(data);current.load(raw);assert.equal(current.save(),raw,'q040 keeps the existing save definition');checkpoint(current);
    assert.equal(s.values.witnessAt,'record');
    assert.equal(s.values.mirrorAt,scene==='isolated'?'isolation':'entry');
    assert.equal(s.values.copyAt,scene==='shadow'?'witness':copied?'isolation':'party');
    const cast=q040Cast(scene);assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),cast);
    fixtures.push({edition:'e2',quest:'q040',scene,variant:(legacy?'legacy':'current')+(copied?'-copied':''),cast,save:raw,
     ...(cast.length?{faces:{q040_witness:[.49,.075,.57,.11]},clearOfHud:true}:{}),
     availableChoice:choices[scene],expectedText:g.data.quests.q040.model.graph.find(n=>n.id===scene).text});
   };
   capture();for(const action of route.path){choose(g,'q040',action);if(g.state.quests.q040.stage!=='completed')capture();}
   assert.equal(g.state.quests.q040.outcome,route.outcome);outcomes.add('e2/q040/'+route.outcome);
  }
  assert.deepEqual([...seen].sort(),['entry','witness','shadow','after','collect_mirror','isolated','isolated-copied','fragment'].sort());
 }
 return {fixtures,outcomes:[...outcomes]};
}
