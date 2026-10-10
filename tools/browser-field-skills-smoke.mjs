// Real Core, shared profile UI, native keyboard and CSS. Requires Playwright + Chromium.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-field-target-browser';
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
    const {loadContent}=await import('/src/core/loader.js'),{GameEngine}=await import('/src/core/engine.js'),{projectGame}=await import('/src/application/projection.js'),{replaceView}=await import('/src/view/view-layout.js'),{handleGameKey}=await import('/src/view/keyboard.js'),{applyTheme,THEME_DEFAULT}=await import('/src/view/theme.js');
    applyTheme(THEME_DEFAULT);const data=await loadContent();let g,view;
    const root=document.querySelector('#app'),intents=[];
    const ui={status(){},menu(){},help(){},sound(){},soundEnabled:()=>false,effectsMode:()=> 'off'};
    const render=()=>view.render(projectGame(g));
    const dispatch=intent=>{intents.push(intent);const accepted=g.dispatch(intent);if(accepted)render();return accepted;};
    const settleStory=()=>{for(let count=0;g.state.waiting?.type==='text'&&count<100;count++)g.dispatch({type:'advance'});if(g.state.waiting)throw new Error(`Harness blocked by ${g.state.waiting.type}`);};
    // The harness owns a fresh in-memory game each time. It never reads or writes player saves.
    window.h={
      get g(){return g;},get view(){return view;},intents,render,
      start(layout,context,{actor='sera',mp=12,page:profilePage='magic'}={}){
        view?.destroy();g=new GameEngine(data,83);settleStory();
        g.state.members=['ada','nio',actor,'il','berg'];
        if(context==='party'){
          g.dispatch({type:'location.move',id:'hikarigaeri_square'});
          if(!g.dispatch({type:'travel',dungeon:'kagaribi'}))throw new Error('Harness could not enter Kagaribi');
          settleStory();
        }
        for(const id of g.state.members){const a=g.state.actors[id],stats=g.stats(id);a.hp=stats.hp;a.mp=stats.mp;a.statuses=[];}
        g.state.actors.nio.statuses=['poison'];g.state.actors.ada.hp-=12;g.state.actors[actor].mp=mp;
        view=replaceView(null,layout,root,dispatch,ui);
        if(context==='town'){view.tab='profile';view.profileActor=actor;view.profilePage=profilePage;}
        else{view.tab='party';view.partySelection={party:actor};view.partyPages={party:profilePage};}
        intents.length=0;render();
      },
      snapshot(){return {members:[...g.state.members],actors:Object.fromEntries(g.state.members.map(id=>{const a=g.state.actors[id];return [id,{hp:a.hp,mp:a.mp,statuses:[...a.statuses]}];}))};}
    };
    document.addEventListener('keydown',event=>handleGameKey(event,{view,model:view.model,dispatch}));
  });
  const settle=async()=>page.evaluate(async()=>{await document.fonts.ready;await Promise.all([...document.images].map(image=>image.decode().catch(()=>{})));await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));});
  const profile=context=>page.locator(`.character-profile[data-profile="${context}"]`);
  const spell=(context,skill='cleanse')=>profile(context).locator(`[data-field-skill="${skill}"]`);
  const rows=(context,skill='cleanse')=>spell(context,skill).locator('.profile-field-target');
  const nioButton=context=>spell(context).locator('[data-target="nio"] .profile-target-use');
  const shot=async name=>{await settle();await page.screenshot({path:path.join(output,`${name}.png`)});};
  async function measure(context,skill='cleanse'){
    const measurements=await spell(context,skill).evaluate(entry=>{
      const content=entry.closest('.profile-content'),list=entry.querySelector('.profile-field-targets'),bounds=element=>{const b=element.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom,width:b.width,height:b.height};};
      return {viewport:{width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth},content:{...bounds(content),clientWidth:content.clientWidth,scrollWidth:content.scrollWidth,clientHeight:content.clientHeight,scrollHeight:content.scrollHeight,scrollTop:content.scrollTop},list:bounds(list),rows:[...list.children].map(row=>{
        const button=row.querySelector('.profile-target-use'),details=row.querySelector('.profile-target-details'),style=getComputedStyle(row);
        return {id:row.dataset.target,...bounds(row),availableWidth:row.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight),details:bounds(details),button:{...bounds(button),disabled:button.disabled},border:style.borderTopWidth,borderColor:style.borderColor,background:style.backgroundColor,statuses:[...row.querySelectorAll('.profile-target-status')].map(status=>({text:status.textContent,opacity:getComputedStyle(status).opacity}))};
      })};
    });
    const label=`${context}/${skill} ${measurements.viewport.width}x${measurements.viewport.height}`;
    assert.ok(measurements.viewport.scrollWidth<=measurements.viewport.width+1,`${label}: document overflows horizontally`);
    assert.ok(measurements.content.scrollWidth<=measurements.content.clientWidth+1,`${label}: profile overflows horizontally`);
    for(const [index,row] of measurements.rows.entries()){
      assert.ok(row.width>0&&row.left>=measurements.list.left-1&&row.right<=measurements.list.right+1,`${label}: ${row.id} leaves its list`);
      assert.ok(parseFloat(row.border)>=1,`${label}: ${row.id} has no row boundary`);
      assert.ok(row.button.width>=44&&row.button.height>=44,`${label}: ${row.id} action is ${row.button.width}x${row.button.height}`);
      assert.ok(row.details.width>=Math.min(80,row.availableWidth)-1,`${label}: ${row.id} state column is too narrow to read (${row.details.width}px)`);
      assert.ok((row.button.left>=row.details.right-1||row.button.top>=row.details.bottom-1)&&row.button.right<=row.right+1,`${label}: ${row.id} action overlaps its details`);
      assert.ok(row.button.top>=row.top&&row.button.bottom<=row.bottom,`${label}: ${row.id} action leaves its row`);
      assert.ok(row.statuses.every(status=>Number(status.opacity)>=.6),`${label}: disabled target state is dimmed`);
      if(index)assert.ok(row.top>=measurements.rows[index-1].bottom,`${label}: target rows overlap`);
    }
    return measurements;
  }
  async function reachLast(context,skill='cleanse'){
    const button=rows(context,skill).last().locator('.profile-target-use');await button.scrollIntoViewIfNeeded();
    const reach=await button.evaluate(element=>{
      const b=element.getBoundingClientRect(),c=element.closest('.profile-content'),r=c.getBoundingClientRect(),x=b.left+b.width/2,y=b.top+b.height/2,hit=document.elementFromPoint(x,y);
      return {scrollTop:c.scrollTop,scrollHeight:c.scrollHeight,clientHeight:c.clientHeight,buttonVisible:b.top>=Math.max(r.top,0)-1&&b.bottom<=Math.min(r.bottom,innerHeight)+1,hit:hit===element||element.contains(hit)};
    });
    assert.ok(reach.buttonVisible&&reach.hit,`${context}/${skill}: last target is not reachable: ${JSON.stringify(reach)}`);
    return reach;
  }
  async function assertTargets(context){
    assert.deepEqual(await rows(context).evaluateAll(elements=>elements.map(e=>e.dataset.target)),['ada','nio','sera','il','berg']);
    assert.deepEqual(await rows(context).evaluateAll(elements=>elements.filter(e=>!e.querySelector('button').disabled).map(e=>e.dataset.target)),['nio']);
    assert.equal(await spell(context).locator('.profile-field-reason').count(),0);
    assert.equal(await spell(context).locator('[data-target="nio"] .profile-target-status').textContent(),'毒');
    assert.equal(await spell(context).locator('[data-target="nio"] .profile-target-name').textContent(),'ニオ');
    assert.equal(await nioButton(context).getAttribute('aria-label'),'ニオに解毒を使う');
    for(const id of ['ada','sera','il','berg']){
      assert.equal(await spell(context).locator(`[data-target="${id}"] .profile-target-status`).textContent(),'毒ではありません。');
    }
    assert.equal(await spell(context).locator('.profile-target-reason').count(),0,'Healthy target state and reason should not repeat');
    assert.equal(await spell(context).locator('.profile-target-vitals').count(),0,'Cleansing should show status, without unrelated HP/MP values');
    const geometry=await measure(context),healthy=geometry.rows.find(row=>row.id==='ada'),affected=geometry.rows.find(row=>row.id==='nio');
    assert.notEqual(affected.borderColor,healthy.borderColor,'Eligible target must have a distinct row boundary');
    return geometry;
  }
  // Both layouts use the same profile in town and the party panel in a dungeon.
  for(const layout of ['scene','classic'])for(const context of ['town','party']){
    const name=`${layout}-${context}-1280x856`;
    await page.setViewportSize({width:1280,height:856});await page.evaluate(({layout,context})=>h.start(layout,context),{layout,context});await settle();
    const geometry=await assertTargets(context),reach=await reachLast(context);
    await nioButton(context).scrollIntoViewIfNeeded();await nioButton(context).focus();await shot(`${name}-before`);
    const before=await page.evaluate(()=>h.snapshot()),order=await rows(context).evaluateAll(elements=>elements.map(element=>element.dataset.target));
    const scrollTop=await profile(context).locator('.profile-content').evaluate(element=>element.scrollTop);
    await page.keyboard.press('Enter');
    const after=await page.evaluate(()=>h.snapshot()),expected=structuredClone(before);expected.actors.sera.mp-=2;expected.actors.nio.statuses=[];
    assert.deepEqual(after,expected,`${name}: only MP2 and Nio's poison should change`);
    assert.deepEqual(await rows(context).evaluateAll(elements=>elements.map(element=>element.dataset.target)),order,`${name}: target order changed after cure`);
    assert.equal(await nioButton(context).isDisabled(),true);
    assert.equal(await spell(context).locator('.profile-field-target.available').count(),0);
    assert.equal(await spell(context).locator('[data-target="nio"] .profile-target-status').textContent(),'毒ではありません。');
    assert.equal(await page.locator(':focus').getAttribute('data-focus'),`profile:${context}:magic`);
    assert.ok(Math.abs(await profile(context).locator('.profile-content').evaluate(element=>element.scrollTop)-scrollTop)<=1,`${name}: profile scroll jumped on cure`);
    assert.equal(await page.evaluate(()=>h.intents.filter(intent=>intent.type==='field.skill').length),1);
    await page.keyboard.press('Enter');
    assert.deepEqual(await page.evaluate(()=>h.snapshot()),after,`${name}: repeated Enter used another skill`);
    assert.equal(await page.evaluate(()=>h.intents.filter(intent=>intent.type==='field.skill').length),1);
    await shot(`${name}-after`);checks.push({name,checks:'Five stable rows; Nio only eligible; MP2 cure; retained order and scroll; safe focus; repeated Enter does not cast another skill',geometry,reach});
  }
  // Small phone, portrait and low landscape: target rows and the final action stay reachable.
  for(const [layout,context,width,height] of [['scene','party',390,844],['scene','party',320,568],['scene','town',844,390],['classic','town',390,844],['classic','party',320,568],['classic','party',844,390]]){
    const name=`${layout}-${context}-${width}x${height}`;
    await page.setViewportSize({width,height});await page.evaluate(({layout,context})=>h.start(layout,context),{layout,context});await settle();
    const geometry=await assertTargets(context),reach=await reachLast(context);
    assert.ok(reach.scrollTop>0,`${name}: final target should require and allow profile scrolling`);
    await nioButton(context).scrollIntoViewIfNeeded();await shot(name);checks.push({name,checks:'No horizontal overflow; bordered nonoverlapping target rows; 44px actions; final target reached by profile scrolling',geometry,reach});
  }
  // A common ability failure is shown once without obscuring who is poisoned.
  await page.setViewportSize({width:390,height:844});await page.evaluate(()=>h.start('scene','party',{mp:1}));await settle();
  assert.equal(await spell('party').locator('.profile-field-reason').count(),1);
  assert.match(await spell('party').locator('.profile-field-reason').textContent(),/MP/);
  assert.equal(await spell('party').locator('.profile-target-reason').count(),0);
  assert.equal(await spell('party').locator('.profile-target-use:not(:disabled)').count(),0);
  assert.equal(await spell('party').locator('[data-target="nio"] .profile-target-status').textContent(),'毒');
  const lowMp=await measure('party');await nioButton('party').scrollIntoViewIfNeeded();await shot('scene-party-390x844-low-mp');checks.push({name:'MP1',checks:'One common MP reason; all use buttons disabled; Nio poison remains readable',geometry:lowMp});
  // All-allies actions show the whole party, including a wounded non-caster.
  await page.setViewportSize({width:1280,height:856});await page.evaluate(()=>h.start('scene','party',{actor:'toma',mp:20,page:'skills'}));await settle();
  const group=spell('party','group_heal');assert.equal(await rows('party','group_heal').count(),1);
  assert.equal(await group.locator('.profile-target-name').textContent(),'仲間全員');
  assert.deepEqual(await group.locator('.profile-target-member').evaluateAll(elements=>elements.map(element=>element.dataset.member)),['ada','nio','toma','il','berg']);
  assert.deepEqual(await group.locator('.profile-target-member-name').allTextContents(),['アダ','ニオ','トーマ','イル','ベルグ']);
  assert.equal(await group.locator('[data-member="nio"] .profile-target-status').textContent(),'毒');
  assert.equal(await group.locator('.profile-target-vitals').count(),5);
  assert.ok((await group.locator('.profile-target-vitals').allTextContents()).every(text=>text.startsWith('HP ')&&!text.includes('MP')));
  assert.equal(await group.locator('.profile-target-use').isEnabled(),true);
  assert.equal(await group.locator('.profile-target-use').getAttribute('aria-label'),'仲間全員に薬草の霧を使う');
  const groupGeometry=await measure('party','group_heal'),groupReach=await reachLast('party','group_heal');
  await shot('scene-party-1280x856-all-allies');
  const beforeGroup=await page.evaluate(()=>h.snapshot());await group.locator('.profile-target-use').click();
  const afterGroup=await page.evaluate(()=>h.snapshot());
  assert.ok(afterGroup.actors.ada.hp>beforeGroup.actors.ada.hp,'All-allies healing must affect the wounded non-caster');
  assert.ok(afterGroup.actors.toma.mp<beforeGroup.actors.toma.mp,'All-allies healing must pay the caster cost');
  assert.deepEqual(afterGroup.actors.nio.statuses,['poison'],'Healing must not misreport or silently cure poison');
  checks.push({name:'all_allies',checks:'One operation with five named member states; a wounded non-caster is healed through real Core',geometry:groupGeometry,reach:groupReach});
  assert.deepEqual(errors,[]);
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:true,checks,errors},null,2)+'\n');
  console.log(JSON.stringify({passed:true,checks:checks.map(({name,checks})=>({name,checks})),errors,output},null,2));
}catch(error){
  await page?.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
  await fs.writeFile(path.join(output,'results.json'),JSON.stringify({passed:false,checks,errors,error:error.message},null,2)+'\n');
  throw error;
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
