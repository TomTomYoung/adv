import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {data,newGame,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {loadContent} from '../src/core/loader.js';
import {validateContent} from '../src/core/validation.js';
import {projectQuestObjects,questEventPlan} from '../src/core/quest-events.js';
const read=p=>fs.readFile(new URL('../'+p,import.meta.url),'utf8').then(JSON.parse);
const stable=v=>Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const hash=v=>createHash('sha256').update(JSON.stringify(stable(v))).digest('hex');
const old=await read('tests/fixtures/quest-events-1.8.0.json');

test('unrevised quest scripts and map objects remain unchanged outside the explicit q001 rewrite',()=>{
 assert.equal(hash(Object.fromEntries(Object.entries(data.scripts).filter(([id])=>!id.startsWith('q001.')&&!id.startsWith('dungeon.scene.kagaribi.')&&id!=='prologue'))),old.unrevisedScriptsSha256);
 for(const [map,objects] of Object.entries(old.objects)){
  assert.equal(data.maps[map].objects.filter(o=>o.quest!=='q001').length,Object.keys(objects).filter(id=>!id.startsWith('q001_')).length);
  for(const object of data.maps[map].objects.filter(o=>o.quest!=='q001')){
   const original=structuredClone(object);if(original.quest){original.condition=original.visibleWhen;delete original.visibleWhen;}
   assert.equal(hash(original),objects[object.id],`${map}/${object.id}`);
  }
 }
});

test('distributed maps and dungeons contain no quest-owned definitions; each quest owns its event entry scripts',async()=>{
 for(const file of data.game.files.maps)assert.ok((await read(file)).objects.every(o=>!o.quest),file);
 for(const d of Object.values(await read('data/dungeons.json')))assert.equal(d.fieldScenes,undefined);
 for(const q of Object.values(data.quests)){
  assert.deepEqual(q.events,(await read(`authoring/quests/${q.id}.events.json`)).events);
  for(const e of q.events)assert.ok(q.scripts[e.script],`${q.id}/${e.id}`);
 }
 assert.equal(Object.values(data.quests).flatMap(q=>q.events).filter(e=>e.note).length,13);
});

function objectGame({visibleWhen=true,condition=true,once=false}={}){
 const d=structuredClone(data),map='region_1_f1';
 for(const m of Object.values(d.maps))m.objects=m.objects.filter(o=>!o.quest);
 const p={map,x:2,y:1};
 d.quests.q001.events.push({id:'test_gate',title:'条件付きの灯',points:[p],kind:'door',trigger:'interact',blocking:true,initialState:'low',visibleWhen,condition,once,script:'q001.test_gate'});
 d.quests.q001.scripts['q001.test_gate']={commands:[{op:'object.state.set',map,object:'test_gate',state:'empty'},{op:'narrate',text:'油が尽きた。'}]};
 d.scripts['q001.test_gate']=d.quests.q001.scripts['q001.test_gate'];projectQuestObjects(d);
 const g=new GameEngine(d);drain(g);g.dispatch({type:'travel',region:1});return {g,d,p};
}

test('object visibility and interaction eligibility are separate, including literal false',()=>{
 const {g}=objectGame({visibleWhen:{ref:'flags.appears'},condition:{ref:'flags.enabled'}}),m=g.map();
 assert.equal(g.walkable(m,2,1),true);assert.equal(projectGame(g).dungeon.objects.some(o=>o.id==='test_gate'),false);
 g.state.flags.appears=true;assert.equal(g.walkable(m,2,1),false);assert.ok(projectGame(g).dungeon.objects.some(o=>o.id==='test_gate'));
 assert.equal(g.trigger('interact'),true);drain(g); // The map's exit at the feet remains available.
 g.dispatch({type:'travel',region:1});g.state.flags.enabled=true;
 assert.equal(g.trigger('interact'),true);assert.equal(g.state.objects['region_1_f1/test_gate'],'empty');drain(g);
 const save=g.save();g.load(save);assert.equal(g.save(),save);
 g.state.flags.appears=false;assert.equal(g.walkable(m,2,1),true);assert.equal(projectGame(g).dungeon.cells[1][2].opaque,false);
 const {g:literal}=objectGame({visibleWhen:false,condition:true});assert.equal(literal.walkable(literal.map(),2,1),true);
});

test('a visible disabled object cannot run its script and once-only objects cease to block after use',()=>{
 const {g}=objectGame({condition:false});g.trigger('interact');assert.equal(g.state.objects['region_1_f1/test_gate'],undefined);
 const {g:once}=objectGame({once:true});once.trigger('interact');drain(once);assert.equal(once.state.events['region_1_f1/test_gate'],1);assert.equal(once.walkable(once.map(),2,1),true);
 assert.equal(projectGame(once).dungeon.objects.some(o=>o.id==='test_gate'),false);
});

test('prior observation flags are read from the owning quest after save and reload',()=>{
 const g=newGame();g.state.flags.dungeonNotes=Object.fromEntries(Object.keys(old.notes).map(id=>[id,true]));
 const save=g.save();g.load(save);assert.equal(g.save(),save);
 const notes=projectGame(g).fieldNotes;assert.equal(notes.length,13);
 for(const [id,q] of Object.entries(old.notes))assert.equal(notes.find(n=>n.id===id).quest,q);
});

test('action events enforce visibility, conditions, height and once before changing state',()=>{
 const {g,d}=objectGame({visibleWhen:false});const e=d.quests.q001.events.find(e=>e.id==='kagaribi');
 g.returnTown();g.accept('q001');g.dispatch({type:'travel',dungeon:'kagaribi'});
 e.once=true;e.visibleWhen=false;const before=g.save();assert.equal(g.dispatch({type:'quest.event',quest:'q001',id:e.id}),false);assert.deepEqual(g.state.events,JSON.parse(before).state.events);
 e.visibleWhen=true;e.condition=false;assert.equal(questEventPlan(d,g.state,'q001',e.id).ok,false);
 e.condition=true;e.points[0].z=1;assert.equal(questEventPlan(d,g.state,'q001',e.id).ok,false);delete e.points[0].z;
 assert.equal(g.dispatch({type:'quest.event',quest:'q001',id:e.id}),true);drain(g);g.dispatch({type:'choose',id:'leave'});
 assert.equal(questEventPlan(d,g.state,'q001',e.id).ok,false);
});

test('invalid quest placements and foreign entry scripts are rejected',()=>{
 for(const mutate of [e=>e.points[0].z=1,e=>e.points[0].x=0,e=>e.points[0].map='missing',e=>e.script='prologue',e=>e.visibleWhen={op:'missing'},e=>e.note={text:'記録',when:{op:'missing'}}]){
  const d=structuredClone(data);mutate(d.quests.q001.events[0]);assert.ok(validateContent(d).length);
 }
 const d=structuredClone(data);d.quests.q001.events.push(structuredClone(d.quests.q001.events[0]));assert.ok(validateContent(d).length);
});

test('raw map quest references are rejected before runtime projection',async()=>{
 await assert.rejects(loadContent(async file=>{const v=await read(file);if(file==='data/maps/region_1_f1.json')v.objects[0].quest='q001';return v;}),/クエスト専用object/);
});

test('HTTP-loaded quests can enter an event, record it, return and resume the saved record',async()=>{
 const {createServer}=await import('node:http');
 const allowed=new Set(['data/game.json',...Object.values(data.game.files.databases),...data.game.files.maps,...data.game.files.quests,...data.game.files.scripts]);
 const server=createServer(async(req,res)=>{
  const file=req.url.slice(1);if(!allowed.has(file)){res.writeHead(404);res.end();return;}
  try{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(await read(file)));}catch{res.writeHead(500);res.end();}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const base=`http://127.0.0.1:${server.address().port}/`,content=await loadContent(async file=>{const response=await fetch(base+file);assert.equal(response.status,200);return response.json();});
  const g=new GameEngine(content);drain(g);g.dispatch({type:'accept',id:'q001'});g.dispatch({type:'travel',dungeon:'kagaribi'});
  assert.ok(g.dispatch({type:'quest.event',quest:'q001',id:'kagaribi'}));const saved=g.save();g.load(saved);drain(g);
  assert.ok(g.dispatch({type:'choose',id:'record'}));drain(g);g.dispatch({type:'retreat'});
  const returned=g.save();g.load(returned);assert.equal(g.state.mode,'town');assert.equal(projectGame(g).quests.find(q=>q.id==='q001').fieldNotes.length,1);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
