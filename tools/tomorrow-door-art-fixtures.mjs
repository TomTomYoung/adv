import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,read,ready,start,choose,checkpoint,go,drain} from '../tests/machine-helpers.mjs';
export const previousQ178=await read('tests/fixtures/e2-q178-before-cast.json');
export const previousQ178Data={...data,quests:{...data.quests,q178:previousQ178},scripts:{...data.scripts,...previousQ178.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q178_')))};
export const acceptedQ178=data.previousQuestRoutes.q178;
export const acceptedQ178Data={...previousQ178Data,quests:{...previousQ178Data.quests,q178:acceptedQ178},scripts:{...previousQ178Data.scripts,...acceptedQ178.scripts}};
export const q178Routes=[{path:['close','finish'],outcome:'close'},{path:['test','close','finish'],outcome:'close'},{path:['test','wait','morning','finish'],outcome:'wait'},{path:['test','daughter','morning','finish','finish'],outcome:'cross'},{path:['test','player','cross','finish','finish'],outcome:'cross'}];
export const q178AcceptedRoutes=[{path:['close'],outcome:'close'},{path:['test','close'],outcome:'close'},{path:['test','wait'],outcome:'wait'},{path:['test','daughter'],outcome:'cross'},{path:['test','player','finish'],outcome:'cross'}];
export const q178Cast=scene=>({entry:[],family:['q178_daughter','q178_parent'],wait_talk:['q178_daughter','q178_parent'],wait:['q178_daughter','q178_parent'],daughter_door:['q178_daughter'],player_door:['q178_daughter'],morning:['q178_daughter'],delivered:['q178_host'],closed:[]})[scene];
export function upgradedQ178Save(raw){const saved=JSON.parse(raw),s=saved.state.stories.q178;if(s){s.revision=2;s.values.hostPersonAt='host';}else(saved.state.flags.legacyStoryRoutes??={}).q178=true;return saved;}
export function upgradeQ178(raw){const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),upgradedQ178Save(raw));checkpoint(g);return g;}
export function q178Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ178Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q178');return g;}
export function q178AcceptedEngine(){const g=new GameEngine(acceptedQ178Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q178'));const p=acceptedQ178.locations.find(p=>p.role==='decision')??acceptedQ178.locations[0];go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});g.run(acceptedQ178.model.entryScript??'q178.visit');drain(g);return g;}
export async function tomorrowDoorArtFixtures(){
 const fixtures=[],outcomes=new Set();
 const capture=(g,variant)=>{const save=g.save(),now=upgradeQ178(save),scene=g.state.stories.q178.scene,cast=q178Cast(scene);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);fixtures.push({edition:'e2',quest:'q178',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:{entry:'test',family:'wait',wait_talk:'morning',wait:'finish',daughter_door:'morning',player_door:'cross',morning:'finish',delivered:'finish',closed:'finish'}[scene]});};
 for(const legacy of [false,true]){
  const seen=new Set();
  for(const route of q178Routes){const g=q178Engine({legacy}),observe=()=>{const scene=g.state.stories.q178.scene;if(g.state.quests.q178.stage==='completed'||seen.has(scene))return;seen.add(scene);capture(g,legacy?'previous':'current');};observe();for(const id of route.path){choose(g,'q178',id);observe();}assert.equal(g.state.quests.q178.outcome,route.outcome);outcomes.add('e2/q178/'+route.outcome);}
  assert.equal(seen.size,9);
 }
 // Resume real in-flight old journeys: a waiting old paragraph must remain intact,
 // while arrival after migration must use the corrected current paragraph.
 for(const [scene,path,id] of [['daughter_door',['test'],'daughter'],['player_door',['test'],'player'],['delivered',['test','player','cross'],'finish']]){
  const old=q178Engine({legacy:true});for(const c of path)choose(old,'q178',c);assert.ok(old.dispatch({type:'choose',id}));drain(old);assert.ok(old.state.journey);
  const now=upgradeQ178(old.save()),action=data.quests.q178.story.actions[now.state.journey.action];now.random=()=>.999999;go(now,data.quests.q178.story.worldPlaces[action.journey.to]);drain(now);assert.equal(now.state.stories.q178.scene,scene);assert.equal(projectGame(now).dialog.text,data.quests.q178.model.graph.find(n=>n.id===scene).text);capture(now,'previous-arrived');
 }
 const seen=new Set();
 for(const route of q178AcceptedRoutes){const old=q178AcceptedEngine(),observe=()=>{if(old.state.quests.q178.stage==='completed')return;const scene=old.state.flags.quest.q178.node;if(seen.has(scene))return;seen.add(scene);const now=upgradeQ178(old.save());assert.equal(now.state.stories.q178,undefined);assert.equal(projectGame(now).dialog.scene,undefined);fixtures.push({edition:'e2',quest:'q178',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:now.save(),expectedText:projectGame(old).dialog.text,availableChoice:{entry:'test',family:'wait',morning:'finish'}[scene]});};observe();for(const id of route.path){assert.ok(old.dispatch({type:'choose',id}));drain(old);observe();}assert.equal(old.state.quests.q178.outcome,route.outcome);}
 assert.equal(seen.size,3);return{fixtures,outcomes:[...outcomes]};
}
