import fs from 'node:fs/promises';
import path from 'node:path';
import {GameEngine} from '../src/core/engine.js';
import {loadContent} from '../src/core/loader.js';
import {projectGame} from '../src/application/projection.js';
const root=path.resolve(import.meta.dirname,'..'),data=await loadContent(file=>fs.readFile(path.join(root,file),'utf8').then(JSON.parse));
const g=new GameEngine(data),drain=()=>{while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});};drain();
g.dispatch({type:'accept',id:'q001'});const fixtures={town:projectGame(g)};
g.dispatch({type:'travel',region:1});fixtures.dungeon=projectGame(g);
g.run('q001.clue_a');fixtures.dialog=projectGame(g);drain();g.run('q001.clue_b');drain();g.run('q001.decision');drain();fixtures.choice=projectGame(g);
const beforeBattle=g.save();g.dispatch({type:'choose',id:'contract'});fixtures.battle=projectGame(g);
g.load(beforeBattle);g.dispatch({type:'choose',id:'informed'});drain();g.returnTown();fixtures.journal=projectGame(g);
fixtures.journal.ending={title:'道を次へ渡す者',text:'表示例です。実際の終幕は百件の依頼を終えた後、あなたの選択によって記録されます。'};
g.dispatch({type:'party',action:'join',actor:'toma'});fixtures.tavern=projectGame(g);
g.dispatch({type:'travel',region:1});g.startBattle('wild_pair_1',{win:[],lose:[],escape:[]});fixtures.monsters=projectGame(g);
for(const fixture of Object.values(fixtures)){fixture.quests=fixture.quests.slice(0,4);fixture.regions=fixture.regions.slice(0,3);}
await fs.writeFile(path.join(root,'data/view-fixtures.json'),JSON.stringify(fixtures,null,2)+'\n');console.log('Built 8 detached view fixtures');
