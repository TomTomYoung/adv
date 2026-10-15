import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-frontline-lifecycle-browser';await fs.mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const url=decodeURI(req.url.split('?')[0]);if(url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="src/view/style.css"><link rel="stylesheet" href="src/view/scene-style.css"><div id="app"></div></html>');return;}const file=path.resolve(root,'.'+url);if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[];
try{
 browser=await chromium.launch({executablePath:process.env.ADV_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox']});const base=`http://127.0.0.1:${server.address().port}`;

 for(const width of [1280,390,320]){
  const page=await browser.newPage({viewport:{width,height:950}});page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'/battle-tester.html');
  const synced=()=>page.waitForFunction(()=>{const s=window.battleTester?.engineSync;return s?.ready&&s.loaded===s.request&&s.loaded>0;});await synced();
  const frame=page.frames().find(f=>f.url().includes('battle-engine-playtest.html'));
  const preset=async name=>{await page.selectOption('#preset',name);await page.click('#apply-preset');await page.click('#start');await synced();};
  const skill=async(id,target)=>{if(!await frame.locator(`[data-focus="skill:${id}"]`).count())await frame.locator('[data-focus="battle-menu:skills"]').click();await frame.locator(`[data-focus="skill:${id}"]`).click();await frame.locator(`[data-focus="front:choice:${target}"]`).click();await frame.locator('[data-focus="front:confirm"]').click();};
  await preset('body_retreat');assert.equal(await page.evaluate(()=>battleTester.engine.state.battle.frontline.rows),1);assert.equal(await frame.evaluate(()=>battlePlaytest.model.battle.frontline.units.filter(u=>u.state==='removed').length),1);assert.match(await page.locator('#event-log').innerText(),/退避/);assert.match(await page.locator('#event-log').innerText(),/3行→1行/);
  await page.check('#diagnostics');assert.equal(await page.locator('.lab-diagnostics span').count(),20);await page.uncheck('#diagnostics');
  for(const layout of ['normal','scene']){
   await page.selectOption('#engine-layout',layout);await preset('revive_expand');await frame.waitForFunction(l=>battlePlaytest.layout===l,layout);
   const ids=await frame.evaluate(()=>battlePlaytest.engine.state.members),down='actor:'+ids[1],removed='actor:'+ids[5];
   await frame.locator('[data-focus="battle-menu:skills"]').click();await frame.locator('[data-focus="skill:lab_revive"]').click();
   assert.equal(await frame.locator(`[data-focus="front:choice:${removed}"]`).count(),0);assert.equal(await frame.locator(`[data-focus="front:choice:${down}"]`).count(),1);
   const before=await frame.evaluate(()=>battlePlaytest.engine.save());await frame.locator(`[data-focus="front:choice:${down}"]`).click();assert.equal(await frame.evaluate(()=>battlePlaytest.engine.save()),before);await frame.locator('[data-focus="front:confirm"]').click();
   assert.equal(await frame.evaluate(()=>battlePlaytest.model.battle.frontline.rows),1);
   // Original survivor moves back; the revived front keeps the new rows at next round start.
   await frame.locator('[data-focus="battle:move"]').click();await frame.locator('[data-focus="front:choice:depth:2"]').click();await frame.locator('[data-focus="front:confirm"]').click();
   assert.equal(await frame.evaluate(()=>battlePlaytest.model.battle.frontline.rows),3);assert.equal(await frame.evaluate(id=>battlePlaytest.model.battle.frontline.units.find(u=>u.id===id).state,removed),'removed');
   assert.match(await frame.locator('.frontline-party').innerText(),/戦闘離脱/);assert.equal(await frame.evaluate(()=>{const s=battlePlaytest.engine.save();battlePlaytest.engine.load(s);return battlePlaytest.engine.save()===s;}),true);
   await frame.waitForFunction(()=>document.querySelector('.frontline-stage')?.dataset.ready==='true');assert.equal(await frame.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   await page.locator('#engine-frame').screenshot({path:path.join(output,`lifecycle-${layout}-${width}.png`)});
  }
  await preset('two_rows');const beforeHp=await frame.evaluate(()=>battlePlaytest.engine.state.actors.nio.hp);await skill('lab_push_ally','actor:nio');assert.equal(await frame.evaluate(()=>battlePlaytest.engine.state.actors.nio.hp),beforeHp-25);assert.equal(await frame.evaluate(()=>battlePlaytest.model.battle.frontline.rows),2);
  assert.equal(await frame.evaluate(()=>battlePlaytest.engine.state.battle.frontline.events.find(e=>e.type==='knockback').collision.kind),'edge');
  await preset('zombies');await frame.waitForFunction(()=>document.querySelector('.frontline-stage')?.dataset.ready==='true');assert.equal(await frame.locator('.frontline-down').count(),1);await skill('lab_remove','enemy:enemy_0');assert.equal(await frame.locator('.frontline-down').count(),0);
  // Diagnostic skills use the same planner and show the down-state target explicitly.
  await preset('revive_expand');await page.selectOption('#skill','lab_revive');const id=await page.evaluate(()=>battleTester.engine.state.members[1]);await page.selectOption('#target','actor:'+id);assert.equal(await page.locator('#execute').isDisabled(),false);await page.click('#execute');assert.equal(await page.evaluate(()=>battleTester.engine.state.battle.frontline.rows),1);await page.click('#save');const saved=await page.evaluate(()=>battleTester.engine.save());await page.click('#step');await page.click('#load');assert.equal(await page.evaluate(()=>battleTester.engine.save()),saved);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);await page.close();
 }
 assert.deepEqual(errors,[]);console.log('FRONTLINE LIFECYCLE BROWSER VALID: both testers, both views, retreat/shrink, revival/expansion, collision, retained enemies/removal, save and desktop/mobile');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
