// Native Web Animations / real CSS check. Requires Playwright and Chromium.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(import.meta.dirname,'..'),out=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-cast-browser';await fs.mkdir(out,{recursive:true});
const shell='<!doctype html><html lang="ja"><meta charset="utf-8"><link rel="stylesheet" href="src/view/style.css"><link rel="stylesheet" href="src/view/scene-style.css"><div id="app" data-view="scene"></div></html>';
const types={'.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp'};
const server=http.createServer(async(req,res)=>{try{if(req.url==='/'){res.setHeader('content-type','text/html');res.end(shell);return;}const p=path.join(root,decodeURI(req.url.split('?')[0]));res.setHeader('content-type',types[path.extname(p)]??'text/plain');res.end(await fs.readFile(p));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[];
try{
 browser=await chromium.launch({headless:true,executablePath:process.env.ADV_BROWSER_EXECUTABLE,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:1100,height:800}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.evaluate(async()=>{
  const {loadContent}=await import('/src/core/loader.js'),{GameEngine}=await import('/src/core/engine.js'),{projectGame}=await import('/src/application/projection.js'),{replaceView}=await import('/src/view/view-layout.js'),{PresentationClock}=await import('/src/application/presentation-clock.js'),{applyTheme,THEME_DEFAULT}=await import('/src/view/theme.js');
  applyTheme(THEME_DEFAULT);const d=await loadContent();
  // Use real cast sprites; unrelated scenery/HUD assets are neutral in this focused harness.
  const neutral='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#233138"/></svg>');
  for(const key of Object.keys(d.assets.images))if(!['sprite_rookie','sprite_elder','sprite_rine'].includes(key))d.assets.images[key]=neutral;
  for(const id of ['rookie','elder','rine'])d.assets.images[d.characters[id].portrait]=d.assets.images[d.characters[id].sprite];
  await Promise.all(['rookie','elder','rine'].map(async id=>{const img=new Image();img.src=d.assets.images[d.characters[id].sprite];await img.decode();}));
  const c=(cast,transition)=>({op:'scene.cast',cast,transition}),r=(display={})=>({character:'rookie',display});
  d.scripts.cast_browser={commands:[c([r({x:25})],{enter:800,wait:true}),{op:'say',character:'rookie',text:'一つ目の台詞。'},
   {op:'say',character:'rookie',text:'二つ目の台詞。'},c([r({x:75,scale:1.1,angle:8,opacity:.7})],{move:800,easing:'linear',wait:true}),
   {op:'say',text:'移動が完了。'},c([r({x:75,asset:'sprite_rine'})],{change:800,move:800,wait:true}),{op:'say',text:'画像が切り替わった。'},
   c([],{exit:800,wait:true}),{op:'add',target:'vars.done',value:1},{op:'say',text:'退場が完了。'}]};
  const g=new GameEngine(d);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});
  let view;const root=document.querySelector('#app'),ui={status(){},menu(){},help(){},sound(){},soundEnabled:()=>false,effectsMode:()=> 'full'};
  const render=()=>view.render(projectGame(g)),dispatch=intent=>{const accepted=g.dispatch(intent);if(accepted)render();return accepted;};view=replaceView(null,'scene',root,dispatch,ui);
  const clock=new PresentationClock(intent=>{dispatch(intent);clock.sync(projectGame(g).presentationWait);});
  window.h={g,render,dispatch,clock,get view(){return view;},switch(layout){view=replaceView(view,layout,root,dispatch,ui);render();},finish(){return dispatch({type:'presentation.complete',id:g.state.waiting.id,session:g.feedback.session});},at(time){for(const a of view.castRenderer.animations){a.pause();a.currentTime=time;}},completeAnimations(){for(const a of view.castRenderer.animations)a.finish();}};
  g.run('cast_browser');render();
 });
 await page.evaluate(()=>h.at(200));await page.screenshot({path:path.join(out,'01-enter.png')});
 const opacity=await page.locator('[data-character="rookie"]').evaluate(e=>Number(getComputedStyle(e).opacity));assert.ok(opacity>.2&&opacity<.3,`quarter opacity ${opacity}`);
 await page.evaluate(()=>{window.kept=document.querySelector('[data-character="rookie"]');window.animation=[...h.view.castRenderer.animations][0];h.render();});
 assert.equal(await page.evaluate(()=>kept===document.querySelector('[data-character="rookie"]')&&animation.playState==='paused'),true);
 await page.evaluate(()=>{h.finish();h.dispatch({type:'advance'});});assert.equal(await page.evaluate(()=>kept===document.querySelector('[data-character="rookie"]')),true);
 await page.evaluate(()=>{h.completeAnimations();h.dispatch({type:'advance'});h.at(400);});
 const moving=await page.locator('[data-character="rookie"]').evaluate(e=>({left:parseFloat(getComputedStyle(e).left)/e.parentElement.clientWidth,opacity:Number(getComputedStyle(e).opacity)}));assert.ok(moving.left>.45&&moving.left<.55,JSON.stringify(moving));assert.ok(moving.opacity>.8&&moving.opacity<.9);
 await page.screenshot({path:path.join(out,'02-move.png')});
 await page.evaluate(()=>{h.completeAnimations();h.finish();h.dispatch({type:'advance'});h.at(400);});
 assert.equal(await page.locator('[data-character="rookie"] img').count(),2);await page.screenshot({path:path.join(out,'03-change.png')});
 await page.evaluate(()=>h.completeAnimations());await page.waitForFunction(()=>document.querySelectorAll('[data-character="rookie"] img').length===1);
 await page.evaluate(()=>{h.finish();h.dispatch({type:'advance'});h.at(400);});assert.equal(await page.locator('[data-character="rookie"]').count(),1);await page.screenshot({path:path.join(out,'04-exit.png')});
 await page.evaluate(()=>h.completeAnimations());await page.waitForFunction(()=>!document.querySelector('[data-character="rookie"]'));
 // Drive the actual application timer and verify that the VM advances automatically once.
 await page.evaluate(()=>{h.clock.sync({id:h.g.state.waiting.id,session:h.g.feedback.session,duration:40});});
 await page.waitForFunction(()=>h.g.state.vars.done===1);assert.equal(await page.evaluate(()=>h.g.state.waiting.text),'退場が完了。');
 // Save/load must settle to target state, cancel old animations, and reject stale completion.
 await page.evaluate(()=>{h.dispatch({type:'advance'});h.g.run('cast_browser');h.render();const w=h.g.state.waiting;window.stale={type:'presentation.complete',id:w.id,session:h.g.feedback.session};const save=h.g.save();h.g.load(save);h.render();});
 assert.equal(await page.evaluate(()=>h.g.dispatch(stale)),false);assert.equal(await page.evaluate(()=>h.view.castRenderer.animations.size),0);
 await page.evaluate(()=>h.switch('classic'));assert.equal(await page.locator('.story-cast').evaluate(e=>getComputedStyle(e).position),'static');assert.equal(await page.locator('.continue').count(),0);
 await page.setViewportSize({width:390,height:720});await page.evaluate(()=>h.switch('scene'));await page.screenshot({path:path.join(out,'05-mobile-restored.png')});assert.equal(await page.locator('[data-character="rookie"] img').evaluate(e=>e.complete&&e.naturalWidth>0),true);
 assert.deepEqual(errors,[]);console.log('CAST BROWSER VALID: fades, movement, crossfade, retained nodes, timer, restore, layouts and mobile');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
