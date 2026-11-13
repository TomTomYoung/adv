import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain,read} from '../tests/library-helpers.mjs';

export const previousQ049=await read('tests/fixtures/e2-q049-before-cast.json');
export const previousQ049Data={...data,quests:{...data.quests,q049:previousQ049},scripts:{...data.scripts,...previousQ049.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>id!=='q049_luu'))};
const accepted=data.previousQuestRoutes.q049;
const acceptedData={...previousQ049Data,quests:{...previousQ049Data.quests,q049:accepted},scripts:{...previousQ049Data.scripts,...accepted.scripts}};
export const q049Routes=[
 {path:['burn'],accepted:['burn'],outcome:'contract'},
 {path:['remove','split','return','finish'],accepted:['remove','split','return'],outcome:'informed'},
 {path:['map','return','finish'],accepted:['map'],outcome:'compromise'},
 {path:['remove','leave','return','finish'],accepted:['remove','leave'],outcome:'compromise'},
 {path:['remove','split','undo','return','finish'],accepted:['remove','split','undo'],outcome:'compromise'}
];
export const q049AcceptedRoutes=q049Routes.map(r=>({path:r.accepted,outcome:r.outcome}));
export function loadQ049(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);const expected=JSON.parse(raw);
 if(!expected.state.stories.q049)(expected.state.flags.legacyStoryRoutes??={}).q049=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
export function q049Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ049Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q049');return g;}
export function q049AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q049'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_5',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q049.visit');drain(g);return g;
}
export const chooseQ049=(g,id)=>choose(g,'q049',id);
export const q049Origin=s=>s.events.includes('test_undo')?'separated':s.events.includes('scope_leave')?'revealed':'direct';
export async function bookmarkArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set();
  for(const route of q049Routes){
   const g=q049Engine({legacy}),observe=()=>{
    if(g.state.quests.q049.stage==='completed')return;
    const s=g.state.stories.q049,scene=s.scene,origin=['map','returned'].includes(scene)?q049Origin(s):'shared',variant=(legacy?'previous':'current')+'-'+origin;
    if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
    const save=g.save(),now=loadQ049(save),cast=['q049_luu'];assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
    fixtures.push({edition:'e2',quest:'q049',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:{entry:'remove',scope:'split',test:'return',map:'return',returned:'finish',reported:'finish'}[scene]});
   };
   observe();for(const id of route.path){chooseQ049(g,id);observe();}assert.equal(g.state.quests.q049.outcome,route.outcome);outcomes.add('e2/q049/'+route.outcome);
  }
 }
 const seen=new Set();
 for(const route of q049AcceptedRoutes){
  const g=loadQ049(q049AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q049.stage==='completed')return;
   const scene=g.state.flags.flow.q049.node;if(seen.has(scene))return;seen.add(scene);assert.equal(projectGame(loadQ049(g.save())).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q049',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:{entry:'remove',scope:'split',test:'return'}[scene]});
  };
  observe();for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q049.outcome,route.outcome);
 }
 return{fixtures,outcomes:[...outcomes]};
}
