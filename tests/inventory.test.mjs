import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,data,drain,goTownLocation} from './helpers.mjs';
import {heldCount,heldGear} from '../src/core/inventory.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {replaceView} from '../src/view/view-layout.js';
import {handleGameKey} from '../src/view/keyboard.js';
import {installDOM} from './view-dom.mjs';

const count=(g,item,holder)=>heldCount(g.data,g.state,item,holder);
const stock=(g,item,n)=>g.give(item,n-(g.state.inventory[item]??0));
const transfer=(g,item,from,to,n=1)=>g.dispatch({type:'inventory.transfer',item,from,to,count:n});
const resources=g=>structuredClone({gold:g.state.gold,inventory:g.state.inventory,carried:g.state.carried,gear:g.state.gear,actors:g.state.actors,steps:g.state.steps});

test('purchase assigns exactly one new item after validating recipient, price, location and capacity',()=>{
  const g=newGame();goTownLocation(g,'hikarigaeri_shop');g.state.gold=1000;
  const before=resources(g),price=projectGame(g).shop.find(i=>i.id==='potion').price;
  assert.ok(g.dispatch({type:'buy',item:'potion',actor:'nio'}));
  assert.equal(g.state.gold,before.gold-price);assert.equal(count(g,'potion','nio'),1);assert.equal(count(g,'potion','shared'),before.inventory.potion);
  g.give('iron_sword',1);const old=g.state.gear.bag.iron_sword.at(-1);g.state.gear.items[old].salt=7;
  assert.ok(g.dispatch({type:'buy',item:'iron_sword',actor:'sera'}));
  const copy=heldGear(g.state,'iron_sword','sera')[0];assert.notEqual(copy,old);assert.equal(g.state.gear.items[copy].salt,0);assert.equal(g.state.gear.items[old].holder,undefined);
  assert.equal(projectGame(g).shop.find(i=>i.id==='iron_sword').recipients.find(a=>a.actor==='sera').equipAllowed,false);
  for(const intent of [{type:'buy',item:'potion',actor:'missing'},{type:'buy',item:'missing',actor:'ada'}]){const before=resources(g);assert.equal(g.dispatch(intent),false);assert.deepEqual(resources(g),before);}
  g.state.gold=0;let snapshot=resources(g);assert.equal(g.dispatch({type:'buy',item:'potion',actor:'ada'}),false);assert.deepEqual(resources(g),snapshot);
  g.state.gold=1000;stock(g,'potion',data.system.maxStack);snapshot=resources(g);assert.equal(g.dispatch({type:'buy',item:'potion',actor:'ada'}),false);assert.deepEqual(resources(g),snapshot);
  goTownLocation(g,'hikarigaeri_square');snapshot=resources(g);assert.equal(g.dispatch({type:'buy',item:'torch',actor:'ada'}),false);assert.deepEqual(resources(g),snapshot);
});

test('transfers preserve totals, gold and steps; invalid transfers cannot spend or duplicate items',()=>{
  const g=newGame();stock(g,'potion',6);const before=resources(g);
  assert.ok(transfer(g,'potion','shared','ada',4));assert.ok(transfer(g,'potion','ada','nio',2));assert.ok(transfer(g,'potion','nio','shared'));
  assert.deepEqual([count(g,'potion','shared'),count(g,'potion','ada'),count(g,'potion','nio')],[3,2,1]);
  assert.deepEqual(g.state.inventory,before.inventory);assert.equal(g.state.gold,before.gold);assert.equal(g.state.steps,before.steps);
  for(const [from,to,n] of [['ada','nio',0],['ada','nio',-1],['ada','nio',.5],['ada','nio',3],['ada','ada',1],['missing','nio',1],['ada','missing',1]]){
    const snapshot=resources(g);assert.equal(transfer(g,'potion',from,to,n),false);assert.deepEqual(resources(g),snapshot);
  }
});

test('using a personal item consumes that holder even when shared supplies exist; pooled costs remain consistent',()=>{
  const g=newGame();stock(g,'potion',6);stock(g,'antidote',2);assert.ok(transfer(g,'potion','shared','ada',3));assert.ok(transfer(g,'potion','shared','nio',1));
  g.state.actors.sera.hp=1;
  assert.ok(g.dispatch({type:'item',item:'potion',actor:'sera',source:'nio'}));
  assert.equal(g.state.actors.sera.hp,Math.min(g.stats('sera').hp,46));assert.deepEqual([count(g,'potion','shared'),count(g,'potion','ada'),count(g,'potion','nio')],[2,3,0]);
  const before=resources(g);assert.equal(g.dispatch({type:'item',item:'potion',actor:'sera',source:'nio'}),false);assert.deepEqual(resources(g),before);
  assert.ok(g.dispatch({type:'job.change',actor:'ada',job:'alchemist'}));g.healAll();stock(g,'ration',0);
  assert.ok(g.dispatch({type:'job.action',actor:'ada',ability:'prepare_ration'}));assert.equal(count(g,'potion','shared'),0);assert.equal(count(g,'potion','ada'),3);
  assert.ok(g.dispatch({type:'job.action',actor:'ada',ability:'prepare_ration'}));assert.equal(count(g,'potion','ada'),1);assert.equal(count(g,'ration','shared'),2);
  assert.deepEqual(validateSave(JSON.parse(g.save()),data),[]);
});

test('equipment transfer, swap, unequip and job change preserve each physical copy and its corrosion',()=>{
  const g=newGame();stock(g,'iron_sword',2);stock(g,'hand_axe',1);
  const [first,second]=g.state.gear.bag.iron_sword;g.state.gear.items[first].salt=9;g.state.gear.items[second].salt=2;
  assert.ok(transfer(g,'iron_sword','shared','ada'));assert.deepEqual(heldGear(g.state,'iron_sword','ada'),[second]);
  assert.ok(transfer(g,'iron_sword','ada','nio'));assert.ok(g.dispatch({type:'equip',item:'iron_sword',actor:'ada',source:'nio'}));
  assert.equal(g.state.gear.equipped.ada.weapon,second);assert.equal(g.state.gear.items[second].salt,2);
  assert.ok(g.dispatch({type:'equip',item:'hand_axe',actor:'ada',source:'shared'}));assert.deepEqual(heldGear(g.state,'iron_sword','ada'),[second]);
  const axe=g.state.gear.equipped.ada.weapon;assert.ok(g.dispatch({type:'unequip',actor:'ada',slot:'weapon'}));assert.deepEqual(heldGear(g.state,'hand_axe','ada'),[axe]);
  assert.ok(g.dispatch({type:'equip',item:'iron_sword',actor:'ada',source:'ada'}));assert.ok(g.dispatch({type:'job.change',actor:'ada',job:'mage'}));
  assert.deepEqual(heldGear(g.state,'iron_sword','ada'),[second]);assert.equal(g.state.gear.items[first].salt,9);assert.equal(g.state.gear.items[second].salt,2);
  assert.deepEqual(validateSave(JSON.parse(g.save()),data),[]);
});

test('departure returns carried supplies to the shared bag and current saves validate ownership atomically',()=>{
  const g=newGame();stock(g,'potion',3);stock(g,'iron_sword',1);transfer(g,'potion','shared','ada',2);transfer(g,'iron_sword','shared','ada');
  const saved=g.save();g.load(saved);assert.equal(g.save(),saved);
  for(const corrupt of [s=>s.carried.ada.potion=4,s=>s.carried.ada.potion=-1,s=>s.carried.missing={potion:1},s=>s.carried.ada.iron_sword=1,s=>s.gear.items[s.gear.bag.iron_sword[0]].holder='missing']){
    const save=JSON.parse(saved);corrupt(save.state);assert.throws(()=>g.load(JSON.stringify(save)));assert.equal(g.save(),saved);
  }
  assert.ok(g.dispatch({type:'party',action:'leave',actor:'ada'}));assert.equal(count(g,'potion','shared'),3);assert.equal(count(g,'iron_sword','shared'),1);assert.equal(g.state.carried.ada,undefined);
  assert.deepEqual(validateSave(JSON.parse(g.save()),data),[]);
});

test('preparations allow equipment changes in an idle dungeon and block changes during conversations or battle',()=>{
  const g=newGame();stock(g,'iron_sword',1);g.dispatch({type:'travel',dungeon:'kagaribi'});
  assert.ok(g.dispatch({type:'equip',item:'iron_sword',actor:'ada',source:'shared'}));assert.ok(g.dispatch({type:'unequip',actor:'ada',slot:'weapon'}));assert.equal(count(g,'iron_sword','ada'),1);
  g.run('item.ration');assert.ok(g.state.waiting);
  let before=resources(g);assert.equal(transfer(g,'iron_sword','ada','nio'),false);assert.equal(g.dispatch({type:'equip',actor:'ada',item:'iron_sword',source:'ada'}),false);assert.deepEqual(resources(g),before);drain(g);
  g.startBattle('wild_pair_1',{win:[],lose:[],escape:[]});before=resources(g);assert.equal(transfer(g,'iron_sword','ada','nio'),false);assert.equal(g.dispatch({type:'unequip',actor:'ada',slot:'weapon'}),false);assert.deepEqual(resources(g),before);
});

function screen(layout){
  const dom=installDOM(),g=newGame(),intents=[];goTownLocation(g,'hikarigaeri_shop');let view;
  const dispatch=intent=>{intents.push(intent);const changed=g.dispatch(intent);view.render(projectGame(g));return changed;};
  view=replaceView(null,layout,dom.root,dispatch,{status(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));
  const panel=tab=>{view.tab=tab;view.render(projectGame(g));};
  const key=key=>handleGameKey({key,preventDefault(){this.defaultPrevented=true;}},{view,model:view.model,dispatch,activeElement:dom.document.activeElement});
  const button=key=>dom.root.querySelector(`[data-focus="${key}"]`);
  const click=key=>{const b=button(key);assert.ok(b,key);assert.ok(!b.disabled,key);b.focus();b.click();};
  return {...dom,g,view,intents,panel,key,button,click,close(){view.destroy();dom.restore();}};
}
for(const layout of ['scene','classic']){
  test(`${layout}: shop has prominent gold and portrait recipient selection; cancel is free and purchase happens once`,()=>{
    const c=screen(layout);try{
      c.panel('bag');assert.equal(c.root.querySelector('.shop-panel'),null);assert.equal(c.root.querySelector('[data-control-group="shop:potion"]'),null);
      c.panel('shop');assert.match(c.root.querySelector('.shop-gold').textContent,/120 G/);assert.equal(c.root.querySelector('.inventory-holders'),null);
      const saved=c.g.save();c.click('shop:item:iron_sword');assert.equal(c.g.save(),saved);assert.equal(c.intents.length,0);
      assert.equal(c.document.activeElement.dataset.focus,'inventory:target:ada');assert.ok(c.button('inventory:target:ada').querySelector('img'));
      assert.match(c.button('inventory:target:ada').textContent,/装備可/);assert.match(c.button('inventory:target:sera').textContent,/装備不可/);assert.ok(!c.button('inventory:target:sera').disabled);
      c.key('Escape');assert.equal(c.document.activeElement.dataset.focus,'shop:item:iron_sword');assert.equal(c.g.save(),saved);
      c.click('shop:item:iron_sword');c.click('inventory:target:sera');assert.equal(c.intents.length,1);assert.equal(count(c.g,'iron_sword','sera'),1);assert.equal(c.g.state.actors.sera.equipment.weapon,undefined);
      assert.match(c.root.querySelector('.shop-gold').textContent,/25 G/);c.click('shop:item:iron_sword');assert.match(c.root.querySelector('.inventory-choice').textContent,/足りません/);assert.ok(c.button('inventory:target:ada').disabled);
    }finally{c.close();}
  });
  test(`${layout}: preparations select the holder, transfer, use, equip and remove with reversible selection steps`,()=>{
    const c=screen(layout);try{
      c.g.give('iron_sword',1);c.panel('bag');c.click('inventory:transfer:potion');const saved=c.g.save();c.key('Escape');assert.equal(c.g.save(),saved);
      c.click('inventory:transfer:potion');c.click('inventory:target:nio');c.click('inventory:holder:nio');assert.equal(c.view.bagActor,'nio');assert.match(c.root.querySelector('.inventory-panel').textContent,/味方1人のHPを45回復/);
      c.g.state.actors.ada.hp=1;c.panel('bag');c.click('inventory:use:potion');c.click('inventory:target:ada');assert.equal(count(c.g,'potion','nio'),0);assert.equal(c.g.state.actors.ada.hp,46);
      c.click('inventory:holder:shared');c.click('inventory:equip:iron_sword');assert.ok(c.button('inventory:target:sera').disabled);c.click('inventory:target:ada');assert.equal(c.g.state.actors.ada.equipment.weapon,'iron_sword');
      c.click('inventory:holder:ada');c.click('inventory:unequip:weapon');assert.equal(count(c.g,'iron_sword','ada'),1);assert.equal(c.g.state.actors.ada.equipment.weapon,undefined);
    }finally{c.close();}
  });
}
