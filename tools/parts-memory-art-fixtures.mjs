import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,go,drain,checkpoint,read} from '../tests/machine-helpers.mjs';

export const previousQ078=await read('tests/fixtures/e2-q078-before-cast.json');
export const previousQ078Data={...data,quests:{...data.quests,q078:previousQ078},scripts:{...data.scripts,...previousQ078.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>id!=='q078_user'))};
const accepted=data.previousQuestRoutes.q078;
const acceptedData={...previousQ078Data,quests:{...previousQ078Data.quests,q078:accepted},scripts:{...previousQ078Data.scripts,...accepted.scripts}};
export const q078Routes=[
 {path:['manual'],accepted:['manual'],outcome:'compromise'},
 {path:['erase'],accepted:['erase'],outcome:'contract'},
 {path:['train','manual'],accepted:['train','manual'],outcome:'compromise'},
 {path:['train','hammer','return','manual'],accepted:['train','hammer','manual'],outcome:'compromise'},
 {path:['train','needle','return','manual'],accepted:['train','needle','manual'],outcome:'compromise'},
 {path:['train','hammer','return','needle','return','manual'],accepted:['train','hammer','needle','manual'],outcome:'compromise'},
 {path:['train','needle','return','hammer','return','manual'],accepted:['train','needle','hammer','manual'],outcome:'compromise'},
 {path:['train','hammer','return','needle','return','save','finish'],accepted:['train','hammer','needle','save'],outcome:'informed'},
 {path:['train','needle','return','hammer','return','save','finish'],accepted:['train','needle','hammer','save'],outcome:'informed'}
];
export const q078Cast=()=>['q078_user'];
export const q078LegacyScene=g=>g.state.flags.flow?.q078?.node??g.state.flags.quest?.q078?.node;
export function loadQ078(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw);if(!expected.state.stories.q078)(expected.state.flags.legacyStoryRoutes??={}).q078=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
const starts=new Map();
export function q078Engine({legacy=false}={}){
 const content=legacy?previousQ078Data:data;
 if(!starts.has(legacy)){const base=ready(),g=legacy?new GameEngine(content):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q078');starts.set(legacy,g.save());}
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
export function q078AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q078'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);return g;
}
export const chooseQ078=(g,id,options)=>choose(g,'q078',id,options);
export function departQ078(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ078(g.save());}
export function arriveQ078(g){const a=g.data.quests.q078.story.actions[g.state.journey.action];go(g,g.data.quests.q078.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export async function partsMemoryArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const generation=legacy?'previous':'current',seen=new Set();
  const observe=(g,suffix)=>{
   if(g.state.quests.q078.stage==='completed')return;
   const s=g.state.stories.q078,scene=s.scene,v=s.values,variant=generation+'-'+(suffix??[v.hammer?'hammer':'nohammer',v.needle?'needle':'noneedle',v.oldLayoutAt].join('-'));
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const save=g.save(),cast=q078Cast(scene);assert.deepEqual(projectGame(loadQ078(save)).dialog.scene.cast.map(c=>c.id),cast);
   const blockedChoices=scene==='bench'?[...(!v.hammer||!v.needle?['save']:[]),...(v.hammer?['hammer']:[]),...(v.needle?['needle']:[])]:[];
   const availableChoice=scene==='entry'?'train':scene==='bench'?(v.hammer&&v.needle?'save':'manual'):scene==='saved'?'finish':'return';
   fixtures.push({edition:'e2',quest:'q078',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice,...(blockedChoices.length?{blockedChoices}:{})});
  };
  for(const route of q078Routes){const g=q078Engine({legacy});observe(g);for(const id of route.path){chooseQ078(g,id);assert.equal(g.state.battle,null);observe(g);}assert.equal(g.state.quests.q078.outcome,route.outcome);outcomes.add('e2/q078/'+route.outcome);}
  const g=q078Engine({legacy});departQ078(g,'train');g.defeat();drain(g);arriveQ078(g);observe(g,'rescued');
 }
 const seen=new Set();
 for(const route of q078Routes){
  const g=loadQ078(q078AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q078.stage==='completed')return;const scene=q078LegacyScene(g),flags=g.state.flags.flow?.q078??g.state.flags.quest?.q078;assert.ok(scene);
   const variant='accepted-'+(flags.hammer?'hammer':'nohammer')+'-'+(flags.needle?'needle':'noneedle');
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   assert.equal(projectGame(loadQ078(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q078',scene,variant,cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='entry'?'train':'manual'});
  };
  observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.equal(g.state.battle,null);observe();}assert.equal(g.state.quests.q078.outcome,route.outcome);
 }
 return {fixtures,outcomes:[...outcomes]};
}
