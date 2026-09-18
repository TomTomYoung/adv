import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,walk} from './helpers.mjs';
import {prepareQuest,finishJourney} from './structure-routes.mjs';
import {GameEngine} from '../src/core/engine.js';
import {validateContent} from '../src/core/validation.js';
import {validateSave} from '../src/core/save.js';
import {restoreGame} from '../src/application/restore.js';
import {onFieldCell} from '../src/core/field-events.js';

const move=(g,direction)=>assert.ok(g.dispatch({type:'move',direction}));
const choose=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}));drain(g);};
const checkpoint=g=>{const s=g.save();assert.deepEqual(validateSave(JSON.parse(s),g.data),[]);g.load(s);assert.equal(g.save(),s);};

test('rookie starts on the occupied entrance cell, never on facing it or pressing inspect; pause and load do not restart it',()=>{
 const g=newGame();g.accept('q001');g.dispatch({type:'quest.travel',id:'q001'});
 assert.equal(g.state.stories.q001,undefined);g.teleport('kagaribi_f1',3,1,'west');
 assert.ok(g.dispatch({type:'interact'}));drain(g);assert.equal(g.state.stories.q001,undefined);
 move(g,'forward');assert.equal(g.state.location.x,2);assert.equal(g.state.stories.q001.scene,'entry');assert.equal(g.state.waiting.type,'text');
 assert.equal(g.state.events['kagaribi_f1/q001_decision'],1);checkpoint(g);drain(g);choose(g,'pause');
 assert.equal(g.state.waiting,null);checkpoint(g);move(g,'left');move(g,'right');assert.equal(g.state.waiting,null);
 move(g,'back');move(g,'forward');assert.equal(g.state.waiting.type,'text');assert.equal(g.state.events['kagaribi_f1/q001_decision'],2);
});

test('elder starts by stepping onto 13,3; facing the event at 13,2 cannot commit arrival',()=>{
 const g=prepareQuest('q001');choose(g,'talk');finishJourney(g);choose(g,'inspect');choose(g,'follow');
 walk(g,13,2,{maintain:true});while(g.state.location.facing!=='south')move(g,'right');
 const pending=structuredClone(g.state.journey);assert.equal(g.state.stories.q001.scene,null);
 assert.ok(g.dispatch({type:'interact'}));drain(g);assert.deepEqual(g.state.journey,pending);
 assert.equal(g.dispatch({type:'journey.arrive'}),false);checkpoint(g);
 move(g,'forward');assert.equal(g.state.stories.q001.scene,'old');assert.equal(g.state.journey,null);assert.equal(g.state.waiting.type,'text');
 assert.match(g.state.waiting.text,/老人/);assert.equal(g.state.location.x,13);assert.equal(g.state.location.y,3);checkpoint(g);
});

function eventGame(){
 const d=structuredClone(data);for(const m of Object.values(d.maps)){m.objects=m.objects.filter(o=>!o.quest);m.encounterRate=0;}
 // Use a normal dry corridor for generic event lifecycle tests.
 d.quests.q021.events=[];const g=new GameEngine(d);drain(g);g.accept('q021');g.teleport('region_2_f1',1,1,'east');
 const script=(id,commands)=>{d.scripts[id]={commands};d.quests.q021.scripts[id]=d.scripts[id];return id;};
 const auto=(id,condition,commands,points=[])=>{const e={id,title:id,trigger:'auto',once:true,condition,points,dungeon:'region_2',script:script(`q021.test.${id}`,commands)};d.quests.q021.events.push(e);return e;};
 return {d,g,script,auto};
}
test('condition events wait for idle, run in order once and save midway through conversation',()=>{
 const {g,auto,script}=eventGame();
 const first=auto('first',{ref:'flags.ready'},[{op:'add',target:'vars.calls',value:1},{op:'narrate',text:'first'},{op:'flag.set',key:'next',value:true}]);
 auto('second',{ref:'flags.next'},[{op:'narrate',text:'second'}]);
 g.run(script('set_condition',[{op:'flag.set',key:'ready',value:true},{op:'narrate',text:'busy'}]));
 assert.equal(g.state.events['quest/q021/first'],undefined);assert.equal(g.dispatch({type:'move',direction:'forward'}),false);
 g.dispatch({type:'advance'});assert.equal(g.state.waiting.text,'first');assert.equal(g.state.vars.calls,1);checkpoint(g);
 g.dispatch({type:'advance'});assert.equal(g.state.waiting.text,'second');checkpoint(g);drain(g);move(g,'left');move(g,'right');
 assert.equal(g.state.vars.calls,1);assert.equal(g.state.events['quest/q021/second'],1);assert.equal(first.once,true);
});

test('automatic conditions enforce active quest, dungeon, visibility and exact cell including height',()=>{
 const {g,auto}=eventGame();const e=auto('located',true,[{op:'narrate',text:'here'}],[{map:'region_2_f1',x:1,y:1,z:0}]);
 for(const change of [()=>g.state.quests.q021.stage='available',()=>{g.state.quests.q021.stage='active';e.dungeon='kagaribi';},()=>{e.dungeon='region_2';e.visibleWhen=false;},()=>{e.visibleWhen=true;e.points[0].x=2;}]){
  change();move(g,'right');assert.equal(g.state.waiting,null);assert.equal(g.state.events['quest/q021/located'],undefined);
 }
 e.points[0].x=1;e.points[0].z=1;move(g,'right');assert.equal(g.state.waiting,null);
 e.points[0].z=0;move(g,'right');assert.equal(g.state.waiting.text,'here');checkpoint(g);
 assert.equal(onFieldCell(g.state,{map:'region_2_f1',x:1,y:1,z:1}),false);
});

test('multiple step events on one cell resume in order across a battle event and save without duplicate rewards',()=>{
 const {g,d,script,auto}=eventGame();
 for(const [id,commands] of [
  ['step_battle',[{op:'battle.start',encounter:'kuragari_hunt',events:[{id:'finish',triggers:['start'],commands:[{op:'narrate',text:'battle event'},{op:'battle.end'}]}],on_interrupt:[{op:'flag.set',key:'battleFinished',value:true}],on_win:[],on_lose:[],on_escape:[]}]],
  ['step_after',[{op:'add',target:'vars.stepCount',value:1},{op:'narrate',text:'next step event'}]]
 ])d.maps.region_2_f1.objects.push({id,name:id,kind:'decision',trigger:'enter',x:2,y:1,script:script(`test.${id}`,commands)});
 auto('after_battle',{ref:'flags.battleFinished'},[{op:'narrate',text:'condition after battle'}]);
 const gold=g.state.gold,xp=g.state.xp;move(g,'forward');assert.equal(g.state.waiting.text,'battle event');checkpoint(g);
 assert.equal(g.dispatch({type:'move',direction:'forward'}),false);
 g.dispatch({type:'advance'});assert.equal(g.state.battle,null);assert.equal(g.state.waiting.text,'next step event');checkpoint(g);
 g.dispatch({type:'advance'});assert.equal(g.state.waiting.text,'condition after battle');drain(g);checkpoint(g);
 assert.equal(g.state.vars.stepCount,1);assert.equal(g.state.gold,gold);assert.equal(g.state.xp,xp);assert.equal(g.state.records.interruptions,1);
});

test('step event takes priority over random encounters and rejects repeat execution when once is set',()=>{
 const {g,d,script}=eventGame();d.maps.region_2_f1.encounterRate=1;d.system.encounterCheckSteps=1;g.random=()=>0;
 d.maps.region_2_f1.objects.push({id:'step_once',name:'step once',kind:'decision',trigger:'enter',once:true,x:2,y:1,script:script('test.step_once',[{op:'narrate',text:'step first'}])});
 move(g,'forward');assert.equal(g.state.waiting.text,'step first');assert.equal(g.state.battle,null);checkpoint(g);drain(g);
 d.maps.region_2_f1.encounterRate=0;g.random=()=>.999;move(g,'back');move(g,'forward');assert.equal(g.state.events['region_2_f1/step_once'],1);
});

test('condition event definitions and saved entry records are validated; previous content version restarts',()=>{
 const {g,d,auto}=eventGame();const e=auto('valid',true,[{op:'narrate',text:'valid'}]);
 const valid=structuredClone(data);valid.quests.q021.events.push(e);valid.quests.q021.scripts[e.script]=d.scripts[e.script];valid.scripts[e.script]=d.scripts[e.script];
 assert.deepEqual(validateContent(valid),[]);
 for(const mutate of [x=>delete x.condition,x=>x.once=false,x=>x.points=null,x=>x.trigger='unknown']){
  const bad=structuredClone(valid);mutate(bad.quests.q021.events.at(-1));assert.ok(validateContent(bad).length);
 }
 for(const fired of [['missing'],['missing','missing'],null]){const bad=JSON.parse(g.save());bad.state.fieldEntry.fired=fired;assert.throws(()=>g.load(JSON.stringify(bad)));}
 const old=JSON.parse(g.save());old.contentVersion='1.12.0';assert.equal(restoreGame(data,JSON.stringify(old)).restarted,true);assert.equal(e.trigger,'auto');
});
