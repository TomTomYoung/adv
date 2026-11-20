import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {chromium} from 'playwright';
import {createQuestTrial,questTrialReport} from '../src/application/quest-playtest.js';
import {drain,fight} from '../tests/helpers.mjs';

const footprints=process.argv.includes('--q091');
const {data,catalog,routes,arrive,expectedValues}=footprints
  ?await import('../tests/q091-helpers.mjs')
  :await import('../tests/market-world-helpers.mjs');
const level=footprints?10:6;
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
          if(footprints&&intent.id==='return'){
            const waiting=await page.evaluate(()=>{
              const g=questPlaytest.trial.engine,save=g.save();g.load(save);questPlaytest.render();
              const {restChecked,journalAt}=g.state.stories.q091.values;
              return {same:g.save()===save,restChecked,journalAt,action:g.state.journey?.action};
            });
            assert.deepEqual(waiting,{same:true,restChecked:true,journalAt:'noa',action:'checked_return'});
          }
          if(intent.id==='fight'&&(quest==='q059'||quest==='q060')){
            const encounter=await page.evaluate(()=>{
              const g=questPlaytest.trial.engine,save=g.save();
              g.load(save);questPlaytest.render();
              return g.save()===save&&g.state.battle?.encounter;
            });
            assert.equal(encounter,quest==='q059'?'guard_6':'boss_6');
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
