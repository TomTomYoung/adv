import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,read,ready,start,choose,checkpoint,go,drain} from '../tests/machine-helpers.mjs';
export const previousQ176=await read('tests/fixtures/e2-q176-before-cast.json');
export const previousQ176Data={...data,quests:{...data.quests,q176:previousQ176},scripts:{...data.scripts,...previousQ176.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q176_')))};
export const acceptedQ176=data.previousQuestRoutes.q176;
export const acceptedQ176Data={...previousQ176Data,quests:{...previousQ176Data.quests,q176:acceptedQ176},scripts:{...previousQ176Data.scripts,...acceptedQ176.scripts}};
export const q176Routes=[
 {path:['visit','give','finish'],outcome:'travel'},
 {path:['visit','keep'],outcome:'stay'},
 {path:['visit','road','give','seeoff','finish'],outcome:'travel'},
 {path:['visit','road','agree','return','seeoff','finish'],outcome:'season'}
];
export const q176AcceptedRoutes=[{path:['give'],outcome:'travel'},{path:['keep'],outcome:'stay'},{path:['road','give'],outcome:'travel'},{path:['road','agree'],outcome:'season'}];
export const q176Cast=scene=>({entry:[],onsite:['q176_god','q176_priest'],road:['q176_priest','q176_roadkeepers'],repair:['q176_roadkeepers'],return_shrine:['q176_god'],season_return:['q176_god'],travel:['q176_god','q176_merchant'],season:['q176_god']})[scene];
export function q176Locations(s){
 const events=s.stories.q176.events,journey=s.journey?.quest==='q176'?s.journey.action:null;
 return {priestPersonAt:journey==='onsite_road'?'transit':events.includes('onsite_road')?'priest':'shrine',roadkeepersAt:journey==='road_agree'?'transit':events.includes('road_agree')?'road_place':'priest',merchantPersonAt:'departure'};
}
export function upgradedQ176Save(raw){const saved=JSON.parse(raw),s=saved.state.stories.q176;if(s){s.revision=2;Object.assign(s.values,q176Locations(saved.state));}else (saved.state.flags.legacyStoryRoutes??={}).q176=true;return saved;}
export function upgradeQ176(raw){const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),upgradedQ176Save(raw));checkpoint(g);return g;}
export function q176Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ176Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q176');return g;}
export function q176AcceptedEngine(){
 const g=new GameEngine(acceptedQ176Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q176'));
 const p=acceptedQ176.locations.find(p=>p.role==='decision')??acceptedQ176.locations[0];go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});g.run(acceptedQ176.model.entryScript??'q176.visit');drain(g);return g;
}
export async function godSandalsArtFixtures(){
 const fixtures=[],outcomes=new Set();
 const capture=(g,variant)=>{
  const raw=g.save(),now=upgradeQ176(raw),scene=g.state.stories.q176.scene,cast=q176Cast(scene);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
  fixtures.push({edition:'e2',quest:'q176',scene,variant,cast,textOnlyCast:cast,save:raw,availableChoice:{entry:'visit',onsite:'road',road:'agree',repair:'return',return_shrine:'seeoff',season_return:'seeoff',travel:'finish',season:'finish'}[scene],expectedText:projectGame(g).dialog.text});
 };
 for(const legacy of [false,true]){
  const seen=new Set(),variant=legacy?'previous':'current';
  for(const route of q176Routes){
   const g=q176Engine({legacy}),observe=()=>{const scene=g.state.stories.q176.scene;if(g.state.quests.q176.stage==='completed'||seen.has(scene))return;seen.add(scene);capture(g,variant);
    if(legacy&&['road','return_shrine'].includes(scene)){const before=q176Engine({legacy:true});for(const id of scene==='road'?['visit']:['visit','road'])choose(before,'q176',id);assert.ok(before.dispatch({type:'choose',id:scene==='road'?'road':'give'}));drain(before);assert.ok(before.state.journey);const now=upgradeQ176(before.save()),action=data.quests.q176.story.actions[now.state.journey.action];now.random=()=>.999999;go(now,data.quests.q176.story.worldPlaces[action.journey.to]);drain(now);assert.equal(projectGame(now).dialog.text,data.quests.q176.model.graph.find(n=>n.id===scene).text);capture(now,'previous-arrived');}
   };
   observe();for(const id of route.path){choose(g,'q176',id);observe();}assert.equal(g.state.quests.q176.outcome,route.outcome);outcomes.add('e2/q176/'+route.outcome);
  }
  assert.equal(seen.size,8);
 }
 const seen=new Set();
 for(const route of q176AcceptedRoutes){const old=q176AcceptedEngine(),observe=()=>{
  if(old.state.quests.q176.stage==='completed')return;const scene=old.state.flags.quest.q176.node;if(seen.has(scene))return;seen.add(scene);const now=upgradeQ176(old.save());assert.equal(now.state.flags.legacyStoryRoutes.q176,true);assert.equal(now.state.stories.q176,undefined);assert.equal(projectGame(now).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q176',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:now.save(),availableChoice:scene==='entry'?'road':'agree',expectedText:projectGame(old).dialog.text});
 };observe();for(const id of route.path){assert.ok(old.dispatch({type:'choose',id}));drain(old);observe();}assert.equal(old.state.quests.q176.outcome,route.outcome);}
 assert.equal(seen.size,2);return{fixtures,outcomes:[...outcomes]};
}
