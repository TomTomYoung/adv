import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,checkpoint} from '../tests/pilgrimage-helpers.mjs';

export const recipientKeys=['first','second','third'];
export const previousQ037=await read('tests/fixtures/e2-q037-before-cast.json');
export const previousQ037Data={...data,quests:{...data.quests,q037:previousQ037},scripts:{...data.scripts,...previousQ037.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q037_')))};
export function q037Engine({legacy=false}={}){
 const base=ready(),g=legacy?new GameEngine(previousQ037Data,1937):base;
 if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q037');return g;
}
export function q037Cast(scene){return recipientKeys.includes(scene)?['q037_owner_'+scene]:[];}
export async function confessionArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});
 assert.deepEqual(first.quests.q037,await read('data/quests/q037.json'));
 for(const key of recipientKeys)assert.equal(first.characters['q037_owner_'+key],undefined);
 const fixtures=[],outcomes=new Set(),faces={first:[.48,.075,.56,.12],second:[.47,.065,.54,.105],third:[.45,.075,.53,.12]};
 for(const legacy of [false,true]){
  const g=q037Engine({legacy}),seen=new Set();
  const capture=()=>{
   const scene=g.state.stories.q037.scene,values=g.state.stories.q037.values;
   const returned=recipientKeys.filter(k=>values[k]).length;
   const suffix=scene==='return'&&returned?'-returned'+returned:'';
   const key=scene+suffix;if(seen.has(key))return;seen.add(key);
   const raw=g.save(),current=new GameEngine(data,1937);current.load(raw);assert.equal(current.save(),raw,'q037 needs no save transformation');checkpoint(current);
   for(const k of recipientKeys)assert.equal(values['owner_'+k+'At'],k);
   assert.equal(values.partyAt,data.quests.q037.story.scenes[scene].place);
   assert.equal(values.cageAt,scene==='entry'?'entry':'quiet');
   assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),q037Cast(scene));
   const availableChoice=scene==='entry'?'move':scene==='return'?(recipientKeys.find(k=>!values[k])??'finish'):'back';
   fixtures.push({edition:'e2',quest:'q037',scene,variant:(legacy?'legacy':'current')+suffix,cast:q037Cast(scene),save:raw,
    ...(faces[scene]?{faces:{['q037_owner_'+scene]:faces[scene]},clearOfHud:true}:{}),availableChoice,
    ...(scene==='return'&&returned<3?{blockedChoice:'finish'}:{}),expectedText:data.quests.q037.model.graph.find(n=>n.id===scene).text});
  };
  capture();choose(g,'q037','move');capture();
  for(const key of recipientKeys){choose(g,'q037',key);capture();choose(g,'q037','back');capture();}
  choose(g,'q037','finish');assert.equal(g.state.quests.q037.outcome,'informed');outcomes.add('e2/q037/informed');
  assert.equal(seen.size,8);
  for(const [choice,outcome] of [['destroy','contract'],['seal','compromise']]){
   const other=q037Engine({legacy});choose(other,'q037',choice);assert.equal(other.state.quests.q037.outcome,outcome);outcomes.add('e2/q037/'+outcome);
  }
 }
 return {fixtures,outcomes:[...outcomes]};
}
