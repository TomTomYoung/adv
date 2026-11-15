import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain,checkpoint,read} from '../tests/machine-helpers.mjs';

export const previousQ077=await read('tests/fixtures/e2-q077-before-cast.json');
export const previousQ077Data={...data,quests:{...data.quests,q077:previousQ077},scripts:{...data.scripts,...previousQ077.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!['q077_pilgrim','q077_maintainer'].includes(id)))};
const accepted=data.previousQuestRoutes.q077;
const acceptedData={...previousQ077Data,quests:{...previousQ077Data.quests,q077:accepted},scripts:{...previousQ077Data.scripts,...accepted.scripts}};
// The current and accepted decision graphs are acyclic.
export const q077Routes=[
 {path:['cutpower','lamps','return','finish'],accepted:['cutpower','lamps'],outcome:'informed'},
 {path:['fence','finish'],accepted:['fence'],outcome:'compromise'},
 {path:['cutpower','restore','finish'],accepted:['cutpower','restore'],outcome:'compromise'},
 {path:['scrape'],accepted:['scrape'],outcome:'contract'}
];
export const q077Cast=scene=>scene==='entry'?['q077_pilgrim']:scene==='outage'?['q077_maintainer']:[];
export const q077LegacyScene=g=>g.state.flags.flow?.q077?.node??g.state.flags.quest?.q077?.node;
export function loadQ077(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw),s=expected.state.stories.q077;
 if(!s)(expected.state.flags.legacyStoryRoutes??={}).q077=true;
 else if(s.revision===1){s.revision=2;s.values.pilgrimPersonAt='entry';s.values.maintainerPersonAt='entry';}
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q077Engine({legacy=false}={}){
 const content=legacy?previousQ077Data:data;
 if(!starts.has(legacy)){const base=ready(),g=legacy?new GameEngine(content):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q077');starts.set(legacy,g.save());}
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
export function q077AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q077'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);return g;
}
export const chooseQ077=(g,id,options)=>choose(g,'q077',id,options);
export function departQ077(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ077(g.save());}
export function arriveQ077(g){const a=g.data.quests.q077.story.actions[g.state.journey.action];go(g,g.data.quests.q077.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export async function stigmataWiringArtFixtures(){
 const fixtures=[],outcomes=new Set(),available={entry:'cutpower',outage:'lamps',delivered:'return',repaired:'finish',detoured:'finish'};
 for(const legacy of [false,true]){
  const generation=legacy?'previous':'current',seen=new Set();
  const observe=(g,suffix)=>{
   if(g.state.quests.q077.stage==='completed')return;
   const s=g.state.stories.q077,scene=s.scene,v=s.values,variant=generation+'-'+(suffix??[v.lampsAt,v.outage?'outage':'powered',s.events.includes('entry_cutpower')?'cut':'live'].join('-'));
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const save=g.save(),cast=q077Cast(scene);assert.deepEqual(projectGame(loadQ077(save)).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q077',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
  };
  for(const route of q077Routes){const g=q077Engine({legacy});observe(g);for(const id of route.path){chooseQ077(g,id);observe(g);}assert.equal(g.state.quests.q077.outcome,route.outcome);outcomes.add('e2/q077/'+route.outcome);}
  const g=q077Engine({legacy});chooseQ077(g,'cutpower');departQ077(g,'lamps');g.defeat();drain(g);arriveQ077(g);observe(g,'rescued');
 }
 const seen=new Set();
 for(const route of q077Routes){
  const g=loadQ077(q077AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q077.stage==='completed')return;const scene=q077LegacyScene(g);assert.ok(scene);if(seen.has(scene))return;seen.add(scene);
   assert.equal(projectGame(loadQ077(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q077',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='entry'?'cutpower':'lamps'});
  };
  observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.battle,null);observe();}assert.equal(g.state.quests.q077.outcome,route.outcome);
 }
 return {fixtures,outcomes:[...outcomes]};
}
