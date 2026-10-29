import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,checkpoint} from '../tests/pilgrimage-helpers.mjs';

export const previousQ034=await read('tests/fixtures/e2-q034-before-cast.json');
export const previousQ034Data={...data,quests:{...data.quests,q034:previousQ034},scripts:{...data.scripts,...previousQ034.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q034_')))};
export const q034Routes=[
 {path:['recover'],outcome:'contract'},
 {path:['read','separate'],outcome:'informed'},
 {path:['meeting','arrange'],outcome:'compromise'},
 {path:['read','face','arrange'],outcome:'compromise'},
 {path:['meeting','document','separate'],outcome:'informed'},
 {path:['read','face','document','separate'],outcome:'informed'},
 {path:['meeting','document','face','arrange'],outcome:'compromise'},
 {path:['read','face','document','face','arrange'],outcome:'compromise'}
];
export function q034Engine({legacy=false}={}){
 const base=ready(),g=legacy?new GameEngine(previousQ034Data,1934):base;
 if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q034');return g;
}
export async function receiptArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});
 for(const id of ['q034_merchant','q034_victims'])assert.equal(first.characters[id],undefined);
 assert.deepEqual(first.quests.q034,await read('data/quests/q034.json'));
 const fixtures=[],outcomes=new Set(),choices={entry:'read',reserved:'face',consent:'arrange'};
 for(const legacy of [false,true]){
  const seen=new Set();
  for(const route of q034Routes){
   const g=q034Engine({legacy});
   const capture=()=>{
    const story=g.state.stories.q034,scene=story.scene,truth=story.knowledge.party?.includes('truth')??false,key=`${scene}-${story.values.documentAt}-${truth?'read':'unread'}`;
    if(seen.has(key))return;seen.add(key);
    const raw=g.save(),current=new GameEngine(data,1934);current.load(raw);assert.equal(current.save(),raw);checkpoint(current);
    const place=data.quests.q034.story.scenes[scene].place,cast=scene==='consent'?['q034_merchant','q034_victims']:['q034_merchant'];
    assert.equal(story.values.merchantAt,place);assert.equal(story.values.partyAt,place);assert.equal(story.values.victimsAt,'meeting');assert.equal(story.values.consent,false);
    assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),cast);
    fixtures.push({edition:'e2',quest:'q034',scene,variant:`${legacy?'legacy':'current'}-${story.values.documentAt}-${truth?'read':'unread'}`,cast,save:raw,
     faces:{q034_merchant:[.50,.11,.61,.18]},availableChoice:choices[scene],textOnlyCast:scene==='consent'?['q034_victims']:[],
     expectedText:data.quests.q034.model.graph.find(n=>n.id===scene).text});
   };
   capture();for(const action of route.path){choose(g,'q034',action);if(g.state.quests.q034.stage!=='completed')capture();}
   assert.equal(g.state.quests.q034.outcome,route.outcome);outcomes.add(`e2/q034/${route.outcome}`);
  }
  assert.deepEqual([...seen].sort(),['entry-entry-unread','reserved-entry-read','reserved-party-read','consent-party-unread','consent-party-read'].sort());
 }
 return {fixtures,outcomes:[...outcomes]};
}
