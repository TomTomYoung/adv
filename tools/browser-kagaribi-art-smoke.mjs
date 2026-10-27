// Both editions, actual story checkpoints, both renderers and desktop/mobile.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {kagaribiArtFixtures} from './kagaribi-art-fixtures.mjs';
const {fixtures,outcomes}=await kagaribiArtFixtures();
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-kagaribi-art-browser';await fs.mkdir(output,{recursive:true});
const shell='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="src/view/style.css"><link rel="stylesheet" href="src/view/scene-style.css"><div id="app"></div></html>';
const types={'.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{
  const url=decodeURI(req.url.split('?')[0]);
  if(url==='/'){res.setHeader('content-type','text/html');res.end(shell);return;}
  if(url==='/fixtures.json'){res.setHeader('content-type','application/json');res.end(JSON.stringify(fixtures));return;}
  const file=path.join(root,url);res.setHeader('content-type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));
}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[],checks=[];
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.ADV_BROWSER_EXECUTABLE,args:['--no-sandbox']});
  const page=await browser.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async()=>{
    const {loadContent}=await import('/src/core/loader.js'),{GameEngine}=await import('/src/core/engine.js'),{projectGame}=await import('/src/application/projection.js'),{replaceView}=await import('/src/view/view-layout.js'),{applyTheme,THEME_DEFAULT}=await import('/src/view/theme.js');
    applyTheme(THEME_DEFAULT);const data=Object.fromEntries(await Promise.all(['e1','e2'].map(async edition=>[edition,await loadContent(undefined,{edition})]))),fixtures=await fetch('/fixtures.json').then(r=>r.json());let g,view;
    const render=()=>view.render(projectGame(g));
    window.h={get g(){return g;},get view(){return view;},
      start(index,layout){const f=fixtures[index];view?.destroy();g=new GameEngine(data[f.edition]);g.load(f.save);view=replaceView(null,layout,document.querySelector('#app'),intent=>{const accepted=g.dispatch(intent);render();return accepted;},{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();},
      resume(){g.load(g.save());render();}
    };
  });
  for(const layout of ['scene','classic'])for(const width of [1440,390]){
    await page.setViewportSize({width,height:width===390?844:1000});
    for(const [index,f] of fixtures.entries()){
      await page.evaluate(({index,layout})=>h.start(index,layout),{index,layout});
      const before=await page.evaluate(()=>h.g.save());await page.evaluate(()=>h.resume());assert.equal(await page.evaluate(()=>h.g.save()),before);
      assert.deepEqual(await page.evaluate(()=>h.view.model.dialog.scene.cast.map(c=>c.id)),f.cast);
      const images=[];
      for(const id of f.cast){
        const figure=page.locator(`[data-character="${id}"]`),img=figure.locator('img');assert.equal(await img.count(),1);
        const info=await img.evaluate(async i=>{await i.decode();const c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(i,0,0);return {src:i.getAttribute('src'),width:i.naturalWidth,height:i.naturalHeight,cornerAlpha:ctx.getImageData(0,0,1,1).data[3],bodyAlpha:ctx.getImageData(512,700,1,1).data[3]};});
        assert.equal(info.src,`assets/images/characters/kagaribi/${id}.webp`);assert.deepEqual([info.width,info.height],[1024,1536]);assert.equal(info.cornerAlpha,0);assert.ok(info.bodyAlpha>240);
        assert.ok((await figure.textContent()).includes(await page.evaluate(id=>h.g.data.characters[id].name,id)));images.push({id,...info});
      }
      await page.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
      if(f.blockedChoice){
        const choice=page.locator(`[data-focus="choice:${f.blockedChoice}"]`);
        for(let n=0;await choice.count()===0&&n<32;n++)await page.locator('[data-focus="message:next"]').click();
        assert.equal(await choice.count(),1);assert.ok(await choice.isDisabled());
        if(f.availableChoice){
          const allowed=page.locator(`[data-focus="choice:${f.availableChoice}"]`);
          assert.equal(await allowed.count(),1);assert.ok(await allowed.isEnabled());
        }
        assert.equal(await page.evaluate(id=>h.g.dispatch({type:'choose',id}),f.blockedChoice),false);
        assert.equal(await page.evaluate(()=>h.g.save()),before);
      }
      const measure=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,height:innerHeight,pageHeight:document.documentElement.scrollHeight}));
      assert.ok(measure.document<=measure.viewport+1,'horizontal overflow');if(layout==='scene')assert.ok(measure.pageHeight<=measure.height+1,'Scene height');
      await page.screenshot({path:path.join(output,`${f.edition}-${layout}-${width}-${f.quest}-${f.scene}${f.variant?`-${f.variant}`:''}.png`),fullPage:true});
      checks.push({edition:f.edition,quest:f.quest,scene:f.scene,variant:f.variant,blockedChoice:f.blockedChoice,availableChoice:f.availableChoice,layout,width,images,...measure});
    }
  }
  assert.deepEqual(errors,[]);console.log(JSON.stringify({checks:checks.length,outcomes:outcomes.length,errors,output}));
}finally{await fs.writeFile(path.join(output,'kagaribi-art-result.json'),JSON.stringify({checks,outcomes,errors},null,2));await browser?.close();await new Promise(r=>server.close(r));}
