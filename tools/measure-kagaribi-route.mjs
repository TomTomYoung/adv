// Deterministic equipment-route measurement. No random encounters or optional
// quests: this is the lower-bound route, not a complete balance playthrough.
import assert from 'node:assert/strict';
import {newGame,drain,walk,navigateMaps,inspect,goTownLocation,fight} from '../tests/helpers.mjs';
import {oilTotal} from '../src/core/expedition-oil.js';
import {validateSave} from '../src/core/save.js';
export function measureRoute(size=4){
 const g=newGame(1907);g.state.flags.legacyStoryRoutes={q001:true};g.accept('q001');g.complete('q001','informed');drain(g);
 if(size===5)g.dispatch({type:'party',action:'join',actor:'berg'});
 assert.equal(g.state.members.length,size);g.random=()=>.999999;
 goTownLocation(g,g.data.game.world.townRoot);g.dispatch({type:'travel',dungeon:'kagaribi'});
 const options={beforeStep:()=>{const lamp=g.state.dungeons.active.systems.fires.portable;if(lamp.fuel<15&&g.state.expedition.reserve>0)assert.ok(g.dispatch({type:'dungeon.action',system:'fires',action:'refuel',target:'portable'}));}};
 const log=[];let start=0;
 function camp(id){const c=g.data.expedition.camps.find(c=>c.id===id);navigateMaps(g,c.map,options);walk(g,c.x,c.y,options);
  const remaining=oilTotal(g.data,g.state);inspect(g,'supply_rope');drain(g);
  assert.ok(g.dispatch({type:'expedition.action',camp:id,action:'repair'}),g.state.notice);
  if(c.relayEnabled!==false)assert.ok(g.dispatch({type:'expedition.action',camp:id,action:'relay'}));
  log.push({camp:id,steps:g.state.steps-start,arrivalOil:remaining,capacity:g.state.expedition.capacity,xp:g.state.actors.ada.xp,level:g.state.actors.ada.level});start=g.state.steps;
  g.dispatch({type:'expedition.action',camp:id,action:'draw'});assert.deepEqual(validateSave(JSON.parse(g.save()),g.data),[]);
 }
 camp('kagaribi_gate');camp('kagaribi_manifold');camp('kagaribi_crossroads');
 navigateMaps(g,'kagaribi_kilns',options);walk(g,7,1,options);g.state.location.facing='north';inspect(g,'kiln_latch');drain(g);assert.ok(g.dispatch({type:'choose',id:'open'}));drain(g);camp('kagaribi_relay');camp('kagaribi_ossuary');
 navigateMaps(g,'kagaribi_f3',options);walk(g,5,1,options);inspect(g,'altar_keeper');drain(g);assert.ok(g.dispatch({type:'choose',id:'fight'}));drain(g);fight(g);
 assert.equal(g.state.flags.kagaribi.altarGuardianWon,true,'lower-bound party can defeat the equipment guardian');camp('kagaribi_central');
 return {party:size,randomEncounters:false,optionalQuests:false,route:log,totalSteps:g.state.steps,gems:g.state.expedition.gems,actors:g.state.members.map(id=>({id,level:g.state.actors[id].level,xp:g.state.actors[id].xp,hp:g.state.actors[id].hp,mp:g.state.actors[id].mp}))};
}
if(process.argv[1]?.endsWith('measure-kagaribi-route.mjs'))for(const size of [4,5])console.log(JSON.stringify(measureRoute(size)));
