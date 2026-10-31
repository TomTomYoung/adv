import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/pilgrimage-helpers.mjs';
export const previousQ139=await read('tests/fixtures/e2-q139-before-cast.json');
export const previousQ139Data={...data,quests:{...data.quests,q139:previousQ139},scripts:{...data.scripts,...previousQ139.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q139_')))};
export const acceptedQ139=data.previousQuestRoutes.q139;
export const acceptedQ139Data={...previousQ139Data,quests:{...previousQ139Data.quests,q139:acceptedQ139},scripts:{...previousQ139Data.scripts,...acceptedQ139.scripts}};
export const q139Routes=[
 {path:['many','escort','finish'],outcome:'many'},
 {path:['measure','other','many','escort','finish'],outcome:'many'},
 {path:['measure','other','wounded','finish'],outcome:'wounded'},
 {path:['measure','other','air','ventilate','tools','continue','next','escort','finish'],outcome:'both',rope:2},
 {path:['measure','other','air','ventilate','help','return','next','escort','finish'],outcome:'both',help:true}
];
export const q139AcceptedRoutes=[{path:['many'],outcome:'many'},{path:['measure','many'],outcome:'many'},{path:['measure','wounded'],outcome:'wounded'},{path:['measure','air','tools'],outcome:'both',rope:2},{path:['measure','air','help'],outcome:'both'}];
export function q139Cast(scene,help=false){return ({entry:['sena','geologist'],rooms:['injured'],many_ready:['crowd'],many_home:['crowd'],wounded_home:['injured'],request_help:['helpers'],collect_injured:['injured'],collect_crowd:['injured','crowd'],collect_injured_help:['injured','helpers'],collect_crowd_help:['injured','crowd','helpers'],both_home:['injured','crowd',...(help?['helpers']:[])]}[scene]??[]).map(id=>'q139_'+id);}
export function upgradedQ139Save(raw){const save=JSON.parse(raw),s=save.state.stories.q139;s.revision=2;s.values.senaAt='entry';s.values.geologistAt='entry';return save;}
export function q139Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ139Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q139');return g;}
export function q139AcceptedEngine({accepted=true,entered=true,started=true}={}){
 const g=new GameEngine(acceptedQ139Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'pilgrim_board'});if(accepted)assert.ok(g.accept('q139'));
 if(entered){const p=acceptedQ139.locations.find(p=>p.role==='decision');go(g,{kind:'dungeon',dungeon:p.dungeon??'region_4',map:p.map,x:p.x,y:p.y});}if(started)g.run(acceptedQ139.model.entryScript??'q139.visit');return g;
}
export function q139AcceptedChoose(g,id){assert.ok(g.dispatch({type:'choose',id}));drain(g);}
export async function rescueArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});for(const id of Object.keys(data.characters).filter(id=>id.startsWith('q139_')))assert.equal(first.characters[id],undefined);assert.deepEqual(first.quests.q139,await read('data/quests/q139.json'));
 const fixtures=[],outcomes=new Set(),choices={entry:'measure',rooms:'wounded',air:'help',listen:'other',many_ready:'escort',many_home:'finish',wounded_home:'finish',drain:'ventilate',request_help:'return',collect_injured:'next',collect_crowd:'escort',collect_injured_help:'next',collect_crowd_help:'escort',both_home:'finish',air_tools_ready:'continue'};
 for(const legacy of [false,true]){
  const seen=new Set(),capture=g=>{
   const s=g.state.stories.q139,scene=s.scene,help=s.events.includes('collect_crowd_help_escort'),suffix=scene==='both_home'?(help?'-help':'-tools'):'',key=scene+suffix;if(seen.has(key))return;seen.add(key);
   const raw=g.save(),current=new GameEngine(data);current.load(raw);if(legacy)assert.deepEqual(JSON.parse(current.save()),upgradedQ139Save(raw));else assert.equal(current.save(),raw);checkpoint(current);
   const cast=q139Cast(scene,help);assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),cast);
   const faces=scene==='entry'?{q139_sena:[.48,.07,.54,.105],q139_geologist:[.46,.075,.52,.11]}:{};
   fixtures.push({edition:'e2',quest:'q139',scene,variant:(legacy?'migrated':'current')+suffix,cast,textOnlyCast:cast.filter(id=>!['q139_sena','q139_geologist'].includes(id)),save:current.save(),...(scene==='entry'?{faces,clearOfHud:true}:{}),availableChoice:choices[scene],expectedText:previousQ139.model.graph.find(n=>n.id===scene).text});
  };
  for(const route of q139Routes){const g=q139Engine({legacy});capture(g);for(const action of route.path){choose(g,'q139',action);if(g.state.quests.q139.stage!=='completed')capture(g);}assert.equal(g.state.quests.q139.outcome,route.outcome);outcomes.add('e2/q139/'+route.outcome);}
  assert.equal(seen.size,16);
 }
 const seen=new Set(),capture=g=>{
  const scene=g.state.flags.quest.q139.node;if(seen.has(scene))return;seen.add(scene);
  const current=new GameEngine(data);current.load(g.save());checkpoint(current);assert.equal(current.state.flags.legacyStoryRoutes.q139,true);assert.equal(current.state.stories.q139,undefined);assert.equal(projectGame(current).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q139',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:current.save(),availableChoice:choices[scene],expectedText:acceptedQ139.model.graph.find(n=>n.id===scene).text});
 };
 for(const route of q139AcceptedRoutes){const g=q139AcceptedEngine();drain(g);capture(g);for(const action of route.path){q139AcceptedChoose(g,action);if(g.state.quests.q139.stage!=='completed')capture(g);}assert.equal(g.state.quests.q139.outcome,route.outcome);}
 assert.equal(seen.size,3);return {fixtures,outcomes:[...outcomes]};
}
