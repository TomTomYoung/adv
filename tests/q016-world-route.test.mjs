import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {createQuestTrial} from '../src/application/quest-playtest.js';
import {data,previous,previousData,catalog,routes,values,checkpoint,ready,go,choose,depart,arrive,resume,migrated,enumerate,drain,fight} from './q016-helpers.mjs';

const graph=enumerate(),story=data.quests.q016.story;
function at(scene) {
  const g=ready(),row=graph.active.find(row=>row.scene===scene);
  assert.ok(row,scene);g.load(row.save);return g;
}
const originalFacts=previous.model.stateRegistry.map(field=>field.path.split('.').at(-1)).filter(k=>!['node','catalogRevision'].includes(k));

test('q016 source, scripts, endings and active event sets preserve accepted quests',()=>{
  const raw=fs.readFileSync(new URL('../data/quests/q016.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'d931f75ec7b46c19cf5b1bb779ef7d52377fad4d');
  for(const [id,script] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[id],script);
  for(const [id,ending] of Object.entries(previous.outcomes)){
    const {requires,...fields}=ending,{requires:current,...updated}=data.quests.q016.outcomes[id];
    assert.deepEqual(updated,fields);assert.deepEqual(current,story.endings[id]);
  }
  for(const [g,legacy] of [[migrated(ready({old:true})),true],[ready(),false]]){
    for(const m of Object.values(data.maps))for(const o of m.objects.filter(o=>o.quest==='q016'&&objectVisible(g.state,m,o))){
      assert.equal(o.id.startsWith('q016_silent_blast_'),!legacy,o.id);
    }
  }
});
test('q016 all five paths cover the entire graph, each save round trips, and cast matches physical locations',()=>{
  assert.deepEqual(new Set(graph.active.map(r=>r.scene)),new Set(Object.keys(story.scenes)));
  assert.deepEqual(new Set(graph.endings.flatMap(r=>JSON.parse(r.save).state.stories.q016.events)),new Set(Object.keys(story.actions)));
  const g=ready();
  for(const row of graph.active){
    g.load(row.save);checkpoint(g);
    const place=story.scenes[row.scene].place;
    const expected=Object.entries(story.entities).filter(([id,e])=>e.character&&values(g)[id+'At']===place).map(([,e])=>e.character);
    assert.deepEqual(new Set(projectGame(g).dialog.scene.cast.map(c=>c.id)),new Set(expected));
  }
});
for(const route of routes)test('q016 original final facts, ending and one-time reward: '+route.old.join('/'),()=>{
  const old=ready({old:true}),g=ready();choose(old,...route.old);choose(g,...route.path);
  assert.equal(g.state.quests.q016.outcome,route.outcome);
  for(const k of originalFacts)assert.equal(values(g)[k],old.state.flags.flow.q016[k],k);
  assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);
  const before=g.save();
  assert.throws(()=>g.complete('q016',route.outcome));assert.equal(g.save(),before);
  g.run(g.data.quests.q016.model.entryScript);drain(g);assert.equal(g.state.gold,old.state.gold);checkpoint(g);
});
test('q016 residents and beds travel together and count follows unloading',()=>{
  const g=at('collect');
  assert.equal(values(g).residentsAt,'shelter');assert.equal(values(g).bedsAt,'shelter');assert.equal(values(g).peopleMoved,false);
  choose(g,'take');assert.equal(values(g).bedsAt,'party');
  depart(g,'escort');assert.equal(values(g).residentsAt,'transit');assert.equal(values(g).bedsAt,'party');checkpoint(g);
  arrive(g);assert.equal(values(g).residentsAt,'refuge');assert.equal(values(g).peopleMoved,false);
  choose(g,'unload');assert.equal(values(g).bedsAt,'refuge');assert.equal(values(g).peopleMoved,false);
  choose(g,'count');assert.equal(values(g).peopleMoved,true);assert.equal(values(g).powderReturned,false);
});
test('q016 two shortages and a real retreat resume the unpaid trade; later steps never pay a second time',()=>{
  const g=at('payment');g.state.gold=19;
  for(let i=0;i<2;i++){
    const available=g.state.gold;
    assert.equal(g.dispatch({type:'choose',id:'pay'}),false);
    choose(g,'pay_supplies');assert.equal(g.state.flags.questResume.q016,'q016.silentblast.payment.pay.resume');
    assert.equal(values(g).sealantAt,'aide');assert.equal(g.state.gold,available);checkpoint(g);
    assert.ok(g.dispatch({type:'retreat'}));drain(g);go(g,'store');
    if(!g.state.waiting)assert.ok(g.dispatch({type:'story.resume',quest:'q016'}));
    drain(g);assert.equal(g.state.flags.questResume.q016,null);
  }
  g.state.gold=20;choose(g,'pay');assert.equal(g.state.gold,0);assert.equal(values(g).sealantAt,'party');assert.equal(values(g).suppliesAt,'aide');
  checkpoint(g);assert.ok(!g.dispatch({type:'choose',id:'pay'}));
  choose(g,'hand_over');assert.equal(values(g).suppliesAt,'clerk');assert.equal(values(g).booksCorrected,false);
  choose(g,'report');assert.equal(values(g).reported,true);assert.equal(values(g).booksCorrected,false);
  choose(g,'correct','finish');assert.equal(g.state.gold,44);
});
test('q016 trial, observing the result and restarting the mine are separate actions',()=>{
  const g=at('trial_ready');assert.equal(values(g).trial,false);
  choose(g,'test','refuge');assert.equal(values(g).trial,true);assert.equal(values(g).vibrationChecked,false);
  choose(g,'read','works');assert.equal(values(g).vibrationChecked,true);assert.equal(values(g).reopened,false);
  choose(g,'finish');assert.equal(values(g).reopened,true);assert.equal(values(g).purchased,false);
});
for(const result of ['lose','escape'])test('q016 guard battle '+result+' returns to the unresolved choice',()=>{
  const g=ready();depart(g,'blast');checkpoint(g);g.finishBattle(result);drain(g);checkpoint(g);
  assert.equal(values(g).victory,false);assert.equal(values(g).forceBlasted,false);assert.equal(values(g).residentsAt,'shelter');
  resume(g);choose(g,'blast');assert.equal(values(g).victory,true);assert.equal(values(g).forceBlasted,false);
  choose(g,'proceed');assert.equal(values(g).residentsAt,'depths');assert.equal(values(g).bedsAt,'shelter');
  choose(g,'finish');checkpoint(g);
});

const departures=new Map();
for(const row of graph.active){
  const g=ready();g.load(row.save);
  for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){
    const key=row.scene+'_'+o.id;
    if(story.actions[key]?.journey&&!departures.has(key))departures.set(key,{save:row.save,id:o.id});
  }
}
assert.equal(departures.size,12);
for(const [key,row] of departures)for(const interruption of ['retreat','defeat'])test('q016 '+key+' survives '+interruption,()=>{
  const g=ready();g.load(row.save);depart(g,row.id);
  const facts=structuredClone(g.state.stories.q016),journey=structuredClone(g.state.journey);
  if(interruption==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
  drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q016,facts);assert.deepEqual(g.state.journey,journey);
  arrive(g);assert.equal(g.state.stories.q016.scene,story.actions[key].to);checkpoint(g);
});
for(const scene of Object.keys(story.scenes).filter(s=>s!=='entry'))test('q016 saved local work survives rescue at '+scene,()=>{
  const g=at(scene),facts=structuredClone(g.state.stories.q016);
  g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q016,facts);checkpoint(g);
});
for(const route of routes)test('q016 pre-upgrade dialogue, choices, battle and completion migrate: '+route.old.join('/'),()=>{
  const g=createQuestTrial(previousData,catalog,{quest:'q016',party:'balanced',start:'site',level:1,seed:1907}).engine;
  let next=0;
  for(let n=0;n<80;n++){
    const loaded=migrated(g),expected=JSON.parse(g.save());
    (expected.state.flags.legacyStoryRoutes??={}).q016=true;
    assert.deepEqual(JSON.parse(loaded.save()),expected);
    if(g.state.quests.q016.stage==='completed')break;
    if(g.state.battle){fight(g);fight(loaded);}
    else{
      const intent=g.state.waiting.type==='text'?{type:'advance'}:{type:'choose',id:route.old[next++]};
      assert.ok(g.dispatch(intent));assert.ok(loaded.dispatch(intent));
    }
    assert.equal(loaded.state.quests.q016.stage,g.state.quests.q016.stage);
    assert.deepEqual(loaded.state.flags.flow?.q016,g.state.flags.flow?.q016);
  }
  assert.equal(g.state.quests.q016.outcome,route.outcome);
});
for(const r of previous.model.interruptionRoutes)test('q016 pre-upgrade supply resume at '+r.from,()=>{
  const old=ready({old:true,visit:false}),rope=!!r.cost.rope;
  if(rope){old.evidence('q016','clue_a','手掛かりA');old.evidence('q016','clue_b','手掛かりB');old.state.inventory.rope=0;}
  else old.state.gold=19;
  if(r.from.includes('.catalog1.')){
    old.run('q016.catalog1.start');drain(old);
    if(!r.from.endsWith('.entry'))choose(old,'assistant');
    if(r.from.endsWith('.move'))choose(old,'warehouse');
  }else{old.run(r.from);drain(old);}
  choose(old,r.option);assert.equal(old.state.flags.questResume.q016,r.resume);
  const g=migrated(old);checkpoint(g);
  if(rope)g.give('rope',1);else g.state.gold=20;
  g.run(data.quests.q016.model.entryScript);drain(g);assert.equal(g.state.flags.questResume.q016,null);
  choose(g,r.action);assert.equal(g.state.quests.q016.outcome,rope?'informed':'compromise');
  if(rope)assert.equal(g.state.inventory.rope??0,0);else assert.equal(g.state.gold,44);
  checkpoint(g);
});
test('q016 uses free dungeon cells and preserves original mine terrain',()=>{
  for(const p of Object.values(story.worldPlaces)){
    const m=data.maps[p.map];
    assert.equal(m.tiles[p.y][p.x],'.');assert.deepEqual(m.tiles,previousData.maps[p.map].tiles);
    for(const o of m.objects.filter(o=>o.x===p.x&&o.y===p.y))assert.equal(o.quest,'q016',o.id);
  }
});
