import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {validateSave} from '../src/core/save.js';
import {activeActor,battleSkillPlan,battleItemPlan,applySkill} from '../src/core/battle.js';
import {nextFormation,PARTY_CELLS} from '../src/core/battle-formation.js';
import {gridTargetPlan,areaCells,rayCells,targetingProfile} from '../src/core/battle-targeting.js';
import {distance,gridMovePlan,gridDefinitionErrors,revivePosition} from '../src/core/battle-grid.js';
import {projectGame} from '../src/application/projection.js';
import {applyStatus} from '../src/core/status-effects.js';
function game(){const d=structuredClone(data),g=new GameEngine(d,78);drain(g);for(const id of d.encounters.wild_pair_1.enemies){d.enemies[id].stats.agi=0;d.enemies[id].stats.hp=2000;d.enemies[id].ai=[{skill:'guard',priority:1,target:'self'}];}return {g,d};}
function start(g,options={}){g.startBattle('wild_pair_1',{win:[],lose:[],escape:[]},{battleMode:'grid',...options});return g.state.battle;}
const roundtrip=g=>{const saved=g.save();assert.deepEqual(validateSave(JSON.parse(saved),g.data),[]);g.load(saved);assert.equal(g.save(),saved);};
const set=(g,id,x,y)=>{g.state.battle.grid.positions[id]={x,y};};
const skill=(shape='single',extra={})=>({name:'試験',mp:0,target:'enemy',effects:[{type:'damage',amount:1}],targeting:{aim:'cell',range:{min:0,max:5},area:{shape},trajectory:'indirect',friendlyFire:false,...extra}});
test('formation swap, free move, order, leave/join/swap preserve independent positions without resource/RNG changes',()=>{
 const {g}=game(),s=g.state,before=structuredClone(s),[a,b]=s.members,pa=s.partyFormation[a],pb=s.partyFormation[b];
 assert.deepEqual(pa,PARTY_CELLS[0]);assert.ok(g.dispatch({type:'party.formation.set',actor:a,...pb}));assert.deepEqual(s.partyFormation[b],pa);assert.deepEqual(s.members,before.members);
 assert.equal(s.rng,before.rng);assert.equal(s.steps,before.steps);assert.deepEqual(s.actors,before.actors);assert.deepEqual(s.inventory,before.inventory);
 assert.ok(g.dispatch({type:'party.formation.set',actor:a,x:0,y:1}));const f=structuredClone(s.partyFormation);assert.ok(g.dispatch({type:'party.order',group:'party',actor:a,direction:'down'}));assert.deepEqual(s.partyFormation,f);
 const reserve=g.data.game.tavern.candidates.find(id=>!s.members.includes(id));assert.ok(g.changeParty('swap',reserve,a));assert.deepEqual(s.partyFormation[reserve],f[a]);assert.equal(s.partyFormation[a],undefined);assert.deepEqual(s.partyFormation[b],f[b]);
 assert.ok(g.changeParty('leave',reserve));assert.equal(s.partyFormation[reserve],undefined);assert.ok(g.changeParty('join',reserve));roundtrip(g);
});
test('formation rejects out of range, unknown, dungeon and battle changes atomically',()=>{
 const {g}=game();for(const cmd of [{actor:'missing',x:0,y:0},{actor:'ada',x:5,y:0},{actor:'ada',x:1.5,y:0}]){const f=structuredClone(g.state.partyFormation);assert.equal(g.dispatch({type:'party.formation.set',...cmd}),false);assert.deepEqual(g.state.partyFormation,f);}
 g.teleport('region_2_f1',1,1);assert.equal(g.dispatch({type:'party.formation.set',actor:'ada',x:0,y:0}),false);start(g);assert.equal(g.dispatch({type:'party.formation.set',actor:'ada',x:0,y:0}),false);
});
test('same-version old saves fill missing formation, but present corruption and modes reject before loading',()=>{
 const {g}=game(),old=JSON.parse(g.save());delete old.state.partyFormation;delete old.state.battleModePreference;g.load(JSON.stringify(old));assert.deepEqual(g.state.partyFormation,nextFormation(g.state.members));
 for(const f of [null,{}, {ada:{x:0,y:0}},Object.fromEntries(g.state.members.map(id=>[id,{x:0,y:0}]))]){const bad=JSON.parse(g.save());bad.state.partyFormation=f;const before=g.save();assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
});
test('mode priority and missing classic defaults; preference applies at start and never reloads mode',()=>{
 for(const [event,encounter,pref,defaultMode,want] of [[undefined,undefined,undefined,undefined,'classic'],[undefined,undefined,'grid',undefined,'grid'],[undefined,'classic','grid','grid','classic'],['grid','classic','classic','classic','grid'],[undefined,undefined,'auto','grid','grid']]){
  const {g,d}=game();d.encounters.wild_pair_1.battleMode=encounter;g.state.battleModePreference=pref??'auto';d.game.battle={defaultMode};g.startBattle('wild_pair_1',{win:[],lose:[],escape:[]},{battleMode:event});assert.equal(g.state.battle.mode,want);roundtrip(g);
 }
});
test('start validates enemy positions before counters, RNG and battle state change',()=>{
 const {g,d}=game();for(const p of [[{x:0,y:0}],[{x:0,y:0},{x:0,y:0}],[{x:5,y:0},{x:0,y:0}]]){d.encounters.wild_pair_1.enemyPositions=p;const before=g.save();assert.throws(()=>start(g));assert.equal(g.save(),before);}
});
test('fronts and diagonals are adjacent; weapons distinguish bow minimum and spear maximum',()=>{
 const {g}=game(),b=start(g),a=g.state.actors.ada,e=b.enemies[0];assert.equal(distance({x:2,y:2},{x:1,y:3}),1);
 set(g,'actor:ada',2,3);set(g,'enemy:enemy_0',2,2);assert.equal(battleSkillPlan(g,'ada','attack',e.instance).ok,true);
 set(g,'enemy:enemy_0',2,0);assert.equal(battleSkillPlan(g,'ada','attack',e.instance).ok,false);
 a.equipment.weapon=Object.keys(g.data.items).find(id=>g.data.items[id].equipmentType==='bow');assert.deepEqual(targetingProfile(g.data,a,g.data.skills.attack,'attack').range,{min:2,max:5});
});
test('supercover blocks through units including corners; piercing, lob and indirect bypass them',()=>{
 const {g}=game();start(g);set(g,'actor:ada',2,3);set(g,'actor:nio',2,4);set(g,'enemy:enemy_0',2,0);set(g,'enemy:enemy_1',2,1);const a=g.state.actors.ada,sk=skill('single',{trajectory:'direct'});
 assert.equal(gridTargetPlan(g,a,sk,'test',{x:2,y:0}).ok,false);g.state.battle.enemies[1].hp=0;assert.equal(gridTargetPlan(g,a,sk,'test',{x:2,y:0}).ok,true);
 g.state.battle.enemies[1].hp=100;for(const t of ['piercing','lob','indirect']){sk.targeting.trajectory=t;assert.equal(gridTargetPlan(g,a,sk,'test',{x:2,y:0}).ok,true);}
 assert.deepEqual(rayCells({x:0,y:0},{x:1,y:1}),[{x:1,y:0},{x:0,y:1}]);
});
test('all nine area shapes enumerate unique board cells in stable row order',()=>{
 for(const shape of ['single','cross','radius','rectangle','line','cone','row','column','side_all']){const cells=areaCells({x:2,y:5},{x:2,y:2},{shape,radius:1,width:3,height:3,length:3});assert.ok(cells.length>0);assert.equal(new Set(cells.map(p=>`${p.x},${p.y}`)).size,cells.length);assert.deepEqual(cells,[...cells].sort((a,b)=>a.y-b.y||a.x-b.x));}
 assert.equal(areaCells({x:2,y:5},{x:2,y:2},{shape:'cross',radius:1}).length,5);assert.equal(areaCells({x:2,y:5},{x:2,y:2},{shape:'radius',radius:1}).length,9);
});
test('empty aim is legal with affected units; friendly fire, explicit maxAffected, cap and empty rejection',()=>{
 const {g}=game(),b=start(g),a=g.state.actors.ada;set(g,'actor:ada',2,3);set(g,'enemy:enemy_0',1,2);set(g,'enemy:enemy_1',3,2);
 const sk=skill('radius'),plan=gridTargetPlan(g,a,sk,'test',{x:2,y:2},{limit:2});assert.equal(plan.ok,true);assert.deepEqual(plan.targets,b.enemies);assert.equal(gridTargetPlan(g,a,sk,'test',{x:0,y:0}).ok,false);
 sk.targeting.friendlyFire=true;sk.targeting.maxAffected=10;const all=gridTargetPlan(g,a,sk,'test',{x:2,y:2},{limit:1});assert.ok(all.targets.includes(a));assert.ok(all.targets.includes(b.enemies[0]));
});
test('move consumes one mixed-queue slot, persists current positions and never rewrites formation',()=>{
 const {g}=game(),b=start(g),id=activeActor(g),before=structuredClone(g.state.partyFormation),a=g.state.actors[id],key='actor:'+id,from={...b.grid.positions[key]},rng=g.state.rng;
 const bad={x:from.x,y:from.y};assert.equal(g.dispatch({type:'battle',action:'move',to:bad}),false);assert.equal(g.state.rng,rng);assert.equal(activeActor(g),id);
 const to=[{x:0,y:3},{x:0,y:4},{x:1,y:4},{x:2,y:4},{x:4,y:5}].find(p=>gridMovePlan(g.state,a,p).ok);assert.ok(to);assert.ok(g.dispatch({type:'battle',action:'move',to}));assert.deepEqual(b.grid.positions[key],to);assert.ok(b.acted.includes(id));assert.deepEqual(g.state.partyFormation,before);roundtrip(g);
 g.finishBattle('escape');assert.deepEqual(g.state.partyFormation,before);
});
test('fixed mode has no movement, and death frees occupancy with deterministic revival fallback',()=>{
 const {g}=game(),b=start(g,{movement:'fixed'}),a=g.state.actors.ada;assert.equal(gridMovePlan(g.state,a,{x:2,y:4}).ok,false);
 b.grid.movement='step';set(g,'actor:ada',2,3);set(g,'actor:nio',2,4);g.state.actors.nio.hp=0;assert.equal(gridMovePlan(g.state,a,{x:2,y:4}).ok,true);set(g,'actor:ada',2,4);assert.notDeepEqual(revivePosition(g.state,g.state.actors.nio),{x:2,y:4});roundtrip(g);
});
test('grid save rejects forged individual keys, duplicate living positions, invalid movement and missing grid',()=>{
 const {g}=game();start(g);for(const mutate of [s=>delete s.battle.grid,s=>s.battle.grid.movement='teleport',s=>s.battle.grid.positions['actor:ada']={x:0,y:0},s=>s.battle.grid.positions['enemy:enemy_0']=s.battle.grid.positions['enemy:enemy_1'],s=>s.battle.grid.positions.unknown={x:0,y:0}]){const bad=JSON.parse(g.save());mutate(bad.state);assert.ok(validateSave(bad,g.data).length);assert.throws(()=>g.load(JSON.stringify(bad)));}
});
test('projection and invalid previews cost no state, RNG, MP or item; item range uses same planner',()=>{
 const {g}=game();start(g);const before=g.save();for(let i=0;i<4;i++)projectGame(g);assert.equal(g.save(),before);set(g,'actor:ada',0,5);set(g,'actor:nio',4,3);g.data.skills.potion.targeting.range.max=1;assert.equal(battleItemPlan(g,'ada','potion','actor:nio').ok,false);
});
test('every distributed skill and weapon has an audited profile; malformed dimensions, encounters and draw config fail',()=>{
 const {g,d}=game();for(const [id,s] of Object.entries(d.skills))assert.ok(id==='attack'||s.targeting,id);for(const type of d.jobProfile.equipmentTypes.weapon)assert.ok(d.game.battle.weaponRanges[type]);assert.deepEqual(gridDefinitionErrors(d),[]);d.presentation.battleGrid.enemyPresentation.rowScale=[1,-1,1];assert.ok(gridDefinitionErrors(d).length);
});
test('grid enemy AI walks into range, guards when fixed, and shares mixed queue / status actions',()=>{
 for(const movement of ['step','fixed']){const {g,d}=game();for(const id of d.encounters.wild_pair_1.enemies){d.enemies[id].ai=[{skill:'attack',priority:1,target:'weakest'}];d.enemies[id].stats.agi=999;}d.encounters.wild_pair_1.enemyPositions=[{x:2,y:0},{x:1,y:0}];const b=start(g,{movement});assert.equal(b.grid.positions['enemy:enemy_0'].y,movement==='step'?1:0);if(movement==='fixed')assert.ok(b.enemies[0].guard);roundtrip(g);}
});
test('start events with enemy preemption preserve grid coordinates across save and interruption',()=>{
 const {g,d}=game();d.scripts.grid_intro={commands:[{op:'battle.start',encounter:'wild_pair_1',battleMode:'grid',preemptive:{side:'enemies',actions:2},on_win:[],on_lose:[],on_escape:[],on_interrupt:[],events:[{id:'intro',triggers:['start'],commands:[{op:'narrate',text:'開始'}]}]}]};g.run('grid_intro');const positions=structuredClone(g.state.battle.grid.positions);roundtrip(g);assert.deepEqual(g.state.battle.grid.positions,positions);drain(g);assert.equal(g.state.battle.preemptive,undefined);roundtrip(g);
});

test('self targeting projects only the acting unit, while side-wide skills retain a single group choice',()=>{
 const {g}=game();start(g);const m=projectGame(g),guard=m.battle.skills.find(s=>s.id==='guard');assert.equal(guard.choices.length,1);assert.equal(guard.choices[0].id,'actor:'+m.battle.actorId);assert.deepEqual(guard.choices[0].targets,['actor:'+m.battle.actorId]);
});
test('grid confusion and berserk cannot strike outside the shared range, and misfire stays in its legal band',()=>{
 for(const status of ['confusion','berserk','misfire']){
  const {g,d}=game();g.changeJob('ada','warrior');g.state.members=['ada','nio'];g.state.partyFormation=nextFormation(g.state.members);const b=start(g);b.turnQueue=['actor:ada','actor:nio','enemy:enemy_0','enemy:enemy_1'];b.turnIndex=0;
  set(g,'actor:ada',0,3);set(g,'actor:nio',1,3);set(g,'enemy:enemy_0',0,2);set(g,'enemy:enemy_1',4,0);g.state.actors.ada.mp=100;applyStatus(d,g.state,g.state.actors.ada,status,undefined,3);g.random=()=>0;
  const far=b.enemies[1].hp;
  if(status==='misfire'){assert.ok(g.dispatch({type:'battle',action:'skill',skill:'power',target:'enemy_0'}));assert.ok(g.state.actors.nio.hp<g.stats('nio').hp);}
  else assert.ok(g.dispatch(status==='berserk'?{type:'battle',action:'wait'}:{type:'battle',action:'skill',skill:'guard'}));
  assert.equal(b.enemies[1].hp,far);assert.ok(b.acted.includes('ada'));
 }
});
test('grid cover needs adjacency both when selected and when the attack redirects',()=>{
 for(const adjacent of [true,false]){
  const {g}=game();g.changeJob('ada','knight');g.award(0,10000);const b=start(g),a=g.state.actors.ada,n=g.state.actors.nio;
  set(g,'actor:ada',2,3);set(g,'actor:nio',1,3);assert.ok(battleSkillPlan(g,'ada','cover','nio').ok);applySkill(g,a,n,g.data.skills.cover,'cover');
  if(!adjacent)set(g,'actor:ada',4,5);assert.equal(battleSkillPlan(g,'ada','cover','nio').ok,adjacent);
  set(g,'enemy:enemy_0',1,2);set(g,'enemy:enemy_1',3,0);b.enemies[0].ai=[{priority:1,skill:'attack',target:'weakest'}];b.enemies[0].stats.agi=999;n.hp=1;b.turnQueue=['actor:nio','enemy:enemy_0','actor:ada'];b.turnIndex=0;const before=a.hp;
  assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard'}));assert.equal(n.hp>0,adjacent);assert.equal(a.hp<before,adjacent);
 }
});
