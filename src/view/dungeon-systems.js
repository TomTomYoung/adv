const element=(tag,text,className)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(className)e.className=className;return e;};
export function dungeonSystems(parent,systems,dispatch){
  for(const system of systems??[]){
    if(system.kind==='waterworks'){
      const panel=element('section',undefined,'environment-panel water-panel');panel.setAttribute('aria-label',system.title);
      panel.append(element('h3',system.title),element('p',`${system.phase} ／ 次の水位まで${system.remaining}刻`),element('p','移動・待機・水門操作で1刻進みます。完全水没した区画は通れません。','muted'));
      for(const zone of system.zones)panel.append(element('p',`${zone.name}：${zone.status}`));
      appendActions(panel,system.actions,dispatch);
      for(const control of system.controls){const card=element('div',undefined,'environment-target');card.append(element('h4',`${control.name}：${control.open?'開・通水':'閉・排水'}`));appendActions(card,control.actions,dispatch);panel.append(card);}
      panel.append(element('p','水路は通常、水が流れていて通れません。接続する水門やバルブを閉じると水が引き、開くと再び流れます。','muted'));parent.append(panel);continue;
    }
    if(system.kind==='corrosion'){
      const panel=element('section',undefined,'environment-panel corrosion-panel');panel.setAttribute('aria-label',system.title);
      panel.append(element('h3',system.title),element('p',`戦闘ごとに装備の補正が−${system.perBattle}ずつ累積します。廃坑を出ると回復します。`));
      for(const item of system.items)panel.append(element('p',`${item.name}：腐食 −${item.penalty}`));
      if(!system.items.length)panel.append(element('p','現在、腐食した装備はありません。','muted'));parent.append(panel);continue;
    }
    if(system.kind==='breakable_walls'){
      const panel=element('section',undefined,'environment-panel wall-panel');panel.setAttribute('aria-label',system.title);panel.append(element('h3',system.title));
      if(!system.walls.length)panel.append(element('p','亀裂のある壁の正面で、発破薬か対応する探索スキルを使えます。','muted'));
      for(const wall of system.walls){const card=element('div',undefined,'environment-target');card.append(element('h4',`${wall.name}${wall.broken?'（開通済み）':''}`));if(!wall.broken)appendActions(card,wall.actions,dispatch);panel.append(card);}
      parent.append(panel);continue;
    }
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
function appendActions(parent,actions,dispatch){
  const row=element('div',undefined,'fire-actions');
  for(const action of actions){const button=element('button',action.label);button.type='button';button.disabled=!action.enabled;button.title=action.reason||action.label;button.addEventListener('click',()=>dispatch(action.intent));row.append(button);}
  parent.append(row);
}
