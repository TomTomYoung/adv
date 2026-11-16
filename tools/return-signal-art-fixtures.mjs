// Display fixtures suppress encounters; ordinary seeded party trials are separate.
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain,checkpoint} from '../tests/royal-helpers.mjs';
import {read} from '../tests/oddland-helpers.mjs';
export const previousQ084=await read('tests/fixtures/e2-q084-before-cast.json');
export const previousQ084Data={...data,quests:{...data.quests,q084:previousQ084},scripts:{...data.scripts,...previousQ084.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q084_')))};
const accepted=data.previousQuestRoutes.q084;
const acceptedData={...previousQ084Data,quests:{...previousQ084Data.quests,q084:accepted},scripts:{...previousQ084Data.scripts,...accepted.scripts}};
export const q084Routes=[
 {path:['source','trail','follow','reach','finish'],accepted:['source','trail','reach'],outcome:'informed'},
 {path:['source','trail','follow','call','escort','finish'],accepted:['source','trail','call'],outcome:'compromise'},
 {path:['source','handoff','finish'],accepted:['source','handoff'],outcome:'compromise'},
 {path:['recover','carry','finish'],accepted:['recover'],outcome:'contract'}
];
export const q084Cast=scene=>scene==='recovered'?['q084_family']:scene==='reached'?['q084_survivors']:['route_check','handoff','call_report','expert_arrived'].includes(scene)?['q084_specialists']:[];
export const q084LegacyScene=g=>g.state.flags.flow?.q084?.node??g.state.flags.quest?.q084?.node;
export function loadQ084(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw),s=expected.state.stories.q084;
 if(!s)(expected.state.flags.legacyStoryRoutes??={}).q084=true;
 else if(s.revision===1){s.revision=2;s.values.familyGroupAt='family';}
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const bases=new Map(),starts=new Map();
function baseWithMap(map){
 if(!bases.has(map)){
  const g=ready();
  if(map==='accepted'){go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q061'));}
  else if(map!=='none'){
   start(g,'q061');const paths={informed:['trial','next','rescue','finish'],local:['local'],contract:['sea','finish']};assert.ok(paths[map]);
   for(const c of paths[map])choose(g,'q061',c);
   assert.equal(g.state.quests.q061.outcome,map==='local'?'compromise':map);
  }
  bases.set(map,g.save());
 }
 return bases.get(map);
}
export function q084Engine({legacy=false,map='none'}={}){
 const content=legacy?previousQ084Data:data,key=legacy+'/'+map;
 if(!starts.has(key)){const g=new GameEngine(content);g.load(baseWithMap(map));g.random=()=>.999999;start(g,'q084');starts.set(key,g.save());}
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(key));return g;
}
export function q084AcceptedEngine({map='none'}={}){
 const g=new GameEngine(acceptedData);g.load(baseWithMap(map));g.random=()=>.999999;
 go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q084'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_9',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);return g;
}
export function arriveQ084(g){const a=g.data.quests.q084.story.actions[g.state.journey.action];go(g,g.data.quests.q084.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export function chooseQ084(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.equal(g.state.battle,null);if(g.state.journey)arriveQ084(g);checkpoint(g);}
export function departQ084(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ084(g.save());}
export async function returnSignalArtFixtures(){
 const fixtures=[],outcomes=new Set(),available={entry:'source',beacon:'trail',crossing:'reach',recovery:'carry',recovered:'finish',route_check:'follow',reached:'finish',handoff:'finish',call_report:'escort',expert_arrived:'finish'};
 for(const legacy of [false,true])for(const map of ['none','informed']){
  const generation=legacy?'previous':'current',seen=new Set();
  const observe=(g,suffix)=>{
   if(g.state.quests.q084.stage==='completed')return;
   const s=g.state.stories.q084,scene=s.scene,v=s.values,variant=generation+'-'+map+'-'+(suffix??[v.beaconDeviceAt,v.specialistsAt].join('-'));
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const save=g.save(),cast=q084Cast(scene);assert.deepEqual(projectGame(loadQ084(save)).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q084',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
  };
  for(const route of q084Routes){const g=q084Engine({legacy,map});observe(g);for(const id of route.path){chooseQ084(g,id);observe(g);}assert.equal(g.state.quests.q084.outcome,route.outcome);outcomes.add('e2/q084/'+route.outcome);}
  // Capture the first conditional paragraph before the normal traversal drains it.
  {const g=q084Engine({legacy,map});for(const id of ['source','trail'])chooseQ084(g,id);departQ084(g,'follow');let save;
   const dispatch=g.dispatch.bind(g);g.dispatch=intent=>{if(!save&&intent.type==='advance'&&g.state.stories.q084.scene==='crossing'&&g.state.waiting?.type==='text')save=g.save();return dispatch(intent);};arriveQ084(g);
   assert.ok(save);const h=loadQ084(save);assert.equal(h.state.waiting.type,'text');
   fixtures.push({edition:'e2',quest:'q084',scene:'crossing',variant:generation+'-'+map+'-conditional',cast:[],textOnlyCast:[],save,expectedText:projectGame(h).dialog.text,absentText:map==='informed'?'各室で息を整えた跡を一つずつ':'救難隊から借りた',availableChoice:'reach'});
  }
  for(const [before,id] of [[['recover'],'carry'],[['source','trail'],'follow'],[['source','trail','follow','call'],'escort']]){
   const g=q084Engine({legacy,map});for(const c of before)chooseQ084(g,c);departQ084(g,id);g.defeat();drain(g);arriveQ084(g);observe(g,'rescued');
  }
 }
 for(const map of ['none','informed']){
  const seen=new Set();for(const route of q084Routes){const g=loadQ084(q084AcceptedEngine({map}).save()),observe=()=>{
   if(g.state.quests.q084.stage==='completed')return;const scene=q084LegacyScene(g);assert.ok(scene);if(seen.has(scene))return;seen.add(scene);
   assert.equal(projectGame(loadQ084(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q084',scene,variant:'accepted-'+map,cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});
  };observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.battle,null);observe();}assert.equal(g.state.quests.q084.outcome,route.outcome);}
 }
 return {fixtures,outcomes:[...outcomes]};
}
