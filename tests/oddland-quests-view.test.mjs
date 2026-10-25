import test from 'node:test';
import assert from 'node:assert/strict';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
import {projectGame} from '../src/application/projection.js';
import {border,go,data,checkpoint} from './oddland-helpers.mjs';
for(const layout of ['classic','scene'])test(`${layout}: accept a local job, speak at the yard, escort on foot and complete through visible choices`,()=>{
 const g=border(),dom=installDOM();let view;
 const render=()=>view.render(projectGame(g)),dispatch=intent=>{const ok=g.dispatch(intent);render();return ok;};
 const click=label=>{let attempts=50;while(view.canChoose?.()===false){assert.ok(--attempts);view.advanceText();}const b=[...dom.root.querySelectorAll('button')].find(b=>b.textContent===label);assert.ok(b,`missing: ${label}`);assert.ok(!b.disabled);b.click();};
 const advance=()=>{let n=100;while(g.state.waiting?.type==='text'){assert.ok(--n);view.advanceText();}};
 try{
 view=replaceView(null,layout,dom.root,dispatch,{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();
 click('国境宿場の共同依頼所');click('依頼掲示板を見る');const cards=[...dom.root.querySelectorAll('.quest-card')];assert.equal(cards.length,10);
 const card=cards.find(c=>c.textContent.includes('荷台から聞こえる笛'));const button=[...card.querySelectorAll('button')].find(b=>b.textContent==='依頼を受ける');assert.ok(button);button.click();assert.equal(g.state.quests.q291.stage,'active');
 if(layout==='scene')view.closePanel();else click('オッドランド・国境宿場へ戻る');if(g.state.townLocation!=='oddland_border')click('オッドランド・国境宿場へ戻る');
 click('国境宿場の荷車溜まり');click('荷台から聞こえる笛の続きを話す');advance();click('幌を開け、声を掛ける');advance();checkpoint(g);
 click('テオと退避所へ父を探しに行く');assert.equal(g.state.stories.q291.values.teoAt,'transit');assert.equal(g.state.quests.q291.stage,'active');
 go(g,data.quests.q291.story.worldPlaces.refuge);render();advance();assert.equal(g.state.stories.q291.values.teoAt,'refuge');click('親子に帰りの車を案内する');advance();
 assert.equal(g.state.quests.q291.outcome,'escort');assert.equal(g.state.vars.region_12,1);checkpoint(g);
 }finally{view?.destroy();dom.restore();}
});
