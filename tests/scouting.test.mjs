import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {fieldActionPlan} from '../src/core/jobs.js';
import {cellEventKey} from '../src/core/cell-layers.js';
import {processFieldEvents,recordFieldEntry} from '../src/core/field-events.js';
import {scoutingSaveErrors,camouflageRate,normalEncounterPool} from '../src/core/scouting.js';
import {projectGame} from '../src/application/projection.js';
import {validateSave} from '../src/core/save.js';
function game(){
  const d=structuredClone(data),g=new GameEngine(d);drain(g);g.award(0,d.system.xpBase*9*10);
  const m=d.maps.region_2_f1;m.objects=[];m.encounterRate=0;g.teleport(m.id,1,1,'east');g.state.discovered[m.id]=['1,1'];return {g,d,m};
}
function trap({d,m},id='needle',x=2,edge,reset='never'){
  d.cellEvents[id]={trigger:'enter',script:'test.trap',occurrence:{chance:.5,maxCount:null,reset},trap:{kind:'needle',hidden:1,difficulty:1,recovery:{item:'hard_thorn',count:1,minLevel:2,chance:.5}}};
  d.scripts['test.trap']={commands:[{op:'add',target:'vars.trapHits',value:1}]};
  const patch=m.cells.overrides[`${x},1`]??={};patch.events=[...(patch.events??[]),id];if(edge)(patch.eventFaces??={})[id]=edge;
  return cellEventKey(m.id,x,1,id);
}
const use=(g,ability,target)=>g.dispatch({type:'job.action',actor:'nio',ability,target});
const roundtrip=g=>{const text=g.save();assert.deepEqual(validateSave(JSON.parse(text),g.data),[]);g.load(text);assert.equal(g.save(),text);};
test('detection reveals a square, persists wall faces and projects trap icons without disabling occurrences',()=>{
  const c=game(),near=trap(c),wall=trap(c,'wall',1,'north'),far=trap(c,'far',5);assert.ok(use(c.g,'trap_detect'));
  assert.equal(c.g.state.scouting.traps[near].discovered,true);assert.equal(c.g.state.scouting.traps[wall].edge,'north');assert.equal(c.g.state.scouting.traps[far],undefined);assert.equal(c.g.state.scouting.traps[near].disabled,undefined);
  const markers=projectGame(c.g).dungeon.objects.filter(o=>o.kind==='trap');assert.ok(markers.some(o=>o.id===near));assert.equal(markers.find(o=>o.id===wall).edge,'north');roundtrip(c.g);
});
test('disarmed traps never roll occurrence, survive reentry and only explicit manual reset rearms',()=>{
  const c=game(),{g,m,d}=c,key=trap(c,'needle',2,undefined,'manual');use(g,'trap_detect');assert.ok(use(g,'trap_disarm'));let rolls=0;g.random=()=>{rolls++;return 0;};
  g.dispatch({type:'move',direction:'forward'});assert.equal(rolls,0);assert.equal(g.state.vars.trapHits,undefined);roundtrip(g);g.returnTown();g.teleport(m.id,1,1,'east');g.dispatch({type:'move',direction:'forward'});assert.equal(rolls,0);
  d.scripts.rearm={commands:[{op:'cell.event.reset',map:m.id,x:2,y:1,event:'needle'}]};g.run('rearm');processFieldEvents(g);assert.equal(rolls,0);
  g.dispatch({type:'move',direction:'back'});g.dispatch({type:'move',direction:'forward'});assert.equal(rolls,1);assert.equal(g.state.vars.trapHits,1);assert.equal(g.state.scouting.traps[key].discovered,true);
});
test('reentry occurrence reset does not repair a disarmed trap',()=>{
  const c=game(),key=trap(c,'needle',2,undefined,'reentry');use(c.g,'trap_detect');use(c.g,'trap_disarm');c.g.returnTown();c.g.teleport(c.m.id,1,1,'east');assert.equal(c.g.state.scouting.traps[key].disabled,true);roundtrip(c.g);
});
test('disarm checks floor direction, untriggered occupied cell and exact wall face before paying',()=>{
  const c=game(),{g}=c;trap(c);const wall=trap(c,'wall',1,'north');use(g,'trap_detect');g.state.location.facing='west';const mp=g.state.actors.nio.mp;
  assert.equal(use(g,'trap_disarm'),false);assert.equal(g.state.actors.nio.mp,mp);
  g.state.location.facing='north';assert.ok(use(g,'trap_disarm',wall));
  g.teleport(c.m.id,2,1,'east');assert.ok(fieldActionPlan(c.d,g.state,'nio','trap_disarm').ok);
  g.state.events[cellEventKey(c.m.id,2,1,'needle')]=1;assert.equal(fieldActionPlan(c.d,g.state,'nio','trap_disarm').ok,false);
});
test('trap recovery respects skill level, configured probability, stack limit and no-recovery traps',()=>{
  for(const [level,full,hasRecovery,roll,expected] of [[1,false,true,0,0],[2,false,true,0,1],[2,false,true,.9,0],[2,true,true,0,0],[3,false,false,0,0]]){
    const c=game(),{g,d}=c,key=trap(c);if(!hasRecovery)delete d.cellEvents.needle.trap.recovery;
    g.state.actors.nio.skillProgress={trap_disarm:{level,uses:level===1?0:5}};g.state.inventory.hard_thorn=full?d.system.maxStack:0;g.random=()=>roll;use(g,'trap_detect');assert.ok(use(g,'trap_disarm'));assert.equal(g.state.inventory.hard_thorn,(full?d.system.maxStack:0)+expected);assert.equal(g.state.scouting.traps[key].disabled,true);roundtrip(g);
  }
});
test('thief shares disarm; all seven new skills reject town, battle and absent users',()=>{
  const {g,d}=game();g.returnTown();assert.ok(g.dispatch({type:'job.change',actor:'nio',job:'rogue'}));g.teleport('region_2_f1',1,1);assert.match(fieldActionPlan(d,g.state,'nio','trap_disarm').reason,/罠/);assert.match(fieldActionPlan(d,g.state,'nio','trap_detect').reason,/習得/);
  for(const ability of ['trap_disarm','trap_detect','ambush','seek_enemy','patrol','camouflage','recon']){const c=game();c.g.returnTown();assert.equal(use(c.g,ability),false);c.g.teleport(c.m.id,1,1);c.g.state.members=c.g.state.members.filter(id=>id!=='nio');assert.equal(use(c.g,ability),false);}
});
test('patrol and camouflage expire on successful walking only; fixed battles still start',()=>{
  const {g}=game();use(g,'patrol');use(g,'camouflage');use(g,'ambush');const before=structuredClone(g.state.scouting.effects);g.dispatch({type:'move',direction:'left'});roundtrip(g);projectGame(g);assert.deepEqual(g.state.scouting.effects,before);assert.equal(camouflageRate(g.state),.6);
  g.state.location.facing='east';g.dispatch({type:'move',direction:'forward'});assert.equal(g.state.scouting.effects.patrol.remaining,before.patrol.remaining-1);
  g.startBattle('wild_pair_10',{win:[],lose:[],escape:[]});assert.ok(g.state.battle);assert.equal(g.state.scouting.effects.ambush,undefined);assert.equal(g.state.battle.preemptive.side,'allies');roundtrip(g);
});
test('seek uses ordinary floor candidates and the normal battle pipeline',()=>{
  const {g,d,m}=game();m.encounterPool=[{encounter:'wild_pair_10',weight:1}];m.objects=[{id:'fixed',script:'not_invoked',kind:'trap',x:4,y:1,trigger:'enter'}];
  assert.deepEqual(normalEncounterPool(d,g.state).pool,m.encounterPool);const battles=g.state.records.battles;assert.ok(use(g,'seek_enemy'));assert.equal(g.state.battle.encounter,'wild_pair_10');assert.equal(g.state.records.battles,battles+1);
});
test('recon saves departure and results, excludes the actor from battle and restores the original slot',()=>{
  const c=game(),{g}=c,key=trap(c,'needle',3),members=[...g.state.members];g.state.actors.nio.skillProgress={recon:{level:3,uses:15}};assert.ok(use(g,'recon'));
  assert.ok(!g.state.members.includes('nio'));assert.equal(g.state.scouting.recon.result.disarmed[0],key);assert.equal(g.state.scouting.traps[key],undefined);roundtrip(g);
  assert.equal(use(g,'patrol'),false);g.startBattle('wild_pair_10',{win:[],lose:[],escape:[]});assert.ok(!projectGame(g).party.some(a=>a.id==='nio'));roundtrip(g);g.finishBattle('escape');drain(g);assert.ok(g.state.scouting.recon);
  for(let i=0;i<4;i++){g.state.location.facing='east';g.dispatch({type:'move',direction:i%2?'back':'forward'});}
  assert.deepEqual(g.state.members,members);assert.equal(g.state.scouting.recon,undefined);assert.ok(g.state.scouting.traps[key].disabled);roundtrip(g);
});
for(const action of ['return','defeat','teleport','event'])test(`recon recalls safely on ${action}, including save/reload`,()=>{
  const {g,d}=game(),members=[...g.state.members];assert.ok(use(g,'recon'));roundtrip(g);
  if(action==='return')g.returnTown();
  if(action==='defeat'){for(const id of g.state.members)g.state.actors[id].hp=0;g.defeat();}
  if(action==='teleport')g.teleport('region_2_f2',1,1);
  if(action==='event'){d.scripts.forced={commands:[{op:'narrate',text:'集合'}]};g.run('forced');drain(g);}
  assert.deepEqual(g.state.members,members);assert.equal(g.state.scouting.recon,undefined);assert.ok(g.state.actors.nio.hp>0);roundtrip(g);
});
test('recon cannot remove the last living member and rejects malformed saved expeditions',()=>{
  const {g}=game();g.state.members=['nio'];assert.equal(use(g,'recon'),false);g.state.members=['ada','nio'];assert.ok(use(g,'recon'));const s=structuredClone(g.state);
  for(const mutate of [s=>s.members.push('nio'),s=>s.scouting.recon.actor='unknown',s=>s.scouting.recon.returnAt=-1,s=>s.scouting.recon.result.cells=['999,999'],s=>s.scouting.recon.result.disarmed=['cell/region_2_f1/2,1/missing'],s=>s.scouting.effects.camouflage={remaining:1,rate:2}]){const copy=structuredClone(s);mutate(copy);assert.ok(scoutingSaveErrors(g.data,copy).length);}
});

test('camouflage protects its final promised step and then expires',()=>{
 const {g,d,m}=game();m.encounterRate=1;d.system.encounterCheckSteps=1;g.random=()=>.5;
 g.state.scouting={traps:{},effects:{camouflage:{remaining:1,rate:0}}};assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.equal(g.state.battle,null);assert.equal(g.state.scouting.effects.camouflage,undefined);
 assert.ok(g.dispatch({type:'move',direction:'back'}));assert.ok(g.state.battle);
});
test('entering a dungeon service interior restores the scout before service use and save',()=>{
 const {g,d}=game(),location=Object.values(d.locations).find(l=>l.dungeonEntrance),p=location.dungeonEntrance;
 g.teleport(p.map,p.x,p.y,p.facing);g.state.discovered[p.map]=[`${p.x},${p.y}`];assert.ok(use(g,'recon'));assert.ok(g.enterLocation(location.id));assert.ok(g.state.members.includes('nio'));assert.equal(g.state.scouting.recon,undefined);roundtrip(g);
});
