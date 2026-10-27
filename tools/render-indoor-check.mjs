// Actual game projection and software Canvas; browser layout is checked separately.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {paintDungeon} from '../src/view/dungeon.js';
import {INDOOR_THEMES} from '../src/core/indoor-appearance.js';
const root=path.resolve(import.meta.dirname,'..'),require=createRequire(import.meta.url);
const {createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');
const data=await loadContent(file=>fs.readFile(path.join(root,file),'utf8').then(JSON.parse),{edition:'e2'});
const output=process.argv[2]??'/tmp/adv-indoor-render';await fs.mkdir(output,{recursive:true});let count=0;
for(const theme of INDOOR_THEMES){
  const game=new GameEngine(data,1907);while(game.state.waiting?.type==='text')game.dispatch({type:'advance'});
  game.state.worldTravel.registrations.oddland_entry=true;game.teleport('e2_'+theme,1,1,'east');
  for(const phase of ['entry',...(['sunken_inn','observatory_rescue'].includes(theme)?['water']:[])]){
    if(phase==='water')game.dispatch({type:'move',direction:'forward'});
    const canvas=createCanvas(800,400);canvas.isConnected=true;paintDungeon(canvas,projectGame(game).dungeon,null);
    await fs.writeFile(path.join(output,theme+'-'+phase+'.png'),await canvas.encode('png'));count++;
  }
}
console.log(`Rendered ${count} indoor views to ${output}`);
