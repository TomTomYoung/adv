import {atWorldPlace,worldPlaceName,worldStoryPlace} from './world.js';
import {clone,evaluate,isRecord} from './expression.js';

// Finite, authored story worlds. No quest IDs or narrative text belong here.
export const STORY_EFFECTS=new Set(['move','transfer','set','pour','consume','observe']);
const own=(o,k)=>Object.hasOwn(o??{},k);
const definition=(data,id)=>{const d=data.quests[id]?.story;if(!d)throw Error(`物語状態の定義がありません: ${id}`);return d;};
const context=(state,id,story)=>({...state,stories:{...state.stories,[id]:story}});
const check=(expr,state,id,story)=>expr===undefined||Boolean(evaluate(expr,context(state,id,story)));
const fieldValid=(v,r)=>r?.type==='boolean'?typeof v==='boolean':r?.type==='integer'?Number.isInteger(v)&&v>=r.min&&v<=r.max:r?.type==='enum'?r.values.includes(v):false;

export function storyPlace(d,s,id,seen=new Set()){
  if(own(d.places,id))return id;
  if(seen.has(id))throw Error(`所在の循環: ${id}`);
  seen.add(id);const e=d.entities[id];if(!e)throw Error(`不明な実体: ${id}`);
  const holder=s.values[e.holder];
  return storyPlace(d,s,holder,seen);
}
export function storyStateErrors(d,s,state,id,{scene=false,world=false}={}){
  const errors=[];
  if(!isRecord(s)||s.version!==d.version||!isRecord(s.values)||!Array.isArray(s.events)||!isRecord(s.knowledge))return [`${id}: 物語状態不正`];
  if((s.revision??1)!==(d.revision??1))errors.push(`${id}: 物語状態の改訂版が一致しません`);
  for(const [key,r] of Object.entries(d.registry))if(!fieldValid(s.values[key],r))errors.push(`${id}.${key}: 型・定義域違反`);
  for(const key of Object.keys(s.values))if(!own(d.registry,key))errors.push(`${id}.${key}: 未登録の状態`);
  if(new Set(s.events).size!==s.events.length||s.events.some(e=>!own(d.actions,e)))errors.push(`${id}: 行動履歴不正`);
  for(const [who,known] of Object.entries(s.knowledge))if(!d.entities[who]||!Array.isArray(known)||new Set(known).size!==known.length||known.some(p=>!d.propositions[p]))errors.push(`${id}: 認識の参照不正`);
  for(const entity of Object.keys(d.entities))try{storyPlace(d,s,entity);}catch(e){errors.push(`${id}: ${e.message}`);}
  for(const invariant of d.invariants??[])try{if(!check(invariant.condition,state,id,s))errors.push(`${id}: ${invariant.id} — ${invariant.message}`);}catch(e){errors.push(`${id}: ${invariant.id}: ${e.message}`);}
  if(s.scene!==null&&!d.scenes[s.scene])errors.push(`${id}: 不明な場面`);
  if(world&&d.worldPlaces&&state.quests?.[id]?.stage==='active'&&state.journey?.quest!==id&&s.values[d.entities.party.holder]!==worldStoryPlace(state,d))errors.push(`${id}: 探索隊の所在と実際の現在地が一致しません`);
  if(world&&d.worldPlaces&&state.quests?.[id]?.stage==='active'&&s.scene===null&&state.journey?.quest!==id)errors.push(`${id}: 移動記録または再開場面がありません`);
  if(scene&&s.scene&&d.scenes[s.scene]&&(!d.worldPlaces||atWorldPlace(state,d.worldPlaces[d.scenes[s.scene].place])))try{assertScene(d,s,state,id,s.scene);}catch(e){errors.push(e.message);}
  return errors;
}
function assertValid(d,s,state,id){const errors=storyStateErrors(d,s,state,id);if(errors.length)throw Error(errors.join('\n'));}
function assertScene(d,s,state,id,scene){
  const n=d.scenes[scene];if(!n||!check(n.requires,state,id,s))throw Error(`${id}/${scene}: 場面の入口条件を満たしていません`);
  const place=storyPlace(d,s,'party');
  if(n.place&&place!==n.place)throw Error(`${id}/${scene}: 探索隊の所在 ${place} != ${n.place}`);
  for(const cast of n.cast??[]){
    if(cast.when!==undefined&&!check(cast.when,state,id,s))continue;
    if(cast.mode==='remote'){
      if(!cast.requires||!check(cast.requires,state,id,s))throw Error(`${id}/${scene}: 遠隔会話の条件不正`);
    }else if(storyPlace(d,s,cast.entity)!==place)throw Error(`${id}/${scene}: ${cast.entity} が同席していません`);
  }
}
export function initStory(engine,id){
  const d=definition(engine.data,id);engine.state.stories??={};
  if(!engine.state.stories[id]){
    if(engine.state.quests[id].stage!=='active')throw Error('受注前に物語を開始できません');
    if(d.worldPlaces&&!atWorldPlace(engine.state,d.worldPlaces[d.scenes.entry.place])){engine.state.vm=[];engine.state.waiting=null;engine.notify('依頼の開始地点へ移動してください。');return;}
    const s={version:d.version,...(d.revision?{revision:d.revision}:{}),values:Object.fromEntries(Object.entries(d.registry).map(([k,r])=>[k,clone(r.initial)])),knowledge:clone(d.initialKnowledge??{}),events:[],scene:null};
    assertValid(d,s,engine.state,id);engine.state.stories[id]=s;
  }
  assertValid(d,engine.state.stories[id],engine.state,id);
}
export function enterStoryScene(engine,id,scene){
  const d=definition(engine.data,id),s=engine.state.stories?.[id];if(!s)throw Error('物語が初期化されていません');
  if(d.worldPlaces&&!atWorldPlace(engine.state,d.worldPlaces[d.scenes[scene]?.place])){engine.state.vm=[];engine.state.waiting=null;engine.notify('この場面の場所へ移動してから再開してください。');return;}
  assertScene(d,s,engine.state,id,scene);s.scene=scene;
}
export function storyActionPlan(data,state,id,actionId,{depart=false,arrive=false}={}){
  const d=definition(data,id),a=d.actions[actionId];let current=state.stories?.[id];
  if(a?.journey){
    if(arrive){
      if(state.journey?.quest!==id||state.journey.action!==actionId||!atWorldPlace(state,d.worldPlaces[a.journey.to]))throw Error('目的地へ到達してから続きを進めてください');
      current=clone(current);current.scene=state.journey.from;
    }else if(!depart||state.journey)throw Error('移動中の行為を完了してください');
  }
  if(d.worldPlaces&&!arrive&&!atWorldPlace(state,d.worldPlaces[d.scenes[current?.scene]?.place]))throw Error('この行為の場所にいません');
  if(!current||!a)throw Error(`${id}/${actionId}: 未定義の行動`);
  if(state.quests[id].stage!=='active'||!a.from.includes(current.scene)||!check(a.requires,state,id,current))throw Error(`${id}/${actionId}: 行動の前提条件不成立`);
  if(a.once!==false&&current.events.includes(actionId))throw Error(`${id}/${actionId}: 完了済みの行動`);
  assertValid(d,current,state,id);
  const s=clone(current),inventory=clone(state.inventory);let gold=state.gold;
  for(const [item,count] of Object.entries(a.cost??{})){
    if(item==='gold'){if(gold<count)throw Error('所持金が足りません');gold-=count;}
    else{if((inventory[item]??0)<count)throw Error('材料が足りません');inventory[item]-=count;}
  }
  const holders=new Set(Object.values(d.entities).map(e=>e.holder));
  const colocated=(x,y)=>storyPlace(d,s,x)===storyPlace(d,s,y);
  for(const e of (depart?a.depart:a.effects)){
    if(e.when!==undefined&&!check(e.when,state,id,s))continue;
    if(e.op==='move'){
      const ids=e.entities,path=e.path;
      if(!ids.length||path.length<2||new Set(ids).size!==ids.length)throw Error('移動の対象・経路が不正です');
      for(const who of ids){
        const ent=d.entities[who];if(!ent||s.values[ent.holder]!==path[0])throw Error(`${who}: 移動の出発地が違います`);
        if(ent.mobility&&s.values[ent.mobility]!=='mobile'){
          if(s.values[ent.mobility]!=='assisted'||!e.assistant||!ids.includes(e.assistant)||e.assistant===who)throw Error(`${who}: 移動の介助が必要です`);
        }
        if(ent.kind==='item'&&(!e.carrier||!ids.includes(e.carrier)))throw Error(`${who}: 運搬者が必要です`);
      }
      for(let i=1;i<path.length;i++)if(!d.connections.some(edge=>edge[0]===path[i-1]&&edge[1]===path[i]||edge[1]===path[i-1]&&edge[0]===path[i]))throw Error(`接続のない移動: ${path[i-1]} → ${path[i]}`);
      for(const who of ids)s.values[d.entities[who].holder]=path.at(-1);
    }else if(e.op==='transfer'){
      const ent=d.entities[e.entity];if(!ent||ent.kind!=='item'||s.values[ent.holder]!==e.from||!colocated(e.from,e.to))throw Error(`${e.entity}: 受け渡しの所在・保持者が不正です`);
      s.values[ent.holder]=e.to;
    }else if(e.op==='set'){
      if(!d.registry[e.key]||holders.has(e.key))throw Error(`直接更新できない状態: ${e.key}`);
      s.values[e.key]=evaluate(e.value,context(state,id,s));
    }else if(e.op==='pour'){
      const from=d.registry[e.from],to=d.registry[e.to];
      if(!from?.container||!to?.container||e.from===e.to||!(e.amount>0)||!Number.isInteger(e.amount)||!colocated(from.container,to.container)||s.values[e.from]<e.amount)throw Error('分配の条件不成立');
      s.values[e.from]-=e.amount;s.values[e.to]+=e.amount;
    }else if(e.op==='consume'){
      if(!d.registry[e.key]?.container||!(e.amount>0)||!Number.isInteger(e.amount)||s.values[e.key]<e.amount||!d.registry[e.sink])throw Error('消費の条件不成立');
      s.values[e.key]-=e.amount;s.values[e.sink]+=e.amount;
    }else if(e.op==='observe'){
      if(!d.entities[e.observer]||!d.propositions[e.proposition]||!check(e.requires,state,id,s)||!colocated(e.observer,e.source))throw Error('情報取得の経路不成立');
      const known=s.knowledge[e.observer]??=[];if(!known.includes(e.proposition))known.push(e.proposition);
    }else throw Error(`未対応の物語効果: ${e.op}`);
    // The action is atomic: cross-field invariants are checked at commit.
  }
  if(depart){
    for(const who of ['party',...a.journey.companions]){
      if(storyPlace(d,s,who)!==storyPlace(d,s,'party'))throw Error('同行者が出発地点にいません');
    }
    for(const who of ['party',...a.journey.companions])s.values[d.entities[who].holder]='transit';
    s.scene=null;assertValid(d,s,state,id);
    return {story:s,gold,inventory,journey:{quest:id,action:actionId,from:current.scene}};
  }
  if(!s.events.includes(actionId))s.events.push(actionId);
  assertValid(d,s,state,id);
  if(a.to){assertScene(d,s,state,id,a.to);s.scene=a.to;}
  if(a.ending&&!check(d.endings[a.ending],state,id,s))throw Error(`${id}/${a.ending}: 結末条件不成立`);
  return {story:s,gold,inventory};
}
export function applyStoryAction(engine,id,action){
  const plan=storyActionPlan(engine.data,engine.state,id,action);
  // There is no await or text/save boundary between these assignments.
  engine.state.stories[id]=plan.story;engine.state.gold=plan.gold;engine.state.inventory=plan.inventory;
}
export function storyCanAct(engine,id,action){try{storyActionPlan(engine.data,engine.state,id,action,{depart:Boolean(engine.data.quests[id]?.story?.actions[action]?.journey)});return true;}catch{return false;}}
export function storyEnding(engine,id,outcome){
  const q=engine.data.quests[id];
  if(q.model?.progressionUpgrade&&!evaluate(q.model.progressionUpgrade.current,engine.state))return q.legacyOutcomes?.[outcome]??q.outcomes[outcome];
  if(engine.state.flags.legacyStoryRoutes?.[id])return q.legacyOutcomes?.[outcome]??q.outcomes[outcome];
  if(q.story){const s=engine.state.stories?.[id];if(!s||!own(q.story.endings,outcome)||!check(q.story.endings[outcome],engine.state,id,s))throw Error(`${id}/${outcome}: 物語の終了条件を満たしていません`);}
  return q.outcomes[outcome];
}

export function validateStories(data,expression=()=>{}){
  const errors=[];
  for(const [id,q] of Object.entries(data.quests)){
    const d=q.story;if(!d)continue;
    try{
      if(d.version!==1||d.modelVersion!=='1.1'||q.model?.standard?.version!=='1.1'||!q.model.standard.source||!d.registry||!d.scenes?.entry||!d.entities?.party)throw Error('モデル情報または物語の構成が不足しています');
      if(d.revision!==undefined&&(!Number.isInteger(d.revision)||d.revision<1))throw Error('物語の改訂版が不正です');
      const guard=(v,path)=>{
        expression(v,`${id}.story.${path}`);
        const walk=x=>{if(!x||typeof x!=='object')return;if(x.ref?.startsWith('stories.')){const parts=x.ref.split('.'),other=data.quests[parts[1]]?.story;if(!other||parts[2]==='values'&&!own(other.registry,parts[3]))throw Error(`${path}: 未登録の物語状態参照`);}for(const child of Object.values(x))walk(child);};walk(v);
      };
      const holders=new Set(Object.values(d.entities).map(e=>e.holder));
      if(holders.size!==Object.keys(d.entities).length)throw Error('実体ごとに一つの所在フィールドが必要です');
      for(const [key,r] of Object.entries(d.registry))if(!r.meaning||!fieldValid(r.initial,r))throw Error(`${key}: 型・初期値・意味が不正です`);
      for(const [key,r] of Object.entries(d.registry))if(r.container&&(!d.entities[r.container]||r.type!=='integer'))throw Error(`${key}: 容器・数量型が不正です`);
      for(const edge of d.connections)if(edge.length!==2||edge.some(p=>!own(d.places,p)))throw Error('場所の接続が不正です');
      for(const [who,e] of Object.entries(d.entities)){
        if(!['person','group','item'].includes(e.kind)||!d.registry[e.holder]||e.mobility&&!d.registry[e.mobility])throw Error(`${who}: 状態参照が不正です`);
        if(e.character&&!data.characters?.[e.character])throw Error(`${who}: 登場人物参照が不正です`);
      }
      for(const [key,a] of Object.entries(d.actions)){
        if(!a.from.length||a.from.some(n=>!d.scenes[n])||Boolean(a.to)===Boolean(a.ending)||a.to&&!d.scenes[a.to]||a.ending&&!q.outcomes[a.ending]||!Array.isArray(a.effects))throw Error(`${key}: 行動の参照が不正です`);
        guard(a.requires,`${key}.requires`);
        for(const [item,count] of Object.entries(a.cost??{}))if(!Number.isInteger(count)||count<=0||item!=='gold'&&!data.items[item])throw Error(`${key}: 費用不正`);
        for(const e of [...a.effects,...(a.depart??[])]){

          if(!STORY_EFFECTS.has(e.op))throw Error(`${key}: 未対応の効果`);
          guard(e.when,`${key}.effect.when`);guard(e.requires,`${key}.effect.requires`);
          if(e.op==='set'){if(!d.registry[e.key]||holders.has(e.key))throw Error(`${key}: 未登録状態または所在への直接書込み`);guard(e.value,`${key}.effect.value`);}
          if(e.op==='move'&&(!e.entities.length||new Set(e.entities).size!==e.entities.length||e.entities.some(who=>!d.entities[who])||!Array.isArray(e.path)||e.path.length<2||e.path.some(p=>!own(d.places,p))||e.path.slice(1).some((p,i)=>!d.connections.some(edge=>edge.includes(p)&&edge.includes(e.path[i])&&p!==e.path[i]))))throw Error(`${key}: 人物または移動経路不正`);
          if(e.op==='transfer'&&(d.entities[e.entity]?.kind!=='item'||![e.from,e.to].every(holder=>d.entities[holder]||d.places[holder])))throw Error(`${key}: 物品または保持者不正`);
          if(e.op==='pour'&&(!d.registry[e.from]?.container||!d.registry[e.to]?.container||e.from===e.to||!Number.isInteger(e.amount)||e.amount<=0))throw Error(`${key}: 分配不正`);
          if(e.op==='consume'&&(!d.registry[e.key]?.container||d.registry[e.sink]?.type!=='integer'||e.key===e.sink||!Number.isInteger(e.amount)||e.amount<=0))throw Error(`${key}: 消費不正`);
          if(e.op==='observe'&&(!d.propositions[e.proposition]||e.requires===undefined||!d.entities[e.observer]||!d.entities[e.source]&&!d.places[e.source]))throw Error(`${key}: 情報源不正`);
        }
      }
      for(const [key,n] of Object.entries(d.scenes)){
        if(!d.places[n.place])throw Error(`${key}: 場所不正`);guard(n.requires,`${key}.requires`);
        for(const cast of n.cast??[]){if(!d.entities[cast.entity]?.character||cast.mode==='remote'&&!cast.requires)throw Error(`${key}: 表示人物の参照不正`);guard(cast.when,`${key}.cast.when`);guard(cast.requires,`${key}.cast.requires`);}
      }
      for(const end of Object.keys(q.outcomes)){if(!own(d.endings,end))throw Error(`${end}: 終了条件がありません`);guard(d.endings[end],`endings.${end}`);}
      for(const inv of d.invariants??[])guard(inv.condition,`invariants.${inv.id}`);
      const initial={version:d.version,...(d.revision?{revision:d.revision}:{}),values:Object.fromEntries(Object.entries(d.registry).map(([k,r])=>[k,r.initial])),events:[],knowledge:d.initialKnowledge??{},scene:null};
      errors.push(...storyStateErrors(d,initial,{stories:{[id]:initial}},id));
    }catch(e){errors.push(`${id}: ${e.message}`);}
  }
  for(const [id,c] of Object.entries(data.characters??{}))if(!c.name||c.portrait&&!data.assets.images[c.portrait])errors.push(`${id}: 人物名・肖像参照不正`);
  return errors;
}

export function beginStoryJourney(engine,id,action){
  const p=storyActionPlan(engine.data,engine.state,id,action,{depart:true});
  engine.state.stories[id]=p.story;engine.state.gold=p.gold;engine.state.inventory=p.inventory;engine.state.journey=p.journey;
  engine.state.vm=[];engine.state.waiting=null;
  const d=engine.data.quests[id].story;engine.notify(`${worldPlaceName(engine.data,d.worldPlaces[d.actions[action].journey.to])}へ移動してください。到着後に続きを進められます。`);
}
export function arriveStoryJourney(engine){
  const j=engine.state.journey;if(!j)return false;
  let p;try{p=storyActionPlan(engine.data,engine.state,j.quest,j.action,{arrive:true});}catch(e){engine.notify(e.message);return false;}
  engine.state.stories[j.quest]=p.story;engine.state.gold=p.gold;engine.state.inventory=p.inventory;engine.state.journey=null;
  const q=engine.data.quests[j.quest],unit=q.model.narrative.units.find(n=>n.id===p.story.scene);
  engine.run(unit.script);return true;
}
export function resumeWorldStory(engine,id){
  const q=engine.data.quests[id],s=engine.state.stories?.[id];
  if(engine.state.journey||engine.state.quests[id]?.stage!=='active'||!q?.story?.worldPlaces)return false;
  const scene=s?.scene??'entry';if(!atWorldPlace(engine.state,q.story.worldPlaces[q.story.scenes[scene].place]))return false;
  engine.run(q.model.entryScript);return true;
}
export function journeyErrors(data,state){
  const j=state.journey;if(j===null)return [];
  const q=data.quests[j?.quest],a=q?.story?.actions[j?.action],s=state.stories?.[j?.quest];
  if(!j||!a?.journey||!a.from.includes(j.from)||state.quests[j.quest]?.stage!=='active'||s?.scene!==null||s.events.includes(j.action))return ['移動中の物語参照が不正です'];
  for(const who of ['party',...a.journey.companions])if(s.values[q.story.entities[who].holder]!=='transit')return ['移動中の人物の所在が不正です'];
  return [];
}
