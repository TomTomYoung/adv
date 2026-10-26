// Real browser coverage for the two layouts, border choices and local services.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-machine-browser';
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
      start(layout){view?.destroy();g=new GameEngine(data,1907);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});g.random=()=>.999999;view=replaceView(null,layout,document.querySelector('#app'),dispatch,{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();},
      walk(x,y){settle();const l=g.state.location,queue=[[l.x,l.y]],seen=new Map([[`${l.x},${l.y}`,null]]);for(let i=0;i<queue.length;i++){const p=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=[p[0]+dx,p[1]+dy];if(g.walkable(g.map(),...n)&&!seen.has(n.join(','))){seen.set(n.join(','),p);queue.push(n);}}}if(!seen.has(`${x},${y}`))throw Error('no walking route');const route=[];for(let p=[x,y];seen.get(p.join(','));p=seen.get(p.join(',')))route.unshift(p);for(const [nx,ny] of route){const f=nx>l.x?'east':nx<l.x?'west':ny>l.y?'south':'north';while(l.facing!==f)if(!g.dispatch({type:'move',direction:'right'}))throw Error('turn rejected: '+JSON.stringify(g.state.waiting));if(!g.dispatch({type:'move',direction:'forward'}))throw Error('step rejected: '+JSON.stringify({location:g.state.location,waiting:g.state.waiting,notice:g.state.notice}));settle();}render();},
      routeLabel(id){return projectGame(g).worldTravel.actions.find(a=>a.intent.route===id).label;},
      resume(){g.load(g.save());render();}
    };
    document.addEventListener('keydown',e=>handleGameKey(e,{view,model:view.model,dispatch}));
  });
  const revealChoices=async()=>{for(let n=0;n<50&&await page.evaluate(()=>h.view.canChoose?.()===false);n++)await page.keyboard.press('Enter');};
  const click=async label=>{await revealChoices();const button=page.getByRole('button',{name:label,exact:true});await button.scrollIntoViewIfNeeded();await button.click();};
  async function cross(route){
    const label=await page.evaluate(id=>h.routeLabel(id),route);
    await click('任意調べる');
    if(route==='library_surface'||route==='machine_surface'){await click('地上への階段');await click('調べる');}
    else{await click(label);await click(label);}
    await page.evaluate(()=>h.settle());
  }
  async function stairs(){
    const name=await page.evaluate(()=>{h.settle();const s=h.g.map().objects.find(o=>o.id==='stairs');h.walk(s.x,s.y);return s.name;});
    await click('任意調べる');await click(name);await click('調べる');await page.evaluate(()=>h.settle());
  }
  const choose=async(id,key)=>{await revealChoices();const button=page.locator(`[data-focus="choice:${key}"]`);await button.scrollIntoViewIfNeeded();await button.click();await page.evaluate(()=>{h.settle();h.resume();});};
  const city=async()=>{await click('サロメ・学門前へ戻る');};
  const accept=async id=>{await click('サロメの共同依頼所');await click('依頼掲示板を見る');const title=await page.evaluate(id=>h.g.data.quests[id].title,id);await page.locator('.quest-card').filter({has:page.getByRole('heading',{name:title,exact:true})}).getByRole('button',{name:'依頼を受ける',exact:true}).click();if(await page.evaluate(()=>h.view.constructor.name==='SceneView'))await page.keyboard.press('Escape');else await city();if(await page.evaluate(()=>h.g.state.townLocation)!=='e2_academy')await city();};
  const enter=async(id,x,y,second=false)=>{await click(await page.evaluate(()=>h.routeLabel('machine_surface')));if(second)await stairs();await page.evaluate(({id,x,y})=>{h.settle();h.walk(x,y);if(!h.dispatch({type:'story.resume',quest:id}))throw Error('resume '+id);h.settle();},{id,x,y});};
  const leave=async(second=false)=>{if(second)await stairs();await page.evaluate(()=>h.walk(1,1));await cross('machine_surface');};
  for(const layout of ['scene','classic'])for(const width of [1440,390]){
    await page.setViewportSize({width,height:width===390?844:1000});await page.evaluate(layout=>h.start(layout),layout);
    await click('灯帰りから高台街道へ');await page.evaluate(()=>h.walk(13,5));await cross('salome_road_slope');await page.evaluate(()=>h.walk(13,5));await cross('salome_road_gate');
    await accept('q071');await enter('q071',9,11);await choose('q071','retired');await leave();await click('学術都市・遺物管理室');await click('機関廟の点検・承認窓口');await page.evaluate(()=>h.settle());await choose('q071','carry');await click('学術都市・遺物管理室へ戻る');await city();await click(await page.evaluate(()=>h.routeLabel('machine_surface')));await page.evaluate(()=>{h.settle();h.walk(9,11);h.settle();});
    await choose('q071','call');await page.evaluate(()=>{h.walk(5,11);h.settle();});await choose('q071','escort');assert.equal(await page.evaluate(()=>h.g.state.stories.q071.values.workerPersonAt),'transit');await page.evaluate(()=>{h.walk(9,11);h.settle();h.resume();});assert.equal(await page.evaluate(()=>h.g.state.stories.q071.values.returned),false);await revealChoices();await page.screenshot({path:path.join(output,`${layout}-${width}-machine-worker.png`),fullPage:true});await choose('q071','finish');assert.equal(await page.evaluate(()=>h.g.state.quests.q071.outcome),'informed');await leave();
    // A counted observation, a paid ward, real collection and the sealed loop.
    await accept('q171');await enter('q171',3,1);await choose('q171','visit');await leave();await click('ダイの家の外戸口');await page.evaluate(()=>h.settle());await choose('q171','begin');await city();await click('サロメから外縁の生活道へ');await page.evaluate(()=>{h.settle();h.walk(3,3);h.settle();});await choose('q171','rule');await page.evaluate(()=>{h.walk(7,1);h.settle();});await choose('q171','return');await page.evaluate(()=>{h.walk(3,3);h.settle();});const gold=await page.evaluate(()=>h.g.state.gold);await choose('q171','ward');assert.equal(await page.evaluate(()=>h.g.state.gold),gold-20);await choose('q171','continue');await page.evaluate(()=>h.walk(1,1));await cross('machine_outskirts');await click('足音を預かる靴店');await page.evaluate(()=>h.settle());assert.equal(await page.evaluate(()=>h.g.state.stories.q171.values.time),2);await choose('q171','return');await city();await click('サロメから外縁の生活道へ');await page.evaluate(()=>{h.settle();h.walk(3,3);h.settle();});await choose('q171','loop');await page.evaluate(()=>{h.walk(13,3);h.settle();});await revealChoices();await page.screenshot({path:path.join(output,`${layout}-${width}-machine-loop.png`),fullPage:true});await choose('q171','home');await page.evaluate(()=>h.walk(1,1));await cross('machine_outskirts');await click('ダイの家の外戸口');await page.evaluate(()=>h.settle());await choose('q171','finish');assert.equal(await page.evaluate(()=>h.g.state.quests.q171.outcome),'loop');await city();
    // Visit homes in a non-numeric order and carry one recovered marker back.
    await accept('q179');await enter('q179',6,1,true);await choose('q179','visit');await leave(true);await click('サロメから外縁の生活道へ');await page.evaluate(()=>{h.settle();h.walk(15,7);});await cross('machine_cemetery');await page.evaluate(()=>{h.walk(11,5);h.settle();});await choose('q179','begin');await page.evaluate(()=>h.walk(1,1));await cross('machine_cemetery');await page.evaluate(()=>{h.walk(7,3);h.settle();});
    for(const i of [3,1,2]){await choose('q179','house'+i);await page.evaluate(i=>{h.walk(i===1?3:i===2?9:13,7);h.settle();},i);await choose('q179',i===3?'collect':'reject');await choose('q179','return');await page.evaluate(()=>{h.walk(7,3);h.settle();});}
    assert.equal(await page.evaluate(()=>h.g.state.stories.q179.values.homes),3);await revealChoices();await page.screenshot({path:path.join(output,`${layout}-${width}-machine-homes.png`),fullPage:true});await choose('q179','starve');await page.evaluate(()=>h.walk(15,7));await cross('machine_cemetery');await page.evaluate(()=>{h.walk(11,5);h.settle();});await choose('q179','finish');assert.equal(await page.evaluate(()=>h.g.state.quests.q179.outcome),'starve');assert.equal(await page.evaluate(()=>h.g.state.stories.q179.values.marker3At),'garden');
    await page.evaluate(()=>h.walk(1,1));await cross('machine_cemetery');await page.evaluate(()=>h.walk(1,1));await cross('machine_outskirts');
    const measure=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,steps:h.g.state.steps,outcomes:['q071','q171','q179'].map(id=>h.g.state.quests[id].outcome)}));assert.ok(measure.document<=measure.viewport+1,`${layout} ${width}: horizontal overflow`);checks.push({layout,width,...measure});
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'result.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,errors,output}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
