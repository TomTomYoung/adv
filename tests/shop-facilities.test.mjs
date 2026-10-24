import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,goTownLocation} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {skillPurchasePlan,expeditionDefinitionErrors} from '../src/core/expedition.js';
import {projectGame} from '../src/application/projection.js';
import {validateSave} from '../src/core/save.js';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';

function ready(){
  const g=newGame();g.data=structuredClone(data);delete g.data.quests.q001.story;
  g.accept('q001');g.complete('q001','informed');drain(g);
  g.state.flags.kagaribi={kilnGate:true};g.teleport('kagaribi_relay',1,1,'east');
  assert.ok(g.dispatch({type:'expedition.action',camp:'kagaribi_relay',action:'repair'}));
  assert.ok(g.dispatch({type:'expedition.action',camp:'kagaribi_relay',action:'relay'}));
  assert.ok(g.returnTown());g.state.expedition.gems=1000;g.give('iron_sword',1);
  assert.ok(g.dispatch({type:'equip',actor:'ada',item:'iron_sword'}));
  return g;
}
const purchase={type:'skill.buy',actor:'ada',skill:'exp_row_sweep',level:1};

test('the square connects separate item and skill stores with exclusive purchase permissions',()=>{
  const g=ready(),square=projectGame(g);
  assert.notEqual(data.expedition.shopLocation,data.expedition.skillShopLocation);
  for(const id of [data.expedition.shopLocation,data.expedition.skillShopLocation])assert.ok(square.town.links.some(l=>l.id===id));
  goTownLocation(g,data.expedition.shopLocation);let model=projectGame(g);
  assert.equal(model.town.shop,true);assert.equal(model.expedition.shop,true);assert.equal(model.expedition.skillShop,false);assert.deepEqual(model.expedition.products,[]);
  const gems=g.state.expedition.gems;assert.equal(g.dispatch(purchase),false);assert.equal(g.state.expedition.gems,gems);
  assert.match(skillPurchasePlan(g.data,g.state,'ada','exp_row_sweep',1).reason,/スキル屋/);
  assert.ok(g.dispatch({type:'buy',item:'potion',actor:'ada'}));
  goTownLocation(g,data.expedition.skillShopLocation);model=projectGame(g);
  assert.equal(model.town.shop,false);assert.equal(model.expedition.shop,false);assert.equal(model.expedition.skillShop,true);
  assert.equal(model.expedition.products.length,Object.keys(data.expedition.products).length);
  const gold=g.state.gold;
  assert.equal(g.dispatch({type:'buy',item:'potion',actor:'ada'}),false);
  assert.equal(g.dispatch({type:'weapon.craft',item:'exp_t1_sword'}),false);
  assert.equal(g.dispatch({type:'expedition.action',action:'upgrade_capacity'}),false);
  assert.equal(g.dispatch({type:'expedition.action',action:'withdraw'}),false);assert.equal(g.state.gold,gold);
  assert.ok(g.dispatch(purchase));assert.equal(g.state.expedition.gems,gems-120);
  assert.equal(g.state.expedition.learned.ada.exp_row_sweep,1);
});

test('saved visits keep the old item-store position and learned skills, then save the new skill-store position',()=>{
  const original=ready();goTownLocation(original,data.expedition.skillShopLocation);assert.ok(original.dispatch(purchase));
  goTownLocation(original,data.expedition.shopLocation);
  const oldShopSave=original.save(),restored=new GameEngine(original.data);restored.load(oldShopSave);
  assert.equal(restored.save(),oldShopSave);assert.equal(restored.state.townLocation,'hikarigaeri_shop');
  assert.equal(restored.state.expedition.learned.ada.exp_row_sweep,1);
  goTownLocation(restored,data.expedition.skillShopLocation);
  const newShopSave=restored.save();assert.deepEqual(validateSave(JSON.parse(newShopSave),original.data),[]);
  restored.load(newShopSave);assert.equal(restored.save(),newShopSave);
  assert.equal(restored.state.townLocation,'hikarigaeri_skill_shop');
  const invalid=structuredClone(data);invalid.expedition.skillShopLocation=invalid.expedition.shopLocation;
  assert.ok(expeditionDefinitionErrors(invalid).length,'the two stores cannot be merged by a config edit');
});

for(const layout of ['classic','scene'])test(`${layout}: item, supply and skill screens have separate entry/exit and preserve learner selection`,()=>{
  const g=ready(),dom=installDOM();let view;const intents=[];
  const ui={status(){},menu(){},help(){},sound(){},soundEnabled:()=>false,effectsMode:()=> 'off'};
  const dispatch=intent=>{intents.push(intent);const accepted=g.dispatch(intent);view.render(projectGame(g));return accepted;};
  const click=label=>{const b=[...dom.root.querySelectorAll('.location-choices button')].find(b=>b.textContent===label);assert.ok(b,`${label} command`);b.focus();b.click();};
  try{
    view=replaceView(null,layout,dom.root,dispatch,ui);view.render(projectGame(g));
    click('旅道具店');click('ショップを見る');
    assert.equal(view.tab,'shop');assert.ok(dom.root.querySelector('.shop-products'));
    assert.equal(dom.root.querySelector('.skill-shop'),null);assert.equal(dom.root.querySelector('.supply-panel'),null);
    view.cancel();assert.equal(view.tab,'location');click('補給・工房を見る');
    assert.equal(view.tab,'supply');assert.ok(dom.root.querySelector('.supply-panel'));
    assert.equal(dom.root.querySelector('.shop-products'),null);assert.equal(dom.root.querySelector('.skill-shop'),null);
    assert.ok([...dom.root.querySelectorAll('.supply-panel button')].some(b=>b.textContent==='空き容量まで保管油を受け取る'));
    view.cancel();click('灯帰り・篝火広場へ戻る');click('スキル屋');click('スキル屋を見る');
    assert.equal(view.tab,'skills');assert.equal(dom.root.querySelector('.shop-products'),null);assert.equal(dom.root.querySelector('.supply-panel'),null);
    assert.equal(dom.root.querySelectorAll('.skill-shop-card').length,Object.keys(data.expedition.products).length);
    const before=g.save(),actor=dom.root.querySelector('[data-focus="skill-shop:actor:sera"]');actor.focus();actor.click();
    assert.equal(view.skillShopActor,'sera');assert.equal(g.save(),before);
    assert.equal(dom.document.activeElement.dataset.focus,'skill-shop:actor:sera');
    view=replaceView(view,layout==='scene'?'classic':'scene',dom.root,dispatch,ui);view.render(projectGame(g));
    assert.equal(view.tab,'skills');assert.equal(view.skillShopActor,'sera');
    assert.equal(dom.root.querySelector('[data-focus="skill-shop:actor:sera"]').getAttribute('aria-pressed'),'true');
    const ada=dom.root.querySelector('[data-focus="skill-shop:actor:ada"]');ada.focus();ada.click();
    dom.root.querySelector('.skill-shop-products').scrollTop=240;
    const buy=dom.root.querySelector('[data-focus="skill-shop:exp_row_sweep:ada"]');buy.focus();buy.click();
    assert.equal(intents.filter(i=>i.type==='skill.buy').length,1);assert.equal(g.state.expedition.learned.ada.exp_row_sweep,1);
    assert.equal(dom.root.querySelector('.skill-shop-products').scrollTop,240);
    assert.equal(dom.document.activeElement.dataset.focus,'skill-shop:exp_row_sweep:ada');
    view.cancel();assert.equal(view.tab,'location');view.cancel();assert.equal(g.state.townLocation,data.game.world.townRoot);
    view.tab='skills';view.render(projectGame(g));assert.equal(view.tab,'location');
    view.tab='supply';view.render(projectGame(g));assert.equal(view.tab,'location');
  }finally{view?.destroy();dom.restore();}
});
