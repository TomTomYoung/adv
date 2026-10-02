import test from 'node:test';
import assert from 'node:assert/strict';
import {data} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {generateDungeonCandidate} from '../src/core/dungeon-generator.js';
import {installGeneratedDungeon,prepareGeneratedPlaytestEngine,validateGeneratedPlaytestData} from '../src/application/generated-dungeon-engine.js';

function candidateFor(content){
  return generateDungeonCandidate({
    seed:20261002,
    candidateIndex:2,
    layout:{
      mode:'rooms',width:29,height:23,corridorWidth:1,extraLoops:{min:0,max:1},
      corridors:{algorithm:'bezier_grid',branchCount:0,curvature:.6,sampleDensity:5,turnPenalty:.1},
      terrain:{algorithm:'classic'},
      bulges:{count:{min:0,max:0}},
      rooms:{count:{min:4,max:4},width:{min:5,max:8},height:{min:5,max:8},minArea:8,wallThickness:1,entrances:{min:1,max:2},shapes:[{id:'rectangle',weight:1},{id:'l_shape',weight:1}]},
    },
    cells:{baseFloor:'stone_floor',baseWall:'stone_wall',patches:[]},
    cellTypes:content.cellTypes,
  });
}

test('generated playtest applies selected party levels and a synthetic enemy encounter to the real engine',()=>{
  const content=structuredClone(data),candidate=candidateFor(content);
  const installed=installGeneratedDungeon(content,candidate,{
    sourceDungeonId:'kagaribi',
    encounter:{enabled:true,rate:.5,enemies:['guard_1','guard_1','guard_1_elite']},
  });
  assert.deepEqual(validateGeneratedPlaytestData(content),[]);
  assert.equal(installed.encounterId,'generated_preview.encounter');
  assert.deepEqual(content.encounters[installed.encounterId].enemies,['guard_1','guard_1','guard_1_elite']);
  assert.equal(installed.map.encounterRate,.5);
  const engine=new GameEngine(content,42);
  prepareGeneratedPlaytestEngine(engine,installed,{party:[{id:'berg',level:5},{id:'luka',level:7}]});
  assert.deepEqual(engine.state.members,['berg','luka']);
  assert.equal(engine.state.actors.berg.level,5);
  assert.equal(engine.state.actors.luka.level,7);
  assert.deepEqual(engine.state.actors.berg.growthHistory,{[engine.state.actors.berg.job]:4});
  assert.deepEqual(engine.state.actors.luka.growthHistory,{[engine.state.actors.luka.job]:6});
  assert.equal(engine.state.actors.berg.hp,engine.stats('berg').hp);
  assert.equal(engine.state.actors.luka.mp,engine.stats('luka').mp);
  engine.startBattle(installed.encounterId,{win:[],escape:[],lose:[]});
  assert.equal(engine.state.battle.enemies.length,3);
});

test('generated playtest rejects an oversized selected party',()=>{
  const content=structuredClone(data),candidate=candidateFor(content),installed=installGeneratedDungeon(content,candidate,{sourceDungeonId:'kagaribi'});
  const engine=new GameEngine(content,42);
  const party=Object.keys(content.actors).slice(0,content.system.maxParty+1).map(id=>({id,level:1}));
  assert.throws(()=>prepareGeneratedPlaytestEngine(engine,installed,{party}),/試遊パーティ/);
});
