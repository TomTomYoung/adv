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
 await page.setViewportSize({width:1082,height:604});
 await page.goto(base+'config/index.html');await page.getByRole('link',{name:'マップ編集',exact:false}).click();await page.getByLabel('編集する迷宮',{exact:true}).selectOption('kagaribi');await page.getByLabel('編集するマップ',{exact:true}).selectOption('kagaribi_f1');
 assert.equal(await page.getByLabel('表示マップ',{exact:true}).count(),0,'only the heading selects the map');
 const grid=await page.locator('.map-grid').boundingBox();assert.ok(grid.y<300&&grid.width>=350,'map is visible and usable at screenshot size');
 const firstCell=await page.locator('[data-cell="1,1"]').boundingBox();assert.ok(firstCell.y+firstCell.height<604,'cells are visible without scrolling');
 assert.equal(await page.locator('.record-preview').evaluate(e=>getComputedStyle(e).overflowY),'visible','no second map scrollbar');
 await page.screenshot({path:'/tmp/adv-map-layout-1082.png',fullPage:false});
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('[data-cell="1,1"]').click();await page.getByRole('button',{name:'この地点だけの設定を作る',exact:true}).click();await page.getByRole('button',{name:'共有セル種を編集',exact:true}).click();await page.getByRole('button',{name:'選択地点だけの編集に戻る',exact:true}).click();
 await page.locator('.map-outline>summary').click();await page.locator('.record-list button').filter({hasText:'西の壁松明'}).click();await page.getByLabel('表示名',{exact:true}).fill('統合画面の壁灯');assert.equal(await page.getByLabel('編集するマップ',{exact:true}).inputValue(),'kagaribi_f1');
 await page.getByRole('button',{name:'配置',exact:true}).click();await page.getByRole('button',{name:'配置図で場所を選ぶ',exact:true}).first().click();await page.locator('[data-edge="2,2/north"]').click();
 await page.getByRole('button',{name:'変更を確認・JSONを出力',exact:true}).click();await page.getByLabel('config/quests/q001.events.json のJSON全文',{exact:true}).waitFor({state:'attached'});assert.equal(await page.locator('.review-panel .editor-section').count(),2);
 await page.getByRole('button',{name:'マップ間の接続',exact:true}).click();await page.getByRole('button',{name:'接続を追加',exact:true}).first().click();await page.locator('.record-preview .editor-section').first().locator('[data-cell="1,2"]').click();
 await page.getByRole('button',{name:'接続先のマップを作成',exact:true}).click();await page.getByLabel('新しいマップ名',{exact:true}).fill('新しい接続先');await page.getByRole('button',{name:'この内容で作成',exact:true}).click();await page.locator('.record-preview .editor-section').nth(1).getByRole('group',{name:'新しい接続先',exact:true}).waitFor();await page.locator('.record-preview .editor-section').nth(1).locator('[data-cell="1,1"]').click();
 await page.getByRole('button',{name:'接続を下書きに反映',exact:true}).click();await page.getByRole('button',{name:'変更を確認・JSONを出力',exact:true}).click();await page.getByLabel('config/dungeons/kagaribi.json のJSON全文',{exact:true}).waitFor({state:'attached'});assert.equal(await page.locator('.review-panel .editor-section').count(),4);
 await page.getByRole('button',{name:'このJSON全文をコピー',exact:true}).first().click();assert.ok(JSON.parse(await page.evaluate(()=>navigator.clipboard.readText())));
 await page.getByRole('button',{name:'地形',exact:true}).click();await page.getByLabel('編集するマップ',{exact:true}).selectOption({label:'新しい接続先'});await page.locator('[data-cell="2,2"]').click();
 for(const width of [1440,900,390,320]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`viewport ${width}`);}
 await page.locator('.map-scroll').evaluate(e=>{e.scrollLeft=60;e.dispatchEvent(new Event('scroll'));});
 await page.getByLabel('塗るセル種',{exact:true}).selectOption('wood_floor');assert.equal(await page.locator('.map-scroll').evaluate(e=>e.scrollLeft),60,'redrawing keeps the inspected part of a wide map');
 await page.screenshot({path:'/tmp/adv-map-layout-320.png',fullPage:false});
 await page.setViewportSize({width:1440,height:1000});await page.screenshot({path:'/tmp/adv-map-studio.png',fullPage:false});
 await page.getByRole('button',{name:'戻す',exact:true}).click();await page.getByRole('button',{name:'戻す',exact:true}).click();assert.equal(await page.getByLabel('編集するマップ',{exact:true}).inputValue(),'kagaribi_f1');
 assert.deepEqual(errors,[]);console.log('MAP BROWSER: unified sources, cell scope, connections, destination creation, export, undo and responsive widths passed');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
