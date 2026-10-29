import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,checkpoint} from '../tests/pilgrimage-helpers.mjs';

export const previousQ033=await read('tests/fixtures/e2-q033-before-cast.json');
export const previousQ033Data={...data,quests:{...data.quests,q033:previousQ033},scripts:{...data.scripts,...previousQ033.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>id!=='q033_pilgrim'))};
export const q033Routes=[
 {path:['reject'],outcome:'contract'},
 {path:['guest','finish'],outcome:'compromise'},
 {path:['cloth','room','finish'],outcome:'compromise'},
 {path:['cloth','wash','return','finish'],outcome:'informed'}
];
export function q033Engine({legacy=false}={}){
 const base=ready(),g=legacy?new GameEngine(previousQ033Data,1933):base;
 if(legacy)g.load(base.save());g.random=()=>.999999;start(g,'q033');return g;
}
export async function pilgrimArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});
 assert.equal(first.characters.q033_pilgrim,undefined);assert.deepEqual(first.quests.q033,await read('data/quests/q033.json'));
 const fixtures=[],outcomes=new Set(),choices={entry:'cloth',powder:'wash',guest:'finish',wash:'return',clean:'finish'};
 for(const legacy of [false,true]){
  const seen=new Set();
  for(const route of q033Routes){
   const g=q033Engine({legacy});
   const capture=()=>{
    const scene=g.state.stories.q033.scene,roomAfterCloth=scene==='guest'&&route.path[0]==='cloth',key=scene+(roomAfterCloth?'-informed':'');
    if(seen.has(key))return;seen.add(key);
    const raw=g.save(),current=new GameEngine(data,1933);current.load(raw);assert.equal(current.save(),raw,'q033 needs no save transformation');checkpoint(current);
    const story=current.state.stories.q033,place=data.quests.q033.story.scenes[scene].place;
    assert.equal(story.values.pilgrimAt,place);assert.equal(story.values.partyAt,place);assert.equal(story.values.cloakAt,'pilgrim');
    assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),['q033_pilgrim']);
    fixtures.push({edition:'e2',quest:'q033',scene,variant:(legacy?'legacy':'current')+(roomAfterCloth?'-informed':''),cast:['q033_pilgrim'],save:raw,
     faces:{q033_pilgrim:[.37,.12,.50,.19]},availableChoice:choices[scene],
     ...(scene==='guest'?{expectedText:legacy?'外套を椅子へ掛け、戸を閉じてから話を聞く。':'戸を閉じると、巡礼者は外套を握ったまま話し始めた。'}:{})});
   };
   capture();for(const action of route.path){choose(g,'q033',action);if(g.state.quests.q033.stage!=='completed')capture();}
   assert.equal(g.state.quests.q033.outcome,route.outcome);outcomes.add(`e2/q033/${route.outcome}`);
  }
  assert.deepEqual([...seen].sort(),['entry','powder','guest','guest-informed','wash','clean'].sort());
 }
 return {fixtures,outcomes:[...outcomes]};
}
