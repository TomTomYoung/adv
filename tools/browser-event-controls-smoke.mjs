// Native coordinate regression: forward-clicks must never become event choices.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-event-controls-browser';
await fs.mkdir(output,{recursive:true});
const shell='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="src/view/style.css"><link rel="stylesheet" href="src/view/scene-style.css"><div id="app" data-view="scene"></div></html>';
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{
  const url=decodeURI(req.url.split('?')[0]);if(url==='/'){res.setHeader('Content-Type','text/html');res.end(shell);return;}
  const file=path.join(root,url);res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));
}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[],checks=[];
try{
  browser=await chromium.launch({executablePath:process.env.ADV_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-gpu']});
  for(const [width,height,coarse] of [[1280,856,false],[900,700,false],[390,844,true],[320,568,true],[844,390,true]]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:coarse,isMobile:coarse});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.evaluate(async()=>{
      const {loadContent}=await import('./src/core/loader.js'),{GameEngine}=await import('./src/core/engine.js'),{projectGame}=await import('./src/application/projection.js'),{SceneView}=await import('./src/view/scene-view.js'),{handleGameKey}=await import('./src/view/keyboard.js'),{applyTheme,THEME_DEFAULT}=await import('./src/view/theme.js');
      applyTheme({...THEME_DEFAULT,textSize:24});const data=await loadContent();
      const ui={status(){},soundEnabled:()=>false,effectsMode:()=> 'off',menu(){},help(){}};
      window.reset=()=>{
        window.view?.destroy();window.g=new GameEngine(data,42);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});
        window.dispatch=intent=>{const changed=g.dispatch(intent);if(changed)window.show();return changed;};
        window.view=new SceneView(document.querySelector('#app'),dispatch,ui);window.show=()=>view.render(projectGame(g));
      };
      document.addEventListener('keydown',e=>handleGameKey(e,{view:window.view,model:window.view.model,dispatch:window.dispatch}));
      reset();g.accept('q001');g.dispatch({type:'quest.travel',id:'q001'});g.teleport('kagaribi_f1',3,1,'west');show();
      data.scripts.browser_many_choices={commands:[{op:'say',text:'選択肢を確認する。'},{op:'choice',options:Array.from({length:18},(_,i)=>({id:`option_${i}`,text:`${i+1}：帰還の記録を確認する`,commands:[{op:'say',text:`選択 ${i+1}`}]}))}]};
    });
    const settle=()=>page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r))));});
    const pad=page.locator('.movement-pad'),forward=pad.locator('.forward');
    await settle();const before=await forward.boundingBox(),padBefore=await pad.boundingBox();
    assert.ok(before);const point={x:before.x+before.width/2,y:before.y+before.height/2};
    const samePad=async()=>{const after=await pad.boundingBox();for(const k of ['x','y','width','height'])assert.ok(Math.abs(after[k]-padBefore[k])<1,`${width}x${height}: pad ${k}: ${padBefore[k]} -> ${after[k]}`);};
    // Long exploration commands scroll underneath a stationary movement pad.
    await page.locator('.explore-actions').evaluate(e=>{e.scrollTop=e.scrollHeight;});await samePad();
    await page.mouse.click(point.x,point.y);await settle();
    assert.equal(await page.evaluate(()=>g.state.stories.q001.scene),'entry');
    assert.equal(await pad.locator('button:disabled').count(),4);await samePad();
    const saved=await page.evaluate(()=>g.save());
    for(let i=0;i<12;i++)await page.mouse.click(point.x,point.y);
    assert.equal(await page.evaluate(()=>g.save()),saved);
    for(let fuel=100;await page.evaluate(()=>g.state.waiting?.type==='text');fuel--){assert.ok(fuel>0);await page.keyboard.press('Enter');}
    await settle();assert.equal(await page.evaluate(()=>g.state.waiting.type),'choice');await samePad();
    const choiceSave=await page.evaluate(()=>g.save());for(let i=0;i<12;i++)await page.mouse.click(point.x,point.y);
    assert.equal(await page.evaluate(()=>g.save()),choiceSave);
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.locator(':focus').getAttribute('data-focus').then(k=>k.startsWith('choice:')));
    assert.equal(await page.evaluate(()=>g.save()),choiceSave);
    await page.screenshot({path:path.join(output,`q001-${width}x${height}.png`)});
    await page.locator('[data-focus="choice:talk"]').click();
    for(let fuel=100;await page.evaluate(()=>g.state.waiting?.type==='text');fuel--){assert.ok(fuel>0);await page.keyboard.press('Enter');}
    assert.equal(await pad.locator('button:enabled').count(),4);await samePad();
    await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>g.state.location.facing),'north');
    // A long event list must scroll without translating any movement hit area.
    await page.evaluate(()=>{reset();g.dispatch({type:'travel',dungeon:'kagaribi'});show();});await settle();
    const manyBefore=await pad.boundingBox();
    await page.evaluate(()=>{g.run('browser_many_choices');show();});await page.keyboard.press('Enter');await settle();
    assert.equal(await page.evaluate(()=>g.state.waiting.type),'choice');
    for(let i=0;i<17;i++)await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator(':focus').getAttribute('data-focus'),'choice:option_17');
    assert.ok(await page.locator('.scene-message-actions').evaluate(e=>e.scrollTop>0));
    const manyAfter=await pad.boundingBox();for(const k of ['x','y','width','height'])assert.ok(Math.abs(manyBefore[k]-manyAfter[k])<1,`${width}: list changed pad ${k}`);
    assert.ok(await page.locator(':focus').evaluate(e=>{const b=e.getBoundingClientRect(),r=e.closest('.scene-message-actions').getBoundingClientRect();return b.bottom>r.top&&b.top<r.bottom;}));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(output,`choices-${width}x${height}.png`)});
    await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>g.state.waiting.text),'選択 18');
    checks.push(`${width}x${height}${coarse?' touch':''}: q001 forward coordinate spam inert, pad fixed, all 18 choices reachable, keyboard movement restored`);
    await context.close();
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2)+'\n');console.log(JSON.stringify({passed:true,checks,errors},null,2));
}finally{await browser?.close();server.close();}
