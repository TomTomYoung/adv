import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..');
export async function buildExpedition(folder=root){
  const read=async file=>JSON.parse(await fs.readFile(path.join(folder,file),'utf8'));
  const write=(file,value)=>fs.writeFile(path.join(folder,file),JSON.stringify(value,null,2)+'\n');
  const definition=await read('config/expedition-content.json'),game=await read('data/game.json');
  game.version='1.34.0';game.files.databases.expedition='data/expedition.json';
  game.migrations['1.25.0']={expeditionRevision:1,kagaribiRevision:1,waterwayRevision:1};
  game.migrations['1.26.0']={kagaribiRevision:1,waterwayRevision:1};
  game.migrations['1.27.0']={waterwayRevision:1};
  game.migrations['1.28.0']={mineRevision:1};
  game.migrations['1.29.0']={gardenRevision:1};
  game.migrations['1.30.0']={gardenRevision:1};
  game.migrations['1.31.0']={workshopRevision:1};
  game.migrations['1.32.0']={waterwayEncountersRevision:1};
  game.migrations['1.33.0']={mineEncountersRevision:1};
  await write('data/expedition.json',definition);await write('data/game.json',game);
  console.log(`EXPEDITION: ${definition.camps.length} supply points, ${Object.keys(definition.products).length} paid skills`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildExpedition();
