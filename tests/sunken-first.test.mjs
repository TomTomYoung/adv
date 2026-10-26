import test from 'node:test';
import assert from 'node:assert/strict';
import {audit,data,ready,start,choose,go,checkpoint,drain,walk} from './royal-helpers.mjs';
const reports={};
for(let n=61;n<=70;n++){const id='q0'+n;test(`${id}: all physical branches, endings and saves`,()=>{reports[id]=audit(id);});}
test('one campaign earns all ten sunken completions and the final prerequisite',()=>{const g=ready();for(let n=61;n<=70;n++){const id='q0'+n,r=reports[id]??audit(id);start(g,id);for(const c of Object.values(r.ends)[0])choose(g,id,c);assert.equal(g.state.quests[id].stage,'completed');}assert.equal(g.state.vars.region_7,10);checkpoint(g);});
import {resolveBattle} from '../tools/audit-regional-relocation.mjs';
const values=(g,id)=>g.state.stories[id].values;
const depart=(g,id,choice)=>{assert.ok(g.dispatch({type:'choose',id:choice}),id+'/'+choice);drain(g);assert.ok(g.state.journey);checkpoint(g);};
const arrive=(g,id,place)=>{go(g,data.quests[id].story.worldPlaces[place]);drain(g);checkpoint(g);};
test('q061 needs both real air rooms; its chart remains carried until delivery after retreat',()=>{
 const g=ready(),id='q061';start(g,id);depart(g,id,'trial');assert.equal(values(g,id).chartAt,'party');arrive(g,id,'air_one');assert.equal(g.state.dungeons.active.systems.air.air,36);assert.equal(g.dispatch({type:'choose',id:'rescue'}),false);
 depart(g,id,'next');assert.equal(values(g,id).tested,0);arrive(g,id,'air_two');assert.equal(g.state.dungeons.active.systems.air.air,36);assert.equal(values(g,id).tested,1);
 depart(g,id,'rescue');assert.equal(values(g,id).chartAt,'party');assert.equal(g.dispatch({type:'story.resume',quest:id}),false);assert.ok(g.dispatch({type:'retreat'}));assert.equal(g.state.townLocation,'oddland_village');assert.equal(values(g,id).chartAt,'party');arrive(g,id,'rescue');assert.equal(values(g,id).chartAt,'rescue');choose(g,id,'finish');assert.equal(g.state.quests[id].outcome,'informed');
});
test('q062 escorts heirs to testimony without claiming that the manifest was exhibited',()=>{
 const g=ready(),id='q062';start(g,id);depart(g,id,'heirs');assert.equal(values(g,id).heirsAt,'transit');assert.equal(values(g,id).clothAt,'party');arrive(g,id,'witness');assert.equal(values(g,id).heirsAt,'witness');assert.equal(values(g,id).clothAt,'heirs');assert.equal(values(g,id).manifestAt,'entry');choose(g,id,'finish');
});
test('q063 can remove an excessive weight and only verifies the aligned entrance on returning',()=>{
 const g=ready(),id='q063';start(g,id);choose(g,id,'weight');choose(g,id,'add');choose(g,id,'add');assert.equal(values(g,id).load,3);assert.equal(g.dispatch({type:'choose',id:'fix'}),false);choose(g,id,'remove');depart(g,id,'fix');assert.equal(values(g,id).aligned,false);arrive(g,id,'entry');assert.equal(values(g,id).aligned,true);choose(g,id,'finish');
});
test('q065 can wait through another tide and transports ritual oil separately from lamp fuel',()=>{
 const g=ready(),id='q065';start(g,id);choose(g,id,'wait');choose(g,id,'wait');choose(g,id,'wait');assert.equal(values(g,id).phase,2);assert.equal(g.dispatch({type:'choose',id:'join'}),false);choose(g,id,'cycle');choose(g,id,'wait');depart(g,id,'join');assert.equal(values(g,id).connected,false);arrive(g,id,'entry');assert.equal(values(g,id).connected,true);choose(g,id,'finish');
 const oil=ready();start(oil,id);choose(oil,id,'oil');const light=oil.state.light;depart(oil,id,'pour');assert.equal(oil.state.light,light);assert.equal(values(oil,id).ritualOilAt,'party');arrive(oil,id,'entry');assert.equal(values(oil,id).ritualOilAt,'lamp');choose(oil,id,'finish');
});
test('q066 carries the empty armor and fetches its boarding record before the joint exhibition',()=>{
 const g=ready(),id='q066';start(g,id);choose(g,id,'carry');assert.equal(values(g,id).empty,true);assert.equal(values(g,id).armorAt,'party');depart(g,id,'manifest');assert.equal(values(g,id).boardingAt,'party');arrive(g,id,'records');depart(g,id,'rewrite');assert.equal(values(g,id).armorAt,'party');arrive(g,id,'exhibit');assert.equal(values(g,id).armorAt,'exhibit');assert.equal(values(g,id).boardingAt,'exhibit');choose(g,id,'finish');assert.equal(g.state.quests[id].outcome,'informed');
});
test('q067 recovers from the large gate first; closing happens at the valve before escort',()=>{
 const g=ready(),id='q067';start(g,id);choose(g,id,'large');assert.equal(values(g,id).opened,false);choose(g,id,'reset');assert.equal(values(g,id).balanced,true);assert.equal(values(g,id).retried,true);choose(g,id,'close');assert.equal(values(g,id).partyAt,'valve');assert.equal(values(g,id).stopped,true);depart(g,id,'escort');assert.equal(values(g,id).mermaidAt,'transit');arrive(g,id,'refuge');assert.equal(values(g,id).mermaidAt,'refuge');choose(g,id,'finish');assert.equal(values(g,id).opened,false);
});
test('q068 spends one rope before towing, and distinguishes saved people from drifting cargo without rope',()=>{
 for(const tow of [true,false]){const g=ready(),id='q068';start(g,id);choose(g,id,'light');const ropes=g.state.inventory.rope;
  if(tow){choose(g,id,'rope');assert.equal(g.state.inventory.rope,ropes-1);assert.equal(values(g,id).raftVesselAt,'raft_site');depart(g,id,'continue');assert.equal(values(g,id).raftVesselAt,'transit');arrive(g,id,'boat');}
  else{g.state.inventory.rope=0;assert.equal(g.dispatch({type:'choose',id:'rope'}),false);choose(g,id,'people');}
  assert.equal(values(g,id).survivorsAt,'boat');assert.equal(values(g,id).cargoAt,'raftVessel');choose(g,id,tow?'cut':'abandon');choose(g,id,'finish');assert.equal(values(g,id).raftVesselAt,tow?'boat':'drift');assert.equal(values(g,id).survivorsAt,'boat');assert.equal(g.state.quests[id].outcome,tow?'informed':'cargo');checkpoint(g);
 }
});
test('q069 remembers its paid tax after helping and requires no second payment; free work remains possible',()=>{
 const g=ready(),id='q069';start(g,id);const gold=g.state.gold;choose(g,id,'pay');assert.equal(g.state.gold,gold-20);assert.equal(values(g,id).paid,true);assert.equal(values(g,id).diagramAt,'entry');choose(g,id,'continue');choose(g,id,'return');assert.equal(g.dispatch({type:'choose',id:'single'}),false);depart(g,id,'leave');assert.equal(values(g,id).diagramAt,'party');arrive(g,id,'report');assert.equal(g.state.gold,gold-20);assert.equal(values(g,id).diagramAt,'report');choose(g,id,'finish');
 const free=ready();start(free,id);free.state.gold=0;for(const k of Object.keys(free.state.inventory))free.state.inventory[k]=0;assert.equal(free.dispatch({type:'choose',id:'pay'}),false);choose(free,id,'help');choose(free,id,'shared');assert.equal(free.state.quests[id].outcome,'informed');
});
test('q070 escorts the port before the three separate valves and keeps native float devices independent',()=>{
 const g=ready(),id='q070';g.state.vars.region_7=3;start(g,id);choose(g,id,'divide');for(const c of ['outer','store','core'])assert.equal(g.dispatch({type:'choose',id:c}),false);choose(g,id,'evacuate');assert.equal(values(g,id).evacuated,false);depart(g,id,'escort');assert.equal(values(g,id).portPeopleAt,'transit');arrive(g,id,'refuge');assert.equal(values(g,id).evacuated,true);choose(g,id,'back');
 for(const c of ['outer','store']){depart(g,id,c);assert.equal(values(g,id)[c],false);arrive(g,id,c);assert.equal(values(g,id)[c],true);choose(g,id,'back');}depart(g,id,'core');assert.equal(values(g,id).core,false);arrive(g,id,'core');assert.equal(values(g,id).core,true);choose(g,id,'finish');assert.deepEqual(g.state.dungeons.persistent.region_7.systems.air.raised,[]);assert.equal(g.state.quests[id].outcome,'informed');
});
for(const [id,choice,encounter] of [['q069','force','guard_7'],['q070','all','boss_7']])test(`${id}: battle loss and permitted escape retain the unfinished job for retry`,()=>{
 for(const result of ['lose',...(data.encounters[encounter].escape?['escape']:[])]){const g=ready();g.state.vars.region_7=3;start(g,id);choose(g,id,choice,{combat:'pending'});assert.equal(g.state.battle.encounter,encounter);checkpoint(g);if(!data.encounters[encounter].escape)assert.equal(g.dispatch({type:'battle',action:'escape'}),false);delete g.random;resolveBattle(g,result);checkpoint(g);assert.equal(g.state.quests[id].stage,'active');assert.equal(values(g,id).finished,false);g.random=()=>.999999;
  if(result==='lose'){assert.equal(g.state.townLocation,'oddland_village');go(g,data.quests[id].story.worldPlaces.entry);assert.ok(g.dispatch({type:'story.resume',quest:id}));drain(g);}choose(g,id,choice);assert.equal(g.state.quests[id].outcome,'contract');
 }
});
