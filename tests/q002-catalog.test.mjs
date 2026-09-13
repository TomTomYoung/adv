import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain,fight} from './helpers.mjs';
import {prepareQuest} from './structure-routes.mjs';
import {storyPlace} from '../src/core/story.js';

const approaches=[['lift','school'],['tags','inspect'],['school']];
const choose=(g,...ids)=>{for(const id of ids){assert.ok(g.dispatch({type:'choose',id}),id);drain(g);if(g.state.battle)fight(g);}};
const state=g=>g.state.stories.q002;

test('q002 all approaches deliver the actual tags and testimony while specimens stay at medical school',()=>{
 for(const approach of approaches){
  const g=prepareQuest('q002');choose(g,...approach,'recover');
  assert.equal(state(g).values.bonesAt,'box');assert.equal(state(g).values.boxAt,'curator');assert.equal(state(g).values.tagsAt,'curator');
  assert.equal(state(g).values.witnessConsent,false);assert.equal(state(g).knowledge.party.includes('fraud'),false);
  choose(g,'consent');g.load(g.save());
  assert.equal(state(g).values.tagsAt,'party');assert.equal(state(g).values.ledgerAt,'party');assert.equal(state(g).values.porterAt,'office');
  choose(g,'file');
  const s=state(g);assert.equal(g.state.quests.q002.outcome,'informed');assert.equal(s.values.tagsAt,'examiner');assert.equal(s.values.ledgerAt,'examiner');
  assert.equal(storyPlace(data.quests.q002.story,s,'bones'),'school');
  for(const fact of ['number','loan','alteredTag','missingReport','claim','testimony','fraud'])assert.ok(s.knowledge.party.includes(fact),fact);
  assert.equal(g.state.journal.at(-1).text,data.quests.q002.outcomes.informed.text);g.load(g.save());
 }
});

test('q002 returning specimens does not establish the connection to a missing person or an insurance claim',()=>{
 for(const approach of approaches){
  const g=prepareQuest('q002');choose(g,...approach,'recover','finish');
  assert.equal(g.state.quests.q002.outcome,'compromise');
  const s=state(g);assert.equal(s.values.tagsAt,'curator');assert.equal(s.values.boxAt,'curator');assert.equal(s.values.witnessConsent,false);assert.equal(s.values.fraudChecked,false);
  for(const fact of ['missingReport','claim','testimony','fraud'])assert.equal(s.knowledge.party.includes(fact),false,fact);
  g.load(g.save());
 }
});

test('q002 incomplete evidence or withdrawn consent cannot complete the hearing or award rewards',()=>{
 const cases=[
  s=>s.values.witnessConsent=false,
  s=>s.knowledge.party=s.knowledge.party.filter(k=>k!=='number'),
  s=>s.knowledge.party=s.knowledge.party.filter(k=>k!=='loan'),
  s=>s.values.tagsAt='belt',
  s=>s.values.ledgerAt='curator'
 ];
 for(const change of cases){
  const g=prepareQuest('q002');choose(g,'school','recover','consent');change(state(g));
  const before=g.save();assert.equal(g.dispatch({type:'choose',id:'file'}),false);assert.equal(g.save(),before);
  assert.throws(()=>g.complete('q002','informed'));assert.equal(g.save(),before);
 }
});

test('q002 hearings saved before tags were carried can retrieve them from either former school holder',()=>{
 for(const holder of ['box','curator']){
  const g=prepareQuest('q002');choose(g,'school','recover','consent');
  // These are the two tag locations produced by the previously shipped v1.1 routes.
  state(g).values.tagsAt=holder;g.load(g.save());
  choose(g,'file');assert.equal(g.state.quests.q002.outcome,'informed');
  assert.equal(state(g).values.tagsAt,'examiner');assert.equal(state(g).values.porterAt,'office');assert.equal(state(g).values.partyAt,'office');
  assert.equal(storyPlace(data.quests.q002.story,state(g),'bones'),'school');g.load(g.save());
 }
});

test('q002 tag-only deliveries leave the original box at the shallows on both routes',()=>{
 for(const route of [['lift','tags'],['tags','deliver']]){
  const g=prepareQuest('q002');choose(g,...route);
  assert.equal(g.state.quests.q002.outcome,'contract');assert.equal(state(g).values.tagsAt,'belt');assert.equal(state(g).values.boxAt,'water');
  assert.equal(storyPlace(data.quests.q002.story,state(g),'bones'),'water');assert.equal(state(g).values.fraudChecked,false);
  g.load(g.save());
 }
});
