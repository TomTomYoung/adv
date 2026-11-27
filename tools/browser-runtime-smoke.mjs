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
  await page.addInitScript(saved=>{if(!localStorage.getItem('lantern-archive:v1:auto'))localStorage.setItem('lantern-archive:v1:auto',saved);},saved);
  await page.goto(origin+'/adv/');
  await page.waitForSelector('.scene-stage');
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
  const after=JSON.parse(await page.evaluate(()=>JSON.parse(localStorage.getItem('lantern-archive:v1:scenario:saves')).editions.e1.auto));
  assert.equal(await page.evaluate(()=>localStorage.getItem('lantern-archive:v1:auto')),saved,'legacy raw save remains untouched after playing');
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
  await page.screenshot({path:path.join(output,'mobile-start.png')});
  await page.getByRole('button',{name:'遊び方',exact:true}).click();
  const [guide] = await Promise.all([
    mobile.waitForEvent('page'),
    page.getByRole('button',{name:'迷宮図鑑',exact:true}).click()
  ]);
  guide.on('pageerror',error=>errors.push(error.message));
  await guide.locator('#allies').waitFor();
  assert.deepEqual(await guide.getByRole('navigation',{name:'図鑑のページ'}).getByRole('link').allTextContents(), ['キャラ図鑑','魔物図鑑','魔物編成']);
  const allyCards = guide.locator('#ally-grid .guide-entry');
  assert.equal(await allyCards.count(),10);
  const columns = selector => guide.locator(selector).first().evaluate(node=>getComputedStyle(node).gridTemplateColumns.split(' ').length);
  assert.equal(await columns('#ally-grid'),2);
  const ada = allyCards.filter({has:guide.getByRole('link',{name:'アダ',exact:true})});
  const hp = await ada.locator('dd').first().innerText();
  await guide.locator('#level').fill('11');
  assert.notEqual(await ada.locator('dd').first().innerText(),hp);
  await guide.locator('#gear').selectOption('town');
  const stats = await ada.locator('dd').allTextContents();
  await ada.getByRole('link').click();
  await guide.locator('#sheet h3').waitFor();
  assert.deepEqual(await guide.locator('#sheet dd').evaluateAll(nodes=>nodes.map(node=>node.firstChild.textContent)), stats);
  await guide.locator('#allies-back').click();
  await guide.locator('#ally-grid').waitFor();
  assert.equal(await guide.locator('#level').inputValue(),'11');
  assert.equal(await guide.locator('#gear').inputValue(),'town');
  await guide.getByRole('link',{name:'魔物図鑑',exact:true}).click();
  await guide.locator('#monster-index').waitFor();
  const enemies = JSON.parse(await fs.readFile(path.join(root,'data/enemies.json'),'utf8'));
  assert.deepEqual((await guide.locator('#monster option').evaluateAll(opts=>opts.map(o=>o.value))).sort(), Object.keys(enemies).sort());
  const monsterCards = guide.locator('#monster-index .guide-entry:visible');
  assert.equal(await monsterCards.count(),Object.keys(enemies).length);
  assert.equal(await columns('#monster-index .guide-grid'),2);
  assert.equal(await guide.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const families = guide.getByRole('navigation',{name:'魔物の種別'});
  assert.deepEqual(await families.getByRole('link').allTextContents(),['すべて','ゴブリン','オーク','オーガ','スケルトン','スライム']);
  for (const [family,name] of Object.entries({goblin:'ゴブリン',orc:'オーク',ogre:'オーガ',skeleton:'スケルトン',slime:'スライム'})) {
    await families.getByRole('link',{name,exact:true}).click();
    await guide.waitForFunction(id => document.querySelector('.monster-families [aria-current=page]')?.dataset.family===id,family);
    assert.equal(await monsterCards.count(),family==='slime'?26:25);
    const ids = await monsterCards.locator('a').evaluateAll(nodes=>nodes.map(a=>a.hash.split('/').at(-1)));
    assert.deepEqual(ids.sort(),Object.keys(enemies).filter(id=>enemies[id].family===family).sort());
    assert.deepEqual(await guide.locator('#monster-index h3 small').allTextContents(),[family==='slime'?'6件':'5件',...Array(4).fill('5件')]);
    await monsterCards.first().getByRole('link').click();
    await guide.locator('#monster-sheet').waitFor();
    await guide.locator('#monsters-back').click();
    await guide.locator('#monster-index').waitFor();
    assert.equal(await guide.evaluate(()=>location.hash),'#monsters/'+family);
  }
  await families.getByRole('link',{name:'すべて',exact:true}).click();
  await guide.waitForFunction(total => document.querySelectorAll('#monster-index .guide-entry').length===total,Object.keys(enemies).length);
  for(const [id,actions,habits] of [
    ['kagaribi_soot_rat',['攻撃'],['煤煙']],
    ['garden_root_shell',['防御','攻撃'],['転がり甲羅']],
    ['slime_5_oil',['油玉の自爆','油まみれ体当たり'],['油膜','易燃体']],
    ['kagaribi_torch_prankster',['火遊び'],[]]
  ]){
    await guide.locator('#monster-index a[href="#monsters/' + id + '"]').click();
    const sheet=guide.locator('#monster-sheet');
    const moves=sheet.locator('.block').filter({has:guide.getByText('行動と使用条件',{exact:true})});
    const traits=sheet.locator('.block').filter({has:guide.getByText('習性',{exact:true})});
    for(const action of actions)await moves.getByText(action,{exact:true}).first().waitFor();
    if(id==='kagaribi_soot_rat'){
      assert.match(await traits.innerText(),/Lv5.*25%.*最大Lv3/);
      const levels=sheet.getByRole('region',{name:'レベル別の能力値と習性'});
      const rows=levels.locator('tbody tr');
      assert.deepEqual(await rows.locator('th').allTextContents(),['Lv1','Lv2','Lv3','Lv4','Lv5']);
      assert.deepEqual(await rows.locator('td:last-child').allTextContents(),['なし','なし','なし','なし','煤煙']);
      assert.equal(await rows.last().locator('td').first().textContent(),'53 (+8)');
      assert.equal(await guide.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    }
    if(id==='garden_root_shell')assert.match(await moves.innerText(),/受けるダメージを50%/);
    if(id==='slime_5_oil')assert.match(await moves.innerText(),/命中時100%で油状態Lv1/);
    for(const habit of habits){
      await traits.getByText(habit,{exact:true}).waitFor();
      assert.equal(await moves.getByText(habit,{exact:true}).count(),0);
    }
    if(!habits.length)await traits.getByText('なし',{exact:true}).waitFor();
    await guide.locator('#monsters-back').click();
    await guide.locator('#monster-index').waitFor();
  }
  const search = guide.getByRole('searchbox',{name:'名前で絞り込み'});
  await search.fill('該当なし');
  assert.ok(await guide.locator('#monster-empty').isVisible());
  await search.fill('蜜蝋ランプバチ');
  assert.equal(await monsterCards.count(),2);
  const bee = guide.locator('#monster-index a[href="#monsters/garden_nectar_bee"]');
  await bee.click();
  await guide.locator('#monster-sheet').waitFor();
  await guide.goBack();
  await guide.locator('#monster-index').waitFor();
  assert.equal(await monsterCards.count(),2);
  assert.equal(await search.inputValue(),'蜜蝋ランプバチ');
  await bee.click();
  await guide.waitForURL('**/labyrinth-guide.html#monsters/garden_nectar_bee');
  await guide.reload();
  await guide.locator('#monster-sheet h3').waitFor();
  assert.equal(await guide.locator('#monster').inputValue(),'garden_nectar_bee');
  assert.equal(await guide.locator('#monster-sheet h3').innerText(),enemies.garden_nectar_bee.name);
  assert.deepEqual(await guide.locator('#monster-sheet dd').allTextContents(),Object.values(enemies.garden_nectar_bee.stats).map(String));
  assert.equal(await guide.locator('#monster-sheet li').count(),enemies.garden_nectar_bee.ai.length);
  assert.equal(await guide.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await guide.getByRole('link',{name:'魔物編成',exact:true}).click();
  await guide.locator('#enemies').waitFor();
  const catalog = JSON.parse(await fs.readFile(path.join(root,'data/encounter-groups.json'),'utf8'));
  assert.equal(await guide.locator('.band').count(),await guide.locator('#band option').count()-1);
  for(const floor of [5,6,7,8,9,10]){
    await guide.locator('#band').selectOption(String(floor));
    assert.deepEqual(await guide.locator('.band-head small').allTextContents(),['地下'+floor+'階']);
    const additions=guide.locator('.group').filter({hasText:'この階で追加'});
    const profile=catalog.dungeons.shifting_labyrinth;
    const floorAdditions=Object.entries(profile.floors[floor]).filter(([id,weight])=>weight>0&&!profile.weights[id]);
    assert.equal(await additions.count(),floorAdditions.length);
    assert.equal(await additions.locator('.chance').first().isVisible(),true);
    const species=await guide.locator('.group .member').evaluateAll(links=>links.map(link=>link.hash.split('/').at(-1)));
    const families=new Set(species.map(id=>enemies[id].family).filter(f=>['goblin','orc','ogre'].includes(f)));
    assert.deepEqual([...families],[[5,6].includes(floor)?'goblin':floor<9?'orc':'ogre']);
    assert.ok(species.some(id=>enemies[id].family==='slime'));
  }
  await guide.locator('#band').selectOption('9');
  await guide.locator('#source').selectOption('common');
  assert.equal(await guide.locator('#band').inputValue(),'6');
  assert.equal(await guide.locator('.band-head h3').textContent(),'Lv6〜9');
  await guide.locator('#source').selectOption('dungeon');
  await guide.locator('#band').selectOption('3');
  const floorWeights = {...catalog.dungeons.shifting_labyrinth.weights, ...catalog.dungeons.shifting_labyrinth.floors[3]};
  const thirdFloor = catalog.bands.find(band => band.minLevel <= 3 && band.maxLevel >= 3);
  const weights = Object.keys(thirdFloor.groups).map(id => floorWeights[id]).filter(weight => weight > 0);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const percent = new Intl.NumberFormat('ja-JP',{style:'percent',maximumFractionDigits:1});
  assert.deepEqual(await guide.locator('.chance').allTextContents(),weights.map(weight => percent.format(weight/total)));
  assert.match(await guide.locator('#groups').innerText(),/火つけ小僧/);
  assert.match(await guide.locator('#groups').innerText(),/油虫/);
  await guide.getByRole('link',{name:'煤ネズミ ×5',exact:true}).click();
  await guide.locator('#monsters').waitFor();
  assert.equal(await guide.locator('#monster').inputValue(),'kagaribi_soot_rat');
  assert.equal(await guide.locator('#monster-sheet h3').innerText(),'煤ネズミ');
  await guide.goBack();
  await guide.locator('#enemies').waitFor();
  assert.equal(await guide.locator('#band').inputValue(),'3');
  await guide.locator('#source').selectOption('common');
  assert.equal(await guide.locator('.chance:visible').count(),0);
  await guide.locator('#nav-allies').click();
  await guide.getByRole('link',{name:'アダ',exact:true}).click();
  await guide.locator('#ally-detail').waitFor();
  await guide.locator('#gear').selectOption('auto');
  await guide.locator('#level').fill('3');
  await guide.waitForFunction(()=>document.querySelector('#sheet h3')?.textContent.includes('Lv3'));
  assert.match(await guide.locator('.kit').innerText(),/鉄の剣/);
  await guide.locator('#gear').selectOption('none');
  await guide.locator('#levels summary').click();
  await guide.waitForFunction(()=>document.querySelectorAll('#growth tbody tr').length===100);
  await guide.locator('#actor').selectOption('nio');
  await guide.locator('#job').selectOption('mage');
  await guide.locator('#level').fill('100');
  await guide.waitForFunction(()=>document.querySelector('#sheet h3')?.textContent.includes('Lv100'));
  assert.equal(await guide.locator('#growth tbody tr.picked th').innerText(),'100');
  assert.equal(await guide.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await guide.setViewportSize({width:1440,height:900});
  await guide.reload();
  await guide.locator('#allies').waitFor();
  assert.equal(await guide.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await guide.locator('#allies-back').click();
  await guide.locator('#ally-grid').waitFor();
  assert.ok(await columns('#ally-grid') >= 4);
  await guide.locator('#nav-monsters').click();
  await guide.locator('#monster-index').waitFor();
  assert.equal(await monsterCards.count(),Object.keys(enemies).length);
  assert.ok(await columns('#monster-index .guide-grid') >= 4);
  await guide.locator('#nav-enemies').click();
  await guide.locator('#enemies').waitFor();
  assert.equal(await columns('#groups'),2);
  checks.push('in-game guide: ordered catalogs, all monster IDs, monster links and history, floor odds, ally growth, equipment, jobs and both widths verified');
  await mobile.close();
  assert.deepEqual(errors,[]);checks.push('390px actual entry loads without overflow or JavaScript errors');
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2)+'\n');console.log(JSON.stringify({checks,errors},null,2));
}finally{await browser?.close();server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
