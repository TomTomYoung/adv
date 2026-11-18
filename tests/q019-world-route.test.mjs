import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {createQuestTrial} from '../src/application/quest-playtest.js';
import {data,previous,previousData,catalog,routes,values,checkpoint,ready,choose,depart,arrive,resume,migrated,enumerate,drain,fight} from './q019-helpers.mjs';

const graph=enumerate(),story=data.quests.q019.story;
function at(scene) {
  const g=ready(),row=graph.active.find(row=>row.scene===scene);
  assert.ok(row,scene);g.load(row.save);return g;
}
const originalFacts=previous.model.stateRegistry.map(field=>field.path.split('.').at(-1)).filter(k=>!['node','catalogRevision'].includes(k));

test('q019 source, scripts, endings and active event sets preserve accepted quests',()=>{
  const raw=fs.readFileSync(new URL('../data/quests/q019.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'e011a8293529550cbec9fa4d9fff9e37b491b74d');
  for(const [id,script] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[id],script);
  for(const [id,ending] of Object.entries(previous.outcomes)){
    const {requires,...fields}=ending,{requires:current,...updated}=data.quests.q019.outcomes[id];
    assert.deepEqual(updated,fields);assert.deepEqual(current,story.endings[id]);
  }
  for(const [g,legacy] of [[migrated(ready({old:true})),true],[ready(),false]]){
    for(const m of Object.values(data.maps))for(const o of m.objects.filter(o=>o.quest==='q019'&&objectVisible(g.state,m,o))){
      assert.equal(o.id.startsWith('q019_mine_scale_'),!legacy,o.id);
    }
  }
});
test('q019 all five paths cover the entire graph, each save round trips, and cast matches physical locations',()=>{
  assert.deepEqual(new Set(graph.active.map(r=>r.scene)),new Set(Object.keys(story.scenes)));
  assert.deepEqual(new Set(graph.endings.flatMap(r=>JSON.parse(r.save).state.stories.q019.events)),new Set(Object.keys(story.actions)));
  const g=ready();
  for(const row of graph.active){
    g.load(row.save);checkpoint(g);
    const place=story.scenes[row.scene].place;
    const expected=Object.entries(story.entities).filter(([id,e])=>e.character&&values(g)[id+'At']===place).map(([,e])=>e.character);
    assert.deepEqual(new Set(projectGame(g).dialog.scene.cast.map(c=>c.id)),new Set(expected));
  }
});
for(const route of routes)test('q019 original final facts, ending and one-time reward: '+route.old.join('/'),()=>{
  const old=ready({old:true}),g=ready();choose(old,...route.old);choose(g,...route.path);
  assert.equal(g.state.quests.q019.outcome,route.outcome);
  for(const k of originalFacts)assert.equal(values(g)[k],old.state.flags.flow.q019[k],k);
  assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);
  const before=g.save();
  assert.throws(()=>g.complete('q019',route.outcome));assert.equal(g.save(),before);
  g.run(g.data.quests.q019.model.entryScript);drain(g);assert.equal(g.state.gold,old.state.gold);checkpoint(g);
});
test('q019 the open sample travels while the sealed control stays on the same weighing bench',()=>{
  const g=at('fresh'),v=()=>values(g);
  assert.equal(v().wetReading,60);assert.equal(v().sampleAt,'ruchi');assert.equal(v().controlAt,'scale');
  depart(g,'dryer');checkpoint(g);assert.equal(v().ruchiAt,'transit');assert.equal(v().sampleAt,'ruchi');
  arrive(g);assert.equal(v().sampleAt,'dry');choose(g,'weigh','again');checkpoint(g);
  assert.equal(v().firstDryReading,50);assert.equal(v().secondDryReading,0);assert.equal(v().driedToConstant,false);
  choose(g,'return','confirm');assert.equal(v().secondDryReading,50);assert.equal(v().driedToConstant,true);
  choose(g,'store');assert.equal(v().sampleAt,'store');assert.equal(v().moistureKnown,false);
  choose(g,'weigh','record');assert.equal(v().humidReading,55);assert.equal(v().sampleAt,'scale');
  assert.equal(v().controlSealed,true);assert.equal(v().controlAt,'scale');assert.equal(v().arrearsCalculated,false);
});
test('q019 tracing a historic lot establishes a shortfall only after the original contract is checked',()=>{
  const g=at('archive');choose(g,'match');assert.equal(values(g).recordsCompared,true);assert.equal(values(g).contractCompared,false);
  choose(g,'contract');checkpoint(g);assert.equal(values(g).verifiedShortfall,0);
  choose(g,'compute');assert.equal(values(g).verifiedShortfall,10);assert.equal(values(g).paidToMiners,0);
  choose(g,'limit','sign','finish');assert.equal(values(g).comparisonAt,'archive');
  assert.equal(values(g).outstanding,10);assert.equal(values(g).refundAt,'owner');assert.equal(values(g).ledgerAt,'archive');
});
test('q019 the pay desk records the shortfall, transfers six once and leaves four unsettled',()=>{
  const g=at('claim'),gold=g.state.gold;
  choose(g,'enter');checkpoint(g);assert.equal(values(g).comparisonAt,'pay');assert.equal(values(g).refundAt,'owner');
  assert.equal(values(g).outstanding,10);assert.equal(values(g).dryBasis,false);
  choose(g,'refund');checkpoint(g);assert.equal(values(g).refundAt,'miners');assert.equal(values(g).outstanding,4);
  assert.equal(g.state.gold,gold);
  const paid=structuredClone(g.state.stories.q019);g.defeat();drain(g);const afterRescue=g.state.gold;resume(g);
  assert.deepEqual(g.state.stories.q019,paid);assert.equal(g.dispatch({type:'choose',id:'refund'}),false);
  assert.deepEqual(g.state.stories.q019,paid);assert.equal(g.state.gold,afterRescue);
  choose(g,'basis','return');assert.equal(values(g).rateNoticeAt,'scale');assert.equal(values(g).paidToMiners,6);
  choose(g,'finish');assert.equal(g.state.gold,afterRescue+69);
});
test('q019 the three prospective agreements remember how much of the investigation was completed',()=>{
  const result=graph.endings.filter(r=>r.outcome==='compromise').map(r=>JSON.parse(r.save).state.stories.q019.values);
  assert.deepEqual(result.map(v=>[v.moistureKnown,v.arrearsCalculated,v.outstanding]),[[false,false,0],[true,false,0],[true,true,10]]);
  assert.ok(result.every(v=>v.paidToMiners===0 && v.averageAgreed && !v.dryBasis));
});
test('q019 the replacement scale weighs the same marked lot after storage',()=>{
  const g=at('spare');depart(g,'carry');assert.equal(values(g).spareScaleAt,'ruchi');arrive(g);choose(g,'swap');
  assert.equal(values(g).oldScaleAt,'scale');assert.equal(values(g).spareScaleAt,'platform');
  choose(g,'follow');assert.equal(values(g).oreLotAt,'store');assert.equal(values(g).reweighed,false);
  choose(g,'return');assert.equal(values(g).oreLotAt,'scale');assert.equal(values(g).reweighed,true);
  assert.equal(values(g).scaleChecked,false);choose(g,'finish');assert.equal(values(g).newInquiry,true);
});
const departures=new Map();
for(const row of graph.active){
  const g=ready();g.load(row.save);
  for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){
    const key=row.scene+'_'+o.id;
    if(story.actions[key]?.journey&&!departures.has(key))departures.set(key,{save:row.save,id:o.id});
  }
}
assert.equal(departures.size,16);
for(const [key,row] of departures)for(const interruption of ['retreat','defeat'])test('q019 '+key+' survives '+interruption,()=>{
  const g=ready();g.load(row.save);depart(g,row.id);
  const facts=structuredClone(g.state.stories.q019),journey=structuredClone(g.state.journey);
  if(interruption==='retreat' && g.state.mode==='town'){
    const before=JSON.parse(g.save());
    assert.equal(g.dispatch({type:'retreat'}),false);
    const after=JSON.parse(g.save());delete before.state.notice;delete after.state.notice;assert.deepEqual(after,before);
  }else if(interruption==='retreat')assert.ok(g.dispatch({type:'retreat'}));
  else g.defeat();
  drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q019,facts);assert.deepEqual(g.state.journey,journey);
  arrive(g);assert.equal(g.state.stories.q019.scene,story.actions[key].to);checkpoint(g);
});
for(const scene of Object.keys(story.scenes).filter(s=>s!=='entry'))test('q019 saved local work survives rescue at '+scene,()=>{
  const g=at(scene),facts=structuredClone(g.state.stories.q019);
  g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q019,facts);checkpoint(g);
});
for(const route of routes)test('q019 pre-upgrade dialogue, choices and completion migrate: '+route.old.join('/'),()=>{
  const g=createQuestTrial(previousData,catalog,{quest:'q019',party:'balanced',start:'site',level:1,seed:1907}).engine;
  let next=0;
  for(let n=0;n<80;n++){
    const loaded=migrated(g),expected=JSON.parse(g.save());
    (expected.state.flags.legacyStoryRoutes??={}).q019=true;
    assert.deepEqual(JSON.parse(loaded.save()),expected);
    if(g.state.quests.q019.stage==='completed')break;
    if(g.state.battle){fight(g);fight(loaded);}
    else{
      const intent=g.state.waiting.type==='text'?{type:'advance'}:{type:'choose',id:route.old[next++]};
      assert.ok(g.dispatch(intent));assert.ok(loaded.dispatch(intent));
    }
    assert.equal(loaded.state.quests.q019.stage,g.state.quests.q019.stage);
    assert.deepEqual(loaded.state.flags.flow?.q019,g.state.flags.flow?.q019);
  }
  assert.equal(g.state.quests.q019.outcome,route.outcome);
});
const olderRoutes=[
  ...routes.map(r=>['flow.visit',r.old,r.outcome]),
  ...['decision','review'].flatMap(entry=>['informed','contract','compromise'].map(outcome=>[entry,[outcome],outcome]))
];
for(const [entry,path,outcome] of olderRoutes)test('q019 preserves older '+entry+' '+path.join('/'),()=>{
  const old=ready({old:true,visit:false});
  const clues=['clue_a','clue_b'];
  if(entry!=='flow.visit'&&outcome==='informed')for(const clue of clues)old.evidence('q019',clue,clue);
  old.run('q019.'+entry);drain(old);
  const g=migrated(old);checkpoint(g);assert.equal(g.state.flags.legacyStoryRoutes.q019,true);
  if(entry!=='flow.visit'&&outcome==='compromise')assert.equal(g.dispatch({type:'choose',id:'informed'}),false);
  const startsBattle=entry!=='flow.visit'&&outcome==='contract';
  for(const id of path){depart(g,id);checkpoint(g);if(g.state.battle){assert.ok(startsBattle);fight(g);checkpoint(g);}}
  assert.equal(g.state.quests.q019.outcome,outcome);assert.equal(g.state.records.battles,Number(startsBattle));
});
test('q019 uses free dungeon cells and preserves original mine terrain',()=>{
  for(const p of Object.values(story.worldPlaces)){
    if(p.kind==='town'){assert.ok(data.locations[p.location]);continue;}
    const m=data.maps[p.map];
    assert.equal(m.tiles[p.y][p.x],'.');assert.deepEqual(m.tiles,previousData.maps[p.map].tiles);
    for(const o of m.objects.filter(o=>o.x===p.x&&o.y===p.y))assert.equal(o.quest,'q019',o.id);
  }
});
