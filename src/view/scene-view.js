import {GameView} from './view.js';
import {messagePages} from './message-pages.js';
const make=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
const button=(text,fn,className='')=>{const e=make('button',className,text);e.type='button';e.addEventListener('click',fn);return e;};
const panelNames={bag:'道具・旅支度',party:'隊の状態',journal:'冒険手帳',quests:'依頼掲示板',regions:'迷宮へ',map:'測量図'};
const focusable='button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], summary';

export class SceneView extends GameView{
  constructor(...args){super(...args);this.messageKey=null;this.page=0;this.pages=[''];this.sceneKey=null;this.returnFocus='journal';}
  destroy(){this.resizeObserver?.disconnect();super.destroy();}
  blocksGameInput(){return Boolean(this.root.querySelector('.scene-window'));}
  canChoose(){return this.page===this.pages.length-1;}
  advanceText(){if(!this.canChoose()){this.page++;this.render(this.model);}else super.advanceText();}
  openPanel(tab){this.returnFocus=tab;this.tab=tab;this.render(this.model);}
  closePanel(){this.tab=this.model.mode==='town'?'location':'explore';this.render(this.model);this.root.querySelector(`[data-panel="${this.returnFocus}"]`)?.focus();}
  handleKey(event){
    const panel=this.root.querySelector('.scene-window');
    if(!panel){
      if(!this.canChoose()&&['Enter',' '].includes(event.key)&&!['BUTTON','INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName)&&!document.activeElement?.isContentEditable){event.preventDefault();this.advanceText();return true;}
      return false;
    }
    if(event.key==='Escape'){event.preventDefault();this.closePanel();return true;}
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
    if(key!==this.messageKey){this.messageKey=key;this.page=0;}
    this.pages=messagePages(d.text);this.page=Math.min(this.page,this.pages.length-1);
    const shown={...d,text:this.pages[this.page]};
    if(!this.canChoose()){shown.type='text';delete shown.options;}
    super.dialog(parent,shown);
    const window=parent.lastElementChild;window.classList.add('scene-message');
    if(this.pages.length>1){
      const paging=make('div','scene-paging');
      const previous=button('前のページ',()=>{this.page--;this.render(this.model);});previous.disabled=this.page===0;
      paging.append(previous,make('span','',`${this.page+1} / ${this.pages.length}`));window.append(paging);
    }
    if(!this.canChoose())window.querySelector('.continue').textContent='次のページ　›';
  }
  render(model){
    const focused=document.activeElement,focusKey=focused?.dataset.focus;
    const selection=focused?.selectionStart,oldPanel=this.root.querySelector('.scene-window-body');
    const scrollTop=oldPanel?.scrollTop??0,hadPanel=Boolean(oldPanel),oldTab=this.model?this.renderedTab:null;
    const key=JSON.stringify([model.mode,model.town?.id,model.dungeon?.location,model.dialog,model.battle?.event]);
    if(this.sceneKey!==null&&this.sceneKey!==key)this.tab=model.mode==='town'?'location':'explore';
    this.sceneKey=key;this.model=model;
    const allowed=['bag','party','journal',...(model.dungeon?['map']:[]),...(model.town?.quests?['quests']:[]),...(model.town?.dungeons.length?['regions']:[])];
    if(!allowed.includes(this.tab))this.tab=model.mode==='town'?'location':'explore';
    this.renderedTab=this.tab;
    this.ui.cancelFeedback?.();this.effects.capture();this.root.replaceChildren();
    const stage=make('main','scene-stage');stage.dataset.mode=model.mode;stage.dataset.state=model.battle?'battle':model.dialog?'dialog':'idle';stage.setAttribute('aria-label',model.title);this.root.append(stage);
    const world=make('div','scene-world');world.dataset.fx='screen';stage.append(world);
    const hud=make('div','scene-hud'),dock=make('div','scene-dock');stage.append(hud,dock);
    const header=make('header','scene-header'),place=make('div','scene-place');
    place.append(make('span','eyebrow',model.town?.breadcrumbs.map(p=>p.name).join(' / ')??`${model.dungeon?.name??''} / ${model.dungeon?.floor??''}階`),make('span','scene-title',model.town?.name??model.dungeon?.name??model.title));
    const toolbar=make('nav','scene-toolbar');toolbar.setAttribute('aria-label','管理メニュー');
    for(const [id,label] of [['journal','手帳'],['bag','道具'],['party','隊'],...(model.dungeon?[['map','地図']]:[])]){
      const b=button(label,()=>this.openPanel(id));b.dataset.panel=id;toolbar.append(b);
    }
    toolbar.append(button('記録',()=>this.ui.menu()),this.soundButton(),button('遊び方',()=>this.ui.help()));header.append(place,toolbar);hud.append(header);
    const status=make('div','scene-status');status.append(make('span','',`隊 Lv.${model.level} / ${model.gold} G`));
    if(model.tracked){const q=button(`${model.tracked.title}：${model.tracked.destination?.label??''}`,()=>this.openPanel('journal'),'scene-objective');status.append(q);}hud.append(status);
    if(model.battle){
      const holder=make('div');super.battle(holder,model);
      world.append(holder.querySelector('.dungeon-scene'));dock.append(...holder.children);
    }else{
      if(model.town)super.townScene(world,model);else if(model.dungeon)super.scene(world,model);
      if(model.dialog){this.dialog(dock,model.dialog);}
      else if(model.town){
        const holder=make('div');super.location(holder,model);const content=holder.firstElementChild;
        const description=content.querySelector('.location-description');description.classList.add('scene-description');dock.append(description);
        const commands=content.querySelector('.location-choices');commands.classList.add('scene-town-commands');dock.append(commands);
      }else{
        const text=[model.dungeon.here.map(o=>o.name).join(' / ')||'灯の届く通路が続いている。',model.dungeon.surfaceNotice?.text].filter(Boolean).join('\n');
        dock.append(make('p','scene-description',text));this.commandWindow(dock,model.commands);
      }
    }
    if(!model.dialog){this.messageKey=null;this.page=0;this.pages=[''];}
    const cast=dock.querySelector('.story-cast');if(cast){cast.classList.add('scene-cast');world.append(cast);}
    this.compactParty(hud,model);
    if(model.dungeon&&!model.battle){const map=make('div','scene-minimap');this.mapPanel(map,model);hud.append(map);}
    if(model.notice&&model.notice!==model.dialog?.text){const notice=make('div','scene-notice',model.notice);notice.setAttribute('role','status');hud.append(notice);}
    if(panelNames[this.tab]){
      world.inert=true;hud.inert=true;dock.inert=true;
      const overlay=make('div','scene-overlay'),panel=make('section','scene-window');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','scene-window-title');
      const head=make('header','scene-window-header'),title=make('h2','',panelNames[this.tab]);title.id='scene-window-title';
      const close=button('閉じる',()=>this.closePanel());head.append(title,close);
      const body=make('div','scene-window-body');panel.append(head,body);overlay.append(panel);stage.append(overlay);
      if(this.tab==='map')this.mapPanel(body,model);else super[this.tab](body,model);
      if(hadPanel&&oldTab===this.tab)body.scrollTop=scrollTop;
      const restore=focusKey?[...body.querySelectorAll('[data-focus]')].find(e=>e.dataset.focus===focusKey):null;
      if(restore){restore.focus();if(selection!==undefined&&restore.setSelectionRange)restore.setSelectionRange(selection,selection);}
      else close.focus();
    }
    this.resizeObserver?.disconnect();
    const measure=()=>{
      if(!stage.isConnected)return;
      const top=hud.getBoundingClientRect().height,bottom=dock.getBoundingClientRect().height,height=stage.getBoundingClientRect().height;
      stage.style.setProperty('--scene-hud-height',`${top}px`);stage.style.setProperty('--scene-dock-height',`${bottom}px`);stage.style.setProperty('--scene-play-height',`${Math.max(60,height-top-bottom)}px`);
      this.ui.layoutChanged?.();
    };
    if(globalThis.ResizeObserver){this.resizeObserver=new ResizeObserver(measure);for(const node of [hud,dock,stage])this.resizeObserver.observe(node);}measure();
    this.effects.present(model,this.ui.effectsMode?.()??'full');
    this.ui.layoutChanged?.();
  }
  compactParty(parent,m){
    const party=make('div','scene-party');party.dataset.fx='party';
    for(const a of m.party){const b=button('',()=>this.openPanel('party'),'scene-member'+(a.hp<=0?' fallen':''));
      b.append(this.portrait(a,'scene-member-portrait'),make('span','',a.name),make('span','scene-member-values',`HP ${a.hp}/${a.maxHp}${m.battle?' / MP '+a.mp+'/'+a.maxMp:''}`));
      if(a.statuses.length)b.append(make('span','scene-member-status',a.statuses.join('・')));party.append(b);
    }parent.append(party);
  }
  mapPanel(parent,m){
    // Reuse the existing cells, lighting, boundaries and labels without reinterpreting them.
    const holder=make('div');super.sidebar(holder,m);
    const grid=holder.querySelector('.minimap');if(grid)parent.append(grid.parentElement);
  }
}
