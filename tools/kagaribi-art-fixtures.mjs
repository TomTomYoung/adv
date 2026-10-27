// Build display checkpoints through existing story actions and real walking.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {drain} from '../tests/helpers.mjs';
import {finishJourney} from '../tests/structure-routes.mjs';
const read=file=>fs.readFile(new URL('../'+file,import.meta.url),'utf8').then(JSON.parse);
export async function kagaribiArtFixtures(){
  const fixtures=[],outcomes=[];
  for(const edition of ['e1','e2']){
    const data=await loadContent(read,{edition});
    const prepare=id=>{
      const g=new GameEngine(data,1907);drain(g);g.random=()=>.999999;
      g.accept('q001');(g.state.flags.legacyStoryRoutes??={}).q001=true;g.complete('q001','compromise');
      g.award(5000,data.system.xpBase*24*25);g.healAll();for(const item of ['rope','ration','potion','torch'])g.state.inventory[item]=99;
      assert.ok(g.accept(id));const q=data.quests[id],p=q.story.worldPlaces[q.story.scenes.entry.place];
      g.teleport(p.map,p.x,p.y);g.setPortableFire({fuel:90,effect:'ward'});g.run(q.model.entryScript);drain(g);return g;
    };
    const checkpoint=(g,id,scene,cast,extra={})=>{
      assert.equal(g.state.stories[id].scene,scene);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),cast);
      const save=g.save();g.load(save);assert.equal(g.save(),save);
      fixtures.push({edition,quest:id,scene,cast,save,...extra});return save;
    };
    const choose=(g,key)=>{assert.ok(g.dispatch({type:'choose',id:key}),key);drain(g);};
    const arrive=g=>{assert.ok(g.state.journey);const save=g.save();g.load(save);assert.equal(g.save(),save);finishJourney(g);};
    const q201=prepare('q201');checkpoint(q201,'q201','entry',['q201_clerk']);
    choose(q201,'ask');arrive(q201);checkpoint(q201,'q201','witness',['q201_porter']);
    choose(q201,'take');arrive(q201);const reason=checkpoint(q201,'q201','reason',['q201_clerk']);
    choose(q201,'private');arrive(q201);checkpoint(q201,'q201','return',['q201_porter']);choose(q201,'explain');
    assert.equal(q201.state.quests.q201.outcome,'private');outcomes.push(`${edition}/q201/private`);
    for(const [action,outcome] of [['correct','corrected'],['advance','advanced']]){q201.load(reason);choose(q201,action);assert.equal(q201.state.quests.q201.outcome,outcome);outcomes.push(`${edition}/q201/${outcome}`);}
    const q202=prepare('q202');checkpoint(q202,'q202','entry',['q202_trainee']);
    choose(q202,'walk');arrive(q202);const lesson=checkpoint(q202,'q202','lesson',['q202_trainee','q202_trainer']);
    choose(q202,'test');const result=checkpoint(q202,'q202','result',['q202_trainee','q202_trainer']);
    for(const [action,outcome] of [['pair','paired'],['visual','visual']]){q202.load(result);choose(q202,action);assert.equal(q202.state.quests.q202.outcome,outcome);outcomes.push(`${edition}/q202/${outcome}`);}
    q202.load(lesson);choose(q202,'defer');assert.equal(q202.state.quests.q202.outcome,'retrain');outcomes.push(`${edition}/q202/retrain`);
    const q203=prepare('q203');checkpoint(q203,'q203','entry',['q203_seller']);
    const sample=(holder,amounts)=>{
      const v=q203.state.stories.q203.values;assert.equal(v.bottleAt,holder);assert.equal(v.cupAt,'tester');
      assert.deepEqual([v.sample,v.portion,v.burned],amounts);assert.equal(v.sample+v.portion+v.burned,3);
    };
    sample('seller',[3,0,0]);choose(q203,'carry');sample('party',[3,0,0]);arrive(q203);
    const inspect=checkpoint(q203,'q203','inspect',['q203_tester']);sample('party',[3,0,0]);
    choose(q203,'return');arrive(q203);checkpoint(q203,'q203','return',['q203_seller']);choose(q203,'hand');sample('seller',[3,0,0]);
    assert.equal(q203.state.quests.q203.outcome,'returned');outcomes.push(`${edition}/q203/returned`);
    q203.load(inspect);choose(q203,'pour');sample('party',[1,2,0]);checkpoint(q203,'q203','portion',['q203_tester']);
    q203.state.inventory.torch=0;const shortage=checkpoint(q203,'q203','portion',['q203_tester'],{variant:'no-torch',blockedChoice:'burn'});
    assert.equal(q203.dispatch({type:'choose',id:'burn'}),false);assert.equal(q203.save(),shortage);
    q203.load(shortage);q203.state.inventory.torch=1;choose(q203,'burn');assert.equal(q203.state.inventory.torch,0);sample('party',[1,1,1]);
    const result203=checkpoint(q203,'q203','result',['q203_tester']);
    choose(q203,'limited');arrive(q203);checkpoint(q203,'q203','limited',['q203_seller']);choose(q203,'hand');sample('seller',[1,1,1]);
    assert.equal(q203.state.quests.q203.outcome,'limited');outcomes.push(`${edition}/q203/limited`);
    q203.load(result203);choose(q203,'public');sample('tester',[1,1,1]);
    assert.equal(q203.state.quests.q203.outcome,'public');outcomes.push(`${edition}/q203/public`);
    const q204=prepare('q204');checkpoint(q204,'q204','entry',['q204_scribe']);
    const records=(copy,statement,consent,record='open')=>{
      const v=q204.state.stories.q204.values;
      assert.deepEqual([v.copyAt,v.statementAt,v.consent,v.record],[copy,statement,consent,record]);
      assert.equal(v.scribeAt,'shelf');assert.equal(v.survivorAt,'bench');
    };
    records('scribe','survivor','none');choose(q204,'visit');records('party','survivor','none');arrive(q204);
    const meeting=checkpoint(q204,'q204','meeting',['q204_survivor']);
    for(const [consent,action,outcome,blockedChoice] of [['named','add','addendum','seal'],['sealed','seal','sealed','add']]){
      q204.load(meeting);choose(q204,consent);records('party','party',consent);
      checkpoint(q204,'q204','report',['q204_survivor'],{variant:consent});choose(q204,'carry');arrive(q204);
      const filing=checkpoint(q204,'q204','filing',['q204_scribe'],{variant:consent,blockedChoice,availableChoice:action});
      const options=projectGame(q204).dialog.options;
      assert.equal(options.find(o=>o.id===action)?.enabled,true);assert.equal(options.find(o=>o.id===blockedChoice)?.enabled,false);
      assert.equal(q204.dispatch({type:'choose',id:blockedChoice}),false);assert.equal(q204.save(),filing);
      q204.load(filing);records('party','party',consent);choose(q204,action);records('scribe','scribe',consent,outcome);
      assert.equal(q204.state.quests.q204.outcome,outcome);outcomes.push(`${edition}/q204/${outcome}`);
    }
    q204.load(meeting);choose(q204,'pending');arrive(q204);records('party','survivor','none');
    checkpoint(q204,'q204','pending',['q204_scribe']);choose(q204,'correct');records('scribe','survivor','none','pending');
    assert.equal(q204.state.quests.q204.outcome,'pending');outcomes.push(`${edition}/q204/pending`);
  }
  return {fixtures,outcomes};
}
