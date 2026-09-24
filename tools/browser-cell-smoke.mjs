// Optional real-browser checks: Playwright + Chromium, no GitHub credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(import.meta.dirname,'..'),types={'.html':'text/html','.js':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/adv/'))throw Error('path');const file=path.resolve(root,decodeURIComponent(url.pathname.slice(5)));if(!file.startsWith(root+path.sep))throw Error('path');res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}/adv/`;let browser;
try{
 browser=await chromium.launch({executablePath:process.env.ADV_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox']});
 const context=await browser.newContext({permissions:['clipboard-read','clipboard-write']}),page=await context.newPage(),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))errors.push(r.url());});
 page.on('dialog',dialog=>dialog.accept());
 await page.setViewportSize({width:1440,height:1000});
 await page.goto(base+'config/map.html?dungeon=kagaribi');await page.getByLabel('塗るセル種',{exact:true}).waitFor();assert.equal(await page.getByLabel('塗るセル種',{exact:true}).locator('option').count(),24);
 await page.getByLabel('マップの操作',{exact:true}).selectOption('paint');await page.getByLabel('塗るセル種',{exact:true}).selectOption('poison_swamp');await page.locator('[data-cell="2,1"]').click();assert.equal(await page.locator('[data-cell="2,1"]').evaluate(e=>e.parentElement.dataset.surface),'poison');
 await page.getByRole('button',{name:'変更を確認・JSONを出力',exact:true}).click();const out=page.getByLabel('config/cell-layers.json のJSON全文',{exact:true});await out.waitFor({state:'attached'});const saved=JSON.parse(await out.inputValue());assert.equal(saved.maps.kagaribi_f1.legend[saved.maps.kagaribi_f1.rows[1][2]],'poison_swamp');assert.equal(saved.events.poison_step.script,'cell.poison_step');
 await page.getByLabel('マップの操作',{exact:true}).selectOption('inspect');await page.locator('[data-cell="2,1"]').click();await page.getByRole('button',{name:'セル進入イベントを編集：毒沼への進入',exact:true}).click();await page.getByRole('button',{name:'会話・選択肢・消費・報酬を編集',exact:true}).click();await page.locator('.record-detail').getByText('毒の沼地を踏んだ。',{exact:false}).first().waitFor({state:'attached'});
 await page.getByRole('button',{name:'地形',exact:true}).click();await page.getByLabel('マップの操作',{exact:true}).selectOption('paint');await page.getByLabel('塗るセル種',{exact:true}).selectOption('salt_wall');await page.locator('[data-cell="3,1"]').click();await page.locator('.status.error').waitFor();assert.match(await page.locator('.status.error').innerText(),/対象地点/);
 await page.getByLabel('塗るセル種',{exact:true}).selectOption('ice_floor');await page.locator('[data-cell="3,1"]').click();await page.getByLabel('塗るセル種',{exact:true}).selectOption('wood_floor');await page.locator('[data-cell="4,1"]').click();await page.getByLabel('塗るセル種',{exact:true}).selectOption('earth_floor');await page.locator('[data-cell="5,1"]').click();
 await page.screenshot({path:'/tmp/adv-cell-editor.png',fullPage:false});for(const width of [900,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 await page.goto(base+'index.html');await page.setViewportSize({width:1000,height:600});
 await page.evaluate(async()=>{const {loadContent}=await import('./src/core/loader.js'),{GameEngine}=await import('./src/core/engine.js'),{projectGame}=await import('./src/application/projection.js'),{paintDungeon}=await import('./src/view/dungeon.js');const data=await loadContent(),g=new GameEngine(data);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});data.maps.region_2_f1.objects=[];g.teleport('region_2_f1',1,1,'east');const m=g.map();for(const [i,id] of ['wood_floor','earth_floor','ice_floor','poison_swamp'].entries())m.cells.overrides[`${i+2},1`]=structuredClone(data.cellTypes[id]);const canvas=document.createElement('canvas');canvas.id='cell-game-preview';canvas.style.width='100%';document.body.replaceChildren(canvas);paintDungeon(canvas,projectGame(g).dungeon,null);});
 await page.waitForTimeout(400);assert.ok(await page.locator('#cell-game-preview').evaluate(canvas=>{const p=canvas.getContext('2d').getImageData(0,240,800,120).data,colors=new Set();for(let i=0;i<p.length;i+=4)colors.add(`${p[i]},${p[i+1]},${p[i+2]}`);return colors.size>100;}));await page.screenshot({path:'/tmp/adv-cell-game.png',fullPage:false});
 assert.deepEqual(errors,[]);console.log('CELL BROWSER: 24 named brushes, material previews, poison placement / script / JSON export, invalid system binding rejection, responsive widths and actual game canvas rendering passed');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
