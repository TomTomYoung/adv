import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {resolveBattle} from './audit-regional-relocation.mjs';
import {data,ready,start,choose,go,drain,checkpoint} from '../tests/royal-helpers.mjs';
import {read} from '../tests/oddland-helpers.mjs';
export const previousQ090=await read('tests/fixtures/e2-q090-before-cast.json');
export const previousQ090Data={...data,quests:{...data.quests,q090:previousQ090},scripts:{...data.scripts,...previousQ090.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q090_')))};
const accepted=data.previousQuestRoutes.q090;
const acceptedData={...previousQ090Data,quests:{...previousQ090Data.quests,q090:accepted},scripts:{...previousQ090Data.scripts,...accepted.scripts}};
export const q090Routes=[
 {path:['battery','hour','start','escort','close','finish'],accepted:['battery','hour','close'],outcome:'informed'},
 {path:['battery','hour','start','escort','longer','return','finish'],accepted:['battery','hour','longer'],outcome:'overrun'},
 {path:['battery','trip','escort','finish'],accepted:['battery','trip'],outcome:'compromise'},
 {path:['full'],accepted:['full'],outcome:'contract'},
 {path:['surface','escort','finish'],accepted:['surface'],outcome:'compromise'}
];
export const q090Cast=scene=>['entry','schedule','reserve'].includes(scene)?['q090_mao']:scene==='overrun'?['q090_mao','q090_visitors','q090_maintenance']:['q090_mao','q090_visitors'];
export const q090LegacyScene=g=>g.state.flags.flow?.q090?.node??g.state.flags.quest?.q090?.node;
export function loadQ090(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);
 const expected=JSON.parse(raw);if(!expected.state.stories.q090)(expected.state.flags.legacyStoryRoutes??={}).q090=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
let unlocked;
export function q090Ready(){
 if(!unlocked){const g=ready();assert.equal(g.state.vars.region_9??0,0);
  for(const [id,key] of [['q081','destroy'],['q085','north'],['q087','break']]){start(g,id);choose(g,id,key);assert.equal(g.state.quests[id].stage,'completed');}
  assert.equal(g.state.vars.region_9,3);checkpoint(g);unlocked=g.save();
 }
 const g=new GameEngine(data);g.random=()=>.999999;g.load(unlocked);return g;
}
const starts=new Map();
export function q090Engine({legacy=false}={}){
 const content=legacy?previousQ090Data:data;
 if(!starts.has(legacy)){const g=new GameEngine(content);g.load(q090Ready().save());g.random=()=>.999999;start(g,'q090');starts.set(legacy,g.save());}
 const g=new GameEngine(content);g.random=()=>.999999;g.load(starts.get(legacy));return g;
}
let acceptedStart;
export function q090AcceptedEngine(){
 if(!acceptedStart){const g=new GameEngine(acceptedData);g.load(q090Ready().save());g.random=()=>.999999;
  go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q090'));
  const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
  go(g,{kind:'dungeon',dungeon:'region_9',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript);drain(g);acceptedStart=g.save();
 }
 const g=new GameEngine(acceptedData);g.random=()=>.999999;g.load(acceptedStart);return g;
}
export function arriveQ090(g){const a=g.data.quests.q090.story.actions[g.state.journey.action];go(g,g.data.quests.q090.story.worldPlaces[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);}
export function resolveQ090(g,result){g.random=()=>.5;resolveBattle(g,result);g.random=()=>.999999;checkpoint(g);}
export function chooseQ090(g,id,{combat='win'}={}){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);if(g.state.battle){if(combat==='pending')return;resolveQ090(g,combat);}if(g.state.journey)arriveQ090(g);checkpoint(g);}
export function departQ090(g,id){assert.ok(g.dispatch({type:'choose',id}),g.state.notice);drain(g);assert.ok(g.state.journey);loadQ090(g.save());}
export function returnQ090AfterLoss(g){go(g,g.data.quests.q090.story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:'q090'}));drain(g);checkpoint(g);}
export function q090Paths(graph){const nodes=new Map(graph.map(n=>[n.id,n])),rows=[];const visit=(id,path,seen)=>{assert.ok(!seen.has(id),'acyclic graph');const next=new Set([...seen,id]);for(const o of nodes.get(id).options){const p=[...path,o.id];if(o.to.startsWith('@'))rows.push({path:p,outcome:o.to.slice(1)});else visit(o.to,p,next);}};visit('entry',[],new Set());return rows;}
export async function skyReturnArtFixtures(){
 const fixtures=[],outcomes=new Set(),available={entry:'battery',schedule:'hour',reserve:'start',opened:'escort',open:'close',close:'finish',exhausted:'return',overrun:'finish',assemble:'escort',surface:'finish'};
 for(const legacy of [false,true]){
  const generation=legacy?'previous':'current',seen=new Set();
  const observe=(g,suffix)=>{if(g.state.quests.q090.stage==='completed')return;const s=g.state.stories.q090,v=s.values,scene=s.scene,variant=generation+'-'+(suffix??[v.maoAt,v.visitorsAt,v.lidOpen?'open':'shut',v.backup?'backup':'normal',v.exhausted?'exhausted':'ready'].join('-'));
   if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);const save=g.save(),cast=q090Cast(scene);assert.deepEqual(projectGame(loadQ090(save)).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q090',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:available[scene]});};
  for(const route of q090Routes){const g=q090Engine({legacy});observe(g);for(const id of route.path){chooseQ090(g,id);observe(g);}assert.equal(g.state.quests.q090.outcome,route.outcome);outcomes.add('e2/q090/'+route.outcome);}
  for(const [prefix,id,suffix] of [[[],'battery','battery'],[['battery','hour','start'],'escort','observation'],[['battery','hour','start','escort'],'close','timed-return'],[['battery','hour','start','escort','longer'],'return','blackout-return'],[['surface'],'escort','surface']]){
   const g=q090Engine({legacy});for(const c of prefix)chooseQ090(g,c);departQ090(g,id);g.defeat();drain(g);arriveQ090(g);observe(g,'rescued-'+suffix);
  }
  const lost=q090Engine({legacy});chooseQ090(lost,'full',{combat:'pending'});resolveQ090(lost,'lose');returnQ090AfterLoss(lost);observe(lost,'battle-defeat');
 }
 const seen=new Set();for(const route of q090Routes){const g=loadQ090(q090AcceptedEngine().save()),observe=()=>{if(g.state.quests.q090.stage==='completed')return;const scene=q090LegacyScene(g);if(seen.has(scene))return;seen.add(scene);assert.equal(projectGame(g).dialog.scene,undefined);fixtures.push({edition:'e2',quest:'q090',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:{entry:'battery',schedule:'hour',open:'close'}[scene]});};observe();for(const id of route.accepted){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.battle)resolveQ090(g,'win');observe();}assert.equal(g.state.quests.q090.outcome,route.outcome);}
 return {fixtures,outcomes:[...outcomes]};
}
