import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {data,newGame,drain} from './helpers.mjs';
import {prepareQuest,finishJourney} from './structure-routes.mjs';
import {projectGame} from '../src/application/projection.js';
import {restoreGame} from '../src/application/restore.js';
import {validateContent} from '../src/core/validation.js';
import {catalogContentHash,questCatalog,questPages} from '../tools/quest-catalog.mjs';
import {questPageBundle} from '../tools/quest-page.mjs';
import {describePlace,locationCatalog} from '../tools/location-catalog.mjs';

const move=(g,id)=>assert.ok(g.dispatch({type:'location.move',id}));
const choose=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}));drain(g);};
const state=g=>g.state.stories.q002;

test('town tree has real parent/child moves, local services and detached presentation',()=>{
 const g=newGame();assert.equal(g.state.townLocation,'hikarigaeri_square');
 const before=g.save();assert.equal(g.dispatch({type:'location.move',id:'hikarigaeri_medical_specimens'}),false);assert.equal(g.save(),before);
 move(g,'hikarigaeri_medical');move(g,'hikarigaeri_medical_specimens');
 let m=projectGame(g);assert.deepEqual(m.town.breadcrumbs.map(l=>l.id),['hikarigaeri_square','hikarigaeri_medical','hikarigaeri_medical_specimens']);
 m.town.links.push({id:'missing'});m.town.cast.length=0;assert.deepEqual(data.locations.hikarigaeri_medical_specimens.links,[]);
 g.load(g.save());assert.equal(g.state.townLocation,'hikarigaeri_medical_specimens');
 move(g,'hikarigaeri_medical');move(g,'hikarigaeri_square');move(g,'hikarigaeri_shop');assert.ok(projectGame(g).town.shop);
 move(g,'hikarigaeri_square');move(g,'hikarigaeri_tavern');assert.ok(projectGame(g).town.party);
 const gold=g.state.gold;g.state.actors.ada.hp=1;assert.ok(g.dispatch({type:'service',id:'inn'}));
 assert.equal(g.dispatch({type:'location.move',id:'hikarigaeri_square'}),false);drain(g);
 assert.equal(g.state.gold,gold-24);assert.equal(g.state.actors.ada.hp,g.stats('ada').hp);
});

test('q002 departure persists without school knowledge; only actual arrival commits the inquiry',()=>{
 const g=prepareQuest('q002');choose(g,'school');
 assert.equal(g.state.waiting,null);assert.equal(state(g).scene,null);assert.equal(state(g).values.partyAt,'transit');
 assert.equal(state(g).knowledge.party.includes('number'),true);assert.equal(state(g).knowledge.party.includes('loan'),false);
 const before=structuredClone(state(g));assert.equal(g.dispatch({type:'journey.arrive'}),false);assert.deepEqual(state(g),before);
 const saved=g.save();g.load(saved);assert.equal(g.save(),saved);
 g.dispatch({type:'retreat'});move(g,'hikarigaeri_medical');assert.equal(projectGame(g).journey.atDestination,false);
 move(g,'hikarigaeri_medical_specimens');assert.equal(projectGame(g).journey,null);assert.equal(g.state.waiting.type,'text');
 drain(g);assert.equal(g.state.journey,null);assert.equal(state(g).values.partyAt,'school');assert.ok(state(g).knowledge.party.includes('loan'));
 assert.equal(g.dispatch({type:'journey.arrive'}),false);g.load(g.save());
 const ids=projectGame(g).town.cast.map(c=>c.id);assert.ok(ids.includes('curator'));assert.ok(ids.includes('porter'));
});

test('pausing at school follows real party movement while the porter waits; resume requires the room',()=>{
 const g=prepareQuest('q002');choose(g,'school');finishJourney(g);choose(g,'pause');
 move(g,'hikarigaeri_medical');assert.equal(state(g).values.partyAt,'transit');assert.equal(state(g).values.porterAt,'school');
 assert.equal(g.dispatch({type:'story.resume',quest:'q002'}),false);g.load(g.save());
 move(g,'hikarigaeri_medical_specimens');assert.equal(state(g).values.partyAt,'school');
 assert.ok(g.dispatch({type:'story.resume',quest:'q002'}));drain(g);assert.equal(state(g).scene,'school');
});

test('returning to the waterway needs actual steps; items and witness follow the declared journey',()=>{
 const g=prepareQuest('q002');choose(g,'school');finishJourney(g);choose(g,'recover');
 assert.equal(state(g).values.porterAt,'transit');assert.equal(state(g).values.boxAt,'water');
 g.load(g.save());const steps=g.state.steps;finishJourney(g);assert.ok(g.state.steps>steps);
 assert.equal(g.state.location.map,data.quests.q002.story.worldPlaces.landing.map);assert.equal(state(g).scene,'recovery');
 choose(g,'lift');choose(g,'return');assert.equal(state(g).values.boxAt,'party');assert.equal(state(g).values.returned,false);
 finishJourney(g);assert.equal(state(g).values.boxAt,'curator');choose(g,'consent');
 assert.equal(state(g).values.tagsAt,'party');assert.equal(state(g).values.ledgerAt,'party');assert.equal(state(g).values.porterAt,'transit');
 assert.equal(state(g).knowledge.party.includes('fraud'),false);g.load(g.save());finishJourney(g);
 assert.equal(g.state.townLocation,'hikarigaeri_insurance');choose(g,'file');assert.equal(g.state.quests.q002.outcome,'informed');
 assert.equal(state(g).values.boxAt,'curator');assert.equal(state(g).values.tagsAt,'examiner');g.load(g.save());
});

test('invalid world saves restart, current journeys resume, and old versions are not migrated',()=>{
 const g=prepareQuest('q002');choose(g,'school');const good=g.save();assert.equal(restoreGame(data,good).restarted,false);
 for(const change of [s=>s.state.journey.action='missing',s=>s.state.journey.from='hearing',s=>s.state.journey=null,s=>s.state.stories.q002.values.partyAt='school',s=>s.state.townLocation='missing',s=>s.contentVersion='1.9.0']){
  const bad=JSON.parse(good);change(bad);const result=restoreGame(data,JSON.stringify(bad));assert.ok(result.restarted);assert.equal(result.engine.state.townLocation,'hikarigaeri_square');assert.equal(result.engine.state.journey,null);assert.equal(result.engine.state.quests.q002.stage,'available');
 }
 const h=newGame();h.accept('q002');h.run(data.quests.q002.model.entryScript);drain(h);assert.equal(h.state.stories.q002,undefined);h.load(h.save());
});

test('world validation rejects missing IDs, wrong ownership, cycles, impossible cells and misplaced events',()=>{
 for(const change of [
  d=>d.locations.hikarigaeri_medical.parent='hikarigaeri_medical_specimens',
  d=>d.locations.hikarigaeri_shop.links.push('missing'),
  d=>d.locations.hikarigaeri_shop.background='missing',
  d=>d.maps.region_1_f1.dungeon='region_2',
  d=>d.quests.q002.story.worldPlaces.school.location='missing',
  d=>d.quests.q002.story.worldPlaces.landing.dungeon='missing',
  d=>d.quests.q002.story.worldPlaces.landing.map='region_2_f1',
  d=>d.quests.q002.story.worldPlaces.landing.x=999,
  d=>Object.assign(d.quests.q002.story.worldPlaces.landing,{x:0,y:0}),
  d=>d.quests.q002.story.worldPlaces.landing.event='missing',
  d=>d.quests.q002.events[0].points[0].dungeon='region_2',
  d=>d.quests.q002.events[0].points[0].x=999
 ]){const bad=structuredClone(data);change(bad);assert.ok(validateContent(bad).length);}
});

test('catalogs contain every real event placement, scene facility and journey destination',()=>{
 const catalog=questCatalog(data,'2026-09-16');
 for(const q of Object.values(data.quests)){
  const source=questPages[q.id]?questPageBundle(data,q.id)[questPages[q.id]]:catalog;
  for(const e of q.events)for(const p of e.points)assert.ok(source.includes(describePlace(data,{kind:'dungeon',...p,event:e.id})));
 }
 const q002=questPageBundle(data,'q002')[questPages.q002];
 for(const id of ['hikarigaeri_medical_specimens','hikarigaeri_insurance'])assert.ok(q002.includes(id));
 assert.ok(q002.includes('出発: `school_recover`'));assert.ok(locationCatalog(data).includes('q002「骨の荷札」 / hearing'));
 for(const change of [d=>d.locations.hikarigaeri_shop.name='変更',d=>d.maps.region_1_f1.name='変更',d=>d.quests.q002.events[0].points[0].x++]){const bad=structuredClone(data);change(bad);assert.notEqual(catalogContentHash(bad),catalogContentHash(data));}
});

test('all seven backgrounds and three sprites match the published provenance manifest',async()=>{
 const manifest=JSON.parse(await fs.readFile(new URL('../assets/source/world-locations/manifest.json',import.meta.url),'utf8'));
 assert.equal(manifest.entries.filter(e=>e.kind==='background').length,7);assert.equal(manifest.entries.filter(e=>e.kind==='sprite').length,3);
 for(const e of manifest.entries){const bytes=await fs.readFile(new URL('../'+e.file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),e.sha256);assert.ok(e.promptEnglish&&e.promptJapanese);if(e.kind==='sprite')assert.ok(e.alpha);}
});
