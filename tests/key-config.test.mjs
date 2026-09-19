import test from 'node:test';
import assert from 'node:assert/strict';
import {installDOM} from './view-dom.mjs';
import {newGame,data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {replaceView} from '../src/view/view-layout.js';
import {handleGameKey} from '../src/view/keyboard.js';
import {SystemControls} from '../src/view/system-controls.js';
import {openKeyConfig} from '../src/view/key-config.js';
import {DEFAULT_BINDINGS,KEY_ACTIONS,copyBindings,changeBinding,eventCode,inputHint,keyAction,readKeyConfig,validateBindings} from '../src/view/key-bindings.js';
const custom=()=>({...copyBindings(DEFAULT_BINDINGS),confirm:['KeyZ',null],cancel:['KeyX',null],up:['KeyI',null],down:['KeyK',null],left:['KeyJ',null],right:['KeyL',null]});
const event=(key,extra={})=>({key,preventDefault(){this.defaultPrevented=true;},...extra});

test('default and custom settings survive JSON roundtrip without sharing mutable arrays',()=>{
  assert.equal(validateBindings(DEFAULT_BINDINGS),null);const first=readKeyConfig();assert.equal(first.recovered,false);first.config.bindings.confirm[0]='KeyZ';assert.equal(DEFAULT_BINDINGS.confirm[0],'Enter');
  const config={version:1,bindings:custom()};const restored=readKeyConfig(JSON.parse(JSON.stringify(config)));assert.deepEqual(restored.config,config);assert.equal(restored.recovered,false);restored.config.bindings.confirm[0]='KeyQ';assert.equal(config.bindings.confirm[0],'KeyZ');
});
test('invalid versions, missing required keys, unsupported keys and conflicts recover to defaults',()=>{
  for(const raw of [null,{},'keys',{version:2,bindings:custom()},{version:1,bindings:{...custom(),confirm:[null,null]}},{version:1,bindings:{...custom(),confirm:['F5',null]}},{version:1,bindings:{...custom(),confirm:['KeyW',null]}}]){
    const result=readKeyConfig(raw);assert.equal(result.recovered,true);assert.deepEqual(result.config.bindings,DEFAULT_BINDINGS);
  }
});
test('binding edits reject duplicates without modifying the draft and protect required actions',()=>{
  const bindings=custom(),before=structuredClone(bindings);const result=changeBinding(bindings,'confirm',0,'KeyW');assert.equal(result.ok,false);assert.match(result.error,/前進/);assert.deepEqual(bindings,before);
  assert.equal(changeBinding(bindings,'confirm',0,null).ok,false);assert.equal(changeBinding(bindings,'forward',0,null).ok,true);
  assert.equal(changeBinding(bindings,'confirm',0,'Escape').ok,false);assert.equal(changeBinding(bindings,'missing',0,'KeyQ').ok,false);
});
test('physical keys, main/sub keys and fixed Escape resolve consistently; modifiers and IME do not',()=>{
  assert.equal(keyAction(event('z',{code:'KeyZ'}),custom()),'confirm');assert.equal(keyAction(event('y',{code:'KeyZ'}),custom()),'confirm');
  assert.equal(keyAction(event(' ')),'confirm');assert.equal(keyAction(event('Enter',{code:'NumpadEnter'})),'confirm');assert.equal(keyAction(event('Escape'),custom()),'cancel');
  assert.equal(eventCode(event('w')),'KeyW');
  for(const extra of [{shiftKey:true},{ctrlKey:true},{altKey:true},{metaKey:true},{isComposing:true}])assert.equal(keyAction(event('z',extra),custom()),null);
  assert.match(inputHint(custom()),/Z 決定.*I K J L 選択.*X \/ Esc 戻る/);
});

function gameSetup(layout,engine=newGame()){
  const dom=installDOM(),intents=[],bindings=custom();let view;
  const dispatch=intent=>{intents.push(intent);const result=engine.dispatch(intent);view.render(projectGame(engine));return result;};
  view=replaceView(null,layout,dom.root,dispatch,{status(){},menu(){},help(){},sound(){},soundEnabled:()=>false,effectsMode:()=> 'off',keyHint:()=>inputHint(bindings)});view.render(projectGame(engine));
  const key=(key,extra={})=>{const e=event(key,extra);handleGameKey(e,{view,model:view.model,dispatch,bindings});return e;};
  return {...dom,view,engine,bindings,intents,key,cleanup(){view.destroy();dom.restore();}};
}
for(const layout of ['scene','classic']){
  test(`${layout}: remapped confirm/navigation advance dialogue and choose, while unbound Enter/Space stay inert`,()=>{
    const d=structuredClone(data);d.scripts.keys={commands:[{op:'say',text:'どうする？'},{op:'choice',options:[{id:'a',text:'一つ目',commands:[]},{id:'b',text:'二つ目',commands:[{op:'say',text:'二つ目を選んだ。'}]}]}]};const g=new GameEngine(d);drain(g);g.run('keys');const c=gameSetup(layout,g);
    try{for(const k of ['Enter',' '])assert.equal(c.key(k).defaultPrevented,true);assert.equal(c.intents.length,0);c.key('z');while(c.view.canChoose?.()===false)c.key('z');c.key('k');assert.equal(c.document.activeElement.dataset.focus,'choice:b');c.key('z');assert.equal(c.view.model.dialog.text,'二つ目を選んだ。');}finally{c.cleanup();}
  });
  test(`${layout}: remapped battle decision and cancel preserve resources until a target is confirmed`,()=>{
    const g=newGame();g.dispatch({type:'travel',dungeon:'kagaribi'});g.startBattle('wild_pair_1',{win:[],lose:[],escape:[]});const c=gameSetup(layout,g);
    try{const save=g.save();c.key('z');c.key('k');c.key('x');assert.ok(g.save()===save);assert.equal(c.intents.length,0);c.key('z');c.key('k');c.key('z');assert.equal(c.intents.at(-1).target,'enemy_1');assert.match(c.root.querySelector('.battle-panel').textContent,/Z 決定/);}finally{c.cleanup();}
  });
  test(`${layout}: custom cancel closes a picker and utility window, while text entry keeps its keys`,()=>{
    const c=gameSetup(layout);try{c.view.tab='bag';c.view.render(projectGame(c.engine));c.key('z');assert.ok(c.root.querySelector('.button-picker'));c.key('x');assert.equal(c.root.querySelector('.button-picker'),null);assert.equal(c.view.tab,'bag');
      const input=c.document.createElement('input');input.type='text';c.root.append(input);input.focus();for(const k of ['x','z','i','w'])assert.ok(!c.key(k).defaultPrevented);assert.equal(c.view.tab,'bag');c.key('Escape');assert.equal(c.view.tab,'location');assert.equal(c.intents.length,0);
    }finally{c.cleanup();}
  });
}
test('remapped direct exploration controls dispatch moves and remain blocked by management windows',()=>{
  const g=newGame();g.dispatch({type:'travel',dungeon:'kagaribi'});const c=gameSetup('scene',g);try{c.bindings.turnRight=['KeyR',null];c.key('d');assert.equal(c.intents.length,0);c.key('r');assert.deepEqual(c.intents.at(-1),{type:'move',direction:'right'});c.view.openPanel('bag');const count=c.intents.length;c.key('r');assert.equal(c.intents.length,count);}finally{c.cleanup();}
});
test('digits assigned to another action never fall through into numeric story shortcuts',()=>{
  const d=structuredClone(data);d.scripts.keys={commands:[{op:'choice',options:[{id:'a',text:'一つ目',commands:[]}]}]};const g=new GameEngine(d);drain(g);g.run('keys');const c=gameSetup('scene',g);
  try{c.bindings.forward=['Digit1',null];c.key('1');assert.equal(c.intents.length,0);c.bindings.forward=[null,null];c.key('1');assert.equal(c.intents.at(-1).type,'choose');}finally{c.cleanup();}
});

function editorSetup({bindings=DEFAULT_BINDINGS,save=()=>true}={}){
  const dom=installDOM(),dialog=dom.document.createElement('dialog');dom.document.body.append(dialog);let config={version:1,bindings:copyBindings(bindings)},written=null;
  const controls=new SystemControls(dialog,()=>dom.root,()=>config.bindings);
  const button=(text,key,fn)=>{const b=dom.document.createElement('button');b.textContent=text;b.dataset.focus=key;b.addEventListener('click',fn);return b;};
  const menu=()=>{controls.open('記録');dialog.append(button('キー設定','menu:keys',()=>openKeyConfig({dialog,controls,config,parent:menu,onApply:next=>{written=next;if(save(next)===false)return false;config=next;return true;}})),button('閉じる','menu:close',()=>controls.back()));controls.finish();};
  const key=(key,extra={})=>{const e=event(key,extra);controls.handleKey(e);return e;};
  const click=id=>{const b=dialog.querySelector(`[data-focus="${id}"]`);assert.ok(b,id);b.click();};
  menu();click('menu:keys');
  return {...dom,dialog,controls,key,click,get config(){return config;},get written(){return written;},cleanup:dom.restore};
}
test('capture edits a draft without acting on gameplay; cancel discards it and restores the menu opener',()=>{
  const c=editorSetup();try{c.key('Enter');c.key('z');assert.deepEqual(c.config.bindings,DEFAULT_BINDINGS);assert.match(c.dialog.querySelector('[data-focus="binding:confirm:0"]').textContent,/Z/);c.key('Escape');assert.equal(c.controls.title,'記録');assert.equal(c.document.activeElement.dataset.focus,'menu:keys');assert.equal(c.written,null);}finally{c.cleanup();}
});
test('duplicate capture is rejected, Escape exits listening before leaving settings, and IME/repeat never assign',()=>{
  const c=editorSetup();try{c.key('Enter');c.key('w');assert.match(c.dialog.textContent,/前進.*割り当て済み/);c.key('z',{repeat:true});c.key('Process',{code:'KeyZ',isComposing:true});assert.match(c.dialog.querySelector('[data-focus="binding:confirm:0"]').textContent,/入力待ち/);
    c.key('Escape');assert.equal(c.controls.title,'キー設定');assert.match(c.dialog.querySelector('[data-focus="binding:confirm:0"]').textContent,/Enter/);c.key('Escape');assert.equal(c.controls.title,'記録');
  }finally{c.cleanup();}
});
test('apply persists both slots and the new keys immediately navigate record and settings',()=>{
  const c=editorSetup();try{c.click('binding:confirm:0');c.key('z');c.click('clear:confirm:1');c.click('binding:cancel:0');c.key('x');c.click('keys:apply');assert.equal(c.controls.title,'記録');assert.equal(c.config.bindings.confirm[0],'KeyZ');assert.deepEqual(readKeyConfig(JSON.parse(JSON.stringify(c.written))).config,c.config);
    c.key('Enter');assert.equal(c.controls.title,'記録');c.key('z');assert.equal(c.controls.title,'キー設定');c.key('x');assert.equal(c.controls.title,'記録');c.key('Escape');assert.equal(c.dialog.open,false);
  }finally{c.cleanup();}
});
test('storage failure keeps settings open and the active bindings unchanged',()=>{
  const c=editorSetup({save:()=>false});try{c.click('binding:confirm:0');c.key('z');c.click('keys:apply');assert.match(c.dialog.textContent,/保存できなかった/);assert.equal(c.controls.title,'キー設定');assert.deepEqual(c.config.bindings,DEFAULT_BINDINGS);c.key('Escape');assert.equal(c.controls.title,'記録');}finally{c.cleanup();}
});
test('reset is a draft operation and becomes persistent only when applied',()=>{
  const c=editorSetup({bindings:custom()});try{c.click('keys:reset');assert.deepEqual(c.config.bindings,custom());c.key('Escape');assert.deepEqual(c.config.bindings,custom());c.click('menu:keys');c.click('keys:reset');c.click('keys:apply');assert.deepEqual(c.config.bindings,DEFAULT_BINDINGS);}finally{c.cleanup();}
});
test('required bindings cannot be cleared entirely; optional direct controls and secondary keys can',()=>{
  const c=editorSetup();try{assert.ok(c.dialog.querySelector('[data-focus="clear:up:0"]').disabled);c.click('clear:confirm:0');assert.ok(c.dialog.querySelector('[data-focus="clear:confirm:1"]').disabled);c.click('clear:forward:0');c.click('keys:apply');assert.deepEqual(c.config.bindings.confirm,[null,'Space']);assert.deepEqual(c.config.bindings.forward,[null,null]);assert.ok(KEY_ACTIONS.filter(a=>a.required).every(a=>c.config.bindings[a.id].some(Boolean)));}finally{c.cleanup();}
});
test('Tab cancels capture and stays available for native focus traversal',()=>{
  const c=editorSetup();try{c.key('Enter');const e=c.key('Tab');assert.ok(!e.defaultPrevented);assert.doesNotMatch(c.dialog.querySelector('[data-focus="binding:confirm:0"]').textContent,/入力待ち/);}finally{c.cleanup();}
});
