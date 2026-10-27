// Real browser coverage for the two layouts, border choices and local services.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {createRequire} from 'node:module';
import {settlementCheckpoint} from './browser-settlement-checkpoint.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?`${process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES}/playwright`:'playwright');
const root=path.resolve(import.meta.dirname,'..'),output=process.env.ADV_BROWSER_OUTPUT??'/tmp/adv-salome-browser';
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
      start(layout){view?.destroy();g=new GameEngine(data,1907);while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});g.random=()=>.999999;view=replaceView(null,layout,document.querySelector('#app'),dispatch,{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();},
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
    await click('任意調べる');
    if(route==='library_surface'){await click('地上への階段');await click('調べる');}
    else{await click(label);await click(label);}
    await page.evaluate(()=>h.settle());
  }
  async function stairs(){
    const name=await page.evaluate(()=>{h.settle();const s=h.g.map().objects.find(o=>o.id==='stairs');h.walk(s.x,s.y);return s.name;});
    await click('任意調べる');await click(name);await click('調べる');await page.evaluate(()=>h.settle());
  }
  for(const layout of ['scene','classic'])for(const width of [1440,390]){
    await page.setViewportSize({width,height:width===390?844:1000});await page.evaluate(layout=>h.start(layout),layout);
    assert.ok(await page.getByRole('button',{name:'学術都市サロメへの乗合便（5G）',exact:true}).isDisabled());
    await click('灯帰りから高台街道へ');await page.evaluate(()=>h.walk(13,5));await cross('salome_road_slope');
    assert.equal(await page.evaluate(()=>h.g.state.worldTravel.visited.salome),undefined);await page.evaluate(()=>h.resume());
    await page.evaluate(()=>h.walk(13,5));await cross('salome_road_gate');assert.equal(await page.evaluate(()=>h.g.state.townLocation),'e2_academy');
    await settlementCheckpoint(page,{location:'e2_academy',asset:'salome_gate',layout,width,output});
    assert.equal(await page.evaluate(()=>h.g.state.worldTravel.visited.salome),true);assert.deepEqual(await page.evaluate(()=>h.g.state.worldTravel.registrations),{});
    await click('サロメの補給店');await click('携行油を補充する（無料）');assert.equal(await page.evaluate(()=>h.g.state.light),90);
    await click('サロメ・学門前へ戻る');await click('サロメの共同依頼所');await click('依頼掲示板を見る');
    assert.equal(await page.locator('.quest-card').count(),60);
    await page.locator('.quest-card').filter({has:page.getByRole('heading',{name:'借りたままの一冊',exact:true})}).getByRole('button',{name:'依頼を受ける',exact:true}).click();
    if(layout==='scene')await page.keyboard.press('Escape');else await click('サロメ・学門前へ戻る');
    if(await page.evaluate(()=>h.g.state.townLocation)!=='e2_academy')await click('サロメ・学門前へ戻る');
    await click('学術都市・灰時計の書庫受付');await click('借りたままの一冊の続きを話す');await page.evaluate(()=>h.settle());
    await click('現場へ向かう');await page.evaluate(()=>{h.settle();h.resume();});assert.ok(await page.evaluate(()=>h.g.state.journey));
    await click('灰時計の書庫・踏査回廊');await page.evaluate(()=>h.settle());
    const choice=await page.evaluate(()=>h.g.data.quests.q241.model.graph.find(n=>n.id==='survey').options[0].text);
    await click(choice);await page.evaluate(()=>h.settle());
    await page.screenshot({path:path.join(output,`${layout}-${width}-archive.png`),fullPage:true});
    await click('依頼の出発地点へ戻る');await page.evaluate(()=>h.settle());await click('学術都市・灰時計の書庫受付へ戻る');await page.evaluate(()=>h.settle());
    await click('この件を終える');await page.evaluate(()=>{h.settle();h.resume();});assert.equal(await page.evaluate(()=>h.g.state.quests.q241.stage),'completed');
    await click('サロメ・学門前へ戻る');
    // The relocated regional request uses the same city but a real dungeon,
    // an interior resident, and a separate lending/tenancy desk.
    await click('サロメの共同依頼所');await click('依頼掲示板を見る');
    await page.locator('.quest-card').filter({has:page.getByRole('heading',{name:'返却日のない本',exact:true})}).getByRole('button',{name:'依頼を受ける',exact:true}).click();
    if(layout==='scene')await page.keyboard.press('Escape');else await click('サロメ・学門前へ戻る');
    if(await page.evaluate(()=>h.g.state.townLocation)!=='e2_academy')await click('サロメ・学門前へ戻る');
    const libraryGate=await page.evaluate(()=>h.routeLabel('library_surface'));
    await click(libraryGate);await page.evaluate(()=>{h.settle();h.walk(15,5);if(!h.dispatch({type:'story.resume',quest:'q041'}))throw Error('library resume');h.settle();});
    await click('本を持たず、その住所を訪ねる');await page.evaluate(()=>{h.settle();h.resume();h.walk(7,1);h.settle();});
    await click('居住の意思を確認し、司書をここへ招く');await page.evaluate(()=>{h.settle();h.walk(1,1);});await cross('library_surface');
    await click('学術都市・灰時計の書庫受付');await click('書庫の貸出・居住契約窓口');await page.evaluate(()=>h.settle());
    await click('司書と住所印の部屋へ戻る');await page.evaluate(()=>{h.settle();h.resume();});assert.equal(await page.evaluate(()=>h.g.state.stories.q041.values.clerkAt),'transit');
    await click('学術都市・灰時計の書庫受付へ戻る');await click('サロメ・学門前へ戻る');await click(libraryGate);await page.evaluate(()=>{h.settle();h.walk(7,1);h.settle();});
    await click('本の貸出と人の移住を分けた台帳へ直す');await page.evaluate(()=>{h.settle();h.walk(1,1);});await cross('library_surface');
    await click('学術都市・灰時計の書庫受付');await click('書庫の貸出・居住契約窓口');await page.evaluate(()=>h.settle());
    await page.screenshot({path:path.join(output,`${layout}-${width}-library-register.png`),fullPage:true});
    await click('相手と結果を確かめ、依頼を終える');await page.evaluate(()=>{h.settle();h.resume();});
    assert.equal(await page.evaluate(()=>h.g.state.quests.q041.outcome),'informed');assert.equal(await page.evaluate(()=>h.g.state.stories.q041.values.clerkAt),'registry');
    await click('学術都市・灰時計の書庫受付へ戻る');await click('サロメ・学門前へ戻る');
    // Permission to use a song never becomes permission to escort its composer.
    await click('サロメの共同依頼所');await click('依頼掲示板を見る');
    await page.locator('.quest-card').filter({has:page.getByRole('heading',{name:'音の出ない優勝旗',exact:true})}).getByRole('button',{name:'依頼を受ける',exact:true}).click();
    if(layout==='scene')await page.keyboard.press('Escape');else await click('サロメ・学門前へ戻る');
    if(await page.evaluate(()=>h.g.state.townLocation)!=='e2_academy')await click('サロメ・学門前へ戻る');
    await click(libraryGate);await page.evaluate(()=>{h.settle();h.walk(3,1);if(!h.dispatch({type:'story.resume',quest:'q141'}))throw Error('second-half resume');h.settle();});
    await click('サナへ曲と出演を別々に相談する');await page.evaluate(()=>{h.settle();h.walk(1,1);});await cross('library_surface');
    await click('サロメの共同洗濯場');await page.evaluate(()=>h.settle());await click('出演を求めず、許諾した対旋律を使う');await page.evaluate(()=>{h.settle();h.resume();});
    assert.equal(await page.evaluate(()=>h.g.state.stories.q141.values.sanaAt),'laundry');assert.equal(await page.evaluate(()=>h.g.state.stories.q141.values.performerAgreed),false);
    await click('サロメ・学門前へ戻る');await click('学術都市・灰時計の書庫受付');await click('書庫の控え・写本室');await page.evaluate(()=>h.settle());
    await click('許諾された楽譜と旗を本番会場へ運ぶ');await page.evaluate(()=>{h.settle();h.resume();});await click('学術都市・灰時計の書庫受付へ戻る');await click('サロメ・学門前へ戻る');await click('サロメの祭の舞台');await page.evaluate(()=>h.settle());
    await page.screenshot({path:path.join(output,`${layout}-${width}-library-composer.png`),fullPage:true});await click('相手と結果を確かめ、依頼を終える');await page.evaluate(()=>{h.settle();h.resume();});
    assert.equal(await page.evaluate(()=>h.g.state.quests.q141.outcome),'use');assert.equal(await page.evaluate(()=>h.g.state.stories.q141.values.sanaAt),'laundry');await click('サロメ・学門前へ戻る');
    // The quiet delivery must pass the actual canal before the recipient can receive it.
    await click('サロメの共同依頼所');await click('依頼掲示板を見る');
    await page.locator('.quest-card').filter({has:page.getByRole('heading',{name:'一番遅い配達',exact:true})}).getByRole('button',{name:'依頼を受ける',exact:true}).click();
    if(layout==='scene')await page.keyboard.press('Escape');else await click('サロメ・学門前へ戻る');
    if(await page.evaluate(()=>h.g.state.townLocation)!=='e2_academy')await click('サロメ・学門前へ戻る');
    await click(libraryGate);await stairs();await page.evaluate(()=>{h.walk(4,1);if(!h.dispatch({type:'story.resume',quest:'q147'}))throw Error('flower resume');h.settle();});
    await click('時間をかけ、静かな水路で届ける');await page.evaluate(()=>{h.settle();h.resume();});await stairs();await page.evaluate(()=>h.walk(1,1));await cross('library_surface');
    await click('サロメから静かな水路沿いへ');await page.evaluate(()=>{h.settle();h.walk(9,3);h.settle();h.resume();});assert.equal(await page.evaluate(()=>h.g.state.stories.q147.values.deliveryMode),'water');
    await click('荷を静かに保ち、受取先へ運ぶ');await page.evaluate(()=>{h.settle();h.walk(15,5);});await cross('salome_canal_lower');await page.evaluate(()=>h.walk(1,1));await cross('salome_road_home');
    await click('灯帰りの引退した舞踊家の家');await page.evaluate(()=>h.settle());assert.equal(await page.evaluate(()=>h.g.state.stories.q147.values.flowerAt),'party');
    await page.screenshot({path:path.join(output,`${layout}-${width}-library-flower.png`),fullPage:true});await click('相手と結果を確かめ、依頼を終える');await page.evaluate(()=>{h.settle();h.resume();});
    assert.equal(await page.evaluate(()=>h.g.state.quests.q147.outcome),'quiet');assert.equal(await page.evaluate(()=>h.g.state.stories.q147.values.flowerAt),'receiver');await click('灯帰り・篝火広場へ戻る');
    await click('学術都市サロメへの乗合便（5G）');
    const gold=await page.evaluate(()=>h.g.state.gold);await click('灯帰りへの乗合便（5G）');assert.equal(await page.evaluate(()=>h.g.state.townLocation),'hikarigaeri_square');assert.equal(await page.evaluate(()=>h.g.state.gold),gold-5);
    await click('学術都市サロメへの乗合便（5G）');assert.equal(await page.evaluate(()=>h.g.state.townLocation),'e2_academy');
    await click('サロメの学門と高台街道');await page.evaluate(()=>h.walk(1,1));await cross('salome_road_slope');await page.evaluate(()=>{h.walk(1,1);h.resume();});await cross('salome_road_home');
    assert.equal(await page.evaluate(()=>h.g.state.townLocation),'hikarigaeri_square');
    const measure=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,steps:h.g.state.steps,visited:h.g.state.worldTravel.visited,quest:h.g.state.quests.q241.outcome}));
    assert.ok(measure.document<=measure.viewport+1,`${layout} ${width}: horizontal overflow`);
    await page.screenshot({path:path.join(output,`${layout}-${width}-return.png`),fullPage:true});checks.push({layout,width,...measure});
  }
  assert.deepEqual(errors,[]);await fs.writeFile(path.join(output,'result.json'),JSON.stringify({checks,errors},null,2));console.log(JSON.stringify({checks:checks.length,errors,output}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
