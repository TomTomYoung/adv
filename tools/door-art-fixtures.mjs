import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {fight} from '../tests/helpers.mjs';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/pilgrimage-helpers.mjs';

export const previousQ136=await read('tests/fixtures/e2-q136-before-cast.json');
export const previousQ136Data={...data,quests:{...data.quests,q136:previousQ136},scripts:{...data.scripts,...previousQ136.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q136_')))};
export const acceptedQ136=data.previousQuestRoutes.q136;
export const acceptedQ136Data={...previousQ136Data,quests:{...previousQ136Data.quests,q136:acceptedQ136},scripts:{...previousQ136Data.scripts,...acceptedQ136.scripts}};
export const q136Routes=[...['reply','alias','record'].flatMap(greeting=>['study','shelter','leave','retry-study','retry-shelter'].map(ending=>({
 path:[...(greeting==='record'?['record','reply']:[greeting]),...(ending==='leave'?['loot','leave']:ending.startsWith('retry-')?['loot','again',ending.slice(6),'finish']:[ending,'finish'])],outcome:ending.replace('retry-',''),name:greeting==='alias'?'alias':'real'
}))),{path:['break','continue','finish'],outcome:'break',name:'unspoken'}];
export const q136AcceptedRoutes=q136Routes.map(r=>({...r,path:r.path.filter(x=>!['continue','finish'].includes(x))}));
export const q136Cast=scene=>['q136_turi',...(scene==='entry'?['q136_mercenary']:[])];
export const q136TuriAt=state=>{if(state.journey?.quest==='q136')return 'transit';let place='entry';for(const [action,to] of [['entry_record','record'],['record_reply','entry'],['purpose_study','study'],['purpose_shelter','shelter'],['entry_break_ready_continue','breach']])if(state.stories.q136.events.includes(action))place=to;return place;};
export function upgradedQ136Save(raw){const save=JSON.parse(raw),s=save.state.stories.q136;s.revision=2;s.values.turiAt=q136TuriAt(save.state);s.values.mercenariesAt='entry';return save;}
export function q136Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ136Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q136');return g;}
export function q136AcceptedEngine({accepted=true,entered=true,started=true}={}){
 const g=new GameEngine(acceptedQ136Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'pilgrim_board'});if(accepted)assert.ok(g.accept('q136'));
 if(entered){const p=acceptedQ136.locations.find(p=>p.role==='decision');go(g,{kind:'dungeon',dungeon:p.dungeon??'region_4',map:p.map,x:p.x,y:p.y});}
 if(started)g.run(acceptedQ136.model.entryScript??'q136.visit');return g;
}
export function q136AcceptedChoose(g,id,{combat=true}={}){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(combat&&g.state.battle){g.healAll();fight(g);}}
const prose=(q,scene,name)=>{const text=q.model.graph.find(n=>n.id===scene).text;return typeof text==='string'?text:(name==='alias'?text[0].yes:text[0].no);};
const choices={entry:'record',record:'reply',purpose:'study',refused:'again',study:'finish',shelter:'finish',breached:'finish',entry_break_ready:'continue'};
const namedScenes=['purpose','refused','study','shelter'];
export async function doorArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});for(const id of q136Cast('entry'))assert.equal(first.characters[id],undefined);assert.deepEqual(first.quests.q136,await read('data/quests/q136.json'));
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set(),capture=g=>{
   const s=g.state.stories.q136,scene=s.scene,suffix=namedScenes.includes(scene)?'-'+s.values.name:'',key=scene+suffix;if(seen.has(key))return;seen.add(key);
   const raw=g.save(),current=new GameEngine(data);current.load(raw);if(legacy)assert.deepEqual(JSON.parse(current.save()),upgradedQ136Save(raw));else assert.equal(current.save(),raw);checkpoint(current);
   assert.equal(current.state.stories.q136.values.turiAt,s.values.partyAt);assert.equal(current.state.stories.q136.values.mercenariesAt,'entry');
   assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),q136Cast(scene));
   fixtures.push({edition:'e2',quest:'q136',scene,variant:(legacy?'migrated':'current')+suffix,cast:q136Cast(scene),textOnlyCast:scene==='entry'?['q136_mercenary']:[],save:current.save(),faces:{q136_turi:[.46,.07,.53,.1]},clearOfHud:true,availableChoice:choices[scene],expectedText:prose(previousQ136,scene,s.values.name)});
  };
  for(const route of q136Routes){const g=q136Engine({legacy});capture(g);for(const action of route.path){if(g.state.stories.q136.scene==='entry'&&['reply','alias'].includes(action)){assert.ok(g.dispatch({type:'choose',id:action}));capture(g);drain(g);}else choose(g,'q136',action);if(g.state.quests.q136.stage!=='completed')capture(g);}assert.equal(g.state.quests.q136.outcome,route.outcome);outcomes.add('e2/q136/'+route.outcome);}
  assert.equal(seen.size,12);
 }
 const seen=new Set(),capture=g=>{
  const state=g.state.flags.quest.q136,scene=state.node,suffix=namedScenes.includes(scene)?'-'+state.name:'',key=scene+suffix;if(seen.has(key))return;seen.add(key);
  const current=new GameEngine(data);current.load(g.save());checkpoint(current);assert.equal(current.state.flags.legacyStoryRoutes.q136,true);assert.equal(current.state.stories.q136,undefined);assert.equal(projectGame(current).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q136',scene,variant:'accepted-legacy'+suffix,cast:[],absentStoryScene:true,save:current.save(),availableChoice:choices[scene],expectedText:prose(acceptedQ136,scene,state.name)});
 };
 for(const route of q136AcceptedRoutes){const g=q136AcceptedEngine();drain(g);capture(g);for(const action of route.path){if(g.state.flags.quest.q136.node==='entry'&&['reply','alias'].includes(action)){assert.ok(g.dispatch({type:'choose',id:action}));capture(g);drain(g);}else q136AcceptedChoose(g,action);if(g.state.quests.q136.stage!=='completed')capture(g);}assert.equal(g.state.quests.q136.outcome,route.outcome);outcomes.add('e2/q136/'+route.outcome);}
 assert.equal(seen.size,6);return {fixtures,outcomes:[...outcomes]};
}
