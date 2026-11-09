import {defaultPresentation} from './presentation-presets.js';
import {parsePresentationDesign,loadPresentationDesign,timelineEvents,feedbackDuration} from './presentation-design.js';
import {EffectsRenderer} from './view/effects.js';
import {GameAudio} from './application/audio.js';
import {BattleSound} from './application/battle-sound.js';
const $=id=>document.getElementById(id),stage=$('stage'),fx=new EffectsRenderer(stage),audio=new GameAudio();
// The renderer's local layer adapter keeps previews inside the preview canvas.
fx.layer=function(rect,className=''){const e=document.createElement('div'),origin=stage.getBoundingClientRect();e.className='fx-overlay '+className;e.setAttribute('aria-hidden','true');Object.assign(e.style,{position:'absolute',left:`${rect.left-origin.left}px`,top:`${rect.top-origin.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});stage.append(e);const clean=()=>e.remove();this.cleanups.add(clean);return {element:e,clean:()=>{clean();this.cleanups.delete(clean);}};};
let design=structuredClone(defaultPresentation),a=null,revision=0,raf=0,liveTimer=0,waveGeneration=0,effects={},sounds={},soundAssets={};
const notify=(text,error=false)=>{$('status').textContent=text;$('status').dataset.error=String(error);};
const selected=()=>design[$('category').value][$('preset').value];
function stop(){clearTimeout(liveTimer);cancelAnimationFrame(raf);fx.stop();audio.stopEffects();$('progress').value=0;waveGeneration++;}
function syncDocument(){$('document-json').value=JSON.stringify(design,null,2);}
function options(){const select=$('preset'),old=select.value;select.replaceChildren();for(const [id,value] of Object.entries(design[$('category').value])){const o=document.createElement('option');o.value=id;o.textContent=value.name;select.append(o);}if(Object.hasOwn(design[$('category').value],old))select.value=old;showItem();}
function showItem(){const item=selected();$('item-json').value=JSON.stringify(item,null,2);$('quick-controls').replaceChildren();if(!item)return;const category=$('category').value;
  const input=(label,value,min,max,step,update)=>{const l=document.createElement('label'),n=document.createElement('input');l.textContent=label;n.type='number';Object.assign(n,{value,min,max,step});l.append(n);$('quick-controls').append(l);n.addEventListener('change',()=>{try{const next=structuredClone(design),item=next[category][$('preset').value];update(item,Number(n.value));commit(next);showItem();scheduleLive();}catch(e){notify(e.message,true);}});};
  if(category==='profiles'){const v=item.voices[0];input('音源1の長さ ms',v.durationMs,10,5000,10,(p,n)=>p.voices[0].durationMs=n);input('音源1の音量',v.gain,0,.5,.005,(p,n)=>p.voices[0].gain=n);input('開始周波数 Hz',v.pitch[0].value,20,20000,5,(p,n)=>p.voices[0].pitch[0].value=n);input('終了周波数 Hz',v.pitch.at(-1).value,20,20000,5,(p,n)=>p.voices[0].pitch.at(-1).value=n);}
  if(category==='particles'){input('粒子数',item.count,1,32,1,(p,n)=>p.count=n);input('寿命 ms',item.durationMs,40,2000,10,(p,n)=>p.durationMs=n);input('速度 px/s',item.speed,0,800,10,(p,n)=>p.speed=n);input('重力 px/s²',item.gravity,-1000,1000,10,(p,n)=>p.gravity=n);}
  if(category==='paths'){input('長さ ms',item.durationMs,40,2000,10,(p,n)=>p.durationMs=n);input('弧の高さ px',item.arc,-400,400,5,(p,n)=>p.arc=n);input('残像数',item.trail,0,12,1,(p,n)=>p.trail=n);}
  if(category==='timelines')input('先頭の開始 ms',item.tracks[0].atMs,0,5000,10,(p,n)=>p.tracks[0].atMs=n);
}
function commit(next){const valid=parsePresentationDesign(next,{effects,sounds});stop();design=valid;syncDocument();notify('設定を適用しました。');}
function applyItem(){const next=structuredClone(design);next[$('category').value][$('preset').value]=JSON.parse($('item-json').value);commit(next);showItem();}
function scheduleLive(){if($('live').checked){clearTimeout(liveTimer);liveTimer=setTimeout(()=>playCurrent(),220);}}
function previewModel(document,category,id){
  const source={key:'actor:preview'},targets=[{key:'enemy:enemy_0'}],spatial={pan:Number($('pan').value),distance:Number($('distance').value)};
  let events;
  if(category==='timelines')events=timelineEvents(document,id,{source,targets,sounds,soundAssets});
  else events=[{at:0,phase:'presentation',source,targets,effects:[],decorated:true,...{profiles:{synth:id},particles:{particles:id},paths:{path:id}}[category]}];
  if(category==='profiles'&&document.particles[id])events.push({at:0,phase:'presentation',source,targets,effects:[],particles:id,decorated:true});
  const material=document.materials[$('material').value];if(material)events.push({at:0,phase:'presentation',source,targets,effects:[],synth:material,decorated:true});
  events=events.map(e=>({...e,spatial:e.spatial??spatial,variationSeed:42}));
  return {effects,effectAssets:assets.images,sounds,soundAssets,music:null,feedback:{session:'editor',revision:++revision,startedAt:performance.now(),decorated:true,events}};
}
async function waveform(document,model,generation){
  const canvas=$('waveform'),ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);
  if(!globalThis.OfflineAudioContext){$('wave-status').textContent='この環境は波形表示に対応していません。';return;}
  const length=Math.max(.5,feedbackDuration(model.feedback,document,effects)/1000+.1),c=new OfflineAudioContext(2,Math.ceil(22050*length),22050),synth=new BattleSound({createContext:()=>c,design:document});synth.configure(true,1);
  // Suspend the offline clock at event boundaries so priority/cooldown decisions
  // see the same time order as live playback, including long multi-hit timelines.
  const groups=new Map();
  for(const e of model.feedback.events)if(e.synth){const frame=Math.floor(e.at/1000*c.sampleRate/128)*128;const list=groups.get(frame)??[];list.push(e);groups.set(frame,list);}
  for(const e of groups.get(0)??[])synth.play(e);groups.delete(0);
  const waits=[...groups].map(([frame,events])=>c.suspend(frame/c.sampleRate).then(()=>{for(const e of events)synth.play(e);return c.resume();}));
  const buffer=await c.startRendering();await Promise.all(waits);synth.stop();if(generation!==waveGeneration)return;
  const values=buffer.getChannelData(0);let peak=0,sum=0;for(let channel=0;channel<2;channel++)for(const x of buffer.getChannelData(channel)){peak=Math.max(peak,Math.abs(x));sum+=x*x;}
  ctx.strokeStyle='#d9bd86';ctx.lineWidth=1;ctx.beginPath();const step=Math.max(1,Math.floor(values.length/canvas.width));
  for(let x=0;x<canvas.width;x++){let lo=0,hi=0;for(let i=x*step;i<Math.min((x+1)*step,values.length);i++){lo=Math.min(lo,values[i]);hi=Math.max(hi,values[i]);}ctx.moveTo(x,canvas.height/2+lo*canvas.height*.45);ctx.lineTo(x,canvas.height/2+hi*canvas.height*.45);}ctx.stroke();
  $('wave-status').textContent=`合成音のみ / ${length.toFixed(2)}秒 / ピーク ${peak.toFixed(3)} / RMS ${Math.sqrt(sum/(values.length*2)).toFixed(4)}${peak>=.98?' / 音量を下げてください':''}`;
}
function play(document,category,id,label){
  stop();fx.setDesign(document);audio.setDesign(document);const model=previewModel(document,category,id),mode=$('preview-mode').value;
  if(mode!=='sound')fx.present(model,$('motion').value);audio.configure(mode!=='visual',Number($('volume').value),1);if(mode!=='visual')audio.sync(model);
  $('timeline').replaceChildren();for(const e of model.feedback.events){const li=documentNode('li',`${String(e.at).padStart(4)} ms  ${e.synth?'音 '+e.synth:e.particles?'粒子 '+e.particles:e.path?'軌道 '+e.path:e.sound?'SE':e.effects.join(', ')}`);$('timeline').append(li);}
  const duration=feedbackDuration(model.feedback,document,effects),start=performance.now();const tick=()=>{const elapsed=performance.now()-start;$('progress').value=Math.min(1,elapsed/duration);if(elapsed<duration)raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);
  notify(`${label}を再生しています。`);void waveform(document,model,waveGeneration).catch(e=>notify(`波形を表示できません: ${e.message}`,true));
}
const documentNode=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
function playCurrent(){try{applyItem();play(design,$('category').value,$('preset').value,'B');}catch(e){notify(e.message,true);}}
$('category').addEventListener('change',()=>{stop();options();});$('preset').addEventListener('change',()=>{stop();showItem();});$('play').addEventListener('click',playCurrent);$('play-b').addEventListener('click',playCurrent);$('stop').addEventListener('click',()=>{stop();notify('停止しました。');});
$('apply-item').addEventListener('click',()=>{try{applyItem();scheduleLive();}catch(e){notify(e.message,true);}});$('reset-item').addEventListener('click',showItem);
$('item-json').addEventListener('input',()=>{if($('live').checked){clearTimeout(liveTimer);liveTimer=setTimeout(playCurrent,600);}});
$('apply-document').addEventListener('click',()=>{try{commit(JSON.parse($('document-json').value));options();}catch(e){notify(e.message,true);}});
$('capture-a').addEventListener('click',()=>{try{applyItem();a={design:structuredClone(design),category:$('category').value,id:$('preset').value};$('play-a').disabled=false;$('restore-a').disabled=false;notify('現在の設定をAに保持しました。');}catch(e){notify(e.message,true);}});
$('play-a').addEventListener('click',()=>{if(a)play(a.design,a.category,a.id,'A');});$('restore-a').addEventListener('click',()=>{if(a){commit(a.design);$('category').value=a.category;options();$('preset').value=a.id;showItem();}});
$('export').addEventListener('click',()=>{try{applyItem();const url=URL.createObjectURL(new Blob([JSON.stringify(design,null,2)+'\n'],{type:'application/json'})),link=document.createElement('a');link.href=url;link.download='battle-presentation.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){notify(e.message,true);}});
$('import').addEventListener('change',async()=>{try{const file=$('import').files[0];if(!file)return;if(file.size>500000)throw Error('JSONは500KB以内にしてください。');commit(JSON.parse(await file.text()));options();}catch(e){notify(e.message,true);}finally{$('import').value='';}});
$('volume').addEventListener('input',()=>audio.configure($('preview-mode').value!=='visual',Number($('volume').value),1));for(const id of ['motion','preview-mode'])$(id).addEventListener('change',stop);
window.addEventListener('pagehide',()=>{stop();fx.destroy();});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});window.addEventListener('resize',stop);
let assets={images:{}};
try{[assets,sounds,effects]=await Promise.all(['data/assets.json','data/sounds.json','data/effects.json'].map(async url=>{const r=await fetch(url);if(!r.ok)throw Error('素材定義の読み込みに失敗しました。');return r.json();}));soundAssets=assets.audio;design=await loadPresentationDesign('config/battle-presentation.json',{sounds,effects});syncDocument();options();notify('プリセットを選び、再生してください。');}catch(e){notify(e.message,true);$('play').disabled=true;}
