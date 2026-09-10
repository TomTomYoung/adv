import fs from 'node:fs/promises';
import {applyJobs} from './build-jobs.mjs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..');
export async function applyPresentation(){
  const read=async f=>JSON.parse(await fs.readFile(path.join(root,f),'utf8'));
  const write=(f,v)=>fs.writeFile(path.join(root,f),JSON.stringify(v,null,2)+'\n');
  const plan=await read('authoring/presentation.json'),game=await read('data/game.json'),assets=await read('data/assets.json');
  const sounds=Object.fromEntries(Object.entries(plan.sounds).map(([id,s])=>{assets.audio[id]=`assets/audio/se/${id}.ogg`;return [id,{name:s.name,asset:id,gain:s.gain}];}));
  for(const effect of Object.values(plan.effects))for(const track of effect.tracks)if(track.kind==='sprite')assets.images[track.asset]=`assets/effects/${track.asset}.png`;
  game.version=plan.version;game.files.databases={...game.files.databases,effects:'data/effects.json',sounds:'data/sounds.json',presentation:'data/presentation.json'};
  game.migrations={...game.migrations,'1.1.0':{actors:Object.keys(await read('data/actors.json'))}};
  await write('data/game.json',game);await write('data/assets.json',assets);await write('data/effects.json',plan.effects);await write('data/sounds.json',sounds);await write('data/presentation.json',{cues:plan.cues,bindings:plan.bindings,ambient:plan.ambient});
  await applyJobs();
  console.log(`Presentation: ${Object.keys(sounds).length} SE, ${Object.keys(plan.effects).length} effects`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await applyPresentation();
