import {fieldScenes,dungeonScenePlan} from '../core/dungeon-scenes.js';
import {dungeonForMap} from '../core/dungeons.js';
import {closeTo} from '../core/systems/common.js';
import {clone} from '../core/expression.js';

export const projectArt=(data,art)=>art?{url:data.assets.images[art.asset],rect:clone(art.rect)}:null;
export function projectFieldNotes(data,state){
  return fieldScenes(data).filter(s=>state.flags.dungeonNotes?.[s.id]===true).map(s=>({id:s.id,quest:s.quest,title:s.title,text:s.note,dungeon:s.dungeon}));
}
export function projectFieldLinks(data,quest){
  return fieldScenes(data).filter(s=>s.quest===quest).map(s=>({id:s.id,dungeon:s.dungeon,dungeonName:data.dungeons[s.dungeon].name,title:s.title,points:s.points.map(p=>({...p,name:data.maps[p.map].name}))}));
}
export function projectDungeonScenes(engine,systems){
  const {data,state}=engine,definition=dungeonForMap(data,state.location?.map);
  if(!definition)return {systems,scenes:[],wall:null,floorArt:null};
  const device=projectArt(data,definition.art?.device);
  const decorated=systems.map(system=>({...system,art:device,cards:system.cards?.map(card=>({...card,art:projectArt(data,definition.art?.variants?.[card.artKey]??definition.art?.device)})),markers:system.markers?.map(marker=>({...marker,art:['vector','water','boundary','voxel_link'].includes(marker.kind)?null:device}))}));
  const scenes=(definition.fieldScenes??[]).filter(s=>s.points.some(p=>closeTo(state,p))).map(s=>{
    const plan=dungeonScenePlan(data,state,s.id),recorded=state.flags.dungeonNotes?.[s.id]===true;
    return {name:s.title,art:device,text:`関連依頼：${data.quests[s.quest].title}${recorded?' ／ 観察を記録済み':''}`,actions:[{label:'現地を調査する',enabled:plan.ok,reason:plan.reason??'',intent:{type:'dungeon.scene',id:s.id}}]};
  });
  const panels=scenes.length?[{kind:'field_scenes',id:'field_scenes',title:'依頼と現地の調査',summary:'仕掛けを操作した後で調べると、観察できる内容が変わります。',cards:scenes,actions:[],markers:[]}]:[];
  return {systems:decorated,scenes:panels,wall:projectArt(data,definition.art?.wall),floorArt:projectArt(data,definition.art?.floor)};
}
export function projectSceneArt(data,state){
  const id=data.scripts[state.vm.at(-1)?.script]?.dungeonScene,scene=fieldScenes(data).find(s=>s.id===id);
  return scene?{title:scene.title,art:projectArt(data,data.dungeons[scene.dungeon].art?.device)}:null;
}
