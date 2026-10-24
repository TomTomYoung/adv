// Shop scrolling with real wheel input, real Core and both layouts.
// Playwright's locator.click() can silently scroll overflow:hidden ancestors;
// use pointer hit tests and mouse.click() for the controls under examination.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-shop-browser';
const font=process.env.ADV_BROWSER_FONT;
await fs.mkdir(output,{recursive:true});
const shell=`<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="src/view/style.css"><link rel="stylesheet" href="src/view/scene-style.css">${font?'<style>@font-face{font-family:ShopTestJapanese;src:url(/__font.otf)}body{font-family:ShopTestJapanese,sans-serif!important}html{--story-font:ShopTestJapanese,sans-serif!important}</style>':''}<div id="app"></div></html>`;
const types={'.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.otf':'font/otf'};
const server=http.createServer(async(req,res)=>{try{
  const url=decodeURI(req.url.split('?')[0]);
  if(url==='/'){res.setHeader('content-type','text/html');res.end(shell);return;}
  const file=url==='/__font.otf'&&font?font:path.join(root,url);
  res.setHeader('content-type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));
}catch{res.statusCode=404;res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser,page;const errors=[],checks=[];
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.ADV_BROWSER_EXECUTABLE,ignoreDefaultArgs:['--hide-scrollbars'],args:['--no-sandbox']});
  page=await browser.newPage();page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400&&!response.url().endsWith('favicon.ico'))errors.push(`${response.status()} ${response.url()}`);});
  await page.goto(`http://127.0.0.1:${server.address().port}/`);
  await page.evaluate(async()=>{
    const {loadContent}=await import('/src/core/loader.js'),{GameEngine}=await import('/src/core/engine.js'),{projectGame}=await import('/src/application/projection.js'),{replaceView}=await import('/src/view/view-layout.js'),{handleGameKey}=await import('/src/view/keyboard.js'),{applyTheme,THEME_DEFAULT}=await import('/src/view/theme.js');
    applyTheme(THEME_DEFAULT);const data=await loadContent();let g,view;
    const root=document.querySelector('#app'),intents=[];
    const ui={status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'};
    const render=()=>view.render(projectGame(g));
    const dispatch=intent=>{intents.push(intent);const ok=g.dispatch(intent);render();return ok;};
    const settle=()=>{for(let n=0;g.state.waiting?.type==='text'&&n<100;n++)g.dispatch({type:'advance'});if(g.state.waiting)throw new Error('Shop harness blocked by narrative');};
    // Each case owns a fresh in-memory state. No player saves are accessed.
    window.h={
      get g(){return g;},get view(){return view;},intents,render,
      start(layout,{unlocked=true}={}){
        view?.destroy();g=new GameEngine(data,83);settle();
        g.state.gold=100000;g.state.expedition.gems=100000;
        if(unlocked)g.state.flags.kagaribi={...g.state.flags.kagaribi,altarGuardianWon:true};
        g.give('iron_sword',1);g.dispatch({type:'equip',actor:'ada',item:'iron_sword'});
        view=replaceView(null,layout,root,dispatch,ui);render();intents.length=0;
      },
      open(tab){
        const id=tab==='skills'?data.expedition.skillShopLocation:data.expedition.shopLocation;
        if(g.state.townLocation!==id){g.dispatch({type:'location.move',id:data.game.world.townRoot});g.dispatch({type:'location.move',id});}
        render();view.tab=tab;render();
        if(view.tab!==tab)throw new Error(`Cannot open ${tab} at ${id}`);
      },
      selected(){const m=projectGame(g),item=m.shop.find(item=>item.id===view.shopItem);return {item:item.id,price:item.price,gold:m.gold,recipients:item.recipients.map(({actor,count})=>({actor,count}))};}
    };
    document.addEventListener('keydown',event=>handleGameKey(event,{view,model:view.model,dispatch}));
  });
  const settle=()=>page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  const align=async selector=>{await settle();if(await page.locator('#app').getAttribute('data-view')==='classic')await page.locator(selector).evaluate(element=>element.scrollIntoView({block:'start'}));await settle();};
  async function geometry(label){
    const value=await page.evaluate(()=>{
      const measure=selector=>{const e=document.querySelector(selector);if(!e)return null;const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height,clientHeight:e.clientHeight,scrollHeight:e.scrollHeight,clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,scrollTop:e.scrollTop,scrollLeft:e.scrollLeft};};
      return {width:innerWidth,height:innerHeight,documentWidth:document.documentElement.scrollWidth,body:measure('.scene-window-body'),head:measure('.scene-window-header'),shop:measure('.shop-panel'),products:measure('.shop-products'),recipients:measure('.shop-recipients'),skills:measure('.skill-shop'),lessons:measure('.skill-shop-products')};
    });
    assert.ok(value.documentWidth<=value.width+1,`${label}: document has horizontal overflow`);
    if(value.body){
      assert.equal(value.body.scrollTop,0,`${label}: clipped parent scrolled instead of its list`);
      assert.ok(value.head.top>=-1&&value.head.bottom<=value.height+1,`${label}: close/header outside viewport`);
      assert.ok(value.body.scrollWidth<=value.body.clientWidth+1,`${label}: panel body has horizontal overflow`);
    }
    for(const key of ['shop','skills'])if(value[key]){
      const p=value[key];assert.ok(p.top>=-1&&p.bottom<=value.height+1,`${label}: ${key} outside viewport: ${JSON.stringify(p)}`);
      assert.ok(p.scrollWidth<=p.clientWidth+1,`${label}: ${key} has horizontal overflow`);
    }
    for(const key of ['products','lessons'])if(value[key])assert.ok(value[key].height>=44,`${label}: ${key} has no usable scroll area (${value[key].height}px)`);
    return value;
  }
  async function pointer(locator,label,{click=false}={}){
    const hit=await locator.evaluate(element=>{
      const r=element.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,at=document.elementFromPoint(x,y);
      return {x,y,visible:r.width>0&&r.height>0&&x>=0&&x<innerWidth&&y>=0&&y<innerHeight,hit:at===element||element.contains(at)};
    });
    assert.ok(hit.visible&&hit.hit,`${label}: control is clipped or covered: ${JSON.stringify(hit)}`);
    if(click){assert.equal(await locator.isDisabled(),false,`${label}: disabled`);await page.mouse.click(hit.x,hit.y);await settle();}
    return hit;
  }
  async function wheel(selector,{horizontal=false,end=true}={}){
    const locator=page.locator(selector),before=await locator.evaluate((e,h)=>({position:h?e.scrollLeft:e.scrollTop,max:h?e.scrollWidth-e.clientWidth:e.scrollHeight-e.clientHeight}),horizontal);
    assert.ok(before.max>1,`${selector}: fixture should require ${horizontal?'horizontal':'vertical'} scrolling`);
    const box=await locator.boundingBox(),x=Math.max(1,Math.min(box.x+box.width/2,(await page.viewportSize()).width-2)),y=Math.max(1,Math.min(box.y+box.height/2,(await page.viewportSize()).height-2));
    await page.mouse.move(x,y);const delta=(end?1:-1)*100000;await page.mouse.wheel(horizontal?delta:0,horizontal?0:delta);
    await page.waitForFunction(({selector,horizontal,end})=>{const e=document.querySelector(selector),position=horizontal?e.scrollLeft:e.scrollTop,max=horizontal?e.scrollWidth-e.clientWidth:e.scrollHeight-e.clientHeight;return end?Math.abs(position-max)<=1:position<=1;},{selector,horizontal,end});
    return locator.evaluate((e,h)=>h?e.scrollLeft:e.scrollTop,horizontal);
  }
  const screenshot=async name=>{await settle();await page.screenshot({path:path.join(output,`${name}.png`)});};
  for(const layout of ['scene','classic'])for(const [width,height] of [[1382,783],[1280,600],[844,390],[390,844]]){
    const name=`${layout}-${width}x${height}`;
    await page.setViewportSize({width,height});await page.evaluate(layout=>{h.start(layout);h.open('shop');},layout);await align('.shop-panel');
    assert.equal(await page.locator('.skill-shop,.supply-panel').count(),0,`${name}: normal shop contains another service`);
    const initial=await geometry(`${name}/shop`);
    if(layout==='scene')await pointer(page.locator('.scene-window-header button'),`${name}/close`);
    await pointer(page.locator('.shop-character-cards button').first(),`${name}/first recipient`);
    const last=page.locator('.shop-products button').last(),scroll=await wheel('.shop-products');
    await pointer(last,`${name}/last item`,{click:true});
    const selectedScroll=await page.locator('.shop-products').evaluate(e=>e.scrollTop);
    assert.ok(Math.abs(selectedScroll-scroll)<=1,`${name}: selecting an item lost list position (${scroll} -> ${selectedScroll})`);
    const before=await page.evaluate(()=>h.selected());
    await pointer(page.locator('.shop-character-cards button').first(),`${name}/buy for first recipient`,{click:true});
    const after=await page.evaluate(()=>h.selected());
    assert.equal(after.gold,before.gold-before.price,`${name}: purchase price`);
    assert.equal(after.recipients[0].count,before.recipients[0].count+1,`${name}: purchased item reached the chosen actor`);
    const purchasedScroll=await page.locator('.shop-products').evaluate(e=>e.scrollTop);
    // Equipment notes wrap on phones and shrink the list compared with the
    // initial consumable. Permit that geometry delta plus the 2px list pad,
    // while requiring the selected final row to remain visible after buying.
    const purchasedHeight=await page.locator('.shop-products').evaluate(e=>e.clientHeight);
    assert.ok(Math.abs(purchasedScroll-scroll)<=Math.abs(purchasedHeight-initial.products.clientHeight)+3,`${name}: buying lost list position (${scroll} -> ${purchasedScroll})`);
    await pointer(page.locator('.shop-products button').last(),`${name}/purchased selection`);
    const cards=page.locator('.shop-character-cards');
    if(await cards.evaluate(e=>e.scrollWidth-e.clientWidth>1))await wheel('.shop-character-cards',{horizontal:true});
    await pointer(cards.locator('button').last(),`${name}/last recipient`);
    const purchased=await geometry(`${name}/purchased`);await screenshot(`${name}-shop`);
    await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>h.view.tab),'location',`${name}: Escape closes shop`);
    await page.evaluate(()=>h.open('skills'));await align('.skill-shop');
    assert.equal(await page.locator('.shop-panel,.supply-panel').count(),0,`${name}: skill shop contains item/supply shop`);
    const skills=await geometry(`${name}/skills`);
    await pointer(page.locator('.skill-shop-actors button').first(),`${name}/skill actor`);
    await wheel('.skill-shop-products');
    await pointer(page.locator('.skill-shop-card button').last(),`${name}/last skill`);
    const skillEnd=await geometry(`${name}/last skill`);await screenshot(`${name}-skills`);
    if(layout==='scene')await pointer(page.locator('.scene-window-header button'),`${name}/close skills`,{click:true});
    else await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>h.view.tab),'location',`${name}: closes skills`);
    checks.push({name,initial,purchased,skills,skillEnd,checks:'Real wheel reaches final item and lesson; recipient hit targets remain accessible; purchase keeps list position and updates real Core; close works; outer panel never scrolls'});
  }
  // An unavailable item still has a readable description; choosing it must
  // not return to the first item when every purchase recipient is disabled.
  await page.setViewportSize({width:1382,height:783});await page.evaluate(()=>{h.start('scene',{unlocked:false});h.open('shop');});await align('.shop-panel');
  const lockedScroll=await wheel('.shop-products');
  await pointer(page.locator('.shop-products button').last(),'locked last item',{click:true});
  assert.equal(await page.locator('.shop-character-cards button:not(:disabled)').count(),0);
  assert.ok(Math.abs(await page.locator('.shop-products').evaluate(e=>e.scrollTop)-lockedScroll)<=3,'Choosing an unavailable item lost list position');
  await pointer(page.locator('.shop-products button').last(),'locked selection remains visible');
  const locked=await geometry('locked item');await screenshot('scene-locked-item');
  checks.push({name:'scene-unavailable-item',geometry:locked,checks:'Disabled purchase targets do not move the selected item or scroll the clipped parent'});
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:true,checks,errors},null,2)+'\n');
  console.log(JSON.stringify({passed:true,cases:checks.map(({name,checks})=>({name,checks})),errors,output},null,2));
}catch(error){
  await page?.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:false,checks,errors,error:error.message},null,2)+'\n');throw error;
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
