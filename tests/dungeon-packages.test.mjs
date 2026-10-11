import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {compileCellPackages,compileTrap,compileTreasure,compileServiceLocations} from '../src/core/dungeon-packages.js';
import {cellEventKey} from '../src/core/cell-layers.js';
import {processFieldEvents} from '../src/core/field-events.js';
import {occurrenceValid} from '../src/core/event-occurrence.js';
import {applyImpact} from '../src/core/hazard-effects.js';
import {applyStatus,removeStatus} from '../src/core/status-effects.js';
import {applyMapPatch} from '../src/core/map-mutations.js';
import {fireContext,fireEnvironment,fireSkillPlan} from '../src/core/systems/fire-network.js';
import {dungeonCell,dungeonTile} from '../src/core/dungeons.js';
import {commandTargets} from '../src/core/player-commands.js';
import {validateSave} from '../src/core/save.js';
import {validateContent} from '../src/core/validation.js';
import {projectGame} from '../src/application/projection.js';
import {treasurePlan,treasureKey} from '../src/core/treasures.js';
import {validateSchema} from '../config/shared/schema.js';
import {battleSkillPlan} from '../src/core/battle.js';
const roundtrip=g=>{const text=g.save();assert.deepEqual(validateSave(JSON.parse(text),g.data),[]);g.load(text);assert.equal(g.save(),text);};
function game(map='region_2_f1'){
 const d=structuredClone(data),g=new GameEngine(d);drain(g);
 for(const m of Object.values(d.maps)){m.encounterRate=0;m.objects=m.objects.filter(o=>!o.quest);}
 g.teleport(map,1,1,'east');g.random=()=>.999999;
 if(map==='kagaribi_f1')d.dungeons.kagaribi.systems[fireContext(d,g.state).id].threat.encounterRate=0;
 return {g,d,m:d.maps[map]};
}
function event(ctx,id,policy,commands=[{op:'add',target:'vars.hits',value:1}],x=2){
 const {d,m}=ctx;d.cellEvents[id]={trigger:'enter',script:`test.${id}`,occurrence:policy};d.scripts[`test.${id}`]={commands};
 m.cells.overrides[`${x},1`]={events:[...(m.cells.overrides[`${x},1`]?.events??[]),id]};
}
const move=(g,direction='forward')=>assert.equal(g.dispatch({type:'move',direction}),true);
const policy=(chance=1,maxCount=null,reset='never')=>({chance,maxCount,reset});
const emptyImpact=(extra={})=>({target:'party',damage:0,statuses:[],patches:[],extinguish:[],...extra});
for(const chance of [1,.5])for(const limit of [null,2])test(`entry occurrence ${chance}/${limit} counts successes per placement, including save/load`,()=>{
 const c=game(),{g,m}=c;event(c,'counted',policy(chance,limit));let rolls=0;g.random=()=>{rolls++;return .2;};
 for(let n=0;n<3;n++){move(g);roundtrip(g);move(g,'back');}
 assert.equal(g.state.vars.hits,limit??3);assert.equal(g.state.events[cellEventKey(m.id,2,1,'counted')],limit??3);
 assert.equal(rolls,chance===1?0:(limit??3));
});
test('a missed roll is not retried by turning, commands, resume or another event in the same entry',()=>{
 const c=game(),{g,m}=c;event(c,'miss',policy(.5,2));event(c,'dialog',policy(),[{op:'narrate',text:'同じセル'}]);
 let rolls=0;g.random=()=>{rolls++;return .8;};move(g);roundtrip(g);drain(g);move(g,'right');move(g,'left');
 assert.equal(rolls,1);assert.equal(g.state.events[cellEventKey(m.id,2,1,'miss')],undefined);
 g.random=()=>.2;move(g,'back');move(g);drain(g);assert.equal(g.state.vars.hits,1);
 event(c,'miss',policy(.5,2),undefined,3);move(g);assert.equal(g.state.vars.hits,2);
});
test('recurrence resets only by the configured dungeon reentry or manual rearm',()=>{
 const c=game(),{g,d,m}=c;event(c,'run',policy(1,1,'reentry'));event(c,'permanent',policy(1,1));event(c,'repair',policy(1,1,'manual'));
 move(g);g.teleport(m.id,1,1,'east');move(g);assert.equal(g.state.vars.hits,3);
 g.returnTown();g.teleport(m.id,1,1,'east');move(g);assert.equal(g.state.vars.hits,4);
 d.scripts.rearm={commands:[{op:'cell.event.reset',map:m.id,x:2,y:1,event:'repair'}]};g.run('rearm');processFieldEvents(g);assert.equal(g.state.vars.hits,4);
 move(g,'back');move(g);assert.equal(g.state.vars.hits,5);roundtrip(g);
});
test('all nine trap presets compile to existing VM commands and apply their distinct effects',()=>{
 const c=game(),{g,d,m}=c;const definitions={
 rockfall:{damage:2,target:'leader'},cave_in:{damage:2,patches:[{map:m.id,edge:'v:4,1',preset:'stone_partition'}]},needle:{},arrow:{damage:2},gas:{},magic_circle:{},pit:{destination:{map:m.id,x:4,y:1}},explosion:{damage:2,patches:[{map:m.id,edge:'v:4,1',preset:'open_passage'}]},drip:{}};
 for(const [kind,options] of Object.entries(definitions)){
  g.healAll();const hp=g.state.actors.ada.hp;d.scripts[`trap.${kind}`]={commands:compileTrap({kind,...options,message:false})};g.run(`trap.${kind}`);
  if(['rockfall','cave_in','arrow','explosion'].includes(kind))assert.ok(g.state.actors.ada.hp<hp);
  if(kind==='rockfall')assert.equal(g.state.actors[g.state.members[1]].hp,g.stats(g.state.members[1]).hp);
  if(['needle','arrow','gas','magic_circle'].includes(kind))assert.ok(g.state.actors.ada.statuses.length);
  if(kind==='pit')assert.equal(g.state.location.x,4);
  if(kind==='drip')assert.equal(g.state.light,0);
  roundtrip(g);
 }
});
test('landslides and explosions change collision, rendering, light and persisted shared boundaries together',()=>{
 const {g,d,m}=game();applyMapPatch(g,{map:m.id,edge:'v:2,1',preset:'stone_partition'});
 assert.equal(g.dispatch({type:'move',direction:'forward'}),false);let view=projectGame(g).dungeon;
 assert.equal(view.cells[1][2].illumination,0);roundtrip(g);g.returnTown();g.teleport(m.id,1,1,'east');assert.equal(g.dispatch({type:'move',direction:'forward'}),false);
 applyImpact(g,emptyImpact({patches:[{map:m.id,edge:'v:2,1',preset:'open_passage'}]}));move(g);
 applyMapPatch(g,{map:m.id,x:4,y:1,preset:'stone_wall'});assert.equal(dungeonTile(d,g.state,m,4,1),'#');assert.equal(dungeonCell(d,g.state,m,4,1).visual.opaque,true);
 assert.equal(applyMapPatch(g,{map:m.id,x:2,y:1,preset:'stone_wall'}),false);roundtrip(g);
 applyMapPatch(g,{map:m.id,x:4,y:1,preset:'stone_floor'});assert.equal(g.walkable(m,4,1),true);
});
test('two pits cannot recurse indefinitely; landing events resume once after a save',()=>{
 const c=game(),{g,d,m}=c;
 event(c,'pit_a',policy(),compileTrap({kind:'pit',destination:{map:m.id,x:3,y:1,facing:'east'},message:false}));
 event(c,'pit_b',policy(),compileTrap({kind:'pit',destination:{map:m.id,x:2,y:1,facing:'east'},message:false}),3);
 event(c,'after',policy(),[{op:'narrate',text:'到着後'},{op:'add',target:'vars.arrival',value:1}]);
 move(g);assert.equal(g.state.location.x,2);assert.equal(g.state.waiting.text,'到着後');roundtrip(g);drain(g);
 assert.equal(g.state.vars.arrival,1);assert.equal(g.state.events[cellEventKey(m.id,2,1,'pit_a')],1);assert.equal(g.state.events[cellEventKey(m.id,3,1,'pit_b')],1);
 move(g,'back');move(g);drain(g);assert.equal(g.state.vars.arrival,2);
});
test('magic-circle battle and its landing continuation survive save without repeating the encounter',()=>{
 const c=game(),{g,d}=c;event(c,'magic',policy(1,1),compileTrap({kind:'magic_circle',encounter:'kuragari_hunt',message:'魔法陣を抜けた。'}));
 move(g);assert.equal(g.state.battle.encounter,'kuragari_hunt');roundtrip(g);g.finishBattle('escape');drain(g);assert.equal(g.state.records.battles,1);
});
test('parameter and magical statuses modify shared stats, refresh without stacking and expire in either clock',()=>{
 const {g,d}=game(),a=g.state.actors.ada,base=g.stats('ada');applyStatus(d,g.state,a,'weakened',{steps:3,turns:2});
 assert.equal(g.stats('ada').str,Math.max(1,Math.floor(base.str*.75)));applyStatus(d,g.state,a,'weakened',{steps:2,turns:1});assert.deepEqual(a.statusDurations.weakened,{steps:3,turns:2});roundtrip(g);
 move(g);move(g,'back');move(g);assert.ok(!g.state.actors.ada.statuses.includes('weakened'));assert.equal(g.stats('ada').str,base.str);
 applyStatus(d,g.state,g.state.actors.ada,'arcane_malaise');g.healAll();assert.equal(g.state.actors.ada.statusDurations,undefined);roundtrip(g);
});
test('status immunity, fallen actors and cleanse use the same status rules as battle',()=>{
 const {g,d}=game();d.actors.ada.statusImmune=['weakened'];const b=g.state.actors[g.state.members[1]];b.hp=0;
 applyImpact(g,emptyImpact({statuses:[{status:'weakened'}]}));assert.ok(!g.state.actors.ada.statuses.includes('weakened'));assert.ok(!b.statuses.includes('weakened'));
 applyStatus(d,g.state,g.state.actors.ada,'arcane_malaise');removeStatus(g.state.actors.ada,'arcane_malaise');roundtrip(g);
});
function leak(c,kind,points=[{map:c.m.id,x:1,y:1}]){c.d.dungeons.kagaribi.hazards=[{id:'broken_pipe',name:'破損した配管',kind,points,condition:{op:'ne',left:{ref:'flags.pipeFixed'},right:true},...(kind==='gas_leak'?{explosion:{damage:4,patches:[]}}:{})}];}
test('drips extinguish both portable and selected fixed fires; water blocks every ignition path until repaired',()=>{
 const c=game('kagaribi_f1'),{g,d}=c,ctx=fireContext(d,g.state),fixture=ctx.spec.fixtures[0];
 applyImpact(g,emptyImpact({extinguish:['portable',fixture.id]}));assert.equal(ctx.run.portable.lit,false);assert.equal(ctx.persistent.fixtures[fixture.id].lit,false);
 leak(c,'water_leak');const fuel=g.state.inventory[ctx.spec.fuelItem],action={type:'dungeon.action',system:ctx.id,target:'portable',action:'ignite'};
 assert.equal(g.dispatch(action),false);assert.equal(g.state.inventory[ctx.spec.fuelItem],fuel);g.setPortableFire({fuel:10,effect:ctx.spec.portable.baseEffect});assert.equal(ctx.run.portable.lit,false);
 roundtrip(g);g.state.flags.pipeFixed=true;assert.ok(g.dispatch(action));assert.equal(fireContext(d,g.state).run.portable.lit,true);
 g.returnTown();assert.ok(g.dispatch({type:'job.change',actor:'ada',job:'lantern_keeper'}));g.teleport(c.m.id,1,1);g.state.members=['ada'];g.state.flags.pipeFixed=false;
 g.startBattle('kuragari_hunt',{win:[],lose:[],escape:[]});const mp=g.state.actors.ada.mp;
 assert.match(battleSkillPlan(g,'ada','repel_kuragari','ada').reason,/漏水/);assert.equal(g.dispatch({type:'battle',action:'skill',skill:'repel_kuragari',target:'ada'}),false);assert.equal(g.state.actors.ada.mp,mp);assert.deepEqual(g.state.battle.acted,[]);roundtrip(g);
});
test('gas explosions use the shared explosion impact, spend the ignition cost, and persist until the cause is fixed',()=>{
 const c=game('kagaribi_f1'),{g,d}=c;leak(c,'gas_leak');const ctx=fireContext(d,g.state);applyImpact(g,emptyImpact({extinguish:['portable']}));
 const hp=g.state.actors.ada.hp,fuel=g.state.inventory[ctx.spec.fuelItem],action={type:'dungeon.action',system:ctx.id,target:'portable',action:'ignite'};
 assert.ok(g.dispatch(action));assert.equal(g.state.actors.ada.hp,hp-4);assert.equal(ctx.run.portable.lit,false);assert.equal(g.state.inventory[ctx.spec.fuelItem],fuel-1);roundtrip(g);
 g.state.flags.pipeFixed=true;g.give(ctx.spec.fuelItem,1);assert.ok(g.dispatch(action));assert.equal(fireContext(d,g.state).run.portable.lit,true);
});
test('bringing an existing flame into gas or water does not ignite or extinguish it',()=>{
 const c=game('kagaribi_f1'),{g,d}=c;leak(c,'gas_leak',[{map:c.m.id,x:2,y:1}]);const hp=g.state.actors.ada.hp;move(g);assert.equal(g.state.actors.ada.hp,hp);assert.equal(fireContext(d,g.state).run.portable.lit,true);
 c.d.dungeons.kagaribi.hazards[0].kind='water_leak';delete c.d.dungeons.kagaribi.hazards[0].explosion;move(g,'back');move(g);assert.equal(fireContext(d,g.state).run.portable.lit,true);
});
test('fire protection obeys mutated cell walls and shared opaque edges',()=>{
 const {g,d,m}=game('kagaribi_f1'),ctx=fireContext(d,g.state);applyImpact(g,emptyImpact({extinguish:['portable']}));
 g.teleport(m.id,2,1,'east');assert.ok(fireEnvironment(ctx).protected);
 applyMapPatch(g,{map:m.id,edge:'v:2,1',preset:'stone_partition'});assert.equal(fireEnvironment(ctx).protected,false);
 applyMapPatch(g,{map:m.id,edge:'v:2,1',preset:'open_passage'});assert.equal(fireEnvironment(ctx).protected,true);
});
function addTreasure(c,kind='chest',extra={}){
 const {g,d,m}=c,o={id:'cache_test',name:'試験の取得対象',kind:'chest',x:1,y:1,trigger:'interact',once:false,treasure:{kind,rewards:{gold:3,items:{rope:1}},uses:1,reset:'never',afterText:'空になった。',...extra}};
 const compiled=compileTreasure(m.id,o);o.script=compiled.script;d.scripts[o.script]={commands:compiled.commands};m.objects.push(o);return o;
}
for(const kind of ['chest','remains','bookshelf','pot','harvest'])test(`${kind} shares reward, capacity, count and completed inspection`,()=>{
 const c=game(),{g,d,m}=c,o=addTreasure(c,kind),gold=g.state.gold,n=g.state.inventory.rope??0;
 assert.ok(g.trigger('interact',o.id));roundtrip(g);drain(g);assert.equal(g.state.gold,gold+3);assert.equal(g.state.inventory.rope,n+1);assert.equal(g.trigger('interact',o.id),true);drain(g);assert.equal(g.state.gold,gold+3);
 assert.equal(treasurePlan(d,g.state,m.id,o).exhausted,true);assert.equal(commandTargets(g,'inspect').find(t=>t.id==='object:'+o.id).text,'空になった。');roundtrip(g);
});
test('treasures do not draw or consume a use before all conditions and capacity checks pass; trap rewards cannot duplicate',()=>{
 const c=game(),{g,d,m}=c,o=addTreasure(c,'harvest',{uses:2,requiredItem:'torch',condition:{ref:'flags.allowed'},random:[{weight:1,rewards:{items:{rope:1}}}],trap:{kind:'needle',message:false}});
 let rolls=0;g.random=()=>{rolls++;return .1;};assert.equal(g.trigger('interact',o.id),false);g.state.flags.allowed=true;g.give('rope',d.system.maxStack);assert.equal(g.trigger('interact',o.id),false);assert.equal(rolls,0);
 g.give('rope',-2);assert.ok(g.trigger('interact',o.id));roundtrip(g);drain(g);assert.equal(rolls,1);assert.equal(g.state.events[treasureKey(m.id,o.id)],1);assert.ok(g.state.actors.ada.statuses.includes('weakened'));roundtrip(g);
});
test('the shipped oil-store tools keep their prior flag and do not award twice to existing saves',()=>{
 const {g,d}=game('kagaribi_f1'),m=d.maps.kagaribi_oilstore,o=m.objects.find(o=>o.id==='tools');g.teleport(m.id,o.x,o.y);
 g.state.flags.kagaribi={toolsTaken:true};assert.equal(g.trigger('interact',o.id),true);drain(g);delete g.state.flags.kagaribi.toolsTaken;
 assert.ok(g.trigger('interact',o.id));drain(g);assert.equal(g.state.flags.kagaribi.toolsTaken,true);roundtrip(g);assert.equal(g.trigger('interact',o.id),true);drain(g);
});
test('service packages compile presentation-independent locations and retain current service permissions',()=>{
 const l={id:'spot',name:'場所',services:['old'],shop:false};
 for(const kind of ['merchant','rest','camp','services']){const out=compileServiceLocations({spot:{...l,package:{kind,services:['inn','clinic']}}}).spot;assert.deepEqual(out.services,['inn','clinic']);assert.equal(out.shop,kind==='merchant');assert.equal(out.package,undefined);}
 assert.equal(data.locations.hikarigaeri_shop.shop,true);assert.ok(data.locations.kagaribi_post.services.includes('kagaribi_supply'));
});
test('schemas reject invalid recurrence, unsafe patches and incomplete presets; corrupted saves fail atomically',async()=>{
 const schema=JSON.parse(await fs.readFile(new URL('../data/schemas/cell-layers-authoring.schema.json',import.meta.url),'utf8')),source=JSON.parse(await fs.readFile(new URL('../config/cell-layers.json',import.meta.url),'utf8'));
 source.events.example={trigger:'enter',occurrence:policy(.2,3),package:{kind:'needle'}};assert.deepEqual(validateSchema(source,schema),[]);const compiled=compileCellPackages(source);assert.equal(compiled.events.example.script,'cell.package.example');
 for(const patch of [{chance:2},{maxCount:0},{reset:'implicit'}]){const e={trigger:'enter',occurrence:{...policy(),...patch}};assert.equal(occurrenceValid(e),false);}
 source.events.example.package={kind:'pit'};assert.ok(validateSchema(source,schema).length);assert.throws(()=>compileCellPackages(source));
 const {g,m}=game();for(const change of [s=>s.events[cellEventKey(m.id,2,1,'missing')]=1,s=>s.mapChanges={cells:{[m.id+'/2,1']:'missing'},edges:{}},s=>s.actors.ada.statusDurations={weakened:{steps:0}},s=>s.fieldEntry.history=[{map:'missing',x:1,y:1,z:0,fired:[]}],s=>s.fieldEntry.history=[{map:m.id,x:1,y:1,z:0,fired:['story-arrival/missing/place']}]]){const save=JSON.parse(g.save());change(save.state);const before=g.save();assert.throws(()=>g.load(JSON.stringify(save)));assert.equal(g.save(),before);}
 assert.deepEqual(validateContent(data),[]);
});
test('camp rests use local service permissions, check gold before recovery and keep the expedition',()=>{
 const {g,d}=game('kagaribi_f1'),generated={services:[],scripts:{}},original=d.locations.kagaribi_post;
 Object.assign(d.locations,compileServiceLocations({[original.id]:{...original,package:{kind:'camp',services:[],rest:{cost:8,ratio:1}}}},generated));
 d.game.services.push(...generated.services);Object.assign(d.scripts,generated.scripts);const entrance=original.dungeonEntrance;g.teleport(entrance.map,entrance.x,entrance.y);const run=g.state.dungeons.active.run;
 assert.ok(g.dispatch({type:'location.enter',id:original.id}));g.state.actors.ada.hp=1;g.state.gold=0;
 const intent={type:'service',id:generated.services[0].id};assert.ok(g.dispatch(intent));drain(g);assert.equal(g.state.actors.ada.hp,1);assert.equal(g.state.gold,0);
 g.state.gold=8;assert.ok(g.dispatch(intent));roundtrip(g);drain(g);assert.equal(g.state.gold,0);assert.equal(g.state.actors.ada.hp,g.stats('ada').hp);assert.ok(g.dispatch({type:'location.exit'}));assert.equal(g.state.dungeons.active.run,run);assert.equal(g.dispatch(intent),false);
});
test('battle turn expiry and level-up remove duration metadata with their status',()=>{
 const {g,d}=game(),a=g.state.actors.ada;applyStatus(d,g.state,a,'weakened',{turns:1});g.startBattle('kuragari_hunt',{win:[],lose:[],escape:[]});
 for(const id of g.state.members){g.state.actors[id].hp=g.stats(id).hp;}
 const b=g.state.battle;for(const e of b.enemies){e.ai=[];}
 // No enemy attack, and all living allies guarding completes exactly one round.
 let budget=10;while(g.state.battle?.round===1&&budget-->0)assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard',target:'ada'}));
 assert.equal(a.statuses.includes('weakened'),false);g.finishBattle('escape');applyStatus(d,g.state,a,'arcane_malaise');g.award(0,100);assert.ok(!a.statuses.includes('arcane_malaise'));assert.equal(a.statusDurations,undefined);
});
test('a lethal gas ignition during battle resolves defeat without an extra action or a false repel',()=>{
 const c=game('kagaribi_f1'),{g,d}=c;leak(c,'gas_leak');d.dungeons.kagaribi.hazards[0].explosion.damage=10000;
 g.startBattle('kuragari_hunt',{win:[],lose:[],escape:[]});g.setPortableFire({fuel:10,effect:fireContext(d,g.state).spec.portable.baseEffect});
 assert.equal(g.state.battle,null);assert.equal(g.state.mode,'town');assert.equal(g.state.records.losses,1);roundtrip(g);
});
