// Reach each adopted Oddland cast through existing choices and actual journeys.
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {projectGame} from '../src/application/projection.js';
import {border,start,go,drain,checkpoint,data,read} from '../tests/oddland-helpers.mjs';

async function q291ArtFixtures(){
  const fixtures=[],outcomes=[],g=border(),q=start(g,291);
  const first=await loadContent(read,{edition:'e1'});
  assert.equal(first.quests.q291,undefined);
  for(const id of ['od_marta','od_teo','od_rad','od_nurse'])assert.equal(first.characters[id],undefined);
  const state=(party,teo,rad,resolution='pending',finished=false)=>{
    const v=g.state.stories.q291.values;
    assert.deepEqual([v.partyAt,v.martaAt,v.teoAt,v.radAt,v.nurseAt,v.resolution,v.finished],
      [party,'yard',teo,rad,'clinic',resolution,finished]);
  };
  const capture=(scene,cast)=>{
    assert.equal(g.state.stories.q291.scene,scene);
    assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),cast);
    checkpoint(g);const save=g.save();fixtures.push({edition:'e2',quest:'q291',scene,cast,save,...(scene==='protected'?{faces:{od_nurse:[.42,.20,.62,.32],od_rad:[.38,.21,.56,.32],od_teo:[.40,.23,.62,.36]}}:{})});return save;
  };
  const choose=id=>{
    const action=q.story.actions[`${g.state.stories.q291.scene}_${id}`];assert.ok(action);
    const before=structuredClone(g.state.stories.q291.values),gold=g.state.gold;
    assert.ok(g.dispatch({type:'choose',id}));drain(g);checkpoint(g);
    if(action.journey){
      assert.ok(g.state.journey);assert.equal(g.state.quests.q291.stage,'active');
      const v=g.state.stories.q291.values;
      assert.equal(v.partyAt,'transit');assert.equal(v.finished,false);
      assert.equal(v.resolution,before.resolution,'resolution takes effect on arrival');
      for(const who of ['marta','teo','rad','nurse'])assert.equal(v[who+'At'],
        action.journey.companions.includes(who)?'transit':before[who+'At']);
      go(g,q.story.worldPlaces[action.journey.to]);
      if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:q.id}));
      drain(g);assert.equal(g.state.journey,null);checkpoint(g);
    }
    assert.equal(g.state.gold,gold+(action.ending?q.outcomes[action.ending].gold:0));
  };
  const complete=outcome=>{
    choose('finish');assert.equal(g.state.quests.q291.outcome,outcome);
    assert.equal(g.state.quests.q291.stage,'completed');assert.equal(g.state.vars.region_12,1);
    checkpoint(g);outcomes.push(`e2/q291/${outcome}`);
  };
  state('yard','yard','refuge');capture('entry',['od_marta']);
  choose('look');assert.ok(g.state.stories.q291.knowledge.party.includes('child'));
  state('yard','yard','refuge');const found=capture('found',['od_marta','od_teo']);
  choose('escort');state('refuge','refuge','refuge','escort');capture('reunion',['od_rad','od_teo']);
  complete('escort');state('refuge','refuge','refuge','escort',true);
  g.load(found);choose('protect');state('clinic','clinic','refuge','protect');capture('shelter',['od_nurse','od_teo']);
  choose('fetch');state('refuge','clinic','refuge','protect');capture('father',['od_rad']);
  choose('guide');state('clinic','clinic','clinic','protect');capture('protected',['od_nurse','od_rad','od_teo']);
  complete('protect');state('clinic','clinic','clinic','protect',true);
  return {fixtures,outcomes};
}


async function q292ArtFixtures(){
  const fixtures=[],outcomes=[],g=border(),q=start(g,292);
  const first=await loadContent(read,{edition:'e1'});
  assert.equal(first.quests.q292,undefined);
  for(const id of ['od_hena','od_oren'])assert.equal(first.characters[id],undefined);
  assert.deepEqual(Object.values(q.outcomes).map(o=>[o.gold,o.xp,o.gems]),[[34,14,0],[26,12,0]]);
  const state=(party,hena,pot,resolution='pending',finished=false)=>{
    const v=g.state.stories.q292.values;
    assert.deepEqual([v.partyAt,v.henaAt,v.orenAt,v.potAt,v.resolution,v.finished],
      [party,hena,'kitchen',pot,resolution,finished]);
  };
  const capture=(scene,cast)=>{
    assert.equal(g.state.stories.q292.scene,scene);
    assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),cast);
    checkpoint(g);const save=g.save();fixtures.push({edition:'e2',quest:'q292',scene,cast,save,
      ...(scene==='meal'?{faces:{od_hena:[.37,.17,.58,.27],od_oren:[.45,.16,.66,.27]}}:{})});return save;
  };
  const choose=id=>{
    const action=q.story.actions[`${g.state.stories.q292.scene}_${id}`];assert.ok(action);
    const before=structuredClone(g.state.stories.q292.values),gold=g.state.gold;
    assert.ok(g.dispatch({type:'choose',id}));drain(g);checkpoint(g);
    if(action.journey){
      assert.ok(g.state.journey);assert.equal(g.state.quests.q292.stage,'active');
      const v=g.state.stories.q292.values;
      assert.equal(v.partyAt,'transit');assert.equal(v.finished,false);
      assert.equal(v.potAt,before.potAt,'walking does not transfer the pot');
      assert.equal(v.resolution,before.resolution);
      for(const who of ['hena','oren'])assert.equal(v[who+'At'],action.journey.companions.includes(who)?'transit':before[who+'At']);
      if(id==='deliver')assert.ok(!(g.state.stories.q292.knowledge.party??[]).includes('shifts'));
      go(g,q.story.worldPlaces[action.journey.to]);
      if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:q.id}));
      drain(g);assert.equal(g.state.journey,null);checkpoint(g);
    }
    assert.equal(g.state.gold,gold+(action.ending?q.outcomes[action.ending].gold:0));
  };
  const complete=outcome=>{
    choose('finish');assert.equal(g.state.quests.q292.outcome,outcome);
    assert.equal(g.state.quests.q292.stage,'completed');assert.equal(g.state.vars.region_12,1);
    checkpoint(g);outcomes.push(`e2/q292/${outcome}`);
  };
  state('canteen','canteen','hena');capture('entry',['od_hena']);
  choose('take');state('canteen','canteen','party');capture('carrying',['od_hena']);
  choose('deliver');state('kitchen','canteen','party');assert.ok(g.state.stories.q292.knowledge.party.includes('shifts'));
  const survey=capture('survey',['od_oren']);
  choose('box');state('kitchen','canteen','oren','delivery');capture('pack',['od_oren']);
  choose('take');state('kitchen','canteen','party','delivery');capture('packed',['od_oren']);
  choose('return');state('canteen','canteen','party','delivery');capture('warm',['od_hena']);
  complete('delivery');state('canteen','canteen','hena','delivery',true);
  g.load(survey);choose('rest');state('kitchen','canteen','oren','together');capture('ask',['od_oren']);
  choose('return');state('canteen','canteen','oren','together');capture('invite',['od_hena']);
  choose('walk');state('kitchen','kitchen','oren','together');capture('meal',['od_hena','od_oren']);
  complete('together');state('kitchen','kitchen','oren','together',true);
  return {fixtures,outcomes};
}

async function q293ArtFixtures(){
  const fixtures=[],outcomes=[],g=border(),q=start(g,293);
  const first=await loadContent(read,{edition:'e1'});
  assert.equal(first.quests.q293,undefined);assert.equal(first.characters.od_nel,undefined);
  assert.deepEqual(Object.values(q.outcomes).map(o=>[o.gold,o.xp,o.gems]),[[32,14,0],[24,12,0]]);
  const state=(party,boots,resolution='pending',finished=false)=>{
    const v=g.state.stories.q293.values;
    assert.deepEqual([v.partyAt,v.nelAt,v.bootsAt,v.resolution,v.finished],[party,'cobbler',boots,resolution,finished]);
  };
  const capture=(scene,cast)=>{
    assert.equal(g.state.stories.q293.scene,scene);
    assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),cast);
    checkpoint(g);const save=g.save();fixtures.push({edition:'e2',quest:'q293',scene,cast,save});return save;
  };
  const choose=id=>{
    const action=q.story.actions[`${g.state.stories.q293.scene}_${id}`];assert.ok(action);
    const before=structuredClone(g.state.stories.q293.values),gold=g.state.gold;
    assert.ok(g.dispatch({type:'choose',id}));drain(g);checkpoint(g);
    if(action.journey){
      assert.ok(g.state.journey);assert.equal(g.state.quests.q293.stage,'active');
      const v=g.state.stories.q293.values;
      assert.equal(v.partyAt,'transit');assert.equal(v.finished,false);
      assert.equal(v.nelAt,'cobbler','the cobbler stays at the workshop');
      assert.deepEqual(action.journey.companions,[]);
      assert.equal(v.bootsAt,before.bootsAt,'walking does not return the boots');
      assert.equal(v.resolution,before.resolution,'resolution takes effect on arrival');
      if(id==='go')assert.ok(!(g.state.stories.q293.knowledge.party??[]).includes('salt'));
      go(g,q.story.worldPlaces[action.journey.to]);
      if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:q.id}));
      drain(g);assert.equal(g.state.journey,null);checkpoint(g);
    }
    assert.equal(g.state.gold,gold+(action.ending?q.outcomes[action.ending].gold:0));
  };
  const complete=outcome=>{
    choose('finish');assert.equal(g.state.quests.q293.outcome,outcome);
    assert.equal(g.state.quests.q293.stage,'completed');assert.equal(g.state.vars.region_12,1);
    checkpoint(g);outcomes.push(`e2/q293/${outcome}`);
  };
  state('cobbler','nel');capture('entry',['od_nel']);
  choose('take');state('cobbler','party');capture('depart',['od_nel']);
  choose('go');state('salt','party');assert.ok(g.state.stories.q293.knowledge.party.includes('salt'));
  const floor=capture('floor',[]);
  choose('sole');state('cobbler','party','sole');capture('newsole',['od_nel']);
  complete('sole');state('cobbler','nel','sole',true);
  g.load(floor);choose('wash');state('wash','party','wash');capture('washing',[]);
  choose('return');state('cobbler','party','wash');capture('washed',['od_nel']);
  complete('wash');state('cobbler','nel','wash',true);
  return {fixtures,outcomes};
}

export async function oddlandArtFixtures(){
  const groups=[await q291ArtFixtures(),await q292ArtFixtures(),await q293ArtFixtures()];
  return {fixtures:groups.flatMap(g=>g.fixtures),outcomes:groups.flatMap(g=>g.outcomes)};
}
