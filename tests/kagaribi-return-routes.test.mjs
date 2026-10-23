import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,drain,data} from './helpers.mjs';
import {campaignRoute} from '../tools/campaign-route.mjs';
import {measureCampaign} from '../tools/measure-kagaribi-campaign.mjs';

test('route measurement selects the shorter parallel door without mutating game or RNG',()=>{
 // Geometry fixture only. The earned campaign tests below open every gate
 // through public actions and keep normal encounters and resource costs.
 const g=newGame();g.state.quests.q001.stage='completed';
 g.teleport('kagaribi_relay',1,9,'west');g.state.flags.kagaribi={kilnGate:true,relayGate:true};
 const saved=g.save(),route=campaignRoute(g,{map:'kagaribi_f2',x:1,y:1});
 assert.equal(route.length,3);assert.equal(route[0].connection,'relay_shortcut');assert.equal(g.save(),saved);
 g.state.flags.kagaribi.relayGate=false;
 const closed=campaignRoute(g,{map:'kagaribi_f2',x:1,y:1});
 assert.ok(closed.length>route.length);assert.ok(!closed.some(s=>s.connection==='relay_shortcut'));
 assert.ok(closed.some(s=>s.connection==='soot_relay'));
});

test('route measurement respects shared edges at both sides of a connection',()=>{
 const g=newGame();g.teleport('kagaribi_relay',1,9,'west');g.state.flags.kagaribi={kilnGate:true,relayGate:true};
 g.data=structuredClone(data);const map=g.data.maps.kagaribi_relay;
 // Blocking the destination boundary must also exclude the convenient gate.
 (g.data.maps.kagaribi_f2.cells.edges??={})['h:3,1']={preset:'stone_partition'};
 const route=campaignRoute(g,{map:'kagaribi_f2',x:1,y:1});
 assert.ok(!route.some(s=>s.connection==='relay_shortcut'));
 (map.cells.edges??={})['h:1,9']={preset:'stone_partition'};
 map.cells.edges['v:2,9']={preset:'stone_partition'};
 assert.throws(()=>campaignRoute(g,{map:'kagaribi_f2',x:1,y:1}),/No walkable/);
});

for(const [seed,size,mode,questOrder,loadout] of [
 [42,5,'classic','standard','standard'],
 [42,5,'grid','reverse','standard'],
 [1907,5,'frontline','standard','bow'],
 [1907,4,'grid','standard','bow']
])test(`earned shortcuts: ${seed}/${size}/${mode}/${questOrder}/${loadout}`,()=>{
 const r=measureCampaign({seed,size,mode,questOrder,loadout,route:'shortcuts'}),end=r.checkpoints.find(c=>c.label==='10F');
 assert.equal(r.losses,0);assert.ok(end.actors.every(a=>a.level>=15&&a.level<=16&&a.hp>0));
 assert.deepEqual(r.opened,['cargoGate','relayGate','altarGate']);
 for(const id of ['cargo_shortcut','relay_shortcut','altar_shortcut'])assert.ok(r.connections[id]>0);
 assert.equal(r.returns.at(-1).from,'kagaribi_f3');assert.equal(r.returns.at(-1).steps,101);
 assert.equal(r.returns.at(-1).oilSpentWalking,101);assert.ok(r.minOil>0);
 assert.deepEqual(r.checkpoints.filter(c=>/^q2/.test(c.label)).map(c=>c.label),questOrder==='reverse'?['q207','q206','q209','q203','q202','q201']:['q201','q202','q203','q209','q206','q207']);
 if(loadout==='bow')assert.ok(r.purchases.some(p=>p.actor==='nio'&&p.item==='exp_t1_bow'));
 assert.equal(r.checkpoints.at(-1).label,'returned');
});

test('already repaired central camp retains its old reward after save and load',()=>{
 const g=newGame();g.data=structuredClone(data);
 delete g.data.quests.q001.story;g.accept('q001');g.complete('q001','informed');drain(g);
 g.teleport('kagaribi_f3',3,1,'east');g.state.flags.kagaribi={altarGuardianWon:true};
 g.data.expedition.camps.find(c=>c.id==='kagaribi_central').xp=1800;
 g.give('rope',1);assert.ok(g.dispatch({type:'expedition.action',camp:'kagaribi_central',action:'repair'}));drain(g);
 const before=g.state.actors.ada.xp,saved=g.save();g.data.expedition.camps.find(c=>c.id==='kagaribi_central').xp=2000;g.load(saved);
 assert.equal(g.state.actors.ada.xp,before);
 assert.equal(g.dispatch({type:'expedition.action',camp:'kagaribi_central',action:'repair'}),false);
 assert.equal(g.state.actors.ada.xp,before);
});
