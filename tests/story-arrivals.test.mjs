import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain} from './helpers.mjs';
import {prepareQuest,finishJourney} from './structure-routes.mjs';
import {GameEngine} from '../src/core/engine.js';
import {encounterStoryJourney,resumeWorldStory} from '../src/core/story.js';
import {processFieldEvents} from '../src/core/field-events.js';
import {validateWorld,worldStoryPlace} from '../src/core/world.js';
import {validateSave} from '../src/core/save.js';
import {nextQuestPlace,nextQuestPlaces} from '../src/core/quest-navigation.js';

const choose=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}));drain(g);};
const roundtrip=g=>{const saved=g.save();assert.deepEqual(validateSave(JSON.parse(saved),g.data),[]);g.load(saved);assert.equal(g.save(),saved);};
const alternate={map:'region_1_landing',x:4,y:1};

// Use a different quest and encounter to exercise the shared arrival mechanism.
function returning(){
  const source=prepareQuest('q002'),g=new GameEngine(structuredClone(data));g.load(source.save());g.random=()=>.999999;
  choose(g,'school');finishJourney(g);choose(g,'recover');
  g.data.quests.q002.story.actions.school_recover.journey.arrival={points:[alternate],encounters:['wild_pair_1']};
  return g;
}
function arrived(){
  const g=returning();g.teleport(alternate.map,3,1,'east');
  assert.ok(g.dispatch({type:'move',direction:'forward'}));drain(g);
  assert.equal(g.state.stories.q002.scene,'recovery');assert.equal(g.state.journey,null);return g;
}

test('another quest arrives at an alternate cell with its companion, resumes there, and exposes detached guidance',()=>{
  const g=arrived(),story=g.state.stories.q002;
  assert.equal(story.values.partyAt,'landing');assert.equal(story.values.porterAt,'landing');
  assert.equal(story.values.boxAt,'water');assert.equal(g.state.location.x,4);roundtrip(g);
  const before=g.save(),places=nextQuestPlaces(g.data,g.state,'q002');
  assert.equal(places.length,1);assert.equal(places[0].x,4);places[0].x=999;
  assert.equal(nextQuestPlace(g.data,g.state,'q002').x,4);assert.equal(g.save(),before);
  g.defeat();assert.equal(nextQuestPlace(g.data,g.state,'q002').x,4);roundtrip(g);
  g.teleport(alternate.map,3,1,'east');assert.equal(resumeWorldStory(g,'q002'),false);
  assert.ok(g.dispatch({type:'move',direction:'forward'}));drain(g);
  assert.equal(g.state.waiting.type,'choice');assert.equal(g.state.stories.q002.scene,'recovery');roundtrip(g);
});

test('another quest intercepts only its declared encounter inside the destination dungeon',()=>{
  const g=returning();g.teleport(alternate.map,6,1,'east');
  let before=g.save();assert.equal(encounterStoryJourney(g,'kuragari_hunt'),false);assert.equal(g.save(),before);
  g.teleport('kagaribi_f1',13,1,'west');before=g.save();
  assert.equal(encounterStoryJourney(g,'wild_pair_1'),false);assert.equal(g.save(),before);
  g.teleport(alternate.map,6,1,'east');const location=structuredClone(g.state.location);
  assert.equal(encounterStoryJourney(g,'wild_pair_1'),true);drain(g);
  assert.deepEqual(g.state.location,location);assert.equal(g.state.stories.q002.scene,'recovery');
  assert.equal(g.state.battle,null);assert.equal(nextQuestPlace(g.data,g.state,'q002').x,6);roundtrip(g);
  before=g.save();assert.equal(encounterStoryJourney(g,'wild_pair_1'),false);assert.equal(g.save(),before);
});

test('a bound active scene owns a cell shared with an earlier named place',()=>{
  const g=returning(),definition=g.data.quests.q002.story;
  const {water,landing,school,office}=definition.worldPlaces;
  definition.worldPlaces={water:{kind:water.kind,dungeon:water.dungeon,...alternate},landing,school,office};
  g.teleport(alternate.map,3,1,'east');assert.ok(g.dispatch({type:'move',direction:'forward'}));drain(g);
  assert.equal(worldStoryPlace(g.state,definition,g.state.stories.q002),'landing');roundtrip(g);
  choose(g,'lift');assert.equal(g.state.stories.q002.scene,'recovered');roundtrip(g);
});

test('a bound scene with no waiting command runs once per entry, including explicit resume',()=>{
  const g=returning(),q=g.data.quests.q002,unit=q.model.narrative.units.find(n=>n.id==='recovery');
  g.data.scripts[unit.script].commands=[{op:'story.scene',quest:'q002',scene:'recovery'},{op:'add',target:'vars.arrivalVisits',value:1}];
  g.teleport(alternate.map,3,1,'east');assert.ok(g.dispatch({type:'move',direction:'forward'}));
  assert.equal(g.state.waiting,null);assert.equal(g.state.vars.arrivalVisits,1);processFieldEvents(g);
  assert.equal(g.state.vars.arrivalVisits,1);roundtrip(g);processFieldEvents(g);assert.equal(g.state.vars.arrivalVisits,1);
  g.teleport(alternate.map,4,1,'east');assert.equal(resumeWorldStory(g,'q002'),true);processFieldEvents(g);
  assert.equal(g.state.vars.arrivalVisits,2);roundtrip(g);
});

test('invalid alternate arrival definitions are rejected without changing other world rules',()=>{
  assert.deepEqual(validateWorld(data),[]);
  const point={map:'kagaribi_f1',x:13,y:5,event:'q001_return_south'};
  const rules=[null,{},[],{points:[]},{points:[],encounters:['kuragari_hunt']},{points:[point],encounters:[]},
    {points:[point,point]},{points:[{map:'kagaribi_f1',x:9,y:1}]},{points:[{...point,x:0}]},
    {points:[{...point,map:'region_2_f1'}]},{points:[{...point,event:'missing'}]},
    {points:[{...point,kind:'dungeon'}]},{points:[{...point,z:null}]},{encounters:['missing']},{encounters:['kuragari_hunt','kuragari_hunt']},
    {encounters:['kuragari_hunt'],unknown:true}];
  for(const rule of rules){
    const d=structuredClone(data);d.quests.q001.story.actions.old_support.journey.arrival=rule;
    assert.ok(validateWorld(d).some(error=>error.includes('old_support')),JSON.stringify(rule));
  }
  const d=structuredClone(data);d.quests.q002.story.actions.entry_school.journey.arrival={encounters:['wild_pair_1']};
  assert.ok(validateWorld(d).some(error=>error.includes('entry_school')),'town destinations cannot bind dungeon encounters');
});

test('arrival bindings and their consumed entry IDs reject tampering atomically',()=>{
  const g=arrived(),saved=g.save();
  const changes=[
    s=>s.stories.q002.arrivals=null,
    s=>s.stories.q002.arrivals.landing.action='missing',
    s=>s.stories.q002.arrivals.landing.action='entry_school',
    s=>s.stories.q002.events=s.stories.q002.events.filter(id=>id!=='school_recover'),
    s=>s.stories.q002.arrivals.landing.point.x=8,
    s=>s.stories.q002.arrivals.landing.point.z=1,
    s=>s.stories.q002.arrivals.landing.point.z=null,
    s=>s.stories.q002.arrivals.landing.point.event='q002_decision',
    s=>s.stories.q002.arrivals.landing.encounter='kuragari_hunt',
    s=>{s.stories.q002.arrivals.landing.encounter='wild_pair_1';s.stories.q002.arrivals.landing.point.map='region_2_f1';},
    s=>s.stories.q002.arrivals.office=structuredClone(s.stories.q002.arrivals.landing),
    s=>s.stories.q002.arrivals.landing.extra=true,
    s=>s.fieldEntry.fired.push('story-arrival/q002/office'),
    s=>{s.location.x=3;s.location.facing='east';s.stories.q002.values.partyAt='landing';}
  ];
  for(const change of changes){
    const bad=JSON.parse(saved);change(bad.state);
    assert.ok(validateSave(bad,g.data).length);
    assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),saved);
  }
});
