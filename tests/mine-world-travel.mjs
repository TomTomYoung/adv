import assert from 'node:assert/strict';
import {drain,walk,navigateMaps} from './helpers.mjs';
import {town} from './oddland-helpers.mjs';

export function goToMinePlace(g,p,options={}) {
 if(p.kind==='town'){
  if(g.state.mode==='dungeon'){navigateMaps(g,'region_2_f1',options);walk(g,17,1,options);assert.ok(g.dispatch({type:'world.cross',route:'return_cart_surface'}),g.state.notice);drain(g);}
  town(g,p.location);
 }else{
  if(g.state.mode==='town'){town(g,'e2_cart_surface');assert.ok(g.dispatch({type:'world.cross',route:'return_cart_surface'}),g.state.notice);drain(g);}
  navigateMaps(g,p.map,options);walk(g,p.x,p.y,options);drain(g);
 }
}
