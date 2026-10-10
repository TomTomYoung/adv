// Retain a warm HTTP cache across releases, including transitive modules.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {prepareQuest,finishJourney} from '../tests/structure-routes.mjs';
import {drain} from '../tests/helpers.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-runtime-browser';
await fs.mkdir(output,{recursive:true});
const current=JSON.parse(await fs.readFile(path.join(root,'runtime.json'),'utf8'));
const hash=bytes=>'sha256-'+createHash('sha256').update(bytes).digest('base64');
const revisions={};
for(const label of ['old','new']){
  const overrides={
    'src/core/engine.js':await fs.readFile(path.join(root,'src/core/engine.js'),'utf8')+`\nglobalThis.runtimeProbe=${JSON.stringify(label)};\n`,
    'src/view/style.css':await fs.readFile(path.join(root,'src/view/style.css'),'utf8')+`\n:root{--runtime-probe:${label}}\n`
  };
  const q=JSON.parse(await fs.readFile(path.join(root,'data/quests/q001.json'),'utf8'));
  q.title+=` (${label})`;overrides['data/quests/q001.json']=JSON.stringify(q);
  const manifest=structuredClone(current);
  for(const [file,bytes] of Object.entries(overrides))manifest.files[file]=hash(bytes);
  manifest.revision=createHash('sha256').update(JSON.stringify(manifest.files)).digest('hex');
  revisions[label]={manifest,overrides};
}
const g=prepareQuest('q001');g.random=()=>.999999;
for(const id of ['talk','inspect','follow']){assert.ok(g.dispatch({type:'choose',id}));drain(g);finishJourney(g);}
assert.ok(g.dispatch({type:'choose',id:'support'}));
assert.ok(g.dispatch({type:'item',item:'torch',actor:'ada'}));drain(g);
while(g.state.location.facing!=='south')assert.ok(g.dispatch({type:'move',direction:'right'}));
// No unrelated random battle on the single cell before the forced event.
g.state.steps+=((g.data.system.encounterCheckSteps-g.state.steps%g.data.system.encounterCheckSteps)%g.data.system.encounterCheckSteps);
const saved=g.save(),requests=[],checks=[],errors=[];
let release='old',broken=null;
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ogg':'audio/ogg'};
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost'),file=url.pathname.replace(/^\/adv\//,'')||'index.html';
  requests.push({file,query:url.search,release});
  res.setHeader('Cache-Control','public, max-age=31536000, immutable');
  try{
    if(file==='runtime.json'){
      res.setHeader('Content-Type','application/json');
      if(broken==='manifest'){res.statusCode=503;res.end('unavailable');return;}
      res.end(JSON.stringify(revisions[release].manifest));return;
    }
    res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');
    if(broken===file){res.end(file.endsWith('.js')?'throw Error("stale module ran");':file.endsWith('.css')?':root{color:red}':'{}');return;}
    res.end(revisions[release].overrides[file]??await fs.readFile(path.join(root,file)));
  }catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try{
  browser=await chromium.launch({executablePath:process.env.ADV_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-gpu']});
  const origin=`http://127.0.0.1:${server.address().port}`,context=await browser.newContext();
  let page=await context.newPage();
  await page.goto(origin+'/adv/');
  await page.waitForSelector('.scene-stage');
  await page.evaluate(saved=>localStorage.setItem('lantern-archive:v1:auto',saved),saved);
  await page.reload();await page.waitForSelector('.movement-pad .forward');
  assert.equal(await page.evaluate(()=>runtimeProbe),'old');
  assert.ok((await page.locator('#app').innerText()).includes('(old)'));
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--runtime-probe').trim()),'old');
  assert.equal(await page.evaluate(()=>localStorage.getItem('lantern-archive:v1:auto')),saved);
  release='new';await page.reload();await page.waitForSelector('.movement-pad .forward');
  assert.equal(await page.evaluate(()=>runtimeProbe),'new','a nested import updates with the entry module');
  assert.ok((await page.locator('#app').innerText()).includes('(new)'),'JSON updates alongside the module graph');
  assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).getPropertyValue('--runtime-probe').trim()),'new');
  assert.equal(await page.evaluate(()=>localStorage.getItem('lantern-archive:v1:auto')),saved,'same-version autosave survives the update byte-for-byte');
  assert.equal(await page.evaluate(()=>advRuntime.manifest.revision),revisions.new.manifest.revision);
  const runtimeRequests=requests.filter(r=>r.file.startsWith('src/')&&!r.file.endsWith('bootstrap.js')||r.file.startsWith('data/'));
  assert.ok(runtimeRequests.every(r=>new URLSearchParams(r.query).get('v')===revisions[r.release].manifest.revision));
  assert.ok(new Set(requests.filter(r=>r.file==='runtime.json').map(r=>r.query)).size>=3,'each navigation rechecks distribution with a fresh URL');
  checks.push('warm-cache normal reload updates transitive JS, CSS and JSON without changing saves');
  console.log(checks.at(-1));
  await page.locator('.movement-pad .forward').click();await page.locator('.movement-pad .forward').click();
  const after=JSON.parse(await page.evaluate(()=>localStorage.getItem('lantern-archive:v1:auto')));
  assert.equal(after.state.stories.q001.scene,'outage');assert.equal(after.state.location.x,13);assert.equal(after.state.location.y,5);
  checks.push('after a warm-cache update, refuelling still enters the southern Q001 forced event');
  await page.screenshot({path:path.join(output,'updated-q001.png')});
  await context.close();
  // Fresh contexts prevent a cached good file concealing a partial deployment.
  for(const file of ['manifest','data/quests/q001.json','src/core/engine.js','src/view/style.css']){
    broken=file;const context=await browser.newContext();page=await context.newPage();
    await page.addInitScript(saved=>{localStorage.setItem('lantern-archive:v1:auto',saved);localStorage.setItem('lantern-archive:v1:slot1',saved);},saved);
    await page.goto(origin+'/adv/');await page.waitForSelector('[role="alert"]');
    assert.equal(await page.locator('.movement-pad').count(),0,'an incomplete release must not become playable');
    assert.equal(await page.evaluate(()=>localStorage.getItem('lantern-archive:v1:auto')),saved);
    assert.equal(await page.evaluate(()=>localStorage.getItem('lantern-archive:v1:slot1')),saved);
    if(file==='src/core/engine.js')assert.equal(await page.evaluate(()=>globalThis.runtimeProbe),undefined,'SRI prevents stale JS from executing');
    checks.push(`incomplete ${file} fails without overwriting saves`);
    console.log(checks.at(-1));
    broken=null;
    const retry=page.getByRole('button',{name:'もう一度読み込む'});
    if(await retry.count())await retry.click();else await page.reload();
    await page.waitForSelector('.movement-pad .forward',{timeout:10000});
    assert.equal(await page.evaluate(()=>localStorage.getItem('lantern-archive:v1:auto')),saved);
    checks.push(`completed ${file} recovers with the existing cache and save`);
    await context.close();
  }
  broken=null;
  const mobile=await browser.newContext({viewport:{width:390,height:844}});page=await mobile.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/adv/');await page.waitForSelector('.scene-stage');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(output,'mobile-start.png')});await mobile.close();
  assert.deepEqual(errors,[]);checks.push('390px actual entry loads without overflow or JavaScript errors');
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2)+'\n');console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
