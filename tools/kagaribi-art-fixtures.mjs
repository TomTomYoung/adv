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
    const checkpoint=(g,id,scene,cast)=>{
      assert.equal(g.state.stories[id].scene,scene);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),cast);
      const save=g.save();g.load(save);assert.equal(g.save(),save);
      fixtures.push({edition,quest:id,scene,cast,save});return save;
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
  }
  return {fixtures,outcomes};
}
