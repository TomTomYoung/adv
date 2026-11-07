import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,read,ready,start,choose,checkpoint,go,drain} from '../tests/machine-helpers.mjs';
export const previousQ180=await read('tests/fixtures/e2-q180-before-cast.json');
export const previousQ180Data={...data,quests:{...data.quests,q180:previousQ180},scripts:{...data.scripts,...previousQ180.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q180_')))};
const accepted=data.previousQuestRoutes.q180;
const acceptedData={...previousQ180Data,quests:{...previousQ180Data.quests,q180:accepted},scripts:{...previousQ180Data.scripts,...accepted.scripts}};
export const q180Routes=[
 {path:['visit','scripts','original','finish'],outcome:'home'},
 {path:['visit','scripts','new','finish'],outcome:'new'},
 {path:['visit','seal','escort','store','finish'],outcome:'seal'},
 {path:['visit','scripts','seal','escort','store','finish'],outcome:'seal'},
 {path:['visit','ban','finish'],outcome:'ban'}
];
export const q180AcceptedRoutes=[{path:['scripts','original'],outcome:'home'},{path:['scripts','new'],outcome:'new'},{path:['seal'],outcome:'seal'},{path:['scripts','seal'],outcome:'seal'},{path:['ban'],outcome:'ban'}];
export const q180RevisedScenes=['ending','told_original','told_new','sealed_here','stored','banned'];
export const q180Cast=scene=>scene==='entry'?[]:['q180_mui',...(['ending','stored'].includes(scene)?[]:['q180_listeners'])];
export function expectedQ180Save(raw){const saved=JSON.parse(raw);if(!saved.state.stories.q180)(saved.state.flags.legacyStoryRoutes??={}).q180=true;return saved;}
export function loadQ180(raw){const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),expectedQ180Save(raw));checkpoint(g);return g;}
export function q180Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ180Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q180');return g;}
export function q180AcceptedEngine(){const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q180'));const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q180.visit');drain(g);return g;}
export async function lastTaleArtFixtures(){
 const fixtures=[],outcomes=new Set();
 const capture=(g,variant)=>{const save=g.save(),now=loadQ180(save),scene=g.state.stories.q180.scene,cast=q180Cast(scene);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);fixtures.push({edition:'e2',quest:'q180',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:{entry:'visit',onsite:'scripts',ending:'original',told_original:'finish',told_new:'finish',sealed_here:'escort',sealed_refuge:'store',stored:'finish',banned:'finish'}[scene]});};
 for(const legacy of [false,true]){
  const seen=new Set();for(const route of q180Routes){const g=q180Engine({legacy}),observe=()=>{const scene=g.state.stories.q180.scene;if(g.state.quests.q180.stage==='completed'||seen.has(scene))return;seen.add(scene);capture(g,legacy?'previous':'current');};observe();for(const id of route.path){choose(g,'q180',id);observe();}assert.equal(g.state.quests.q180.outcome,route.outcome);outcomes.add('e2/q180/'+route.outcome);}assert.equal(seen.size,9);
 }
 for(const [scene,path,id] of [['ending',['visit'],'scripts'],['told_original',['visit','scripts'],'original'],['told_new',['visit','scripts'],'new'],['sealed_here',['visit','scripts'],'seal'],['stored',['visit','seal','escort'],'store'],['banned',['visit'],'ban']]){
  const old=q180Engine({legacy:true});for(const c of path)choose(old,'q180',c);assert.ok(old.dispatch({type:'choose',id}));drain(old);assert.ok(old.state.journey);const now=loadQ180(old.save()),a=data.quests.q180.story.actions[now.state.journey.action];now.random=()=>.999999;go(now,data.quests.q180.story.worldPlaces[a.journey.to]);drain(now);assert.equal(now.state.stories.q180.scene,scene);assert.equal(projectGame(now).dialog.text,data.quests.q180.model.graph.find(n=>n.id===scene).text);capture(now,'previous-arrived');
 }
 const seen=new Set();for(const route of q180AcceptedRoutes){const old=q180AcceptedEngine(),observe=()=>{if(old.state.quests.q180.stage==='completed')return;const scene=old.state.flags.quest.q180.node;if(seen.has(scene))return;seen.add(scene);const now=loadQ180(old.save());assert.equal(now.state.stories.q180,undefined);assert.equal(projectGame(now).dialog.scene,undefined);fixtures.push({edition:'e2',quest:'q180',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:now.save(),expectedText:projectGame(old).dialog.text,availableChoice:{entry:'scripts',ending:'original'}[scene]});};observe();for(const id of route.path){assert.ok(old.dispatch({type:'choose',id}));drain(old);observe();}assert.equal(old.state.quests.q180.outcome,route.outcome);}assert.equal(seen.size,2);
 return{fixtures,outcomes:[...outcomes]};
}
