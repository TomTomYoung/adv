import test from 'node:test';
import assert from 'node:assert/strict';
import {installDOM} from './view-dom.mjs';
import {data,drain} from './helpers.mjs';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {GameView} from '../src/view/view.js';
import {SceneView} from '../src/view/scene-view.js';
import {layoutFrontlineSprites} from '../src/view/battle-frontline.js';
for(const View of [GameView,SceneView])test(`${View.name}: depth-first formation, no default grid, preview/cancel/commit`,()=>{
 const dom=installDOM();try{
 const g=new GameEngine(structuredClone(data));drain(g);const root=document.createElement('div');document.body.append(root);const v=new View(root,intent=>{const ok=g.dispatch(intent);v.render(projectGame(g));return ok;},{status(){},soundEnabled:()=>false,effectsMode:()=> 'off',menu(){},help(){}});
 const click=key=>{const el=[...root.querySelectorAll('[data-focus]')].find(e=>e.dataset.focus===key);assert.ok(el,key);assert.ok(!el.disabled,key);el.click();};
 v.tab='party';v.render(projectGame(g));const grid=structuredClone(g.state.partyFormation);click('front-formation:open');click('front-formation:ada:1');assert.equal(g.state.partyFrontlineFormation.ada.depth,1);assert.deepEqual(g.state.partyFormation,grid);v.cancel();assert.equal(v.frontlineFormationOpen,false);
 g.startBattle('wild_pair_1',{win:[],lose:[],escape:[]},{battleMode:'frontline'});v.tab='location';v.render(projectGame(g));assert.equal(root.querySelectorAll('.battle-grid-cell').length,0);assert.equal(root.querySelectorAll('.frontline-stage').length,1);const before=g.save();click('skill:guard');const id=projectGame(g).battle.actorId;click('front:choice:actor:'+id);assert.equal(g.save(),before);v.cancel();assert.equal(g.save(),before);click('skill:guard');click('front:choice:actor:'+id);click('front:confirm');assert.notEqual(g.save(),before);v.destroy?.();
 }finally{dom.restore();}
});
test('silhouette layout overlaps actual cropped bounds and preserves scale/aspect at desktop and phone widths',()=>{
 const entries=Array.from({length:5},(_,i)=>({id:'e'+i,depth:0,lane:i,bounds:{width:400,height:300}}));
 for(const width of [1200,390,320]){const layout=layoutFrontlineSprites(entries,width,400);for(let i=0;i<5;i++){const a=layout[i];assert.ok(a.left>=0&&a.left+a.width<=width);assert.ok(Math.abs(a.width/a.height-4/3)<1e-9);if(i){const b=layout[i-1],overlap=b.left+b.width-a.left;assert.ok(Math.abs(overlap/a.width-.33)<1e-9);}}}
 const ranks=layoutFrontlineSprites([0,1,2].map(depth=>({id:'e'+depth,depth,lane:2,bounds:{width:200,height:300}})),1200,400);assert.equal(ranks[1].height/ranks[0].height,.85);assert.ok(Math.abs(ranks[2].height/ranks[0].height-.7)<1e-9);assert.ok(ranks[0].z>ranks[1].z&&ranks[1].z>ranks[2].z);
});
