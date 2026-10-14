import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {frontlineTargetingErrors} from '../src/core/frontline-targeting.js';
import {targetingErrors} from '../src/core/battle-targeting.js';
export async function buildBattleGrid(root=path.resolve(import.meta.dirname,'..')){
  const read=async f=>JSON.parse(await fs.readFile(path.join(root,f),'utf8')),write=(f,v)=>fs.writeFile(path.join(root,f),JSON.stringify(v,null,2)+'\n');
  const source=await read('config/jobs.json'),skills=await read('data/skills.json'),game=await read('data/game.json');
  for(const [id,skill] of Object.entries(skills)){
    if(id!=='attack'){const p=source.frontlineProfiles[id];if(!p||frontlineTargetingErrors(p).length)throw Error(`Missing/invalid Frontline profile: ${id}`);skill.frontlineTargeting=p;}
    if(id==='attack')continue; // Equipped weapon type resolves its audited range at runtime.
    const profile=source.gridProfiles[id];if(!profile||targetingErrors(profile).length)throw Error(`Missing/invalid Grid profile: ${id}`);skill.targeting=profile;
  }
  game.battle=source.battle;
  await write('data/skills.json',skills);await write('data/game.json',game);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildBattleGrid();
