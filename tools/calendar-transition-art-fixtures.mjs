import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {evaluate} from '../src/core/expression.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,go,drain,checkpoint} from '../tests/royal-helpers.mjs';
import {read} from '../tests/oddland-helpers.mjs';
export const previousQ089=await read('tests/fixtures/e2-q089-before-cast.json');
export const previousQ089Data={...data,quests:{...data.quests,q089:previousQ089},scripts:{...data.scripts,...previousQ089.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q089_')))};
const accepted=data.previousQuestRoutes.q089;
const acceptedData={...previousQ089Data,quests:{...previousQ089Data.quests,q089:accepted},scripts:{...previousQ089Data.scripts,...accepted.scripts}};
export const q089Routes=[
 {path:['turn','wedding','return','wages','return','switch'],outcome:'informed'},
 {path:['turn','wedding','return','wages','return','keep','finish'],outcome:'compromise'},
 {path:['turn','wedding','return','keep','finish'],outcome:'compromise'},
 {path:['turn','wages','return','wedding','return','switch'],outcome:'informed'},
 {path:['turn','wages','return','wedding','return','keep','finish'],outcome:'compromise'},
 {path:['turn','wages','return','keep','finish'],outcome:'compromise'},
 {path:['turn','keep','finish'],outcome:'compromise'},
 {path:['two','finish'],outcome:'compromise'},
 {path:['gears'],outcome:'contract'}
].map(r=>({...r,accepted:r.path.filter(id=>!['return','finish'].includes(id))}));
export const q089Cast=scene=>scene==='wedding_agreed'?['q089_weddingParties']:scene==='wages_agreed'?['q089_payrollParties']:[];
export const q089LegacyScene=g=>g.state.flags.flow?.q089?.node??g.state.flags.quest?.q089?.node;
export function loadQ089(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw),s=expected.state.stories.q089;
 if(!s)(expected.state.flags.legacyStoryRoutes??={}).q089=true;
 else if(s.revision===1){s.revision=2;s.values.weddingPartiesAt='wedding';s.values.payrollPartiesAt='wages';}
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q089Engine({legacy=false}={}){
 const content=legacy?previousQ089Data:data;
 if(!starts.has(legacy)){const base=ready(),g=legacy?new GameEngine(content):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q089');starts.set(legacy,g.save());}
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
export function q089AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q089'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_9',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);return g;
}
export function arriveQ089(g){const a=g.data.quests.q089.story.actions[g.state.journey.action];go(g,g.data.quests.q089.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export function chooseQ089(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.equal(g.state.battle,null);if(g.state.journey)arriveQ089(g);checkpoint(g);}
export function departQ089(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ089(g.save());}
// Enumerate enabled paths with the actual authored predicates. Re-entering dates
// is finite because each appointment sets a flag that disables another visit.
export function q089Paths(q){
 const rows=[],nodes=new Map(q.model.graph.map(n=>[n.id,n]));
 const visit=(scene,path,flags)=>{assert.ok(path.length<12,'unexpected repeatable calendar path');
  const state={stories:{q089:{values:flags}},flags:{flow:{q089:flags}}};
  for(const o of nodes.get(scene).options){const a=q.story?.actions[o.action],requires=a?.requires??o.when??true;
   if(!evaluate(requires,state)||(o.need??[]).some(k=>!flags[k]))continue;
   const next={...flags,...o.set};for(const e of a?.effects??[])if(e.op==='set')next[e.key]=e.value;
   const p=[...path,o.id];if(o.to.startsWith('@'))rows.push({path:p,outcome:o.to.slice(1)});else visit(o.to,p,next);
  }
 };visit('entry',[],{wedding:false,wages:false});return rows;
}
export async function calendarTransitionArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const generation=legacy?'previous':'current',seen=new Set();
  const observe=(g,suffix)=>{if(g.state.quests.q089.stage==='completed')return;
   const s=g.state.stories.q089,scene=s.scene,v=s.values,variant=generation+'-'+(suffix??[v.south?'south':'north',v.wedding?'wedding':'no-wedding',v.wages?'wages':'no-wages'].join('-'));
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const save=g.save(),cast=q089Cast(scene),blockedChoices=scene==='dates'?[...(!v.wedding||!v.wages?['switch']:[]),...(v.wedding?['wedding']:[]),...(v.wages?['wages']:[])]:[];
   assert.deepEqual(projectGame(loadQ089(save)).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q089',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:scene==='dates'?(v.wedding&&v.wages?'switch':'keep'):{entry:'turn',wedding_agreed:'return',wages_agreed:'return',dual:'finish'}[scene],blockedChoices});
  };
  for(const r of q089Routes){const g=q089Engine({legacy});observe(g);for(const id of r.path){chooseQ089(g,id);observe(g);}assert.equal(g.state.quests.q089.outcome,r.outcome);outcomes.add('e2/q089/'+r.outcome);}
  for(const [prefix,id,suffix] of [[['turn'],'wedding','wedding'],[['turn'],'wages','wages'],[['turn','wedding'],'return','return'],[[],'two','dual']]){
   const g=q089Engine({legacy});for(const c of prefix)chooseQ089(g,c);departQ089(g,id);g.defeat();drain(g);arriveQ089(g);observe(g,'rescued-'+suffix);
  }
 }
 const seen=new Set();for(const r of q089Routes){const g=loadQ089(q089AcceptedEngine().save());
  const observe=()=>{if(g.state.quests.q089.stage==='completed')return;const scene=q089LegacyScene(g),v=g.state.flags.flow.q089,variant='accepted-'+[v.wedding?'wedding':'no-wedding',v.wages?'wages':'no-wages'].join('-');if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);assert.equal(projectGame(g).dialog.scene,undefined);
   const blockedChoices=scene==='dates'?[...(!v.wedding||!v.wages?['switch']:[]),...(v.wedding?['wedding']:[]),...(v.wages?['wages']:[])]:[];
   fixtures.push({edition:'e2',quest:'q089',scene,variant,cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='entry'?'turn':v.wedding&&v.wages?'switch':'keep',blockedChoices});
  };observe();for(const id of r.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q089.outcome,r.outcome);
 }
 return {fixtures,outcomes:[...outcomes]};
}
