import {renderCharacter,renderParty} from './character-profile.js';
import {renderBag,renderShop,cancelInventoryAction} from './inventory-view.js';
import {mapSection} from './minimap.js';
import {appendDungeonArt} from './dungeon-art.js';
import {buffLabels} from './jobs.js';
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
  destroy(){this.closeMap({restore:false});this.effects.destroy();}
  advanceText(){this.act({type:'advance'});}
  blocksGameInput(){return Boolean(this.mapOverlay);}
  openMap(){
    if(this.mapOverlay||!this.model?.dungeon)return;
    this.mapReturnFocus=captureFocus(this.root);
    this.mapInert=[...this.root.children].map(e=>[e,e.inert]);for(const [e] of this.mapInert)e.inert=true;
    const overlay=node('div','map-overlay'),panel=node('section','map-dialog');
    panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','expanded-map-title');
    const header=node('header','map-dialog-header'),title=node('h2','',this.model.dungeon.name);title.id='expanded-map-title';
    const close=button('元に戻す',()=>this.closeMap());close.dataset.focus='map:close';header.append(title,close);
    const body=node('div','map-dialog-body'),section=mapSection(this.model);section.style.setProperty('--map-expanded-width',`${this.model.dungeon.width*36+10}px`);body.append(section);
    panel.append(header,body);overlay.append(panel);this.root.append(overlay);this.mapOverlay=overlay;
    prepareControls(panel);focusButton(close);
  }
  closeMap({restore=true}={}){
    if(!this.mapOverlay)return;
    this.mapOverlay.remove();this.mapOverlay=null;
    for(const [e,inert] of this.mapInert??[])e.inert=inert;this.mapInert=null;
    if(restore){restoreFocus(this.root,this.mapReturnFocus);this.tabNavigation=true;}
  }
  handleKey(event){
    const panel=this.mapOverlay?.querySelector('.map-dialog');if(!panel)return false;
    if(event.key==='Tab'){
      const nodes=buttons(panel),first=nodes[0],last=nodes.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();focusButton(last);}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();focusButton(first);}
    }
    return true;
  }
  explorationInput(){return this.model?.mode==='dungeon'&&!this.model.busy&&!this.model.dialog&&!this.model.battle&&this.tab==='explore'&&!this.blocksGameInput()&&!this.root.querySelector('.button-picker');}
  explorationDefault(){return this.root.querySelector('[data-focus="command:interact"]:not(:disabled)');}
  resumeExploration(){this.tabNavigation=false;if(!this.explorationInput())return false;focusButton(this.explorationDefault());return true;}
  keyHint(){const exploring=this.explorationInput();return this.ui.keyHint?.(exploring)??inputHint(undefined,exploring);}
  inputScope(){
    const expanded=this.mapOverlay?.querySelector('.map-dialog');if(expanded)return expanded;
    const inventory=this.root.querySelector('.inventory-choice');if(inventory&&!inventory.classList.contains('shop-recipients'))return inventory;
    const panel=this.root.querySelector('.scene-window');
    if(panel)return panel.querySelector('.button-picker')??panel;
    return this.root.querySelector('.button-picker')??this.root.querySelector('.message-window')??this.root.querySelector('.battle-targets')??this.root.querySelector('.battle-actions')??(['location','explore'].includes(this.tab)?this.root.querySelector('.location-choices, .explore-controls'):null)??this.root.querySelector('.main-panel')??this.root;
  }
  finishInput(snapshot){
    if(!this.model.battle){this.battleTurn=null;this.battleMenu=null;this.pendingBattleAction=null;}
    this.tabNavigation=false;
    prepareControls(this.root);
    for(const scroll of snapshot.scrolls??[]){const e=[...this.root.querySelectorAll('[data-scroll]')].find(e=>e.dataset.scroll===scroll.key);if(e){e.scrollTop=scroll.top;e.scrollLeft=scroll.left;}}
    const m=this.model,key=JSON.stringify([m.mode,m.town?.id,this.tab,m.dialog?[m.feedback?.session,m.feedback?.revision,m.dialog,this.page]:null,m.battle?[m.battle.round,m.battle.actorId,m.battle.event]:null,this.battleMenu,this.pendingBattleAction,this.inventoryAction,this.bagActor]);
    const same=key===this.inputKey;this.inputKey=key;
    if(same)for(const d of this.root.querySelectorAll('details')){const toggle=d.querySelector('summary button');if(snapshot.details.includes(toggle?.dataset.focus)){d.open=true;toggle.setAttribute('aria-expanded','true');}}
    if(this.ui.modalOpen?.())return;
    if(this.resumeExploration())return;
    const scope=this.inputScope(),selected=this.pendingBattleAction?.target==='enemy'?this.selectedTarget:this.selectedAlly;
    const preferred=(this.inventoryAction?.kind==='buy'?scope.querySelector('.shop-recipients button:not(:disabled)'):null)??scope.querySelector('.choices button:not(:disabled), .continue')??(this.pendingBattleAction?buttons(scope).find(b=>b.dataset.focus===`target:${selected}`):null);
    restoreFocus(scope,same?snapshot:null,preferred??(same?null:buttons(scope.querySelector('.scene-window-body')??(!['location','explore'].includes(this.tab)?scope.querySelector('.panel-content'):null)??scope)[0]));
  }
  openCharacter(id){this.profileActor=id;this.profilePage='overview';this.inventoryAction=null;this.tab='profile';this.render(this.model);}
  closePanel(){this.inventoryAction=null;this.tab=this.model.mode==='town'?'location':'explore';this.render(this.model);}
  cancel(){
    if(this.mapOverlay){this.closeMap();return;}
    if(this.tab==='profile'&&this.profilePage!=='overview'&&!this.root.querySelector('.button-picker')){this.profilePage='overview';this.render(this.model);return;}
    const profile=document.activeElement?.closest('.character-profile')?.dataset.profile;
    if(this.tab==='party'&&profile&&this.partyPages?.[profile]!=='overview'){this.partyPages[profile]='overview';this.render(this.model);return;}
    if(cancelInventoryAction(this))return;
    if(closeDetails(this.inputScope()))return;
    const base=this.model.mode==='town'?'location':'explore';
    if(this.tab!==base){this.closePanel();return;}
    if(this.pendingBattleAction){const key=this.pendingBattleAction.focus;this.pendingBattleAction=null;this.render(this.model);focusButton([...this.root.querySelectorAll('[data-focus]')].find(e=>e.dataset.focus===key));return;}
    if(this.battleMenu){const key=`battle-menu:${this.battleMenu}`;this.battleMenu=null;this.render(this.model);focusButton([...this.root.querySelectorAll('[data-focus]')].find(e=>e.dataset.focus===key));return;}
    const d=this.model.dialog;
    if(d?.cancelAdvance){this.act({type:'advance'});return;}
    if(d?.cancelId&&d.options?.some(o=>o.id===d.cancelId&&o.enabled)){this.act({type:'choose',id:d.cancelId});return;}
    if(!this.model.busy&&this.model.town?.parent)this.act({type:'location.move',id:this.model.town.parent.id});
    else if(!this.model.busy&&this.model.town?.exit)this.act(this.model.town.exit.intent);
    else if(!this.resumeExploration())focusButton(buttons(this.inputScope())[0]);
  }
  act(intent){const accepted=this.dispatch(intent);if(accepted===false)this.ui.status(this.model?.notice||'現在はその操作を行えません。条件や隊の状態を確認してください。');}
  render(model){
    this.closeMap({restore:false});
    const snapshot=captureFocus(this.root);this.ui.cancelFeedback?.();this.effects.capture();this.model=model;
    this.root.replaceChildren();
    const header=node('header','masthead'),brand=node('div','brand');brand.append(node('div','brand-mark','灯'),node('div','brand-type'));
    brand.lastChild.append(node('h1','',model.title),node('p','',model.subtitle));
    const toolbar=node('div','toolbar');toolbar.append(button('手帳',()=>{this.tab='journal';this.render(model);}),button('記録',()=>this.ui.menu()),this.soundButton());header.append(brand,toolbar);this.root.append(header);
    const status=node('div','status-strip');for(const text of [`${model.mode==='town'?(model.town?.name??'灯帰りの町'):model.dungeon?.name}`,`隊 Lv.${model.level}`,`${model.gold} G`,`依頼 ${model.completed} / ${model.total}`])status.append(node('span','',text));this.root.append(status);
    const layout=node('main','game-layout'),main=node('section','main-panel'),side=node('aside','side-panel');main.dataset.fx='screen';side.dataset.fx='party';layout.append(main,side);this.root.append(layout);
    const tabs=node('nav','tabs');tabs.setAttribute('aria-label','表示する内容');
    const allTabs=model.mode==='town'?[['location',model.town?.interior?'詰所':'町・施設'],...(model.town?.shop?[['shop','ショップ']]:[]),...(model.town?.quests?[['quests','依頼掲示板']]:[]),...(model.town?.dungeons.length?[['regions','迷宮へ']]:[]),['party','隊の状態'],['bag','旅支度'],['journal','冒険手帳']]:[['explore','探索'],['bag','旅支度'],['party','隊の状態'],['journal','冒険手帳']];
    if(this.tab==='profile'&&model.mode==='town')allTabs.push(['profile','キャラクター']);
    if(!allTabs.some(([id])=>id===this.tab))this.tab=model.mode==='town'?'location':'explore';
    if(this.inventoryAction&&(this.inventoryAction.kind==='buy'?this.tab!=='shop':this.tab!=='bag'))this.inventoryAction=null;
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
    else if(this.tab==='profile')this.profile(main,model);
    else if(this.tab==='bag')this.bag(main,model);
    else if(this.tab==='shop')this.shop(main,model);
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
    if(t.shop)choices.append(button('ショップを見る',()=>{this.tab='shop';this.render(m);}));
    if(t.dungeons.length&&m.tracked?.entryDungeon)this.questEntrance(choices,m.tracked);
    if(t.dungeons.length)choices.append(button('迷宮へ続く階段へ',()=>{this.tab='regions';this.render(m);},'primary'));
    if(t.parent)choices.append(button(`${t.parent.name}へ戻る`,()=>this.act({type:'location.move',id:t.parent.id}),'location-back',t.busy));
    if(t.exit)choices.append(button(t.exit.label,()=>this.act(t.exit.intent),'location-back',t.busy));
    section.append(choices);parent.append(section);
  }
  questEntrance(parent,q){
    if(!q.entryDungeon)return;
    parent.append(button(`迷宮の入口へ向かう（${q.entryDungeonName??q.destination.name}）`,()=>this.act({type:'quest.travel',id:q.id}),'',!q.canEnter));
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
    for(const c of commands.actions){const b=button(c.label,()=>this.act(c.intent),c.id==='interact'?'primary':'',!c.enabled);b.dataset.focus=`command:${c.id}`;if(c.reason)b.title=c.reason;actions.append(b);}
    window.append(movement,actions);
    for(const reason of commands.restrictions??[])window.append(node('p','muted dungeon-restriction',reason));
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
    if(turn!==this.battleTurn){this.pendingBattleAction=null;this.battleMenu=null;this.battleTurn=turn;}
    this.scene(parent,m);if(m.battle.event&&m.dialog){this.dialog(parent,m.dialog);return;}
    const section=node('div','battle-panel'),commands=node('section','battle-commands');commands.setAttribute('aria-label','戦闘コマンド');
    commands.append(node('h2','battle-actor',`${m.battle.actorName} の行動`));section.append(commands);
    const chooseAction=(action,id,target,name,focus)=>{
      const intent={type:'battle',action,[action]:id};
      if(!['enemy','ally'].includes(target)){this.act({...intent,target:m.battle.actorId});return;}
      this.pendingBattleAction={intent,target,name,focus};this.render(m);
    };
    const pending=this.pendingBattleAction;
    if(pending){
      commands.append(node('h3','battle-menu-title',`${pending.name}の対象`));const targets=node('div','battle-targets');targets.setAttribute('aria-label',`${pending.name}の対象`);
      const skill=pending.intent.action==='skill'?m.battle.skills.find(s=>s.id===pending.intent.skill):null;
      for(const target of (pending.target==='enemy'?m.battle.enemies:m.party).filter(t=>t.hp>0)){
        const available=skill?.availability?.[target.id]??{enabled:true};
        const b=button(`${target.name}　HP ${target.hp}/${target.maxHp}`,()=>{
          if(pending.target==='enemy')this.selectedTarget=target.id;else this.selectedAlly=target.id;
          this.pendingBattleAction=null;this.battleMenu=null;this.act({...pending.intent,target:target.id});
        },'battle-target',!available.enabled);b.dataset.focus=`target:${target.id}`;b.title=available.reason??'';targets.append(b);
      }
      const back=button('戻る',()=>this.cancel());back.dataset.focus='battle:back';targets.append(back);commands.append(targets);
    }else{
      const actions=node('div','battle-actions'),basic=new Set(['attack','guard']);
      const label=this.battleMenu==='skills'?'スキル':this.battleMenu==='items'?'アイテム':'行動';actions.setAttribute('aria-label',label);
      if(this.battleMenu)commands.append(node('h3','battle-menu-title',label));
      const appendSkill=s=>{const focus=`skill:${s.id}`,b=button(`${s.name}${s.cost?' '+s.cost:s.mp?' MP'+s.mp:''}`,()=>chooseAction('skill',s.id,s.target,s.name,focus),'',!s.enabled);b.dataset.focus=focus;b.title=s.reason||s.description||s.name;actions.append(b);};
      if(this.battleMenu==='skills')for(const s of m.battle.skills.filter(s=>!basic.has(s.id)))appendSkill(s);
      else if(this.battleMenu==='items')for(const item of m.battle.items){const focus=`battle-item:${item.id}`,b=button(`${item.name} ×${item.count}`,()=>chooseAction('item',item.id,item.target??'ally',item.name,focus),'',item.enabled===false);b.dataset.focus=focus;actions.append(b);}
      else{
        for(const id of basic){const s=m.battle.skills.find(s=>s.id===id);if(s)appendSkill(s);}
        for(const [id,title,hasEntries] of [['skills','スキル',m.battle.skills.some(s=>!basic.has(s.id))],['items','アイテム',m.battle.items.length>0]]){
          const b=button(title,()=>{this.battleMenu=id;this.render(m);},'',!hasEntries);b.dataset.focus=`battle-menu:${id}`;actions.append(b);
        }
        const escape=button('逃走',()=>this.act({type:'battle',action:'escape'}),'',!m.battle.canEscape);escape.dataset.focus='battle:escape';actions.append(escape);
      }
      if(this.battleMenu){const back=button('戻る',()=>this.cancel());back.dataset.focus='battle:back';actions.append(back);}commands.append(actions);
    }
    const log=node('section','battle-log');log.setAttribute('aria-label','戦闘メッセージ');log.setAttribute('role','log');log.setAttribute('aria-live','polite');
    for(const line of m.battle.log.slice(-6))log.append(node('p','',line));
    const selected=m.battle.enemies.find(e=>e.id===this.selectedTarget);
    if(selected?.analysis){const a=selected.analysis;log.append(node('p','analysis-result',`${selected.name} 解析：攻${a.stats.str} 防${a.stats.vit} 速${a.stats.agi} 知${a.stats.int} MP${a.mp}/${a.stats.mp} ／ 耐性倍率 ${Object.entries(a.resist).map(([key,n])=>key+' ×'+n).join(' / ')||'すべて ×1'}`));}
    section.append(log);parent.append(section);
    requestAnimationFrame(()=>{if(log.isConnected)log.scrollTop=log.scrollHeight;});
  }
  soundButton(){const b=button(this.ui.soundLabel?.()??('音：'+(this.ui.soundEnabled()?'入':'切')),()=>this.ui.sound());b.dataset.audioToggle='true';return b;}
  updateSound(label){const b=this.root.querySelector('[data-audio-toggle]');if(b)b.textContent=label;}
  portrait(a,className='actor-portrait'){if(!a.portrait){const fallback=node('span',className,a.class[0]);fallback.style.color=a.color;return fallback;}const img=node('img',className);img.src=a.portrait;img.alt=a.name;img.dataset.fx=`actor:${a.id}`;img.width=160;img.height=160;img.loading='lazy';return img;}
  profile(parent,m){renderCharacter(this,parent,m);}
  party(parent,m){renderParty(this,parent,m);}
  bag(parent,m){renderBag(this,parent,m);}
  shop(parent,m){renderShop(this,parent,m);}
  journal(parent,m){const section=node('div','panel-content');section.append(heading('FIELD NOTES','冒険手帳'));if(m.ending){const ending=node('article','ending');ending.append(node('span','eyebrow','終幕'),node('h2','',m.ending.title),node('p','',m.ending.text));section.append(ending);}
    const active=m.quests.filter(q=>q.stage==='active');if(active.length){section.append(node('h3','','受注中'));for(const q of active){const entry=node('article','journal-entry');entry.append(node('h3','',q.title));this.questDestination(entry,q);this.mainQuestControl(entry,q,m);this.questEntrance(entry,q);section.append(entry);}}
    for(const note of m.fieldNotes??[]){const row=node('article','journal-entry');row.append(node('span','eyebrow','現地の観察'),node('h3','',note.title),node('p','muted',m.quests.find(q=>q.id===note.quest)?.title??''),node('p','',note.text));section.append(row);}
    if(!m.journal.length&&!m.fieldNotes?.length)section.append(node('p','empty','現場で調べた手掛かりと、選んだ結末がここへ残ります。'));
    for(const entry of [...m.journal].reverse()){const row=node('article','journal-entry');row.append(node('span','eyebrow',entry.type==='evidence'?'手掛かり':'決着'),node('h3','',entry.title),node('p','',entry.text));section.append(row);}parent.append(section);
  }
  sidebar(parent,m){
    const party=node('section','side-section');party.append(node('span','eyebrow','冒険者の隊'));for(const a of m.party){const row=m.mode==='town'?button('',()=>this.openCharacter(a.id),`party-row ${a.hp<=0?'fallen':''}`):node('div',`party-row ${a.hp<=0?'fallen':''}`);row.dataset.focus=`character:${a.id}`;row.dataset.fxFallback=`actor:${a.id}`;const avatar=this.portrait(a,'actor-symbol actor-thumb');const body=node('div','party-body');body.append(node('div','party-name',`${a.name}　${a.class}${a.statuses.length?' / '+a.statuses.join('・'):''}${buffLabels(a).length?' / '+buffLabels(a).join('・'):''}`),node('div','party-values',`HP ${a.hp}/${a.maxHp}　MP ${a.mp}/${a.maxMp}`),meter(a.hp,a.maxHp,'hp'),meter(a.mp,a.maxMp,'mp'));row.append(avatar,body);party.append(row);}parent.append(party);
    if(m.dungeon)parent.append(mapSection(m,{onExpand:()=>this.openMap()}));
    if(m.tracked){const tracked=node('section','side-section tracked-note');tracked.append(node('span','eyebrow','メインクエスト'),node('h3','',m.tracked.title),node('p','muted',m.tracked.brief));this.questDestination(tracked,m.tracked);parent.append(tracked);}
    else if(m.mode==='town'){const note=node('section','side-section');note.append(node('span','eyebrow','はじめの依頼'),node('h3','','帰らない灯番'),node('p','muted','組合で依頼を受け、篝火の迷宮へ向かってください。位置はメインクエスト欄に記されます。剣だけでなく、観察で選べる道が増えます。'));parent.append(note);}
  }
}
