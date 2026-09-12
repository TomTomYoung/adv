// This vocabulary compiles actions; it never chooses a plot, clue count or ending menu.
export {N,O,E,T,eq,not,and,or,ge,lt,add,item,alive,count} from './scenario-kit.mjs';
export const Q=(number,progression,nodes,extra={})=>({number,progression,nodes,...extra});
export const R=key=>({ref:`flags.flow.__Q__.${key}`});
export const F=key=>({op:'eq',left:R(key),right:true});
export const done=(id,outcome)=>({op:'eq',left:{ref:`quests.${id}.${outcome?'outcome':'stage'}`},right:outcome??'completed'});
