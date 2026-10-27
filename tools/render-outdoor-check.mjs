// Actual projection and software Canvas; browser layout is checked separately.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {loadContent} from '../src/core/loader.js';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {paintDungeon} from '../src/view/dungeon.js';
import {OUTDOOR_THEMES} from '../src/core/outdoor-appearance.js';
const root=path.resolve(import.meta.dirname,'..'),require=createRequire(import.meta.url);
const {createCanvas}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/@napi-rs/canvas':'@napi-rs/canvas');
const data=await loadContent(file=>fs.readFile(path.join(root,file),'utf8').then(JSON.parse),{edition:'e2'});
const output=process.argv[2]??'/tmp/adv-outdoor-render';await fs.mkdir(output,{recursive:true});
for(const theme of OUTDOOR_THEMES){
  const game=new GameEngine(data,1907);while(game.state.waiting?.type==='text')game.dispatch({type:'advance'});
  game.teleport('e2_'+theme,1,1,'east');
  const canvas=createCanvas(800,400);canvas.isConnected=true;
  paintDungeon(canvas,projectGame(game).dungeon,null);
  await fs.writeFile(path.join(output,theme+'.png'),await canvas.encode('png'));
}
console.log(`Rendered ${OUTDOOR_THEMES.length} outdoor maps to ${output}`);
