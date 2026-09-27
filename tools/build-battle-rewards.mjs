import fs from 'node:fs/promises';
import path from 'node:path';
export async function buildBattleRewards(root){
  const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
  const {drops}=await read('config/battle-rewards.json'),enemies=await read('data/enemies.json'),items=await read('data/items.json');
  if(Object.keys(drops).some(id=>!enemies[id]))throw Error('宝箱設定に未知の魔物があります');
  for(const [id,enemy] of Object.entries(enemies)){
    const drop=drops[id];if(!drop||!items[drop.item]||!Number.isFinite(drop.chance)||drop.chance<0||drop.chance>1)throw Error(`${id}: 宝箱のアイテム・確率を設定してください`);
    enemy.drop=drop;
  }
  await fs.writeFile(path.join(root,'data/enemies.json'),JSON.stringify(enemies,null,2)+'\n');
}
