import {targetingSchema,frontlineTargetingSchema} from './battle-grid-schemas.js';
const str={type:'string',minLength:1},integer=(min=0,max=1e9)=>({type:'integer',minimum:min,maximum:max});
const obj=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const condition={$ref:'#/$defs/skillCondition'},stage={pattern:'^([2-9]|1[0-9]|20)$'};
const kind=(name,properties,required=Object.keys(properties))=>obj({kind:{const:name},...properties},['kind',...required]);
export const skillConditionSchema={oneOf:[
  kind('actor_level',{level:integer(1,30)}),kind('uses',{skill:str,count:integer(1)},['count']),kind('weapon_uses',{weapon:str,count:integer(1)}),kind('action_uses',{action:str,count:integer(1)}),
  kind('event',{event:str}),kind('flag',{flag:str,value:{type:['boolean','number','string']}},['flag']),kind('training',{skill:str,count:integer(1)},['count']),
  kind('skill',{skill:str,level:integer(1,20)},['skill']),kind('companion',{actor:str}),kind('random',{on:{enum:['skill','weapon','action']},id:str,chance:{type:'number',minimum:0,maximum:1}}),
  obj({all:{type:'array',minItems:1,maxItems:16,items:condition}}),obj({any:{type:'array',minItems:1,maxItems:16,items:condition}})
]};
export const scoutingProperties={radius:integer(1,8),duration:integer(1,10000),actions:integer(1,20),rate:{type:'number',minimum:0,maximum:1},hidden:integer(0,20),difficulty:integer(1,20),trapKinds:{type:'array',uniqueItems:true,items:{enum:['rockfall','cave_in','needle','arrow','gas','magic_circle','pit','explosion','drip']}},recover:{type:'boolean'},returnSteps:integer(1,1000),cells:integer(1,256),disarmCount:integer(0,32)};
export function skillLevelProperties(effect={type:'object'}){return {
  maxSkillLevel:integer(1,20),growthDisplay:{enum:['full','progress','hidden']},
  levels:{type:'object',propertyNames:stage,additionalProperties:obj({targeting:targetingSchema,frontlineTargeting:frontlineTargetingSchema,mp:integer(0,999),hp:integer(0,999),effects:{type:'array',maxItems:16,items:effect},selfEffects:{type:'array',maxItems:16,items:effect},maxTargets:integer(1,8),amount:integer(1,999),...scoutingProperties},[])},
  levelUp:{type:'object',propertyNames:stage,additionalProperties:condition}
};}
export const preemptiveSchema=obj({side:{enum:['allies','enemies']},actions:integer(1,20),chance:{type:'number',minimum:0,maximum:1},priority:integer(0,100)},['side','actions']);
export const trapSchema=obj({kind:scoutingProperties.trapKinds.items,hidden:integer(0,20),difficulty:integer(1,20),recovery:obj({item:str,count:integer(1),minLevel:integer(1,20),chance:{type:'number',minimum:0,maximum:1}})},['kind']);
