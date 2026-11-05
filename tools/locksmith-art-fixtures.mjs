import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,go,choose,drain} from '../tests/royal-helpers.mjs';

export const beforeLocksmith=await read('tests/fixtures/e2-q163-before-cast.json');
const art=await read('assets/source/characters/sunken-q163-2026-11-05.json');
const faces=Object.fromEntries(art.files.map(f=>[f.id,f.visualInspection.faceCentralNormalizedBounds]));
const legacyQuest=data.previousQuestRoutes.q163;
export const locksmithRoutes=[
 {choices:['later'],legacy:['later'],outcome:'later'},
 {choices:['old','later'],legacy:['old','later'],outcome:'later'},
 {choices:['new','repair','return','finish'],legacy:['new'],outcome:'repair'},
 {choices:['old','agree','repair','return','finish'],legacy:['old','agree'],outcome:'repay'}
];
export function locksmithArtFixtures(){
 const fixtures=[],outcomes=new Set(),seed=ready().save();
 for(const [generation,quest] of [['current',data.quests.q163],['previous',beforeLocksmith],['accepted-legacy',legacyQuest]]){
  const legacy=generation==='accepted-legacy';
  const content={...data,quests:{...data.quests,q163:quest},scripts:{...data.scripts,...quest.scripts}};
  const game=new GameEngine(content);game.load(seed);game.random=()=>.999999;
  if(legacy){
   go(game,{kind:'town',location:'royal_board'});assert.ok(game.accept('q163'));
   const {map,x,y}=legacyQuest.locations.find(p=>p.role==='decision');
   go(game,{kind:'dungeon',dungeon:'region_7',map,x,y});
   game.run(legacyQuest.model.entryScript??'q163.visit');drain(game);
  }else start(game,'q163');
  const entry=game.save(),seen=new Set();
  for(const route of locksmithRoutes){
   game.load(entry);
   for(const action of legacy?route.legacy:route.choices){
    const scene=legacy?game.state.flags.quest.q163.node:game.state.stories.q163.scene;
    if(!seen.has(scene)){
     seen.add(scene);
     const dialog=projectGame(game).dialog;
     fixtures.push({edition:'e2',quest:'q163',scene,variant:generation,cast:legacy?[]:['q163_som','q163_owner'],
      faces:legacy?undefined:faces,clearOfHud:true,absentStoryScene:legacy,
      save:game.save(),expectedText:dialog.text,availableChoice:action});
    }
    if(legacy){assert.ok(game.dispatch({type:'choose',id:action}));drain(game);}
    else choose(game,'q163',action);
   }
   assert.equal(game.state.quests.q163.outcome,route.outcome);
   outcomes.add('e2/q163/'+route.outcome);
  }
  assert.equal(seen.size,legacy?2:8);
 }
 return {fixtures,outcomes:[...outcomes]};
}
