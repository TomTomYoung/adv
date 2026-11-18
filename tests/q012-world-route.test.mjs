import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {threePicksSource} from '../authoring/editions/e2/story-q012.mjs';
import {data,previous,previousData,ready,values,checkpoint,depart,arrive,choose,go,resume,migrated,drain,enumerate,routes,oldFrames} from './q012-helpers.mjs';
const source=threePicksSource(),graph=enumerate();
test('q012 keeps the original catalog, every command, rewards and ending prose',()=>{
 const bytes=fs.readFileSync(new URL('./fixtures/e2-q012-before-world.json',import.meta.url));
 assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'c13fba02ccfed9fe2132994229110eac5612aa51');assert.deepEqual(previousData.quests.q012,previous);
 for(const [id,s] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[id],s,id);
 for(const [id,o] of Object.entries(previous.outcomes)){const {requires,...old}=o,{requires:_,...current}=data.quests.q012.outcomes[id];assert.deepEqual(current,old);}
});
test('q012 covers every scene and action through the five original decision paths',()=>{
 assert.equal(graph.endings.length,5);
 assert.deepEqual([...new Set(graph.active.map(r=>r.scene))].sort(),Object.keys(source.story.scenes).sort());
 assert.deepEqual([...new Set(graph.endings.flatMap(r=>JSON.parse(r.save).state.stories.q012.events))].sort(),Object.keys(source.story.actions).sort());
 const g=ready();for(const row of [...graph.active,...graph.endings]){g.load(row.save);checkpoint(g);}
});
for(const route of routes)test('q012 preserves original final facts for '+route.old.join('/'),()=>{
 const old=ready({old:true});choose(old,...route.old);const g=ready();choose(g,...route.path);checkpoint(g);
 assert.equal(g.state.quests.q012.outcome,route.outcome);
 for(const key of ['tested','marksSeen','ledgerCompared','ownerConsent','loaned','returned','selectedOnly','toolsAt'])assert.deepEqual(values(g)[key],old.state.flags.flow.q012[key],key);
 const knowledge=g.state.stories.q012.knowledge.party??[];
 assert.equal(knowledge.includes('uses'),route.outcome!=='contract');
 assert.equal(knowledge.includes('marks'),route.old.includes('shop'));
 assert.equal(knowledge.includes('makers'),route.outcome==='informed');
});
test('q012 permission, receipt, each trial and unloading are distinct',()=>{
 const g=ready();choose(g,'trial');assert.equal(values(g).borrowConsent,false);choose(g,'permission');assert.equal(values(g).displayPickAt,'dan');choose(g,'take');assert.equal(values(g).displayPickAt,'party');assert.equal(values(g).ownerConsent,false);
 depart(g,'hard');checkpoint(g);assert.equal(values(g).partyAt,'transit');assert.equal(values(g).displayPickAt,'party');assert.equal(values(g).tested,false);arrive(g);assert.equal(values(g).hardTested,false);
 choose(g,'test');assert.equal(values(g).hardTested,true);assert.equal(values(g).tested,false);choose(g,'salt');assert.equal(values(g).saltTested,false);choose(g,'test');assert.equal(values(g).tested,false);choose(g,'crack');assert.equal(values(g).crackTested,false);choose(g,'test');assert.equal(values(g).tested,true);
 depart(g,'return');assert.equal(values(g).unloaded,false);checkpoint(g);arrive(g);assert.equal(values(g).displayPickAt,'party');assert.equal(values(g).unloaded,false);choose(g,'unload');assert.equal(values(g).displayPickAt,'dan');assert.equal(values(g).unloaded,true);assert.equal(values(g).returned,false);checkpoint(g);
});
test('q012 marks do not prove makers until the ledger is compared',()=>{
 const g=ready();choose(g,...routes[3].path.slice(0,-5));assert.equal(g.state.stories.q012.scene,'marks_ready');assert.equal(values(g).marksSeen,false);choose(g,'inspect');assert.equal(values(g).marksSeen,true);assert.equal(values(g).ledgerCompared,false);assert.equal(g.state.stories.q012.knowledge.party.includes('makers'),false);choose(g,'names');assert.equal(values(g).ledgerCompared,false);choose(g,'compare');assert.equal(values(g).ledgerCompared,true);assert.equal(values(g).labelsWritten,false);choose(g,'labels');assert.equal(values(g).returned,false);choose(g,'finish');assert.equal(values(g).returned,true);checkpoint(g);
});
test('q012 consent, matching, loan record, display and physical delivery are distinct',()=>{
 const g=ready();choose(g,...routes[1].path.slice(0,-6));assert.equal(values(g).ownerConsent,false);assert.equal(values(g).loaned,false);
 for(const [id,key] of [['agree','ownerConsent'],['match','loanMatched'],['record','loanRecorded'],['display','displayed']]){choose(g,id);assert.equal(values(g)[key],true);assert.equal(values(g).loaned,false);assert.equal(values(g).otherPickAAt,'dan');assert.equal(values(g).otherPickBAt,'dan');checkpoint(g);}
 choose(g,'handover');assert.equal(values(g).loaned,true);assert.equal(values(g).displayPickAt,'dan');assert.equal(values(g).otherPickAAt,'miners');assert.equal(values(g).otherPickBAt,'miners');assert.equal(g.state.quests.q012.stage,'active');assert.equal(values(g).returned,false);choose(g,'finish');checkpoint(g);
});
test('q012 quick judgment cannot enter full comparison or identify a maker',()=>{
 const g=ready();choose(g,'sharp','permission','take','hard');const before=g.save();assert.equal(g.dispatch({type:'choose',id:'test'}),false);assert.equal(g.save(),before);choose(g,'quick','return','unload');assert.equal(projectGame(g).dialog.options.find(o=>o.id==='shop').enabled,false);assert.equal(projectGame(g).dialog.options.find(o=>o.id==='lend').enabled,false);choose(g,'select','finish');for(const key of ['tested','marksSeen','ledgerCompared','ownerConsent','loaned'])assert.equal(values(g)[key],false,key);checkpoint(g);
});
const departures=new Map();for(const row of graph.active){const g=ready();g.load(row.save);for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){const key=row.scene+'_'+o.id;if(source.story.actions[key]?.journey&&!departures.has(key))departures.set(key,{...row,id:o.id});}}
for(const [key,row] of departures)for(const kind of ['retreat','defeat'])test(`q012 ${key} resumes after ${kind} with the same tools and completed work`,()=>{
 const g=ready();g.load(row.save);depart(g,row.id);const before=structuredClone(g.state.stories.q012),journey=structuredClone(g.state.journey);
 if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q012,before);assert.deepEqual(g.state.journey,journey);arrive(g);checkpoint(g);
});
for(const scene of ['borrow_permitted','borrowed','hard_tested','salt_tested','compared','return_arrival','unloaded','makers','ledger_checked','labeled','loan_recorded','loan_delivered'])test('q012 local work survives rescue at '+scene,()=>{
 const g=ready();g.load(graph.active.find(r=>r.scene===scene).save);const before=structuredClone(g.state.stories.q012);g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q012,before);checkpoint(g);
});
test('q012 all original pending VM frames and completed saves migrate exactly',()=>{
 for(const raw of oldFrames()){const expected=JSON.parse(raw);(expected.state.flags.legacyStoryRoutes??={}).q012=true;const g=new GameEngine(data);g.load(raw);assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);}
});
for(const route of routes)test('q012 accepted original route '+route.old.join('/'),()=>{
 const g=migrated(ready({old:true}));choose(g,...route.old);assert.equal(g.state.quests.q012.outcome,route.outcome);assert.equal(g.state.stories.q012,undefined);checkpoint(g);
});
test('q012 accepted catalog completion still checks the original flow facts',()=>{
 const g=migrated(ready({old:true})),before=g.save();for(const key of Object.keys(previous.outcomes))assert.throws(()=>g.complete('q012',key));assert.equal(g.save(),before);
});
test('q012 accepted old flow uses its original ending conditions',()=>{
 const old=ready({old:true});old.state.vm=[];old.state.waiting=null;delete old.state.flags.flow.q012;old.run('q012.flow.visit');drain(old);const g=migrated(old);assert.equal(g.state.stories.q012,undefined);
 const option=projectGame(g).dialog.options.find(o=>o.id==='sharp');assert.ok(option);choose(g,'sharp');assert.equal(g.state.quests.q012.outcome,'contract');checkpoint(g);
});
test('q012 new and accepted saves select the matching events',()=>{
 const old=ready({old:true}),current=ready(),g=new GameEngine(data);
 for(const [raw,legacy] of [[old.save(),true],[current.save(),false],[old.save(),true]]){g.load(raw);checkpoint(g);for(const m of Object.values(g.data.maps))for(const o of m.objects.filter(o=>o.quest==='q012'&&o.trigger!=='action'&&objectVisible(g.state,m,o)))assert.equal(o.id.startsWith('q012_three_picks_'),!legacy);}
});
for(const route of routes)test('q012 ending and rewards are one-time '+route.old.join('/'),()=>{
 const g=ready();choose(g,...route.path);const before=g.save();assert.throws(()=>g.complete('q012',route.outcome));assert.equal(g.save(),before);const rewards=JSON.stringify([g.state.gold,g.state.actors,g.state.vars]);g.run(g.data.quests.q012.model.entryScript);drain(g);assert.equal(JSON.stringify([g.state.gold,g.state.actors,g.state.vars]),rewards);checkpoint(g);
});
