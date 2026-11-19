import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {data,previous,previousData,routes,values,checkpoint,ready,choose,depart,arrive,resume,migrated,enumerate,drain,fight} from './q022-helpers.mjs';

const graph=enumerate(),story=data.quests.q022.story;
function at(scene){
  const row=graph.active.find(x=>x.scene===scene);
  assert.ok(row,scene);
  const g=ready();g.load(row.save);return g;
}
test('q022 original byte identity, older script routing and existing prizes',()=>{
  const raw=fs.readFileSync(new URL('../data/quests/q022.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'0752ce4cdb65a65b8ba0468d6b00e794736f379a');
  for(const [id,script] of Object.entries(previous.scripts))assert.deepEqual(data.scripts[id],script,id);
  for(const [id,old] of Object.entries(previous.outcomes)){
    const {requires,...value}=old,{requires:current,...newValue}=data.quests.q022.outcomes[id];
    assert.deepEqual(newValue,value,id);
    assert.deepEqual(current,story.endings[id],id);
  }
  assert.equal(data.quests.q022.model.currentStoryScriptPrefix,'q022.greensleep.');
  assert.equal(data.quests.q022.model.preserveAcceptedRoute,true);
  for(const [g,legacy] of [[ready(),false],[migrated(ready({old:true})),true]])
    for(const m of Object.values(data.maps))for(const o of m.objects.filter(o=>o.quest==='q022'&&objectVisible(g.state,m,o)))
      assert.equal(o.id.startsWith('q022_green_sleep_'),!legacy,o.id);
});
test('q022 six paths cover all scenes and all actions, with actual co-present characters',()=>{
  assert.equal(graph.endings.length,6);
  assert.deepEqual(new Set(graph.active.map(x=>x.scene)),new Set(Object.keys(story.scenes)));
  assert.deepEqual(new Set(graph.endings.flatMap(x=>JSON.parse(x.save).state.stories.q022.events)),new Set(Object.keys(story.actions)));
  assert.equal(Object.values(story.actions).filter(a=>a.journey).length,8);
  assert.deepEqual(new Set(graph.endings.map(x=>x.outcome)),new Set(['informed','compromise','contract']));
  for(const row of graph.active){
    const g=ready();g.load(row.save);checkpoint(g);
    const place=story.scenes[row.scene].place,seen=projectGame(g).dialog.scene?.cast.map(x=>x.id)??[];
    const expected=Object.entries(story.entities).filter(([id,e])=>e.character&&values(g)[id+'At']===place).map(([,e])=>e.character);
    assert.deepEqual(new Set(seen),new Set(expected),row.scene);
  }
});
for(const route of routes)test('q022 source branch remains '+route.old.join('/')+' -> '+route.outcome,()=>{
  const g=ready(),old=ready({old:true});
  choose(g,...route.path);choose(old,...route.old);
  assert.equal(g.state.quests.q022.outcome,route.outcome);
  assert.equal(values(g).round,route.round);
  assert.equal(g.state.flags.flow?.q022?.round,undefined);
  assert.equal(g.state.gold,old.state.gold);
  assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);
  assert.equal(g.state.quests.q022.outcome,old.state.quests.q022.outcome);
  const saved=g.save();
  assert.throws(()=>g.complete('q022',route.outcome));
  assert.equal(g.save(),saved);checkpoint(g);
});
test('q022 bandaging and two observations are distinct, bounded and preserve healing response',()=>{
  const g=ready();
  choose(g,'dress');checkpoint(g);
  assert.equal(values(g).woundClean,false);
  assert.equal(values(g).woundDressed,false);
  assert.equal(values(g).patientMobility,'assisted');
  assert.equal(values(g).stretcherAt,'patient');
  choose(g,'clean');checkpoint(g);
  assert.equal(values(g).woundClean,true);
  assert.equal(values(g).woundDressed,false);
  choose(g,'bandage');checkpoint(g);
  assert.equal(values(g).bandageAt,'patient');
  assert.equal(values(g).woundDressed,true);
  assert.equal(values(g).round,0);
  const before=g.save();assert.equal(g.dispatch({type:'choose',id:'awake'}),false);assert.equal(g.save(),before);
  for(let n=1;n<=2;n++){
    choose(g,'observe');checkpoint(g);assert.equal(values(g).round,n);
    assert.equal(values(g).patientAwake,false);
  }
  const after=g.save();assert.equal(g.dispatch({type:'choose',id:'observe'}),false);assert.equal(g.save(),after);
  assert.equal(g.state.stories.q022.events.filter(x=>x==='watch_observe').length,1);
  choose(g,'awake');checkpoint(g);assert.equal(values(g).spontaneousAwake,true);
  assert.equal(values(g).patientOnStretcher,false);
  assert.equal(values(g).stretcherAt,'hana');
  assert.equal(values(g).guardianDefeated,false);assert.equal(values(g).feverReturned,false);
  choose(g,'escort','finish');checkpoint(g);
  assert.equal(values(g).patientAt,'clinic');assert.equal(values(g).hanaAt,'clinic');
  assert.equal(values(g).recoveryNoted,true);
  assert.equal(g.state.quests.q022.outcome,'informed');
});
for(const amount of [0,1,2])test('q022 quiet transport stays available after '+amount+' observations',()=>{
  const g=ready();
  choose(g,'dress','clean','bandage',...Array(amount).fill('observe'));
  assert.equal(values(g).round,amount);assert.equal(values(g).patientAwake,false);
  choose(g,'transport');checkpoint(g);
  assert.equal(values(g).patientAt,'litter');assert.equal(values(g).stretcherAt,'patient');
  assert.equal(values(g).sporeSampleAt,'patient');
  choose(g,'sample');assert.equal(values(g).sporeSampleAt,'hana');assert.equal(values(g).sporesSampled,true);
  choose(g,'clinic','finish');checkpoint(g);
  assert.equal(values(g).patientAt,'clinic');assert.equal(values(g).patientAwake,false);
  assert.equal(values(g).feverReturned,false);assert.equal(g.state.quests.q022.outcome,'compromise');
});
test('q022 direct carry takes the patient on a stretcher, not an invented cure',()=>{
  const g=ready();choose(g,'carry');checkpoint(g);
  assert.equal(values(g).woundClean,false);assert.equal(values(g).woundDressed,false);
  assert.equal(values(g).patientOnStretcher,true);assert.equal(values(g).patientAt,'litter');
  choose(g,'sample','clinic','finish');checkpoint(g);
  assert.equal(values(g).sporeSampleAt,'hana');assert.equal(values(g).patientAwake,false);
  assert.equal(values(g).clinicReceived,true);assert.equal(g.state.quests.q022.outcome,'compromise');
});
test('q022 two guardians are fought before forceful awakening; returning fever is distinct from waking',()=>{
  const g=ready();choose(g,'wake');checkpoint(g);
  assert.equal(values(g).guardianDefeated,false);assert.equal(values(g).patientAt,'bedside');
  depart(g,'fight');assert.equal(g.state.battle.enemies.length,2);
  assert.equal(values(g).guardianDefeated,false);
  fight(g);drain(g);checkpoint(g);
  assert.equal(values(g).guardianDefeated,true);assert.equal(values(g).patientAwake,false);
  choose(g,'return','wake');checkpoint(g);
  assert.equal(values(g).patientAwake,true);assert.equal(values(g).healingInterrupted,true);
  assert.equal(values(g).feverReturned,false);
  choose(g,'escort');checkpoint(g);
  assert.equal(values(g).patientAt,'clinic');assert.equal(values(g).feverReturned,false);
  choose(g,'report');checkpoint(g);
  assert.equal(values(g).feverReturned,true);assert.equal(g.state.quests.q022.outcome,'contract');
});
test('q022 battle loss and permitted escape never mark the guardians defeated',()=>{
  for(const escaped of [false,true]){
    const g=ready();choose(g,'wake');depart(g,'fight');assert.ok(g.state.battle);
    if(escaped){
      assert.equal(g.data.encounters.guard_3.escape,true);g.random=()=>0;
      assert.ok(g.dispatch({type:'battle',action:'escape'}));drain(g);assert.equal(g.state.records.escapes,1);
    }else{g.defeat();drain(g);}
    checkpoint(g);assert.equal(g.state.quests.q022.stage,'active');
    assert.equal(values(g).guardianDefeated,false);assert.equal(values(g).patientAwake,false);assert.equal(values(g).feverReturned,false);
    assert.equal(values(g).patientAt,'bedside');
    g.random=()=>0.999999;
    resume(g);choose(g,'fight','return','wake','escort','report');
    assert.equal(g.state.quests.q022.outcome,'contract');
  }
});
for(const scene of ['wash_site','washed','watch','litter_site','sampled','spore_stage','guardian_down','force_ready','forced_awake'])
  test('q022 rescue preserves work at '+scene,()=>{
    const g=at(scene),before=structuredClone(g.state.stories.q022);
    g.defeat();drain(g);checkpoint(g);
    const actual=structuredClone(g.state.stories.q022);
    assert.equal(actual.values.partyAt,'transit');actual.values.partyAt=before.values.partyAt;
    assert.deepEqual(actual,before);
    resume(g);checkpoint(g);assert.deepEqual(g.state.stories.q022,before);
  });
const departures=new Map();
for(const row of graph.active){
  const g=ready();g.load(row.save);
  for(const o of projectGame(g).dialog.options.filter(x=>x.enabled)){
    const key=row.scene+'_'+o.id;
    if(story.actions[key]?.journey&&!departures.has(key))departures.set(key,{save:row.save,choice:o.id});
  }
}
assert.equal(departures.size,8);
for(const [key,row] of departures)for(const kind of ['retreat','defeat'])
  test('q022 '+key+' journey is interruptible by '+kind,()=>{
    const g=ready();g.load(row.save);depart(g,row.choice);
    const before=structuredClone(g.state.stories.q022),journey=structuredClone(g.state.journey);
    if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
    drain(g);checkpoint(g);assert.deepEqual(g.state.stories.q022,before);
    assert.deepEqual(g.state.journey,journey);
    arrive(g);checkpoint(g);assert.equal(g.state.stories.q022.scene,story.actions[key].to);
  });
for(const route of routes)test('q022 accepted old saves keep their original command sequence '+route.old.join('/'),()=>{
  const old=ready({old:true}),g=migrated(old);checkpoint(g);
  assert.equal(g.state.flags.legacyStoryRoutes.q022,true);
  for(const id of route.old){
    depart(old,id);depart(g,id);
    if(old.state.battle){fight(old);fight(g);}
    checkpoint(g);
    assert.equal(g.state.quests.q022.stage,old.state.quests.q022.stage);
    assert.equal(g.state.flags.flow?.q022?.round,old.state.flags.flow.q022?.round);
  }
  assert.equal(g.state.quests.q022.outcome,route.outcome);
});
test('q022 new quest events occupy floor sites and original geometry is unchanged',()=>{
  const occupied=new Set();
  for(const [id,q] of Object.entries(data.quests))if(id!=='q022')
    for(const e of q.events??[])for(const p of e.points??[])occupied.add(p.map+'/'+p.x+','+p.y);
  for(const [key,p] of Object.entries(story.worldPlaces)){
    if(p.kind==='town'){assert.ok(data.locations[p.location]);continue;}
    const map=data.maps[p.map];
    assert.equal(map.tiles[p.y][p.x],'.',key);
    // Previous q022 clues may share a cell but can only be shown to old accepted routes.
    assert.equal(occupied.has(p.map+'/'+p.x+','+p.y),false,key);
    for(const o of map.objects.filter(o=>o.x===p.x&&o.y===p.y))assert.equal(o.quest,'q022',key+' '+o.id);
  }
  assert.deepEqual(data.maps.region_3_f1.tiles,previousData.maps.region_3_f1.tiles);
});
