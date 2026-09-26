import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,walk} from './helpers.mjs';
import {prepareQuest,finishJourney} from './structure-routes.mjs';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {validateContent} from '../src/core/validation.js';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {setDungeonRestriction} from '../src/core/dungeon-restrictions.js';
import {fireContext} from '../src/core/systems/fire-network.js';

const seal={dungeon:'kagaribi',action:'return_mark',source:'unrelated.trap',reason:'別の罠の封印。'};
const saveAndLoad=g=>{const save=g.save();assert.deepEqual(validateSave(JSON.parse(save),g.data),[]);g.load(save);assert.equal(g.save(),save);};
function elder(){
 const g=prepareQuest('q001');g.random=()=>.99;
 for(const id of ['talk','inspect','follow']){g.dispatch({type:'choose',id});drain(g);finishJourney(g);}
 assert.equal(g.state.eventCheckpoints.length,1);return g;
}
function loseBattle(g){
 for(const id of g.state.members){g.state.actors[id].hp=1;g.state.actors[id].statuses=['poison'];}
 for(let i=0;i<10&&g.state.battle;i++)assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard'}));
 assert.equal(g.state.battle,null);assert.equal(g.state.mode,'town');
}
function assertReset(g){
 const s=g.state,q=s.stories.q001;
 assert.equal(s.mode,'town');assert.equal(s.location,null);assert.equal(s.townLocation,data.game.world.townRoot);
 assert.equal(s.journey,null);assert.equal(q.scene,'old');assert.equal(q.values.elderAt,'branch');assert.equal(q.values.rookieAt,'entry');
 assert.equal(q.values.partyAt,'transit');assert.equal(q.values.newOil,1);assert.equal(q.values.oilUsed,1);assert.equal(q.values.darkness,'watching');assert.equal(q.values.steppedForward,false);
 assert.ok(!q.events.includes('old_support'));assert.ok(!q.events.includes('outage_call'));
 assert.equal(s.flags.worldSceneEffects.q001.old,undefined);assert.equal(s.flags.worldSceneEffects.q001.outage,undefined);
 assert.equal(s.objects['kagaribi_f1/q001_last_lamp'],undefined);
 assert.ok(!s.dungeonRestrictions.some(r=>r.source==='q001.elder_rescue'));assert.deepEqual(s.eventCheckpoints,[]);
 assert.equal(s.waiting,null);assert.deepEqual(s.vm,[]);assert.equal(s.fieldEntry,null);assert.deepEqual(s.fieldReactions.pending,[]);
 assert.equal(s.presentation.cast,undefined);assert.equal(s.presentation.message,undefined);
 assert.equal(nextQuestPlace(g.data,s,'q001').event,'q001_elder');saveAndLoad(g);
}
function revisit(g){
 g.healAll();assert.ok(g.dispatch({type:'quest.travel',id:'q001'}));
 assert.equal(g.state.eventCheckpoints.length,0);assert.ok(!g.state.dungeonRestrictions.some(r=>r.source==='q001.elder_rescue'));
 walk(g,9,1,{maintain:true});assert.equal(g.state.battle,null);assert.equal(g.state.waiting,null);assert.equal(g.state.stories.q001.scene,'old');
 walk(g,13,2,{maintain:true});assert.equal(g.state.eventCheckpoints.length,0);
 walk(g,13,3,{maintain:true});assert.equal(g.state.waiting.type,'choice');assert.equal(g.state.stories.q001.scene,'old');
 assert.equal(g.state.eventCheckpoints.length,1);assert.equal(fireContext(data,g.state).run.portable.fuel,8);
 assert.ok(g.state.dungeonRestrictions.some(r=>r.source==='q001.elder_rescue'));saveAndLoad(g);
}

test('ordinary defeat without an event checkpoint returns to town with the existing penalty and recovery',()=>{
 const g=newGame();g.dispatch({type:'travel',dungeon:'kagaribi'});g.startBattle('wild_pair_1',{win:[],escape:[],lose:[]});
 const gold=g.state.gold;loseBattle(g);
 assert.equal(g.state.gold,Math.floor(gold*(1-data.system.defeatGoldRate)));assert.equal(g.state.dungeons.active,null);
 for(const id of g.state.members){assert.ok(g.state.actors[id].hp>=Math.ceil(g.stats(id).hp*data.system.recoveryRatio));assert.deepEqual(g.state.actors[id].statuses,[]);}
 saveAndLoad(g);
});

for(const stage of ['elder','return_walk','kuragari'])test(`q001 defeat during ${stage} rolls back only the event and physically revisits the elder`,()=>{
 const g=elder();
 if(stage==='elder')g.dispatch({type:'choose',id:'pause'});
 else{g.dispatch({type:'choose',id:'support'});if(stage==='kuragari')finishJourney(g);else walk(g,13,2,{maintain:true});}
 const storyBefore=structuredClone(g.state.eventCheckpoints[0].story);
 setDungeonRestriction(g,seal);g.state.flags.otherQuest={kept:true};g.state.objects['kagaribi_f1/q001_empty_west']='lit';
 g.give('potion',-1);g.state.gold-=7;const potion=g.state.inventory.potion,gold=g.state.gold,steps=g.state.steps;
 if(!g.state.battle)g.startBattle('wild_pair_1',{win:[],escape:[],lose:[]});saveAndLoad(g);loseBattle(g);assertReset(g);
 assert.equal(g.state.inventory.potion,potion);assert.equal(g.state.gold,Math.floor(gold*(1-data.system.defeatGoldRate)));assert.equal(g.state.steps,steps);
 assert.deepEqual(g.state.flags.otherQuest,{kept:true});assert.equal(g.state.objects['kagaribi_f1/q001_empty_west'],'lit');assert.deepEqual(g.state.dungeonRestrictions,[seal]);
 assert.deepEqual(g.state.stories.q001.knowledge,storyBefore.knowledge);assert.deepEqual(g.state.stories.q001.events,storyBefore.events);
 revisit(g);g.dispatch({type:'choose',id:'support'});finishJourney(g);assert.equal(fireContext(data,g.state).run.portable.fuel,0);
 assert.equal(g.state.objects['kagaribi_f1/q001_last_lamp'],'extinguished');assert.ok(g.state.battle);
 g.finishBattle('win');drain(g);assert.deepEqual(g.state.eventCheckpoints,[]);assert.deepEqual(g.state.dungeonRestrictions,[seal]);
});

test('q001 can fail twice and still repeats the outage, while defeat after the rescue never rewinds it',()=>{
 const g=elder();
 for(let i=0;i<2;i++){g.dispatch({type:'choose',id:'support'});finishJourney(g);loseBattle(g);assertReset(g);revisit(g);}
 g.dispatch({type:'choose',id:'support'});finishJourney(g);g.finishBattle('win');assert.equal(g.state.waiting.speaker,'新人灯番');saveAndLoad(g);
 assert.equal(g.state.eventCheckpoints.length,1);g.dispatch({type:'advance'});assert.equal(g.state.eventCheckpoints.length,0);saveAndLoad(g);
 const story=structuredClone(g.state.stories.q001);g.defeat();assert.equal(g.state.stories.q001.scene,'rescue');assert.equal(g.state.stories.q001.values.newOil,0);
 assert.deepEqual(g.state.stories.q001.events,story.events);assert.equal(g.state.stories.q001.values.elderAt,'dark');assert.equal(g.state.stories.q001.values.rookieAt,'dark');saveAndLoad(g);
});

test('fatal field trap after the elder uses the same rollback, including a save in the opening conversation',()=>{
 const initial=elder(),g=new GameEngine(structuredClone(data));g.load(initial.save());
 // Return to the opening narration without replacing the checkpoint baseline.
 const baseline=JSON.stringify(g.state.eventCheckpoints[0]);g.dispatch({type:'choose',id:'pause'});g.dispatch({type:'story.resume',quest:'q001'});saveAndLoad(g);
 assert.equal(JSON.stringify(g.state.eventCheckpoints[0]),baseline);drain(g);g.dispatch({type:'choose',id:'pause'});
 g.data.scripts.fatal_trap={commands:[{op:'actor.damage',target:'party',amount:100000},{op:'flag.set',key:'mustNotContinue',value:true}]};
 g.map().objects.push({id:'fatal_trap',name:'落下罠',kind:'trap',trigger:'enter',x:13,y:2,script:'fatal_trap'});
 while(g.state.location.facing!=='north')g.dispatch({type:'move',direction:'right'});
 assert.ok(g.dispatch({type:'move',direction:'forward'}));assertReset(g);assert.equal(g.state.flags.mustNotContinue,undefined);
});

test('rolled-back battle discards its old lose continuation and rookie conversation can still be rolled back before commit',()=>{
 const initial=elder(),g=new GameEngine(structuredClone(data));g.load(initial.save());
 const battle=g.data.scripts['q001.v11.outage'].commands.find(c=>c.op==='battle.start');battle.on_lose=[{op:'flag.set',key:'staleLose',value:true},{op:'jump',script:'q001.v11.rescue'}];
 g.dispatch({type:'choose',id:'support'});finishJourney(g);g.finishBattle('win');assert.equal(g.state.waiting.speaker,'新人灯番');saveAndLoad(g);
 g.finishBattle('lose');assertReset(g);assert.equal(g.state.flags.staleLose,undefined);
});

test('the checkpoint DSL works for another quest, restores declared values and prior seals, and commits idempotently',()=>{
 const base=prepareQuest('q002'),g=new GameEngine(structuredClone(data));g.load(base.save());g.dispatch({type:'choose',id:'pause'});
 const prior={dungeon:'region_1',action:'return_mark',source:'another.sequence',reason:'元からある封印。'};
 setDungeonRestriction(g,prior);g.state.flags.example={value:'before'};g.state.vars.example=3;
 const begin={op:'event.checkpoint.begin',id:'another.sequence',quest:'q002',scene:'entry',dungeon:'region_1',flags:['example.value'],vars:['example'],eventKeys:['example/event'],restrictionSources:['another.sequence']};
 g.data.scripts.sequence={commands:[begin,{op:'set',target:'flags.example.value',value:'during'},{op:'set',target:'vars.example',value:8},{op:'event.mark_done',event:'example/event'},{op:'dungeon.restriction.set',...prior,action:'return',reason:'区間内の追加封印。'},{op:'narrate',text:'区間内'}]};
 g.data.scripts.commit_sequence={commands:[{op:'event.checkpoint.commit',id:'another.sequence'}]};
 g.run('sequence');saveAndLoad(g);drain(g);g.defeat();assert.equal(g.state.flags.example.value,'before');assert.equal(g.state.vars.example,3);assert.equal(g.state.events['example/event'],undefined);assert.deepEqual(g.state.dungeonRestrictions,[prior]);
 const p=data.quests.q002.story.worldPlaces.landing;g.teleport(p.map,p.x,p.y);g.run('sequence');drain(g);g.run('commit_sequence');g.run('commit_sequence');g.defeat();
 assert.equal(g.state.flags.example.value,'during');assert.equal(g.state.vars.example,8);assert.equal(g.state.events['example/event'],1);assert.equal(g.state.dungeonRestrictions.length,2);saveAndLoad(g);
});

test('invalid checkpoint definitions and tampered snapshots are rejected without replacing the live state',()=>{
 const g=elder(),save=g.save(),begin=g.data.scripts['q001.v11.old'].commands.find(c=>c.op==='event.checkpoint.begin');
 for(const change of [c=>c.origin.index=999,c=>c.origin.script='missing',c=>c.story.scene='outage',c=>c.story.values.newOil=99,c=>c.values.pop(),c=>c.values[0]={present:false,value:true},c=>c.values[2]={present:true,value:4},c=>c.restrictions=[seal],c=>c.unknown=true]){
  const bad=JSON.parse(save);change(bad.state.eventCheckpoints[0]);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),save);
 }
 for(const value of [undefined,null,{},[JSON.parse(save).state.eventCheckpoints[0],JSON.parse(save).state.eventCheckpoints[0]]]){
  const bad=JSON.parse(save);bad.state.eventCheckpoints=value;assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),save);
 }
 for(const patch of [{quest:'missing'},{scene:'missing'},{dungeon:'region_1'},{flags:['constructor.value']},{flags:['example','example.value']},{vars:['gold','gold']},{objects:['kagaribi_f1/missing']},{eventKeys:['__proto__']},{restrictionSources:['']}]){
  const d=structuredClone(data);d.scripts.bad_checkpoint={commands:[{...begin,...patch}]};assert.ok(validateContent(d).some(e=>e.includes('チェックポイント')));
 }
 const d=structuredClone(data),other=new GameEngine(d);other.load(save);other.dispatch({type:'choose',id:'pause'});
 d.scripts.overlap_checkpoint={commands:[{...begin,id:'overlap'}]};assert.throws(()=>other.run('overlap_checkpoint'),/復元対象/);
});
