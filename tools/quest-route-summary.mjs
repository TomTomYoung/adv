import {createHash} from 'node:crypto';
import routeNotes from '../authoring/quest-route-notes.json' with {type:'json'};

// Reviewed prose belongs to authoring. Changed story facts require another review,
// rather than silently reusing a summary of the previous story.
export function questRouteSourceHash(q){
  const source={title:q.title,brief:q.brief,graph:q.model.graph,truth:q.model.world.truth,
    adaptation:q.model.adaptation,outcomes:q.outcomes,story:q.story,
    events:q.events.map(e=>({id:e.id,dungeon:e.dungeon,points:e.points.map(p=>({map:p.map,dungeon:p.dungeon}))}))};
  return createHash('sha256').update(JSON.stringify(source)).digest('hex');
}

export function routeArea(data,step){
  if([step.dungeon,step.location,step.regionAround,step.areaLabel].filter(v=>v!==undefined).length!==1)
    throw Error('route summary: exactly one area reference is required');
  if(step.dungeon){
    const d=data.dungeons[step.dungeon];
    if(!d)throw Error(`route summary: unknown dungeon ${step.dungeon}`);
    return d.name;
  }
  if(step.location){
    let l=data.locations[step.location];
    if(!l)throw Error(`route summary: unknown location ${step.location}`);
    const seen=new Set();
    while(l){
      if(seen.has(l.id))throw Error(`route summary: location parent cycle ${l.id}`);
      seen.add(l.id);
      // Indoor dungeon rooms use the town UI, but belong to their dungeon.
      if(l.dungeonEntrance)return routeArea(data,{dungeon:l.dungeonEntrance.dungeon});
      if(!l.parent)return l.name.split('・')[0];
      const parent=data.locations[l.parent];
      if(!parent)throw Error(`route summary: unknown parent ${l.parent}`);
      l=parent;
    }
  }
  if(step.regionAround){
    const r=data.regions.find(r=>r.id===step.regionAround);
    if(!r)throw Error(`route summary: unknown region ${step.regionAround}`);
    return `${r.name}周辺`;
  }
  if(step.areaLabel==='町名未設定')return step.areaLabel;
  throw Error('route summary: unknown area label');
}

export function questRouteSummary(data,q,notes=routeNotes){
  const route=notes[q.id];
  if(!route?.steps?.length)throw Error(`${q.id}: missing catalog route in authoring/quest-route-notes.json`);
  if(route.sourceHash!==questRouteSourceHash(q))
    throw Error(`${q.id}: catalog route source changed; review the prose in authoring/quest-route-notes.json before updating sourceHash`);
  const out=['経過：',''];
  for(const step of route.steps){
    for(const key of ['place','text'])if(typeof step[key]!=='string'||!step[key].trim()||/[\r\n]/.test(step[key]))
      throw Error(`${q.id}: route ${key} must be one nonempty line`);
    out.push(`* 【${routeArea(data,step)}】[${step.place}]：${step.text}`);
  }
  if(q.number>=5){
    out.push('');
    out.push(route.steps.some(s=>s.regionAround)
      ?'場所の注記：周辺の居住区・集落への出張を含む本文上の経過。町名と各施設の実移動先は未設定。ゲーム上の起点は下記の実配置を参照。'
      :'場所の注記：本文上の場所と経過を記載。各場面への実移動は未接続のため、下記の実配置・個別ページと区別する。');
  }
  return out.join('\n');
}
