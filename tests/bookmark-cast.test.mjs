import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './library-helpers.mjs';
import {previousQ049,q049Routes,q049AcceptedRoutes,q049Engine,q049AcceptedEngine,loadQ049,chooseQ049,bookmarkArtFixtures} from '../tools/bookmark-art-fixtures.mjs';
const values=g=>g.state.stories.q049.values;
const depart=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.ok(g.state.journey);loadQ049(g.save());};
const arrive=(g,place)=>{go(g,data.quests.q049.story.worldPlaces[place]);drain(g);checkpoint(g);};

test('q049 adds only the existing explorer link and six casts without changing saved values or story revision',()=>{
 const q=structuredClone(data.quests.q049);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 assert.equal(q.story.entities.luu.kind,'person');assert.equal(q.story.entities.luu.character,'q049_luu');assert.equal(data.characters.q049_luu.name,'探検家ルウ');
 for(const key of ['portrait','sprite'])assert.equal(data.characters.q049_luu[key],undefined);
 assert.equal(Object.keys(q.story.scenes).length,6);for(const s of Object.values(q.story.scenes)){assert.deepEqual(s.cast,[{entity:'luu',display:{x:50}}]);s.cast=[];}
 delete q.story.entities.luu.character;assert.deepEqual(q,previousQ049);
});

test('q049 all six scenes, five journeys and ten actions resume identically from current and pre-cast saves',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{
  const raw=g.save(),now=loadQ049(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(g.save(),raw);assert.equal(now.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  const s=now.state.stories.q049;phases.add(now.state.journey?'journey':now.state.quests.q049.stage==='completed'?'completed':now.state.waiting?.type);if(s.scene)scenes.add(s.scene);
  if(after?.scene){assert.deepEqual(after.scene.cast.map(c=>c.id),['q049_luu']);assert.equal(s.values.luuAt,data.quests.q049.story.scenes[s.scene].place);}
  if(now.state.journey){const id=now.state.journey.action,a=data.quests.q049.story.actions[id];journeys.add(id);assert.equal(s.scene,null);assert.equal(after?.scene,undefined);assert.equal(s.values.luuAt,'transit');assert.deepEqual(a.journey.companions,['luu']);assert.equal(now.dispatch({type:'story.resume',quest:'q049'}),false);}
 };
 for(const legacy of [false,true])for(const route of q049Routes){const g=q049Engine({legacy});observe(g);for(const id of route.path){
  actions.add(g.state.stories.q049.scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);
  if(g.state.journey){const a=g.data.quests.q049.story.actions[g.state.journey.action];go(g,g.data.quests.q049.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}
 }assert.equal(g.state.quests.q049.outcome,route.outcome);}
 assert.equal(scenes.size,6);assert.equal(journeys.size,5);assert.equal(actions.size,10);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q049.story.actions).sort());for(const p of ['text','choice','journey','completed'])assert.ok(phases.has(p),p);
});

test('q049 all three map-only routes leave the document and deliver only the carried copy at finish',()=>{
 for(const legacy of [false,true])for(const prefix of [[],['remove'],['remove','split']]){
  const g=loadQ049(q049Engine({legacy}).save());for(const id of prefix)chooseQ049(g,id);const gold=g.state.gold,separate=prefix.includes('split'),knowledge=structuredClone(g.state.stories.q049.knowledge);
  depart(g,prefix.length===0?'map':separate?'undo':'leave');assert.equal(values(g).documentAt,'entry');assert.equal(values(g).mapCopyAt,'map');assert.equal(values(g).luuAt,'transit');arrive(g,'map');assert.equal(values(g).luuAt,'map');assert.equal(values(g).separateMap,separate);
  depart(g,'return');assert.equal(values(g).mapCopyAt,'party');assert.equal(values(g).documentAt,'entry');assert.equal(values(g).finished,false);arrive(g,'registry');assert.equal(values(g).mapCopyAt,'party');assert.equal(values(g).luuAt,'registry');assert.equal(values(g).resolution,'pending');assert.equal(g.state.gold,gold);loadQ049(g.save());
  chooseQ049(g,'finish');assert.equal(values(g).mapCopyAt,'registry');assert.equal(values(g).documentAt,'entry');assert.equal(values(g).reported,false);assert.equal(values(g).resolution,'compromise');assert.equal(g.state.gold,gold+68);assert.deepEqual(g.state.stories.q049.knowledge,knowledge);loadQ049(g.save());
 }
});

test('q049 separating the route, carrying the document, arriving and reporting remain distinct commits',()=>{
 for(const legacy of [false,true]){
  const g=loadQ049(q049Engine({legacy}).save());chooseQ049(g,'remove');assert.deepEqual(g.state.stories.q049.knowledge.party,['truth']);assert.equal(values(g).separateMap,false);chooseQ049(g,'split');assert.equal(values(g).separateMap,true);assert.equal(values(g).documentAt,'entry');assert.equal(values(g).mapCopyAt,'map');assert.equal(values(g).reported,false);
  const gold=g.state.gold;depart(g,'return');assert.equal(values(g).documentAt,'party');assert.equal(values(g).luuAt,'transit');assert.equal(values(g).reported,false);assert.equal(g.state.stories.q049.events.includes('test_return'),false);
  go(g,{kind:'town',location:'e2_academy'});drain(g);loadQ049(g.save());assert.ok(g.state.journey);assert.equal(values(g).documentAt,'party');assert.equal(values(g).luuAt,'transit');assert.equal(g.dispatch({type:'story.resume',quest:'q049'}),false);
  arrive(g,'registry');assert.equal(values(g).documentAt,'party');assert.equal(values(g).luuAt,'registry');assert.equal(values(g).reported,false);assert.equal(values(g).finished,false);assert.equal(g.state.gold,gold);assert.equal(g.state.stories.q049.events.includes('test_return'),true);
  chooseQ049(g,'finish');assert.equal(values(g).documentAt,'registry');assert.equal(values(g).mapCopyAt,'map');assert.equal(values(g).reported,true);assert.equal(values(g).burned,false);assert.equal(g.state.gold,gold+105);assert.deepEqual(g.state.stories.q049.knowledge.party,['truth']);loadQ049(g.save());
 }
});

test('q049 return marks and defeat rescue preserve unfinished travel, companions and carried items until real arrival',()=>{
 for(const legacy of [false,true])for(const kind of ['mark','defeat'])for(const prefix of [[],['map'],['remove','split']]){
  const g=loadQ049(q049Engine({legacy}).save());for(const id of prefix)chooseQ049(g,id);depart(g,prefix.length?'return':'map');const story=structuredClone(g.state.stories.q049),journey=structuredClone(g.state.journey),to=data.quests.q049.story.actions[journey.action].journey.to;
  if(kind==='mark')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);assert.equal(g.state.mode,'town');assert.deepEqual(g.state.journey,journey);assert.deepEqual(g.state.stories.q049,story);assert.equal(g.state.quests.q049.stage,'active');loadQ049(g.save());assert.equal(g.dispatch({type:'story.resume',quest:'q049'}),false);
  arrive(g,to);assert.equal(g.state.journey,null);assert.equal(values(g).luuAt,to);assert.equal(values(g).finished,false);assert.equal(values(g).documentAt,story.values.documentAt);assert.equal(values(g).mapCopyAt,story.values.mapCopyAt);loadQ049(g.save());
 }
});

test('q049 burning the bookmark changes only the local resolution and does not invent a guardian battle or erase learned skills',()=>{
 for(const legacy of [false,true]){const g=loadQ049(q049Engine({legacy}).save()),battles=g.state.records.battles,skills=g.state.members.map(id=>g.skills(id)),knowledge=structuredClone(g.state.stories.q049.knowledge);chooseQ049(g,'burn');const v=values(g);assert.equal(v.burned,true);assert.equal(v.separateMap,false);assert.equal(v.reported,false);assert.equal(v.luuAt,'entry');assert.equal(v.documentAt,'entry');assert.equal(v.mapCopyAt,'map');assert.equal(g.state.records.battles,battles);assert.deepEqual(g.state.members.map(id=>g.skills(id)),skills);assert.deepEqual(g.state.stories.q049.knowledge,knowledge);assert.deepEqual(Object.keys(g.data.quests.q049.story.entities).sort(),['document','luu','mapCopy','party']);loadQ049(g.save());}
});

test('q049 all five routes preserve three one-time rewards and do not add party members or inventory items',()=>{
 const rewards={contract:[125,75],compromise:[68,75],informed:[105,100]};
 for(const legacy of [false,true])for(const route of q049Routes){
  const g=loadQ049(q049Engine({legacy}).save()),gold=g.state.gold,inventory=structuredClone(g.state.inventory),members=[...g.state.members],battles=g.state.records.battles;let count=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],rewards[route.outcome]);count++;return award(gp,xp,who);};
  for(const id of route.path){assert.equal(count,0);chooseQ049(g,id);}assert.equal(g.state.quests.q049.outcome,route.outcome);assert.equal(count,1);assert.equal(g.state.gold,gold+rewards[route.outcome][0]);assert.deepEqual(g.state.inventory,inventory);assert.deepEqual(g.state.members,members);assert.equal(g.state.records.battles,battles);
  const raw=g.save();assert.throws(()=>g.complete('q049',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q049.model.entryScript);drain(g);assert.equal(count,1);loadQ049(g.save());
 }
});

test('q049 pre-relocation accepted saves retain three original scenes and all five direct ending routes',()=>{
 const scenes=new Set();for(const route of q049AcceptedRoutes){const g=loadQ049(q049AcceptedEngine().save());let count=0;const award=g.award.bind(g);g.award=(gold,xp,who)=>{const o=data.previousQuestRoutes.q049.outcomes[route.outcome];assert.deepEqual([gold,xp],[o.gold,o.xp]);count++;return award(gold,xp,who);};
  for(const id of route.path){scenes.add(g.state.flags.flow.q049.node);loadQ049(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ049(g.save());drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q049,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);checkpoint(g);}
  assert.equal(g.state.quests.q049.outcome,route.outcome);assert.equal(count,1);loadQ049(g.save());
 }assert.deepEqual([...scenes].sort(),['entry','scope','test']);
});

test('q049 rejects invalid holders, flag types, revision and mixed legacy state atomically',()=>{
 const g=q049Engine(),raw=g.save();for(const mutate of [s=>s.stories.q049.values.luuAt='missing',s=>s.stories.q049.values.documentAt='missing',s=>s.stories.q049.values.mapCopyAt='missing',s=>s.stories.q049.values.separateMap='true',s=>s.stories.q049.values.reported=1,s=>s.stories.q049.revision=2,s=>(s.flags.legacyStoryRoutes??={}).q049=true]){const saved=JSON.parse(raw);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
 depart(g,'map');const travel=g.save(),saved=JSON.parse(travel);saved.state.stories.q049.values.luuAt='entry';assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),travel);
});

test('q049 browser fixtures include three map origins and both deliveries across current, pre-cast and accepted saves',async()=>{
 const {fixtures,outcomes}=await bookmarkArtFixtures();assert.equal(fixtures.length,23);assert.equal(outcomes.length,3);for(const prefix of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(prefix));assert.equal(rows.length,10);for(const scene of ['map','returned'])for(const origin of ['direct','revealed','separated'])assert.ok(rows.some(f=>f.scene===scene&&f.variant===prefix+'-'+origin));for(const f of rows)assert.deepEqual(f.cast,['q049_luu']);}assert.equal(fixtures.filter(f=>f.absentStoryScene).length,3);
});
