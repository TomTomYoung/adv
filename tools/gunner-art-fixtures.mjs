import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/royal-helpers.mjs';
import {read} from './audit-regional-relocation.mjs';
export const previousQ182=await read('tests/fixtures/e2-q182-before-cast.json');
export const previousQ182Data={...data,quests:{...data.quests,q182:previousQ182},scripts:{...data.scripts,...previousQ182.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q182_')))};
const accepted=data.previousQuestRoutes.q182,acceptedData={...previousQ182Data,quests:{...previousQ182Data.quests,q182:accepted},scripts:{...previousQ182Data.scripts,...accepted.scripts}};
const preparations=[[],['command'],['evac'],['command','evac'],['evac','command']];
export const q182Routes=preparations.flatMap(prep=>[
 ...['attack','hold'].map(outcome=>({path:['deploy',...prep.flatMap(id=>[id,'return']),outcome,...(outcome==='hold'?['finish']:[])],outcome})),
 ...(prep.length===2?[{path:['deploy',...prep.flatMap(id=>[id,'return']),'light','join','escort','finish'],outcome:'light'}]:[])
]);
export const q182AcceptedRoutes=preparations.flatMap(prep=>[
 ...['attack','hold'].map(outcome=>({path:[...prep,outcome],outcome})),
 ...(prep.length===2?[{path:[...prep,'light'],outcome:'light'}]:[])
]);
export const q182Cast=scene=>({entry:['q182_ol'],gun:['q182_ol'],lit:['q182_ol'],command_agreed:['q182_commander'],evac_agreed:['q182_evacuees'],evac_ready:['q182_evacuees'],safe:['q182_evacuees'],stored:[]})[scene];
export function expectedQ182Save(raw){
 const saved=JSON.parse(raw),s=saved.state.stories.q182;
 if(s){s.revision=2;s.values.commanderAt='command';s.values.olAt=saved.state.journey?.quest==='q182'&&saved.state.journey.action==='entry_deploy'?'transit':s.events.includes('entry_deploy')?'gun':'entry';}
 else(saved.state.flags.legacyStoryRoutes??={}).q182=true;
 return saved;
}
export function loadQ182(raw){const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),expectedQ182Save(raw));checkpoint(g);return g;}
export function q182Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ182Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q182');return g;}
export function q182AcceptedEngine(){const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q182'));const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_9',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q182.visit');drain(g);return g;}
export async function gunnerArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set();
  for(const route of q182Routes){
   const g=q182Engine({legacy}),observe=()=>{
    const s=g.state.stories.q182,scene=s.scene,key=scene==='gun'?`${scene}-${Number(s.values.command)}${Number(s.values.evac)}`:scene;
    if(g.state.quests.q182.stage==='completed'||seen.has(key))return;seen.add(key);
    const save=g.save(),now=loadQ182(save),cast=q182Cast(scene),variant=(legacy?'previous':'current')+(scene==='gun'?`-${Number(s.values.command)}${Number(s.values.evac)}`:'');
    assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
    fixtures.push({edition:'e2',quest:'q182',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:{entry:'deploy',gun:s.values.command&&s.values.evac?'light':'hold',command_agreed:'return',evac_agreed:'return',lit:'join',evac_ready:'escort',safe:'finish',stored:'finish'}[scene]});
   };
   observe();for(const id of route.path){choose(g,'q182',id);observe();}assert.equal(g.state.quests.q182.outcome,route.outcome);outcomes.add('e2/q182/'+route.outcome);
  }
  assert.equal(seen.size,11);
 }
 const seen=new Set();
 for(const route of q182AcceptedRoutes){
  const g=q182AcceptedEngine(),observe=()=>{
   if(g.state.quests.q182.stage==='completed')return;
   const flags=g.state.flags.quest.q182,key=`${Number(Boolean(flags.command))}${Number(Boolean(flags.evac))}`;if(seen.has(key))return;seen.add(key);
   const now=loadQ182(g.save());assert.equal(now.state.stories.q182,undefined);assert.equal(projectGame(now).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q182',scene:'entry',variant:'accepted-legacy-'+key,cast:[],absentStoryScene:true,save:now.save(),expectedText:projectGame(g).dialog.text,availableChoice:key==='11'?'light':'hold'});
  };
  observe();for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q182.outcome,route.outcome);
 }
 assert.equal(seen.size,4);return{fixtures,outcomes:[...outcomes]};
}
