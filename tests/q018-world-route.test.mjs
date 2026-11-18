import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {town} from './oddland-helpers.mjs';
import {locationRoot} from '../src/core/world.js';
import {objectVisible} from '../src/core/quest-events.js';
import {createQuestTrial} from '../src/application/quest-playtest.js';
import {data,previous,previousData,catalog,routes,values,checkpoint,ready,choose,depart,arrive,resume,migrated,enumerate,drain,fight} from './q018-helpers.mjs';

const graph=enumerate(),story=data.quests.q018.story;
function at(scene) {
  const g=ready(),row=graph.active.find(row=>row.scene===scene);
  assert.ok(row,scene);g.load(row.save);return g;
}
const originalFacts=previous.model.stateRegistry.map(field=>field.path.split('.').at(-1)).filter(k=>!['node','catalogRevision'].includes(k));

test('q018 source, scripts, endings and active event sets preserve accepted quests',()=>{
  const raw=fs.readFileSync(new URL('../data/quests/q018.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'26ed5509ac73ed7853ef0db8f10e41f0b0e997a5');
  for(const [id,script] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[id],script);
  for(const [id,ending] of Object.entries(previous.outcomes)){
    const {requires,...fields}=ending,{requires:current,...updated}=data.quests.q018.outcomes[id];
    assert.deepEqual(updated,fields);assert.deepEqual(current,story.endings[id]);
  }
  for(const [g,legacy] of [[migrated(ready({old:true})),true],[ready(),false]]){
    for(const m of Object.values(data.maps))for(const o of m.objects.filter(o=>o.quest==='q018'&&objectVisible(g.state,m,o))){
      assert.ok(legacy,o.id+' should only be active in a prior save');
    }
  }
});
test('q018 all six paths cover the entire graph, each save round trips, and cast matches physical locations',()=>{
  assert.deepEqual(new Set(graph.active.map(r=>r.scene)),new Set(Object.keys(story.scenes)));
  assert.deepEqual(new Set(graph.endings.flatMap(r=>JSON.parse(r.save).state.stories.q018.events)),new Set(Object.keys(story.actions)));
  const g=ready();
  for(const row of graph.active){
    g.load(row.save);checkpoint(g);
    const place=story.scenes[row.scene].place;
    const expected=Object.entries(story.entities).filter(([id,e])=>e.character&&values(g)[id+'At']===place).map(([,e])=>e.character);
    assert.deepEqual(new Set(projectGame(g).dialog.scene.cast.map(c=>c.id)),new Set(expected));
  }
});
for(const route of routes)test('q018 original final facts, ending and one-time reward: '+route.old.join('/'),()=>{
  const old=ready({old:true}),g=ready();choose(old,...route.old);choose(g,...route.path);
  assert.equal(g.state.quests.q018.outcome,route.outcome);
  for(const k of originalFacts)assert.equal(values(g)[k],old.state.flags.flow.q018[k],k);
  assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);
  const before=g.save();
  assert.throws(()=>g.complete('q018',route.outcome));assert.equal(g.save(),before);
  g.run(g.data.quests.q018.model.entryScript);drain(g);assert.equal(g.state.gold,old.state.gold);checkpoint(g);
});
test('q018 prior payment remains accepted while Ow travels and after a save is reloaded',()=>{
  for(const early of [true,false]){
    const g=ready(),gold=g.state.gold;
    choose(g,...(early?['copy','check','meet','call']:['both','call']));
    assert.equal(values(g).paymentConfirmed,early);
    assert.equal(values(g).installmentAt,early?'official':'borrower');
    depart(g,'escort');checkpoint(g);
    assert.equal(values(g).owAt,'transit');assert.equal(values(g).borrowerAt,'desk');
    assert.equal(values(g).owPresent,false);arrive(g);
    assert.equal(values(g).owPresent,true);choose(g,'split');
    const invalid=early?'pay':'verify',before=structuredClone(g.state.stories.q018);
    assert.equal(g.dispatch({type:'choose',id:invalid}),false);
    assert.deepEqual(g.state.stories.q018,before);checkpoint(g);
    choose(g,early?'verify':'pay');assert.equal(g.state.gold,gold);
    assert.equal(values(g).installmentAt,'official');assert.equal(values(g).paperReceipt,false);
    choose(g,'stamp');checkpoint(g);assert.equal(values(g).debtEnded,false);assert.equal(values(g).tabletAt,'borrower');
    assert.equal(g.state.stories.q018.events.filter(e=>['ritual_meet','agreed_pay'].includes(e)).length,1);
  }
});
test('q018 the second marked half and its copy stay at the desk until Ow receives them',()=>{
  const g=at('marked');
  assert.equal(values(g).completionLine,true);assert.equal(values(g).split,false);
  choose(g,'break');assert.equal(values(g).tabletAt,'halves');
  assert.equal(values(g).borrowerHalfAt,'official');assert.equal(values(g).owHalfAt,'official');
  choose(g,'borrower');checkpoint(g);
  assert.equal(values(g).borrowerHalfAt,'borrower');assert.equal(values(g).borrowerCopyAt,'borrower');
  assert.equal(values(g).owHalfAt,'official');assert.equal(values(g).owCopyAt,'official');
  g.defeat();drain(g);resume(g);choose(g,'ow');checkpoint(g);
  assert.equal(values(g).owHalfAt,'ow');assert.equal(values(g).owCopyAt,'ow');
});
test('q018 an intact original and the installment can travel separately',()=>{
  const g=at('carrying');assert.equal(values(g).tabletAt,'party');
  choose(g,'shop','hand');checkpoint(g);assert.equal(values(g).tabletAt,'ow');
  assert.equal(values(g).installmentAt,'borrower');assert.equal(values(g).owPresent,false);
  depart(g,'door');assert.equal(values(g).redSlipAt,'ow');checkpoint(g);arrive(g);
  choose(g,'post');assert.equal(values(g).redSlipAt,'door');assert.equal(values(g).debtEnded,false);
});
test('q018 entry to the mine and a voluntary retreat leave the unfinished town journey intact',()=>{
  const g=ready();choose(g,'copy','check','meet');depart(g,'call');
  const saved=structuredClone(g.state.stories.q018),journey=structuredClone(g.state.journey);
  const gate=Object.values(g.data.locations).find(p=>p.dungeons?.includes('region_2')&&locationRoot(g.data,p.id)?.id==='hikarigaeri_square');
  assert.ok(gate);town(g,gate.id);assert.ok(g.dispatch({type:'travel',dungeon:'region_2'}),g.state.notice);
  drain(g);assert.ok(g.dispatch({type:'retreat'}),g.state.notice);drain(g);checkpoint(g);
  assert.deepEqual(g.state.stories.q018,saved);assert.deepEqual(g.state.journey,journey);
  arrive(g);assert.equal(values(g).installmentAt,'official');assert.equal(values(g).tabletAt,'borrower');
});
const departures=new Map();
for(const row of graph.active){
  const g=ready();g.load(row.save);
  for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){
    const key=row.scene+'_'+o.id;
    if(story.actions[key]?.journey&&!departures.has(key))departures.set(key,{save:row.save,id:o.id});
  }
}
assert.equal(departures.size,9);
for(const [key,row] of departures)for(const interruption of ['retreat','defeat'])test('q018 '+key+' survives '+interruption,()=>{
  const g=ready();g.load(row.save);depart(g,row.id);
  const facts=structuredClone(g.state.stories.q018),journey=structuredClone(g.state.journey);
  if(interruption==='retreat' && g.state.mode==='town'){
    const before=JSON.parse(g.save());
    assert.equal(g.dispatch({type:'retreat'}),false);
    const after=JSON.parse(g.save());delete before.state.notice;delete after.state.notice;assert.deepEqual(after,before);
  }else if(interruption==='retreat')assert.ok(g.dispatch({type:'retreat'}));
  else g.defeat();
  drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q018,facts);assert.deepEqual(g.state.journey,journey);
  arrive(g);assert.equal(g.state.stories.q018.scene,story.actions[key].to);checkpoint(g);
});
for(const scene of Object.keys(story.scenes).filter(s=>s!=='entry'))test('q018 saved local work survives rescue at '+scene,()=>{
  const g=at(scene),facts=structuredClone(g.state.stories.q018);
  g.defeat();drain(g);checkpoint(g);resume(g);assert.deepEqual(g.state.stories.q018,facts);checkpoint(g);
});
for(const route of routes)test('q018 pre-upgrade dialogue, choices and completion migrate: '+route.old.join('/'),()=>{
  const g=createQuestTrial(previousData,catalog,{quest:'q018',party:'balanced',start:'site',level:1,seed:1907}).engine;
  let next=0;
  for(let n=0;n<80;n++){
    const loaded=migrated(g),expected=JSON.parse(g.save());
    (expected.state.flags.legacyStoryRoutes??={}).q018=true;
    assert.deepEqual(JSON.parse(loaded.save()),expected);
    if(g.state.quests.q018.stage==='completed')break;
    if(g.state.battle){fight(g);fight(loaded);}
    else{
      const intent=g.state.waiting.type==='text'?{type:'advance'}:{type:'choose',id:route.old[next++]};
      assert.ok(g.dispatch(intent));assert.ok(loaded.dispatch(intent));
    }
    assert.equal(loaded.state.quests.q018.stage,g.state.quests.q018.stage);
    assert.deepEqual(loaded.state.flags.flow?.q018,g.state.flags.flow?.q018);
  }
  assert.equal(g.state.quests.q018.outcome,route.outcome);
});
const olderRoutes=[
  ['flow.visit',['seize'],'contract'],['flow.visit',['copy','dissolve'],'informed'],
  ['flow.visit',['both','split'],'compromise'],['flow.visit',['copy','call','split'],'compromise'],
  ['flow.visit',['both','stamp','dissolve'],'informed'],['flow.visit',['copy','call','stamp','dissolve'],'informed'],
  ['flow.visit',['both','stamp','call','split'],'compromise'],
  ...['decision','review'].flatMap(entry=>['informed','contract','compromise'].map(outcome=>[entry,[outcome],outcome]))
];
for(const [entry,path,outcome] of olderRoutes)test('q018 preserves older '+entry+' '+path.join('/'),()=>{
  const old=ready({old:true,visit:false});
  const clues=entry==='decision'?['clue_a','clue_b']:['clue_a'];
  if(entry!=='flow.visit'&&outcome==='informed')for(const clue of clues)old.evidence('q018',clue,clue);
  old.run('q018.'+entry);drain(old);
  const g=migrated(old);checkpoint(g);assert.equal(g.state.flags.legacyStoryRoutes.q018,true);
  if(entry!=='flow.visit'&&outcome==='compromise')assert.equal(g.dispatch({type:'choose',id:'informed'}),false);
  const startsBattle=entry!=='flow.visit'&&outcome==='contract';
  for(const id of path){depart(g,id);checkpoint(g);if(g.state.battle){assert.ok(startsBattle);fight(g);checkpoint(g);}}
  assert.equal(g.state.quests.q018.outcome,outcome);assert.equal(g.state.records.battles,Number(startsBattle));
});
test('q018 town destinations exist and the original underground events remain in place',()=>{
  for(const p of Object.values(story.worldPlaces)) {assert.equal(p.kind,'town');assert.ok(data.locations[p.location]);}
  assert.deepEqual(data.quests.q018.locations,previous.locations);
});
