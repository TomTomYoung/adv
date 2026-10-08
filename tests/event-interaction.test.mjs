import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {canInteractAt} from '../src/core/event-interaction.js';
import {projectQuestObjects,questEventPlan} from '../src/core/quest-events.js';
import {commandTargets,commandDialog} from '../src/core/player-commands.js';
import {projectDungeonEvents} from '../src/application/dungeon-projection.js';
import {projectGame} from '../src/application/projection.js';
import {validateContent} from '../src/core/validation.js';
import {validateSchema} from '../config/shared/schema.js';

function setup(trigger='interact',interactionRange,edge){
  const d=structuredClone(data),map=d.maps.region_2_f1;
  for(const m of Object.values(d.maps))m.objects=m.objects.filter(o=>!o.quest);
  map.objects=[];map.encounterRate=0;map.cells.edges={};
  d.dungeons.region_2.systems={};d.dungeons.region_2.fieldEvents=[];
  const event={id:'range_test',title:'操作位置の調査',kind:'clue',trigger,points:[{map:map.id,x:2,y:1,...edge?{edge}:{}}],script:'q021.range_test',...(interactionRange!==undefined?{interactionRange}:{})};
  d.quests.q021.events=[event];d.quests.q021.requires=true;d.scripts[event.script]=d.quests.q021.scripts[event.script]={commands:[{op:'add',target:'vars.rangeHits',value:1}]};
  projectQuestObjects(d);
  const g=new GameEngine(d);drain(g);assert.ok(g.accept('q021'));g.teleport(map.id,1,1,'east');
  g.state.discovered[map.id]=['1,1','2,1','3,1'];
  return {g,d,map,event};
}
const targetId=trigger=>trigger==='action'?'quest:q021:range_test':'object:range_test';
const execute=(g,trigger)=>trigger==='action'?g.dispatch({type:'quest.event',quest:'q021',id:'range_test'}):g.trigger('interact','range_test');

for(const trigger of ['interact','action'])for(const [range,here,front] of [[undefined,true,false],['here',true,false],['front',false,true],['here-or-front',true,true]]){
  test(`${trigger}/${range??'default'} uses the same range in both menus, projection and execution`,()=>{
    const {g,d}=setup(trigger,range);
    for(const [x,facing,allowed] of [[1,'east',front],[1,'west',false],[3,'east',false],[2,'west',here]]){
      g.state.location={map:'region_2_f1',x,y:1,facing};
      for(const mode of ['interact','inspect'])assert.equal(commandTargets(g,mode).some(t=>t.id===targetId(trigger)),allowed,`${x}/${facing}/${mode}`);
      if(trigger==='action'){
        assert.equal(questEventPlan(d,g.state,'q021','range_test').ok,allowed);
        assert.equal(projectDungeonEvents(g,[]).scenes.length>0,allowed);
      }else assert.equal(g.interactionObjects().some(o=>o.id==='range_test'),allowed);
      const hits=g.state.vars.rangeHits??0;
      assert.equal(execute(g,trigger),allowed);assert.equal(g.state.vars.rangeHits??0,hits+Number(allowed));
    }
  });
}

test('a visible cell event stays on the map ahead but cannot be run until arrival, including after save/load',()=>{
  const {g}=setup();
  assert.ok(projectGame(g).dungeon.objects.some(o=>o.id==='range_test'));
  const saved=g.save();g.load(saved);
  assert.equal(commandTargets(g,'inspect').some(t=>t.id==='object:range_test'),false);
  assert.equal(g.trigger('interact','range_test'),false);assert.equal(g.state.vars.rangeHits,undefined);
  assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.equal(g.state.vars.rangeHits,undefined);
  assert.ok(g.trigger('interact','range_test'));assert.equal(g.state.vars.rangeHits,1);
});

for(const trigger of ['interact','action'])test(`${trigger}: edge targets require their authored cell and facing; front ranges cannot inspect through opaque boundaries`,()=>{
  const {g,d,map,event}=setup(trigger,'here-or-front','north');
  assert.equal(execute(g,trigger),false);
  g.state.location.x=2;g.state.location.facing='east';assert.equal(execute(g,trigger),false);
  g.state.location.facing='north';assert.ok(execute(g,trigger));
  delete event.points[0].edge;
  const object=map.objects.find(o=>o.id==='range_test');if(object)delete object.edge;
  g.state.location={map:map.id,x:1,y:1,facing:'east'};
  d.edgeTypes.range_wall={passage:'#',visual:{wall:true,opaque:true},parameters:{water_passable:false}};
  map.cells.edges={'v:2,1':{preset:'range_wall'}};
  assert.equal(commandTargets(g,'inspect').some(t=>t.id===targetId(trigger)),false);
  assert.equal(execute(g,trigger),false);
  delete map.cells.edges['v:2,1'];
  assert.ok(execute(g,trigger));
});

test('interaction ranges do not enable remote entry triggers or change map/height restrictions',()=>{
  const {g,d,map}=setup('enter');
  assert.equal(g.trigger('enter','range_test'),false);assert.equal(g.state.vars.rangeHits,undefined);
  assert.ok(g.dispatch({type:'move',direction:'forward'}));assert.equal(g.state.vars.rangeHits,1);
  const point={map:map.id,x:2,y:1};
  assert.equal(canInteractAt(d,g.state,{...point,map:'kagaribi_f1'},'here-or-front'),false);
  assert.equal(canInteractAt(d,g.state,{...point,z:1},'here-or-front'),false);
  assert.equal(canInteractAt(d,g.state,point,'invalid'),false);
});

test('a previously displayed target cannot bypass a changed interaction range',()=>{
  const {g,map}=setup('interact','here-or-front');
  assert.ok(g.dispatch({type:'player.command',id:'inspect'}));
  const selection=commandDialog(g).options.find(o=>o.target==='object:range_test');
  map.objects.find(o=>o.id==='range_test').interactionRange='here';
  assert.equal(g.dispatch({type:'choose',id:selection.id}),false);
  assert.equal(g.state.vars.rangeHits,undefined);
});

test('raw map objects share the event range gate',()=>{
  const {g,map}=setup();
  const object=map.objects.find(o=>o.id==='range_test');delete object.quest;object.interactionRange='front';
  assert.ok(g.trigger('interact',object.id));g.state.location.x=2;
  assert.equal(g.trigger('interact',object.id),false);
});

test('runtime and authoring schemas reject invalid ranges and ranges on enter/auto triggers',async()=>{
  const {d,event}=setup('action');
  const schema=JSON.parse(await fs.readFile(new URL('../data/schemas/quest-events.schema.json',import.meta.url)));
  const mapSchema=JSON.parse(await fs.readFile(new URL('../data/schemas/map.schema.json',import.meta.url)));
  for(const [trigger,range] of [['action','bad'],['enter','front'],['auto','here']]){
    event.trigger=trigger;event.interactionRange=range;
    assert.ok(validateContent(d).some(s=>s.includes('操作位置')));
    assert.ok(validateSchema({events:[event],scripts:d.quests.q021.scripts},schema).length);
  }
  const raw=structuredClone(data.maps.region_2_f1);raw.objects=raw.objects.filter(o=>!o.quest);
  raw.objects[0].interactionRange='bad';assert.ok(validateSchema(raw,mapSchema).length);
  raw.objects[0].interactionRange='front';raw.objects[0].trigger='enter';assert.ok(validateSchema(raw,mapSchema).length);
});

test('authored placement policy keeps quest locations local, doors reachable and nearby physical objects explicit',async()=>{
  for(const q of Object.values(data.quests))for(const e of q.events)if(['interact','action'].includes(e.trigger)&&e.points.some(p=>!p.edge))assert.equal(e.interactionRange??'here','here',`${q.id}/${e.id}`);
  for(const map of Object.values(data.maps))for(const o of map.objects.filter(o=>!o.quest&&o.trigger==='interact'&&!o.edge)){
    if(o.kind==='door')assert.equal(o.interactionRange,'front',`${map.id}/${o.id}`);
    if(['chest','fountain'].includes(o.kind))assert.equal(o.interactionRange,'here-or-front',`${map.id}/${o.id}`);
    if(['exit','stairs'].includes(o.kind))assert.equal(o.interactionRange,'here',`${map.id}/${o.id}`);
  }
  for(const file of ['kagaribi-content','dungeon-content','connected-maps','voxel-content']){
    const source=JSON.parse(await fs.readFile(new URL(`../config/${file}.json`,import.meta.url)));
    for(const m of Object.values(source.maps??{}))for(const o of m.objects.filter(o=>o.trigger==='interact'&&!o.edge))assert.ok(o.interactionRange,`${file}/${m.id}/${o.id}`);
  }
});
