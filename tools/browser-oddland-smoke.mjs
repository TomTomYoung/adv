// Real browser coverage for the two layouts, border choices and local services.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-oddland-browser';
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
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async()=>{
    const {loadContent}=await import('/src/core/loader.js'),{GameEngine}=await import('/src/core/engine.js'),{projectGame}=await import('/src/application/projection.js'),{replaceView}=await import('/src/view/view-layout.js'),{handleGameKey}=await import('/src/view/keyboard.js'),{applyTheme,THEME_DEFAULT}=await import('/src/view/theme.js');
    applyTheme(THEME_DEFAULT);const data=await loadContent(undefined,{edition:'e2'});let g,view;
    const render=()=>view.render(projectGame(g)),dispatch=intent=>{const ok=g.dispatch(intent);render();return ok;};
    const settle=()=>{for(let i=0;i<100&&(g.state.waiting?.type==='text'||g.state.waiting?.type==='command'&&g.state.waiting.command==='result');i++)g.dispatch({type:'advance'});render();};
    window.h={get g(){return g;},get view(){return view;},dispatch,render,settle,
      start(layout){view?.destroy();g=new GameEngine(data,1907);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});g.random=()=>.999999;g.teleport('region_1_landing',15,3);view=replaceView(null,layout,document.querySelector('#app'),dispatch,{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();},
      walk(x,y){const l=g.state.location,queue=[[l.x,l.y]],seen=new Map([[`${l.x},${l.y}`,null]]);for(let i=0;i<queue.length;i++){const p=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=[p[0]+dx,p[1]+dy];if(g.walkable(g.map(),...n)&&!seen.has(n.join(','))){seen.set(n.join(','),p);queue.push(n);}}}if(!seen.has(`${x},${y}`))throw Error('no walking route');const route=[];for(let p=[x,y];seen.get(p.join(','));p=seen.get(p.join(',')))route.unshift(p);for(const [nx,ny] of route){const f=nx>l.x?'east':nx<l.x?'west':ny>l.y?'south':'north';while(l.facing!==f)g.dispatch({type:'move',direction:'right'});if(!g.dispatch({type:'move',direction:'forward'}))throw Error('step rejected');}render();},
      routeLabel(id){return projectGame(g).worldTravel.actions.find(a=>a.intent.route===id).label;},
      resume(){g.load(g.save());render();}
    };
    document.addEventListener('keydown',e=>handleGameKey(e,{view,model:view.model,dispatch}));
  });
  const click=async label=>{for(let n=0;n<50&&await page.evaluate(()=>h.view.canChoose?.()===false);n++)await page.keyboard.press('Enter');const button=page.getByRole('button',{name:label,exact:true});await button.scrollIntoViewIfNeeded();await button.click();};
  async function cross(route){
    const label=await page.evaluate(id=>h.routeLabel(id),route);
    await click('任意調べる');await click(label);await click(label);await page.evaluate(()=>h.settle());
  }
  for(const layout of ['scene','classic'])for(const width of [1440,390]){
    await page.setViewportSize({width,height:width===390?844:1000});await page.evaluate(layout=>h.start(layout),layout);
    const initial=await page.evaluate(()=>h.g.state.worldTravel);
    await click('任意調べる');await click('探索隊を記帳してオッドランド方面へ進む（無料）');
    await page.keyboard.press('Escape');await page.keyboard.press('Escape');
    assert.deepEqual(await page.evaluate(()=>h.g.state.worldTravel),initial);
    await cross('oddland_checkpoint');assert.equal(await page.evaluate(()=>h.g.state.location.map),'e2_trade_corridor');
    await page.evaluate(()=>h.resume());
    for(const route of ['trade_refuge','border_customs','oddland_surface']){await page.evaluate(()=>h.walk(9,3));await cross(route);}
    assert.equal(await page.evaluate(()=>h.g.state.townLocation),'oddland_border');
    await click('国境宿場の補給店');await click('携行油を補充する（無料）');
    assert.equal(await page.evaluate(()=>h.g.state.light),90);
    await click('オッドランド・国境宿場へ戻る');await click('国境宿場の共同依頼所');await click('依頼掲示板を見る');
    assert.equal(await page.locator('.quest-card').count(),10);assert.ok(!(await page.locator('.quest-list').innerText()).includes('帰らない灯番'));
    if(layout==='scene'){await page.keyboard.press('Escape');}
    else await click('オッドランド・国境宿場へ戻る');
    if(await page.evaluate(()=>h.g.state.townLocation)!=='oddland_border')await click('オッドランド・国境宿場へ戻る');
    const measure=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,text:[...document.querySelectorAll('.world-travel-status')].map(e=>e.textContent).join(' '),visited:h.g.state.worldTravel.visited}));
    assert.ok(measure.document<=measure.viewport+1,`${layout} ${width}: horizontal overflow`);assert.match(measure.text,/オッドランド/);assert.ok(measure.visited.oddland);
    await page.screenshot({path:path.join(output,`${layout}-${width}-oddland.png`),fullPage:true});
    await click('国境宿場と出入窓口の石段');assert.equal(await page.evaluate(()=>h.g.state.worldTravel.returnAnchor),'oddland');
    await click('帰還印で町へ戻る');
    assert.ok((await page.locator('.story-text').allTextContents()).join(' ').includes('オッドランド')||await page.getByText(/帰還印でオッドランド/).count());
    await click('帰還する');await page.evaluate(()=>h.settle());assert.equal(await page.evaluate(()=>h.g.state.townLocation),'oddland_border');
    await click('国境宿場の共同依頼所');await click('依頼掲示板を見る');
    await page.locator('.quest-card').filter({has:page.getByRole('heading',{name:'荷台から聞こえる笛',exact:true})}).getByRole('button',{name:'依頼を受ける',exact:true}).click();
    if(layout==='scene')await page.keyboard.press('Escape');else await click('オッドランド・国境宿場へ戻る');
    if(await page.evaluate(()=>h.g.state.townLocation)!=='oddland_border')await click('オッドランド・国境宿場へ戻る');
    await click('国境宿場の荷車溜まり');await click('荷台から聞こえる笛の続きを話す');await page.evaluate(()=>h.settle());
    await click('幌を開け、声を掛ける');await page.evaluate(()=>h.settle());await page.evaluate(()=>h.resume());
    await page.screenshot({path:path.join(output,`${layout}-${width}-child-choice.png`),fullPage:true});
    await click('テオと退避所へ父を探しに行く');
    assert.equal(await page.evaluate(()=>h.g.state.stories.q291.values.teoAt),'transit');
    await click('オッドランド・国境宿場へ戻る');await click('国境宿場と出入窓口の石段');
    await page.evaluate(()=>h.walk(1,1));await cross('border_customs');await page.evaluate(()=>{h.walk(3,3);h.settle();});
    await click('親子に帰りの車を案内する');await page.evaluate(()=>h.settle());await page.evaluate(()=>h.resume());
    assert.equal(await page.evaluate(()=>h.g.state.quests.q291.outcome),'escort');
    assert.equal(await page.evaluate(()=>h.g.state.stories.q291.values.teoAt),'refuge');
    checks.push({layout,width,...measure,quest:'q291',outcome:'escort'});
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'result.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,errors,output}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
