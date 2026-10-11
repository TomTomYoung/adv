// Attempts belong to one physical entry; only successful occurrences spend a use.
export const occurrencePolicy=event=>event.occurrence??{chance:1,maxCount:event.once?1:null,reset:'never'};
export function occurrenceValid(event){
  const p=event.occurrence;
  if(p===undefined)return typeof event.once==='boolean';
  return p&&typeof p==='object'&&!Array.isArray(p)&&Object.keys(p).every(k=>['chance','maxCount','reset'].includes(k))&&Number.isFinite(p.chance)&&p.chance>=0&&p.chance<=1&&(p.maxCount===null||Number.isSafeInteger(p.maxCount)&&p.maxCount>0&&p.maxCount<=1e9)&&['never','reentry','manual'].includes(p.reset)&&event.once===undefined;
}
export const occurrenceAvailable=(state,event,key)=>{const p=occurrencePolicy(event);return p.maxCount===null||(state.events[key]??0)<p.maxCount;};
export function attemptOccurrence(engine,event,key){
  if(!occurrenceAvailable(engine.state,event,key))return false;
  const p=occurrencePolicy(event);
  if(p.chance===0||p.chance<1&&engine.random()>=p.chance)return false;
  engine.state.events[key]=Math.min(1e9,(engine.state.events[key]??0)+1);return true;
}
export function resetEntryOccurrences(data,state,maps){
  for(const key of Object.keys(state.events)){
    const m=/^cell\/([^/]+)\/(\d+),(\d+)\/([^/]+)$/.exec(key);
    if(m&&maps.includes(m[1])&&occurrencePolicy(data.cellEvents[m[4]]??{}).reset==='reentry')delete state.events[key];
  }
}
export function occurrenceSaveErrors(data,state){
  const errors=[];
  for(const [key,count] of Object.entries(state.events??{}))if(key.startsWith('cell/')){
    const m=/^cell\/([^/]+)\/(0|[1-9]\d*),(0|[1-9]\d*)\/([^/]+)$/.exec(key),map=data.maps[m?.[1]],event=data.cellEvents?.[m?.[4]],p=event&&occurrencePolicy(event);
    if(!m||!map||map.tiles[Number(m[3])]?.[Number(m[2])]===undefined||!event||!Number.isSafeInteger(count)||count<0||count>Math.min(1e9,p.maxCount??1e9))errors.push('セル進入イベントの発生回数が不正です');
  }
  return errors;
}
