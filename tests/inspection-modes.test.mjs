import test from 'node:test';
import assert from 'node:assert/strict';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {commandTargets,commandDialog} from '../src/core/player-commands.js';
import {inspectScript} from '../src/core/inspection.js';
import {validateSave} from '../src/core/save.js';
import {validateContent} from '../src/core/validation.js';
import {projectGame} from '../src/application/projection.js';
import {visibleDungeonObjects} from '../src/view/dungeon.js';
import {closeTo,actionConsumes} from '../src/core/systems/common.js';

const note=(id='note',extra={})=>({id,name:id,x:2,y:1,kind:'clue',trigger:'interact',script:id,...extra});
function start(commands=[{op:'narrate',text:'読める文字。'}],objects=[note()]){
 const d=structuredClone(data);d.dungeons.region_1.systems={};d.dungeons.region_1.fieldEvents=[];d.maps.region_1_f1.objects=objects;
 for(const o of objects)d.scripts[o.script]={commands};
 const g=new GameEngine(d);drain(g);g.random=()=>.99999;g.dispatch({type:'travel',dungeon:'region_1'});g.teleport('region_1_f1',2,1,'north');return g;
}
const open=(g,id='interact')=>g.dispatch({type:'player.command',id});
function pick(g,match){const option=commandDialog(g)?.options.find(match);assert.ok(option,'option available');assert.ok(g.dispatch({type:'choose',id:option.id}));}
const target=(g,id)=>pick(g,o=>o.target===id);
const act=g=>pick(g,o=>o.intent?.type==='field.object');
const restore=g=>{const saved=g.save();assert.deepEqual(validateSave(JSON.parse(saved),g.data),[]);g.load(saved);assert.equal(g.save(),saved);};

test('unread information executes directly, persists across saves, and returns only when its text changes',()=>{
 const g=start([{op:'narrate',text:{format:'状態 {v}',values:{v:{ref:'flags.info'}}}}]);g.state.flags.info='初期';
 assert.ok(open(g));assert.equal(g.state.waiting.type,'text');restore(g);drain(g);restore(g);
 assert.deepEqual(commandTargets(g),[]);const before=g.save();assert.equal(open(g),false);assert.equal(g.save(),before);
 g.state.flags.unrelated=true;assert.deepEqual(commandTargets(g),[]);g.state.flags.info='変更';assert.equal(commandTargets(g).length,1);assert.ok(open(g));assert.match(g.state.waiting.text,/変更/);
});
test('manual inspection always lists cells, edge and read targets; cancelling details does not mark unread text',()=>{
 const g=start();assert.ok(open(g,'inspect'));assert.deepEqual(commandTargets(g,'inspect').map(t=>t.id),['object:note','cell:here','cell:ahead','edge:front']);
 target(g,'object:note');restore(g);pick(g,o=>o.id==='cancel');pick(g,o=>o.id==='cancel');assert.equal(commandTargets(g).length,1);
 assert.ok(open(g));drain(g);assert.equal(commandTargets(g).length,0);assert.ok(open(g,'inspect'));target(g,'object:note');act(g);assert.equal(g.state.waiting.type,'text');
});
test('a meaningful free state change executes once, and a changed object state reappears',()=>{
 const g=start([{op:'flag.set',key:'read',value:true},{op:'object.state.set',map:'region_1_f1',object:'note',state:'open'},{op:'narrate',text:'開いた。'}]);
 assert.ok(open(g));drain(g);assert.equal(g.state.flags.read,true);assert.equal(commandTargets(g).length,0);
 g.state.objects['region_1_f1/note']='closed';assert.equal(commandTargets(g).length,1);assert.ok(open(g));drain(g);assert.equal(g.state.objects['region_1_f1/note'],'open');
});
test('only an explicit action selection spends an item or gold, including after saving',()=>{
 for(const cost of [{op:'item.take',item:'torch'},{op:'gold.change',amount:-7}]){
  const g=start([cost,{op:'narrate',text:'支払った。'}]);g.state.inventory.torch=3;const gold=g.state.gold;
  assert.ok(open(g));assert.equal(commandDialog(g).type,'choice');restore(g);pick(g,o=>o.id==='cancel');assert.equal(g.state.inventory.torch,3);assert.equal(g.state.gold,gold);
  assert.ok(open(g));act(g);assert.equal(g.state.inventory.torch,cost.op==='item.take'?2:3);assert.equal(g.state.gold,cost.op==='gold.change'?gold-7:gold);drain(g);
 }
});
test('a script with its own choice opens directly and waits for that choice before consuming',()=>{
 const g=start([{op:'narrate',text:'油を使う？'},{op:'choice',options:[{id:'use',text:'使う',commands:[{op:'item.take',item:'torch'}]},{id:'leave',text:'やめる',commands:[]}]}]);g.state.inventory.torch=2;
 assert.ok(open(g));assert.equal(g.state.waiting.type,'text');drain(g);assert.equal(g.state.waiting.type,'choice');assert.equal(g.state.inventory.torch,2);g.dispatch({type:'choose',id:'use'});assert.equal(g.state.inventory.torch,1);
});
test('unknown or random script effects are conservative and inspection never changes state or randomness',()=>{
 const g=start([{op:'random.set',target:'vars.roll',min:1,max:2}]);const before=g.save();g.random=()=>{throw Error('inspection rolled randomness');};
 assert.equal(inspectScript(g,'note').consumes,true);assert.equal(commandTargets(g)[0].actions[0].consumes,true);assert.equal(g.save(),before);
});
test('multiple objects have equal standing and choosing a single free action runs it',()=>{
 const g=start(undefined,[note(),note('other',{x:2,y:0,edge:undefined})]);g.data.maps.region_1_f1.objects[1].y=1;
 assert.ok(open(g));assert.equal(commandDialog(g).text,'何を調べる？');target(g,'object:other');assert.equal(g.state.waiting.type,'text');assert.equal(g.state.events['region_1_f1/other'],1);assert.equal(g.state.events['region_1_f1/note'],undefined);
});
test('unavailable reasons can be reread manually and newly enabled actions become candidates',()=>{
 const g=start(undefined,[note('note',{visibleWhen:true,condition:{ref:'flags.allowed'}})]);g.state.flags.allowed=false;
 assert.ok(open(g));assert.equal(commandDialog(g).options[0].enabled,false);pick(g,o=>o.id==='cancel');assert.equal(commandTargets(g).length,0);
 assert.ok(open(g,'inspect'));target(g,'object:note');assert.match(commandDialog(g).options[0].requirement,/実行条件/);pick(g,o=>o.id==='cancel');pick(g,o=>o.id==='cancel');
 g.state.flags.allowed=true;assert.equal(commandTargets(g).length,1);assert.ok(open(g));assert.equal(g.state.waiting.type,'text');
});
test('completed one-time objects stay available manually without duplicating rewards; hidden ones never leak',()=>{
 const g=start([{op:'item.give',item:'torch'}],[note('note',{once:true}),note('secret',{visibleWhen:false})]);const before=g.state.inventory.torch;
 assert.ok(open(g));drain(g);assert.equal(g.state.inventory.torch,before+1);assert.ok(!commandTargets(g,'inspect').some(t=>t.id==='object:secret'));
 assert.ok(open(g,'inspect'));target(g,'object:note');const disabled=commandDialog(g).options[0];assert.equal(disabled.enabled,false);assert.equal(g.dispatch({type:'choose',id:disabled.id}),false);assert.equal(g.state.inventory.torch,before+1);
});
test('facing or location changes invalidate a saved action selection',()=>{
 const g=start([{op:'item.take',item:'torch'}]);g.state.inventory.torch=2;open(g);const id=commandDialog(g).options[0].id;g.state.location.facing='east';assert.equal(g.dispatch({type:'choose',id}),false);assert.equal(g.state.inventory.torch,2);
});
test('edge objects require standing on the owner cell facing its edge, in collection, execution and rendering',()=>{
 const g=start(undefined,[note('note',{edge:'north'})]);assert.equal(commandTargets(g).length,1);let m=projectGame(g);assert.ok(visibleDungeonObjects(m.dungeon).some(o=>o.id==='note'));
 g.state.location.facing='east';assert.equal(commandTargets(g).length,0);assert.equal(g.trigger('interact','note'),false);assert.ok(!visibleDungeonObjects(projectGame(g).dungeon).some(o=>o.id==='note'));
 g.state.location.y=2;g.state.location.facing='north';assert.equal(commandTargets(g).length,0);
 for(const face of ['north','east','south','west'])assert.equal(closeTo({location:{map:'m',x:1,y:1,facing:face}},{map:'m',x:1,y:1,edge:face}),true);
});
test('a cell brazier and facing edge torch are separate candidates; light and protection do not depend on facing',()=>{
 const d=structuredClone(data),fires=d.dungeons.kagaribi.systems.fires;fires.fixtures.push({...fires.fixtures[0],id:'edge_test',name:'壁灯試験',edge:'north'});
 const g=new GameEngine(d);drain(g);g.dispatch({type:'travel',dungeon:'kagaribi'});g.state.location.facing='north';
 assert.ok(commandTargets(g).some(t=>t.id==='["fires","entry"]'));assert.ok(commandTargets(g).some(t=>t.id==='["fires","edge_test"]'));assert.ok(open(g));assert.equal(commandDialog(g).text,'何を調べる？');pick(g,o=>o.id==='cancel');
 const before=projectGame(g).dungeon.cells[1][1].illumination;g.state.location.facing='east';assert.ok(!commandTargets(g).some(t=>t.id==='["fires","edge_test"]'));assert.equal(projectGame(g).dungeon.cells[1][1].illumination,before);
});
test('consumption metadata covers MP, HP, gold, inventory, ember and limited repair charges',()=>{
 const ctx={state:{inventory:{oil:3}}};for(const [intent,plan] of [[{action:'skill'},{ability:{mp:2}}],[{action:'open'},{ability:{hp:1}}],[{action:'buy'},{offer:{gold:3}}],[{action:'collect'},{inventory:{oil:2}}],[{action:'transplant'},{}],[{action:'repair'},{}]])assert.equal(actionConsumes(ctx,intent,plan),true);
 assert.equal(actionConsumes(ctx,{action:'close'},{}),false);
});
test('malformed inspection saves and invalid edge definitions are rejected',()=>{
 const g=start();for(const change of [s=>s.inspections=null,s=>s.inspections.x='bad',s=>s.inspectionActive={record:'map/object',script:'missing',args:{}},s=>s.inspectionActive={record:'map/object',script:'note',args:{map:'bad',object:'bad'}}]){const payload=JSON.parse(g.save());change(payload.state);assert.ok(validateSave(payload,g.data).some(e=>e.includes('調査')));}
 for(const edge of ['up','north']){const d=structuredClone(data);d.maps.region_1_f1.objects[0].edge=edge;d.maps.region_1_f1.objects[0].trigger='enter';assert.ok(validateContent(d).some(e=>e.includes('エッジ')));}
});

test('a lone MP-consuming torch skill still waits for selection and rechecks MP at confirmation',()=>{
 const d=structuredClone(data),g=new GameEngine(d);drain(g);g.dispatch({type:'job.change',actor:'ada',job:'lantern_keeper'});g.dispatch({type:'travel',dungeon:'kagaribi'});g.teleport('kagaribi_f2',1,1,'north');g.state.inventory.torch=0;
 const t=commandTargets(g).find(t=>t.id==='["fires","landing"]'),actions=t.actions.filter(a=>a.enabled);assert.equal(actions.length,1);assert.equal(actions[0].intent.ability,'kuragari_ward');const mp=g.state.actors.ada.mp;
 open(g);target(g,t.id);assert.equal(g.state.actors.ada.mp,mp);restore(g);const option=commandDialog(g).options.find(o=>o.enabled&&o.intent?.ability==='kuragari_ward');g.state.actors.ada.mp=0;assert.equal(g.dispatch({type:'choose',id:option.id}),false);g.state.actors.ada.mp=mp;assert.ok(g.dispatch({type:'choose',id:option.id}));assert.equal(g.state.actors.ada.mp,mp-3);
});

test('writes that change a later branch cannot hide a resource cost from the initial selection',()=>{
 const g=start([{op:'flag.set',key:'ready',value:true},{op:'if',condition:{ref:'flags.ready'},then:[{op:'item.take',item:'torch'}],else:[]}]);g.state.inventory.torch=2;
 open(g);assert.equal(g.state.flags.ready,undefined);assert.equal(g.state.inventory.torch,2);assert.equal(commandDialog(g).type,'choice');act(g);assert.equal(g.state.flags.ready,true);assert.equal(g.state.inventory.torch,1);
});

test('a description unlocked by inspection is not marked read before it has been displayed',()=>{
 const g=start([{op:'if',condition:{ref:'flags.read'},then:[{op:'narrate',text:'新しく読める裏面。'}],else:[{op:'narrate',text:'表面を読んだ。'},{op:'flag.set',key:'read',value:true}]}]);
 open(g);assert.equal(g.state.waiting.text,'表面を読んだ。');drain(g);assert.equal(commandTargets(g).length,1);open(g);assert.equal(g.state.waiting.text,'新しく読める裏面。');drain(g);assert.equal(commandTargets(g).length,0);
});
