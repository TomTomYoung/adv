// Presentation-only classification, shared by the visual and audio adapters.
export function battleAccent(event,target){
  if(event.phase==='windup')return 'swing';
  if(event.phase==='flight')return 'bow';
  if(event.phase==='defeat')return 'defeat';
  if(event.phase!=='impact')return null;
  const targets=event.targets??[];
  target??=targets.find(t=>t.critical&&t.damage>0&&!t.missed)??targets.find(t=>t.damage>0&&!t.guarded&&!t.missed)??targets.find(t=>t.healing>0)??targets.find(t=>!t.missed);
  if(!target||target.missed)return null;
  if(target.healing>0)return 'heal';
  if(target.guarded)return 'guard';
  if(!(target.damage>0))return null;
  if(target.critical)return 'critical';
  const effects=event.effects??[];
  for(const [id,kind] of [['strike_blunt','heavy'],['fire_burst','fire'],['ice_shards','ice'],['lightning_arc','lightning'],['strike_pierce','pierce']])if(effects.includes(id))return kind;
  return 'slash';
}

export const battleAccentColors={slash:'#ffe4a1',pierce:'#c7eaff',heavy:'#ffc078',critical:'#ffdf74',guard:'#a9d9ff',heal:'#9df7c2',fire:'#ff945d',ice:'#aeeaff',lightning:'#e8ceff',defeat:'#bda68b'};
