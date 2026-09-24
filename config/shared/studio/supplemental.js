const str={type:'string',minLength:1},num={type:'number'},uint={type:'integer',minimum:0},bool={type:'boolean'},dict=s=>({type:'object',additionalProperties:s}),arr=s=>({type:'array',items:s}),obj=(properties,required=[])=>({type:'object',properties,required,additionalProperties:true});
const stats=obj(Object.fromEntries(['hp','mp','str','vit','agi','int'].map(k=>[k,{type:'number',minimum:0}]))),target={enum:['enemy','all_enemies','ally','all_allies','self','party']};
const expression={$ref:'#/$defs/value'};
export const effectSchema={oneOf:[
 obj({type:{const:'damage'},formula:str,amount:num,element:{enum:['physical','fire','ice','lightning','light','dark','earth']}},['type']),
 obj({type:{const:'heal'},formula:str,amount:num},['type']),obj({type:{const:'restore_mp'},amount:num,formula:str},['type']),obj({type:{const:'drain_mp'},amount:num,formula:str},['type']),
 obj({type:{const:'status'},status:str,chance:{type:'number',minimum:0,maximum:1}},['type','status']),obj({type:{const:'buff'},buff:str},['type','buff']),
 ...['guard','cleanse','cover','analyze','repel'].map(type=>obj({type:{const:type}},['type']))
]};
export const recordSchemas={
 item:obj({id:str,name:str,description:{type:'string'},type:{enum:['consumable','material','equipment','key','dungeon_tool']},field:bool,consumed:bool,script:str,battleSkill:str,slot:{enum:['weapon','armor','charm']},equipmentType:str,stats,resist:dict(num)},['name']),
 skill:obj({name:str,description:{type:'string'},mp:uint,hp:uint,target,maxTargets:{type:'integer',minimum:1},materials:dict(uint),requiresWeapon:arr(str),requiresAnalyzed:bool,effects:arr(effectSchema),selfEffects:arr(effectSchema),fireEffect:str,priority:num},['name','mp','target','effects']),
 monster:obj({id:str,name:str,description:{type:'string'},region:{type:'integer',minimum:1,maximum:10},sprite:str,stats,resist:dict(num),rewards:obj({gold:uint,xp:uint}),skill:str,skills:arr(str),ai:arr(obj({priority:num,condition:expression,skill:str,target:{enum:['random','weakest','self']}},['priority','skill','target'])),statusImmune:arr(str)},['name','sprite','stats']),
 actor:obj({id:str,name:str,description:{type:'string'},portrait:str,stats,growth:stats,skills:arr(str),equipment:obj({weapon:{type:['string','null']},armor:{type:['string','null']},charm:{type:['string','null']}}),statusImmune:arr(str)},['id','name','stats']),
 stock:obj({item:str,price:uint},['item','price']),
 encounter:obj({id:str,text:{type:'string'},escape:bool,enemies:{...arr(str),minItems:1}},['text','escape','enemies']),
 status:obj({name:str,stepDamage:uint,turnDamage:uint},['name']),
 profile:obj({commonSkills:arr(str),legacyGrowth:stats,equipmentTypes:obj({weapon:arr(str),armor:arr(str),charm:arr(str)}),statNames:dict(str)}),
 ambient:obj({darkness:obj({threshold:uint,color:str,maxOpacity:{type:'number',minimum:0,maximum:1}}),shade:obj({color:str,opacity:{type:'number',minimum:0,maximum:1}})}),
};
export function enrichSchema(kind,schema){const extra=recordSchemas[kind];return extra?{...schema,...extra,properties:{...schema?.properties,...extra.properties},required:schema?.required??extra.required}:schema;}
