import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {projectGame} from '../src/application/projection.js';
import {objectVisible} from '../src/core/quest-events.js';
import {drain,fight} from './helpers.mjs';
import {data,original,routes,ready,states,checkpoint,migrated,choose,depart,arrive,resume,go,assertValues} from './market-world-helpers.mjs';

const blobs={q052:'3f5b2eb784ee922f18da9859476fa2889170a97a',q053:'51fdd7e053b73898ccd1f87a45c5e24e22148389',q054:'50887245ad68d8f4e989098105bfa8dae1ca92e6',q055:'cb16b5d616ab1d3cad3a36859af149cdffd17fa4'};
for(const [quest,paths] of Object.entries(routes)){
  const story=data.quests[quest].story;
  for(const route of paths)test(quest+' initial and migrated save, custody, reward once: '+route.old.join('/'),()=>{
    const g=ready(quest),old=ready(quest,{old:true});
    for(const id of route.path){choose(g,quest,id);checkpoint(g);}
    for(const id of route.old){
      const restored=migrated(old);
      choose(restored,quest,id);choose(old,quest,id);checkpoint(restored);
      assert.deepEqual(restored.state.flags.flow[quest],old.state.flags.flow[quest]);
      assert.deepEqual(restored.state.quests[quest],old.state.quests[quest]);
      assert.equal(restored.state.gold,old.state.gold);
    }
    assertValues(g,quest,route);assert.equal(g.state.quests[quest].outcome,route.outcome);
    assert.equal(old.state.quests[quest].outcome,route.outcome);
    assert.equal(g.state.gold,old.state.gold);assert.equal(g.state.actors.ada.xp,old.state.actors.ada.xp);
    const save=g.save();assert.throws(()=>g.complete(quest,route.outcome));assert.equal(g.save(),save);
  });
  test(quest+' all scene and journey checkpoints survive return and rescue',()=>{
    const {current}=states(quest),seen=new Set(),trips=new Set(),actions=new Set(),g=ready(quest);
    for(const row of current){
      g.load(row.save);
      const before=structuredClone(g.state.stories[quest]),place=story.scenes[row.scene].place;
      const expected=Object.entries(story.entities).filter(([id,e])=>e.character&&before.values[id+'At']===place).map(([,e])=>e.character);
      const dialog=projectGame(g).dialog;assert.deepEqual(dialog.scene?.cast.map(c=>c.id)??[],expected,row.scene);
      seen.add(row.scene);
      for(const option of dialog.options.filter(o=>o.enabled)){
        const key=row.scene+'_'+option.id,action=story.actions[key];actions.add(key);
        if(!action.journey||trips.has(key))continue;
        trips.add(key);
        for(const kind of ['retreat','defeat']){
          g.load(row.save);depart(g,option.id);
          const pending=structuredClone(g.state.journey),work=structuredClone(g.state.stories[quest]);
          assert.ok(pending,key);assert.equal(g.dispatch({type:'story.resume',quest}),false);
          if(kind==='retreat')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();
          drain(g);checkpoint(g);assert.deepEqual(g.state.journey,pending);assert.deepEqual(g.state.stories[quest],work);
          arrive(g,quest);checkpoint(g);assert.equal(g.state.stories[quest].scene,action.to);
        }
      }
      g.load(row.save);g.defeat();drain(g);checkpoint(g);go(g,quest,place);resume(g,quest);
      assert.deepEqual(g.state.stories[quest],before);
    }
    assert.deepEqual(seen,new Set(Object.keys(story.scenes)));
    assert.deepEqual(actions,new Set(Object.keys(story.actions)));
    assert.equal(trips.size,Object.values(story.actions).filter(a=>a.journey).length);
  });
  test(quest+' original file, scripts, exclusive floor points and legacy visibility',()=>{
    const raw=fs.readFileSync(new URL('../data/quests/'+quest+'.json',import.meta.url));
    assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),blobs[quest]);
    for(const [key,script] of Object.entries(original.quests[quest].scripts))assert.deepEqual(data.scripts[key],script,key);
    const g=ready(quest),old=ready(quest,{old:true}),legacy=migrated(old);
    for(const p of Object.values(story.worldPlaces)){
      const map=data.maps[p.map],oldMap=original.maps[p.map];
      const here=m=>m.objects.filter(o=>o.x===p.x&&o.y===p.y);
      const visible=(engine,m)=>here(m).filter(o=>objectVisible(engine.state,m,o)).map(o=>o.id);
      assert.equal(map.tiles[p.y][p.x],'.');assert.ok(here(map).every(o=>o.quest===quest),p.event);
      assert.deepEqual(visible(g,map),[p.event]);assert.deepEqual(visible(legacy,map),visible(old,oldMap));
    }
  });
  for(const entry of ['decision','review'])for(const ending of ['informed','contract','compromise']){
    test(quest+' legacy '+entry+'/'+ending+' preserves evidence, payment and battle save',()=>{
      const old=ready(quest,{old:true,start:'reception'});
      if(ending==='informed')for(const key of ['clue_a','clue_b'])old.evidence(quest,key,key);
      old.run(quest+'.'+entry);drain(old);const restored=migrated(old);
      for(const engine of [old,restored]){
        if(ending!=='informed')assert.equal(engine.dispatch({type:'choose',id:'informed'}),false);
        const ropes=engine.state.inventory.rope??0;
        depart(engine,ending);
        if(ending==='contract'||quest==='q052'&&ending==='informed'){
          assert.equal(engine.state.battle.encounter,'guard_6');checkpoint(engine);fight(engine);drain(engine);
        }
        assert.equal(engine.state.inventory.rope??0,ropes-Number(quest==='q052'&&ending==='informed'));
        assert.equal(engine.state.quests[quest].outcome,ending);checkpoint(engine);
      }
      assert.equal(old.state.gold,restored.state.gold);assert.equal(old.state.actors.ada.xp,restored.state.actors.ada.xp);
    });
  }
}
test('q052 retrying a second observation or unpaid bid cannot act twice',()=>{
  const q='q052',g=ready(q);
  for(const id of ['observe','record','again'])choose(g,q,id);
  const before=checkpoint(g);assert.equal(g.dispatch({type:'choose',id:'again'}),false);assert.equal(g.save(),before);
  for(const id of ['limit','test','off','unhook'])choose(g,q,id);
  assert.deepEqual([g.state.stories[q].values.mode,g.state.stories[q].values.notice],['stopped','none']);
});
test('q054 provisional possession is returned before sealing and reporting',()=>{
  const q='q054',g=ready(q),v=()=>g.state.stories[q].values;
  for(const id of ['customer','lead','listen','receipt','bring','inspect'])choose(g,q,id);
  assert.equal(v().ownAt,'client');assert.equal(v().signed,false);
  choose(g,q,'hold');assert.equal(v().ownAt,'party');choose(g,q,'carry');
  assert.equal(v().sealed,false);choose(g,q,'replace');assert.equal(v().ownAt,'shelf');
  choose(g,q,'close');assert.equal(v().ownAt,'vault');assert.equal(v().called,false);
});
test('q055 signatures, payment and removal are sequential and refund cannot repeat',()=>{
  const q='q055',g=ready(q),v=()=>g.state.stories[q].values;
  for(const id of ['shop','read','buy'])choose(g,q,id);
  const unsigned=g.save(),gold=g.state.gold;
  choose(g,q,'sign');assert.equal(v().shopSigned,false);assert.equal(v().title,'shop');
  choose(g,q,'accept');assert.equal(v().payment,'held');choose(g,q,'apply');
  assert.equal(v().mark,'tracking');assert.equal(v().title,'customer');assert.equal(g.state.gold,gold);
  g.load(unsigned);for(const id of ['cancel','fold','bring','hand'])choose(g,q,id);
  assert.equal(v().payment,'held');assert.equal(v().coatAt,'miku');choose(g,q,'repay');
  const save=checkpoint(g);assert.equal(g.dispatch({type:'choose',id:'repay'}),false);assert.equal(g.save(),save);
});
