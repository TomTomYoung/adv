import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain,read} from '../tests/library-helpers.mjs';
export const previousQ050=await read('tests/fixtures/e2-q050-before-cast.json');
export const previousQ050Data={...data,quests:{...data.quests,q050:previousQ050},scripts:{...data.scripts,...previousQ050.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q050_')))};
const accepted=data.previousQuestRoutes.q050;
const acceptedData={...previousQ050Data,quests:{...previousQ050Data.quests,q050:accepted},scripts:{...previousQ050Data.scripts,...accepted.scripts}};
export const q050Routes=[{path:['stop'],outcome:'contract'},{path:['follow','extension','publish','carry','post','finish'],outcome:'informed'}];
const cycle=['address','request','cancel','carry','copy'];
for(const prefix of [['copy','carry','copy'],['follow','copy','carry','copy'],['follow','extension','cancel','carry','copy']])for(const repeats of [0,1,2])for(const ending of ['close','extend']){
 const path=[...prefix,...Array.from({length:repeats},()=>cycle).flat(),...(ending==='close'?['close','finish']:['address','request','publish','carry','post','finish'])];
 q050Routes.push({path,outcome:ending==='close'?'compromise':'informed'});
}
export const q050AcceptedRoutes=[{path:['stop'],outcome:'contract'},{path:['follow','extension','publish'],outcome:'informed'}];
for(const prefix of [['copy'],['follow','copy'],['follow','extension','cancel']])for(const repeats of [0,1,2])for(const ending of ['close','extend'])q050AcceptedRoutes.push({path:[...prefix,...Array.from({length:repeats},()=>['address','cancel']).flat(),...(ending==='close'?['close']:['address','publish'])],outcome:ending==='close'?'compromise':'informed'});
export const q050LibrarianPlace=events=>events.some(e=>['warehouse_extension','return_extended_request'].includes(e))?'requests':'entry';
export const q050Cast=scene=>({entry:['q050_librarian'],requests:['q050_reader','q050_librarian'],copies:['q050_copyCrew']}[scene]??[]);
export function loadQ050(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);const expected=JSON.parse(raw),s=expected.state.stories.q050;
 if(!s)(expected.state.flags.legacyStoryRoutes??={}).q050=true;
 else if(s.revision===1){s.revision=2;Object.assign(s.values,{librarianAt:q050LibrarianPlace(s.events),readerAt:'requests',copyCrewAt:'copies'});}
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
export function q050Engine({legacy=false}={}){const base=ready();base.state.vars.region_5=3;const g=legacy?new GameEngine(previousQ050Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q050');return g;}
export function q050AcceptedEngine(){const base=ready();base.state.vars.region_5=3;const g=new GameEngine(acceptedData);g.load(base.save());g.random=()=>.999999;go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q050'));const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_5',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q050.visit');drain(g);return g;}
export const chooseQ050=(g,id)=>choose(g,'q050',id);
export async function finalChapterArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){const seen=new Set();for(const route of q050Routes){const g=q050Engine({legacy}),observe=()=>{
  if(g.state.quests.q050.stage==='completed')return;const s=g.state.stories.q050,v=s.values,scene=s.scene;
  const variant=(legacy?'previous':'current')+'-'+v.firstBoxAt+'-'+Number(v.copied)+'-'+q050LibrarianPlace(s.events)+'-'+Number((s.knowledge.party??[]).includes('truth')),key=scene+'/'+variant;
  if(seen.has(key))return;seen.add(key);const save=g.save(),now=loadQ050(save),cast=q050Cast(scene);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
  fixtures.push({edition:'e2',quest:'q050',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:{entry:'follow',warehouse:'extension',requests:'publish',copies:'close',prepare_copies:'carry',fetch_box:'copy',closed:'finish',select:'carry',return_extended:'request',delivered:'post',posted:'finish'}[scene]});
 };observe();for(const id of route.path){chooseQ050(g,id);observe();}assert.equal(g.state.quests.q050.outcome,route.outcome);outcomes.add('e2/q050/'+route.outcome);}}
 const seen=new Set();for(const route of q050AcceptedRoutes){const g=loadQ050(q050AcceptedEngine().save()),observe=()=>{
  if(g.state.quests.q050.stage==='completed')return;const scene=g.state.flags.flow.q050.node;if(seen.has(scene))return;seen.add(scene);assert.equal(projectGame(loadQ050(g.save())).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q050',scene,variant:'accepted',cast:[],absentStoryScene:true,save:g.save(),expectedText:projectGame(g).dialog.text,availableChoice:{entry:'follow',warehouse:'extension',requests:'publish',copies:'close'}[scene]});
 };observe();for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q050.outcome,route.outcome);}
 return{fixtures,outcomes:[...outcomes]};
}
