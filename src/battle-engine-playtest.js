import {loadContent} from './core/loader.js';
import {createTesterEngine,testerPreset} from './application/battle-tester-model.js';
import {projectGame} from './application/projection.js';
import {SceneView} from './view/scene-view.js';
import {GameView} from './view/view.js';
import {handleGameKey} from './view/keyboard.js';
import {applyTheme,THEME_DEFAULT} from './view/theme.js';

const $=id=>document.getElementById(id),root=$('app'),embedded=window.parent!==window;
document.body.classList.toggle('embedded',embedded);
applyTheme(THEME_DEFAULT);
let engine,view,config,request=0,layout='scene';
function reply(type,message){if(embedded)window.parent.postMessage({type:'adv:battle-tester:'+type,request,message},location.origin);}
function status(message){$('playtest-status').textContent=message;reply('status',message);}
const ui={
  status,
  menu:()=>status('試遊中です。編成の変更や再戦はバトルテスターの「実エンジンへロード」から行えます。'),
  help:()=>status('本編と同じ戦闘操作です。コマンドと対象を選んで決定。方向キーで選択、Enterで決定、Escで取消。'),
  keyHint:()=> '方向キー 選択 / Enter 決定 / Esc 取消',
  modalOpen:()=>false,cancelFeedback(){},effectsMode:()=> 'off',soundEnabled:()=>false,
  soundLabel:()=> '音：切',sound:()=>status('試遊画面では音声を切っています。'),layoutChanged(){},
};
function render(){
  const model=projectGame(engine);
  if(model.battle?.frontline&&config.presentation)model.battle.frontline.presentation=structuredClone(config.presentation);
  view.render(model);
  window.battlePlaytest={engine,view,config,model,dispatch,load,render,layout,request};
}
function dispatch(intent){
  const changed=engine.dispatch(intent);render();
  if(!engine.state.battle)status(engine.state.battleResult?'戦闘に勝利しました。報酬を確認するか、同じ設定をロードして再戦できます。':'戦闘が終了しました。同じ設定をロードして再戦できます。');
  return changed;
}
function setLayout(next){
  layout=next==='normal'?'normal':'scene';$('layout').value=layout;
  if(!engine)return;
  view?.destroy();root.dataset.view=layout;
  view=new (layout==='scene'?SceneView:GameView)(root,dispatch,ui);render();
}
function load(next,nextLayout=layout){
  try{
    const candidate=structuredClone(next),nextEngine=createTesterEngine(base,candidate,{manualTurns:false});
    config=candidate;engine=nextEngine;setLayout(nextLayout);
    const message=`${config.mode}を本編の画面へロードしました。敵は自動で行動します。`;
    status(message);reply('loaded',message);return true;
  }catch(error){status(error.message);reply('error',error.message);return false;}
}
$('restart').addEventListener('click',()=>{if(config)load(config);});
$('layout').addEventListener('change',()=>setLayout($('layout').value));
document.addEventListener('keydown',event=>{
  if(!engine||!view||event.target?.closest('#playtest-controls'))return;
  handleGameKey(event,{view,model:view.model,dispatch,modalOpen:false});
});
let base;
try{
  base=await loadContent();
  window.addEventListener('message',event=>{
    if(!embedded||event.origin!==location.origin||event.source!==window.parent)return;
    const m=event.data;
    if(m?.type==='adv:battle-tester:connect'){reply('ready');return;}
    if(m?.type==='adv:battle-tester:load'){request=m.request;load(m.config,m.layout);}
    else if(m?.type==='adv:battle-tester:layout')setLayout(m.layout);
  });
  if(embedded)reply('ready');else load(testerPreset(base));
}catch(error){status(error.message);reply('error',error.message);}
