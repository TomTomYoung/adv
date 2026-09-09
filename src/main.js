import {loadContent} from './core/loader.js';
import {GameEngine} from './core/engine.js';
import {projectGame} from './application/projection.js';
import {GameView} from './view/view.js';
import {GameAudio} from './application/audio.js';
import {applyTheme,THEME_DEFAULT} from './view/theme.js';
const root=document.querySelector('#app'),dialog=document.querySelector('#system-dialog'),statusElement=document.querySelector('#system-status');
const PREFIX='lantern-archive:v1:';
const make=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const btn=(text,fn)=>{const b=make('button',text);b.type='button';b.addEventListener('click',fn);return b;};
let engine,view,data,lastModel,statusTimer,settings={volume:.5,seVolume:.8,effects:'full',sound:false,theme:THEME_DEFAULT};
const sound=new GameAudio({onChange:label=>view?.updateSound(label)});
function status(text){statusElement.textContent=text;clearTimeout(statusTimer);statusTimer=setTimeout(()=>{statusElement.textContent='';},9000);}
function storageRead(key){try{return localStorage.getItem(PREFIX+key);}catch{status('このブラウザでは自動保存を使えません。「記録」からファイルへ書き出してください。');return null;}}
function storageWrite(key,value){try{localStorage.setItem(PREFIX+key,value);return true;}catch{status('保存できませんでした。保存領域を確認するか、記録ファイルを書き出してください。');return false;}}
function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=make('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function modal(title){dialog.replaceChildren();const h=make('h2',title);h.id='dialog-title';dialog.append(h);if(!dialog.open)dialog.showModal();}
function closeButton(){dialog.append(btn('閉じる',()=>dialog.close()));dialog.lastChild.className='modal-close';}
function syncAudio(){sound.configure(settings.sound,settings.volume,settings.seVolume);sound.sync(lastModel);}
function toggleSound(){
  if(settings.sound&&['blocked','error'].includes(sound.state))sound.retry();
  else{settings.sound=!settings.sound;syncAudio();}
  storageWrite('settings',JSON.stringify(settings));view.updateSound(sound.label());
  if(settings.sound)status('探索・戦闘BGMを再生します。音量は「記録」で調整できます。');
}
function render(){lastModel=projectGame(engine);view.render(lastModel);syncAudio();}
function dispatch(intent){try{const changed=engine.dispatch(intent);if(changed)storageWrite('auto',engine.save());if(changed||engine.feedback.events.length)render();return changed;}catch(error){status(`操作を完了できませんでした：${error.message}`);return false;}}
function restore(text){try{engine.load(text);storageWrite('auto',engine.save());dialog.close();render();status('記録を読み込みました。');}catch(error){status(error.message);}}
function menu(){
  modal('旅の記録');dialog.append(make('p','会話・選択肢・戦闘の途中も保存できます。記録はこのブラウザに保存されます。'));
  for(let i=1;i<=3;i++){const row=make('div');row.className='modal-row';const existing=storageRead(`slot${i}`);row.append(make('span',`記録 ${i}${existing?' / 保存あり':' / 空き'}`),btn('ここへ保存',()=>{if(storageWrite(`slot${i}`,engine.save())){status(`記録${i}へ保存しました。`);menu();}}));const load=btn('読み込む',()=>{const saved=storageRead(`slot${i}`);if(saved)restore(saved);});load.disabled=!existing;row.append(load);dialog.append(row);}
  const row=make('div');row.className='modal-row';row.append(btn('記録ファイルを書き出す',()=>download('lantern-archive-save.json',engine.save())));dialog.append(row);
  const label=make('label','記録ファイルを読み込む'),input=make('input');input.type='file';input.accept='.json,application/json';input.addEventListener('change',async()=>{const f=input.files[0];if(!f)return;if(f.size>data.system.maxSaveBytes){status('記録ファイルが大きすぎます。');return;}restore(await f.text());});label.append(input);dialog.append(label);
  const section=make('div');section.className='modal-section';const volumeLabel=make('label','音量'),volume=make('input');volume.type='range';volume.min='0';volume.max='100';volume.value=String(settings.volume*100);volume.addEventListener('input',()=>{settings.volume=Number(volume.value)/100;storageWrite('settings',JSON.stringify(settings));syncAudio();});volumeLabel.append(volume);section.append(volumeLabel,make('p','音量0は消音です。右上の「音：再生中」で再生状態を確認できます。'));
  const seLabel=make('label','SE音量'),seVolume=make('input');seVolume.type='range';seVolume.min='0';seVolume.max='100';seVolume.value=String(settings.seVolume*100);seVolume.addEventListener('input',()=>{settings.seVolume=Number(seVolume.value)/100;storageWrite('settings',JSON.stringify(settings));syncAudio();});seLabel.append(seVolume);section.append(seLabel);
  const motionLabel=make('label','画面演出'),motion=make('select');for(const [id,name] of [['full','通常'],['reduced','動きを控える'],['off','切']])motion.append(new Option(name,id));motion.value=settings.effects;motion.addEventListener('change',()=>{settings.effects=motion.value;storageWrite('settings',JSON.stringify(settings));render();});motionLabel.append(motion);section.append(motionLabel);
  const skin=make('label','画面テーマを読み込む'),skinFile=make('input');skinFile.type='file';skinFile.accept='.json';skinFile.addEventListener('change',async()=>{try{if(!skinFile.files[0]||skinFile.files[0].size>10000)throw Error('テーマファイルが大きすぎます');settings.theme=applyTheme(JSON.parse(await skinFile.files[0].text()));storageWrite('settings',JSON.stringify(settings));status('画面テーマを適用しました。');}catch(e){status(e.message);}});skin.append(skinFile);section.append(skin);
  const link=make('a','画面デザイン用プレビュー');link.href='view-preview.html';link.target='_blank';link.rel='noopener';section.append(link);dialog.append(section);
  dialog.append(btn('最初から始める',()=>{modal('新しい隊で始めますか');dialog.append(make('p','自動記録は新しい旅で置き換わります。記録1〜3と書き出したファイルは残ります。'),btn('新しい旅を始める',()=>{engine=new GameEngine(data);storageWrite('auto',engine.save());dialog.close();render();}));closeButton();}));closeButton();
}
function help(){modal('遊び方');for(const paragraph of [
 '1. 町の依頼掲示板で受注します。複数受注でき、追跡する依頼を切り替えられます。最初は地下水道から進めると戦いやすくなります。',
 '2. W/Sまたは前後ボタンで移動、A/Dで方向を変えます。Eか「調べる」で足元と正面を調べます。追跡欄の座標は横・縦の順です。',
 '3. ?で手掛かり、!で決着を選びます。手掛かり2つで事情を踏まえた選択が解放されます。一部は縄や戦闘も必要です。結末はやり直せません。別の記録で比較できます。',
 '4. 素早い味方から1人ずつ行動し、その後に敵が動きます。敵の絵で攻撃対象、選択欄で回復対象を指定。毒は移動・ターン終了時にダメージ。防御は敵の行動終了まで有効です。',
 '5. 旅支度で補給・装備、酒場で10人から最大5人を編成し、宿・無料施療所を利用。待機中もHP・MP・装備は残ります。入口から無料帰還、帰還印は所持金8%、全滅時は15%を失います。依頼と手掛かりは残ります。',
 '6. 行動後に自動保存。「記録」で3枠への手動保存とファイル入出力ができます。ブラウザのデータ削除に備え、長い旅はファイルにも保存してください。',
 '7. 各地域の第10依頼は同地域3件完了で解放。最終依頼「百の帰還」は他の99件完了で解放されます。すべてに3つの結末があります。'
])dialog.append(make('p',paragraph));closeButton();}
function retreat(){modal('帰還印を使いますか');dialog.append(make('p',`救援費は${Math.ceil(engine.state.gold*data.system.retreatGoldRate)}Gです。受注中の依頼と手掛かりはそのまま残ります。`),btn('帰還する',()=>{dialog.close();dispatch({type:'retreat'});}));closeButton();}
try{
  const savedSettings=storageRead('settings');if(savedSettings){try{const parsed=JSON.parse(savedSettings);settings.sound=parsed.sound===true;settings.seVolume=Number.isFinite(parsed.seVolume)?Math.max(0,Math.min(1,parsed.seVolume)):.8;settings.effects=['full','reduced','off'].includes(parsed.effects)?parsed.effects:'full';settings.volume=Number.isFinite(parsed.volume)?Math.max(0,Math.min(1,parsed.volume)):.5;settings.theme=applyTheme(parsed.theme??THEME_DEFAULT);}catch{applyTheme(THEME_DEFAULT);}}else applyTheme(THEME_DEFAULT);
  data=await loadContent();sound.preload(Object.values(data.sounds??{}).map(s=>data.assets.audio[s.asset]));engine=new GameEngine(data);
  const autosave=storageRead('auto');if(autosave){try{engine.load(autosave);}catch(error){status(`自動記録は読み込めませんでした。手動記録やファイルを読み込めます。${error.message}`);}}
  view=new GameView(root,dispatch,{menu,help,retreat,status,cancelFeedback:()=>sound.stopEffects(),effectsMode:()=>settings.effects,soundEnabled:()=>settings.sound,soundLabel:()=>sound.label(),sound:toggleSound});render();
  document.addEventListener('keydown',event=>{
    if(dialog.open||event.ctrlKey||event.metaKey||event.altKey||['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
    if(event.key==='Escape'){event.preventDefault();menu();return;}
    if(engine.state.waiting?.type==='text'&&['Enter',' '].includes(event.key)&&document.activeElement?.tagName!=='BUTTON'){event.preventDefault();dispatch({type:'advance'});return;}
    if(engine.state.waiting?.type==='choice'&&/^[1-9]$/.test(event.key)){const o=lastModel.dialog.options[Number(event.key)-1];if(o?.enabled){event.preventDefault();dispatch({type:'choose',id:o.id});}return;}
    if(engine.state.waiting||view.tab!=='explore')return;
    const movement={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'}[event.key];
    if(movement){event.preventDefault();dispatch({type:'move',direction:movement});}else if(event.key.toLowerCase()==='e'){event.preventDefault();dispatch({type:'interact'});}
  });
}catch(error){root.replaceChildren();const message=make('div',`起動できませんでした。\n${error.message}\n\nHTTPサーバーまたはGitHub Pagesで開き、data/以下のファイルが揃っているか確認してください。`);message.className='fatal';message.setAttribute('role','alert');root.append(message);}
