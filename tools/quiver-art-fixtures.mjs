import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/royal-helpers.mjs';
import {read} from './audit-regional-relocation.mjs';
export const previousQ181=await read('tests/fixtures/e2-q181-before-cast.json');
export const previousQ181Data={...data,quests:{...data.quests,q181:previousQ181},scripts:{...data.scripts,...previousQ181.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q181_')))};
const accepted=data.previousQuestRoutes.q181,acceptedData={...previousQ181Data,quests:{...previousQ181Data.quests,q181:accepted},scripts:{...previousQ181Data.scripts,...accepted.scripts}};
export const q181Routes=[{path:['ask','signal','meet','return','finish'],outcome:'meet'},{path:['front','rescue','return','finish'],outcome:'rescue'},{path:['withdraw','finish'],outcome:'withdraw'},{path:['ask','signal','withdraw','finish'],outcome:'withdraw'}];
export const q181AcceptedRoutes=[{path:['ask','meet'],outcome:'meet'},{path:['front'],outcome:'rescue'},{path:['withdraw'],outcome:'withdraw'},{path:['ask','withdraw'],outcome:'withdraw'}];
export const q181Fixed={postMercenariesAt:'mercenaries',frontMercenariesAt:'signal',counterpartAt:'meeting'};
export const q181Cast=scene=>['q181_envoy','q181_veteran',...(['entry','agreed','rescue_report','withdrawn'].includes(scene)?['q181_captain']:scene==='briefed'?['q181_post_mercenaries']:scene==='misfire'?['q181_front_mercenaries']:scene==='meeting'?['q181_counterpart']:[])];
export function expectedQ181Save(raw){const saved=JSON.parse(raw),s=saved.state.stories.q181;if(s){s.revision=2;Object.assign(s.values,q181Fixed);}else(saved.state.flags.legacyStoryRoutes??={}).q181=true;return saved;}
export function loadQ181(raw){const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),expectedQ181Save(raw));checkpoint(g);return g;}
export function q181Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ181Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q181');return g;}
export function q181AcceptedEngine(){const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q181'));const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_9',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q181.visit');drain(g);return g;}
export async function quiverArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){const seen=new Set();for(const route of q181Routes){const g=q181Engine({legacy}),observe=()=>{const scene=g.state.stories.q181.scene;if(g.state.quests.q181.stage==='completed'||seen.has(scene))return;seen.add(scene);const save=g.save(),now=loadQ181(save),cast=q181Cast(scene);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);fixtures.push({edition:'e2',quest:'q181',scene,variant:legacy?'previous':'current',cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:{entry:'ask',signal:'meet',briefed:'signal',meeting:'return',agreed:'finish',misfire:'rescue',rescued:'return',rescue_report:'finish',withdrawn:'finish'}[scene]});};observe();for(const id of route.path){choose(g,'q181',id);observe();}assert.equal(g.state.quests.q181.outcome,route.outcome);outcomes.add('e2/q181/'+route.outcome);}assert.equal(seen.size,9);}
 const seen=new Set();for(const route of q181AcceptedRoutes){const g=q181AcceptedEngine(),observe=()=>{if(g.state.quests.q181.stage==='completed')return;const scene=g.state.flags.quest.q181.node;if(seen.has(scene))return;seen.add(scene);const now=loadQ181(g.save());assert.equal(now.state.stories.q181,undefined);assert.equal(projectGame(now).dialog.scene,undefined);fixtures.push({edition:'e2',quest:'q181',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:now.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='entry'?'ask':'meet'});};observe();for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q181.outcome,route.outcome);}assert.equal(seen.size,2);
 return{fixtures,outcomes:[...outcomes]};
}
