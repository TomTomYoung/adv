import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,walk,pathTo,fight} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {dungeonActionPlan,dungeonEncounter,dungeonAbilityReason,dungeonEffectActive} from '../src/core/dungeons.js';
import {battleSkillPlan,activeActor} from '../src/core/battle.js';
import {fieldActionPlan,permission} from '../src/core/jobs.js';
import {validateSave} from '../src/core/save.js';
import {validateContent} from '../src/core/validation.js';
import {projectGame} from '../src/application/projection.js';
const begin=(id)=>{const g=newGame(1789);g.random=()=>.999999;assert.ok(g.dispatch({type:'travel',dungeon:typeof id==='number'?`region_${id}`:id}));return g;};
const spec=(g,key)=>g.data.dungeons[g.state.dungeons.active.id].systems[key];
const run=(g,key)=>g.state.dungeons.active.systems[key];
const saved=(g,key)=>g.state.dungeons.persistent[g.state.dungeons.active.id].systems[key];
const at=(g,p,facing='east')=>g.teleport(p.map,p.x,p.y,facing);
const act=(g,system,action,target,extra={})=>g.dispatch({type:'dungeon.action',system,action,target,...extra});
const wait=(g,system,n)=>{for(let i=0;i<n;i++)assert.ok(act(g,system,'wait'));};
const roundtrip=g=>{const text=g.save();assert.deepEqual(validateSave(JSON.parse(text),g.data),[]);g.load(text);assert.equal(g.save(),text);};
const escape=g=>{const random=g.random;g.random=()=>0;assert.ok(g.dispatch({type:'battle',action:'escape'}));g.random=random;drain(g);};
const adjacent=(g,p)=>[[p.x-1,p.y,'east'],[p.x+1,p.y,'west'],[p.x,p.y-1,'south'],[p.x,p.y+1,'north']].find(([x,y])=>g.walkable(g.data.maps[p.map],x,y));
const provision=g=>assert.ok(act(g,'garden','supplies'));

test('all thirteen destinations are usable, preserve 200 quests and keep new areas separate from abyss effects',()=>{
  const g=newGame();assert.equal(projectGame(g).dungeons.length,13);assert.equal(Object.keys(data.quests).length,200);
  for(const dungeon of Object.values(data.dungeons)){
    assert.ok(g.dispatch({type:'travel',dungeon:dungeon.id}));assert.equal(g.state.dungeons.active.id,dungeon.id);roundtrip(g);g.returnTown();
  }
  assert.ok(projectGame(g).dungeons.find(d=>d.id==='prayerless_valley').preview.join('').includes('旅の回復祈祷'));
});

test('six plant species grow, return distinct materials and change encounter or healing effects without mutating definitions',()=>{
  const g=begin(3),s=spec(g,'garden'),before=JSON.stringify(s);provision(g);g.give('garden_soil',20);
  for(const [id,plant] of Object.entries(s.species)){
    const plot=s.plots.find(p=>!plant.terrain||p.terrain[plant.terrain]);at(g,plot);const inventory={...g.state.inventory};
    assert.ok(act(g,'garden','plant',plot.id,{species:id}));for(const [item,n] of Object.entries(plant.materials))assert.equal(g.state.inventory[item],inventory[item]-n);
    const hp=g.state.actors.ada.hp;g.state.actors.ada.hp=Math.max(1,hp-10);wait(g,'garden',plant.growth);
    assert.equal(saved(g,'garden').plants[plot.id].age,plant.growth);assert.equal(dungeonEncounter(data,g.state).rate,plant.encounterRate);
    if(plant.heal)assert.ok(g.state.actors.ada.hp>hp-10);
    const harvested={...g.state.inventory};roundtrip(g);assert.ok(act(g,'garden','harvest',plot.id));
    for(const [item,n] of Object.entries(plant.harvest))assert.equal(g.state.inventory[item],(harvested[item]??0)+n);
    assert.equal(dungeonEncounter(data,g.state).rate,1);
  }
  assert.equal(JSON.stringify(s),before);roundtrip(g);
});

test('bridges change collision, vine stairs cross floors, and planted terrain persists across exits',()=>{
  const g=begin(3);provision(g);const s=spec(g,'garden'),bridge=s.plots.find(p=>p.terrain.bridge),tile=bridge.terrain.bridge[0];
  walk(g,bridge.x,bridge.y,{heal:true});assert.ok(act(g,'garden','plant',bridge.id,{species:'root_bridge'}));wait(g,'garden',5);assert.ok(g.walkable(g.data.maps[tile.map],tile.x,tile.y));
  walk(g,tile.x,tile.y,{heal:true});roundtrip(g);const vm=projectGame(g);assert.equal(vm.dungeon.cells[tile.y][tile.x].wall,false);
  const vine=s.plots.find(p=>p.map===g.state.location.map&&p.terrain.vine);walk(g,vine.x,vine.y,{heal:true});assert.ok(act(g,'garden','plant',vine.id,{species:'stair_vine'}));wait(g,'garden',6);assert.ok(act(g,'garden','climb',vine.id));assert.equal(g.state.location.map,vine.terrain.vine.map);roundtrip(g);
  g.returnTown();g.dispatch({type:'travel',region:3});assert.ok(g.walkable(g.data.maps[tile.map],tile.x,tile.y));at(g,bridge);assert.ok(act(g,'garden','harvest',bridge.id));assert.equal(g.walkable(g.data.maps[tile.map],tile.x,tile.y),false);
});

test('thorn growth does not trap an occupied cell; harvesting and invalid planting are atomic',()=>{
  const g=begin(3);provision(g);const p=spec(g,'garden').plots.find(p=>p.terrain.barrier),tile=p.terrain.barrier[0];at(g,p);assert.ok(act(g,'garden','plant',p.id,{species:'thorn_wall'}));at(g,tile);wait(g,'garden',4);assert.equal(saved(g,'garden').plants[p.id].age,3);assert.ok(g.walkable(g.map(),tile.x,tile.y));roundtrip(g);
  at(g,p);wait(g,'garden',1);assert.equal(g.walkable(g.map(),tile.x,tile.y),false);g.state.inventory.hard_thorn=data.system.maxStack;const inventory=JSON.stringify(g.state.inventory);assert.equal(act(g,'garden','harvest',p.id),false);assert.equal(JSON.stringify(g.state.inventory),inventory);assert.ok(saved(g,'garden').plants[p.id]);
  g.state.inventory.hard_thorn=0;assert.ok(act(g,'garden','harvest',p.id));assert.ok(g.walkable(g.map(),tile.x,tile.y));assert.equal(act(g,'garden','plant',p.id,{species:'__proto__'}),false);assert.equal(act(g,'garden','plant',p.id,{species:'stair_vine'}),false);roundtrip(g);
});

test('every authored mirror moves to its declared destination, saves consistently and rejects remote use',()=>{
  const g=begin(4),s=spec(g,'mirrors');assert.equal(act(g,'mirrors','warp',s.portals.at(-1).id),false);
  const p=s.portals[0];walk(g,p.x,p.y,{heal:true});assert.ok(act(g,'mirrors','warp',p.id));assert.equal(g.state.location.map,s.portals.find(d=>d.id===p.destination).map);
  for(const p of s.portals){at(g,p);assert.ok(act(g,'mirrors','warp',p.id));const d=s.portals.find(v=>v.id===p.destination);assert.deepEqual(g.state.location,{map:d.map,x:d.x,y:d.y,facing:d.facing});roundtrip(g);}
  assert.equal(run(g,'mirrors').uses,9);
});

test('orrery selects terrain only at a control, updates geometry and preserves the chosen pattern',()=>{
  const g=begin(9),s=spec(g,'terrain');assert.equal(act(g,'terrain','shift',s.controls.at(-1).id,{phase:'west'}),false);walk(g,s.controls[0].x,s.controls[0].y,{heal:true});assert.ok(act(g,'terrain','shift',s.controls[0].id,{phase:'west'}));
  const view=projectGame(g);for(const t of s.states[1].tiles.filter(t=>t.map===g.state.location.map))assert.equal(view.dungeon.geometry[t.y][t.x],t.tile);
  g.returnTown();g.dispatch({type:'travel',region:9});assert.equal(saved(g,'terrain').phase,'west');roundtrip(g);assert.equal(act(g,'terrain','wait'),false);
});

test('automatic terrain changes use saved randomness, happen during movement, and cannot be selected manually',()=>{
  const g=begin('moving_village');delete g.random;const h=newGame();h.load(g.save());
  for(let i=0;i<35;i++){assert.ok(act(g,'terrain','wait'));assert.ok(act(h,'terrain','wait'));assert.equal(g.save(),h.save());if(i===11){g.load(g.save());h.load(h.save());}}
  assert.ok(run(g,'terrain').changes>0);const before=g.save();assert.equal(act(g,'terrain','shift',null,{phase:'left'}),false);assert.equal(run(g,'terrain').changes,JSON.parse(before).state.dungeons.active.systems.terrain.changes);
  const remaining=run(g,'terrain').remaining;g.state.location.facing='east';assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.notEqual(run(g,'terrain').remaining,remaining);roundtrip(g);
});

test('automatic terrain evacuates a closing foothold to a stable refuge without firing skipped story events',()=>{
  const g=begin('moving_village'),s=spec(g,'terrain');const current=s.states.find(v=>v.id===saved(g,'terrain').phase),next=s.states[2];
  const tile=current.tiles.find(t=>t.tile==='.'&&next.tiles.some(n=>n.x===t.x&&n.y===t.y&&n.tile==='#'));assert.ok(tile);at(g,tile);const events=structuredClone(g.state.events);run(g,'terrain').remaining=1;wait(g,'terrain',1);assert.equal(g.state.location.x,1);assert.equal(g.state.location.y,1);assert.deepEqual(g.state.events,events);roundtrip(g);
});

test('cell vectors penalize actual reverse displacement, accumulate severe stats and clear on exit',()=>{
  const g=begin(10),s=spec(g,'return_flow'),base=g.stats('ada');const v=s.vectors.find(v=>v.map===g.state.location.map&&v.x===1&&v.y===2);assert.ok(v);g.state.location.facing='south';
  assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.equal(run(g,'return_flow').stacks,0);
  assert.ok(g.dispatch({type:'move',direction:'back'}));assert.equal(run(g,'return_flow').stacks,1);assert.equal(g.stats('ada').str,Math.floor(base.str*.6));
  g.dispatch({type:'move',direction:'forward'});g.dispatch({type:'move',direction:'back'});assert.equal(run(g,'return_flow').stacks,2);assert.equal(g.stats('ada').vit,Math.floor(base.vit*.36));
  assert.equal(g.stats('ada').hp,base.hp);roundtrip(g);g.teleport('region_10_f2',1,1);assert.equal(run(g,'return_flow').stacks,2);g.returnTown();assert.deepEqual(g.stats('ada'),base);
});

test('turning and blocked steps do not accumulate return curse; emergency return remains possible at extreme stacks',()=>{
  const g=begin(10);g.state.location.facing='north';for(let i=0;i<3;i++){assert.equal(g.dispatch({type:'move',direction:'forward'}),false);g.dispatch({type:'move',direction:'right'});g.dispatch({type:'move',direction:'left'});}
  assert.equal(run(g,'return_flow').stacks,0);run(g,'return_flow').stacks=100;assert.equal(g.stats('ada').str,0);roundtrip(g);assert.ok(g.dispatch({type:'retreat'}));assert.ok(g.stats('ada').str>0);roundtrip(g);
});

test('valley prevents specified field and battle skills, suspends charms and restores them outside',()=>{
  const g=newGame();g.give('focus',1);g.dispatch({type:'equip',actor:'sera',item:'focus'});g.dispatch({type:'travel',dungeon:'prayerless_valley'});const base=g.stats('sera').int;
  assert.ok(fieldActionPlan(data,g.state,'sera','field_prayer').ok);walk(g,5,1,{heal:true});const mp=g.state.actors.sera.mp;
  assert.equal(g.dispatch({type:'job.action',actor:'sera',ability:'field_prayer'}),false);assert.equal(g.state.actors.sera.mp,mp);assert.equal(g.stats('sera').int,base-5);assert.match(dungeonAbilityReason(data,g.state,'heal','battle.skill'),/境界/);
  g.startBattle('valley_roamers',{win:[],escape:[],lose:[]});assert.equal(battleSkillPlan(g,'sera','heal','sera').ok,false);assert.ok(battleSkillPlan(g,'nio','attack','enemy_0').ok);roundtrip(g);escape(g);
  g.random=()=>.999999;walk(g,4,1,{heal:true});assert.ok(fieldActionPlan(data,g.state,'sera','field_prayer').ok);assert.equal(g.stats('sera').int,base);roundtrip(g);
});

test('enemy curse is suppressed inside while physical damage still applies, and an existing curse resumes outside',()=>{
  const g=begin('prayerless_valley');g.state.members=['ada'];g.state.actors.ada.statuses=['hollow_curse'];at(g,{map:'prayerless_valley_f1',x:5,y:1});const hp=g.state.actors.ada.hp;
  g.startBattle('valley_roamers',{win:[],escape:[],lose:[]});const mp=g.state.battle.enemies[0].mp;assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard'}));assert.equal(g.state.battle.enemies[0].mp,mp);assert.ok(g.state.actors.ada.hp<hp);assert.ok(!dungeonEffectActive(data,g.state,'status','hollow_curse'));escape(g);
  at(g,{map:'prayerless_valley_f1',x:4,y:1},'west');const hp2=g.state.actors.ada.hp;g.dispatch({type:'move',direction:'forward'});assert.equal(g.state.actors.ada.hp,hp2-2);assert.ok(dungeonEffectActive(data,g.state,'status','hollow_curse'));roundtrip(g);
});

test('a pursuer can be lured across either side of the boundary with its pending movement saved',()=>{
  for(const [facing,x] of [['east',5],['west',3]]){
    const g=begin('prayerless_valley');at(g,spec(g,'boundary').threat.point,facing);assert.ok(act(g,'boundary','lure'));roundtrip(g);assert.equal(g.state.battle,null);assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.equal(g.state.location.x,x);assert.equal(g.state.battle.encounter,'valley_roamers');assert.equal(Boolean(dungeonAbilityReason(data,g.state,'valley_curse','battle.skill')),x===5);roundtrip(g);
  }
});

test('borrowed skill replaces one native skill, opens seals, survives save and returns on dungeon exit',()=>{
  const g=begin(5),s=spec(g,'library'),book=s.books.find(b=>b.skill==='read_path');walk(g,book.x,book.y,{heal:true});assert.ok(act(g,'library','borrow',book.id,{actor:'ada',sealed:'power'}));assert.ok(!g.skills('ada').includes('power'));assert.ok(permission(data,g.state,'ada','read_path','archive.unlock'));
  const gate=s.gates[0];walk(g,gate.x,gate.y,{heal:true});const mp=g.state.actors.ada.mp;assert.ok(g.dispatch({type:'job.action',actor:'ada',ability:'read_path'}));assert.equal(g.state.actors.ada.mp,mp-3);const tile=gate.tiles[0];assert.ok(g.walkable(g.data.maps[tile.map],tile.x,tile.y));roundtrip(g);
  g.returnTown();assert.ok(g.skills('ada').includes('power'));assert.equal(permission(data,g.state,'ada','read_path','archive.unlock'),null);g.dispatch({type:'travel',region:5});assert.ok(saved(g,'library').opened.includes(gate.id));roundtrip(g);
});

test('borrowed battle skills are actually usable, native sealed skills fail, and invalid trades spend nothing',()=>{
  const g=begin(5),book=spec(g,'library').books.find(b=>b.skill==='holy_light');at(g,book);const before=g.state.actors.ada.mp;
  assert.equal(act(g,'library','borrow',book.id,{actor:'ada',sealed:'missing'}),false);assert.equal(g.state.actors.ada.mp,before);assert.ok(act(g,'library','borrow',book.id,{actor:'ada',sealed:'power'}));
  g.state.members=['ada'];g.startBattle('roaming_1',{win:[],escape:[],lose:[]});assert.ok(battleSkillPlan(g,'ada','holy_light','enemy_0').ok);assert.equal(battleSkillPlan(g,'ada','power','enemy_0').ok,false);roundtrip(g);assert.ok(g.dispatch({type:'battle',action:'skill',skill:'holy_light',target:'enemy_0'}));if(g.state.battle)escape(g);at(g,book);assert.ok(act(g,'library','return',book.id,{actor:'ada'}));assert.ok(g.skills('ada').includes('power'));assert.ok(!g.skills('ada').includes('holy_light'));roundtrip(g);
});

test('market toll and barter open routes persistently, merchant purchases and escort spend exact resources',()=>{
  const g=begin(6),s=spec(g,'market');g.state.gold=100;g.give('red_nectar',2);
  for(const offer of s.offers.slice(0,4)){at(g,offer);const gold=g.state.gold;assert.ok(act(g,'market','trade',offer.id));assert.equal(g.state.gold,gold-offer.gold);if(offer.tiles.length){const t=offer.tiles[0];assert.ok(g.walkable(g.map(),t.x,t.y));}roundtrip(g);}
  assert.equal(run(g,'market').escort,30);assert.deepEqual(dungeonEncounter(data,g.state),{rate:.35,enemyScale:.75});g.returnTown();g.dispatch({type:'travel',region:6});assert.equal(run(g,'market').escort,0);assert.equal(saved(g,'market').paid.length,2);roundtrip(g);
});

test('a future native skill can be borrowed and level-up while borrowing neither duplicates it nor corrupts saves',()=>{
  const g=newGame();g.dispatch({type:'job.change',actor:'ada',job:'monk'});g.dispatch({type:'travel',region:5});const book=spec(g,'library').books.find(b=>b.skill==='breathe');at(g,book);
  assert.ok(act(g,'library','borrow',book.id,{actor:'ada',sealed:'guard'}));roundtrip(g);assert.equal(g.skills('ada').filter(id=>id==='breathe').length,1);
  g.award(0,data.system.xpBase*5*6);assert.ok(g.state.level>=5);roundtrip(g);assert.equal(g.skills('ada').filter(id=>id==='breathe').length,1);
  assert.ok(act(g,'library','return',book.id,{actor:'ada'}));assert.ok(g.skills('ada').includes('guard'));assert.ok(g.skills('ada').includes('breathe'));roundtrip(g);
});

test('combat raises market alarm, closes merchants, adds guards and clears a guard only on victory',()=>{
  const g=begin(6),s=spec(g,'market'),shop=s.offers.find(o=>o.kind==='buy');g.state.gold=100;
  for(let i=0;i<2;i++){g.startBattle('roaming_6',{win:[],escape:[],lose:[]});escape(g);}
  assert.equal(run(g,'market').alarm,2);at(g,shop);const gold=g.state.gold;assert.equal(act(g,'market','trade',shop.id),false);assert.equal(g.state.gold,gold);
  const guard=s.guards[0];assert.equal(g.walkable(g.data.maps[guard.map],guard.x,guard.y),false);g.teleport(guard.map,...adjacent(g,guard));assert.ok(act(g,'market','fight',guard.id));roundtrip(g);
  g.award(0,100000);g.healAll();fight(g);assert.ok(run(g,'market').cleared.includes(guard.id));assert.ok(g.walkable(g.data.maps[guard.map],guard.x,guard.y));roundtrip(g);g.returnTown();g.dispatch({type:'travel',region:6});assert.equal(run(g,'market').alarm,0);
});

test('air is spent on underwater movement, battle start and rounds; air rooms refill and flotation opens routes',()=>{
  const g=begin(7),s=spec(g,'air');g.state.location.facing='south';assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.equal(run(g,'air').air,35);
  g.state.members=['ada'];g.startBattle('roaming_7',{win:[],escape:[],lose:[]});assert.equal(run(g,'air').air,33);g.award(0,100000);assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard'}));assert.equal(run(g,'air').air,31);roundtrip(g);escape(g);
  const device=s.devices[0];at(g,device);assert.ok(act(g,'air','raise',device.id));assert.equal(run(g,'air').air,36);assert.ok(g.walkable(g.map(),device.tiles[0].x,device.tiles[0].y));roundtrip(g);g.returnTown();g.dispatch({type:'travel',region:7});assert.ok(saved(g,'air').raised.includes(device.id));assert.equal(run(g,'air').air,36);
});

test('zero air causes damage and cannot leave an all-dead party stuck at battle start',()=>{
  const g=begin(7);at(g,{map:'region_7_f1',x:1,y:2});run(g,'air').air=0;for(const id of g.state.members)g.state.actors[id].hp=1;
  g.startBattle('roaming_7',{win:[],escape:[],lose:[]});assert.equal(g.state.mode,'town');assert.equal(g.state.battle,null);assert.equal(g.state.waiting,null);roundtrip(g);
});

test('power allocation respects capacity and powering a gate also wakes its guardian',()=>{
  const g=begin(8),s=spec(g,'power'),gate=s.controls[0],transport=s.controls[1];at(g,gate);assert.ok(act(g,'power','toggle',gate.id));assert.equal(g.state.battle.encounter,'machine_sentry');roundtrip(g);escape(g);
  at(g,transport);assert.equal(act(g,'power','toggle',transport.id),false);assert.deepEqual(saved(g,'power').circuits,[gate.id]);
  at(g,gate);assert.ok(act(g,'power','toggle',gate.id));at(g,transport);assert.ok(act(g,'power','toggle',transport.id));assert.equal(g.state.battle,null);roundtrip(g);
});

test('removing a guardian part avoids activation, reconnecting consumes it, elevator and repair receive power',()=>{
  const g=begin(8),s=spec(g,'power'),guardian=s.devices.find(d=>d.kind==='guardian');at(g,guardian);assert.ok(act(g,'power','disconnect',guardian.id));assert.equal(g.state.inventory.machine_part,1);
  at(g,s.controls[0]);assert.ok(act(g,'power','toggle',s.controls[0].id));assert.equal(g.state.battle,null);roundtrip(g);assert.ok(act(g,'power','toggle',s.controls[0].id));
  at(g,guardian);assert.ok(act(g,'power','reconnect',guardian.id));assert.equal(g.state.inventory.machine_part,0);at(g,s.controls[1]);assert.ok(act(g,'power','toggle',s.controls[1].id));
  const repair=s.devices.find(d=>d.kind==='repair');at(g,repair);g.state.actors.ada.hp=1;assert.ok(act(g,'power','repair',repair.id));assert.equal(g.state.actors.ada.hp,g.stats('ada').hp);
  const lift=s.devices.find(d=>d.kind==='elevator');at(g,lift);assert.ok(act(g,'power','ride',lift.id));assert.equal(g.state.location.map,lift.destination.map);roundtrip(g);
});

test('every new panel is detached and exposes the same action permissions used by dispatch',()=>{
  for(const id of [3,4,5,6,7,8,9,10,'prayerless_valley','moving_village']){
    const g=begin(id),before=g.save(),vm=projectGame(g);
    for(const system of vm.dungeon.systems){for(const a of [...system.actions,...system.cards.flatMap(c=>c.actions)])assert.equal(a.enabled,dungeonActionPlan(data,g.state,a.intent).ok);system.summary='changed';system.cards.length=0;}
    assert.equal(g.save(),before);
  }
});

test('v1.6 saves gain only missing components while preserving ongoing text, choice, battle and earlier systems',()=>{
  const old=structuredClone(data);old.game.version='1.6.0';for(const [id,systems] of Object.entries(data.game.migrations['1.6.0'].addedSystems))for(const key of systems)delete old.dungeons[id].systems[key];
  for(const region of [1,2,3,4,5,6,7,8,9,10])for(const kind of ['text','choice','battle']){
    const g=new GameEngine(old);drain(g);g.dispatch({type:'travel',region});if(kind==='text')g.run('service.inn');else if(kind==='choice'){g.accept('q001');g.run('q001.decision');drain(g);}else g.startBattle('roaming_1',{win:[],escape:[],lose:[]});
    const text=g.save(),before=JSON.parse(text).state,h=newGame();h.load(text);
    for(const key of ['actors','inventory','location','vm','waiting','battle','rng','records','steps','quests','events','objects','discovered'])assert.deepEqual(h.state[key],before[key],`${region}/${kind}/${key}`);
    if(region<=2)assert.deepEqual(h.state.dungeons,before.dungeons);roundtrip(h);
  }
});

test('corrupted new system saves reject atomically and malformed content reports configuration errors',()=>{
  for(const [id,key,change] of [[3,'garden',p=>p.plants={fake:{species:'cool_spore',age:0}}],[4,'mirrors',(p,r)=>r.uses=-1],[5,'library',(p,r)=>r.loans={ada:{book:'missing',sealed:'attack'}}],[6,'market',(p,r)=>r.alarm=99],[7,'air',(p,r)=>r.air=99999],[8,'power',p=>p.circuits=['missing']],[9,'terrain',p=>p.phase='missing'],[10,'return_flow',(p,r)=>r.stacks=-1],['prayerless_valley','boundary',(p,r)=>r.pursued='yes'],['moving_village','terrain',(p,r)=>r.remaining=-1]]){
    const g=begin(id),before=g.save(),save=JSON.parse(before),active=save.state.dungeons.active;change(save.state.dungeons.persistent[active.id].systems[key],active.systems[key]);assert.throws(()=>g.load(JSON.stringify(save)));assert.equal(g.save(),before);
  }
  for(const change of [d=>d.dungeons.region_3.systems.garden.species.cool_spore.materials.fake=1,d=>d.dungeons.region_4.systems.mirrors.portals[0].destination='missing',d=>d.dungeons.region_5.systems.library.books[0].skill='missing',d=>d.dungeons.region_6.systems.market.guardEncounter='missing',d=>d.dungeons.region_7.systems.air.capacity=0,d=>d.dungeons.region_8.systems.power.devices[0].circuit='missing',d=>d.dungeons.region_9.systems.terrain.states[0].tiles[0].tile='?',d=>d.dungeons.region_10.systems.return_flow.vectors.pop(),d=>d.dungeons.prayerless_valley.systems.boundary.blockedSkills.push('missing'),d=>d.dungeons.moving_village.systems.terrain.interval.max=0]){const d=structuredClone(data);change(d);assert.ok(validateContent(d).length);}
});
