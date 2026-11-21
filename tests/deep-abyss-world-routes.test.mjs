import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {arrive,checkpoint,choose,depart,go,resume} from './world-route-helpers.mjs';
import {drain,fight,goTownLocation} from './helpers.mjs';
import {data,previous,ready,migrated,routes,states,setupRoute,expectedValues,oldDecision} from './deep-abyss-helpers.mjs';

const blobs={q096:'a339e58c099c6446be018c463d12fdb696a93bdb',q097:'ecf342d72324ecfacaeeeadbf780c14777474fc2',q098:'f0060f582278b53429c087ae56a07b7ce91bfe9a',q099:'50191de3bb00e1437b27fcbe0da9afe4d5f82e74',q100:'d8ce34219fbd76141866e5267fac70ea73e6ceb5'};
const people={q096:{noa:'belt',clerk:'depot'},q097:{yachi:'roll',porter:'roll',crew:'roll'},q098:{mori:'desk',resident:'window'},
  q099:{returner:'lamp',resident:'lamp',rine:'exit'},q100:{keepers:'desk',reader:'table'}};
const endingTitles={informed:'道を次へ渡す者',contract:'迷宮の鍵を持つ者',compromise:'灯を守って帰る者'};
const values=(g,q)=>g.state.stories[q].values;
for(const [q,paths] of Object.entries(routes)){
  const story=data.quests[q].story,graph=states(q);
  test(q+' keeps the originals, floor geometry and version-exclusive field events',()=>{
    const raw=readFileSync(new URL('../data/quests/'+q+'.json',import.meta.url));
    assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),blobs[q]);
    for(const [id,script] of Object.entries(previous.quests[q].scripts))assert.deepEqual(data.scripts[id],script);
    assert.deepEqual(data.quests[q].requires,previous.quests[q].requires);
    const orig=ready(q,{old:true}),legacy=migrated(orig),current=ready(q);
    for(const p of Object.values(story.worldPlaces)){
      const map=data.maps[p.map],oldMap=previous.maps[p.map],here=m=>m.objects.filter(o=>o.x===p.x&&o.y===p.y);
      const visible=(g,m)=>here(m).filter(o=>objectVisible(g.state,m,o)).map(o=>o.id);
      assert.equal(p.map,'region_10_f2');assert.equal(map.tiles[p.y][p.x],'.');
      assert.ok(here(map).every(o=>o.quest===q));assert.deepEqual(visible(current,map),[p.event]);assert.deepEqual(visible(legacy,map),visible(orig,oldMap));
    }
    if(q==='q100')assert.deepEqual(data.quests[q].events.find(e=>e.trigger==='action'),previous.quests[q].events.find(e=>e.trigger==='action'));
  });
  for(const r of paths)test(q+' '+r.old.join('/')+' preserves original result, items and reward once',()=>{
    const g=ready(q),old=ready(q,{old:true});setupRoute(g,q,r);setupRoute(old,q,r);let legacy=migrated(old);
    for(const id of r.path){choose(g,q,id);checkpoint(g);}
    for(const id of r.old){
      choose(old,q,id);choose(legacy,q,id);checkpoint(legacy);assert.deepEqual(legacy.state.flags.flow[q],old.state.flags.flow[q]);legacy=migrated(old);
    }
    const v=values(g,q);
    for(const [k,expected] of Object.entries(expectedValues(q,r)))assert.equal(v[k],expected,k);
    for(const e of [g,legacy]){
      assert.equal(e.state.quests[q].outcome,r.outcome);assert.equal(e.state.gold,old.state.gold);assert.equal(e.state.actors.ada.xp,old.state.actors.ada.xp);
      assert.deepEqual(e.state.inventory,old.state.inventory);assert.deepEqual(e.state.records.battles,old.state.records.battles);
      if(q==='q100'){assert.equal(e.state.ending.title,endingTitles[r.outcome]);assert.deepEqual(e.state.ending,old.state.ending);}
      const saved=e.save();assert.throws(()=>e.complete(q,r.outcome));assert.equal(e.save(),saved);
    }
  });
  test(q+' every saved scene returns after rescue with the same local speakers, custody and text',()=>{
    assert.deepEqual(new Set(graph.current.map(r=>r.scene)),new Set(Object.keys(story.scenes)));
    for(const row of graph.current){
      const g=ready(q);g.load(row.save);const state=structuredClone(g.state.stories[q]),place=story.scenes[row.scene].place;
      const expected=Object.keys(people[q]).filter(w=>state.values[w+'At']===place).map(w=>story.entities[w].character);
      const cast=()=>projectGame(g).dialog.scene.cast.map(c=>c.id),text=projectGame(g).dialog.text;
      assert.deepEqual(cast(),expected);g.defeat();drain(g);checkpoint(g);
      assert.deepEqual(g.state.stories[q],{...state,values:{...state.values,partyAt:'transit'}});
      go(g,q,place);resume(g,q);assert.deepEqual(g.state.stories[q],state);assert.deepEqual(cast(),expected);assert.equal(projectGame(g).dialog.text,text);
    }
  });
  const trips=new Map();
  for(const row of graph.current){
    const g=ready(q);g.load(row.save);
    for(const o of projectGame(g).dialog.options.filter(o=>o.enabled)){
      const action=row.scene+'_'+o.id;if(story.actions[action]?.journey&&!trips.has(action))trips.set(action,{row,id:o.id});
    }
  }
  assert.equal(trips.size,Object.values(story.actions).filter(a=>a.journey).length);
  for(const [action,{row,id}] of trips)for(const kind of ['retreat','defeat']){
    test(q+' '+action+' preserves travellers and waiting people through '+kind,()=>{
      const g=ready(q);g.load(row.save);const before=structuredClone(values(g,q));depart(g,id);
      const pending=structuredClone(g.state.journey),saved=structuredClone(g.state.stories[q]),trip=story.actions[action].journey;
      assert.equal(saved.values.partyAt,'transit');for(const who of trip.companions)assert.equal(saved.values[who+'At'],'transit');
      assert.equal(g.dispatch({type:'story.resume',quest:q}),false);
      if(kind==='defeat')g.defeat();else assert.ok(g.dispatch({type:'retreat'}));drain(g);checkpoint(g);
      assert.deepEqual(g.state.journey,pending);assert.deepEqual(g.state.stories[q],saved);arrive(g,q);checkpoint(g);
      const after=values(g,q);assert.equal(g.state.stories[q].scene,story.actions[action].to);
      assert.deepEqual(after,{...before,partyAt:trip.to,...Object.fromEntries(trip.companions.map(w=>[w+'At',trip.to]))});
    });
  }
  for(const scene of ['decision','review'])for(const ending of ['informed','compromise','contract']){
    test(q+' old '+scene+' handles evidence, supplies, saved battles and '+ending,()=>{
      const old=ready(q,{old:true,start:'reception'});if(ending==='informed')for(const clue of ['clue_a','clue_b'])old.evidence(q,clue,clue);
      oldDecision(old,q,scene);delete old.random;const g=migrated(old);checkpoint(g);
      for(const e of [old,g]){
        if(ending!=='informed')assert.equal(e.dispatch({type:'choose',id:'informed'}),false);
        depart(e,ending);if(e.state.battle){checkpoint(e);fight(e);drain(e);}assert.equal(e.state.quests[q].outcome,ending);
      }
      assert.equal(g.state.gold,old.state.gold);assert.deepEqual(g.state.inventory,old.state.inventory);assert.equal(g.state.records.battles,old.state.records.battles);assert.deepEqual(g.state.ending,old.state.ending);
    });
  }
}

for(const deep of [false,true])for(const kind of ['retreat','defeat'])test('q096 restock exactly once at '+(deep?'deep':'corner')+' after '+kind,()=>{
  const q='q096',g=ready(q),id=deep?'fresh':'replace',place=deep?'deep':'cache';
  choose(g,q,'follow');choose(g,q,'read');if(deep)choose(g,q,'route');delete g.state.inventory.ration;checkpoint(g);
  assert.equal(g.dispatch({type:'choose',id}),false);depart(g,id+'_supplies');checkpoint(g);assert.equal(values(g,q).swap,'none');
  if(kind==='defeat')g.defeat();else assert.ok(g.dispatch({type:'retreat'}));drain(g);goTownLocation(g,'hikarigaeri_shop');assert.ok(g.dispatch({type:'buy',item:'ration'}));
  go(g,q,place);resume(g,q);assert.equal(g.state.inventory.ration,1);choose(g,q,id);assert.equal(g.state.inventory.ration??0,0);
  const paid=structuredClone(g.state.stories[q]);g.defeat();drain(g);checkpoint(g);go(g,q,place);resume(g,q);
  assert.deepEqual(g.state.stories[q],paid);assert.equal(g.dispatch({type:'choose',id}),false);choose(g,q,'note');assert.equal(g.state.quests[q].outcome,'compromise');
});

for(const [q,id,encounter] of [['q098','open','guard_10'],['q099','bring','guard_10'],['q100','key','boss_10']]){
  test(q+' loss and retry preserve the unopened route and winning does not finish it',()=>{
    const g=ready(q);depart(g,id);assert.equal(g.state.battle.encounter,encounter);checkpoint(g);
    g.defeat();drain(g);checkpoint(g);assert.equal(values(g,q).guardDown,false);assert.equal(g.state.quests[q].stage,'active');
    const entry=data.quests[q].story.scenes.entry.place;go(g,q,entry);resume(g,q);choose(g,q,id);checkpoint(g);
    assert.equal(values(g,q).guardDown,true);assert.equal(g.state.quests[q].stage,'active');
    if(q==='q100'){assert.equal(values(g,q).keyAt,'gate');assert.equal(g.state.ending,null);}
  });
}

test('q100 recalls both valid q001 endings, each q098 disclosure and each q099 contact history',()=>{
  const q='q100';for(const first of ['informed','compromise'])for(const room of ['informed','compromise','contract'])for(const lamp of ['informed','compromise','contract']){
    const g=ready(q);setupRoute(g,q,{history:{q001:first,q098:room,q099:lamp}});choose(g,q,'records');
    let text=g.state.log.join('\n');assert.ok(text.includes(first==='informed'?'経路図':'空の油瓶'));
    assert.ok(text.includes({informed:'承認した避難路',contract:'戸口まで',compromise:'理由を書き添えた'}[room]));
    choose(g,q,'read');choose(g,q,'privacy');const full=room==='contract';
    assert.equal(g.dispatch({type:'choose',id:full?'respect':'redact'}),false);choose(g,q,full?'redact':'respect');checkpoint(g);
    choose(g,q,'bring');text=g.state.log.join('\n');assert.ok(text.includes(lamp==='informed'?'油の受渡し帳':'未完の欄'));
    assert.equal(g.state.quests.q098.outcome,room);choose(g,q,'sign');choose(g,q,'share');choose(g,q,'entrust');checkpoint(g);assert.equal(g.state.ending.title,endingTitles.informed);
  }
});
