// Real Core, shared profile UI, native keyboard and CSS. Requires Playwright + Chromium.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-scouting-browser';
const fontRoot=process.env.ADV_BROWSER_FONTS; // Optional @fontsource/noto-sans-jp for headless hosts without Japanese fonts.
await fs.mkdir(output,{recursive:true});
const shell=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="src/view/style.css"><link rel="stylesheet" href="src/view/scene-style.css">${fontRoot?'<link rel="stylesheet" href="__fonts/400.css"><style>body{font-family:"Noto Sans JP",sans-serif!important}html{--story-font:"Noto Sans JP",sans-serif!important}</style>':''}<div id="app" data-view="scene"></div></html>`;
const types={'.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{try{
  const url=decodeURI(req.url.split('?')[0]);
  if(url==='/'){res.setHeader('content-type','text/html');res.end(shell);return;}
  const file=url.startsWith('/__fonts/')&&fontRoot?path.join(fontRoot,url.slice(9)):path.join(root,url);res.setHeader('content-type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));
}catch{res.statusCode=404;res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser,page;const errors=[],checks=[];
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.ADV_BROWSER_EXECUTABLE,ignoreDefaultArgs:['--hide-scrollbars'],args:['--no-sandbox']});
  page=await browser.newPage({viewport:{width:1280,height:856}});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400&&!response.url().endsWith('favicon.ico'))errors.push(`${response.status()} ${response.url()}`);});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async()=>{
    const {loadContent}=await import('/src/core/loader.js'),{GameEngine}=await import('/src/core/engine.js'),{projectGame}=await import('/src/application/projection.js'),{replaceView}=await import('/src/view/view-layout.js'),{activeActor}=await import('/src/core/battle.js'),{applyStun}=await import('/src/core/battle-turns.js');
    const data=await loadContent(),root=document.querySelector('#app');let g,view;
    const ui={status(){},menu(){},help(){},sound(){},soundEnabled:()=>false,effectsMode:()=> 'off'},render=()=>view.render(projectGame(g));
    const dispatch=intent=>{const changed=g.dispatch(intent);if(changed)render();return changed;};
    window.h={get g(){return g;},get view(){return view;},render,
      start(layout){
        view?.destroy();g=new GameEngine(structuredClone(data),83);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});
        g.award(0,data.system.xpBase*9*10);g.data.maps.region_2_f1.objects=[];g.data.maps.region_2_f1.encounterRate=0;g.teleport('region_2_f1',1,1,'east');g.state.discovered.region_2_f1=['1,1'];
        g.data.cellEvents.browser_trap={trigger:'enter',script:'cell.poison_step',occurrence:{chance:1,maxCount:null,reset:'never'},trap:{kind:'needle',hidden:1,difficulty:1}};
        g.data.maps.region_2_f1.cells.overrides['2,1']={events:['browser_trap']};
        view=replaceView(null,layout,root,dispatch,ui);view.tab='party';view.partySelection={party:'nio'};view.partyPages={party:'skills'};render();
      },
      battle(){g.state.scouting??={traps:{},effects:{}};g.state.scouting.effects.ambush={remaining:30,actions:3};g.startBattle('wild_pair_10',{win:[],lose:[],escape:[]});g.random=()=>0;applyStun(g,g.state.actors[activeActor(g)],{});view.tab='location';render();},
      roundtrip(){const s=g.save();g.load(s);if(g.save()!==s)throw Error('Save changed on load');render();}
    };
  });
  for(const layout of ['classic','scene'])for(const width of [1280,390]){
    await page.setViewportSize({width,height:844});await page.evaluate(layout=>h.start(layout),layout);
    const profile=page.locator('.character-profile[data-profile="party"]');
    assert.match(await profile.textContent(),/罠発見.*技能Lv1/);assert.match(await profile.textContent(),/次の技能Lv/);
    await page.locator('[data-focus="profile:party:use:trap_detect"]').click();
    assert.equal(await page.evaluate(()=>h.g.state.scouting.traps['cell/region_2_f1/2,1/browser_trap'].discovered),true);
    await page.getByRole('button',{name:'針',exact:true}).click();assert.equal(await page.evaluate(()=>h.g.state.scouting.traps['cell/region_2_f1/2,1/browser_trap'].disabled),true);
    await page.evaluate(()=>h.roundtrip());
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(output,`${layout}-${width}-skills.png`)});
    await page.locator('[data-focus="profile:party:use:recon"]').click();assert.match(await page.locator('.party-board').textContent(),/ニオは偵察中/);assert.equal(await page.evaluate(()=>h.g.state.members.includes('nio')),false);await page.evaluate(()=>h.roundtrip());
    await page.evaluate(layout=>h.start(layout),layout);await page.evaluate(()=>h.battle());
    assert.match(await page.locator('.battle-preemptive').textContent(),/残り3回/);await page.getByRole('button',{name:'行動を進める',exact:true}).click();assert.match(await page.locator('.battle-preemptive').textContent(),/残り2回/);
    await page.locator('[data-focus="skill:guard"]').click();assert.match(await page.locator('.battle-preemptive').textContent(),/残り1回/);await page.evaluate(()=>h.roundtrip());
    await page.screenshot({path:path.join(output,`${layout}-${width}-preemptive.png`)});
    await page.locator('[data-focus="skill:guard"]').click();assert.equal(await page.locator('.battle-preemptive').count(),0);
    checks.push({layout,width,skills:true,recon:true,stun:true,preemptive:true,save:true});
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'checks.json'),JSON.stringify(checks,null,2));console.log(`SCOUT BROWSER: ${checks.length} layout/width combinations passed`);
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
