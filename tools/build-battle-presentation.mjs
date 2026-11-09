import fs from 'node:fs/promises';
import {parsePresentationDesign,presentationSchema} from '../src/presentation-design.js';
const root=new URL('../',import.meta.url),read=async path=>JSON.parse(await fs.readFile(new URL(path,root),'utf8'));
const design=parsePresentationDesign(await read('config/battle-presentation.json'),{effects:await read('data/effects.json'),sounds:await read('data/sounds.json')});
const outputs={
  'src/presentation-presets.js':'// Generated from config/battle-presentation.json by tools/build-battle-presentation.mjs.\nexport const defaultPresentation = '+JSON.stringify(design,null,2)+';\n',
  'data/schemas/battle-presentation.schema.json':JSON.stringify(presentationSchema,null,2)+'\n'
};
for(const [path,content] of Object.entries(outputs))if(process.argv.includes('--check')){if(await fs.readFile(new URL(path,root),'utf8').catch(()=>'')!==content)throw Error(`演出定義を更新してください: ${path}`);}else await fs.writeFile(new URL(path,root),content);
console.log('PRESENTATION DESIGN OK: profiles, particles, paths, timelines, references');
