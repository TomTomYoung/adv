import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain,read} from '../tests/library-helpers.mjs';

export const previousQ045=await read('tests/fixtures/e2-q045-before-cast.json');
export const previousQ045Data={...data,quests:{...data.quests,q045:previousQ045},scripts:{...data.scripts,...previousQ045.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>id!=='q045_heirs'))};
const accepted=data.previousQuestRoutes.q045;
const acceptedData={...previousQ045Data,quests:{...previousQ045Data.quests,q045:accepted},scripts:{...previousQ045Data.scripts,...accepted.scripts}};
export const q045Routes=[
 {path:['restore'],outcome:'contract'},
 {path:['witness','finish'],outcome:'compromise'},
 {path:['cool','hold','finish'],outcome:'compromise'},
 {path:['cool','gather','minutes'],outcome:'informed'},
 {path:['cool','gather','deposit','finish'],outcome:'compromise'}
];
export const q045AcceptedRoutes=q045Routes.map(r=>({...r,path:r.path.filter(id=>id!=='finish')}));
export function loadQ045(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);const expected=JSON.parse(raw);
 if(!expected.state.stories.q045)(expected.state.flags.legacyStoryRoutes??={}).q045=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
export function q045Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ045Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q045');return g;}
export function q045AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q045'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_5',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q045.visit');drain(g);return g;
}
export const chooseQ045=(g,id)=>choose(g,'q045',id);
export async function inheritanceArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set();
  for(const route of q045Routes){
   const g=q045Engine({legacy}),path=[],observe=()=>{
    if(g.state.quests.q045.stage==='completed')return;
    const s=g.state.stories.q045,scene=s.scene;
    const origin=scene==='deposited'?(path.includes('gather')?'after-conference':path.includes('cool')?'after-cooling':'direct'):scene;
    const variant=(legacy?'previous':'current')+'-'+origin;if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
    const save=g.save(),now=loadQ045(save),cast=['q045_heirs'];assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
    fixtures.push({edition:'e2',quest:'q045',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:{entry:'cool',draft:'gather',conference:'minutes',deposited:'finish'}[scene]});
   };
   observe();for(const id of route.path){path.push(id);chooseQ045(g,id);observe();}assert.equal(g.state.quests.q045.outcome,route.outcome);outcomes.add('e2/q045/'+route.outcome);
  }
 }
 const seen=new Set();
 for(const route of q045AcceptedRoutes){
  const g=loadQ045(q045AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q045.stage==='completed')return;
   const scene=g.state.flags.flow.q045.node;if(seen.has(scene))return;seen.add(scene);
   assert.equal(projectGame(loadQ045(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q045',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:{entry:'cool',draft:'gather',conference:'minutes'}[scene]});
  };
  observe();for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q045.outcome,route.outcome);
 }
 return{fixtures,outcomes:[...outcomes]};
}
