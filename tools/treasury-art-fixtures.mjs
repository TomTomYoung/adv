import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {fight} from '../tests/helpers.mjs';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/pilgrimage-helpers.mjs';

export const previousQ132=await read('tests/fixtures/e2-q132-before-cast.json');
export const previousQ132Data={...data,quests:{...data.quests,q132:previousQ132},scripts:{...data.scripts,...previousQ132.scripts},characters:Object.fromEntries(Object.entries(data.characters).filter(([id])=>id!=='q132_manager'))};
export const acceptedQ132=data.previousQuestRoutes.q132;
export const acceptedQ132Data={...previousQ132Data,quests:{...previousQ132Data.quests,q132:acceptedQ132},scripts:{...previousQ132Data.scripts,...acceptedQ132.scripts}};
export const q132Routes=[
 {path:['destroy'],outcome:'destroy'},
 {path:['room','destroy','destroy'],outcome:'destroy'},
 {path:['room','decoy','destroy','destroy'],outcome:'destroy'},
 {path:['room','decoy','seal'],outcome:'isolate'}
];
export const q132AcceptedRoutes=[
 {path:['destroy'],outcome:'destroy'},
 {path:['room','destroy'],outcome:'destroy'},
 {path:['room','decoy','destroy'],outcome:'destroy'},
 {path:['room','decoy','seal'],outcome:'isolate'}
];
export const q132Cast=scene=>['test','isolate'].includes(scene)?['q132_manager']:[];
export const q132ManagerAt=s=>s.journey?.quest==='q132'&&s.journey.action==='test_decoy'?'transit':s.stories.q132.events.includes('test_decoy')?'seal':'station';
export function upgradedQ132Save(raw){const save=JSON.parse(raw),s=save.state.stories.q132;s.revision=2;s.values.managerAt=q132ManagerAt(save.state);return save;}
export function q132Engine({legacy=false,rope=1}={}){
 const base=ready(),g=legacy?new GameEngine(previousQ132Data):base;
 if(legacy)g.load(base.save());g.random=()=>.999999;g.state.inventory.rope=rope;start(g,'q132');return g;
}
export function q132AcceptedEngine({accepted=true,entered=true,started=true,rope=1}={}){
 const g=new GameEngine(acceptedQ132Data);g.load(ready().save());g.random=()=>.999999;g.state.inventory.rope=rope;
 go(g,{kind:'town',location:'pilgrim_board'});if(accepted)assert.ok(g.accept('q132'));
 if(entered){const p=acceptedQ132.locations.find(p=>p.role==='decision');go(g,{kind:'dungeon',dungeon:p.dungeon,map:p.map,x:p.x,y:p.y});}
 if(started)g.run(acceptedQ132.model.entryScript??'q132.visit');return g;
}
export function q132AcceptedChoose(g,id,{combat=true}={}){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(combat&&g.state.battle){g.healAll();fight(g);}}

export async function treasuryArtFixtures(){
 const first=await loadContent(read,{edition:'e1'});assert.equal(first.characters.q132_manager,undefined);assert.deepEqual(first.quests.q132,await read('data/quests/q132.json'));
 const fixtures=[],outcomes=new Set(),choices={entry:'room',test:'decoy',isolate:'seal',fight:'destroy'};
 for(const legacy of [false,true]){
  const seen=new Set();
  const capture=(g,noRope=false)=>{
   const s=g.state.stories.q132,scene=s.scene,suffix=noRope?'-no-rope':scene==='fight'&&s.events.includes('test_decoy')?'-after-decoy':'',key=scene+suffix;if(seen.has(key))return;seen.add(key);
   const raw=g.save(),current=new GameEngine(data);current.load(raw);
   if(legacy)assert.deepEqual(JSON.parse(current.save()),upgradedQ132Save(raw));else assert.equal(current.save(),raw);
   checkpoint(current);assert.equal(current.state.stories.q132.values.managerAt,q132ManagerAt(current.state));
   const cast=q132Cast(scene);assert.deepEqual(projectGame(current).dialog.scene.cast.map(c=>c.id),cast);
   fixtures.push({edition:'e2',quest:'q132',scene,variant:(legacy?'migrated':'current')+suffix,cast,save:current.save(),
    faces:cast.length?{q132_manager:[.47,.065,.54,.105]}:{},clearOfHud:true,expectedText:previousQ132.model.graph.find(n=>n.id===scene).text,
    availableChoice:noRope?'destroy':choices[scene],...(noRope?{blockedChoice:'seal'}:{})});
  };
  for(const route of q132Routes){const g=q132Engine({legacy});capture(g);for(const action of route.path){choose(g,'q132',action);if(g.state.quests.q132.stage!=='completed')capture(g);}assert.equal(g.state.quests.q132.outcome,route.outcome);outcomes.add('e2/q132/'+route.outcome);}
  const g=q132Engine({legacy,rope:0});choose(g,'q132','room');choose(g,'q132','decoy');capture(g,true);
  assert.deepEqual([...seen].sort(),['entry','test','isolate','isolate-no-rope','fight','fight-after-decoy'].sort());
 }
 const seen=new Set();
 const capture=(g,noRope=false)=>{
  const scene=g.state.flags.quest.q132.node,key=scene+(noRope?'-no-rope':'');if(seen.has(key))return;seen.add(key);
  const current=new GameEngine(data);current.load(g.save());checkpoint(current);assert.equal(current.state.flags.legacyStoryRoutes.q132,true);assert.equal(current.state.stories.q132,undefined);assert.equal(projectGame(current).dialog.scene,undefined);
  fixtures.push({edition:'e2',quest:'q132',scene,variant:'accepted-legacy'+(noRope?'-no-rope':''),cast:[],absentStoryScene:true,save:current.save(),availableChoice:noRope?'destroy':choices[scene],...(noRope?{blockedChoice:'seal'}:{}),expectedText:acceptedQ132.model.graph.find(n=>n.id===scene).text});
 };
 for(const route of q132AcceptedRoutes){const g=q132AcceptedEngine();drain(g);capture(g);for(const action of route.path){q132AcceptedChoose(g,action);if(g.state.quests.q132.stage!=='completed')capture(g);}assert.equal(g.state.quests.q132.outcome,route.outcome);outcomes.add('e2/q132/'+route.outcome);}
 const old=q132AcceptedEngine({rope:0});drain(old);q132AcceptedChoose(old,'room');q132AcceptedChoose(old,'decoy');capture(old,true);
 assert.deepEqual([...seen].sort(),['entry','test','isolate','isolate-no-rope'].sort());
 return {fixtures,outcomes:[...outcomes]};
}
