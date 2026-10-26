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
const reports={};
function audit(id){
 const g=ready(),queue=[],seen=new Set(),ends={},optionsSeen=new Set();
 start(g,id);queue.push({state:structuredClone(g.state),path:[]});
 if(['q164','q165'].includes(id)){
  const absent=ready(),actor=id==='q164'?'ren':'il';
  go(absent,{kind:'town',location:'oddland_village_inn'});
  if(absent.state.members.includes(actor))assert.ok(absent.dispatch({type:'party',action:'leave',actor}));
  start(absent,id);queue.push({state:structuredClone(absent.state),path:['[absent]']});
 }
 for(let i=0;i<queue.length;i++){
  const e=queue[i];g.state=structuredClone(e.state);g.random=()=>.999999;checkpoint(g);
  const key=JSON.stringify({story:g.state.stories[id],result:g.state.flags.relocatedBattleResult?.[id],outcome:g.state.quests[id].outcome,members:g.state.members});
  if(seen.has(key))continue;seen.add(key);assert.ok(seen.size<2000,id+' finite');
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
for(let n=161;n<=170;n++){const id='q'+n;test(`${id}: every physical choice, battle result, ending and save`,()=>{reports[id]=audit(id);});}
test('all ten requests can finish in one village campaign',()=>{
 const g=ready();for(let n=161;n<=170;n++){const id='q'+n,report=reports[id]??audit(id),path=Object.values(report.ends).find(p=>!p.some(c=>c.startsWith('[')));start(g,id);for(const c of path)choose(g,id,c);assert.equal(g.state.quests[id].stage,'completed');}checkpoint(g);
});
const depart=(g,id,c)=>{assert.ok(g.dispatch({type:'choose',id:c}));drain(g);assert.ok(g.state.journey);checkpoint(g);};
const arrive=(g,id,place)=>{go(g,data.quests[id].story.worldPlaces[place]);drain(g);checkpoint(g);};
test('q161 pays at the lender, carries the recording and escorts its owner before treatment',()=>{
 const g=ready(),id='q161';start(g,id);const gold=g.state.gold;choose(g,id,'record');assert.equal(g.state.gold,gold);choose(g,id,'rent');assert.equal(g.state.gold,gold-20);assert.equal(values(g,id).recorderAt,'party');choose(g,id,'record');depart(g,id,'recorded');assert.equal(values(g,id).patientAt,'transit');assert.equal(g.dispatch({type:'story.resume',quest:id}),false);arrive(g,id,'clinic');assert.equal(values(g,id).patientAt,'clinic');choose(g,id,'finish');assert.equal(values(g,id).recorderAt,'patient');
});
test('q162 keeps the shield scar through a concealed report and actual return to Eld',()=>{
 const g=ready(),id='q162';start(g,id);choose(g,id,'borrow');choose(g,id,'shield');assert.equal(values(g,id).survivorsAt,'bank');choose(g,id,'hide');depart(g,id,'return');assert.equal(values(g,id).shieldAt,'party');assert.equal(values(g,id).scar,true);arrive(g,id,'entry');choose(g,id,'finish');assert.equal(values(g,id).shieldAt,'eld');assert.equal(values(g,id).scar,true);assert.equal(values(g,id).lied,true);
});
test('q163 witnesses enter the vault and return for receipt while goods stay inside',()=>{
 const g=ready(),id='q163';start(g,id);choose(g,id,'old');choose(g,id,'agree');for(const e of ['som','owner'])assert.equal(values(g,id)[e+'At'],'vault');assert.equal(values(g,id).repaired,false);choose(g,id,'repair');choose(g,id,'return');choose(g,id,'finish');assert.equal(values(g,id).goodsAt,'vault');assert.equal(g.state.quests[id].outcome,'repay');
});
test('q164 and q165 preserve party composition while absent guests are invited to their own meetings',()=>{
 for(const [id,actor,path,guest,place] of [['q164','ren',['secret','party','escort','finish'],'renGuest','hall'],['q165','il',['private','ask','public','agree','finish'],'ilGuest','supply']]){
  const g=ready();go(g,{kind:'town',location:'oddland_village_inn'});if(g.state.members.includes(actor))assert.ok(g.dispatch({type:'party',action:'leave',actor}));const members=[...g.state.members];start(g,id);for(const c of path)choose(g,id,c);assert.deepEqual(g.state.members,members);assert.equal(values(g,id)[guest+'At'],place);
 }
});
for(const id of ['q166','q167'])for(const result of ['escape','lose'])test(`${id}: ${result} cannot become a victory report after save/reload`,()=>{
 const g=ready();start(g,id);choose(g,id,id==='q166'?'trial':'ridge');choose(g,id,'battle',{combat:'pending'});resolve(g,id,result);assert.equal(g.state.flags.relocatedBattleResult[id],result);assert.equal(g.dispatch({type:'choose',id:'battle'}),false);
 for(const c of id==='q166'?['interview','honest']:['retreat','escort','finish'])choose(g,id,c);
 assert.equal(g.state.quests[id].outcome,id==='q166'?'interview':'retreat');if(id==='q167')assert.equal(values(g,id).refugeesAt,'refuge');
});
test('q167 fallen bridge terrain stays blocked before and after either scouting order',()=>{
 const tiles=JSON.stringify(data.maps.e2_royal_fort.tiles);assert.equal(data.maps.e2_royal_fort.tiles[1][6],'#');
 for(const order of [['bridge','enemy'],['enemy','bridge']]){const g=ready(),id='q167';start(g,id);for(const c of order){choose(g,id,c);choose(g,id,'back');}assert.equal(values(g,id).bridge,true);assert.equal(values(g,id).enemy,true);choose(g,id,'march');assert.equal(values(g,id).partyAt,'bridge');assert.equal(g.walkable(g.map(),6,1),false);choose(g,id,'back');assert.equal(JSON.stringify(data.maps.e2_royal_fort.tiles),tiles);}
});
test('q168 local test precedes invoice; the brother returns before both consent to the contract',()=>{
 const g=ready(),id='q168';start(g,id);choose(g,id,'pair');assert.equal(values(g,id).brotherAt,'other');choose(g,id,'listen');assert.equal(values(g,id).repaired,false);choose(g,id,'test');assert.equal(values(g,id).repaired,true);assert.equal(g.dispatch({type:'choose',id:'invoice'}),false);choose(g,id,'fetch');choose(g,id,'return');choose(g,id,'invoice');for(const e of ['brother','younger'])assert.equal(values(g,id)[e+'At'],'invoice');assert.equal(values(g,id).billAt,'party');choose(g,id,'flex');
});
test('q169 never gives the refused ring to the recipient; later mail travels back before correction',()=>{
 const g=ready(),id='q169';start(g,id);choose(g,id,'deliver');assert.equal(values(g,id).ringAt,'party');choose(g,id,'message');choose(g,id,'back');choose(g,id,'lie');assert.equal(values(g,id).ringAt,'party');assert.equal(values(g,id).letterAt,'messenger');depart(g,id,'deliver');assert.equal(values(g,id).letterAt,'party');arrive(g,id,'entry');assert.equal(values(g,id).letterAt,'mao');choose(g,id,'admit');assert.equal(values(g,id).ringAt,'mao');assert.equal(values(g,id).ringHeld,false);
});
test('q170 crosses the lake both ways and delivers the promised freight before the farewell',()=>{
 const g=ready(),id='q170';start(g,id);choose(g,id,'lake');assert.equal(g.state.location.map,'e2_royal_lakeshore');choose(g,id,'island');assert.equal(g.state.location.map,'e2_royal_island');choose(g,id,'role');choose(g,id,'agree');assert.equal(g.state.location.map,'e2_royal_lakeshore');assert.equal(values(g,id).sefAt,'shore');choose(g,id,'continue');depart(g,id,'carry');assert.equal(values(g,id).cargoAt,'party');assert.equal(values(g,id).finished,false);arrive(g,id,'entry');choose(g,id,'finish');assert.equal(values(g,id).cargoAt,'entry');assert.equal(values(g,id).sefAt,'entry');assert.equal(g.state.quests[id].outcome,'role');
});
