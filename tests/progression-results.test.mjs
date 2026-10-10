import {execFileSync} from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {validateContent} from '../src/core/validation.js';
import {projectGame} from '../src/application/projection.js';
import {fieldSkillPlan} from '../src/core/field-skills.js';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
import {handleGameKey} from '../src/view/keyboard.js';
const copy=g=>{const saved=g.save(),h=new GameEngine(g.data);h.load(saved);assert.equal(h.save(),saved);return h;};
function victory({xp=80,chance=1,pair=false,script=false}={}){
  const g=newGame();g.data=structuredClone(data);
  const e=g.data.enemies.waterwheel_beaver;e.rewards={gold:7,xp};e.drop={item:'potion',chance};
  const encounter='wild_waterwheel_beaver';if(pair)g.data.encounters[encounter].enemies.push('waterwheel_beaver');
  if(script){g.data.scripts.result_probe={commands:[{op:'battle.start',encounter,on_win:[{op:'flag.set',key:'after_result',value:true},{op:'say',text:'勝利後の会話'}],on_lose:[],on_escape:[]}]};g.run('result_probe');}
  else g.startBattle(encounter,{win:[],lose:[],escape:[]});
  for(const e of g.state.battle.enemies)e.hp=0;
  g.finishBattle('win');return g;
}
test('experience and job growth belong to living active characters; reserves stay at their own level',()=>{
  const g=newGame(),reserve=structuredClone(g.state.actors.berg);g.state.actors.nio.hp=0;
  const levels=g.award(0,80);
  assert.deepEqual(levels.map(x=>x.actor),['ada','sera','il']);assert.equal(g.state.actors.ada.level,2);assert.equal(g.state.actors.nio.level,1);assert.equal(g.state.actors.nio.xp,0);assert.equal(g.state.actors.nio.hp,0);assert.deepEqual(g.state.actors.berg,reserve);
  g.healAll();assert.ok(g.dispatch({type:'party',action:'leave',actor:'ada'}));assert.ok(g.dispatch({type:'party',action:'join',actor:'berg'}));g.award(0,80);
  assert.equal(g.state.actors.ada.xp,80);assert.equal(g.state.actors.berg.level,2);assert.equal(g.state.actors.sera.xp,160);
  assert.ok(g.dispatch({type:'job.change',actor:'berg',job:'priest'}));assert.equal(g.state.actors.berg.level,2);assert.deepEqual(g.state.actors.berg.growthHistory,{knight:1});
  assert.ok(!g.skills('berg').includes('greater_heal'));g.award(0,720);assert.ok(g.skills('berg').includes('greater_heal'));assert.deepEqual(g.state.actors.berg.growthHistory,{knight:1,priest:3});copy(g);
});
test('quest completion awards only current living party members',()=>{
  const g=newGame();g.data=structuredClone(data);const q=g.data.quests.q001;delete q.story;
  g.accept('q001');g.state.actors.nio.hp=0;const outcome=Object.keys(q.outcomes)[0],xp=q.outcomes[outcome].xp;
  g.complete('q001',outcome);assert.equal(g.state.actors.ada.xp,xp);assert.equal(g.state.actors.nio.xp,0);assert.equal(g.state.actors.berg.xp,0);
});
test('result → each level-up → chest → acquisition → continuation, with exact save/load at every step',()=>{
  let g=victory({script:true}),loaded=copy(g);const xp=g.state.actors.ada.xp,gold=g.state.gold,items=g.state.inventory.potion,rng=g.state.rng;
  const phases=[];
  while(g.state.battleResult){
    phases.push(g.state.battleResult.phase);assert.equal(g.state.flags.after_result,undefined);
    assert.equal(g.dispatch({type:'party',action:'leave',actor:'ada'}),false);
    assert.equal(g.dispatch({type:'move',direction:'forward'}),false);
    assert.equal(g.dispatch({type:'field.skill',actor:'sera',skill:'heal',target:'ada'}),false);
    assert.equal(g.dispatch({type:'choose',id:'cancel'}),false);
    if(['result','level'].includes(g.state.battleResult.phase)){assert.equal(g.state.rng,rng);assert.equal(g.state.inventory.potion,items);}
    if(g.state.battleResult.phase==='level')assert.equal(projectGame(g).dialog.rewardPhase,'level');
    g=copy(g);g.dispatch({type:'advance'});loaded.dispatch({type:'advance'});assert.equal(g.save(),loaded.save());
  }
  assert.deepEqual(phases,['result','level','level','level','level','chest','item']);assert.equal(g.state.actors.ada.xp,xp);assert.equal(g.state.gold,gold);assert.equal(g.state.inventory.potion,items+1);assert.equal(g.state.flags.after_result,true);assert.equal(g.state.waiting.text,'勝利後の会話');copy(g);
});
test('no drop skips chest; duplicate monsters combine items; overflow is explicit and equipment uses instances',()=>{
  const no=victory({xp:0,chance:0}),rng=no.state.rng;no.dispatch({type:'advance'});assert.equal(no.state.battleResult,null);assert.equal(no.state.rng,rng);
  const pair=victory({xp:0,pair:true}),before=pair.state.inventory.potion;pair.dispatch({type:'advance'});assert.equal(pair.state.battleResult.phase,'chest');assert.equal(pair.state.inventory.potion,before);pair.dispatch({type:'advance'});assert.equal(pair.state.inventory.potion,before+2);copy(pair);drain(pair);
  const full=victory({xp:0});full.state.inventory.potion=99;full.dispatch({type:'advance'});full.dispatch({type:'advance'});assert.equal(full.state.inventory.potion,99);assert.match(full.state.waiting.text,/持ち帰れなかった/);copy(full);
  const gear=victory({xp:0});gear.data.enemies.waterwheel_beaver.drop.item='iron_sword';const count=gear.state.inventory.iron_sword??0;drain(gear);assert.equal(gear.state.inventory.iron_sword,count+1);assert.ok(gear.state.gear.bag.iron_sword.length);copy(gear);
});
test('escaping, repelling, interruption and defeat never run reward or treasure lotteries',()=>{
  for(const result of ['escape','repel','interrupted','lose']){
    const g=newGame();g.startBattle('wild_waterwheel_beaver',{win:[],lose:[],escape:[]});const rng=g.state.rng;g.finishBattle(result);
    assert.equal(g.state.battleResult,null);assert.equal(g.state.actors.ada.xp,0);assert.equal(g.state.rng,rng);
  }
});
test('multi-level gains cap at Lv30; forged progress or result state is rejected without changing the game',()=>{
  const g=newGame();g.award(0,34800);assert.equal(g.state.actors.ada.level,30);assert.equal(projectGame(g).party[0].nextXp,null);assert.equal(g.state.actors.berg.level,1);g.award(0,100);assert.equal(g.state.actors.ada.level,30);copy(g);
  for(const mutate of [s=>s.actors.ada.level=29,s=>s.actors.berg.xp=80,s=>delete s.actors.sera.level,s=>s.level=30,s=>s.battleResult={phase:'item'},s=>s.waiting={type:'battle_result',text:'x',speaker:''}]){
    const saved=g.save(),bad=JSON.parse(saved);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),saved);
  }
  const h=victory({xp:0});h.dispatch({type:'advance'});const saved=h.save();for(const mutate of [r=>r.drops[0].count=10,r=>r.drops[0].item='key_1',r=>r.index=99,r=>r.continuation=null]){const bad=JSON.parse(saved);mutate(bad.state.battleResult);assert.throws(()=>h.load(JSON.stringify(bad)));assert.equal(h.save(),saved);}
  const old=JSON.parse(g.save());old.contentVersion='1.22.0';old.state.contentVersion='1.22.0';assert.throws(()=>g.load(JSON.stringify(old)));
});
test('all authored monsters have validated drop settings',()=>{
  assert.ok(Object.values(data.enemies).every(e=>e.drop&&data.items[e.drop.item]));
  for(const drop of [{item:'missing',chance:.5},{item:'potion',chance:-.1},{item:'potion',chance:1.01},null]){const d=structuredClone(data);d.enemies.waterwheel_beaver.drop=drop;assert.ok(validateContent(d).some(s=>s.includes('宝箱')));}
});
test('field recovery shares MP, permission, effects and target rules; cleanse removes only poison',()=>{
  for(const dungeon of [false,true]){
    const g=newGame();if(dungeon)g.dispatch({type:'travel',dungeon:'kagaribi'});
    g.state.actors.ada.statuses=['poison','wet'];const mp=g.state.actors.sera.mp;
    assert.equal(g.dispatch({type:'field.skill',actor:'sera',skill:'cleanse',target:'ada'}),true);assert.deepEqual(g.state.actors.ada.statuses,['wet']);assert.equal(g.state.actors.sera.mp,mp-2);
    const saved=g.save();assert.equal(g.dispatch({type:'field.skill',actor:'sera',skill:'cleanse',target:'ada'}),false);assert.equal(g.state.actors.sera.mp,mp-2);
    g.state.actors.ada.hp=1;assert.ok(g.dispatch({type:'field.skill',actor:'sera',skill:'heal',target:'ada'}));assert.ok(g.state.actors.ada.hp>1);assert.equal(g.state.actors.sera.mp,mp-6);copy(g);
    for(const [actor,skill,target] of [['sera','fire','ada'],['berg','heal','ada'],['sera','heal','berg'],['sera','greater_heal','ada']]){const before=g.state.actors.sera.mp;assert.equal(g.dispatch({type:'field.skill',actor,skill,target}),false);assert.equal(g.state.actors.sera.mp,before);}
    g.state.actors.ada.hp=0;assert.equal(fieldSkillPlan(g,'sera','heal','ada').ok,false);g.state.actors.sera.mp=0;assert.equal(fieldSkillPlan(g,'sera','heal','nio').ok,false);
  }
});
test('field group purification, caster death, full healing and pause reject without partial costs',()=>{
  const g=newGame();g.award(0,3600);g.state.actors.ada.statuses=['poison','wet'];g.state.actors.nio.statuses=['poison'];const mp=g.state.actors.sera.mp;
  assert.ok(g.dispatch({type:'field.skill',actor:'sera',skill:'purify'}));assert.deepEqual(g.state.actors.ada.statuses,[]);assert.deepEqual(g.state.actors.nio.statuses,[]);assert.equal(g.state.actors.sera.mp,mp-data.skills.purify.mp);
  const unchanged=g.state.actors.sera.mp;assert.equal(g.dispatch({type:'field.skill',actor:'sera',skill:'greater_heal'}),false);assert.equal(g.state.actors.sera.mp,unchanged);
  g.state.actors.ada.hp=1;g.state.actors.sera.hp=0;assert.equal(fieldSkillPlan(g,'sera','heal','ada').ok,false);g.healAll();g.state.actors.ada.hp=1;g.run('prologue');assert.equal(fieldSkillPlan(g,'sera','heal','ada').ok,false);
});
test('field detox explains poison eligibility independently of HP and spends exactly two MP on success',()=>{
  const g=newGame(),a=g.state.actors.ada;
  for(const hp of [g.stats('ada').hp,1])for(const statuses of [[],['wet','hollow_curse']]){
    a.hp=hp;a.statuses=[...statuses];
    const before=structuredClone({actors:g.state.actors,inventory:g.state.inventory,rng:g.state.rng});
    assert.deepEqual(fieldSkillPlan(g,'sera','cleanse','ada'),{ok:false,reason:'毒ではありません。',reasonScope:'target'});
    assert.equal(g.dispatch({type:'field.skill',actor:'sera',skill:'cleanse',target:'ada'}),false);
    assert.deepEqual({actors:g.state.actors,inventory:g.state.inventory,rng:g.state.rng},before);
  }
  a.hp=g.stats('ada').hp;a.statuses=['poison','wet'];g.state.actors.sera.mp=2;
  assert.equal(fieldSkillPlan(g,'sera','cleanse','ada').ok,true);
  assert.equal(g.dispatch({type:'field.skill',actor:'sera',skill:'cleanse',target:'ada'}),true);
  assert.equal(a.hp,g.stats('ada').hp);assert.deepEqual(a.statuses,['wet']);assert.equal(g.state.actors.sera.mp,0);
  assert.equal(g.dispatch({type:'field.skill',actor:'sera',skill:'cleanse',target:'ada'}),false);assert.equal(g.state.actors.sera.mp,0);
});
test('field skill failure scopes distinguish target conditions from shared caster restrictions without costs',()=>{
  for(const {prepare,target='ada',scope,reason} of [
    {prepare:g=>{g.state.actors.ada.hp=0;},scope:'target',reason:'戦闘不能の仲間には使えません。'},
    {prepare:()=>{},target:'berg',scope:'target',reason:'出撃中の仲間を選んでください。'},
    {prepare:g=>{g.state.actors.sera.mp=1;},scope:'ability',reason:'MPが2必要です。'},
    {prepare:g=>{g.state.actors.sera.hp=0;},scope:'ability',reason:'倒れている仲間は使用できません。'},
    {prepare:g=>g.run('prologue'),scope:'ability',reason:'会話や戦闘が終わってから使う。'}
  ]){
    const g=newGame();g.state.actors.ada.statuses=['poison'];prepare(g);
    const before=structuredClone({actors:g.state.actors,inventory:g.state.inventory,rng:g.state.rng});
    assert.deepEqual(fieldSkillPlan(g,'sera','cleanse',target),{ok:false,reason,reasonScope:scope});
    assert.equal(g.dispatch({type:'field.skill',actor:'sera',skill:'cleanse',target}),false);
    assert.deepEqual({actors:g.state.actors,inventory:g.state.inventory,rng:g.state.rng},before);
  }
});
test('field no-op reasons distinguish single, group, MP and combined recovery while purification still clears all statuses',()=>{
  const g=newGame();g.award(0,3600);g.healAll();
  const unavailable=(skill,target,reason)=>assert.deepEqual(fieldSkillPlan(g,'sera',skill,target),{ok:false,reason,reasonScope:'target'});
  unavailable('heal','ada','HPは満タンです。');
  unavailable('greater_heal',undefined,'対象の仲間全員のHPは満タンです。');
  unavailable('purify',undefined,'解除できる状態異常がありません。');
  g.state.actors.ada.statuses=['wet','hollow_curse'];const mp=g.state.actors.sera.mp;
  assert.equal(g.dispatch({type:'field.skill',actor:'sera',skill:'purify'}),true);
  assert.deepEqual(g.state.actors.ada.statuses,[]);assert.equal(g.state.actors.sera.mp,mp-data.skills.purify.mp);
  assert.equal(g.dispatch({type:'job.change',actor:'sera',job:'bard'}),true);g.healAll();g.state.actors.ada.hp=1;
  unavailable('inspire','ada','MPは満タンです。');g.state.actors.ada.mp--;
  assert.equal(fieldSkillPlan(g,'sera','inspire','ada').ok,true);
  assert.equal(g.dispatch({type:'job.change',actor:'sera',job:'merchant'}),true);g.healAll();
  unavailable('emergency_ration',undefined,'対象の仲間全員のHP・MPは満タンです。');g.state.actors.ada.mp--;
  assert.equal(fieldSkillPlan(g,'sera','emergency_ration').ok,true);
  assert.equal(g.dispatch({type:'job.change',actor:'sera',job:'monk'}),true);g.healAll();
  unavailable('breathe',undefined,'HPは満タンです。');
});
for(const layout of ['scene','classic'])test(`${layout}: result messages advance with Enter; profile exposes personal XP and usable detox targets`,()=>{
  const dom=installDOM();let g=victory(),view;const dispatch=intent=>{const changed=g.dispatch(intent);view.render(projectGame(g));return changed;};
  try{
    view=replaceView(null,layout,dom.root,dispatch,{status(){},soundEnabled:()=>false,effectsMode:()=> 'off'});view.render(projectGame(g));
    assert.equal(dom.root.querySelector('.message-window').dataset.rewardPhase,'result');assert.match(dom.root.querySelector('.message-window').textContent,/80の経験値/);
    handleGameKey({key:'Enter',preventDefault(){}},{view,model:view.model,dispatch});assert.equal(g.state.battleResult.phase,'level');assert.ok(g.feedback.events.some(e=>e.sound==='se_complete'));assert.equal(dom.root.querySelector('.message-window').dataset.rewardPhase,'level');
    drain(g);view.render(projectGame(g));g.state.actors.ada.statuses=['poison'];view.profileActor='sera';view.profilePage='magic';view.tab='profile';view.render(projectGame(g));
    const use=dom.root.querySelector('[data-focus="profile:town:use:cleanse:ada"]');assert.ok(use&&!use.disabled);const mp=g.state.actors.sera.mp;use.click();assert.deepEqual(g.state.actors.ada.statuses,[]);assert.equal(g.state.actors.sera.mp,mp-2);
    view.profilePage='overview';view.render(projectGame(g));assert.match(dom.root.querySelector('.profile-experience').textContent,/累積経験値 80/);assert.match(dom.root.querySelector('.profile-heading').textContent,/Lv.2/);
  }finally{view?.destroy();dom.restore();}
});

test('runtime modules load directly without depending on test import order',()=>{
  for(const file of ['engine','progression','field-skills','battle-results'])execFileSync(process.execPath,['--input-type=module','-e',`await import('./src/core/${file}.js')`],{cwd:new URL('..',import.meta.url),stdio:'pipe'});
});
test('drop probability uses a strict boundary and one draw per monster after level-up messages',()=>{
  for(const [roll,expected] of [[.124999,true],[.125,false]]){
    const g=victory({xp:0,chance:.125});let draws=0;g.random=()=>{draws++;return roll;};g.dispatch({type:'advance'});assert.equal(draws,1);assert.equal(Boolean(g.state.battleResult),expected);if(expected){const before=draws;drain(g);assert.equal(draws,before);}
  }
});
