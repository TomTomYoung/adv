import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {createQuestTrial} from './src/application/quest-playtest.js';
import {data,catalog} from './tests/q018-helpers.mjs';
import {drain,fight} from './tests/helpers.mjs';
import {validateSave} from './src/core/save.js';
const q=data.quests.q019,paths=[];
function visit(node,choices){for(const o of q.model.graph.find(r=>r.id===node).options){const path=[...choices,o.id];if(o.to.startsWith('@'))paths.push([path,o.to.slice(1)]);else visit(o.to,path);}}
visit('entry',[]);
const raw=await readFile('data/quests/q019.json'),hash=createHash('sha1').update('blob '+raw.length+'\0').update(raw).digest('hex');
let plays=0,saves=0,legacy=0;const unique=new Set();
const make=(party,start)=>createQuestTrial(data,catalog,{quest:'q019',party,level:1,start,seed:1907}).engine;
function reopen(g){const s=g.save();assert.deepEqual(validateSave(JSON.parse(s),data),[]);g.load(s);assert.equal(g.save(),s);}
for(const [path,end] of paths)for(const party of ['balanced','sustain','explore']){
  const g=make(party,'site');let i=0;
  for(let n=0;n<60;n++){
    reopen(g);saves++;if(party==='balanced')unique.add(g.save());
    if(!g.state.waiting&&g.state.quests.q019.stage==='completed')break;
    const intent=g.state.waiting.type==='text'?{type:'advance'}:{type:'choose',id:path[i++]};assert.ok(g.dispatch(intent));
  }
  assert.equal(g.state.quests.q019.outcome,end);assert.equal(g.state.steps,0);plays++;
}
for(const [entry,cases] of [['flow.visit',paths],...['decision','review'].map(e=>[e,['informed','contract','compromise'].map(end=>[[end],end])])]){
  for(const [path,end] of cases){const g=make('balanced','reception');g.random=()=>.999999;
    if(entry!=='flow.visit'&&end==='informed')for(const k of ['clue_a','clue_b'])g.evidence('q019',k,k);
    g.run('q019.'+entry);drain(g);reopen(g);
    for(const id of path){assert.ok(g.dispatch({type:'choose',id}));drain(g);reopen(g);if(g.state.battle){fight(g);drain(g);reopen(g);}}
    assert.equal(g.state.quests.q019.outcome,end);assert.equal(g.state.records.battles,Number(entry!=='flow.visit'&&end==='contract'));legacy++;
  }
}
console.log('Q019',JSON.stringify({hash,plays,saves,unique:unique.size,legacy,routes:paths.length,unconnected:Object.values(data.quests).filter(q=>!q.story?.worldPlaces).length}));
