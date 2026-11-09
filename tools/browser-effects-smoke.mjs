// Real Chromium rendering/clock check; audio adapter is instrumented, not listened to.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-effects-browser';
await fs.mkdir(output,{recursive:true});
const types={'.html':'text/html','.ogg':'audio/ogg','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{
  const url=decodeURI(req.url.split('?')[0]);
  if(url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="src/view/style.css"><link rel="stylesheet" href="src/view/scene-style.css"><div id="app" data-view="scene"></div></html>');return;}
  const file=path.resolve(root,'.'+url);if(!file.startsWith(root+path.sep)){res.statusCode=403;res.end();return;}
  res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));
}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[],checks=[];
try{
  browser=await chromium.launch({executablePath:process.env.ADV_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-gpu']});
  const page=await browser.newPage({viewport:{width:1280,height:856}});
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async()=>{
    const {nextFormation}=await import('./src/core/battle-formation.js');
    const {loadContent}=await import('./src/core/loader.js'),{GameEngine}=await import('./src/core/engine.js'),{projectGame}=await import('./src/application/projection.js');
    const {SceneView}=await import('./src/view/scene-view.js'),{GameView}=await import('./src/view/view.js'),{GameAudio}=await import('./src/application/audio.js');
    const {applyTheme,THEME_DEFAULT}=await import('./src/view/theme.js');applyTheme(THEME_DEFAULT);const data=await loadContent();
    window.setup=async({actor='ada',mode='full',layout='scene',kill=false,battleMode='classic'}={})=>{
      window.view?.destroy();window.sound?.stopEffects();const g=new GameEngine(data,42);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});
      g.state.members=[actor];g.state.partyFormation=nextFormation(g.state.members,g.state.partyFormation);g.dispatch({type:'travel',dungeon:'kagaribi'});g.startBattle(kill?'wild_waterwheel_beaver':'wild_pair_1',{win:[],lose:[],escape:[]},{battleMode});
      if(kill)g.state.battle.enemies[0].hp=1;
      const marks=[],voices=[],root=document.querySelector('#app');root.dataset.view=layout;
      const sound=new GameAudio({battleSound:null,createAudio:url=>({paused:true,volume:0,pause(){this.paused=true;},addEventListener(){},play(){this.paused=false;voices.push({url,at:performance.now()});return Promise.resolve();}})});sound.configure(true,1,1);
      const ui={status(){},menu(){},help(){},soundEnabled:()=>true,effectsMode:()=>mode,cancelFeedback:()=>sound.stopEffects()};
      const render=()=>{const m=projectGame(g);m.feedback.startedAt=performance.now();view.render(m);sound.sync(m);return m;};
      const dispatch=intent=>{const ok=g.dispatch(intent);window.last=render();return ok;};
      const view=new (layout==='scene'?SceneView:GameView)(root,dispatch,ui),damage=view.effects.damage.bind(view.effects);
      view.effects.damage=(target,m)=>{if(target.damage>0)marks.push({key:target.key,damage:target.damage,at:performance.now()});damage(target,m);};
      Object.assign(window,{g,view,sound,render,dispatch,marks,voices});render();
      await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      marks.length=0;voices.length=0;
    };
    window.freeze=()=>{clearTimeout(view.playback.active?.timer);for(const a of document.getAnimations())a.pause();for(const timer of view.effects.timers)clearTimeout(timer);view.effects.timers.clear();};
  });
  for(const [skill,actor,pattern] of [['attack','ada','slash'],['power','ada','blunt'],['pierce','luka','pierce']]){
    await page.evaluate(options=>setup(options),{actor});
    const state=await page.evaluate(async skill=>{dispatch({type:'battle',action:'skill',skill,target:'enemy_0'});const state=g.save();await new Promise(r=>setTimeout(r,175));freeze();return state;},skill);
    assert.equal(await page.locator('.fx-strike-'+pattern).count(),1);assert.ok(await page.locator('.fx-damage').count());
    assert.ok(await page.evaluate(()=>Number(getComputedStyle(document.querySelector('.fx-strike')).zIndex)>Number(getComputedStyle(document.querySelector('.fx-ghost')).zIndex)),'hit mark must paint above the moving enemy');
    const delta=await page.evaluate(()=>{const hit=voices.find(v=>v.url.includes('/se/'));return Math.abs(hit.at-marks[0].at);});assert.ok(delta<50,`impact/sound scheduling delta ${delta}ms`);
    assert.equal(await page.evaluate(()=>g.save()),state);await page.screenshot({path:path.join(output,skill+'.png')});
    if(skill==='power'){
      const held=await page.evaluate(()=>{const a=document.getAnimations().find(a=>a.effect.getKeyframes().some(f=>f.transform?.includes('scale(1.12, 0.86)')));if(!a)return null;a.currentTime=50;const first=getComputedStyle(a.effect.target).transform;a.currentTime=85;return [first,getComputedStyle(a.effect.target).transform];});
      assert.ok(held);assert.equal(held[0],held[1]);
    }
  }
  for(const battleMode of ['classic','grid','frontline']){
    for(const layout of ['scene','classic']){
      await page.evaluate(options=>setup(options),{battleMode,layout});
      if(battleMode==='frontline')await page.waitForFunction(()=>document.querySelector('.frontline-stage')?.dataset.ready==='true');
      const observed=await page.evaluate(async()=>{
        const key='enemy:enemy_0',read=()=>[...document.querySelectorAll('[data-battle-vitals]')].find(n=>n.dataset.battleVitals===key&&n.dataset.vitalsKind==='text').textContent;
        const before=read(),hp=g.state.battle.enemies[0].hp;
        dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'});
        const saved=g.save(),early=read(),active=Boolean(view.playback.active);
        await new Promise(r=>setTimeout(r,175));
        const hit=last.feedback.events.find(e=>e.phase==='impact');
        const impacted=read();view.playback.finish();
        return {before,early,active,impacted,after:hit.targets[0].hpAfter,hp,unchanged:saved===g.save(),restored:!view.playback.active&&!document.querySelector('#app>[inert]')};
      });
      assert.equal(observed.early,observed.before);assert.ok(observed.active);assert.ok(observed.impacted.includes(String(observed.after)));assert.ok(observed.after<observed.hp);assert.ok(observed.unchanged&&observed.restored);
    }
  }
  checks.push('impact-aligned HP and skip without duplicate actions in all three battle modes and both views');
  checks.push('real engine attacks: three distinct physical patterns; sound adapter and damage/impact within 50ms; 50ms heavy hold; animation never changes saved game');
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:856});await page.evaluate(()=>setup());
    await page.evaluate(async()=>{dispatch({type:'battle',action:'skill',skill:'guard',target:'ada'});const event=last.feedback.events.find(e=>e.phase==='impact'&&e.source?.key.startsWith('enemy:'));await new Promise(r=>setTimeout(r,event.at+30));freeze();});
    assert.ok(await page.locator('.fx-damage').count());
    const anchored=await page.evaluate(()=>{const a=view.effects.anchor({key:'actor:ada'}),n=document.querySelector('.fx-damage').getBoundingClientRect();return {width:a.rect.width,top:a.rect.top,numberTop:n.top,fallback:Boolean(a.element?.dataset.fxFallback)};});
    assert.ok(anchored.width>0);assert.ok(Math.abs(anchored.numberTop-anchored.top)<100);assert.equal(anchored.fallback,width===390);
    await page.screenshot({path:path.join(output,`enemy-hit-${width}.png`)});
    await page.evaluate(()=>render());assert.equal(await page.locator('.fx-overlay').count(),0);
  }
  checks.push('enemy anticipation and incoming damage in desktop and mobile layouts; hidden phone portraits fall back to visible cards; redraw removes overlays');
  await page.setViewportSize({width:1280,height:856});
  await page.evaluate(()=>setup({actor:'nio'}));
  await page.evaluate(async()=>{
    const bow=Object.values(g.data.items).find(i=>i.equipmentType==='bow');g.state.actors.nio.equipment.weapon=bow.id;
    dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'});await new Promise(r=>setTimeout(r,60));freeze();
  });
  assert.equal(await page.locator('.fx-projectile').count(),1);await page.screenshot({path:path.join(output,'bow-flight.png')});
  await page.evaluate(()=>setup({battleMode:'frontline'}));await page.waitForFunction(()=>document.querySelector('.frontline-stage')?.dataset.ready==='true');
  await page.evaluate(async()=>{dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'});await new Promise(r=>setTimeout(r,175));freeze();});
  assert.ok(await page.locator('.fx-ghost canvas').count());await page.screenshot({path:path.join(output,'frontline-hit.png')});
  await page.setViewportSize({width:1280,height:856});
  for(const mode of ['reduced','off']){
    await page.evaluate(mode=>setup({mode}),mode);
    await page.evaluate(async()=>{dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'});await new Promise(r=>setTimeout(r,175));freeze();});
    assert.equal(await page.locator('.fx-strike,.fx-ghost').count(),0);assert.equal(await page.locator('.fx-damage').count(),mode==='off'?0:1);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>setup());
  await page.evaluate(async()=>{dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'});await new Promise(r=>setTimeout(r,175));freeze();});
  assert.equal(await page.locator('.fx-strike,.fx-ghost').count(),0);await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>setup({layout:'classic'}));
  await page.evaluate(async()=>{dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'});await new Promise(r=>setTimeout(r,175));freeze();});
  assert.equal(await page.locator('.fx-strike-slash').count(),1);await page.screenshot({path:path.join(output,'classic-hit.png')});
  await page.evaluate(()=>setup({kill:true}));
  await page.evaluate(async()=>{dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'});await new Promise(r=>setTimeout(r,175));freeze();});
  assert.equal(await page.evaluate(()=>g.state.battle),null);assert.ok(await page.evaluate(()=>view.model.battle));assert.equal(await page.locator('.fx-strike-slash').count(),1);assert.equal(await page.locator('.fx-damage').count(),1);
  await page.evaluate(()=>setup());
  await page.evaluate(async()=>{dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'});render();await new Promise(r=>setTimeout(r,950));});
  assert.equal(await page.locator('.fx-overlay').count(),0);
  checks.push('reduced/off/OS reduced motion, classic layout, final blow after enemy removal, and cancellation before impact');
  await page.evaluate(()=>setup());
  await page.evaluate(async()=>{const {applyStatus}=await import('./src/core/status-effects.js');applyStatus(g.data,g.state,g.state.actors.ada,'guaranteed_critical',{turns:2});dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'});await new Promise(r=>setTimeout(r,175));freeze();});
  assert.ok(await page.locator('.fx-accent-critical.fx-impact-particle').count());assert.ok(await page.locator('.fx-critical').count());await page.screenshot({path:path.join(output,'critical-enhanced.png')});
  assert.ok(await page.evaluate(()=>Number(getComputedStyle(document.querySelector('.fx-impact-ring')).zIndex)>Number(getComputedStyle(document.querySelector('.fx-ghost')).zIndex)),'critical light must appear above the recoil sprite');
  await page.evaluate(()=>setup({actor:'toma'}));
  await page.evaluate(async()=>{g.state.actors.toma.hp=Math.max(1,g.state.actors.toma.hp-8);render();dispatch({type:'battle',action:'skill',skill:'group_heal'});await new Promise(r=>setTimeout(r,175));freeze();});
  assert.ok(await page.locator('.fx-accent-heal.fx-impact-particle').count());await page.screenshot({path:path.join(output,'heal-enhanced.png')});
  await page.evaluate(()=>setup({kill:true}));
  await page.evaluate(async()=>{dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'});await new Promise(r=>setTimeout(r,335));freeze();});
  assert.ok(await page.locator('.fx-accent-defeat.fx-impact-particle').count());await page.screenshot({path:path.join(output,'defeat-enhanced.png')});
  await page.evaluate(()=>view.playback.finish());assert.equal(await page.locator('.fx-impact-ring,.fx-impact-particle').count(),0);
  for(const mode of ['reduced','off']){
    await page.evaluate(mode=>setup({mode}),mode);await page.evaluate(async()=>{const {applyStatus}=await import('./src/core/status-effects.js');applyStatus(g.data,g.state,g.state.actors.ada,'guaranteed_critical',{turns:2});dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'});await new Promise(r=>setTimeout(r,175));freeze();});
    assert.equal(await page.locator('.fx-impact-ring,.fx-impact-particle').count(),0);
  }
  checks.push('critical sparks and shock ring, healing motes, defeat debris; skip cleans every overlay; reduced/off suppress moving accents');
  const sounds=await page.evaluate(async()=>{
    const {BattleSound}=await import('./src/application/battle-sound.js'),{loadContent}=await import('./src/core/loader.js'),data=await loadContent(),results=[];
    for(const [kind,effects,extra,se] of [
      ['slash',['strike_slash'],{},'se_slash'],['pierce',['strike_pierce'],{},'se_pierce'],['heavy',['strike_blunt'],{},'se_heavy'],['critical',['strike_slash'],{critical:true},'se_slash'],
      ['guard',[],{guarded:true},'se_guard'],['heal',[],{damage:0,healing:8},'se_heal'],['fire',['fire_burst'],{},'se_fire'],['ice',['ice_shards'],{},'se_ice'],['lightning',['lightning_arc'],{},'se_lightning'],['defeat',[],{},'se_bump']
    ]){
      const c=new OfflineAudioContext(1,44100*2,44100),synth=new BattleSound({createContext:()=>c});synth.configure(true,1);
      const buffer=await c.decodeAudioData(await (await fetch(data.assets.audio[se])).arrayBuffer()),sample=c.createBufferSource(),gain=c.createGain();sample.buffer=buffer;gain.gain.value=data.sounds[se].gain*(kind==='defeat'?.55:1);sample.connect(gain);gain.connect(c.destination);sample.start();
      synth.play({phase:kind==='defeat'?'defeat':'impact',effects,targets:[{key:'enemy:enemy_0',damage:12,...extra}]});
      const rendered=await c.startRendering(),a=rendered.getChannelData(0);let sum=0,peak=0,signature=0;
      for(let i=0;i<a.length;i++){sum+=a[i]*a[i];peak=Math.max(peak,Math.abs(a[i]));signature+=a[i]*((i%97)-48);}
      results.push({kind,rms:Math.sqrt(sum/a.length),peak,signature});synth.stop();
    }
    return results;
  });
  for(const result of sounds){assert.ok(result.rms>.0001,result.kind+' is silent');assert.ok(result.peak<.98,result.kind+' clips: '+result.peak);}
  assert.equal(new Set(sounds.map(s=>s.signature.toFixed(5))).size,sounds.length);
  checks.push('real OfflineAudioContext mixes 10 recorded+synthesized SE variants: all non-silent, distinct and below clipping; speaker listening is not claimed');
  await page.goto(`http://127.0.0.1:${server.address().port}/battle-presentation-editor.html`);
  await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('プリセットを選び'));
  assert.equal(await page.locator('#preset option').count(),19);
  await page.selectOption('#preset','charge');await page.click('#play');
  await page.waitForFunction(()=>document.querySelector('#wave-status').textContent.includes('ピーク'));
  assert.equal(await page.locator('#status').getAttribute('data-error'),'false');await page.click('#stop');
  await page.selectOption('#preset','heavy');await page.click('#capture-a');
  await page.getByLabel('音源1の音量',{exact:true}).fill('0.09');await page.getByLabel('音源1の音量',{exact:true}).dispatchEvent('change');
  assert.equal(JSON.parse(await page.inputValue('#item-json')).voices[0].gain,.09);
  await page.click('#play-a');assert.equal(JSON.parse(await page.inputValue('#item-json')).voices[0].gain,.09);await page.click('#restore-a');
  assert.equal(JSON.parse(await page.inputValue('#item-json')).voices[0].gain,.16);
  await page.locator('summary').click();const original=await page.inputValue('#document-json');
  await page.fill('#document-json',JSON.stringify({...JSON.parse(original),version:9}));await page.click('#apply-document');assert.equal(await page.locator('#status').getAttribute('data-error'),'true');
  await page.fill('#document-json',original);await page.click('#apply-document');assert.equal(await page.locator('#status').getAttribute('data-error'),'false');
  const downloadPromise=page.waitForEvent('download');await page.click('#export');const download=await downloadPromise;const exportPath=path.join(output,'battle-presentation-export.json');await download.saveAs(exportPath);
  const exported=JSON.parse(await fs.readFile(exportPath,'utf8'));assert.equal(exported.version,1);assert.equal(exported.profiles.heavy.voices[0].gain,.16);
  exported.profiles.heavy.name='読込検証';await page.setInputFiles('#import',{name:'design.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))});await page.waitForFunction(()=>document.querySelector('#preset option[value=heavy]').textContent==='読込検証');
  await page.selectOption('#category','timelines');await page.selectOption('#preset','arc_demo');await page.click('#play');await page.waitForFunction(()=>document.querySelectorAll('.fx-trail').length===5);
  await page.screenshot({path:path.join(output,'presentation-editor-desktop.png')});await page.click('#stop');assert.equal(await page.locator('.fx-overlay').count(),0);
  await page.selectOption('#preset','beam_demo');await page.click('#play');await page.waitForFunction(()=>document.querySelector('.fx-beam'));await page.click('#stop');await page.waitForTimeout(300);assert.equal(await page.locator('.fx-overlay').count(),0);
  await page.selectOption('#motion','reduced');await page.click('#play');assert.equal(await page.locator('.fx-impact-particle,.fx-trail,.fx-beam').count(),0);await page.click('#stop');
  await page.selectOption('#motion','full');await page.setViewportSize({width:390,height:856});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.screenshot({path:path.join(output,'presentation-editor-mobile.png')});
  const designAudio=await page.evaluate(async()=>{
    const {defaultPresentation}=await import('./src/presentation-presets.js'),{BattleSound}=await import('./src/application/battle-sound.js'),results=[];
    for(const id of Object.keys(defaultPresentation.profiles)){
      const c=new OfflineAudioContext(2,44100*2,44100),synth=new BattleSound({createContext:()=>c});synth.configure(true,1);synth.play({synth:id,variationSeed:42,spatial:{pan:id==='charge'?-1:0}});const buffer=await c.startRendering();let peak=0,sum=0,right=0,tail=0;
      for(let ch=0;ch<2;ch++){const a=buffer.getChannelData(ch);for(let i=0;i<a.length;i++){peak=Math.max(peak,Math.abs(a[i]));sum+=a[i]*a[i];if(ch===1)right+=a[i]*a[i];if(i>44100*.66)tail+=a[i]*a[i];}}results.push({id,peak,rms:Math.sqrt(sum/(44100*4)),right,tail});synth.stop();
    }return results;
  });
  for(const r of designAudio){assert.ok(r.rms>.00001,r.id+' is silent');assert.ok(r.peak<.98,r.id+' peak');}
  assert.ok(designAudio.find(r=>r.id==='charge').right<1e-10);assert.ok(designAudio.find(r=>r.id==='charge').tail>0);
  checks.push('presentation editor: JSON validation/import/export, A/B snapshots, waveform, arc/trail/beam previews, stop/reduced motion, desktop/mobile layout; 19 synthesized profiles rendered with echo tail and stereo checks');
  await fs.writeFile(path.join(output,'design-audio.json'),JSON.stringify(designAudio,null,2)+'\n');
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks,sounds,errors},null,2)+'\n');console.log(JSON.stringify({passed:true,checks,errors},null,2));
}finally{await browser?.close();server.close();}
