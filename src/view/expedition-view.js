const node=(tag,className,text)=>{const el=document.createElement(tag);if(className)el.className=className;if(text!==undefined)el.textContent=text;return el;};
const button=(label,callback,disabled=false)=>{const el=node('button','',label);el.type='button';el.disabled=disabled;el.addEventListener('click',callback);return el;};
export function renderSkillShop(view,parent,m){
  const e=m.expedition;if(!e?.shop)return;
  const section=node('section','panel-content skill-shop');section.append(node('h2','','技能教習所'),node('p','',`技能宝石 ${e.gems}個。宝石は隊共通、習得は人物ごとです。現在の職業と武器に対応する技能を購入できます。`));
  const actors=e.products[0]?.actors??[];
  if(!actors.some(a=>a.actor===view.skillShopActor))view.skillShopActor=actors[0]?.actor;
  const choices=node('div','choices');
  for(const a of actors){const b=button(a.name,()=>{view.skillShopActor=a.actor;view.render(m);});b.setAttribute('aria-pressed',String(a.actor===view.skillShopActor));b.dataset.focus=`skill-shop:actor:${a.actor}`;choices.append(b);}
  section.append(choices);
  for(const p of e.products){
    const a=p.actors.find(a=>a.actor===view.skillShopActor);if(!a)continue;
    const card=node('article','quest-card skill-shop-card');card.append(node('h3','',p.name),node('p','',p.description),node('p','muted',`${a.name}：${a.current?`習得Lv${a.current}`:'未習得'}`));
    if(a.upgrade)card.append(node('p','',a.upgrade));
    const b=button(a.maxed?'教習完了':`${a.name}がLv${a.level}を習得 — 宝石${a.price}個`,()=>view.act(a.intent),!a.enabled);b.dataset.focus=`skill-shop:${p.id}:${a.actor}`;card.append(b);
    if(a.reason)card.append(node('p','requirement',a.reason));section.append(card);
  }
  section.append(node('h3','','補給所の保管油'),node('p','',`${e.storedOil}単位を保管しています。携行容量に収まらなかった灯油を受け取れます。`),button('空き容量まで保管油を受け取る',()=>view.act({type:'expedition.action',action:'withdraw'}),!e.canWithdraw));
  parent.append(section);
}
