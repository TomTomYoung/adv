import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,go,drain} from '../tests/royal-helpers.mjs';

export const beforeShield=await read('tests/fixtures/e2-q162-before-cast.json');
const legacyQuest=data.previousQuestRoutes.q162;
const rescues=[
 {phase:'explained',modern:['shield','truth'],legacy:['shield','truth']},
 {phase:'concealed',modern:['shield','hide'],legacy:['shield','hide']},
 {phase:'rope',modern:['rope','continue','ceremony'],legacy:['rope']},
 {phase:'assisted',modern:['help','return','rescue','ceremony'],legacy:['help']}
];
const faceBounds={
 q162_eld:[443/1024,105/1536,503/1024,159/1536],
 q162_niece:[465/1024,103/1536,524/1024,158/1536]
};
function expectedCast(scene,assisted){
 switch(scene){
  case 'entry': case 'returned':return ['q162_eld'];
  case 'ceremony': case 'workshop':return ['q162_niece'];
  case 'help':return ['q162_helpers'];
  case 'help_bridge':return ['q162_survivors','q162_helpers'];
  case 'rescued':return assisted?['q162_survivors','q162_helpers']:['q162_survivors'];
  case 'bridge': case 'tell': case 'bridge_rope_ready':return ['q162_survivors'];
  default:throw Error('Unknown shield scene '+scene);
 }
}
export function shieldArtFixtures(){
 const fixtures=[],outcomes=new Set(),seed=ready().save();
 for(const [generation,quest] of [['current',data.quests.q162],['previous',beforeShield],['accepted-legacy',legacyQuest]]){
  const legacy=generation==='accepted-legacy';
  const content={...data,quests:{...data.quests,q162:quest},scripts:{...data.scripts,...quest.scripts}};
  const game=new GameEngine(content);game.load(seed);game.random=()=>.999999;
  game.state.inventory.rope=1;
  if(legacy){
   go(game,{kind:'town',location:'royal_board'});assert.ok(game.accept('q162'));
   const {map,x,y}=legacyQuest.locations.find(p=>p.role==='decision');
   go(game,{kind:'dungeon',dungeon:'region_7',map,x,y});
   game.run(legacyQuest.model.entryScript??'q162.visit');drain(game);
  }else start(game,'q162');
  const entry=game.save(),seen=new Set();
  const capture=(phase,action)=>{
   const scene=legacy?game.state.flags.quest.q162.node:game.state.stories.q162.scene;
   const variant=generation+'-'+phase;
   if(seen.has(scene+'/'+variant))return;
   seen.add(scene+'/'+variant);
   const cast=legacy?[]:expectedCast(scene,phase==='assisted');
   const dialog=projectGame(game).dialog;
   fixtures.push({edition:'e2',quest:'q162',scene,variant,cast,absentStoryScene:legacy,
    textOnlyCast:cast.filter(id=>!faceBounds[id]),faces:Object.fromEntries(cast.filter(id=>faceBounds[id]).map(id=>[id,faceBounds[id]])),
    clearOfHud:true,save:game.save(),expectedText:dialog.text,availableChoice:action,
    blockedChoices:dialog.options.filter(o=>!o.enabled).map(o=>o.id)});
  };
  for(const rescue of rescues)for(const outcome of ['ceremony','workshop','return']){
   game.load(entry);
   const steps=legacy?[...rescue.legacy,outcome]:['borrow',...rescue.modern,outcome,...(outcome==='ceremony'?[]:['finish'])];
   for(const action of steps){
    const scene=legacy?game.state.flags.quest.q162.node:game.state.stories.q162.scene;
    const phase=['entry','bridge'].includes(scene)?'before-rescue':scene==='tell'?'scarred':rescue.phase;
    capture(phase,action);
    if(legacy){assert.ok(game.dispatch({type:'choose',id:action}));drain(game);}
    else choose(game,'q162',action);
   }
   assert.equal(game.state.quests.q162.outcome,outcome);outcomes.add('e2/q162/'+outcome);
  }
  if(!legacy){
   game.load(entry);choose(game,'q162','borrow');game.state.inventory.rope=0;
   capture('no-rope','help');
  }
 }
 return {fixtures,outcomes:[...outcomes]};
}
