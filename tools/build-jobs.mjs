import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
const root=path.resolve(import.meta.dirname,'..');
export async function applyJobs(){
  const read=async f=>JSON.parse(await fs.readFile(path.join(root,f),'utf8'));
  const write=(f,v)=>fs.writeFile(path.join(root,f),JSON.stringify(v,null,2)+'\n');
  const p=await read('authoring/jobs.json'),game=await read('data/game.json');
  const actors=await read('data/actors.json'),items=await read('data/items.json'),shop=await read('data/shops.json');
  for(const [id,job] of Object.entries(p.initialJobs))actors[id].initialJob=job;
  for(const [id,patch] of Object.entries(p.equipmentPatches))Object.assign(items[id],patch);
  Object.assign(items,p.items);
  for(const good of p.shopGoods){const at=shop.goods.findIndex(g=>g.item===good.item);if(at<0)shop.goods.push(good);else shop.goods[at]=good;}
  game.version=p.version;
  game.files.databases={...game.files.databases,jobs:'data/jobs.json',jobProfile:'data/job-profile.json',buffs:'data/buffs.json',fieldAbilities:'data/field-abilities.json'};
  game.migrations={...game.migrations,'1.2.0':{actors:Object.keys(actors)}};
  const presentation=await read('data/presentation.json');
  Object.assign(presentation.bindings.skills,p.skillCues);
  presentation.bindings.actions['job.change']=presentation.bindings.actions.equip;
  await Promise.all([
    write('data/game.json',game),write('data/actors.json',actors),write('data/items.json',items),write('data/shops.json',shop),
    write('data/jobs.json',p.jobs),write('data/job-profile.json',p.profile),write('data/buffs.json',p.buffs),write('data/field-abilities.json',p.fieldAbilities),
    write('data/skills.json',{...await read('data/skills.json'),...p.skills}),write('data/formulas.json',{...await read('data/formulas.json'),...p.formulas}),
    write('data/presentation.json',presentation)
  ]);
  console.log(`Jobs: ${Object.keys(p.jobs).length} professions, ${Object.keys(p.skills).length} new battle skills, ${Object.keys(p.fieldAbilities).length} field abilities`);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await applyJobs();
