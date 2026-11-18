import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';
const out='/tmp/mine-scale-trial',trace=JSON.parse(await fs.readFile('qa-q019-trace.json','utf8'));
await fs.mkdir(out,{recursive:true});
const origin=process.env.TRIAL_ORIGIN||'http://127.0.0.1:8000',local=origin.startsWith('http://127.');
const mime={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.ogg':'audio/ogg'};
let server;
if(local){server=http.createServer(async(req,res)=>{try{const name='.'+new URL(req.url,origin).pathname;res.setHeader('content-type',mime[path.extname(name)]||'application/octet-stream');res.end(await fs.readFile(name));}catch{res.writeHead(404);res.end();}});await new Promise(ok=>server.listen(8000,'127.0.0.1',ok));}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[],evidence=[];let current;
page.on('pageerror',e=>errors.push(e.message));
try{
 const files=['runtime.json','data/scenario-editions.json','data/quests/q019.json','data/scenario-editions/e2/q019.json','data/scenario-editions/e2/companions.json','playtests/quest-parties.json'];
 for(const file of files){const res=await page.request.get(origin+'/'+file+'?verify='+Date.now());assert.ok(res.ok(),file);assert.ok((await res.body()).equals(await fs.readFile(file)),file);}
 const url=origin+'/quest-party-playtest.html?edition=e2&quest=q019&party=balanced&level=2&start=site&outcome=informed&battleMode=classic&seed='+trace.seed;
 await page.goto(url);await page.locator('#launch:enabled').waitFor({timeout:180000});await page.selectOption('#effects','off');await page.click('#launch');
 await page.waitForFunction(()=>window.questPlaytest?.trial.engine.state.stories.q019);
 const focus=id=>page.locator('#app [data-focus="'+id+'"]:enabled:visible').first();
 async function ensure(id){
   const target=focus(id);
   for(let i=0;i<100;i++){
     if(await target.count())return target;
     const next=focus('message:next');if(await next.count())await next.click();else await page.waitForTimeout(65);
   }
   throw Error('Missing '+id+'; visible controls '+JSON.stringify(await page.locator('#app button:visible:enabled').evaluateAll(bs=>bs.map(b=>b.dataset.focus||b.textContent).slice(-22))));
 }
 for(const intent of trace.trace.filter(a=>a.type!=='advance')){
   current=intent;
   if(intent.type==='battle'){
     if(!['attack','guard'].includes(intent.skill))await (await ensure('battle-menu:skills')).click();
     await (await ensure('skill:'+intent.skill)).click();await (await ensure('target:'+intent.target)).click();continue;
   }
   const button=await ensure(intent.type==='choose'?'choice:'+intent.id:'move:'+intent.direction);
   if(intent.type==='choose'){
     if(intent.id==='refund'){
       await page.setViewportSize({width:390,height:844});
       await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
       const choice=await ensure('choice:refund');
       const scroll=await choice.evaluate(option=>{
         const el=option.closest('.scene-message-actions');
         const pad=el.previousElementSibling.getBoundingClientRect();
         el.scrollTop=el.scrollHeight;
         const area=el.getBoundingClientRect(),end=option.getBoundingClientRect().bottom;
         return {needed:el.scrollHeight>el.clientHeight,atBottom:Math.abs(el.scrollHeight-el.scrollTop-el.clientHeight)<=1,buttonEndVisible:end<=area.bottom+1,padStayed:el.previousElementSibling.getBoundingClientRect().top===pad.top};
       });
       assert.ok(scroll.buttonEndVisible&&scroll.atBottom&&scroll.padStayed);
       await page.locator('#app').screenshot({path:out+'/refund-390.png'});evidence.push({mobileScroll:scroll});
     }
     const row=await page.evaluate(()=>{const s=questPlaytest.trial.engine.state.stories.q019,v=s.values;return {scene:s.scene,sample:v.sampleAt,first:v.firstDryReading,second:v.secondDryReading,humid:v.humidReading,shortfall:v.verifiedShortfall,received:v.paidToMiners,remaining:v.outstanding,holder:v.refundAt,gold:questPlaytest.trial.engine.state.gold};});
     if(['constant','findings','calculated','due','paid','posted'].includes(row.scene)){evidence.push(row);await page.locator('#app').screenshot({path:out+'/'+row.scene+'.png'});}
   }
   await button.click();
   if(intent.type==='choose'&&intent.id==='refund')await page.setViewportSize({width:1440,height:1000});
 }
 const r=await page.evaluate(()=>questPlaytest.report());
 assert.equal(r.status,'cleared');assert.equal(r.outcome,'informed');assert.deepEqual(r.gold,trace.expected);assert.equal(r.rescues,0);assert.equal(r.steps,58);
 assert.equal(r.records.wins,1);assert.deepEqual(errors,[]);
 assert.ok(evidence.some(x=>x.scene==='constant'&&x.first===50&&x.second===50));
 assert.ok(evidence.some(x=>x.scene==='findings'&&x.humid===55));
 const due=evidence.find(x=>x.scene==='due'),paid=evidence.find(x=>x.scene==='paid');
 assert.equal(due.received,0);assert.equal(due.remaining,10);assert.equal(paid.received,6);assert.equal(paid.remaining,4);assert.equal(paid.holder,'miners');assert.equal(paid.gold,due.gold);
 await page.locator('#trial-result').screenshot({path:out+'/complete.png'});await fs.writeFile(out+'/report.json',JSON.stringify({url,files,evidence,report:r},null,2));
 console.log('PROOF',JSON.stringify({files:files.length,ending:r.outcome,steps:r.steps,wins:r.records.wins,losses:r.records.losses,rescues:r.rescues,gold:r.gold,errors}));
}catch(e){console.error('Action',current,'status',await page.locator('#trial-status').textContent(),'runtime errors',errors);await page.screenshot({path:out+'/failure.png'});throw e;}
finally{await browser.close();if(server)await new Promise(ok=>server.close(ok));}
