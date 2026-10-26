import test from 'node:test';
import assert from 'node:assert/strict';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
import {projectGame} from '../src/application/projection.js';
import {ready,go,data,checkpoint} from './royal-helpers.mjs';
for(const layout of ['classic','scene'])test(`${layout}: the forty-job village board, two air rooms, delivery and return use visible controls`,()=>{
 const g=ready(),dom=installDOM();let view;
 const render=()=>view.render(projectGame(g)),dispatch=intent=>{const ok=g.dispatch(intent);render();return ok;};
 const advance=()=>{let n=100;while(g.state.waiting?.type==='text'||g.state.waiting?.type==='command'&&g.state.waiting.command==='result'){assert.ok(--n);view.advanceText();}while(view.canChoose?.()===false){assert.ok(--n);view.advanceText();}};
 const click=label=>{advance();const buttons=[...dom.root.querySelectorAll('button')].filter(b=>b.textContent===label);assert.equal(buttons.length,1,label);assert.ok(!buttons[0].disabled);buttons[0].click();};
 const arrive=place=>{go(g,data.quests.q061.story.worldPlaces[place]);render();advance();checkpoint(g);};
 try{
 go(g,{kind:'town',location:'oddland_village'});view=replaceView(null,layout,dom.root,dispatch,{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();
 click('旧王領の村の依頼所');click('依頼掲示板を見る');const cards=[...dom.root.querySelectorAll('.quest-card')];assert.equal(cards.length,40);
 const card=cards.find(c=>c.textContent.includes(data.quests.q061.title)),accept=[...card.querySelectorAll('button')].find(b=>b.textContent==='依頼を受ける');accept.click();assert.equal(g.state.quests.q061.stage,'active');if(layout==='scene')view.closePanel();else click('旧王領の村へ戻る');
 arrive('entry');dispatch({type:'story.resume',quest:'q061'});advance();click('城内で一本の線を試す');assert.equal(g.state.stories.q061.values.chartAt,'party');arrive('air_one');assert.match(JSON.stringify(projectGame(g)),/沈没城の空気/);click('次の空気室へ図をたどる');arrive('air_two');click('空気溜まりを示す救難図として隊へ引き継ぐ');assert.equal(g.state.stories.q061.values.chartAt,'party');arrive('rescue');assert.equal(g.state.stories.q061.values.chartAt,'rescue');click('現場の結果を確かめ、依頼を終える');advance();assert.equal(g.state.quests.q061.outcome,'informed');checkpoint(g);
 go(g,{kind:'dungeon',dungeon:'region_7',map:'region_7_f1',x:1,y:1});render();click('任意調べる');click('地上への階段');click('調べる');advance();assert.equal(g.state.townLocation,'oddland_village');checkpoint(g);
 click('旧王領の村の依頼所');click('依頼掲示板を見る');assert.equal(dom.root.querySelectorAll('.quest-card').length,39);
 }finally{view?.destroy();dom.restore();}
});
