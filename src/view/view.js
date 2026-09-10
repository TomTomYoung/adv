import {jobPanel,fieldSkills,buffLabels} from './jobs.js';
import {EffectsRenderer} from './effects.js';
import {paintDungeon} from './dungeon.js';
const node=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
const button=(text,callback,className='',disabled=false)=>{const b=node('button',className,text);b.type='button';b.disabled=disabled;b.addEventListener('click',callback);return b;};
const heading=(kicker,title)=>{const e=node('div','section-heading');e.append(node('span','eyebrow',kicker),node('h2','',title));return e;};
const meter=(value,max,className)=>{const e=node('div',`meter ${className}`),fill=node('span');fill.style.width=`${Math.max(0,Math.min(100,value/max*100))}%`;e.append(fill);e.setAttribute('role','meter');e.setAttribute('aria-valuenow',value);e.setAttribute('aria-valuemin',0);e.setAttribute('aria-valuemax',max);return e;};
export class GameView {
  constructor(root,dispatch,ui){this.bagActor=null;this.root=root;this.effects=new EffectsRenderer(root);this.dispatch=dispatch;this.ui=ui;this.tab='quests';this.region=1;this.query='';this.filter='open';this.selectedTarget=null;this.selectedAlly=null;}
  act(intent){const accepted=this.dispatch(intent);if(accepted===false)this.ui.status(this.model?.notice||'現在はその操作を行えません。条件や隊の状態を確認してください。');}
  render(model){
    this.ui.cancelFeedback?.();this.effects.capture();this.model=model;const focused=document.activeElement?.dataset.focus,selection=document.activeElement?.selectionStart;
    this.root.replaceChildren();
    const header=node('header','masthead'),brand=node('div','brand');brand.append(node('div','brand-mark','灯'),node('div','brand-type'));
    brand.lastChild.append(node('h1','',model.title),node('p','',model.subtitle));
    const toolbar=node('div','toolbar');toolbar.append(button('手帳',()=>{this.tab='journal';this.render(model);}),button('記録',()=>this.ui.menu()),this.soundButton());header.append(brand,toolbar);this.root.append(header);
    const status=node('div','status-strip');for(const text of [`${model.mode==='town'?'灯帰りの町':model.dungeon?.name}`,`隊 Lv.${model.level}`,`${model.gold} G`,`依頼 ${model.completed} / ${model.total}`])status.append(node('span','',text));this.root.append(status);
    const layout=node('main','game-layout'),main=node('section','main-panel'),side=node('aside','side-panel');main.dataset.fx='screen';side.dataset.fx='party';layout.append(main,side);this.root.append(layout);
    const tabs=node('nav','tabs');tabs.setAttribute('aria-label','表示する内容');
    const allTabs=model.mode==='town'?[['quests','依頼掲示板'],['regions','迷宮へ'],['party','酒場・仲間'],['bag','旅支度'],['journal','冒険手帳']]:[['explore','探索'],['bag','道具'],['party','隊の状態'],['journal','冒険手帳']];
    if(!allTabs.some(([id])=>id===this.tab))this.tab=model.mode==='town'?'quests':'explore';
    for(const [id,label] of allTabs){const b=button(label,()=>{this.tab=id;this.render(model);},id===this.tab?'active':'');b.setAttribute('aria-current',id===this.tab?'page':'false');tabs.append(b);}main.append(tabs);
    // Narrative and battles stay visible even if the player opens a utility tab.
    if(model.battle)this.battle(main,model);
    else if(model.dialog){if(model.dungeon)this.scene(main,model);this.dialog(main,model.dialog);}
    else if(this.tab==='explore')this.explore(main,model);
    else if(this.tab==='quests')this.quests(main,model);
    else if(this.tab==='regions')this.regions(main,model);
    else if(this.tab==='party')this.party(main,model);
    else if(this.tab==='bag')this.bag(main,model);
    else this.journal(main,model);
    this.sidebar(side,model);
    if(model.notice){const notice=node('div','notice',model.notice);notice.setAttribute('role','status');this.root.append(notice);}
    const footer=node('footer','footer');footer.append(node('span','',model.mode==='dungeon'?'W/S 前後移動 · A/D 向き変更 · E 調べる · Enter 続き':'依頼を受ける → 迷宮へ向かう → 足元と正面を調べる → 帰還する'),button('遊び方',()=>this.ui.help()));this.root.append(footer);
    this.effects.present(model,this.ui.effectsMode?.()??'full');
    if(focused){const target=this.root.querySelector(`[data-focus="${focused}"]`);if(target){target.focus();if(selection!==undefined&&target.setSelectionRange)target.setSelectionRange(selection,selection);}}
  }
  quests(parent,m){
    const section=node('div','panel-content');section.append(heading('GUILD / REQUESTS','今日も、帰るために潜る。'));
    const controls=node('div','board-controls'),search=node('input','search');search.placeholder='依頼名・依頼人で探す';search.setAttribute('aria-label','依頼を検索');search.value=this.query;search.dataset.focus='quest-search';search.addEventListener('input',()=>{this.query=search.value;this.render(m);});
    const select=node('select');select.setAttribute('aria-label','地域');select.append(new Option('すべての地域','0'));for(const r of m.regions)select.append(new Option(`${String(r.id).padStart(2,'0')} ${r.name}`,String(r.id)));select.value=String(this.region);select.addEventListener('change',()=>{this.region=Number(select.value);this.render(m);});
    const filter=node('select');filter.setAttribute('aria-label','依頼の状態');for(const [v,t] of [['open','未完了'],['active','受注中'],['completed','完了'],['all','すべて']])filter.append(new Option(t,v));filter.value=this.filter;filter.addEventListener('change',()=>{this.filter=filter.value;this.render(m);});controls.append(search,select,filter);section.append(controls);
    const list=node('div','quest-list');const qs=m.quests.filter(q=>(!this.region||q.region===this.region)&&(!this.query||`${q.title}${q.client}${q.brief}`.includes(this.query))&&(this.filter==='all'||this.filter==='open'&&q.stage!=='completed'||q.stage===this.filter));
    if(!qs.length)list.append(node('p','empty','条件に合う依頼はありません。地域や状態を変えてください。'));
    for(const q of qs){const card=node('article',`quest-card ${q.tracked?'tracked':''}`),num=node('span','quest-number',String(q.number).padStart(3,'0')),body=node('div','quest-body');
      const title=node('div','quest-title');title.append(node('h3','',q.title),node('span','badge',q.stage==='completed'?'完了':q.stage==='active'?'受注中':q.unlocked?`推奨 Lv.${q.recommendedLevel}`:'解放待ち'));body.append(title,node('p','quest-client',`${q.client} / ${q.regionName}`),node('p','quest-brief',q.brief));
      if(!q.unlocked)body.append(node('p','requirement',q.unlockHint));
      if(q.outcome)body.append(node('p','outcome',q.outcome.text));
      const actions=node('div','quest-actions');if(q.stage!=='completed'){actions.append(button(q.stage==='active'?'この依頼を追う':'依頼を受ける',()=>this.act({type:q.stage==='active'?'track':'accept',id:q.id}),'primary',!q.unlocked));if(q.stage==='active')actions.append(button('迷宮へ向かう',()=>this.act({type:'travel',region:q.region})));}body.append(actions);card.append(num,body);list.append(card);
    }section.append(node('p','muted',`${qs.length}件を表示`),list);parent.append(section);
  }
  regions(parent,m){const section=node('div','panel-content');section.append(heading('DESCENT / 10 DOMAINS','潜る場所を選ぶ'));
    const list=node('div','region-list');for(const r of m.regions){const item=node('article','region-card'),count=m.quests.filter(q=>q.region===r.id&&q.stage==='completed').length;item.style.setProperty('--region-color',r.color);item.append(node('span','eyebrow',`${String(r.id).padStart(2,'0')} / 推奨 Lv.${r.recommendedLevel} / ${count}件完了`),node('h3','',r.name),node('p','',r.description),button('地下一層へ',()=>this.act({type:'travel',region:r.id}),'primary'));list.append(item);}section.append(list);parent.append(section);}
  scene(parent,m){
    const scene=node('div','dungeon-scene'),canvas=node(m.dungeon?'canvas':'img','dungeon-canvas');if(m.dungeon)canvas.setAttribute('aria-label',`${m.dungeon.name}、${{north:'北',east:'東',south:'南',west:'西'}[m.dungeon.location.facing]}向きの通路`);else{canvas.src=m.battle.background;canvas.alt='戦場';}scene.dataset.fx='scene';scene.append(canvas);
    const location=node('div','scene-location');if(m.dungeon)location.append(node('span','eyebrow',`B${m.dungeon.floor} / ${m.dungeon.location.x}, ${m.dungeon.location.y}`));location.append(node('span','',m.dungeon?.name??m.title));scene.append(location);
    if(m.dungeon){const direction=node('span','compass',({north:'N 北',east:'E 東',south:'S 南',west:'W 西'})[m.dungeon.location.facing]);scene.append(direction);}
    if(m.battle){const enemies=node('div','enemy-line');for(const e of m.battle.enemies){if(e.hp<=0)continue;const b=button('',()=>{this.selectedTarget=e.id;this.render(m);},`enemy ${this.selectedTarget===e.id?'selected':''}`);b.setAttribute('aria-label',`${e.name}を狙う、HP${e.hp}/${e.maxHp}`);const image=node('img');image.src=e.sprite;image.alt=e.name;image.dataset.fx=`enemy:${e.id}`;b.append(image,node('span','enemy-name',e.name),meter(e.hp,e.maxHp,'enemy-meter'),node('span','enemy-hp',`${e.hp} / ${e.maxHp}${e.guarded?'・防御中':''}${e.statuses.length?'・'+e.statuses.join('・'):''}${buffLabels(e).length?'・'+buffLabels(e).join(' / '):''}`));enemies.append(b);}scene.append(enemies);}
    if((this.ui.effectsMode?.()??'full')!=='off')for(const layer of m.atmosphere??[]){if(!layer.opacity)continue;const shade=node('div','field-atmosphere');shade.setAttribute('aria-hidden','true');shade.style.opacity=String(layer.opacity);shade.style.background=layer.shade?`radial-gradient(ellipse at center,transparent 20%,${layer.color} 100%)`:layer.color;scene.append(shade);}
    parent.append(scene);if(m.dungeon)requestAnimationFrame(()=>paintDungeon(canvas,m.dungeon,m.battle));
  }
  explore(parent,m){
    this.scene(parent,m);const section=node('div','panel-content exploration-content');
    section.append(node('p','location-text',m.dungeon.here.length?m.dungeon.here.map(o=>o.name).join(' / '):'灯の届く通路が続いています。足元と正面に注意して進みます。'));
    const controls=node('div','explore-controls'),movement=node('div','movement-pad');
    for(const [label,direction,cl] of [['前へ','forward','forward'],['左を向く','left','left'],['後ろへ','back','back'],['右を向く','right','right']])movement.append(button(label,()=>this.act({type:'move',direction}),cl));
    const actions=node('div','explore-actions');actions.append(button('足元・正面を調べる',()=>this.act({type:'interact'}),'primary'),button('帰還印で町へ戻る',()=>this.ui.retreat()),node('small','muted','帰還印：所持金の8%。入口の階段からは無料で帰れます。'));controls.append(movement,actions);section.append(controls);
    const log=node('div','travel-log');log.append(node('span','eyebrow','直近の記録'));for(const line of m.log.slice(-3))log.append(node('p','',line));section.append(log);parent.append(section);
  }
  dialog(parent,d){const section=node('section','story-window');section.setAttribute('aria-label','物語と選択肢');
    if(d.type==='text'){section.append(node('span','eyebrow',d.speaker||'灯の下で'),node('p','story-text',d.text),button('続きを読む　›',()=>this.act({type:'advance'}),'primary continue'));}
    else{section.append(node('span','eyebrow','あなたの判断'));const choices=node('div','choices');for(const o of d.options){const b=button('',()=>this.act({type:'choose',id:o.id}),'choice',!o.enabled);b.append(node('span','',o.text));if(o.requirement)b.append(node('small','',o.requirement));choices.append(b);}section.append(choices);}parent.append(section);
  }
  battle(parent,m){
    if(!m.battle.enemies.some(e=>e.id===this.selectedTarget&&e.hp>0))this.selectedTarget=m.battle.enemies.find(e=>e.hp>0)?.id;
    if(!m.party.some(a=>a.id===this.selectedAlly&&a.hp>0))this.selectedAlly=m.party.find(a=>a.hp>0)?.id;
    this.scene(parent,m);const section=node('div','battle-panel');section.append(heading(`BATTLE / TURN ${m.battle.round}`,`${m.battle.actorName} の行動`),node('p','muted','敵の絵を選んで攻撃先を変更できます。回復の対象は下で選べます。'));
    const select=node('select');select.setAttribute('aria-label','回復・道具の対象');for(const a of m.party.filter(a=>a.hp>0))select.append(new Option(`${a.name}　HP ${a.hp}/${a.maxHp}`,a.id));select.value=this.selectedAlly;select.addEventListener('change',()=>{this.selectedAlly=select.value;this.render(m);});section.append(select);
    const skills=node('div','battle-actions');for(const s of m.battle.skills){const target=s.target==='ally'?this.selectedAlly:s.target==='enemy'?this.selectedTarget:m.battle.actorId,available=s.availability?.[target]??{enabled:s.enabled,reason:s.reason};const b=button(`${s.name}${s.cost?' '+s.cost:s.mp?' MP'+s.mp:''}`,()=>this.act({type:'battle',action:'skill',skill:s.id,target}),'',!available.enabled);b.title=available.reason||s.description||s.name;skills.append(b);} for(const item of m.battle.items)skills.append(button(`${item.name} ×${item.count}`,()=>this.act({type:'battle',action:'item',item:item.id,target:this.selectedAlly})));skills.append(button('逃走',()=>this.act({type:'battle',action:'escape'}),'',!m.battle.canEscape));section.append(skills);const selected=m.battle.enemies.find(e=>e.id===this.selectedTarget);if(selected?.analysis){const analysis=selected.analysis;section.append(node('p','analysis-result',`${selected.name} 解析：攻${analysis.stats.str} 防${analysis.stats.vit} 速${analysis.stats.agi} 知${analysis.stats.int} MP${analysis.mp}/${analysis.stats.mp} ／ 耐性倍率 ${Object.entries(analysis.resist).map(([key,n])=>key+' ×'+n).join(' / ')||'すべて ×1'}`));}const unavailable=m.battle.skills.map(s=>{const target=s.target==='ally'?this.selectedAlly:s.target==='enemy'?this.selectedTarget:m.battle.actorId,a=s.availability?.[target];return a&&!a.enabled?`${s.name}：${a.reason}`:null;}).filter(Boolean);if(unavailable.length)section.append(node('p','muted',unavailable.join(' ／ ')));
    const log=node('div','battle-log');log.setAttribute('aria-live','polite');for(const line of m.battle.log.slice(-6))log.append(node('p','',line));section.append(log);parent.append(section);
  }
  soundButton(){const b=button(this.ui.soundLabel?.()??('音：'+(this.ui.soundEnabled()?'入':'切')),()=>this.ui.sound());b.dataset.audioToggle='true';return b;}
  updateSound(label){const b=this.root.querySelector('[data-audio-toggle]');if(b)b.textContent=label;}
  portrait(a,className='actor-portrait'){if(!a.portrait){const fallback=node('span',className,a.class[0]);fallback.style.color=a.color;return fallback;}const img=node('img',className);img.src=a.portrait;img.alt=a.name;img.dataset.fx=`actor:${a.id}`;img.width=160;img.height=160;img.loading='lazy';return img;}
  party(parent,m){
    const section=node('div','panel-content'),town=m.mode==='town';section.append(heading(town?'TAVERN / COMPANIONS':'COMPANIONS',town?(m.tavern?.name??'帰り火亭'):'冒険者の隊'));
    if(town)section.append(node('p','',m.tavern?.description??''),node('p','muted',`出発する仲間 ${m.party.length} / ${m.tavern?.maxParty??5}人。入れ替えは無料です。待機だけでは回復しません。`));
    const roster=town?(m.roster??m.party):m.party;
    for(const active of town?[true,false]:[true]){
      if(town)section.append(node('h3','roster-heading',active?'出発する仲間':'酒場で待つ仲間'));
      const grid=node('div','roster-grid');
      for(const a of roster.filter(a=>!town||(a.active??true)===active)){
        const card=node('article','companion-card'),head=node('div','companion-head'),body=node('div');body.append(node('span','eyebrow',a.class),node('h3','',a.name),node('p','',a.role));head.append(this.portrait(a),body);card.append(head,node('p','companion-bio',a.bio??''),node('p','muted',`HP ${a.hp}/${a.maxHp}　MP ${a.mp}/${a.maxMp}`),meter(a.hp,a.maxHp,'hp'),meter(a.mp,a.maxMp,'mp'),node('p','muted',`攻 ${a.stats.str}　防 ${a.stats.vit}　速 ${a.stats.agi}　知 ${a.stats.int}`));
        if(buffLabels(a).length)card.append(node('p','buff-summary',buffLabels(a).join(' / ')));
        if(a.statuses.length)card.append(node('p','requirement',a.statuses.join('・')));
        const skillList=node('div','skill-list');for(const skill of a.skills??[]){const label=node('span','badge',`${skill.name}${skill.mp?' MP'+skill.mp:''}`);label.title=skill.description??skill.name;skillList.append(label);}card.append(skillList);
        for(const item of a.equipmentSlots??[]){const row=node('div','equipment-row');row.append(node('span','',item.name));if(town)row.append(button('袋へ戻す',()=>this.act({type:'unequip',actor:a.id,slot:item.slot}),'',!item.canRemove));card.append(row);}
        if(!Object.keys(a.equipment).length)card.append(node('p','muted','標準の旅装'));
        card.append(fieldSkills(a,intent=>this.act(intent)));if(town){const panel=jobPanel(a,m,intent=>this.act(intent));if(panel)card.append(panel);const actions=node('div','companion-actions');
          if(active)actions.append(button('酒場で待機',()=>this.act({type:'party',action:'leave',actor:a.id}),'',!a.canLeave));
          else{actions.append(button('隊に加える',()=>this.act({type:'party',action:'join',actor:a.id}),'primary',!a.canJoin));if(a.swapCandidates?.length){const target=node('select');target.setAttribute('aria-label',`${a.name}と交代する仲間`);for(const c of a.swapCandidates)target.append(new Option(c.name,c.id));actions.append(target,button('この仲間と交代',()=>this.act({type:'party',action:'swap',actor:a.id,replace:target.value})));}}
          card.append(actions);
        }grid.append(card);
      }section.append(grid);
    }
    if(town){section.append(heading('REST / RECOVERY','出発前の休息'));for(const service of m.services){const row=node('div','service');row.append(button(service.label,()=>this.act({type:'service',id:service.id})),node('p','muted',service.detail));section.append(row);}}
    parent.append(section);
  }
  bag(parent,m){const section=node('div','panel-content');section.append(heading('PROVISIONS','持ち物と旅支度'));const target=node('select');target.setAttribute('aria-label','道具・装備の対象');for(const a of m.party)target.append(new Option(`${a.name} (${a.class})`,a.id));if(!m.party.some(a=>a.id===this.bagActor))this.bagActor=m.party[0]?.id;target.value=this.bagActor;target.addEventListener('change',()=>{this.bagActor=target.value;this.render(m);});section.append(target);
    for(const item of m.inventory){const row=node('article','item-row'),body=node('div');body.append(node('h3','',`${item.name} ×${item.count}`),node('p','muted',item.description));row.append(body);if(item.field||item.slot)row.append(button(item.slot?'装備する':'使う',()=>this.act({type:item.slot?'equip':'item',item:item.id,actor:target.value}),'',Boolean(item.slot&&item.allowedActors&&!item.allowedActors.includes(target.value))));section.append(row);}
    if(m.mode==='town'){section.append(heading('TRAVEL SHOP','買い足す'));for(const item of m.shop){const row=node('article','item-row'),body=node('div');body.append(node('h3','',item.name),node('p','muted',item.description));row.append(body,button(`${item.price} G`,()=>this.act({type:'buy',item:item.id}),'',!item.canBuy));section.append(row);}}parent.append(section);
  }
  journal(parent,m){const section=node('div','panel-content');section.append(heading('FIELD NOTES','冒険手帳'));if(m.ending){const ending=node('article','ending');ending.append(node('span','eyebrow','終幕'),node('h2','',m.ending.title),node('p','',m.ending.text));section.append(ending);}
    const active=m.quests.filter(q=>q.stage==='active');if(active.length){section.append(node('h3','','受注中'));for(const q of active)section.append(button(`${q.tracked?'◆ ':''}${q.title} / ${q.evidenceTotal===0?'相談・調査を進める':`手掛かり ${q.evidenceCount}/${q.evidenceTotal??2}`}`,()=>this.act({type:'track',id:q.id}),'journal-track'));}
    if(!m.journal.length)section.append(node('p','empty','現場で調べた手掛かりと、選んだ結末がここへ残ります。'));
    for(const entry of [...m.journal].reverse()){const row=node('article','journal-entry');row.append(node('span','eyebrow',entry.type==='evidence'?'手掛かり':'決着'),node('h3','',entry.title),node('p','',entry.text));section.append(row);}parent.append(section);
  }
  sidebar(parent,m){
    const party=node('section','side-section');party.append(node('span','eyebrow','冒険者の隊'));for(const a of m.party){const row=node('div',`party-row ${a.hp<=0?'fallen':''}`),avatar=this.portrait(a,'actor-symbol actor-thumb');const body=node('div','party-body');body.append(node('div','party-name',`${a.name}　${a.class}${a.statuses.length?' / '+a.statuses.join('・'):''}${buffLabels(a).length?' / '+buffLabels(a).join('・'):''}`),node('div','party-values',`HP ${a.hp}/${a.maxHp}　MP ${a.mp}/${a.maxMp}`),meter(a.hp,a.maxHp,'hp'),meter(a.mp,a.maxMp,'mp'));row.append(avatar,body);party.append(row);}parent.append(party);
    if(m.dungeon){const mapSection=node('section','side-section');mapSection.append(node('span','eyebrow','測量図'),node('p','muted',`灯油 ${m.light}/${m.lightMax}${m.light===0?'・暗闇では遭遇が増えます':''}`));const grid=node('div','minimap');grid.style.setProperty('--map-width',m.dungeon.width);grid.setAttribute('aria-label','探索済みの地図');for(const row of m.dungeon.cells)for(const cell of row){const obj=m.dungeon.objects.find(o=>o.x===cell.x&&o.y===cell.y),here=cell.x===m.dungeon.location.x&&cell.y===m.dungeon.location.y;const square=node('span',`map-cell ${cell.known?(cell.wall?'wall':'floor'):'unknown'} ${here?'current':''}`);if(here)square.textContent=({north:'↑',east:'→',south:'↓',west:'←'})[m.dungeon.location.facing];else if(cell.known&&obj)square.textContent=obj.glyph;if(cell.known)square.title=`${cell.x},${cell.y}${obj?' '+obj.name:''}`;grid.append(square);}mapSection.append(grid,node('p','map-legend','? 手掛かり　! 決着　▣ 補給　⇵ 階段'));parent.append(mapSection);}
    if(m.tracked){const tracked=node('section','side-section tracked-note');tracked.append(node('span','eyebrow','追跡中の依頼'),node('h3','',m.tracked.title),node('p','muted',m.tracked.brief),node('p','',m.tracked.evidenceTotal===0?'現地で相談・調査。中断後も続きから再開できます。':`手掛かり ${m.tracked.evidenceCount} / ${m.tracked.evidenceTotal??2}`));for(const loc of m.tracked.locations){const floor=loc.map.endsWith('f1')?1:2;tracked.append(node('p','coordinates',`地下${floor}層 (${loc.x}, ${loc.y}) / ${loc.role==='decision'?(m.tracked.evidenceTotal===0?'相談・調査':'決着'):loc.role==='clue_a'?'痕跡':'記録・証言'}`));}if(m.mode==='town')tracked.append(button('この迷宮へ',()=>this.act({type:'travel',region:m.tracked.region}),'primary'));parent.append(tracked);}
    else if(m.mode==='town'){const note=node('section','side-section');note.append(node('span','eyebrow','はじめの依頼'),node('h3','','帰らない灯番'),node('p','muted','まず地下水道の依頼を受けてください。位置は追跡欄に記されます。剣だけでなく、観察で選べる道が増えます。'));parent.append(note);}
  }
}
