import assert from 'node:assert/strict';
import test from 'node:test';
import {data, drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {shiftingDungeonData, SHIFTING_DUNGEON} from '../src/core/shifting-dungeon.js';
import {xpThreshold} from '../src/core/progression.js';
import {validateSave} from '../src/core/save.js';
import {guideBands,monsterFloorText} from '../src/application/labyrinth-guide.js';

const playable=shiftingDungeonData(data), classes=Object.values(data.enemies).filter(e=>e.family);
test('three bestiary families contain 25 illustrated classes each, five per level tier',()=>{
  assert.equal(classes.length,75);
  assert.equal(new Set(classes.map(e=>data.assets.images[e.sprite])).size,75);
  const sections=guideBands(data,false);
  for(const family of ['goblin','orc','ogre'])for(const lv of [5,10,15,20,25]){
    const entries=classes.filter(e=>e.family===family&&e.levelBand===lv);
    assert.equal(entries.length,5);
    for(const e of entries){
      assert.equal(monsterFloorText(sections,e.id),'地下'+lv+'〜'+(lv+4)+'階');
      assert.equal(e.name.includes('の'),false,e.name);
      if(family==='goblin')assert.ok(e.name.startsWith('ゴブリン'),e.name);
      assert.ok(data.skills[e.classSkill]?.description,e.name);
    }
  }
});

for(const mode of ['classic','grid','frontline'])test(mode+' runs each class in its real floor encounter, including a saved combat round',()=>{
  const encountered=new Set();
  const g=new GameEngine(playable,713);drain(g);
  g.award(0,1000000,['ada']);g.state.actors.ada.hp=g.stats('ada').hp;
  assert.ok(g.dispatch({type:'travel',dungeon:SHIFTING_DUNGEON}));
  for(const lv of [5,10,15,20,25]){
    const map=g.data.maps[g.data.dungeons[SHIFTING_DUNGEON].maps[lv-1]];
    g.teleport(map.id,map.entrance.x,map.entrance.y,map.entrance.facing);
    const checkpoint=g.save();
    for(const entry of map.encounterPool.filter(e=>e.encounter.includes('_squad_'))){
      g.startBattle(entry.encounter,{win:[],lose:[],escape:[]},{battleMode:mode,manualTurns:true});
      const b=g.state.battle;
      for(const unit of b.enemies)encountered.add(unit.classSkill);
      let steps=0;
      while(g.state.battle===b&&b.round<=4){
        assert.ok(g.dispatch({type:'battle.step'}),'step '+entry.encounter);
        assert.ok(++steps<100);
      }
      assert.ok(steps>=4);
      if(g.state.battle===b){
        const saved=g.save();
        assert.deepEqual(validateSave(JSON.parse(saved),g.data),[],entry.encounter);
        g.load(saved);
        assert.deepEqual(g.state.battle,b);
      }
      g.load(checkpoint);
    }
  }
  assert.equal(encountered.size,75);
});

function stage(lv, group) {
  const game=new GameEngine(playable,17);
  drain(game);
  game.award(0,xpThreshold(game.data,lv-1),['ada']);
  game.state.actors.ada.hp=game.stats('ada').hp;
  game.dispatch({type:'travel',dungeon:SHIFTING_DUNGEON});
  const map=game.data.maps[game.data.dungeons[SHIFTING_DUNGEON].maps[lv-1]];
  game.teleport(map.id,map.entrance.x,map.entrance.y,map.entrance.facing);
  const encounter=map.encounterPool.find(row=>row.encounter.endsWith('_'+group)).encounter;
  game.startBattle(encounter,{win:[],lose:[],escape:[]},{manualTurns:true});
  return game;
}

test('royal guard redirects an attack on the king and a steward crowns a survivor after his defeat',()=>{
  const g=stage(25,'goblin_squad_3'),b=g.state.battle;
  const [king,guard]=b.enemies;
  const strike=()=>g.dispatch({type:'battle',action:'skill',skill:'attack',target:king.instance});
  const full=king.hp;guard.hp=1;
  assert.ok(strike());
  assert.equal(king.hp,full);
  assert.equal(guard.hp,0);
  while(b.turnQueue[b.turnIndex]!=='actor:ada')assert.ok(g.dispatch({type:'battle.step'}));
  king.hp=1;
  assert.ok(strike());
  assert.equal(king.hp,0);
  for(let i=0;i<20&&b.familyField.crown===king.instance;i++)assert.ok(g.dispatch({type:'battle.step'}));
  assert.ok(b.enemies.some(e=>e.instance===b.familyField.crown&&e.hp>0));
  const saved=g.save();g.load(saved);
  assert.equal(g.state.battle.familyField.crown,b.familyField.crown);
});

test('a mountain king winding up can be interrupted by a hit before the stomp',()=>{
  const g=stage(25,'ogre_squad_2'),b=g.state.battle;
  const king=b.enemies.find(e=>e.classSkill==='family_ogre_25_mountainking');
  for(let i=0;i<20&&!(king.tactics.windup&&b.turnQueue[b.turnIndex]==='actor:ada');i++)assert.ok(g.dispatch({type:'battle.step'}));
  assert.ok(king.tactics.windup);
  assert.ok(g.dispatch({type:'battle',action:'skill',skill:'attack',target:king.instance}));
  assert.equal(king.tactics.windup,undefined);
  assert.ok((b.stuns?.['enemy:'+king.instance]??0)>0);
});
