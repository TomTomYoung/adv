import assert from 'node:assert/strict';
import {border,go,play,paths,checkpoint} from '../tests/oddland-helpers.mjs';
const results=[];
for(let number=291;number<=297;number++)for(const path of paths(number)){
 const g=border();go(g,{kind:'town',location:'oddland_supply'});assert.ok(g.dispatch({type:'world.supply'}));go(g,{kind:'town',location:'oddland_board'});
 const before={steps:g.state.steps,oil:g.state.light,gold:g.state.gold,hp:g.state.members.map(id=>g.state.actors[id].hp)};
 play(g,number,path,{save:false});go(g,{kind:'town',location:'oddland_board'});checkpoint(g);
 assert.deepEqual(g.state.members.map(id=>g.state.actors[id].hp),before.hp);
 results.push({quest:'q'+number,outcome:path.outcome,walkedSteps:g.state.steps-before.steps,oilStart:before.oil,oilEnd:g.state.light,goldChange:g.state.gold-before.gold,defeats:0,returnedTo:'oddland_board'});
}
console.log(JSON.stringify({conditions:'新規e2、実越境後、宿場で携行油90へ補充。第一群独立7件・両結末を各々実行して掲示板まで歩いて戻る。通路は固定照明・安全地帯。能力・所持品の増強や回復操作なし。',results},null,2));
