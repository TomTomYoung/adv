import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {testerPreset,createTesterEngine,testerProfile,testerCurrentUnit,testerPlan,validateTesterCase} from '../src/application/battle-tester-model.js';
import {frontlineTargetPlan,frontlineTargetingErrors,frontlineAreaCells} from '../src/core/frontline-targeting.js';
import {frontPosition,prepareFrontlineRound,frontlineMovePlan,frontlineDefinitionErrors} from '../src/core/battle-frontline.js';
import {battleSkillPlan,activeActor} from '../src/core/battle.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {applyStatus} from '../src/core/status-effects.js';
const setup=(preset='ranks',mutate=()=>{})=>{const c=testerPreset(data,preset);mutate(c);const g=createTesterEngine(data,c);return {g,c,b:g.state.battle};};
const roundtrip=g=>{const saved=g.save();assert.deepEqual(validateSave(JSON.parse(saved),g.data),[]);g.load(saved);assert.equal(g.save(),saved);};
const nextRound=g=>{const r=g.state.battle.round;for(let n=0;n<80&&g.state.battle?.round===r;n++)assert.ok(g.dispatch({type:'battle.step'}));};
const plan=(g,id='enemy:enemy_0',profile)=>{if(profile)g.data.skills.lab_strike.frontlineTargeting=profile;return battleSkillPlan(g,g.state.members[0],'lab_strike',id);};
const attack=g=>g.dispatch({type:'battle',action:'skill',skill:'lab_strike',target:'enemy:enemy_0'});
test('Frontline range ignores horizontal slots, preserves Grid and Classic defaults',()=>{
 const {g,b}=setup();g.data.skills.lab_strike.frontlineTargeting=testerProfile({range:{min:1,max:1}});
 for(const id of ['enemy:enemy_0','enemy:enemy_1'])assert.ok(plan(g,id).ok);
 assert.equal(plan(g,'enemy:enemy_2').ok,false);assert.equal(plan(g,'enemy:enemy_2').requiredRange,2);
 b.frontline.positions['actor:ada'].depth=1;assert.equal(plan(g).ok,false);g.data.skills.lab_strike.frontlineTargeting.range.max=2;assert.ok(plan(g).ok);
 b.frontline.positions['actor:ada'].depth=0;assert.ok(plan(g,'enemy:enemy_2').ok);assert.equal(g.data.game.battle.defaultMode,'classic');assert.deepEqual(g.data.game.battle.weaponRanges,data.game.battle.weaponRanges);
});
test('opposing range is symmetric; same-side support uses separate depth difference',()=>{
 const {g,b}=setup();const e=b.enemies[0],s=g.data.skills.lab_strike;assert.equal(frontlineTargetPlan(g,e,s,'lab_strike','actor:ada').requiredRange,1);
 b.frontline.positions['actor:ada'].depth=2;b.frontline.positions['actor:nio'].depth=0;
 const support={...s,target:'ally',frontlineTargeting:testerProfile({range:{min:5,max:5},allyRange:{min:0,max:2}})};assert.ok(frontlineTargetPlan(g,g.state.actors.ada,support,'lab','actor:nio').ok);
});
test('cross4 omits diagonals, around8 includes them; row and column are distinct',()=>{
 const {g}=setup('cross');const s=g.data.skills.lab_strike;
 const ids=shape=>{s.frontlineTargeting=testerProfile({area:{shape}});return plan(g,'enemy:enemy_1').targets.map(u=>u.instance);};
 assert.deepEqual(ids('cross4'),['enemy_0','enemy_2','enemy_1','enemy_3','enemy_4']);assert.ok(!ids('cross4').includes('enemy_5'));assert.ok(ids('around8').includes('enemy_5'));
 assert.deepEqual(ids('row'),['enemy_2','enemy_1','enemy_3']);assert.deepEqual(ids('column'),['enemy_0','enemy_1','enemy_4']);
 assert.equal(frontlineAreaCells({x:2,y:2},'cross4').length,5);assert.ok(frontlineTargetingErrors(testerProfile({area:{shape:'diagonal'}})).length);
});
test('area crosses side boundary only with explicit friendly fire; invalid previews are read-only',()=>{
 const {g,b}=setup();b.frontline.positions['actor:ada']={depth:0,lane:0};const before=g.save();
 const p=plan(g,'enemy:enemy_0',testerProfile({area:{shape:'cross4'}}));assert.ok(!p.targets.some(u=>!u.instance));assert.equal(g.save(),before);
 const ff=plan(g,'enemy:enemy_0',testerProfile({area:{shape:'cross4'},friendlyFire:true}));assert.ok(ff.targets.some(u=>u.id==='ada'));assert.equal(g.save(),before);
 g.data.skills.lab_strike.frontlineTargeting.range={min:5,max:5};assert.equal(attack(g),false);assert.equal(g.state.rng,JSON.parse(before).state.rng);assert.equal(g.state.battle.turnIndex,0);
});
test('first round recursively advances rear-only allies and enemies in two independent steps',()=>{
 const {g,b}=setup('rear_only'),events=b.frontline.events.filter(e=>e.type==='advance');assert.equal(events.length,4);
 for(const side of ['allies','enemies']){const steps=events.filter(e=>e.side===side);assert.deepEqual(steps.map(e=>e.step),[1,2]);assert.deepEqual(steps.map(e=>e.moves[0].from.depth),[2,1]);assert.deepEqual(steps.map(e=>e.moves[0].to.depth),[1,0]);}
 assert.equal(b.round,1);const before=g.save();prepareFrontlineRound(g);assert.equal(g.save(),before);roundtrip(g);
});
test('a living front prevents promotion; a fallen front advances only at next full round',()=>{
 const {g,b}=setup('front_rear',c=>c.allies[1].agi=1);assert.equal(b.frontline.events.filter(e=>e.type==='advance').length,0);b.enemies[0].hp=0;
 assert.ok(g.dispatch({type:'battle.step'}));assert.equal(testerCurrentUnit(g),'enemy:enemy_1');
 assert.ok(g.dispatch({type:'battle.step'}));assert.equal(testerCurrentUnit(g),'actor:nio');assert.equal(b.round,1);
 assert.equal(frontPosition(g.state,b.enemies[1]).depth,2);assert.equal(b.frontline.events.filter(e=>e.type==='move'||e.type==='advance').length,0);
 nextRound(g);assert.equal(frontPosition(g.state,b.enemies[1]).depth,0);assert.equal(b.round,2);assert.equal(b.frontline.events.filter(e=>e.type==='advance'&&e.side==='enemies').length,2);
});
test('voluntary retreat consumes one slot, permits rear destination, then returns at next full turn',()=>{
 const {g,b}=setup('rear_only');const form=structuredClone(g.state.partyFrontlineFormation),rng=g.state.rng;
 assert.equal(g.dispatch({type:'battle',action:'move',to:{depth:0}}),false);assert.equal(g.state.rng,rng);
 assert.ok(g.dispatch({type:'battle',action:'move',to:{depth:2}}));assert.equal(frontPosition(g.state,g.state.actors.ada).depth,2);assert.equal(b.round,1);assert.equal(b.turnIndex,1);assert.deepEqual(g.state.partyFrontlineFormation,form);roundtrip(g);nextRound(g);assert.equal(frontPosition(g.state,g.state.actors.ada).depth,0);
});
test('moving to an occupied lane chooses nearest free lane; full rows reject without mutation',()=>{
 const {g,b}=setup('crowd');const unit=b.enemies[0];b.frontline.positions['enemy:enemy_0']={depth:2,lane:2};assert.deepEqual(frontlineMovePlan(g.state,unit,{depth:0}).to,{depth:0,lane:0});
 assert.equal(frontlineMovePlan(g.state,unit,{depth:3}).ok,false);assert.equal(frontlineMovePlan(g.state,unit,{depth:1,lane:2}).ok,false);
});
test('simultaneous attack resolves everyone before reactions; sequential stops after the first reaction',()=>{
 for(const resolution of ['simultaneous','sequential']){const {g,b}=setup('interrupt',c=>{c.profile.resolution=resolution;});const hp=b.enemies.map(e=>e.hp),mp=g.state.actors.ada.mp;assert.ok(attack(g));const hits=b.frontline.events.filter(e=>e.type==='hit');assert.equal(hits.length,resolution==='simultaneous'?3:1);assert.ok(b.enemies[0].hp<hp[0]);assert.equal(b.enemies[1].hp<hp[1],resolution==='simultaneous');assert.equal(g.state.actors.ada.mp,mp-2);const firstReaction=b.frontline.events.findIndex(e=>e.type==='reaction'),lastHit=b.frontline.events.findLastIndex(e=>e.type==='hit');assert.ok(firstReaction>lastHit);assert.equal(b.frontline.events.some(e=>e.type==='attack_stopped'),resolution==='sequential');roundtrip(g);}
});
test('stable reverse order and constant/decreasing/increasing final damage use hit index',()=>{
 for(const mode of ['constant','decrease','increase']){const {g,b}=setup('crowd',c=>{c.profile=testerProfile({area:{shape:'row'},resolution:'sequential',order:'right_to_left',damageSeries:{mode,basis:'final',start:1,step:.25}});c.enemies.forEach((e,i)=>e.vit=i*8);});assert.ok(attack(g));const hits=b.frontline.events.filter(e=>e.type==='hit');assert.deepEqual(hits.map(h=>h.target),['enemy:enemy_4','enemy:enemy_3','enemy:enemy_2','enemy:enemy_1','enemy:enemy_0']);const first=hits[0].damage;assert.deepEqual(hits.map(h=>h.damage),hits.map((_,i)=>Math.floor(first*(mode==='constant'?1:mode==='increase'?1+i*.25:1-i*.25))));}
});
test('power series scales attacker power before target defense, without enforcing equal final damage',()=>{
 const {g,b}=setup('crowd',c=>{c.profile=testerProfile({area:{shape:'row'}});c.enemies.forEach((e,i)=>e.vit=i*6);});assert.ok(attack(g));const hits=b.frontline.events.filter(e=>e.type==='hit');assert.ok(hits[0].damage>hits[4].damage);
});
test('manual pace preserves the mixed queue and enemy preemptive action count across load',()=>{
 const {g,b}=setup('ranks',c=>{c.preemptive={side:'enemies',actions:2};});assert.equal(b.preemptive.remaining,2);roundtrip(g);assert.ok(g.dispatch({type:'battle.step'}));assert.equal(g.state.battle.preemptive.remaining,1);roundtrip(g);assert.ok(g.dispatch({type:'battle.step'}));assert.equal(g.state.battle.preemptive,undefined);assert.equal(g.state.battle.round,1);assert.equal(testerCurrentUnit(g),'actor:ada');
});
test('status lost turns consume opportunities and do not independently run front promotion',()=>{
 const {g,b}=setup('front_rear');applyStatus(g.data,g.state,g.state.actors.ada,'sleep');assert.ok(g.dispatch({type:'battle.step'}));assert.equal(b.turnIndex,1);assert.equal(b.round,1);assert.equal(frontPosition(g.state,g.state.actors.nio).depth,2);roundtrip(g);
});
test('old same-version save remains loadable; malformed Frontline positions/events fail atomically',()=>{
 const {g}=setup();roundtrip(g);
 for(const change of [s=>delete s.battle.frontline,s=>s.battle.frontline.positions['actor:ada'].depth=3,s=>s.battle.frontline.positions['enemy:enemy_0']=s.battle.frontline.positions['enemy:enemy_1'],s=>s.battle.frontline.events[0].positions['actor:ada'].lane=99,s=>s.battle.frontline.reactions.unknown=[]]){const bad=JSON.parse(g.save());change(bad.state);assert.ok(validateSave(bad,g.data).length);const before=g.save();assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
 const normal=new GameEngine(structuredClone(data));drain(normal);const saved=normal.save();normal.load(saved);assert.equal(normal.save(),saved);
});
test('Frontline formation forks Grid on first edit and follows membership replacement without changing Grid',()=>{
 const g=new GameEngine(structuredClone(data));drain(g);const grid=structuredClone(g.state.partyFormation);assert.ok(g.dispatch({type:'party.frontline.set',actor:'ada',depth:1,lane:0}));assert.deepEqual(g.state.partyFormation,grid);assert.deepEqual(g.state.partyFrontlineFormation.ada,{depth:1,lane:0});const reserve=g.data.game.tavern.candidates.find(id=>!g.state.members.includes(id));assert.ok(g.changeParty('swap',reserve,'ada'));assert.deepEqual(g.state.partyFrontlineFormation[reserve],{depth:1,lane:0});assert.equal(g.state.partyFrontlineFormation.ada,undefined);roundtrip(g);
});
test('projection exposes depth and legal target preview without state or RNG mutations',()=>{
 const {g}=setup();const before=g.save();for(let i=0;i<3;i++){const m=projectGame(g);assert.equal(m.battle.grid,null);assert.ok(m.battle.frontline);assert.ok(m.battle.skills.find(s=>s.id==='lab_strike').choices.length);}assert.equal(g.save(),before);
});
test('tester reset reproduces queue, RNG, targets and hit log exactly; cases reject duplicate occupancy',()=>{
 const c=testerPreset(data,'interrupt'),a=createTesterEngine(data,c),b=createTesterEngine(data,c);assert.ok(attack(a));assert.ok(attack(b));assert.equal(a.save(),b.save());c.enemies[1].lane=c.enemies[0].lane;assert.ok(validateTesterCase(data,c).length);assert.throws(()=>createTesterEngine(data,c));
});
test('all distributed skills have separate audited profiles and invalid range/shape/order definitions fail',()=>{
 for(const [id,s] of Object.entries(data.skills))if(id!=='attack')assert.deepEqual(frontlineTargetingErrors(s.frontlineTargeting),[],id);
 for(const patch of [{area:{shape:'line'}},{range:{min:3,max:1}},{order:'random'},{resolution:'animation'},{damageSeries:{mode:'constant',basis:'unknown',start:1,step:0}}])assert.ok(frontlineTargetingErrors(testerProfile(patch)).length);
 assert.deepEqual(frontlineDefinitionErrors(data),[]);
});
test('battle start events preserve preparation and positions across save with enemy preemption',()=>{
 const g=new GameEngine(structuredClone(data));drain(g);g.state.partyFrontlineFormation=Object.fromEntries(g.state.members.map((id,i)=>[id,{depth:2,lane:i}]));
 g.data.scripts.front_intro={commands:[{op:'battle.start',encounter:'wild_pair_1',battleMode:'frontline',preemptive:{side:'enemies',actions:2},on_win:[],on_lose:[],on_escape:[],on_interrupt:[],events:[{id:'intro',triggers:['start'],commands:[{op:'narrate',text:'開始'}]}]}]};g.run('front_intro');const f=structuredClone(g.state.battle.frontline),round=g.state.battle.round;roundtrip(g);assert.deepEqual(g.state.battle.frontline,f);drain(g);assert.equal(g.state.battle.round,round);assert.equal(g.state.battle.frontline.events.filter(e=>e.type==='advance'&&e.side==='allies').length,2);roundtrip(g);
});
test('misses do not trigger onHit; guard reactions obey action-disabled status',()=>{
 for(const stopped of [false,true]){const {g,b}=setup('interrupt');if(stopped)b.stuns={'enemy:enemy_0':1};else{applyStatus(g.data,g.state,g.state.actors.ada,'blindness',undefined,3);g.random=()=>.99;}assert.ok(attack(g));assert.equal(b.frontline.events.filter(e=>e.type==='reaction').length,0);assert.equal(b.frontline.events.filter(e=>e.type==='hit').length,3);}
});
test('Frontline confusion, berserk and misfire keep their own target-range rules',()=>{
 for(const status of ['confusion','berserk','misfire']){const {g,b}=setup();b.frontline.positions['enemy:enemy_1']={depth:2,lane:4};g.data.skills.attack.frontlineTargeting=testerProfile({range:{min:1,max:1}});g.data.skills.lab_strike.frontlineTargeting=testerProfile({range:{min:1,max:1}});const before=b.enemies[1].hp;
 applyStatus(g.data,g.state,g.state.actors.ada,status,undefined,3);g.random=()=>0;const ok=g.dispatch(status==='berserk'?{type:'battle',action:'wait'}:{type:'battle',action:'skill',skill:status==='misfire'?'lab_strike':'guard',target:'enemy:enemy_0'});assert.ok(ok);assert.equal(b.enemies[1].hp,before);assert.equal(b.turnIndex,1);}
});

test('real playtest drains enemies automatically with the same Core results as manual stepping',()=>{
 for(const mode of ['frontline','classic','grid']){
  const c=testerPreset(data,'crowd');c.mode=mode;c.preemptive={side:'enemies',actions:2};c.enemies.forEach(u=>u.agi=80);
  const manual=createTesterEngine(data,c),play=createTesterEngine(data,c,{manualTurns:false});
  assert.equal(manual.state.battle.manualTurns,true);assert.equal(play.state.battle.manualTurns,undefined);
  for(let i=0;i<20&&testerCurrentUnit(manual)?.startsWith('enemy:');i++)assert.ok(manual.dispatch({type:'battle.step'}));
  delete manual.state.battle.manualTurns;
  assert.equal(play.save(),manual.save());assert.ok(testerCurrentUnit(play).startsWith('actor:'));roundtrip(play);
 }
});
test('real playtest applies enemy status before preemptive actions and retains configured Grid formation',()=>{
 const c=testerPreset(data,'rear_only');c.mode='grid';c.preemptive={side:'enemies',actions:2};c.enemies[0].status='sleep';
 const play=createTesterEngine(data,c,{manualTurns:false});
 assert.equal(play.state.actors.ada.hp,c.allies[0].hp);assert.equal(play.state.battle.preemptive,undefined);
 assert.deepEqual(play.state.battle.grid.positions['actor:ada'],{x:c.allies[0].lane,y:c.allies[0].depth+3});roundtrip(play);
});
test('playtest reset is deterministic and its actions do not alter the diagnostic engine or base data',()=>{
 const c=testerPreset(data),original=JSON.stringify(data),manual=createTesterEngine(data,c),saved=manual.save();
 const play=createTesterEngine(data,c,{manualTurns:false}),initial=play.save();assert.ok(attack(play));
 assert.equal(manual.save(),saved);assert.equal(JSON.stringify(data),original);
 assert.equal(createTesterEngine(data,c,{manualTurns:false}).save(),initial);
});


test('Frontline AI holds middle and rear ranks while a living front remains, in manual and normal play',()=>{
 for(const manualTurns of [true,false]){
  const g=createTesterEngine(data,testerPreset(data),{manualTurns}),b=g.state.battle,positions=structuredClone(b.frontline.positions);
  for(let round=1;round<=3;round++){
   if(manualTurns)nextRound(g);
   else for(let n=0;n<20&&b.round===round;n++)assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard',target:'actor:'+activeActor(g)}));
   assert.equal(b.round,round+1);assert.ok(b.enemies[0].hp>0&&b.enemies[1].hp>0);
   assert.deepEqual(b.frontline.positions,positions);
  }
  assert.equal(b.frontline.events.filter(e=>e.type==='move'||e.type==='advance').length,0);
  assert.ok(b.log.some(line=>line.includes('守りを固めた')));roundtrip(g);
 }
});
test('Frontline ranged rear enemies attack in place; out-of-range preemptive enemies also hold formation',()=>{
 for(const range of [1,3]){
  const c=testerPreset(data,'front_rear');c.enemies[1].agi=90;c.enemies[1].range=range;c.preemptive={side:'enemies',actions:2};
  const g=createTesterEngine(data,c,{manualTurns:false}),b=g.state.battle;
  assert.equal(frontPosition(g.state,b.enemies[1]).depth,2);assert.equal(b.frontline.events.filter(e=>e.type==='move'||e.type==='advance').length,0);
  const rearAttacks=b.frontline.events.filter(e=>e.type==='attack_start'&&e.source==='enemy:enemy_1');
  assert.equal(rearAttacks.length,range===3?3:0);assert.ok(testerCurrentUnit(g).startsWith('actor:'));roundtrip(g);
 }
});
