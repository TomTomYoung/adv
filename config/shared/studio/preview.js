import {EffectsRenderer} from '../../../src/view/effects.js';
import {el,button,image,safeAssetURL,section} from './dom.js';
import {get} from './workspace.js';
import {enumLabel,label} from './labels.js';
import {expressionSummary} from './forms.js';
export function atlasRect(type,index){const ys=type==='device'?[0,310,616,907,1254]:[0,313.5,627,940.5,1254],row=Math.floor(index/4);return {x:(index%4*313.5+5)/1254,y:(ys[row]+5)/1254,width:303.5/1254,height:(ys[row+1]-ys[row]-10)/1254};}
export function cropPreview(path,rect,caption){const box=el('div','','crop-preview'),url=safeAssetURL(path);box.setAttribute('role','img');box.setAttribute('aria-label',caption);if(url&&rect?.width>0&&rect?.height>0){box.style.width='160px';box.style.height='160px';box.style.backgroundImage=`url("${url}")`;box.style.backgroundSize=`${100/rect.width}% ${100/rect.height}%`;box.style.backgroundPosition=`${rect.width===1?0:100*rect.x/(1-rect.width)}% ${rect.height===1?0:100*rect.y/(1-rect.height)}%`;}return box;}
export function renderArt(app,location,value){
 const root=section('素材を見て選ぶ','壁・装置の候補をクリックすると、この迷宮で使う素材を変更します。'),source=app.workspace.value(location.file);
 for(const [key,asset] of [['wall','walls'],['device','devices']]){const group=section(key==='wall'?'壁の素材':'装置の素材'),grid=el('div','','atlas-grid');for(let index=0;index<16;index++){const b=button('',()=>{if(!app.guard())return;app.workspace.set(location.file,[...location.path,key],index,`${app.recordName()}の${key==='wall'?'壁':'装置'}素材を変更`);app.refresh();},'atlas-choice');b.setAttribute('aria-label',`${key==='wall'?'壁':'装置'}素材 ${index+1}`);b.setAttribute('aria-pressed',String(value[key]===index));b.append(cropPreview(source.assets[asset],atlasRect(key,index),`${index+1}番の素材`),el('span',String(index+1)));grid.append(b);}group.append(grid);root.append(group);}return root;
}
export function previewPanel(app,record,kind){
 const root=section('確認'),assets=app.context.assets();
 if(['skill','ability','job','encounter','cell'].includes(kind)){
  root.append(el('h4',record.name??app.recordName()));
  if(record.target)root.append(el('p','対象：'+enumLabel(record.target)));
  if(record.mp!==undefined)root.append(el('p',`消費：MP ${record.mp}${record.hp?' / HP '+record.hp:''}`));
  for(const [id,count] of Object.entries(record.materials??{}))root.append(el('p',`消費する道具：${app.context.name('items',id)} × ${count}`));
  if(kind==='skill')for(const effect of record.effects??[])root.append(el('p',enumLabel(effect.type)+(effect.buff?'：'+app.context.name('buffs',effect.buff):effect.status?'：'+app.context.name('statuses',effect.status):effect.formula?'：'+expressionSummary(app.context.names('formulas')[effect.formula]??effect.formula,app.context):effect.amount!==undefined?'：'+effect.amount:'')));
  for(const [key,n] of Object.entries(record.growth??{}))root.append(el('p',`${label(key)}の成長：${n}`));
  if(kind==='cell')root.append(el('p',`${enumLabel(record.passage)} / ${record.visual.opaque?'光を遮る':'光を通す'} / 照度 ${record.parameters.illumination}`));
  if(kind==='encounter')for(const id of record.enemies??[])root.append(el('p',app.context.name('enemies',id)));
 }
 if(kind==='location'){
  if(record.background)root.append(image(assets.images[record.background],record.name));root.append(el('h4',record.name??''),el('p',record.description??''));
  const graph=section('場所のつながり');if(record.parent)graph.append(button('上位：'+app.context.name('locations',record.parent),()=>app.selectRecord(record.parent)));
  for(const [id,l] of Object.entries(app.context.names('locations')))if(l.parent===record.id)graph.append(button(l.name,()=>app.selectRecord(id)));for(const id of record.links??[])graph.append(button('接続：'+app.context.name('locations',id),()=>app.selectRecord(id)));root.append(graph);
 }
 if(['monster','actor','item'].includes(kind)){
  const id=record.sprite??record.portrait;if(id&&assets.images[id])root.append(image(assets.images[id],record.name));root.append(el('h4',record.name??''),el('p',record.description??''));
 }
 if(kind==='story'){
  root.append(el('h4',record.title),el('p',record.brief));const graph=section('分岐の接続');for(const scene of record.nodes??[]){const card=section(scene.title??`場面 ${scene.id}`);for(const option of scene.options??[])card.append(el('p',`${option.text} → ${option.to?.startsWith('@')?'結末：'+(record.outcomes?.[option.to.slice(1)]?.label??option.to):'場面 '+option.to}`));graph.append(card);}root.append(graph);
 }
 if(kind==='floorArt'){root.append(cropPreview(assets.images[record.asset],record.rect,'床の切り出し'));
 }
 if(['effect','cue'].includes(kind)){
  const stage=el('div','','effect-stage scene-stage');stage.dataset.fx='scene';const target=image(assets.images.slime,'効果の確認用の魔物');target.dataset.fx='sample';stage.append(target);root.append(stage);const renderer=new EffectsRenderer(root);app.cleanups.push(()=>renderer.destroy());
  root.append(button('下書きの効果を再生',()=>{try{renderer.stop();const source=app.workspace.value(app.entry.file),effects=kind==='effect'?[record]:(record.effects??[]).map(id=>source.effects[id]).filter(Boolean);for(const effect of effects)renderer.play(effect,{key:'sample',image:target.src},Object.fromEntries(Object.entries(assets.images).map(([k,p])=>[k,safeAssetURL(p)])));}catch(e){app.message('再生できません: '+e.message,true);}}),button('停止',()=>renderer.stop()));
 }
 if(kind==='sound'||kind==='cue'){
  const source=app.workspace.value(app.entry.file),sound=kind==='sound'?record:source.sounds?.[record.sound],id=kind==='sound'?app.recordId:record.sound;
  let audio,ctx;const stop=()=>{audio?.pause();audio=null;if(ctx){ctx.close().catch(()=>{});ctx=null;}};app.cleanups.push(stop);
  if(sound)root.append(button('下書きの音符を試聴',async()=>{try{stop();const Audio=globalThis.AudioContext??globalThis.webkitAudioContext;if(!Audio)throw Error('この環境は音符の試聴に対応していません。');ctx=new Audio();await ctx.resume();const base=ctx.currentTime+.03;for(const note of sound.notes??[]){if(note.start>10)continue;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type=({pulse:'square',bass:'sawtooth',pluck:'triangle',bell:'sine',flute:'sine',pad:'triangle',kick:'sine',snare:'sawtooth',hat:'square'})[sound.instrument]??'sine';osc.frequency.value=440*2**((note.pitch-69)/12);const at=base+note.start,end=at+Math.min(note.seconds,10-note.start);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(Math.min(.2,(sound.gain??.3)*(note.velocity/127)*.25),at+.005);gain.gain.exponentialRampToValueAtTime(.0001,Math.max(at+.006,end));osc.connect(gain);gain.connect(ctx.destination);osc.start(at);osc.stop(Math.max(at+.007,end)+.01);}}catch(e){app.message('試聴できません: '+e.message,true);}}));
  if(assets.audio[id])root.append(button('現在の音声素材を聴く',async()=>{try{stop();audio=new Audio(safeAssetURL(assets.audio[id]));await audio.play();}catch(e){app.message('再生できません: '+e.message,true);}}));root.append(button('停止',stop),el('p','下書きは音程・長さ・強さを簡易音で確認します（先頭10秒）。実際の音色は素材生成後に確認してください。','preview-note'));
 }
 if(kind==='script'){for(const c of (record.commands??[]).filter(c=>['say','narrate'].includes(c.op)).slice(0,8)){const card=el('div','','dialogue-preview');if(c.character)card.append(el('strong',app.context.name('characters',c.character)));card.append(el('p',typeof c.text==='string'?c.text:'状態から組み立てる本文'));root.append(card);}}
 return root;
}
