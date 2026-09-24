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
 await page.goto(base+'config/index.html');await page.locator('#search').fill('q001');await page.locator('.config-card').waitFor();assert.equal(await page.locator('.config-card').count(),1);await page.locator('.config-card').click();await page.locator('.record-detail').waitFor();
 await page.locator('.record-buttons button').filter({hasText:'西の壁松明'}).click();
 await page.getByLabel('表示名',{exact:true}).fill('編集確認');
 await page.getByRole('button',{name:'配置',exact:true}).click();
 await page.getByRole('button',{name:'配置図で場所を選ぶ',exact:true}).first().click();
 await page.locator('[data-edge="2,2/north"]').click();
 await page.getByRole('button',{name:'変更を確認・JSONを出力',exact:true}).click();
 const output=page.getByLabel('config/quests/q001.events.json のJSON全文',{exact:true});await output.waitFor({state:'attached'});
 const original=JSON.parse(await fs.readFile(path.join(root,'config/quests/q001.events.json'),'utf8'));original.events[3].title='編集確認';original.events[3].points[0]={...original.events[3].points[0],x:2,y:2,edge:'north'};assert.deepEqual(JSON.parse(await output.inputValue()),original);
 await page.getByRole('button',{name:'このJSON全文をコピー',exact:true}).click();assert.deepEqual(JSON.parse(await page.evaluate(()=>navigator.clipboard.readText())),original);
 await page.screenshot({path:'/tmp/adv-studio-quest.png',fullPage:false});
 await page.getByRole('button',{name:'戻す',exact:true}).click();assert.equal(await page.locator('.review-panel').isVisible(),false);
 await page.getByLabel('編集するJSON',{exact:true}).selectOption('cell-layers.json');await page.getByRole('heading',{name:'セルの配置図',exact:true}).waitFor();
 await page.getByLabel('マップの操作',{exact:true}).selectOption('paint');await page.getByLabel('塗るセル種',{exact:true}).selectOption('stone_wall');await page.locator('[data-cell="1,1"]').click();
 await page.getByRole('button',{name:'変更を確認・JSONを出力',exact:true}).click();await page.getByLabel('config/cell-layers.json のJSON全文',{exact:true}).waitFor({state:'attached'});assert.equal(await page.locator('.review-panel .editor-section').count(),2);
 await page.getByLabel('編集するJSON',{exact:true}).selectOption('jobs.json');await page.getByRole('button',{name:'戦闘技能',exact:true}).click();await page.getByRole('button',{name:'消費・条件',exact:true}).click();await page.getByLabel('MP',{exact:true}).fill('7');
 await page.getByRole('button',{name:'効果',exact:true}).click();await page.screenshot({path:'/tmp/adv-studio-skill.png',fullPage:false});
 await page.getByRole('button',{name:'変更を確認・JSONを出力',exact:true}).click();await page.getByLabel('config/jobs.json のJSON全文',{exact:true}).waitFor({state:'attached'});assert.equal(await page.locator('.review-panel .editor-section').count(),3);
 await page.goto(base+'config/dungeons/kagaribi.html');await page.getByLabel('推奨レベル',{exact:true}).waitFor();
 for(const width of [1440,900,390,320]){await page.setViewportSize({width,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`viewport ${width}`);}
 await page.getByLabel('推奨レベル',{exact:true}).fill('-1');await page.getByRole('button',{name:'変更を確認・JSONを出力',exact:true}).click();await page.locator('.status.error').waitFor();assert.equal(await page.locator('.review-panel').isVisible(),false);
 await page.goto(base+'config/presentation.html');await page.getByRole('button',{name:'下書きの効果を再生',exact:true}).waitFor();await page.getByRole('button',{name:'下書きの効果を再生',exact:true}).click();assert.ok(await page.evaluate(()=>document.getAnimations().length)>0);
 await page.getByRole('button',{name:'音符の編集・試聴',exact:true}).click();await page.getByRole('button',{name:'下書きの音符を試聴',exact:true}).click();await page.waitForTimeout(100);assert.equal(await page.locator('.status.error').isVisible(),false);
 await page.goto(base+'config/dungeon-art.html');await page.locator('.atlas-choice').first().waitFor();assert.equal(await page.locator('.atlas-choice').count(),32);
 const art=JSON.parse(await fs.readFile(path.join(root,'config/dungeon-art.json'),'utf8'));art.entries[0].wall=(art.entries[0].wall+1)%16;await page.getByRole('button',{name:'壁素材 '+(art.entries[0].wall+1),exact:true}).click();await page.getByRole('button',{name:'変更を確認・JSONを出力',exact:true}).click();const artOutput=page.getByLabel('config/dungeon-art.json のJSON全文',{exact:true});await artOutput.waitFor({state:'attached'});assert.deepEqual(JSON.parse(await artOutput.inputValue()),art);
 assert.deepEqual(errors,[]);console.log('CONFIG BROWSER: subpath loading, semantic event/skill editing, edge placement, cell painting, three-file export, clipboard, undo, invalidation and 1440/900/390/320px widths, effect playback, sound synthesis and atlas picking passed');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
