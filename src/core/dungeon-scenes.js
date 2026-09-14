import {closeTo,identifier,validPoint} from './systems/common.js';

export const fieldScenes=data=>Object.values(data.dungeons??{}).flatMap(d=>(d.fieldScenes??[]).map(scene=>({...scene,dungeon:d.id})));
export function dungeonScenePlan(data,state,id){
  const d=data.dungeons?.[state.dungeons?.active?.id],scene=d?.fieldScenes?.find(s=>s.id===id);
  if(state.mode!=='dungeon'||state.waiting||state.battle||state.vm.length)return {ok:false,reason:'探索中に調査してください。'};
  if(!scene||!d.maps.includes(state.location?.map))return {ok:false,reason:'この迷宮の調査を選んでください。'};
  if(!['active','completed'].includes(state.quests[scene.quest]?.stage))return {ok:false,reason:'関連する依頼を受けると調査できます。'};
  if(!scene.points.some(p=>closeTo(state,p)))return {ok:false,reason:'調査地点の足元か正面で確認してください。'};
  return {ok:true,scene};
}
export function openDungeonScene(engine,id){
  const plan=dungeonScenePlan(engine.data,engine.state,id);
  if(!plan.ok){engine.notify(plan.reason);return false;}
  engine.run(plan.scene.script);return true;
}
export function validateDungeonScenes(data){
  const errors=[],ids=new Set(),artValid=a=>a&&data.assets.images[a.asset]&&a.rect&&['x','y','width','height'].every(k=>Number.isFinite(a.rect[k]))&&a.rect.x>=0&&a.rect.y>=0&&a.rect.width>0&&a.rect.height>0&&a.rect.x+a.rect.width<=1&&a.rect.y+a.rect.height<=1;
  for(const d of Object.values(data.dungeons??{})){
    if(d.art&&(!artValid(d.art.wall)||!artValid(d.art.device)||Object.values(d.art.variants??{}).some(a=>!artValid(a))))errors.push(`${d.id}: 素材の画像・切り出し範囲が不正です`);
    if(d.fieldScenes!==undefined&&!Array.isArray(d.fieldScenes)){errors.push(`${d.id}: 調査一覧が不正です`);continue;}
    for(const s of d.fieldScenes??[]){
      if(!s||typeof s!=='object'){errors.push(`${d.id}: 現地調査はオブジェクトで指定してください`);continue;}
      if(!identifier(s.id)||ids.has(s.id)||typeof s.title!=='string'||!s.title||typeof s.note!=='string'||!s.note||!data.quests[s.quest]||!data.scripts[s.script]||data.scripts[s.script]?.dungeonScene!==s.id||!Array.isArray(s.points)||!s.points.length||s.points.some(p=>!validPoint(data,d,p))||s.condition===undefined)errors.push(`${d.id}: 現地調査の定義が不正です`);
      ids.add(s.id);
    }
  }
  return errors;
}
