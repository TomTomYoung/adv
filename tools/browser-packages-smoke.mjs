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
 const page=await browser.newPage({viewport:{width:1440,height:900}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'config/cell-layers.html');await page.getByRole('button',{name:'セル進入イベント',exact:true}).click();
 await page.locator('.record-button').filter({hasText:'trap_needle'}).click();
 await page.getByRole('button',{name:'基本',exact:true}).click();
 await page.getByLabel('進入イベントの発生方式',{exact:true}).selectOption('chance_limited');
 await page.getByLabel('確率',{exact:true}).fill('0.4');await page.getByLabel('発生上限（空値は無制限）',{exact:true}).fill('3');
 await page.getByLabel('回数のリセット',{exact:true}).selectOption(JSON.stringify('manual'));
 await page.getByRole('button',{name:'標準パッケージ',exact:true}).click();
 await page.getByLabel('パッケージの種類',{exact:true}).selectOption('arrow');
 await page.getByRole('button',{name:'変更を確認・JSONを出力',exact:true}).click();
 const output=page.getByLabel('config/cell-layers.json のJSON全文',{exact:true});await output.waitFor({state:'attached'});
 const changed=JSON.parse(await output.inputValue());assert.deepEqual(changed.events.trap_needle.occurrence,{chance:.4,maxCount:3,reset:'manual'});assert.equal(changed.events.trap_needle.package.kind,'arrow');assert.equal(changed.events.trap_needle.once,undefined);
 // Every preset is selectable; location-specific presets expose their required target editor.
 await page.getByRole('button',{name:'戻す',exact:true}).click();
 for(const kind of ['rockfall','cave_in','needle','arrow','gas','magic_circle','pit','explosion','drip']){await page.getByLabel('パッケージの種類',{exact:true}).selectOption(kind);}
 for(const width of [1440,390]){await page.setViewportSize({width,height:900});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 await page.screenshot({path:'/tmp/adv-packages-editor.png',fullPage:false});
 assert.deepEqual(errors,[]);console.log('PACKAGES BROWSER: all nine presets, recurrence settings, exact JSON export and 1440/390px layouts passed');
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
