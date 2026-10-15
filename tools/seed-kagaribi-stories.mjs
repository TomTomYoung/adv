import fs from 'node:fs/promises';
import path from 'node:path';
import stories from '../authoring/stories-kagaribi.mjs';
import {ref,eq} from '../authoring/story-kit.mjs';
import {readQuestEvents} from './quest-event-source.mjs';

// Source is the ten authored drafts. Full builds must not depend on stale
// generated q201–q210 JSON surviving from a previous checkout.
export async function seedKagaribiStories(root,game){
  const write=(file,value)=>fs.writeFile(path.join(root,file),JSON.stringify(value,null,2)+'\n');
  for(const s of stories){
    const {events}=await readQuestEvents(root,s.id);
    const file=`data/quests/${s.id}.json`;
    await write(file,{schemaVersion:1,id:s.id,number:s.number,title:s.title,client:s.client,brief:s.brief,
      region:1,type:'authored_progression',recommendedLevel:s.number>=204?3:2,
      requires:eq(ref('quests.q001.stage'),'completed'),unlockHint:'「帰らない灯番」の完了後に受注できる。追加10件の受注順は自由。',
      events,locations:[],outcomes:{},scripts:{},model:{world:{},narrative:{},audience:{},
        dramaticKernel:s.kernel,adaptation:'独立した篝火迷宮の一編。人物の所在・物品・実移動・残る責任を追跡する。'}});
    if(!game.files.quests.includes(file))game.files.quests.push(file);
  }
  // An audited additive cohort, not a general repair of missing save data.
  game.questAdditions=[{ids:stories.map(s=>s.id)}];
  game.subtitle='二百十の依頼と、帰還の記録';
  await write('data/game.json',game);
}
