import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {data,drain,fight} from './helpers.mjs';
import {prepareQuest} from './structure-routes.mjs';
import {projectGame} from '../src/application/projection.js';
const choose=(g,...ids)=>{for(const id of ids){assert.ok(g.dispatch({type:'choose',id}),id);drain(g);if(g.state.battle)fight(g);}};
const state=(g,id)=>g.state.flags.flow[id];
const oldQuest=id=>{const g=prepareQuest(id);choose(g,'pause');delete g.state.flags.flow[id];g.run(`${id}.flow.visit`);drain(g);return g;};

test('q011-q020 catalog constraints stay author metadata and each current entry uses its new route',()=>{
 for(let n=11;n<=20;n++){
  const id=`q${String(n).padStart(3,'0')}`,g=prepareQuest(id),q=data.quests[id];
  assert.equal(q.model.standard.version,'1.0');assert.equal(state(g,id).catalogRevision,1);assert.ok(q.model.world.authoringNotes.facts.length>=3);
  const view=JSON.stringify(projectGame(g));assert.equal(view.includes('AI向け注釈'),false);assert.equal(view.includes(q.model.world.truth),false);
  const before=g.save();assert.throws(()=>g.complete(id,'informed'));assert.equal(g.save(),before);g.load(before);
 }
});

test('q011 both rope routes rescue the miners while retaining the actual sign discovery',()=>{
 for(const brush of [false,true]){
  const g=prepareQuest('q011');if(brush)choose(g,'brush');choose(g,'rope');const s=state(g,'q011');
  assert.equal(s.signKnown,brush);assert.equal(s.ropeLaid,true);assert.equal(s.rescued,true);assert.equal(s.peopleAt,'entrance');assert.equal(s.repainted,false);assert.equal(s.signDestroyed,false);
 }
 const g=prepareQuest('q011');choose(g,'break');assert.equal(state(g,'q011').signDestroyed,true);assert.equal(state(g,'q011').rescued,true);
});

test('q012 makers are identified only by the ledger and loans always require the owner',()=>{
 const g=prepareQuest('q012');choose(g,'trial','shop');assert.equal(state(g,'q012').marksSeen,true);assert.equal(state(g,'q012').ledgerCompared,false);
 const before=g.save();assert.throws(()=>g.complete('q012','informed'));assert.equal(g.save(),before);
 choose(g,'names');assert.equal(state(g,'q012').ledgerCompared,true);assert.equal(state(g,'q012').toolsAt,'dan');
 for(const route of [['lend'],['trial','lend'],['trial','shop','loan']]){
  const h=prepareQuest('q012');choose(h,...route);const s=state(h,'q012');assert.equal(s.ownerConsent,true);assert.equal(s.tested,true);assert.equal(s.ledgerCompared,false);assert.equal(s.toolsAt,'oneDisplayedTwoOnLoan');
 }
});

test('q013 suspension preserves whether the root was actually investigated',()=>{
 for(const investigate of [false,true]){
  const g=prepareQuest('q013');if(investigate)choose(g,'sample');choose(g,'stop');const s=state(g,'q013');
  assert.equal(s.rootKnown,investigate);assert.equal(s.waterRouteKnown,investigate);assert.equal(s.miningStopped,true);assert.equal(s.rootCut,false);assert.equal(s.detourMarked,false);
 }
});

test('q014 treatment can be retained without consent to an accident claim',()=>{
 for(const route of [['unload','split'],['unload','medical','quiet']]){
  const g=prepareQuest('q014');choose(g,...route);const s=state(g,'q014');assert.equal(s.treated,route.includes('medical'));assert.equal(s.registered,false);assert.equal(s.consent,false);assert.equal(s.safeTransport,true);assert.equal(s.workerAt,'home');g.load(g.save());
 }
 const g=prepareQuest('q014');choose(g,'unload','medical');assert.equal(state(g,'q014').treated,true);assert.equal(state(g,'q014').registered,false);choose(g,'register');assert.equal(state(g,'q014').consent,true);assert.equal(state(g,'q014').registered,true);
});

test('q015 stopping water cannot restore three names lost before the quest',()=>{
 for(const ending of ['complete','missing','deposit']){
  const g=prepareQuest('q015');assert.equal(state(g,'q015').lostNames,3);choose(g,'catch');const s=state(g,'q015');
  assert.equal(s.protected,true);assert.equal(s.restoredNames,0);assert.equal(s.recordsChecked,false);assert.equal(s.familiesChecked,false);assert.throws(()=>g.complete('q015','informed'));
  choose(g,ending);const end=state(g,'q015');assert.equal(end.restoredNames,ending==='complete'?3:0);assert.equal(end.recordsChecked,ending==='complete');assert.equal(end.familiesChecked,ending==='complete');assert.equal(end.published,ending!=='deposit');
 }
});

test('q016 buying safety material costs 20G and returns powder without moving residents or blasting',()=>{
 for(const route of [['buy'],['assistant','buy'],['assistant','warehouse','cancel']]){
  const g=prepareQuest('q016'),gold=g.state.gold;choose(g,...route);const s=state(g,'q016');
  assert.equal(g.state.gold,gold-20+data.quests.q016.outcomes.compromise.gold);assert.equal(s.purchased,true);assert.equal(s.powderReturned,true);assert.equal(s.booksCorrected,true);assert.equal(s.peopleMoved,false);assert.equal(s.blasted,false);assert.equal(s.trial,false);
 }
 const g=prepareQuest('q016');g.state.gold=19;const before=g.save();assert.equal(g.dispatch({type:'choose',id:'buy'}),false);assert.equal(g.save(),before);
});

test('q016 inspecting a relocation site is followed by actual relocation before the trial',()=>{
 const g=prepareQuest('q016');choose(g,'assistant','warehouse');assert.equal(state(g,'q016').siteChecked,true);assert.equal(state(g,'q016').peopleMoved,false);assert.equal(state(g,'q016').trial,false);
 choose(g,'evacuate');const s=state(g,'q016');for(const k of ['peopleMoved','powderReturned','booksCorrected','trial','vibrationChecked'])assert.equal(s[k],true);
});

test('q017 demolition first verifies the records while keepsake delivery needs the peers consent',()=>{
 const g=prepareQuest('q017');choose(g,'remove');const s=state(g,'q017');for(const k of ['recordsCompared','remainsKnown','emptyKnown','removed'])assert.equal(s[k],true);assert.equal(s.boxAt,'peers');
 for(const route of [['box'],['family','box']]){
  const h=prepareQuest('q017');choose(h,...route);const t=state(h,'q017');assert.equal(t.peersConsent,true);assert.equal(t.boxAt,'family');assert.equal(t.recordsCompared,route.includes('family'));assert.equal(t.removed,false);assert.equal(t.inscribed,false);
 }
});

test('q018 final payment and destruction of the original are separate, witnessed events',()=>{
 const g=prepareQuest('q018');choose(g,'copy');let s=state(g,'q018');assert.equal(s.scheduleKnown,true);assert.equal(s.paymentConfirmed,false);assert.equal(s.debtEnded,false);
 choose(g,'meet');s=state(g,'q018');assert.equal(s.paymentConfirmed,true);assert.equal(s.owPresent,true);assert.equal(s.debtEnded,false);assert.equal(s.dissolved,false);g.load(g.save());
 choose(g,'split');s=state(g,'q018');assert.equal(s.completionLine,true);assert.equal(s.split,true);assert.equal(s.debtEnded,true);assert.equal(s.dissolved,false);assert.equal(s.tabletAt,'halves');
 for(const route of [['copy','dissolve'],['both','dissolve']]){const h=prepareQuest('q018');choose(h,...route);const t=state(h,'q018');for(const k of ['paymentConfirmed','owPresent','paperReceipt','dissolved','debtEnded'])assert.equal(t[k],true);}
 const h=prepareQuest('q018');choose(h,'seize');assert.equal(state(h,'q018').paymentConfirmed,false);assert.equal(state(h,'q018').debtEnded,false);
});

test('q019 dry samples and contracts establish arrears, but computation alone does not refund them',()=>{
 const g=prepareQuest('q019');choose(g,'dry');let s=state(g,'q019');assert.equal(s.controlSealed,true);assert.equal(s.sampleOpen,true);assert.equal(s.driedToConstant,true);assert.equal(s.contractCompared,false);assert.equal(s.arrearsCalculated,false);
 choose(g,'books');s=state(g,'q019');assert.equal(s.contractCompared,true);assert.equal(s.arrearsCalculated,true);assert.equal(s.partRefunded,false);const checkpoint=g.save();
 choose(g,'limit');s=state(g,'q019');assert.equal(s.averageAgreed,true);assert.equal(s.partRefunded,false);assert.equal(s.dryBasis,false);
 g.load(checkpoint);choose(g,'settle');assert.equal(state(g,'q019').partRefunded,true);assert.equal(state(g,'q019').dryBasis,true);
});

test('q020 temporary shifts retain closure and repairs retire the role only after securing the route',()=>{
 for(const route of [['relieve','recruit'],['supports','shift'],['relieve','repair','shift']]){
  const g=prepareQuest('q020');choose(g,...route);const s=state(g,'q020');for(const k of ['shiftHeld','keysHeld','recordsHeld','dayServed','recruitsSought'])assert.equal(s[k],true);assert.equal(s.formerAt,'ground');assert.equal(s.exitOpen,false);assert.equal(s.entranceBraced,false);assert.equal(s.roleEnded,false);
 }
 const g=prepareQuest('q020');choose(g,'relieve','repair');assert.equal(state(g,'q020').formerAt,'ground');assert.equal(state(g,'q020').entranceBraced,false);
 choose(g,'brace');const s=state(g,'q020');for(const k of ['entranceBraced','deepRepaired','branchesClosed','limitedTraffic','roleEnded'])assert.equal(s[k],true);assert.equal(s.crownAt,'archive');
});

test('q020 fighting the two guards does not repair supports or settle the monitoring duty',()=>{
 const g=prepareQuest('q020');assert.ok(g.dispatch({type:'choose',id:'fight'}));drain(g);assert.equal(g.state.battle.enemies.length,2);
 assert.equal(state(g,'q020').guardsDefeated,false);assert.equal(state(g,'q020').exitOpen,false);g.load(g.save());fight(g);
 const s=state(g,'q020');assert.equal(s.guardsDefeated,true);assert.equal(s.exitOpen,true);assert.equal(s.entranceBraced,false);assert.equal(s.roleEnded,false);assert.equal(s.crownAt,'keeper');assert.equal(s.formerAt,'dangerTunnel');
});

test('all pre-catalog q011-q020 script arrays remain byte-equivalent',async()=>{
 const hashes=JSON.parse(await fs.readFile(new URL('fixtures/scripts-q011-q020-before-catalog-sha256.json',import.meta.url)));
 for(const [id,hash] of Object.entries(hashes))assert.equal(createHash('sha256').update(JSON.stringify(data.scripts[id])).digest('hex'),hash,id);
});

test('old choices and paused revisits complete with the old result and do not award twice',()=>{
 for(const [id,route] of [['q011',['brush','guide']],['q015',['copy','missing']],['q018',['copy','dissolve']],['q020',['relieve','recruit']]]){
  const g=oldQuest(id);choose(g,route[0],'pause');g.load(g.save());g.run(data.quests[id].model.entryScript);drain(g);
  assert.equal(state(g,id).catalogRevision,undefined);choose(g,...route.slice(1));const outcome=g.state.quests[id].outcome;
  assert.equal(g.state.journal.at(-1).text,data.quests[id].legacyOutcomes[outcome].text);
  const earned={gold:g.state.gold,xp:g.state.xp,count:g.state.vars.completed};g.run(data.quests[id].model.entryScript);drain(g);assert.deepEqual({gold:g.state.gold,xp:g.state.xp,count:g.state.vars.completed},earned);
 }
});
