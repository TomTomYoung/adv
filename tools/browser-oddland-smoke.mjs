// Real browser coverage for the two layouts, border choices and local services.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-oddland-browser';
await fs.mkdir(output,{recursive:true});
const types={'.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer(async(req,res)=>{try{
  const url=decodeURI(req.url.split('?')[0]);
  if(url==='/'){res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="src/view/style.css"><link rel="stylesheet" href="src/view/scene-style.css"><div id="app"></div></html>');return;}
  const file=path.join(root,url);res.setHeader('content-type',types[path.extname(file)]??'application/octet-stream');res.end(await fs.readFile(file));
}catch{res.statusCode=404;res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;const errors=[],checks=[];
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.ADV_BROWSER_EXECUTABLE,args:['--no-sandbox']});
  const page=await browser.newPage();page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.evaluate(async()=>{
    const {loadContent}=await import('/src/core/loader.js'),{GameEngine}=await import('/src/core/engine.js'),{projectGame}=await import('/src/application/projection.js'),{replaceView}=await import('/src/view/view-layout.js'),{handleGameKey}=await import('/src/view/keyboard.js'),{applyTheme,THEME_DEFAULT}=await import('/src/view/theme.js');
    applyTheme(THEME_DEFAULT);const data=await loadContent(undefined,{edition:'e2'});let g,view;
    const render=()=>view.render(projectGame(g)),dispatch=intent=>{const ok=g.dispatch(intent);render();return ok;};
    const settle=()=>{for(let i=0;i<100&&(g.state.waiting?.type==='text'||g.state.waiting?.type==='command'&&g.state.waiting.command==='result');i++)g.dispatch({type:'advance'});render();};
    window.h={get g(){return g;},get view(){return view;},dispatch,render,settle,
      start(layout){view?.destroy();g=new GameEngine(data,1907);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});g.random=()=>.999999;g.teleport('region_1_landing',15,3);view=replaceView(null,layout,document.querySelector('#app'),dispatch,{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();},
      walk(x,y){settle();const l=g.state.location,queue=[[l.x,l.y]],seen=new Map([[`${l.x},${l.y}`,null]]);for(let i=0;i<queue.length;i++){const p=queue[i];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const n=[p[0]+dx,p[1]+dy];if(g.walkable(g.map(),...n)&&!seen.has(n.join(','))){seen.set(n.join(','),p);queue.push(n);}}}if(!seen.has(`${x},${y}`))throw Error('no walking route');const route=[];for(let p=[x,y];seen.get(p.join(','));p=seen.get(p.join(',')))route.unshift(p);for(const [nx,ny] of route){const f=nx>l.x?'east':nx<l.x?'west':ny>l.y?'south':'north';while(l.facing!==f)if(!g.dispatch({type:'move',direction:'right'}))throw Error('turn rejected: '+JSON.stringify(g.state.waiting));if(!g.dispatch({type:'move',direction:'forward'}))throw Error('step rejected: '+JSON.stringify({location:g.state.location,waiting:g.state.waiting,notice:g.state.notice}));settle();}render();},
      routeLabel(id){return projectGame(g).worldTravel.actions.find(a=>a.intent.route===id).label;},
      resume(){g.load(g.save());render();}
    };
    document.addEventListener('keydown',e=>handleGameKey(e,{view,model:view.model,dispatch}));
  });
  const revealChoices=async()=>{for(let n=0;n<50&&await page.evaluate(()=>h.view.canChoose?.()===false);n++)await page.keyboard.press('Enter');};
  const click=async label=>{await revealChoices();const button=page.getByRole('button',{name:label,exact:true});await button.scrollIntoViewIfNeeded();await button.click();};
  async function cross(route){
    const label=await page.evaluate(id=>h.routeLabel(id),route);
    await click('任意調べる');await click(label);await click(label);await page.evaluate(()=>h.settle());
  }
  for(const layout of ['scene','classic'])for(const width of [1440,390]){
    await page.setViewportSize({width,height:width===390?844:1000});await page.evaluate(layout=>h.start(layout),layout);
    const initial=await page.evaluate(()=>h.g.state.worldTravel);
    await click('任意調べる');await click('探索隊を記帳してオッドランド方面へ進む（無料）');
    await page.keyboard.press('Escape');await page.keyboard.press('Escape');
    assert.deepEqual(await page.evaluate(()=>h.g.state.worldTravel),initial);
    await cross('oddland_checkpoint');assert.equal(await page.evaluate(()=>h.g.state.location.map),'e2_trade_corridor');
    await page.evaluate(()=>h.resume());
    for(const route of ['trade_refuge','border_customs','oddland_surface']){await page.evaluate(()=>h.walk(9,3));await cross(route);}
    assert.equal(await page.evaluate(()=>h.g.state.townLocation),'oddland_border');
    await click('国境宿場の補給店');await click('携行油を補充する（無料）');
    assert.equal(await page.evaluate(()=>h.g.state.light),90);
    await click('オッドランド・国境宿場へ戻る');await click('国境宿場の共同依頼所');await click('依頼掲示板を見る');
    assert.equal(await page.locator('.quest-card').count(),10);assert.ok(!(await page.locator('.quest-list').innerText()).includes('帰らない灯番'));
    if(layout==='scene'){await page.keyboard.press('Escape');}
    else await click('オッドランド・国境宿場へ戻る');
    if(await page.evaluate(()=>h.g.state.townLocation)!=='oddland_border')await click('オッドランド・国境宿場へ戻る');
    const measure=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,text:[...document.querySelectorAll('.world-travel-status')].map(e=>e.textContent).join(' '),visited:h.g.state.worldTravel.visited}));
    assert.ok(measure.document<=measure.viewport+1,`${layout} ${width}: horizontal overflow`);assert.match(measure.text,/オッドランド/);assert.ok(measure.visited.oddland);
    await page.screenshot({path:path.join(output,`${layout}-${width}-oddland.png`),fullPage:true});
    await click('国境宿場と出入窓口の石段');assert.equal(await page.evaluate(()=>h.g.state.worldTravel.returnAnchor),'oddland');
    await click('帰還印で町へ戻る');
    assert.ok((await page.locator('.story-text').allTextContents()).join(' ').includes('オッドランド')||await page.getByText(/帰還印でオッドランド/).count());
    await click('帰還する');await page.evaluate(()=>h.settle());assert.equal(await page.evaluate(()=>h.g.state.townLocation),'oddland_border');
    await click('国境宿場の共同依頼所');await click('依頼掲示板を見る');
    await page.locator('.quest-card').filter({has:page.getByRole('heading',{name:'荷台から聞こえる笛',exact:true})}).getByRole('button',{name:'依頼を受ける',exact:true}).click();
    if(layout==='scene')await page.keyboard.press('Escape');else await click('オッドランド・国境宿場へ戻る');
    if(await page.evaluate(()=>h.g.state.townLocation)!=='oddland_border')await click('オッドランド・国境宿場へ戻る');
    await click('国境宿場の荷車溜まり');await click('荷台から聞こえる笛の続きを話す');await page.evaluate(()=>h.settle());
    await click('幌を開け、声を掛ける');await page.evaluate(()=>h.settle());await page.evaluate(()=>h.resume());
    await page.screenshot({path:path.join(output,`${layout}-${width}-child-choice.png`),fullPage:true});
    await click('テオと退避所へ父を探しに行く');
    assert.equal(await page.evaluate(()=>h.g.state.stories.q291.values.teoAt),'transit');
    await click('オッドランド・国境宿場へ戻る');await click('国境宿場と出入窓口の石段');
    await page.evaluate(()=>h.walk(1,1));await cross('border_customs');await page.evaluate(()=>{h.walk(3,3);h.settle();});
    await click('親子に帰りの車を案内する');await page.evaluate(()=>h.settle());await page.evaluate(()=>h.resume());
    assert.equal(await page.evaluate(()=>h.g.state.quests.q291.outcome),'escort');
    assert.equal(await page.evaluate(()=>h.g.state.stories.q291.values.teoAt),'refuge');
    await page.evaluate(()=>h.walk(9,3));await cross('border_customs');await page.evaluate(()=>h.walk(9,3));await cross('oddland_surface');
    for(const road of ['e2_market_road','e2_pilgrim_road']){
      await click(await page.evaluate(id=>h.routeLabel(id),road+'_west'));await page.evaluate(()=>h.walk(13,5));await cross(road+'_east');
    }
    assert.equal(await page.evaluate(()=>h.g.state.townLocation),'oddland_plateau');
    await click('巡礼台地の依頼所');await click('依頼掲示板を見る');assert.equal(await page.locator('.quest-card').count(),20);
    await page.locator('.quest-card').filter({has:page.getByRole('heading',{name:'片目の聖像',exact:true})}).getByRole('button',{name:'依頼を受ける',exact:true}).click();
    if(layout==='scene')await page.keyboard.press('Escape');else await click('巡礼台地へ戻る');
    if(await page.evaluate(()=>h.g.state.townLocation)!=='oddland_plateau')await click('巡礼台地へ戻る');
    await click(await page.evaluate(()=>h.routeLabel('chapel_surface')));
    await page.evaluate(()=>{h.walk(9,11);h.dispatch({type:'story.resume',quest:'q032'});h.settle();});
    await click('覗き窓の行先を確かめ、地下牢へ回る');await page.evaluate(()=>h.resume());
    assert.ok(await page.evaluate(()=>h.g.state.journey));await page.evaluate(()=>{h.walk(1,8);h.settle();});
    await click('見通せない石の目を用意する');await page.evaluate(()=>{h.walk(9,6);h.settle();});
    await click('覗き管を塞いで不透明な目をはめる');assert.equal(await page.evaluate(()=>h.g.state.stories.q032.values.stoneAt),'party');
    await page.evaluate(()=>h.resume());await page.evaluate(()=>{h.walk(9,11);h.settle();});
    await page.screenshot({path:path.join(output,`${layout}-${width}-chapel.png`),fullPage:true});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await click('現場の結果を確かめ、依頼を終える');await page.evaluate(()=>{h.settle();h.resume();});
    assert.equal(await page.evaluate(()=>h.g.state.quests.q032.outcome),'informed');assert.equal(await page.evaluate(()=>h.g.state.stories.q032.values.stoneAt),'entry');
    await page.evaluate(()=>h.walk(1,1));await click('任意調べる');await click('地上への階段');await click('調べる');await page.evaluate(()=>h.settle());assert.equal(await page.evaluate(()=>h.g.state.townLocation),'oddland_plateau');
    await click('巡礼台地の依頼所');await click('依頼掲示板を見る');assert.equal(await page.locator('.quest-card').count(),19);
    assert.equal(await page.locator('.quest-card').filter({has:page.getByRole('heading',{name:'片目の聖像',exact:true})}).count(),0);
    await page.locator('.quest-card').filter({has:page.getByRole('heading',{name:'燃え残る図書館',exact:true})}).getByRole('button',{name:'依頼を受ける',exact:true}).click();
    if(layout==='scene')await page.keyboard.press('Escape');else await click('巡礼台地へ戻る');
    if(await page.evaluate(()=>h.g.state.townLocation)!=='oddland_plateau')await click('巡礼台地へ戻る');
    await click(await page.evaluate(()=>h.routeLabel('e2_burnt_library_surface')));await page.evaluate(()=>{h.walk(3,1);h.dispatch({type:'story.resume',quest:'q137'});h.settle();});
    await click('薬学書を選ぶ');await page.evaluate(()=>{h.walk(7,3);h.settle();h.resume();});
    await revealChoices();assert.equal(await page.getByRole('button',{name:'読み終えた本を回収する',exact:true}).count(),1,`${layout} ${width}: selected book carry option`);
    assert.ok(await page.getByRole('button',{name:'読み終えた本を回収する',exact:true}).isDisabled());
    for(let i=0;i<3;i++){await click('次の段階を読み終える');await page.evaluate(()=>h.settle());}
    await click('読み終えた本を回収する');await page.evaluate(()=>h.resume());assert.equal(await page.evaluate(()=>h.g.state.stories.q137.values.medicineAt),'party');
    await page.evaluate(()=>h.walk(1,1));await cross('e2_burnt_library_surface');await click('巡礼台地の資料受入室');await page.evaluate(()=>h.settle());
    await page.screenshot({path:path.join(output,`${layout}-${width}-library.png`),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await click('現場の結果を確かめ、依頼を終える');await page.evaluate(()=>{h.settle();h.resume();});
    assert.equal(await page.evaluate(()=>h.g.state.quests.q137.outcome),'medicine');assert.deepEqual(await page.evaluate(()=>{const v=h.g.state.stories.q137.values;return [v.medicineAt,v.familyAt,v.languageAt,v.medicinePages];}),['archive','entry','entry',3]);
    await click('巡礼台地へ戻る');await click(await page.evaluate(()=>h.routeLabel('e2_pilgrim_road_east')));await page.evaluate(()=>h.walk(1,1));await cross('e2_pilgrim_road_west');
    await click(await page.evaluate(()=>h.routeLabel('e2_village_road_west')));await page.evaluate(()=>h.walk(13,5));await cross('e2_village_road_east');
    await click('旧王領の村の依頼所');await click('依頼掲示板を見る');assert.equal(await page.locator('.quest-card').count(),40);
    const chartTitle=await page.evaluate(()=>h.g.data.quests.q061.title);
    await page.locator('.quest-card').filter({has:page.getByRole('heading',{name:chartTitle,exact:true})}).getByRole('button',{name:'依頼を受ける',exact:true}).click();
    if(layout==='scene')await page.keyboard.press('Escape');else await click('旧王領の村へ戻る');
    if(await page.evaluate(()=>h.g.state.townLocation)!=='oddland_village')await click('旧王領の村へ戻る');
    await click(await page.evaluate(()=>h.routeLabel('sunken_surface')));await page.evaluate(()=>{h.walk(9,11);h.dispatch({type:'story.resume',quest:'q061'});h.settle();});
    await click('城内で一本の線を試す');await page.evaluate(()=>{h.walk(9,5);h.settle();h.resume();});
    assert.equal(await page.evaluate(()=>h.g.state.dungeons.active.systems.air.air),36);await revealChoices();assert.ok(await page.getByRole('button',{name:'空気溜まりを示す救難図として隊へ引き継ぐ',exact:true}).isDisabled());
    await click('次の空気室へ図をたどる');await page.evaluate(()=>{h.walk(15,3);h.settle();h.resume();});assert.equal(await page.evaluate(()=>h.g.state.stories.q061.values.tested),1);
    await page.screenshot({path:path.join(output,`${layout}-${width}-sunken.png`),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await click('空気溜まりを示す救難図として隊へ引き継ぐ');assert.equal(await page.evaluate(()=>h.g.state.stories.q061.values.chartAt),'party');
    await page.evaluate(()=>h.walk(1,1));await click('任意調べる');await click('地上への階段');await click('調べる');await page.evaluate(()=>h.settle());assert.equal(await page.evaluate(()=>h.g.state.townLocation),'oddland_village');
    await click('村の救難隊詰所');await page.evaluate(()=>{h.settle();h.resume();});assert.equal(await page.evaluate(()=>h.g.state.stories.q061.values.chartAt),'rescue');
    await click('現場の結果を確かめ、依頼を終える');await page.evaluate(()=>{h.settle();h.resume();});assert.equal(await page.evaluate(()=>h.g.state.quests.q061.outcome),'informed');
    await click('旧王領の村へ戻る');await click(await page.evaluate(()=>h.routeLabel('observatory_surface')));await page.evaluate(()=>h.resume());assert.equal(await page.evaluate(()=>h.g.state.worldTravel.returnAnchor),'oddland_village');
    await click('任意調べる');await click('地上への階段');await click('調べる');await page.evaluate(()=>h.settle());assert.equal(await page.evaluate(()=>h.g.state.townLocation),'oddland_village');
    const acceptVillage=async id=>{
      await click('旧王領の村の依頼所');await click('依頼掲示板を見る');
      const title=await page.evaluate(id=>h.g.data.quests[id].title,id);
      await page.locator('.quest-card').filter({has:page.getByRole('heading',{name:title,exact:true})}).getByRole('button',{name:'依頼を受ける',exact:true}).click();
      if(layout==='scene')await page.keyboard.press('Escape');else await click('旧王領の村へ戻る');
      if(await page.evaluate(()=>h.g.state.townLocation)!=='oddland_village')await click('旧王領の村へ戻る');
    };
    await acceptVillage('q169');await click('マオの家');await click('誰にも贈れない指輪の続きを話す');await page.evaluate(()=>h.settle());
    await click('指輪を預かり、旅仲間の今の家へ届ける');await click('旧王領の村へ戻る');await click('かつての旅仲間の家');await page.evaluate(()=>{h.settle();h.resume();});
    assert.equal(await page.evaluate(()=>h.g.state.stories.q169.values.ringAt),'party');
    await click('旅以外の交流も断るのか、返事として確認する');await page.evaluate(()=>h.settle());await click('二つの返事を分けて預かり、マオへ戻る');
    await click('旧王領の村へ戻る');await click('マオの家');await page.evaluate(()=>h.settle());await click('受け取ったと嘘をつき、指輪を隠す');
    await click('旧王領の村へ戻る');await click('村の航路記録室');await page.evaluate(()=>{h.settle();h.resume();});
    await click('手紙を持ってマオへ戻る');assert.equal(await page.evaluate(()=>h.g.state.stories.q169.values.letterAt),'party');
    await click('旧王領の村へ戻る');await click('マオの家');await page.evaluate(()=>{h.settle();h.resume();});
    await revealChoices();await page.screenshot({path:path.join(output,`${layout}-${width}-ring-return.png`),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await click('指輪を返し、虚偽の報告を認める');await page.evaluate(()=>{h.settle();h.resume();});assert.equal(await page.evaluate(()=>h.g.state.quests.q169.outcome),'corrected');assert.equal(await page.evaluate(()=>h.g.state.stories.q169.values.ringAt),'mao');
    await click('旧王領の村へ戻る');await acceptVillage('q170');await click('旧王領の村の港');await click('別れるための冒険の続きを話す');await page.evaluate(()=>h.settle());
    await click('セフと湖の渡し場へ向かう');await click('旧王領の村へ戻る');await click(await page.evaluate(()=>h.routeLabel('e2_royal_lakeshore_surface')));await page.evaluate(()=>{h.walk(13,7);h.settle();});
    await click('セフと島の野営地へ向かう');await cross('royal_lake_boat');await page.evaluate(()=>{h.walk(9,5);h.settle();h.resume();});assert.equal(await page.evaluate(()=>h.g.state.location.map),'e2_royal_island');
    await click('戦う以外の役割で残りたいか、本人へ聞く');await page.evaluate(()=>h.settle());await click('一便だけの役割と出発日を合意する');
    await page.evaluate(()=>h.walk(1,1));await cross('royal_lake_boat');await page.evaluate(()=>h.settle());assert.equal(await page.evaluate(()=>h.g.state.stories.q170.values.sefAt),'shore');
    await click('セフと補給店へ行く');await page.evaluate(()=>h.walk(1,1));await cross('e2_royal_lakeshore_surface');await click('旧王領の村の補給店');await page.evaluate(()=>h.settle());
    await click('一便の荷をセフと港へ運ぶ');await page.evaluate(()=>h.resume());assert.equal(await page.evaluate(()=>h.g.state.stories.q170.values.cargoAt),'party');
    await click('旧王領の村へ戻る');await click('旧王領の村の港');await page.evaluate(()=>h.settle());await revealChoices();
    await page.screenshot({path:path.join(output,`${layout}-${width}-last-freight.png`),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await click('相手と結果を確かめ、依頼を終える');await page.evaluate(()=>{h.settle();h.resume();});assert.equal(await page.evaluate(()=>h.g.state.quests.q170.outcome),'role');assert.equal(await page.evaluate(()=>h.g.state.stories.q170.values.cargoAt),'entry');
    const actionLabel=async(id,choice)=>page.evaluate(({id,choice})=>h.g.data.quests[id].model.graph.find(n=>n.id===h.g.state.stories[id].scene).options.find(a=>a.id===choice).text,{id,choice});
    const act=async(id,choice)=>{await click(await actionLabel(id,choice));await page.evaluate(()=>{h.settle();h.resume();});};
    const at=async(id,place)=>{await page.evaluate(({id,place})=>{const p=h.g.data.quests[id].story.worldPlaces[place];h.walk(p.x,p.y);h.settle();h.resume();},{id,place});};
    const enterOrrery=async()=>{
      await click(await page.evaluate(()=>h.routeLabel('observatory_surface')));await page.evaluate(()=>h.walk(13,12));await click('任意調べる');await click('地下二層への階段');await click('調べる');await page.evaluate(()=>h.settle());await at('q089','entry');
    };
    const leaveOrrery=async()=>{
      await page.evaluate(()=>h.walk(1,1));await click('任意調べる');await click('地下一層への階段');await click('調べる');await page.evaluate(()=>{h.settle();h.walk(1,1);});await click('任意調べる');await click('地上への階段');await click('調べる');await page.evaluate(()=>h.settle());
    };
    await click('旧王領の村へ戻る');await acceptVillage('q089');await enterOrrery();await page.evaluate(()=>{h.dispatch({type:'story.resume',quest:'q089'});h.settle();});await act('q089','turn');
    await revealChoices();assert.ok(await page.getByRole('button',{name:await actionLabel('q089','switch'),exact:true}).isDisabled());
    for(const [key,facility] of [['wedding','村の集会所'],['wages','観測器の工房']]){
      await act('q089',key);assert.equal(await page.evaluate(key=>h.g.state.stories.q089.values[key],key),false);await leaveOrrery();await click(facility);await page.evaluate(()=>{h.settle();h.resume();});assert.equal(await page.evaluate(key=>h.g.state.stories.q089.values[key],key),true);await act('q089','return');await click('旧王領の村へ戻る');await enterOrrery();
    }
    await revealChoices();await page.screenshot({path:path.join(output,`${layout}-${width}-orrery-calendar.png`),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await act('q089','switch');assert.equal(await page.evaluate(()=>h.g.state.quests.q089.outcome),'informed');await leaveOrrery();
    await acceptVillage('q182');await click(await page.evaluate(()=>h.routeLabel('e2_observatory_artillery_surface')));await page.evaluate(()=>{h.dispatch({type:'story.resume',quest:'q182'});h.settle();});await act('q182','deploy');await at('q182','gun');
    await revealChoices();assert.ok(await page.getByRole('button',{name:await actionLabel('q182','light'),exact:true}).isDisabled());
    for(const key of ['command','evac']){await act('q182',key);await at('q182',key);await act('q182','return');await at('q182','gun');}
    await act('q182','light');assert.deepEqual(await page.evaluate(()=>{const v=h.g.state.stories.q182.values;return [v.charge,v.spent,v.evacueesAt];}),[0,1,'evac']);await act('q182','join');await at('q182','evac');await act('q182','escort');assert.equal(await page.evaluate(()=>h.g.state.stories.q182.values.evacueesAt),'transit');await at('q182','safe');
    await revealChoices();await page.screenshot({path:path.join(output,`${layout}-${width}-evacuation.png`),fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await act('q182','finish');assert.equal(await page.evaluate(()=>h.g.state.quests.q182.outcome),'light');assert.equal(await page.evaluate(()=>h.g.state.stories.q182.values.evacueesAt),'safe');
    await page.evaluate(()=>h.walk(1,1));await cross('e2_observatory_artillery_surface');assert.equal(await page.evaluate(()=>h.g.state.townLocation),'oddland_village');
    checks.push({layout,width,...measure,quests:{q291:'escort',q032:'informed',q137:'medicine',q061:'informed',q169:'corrected',q170:'role',q089:'informed',q182:'light'},chapelReturn:'oddland_plateau',royalReturn:'oddland_village'});
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'result.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,errors,output}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
