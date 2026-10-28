// Reach every q291 cast through its existing choices and actual journeys.
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {projectGame} from '../src/application/projection.js';
import {border,start,go,drain,checkpoint,data,read} from '../tests/oddland-helpers.mjs';

export async function oddlandArtFixtures(){
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
