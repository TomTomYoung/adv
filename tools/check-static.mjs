import fs from 'node:fs/promises';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=path.resolve(import.meta.dirname,'..');
async function walk(folder){const result=[];for(const f of await fs.readdir(folder,{withFileTypes:true})){if(f.name==='.git'||f.name==='node_modules')continue;const full=path.join(folder,f.name);if(f.isDirectory())result.push(...await walk(full));else result.push(full);}return result;}
const files=await walk(root),known=new Set(files);
for(const file of files){
  if(/\.(js|mjs)$/.test(file)){const p=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});if(p.status!==0)throw Error(p.stderr);
    const source=await fs.readFile(file,'utf8');for(const match of source.matchAll(/(?:from\s*|import\s*)['"](\.[^'"]+)['"]/g))if(!known.has(path.resolve(path.dirname(file),match[1])))throw Error(`Unresolved import ${file}: ${match[1]}`);
    if(file.includes('/src/view/')&&/from\s*['"][^'"]*(?:\/core\/|\/application\/)/.test(source))throw Error(`View imports game runtime: ${file}`);
    if(file.includes('/src/')&&/\beval\s*\(|new\s+Function\s*\(/.test(source))throw Error(`Executable scenario code: ${file}`);
  }
  if(file.endsWith('.json'))JSON.parse(await fs.readFile(file,'utf8'));
  if(file.endsWith('.html')){const html=await fs.readFile(file,'utf8');for(const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)){if(!/^(?:https?:|data:)/.test(match[1])&&!known.has(path.resolve(path.dirname(file),match[1])))throw Error(`Missing HTML asset: ${match[1]}`);}}
}
for(const name of ['dungeon-corridor','slime','skeleton','wraith','construct','dragon']){const b=await fs.readFile(path.join(root,`assets/images/${name}.png`));if(b.subarray(1,4).toString()!=='PNG')throw Error('Invalid PNG');}
for(const name of ['exploration','battle']){const b=await fs.readFile(path.join(root,`assets/audio/${name}.ogg`));if(b.subarray(0,4).toString()!=='OggS')throw Error('Invalid audio');}
console.log(`STATIC VALID: ${files.length} files, JS syntax, module paths, HTML references, PNG/OGG headers and view separation`);
