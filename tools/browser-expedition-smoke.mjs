// Exercise the shared camp/shop/checkpoint controls in both real renderers.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-expedition-browser';
await fs.mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const shell='<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="src/view/style.css"><link rel="stylesheet" href="src/view/scene-style.css"><div id="app"></div></html>';
const server=http.createServer(async(req,res)=>{try{const url=decodeURI(req.url.split('?')[0]);if(url==='/'){res.setHeader('Content-Type','text/html');res.end(shell);return;}const file=path.join(root,url);res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[];
async function openCamp(page,name){
 await page.getByRole('button',{name:'任意調べる',exact:true}).click();await page.getByRole('button',{name,exact:true}).click();
 for(let n=0;await page.evaluate(()=>typeof view.canChoose==='function'&&!view.canChoose());n++){assert.ok(n<10);await page.getByRole('button',{name:/^次のページ/}).click();}
}
async function finishText(page){
 for(let n=0;await page.evaluate(()=>g.state.waiting?.type==='text'||g.state.waiting?.command==='result');n++){assert.ok(n<30);await page.getByRole('button',{name:/^(次のページ|続きを読む)/}).click();}
}
try{
 browser=await chromium.launch({executablePath:process.env.ADV_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-gpu']});
 for(const layout of ['scene','classic'])for(const width of [1280,390]){
  const page=await browser.newPage({viewport:{width,height:844}});page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000);
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async layout=>{
   const {loadContent}=await import('./src/core/loader.js'),{GameEngine}=await import('./src/core/engine.js'),{projectGame}=await import('./src/application/projection.js'),{replaceView}=await import('./src/view/view-layout.js');
   const data=await loadContent();delete data.quests.q001.story;window.g=new GameEngine(data);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});g.accept('q001');g.complete('q001','informed');g.state.flags.kagaribi={kilnGate:true};g.teleport('kagaribi_relay',1,1,'east');
   g.dispatch({type:'expedition.action',camp:'kagaribi_relay',action:'repair'});g.dispatch({type:'expedition.action',camp:'kagaribi_relay',action:'relay'});g.returnTown();g.state.expedition.gems=120;g.dispatch({type:'location.move',id:'hikarigaeri_shop'});g.give('iron_sword',1);g.dispatch({type:'equip',actor:'ada',item:'iron_sword'});
   window.show=()=>view.render(projectGame(g));window.refreshView=()=>{window.view=replaceView(window.view??null,layout,document.querySelector('#app'),intent=>{const ok=g.dispatch(intent);show();return ok;},{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});show();};refreshView();view.tab='shop';show();
  },layout);
  const card=page.locator('.skill-shop-card').filter({has:page.getByRole('heading',{name:'横列払い',exact:true})});await card.getByRole('button',{name:/Lv1を習得/}).click();
  assert.equal(await page.evaluate(()=>g.state.expedition.learned.ada.exp_row_sweep),1);
  await page.screenshot({path:path.join(output,`shop-${layout}-${width}.png`)});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'shop horizontal overflow');
  await page.evaluate(()=>{g.dispatch({type:'location.move',id:g.data.game.world.townRoot});show();view.tab='regions';show();});
  await page.getByRole('button',{name:'7F 中継篝火の補給営から再開',exact:true}).click();assert.equal(await page.evaluate(()=>g.state.location.map),'kagaribi_relay');
  await page.getByRole('button',{name:'任意調べる',exact:true}).click();await page.getByRole('button',{name:'7F 中継篝火の補給営',exact:true}).click();
  // Narrow scene windows paginate the equipment description before showing choices.
  for(let n=0;await page.evaluate(()=>typeof view.canChoose==='function'&&!view.canChoose());n++){
   assert.ok(n<10,'camp description reaches its choices');await page.getByRole('button',{name:/^次のページ/}).click();
  }
  await page.getByRole('button',{name:/^油を容量いっぱい汲む/}).waitFor();
  await page.screenshot({path:path.join(output,`camp-${layout}-${width}.png`)});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'camp horizontal overflow');
  await page.getByRole('button',{name:'対象一覧へ戻る',exact:true}).click();await page.getByRole('button',{name:'離れる',exact:true}).click();
  // New 3F has a visible supply-only camp, with no unusable relay choice.
  await page.evaluate(()=>{g.teleport('kagaribi_manifold',7,5,'east');g.give('rope',2);refreshView();});
  await openCamp(page,'3F 配油分岐室の給油管');
  assert.equal(await page.getByRole('button',{name:/^中継設備を起動/}).count(),0);
  await page.getByRole('button',{name:/^給油設備を修理/}).click();assert.equal(await page.evaluate(()=>g.state.expedition.camps.kagaribi_manifold.supply),true);
  await finishText(page);
  await page.screenshot({path:path.join(output,`manifold-${layout}-${width}.png`)});
  // The victory flag is supplied here; actual battle completion is covered in Core.
  await page.evaluate(()=>{g.state.flags.kagaribi.altarGuardianWon=true;g.teleport('kagaribi_f3',3,1,'east');refreshView();});
  await openCamp(page,'10F 中央中継所');
  await page.getByRole('button',{name:/^給油設備を修理/}).click();
  await finishText(page);await openCamp(page,'10F 中央中継所');
  await page.getByRole('button',{name:/^中継設備を起動/}).click();assert.equal(await page.evaluate(()=>g.state.expedition.camps.kagaribi_central.relay),true);
  await finishText(page);
  await page.screenshot({path:path.join(output,`central-${layout}-${width}.png`)});
  await page.evaluate(()=>{g.returnTown();g.dispatch({type:'location.move',id:'hikarigaeri_shop'});g.give('exp_t2_ticket',1);refreshView();});
  await page.getByRole('button',{name:/第2段階の武器を引き換える/}).click();
  await page.evaluate(()=>{while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});show();});
  for(let n=0;await page.evaluate(()=>typeof view.canChoose==='function'&&!view.canChoose());n++){assert.ok(n<10);await page.getByRole('button',{name:/^次のページ/}).click();}
  await page.screenshot({path:path.join(output,`weapon-${layout}-${width}.png`)});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'weapon choices horizontal overflow');
  await page.getByRole('button',{name:/水切り剣/}).click();assert.equal(await page.evaluate(()=>g.state.inventory.exp_t2_sword),1);assert.equal(await page.evaluate(()=>g.state.inventory.exp_t2_ticket),0);
  await finishText(page);
  // Separate UI fixture for the three new lessons; earned spending is measured
  // by the campaign suite, not by these supplied gems or victory flags.
  await page.evaluate(()=>{g.state.expedition.gems=2000;g.give('rope',1);g.teleport('kagaribi_crossroads',1,1,'east');g.dispatch({type:'expedition.action',camp:'kagaribi_crossroads',action:'repair'});g.returnTown();g.dispatch({type:'location.move',id:'hikarigaeri_shop'});refreshView();view.tab='shop';view.skillShopActor='ada';show();});
  const lesson=name=>page.locator('.skill-shop-card').filter({has:page.getByRole('heading',{name,exact:true})});
  await lesson('再起の呼吸').getByRole('button',{name:/Lv1を習得/}).click();
  assert.equal(await page.evaluate(()=>g.state.expedition.learned.ada.exp_second_breath),1);
  await page.evaluate(()=>{view.skillShopActor='sera';show();});
  assert.equal(await lesson('祓いの追撃').getByRole('button').isDisabled(),true);
  assert.match(await lesson('祓いの追撃').textContent(),/9F/);
  await page.evaluate(()=>{g.give('rope',1);g.teleport('kagaribi_ossuary',1,1,'east');g.dispatch({type:'expedition.action',camp:'kagaribi_ossuary',action:'repair'});g.returnTown();g.dispatch({type:'location.move',id:'hikarigaeri_shop'});g.give('staff',1);g.dispatch({type:'equip',actor:'sera',item:'staff'});refreshView();view.tab='shop';view.skillShopActor='sera';show();});
  await lesson('祓いの追撃').getByRole('button',{name:/Lv1を習得/}).click();
  assert.equal(await page.evaluate(()=>g.state.expedition.learned.sera.exp_purging_pursuit),1);
  await page.evaluate(()=>{g.dispatch({type:'location.move',id:g.data.game.world.townRoot});g.dispatch({type:'location.move',id:'hikarigaeri_tavern'});g.dispatch({type:'job.change',actor:'ada',job:'knight'});g.dispatch({type:'location.move',id:g.data.game.world.townRoot});g.dispatch({type:'location.move',id:'hikarigaeri_shop'});refreshView();view.tab='shop';view.skillShopActor='ada';show();});
  await lesson('受け流しの号令').getByRole('button',{name:/Lv1を習得/}).click();
  assert.equal(await page.evaluate(()=>g.state.expedition.learned.ada.exp_parry_command),1);
  assert.ok(await lesson('受け流しの号令').evaluate(card=>card.querySelector('h3').getBoundingClientRect().width>=card.getBoundingClientRect().width*.9),'lesson heading uses the card width');
  await lesson('受け流しの号令').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,`training-${layout}-${width}.png`)});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'training shop horizontal overflow');
  // Purchased exploration lessons appear in character field actions, never in battle actions.
  await page.evaluate(()=>{g.dispatch({type:'job.change',actor:'sera',job:'lantern_keeper'});g.give('bow',1);g.dispatch({type:'equip',actor:'nio',item:'bow'});g.healAll();view.skillShopActor='sera';show();});
  await lesson('節油の種火').getByRole('button',{name:/Lv1を習得/}).click();
  await page.evaluate(()=>{view.skillShopActor='nio';show();});
  await lesson('帰路測定').getByRole('button',{name:/Lv1を習得/}).click();
  assert.equal(await page.evaluate(()=>g.state.expedition.learned.nio.exp_route_survey),1);
  await page.evaluate(()=>{g.data.system.encounterCheckSteps=100000;g.teleport('kagaribi_f3',5,1,'east');refreshView();view.tab='party';view.partySelection={party:'sera'};view.partyPages={party:'magic'};show();});
  await page.locator('.profile-entry').filter({has:page.getByRole('heading',{name:/^節油の種火/})}).getByRole('button',{name:'使う',exact:true}).click();
  assert.equal(await page.evaluate(()=>g.state.expedition.oilSaving.remaining),60);
  await page.screenshot({path:path.join(output,`oil-skill-${layout}-${width}.png`)});
  await page.locator('[data-focus="roster:party:nio"]').click();await page.getByRole('button',{name:'スキル',exact:true}).click();
  await page.locator('.profile-entry').filter({has:page.getByRole('heading',{name:/^帰路測定/})}).getByRole('button',{name:'使う',exact:true}).click();
  assert.equal(await page.evaluate(()=>g.state.expedition.route.path.length-1),2);
  assert.equal(await page.evaluate(()=>g.skills('nio').includes('exp_route_survey')),false);
  await page.getByRole('button',{name:layout==='scene'?'閉じる':'探索',exact:true}).click();
  await openCamp(page,'帰路測定');await page.screenshot({path:path.join(output,`route-${layout}-${width}.png`)});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'route horizontal overflow');
  await page.getByRole('button',{name:'対象一覧へ戻る',exact:true}).click();await page.getByRole('button',{name:'離れる',exact:true}).click();
  await page.getByRole('button',{name:'後ろへ',exact:true}).click();
  assert.equal(await page.evaluate(()=>g.state.expedition.route.path.length-1),1);assert.equal(await page.evaluate(()=>g.state.expedition.oilSaving.remaining),59);
  await page.evaluate(()=>{const saved=g.save();g.load(saved);show();});
  await openCamp(page,'節油の種火');await page.screenshot({path:path.join(output,`oil-remaining-${layout}-${width}.png`)});
  await page.close();console.log(`EXPEDITION BROWSER OK: ${layout} ${width}`);
 }
 assert.deepEqual(errors,[]);
}finally{await browser?.close();await new Promise(r=>server.close(r));}
