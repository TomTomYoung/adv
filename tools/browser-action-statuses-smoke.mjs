// Real browser checks for persistent action statuses and sealed controls.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-action-status-browser';
await fs.mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{
  const url=decodeURI(req.url.split('?')[0]);
  if(url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="src/view/style.css"><link rel="stylesheet" href="src/view/scene-style.css"><div id="app"></div></html>');return;}
  const file=path.join(root,url);res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));
}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[];
try{
  browser=await chromium.launch({executablePath:process.env.ADV_BROWSER_EXECUTABLE,headless:true,args:['--no-sandbox','--disable-gpu']});
  for(const mode of ['normal','scene'])for(const width of [1280,390]){
    const page=await browser.newPage({viewport:{width,height:856}});page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.evaluate(async mode=>{
      const {nextFormation}=await import('./src/core/battle-formation.js');
    const {loadContent}=await import('./src/core/loader.js'),{GameEngine}=await import('./src/core/engine.js'),{projectGame}=await import('./src/application/projection.js'),{GameView}=await import('./src/view/view.js'),{SceneView}=await import('./src/view/scene-view.js'),{applyStatus}=await import('./src/core/status-effects.js'),{applyTheme,THEME_DEFAULT}=await import('./src/view/theme.js');
      applyTheme(THEME_DEFAULT);const data=await loadContent(),g=new GameEngine(data,29);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});
      g.changeJob('ada','mage');g.award(0,data.system.xpBase*9*10);g.state.members=['ada'];g.state.partyFormation=nextFormation(g.state.members,g.state.partyFormation);
      for(const id of data.encounters.wild_pair_10.enemies){data.enemies[id].ai=[{priority:1,skill:'guard',target:'self'}];data.enemies[id].stats.agi=0;}
      g.teleport('region_2_f1',1,1);g.startBattle('wild_pair_10',{win:[],lose:[],escape:[]});
      for(const id of ['paralysis','blindness','spell_seal','skill_seal','item_seal','confusion'])applyStatus(data,g.state,g.state.actors.ada,id);
      data.statuses.paralysis.actionFailureChance=1;g.random=()=>.99;
      const root=document.querySelector('#app');root.dataset.view=mode==='scene'?'scene':'normal';
      const ui={status(){},soundEnabled:()=>false,effectsMode:()=> 'off',menu(){},help(){}};
      const View=mode==='scene'?SceneView:GameView,view=new View(root,intent=>{const changed=g.dispatch(intent);view.render(projectGame(g));return changed;},ui);
      Object.assign(window,{g,view,projectGame});view.render(projectGame(g));
    },mode);
    assert.equal(await page.locator('[data-focus="skill:attack"]').isDisabled(),false);
    assert.equal(await page.locator('[data-focus="skill:guard"]').isDisabled(),false);
    await page.locator('[data-focus="battle-menu:skills"]').click();
    assert.equal(await page.locator('[data-focus="skill:fire"]').isDisabled(),true);
    assert.match(await page.locator('[data-focus="skill:fire"]').getAttribute('title'),/呪文封印/);
    await page.locator('[data-focus="battle:back"]').click();
    await page.locator('[data-focus="battle-menu:items"]').click();
    assert.equal(await page.locator('[data-focus="battle-item:potion"]').isDisabled(),true);
    assert.match(await page.locator('[data-focus="battle-item:potion"]').getAttribute('title'),/アイテム封印/);
    await page.screenshot({path:path.join(output,`${mode}-${width}-sealed.png`)});
    await page.locator('[data-focus="battle:back"]').click();
    await page.locator('[data-focus="skill:guard"]').click();
    assert.match(await page.locator('.battle-log').innerText(),/まひで行動できない/);
    const state=await page.evaluate(()=>{const saved=g.save();g.load(saved);return {same:g.save()===saved,round:g.state.battle.round,statuses:projectGame(g).party[0].statuses,ages:g.state.actors.ada.statusRecoveryTurns};});
    assert.equal(state.same,true);assert.equal(state.round,2);assert.equal(state.statuses.length,6);assert.ok(Object.values(state.ages).every(n=>n===1));
    await page.evaluate(async()=>{
      const {applyStatus,removeStatus}=await import('./src/core/status-effects.js');const actor=g.state.actors.ada;removeStatus(actor);applyStatus(g.data,g.state,actor,'sleep',undefined,3);view.render(projectGame(g));
    });
    assert.equal(await page.locator('[data-focus="skill:attack"]').count(),0);
    assert.match(await page.locator('.battle-commands').innerText(),/ねむりで行動できません/);
    await page.getByRole('button',{name:'行動を進める',exact:true}).click();
    assert.match(await page.locator('.battle-log').innerText(),/ねむりで行動できない/);
    await page.screenshot({path:path.join(output,`${mode}-${width}-sleep.png`)});
    const beforeBerserk=await page.evaluate(async()=>{
      const {applyStatus,removeStatus}=await import('./src/core/status-effects.js');const actor=g.state.actors.ada;removeStatus(actor);applyStatus(g.data,g.state,actor,'berserk',undefined,2);applyStatus(g.data,g.state,actor,'sure_hit',undefined,3);applyStatus(g.data,g.state,actor,'guaranteed_critical',undefined,3);view.render(projectGame(g));return {mp:actor.mp,uses:actor.skillProgress?.attack?.uses??0};
    });
    assert.equal(await page.locator('[data-focus="skill:guard"]').count(),0);
    assert.match(await page.locator('.battle-commands').innerText(),/狂暴化で敵に通常攻撃/);
    await page.getByRole('button',{name:'行動を進める',exact:true}).click();
    assert.match(await page.locator('.battle-log').innerText(),/狂暴化して襲いかかった/);
    assert.match(await page.locator('.battle-log').innerText(),/クリティカル/);
    const afterBerserk=await page.evaluate(()=>{const saved=g.save();g.load(saved);return {same:g.save()===saved,mp:g.state.actors.ada.mp,uses:g.state.actors.ada.skillProgress.attack.uses};});
    assert.equal(afterBerserk.same,true);assert.equal(afterBerserk.mp,beforeBerserk.mp);assert.equal(afterBerserk.uses,beforeBerserk.uses+1);
    await page.screenshot({path:path.join(output,`${mode}-${width}-berserk.png`)});
    await page.evaluate(async()=>{const {removeStatus}=await import('./src/core/status-effects.js');removeStatus(g.state.actors.ada);view.render(projectGame(g));});
    assert.equal(await page.locator('[data-focus="skill:attack"]').isDisabled(),false);
    assert.equal(await page.getByRole('button',{name:'行動を進める',exact:true}).count(),0);
    await page.close();
  }
  assert.deepEqual(errors,[]);console.log('ACTION STATUS BROWSER OK: normal/scene × 1280/390; seals, sleep, berserk, sure hit, critical, recovery clocks and save/load');
}finally{await browser?.close();await new Promise(r=>server.close(r));}
