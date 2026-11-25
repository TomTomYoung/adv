import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,town,checkpoint,drain} from './oddland-helpers.mjs';
import {projectGame} from '../src/application/projection.js';
import {nextQuestPlace} from '../src/core/quest-navigation.js';

test('town districts expose all destinations, with all canal sites reachable after loading',()=>{
  const g=fresh(),model=()=>projectGame(g);
  const links=()=>model().town.links.map(link=>link.name);
  assert.deepEqual(links(),['帰り火亭','旅道具店','灯番組合','坂下町','荷揚げ河岸']);
  assert.deepEqual(model().worldTravel.actions,[]);
  assert.ok(g.dispatch({type:'location.move',id:'e2_wharf'}));checkpoint(g);
  assert.deepEqual(links(),['倉庫通り','運河通り','水道待避場','廃坑搬出口']);
  assert.deepEqual(model().worldTravel.actions.map(a=>a.label),['地下水道へ下りる','水門救助口へ']);
  town(g,'e2_canal_quarter');
  const sites=new Set();
  for(const group of model().town.links){
    town(g,group.id);
    for(const stop of model().town.links){
      town(g,stop.id);checkpoint(g);
      assert.equal(model().town.parent.id,group.id);sites.add(stop.id);
      town(g,group.id);
    }
    town(g,'e2_canal_quarter');
  }
  assert.equal(sites.size,35);
  for(const stop of ['yard','forge','bench','counter'])assert.ok(sites.has('e2_q109_'+stop));
  for(const stop of ['stall','feeder','warehouse'])assert.ok(sites.has('e2_q108_'+stop));
  for(const stop of ['desk','dining','door','room'])assert.ok(sites.has('e2_q107_'+stop));
  for(const stop of ['bakery','alley','door','table'])assert.ok(sites.has('e2_q106_'+stop));
  town(g,'hikarigaeri_medical_specimens');
  assert.equal(model().town.name,'標本室');
  assert.equal(model().town.headingPath,'灯帰り › 坂下町 › 医学校');
});

test('only the tracked local quest has a shortcut from the square and walking it preserves the save',()=>{
  const g=fresh();
  town(g,'hikarigaeri_guild');assert.ok(g.accept('q101'));drain(g);
  town(g,'hikarigaeri_square');const before=g.state.townLocation,destination=nextQuestPlace(g.data,g.state,'q101');
  assert.equal(g.dispatch({type:'quest.town',id:'q102'}),false);
  assert.equal(g.state.townLocation,before);assert.ok(projectGame(g).tracked.townShortcut);
  assert.ok(g.dispatch({type:'quest.town',id:'q101'}));
  assert.equal(g.state.townLocation,destination.location);checkpoint(g);
  assert.equal(g.state.quests.q101.stage,'active');
  assert.equal(g.dispatch({type:'quest.town',id:'q101'}),false);
});
