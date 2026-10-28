// Reach each adopted Oddland cast through existing choices and actual journeys.
import assert from 'node:assert/strict';
import {loadContent} from '../src/core/loader.js';
import {projectGame} from '../src/application/projection.js';
import {border,start,go,drain,checkpoint,data,read,prepare,play,paths} from '../tests/oddland-helpers.mjs';

async function q291ArtFixtures(){
  const fixtures=[],outcomes=[],g=border(),q=start(g,291);
  const first=await loadContent(read,{edition:'e1'});
  assert.equal(first.quests.q291,undefined);
  for(const id of ['od_marta','od_teo','od_rad','od_nurse'])assert.equal(first.characters[id],undefined);
  const state=(party,teo,rad,resolution='pending',finished=false)=>{
    const v=g.state.stories.q291.values;
    assert.deepEqual([v.partyAt,v.martaAt,v.teoAt,v.radAt,v.nurseAt,v.resolution,v.finished],
      [party,'yard',teo,rad,'clinic',resolution,finished]);
  };
  const capture=(scene,cast)=>{
    assert.equal(g.state.stories.q291.scene,scene);
    assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),cast);
    checkpoint(g);const save=g.save();fixtures.push({edition:'e2',quest:'q291',scene,cast,save,...(scene==='protected'?{faces:{od_nurse:[.42,.20,.62,.32],od_rad:[.38,.21,.56,.32],od_teo:[.40,.23,.62,.36]}}:{})});return save;
  };
  const choose=id=>{
    const action=q.story.actions[`${g.state.stories.q291.scene}_${id}`];assert.ok(action);
    const before=structuredClone(g.state.stories.q291.values),gold=g.state.gold;
    assert.ok(g.dispatch({type:'choose',id}));drain(g);checkpoint(g);
    if(action.journey){
      assert.ok(g.state.journey);assert.equal(g.state.quests.q291.stage,'active');
      const v=g.state.stories.q291.values;
      assert.equal(v.partyAt,'transit');assert.equal(v.finished,false);
      assert.equal(v.resolution,before.resolution,'resolution takes effect on arrival');
      for(const who of ['marta','teo','rad','nurse'])assert.equal(v[who+'At'],
        action.journey.companions.includes(who)?'transit':before[who+'At']);
      go(g,q.story.worldPlaces[action.journey.to]);
      if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:q.id}));
      drain(g);assert.equal(g.state.journey,null);checkpoint(g);
    }
    assert.equal(g.state.gold,gold+(action.ending?q.outcomes[action.ending].gold:0));
  };
  const complete=outcome=>{
    choose('finish');assert.equal(g.state.quests.q291.outcome,outcome);
    assert.equal(g.state.quests.q291.stage,'completed');assert.equal(g.state.vars.region_12,1);
    checkpoint(g);outcomes.push(`e2/q291/${outcome}`);
  };
  state('yard','yard','refuge');capture('entry',['od_marta']);
  choose('look');assert.ok(g.state.stories.q291.knowledge.party.includes('child'));
  state('yard','yard','refuge');const found=capture('found',['od_marta','od_teo']);
  choose('escort');state('refuge','refuge','refuge','escort');capture('reunion',['od_rad','od_teo']);
  complete('escort');state('refuge','refuge','refuge','escort',true);
  g.load(found);choose('protect');state('clinic','clinic','refuge','protect');capture('shelter',['od_nurse','od_teo']);
  choose('fetch');state('refuge','clinic','refuge','protect');capture('father',['od_rad']);
  choose('guide');state('clinic','clinic','clinic','protect');capture('protected',['od_nurse','od_rad','od_teo']);
  complete('protect');state('clinic','clinic','clinic','protect',true);
  return {fixtures,outcomes};
}


async function q292ArtFixtures(){
  const fixtures=[],outcomes=[],g=border(),q=start(g,292);
  const first=await loadContent(read,{edition:'e1'});
  assert.equal(first.quests.q292,undefined);
  for(const id of ['od_hena','od_oren'])assert.equal(first.characters[id],undefined);
  assert.deepEqual(Object.values(q.outcomes).map(o=>[o.gold,o.xp,o.gems]),[[34,14,0],[26,12,0]]);
  const state=(party,hena,pot,resolution='pending',finished=false)=>{
    const v=g.state.stories.q292.values;
    assert.deepEqual([v.partyAt,v.henaAt,v.orenAt,v.potAt,v.resolution,v.finished],
      [party,hena,'kitchen',pot,resolution,finished]);
  };
  const capture=(scene,cast)=>{
    assert.equal(g.state.stories.q292.scene,scene);
    assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),cast);
    checkpoint(g);const save=g.save();fixtures.push({edition:'e2',quest:'q292',scene,cast,save,
      ...(scene==='meal'?{faces:{od_hena:[.37,.17,.58,.27],od_oren:[.45,.16,.66,.27]}}:{})});return save;
  };
  const choose=id=>{
    const action=q.story.actions[`${g.state.stories.q292.scene}_${id}`];assert.ok(action);
    const before=structuredClone(g.state.stories.q292.values),gold=g.state.gold;
    assert.ok(g.dispatch({type:'choose',id}));drain(g);checkpoint(g);
    if(action.journey){
      assert.ok(g.state.journey);assert.equal(g.state.quests.q292.stage,'active');
      const v=g.state.stories.q292.values;
      assert.equal(v.partyAt,'transit');assert.equal(v.finished,false);
      assert.equal(v.potAt,before.potAt,'walking does not transfer the pot');
      assert.equal(v.resolution,before.resolution);
      for(const who of ['hena','oren'])assert.equal(v[who+'At'],action.journey.companions.includes(who)?'transit':before[who+'At']);
      if(id==='deliver')assert.ok(!(g.state.stories.q292.knowledge.party??[]).includes('shifts'));
      go(g,q.story.worldPlaces[action.journey.to]);
      if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:q.id}));
      drain(g);assert.equal(g.state.journey,null);checkpoint(g);
    }
    assert.equal(g.state.gold,gold+(action.ending?q.outcomes[action.ending].gold:0));
  };
  const complete=outcome=>{
    choose('finish');assert.equal(g.state.quests.q292.outcome,outcome);
    assert.equal(g.state.quests.q292.stage,'completed');assert.equal(g.state.vars.region_12,1);
    checkpoint(g);outcomes.push(`e2/q292/${outcome}`);
  };
  state('canteen','canteen','hena');capture('entry',['od_hena']);
  choose('take');state('canteen','canteen','party');capture('carrying',['od_hena']);
  choose('deliver');state('kitchen','canteen','party');assert.ok(g.state.stories.q292.knowledge.party.includes('shifts'));
  const survey=capture('survey',['od_oren']);
  choose('box');state('kitchen','canteen','oren','delivery');capture('pack',['od_oren']);
  choose('take');state('kitchen','canteen','party','delivery');capture('packed',['od_oren']);
  choose('return');state('canteen','canteen','party','delivery');capture('warm',['od_hena']);
  complete('delivery');state('canteen','canteen','hena','delivery',true);
  g.load(survey);choose('rest');state('kitchen','canteen','oren','together');capture('ask',['od_oren']);
  choose('return');state('canteen','canteen','oren','together');capture('invite',['od_hena']);
  choose('walk');state('kitchen','kitchen','oren','together');capture('meal',['od_hena','od_oren']);
  complete('together');state('kitchen','kitchen','oren','together',true);
  return {fixtures,outcomes};
}

async function q293ArtFixtures(){
  const fixtures=[],outcomes=[],g=border(),q=start(g,293);
  const first=await loadContent(read,{edition:'e1'});
  assert.equal(first.quests.q293,undefined);assert.equal(first.characters.od_nel,undefined);
  assert.deepEqual(Object.values(q.outcomes).map(o=>[o.gold,o.xp,o.gems]),[[32,14,0],[24,12,0]]);
  const state=(party,boots,resolution='pending',finished=false)=>{
    const v=g.state.stories.q293.values;
    assert.deepEqual([v.partyAt,v.nelAt,v.bootsAt,v.resolution,v.finished],[party,'cobbler',boots,resolution,finished]);
  };
  const capture=(scene,cast)=>{
    assert.equal(g.state.stories.q293.scene,scene);
    assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),cast);
    checkpoint(g);const save=g.save();fixtures.push({edition:'e2',quest:'q293',scene,cast,save});return save;
  };
  const choose=id=>{
    const action=q.story.actions[`${g.state.stories.q293.scene}_${id}`];assert.ok(action);
    const before=structuredClone(g.state.stories.q293.values),gold=g.state.gold;
    assert.ok(g.dispatch({type:'choose',id}));drain(g);checkpoint(g);
    if(action.journey){
      assert.ok(g.state.journey);assert.equal(g.state.quests.q293.stage,'active');
      const v=g.state.stories.q293.values;
      assert.equal(v.partyAt,'transit');assert.equal(v.finished,false);
      assert.equal(v.nelAt,'cobbler','the cobbler stays at the workshop');
      assert.deepEqual(action.journey.companions,[]);
      assert.equal(v.bootsAt,before.bootsAt,'walking does not return the boots');
      assert.equal(v.resolution,before.resolution,'resolution takes effect on arrival');
      if(id==='go')assert.ok(!(g.state.stories.q293.knowledge.party??[]).includes('salt'));
      go(g,q.story.worldPlaces[action.journey.to]);
      if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:q.id}));
      drain(g);assert.equal(g.state.journey,null);checkpoint(g);
    }
    assert.equal(g.state.gold,gold+(action.ending?q.outcomes[action.ending].gold:0));
  };
  const complete=outcome=>{
    choose('finish');assert.equal(g.state.quests.q293.outcome,outcome);
    assert.equal(g.state.quests.q293.stage,'completed');assert.equal(g.state.vars.region_12,1);
    checkpoint(g);outcomes.push(`e2/q293/${outcome}`);
  };
  state('cobbler','nel');capture('entry',['od_nel']);
  choose('take');state('cobbler','party');capture('depart',['od_nel']);
  choose('go');state('salt','party');assert.ok(g.state.stories.q293.knowledge.party.includes('salt'));
  const floor=capture('floor',[]);
  choose('sole');state('cobbler','party','sole');capture('newsole',['od_nel']);
  complete('sole');state('cobbler','nel','sole',true);
  g.load(floor);choose('wash');state('wash','party','wash');capture('washing',[]);
  choose('return');state('cobbler','party','wash');capture('washed',['od_nel']);
  complete('wash');state('cobbler','nel','wash',true);
  return {fixtures,outcomes};
}

async function q294ArtFixtures(){
  const fixtures=[],outcomes=[],g=border(),q=start(g,294);
  const first=await loadContent(read,{edition:'e1'});
  assert.equal(first.quests.q294,undefined);
  for(const id of ['od_ver','od_clerk','od_sor'])assert.equal(first.characters[id],undefined);
  assert.deepEqual(Object.values(q.outcomes).map(o=>[o.gold,o.xp,o.gems]),[[25,11,0],[30,13,0]]);
  const state=(party,sor,card,resolution='pending',finished=false)=>{
    const v=g.state.stories.q294.values;
    assert.deepEqual([v.partyAt,v.verAt,v.clerkAt,v.sorAt,v.cardAt,v.resolution,v.finished],
      [party,'registry','customs',sor,card,resolution,finished]);
  };
  const capture=(scene,cast)=>{
    assert.equal(g.state.stories.q294.scene,scene);
    assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),cast);
    checkpoint(g);const save=g.save();const faces=scene==='testify'?{od_sor:[.46,.14,.62,.24],od_clerk:[.40,.18,.55,.28]}:scene==='witnessed'?{od_ver:[.48,.16,.65,.25],od_sor:[.46,.14,.62,.24]}:undefined;
    fixtures.push({edition:'e2',quest:'q294',scene,cast,save,...(faces?{faces}:{})});return save;
  };
  const choose=id=>{
    const scene=g.state.stories.q294.scene,action=q.story.actions[`${scene}_${id}`];assert.ok(action);
    const before=structuredClone(g.state.stories.q294.values),gold=g.state.gold;
    assert.ok(g.dispatch({type:'choose',id}));drain(g);checkpoint(g);
    if(action.journey){
      assert.ok(g.state.journey);assert.equal(g.state.quests.q294.stage,'active');
      const v=g.state.stories.q294.values;
      assert.equal(v.partyAt,'transit');assert.equal(v.finished,false);
      assert.equal(v.verAt,'registry','Ver waits at the registration room');
      assert.equal(v.clerkAt,'customs','Mire stays at the service counter');
      assert.equal(v.cardAt,before.cardAt,'travelling does not hand over the card');
      assert.equal(v.resolution,before.resolution,'witness route takes effect on arrival');
      const escort=scene==='sor'||scene==='testify';
      assert.deepEqual(action.journey.companions,escort?['sor']:[]);
      assert.equal(v.sorAt,escort?'transit':before.sorAt);
      go(g,q.story.worldPlaces[action.journey.to]);
      if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:q.id}));
      drain(g);assert.equal(g.state.journey,null);checkpoint(g);
    }
    assert.equal(g.state.gold,gold+(action.ending?q.outcomes[action.ending].gold:0));
  };
  const complete=outcome=>{
    choose('finish');assert.equal(g.state.quests.q294.outcome,outcome);
    assert.equal(g.state.quests.q294.stage,'completed');assert.equal(g.state.vars.region_12,1);
    checkpoint(g);outcomes.push(`e2/q294/${outcome}`);
  };
  state('registry','refuge','ver');capture('entry',['od_ver']);
  assert.ok(!(g.state.stories.q294.knowledge.party??[]).includes('name'));
  choose('listen');assert.ok(g.state.stories.q294.knowledge.party.includes('name'));
  state('registry','refuge','ver');const choice=capture('choice',['od_ver']);
  choose('record');state('registry','refuge','party','record');capture('card',['od_ver']);
  choose('go');state('customs','refuge','party','record');capture('compare',['od_clerk']);
  choose('return');state('registry','refuge','party','record');capture('recorded',['od_ver']);
  complete('record');state('registry','refuge','ver','record',true);
  g.load(choice);choose('witness');state('refuge','refuge','ver','witness');capture('sor',['od_sor']);
  choose('go');state('customs','customs','ver','witness');capture('testify',['od_sor','od_clerk']);
  choose('return');state('registry','registry','ver','witness');capture('witnessed',['od_ver','od_sor']);
  complete('witness');state('registry','registry','ver','witness',true);
  return {fixtures,outcomes};
}

async function q295ArtFixtures(){
  const fixtures=[],outcomes=[],g=border(),q=start(g,295),cast=['od_dan','od_passenger'];
  const first=await loadContent(read,{edition:'e1'});
  assert.equal(first.quests.q295,undefined);
  for(const id of cast)assert.equal(first.characters[id],undefined);
  assert.deepEqual(Object.values(q.outcomes).map(o=>[o.gold,o.xp,o.gems]),[[38,16,0],[29,15,0]]);
  assert.equal(q.story.actions.choice_shared.cost.gold,6);
  const state=(place,resolution='pending',finished=false)=>{
    const v=g.state.stories.q295.values;
    assert.deepEqual([v.partyAt,v.danAt,v.passengerAt,v.resolution,v.finished],[place,place,place,resolution,finished]);
  };
  const capture=(scene,extra={})=>{
    assert.equal(g.state.stories.q295.scene,scene);
    assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),cast);
    checkpoint(g);const save=g.save();fixtures.push({edition:'e2',quest:'q295',scene,cast,save,faces:{od_dan:[.44,.17,.60,.26],od_passenger:[.43,.14,.59,.24]},...extra});return save;
  };
  const choose=id=>{
    const action=q.story.actions[`${g.state.stories.q295.scene}_${id}`];assert.ok(action);
    const before=structuredClone(g.state.stories.q295.values),gold=g.state.gold;
    assert.ok(g.dispatch({type:'choose',id}));drain(g);checkpoint(g);
    if(action.journey){
      assert.ok(g.state.journey);assert.equal(g.state.quests.q295.stage,'active');
      state('transit',before.resolution);
      assert.deepEqual(action.journey.companions,['dan','passenger']);
      go(g,q.story.worldPlaces[action.journey.to]);
      if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:q.id}));
      drain(g);assert.equal(g.state.journey,null);checkpoint(g);
    }
    assert.equal(g.state.gold,gold-(action.cost?.gold??0)+(action.ending?q.outcomes[action.ending].gold:0));
  };
  const complete=outcome=>{
    choose('finish');assert.equal(g.state.quests.q295.outcome,outcome);
    assert.equal(g.state.quests.q295.stage,'completed');assert.equal(g.state.vars.region_12,1);
    state('yard',outcome,true);checkpoint(g);outcomes.push(`e2/q295/${outcome}`);
  };
  state('yard');capture('entry');assert.ok(!(g.state.stories.q295.knowledge.party??[]).includes('fares'));
  choose('check');state('yard');assert.ok(g.state.stories.q295.knowledge.party.includes('fares'));
  const choice=capture('choice'),gold=g.state.gold;
  choose('shared');state('yard','shared');assert.equal(g.state.gold,gold-6);capture('shared_ready');
  choose('go');state('refuge','shared');capture('shared_test');
  choose('return');state('yard','shared');capture('shared_end');
  complete('shared');assert.equal(g.state.gold,gold-6+38);
  g.load(choice);g.state.gold=0;
  const shortage=capture('choice',{variant:'no-gold',blockedChoice:'shared',availableChoice:'mixed'});
  const options=projectGame(g).dialog.options;
  assert.equal(options.find(o=>o.id==='shared')?.enabled,false);assert.equal(options.find(o=>o.id==='mixed')?.enabled,true);
  assert.equal(g.dispatch({type:'choose',id:'shared'}),false);assert.equal(g.save(),shortage);
  state('yard');choose('mixed');state('yard','mixed');assert.equal(g.state.gold,0);capture('mixed_ready');
  choose('go');state('refuge','mixed');capture('mixed_test');
  choose('return');state('yard','mixed');capture('mixed_end');
  complete('mixed');assert.equal(g.state.gold,29);
  return {fixtures,outcomes};
}


async function q296ArtFixtures(){
  const fixtures=[],outcomes=[],g=border(),q=start(g,296);
  const first=await loadContent(read,{edition:'e1'});
  assert.equal(first.quests.q296,undefined);
  for(const id of ['od_bek','od_oil_seller','od_stock'])assert.equal(first.characters[id],undefined);
  assert.deepEqual(Object.values(q.outcomes).map(o=>[o.gold,o.xp,o.gems]),[[23,10,0],[31,13,0]]);
  const supply=()=>structuredClone({light:g.state.light,expedition:g.state.expedition,inventory:g.state.inventory});
  const initialSupply=supply();
  const state=(party,sample,resolution='pending',finished=false)=>{
    const v=g.state.stories.q296.values;
    assert.deepEqual([v.partyAt,v.bekAt,v.oil_sellerAt,v.stockAt,v.sampleAt,v.resolution,v.finished],
      [party,'inn','oil','warehouse',sample,resolution,finished]);
    assert.deepEqual(supply(),initialSupply,'inspection, handover and town travel do not change expedition supplies');
  };
  const capture=(scene,id)=>{
    assert.equal(g.state.stories.q296.scene,scene);
    assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),[id]);
    checkpoint(g);const save=g.save();
    const regions={od_bek:[.44,.17,.60,.28],od_oil_seller:[.45,.17,.61,.28],od_stock:[.36,.16,.51,.26]};
    fixtures.push({edition:'e2',quest:'q296',scene,cast:[id],save,imageExtension:'png',faces:{[id]:regions[id]}});return save;
  };
  const choose=id=>{
    const scene=g.state.stories.q296.scene,action=q.story.actions[scene+'_'+id];assert.ok(action);
    const before=structuredClone(g.state.stories.q296.values),gold=g.state.gold;
    assert.ok(g.dispatch({type:'choose',id}));drain(g);checkpoint(g);
    if(action.journey){
      assert.ok(g.state.journey);assert.equal(g.state.quests.q296.stage,'active');
      state('transit',before.sampleAt,before.resolution);
      assert.deepEqual(action.journey.companions,[]);
      if(scene==='depart')assert.ok(!(g.state.stories.q296.knowledge.party??[]).includes('smoke'));
      go(g,q.story.worldPlaces[action.journey.to]);
      if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:q.id}));
      drain(g);assert.equal(g.state.journey,null);checkpoint(g);
    }
    assert.equal(g.state.gold,gold+(action.ending?q.outcomes[action.ending].gold:0));
    assert.deepEqual(supply(),initialSupply);
  };
  const complete=(outcome,holder)=>{
    choose('finish');assert.equal(g.state.quests.q296.outcome,outcome);
    assert.equal(g.state.quests.q296.stage,'completed');assert.equal(g.state.vars.region_12,1);
    state('inn',holder,outcome,true);checkpoint(g);outcomes.push('e2/q296/'+outcome);
  };
  state('inn','bek');capture('entry','od_bek');
  assert.ok(!(g.state.stories.q296.knowledge.party??[]).includes('smoke'));
  choose('take');state('inn','party');capture('depart','od_bek');
  choose('go');state('oil','party');assert.ok(g.state.stories.q296.knowledge.party.includes('smoke'));
  const tested=capture('test','od_oil_seller');
  choose('exchange');state('oil','oil_seller','exchange');capture('exchanged','od_oil_seller');
  choose('return');state('inn','oil_seller','exchange');capture('exchange_end','od_bek');
  complete('exchange','oil_seller');
  g.load(tested);choose('recover');state('oil','party','recover');capture('carry','od_oil_seller');
  choose('go');state('warehouse','party','recover');capture('separate','od_stock');
  choose('hand');state('warehouse','stock','recover');capture('stored','od_stock');
  choose('return');state('inn','stock','recover');capture('recover_end','od_bek');
  complete('recover','stock');
  return {fixtures,outcomes};
}

async function q297ArtFixtures(){
  const fixtures=[],outcomes=[],g=border(),q=start(g,297);
  const first=await loadContent(read,{edition:'e1'});
  assert.equal(first.quests.q297,undefined);
  for(const id of ['od_rugo','od_pella'])assert.equal(first.characters[id],undefined);
  assert.deepEqual(Object.values(q.outcomes).map(o=>[o.gold,o.xp,o.gems]),[[20,9,0],[27,12,0]]);
  const inventory=structuredClone(g.state.inventory);
  const state=(party,resolution='pending',finished=false)=>{
    const v=g.state.stories.q297.values;
    assert.deepEqual([v.partyAt,v.rugoAt,v.pellaAt,v.resolution,v.finished],[party,'signals','signals',resolution,finished]);
    assert.deepEqual(g.state.inventory,inventory,'borrowed signal boards do not add an inventory item');
  };
  const capture=(scene,cast=['od_rugo','od_pella'])=>{
    assert.equal(g.state.stories.q297.scene,scene);
    assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),cast);
    checkpoint(g);const save=g.save();
    fixtures.push({edition:'e2',quest:'q297',scene,cast,save,...(cast.length?{faces:{od_rugo:[.48,.17,.62,.26],od_pella:[.40,.19,.53,.28]}}:{})});return save;
  };
  const choose=id=>{
    const action=q.story.actions[g.state.stories.q297.scene+'_'+id];assert.ok(action);
    const before=structuredClone(g.state.stories.q297.values),gold=g.state.gold;
    assert.ok(g.dispatch({type:'choose',id}));drain(g);checkpoint(g);
    if(action.journey){
      assert.ok(g.state.journey);assert.equal(g.state.quests.q297.stage,'active');
      assert.deepEqual(action.journey.companions,[]);state('transit',before.resolution);
      go(g,q.story.worldPlaces[action.journey.to]);
      if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:q.id}));
      drain(g);assert.equal(g.state.journey,null);checkpoint(g);
    }
    assert.equal(g.state.gold,gold+(action.ending?q.outcomes[action.ending].gold:0));
  };
  const complete=outcome=>{
    choose('finish');assert.equal(g.state.quests.q297.outcome,outcome);
    assert.equal(g.state.quests.q297.stage,'completed');assert.equal(g.state.vars.region_12,1);
    state('signals',outcome,true);checkpoint(g);outcomes.push('e2/q297/'+outcome);
  };
  state('signals');capture('entry');assert.ok(!(g.state.stories.q297.knowledge.party??[]).includes('word'));
  choose('listen');state('signals');assert.ok(g.state.stories.q297.knowledge.party.includes('word'));const meaning=capture('meaning');
  choose('demo');state('signals','demo');capture('demonstrate');complete('demo');
  g.load(meaning);choose('signals');state('yard','signals');capture('materials',[]);
  choose('return');state('signals','signals');capture('signs');complete('signals');
  return {fixtures,outcomes};
}

async function q298ArtFixtures(){
  const fixtures=[],outcomes=[],routes=[],g=border();prepare(g,298);const prepared=g.save(),q=start(g,298);
  const first=await loadContent(read,{edition:'e1'});
  assert.equal(first.quests.q298,undefined);
  for(const id of ['od_eme','od_relief','od_loader'])assert.equal(first.characters[id],undefined);
  assert.deepEqual(Object.values(q.outcomes).map(o=>[o.gold,o.xp,o.gems]),[[45,20,0],[37,18,0],[28,16,0]]);
  const inventory=structuredClone(g.state.inventory);
  const state=(party,crate='loader',resolution='pending',relief='inn',pella='signals',finished=false)=>{
    const v=g.state.stories.q298.values;
    assert.deepEqual([v.partyAt,v.emeAt,v.loaderAt,v.crateAt,v.resolution,v.reliefAt,v.pellaAt,v.finished],
      [party,'customs','yard',crate,resolution,relief,pella,finished]);
    assert.deepEqual(g.state.inventory,inventory,'story cargo is not expedition food or an inventory item');
  };
  const capture=(scene,id,extra={})=>{
    assert.equal(g.state.stories.q298.scene,scene);
    assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),[id]);
    checkpoint(g);const save=g.save();
    const regions={od_eme:[.39,.17,.53,.26],od_relief:[.50,.18,.64,.27],od_loader:[.47,.16,.61,.25],od_pella:[.40,.19,.53,.28]};
    fixtures.push({edition:'e2',quest:'q298',scene,cast:[id],save,faces:{[id]:regions[id]},...extra});return save;
  };
  const choose=id=>{
    const action=q.story.actions[g.state.stories.q298.scene+'_'+id];assert.ok(action);
    const before=structuredClone(g.state.stories.q298.values),gold=g.state.gold;
    assert.ok(g.dispatch({type:'choose',id}));drain(g);checkpoint(g);
    if(action.journey){
      assert.ok(g.state.journey);assert.equal(g.state.quests.q298.stage,'active');
      state('transit',before.crateAt,before.resolution,
        action.journey.companions.includes('relief')?'transit':before.reliefAt,
        action.journey.companions.includes('pella')?'transit':before.pellaAt);
      go(g,q.story.worldPlaces[action.journey.to]);
      if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:q.id}));
      drain(g);assert.equal(g.state.journey,null);checkpoint(g);
    }
    assert.equal(g.state.gold,gold+(action.ending?q.outcomes[action.ending].gold:0),'relief allowance belongs to the window, not the party');
  };
  const complete=(outcome,route,crate='loader',relief='inn',pella='signals')=>{
    const count=g.state.vars.region_12;assert.equal(g.unlocked(data.quests.q299),false);
    choose('finish');assert.equal(g.state.quests.q298.outcome,outcome);
    assert.equal(g.state.quests.q298.stage,'completed');assert.equal(g.state.vars.region_12,count+1);
    assert.equal(g.unlocked(data.quests.q299),true);state('customs',crate,outcome,relief,pella,true);checkpoint(g);
    routes.push(route);const key='e2/q298/'+outcome;if(!outcomes.includes(key))outcomes.push(key);
  };
  state('customs');const entry=capture('entry','od_eme',{blockedChoice:'signals',availableChoice:'carry'});
  assert.equal(g.dispatch({type:'choose',id:'signals'}),false);assert.equal(g.save(),entry);
  choose('carry');state('yard','loader','carry');capture('load','od_loader');
  choose('take');state('yard','party','carry');capture('loaded','od_loader');
  choose('go');state('customs','party','carry');capture('carry_end','od_eme');complete('carry','carry','eme');
  g.load(entry);choose('relief');state('inn','loader','relief');capture('recruit','od_relief');
  choose('go');state('customs','loader','relief','customs');capture('relief_end','od_eme');complete('relief','sai','loader','customs');
  g.load(entry);choose('defer');state('yard','loader','defer');capture('postpone','od_loader');
  choose('go');state('customs','loader','defer');capture('defer_end','od_eme');complete('defer','defer');
  g.load(prepared);play(g,297,paths(297).find(p=>p.outcome==='signals'));start(g,298);
  state('customs');capture('entry','od_eme',{variant:'signals',availableChoice:'signals'});
  choose('signals');state('signals','loader','relief');capture('signal_help','od_pella');
  choose('go');state('customs','loader','relief','inn','customs');capture('relief_end','od_eme',{variant:'pella'});
  complete('relief','pella','loader','inn','customs');assert.deepEqual(routes,['carry','sai','defer','pella']);
  return {fixtures,outcomes};
}

async function q299ArtFixtures(){
  const fixtures=[],outcomes=[],routes=[],g=border();prepare(g,299);const q=start(g,299);
  const first=await loadContent(read,{edition:'e1'});
  assert.equal(first.quests.q299,undefined);
  for(const id of ['od_maya','od_worker'])assert.equal(first.characters[id],undefined);
  assert.deepEqual(Object.values(q.outcomes).map(o=>[o.gold,o.xp,o.gems]),[[42,19,0],[48,17,0]]);
  const inventory=structuredClone(g.state.inventory);
  const state=(party,resolution='pending',worker='inn',finished=false)=>{
    const v=g.state.stories.q299.values;
    assert.deepEqual([v.partyAt,v.mayaAt,v.stockAt,v.workerAt,v.resolution,v.finished],[party,'inn','warehouse',worker,resolution,finished]);
    assert.deepEqual(g.state.inventory,inventory,'bedding and cleaning tools are not new inventory items');
  };
  const capture=(scene,cast,extra={})=>{
    assert.equal(g.state.stories.q299.scene,scene);
    assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),cast);
    checkpoint(g);const save=g.save();
    const regions={od_maya:[.46,.15,.60,.23],od_worker:[.36,.13,.50,.21],od_stock:[.36,.16,.51,.26]};
    fixtures.push({edition:'e2',quest:'q299',scene,cast,save,faces:Object.fromEntries(cast.map(id=>[id,regions[id]])),...(cast.includes('od_stock')?{imageExtension:'png'}:{}),...extra});return save;
  };
  const choose=id=>{
    const action=q.story.actions[g.state.stories.q299.scene+'_'+id];assert.ok(action);
    const before=structuredClone(g.state.stories.q299.values),gold=g.state.gold;
    assert.ok(g.dispatch({type:'choose',id}));drain(g);checkpoint(g);
    if(action.journey){
      assert.ok(g.state.journey);assert.equal(g.state.quests.q299.stage,'active');
      assert.deepEqual(action.journey.companions,action===q.story.actions.invite_guide?['worker']:[]);
      state('transit',before.resolution,action.journey.companions.includes('worker')?'transit':before.workerAt);
      go(g,q.story.worldPlaces[action.journey.to]);
      if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:q.id}));
      drain(g);assert.equal(g.state.journey,null);checkpoint(g);
    }
    assert.equal(g.state.gold,gold-(action.cost?.gold??0)+(action.ending?q.outcomes[action.ending].gold:0));
  };
  const complete=(outcome,route)=>{
    const count=g.state.vars.region_12;assert.equal(g.unlocked(data.quests.q300),false);
    choose('finish');assert.equal(g.state.quests.q299.outcome,outcome);
    assert.equal(g.state.quests.q299.stage,'completed');assert.equal(g.state.vars.region_12,count+1);
    assert.equal(g.unlocked(data.quests.q300),true);state(outcome,outcome,outcome,true);checkpoint(g);
    routes.push(route);const key='e2/q299/'+outcome;if(!outcomes.includes(key))outcomes.push(key);
  };
  state('inn');capture('entry',['od_maya','od_worker']);
  choose('inspect');state('warehouse');const survey=capture('survey',['od_stock'],{availableChoice:'annex'}),gold=g.state.gold;
  choose('annex');state('warehouse','annex');capture('paid',['od_stock']);assert.equal(g.state.gold,gold-12);
  choose('go');state('annex','annex');capture('ready',[]);
  choose('fetch');state('inn','annex');capture('invite',['od_maya','od_worker']);
  choose('guide');state('annex','annex','annex');capture('annex_end',['od_worker']);complete('annex','paid');assert.equal(g.state.gold,gold-12+42);
  g.load(survey);g.state.gold=0;
  const shortage=capture('survey',['od_stock'],{variant:'no-gold',blockedChoices:['annex','inn'],availableChoice:'work'});
  for(const id of ['annex','inn']){assert.equal(g.dispatch({type:'choose',id}),false);assert.equal(g.save(),shortage);}
  choose('work');state('warehouse','annex');capture('work',['od_stock']);assert.equal(g.state.gold,0);
  choose('go');state('annex','annex');capture('clean',[]);
  {const before=g.save();assert.equal(g.dispatch({type:'choose',id:'guide'}),false);assert.equal(g.save(),before);assert.equal(g.unlocked(data.quests.q300),false);}
  choose('fetch');state('warehouse','annex');capture('bedding',['od_stock']);
  choose('carry');state('annex','annex');capture('ready',[],{variant:'work'});
  choose('fetch');state('inn','annex');capture('invite',['od_maya','od_worker'],{variant:'work'});
  choose('guide');state('annex','annex','annex');capture('annex_end',['od_worker'],{variant:'work'});assert.equal(g.state.gold,0);complete('annex','work');assert.equal(g.state.gold,42);
  g.load(survey);g.state.gold=12;
  const limited=capture('survey',['od_stock'],{variant:'12-gold',blockedChoice:'inn',availableChoice:'annex'});
  assert.equal(g.dispatch({type:'choose',id:'inn'}),false);assert.equal(g.save(),limited);
  choose('annex');assert.equal(g.state.gold,0);state('warehouse','annex');
  g.load(survey);choose('inn');state('warehouse','inn');capture('inn_paid',['od_stock']);assert.equal(g.state.gold,gold-18);
  choose('go');state('inn','inn');capture('inn_end',['od_maya','od_worker']);complete('inn','inn');assert.equal(g.state.gold,gold-18+48);
  assert.deepEqual(routes,['paid','work','inn']);
  return {fixtures,outcomes};
}

async function q300ArtFixtures(){
  const fixtures=[],outcomes=[],g=border();prepare(g,300);const prepared=g.save(),q=start(g,300);
  const first=await loadContent(read,{edition:'e1'});assert.equal(first.quests.q300,undefined);
  for(const id of ['od_hena','od_oren','od_clerk'])assert.equal(first.characters[id],undefined);
  assert.deepEqual(Object.values(q.outcomes).map(o=>[o.gold,o.xp,o.gems]),[[52,24,0],[44,22,0]]);
  const inventory=structuredClone(g.state.inventory),v=()=>g.state.stories.q300.values;
  const initial={partyAt:'canteen',resolution:'pending',finished:false,henaAt:'canteen',orenAt:'kitchen',clerkAt:'customs',window_noteAt:'hena',kitchen_noteAt:'hena',portionAt:'hena',windowInvited:false,kitchenInvited:false,delivered:false};
  let expected={...initial};
  const state=changes=>{Object.assign(expected,changes);assert.deepEqual(v(),expected);assert.deepEqual(g.state.inventory,inventory,'notes and a meal use story holders, not inventory items');};
  const thanks='この間の食事も、助かったんです',welcome='配達が終わったら、あなたも座っていって';
  const capture=(scene,cast,extra={})=>{
    assert.equal(g.state.stories.q300.scene,scene);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),cast);
    checkpoint(g);const save=g.save(),regions={od_hena:[.37,.17,.58,.27],od_oren:[.45,.16,.66,.27],od_clerk:[.40,.18,.55,.28]};
    fixtures.push({edition:'e2',quest:'q300',scene,cast,save,faces:Object.fromEntries(cast.map(id=>[id,regions[id]])),...extra});return save;
  };
  const choose=id=>{
    const action=q.story.actions[g.state.stories.q300.scene+'_'+id];assert.ok(action);
    const before=structuredClone(v()),gold=g.state.gold;
    assert.ok(g.dispatch({type:'choose',id}));drain(g);checkpoint(g);
    if(action.journey){
      const escort=action===q.story.actions.kitchen_done_go;
      assert.deepEqual(action.journey.companions,escort?['oren']:[]);assert.ok(g.state.journey);
      assert.equal(g.state.quests.q300.stage,'active');
      assert.deepEqual(v(),{...before,partyAt:'transit',...(escort?{orenAt:'transit'}:{})},'walking does not deliver notes, food or invitation flags');
      go(g,q.story.worldPlaces[action.journey.to]);
      if(g.state.journey)assert.ok(g.dispatch({type:'story.resume',quest:q.id}));
      drain(g);assert.equal(g.state.journey,null);checkpoint(g);
    }
    assert.equal(g.state.gold,gold-(action.cost?.gold??0)+(action.ending?q.outcomes[action.ending].gold:0));
  };
  const invite=(record=true)=>{
    state({});if(record)capture('entry',['od_hena']);
    choose('take');state({window_noteAt:'party',kitchen_noteAt:'party'});if(record)capture('depart',['od_hena']);
    choose('go');state({partyAt:'customs'});if(record)capture('window',['od_clerk']);
    choose('hand');state({window_noteAt:'clerk',windowInvited:true});if(record)capture('window_done',['od_clerk']);
    choose('go');state({partyAt:'kitchen'});if(record)capture('kitchen',['od_oren']);
    choose('hand');state({kitchen_noteAt:'oren',kitchenInvited:true});if(record)capture('kitchen_done',['od_oren']);
    choose('go');state({partyAt:'canteen',orenAt:'canteen'});
  };
  const finish=outcome=>{
    const count=g.state.vars.region_12;assert.equal(v().delivered,true);
    choose('finish');state({finished:true});assert.equal(g.state.quests.q300.outcome,outcome);
    assert.equal(g.state.quests.q300.stage,'completed');assert.equal(g.state.vars.region_12,count+1);checkpoint(g);
    const complete=JSON.parse(g.save());assert.equal(g.dispatch({type:'choose',id:'finish'}),false);
    const retried=JSON.parse(g.save());retried.state.notice=complete.state.notice;assert.deepEqual(retried,complete,'rejected replay only clears the completed notice');
    outcomes.push('e2/q300/'+outcome);
  };
  const deliver=outcome=>{
    choose(outcome);state({resolution:outcome});capture(outcome+'_ready',['od_hena','od_oren']);
    choose('take');state({portionAt:'party'});capture(outcome+'_delivery',['od_hena','od_oren']);
    choose('go');state({partyAt:'customs'});capture(outcome+'_window',['od_clerk']);
    {const before=g.save();assert.equal(g.dispatch({type:'choose',id:'finish'}),false);assert.equal(g.save(),before);assert.equal(v().delivered,false);}
    choose('hand');state({portionAt:'clerk',delivered:true});capture(outcome+'_return',['od_clerk']);
    choose('return');state({partyAt:'canteen'});capture(outcome+'_end',['od_hena','od_oren']);finish(outcome);
  };
  invite();assert.notEqual(g.state.quests.q292.stage,'completed');
  const choice=capture('choice',['od_hena','od_oren'],{availableChoice:'table',expectedText:welcome,absentText:thanks}),choiceState={...expected};
  for(const [gold,variant] of [[7,'7-gold'],[8,'8-gold']]){
    g.load(choice);g.state.gold=gold;expected={...choiceState};state({});
    const save=capture('choice',['od_hena','od_oren'],{variant,...(gold<8?{blockedChoice:'table',availableChoice:'potluck'}:{availableChoice:'table'}),expectedText:welcome,absentText:thanks});
    if(gold<8){assert.equal(g.dispatch({type:'choose',id:'table'}),false);assert.equal(g.save(),save);}
    else {deliver('table');assert.equal(g.state.gold,52);}
  }
  g.load(choice);g.state.gold=0;expected={...choiceState};state({});
  const shortage=capture('choice',['od_hena','od_oren'],{variant:'no-gold',blockedChoice:'table',availableChoice:'potluck',expectedText:welcome,absentText:thanks});
  assert.equal(g.dispatch({type:'choose',id:'table'}),false);assert.equal(g.save(),shortage);
  deliver('potluck');assert.equal(g.state.gold,44);
  for(const outcome of ['delivery','together']){
    g.load(prepared);play(g,292,paths(292).find(p=>p.outcome===outcome));start(g,300);expected={...initial};invite(false);
    assert.equal(g.state.quests.q292.outcome,outcome);
    capture('choice',['od_hena','od_oren'],{variant:'thanks-'+outcome,availableChoice:'table',expectedText:thanks,absentText:welcome});
    assert.ok(projectGame(g).dialog.text.includes(thanks));assert.ok(!projectGame(g).dialog.text.includes(welcome));
  }
  return {fixtures,outcomes};
}

export async function oddlandArtFixtures(){
  const groups=[await q291ArtFixtures(),await q292ArtFixtures(),await q293ArtFixtures(),await q294ArtFixtures(),await q295ArtFixtures(),await q296ArtFixtures(),await q297ArtFixtures(),await q298ArtFixtures(),await q299ArtFixtures(),await q300ArtFixtures()];
  return {fixtures:groups.flatMap(g=>g.fixtures),outcomes:groups.flatMap(g=>g.outcomes)};
}
