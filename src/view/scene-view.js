import {mapSection} from './minimap.js';
import {GameView} from './view.js';
import {appendSceneCast} from './scene-cast.js';
import {messagePages,pageAtOffset} from './message-pages.js';
import {captureFocus} from './focus.js';
const make=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
const button=(text,fn,className='')=>{const e=make('button',className,text);e.type='button';e.addEventListener('click',fn);return e;};
const panelNames={profile:'キャラクタープロフィール',bag:'旅支度',shop:'ショップ',party:'隊の状態',journal:'冒険手帳',quests:'依頼掲示板',regions:'迷宮へ',map:'測量図'};
const focusable='button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary';

export class SceneView extends GameView{
  constructor(...args){super(...args);this.messageKey=null;this.page=0;this.pages=[''];this.sceneKey=null;this.fontsChanged=()=>{const snapshot=captureFocus(this.root);if(this.measureMessage(true))this.finishInput(snapshot);};document.fonts?.addEventListener('loadingdone',this.fontsChanged);}
  destroy(){this.resizeObserver?.disconnect();globalThis.cancelAnimationFrame?.(this.measureFrame);document.fonts?.removeEventListener('loadingdone',this.fontsChanged);super.destroy();}
  blocksGameInput(){return super.blocksGameInput()||Boolean(this.root.querySelector('.scene-window'));}
  canChoose(){return this.page===this.pages.length-1;}
  advanceText(){if(!this.canChoose())this.setPage(this.page+1);else if(this.messageNodes?.dialog.type!=='description')super.advanceText();}
  setPage(page){this.page=Math.max(0,Math.min(page,this.pages.length-1));this.refreshMessage();this.finishInput(captureFocus(this.root));}
  cancel(){if(!this.blocksGameInput()&&this.model.dialog){if(this.model.dialog.cancelId||this.model.dialog.cancelAdvance){super.cancel();return;}if(this.page>0){this.setPage(this.page-1);return;}if(!this.canChoose())return;}super.cancel();}
  inputScope(){if(!this.blocksGameInput()&&!this.model.dialog&&this.model.town)return this.root.querySelector('.scene-dock')??super.inputScope();return super.inputScope();}
  openPanel(tab){this.inventoryAction=null;if(tab==='map'){this.openMap();return;}this.tab=tab;this.render(this.model);}
  closePanel(){this.inventoryAction=null;this.tab=this.model.mode==='town'?'location':'explore';this.render(this.model);}
  handleKey(event){
    if(super.handleKey(event))return true;
    const panel=this.root.querySelector('.scene-window');
    if(!panel)return false;
    if(event.key==='Tab'){
      const nodes=[...panel.querySelectorAll(focusable)].filter(e=>e.getClientRects().length);
      const first=nodes[0],last=nodes.at(-1),current=document.activeElement;
      if(event.shiftKey&&current===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&current===last){event.preventDefault();first?.focus();}
    }
    return true;
  }
  dialog(parent,d){
    const key=JSON.stringify([this.model.feedback?.session,this.model.feedback?.revision,d.type,d.speaker,d.text,d.scene?.title,d.options]);
    const revealsChoices=this.lastDialog?.type==='text'&&d.type==='choice'&&this.lastDialog.text===d.text&&this.lastDialog.speaker===d.speaker&&this.canChoose();
    if(key!==this.messageKey){this.messageKey=key;if(!revealsChoices){this.page=0;this.pages=messagePages(d.text);}}
    this.lastDialog=d;
    const description=d.type==='description',window=make('section',description?'scene-description':'story-window message-window scene-message');
    window.setAttribute('aria-label','メッセージウィンドウ');
    const body=make('div','scene-message-body');
    if(d.fieldScene?.title||d.scene?.title)body.append(make('p','story-place',d.fieldScene?.title??d.scene.title));
    if(!description)body.append(make('span','eyebrow',d.speaker||(d.type==='choice'?'あなたの判断':'灯の下で')));
    const viewport=make('div','scene-text-viewport'),text=make('p','story-text'),paging=make('div','scene-paging');viewport.append(text);
    const previous=button('前のページ',()=>this.setPage(this.page-1)),counter=make('span','scene-page-count');previous.dataset.focus='message:previous';
    paging.append(previous,counter);body.append(viewport,paging);window.append(body);
    const actions=description?null:make('div','scene-message-actions');if(actions)window.append(actions);
    parent.append(window);this.messageNodes={dialog:d,window,body,viewport,text,paging,previous,counter,actions,measureKey:null};this.refreshMessage();
  }
  refreshMessage(){
    const n=this.messageNodes;if(!n)return;
    n.text.textContent=this.pages[this.page];n.previous.disabled=this.page===0;n.paging.hidden=this.pages.length===1;
    n.counter.textContent=`${this.page+1} / ${this.pages.length}`;
    if(n.dialog.type==='description'){
      n.paging.querySelector('.continue')?.remove();if(!this.canChoose()){const next=button('次のページ',()=>this.advanceText(),'continue');next.dataset.focus='message:next';n.paging.append(next);}return;
    }
    n.actions.replaceChildren();
    if(this.canChoose()&&n.dialog.type==='choice'){
      const choices=make('div','choices');choices.setAttribute('aria-label','選択肢');
      for(const o of n.dialog.options){const b=button('',()=>this.act({type:'choose',id:o.id}),'choice');b.disabled=!o.enabled;b.dataset.focus=`choice:${o.id}`;b.append(make('span','',o.text));if(o.requirement)b.append(make('small','',o.requirement));choices.append(b);}n.actions.append(choices);
    }else{const next=button(this.canChoose()?'続きを読む　›':'次のページ　›',()=>this.advanceText(),'primary continue');next.dataset.focus='message:next';n.actions.append(next);}
  }
  measureMessage(force=false){
    const n=this.messageNodes;if(!n?.window.isConnected||!n.viewport.clientWidth||!n.viewport.clientHeight)return false;
    // Reserve the paging footer even when measuring a currently single-page message.
    n.paging.hidden=false;
    const key=[n.viewport.clientWidth,n.viewport.clientHeight,globalThis.getComputedStyle?.(n.text).font].join('/');
    if(!force&&key===n.measureKey){n.paging.hidden=this.pages.length===1;return false;}n.measureKey=key;
    const offset=this.pages.slice(0,this.page).join('').length;
    this.pages=messagePages(n.dialog.text,value=>{n.text.textContent=value;return n.text.scrollHeight<=n.viewport.clientHeight;});
    this.page=pageAtOffset(this.pages,offset);this.refreshMessage();return true;
  }
  render(model){
    this.closeMap({restore:false});
    const snapshot=captureFocus(this.root),oldPanel=this.root.querySelector('.scene-window-body');
    const scrollTop=oldPanel?.scrollTop??0,hadPanel=Boolean(oldPanel),oldTab=this.model?this.renderedTab:null;
    const key=JSON.stringify([model.mode,model.town?.id,model.dungeon?.location,model.dialog,model.battle?.event]);
    if(this.sceneKey!==null&&this.sceneKey!==key)this.tab=model.mode==='town'?'location':'explore';
    this.sceneKey=key;this.model=model;
    const allowed=[...(model.mode==='town'?['profile']:[]),'bag','party','journal',...(model.town?.shop?['shop']:[]),...(model.dungeon?['map']:[]),...(model.town?.quests?['quests']:[]),...(model.town?.dungeons.length?['regions']:[])];
    if(!allowed.includes(this.tab))this.tab=model.mode==='town'?'location':'explore';
    if(this.inventoryAction&&(this.inventoryAction.kind==='buy'?this.tab!=='shop':this.tab!=='bag'))this.inventoryAction=null;
    this.renderedTab=this.tab;
    this.ui.cancelFeedback?.();this.effects.capture();this.root.replaceChildren();this.messageNodes=null;
    const stage=make('main','scene-stage');stage.dataset.mode=model.mode;stage.dataset.state=model.battle?'battle':model.dialog?'dialog':'idle';stage.setAttribute('aria-label',model.title);this.root.append(stage);
    const world=make('div','scene-world');world.dataset.fx='screen';stage.append(world);
    const hud=make('div','scene-hud'),dock=make('div','scene-dock');stage.append(hud,dock);
    const header=make('header','scene-header'),place=make('div','scene-place');
    place.append(make('span','eyebrow',model.town?.breadcrumbs.map(p=>p.name).join(' / ')??`${model.dungeon?.name??''} / ${model.dungeon?.floor??''}階`),make('span','scene-title',model.town?.name??model.dungeon?.name??model.title));
    const toolbar=make('nav','scene-toolbar');toolbar.setAttribute('aria-label','管理メニュー');
    for(const [id,label] of [['journal','手帳'],['bag','旅支度'],['party','隊'],...(model.dungeon?[['map','地図']]:[])]){
      const b=button(label,()=>this.openPanel(id));b.dataset.panel=id;if(id==='map'){b.dataset.focus='map:toolbar';b.setAttribute('aria-label','地図を拡大');b.setAttribute('aria-haspopup','dialog');}toolbar.append(b);
    }
    toolbar.append(button('記録',()=>this.ui.menu()),this.soundButton(),button('遊び方',()=>this.ui.help()));header.append(place,toolbar);hud.append(header);
    const status=make('div','scene-status');status.append(make('span','',`隊 Lv.${model.level} / ${model.gold} G`));
    if(model.tracked){const q=button(`${model.tracked.title}：${model.tracked.destination?.label??''}`,()=>this.openPanel('journal'),'scene-objective');status.append(q);}hud.append(status);
    if(model.battle){
      const holder=make('div');super.battle(holder,model);
      world.append(holder.querySelector('.dungeon-scene'));dock.append(...holder.children);
    }else{
      if(model.town)super.townScene(world,{...model,town:{...model.town,cast:[]}});else if(model.dungeon)super.scene(world,model);
      if(model.dialog){this.dialog(dock,model.dialog);}
      else if(model.town){
        const holder=make('div');super.location(holder,model);const content=holder.firstElementChild;
        this.dialog(dock,{type:'description',text:content.querySelector('.location-description').textContent});
        const commands=content.querySelector('.location-choices');commands.classList.add('scene-town-commands');dock.append(commands);
      }else{
        const text=[model.dungeon.here.map(o=>o.name).join(' / ')||'灯の届く通路が続いている。',model.dungeon.surfaceNotice?.text].filter(Boolean).join('\n');
        this.dialog(dock,{type:'description',text});this.commandWindow(dock,model.commands);
      }
    }
    if(!this.messageNodes){this.messageKey=null;this.page=0;this.pages=[''];}
    appendSceneCast(world,model.dialog?.scene??(model.town?{mode:'stage',cast:model.town.cast.map(c=>({...c,display:{x:c.x,...c.display}}))}:null));
    this.compactParty(hud,model);
    if(model.dungeon&&!model.battle){const map=make('div','scene-minimap');this.mapPanel(map,model);hud.append(map);}
    if(model.notice&&model.notice!==model.dialog?.text){const notice=make('div','scene-notice',model.notice);notice.setAttribute('role','status');hud.append(notice);}
    if(panelNames[this.tab]){
      world.inert=true;hud.inert=true;dock.inert=true;
      const overlay=make('div','scene-overlay'),panel=make('section','scene-window');panel.dataset.panel=this.tab;panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','scene-window-title');
      const head=make('header','scene-window-header'),title=make('h2','',panelNames[this.tab]);title.id='scene-window-title';
      const close=button('閉じる',()=>this.closePanel());head.append(title,close);
      const body=make('div','scene-window-body');panel.append(head,body);overlay.append(panel);stage.append(overlay);
      if(this.tab==='map')this.mapPanel(body,model);else super[this.tab](body,model);
      if(hadPanel&&oldTab===this.tab)body.scrollTop=scrollTop;
    }
    this.resizeObserver?.disconnect();
    const measure=(refocus=true,force=false)=>{
      if(!stage.isConnected)return;
      const top=hud.getBoundingClientRect().height,bottom=dock.getBoundingClientRect().height,height=stage.getBoundingClientRect().height;
      stage.style.setProperty('--scene-hud-height',`${top}px`);stage.style.setProperty('--scene-dock-height',`${bottom}px`);stage.style.setProperty('--scene-play-height',`${Math.max(60,height-top-bottom)}px`);
      const before=captureFocus(this.root);if(this.measureMessage(force)&&refocus)this.finishInput(before);
      this.ui.layoutChanged?.();
    };
    if(globalThis.ResizeObserver){this.resizeObserver=new ResizeObserver(()=>{globalThis.cancelAnimationFrame?.(this.measureFrame);this.measureFrame=requestAnimationFrame(()=>measure());});for(const node of [hud,dock,stage,...(this.messageNodes?[this.messageNodes.viewport,this.messageNodes.text]:[])])this.resizeObserver.observe(node);}measure(false);
    document.fonts?.ready.then(()=>measure(true,true));
    this.effects.present(model,this.ui.effectsMode?.()??'full');
    this.finishInput(snapshot);
    this.ui.layoutChanged?.();
  }
  compactParty(parent,m){
    const party=make('div','scene-party');party.dataset.fx='party';
    for(const a of m.party){const b=button('',()=>m.mode==='town'?this.openCharacter(a.id):(this.partySelection={...this.partySelection,party:a.id},this.openPanel('party')),'scene-member'+(a.hp<=0?' fallen':''));
      b.dataset.focus=`character:${a.id}`;b.append(this.portrait(a,'scene-member-portrait'),make('span','',a.name),make('span','scene-member-values',`HP ${a.hp}/${a.maxHp}${m.battle?' / MP '+a.mp+'/'+a.maxMp:''}`));
      if(a.statuses.length)b.append(make('span','scene-member-status',a.statuses.join('・')));party.append(b);
    }parent.append(party);
  }
  mapPanel(parent,m){
    parent.append(mapSection(m,{onExpand:()=>this.openMap()}));
  }
}
