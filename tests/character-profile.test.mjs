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
  test(`${layout}: skill pages hide unlearned abilities and retain learned location restrictions`,()=>{
    const c=screen(layout);try{
      c.g.award(0,c.g.data.system.xpBase*2);assert.equal(c.g.state.actors.nio.level,2);
      c.view.profileActor='nio';c.view.profilePage='skills';c.panel('profile');
      assert.ok(!c.root.querySelector('[data-focus="profile:town:use:survey"]'),'町の一覧に未習得の周辺測量を表示しない');
      assert.ok(c.root.querySelector('[data-focus="profile:town:use:climb_route"]'));
      assert.ok(c.g.dispatch({type:'travel',dungeon:'kagaribi'}));const saved=c.g.save();
      c.panel('party');c.click('roster:party:nio');c.click('profile:party:skills');
      const content=c.root.querySelector('[data-profile="party"] .profile-content');
      assert.doesNotMatch(content.textContent,/周辺測量|習得していません/);
      assert.ok(!content.querySelector('[data-focus="profile:party:use:survey"]'),'隊の一覧に未習得の周辺測量を表示しない');
      const climb=content.querySelector('[data-focus="profile:party:use:climb_route"]');
      assert.ok(climb?.disabled);assert.match(climb.parentElement.textContent,/登攀誘導/);
      assert.equal(climb.parentElement.querySelector('.requirement').textContent,'この迷宮ではこの探索スキルを使えません。');
      assert.equal(c.g.save(),saved);assert.equal(c.intents.length,0);
    }finally{c.close();}
  });
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
  test(`${layout}: detox keeps every target with its own state and returns focus safely after curing`,()=>{
    const c=screen(layout);try{
      assert.ok(c.g.dispatch({type:'party',action:'join',actor:'berg'}));c.g.state.actors.nio.statuses=['poison'];c.g.state.actors.ada.statuses=['wet'];
      const saved=c.g.save();c.view.profileActor='sera';c.view.profilePage='magic';c.panel('profile');assert.equal(c.g.save(),saved);
      const entry=()=>c.root.querySelector('[data-field-skill="cleanse"]'),rows=()=>entry().querySelectorAll('.profile-field-target');
      assert.deepEqual(rows().map(row=>row.dataset.target),c.g.state.members);
      for(const row of rows()){
        const id=row.dataset.target,use=row.querySelector('button');
        assert.equal(row.querySelector('.profile-target-name').textContent,c.g.data.actors[id].name);
        assert.equal(use.disabled,id!=='nio');assert.equal(use.textContent,'使う');
        assert.equal(use.getAttribute('aria-label'),`${c.g.data.actors[id].name}に解毒を使う`);
        for(const description of use.getAttribute('aria-describedby').split(' '))assert.ok(c.root.querySelector(`[id="${description}"]`));
        assert.equal(row.querySelector('.profile-target-vitals'),null);assert.doesNotMatch(row.textContent,/HP|MP/);
        if(id==='nio')assert.equal(row.querySelector('.profile-target-status').textContent,'毒');
        else if(id==='ada'){assert.match(row.querySelector('.profile-target-status').textContent,/濡れ/);assert.equal(row.querySelector('.profile-target-reason').textContent,'毒ではありません。');}
        else{assert.equal(row.querySelector('.profile-target-status').textContent,'毒ではありません。');assert.equal(row.querySelector('.profile-target-reason'),null);assert.doesNotMatch(row.textContent,/状態異常なし/);}
      }
      assert.equal(entry().querySelectorAll('.profile-field-reason').length,0);
      for(const vitals of c.root.querySelector('[data-field-skill="heal"]').querySelectorAll('.profile-target-vitals')){assert.match(vitals.textContent,/^HP \d+\/\d+$/);assert.doesNotMatch(vitals.textContent,/MP/);}
      const content=c.root.querySelector('.profile-content');content.scrollTop=140;const mp=c.g.state.actors.sera.mp;
      c.click('profile:town:use:cleanse:nio');
      assert.deepEqual(c.intents.at(-1),{type:'field.skill',actor:'sera',skill:'cleanse',target:'nio'});
      assert.deepEqual(c.g.state.actors.nio.statuses,[]);assert.deepEqual(c.g.state.actors.ada.statuses,['wet']);assert.equal(c.g.state.actors.sera.mp,mp-2);
      assert.deepEqual(rows().map(row=>row.dataset.target),c.g.state.members);
      assert.ok(rows().every(row=>row.querySelector('button').disabled));
      assert.equal(entry().querySelector('[data-target="nio"] .profile-target-status').textContent,'毒ではありません。');assert.equal(entry().querySelector('[data-target="nio"] .profile-target-reason'),null);
      assert.equal(c.document.activeElement.dataset.focus,'profile:town:magic');assert.equal(c.root.querySelector('.profile-content').scrollTop,140);
      const cured=c.g.save();c.key('Enter');assert.equal(c.g.save(),cured);assert.equal(c.intents.filter(intent=>intent.type==='field.skill').length,1);
    }finally{c.close();}
  });
  test(`${layout}: dungeon party spells show one MP restriction while preserving each target's condition`,()=>{
    const c=screen(layout);try{
      assert.ok(c.g.dispatch({type:'travel',dungeon:'kagaribi'}));c.g.state.actors.nio.statuses=['poison'];c.g.state.actors.sera.mp=1;
      const saved=c.g.save();c.panel('party');c.click('roster:party:sera');c.click('profile:party:magic');
      const entry=c.root.querySelector('[data-profile="party"] [data-field-skill="cleanse"]'),reason=entry.querySelector('.profile-field-reason');
      assert.equal(entry.querySelectorAll('.profile-field-reason').length,1);assert.match(reason.textContent,/MP/);
      assert.match(entry.textContent,/現在MP 1\//);assert.equal(entry.querySelectorAll('.profile-target-reason').length,0);
      const rows=entry.querySelectorAll('.profile-field-target');assert.deepEqual(rows.map(row=>row.dataset.target),c.g.state.members);
      for(const row of rows){
        const use=row.querySelector('button');assert.ok(use.disabled);assert.ok(use.getAttribute('aria-describedby').split(' ').includes(reason.id));
      }
      assert.match(entry.querySelector('[data-target="nio"] .profile-target-status').textContent,/毒/);
      assert.equal(c.g.save(),saved);assert.equal(c.intents.length,0);
    }finally{c.close();}
  });
  test(`${layout}: group recovery displays the whole party beneath one shared use operation`,()=>{
    const c=screen(layout);try{
      c.g.award(0,3600);c.g.state.actors.ada.statuses=['poison','wet'];c.g.state.actors.nio.statuses=['poison'];
      c.view.profileActor='sera';c.view.profilePage='magic';c.panel('profile');
      const entry=c.root.querySelector('[data-field-skill="purify"]'),rows=entry.querySelectorAll('.profile-field-target');
      assert.equal(rows.length,1);assert.equal(rows[0].querySelector('.profile-target-name').textContent,'仲間全員');
      assert.deepEqual(rows[0].querySelectorAll('.profile-target-member').map(member=>member.dataset.member),c.g.state.members);
      assert.deepEqual(rows[0].querySelectorAll('.profile-target-member-name').map(name=>name.textContent),c.g.state.members.map(id=>c.g.data.actors[id].name));
      assert.equal(entry.querySelectorAll('.profile-target-vitals').length,0);
      assert.equal(entry.querySelectorAll('button').length,1);assert.equal(entry.querySelector('button').getAttribute('aria-label'),'仲間全員に清浄の祈りを使う');
      const mp=c.g.state.actors.sera.mp;c.click('profile:town:use:purify:sera');
      assert.deepEqual(c.g.state.actors.ada.statuses,[]);assert.deepEqual(c.g.state.actors.nio.statuses,[]);assert.equal(c.g.state.actors.sera.mp,mp-c.g.data.skills.purify.mp);
      assert.equal(c.document.activeElement.dataset.focus,'profile:town:magic');
    }finally{c.close();}
  });
  test(`${layout}: self healing on the skills page keeps focus when the same action remains usable`,()=>{
    const c=screen(layout);try{
      c.g.award(0,3600);assert.ok(c.g.dispatch({type:'job.change',actor:'ada',job:'monk'}));c.g.state.actors.ada.hp=1;
      c.view.profileActor='ada';c.view.profilePage='skills';c.panel('profile');
      const entry=c.root.querySelector('[data-field-skill="breathe"]');assert.equal(entry.querySelectorAll('.profile-field-target').length,1);
      assert.deepEqual(entry.querySelectorAll('.profile-target-member').map(member=>member.dataset.member),['ada']);
      assert.equal(entry.querySelector('.profile-target-vitals').textContent,`HP 1/${c.g.stats('ada').hp}`);
      const key='profile:town:use:breathe:ada',mp=c.g.state.actors.ada.mp;c.click(key);
      assert.ok(c.g.state.actors.ada.hp>1&&c.g.state.actors.ada.hp<c.g.stats('ada').hp);assert.equal(c.g.state.actors.ada.mp,mp-c.g.data.skills.breathe.mp);
      assert.ok(!c.root.querySelector(`[data-focus="${key}"]`).disabled);assert.equal(c.document.activeElement.dataset.focus,key);
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
