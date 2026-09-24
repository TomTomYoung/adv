import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {processFieldEvents} from '../src/core/field-events.js';
import {signalFieldChange} from '../src/core/field-signals.js';
import {fireContext,fireNetwork} from '../src/core/systems/fire-network.js';
import {currentIllumination} from '../src/core/lighting.js';
import {projectGame} from '../src/application/projection.js';
import {validateContent} from '../src/core/validation.js';
import {validateSave} from '../src/core/save.js';

const checkpoint=g=>{const text=g.save();assert.deepEqual(validateSave(JSON.parse(text),g.data),[]);g.load(text);assert.equal(g.save(),text);};
function make(events){
  const d=structuredClone(data);
  for(const m of Object.values(d.maps)){m.objects=m.objects.filter(o=>!o.quest);m.encounterRate=0;}
  if(events)d.dungeons.kagaribi.fieldEvents=events;
  const g=new GameEngine(d);drain(g);g.teleport('kagaribi_f2',2,1,'east');
  return {g,d};
}
const scriptEvent=(id,repeat='change',watch=['enter','move','light','object','state'],condition=true)=>({id,title:id,repeat,watch,condition,action:{type:'script',script:`test.${id}`}});
const countScript=(d,id,commands=[])=>d.scripts[`test.${id}`]={commands:[{op:'add',target:`vars.${id}`,value:1},...commands]};
const move=(g,direction='forward')=>assert.ok(g.dispatch({type:'move',direction}));
const fire=(g,action)=>assert.ok(g.dispatch({type:'dungeon.action',system:'fires',action,target:'portable'}));

test('pending conditional battles yield to an authored battle and do not restart from stale signals',()=>{
  const event={id:'test_battle',title:'test',repeat:'change',watch:['light','move'],condition:true,action:{type:'battle',encounter:'kuragari_hunt'}};
  const {g,d}=make([event]);signalFieldChange(d,g.state,'light');
  d.scripts.authored={commands:[{op:'battle.start',encounter:'kuragari_hunt',on_win:[],on_lose:[],on_escape:[]}]};
  g.run('authored');assert.deepEqual(g.state.fieldReactions.pending,[]);checkpoint(g);
  g.random=()=>0;g.dispatch({type:'battle',action:'escape'});assert.equal(g.state.battle,null);assert.equal(g.state.records.battles,1);
  move(g);assert.equal(g.state.records.battles,2);
});

test('signals coalesce, unrelated actions never evaluate the condition, and only active dungeon subscribers run',()=>{
  const event=scriptEvent('observed','once',['object'],{ref:'flags.ready'}),{g,d}=make([event]);countScript(d,'observed');
  const original=g.value.bind(g);let calls=0;g.value=(value,extra)=>{if(value===event.condition)calls++;return original(value,extra);};
  processFieldEvents(g);move(g,'right');projectGame(g);signalFieldChange(d,g.state,'light');processFieldEvents(g);assert.equal(calls,0);
  signalFieldChange(d,g.state,'object');signalFieldChange(d,g.state,'object');processFieldEvents(g);assert.equal(calls,1);assert.equal(g.state.vars.observed,undefined);
  g.state.flags.ready=true;signalFieldChange(d,g.state,'object');processFieldEvents(g);assert.equal(calls,2);assert.equal(g.state.vars.observed,1);
  signalFieldChange(d,g.state,'object');processFieldEvents(g);assert.equal(calls,2);
  g.teleport('region_2_f1',1,1);signalFieldChange(d,g.state,'object');processFieldEvents(g);assert.equal(calls,2);checkpoint(g);
});

test('once, per-entry and per-change repeat policies survive save/load and re-entry',()=>{
  const events=['once','entry','change'].map(repeat=>scriptEvent(repeat,repeat,['enter','light']));
  const {g,d}=make(events);for(const e of events)countScript(d,e.id);
  processFieldEvents(g);assert.deepEqual(g.state.vars,{once:1,entry:1,change:1});checkpoint(g);
  signalFieldChange(d,g.state,'light');processFieldEvents(g);assert.deepEqual(g.state.vars,{once:1,entry:1,change:2});checkpoint(g);
  move(g);assert.deepEqual(g.state.vars,{once:1,entry:2,change:3});
  g.returnTown();g.teleport('kagaribi_f2',2,1);processFieldEvents(g);assert.deepEqual(g.state.vars,{once:1,entry:3,change:4});checkpoint(g);
});

test('busy queue persists, runs in definition order and rechecks the current condition after dialogue',()=>{
  const a=scriptEvent('first','once',['light']),b=scriptEvent('second','once',['object'],{ref:'flags.ready'}),{g,d}=make([a,b]);
  countScript(d,'first',[{op:'narrate',text:'first'},{op:'flag.set',key:'ready',value:false}]);countScript(d,'second');
  d.scripts.busy={commands:[{op:'narrate',text:'busy'}]};g.state.flags.ready=true;g.run('busy');
  signalFieldChange(d,g.state,'object','light');processFieldEvents(g);assert.equal(g.state.waiting.text,'busy');checkpoint(g);
  g.dispatch({type:'advance'});assert.equal(g.state.waiting.text,'first');assert.equal(g.state.vars.second,undefined);checkpoint(g);
  drain(g);assert.equal(g.state.vars.first,1);assert.equal(g.state.vars.second,undefined);assert.deepEqual(g.state.fieldReactions.pending,[]);
  g.state.flags.ready=true;signalFieldChange(d,g.state,'object');processFieldEvents(g);assert.equal(g.state.vars.second,1);checkpoint(g);
});

test('cell parameter, current illumination and exact point including height can drive conditional events',()=>{
  const e=scriptEvent('dark','once',['enter','light'],{op:'and',args:[{op:'lte',left:{ref:'field.illumination'},right:2},{op:'eq',left:{ref:'field.cell.parameters.water_passable'},right:true}]}),{g,d}=make([e]);
  countScript(d,'dark');e.points=[{map:'kagaribi_f2',x:2,y:1,z:1}];g.setPortableFire({fuel:0,effect:null});processFieldEvents(g);assert.equal(g.state.vars.dark,undefined);
  e.points[0].z=0;signalFieldChange(d,g.state,'light');processFieldEvents(g);assert.equal(g.state.vars.dark,1);checkpoint(g);
});

test('computed illumination matches projection across torch, doors and local cell illumination',()=>{
  const {g,d}=make([]);
  const same=()=>assert.equal(currentIllumination(d,g.state),projectGame(g).dungeon.lighting.current);
  same();g.setPortableFire({fuel:0,effect:null});same();assert.equal(currentIllumination(d,g.state),0);
  d.maps.kagaribi_f2.cells.overrides['2,1']={parameters:{illumination:3}};same();assert.equal(currentIllumination(d,g.state),3);
  g.teleport('kagaribi_f1',1,3);same();
  d.maps.kagaribi_f1.objects.push({id:'test_door',x:1,y:2,blocking:true,initialState:'closed'});same();
});

test('object state commands notify subscribers but setting an unchanged value does not rearm them',()=>{
  const {g,d}=make([scriptEvent('object_changed','change',['object'])]);countScript(d,'object_changed');
  d.scripts.toggle={commands:[{op:'object.state.set',map:'kagaribi_f2',object:'stairs_up',state:'open'}]};
  g.run('toggle');processFieldEvents(g);assert.equal(g.state.vars.object_changed,1);
  g.run('toggle');processFieldEvents(g);assert.equal(g.state.vars.object_changed,1);
  // Pure script locals and repeated flag assignments are not field mutations.
  const e=scriptEvent('flag_changed','once',['state'],false),{g:h,d:other}=make([e]);countScript(other,'flag_changed');
  other.scripts.flag={commands:[{op:'flag.set',key:'ready',value:true}]};h.run('flag');assert.deepEqual(h.state.fieldReactions.pending,['flag_changed']);processFieldEvents(h);
  h.run('flag');assert.deepEqual(h.state.fieldReactions.pending,[]);
  other.scripts.local={commands:[{op:'set',target:'local.temp',value:1}]};h.run('local');assert.deepEqual(h.state.fieldReactions.pending,[]);
});

test('invalid subscriptions, targets, conditions, repetitions and queued saves are rejected atomically',()=>{
  for(const mutate of [e=>e.watch=['unknown'],e=>e.watch=['move','move'],e=>e.repeat='always',e=>delete e.condition,e=>e.condition={op:'bogus'},e=>e.action.encounter='missing',e=>e.action={type:'script',script:'missing'},e=>e.points=[{map:'region_2_f1',x:1,y:1}]]){
    const d=structuredClone(data);d.dungeons.kagaribi.fieldEvents=[{id:'test_battle',title:'test',repeat:'change',watch:['move'],condition:true,action:{type:'battle',encounter:'kuragari_hunt'}}];mutate(d.dungeons.kagaribi.fieldEvents[0]);assert.ok(validateContent(d).length);
  }
  const {g,d}=make([scriptEvent('test_event','change',['light'])]);countScript(d,'test_event');signalFieldChange(d,g.state,'light');processFieldEvents(g);const before=g.save();
  for(const mutate of [q=>q.pending=['missing'],q=>q.pending=['test_event','test_event'],q=>q.run=999,q=>q.fired=['test_event'],q=>q.dungeon='region_2']){
    const save=JSON.parse(before);mutate(save.state.fieldReactions);assert.throws(()=>g.load(JSON.stringify(save)));assert.equal(g.save(),before);
  }
  const bad=JSON.parse(before);bad.state.events['field/kagaribi/test_event']=-1;assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);
});
