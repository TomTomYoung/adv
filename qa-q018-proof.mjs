import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
const output='/tmp/adv-q018-proof',base=process.env.PROOF_ORIGIN;
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.setDefaultTimeout(15000);
const errors=[];page.on('pageerror',err=>errors.push(err.message));
try{
  for(const p of ['runtime.json','data/scenario-editions.json','data/scenario-editions/e2/q018.json','data/scenario-editions/e2/geography.json','data/scenario-editions/e2/companions.json','playtests/quest-parties.json']){
    const r=await page.request.get(base+'/'+p+'?q018='+Date.now());assert.ok(r.ok(),p+' '+r.status());assert.ok((await r.body()).equals(await readFile(p)),p);
  }
  const url=base+'/quest-party-playtest.html?edition=e2&quest=q018&party=balanced&level=2&start=site&outcome=compromise&seed=1907';
  await page.goto(url);await page.locator('#launch:enabled').waitFor();await page.selectOption('#effects','off');await page.click('#launch');
  await page.waitForFunction(()=>window.questPlaytest?.trial.engine.state.stories.q018);
  const route=['copy','check','meet','call','escort','split','verify','stamp','line','break','borrower','ow'];
  let decisions=0,moves=0,frames=0;const history=[];
  for(let i=0;i<210;i++){
    const state=await page.evaluate(()=>{
      const {engine}=questPlaytest.trial,{state,data}=engine,s=state.stories.q018;
      const j=state.journey,here=state.townLocation,story=data.quests.q018.story;
      let command;
      if(j){
        const target=story.worldPlaces[story.actions[j.action].journey.to].location;
        if(target===here)command='白い借金の続きを話す';
        else{
          const places=data.locations,parents=id=>{const out=[];for(let k=id;k;k=places[k].parent)out.push(k);return out;};
          const chain=parents(target),common=parents(here).find(k=>chain.includes(k));
          if(!common)throw Error('別の町へは移動できません');
          const next=here===common?chain[chain.indexOf(common)-1]:places[here].parent;
          command=places[next].name+(next===places[here].parent?'へ戻る':'');
        }
      }
      return {status:questPlaytest.report().status,scene:s.scene,command,journey:!!j,here,v:s.values,gold:state.gold};
    });
    if(state.status==='cleared')break;
    const next=page.locator('#app [data-focus="message:next"]:visible');
    if(await next.count()){await next.click();frames++;continue;}
    if(state.journey){
      await page.locator('#app .location-choices:visible').getByRole('button',{name:state.command,exact:true}).click();
      if(state.command!=='白い借金の続きを話す')moves++;continue;
    }
    const id=route[decisions];assert.ok(id,'route exhausted before report');
    const btn=page.locator('#app [data-focus="choice:'+id+'"]:visible');await btn.waitFor();
    if(['meeting','agreed','marked','one_half'].includes(state.scene)){
      history.push({scene:state.scene,payment:state.v.paymentConfirmed,installment:state.v.installmentAt,tablet:state.v.tabletAt,borrowerHalf:state.v.borrowerHalfAt,owHalf:state.v.owHalfAt,gold:state.gold});
      await page.locator('#app').screenshot({path:output+'/'+state.scene+'.png'});
    }
    await btn.click();decisions++;
  }
  const report=await page.evaluate(()=>questPlaytest.report());
  assert.equal(decisions,route.length);assert.equal(report.status,'cleared');assert.equal(report.outcome,'compromise');
  assert.equal(report.rescues,0);assert.equal(report.gold.end-report.gold.start,44);
  assert.ok(history.some(x=>x.scene==='meeting'&&x.payment&&x.installment==='official'));
  assert.ok(history.some(x=>x.scene==='one_half'&&x.borrowerHalf==='borrower'&&x.owHalf==='official'));
  assert.deepEqual(errors,[]);await page.locator('#trial-result').screenshot({path:output+'/completed.png'});
  await writeFile(output+'/report.json',JSON.stringify({url,history,moves,report},null,2));
  console.log('PROOF',JSON.stringify({moves,frames,decisions,ending:report.outcome,gold:report.gold,rescues:report.rescues,errors}));
} finally{await browser.close();}
