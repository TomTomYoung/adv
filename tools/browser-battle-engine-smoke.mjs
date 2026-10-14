import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-battle-engine-browser';await fs.mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const url=decodeURI(req.url.split('?')[0]);if(url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="src/view/style.css"><link rel="stylesheet" href="src/view/scene-style.css"><div id="app"></div></html>');return;}const file=path.resolve(root,'.'+url);if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[];
try{
 browser=await chromium.launch({executablePath:process.env.ADV_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox']});const base=`http://127.0.0.1:${server.address().port}`;
 for(const width of [1280,390,320]){
  const page=await browser.newPage({viewport:{width,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/battle-tester.html');
  const synced=()=>page.waitForFunction(()=>{const s=window.battleTester?.engineSync;return s?.ready&&s.loaded===s.request&&s.loaded>0;});await synced();
  const frame=page.frames().find(f=>f.url().includes('battle-engine-playtest.html'));
  await frame.waitForFunction(()=>window.battlePlaytest?.engine.state.battle);
  assert.equal(await frame.evaluate(()=>battlePlaytest.engine.state.battle.manualTurns),undefined);
  assert.equal(await page.evaluate(()=>battleTester.engine.state.battle.manualTurns),true);
  const initial=await frame.evaluate(()=>battlePlaytest.engine.save()),diagnostic=await page.evaluate(()=>battleTester.engine.save());
  for(const mode of ['detail','play','both']){
   await page.click(`button[data-lab-mode="${mode}"]`);
   assert.equal(await page.locator('#engine-panel').isVisible(),mode!=='detail');
   assert.equal(await page.locator('#battle-display').isVisible(),mode!=='play');
   assert.equal(await frame.evaluate(()=>battlePlaytest.engine.save()),initial);
  }
  for(const layout of ['normal','scene']){
   await page.selectOption('#engine-layout',layout);await frame.waitForFunction(l=>battlePlaytest.layout===l,layout);
   assert.equal(await frame.evaluate(()=>battlePlaytest.engine.save()),initial);
   await frame.locator('[data-focus="battle-menu:skills"]').click();await frame.locator('[data-focus="skill:lab_strike"]').click();
   await frame.locator('[data-focus="front:choice:enemy:enemy_0"]').click();assert.equal(await frame.evaluate(()=>battlePlaytest.engine.save()),initial);
   await page.keyboard.press('Escape');assert.equal(await frame.evaluate(()=>battlePlaytest.engine.save()),initial);
   assert.equal(await frame.locator(':focus').getAttribute('data-focus'),'skill:lab_strike');
   await frame.waitForFunction(()=>document.querySelector('.frontline-stage')?.dataset.ready==='true');
   assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await page.locator('#engine-frame').screenshot({path:path.join(output,`${layout}-${width}.png`)});
  }
  // Two player commands then the production queue automatically executes enemies.
  for(let i=0;i<2;i++){
   if(!await frame.locator('[data-focus="skill:lab_strike"]').count())await frame.locator('[data-focus="battle-menu:skills"]').click();
   await frame.locator('[data-focus="skill:lab_strike"]').click();await frame.locator('[data-focus="front:choice:enemy:enemy_0"]').click();await frame.locator('[data-focus="front:confirm"]').click();
  }
  assert.equal(await frame.evaluate(()=>battlePlaytest.engine.state.battle.round),2);
  assert.equal(await page.evaluate(()=>battleTester.engine.save()),diagnostic);
  assert.equal(await frame.evaluate(()=>battlePlaytest.engine.state.battle.frontline.events.some(e=>e.type==='hit'&&e.target.startsWith('actor:'))),true);
  await page.click('#engine-load');await synced();assert.equal(await frame.evaluate(()=>battlePlaytest.engine.save()),initial);
  // Load the latest form, without requiring the diagnostic Start button.
  await page.selectOption('#preset','cross');await page.click('#apply-preset');await page.fill('#seed','5678');await page.selectOption('#preemptive','enemies');await page.click('#engine-load');await synced();
  assert.equal(await frame.evaluate(()=>battlePlaytest.config.seed),5678);assert.equal(await frame.evaluate(()=>battlePlaytest.config.profile.area.shape),'cross4');
  assert.equal(await frame.evaluate(()=>battlePlaytest.engine.state.battle.enemies.length),6);assert.equal(await frame.evaluate(()=>battlePlaytest.engine.state.battle.preemptive),undefined);
  assert.equal(await page.evaluate(()=>battleTester.engine.save()),diagnostic);
  // Invalid input must preserve the running trial; messages from other sources are ignored.
  const running=await frame.evaluate(()=>battlePlaytest.engine.save());await page.fill('#seed','1.5');await page.click('#engine-load');
  assert.ok((await page.locator('#engine-status').innerText()).includes('不正'));assert.equal(await frame.evaluate(()=>battlePlaytest.engine.save()),running);
  await frame.evaluate(()=>window.postMessage({type:'adv:battle-tester:load',config:{}},location.origin));
  await page.fill('#seed','5678');await page.selectOption('#preemptive','');
  for(const mode of ['classic','grid']){await page.selectOption('#mode',mode);await page.click('#engine-load');await synced();assert.equal(await frame.evaluate(()=>battlePlaytest.engine.state.battle.mode),mode);}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  // Reloading the iframe repeats the ready handshake and restores the last loaded case.
  await frame.goto(frame.url());await frame.waitForFunction(()=>window.battlePlaytest?.config.mode==='grid');
  assert.equal(await frame.evaluate(()=>battlePlaytest.config.seed),5678);
  await page.close();
 }
 const page=await browser.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/battle-engine-playtest.html');await page.waitForFunction(()=>window.battlePlaytest?.engine.state.battle);
 assert.equal(await page.locator('#restart').isVisible(),true);const initial=await page.evaluate(()=>battlePlaytest.engine.save());await page.click('#restart');assert.equal(await page.evaluate(()=>battlePlaytest.engine.save()),initial);
 await page.close();assert.deepEqual(errors,[]);
 console.log('BATTLE ENGINE BROWSER VALID: real embedded/standalone views, handshake, latest config, auto turns, preemption, cancel, reset, state isolation and PC/mobile widths');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
