import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,read,ready,start,choose,checkpoint,go,drain} from '../tests/machine-helpers.mjs';
export const previousQ175=await read('tests/fixtures/e2-q175-before-cast.json');
export const previousQ175Data={...data,quests:{...data.quests,q175:previousQ175},scripts:{...data.scripts,...previousQ175.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q175_')))};
export const acceptedQ175=data.previousQuestRoutes.q175;
export const acceptedQ175Data={...previousQ175Data,quests:{...previousQ175Data.quests,q175:acceptedQ175},scripts:{...previousQ175Data.scripts,...acceptedQ175.scripts}};
export const q175Routes=[
 {path:['visit','hidden','fight','fight','finish'],outcome:'changed'},
 {path:['visit','fake','guide','warn','finish'],outcome:'drive'},
 {path:['visit','fake','guide','pursue','fight','finish'],outcome:'changed'},
 {path:['visit','front'],outcome:'front'},
 {path:['visit','hidden','decoy','hidden','fight','retreat','decoy','guide','pursue','retreat','warn','finish'],outcome:'drive'}
];
export const q175Battles=[
 {scene:'onsite',path:['visit'],choice:'front',encounter:'boss_8',escape:false,finish:[]},
 {scene:'battle',path:['visit','hidden','fight'],choice:'fight',encounter:'story_175',escape:true,finish:['finish']},
 {scene:'pursuit',path:['visit','fake','guide','pursue'],choice:'fight',encounter:'story_175',escape:true,finish:['finish']}
];
export const q175Cast=scene=>scene==='entry'?[]:['q175_miro','q175_sister',...(['warned','pursued'].includes(scene)?['q175_lookout']:[])];
export function q175Engine({legacy=false}={}){const base=ready(),g=legacy?new GameEngine(previousQ175Data):base;if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q175');return g;}
export function q175AcceptedEngine(){
 const g=new GameEngine(acceptedQ175Data);g.load(ready().save());g.random=()=>.999999;go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q175'));
 const p=acceptedQ175.locations.find(p=>p.role==='decision')??acceptedQ175.locations[0];go(g,{kind:'dungeon',dungeon:'region_8',map:p.map,x:p.x,y:p.y});g.run(acceptedQ175.model.entryScript??'q175.visit');drain(g);return g;
}
export function upgradeQ175(raw){
 const current=new GameEngine(data);current.load(raw);const expected=JSON.parse(raw),story=expected.state.stories.q175;
 if(story){story.revision=2;story.values.lookoutAt='warning_place';}
 else (expected.state.flags.legacyStoryRoutes??={}).q175=true;
 assert.deepEqual(JSON.parse(current.save()),expected);checkpoint(current);return current;
}
export async function hunterArtFixtures(){
 const fixtures=[],outcomes=new Set();
 const capture=(g,variant)=>{
  const raw=g.save(),current=upgradeQ175(raw),scene=g.state.stories.q175.scene,cast=q175Cast(scene);
  assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),cast);
  fixtures.push({edition:'e2',quest:'q175',scene,variant,cast,textOnlyCast:cast,save:raw,availableChoice:{entry:'visit',onsite:'hidden',hidden:'fight',route:'guide',warning:'warn',battle:'fight',changed:'finish',warned:'finish',pursuit:'fight',pursued:'finish'}[scene],expectedText:projectGame(g).dialog.text});
 };
 for(const legacy of [false,true]){
  const seen=new Set(),variant=legacy?'previous':'current';
  for(const route of q175Routes){
   const g=q175Engine({legacy}),observe=()=>{const scene=g.state.stories.q175.scene;if(g.state.quests.q175.stage==='completed'||seen.has(scene))return;seen.add(scene);capture(g,variant);};
   observe();for(const id of route.path){choose(g,'q175',id);observe();}assert.equal(g.state.quests.q175.outcome,route.outcome);outcomes.add('e2/q175/'+route.outcome);
  }
  assert.equal(seen.size,10);
  for(const battle of q175Battles)for(const result of battle.escape?['escape','lose']:['lose']){
   const g=q175Engine({legacy});for(const id of battle.path)choose(g,'q175',id);choose(g,'q175',battle.choice,{combat:result});
   assert.equal(g.state.stories.q175.scene,battle.scene);assert.equal(g.state.quests.q175.stage,'active');capture(g,variant+'-'+result);
  }
 }
 const old=q175AcceptedEngine(),current=upgradeQ175(old.save());assert.equal(current.state.flags.legacyStoryRoutes.q175,true);assert.equal(current.state.stories.q175,undefined);assert.equal(projectGame(current).dialog.scene,undefined);
 fixtures.push({edition:'e2',quest:'q175',scene:'entry',variant:'accepted-legacy',cast:[],absentStoryScene:true,save:current.save(),availableChoice:'hidden',expectedText:projectGame(old).dialog.text});
 return {fixtures,outcomes:[...outcomes]};
}
