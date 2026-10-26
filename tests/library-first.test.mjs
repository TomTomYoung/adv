import test from 'node:test';
import assert from 'node:assert/strict';
import {data,ready,start,choose,audit,checkpoint,go,drain} from './library-helpers.mjs';
const reports={};
for(let n=41;n<=50;n++){const id='q0'+n;test(`${id}: all physical choices, endings, holders and save phases`,()=>{reports[id]=audit(id);});}
test('ten consecutive library completions earn their own final prerequisite',()=>{const g=ready();for(let n=41;n<=50;n++){const id='q0'+n,r=reports[id]??audit(id);start(g,id);for(const c of Object.values(r.ends)[0])choose(g,id,c);assert.equal(g.state.quests[id].stage,'completed');}assert.equal(g.state.vars.region_5,10);checkpoint(g);});
const values=(g,id)=>g.state.stories[id].values;
const depart=(g,id,c)=>{assert.ok(g.dispatch({type:'choose',id:c}),g.state.notice);drain(g);assert.ok(g.state.journey);checkpoint(g);};
const arrive=(g,id,p)=>{go(g,data.quests[id].story.worldPlaces[p]);drain(g);checkpoint(g);};
test('q041 the borrower carries the actual book and the clerk must be fetched before changing the register',()=>{
 const id='q041',g=ready();start(g,id);for(const c of ['visit','deadline'])choose(g,id,c);depart(g,id,'return');assert.equal(values(g,id).bookAt,'borrower');assert.equal(values(g,id).borrowerAt,'transit');assert.equal(g.dispatch({type:'story.resume',quest:id}),false);arrive(g,id,'registry');assert.equal(values(g,id).bookAt,'borrower');choose(g,id,'finish');assert.equal(values(g,id).bookAt,'registry');assert.equal(values(g,id).leaseRenewed,true);
 const second=ready();start(second,id);choose(second,id,'visit');depart(second,id,'registry');assert.equal(values(second,id).clerkAt,'registry');arrive(second,id,'registry');depart(second,id,'escort');assert.equal(values(second,id).clerkAt,'transit');arrive(second,id,'resident');choose(second,id,'rewrite');choose(second,id,'finish');assert.equal(values(second,id).clerkAt,'registry');assert.equal(values(second,id).registered,true);assert.equal(values(second,id).bookAt,'entry');
});
test('q043 a destroyed backup never enables restoration; an intact backup is carried back before restoring the page',()=>{
 const id='q043',g=ready();start(g,id);choose(g,id,'copy');assert.equal(values(g,id).lost,true);assert.equal(g.dispatch({type:'choose',id:'restore'}),false);checkpoint(g);assert.equal(g.dispatch({type:'choose',id:'restore'}),false);choose(g,id,'blanks');choose(g,id,'finish');assert.equal(values(g,id).restored,false);
 const safe=ready();start(safe,id);for(const c of ['valve','stop','restore'])choose(safe,id,c);depart(safe,id,'carry');assert.equal(values(safe,id).backupAt,'party');assert.equal(values(safe,id).restored,false);arrive(safe,id,'entry');choose(safe,id,'finish');assert.equal(values(safe,id).backupAt,'entry');assert.equal(values(safe,id).restored,true);assert.equal(values(safe,id).lost,false);
});
test('q044 protection, signed appeal and the review request remain separate after returning to the refuge',()=>{
 const id='q044',g=ready();start(g,id);choose(g,id,'warn');depart(g,id,'appeal');assert.equal(values(g,id).subjectAt,'transit');assert.equal(values(g,id).protected,false);arrive(g,id,'refuge');assert.equal(values(g,id).protected,true);assert.equal(values(g,id).appealed,false);choose(g,id,'appeal');assert.equal(values(g,id).appealed,true);choose(g,id,'warn');assert.equal(g.dispatch({type:'choose',id:'market'}),false);choose(g,id,'refuge');choose(g,id,'appeal');choose(g,id,'publish');assert.equal(values(g,id).subjectAt,'refuge');assert.equal(values(g,id).reviewRequested,true);
});
test('q046 walking a full old-title cycle retains the reader and leaves a real exit route',()=>{
 const id='q046',g=ready();start(g,id);for(const c of ['index','river','ferry','loop'])choose(g,id,c);assert.equal(values(g,id).looped,true);assert.equal(values(g,id).readerAt,'rain');choose(g,id,'exit');assert.equal(values(g,id).readerAt,'exit');choose(g,id,'finish');assert.equal(values(g,id).linked,false);assert.equal(values(g,id).rainExit,true);
});
test('q047 the same copies reach both desks through the border only on arrival, without duplicating the originals',()=>{
 const id='q047',g=ready();start(g,id);for(const c of ['home','other','parallel'])choose(g,id,c);assert.equal(g.state.worldTravel.registrations.oddland_entry,true);assert.equal(g.state.worldTravel.visited.oddland_market,true);assert.equal(values(g,id).pagesAt,'party');depart(g,id,'deliver');assert.equal(values(g,id).pagesAt,'vault');assert.equal(values(g,id).homeCopyAt,'party');arrive(g,id,'home');assert.equal(values(g,id).homeCopyAt,'home');depart(g,id,'other');assert.equal(values(g,id).otherCopyAt,'party');arrive(g,id,'other');assert.equal(values(g,id).otherCopyAt,'other');choose(g,id,'finish');assert.equal(values(g,id).bothDelivered,true);assert.equal(values(g,id).pagesAt,'vault');
});
test('q048 repeated correction does not close the contract before the signed deadline returns to the desk',()=>{
 const id='q048',g=ready();start(g,id);for(const c of ['correct','again','next'])choose(g,id,c);assert.equal(g.dispatch({type:'choose',id:'again'}),false);choose(g,id,'freeze');assert.equal(values(g,id).additionsClosed,false);depart(g,id,'seal');assert.equal(values(g,id).sealed,false);arrive(g,id,'entry');choose(g,id,'finish');assert.equal(values(g,id).additionsClosed,true);assert.equal(values(g,id).sealed,true);
});
test('q049 a sealed document and a separately copied route preserve distinct holders on return',()=>{
 const id='q049',g=ready();start(g,id);for(const c of ['remove','split','return','finish'])choose(g,id,c);assert.equal(values(g,id).documentAt,'registry');assert.equal(values(g,id).separateMap,true);assert.equal(values(g,id).luuAt,'registry');
 const second=ready();start(second,id);for(const c of ['map','return','finish'])choose(second,id,c);assert.equal(values(second,id).documentAt,'entry');assert.equal(values(second,id).mapCopyAt,'registry');assert.equal(values(second,id).separateMap,false);
});
for(const copied of [false,true])test(`q050 copies=${copied}: extended books stay at their shelf while ordinary volumes are received by the warehouse`,()=>{
 const id='q050',g=ready();g.state.vars.region_5=3;start(g,id);for(const c of copied?['copy','carry','copy','address','request']:['follow','extension'])choose(g,id,c);for(const c of ['publish','carry'])choose(g,id,c);assert.equal(values(g,id).firstBoxAt,'warehouse');assert.equal(values(g,id).otherBooksAt,'warehouse');assert.equal(values(g,id).unfinishedAt,'entry');assert.equal(values(g,id).posted,false);choose(g,id,'post');choose(g,id,'finish');assert.equal(values(g,id).posted,true);assert.equal(values(g,id).extended,true);
});
