import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/royal-helpers.mjs';
import {read,resolveBattle} from './audit-regional-relocation.mjs';
export const previousQ185=await read('tests/fixtures/e2-q185-before-cast.json');
export const previousQ185Data={...data,quests:{...data.quests,q185:previousQ185},scripts:{...data.scripts,...previousQ185.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q185_')))};
const accepted=data.previousQuestRoutes.q185,acceptedData={...previousQ185Data,quests:{...previousQ185Data.quests,q185:accepted},scripts:{...previousQ185Data.scripts,...accepted.scripts}};
export const q185Routes=[
 {path:['hold','battle','escort','close','finish'],outcome:'families'},
 {path:['boat','pay','fetch','board','cross','close','finish'],outcome:'boat'},
 {path:['early','report','finish'],outcome:'early'},
 {path:['hold','early','report','finish'],outcome:'early'},
 {path:['boat','back','early','report','finish'],outcome:'early'},
 ...['escape','lose'].map(result=>({path:['hold','battle','early','report','finish'],outcome:'early',result}))
];
export const q185AcceptedRoutes=[{choice:'hold',result:'win',outcome:'families'},{choice:'hold',result:'escape',outcome:'early'},{choice:'hold',result:'lose',outcome:'early'},{choice:'boat',outcome:'boat'},{choice:'early',outcome:'early'}];
export const q185People=scene=>['nev','troops',...(['guard','won','crossed','fetch','board','landed'].includes(scene)?['families','unarmed']:[])];
export const q185Cast=scene=>q185People(scene).map(id=>'q185_'+id);
export function expectedQ185Save(raw){const s=JSON.parse(raw);if(!s.state.stories.q185)(s.state.flags.legacyStoryRoutes??={}).q185=true;return s;}
export function loadQ185(raw){const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),expectedQ185Save(raw));checkpoint(g);return g;}
export function q185Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ185Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q185');return g;}
export function q185AcceptedEngine(){const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'royal_board'});assert.ok(g.accept('q185'));const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_9',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q185.visit');drain(g);return g;}
export function resolveQ185(g,result,{observe=()=>{}}={}){
 delete g.random;resolveBattle(g,result);observe(g);checkpoint(g);g.random=()=>.999999;
 if(result==='lose'&&g.state.stories.q185){assert.equal(g.state.townLocation,'oddland_village');go(g,data.quests.q185.story.worldPlaces.near);assert.ok(g.dispatch({type:'story.resume',quest:'q185'}));drain(g);observe(g);checkpoint(g);}
}
export function chooseQ185(g,id,{result='win'}={}){choose(g,'q185',id,{combat:'pending'});if(g.state.battle)resolveQ185(g,result);}
export async function bridgeArtFixtures(){
 const fixtures=[],outcomes=new Set();
 const capture=(g,variant,{poor=false}={})=>{const save=g.save(),scene=g.state.stories.q185.scene,now=loadQ185(save),cast=q185Cast(scene),failed=['escape','lose'].includes(g.state.flags.relocatedBattleResult?.q185);
  assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
  fixtures.push({edition:'e2',quest:'q185',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:{entry:'hold',guard:failed?'early':'battle',won:'escort',crossed:'close',families_done:'finish',rent:poor?'back':'pay',rented:'fetch',fetch:'board',board:'cross',landed:'close',boat_done:'finish',early:'report',early_done:'finish'}[scene],...((scene==='guard'&&failed)||poor?{blockedChoice:poor?'pay':'battle'}:{})});
 };
 for(const legacy of [false,true]){const seen=new Set(),variant=legacy?'previous':'current';
  for(const route of q185Routes){const g=q185Engine({legacy}),observe=()=>{const scene=g.state.stories.q185.scene;if(g.state.quests.q185.stage==='completed'||seen.has(scene))return;seen.add(scene);capture(g,variant);};observe();for(const id of route.path){chooseQ185(g,id,{result:route.result});observe();}assert.equal(g.state.quests.q185.outcome,route.outcome);outcomes.add('e2/q185/'+route.outcome);}assert.equal(seen.size,13);
  for(const result of ['escape','lose']){const g=q185Engine({legacy});chooseQ185(g,'hold');chooseQ185(g,'battle',{result});capture(g,variant+'-'+result);}
  const poor=q185Engine({legacy});chooseQ185(poor,'boat');poor.state.gold=39;capture(poor,variant+'-insufficient-gold',{poor:true});
 }
 const old=q185AcceptedEngine(),now=loadQ185(old.save());assert.equal(now.state.stories.q185,undefined);assert.equal(projectGame(now).dialog.scene,undefined);fixtures.push({edition:'e2',quest:'q185',scene:'entry',variant:'accepted-legacy',cast:[],absentStoryScene:true,save:now.save(),expectedText:projectGame(old).dialog.text,availableChoice:'early'});
 return{fixtures,outcomes:[...outcomes]};
}
