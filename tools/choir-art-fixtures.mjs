import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,checkpoint} from '../tests/pilgrimage-helpers.mjs';

export const previousQ036=await read('tests/fixtures/e2-q036-before-cast.json');
export const previousQ036Data={...data,quests:{...data.quests,q036:previousQ036},scripts:{...data.scripts,...previousQ036.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q036_')))};
export const q036Routes=[
 {path:['cut'],outcome:'contract'},
 {path:['solo','memorial'],outcome:'compromise'},
 {path:['solo','rehearse','program'],outcome:'informed'},
 {path:['solo','rehearse','separate'],outcome:'compromise'}
];
export const q036Cast=['q036_conductor','q036_choir'];
export function q036Engine({legacy=false}={}){
 const base=ready(),g=legacy?new GameEngine(previousQ036Data,1936):base;
 if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q036');return g;
}
export function upgradedQ036Save(raw){
 const expected=JSON.parse(raw);expected.state.stories.q036.revision=2;
 Object.assign(expected.state.stories.q036.values,{conductorAt:'entry',choirAt:'entry'});return expected;
}
export async function choirArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});
 for(const id of q036Cast)assert.equal(first.characters[id],undefined);
 assert.deepEqual(first.quests.q036,await read('data/quests/q036.json'));
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set();
  for(const route of q036Routes){
   const g=q036Engine({legacy});
   const capture=()=>{
    const scene=g.state.stories.q036.scene;if(seen.has(scene))return;seen.add(scene);
    const raw=g.save(),current=new GameEngine(data);current.load(raw);
    if(legacy)assert.deepEqual(JSON.parse(current.save()),upgradedQ036Save(raw));else assert.equal(current.save(),raw);
    checkpoint(current);const s=current.state.stories.q036;
    for(const key of ['partyAt','conductorAt','choirAt'])assert.equal(s.values[key],'entry');
    assert.equal(s.values.livePaused,scene==='recording');assert.equal(s.values.rehearsed,scene==='credit');
    assert.equal(s.knowledge.party?.includes('truth')??false,scene!=='entry');
    assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),q036Cast);
    fixtures.push({edition:'e2',quest:'q036',scene,variant:legacy?'migrated':'current',cast:q036Cast,save:current.save(),
     textOnlyCast:['q036_choir'],faces:{q036_conductor:[.47,.085,.54,.125]},clearOfHud:true,
     availableChoice:{entry:'solo',recording:'rehearse',credit:'program'}[scene],
     expectedText:data.quests.q036.model.graph.find(n=>n.id===scene).text});
   };
   capture();for(const action of route.path){choose(g,'q036',action);if(g.state.quests.q036.stage!=='completed')capture();}
   assert.equal(g.state.quests.q036.outcome,route.outcome);outcomes.add('e2/q036/'+route.outcome);
  }
  assert.deepEqual([...seen].sort(),['credit','entry','recording']);
 }
 return {fixtures,outcomes:[...outcomes]};
}
