// Record the output of the real game in Chromium. No game audio adapter is replaced.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {newGame} from '../tests/helpers.mjs';
import {nextFormation} from '../src/core/battle-formation.js';

function installRecorder(save){
  localStorage.setItem('lantern-archive:v1:scenario:e1:auto',save);
  localStorage.setItem('lantern-archive:v1:settings',JSON.stringify({sound:false,viewLayout:'scene',scenarioEdition:'e1',volume:.5,seVolume:.8}));
  let ctx,tap,recording=false,pcm=[];
  const played=[];
  const connect=AudioNode.prototype.connect;
  const NativeContext=window.AudioContext;
  window.AudioContext=class extends NativeContext {
    constructor(...args){
      super(...args);
      ctx=this;
      tap=this.createScriptProcessor(1024,2,1);
      tap.onaudioprocess=event=>{
        if(!recording)return;
        const left=event.inputBuffer.getChannelData(0),right=event.inputBuffer.getChannelData(1);
        for(let i=0;i<left.length;i++)pcm.push(left[i],right[i]);
      };
      // The recorder's output is silent. Normal game connections still go to the speakers.
      connect.call(tap,this.destination);
    }
  };
  AudioNode.prototype.connect=function(target,...args){
    if(ctx && target===ctx.destination && this!==tap)connect.call(this,tap);
    return connect.call(this,target,...args);
  };
  const play=HTMLMediaElement.prototype.play;
  const music=new WeakMap();
  HTMLMediaElement.prototype.play=function(){
    // BGM normally plays directly from its HTML element. Mirror it at unity, retaining
    // its actual volume and the game's ducking envelope, so the capture includes it.
    if(this.loop && ctx && !music.has(this)){
      const source=ctx.createMediaElementSource(this);
      source.connect(ctx.destination);
      music.set(this,source);
    }
    this.addEventListener('playing',()=>{
      played.push({file:new URL(this.currentSrc||this.src,location.href).pathname.split('/').pop(),time:ctx?.currentTime??0});
    },{once:true});
    return play.call(this);
  };
  window.battleCapture={
    played,
    begin(){pcm=[];recording=true;},
    end(){
      recording=false;
      const samples=pcm.map(v=>Math.round(Math.max(-1,Math.min(1,v))*32767));
      return {pcm:samples,rate:ctx.sampleRate,played};
    }
  };
}

function waveFile(samples,rate){
  const wav=Buffer.alloc(44+samples.length*2);
  wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);
  wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);
  wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);
  wav.write('data',36);wav.writeUInt32LE(samples.length*2,40);
  for(let i=0;i<samples.length;i++)wav.writeInt16LE(samples[i],44+2*i);
  return wav;
}

export async function captureBattleMix(browser,base,output,name,{checkSelection=true,actor='ada',skill='attack',impactFile='se_chip_contact.wav'}={}){
  const engine=newGame(311);
  engine.state.members=[actor];
  engine.state.partyFormation=nextFormation(engine.state.members,engine.state.partyFormation);
  engine.dispatch({type:'travel',dungeon:'kagaribi'});
  engine.startBattle('roaming_1',{win:[],lose:[],escape:[]},{battleMode:'classic'});
  const page=await browser.newPage({viewport:{width:1100,height:850}});
  page.setDefaultTimeout(150000);
  try{
    await page.addInitScript(installRecorder,engine.save());
    await page.goto(new URL('index.html',base).href,{waitUntil:'domcontentloaded'});
    await page.locator('[data-focus="skill:attack"]').waitFor();
    await page.locator('[data-audio-toggle]').click();
    await page.waitForFunction(()=>battleCapture.played.some(e=>e.file==='battle-v2.ogg'));
    if(skill!=='attack')await page.locator('[data-focus="battle-menu:skills"]').click();
    await page.locator(`[data-focus="skill:${skill}"]`).click();
    await page.evaluate(()=>battleCapture.begin());
    await page.waitForTimeout(350);
    await page.locator('[data-focus="target:enemy_0"]').click();
    await page.waitForFunction(()=>battleCapture.played.filter(e=>e.file.endsWith('.wav')).length>=4);
    await page.waitForTimeout(550);
    const {pcm,rate,played}=await page.evaluate(()=>battleCapture.end());
    const events=played.filter(e=>e.file.endsWith('.wav'));
    if(checkSelection){
      assert.deepEqual(events.map(e=>e.file),['se_chip_ally.wav',impactFile,'se_chip_enemy.wav','se_chip_contact.wav']);
      for(const [start,hit] of [[0,1],[2,3]])assert.ok(events[hit].time-events[start].time>.12 && events[hit].time-events[start].time<.4,JSON.stringify(events));
    }
    assert.ok(pcm.length>rate*2 && pcm.some(v=>Math.abs(v)>600),'recorded mix is empty or silent');
    await fs.mkdir(output,{recursive:true});
    await fs.writeFile(path.join(output,name+'.wav'),waveFile(pcm,rate));
    await fs.writeFile(path.join(output,name+'.json'),JSON.stringify({rate,played},null,2));
  }finally{await page.close();}
}
