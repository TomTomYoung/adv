// Real browser checks for both layouts. No player storage is read or written.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-grid-browser';await fs.mkdir(output,{recursive:true});
const types={'.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{
 const url=decodeURI(req.url.split('?')[0]);if(url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="src/view/style.css"><link rel="stylesheet" href="src/view/scene-style.css"><div id="app"></div></html>');return;}
 const file=path.resolve(root,'.'+url);if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));
}catch{res.statusCode=404;res.end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[];
try{
 browser=await chromium.launch({executablePath:process.env.ADV_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox']});
 for(const layout of ['normal','scene'])for(const width of [1280,390,320]){
  const page=await browser.newPage({viewport:{width,height:856}});page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async layout=>{
   const {loadContent}=await import('./src/core/loader.js'),{GameEngine}=await import('./src/core/engine.js'),{projectGame}=await import('./src/application/projection.js'),{GameView}=await import('./src/view/view.js'),{SceneView}=await import('./src/view/scene-view.js'),{handleGameKey}=await import('./src/view/keyboard.js'),{applyTheme,THEME_DEFAULT}=await import('./src/view/theme.js');
   applyTheme(THEME_DEFAULT);const data=await loadContent(),g=new GameEngine(data);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});
   const root=document.querySelector('#app');root.dataset.view=layout;let view;const dispatch=intent=>{const ok=g.dispatch(intent);view.render(projectGame(g));return ok;};
   view=new (layout==='scene'?SceneView:GameView)(root,dispatch,{status(){},soundEnabled:()=>false,effectsMode:()=> 'off',menu(){},help(){}});Object.assign(window,{g,view,projectGame});view.tab='party';view.render(projectGame(g));document.addEventListener('keydown',e=>handleGameKey(e,{view,model:view.model,dispatch}));
  },layout);
  const button=key=>page.locator(`[data-focus="${key}"]`),settle=()=>page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  await button('formation:open').click();const before=await page.evaluate(()=>g.save());await button('formation:actor:ada').click();assert.equal(await page.evaluate(()=>g.save()),before);await button('formation:cell:0,1').click();assert.deepEqual(await page.evaluate(()=>g.state.partyFormation.ada),{x:0,y:1});assert.equal(await page.locator(':focus').getAttribute('data-focus'),'formation:cell:0,1');await settle();await page.screenshot({path:path.join(output,`${layout}-${width}-formation.png`)});
  await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>view.formationActor),null);await page.keyboard.press('Escape');assert.equal(await page.locator('.formation-editor').count(),0);
  await page.evaluate(()=>{
   g.data.encounters.wild_pair_1.enemies=Array(8).fill('slime_1');const id=Object.keys(g.data.enemies)[0];g.data.encounters.wild_pair_1.enemies=Array(8).fill(id);g.data.enemies[id].stats.agi=0;g.data.enemies[id].ai=[{priority:1,skill:'guard',target:'self'}];g.data.encounters.wild_pair_1.enemyPositions=[{x:0,y:2},{x:1,y:2},{x:2,y:2},{x:3,y:2},{x:4,y:2},{x:1,y:1},{x:2,y:1},{x:2,y:0}];
   g.startBattle('wild_pair_1',{win:[],escape:[],lose:[]},{battleMode:'grid'});view.tab='location';view.render(projectGame(g));
  });
  await settle();assert.equal(await page.locator('.battle-grid-cell').count(),30);assert.equal(await page.locator('.grid-enemy-sprite').count(),8);
  const saved=await page.evaluate(()=>g.save());await button('skill:guard').click();const target=await page.evaluate(()=>projectGame(g).battle.skills.find(s=>s.id==='guard').choices.find(c=>c.enabled).id);await button('grid:choice:'+target).click();assert.equal(await page.evaluate(()=>g.save()),saved);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>g.save()),saved);assert.equal(await page.locator(':focus').getAttribute('data-focus'),'skill:guard');
  await button('battle:move').click();const dest=await page.evaluate(()=>projectGame(g).battle.grid.cells.find(c=>c.move.enabled).id);await button('grid:choice:'+dest).click();assert.equal(await page.evaluate(()=>g.save()),saved);await button('grid:confirm').click();assert.notEqual(await page.evaluate(()=>g.save()),saved);
  await settle();await page.screenshot({path:path.join(output,`${layout}-${width}-grid.png`)});
  if(layout==='scene'){const bounds=await page.evaluate(()=>{const r=e=>{const b=document.querySelector(e).getBoundingClientRect();return {top:b.top,bottom:b.bottom};};return {board:r('.battle-grid-board'),hud:r('.scene-hud'),dock:r('.scene-dock')};});assert.ok(bounds.board.top>=bounds.hud.bottom&&bounds.board.bottom<=bounds.dock.top,JSON.stringify(bounds));}
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${layout} ${width} overflow`);
  const scales=await page.locator('.grid-enemy-sprite').evaluateAll(images=>images.map(i=>{const r=i.getBoundingClientRect();return {width:r.width,height:r.height,nw:i.naturalWidth,nh:i.naturalHeight,left:r.left,right:r.right};}));assert.ok(scales.every(s=>s.nw>0&&s.width>0&&s.left>=-1&&s.right<=width+1));
  await page.evaluate(()=>{const s=g.save();g.load(s);if(g.save()!==s)throw Error('Grid load changed state');});await page.close();
 }
 assert.deepEqual(errors,[]);console.log('BROWSER GRID VALID: both layouts × 3 widths, formation, keyboard cancellation, previews, movement, sprites and save/load');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
