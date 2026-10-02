import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(import.meta.dirname,'..'),output='/tmp/adv-generated-engine-browser';
await fs.mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.mp3':'audio/mpeg','.wav':'audio/wav'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/adv/'))throw Error('path');const file=path.resolve(root,decodeURIComponent(url.pathname.slice(5)));if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
try{
  browser=await chromium.launch({executablePath:process.env.ADV_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:1280,height:856}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`http://127.0.0.1:${server.address().port}/adv/dungeon-engine-playtest.html`);
  await page.waitForFunction(()=>window.generatedPlaytest?.engine?.state?.mode==='dungeon'||document.querySelector('#generator-status')?.style.color==='rgb(255, 179, 170)');
  if(!await page.evaluate(()=>Boolean(window.generatedPlaytest?.engine))){
    const diagnostic=await page.evaluate(()=>({status:document.querySelector('#generator-status')?.textContent,errors:window.__playtestErrors??[]}));
    throw new Error('generated playtest did not start: '+JSON.stringify({diagnostic,pageErrors:errors}));
  }
  await page.locator('.dungeon-canvas').waitFor();
  await page.waitForTimeout(800);
  assert.equal(await page.evaluate(()=>generatedPlaytest.engine.map().id),'generated_preview_f1');
  assert.equal(await page.evaluate(()=>generatedPlaytest.model.dungeon.name),'ランダム生成・エンジン試遊');
  assert.ok(await page.evaluate(()=>Boolean(generatedPlaytest.model.dungeon.floorArt?.url)));
  assert.ok(await page.locator('.dungeon-canvas').evaluate(canvas=>{
    const ctx=canvas.getContext('2d'),p=ctx.getImageData(0,0,canvas.width,canvas.height).data,colors=new Set();
    for(let i=0;i<p.length;i+=Math.max(4,Math.floor(p.length/3000/4)*4))colors.add(`${p[i]},${p[i+1]},${p[i+2]}`);
    return colors.size>30;
  }));
  const moved=await page.evaluate(()=>{
    const p=generatedPlaytest,loc={...p.engine.state.location},dirs=[['north',0,-1],['east',1,0],['south',0,1],['west',-1,0]];
    const found=dirs.find(([,dx,dy])=>p.engine.walkable(p.engine.map(),loc.x+dx,loc.y+dy));if(!found)return null;
    p.engine.state.location.facing=found[0];p.render();
    const ok=p.dispatch({type:'move',direction:'forward'});
    return {ok,before:loc,after:{...p.engine.state.location}};
  });
  assert.ok(moved?.ok);assert.notDeepEqual({x:moved.before.x,y:moved.before.y},{x:moved.after.x,y:moved.after.y});
  const blocked=await page.evaluate(()=>{
    const p=generatedPlaytest,map=p.engine.map(),legend=p.candidate.cells.legend,rows=p.candidate.cells.rows;
    const target=[];
    for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++)if(legend[rows[y][x]]==='deep_depression_water')target.push({x,y});
    const dirs=[['north',0,-1],['east',1,0],['south',0,1],['west',-1,0]];
    for(const t of target)for(const [facing,dx,dy] of dirs){const from={x:t.x-dx,y:t.y-dy};if(p.engine.walkable(map,from.x,from.y)){p.engine.teleport(map.id,from.x,from.y,facing);const before={...p.engine.state.location},ok=p.dispatch({type:'move',direction:'forward'});return {ok,before,after:{...p.engine.state.location}};}}
    return null;
  });
  assert.ok(blocked);assert.equal(blocked.ok,false);assert.deepEqual({x:blocked.before.x,y:blocked.before.y},{x:blocked.after.x,y:blocked.after.y});
  const poison=await page.evaluate(()=>{
    const p=generatedPlaytest,map=p.engine.map(),legend=p.candidate.cells.legend,rows=p.candidate.cells.rows,dirs=[['north',0,-1],['east',1,0],['south',0,1],['west',-1,0]];
    const targets=[];for(let y=0;y<rows.length;y++)for(let x=0;x<rows[y].length;x++)if(legend[rows[y][x]]==='poison_swamp')targets.push({x,y});
    for(const t of targets)for(const [facing,dx,dy] of dirs){const from={x:t.x-dx,y:t.y-dy};if(p.engine.walkable(map,from.x,from.y)){p.engine.teleport(map.id,from.x,from.y,facing);const hp=p.engine.state.members.map(id=>p.engine.state.actors[id].hp);const ok=p.dispatch({type:'move',direction:'forward'});return {ok,waiting:p.engine.state.waiting?.type??null,log:p.engine.state.log.slice(-6),beforeHp:hp,afterHp:p.engine.state.members.map(id=>p.engine.state.actors[id].hp)};}}
    return null;
  });
  assert.ok(poison?.ok);assert.ok(poison.waiting||poison.log.some(line=>line.includes('毒')));
  assert.ok(poison.afterHp.some((hp,i)=>hp<poison.beforeHp[i]));
  await page.screenshot({path:path.join(output,'generated-engine.png'),fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('GENERATED ENGINE PLAYTEST: actual GameEngine movement, cell passage, poison event, SceneView and textured dungeon canvas passed');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
