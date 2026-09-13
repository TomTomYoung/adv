export const ref=ref=>({ref}),eq=(left,right)=>({op:'eq',left,right}),and=(...args)=>({op:'and',args}),or=(...args)=>({op:'or',args}),not=arg=>({op:'not',arg});
export const set=(key,value=true)=>({op:'set',key,value});
export const move=(entities,...path)=>({op:'move',entities:entities.split(' '),path,assistant:'party',carrier:'party'});
export const give=(entity,from,to)=>({op:'transfer',entity,from,to});
export const see=(proposition,source,requires=true)=>({op:'observe',observer:'party',proposition,source,requires});
export const when=(condition,yes,no)=>({when:condition,yes,no});
export function story(number,places,connections){
 const id=`q${String(number).padStart(3,'0')}`;
 const d={version:1,modelVersion:'1.1',places,connections,registry:{},entities:{},propositions:{},initialKnowledge:{},invariants:[],scenes:{},actions:{},endings:{}};
 const draft={id,number,story:d,nodes:[],outcomes:{},past:[],progression:'',agents:[]};
 const s={...draft,v:k=>ref(`stories.${id}.values.${k}`),is:(k,v=true)=>eq(ref(`stories.${id}.values.${k}`),v),known:p=>({op:'contains',left:ref(`stories.${id}.knowledge.party`),right:p}),
  enum(k,initial,values,meaning=k){d.registry[k]={type:'enum',initial,values,meaning};return s;},
  bool(k,initial=false,meaning=k){d.registry[k]={type:'boolean',initial,meaning};return s;},
  int(k,initial,min,max,meaning=k,container){d.registry[k]={type:'integer',initial,min,max,meaning,...(container?{container}:{})};return s;},
  entity(key,place,character=null,extra={}){const holder=`${key}At`;d.entities[key]={holder,kind:character?'person':'item',...(character?{character}:{}),...extra};d.registry[holder]={type:'enum',initial:place,values:[],meaning:`${key} の所在または保持者`};return s;},
  fact(key,text){d.propositions[key]={text};return s;},
  invariant(id,condition,message){d.invariants.push({id,condition,message});return s;},
  node(id,place,cast,text,options,requires=true){d.scenes[id]={title:places[place],place,cast:cast.map(c=>typeof c==='string'?{entity:c}:c),requires};s.nodes.push({id,text,options});for(const o of options){const key=`${id}_${o.id}`;o.action=key;d.actions[key]={from:[id],...(o.to.startsWith('@')?{ending:o.to.slice(1)}:{to:o.to}),requires:o.when??true,effects:o.effects??[],...(o.cost?{cost:o.cost}:{}),once:o.once??true};}return s;},
  end(key,label,text,condition){s.outcomes[key]={label,text};d.endings[key]=condition;return s;},
  done(){const places=Object.keys(d.places),entities=Object.keys(d.entities);for(const [key,e] of Object.entries(d.entities)){d.registry[e.holder].values=e.kind==='item'?[...places,...entities.filter(x=>x!==key)]:places;}d.entities.party.kind='group';
   for(const [alias,canonical] of Object.entries(s.sceneAliases??{})){
    d.scenes[alias]=structuredClone(d.scenes[canonical]);
    for(const o of s.nodes.find(n=>n.id===canonical).options){const action=d.actions[o.action];action.from.push(alias);d.actions[`${alias}_${o.id}`]={...structuredClone(action),from:[alias]};}
   }
   return s;}
 };
 s.entity('party',Object.keys(places)[0],null,{kind:'group'});return s;
}
export const O=(id,text,to,effects=[],extra={})=>({id,text,to,effects,...extra});
