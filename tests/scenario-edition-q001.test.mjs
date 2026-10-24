import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {drain,exploreSpot,goWorldLocation,walk} from './helpers.mjs';
import {buildSecondEditionQuest,buildScenarioEditions} from '../tools/build-scenario-editions.mjs';

const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8').then(JSON.parse);
const data=await loadContent(read,{edition:'e2'});
const first=await read('data/quests/q001.json');
const firstHash='156cbb86c1e9feb30fa732a3f4c38e569ec70f3aacdbbb971a09be58c23b9758';

function checkpoint(g){
 const saved=g.save();
 assert.deepEqual(validateSave(JSON.parse(saved),g.data),[]);
 g.load(saved);assert.equal(g.save(),saved);
}
function ready(){
 const g=new GameEngine(data,1907),transcript=[];
 const dispatch=g.dispatch.bind(g);
 g.dispatch=intent=>{
  if(intent.type==='advance'&&g.state.waiting?.type==='text')transcript.push({speaker:g.state.waiting.speaker,text:g.state.waiting.text});
  return dispatch(intent);
 };
 drain(g);g.random=()=>.999999;g.award(0,data.system.xpBase*24*25);g.healAll();
 for(const item of ['rope','ration','potion','torch'])g.state.inventory[item]=99;
 assert.ok(g.accept('q001'));assert.ok(g.dispatch({type:'quest.travel',id:'q001'}));
 exploreSpot(g,data.quests.q001.story.worldPlaces.entry,{maintain:true,interact:false});
 drain(g);assert.equal(g.state.stories.q001.scene,'entry');
 return {g,transcript};
}
function choose(g,id){assert.ok(g.dispatch({type:'choose',id}));drain(g);}
function journey(g,{south=false}={}){
 const j=g.state.journey;assert.ok(j);
 const d=g.data.quests[j.quest].story,p=d.worldPlaces[d.actions[j.action].journey.to];
 if(p.kind==='town')goWorldLocation(g,p.location);
 else if(south&&j.action==='old_support')walk(g,13,5,{maintain:true,settleDestination:false});
 else exploreSpot(g,p,{maintain:true,interact:false,settleDestination:false});
 assert.equal(g.state.journey,null);drain(g);
}
function toBattle(entrance='talk',{south=false}={}){
 const result=ready(),{g}=result;
 // The newly authored consent itself is a saveable message before departure.
 assert.ok(g.dispatch({type:'choose',id:entrance}));
 assert.equal(g.state.waiting.speaker,'新人灯番');checkpoint(g);drain(g);
 assert.equal(g.state.stories.q001.values.signalAgreed,entrance==='signal');journey(g);
 choose(g,'inspect');choose(g,'follow');journey(g);
 assert.equal(g.state.stories.q001.scene,'old');
 choose(g,'support');journey(g,{south});
 assert.equal(g.state.battle.encounter,'kuragari_hunt');
 assert.deepEqual([g.state.location.x,g.state.location.y],south?[13,5]:[9,1]);
 checkpoint(g);return result;
}
function rescue(g){
 const gold=g.state.gold,xp=g.state.actors.ada.xp,oil=g.state.stories.q001.values.oilUsed;
 for(let budget=30;!g.state.battle.event;budget--){assert.ok(budget>0);assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard'}));}
 assert.equal(g.state.battle.round,2);assert.equal(g.state.waiting.speaker,'新人灯番');
 // The two replies are nested if branches in the saved battle continuation.
 checkpoint(g);drain(g);
 assert.equal(g.state.battle,null);assert.equal(g.state.stories.q001.scene,'rescue');
 assert.equal(g.state.stories.q001.values.oilUsed,oil+1);
 assert.equal(g.state.stories.q001.values.newOil,0);
 assert.equal(g.state.stories.q001.values.steppedForward,true);
 assert.equal(g.state.stories.q001.values.afraid,true);
 assert.equal(g.state.dungeons.active.systems.fires.portable.fuel,25);
 assert.equal(g.state.dungeonRestrictions.length,0);
 assert.equal(g.state.gold,gold);assert.equal(g.state.actors.ada.xp,xp);
 checkpoint(g);
}

test('the e2 generator preserves the exact first edition and regenerates only its own outputs',async()=>{
 const bytes=await fs.readFile(new URL('../data/quests/q001.json',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),firstHash);
 const original=JSON.stringify(first),generated=buildSecondEditionQuest(first);
 assert.equal(JSON.stringify(first),original);
 assert.deepEqual(generated,data.quests.q001);
 assert.equal(generated.story.modelVersion,'1.1');assert.equal(generated.model.standard.version,'1.2b');
 assert.deepEqual(generated.events,first.events);assert.deepEqual(generated.story.worldPlaces,first.story.worldPlaces);
 await buildScenarioEditions({check:true});
});

for(const entrance of ['talk','signal'])for(const ending of ['repair','rest'])test(`e2 q001 ${entrance} / ${ending} walks home, keeps its promise-specific text and rewards once`,()=>{
 const {g,transcript}=toBattle(entrance,{south:ending==='rest'});rescue(g);
 choose(g,'home');journey(g);assert.equal(g.state.stories.q001.scene,'gate');
 choose(g,'report');journey(g);assert.equal(g.state.townLocation,'hikarigaeri_lamplighter_post');
 assert.equal(g.state.stories.q001.scene,'post');
 const gold=g.state.gold,xp=g.state.actors.ada.xp;
 choose(g,ending);const outcome=ending==='repair'?'informed':'compromise';
 assert.equal(g.state.quests.q001.stage,'completed');assert.equal(g.state.quests.q001.outcome,outcome);
 assert.equal(g.state.gold,gold+data.quests.q001.outcomes[outcome].gold);
 assert.equal(g.state.actors.ada.xp,xp+data.quests.q001.outcomes[outcome].xp);
 assert.equal(g.state.stories.q001.values.elderAt,'post');assert.equal(g.state.stories.q001.values.rookieAt,'post');
 const text=transcript.map(line=>line.text).join('\n');
 if(entrance==='signal'){
  assert.match(text,/必ず、返事をします/);assert.match(text,/細い声は途中で途切れ、靴音に変わった/);
  assert.match(text,/返事だけして、待っていられませんでした/);assert.doesNotMatch(text,/帰り道を照らすなら、ここまで行かなきゃ/);
 }else{
  assert.match(text,/帰ってくる方を、ちゃんと見てます/);assert.match(text,/帰り道を照らすなら、ここまで行かなきゃ/);
  assert.doesNotMatch(text,/必ず、返事をします|返事だけして、待っていられませんでした/);
 }
 assert.match(text,ending==='repair'?/指の白さが、少しずつ引いていった/:/空の瓶が二つ、肩を寄せていた/);
 checkpoint(g);const rewarded={gold:g.state.gold,xp:g.state.actors.ada.xp,completed:g.state.vars.completed};
 g.run('q001.v11.visit');drain(g);checkpoint(g);
 assert.deepEqual({gold:g.state.gold,xp:g.state.actors.ada.xp,completed:g.state.vars.completed},rewarded);
 assert.throws(()=>g.complete('q001',outcome));
});

test('e2 defeat before the rescue preserves the chosen agreement and retries without spending the rookie oil',()=>{
 const {g}=toBattle('signal',{south:true});
 for(const id of g.state.members){g.state.actors[id].hp=1;g.state.actors[id].statuses=['poison'];}
 for(let budget=30;g.state.battle;budget--){assert.ok(budget>0);g.dispatch({type:'battle',action:'skill',skill:'guard'});}
 assert.equal(g.state.mode,'town');assert.equal(g.state.stories.q001.scene,'old');
 assert.equal(g.state.stories.q001.values.signalAgreed,true);assert.equal(g.state.stories.q001.values.newOil,1);
 assert.equal(g.state.stories.q001.values.steppedForward,false);checkpoint(g);
 g.healAll();g.teleport('kagaribi_f1',13,3);g.run('q001.v11.old');drain(g);
 choose(g,'support');journey(g,{south:true});rescue(g);
});

for(const mode of ['win','escape','repel'])test(`e2 pending ${mode} still displays the chosen reply and rescues exactly once`,()=>{
 const {g,transcript}=toBattle('signal');
 g.finishBattle(mode);assert.equal(g.state.waiting.speaker,'新人灯番');
 assert.match(g.state.waiting.text,/聞こえました/);checkpoint(g);drain(g);
 assert.equal(g.state.battle,null);assert.equal(g.state.stories.q001.values.oilUsed,2);
 assert.equal(g.state.stories.q001.events.filter(id=>id==='outage_call').length,1);
 assert.equal(transcript.filter(line=>line.text.includes('聞こえました！')).length,1);checkpoint(g);
});
