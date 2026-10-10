// Check the actual views and movement controls at both new rescue entry paths.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {prepareQuest,finishJourney} from '../tests/structure-routes.mjs';
import {drain} from '../tests/helpers.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-q001-return-browser';
await fs.mkdir(output,{recursive:true});
const prepared=prepareQuest('q001');prepared.random=()=>.999999;
for(const id of ['talk','inspect','follow']){assert.ok(prepared.dispatch({type:'choose',id}));drain(prepared);finishJourney(prepared);}
assert.ok(prepared.dispatch({type:'choose',id:'support'}));
const departure=prepared.save();
const shell='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="src/view/style.css"><link rel="stylesheet" href="src/view/scene-style.css"><div id="app"></div></html>';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{
 const url=decodeURI(req.url.split('?')[0]);if(url==='/'){res.setHeader('Content-Type','text/html');res.end(shell);return;}
 const file=path.join(root,url);res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));
}catch{res.statusCode=404;res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;const errors=[],checks=[];
try{
 browser=await chromium.launch({executablePath:process.env.ADV_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-gpu']});
 for(const [width,height] of [[1280,856],[390,844]])for(const layout of ['classic','scene']){
  const page=await browser.newPage({viewport:{width,height},hasTouch:width===390,isMobile:width===390});page.setDefaultTimeout(15000);
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  // Allow local screenshot QA to supply CJK fonts without changing app assets.
  if(process.env.ADV_BROWSER_FONT_CSS)await page.addStyleTag({path:process.env.ADV_BROWSER_FONT_CSS});
  await page.evaluate(async({layout,departure})=>{
   const {loadContent}=await import('./src/core/loader.js'),{GameEngine}=await import('./src/core/engine.js'),{projectGame}=await import('./src/application/projection.js'),{GameView}=await import('./src/view/view.js'),{SceneView}=await import('./src/view/scene-view.js'),{handleGameKey}=await import('./src/view/keyboard.js');
   const data=await loadContent(),ui={status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'};
   window.g=new GameEngine(data);window.show=()=>view.render(projectGame(g));
   window.dispatch=intent=>{const changed=g.dispatch(intent);if(changed)show();return changed;};
   const app=document.querySelector('#app');app.dataset.view=layout;
   window.view=new (layout==='classic'?GameView:SceneView)(app,dispatch,ui);
   document.addEventListener('keydown',e=>handleGameKey(e,{view,model:view.model,dispatch}));
   window.reset=path=>{
    g.load(departure);g.random=()=>.999999;
    const facing=path==='south'?'south':'north';
    while(g.state.location.facing!==facing)g.dispatch({type:'move',direction:'right'});
    show();
   };
  },{layout,departure});
  const settle=()=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  for(const trigger of ['south','encounter']){
   const tag=`${layout}-${width}-${trigger}`;console.log(tag);
   await page.evaluate(trigger=>reset(trigger),trigger);await settle();
   assert.deepEqual(await page.evaluate(()=>view.model.dungeon.objects.filter(o=>o.kind==='decision').map(o=>[o.x,o.y])),[[9,1],[13,5]]);
   await page.locator('.movement-pad .forward').click();await settle();
   assert.equal(await page.evaluate(()=>g.state.waiting),null,'one cell before the trigger is still exploration');
   if(trigger==='encounter')await page.evaluate(()=>{g.setPortableFire({fuel:1,effect:'ward'});g.state.steps=g.data.system.encounterCheckSteps-1;g.random=()=>0;show();});
   await page.locator('.movement-pad .forward').click();await settle();
   const destination=trigger==='south'?[13,5]:[13,1];
   assert.deepEqual(await page.evaluate(()=>[g.state.location.x,g.state.location.y]),destination);
   assert.equal(await page.evaluate(()=>g.state.stories.q001.scene),'outage');
   assert.equal(await page.evaluate(()=>g.state.waiting.type),'text');
   for(let budget=100;await page.evaluate(()=>g.state.waiting?.type==='text');budget--){assert.ok(budget>0,'outage text terminates');await page.keyboard.press('Enter');await settle();}
   assert.equal(await page.evaluate(()=>g.state.battle?.encounter),'kuragari_hunt');
   assert.equal(await page.evaluate(()=>g.state.battle.continuations.frame.script),'q001.v11.outage');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:path.join(output,`${tag}-battle.png`)});
   // The existing before-end hook must still present the same rookie rescue.
   await page.evaluate(()=>{g.finishBattle('win');show();});await settle();
   assert.equal(await page.evaluate(()=>g.state.waiting.speaker),'新人灯番');
   const save=await page.evaluate(()=>g.save());await page.evaluate(save=>{g.load(save);show();},save);await settle();
   assert.equal(await page.evaluate(()=>g.save()),save);
   await page.screenshot({path:path.join(output,`${tag}-rookie.png`)});
   for(let budget=100;await page.evaluate(()=>g.state.waiting?.type==='text');budget--){assert.ok(budget>0,'rescue text terminates');await page.keyboard.press('Enter');await settle();}
   assert.deepEqual(await page.evaluate(()=>({scene:g.state.stories.q001.scene,point:[g.state.location.x,g.state.location.y],oil:g.state.stories.q001.values.oilUsed,seals:g.state.dungeonRestrictions.length,battle:g.state.battle})),{scene:'rescue',point:destination,oil:2,seals:0,battle:null});
   for(let budget=100;!await page.evaluate(()=>view.canChoose?.()??true);budget--){assert.ok(budget>0);await page.keyboard.press('Enter');await settle();}
   await page.locator('[data-focus="choice:home"]').focus();await page.keyboard.press('Enter');await settle();
   assert.equal(await page.evaluate(()=>g.state.journey.action),'rescue_home');
   assert.deepEqual(await page.evaluate(()=>[g.state.location.x,g.state.location.y]),destination);
   assert.equal(await page.locator('.movement-pad button:enabled').count(),4);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   checks.push({layout,width,height,trigger,destination,savedRookieSpeech:true,returnUnsealed:true,walkingResumed:true});
  }
  await page.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2)+'\n');console.log(JSON.stringify({checks,errors,output},null,2));
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
