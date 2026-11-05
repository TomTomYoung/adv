import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,go,choose,drain} from '../tests/royal-helpers.mjs';

export const beforeAid = await read('tests/fixtures/e2-q165-before-cast.json');
const art = await read('assets/source/characters/sunken-q165-2026-11-05.json');
const linaArt = art.files.find(f=>f.id==='q165_lina');
assert.ok(linaArt,'q165 Lina art metadata');
const linaImage = {src:linaArt.output,size:[linaArt.width,linaArt.height]};
const linaFace = linaArt.visualInspection.faceCentralNormalizedBounds;
// Reuse Il's existing upper-body portrait and inspect its central face region.
const ilImage = {src:'assets/images/portraits/il.webp',size:[1254,1254]};
const ilFace = [.50,.23,.65,.36];

export const aidLegacyQuest = data.previousQuestRoutes.q165;
function earlierData(quest) {
  const characters = {...data.characters};
  delete characters.q165_lina;delete characters.q165_il;
  return {...data,characters,quests:{...data.quests,q165:quest},scripts:{...data.scripts,...quest.scripts}};
}
export const beforeAidData = earlierData(beforeAid);
export const legacyAidData = earlierData(aidLegacyQuest);
export const aidRoutes = [
  {choices:['private','secret','receive','finish'],legacy:['private','secret'],outcome:'secret'},
  {choices:['private','ask','public','agree','finish'],legacy:['private','ask','agree'],outcome:'open'},
  {choices:['private','ask','public','decline'],legacy:['private','ask','decline'],outcome:'decline'},
  {choices:['private','decline'],legacy:['private','decline'],outcome:'decline'},
  {choices:['open','agree','finish'],legacy:['open','agree'],outcome:'open'},
  {choices:['open','decline'],legacy:['open','decline'],outcome:'decline'},
  {choices:['decline'],legacy:['decline'],outcome:'decline'}
];
const sceneCast = {
  entry:['q165_lina'],
  private:['q165_lina'],
  public:['q165_lina','q165_il'],
  ask_il:['q165_lina','q165_il'],
  secret_supply:['q165_lina'],
  secret_report:['q165_lina','q165_il'],
  open_supply:['q165_lina','q165_il']
};
export function aidCast(scene) {
  assert.ok(Object.hasOwn(sceneCast,scene),'known q165 scene: '+scene);
  return [...sceneCast[scene]];
}

const seeds = new Map();
export function aidSeed(ilInParty=false) {
  if(!seeds.has(ilInParty)) {
    const game = ready();
    if(ilInParty && !game.state.members.includes('il')) {
      const full = game.state.members.length >= data.system.maxParty;
      assert.ok(game.changeParty(full?'swap':'join','il',full?game.state.members.at(-1):undefined));
    } else if(!ilInParty && game.state.members.includes('il')) {
      assert.ok(game.changeParty('leave','il'));
    }
    assert.equal(game.state.members.includes('il'),ilInParty);
    seeds.set(ilInParty,game.save());
  }
  return seeds.get(ilInParty);
}
export function aidGame(content=data,{ilInParty=false,legacy=false}={}) {
  const game = new GameEngine(content);
  game.load(aidSeed(ilInParty));game.random = () => .999999;
  if(legacy) {
    go(game,{kind:'town',location:'royal_board'});assert.ok(game.accept('q165'));
    const {map,x,y} = aidLegacyQuest.locations.find(p=>p.role==='decision');
    go(game,{kind:'dungeon',dungeon:'region_7',map,x,y});
    game.run(aidLegacyQuest.model.entryScript??'q165.visit');drain(game);
  } else start(game,'q165');
  return game;
}

export function aidArtFixtures() {
  const fixtures = [], outcomes = new Set();
  for(const [generation,content] of [
    ['current',data],['previous',beforeAidData],['accepted-legacy',legacyAidData]
  ])for(const ilInParty of [false,true]) {
    const legacy = generation === 'accepted-legacy';
    const game = aidGame(content,{ilInParty,legacy}), entry = game.save(), seen = new Set();
    for(const route of aidRoutes.filter(r=>!ilInParty || r.choices[0]!=='private')) {
      game.load(entry);
      for(const action of legacy?route.legacy:route.choices) {
        const scene = legacy?game.state.flags.quest.q165.node:game.state.stories.q165.scene;
        if(!seen.has(scene)) {
          seen.add(scene);
          const dialog = projectGame(game).dialog, cast = legacy?[]:aidCast(scene);
          const showIl = cast.includes('q165_il');
          fixtures.push({
            edition:'e2',quest:'q165',scene,generation,ilInParty,
            variant:generation+(ilInParty?'-il-in-party':'-il-out-of-party'),
            cast,portraitOnlyCast:showIl?['q165_il']:[],
            ...(legacy?{}:{imageExpectations:{q165_lina:linaImage,...(showIl?{q165_il:ilImage}:{})},
              faces:{q165_lina:linaFace,...(showIl?{q165_il:ilFace}:{})},clearOfHud:true}),
            absentStoryScene:legacy,save:game.save(),members:[...game.state.members],
            expectedText:dialog.text,availableChoice:action,
            expectedOptions:dialog.options.map(({id,text,enabled})=>({id,text,enabled})),
            blockedChoices:dialog.options.filter(o=>!o.enabled).map(o=>o.id)
          });
        }
        if(legacy) {assert.ok(game.dispatch({type:'choose',id:action}));drain(game);}
        else choose(game,'q165',action);
      }
      assert.equal(game.state.quests.q165.outcome,route.outcome);
      outcomes.add('e2/q165/'+route.outcome);
    }
    assert.equal(seen.size,legacy?(ilInParty?2:3):(ilInParty?3:7));
  }
  // 10 current + 10 pre-cast + 5 accepted-legacy checkpoints, each in four viewport/layout pairs.
  assert.equal(fixtures.length,25);
  return {fixtures,outcomes:[...outcomes]};
}
