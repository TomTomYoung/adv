import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {installDOM} from './view-dom.mjs';
import {newGame,data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {replaceView,normalizeLayout} from '../src/view/view-layout.js';
import {handleGameKey} from '../src/view/keyboard.js';
import {messagePages} from '../src/view/message-pages.js';
const fixtures=JSON.parse(await fs.readFile(new URL('../data/view-fixtures.json',import.meta.url)));
function setup(g=newGame()){
  const dom=installDOM(),intents=[];let view;
  const ui={status(){},menu(){},help(){},sound(){},soundEnabled:()=>false,effectsMode:()=> 'off'};
  const dispatch=intent=>{intents.push(intent);const changed=g.dispatch(intent);if(changed)view.render(projectGame(g));return changed;};
  const switchTo=layout=>{view=replaceView(view,layout,dom.root,dispatch,ui);view.render(projectGame(g));return view;};
  const key=k=>{const event={key:k,preventDefault(){this.defaultPrevented=true;}};handleGameKey(event,{view,model:view.model,dispatch,menu:ui.menu,activeElement:dom.document.activeElement});return event;};
  switchTo('scene');
  return {...dom,g,intents,ui,dispatch,key,switchTo,get view(){return view;},cleanup(){view.destroy();dom.restore();}};
}
const named=(root,name)=>[...root.querySelectorAll('button')].find(b=>b.textContent===name);

test('both layouts render all fixtures with the same visible story choices and enemy targets',()=>{
  const c=setup();try{for(const [name,model] of Object.entries(fixtures)){
    for(const layout of ['classic','scene']){
      const v=c.switchTo(layout);v.render(structuredClone(model));
      if(layout==='scene')assert.equal(c.root.children.length,1,`${name}: one containing scene`);
      if(model.dialog&&!model.battle?.enemies?.length){
        while(v.canChoose?.()===false)v.advanceText();
        const message=c.root.querySelector('.message-window');assert.ok(message,`${name}: message exists`);
        for(const o of model.dialog.options??[])assert.ok([...message.querySelectorAll('button')].some(b=>b.textContent.startsWith(o.text)&&Boolean(b.disabled)===!o.enabled),`${name}: choice ${o.id}`);
      }
      if(model.battle)assert.equal(c.root.querySelectorAll('.enemy').length,model.battle.enemies.filter(e=>e.hp>0).length,`${name}: enemy targets`);
    }
  }}finally{c.cleanup();}
});

test('switching layouts and opening every utility window preserves the exact save and feedback revision',()=>{
  const c=setup();try{const saved=c.g.save(),revision=c.g.feedback.revision;
    for(const layout of ['scene','classic','scene'])c.switchTo(layout);
    for(const panel of ['journal','bag','party']){c.view.openPanel(panel);assert.ok(c.root.querySelector('.scene-window'));c.view.closePanel();}
    assert.equal(c.g.save(),saved);assert.equal(c.g.feedback.revision,revision);assert.deepEqual(c.intents,[]);
    assert.equal(normalizeLayout('unknown'),'scene');assert.equal(normalizeLayout('classic'),'classic');
  }finally{c.cleanup();}
});

test('utility windows block movement, inspection and dialogue hotkeys, Escape restores the scene',()=>{
  const g=newGame();g.dispatch({type:'travel',dungeon:'kagaribi'});const c=setup(g);
  try{c.view.openPanel('bag');const saved=g.save();assert.ok(c.root.querySelector('.scene-world').inert);
    for(const key of ['w','ArrowUp','a','s','d','e','Enter',' ','1','9'])c.key(key);
    assert.equal(g.save(),saved);assert.deepEqual(c.intents,[]);
    c.key('Escape');assert.equal(c.view.blocksGameInput(),false);assert.equal(c.view.tab,'explore');assert.equal(c.document.activeElement.dataset.panel,'bag');
    c.key('d');assert.deepEqual(c.intents.at(-1),{type:'move',direction:'right'});
  }finally{c.cleanup();}
});

test('message paging preserves all Unicode text and sends advance only after the final page',()=>{
  const d=structuredClone(data),text='台帳には帰還した者の名が並ぶ。\n'.repeat(25)+'灯🕯️';
  assert.equal(messagePages(text).join(''),text);
  d.scripts.long_message={commands:[{op:'say',name:'標本係',text},{op:'say',text:'次の台詞。'}]};
  const g=new GameEngine(d);drain(g);g.run('long_message');const c=setup(g);
  try{const saved=g.save();assert.ok(c.view.pages.length>1);
    for(let i=0,n=c.view.pages.length-1;i<n;i++){c.view.advanceText();assert.equal(g.save(),saved);}
    assert.deepEqual(c.intents,[]);c.view.advanceText();assert.equal(projectGame(g).dialog.text,'次の台詞。');assert.deepEqual(c.intents,[{type:'advance'}]);
  }finally{c.cleanup();}
});

test('choice numbers cannot bypass unread pages, unavailable choices or an open overlay',()=>{
  const d=structuredClone(data);d.scripts.choice_pages={commands:[{op:'say',text:'選ぶ前に確認する。'.repeat(55)},{op:'choice',options:[{id:'locked',text:'封印を解く',condition:false,commands:[]},{id:'yes',text:'台帳を開く',commands:[{op:'say',text:'開いた。'}]}]}]};
  const g=new GameEngine(d);drain(g);g.run('choice_pages');g.dispatch({type:'advance'});const c=setup(g);
  try{const saved=g.save();c.key('2');assert.equal(g.save(),saved);
    while(!c.view.canChoose())c.view.advanceText();c.key('1');assert.equal(g.save(),saved);
    c.view.openPanel('journal');c.key('2');assert.equal(g.save(),saved);c.key('Escape');
    c.key('2');assert.equal(projectGame(g).dialog.text,'開いた。');assert.equal(c.intents.length,1);
  }finally{c.cleanup();}
});

test('town commands reach services and quest acceptance closes the board for its dialogue',()=>{
  const g=newGame();assert.ok(g.dispatch({type:'location.move',id:'hikarigaeri_guild'}));const c=setup(g);
  try{named(c.root,'依頼掲示板を見る').click();assert.equal(c.view.tab,'quests');
    named(c.root,'依頼を受ける').click();assert.equal(c.intents.at(-1).type,'accept');
    if(projectGame(g).dialog){assert.equal(c.root.querySelector('.scene-window'),null);assert.ok(c.root.querySelector('.message-window'));}
  }finally{c.cleanup();}
});

test('battle event dialogue replaces battle controls, then the same target and skill intents remain available',()=>{
  const c=setup();try{
    const m=structuredClone(fixtures.battle);m.battle.event={id:'test'};m.dialog={type:'text',speaker:'新人',text:'待ってくれ。'};c.view.render(m);
    assert.ok(c.root.querySelector('.message-window'));assert.equal(c.root.querySelector('.battle-actions'),null);
    m.battle.event=null;m.dialog=null;c.view.render(m);assert.ok(c.root.querySelector('.battle-actions'));
    const enemies=c.root.querySelectorAll('.enemy');if(enemies.length>1){enemies[1].click();assert.equal(c.view.selectedTarget,m.battle.enemies[1].id);}
  }finally{c.cleanup();}
});

test('scene effects stay in the scene and switching does not replay feedback or leave overlays',()=>{
  const c=setup();try{
    c.view.effects.key='session/15';const layer=c.view.effects.layer({left:100,top:100,width:30,height:30},'fx-test');
    assert.equal(layer.element.parentElement,c.root.querySelector('.scene-stage'));assert.equal(layer.element.style.position,'absolute');
    const next=replaceView(c.view,'classic',c.root,c.dispatch,c.ui);assert.equal(next.effects.key,'session/15');next.destroy();
    assert.equal(layer.element.isConnected,false);assert.equal(c.root.querySelectorAll('.fx-overlay').length,0);
  }finally{c.cleanup();}
});

test('board search retains focus, selection and scroll while results rerender inside its window',()=>{
  const g=newGame();g.dispatch({type:'location.move',id:'hikarigaeri_guild'});const c=setup(g);
  try{c.view.openPanel('quests');const input=c.root.querySelector('.search');input.focus();input.value='骨';input.setSelectionRange(1,1);
    c.root.querySelector('.scene-window-body').scrollTop=200;input.dispatchEvent({type:'input'});
    assert.equal(c.document.activeElement.dataset.focus,'quest-search');assert.equal(c.document.activeElement.value,'骨');assert.equal(c.document.activeElement.selectionStart,1);
    assert.equal(c.root.querySelector('.scene-window-body').scrollTop,200);assert.match(c.root.querySelector('.quest-list').textContent,/骨の荷札/);
  }finally{c.cleanup();}
});

test('identical consecutive long messages each start at page one',()=>{
  const d=structuredClone(data),text='同じ文面の二通目も最初から読む。'.repeat(30);
  d.scripts.repeated_text={commands:[{op:'say',text},{op:'say',text}]};const g=new GameEngine(d);drain(g);g.run('repeated_text');const c=setup(g);
  try{while(!c.view.canChoose())c.view.advanceText();c.view.advanceText();assert.equal(c.view.page,0);assert.equal(c.view.model.dialog.text,text);}
  finally{c.cleanup();}
});
