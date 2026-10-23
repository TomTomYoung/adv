// Seeded playthrough using public game intents. No injected XP, money, items,
// healing, enemy HP changes or encounter suppression. This is a fixed policy,
// not a claim that every player route or party composition has been balanced.
import assert from 'node:assert/strict';
import {pathTo,drain,inspect,goTownLocation,data} from '../tests/helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {activeActor,battleSkillPlan,enemyStats} from '../src/core/battle.js';
import {projectBattleSkills} from '../src/application/job-projection.js';
import {gridMovePlan,position,gridCells} from '../src/core/battle-grid.js';
import {frontPosition,frontlineMovePlan} from '../src/core/battle-frontline.js';
import {statusControl} from '../src/core/status-effects.js';
import {unitKey} from '../src/core/buffs.js';
import {stunned} from '../src/core/battle-turns.js';
import {oilTotal} from '../src/core/expedition-oil.js';
import {validateSave} from '../src/core/save.js';
import {campaignRoute} from './campaign-route.mjs';

const choices={q001:{entry:'talk',dark:'inspect',empty:'follow',old:'support',outage:'call',rescue:'home',gate:'report',post:'repair'},q201:{entry:'ask',witness:'take',reason:'correct'},q202:{entry:'walk',lesson:'test',result:'visual'},q203:{entry:'carry',inspect:'pour',portion:'burn',result:'public'},q206:{entry:'carry',offer:'gift',gift:'hand'},q207:{entry:'check',calibrated:'go',measure:'read',result:'joint'},q209:{entry:'battle',challenge:'fight',witness:'sign'}};
const quests=['q201','q202','q203','q209','q206','q207'];
const weapons={ada:'sword',nio:'dagger',sera:'staff',il:'staff',berg:'spear'};
// Search legal paths to an attack position, including lateral or temporarily
// more distant steps. Only the returned first step is dispatched; previews do
// not mutate the game, roll RNG or move units through occupied cells.
export function campaignGridMove(g,a){
 const s=g.state,b=s.battle,key=unitKey(a),origin=position(s,a),seen=new Set([`${origin.x},${origin.y}`]),queue=[{p:origin,first:null}];
 const attacks=g.skills(a.id).filter(id=>g.data.skills[id].effects.some(e=>e.type==='damage'));
 for(const {p,first} of queue){
  if(first&&attacks.some(id=>b.enemies.some(e=>e.hp>0&&battleSkillPlan(g,a.id,id,e.instance,{origin:p}).ok)))return first;
  const preview={...s,battle:{...b,grid:{...b.grid,positions:{...b.grid.positions,[key]:p}}}};
  for(const to of gridCells())if(!seen.has(`${to.x},${to.y}`)&&gridMovePlan(preview,a,to).ok){seen.add(`${to.x},${to.y}`);queue.push({p:to,first:first??to});}
 }
 return null;
}
export class Campaign {
 constructor({seed=1907,size=4,mode='classic',optional=true,training=false,fieldTraining=false,route='standard',questOrder='standard',loadout='standard'}={}){
  assert.ok(['standard','shortcuts'].includes(route));assert.ok(['standard','reverse'].includes(questOrder));assert.ok(['standard','bow'].includes(loadout));
  this.options={seed,size,mode,optional,training,fieldTraining,route,questOrder,loadout};this.g=new GameEngine(data,seed);drain(this.g);
  this.report={...this.options,skillUses:{},checkpoints:[],battles:[],purchases:[],consumed:{},returns:[],connections:{},opened:[],oilSpentWalking:0,mpSpent:0,rests:0,spentGold:0,spentGems:0,minOil:180};
  this.supplying=false;
 }
 act(intent){
  const g=this.g,before={gold:g.state.gold,item:g.state.inventory[intent.item]??0,steps:g.state.steps,oil:oilTotal(data,g.state),managed:g.state.expedition.managed};
  assert.ok(g.dispatch(intent),JSON.stringify({intent,notice:g.state.notice,location:g.state.location,waiting:g.state.waiting}));
  if(intent.type==='battle'&&intent.action==='skill'||intent.type==='job.action'){const id=intent.skill??intent.ability;this.report.skillUses[id]=(this.report.skillUses[id]??0)+1;}
  if(intent.type==='item'||intent.type==='battle'&&intent.action==='item')this.report.consumed[intent.item]=(this.report.consumed[intent.item]??0)+Math.max(0,before.item-(g.state.inventory[intent.item]??0));
  this.report.spentGold+=Math.max(0,before.gold-g.state.gold);drain(g);
  if(g.state.steps>before.steps&&g.state.mode==='dungeon'&&g.state.expedition.managed){this.report.minOil=Math.min(this.report.minOil,oilTotal(data,g.state));if(before.managed)this.report.oilSpentWalking+=Math.max(0,before.oil-oilTotal(data,g.state));}
  if(intent.type==='dungeon.action'&&intent.system==='connections')this.report.connections[intent.target]=(this.report.connections[intent.target]??0)+1;
 }
 battle(){
  const g=this.g,b=g.state.battle;if(!b)return;const losses=g.state.records.losses;
  const row={encounter:b.encounter,map:g.state.location?.map,level:g.state.actors.ada.level,rounds:0,actions:0,moves:0,mp:0};
  while(g.state.battle===b){
   assert.ok(row.actions++<400,`battle stalled: ${b.encounter}`);drain(g);if(g.state.battle!==b)break;
   row.rounds=Math.max(row.rounds,b.round);const id=activeActor(g),a=g.state.actors[id];assert.ok(a);
   if(stunned(b,a)||statusControl(data,g.state,a)){this.act({type:'battle',action:'wait'});continue;}
   if(b.encounter==='kuragari_hunt'&&g.state.quests.q001.stage==='active'){this.act({type:'battle',action:'skill',skill:'guard'});continue;}
   const ranked=[];
   for(const skill of projectBattleSkills(g,id).filter(s=>s.enabled))for(const c of skill.choices??Object.entries(skill.availability).map(([id,v])=>({id,enabled:v.enabled}))){
    if(!c.enabled)continue;const p=battleSkillPlan(g,id,skill.id,c.id);if(!p.ok)continue;
    let score=0;
    for(const t of p.targets)for(const e of p.skill.effects){
     const stats=t.instance?enemyStats(g,t):g.stats(t.id),context={source:{...a,stats:g.stats(id)},target:{...t,stats}};
     const raw=e.formula?g.value(data.formulas[e.formula],context):e.amount??0;
     if(e.type==='damage'&&t.instance)score+=Math.min(t.hp,raw*(t.resist?.[e.element]??1));
     if(e.type==='heal'&&!t.instance&&t.hp<stats.hp*.65)score+=Math.min(stats.hp-t.hp,raw)*1.5;
    }
    if(score>0)ranked.push({score:score-(p.skill.mp??0)*2,skill:skill.id,target:c.id,mp:p.skill.mp??0});
   }
   ranked.sort((a,b)=>b.score-a.score||a.mp-b.mp);let best=ranked[0];
   // Respect the announced third-round attack instead of reading random rolls.
   if(b.encounter==='kagaribi_altar_guardian'&&b.round%3===0&&b.enemies[0].hp>100&&g.stats(id).agi>enemyStats(g,b.enemies[0]).agi)best={skill:battleSkillPlan(g,id,'exp_second_breath',id).ok?'exp_second_breath':'guard',mp:0};
   if(best){const before=a.mp;this.act({type:'battle',action:'skill',skill:best.skill,target:best.target});row.mp+=Math.max(0,before-a.mp);continue;}
   let to;
   if(b.mode==='grid'){
    to=campaignGridMove(g,a);
   }else if(b.mode==='frontline'){
    const depth=frontPosition(g.state,a).depth-1;if(frontlineMovePlan(g.state,a,{depth}).ok)to={depth};
   }
   if(to){this.act({type:'battle',action:'move',to});row.moves++;}else this.act({type:'battle',action:'skill',skill:'guard'});
  }
  if(b.reinforcements)row.reinforcements=structuredClone(b.reinforcements);
  drain(g);this.report.battles.push(row);assert.equal(g.state.records.losses,losses,`party defeated: ${JSON.stringify(row)}`);
 }
 upkeep(){
  const g=this.g;if(g.state.waiting||g.state.battle||g.state.quests.q001.stage!=='completed')return;
  if(this.options.fieldTraining&&g.state.expedition.learned.sera?.exp_oil_spark&&!this.report.skillUses.exp_oil_spark&&g.state.actors.sera.mp>=18)this.act({type:'job.action',actor:'sera',ability:'exp_oil_spark'});
  const lamp=g.state.dungeons.active?.systems.fires?.portable;
  if(lamp&&lamp.fuel<15&&g.state.expedition.reserve>0)this.act({type:'dungeon.action',system:'fires',action:lamp.lit?'refuel':'ignite',target:'portable'});
  for(const id of g.state.members){const a=g.state.actors[id];if(a.statuses.includes('poison')&&g.state.inventory.antidote>0)this.act({type:'item',item:'antidote',actor:id});if(a.hp>0&&a.hp<g.stats(id).hp*.45&&g.state.inventory.potion>0)this.act({type:'item',item:'potion',actor:id});}
  if(g.state.inventory.ration>0&&(g.state.members.some(id=>['priest','mage'].includes(g.state.actors[id].job)&&g.state.actors[id].hp>0&&g.state.actors[id].mp<8)||g.state.members.some(id=>g.state.actors[id].hp<g.stats(id).hp*.5)))this.act({type:'item',item:'ration',actor:'ada'});
 }
 walk(x,y){
  const g=this.g;
  for(const [nx,ny] of pathTo(g,x,y)){
   this.upkeep();const l=g.state.location,wanted=nx>l.x?'east':nx<l.x?'west':ny>l.y?'south':'north';
   while(g.state.location.facing!==wanted)this.act({type:'move',direction:'right'});
   this.act({type:'move',direction:'forward'});this.battle();
   if(g.state.waiting?.type==='choice')return;
  }
 }
 object(id){inspect(this.g,id);drain(this.g);}
 choose(id){this.act({type:'choose',id});this.battle();}
 map(target){
  const g=this.g;this.supply();
  while(g.state.location.map!==target){
   const links=data.dungeons.kagaribi.systems.connections.links,route=new Map([[g.state.location.map,null]]),queue=[g.state.location.map];
   for(const map of queue)for(const l of links)for(const [a,b] of [[l.a,l.b],[l.b,l.a]])if(a.map===map&&!route.has(b.map)&&(l.condition===undefined||g.value(l.condition))){route.set(b.map,{a,b,l});queue.push(b.map);}
   assert.ok(route.has(target));let edge=route.get(target);while(edge.a.map!==g.state.location.map)edge=route.get(edge.a.map);
   this.walk(edge.a.x,edge.a.y);if(g.state.waiting)return;
   this.act({type:'dungeon.action',system:'connections',action:'cross',target:edge.l.id});this.battle();this.supply();
  }
 }
 go(map,x,y){
  if(this.options.route==='standard'){this.map(map);if(!this.g.state.waiting)this.walk(x,y);return;}
  const g=this.g;this.supply();if(g.state.waiting)return;
  // Supply detours and opening latches can change the next route.
  for(let n=0;n<100;n++){
   const path=campaignRoute(g,{map,x,y});if(!path.length)return;
   for(const step of path){
    this.upkeep();
    if(step.connection)this.act({type:'dungeon.action',system:'connections',action:'cross',target:step.connection});
    else{while(g.state.location.facing!==step.direction)this.act({type:'move',direction:'right'});this.act({type:'move',direction:'forward'});}
    this.battle();if(g.state.waiting)return;
    assert.equal(g.state.location.map,step.at.map);assert.equal(g.state.location.x,step.at.x);assert.equal(g.state.location.y,step.at.y);
    if(step.connection){this.supply();if(g.state.waiting)return;break;}
   }
  }
  throw Error(`campaign route stalled: ${map}/${x},${y}`);
 }
 shortcuts(map){
  if(this.options.route!=='shortcuts')return;
  const g=this.g,flags=g.state.flags.kagaribi??{};
  const open=(id,flag)=>{const o=g.map().objects.find(o=>o.id===id);this.walk(o.x,o.y);if(g.state.waiting)return;while(o.edge&&g.state.location.facing!==o.edge)this.act({type:'move',direction:'right'});this.object(id);this.choose('open');assert.equal(g.state.flags.kagaribi[flag],true);this.report.opened.push(flag);};
  if(map==='kagaribi_oilstore'&&!flags.cartCleared){this.walk(3,9);if(g.state.waiting)return;this.object('tools');this.walk(11,5);if(g.state.waiting)return;this.object('cart');this.choose('repair');assert.equal(g.state.flags.kagaribi.cartCleared,true);}
  if(map==='kagaribi_crossroads'&&flags.cartCleared&&!flags.cargoGate)open('cargo_latch','cargoGate');
  if(map==='kagaribi_relay'&&!flags.relayGate){this.walk(7,5);if(g.state.waiting)return;if(!g.state.dungeons.persistent.kagaribi.systems.fires.fixtures.relay_main.lit)this.act({type:'dungeon.action',system:'fires',action:'ignite',target:'relay_main'});open('relay_latch','relayGate');}
  if(map==='kagaribi_f3'&&!flags.altarGate)open('altar_latch','altarGate');
 }
 supply(){
  const g=this.g;if(this.supplying||g.state.waiting||g.state.quests.q001.stage!=='completed')return;
  this.supplying=true;try{
   const map=g.state.location.map;
   if(map==='kagaribi_kilns'&&!g.state.flags.kagaribi?.kilnGate){this.walk(7,1);if(g.state.waiting)return;while(g.state.location.facing!=='north')this.act({type:'move',direction:'right'});this.object('kiln_latch');this.choose('open');}
   this.shortcuts(map);if(g.state.waiting)return;
   const c=data.expedition.camps.find(c=>c.map===map);
   if(!c||c.id==='kagaribi_central'&&!g.state.flags.kagaribi?.altarGuardianWon)return;
   this.walk(c.x,c.y);if(g.state.waiting)return;
   if(!g.state.expedition.camps[c.id]?.supply){this.object('supply_rope');this.act({type:'expedition.action',camp:c.id,action:'repair'});if(c.relayEnabled!==false)this.act({type:'expedition.action',camp:c.id,action:'relay'});this.checkpoint(c.id);}
   if(oilTotal(data,g.state)<g.state.expedition.capacity)this.act({type:'expedition.action',camp:c.id,action:'draw'});
  }finally{this.supplying=false;}
 }
 exit(){
  const g=this.g;if(g.state.mode==='town')return;
  const before={map:g.state.location.map,steps:g.state.steps,battles:this.report.battles.length,oil:this.report.oilSpentWalking};
  this.go('kagaribi_f1',1,1);this.object('exit');assert.equal(g.state.mode,'town');
  this.report.returns.push({from:before.map,steps:g.state.steps-before.steps,battles:this.report.battles.length-before.battles,oilSpentWalking:this.report.oilSpentWalking-before.oil});
 }
 town(){
  const g=this.g;this.exit();goTownLocation(g,'hikarigaeri_tavern');
  if(this.options.fieldTraining&&g.state.expedition.camps.kagaribi_relay?.relay&&g.state.actors.sera.job!=='lantern_keeper')this.act({type:'job.change',actor:'sera',job:'lantern_keeper'});
  if(g.state.members.some(id=>g.state.actors[id].hp<g.stats(id).hp||g.state.actors[id].mp<g.stats(id).mp)){this.act({type:'service',id:'inn'});this.report.rests++;}
  goTownLocation(g,'hikarigaeri_shop');
  if(g.state.expedition.camps.kagaribi_crossroads?.supply){
   for(const actor of g.state.members){const item=`exp_t1_${(this.options.fieldTraining||this.options.loadout==='bow')&&actor==='nio'?'bow':weapons[actor]}`;if(g.state.actors[actor].equipment.weapon===item)continue;if(g.state.gold<124)break;this.act({type:'buy',item});this.act({type:'equip',actor,item});this.report.purchases.push({actor,item});}
   for(const [actor,skill] of this.options.fieldTraining?[['sera','exp_oil_spark'],['nio','exp_route_survey']]:this.options.training?[['ada','exp_second_breath'],['sera','exp_purging_pursuit']]:[['ada','exp_row_sweep'],['il','exp_chain_flame'],['sera','exp_paired_aid']])if(!g.state.expedition.learned[actor]?.[skill]&&g.state.expedition.gems>=data.expedition.products[skill].price){const before=g.state.expedition.gems;if(g.dispatch({type:'skill.buy',actor,skill,level:1})){this.report.spentGems+=before-g.state.expedition.gems;this.report.purchases.push({actor,skill});}}
  }
  for(const actor of g.state.members){const item=actor==='berg'?'mail':['sera','il'].includes(actor)?'robe':'leather';if(g.state.actors[actor].equipment.armor===item||!g.state.expedition.camps.kagaribi_crossroads?.supply||g.state.gold<204)continue;this.act({type:'buy',item});this.act({type:'equip',actor,item});this.report.purchases.push({actor,item});}
  for(const [item,n] of [['ration',3],['potion',3]])while((g.state.inventory[item]??0)<n&&g.state.gold>50)this.act({type:'buy',item});
  goTownLocation(g,data.game.world.townRoot);
 }
 quest(id){
  const g=this.g;this.act({type:'accept',id});const q=data.quests[id];
  this.act({type:'quest.travel',id});
  for(let n=0;g.state.quests[id].stage!=='completed';n++){
   assert.ok(n<70,`quest stalled: ${id}`);this.battle();
   if(g.state.waiting?.type==='choice'){const scene=g.state.stories[id].scene;this.choose(choices[id][scene]);continue;}
   let p;if(g.state.journey){const j=g.state.journey;p=q.story.worldPlaces[q.story.actions[j.action].journey.to];}else p=q.story.worldPlaces[q.story.scenes[g.state.stories[id]?.scene??'entry'].place];
   if(p.kind==='town'){this.exit();goTownLocation(g,p.location);drain(g);}else{this.go(p.map,p.x,p.y);if(!g.state.waiting)this.object(p.event);}
  }
  this.checkpoint(id);
 }
 checkpoint(label){
  const g=this.g,s=g.save();assert.deepEqual(validateSave(JSON.parse(s),data),[]);g.load(s);assert.equal(g.save(),s);
  this.report.checkpoints.push({label,steps:g.state.steps,gold:g.state.gold,gems:g.state.expedition.gems,oil:oilTotal(data,g.state),actors:g.state.members.map(id=>({id,level:g.state.actors[id].level,xp:g.state.actors[id].xp,hp:g.state.actors[id].hp,mp:g.state.actors[id].mp}))});
 }
 run(){
  const g=this.g;this.act({type:'battle.mode.set',mode:this.options.mode});
  this.quest('q001');this.town();if(this.options.size===5){goTownLocation(g,'hikarigaeri_tavern');this.act({type:'party',action:'join',actor:'berg'});goTownLocation(g,data.game.world.townRoot);}
  if(this.options.optional)for(const id of this.options.questOrder==='reverse'?[...quests].reverse():quests){this.quest(id);this.town();}
  if(this.options.training){this.act({type:'travel',dungeon:'kagaribi'});this.go('kagaribi_ossuary',1,1);this.town();this.checkpoint('9F training');}
  this.act({type:'travel',dungeon:'kagaribi'});this.go('kagaribi_f3',5,1);this.object('altar_keeper');this.choose('fight');assert.equal(g.state.flags.kagaribi.altarGuardianWon,true);this.supply();this.checkpoint('10F');this.town();
  goTownLocation(g,'hikarigaeri_shop');
  if(this.options.training){this.act({type:'job.change',actor:'ada',job:'knight'});const before=g.state.expedition.gems;this.act({type:'skill.buy',actor:'ada',skill:'exp_parry_command',level:1});this.report.spentGems+=before-g.state.expedition.gems;this.report.purchases.push({actor:'ada',skill:'exp_parry_command'});}
  if(this.options.fieldTraining){goTownLocation(g,data.game.world.townRoot);this.act({type:'checkpoint.travel',camp:'kagaribi_central'});this.walk(5,1);this.act({type:'job.action',actor:'nio',ability:'exp_route_survey'});this.report.measuredReturnSteps=g.state.expedition.route.path.length-1;const steps=g.state.steps;this.walk(3,1);assert.equal(g.state.steps-steps,this.report.measuredReturnSteps);assert.equal(g.state.expedition.route.path.length,1);this.checkpoint('field training');this.town();goTownLocation(g,'hikarigaeri_shop');}
  this.act({type:'service',id:'kagaribi_weapon_exchange'});this.choose('sword');assert.equal(g.state.inventory.exp_t2_sword,1);this.checkpoint('returned');
  this.report.mpSpent=this.report.battles.reduce((n,b)=>n+b.mp,0);this.report.earnedGold=g.state.gold+this.report.spentGold-data.game.initial.gold;this.report.earnedGems=g.state.expedition.gems+this.report.spentGems;this.report.losses=g.state.records.losses;return this.report;
 }
}
export const measureCampaign=options=>new Campaign(options).run();
export function summarizeCampaigns(rows){
 return {command:'node tools/measure-kagaribi-campaign.mjs --routes --summary',contentVersion:data.game.version,centralRepairXp:data.expedition.camps.find(c=>c.id==='kagaribi_central').xp,runs:rows.map(r=>{
  const at10=r.checkpoints.find(c=>c.label==='10F'),end=r.checkpoints.at(-1);
  return {seed:r.seed,size:r.size,mode:r.mode,route:r.route,questOrder:r.questOrder,loadout:r.loadout,losses:r.losses,
   actorsAt10F:at10.actors.map(({id,level,xp})=>({id,level,xp})),stepsAt10F:at10.steps,stepsReturned:end.steps,
   battles:r.battles.length,guardianRounds:r.battles.find(b=>b.encounter==='kagaribi_altar_guardian').rounds,
   gold:{earned:r.earnedGold,spent:r.spentGold,remaining:end.gold},gems:{earned:r.earnedGems,spent:r.spentGems,remaining:end.gems},
   battleMpSpent:r.mpSpent,rests:r.rests,consumed:r.consumed,minOil:r.minOil,oilSpentWalking:r.oilSpentWalking,opened:r.opened,finalReturn:r.returns.at(-1)};
 })};
}
if(process.argv[1]?.endsWith('measure-kagaribi-campaign.mjs')){
 if(process.argv[2]==='--routes'){
  const rows=[];
  for(const seed of [1907,42,2026])for(const size of [4,5])for(const mode of ['classic','grid','frontline']){
   rows.push(measureCampaign({seed,size,mode}));
   for(const questOrder of ['standard','reverse'])rows.push(measureCampaign({seed,size,mode,route:'shortcuts',questOrder}));
   if(seed===1907)rows.push(measureCampaign({seed,size,mode,route:'shortcuts',loadout:'bow'}));
  }
  console.log(JSON.stringify(process.argv.includes('--summary')?summarizeCampaigns(rows):rows,null,2));
 }else if(process.argv[2]==='--matrix'){
  const rows=[];
  for(const seed of [1907,42,2026])for(const size of [4,5])for(const mode of ['classic','grid','frontline'])rows.push(measureCampaign({seed,size,mode}));
  console.log(JSON.stringify(rows,null,2));
 }else{
  const [seed='1907',size='4',mode='classic',optional='yes',route='standard',questOrder='standard',loadout='standard']=process.argv.slice(2);
  console.log(JSON.stringify(measureCampaign({seed:Number(seed),size:Number(size),mode,optional:optional!=='no',route,questOrder,loadout}),null,2));
 }
}
