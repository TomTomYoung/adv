import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {validateContent} from '../src/core/validation.js';
import {validateSave} from '../src/core/save.js';
import {SceneCastRenderer} from '../src/view/scene-cast.js';
import {PresentationClock} from '../src/application/presentation-clock.js';
import {replaceView} from '../src/view/view-layout.js';
import {installDOM} from './view-dom.mjs';
const cast=(members,transition)=>({op:'scene.cast',cast:members,transition});
const member=(character,display={})=>({character,display});
function fixture(commands){const d=structuredClone(data);d.scripts.cast_transition_test={commands};const g=new GameEngine(d);drain(g);g.run('cast_transition_test');return g;}
function finish(g){return g.dispatch({type:'presentation.complete',id:g.state.waiting.id,session:g.feedback.session});}

test('cast wait blocks gameplay and text advance, then resumes once; saved waits retain the VM position',()=>{
 const g=fixture([cast([member('rookie',{x:20,opacity:.8,angle:-5})],{enter:500,wait:true}),{op:'add',target:'vars.after',value:1},{op:'say',character:'rookie',text:'到着した。'}]);
 assert.deepEqual(validateContent(g.data),[]);assert.equal(g.state.waiting.type,'presentation');assert.equal(projectGame(g).dialog.type,'presentation');
 for(const intent of [{type:'advance'},{type:'choose',id:'x'},{type:'move',direction:'forward'},{type:'battle',action:'skill',skill:'attack'},{type:'presentation.complete',id:-1,session:g.feedback.session}])assert.equal(g.dispatch(intent),false);
 assert.equal(g.state.vars.after,undefined);
 const saved=g.save(),old={type:'presentation.complete',id:g.state.waiting.id,session:g.feedback.session};assert.deepEqual(validateSave(JSON.parse(saved),g.data),[]);g.load(saved);
 assert.equal(g.save(),saved);assert.equal(projectGame(g).castCue,null);assert.equal(projectGame(g).dialog.scene.cast[0].display.angle,-5);
 assert.equal(g.dispatch(old),false);assert.equal(finish(g),true);assert.equal(g.state.vars.after,1);assert.equal(g.state.waiting.text,'到着した。');assert.equal(g.dispatch(old),false);
});
test('wait, effect completion, zero duration and cast.clear have distinct valid continuations',()=>{
 const g=fixture([cast([member('rookie')],{enter:0,wait:true}),{op:'wait',duration:100},{op:'effect.play',effect:'field_shake',delay:80,wait:true},{op:'scene.cast.clear',transition:{exit:200,wait:true}},{op:'wait',duration:0},{op:'say',text:'終わり。'}]);
 assert.equal(g.state.waiting.kind,'wait');assert.deepEqual(validateSave(JSON.parse(g.save()),g.data),[]);finish(g);
 assert.equal(g.state.waiting.duration,g.data.effects.field_shake.duration+80);assert.deepEqual(validateSave(JSON.parse(g.save()),g.data),[]);finish(g);
 assert.equal(g.state.waiting.kind,'cast');assert.equal(g.state.presentation.cast,undefined);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);finish(g);assert.equal(g.state.waiting.text,'終わり。');
});
test('invalid transition fields, opacity, angle, waits and corrupted saves are rejected',()=>{
 for(const change of [c=>c.transition.enter=-1,c=>c.transition.exit=10001,c=>c.transition.move=1.5,c=>c.transition.easing='bogus',c=>c.transition.wait='yes',c=>c.transition.typo=2,c=>c.cast[0].display.opacity=2,c=>c.cast[0].display.angle=361]){
  const g=fixture([cast([member('rookie')],{enter:200,wait:true})]);change(g.data.scripts.cast_transition_test.commands[0]);assert.ok(validateContent(g.data).length);
 }
 const g=fixture([cast([member('rookie')],{enter:200,wait:true}),{op:'say',text:'後続'}]);
 for(const mutate of [s=>s.waiting.duration=1,s=>s.waiting.kind='effect',s=>s.waiting.id++,s=>s.vm.at(-1).index++,s=>s.presentation.castCue.from.cast.push(member('missing')),s=>delete s.presentation.sequence]){const save=JSON.parse(g.save());mutate(save.state);assert.ok(validateSave(save,g.data).length);}
});
test('battle event waits save and resume into the same interruption without a second reward',()=>{
 const g=fixture([{op:'battle.start',encounter:'guard_1',events:[{id:'entrance',triggers:['start'],commands:[cast([member('rookie')],{enter:120,wait:true}),{op:'battle.end'}]}],on_win:[],on_lose:[],on_escape:[],on_interrupt:[{op:'say',text:'中断後'}]}]);
 assert.ok(g.state.battle.event);assert.deepEqual(validateContent(g.data),[]);assert.deepEqual(validateSave(JSON.parse(g.save()),g.data),[]);
 const gold=g.state.gold;g.load(g.save());assert.ok(finish(g));assert.equal(g.state.battle,null);assert.equal(g.state.waiting.text,'中断後');assert.equal(g.state.gold,gold);assert.equal(g.state.records.interruptions,1);
});
test('both layouts show a silent presentation without a continue/choice button',()=>{
 const dom=installDOM();let view;try{
  const g=fixture([cast([member('rookie')],{enter:100,wait:true}),{op:'say',text:'次'}]);
  for(const layout of ['scene','classic']){view=replaceView(view,layout,dom.root,()=>{}, {status(){},menu(){},help(){},sound(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));assert.equal(dom.root.querySelectorAll('.message-window .continue').length,0);assert.equal(dom.root.querySelectorAll('.message-window .choice').length,0);assert.ok(dom.root.querySelector('[data-character="rookie"]'));}
 }finally{view?.destroy();dom.restore();}
});
function animationDOM(){
 const dom=installDOM(),pending=[];const prototype=Object.getPrototypeOf(dom.root);
 prototype.animate=function(frames,options){let resolve,reject;const a={node:this,frames,options,cancelled:false,finished:new Promise((res,rej)=>{resolve=res;reject=rej;}),finish(){resolve();},cancel(){this.cancelled=true;reject(Error('cancelled'));}};pending.push(a);return a;};
 return {...dom,pending,cleanup(){delete prototype.animate;dom.restore();}};
}
const person=(id,display={})=>({id,name:id,sprite:`${id}.png`,portrait:`${id}-card.png`,display});
const scene=cast=>({mode:'stage',cast});
const cue=(id,from,transition)=>({id,session:1,from:scene(from),transition});
test('retained actors survive redraw and speaker changes; exiting actors remain until fade finishes',async()=>{
 const dom=animationDOM(),v=new SceneCastRenderer();try{
  const a=person('rookie',{x:20}),c=cue(1,[],{enter:500});v.render(dom.root,scene([a]),c,'full',1);const node=dom.root.querySelector('[data-character="rookie"]'),anim=dom.pending[0];
  dom.root.replaceChildren();v.render(dom.root,{...scene([a]),speakerId:'rookie'},c,'full',1);assert.equal(dom.root.querySelector('[data-character="rookie"]'),node);assert.equal(dom.pending.length,1);assert.equal(anim.cancelled,false);
  v.render(dom.root,scene([]),cue(2,[a],{exit:300}),'full',1);assert.ok(node.parentElement);assert.equal(node.getAttribute('aria-hidden'),'true');dom.pending.at(-1).finish();await Promise.resolve();assert.equal(node.parentElement,null);
 }finally{v.destroy();dom.cleanup();}
});
test('movement and crossfade preserve actor identity and a superseded exit cannot delete a re-entered actor',async()=>{
 const dom=animationDOM(),v=new SceneCastRenderer();try{
  const a=person('rookie',{x:20});v.render(dom.root,scene([a]),null,'full',1);const node=dom.root.querySelector('[data-character="rookie"]');
  const b={...a,sprite:'other.png',display:{x:70,scale:1.2,angle:10,opacity:.5}};v.render(dom.root,scene([b]),cue(1,[a],{move:400,change:300,easing:'ease-out'}),'full',1);
  assert.equal(node.querySelectorAll('img').length,2);assert.equal(node.style.left,'70%');assert.equal(node.style.opacity,'0.5');assert.ok(dom.pending.some(a=>a.options.duration===400&&a.options.easing==='ease-out'));
  v.render(dom.root,scene([]),cue(2,[b],{exit:500}),'full',1);const exit=dom.pending.at(-1);
  v.render(dom.root,scene([b]),cue(3,[],{enter:500,move:300}),'full',1);exit.finish();await Promise.resolve();assert.equal(dom.root.querySelector('[data-character="rookie"]'),node);assert.equal(node.querySelectorAll('img').length,1);
 }finally{v.destroy();dom.cleanup();}
});
test('off and reduced motion settle visual state without changing authored wait duration',()=>{
 const dom=animationDOM(),v=new SceneCastRenderer();try{
  const a=person('rookie');v.render(dom.root,scene([a]),cue(1,[],{enter:800}),'off',1);assert.equal(dom.pending.length,0);
  v.render(dom.root,scene([]),cue(2,[a],{exit:800}),'reduced',1);assert.equal(dom.pending[0].options.duration,150);
 }finally{v.destroy();dom.cleanup();}
});
test('presentation clock pauses, resumes once and discards replaced sessions',()=>{
 let now=0,next=0;const timers=new Map(),sent=[];
 const clock=new PresentationClock(x=>sent.push(x),{now:()=>now,schedule:(fn,ms)=>{timers.set(++next,{fn,ms});return next;},cancel:id=>timers.delete(id)});
 const w={id:1,session:1,duration:500};clock.sync(w);now=200;clock.sync(w,true);assert.equal(timers.size,0);clock.sync(w);assert.equal([...timers.values()][0].ms,300);
 const stale=[...timers.values()][0].fn;clock.sync({...w,session:2});stale();assert.equal(sent.length,0);
 [...timers.values()][0].fn();assert.equal(sent.length,1);clock.sync({...w,session:2});assert.equal(sent.length,1);clock.destroy();
});
