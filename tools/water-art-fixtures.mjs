import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,checkpoint} from '../tests/pilgrimage-helpers.mjs';

export const previousQ038=await read('tests/fixtures/e2-q038-before-cast.json');
export const previousQ038Data={...data,quests:{...data.quests,q038:previousQ038},scripts:{...data.scripts,...previousQ038.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>id!=='q038_inspector'))};
export const q038Routes=[
 {path:['purge'],outcome:'contract'},
 {path:['buy','finish'],outcome:'compromise'},
 {path:['sample','separate','finish'],outcome:'compromise'},
 {path:['sample','filter','finish'],outcome:'informed'},
 {path:['replace','suspend'],outcome:'compromise'},
 {path:['replace','test','post','finish'],outcome:'informed'}
];
export const q038Cast=scene=>['water','filter_check'].includes(scene)?['q038_inspector']:[];
export function q038Engine({legacy=false}={}){
 const base=ready(),g=legacy?new GameEngine(previousQ038Data,1938):base;
 if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q038');return g;
}
export function upgradedQ038Save(raw){
 const expected=JSON.parse(raw),s=expected.state.stories.q038,j=expected.state.journey;
 s.revision=2;s.values.inspectorAt=j?.quest==='q038'&&j.action==='water_filter'?'transit':s.events.includes('water_filter')?'entry':'lab';
 return expected;
}
export async function waterArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});
 assert.equal(first.characters.q038_inspector,undefined);assert.deepEqual(first.quests.q038,await read('data/quests/q038.json'));
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set();
  for(const route of q038Routes){
   const g=q038Engine({legacy});
   const capture=()=>{
    const old=g.state.stories.q038,scene=old.scene,key=scene==='supply'?scene+(old.values.waterTested?'-tested':'-direct'):scene;
    if(seen.has(key))return;seen.add(key);
    const raw=g.save(),current=new GameEngine(data);current.load(raw);
    if(legacy)assert.deepEqual(JSON.parse(current.save()),upgradedQ038Save(raw));else assert.equal(current.save(),raw);
    checkpoint(current);const s=current.state.stories.q038;
    assert.equal(s.values.inspectorAt,scene==='filter_check'?'entry':'lab');
    assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),q038Cast(scene));
    fixtures.push({edition:'e2',quest:'q038',scene,variant:(legacy?'migrated':'current')+(scene==='supply'?(s.values.waterTested?'-tested':'-direct'):''),cast:q038Cast(scene),save:current.save(),
     faces:q038Cast(scene).length?{q038_inspector:[.47,.085,.54,.125]}:{},clearOfHud:true,
     availableChoice:{entry:'sample',water:'filter',filter:'test',filter_check:'finish',after_test:'post',posted:'finish',supply:'finish'}[scene],
     expectedText:data.quests.q038.model.graph.find(n=>n.id===scene).text});
   };
   capture();for(const action of route.path){choose(g,'q038',action);if(g.state.quests.q038.stage!=='completed')capture();}
   assert.equal(g.state.quests.q038.outcome,route.outcome);outcomes.add('e2/q038/'+route.outcome);
  }
  assert.equal(seen.size,8);
 }
 return {fixtures,outcomes:[...outcomes]};
}
