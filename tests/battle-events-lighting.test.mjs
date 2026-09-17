import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain} from './helpers.mjs';
import {prepareQuest,finishJourney} from './structure-routes.mjs';
import {GameEngine} from '../src/core/engine.js';
import {validateContent} from '../src/core/validation.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {computeLightGrid,lightSources} from '../src/core/lighting.js';
import {fireContext} from '../src/core/systems/fire-network.js';

function outage(){
 const g=prepareQuest('q001');
 for(const id of ['talk','inspect','follow','support']){assert.ok(g.dispatch({type:'choose',id}));drain(g);finishJourney(g);}
 assert.equal(g.state.battle.encounter,'kuragari_hunt');return g;
}
const checkpoint=g=>{const s=g.save();assert.deepEqual(validateSave(JSON.parse(s),g.data),[]);g.load(s);assert.equal(g.save(),s);};

test('q001 fights one full round, saves rookie speech, interrupts without rewards and resumes on the same cell',()=>{
 const g=outage(),loc=structuredClone(g.state.location),gold=g.state.gold,xp=g.state.xp,r=structuredClone(g.state.records);
 checkpoint(g);assert.equal(fireContext(data,g.state).run.portable.fuel,0);
 const hp=g.state.members.reduce((n,id)=>n+g.state.actors[id].hp,0);
 for(let n=0;n<10&&!g.state.battle.event;n++)assert.ok(g.dispatch({type:'battle',action:'skill',skill:'guard'}));
 assert.equal(g.state.battle.round,2);assert.equal(g.state.battle.event.id,'q001-B-rookie');
 assert.ok(g.state.members.reduce((n,id)=>n+g.state.actors[id].hp,0)<hp,'enemy actually attacked');
 assert.equal(g.state.waiting.speaker,'新人灯番');assert.equal(g.state.stories.q001.values.newOil,1);
 assert.equal(projectGame(g).battle.event.id,'q001-B-rookie');assert.ok(projectGame(g).dialog.text.includes('怖いです'));
 assert.equal(g.dispatch({type:'battle',action:'skill',skill:'guard'}),false);checkpoint(g);
 assert.ok(g.dispatch({type:'advance'}));assert.equal(g.state.battle,null);assert.equal(g.state.waiting.type,'text');
 assert.equal(g.state.stories.q001.scene,'rescue');assert.deepEqual(g.state.location,loc);
 assert.equal(g.state.stories.q001.values.newOil,0);assert.equal(g.state.stories.q001.values.oilUsed,2);
 assert.equal(fireContext(data,g.state).run.portable.fuel,25);
 assert.equal(g.state.records.interruptions,r.interruptions+1);assert.equal(g.state.records.wins,r.wins);
 assert.equal(g.state.gold,gold);assert.equal(g.state.xp,xp);checkpoint(g);drain(g);checkpoint(g);
 assert.equal(g.state.stories.q001.values.oilUsed,2);
});

for(const mode of ['win','escape','repel'])test(`q001 intercepts early ${mode} and resumes the saved pending end exactly once`,()=>{
 const g=outage();
 if(mode==='win'){
  for(const e of g.state.battle.enemies)e.hp=1;
  assert.ok(g.dispatch({type:'battle',action:'skill',skill:'attack',target:g.state.battle.enemies[0].instance}));
 }else if(mode==='escape'){
  g.random=()=>0;assert.ok(g.dispatch({type:'battle',action:'escape'}));
 }else g.finishBattle('repel'); // The shared end hook used by repel skills.
 assert.equal(g.state.battle.pendingResult,mode);assert.equal(g.state.waiting.speaker,'新人灯番');checkpoint(g);
 drain(g);assert.equal(g.state.battle,null);assert.equal(g.state.stories.q001.scene,'rescue');assert.equal(g.state.stories.q001.values.oilUsed,2);
});

test('q001 defeat before rescue does not spend oil and can retry at the outage',()=>{
 const g=outage();for(const id of g.state.members){g.state.actors[id].hp=1;g.state.actors[id].statuses=['poison'];}
 for(let n=0;n<10&&g.state.battle;n++)g.dispatch({type:'battle',action:'skill',skill:'guard'});
 assert.equal(g.state.mode,'town');assert.equal(g.state.battle,null);assert.equal(g.state.stories.q001.values.newOil,1);checkpoint(g);
 g.healAll();g.teleport('kagaribi_f1',9,1);g.run('q001.v11.outage');drain(g);
 assert.equal(g.state.battle.encounter,'kuragari_hunt');checkpoint(g);
});

test('generic battle events resume combat and pending victory, preserving nested choices and one-shot order',()=>{
 const d=structuredClone(data);d.scripts.event_test={commands:[{op:'battle.start',encounter:'kuragari_hunt',events:[
  {id:'opening',triggers:['start'],commands:[{op:'choice',options:[{id:'go',text:'go',commands:[{op:'set',target:'local.n',value:7},{op:'say',text:'ready'}]}]}]},
  {id:'closing',triggers:['before_end'],commands:[{op:'add',target:'local.n',value:1},{op:'say',text:'done'}]}
 ],on_interrupt:[],on_win:[{op:'flag.set',key:'won',value:{ref:'local.n'}}],on_lose:[],on_escape:[]}]};
 const g=new GameEngine(d);drain(g);g.run('event_test');checkpoint(g);assert.ok(g.dispatch({type:'choose',id:'go'}));checkpoint(g);drain(g);
 assert.equal(g.state.waiting.type,'battle');assert.deepEqual(g.state.battle.firedEvents,['opening']);
 g.finishBattle('win');checkpoint(g);drain(g);assert.equal(g.state.flags.won,8);assert.equal(g.state.battle,null);checkpoint(g);
});

test('invalid event commands, IDs, triggers and save continuations fail validation',()=>{
 for(const edit of [c=>c.events[0].triggers=['bogus'],c=>c.events.push(structuredClone(c.events[0])),c=>c.events[0].commands.push({op:'town.return'}),c=>delete c.on_interrupt]){
  const d=structuredClone(data);edit(d.scripts['q001.v11.outage'].commands.find(c=>c.op==='battle.start'));assert.ok(validateContent(d).length);
 }
 const g=outage();g.finishBattle('win');const s=g.save();
 for(const edit of [b=>b.event.depth=0,b=>b.event.id='missing',b=>b.firedEvents=[],b=>b.pendingResult='invented']){
  const bad=JSON.parse(s);edit(bad.state.battle);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),s);
 }
});

test('radial illumination has center 8, perimeter 1, dark exterior, symmetry and strongest-source overlap',()=>{
 const geometry=Array(13).fill('.'.repeat(13)),source={x:6,y:6,radius:4};
 const grid=computeLightGrid(geometry,[source]);assert.equal(grid[6][6],8);assert.equal(grid[6][10],1);assert.equal(grid[6][11],0);
 assert.ok(grid[8][8]>0);assert.equal(grid[9][9],0);
 for(let y=0;y<13;y++)for(let x=0;x<13;x++)assert.equal(grid[y][x],grid[x][y]);
 const a={x:8,y:6,radius:4},second=computeLightGrid(geometry,[a]),both=computeLightGrid(geometry,[source,a]);
 for(let y=0;y<13;y++)for(let x=0;x<13;x++)assert.equal(both[y][x],Math.max(grid[y][x],second[y][x]));
});

test('light illuminates wall surfaces but cannot leak behind walls, around closed corners or through voxel faces',()=>{
 const source={x:1,y:1,radius:4};
 assert.equal(computeLightGrid(['.....','..#..','.....'],[source])[1][3],0);
 assert.ok(computeLightGrid(['.....','..#..','.....'],[source])[1][2]>0);
 assert.equal(computeLightGrid(['.....','..#..','.#...'],[source])[2][2],0);
 assert.equal(computeLightGrid(['.....','.....','.....'],[source],{'1,1/east':true})[1][2],0);
 assert.ok(computeLightGrid(['.....','.....','.....'],[source])[1][2]>0);
});

test('live torch and wall-lamp state produce detached per-cell lighting and darkness after extinction',()=>{
 const g=outage();let m=projectGame(g);assert.equal(m.dungeon.lighting.current,0);assert.equal(m.atmosphere.find(l=>l.lighting).opacity,.65);
 g.finishBattle('win');drain(g);m=projectGame(g);assert.equal(m.dungeon.lighting.current,8);assert.equal(m.atmosphere.find(l=>l.lighting).opacity,0);
 assert.equal(m.dungeon.cells[g.state.location.y][g.state.location.x].illumination,8);
 m.dungeon.lighting.levels[1][9]=99;assert.notEqual(projectGame(g).dungeon.lighting.levels[1][9],99);
 const ctx=fireContext(data,g.state);ctx.run.portable.lit=false;for(const f of Object.values(ctx.persistent.fixtures))f.lit=false;
 for(const o of g.map().objects.filter(o=>o.fire))g.state.objects[`${g.map().id}/${o.id}`]='extinguished';
 assert.equal(lightSources(data,g.state).length,0);assert.ok(projectGame(g).dungeon.lighting.levels.flat().every(n=>n===0));
 ctx.run.portable.lit=true;g.state.location.x=8;assert.equal(lightSources(data,g.state).find(s=>s.id==='portable').x,8);
});
