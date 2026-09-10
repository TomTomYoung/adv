// Authored scene graphs. Helpers only express state transitions; stories remain per-quest.
export const Q=(number,client,brief,nodes,endings,extra={})=>({number,client,brief,nodes,endings,...extra});
export const N=(id,text,options)=>({id,text,options});
export const O=(id,text,to,extra={})=>({id,text,to,...extra});
export const E=(label,text)=>({label,text});
export const R=key=>({ref:`flags.quest.__Q__.${key}`});
export const eq=(left,right)=>({op:'eq',left,right});
export const F=key=>eq(R(key),true);
export const not=arg=>({op:'not',arg});
export const and=(...args)=>({op:'and',args});
export const or=(...args)=>({op:'or',args});
export const ge=(left,right)=>({op:'gte',left,right});
export const lt=(left,right)=>({op:'lt',left,right});
export const add=(...args)=>({op:'add',args});
export const T=(when,yes,no='')=>({when,yes,no});
export const alive=actor=>and({op:'has_member',actor},{op:'gt',left:{ref:`actors.${actor}.hp`},right:0});
export const item=(id,count=1)=>({op:'has_item',item:id,count});
export const count=(metric,id)=>({op:'record_count',metric,...(id?{id}:{}),sinceQuest:'__Q__'});
