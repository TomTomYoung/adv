import {restoreGame} from './application/restore.js';
import {loadContent} from './core/loader.js';
import {GameEngine} from './core/engine.js';
import {projectGame} from './application/projection.js';
import {replaceView,VIEW_LAYOUTS,normalizeLayout} from './view/view-layout.js';
import {handleGameKey} from './view/keyboard.js';
import {SystemControls} from './view/system-controls.js';
import {GameAudio} from './application/audio.js';
import {applyTheme,THEME_DEFAULT} from './view/theme.js';
const root=document.querySelector('#app'),dialog=document.querySelector('#system-dialog'),statusElement=document.querySelector('#system-status');
const systemControls=new SystemControls(dialog,()=>view?.inputScope());
const PREFIX='lantern-archive:v1:';
const make=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const btn=(text,fn)=>{const b=make('button',text);b.type='button';b.addEventListener('click',fn);return b;};
let engine,view,data,lastModel,statusTimer,settings={volume:.5,seVolume:.8,effects:'full',sound:false,theme:THEME_DEFAULT,viewLayout:'scene'};
const sound=new GameAudio({onChange:label=>view?.updateSound(label)});
function status(text){statusElement.textContent=text;clearTimeout(statusTimer);statusTimer=setTimeout(()=>{statusElement.textContent='';},9000);}
function storageRead(key){try{return localStorage.getItem(PREFIX+key);}catch{status('このブラウザでは自動保存を使えません。「記録」からファイルへ書き出してください。');return null;}}
function storageWrite(key,value){try{localStorage.setItem(PREFIX+key,value);return true;}catch{status('保存できませんでした。保存領域を確認するか、記録ファイルを書き出してください。');return false;}}
function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=make('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function modal(title,parent=null){systemControls.open(title,parent);syncSystemPlacement();}
function syncSystemPlacement(){
  const stage=root.querySelector('.scene-stage');dialog.classList.toggle('scene-system-dialog',Boolean(stage));statusElement.classList.toggle('scene-system-status',Boolean(stage));
  if(!stage)return;
  const r=stage.getBoundingClientRect(),left=Math.max(8,r.left+12),top=Math.max(8,r.top+12),width=Math.max(200,Math.min(680,r.width-24)),height=Math.max(100,Math.min(r.height-24,innerHeight-top-8));
  dialog.style.setProperty('--scene-modal-left',`${left+Math.max(0,(r.width-24-width)/2)}px`);dialog.style.setProperty('--scene-modal-top',`${top}px`);dialog.style.setProperty('--scene-modal-width',`${width}px`);dialog.style.setProperty('--scene-modal-height',`${height}px`);
  statusElement.style.setProperty('--scene-status-left',`${left}px`);statusElement.style.setProperty('--scene-status-bottom',`${Math.max(8,innerHeight-r.bottom+12)}px`);statusElement.style.setProperty('--scene-status-width',`${r.width-24}px`);
}
function closeButton(){dialog.append(btn(systemControls.parent?'戻る':'閉じる',()=>systemControls.back()));dialog.lastChild.className='modal-close';systemControls.finish();}
function syncAudio(){sound.configure(settings.sound,settings.volume,settings.seVolume);sound.sync(lastModel);}
function toggleSound(){
  if(settings.sound&&['blocked','error'].includes(sound.state))sound.retry();
  else{settings.sound=!settings.sound;syncAudio();}
  storageWrite('settings',JSON.stringify(settings));view.updateSound(sound.label());
  if(settings.sound)status('探索・戦闘BGMを再生します。音量は「記録」で調整できます。');
}
function render(){lastModel=projectGame(engine);view.render(lastModel);syncSystemPlacement();syncAudio();}
function dispatch(intent){try{const changed=engine.dispatch(intent);if(changed)storageWrite('auto',engine.save());if(changed||engine.feedback.events.length||engine.state.notice)render();return changed;}catch(error){status(`操作を完了できませんでした：${error.message}`);return false;}}
function restore(text){const result=restoreGame(data,text);engine=result.engine;storageWrite('auto',engine.save());dialog.close();render();status(result.message);}
function menu(){
  modal('旅の記録');dialog.append(make('p','会話・選択肢・戦闘の途中も保存できます。記録はこのブラウザに保存されます。'));
  for(let i=1;i<=3;i++){const row=make('div');row.className='modal-row';row.dataset.controlGroup=`save:${i}`;const existing=storageRead(`slot${i}`);row.append(make('span',`記録 ${i}${existing?' / 保存あり':' / 空き'}`),btn('ここへ保存',()=>{if(storageWrite(`slot${i}`,engine.save())){status(`記録${i}へ保存しました。`);menu();}}));const load=btn('読み込む',()=>{const saved=storageRead(`slot${i}`);if(saved)restore(saved);});load.disabled=!existing;row.append(load);dialog.append(row);}
  const row=make('div');row.className='modal-row';row.append(btn('記録ファイルを書き出す',()=>download('lantern-archive-save.json',engine.save())));dialog.append(row);
  const label=make('label','記録ファイルを読み込む'),input=make('input');input.type='file';input.accept='.json,application/json';input.addEventListener('change',async()=>{const f=input.files[0];if(!f)return;if(f.size>data.system.maxSaveBytes){restore(null);return;}try{restore(await f.text());}catch{restore(null);}});label.append(input);dialog.append(label);
  const section=make('div');section.className='modal-section';const volumeLabel=make('label','音量'),volume=make('input');volume.type='range';volume.min='0';volume.max='100';volume.value=String(settings.volume*100);volume.addEventListener('input',()=>{settings.volume=Number(volume.value)/100;storageWrite('settings',JSON.stringify(settings));syncAudio();});volumeLabel.append(volume);section.append(volumeLabel,make('p','音量0は消音です。右上の「音：再生中」で再生状態を確認できます。'));
  const seLabel=make('label','SE音量'),seVolume=make('input');seVolume.type='range';seVolume.min='0';seVolume.max='100';seVolume.value=String(settings.seVolume*100);seVolume.addEventListener('input',()=>{settings.seVolume=Number(seVolume.value)/100;storageWrite('settings',JSON.stringify(settings));syncAudio();});seLabel.append(seVolume);section.append(seLabel);
  const motionLabel=make('label','画面演出'),motion=make('select');motion.setAttribute('aria-label','画面演出');for(const [id,name] of [['full','通常'],['reduced','動きを控える'],['off','切']])motion.append(new Option(name,id));motion.value=settings.effects;motion.addEventListener('change',()=>{settings.effects=motion.value;storageWrite('settings',JSON.stringify(settings));render();});motionLabel.append(motion);section.append(motionLabel);
  const layoutLabel=make('label','画面配置'),layout=make('select');layout.setAttribute('aria-label','画面配置');for(const [id,name] of Object.entries(VIEW_LAYOUTS))layout.append(new Option(name,id));layout.value=settings.viewLayout;
  layout.addEventListener('change',()=>{settings.viewLayout=normalizeLayout(layout.value);storageWrite('settings',JSON.stringify(settings));view=replaceView(view,settings.viewLayout,root,dispatch,viewUi);render();});layoutLabel.append(layout);section.append(layoutLabel);
  const skin=make('label','画面テーマを読み込む'),skinFile=make('input');skinFile.type='file';skinFile.accept='.json';skinFile.addEventListener('change',async()=>{try{if(!skinFile.files[0]||skinFile.files[0].size>10000)throw Error('テーマファイルが大きすぎます');settings.theme=applyTheme(JSON.parse(await skinFile.files[0].text()));storageWrite('settings',JSON.stringify(settings));status('画面テーマを適用しました。');}catch(e){status(e.message);}});skin.append(skinFile);section.append(skin);
  const link=make('a','画面デザイン用プレビュー');link.href='view-preview.html';link.target='_blank';link.rel='noopener';section.append(link);dialog.append(section);
  dialog.append(btn('最初から始める',()=>{modal('新しい隊で始めますか',menu);dialog.append(make('p','自動記録は新しい旅で置き換わります。記録1〜3と書き出したファイルは残ります。'),btn('新しい旅を始める',()=>{engine=new GameEngine(data);storageWrite('auto',engine.save());dialog.close();render();}));closeButton();}));closeButton();
}
function help(){modal('遊び方');for(const paragraph of [
 '1. 町の依頼掲示板で受注します。複数受注でき、メインクエストを切り替えられます。最初の依頼「帰らない灯番」は篝火の迷宮で進めます。',
 '2. 矢印キーでボタンを選び、Enterで決定、Escで一段戻ります。町では広場まで、ダンジョンでは管理画面を閉じて探索へ戻れます。探索の移動・方向変更・調べるも矢印とEnterで操作できます。WASD移動・E調査も使えます。',
 '3. 強制イベントは指定セルを踏むと自動的に始まります。壁松明などの任意調査はEか「調べる」で行います。人物の応答と選んだ行為が次の場面を決めます。一部の作業には縄や戦闘が必要です。結末はやり直せません。別の記録で比較できます。',
 '4. 素早い味方から1人ずつ行動し、その後に敵が動きます。行動を決めてから敵・仲間を矢印で選び、Enterで対象を決定します。対象選択はEscで戻れます。毒は移動・ターン終了時にダメージ。防御は敵の行動終了まで有効です。',
 '5. 旅支度で補給・装備、酒場で10人から最大5人を編成し、宿・無料施療所を利用。待機中もHP・MP・装備は残ります。入口から無料帰還、帰還印は原則所持金8%（同行する生存巡礼者で半額）、全滅時は15%を失います。依頼と手掛かりは残ります。',
 '6. 酒場の各人物にある「職業・成長」を開くと30職へ無料で転職できます。人物の負傷と過去の成長は残り、装備できない品は袋へ戻ります。技能は隊Lv1・5・10で解放。探索特技は隊の状態から使用できます。',
 '7. 行動後に自動保存。「記録」で3枠への手動保存とファイル入出力ができます。ブラウザのデータ削除に備え、長い旅はファイルにも保存してください。',
 '8. 各地域の第10依頼は同地域3件完了で解放。最終依頼「百の帰還」は他の99件完了で解放されます。依頼によって結末の数と条件が異なります。'
])dialog.append(make('p',paragraph));closeButton();}

const viewUi={menu,help,status,modalOpen:()=>dialog.open,layoutChanged:syncSystemPlacement,cancelFeedback:()=>sound.stopEffects(),effectsMode:()=>settings.effects,soundEnabled:()=>settings.sound,soundLabel:()=>sound.label(),sound:toggleSound};
try{
  const savedSettings=storageRead('settings');if(savedSettings){try{const parsed=JSON.parse(savedSettings);settings.sound=parsed.sound===true;settings.seVolume=Number.isFinite(parsed.seVolume)?Math.max(0,Math.min(1,parsed.seVolume)):.8;settings.effects=['full','reduced','off'].includes(parsed.effects)?parsed.effects:'full';settings.volume=Number.isFinite(parsed.volume)?Math.max(0,Math.min(1,parsed.volume)):.5;settings.theme=applyTheme(parsed.theme??THEME_DEFAULT);}catch{applyTheme(THEME_DEFAULT);}}else applyTheme(THEME_DEFAULT);
  if(savedSettings){try{settings.viewLayout=normalizeLayout(JSON.parse(savedSettings).viewLayout);}catch{settings.viewLayout='scene';}}
  data=await loadContent();sound.preload(Object.values(data.sounds??{}).map(s=>data.assets.audio[s.asset]));engine=new GameEngine(data);
  const autosave=storageRead('auto');if(autosave!==null){const result=restoreGame(data,autosave);engine=result.engine;if(result.restarted){storageWrite('auto',engine.save());status(result.message);}}
  view=replaceView(null,settings.viewLayout,root,dispatch,viewUi);render();
  document.addEventListener('keydown',event=>{if(!systemControls.handleKey(event))handleGameKey(event,{view,model:lastModel,dispatch});});
  addEventListener('resize',syncSystemPlacement);addEventListener('scroll',syncSystemPlacement,{passive:true});
}catch(error){root.replaceChildren();const message=make('div',`起動できませんでした。\n${error.message}\n\nHTTPサーバーまたはGitHub Pagesで開き、data/以下のファイルが揃っているか確認してください。`);message.className='fatal';message.setAttribute('role','alert');root.append(message);}
