import {appendDungeonArt} from './dungeon-art.js';
import {jobPanel,fieldSkills,buffLabels} from './jobs.js';
import {EffectsRenderer} from './effects.js';
import {paintDungeon} from './dungeon.js';
import {buttons,captureFocus,prepareControls,restoreFocus,closeDetails,focusButton} from './focus.js';
import {inputHint} from './key-bindings.js';
const node=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
const button=(text,callback,className='',disabled=false)=>{const b=node('button',className,text);b.type='button';b.disabled=disabled;b.addEventListener('click',callback);return b;};
const heading=(kicker,title)=>{const e=node('div','section-heading');e.append(node('span','eyebrow',kicker),node('h2','',title));return e;};
const meter=(value,max,className)=>{const e=node('div',`meter ${className}`),fill=node('span');fill.style.width=`${Math.max(0,Math.min(100,value/max*100))}%`;e.append(fill);e.setAttribute('role','meter');e.setAttribute('aria-valuenow',value);e.setAttribute('aria-valuemin',0);e.setAttribute('aria-valuemax',max);return e;};
export class GameView {
  constructor(root,dispatch,ui){this.bagActor=null;this.root=root;this.effects=new EffectsRenderer(root);this.dispatch=dispatch;this.ui=ui;this.tab='location';this.dungeonFilter='all';this.query='';this.filter='open';this.selectedTarget=null;this.selectedAlly=null;}
  destroy(){this.effects.destroy();}
  advanceText(){this.act({type:'advance'});}
  blocksGameInput(){return false;}
  explorationInput(){return this.model?.mode==='dungeon'&&!this.model.busy&&!this.model.dialog&&!this.model.battle&&this.tab==='explore'&&!this.blocksGameInput()&&!this.root.querySelector('.button-picker');}
  explorationDefault(){return this.root.querySelector('[data-focus="command:interact"]:not(:disabled)');}
  resumeExploration(){this.tabNavigation=false;if(!this.explorationInput())return false;focusButton(this.explorationDefault());return true;}
  keyHint(){const exploring=this.explorationInput();return this.ui.keyHint?.(exploring)??inputHint(undefined,exploring);}
  inputScope(){
    const panel=this.root.querySelector('.scene-window');
    if(panel)return panel.querySelector('.button-picker')??panel;
    return this.root.querySelector('.button-picker')??this.root.querySelector('.message-window')??this.root.querySelector('.battle-targets')??this.root.querySelector('.battle-actions')??(['location','explore'].includes(this.tab)?this.root.querySelector('.location-choices, .explore-controls'):null)??this.root.querySelector('.main-panel')??this.root;
  }
  finishInput(snapshot){
    this.tabNavigation=false;
    prepareControls(this.root);
    const m=this.model,key=JSON.stringify([m.mode,m.town?.id,this.tab,m.dialog?[m.feedback?.session,m.feedback?.revision,m.dialog,this.page]:null,m.battle?[m.battle.round,m.battle.actorId,m.battle.event]:null,this.pendingBattleAction]);
    const same=key===this.inputKey;this.inputKey=key;
    if(same)for(const d of this.root.querySelectorAll('details')){const toggle=d.querySelector('summary button');if(snapshot.details.includes(toggle?.dataset.focus)){d.open=true;toggle.setAttribute('aria-expanded','true');}}
    if(this.ui.modalOpen?.())return;
    if(this.resumeExploration())return;
    const scope=this.inputScope(),selected=this.pendingBattleAction?.target==='enemy'?this.selectedTarget:this.selectedAlly;
    const preferred=scope.querySelector('.choices button:not(:disabled), .continue')??(this.pendingBattleAction?buttons(scope).find(b=>b.dataset.focus===`target:${selected}`):null);
    restoreFocus(scope,same?snapshot:null,preferred??(same?null:buttons(scope.querySelector('.scene-window-body')??(!['location','explore'].includes(this.tab)?scope.querySelector('.panel-content'):null)??scope)[0]));
  }
  closePanel(){this.tab=this.model.mode==='town'?'location':'explore';this.render(this.model);}
  cancel(){
    if(closeDetails(this.inputScope()))return;
    const base=this.model.mode==='town'?'location':'explore';
    if(this.tab!==base){this.closePanel();return;}
    if(this.pendingBattleAction){const key=this.pendingBattleAction.focus;this.pendingBattleAction=null;this.render(this.model);focusButton([...this.root.querySelectorAll('[data-focus]')].find(e=>e.dataset.focus===key));return;}
    const d=this.model.dialog;
    if(d?.cancelAdvance){this.act({type:'advance'});return;}
    if(d?.cancelId&&d.options?.some(o=>o.id===d.cancelId&&o.enabled)){this.act({type:'choose',id:d.cancelId});return;}
    if(!this.model.busy&&this.model.town?.parent)this.act({type:'location.move',id:this.model.town.parent.id});
    else if(!this.resumeExploration())focusButton(buttons(this.inputScope())[0]);
  }
  act(intent){const accepted=this.dispatch(intent);if(accepted===false)this.ui.status(this.model?.notice||'現在はその操作を行えません。条件や隊の状態を確認してください。');}
  render(model){
    const snapshot=captureFocus(this.root);this.ui.cancelFeedback?.();this.effects.capture();this.model=model;
    this.root.replaceChildren();
    const header=node('header','masthead'),brand=node('div','brand');brand.append(node('div','brand-mark','灯'),node('div','brand-type'));
    brand.lastChild.append(node('h1','',model.title),node('p','',model.subtitle));
    const toolbar=node('div','toolbar');toolbar.append(button('手帳',()=>{this.tab='journal';this.render(model);}),button('記録',()=>this.ui.menu()),this.soundButton());header.append(brand,toolbar);this.root.append(header);
    const status=node('div','status-strip');for(const text of [`${model.mode==='town'?(model.town?.name??'灯帰りの町'):model.dungeon?.name}`,`隊 Lv.${model.level}`,`${model.gold} G`,`依頼 ${model.completed} / ${model.total}`])status.append(node('span','',text));this.root.append(status);
    const layout=node('main','game-layout'),main=node('section','main-panel'),side=node('aside','side-panel');main.dataset.fx='screen';side.dataset.fx='party';layout.append(main,side);this.root.append(layout);
    const tabs=node('nav','tabs');tabs.setAttribute('aria-label','表示する内容');
    const allTabs=model.mode==='town'?[['location','町・施設'],...(model.town?.quests?[['quests','依頼掲示板']]:[]),...(model.town?.dungeons.length?[['regions','迷宮へ']]:[]),...(model.town?.party?[['party','酒場・仲間']]:[]),['bag','旅支度'],['journal','冒険手帳']]:[['explore','探索'],['bag','道具'],['party','隊の状態'],['journal','冒険手帳']];
    if(!allTabs.some(([id])=>id===this.tab))this.tab=model.mode==='town'?'location':'explore';
    for(const [id,label] of allTabs){const b=button(label,()=>{this.tab=id;this.render(model);},id===this.tab?'active':'');b.setAttribute('aria-current',id===this.tab?'page':'false');tabs.append(b);}main.append(tabs);
    if(model.town)this.townScene(main,model);
    // Narrative and battles stay visible even if the player opens a utility tab.
    if(model.battle)this.battle(main,model);
    else if(model.dialog){if(model.dungeon)this.scene(main,model);this.dialog(main,model.dialog);if(model.commands)this.commandWindow(main,model.commands);}
    else if(this.tab==='location')this.location(main,model);
    else if(this.tab==='explore')this.explore(main,model);
    else if(this.tab==='quests')this.quests(main,model);
    else if(this.tab==='regions')this.regions(main,model);
    else if(this.tab==='party')this.party(main,model);
    else if(this.tab==='bag')this.bag(main,model);
    else this.journal(main,model);
    this.sidebar(side,model);
    if(model.notice&&model.notice!==model.dialog?.text){const notice=node('div','notice',model.notice);notice.setAttribute('role','status');this.root.append(notice);}
    const footer=node('footer','footer');footer.append(node('span','',model.mode==='dungeon'?this.keyHint():'依頼を受ける → 迷宮へ向かう → 足元と正面を調べる → 帰還する'),button('遊び方',()=>this.ui.help()));this.root.append(footer);
    this.effects.present(model,this.ui.effectsMode?.()??'full');
    this.finishInput(snapshot);
  }
  townScene(parent,m){
    const t=m.town,scene=node('div','town-scene');scene.dataset.fx='scene';
    const background=node('img','town-background');background.src=t.background;background.alt=t.name;scene.append(background);
    for(const c of t.cast){const image=node('img','town-character');image.src=c.sprite;image.alt=c.name;image.style.left=`${c.x}%`;scene.append(image);}
    const title=node('div','town-caption');title.append(node('span','eyebrow',t.breadcrumbs.map(l=>l.name).join(' / ')),node('h2','',t.name));scene.append(title);parent.append(scene);
  }
  location(parent,m){
    if(!m.town)return;const t=m.town,section=node('section','panel-content location-content');section.append(node('p','location-description',t.description));
    const choices=node('div','location-choices command-window');choices.setAttribute('aria-label','プレイヤーコマンド');
    for(const l of t.links)choices.append(button(l.name,()=>this.act({type:'location.move',id:l.id}),'location-choice',t.busy));
    for(const q of t.stories)choices.append(button(`${q.title}の続きを話す`,()=>this.act({type:'story.resume',quest:q.id}),'primary',!q.enabled));
    for(const service of t.services)choices.append(button(`${service.label} — ${service.detail}`,()=>this.act({type:'service',id:service.id}),'',t.busy));
    if(t.quests)choices.append(button('依頼掲示板を見る',()=>{this.tab='quests';this.render(m);}));
    if(t.party)choices.append(button('仲間と旅支度を相談する',()=>{this.tab='party';this.render(m);}));
    if(t.shop)choices.append(button('品物を見せてもらう',()=>{this.tab='bag';this.render(m);}));
    if(t.dungeons.length&&m.tracked?.destination?.kind==='dungeon')this.questEntrance(choices,m.tracked);
    if(t.dungeons.length)choices.append(button('迷宮へ続く階段へ',()=>{this.tab='regions';this.render(m);},'primary'));
    if(t.parent)choices.append(button(`${t.parent.name}へ戻る`,()=>this.act({type:'location.move',id:t.parent.id}),'location-back',t.busy));
    section.append(choices);parent.append(section);
  }
  questEntrance(parent,q){
    if(q.destination?.kind!=='dungeon')return;
    parent.append(button(`迷宮の入口へ向かう（${q.destination.name}）`,()=>this.act({type:'quest.travel',id:q.id}),'',!q.canEnter));
    if(!q.canEnter&&q.entryReason)parent.append(node('p','requirement',q.entryReason));
  }
  questDestination(parent,q){
    if(!q.destination)return;
    parent.append(node('p','quest-destination',`${q.stage==='available'?'開始地点':'次の目的地'}：${q.destination.label}`));
    if(q.stage==='active')parent.append(node('p','muted',q.destination.hint));
  }
  mainQuestControl(parent,q,m){
    if(q.tracked)parent.append(node('span','badge main-quest-badge','メインクエスト'));
    else parent.append(button('メインクエストに設定',()=>this.act({type:'track',id:q.id}),'primary',m.busy));
  }
  quests(parent,m){
    const section=node('div','panel-content');section.append(heading('GUILD / REQUESTS','今日も、帰るために潜る。'));
    if(m.town?.parent)section.append(button(`${m.town.parent.name}へ戻る`,()=>{this.tab='location';this.act({type:'location.move',id:m.town.parent.id});},'location-back',m.busy));
    const controls=node('div','board-controls'),search=node('input','search');search.placeholder='依頼名・依頼人で探す';search.setAttribute('aria-label','依頼を検索');search.value=this.query;search.dataset.focus='quest-search';search.addEventListener('input',()=>{this.query=search.value;this.render(m);});
    const select=node('select');select.setAttribute('aria-label','依頼先の迷宮');select.append(new Option('すべての迷宮','all'));for(const d of m.dungeons??[])select.append(new Option(d.name,d.id));select.value=this.dungeonFilter;select.addEventListener('change',()=>{this.dungeonFilter=select.value;this.render(m);});
    const filter=node('select');filter.setAttribute('aria-label','依頼の状態');for(const [v,t] of [['open','未完了'],['active','受注中'],['completed','完了'],['all','すべて']])filter.append(new Option(t,v));filter.value=this.filter;filter.addEventListener('change',()=>{this.filter=filter.value;this.render(m);});controls.append(search,select,filter);section.append(controls);
    const list=node('div','quest-list');const qs=m.quests.filter(q=>(this.dungeonFilter==='all'||q.dungeonIds?.includes(this.dungeonFilter))&&(!this.query||`${q.title}${q.client}${q.brief}`.includes(this.query))&&(this.filter==='all'||this.filter==='open'&&q.stage!=='completed'||q.stage===this.filter));
    if(!qs.length)list.append(node('p','empty','条件に合う依頼はない。迷宮や状態を変更できる。'));
    for(const q of qs){const card=node('article',`quest-card ${q.tracked?'tracked':''}`);card.dataset.controlGroup=`quest:${q.id}`;const num=node('span','quest-number',String(q.number).padStart(3,'0')),body=node('div','quest-body');
      const title=node('div','quest-title');title.append(node('h3','',q.title),node('span','badge',q.stage==='completed'?'完了':q.stage==='active'?'受注中':q.unlocked?`推奨 Lv.${q.recommendedLevel}`:'解放待ち'));body.append(title,node('p','quest-client',q.client),node('p','quest-brief',q.brief));
      this.questDestination(body,q);
      if(q.stage==='completed')body.append(node('p','muted',`関連する迷宮：${(q.dungeonNames??[]).join('・')}`));
      for(const note of q.fieldNotes??[])body.append(node('p','field-note',`現地記録：${note.text}`));
      if(!q.unlocked)body.append(node('p','requirement',q.unlockHint));
      if(q.outcome)body.append(node('p','outcome',q.outcome.text));
      const actions=node('div','quest-actions');
      if(q.stage==='available')actions.append(button('依頼を受ける',()=>this.act({type:'accept',id:q.id}),'primary',!q.unlocked||m.busy));
      if(q.stage==='active')this.mainQuestControl(actions,q,m);
      body.append(actions);if(q.stage==='active')this.questEntrance(body,q);
      card.append(num,body);list.append(card);
    }section.append(node('p','muted',`${qs.length}件を表示`),list);parent.append(section);
  }
  regions(parent,m){
    const section=node('div','panel-content');section.append(heading('DESCENT / DUNGEONS','潜る場所を選ぶ'));
    const list=node('div','region-list'),destinations=m.dungeons??m.regions;
    destinations.forEach((r,index)=>{
      const item=node('article','region-card');item.dataset.controlGroup=`region:${r.id}`;item.style.setProperty('--region-color',r.color);appendDungeonArt(item,r.art,r.name,'dungeon-art destination-art');
      const detail=m.dungeons?`${r.mapCount}マップ`: `${m.quests.filter(q=>q.region===r.id&&q.stage==='completed').length}件完了`;
      item.append(node('span','eyebrow',`${String(index+1).padStart(2,'0')} / 推奨 Lv.${r.recommendedLevel} / ${detail}`),node('h3','',r.name),node('p','',r.description),...(r.preview??[]).map(text=>node('p','muted',text)),button('迷宮に入る',()=>this.act(m.dungeons?{type:'travel',dungeon:r.id}:{type:'travel',region:r.id}),'primary',r.canEnter===false));
      list.append(item);
    });section.append(list);parent.append(section);
  }
  scene(parent,m){
    const scene=node('div','dungeon-scene'),canvas=node(m.dungeon?'canvas':'img','dungeon-canvas');if(m.dungeon)canvas.setAttribute('aria-label',`${m.dungeon.name}、${{north:'北',east:'東',south:'南',west:'西'}[m.dungeon.location.facing]}向きの通路`);else{canvas.src=m.battle.background;canvas.alt='戦場';}scene.dataset.fx='scene';scene.append(canvas);
    const location=node('div','scene-location');if(m.dungeon)location.append(node('span','eyebrow',`B${m.dungeon.floor} / ${m.dungeon.location.x}, ${m.dungeon.location.y}${m.dungeon.voxel?' / 高さ '+m.dungeon.z:''}`));location.append(node('span','',m.dungeon?.name??m.title));scene.append(location);
    if(m.dungeon){const direction=node('span','compass',({north:'N 北',east:'E 東',south:'S 南',west:'W 西'})[m.dungeon.location.facing]);scene.append(direction);}
    if(m.battle){const enemies=node('div','enemy-line');for(const e of m.battle.enemies){if(e.hp<=0)continue;const b=button('',()=>{this.selectedTarget=e.id;this.render(m);},`enemy ${this.selectedTarget===e.id?'selected':''}`);b.setAttribute('aria-label',`${e.name}を狙う、HP${e.hp}/${e.maxHp}`);const image=node('img');image.src=e.sprite;image.alt=e.name;image.dataset.fx=`enemy:${e.id}`;b.append(image,node('span','enemy-name',e.name),meter(e.hp,e.maxHp,'enemy-meter'),node('span','enemy-hp',`${e.hp} / ${e.maxHp}${e.guarded?'・防御中':''}${e.statuses.length?'・'+e.statuses.join('・'):''}${buffLabels(e).length?'・'+buffLabels(e).join(' / '):''}`));enemies.append(b);}scene.append(enemies);}
    for(const layer of m.atmosphere??[]){if(!layer.opacity||!layer.lighting&&(this.ui.effectsMode?.()??'full')==='off')continue;const shade=node('div','field-atmosphere');shade.setAttribute('aria-hidden','true');shade.style.opacity=String(layer.opacity);shade.style.background=layer.shade?`radial-gradient(ellipse at center,transparent 20%,${layer.color} 100%)`:layer.color;scene.append(shade);}
    parent.append(scene);if(m.dungeon)requestAnimationFrame(()=>paintDungeon(canvas,m.dungeon,m.battle));
  }
  explore(parent,m){
    this.scene(parent,m);const section=node('div','panel-content exploration-content');
    section.append(node('p','location-text',m.dungeon.here.length?m.dungeon.here.map(o=>o.name).join(' / '):'灯の届く通路が続いている。足元と正面に注意して進む。'));
    if(m.dungeon.surfaceNotice){const info=node('div','surface-notice');info.append(node('p','',m.dungeon.surfaceNotice.text));section.append(info);}
    this.commandWindow(section,m.commands);
    if(m.dungeon.currentCube){const c=m.dungeon.currentCube;section.append(node('p','voxel-current',`高さ ${m.dungeon.z} ／ ${c.waterLabel}`));section.append(node('p','muted',c.neighbors.map(n=>`${{north:'北',east:'東',south:'南',west:'西',up:'上',down:'下'}[n.side]}：${n.kind}${!n.passage?'・境界壁':''}${n.support?'・支持面':''}`).join(' ／ ')));}
    const log=node('div','travel-log');log.append(node('span','eyebrow','直近の記録'));for(const line of m.log.slice(-3))log.append(node('p','',line));section.append(log);parent.append(section);
  }
  commandWindow(parent,commands){
    if(!commands)return;
    const window=node('section','command-window explore-controls');window.setAttribute('aria-label',commands.title);
    const movement=node('div','movement-pad');
    for(const c of commands.movement)movement.append(button(c.label,()=>this.act(c.intent),c.direction,!c.enabled));
    const actions=node('div','explore-actions');
    for(const c of commands.actions){const b=button(c.label,()=>this.act(c.intent),c.id==='interact'?'primary':'',!c.enabled);b.dataset.focus=`command:${c.id}`;actions.append(b);}
    window.append(movement,actions);
    if(this.explorationInput())window.append(node('p','muted exploration-hint',this.keyHint()));
    parent.append(window);
  }
  dialog(parent,d){const section=node('section','story-window message-window');section.setAttribute('aria-label','メッセージウィンドウ');if(d.fieldScene){section.append(node('h3','',d.fieldScene.title));appendDungeonArt(section,d.fieldScene.art,d.fieldScene.title,'dungeon-art scene-art');}
    if(d.scene){
      section.append(node('p','story-place',d.scene.title));
      const cast=node('div','story-cast');cast.setAttribute('aria-label','この場面の登場人物');
      for(const c of d.scene.cast){const card=node('figure','story-person'+(c.remote?' remote':''));if(!this.model?.town?.cast.some(person=>person.id===c.id)){const img=node('img');img.src=c.portrait;img.alt=c.name;img.width=896;img.height=1024;img.decoding='async';card.append(img);}card.append(node('figcaption','',c.name+(c.remote?'（声）':'')));cast.append(card);}
      section.append(cast);
    }
    if(d.type==='text'){section.append(node('span','eyebrow',d.speaker||'灯の下で'),node('p','story-text',d.text),button('続きを読む　›',()=>this.advanceText(),'primary continue'));}
    else{section.append(node('span','eyebrow',d.speaker||'あなたの判断'),node('p','story-text',d.text??'どうする？'));const choices=node('div','choices');for(const o of d.options){const b=button('',()=>this.act({type:'choose',id:o.id}),'choice',!o.enabled);b.dataset.focus=`choice:${o.id}`;b.append(node('span','',o.text));if(o.requirement)b.append(node('small','',o.requirement));choices.append(b);}section.append(choices);}parent.append(section);
  }
  battle(parent,m){
    if(!m.battle.enemies.some(e=>e.id===this.selectedTarget&&e.hp>0))this.selectedTarget=m.battle.enemies.find(e=>e.hp>0)?.id;
    if(!m.party.some(a=>a.id===this.selectedAlly&&a.hp>0))this.selectedAlly=m.party.find(a=>a.hp>0)?.id;
    const turn=JSON.stringify([m.feedback?.session,m.battle.round,m.battle.actorId,m.battle.event]);
    if(turn!==this.battleTurn){this.pendingBattleAction=null;this.battleTurn=turn;}
    this.scene(parent,m);if(m.battle.event&&m.dialog){this.dialog(parent,{...m.dialog,scene:null});return;}
    const section=node('div','battle-panel');section.append(heading(`BATTLE / TURN ${m.battle.round}`,`${m.battle.actorName} の行動`),node('p','muted',this.ui.keyHint?.()??'矢印で選択・Enterで決定。対象選択中はEscで行動一覧へ戻ります。'));
    const chooseAction=(action,id,target,name,focus)=>{
      const intent={type:'battle',action,[action]:id};
      if(!['enemy','ally'].includes(target)){this.act({...intent,target:m.battle.actorId});return;}
      this.pendingBattleAction={intent,target,name,focus};this.render(m);
    };
    const pending=this.pendingBattleAction;
    if(pending){
      section.append(node('h3','',`${pending.name}の対象`));const targets=node('div','battle-targets');
      const skill=pending.intent.action==='skill'?m.battle.skills.find(s=>s.id===pending.intent.skill):null;
      for(const target of (pending.target==='enemy'?m.battle.enemies:m.party).filter(t=>t.hp>0)){
        const available=skill?.availability?.[target.id]??{enabled:true};
        const b=button(`${target.name}　HP ${target.hp}/${target.maxHp}`,()=>{
          if(pending.target==='enemy')this.selectedTarget=target.id;else this.selectedAlly=target.id;
          this.pendingBattleAction=null;this.act({...pending.intent,target:target.id});
        },'battle-target',!available.enabled);b.dataset.focus=`target:${target.id}`;b.title=available.reason??'';targets.append(b);
      }
      targets.append(button('行動へ戻る',()=>this.cancel()));section.append(targets);
    }else{
      const skills=node('div','battle-actions');
      for(const s of m.battle.skills){const focus=`skill:${s.id}`,b=button(`${s.name}${s.cost?' '+s.cost:s.mp?' MP'+s.mp:''}`,()=>chooseAction('skill',s.id,s.target,s.name,focus),'',!s.enabled);b.dataset.focus=focus;b.title=s.reason||s.description||s.name;skills.append(b);}
      for(const item of m.battle.items){const focus=`battle-item:${item.id}`,b=button(`${item.name} ×${item.count}`,()=>chooseAction('item',item.id,item.target??'ally',item.name,focus),'',item.enabled===false);b.dataset.focus=focus;skills.append(b);}
      skills.append(button('逃走',()=>this.act({type:'battle',action:'escape'}),'',!m.battle.canEscape));section.append(skills);
    }
    const selected=m.battle.enemies.find(e=>e.id===this.selectedTarget);
    if(selected?.analysis){const a=selected.analysis;section.append(node('p','analysis-result',`${selected.name} 解析：攻${a.stats.str} 防${a.stats.vit} 速${a.stats.agi} 知${a.stats.int} MP${a.mp}/${a.stats.mp} ／ 耐性倍率 ${Object.entries(a.resist).map(([key,n])=>key+' ×'+n).join(' / ')||'すべて ×1'}`));}
    const unavailable=m.battle.skills.filter(s=>!s.enabled).map(s=>`${s.name}：${s.reason}`);if(unavailable.length)section.append(node('p','muted',unavailable.join(' ／ ')));
    for(const system of m.dungeon?.systems??[])if(system.summary)section.append(node('p','muted',system.summary));
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
        const card=node('article','companion-card');card.dataset.controlGroup=`actor:${a.id}`;const head=node('div','companion-head'),body=node('div');body.append(node('span','eyebrow',a.class),node('h3','',a.name),node('p','',a.role));head.append(this.portrait(a),body);card.append(head,node('p','companion-bio',a.bio??''),node('p','muted',`HP ${a.hp}/${a.maxHp}　MP ${a.mp}/${a.maxMp}`),meter(a.hp,a.maxHp,'hp'),meter(a.mp,a.maxMp,'mp'),node('p','muted',`攻 ${a.stats.str}　防 ${a.stats.vit}　速 ${a.stats.agi}　知 ${a.stats.int}`));
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
    if(town){section.append(heading('REST / RECOVERY','出発前の休息'));for(const service of m.town?.services??m.services){const row=node('div','service');row.append(button(service.label,()=>this.act({type:'service',id:service.id})),node('p','muted',service.detail));section.append(row);}}
    parent.append(section);
  }
  bag(parent,m){const section=node('div','panel-content');section.append(heading('PROVISIONS','持ち物と旅支度'));const target=node('select');target.setAttribute('aria-label','道具・装備の対象');for(const a of m.party)target.append(new Option(`${a.name} (${a.class})`,a.id));if(!m.party.some(a=>a.id===this.bagActor))this.bagActor=m.party[0]?.id;target.value=this.bagActor;target.addEventListener('change',()=>{this.bagActor=target.value;this.render(m);});section.append(target);
    for(const item of m.inventory){const row=node('article','item-row');row.dataset.controlGroup=`item:${item.id}`;const body=node('div');body.append(node('h3','',`${item.name} ×${item.count}`),node('p','muted',item.description));row.append(body);if(item.field||item.slot)row.append(button(item.slot?'装備する':'使う',()=>this.act({type:item.slot?'equip':'item',item:item.id,actor:target.value}),'',Boolean(item.slot&&item.allowedActors&&!item.allowedActors.includes(target.value))));section.append(row);}
    if(m.mode==='town'&&m.town?.shop){section.append(heading('TRAVEL SHOP','買い足す'));for(const item of m.shop){const row=node('article','item-row');row.dataset.controlGroup=`shop:${item.id}`;const body=node('div');body.append(node('h3','',item.name),node('p','muted',item.description));row.append(body,button(`${item.price} G`,()=>this.act({type:'buy',item:item.id}),'',!item.canBuy));section.append(row);}}parent.append(section);
  }
  journal(parent,m){const section=node('div','panel-content');section.append(heading('FIELD NOTES','冒険手帳'));if(m.ending){const ending=node('article','ending');ending.append(node('span','eyebrow','終幕'),node('h2','',m.ending.title),node('p','',m.ending.text));section.append(ending);}
    const active=m.quests.filter(q=>q.stage==='active');if(active.length){section.append(node('h3','','受注中'));for(const q of active){const entry=node('article','journal-entry');entry.append(node('h3','',q.title));this.questDestination(entry,q);this.mainQuestControl(entry,q,m);this.questEntrance(entry,q);section.append(entry);}}
    for(const note of m.fieldNotes??[]){const row=node('article','journal-entry');row.append(node('span','eyebrow','現地の観察'),node('h3','',note.title),node('p','muted',m.quests.find(q=>q.id===note.quest)?.title??''),node('p','',note.text));section.append(row);}
    if(!m.journal.length&&!m.fieldNotes?.length)section.append(node('p','empty','現場で調べた手掛かりと、選んだ結末がここへ残ります。'));
    for(const entry of [...m.journal].reverse()){const row=node('article','journal-entry');row.append(node('span','eyebrow',entry.type==='evidence'?'手掛かり':'決着'),node('h3','',entry.title),node('p','',entry.text));section.append(row);}parent.append(section);
  }
  sidebar(parent,m){
    const party=node('section','side-section');party.append(node('span','eyebrow','冒険者の隊'));for(const a of m.party){const row=node('div',`party-row ${a.hp<=0?'fallen':''}`),avatar=this.portrait(a,'actor-symbol actor-thumb');const body=node('div','party-body');body.append(node('div','party-name',`${a.name}　${a.class}${a.statuses.length?' / '+a.statuses.join('・'):''}${buffLabels(a).length?' / '+buffLabels(a).join('・'):''}`),node('div','party-values',`HP ${a.hp}/${a.maxHp}　MP ${a.mp}/${a.maxMp}`),meter(a.hp,a.maxHp,'hp'),meter(a.mp,a.maxMp,'mp'));row.append(avatar,body);party.append(row);}parent.append(party);
    if(m.dungeon){const mapSection=node('section','side-section');mapSection.append(node('span','eyebrow','測量図'),node('p','muted',`${m.lightLabel??'灯油'} ${m.light}/${m.lightMax}${m.light===0?(m.dungeon.systems?.some(s=>s.kind==='fire_network')?'・台座の守りを確認してください':'・暗闇では遭遇が増えます'):''}`));const grid=node('div','minimap');grid.style.setProperty('--map-width',m.dungeon.width);grid.style.aspectRatio=`${m.dungeon.width}/${m.dungeon.height}`;grid.setAttribute('aria-label','探索済みの地図');for(const row of m.dungeon.cells)for(const cell of row){const obj=m.dungeon.objects.find(o=>o.x===cell.x&&o.y===cell.y),here=cell.x===m.dungeon.location.x&&cell.y===m.dungeon.location.y;const square=node('span',`map-cell ${cell.known?(cell.wall?'wall':'floor'):'unknown'} ${cell.known&&cell.water?'flooded':''} ${here?'current':''}`);if(here)square.textContent=({north:'↑',east:'→',south:'↓',west:'←'})[m.dungeon.location.facing];else if(cell.known&&obj)square.textContent=obj.glyph;if(cell.known&&obj?.kind==='map_connection')square.dataset.connection=obj.closed?'closed':'open';if(cell.known&&cell.edges)for(const [side,closed] of Object.entries(cell.edges))if(closed)square.style[{north:'borderTop',east:'borderRight',south:'borderBottom',west:'borderLeft'}[side]]='2px solid #e4bd80';if(cell.known&&cell.waterDepth)square.dataset.depth=String(cell.waterDepth);if(cell.known&&cell.floor===false&&!cell.wall){square.classList.add('pit');if(!here&&!obj)square.textContent='○';}if(cell.known){const light=cell.illumination??0;square.dataset.light=String(light);if(!here){square.style.filter=`brightness(${.55+light/8})`;square.style.boxShadow=`inset 0 0 0 100px rgba(255,212,115,${.28*light/8})`;}}if(cell.known)square.title=`${cell.x},${cell.y}${m.dungeon.voxel?', 高さ '+m.dungeon.z+' / '+cell.waterLabel:''}${obj?' '+obj.name:''} / 明るさ ${cell.illumination??0}/8`;grid.append(square);}mapSection.append(grid,node('p','map-legend','明るい色ほど光が強い。暗闇でも踏査済みの地図は読める。? 手掛かり　! 決着　⇵ 階段　▣ 水密扉施錠　▯ 扉通行可　≈ 水没'));parent.append(mapSection);}
    if(m.tracked){const tracked=node('section','side-section tracked-note');tracked.append(node('span','eyebrow','メインクエスト'),node('h3','',m.tracked.title),node('p','muted',m.tracked.brief));this.questDestination(tracked,m.tracked);parent.append(tracked);}
    else if(m.mode==='town'){const note=node('section','side-section');note.append(node('span','eyebrow','はじめの依頼'),node('h3','','帰らない灯番'),node('p','muted','組合で依頼を受け、篝火の迷宮へ向かってください。位置はメインクエスト欄に記されます。剣だけでなく、観察で選べる道が増えます。'));parent.append(note);}
  }
}
