import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {activeActor} from '../src/core/battle.js';
import {projectGame} from '../src/application/projection.js';
import {validateContent} from '../src/core/validation.js';
import {GameAudio} from '../src/application/audio.js';

const fxGame=()=>{const d=structuredClone(data);d.scripts.test_fx={commands:[{op:'effect.play',effect:'skew',target:'scene',delay:80},{op:'audio.se',asset:'se_trap',delay:80,volume:.4},{op:'screen.set',layer:'mist',color:'#453955',opacity:.3,shade:true},{op:'say',text:'保存できる演出の場面です。'}]};d.game.services.push({id:"test_fx",label:"演出",detail:"演出の検証",script:"test_fx"});const g=new GameEngine(d);drain(g);return g;};
test('JSON effects and SE share timing; only persistent screen layers survive a save',()=>{
 const g=fxGame();assert.deepEqual(validateContent(g.data),[]);g.dispatch({type:'service',id:'test_fx'});assert.equal(g.feedback.events.length,2);assert.equal(g.feedback.events[0].at,g.feedback.events[1].at);const vm=projectGame(g);vm.effects.skew.duration=999;assert.equal(g.data.effects.skew.duration,400);
 const before=g.save(),next=new GameEngine(g.data);next.load(before);assert.equal(next.save(),before);assert.equal(next.feedback.events.length,0);assert.deepEqual(next.state.presentation.layers.mist,{color:'#453955',opacity:.3,shade:true});assert.equal(projectGame(next).se,null);
 const corrupt=JSON.parse(before);corrupt.state.presentation.layers.mist.opacity=1;assert.throws(()=>next.load(JSON.stringify(corrupt)));assert.equal(next.save(),before);
 next.data.scripts.clear_fx={commands:[{op:'screen.clear',layer:'mist'}]};drain(next);next.run('clear_fx');assert.deepEqual(next.state.presentation.layers,{});
});
test('1.1 saves migrate in battle, retain RNG and progress, and do not replay historical SE',()=>{
 const g=newGame(91);g.dispatch({type:'travel',region:1});g.startBattle('wild_pair_1',{win:[],lose:[],escape:[]});const saved=JSON.parse(g.save());saved.contentVersion=saved.state.contentVersion='1.1.0';saved.state.presentation.se={asset:'battle',revision:999};const rng=saved.state.rng;g.load(JSON.stringify(saved));assert.equal(g.state.contentVersion,'1.2.0');assert.equal(g.state.rng,rng);assert.equal(g.state.battle.encounter,'wild_pair_1');assert.equal(g.feedback.events.length,0);assert.equal(projectGame(g).se,null);
});
test('presentation does not consume random numbers or change battle and quest state',()=>{
 const enabled=newGame(312),silentData=structuredClone(data);silentData.presentation.cues={};const silent=new GameEngine(silentData,312);drain(silent);
 for(const g of [enabled,silent]){g.dispatch({type:'accept',id:'q001'});g.dispatch({type:'travel',region:1});g.startBattle('wild_pair_1',{win:[],lose:[],escape:[]});}
 let actions=0;while(enabled.state.battle){const id=activeActor(enabled),target=enabled.state.battle.enemies.find(e=>e.hp>0).instance;const intent={type:'battle',action:'skill',skill:'attack',target};assert.ok(enabled.dispatch(intent));assert.ok(silent.dispatch(intent));assert.equal(enabled.save(),silent.save());assert.ok(++actions<100);}
});
test('last blows keep the defeated enemy image, group skills emit one sound for all targets',()=>{
 const g=newGame();g.dispatch({type:'travel',region:1});g.startBattle('wild_waterwheel_beaver',{win:[],lose:[],escape:[]});g.state.battle.enemies[0].hp=1;g.dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'});assert.equal(g.state.battle,null);const hit=g.feedback.events.find(e=>e.effects.includes('slash_arc'));assert.equal(hit.targets[0].image,'monster_waterwheel_beaver');assert.ok(g.feedback.events.some(e=>e.sound==='se_victory'));
 const h=newGame();h.state.members=['toma','dora'];h.startBattle('wild_pair_1',{win:[],lose:[],escape:[]});h.dispatch({type:'battle',action:'skill',skill:'group_heal'});const heals=h.feedback.events.filter(e=>e.sound==='se_heal');assert.equal(heals.length,1);assert.equal(heals[0].targets.length,2);
});
test('field atmosphere follows light and malformed effect scripts and transforms are rejected',()=>{
 const g=newGame();g.dispatch({type:'travel',region:1});g.state.light=0;assert.equal(projectGame(g).atmosphere[1].opacity,.55);g.state.light=90;assert.equal(projectGame(g).atmosphere[1].opacity,0);
 assert.equal(Object.keys(data.effects).length,24);assert.equal(Object.keys(data.sounds).length,28);for(const id of Object.keys(data.skills))assert.ok(data.presentation.bindings.skills[id],id);
 for(const mutate of [d=>d.effects.skew.tracks[0].frames[1].skewX=999,d=>d.effects.skew.tracks[0].frames[1].filter='url(evil)',d=>d.effects.slash_arc.tracks[0].asset='missing',d=>d.scripts.bad={commands:[{op:'effect.play',effect:'skew',target:'body > img'}]},d=>d.scripts.bad={commands:[{op:'screen.set',layer:'__proto__',color:'#000000',opacity:.2}]}]){const d=structuredClone(data);mutate(d);assert.ok(validateContent(d).length>0);}
});
test('delayed SE cancels on new input/load and mute; group voices remain bounded',async()=>{
 const jobs=new Map(),voices=[];let serial=0;const audio=new GameAudio({schedule:(fn,at)=>{jobs.set(++serial,fn);return serial;},cancel:id=>jobs.delete(id),createAudio:url=>{const a={url,paused:true,volume:0,pause(){this.paused=true;},addEventListener(){},play(){this.paused=false;return Promise.resolve();}};voices.push(a);return a;}});
 const event={at:180,sound:{url:'se.ogg',gain:.5}},model={music:null,feedback:{session:1,revision:1,events:[event]}};audio.configure(true,.8,.5);audio.sync(model);assert.equal(jobs.size,1);audio.sync(model);assert.equal(jobs.size,1);audio.sync({music:null,feedback:{session:2,revision:0,events:[]}});assert.equal(jobs.size,0);assert.equal(voices.length,0);
 audio.sync({...model,feedback:{...model.feedback,revision:2}});audio.configure(false,.8,.5);assert.equal(jobs.size,0);audio.configure(true,.8,.5);audio.sync({...model,feedback:{...model.feedback,revision:3,events:[{...event,at:0}]}});assert.equal(voices[0].volume,.2);
 for(let i=0;i<10;i++)audio.playEffect('se.ogg');assert.equal(audio.effects.size,8);assert.ok(voices[0].paused);audio.configure(true,0,.5);const count=voices.length;audio.playEffect('se.ogg');assert.equal(voices.length,count);
});
