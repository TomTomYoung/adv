const element=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
export function dungeonSystems(parent,systems,dispatch){
  for(const system of systems??[]){
    if(system.kind!=='fire_network')continue;
    const panel=element('section',undefined,'fire-panel');panel.setAttribute('aria-label',system.title);
    panel.append(element('h3',system.title),element('p',system.protected?'くらがり除けの火に守られています。':'火の守りが届いていません。','fire-safety'));
    panel.append(element('p',`通常遭遇 ×${system.encounterRate} ／ 敵の強さ ×${system.enemyScale} ／ 保持する種火：${system.ember??'なし'}`,'muted'));
    for(const target of [system.portable,...system.fixtures]){
      const card=element('details',undefined,'fire-source');card.open=target.id==='portable'||system.fixtures.length<3;
      const fuel=target.lit?(target.fuel===null?'消耗しない篝火':`残り${target.fuel}歩 / ${target.capacity}歩`):'消灯';
      card.append(element('summary',`${target.name}：${target.effect} ／ ${fuel}`));
      if(target.id!=='portable')card.append(element('p',`台座本来の効果：${target.baseEffect}`,'muted'));
      const actions=element('div',undefined,'fire-actions');
      for(const action of target.actions){const button=element('button',action.label);button.type='button';button.disabled=!action.enabled;button.title=action.reason||action.label;button.addEventListener('click',()=>dispatch(action.intent));actions.append(button);}
      card.append(actions);panel.append(card);
    }
    panel.append(element('p','種火を移すには、火を採り、移植先を消してから「種火を移す」を選びます。消火すると移植効果は消え、普通の火で再点火すると台座本来の効果に戻ります。','muted'));
    parent.append(panel);
  }
}
