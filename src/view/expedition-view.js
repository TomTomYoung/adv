const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const button=(label,callback,disabled=false)=>{const el=node('button','',label);el.type='button';el.disabled=disabled;el.addEventListener('click',callback);return el;};
export function renderSkillShop(view,parent,m){
  const e=m.expedition;if(!e?.skillShop)return;
  const section=node('section','panel-content skill-shop'),head=node('header','skill-shop-heading'),gems=node('p','skill-shop-gems',`技能宝石 ${e.gems.toLocaleString('ja-JP')}個`);
  gems.setAttribute('aria-live','polite');head.append(node('h2','','スキル屋'),gems,node('p','skill-shop-help','宝石は隊共通、習得は人物ごとです。現在の職業と武器に対応する技能を購入できます。'));section.append(head);
  const actors=e.products[0]?.actors??[];
  if(!actors.some(a=>a.actor===view.skillShopActor))view.skillShopActor=actors[0]?.actor;
  const choices=node('nav','skill-shop-actors');choices.setAttribute('aria-label','技能を習得する人物');choices.dataset.scroll='skill-shop:actors';
  for(const a of actors){const b=button(a.name,()=>{view.skillShopActor=a.actor;view.render(m);});b.setAttribute('aria-pressed',String(a.actor===view.skillShopActor));b.dataset.focus=`skill-shop:actor:${a.actor}`;choices.append(b);}
  section.append(choices);
  const products=node('div','skill-shop-products');products.setAttribute('aria-label','技能一覧');products.dataset.scroll='skill-shop:products';
  if(m.notice){const notice=node('p','notice',m.notice);notice.setAttribute('role','status');products.append(notice);}
  for(const p of e.products){
    const a=p.actors.find(a=>a.actor===view.skillShopActor);if(!a)continue;
    const card=node('article','quest-card skill-shop-card');card.append(node('h3','',p.name),node('p','',p.description),node('p','muted',`${a.name}：${a.current?`習得Lv${a.current}`:'未習得'}`));
    if(a.upgrade)card.append(node('p','',a.upgrade));
    const b=button(a.maxed?'教習完了':`${a.name}がLv${a.level}を習得 — 宝石${a.price}個`,()=>view.act(a.intent),!a.enabled);b.dataset.focus=`skill-shop:${p.id}:${a.actor}`;card.append(b);
    if(a.reason)card.append(node('p','requirement',a.reason));products.append(card);
  }
  section.append(products);parent.append(section);
}
export function renderSupplyShop(view,parent,m){
  const e=m.expedition;if(!e?.shop)return;
  const section=node('section','panel-content supply-panel'),head=node('header','shop-heading');
  const gold=node('p','shop-gold',`所持金 ${m.gold.toLocaleString('ja-JP')} G`);gold.setAttribute('aria-live','polite');head.append(node('h2','','補給・工房'),gold);section.append(head);
  if(m.notice){const notice=node('p','notice',m.notice);notice.setAttribute('role','status');section.append(notice);}
  if(e.upgrade){const u=e.upgrade;section.append(node('h3','','携行容器の改修'),node('p','',u.done?`容量${u.value}へ改修済みです。`:u.known?`製法を記録済みです。${u.price}Gで容量${u.value}へ改修します。油そのものは増えません。`:u.reason),button(`携行容量${u.value}へ改修 — ${u.price}G`,()=>view.act({type:'expedition.action',action:'upgrade_capacity'}),!u.ok));if(u.known&&!u.done&&!u.ok)section.append(node('p','requirement',u.reason));}
  section.append(node('h3','','補給所の保管油'),node('p','',`${e.storedOil}単位を保管しています。携行容量に収まらなかった灯油を受け取れます。`),button('空き容量まで保管油を受け取る',()=>view.act({type:'expedition.action',action:'withdraw'}),!e.canWithdraw));
  parent.append(section);
}
