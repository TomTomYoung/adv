import test from 'node:test';
import assert from 'node:assert/strict';
import {commandsAt} from '../src/core/script.js';
import {storyCanAct} from '../src/core/story.js';
import {resolveBattle} from '../tools/audit-regional-relocation.mjs';
import {data,ready,start,choose,go,checkpoint,drain} from './royal-helpers.mjs';
const values=(g,id)=>g.state.stories[id].values;
function resolve(g,id,result){
 delete g.random;resolveBattle(g,result);checkpoint(g);g.random=()=>.999999;
 if(result==='lose'){assert.equal(g.state.townLocation,'oddland_village');const q=data.quests[id];go(g,q.story.worldPlaces[q.story.scenes[g.state.stories[id].scene].place]);assert.ok(g.dispatch({type:'story.resume',quest:id}));drain(g);checkpoint(g);}
}
const numbers=[...Array.from({length:10},(_,i)=>81+i),...Array.from({length:10},(_,i)=>181+i)];
const reports={};
function audit(id){
 const g=ready(),queue=[],seen=new Set(),ends={},optionsSeen=new Set();if(id==='q090')g.state.vars.region_9=3;
 start(g,id);queue.push({state:structuredClone(g.state),path:[]});
 for(let i=0;i<queue.length;i++){
  const e=queue[i];g.state=structuredClone(e.state);g.random=()=>.999999;checkpoint(g);
  const key=JSON.stringify({story:{...g.state.stories[id],events:[...g.state.stories[id].events].sort()},result:g.state.flags.relocatedBattleResult?.[id],outcome:g.state.quests[id].outcome,members:g.state.members});
  if(seen.has(key))continue;seen.add(key);assert.ok(seen.size<4000,id+' finite');
  if(g.state.quests[id].stage==='completed'){
   ends[g.state.quests[id].outcome]??=e.path;const earned=JSON.stringify({gold:g.state.gold,actors:g.state.actors,vars:g.state.vars});assert.equal(g.accept(id),false);assert.throws(()=>g.complete(id,g.state.quests[id].outcome));g.run(data.quests[id].model.entryScript);drain(g);assert.equal(JSON.stringify({gold:g.state.gold,actors:g.state.actors,vars:g.state.vars}),earned);continue;
  }
  assert.equal(g.state.waiting?.type,'choice',id+'/'+e.path.join(','));
  const options=commandsAt(data,g.state.vm.at(-1))[g.state.waiting.index].options,usable=o=>(!o.condition||g.value(o.condition))&&storyCanAct(g,id,o.storyAction.action),enabled=options.filter(usable);
  g.state.gold=0;for(const k of Object.keys(g.state.inventory))g.state.inventory[k]=0;assert.ok(options.some(usable),id+' free continuation');
  for(const o of enabled){
   optionsSeen.add(o.storyAction.action);g.state=structuredClone(e.state);choose(g,id,o.id,{combat:'pending'});
   if(g.state.battle){const before=structuredClone(g.state);for(const result of ['win',...(data.encounters[g.state.battle.encounter].escape?['escape']:[]),'lose']){g.state=structuredClone(before);resolve(g,id,result);queue.push({state:structuredClone(g.state),path:[...e.path,o.id,'['+result+']']});}}
   else queue.push({state:structuredClone(g.state),path:[...e.path,o.id]});
  }
 }
 assert.deepEqual(Object.keys(ends).sort(),Object.keys(data.quests[id].outcomes).sort());
 assert.deepEqual([...optionsSeen].sort(),Object.keys(data.quests[id].story.actions).sort(),id+' every authored choice');
 return {ends,states:seen.size};
}
for(const n of numbers){const id='q'+String(n).padStart(3,'0');test(`${id}: every physical choice, battle result, ending and save`,()=>{reports[id]=audit(id);});}
test('all twenty requests can finish in one village campaign',()=>{
 const g=ready();for(const n of numbers){const id='q'+String(n).padStart(3,'0'),report=reports[id]??audit(id),path=Object.values(report.ends).find(p=>!p.some(c=>c.startsWith('[')));start(g,id);for(const c of path)choose(g,id,c);assert.equal(g.state.quests[id].stage,'completed');}checkpoint(g);
});
const depart=(g,id,c)=>{assert.ok(g.dispatch({type:'choose',id:c}));drain(g);assert.ok(g.state.journey);checkpoint(g);};
const arrive=(g,id,place)=>{go(g,data.quests[id].story.worldPlaces[place]);drain(g);checkpoint(g);};
test('q084 borrows a chart only after actual q061 handover and distinguishes a device from rescued people',()=>{
 for(const earned of [false,true]){
  const g=ready();if(earned){start(g,'q061');for(const c of ['trial','next','rescue','finish'])choose(g,'q061',c);}
  start(g,'q084');for(const c of ['source','trail','follow'])choose(g,'q084',c);
  assert.equal(values(g,'q084').chartCopyAt,earned?'party':'rescue');assert.equal(g.state.dungeons.active.systems.air.air,64);
  for(const c of ['reach','finish'])choose(g,'q084',c);assert.equal(values(g,'q084').stretcherPartyAt,'survivors');assert.equal(values(g,'q084').beaconDeviceAt,'beacon');
 }
 const g=ready();start(g,'q084');for(const c of ['recover','carry','finish'])choose(g,'q084',c);assert.equal(values(g,'q084').beaconDeviceAt,'family');assert.equal(values(g,'q084').reached,false);assert.equal(values(g,'q084').stretcherPartyAt,'survivors');
});
test('q085 retrieves the fixed marker before trying a moving guide, and brings both guides back',()=>{
 const g=ready(),id='q085';start(g,id);for(const c of ['bag','entrance','walk'])choose(g,id,c);assert.equal(values(g,id).markerAt,'exit');
 choose(g,id,'leader');assert.equal(values(g,id).markerAt,'exit');choose(g,id,'leader');assert.equal(values(g,id).markerAt,'nextGuide');
 for(const c of ['entrance','walk','exit','finish'])choose(g,id,c);for(const e of ['marker','guide','nextGuide'])assert.equal(values(g,id)[e+'At'],'exit');assert.equal(values(g,id).fixed,true);
});
test('q088 installs the replacement at the window and delivers the old panel only after observation',()=>{
 const g=ready(),id='q088';start(g,id);for(const c of ['layers','replace','carry'])choose(g,id,c);assert.equal(values(g,id).spareAt,'party');assert.equal(values(g,id).checked,false);
 choose(g,id,'test');assert.equal(values(g,id).spareAt,'window');assert.equal(values(g,id).checked,true);choose(g,id,'observe');depart(g,id,'sky');assert.equal(values(g,id).crackedAt,'party');assert.equal(values(g,id).observed,true);arrive(g,id,'archive');choose(g,id,'finish');assert.equal(values(g,id).crackedAt,'archive');
});
for(const order of [['wedding','wages'],['wages','wedding']])test(`q089 ${order}: both real appointments precede switching the calendar`,()=>{
 const g=ready(),id='q089';start(g,id);choose(g,id,'turn');const terrain=structuredClone(g.state.dungeons.persistent.region_9.systems.terrain);
 assert.equal(g.dispatch({type:'choose',id:'switch'}),false);for(const [i,c] of order.entries()){depart(g,id,c);assert.equal(values(g,id)[c],false);arrive(g,id,c);assert.equal(values(g,id)[c],true);choose(g,id,'return');if(i===0)assert.equal(g.dispatch({type:'choose',id:'switch'}),false);}
 choose(g,id,'switch');assert.equal(values(g,id).switched,true);assert.deepEqual(g.state.dungeons.persistent.region_9.systems.terrain,terrain);
});
for(const end of ['close','longer'])test(`q090 ${end}: visitors return to the controls before power restoration`,()=>{
 const g=ready(),id='q090';g.state.vars.region_9=3;start(g,id);for(const c of ['battery','hour','start'])choose(g,id,c);assert.equal(values(g,id).backup,true);assert.equal(values(g,id).lidOpen,true);
 depart(g,id,'escort');for(const e of ['mao','visitors'])assert.equal(values(g,id)[e+'At'],'transit');arrive(g,id,'sky');choose(g,id,end);if(end==='longer'){assert.equal(values(g,id).exhausted,true);assert.equal(values(g,id).restored,false);choose(g,id,'return');}
 assert.equal(values(g,id).lidOpen,true);choose(g,id,'finish');for(const e of ['mao','visitors','maintenance'])assert.equal(values(g,id)[e+'At'],'entry');assert.equal(values(g,id).lidOpen,false);assert.equal(values(g,id).backup,false);assert.equal(values(g,id).restored,true);
});
test('q182 spends one real story charge after both agreements, then escorts the waiting evacuees',()=>{
 const g=ready(),id='q182';start(g,id);choose(g,id,'deploy');assert.equal(values(g,id).cannonAt,'gun');assert.equal(g.dispatch({type:'choose',id:'light'}),false);
 for(const c of ['command','return','evac','return'])choose(g,id,c);choose(g,id,'light');assert.equal(values(g,id).charge,0);assert.equal(values(g,id).spent,1);assert.equal(values(g,id).evacueesAt,'evac');assert.equal(g.dispatch({type:'choose',id:'light'}),false);
 choose(g,id,'join');depart(g,id,'escort');assert.equal(values(g,id).evacueesAt,'transit');arrive(g,id,'safe');choose(g,id,'finish');assert.equal(values(g,id).evacueesAt,'safe');
 const held=ready();start(held,id);for(const c of ['deploy','hold','finish'])choose(held,id,c);assert.equal(values(held,id).charge,1);assert.equal(values(held,id).spent,0);assert.equal(values(held,id).crystalAt,'entry');
});
for(const aid of ['goods','official'])test(`q183 ${aid}: family aid is delivered before correcting the register`,()=>{
 const g=ready(),id='q183';start(g,id);choose(g,id,'families');const rations=g.state.inventory.ration;choose(g,id,aid);
 if(aid==='official'){assert.equal(values(g,id).aidSecured,false);choose(g,id,'deliver');assert.equal(values(g,id).certificateAt,'families');assert.equal(g.state.inventory.ration,rations);}else assert.equal(g.state.inventory.ration,rations-2);
 assert.equal(values(g,id).uniformsAt,'families');assert.equal(values(g,id).corrected,false);choose(g,id,'correct');choose(g,id,'finish');assert.equal(values(g,id).corrected,true);
});
test('q184 exchanges the pots in the kitchen and returns the original to its cook',()=>{
 const g=ready(),id='q184';start(g,id);for(const c of ['joint','other','carry'])choose(g,id,c);assert.equal(values(g,id).ingredientsAt,'entry');assert.equal(values(g,id).spareAt,'party');choose(g,id,'return');choose(g,id,'finish');assert.equal(values(g,id).spareAt,'jarl');assert.equal(values(g,id).jarlAt,'entry');assert.equal(values(g,id).potAt,'cook');
});
for(const id of ['q185','q190'])for(const result of ['escape','lose'])test(`${id} ${result}: no victory is reported after saving and returning`,()=>{
 const g=ready();start(g,id);choose(g,id,id==='q185'?'hold':'battle');choose(g,id,'battle',{combat:'pending'});resolve(g,id,result);assert.equal(g.state.flags.relocatedBattleResult[id],result);assert.equal(g.dispatch({type:'choose',id:'battle'}),false);
 for(const c of id==='q185'?['early','report','finish']:['evac','escort','finish'])choose(g,id,c);assert.equal(g.state.quests[id].outcome,id==='q185'?'early':'evac');
 if(id==='q185')assert.equal(values(g,id).familiesAt,'near');else {assert.equal(values(g,id).villagersAt,'refuge');for(let i=1;i<=3;i++)assert.equal(values(g,id)['crystal'+i+'At'],'site'+i);}
});
test('q186 limits the proxy exchange to wounded people and carries supplies only on the wider agreement',()=>{
 for(const limited of [false,true]){const g=ready(),id='q186';start(g,id);for(const c of limited?['visit','authority','limited','agree']:['visit','local'])choose(g,id,c);choose(g,id,'escort');assert.equal(values(g,id).oursAt,'exchange');assert.equal(values(g,id).suppliesAt,limited?'entry':'exchange');choose(g,id,'return');choose(g,id,'finish');assert.equal(values(g,id).theirsAt,'entry');}
});
test('q188 individual meetings reunite all three at home for the shared agreement',()=>{
 const g=ready(),id='q188';start(g,id);for(const c of ['escort','talk','next','talk'])choose(g,id,c);assert.equal(values(g,id).wifeAt,'room');assert.equal(values(g,id).brotherAt,'backroom');for(const c of ['share','gather','finish'])choose(g,id,c);for(const e of ['soldier','wife','brother'])assert.equal(values(g,id)[e+'At'],'home');
});
test('q190 each site seals once, all three plus the store are needed, then every crystal travels with the crew',()=>{
 const g=ready(),id='q190';start(g,id);choose(g,id,'battle');choose(g,id,'battle',{combat:'pending'});resolve(g,id,'win');choose(g,id,'continue');assert.equal(g.dispatch({type:'choose',id:'collect'}),false);
 for(const i of [3,1,2]){choose(g,id,'site');assert.equal(g.dispatch({type:'choose',id:'site'+(i===1?3:i===2?1:0)}),false);choose(g,id,'site'+i);choose(g,id,'seal');assert.equal(g.dispatch({type:'choose',id:'seal'}),false);assert.equal(values(g,id)['crystal'+i+'At'],'site'+i);choose(g,id,'return');}
 assert.equal(values(g,id).sites,3);assert.equal(g.dispatch({type:'choose',id:'collect'}),false);for(const c of ['store','return','collect','first','carry','carry','carry'])choose(g,id,c);
 for(let i=1;i<=3;i++)assert.equal(values(g,id)['crystal'+i+'At'],'party');choose(g,id,'finish');for(const e of ['fuu','collectors','crystal1','crystal2','crystal3'])assert.equal(values(g,id)[e+'At'],'store');
});
