import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/pilgrimage-helpers.mjs';
export const previousQ138=await read('tests/fixtures/e2-q138-before-cast.json');
export const previousQ138Data={...data,quests:{...data.quests,q138:previousQ138},scripts:{...data.scripts,...previousQ138.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q138_')))};
export const acceptedQ138=data.previousQuestRoutes.q138;
export const acceptedQ138Data={...previousQ138Data,quests:{...previousQ138Data.quests,q138:acceptedQ138},scripts:{...previousQ138Data.scripts,...acceptedQ138.scripts}};
export const q138Routes=['map','tracks'].flatMap(first=>[
 {path:[first,'together','finish'],outcome:'together',map:first==='map'},
 {path:[first,'talk','escort','finish'],outcome:'talk',map:first==='map'},
 {path:[first,'solo'],outcome:'solo',map:first==='map'},
 {path:[first,'correct','finish'],outcome:'correct',map:first==='map'}
]);
export const q138AcceptedRoutes=q138Routes.map(r=>({...r,path:r.path.filter(x=>!['finish','escort'].includes(x))}));
export const q138Cast=scene=>({pupil:['q138_ira'],explored:['q138_ira'],call:['q138_narl'],mediated:['q138_ira','q138_narl']}[scene]??[]);
export const q138NewMediated='二人が同じ休息所で話した。礼と抗議を別々に聞き、イラへ渡す訂正図を確かめた。';
export function q138Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ138Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q138');return g;}
export function q138AcceptedEngine({accepted=true,entered=true,started=true}={}){
 const g=new GameEngine(acceptedQ138Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'pilgrim_board'});if(accepted)assert.ok(g.accept('q138'));
 if(entered){const p=acceptedQ138.locations.find(p=>p.role==='decision');go(g,{kind:'dungeon',dungeon:p.dungeon??'region_4',map:p.map,x:p.x,y:p.y});}if(started)g.run(acceptedQ138.model.entryScript??'q138.visit');return g;
}
export function q138AcceptedChoose(g,id){assert.ok(g.dispatch({type:'choose',id}));drain(g);}
export async function explorerArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});for(const id of ['q138_ira','q138_narl'])assert.equal(first.characters[id],undefined);assert.deepEqual(first.quests.q138,await read('data/quests/q138.json'));
 const fixtures=[],outcomes=new Set(),choices={entry:'map',pupil:'together',explored:'finish',call:'escort',mediated:'finish',reported:'finish'};
 for(const legacy of [false,true]){
  const seen=new Set(),capture=g=>{
   const s=g.state.stories.q138,scene=s.scene,suffix=scene==='entry'?'':s.values.map?'-map':'-tracks',key=scene+suffix;if(seen.has(key))return;seen.add(key);
   const raw=g.save(),current=new GameEngine(data);current.load(raw);assert.equal(current.save(),raw,'q138 keeps every saved value and waiting line');checkpoint(current);assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),q138Cast(scene));
   const cast=q138Cast(scene),faces=Object.fromEntries(cast.map(id=>[id,id==='q138_ira'?[.51,.08,.56,.11]:[.47,.08,.54,.12]]));
   fixtures.push({edition:'e2',quest:'q138',scene,variant:(legacy?'legacy':'current')+suffix,cast,save:raw,...(cast.length?{faces,clearOfHud:true}:{}),availableChoice:choices[scene],expectedText:g.data.quests.q138.model.graph.find(n=>n.id===scene).text});
  };
  for(const route of q138Routes){const g=q138Engine({legacy});capture(g);for(const action of route.path){choose(g,'q138',action);if(g.state.quests.q138.stage!=='completed')capture(g);}assert.equal(g.state.quests.q138.outcome,route.outcome);outcomes.add('e2/q138/'+route.outcome);}
  assert.equal(seen.size,11);
 }
 const seen=new Set(),capture=g=>{
  const s=g.state.flags.quest.q138,scene=s.node,suffix=scene==='entry'?'':s.map?'-map':'-tracks',key=scene+suffix;if(seen.has(key))return;seen.add(key);
  const current=new GameEngine(data);current.load(g.save());checkpoint(current);assert.equal(current.state.flags.legacyStoryRoutes.q138,true);assert.equal(current.state.stories.q138,undefined);assert.equal(projectGame(current).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q138',scene,variant:'accepted-legacy'+suffix,cast:[],absentStoryScene:true,save:current.save(),availableChoice:choices[scene],expectedText:acceptedQ138.model.graph.find(n=>n.id===scene).text});
 };
 for(const route of q138AcceptedRoutes){const g=q138AcceptedEngine();drain(g);capture(g);for(const action of route.path){q138AcceptedChoose(g,action);if(g.state.quests.q138.stage!=='completed')capture(g);}assert.equal(g.state.quests.q138.outcome,route.outcome);outcomes.add('e2/q138/'+route.outcome);}
 assert.equal(seen.size,3);return {fixtures,outcomes:[...outcomes]};
}
