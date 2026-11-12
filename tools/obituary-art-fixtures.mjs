import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain,read} from '../tests/library-helpers.mjs';

export const previousQ044=await read('tests/fixtures/e2-q044-before-cast.json');
export const previousQ044Data={...data,quests:{...data.quests,q044:previousQ044},scripts:{...data.scripts,...previousQ044.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>id!=='q044_subject'))};
const accepted=data.previousQuestRoutes.q044;
const acceptedData={...previousQ044Data,quests:{...previousQ044Data.quests,q044:accepted},scripts:{...previousQ044Data.scripts,...accepted.scripts}};
export const q044Routes=[
 {path:['destroy'],outcome:'contract'},
 {path:['warn','escape','finish'],outcome:'compromise'},
 {path:['warn','appeal','appeal','publish'],outcome:'informed'},
 {path:['office','publish'],outcome:'informed'},
 {path:['office','warn','market','escape','finish'],outcome:'compromise'},
 {path:['office','warn','market','appeal','appeal','publish'],outcome:'informed'},
 {path:['warn','appeal','appeal','warn','refuge','leave'],outcome:'compromise'},
 {path:['warn','appeal','appeal','warn','refuge','appeal','publish'],outcome:'informed'},
 {path:['office','warn','market','appeal','appeal','warn','refuge','appeal','warn','refuge','leave'],outcome:'compromise'}
];
export const q044AcceptedRoutes=[
 {path:['destroy'],outcome:'contract'},
 {path:['warn','escape'],outcome:'compromise'},
 {path:['warn','appeal','publish'],outcome:'informed'},
 {path:['office','publish'],outcome:'informed'},
 {path:['office','warn','escape'],outcome:'compromise'},
 {path:['office','warn','appeal','publish'],outcome:'informed'},
 {path:['warn','appeal','warn','escape'],outcome:'compromise'}
];
export const q044Cast=scene=>['safe','escaped','protected','safe_refuge'].includes(scene)?['q044_subject']:[];
export function loadQ044(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);const expected=JSON.parse(raw);
 if(!expected.state.stories.q044)(expected.state.flags.legacyStoryRoutes??={}).q044=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
export function q044Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ044Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q044');return g;}
export function q044AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q044'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_5',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q044.visit');drain(g);return g;
}
export const chooseQ044=(g,id)=>choose(g,'q044',id);
export async function obituaryArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set();
  for(const route of q044Routes){
   const g=q044Engine({legacy}),observe=()=>{
    if(g.state.quests.q044.stage==='completed')return;
    const s=g.state.stories.q044,scene=s.scene,v=s.values,known=(s.knowledge.party??[]).includes('truth');
    const variant=(legacy?'previous':'current')+'-'+v.subjectAt+'-'+(v.protected?'protected':'unprotected')+'-'+(v.appealed?'appealed':'unfiled')+'-'+(known?'known':'unknown');
    if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
    const save=g.save(),now=loadQ044(save),cast=q044Cast(scene);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
    fixtures.push({edition:'e2',quest:'q044',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,
     availableChoice:scene==='locate'?(v.subjectAt==='refuge'?'refuge':'market'):{entry:'warn',safe:'appeal',office:'publish',escaped:'finish',protected:'appeal',safe_refuge:'leave'}[scene],
     ...(scene==='locate'?{blockedChoice:v.subjectAt==='refuge'?'market':'refuge'}:{})});
   };
   observe();for(const id of route.path){chooseQ044(g,id);observe();}assert.equal(g.state.quests.q044.outcome,route.outcome);outcomes.add('e2/q044/'+route.outcome);
  }
 }
 const seen=new Set();
 for(const route of q044AcceptedRoutes){
  const g=loadQ044(q044AcceptedEngine().save()),observe=()=>{
   if(g.state.quests.q044.stage==='completed')return;
   const f=g.state.flags.flow.q044,scene=f.node,variant='accepted-legacy-'+(f.appealed?'appealed':'unfiled');if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
   const now=loadQ044(g.save());assert.equal(projectGame(now).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q044',scene,variant,cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:{entry:'warn',safe:'appeal',office:'publish'}[scene]});
  };
  observe();for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q044.outcome,route.outcome);
 }
 return{fixtures,outcomes:[...outcomes]};
}
