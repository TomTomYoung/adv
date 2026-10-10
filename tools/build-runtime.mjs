import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';

const root=path.resolve(import.meta.dirname,'..');
const digest=bytes=>'sha256-'+createHash('sha256').update(bytes).digest('base64');
async function filesIn(folder){
  const files=[];
  for(const entry of await fs.readdir(folder,{withFileTypes:true})){
    const file=path.join(folder,entry.name);
    if(entry.isDirectory())files.push(...await filesIn(file));else files.push(file);
  }
  return files;
}
export async function runtimeManifest(base=root){
  const sources=(await filesIn(path.join(base,'src'))).filter(file=>/\.(js|css)$/.test(file));
  const data=(await filesIn(path.join(base,'data'))).filter(file=>file.endsWith('.json'));
  const assets=JSON.parse(await fs.readFile(path.join(base,'data/assets.json'),'utf8'));
  const paths=[...new Set(['index.html',...sources.concat(data).map(file=>path.relative(base,file).split(path.sep).join('/')),...Object.values(assets).flatMap(group=>Object.values(group))])].sort();
  const files={};
  for(const file of paths)files[file]=digest(await fs.readFile(path.join(base,file)));
  const revision=createHash('sha256').update(JSON.stringify(files)).digest('hex');
  return {schemaVersion:1,revision,files};
}
export async function buildRuntime({check=false,base=root}={}){
  const output=JSON.stringify(await runtimeManifest(base),null,2)+'\n',file=path.join(base,'runtime.json');
  if(check){
    if(await fs.readFile(file,'utf8').catch(()=>'')!==output)throw Error('配信情報が古くなっています。npm run build:runtime を実行してください。');
    console.log('RUNTIME OK: 配信更新IDと全ファイルの指紋が一致');
  }else{await fs.writeFile(file,output);console.log('RUNTIME BUILT: runtime.json');}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildRuntime({check:process.argv.includes('--check')});
