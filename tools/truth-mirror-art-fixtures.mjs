import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,read,ready,start,choose,checkpoint,go,drain} from '../tests/machine-helpers.mjs';
export const previousQ177=await read('tests/fixtures/e2-q177-before-cast.json');
export const previousQ177Data={...data,quests:{...data.quests,q177:previousQ177},scripts:{...data.scripts,...previousQ177.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q177_')))};
export const acceptedQ177=data.previousQuestRoutes.q177;
export const acceptedQ177Data={...previousQ177Data,quests:{...previousQ177Data.quests,q177:acceptedQ177},scripts:{...previousQ177Data.scripts,...acceptedQ177.scripts}};
export const q177Routes=[
 {path:['visit','notice','finish'],outcome:'notice'},
 {path:['visit','compare','correct','finish'],outcome:'correct'},
 {path:['visit','compare','window','return','finish'],outcome:'window'},
 {path:['visit','close','notice','finish'],outcome:'close'},
 {path:['visit','compare','close','notice','finish'],outcome:'close'}
];
export const q177AcceptedRoutes=[{path:['notice'],outcome:'notice'},{path:['compare','correct'],outcome:'correct'},{path:['compare','window'],outcome:'window'},{path:['close'],outcome:'close'},{path:['compare','close'],outcome:'close'}];
export const q177Cast=scene=>scene==='onsite'?['q177_courier']:scene==='notice'?['q177_customers']:[];
export function upgradedQ177Save(raw){const saved=JSON.parse(raw),s=saved.state.stories.q177;if(s){s.revision=2;Object.assign(s.values,{courierPersonAt:'shop',customersAt:'public'});}else(saved.state.flags.legacyStoryRoutes??={}).q177=true;return saved;}
export function upgradeQ177(raw){const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),upgradedQ177Save(raw));checkpoint(g);return g;}
export function q177Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ177Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q177');return g;}
export function q177AcceptedEngine(){const g=new GameEngine(acceptedQ177Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q177'));const p=acceptedQ177.locations.find(p=>p.role==='decision')??acceptedQ177.locations[0];go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});g.run(acceptedQ177.model.entryScript??'q177.visit');drain(g);return g;}
export async function truthMirrorArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set(),variant=legacy?'previous':'current';
  for(const route of q177Routes){const g=q177Engine({legacy}),observe=()=>{
   const scene=g.state.stories.q177.scene;if(g.state.quests.q177.stage==='completed'||seen.has(scene))return;seen.add(scene);
   const save=g.save(),now=upgradeQ177(save),cast=q177Cast(scene);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q177',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:{entry:'visit',onsite:'compare',proof:'window',notice:'finish',correct:'finish',close:'notice',closed:'finish',consent:'return',window:'finish'}[scene]});
  };observe();for(const id of route.path){choose(g,'q177',id);observe();}assert.equal(g.state.quests.q177.outcome,route.outcome);outcomes.add('e2/q177/'+route.outcome);}
  assert.equal(seen.size,9);
 }
 const seen=new Set();
 for(const route of q177AcceptedRoutes){const old=q177AcceptedEngine(),observe=()=>{
  if(old.state.quests.q177.stage==='completed')return;const scene=old.state.flags.quest.q177.node;if(seen.has(scene))return;seen.add(scene);const now=upgradeQ177(old.save());assert.equal(now.state.stories.q177,undefined);assert.equal(projectGame(now).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q177',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:now.save(),expectedText:projectGame(old).dialog.text,availableChoice:scene==='entry'?'compare':'window'});
 };observe();for(const id of route.path){assert.ok(old.dispatch({type:'choose',id}));drain(old);observe();}assert.equal(old.state.quests.q177.outcome,route.outcome);}
 assert.equal(seen.size,2);return{fixtures,outcomes:[...outcomes]};
}
