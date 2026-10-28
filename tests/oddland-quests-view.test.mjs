import test from 'node:test';
import assert from 'node:assert/strict';
import {installDOM} from './view-dom.mjs';
import {replaceView} from '../src/view/view-layout.js';
import {projectGame} from '../src/application/projection.js';
import {border,go,start,data,checkpoint,prepare,play,paths} from './oddland-helpers.mjs';
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

for(const layout of ['classic','scene'])test(`${layout}: q294 preserves the card and only escorts Sor to testify and reunite with Ver`,()=>{
 const g=border(),q=start(g,294),dom=installDOM();let view;
 const render=()=>view.render(projectGame(g));
 const advance=()=>{let n=100;while(g.state.waiting?.type==='text'){assert.ok(--n);view.advanceText();}};
 const click=label=>{let n=100;while(view.canChoose?.()===false){assert.ok(--n);view.advanceText();}const b=[...dom.root.querySelectorAll('button')].find(b=>b.textContent===label);assert.ok(b,`missing: ${label}`);assert.ok(!b.disabled);b.click();advance();};
 const v=()=>g.state.stories.q294.values;
 const cast=ids=>{assert.equal(dom.root.querySelectorAll('[data-character]').length,ids.length);for(const id of ids){const person=dom.root.querySelector(`[data-character="${id}"]`);assert.ok(person);assert.ok(person.textContent.includes(data.characters[id].name));assert.equal(person.querySelector('img').src,data.assets.images[`npc_${id}`]);}assert.equal(v().verAt,'registry');assert.equal(v().clerkAt,'customs');if(projectGame(g).town)assert.deepEqual(projectGame(g).town.cast.map(c=>c.id).sort(),[...ids].sort());};
 const arrive=place=>{go(g,q.story.worldPlaces[place]);render();advance();checkpoint(g);};
 try{
  view=replaceView(null,layout,dom.root,intent=>{const ok=g.dispatch(intent);render();return ok;},{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();advance();
  cast(['od_ver']);assert.equal(v().cardAt,'ver');assert.ok(!(g.state.stories.q294.knowledge.party??[]).includes('name'));
  click('本人の名前と荷役証を確かめる');cast(['od_ver']);assert.ok(g.state.stories.q294.knowledge.party.includes('name'));checkpoint(g);const choice=g.save();
  click('荷役証を預かり、古い名簿と照合する');cast(['od_ver']);assert.equal(v().cardAt,'party');assert.equal(v().resolution,'record');
  click('証を持って出入窓口へ行く');assert.equal(v().verAt,'registry');assert.equal(v().sorAt,'refuge');checkpoint(g);arrive('customs');cast(['od_clerk']);assert.equal(v().cardAt,'party');
  click('荷役証を持ってヴェルへ戻る');arrive('registry');cast(['od_ver']);assert.equal(v().cardAt,'party');
  click('荷役証を返し、登録を伝える');assert.equal(v().cardAt,'ver');assert.equal(g.state.quests.q294.outcome,'record');checkpoint(g);
  g.load(choice);render();advance();click('退避所でソルに立会いを頼む');assert.equal(v().resolution,'pending');assert.equal(v().cardAt,'ver');arrive('refuge');cast(['od_sor']);assert.equal(v().resolution,'witness');
  click('ソルと出入窓口へ行く');assert.equal(v().sorAt,'transit');assert.equal(v().verAt,'registry');assert.equal(v().cardAt,'ver');checkpoint(g);arrive('customs');cast(['od_sor','od_clerk']);assert.equal(v().sorAt,'customs');
  click('ソルと登録相談室へ戻る');assert.equal(v().sorAt,'transit');assert.equal(v().clerkAt,'customs');checkpoint(g);arrive('registry');cast(['od_ver','od_sor']);assert.equal(v().sorAt,'registry');assert.equal(v().cardAt,'ver');
  click('本人の名で登録できたことを確かめる');assert.equal(g.state.quests.q294.outcome,'witness');checkpoint(g);
 }finally{view?.destroy();dom.restore();}
});

for(const layout of ['classic','scene'])test(`${layout}: q295 charges the shared trial once and keeps a zero-gold mixed route with both travellers`,()=>{
 const g=border(),q=start(g,295),dom=installDOM();let view;
 const render=()=>view.render(projectGame(g));
 const advance=()=>{let n=100;while(g.state.waiting?.type==='text'){assert.ok(--n);view.advanceText();}};
 const button=label=>[...dom.root.querySelectorAll('button')].find(b=>b.querySelector('span')?.textContent===label||b.textContent===label);
 const click=label=>{let n=100;while(view.canChoose?.()===false){assert.ok(--n);view.advanceText();}const b=button(label);assert.ok(b,`missing: ${label}`);assert.ok(!b.disabled);b.click();advance();};
 const v=()=>g.state.stories.q295.values;
 const cast=()=>{const ids=['od_dan','od_passenger'];assert.equal(dom.root.querySelectorAll('[data-character]').length,2);for(const id of ids){const person=dom.root.querySelector(`[data-character="${id}"]`);assert.ok(person);assert.ok(person.textContent.includes(data.characters[id].name));assert.equal(person.querySelector('img').src,data.assets.images[`npc_${id}`]);}if(projectGame(g).town)assert.deepEqual(projectGame(g).town.cast.map(c=>c.id).sort(),ids);};
 const position=place=>assert.deepEqual([v().partyAt,v().danAt,v().passengerAt],[place,place,place]);
 const arrive=place=>{go(g,q.story.worldPlaces[place]);render();advance();position(place);cast();checkpoint(g);};
 try{
  view=replaceView(null,layout,dom.root,intent=>{const ok=g.dispatch(intent);render();return ok;},{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();advance();
  cast();position('yard');assert.ok(!(g.state.stories.q295.knowledge.party??[]).includes('fares'));
  click('料金と試乗の条件を聞く');cast();assert.ok(g.state.stories.q295.knowledge.party.includes('fares'));checkpoint(g);const choice=g.save(),gold=g.state.gold;
  click('6Gを払い、相乗りの試乗を手配する');cast();position('yard');assert.equal(v().resolution,'shared');assert.equal(g.state.gold,gold-6);checkpoint(g);
  click('試乗車に付き添って退避所へ歩く');position('transit');assert.equal(v().finished,false);checkpoint(g);arrive('refuge');assert.equal(g.state.gold,gold-6);
  click('試乗の一行と荷車溜まりへ戻る');position('transit');checkpoint(g);arrive('yard');
  click('料金を掲げた帰り便を見届ける');assert.equal(g.state.quests.q295.outcome,'shared');assert.equal(g.state.gold,gold-6+38);checkpoint(g);
  g.load(choice);g.state.gold=0;render();advance();cast();checkpoint(g);const shortage=g.save();
  assert.ok(button('6Gを払い、相乗りの試乗を手配する').disabled);assert.equal(button('荷を積み分け、混載の試乗を手伝う').disabled,false);
  assert.equal(g.dispatch({type:'choose',id:'shared'}),false);assert.equal(g.save(),shortage);assert.equal(v().resolution,'pending');
  click('荷を積み分け、混載の試乗を手伝う');cast();position('yard');assert.equal(v().resolution,'mixed');assert.equal(g.state.gold,0);
  click('混載車に付き添って退避所へ歩く');position('transit');checkpoint(g);arrive('refuge');assert.equal(g.state.gold,0);
  click('試乗の一行と荷車溜まりへ戻る');position('transit');checkpoint(g);arrive('yard');
  click('料金と待ち時間のある帰り便を見届ける');assert.equal(g.state.quests.q295.outcome,'mixed');assert.equal(g.state.gold,29);checkpoint(g);
 }finally{view?.destroy();dom.restore();}
});

for(const layout of ['classic','scene'])test(layout+': q296 keeps residents at work and separates the inspection sample from expedition oil',()=>{
 const g=border(),q=start(g,296),dom=installDOM();let view;
 const render=()=>view.render(projectGame(g));
 const advance=()=>{let n=100;while(g.state.waiting?.type==='text'){assert.ok(--n);view.advanceText();}};
 const click=label=>{let n=100;while(view.canChoose?.()===false){assert.ok(--n);view.advanceText();}const b=[...dom.root.querySelectorAll('button')].find(b=>b.textContent===label);assert.ok(b,'missing: '+label);assert.ok(!b.disabled);b.click();advance();};
 const v=()=>g.state.stories.q296.values;
 const supply=()=>structuredClone({light:g.state.light,expedition:g.state.expedition,inventory:g.state.inventory});
 const initialSupply=supply();
 const state=(party,sample,resolution='pending',finished=false)=>{assert.deepEqual([v().partyAt,v().bekAt,v().oil_sellerAt,v().stockAt,v().sampleAt,v().resolution,v().finished],[party,'inn','oil','warehouse',sample,resolution,finished]);assert.deepEqual(supply(),initialSupply);};
 const cast=id=>{assert.equal(dom.root.querySelectorAll('[data-character]').length,1);const person=dom.root.querySelector('[data-character="'+id+'"]');assert.ok(person);assert.ok(person.textContent.includes(data.characters[id].name));assert.equal(person.querySelector('img').src,'assets/images/characters/oddland/'+id+'.png');assert.deepEqual(projectGame(g).town.cast.map(c=>c.id),[id]);};
 const arrive=place=>{go(g,q.story.worldPlaces[place]);render();advance();assert.equal(g.state.journey,null);checkpoint(g);};
 try{
  view=replaceView(null,layout,dom.root,intent=>{const ok=g.dispatch(intent);render();return ok;},{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();advance();
  state('inn','bek');cast('od_bek');assert.ok(!(g.state.stories.q296.knowledge.party??[]).includes('smoke'));const gold=g.state.gold;
  click('検査用の小瓶だけを預かる');state('inn','party');cast('od_bek');checkpoint(g);
  click('補給店裏の検査場へ行く');state('transit','party');assert.deepEqual(q.story.actions.depart_go.journey.companions,[]);assert.ok(!(g.state.stories.q296.knowledge.party??[]).includes('smoke'));checkpoint(g);
  arrive('oil');state('oil','party');cast('od_oil_seller');assert.ok(g.state.stories.q296.knowledge.party.includes('smoke'));const tested=g.save();
  click('灯用の正規品へ交換してもらう');state('oil','oil_seller','exchange');cast('od_oil_seller');checkpoint(g);
  click('旅籠へ交換の段取りを伝える');state('transit','oil_seller','exchange');checkpoint(g);arrive('inn');state('inn','oil_seller','exchange');cast('od_bek');
  click('交換と引取りをベクに引き継ぐ');state('inn','oil_seller','exchange',true);assert.equal(g.state.quests.q296.outcome,'exchange');assert.equal(g.state.gold,gold+23);checkpoint(g);
  g.load(tested);render();advance();click('用途を分け、倉庫で回収品を隔離する');state('oil','party','recover');cast('od_oil_seller');checkpoint(g);
  click('小瓶を持って倉庫係へ相談する');state('transit','party','recover');checkpoint(g);arrive('warehouse');state('warehouse','party','recover');cast('od_stock');
  click('検査見本をタルへ渡す');state('warehouse','stock','recover');cast('od_stock');checkpoint(g);
  click('旅籠で回収先をベクに知らせる');state('transit','stock','recover');checkpoint(g);arrive('inn');state('inn','stock','recover');cast('od_bek');
  click('回収品を灯へ戻さないことを確認する');state('inn','stock','recover',true);assert.equal(g.state.quests.q296.outcome,'recover');assert.equal(g.state.gold,gold+31);checkpoint(g);
 }finally{view?.destroy();dom.restore();}
});

for(const layout of ['classic','scene'])test(layout+': q297 leaves both cargo workers at the refuge while borrowing boards and preserves both resolutions',()=>{
 const g=border(),q=start(g,297),dom=installDOM();let view;
 const render=()=>view.render(projectGame(g));
 const advance=()=>{let n=100;while(g.state.waiting?.type==='text'){assert.ok(--n);view.advanceText();}};
 const click=label=>{let n=100;while(view.canChoose?.()===false){assert.ok(--n);view.advanceText();}const b=[...dom.root.querySelectorAll('button')].find(b=>b.textContent===label);assert.ok(b,'missing: '+label);assert.ok(!b.disabled);b.click();advance();};
 const v=()=>g.state.stories.q297.values,inventory=structuredClone(g.state.inventory);
 const state=(party,resolution='pending',finished=false)=>{assert.deepEqual([v().partyAt,v().rugoAt,v().pellaAt,v().resolution,v().finished],[party,'signals','signals',resolution,finished]);assert.deepEqual(g.state.inventory,inventory);};
 const cast=(ids=['od_rugo','od_pella'])=>{assert.equal(dom.root.querySelectorAll('[data-character]').length,ids.length);for(const id of ids){const person=dom.root.querySelector('[data-character="'+id+'"]');assert.ok(person);assert.ok(person.textContent.includes(data.characters[id].name));assert.equal(person.querySelector('img').src,'assets/images/characters/oddland/'+id+'.webp');}if(projectGame(g).town)assert.deepEqual(projectGame(g).town.cast.map(c=>c.id).sort(),[...ids].sort());};
 const arrive=place=>{go(g,q.story.worldPlaces[place]);render();advance();assert.equal(g.state.journey,null);checkpoint(g);};
 try{
  view=replaceView(null,layout,dom.root,intent=>{const ok=g.dispatch(intent);render();return ok;},{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();advance();
  state('signals');cast();assert.ok(!(g.state.stories.q297.knowledge.party??[]).includes('word'));const gold=g.state.gold;
  click('呼び声に合わせて何をするのか、順に見せてもらう');state('signals');cast();assert.ok(g.state.stories.q297.knowledge.party.includes('word'));checkpoint(g);const meaning=g.save();
  click('二人で同じ側から作業を実演する');state('signals','demo');cast();checkpoint(g);
  click('新人にも二つの動作を実演してもらう');state('signals','demo',true);assert.equal(g.state.quests.q297.outcome,'demo');assert.equal(g.state.gold,gold+20);checkpoint(g);
  g.load(meaning);render();advance();click('荷車溜まりで合図板の材料を借りる');state('transit');assert.deepEqual(q.story.actions.meaning_signals.journey.companions,[]);checkpoint(g);
  arrive('yard');state('yard','signals');cast([]);assert.equal(g.state.gold,gold);
  click('合図板を持って退避所へ戻る');state('transit','signals');assert.deepEqual(q.story.actions.materials_return.journey.companions,[]);checkpoint(g);
  arrive('signals');state('signals','signals');cast();
  click('共通の手信号を荷役の交代に残す');state('signals','signals',true);assert.equal(g.state.quests.q297.outcome,'signals');assert.equal(g.state.gold,gold+27);checkpoint(g);
 }finally{view?.destroy();dom.restore();}
});

for(const layout of ['classic','scene'])test(layout+': q298 keeps cargo holders, earned signals and the selected relief worker across all four routes',()=>{
 const g=border();prepare(g,298);const prepared=g.save(),q=start(g,298),dom=installDOM();let view;
 const render=()=>view.render(projectGame(g));
 const advance=()=>{let n=100;while(g.state.waiting?.type==='text'){assert.ok(--n);view.advanceText();}};
 const button=label=>[...dom.root.querySelectorAll('button')].find(b=>b.querySelector('span')?.textContent===label||b.textContent===label);
 const click=label=>{let n=100;while(view.canChoose?.()===false){assert.ok(--n);view.advanceText();}const b=button(label);assert.ok(b,'missing: '+label);assert.ok(!b.disabled);b.click();advance();};
 const v=()=>g.state.stories.q298.values,inventory=structuredClone(g.state.inventory);
 const state=(party,crate='loader',resolution='pending',relief='inn',pella='signals',finished=false)=>{
  assert.deepEqual([v().partyAt,v().emeAt,v().loaderAt,v().crateAt,v().resolution,v().reliefAt,v().pellaAt,v().finished],[party,'customs','yard',crate,resolution,relief,pella,finished]);assert.deepEqual(g.state.inventory,inventory);
 };
 const cast=id=>{assert.equal(dom.root.querySelectorAll('[data-character]').length,1);const person=dom.root.querySelector('[data-character="'+id+'"]');assert.ok(person);assert.ok(person.textContent.includes(data.characters[id].name));assert.equal(person.querySelector('img').src,'assets/images/characters/oddland/'+id+'.webp');if(projectGame(g).town)assert.deepEqual(projectGame(g).town.cast.map(c=>c.id),[id]);};
 const arrive=place=>{go(g,q.story.worldPlaces[place]);render();advance();assert.equal(g.state.journey,null);checkpoint(g);};
 const signalLabel='手信号を共有したペラに交代の応援を頼む';
 try{
  view=replaceView(null,layout,dom.root,intent=>{const ok=g.dispatch(intent);render();return ok;},{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();advance();
  state('customs');cast('od_eme');{let n=100;while(view.canChoose?.()===false){assert.ok(--n);view.advanceText();}}assert.ok(button(signalLabel).disabled);
  const entry=g.save(),gold=g.state.gold;assert.equal(g.dispatch({type:'choose',id:'signals'}),false);assert.equal(g.save(),entry);
  click('食料の小箱を運び、当直を運搬から外す');state('transit');checkpoint(g);arrive('yard');state('yard','loader','carry');cast('od_loader');
  click('食料の小箱を受け取る');state('yard','party','carry');cast('od_loader');checkpoint(g);
  click('小箱を外国側窓口へ運ぶ');state('transit','party','carry');checkpoint(g);arrive('customs');state('customs','party','carry');cast('od_eme');assert.equal(g.state.gold,gold);
  click('食料を渡し、当直の休憩を確認する');state('customs','eme','carry','inn','signals',true);assert.equal(g.state.quests.q298.outcome,'carry');assert.equal(g.state.gold,gold+45);checkpoint(g);
  g.load(entry);render();advance();click('旅籠で交代員を探す');state('transit');checkpoint(g);arrive('inn');state('inn','loader','relief');cast('od_relief');
  click('サイを外国側窓口へ案内する');state('transit','loader','relief','transit');assert.deepEqual(q.story.actions.recruit_go.journey.companions,['relief']);checkpoint(g);arrive('customs');state('customs','loader','relief','customs');cast('od_eme');assert.equal(g.state.gold,gold);
  click('交代の引継ぎを見届ける');state('customs','loader','relief','customs','signals',true);assert.equal(g.state.quests.q298.outcome,'relief');assert.equal(g.state.gold,gold+37);checkpoint(g);
  g.load(entry);render();advance();click('荷主と相談し、今夜の残りを翌便へ回す');state('transit');checkpoint(g);arrive('yard');state('yard','loader','defer');cast('od_loader');
  click('延期を外国側窓口へ伝える');state('transit','loader','defer');checkpoint(g);arrive('customs');state('customs','loader','defer');cast('od_eme');
  click('今夜の業務を区切る');state('customs','loader','defer','inn','signals',true);assert.equal(g.state.quests.q298.outcome,'defer');assert.equal(g.state.gold,gold+28);checkpoint(g);
  g.load(prepared);play(g,297,paths(297).find(p=>p.outcome==='signals'));start(g,298);render();advance();state('customs');cast('od_eme');{let n=100;while(view.canChoose?.()===false){assert.ok(--n);view.advanceText();}}assert.equal(button(signalLabel).disabled,false);const signalGold=g.state.gold;
  click(signalLabel);state('transit');checkpoint(g);arrive('signals');state('signals','loader','relief');cast('od_pella');
  click('ペラと合図板を外国側窓口へ運ぶ');state('transit','loader','relief','inn','transit');assert.deepEqual(q.story.actions.signal_help_go.journey.companions,['pella']);checkpoint(g);arrive('customs');state('customs','loader','relief','inn','customs');cast('od_eme');assert.equal(g.state.gold,signalGold);
  click('交代の引継ぎを見届ける');state('customs','loader','relief','inn','customs',true);assert.equal(g.state.quests.q298.outcome,'relief');assert.equal(g.state.gold,signalGold+37);checkpoint(g);
 }finally{view?.destroy();dom.restore();}
});

for(const layout of ['classic','scene'])test(layout+': q299 pays once or carries bedding for free, keeping the innkeeper and storekeeper at work',()=>{
 const g=border();prepare(g,299);const q=start(g,299),dom=installDOM();let view;
 const render=()=>view.render(projectGame(g));
 const advance=()=>{let n=100;while(g.state.waiting?.type==='text'){assert.ok(--n);view.advanceText();}};
 const reveal=()=>{let n=100;while(view.canChoose?.()===false){assert.ok(--n);view.advanceText();}};
 const button=label=>[...dom.root.querySelectorAll('button')].find(b=>b.querySelector('span')?.textContent===label||b.textContent===label);
 const click=label=>{reveal();const b=button(label);assert.ok(b,'missing: '+label);assert.ok(!b.disabled);b.click();advance();};
 const labels={annex:'寝具代12Gを払い、別棟を整える',work:'掃除と寝具運びを引き受ける',inn:'部屋代18Gを預け、旅籠の相部屋を使う'};
 const inventory=structuredClone(g.state.inventory),v=()=>g.state.stories.q299.values;
 const state=(party,resolution='pending',worker='inn',finished=false)=>{
  assert.deepEqual([v().partyAt,v().mayaAt,v().stockAt,v().workerAt,v().resolution,v().finished],[party,'inn','warehouse',worker,resolution,finished]);assert.deepEqual(g.state.inventory,inventory);
 };
 const cast=ids=>{
  assert.equal(dom.root.querySelectorAll('[data-character]').length,ids.length);
  for(const id of ids){const p=dom.root.querySelector('[data-character="'+id+'"]');assert.ok(p);assert.ok(p.textContent.includes(data.characters[id].name));assert.equal(p.querySelector('img').src,data.assets.images['npc_'+id]);}
  assert.deepEqual(projectGame(g).town.cast.map(c=>c.id).sort(),[...ids].sort());checkpoint(g);
 };
 const arrive=place=>{go(g,q.story.worldPlaces[place]);render();advance();assert.equal(g.state.journey,null);checkpoint(g);};
 const finish=outcome=>{
  const count=g.state.vars.region_12;assert.equal(g.unlocked(data.quests.q300),false);
  click(outcome==='annex'?'休める寝床へ引き継ぐ':'相部屋の支度を確かめ、ヘルに休んでもらう');
  assert.equal(g.state.quests.q299.outcome,outcome);assert.equal(g.state.vars.region_12,count+1);assert.equal(g.unlocked(data.quests.q300),true);state(outcome,outcome,outcome,true);checkpoint(g);
 };
 const escort=()=>{
  click('旅籠で待つ労働者を迎えに行く');state('transit','annex');checkpoint(g);arrive('inn');state('inn','annex');cast(['od_maya','od_worker']);
  click('ヘルを別棟の寝床へ案内する');state('transit','annex','transit');assert.deepEqual(q.story.actions.invite_guide.journey.companions,['worker']);checkpoint(g);
  arrive('annex');state('annex','annex','annex');cast(['od_worker']);
 };
 try{
  view=replaceView(null,layout,dom.root,intent=>{const ok=g.dispatch(intent);render();return ok;},{status(){},menu(){},help(){},soundEnabled:()=>false,effectsMode:()=> 'off'});render();advance();
  state('inn');cast(['od_maya','od_worker']);click('共同倉庫の置き場を確かめる');state('transit');checkpoint(g);arrive('warehouse');state('warehouse');cast(['od_stock']);const survey=g.save(),gold=g.state.gold;
  click(labels.annex);state('warehouse','annex');cast(['od_stock']);assert.equal(g.state.gold,gold-12);
  click('空き別棟で寝床を確かめる');state('transit','annex');checkpoint(g);arrive('annex');state('annex','annex');cast([]);assert.equal(g.state.stories.q299.scene,'ready');
  escort();assert.equal(g.state.gold,gold-12);finish('annex');assert.equal(g.state.gold,gold-12+42);
  g.load(survey);g.state.gold=0;render();advance();reveal();state('warehouse');
  for(const id of ['annex','inn']){assert.ok(button(labels[id]).disabled);const before=g.save();assert.equal(g.dispatch({type:'choose',id}),false);assert.equal(g.save(),before);}
  assert.equal(button(labels.work).disabled,false);click(labels.work);state('warehouse','annex');cast(['od_stock']);
  click('空き別棟へ掃除道具を運ぶ');state('transit','annex');checkpoint(g);arrive('annex');state('annex','annex');cast([]);assert.equal(g.state.stories.q299.scene,'clean');assert.equal(g.unlocked(data.quests.q300),false);
  {const before=g.save();assert.equal(g.dispatch({type:'choose',id:'guide'}),false);assert.equal(g.save(),before);}
  click('倉庫へ寝具を取りに戻る');state('transit','annex');checkpoint(g);arrive('warehouse');state('warehouse','annex');cast(['od_stock']);
  click('寝具を空き別棟へ運ぶ');state('transit','annex');checkpoint(g);arrive('annex');state('annex','annex');cast([]);assert.equal(g.state.stories.q299.scene,'ready');
  escort();assert.equal(g.state.gold,0);finish('annex');assert.equal(g.state.gold,42);
  g.load(survey);g.state.gold=12;render();advance();reveal();assert.ok(button(labels.inn).disabled);assert.equal(button(labels.annex).disabled,false);assert.equal(button(labels.work).disabled,false);
  click(labels.annex);state('warehouse','annex');assert.equal(g.state.gold,0);checkpoint(g);
  g.load(survey);g.state.gold=18;render();advance();reveal();assert.equal(button(labels.inn).disabled,false);click(labels.inn);state('warehouse','inn');cast(['od_stock']);assert.equal(g.state.gold,0);
  click('旅籠の相部屋へ戻る');state('transit','inn');assert.deepEqual(q.story.actions.inn_paid_go.journey.companions,[]);checkpoint(g);arrive('inn');state('inn','inn');cast(['od_maya','od_worker']);assert.equal(g.state.gold,0);finish('inn');assert.equal(g.state.gold,48);
 }finally{view?.destroy();dom.restore();}
});
