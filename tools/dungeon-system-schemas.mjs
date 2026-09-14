// Authoring schemas describe data only. Runtime validation also checks cross references and topology.
export function additionalDungeonSystems(authoring=false){
  const str={type:'string',minLength:1},bool={type:'boolean'},int=(lo,hi)=>({type:'integer',minimum:lo,maximum:hi}),num=(lo,hi)=>({type:'number',minimum:lo,maximum:hi});
  const obj=(properties,required=Object.keys(properties))=>({type:'object',properties,required,additionalProperties:false});
  const arr=(items,minItems=0)=>({type:'array',items,minItems}),strings={...arr(str),uniqueItems:true};
  const point={map:str,x:int(1,10000),y:int(1,10000)},named={...point,id:str,name:str},destination=obj({...point,facing:{enum:['north','east','south','west']}},Object.keys(point));
  const patch=obj({...point,tile:{enum:['.','#']}}),patches=arr(patch,1),materials={type:'object',additionalProperties:int(1,9999)};
  const system=(use,props,optional=[])=>obj({use:{const:use},enabled:bool,...props},['use',...Object.keys(props).filter(k=>!optional.includes(k))]);
  const plant=system('plant_garden',{
    species:{type:'object',minProperties:1,additionalProperties:obj({name:str,description:str,growth:int(1,100),radius:int(0,8),heal:int(0,100),encounterRate:num(0,5),terrain:{enum:[null,'bridge','barrier','vine']},materials,harvest:materials,immatureHarvest:materials})},
    plots:arr(obj({...named,terrain:obj({bridge:patches,barrier:patches,vine:destination},[])}),1),supply:obj(named),supplies:materials
  });
  const warp=system('warp_network',{portals:arr(obj({...named,destination:str,facing:{enum:['north','east','south','west']}},[...Object.keys(named),'destination']),2)});
  const shift=system('terrain_shift',{title:str,mode:{enum:['manual','random']},initial:str,interval:obj({min:int(1,1000),max:int(1,1000)}),states:arr(obj({id:str,name:str,tiles:patches}),2),controls:arr(obj(named)),refuges:arr(obj(named),1)},['interval']);
  const vector=system('vector_curse',{perStep:int(1,100),maxStacks:int(1,1000),factor:{type:'number',exclusiveMinimum:0,exclusiveMaximum:1},stats:{...arr({enum:['str','vit','agi','int']},1),uniqueItems:true},vectors:arr(obj({...point,dx:int(-1,1),dy:int(-1,1)}),1)});
  if(authoring){vector.properties.vectorRows={type:'object',minProperties:1,additionalProperties:arr({type:'string',pattern:'^[#↑→↓←・]+$'},3)};vector.required=vector.required.filter(k=>k!=='vectors');vector.oneOf=[{required:['vectors'],not:{required:['vectorRows']}},{required:['vectorRows'],not:{required:['vectors']}}];}
  const suppression=system('suppression_zone',{cells:arr(obj(point),1),blockedSkills:strings,blockedAbilities:strings,suppressedSkills:strings,statuses:strings,buffs:strings,items:strings,threat:obj({encounter:str,point:obj(named)})},['threat']);
  const library=system('skill_library',{books:arr(obj({...named,skill:str,api:{enum:['battle.skill','archive.unlock']}}),1),gates:arr(obj({...named,ability:str,tiles:patches}),1)});
  const air=system('air_supply',{capacity:int(1,1000),warning:int(0,1000),perStep:int(1,1000),perBattle:int(1,1000),perRound:int(1,1000),suffocation:{type:'number',exclusiveMinimum:0,maximum:1},water:arr(obj(point),1),pockets:arr(obj(named),1),devices:arr(obj({...named,pockets:arr(obj(named),1),tiles:patches}),1)});
  const market=system('market_pacts',{closeAt:int(1,20),maxAlarm:int(1,100),escortSteps:int(1,1000),escortRate:{type:'number',exclusiveMinimum:0,maximum:1},escortEnemyScale:{type:'number',exclusiveMinimum:0,maximum:1},guardEncounter:str,offers:arr(obj({...named,kind:{enum:['toll','barter','buy','escort']},gold:int(0,1000000),cost:materials,output:materials,tiles:arr(patch),description:str}),1),guards:arr(obj({...named,alarm:int(1,100)}),1)});
  const power=system('power_grid',{capacity:int(1,100),repairsPerRun:int(1,100),guardEncounter:str,controls:arr(obj(named),1),devices:arr(obj({...named,kind:{enum:['door','guardian','elevator','repair']},circuit:str,power:int(1,100),salvage:materials,tiles:patches,destination},[...Object.keys(named),'kind','circuit','power','salvage']),1)});
  return [plant,warp,shift,vector,suppression,library,air,market,power];
}
