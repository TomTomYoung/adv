import {GameAudio} from './application/audio.js';
// Independent adapter for the view designer; never imports or creates a game.
const [assets,sounds]=await Promise.all(['data/assets.json','data/sounds.json'].map(async path=>{const r=await fetch(path);if(!r.ok)throw Error(`SE表示例の読込失敗: ${path}`);return r.json();}));
const audio=new GameAudio(),row=document.createElement('div');row.className='designer-fields';
const label=document.createElement('label');label.textContent='SE ';const select=document.createElement('select');for(const [id,s] of Object.entries(sounds))select.append(new Option(s.name,id));label.append(select);
const play=document.createElement('button');play.textContent='SEを試聴';play.addEventListener('click',()=>{audio.stopEffects();audio.configure(true,.5,.8);audio.playEffect(assets.audio[sounds[select.value].asset],sounds[select.value].gain);});
const stop=document.createElement('button');stop.textContent='音を止める';stop.addEventListener('click',()=>audio.stopEffects());row.append(label,play,stop);document.querySelector('.designer-bar').append(row);
