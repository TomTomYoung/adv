import test from 'node:test';
import assert from 'node:assert/strict';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
import {projectGame} from '../src/application/projection.js';
import {border,go,data,checkpoint} from './pilgrimage-helpers.mjs';

for(const layout of ['classic','scene'])test(`${layout}: plateau board and stone-eye journey work through visible choices`,()=>{
 const g=border(),dom=installDOM();let view;
 const render=()=>view.render(projectGame(g)),dispatch=intent=>{const ok=g.dispatch(intent);render();return ok;};
 const click=label=>{let n=50;while(view.canChoose?.()===false){assert.ok(--n);view.advanceText();}const b=[...dom.root.querySelectorAll('button')].find(b=>b.textContent===label);assert.ok(b,`missing: ${label}`);assert.ok(!b.disabled);b.click();};
 const advance=()=>{let n=100;while(g.state.waiting?.type==='text'){assert.ok(--n);view.advanceText();}};
 const arrive=place=>{go(g,data.quests.q032.story.worldPlaces[place]);render();advance();checkpoint(g);};
 try{
 go(g,{kind:'town',location:'oddland_plateau'});
 view=replaceView(null,layout,dom.root,dispatch,{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();
 click('巡礼台地の依頼所');click('依頼掲示板を見る');const cards=[...dom.root.querySelectorAll('.quest-card')];assert.equal(cards.length,20);
 const card=cards.find(c=>c.textContent.includes('片目の聖像'));assert.ok(card);const button=[...card.querySelectorAll('button')].find(b=>b.textContent==='依頼を受ける');assert.ok(button);button.click();assert.equal(g.state.quests.q032.stage,'active');
 if(layout==='scene')view.closePanel();else click('巡礼台地へ戻る');if(g.state.townLocation!=='oddland_plateau')click('巡礼台地へ戻る');
 arrive('entry');dispatch({type:'story.resume',quest:'q032'});advance();click('覗き窓の行先を確かめ、地下牢へ回る');assert.ok(g.state.journey);checkpoint(g);
 arrive('cell');click('見通せない石の目を用意する');arrive('workshop');click('覗き管を塞いで不透明な目をはめる');assert.equal(g.state.stories.q032.values.stoneAt,'party');checkpoint(g);
 arrive('entry');click('現場の結果を確かめ、依頼を終える');advance();assert.equal(g.state.quests.q032.outcome,'informed');assert.equal(g.state.stories.q032.values.stoneAt,'entry');checkpoint(g);
 go(g,{kind:'dungeon',dungeon:'region_4',map:'region_4_f1',x:1,y:1});render();click('任意調べる');click('地上への階段');click('調べる');advance();assert.equal(g.state.townLocation,'oddland_plateau');checkpoint(g);
 }finally{view?.destroy();dom.restore();}
});
