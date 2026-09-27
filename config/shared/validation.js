import {reliefParametersValid} from '../../src/core/cell-behaviors.js';
import {validateSchema} from './schema.js';
import {kind,pathLabel} from './model.js';
const str={type:'string',minLength:1},bool={type:'boolean'},num={type:'number'},uint={type:'integer',minimum:0};
const obj=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:true});
const dict=items=>({type:'object',additionalProperties:items});
const array=items=>({type:'array',items});
const stats=obj(Object.fromEntries(['hp','mp','str','vit','agi','int'].map(k=>[k,uint])));
const goods=array(obj({item:str,price:uint}));
const point=obj({map:str,x:uint,y:uint});
const item=obj({id:str,name:str,description:str},['name']);
const actor=obj({id:str,name:str,stats,skills:array(str)},['id','name','stats']);
const enemy=obj({id:str,name:str,sprite:str,stats},['id','name','sprite','stats']);
const encounter=obj({id:str,text:str,escape:bool,enemies:{...array(str),minItems:1}},['text','escape','enemies']);
const status=obj({name:str,stepDamage:uint,turnDamage:uint},['name']);
const ability=obj({id:str,name:str,api:str,target:str,mp:uint,hp:uint,materials:dict(uint)},['id','name','api','target','mp']);
const skill=obj({name:str,mp:uint,target:str,effects:array({type:'object'})},['name','mp','target','effects']);
const outcome=obj({label:str,text:str,gold:uint,xp:uint});
export const browserRead=async path=>{const r=await fetch(new URL(`../../${path}`,import.meta.url),{cache:'no-cache'});if(!r.ok)throw Error(`読込失敗: ${path} (${r.status})`);return path.startsWith('config/')?r.text():r.json();};
export function createDefinitions(read=browserRead){
  const cache=new Map();
  const schema=name=>{if(!cache.has(name))cache.set(name,Promise.resolve(read(`data/schemas/${name}.schema.json`)).catch(error=>{cache.delete(name);throw error;}));return cache.get(name);};
  async function definition(entry){
    const family=entry.family;
    const direct={quest:'quest-events',dungeon:'dungeon',locations:'locations',cells:'cell-layers-authoring',art:'dungeon-art'};
    if(direct[family])return schema(direct[family]);
    const script=await schema('script'),scripts=script.properties.scripts,defs=script.$defs;
    const map=await schema('map'),mapValues=dict(map);
    let shape;
    if(family==='maps')shape=obj({schemaVersion:{const:1},maps:mapValues,retiredMaps:array(str),retiredScriptFiles:array(str)});
    if(family==='bundle')shape=obj({maps:mapValues,scripts,items:dict(item),enemies:dict(enemy),encounters:dict(encounter),statuses:dict(status),shopGoods:goods,mapOpenings:array(point),mapKnown:dict(array(str))},entry.file==='dungeon-content.json'?['maps','scripts','items','enemies','encounters','statuses','shopGoods','mapOpenings','mapKnown']:['maps','scripts','items','enemies','encounters']);
    if(family==='voxel')shape=obj({maps:mapValues,scripts});
    if(family==='terrain')shape=obj({mapOpenings:array(point),items:dict(item),shopGoods:goods});
    if(family==='jobs')shape=obj({version:str,profile:obj({commonSkills:array(str),legacyGrowth:stats,equipmentTypes:dict(array(str)),statNames:dict(str)}),initialJobs:dict(str),jobs:await schema('jobs'),buffs:await schema('buffs'),fieldAbilities:dict(ability),skills:dict(skill),formulas:dict({$ref:'#/$defs/value'}),items:dict(item),equipmentPatches:dict({type:'object'}),shopGoods:goods,skillCues:dict(str)});
    if(family==='entities')shape=obj({version:str,source:str,examples:str,monsters:array({...enemy,properties:{...enemy.properties,region:{type:'integer',minimum:1,maximum:10},skill:str},required:[...enemy.required,'region','skill']}),actors:dict(actor)});
    if(family==='presentation'){
      const sound=obj({name:str,use:str,instrument:str,gain:{type:'number',minimum:0,maximum:1},notes:array(obj({pitch:{type:'integer',minimum:0,maximum:127},start:{type:'number',minimum:0},seconds:{type:'number',exclusiveMinimum:0},velocity:{type:'integer',minimum:0,maximum:127}}))});
      const cue=obj({effects:array(str),sound:str,target:str,gap:{type:'number',minimum:0},battle:obj({impact:{type:'number',minimum:0,maximum:1000},anticipation:str},['impact'])},['effects','target']);
      shape=obj({version:str,sounds:dict(sound),effects:await schema('effects'),cues:dict(cue),bindings:dict(dict(str)),ambient:{type:'object'}});
    }
    if(family==='catalog')shape={...array(obj({id:str,title:str,brief:str,past:str,progression:str,outcomes:dict(outcome),nodes:array(obj({id:str,options:array(obj({text:str,to:str},['text']))},['id']))})),minItems:10,maxItems:10};
    if(!shape)throw Error(`編集形式がありません: ${family}`);
    return {...shape,$defs:defs};
  }
  return definition;
}
export function createValidator(read=browserRead){
  const definition=createDefinitions(read);
  return async(entry,value)=>{
    const errors=validateSchema(value,await definition(entry));if(errors.length)return errors;
    const fail=(path,text)=>errors.push(`${pathLabel(path)}: ${text}`);
    function walk(v,path=[]){
      if(Array.isArray(v)){
        const ids=v.filter(x=>kind(x)==='object'&&typeof x.id==='string'&&typeof x.op!=='string').map(x=>typeof x.map==='string'?`${x.id}/${x.map}/${x.x},${x.y}`:x.id);
        if(new Set(ids).size!==ids.length)fail(path,'同じ一覧に重複するIDがあります。');
        v.forEach((x,i)=>walk(x,[...path,i]));
      }else if(kind(v)==='object'){
        if(v.edge!==undefined&&v.trigger&&(!['interact','action'].includes(v.trigger)||v.blocking))fail(path,'エッジ配置はinteract/action・非blockingが必要です。');
        if(v.points?.some(p=>p.edge!==undefined)&&(!['interact','action'].includes(v.trigger)||v.blocking))fail(path,'エッジ配置の起動方法が不正です。');
        for(const [k,x] of Object.entries(v))walk(x,[...path,k]);
      }
    }
    walk(value);
    if(entry.family==='quest'){
      for(const [i,e] of value.events.entries())if(!Object.hasOwn(value.scripts,e.script)&&!e.script.startsWith(entry.id+'.'))fail(['events',i,'script'],'同じクエストのスクリプトを指定してください。');
    }
    if(entry.family==='dungeon'){
      if(value.id!==entry.id)fail(['id'],'ファイル名と同じ迷宮IDを指定してください。');
      if(!value.maps.includes(value.entries.main.map))fail(['entries','main','map'],'この迷宮のmapsに登録してください。');
      function points(v,path=[]){if(Array.isArray(v))v.forEach((x,i)=>points(x,[...path,i]));else if(kind(v)==='object'){if(typeof v.map==='string'&&!value.maps.includes(v.map))fail([...path,'map'],'この迷宮に所属しないマップです。');for(const [k,x] of Object.entries(v))points(x,[...path,k]);}}points(value.systems);
    }
    if(entry.family==='locations'){
      for(const [id,l] of Object.entries(value)){
        if(l.id!==id)fail([id,'id'],'項目名とIDを一致させてください。');
        for(const target of [l.parent,...l.links].filter(x=>x!==null))if(!Object.hasOwn(value,target))fail([id],'接続先がありません: '+target);
        let p=id;const seen=new Set();while(value[p]){if(seen.has(p)){fail([id,'parent'],'親子関係が循環しています。');break;}seen.add(p);p=value[p].parent;}
      }
    }
    if(entry.family==='jobs')for(const [actor,job] of Object.entries(value.initialJobs))if(!Object.hasOwn(value.jobs,job))fail(['initialJobs',actor],'職業IDがjobsにありません。');
    if(entry.family==='presentation')for(const [id,c] of Object.entries(value.cues)){for(const effect of [...c.effects,...(c.battle?.anticipation?[c.battle.anticipation]:[])])if(!Object.hasOwn(value.effects,effect))fail(['cues',id,'effects'],'効果がありません: '+effect);if(c.sound&&!Object.hasOwn(value.sounds,c.sound))fail(['cues',id,'sound'],'SEがありません: '+c.sound);}
    if(entry.family==='cells')for(const [id,preset] of Object.entries(value.presets))if(!reliefParametersValid(preset.parameters))fail(['presets',id,'parameters'],'くぼみの深さ・水面高さを確認してください。水面は底より上に設定します。');
    if(entry.family==='cells')for(const [id,map] of Object.entries(value.maps)){
      for(const [symbol,preset] of Object.entries(map.legend))if(!Object.hasOwn(value.presets,preset))fail(['maps',id,'legend',symbol],'セル種がありません。');
      if(map.rows.some(r=>r.length!==map.rows[0].length))fail(['maps',id,'rows'],'行の幅を揃えてください。');
      for(const [y,row] of map.rows.entries())for(const symbol of row)if(!Object.hasOwn(map.legend,symbol))fail(['maps',id,'rows',y],'凡例にない記号です: '+symbol);
      for(const [key,patch] of Object.entries(map.overrides??{})){const [x,y]=key.split(',').map(Number),base=value.presets[map.legend[map.rows[y]?.[x]]];if(base&&!reliefParametersValid({...base.parameters,...patch.parameters}))fail(['maps',id,'overrides',key,'parameters'],'くぼみの水面は底より上に設定してください。');}
      for(const p of Object.keys(map.overrides??{})){const [x,y]=p.split(',').map(Number);if(x<0||y<0||y>=map.rows.length||x>=map.rows[0].length)fail(['maps',id,'overrides',p],'上書き位置が範囲外です。');}
    }
    if(value.maps&&kind(value.maps)==='object'&&entry.family!=='cells')for(const [id,map] of Object.entries(value.maps)){
      if(map.id!==id)fail(['maps',id,'id'],'項目名とマップIDを一致させてください。');
      if(map.tiles.some(row=>row.length!==map.tiles[0].length))fail(['maps',id,'tiles'],'行の幅を揃えてください。');
      for(const p of [map.entrance,...map.objects])if(!Number.isInteger(p.x)||!Number.isInteger(p.y)||!map.tiles[p.y]?.[p.x])fail(['maps',id],'入口・配置物が範囲外です。');
    }
    return [...new Set(errors)].slice(0,60);
  };
}
