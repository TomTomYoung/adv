import test from 'node:test';
import assert from 'node:assert/strict';
import {installDOM} from './view-dom.mjs';
import {newGame,goTownLocation} from './helpers.mjs';
import {projectGame} from '../src/application/projection.js';
import {replaceView} from '../src/view/view-layout.js';
import {handleGameKey} from '../src/view/keyboard.js';
function screen(layout){
  const dom=installDOM(),g=newGame(),intents=[];let view;
  const dispatch=intent=>{intents.push(intent);const changed=g.dispatch(intent);view.render(projectGame(g));return changed;};
  view=replaceView(null,layout,dom.root,dispatch,{status(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));
  const click=key=>{const b=dom.root.querySelector(`[data-focus="${key}"]`);assert.ok(b,key);assert.ok(!b.disabled,key);b.focus();b.click();};
  const key=key=>handleGameKey({key,preventDefault(){}},{view,model:view.model,dispatch});
  return {...dom,g,view,intents,click,key,panel(tab){view.render(projectGame(g));view.tab=tab;view.render(projectGame(g));},close(){view.destroy();dom.restore();}};
}
for(const layout of ['scene','classic']){
  test(`${layout}: arrows beside join/leave move only the selected character and retain profile and keyboard focus`,()=>{
    const c=screen(layout);try{
      c.panel('party');const party=[...c.g.state.members],reserve=c.view.model.roster.filter(a=>!a.active).map(a=>a.id);
      for(const group of ['party','tavern'])assert.deepEqual(c.root.querySelector(`.${group}-picker .party-list-actions`).children.map(b=>b.textContent),[group==='party'?'待機':'加入','△','▽']);
      assert.ok(c.root.querySelector('[data-focus="roster:party:up"]').disabled);
      c.click(`roster:party:${party[1]}`);c.click('profile:party:items');c.click('roster:party:up');
      assert.deepEqual(c.g.state.members,[party[1],party[0],...party.slice(2)]);assert.equal(c.view.partySelection.party,party[1]);assert.equal(c.view.partyPages.party,'items');
      assert.equal(c.document.activeElement.dataset.focus,`roster:party:${party[1]}`);assert.ok(c.root.querySelector('[data-focus="roster:party:up"]').disabled);
      c.click('roster:party:down');assert.equal(c.document.activeElement.dataset.focus,'roster:party:down');assert.deepEqual(c.g.state.members,party);
      c.key('Enter');assert.equal(c.g.state.members[2],party[1]);assert.equal(c.intents.at(-1).type,'party.order');
      c.click(`roster:tavern:${reserve.at(-1)}`);assert.ok(c.root.querySelector('[data-focus="roster:tavern:down"]').disabled);
      const unchanged=[...c.g.state.members];c.click('roster:tavern:up');assert.deepEqual(c.g.state.members,unchanged);assert.equal(c.view.partySelection.tavern,reserve.at(-1));
      assert.equal(c.view.model.roster.filter(a=>!a.active).at(-2).id,reserve.at(-1));assert.equal(c.root.querySelector('[data-profile="tavern"]').dataset.actor,reserve.at(-1));
    }finally{c.close();}
  });
  test(`${layout}: town cards open the chosen actor, pages preserve state, and jobs are separate`,()=>{
    const c=screen(layout);try{
      const save=c.g.save();c.click('character:il');assert.equal(c.view.tab,'profile');assert.equal(c.root.querySelector('[data-profile="town"]').dataset.actor,'il');
      assert.ok(c.root.querySelector('.profile-portrait'));assert.match(c.root.querySelector('.profile-content').textContent,/魔術師/);
      assert.equal(c.root.querySelector('.job-panel'),null);
      c.click('profile:town:magic');assert.match(c.root.querySelector('.profile-content').textContent,/灯火の術/);
      c.click('profile:town:skills');assert.doesNotMatch(c.root.querySelector('.profile-content').textContent,/灯火の術/);
      c.click('profile:town:items');assert.match(c.root.querySelector('.profile-content').textContent,/所持アイテム/);
      assert.equal(c.g.save(),save);assert.equal(c.intents.length,0);
      c.key('Escape');assert.equal(c.view.profilePage,'overview');c.key('Escape');assert.equal(c.view.tab,'location');
      c.click('character:ada');assert.equal(c.root.querySelector('[data-profile="town"]').dataset.actor,'ada');
      c.click('profile:town:jobs');assert.ok(c.root.querySelector('.job-panel'));
    }finally{c.close();}
  });
  test(`${layout}: party and tavern selections are independent and only selected actors join or leave`,()=>{
    const c=screen(layout);try{
      c.panel('party');
      assert.equal(c.root.querySelector('.party-board').children.length,4);
      assert.equal(c.root.querySelectorAll('.job-panel, .field-skills').length,0);
      assert.equal(c.root.querySelectorAll('[data-focus="roster:party:apply"]').length,1);assert.equal(c.root.querySelectorAll('[data-focus="roster:tavern:apply"]').length,1);
      const saved=c.g.save();c.click('roster:party:nio');const candidate=c.view.model.roster.find(a=>!a.active);c.click(`roster:tavern:${candidate.id}`);
      assert.equal(c.root.querySelector('[data-profile="party"]').dataset.actor,'nio');assert.equal(c.root.querySelector('[data-profile="tavern"]').dataset.actor,candidate.id);
      c.root.querySelector('.tavern-picker .party-card-list').scrollTop=150;c.click('profile:party:items');assert.equal(c.root.querySelector('.tavern-picker .party-card-list').scrollTop,150);assert.equal(c.root.querySelector('[data-profile="tavern"]').dataset.actor,candidate.id);assert.equal(c.g.save(),saved);
      c.key('Escape');assert.equal(c.view.partyPages.party,'overview');
      c.click('roster:party:apply');assert.ok(!c.g.state.members.includes('nio'));assert.equal(c.intents.at(-1).actor,'nio');
      c.click(`roster:tavern:${candidate.id}`);c.click('roster:tavern:apply');assert.ok(c.g.state.members.includes(candidate.id));assert.equal(c.intents.at(-1).actor,candidate.id);
      assert.ok(c.root.querySelector('[data-profile="party"]').dataset.actor!=='nio');
    }finally{c.close();}
  });
  test(`${layout}: shop keeps all products and recipient counts visible through selection and purchase`,()=>{
    const c=screen(layout);try{
      goTownLocation(c.g,'hikarigaeri_shop');c.g.state.gold=1000;c.panel('shop');
      assert.equal(c.root.querySelectorAll('.shop-product').length,c.view.model.shop.length);assert.equal(c.root.querySelectorAll('.shop-character-cards button').length,c.view.model.party.length);
      c.click('shop:item:iron_sword');assert.match(c.root.querySelector('.shop-details').textContent,/力 \+5/);assert.equal(c.root.querySelectorAll('.shop-product').length,c.view.model.shop.length);
      c.click('inventory:target:ada');assert.match(c.root.querySelector('[data-focus="inventory:target:ada"]').textContent,/所持 1個 \/ 装備中 0個/);
      assert.ok(c.g.dispatch({type:'equip',actor:'ada',item:'iron_sword',source:'ada'}));c.panel('shop');
      assert.match(c.root.querySelector('[data-focus="inventory:target:ada"]').textContent,/所持 0個 \/ 装備中 1個/);
      c.g.state.gold=0;c.panel('shop');c.click('shop:item:potion');assert.match(c.root.querySelector('.shop-details').textContent,/HPを45回復/);assert.ok(c.root.querySelector('[data-focus="inventory:target:ada"]').disabled);
      assert.equal(c.root.querySelectorAll('.shop-character-cards button').length,4);
    }finally{c.close();}
  });
}
test('profile projections preserve personal inventory, classify spells separately from techniques and do not mutate state',()=>{
  const g=newGame();g.dispatch({type:'inventory.transfer',item:'potion',from:'shared',to:'ada',count:1});const saved=g.save(),m=projectGame(g);
  assert.equal(m.party.find(a=>a.id==='ada').items.find(i=>i.id==='potion').count,1);
  assert.equal(m.party.find(a=>a.id==='il').skills.find(i=>i.id==='fire').category,'magic');assert.equal(m.party[0].skills.find(i=>i.id==='attack').category,'skills');
  m.party[0].items[0].count=99;assert.equal(g.save(),saved);
});
