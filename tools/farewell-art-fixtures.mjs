import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,go,choose,drain} from '../tests/royal-helpers.mjs';

export const beforeFarewell = await read('tests/fixtures/e2-q164-before-cast.json');
export const farewellLegacyQuest = data.previousQuestRoutes.q164;
function earlierData(quest) {
  const characters = {...data.characters};
  delete characters.q164_guests;delete characters.q164_ren;
  return {...data,characters,quests:{...data.quests,q164:quest},scripts:{...data.scripts,...quest.scripts}};
}
export const beforeFarewellData = earlierData(beforeFarewell);
export const legacyFarewellData = earlierData(farewellLegacyQuest);
export const farewellRoutes = [
  {choices:['secret','party','escort','finish'],legacy:['secret','party'],outcome:'secret'},
  {choices:['explain','party','finish'],legacy:['explain'],outcome:'explain'},
  {choices:['bring','wait'],legacy:['bring','wait'],outcome:'listen'},
  {choices:['bring','song'],legacy:['bring','song'],outcome:'song'}
];
const sceneCast = {
  entry:['q164_guests'],
  prepare:['q164_guests'],
  together:['q164_guests','q164_ren'],
  invite:['q164_guests','q164_ren'],
  secret_party:['q164_guests','q164_ren'],
  rehearse:['q164_guests','q164_ren'],
  explained:['q164_guests','q164_ren']
};
export function farewellCast(scene) {
  assert.ok(Object.hasOwn(sceneCast,scene),'known q164 scene: '+scene);
  return [...sceneCast[scene]];
}

// Reuse the existing upper-body portrait and check its central face region.
const renImage = {src:'assets/images/portraits/ren.webp',size:[1254,1254]};
const renFace = [.40,.21,.58,.37];
const seeds = new Map();
export function farewellSeed(renInParty=false) {
  if(!seeds.has(renInParty)) {
    const game = ready();
    if(renInParty && !game.state.members.includes('ren')) {
      const full = game.state.members.length >= data.system.maxParty;
      assert.ok(game.changeParty(full?'swap':'join','ren',full?game.state.members.at(-1):undefined));
    } else if(!renInParty && game.state.members.includes('ren')) {
      assert.ok(game.changeParty('leave','ren'));
    }
    assert.equal(game.state.members.includes('ren'),renInParty);
    seeds.set(renInParty,game.save());
  }
  return seeds.get(renInParty);
}
export function farewellGame(content=data,{renInParty=false,legacy=false}={}) {
  const game = new GameEngine(content);
  game.load(farewellSeed(renInParty));game.random = () => .999999;
  if(legacy) {
    go(game,{kind:'town',location:'royal_board'});assert.ok(game.accept('q164'));
    const {map,x,y} = farewellLegacyQuest.locations.find(p=>p.role==='decision');
    go(game,{kind:'dungeon',dungeon:'region_7',map,x,y});
    game.run(farewellLegacyQuest.model.entryScript??'q164.visit');drain(game);
  } else start(game,'q164');
  return game;
}

export function farewellArtFixtures() {
  const fixtures = [], outcomes = new Set();
  for(const [generation,content] of [
    ['current',data],['previous',beforeFarewellData],['accepted-legacy',legacyFarewellData]
  ])for(const renInParty of [false,true]) {
    const legacy = generation === 'accepted-legacy';
    const game = farewellGame(content,{renInParty,legacy}), entry = game.save(), seen = new Set();
    for(const route of farewellRoutes.filter(r=>!renInParty || r.outcome!=='secret')) {
      game.load(entry);
      for(const action of legacy?route.legacy:route.choices) {
        const scene = legacy?game.state.flags.quest.q164.node:game.state.stories.q164.scene;
        if(!seen.has(scene)) {
          seen.add(scene);
          const dialog = projectGame(game).dialog, cast = legacy?[]:farewellCast(scene);
          const showRen = cast.includes('q164_ren');
          fixtures.push({
            edition:'e2',quest:'q164',scene,generation,renInParty,
            variant:generation+(renInParty?'-ren-in-party':'-ren-out-of-party'),
            cast,textOnlyCast:legacy?[]:['q164_guests'],
            portraitOnlyCast:showRen?['q164_ren']:[],
            ...(showRen?{imageExpectations:{q164_ren:renImage},faces:{q164_ren:renFace},clearOfHud:true}:{}),
            absentStoryScene:legacy,save:game.save(),members:[...game.state.members],
            expectedText:dialog.text,availableChoice:action,
            expectedOptions:dialog.options.map(({id,text,enabled})=>({id,text,enabled})),
            blockedChoices:dialog.options.filter(o=>!o.enabled).map(o=>o.id)
          });
        }
        if(legacy) {assert.ok(game.dispatch({type:'choose',id:action}));drain(game);}
        else choose(game,'q164',action);
      }
      assert.equal(game.state.quests.q164.outcome,route.outcome);
      outcomes.add('e2/q164/'+route.outcome);
    }
    assert.equal(seen.size,legacy?(renInParty?2:3):(renInParty?4:7));
  }
  // 11 current + 11 pre-cast + 5 accepted-legacy checkpoints.
  assert.equal(fixtures.length,27);
  return {fixtures,outcomes:[...outcomes]};
}
