import test from 'node:test';
import assert from 'node:assert/strict';
import {installDOM} from './view-dom.mjs';
import {newGame,data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {replaceView} from '../src/view/view-layout.js';
import {handleGameKey} from '../src/view/keyboard.js';
import {buttons,moveFocus} from '../src/view/focus.js';
import {SystemControls} from '../src/view/system-controls.js';
const named=(root,text)=>[...root.querySelectorAll('button')].find(b=>b.textContent===text);
function setup(layout,g=newGame()){
  const dom=installDOM(),intents=[];let view;
  const dispatch=intent=>{intents.push(intent);const changed=g.dispatch(intent);view.render(projectGame(g));return changed;};
  view=replaceView(null,layout,dom.root,dispatch,{status(){},menu(){},help(){},sound(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));
  const key=(key,extra={})=>{const event={key,preventDefault(){this.defaultPrevented=true;},...extra};handleGameKey(event,{view,model:view.model,dispatch});return event;};
  const panel=tab=>{view.tab=tab;view.render(projectGame(g));};
  const selectButton=predicate=>{for(let n=0;n<500;n++){if(predicate(dom.document.activeElement))return;key('ArrowDown');}assert.fail('button unreachable with arrow keys');};
  return {...dom,g,intents,view,key,panel,selectButton,cleanup(){view.destroy();dom.restore();}};
}
function story(commands,dungeon=false){const d=structuredClone(data);d.scripts.keyboard_test={commands};const g=new GameEngine(d);drain(g);if(dungeon)g.dispatch({type:'travel',dungeon:'kagaribi'});g.run('keyboard_test');return g;}
function battle(){const g=newGame();g.dispatch({type:'travel',dungeon:'kagaribi'});g.startBattle('wild_pair_1',{win:[],lose:[],escape:[]});return g;}
for(const layout of ['scene','classic']){
  test(`${layout}: Enter advances text and focuses the first enabled choice; arrows and Enter choose once`,()=>{
    const g=story([{op:'say',text:'選んでください。'},{op:'choice',options:[{id:'locked',text:'不可',condition:false,commands:[]},{id:'first',text:'先頭',commands:[]},{id:'second',text:'二番目',commands:[{op:'say',text:'選択した。'}]}]}]);
    const c=setup(layout,g);try{
      assert.ok(c.document.activeElement.classList.contains('continue'));c.key('Enter');
      while(c.view.canChoose?.()===false)c.key('Enter');
      assert.equal(c.document.activeElement.dataset.focus,'choice:first');
      assert.ok(c.key('ArrowDown').defaultPrevented);assert.equal(c.document.activeElement.dataset.focus,'choice:second');
      c.key('Enter');assert.equal(c.view.model.dialog.text,'選択した。');assert.equal(c.intents.filter(i=>i.type==='choose').length,1);
      const count=c.intents.length;c.key('Enter',{repeat:true});assert.equal(c.intents.length,count);
    }finally{c.cleanup();}
  });
  test(`${layout}: town arrows only focus enabled buttons and repeated cancel reaches the square`,()=>{
    const g=newGame();g.dispatch({type:'location.move',id:'hikarigaeri_medical'});g.dispatch({type:'location.move',id:'hikarigaeri_medical_specimens'});
    const c=setup(layout,g);try{
      const save=g.save();for(const k of ['ArrowUp','ArrowRight','ArrowDown','ArrowLeft']){assert.ok(c.key(k).defaultPrevented);assert.equal(c.document.activeElement.tagName,'BUTTON');assert.ok(!c.document.activeElement.disabled);}assert.ok(g.save()===save);
      c.panel('bag');c.key('Enter');assert.ok(c.root.querySelector('.button-picker'));
      c.key('Escape');assert.equal(c.root.querySelector('.button-picker'),null);assert.equal(c.view.tab,'bag');
      c.key('Escape');assert.equal(c.view.tab,'location');assert.equal(g.state.townLocation,'hikarigaeri_medical_specimens');
      c.key('Escape');assert.equal(g.state.townLocation,'hikarigaeri_medical');
      c.key('Escape');assert.equal(g.state.townLocation,'hikarigaeri_square');
      const count=c.intents.length;for(let i=0;i<5;i++)c.key('Escape');assert.equal(c.intents.length,count);
    }finally{c.cleanup();}
  });
  test(`${layout}: dungeon arrows move directly; management cancels back to inspection without travel cost`,()=>{
    const g=newGame();g.dispatch({type:'travel',dungeon:'kagaribi'});const c=setup(layout,g);
    try{
      assert.equal(c.document.activeElement.dataset.focus,'command:interact');
      for(const [key,direction] of [['ArrowRight','right'],['ArrowLeft','left'],['ArrowDown','back'],['ArrowUp','forward']]){
        const count=c.intents.length;assert.ok(c.key(key).defaultPrevented);assert.equal(c.intents.length,count+1);assert.deepEqual(c.intents.at(-1),{type:'move',direction});assert.equal(c.document.activeElement.dataset.focus,'command:interact');
      }
      const save=g.save();c.panel('bag');c.key('Enter');c.key('ArrowDown');c.key('Escape');c.key('Escape');
      for(let i=0;i<5;i++)c.key('Escape');assert.equal(c.view.tab,'explore');assert.ok(g.save()===save);assert.equal(c.document.activeElement.dataset.focus,'command:interact');
      c.key('ArrowRight');assert.deepEqual(c.intents.at(-1),{type:'move',direction:'right'});
    }finally{c.cleanup();}
  });
  test(`${layout}: idle confirm always inspects despite stale command focus, and choices suspend movement`,()=>{
    const g=newGame();g.dispatch({type:'travel',dungeon:'kagaribi'});const c=setup(layout,g);
    try{
      for(const selector of ['.back','[data-focus="command:retreat"]','[data-focus="command:portable"]']){
        c.root.querySelector(selector).focus();const before=c.intents.length;c.key('Enter');assert.equal(c.intents.length,before+1);assert.deepEqual(c.intents.at(-1),{type:'player.command',id:'interact'});
        assert.equal(c.document.activeElement,c.root.querySelector('.choices button:not(:disabled)'));
        const save=g.save(),count=c.intents.length;c.key('Enter',{repeat:true});c.key('ArrowDown');c.key('w');assert.equal(c.intents.length,count);assert.equal(g.save(),save);
        c.key('Escape');assert.equal(c.document.activeElement.dataset.focus,'command:interact');
      }
    }finally{c.cleanup();}
  });
  test(`${layout}: dungeon narrative focuses its first enabled choice and resumes direct controls when finished`,()=>{
    const g=story([{op:'say',text:'分かれ道に着いた。'},{op:'choice',options:[{id:'locked',text:'不可',condition:false,commands:[]},{id:'first',text:'先頭',commands:[]},{id:'leave',text:'探索へ戻る',commands:[]}]}],true),c=setup(layout,g);
    try{
      const count=c.intents.length;c.key('ArrowRight');assert.equal(c.intents.length,count);assert.ok(c.document.activeElement.classList.contains('continue'));
      c.key('Enter');while(c.view.canChoose?.()===false)c.key('Enter');assert.equal(c.document.activeElement.dataset.focus,'choice:first');
      const location=structuredClone(g.state.location),steps=g.state.steps;c.key('ArrowDown');assert.equal(c.document.activeElement.dataset.focus,'choice:leave');assert.deepEqual(g.state.location,location);assert.equal(g.state.steps,steps);
      c.key('Enter');assert.equal(c.view.model.dialog,null);assert.equal(c.document.activeElement.dataset.focus,'command:interact');
      c.key('ArrowRight');assert.deepEqual(c.intents.at(-1),{type:'move',direction:'right'});c.key('Enter');assert.deepEqual(c.intents.at(-1),{type:'player.command',id:'interact'});
    }finally{c.cleanup();}
  });
  test(`${layout}: explicit Tab traversal can open management, and cancel or direction restores direct exploration`,()=>{
    const g=newGame();g.dispatch({type:'travel',dungeon:'kagaribi'});const c=setup(layout,g);
    try{
      assert.ok(!c.key('Tab').defaultPrevented);named(c.root,'道具').focus();c.key('Enter');assert.equal(c.view.tab,'bag');assert.equal(c.intents.length,0);
      c.key('Escape');assert.equal(c.view.tab,'explore');c.key('Tab');c.root.querySelector('.back').focus();c.key('ArrowRight');c.key('Enter');assert.deepEqual(c.intents.at(-1),{type:'player.command',id:'interact'});
    }finally{c.cleanup();}
  });
  test(`${layout}: closing record restores dungeon controls even when its opener was reached with Tab`,()=>{
    const g=newGame();g.dispatch({type:'travel',dungeon:'kagaribi'});const c=setup(layout,g),dialog=c.document.createElement('dialog');c.document.body.append(dialog);
    const controls=new SystemControls(dialog,()=>c.view.inputScope());dialog.addEventListener('close',()=>c.view.resumeExploration());
    try{
      c.key('Tab');named(c.root,'記録').focus();controls.open('記録');const option=c.document.createElement('button');option.textContent='設定';dialog.append(option);controls.finish();
      const save=g.save();controls.handleKey({key:'ArrowDown',preventDefault(){}});assert.equal(g.save(),save);
      controls.handleKey({key:'Escape',preventDefault(){}});assert.equal(c.document.activeElement.dataset.focus,'command:interact');c.key('Enter');assert.deepEqual(c.intents.at(-1),{type:'player.command',id:'interact'});
    }finally{c.cleanup();}
  });
  test(`${layout}: battle target cancellation costs nothing, second enemy selection and next turn use keys`,()=>{
    const c=setup(layout,battle());try{
      const save=c.g.save();assert.equal(c.document.activeElement.dataset.focus,'skill:attack');c.key('Enter');assert.ok(c.root.querySelector('.battle-targets'));c.key('ArrowDown');assert.ok(c.g.save()===save);
      c.key('Escape');assert.equal(c.document.activeElement.dataset.focus,'skill:attack');assert.equal(c.intents.length,0);
      c.key('Enter');c.key('ArrowDown');c.key('Enter');assert.deepEqual(c.intents.at(-1),{type:'battle',action:'skill',skill:'attack',target:'enemy_1'});assert.equal(c.document.activeElement.dataset.focus,'skill:attack');
      let n=0;while(c.g.state.battle&&n++<200)c.key('Enter');assert.ok(n<200,'battle finishes with Enter');assert.equal(c.g.state.records.wins,1);
    }finally{c.cleanup();}
  });
  test(`${layout}: battle item selects an ally and consumes once only on confirmation`,()=>{
    const g=battle();g.state.actors.sera.hp=10;const c=setup(layout,g);try{
      c.selectButton(b=>b.dataset.focus==='battle-item:potion');const count=g.state.inventory.potion;c.key('Enter');assert.equal(g.state.inventory.potion,count);
      c.selectButton(b=>b.dataset.focus==='target:sera');c.key('Enter');assert.equal(g.state.inventory.potion,count-1);assert.ok(g.state.actors.sera.hp>10);assert.equal(c.intents.at(-1).target,'sera');
    }finally{c.cleanup();}
  });
  test(`${layout}: equipment target uses a cancellable picker and equipment focus survives rerender`,()=>{
    const g=newGame();g.give('iron_sword',1);const c=setup(layout,g);try{
      c.panel('bag');const original=c.view.bagActor;c.key('Enter');c.key('ArrowDown');c.key('Escape');assert.equal(c.view.bagActor,original);
      c.key('Enter');c.key('ArrowDown');c.key('Enter');assert.equal(c.view.bagActor,'nio');assert.ok(c.document.activeElement.dataset.focus.startsWith('select:'));
      c.key('Enter');c.key('ArrowUp');c.key('Enter');assert.equal(c.view.bagActor,'ada');
      c.selectButton(b=>b.textContent==='装備する');c.key('Enter');assert.equal(g.state.actors.ada.equipment.weapon,'iron_sword');assert.equal(c.document.activeElement.tagName,'BUTTON');assert.ok(c.document.activeElement.isConnected);
    }finally{c.cleanup();}
  });
  test(`${layout}: job details and candidate selection cancel one level at a time`,()=>{
    const g=newGame();g.dispatch({type:'location.move',id:'hikarigaeri_tavern'});const c=setup(layout,g);try{
      c.panel('party');c.selectButton(b=>b.closest('summary'));c.key('Enter');assert.ok(c.root.querySelector('details').open);
      c.key('ArrowDown');assert.match(c.document.activeElement.dataset.focus,/転職先/);c.key('Enter');c.key('ArrowDown');c.key('Escape');assert.ok(c.root.querySelector('details').open);
      c.key('Escape');assert.ok(!c.root.querySelector('details').open);assert.equal(c.view.tab,'party');c.key('Escape');assert.equal(c.view.tab,'location');c.key('Escape');assert.equal(g.state.townLocation,'hikarigaeri_square');
    }finally{c.cleanup();}
  });
}

test('long choice pages require Enter before choices receive focus',()=>{
  const g=story([{op:'say',text:'長い本文を読む。'.repeat(90)},{op:'choice',options:[{id:'yes',text:'決定',commands:[]}]}]);g.dispatch({type:'advance'});const c=setup('scene',g);
  try{const save=g.save();while(!c.view.canChoose()){assert.ok(c.document.activeElement.classList.contains('continue'));c.key('Enter');assert.ok(g.save()===save);}assert.equal(c.document.activeElement.dataset.focus,'choice:yes');c.key('Enter');assert.equal(g.state.waiting,null);}finally{c.cleanup();}
});

test('cancel uses authored pause only when all script frames are finished; mandatory actions are preserved',()=>{
  for(const [id,commands,tail,expected] of [['pause',[],[],true],['leave',[],[],true],['home',[{op:'gold.change',amount:100}],[],false],['pause',[],[{op:'gold.change',amount:100}],false]]){
    const g=story([{op:'choice',options:[{id,text:'戻る',commands}]},...tail]);const c=setup('scene',g);try{assert.equal(Boolean(c.view.model.dialog.cancelId),expected);const gold=g.state.gold;c.key('Escape');assert.equal(g.state.gold,gold);assert.equal(g.state.waiting===null,expected);}finally{c.cleanup();}
  }
});

test('cancel dismisses investigation and retreat confirmation without charging resources',()=>{
  const g=newGame();g.dispatch({type:'travel',dungeon:'kagaribi'});const c=setup('scene',g);
  try{for(const id of ['interact','retreat']){const gold=g.state.gold,steps=g.state.steps,location=structuredClone(g.state.location);c.view.act({type:'player.command',id});assert.equal(c.view.model.dialog.cancelId,'cancel');c.key('Escape');assert.equal(g.state.waiting,null);assert.equal(g.state.gold,gold);assert.equal(g.state.steps,steps);assert.deepEqual(g.state.location,location);}}finally{c.cleanup();}
});

test('button navigation follows geometry, excludes disabled/inert/hidden and prevents browser scroll',()=>{
  const dom=installDOM();try{
    const make=(text,x,y)=>{const b=dom.document.createElement('button');b.textContent=text;b.getBoundingClientRect=()=>({left:x,top:y,width:80,height:30});dom.root.append(b);return b;};
    const a=make('a',0,0),b=make('b',100,0),c=make('c',0,60),disabled=make('disabled',0,35);disabled.disabled=true;const hidden=make('hidden',90,0);hidden.hidden=true;a.focus();
    const key=key=>{const e={key,preventDefault(){this.defaultPrevented=true;}};moveFocus(dom.root,e);assert.ok(e.defaultPrevented);};key('ArrowRight');assert.equal(dom.document.activeElement,b);key('ArrowLeft');assert.equal(dom.document.activeElement,a);key('ArrowDown');assert.equal(dom.document.activeElement,c);
  }finally{dom.restore();}
});

test('system dialogs preserve save-slot focus, navigate settings and cancel confirmation back to record',()=>{
  const dom=installDOM(),dialog=dom.document.createElement('dialog');dom.document.body.append(dialog);const controls=new SystemControls(dialog);let saves=0,value='scene';
  const button=(text,callback,key)=>{const b=dom.document.createElement('button');b.textContent=text;b.dataset.focus=key;b.addEventListener('click',callback);return b;};
  const close=()=>{const b=button('閉じる',()=>controls.back(),'close');b.className='modal-close';dialog.append(b);controls.finish();};
  const menu=()=>{controls.open('記録');dialog.append(button('保存1',()=>{saves++;menu();},'save1'),button('保存2',()=>{saves++;menu();},'save2'));
    const select=dom.document.createElement('select');select.setAttribute('aria-label','画面配置');select.append(new Option('背景内','scene'),new Option('従来','classic'));select.value=value;select.addEventListener('change',()=>{value=select.value;});dialog.append(select);
    dialog.append(button('新しい旅',()=>{controls.open('確認',menu);dialog.append(button('開始',()=>assert.fail('cancel must not start a new game'),'start'));close();},'new'));close();};
  const key=key=>controls.handleKey({key,preventDefault(){this.defaultPrevented=true;}});
  try{menu();key('ArrowDown');key('Enter');assert.equal(saves,1);assert.equal(dom.document.activeElement.dataset.focus,'save2');key('ArrowDown');key('Enter');key('ArrowDown');key('Enter');assert.equal(value,'classic');
    key('ArrowDown');key('Enter');assert.equal(controls.title,'確認');assert.equal(dom.document.activeElement.dataset.focus,'close');key('Escape');assert.equal(controls.title,'記録');assert.equal(dom.document.activeElement.dataset.focus,'new');key('Escape');assert.equal(dialog.open,false);
  }finally{dom.restore();}
});

test('job change keeps its detail open and preserves a connected focus after the actor card changes',()=>{
  const g=newGame();g.dispatch({type:'location.move',id:'hikarigaeri_tavern'});const c=setup('scene',g);
  try{c.panel('party');c.selectButton(b=>b.closest('summary'));c.key('Enter');c.key('ArrowDown');c.key('Enter');c.key('ArrowDown');c.key('Enter');
    c.selectButton(b=>b.textContent==='この職業へ転職');c.key('Enter');assert.notEqual(g.state.actors.ada.job,'warrior');assert.ok(c.root.querySelector('details').open);assert.ok(c.document.activeElement.isConnected);assert.ok(!c.document.activeElement.disabled);
  }finally{c.cleanup();}
});

test('a management window above battle target selection cancels before the pending action',()=>{
  const c=setup('scene',battle());try{const save=c.g.save();c.key('Enter');c.panel('bag');c.key('Escape');assert.equal(c.root.querySelector('.scene-window'),null);assert.ok(c.root.querySelector('.battle-targets'));c.key('Escape');assert.equal(c.root.querySelector('.battle-targets'),null);assert.ok(c.g.save()===save);}finally{c.cleanup();}
});

test('unavailable battle targets are skipped and cancellation never escapes an encounter',()=>{
  const c=setup('scene',battle());try{
    const model=structuredClone(c.view.model);model.battle.skills[0].availability.enemy_0={enabled:false,reason:'対象外'};c.view.render(model);c.key('Enter');assert.equal(c.document.activeElement.dataset.focus,'target:enemy_1');
    for(let i=0;i<5;i++)c.key('Escape');assert.equal(c.intents.length,0);assert.ok(c.g.state.battle);
  }finally{c.cleanup();}
});

test('safe cancellation can close a long command confirmation before its final display page',()=>{
  const g=newGame();g.dispatch({type:'travel',dungeon:'kagaribi'});g.dispatch({type:'player.command',id:'retreat'});const c=setup('scene',g);
  try{const m=structuredClone(c.view.model);m.dialog.text='帰還費用を確認する。'.repeat(80);c.view.render(m);assert.equal(c.view.canChoose(),false);const gold=g.state.gold;c.key('Escape');assert.equal(g.state.waiting,null);assert.equal(g.state.mode,'dungeon');assert.equal(g.state.gold,gold);}finally{c.cleanup();}
});
