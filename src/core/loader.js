import { validateContent } from './validation.js';
export async function loadContent(read = async path => {
  const response = await fetch(new URL(`../../${path}`, import.meta.url));
  if (!response.ok) throw new Error(`読込失敗: ${path} (${response.status})`);
  return response.json();
}) {
  const game = await read('data/game.json');
  const data = {game, maps:{}, quests:{}, scripts:{}};
  const merge = (dest, source, label) => {
    for(const [key,value] of Object.entries(source)) {
      if(Object.hasOwn(dest,key)) throw new Error(`${label} ID重複: ${key}`);
      dest[key]=value;
    }
  };
  const paths = [...Object.entries(game.files.databases).map(([type,path])=>({type,path})), ...game.files.maps.map(path=>({type:'map',path})), ...game.files.quests.map(path=>({type:'quest',path})), ...game.files.scripts.map(path=>({type:'script',path}))];
  const docs = await Promise.all(paths.map(async entry=>({...entry,value:await read(entry.path)})));
  for(const {type,value} of docs) {
    if(type==='map') merge(data.maps,{[value.id]:value},type);
    else if(type==='quest') {merge(data.quests,{[value.id]:value},type);merge(data.scripts,value.scripts,'script');}
    else if(type==='script') merge(data.scripts,value.scripts,type);
    else data[type]=value;
  }
  const errors=validateContent(data);
  if(errors.length) throw new Error(`シナリオ検証エラー\n${errors.join('\n')}`);
  return data;
}
