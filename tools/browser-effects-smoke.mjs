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
const types={'.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
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
    const {loadContent}=await import('./src/core/loader.js'),{GameEngine}=await import('./src/core/engine.js'),{projectGame}=await import('./src/application/projection.js');
    const {SceneView}=await import('./src/view/scene-view.js'),{GameView}=await import('./src/view/view.js'),{GameAudio}=await import('./src/application/audio.js');
    const {applyTheme,THEME_DEFAULT}=await import('./src/view/theme.js');applyTheme(THEME_DEFAULT);const data=await loadContent();
    window.setup=async({actor='ada',mode='full',layout='scene',kill=false}={})=>{
      window.view?.destroy();window.sound?.stopEffects();const g=new GameEngine(data,42);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});
      g.state.members=[actor];g.dispatch({type:'travel',dungeon:'kagaribi'});g.startBattle(kill?'wild_waterwheel_beaver':'wild_pair_1',{win:[],lose:[],escape:[]});
      if(kill)g.state.battle.enemies[0].hp=1;
      const marks=[],voices=[],root=document.querySelector('#app');root.dataset.view=layout;
      const sound=new GameAudio({createAudio:url=>({paused:true,volume:0,pause(){this.paused=true;},addEventListener(){},play(){this.paused=false;voices.push({url,at:performance.now()});return Promise.resolve();}})});sound.configure(true,1,1);
      const ui={status(){},menu(){},help(){},soundEnabled:()=>true,effectsMode:()=>mode,cancelFeedback:()=>sound.stopEffects()};
      const render=()=>{const m=projectGame(g);m.feedback.startedAt=performance.now();view.render(m);sound.sync(m);return m;};
      const dispatch=intent=>{const ok=g.dispatch(intent);window.last=render();return ok;};
      const view=new (layout==='scene'?SceneView:GameView)(root,dispatch,ui),damage=view.effects.damage.bind(view.effects);
      view.effects.damage=(target,m)=>{if(target.damage>0)marks.push({key:target.key,damage:target.damage,at:performance.now()});damage(target,m);};
      Object.assign(window,{g,view,sound,render,dispatch,marks,voices});render();
      await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));
      marks.length=0;voices.length=0;
    };
    window.freeze=()=>{for(const a of document.getAnimations())a.pause();for(const timer of view.effects.timers)clearTimeout(timer);view.effects.timers.clear();};
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
  checks.push('real engine attacks: three distinct physical patterns; sound adapter and damage/impact within 50ms; 50ms heavy hold; animation never changes saved game');
  for(const width of [1280,390]){
    await page.setViewportSize({width,height:856});await page.evaluate(()=>setup());
    await page.evaluate(async()=>{dispatch({type:'battle',action:'skill',skill:'guard',target:'ada'});const event=last.feedback.events.find(e=>e.source?.key.startsWith('enemy:'));await new Promise(r=>setTimeout(r,event.at+30));freeze();});
    assert.ok(await page.locator('.fx-damage').count());
    const anchored=await page.evaluate(()=>{const a=view.effects.anchor({key:'actor:ada'}),n=document.querySelector('.fx-damage').getBoundingClientRect();return {width:a.rect.width,top:a.rect.top,numberTop:n.top,fallback:Boolean(a.element?.dataset.fxFallback)};});
    assert.ok(anchored.width>0);assert.ok(Math.abs(anchored.numberTop-anchored.top)<100);assert.equal(anchored.fallback,width===390);
    await page.screenshot({path:path.join(output,`enemy-hit-${width}.png`)});
    await page.evaluate(()=>render());assert.equal(await page.locator('.fx-overlay').count(),0);
  }
  checks.push('enemy anticipation and incoming damage in desktop and mobile layouts; hidden phone portraits fall back to visible cards; redraw removes overlays');
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
  assert.equal(await page.evaluate(()=>g.state.battle),null);assert.equal(await page.locator('.fx-strike-slash').count(),1);assert.equal(await page.locator('.fx-damage').count(),1);
  await page.evaluate(()=>setup());
  await page.evaluate(async()=>{dispatch({type:'battle',action:'skill',skill:'attack',target:'enemy_0'});render();await new Promise(r=>setTimeout(r,950));});
  assert.equal(await page.locator('.fx-overlay').count(),0);
  checks.push('reduced/off/OS reduced motion, classic layout, final blow after enemy removal, and cancellation before impact');
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2)+'\n');console.log(JSON.stringify({passed:true,checks,errors},null,2));
}finally{await browser?.close();server.close();}
