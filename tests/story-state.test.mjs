import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import zlib from 'node:zlib';
import {data,newGame,drain,fight} from './helpers.mjs';
import {prepareQuest,finishJourney} from './structure-routes.mjs';
import {applyStoryAction,storyPlace,storyStateErrors} from '../src/core/story.js';
import {projectGame} from '../src/application/projection.js';
import {validateContent} from '../src/core/validation.js';
import {PaintCore} from '../tools/assets/vendor/AIPaint/src/core.js';
const choose=(g,...ids)=>{for(const id of ids){assert.ok(g.dispatch({type:'choose',id}),id);drain(g);}};
const state=(g,id)=>g.state.stories[id];
const sha=b=>createHash('sha256').update(b).digest('hex');


test('failed movement, transfer, observation and invariant violations are atomic, including costs',()=>{
 for(const effects of [
  [{op:'move',entities:['elder'],path:['branch','entry','post']}],
  [{op:'transfer',entity:'newBottle',from:'rookie',to:'elder'}],
  [{op:'observe',observer:'party',proposition:'position',source:'elder',requires:true}],
  [{op:'set',key:'newOil',value:0}],
  [{op:'set',key:'partyAt',value:'branch'}],
  [{op:'move',entities:['party'],path:['entry','post','branch']}]
 ]){
  const g=prepareQuest('q001'),d=structuredClone(data);g.data=d;d.quests.q001.story.actions.invalid={from:['entry'],to:'entry',requires:true,cost:{gold:10,rope:1},effects};const before=g.save();
  assert.throws(()=>applyStoryAction(g,'q001','invalid'));assert.equal(g.save(),before);
 }
});
test('q004 sisters converse through a window but cannot exchange items across the cell',()=>{
 const g=prepareQuest('q004');choose(g,'window');finishJourney(g);const cast=projectGame(g).dialog.scene.cast;assert.equal(cast.find(c=>c.id==='sister').remote,true);assert.equal(state(g,'q004').values.sisterAt,'cell');
 choose(g,'fine');assert.equal(state(g,'q004').values.sisterAt,'desk');choose(g,'leave');finishJourney(g);choose(g,'finish');assert.equal(state(g,'q004').values.sisterAt,'outside');assert.equal(state(g,'q004').values.originalAt,'sister');assert.equal(g.state.quests.q004.outcome,'compromise');
});
test('q007 brother appears only after discovery, and letters alone do not move him',()=>{
 const g=prepareQuest('q007');assert.deepEqual(projectGame(g).dialog.scene.cast.map(c=>c.id),['mire']);assert.equal(JSON.stringify(projectGame(g).dialog).includes('弟'),false);
 choose(g,'trace','letters','finish');assert.equal(state(g,'q007').values.brotherAt,'booth');assert.equal(state(g,'q007').values.lettersAt,'mire');assert.equal(state(g,'q007').values.met,false);
});
test('q008 postponed funeral retains body inside coffin; food travels to recipient',()=>{
 const g=prepareQuest('q008');choose(g,'inspect','quiet','deliver');const s=state(g,'q008'),d=data.quests.q008.story;
 assert.equal(s.values.bodyAt,'coffin');assert.equal(storyPlace(d,s,'body'),'mortuary');assert.equal(storyPlace(d,s,'food'),'jetty');assert.equal(s.values.funeral,false);
});
test('q009 moving grain preserves completed cleaning agreement and sealed holes',()=>{
 const g=prepareQuest('q009');choose(g,'trace','zones','granary','holes','grain');const v=state(g,'q009').values;
 assert.equal(v.zones,true);assert.equal(v.holes,true);assert.equal(v.grainAt,'clerks');assert.equal(v.verified,false);
});
test('q010 arrival counts, evidence, partial closure and pump handover remain independent',()=>{
 const g=prepareQuest('q010');choose(g,'shaft','near','book');const checkpoint=g.save();assert.equal(g.dispatch({type:'choose',id:'all'}),false);
 choose(g,'partial');assert.equal(state(g,'q010').values.deepPeopleAt,'deep');assert.equal(state(g,'q010').values.bookAt,'rine');
 g.load(checkpoint);choose(g,'pump');assert.equal(state(g,'q010').values.crewAt,'control');assert.equal(state(g,'q010').values.deepSaved,false);assert.equal(state(g,'q010').values.closed,false);
 g.load(checkpoint);choose(g,'deep','all','rescue');assert.equal(g.state.quests.q010.outcome,'rescued');assert.equal(state(g,'q010').values.testimony,false);
});
test('new story save rejects out-of-domain flags, invented knowledge, inconsistent cast and completion atomically',()=>{
 const g=prepareQuest('q001'),before=g.save();
 for(const mutate of [s=>s.values.newOil=-1,s=>s.values.newOil=3,s=>s.values.extra=true,s=>s.values.elderAt='missing',s=>s.values.rookieAt='post',s=>s.knowledge.party=['invented'],s=>s.scene='old',s=>s.events=['missing']]){
  const save=JSON.parse(before);mutate(save.state.stories.q001);assert.throws(()=>g.load(JSON.stringify(save)));assert.equal(g.save(),before);
 }
 assert.throws(()=>g.complete('q001','informed'));assert.equal(g.save(),before);
 const save=JSON.parse(before);save.state.quests.q001={stage:'completed',outcome:'informed',evidence:[]};assert.throws(()=>g.load(JSON.stringify(save)));assert.equal(g.save(),before);
});
test('authored model validation rejects unknown state refs, missing evidence source and disconnected travel',()=>{
 for(const mutate of [d=>d.actions.entry_talk.requires={op:'eq',left:{ref:'stories.q001.values.typo'},right:true},d=>d.actions.entry_talk.depart[0].source='nobody',d=>d.actions.entry_talk.effects=[{op:'move',entities:['party'],path:['branch','post']}],d=>delete d.endings.informed]){
  const copy=structuredClone(data);mutate(copy.quests.q001.story);assert.ok(validateContent(copy).some(e=>e.startsWith('q001')));
 }
});

test('all 36 shipped AIPaint PNGs match editable projects and replayed commands',async()=>{
 const root=new URL('../',import.meta.url),manifest=JSON.parse(await fs.readFile(new URL('assets/source/characters/manifest.json',root)));
 assert.equal(manifest.files.length,36);assert.equal(sha(await fs.readFile(new URL('tools/assets/vendor/AIPaint/src/core.js',root))),manifest.engine.coreSha256);
 for(const file of manifest.files){
  const [image,project,commands]=await Promise.all([file.png,file.project,file.commands].map(f=>fs.readFile(new URL(f,root))));
  assert.equal(sha(image),file.sha256.png);assert.equal(sha(project),file.sha256.project);assert.equal(sha(commands),file.sha256.commands);
  const native=PaintCore.fromProject(JSON.parse(project)),batch=JSON.parse(commands),replay=new PaintCore({documentId:batch.documentId,width:batch.width,height:batch.height});
  for(const b of batch.batches)replay.applyBatch(b);assert.deepEqual(replay.composite(),native.composite(),file.id);
  const compressed=[];for(let p=8;p<image.length;){const n=image.readUInt32BE(p);if(image.toString('ascii',p+4,p+8)==='IDAT')compressed.push(image.subarray(p+8,p+8+n));p+=12+n;}
  const pixels=native.composite().data,raw=zlib.inflateSync(Buffer.concat(compressed)),stride=file.width*4;
  for(let y=0;y<file.height;y++){assert.equal(raw[y*(stride+1)],0);assert.deepEqual(raw.subarray(y*(stride+1)+1,(y+1)*(stride+1)),Buffer.from(pixels.subarray(y*stride,(y+1)*stride)),file.id);}
 }
});
