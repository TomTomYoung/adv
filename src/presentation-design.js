// Serializable presentation data. No DOM, audio device, game state or game RNG.
import {battleAccent} from './battle-accent.js';
const num=(minimum,maximum)=>({type:'number',minimum,maximum});
const integer=(minimum,maximum)=>({...num(minimum,maximum),type:'integer'});
const enumeration=(...values)=>({enum:values});
const object=(properties,required=[])=>({type:'object',properties,required,additionalProperties:false});
const list=(items,minItems,maxItems)=>({type:'array',items,minItems,maxItems});
const name={type:'string',minLength:1,maxLength:80},id={type:'string',pattern:'^[a-z][a-z0-9_]{0,63}$'},color={type:'string',pattern:'^#[0-9a-fA-F]{6}$'};
const curve=(lo,hi)=>list(object({at:num(0,1),value:num(lo,hi),curve:enumeration('linear','exponential','step')},['at','value']),2,32);
const spatial=object({pan:num(-1,1),distance:num(0,10),panEnd:num(-1,1)});
const voice=object({wave:enumeration('sine','triangle','square','sawtooth','noise'),atMs:num(0,5000),durationMs:num(10,5000),gain:num(0,.5),pitch:curve(20,20000),envelope:curve(0,1),pan:num(-1,1),distance:num(0,10),
  filter:object({type:enumeration('lowpass','highpass','bandpass','notch','peaking','lowshelf','highshelf'),frequency:num(20,20000),q:num(.01,30),gain:num(-24,24),cutoff:curve(20,20000)},['type','frequency','q']),
  vibrato:object({hz:num(.1,40),cents:num(0,1200)},['hz','cents']),
  echo:object({delayMs:num(10,1000),gain:num(0,.6),taps:integer(1,4)},['delayMs','gain','taps']),
  reverb:object({durationMs:num(20,1500),mix:num(0,.5)},['durationMs','mix']),distortion:num(0,50)
},['wave','atMs','durationMs','gain','pitch','envelope']);
const profile=object({name,voices:list(voice,1,12),priority:integer(0,100),cooldownMs:num(0,1000),variation:object({cents:num(0,200),gain:num(0,.3)},['cents','gain']),variants:list(list(voice,1,12),1,8)},['name','voices','priority','cooldownMs']);
const particle=object({name,color,count:integer(1,32),durationMs:num(40,2000),size:num(1,40),speed:num(0,800),directionDeg:num(-360,360),spreadDeg:num(0,360),gravity:num(-1000,1000),shape:enumeration('spark','circle','square'),scale:curve(0,4),alpha:curve(0,1),colors:list(object({at:num(0,1),color},['at','color']),2,8),ring:object({durationMs:num(40,1000),from:num(0,3),to:num(0,4),opacity:num(0,.85)},['durationMs','from','to','opacity'])},['name','color','count','durationMs','size','speed','directionDeg','spreadDeg','gravity','shape','scale','alpha']);
const path=object({name,color,width:num(1,80),height:num(1,40),durationMs:num(40,2000),arc:num(-400,400),trail:integer(0,12),beam:{type:'boolean'}},['name','color','width','height','durationMs','arc','trail']);
const track=object({kind:enumeration('synth','particles','path','effect','sound'),atMs:num(0,5000),target:enumeration('source','target'),profile:id,effect:id,sound:id,alternates:list(id,1,8),priority:integer(0,100),cooldownMs:num(0,1000),gain:num(0,1),repeat:integer(1,8),intervalMs:num(20,2000),spatial},['kind','atMs','target']);
const map=values=>({type:'object',maxProperties:128,propertyNames:id,additionalProperties:values});
export const presentationSchema={...object({version:{const:1},profiles:map(profile),particles:map(particle),paths:map(path),timelines:map(object({name,tracks:list(track,1,32)},['name','tracks'])),bindings:map(id),materials:map(id),materialSprites:map(id),mixer:object({maxSynthVoices:integer(1,48),maxRecordedVoices:integer(1,16),duckGain:num(.1,1),duckHoldMs:num(0,1000),duckReleaseMs:num(20,1500),duckPriority:integer(0,100),compressor:object({threshold:num(-40,0),knee:num(0,40),ratio:num(1,20),attack:num(0,1),release:num(.01,1)},['threshold','knee','ratio','attack','release'])},['maxSynthVoices','maxRecordedVoices','duckGain','duckHoldMs','duckReleaseMs','duckPriority','compressor'])},['version','profiles','particles','paths','timelines','bindings','materials','materialSprites','mixer']),$schema:'https://json-schema.org/draft/2020-12/schema'};

function check(value,schema,path,errors){
  const fail=message=>errors.push(`${path}: ${message}`);
  if(schema.const!==undefined&&value!==schema.const)fail('未対応の版です');
  if(schema.enum&&!schema.enum.includes(value))fail('選択値が不正です');
  if(schema.type==='object'){
    if(!value||typeof value!=='object'||Array.isArray(value)){fail('オブジェクトが必要です');return;}
    if(Object.keys(value).length>(schema.maxProperties??Infinity))fail('定義数が多すぎます');
    for(const key of schema.required??[])if(!Object.hasOwn(value,key))fail(`${key} が必要です`);
    for(const [key,v] of Object.entries(value)){
      if(['__proto__','prototype','constructor'].includes(key)){fail('予約名です');continue;}
      if(schema.propertyNames)check(key,schema.propertyNames,path+'.'+key,errors);
      const child=schema.properties?.[key]??schema.additionalProperties;
      if(child===false)fail(`未知の項目 ${key}`);else if(child)check(v,child,path+'.'+key,errors);
    }
  }else if(schema.type==='array'){
    if(!Array.isArray(value)){fail('配列が必要です');return;}
    if(value.length<schema.minItems||value.length>schema.maxItems)fail('要素数が範囲外です');
    for(let i=0;i<Math.min(value.length,256);i++)check(value[i],schema.items,`${path}[${i}]`,errors);
    if(value.length&&schema.items.properties?.at){let previous=-1;for(const v of value){if(!v||typeof v!=='object'||v.at<=previous)fail('時刻を昇順にしてください');previous=v?.at;}if(value[0]?.at!==0||value.at(-1)?.at!==1)fail('開始0・終了1が必要です');}
  }else if(['number','integer'].includes(schema.type)){
    if(!Number.isFinite(value)||schema.type==='integer'&&!Number.isInteger(value)||value<schema.minimum||value>schema.maximum)fail(`数値は ${schema.minimum}〜${schema.maximum} です`);
  }else if(schema.type==='string'){
    if(typeof value!=='string'||value.length<(schema.minLength??0)||value.length>(schema.maxLength??Infinity)||schema.pattern&&!new RegExp(schema.pattern).test(value))fail('文字列が不正です');
  }else if(schema.type==='boolean'&&typeof value!=='boolean')fail('真偽値が必要です');
}
export function validatePresentationDesign(value,{effects,sounds}={}){
  const errors=[];check(value,presentationSchema,'presentation',errors);if(errors.length)return errors;
  const ref=(db,key,path)=>{if(!Object.hasOwn(db,key))errors.push(`${path}: 参照先がありません ${key}`);};
  for(const [key,t] of Object.entries(value.timelines)){
    let count=0;
    for(const [i,track] of t.tracks.entries()){
      const p=`timelines.${key}.tracks[${i}]`,db={synth:'profiles',particles:'particles',path:'paths'}[track.kind];
      if(db){ref(value[db],track.profile,p);if(track.effect||track.sound)errors.push(p+': 種類と参照が一致しません');}
      else{const field=track.kind;if(typeof track[field]!=='string'||track.profile||track[field==='sound'?'effect':'sound'])errors.push(p+': 種類と参照が一致しません');if((field==='sound'?sounds:effects))ref(field==='sound'?sounds:effects,track[field],p);}
      if(track.alternates){if(track.kind!=='sound')errors.push(p+': 音声候補はsoundだけに指定します');else if(sounds)for(const alt of track.alternates)ref(sounds,alt,p);}
      if((track.repeat??1)>1&&track.intervalMs===undefined)errors.push(p+': 繰返し間隔が必要です');
      if(track.atMs+((track.repeat??1)-1)*(track.intervalMs??0)>5000)errors.push(p+': 開始時刻は5000ms以内です');
      count+=track.repeat??1;
    }
    if(count>64)errors.push(`timelines.${key}: 展開後のトラックは64個以内です`);
  }
  for(const [key,t] of Object.entries(value.bindings))ref(value.timelines,t,'bindings.'+key);
  for(const [key,p] of Object.entries(value.materials))ref(value.profiles,p,'materials.'+key);
  for(const [key,m] of Object.entries(value.materialSprites))ref(value.materials,m,'materialSprites.'+key);
  return errors;
}
export function parsePresentationDesign(input,catalogs){
  const value=typeof input==='string'?JSON.parse(input):structuredClone(input),errors=validatePresentationDesign(value,catalogs);
  if(errors.length)throw Error(errors.slice(0,12).join('\n'));return value;
}
export async function loadPresentationDesign(url,{read=async path=>{const r=await fetch(path);if(!r.ok)throw Error(`演出読込失敗: ${r.status}`);return r.text();},...catalogs}={}){return parsePresentationDesign(await read(url),catalogs);}
export function cosmeticRandom(seed){let n=2166136261;for(const c of String(seed))n=Math.imul(n^c.charCodeAt(0),16777619)>>>0;return ()=>{n=(Math.imul(n,1664525)+1013904223)>>>0;return n/4294967296;};}
export function sampleCurve(points,t){if(t<=points[0].at)return points[0].value;if(t>=points.at(-1).at)return points.at(-1).value;for(let i=1;i<points.length;i++)if(t<=points[i].at){const a=points[i-1],b=points[i];if(t===b.at)return b.value;const u=(t-a.at)/(b.at-a.at);return b.curve==='step'?a.value:b.curve==='exponential'?Math.max(.0001,a.value)*(Math.max(.0001,b.value)/Math.max(.0001,a.value))**u:a.value+(b.value-a.value)*u;}return points.at(-1).value;}
export function voiceDuration(v){return v.atMs+v.durationMs+Math.max((v.echo?.delayMs??0)*(v.echo?.taps??0),v.reverb?.durationMs??0);}
export function profileDuration(profile){return Math.max(0,...[profile?.voices??[],...profile?.variants??[]].flat().map(voiceDuration));}
export function timelineEvents(design,id,{at=0,source,targets=[],sounds={},soundAssets={},seed=0}={}){
  const timeline=design.timelines[id];if(!timeline)return [];
  const soundFor=(track,i)=>{const choices=[track.sound,...track.alternates??[]],selected=choices[Math.floor(cosmeticRandom(`${seed}:${id}:${track.atMs}:${i}`)()*choices.length)];return sounds[selected]?{url:soundAssets[sounds[selected].asset]??soundAssets[selected],gain:(track.gain??1)*sounds[selected].gain}:null;};
  return timeline.tracks.flatMap(track=>Array.from({length:track.repeat??1},(_,i)=>({at:at+track.atMs+i*(track.intervalMs??0),phase:'presentation',effects:track.kind==='effect'?[track.effect]:[],targets:track.target==='source'?(source?[source]:[]):targets,source,
    synth:track.kind==='synth'?track.profile:null,particles:track.kind==='particles'?track.profile:null,path:track.kind==='path'?track.profile:null,
    sound:track.kind==='sound'?soundFor(track,i):null,...(track.priority!==undefined?{priority:track.priority}:{}),...(track.cooldownMs!==undefined?{cooldownMs:track.cooldownMs}:{}),
    ...(track.spatial?{spatial:track.spatial}:{}),decorated:true}))).sort((a,b)=>a.at-b.at);
}
export function decorateFeedback(feedback,design,catalogs={}){
  if(!feedback||feedback.decorated)return feedback;
  const events=[];
  for(const event of feedback.events){
    const kind=battleAccent(event),timeline=event.timeline??design.bindings[kind];
    events.push({...event,decorated:true,synth:event.synth??null,particles:event.particles??null});
    if(timeline){
      // Audio is emitted once for an area attack; visual profiles follow each result.
      const expanded=timelineEvents(design,timeline,{...catalogs,...event,seed:`${feedback.session}:${feedback.revision}`});
      events.push(...expanded.filter(e=>!e.particles).map(e=>({...e,originalPhase:event.phase})));
      for(const target of event.targets??[]){const targetTimeline=event.timeline??design.bindings[battleAccent(event,target)];events.push(...timelineEvents(design,targetTimeline,{...catalogs,...event,targets:[target]}).filter(e=>e.particles));}
    }
    const t=(event.targets??[]).find(t=>!t.missed&&(t.damage>0||t.guarded));
    if(t&&['slash','pierce','heavy','critical','guard'].includes(kind)){
      const material=t.guarded?'shield':t.material,profile=design.materials[material];
      if(profile)events.push({at:event.at,phase:'presentation',targets:[t],source:event.source,effects:[],synth:profile,decorated:true});
    }
  }
  return {...feedback,decorated:true,events:events.sort((a,b)=>a.at-b.at)};
}
export function feedbackDuration(feedback,design,effects={}){
  return Math.max(0,...(feedback?.events??[]).map(e=>e.at+Math.max(240,
    ...(e.effects??[]).map(id=>effectDuration(effects[id])),profileDuration(design.profiles[e.synth]),
    design.particles[e.particles]?.durationMs??0,design.paths[e.path]?.durationMs??0,
    e.phase!=='presentation'&&e.targets?.some(t=>t.damage>0||t.healing>0)?620:0)));
}
export function effectDuration(effect){return effect?Math.max(effect.duration,...effect.tracks.map(t=>(t.atMs??0)+(t.durationMs??effect.duration))):0;}
