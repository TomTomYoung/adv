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
 await page.goto(base+'config/index.html');await page.locator('#search').fill('q001');await page.locator('.config-card').waitFor();assert.equal(await page.locator('.config-card').count(),1);await page.locator('.config-card').click();await page.getByRole('status').filter({hasText:'JSONを読み込みました'}).waitFor();
 await page.getByRole('button',{name:'詳細を開く',exact:true}).first().click();await page.getByRole('button',{name:'詳細を開く',exact:true}).first().click();await page.getByLabel('/events/0/title',{exact:true}).fill('編集確認');await page.getByRole('button',{name:'検証して全JSONを出力',exact:true}).click();const output=page.getByLabel('検証済みの全JSON',{exact:true});await output.waitFor();
 const original=JSON.parse(await fs.readFile(path.join(root,'config/quests/q001.events.json'),'utf8'));original.events[0].title='編集確認';assert.deepEqual(JSON.parse(await output.inputValue()),original);
 await page.getByRole('button',{name:'全JSONをコピー',exact:true}).click();assert.deepEqual(JSON.parse(await page.evaluate(()=>navigator.clipboard.readText())),original);
 await page.getByLabel('/events/0/title',{exact:true}).fill('変更後');assert.equal(await output.isVisible(),false);
 page.on('dialog',dialog=>dialog.accept());await page.goto(base+'config/dungeons/kagaribi.html');await page.getByLabel('/name',{exact:true}).waitFor();
 for(const width of [1280,390,320]){await page.setViewportSize({width,height:740});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`viewport ${width}`);}
 await page.getByLabel('/recommendedLevel',{exact:true}).fill('-1');await page.getByRole('button',{name:'検証して全JSONを出力',exact:true}).click();await page.locator('.status.error').waitFor();assert.equal(await page.getByLabel('検証済みの全JSON',{exact:true}).isVisible(),false);
 assert.deepEqual(errors,[]);console.log('CONFIG BROWSER: subpath loading, search, detail editing, validation, full JSON copy, invalidation and 1280/390/320px widths passed');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
