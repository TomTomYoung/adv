import test from 'node:test';
import assert from 'node:assert/strict';
import {data,newGame,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {validateContent} from '../src/core/validation.js';
import {validateSave} from '../src/core/save.js';
import {installDOM} from './view-dom.mjs';
import {appendSceneCast} from '../src/view/scene-cast.js';
import {messagePages,pageAtOffset} from '../src/view/message-pages.js';

function fixture(){
 const d=structuredClone(data);d.scripts.stage_test={commands:[
  {op:'scene.cast',cast:[{character:'elder',display:{x:23,layer:1}},{character:'rookie',display:{x:40,flip:true,layer:2}},{character:'rine',display:{position:'right',layer:3}}]},
  {op:'say',character:'elder',text:'戻ってきた。'},
  {op:'say',character:'rine',text:'帰還を記録します。'},
  {op:'choice',options:[{id:'yes',text:'報告する',commands:[{op:'scene.cast',mode:'cards',cast:[{character:'rine'}]},{op:'say',character:'rine',text:'記録しました。'},{op:'scene.cast.clear'},{op:'say',text:'会話を終えた。'}]}]}
 ]};const g=new GameEngine(d);drain(g);g.run('stage_test');return g;
}
test('cast staging and the speaker survive text, choices and save/load without changing physical locations',()=>{
 const g=fixture(),before=JSON.stringify([g.state.townLocation,g.state.stories]);let m=projectGame(g);
 assert.equal(m.dialog.speaker,'老灯番');assert.equal(m.dialog.scene.speakerId,'elder');assert.equal(m.dialog.scene.cast[1].display.flip,true);
 const saved=g.save();assert.deepEqual(validateSave(JSON.parse(saved),g.data),[]);g.load(saved);assert.deepEqual(projectGame(g).dialog,m.dialog);
 g.dispatch({type:'advance'});g.dispatch({type:'advance'});m=projectGame(g);assert.equal(m.dialog.type,'choice');assert.equal(m.dialog.scene.speakerId,'rine');assert.equal(m.dialog.scene.cast.length,3);
 const choice=g.save();g.load(choice);g.dispatch({type:'choose',id:'yes'});assert.equal(projectGame(g).dialog.scene.mode,'cards');
 g.dispatch({type:'advance'});assert.equal(projectGame(g).dialog.scene,undefined);g.dispatch({type:'advance'});assert.equal(g.state.presentation.cast,undefined);
 assert.equal(JSON.stringify([g.state.townLocation,g.state.stories]),before);
});
test('cast and speaker snapshots are detached from scenario and save state',()=>{
 const g=fixture(),save=g.save(),m=projectGame(g);m.dialog.scene.cast[0].display.x=99;m.dialog.scene.cast.pop();assert.equal(g.save(),save);assert.equal(projectGame(g).dialog.scene.cast[0].display.x,23);
});
test('bad character references, duplicate cast, invalid coordinates and corrupted saved presentation are rejected',()=>{
 for(const mutate of [c=>c.cast[0].character='missing',c=>c.cast.push(c.cast[0]),c=>c.cast[0].display.x=120,c=>c.cast[0].display.flip='yes',c=>c.cast[0].display.asset='missing',c=>c.mode='unknown']){
  const g=fixture();mutate(g.data.scripts.stage_test.commands[0]);assert.ok(validateContent(g.data).some(e=>e.includes('人物演出')));
 }
 const g=fixture(),saved=JSON.parse(g.save());saved.state.presentation.cast.cast[0].character='missing';assert.ok(validateSave(saved,g.data).some(e=>e.includes('人物演出')));
});
test('q001 groups the rescued pair on the left and the union contact on the right in source and distribution',async()=>{
 const draft=(await import('../authoring/story-q001.mjs')).default,scene=data.quests.q001.story.scenes.post;
 assert.deepEqual(scene.cast,draft.story.scenes.post.cast);assert.ok(scene.cast.find(c=>c.entity==='elder').display.x<50);assert.ok(scene.cast.find(c=>c.entity==='rookie').display.x<50);assert.ok(scene.cast.find(c=>c.entity==='rine').display.x>50);
 for(const id of ['entry','old','rescue','post'])assert.ok(data.scripts[`q001.v11.${id}`].commands.some(c=>c.character));
});
test('speaking changes overlap order without moving people, flipping captions or removing card mode',()=>{
 const dom=installDOM();try{const g=fixture(),scene=projectGame(g).dialog.scene;appendSceneCast(dom.root,scene);
 const elder=dom.root.querySelector('[data-character="elder"]'),rookie=dom.root.querySelector('[data-character="rookie"]');assert.equal(elder.style.left,'23%');assert.ok(Number(elder.style.zIndex)>Number(rookie.style.zIndex));assert.equal(rookie.querySelector('img').style.transform,'scaleX(-1)');assert.equal(rookie.querySelector('figcaption').style.transform,undefined);
 dom.root.replaceChildren();appendSceneCast(dom.root,{...scene,speakerId:'rookie'});assert.equal(dom.root.querySelector('[data-character="elder"]').style.left,'23%');assert.ok(Number(dom.root.querySelector('[data-character="rookie"]').style.zIndex)>100);
 dom.root.replaceChildren();appendSceneCast(dom.root,{...scene,mode:'cards'});assert.equal(dom.root.querySelectorAll('.story-person').length,3);
 }finally{dom.restore();}
});
test('measured pagination preserves graphemes and newlines and anchors resized pages to the current text',()=>{
 const text=('一行目。\n\n👨‍👩‍👧‍👦と灯🕯️。\n').repeat(12),parts=messagePages(text,s=>[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(s)].length<=18);
 assert.equal(parts.join(''),text);assert.ok(parts.every(p=>!p.startsWith('\u200d')&&!p.endsWith('\u200d')));
 const offset=parts[0].length+parts[1].length,wide=messagePages(text,35),page=pageAtOffset(wide,offset);assert.ok(wide.slice(0,page).join('').length<=offset);assert.ok(wide.slice(0,page+1).join('').length>offset);
});
