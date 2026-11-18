import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {createQuestTrial} from '../src/application/quest-playtest.js';
import {data,previous,previousData,catalog,routes,values,checkpoint,ready,choose,depart,arrive,resume,migrated,enumerate,drain,fight} from './q017-helpers.mjs';

const graph=enumerate(),story=data.quests.q017.story;
function at(scene) {
  const g=ready(),row=graph.active.find(row=>row.scene===scene);
  assert.ok(row,scene);g.load(row.save);return g;
}
const originalFacts=previous.model.stateRegistry.map(field=>field.path.split('.').at(-1)).filter(k=>!['node','catalogRevision'].includes(k));

test('q017 source, scripts, endings and active event sets preserve accepted quests',()=>{
  const raw=fs.readFileSync(new URL('../data/quests/q017.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'4c97150150181e98b8d6931b0847bdfd30e42def');
  for(const [id,script] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[id],script);
  for(const [id,ending] of Object.entries(previous.outcomes)){
    const {requires,...fields}=ending,{requires:current,...updated}=data.quests.q017.outcomes[id];
    assert.deepEqual(updated,fields);assert.deepEqual(current,story.endings[id]);
  }
  for(const [g,legacy] of [[migrated(ready({old:true})),true],[ready(),false]]){
    for(const m of Object.values(data.maps))for(const o of m.objects.filter(o=>o.quest==='q017'&&objectVisible(g.state,m,o))){
      assert.equal(o.id.startsWith('q017_two_graves_'),!legacy,o.id);
    }
  }
});
test('q017 all four paths cover the entire graph, each save round trips, and cast matches physical locations',()=>{
  assert.deepEqual(new Set(graph.active.map(r=>r.scene)),new Set(Object.keys(story.scenes)));
  assert.deepEqual(new Set(graph.endings.flatMap(r=>JSON.parse(r.save).state.stories.q017.events)),new Set(Object.keys(story.actions)));
  const g=ready();
  for(const row of graph.active){
    g.load(row.save);checkpoint(g);
    const place=story.scenes[row.scene].place;
    const expected=Object.entries(story.entities).filter(([id,e])=>e.character&&values(g)[id+'At']===place).map(([,e])=>e.character);
    assert.deepEqual(new Set(projectGame(g).dialog.scene.cast.map(c=>c.id)),new Set(expected));
  }
});
for(const route of routes)test('q017 original final facts, ending and one-time reward: '+route.old.join('/'),()=>{
  const old=ready({old:true}),g=ready();choose(old,...route.old);choose(g,...route.path);
  assert.equal(g.state.quests.q017.outcome,route.outcome);
  for(const k of originalFacts)assert.equal(values(g)[k],old.state.flags.flow.q017[k],k);
  assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);
  const before=g.save();
  assert.throws(()=>g.complete('q017',route.outcome));assert.equal(g.save(),before);
  g.run(g.data.quests.q017.model.entryScript);drain(g);assert.equal(g.state.gold,old.state.gold);checkpoint(g);
});
test('q017 originals and remains stay in place while two copies are carried and compared',()=>{
  const g=at('cemetery');
  assert.equal(values(g).emptyKnown,true);assert.equal(values(g).remainsKnown,false);
  choose(g,'copy','records','copy');checkpoint(g);
  const v=values(g);
  assert.equal(v.burialRegisterAt,'sexton');assert.equal(v.recoveryRegisterAt,'clerk');assert.equal(v.remainsAt,'surfaceTomb');
  assert.equal(v.burialCopyAt,'party');assert.equal(v.recoveryCopyAt,'party');assert.equal(v.recordsCompared,false);
  choose(g,'compare');assert.equal(values(g).recordsCompared,true);assert.equal(values(g).remainsKnown,true);
});
test('q017 original lunchbox and shared lunchbox have independent custodians throughout delivery',()=>{
  const g=at('permission');choose(g,'consent');
  assert.equal(values(g).boxAt,'undergroundTomb');assert.equal(values(g).sharedBoxAt,'peers');
  choose(g,'take');depart(g,'deliver');checkpoint(g);
  assert.equal(values(g).partyAt,'transit');assert.equal(values(g).boxAt,'party');assert.equal(values(g).familyAt,'families');
  arrive(g);assert.equal(values(g).boxAt,'party');choose(g,'hand');
  assert.equal(values(g).boxAt,'family');assert.equal(values(g).sharedBoxAt,'peers');
  assert.equal(values(g).familyConsulted,false);
  choose(g,'report');assert.equal(values(g).sharedPlaced,false);
  choose(g,'place','finish');assert.equal(values(g).sharedBoxAt,'undergroundTomb');assert.equal(values(g).boxAt,'family');
});
test('q017 the family accompanies the party only for the inscription and offers flowers after it is carved',()=>{
  const g=at('family_choice');choose(g,'both');
  assert.equal(values(g).familyConsulted,true);assert.equal(values(g).wordingAgreed,false);
  depart(g,'escort');assert.equal(values(g).familyAt,'transit');assert.equal(values(g).flowersAt,'family');checkpoint(g);
  arrive(g);choose(g,'agree');assert.equal(values(g).inscribed,false);choose(g,'carve');
  assert.equal(values(g).flowersLaid,false);assert.equal(values(g).boxAt,'undergroundTomb');
  choose(g,'flowers','finish');assert.equal(values(g).flowersAt,'undergroundTomb');assert.equal(values(g).peersConsent,false);
});
test('q017 removal waits for the return of the original box',()=>{
  const g=at('return_box');choose(g,'lift');assert.equal(values(g).boxAt,'party');assert.equal(values(g).removed,false);
  choose(g,'return');checkpoint(g);assert.equal(values(g).boxAt,'peers');assert.equal(values(g).removed,false);
  choose(g,'remove','finish');assert.equal(values(g).removed,true);assert.equal(values(g).familyConsulted,false);
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
for(const [key,row] of departures)for(const interruption of ['retreat','defeat'])test('q017 '+key+' survives '+interruption,()=>{
  const g=ready();g.load(row.save);depart(g,row.id);
  const facts=structuredClone(g.state.stories.q017),journey=structuredClone(g.state.journey);
  if(interruption==='retreat' && g.state.mode==='town'){
    const before=JSON.parse(g.save());
    assert.equal(g.dispatch({type:'retreat'}),false);
    const after=JSON.parse(g.save());delete before.state.notice;delete after.state.notice;assert.deepEqual(after,before);
  }else if(interruption==='retreat')assert.ok(g.dispatch({type:'retreat'}));
  else g.defeat();
  drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q017,facts);assert.deepEqual(g.state.journey,journey);
  arrive(g);assert.equal(g.state.stories.q017.scene,story.actions[key].to);checkpoint(g);
});
for(const scene of Object.keys(story.scenes).filter(s=>s!=='entry'))test('q017 saved local work survives rescue at '+scene,()=>{
  const g=at(scene),facts=structuredClone(g.state.stories.q017);
  g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q017,facts);checkpoint(g);
});
for(const route of routes)test('q017 pre-upgrade dialogue, choices and completion migrate: '+route.old.join('/'),()=>{
  const g=createQuestTrial(previousData,catalog,{quest:'q017',party:'balanced',start:'site',level:1,seed:1907}).engine;
  let next=0;
  for(let n=0;n<80;n++){
    const loaded=migrated(g),expected=JSON.parse(g.save());
    (expected.state.flags.legacyStoryRoutes??={}).q017=true;
    assert.deepEqual(JSON.parse(loaded.save()),expected);
    if(g.state.quests.q017.stage==='completed')break;
    if(g.state.battle){fight(g);fight(loaded);}
    else{
      const intent=g.state.waiting.type==='text'?{type:'advance'}:{type:'choose',id:route.old[next++]};
      assert.ok(g.dispatch(intent));assert.ok(loaded.dispatch(intent));
    }
    assert.equal(loaded.state.quests.q017.stage,g.state.quests.q017.stage);
    assert.deepEqual(loaded.state.flags.flow?.q017,g.state.flags.flow?.q017);
  }
  assert.equal(g.state.quests.q017.outcome,route.outcome);
});
const olderRoutes=[
  ['flow.visit',['inscription'],'informed'],['flow.visit',['remove'],'contract'],
  ['flow.visit',['family','both'],'informed'],['flow.visit',['family','box'],'compromise'],
  ...['decision','review'].flatMap(entry=>['informed','contract','compromise'].map(outcome=>[entry,[outcome],outcome]))
];
for(const [entry,path,outcome] of olderRoutes)test('q017 preserves older '+entry+' '+path.join('/'),()=>{
  const old=ready({old:true,visit:false});
  const clues=entry==='decision'?['clue_a','clue_b']:['clue_a'];
  if(entry!=='flow.visit'&&outcome==='informed')for(const clue of clues)old.evidence('q017',clue,clue);
  old.run('q017.'+entry);drain(old);
  const g=migrated(old);checkpoint(g);assert.equal(g.state.flags.legacyStoryRoutes.q017,true);
  if(entry!=='flow.visit'&&outcome==='compromise')assert.equal(g.dispatch({type:'choose',id:'informed'}),false);
  const startsBattle=entry!=='flow.visit'&&outcome==='contract';
  for(const id of path){depart(g,id);checkpoint(g);if(g.state.battle){assert.ok(startsBattle);fight(g);checkpoint(g);}}
  assert.equal(g.state.quests.q017.outcome,outcome);assert.equal(g.state.records.battles,Number(startsBattle));
});
test('q017 uses free dungeon cells and preserves original mine terrain',()=>{
  for(const p of Object.values(story.worldPlaces)){
    if(p.kind==='town'){assert.ok(data.locations[p.location]);continue;}
    const m=data.maps[p.map];
    assert.equal(m.tiles[p.y][p.x],'.');assert.deepEqual(m.tiles,previousData.maps[p.map].tiles);
    for(const o of m.objects.filter(o=>o.x===p.x&&o.y===p.y))assert.equal(o.quest,'q017',o.id);
  }
});
