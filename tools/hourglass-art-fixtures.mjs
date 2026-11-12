import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain,read} from '../tests/library-helpers.mjs';
export const previousQ042=await read('tests/fixtures/e2-q042-before-cast.json');
export const previousQ042Data={...data,quests:{...data.quests,q042:previousQ042},scripts:{...data.scripts,...previousQ042.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q042_')))};
const accepted=data.previousQuestRoutes.q042,acceptedData={...previousQ042Data,quests:{...previousQ042Data.quests,q042:accepted},scripts:{...previousQ042Data.scripts,...accepted.scripts}};
export const q042Routes=[
 {path:['break'],outcome:'contract'},
 {path:['sample','hours','call','escort','finish'],outcome:'informed'},
 {path:['sample','two','agree','finish'],outcome:'compromise'},
 {path:['outside','tell','two','agree','finish'],outcome:'compromise'},
 {path:['outside','tell','sand','hours','call','escort','finish'],outcome:'informed'},
 {path:['outside','tell','sand','two','agree','finish'],outcome:'compromise'}
];
export const q042AcceptedRoutes=[{path:['break'],outcome:'contract'},{path:['sample','hours'],outcome:'informed'},{path:['sample','two'],outcome:'compromise'},{path:['outside','two'],outcome:'compromise'},{path:['outside','sand','hours'],outcome:'informed'},{path:['outside','sand','two'],outcome:'compromise'}];
export const q042People={entry:['craftsperson'],shift:['manager'],sand:['manager'],outside:[],record_clock:[],relief:['reliefCrew'],shifted:['reliefCrew','manager'],two_clock:[],agreed:['manager']};
export const q042Cast=(scene,events=[])=>((scene==='sand'&&!events.includes('shift_sand'))?[]:q042People[scene]??[]).map(id=>'q042_'+id);
export function loadQ042(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);const expected=JSON.parse(raw),s=expected.state.stories.q042;
 if(!s)(expected.state.flags.legacyStoryRoutes??={}).q042=true;
 else if(s.revision===1){s.revision=2;Object.assign(s.values,{craftspersonAt:'entry',managerAt:'entry'});}
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
export function q042Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ042Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q042');return g;}
export function q042AcceptedEngine(){const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q042'));const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_5',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q042.visit');drain(g);return g;}
export const chooseQ042=(g,id)=>choose(g,'q042',id);
export async function hourglassArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){const seen=new Set();for(const route of q042Routes){const g=q042Engine({legacy}),observe=()=>{
  const s=g.state.stories.q042,scene=s.scene;if(g.state.quests.q042.stage==='completed')return;
  const variant=(legacy?'previous':'current')+'-'+(s.events.includes('shift_sand')?'manager':s.values.outsideChecked?'clock':'direct');
  const key=scene+'/'+variant;if(seen.has(key))return;seen.add(key);
  const save=g.save(),now=loadQ042(save),cast=q042Cast(scene,s.events);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
  fixtures.push({edition:'e2',quest:'q042',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,
   availableChoice:{entry:'sample',shift:'sand',sand:'hours',outside:'tell',record_clock:'call',relief:'escort',shifted:'finish',two_clock:'agree',agreed:'finish'}[scene]});
 };observe();for(const id of route.path){chooseQ042(g,id);observe();}assert.equal(g.state.quests.q042.outcome,route.outcome);outcomes.add('e2/q042/'+route.outcome);}}
 const seen=new Set();for(const route of q042AcceptedRoutes){const g=loadQ042(q042AcceptedEngine().save()),observe=()=>{if(g.state.quests.q042.stage==='completed')return;const scene=g.state.flags.flow?.q042?.node??g.state.flags.quest?.q042?.node;if(seen.has(scene))return;seen.add(scene);const now=loadQ042(g.save());assert.equal(projectGame(now).dialog.scene,undefined);fixtures.push({edition:'e2',quest:'q042',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:now.save(),expectedText:projectGame(g).dialog.text,availableChoice:{entry:'sample',shift:'sand',sand:'hours'}[scene]});};observe();for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);observe();}assert.equal(g.state.quests.q042.outcome,route.outcome);}
 return{fixtures,outcomes:[...outcomes]};
}
