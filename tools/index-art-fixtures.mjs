import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain,read} from '../tests/library-helpers.mjs';

export const previousQ046=await read('tests/fixtures/e2-q046-before-cast.json');
export const previousQ046Data={...data,quests:{...data.quests,q046:previousQ046},scripts:{...data.scripts,...previousQ046.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>id!=='q046_reader'))};
const accepted=data.previousQuestRoutes.q046;
const acceptedData={...previousQ046Data,quests:{...previousQ046Data.quests,q046:accepted},scripts:{...previousQ046Data.scripts,...accepted.scripts}};
// The loop is repeatable. Exercise zero, one and two circuits before each exit.
export const q046Routes=[{path:['straight'],outcome:'contract'}];
for(const loops of [0,1,2]){
 const prefix=['index',...Array.from({length:loops},()=>['river','ferry','loop']).flat()];
 for(const tail of [['exit','finish'],['river','exit','finish'],['river','ferry','exit','finish'],['river','ferry','link']])q046Routes.push({path:[...prefix,...tail],outcome:tail.at(-1)==='link'?'informed':'compromise'});
}
export const q046AcceptedRoutes=q046Routes.map(r=>({...r,path:r.path.filter(id=>id!=='finish')}));
export function loadQ046(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);const expected=JSON.parse(raw);
 if(!expected.state.stories.q046)(expected.state.flags.legacyStoryRoutes??={}).q046=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
export function q046Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ046Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q046');return g;}
export function q046AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q046'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_5',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q046.visit');drain(g);return g;
}
export const chooseQ046=(g,id)=>choose(g,'q046',id);
export async function indexArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set();
  for(const route of q046Routes){
   const g=q046Engine({legacy}),observe=()=>{
    if(g.state.quests.q046.stage==='completed')return;
    const s=g.state.stories.q046,scene=s.scene,v=s.values;
    const origin=scene==='guided'?['rain','river','ferry'].find(p=>v[p+'Exit']):scene;
    const variant=(legacy?'previous':'current')+'-'+origin+'-'+(v.looped?'looped':'first');if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
    const save=g.save(),now=loadQ046(save),cast=['q046_reader'];assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
    fixtures.push({edition:'e2',quest:'q046',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:{entry:'index',rain:'river',river:'ferry',ferry:'link',guided:'finish'}[scene]});
   };
   observe();for(const id of route.path){chooseQ046(g,id);observe();}assert.equal(g.state.quests.q046.outcome,route.outcome);outcomes.add('e2/q046/'+route.outcome);
  }
 }
 const seen=new Set();
 for(const route of q046AcceptedRoutes){
  const g=loadQ046(q046AcceptedEngine().save()),path=[],observe=()=>{
   if(g.state.quests.q046.stage==='completed')return;
   const scene=g.state.flags.flow.q046.node,variant='accepted-'+(path.includes('loop')?'looped':'first');if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   assert.equal(projectGame(loadQ046(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q046',scene,variant,cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:{entry:'index',rain:'river',river:'ferry',ferry:'link'}[scene]});
  };
  observe();for(const id of route.path){path.push(id);assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q046.outcome,route.outcome);
 }
 return{fixtures,outcomes:[...outcomes]};
}
