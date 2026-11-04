import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {nextFormation} from '../src/core/battle-formation.js';
import {read} from '../tests/oddland-helpers.mjs';
import {data,ready,start,choose,go,drain} from '../tests/royal-helpers.mjs';

export const beforeTreatment = await read('tests/fixtures/e2-q161-before-cast.json');
const legacyQuest = data.previousQuestRoutes.q161;
function earlierData(quest) {
  const characters = {...data.characters};
  delete characters.q161_patient;delete characters.q161_ine;
  return {...data,characters,quests:{...data.quests,q161:quest},scripts:{...data.scripts,...quest.scripts}};
}
export const beforeTreatmentData = earlierData(beforeTreatment);
export const legacyTreatmentData = earlierData(legacyQuest);
export const treatmentRoutes = [
  {choices:['wait'],outcome:'wait',legacy:['wait']},
  {choices:['record','back','wait'],outcome:'wait',legacy:['wait']},
  ...[['wish'],['record','rent','record']].flatMap(prefix => [
    {choices:[...prefix,'wait'],outcome:'wait'},
    {choices:[...prefix,'clinic','finish'],outcome:'heal'},
    {choices:[...prefix,'sera','sera'],outcome:'heal'},
    {choices:[...prefix,'sera','clinic'],outcome:'heal'},
    ...(prefix[0] === 'record' ? [{choices:[...prefix,'recorded','finish'],outcome:'recorded'}] : [])
  ].map(route => ({...route,legacy:[prefix[0],route.choices[prefix.length]]})))
];
export function treatmentCast(scene) {
  return ['borrow','record_ready'].includes(scene) ? [] : scene === 'treat_clinic' ? ['q161_patient','q161_ine'] : ['q161_patient'];
}
export function seraStatus(game,status) {
  if(status === 'absent') {
    game.state.members = game.state.members.filter(id => id !== 'sera');
    game.state.partyFormation = nextFormation(game.state.members,game.state.partyFormation);
    if(game.state.partyFrontlineFormation)delete game.state.partyFrontlineFormation.sera;
  }
  if(status === 'incapacitated')game.state.actors.sera.hp = 0;
}
export function treatmentArtFixtures() {
  const fixtures = [], outcomes = new Set(), seed = ready().save();
  for(const [generation,content] of [['current',data],['previous',beforeTreatmentData],['accepted-legacy',legacyTreatmentData]]) {
    const legacy = content === legacyTreatmentData, game = new GameEngine(content);
    game.load(seed);game.random = () => .999999;
    if(legacy) {
      go(game,{kind:'town',location:'royal_board'});assert.ok(game.accept('q161'));
      const {map,x,y} = legacyQuest.locations.find(p => p.role === 'decision');
      go(game,{kind:'dungeon',dungeon:'region_7',map,x,y});
      game.run(legacyQuest.model.entryScript ?? 'q161.visit');drain(game);
    } else start(game,'q161');
    const entry = game.save(), seen = new Set();
    const capture = (action,suffix='') => {
      const story = game.state.stories.q161;
      const scene = legacy ? game.state.flags.quest.q161.node : story.scene;
      const recorded = legacy ? !!game.state.flags.quest.q161.recorded : story.values.recorded;
      const variant = `${generation}-${recorded ? 'recorded' : 'unrecorded'}${suffix}`;
      const key = scene+'/'+variant;if(seen.has(key))return;seen.add(key);
      const dialog = projectGame(game).dialog, cast = legacy ? [] : treatmentCast(scene);
      const faces = Object.fromEntries(cast.map(id => [id,id === 'q161_patient' ? [.45,.065,.51,.11] : [.49,.06,.55,.10]]));
      fixtures.push({edition:'e2',quest:'q161',scene,variant,cast,faces,clearOfHud:true,absentStoryScene:legacy,
        save:game.save(),expectedText:dialog.text,availableChoice:action,
        blockedChoices:dialog.options.filter(o => !o.enabled).map(o => o.id)});
    };
    for(const route of treatmentRoutes) {
      game.load(entry);
      for(const action of legacy ? route.legacy : route.choices) {
        capture(action);
        if(legacy){assert.ok(game.dispatch({type:'choose',id:action}));drain(game);}
        else choose(game,'q161',action);
      }
      assert.equal(game.state.quests.q161.outcome,route.outcome);
      outcomes.add('e2/q161/'+route.outcome);
    }
    // Ineligibility is checked both before leaving and again at the clinic.
    for(const prefix of [['wish'],['record','rent','record']])for(const status of ['absent','incapacitated']) {
      for(const atClinic of legacy ? [false] : [false,true]) {
        game.load(entry);
        for(const action of legacy ? [prefix[0]] : prefix) {
          if(legacy){assert.ok(game.dispatch({type:'choose',id:action}));drain(game);}
          else choose(game,'q161',action);
        }
        if(atClinic)choose(game,'q161','sera');
        seraStatus(game,status);capture('clinic','-'+status);
      }
    }
    if(!legacy){game.load(entry);choose(game,'q161','record');game.state.gold=19;capture('back','-short-of-gold');}
  }
  return {fixtures,outcomes:[...outcomes]};
}
