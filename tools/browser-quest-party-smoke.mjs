import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-quest-party-browser';await fs.mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ogg':'audio/ogg'};
const server=http.createServer(async(req,res)=>{try{const file=path.resolve(root,'.'+decodeURI(req.url.split('?')[0]));if(!file.startsWith(root+path.sep)){res.statusCode=403;res.end();return;}res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`,errors=[],checks=[];let browser;
try{
  browser=await chromium.launch({executablePath:process.env.ADV_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-gpu']});
  const page=await browser.newPage({viewport:{width:1280,height:900},acceptDownloads:true});page.setDefaultTimeout(20000);
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(origin+'/quest-party-playtest.html?edition=e1&quest=q101&start=site');await page.waitForFunction(()=>!document.querySelector('#launch').disabled);
  await page.evaluate(()=>localStorage.setItem('adv-normal-save-sentinel','preserve-this'));
  const choose=async id=>{
    for(let n=0;n<80;n++){
      const option=page.locator(`#app [data-focus="choice:${id}"]:visible`);if(await option.count()){await option.click();return;}
      const next=page.locator('#app [data-focus="message:next"]:visible');if(await next.count())await next.click();else await page.waitForTimeout(30);
    }throw Error(`choice did not appear: ${id}`);
  };
  const finish=async expected=>{
    for(let n=0;n<80;n++){
      const status=await page.evaluate(()=>questPlaytest.report().status);if(status!=='playing'){assert.equal(status,expected);return;}
      const next=page.locator('#app [data-focus="message:next"]:visible');if(await next.count())await next.click();else await page.waitForTimeout(30);
    }throw Error('ending did not finish');
  };
  for(const party of ['balanced','sustain']){
    await page.selectOption('#party',party);await page.click('#launch');await page.waitForFunction(()=>window.questPlaytest?.trial.engine.state.quests.q101.stage==='active');
    assert.equal(await page.evaluate(()=>questPlaytest.report().status),'playing');
    await choose('wish');await choose('listen');await choose('report');
    await finish('cleared');
    const report=await page.evaluate(()=>questPlaytest.report());assert.equal(report.config.party,party);assert.equal(report.config.level,1);assert.equal(report.outcome,'report');assert.ok(report.actions>0);assert.equal(report.rescues,0);
  }
  checks.push('real q101 choices reach the selected ending with two distinct level-one parties');
  await page.selectOption('#party','explore');await page.click('#launch');await choose('watch');await choose('quiet');await finish('other_outcome');
  assert.equal(await page.locator('#trial-history li').count(),3);checks.push('alternative ending stays distinct and completed trials persist for comparison');
  const downloadPromise=page.waitForEvent('download');await page.click('#export-trials');const download=await downloadPromise;await download.saveAs(path.join(output,'results.json'));const exported=JSON.parse(await fs.readFile(path.join(output,'results.json'),'utf8'));assert.equal(exported.history.length,3);assert.equal(exported.current.status,'other_outcome');assert.equal(await page.evaluate(()=>localStorage.getItem('adv-normal-save-sentinel')),'preserve-this');
  await page.click('#restart-trial');assert.equal(await page.evaluate(()=>questPlaytest.report().status),'playing');assert.equal(await page.evaluate(()=>questPlaytest.trial.engine.state.quests.q101.outcome),null);checks.push('JSON export and clean restart preserve the normal save namespace');
  await page.selectOption('#edition','e2');await page.waitForFunction(()=>document.querySelector('#quest').options.length===300&&!document.querySelector('#launch').disabled);await page.selectOption('#quest','q250');await page.selectOption('#party','sustain_il');await page.selectOption('#start','reception');await page.click('#launch');assert.ok(await page.evaluate(()=>questPlaytest.trial.engine.state.members.includes('il')));assert.equal(await page.evaluate(()=>questPlaytest.trial.engine.state.quests.q250.stage),'active');assert.ok(await page.evaluate(()=>questPlaytest.report().setup.prerequisites.includes('q249')));checks.push('edition switching and companion prerequisites keep the selected target active');
  await page.screenshot({path:path.join(output,'quest-party-desktop.png'),fullPage:true});
  await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'quest-party-mobile.png'),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert.ok(await page.locator('#launch').isVisible());
  const state=await page.evaluate(()=>questPlaytest.trial.engine.save());await page.focus('#seed');await page.keyboard.press('ArrowUp');assert.equal(await page.evaluate(()=>questPlaytest.trial.engine.save()),state);await page.selectOption('#effects','off');assert.equal(await page.evaluate(()=>questPlaytest.trial.engine.save()),state);checks.push('mobile controls fit and editing conditions/effects does not advance the run');
  await page.reload();await page.waitForFunction(()=>!document.querySelector('#launch').disabled);assert.equal(await page.locator('#trial-history li').count(),3);checks.push('comparison history survives reload without auto-launching or loading a normal save');
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'summary.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
}catch(e){const page=browser?.contexts()[0]?.pages()[0];if(page){await page.screenshot({path:path.join(output,'failure.png'),fullPage:true}).catch(()=>{});await fs.writeFile(path.join(output,'state.json'),JSON.stringify(await page.evaluate(()=>({status:document.querySelector('#trial-status')?.textContent,report:window.questPlaytest?.report(),waiting:window.questPlaytest?.trial.engine.state.waiting})).catch(()=>null),null,2));}await fs.writeFile(path.join(output,'failure.txt'),e.stack+'\n'+errors.join('\n'));throw e;}finally{await browser?.close();await new Promise(r=>server.close(r));}
