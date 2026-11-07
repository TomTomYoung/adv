import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,read,ready,start,choose,checkpoint,go,drain} from '../tests/machine-helpers.mjs';
export const previousQ179=await read('tests/fixtures/e2-q179-before-cast.json');
export const previousQ179Data={...data,quests:{...data.quests,q179:previousQ179},scripts:{...data.scripts,...previousQ179.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q179_')))};
const accepted=data.previousQuestRoutes.q179;
const acceptedData={...previousQ179Data,quests:{...previousQ179Data.quests,q179:accepted},scripts:{...previousQ179Data.scripts,...accepted.scripts}};
export const gardenVisit=(order=[3,1,2],answers=['collect','reject','collect'])=>order.flatMap((i,k)=>['house'+i,answers[k],'return']);
export const q179Routes=[
 {path:['visit','begin',...gardenVisit(),'starve','finish'],outcome:'starve'},
 {path:['visit','begin','cut','continue','cut','cut','cut','finish'],outcome:'burn'},
 {path:['visit','begin','rush','report','finish'],outcome:'damage'}
];
export const q179AcceptedRoutes=[{path:['begin','visit','visit','visit','starve'],outcome:'starve'},{path:['begin','cut'],outcome:'burn'},{path:['begin','rush'],outcome:'damage'}];
export const q179Cast=scene=>scene==='entry'?[]:['q179_keeper',...(/^house[123](_done)?$/.test(scene)?['q179_house'+scene[5]]:[])];
export function upgradedQ179Save(raw){const saved=JSON.parse(raw),s=saved.state.stories.q179;if(s){s.revision=2;for(let i=1;i<=3;i++)s.values['house'+i+'PersonAt']='house'+i;}else(saved.state.flags.legacyStoryRoutes??={}).q179=true;return saved;}
export function upgradeQ179(raw){const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),upgradedQ179Save(raw));checkpoint(g);return g;}
export function q179Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ179Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q179');return g;}
export function q179AcceptedEngine(){const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q179'));const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q179.visit');drain(g);return g;}
export async function gardenArtFixtures(){
 const fixtures=[],outcomes=new Set();
 const capture=(g,variant)=>{const save=g.save(),now=upgradeQ179(save),scene=g.state.stories.q179.scene,cast=q179Cast(scene);assert.deepEqual(projectGame(now).dialog.scene.cast.map(c=>c.id),cast);fixtures.push({edition:'e2',quest:'q179',scene,variant,cast,textOnlyCast:cast,save,expectedText:projectGame(g).dialog.text,availableChoice:{entry:'visit',onsite:'begin',houses:'rush',houses_cut_ready:'continue',house1:'collect',house2:'collect',house3:'collect',house1_done:'return',house2_done:'return',house3_done:'return',cut1:'cut',cut2:'cut',cut3:'cut',starved:'finish',burned:'finish',rush:'report',damaged:'finish'}[scene]});};
 for(const legacy of [false,true]){
  const seen=new Set();for(const route of q179Routes){const g=q179Engine({legacy}),observe=()=>{const scene=g.state.stories.q179.scene;if(g.state.quests.q179.stage==='completed'||seen.has(scene))return;seen.add(scene);capture(g,legacy?'previous':'current');};observe();for(const id of route.path){choose(g,'q179',id);observe();}assert.equal(g.state.quests.q179.outcome,route.outcome);outcomes.add('e2/q179/'+route.outcome);}assert.equal(seen.size,17);
 }
 for(const [scene,path,id] of [['burned',['visit','begin','cut','continue','cut','cut'],'cut'],['rush',['visit','begin'],'rush'],['damaged',['visit','begin','rush'],'report']]){
  const old=q179Engine({legacy:true});for(const c of path)choose(old,'q179',c);assert.ok(old.dispatch({type:'choose',id}));drain(old);assert.ok(old.state.journey);
  const now=upgradeQ179(old.save()),a=data.quests.q179.story.actions[now.state.journey.action];now.random=()=>.999999;go(now,data.quests.q179.story.worldPlaces[a.journey.to]);drain(now);assert.equal(now.state.stories.q179.scene,scene);assert.equal(projectGame(now).dialog.text,data.quests.q179.model.graph.find(n=>n.id===scene).text);capture(now,'previous-arrived');
 }
 const seen=new Set();for(const route of q179AcceptedRoutes){const old=q179AcceptedEngine(),observe=()=>{if(old.state.quests.q179.stage==='completed')return;const scene=old.state.flags.quest.q179.node;if(seen.has(scene))return;seen.add(scene);const now=upgradeQ179(old.save());assert.equal(now.state.stories.q179,undefined);assert.equal(projectGame(now).dialog.scene,undefined);fixtures.push({edition:'e2',quest:'q179',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:now.save(),expectedText:projectGame(old).dialog.text,availableChoice:{entry:'begin',houses:'rush'}[scene]});};observe();for(const id of route.path){assert.ok(old.dispatch({type:'choose',id}));drain(old);observe();}assert.equal(old.state.quests.q179.outcome,route.outcome);}assert.equal(seen.size,2);
 return{fixtures,outcomes:[...outcomes]};
}
