import {GameEngine} from '../core/engine.js';

// All save entry points use this policy; malformed and unsupported saves restart.
export function restoreGame(data,text){
  const engine=new GameEngine(data);
  try{engine.load(text);return {engine,restarted:false,message:'記録を読み込みました。'};}
  catch{return {engine:new GameEngine(data),restarted:true,message:'この記録は読み込めないため、最初から新しい旅を始めました。'};}
}
