// Visual fixtures for every outdoor map. Regional smoke tests cover real route traversal.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {OUTDOOR_THEMES} from '../src/core/outdoor-appearance.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-outdoor-browser';
await fs.mkdir(output,{recursive:true});
const types={'.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{
  const url=decodeURI(req.url.split('?')[0]);
  if(url==='/'){res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="src/view/style.css"><link rel="stylesheet" href="src/view/scene-style.css"><div id="app"></div></html>');return;}
  const file=path.join(root,url);res.setHeader('content-type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));
}catch{res.statusCode=404;res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;const errors=[],checks=[];
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.ADV_BROWSER_EXECUTABLE,args:['--no-sandbox']});
  const page=await browser.newPage();page.setDefaultTimeout(10000);
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async()=>{
    const {loadContent}=await import('/src/core/loader.js'),{GameEngine}=await import('/src/core/engine.js'),{projectGame}=await import('/src/application/projection.js'),{replaceView}=await import('/src/view/view-layout.js'),{applyTheme,THEME_DEFAULT}=await import('/src/view/theme.js');
    applyTheme(THEME_DEFAULT);const data=await loadContent(undefined,{edition:'e2'});let g,view;
    const render=()=>view.render(projectGame(g)),dispatch=intent=>{const ok=g.dispatch(intent);render();return ok;};
    window.h={get g(){return g;},get view(){return view;},render,
      start(layout,theme){
        view?.destroy();g=new GameEngine(data,1907);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});
        g.state.worldTravel.registrations.oddland_entry=true;
        g.teleport('e2_'+theme,1,1,'east');g.random=()=>.999999;
        view=replaceView(null,layout,document.querySelector('#app'),dispatch,{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();
      },
      resume(){g.load(g.save());render();},
      turn(){g.dispatch({type:'move',direction:'right'});render();}
    };
  });
  for(const layout of ['scene','classic'])for(const width of [1440,390]){
    await page.setViewportSize({width,height:width===390?844:1000});const frames=new Set();
    for(const theme of OUTDOOR_THEMES){
      await page.evaluate(({layout,theme})=>h.start(layout,theme),{layout,theme});
      const canvas=page.locator('canvas.dungeon-canvas');await canvas.waitFor({state:'visible'});
      const before=await page.evaluate(()=>JSON.parse(h.g.save()));await page.evaluate(()=>h.resume());
      assert.deepEqual(await page.evaluate(()=>JSON.parse(h.g.save())),before);
      await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
      const sample=await canvas.evaluate(c=>{
        const ctx=c.getContext('2d'),sky=[...ctx.getImageData(400,30,1,1).data],r=c.getBoundingClientRect();
        return {sky,canvasWidth:c.width,canvasHeight:c.height,shownWidth:r.width,shownHeight:r.height,frame:c.toDataURL(),viewport:innerWidth,document:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,viewportHeight:innerHeight};
      });
      assert.equal(await page.evaluate(()=>h.view.model.dungeon.outdoor),theme);
      assert.deepEqual([sample.canvasWidth,sample.canvasHeight],[800,400]);assert.ok(sample.shownWidth>0&&sample.shownHeight>0);
      const label=page.locator(layout==='scene'?'.scene-place .eyebrow':'.scene-location .eyebrow');assert.match(await label.innerText(),/屋外/);
      if(layout==='classic')assert.equal(await page.locator('.scene-location').evaluate(el=>getComputedStyle(el).backgroundColor),'rgba(8, 20, 23, 0.88)');
      assert.ok(sample.sky.slice(0,3).every(v=>v>65),'outdoor sky is visible');
      assert.ok(sample.document<=sample.viewport+1,'horizontal overflow');
      if(layout==='scene')assert.ok(sample.pageHeight<=sample.viewportHeight+1,'Scene stays within one screen');
      assert.ok(!frames.has(sample.frame),'each map has a distinct appearance');frames.add(sample.frame);
      await page.screenshot({path:path.join(output,`${layout}-${width}-${theme}.png`),fullPage:true});
      await page.evaluate(async()=>{h.turn();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});assert.notEqual(await canvas.evaluate(c=>c.toDataURL()),sample.frame,'turning changes the visible direction');
      const {frame,...measure}=sample;checks.push({layout,width,theme,...measure});
    }
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:checks.length,errors,output}));
}finally{
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify({checks,errors},null,2));
  await browser?.close();await new Promise(resolve=>server.close(resolve));
}
