import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/royal-helpers.mjs';
import {read,resolveBattle} from './audit-regional-relocation.mjs';
export const previousQ187=await read('tests/fixtures/e2-q187-before-cast.json');
export const previousQ187Data={...data,quests:{...data.quests,q187:previousQ187},scripts:{...data.scripts,...previousQ187.scripts}};
const endings=[{path:['army','finish'],outcome:'army'},{path:['village','sign','finish'],outcome:'village'},{path:['leave','finish'],outcome:'leave'}];
export const q187Routes=[
 {path:['fight','battle','continue'],battles:['win']},
 {path:['evac','contract']},
 {path:['fight','battle','escaped'],battles:['escape']},
 {path:['fight','battle','battle','continue'],battles:['lose','win']},
 {path:['fight','battle','back','evac','contract'],battles:['lose']},
 {path:['fight','back','evac','contract']}
].flatMap(route=>endings.map(end=>({...route,path:[...route.path,...end.path],outcome:end.outcome})));
export const q187People={entry:['kado'],contract:['kado','mayor'],defend:['kado'],evacuated:['kado','residents'],army:['kado','officerPerson'],bridge:['kado'],village_done:['kado','mayor'],left:['kado'],defend_battle_ready:['kado']};
export const q187Cast=scene=>(q187People[scene]??[]).map(id=>'q187_'+id);
export function loadQ187(raw){const g=new GameEngine(data);g.load(raw);assert.equal(g.save(),raw);checkpoint(g);return g;}
export function q187Engine(){const g=ready();g.random=()=>.999999;start(g,'q187');return g;}
export function resolveQ187(g,result,{observe=()=>{}}={}){
 delete g.random;resolveBattle(g,result);observe(g);checkpoint(g);g.random=()=>.999999;
 if(result==='lose'){assert.equal(g.state.townLocation,'oddland_village');assert.equal(g.state.stories.q187.values.kadoAt,'gate');go(g,data.quests.q187.story.worldPlaces.gate);assert.ok(g.dispatch({type:'story.resume',quest:'q187'}));drain(g);observe(g);checkpoint(g);}
}
export function chooseQ187(g,id,{result='win'}={}){choose(g,'q187',id,{combat:'pending'});if(g.state.battle)resolveQ187(g,result);}
export async function flaglessSoldierArtFixtures(){
 const fixtures=[],outcomes=new Set(),seen=new Set();
 for(const route of q187Routes){const g=q187Engine();let battles=0;const observe=()=>{
  const story=g.state.stories.q187,scene=story.scene;if(g.state.quests.q187.stage==='completed')return;
  const result=g.state.flags.relocatedBattleResult?.q187??'unfought',variant=(story.values.residentsAt==='refuge'?'evacuated-':'waiting-')+result,key=scene+'/'+variant;if(seen.has(key))return;seen.add(key);
  const save=g.save(),cast=q187Cast(scene),now=loadQ187(save);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);
  fixtures.push({edition:'e2',quest:'q187',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,
   availableChoice:{entry:'evac',contract:'village',defend:result==='escape'?'escaped':'battle',evacuated:'contract',army:'finish',bridge:'sign',village_done:'finish',left:'finish',defend_battle_ready:'continue'}[scene],
   ...(scene==='defend'?{blockedChoices:result==='escape'?['battle','back']:['escaped']}:{})});
  };observe();for(const id of route.path){chooseQ187(g,id,{result:id==='battle'?(route.battles?.[battles++]??'win'):'win'});observe();}assert.equal(g.state.quests.q187.outcome,route.outcome);outcomes.add('e2/q187/'+route.outcome);
 }
 return{fixtures,outcomes:[...outcomes]};
}
