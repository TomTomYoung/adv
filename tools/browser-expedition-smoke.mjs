// Exercise the shared camp/shop/checkpoint controls in both real renderers.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-expedition-browser';
await fs.mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const shell='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="src/view/style.css"><link rel="stylesheet" href="src/view/scene-style.css"><div id="app"></div></html>';
const server=http.createServer(async(req,res)=>{try{const url=decodeURI(req.url.split('?')[0]);if(url==='/'){res.setHeader('Content-Type','text/html');res.end(shell);return;}const file=path.join(root,url);res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[];
try{
 browser=await chromium.launch({executablePath:process.env.ADV_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-gpu']});
 for(const layout of ['scene','classic'])for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:844}});page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async layout=>{
   const {loadContent}=await import('./src/core/loader.js'),{GameEngine}=await import('./src/core/engine.js'),{projectGame}=await import('./src/application/projection.js'),{replaceView}=await import('./src/view/view-layout.js');
   const data=await loadContent();delete data.quests.q001.story;window.g=new GameEngine(data);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});g.accept('q001');g.complete('q001','informed');g.teleport('kagaribi_f1',1,1,'east');
   g.dispatch({type:'expedition.action',camp:'kagaribi_gate',action:'repair'});g.dispatch({type:'expedition.action',camp:'kagaribi_gate',action:'relay'});g.returnTown();g.dispatch({type:'location.move',id:'hikarigaeri_shop'});g.give('iron_sword',1);g.dispatch({type:'equip',actor:'ada',item:'iron_sword'});
   window.show=()=>view.render(projectGame(g));window.view=replaceView(null,layout,document.querySelector('#app'),intent=>{const ok=g.dispatch(intent);show();return ok;},{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.tab='shop';show();
  },layout);
  const card=page.locator('.skill-shop-card').filter({has:page.getByRole('heading',{name:'横列払い',exact:true})});await card.getByRole('button',{name:/Lv1を習得/}).click();
  assert.equal(await page.evaluate(()=>g.state.expedition.learned.ada.exp_row_sweep),1);
  await page.screenshot({path:path.join(output,`shop-${layout}-${width}.png`)});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'shop horizontal overflow');
  await page.evaluate(()=>{g.dispatch({type:'location.move',id:g.data.game.world.townRoot});show();view.tab='regions';show();});
  await page.getByRole('button',{name:'巡回路の給油所から再開',exact:true}).click();assert.equal(await page.evaluate(()=>g.state.location.map),'kagaribi_f1');
  await page.getByRole('button',{name:'任意調べる',exact:true}).click();await page.getByRole('button',{name:'巡回路の給油所',exact:true}).click();
  await page.getByRole('button',{name:/^油を容量いっぱい汲む/}).waitFor();
  await page.screenshot({path:path.join(output,`camp-${layout}-${width}.png`)});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'camp horizontal overflow');
  await page.close();console.log(`EXPEDITION BROWSER OK: ${layout} ${width}`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
