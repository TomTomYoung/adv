import {encounterGridProperties,targetingSchema,frontlineTargetingSchema,battleRulesSchema,battleGridPresentationSchema} from '../battle-grid-schemas.js';
import {actionStatusProperties} from '../status-schemas.js';
import {skillLevelProperties,scoutingProperties,preemptiveSchema} from '../skill-schemas.js';
const str={type:'string',minLength:1},num={type:'number'},uint={type:'integer',minimum:0},bool={type:'boolean'},dict=s=>({type:'object',additionalProperties:s}),arr=s=>({type:'array',items:s}),obj=(properties,required=[])=>({type:'object',properties,required,additionalProperties:true});
const stats=obj(Object.fromEntries(['hp','mp','str','vit','agi','int'].map(k=>[k,{type:'number',minimum:0}]))),target={enum:['enemy','all_enemies','ally','all_allies','self','party']};
const expression={$ref:'#/$defs/value'};
export const effectSchema={oneOf:[
 obj({type:{const:'purge_undead'}},['type']),
 obj({type:{const:'frontline_remove'}}),
 obj({type:{const:'frontline_knockback'},distance:{type:'integer',minimum:1,maximum:3},collisionDamage:{type:'integer',minimum:0,maximum:1000000}}),
 obj({type:{const:'stun'},count:{type:'integer',minimum:1,maximum:20},stack:{enum:['refresh','add']},chance:{type:'number',minimum:0,maximum:1}},['type']),
 obj({type:{const:'damage'},formula:str,amount:num,element:{enum:['physical','fire','ice','lightning','light','dark','earth']}},['type']),
 obj({type:{const:'heal'},formula:str,amount:num},['type']),obj({type:{const:'restore_mp'},amount:num,formula:str},['type']),obj({type:{const:'drain_mp'},amount:num,formula:str},['type']),
 obj({type:{const:'status'},status:str,level:{type:'integer',minimum:1,maximum:3},chance:{type:'number',minimum:0,maximum:1}},['type','status']),obj({type:{const:'buff'},buff:str},['type','buff']),
 obj({type:{const:'guard'},level:{type:'integer',minimum:1,maximum:3}},['type']),
 ...['cleanse','cover','analyze','repel'].map(type=>obj({type:{const:type}},['type']))
]};
export const recordSchemas={
 item:obj({id:str,name:str,description:{type:'string'},type:{enum:['consumable','material','equipment','key','dungeon_tool']},field:bool,consumed:bool,script:str,battleSkill:str,slot:{enum:['weapon','armor','charm']},equipmentType:str,stats:obj(Object.fromEntries(['hp','mp','str','vit','agi','int'].map(k=>[k,num]))),resist:dict(num)},['name']),
 skill:obj({targeting:targetingSchema,frontlineTargeting:frontlineTargetingSchema,...skillLevelProperties(effectSchema),fieldUse:bool,name:str,description:{type:'string'},mp:uint,hp:uint,target,maxTargets:{type:'integer',minimum:1},materials:dict(uint),requiresWeapon:arr(str),requiresAnalyzed:bool,effects:arr(effectSchema),selfEffects:arr(effectSchema),fireEffect:str,priority:num},['name','mp','target','effects']),
 ability:obj({...skillLevelProperties(effectSchema),...scoutingProperties,id:str,name:str,api:str,target:str,modes:arr(str),mp:uint,hp:uint},['id','name','api','target','modes','mp']),
 monster:obj({undead:bool,frontlineDefeat:{enum:['remove','remain']},preemptive:preemptiveSchema,id:str,name:str,description:{type:'string'},region:{type:'integer',minimum:1,maximum:10},sprite:str,stats,resist:dict(num),rewards:obj({gold:uint,xp:uint}),skill:str,skills:arr(str),ai:arr(obj({priority:num,condition:expression,skill:str,target:{enum:['random','weakest','self']}},['priority','skill','target'])),statusImmune:arr(str)},['name','sprite','stats']),
 actor:obj({id:str,name:str,description:{type:'string'},portrait:str,stats,growth:stats,skills:arr(str),equipment:obj({weapon:{type:['string','null']},armor:{type:['string','null']},charm:{type:['string','null']}}),statusImmune:arr(str)},['id','name','stats']),
 stock:obj({item:str,price:uint},['item','price']),
 encounter:obj({...encounterGridProperties,preemptive:preemptiveSchema,id:str,text:{type:'string'},escape:bool,enemies:{...arr(str),minItems:1}},['text','escape','enemies']),
 status:obj({...actionStatusProperties,name:str,description:str,category:{enum:['physical','parameter','magic']},stats:obj(Object.fromEntries(['str','vit','agi','int'].map(k=>[k,{type:'number',minimum:0,maximum:5}]))),duration:obj({steps:{type:'integer',minimum:1,maximum:1e6},turns:{type:'integer',minimum:1,maximum:1e6}}),stepDamage:uint,turnDamage:uint},['name']),
 profile:obj({skillActions:arr(str),commonSkills:arr(str),legacyGrowth:stats,equipmentTypes:obj({weapon:arr(str),armor:arr(str),charm:arr(str)}),statNames:dict(str)}),
 ambient:obj({darkness:obj({threshold:uint,color:str,maxOpacity:{type:'number',minimum:0,maximum:1}}),shade:obj({color:str,opacity:{type:'number',minimum:0,maximum:1}})}),
};
export function enrichSchema(kind,schema){const extra=recordSchemas[kind];return extra?{...schema,...extra,properties:{...schema?.properties,...extra.properties},required:schema?.required??extra.required}:schema;}
