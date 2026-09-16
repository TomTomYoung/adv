export function validateDungeonArt(data){
  const errors=[],artValid=a=>a&&data.assets.images[a.asset]&&a.rect&&['x','y','width','height'].every(k=>Number.isFinite(a.rect[k]))&&a.rect.x>=0&&a.rect.y>=0&&a.rect.width>0&&a.rect.height>0&&a.rect.x+a.rect.width<=1&&a.rect.y+a.rect.height<=1;
  for(const d of Object.values(data.dungeons??{})){
    if(d.art&&(!artValid(d.art.wall)||!artValid(d.art.device)||d.art.floor&&!artValid(d.art.floor)||Object.values(d.art.variants??{}).some(a=>!artValid(a))))errors.push(`${d.id}: 素材の画像・切り出し範囲が不正です`);
    if(d.fieldScenes!==undefined)errors.push(`${d.id}: クエストイベントはクエストJSONに定義してください`);
  }
  return errors;
}
