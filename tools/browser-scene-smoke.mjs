// Optional CSS, native keyboard and canvas smoke test. Requires Playwright + Chromium.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-scene-browser';
const fontRoot=process.env.ADV_BROWSER_FONTS; // Optional @fontsource/noto-serif-jp package for headless hosts.
await fs.mkdir(output,{recursive:true});
const shell=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="src/view/style.css"><link rel="stylesheet" href="src/view/scene-style.css">${fontRoot?'<link rel="stylesheet" href="__fonts/400.css"><style>body{font-family:"Noto Serif JP",serif!important}html{--story-font:"Noto Serif JP",serif!important}</style>':''}<div id="app" data-view="scene"></div></html>`;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.woff':'font/woff'};
const server=http.createServer(async(req,res)=>{try{
 const url=decodeURI(req.url.split('?')[0]);if(url==='/'){res.setHeader('Content-Type','text/html');res.end(shell);return;}
 const file=url.startsWith('/__fonts/')&&fontRoot?path.join(fontRoot,url.slice(9)):path.join(root,url);
 res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));
}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[],checks=[];
try{
 browser=await chromium.launch({executablePath:process.env.ADV_BROWSER_EXECUTABLE,headless:true,ignoreDefaultArgs:['--hide-scrollbars'],args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer','--no-zygote']});
 const page=await browser.newPage({viewport:{width:1280,height:856}});page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(`http://127.0.0.1:${server.address().port}/`);
 await page.evaluate(async()=>{
  const {loadContent}=await import('./src/core/loader.js'),{GameEngine}=await import('./src/core/engine.js'),{projectGame}=await import('./src/application/projection.js'),{SceneView}=await import('./src/view/scene-view.js'),{handleGameKey}=await import('./src/view/keyboard.js'),{applyTheme,THEME_DEFAULT}=await import('./src/view/theme.js');
  applyTheme(THEME_DEFAULT);const data=await loadContent(),g=new GameEngine(data,29);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});
  const longText=('台帳を照らして、帰還者の名前を一人ずつ確かめる。\n\n灯🕯️を囲んで話す。\n').repeat(18);
  data.scripts.browser_scene={commands:[
   {op:'scene.cast',cast:data.quests.q001.story.scenes.post.cast.map(c=>({character:data.quests.q001.story.entities[c.entity].character,display:c.display}))},
   {op:'say',character:'elder',text:'今夜、戻ってきた。それはもう済んだ仕事だ。'},
   {op:'say',character:'rine',text:longText},
   {op:'choice',options:Array.from({length:18},(_,i)=>({id:`item_${i}`,text:`${i+1}：帰還の記録を確認する`,commands:[{op:'say',text:`選択 ${i+1}`}]}))}
  ]};
  const dispatch=intent=>{const changed=g.dispatch(intent);if(changed)window.view.render(projectGame(g));return changed;};
  const ui={status(){},soundEnabled:()=>false,effectsMode:()=> 'off',menu(){},help(){}};
  const view=new SceneView(document.querySelector('#app'),dispatch,ui);window.view=view;window.g=g;window.longText=longText;
  window.show=()=>view.render(projectGame(g));window.dispatch=dispatch;window.ui=ui;
  document.addEventListener('keydown',e=>handleGameKey(e,{view:window.view,model:window.view.model,dispatch}));
  g.dispatch({type:'location.move',id:'hikarigaeri_insurance'});window.show();
 });
 const settle=async()=>{await page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(r))));});};
 const shot=async name=>{await settle();await page.screenshot({path:path.join(output,name+'.png')});};
 await shot('01-town');const fixedHeight=await page.locator('.scene-dock').evaluate(e=>e.getBoundingClientRect().height);
 await page.evaluate(()=>{g.run('browser_scene');show();});await shot('02-elder-speaking');
 const blocking=await page.locator('.scene-actor').evaluateAll(es=>es.map(e=>e.style.left));
 assert.equal(await page.locator('.scene-actor.speaking').getAttribute('data-character'),'elder');
 await page.keyboard.press('Enter');await settle();
 assert.deepEqual(await page.locator('.scene-actor').evaluateAll(es=>es.map(e=>e.style.left)),blocking);assert.equal(await page.locator('.scene-actor.speaking').getAttribute('data-character'),'rine');
 const saved=await page.evaluate(()=>g.save());assert.ok(await page.evaluate(()=>view.pages.length>1));
 await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>view.page),1);await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>view.page),0);assert.equal(await page.evaluate(()=>g.save()),saved);
 const shown=[];
 for(let fuel=200;fuel--;){shown.push(await page.locator('.story-text').textContent());assert.ok(await page.evaluate(()=>document.querySelector('.story-text').scrollHeight<=document.querySelector('.scene-text-viewport').clientHeight));if(await page.evaluate(()=>view.canChoose()))break;await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>g.save()),saved);assert.ok(fuel>0);}
 assert.equal(shown.join(''),await page.evaluate(()=>longText));
 await page.keyboard.press('Enter');await settle();assert.equal(await page.evaluate(()=>g.state.waiting.type),'choice');assert.equal(await page.evaluate(()=>view.page),await page.evaluate(()=>view.pages.length-1));
 assert.equal(await page.locator(':focus').getAttribute('data-focus'),'choice:item_0');
 for(let i=0;i<17;i++)await page.keyboard.press('ArrowDown');
 assert.equal(await page.locator(':focus').getAttribute('data-focus'),'choice:item_17');assert.ok(await page.locator('.scene-message-actions').evaluate(e=>e.scrollTop>0));
 assert.ok(Math.abs(await page.locator('.scene-dock').evaluate(e=>e.getBoundingClientRect().height)-fixedHeight)<1);
 assert.ok(await page.locator(':focus').evaluate(e=>{const b=e.getBoundingClientRect(),r=e.closest('.scene-message-actions').getBoundingClientRect();return b.top>=r.top&&b.bottom<=r.bottom;}));
 await shot('03-scrolled-choices');checks.push('fixed dock height, measured Unicode pagination, cancel to previous page, no game progress during paging, immediate choices after final text page, all 18 choices reached with arrow keys');
 for(const [w,h] of [[900,700],[390,844],[320,568],[844,390]]){
  await page.setViewportSize({width:w,height:h});await page.evaluate(()=>document.documentElement.style.setProperty('--text-size','24px'));await settle();
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const fit=await page.evaluate(()=>({height:document.querySelector('.story-text').scrollHeight,available:document.querySelector('.scene-text-viewport').clientHeight,key:view.messageNodes.measureKey,width:document.querySelector('.scene-text-viewport').clientWidth,font:getComputedStyle(document.querySelector('.story-text')).font,page:view.page,text:document.querySelector('.story-text').textContent}));assert.ok(fit.height<=fit.available,JSON.stringify({w,h,...fit}));
  await page.evaluate(()=>view.setPage(view.pages.length-1));for(let i=0;i<17;i++)await page.keyboard.press('ArrowDown');
  assert.equal(await page.locator(':focus').getAttribute('data-focus'),'choice:item_17');
  assert.ok(await page.locator('.scene-message-actions').evaluate(e=>e.scrollTop>0));await shot(`04-${w}x${h}`);
 }
 checks.push('900px, 390px, 320px and low landscape: 24px text fits without horizontal overflow; final choice stays keyboard-reachable');
 await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>g.state.waiting.text),'選択 18');
 await page.evaluate(async()=>{const {GameView}=await import('./src/view/view.js');const {projectGame}=await import('./src/application/projection.js');view.destroy();document.querySelector('#app').dataset.view='classic';window.view=new GameView(document.querySelector('#app'),dispatch,ui);window.view.render(projectGame(g));});
 assert.equal(await page.locator('.story-person').count(),3);checks.push('Enter selects the scrolled item; classic view retains all three character cards');
 await page.setViewportSize({width:1280,height:856});
 await page.evaluate(async()=>{
  const {SceneView}=await import('./src/view/scene-view.js'),{projectGame}=await import('./src/application/projection.js');
  view.destroy();document.querySelector('#app').dataset.view='scene';document.documentElement.style.setProperty('--text-size','17px');
  window.view=new SceneView(document.querySelector('#app'),dispatch,ui);g.dispatch({type:'advance'});g.dispatch({type:'location.move',id:'hikarigaeri_square'});g.dispatch({type:'travel',dungeon:'kagaribi'});
  const m=projectGame(g);m.dungeon.objects=[{kind:'event',glyph:'?',x:m.dungeon.location.x,y:m.dungeon.location.y}];
  window.originalFillText=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...args){if(text==='?')window.markerBaseline=y;return originalFillText.call(this,text,x,y,...args);};
  view.render(m);
 });await shot('05-dungeon-marker');
 assert.ok(await page.evaluate(()=>{const c=document.querySelector('canvas'),r=c.getBoundingClientRect(),dock=document.querySelector('.scene-dock').getBoundingClientRect();return r.top+markerBaseline/c.height*r.height<dock.top;}));
 await page.evaluate(()=>{CanvasRenderingContext2D.prototype.fillText=originalFillText;});checks.push('dungeon question mark remains above the fixed message dock');
 assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2)+'\n');console.log(JSON.stringify({passed:true,checks,errors},null,2));
}finally{await browser?.close();server.close();}
