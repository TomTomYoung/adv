import {kind} from '../model.js';
export function resolveSchema(schema,root,value,depth=0){
 if(depth>30)return {};if(schema===true||schema===false||!schema)return {};
 if(schema.$ref){let target=root;for(const p of schema.$ref.slice(2).split('/'))target=target?.[p.replaceAll('~1','/').replaceAll('~0','~')];return resolveSchema(target,root,value,depth+1);}
 const variants=schema.oneOf??schema.anyOf;
 if(variants){const resolved=variants.map(s=>resolveSchema(s,root,value,depth+1));const discriminator=resolved.find(s=>Object.entries(s.properties??{}).some(([k,v])=>Object.hasOwn(v,'const')&&value?.[k]===v.const));
  const reference=resolved.find(s=>s.properties?.ref&&value?.ref!==undefined),format=resolved.find(s=>s.properties?.format&&value?.format!==undefined);
  return reference??format??discriminator??resolved.find(s=>{const types=Array.isArray(s.type)?s.type:[s.type];return types.includes(kind(value))||kind(value)==='number'&&types.includes('integer');})??resolved[0]??{};
 }return schema;
}
export function schemaAt(root,value,path){let schema=root,part=value;for(const key of path){schema=resolveSchema(schema,root,part);schema=Array.isArray(part)?schema.items:schema.properties?.[key]??schema.additionalProperties;part=part?.[key];}return resolveSchema(schema,root,part);}
export function initialValue(schema,root,key='',context,depth=0){
 if(depth>8)return null;schema=resolveSchema(schema,root,undefined);
 if(Object.hasOwn(schema,'const'))return schema.const;if(schema.enum)return schema.enum[0];
 const type=Array.isArray(schema.type)?schema.type.find(t=>t!=='null'):schema.type;
 if(type==='boolean')return false;
 if(type==='integer'||type==='number')return Math.max(schema.minimum??0,schema.exclusiveMinimum!==undefined?schema.exclusiveMinimum+1:0);
 if(type==='array')return Array.from({length:schema.minItems??0},()=>initialValue(schema.items,root,key,context,depth+1));
 if(type==='object'||schema.properties){const v={};for(const k of schema.required??[])v[k]=initialValue(schema.properties?.[k]??{},root,k,context,depth+1);return v;}
 if(type==='null')return null;
 return context?.defaultReference?.(key)??'';
}
