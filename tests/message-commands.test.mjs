import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {commandDialog,commandTargets} from '../src/core/player-commands.js';
import {validateSave} from '../src/core/save.js';
import {GameView} from '../src/view/view.js';
import {installDOM} from './view-dom.mjs';

const start=(dungeon='region_1')=>{const g=newGame();g.random=()=>.999999;assert.ok(g.dispatch({type:'travel',dungeon}));return g;};
const open=(g,id='interact')=>assert.ok(g.dispatch({type:'player.command',id}));
const pick=(g,text)=>{const o=projectGame(g).dialog.options.find(o=>o.text===text);assert.ok(o,`visible choice: ${text}`);assert.ok(g.dispatch({type:'choose',id:o.id}));};
const stable=g=>structuredClone({location:g.state.location,mode:g.state.mode,steps:g.state.steps,light:g.state.light,gold:g.state.gold,inventory:g.state.inventory,dungeons:g.state.dungeons,events:g.state.events,quests:g.state.quests,actors:g.state.actors});
const roundtrip=g=>{const saved=g.save();assert.deepEqual(validateSave(JSON.parse(saved),g.data),[]);g.load(saved);assert.equal(g.save(),saved);};

test('inspect a valve, reject other commands, drain it and read the result in the message window',()=>{
 const g=start();g.teleport('region_1_f1',2,1,'east');const before=stable(g);open(g,'inspect');pick(g,'第一水路の給排水盤');
 let m=projectGame(g);assert.match(m.dialog.text,/第一水路.*完全水没/s);assert.ok(m.commands.actions.every(c=>!c.enabled));assert.deepEqual(stable(g),before);
 for(const intent of [{type:'move',direction:'forward'},{type:'player.command',id:'retreat'},{type:'interact'},{type:'retreat'},{type:'item',item:'potion',actor:'ada'},{type:'dungeon.action',system:'water',action:'close',target:'upper_gate'},{type:'advance'}])assert.equal(g.dispatch(intent),false);
 assert.deepEqual(stable(g),before);roundtrip(g);pick(g,'給水を止めて排水');
 assert.equal(g.state.dungeons.persistent.region_1.systems.water.controls.upper_gate,false);assert.equal(g.state.steps,before.steps);assert.equal(g.state.light,before.light);
 m=projectGame(g);assert.equal(m.dialog.type,'text');assert.match(m.dialog.text,/排水した/);roundtrip(g);drain(g);assert.equal(g.state.waiting,null);
 open(g,'inspect');pick(g,'第一水路の給排水盤');const disabled=projectGame(g).dialog.options.find(o=>o.text==='給水を止めて排水');assert.equal(disabled.enabled,false);assert.equal(g.dispatch({type:'choose',id:disabled.id}),false);pick(g,'対象一覧へ戻る');pick(g,'離れる');
});

test('return confirmation cancels without cost, survives saving and charges once at confirmation',()=>{
 const g=start(),before=stable(g),cost=Math.ceil(g.state.gold*data.system.retreatGoldRate*g.partyEffect('retreatCost'));
 open(g,'retreat');assert.match(projectGame(g).dialog.text,new RegExp(`${cost}G`));assert.deepEqual(stable(g),before);roundtrip(g);pick(g,'やめる');assert.deepEqual(stable(g),before);
 open(g,'retreat');pick(g,'帰還する');assert.equal(g.state.mode,'town');assert.equal(g.state.gold,before.gold-cost);assert.equal(projectGame(g).dialog.type,'text');
 const paid=g.state.gold;assert.equal(g.dispatch({type:'choose',id:'confirm'}),false);roundtrip(g);drain(g);assert.equal(g.state.gold,paid);assert.equal(g.state.waiting,null);
});

test('overlapping valve and accepted observation are both reachable; unaccepted and remote targets stay hidden',()=>{
 const g=start();g.teleport('region_1_f1',2,1,'east');assert.ok(!commandTargets(g).some(t=>t.id.startsWith('quest:')));g.state.vars.region_1=3;assert.ok(g.accept('q010'));open(g);
 assert.ok(projectGame(g).dialog.options.some(o=>o.text==='第一水路の給排水盤'));assert.ok(projectGame(g).dialog.options.some(o=>o.text==='排水された横道'));
 roundtrip(g);pick(g,'排水された横道');assert.equal(g.state.waiting.type,'text');drain(g);
 assert.equal(g.state.quests.q010.stage,'active');assert.equal(g.state.quests.q010.outcome,null);
 g.teleport('region_1_f1',5,1,'east');assert.ok(!commandTargets(g).some(t=>t.id.startsWith('quest:')));
});

test('saved prompts rebuild current plans and cannot inject actions or use stale distant targets',()=>{
 const g=start();g.teleport('region_1_f1',2,1,'east');open(g,'inspect');pick(g,'第一水路の給排水盤');const old=projectGame(g).dialog.options.find(o=>o.text==='給水を止めて排水').id;
 const bad=JSON.parse(g.save());bad.state.waiting.intent={type:'retreat'};assert.ok(validateSave(bad,data).length);
 g.state.location.x=5;assert.equal(g.dispatch({type:'choose',id:old}),false);assert.equal(g.state.dungeons.persistent.region_1.systems.water.controls.upper_gate,true);pick(g,'対象一覧へ戻る');pick(g,'離れる');
});

test('portable torch choices are commands and opening or cancelling them cannot trigger danger or burn fuel',()=>{
 const g=start('kagaribi');g.state.dungeons.active.systems.fires.portable.lit=false;const before=stable(g);
 open(g,'portable');assert.match(projectGame(g).dialog.text,/携帯松明/);assert.equal(g.state.battle,null);pick(g,'離れる');assert.deepEqual(stable(g),before);assert.equal(g.state.battle,null);
 open(g,'portable');const o=projectGame(g).dialog.options.find(o=>o.text.startsWith('普通の火を灯す'));assert.ok(g.dispatch({type:'choose',id:o.id}));assert.equal(g.state.dungeons.active.systems.fires.portable.lit,true);drain(g);
});

test('all nearby system actions remain reachable through inspect or a player command',()=>{
 for(const id of Object.keys(data.dungeons)){
  const g=start(id),m=projectGame(g),targets=['inspect','portable','environment'].flatMap(c=>commandTargets(g,c));
  const all=m.dungeon.systems.flatMap(s=>[...(s.actions??[]),...(s.cards??[]).flatMap(c=>c.actions),...(s.controls??[]).flatMap(c=>c.actions),...(s.fixtures??[]).flatMap(c=>c.actions),...(s.walls??[]).filter(w=>!w.broken).flatMap(c=>c.actions),...(s.portable?.actions??[])]);
  for(const action of all)assert.ok(targets.some(t=>t.actions.some(a=>JSON.stringify(a.intent)===JSON.stringify(action.intent))),`${id}: ${action.label}`);
 }
});

test('scenario choices retain resolved text and speaker across save, hide secret options and reject advance',()=>{
 const d=structuredClone(data);d.scripts.message_test={commands:[{op:'say',name:'灯番',text:'この弁を閉じるか？'},{op:'choice',options:[{id:'yes',text:'閉じる',commands:[{op:'say',text:'弁を閉じた。'}]},{id:'locked',text:'封印を解く',condition:false,commands:[]},{id:'secret',text:'未発見の通路',visibleWhen:false,commands:[]}]}]};
 const g=new GameEngine(d);drain(g);g.run('message_test');g.dispatch({type:'advance'});roundtrip(g);
 const m=projectGame(g);assert.equal(m.dialog.type,'choice');assert.equal(m.dialog.text,'この弁を閉じるか？');assert.equal(m.dialog.speaker,'灯番');assert.deepEqual(m.dialog.options.map(o=>o.id),['yes','locked']);
 assert.equal(g.dispatch({type:'advance'}),false);assert.equal(g.dispatch({type:'choose',id:'locked'}),false);assert.equal(g.dispatch({type:'choose',id:'secret'}),false);pick(g,'閉じる');assert.equal(projectGame(g).dialog.text,'弁を閉じた。');
});

test('rendered exploration has one command window and choices are inside the message window with their text',()=>{
 const dom=installDOM();
 try{
  const g=start();g.teleport('region_1_f1',2,1,'east');const intents=[],view=Object.assign(Object.create(GameView.prototype),{act:i=>{intents.push(i);g.dispatch(i);},scene(){}}),root=dom.root;
  view.explore(root,projectGame(g));assert.equal(root.querySelectorAll('[aria-label="プレイヤーコマンド"]').length,1);assert.equal([...root.querySelectorAll('[aria-label]')].filter(e=>['水路の給排水','区画の出入口','依頼と現地の調査'].includes(e.getAttribute('aria-label'))).length,0);
  [...root.querySelectorAll('button')].find(e=>e.textContent==='任意調べる').click();assert.deepEqual(intents.at(-1),{type:'player.command',id:'inspect'});pick(g,'第一水路の給排水盤');
  const message=dom.document.createElement('div');view.dialog(message,projectGame(g).dialog);const window=message.children[0];assert.equal(window.getAttribute('aria-label'),'メッセージウィンドウ');assert.match(window.textContent,/完全水没/);assert.ok([...window.querySelectorAll('button')].some(e=>e.textContent==='給水を止めて排水'));assert.ok(!window.querySelector('.continue'));
 }finally{dom.restore();}
});

test('minimap renders edge torches alongside the cell marker and player direction',()=>{
 const dom=installDOM();try{const g=start('kagaribi');g.teleport('kagaribi_f2',1,1,'north');const m=projectGame(g),view=Object.create(GameView.prototype);view.sidebar(dom.root,m);const marker=dom.root.querySelector('.map-edge-marker.north');assert.ok(marker);assert.match(marker.getAttribute('aria-label'),/壁面松明/);assert.ok(marker.parentElement.classList.contains('current'));assert.ok(marker.parentElement.textContent.includes('↑'));}finally{dom.restore();}
});
