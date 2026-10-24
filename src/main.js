import {PresentationClock} from './application/presentation-clock.js';
import {ScenarioEditionSession} from './application/scenario-editions.js';
import {loadContent} from './core/loader.js';
import {runtimeReader,versionRuntimeAssets} from './application/runtime-content.js';
import {projectGame} from './application/projection.js';
import {replaceView,VIEW_LAYOUTS,normalizeLayout} from './view/view-layout.js';
import {handleGameKey} from './view/keyboard.js';
import {SystemControls} from './view/system-controls.js';
import {bindingLabel,inputHint,readKeyConfig} from './view/key-bindings.js';
import {openKeyConfig} from './view/key-config.js';
import {GameAudio} from './application/audio.js';
import {applyTheme,THEME_DEFAULT} from './view/theme.js';
const root=document.querySelector('#app'),dialog=document.querySelector('#system-dialog'),statusElement=document.querySelector('#system-status');
const systemControls=new SystemControls(dialog,()=>view?.inputScope(),()=>settings.keyBindings.bindings);
dialog.addEventListener('close',()=>{view?.resumeExploration();syncPresentationClock();});
document.addEventListener('visibilitychange',()=>syncPresentationClock());
const PREFIX='lantern-archive:v1:';
const make=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const btn=(text,fn)=>{const b=make('button',text);b.type='button';b.addEventListener('click',fn);return b;};
let engine,view,data,lastModel,statusTimer,editionSession,editionActionPending=false,settings={volume:.5,seVolume:.8,effects:'full',sound:false,theme:THEME_DEFAULT,viewLayout:'scene',keyBindings:readKeyConfig().config};
const sound=new GameAudio({onChange:label=>view?.updateSound(label)});
function status(text){statusElement.textContent=text;clearTimeout(statusTimer);statusTimer=setTimeout(()=>{statusElement.textContent='';},9000);}
function storageRead(key){try{return localStorage.getItem(PREFIX+key);}catch{status('このブラウザでは自動保存を使えません。「記録」からファイルへ書き出してください。');return null;}}
function storageWrite(key,value){try{localStorage.setItem(PREFIX+key,value);return true;}catch{status('保存できませんでした。保存領域を確認するか、記録ファイルを書き出してください。');return false;}}
function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=make('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function modal(title,parent=null){systemControls.open(title,parent);syncSystemPlacement();syncPresentationClock();}
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
const presentationClock=new PresentationClock(intent=>dispatch(intent));
function syncPresentationClock(){presentationClock.sync(lastModel?.presentationWait,dialog.open||document.hidden||editionActionPending||Boolean(editionSession?.busy));}
function render(){lastModel=projectGame(engine);lastModel.feedback.startedAt=performance.now();view.render(lastModel);syncSystemPlacement();syncAudio();syncPresentationClock();}
function dispatch(intent){
  if(editionActionPending||editionSession?.busy)return false;
  if(editionSession?.requiresRecovery){status('自動記録を保護しています。「記録」から再開方法を選んでください。');return false;}
  try{const changed=engine.dispatch(intent);if(changed){try{editionSession.autosave();}catch(error){status(error.message);}}if(changed||engine.feedback.events.length||engine.state.notice)render();return changed;}catch(error){status(`操作を完了できませんでした：${error.message}`);return false;}
}
function adoptEditionSession(){
  data=editionSession.data;engine=editionSession.engine;
  sound.preload(Object.values(data.sounds??{}).map(s=>data.assets.audio[s.asset]));
  view?.destroy();view=replaceView(null,settings.viewLayout,root,dispatch,viewUi);render();
}
async function editionAction(action,{keepMenu=false,message='記録を読み込みました。'}={}){
  if(editionActionPending||editionSession.busy){status('シナリオ版を読み込み中です。完了するまでお待ちください。');return false;}
  editionActionPending=true;sound.stopEffects();syncPresentationClock();
  const controls=[...dialog.querySelectorAll('button,input,select')].map(element=>({element,disabled:element.disabled}));for(const {element} of controls)element.disabled=true;
  status('シナリオと記録を読み込んでいます。');
  try{
    await action();adoptEditionSession();
    if(keepMenu)menu();else dialog.close();
    status(typeof message==='function'?message():message);return true;
  }catch(error){status(`読み込みを完了できませんでした。現在の旅と記録は変更していません。 ${error.message}`);return false;}
  finally{editionActionPending=false;for(const {element,disabled} of controls)if(element.isConnected){element.disabled=disabled;if(element.id==='scenario-edition')element.value=editionSession.preference;}syncPresentationClock();}
}
function menu(){
  modal('旅の記録');dialog.append(make('p','会話・選択肢・戦闘の途中も保存できます。記録はこのブラウザに保存されます。'));
  if(globalThis.advRuntime)dialog.append(make('p',`更新ID：${globalThis.advRuntime.manifest.revision.slice(0,12)}`));
  const currentEdition=make('p',`現在プレイ中：${editionSession.label()}`);currentEdition.id='scenario-edition-current';dialog.append(currentEdition);
  const editionLabel=make('label','シナリオ版'),editionSelect=make('select');editionLabel.htmlFor='scenario-edition';editionSelect.id='scenario-edition';editionSelect.setAttribute('aria-label','シナリオ版');
  editionSelect.append(new Option(`最新版を自動選択（現在：${editionSession.label(editionSession.catalog.latest)}）`,'latest'));
  for(const [id,definition] of Object.entries(editionSession.catalog.editions))editionSelect.append(new Option(definition.label,id));editionSelect.value=editionSession.preference;
  const changeEdition=()=>editionAction(()=>editionSession.switchEdition(editionSelect.value),{keepMenu:true,message:()=>`${editionSession.label()}の旅を再開しました。`});
  editionSelect.addEventListener('change',changeEdition);editionLabel.append(editionSelect);dialog.append(editionLabel,btn('この版で再開',changeEdition),make('p','選んだ版の続きに切り替えます。新しい旅もこの選択に従います。起動し直すと、最後に遊んでいた版の続きを再開します。'));
  if(editionSession.requiresRecovery)dialog.append(make('p','この版の自動記録を読み込めなかったため保護しています。保存枠・ファイルを読み込むか、別の版へ切り替えるか、新しい旅を始めてください。'));
  for(let i=1;i<=3;i++){
    const row=make('div');row.className='modal-row';row.dataset.controlGroup=`save:${i}`;let existing=null;try{existing=editionSession.readSlot(i);}catch(error){status(`保存枠を読み取れませんでした。 ${error.message}`);}
    row.append(make('span',`記録 ${i}${existing!==null?' / 保存あり':' / 空き'}`),btn('ここへ保存',()=>{try{editionSession.saveSlot(i);status(`${editionSession.label()}の記録${i}へ保存しました。`);menu();}catch(error){status(error.message);}}));
    const load=btn('読み込む',()=>editionAction(()=>editionSession.loadSlot(i)));load.disabled=existing===null;row.append(load);dialog.append(row);
  }
  const row=make('div');row.className='modal-row';row.append(btn(editionSession.requiresRecovery?'保護中の記録を書き出す':'記録ファイルを書き出す',()=>{
    try{const text=editionSession.exportSave();download(`lantern-archive-${editionSession.activeEdition}-${editionSession.requiresRecovery?'protected-':''}save.json`,text);}
    catch(error){status(`記録を書き出せませんでした。 ${error.message}`);}
  }));dialog.append(row);
  const label=make('label','記録ファイルを読み込む'),input=make('input');input.type='file';input.accept='.json,application/json';input.addEventListener('change',()=>{const f=input.files[0];if(!f)return;editionAction(async()=>{if(f.size>data.system.maxSaveBytes)throw Error('記録ファイルが大きすぎます。');await editionSession.importSave(await f.text());});});label.append(input);dialog.append(label);
  const battleLabel=make('label','戦闘方式'),battleMode=make('select');battleMode.setAttribute('aria-label','戦闘方式');for(const [id,name] of [['auto','自動（遭遇設定に従う）'],['classic','従来式'],['grid','Grid（位置・射程）'],['frontline','Frontline（前中後衛）']])battleMode.append(new Option(name,id));battleMode.value=lastModel.battleModePreference;battleMode.disabled=lastModel.busy;battleMode.addEventListener('change',()=>dispatch({type:'battle.mode.set',mode:battleMode.value}));battleLabel.append(battleMode);dialog.append(battleLabel,make('p','次の戦闘から反映します。戦闘側で指定された方式が優先されます。'));
  const section=make('div');section.className='modal-section';const volumeLabel=make('label','音量'),volume=make('input');volume.type='range';volume.min='0';volume.max='100';volume.value=String(settings.volume*100);volume.addEventListener('input',()=>{settings.volume=Number(volume.value)/100;storageWrite('settings',JSON.stringify(settings));syncAudio();});volumeLabel.append(volume);section.append(volumeLabel,make('p','音量0は消音です。右上の「音：再生中」で再生状態を確認できます。'));
  const seLabel=make('label','SE音量'),seVolume=make('input');seVolume.type='range';seVolume.min='0';seVolume.max='100';seVolume.value=String(settings.seVolume*100);seVolume.addEventListener('input',()=>{settings.seVolume=Number(seVolume.value)/100;storageWrite('settings',JSON.stringify(settings));syncAudio();});seLabel.append(seVolume);section.append(seLabel);
  const motionLabel=make('label','画面演出'),motion=make('select');motion.setAttribute('aria-label','画面演出');for(const [id,name] of [['full','通常'],['reduced','動きを控える'],['off','切']])motion.append(new Option(name,id));motion.value=settings.effects;motion.addEventListener('change',()=>{settings.effects=motion.value;storageWrite('settings',JSON.stringify(settings));render();});motionLabel.append(motion);section.append(motionLabel);
  const layoutLabel=make('label','画面配置'),layout=make('select');layout.setAttribute('aria-label','画面配置');for(const [id,name] of Object.entries(VIEW_LAYOUTS))layout.append(new Option(name,id));layout.value=settings.viewLayout;
  layout.addEventListener('change',()=>{settings.viewLayout=normalizeLayout(layout.value);storageWrite('settings',JSON.stringify(settings));view=replaceView(view,settings.viewLayout,root,dispatch,viewUi);render();});layoutLabel.append(layout);section.append(layoutLabel);section.append(btn('キー設定',keyConfig));
  const skin=make('label','画面テーマを読み込む'),skinFile=make('input');skinFile.type='file';skinFile.accept='.json';skinFile.addEventListener('change',async()=>{try{if(!skinFile.files[0]||skinFile.files[0].size>10000)throw Error('テーマファイルが大きすぎます');settings.theme=applyTheme(JSON.parse(await skinFile.files[0].text()));storageWrite('settings',JSON.stringify(settings));status('画面テーマを適用しました。');}catch(e){status(e.message);}});skin.append(skinFile);section.append(skin);
  const link=make('a','画面デザイン用プレビュー');link.href='view-preview.html';link.target='_blank';link.rel='noopener';section.append(link);dialog.append(section);
  dialog.append(btn('最初から始める',()=>{modal('新しい隊で始めますか',menu);const target=editionSession.label(editionSession.selectedEdition());dialog.append(make('p',`${target}で新しい旅を始め、その版の自動記録を置き換えます。他の版の旅、記録1〜3、書き出したファイルは残ります。`),btn('新しい旅を始める',()=>editionAction(()=>editionSession.newGame(),{message:()=>`${editionSession.label()}で新しい旅を始めました。`})));closeButton();}));closeButton();
}
function keyConfig(){openKeyConfig({dialog,controls:systemControls,config:settings.keyBindings,parent:menu,onApply:config=>{
  const next={...settings,keyBindings:config};if(!storageWrite('settings',JSON.stringify(next)))return false;
  settings=next;render();return true;
}});}
function help(){modal('遊び方');for(const paragraph of [
 '1. 町の依頼掲示板で受注します。複数受注でき、メインクエストを切り替えられます。最初の依頼「帰らない灯番」は篝火の迷宮で進めます。',
 `2. ダンジョン探索中：${inputHint(settings.keyBindings.bindings,true)}。上下は前進・後退、左右は方向転換です。会話・選択肢・町・管理画面：${inputHint(settings.keyBindings.bindings)}。キャンセルを重ねると町では広場、ダンジョンでは探索へ戻れます。キーは「記録 → キー設定」で変更できます。`,
 '3. 強制イベントは指定セルを踏むと自動的に始まります。壁松明などの任意調査は「調べる」で行います。人物の応答と選んだ行為が次の場面を決めます。一部の作業には縄や戦闘が必要です。結末はやり直せません。別の記録で比較できます。',
 `4. 素早い味方から1人ずつ行動し、その後に敵が動きます。行動を決めてから敵・仲間を選び、${bindingLabel(settings.keyBindings.bindings,'confirm')}で対象を決定します。対象選択はキャンセルで戻れます。毒は移動・ターン終了時にダメージ。防御は敵の行動終了まで有効です。`,
 '5. ショップで購入、旅支度で使用・受け渡し・装備、酒場で10人から最大5人を編成し、宿・無料施療所を利用。待機中もHP・MP・装備は残ります。入口から無料帰還、帰還印は原則所持金8%（同行する生存巡礼者で半額）、全滅時は15%を失います。依頼と手掛かりは残ります。',
 '6. 町のキャラクターカードからプロフィールを開き、「転職」で30職へ無料で転職できます。人物の負傷と過去の成長は残り、装備できない品は袋へ戻ります。技能は隊Lv1・5・10で解放。探索特技はプロフィールのスキル・魔法ページから使用できます。',
 '7. 行動後に自動保存。「記録」でシナリオ版を選び、版ごとの3枠への手動保存とファイル入出力ができます。版を切り替えても、それぞれの旅を別々に再開できます。ブラウザのデータ削除に備え、長い旅はファイルにも保存してください。',
 '8. 各地域の第10依頼は同地域3件完了で解放。最終依頼「百の帰還」は他の99件完了で解放されます。依頼によって結末の数と条件が異なります。'
])dialog.append(make('p',paragraph));closeButton();}

const viewUi={menu,help,status,keyHint:exploring=>inputHint(settings.keyBindings.bindings,exploring),modalOpen:()=>dialog.open,layoutChanged:syncSystemPlacement,cancelFeedback:()=>sound.stopEffects(),effectsMode:()=>settings.effects,soundEnabled:()=>settings.sound,soundLabel:()=>sound.label(),sound:toggleSound};
try{
  const savedSettings=storageRead('settings');if(savedSettings){try{const parsed=JSON.parse(savedSettings);const keys=readKeyConfig(parsed.keyBindings);settings.keyBindings=keys.config;if(keys.recovered)status('保存済みのキー設定が不正なため、初期値へ戻しました。');settings.sound=parsed.sound===true;settings.seVolume=Number.isFinite(parsed.seVolume)?Math.max(0,Math.min(1,parsed.seVolume)):.8;settings.effects=['full','reduced','off'].includes(parsed.effects)?parsed.effects:'full';settings.volume=Number.isFinite(parsed.volume)?Math.max(0,Math.min(1,parsed.volume)):.5;settings.theme=applyTheme(parsed.theme??THEME_DEFAULT);}catch{applyTheme(THEME_DEFAULT);}}else applyTheme(THEME_DEFAULT);
  if(savedSettings){try{settings.viewLayout=normalizeLayout(JSON.parse(savedSettings).viewLayout);}catch{settings.viewLayout='scene';}}
  const readContent=runtimeReader()??(async file=>{const response=await fetch(new URL(`../${file}`,import.meta.url),{cache:'no-store'});if(!response.ok)throw Error(`読込失敗: ${file} (${response.status})`);return response.json();});
  editionSession=new ScenarioEditionSession({storage:{getItem:key=>localStorage.getItem(key),setItem:(key,value)=>localStorage.setItem(key,value)},loadCatalog:()=>readContent('data/scenario-editions.json'),loadData:async edition=>{const loaded=await loadContent(readContent,{edition});versionRuntimeAssets(loaded);return loaded;},onBusy:syncPresentationClock});
  let preference='latest';if(savedSettings){try{const requested=JSON.parse(savedSettings).scenarioEdition;if(['latest','e1','e2'].includes(requested))preference=requested;}catch{}}
  const started=await editionSession.start(preference);adoptEditionSession();if(started.recovery)menu();if(started.message)status(started.message);
  document.addEventListener('keydown',event=>{if(!systemControls.handleKey(event))handleGameKey(event,{view,model:lastModel,dispatch,bindings:settings.keyBindings.bindings});});
  addEventListener('resize',syncSystemPlacement);addEventListener('scroll',syncSystemPlacement,{passive:true});
}catch(error){root.replaceChildren();const message=make('div',`起動できませんでした。\n${error.message}\n\nHTTPサーバーまたはGitHub Pagesで開き、data/以下のファイルが揃っているか確認してください。`);message.className='fatal';message.setAttribute('role','alert');root.append(message);}

