import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain,goTownLocation,fight} from './helpers.mjs';
import {prepareQuest,finishJourney} from './structure-routes.mjs';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {nextQuestPlace} from '../src/core/quest-navigation.js';
import {GameView} from '../src/view/view.js';
import {installDOM} from './view-dom.mjs';

const quest=(g,id='q001')=>projectGame(g).quests.find(q=>q.id===id);
const choose=(g,id)=>{assert.ok(g.dispatch({type:'choose',id}));drain(g);};

test('accepting q001 on the guild board allows immediate travel to its named dungeon entrance',()=>{
 const g=newGame();goTownLocation(g,'hikarigaeri_guild');assert.ok(g.dispatch({type:'accept',id:'q001'}));
 const q=quest(g);assert.equal(q.destination.name,'篝火の迷宮');assert.equal(q.tracked,true);assert.equal(q.canEnter,true);assert.equal(q.entryReason,'');
 g.state.light=1;
 assert.ok(g.dispatch({type:'quest.travel',id:'q001'}));assert.equal(g.state.location.map,'kagaribi_f1');assert.equal(g.state.location.x,1);
 assert.equal(g.state.location.y,1);assert.equal(g.state.mode,'dungeon');assert.equal(g.state.townLocation,null);assert.equal(g.state.light,data.system.lightCapacity);
 assert.equal(g.state.stories.q001,undefined,'entry does not trigger the next event or teleport to its cell');
});

test('the quest entrance shortcut works from every town facility, including nested locations',()=>{
 for(const id of Object.keys(data.locations)){
  const g=newGame();g.accept('q001');goTownLocation(g,id);
  assert.equal(quest(g).canEnter,true,id);assert.equal(quest(g).entryReason,'',id);
  assert.ok(g.dispatch({type:'quest.travel',id:'q001'}),id);assert.equal(g.state.location.map,'kagaribi_f1',id);
 }
});

test('q001 guidance follows journeys and paused scenes, then points to the town report rather than the initial dungeon',()=>{
 const g=prepareQuest('q001');choose(g,'talk');assert.equal(quest(g).destination.x,9);finishJourney(g);
 choose(g,'pause');g.returnTown();assert.equal(quest(g).destination.x,9);const save=g.save();g.load(save);assert.equal(quest(g).destination.x,9);
 g.teleport('kagaribi_f1',9,1);g.run(data.quests.q001.model.entryScript);drain(g);choose(g,'inspect');choose(g,'follow');
 assert.equal(quest(g).destination.x,13);finishJourney(g);choose(g,'support');finishJourney(g);fight(g);choose(g,'home');finishJourney(g);choose(g,'report');
 let q=quest(g);assert.equal(q.destination.kind,'town');assert.equal(q.destination.name,'灯番詰所');assert.equal(q.entryDungeon,null);assert.equal(q.canEnter,false);
 g.returnTown();const loc=g.state.townLocation;assert.equal(g.dispatch({type:'quest.travel',id:'q001'}),false);assert.equal(g.state.townLocation,loc);
 finishJourney(g);choose(g,'rest');q=quest(g);assert.equal(q.destination,null);assert.equal(projectGame(g).tracked,null);
});

test('a pending event in a different dungeon updates the label and dispatch target and survives saving',()=>{
 const g=prepareQuest('q001'),d=structuredClone(data),p={kind:'dungeon',dungeon:'region_2',map:'region_2_f1',x:11,y:9};
 d.quests.q001.story.worldPlaces.dark=p;
 const h=new GameEngine(d);h.load(g.save());const original=quest(h);
 assert.equal(original.entryDungeon,'kagaribi');choose(h,'talk');assert.equal(quest(h).entryDungeon,'region_2');
 h.returnTown();goTownLocation(h,'hikarigaeri_guild');h.load(h.save());const q=quest(h);assert.equal(q.destination.name,d.dungeons.region_2.name);assert.ok(q.dungeonIds.includes('kagaribi')&&q.dungeonIds.includes('region_2'));assert.equal(q.canEnter,true);
 assert.ok(h.dispatch({type:'quest.travel',id:'q001',dungeon:original.entryDungeon}),'stale client destination is ignored');
 assert.equal(h.state.location.map,'region_2_f1');assert.equal(h.state.location.x,d.maps.region_2_f1.entrance.x);
 assert.notDeepEqual({x:h.state.location.x,y:h.state.location.y},{x:p.x,y:p.y});assert.equal(h.state.journey.quest,'q001');
});

test('q002 next destination changes between the waterway and school without advancing or changing the saved story',()=>{
 const g=prepareQuest('q002');choose(g,'school');let q=quest(g,'q002');assert.equal(q.destination.location,'hikarigaeri_medical_specimens');assert.equal(q.entryDungeon,null);
 finishJourney(g);choose(g,'recover');const before=g.save();q=quest(g,'q002');assert.equal(q.entryDungeon,'region_1');assert.equal(q.destination.x,data.quests.q002.story.worldPlaces.landing.x);
 assert.equal(g.save(),before);q.destination.x=999;assert.equal(quest(g,'q002').destination.x,data.quests.q002.story.worldPlaces.landing.x);
});

test('quest-specific travel requires an active quest and blocks busy or dungeon states; main quest selection persists',()=>{
 const g=newGame();for(const id of ['q001','missing','__proto__',undefined])assert.equal(g.dispatch({type:'quest.travel',id}),false);g.accept('q001');g.accept('q002');
 assert.equal(quest(g,'q002').tracked,true);assert.ok(g.dispatch({type:'track',id:'q001'}));g.load(g.save());assert.equal(projectGame(g).tracked.id,'q001');
 g.run('q001.wall.q001_empty_west');assert.equal(g.dispatch({type:'quest.travel',id:'q001'}),false);drain(g);
 assert.ok(g.dispatch({type:'quest.travel',id:'q001'}));assert.equal(g.dispatch({type:'quest.travel',id:'q001'}),false);
 for(const q of Object.values(data.quests)){
  const p=nextQuestPlace(data,g.state,q.id);assert.ok(p&&data.maps[p.map]||p?.kind==='town',q.id);
 }
});

test('legacy clue routing advances only past collected clues while current routes use their physical hub',()=>{
 const g=newGame(),q=data.quests.q021;
 assert.equal(nextQuestPlace(data,g.state,q.id).role,'decision');
 g.state.flags.legacyQuestRoutes={[q.id]:true};assert.equal(nextQuestPlace(data,g.state,q.id).role,'clue_a');
 g.state.quests[q.id].evidence.push('clue_a');assert.equal(nextQuestPlace(data,g.state,q.id).role,'clue_b');
 g.state.quests[q.id].evidence.push('clue_b');assert.equal(nextQuestPlace(data,g.state,q.id).role,'decision');
});

// Small DOM adapter exercises the actual view methods and their dispatched intents.
// Layout and canvas rendering remain browser checks.
class Element {
 constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.style={setProperty(){}};this.listeners={};}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[];this.append(...items);}
 get lastChild(){return this.children.at(-1);}
 setAttribute(k,v){this[k]=v;}
 addEventListener(k,f){this.listeners[k]=f;}
 get textContent(){return (this.text??'')+this.children.map(c=>c.textContent??String(c)).join('');}
 set textContent(v){this.text=String(v);}
 queryAll(tag){return this.children.flatMap(c=>c instanceof Element?[...(c.tagName===tag?[c]:[]),...c.queryAll(tag)]:[]);}
 click(){if(!this.disabled)this.listeners.click?.();}
}

test('board and journal expose one named entrance action, main quest controls, dungeon filters and an exit; sidebar quest guidance has no travel action',()=>{
 const previous={document:globalThis.document,Option:globalThis.Option};
 globalThis.document={createElement:tag=>new Element(tag)};
 globalThis.Option=class extends Element{constructor(text,value){super('option');this.textContent=text;this.value=value;}};
 try{
  const g=newGame();goTownLocation(g,'hikarigaeri_guild');g.accept('q001');g.accept('q002');
  const intents=[],v=Object.assign(Object.create(GameView.prototype),{dungeonFilter:'kagaribi',query:'',filter:'open',act:i=>{intents.push(i);return g.dispatch(i);}}),root=new Element('div');
  let model=projectGame(g);v.quests(root,model);const buttons=root.queryAll('button');
  assert.equal(root.queryAll('article').length,1);assert.doesNotMatch(root.textContent,/灯守の地下水道.*開始地点|入口から現地調査へ向かう|この依頼を追う/);
  const entrance=buttons.find(b=>b.textContent==='迷宮の入口へ向かう（篝火の迷宮）');assert.equal(entrance.disabled,false);assert.doesNotMatch(root.textContent,/篝火広場から出発/);
  entrance.click();assert.deepEqual(intents.pop(),{type:'quest.travel',id:'q001'});assert.equal(g.state.location.map,'kagaribi_f1');
  g.returnTown();goTownLocation(g,'hikarigaeri_guild');
  buttons.find(b=>b.textContent==='メインクエストに設定').click();assert.deepEqual(intents.pop(),{type:'track',id:'q001'});
  buttons.find(b=>b.textContent==='灯帰り・篝火広場へ戻る').click();assert.deepEqual(intents.pop(),{type:'location.move',id:'hikarigaeri_square'});
  g.dispatch({type:'track',id:'q001'});goTownLocation(g,'hikarigaeri_square');model=projectGame(g);
  const location=new Element('div');v.location(location,model);location.queryAll('button').find(b=>b.textContent==='迷宮の入口へ向かう（篝火の迷宮）').click();assert.deepEqual(intents.pop(),{type:'quest.travel',id:'q001'});
  g.returnTown();model=projectGame(g);
  const sidebar=new Element('aside');v.portrait=()=>new Element('img');v.sidebar(sidebar,model);
  assert.match(sidebar.textContent,/メインクエスト/);assert.deepEqual(sidebar.queryAll('button').map(b=>b.dataset.focus),model.party.map(a=>`character:${a.id}`));
  const journal=new Element('section');v.journal(journal,model);assert.equal(journal.queryAll('button').filter(b=>b.textContent==='メインクエストに設定').length,1);assert.match(journal.textContent,/次の目的地：篝火の迷宮/);
 }finally{globalThis.document=previous.document;globalThis.Option=previous.Option;}
});


test('the rendered exploration page has no journey banner or arrival button while walking to an event',()=>{
 const dom=installDOM();let v;
 try{
  const g=prepareQuest('q001');choose(g,'talk');const model=projectGame(g);assert.ok(model.journey);
  v=new GameView(dom.root,()=>{},{soundEnabled:()=>false,effectsMode:()=> 'off'});v.tab='explore';v.render(model);
  assert.equal(dom.root.querySelectorAll('canvas').length,1);
  assert.doesNotMatch(dom.root.textContent,/目的地で続きを進める|移動と調査を終え/);
  assert.equal(dom.root.querySelectorAll('.journey-note').length,0);
 }finally{v?.destroy();dom.restore();}
});
