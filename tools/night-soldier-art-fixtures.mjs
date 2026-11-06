import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,read,ready,start,choose,checkpoint,go,drain} from '../tests/machine-helpers.mjs';
export const previousQ173=await read('tests/fixtures/e2-q173-before-cast.json');
export const previousQ173Data={...data,quests:{...data.quests,q173:previousQ173},scripts:{...data.scripts,...previousQ173.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!['q173_tera','q173_spirit'].includes(id)))};
export const acceptedQ173=data.previousQuestRoutes.q173;
export const acceptedQ173Data={...previousQ173Data,quests:{...previousQ173Data.quests,q173:acceptedQ173},scripts:{...previousQ173Data.scripts,...acceptedQ173.scripts}};
export const q173Routes=[
 {path:['visit','wife','guest','finish'],outcome:'guest'},
 {path:['visit','spirit','wife','return','guest','finish'],outcome:'guest'},
 {path:['visit','spirit','part','finish'],outcome:'part'},
 {path:['visit','spirit','copy','later','finish'],outcome:'copy'}
];
export const q173Cast=scene=>({entry:[],onsite:['q173_tera'],spirit:['q173_spirit'],wife:['q173_tera'],guest_agree:['q173_tera','q173_spirit'],part_home:['q173_tera'],copy_home:['q173_tera','q173_spirit'],copy_later:['q173_tera','q173_spirit']})[scene];
export function q173Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ173Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q173');return g;}
export function q173AcceptedEngine(){
 const g=new GameEngine(acceptedQ173Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q173'));
 const p=acceptedQ173.locations.find(p=>p.role==='decision')??acceptedQ173.locations[0];go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});g.run(acceptedQ173.model.entryScript??'q173.visit');drain(g);return g;
}
export async function nightSoldierArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set(),capture=g=>{
   const story=g.state.stories.q173,scene=story.scene,consent=scene==='spirit'?(story.values.wife?'heard':'unheard'):'',key=scene+consent;if(seen.has(key))return;seen.add(key);
   const raw=g.save(),current=new GameEngine(data);current.load(raw);assert.equal(current.save(),raw);checkpoint(current);
   const cast=q173Cast(scene);assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),cast);
   const availableChoice={entry:'visit',onsite:'spirit',spirit:'part',wife:'return',guest_agree:'finish',part_home:'finish',copy_home:'later',copy_later:'finish'}[scene];
   fixtures.push({edition:'e2',quest:'q173',scene,variant:(legacy?'previous':'current')+(consent?'-'+consent:''),cast,textOnlyCast:cast,save:raw,availableChoice,...(consent==='unheard'?{blockedChoice:'guest'}:{}),expectedText:projectGame(g).dialog.text});
  };
  for(const route of q173Routes){const g=q173Engine({legacy});capture(g);for(const action of route.path){choose(g,'q173',action);if(g.state.quests.q173.stage!=='completed')capture(g);}assert.equal(g.state.quests.q173.outcome,route.outcome);outcomes.add('e2/q173/'+route.outcome);}
  assert.equal(seen.size,9);
 }
 const old=q173AcceptedEngine(),current=new GameEngine(data);current.load(old.save());checkpoint(current);assert.equal(current.state.flags.legacyStoryRoutes.q173,true);assert.equal(current.state.stories.q173,undefined);assert.equal(projectGame(current).dialog.scene,undefined);
 fixtures.push({edition:'e2',quest:'q173',scene:'entry',variant:'accepted-legacy',cast:[],absentStoryScene:true,save:current.save(),availableChoice:'wife',expectedText:projectGame(old).dialog.text});
 return {fixtures,outcomes:[...outcomes]};
}
