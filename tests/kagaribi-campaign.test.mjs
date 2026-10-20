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
