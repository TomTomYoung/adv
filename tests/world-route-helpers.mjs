import assert from 'node:assert/strict';
import {validateSave} from '../src/core/save.js';
import {drain,fight,exploreSpot} from './helpers.mjs';

export function checkpoint(g){
  const save=g.save();assert.deepEqual(validateSave(JSON.parse(save),g.data),[]);
  g.load(save);assert.equal(g.save(),save);return save;
}
export function go(g,q,place,options={}){
  exploreSpot(g,g.data.quests[q].story.worldPlaces[place],{maintain:true,interact:false,...options});
}
export function resume(g,q){
  assert.ok(g.dispatch({type:'story.resume',quest:q}),q+': '+g.state.notice);drain(g);
}
export function arrive(g,q,{recover=false,...options}={}){
  const pending=structuredClone(g.state.journey),story=g.data.quests[q].story,to=story.actions[pending.action].journey.to;
  const before=recover?structuredClone(g.state.stories[q]):null,losses=g.state.records.losses;
  go(g,q,to,{...options,stopOnRescue:recover});
  if(recover&&g.state.records.losses>losses){
    assert.equal(g.state.mode,'town');
    assert.deepEqual(g.state.journey,pending);assert.deepEqual(g.state.stories[q],before);
    checkpoint(g);go(g,q,to,options);
  }
  if(g.state.journey)resume(g,q);
  drain(g);assert.equal(g.state.journey,null);
}
export function depart(g,id){
  assert.ok(g.dispatch({type:'choose',id}),id+': '+g.state.notice);drain(g);
}
export function choose(g,q,id){
  depart(g,id);
  if(g.state.battle){fight(g);drain(g);}
  if(g.state.journey)arrive(g,q);
}
export function collectStates(q,paths,ready,setupRoute){
  const current=new Map(),legacy=new Map();
  for(const route of paths){
    for(const [old,collection,choices] of [[false,current,route.path],[true,legacy,route.old]]){
      const g=ready(q,{old});setupRoute?.(g,q,route);
      for(const id of choices){
        const state=old?g.state.flags.flow[q]:g.state.stories[q],key=JSON.stringify([state,route.history]);
        if(!collection.has(key))collection.set(key,{scene:old?state.node:state.scene,save:g.save()});
        choose(g,q,id);
      }
    }
  }
  return {current:[...current.values()],legacy:[...legacy.values()]};
}
