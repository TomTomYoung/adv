import test from 'node:test';
import assert from 'node:assert/strict';
import {measureCampaign} from '../tools/measure-kagaribi-campaign.mjs';

for(const size of [4,5])for(const mode of ['classic','grid','frontline'])test(`${size} members / ${mode}: earned progression, real guardian victory, purchases and return`,()=>{
  const r=measureCampaign({seed:1907,size,mode}),end=r.checkpoints.find(c=>c.label==='10F');
  assert.equal(r.losses,0);
  assert.ok(end.actors.every(a=>a.level>=15&&a.level<=16&&a.hp>0));
  assert.ok(r.battles.length>20);
  assert.ok(r.battles.some(b=>b.encounter==='kagaribi_altar_guardian'&&b.rounds>=3));
  assert.ok(r.purchases.filter(p=>p.item?.startsWith('exp_t1_')).length===size);
  assert.ok(r.purchases.some(p=>p.skill));
  assert.ok(r.rests>0&&r.spentGold>size*100&&r.spentGems>0&&r.mpSpent>0);
  assert.ok(r.minOil>0);
  assert.equal(r.checkpoints.at(-1).label,'returned');
  if(mode!=='classic')assert.ok(r.battles.some(b=>b.moves>0));
});

test('earned training route buys 4F/9F/10F skills after a real 9F town return and guardian victory',()=>{
 const r=measureCampaign({seed:1907,mode:'classic',training:true});
 for(const skill of ['exp_second_breath','exp_purging_pursuit','exp_parry_command'])assert.ok(r.purchases.some(p=>p.skill===skill));
 assert.ok(r.skillUses.exp_second_breath>0&&r.skillUses.exp_purging_pursuit>0);assert.equal(r.spentGems,460);
 assert.ok(r.checkpoints.some(c=>c.label==='9F training'));assert.equal(r.losses,0);
});

test('earned exploration training buys both lessons, saves active effects and walks the measured route',()=>{
 const r=measureCampaign({seed:1907,mode:'classic',fieldTraining:true});
 for(const skill of ['exp_oil_spark','exp_route_survey']){assert.ok(r.purchases.some(p=>p.skill===skill));assert.ok(r.skillUses[skill]>0);}
 assert.equal(r.spentGems,340);assert.equal(r.measuredReturnSteps,2);assert.equal(r.losses,0);
 assert.ok(r.checkpoints.some(c=>c.label==='field training'));assert.ok(r.minOil>0);
});
