import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createQuestTrial} from '../src/application/quest-playtest.js';
import {loadContent} from '../src/core/loader.js';
import {drain,fight} from './helpers.mjs';

const read=async file=>JSON.parse(await fs.readFile(new URL('../'+file,import.meta.url),'utf8'));
const data=await loadContent(read,{edition:'e2'});
const catalog=await read('playtests/quest-parties.json');
const routes=[
  {path:['wake'],outcome:'contract',round:null,battles:1},
  {path:['carry'],outcome:'compromise',round:null,battles:0},
  {path:['dress','transport'],outcome:'compromise',round:0,battles:0},
  {path:['dress','observe','transport'],outcome:'compromise',round:1,battles:0},
  {path:['dress','observe','observe','transport'],outcome:'compromise',round:2,battles:0},
  {path:['dress','observe','observe','awake'],outcome:'informed',round:2,battles:0}
];
function ready(){
  const t=createQuestTrial(data,catalog,{quest:'q022',party:'balanced',level:3,start:'site',seed:1907});
  t.engine.random=()=>0.999999;
  drain(t.engine);
  return t.engine;
}
function checkpoint(g){
  const saved=g.save();g.load(saved);assert.equal(g.save(),saved);
}
test('q022 baseline source is unchanged before e2 physical replacement',async()=>{
  const raw=await fs.readFile(new URL('../data/quests/q022.json',import.meta.url));
  assert.equal(createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex'),'0752ce4cdb65a65b8ba0468d6b00e794736f379a');
  assert.equal(data.quests.q022.model.entryScript,'q022.flow.visit');
  assert.equal(data.encounters.guard_3.escape,true);
  assert.equal(data.encounters.guard_3.enemies.length,2);
});
for(const route of routes)test('q022 original route '+route.path.join('/')+' reaches '+route.outcome+' exactly once',()=>{
  const g=ready();
  for(const id of route.path){
    assert.ok(g.dispatch({type:'choose',id}),id+': '+g.state.notice);
    drain(g);if(g.state.battle)fight(g);drain(g);
    checkpoint(g);
  }
  assert.equal(g.state.quests.q022.outcome,route.outcome);
  assert.equal(g.state.records.battles,route.battles);
  if(route.round===null)assert.equal(g.state.flags.flow.q022.round,undefined);
  else assert.equal(g.state.flags.flow.q022.round,route.round);
  const saved=g.save(),gold=g.state.gold,xp=g.state.actors.ada.xp;
  assert.throws(()=>g.complete('q022',route.outcome));
  assert.equal(g.save(),saved);
  g.run(data.quests.q022.model.entryScript);drain(g);
  assert.equal(g.state.gold,gold);
  assert.equal(g.state.actors.ada.xp,xp);
});
test('q022 observes a healing wound twice, never a third time and requires both checks before spontaneous waking',()=>{
  const g=ready();
  assert.ok(g.dispatch({type:'choose',id:'dress'}));drain(g);
  assert.equal(g.state.flags.flow.q022.round,0);
  const start=g.save();
  assert.equal(g.dispatch({type:'choose',id:'awake'}),false);
  assert.equal(g.save(),start);
  for(const round of [1,2]){
    assert.ok(g.dispatch({type:'choose',id:'observe'}));drain(g);checkpoint(g);
    assert.equal(g.state.flags.flow.q022.round,round);
    if(round===1)assert.equal(g.dispatch({type:'choose',id:'awake'}),false);
  }
  const end=g.save();
  assert.equal(g.dispatch({type:'choose',id:'observe'}),false);
  assert.equal(g.save(),end);
  assert.ok(g.dispatch({type:'choose',id:'awake'}));
  drain(g);
  assert.equal(g.state.quests.q022.outcome,'informed');
});
