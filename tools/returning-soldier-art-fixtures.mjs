import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/royal-helpers.mjs';
import {read} from './audit-regional-relocation.mjs';
export const previousQ188=await read('tests/fixtures/e2-q188-before-cast.json');
export const previousQ188Data={...data,quests:{...data.quests,q188:previousQ188},scripts:{...data.scripts,...previousQ188.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q188_')))};
const accepted=data.previousQuestRoutes.q188,acceptedData={...previousQ188Data,quests:{...previousQ188Data.quests,q188:accepted},scripts:{...previousQ188Data.scripts,...accepted.scripts}};
export const q188Routes=[
 {path:['escort','arrived'],outcome:'arrived'},
 ...['old','share'].map(outcome=>({path:['escort','talk','next','talk',outcome,'gather','finish'],outcome})),
 {path:['escort','talk','next','talk','apart','finish'],outcome:'apart'}
];
export const q188AcceptedRoutes=[{path:['arrived'],outcome:'arrived'},...['old','share','apart'].map(outcome=>({path:['talk',outcome],outcome}))];
export const q188People={entry:['soldier'],family:['soldier','wife','brother'],wife:['soldier','wife'],brother:['soldier','brother'],work:['soldier','brother'],invite_old:['soldier','wife','brother'],agreed_old:['soldier','wife','brother'],invite_share:['soldier','wife','brother'],agreed_share:['soldier','wife','brother'],apart:['soldier']};
export const q188Cast=scene=>(q188People[scene]??[]).map(id=>'q188_'+id);
export function loadQ188(raw){const g=new GameEngine(data);g.load(raw);const expected=JSON.parse(raw);if(!expected.state.stories.q188)(expected.state.flags.legacyStoryRoutes??={}).q188=true;assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;}
export function q188Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ188Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q188');return g;}
export function q188AcceptedEngine(){const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q188'));const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_9',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q188.visit');drain(g);return g;}
export const chooseQ188=(g,id)=>choose(g,'q188',id);
export async function returningSoldierArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){const seen=new Set();for(const route of q188Routes){const g=q188Engine({legacy}),observe=()=>{
  const scene=g.state.stories.q188.scene;if(g.state.quests.q188.stage==='completed'||seen.has(scene))return;seen.add(scene);
  const save=g.save(),now=loadQ188(save),cast=q188Cast(scene);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
  fixtures.push({edition:'e2',quest:'q188',scene,variant:legacy?'previous':'current',cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,
   availableChoice:{entry:'escort',family:'arrived',wife:'next',brother:'talk',work:'apart',invite_old:'gather',agreed_old:'finish',invite_share:'gather',agreed_share:'finish',apart:'finish'}[scene]});
 };observe();for(const id of route.path){chooseQ188(g,id);observe();}assert.equal(g.state.quests.q188.outcome,route.outcome);outcomes.add('e2/q188/'+route.outcome);}}
 const seen=new Set();for(const route of q188AcceptedRoutes){const g=loadQ188(q188AcceptedEngine().save()),observe=()=>{if(g.state.quests.q188.stage==='completed')return;const scene=g.state.flags.quest.q188.node;if(seen.has(scene))return;seen.add(scene);const now=loadQ188(g.save());assert.equal(projectGame(now).dialog.scene,undefined);fixtures.push({edition:'e2',quest:'q188',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:now.save(),expectedText:projectGame(g).dialog.text,availableChoice:scene==='work'?'apart':'arrived'});};observe();for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q188.outcome,route.outcome);}
 return{fixtures,outcomes:[...outcomes]};
}
