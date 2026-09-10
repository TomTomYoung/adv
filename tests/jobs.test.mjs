import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {actorStats,jobChangePlan,fieldActionPlan,canEquip,partyEffect} from '../src/core/jobs.js';
import {activeActor,battleSkillPlan} from '../src/core/battle.js';
import {addBuff,buffStats,buffResistance,tickBuffs} from '../src/core/buffs.js';
import {validateContent} from '../src/core/validation.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
const resources=g=>structuredClone({actors:g.state.actors,inventory:g.state.inventory,gold:g.state.gold,level:g.state.level,xp:g.state.xp,rng:g.state.rng,steps:g.state.steps,light:g.state.light,battle:g.state.battle,discovered:g.state.discovered});
function atLevel(g,level){g.award(0,data.system.xpBase*(level-1)*level-g.state.xp);assert.equal(g.state.level,level);}
function setup(job,level=10){const g=newGame(17);if(job!=='warrior')assert.ok(g.dispatch({type:'job.change',actor:'ada',job}));atLevel(g,level);g.state.members=['ada','nio','sera','il','berg'];g.healAll();return g;}
function actAs(g,id){g.state.battle.acted=[];let left=5;while(activeActor(g)!==id&&left-->0)g.state.battle.acted.push(activeActor(g));assert.equal(activeActor(g),id);}
function start(g,id='wild_pair_10'){g.dispatch({type:'travel',region:10});g.startBattle(id,{win:[],lose:[],escape:[]});actAs(g,'ada');}
function equipSkill(g,id){const spec=data.skills[id];let item=spec.equippedItem;if(!item&&spec.weaponTypes)item=Object.keys(data.items).find(key=>spec.weaponTypes.includes(data.items[key].equipmentType));if(item){g.state.inventory[item]=1;assert.ok(g.dispatch({type:'equip',actor:'ada',item}));}for(const [item,n] of Object.entries(spec.materials??{}))g.state.inventory[item]=n;}

for(const job of Object.values(data.jobs))test(`30職実行 ${job.name}: Lv1/5/10/30・全習得技能・装備・保存`,()=>{
  for(const level of [1,5,10,30]){
    const g=setup(job.id,level);assert.equal(g.state.actors.ada.job,job.id);assert.equal(g.state.actors.berg.growthHistory.knight??0,level-1);
    for(const [key,rate] of Object.entries(job.growth))assert.equal(g.stats('ada')[key],data.actors.ada.stats[key]+Math.floor(rate*(level-1)+1e-9));
    const learned=new Set(g.skills('ada'));assert.ok(learned.has('attack')&&learned.has('guard'));
    for(const grant of job.grants)if(grant.api==='battle.skill')assert.equal(learned.has(grant.skill),level>=grant.level);
    for(const [item,spec] of Object.entries(data.items))if(spec.slot)assert.equal(canEquip(data,g.state,'ada',item),job.equipment[spec.slot].includes(spec.equipmentType));
    const checkpoint=g.save();g.load(checkpoint);assert.equal(g.save(),checkpoint);
    for(const grant of job.grants.filter(grant=>grant.api==='battle.skill'&&grant.level<=level)){
      const run=setup(job.id,level);equipSkill(run,grant.skill);run.healAll();start(run);
      const spec=data.skills[grant.skill],target=spec.target==='ally'?'nio':spec.target==='self'?'ada':'enemy_0';
      if(spec.requiresAnalyzed)run.state.battle.analyzed.push('enemy_0','enemy_1');
      assert.ok(battleSkillPlan(run,'ada',grant.skill,target).ok,`${job.id}/${level}/${grant.skill}`);
      assert.ok(run.dispatch({type:'battle',action:'skill',skill:grant.skill,target}),`${job.id}/${level}/${grant.skill}`);
      assert.deepEqual(validateSave(JSON.parse(run.save()),data),[],`${job.id}/${grant.skill} round trip`);
      const saved=run.save();run.load(saved);assert.equal(run.save(),saved);
    }
  }
});

test('転職の装備返却・満杯・連打・待機者・負傷は原子的です',()=>{
  const g=newGame();g.state.inventory.iron_sword=1;g.state.inventory.mail=1;
  g.dispatch({type:'equip',actor:'ada',item:'iron_sword'});g.dispatch({type:'equip',actor:'ada',item:'mail'});
  g.state.actors.ada.hp=9;g.state.actors.ada.mp=1;g.state.actors.ada.statuses=['poison'];g.state.inventory.mail=99;
  let before=resources(g);assert.equal(g.dispatch({type:'job.change',actor:'ada',job:'mage'}),false);assert.deepEqual(resources(g),before);
  g.state.inventory.mail=98;const rng=g.state.rng;assert.ok(g.dispatch({type:'job.change',actor:'ada',job:'mage'}));assert.deepEqual(g.state.actors.ada.equipment,{});assert.equal(g.state.inventory.iron_sword,1);assert.equal(g.state.inventory.mail,99);assert.equal(g.state.actors.ada.hp,9);assert.equal(g.state.actors.ada.mp,1);assert.deepEqual(g.state.actors.ada.statuses,['poison']);assert.equal(g.state.rng,rng);
  before=resources(g);assert.equal(g.dispatch({type:'job.change',actor:'ada',job:'mage'}),false);assert.deepEqual(resources(g),before);
  assert.ok(g.dispatch({type:'job.change',actor:'ren',job:'knight'}));assert.ok(!g.state.members.includes('ren'));g.dispatch({type:'travel',region:1});before=resources(g);assert.equal(g.dispatch({type:'job.change',actor:'ada',job:'warrior'}),false);assert.deepEqual(resources(g),before);
});
test('履歴は転職で再配分せず、小数成長は合算後に一度切り捨てます',()=>{
  const g=setup('duelist',2);assert.ok(g.dispatch({type:'job.change',actor:'ada',job:'scout'}));atLevel(g,3);
  assert.deepEqual(g.state.actors.ada.growthHistory,{duelist:1,scout:1});assert.equal(g.stats('ada').agi,data.actors.ada.stats.agi+1);const past=structuredClone(g.state.actors.ada.growthHistory),stats=g.stats('ada');g.dispatch({type:'job.change',actor:'ada',job:'mage'});assert.deepEqual(g.state.actors.ada.growthHistory,past);assert.deepEqual(g.stats('ada'),stats);
  const content=structuredClone(data);content.jobs.mage.stats={hp:-20,mp:-2};const clone=new GameEngine(content);drain(clone);assert.ok(clone.dispatch({type:'job.change',actor:'ada',job:'mage'}));assert.equal(clone.state.actors.ada.hp,36);assert.equal(clone.state.actors.ada.mp,8);assert.deepEqual(validateSave(JSON.parse(clone.save()),content),[]);
});
test('未習得・媒体・MP・HP・材料・対象不正では消費しません',()=>{
  for(const variant of ['unknown','level','weapon','mp','hp','material','target','api']){
    const g=setup(variant==='weapon'?'spellblade':variant==='material'?'alchemist':variant==='hp'?'bloodmage':'scholar',variant==='level'?1:10);
    let skill=variant==='unknown'?'cover':variant==='level'?'weak_notes':variant==='weapon'?'flameblade':variant==='material'?'fire_mix':variant==='hp'?'blood_light':'analyze';
    if(variant==='material')g.state.inventory.torch=0;if(variant==='mp')g.state.actors.ada.mp=0;if(variant==='hp')g.state.actors.ada.hp=data.skills[skill].hp;
    if(variant==='api'){g.data=structuredClone(data);g.data.jobs.scholar.grants.find(g=>g.skill==='analyze').api='inventory.convert';}
    start(g);const before=resources(g),target=variant==='target'?'nio':'enemy_0';assert.equal(g.dispatch({type:'battle',action:'skill',skill,target}),false,variant);assert.deepEqual(resources(g),before,variant);
  }
});
test('薬師の散布は低HP率3人・同率隊順・28回復、通常道具へ補正を漏らしません',()=>{
  const g=setup('apothecary');equipSkill(g,'scatter');g.state.actors.ada.hp=1;g.state.actors.nio.hp=1;g.state.actors.sera.hp=1;g.state.actors.il.hp=1;g.state.actors.berg.hp=0;start(g);
  const plan=battleSkillPlan(g,'ada','scatter','enemy_0'),targets=plan.targets.map(t=>t.id),before=resources(g),definition=JSON.stringify(data.items.potion);
  assert.equal(targets.length,3);assert.ok(!targets.includes('berg'));assert.ok(g.dispatch({type:'battle',action:'skill',skill:'scatter'}));
  for(const id of g.state.members)assert.equal(g.state.actors[id].hp,before.actors[id].hp+(targets.includes(id)?28:0));
  assert.equal(g.state.actors.ada.mp,before.actors.ada.mp-4);assert.equal(g.state.inventory.potion,0);assert.equal(JSON.stringify(data.items.potion),definition);
  const battle=setup('apothecary');battle.state.inventory.potion=2;battle.state.actors.nio.hp=1;start(battle);battle.dispatch({type:'battle',action:'item',item:'potion',target:'nio'});assert.equal(battle.state.actors.nio.hp,57);
  const field=setup('apothecary');field.state.inventory.potion=1;field.state.actors.nio.hp=1;field.dispatch({type:'item',item:'potion',actor:'nio'});drain(field);assert.equal(field.state.actors.nio.hp,46);
  const normal=setup('warrior');normal.state.inventory.potion=1;normal.state.actors.nio.hp=1;start(normal);normal.dispatch({type:'battle',action:'item',item:'potion',target:'nio'});assert.equal(normal.state.actors.nio.hp,46);
});
test('散布の同率対象は隊列順、対象なし・薬箱なしは不成立です',()=>{
  const g=setup('apothecary');equipSkill(g,'scatter');g.healAll();start(g);assert.deepEqual(battleSkillPlan(g,'ada','scatter').targets.map(t=>t.id),['ada','nio','sera']);
  delete g.state.actors.ada.equipment.weapon;const before=resources(g);assert.equal(g.dispatch({type:'battle',action:'skill',skill:'scatter'}),false);assert.deepEqual(resources(g),before);
});
test('調合は材料2+1とMP2を払い、満杯時と予約外APIでは一切消費しません',()=>{
  const g=setup('alchemist',1);Object.assign(g.state.inventory,{potion:4,antidote:2,ration:99});let before=resources(g);assert.equal(g.dispatch({type:'job.action',actor:'ada',ability:'prepare_ration'}),false);assert.deepEqual(resources(g),before);
  g.state.inventory.ration=98;before=resources(g);assert.ok(g.dispatch({type:'job.action',actor:'ada',ability:'prepare_ration'}));assert.equal(g.state.inventory.potion,2);assert.equal(g.state.inventory.antidote,1);assert.equal(g.state.inventory.ration,99);assert.equal(g.state.actors.ada.mp,before.actors.ada.mp-2);assert.equal(g.state.rng,before.rng);
  g.data=structuredClone(data);g.data.fieldAbilities.prepare_ration.api='inventory.free';before=resources(g);assert.equal(g.dispatch({type:'job.action',actor:'ada',ability:'prepare_ration'}),false);assert.deepEqual(resources(g),before);
});
test('測量は同一階の地図だけを更新し、物語・鍵・乱数は変えません',()=>{
  const g=setup('surveyor',1);g.dispatch({type:'travel',region:1});const before=resources(g),flags=structuredClone(g.state.flags),quests=structuredClone(g.state.quests),objects=structuredClone(g.state.objects);assert.ok(g.dispatch({type:'job.action',actor:'ada',ability:'survey'}));assert.equal(g.state.rng,before.rng);assert.equal(g.state.actors.ada.mp,before.actors.ada.mp-2);assert.ok(g.state.discovered[g.state.location.map].length>=before.discovered[g.state.location.map].length);assert.deepEqual(g.state.flags,flags);assert.deepEqual(g.state.quests,quests);assert.deepEqual(g.state.objects,objects);
});
test('バフは付与元付きで保存し、同種更新・最強正負・期限切れを扱います',()=>{
  const g=setup('warrior');start(g);const a=g.state.actors.ada,n=g.state.actors.nio,b=g.state.battle;
  addBuff(g,'battle_cry',a,a,'battle_cry');assert.deepEqual(validateSave(JSON.parse(g.save()),data),[]);const saved=g.save();g.load(saved);assert.equal(g.save(),saved);
  addBuff(g,'battle_cry',g.state.actors.ada,g.state.actors.ada,'battle_cry');assert.equal(g.state.battle.buffs.length,1);
  const fake={buffs:[{id:'battle_cry',target:'actor:ada',remaining:2},{id:'brave_song',target:'actor:ada',remaining:3},{id:'disarm',target:'actor:ada',remaining:2},{id:'ice_bind',target:'actor:ada',remaining:2}]};
  assert.equal(buffStats(data,fake,'actor:ada',{hp:10,mp:10,str:100,vit:10,agi:10,int:10}).str,93);
  const resist={buffs:[{id:'rune_armor',target:'actor:ada',remaining:2},{id:'lamplight',target:'actor:ada',remaining:3}]};assert.equal(buffResistance(data,resist,'actor:ada','lightning'),.7);
  tickBuffs(g.state.battle);assert.equal(g.state.battle.buffs[0].remaining,1);tickBuffs(g.state.battle);assert.equal(g.state.battle.buffs.length,0);
});
test('速度バフは未行動者だけを並べ替え、追加行動を与えません',()=>{
  const g=setup('bard',10);start(g);g.state.battle.acted=[];const first=activeActor(g);g.state.battle.acted.push(first);const a=g.state.actors.ada;addBuff(g,'march_song',a,a,'march_song');assert.notEqual(activeActor(g),first);assert.ok(g.state.battle.acted.includes(first));
});
test('解析結果は対象ごとに初めて公開し、弱点記録は解析前に使えません',()=>{
  const g=setup('scholar',10);start(g);const before=resources(g);assert.equal(projectGame(g).battle.enemies[0].analysis,null);assert.equal(g.dispatch({type:'battle',action:'skill',skill:'weak_notes',target:'enemy_0'}),false);assert.deepEqual(resources(g),before);
  assert.ok(g.dispatch({type:'battle',action:'skill',skill:'analyze',target:'enemy_0'}));const vm=projectGame(g);assert.ok(vm.battle.enemies[0].analysis);assert.equal(vm.battle.enemies[1].analysis,null);vm.battle.enemies[0].analysis.stats.str=999;assert.notEqual(g.state.battle.enemies[0].stats.str,999);actAs(g,'ada');assert.ok(g.dispatch({type:'battle',action:'skill',skill:'weak_notes',target:'enemy_0'}));
});
test('生存・出撃者だけの支援で、同行人数による倍率累積はありません',()=>{
  const g=setup('merchant',1);assert.equal(g.price(91),82);g.dispatch({type:'job.change',actor:'nio',job:'merchant'});assert.equal(g.price(91),82);g.state.actors.ada.hp=0;assert.equal(g.price(91),82);g.state.actors.nio.hp=0;assert.equal(g.price(91),91);g.dispatch({type:'job.change',actor:'ren',job:'merchant'});assert.equal(g.price(91),91);
  const p=setup('pilgrim');p.state.gold=1000;p.dispatch({type:'travel',region:1});p.dispatch({type:'retreat'});assert.equal(p.state.gold,960);p.state.gold=1000;p.defeat();assert.equal(p.state.gold,850);
});
test('罠軽減は地形の罠に限り、血術・戦闘・通常イベントへ漏れません',()=>{
  const g=setup('rogue',1),map=Object.values(data.maps).find(m=>m.objects.some(o=>o.kind==='trap')),trap=map.objects.find(o=>o.kind==='trap');g.data=structuredClone(data);g.data.scripts.damage_probe={commands:[{op:'actor.damage',target:'ada',amount:10}]};
  let before=g.state.actors.ada.hp;g.run('damage_probe');assert.equal(g.state.actors.ada.hp,before-10);before=g.state.actors.ada.hp;g.run('damage_probe',{map:map.id,object:trap.id});assert.equal(g.state.actors.ada.hp,before-7);
});
test('灯守の節約は成功歩数ごとで、回転・衝突では消費も生成もしません',()=>{
  const g=setup('lantern_keeper',1);g.data=structuredClone(data);g.data.system.encounterCheckSteps=10000;const map=Object.values(g.data.maps)[0];map.objects=[];g.dispatch({type:'travel',region:map.region});let spot;for(let y=1;y<map.tiles.length&&!spot;y++)for(let x=1;x<map.tiles[y].length-1;x++)if(map.tiles[y][x]==='.'&&map.tiles[y][x+1]==='.'){spot={map:map.id,x,y,facing:'east'};break;}g.state.location=spot;const light=g.state.light;for(const direction of ['forward','back','forward'])assert.ok(g.dispatch({type:'move',direction}));assert.equal(g.state.light,light-2);const steps=g.state.steps;for(let i=0;i<4;i++)g.dispatch({type:'move',direction:'left'});assert.equal(g.state.light,light-2);assert.equal(g.state.steps,steps);
});
test('job.change/job.actionのスクリプトも同じ検査と消費を通します',()=>{
  const g=newGame();g.data=structuredClone(data);g.data.scripts.job_probe={commands:[{op:'job.change',actor:'ada',job:'alchemist'},{op:'job.action',actor:'ada',ability:'prepare_ration'}]};Object.assign(g.state.inventory,{potion:2,antidote:1,ration:0});assert.deepEqual(validateContent(g.data),[]);const mp=g.state.actors.ada.mp;g.run('job_probe');assert.equal(g.state.actors.ada.job,'alchemist');assert.equal(g.state.inventory.ration,1);assert.equal(g.state.actors.ada.mp,mp-2);
});
test('未知の職業API・バフ・装備種類・成長・技能消費は登録時に拒否します',()=>{
  for(const mutate of [d=>d.jobs.warrior.grants[0].api='arbitrary.execute',d=>d.buffs.battle_cry.stats.hp=2,d=>d.jobs.warrior.passives.freeGold=1,d=>d.jobs.warrior.growth.agi=-1,d=>d.skills.scatter.materials.potion=-1,d=>d.skills.blood_light.hp=-1,d=>d.items.iron_sword.equipmentType='anything',d=>d.fieldAbilities.prepare_ration.output.ration=100,d=>d.buffs.battle_cry.turns=Infinity,d=>d.skills.scatter.effects[0].scale=NaN]){const content=structuredClone(data);mutate(content);assert.ok(validateContent(content).length);}
});
test('壊れた成長履歴・付与元・期限・装備・敵耐性は読み込み前に拒否します',()=>{
  const g=setup('warrior',10);start(g);addBuff(g,'battle_cry',g.state.actors.ada,g.state.actors.ada,'battle_cry');const good=g.save();
  for(const mutate of [s=>s.actors.ada.job='missing',s=>s.actors.ada.growthHistory.warrior++,s=>s.actors.ada.growthHistory.warrior=-1,s=>s.actors.ada.equipment.weapon='staff',s=>s.battle.buffs[0].sourceJob='mage',s=>s.battle.buffs[0].remaining=99,s=>s.battle.buffs[0].sourceSkill='attack',s=>s.battle.buffs[0].target='enemy:enemy_0',s=>s.battle.enemies[0].resist={physical:0},s=>s.battle.analyzed=['enemy_999'],s=>s.battle.buffs=[null],s=>s.battle.enemies=[null,null]]){const bad=JSON.parse(good);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),good);}
});
test('かばうは隊順の一人へ一度だけ転送し、全体攻撃・倒れた保護者・連鎖を除外します',()=>{
  for(const mode of ['order','chain','fallen','area']){
    const g=setup('knight',1);g.dispatch({type:'job.change',actor:'nio',job:'knight'});g.data=structuredClone(data);
    const skill=mode==='area'?'probe_area':'probe_single';g.data.skills[skill]={name:'検証打撃',mp:0,target:mode==='area'?'all_enemies':'enemy',effects:[{type:'damage',amount:10,element:'physical'}]};g.data.enemies.waterwheel_beaver.ai=[{priority:1,skill,target:'weakest'}];
    g.state.actors.sera.hp=20;start(g,'wild_waterwheel_beaver');
    assert.ok(g.dispatch({type:'battle',action:'skill',skill:'cover',target:mode==='chain'?'nio':'sera'}));actAs(g,'nio');assert.ok(g.dispatch({type:'battle',action:'skill',skill:'cover',target:'sera'}));
    g.state.battle.acted=['ada','nio','sera','il'];if(mode==='fallen')g.state.actors.ada.hp=0;
    const before=resources(g),saved=g.save(),copy=new GameEngine(g.data);drain(copy);copy.load(saved);
    for(const engine of [g,copy])assert.ok(engine.dispatch({type:'battle',action:'skill',skill:'guard',target:'berg'}));assert.equal(g.save(),copy.save());
    if(mode==='area'){assert.equal(g.state.actors.sera.hp,10);assert.equal(g.state.actors.ada.hp,before.actors.ada.hp-9);}
    else{assert.equal(g.state.actors.sera.hp,20);const chosen=mode==='order'?'ada':'nio';assert.equal(g.state.actors[chosen].hp,before.actors[chosen].hp-9);if(mode==='chain')assert.equal(g.state.actors.ada.hp,before.actors.ada.hp);}
    assert.deepEqual(g.state.battle.covers,[]);
  }
});
function oldGame(version='1.2.0'){
  const old=structuredClone(data);delete old.jobs;old.game.version=version;old.game.initial.members=['ada','nio','sera','il'];old.actors=Object.fromEntries(data.game.migrations[version].actors.map(id=>[id,old.actors[id]]));
  const g=new GameEngine(old,116);drain(g);return g;
}
function legacyText(g){const s=JSON.parse(g.save());for(const a of Object.values(s.state.actors)){delete a.job;delete a.growthHistory;}if(s.state.battle)for(const key of ['buffs','covers','analyzed'])delete s.state.battle[key];return JSON.stringify(s);}
test('1.0/1.1/1.2の旧成長・負傷・装備・待機・乱数を移行し、満杯と改竄は原子的に拒否します',()=>{
  for(const version of ['1.0.0','1.1.0','1.2.0']){
    const old=oldGame(version);old.award(0,40*4*5);old.state.actors.ada.hp=7;old.state.actors.ada.mp=1;old.state.actors.ada.statuses=['poison'];old.state.inventory.iron_sword=1;assert.ok(old.dispatch({type:'equip',actor:'il',item:'iron_sword'}));old.dispatch({type:'travel',region:1});old.startBattle('wild_pair_1',{win:[],lose:[],escape:[]});const source=legacyText(old),g=newGame();g.load(source);
    assert.deepEqual(g.state.actors.ada.growthHistory,{legacy:4});assert.equal(g.state.actors.ada.hp,7);assert.equal(g.state.actors.ada.mp,1);assert.deepEqual(g.state.actors.ada.statuses,['poison']);assert.equal(g.stats('ada').str,data.actors.ada.stats.str+data.system.growth.str*4);assert.equal(g.state.inventory.iron_sword,1);assert.equal(g.state.actors.il.equipment.weapon,undefined);assert.equal(g.state.rng,old.state.rng);assert.deepEqual(g.state.waiting,old.state.waiting);assert.deepEqual(validateSave(JSON.parse(g.save()),data),[]);
    const checkpoint=g.save();for(const mutate of [s=>s.actors.ada.hp=999,s=>s.inventory.iron_sword=99]){const bad=JSON.parse(source);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),checkpoint);}assert.equal(legacyText(old),source);
  }
});
test('新しい職業ViewModelは分離され、転職予定と装備可否と価格がコアと一致します',()=>{
  const g=setup('merchant',1);g.state.gold=10000;g.state.inventory.staff=1;const vm=projectGame(g);assert.equal(vm.jobs.length,30);assert.equal(vm.party[0].class,'商人');assert.equal(vm.roster[0].jobOptions.length,30);assert.ok(!vm.inventory.find(i=>i.id==='staff').allowedActors.includes('ada'));const item=vm.shop.find(i=>i.id==='potion');assert.equal(item.price,g.price(item.basePrice));const before=g.state.gold;assert.ok(g.dispatch({type:'buy',item:item.id}));assert.equal(g.state.gold,before-item.price);
  vm.jobs[0].growth.hp=999;vm.roster[0].jobOptions[0].enabled=true;assert.notEqual(data.jobs.warrior.growth.hp,999);
});
