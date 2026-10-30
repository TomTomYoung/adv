import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/pilgrimage-helpers.mjs';

export const previousQ131=await read('tests/fixtures/e2-q131-before-cast.json');
export const previousQ131Data={...data,quests:{...data.quests,q131:previousQ131},scripts:{...data.scripts,...previousQ131.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>!id.startsWith('q131_')))};
export const acceptedQ131=data.previousQuestRoutes.q131;
export const acceptedQ131Data={...previousQ131Data,quests:{...previousQ131Data.quests,q131:acceptedQ131},scripts:{...previousQ131Data.scripts,...acceptedQ131.scripts}};
export const q131Routes=[
 {path:['test','person','finish'],outcome:'person'},
 {path:['test','sample','finish'],outcome:'sample'},
 {path:['test','both','continue','all'],outcome:'all'},
 {path:['test','both','continue','school'],outcome:'school'}
];
export const q131AcceptedRoutes=[
 {path:['test','person'],outcome:'person'},
 {path:['test','sample'],outcome:'sample'},
 {path:['test','both','all'],outcome:'all'},
 {path:['test','both','school'],outcome:'school'}
];
export const q131Cast=scene=>(['room','room_both_ready','credit','person_home'].includes(scene)?['teacher','sher','porter']:['sher','porter']).map(id=>'q131_'+id);
export function q131Engine({legacy=false,rope=1}={}){
 const base=ready(),g=legacy?new GameEngine(previousQ131Data):base;
 if(legacy)g.load(base.save());g.random=()=>.999999;g.state.inventory.rope=rope;start(g,'q131');return g;
}
export function q131AcceptedEngine({accepted=true,entered=true,started=true,rope=1}={}){
 const g=new GameEngine(acceptedQ131Data);g.load(ready().save());g.random=()=>.999999;g.state.inventory.rope=rope;
 go(g,{kind:'town',location:'pilgrim_board'});if(accepted)assert.ok(g.accept('q131'));
 if(entered){const p=acceptedQ131.locations.find(p=>p.role==='decision');go(g,{kind:'dungeon',dungeon:p.dungeon,map:p.map,x:p.x,y:p.y});}
 if(started)g.run(acceptedQ131.model.entryScript??'q131.visit');return g;
}
export function q131AcceptedChoose(g,id){assert.ok(g.dispatch({type:'choose',id}));drain(g);}

export async function sandArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});
 for(const role of ['sher','teacher','porter'])assert.equal(first.characters['q131_'+role],undefined);
 assert.deepEqual(first.quests.q131,await read('data/quests/q131.json'));
 const fixtures=[],outcomes=new Set(),choices={entry:'test',lost:'test',room:'both',room_both_ready:'continue',credit:'all',person_home:'finish',sample_home:'finish'};
 const faceRegions={q131_sher:[.49,.095,.55,.13],q131_teacher:[.49,.085,.55,.12],q131_porter:[.50,.075,.56,.115]};
 for(const legacy of [false,true]){
  const seen=new Set();
  const capture=(g,noRope=false)=>{
   const scene=g.state.stories.q131.scene,key=scene+(noRope?'-no-rope':'');if(seen.has(key))return;seen.add(key);
   const raw=g.save(),current=new GameEngine(data);current.load(raw);assert.equal(current.save(),raw);checkpoint(current);
   const s=current.state.stories.q131,place=data.quests.q131.story.scenes[scene].place,cast=q131Cast(scene);
   assert.equal(s.values.sherAt,place);assert.equal(s.values.porterAt,place);
   assert.equal(s.values.teacherAt,cast.includes('q131_teacher')?place:'room');
   assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q131',scene,variant:(legacy?'legacy':'current')+(noRope?'-no-rope':''),cast,save:raw,
    faces:Object.fromEntries(cast.map(id=>[id,faceRegions[id]])),clearOfHud:true,expectedText:previousQ131.model.graph.find(n=>n.id===scene).text,
    availableChoice:noRope?'person':choices[scene],...(noRope?{blockedChoice:'both'}:{})});
  };
  for(const route of q131Routes){
   const g=q131Engine({legacy});capture(g);choose(g,'q131','tracks');capture(g);choose(g,'q131','test');capture(g);
   for(const action of route.path){choose(g,'q131',action);if(g.state.quests.q131.stage!=='completed')capture(g);}
   assert.equal(g.state.quests.q131.outcome,route.outcome);outcomes.add('e2/q131/'+route.outcome);
  }
  const g=q131Engine({legacy,rope:0});choose(g,'q131','test');capture(g,true);
  assert.deepEqual([...seen].sort(),['entry','lost','room','room-no-rope','room_both_ready','credit','person_home','sample_home'].sort());
 }
 // Routes accepted before physical relocation keep their old scripts and have no typed story scene.
 const seen=new Set();
 for(const route of q131AcceptedRoutes){
  const g=q131AcceptedEngine();drain(g);
  const capture=()=>{
   const scene=g.state.flags.quest.q131.node;if(seen.has(scene))return;seen.add(scene);
   const current=new GameEngine(data);current.load(g.save());checkpoint(current);
   assert.equal(current.state.flags.legacyStoryRoutes.q131,true);assert.equal(current.state.stories.q131,undefined);
   assert.equal(projectGame(current).dialog.scene,undefined);
   fixtures.push({edition:'e2',quest:'q131',scene,variant:'accepted-legacy',cast:[],absentStoryScene:true,save:current.save(),availableChoice:choices[scene],expectedText:acceptedQ131.model.graph.find(n=>n.id===scene).text});
  };
  capture();q131AcceptedChoose(g,'tracks');capture();q131AcceptedChoose(g,'test');capture();
  for(const action of route.path){q131AcceptedChoose(g,action);if(g.state.quests.q131.stage!=='completed')capture();}
  assert.equal(g.state.quests.q131.outcome,route.outcome);outcomes.add('e2/q131/'+route.outcome);
 }
 assert.deepEqual([...seen].sort(),['entry','lost','room','credit'].sort());
 return {fixtures,outcomes:[...outcomes]};
}
