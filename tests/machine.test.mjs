import test from 'node:test';
import assert from 'node:assert/strict';
import {commandsAt} from '../src/core/script.js';
import {storyCanAct} from '../src/core/story.js';
import {data,ready,start,choose,go,checkpoint,drain,resolve} from './machine-helpers.mjs';
const numbers=[...Array.from({length:10},(_,i)=>71+i),...Array.from({length:10},(_,i)=>171+i)];
const reports={};
function audit(id){
 const g=ready(),queue=[],seen=new Set(),ends={},optionsSeen=new Set();if(id==='q080')g.state.vars.region_8=3;
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
test('all twenty requests can finish in one Salome campaign',()=>{
 const g=ready();for(const n of numbers){const id='q'+String(n).padStart(3,'0'),report=reports[id]??audit(id),path=Object.values(report.ends).find(p=>!p.some(c=>c.startsWith('[')));start(g,id);for(const c of path)choose(g,id,c);assert.equal(g.state.quests[id].stage,'completed');}checkpoint(g);
});
const values=(g,id)=>g.state.stories[id].values;
const depart=(g,id,c)=>{assert.ok(g.dispatch({type:'choose',id:c}),g.state.notice);drain(g);assert.ok(g.state.journey);checkpoint(g);assert.equal(g.dispatch({type:'story.resume',quest:id}),false);};
const arrive=(g,id,p)=>{go(g,data.quests[id].story.worldPlaces[p]);drain(g);checkpoint(g);};
const run=(g,id,choices)=>{for(const c of choices)choose(g,id,c);};
test('q071 retirement lookup does not substitute for the actual worker returning',()=>{
 const id='q071',g=ready();start(g,id);run(g,id,['retired','carry']);assert.equal(values(g,id).retiredChecked,true);assert.equal(values(g,id).workerPersonAt,'worker_room');assert.equal(values(g,id).returned,false);choose(g,id,'call');depart(g,id,'escort');assert.equal(values(g,id).workerPersonAt,'transit');assert.equal(values(g,id).stampAt,'workerPerson');arrive(g,id,'entry');choose(g,id,'finish');assert.equal(values(g,id).returned,true);assert.equal(values(g,id).stampAt,'entry');
});
test('q072 cold oil is delivered to the tested machine without increasing carried fuel',()=>{
 const id='q072',g=ready();start(g,id);choose(g,id,'oil');const fuel=g.state.expedition.reserve;depart(g,id,'separate');assert.equal(values(g,id).coldOilAt,'party');assert.equal(values(g,id).oilChanged,false);arrive(g,id,'cold');choose(g,id,'finish');assert.equal(values(g,id).coldOilAt,'cold');assert.equal(values(g,id).ritualSeparated,true);assert.equal(g.state.expedition.reserve,fuel);
});
for(const brace of [false,true])test(`q073 original arm is returned only at the door, supported=${brace}`,()=>{
 const id='q073',g=ready();start(g,id);run(g,id,brace?['brace','carry','one']:['borrow']);assert.equal(values(g,id).armAt,'party');depart(g,id,'return');assert.equal(values(g,id).returned,false);arrive(g,id,'entry');choose(g,id,'finish');assert.equal(values(g,id).armAt,'entry');assert.equal(values(g,id).copyArmAt,'party');assert.equal(values(g,id).returned,true);
});
test('q074 failed ignition has a walkable retry and corrections require the copy desk',()=>{
 const id='q074',g=ready();start(g,id);run(g,id,['heat','reset','furnace','correct']);assert.equal(values(g,id).failedTrial,true);assert.equal(values(g,id).corrected,false);depart(g,id,'correct');arrive(g,id,'copy');choose(g,id,'finish');assert.equal(values(g,id).corrected,true);
});
test('q075 physical gear delivery and request translation remain separate from human work sharing',()=>{
 const id='q075',g=ready();start(g,id);choose(g,id,'gear');depart(g,id,'deliver');assert.equal(values(g,id).gearPartAt,'party');assert.equal(values(g,id).supplied,false);arrive(g,id,'entry');assert.equal(values(g,id).supplied,true);assert.equal(values(g,id).translated,false);run(g,id,['translate','deliver','finish']);assert.equal(values(g,id).requestSheetAt,'store');assert.equal(values(g,id).workShared,false);
 const h=ready();start(h,id);run(h,id,['share','escort','finish']);assert.equal(values(h,id).workersGroupAt,'entry');assert.equal(values(h,id).gearPartAt,'store');assert.equal(values(h,id).supplied,false);
});
test('q076 medicines are protected on actual fridge receipt before stopping the song',()=>{
 const id='q076',g=ready();start(g,id);run(g,id,['line','move']);depart(g,id,'carry');assert.equal(values(g,id).medicineBoxAt,'party');assert.equal(values(g,id).protected,false);arrive(g,id,'fridge');assert.equal(values(g,id).protected,true);choose(g,id,'stop');assert.equal(values(g,id).stopped,false);choose(g,id,'finish');assert.equal(values(g,id).medicineBoxAt,'fridge');assert.equal(values(g,id).stopped,true);assert.equal(values(g,id).medicineLost,false);
});
test('q077 clinic lamps precede wall repair and the detour remains a real exit',()=>{
 const id='q077',g=ready();start(g,id);choose(g,id,'cutpower');depart(g,id,'lamps');assert.equal(values(g,id).lampsDelivered,false);arrive(g,id,'clinic');assert.equal(values(g,id).lampsDelivered,true);assert.equal(values(g,id).repaired,false);run(g,id,['return','finish']);assert.equal(values(g,id).repaired,true);assert.equal(values(g,id).outage,false);go(g,{kind:'town',location:'e2_academy'});
});
for(const order of [['hammer','needle'],['needle','hammer']])test(`q078 ${order}: both real benches train the user without changing party abilities`,()=>{
 const id='q078',g=ready();start(g,id);const jobs=Object.fromEntries(Object.entries(g.state.actors).map(([k,a])=>[k,{job:a.job,skills:a.skills}]));choose(g,id,'train');assert.equal(g.dispatch({type:'choose',id:'save'}),false);for(const c of order){choose(g,id,c);choose(g,id,'return');}run(g,id,['save','finish']);assert.equal(values(g,id).userPersonAt,'record');assert.equal(values(g,id).oldLayoutAt,'record');assert.deepEqual(Object.fromEntries(Object.entries(g.state.actors).map(([k,a])=>[k,{job:a.job,skills:a.skills}])),jobs);
});
test('q079 archive receipt and readback precede clearing and restarting the actual furnace',()=>{
 const id='q079',g=ready();start(g,id);choose(g,id,'storage');depart(g,id,'shutdown');assert.equal(values(g,id).shutdown,true);assert.equal(values(g,id).backupVerified,false);assert.equal(values(g,id).recordBoardAt,'party');arrive(g,id,'archive_place');assert.equal(values(g,id).backupVerified,true);assert.equal(values(g,id).cleared,false);depart(g,id,'clear');arrive(g,id,'entry');choose(g,id,'finish');assert.equal(values(g,id).recordBoardAt,'entry');assert.equal(values(g,id).saved,true);assert.equal(values(g,id).bypassed,false);
});
for(const order of [['maintenance','users','guardians'],['guardians','maintenance','users'],['users','guardians','maintenance']])test(`q080 ${order}: each authority is visited before the single key is destroyed`,()=>{
 const id='q080',g=ready();g.state.vars.region_8=3;start(g,id);const system=structuredClone(g.state.dungeons.persistent.region_8);choose(g,id,'council');assert.equal(g.dispatch({type:'choose',id:'restore'}),false);for(const c of order){choose(g,id,c);choose(g,id,'return');}depart(g,id,'restore');assert.equal(values(g,id).singleKeyAt,'party');assert.equal(values(g,id).singleKeyDestroyed,false);arrive(g,id,'destroy');choose(g,id,'return');choose(g,id,'finish');assert.equal(values(g,id).singleKeyAt,'destroy');assert.equal(values(g,id).sharedControl,true);assert.deepEqual(g.state.dungeons.persistent.region_8,system);
});
test('q171 the ward costs 20G once, explicit observations tick time, and the family is not evacuated early',()=>{
 const id='q171',g=ready();start(g,id);run(g,id,['visit','begin','rule','return']);const gold=g.state.gold;assert.equal(values(g,id).time,1);choose(g,id,'ward');assert.equal(g.state.gold,gold-20);assert.equal(values(g,id).wardPaid,true);assert.equal(values(g,id).time,1);depart(g,id,'continue');assert.equal(values(g,id).wardPaperAt,'shoes');arrive(g,id,'shoes');assert.equal(values(g,id).wardPaperAt,'party');assert.equal(values(g,id).time,2);run(g,id,['return','loop','home','finish']);assert.equal(values(g,id).wardPaperAt,'ring');assert.equal(values(g,id).familyAt,'home');assert.equal(g.state.gold,gold-20+141);
});
for(const result of ['escape','lose'])test(`q171 ${result}: a failed defense leads to actual family evacuation, never victory`,()=>{
 const id='q171',g=ready();start(g,id);run(g,id,['visit','begin','wait','return','wait','return','wait','return','fight']);choose(g,id,'fight',{combat:'pending'});resolve(g,id,result);assert.equal(g.dispatch({type:'choose',id:'fight'}),false);assert.equal(values(g,id).defended,false);depart(g,id,'evacuate');assert.equal(values(g,id).familyAt,'transit');assert.equal(values(g,id).evacuated,false);arrive(g,id,'refuge');choose(g,id,'finish');assert.equal(values(g,id).familyAt,'refuge');assert.equal(g.state.quests[id].outcome,'evacuate');
});
test('q172 both names are heard at their source, and the restored person visits the mother',()=>{
 const id='q172',g=ready();start(g,id);run(g,id,['visit','well']);assert.equal(g.dispatch({type:'choose',id:'restore'}),false);run(g,id,['back','market','return','mother','return','well','restore','mother','finish']);assert.equal(values(g,id).luiAt,'mother');assert.equal(values(g,id).memoriesReturned,true);assert.equal(values(g,id).motherInformed,true);
});
test('q173 hearing the spirit alone cannot establish both parties consent',()=>{
 const id='q173',g=ready();start(g,id);run(g,id,['visit','spirit']);assert.equal(g.dispatch({type:'choose',id:'guest'}),false);run(g,id,['wife','return','guest','finish']);assert.equal(values(g,id).spiritPersonAt,'home');assert.equal(values(g,id).bothAgreed,true);
});
test('q174 rescuing injured marchers does not finish the funeral or compel the daughter',()=>{
 const id='q174',g=ready();start(g,id);run(g,id,['visit','people']);assert.equal(values(g,id).injuredAt,'rescue');assert.equal(values(g,id).mourned,false);choose(g,id,'finish');assert.equal(values(g,id).rescued,true);assert.equal(values(g,id).daughterPersonAt,'procession');
});
test('q175 driving the beast out leaves a separate real warning journey',()=>{
 const id='q175',g=ready();start(g,id);run(g,id,['visit','fake','guide']);assert.equal(values(g,id).driven,true);assert.equal(values(g,id).warned,false);depart(g,id,'warn');arrive(g,id,'warning_place');choose(g,id,'finish');assert.equal(values(g,id).miroAt,'warning_place');assert.equal(values(g,id).warned,true);assert.equal(values(g,id).defeated,false);
});
test('q176 seasonal travel returns the sandals and visits the repair road before departure',()=>{
 const id='q176',g=ready();start(g,id);run(g,id,['visit','road','agree','return']);assert.equal(values(g,id).maintenanceAgreed,true);assert.equal(values(g,id).sandalsAt,'party');assert.equal(values(g,id).departed,false);run(g,id,['seeoff','finish']);assert.equal(values(g,id).sandalsAt,'godPerson');assert.equal(values(g,id).godPersonAt,'departure');assert.equal(values(g,id).absenceAnnounced,true);
});
test('q177 provisional notice preserves uncertainty; a viewing window requires actual consent and setting',()=>{
 const id='q177',g=ready();start(g,id);run(g,id,['visit','notice','finish']);assert.equal(values(g,id).proof,false);assert.equal(values(g,id).mirrorDeviceAt,'shop');assert.equal(values(g,id).corrected,false);
 const h=ready();start(h,id);run(h,id,['visit','compare','window']);assert.equal(values(h,id).consentReceived,false);depart(h,id,'return');arrive(h,id,'shop');choose(h,id,'finish');assert.equal(values(h,id).consentReceived,true);assert.equal(values(h,id).windowConfigured,true);
});
for(const route of ['daughter','player'])test(`q178 ${route}: crossing closes the story night and the letter must reach the host`,()=>{
 const id='q178',g=ready();start(g,id);run(g,id,['test',route,route==='player'?'cross':'morning']);assert.equal(values(g,id).nightClosed,true);assert.equal(values(g,id).talked,false);for(const c of ['test','close','wait'])assert.equal(g.dispatch({type:'choose',id:c}),false);depart(g,id,'finish');assert.equal(values(g,id).letterSheetAt,'party');arrive(g,id,'host');choose(g,id,'finish');assert.equal(values(g,id).letterSheetAt,'host');assert.equal(values(g,id).daughterPersonAt,'morning_place');
});
for(const order of [[3,1,2],[2,3,1]])test(`q179 ${order}: all three homes have individual choices and repeat visits cannot increase the count`,()=>{
 const id='q179',g=ready();start(g,id);run(g,id,['visit','begin']);for(const [index,i] of order.entries()){choose(g,id,'house'+i);choose(g,id,index===0?'collect':'reject');choose(g,id,'return');assert.equal(values(g,id).homes,index+1);assert.equal(g.dispatch({type:'choose',id:'house'+i}),false);if(index<2)assert.equal(g.dispatch({type:'choose',id:'starve'}),false);}run(g,id,['starve','finish']);assert.equal(values(g,id)['marker'+order[0]+'At'],'garden');assert.equal(values(g,id).burned,false);
});
test('q179 one rope funds three real cuts before burning; rushing records harm and aid separately',()=>{
 const id='q179',g=ready();start(g,id);run(g,id,['visit','begin']);const rope=g.state.inventory.rope;choose(g,id,'cut');assert.equal(g.state.inventory.rope,rope-1);run(g,id,['continue','cut','cut','cut']);for(let i=1;i<=3;i++)assert.equal(values(g,id)['root'+i+'Cut'],true);assert.equal(values(g,id).burned,false);choose(g,id,'finish');assert.equal(values(g,id).homesDamaged,false);assert.equal(g.state.inventory.rope,rope-1);
 const h=ready();start(h,id);run(h,id,['visit','begin','rush']);assert.equal(values(h,id).aidRequested,false);run(h,id,['report','finish']);assert.equal(values(h,id).homesDamaged,true);assert.equal(values(h,id).aidRequested,true);
});
test('q180 sealing the phenomenon evacuates listeners and stores the unfinished script without claiming completion',()=>{
 const id='q180',g=ready();start(g,id);run(g,id,['visit','scripts','seal','escort']);assert.equal(values(g,id).listenersAt,'refuge');assert.equal(values(g,id).storyFinished,false);run(g,id,['store','finish']);assert.equal(values(g,id).scriptPagesAt,'scripts_place');assert.equal(values(g,id).stored,true);
});
