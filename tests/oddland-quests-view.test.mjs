import test from 'node:test';
import assert from 'node:assert/strict';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
import {projectGame} from '../src/application/projection.js';
import {border,go,start,data,checkpoint} from './oddland-helpers.mjs';
for(const layout of ['classic','scene'])test(`${layout}: accept a local job, speak at the yard, escort or protect on foot with the correct dedicated cast`,()=>{
 const g=border(),dom=installDOM();let view;
 const render=()=>view.render(projectGame(g)),dispatch=intent=>{const ok=g.dispatch(intent);render();return ok;};
 const click=label=>{let attempts=50;while(view.canChoose?.()===false){assert.ok(--attempts);view.advanceText();}const b=[...dom.root.querySelectorAll('button')].find(b=>b.textContent===label);assert.ok(b,`missing: ${label}`);assert.ok(!b.disabled);b.click();};
 const advance=()=>{let n=100;while(g.state.waiting?.type==='text'){assert.ok(--n);view.advanceText();}};
 const cast=ids=>{assert.equal(dom.root.querySelectorAll('[data-character]').length,ids.length);for(const id of ids){const person=dom.root.querySelector(`[data-character="${id}"]`);assert.ok(person);assert.ok(person.textContent.includes(data.characters[id].name));assert.equal(person.querySelector('img').src,data.assets.images[`npc_${id}`]);}if(projectGame(g).town)assert.deepEqual(projectGame(g).town.cast.map(c=>c.id).sort(),[...ids].sort());};
 try{
 view=replaceView(null,layout,dom.root,dispatch,{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();
 click('国境宿場の共同依頼所');click('依頼掲示板を見る');const cards=[...dom.root.querySelectorAll('.quest-card')];assert.equal(cards.length,10);
 const card=cards.find(c=>c.textContent.includes('荷台から聞こえる笛'));const button=[...card.querySelectorAll('button')].find(b=>b.textContent==='依頼を受ける');assert.ok(button);button.click();assert.equal(g.state.quests.q291.stage,'active');
 if(layout==='scene')view.closePanel();else click('オッドランド・国境宿場へ戻る');if(g.state.townLocation!=='oddland_border')click('オッドランド・国境宿場へ戻る');
 click('国境宿場の荷車溜まり');assert.ok(!projectGame(g).town.cast.some(c=>c.id==='od_teo'));click('荷台から聞こえる笛の続きを話す');advance();
 cast(['od_marta']);
 click('幌を開け、声を掛ける');advance();checkpoint(g);cast(['od_marta','od_teo']);const found=g.save();
 click('テオと退避所へ父を探しに行く');assert.equal(g.state.stories.q291.values.teoAt,'transit');assert.equal(g.state.quests.q291.stage,'active');
 go(g,data.quests.q291.story.worldPlaces.refuge);render();advance();assert.equal(g.state.stories.q291.values.teoAt,'refuge');cast(['od_rad','od_teo']);click('親子に帰りの車を案内する');advance();
 assert.equal(g.state.quests.q291.outcome,'escort');assert.equal(g.state.vars.region_12,1);checkpoint(g);
 g.load(found);render();click('先にテオを施療所へ連れていく');go(g,data.quests.q291.story.worldPlaces.clinic);render();advance();cast(['od_nurse','od_teo']);checkpoint(g);
 click('退避所へ父を迎えに行く');go(g,data.quests.q291.story.worldPlaces.refuge);render();advance();cast(['od_rad']);assert.equal(g.state.stories.q291.values.teoAt,'clinic');checkpoint(g);
 click('ラドを支え、施療所へ戻る');go(g,data.quests.q291.story.worldPlaces.clinic);render();advance();cast(['od_nurse','od_rad','od_teo']);checkpoint(g);
 click('親子の休む場所をユナに引き継ぐ');advance();assert.equal(g.state.quests.q291.outcome,'protect');checkpoint(g);
 start(g,294);render();advance();const pending=dom.root.querySelector('[data-character="od_ver"]');
 assert.ok(pending);assert.ok(pending.textContent.includes(data.characters.od_ver.name));assert.equal(pending.querySelector('img'),null);

 }finally{view?.destroy();dom.restore();}
});


for(const layout of ['classic','scene'])test(`${layout}: q292 pot delivery and a shared meal retain holders, waiting cook and travelling spouse`,()=>{
 const g=border(),q=start(g,292),dom=installDOM();let view;
 const render=()=>view.render(projectGame(g));
 const advance=()=>{let n=100;while(g.state.waiting?.type==='text'){assert.ok(--n);view.advanceText();}};
 const click=label=>{let n=100;while(view.canChoose?.()===false){assert.ok(--n);view.advanceText();}const b=[...dom.root.querySelectorAll('button')].find(b=>b.textContent===label);assert.ok(b,`missing: ${label}`);assert.ok(!b.disabled);b.click();advance();};
 const cast=ids=>{assert.equal(dom.root.querySelectorAll('[data-character]').length,ids.length);for(const id of ids){const person=dom.root.querySelector(`[data-character="${id}"]`);assert.ok(person);assert.ok(person.textContent.includes(data.characters[id].name));assert.equal(person.querySelector('img').src,data.assets.images[`npc_${id}`]);}};
 const arrive=place=>{go(g,q.story.worldPlaces[place]);render();advance();checkpoint(g);};
 const v=()=>g.state.stories.q292.values;
 try{
  view=replaceView(null,layout,dom.root,intent=>{const ok=g.dispatch(intent);render();return ok;},{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();advance();
  cast(['od_hena']);assert.equal(v().potAt,'hena');
  click('小鍋を預かる');cast(['od_hena']);assert.equal(v().potAt,'party');
  click('小鍋を持って反対側の炊事場へ行く');assert.equal(v().henaAt,'canteen');assert.equal(v().potAt,'party');checkpoint(g);
  arrive('kitchen');cast(['od_oren']);const survey=g.save();
  click('食事を温かく運ぶ便を試す');cast(['od_oren']);assert.equal(v().potAt,'oren');
  click('保温箱を受け取る');cast(['od_oren']);assert.equal(v().potAt,'party');
  click('保温箱を食堂へ運ぶ');assert.equal(v().henaAt,'canteen');assert.equal(v().orenAt,'kitchen');arrive('canteen');cast(['od_hena']);
  click('箱の受渡しをヘナに頼む');assert.equal(v().potAt,'hena');assert.equal(g.state.quests.q292.outcome,'delivery');checkpoint(g);
  g.load(survey);render();advance();click('二人が同時に休めるよう相談する');cast(['od_oren']);assert.equal(v().potAt,'oren');
  click('食堂でヘナの交代を相談する');arrive('canteen');cast(['od_hena']);assert.equal(v().orenAt,'kitchen');
  click('ヘナと反対側の炊事場へ歩く');assert.equal(v().henaAt,'transit');assert.equal(v().orenAt,'kitchen');checkpoint(g);
  arrive('kitchen');cast(['od_hena','od_oren']);assert.equal(v().henaAt,'kitchen');assert.equal(v().potAt,'oren');
  click('二人の休憩を見届ける');assert.equal(g.state.quests.q292.outcome,'together');checkpoint(g);
 }finally{view?.destroy();dom.restore();}
});


for(const layout of ['classic','scene'])test(`${layout}: q293 keeps the cobbler at the workshop and returns boots after either repair route`,()=>{
 const g=border(),q=start(g,293),dom=installDOM();let view;
 const render=()=>view.render(projectGame(g));
 const advance=()=>{let n=100;while(g.state.waiting?.type==='text'){assert.ok(--n);view.advanceText();}};
 const click=label=>{let n=100;while(view.canChoose?.()===false){assert.ok(--n);view.advanceText();}const b=[...dom.root.querySelectorAll('button')].find(b=>b.textContent===label);assert.ok(b,`missing: ${label}`);assert.ok(!b.disabled);b.click();advance();};
 const cast=ids=>{assert.equal(dom.root.querySelectorAll('[data-character]').length,ids.length);for(const id of ids){const person=dom.root.querySelector(`[data-character="${id}"]`);assert.ok(person);assert.ok(person.textContent.includes(data.characters[id].name));assert.equal(person.querySelector('img').src,data.assets.images[`npc_${id}`]);}assert.equal(g.state.stories.q293.values.nelAt,'cobbler');};
 const arrive=place=>{go(g,q.story.worldPlaces[place]);render();advance();checkpoint(g);};
 const v=()=>g.state.stories.q293.values;
 try{
  view=replaceView(null,layout,dom.root,intent=>{const ok=g.dispatch(intent);render();return ok;},{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();advance();
  cast(['od_nel']);assert.equal(v().bootsAt,'nel');
  click('修理済みの靴を預かる');cast(['od_nel']);assert.equal(v().bootsAt,'party');
  click('靴を持って濡れた石床へ行く');assert.equal(v().nelAt,'cobbler');assert.equal(v().bootsAt,'party');checkpoint(g);
  arrive('salt');cast([]);assert.ok(g.state.stories.q293.knowledge.party.includes('salt'));const floor=g.save();
  click('耐水の底材をネルと試す');assert.equal(v().resolution,'pending');arrive('cobbler');cast(['od_nel']);assert.equal(v().resolution,'sole');assert.equal(v().bootsAt,'party');
  click('預かった靴を返し、修繕方法を残す');assert.equal(v().bootsAt,'nel');assert.equal(g.state.quests.q293.outcome,'sole');checkpoint(g);
  g.load(floor);render();advance();cast([]);click('近くに洗い場を整える');assert.equal(v().resolution,'pending');arrive('wash');cast([]);assert.equal(v().resolution,'wash');assert.equal(v().bootsAt,'party');
  click('洗った靴と手入れの方法をネルへ届ける');arrive('cobbler');cast(['od_nel']);assert.equal(v().bootsAt,'party');
  click('靴を返し、洗い場の案内を頼む');assert.equal(v().bootsAt,'nel');assert.equal(g.state.quests.q293.outcome,'wash');checkpoint(g);
 }finally{view?.destroy();dom.restore();}
});
