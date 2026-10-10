import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {commandDialog,commandTargets} from '../src/core/player-commands.js';
import {inspectScript} from '../src/core/inspection.js';
import {validateSave} from '../src/core/save.js';
import {projectGame} from '../src/application/projection.js';
import {mapSection} from '../src/view/minimap.js';
import {paintDungeon,visibleDungeonObjects} from '../src/view/dungeon.js';
import {installDOM} from './view-dom.mjs';

const note=(id='note',extra={})=>({id,name:id,kind:'clue',trigger:'interact',interactionRange:'here',x:2,y:1,script:`unread.${id}`,...extra});
function start(commands=[{op:'narrate',text:'読める文字。'}],objects=[note()]){
 const d=structuredClone(data),map=d.maps.region_2_f1;
 d.dungeons.region_2.systems={};d.dungeons.region_2.fieldEvents=[];map.encounterRate=0;map.objects=objects;
 for(const object of objects)d.scripts[object.script]={commands:structuredClone(commands)};
 const g=new GameEngine(d);drain(g);g.random=()=>.99999;g.teleport(map.id,2,1,'east');
 g.state.discovered[map.id]=map.tiles.flatMap((row,y)=>[...row].map((_,x)=>`${x},${y}`));
 return g;
}
function pick(g,match){const option=commandDialog(g)?.options.find(match);assert.ok(option,'requested inspection option exists');assert.ok(g.dispatch({type:'choose',id:option.id}));}
function read(g,id='note',command='interact'){
 assert.ok(g.dispatch({type:'player.command',id:command}));
 if(g.state.waiting?.type==='command'&&!g.state.waiting.target)pick(g,o=>o.target===`object:${id}`);
 if(g.state.waiting?.type==='command')pick(g,o=>o.intent?.type==='field.object'&&o.intent.id===id);
}
const object=(g,id='note')=>projectGame(g).dungeon.objects.find(o=>o.id===id);
const roundtrip=g=>{const saved=g.save();assert.deepEqual(validateSave(JSON.parse(saved),g.data),[]);g.load(saved);assert.equal(g.save(),saved);};
function questions(g,dom,expanded=false){
 dom.root.replaceChildren(mapSection(projectGame(g),expanded?{}:{onExpand(){}}));
 return dom.root.querySelectorAll('.map-cell').flatMap(cell=>cell.querySelectorAll('.map-object,.map-edge-image').filter(icon=>icon.src.endsWith('/clue.svg')).map(()=>`${cell.dataset.x},${cell.dataset.y}`));
}
function explorationGlyphs(g,dom){
 const glyphs=[],gradient=()=>({addColorStop(){}}),ctx={
  createLinearGradient:gradient,createRadialGradient:gradient,fillRect(){},drawImage(){},putImageData(){},
  getImageData(x,y,width,height){return {width,height,data:new Uint8ClampedArray(width*height*4)};},
  fillText(text){glyphs.push(text);}
 };
 const canvas=dom.document.createElement('canvas');canvas.getContext=()=>ctx;dom.root.replaceChildren(canvas);
 paintDungeon(canvas,projectGame(g).dungeon,null);return glyphs;
}

test('the actual patrol record stays marked through both pages and saving, then disappears from maps and exploration until new text exists',()=>{
 const dom=installDOM();try{
  const g=new GameEngine(structuredClone(data));drain(g);g.random=()=>.99999;assert.ok(g.dispatch({type:'travel',dungeon:'kagaribi'}));g.teleport('kagaribi_f1',2,1,'east');
  assert.equal(object(g,'history').unread,true);assert.ok(questions(g,dom).includes('3,1'));
  assert.equal(object(g,'history').inInteractionRange,false);assert.ok(!explorationGlyphs(g,dom).includes('?'));
  assert.ok(!commandTargets(g,'inspect').some(t=>t.id==='object:history'));assert.equal(g.trigger('interact','history'),false);
  assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.equal(g.state.location.x,3);
  assert.ok(explorationGlyphs(g,dom).includes('?'),'an unread record is drawn in the exploration canvas');
  read(g,'history');assert.equal(g.state.waiting.type,'text');assert.match(g.state.waiting.text,/灯番/);
  assert.equal(object(g,'history').unread,true,'opening the first page is not finishing the record');roundtrip(g);
  assert.ok(g.dispatch({type:'advance'}));assert.equal(g.state.waiting.type,'text');assert.match(g.state.waiting.text,/踏査/);
  assert.equal(object(g,'history').unread,true,'the second page is still unread');assert.ok(explorationGlyphs(g,dom).includes('?'));roundtrip(g);
  drain(g);assert.equal(object(g,'history').unread,false);roundtrip(g);
  assert.ok(!explorationGlyphs(g,dom).includes('?'),'reading the record removes its exploration marker too');
  assert.ok(visibleDungeonObjects(projectGame(g).dungeon).some(o=>o.id==='history'),'the record remains in the nearby-object projection for repeat inspection');
  assert.ok(commandTargets(g,'inspect').some(t=>t.id==='object:history'));
  g.teleport('kagaribi_f1',4,1,'west');assert.equal(object(g,'history').unread,false,'read status follows the object rather than the player cell');
  assert.ok(!questions(g,dom).includes('3,1'));assert.ok(!questions(g,dom,true).includes('3,1'));
  assert.ok(!commandTargets(g,'inspect').some(t=>t.id==='object:history'));g.teleport('kagaribi_f1',3,1,'west');
  read(g,'history','inspect');assert.equal(g.state.waiting.type,'text');assert.equal(object(g,'history').unread,false);drain(g);
  assert.ok(!questions(g,dom).includes('3,1'));assert.ok(!explorationGlyphs(g,dom).includes('?'));
  g.data.scripts['kagaribi.history'].commands.push({op:'narrate',text:'巡回記録に、新しい通路の注意書きが加わっている。'});
  assert.equal(object(g,'history').unread,true);assert.ok(explorationGlyphs(g,dom).includes('?'),'new text restores the exploration marker');
  read(g,'history');drain(g);assert.ok(!explorationGlyphs(g,dom).includes('?'));
 }finally{dom.restore();}
});

test('selecting and cancelling manual inspection does not consume unread information, but completing its script does',()=>{
 const g=start([{op:'narrate',text:'表面。'},{op:'narrate',text:'裏面。'}]);
 assert.ok(g.dispatch({type:'player.command',id:'inspect'}));pick(g,o=>o.target==='object:note');
 assert.equal(object(g).unread,true);roundtrip(g);pick(g,o=>o.id==='cancel');pick(g,o=>o.id==='cancel');
 assert.equal(object(g).unread,true);assert.equal(g.state.events['region_2_f1/note'],undefined);
 read(g,'note','inspect');assert.equal(object(g).unread,true);drain(g);assert.equal(object(g).unread,false);
 assert.ok(commandTargets(g,'inspect').some(t=>t.id==='object:note'));read(g,'note','inspect');assert.equal(g.state.waiting.text,'表面。');drain(g);
 assert.equal(object(g).unread,false);
});

test('wall torch markers return only for unread descriptions, stay independent of position, and remember previously read states',()=>{
 const dom=installDOM();try{
  const g=newGame();g.random=()=>.99999;assert.ok(g.accept('q001'));assert.ok(g.dispatch({type:'travel',dungeon:'kagaribi'}));g.teleport('kagaribi_f1',8,1,'north');
  assert.equal(object(g,'q001_empty_west').unread,true);assert.ok(questions(g,dom).includes('8,1'));
  assert.ok(explorationGlyphs(g,dom).includes('?'),'an unread wall description is drawn on the exploration canvas');
  read(g,'q001_empty_west');assert.match(g.state.waiting.text,/油切れ/);drain(g);
  assert.equal(object(g,'q001_empty_west').unread,false);assert.ok(!questions(g,dom).includes('8,1'));
  assert.ok(!explorationGlyphs(g,dom).includes('?'),'reading the wall description removes its exploration marker');
  assert.ok(visibleDungeonObjects(projectGame(g).dungeon).some(o=>o.id==='q001_empty_west'),'the wall object remains in the nearby-object projection for repeat inspection');
  g.state.flags.unrelated=true;g.state.objects['kagaribi_f1/q001_empty_east']='lit';
  assert.equal(object(g,'q001_empty_west').unread,false);g.teleport('kagaribi_f1',7,1,'west');
  g.state.objects['kagaribi_f1/q001_empty_west']='lit';assert.equal(object(g,'q001_empty_west').unread,true,'a new description is marked even from another cell and facing');
  assert.equal(object(g,'q001_empty_west').inInteractionRange,false);assert.ok(!explorationGlyphs(g,dom).includes('?'));
  g.teleport('kagaribi_f1',8,1,'east');assert.ok(!explorationGlyphs(g,dom).includes('?'),'the wall marker waits for the correct facing');
  g.state.location.facing='north';assert.ok(explorationGlyphs(g,dom).includes('?'),'a newly lit wall torch has unread text');
  read(g,'q001_empty_west');assert.match(g.state.waiting.text,/火が灯り/);drain(g);roundtrip(g);
  assert.equal(object(g,'q001_empty_west').unread,false);assert.ok(!explorationGlyphs(g,dom).includes('?'));
  g.state.objects['kagaribi_f1/q001_empty_west']='empty';assert.equal(object(g,'q001_empty_west').unread,false,'returning to an already read description is not new information');
  assert.ok(!explorationGlyphs(g,dom).includes('?'));
  g.state.objects['kagaribi_f1/q001_empty_west']='extinguished';assert.equal(object(g,'q001_empty_west').unread,true);
  assert.ok(questions(g,dom,true).includes('8,1'));assert.ok(explorationGlyphs(g,dom).includes('?'));
 }finally{dom.restore();}
});

test('a cell question remains until every clue is read, and read clues do not hide a later event marker in exploration',()=>{
 const dom=installDOM();try{
  const g=start(undefined,[note('first'),note('second'),note('next',{kind:'decision',trigger:'enter',interactionRange:undefined})]);
  g.data.scripts['unread.second'].commands=[{op:'narrate',text:'別の記録。'}];
  g.teleport('region_2_f1',1,1,'east');assert.deepEqual(questions(g,dom),['2,1']);assert.deepEqual(explorationGlyphs(g,dom),[]);
  assert.equal(object(g,'next').inInteractionRange,false);g.teleport('region_2_f1',2,1,'east');
  assert.deepEqual(explorationGlyphs(g,dom),['?']);read(g,'first');drain(g);
  assert.equal(object(g,'first').unread,false);assert.equal(object(g,'second').unread,true);
  g.teleport('region_2_f1',1,1,'east');assert.deepEqual(questions(g,dom),['2,1']);g.teleport('region_2_f1',2,1,'east');
  assert.deepEqual(explorationGlyphs(g,dom),['?'],'a read first candidate does not suppress the remaining unread clue');
  read(g,'second');drain(g);
  const entriesBeforeProjection=g.state.events['region_2_f1/next']??0;
  assert.deepEqual(explorationGlyphs(g,dom),['!'],'the next event remains drawable behind already read clues');
  assert.equal(g.state.events['region_2_f1/next']??0,entriesBeforeProjection,'projection does not execute a synthetic entry event');
  g.teleport('region_2_f1',1,1,'east');assert.deepEqual(questions(g,dom,true),[]);assert.deepEqual(explorationGlyphs(g,dom),[],'the pending entry event is not drawn one cell ahead');
  g.teleport('region_2_f1',2,1,'east');
  assert.equal(projectGame(g).dungeon.objects.filter(o=>o.kind==='clue').length,2);
  assert.equal(commandTargets(g,'inspect').filter(t=>t.id.startsWith('object:')).length,2);
 }finally{dom.restore();}
});

test('a newly unlocked passage is not marked read by finishing the preceding passage',()=>{
 const g=start([{op:'if',condition:{ref:'flags.turned'},then:[{op:'narrate',text:'新しく読める裏面。'}],else:[{op:'narrate',text:'表面を読んだ。'},{op:'flag.set',key:'turned',value:true}]}]);
 read(g);assert.equal(g.state.waiting.text,'表面を読んだ。');drain(g);assert.equal(g.state.flags.turned,true);
 assert.equal(object(g).unread,true);roundtrip(g);assert.equal(object(g).unread,true);
 read(g);assert.equal(g.state.waiting.text,'新しく読める裏面。');drain(g);assert.equal(object(g).unread,false);
});

test('read instructions lose their question even when useful repeat actions remain, and unchosen outcomes do not create unread text',()=>{
 const g=start([{op:'narrate',text:'鐘の使い方。'},{op:'choice',options:[
  {id:'ring',text:'鐘を鳴らす',commands:[{op:'gold.change',amount:1},{op:'narrate',text:{format:'鐘の先の様子：{v}',values:{v:{ref:'flags.unselected'}}}}]},
  {id:'leave',text:'離れる',commands:[]}
 ]}]);g.state.flags.unselected='初期';const gold=g.state.gold;
 read(g);drain(g);assert.equal(g.state.waiting.type,'choice');assert.equal(object(g).unread,true);
 assert.ok(g.dispatch({type:'choose',id:'leave'}));drain(g);assert.equal(object(g).unread,false);assert.equal(g.state.gold,gold);
 assert.ok(commandTargets(g).some(t=>t.id==='object:note'),'a useful action remains selectable after its instructions are read');
 g.state.flags.unselected='変更';g.state.objects['region_2_f1/note']='changed';
 assert.equal(object(g).unread,false,'unchosen result text and an object state with unchanged information do not create a question');
});

test('reading an unavailable reason does not mark its future script read when the prerequisite becomes true',()=>{
 const g=start(undefined,[note('note',{visibleWhen:true,condition:{ref:'flags.allowed'}})]);g.state.flags.allowed=false;
 assert.equal(object(g).unread,false,'currently inaccessible text has no question');
 assert.ok(g.dispatch({type:'player.command',id:'interact'}));assert.equal(commandDialog(g).options[0].enabled,false);
 pick(g,o=>o.id==='cancel');roundtrip(g);assert.equal(object(g).unread,false);
 assert.ok(g.dispatch({type:'player.command',id:'inspect'}));pick(g,o=>o.target==='object:note');
 assert.equal(commandDialog(g).options[0].enabled,false);pick(g,o=>o.id==='cancel');pick(g,o=>o.id==='cancel');
 roundtrip(g);assert.equal(object(g).unread,false,'rereading an unavailable reason still does not read its script');
 g.state.flags.allowed=true;assert.equal(object(g).unread,true,'the disabled reason is not the unlocked text');
 read(g);assert.equal(g.state.waiting.text,'読める文字。');assert.equal(object(g).unread,true,'opening the unlocked script does not promote the old failure receipt');
 roundtrip(g);assert.equal(object(g).unread,true);drain(g);assert.equal(object(g).unread,false);
});

test('previous saves with a matching inspection receipt retain their read state, while an execution count alone does not mean read',()=>{
 const g=start([{op:'narrate',text:{format:'記録 {v}',values:{v:{ref:'flags.revision'}}}}]);g.state.flags.revision=1;
 g.state.events['region_2_f1/note']=1;assert.equal(object(g).unread,true,'a started event is not evidence that all text was read');
 g.state.inspections['region_2_f1/object:note']=inspectScript(g,'unread.note',{map:'region_2_f1',object:'note'}).signature;
 assert.ok(!Object.keys(g.state.inspections).some(k=>k.includes('/read/')));roundtrip(g);
 assert.equal(object(g).unread,false);read(g,'note','inspect');assert.equal(g.state.waiting.type,'text');
 assert.equal(object(g).unread,false,'manual rereading preserves an old completed receipt');roundtrip(g);assert.equal(object(g).unread,false);drain(g);
 g.state.flags.revision=2;assert.equal(object(g).unread,true);
});

test('a saved old inspection that registered its signature at script start remains unread until its final page is finished',()=>{
 const g=start([{op:'narrate',text:'旧保存の一枚目。'},{op:'narrate',text:'旧保存の二枚目。'}]);read(g);
 const record='region_2_f1/object:note';assert.equal(g.state.inspectionActive.record,record);
 g.state.inspections[record]=inspectScript(g,'unread.note',{map:'region_2_f1',object:'note'}).signature;
 assert.ok(!Object.keys(g.state.inspections).some(k=>k.includes('/read/')));roundtrip(g);
 assert.equal(object(g).unread,true);assert.ok(g.dispatch({type:'advance'}));assert.equal(g.state.waiting.text,'旧保存の二枚目。');
 assert.equal(object(g).unread,true);roundtrip(g);drain(g);assert.equal(object(g).unread,false);
});

test('the actual oil manifest loses its question after leaving its read explanation while its optional request can still be accepted manually',()=>{
 const dom=installDOM();try{
  const g=newGame();g.random=()=>.99999;assert.ok(g.dispatch({type:'travel',dungeon:'kagaribi'}));g.teleport('kagaribi_oilstore',2,1,'east');
  assert.equal(object(g,'manifest').unread,true);assert.ok(questions(g,dom).includes('3,1'));
  assert.equal(object(g,'manifest').inInteractionRange,false);assert.ok(!explorationGlyphs(g,dom).includes('?'));
  assert.ok(!commandTargets(g,'inspect').some(t=>t.id==='object:manifest'));assert.equal(g.trigger('interact','manifest'),false);
  assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.equal(g.state.location.x,3);assert.ok(explorationGlyphs(g,dom).includes('?'));
  read(g,'manifest');assert.match(g.state.waiting.text,/油樽/);drain(g);assert.equal(g.state.waiting.type,'choice');
  assert.ok(g.dispatch({type:'choose',id:'leave'}));drain(g);assert.equal(object(g,'manifest').unread,false);
  assert.ok(!g.state.flags.kagaribi?.oilRequested);g.teleport('kagaribi_oilstore',2,1,'east');
  assert.ok(!questions(g,dom).includes('3,1'));g.teleport('kagaribi_oilstore',3,1,'east');
  assert.ok(commandTargets(g).some(t=>t.id==='object:manifest'),'the pending optional request remains convenient to select');
  read(g,'manifest','inspect');drain(g);assert.ok(g.dispatch({type:'choose',id:'accept'}));drain(g);
  assert.equal(g.state.flags.kagaribi.oilRequested,true);assert.equal(object(g,'manifest').unread,false);roundtrip(g);
  g.teleport('kagaribi_oilstore',2,1,'east');assert.ok(!questions(g,dom,true).includes('3,1'));
 }finally{dom.restore();}
});

test('computing unread map markers does not run scripts, spend resources, roll randomness or alter saved state',()=>{
 const g=start([{op:'flag.set',key:'changed',value:true},{op:'random.set',target:'vars.roll',min:1,max:2},{op:'item.take',item:'torch'},{op:'gold.change',amount:-3},{op:'narrate',text:'まだ読んでいない説明。'}]);
 g.state.inventory.torch=3;const saved=g.save();g.random=()=>{throw Error('projection rolled randomness');};
 assert.equal(object(g).unread,true);assert.equal(object(g).unread,true);assert.equal(g.save(),saved);
});
