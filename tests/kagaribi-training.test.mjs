import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,goTownLocation} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {skillPurchasePlan} from '../src/core/expedition.js';
import {activeActor,battleSkillPlan,applySkill} from '../src/core/battle.js';
import {addBuff,tickBuffs} from '../src/core/buffs.js';
import {frontlineState} from '../src/core/frontline-lifecycle.js';
import {validateSave} from '../src/core/save.js';
import {effectiveSkill} from '../src/core/skill-levels.js';
import {campaignGridMove} from '../tools/measure-kagaribi-campaign.mjs';

const roundtrip=g=>{const saved=g.save();assert.deepEqual(validateSave(JSON.parse(saved),g.data),[]);g.load(saved);assert.equal(g.save(),saved);};
const buy=(g,actor,skill,level=1)=>g.dispatch({type:'skill.buy',actor,skill,level});
function shop(){
 const g=newGame();g.data=structuredClone(data);delete g.data.quests.q001.story;g.accept('q001');g.complete('q001','informed');drain(g);
 g.give('rope',5);
 for(const id of ['kagaribi_manifold','kagaribi_crossroads'])repair(g,id);
 assert.ok(g.returnTown());goTownLocation(g,g.data.expedition.skillShopLocation);g.state.expedition.gems=10000;
 for(const [actor,item] of [['ada','iron_sword'],['sera','staff']]){g.give(item,1);assert.ok(g.dispatch({type:'equip',actor,item}));}
 return g;
}
function repair(g,id){const c=g.data.expedition.camps.find(c=>c.id===id);g.teleport(c.map,c.x,c.y,c.facing);assert.ok(g.dispatch({type:'expedition.action',action:'repair',camp:id}));}
const town=g=>{assert.ok(g.returnTown());goTownLocation(g,g.data.expedition.skillShopLocation);};
function start(g,mode='classic'){
 g.state.battleModePreference=mode;
 // Controlled combat fixture: enough HP for repeated hits, guard-only opponent.
 for(const id of ['kagaribi_ossuary_remnant','kagaribi_kiln_golem']){g.data.enemies[id].stats.hp=2000;g.data.enemies[id].ai=[{skill:'guard',priority:1,target:'self'}];}
 g.startBattle('kagaribi_ossuary_deep_pair',{win:[],lose:[],escape:[]},{manualTurns:true});
 if(mode==='grid'){g.state.battle.grid.positions['actor:ada']={x:2,y:3};g.state.battle.grid.positions['enemy:enemy_0']={x:2,y:2};}
}
function turn(g,id){for(let n=0;activeActor(g)!==id;n++){assert.ok(n<60);assert.ok(g.dispatch({type:'battle.step'}));}}
const cast=(g,skill,target)=>g.dispatch({type:'battle',action:'skill',skill,target});
function unlock(g){repair(g,'kagaribi_ossuary');(g.state.flags.kagaribi??={}).altarGuardianWon=true;repair(g,'kagaribi_central');town(g);}

test('4F/9F/10F instruction gates, personal prices and levels survive reload without revoking old shelves',()=>{
 const g=shop();assert.ok(buy(g,'ada','exp_second_breath'));
 assert.equal(skillPurchasePlan(g.data,g.state,'sera','exp_purging_pursuit',1).ok,false);
 assert.match(skillPurchasePlan(g.data,g.state,'sera','exp_purging_pursuit',1).reason,/9F/);
 assert.ok(buy(g,'ada','exp_row_sweep'));unlock(g);
 assert.ok(buy(g,'sera','exp_purging_pursuit'));assert.equal(buy(g,'sera','exp_purging_pursuit',2),false);
 for(const level of [2,3])assert.ok(buy(g,'ada','exp_second_breath',level));
 assert.equal(effectiveSkill(g.data,g.state,'ada','exp_second_breath').mp,4);
 assert.ok(g.dispatch({type:'job.change',actor:'ada',job:'knight'}));
 assert.equal(g.skills('ada').includes('exp_second_breath'),false);
 for(const level of [1,2,3])assert.ok(buy(g,'ada','exp_parry_command',level));
 const skill=effectiveSkill(g.data,g.state,'ada','exp_parry_command');assert.equal(skill.maxTargets,3);assert.equal(skill.effects[0].buff,'exp_parry70');
 assert.equal(g.state.expedition.gems,10000+24+30-840-120-160-1260);roundtrip(g);
 assert.equal(buy(g,'ada','exp_parry_command',3),false);
});
for(const mode of ['classic','grid','frontline'])test(`${mode}: breath guards without healing, strengthens the next action once, and saves mid-buff`,()=>{
 const g=shop();assert.ok(buy(g,'ada','exp_second_breath'));start(g,mode);turn(g,'ada');
 const a=g.state.actors.ada;a.hp-=3;const hp=a.hp,mp=a.mp;
 assert.ok(cast(g,'exp_second_breath'));assert.equal(a.hp,hp);assert.equal(a.mp,mp-5);assert.ok(g.state.battle.guards.includes('ada'));
 turn(g,'ada');roundtrip(g);const saved=g.save(),base=new GameEngine(g.data);base.load(saved);base.state.battle.buffs=[];
 const before=g.state.battle.enemies[0].hp;assert.ok(cast(base,'attack','enemy_0'));assert.ok(cast(g,'attack','enemy_0'));
 const normal=before-base.state.battle.enemies[0].hp,boost=before-g.state.battle.enemies[0].hp;
 assert.ok(normal>0);assert.ok(boost>=normal*1.2-1&&boost<=normal*1.2+1,`${normal} -> ${boost}`);
 assert.equal(g.state.battle.buffs.some(b=>b.target==='actor:ada'),false);roundtrip(g);
});
test('breath persists across rounds until the next action, but guard consumes it; invalid selection does not',()=>{
 const g=shop();buy(g,'ada','exp_second_breath');start(g);turn(g,'ada');cast(g,'exp_second_breath');turn(g,'ada');
 for(let i=0;i<5;i++)tickBuffs(g.state.battle,g.data);assert.equal(g.state.battle.buffs.length,1);
 assert.equal(cast(g,'attack','missing'),false);assert.equal(g.state.battle.buffs.length,1);
 assert.ok(cast(g,'guard'));assert.equal(g.state.battle.buffs.length,0);
});
for(const mode of ['classic','grid','frontline'])test(`${mode}: parry grants separate single-hit wards, ignores magic, expires after two rounds`,()=>{
 const g=shop();unlock(g);assert.ok(g.dispatch({type:'job.change',actor:'ada',job:'knight'}));buy(g,'ada','exp_parry_command');start(g,mode);turn(g,'ada');
 assert.ok(cast(g,'exp_parry_command'));roundtrip(g);
 const b=g.state.battle,source=b.enemies[0],target=g.state.actors.ada,other=g.state.actors.nio;
 const hit=element=>applySkill(g,source,target,{name:'試験',effects:[{type:'damage',amount:10,element}]},'attack',true,null,false);
 assert.equal(b.buffs.length,2);hit('fire');assert.equal(b.buffs.length,2);
 const first=hit('physical'),second=hit('physical');assert.equal(first,Math.floor(second*.8));
 assert.equal(b.buffs.length,1);assert.equal(b.buffs[0].target,'actor:nio');
 tickBuffs(b,g.data);tickBuffs(b,g.data);assert.equal(b.buffs.length,0);assert.ok(other.hp>0);roundtrip(g);
});
test('parry keeps only the strongest reduction per hit, does not spend on complete guard, and protects only one hit in a series',()=>{
 const g=shop();unlock(g);g.dispatch({type:'job.change',actor:'ada',job:'knight'});for(const n of [1,2,3])buy(g,'ada','exp_parry_command',n);start(g);
 const a=g.state.actors.ada,b=g.state.battle,e=b.enemies[0];addBuff(g,'exp_parry80',a,a,'exp_parry_command');addBuff(g,'exp_parry70',a,a,'exp_parry_command');
 b.guards=['ada'];b.guardLevels={'actor:ada':3};
 assert.equal(applySkill(g,e,a,{name:'試験',effects:[{type:'damage',amount:10,element:'physical'}]},'attack',true,null,false),0);assert.equal(b.buffs.length,2);
 b.guards=[];delete b.guardLevels;
 assert.equal(applySkill(g,e,a,{name:'連撃',effects:[{type:'damage',amount:10,element:'physical'},{type:'damage',amount:10,element:'physical'}]},'attack',true,null,false),15);assert.equal(b.buffs.length,0);
});
for(const mode of ['classic','grid','frontline'])test(`${mode}: pursuit damages living foes; only retained undead enemies can be purged`,()=>{
 const g=shop();unlock(g);buy(g,'sera','exp_purging_pursuit');start(g,mode);turn(g,'sera');
 const b=g.state.battle,e=b.enemies[0],hp=e.hp,mp=g.state.actors.sera.mp;assert.ok(cast(g,'exp_purging_pursuit','enemy_0'));assert.ok(e.hp<hp&&e.hp>0);assert.equal(g.state.actors.sera.mp,mp-7);
 if(mode!=='frontline')return;
 e.hp=0;turn(g,'sera');roundtrip(g);const corpse=g.state.battle.enemies[0];assert.equal(frontlineState(g.state,corpse),'down');
 assert.ok(battleSkillPlan(g,'sera','exp_purging_pursuit','enemy_0').ok);assert.ok(cast(g,'exp_purging_pursuit','enemy_0'));assert.equal(frontlineState(g.state,corpse),'removed');roundtrip(g);
 const ally=g.state.actors.ada;ally.hp=0;applySkill(g,g.state.actors.sera,ally,g.data.skills.exp_purging_pursuit,'exp_purging_pursuit');assert.notEqual(frontlineState(g.state,ally),'removed');
});
test('pursuit refuses down non-undead targets even with a retained-body profile',()=>{
 const g=shop();unlock(g);buy(g,'sera','exp_purging_pursuit');start(g,'frontline');const e=g.state.battle.enemies[0];e.hp=0;delete g.data.enemies[e.id].undead;
 assert.equal(battleSkillPlan(g,'sera','exp_purging_pursuit','enemy_0').ok,false);
 applySkill(g,g.state.actors.sera,e,g.data.skills.exp_purging_pursuit,'exp_purging_pursuit');assert.equal(frontlineState(g.state,e),'down');
});
test('campaign Grid policy finds a legal sideways route without mutating the game',()=>{
 const g=shop();start(g,'grid');const b=g.state.battle,a=g.state.actors.ada;
 b.grid.positions['actor:ada']={x:0,y:3};b.grid.positions['actor:nio']={x:1,y:3};b.grid.positions['actor:sera']={x:0,y:5};b.grid.positions['actor:il']={x:4,y:5};b.grid.positions['enemy:enemy_0']={x:2,y:2};b.grid.positions['enemy:enemy_1']={x:4,y:0};a.mp=0;
 const before=g.save(),to=campaignGridMove(g,a);assert.ok(to);assert.equal(g.save(),before);assert.equal(to.y,4);
});
