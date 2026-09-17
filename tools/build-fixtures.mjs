import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {loadContent} from '../src/core/loader.js';
import {projectGame} from '../src/application/projection.js';
const root=path.resolve(import.meta.dirname,'..'),data=await loadContent(file=>fs.readFile(path.join(root,file),'utf8').then(JSON.parse));
const g=new GameEngine(data),drain=()=>{while(g.state.waiting?.type==='text')g.dispatch({type:'advance'});},act=intent=>assert.ok(g.dispatch(intent));drain();
const fixtures={town:projectGame(g)};
act({type:'location.move',id:'hikarigaeri_guild'});fixtures.guild=projectGame(g);act({type:'accept',id:'q002'});
act({type:'location.move',id:'hikarigaeri_square'});act({type:'location.move',id:'hikarigaeri_shop'});fixtures.shop=projectGame(g);
act({type:'location.move',id:'hikarigaeri_square'});act({type:'location.move',id:'hikarigaeri_tavern'});act({type:'party',action:'join',actor:'toma'});fixtures.tavern=projectGame(g);
act({type:'travel',dungeon:'region_1'});fixtures.dungeon=projectGame(g);
g.teleport('region_1_f1',11,9);g.run(data.quests.q002.model.entryScript);drain();
for(const id of ['lift','school']){act({type:'choose',id});drain();}
g.returnTown();act({type:'location.move',id:'hikarigaeri_medical'});act({type:'location.move',id:'hikarigaeri_medical_specimens'});act({type:'journey.arrive'});
fixtures.dialog=projectGame(g);drain();fixtures.choice=projectGame(g);
for(const id of ['return','consent']){act({type:'choose',id});drain();}
for(const id of ['hikarigaeri_medical','hikarigaeri_square','hikarigaeri_insurance'])act({type:'location.move',id});
act({type:'journey.arrive'});fixtures.insurance=projectGame(g);drain();act({type:'choose',id:'file'});drain();fixtures.journal=projectGame(g);
fixtures.journal.ending={title:'道を次へ渡す者',text:'表示例です。実際の終幕は百件の依頼を終えた後、あなたの選択によって記録されます。'};
for(const [key,encounter] of [['battle','guard_1'],['monsters','wild_pair_1']]){const h=new GameEngine(data);while(h.state.waiting?.type==='text')h.dispatch({type:'advance'});h.dispatch({type:'travel',dungeon:'region_1'});h.startBattle(encounter,{win:[],lose:[],escape:[]});fixtures[key]=projectGame(h);assert.ok(fixtures[key].battle);}
for(const fixture of Object.values(fixtures)){fixture.quests=fixture.quests.slice(0,4);fixture.regions=fixture.regions.slice(0,3);}
await fs.writeFile(path.join(root,'data/view-fixtures.json'),JSON.stringify(fixtures,null,2)+'\n');console.log(`Built ${Object.keys(fixtures).length} detached view fixtures`);
