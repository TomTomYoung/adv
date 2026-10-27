// Enclosed-site visual fixtures; regional smoke tests cover actual route traversal.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {INDOOR_THEMES} from '../src/core/indoor-appearance.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-indoor-browser';
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
      start(layout,theme,phase){
        view?.destroy();g=new GameEngine(data,1907);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});
        g.state.worldTravel.registrations.oddland_entry=true;
        g.teleport('e2_'+theme,1,1,'east');g.random=()=>.999999;if(phase==='water')g.dispatch({type:'move',direction:'forward'});
        view=replaceView(null,layout,document.querySelector('#app'),dispatch,{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();
      },
      resume(){g.load(g.save());render();},
      turn(){g.dispatch({type:'move',direction:'right'});render();},
      step(direction){const ok=g.dispatch({type:'move',direction});render();return ok;}
    };
  });
  for(const layout of ['scene','classic'])for(const width of [1440,390]){
    await page.setViewportSize({width,height:width===390?844:1000});const frames=new Set();
    for(const theme of INDOOR_THEMES)for(const phase of ['entry',...(['sunken_inn','observatory_rescue'].includes(theme)?['water']:[])]){
      await page.evaluate(({layout,theme,phase})=>h.start(layout,theme,phase),{layout,theme,phase});
      const canvas=page.locator('canvas.dungeon-canvas');await canvas.waitFor({state:'visible'});
      const before=await page.evaluate(()=>JSON.parse(h.g.save()));await page.evaluate(()=>h.resume());
      assert.deepEqual(await page.evaluate(()=>JSON.parse(h.g.save())),before);
      await page.evaluate(async()=>{await document.fonts.ready;await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
      const sample=await canvas.evaluate(c=>{
        const ctx=c.getContext('2d'),ceiling=[...ctx.getImageData(400,30,1,1).data],r=c.getBoundingClientRect();
        return {ceiling,canvasWidth:c.width,canvasHeight:c.height,shownWidth:r.width,shownHeight:r.height,frame:c.toDataURL(),viewport:innerWidth,document:document.documentElement.scrollWidth,pageHeight:document.documentElement.scrollHeight,viewportHeight:innerHeight};
      });
      assert.equal(await page.evaluate(()=>h.view.model.dungeon.indoor),theme);
      assert.deepEqual([sample.canvasWidth,sample.canvasHeight],[800,400]);assert.ok(sample.shownWidth>0&&sample.shownHeight>0);
      const depth=await page.evaluate(()=>{const d=h.view.model.dungeon;return d.cells[d.location.y][d.location.x].waterDepth;});
      assert.equal(depth,phase==='water'?3:0);
      assert.ok(sample.ceiling.slice(0,3).some(v=>v>10),'enclosed ceiling is rendered');
      if(phase==='water'){
        assert.equal(await page.evaluate(()=>h.g.state.dungeons.active.systems.air.air),63);
        assert.ok(await page.evaluate(()=>h.step('back')));
        assert.equal(await page.evaluate(()=>h.g.state.dungeons.active.systems.air.air),64);
        assert.equal(await page.evaluate(()=>{const d=h.view.model.dungeon;return d.cells[d.location.y][d.location.x].waterDepth;}),0);
        assert.ok(await page.evaluate(()=>h.step('forward')));
        assert.equal(await page.evaluate(()=>h.g.state.dungeons.active.systems.air.air),63);
        await page.evaluate(async()=>{await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
      }
      assert.ok(sample.document<=sample.viewport+1,'horizontal overflow');
      if(layout==='scene')assert.ok(sample.pageHeight<=sample.viewportHeight+1,'Scene stays within one screen');
      assert.ok(!frames.has(sample.frame),'each map has a distinct appearance');frames.add(sample.frame);
      await page.screenshot({path:path.join(output,`${layout}-${width}-${theme}-${phase}.png`),fullPage:true});
      await page.evaluate(async()=>{h.turn();await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});assert.notEqual(await canvas.evaluate(c=>c.toDataURL()),sample.frame,'turning changes the visible direction');
      const {frame,...measure}=sample;checks.push({layout,width,theme,phase,depth,...measure});
    }
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:checks.length,errors,output}));
}finally{
  await fs.writeFile(path.join(output,'result.json'),JSON.stringify({checks,errors},null,2));
  await browser?.close();await new Promise(resolve=>server.close(resolve));
}
