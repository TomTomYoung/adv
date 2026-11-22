import {GameAudio} from './application/audio.js';
import {freshFeedback,playBattleCue} from './core/feedback.js';
import {defaultPresentation as design} from './presentation-presets.js';
import {feedbackDuration,decorateFeedback,profileDuration} from './presentation-design.js';

const $=id=>document.getElementById(id);
const types={synth:'合成SE',se:'収録SE',bgm:'BGM',sample:'命中音サンプル'};
const storageKey='adv.sound-library.recorded.v1';
const audio=new GameAudio();
let assets,sounds,plan,presentation,items=[],current,drafts={},media,finishTimer;
const volume=()=>Number($('volume').value)/100;
const report=message=>{$('status').textContent=message;};
const recorded=id=>({...sounds[id],...drafts[id]});
const title=item=>item.kind==='se'?recorded(item.id).name:item.name;

function stop(){
  clearTimeout(finishTimer);
  if(media){media.onended=null;media.onerror=null;media.pause();media=null;}
  audio.configure(false,volume());
}
function finishAfter(ms){finishTimer=setTimeout(()=>report('試聴が終了しました。'),ms);}
function playFile(url,gain){
  const playing=new Audio(url);
  media=playing;
  playing.volume=volume()*gain;
  playing.onended=()=>{if(media===playing)report('試聴が終了しました。');};
  playing.onerror=()=>{if(media===playing)report('音源を再生できませんでした。');};
  playing.play().catch(()=>{if(media===playing)report('音源を再生できませんでした。');});
}
function preview(){
  if(!current)return;
  stop();
  report(title(current)+' を試聴中');
  if(current.kind!=='synth'){playFile(current.url,current.kind==='se'?recorded(current.id).gain:1);return;}
  audio.configure(true,volume());
  if(audio.battleSound.play({synth:current.id}))finishAfter(profileDuration(design.profiles[current.id])+50);
  else report(volume()?'合成音を再生できませんでした。':'試聴音量は0%です。');
}
function attack(){
  stop();
  const ally=$('side').value==='ally',miss=$('result').value==='miss';
  const actor={key:'actor:preview',material:'flesh'},enemy={key:'enemy:preview',material:'flesh'};
  const feedback=freshFeedback();
  const target={...(ally?enemy:actor),...(miss?{missed:true}:{damage:12})};
  const version=$('windup-version').value;
  const archived=version==='v3',synth=version==='v1'||version==='v2';
  const attackLead=archived?{ally:350,enemy:395}:synth?undefined:presentation.attackLead;
  playBattleCue({data:{presentation:{...presentation,attackLead}},feedback},'attack',ally?actor:enemy,[target],true);
  const catalog=Object.fromEntries(Object.keys(sounds).map(id=>[id,recorded(id)]));
  for(const e of feedback.events)if(e.sound){
    const sound=catalog[synth?'se_slash':archived?'se_thick_blade':e.sound];
    e.sound={url:assets.audio[sound.asset],gain:e.gain*sound.gain};
  }
  const sequence=decorateFeedback(feedback,design,{sounds:catalog,soundAssets:assets.audio});
  if(archived||synth){
    for(const e of sequence.events.filter(e=>e.originalPhase==='windup'&&e.sound)){
      if(archived){
        const sound=catalog[ally?'se_ally_call':'se_enemy_warning'];
        e.sound={url:assets.audio[sound.asset],gain:sound.gain};
      }else{
        e.sound=null;
        e.synth=(ally?'ally':'enemy')+'_attack_start'+(version==='v1'?'_v1':'');
      }
    }
  }
  audio.configure(true,volume());
  audio.sync({music:null,feedback:sequence});
  report((ally?'味方':'敵')+'の通常攻撃・'+(miss?'空振り':'命中'));
  finishAfter(feedbackDuration(sequence,design));
}
function detail(item){
  current=item;
  $('detail').hidden=!item;
  if(!item)return;
  $('title').textContent=title(item);
  $('type').textContent=types[item.kind];$('identifier').textContent=item.id;
  $('use').textContent=item.use;
  const source=$('source');
  source.href=item.url??('battle-presentation-editor.html?profile='+encodeURIComponent(item.id));
  source.textContent=item.url?'音源ファイルを開く':'合成音を編集';
  $('edit').hidden=item.kind!=='se';
  if(item.kind==='se'){
    const sound=recorded(item.id);
    $('name').value=sound.name;$('gain').value=sound.gain;$('gain-value').value=sound.gain;
    $('reset').disabled=!drafts[item.id];
  }
}
function render(){
  const query=$('search').value.trim().toLowerCase(),kind=$('kind').value;
  const visible=items.filter(item=>(!kind||kind===item.kind)&&[title(item),item.id,item.use,item.url].join(' ').toLowerCase().includes(query));
  const selected=visible.includes(current)?current:visible[0];
  $('count').textContent=visible.length+'件';
  const list=$('list');list.replaceChildren();
  for(const item of visible){
    const row=document.createElement('button'),label=document.createElement('small');
    row.type='button';row.className='row';label.textContent=types[item.kind];
    row.setAttribute('aria-pressed',String(item===selected));row.append(label,title(item));
    row.onclick=()=>{
      stop();report('試聴待機');
      list.querySelector('[aria-pressed=true]')?.setAttribute('aria-pressed','false');
      row.setAttribute('aria-pressed','true');detail(item);
    };
    list.append(row);
  }
  if(!visible.length)list.textContent='一致する音源はありません。';
  detail(selected);
}
function commitDraft(reset){
  const id=current.id,name=$('name').value.trim(),gain=Number($('gain').value);
  if(!reset&&!name){report('表示名を入力してください。');return;}
  const next={...drafts},patch={};
  if(!reset&&name!==sounds[id].name)patch.name=name;
  if(!reset&&gain!==sounds[id].gain)patch.gain=gain;
  if(Object.keys(patch).length)next[id]=patch;else delete next[id];
  try{localStorage.setItem(storageKey,JSON.stringify(next));}
  catch{report('ブラウザーに保存できませんでした。');return;}
  drafts=next;stop();render();report(reset?'この音を初期値に戻しました。':'このブラウザーに保存しました。');
}
function loadDrafts(){
  try{
    const saved=JSON.parse(localStorage.getItem(storageKey)??'{}');
    for(const id of Object.keys(sounds)){
      const edit=saved?.[id];
      if(!edit||typeof edit!=='object')continue;
      const patch={};
      if(typeof edit.name==='string'&&edit.name.trim()&&edit.name.length<=80)patch.name=edit.name.trim();
      if(Number.isFinite(edit.gain)&&edit.gain>=0&&edit.gain<=1)patch.gain=edit.gain;
      if(Object.keys(patch).length)drafts[id]=patch;
    }
  }catch{/* Stored drafts are optional. */}
}
$('edit').onsubmit=e=>{e.preventDefault();commitDraft(false);};
$('reset').onclick=()=>commitDraft(true);
$('export').onclick=()=>{
  const output=structuredClone(plan);
  for(const [id,patch] of Object.entries(drafts))Object.assign(output.sounds[id],patch);
  const url=URL.createObjectURL(new Blob([JSON.stringify(output,null,2)+'\n'],{type:'application/json'}));
  const link=document.createElement('a');link.href=url;link.download='presentation.json';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  report('収録SEの設定を書き出しました。');
};
$('volume').oninput=()=>{
  $('level').value=$('volume').value+'%';
  if(media)media.volume=volume()*(current?.kind==='se'?recorded(current.id).gain:1);
  if(audio.enabled)audio.configure(true,volume());
};
$('gain').oninput=()=>{$('gain-value').value=$('gain').value;};
$('search').oninput=$('kind').onchange=()=>{stop();render();report('試聴待機');};
$('preview').onclick=preview;$('attack').onclick=attack;
$('stop').onclick=()=>{stop();report('停止しました。');};
addEventListener('pagehide',stop);
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();report('試聴待機');}});

async function readJson(url){
  const response=await fetch(url);
  if(!response.ok)throw Error(url+' ('+response.status+')');
  return response.json();
}
try{
  const sampleFolder='assets/audio/auditions/attack-v1/';
  let samplesList,archiveError;
  [assets,sounds,plan,presentation,samplesList]=await Promise.all([
    ...['data/assets.json','data/sounds.json','config/presentation.json','data/presentation.json'].map(readJson),
    readJson(sampleFolder+'catalog.json').catch(error=>{archiveError=error;return [];})
  ]);
  loadDrafts();
  const samples=new Set(Object.values(sounds).map(s=>s.asset));
  items=[
    ...Object.entries(design.profiles).map(([id,p])=>({kind:'synth',id,name:p.name,use:profileDuration(p)+' ms'})),
    ...samplesList.map(({id,name,use,file})=>({kind:'sample',id,name,use,url:sampleFolder+file})),
    ...Object.entries(sounds).map(([id,s])=>({kind:'se',id,url:assets.audio[s.asset],use:plan.sounds[id]?.use??''})),
    ...Object.entries(assets.audio).filter(([id])=>!samples.has(id)).map(([id,url])=>({kind:'bgm',id,url,name:({exploration:'探索',battle:'戦闘'})[id]??id,use:'本編で使用する背景音楽'})),
    {kind:'bgm',id:'exploration_original',name:'探索（初版）',url:'assets/audio/exploration.ogg',use:'音量調整前の原音'},
    {kind:'bgm',id:'battle_original',name:'戦闘（初版）',url:'assets/audio/battle.ogg',use:'音量調整前の原音'}
  ];
  const selected=['se_chip_ally','se_chip_enemy','se_chip_contact'];
  items.sort((a,b)=>Number(selected.includes(b.id))-Number(selected.includes(a.id)));
  current=items.find(i=>i.id==='se_chip_ally');
  const query=new URLSearchParams(location.search),kind=query.get('kind');
  if(query.get('result')==='miss')$('result').value='miss';
  if(Object.hasOwn(types,kind))$('kind').value=kind;
  if(query.has('search'))$('search').value=query.get('search');
  render();
  audio.preload([...selected,'se_ally_call','se_enemy_warning','se_thick_blade','se_slash'].map(id=>assets.audio[sounds[id].asset]));
  $('attack').disabled=false;
  report(archiveError?'命中音サンプルの読み込みに失敗しました。 '+archiveError.message:'試聴待機');
}catch(error){report('読み込みに失敗しました。 '+error.message);}
