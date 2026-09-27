// Optional real-browser battle layout / native keyboard test. Requires Playwright + Chromium.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-battle-browser';
await fs.mkdir(output,{recursive:true});
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{
  const url=decodeURI(req.url.split('?')[0]);
  if(url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="src/view/style.css"><link rel="stylesheet" href="src/view/scene-style.css"><div id="app" data-view="scene"></div></html>');return;}
  const file=path.join(root,url);res.setHeader('Content-Type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));
}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;const errors=[],checks=[];
try{
  browser=await chromium.launch({executablePath:process.env.ADV_BROWSER_EXECUTABLE,headless:true,ignoreDefaultArgs:['--hide-scrollbars'],args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer','--no-zygote']});
  const page=await browser.newPage({viewport:{width:1280,height:856}});
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async()=>{
    const {loadContent}=await import('./src/core/loader.js'),{GameEngine}=await import('./src/core/engine.js'),{projectGame}=await import('./src/application/projection.js'),{SceneView}=await import('./src/view/scene-view.js'),{handleGameKey}=await import('./src/view/keyboard.js'),{applyTheme,THEME_DEFAULT}=await import('./src/view/theme.js');
    applyTheme(THEME_DEFAULT);const data=await loadContent(),g=new GameEngine(data,29);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});
    g.dispatch({type:'travel',dungeon:'kagaribi'});g.startBattle('wild_pair_1',{win:[],lose:[],escape:[]});g.state.actors.sera.hp=10;
    const intents=[],dispatch=intent=>{intents.push(intent);const changed=g.dispatch(intent);view.render(projectGame(g));return changed;};
    const ui={status(){},soundEnabled:()=>false,effectsMode:()=> 'off',menu(){},help(){}};
    const view=new SceneView(document.querySelector('#app'),dispatch,ui);
    Object.assign(window,{g,view,ui,dispatch,intents,projectGame});view.render(projectGame(g));
    document.addEventListener('keydown',e=>handleGameKey(e,{view:window.view,model:window.view.model,dispatch}));
  });
  const settle=()=>page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
  const shot=async name=>{await settle();await page.screenshot({path:path.join(output,name+'.png')});};
  const focus=()=>page.locator(':focus').getAttribute('data-focus');
  const reach=async key=>{for(let n=0;n<50;n++){if(await focus()===key)return;await page.keyboard.press('ArrowDown');}assert.fail(`unreachable: ${key}`);};
  const height=()=>page.locator('.scene-dock').evaluate(e=>e.getBoundingClientRect().height);
  const fixed=await height(),saved=await page.evaluate(()=>g.save());await shot('01-actions');
  assert.deepEqual(await page.locator('.battle-actions button').allTextContents(),['攻撃','防御','スキル','アイテム','逃走']);
  await reach('battle-menu:skills');await page.keyboard.press('Enter');const skillFocus=await focus();await shot('02-skills');
  await page.keyboard.press('Enter');await shot('03-targets');assert.equal(await page.locator('.battle-targets').count(),1);
  await page.keyboard.press('Escape');assert.equal(await focus(),skillFocus);await page.keyboard.press('Escape');assert.equal(await focus(),'battle-menu:skills');
  assert.equal(await page.evaluate(()=>g.save()),saved);
  await reach('battle-menu:items');await page.keyboard.press('Enter');await reach('battle-item:potion');await page.keyboard.press('Enter');
  await reach('target:sera');const count=await page.evaluate(()=>g.state.inventory.potion);assert.equal(await page.evaluate(()=>intents.length),0);
  await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>g.state.inventory.potion),count-1);assert.ok(await page.evaluate(()=>g.state.actors.sera.hp>10));
  assert.equal(await focus(),'skill:attack');assert.equal(await page.evaluate(()=>intents.length),1);assert.equal(await height(),fixed);
  checks.push('real engine: skill/item hierarchy, target cancellation, zero cost while choosing, one item consumed on confirmation, next turn focus');
  // Synthetic projected menu only: exercise overflow without changing game content or learning skills.
  await page.evaluate(()=>{
    const m=projectGame(g),sample=m.battle.skills.find(s=>s.id==='attack');
    m.battle.skills.push(...Array.from({length:24},(_,i)=>({...sample,id:`stress_${i}`,name:`確認用スキル ${i+1}`,cost:'MP4'})));
    m.battle.log=Array.from({length:6},(_,i)=>`戦闘メッセージ ${i+1}。行動の結果を確認する。`);
    window.stress=m;view.battleMenu=null;view.render(m);
  });
  for(const [width,h] of [[1280,856],[900,700],[390,844],[320,568],[844,390]]){
    await page.setViewportSize({width,height:h});await page.evaluate(()=>{view.battleMenu=null;view.pendingBattleAction=null;view.render(stress);});await settle();
    const before=await height();await reach('battle-menu:skills');await page.keyboard.press('Enter');await reach('skill:stress_23');await settle();
    assert.equal(await height(),before);assert.ok(await page.locator('.battle-actions').evaluate(e=>e.scrollTop>0&&e.scrollHeight>e.clientHeight));
    const bounds=await page.evaluate(()=>{
      const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,height:r.height};};
      return {commands:rect('.battle-commands'),log:rect('.battle-log'),menu:rect('.battle-actions'),focus:rect(':focus'),dock:rect('.scene-dock'),overflow:document.documentElement.scrollWidth>innerWidth};
    });
    assert.ok(bounds.log.right<bounds.commands.left);assert.ok(Math.abs(bounds.commands.top-bounds.log.top)<1);assert.ok(Math.abs(bounds.commands.bottom-bounds.log.bottom)<1);
    assert.ok(bounds.focus.top>=bounds.menu.top-1&&bounds.focus.bottom<=bounds.menu.bottom+1,JSON.stringify({width,h,...bounds}));assert.ok(bounds.commands.bottom<=bounds.dock.bottom);assert.equal(bounds.overflow,false);
    await shot(`04-scroll-${width}x${h}`);
    const state=await page.evaluate(()=>g.save());await page.keyboard.press('Enter');await settle();assert.equal(await height(),before);await page.keyboard.press('Escape');assert.equal(await focus(),'skill:stress_23');assert.equal(await page.evaluate(()=>g.save()),state);
  }
  checks.push('synthetic 24-skill overflow in real Chromium at 1280, 900, 390, 320px and low landscape: right commands, left messages, equal fixed heights, arrow scrolling, final item reachable, no horizontal overflow');
  await page.setViewportSize({width:1280,height:856});
  await page.evaluate(()=>{const m=projectGame(g);m.battle.event={id:'browser'};m.dialog={type:'text',speaker:'新人',text:'待ってくれ。'};view.render(m);});await shot('05-battle-dialogue');
  assert.equal(await page.locator('.battle-actions').count(),0);
  assert.ok(await page.evaluate(()=>document.querySelector('.scene-message-body').getBoundingClientRect().right<document.querySelector('.scene-message-actions').getBoundingClientRect().left));
  await page.evaluate(async()=>{const {GameView}=await import('./src/view/view.js');view.destroy();document.querySelector('#app').dataset.view='classic';window.view=new GameView(document.querySelector('#app'),dispatch,ui);view.render(projectGame(g));});
  await reach('battle-menu:items');await page.keyboard.press('Enter');await reach('battle-item:potion');await page.keyboard.press('Enter');await page.keyboard.press('Escape');assert.equal(await focus(),'battle-item:potion');await page.keyboard.press('Escape');assert.equal(await focus(),'battle-menu:items');await shot('06-classic');
  checks.push('battle event dialogue remains playable on the left with controls on the right; classic layout uses the same hierarchy and cancel behavior');
  // Native coordinates across a real move -> enter-event -> battle transition.
  // Only the deterministic enter-event is synthetic; dispatch, save and combat are real.
  for(const [width,height,coarse] of [[1280,856,false],[900,700,false],[390,844,true],[320,568,true],[844,390,true]]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:coarse,isMobile:coarse});
    const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
    p.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
    await p.goto(`http://127.0.0.1:${server.address().port}/`);
    await p.evaluate(async()=>{
      const {loadContent}=await import('./src/core/loader.js'),{GameEngine}=await import('./src/core/engine.js'),{projectGame}=await import('./src/application/projection.js'),{SceneView}=await import('./src/view/scene-view.js'),{handleGameKey}=await import('./src/view/keyboard.js'),{applyTheme,THEME_DEFAULT}=await import('./src/view/theme.js');
      applyTheme({...THEME_DEFAULT,textSize:24});const data=await loadContent();
      const command={op:'battle.start',encounter:'wild_pair_1',on_win:[],on_lose:[],on_escape:[],on_interrupt:[]};
      data.scripts.browser_entry_battle={commands:[command]};
      data.scripts.browser_battle_dialogue={commands:[{...command,events:[{id:'intro',triggers:['start'],commands:[{op:'say',text:'動くな。敵が来る。'},{op:'choice',options:[{id:'ready',text:'構える',commands:[]}]}]}]}]};
      const ui={status(){},soundEnabled:()=>false,effectsMode:()=> 'off',menu(){},help(){}};
      window.reset=()=>{
        window.view?.destroy();window.g=new GameEngine(data,29);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});
        g.dispatch({type:'travel',dungeon:'kagaribi'});g.teleport('kagaribi_f1',3,1,'west');
        window.intents=[];window.dispatch=intent=>{intents.push(intent);const changed=g.dispatch(intent);if(changed)view.render(projectGame(g));return changed;};
        window.view=new SceneView(document.querySelector('#app'),dispatch,ui);view.render(projectGame(g));
      };
      data.maps.kagaribi_f1.objects.unshift({id:'browser_entry',name:'戦闘確認地点',kind:'clue',x:2,y:1,trigger:'enter',once:true,script:'browser_entry_battle'});
      Object.assign(window,{data,projectGame});document.addEventListener('keydown',e=>handleGameKey(e,{view,model:view.model,dispatch}));reset();
    });
    const settleEntry=()=>p.evaluate(async()=>{await document.fonts.ready;await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));});
    const capture=async name=>{await settleEntry();await p.screenshot({path:path.join(output,`${name}-${width}x${height}.png`)});};
    await settleEntry();const forward=await p.locator('.movement-pad .forward').boundingBox(),controls=await p.locator('.scene-dungeon-controls').boundingBox();
    const point={x:forward.x+forward.width/2,y:forward.y+forward.height/2};
    const forwardPoints=[point,...[3,forward.width-3].flatMap(x=>[3,forward.height-3].map(y=>({x:forward.x+x,y:forward.y+y})))];
    await capture('07-before-battle');await p.mouse.click(point.x,point.y);await settleEntry();
    assert.equal(await p.evaluate(()=>g.state.battle?.encounter),'wild_pair_1');
    const commandBox=await p.locator('.battle-commands').boundingBox();
    for(const k of ['x','y','width','height'])assert.ok(Math.abs(commandBox[k]-controls[k])<1,`${width}x${height}: command region ${k} moved`);
    const saved=await p.evaluate(()=>g.save());
    for(const at of forwardPoints){
      assert.equal(await p.evaluate(({x,y})=>Boolean(document.elementFromPoint(x,y)?.closest('button')),at),false,`${width}x${height}: forward overlaps a battle button`);
      for(let i=0;i<4;i++)await p.mouse.click(at.x,at.y);
    }
    assert.equal(await p.evaluate(()=>g.save()),saved);assert.equal(await p.evaluate(()=>view.pendingBattleAction??null),null);
    assert.equal(await p.locator('.battle-menu-title').textContent(),'行動？');
    await capture('08-battle-actions');
    const attack=await p.locator('[data-focus="skill:attack"]').boundingBox(),attackPoint={x:attack.x+attack.width/2,y:attack.y+attack.height/2};
    await p.mouse.click(attackPoint.x,attackPoint.y);await settleEntry();
    assert.equal(await p.locator('.battle-menu-title').textContent(),'攻撃の対象');
    assert.equal(await p.evaluate(()=>g.save()),saved);
    const first=p.locator('.battle-target').first(),target=await first.boundingBox(),targetId=await first.getAttribute('data-focus');
    for(const k of ['x','y','width'])assert.ok(Math.abs(target[k]-attack[k])<1,`${width}x${height}: attack/target ${k} differs`);
    assert.equal(await p.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('button')?.dataset.focus,attackPoint),targetId);
    await capture('09-attack-targets');
    await p.keyboard.press('Escape');assert.equal(await p.evaluate(()=>g.save()),saved);
    await p.mouse.click(attackPoint.x,attackPoint.y);await p.mouse.click(attackPoint.x,attackPoint.y);
    const battleIntents=await p.evaluate(()=>intents.filter(i=>i.type==='battle'));
    assert.deepEqual(battleIntents,[{type:'battle',action:'skill',skill:'attack',target:targetId.slice('target:'.length)}]);
    assert.notEqual(await p.evaluate(()=>g.save()),saved);
    // Battle-start text/choice uses the same disabled movement pad as field events.
    await p.evaluate(()=>{reset();data.maps.kagaribi_f1.objects.find(o=>o.id==='browser_entry').script='browser_battle_dialogue';});
    await p.mouse.click(point.x,point.y);await settleEntry();
    assert.equal(await p.locator('.movement-pad button:disabled').count(),4);
    const dialogueSave=await p.evaluate(()=>g.save());for(let i=0;i<12;i++)await p.mouse.click(point.x,point.y);
    assert.equal(await p.evaluate(()=>g.save()),dialogueSave);
    for(let fuel=50;await p.evaluate(()=>g.state.waiting?.type==='text');fuel--){assert.ok(fuel>0);await p.keyboard.press('Enter');}
    assert.equal(await p.evaluate(()=>g.state.waiting.type),'choice');
    const choiceSave=await p.evaluate(()=>g.save());for(let i=0;i<12;i++)await p.mouse.click(point.x,point.y);
    assert.equal(await p.evaluate(()=>g.save()),choiceSave);await capture('10-battle-event');
    // Disabled-pad clicks may blur focus; explicitly choose the visible option,
    // rather than implicitly activating the previous-page control on small screens.
    await p.locator('[data-focus="choice:ready"]').click();assert.equal(await p.locator('.battle-menu-title').textContent(),'行動？');
    checks.push(`${width}x${height}${coarse?' touch':''}: same exploration/battle bounds, forward centre/corners inert after entry, attack/first target share coordinates, cancellation free, one attack per confirmation, battle intro text/choice safe`);
    await context.close();
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2)+'\n');console.log(JSON.stringify({passed:true,checks,errors},null,2));
}finally{await browser?.close();server.close();}
