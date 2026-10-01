// Inspect the actual renderer and local service controls in Chromium.
// Core traversal, unlocks and rewards are covered by kagaribi-expansion.test.mjs.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-kagaribi-browser';
await fs.mkdir(output,{recursive:true});
const shell='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="src/view/style.css"><link rel="stylesheet" href="src/view/scene-style.css"><div id="app" data-view="scene"></div></html>';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{const url=decodeURI(req.url.split('?')[0]);if(url==='/'){res.setHeader('Content-Type','text/html');res.end(shell);return;}const file=path.join(root,url);res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[],checks=[];
try{
 browser=await chromium.launch({executablePath:process.env.ADV_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-gpu']});
 for(const [width,height] of [[1280,856],[390,844]]){
  const page=await browser.newPage({viewport:{width,height}});page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async()=>{
   const {loadContent}=await import('./src/core/loader.js'),{GameEngine}=await import('./src/core/engine.js'),{projectGame}=await import('./src/application/projection.js'),{SceneView}=await import('./src/view/scene-view.js');
   const data=await loadContent();window.g=new GameEngine(data);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});g.random=()=>.999999;g.dispatch({type:'travel',dungeon:'kagaribi'});
   window.show=()=>view.render(projectGame(g));window.view=new SceneView(document.querySelector('#app'),intent=>{g.dispatch(intent);show();},{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});
   window.settle=()=>{while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});show();};
   window.arrange=(map,x,y,facing)=>{g.teleport(map,x,y,facing);g.setPortableFire({fuel:90,effect:'ward'});show();};
  });
  for(const [label,map,x,y,facing] of [['oilstore','kagaribi_oilstore',3,5,'east'],['relay','kagaribi_relay',7,5,'east'],['shaft','kagaribi_last_patrol',7,5,'east'],['ossuary','kagaribi_ossuary',11,5,'north']]){
   await page.evaluate(([map,x,y,facing])=>arrange(map,x,y,facing),[map,x,y,facing]);
   if(label==='relay')await page.evaluate(()=>{g.dispatch({type:'dungeon.action',system:'fires',action:'ignite',target:'relay_main'});settle();});
   await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
   await page.screenshot({path:path.join(output,`${label}-${width}.png`)});
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'horizontal overflow');
  }
  await page.evaluate(()=>{arrange('kagaribi_crossroads',8,1,'north');g.state.flags.kagaribi={cargoGate:true,postStaffed:true};g.dispatch({type:'location.enter',id:'kagaribi_post'});show();});
  await page.getByRole('button',{name:/燃料の補給窓口/}).click();await page.evaluate(()=>settle());
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  for(let n=0;!await page.evaluate(()=>view.canChoose());n++){
   assert.ok(n<20,'purchase text pagination must terminate');
   await page.getByRole('button',{name:/^次のページ/}).click();
  }
  const before=await page.evaluate(()=>({gold:g.state.gold,torch:g.state.inventory.torch,fuel:g.state.dungeons.active.systems.fires.portable.fuel,run:g.state.dungeons.active.run}));
  await page.screenshot({path:path.join(output,`post-choice-${width}.png`)});
  // The accessible name also includes the displayed purchase requirement.
  await page.getByRole('button',{name:/^松明を1本購入する（6G）/}).click();await page.evaluate(()=>settle());
  const after=await page.evaluate(()=>({gold:g.state.gold,torch:g.state.inventory.torch,fuel:g.state.dungeons.active.systems.fires.portable.fuel,run:g.state.dungeons.active.run}));
  assert.deepEqual(after,{...before,gold:before.gold-6,torch:before.torch+1});
  await page.screenshot({path:path.join(output,`post-${width}.png`)});
  await page.getByRole('button',{name:'詰所を出る',exact:true}).click();assert.equal(await page.evaluate(()=>g.state.location.map),'kagaribi_crossroads');
  checks.push({width,height,views:4,postPurchase:true,exit:true,horizontalOverflow:false});await page.close();
 }
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2)+'\n');console.log(JSON.stringify({checks,errors,output},null,2));
}finally{await browser?.close();await new Promise(r=>server.close(r));}
