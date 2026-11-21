import assert from 'node:assert/strict';
import {createQuestTrial} from '../src/application/quest-playtest.js';
import {previous,catalog} from '../tests/deep-abyss-helpers.mjs';
import {drain,fight} from '../tests/helpers.mjs';

export async function verifyDeepAbyssSaves(page){
  const cases=[
    ['q096',['follow','route'],['redirect'],'informed'],['q097',['name','register'],['certificate'],'informed'],
    ['q098',['open'],[],'contract'],['q099',['talk','resident'],['returner','connect'],'informed'],['q100',['key'],[],'contract']
  ];
  for(const [quest,before,after,outcome] of cases){
    const g=createQuestTrial(previous,catalog,{quest,start:'site',party:'balanced',level:10,outcome,battleMode:'classic',seed:1907}).engine;
    drain(g);for(const id of before){assert.ok(g.dispatch({type:'choose',id}));drain(g);}
    const save=g.save(),battle=g.state.battle?.encounter??null,commands=[],dispatch=g.dispatch.bind(g);
    g.dispatch=intent=>{const ok=dispatch(intent);if(ok)commands.push(intent);return ok;};
    if(g.state.battle)fight(g);for(const id of after){assert.ok(g.dispatch({type:'choose',id}));drain(g);}
    assert.equal(g.state.quests[quest].outcome,outcome);
    await page.selectOption('#quest',quest);await page.selectOption('#outcome',outcome);await page.click('#launch');
    await page.waitForFunction(q=>questPlaytest.trial.engine.state.quests[q].stage==='active',quest);
    const restored=await page.evaluate(({save,quest})=>{
      const engine=questPlaytest.trial.engine;engine.load(save);const raw=engine.save();engine.load(raw);questPlaytest.render();
      return [engine.state.flags.legacyStoryRoutes[quest],engine.state.battle?.encounter??null,engine.save()===raw];
    },{save,quest});assert.deepEqual(restored,[true,battle,true]);
    for(const intent of commands){
      if(await page.evaluate(()=>questPlaytest.report().status==='cleared'))break;
      assert.ok(await page.evaluate(i=>questPlaytest.dispatch(i),intent),quest+'/'+intent.type);
    }
    const result=await page.evaluate(q=>{
      const r=questPlaytest.report(),g=questPlaytest.trial.engine;
      return [r.status,r.outcome,r.gold.end,g.state.actors.ada.xp,g.state.quests[q].stage,g.state.ending];
    },quest);
    assert.deepEqual(result,['cleared',outcome,g.state.gold,g.state.actors.ada.xp,'completed',g.state.ending]);
    console.log('PUBLIC_LEGACY',quest,battle??'dialogue',outcome);
  }
}
