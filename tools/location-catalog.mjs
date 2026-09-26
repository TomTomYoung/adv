// Both catalogs use these references from the final, validated distribution.
const code=v=>'`'+v+'`';
export function describePlace(data,p){
  if(p.kind==='town')return `${data.locations[p.location].name} (${code(p.location)})。[ロケーション定義](../data/locations.json)`;
  const d=data.dungeons[p.dungeon],m=data.maps[p.map];
  return `${d.name} (${code(d.id)}) / ${m.name}・B${m.floor} (${code(m.id)}) / (${p.x}, ${p.y}${p.z===undefined?'':', '+p.z})${p.event?' / イベント '+code(p.event):''}。[ダンジョン定義](../data/dungeons.json)`;
}
export function questPlaces(data,q){
  const lines=[];
  for(const e of q.events)for(const p of e.points)lines.push(`実配置: ${describePlace(data,{kind:'dungeon',dungeon:e.dungeon,...p,event:e.id})}。${e.title}。${e.trigger==='action'?'操作調査':'現地イベント'}。`);
  for(const [key,p] of Object.entries(q.story?.worldPlaces??{}))if(p.kind==='town')lines.push(`参照施設: ${code(key)} → ${describePlace(data,p)}。`);
  return lines;
}
export function locationCatalog(data){
  const out=['# 町・ダンジョン室内ロケーション一覧','','配布JSONの場所・親子関係・施設機能から生成します。正本は config/locations.json、生成先は [data/locations.json](../data/locations.json) です。町と室内は選択肢で移動します。ダンジョン室内は定義されたセルで入室を選び、退出すると同じセルへ戻ります。','','[シナリオ一覧](QUEST_CATALOG.md) ／ [ダンジョン一覧](DUNGEON_CATALOG.md) ／ [ワールド接続仕様](WORLD_LOCATIONS.md)',''];
  for(const l of Object.values(data.locations)){
    const parent=data.locations[l.parent],children=Object.values(data.locations).filter(n=>n.parent===l.id);
    out.push(`## ${l.name} (${l.id})`,'',l.description,'',`親: ${parent?`${parent.name} (${parent.id})`:l.dungeonEntrance?'ダンジョン内の戸口':'町の起点'}。子: ${children.map(n=>`${n.name} (${n.id})`).join(' / ')||'なし'}。追加の移動先: ${(l.links??[]).map(id=>`${data.locations[id].name} (${id})`).join(' / ')||'なし'}。`,'',`機能: ${[l.shop?'取引':null,l.party?'編成':null,l.quests?'依頼掲示板':null,...(l.services??[]).map(id=>data.game.services.find(s=>s.id===id).label)].filter(Boolean).join(' / ')||'会話・調査'}。`,'',`背景: [${l.background}](../${data.assets.images[l.background]})。`,'');
    if(l.dungeonEntrance)out.push(`入退室地点: ${describePlace(data,{kind:'dungeon',...l.dungeonEntrance})}。入室・退出は明示的な選択肢で行う。`,'');
    if(l.dungeons?.length)out.push(`接続ダンジョン: ${l.dungeons.map(id=>`${data.dungeons[id].name} (${id})`).join(' / ')}。`,'');
    for(const q of Object.values(data.quests))for(const [scene,n] of Object.entries(q.story?.scenes??{}))if(q.story.worldPlaces?.[n.place]?.location===l.id)out.push(`参照場面: ${q.id}「${q.title}」 / ${scene}。`,'');
  }
  return out.join('\n').trimEnd()+'\n';
}
