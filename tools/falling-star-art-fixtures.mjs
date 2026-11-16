import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,go,drain,checkpoint} from '../tests/royal-helpers.mjs';
import {read} from '../tests/oddland-helpers.mjs';
export const previousQ081=await read('tests/fixtures/e2-q081-before-cast.json');
export const previousQ081Data={...data,quests:{...data.quests,q081:previousQ081},scripts:{...data.scripts,...previousQ081.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>id!=='q081_evacuated'))};
const accepted=data.previousQuestRoutes.q081;
const acceptedData={...previousQ081Data,quests:{...previousQ081Data.quests,q081:accepted},scripts:{...previousQ081Data.scripts,...accepted.scripts}};
export const q081Routes=[
 {path:['project','correct','post','finish'],accepted:['project','correct'],outcome:'informed'},
 {path:['delay','finish'],accepted:['delay'],outcome:'compromise'},
 {path:['project','postpone','finish'],accepted:['project','postpone'],outcome:'compromise'},
 {path:['destroy'],accepted:['destroy'],outcome:'contract'}
];
export const q081Cast=scene=>scene==='correction'?['q081_evacuated']:[];
export const q081LegacyScene=g=>g.state.flags.flow?.q081?.node??g.state.flags.quest?.q081?.node;
export function loadQ081(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw),s=expected.state.stories.q081;
 if(!s)(expected.state.flags.legacyStoryRoutes??={}).q081=true;
 else if(s.revision===1){s.revision=2;s.values.evacuatedGroupAt='refuge';}
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q081Engine({legacy=false}={}){
 const content=legacy?previousQ081Data:data;
 if(!starts.has(legacy)){const base=ready(),g=legacy?new GameEngine(content):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q081');starts.set(legacy,g.save());}
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
export function q081AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q081'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_9',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);return g;
}
export function arriveQ081(g){const a=g.data.quests.q081.story.actions[g.state.journey.action];go(g,g.data.quests.q081.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export function chooseQ081(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.equal(g.state.battle,null);if(g.state.journey)arriveQ081(g);checkpoint(g);}
export function departQ081(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ081(g.save());}
export async function fallingStarArtFixtures(){
 const fixtures=[],outcomes=new Set(),available={entry:'project',show:'correct',correction:'post',posted:'finish',observed:'finish'};
 for(const legacy of [false,true]){
  const generation=legacy?'previous':'current',seen=new Set();
  const observe=(g,suffix)=>{
   if(g.state.quests.q081.stage==='completed')return;
   const s=g.state.stories.q081,scene=s.scene,v=s.values,variant=generation+'-'+(suffix??[v.partyAt,v.delayed?'delayed':'scheduled',s.events.includes('entry_project')?'projected':'unprojected'].join('-'));
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const save=g.save(),cast=q081Cast(scene);assert.deepEqual(projectGame(loadQ081(save)).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q081',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
  };
  for(const route of q081Routes){const g=q081Engine({legacy});observe(g);for(const id of route.path){chooseQ081(g,id);observe(g);}assert.equal(g.state.quests.q081.outcome,route.outcome);outcomes.add('e2/q081/'+route.outcome);}
  const g=q081Engine({legacy});chooseQ081(g,'project');departQ081(g,'correct');g.defeat();drain(g);arriveQ081(g);observe(g,'rescued');
 }
 const seen=new Set();
 for(const route of q081Routes){
  const g=loadQ081(q081AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q081.stage==='completed')return;const scene=q081LegacyScene(g);assert.ok(scene);if(seen.has(scene))return;seen.add(scene);
   assert.equal(projectGame(loadQ081(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q081',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='entry'?'project':'correct'});
  };
  observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.battle,null);observe();}assert.equal(g.state.quests.q081.outcome,route.outcome);
 }
 return {fixtures,outcomes:[...outcomes]};
}
