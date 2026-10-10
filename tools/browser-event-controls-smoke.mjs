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
      const {loadContent}=await import('./src/core/loader.js'),{GameEngine}=await import('./src/core/engine.js'),{projectGame}=await import('./src/application/projection.js'),{GameView}=await import('./src/view/view.js'),{SceneView}=await import('./src/view/scene-view.js'),{handleGameKey}=await import('./src/view/keyboard.js'),{applyTheme,THEME_DEFAULT}=await import('./src/view/theme.js');
      applyTheme({...THEME_DEFAULT,textSize:24});const data=await loadContent();
      const ui={status(){},soundEnabled:()=>false,effectsMode:()=> 'off',menu(){},help(){}};
      window.reset=(layout='scene')=>{
        window.view?.destroy();window.g=new GameEngine(data,42);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});
        window.dispatch=intent=>{const changed=g.dispatch(intent);if(changed)window.show();return changed;};
        const app=document.querySelector('#app');app.dataset.view=layout;
        window.view=new (layout==='classic'?GameView:SceneView)(app,dispatch,ui);window.show=()=>view.render(projectGame(g));
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
    assert.ok(await page.locator(':focus').getAttribute('data-focus').then(k=>k.startsWith('choice:')));
    const choiceSave=await page.evaluate(()=>g.save());for(let i=0;i<12;i++)await page.mouse.click(point.x,point.y);
    assert.equal(await page.evaluate(()=>g.save()),choiceSave);
    await page.keyboard.press('ArrowDown');
    assert.ok(await page.locator(':focus').evaluate(e=>Boolean(e.closest('.message-window'))));
    assert.equal(await page.evaluate(()=>g.save()),choiceSave);
    await page.screenshot({path:path.join(output,`q001-${width}x${height}.png`)});
    // Long labels can exceed a small scrolling pane. Click their visible part,
    // exactly as a pointer user does, rather than the clipped full-box center.
    const choicePoint=await page.locator('[data-focus="choice:talk"]').evaluate(e=>{
      e.scrollIntoView({block:'start'});const b=e.getBoundingClientRect(),r=e.closest('.scene-message-actions').getBoundingClientRect();
      const top=Math.max(b.top,r.top),bottom=Math.min(b.bottom,r.bottom);
      if(bottom-top<44)throw new Error(`Choice has only ${bottom-top}px of visible hit area`);
      return {x:(Math.max(b.left,r.left)+Math.min(b.right,r.right))/2,y:(top+bottom)/2};
    });
    await page.mouse.click(choicePoint.x,choicePoint.y);
    for(let fuel=100;await page.evaluate(()=>g.state.waiting?.type==='text');fuel--){assert.ok(fuel>0);await page.keyboard.press('Enter');}
    assert.equal(await pad.locator('button:enabled').count(),4);await samePad();
    await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>g.state.location.facing),'north');
    // A long event list must scroll without translating any movement hit area.
    await page.evaluate(()=>{reset();g.dispatch({type:'travel',dungeon:'kagaribi'});show();});await settle();
    const manyBefore=await pad.boundingBox();
    await page.evaluate(()=>{g.run('browser_many_choices');show();});await settle();
    for(let fuel=100;await page.evaluate(()=>g.state.waiting?.type==='text');fuel--){assert.ok(fuel>0);await page.keyboard.press('Enter');}
    await settle();
    assert.equal(await page.evaluate(()=>g.state.waiting.type),'choice');
    for(let i=0;i<17;i++)await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator(':focus').getAttribute('data-focus'),'choice:option_17');
    assert.ok(await page.locator('.scene-message-actions').evaluate(e=>e.scrollTop>0&&e.clientHeight>=44));
    const manyAfter=await pad.boundingBox();for(const k of ['x','y','width','height'])assert.ok(Math.abs(manyBefore[k]-manyAfter[k])<1,`${width}: list changed pad ${k}`);
    assert.ok(await page.locator(':focus').evaluate(e=>{const b=e.getBoundingClientRect(),r=e.closest('.scene-message-actions').getBoundingClientRect();return b.bottom>r.top&&b.top<r.bottom;}));
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(output,`choices-${width}x${height}.png`)});
    await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>g.state.waiting.text),'選択 18');

    // Shift + lateral input performs true crab-walk movement through GameEngine,
    // and the top-right toggle hides/restores only the lower exploration windows.
    await page.evaluate(()=>{reset();g.dispatch({type:'travel',dungeon:'kagaribi'});g.teleport('kagaribi_f1',1,1,'east');show();});await settle();
    const strafeBefore=await page.evaluate(()=>({...g.state.location,steps:g.state.steps}));
    await page.keyboard.press('Shift+ArrowRight');await settle();
    const strafeAfter=await page.evaluate(()=>({...g.state.location,steps:g.state.steps}));
    assert.deepEqual({x:strafeAfter.x,y:strafeAfter.y,facing:strafeAfter.facing},{x:1,y:2,facing:'east'});
    assert.equal(strafeAfter.steps,strafeBefore.steps+1);
    await page.getByRole('button',{name:'ウィンドウを消す',exact:true}).click();await settle();
    assert.equal(await page.locator('.scene-stage').evaluate(e=>e.classList.contains('scene-windows-hidden')),true);
    assert.equal(await page.locator('.scene-dock').isVisible(),false);
    assert.equal(await page.getByRole('button',{name:'ウィンドウを戻す',exact:true}).isVisible(),true);
    await page.keyboard.press('Shift+ArrowLeft');await settle();
    assert.deepEqual(await page.evaluate(()=>({x:g.state.location.x,y:g.state.location.y,facing:g.state.location.facing})),{x:1,y:1,facing:'east'});
    assert.equal(await page.locator('.scene-dock').isVisible(),false);
    await page.evaluate(()=>{g.run('browser_many_choices');show();});await settle();
    assert.equal(await page.locator('.scene-dock').isVisible(),true);
    assert.equal(await page.locator('.scene-stage').evaluate(e=>e.classList.contains('scene-windows-hidden')),false);
    assert.equal(await page.getByRole('button',{name:'ウィンドウを消す',exact:true}).isVisible(),true);
    checks.push(`${width}x${height}${coarse?' touch':''}: Shift crab-walk keeps facing, lower windows hide/restore, events force windows visible`);
    checks.push(`${width}x${height}${coarse?' touch':''}: q001 forward coordinate spam inert, pad fixed, all 18 choices reachable, keyboard movement restored`);
    if(width===1280||width===390){
      // Interaction and exploration share the placed cell; the map still guides us there.
      // Inspect actual canvas glyphs in both layouts, including the scene background.
      // A fresh full-canvas paint clears its record; texture reloads cannot leave stale glyphs.
      await page.evaluate(async()=>{
        const {commandTargets}=await import('./src/core/player-commands.js');
        const prototype=CanvasRenderingContext2D.prototype,fillRect=prototype.fillRect,fillText=prototype.fillText,painted=new WeakMap();
        prototype.fillRect=function(...args){
          if(this.canvas.matches?.('.dungeon-canvas')&&args[0]===0&&args[1]===0&&args[2]===this.canvas.width&&args[3]===this.canvas.height)painted.set(this.canvas,[]);
          return fillRect.apply(this,args);
        };
        prototype.fillText=function(text,...args){painted.get(this.canvas)?.push(String(text));return fillText.call(this,text,...args);};
        window.markerProbe={
          start(layout,id){
            reset(layout);g.random=()=>.99999;if(id!=='history')g.accept('q001');
            g.dispatch({type:'travel',dungeon:'kagaribi'});g.teleport('kagaribi_f1',id==='history'?2:7,1,id==='history'?'east':'north');show();
          },
          snapshot(id){
            const canvas=document.querySelector('.dungeon-canvas'),object=view.model.dungeon.objects.find(o=>o.id===id);
            const cell=document.querySelector(`.map-cell[data-x="${object?.x}"][data-y="${object?.y}"]`);
            return {
              unread:object?.unread,inRange:object?.inInteractionRange,
              inspectable:commandTargets(g,'inspect').some(target=>target.id===`object:${id}`),
              mapQuestion:Boolean(cell?.querySelector(object?.edge?`.map-edge-marker.${object.edge} .map-edge-image[src$="/clue.svg"]`:'.map-object[src$="/clue.svg"]')),
              glyphs:painted.get(canvas)??null,background:Boolean(canvas?.closest('.scene-world'))
            };
          },
          restore(){prototype.fillRect=fillRect;prototype.fillText=fillText;}
        };
      });
      try{
        for(const layout of ['classic','scene']){
          const marker=async(id,unread,{reachable=true,mapQuestion}={})=>{
            await settle();const state=await page.evaluate(id=>markerProbe.snapshot(id),id);
            assert.equal(state.unread,unread,`${layout} ${width}: ${id} unread`);
            assert.equal(state.inRange,reachable,`${layout} ${width}: ${id} projected interaction range`);
            assert.equal(state.inspectable,reachable,`${layout} ${width}: ${id} actual inspection target`);
            if(mapQuestion!==undefined)assert.equal(state.mapQuestion,mapQuestion,`${layout} ${width}: ${id} map marks the placed cell`);
            assert.ok(Array.isArray(state.glyphs),`${layout} ${width}: dungeon canvas was painted`);
            assert.equal(state.background,layout==='scene',`${layout} ${width}: intended canvas path`);
            assert.equal(state.glyphs.includes('?'),unread&&reachable,`${layout} ${width}: ${id} actual glyphs ${JSON.stringify(state.glyphs)}`);
          };
          const shot=async(name)=>{await page.locator('.dungeon-scene').screenshot({path:path.join(output,`markers-${layout}-${width}x${height}-${name}.png`)});};
          const move=async(direction,x,y,facing)=>{
            await page.locator(`.movement-pad .${direction}`).click();await settle();
            assert.deepEqual(await page.evaluate(()=>({x:g.state.location.x,y:g.state.location.y,facing:g.state.location.facing})),{x,y,facing},`${layout} ${width}: ${direction} reaches the intended cell/facing`);
            assert.equal(await page.evaluate(()=>g.state.waiting),null,`${layout} ${width}: movement leaves inspection available`);
          };
          const read=async id=>{
            await page.locator('[data-focus="command:interact"]').click();await settle();
            assert.equal(await page.evaluate(()=>g.state.waiting?.type),'text',`${layout} ${width}: ${id} opens its real description`);
            await marker(id,true);
            for(let fuel=100;await page.evaluate(()=>g.state.waiting?.type==='text');fuel--){assert.ok(fuel>0);await page.keyboard.press('Enter');await settle();}
            assert.equal(await page.evaluate(()=>g.state.waiting),null,`${layout} ${width}: inspection finished`);
            await marker(id,false);
          };
          await page.evaluate(layout=>markerProbe.start(layout,'history'),layout);
          await marker('history',true,{reachable:false,mapQuestion:true});await shot('record-before-cell');
          await page.locator('[data-focus="command:interact"]').click();
          assert.equal(await page.evaluate(()=>g.state.waiting),null,`${layout} ${width}: convenient inspection cannot read the record one cell ahead`);
          await move('forward',3,1,'east');
          await marker('history',true);await shot('record-unread');await read('history');await shot('record-read');
          await move('back',2,1,'east');await marker('history',false,{reachable:false,mapQuestion:false});
          await page.evaluate(layout=>markerProbe.start(layout,'q001_empty_west'),layout);
          await marker('q001_empty_west',true,{reachable:false,mapQuestion:true});
          await move('right',7,1,'east');await move('forward',8,1,'east');
          await marker('q001_empty_west',true,{reachable:false,mapQuestion:true});await shot('wall-wrong-facing');
          await move('left',8,1,'north');
          await marker('q001_empty_west',true,{mapQuestion:true});await shot('wall-unread');await read('q001_empty_west');
          await marker('q001_empty_west',false,{mapQuestion:false});await shot('wall-read');
          await page.evaluate(()=>{g.state.objects['kagaribi_f1/q001_empty_west']='lit';show();});
          await marker('q001_empty_west',true,{mapQuestion:true});await shot('wall-new-description');await read('q001_empty_west');
          await page.evaluate(()=>{g.state.objects['kagaribi_f1/q001_empty_west']='empty';show();});
          await marker('q001_empty_west',false,{mapQuestion:false});
          checks.push(`${layout} ${width}x${height}: record inspection and actual ? require arrival; wall ? requires its owning cell and facing; map guides to unread locations; read completion hides ? and new wall text restores it`);
        }
      }finally{await page.evaluate(()=>{markerProbe.restore();delete window.markerProbe;reset();show();});}
    }
    await context.close();
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2)+'\n');console.log(JSON.stringify({passed:true,checks,errors},null,2));
}finally{await browser?.close();server.close();}
