import {clone,isRecord,pathParts} from './expression.js';
import {commandsAt} from './script.js';
import {storyStateErrors} from './story.js';
import {atWorldPlace} from './world.js';
import {restrictionValid} from './dungeon-restrictions.js';

const identifier=v=>typeof v==='string'&&/^[a-z][a-z0-9_.:-]{0,127}$/.test(v);
const list=v=>Array.isArray(v)&&new Set(v).size===v.length;
const exact=(o,keys)=>isRecord(o)&&Object.keys(o).sort().join(',')===[...keys].sort().join(',');
const targets=c=>[
  ...['flags','vars'].flatMap(root=>(c[root]??[]).map(path=>[root,...pathParts(path)])),
  ...(c.objects??[]).map(key=>['objects',key]),
  ...(c.eventKeys??[]).map(key=>['events',key])
];
const overlap=(a,b)=>a.every((part,i)=>part===b[i])||b.every((part,i)=>part===a[i]);
export function checkpointCommandValid(data,c){
  if(!isRecord(c)||!identifier(c.id))return false;
  if(c.op==='event.checkpoint.commit')return exact(c,['op','id']);
  if(c.op!=='event.checkpoint.begin'||Object.keys(c).some(k=>!['op','id','quest','scene','dungeon','flags','vars','objects','eventKeys','restrictionSources'].includes(k)))return false;
  const story=data.quests[c.quest]?.story,scene=story?.scenes[c.scene],place=story?.worldPlaces?.[scene?.place];
  if(!scene||place?.kind!=='dungeon'||place.dungeon!==c.dungeon)return false;
  try{
    for(const root of ['flags','vars'])if(c[root]!==undefined&&(!list(c[root])||c[root].some(p=>typeof p!=='string'||p.length>200||pathParts(p).some(k=>!Number.isNaN(Number(k))))))return false;
    if(c.objects!==undefined&&(!list(c.objects)||c.objects.some(key=>{const [map,id,...extra]=typeof key==='string'?key.split('/'):[];return extra.length||!data.dungeons[c.dungeon].maps.includes(map)||!data.maps[map]?.objects.some(o=>o.id===id);})))return false;
    if(c.eventKeys!==undefined&&(!list(c.eventKeys)||c.eventKeys.some(key=>typeof key!=='string'||!key.length||key.length>250||['__proto__','constructor','prototype'].includes(key))))return false;
    if(c.restrictionSources!==undefined&&(!list(c.restrictionSources)||c.restrictionSources.some(v=>!identifier(v))))return false;
    const paths=targets(c);return !paths.some((a,i)=>paths.slice(i+1).some(b=>overlap(a,b)));
  }catch{return false;}
}
function definition(data,checkpoint){
  const o=checkpoint.origin;
  if(!exact(o,['script','path','index'])||!Array.isArray(o.path)||!Number.isSafeInteger(o.index)||o.index<0||o.path.some(v=>typeof v!=='string'&&(!Number.isSafeInteger(v)||v<0)))throw Error('チェックポイントの定義位置が不正です');
  const c=commandsAt(data,o)[o.index];
  if(c?.op!=='event.checkpoint.begin'||c.id!==checkpoint.id||!checkpointCommandValid(data,c))throw Error('チェックポイントの原稿がありません');
  return c;
}
const ownsRestriction=(c,r)=>r.dungeon===c.dungeon&&(c.restrictionSources??[]).includes(r.source);
function capture(state,path){
  let value=state;
  for(const part of path){if(!isRecord(value)||!Object.hasOwn(value,part))return {present:false};value=value[part];}
  return {present:true,value:clone(value)};
}
function restore(state,path,snapshot){
  let parent=state;
  for(const part of path.slice(0,-1)){
    if(!isRecord(parent[part])){if(!snapshot.present)return;parent[part]={};}
    parent=parent[part];
  }
  if(snapshot.present)parent[path.at(-1)]=clone(snapshot.value);else delete parent[path.at(-1)];
}
function conflicts(a,b){
  return a.quest===b.quest||targets(a).some(x=>targets(b).some(y=>overlap(x,y)))||a.dungeon===b.dungeon&&(a.restrictionSources??[]).some(id=>(b.restrictionSources??[]).includes(id));
}
export function beginEventCheckpoint(engine,c,frame,index){
  const {data,state}=engine;
  if(!checkpointCommandValid(data,c))throw Error('イベントチェックポイントの設定が不正です');
  const origin={script:frame.script,path:clone(frame.path),index},existing=state.eventCheckpoints.find(v=>v.id===c.id);
  // Resuming the opening conversation must keep the original pre-effect snapshot.
  if(existing){if(JSON.stringify(existing.origin)!==JSON.stringify(origin))throw Error('チェックポイントIDが重複しています');return;}
  const d=data.quests[c.quest].story,s=state.stories[c.quest];
  if(state.quests[c.quest]?.stage!=='active'||state.journey||s?.scene!==c.scene||state.dungeons?.active?.id!==c.dungeon||!atWorldPlace(state,d.worldPlaces[d.scenes[c.scene].place],{exact:true}))throw Error('チェックポイントの開始地点・場面が違います');
  if(state.eventCheckpoints.some(saved=>conflicts(c,definition(data,saved))))throw Error('復元対象が重なるチェックポイントは同時に開始できません');
  state.eventCheckpoints.push({id:c.id,origin,story:clone(s),values:targets(c).map(p=>capture(state,p)),restrictions:clone(state.dungeonRestrictions.filter(r=>ownsRestriction(c,r)))});
}
export function commitEventCheckpoint(engine,id){
  engine.state.eventCheckpoints=engine.state.eventCheckpoints.filter(c=>c.id!==id);
}
export function rollbackEventCheckpoints(engine){
  const {data,state}=engine,checkpoints=state.eventCheckpoints;
  // Resolve every definition first; no partial rollback if a definition is broken.
  const plans=checkpoints.map(saved=>({saved,c:definition(data,saved)}));
  for(const {saved,c} of plans){
    state.stories[c.quest]=clone(saved.story);
    if(state.journey?.quest===c.quest)state.journey=null;
    targets(c).forEach((path,i)=>restore(state,path,saved.values[i]));
    state.dungeonRestrictions=[...state.dungeonRestrictions.filter(r=>!ownsRestriction(c,r)),...clone(saved.restrictions)];
  }
  state.eventCheckpoints=[];
  return plans.length>0;
}
export function validateEventCheckpoints(data,state){
  const list=state.eventCheckpoints,errors=[];
  if(!Array.isArray(list))return ['イベントチェックポイントの保存が不正です'];
  const definitions=[],ids=new Set();
  for(const saved of list)try{
    if(!exact(saved,['id','origin','story','values','restrictions'])||ids.has(saved.id))throw Error();
    const c=definition(data,saved),d=data.quests[c.quest].story;
    if(state.quests[c.quest]?.stage!=='active'||saved.story?.scene!==c.scene||storyStateErrors(d,saved.story,state,c.quest).length)throw Error();
    const paths=targets(c);
    if(!Array.isArray(saved.values)||saved.values.length!==paths.length||saved.values.some((v,i)=>!exact(v,v?.present?['present','value']:['present'])||typeof v.present!=='boolean'||v.present&&(paths[i][0]==='objects'?typeof v.value!=='string':paths[i][0]==='events'?!Number.isSafeInteger(v.value)||v.value<0:false)))throw Error();
    if(!Array.isArray(saved.restrictions)||saved.restrictions.some(r=>!restrictionValid(data,r)||!exact(r,['dungeon','action','source','reason'])||!ownsRestriction(c,r))||new Set(saved.restrictions.map(r=>`${r.action}/${r.source}`)).size!==saved.restrictions.length)throw Error();
    if(definitions.some(other=>conflicts(c,other)))throw Error();
    ids.add(saved.id);definitions.push(c);
  }catch{errors.push('イベントチェックポイントの定義・復元値が不正です');}
  return errors;
}
