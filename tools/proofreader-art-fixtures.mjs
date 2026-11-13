import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain,read} from '../tests/library-helpers.mjs';

export const previousQ048=await read('tests/fixtures/e2-q048-before-cast.json');
export const previousQ048Data={...data,quests:{...data.quests,q048:previousQ048},scripts:{...data.scripts,...previousQ048.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q048_')))};
const accepted=data.previousQuestRoutes.q048;
const acceptedData={...previousQ048Data,quests:{...previousQ048Data.quests,q048:accepted},scripts:{...previousQ048Data.scripts,...accepted.scripts}};
export const q048Routes=[{path:['break'],outcome:'contract'},{path:['team','escort','finish'],outcome:'compromise'}];
for(const prefix of [['correct'],['correct','again','next']]){
 q048Routes.push({path:[...prefix,'freeze','seal','finish'],outcome:'informed'});
 q048Routes.push({path:[...prefix,'team','escort','finish'],outcome:'compromise'});
 q048Routes.push({path:[...prefix,'freeze','continue','escort','finish'],outcome:'compromise'});
}
export const q048AcceptedRoutes=q048Routes.map(r=>({...r,path:r.path.filter(id=>!['next','escort','finish'].includes(id))}));
const people={entry:['proofreader','manuscriptClient'],morning:['manuscriptClient'],final:['manuscriptClient'],again:[],sealed:[],team:['team'],team_work:['team']};
export const q048Cast=scene=>(people[scene]??[]).map(id=>'q048_'+id);
export const q048ClientPlace=events=>events.includes('morning_freeze')?'contract':events.includes('entry_correct')?'morning':'entry';
export function loadQ048(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);const expected=JSON.parse(raw),s=expected.state.stories.q048;
 if(!s)(expected.state.flags.legacyStoryRoutes??={}).q048=true;
 else if(s.revision===1){s.revision=2;Object.assign(s.values,{proofreaderAt:'entry',manuscriptClientAt:q048ClientPlace(s.events)});}
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
export function q048Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ048Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q048');return g;}
export function q048AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q048'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_5',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q048.visit');drain(g);return g;
}
export const chooseQ048=(g,id)=>choose(g,'q048',id);
function origin(s){
 const source=s.events.includes('final_continue')?'office':s.events.includes('morning_team')?'morning':s.events.includes('entry_team')?'direct':'correction';
 return source+'-repeat'+Number(s.values.repeated);
}
export async function proofreaderArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set();
  for(const route of q048Routes){const g=q048Engine({legacy}),observe=()=>{
   if(g.state.quests.q048.stage==='completed')return;
   const s=g.state.stories.q048,scene=s.scene,variant=(legacy?'previous':'current')+'-'+origin(s),key=scene+'/'+variant;if(seen.has(key))return;seen.add(key);
   const save=g.save(),now=loadQ048(save),cast=q048Cast(scene);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q048',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:{entry:'correct',morning:'freeze',final:'seal',again:'next',sealed:'finish',team:'escort',team_work:'finish'}[scene]});
  };observe();for(const id of route.path){chooseQ048(g,id);observe();}assert.equal(g.state.quests.q048.outcome,route.outcome);outcomes.add('e2/q048/'+route.outcome);}
 }
 const seen=new Set();
 for(const route of q048AcceptedRoutes){const g=loadQ048(q048AcceptedEngine().save()),observe=()=>{
  if(g.state.quests.q048.stage==='completed')return;
  const s=g.state.flags.flow.q048,scene=s.node,variant='accepted-repeat'+Number(Boolean(s.repeated)),key=scene+'/'+variant;if(seen.has(key))return;seen.add(key);
  assert.equal(projectGame(loadQ048(g.save())).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q048',scene,variant,cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:{entry:'correct',morning:'freeze',final:'seal'}[scene]});
 };observe();for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q048.outcome,route.outcome);}
 return{fixtures,outcomes:[...outcomes]};
}
