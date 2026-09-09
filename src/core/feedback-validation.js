import {isRecord} from './expression.js';
export const colorValid=v=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v);
const number=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
export const layerNameValid=v=>typeof v==='string'&&/^[a-z][a-z0-9_]{0,31}$/.test(v)&&!['constructor','prototype'].includes(v);
export const targetValid=v=>typeof v==='string'&&/^(scene|screen|party|actor:[a-z][a-z0-9_]*|enemy:enemy_[0-7])$/.test(v);
export function layersValid(layers){return layers===undefined||isRecord(layers)&&Object.keys(layers).length<=4&&Object.entries(layers).every(([id,v])=>layerNameValid(id)&&isRecord(v)&&colorValid(v.color)&&number(v.opacity,0,.65)&&typeof v.shade==='boolean'&&Object.keys(v).every(k=>['color','opacity','shade'].includes(k)));}
export function validatePresentation(data){
  const errors=[],fail=(id,m)=>errors.push(`presentation.${id}: ${m}`),ref=(db,id,p)=>{if(!Object.hasOwn(db??{},id))fail(p,`参照先がありません: ${id}`);};
  for(const [id,s] of Object.entries(data.sounds??{})){ref(data.assets.audio,s.asset,id);if(!number(s.gain,0,1))fail(id,'SE音量は0〜1です');}
  for(const [id,e] of Object.entries(data.effects??{})){
    if(!number(e.duration,50,5000)||!Array.isArray(e.tracks)||e.tracks.length<1||e.tracks.length>8){fail(id,'時間・トラック数が不正です');continue;}
    for(const t of e.tracks){
      if(t.kind==='motion'){
        if(!Array.isArray(t.frames)||t.frames.length<2||t.frames.length>32){fail(id,'キーフレーム数が不正です');continue;}
        if(t.frames[0].at!==0||t.frames.at(-1).at!==1)fail(id,'開始0・終了1が必要です');let previous=-1;
        const ranges={at:[0,1],x:[-200,200],y:[-200,200],rotate:[-360,360],skewX:[-40,40],skewY:[-40,40],scaleX:[.1,3],scaleY:[.1,3],opacity:[0,1]};
        for(const f of t.frames){if(!isRecord(f)||!number(f.at,0,1)||f.at<=previous){fail(id,'キーフレームの順序が不正です');continue;}previous=f.at;for(const [k,v] of Object.entries(f))if(!ranges[k]||!number(v,...ranges[k]))fail(id,`変形値が不正です: ${k}`);}
      }else if(t.kind==='sprite'){
        ref(data.assets.images,t.asset,id);for(const [k,min,max] of [['frames',2,64],['columns',1,64],['cell',8,512]])if(!Number.isInteger(t[k])||!number(t[k],min,max))fail(id,`コマ指定が不正です: ${k}`);if(!number(t.scale??1,.1,3))fail(id,'拡大率が不正です');
      }else if(t.kind==='split'){if(!['vertical','diagonal'].includes(t.axis)||!number(t.distance,0,100)||!number(t.rotate,-45,45))fail(id,'切断指定が不正です');}
      else if(['tint','shade'].includes(t.kind)){if(!colorValid(t.color)||!number(t.opacity,0,.65))fail(id,'色・不透明度が不正です');}
      else fail(id,'未知のトラックです');
    }
  }
  const p=data.presentation;if(!p)return errors;
  for(const [id,c] of Object.entries(p.cues??{})){if(!Array.isArray(c.effects)||c.effects.length>8)fail(id,'効果の数が不正です');else for(const e of c.effects)ref(data.effects,e,id);if(c.sound)ref(data.sounds,c.sound,id);if(c.target!=='target'&&!targetValid(c.target))fail(id,'対象が不正です');if(!number(c.gap,0,1000))fail(id,'間隔が不正です');}
  for(const [kind,bindings] of Object.entries(p.bindings??{}))for(const [key,cue] of Object.entries(bindings)){ref(p.cues,cue,`${kind}.${key}`);if(kind==='skills')ref(data.skills,key,key);}
  const {darkness,shade}=p.ambient??{};if(!darkness||!number(darkness.threshold,1,data.system.lightCapacity)||!number(darkness.maxOpacity,0,.65)||!colorValid(darkness.color))fail('ambient','暗さが不正です');if(!shade||!number(shade.opacity,0,.65)||!colorValid(shade.color))fail('ambient','シェードが不正です');
  return errors;
}
