import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,checkpoint} from './library-helpers.mjs';
import {previousQ050,q050Routes,q050AcceptedRoutes,q050LibrarianPlace,q050Cast,q050Engine,q050AcceptedEngine,loadQ050,chooseQ050,finalChapterArtFixtures} from '../tools/final-chapter-art-fixtures.mjs';
const story=g=>g.state.stories.q050,values=g=>story(g).values,places=data.quests.q050.story.worldPlaces;
const originals=['firstBox','otherBooks','unfinished'];
const holders=g=>originals.map(id=>values(g)[id+'At']);
const depart=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}));drain(g);assert.ok(g.state.journey);loadQ050(g.save());};
const arrive=g=>{const a=g.data.quests.q050.story.actions[g.state.journey.action];go(g,places[a.journey.to]);drain(g);assert.equal(g.state.journey,null);checkpoint(g);};
const people=g=>{assert.equal(values(g).librarianAt,q050LibrarianPlace(story(g).events));assert.equal(values(g).readerAt,'requests');assert.equal(values(g).copyCrewAt,'copies');};

test('q050 changes only three cast roles, their arrival and four pre-commit descriptions',()=>{
 const q=structuredClone(data.quests.q050);assert.equal(q.story.revision,2);assert.equal(q.model.edition.revision,2);assert.deepEqual(q.model.storyUpgrades[0].previous,previousQ050.story);
 for(const [id,allowed] of [['librarian',['entry','requests']],['reader',['requests']],['copyCrew',['copies']]]){assert.equal(q.story.entities[id].character,'q050_'+id);assert.deepEqual(q.story.registry[id+'At'].values,allowed);for(const key of ['portrait','sprite'])assert.equal(data.characters['q050_'+id][key],undefined);delete q.story.entities[id];delete q.story.registry[id+'At'];}
 assert.equal(Object.values(q.story.scenes).filter(s=>s.cast.length).length,3);for(const s of Object.values(q.story.scenes))s.cast=[];
 for(const id of ['warehouse_extension','return_extended_request']){const a=q.story.actions[id],moves=a.effects.filter(e=>e.entities?.includes('librarian'));assert.equal(moves.length,1);assert.equal(moves[0].when.right,'entry');a.effects=a.effects.filter(e=>!e.entities?.includes('librarian'));}
 for(const a of Object.values(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,[]);
 const changes=new Map(['prepare_copies','closed','return_extended','posted'].map(id=>[id,[q.model.graph.find(n=>n.id===id).text,previousQ050.model.graph.find(n=>n.id===id).text]]));
 for(const [scene,[now,old]] of changes){assert.notEqual(now,old);q.model.graph.find(n=>n.id===scene).text=old;let count=0;const visit=obj=>{if(!obj||typeof obj!=='object')return;for(const key of Object.keys(obj)){if(obj[key]===now){obj[key]=old;count++;}else visit(obj[key]);}};visit(q.scripts);assert.equal(count,1);}
 delete q.model.storyUpgrades;q.story.revision=q.model.edition.revision=1;assert.deepEqual(q,previousQ050);
});

test('q050 all eleven scenes, twelve journeys and sixteen actions resume from current and previous saves',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),now=loadQ050(raw),before=projectGame(g).dialog,after=projectGame(now).dialog;assert.equal(g.save(),raw);assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);people(now);const s=story(now);phases.add(now.state.journey?'journey':now.state.quests.q050.stage==='completed'?'completed':now.state.waiting?.type);if(s.scene)scenes.add(s.scene);if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q050Cast(s.scene));
  if(now.state.journey){journeys.add(now.state.journey.action);assert.equal(s.scene,null);assert.equal(after?.scene,undefined);assert.equal(s.values.partyAt,'transit');assert.equal(now.dispatch({type:'story.resume',quest:'q050'}),false);arrive(now);people(now);}
 };
 for(const legacy of [false,true])for(const route of q050Routes){const g=q050Engine({legacy});observe(g);for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){go(g,places[g.data.quests.q050.story.actions[g.state.journey.action].journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q050.outcome,route.outcome);}
 assert.equal(scenes.size,11);assert.equal(journeys.size,12);assert.equal(actions.size,16);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q050.story.actions).sort());for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase));
});

test('q050 the librarian arrives at the request office only after real arrival and stays there through repeated transport',()=>{
 for(const legacy of [false,true])for(const copied of [false,true]){let g=q050Engine({legacy});for(const id of copied?['copy','carry','copy','address']:['follow'])chooseQ050(g,id);g=loadQ050(g.save());assert.equal(values(g).librarianAt,'entry');depart(g,copied?'request':'extension');go(g,{kind:'town',location:'e2_academy'});assert.ok(g.state.journey);assert.equal(values(g).librarianAt,'entry');g=loadQ050(g.save());arrive(g);people(g);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q050_reader','q050_librarian']);
  for(let i=0;i<2;i++){for(const id of ['cancel','carry','copy','address','request']){chooseQ050(g,id);people(g);loadQ050(g.save());}}
  for(const id of ['publish','carry','post','finish']){chooseQ050(g,id);people(g);}assert.equal(g.state.quests.q050.outcome,'informed');}
});

test('q050 retrieves an already delivered first box at the warehouse and copies only on arrival',()=>{
 for(const legacy of [false,true])for(const first of [false,true]){let g=q050Engine({legacy});if(first)chooseQ050(g,'follow');g=loadQ050(g.save());assert.equal(values(g).firstBoxAt,first?'warehouse':'entry');chooseQ050(g,'copy');assert.equal(values(g).copied,false);depart(g,'carry');assert.deepEqual(holders(g),[first?'warehouse':'party','party','party']);arrive(g);assert.deepEqual(holders(g),[first?'warehouse':'party','party','party']);assert.equal(story(g).scene,'fetch_box');assert.equal(values(g).copied,false);depart(g,'copy');assert.deepEqual(holders(g),['party','party','party']);assert.equal(values(g).copied,false);arrive(g);assert.deepEqual(holders(g),['copies','copies','copies']);assert.equal(values(g).copied,true);assert.equal(values(g).copySetAt,'copies');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['q050_copyCrew']);}
});

test('q050 copied originals return to shelves on departure for the office and survive two cancelled extensions',()=>{
 for(const legacy of [false,true]){let g=q050Engine({legacy});for(const id of ['copy','carry','copy'])chooseQ050(g,id);g=loadQ050(g.save());const gold=g.state.gold;
  for(let i=0;i<3;i++){depart(g,'address');assert.deepEqual(holders(g),['party','party','party']);arrive(g);assert.equal(story(g).scene,'return_extended');assert.deepEqual(holders(g),['party','party','party']);assert.equal(values(g).extended,false);assert.equal(values(g).posted,false);depart(g,'request');assert.deepEqual(holders(g),['entry','entry','entry']);arrive(g);assert.deepEqual(holders(g),['entry','entry','entry']);if(i<2)for(const id of ['cancel','carry','copy'])chooseQ050(g,id);loadQ050(g.save());assert.equal(g.state.gold,gold);assert.equal(values(g).copySetAt,'copies');}
  chooseQ050(g,'publish');assert.equal(values(g).extended,false);depart(g,'carry');assert.deepEqual(holders(g),['party','party','entry']);arrive(g);assert.deepEqual(holders(g),['warehouse','warehouse','entry']);assert.equal(values(g).extended,true);assert.equal(values(g).posted,false);depart(g,'post');assert.equal(values(g).posted,false);arrive(g);assert.equal(story(g).scene,'posted');assert.equal(values(g).posted,false);assert.equal(values(g).finished,false);assert.equal(g.state.gold,gold);chooseQ050(g,'finish');assert.equal(values(g).posted,true);assert.equal(g.state.gold,gold+105);people(g);}
});

test('q050 all originals remain carried until warehouse receipt is confirmed and the copy set stays behind',()=>{
 for(const legacy of [false,true]){let g=q050Engine({legacy});for(const id of ['follow','copy','carry','copy'])chooseQ050(g,id);g=loadQ050(g.save());const gold=g.state.gold;depart(g,'close');assert.deepEqual(holders(g),['party','party','party']);assert.equal(values(g).copySetAt,'copies');arrive(g);assert.equal(story(g).scene,'closed');assert.deepEqual(holders(g),['party','party','party']);assert.equal(values(g).finished,false);assert.equal(g.state.gold,gold);assert.deepEqual(projectGame(g).dialog.scene.cast,[]);chooseQ050(g,'finish');assert.deepEqual(holders(g),['warehouse','warehouse','warehouse']);assert.equal(values(g).copySetAt,'copies');assert.equal(values(g).extended,false);assert.equal(values(g).posted,false);assert.equal(g.state.gold,gold+68);people(g);}
});

test('q050 retreat and defeat preserve the pending first-box delivery until arrival without premature handover',()=>{
 for(const legacy of [false,true])for(const rescue of ['mark','defeat']){let g=loadQ050(q050Engine({legacy}).save());depart(g,'follow');const s=structuredClone(story(g)),j=structuredClone(g.state.journey);if(rescue==='mark')assert.ok(g.dispatch({type:'retreat'}));else g.defeat();drain(g);assert.equal(g.state.mode,'town');assert.deepEqual(story(g),s);assert.deepEqual(g.state.journey,j);g=loadQ050(g.save());assert.equal(g.dispatch({type:'story.resume',quest:'q050'}),false);assert.equal(values(g).firstBoxAt,'party');arrive(g);assert.equal(values(g).firstBoxAt,'warehouse');assert.equal(values(g).finished,false);assert.deepEqual(story(g).knowledge.party,['truth']);people(g);}
});

test('q050 twenty routes retain three one-time rewards without inventing the source clockkeeper fight',()=>{
 assert.equal(q050Routes.length,20);const rewards={contract:[125,75],compromise:[68,75],informed:[105,100]};
 for(const legacy of [false,true])for(const route of q050Routes){const g=loadQ050(q050Engine({legacy}).save()),gold=g.state.gold,inventory=structuredClone(g.state.inventory),members=[...g.state.members],battles=g.state.records.battles;let count=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{assert.deepEqual([gp,xp],rewards[route.outcome]);count++;return award(gp,xp,who);};for(const id of route.path){assert.equal(count,0);chooseQ050(g,id);}assert.equal(count,1);assert.equal(g.state.gold,gold+rewards[route.outcome][0]);assert.deepEqual(g.state.inventory,inventory);assert.deepEqual(g.state.members,members);assert.equal(g.state.records.battles,battles);assert.equal(values(g).clockFixed,route.outcome==='contract');if(route.outcome==='contract')assert.deepEqual(holders(g),['entry','entry','entry']);const raw=g.save();assert.throws(()=>g.complete('q050',route.outcome));assert.equal(g.save(),raw);g.run(data.quests.q050.model.entryScript);drain(g);assert.equal(count,1);loadQ050(g.save());}
});

test('q050 accepted old routes retain four scenes, direct endings and repeated copy/application loops',()=>{
 const scenes=new Set();for(const route of q050AcceptedRoutes){const g=loadQ050(q050AcceptedEngine().save());let count=0;const award=g.award.bind(g);g.award=(gold,xp,who)=>{const o=data.previousQuestRoutes.q050.outcomes[route.outcome];assert.deepEqual([gold,xp],[o.gold,o.xp]);count++;return award(gold,xp,who);};for(const id of route.path){scenes.add(g.state.flags.flow.q050.node);loadQ050(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ050(g.save());drain(g);assert.equal(g.state.journey,null);assert.equal(g.state.stories.q050,undefined);assert.equal(projectGame(g).dialog?.scene,undefined);}assert.equal(g.state.quests.q050.outcome,route.outcome);assert.equal(count,1);loadQ050(g.save());}assert.deepEqual([...scenes].sort(),['copies','entry','requests','warehouse']);
});

test('q050 validates old state before migration and rejects forged holders or mixed save generations atomically',()=>{
 const g=q050Engine(),raw=g.save(),old=q050Engine({legacy:true}).save();
 for(const input of [raw,old])for(const mutate of [s=>s.stories.q050.values.firstBoxAt='missing',s=>s.stories.q050.values.copied=1,s=>s.stories.q050.revision=3,s=>(s.flags.legacyStoryRoutes??={}).q050=true]){const saved=JSON.parse(input);mutate(saved.state);assert.throws(()=>g.load(JSON.stringify(saved)));assert.equal(g.save(),raw);}
 for(const [key,bad] of [['librarianAt',[undefined,'transit','copies']],['readerAt',[undefined,'entry','transit']],['copyCrewAt',[undefined,'warehouse','party']]])for(const value of bad){const s=JSON.parse(raw);if(value===undefined)delete s.state.stories.q050.values[key];else s.state.stories.q050.values[key]=value;assert.throws(()=>g.load(JSON.stringify(s)));assert.equal(g.save(),raw);}
 for(const key of ['librarianAt','readerAt','copyCrewAt']){const s=JSON.parse(old);s.state.stories.q050.values[key]='entry';assert.throws(()=>g.load(JSON.stringify(s)));assert.equal(g.save(),raw);}
});

test('q050 browser fixtures cover all scenes, both box sources, repeated copying and accepted old routes',async()=>{
 const {fixtures,outcomes}=await finalChapterArtFixtures();assert.equal(fixtures.length,76);assert.equal(outcomes.length,3);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const prefix of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(prefix));assert.equal(new Set(rows.map(f=>f.scene)).size,11);for(const scene of ['prepare_copies','fetch_box'])for(const at of ['entry','warehouse','party'])if(scene==='prepare_copies'&&at!=='party'||scene==='fetch_box'&&at!=='entry')assert.ok(rows.some(f=>f.scene===scene&&f.variant.startsWith(prefix+'-'+at+'-')));for(const f of rows)assert.deepEqual(f.cast,q050Cast(f.scene));}
 assert.equal(fixtures.filter(f=>f.absentStoryScene).length,4);
});
