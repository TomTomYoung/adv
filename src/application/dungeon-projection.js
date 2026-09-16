import {questEvents,questEventPlan,eventVisible} from '../core/quest-events.js';
import {dungeonForMap} from '../core/dungeons.js';
import {closeTo} from '../core/systems/common.js';
import {clone,evaluate} from '../core/expression.js';

export const projectArt=(data,art)=>art?{url:data.assets.images[art.asset],rect:clone(art.rect)}:null;
export function projectQuestNotes(data,state){
  return questEvents(data).filter(e=>e.note&&evaluate(e.note.when,state)).map(e=>({id:e.id,quest:e.quest,title:e.title,text:e.note.text,dungeon:e.dungeon}));
}
export function projectQuestLinks(data,state,quest){
  return (data.quests[quest].events??[]).filter(e=>e.trigger==='action'&&e.dungeon&&eventVisible(state,e)).map(e=>({id:e.id,dungeon:e.dungeon,dungeonName:data.dungeons[e.dungeon].name,title:e.title,points:e.points.map(p=>({...p,name:data.maps[p.map].name}))}));
}
export function projectDungeonEvents(engine,systems){
  const {data,state}=engine,definition=dungeonForMap(data,state.location?.map);
  if(!definition)return {systems,scenes:[],wall:null,floorArt:null};
  const device=projectArt(data,definition.art?.device);
  const decorated=systems.map(system=>({...system,art:device,cards:system.cards?.map(card=>({...card,art:projectArt(data,definition.art?.variants?.[card.artKey]??definition.art?.device)})),markers:system.markers?.map(marker=>({...marker,art:['vector','water','boundary','voxel_link'].includes(marker.kind)?null:device}))}));
  const events=questEvents(data).filter(e=>e.trigger==='action'&&eventVisible(state,e)&&(!e.dungeon||e.dungeon===definition.id)&&e.points.some(p=>closeTo(state,p))).map(e=>{
    const plan=questEventPlan(data,state,e.quest,e.id),recorded=e.note&&evaluate(e.note.when,state);
    return {name:e.title,art:device,text:`関連依頼：${data.quests[e.quest].title}${recorded?' ／ 観察を記録済み':''}`,actions:[{label:'現地を調査する',enabled:plan.ok,reason:plan.reason??'',intent:{type:'quest.event',quest:e.quest,id:e.id}}]};
  });
  const panels=events.length?[{kind:'quest_events',id:'quest_events',title:'依頼と現地の調査',summary:'仕掛けを操作した後で調べると、観察できる内容が変わります。',cards:events,actions:[],markers:[]}]:[];
  return {systems:decorated,scenes:panels,wall:projectArt(data,definition.art?.wall),floorArt:projectArt(data,definition.art?.floor)};
}
export function projectEventArt(data,state){
  const scriptId=state.vm.at(-1)?.script;
  // Old revisions keep dungeonScene metadata and their immutable VM addresses.
  const legacyId=data.scripts[scriptId]?.dungeonScene;
  const event=questEvents(data).find(e=>e.trigger==='action'&&(e.script===scriptId||e.id===legacyId));
  return event?{title:event.title,art:projectArt(data,data.dungeons[event.dungeon]?.art?.device)}:null;
}
