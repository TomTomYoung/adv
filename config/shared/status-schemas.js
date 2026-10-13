const chance={type:'number',minimum:0,maximum:1};
export const actionStatusProperties={
  actionFailureChance:chance,accuracyRate:chance,confusionChance:chance,
  damageWakeChance:chance,misfireChance:chance,criticalChance:chance,criticalTakenChance:chance,
  battleOnly:{type:'boolean'},beneficial:{type:'boolean'},actionDisabled:{type:'boolean'},forcedAttack:{type:'boolean'},sureHit:{type:'boolean'},guaranteedCritical:{type:'boolean'},guaranteedCriticalTaken:{type:'boolean'},
  blockedActions:{type:'array',minItems:1,uniqueItems:true,items:{enum:['magic','skills','items']}},
  recovery:{type:'object',required:['initialChance','increment'],additionalProperties:false,properties:{initialChance:{type:'number',exclusiveMinimum:0,maximum:1},increment:{type:'number',exclusiveMinimum:0,maximum:1}}}
};
