import {focusButton} from './focus.js';
const make=(tag,className,text)=>{const e=document.createElement(tag);e.className=className;if(text!==undefined)e.textContent=text;return e;};
const button=(label,fn,key,disabled=false)=>{const b=make('button','',label);b.type='button';b.dataset.focus=key;b.disabled=disabled;b.addEventListener('click',fn);return b;};
const slots={weapon:'武器',armor:'防具',charm:'装飾品'};
const stats={hp:'最大HP',mp:'最大MP',str:'力',vit:'防御',agi:'素早さ',int:'知力'};
const types={consumable:'消耗品',material:'素材・道具',key:'鍵',dungeon_tool:'迷宮の道具'};
const owner=(m,id)=>id==='shared'?{id,name:'共通の袋',class:'隊で共有',portrait:null}:m.party.find(a=>a.id===id);
function description(item){
  const body=make('div','inventory-description');body.append(make('h3','',item.name),make('p','',item.description));
  const spec=[slots[item.slot]??types[item.type],...Object.entries(item.stats??{}).map(([key,n])=>`${stats[key]??key} ${n>0?'+':''}${n}`)].filter(Boolean);
  if(spec.length)body.append(make('p','item-spec',spec.join(' / ')));
  return body;
}
function actorButton(view,actor,label,key,fn,{disabled=false,note=''}={}){
  const b=button('',fn,key,disabled);b.className='inventory-person';
  if(actor.portrait){const image=view.portrait(actor,'inventory-portrait');image.alt='';b.append(image);}
  else if(actor.id==='shared')b.append(make('span','inventory-bag-mark','袋'));
  const text=make('span','inventory-person-text');text.append(make('span','inventory-person-name',actor.name),make('small','',actor.class??''));
  if(label)text.append(make('span','inventory-person-state',label));if(note)text.append(make('small','',note));b.append(text);return b;
}
function focusKey(view,key){focusButton([...view.root.querySelectorAll('[data-focus]')].find(e=>e.dataset.focus===key&&!e.disabled));}
export function cancelInventoryAction(view){
  const action=view.inventoryAction;if(!action)return false;
  view.inventoryAction=null;view.render(view.model);focusKey(view,action.focus);return true;
}
function selectAction(view,action){view.inventoryAction=action;view.render(view.model);}
function commit(view,intent,action){
  view.inventoryAction=null;const changed=view.dispatch(intent);
  if(changed===false){view.render(view.model);view.ui.status(view.model.notice||'品物や仲間の状態を確認してください。');}
  if(!view.model.dialog&&!view.model.battle){focusKey(view,action.focus);view.tabNavigation=true;}
}
function choice(view,section,m,item,action){
  const panel=make('section','inventory-choice');panel.setAttribute('aria-label',action.kind==='buy'?'購入先を選ぶ':action.kind==='transfer'?'渡す相手を選ぶ':action.kind==='equip'?'装備する仲間を選ぶ':'使う相手を選ぶ');
  panel.append(description(item));
  const title=action.kind==='buy'?`誰に持たせる？　1個 ${item.price.toLocaleString('ja-JP')} G`:action.kind==='transfer'?'誰に渡す？':action.kind==='equip'?'誰が装備する？':'誰に使う？';
  panel.append(make('h3','inventory-prompt',title));
  if(action.kind==='buy')panel.append(make('p','muted',item.canBuy?`購入後の所持金 ${(m.gold-item.price).toLocaleString('ja-JP')} G` : item.reason));
  if(action.kind==='buy'&&item.slot)panel.append(make('p','muted','装備不可の仲間も持ち運べます。装備は旅支度で変更できます。'));
  if(action.kind==='transfer')panel.append(make('p','muted',`${owner(m,action.source).name}の所持数 ${item.count}個`));
  const targets=make('div','inventory-people');
  const people=action.kind==='transfer'?[{id:'shared',name:'共通の袋',class:'隊で共有'},...m.party].filter(a=>a.id!==action.source):m.party;
  for(const actor of people){
    let label='',note='',disabled=m.busy,intent;
    if(action.kind==='buy'){
      const recipient=item.recipients.find(a=>a.actor===actor.id);label=item.slot?(recipient.equipAllowed?'装備可':'装備不可'):'持たせる';
      disabled||=!item.canBuy;intent={type:'buy',item:item.id,actor:actor.id};
    }else if(action.kind==='equip'){
      const target=item.equipmentTargets.find(a=>a.actor===actor.id);label=target.allowed?'装備可':'装備不可';note=target.reason||`現在の${slots[item.slot]}：${target.current}`;
      disabled||=!target.enabled;intent={type:'equip',item:item.id,actor:actor.id,source:action.source};
    }else if(action.kind==='use'){
      label=`HP ${actor.hp}/${actor.maxHp}　MP ${actor.mp}/${actor.maxMp}`;disabled||=!item.useEnabled;intent={type:'item',item:item.id,actor:actor.id,source:action.source};
    }else{label='1個渡す';intent={type:'inventory.transfer',item:item.id,from:action.source,to:actor.id,count:1};}
    const target=actorButton(view,actor,label,`inventory:target:${actor.id}`,()=>commit(view,intent,action),{disabled,note});targets.append(target);
    if(action.kind==='transfer'&&item.count>1)targets.append(button(`${actor.name}へ全部渡す（${item.count}個）`,()=>commit(view,{...intent,count:item.count},action),`inventory:all:${actor.id}`,m.busy));
  }
  panel.append(targets,button(action.kind==='buy'?'品物に戻る':'持ち物に戻る',()=>cancelInventoryAction(view),'inventory:cancel'));section.append(panel);
}
export function renderShop(view,parent,m){
  const section=make('section','panel-content shop-panel'),head=make('div','shop-heading');
  head.append(make('h2','','ショップ'),make('p','shop-gold',`所持金 ${m.gold.toLocaleString('ja-JP')} G`));head.querySelector('.shop-gold').setAttribute('aria-live','polite');section.append(head);parent.append(section);
  if(!m.town?.shop){section.append(make('p','','ショップへ移動すると購入できます。'));return;}
  const action=view.inventoryAction;
  if(action?.kind==='buy'){
    const item=m.shop.find(i=>i.id===action.item);if(item){choice(view,section,m,item,action);return;}view.inventoryAction=null;
  }
  section.append(make('p','muted','品物を選び、持たせる仲間を決めて購入します。'));
  if(m.notice)section.append(make('p','inventory-notice',m.notice));
  for(const item of m.shop){
    const row=make('article','item-row shop-item');row.dataset.controlGroup=`shop:${item.id}`;
    const key=`shop:item:${item.id}`;
    row.append(description(item),button(`${item.name}を選ぶ　${item.price.toLocaleString('ja-JP')} G`,()=>selectAction(view,{kind:'buy',item:item.id,focus:key}),key,m.busy));
    if(!item.canBuy)row.append(make('p','requirement',item.reason));section.append(row);
  }
}
export function renderBag(view,parent,m){
  const section=make('section','panel-content inventory-panel');section.append(make('h2','','旅支度'));parent.append(section);
  const holders=m.inventoryHolders??[];
  if(!holders.some(h=>h.id===view.bagActor))view.bagActor='shared';
  const holder=holders.find(h=>h.id===view.bagActor),actor=owner(m,view.bagActor),action=view.inventoryAction;
  if(action&&action.kind!=='buy'){
    const item=holders.find(h=>h.id===action.source)?.items.find(i=>i.id===action.item);
    if(item){choice(view,section,m,item,action);return;}view.inventoryAction=null;
  }
  const people=make('div','inventory-people inventory-holders');people.setAttribute('aria-label','持ち物を見る');
  for(const h of holders){
    const key=`inventory:holder:${h.id}`,b=actorButton(view,owner(m,h.id),`${h.items.reduce((n,i)=>n+i.count,0)}個`,key,()=>{view.bagActor=h.id;view.inventoryAction=null;view.render(m);focusKey(view,key);});b.setAttribute('aria-pressed',String(h.id===view.bagActor));people.append(b);
  }section.append(people);
  if(m.busy)section.append(make('p','requirement','会話・戦闘中は内容の確認だけできます。'));
  if(m.notice)section.append(make('p','inventory-notice',m.notice));
  if(actor?.id!=='shared'){
    const equipment=make('section','inventory-equipment');equipment.append(make('h3','',`${actor.name}の装備`));
    for(const [slot,label] of Object.entries(slots)){
      const equipped=actor.equipmentSlots.find(e=>e.slot===slot),row=make('div','equipment-row');row.append(make('span','',`${label}：${equipped?.name??'なし'}`));
      if(equipped){row.append(button('装備を外す',()=>view.act({type:'unequip',actor:actor.id,slot}),`inventory:unequip:${slot}`,!equipped.canRemove));if(!equipped.canRemove&&!m.busy)row.append(make('small','requirement','外した品物の所持数が上限です。'));}
      equipment.append(row);
    }section.append(equipment);
  }
  section.append(make('h3','',`${actor?.name??'共通の袋'}の持ち物`));
  if(!holder?.items.length)section.append(make('p','empty','持ち物はありません。'));
  for(const item of holder?.items??[]){
    const row=make('article','item-row inventory-item');row.dataset.controlGroup=`item:${item.id}`;const body=description(item);body.prepend(make('span','item-count',`${item.count}個`));row.append(body);
    const actions=make('div','inventory-actions');
    for(const [kind,label,enabled] of [['use','使う',item.useEnabled],['equip','装備する',Boolean(item.slot)],['transfer','渡す',true]]){
      if(kind==='use'&&!item.field||kind==='equip'&&!item.slot)continue;
      const key=`inventory:${kind}:${item.id}`;actions.append(button(label,()=>selectAction(view,{kind,item:item.id,source:view.bagActor,focus:key}),key,m.busy||!enabled));
    }
    if(item.field&&!item.useEnabled)actions.append(make('small','requirement',item.useReason));
    if(item.slot&&actor?.id!=='shared')actions.append(make('span','item-spec',item.equipmentTargets.find(t=>t.actor===actor.id)?.allowed?'装備可':'今の職業では装備不可'));
    row.append(actions);section.append(row);
  }
}
