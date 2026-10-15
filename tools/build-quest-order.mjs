import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {questOrderErrors} from '../src/core/quest-order.js';

const root=path.resolve(import.meta.dirname,'..');
export async function questOrderArtifacts(folder=root){
  const read=async file=>JSON.parse(await fs.readFile(path.join(folder,file),'utf8'));
  const order=await read('authoring/quest-order.json'),game=await read('data/game.json');
  if(order?.schemaVersion!==1||!Array.isArray(order.ids)||!order.ids.length||order.ids.some(id=>typeof id!=='string'||!/^[a-z][a-z0-9_]*$/.test(id)))
    throw Error('authoring/quest-order.json: schemaVersion 1 とクエストIDの ids 配列が必要です');
  const files=[...game.files.quests],quests={};
  for(const file of files){const q=await read(file);if(Object.hasOwn(quests,q.id))throw Error(`クエストID重複: ${q.id}`);quests[q.id]=q;}
  // Full legacy builds recreate their original manifest. Register newly authored
  // quest files as well, without sorting the existing gameplay/event definitions.
  for(const id of order.ids)if(!Object.hasOwn(quests,id)){
    const file=`data/quests/${id}.json`,q=await read(file);
    if(q.id!==id)throw Error(`${file}: 内部IDが一致しません`);
    quests[id]=q;files.push(file);
  }
  const errors=questOrderErrors({quests,questOrder:order});
  if(errors.length)throw Error(errors.join('\n'));
  game.files.databases.questOrder='data/quest-order.json';
  game.files.quests=files;
  return new Map([['data/quest-order.json',JSON.stringify(order,null,2)+'\n'],['data/game.json',JSON.stringify(game,null,2)+'\n']]);
}

export async function buildQuestOrder(folder=root,{check=false}={}){
  const artifacts=await questOrderArtifacts(folder);
  for(const [file,content] of artifacts){
    if(check){if(await fs.readFile(path.join(folder,file),'utf8').catch(()=>'')!==content)throw Error(`${file}: 表示順が古くなっています。npm run build:catalog を実行してください。`);}
    else await fs.writeFile(path.join(folder,file),content);
  }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  await buildQuestOrder(root,{check:process.argv.includes('--check')});
  console.log('QUEST ORDER: 内部IDを維持した表示順と番号を確認しました');
}
