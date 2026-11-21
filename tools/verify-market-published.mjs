import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';
import {createQuestTrial,questTrialReport} from '../src/application/quest-playtest.js';
import {drain,fight} from '../tests/helpers.mjs';

const suite=process.argv[2]??'market';
const suites={market:()=>import('../tests/market-world-helpers.mjs'),'--q091':()=>import('../tests/q091-helpers.mjs'),'--q092':()=>import('../tests/q092-helpers.mjs'),'--q093':()=>import('../tests/q093-helpers.mjs'),'--q094':()=>import('../tests/q094-helpers.mjs'),'--q095':()=>import('../tests/q095-helpers.mjs')};
assert.ok(Object.hasOwn(suites,suite),'Unknown published trial suite');
const {data,catalog,routes,arrive,expectedValues}=await suites[suite]();
const level=suite==='market'?6:10;
const base='https://tomtomyoung.github.io/adv/',hash=b=>createHash('sha256').update(b).digest('hex');
const quests=Object.keys(routes),files=['runtime.json','data/scenario-editions.json','data/scenario-editions/e2/geography.json',
  'data/scenario-editions/e2/companions.json','playtests/quest-parties.json',...quests.flatMap(q=>['data/quests/'+q+'.json','data/scenario-editions/e2/'+q+'.json'])];
async function verifyFile(path){
  const expected=hash(await readFile(path)),until=Date.now()+8*60_000;
  while(Date.now()<until){
    try{
      const response=await fetch(base+path+'?release='+process.env.GITHUB_SHA+'&attempt='+Date.now(),{signal:AbortSignal.timeout(20000)});
      if(response.ok&&hash(Buffer.from(await response.arrayBuffer()))===expected)return;
    }catch(error){console.log('Retry release file',path,error.message);}
    await delay(5000);
  }
  throw Error('Published file differs: '+path);
}
await Promise.all(files.map(verifyFile));console.log('Verified release files',files.length);

function trace(quest,route){
  const trial=createQuestTrial(data,catalog,{quest,party:'balanced',level,start:'site',outcome:route.outcome,battleMode:'classic',seed:1907});
  const g=trial.engine,commands=[],dispatch=g.dispatch.bind(g);
  g.dispatch=intent=>{const ok=dispatch(intent);if(ok)commands.push(intent);return ok;};
  drain(g);
  for(const id of route.path){
    assert.ok(g.dispatch({type:'choose',id}));drain(g);
    if(g.state.battle){fight(g);drain(g);}
    if(g.state.journey)arrive(g,quest);
  }
  return {commands,report:questTrialReport(trial)};
}

const browser=await chromium.launch({args:['--no-sandbox']});
try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],q038=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(new URL(r.url()).pathname.endsWith('/e2/q038.json'))q038.push(r.status());});
  const url=base+'quest-party-playtest.html?edition=e2&quest='+quests[0]+'&party=balanced&level='+level+'&start=site&outcome=informed&seed=1907&battleMode=classic';
  assert.equal((await page.goto(url,{waitUntil:'domcontentloaded'})).status(),200);
  await page.locator('#launch:enabled').waitFor({timeout:120000});
  assert.ok(q038.includes(200));await page.selectOption('#effects','off');
  for(const [quest,paths] of Object.entries(routes)){
    await page.selectOption('#quest',quest);
    for(const route of paths){
      const {commands,report}=trace(quest,route);
      await page.selectOption('#outcome',route.outcome);await page.click('#launch');
      await page.waitForFunction(q=>window.questPlaytest?.trial?.engine?.state.quests[q]?.stage==='active',quest);
      for(const intent of commands){
        if(intent.type==='choose'&&route.path.includes(intent.id)){
          const button=page.locator('#app [data-focus="choice:'+intent.id+'"]:visible');
          for(let n=0;n<25&&!await button.isVisible();n++)await page.locator('#app [data-focus="message:next"]:visible').click({timeout:7000});
          await button.click({timeout:10000});
          if(quest==='q091'&&intent.id==='return'){
            const waiting=await page.evaluate(()=>{
              const g=questPlaytest.trial.engine,save=g.save();g.load(save);questPlaytest.render();
              const {restChecked,journalAt}=g.state.stories.q091.values;
              return {same:g.save()===save,restChecked,journalAt,action:g.state.journey?.action};
            });
            assert.deepEqual(waiting,{same:true,restChecked:true,journalAt:'noa',action:'checked_return'});
          }
if(quest==='q095'&&['back','match','deliver','carry','hand'].includes(intent.id)){
            const result=await page.evaluate(()=>{
              const g=questPlaytest.trial.engine,save=g.save();g.load(save);questPlaytest.render();
              const {stripAt,sheetAt,finished}=g.state.stories.q095.values;
              return {same:g.save()===save,stripAt,sheetAt,finished,journey:g.state.journey?.action??null};
            });
            const studied=route.old[0]==='timeline';
            const journeys={back:'carrying_back',deliver:studied?'wallDraft_deliver':'portrait_deliver',carry:'pages_carry'};
            assert.deepEqual(result,{same:true,stripAt:intent.id==='back'?'party':studied?'teo':'rack',
              sheetAt:['back','match'].includes(intent.id)?'teo':intent.id==='hand'?'mason':'party',
              finished:false,journey:journeys[intent.id]??null});
          }
          if(quest==='q094'&&['advance','pay','rise'].includes(intent.id)){
            const saved=await page.evaluate(()=>{
              const trial=questPlaytest.trial,g=trial.engine,raw=g.save();
              g.load(raw);questPlaytest.render();
              const {payment,rescue,woundedAt}=g.state.stories.q094.values;
              return {same:g.save()===raw,payment,rescue,woundedAt,gold:g.state.gold,initial:trial.gold,pending:g.state.journey?.action};
            });
            assert.ok(saved.same);
            if(intent.id==='rise'){
              assert.equal(saved.pending,'aboard_rise');assert.equal(saved.rescue,'aboard');assert.equal(saved.woundedAt,'transit');
            }else{
              assert.equal(saved.payment,intent.id==='advance'?'advance':'afterReview');assert.equal(saved.rescue,'waiting');
              assert.equal(saved.gold,saved.initial-30);
            }
          }
          if(quest==='q093'&&['back','next','gate'].includes(intent.id)){
            const saved=await page.evaluate(()=>{
              const g=questPlaytest.trial.engine,raw=g.save();g.load(raw);questPlaytest.render();
              const {oneName,dated,passOneAt,passTwoAt}=g.state.stories.q093.values;
              return {same:g.save()===raw,pending:g.state.journey?.action,oneName,dated,passOneAt,passTwoAt};
            });
            assert.ok(saved.same);
            if(intent.id==='back'){
              assert.ok(['restored_back','dated_back'].includes(saved.pending));
              if(saved.pending==='restored_back')assert.equal(saved.oneName,'returned');else assert.equal(saved.dated,true);
            }else{
              assert.equal(saved.pending,intent.id==='next'?'firstReady_next':'bothReady_gate');
              assert.equal(saved.passOneAt,'guestOne');assert.equal(saved.passTwoAt,intent.id==='next'?'party':'guestTwo');
            }
          }
          if(quest==='q092'&&['walk','escort','carry'].includes(intent.id)){
            const occupants=await page.evaluate(()=>{
              const g=questPlaytest.trial.engine,save=g.save();g.load(save);questPlaytest.render();
              const {aboard,shellAt,crewAt,opening}=g.state.stories.q092.values;
              return {same:g.save()===save,aboard,shellAt,crewAt,opening};
            });
            const riding=intent.id==='walk';
            assert.deepEqual(occupants,{same:true,aboard:riding,shellAt:riding?'transit':'track',crewAt:'transit',
              opening:riding?'closed':intent.id==='escort'?'hatch':'breach'});
          }
          if((intent.id==='fight'&&(quest==='q059'||quest==='q060'))||(quest==='q092'&&intent.id==='cut')||(quest==='q094'&&intent.id==='free')){
            const encounter=await page.evaluate(()=>{
              const g=questPlaytest.trial.engine,save=g.save();
              g.load(save);questPlaytest.render();
              return g.save()===save&&g.state.battle?.encounter;
            });
            assert.equal(encounter,{q059:'guard_6',q060:'boss_6',q092:'guard_10',q094:'guard_10'}[quest]);
            console.log('PUBLIC_BATTLE_SAVE',quest,encounter);
          }
        }else if(intent.type!=='advance'||!await page.evaluate(()=>questPlaytest.report().status==='cleared')){
          assert.ok(await page.evaluate(i=>questPlaytest.dispatch(i),intent),JSON.stringify({quest,intent}));
        }
      }
      const result=await page.evaluate(q=>{
        const g=questPlaytest.trial.engine,save=g.save();
        g.load(save);questPlaytest.render();
        return {same:g.save()===save,report:questPlaytest.report(),values:g.state.stories[q].values};
      },quest);
      assert.ok(result.same);assert.equal(result.report.status,'cleared');assert.equal(result.report.outcome,route.outcome);
      assert.equal(result.report.steps,report.steps);assert.deepEqual(result.report.gold,report.gold);
      assert.deepEqual(result.report.records,report.records);assert.equal(result.report.rescues,0);
      for(const [key,value] of Object.entries(expectedValues(quest,route)))assert.equal(result.values[key],value,quest+'/'+key);
      console.log('PUBLIC',quest,route.old.join('/'),result.report.outcome,result.report.steps);
    }
  }
if(suite==='--q095'){
    const {previous,openOldDecision}=await import('../tests/q095-helpers.mjs');
    const q='q095',original=createQuestTrial(previous,catalog,{quest:q,party:'balanced',level,start:'reception',outcome:'contract',battleMode:'classic',seed:1907}).engine;
    openOldDecision(original,'review');
    const winsBefore=original.state.records.wins;
    assert.ok(original.dispatch({type:'choose',id:'contract'}));drain(original);
    assert.equal(original.state.battle.encounter,'guard_10');
    const save=original.save(),commands=[],dispatch=original.dispatch.bind(original);
    original.dispatch=intent=>{const changed=dispatch(intent);if(changed)commands.push(intent);return changed;};
    fight(original);assert.equal(original.state.quests[q].outcome,'contract');
    await page.selectOption('#outcome','contract');await page.click('#launch');
    await page.waitForFunction(()=>questPlaytest.trial.engine.state.quests.q095.stage==='active');
    const loaded=await page.evaluate(save=>{
      const g=questPlaytest.trial.engine;g.load(save);const migrated=g.save();g.load(migrated);questPlaytest.render();
      return [g.state.flags.legacyStoryRoutes.q095,g.state.battle?.encounter,g.save()===migrated,g.map().id,g.state.location.x,g.state.location.y];
    },save);
    assert.deepEqual(loaded,[true,'guard_10',true,'region_10_f1',13,8]);
    for(const intent of commands){
      if(await page.evaluate(()=>questPlaytest.report().status==='cleared'))break;
      assert.ok(await page.evaluate(i=>questPlaytest.dispatch(i),intent));
    }
    const result=await page.evaluate(()=>{
      const r=questPlaytest.report();return [r.status,r.outcome,r.records.wins,r.gold.end,questPlaytest.trial.engine.state.actors.ada.xp];
    });
    assert.deepEqual(result,['cleared','contract',winsBefore+1,original.state.gold,original.state.actors.ada.xp]);
    console.log('PUBLIC_LEGACY_BATTLE_SAVE',q,'guard_10','contract');
  }
  let attempts=0;const first=q038.length;
  await page.route(url=>url.pathname.endsWith('/e2/q038.json'),async request=>{
    if(++attempts===1)await request.fulfill({status:503,body:'Temporary outage'});
    else await request.continue();
  });
  await page.reload({waitUntil:'domcontentloaded'});await page.locator('#launch:enabled').waitFor({timeout:120000});
  const statuses=q038.slice(first);
  assert.equal(statuses[0],503);assert.ok(statuses.includes(200));assert.ok(attempts>=2);
  assert.equal(await page.locator('#trial-status button').count(),0);assert.deepEqual(errors,[]);
  console.log('q038 automatic recovery',statuses);
}finally{await browser.close();}
