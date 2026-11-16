import test from 'node:test';
import assert from 'node:assert/strict';
import {projectGame} from '../src/application/projection.js';
import {data,go,drain,audit} from './royal-helpers.mjs';
import {previousQ087,q087Routes,q087Paths,q087Cast,q087LegacyScene,q087Engine,q087AcceptedEngine,loadQ087,chooseQ087,departQ087,arriveQ087,wishTicketArtFixtures} from '../tools/wish-ticket-art-fixtures.mjs';
const story=g=>g.state.stories.q087,values=g=>story(g).values;

test('q087 changes only the existing Haku reference, five casts and one pending desk sentence',()=>{
 const q=structuredClone(data.quests.q087);assert.equal(q.story.revision,1);assert.equal(q.model.edition.revision,1);assert.equal(q.model.storyUpgrades,undefined);
 assert.deepEqual(q.story.registry,previousQ087.story.registry);assert.deepEqual(q.story.actions,previousQ087.story.actions);
 assert.equal(q.story.entities.haku.character,'q087_haku');delete q.story.entities.haku.character;
 for(const key of ['portrait','sprite'])assert.equal(data.characters.q087_haku[key],undefined);
 for(const a of Object.values(q.story.actions))if(a.journey)assert.deepEqual(a.journey.companions,['haku']);
 for(const [id,s] of Object.entries(q.story.scenes)){assert.deepEqual(s.cast.map(c=>q.story.entities[c.entity].kind),['person']);assert.deepEqual(s.cast.map(c=>'q087_'+c.entity),q087Cast(id));s.cast=[];}
 const n=q.model.graph.find(n=>n.id==='desk'),now=n.text,old=previousQ087.model.graph.find(n=>n.id==='desk').text;assert.notEqual(now,old);n.text=old;
 let count=0;const restore=x=>{if(!x||typeof x!=='object')return;for(const k of Object.keys(x))if(x[k]===now){x[k]=old;count++;}else restore(x[k]);};restore(q.scripts);assert.equal(count,1);assert.deepEqual(q,previousQ087);
});

test('q087 current and accepted paths exhaust both acyclic graphs with twelve states and three endings',()=>{
 assert.deepEqual(q087Paths(data.quests.q087.model.graph),q087Routes.map(({path,outcome})=>({path,outcome})));
 assert.deepEqual(q087Paths(data.previousQuestRoutes.q087.model.graph),q087Routes.map(({accepted:path,outcome})=>({path,outcome})));
 const result=audit('q087');assert.equal(result.states,12);assert.deepEqual(Object.keys(result.ends).sort(),['compromise','contract','informed']);
});

test('q087 five scenes, four journeys and nine actions preserve exact saves, waiting text and options',()=>{
 const scenes=new Set(),journeys=new Set(),actions=new Set(),phases=new Set();
 const observe=g=>{const raw=g.save(),h=loadQ087(raw);assert.equal(g.save(),raw);assert.deepEqual(JSON.parse(h.save()),JSON.parse(raw));const before=projectGame(g).dialog,after=projectGame(h).dialog;assert.equal(after?.text,before?.text);assert.deepEqual(after?.options,before?.options);
  if(story(h).scene)scenes.add(story(h).scene);phases.add(h.state.journey?'journey':h.state.quests.q087.stage==='completed'?'completed':h.state.waiting?.type);
  if(after?.scene)assert.deepEqual(after.scene.cast.map(c=>c.id),q087Cast(story(h).scene));
  if(h.state.journey){journeys.add(h.state.journey.action);assert.equal(story(h).scene,null);assert.equal(after?.scene,undefined);assert.equal(h.dispatch({type:'story.resume',quest:'q087'}),false);arriveQ087(h);}
 };
 for(const legacy of [false,true])for(const route of q087Routes){const g=q087Engine({legacy});observe(g);for(const id of route.path){actions.add(story(g).scene+'_'+id);assert.ok(g.dispatch({type:'choose',id}));observe(g);drain(g);observe(g);if(g.state.journey){const a=g.data.quests.q087.story.actions[g.state.journey.action];go(g,g.data.quests.q087.story.worldPlaces[a.journey.to]);observe(g);drain(g);observe(g);}}assert.equal(g.state.quests.q087.outcome,route.outcome);}
 assert.equal(scenes.size,5);assert.equal(journeys.size,4);assert.equal(actions.size,9);assert.deepEqual([...actions].sort(),Object.keys(data.quests.q087.story.actions).sort());for(const phase of ['text','choice','journey','completed'])assert.ok(phases.has(phase),phase);
});

test('q087 issuing and correcting the receipt never counts as fulfilling the wish',()=>{
 for(const legacy of [false,true]){let g=q087Engine({legacy});assert.equal(values(g).ticketIssued,false);chooseQ087(g,'test');assert.equal(values(g).ticketIssued,true);assert.equal(values(g).wordingFixed,false);assert.equal(values(g).clutterAt,'desk');assert.equal(values(g).firstStep,false);assert.equal(values(g).written,false);g=loadQ087(g.save());
  chooseQ087(g,'wording');assert.equal(values(g).wordingFixed,true);assert.equal(values(g).firstStep,false);assert.equal(values(g).written,false);assert.equal(values(g).hakuAt,'entry');assert.equal(values(g).clutterAt,'desk');assert.equal(values(g).notebookAt,'party');assert.equal(values(g).finished,false);
 }
});

test('q087 three notebook routes record on departure and keep the actual work undone',()=>{
 for(const legacy of [false,true])for(const [prefix,id,ticket,corrected] of [[[],'notebook',false,false],[['test'],'record',true,false],[['test','wording'],'write',true,true]]){
  let g=q087Engine({legacy});for(const c of prefix)chooseQ087(g,c);assert.equal(values(g).written,false);departQ087(g,id);assert.equal(values(g).written,true);assert.equal(values(g).hakuAt,'transit');assert.equal(values(g).notebookAt,'party');assert.equal(values(g).clutterAt,'desk');g=loadQ087(g.save());arriveQ087(g);
  assert.equal(story(g).scene,'written');assert.equal(values(g).hakuAt,'sky');assert.equal(values(g).partyAt,'sky');assert.equal(values(g).firstStep,false);assert.equal(values(g).finished,false);chooseQ087(g,'finish');
  assert.equal(g.state.quests.q087.outcome,'compromise');assert.equal(values(g).ticketIssued,ticket);assert.equal(values(g).wordingFixed,corrected);assert.equal(values(g).clutterAt,'desk');assert.equal(values(g).firstStep,false);assert.equal(values(g).notebookAt,'party');
 }
});

test('q087 arriving home does not move clutter; only finish completes the first action',()=>{
 for(const legacy of [false,true]){let g=q087Engine({legacy});chooseQ087(g,'test');chooseQ087(g,'wording');departQ087(g,'act');assert.equal(values(g).hakuAt,'transit');assert.equal(values(g).clutterAt,'desk');assert.equal(values(g).firstStep,false);g=loadQ087(g.save());arriveQ087(g);
  assert.equal(story(g).scene,'desk');assert.equal(values(g).hakuAt,'home');assert.equal(values(g).clutterAt,'desk');assert.equal(values(g).firstStep,false);assert.equal(values(g).finished,false);assert.equal(values(g).written,false);assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),q087Cast('desk'));
  chooseQ087(g,'finish');assert.equal(values(g).clutterAt,'shelf');assert.equal(values(g).firstStep,true);assert.equal(g.state.quests.q087.outcome,'informed');assert.equal(values(g).deskAt,'home');assert.equal(values(g).shelfAt,'home');assert.equal(values(g).notebookAt,'party');
 }
});

test('q087 breaking the tube remains non-combat and leaves the wish unfulfilled',()=>{
 for(const legacy of [false,true]){const g=loadQ087(q087Engine({legacy}).save());chooseQ087(g,'break');assert.equal(g.state.battle,null);assert.equal(values(g).broken,true);for(const flag of ['ticketIssued','wordingFixed','written','firstStep'])assert.equal(values(g)[flag],false);assert.equal(values(g).clutterAt,'desk');assert.equal(values(g).hakuAt,'entry');assert.equal(g.state.quests.q087.outcome,'contract');loadQ087(g.save());}
});

test('q087 every journey survives retreat and defeat with Haku, recorded intent and clutter intact',()=>{
 const seen=new Set();for(const legacy of [false,true])for(const route of q087Routes){const g=q087Engine({legacy});for(const id of route.path){assert.ok(g.dispatch({type:'choose',id}));drain(g);if(g.state.journey){const key=legacy+'/'+g.state.journey.action;if(!seen.has(key)){seen.add(key);const raw=g.save();for(const interruption of ['mark','defeat']){const h=loadQ087(raw),s=structuredClone(story(h)),j=structuredClone(h.state.journey);if(interruption==='mark')assert.ok(h.dispatch({type:'retreat'}));else h.defeat();drain(h);assert.equal(h.state.mode,'town');assert.deepEqual(story(h),s);assert.deepEqual(h.state.journey,j);const resumed=loadQ087(h.save());assert.equal(resumed.dispatch({type:'story.resume',quest:'q087'}),false);arriveQ087(resumed);assert.equal(values(resumed).hakuAt,values(resumed).partyAt);assert.equal(values(resumed).firstStep,false);assert.equal(values(resumed).clutterAt,'desk');assert.equal(values(resumed).notebookAt,'party');assert.deepEqual(projectGame(resumed).dialog.scene.cast.map(c=>c.id),q087Cast(story(resumed).scene));}}arriveQ087(g);}}}assert.equal(seen.size,8);
});

test('q087 original rewards are granted once on all five paths and both save generations',()=>{
 for(const legacy of [false,true])for(const route of q087Routes){const g=loadQ087(q087Engine({legacy}).save()),reward=data.quests.q087.outcomes[route.outcome],gold=g.state.gold;let awards=0,total=0;const award=g.award.bind(g);g.award=(gp,xp,who)=>{total+=gp;if(gp===reward.gold&&xp===reward.xp)awards++;return award(gp,xp,who);};for(const id of route.path){assert.equal(awards,0);chooseQ087(g,id);}assert.equal(awards,1);assert.equal(g.state.gold,gold+total);assert.equal(g.state.quests.q087.outcome,route.outcome);const raw=g.save();assert.throws(()=>g.complete('q087',route.outcome));assert.equal(g.save(),raw);assert.equal(g.accept('q087'),false);g.run(data.quests.q087.model.entryScript);drain(g);assert.equal(awards,1);loadQ087(g.save());}
});

test('q087 accepted old routes retain three scenes and five paths without new journeys or story actors',()=>{
 const scenes=new Set();for(const route of q087Routes){const g=loadQ087(q087AcceptedEngine().save());for(const id of route.accepted){scenes.add(q087LegacyScene(g));loadQ087(g.save());assert.ok(g.dispatch({type:'choose',id}));loadQ087(g.save());drain(g);assert.equal(g.state.battle,null);assert.equal(g.state.stories.q087,undefined);assert.equal(g.state.journey,null);assert.equal(projectGame(g).dialog?.scene,undefined);}assert.equal(g.state.quests.q087.outcome,route.outcome);loadQ087(g.save());}assert.deepEqual([...scenes].sort(),['entry','firststep','ticket']);
});

test('q087 malformed current and older saves reject atomically without moving Haku or objects',()=>{
 const g=q087Engine(),before=g.save();for(const raw of [before,q087Engine({legacy:true}).save()])for(const mutate of [s=>s.stories.q087.values.hakuAt='unknown',s=>s.stories.q087.values.clutterAt='clutter',s=>s.stories.q087.values.firstStep=1,s=>delete s.stories.q087.values.notebookAt,s=>s.stories.q087.revision=2,s=>s.stories.q087.events.push('unwritten'),s=>(s.flags.legacyStoryRoutes??={}).q087=true]){const bad=JSON.parse(raw);mutate(bad.state);assert.throws(()=>g.load(JSON.stringify(bad)));assert.equal(g.save(),before);}
});

test('q087 display fixtures cover Haku in five scenes, three record histories, rescues and old text',async()=>{
 const {fixtures,outcomes}=await wishTicketArtFixtures();assert.equal(outcomes.length,3);assert.equal(new Set(fixtures.map(f=>f.scene+'/'+f.variant)).size,fixtures.length);
 for(const gen of ['current','previous']){const rows=fixtures.filter(f=>f.variant.startsWith(gen));assert.equal(new Set(rows.map(f=>f.scene)).size,5);assert.equal(rows.filter(f=>f.variant.includes('rescued')).length,2);assert.equal(rows.filter(f=>f.scene==='written').length,4);}
 for(const f of fixtures){const d=projectGame(loadQ087(f.save)).dialog;assert.equal(d.text,f.expectedText);if(f.absentStoryScene){assert.equal(d.scene,undefined);assert.deepEqual(f.cast,[]);}else{assert.deepEqual(d.scene.cast.map(c=>c.id),q087Cast(f.scene));assert.deepEqual(f.textOnlyCast,f.cast);}}
 const f=fixtures.find(f=>f.scene==='desk'&&f.variant.startsWith('previous'));assert.equal(f.expectedText,previousQ087.model.graph.find(n=>n.id==='desk').text);assert.notEqual(f.expectedText,data.quests.q087.model.graph.find(n=>n.id==='desk').text);assert.equal(fixtures.filter(f=>f.absentStoryScene).length,3);
});
