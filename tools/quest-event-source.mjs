import fs from 'node:fs/promises';
import path from 'node:path';

export async function readQuestEvents(root,id){
  return JSON.parse(await fs.readFile(path.join(root,`config/quests/${id}.events.json`),'utf8'));
}
export function eventLocations(events){
  return events.filter(e=>e.role).flatMap(e=>e.points.map(p=>({...p,object:e.id,role:e.role})));
}
export async function applyQuestEvents(root){
  const game=JSON.parse(await fs.readFile(path.join(root,'data/game.json'),'utf8'));
  for(const file of game.files.quests){
    const q=JSON.parse(await fs.readFile(path.join(root,file),'utf8')),source=await readQuestEvents(root,q.id);
    q.events=source.events;q.locations=eventLocations(q.events);
    // Historical revision IDs are retained in the quest source alongside current IDs.
    for(const [id,script] of Object.entries(source.scripts)){
      if(q.scripts[id]&&JSON.stringify(q.scripts[id])!==JSON.stringify(script))throw Error(`${q.id}: script ID conflict: ${id}`);
      q.scripts[id]=script;
    }
    await fs.writeFile(path.join(root,file),JSON.stringify(q,null,2)+'\n');
  }
}
