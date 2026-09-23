const obj=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
const str={type:'string',minLength:1},bool={type:'boolean'},identifier={...str,pattern:'^[a-z][a-z0-9_]*$'};
export function cellLayerSchema(partial=false){
  const visual=obj({wall:bool,floor:bool,opaque:bool,material:{enum:['floor','wall']},image:{anyOf:[str,{type:'null'}]}},partial?[]:['wall','floor','opaque','material']);
  const parameters={type:'object',properties:{illumination:{type:'integer',minimum:0,maximum:8},water_passable:bool},propertyNames:identifier,additionalProperties:{type:['number','string','boolean']},required:partial?[]:['illumination','water_passable']};
  return obj({passage:{enum:['.','#'],description:'通行可否のみ。見た目・遮光・水密・イベントを意味しない。'},visual,parameters,events:{type:'array',uniqueItems:true,items:identifier}},partial?[]:['passage','visual','parameters','events']);
}
export const cellPlacementSchema=obj({legend:{type:'object',minProperties:1,propertyNames:{pattern:'^[A-Za-z0-9]$'},additionalProperties:identifier},rows:{type:'array',minItems:3,items:{type:'string',pattern:'^[A-Za-z0-9]+$'}},overrides:{type:'object',propertyNames:{pattern:'^(0|[1-9]\\d*),(0|[1-9]\\d*)$'},additionalProperties:cellLayerSchema(true)}});
export const cellEventsSchema=value=>({type:'object',propertyNames:identifier,additionalProperties:obj({trigger:{const:'enter'},script:str,once:bool,condition:value},['trigger','script','once'])});
export const cellTypesSchema={type:'object',minProperties:1,propertyNames:identifier,additionalProperties:cellLayerSchema()};
export function cellPatchSchema(){const schema=cellLayerSchema();delete schema.properties.passage;schema.required=schema.required.filter(k=>k!=='passage');return schema;}
