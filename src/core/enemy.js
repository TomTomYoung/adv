import {clone} from './expression.js';
export function scaledEnemy(definition,index,scale=1){
  const enemy=clone(definition);
  for(const key of ['hp','str','vit','int'])enemy.stats[key]=Math.max(key==='hp'?1:0,Math.round(enemy.stats[key]*scale));
  return {...enemy,instance:`enemy_${index}`,hp:enemy.stats.hp,mp:enemy.stats.mp,statuses:[],guard:false};
}
