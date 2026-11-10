import {loadContent} from './core/loader.js';
import {projectGame} from './application/projection.js';
import {questPartyErrors,createQuestTrial,dispatchQuestTrial,questTrialReport} from './application/quest-playtest.js';
import {GameAudio} from './application/audio.js';
import {SceneView} from './view/scene-view.js';
import {handleGameKey} from './view/keyboard.js';
import {applyTheme,THEME_DEFAULT} from './view/theme.js';

const $=id=>document.getElementById(id),storageKey='adv.questPartyTrials.v1';
const statuses={playing:'試遊中',cleared:'指定結末でクリア',other_outcome:'別の結末で完了',defeated:'全滅・救助',changed_party:'編成変更後に完了（比較対象外）'};
let data,catalog,trial,view,model,lastOptions,loadVersion=0,loading=false,soundEnabled=false,recorded=false;
const cache=new Map();let history=[];
try{const saved=JSON.parse(localStorage.getItem(storageKey)??'[]');if(Array.isArray(saved))history=saved.filter(r=>r?.schemaVersion===1&&r.config&&r.initial&&r.party&&statuses[r.status]).slice(-100);}catch{}
const status=(message,error=false)=>{$('trial-status').textContent=message;$('trial-status').dataset.error=String(error);};
const sound=new GameAudio({locate:target=>view?.effects.spatial(target),onChange:()=>{$('sound-toggle').textContent=sound.label();view?.updateSound(sound.label());}});
sound.configure(false,1,.8);applyTheme(THEME_DEFAULT);
function syncSound(){if(model)sound.sync({...model,music:view?.playback.active?view.model.music:model.music});}
const ui={status:text=>status(text),menu:()=>status('試遊専用です。本編のセーブには書き込みません。'),help:()=>status('画面の選択肢・探索・戦闘コマンドで操作できます。方向キーで移動、Enterで決定。'),keyHint:()=> '↑前進 / ↓後退 / ←→旋回 / Enter決定',modalOpen:()=>false,cancelFeedback:()=>sound.stopEffects(),effectsMode:()=>$('effects').value,soundEnabled:()=>soundEnabled,feedbackFinished:()=>syncSound(),soundLabel:()=>sound.label(),sound:toggleSound,layoutChanged(){}};
function fill(id,entries,preferred){const select=$(id);select.replaceChildren(...entries.map(([value,label])=>new Option(label,value)));if(entries.some(([v])=>v===preferred))select.value=preferred;}
function paragraph(parent,text){const p=document.createElement('p');p.textContent=text;parent.append(p);}
function refreshPlan(){
  const q=data.quests[$('quest').value],p=catalog.quests[data.scenarioEdition]?.[q?.id];
  $('launch').disabled=loading||!p;if(!p){$('party-preview').replaceChildren();$('party-tactic').textContent='';$('plan-note').textContent='該当するクエストがありません。';$('supplies-preview').textContent='';return;}
  fill('party',p.parties.map(id=>[id,catalog.parties[id].name]),$('party').value);
  fill('level',Array.from({length:p.level.max-p.level.min+1},(_,i)=>{const n=p.level.min+i;return [String(n),`Lv.${n}${n===p.level.standard?'（標準）':''}`];}),String(p.level.standard));
  fill('outcome',Object.entries(q.outcomes).map(([id,o])=>[id,o.label]),p.expectedOutcomes[0]);
  $('plan-note').textContent=`${q.id} ${q.title} ／ 想定Lv.${p.level.min}〜${p.level.max}。${p.note}`;
  const supply=catalog.supplies[p.supplies];$('supplies-preview').textContent=`初期所持金 ${supply.gold}G ／ ${Object.entries(supply.items).map(([id,n])=>`${data.items[id].name}×${n}`).join('、')}。以後の消費・補給・成長は本編の処理です。`;
  refreshParty();
}
function refreshParty(){
  const p=catalog.parties[$('party').value];if(!p)return;
  const root=$('party-preview');root.replaceChildren();
  for(const id of p.members){const l=catalog.loadouts[id],node=document.createElement('div');node.className='quest-lab-member';const strong=document.createElement('strong');strong.textContent=`${data.actors[id].name} / ${data.jobs[l.job].name}`;const gear=document.createElement('span');gear.textContent=l.equipment.map(i=>data.items[i].name).join('・');node.append(strong,gear);root.append(node);}
  $('party-tactic').textContent=p.tactic;
}
function filterQuests(preferred=$('quest').value){
  const term=$('quest-search').value.trim().toLowerCase();
  const qs=(data.questOrder?.ids??Object.keys(data.quests)).map(id=>data.quests[id]).filter(Boolean).filter(q=>`${q.id} ${q.title} ${data.regions.find(r=>r.id===q.region)?.name??''}`.toLowerCase().includes(term));
  fill('quest',qs.map(q=>[q.id,`${q.id} ${q.title}`]),preferred);refreshPlan();
}
async function selectEdition(edition,preferred){
  const version=++loadVersion;loading=true;$('launch').disabled=true;status('シナリオを読み込み中…');
  try{
    if(!cache.has(edition))cache.set(edition,loadContent(undefined,{edition}));
    const next=await cache.get(edition);if(version!==loadVersion)return;
    const errors=questPartyErrors(next,catalog);if(errors.length)throw Error(errors.slice(0,3).join(' / '));
    data=next;loading=false;$('edition').value=edition;filterQuests(preferred);status(`${Object.keys(data.quests).length}件の想定を読み込みました。`);
  }catch(e){if(version!==loadVersion)return;cache.delete(edition);status(e.message,true);}
}
function selectedOptions(){return {quest:$('quest').value,party:$('party').value,level:Number($('level').value),seed:Number($('seed').value),start:$('start').value,battleMode:$('battle-mode').value,outcome:$('outcome').value};}
function render(){
  model=projectGame(trial.engine);model.feedback.startedAt=performance.now();view.render(model);syncSound();
  const report=questTrialReport(trial),root=$('trial-result');root.replaceChildren();root.dataset.status=report.status;
  const c=report.config,q=trial.engine.data.quests[c.quest];
  paragraph(root,`${statuses[report.status]} ｜ ${c.edition} / ${q.id} ${q.title} / ${catalog.parties[c.party].name} / 開始Lv.${c.level} / ${c.start==='reception'?'受付から':'現場から'} / seed ${c.seed}`);
  paragraph(root,`戦闘 ${report.records.battles}回・勝利 ${report.records.wins}回・逃走 ${report.records.escapes}回・敗北 ${report.records.losses}回・救助 ${report.rescues}回 ／ 移動 ${report.steps}歩 ／ ${report.gold.end}G`);
  paragraph(root,report.party.map(a=>`${trial.engine.data.actors[a.id].name} Lv.${a.level} HP ${a.hp}/${a.maxHp} MP ${a.mp}/${a.maxMp}`).join(' ｜ '));
  if(report.setup.actions.length)paragraph(root,report.setup.actions.join(' ／ '));
  if(report.outcome)paragraph(root,`到達した結末：${q.outcomes[report.outcome]?.label??report.outcome}`);
  if(report.setup.prerequisites.length)paragraph(root,`開始用の前提履歴：${report.setup.prerequisites.join(', ')}（この試遊でのクリア件数には含めません）`);
  if(report.status!=='playing'&&!recorded){recorded=true;history.push({...report,recordedAt:new Date().toISOString()});history=history.slice(-100);try{localStorage.setItem(storageKey,JSON.stringify(history));}catch{status('結果は画面内に保持しています。JSON保存をご利用ください。');}renderHistory();}
  window.questPlaytest={trial,view,model,dispatch,render,report:()=>questTrialReport(trial)};
}
function dispatch(intent){const changed=dispatchQuestTrial(trial,intent);if(changed||trial.engine.state.notice||trial.engine.feedback.events.length)render();return changed;}
function launch(options=selectedOptions(),source=data){
  if(loading){status('シナリオの読込完了をお待ちください。');return;}
  try{
    const next=createQuestTrial(source,catalog,options);view?.destroy();sound.stopEffects();trial=next;recorded=false;lastOptions={edition:source.scenarioEdition,options:{...options}};
    view=new SceneView($('app'),dispatch,ui);render();
    for(const id of ['restart-trial','copy-trial-url','export-trials'])$(id).disabled=false;
    status('試遊を開始しました。下のゲーム画面で操作してください。');
  }catch(e){status(e.message,true);}
}
function renderHistory(){
  const root=$('trial-history');root.replaceChildren();if(!history.length){paragraph(root,'記録はまだありません。完了または全滅時に記録します。');return;}
  const list=document.createElement('ol');for(const row of [...history].reverse()){
    const c=row.config,li=document.createElement('li');li.textContent=`${c.edition} ${c.quest} / ${c.party} / Lv.${c.level} / ${c.start==='site'?'現場':'受付'} / ${c.battleMode} / seed ${c.seed} → ${statuses[row.status]}${row.outcome?' ('+row.outcome+')':''} ／ 勝利${row.records?.wins??0}回・残HP ${row.party.reduce((sum,a)=>sum+a.hp,0)}・${row.gold?.end??0}G`;
    const button=document.createElement('button');button.type='button';button.textContent='この条件を選択';button.addEventListener('click',async()=>{$('quest-search').value='';await selectEdition(c.edition,c.quest);if(data.scenarioEdition!==c.edition)return;for(const [id,value] of [['party',c.party],['level',String(c.level)],['outcome',c.expectedOutcomes[0]],['start',c.start],['battle-mode',c.battleMode],['seed',String(c.seed)]])$(id).value=value;refreshParty();status('履歴の条件を選択しました。開始ボタンで再試行できます。');});li.append(button);list.append(li);
  }root.append(list);
}
function toggleSound(){soundEnabled=!soundEnabled;sound.configure(soundEnabled,1,.8);$('sound-toggle').textContent=sound.label();syncSound();}
$('trial-form').addEventListener('submit',e=>{e.preventDefault();launch();});
$('restart-trial').addEventListener('click',async()=>{if(lastOptions)launch(lastOptions.options,await cache.get(lastOptions.edition));});
$('edition').addEventListener('change',()=>{$('quest-search').value='';selectEdition($('edition').value);});
$('quest-search').addEventListener('input',()=>{if(data&&!loading)filterQuests();});$('quest-search').addEventListener('keydown',e=>{if(e.key==='Enter')e.preventDefault();});$('quest').addEventListener('change',refreshPlan);$('party').addEventListener('change',refreshParty);
$('sound-toggle').addEventListener('click',toggleSound);$('effects').addEventListener('change',()=>{if(view){view.playback.finish();view.effects.stop();render();}});
$('copy-trial-url').addEventListener('click',async()=>{if(!lastOptions)return;const url=new URL(location.href);url.search=new URLSearchParams({edition:lastOptions.edition,...lastOptions.options});try{await navigator.clipboard.writeText(url.href);status('開始条件のURLをコピーしました。');}catch{status(url.href);}});
$('export-trials').addEventListener('click',()=>{const payload={schemaVersion:1,history,current:trial?questTrialReport(trial):null},blob=new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='quest-party-results.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 document.addEventListener('keydown',e=>{if(!trial||!view||e.target?.closest('#quest-lab')||/INPUT|SELECT|TEXTAREA/.test(e.target?.tagName))return;handleGameKey(e,{view,model:view.model,dispatch,modalOpen:false});});
try{
  const response=await fetch(new URL('../playtests/quest-parties.json',import.meta.url));if(!response.ok)throw Error('攻略パーティー定義を読み込めません。');catalog=await response.json();
  const params=new URLSearchParams(location.search);await selectEdition(params.get('edition')==='e1'?'e1':'e2',params.get('quest')??'q001');
  if(data){for(const [id,key] of [['party','party'],['level','level'],['seed','seed'],['start','start'],['battle-mode','battleMode'],['outcome','outcome']])if(params.has(key))$(id).value=params.get(key);refreshParty();}
  renderHistory();if(history.length)$('export-trials').disabled=false;
}catch(e){status(e.message,true);}
