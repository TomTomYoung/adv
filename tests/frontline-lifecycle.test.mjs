import test from 'node:test';
import assert from 'node:assert/strict';
import {data} from './helpers.mjs';
import {testerPreset,createTesterEngine,testerCurrentUnit} from '../src/application/battle-tester-model.js';
import {frontPosition,frontlineUnits,prepareFrontlineRound,frontlineMovePlan,moveFrontline,frontlineDefinitionErrors} from '../src/core/battle-frontline.js';
import {battleAlive,frontlineState,frontlineRows,knockbackFrontline,removeFrontline} from '../src/core/frontline-lifecycle.js';
import {battleSkillPlan,applySkill} from '../src/core/battle.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {skillDefinitionErrors} from '../src/core/job-validation.js';
import {frontlineTargetingErrors} from '../src/core/frontline-targeting.js';
const setup=(name='ranks',change=()=>{},options)=>{const c=testerPreset(data,name);change(c);return createTesterEngine(data,c,options);};
const round=g=>{const r=g.state.battle.round;for(let i=0;i<80&&g.state.battle?.round===r;i++)assert.ok(g.dispatch({type:'battle.step'}));};
const cast=(g,skill,target)=>g.dispatch({type:'battle',action:'skill',skill,target});
const roundtrip=g=>{const saved=g.save();assert.deepEqual(validateSave(JSON.parse(saved),g.data),[]);g.load(saved);assert.equal(g.save(),saved);};
const state=(g,key)=>frontlineState(g.state,frontlineUnits(g.state).find(u=>(u.instance?'enemy:'+u.instance:'actor:'+u.id)===key));

test('survivor destinations take priority; a full front displaces its body rearward before shrinking',()=>{
 const g=setup('body_retreat'),b=g.state.battle,f=b.frontline;
 assert.equal(f.rows,1);assert.equal(frontlineUnits(g.state).filter(u=>!u.instance&&frontlineState(g.state,u)==='down').length,4);
 const retreat=f.events.find(e=>e.type==='retreat'),advance=f.events.find(e=>e.type==='advance'&&e.side==='allies'),removed=f.events.find(e=>e.type==='removed'&&e.reason==='shrink'),shrink=f.events.find(e=>e.type==='shrink');
 assert.equal(retreat.moves.length,1);assert.equal(retreat.moves[0].to.depth,1);assert.ok(retreat.id<advance.id&&advance.id<removed.id&&removed.id<shrink.id);
 assert.equal(state(g,retreat.moves[0].unit),'removed');roundtrip(g);
});
test('two independent advance steps displace bodies, choosing nearest lane left on ties',()=>{
 const g=setup('rear_only',c=>{const ids=Object.keys(data.actors);c.allies=[{...c.allies[0],depth:2,lane:2},{...c.allies[0],id:ids[1],depth:1,lane:2,down:true},{...c.allies[0],id:ids[2],depth:0,lane:2,down:true}];});
 const f=g.state.battle.frontline,steps=f.events.filter(e=>e.type==='advance'&&e.side==='allies'),retreats=f.events.filter(e=>e.type==='retreat'&&e.side==='allies');
 assert.equal(steps.length,2);assert.deepEqual(retreats.map(e=>e.moves[0].to),[{depth:1,lane:1},{depth:0,lane:1}]);assert.equal(f.rows,1);roundtrip(g);
});
test('a living front still shrinks rear rows separately; four front bodies remain; revive does not expand',()=>{
 const g=setup('revive_expand'),f=g.state.battle.frontline,ids=g.state.members,source=g.state.actors[ids[0]],down=ids[1],removed=ids[5];
 assert.equal(f.rows,1);assert.equal(f.events.filter(e=>e.type==='advance'&&e.side==='allies').length,0);assert.equal(state(g,'actor:'+removed),'removed');
 assert.equal(frontlineMovePlan(g.state,source,{depth:2}).ok,false);const before=g.save();assert.equal(battleSkillPlan(g,source.id,'lab_revive','actor:'+removed).ok,false);assert.equal(g.save(),before);
 assert.ok(cast(g,'lab_revive','actor:'+down));assert.equal(f.rows,1);assert.equal(state(g,'actor:'+down),'alive');roundtrip(g);
 round(g);assert.ok(cast(g,'lab_corpse_mp','actor:'+ids[2]));assert.equal(state(g,'actor:'+ids[2]),'down');
 // Revival added a living member; the next round supplies its ordinary turn.
 assert.equal(testerCurrentUnit(g),'actor:'+down);assert.ok(g.dispatch({type:'battle',action:'move',to:{depth:2}}));assert.equal(g.state.battle.frontline.rows,3);
 assert.equal(state(g,'actor:'+removed),'removed');assert.equal(battleSkillPlan(g,down,'lab_revive','actor:'+removed).ok,false);roundtrip(g);
});
test('retreat requires another living ally; rejection spends no RNG, MP, slot or state',()=>{
 const g=setup('rear_only'),before=g.save();assert.equal(frontlineRows(g.state),1);
 for(const depth of [1,2]){assert.equal(g.dispatch({type:'battle',action:'move',to:{depth}}),false);assert.equal(g.state.battle.turnIndex,0);}
 // Rejection may set a user notice, but no battle or resource fields change.
 assert.deepEqual(g.state.battle,JSON.parse(before).state.battle);assert.equal(g.state.rng,JSON.parse(before).state.rng);
 assert.ok(frontlineMovePlan(g.state,g.state.battle.enemies[0],{depth:2}).ok);
});
test('current ally edge collides in two rows; voluntary expansion allows rear arrival without collision',()=>{
 const g=setup('two_rows'),u=g.state.actors[g.state.members[1]],f=g.state.battle.frontline;assert.equal(f.rows,2);
 const hp=u.hp;assert.equal(knockbackFrontline(g,u,{distance:1,collisionDamage:25}),25);assert.equal(u.hp,hp-25);assert.equal(frontPosition(g.state,u).depth,1);assert.equal(f.rows,2);
 moveFrontline(g,u,frontlineMovePlan(g.state,u,{depth:2}).to);assert.equal(f.rows,3);moveFrontline(g,u,frontlineMovePlan(g.state,u,{depth:1}).to);
 assert.equal(knockbackFrontline(g,u,{distance:1,collisionDamage:25}),0);assert.equal(frontPosition(g.state,u).depth,2);assert.equal(f.rows,3);roundtrip(g);
});
test('knockback collides with bodies or objects, never displacing or damaging the blocker',()=>{
 for(const kind of ['body','object']){const g=setup('ranks',c=>{c.enemies=c.enemies.slice(0,2);c.enemies[0].lane=0;c.enemies[1].lane=kind==='body'?0:4;c.enemies[1].depth=1;c.enemies[1].remain=true;c.enemies[1].down=kind==='body';if(kind==='object')c.objects=[{id:'rock',side:'enemies',depth:1,lane:0}];});
 const [u,other]=g.state.battle.enemies,old={...frontPosition(g.state,other)},hp=other.hp;
 assert.equal(knockbackFrontline(g,u,{distance:2,collisionDamage:25}),25);assert.equal(frontPosition(g.state,u).depth,0);assert.deepEqual(frontPosition(g.state,other),old);assert.equal(other.hp,hp);
 assert.equal(g.state.battle.frontline.events.at(-1).collision.kind,kind==='body'?'unit':'object');roundtrip(g);}
});
test('enemy edge stays at three rows; reaching the rear is safe, pushing beyond it collides once',()=>{
 const g=setup('rear_only'),u=g.state.battle.enemies[0];assert.equal(knockbackFrontline(g,u,{distance:2,collisionDamage:25}),0);assert.equal(frontPosition(g.state,u).depth,2);
 assert.equal(knockbackFrontline(g,u,{distance:3,collisionDamage:25}),25);assert.equal(frontlineRows(g.state,true),3);
});
test('normal enemies are removed; designated enemies remain, retreat for survivors, and can be removed by a skill',()=>{
 const g=setup('zombies'),f=g.state.battle.frontline;assert.equal(state(g,'enemy:enemy_0'),'down');assert.equal(frontlineRows(g.state,true),3);assert.equal(frontPosition(g.state,g.state.battle.enemies[0]).lane,1);
 assert.ok(cast(g,'lab_remove','enemy:enemy_0'));assert.equal(state(g,'enemy:enemy_0'),'removed');assert.equal(g.state.battle.enemies[0].hp,0);roundtrip(g);
 const normal=setup();normal.data.skills.lab_strike.effects=[{type:'damage',amount:9999}];assert.ok(cast(normal,'lab_strike','enemy:enemy_0'));assert.equal(state(normal,'enemy:enemy_0'),'removed');assert.equal(normal.state.battle.frontline.removed['enemy:enemy_0'],'defeated');roundtrip(normal);
 assert.ok(f.events.some(e=>e.type==='retreat'&&e.side==='enemies'));
});
test('only down zombies remaining wins immediately, with no cleanup turn',()=>{
 const g=setup('ranks',c=>{c.enemies=c.enemies.slice(0,2);c.enemies.forEach(u=>u.remain=true);c.profile.area.shape='row';});
 const b=g.state.battle;g.data.skills.lab_strike.effects=[{type:'damage',amount:9999}];assert.ok(cast(g,'lab_strike','enemy:enemy_0'));assert.equal(g.state.battle,null);assert.ok(g.state.battleResult);assert.equal(b.round,1);assert.deepEqual(b.enemies.map(e=>e.hp),[0,0]);assert.deepEqual(b.frontline.removed,{});
});
test('direct removal preserves HP but removes turns, targeting, occupation and victory participation',()=>{
 const g=setup('ranks'),a=g.state.actors[g.state.members[1]],hp=a.hp;assert.ok(cast(g,'lab_exile','actor:'+a.id));assert.equal(a.hp,hp);assert.equal(state(g,'actor:'+a.id),'removed');assert.notEqual(testerCurrentUnit(g),'actor:'+a.id);assert.equal(battleSkillPlan(g,a.id,'guard','actor:'+a.id).ok,false);roundtrip(g);
 const b=g.state.battle;g.data.skills.lab_remove.frontlineTargeting.area.shape='side_all';g.data.skills.lab_remove.frontlineTargeting.maxAffected=30;round(g);assert.ok(cast(g,'lab_remove','enemy:enemy_0'));assert.equal(g.state.battle,null);assert.ok(g.state.battleResult);assert.ok(b.enemies.every(e=>e.hp>0));assert.equal(a.hp,hp);
 assert.ok(!g.state.battleResult.levels.some(row=>row.actor===a.id));
});
test('enemy direct removal of final ally ends battle without a living-HP scheduling loop',()=>{
 const g=setup('rear_only');g.state.battle.enemies[0].ai=[{skill:'lab_remove',priority:1,target:'weakest'}];assert.ok(g.dispatch({type:'battle.step'}));assert.ok(g.dispatch({type:'battle.step'}));assert.equal(g.state.battle,null);assert.equal(g.state.records.losses,1);
});
test('sequential revival and down-only non-removal effects respect target state',()=>{
 const g=setup('revive_expand'),id=g.state.members[1];g.data.skills.lab_revive.frontlineTargeting.resolution='sequential';assert.ok(cast(g,'lab_revive','actor:'+id));assert.ok(g.state.actors[id].hp>0);assert.equal(g.state.battle.frontline.rows,1);
 assert.equal(battleSkillPlan(g,g.state.members[0],'lab_revive','actor:'+id).ok,false);
});
test('state and row projections are read-only and retain removed bodies after expansion',()=>{
 const g=setup('revive_expand'),before=g.save(),m=projectGame(g);assert.equal(m.battle.frontline.rows,1);assert.equal(m.battle.frontline.units.filter(u=>u.state==='removed').length,1);assert.equal(g.save(),before);
});
test('lifecycle save fields reject corrupt rows, overlaps, removal identities and objects atomically',()=>{
 const g=setup('revive_expand');for(const mutate of [f=>f.rows=0,f=>f.removed.unknown='skill',f=>f.removed['actor:'+g.state.members[0]]='defeated',f=>f.objects=[{id:'x',side:'allies',depth:3,lane:0}],f=>f.positions['actor:'+g.state.members[1]]=f.positions['actor:'+g.state.members[0]]]){
 const save=JSON.parse(g.save());mutate(save.state.battle.frontline);const before=g.save();assert.throws(()=>g.load(JSON.stringify(save)));assert.equal(g.save(),before);}
});
test('old same-version Frontline save gains lifecycle without replay, moving only an overlapping body',()=>{
 const g=setup('ranks'),save=JSON.parse(g.save()),f=save.state.battle.frontline;delete f.rows;delete f.removed;delete f.objects;
 const [a,b]=save.state.members;save.state.actors[b].hp=0;f.positions['actor:'+b]={...f.positions['actor:'+a]};const serial=f.eventSerial,queue=structuredClone(save.state.battle.turnQueue);g.load(JSON.stringify(save));assert.equal(g.state.battle.frontline.rows,3);assert.equal(g.state.battle.frontline.eventSerial,serial);assert.deepEqual(g.state.battle.turnQueue,queue);assert.notDeepEqual(frontPosition(g.state,g.state.actors[a]),frontPosition(g.state,g.state.actors[b]));roundtrip(g);
});
test('new effect and definition validation rejects ambiguous or invalid targeting and collision values',()=>{
 const g=setup();assert.deepEqual(skillDefinitionErrors(g.data,g.data.skills.lab_push),[]);assert.ok(skillDefinitionErrors(g.data,{...g.data.skills.lab_push,effects:[{type:'frontline_knockback',distance:0,collisionDamage:25}]}).length);
 assert.ok(frontlineTargetingErrors({...g.data.skills.lab_remove.frontlineTargeting,targetStates:['removed']}).length);assert.ok(frontlineDefinitionErrors({...g.data,enemies:{bad:{frontlineDefeat:'zombie'}}}).length);
});
test('both tester engines share initial bodies, removal and shrink results before automatic turns',()=>{
 for(const preset of ['body_retreat','revive_expand','zombies']){const manual=setup(preset),normal=setup(preset,()=>{},{manualTurns:false});assert.deepEqual(projectGame(manual).battle.frontline.units,projectGame(normal).battle.frontline.units);assert.equal(frontlineRows(manual.state),frontlineRows(normal.state));roundtrip(normal);}
});
