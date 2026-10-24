// Exercise edition selection and save isolation through the shipped entry point.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {processFieldEvents} from '../src/core/field-events.js';
import {prepareQuest,finishJourney} from '../tests/structure-routes.mjs';
import {drain} from '../tests/helpers.mjs';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-editions-browser';
const prefix='lantern-archive:v1:',registryKey=prefix+'scenario:saves';
await fs.mkdir(output,{recursive:true});
const first=prepareQuest('q001');first.random=()=>.999999;
for(const id of ['talk','inspect','follow','support']){assert.ok(first.dispatch({type:'choose',id}));drain(first);finishJourney(first);}
assert.ok(first.state.battle,'fixture interrupts the actual compulsory rescue battle');
const firstSave=first.save(),legacy=JSON.parse(firstSave);delete legacy.scenarioEdition;delete legacy.state.scenarioEdition;
const legacySave=JSON.stringify(legacy);
const secondData=await loadContent(file=>fs.readFile(path.join(root,file),'utf8').then(JSON.parse),{edition:'e2'});
const second=new GameEngine(secondData,83);drain(second);assert.ok(second.accept('q001'));assert.ok(second.dispatch({type:'travel',dungeon:'kagaribi'}));
second.teleport('kagaribi_f1',2,1);processFieldEvents(second);drain(second);
assert.equal(second.state.stories.q001.scene,'entry');assert.equal(second.state.waiting.type,'choice');
const secondSave=second.save();

const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.ogg':'audio/ogg','.otf':'font/otf'};
let breakSecond=false;
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost'),file=url.pathname.replace(/^\/adv\//,'')||'index.html';
  try{
    if(breakSecond&&file==='data/scenario-editions/e2/q001.json'){res.statusCode=503;res.end('not ready');return;}
    const local=file==='__font.otf'&&process.env.ADV_BROWSER_FONT?process.env.ADV_BROWSER_FONT:path.join(root,file);
    res.setHeader('Content-Type',types[path.extname(local)]??'application/octet-stream');res.end(await fs.readFile(local));
  }catch{res.statusCode=404;res.end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`,checks=[],errors=[];
let browser,activePage;
try{
  browser=await chromium.launch({executablePath:process.env.ADV_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-gpu']});
  async function openPage({legacy=false,autosave=null,viewport={width:1382,height:844}}={}){
    const context=await browser.newContext({viewport});const page=await context.newPage();activePage=page;page.setDefaultTimeout(15000);
    page.on('pageerror',error=>errors.push(error.message));
    if(legacy)await page.addInitScript(({prefix,save})=>{
      if(!localStorage.getItem(prefix+'auto'))localStorage.setItem(prefix+'auto',save);
      if(!localStorage.getItem(prefix+'slot1'))localStorage.setItem(prefix+'slot1',save);
    },{prefix,save:legacySave});
    else if(autosave!==null)await page.addInitScript(({prefix,save})=>localStorage.setItem(prefix+'auto',save),{prefix,save:autosave});
    await page.goto(origin+'/adv/');await page.waitForSelector('.scene-stage');
    if(process.env.ADV_BROWSER_FONT)await page.addStyleTag({content:'@font-face{font-family:EditionTestJapanese;src:url(/adv/__font.otf)}body{font-family:EditionTestJapanese,sans-serif!important}html{--story-font:EditionTestJapanese,sans-serif!important}'});
    return {context,page};
  }
  const registry=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),registryKey);
  const rawRegistry=page=>page.evaluate(key=>localStorage.getItem(key),registryKey);
  async function menu(page){if(!await page.locator('#system-dialog').evaluate(e=>e.open))await page.getByRole('button',{name:'記録',exact:true}).click();await page.locator('#scenario-edition-current').waitFor();}
  async function chooseEdition(page,edition){
    await menu(page);await page.locator('[data-focus="select:シナリオ版"]').click();
    await page.locator(`.button-picker button[data-value="${edition}"]`).click();
  }
  async function waitEdition(page,edition){
    await page.waitForFunction(({key,edition})=>JSON.parse(localStorage.getItem(key))?.active===edition,{key:registryKey,edition});
    await page.waitForFunction(()=>!document.querySelector('#system-dialog button')?.disabled);
    assert.equal(await page.locator('#scenario-edition-current').innerText(),`現在プレイ中：${edition==='e1'?'初版':'第2版'}`);
  }
  async function importSave(page,text){
    await menu(page);await page.getByLabel('記録ファイルを読み込む',{exact:true}).setInputFiles({name:'test-save.json',mimeType:'application/json',buffer:Buffer.from(text)});
  }
  async function saveSlot(page){await menu(page);await page.locator('[data-control-group="save:1"]').getByRole('button',{name:'ここへ保存'}).click();}

  // A clean browser follows latest, while existing games retain their own edition.
  let {context,page}=await openPage();
  let store=await registry(page);assert.equal(store.active,'e2');assert.equal(store.preference,'latest');assert.equal(JSON.parse(store.editions.e2.auto).scenarioEdition,'e2');
  await menu(page);assert.match(await page.locator('#scenario-edition-current').innerText(),/第2版/);
  checks.push('new users start the latest edition and see the concrete edition in settings');
  await page.screenshot({path:path.join(output,'latest-settings.png')});await context.close();

  ({context,page}=await openPage({legacy:true}));
  store=await registry(page);assert.equal(store.active,'e1');assert.equal(store.preference,'latest');assert.equal(store.editions.e1.auto,legacySave);
  await menu(page);assert.match(await page.locator('#scenario-edition-current').innerText(),/初版/);
  await saveSlot(page);const firstSlot=(await registry(page)).editions.e1.slot1;
  assert.equal(JSON.parse(firstSlot).state.stories.q001.scene,'outage');assert.ok(JSON.parse(firstSlot).state.battle);
  await page.getByRole('button',{name:'この版で再開',exact:true}).click();await waitEdition(page,'e2');
  assert.equal((await registry(page)).editions.e1.slot1,firstSlot);
  checks.push('legacy dialogue and battle saves stay in e1; the already-selected latest option can start e2');

  await importSave(page,secondSave);await page.waitForFunction(()=>!document.querySelector('#system-dialog').open);
  const signal=page.getByRole('button',{name:/呼びかけたら答えてほしい/});await signal.waitFor();
  await signal.click();
  for(let n=0;n<6&&!JSON.parse((await registry(page)).editions.e2.auto).state.stories.q001.values.signalAgreed;n++)await page.locator('[data-focus="message:next"]').click();
  assert.equal(JSON.parse((await registry(page)).editions.e2.auto).state.stories.q001.values.signalAgreed,true);
  await saveSlot(page);const secondSlot=(await registry(page)).editions.e2.slot1;
  assert.equal(JSON.parse(secondSlot).state.stories.q001.values.signalAgreed,true);
  assert.equal((await registry(page)).editions.e1.slot1,firstSlot);
  await page.screenshot({path:path.join(output,'edition-two-q001.png')});
  await chooseEdition(page,'e1');await waitEdition(page,'e1');
  assert.deepEqual(JSON.parse((await registry(page)).editions.e1.auto).state,JSON.parse(firstSlot).state);
  await chooseEdition(page,'e2');await waitEdition(page,'e2');
  assert.deepEqual(JSON.parse((await registry(page)).editions.e2.auto).state,JSON.parse(secondSlot).state);
  await page.reload();await page.waitForSelector('.scene-stage');await menu(page);
  assert.equal((await registry(page)).active,'e2');assert.deepEqual(JSON.parse((await registry(page)).editions.e2.auto).state,JSON.parse(secondSlot).state);
  checks.push('both editions keep separate slot 1 and exact narrative/battle continuations across switching and reload');

  const beforeBad=await rawRegistry(page);
  await importSave(page,'{"broken":true}');await page.waitForFunction(()=>document.querySelector('#system-status').textContent.includes('完了できません'));
  assert.equal(await rawRegistry(page),beforeBad);assert.match(await page.locator('#scenario-edition-current').innerText(),/第2版/);
  const unknown=JSON.parse(firstSave);unknown.scenarioEdition='e99';unknown.state.scenarioEdition='e99';
  await importSave(page,JSON.stringify(unknown));await page.waitForFunction(()=>document.querySelector('#system-status').textContent.includes('完了できません'));
  assert.equal(await rawRegistry(page),beforeBad);
  checks.push('malformed and unsupported-edition imports preserve all saved bytes and the active edition');

  await importSave(page,legacySave);await page.waitForFunction(()=>!document.querySelector('#system-dialog').open);await menu(page);
  store=await registry(page);assert.equal(store.active,'e1');assert.equal(store.editions.e2.slot1,secondSlot);assert.equal(store.editions.e2.auto,JSON.parse(beforeBad).editions.e2.auto);
  const downloadEvent=page.waitForEvent('download');await page.getByRole('button',{name:'記録ファイルを書き出す'}).click();const download=await downloadEvent;
  assert.equal(download.suggestedFilename(),'lantern-archive-e1-save.json');const downloaded=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.equal(downloaded.scenarioEdition,'e1');assert.ok(downloaded.state.battle);
  checks.push('legacy file import selects e1, preserves e2, and exports a concrete edition with battle continuation');

  await page.evaluate(key=>{
    const original=Storage.prototype.setItem;window.restoreTestStorage=()=>{Storage.prototype.setItem=original;};
    Storage.prototype.setItem=function(name,value){if(name===key)throw new DOMException('test quota','QuotaExceededError');return original.call(this,name,value);};
  },registryKey);
  const beforeQuota=await rawRegistry(page);await chooseEdition(page,'e2');await page.waitForFunction(()=>document.querySelector('#system-status').textContent.includes('保存できません'));
  assert.equal(await rawRegistry(page),beforeQuota);assert.match(await page.locator('#scenario-edition-current').innerText(),/初版/);
  await page.evaluate(()=>window.restoreTestStorage());
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),prefix+'auto'),legacySave);
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),prefix+'slot1'),legacySave);
  checks.push('quota failure rolls back the switch and leaves legacy auto/slot source records untouched');
  await context.close();

  // A missing selected-edition file must never become a fresh playable save.
  ({context,page}=await openPage({legacy:true}));await menu(page);const beforeFetch=await rawRegistry(page);breakSecond=true;
  await page.getByRole('button',{name:'この版で再開',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#system-status').textContent.includes('完了できません'));
  assert.equal(await rawRegistry(page),beforeFetch);assert.match(await page.locator('#scenario-edition-current').innerText(),/初版/);
  breakSecond=false;await page.getByRole('button',{name:'この版で再開',exact:true}).click();await waitEdition(page,'e2');
  checks.push('missing edition content fails without overwriting saves and a retry succeeds');await context.close();

  const damaged='{"broken":true}\n  ';
  ({context,page}=await openPage({autosave:damaged}));await menu(page);
  const protectedBefore=await rawRegistry(page),protectedDownloadEvent=page.waitForEvent('download');
  await page.getByRole('button',{name:'保護中の記録を書き出す',exact:true}).click();const protectedDownload=await protectedDownloadEvent;
  assert.equal(protectedDownload.suggestedFilename(),'lantern-archive-e1-protected-save.json');
  assert.equal(await fs.readFile(await protectedDownload.path(),'utf8'),damaged,'recovery exports the original bytes, never the temporary fresh engine');
  assert.equal(await page.evaluate(key=>localStorage.getItem(key),prefix+'auto'),damaged);assert.equal(await rawRegistry(page),protectedBefore);
  checks.push('unreadable startup saves can be exported byte-for-byte while remaining protected');await context.close();

  ({context,page}=await openPage({viewport:{width:390,height:844}}));await menu(page);
  await page.locator('[data-focus="select:シナリオ版"]').click();
  const geometry=await page.locator('.button-picker').evaluate(element=>{const r=element.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:innerWidth,height:innerHeight};});
  assert.ok(geometry.left>=0&&geometry.right<=geometry.width+1&&geometry.top>=0&&geometry.bottom<=geometry.height+1,JSON.stringify(geometry));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.screenshot({path:path.join(output,'mobile-edition-picker.png')});
  await page.locator('.button-picker button[data-value="e1"]').click();await waitEdition(page,'e1');
  checks.push('390px edition picker is readable, contained in the viewport and operable');await context.close();

  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2)+'\n');console.log(JSON.stringify({checks,errors},null,2));
}catch(error){
  if(activePage&&!activePage.isClosed()){
    await activePage.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
    const diagnostic=await activePage.evaluate(key=>({text:document.body.innerText,registry:localStorage.getItem(key)}),registryKey).catch(()=>null);
    await fs.writeFile(path.join(output,'failure.json'),JSON.stringify({message:error.message,checks,diagnostic},null,2));
  }
  throw error;
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
