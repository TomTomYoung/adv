import {voxelAt} from './voxels.js';
import {clone,evaluate} from './expression.js';
import {closeTo,identifier,validPoint} from './systems/common.js';
import {FIELD_EVENT_TRIGGERS} from './field-events.js';

export const questEvents=data=>Object.values(data.quests??{}).flatMap(q=>(q.events??[]).map(event=>({...event,quest:q.id})));
export const eventVisible=(state,event)=>event.visibleWhen===undefined||Boolean(evaluate(event.visibleWhen,state));
export const objectVisible=(state,map,object)=>eventVisible(state,{visibleWhen:object.visibleWhen??object.condition})&&!(object.once&&state.events[`${map.id}/${object.id}`]);
export const objectBlocks=(state,map,object)=>object.blocking&&objectVisible(state,map,object)&&(state.objects[`${map.id}/${object.id}`]??object.initialState)!=='open';

// Runtime projection only. Distributed map JSON contains the map's own objects.
// Keep map/object keys stable so old event counts, states and VM locals still work.
export function projectQuestObjects(data){
  for(const event of questEvents(data)){
    if(['action','auto'].includes(event.trigger))continue;
    const {title,points,role,dungeon,note,requirement,...object}=event;
    for(const {map,dungeon:pointDungeon,...point} of points??[]){
      if(!data.maps[map])throw Error(`${event.quest}/${event.id}: 配置先マップがありません: ${map}`);
      if(data.maps[map].objects.some(o=>o.id===event.id))throw Error(`${map}: object ID重複: ${event.id}`);
      data.maps[map].objects.push(clone({...object,name:title,...point}));
    }
  }
}

export function questEventPlan(data,state,quest,id){
  const event=data.quests[quest]?.events?.find(e=>e.id===id);
  if(state.mode!=='dungeon'||state.waiting||state.battle||state.vm.length)return {ok:false,reason:'探索中に調査してください。'};
  if(!event||event.trigger!=='action'||!eventVisible(state,event))return {ok:false,reason:'このイベントは現在利用できません。'};
  if(event.dungeon&&state.dungeons?.active?.id!==event.dungeon)return {ok:false,reason:'関連する迷宮で調査してください。'};
  if(event.condition!==undefined&&!evaluate(event.condition,state))return {ok:false,reason:event.requirement??'イベントの条件を満たしていません。'};
  if(event.once&&state.events[`quest/${quest}/${id}`])return {ok:false,reason:'このイベントは完了しています。'};
  if(!event.points.some(p=>closeTo(state,p)))return {ok:false,reason:'調査地点の足元か正面で確認してください。'};
  return {ok:true,event};
}
export function openQuestEvent(engine,quest,id){
  const plan=questEventPlan(engine.data,engine.state,quest,id);
  if(!plan.ok){engine.notify(plan.reason);return false;}
  const key=`quest/${quest}/${id}`;engine.state.events[key]=(engine.state.events[key]??0)+1;
  engine.run(plan.event.script);return true;
}

export function validateQuestEvents(data,expression){
  const errors=[],placements=new Set(),fail=(id,message)=>errors.push(`${id}: ${message}`);
  for(const q of Object.values(data.quests)){
    if(!Array.isArray(q.events)){fail(q.id,'クエスト内イベントの一覧が必要です');continue;}
    const ids=new Set();
    for(const event of q.events){
      if(!event||typeof event!=='object'){fail(q.id,'イベント定義が不正です');continue;}
      const id=`${q.id}/${event.id}`;
      if(!identifier(event.id)||ids.has(event.id))fail(id,'イベントIDが不正または重複しています');ids.add(event.id);
      if(typeof event.title!=='string'||!event.title||!FIELD_EVENT_TRIGGERS.includes(event.trigger))fail(id,'イベントの名前・起動方法が不正です');
      if(event.trigger==='auto'&&(event.once!==true||event.condition===undefined))fail(id,'自動条件イベントには once: true と condition が必要です');
      if(!q.scripts[event.script])fail(id,'イベントのスクリプトは同じクエスト内に定義してください');
      if(event.dungeon&&!data.dungeons?.[event.dungeon])fail(id,'関連ダンジョンがありません');
      const dungeon=event.dungeon?data.dungeons?.[event.dungeon]:{maps:Object.keys(data.maps)};
      if(!Array.isArray(event.points)||(!event.points.length&&event.trigger!=='auto'))fail(id,'配置・調査地点が必要です');
      else for(const p of event.points){
        const map=data.maps[p?.map];
        if(p?.edge!==undefined&&(!['north','east','south','west'].includes(p.edge)||!['interact','action'].includes(event.trigger)||event.blocking))fail(id,'エッジ配置の方向・起動方法・blockingが不正です');
        if(!dungeon||!map||!dungeon.maps.includes(p.map)||!Number.isSafeInteger(p.x)||!Number.isSafeInteger(p.y)||!Number.isSafeInteger(p.z??0)||(map.voxels?voxelAt(map,null,p)!=='.':(p.z??0)!==0||!validPoint(data,dungeon,p)))fail(id,'配置・調査地点が不正です');
        const key=`${p?.map}/${event.id}`;
        if(!['action','auto'].includes(event.trigger)){
          if(placements.has(key))fail(id,'map/object IDが重複しています');placements.add(key);
          const object=data.maps[p?.map]?.objects.find(o=>o.id===event.id);
          if(!object||object.quest!==q.id)fail(id,'クエストからのマップ投影がありません');
        }
      }
      if(!['action','auto'].includes(event.trigger)&&!['exit','stairs','chest','fountain','trap','door','clue','decision'].includes(event.kind))fail(id,'イベントのkindが不正です');
      if(event.fire){const d=data.dungeons[event.dungeon??Object.values(data.dungeons).find(d=>d.maps.includes(event.points?.[0]?.map))?.id],fires=Object.values(d?.systems??{}).find(s=>s.use==='fire_network');if(!fires?.effects[event.fire.effect]||!Number.isInteger(event.fire.radius)||event.fire.radius<0||event.fire.radius>30||!Array.isArray(event.fire.litStates)||!event.fire.litStates.length)fail(id,'壁灯の効果・範囲・点灯状態が不正です');}
      for(const key of ['safe','once','blocking'])if(event[key]!==undefined&&typeof event[key]!=='boolean')fail(id,`${key}は真偽値です`);
      if(event.initialState!==undefined&&(typeof event.initialState!=='string'||!event.initialState))fail(id,'初期状態は空でない文字列です');
      for(const key of ['visibleWhen','condition'])if(event[key]!==undefined)expression(event[key],`${id}.${key}`);
      if(event.note){
        if(typeof event.note.text!=='string'||!event.note.text||event.note.when===undefined)fail(id,'観察記録の本文・表示条件が必要です');
        expression(event.note.when,`${id}.note.when`);
      }
    }
  }
  return errors;
}
