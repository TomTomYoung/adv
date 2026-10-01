import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,inspect,walk,navigateMaps,goTownLocation,fight} from './helpers.mjs';
import {fireContext,fireEnvironment} from '../src/core/systems/fire-network.js';
import {connectionSide,connectionBlocked,connectionSurfaces} from '../src/core/systems/map-connections.js';
import {validateSave} from '../src/core/save.js';
import {validateContent} from '../src/core/validation.js';
import {projectGame} from '../src/application/projection.js';
import {GameView} from '../src/view/view.js';
import {SceneView} from '../src/view/scene-view.js';
import {installDOM} from './view-dom.mjs';

const start=()=>{const g=newGame();g.random=()=>.999999;g.give('torch',40);assert.ok(g.dispatch({type:'travel',dungeon:'kagaribi'}));return g;};
const flags=g=>g.state.flags.kagaribi??{};
const choose=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}),id);drain(g);};
const inspectAt=(g,id)=>{inspect(g,id);drain(g);};
const save=g=>{const text=g.save();assert.deepEqual(validateSave(JSON.parse(text),data),[]);g.load(text);assert.equal(g.save(),text);};
const fire=(g,action,target='portable')=>{assert.ok(g.dispatch({type:'dungeon.action',system:'fires',action,target}));drain(g);};
function go(g,map,x,y){
 const options={beforeStep:()=>{const flame=fireContext(data,g.state).run.portable;if(flame.lit&&flame.fuel<15)fire(g,'refuel');}};
 navigateMaps(g,map,options);walk(g,x,y,options);const flame=fireContext(data,g.state).run.portable;
 if(!flame.lit)fire(g,'ignite');else if(flame.fuel<40)fire(g,'refuel');
}
const face=(g,wanted)=>{while(g.state.location.facing!==wanted)assert.ok(g.dispatch({type:'move',direction:'right'}));};
const inspectLatch=(g,map,x,y,id,edge)=>{go(g,map,x,y);face(g,edge);inspectAt(g,id);choose(g,'open');};
function restoreCart(g){
 go(g,'kagaribi_oilstore',3,9);inspectAt(g,'tools');
 go(g,'kagaribi_oilstore',11,5);inspectAt(g,'cart');choose(g,'repair');
 inspectLatch(g,'kagaribi_crossroads',1,9,'cargo_latch','west');
}
function enterPost(g){go(g,'kagaribi_crossroads',8,1);assert.ok(g.dispatch({type:'location.enter',id:'kagaribi_post'}));}

// Walk the published main route and both optional branches, with the same
// successful-movement counter and fuel state that the real game uses.
test('three floors contain nine connected districts reachable on foot, including the optional ossuary and deep ember',()=>{
 const g=start(),d=data.dungeons.kagaribi;assert.equal(d.maps.length,9);
 for(const f of [1,2,3])assert.equal(d.maps.filter(id=>data.maps[id].floor===f).length,3);
 const run=g.state.dungeons.active.run,visited=[];
 for(const id of ['kagaribi_f1','kagaribi_oilstore','kagaribi_crossroads','kagaribi_f2','kagaribi_kilns','kagaribi_relay','kagaribi_last_patrol','kagaribi_ossuary','kagaribi_f3']){
  go(g,id,data.maps[id].entrance.x,data.maps[id].entrance.y);visited.push(g.state.location.map);assert.equal(g.state.dungeons.active.run,run);save(g);
 }
 assert.equal(new Set(visited).size,9);assert.ok(g.state.dungeons.active.steps>100);
 go(g,'kagaribi_f3',7,7);fire(g,'collect','origin');assert.equal(fireContext(data,g.state).run.ember.effect,'deep');
 fire(g,'extinguish');fire(g,'transplant');assert.equal(fireEnvironment(fireContext(data,g.state)).rate,0);
 inspectLatch(g,'kagaribi_f3',1,7,'altar_latch','west');assert.ok(flags(g).altarGate);save(g);
 go(g,'kagaribi_f1',1,1);assert.equal(fireContext(data,g.state).run.portable.effect,'deep');
});

test('cargo repair handles missing rope, saves and repeat visits without duplicate material or gold',()=>{
 const g=start();g.give('rope',-(g.state.inventory.rope??0));go(g,'kagaribi_oilstore',11,5);inspectAt(g,'cart');
 const before={gold:g.state.gold,torch:g.state.inventory.torch};assert.equal(g.dispatch({type:'choose',id:'repair'}),false);assert.equal(flags(g).cartCleared,undefined);choose(g,'leave');
 go(g,'kagaribi_oilstore',3,9);inspectAt(g,'tools');save(g);const tools={rope:g.state.inventory.rope,torch:g.state.inventory.torch};inspectAt(g,'tools');assert.deepEqual({rope:g.state.inventory.rope,torch:g.state.inventory.torch},tools);
 go(g,'kagaribi_oilstore',11,5);inspectAt(g,'cart');choose(g,'repair');assert.equal(g.state.gold,before.gold+30);assert.equal(g.state.inventory.rope,0);save(g);
 const after={gold:g.state.gold,torch:g.state.inventory.torch};inspectAt(g,'cart');assert.deepEqual({gold:g.state.gold,torch:g.state.inventory.torch},after);
});

test('shortcuts block crossing and show a closed door until released from their inner side, then persist',()=>{
 const g=start(),link=data.dungeons.kagaribi.systems.connections.links.find(l=>l.id==='cargo_shortcut');
 go(g,'kagaribi_f1',3,7);face(g,'south');const steps=g.state.steps;
 assert.match(connectionBlocked(data,g.state,connectionSide(link,'kagaribi_f1')),/搬送門/);
 assert.equal(connectionSurfaces(data,g.state).doors['3,7/south'].closed,true);
 assert.equal(g.dispatch({type:'dungeon.action',system:'connections',action:'cross',target:link.id}),false);
 assert.equal(g.dispatch({type:'move',direction:'forward'}),false);assert.equal(g.state.steps,steps);
 restoreCart(g);save(g);assert.equal(flags(g).cargoGate,true);assert.equal(connectionSurfaces(data,g.state).doors['1,9/west'].closed,false);
 assert.ok(g.dispatch({type:'dungeon.action',system:'connections',action:'cross',target:link.id}));assert.equal(g.state.location.map,'kagaribi_f1');
 assert.ok(g.returnTown());g.dispatch({type:'travel',dungeon:'kagaribi'});assert.equal(flags(g).cargoGate,true);save(g);
});

test('post requires the actual doorway and local authorization; relief unlocks paid fuel without refilling the torch',()=>{
 const g=start();assert.equal(g.dispatch({type:'location.enter',id:'kagaribi_post'}),false);enterPost(g);
 const run=g.state.dungeons.active.run,fuel=g.state.dungeons.active.systems.fires.portable.fuel,steps=g.state.steps;
 assert.equal(g.dispatch({type:'service',id:'inn'}),false);assert.equal(g.dispatch({type:'service',id:'kagaribi_memorial'}),false);
 assert.ok(g.dispatch({type:'service',id:'kagaribi_supply'}));drain(g);assert.equal(g.state.waiting,null);save(g);
 assert.ok(g.dispatch({type:'location.exit'}));assert.equal(g.state.dungeons.active.run,run);assert.equal(g.state.steps,steps);assert.equal(fireContext(data,g.state).run.portable.fuel,fuel);
 restoreCart(g);go(g,'kagaribi_oilstore',11,1);inspectAt(g,'relief');choose(g,'send');enterPost(g);
 const gold=g.state.gold;assert.ok(g.dispatch({type:'service',id:'kagaribi_watch'}));drain(g);assert.equal(g.state.gold,gold+20);assert.ok(flags(g).postStaffed);save(g);
 assert.ok(g.dispatch({type:'service',id:'kagaribi_watch'}));drain(g);assert.equal(g.state.gold,gold+20);
 const old={gold:g.state.gold,torch:g.state.inventory.torch,fuel:g.state.dungeons.active.systems.fires.portable.fuel,steps:g.state.steps};
 assert.ok(g.dispatch({type:'service',id:'kagaribi_supply'}));drain(g);save(g);choose(g,'buy');save(g);
 assert.equal(g.state.gold,old.gold-6);assert.equal(g.state.inventory.torch,old.torch+1);assert.equal(g.state.steps,old.steps);assert.equal(g.state.dungeons.active.systems.fires.portable.fuel,old.fuel);
 g.state.gold=0;g.dispatch({type:'service',id:'kagaribi_supply'});drain(g);assert.equal(g.dispatch({type:'choose',id:'buy'}),false);choose(g,'leave');assert.equal(g.state.inventory.torch,old.torch+1);
 g.state.gold=20;g.give('torch',99-g.state.inventory.torch);g.dispatch({type:'service',id:'kagaribi_supply'});drain(g);assert.equal(g.dispatch({type:'choose',id:'buy'}),false);assert.equal(g.state.gold,20);choose(g,'leave');
 assert.ok(g.dispatch({type:'location.exit'}));assert.deepEqual(g.state.location,{map:'kagaribi_crossroads',x:8,y:1,facing:'south'});
 assert.equal(g.dispatch({type:'service',id:'kagaribi_supply'}),false);save(g);
});

test('relighting the relay reveals its surroundings once, protects only its area, and permits its shortcut',()=>{
 const g=start();go(g,'kagaribi_relay',1,9);face(g,'west');inspectAt(g,'relay_latch');assert.equal(g.dispatch({type:'choose',id:'open'}),false);choose(g,'leave');
 go(g,'kagaribi_relay',6,5);face(g,'east');fire(g,'ignite','relay_main');assert.ok(flags(g).relay_mainSeen);assert.equal(g.state.events['field/kagaribi/restored_relay_main'],1);save(g);
 fire(g,'extinguish');assert.equal(fireEnvironment(fireContext(data,g.state)).protected,true);
 inspectLatch(g,'kagaribi_relay',1,9,'relay_latch','west');assert.ok(flags(g).relayGate);save(g);
 go(g,'kagaribi_relay',7,5);fire(g,'extinguish','relay_main');fire(g,'ignite','relay_main');assert.equal(g.state.events['field/kagaribi/restored_relay_main'],1);
 g.returnTown();g.dispatch({type:'travel',dungeon:'kagaribi'});assert.equal(fireContext(data,g.state).persistent.fixtures.relay_main.lit,true);assert.ok(flags(g).relayGate);
});

test('red-fire hunt checks both the escape gate and the actual transplanted effect; rewards only a victory once',()=>{
 const g=start();go(g,'kagaribi_kilns',9,5);inspectAt(g,'hunt');assert.equal(g.dispatch({type:'choose',id:'lure'}),false);choose(g,'leave');
 inspectLatch(g,'kagaribi_kilns',7,1,'kiln_latch','north');go(g,'kagaribi_kilns',9,5);fire(g,'ignite','kiln_bait');inspectAt(g,'hunt');save(g);choose(g,'lure');
 assert.equal(g.state.battle.encounter,'kagaribi_kiln_guard');assert.equal(flags(g).huntWon,undefined);save(g);
 fight(g);assert.equal(flags(g).huntWon,true);save(g);const after={gold:g.state.gold,torch:g.state.inventory.torch};inspectAt(g,'hunt');assert.deepEqual({gold:g.state.gold,torch:g.state.inventory.torch},after);
 const h=start();h.teleport('kagaribi_kilns',9,5);h.state.flags.kagaribi={kilnGate:true};fire(h,'collect');fire(h,'transplant','kiln_bait');assert.equal(fireContext(data,h.state).persistent.fixtures.kiln_bait.effect,'ward');inspectAt(h,'hunt');assert.equal(h.dispatch({type:'choose',id:'lure'}),false);choose(h,'leave');
});

test('ossuary record returns to the town desk, with a single handover and no resurrection side effect',()=>{
 const g=start();go(g,'kagaribi_ossuary',11,5);inspectAt(g,'nameplate');choose(g,'take');save(g);assert.equal(g.state.inventory.kagaribi_nameplate,1);inspectAt(g,'nameplate');assert.equal(g.state.inventory.kagaribi_nameplate,1);
 go(g,'kagaribi_f1',1,1);g.returnTown();goTownLocation(g,'hikarigaeri_lamplighter_post');const hp=g.state.members.map(id=>g.state.actors[id].hp),gold=g.state.gold;
 assert.ok(g.dispatch({type:'service',id:'kagaribi_memorial'}));drain(g);save(g);choose(g,'return');assert.equal(g.state.inventory.kagaribi_nameplate,0);assert.equal(g.state.gold,gold+35);assert.deepEqual(g.state.members.map(id=>g.state.actors[id].hp),hp);save(g);
 g.dispatch({type:'service',id:'kagaribi_memorial'});drain(g);assert.equal(g.state.gold,gold+35);assert.ok(flags(g).memorialDone);
});

test('q001 investigation keeps its original route and prevents detours into the new districts while active',()=>{
 const g=start();g.state.quests.q001.stage='active';
 for(const id of ['patrol_oilstore','cargo_shortcut']){const l=data.dungeons.kagaribi.systems.connections.links.find(l=>l.id===id);g.teleport(l.a.map,l.a.x,l.a.y,l.a.side);g.state.flags.kagaribi={cargoGate:true};assert.equal(g.dispatch({type:'dungeon.action',system:'connections',action:'cross',target:id}),false);}
 assert.deepEqual(data.quests.q001.story.worldPlaces.branch,{kind:'dungeon',dungeon:'kagaribi',map:'kagaribi_f1',x:13,y:3,event:'q001_elder'});
 const bad=structuredClone(data);bad.dungeons.kagaribi.systems.connections.links[0].condition={op:'not_registered'};assert.ok(validateContent(bad).some(e=>e.includes('未知の式')));
});

for(const View of [GameView,SceneView])test(`${View.name} renders local post actions and leaves to the same expedition`,()=>{
 const g=start();g.teleport('kagaribi_crossroads',8,1);g.dispatch({type:'location.enter',id:'kagaribi_post'});const dom=installDOM();
 try{const root=dom.document.createElement('main');dom.document.body.append(root);const view=new View(root,intent=>{g.dispatch(intent);view.render(projectGame(g));},{status(){},menu(){},help(){},sound(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));
  const labels=[...root.querySelectorAll('button')].map(b=>b.textContent);assert.ok(labels.some(t=>t.includes('燃料の補給窓口')));assert.ok(labels.some(t=>t.includes('当直と交代')));assert.ok(!labels.some(t=>t.includes('宿屋で全回復')));view.cancel();assert.equal(g.state.location.map,'kagaribi_crossroads');
 }finally{dom.restore();}
});
