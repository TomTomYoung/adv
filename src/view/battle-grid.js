const make=(tag,cls,text)=>{const el=document.createElement(tag);el.className=cls??'';if(text!==undefined)el.textContent=text;return el;};
const button=(text,focus,fn,disabled=false)=>{const b=make('button','',text);b.type='button';b.dataset.focus=focus;b.disabled=disabled;b.addEventListener('click',fn);return b;};
const refocus=(view,key)=>view.root.querySelector(`[data-focus="${key}"]`)?.focus({preventScroll:true});
export function renderFormation(view,parent,m){
  const section=make('section','panel-content formation-editor');section.setAttribute('aria-label','戦闘陣形');
  section.append(make('h2','','戦闘陣形'),make('p','',m.formation.editable?'人物を選び、配置先を選択してください。仲間のいるセルでは位置を交換します。':'保存済みの開始陣形です。変更できるのは町の通常滞在中です。'));
  const members=make('div','formation-members');
  for(const a of m.party){const b=button(a.name,`formation:actor:${a.id}`,()=>{view.formationActor=a.id;view.render(m);refocus(view,`formation:actor:${a.id}`);},!m.formation.editable);b.setAttribute('aria-pressed',String(view.formationActor===a.id));members.append(b);}section.append(members);
  const grid=make('div','formation-grid');grid.setAttribute('aria-label','前衛・中衛・後衛、各5列');
  for(const cell of m.formation.cells){const name=m.party.find(a=>a.id===cell.actor)?.name??'空き',key=`formation:cell:${cell.x},${cell.y}`;
    const b=button(`${['前衛','中衛','後衛'][cell.y]} ${cell.x+1}\n${name}`,key,()=>{
      if(!view.formationActor){view.formationActor=cell.actor;view.render(m);}else view.act({type:'party.formation.set',actor:view.formationActor,x:cell.x,y:cell.y});refocus(view,key);
    },!m.formation.editable||!view.formationActor&&!cell.actor);b.setAttribute('aria-pressed',String(Boolean(cell.actor)&&view.formationActor===cell.actor));grid.append(b);
  }section.append(grid);
  section.append(button(view.formationActor?'選択を取り消す':'隊の状態へ戻る','formation:back',()=>view.cancel()));parent.append(section);
}
export function renderGridControls(view,commands,m){
  const pending=view.pendingBattleAction,grid=m.battle.grid;
  if(!pending)return false;
  const moving=pending.intent.action==='move',entry=moving?null:(pending.intent.action==='item'?m.battle.items.find(i=>i.id===pending.intent.item):m.battle.skills.find(i=>i.id===pending.intent.skill));
  const choices=moving?grid.cells.map(c=>({id:c.id,name:`${['敵後衛','敵中衛','敵前衛','味方前衛','味方中衛','味方後衛'][c.y]} ${c.x+1}${c.name?' '+c.name:''}`,aim:{x:c.x,y:c.y},...c.move,targets:[],cells:[]})):entry?.choices??[];
  commands.append(make('h3','battle-menu-title',moving?'移動先を選択':`${pending.name}の対象`));
  const selected=choices.find(c=>c.id===view.gridChoice),targets=make('div','battle-targets grid-targets');targets.setAttribute('aria-label',moving?'移動先':`${pending.name}の対象`);
  for(const choice of choices.filter(c=>!moving||c.aim.y>=3)){
    const where=choice.aim?` (${choice.aim.x+1},${choice.aim.y+1})`:'',b=button(`${choice.name}${where}${choice.enabled?'':' ×'}`,`grid:choice:${choice.id}`,()=>{view.gridChoice=choice.id;view.render(m);refocus(view,`grid:choice:${choice.id}`);},false);
    b.className='battle-target'+(!choice.enabled?' unavailable':'');b.title=choice.reason;b.setAttribute('aria-pressed',String(selected?.id===choice.id));targets.append(b);
  }
  const hint=selected?(selected.enabled?moving?'この場所へ移動して手番を終えます。':`効果対象：${selected.targetNames?.join('・')||'なし'}`:selected.reason):'対象を選択すると範囲と効果対象を確認できます。';
  targets.append(make('p','grid-selection-info',hint));
  const confirm=button(moving?'移動を確定':'実行', 'grid:confirm',()=>{const intent={...pending.intent,...(moving?{to:selected.aim}:{target:selected.id})};view.pendingBattleAction=null;view.gridChoice=null;view.act(intent);},!selected?.enabled);confirm.className='primary';targets.append(confirm,button('戻る','battle:back',()=>view.cancel()));commands.append(targets);return true;
}
export function gridScene(view,scene,m){
  const grid=m.battle.grid,board=make('div','battle-grid-board'),pending=view.pendingBattleAction,moving=pending?.intent.action==='move';
  const entry=pending?(pending.intent.action==='item'?m.battle.items.find(i=>i.id===pending.intent.item):m.battle.skills.find(i=>i.id===pending.intent.skill)):null,choice=entry?.choices?.find(c=>c.id===view.gridChoice);
  board.setAttribute('aria-label','戦闘配置：敵3行・味方3行');
  for(const cell of grid.cells){const candidate=entry?.choices?.find(c=>c.id===cell.id||c.id===cell.unit),active=cell.unit===`actor:${m.battle.actorId}`,affected=choice?.targets.includes(cell.unit),inArea=choice?.cells.some(p=>p.x===cell.x&&p.y===cell.y),legal=moving?cell.move.enabled:candidate?.enabled;
    const b=button(`${active?'▶ ':affected?'◎ ':''}${cell.name||'・'}`,`grid:board:${cell.id}`,()=>{
      if(pending){view.gridChoice=moving?cell.id:candidate?.id;view.render(m);refocus(view,view.gridChoice?`grid:choice:${view.gridChoice}`:`grid:board:${cell.id}`);}
      else if(cell.unit?.startsWith('enemy:')){view.selectedTarget=cell.unit.slice(6);view.render(m);}
    },Boolean(pending&&!moving&&!candidate)||Boolean(moving&&cell.y<3));
    b.className=`battle-grid-cell${cell.y<3?' enemy-cell':' ally-cell'}${active?' active-unit':''}${inArea?' in-area':''}${legal?' in-range':''}${affected?' affected':''}`;b.title=`${cell.x+1},${cell.y+1} ${cell.name}${candidate?.reason?'：'+candidate.reason:''}`;board.append(b);
  }scene.append(board);
  const sprites=make('div','grid-enemy-sprites'),config=grid.enemyPresentation,entries=m.battle.enemies.filter(e=>e.hp>0).map(e=>({...e,p:grid.positions[`enemy:${e.id}`]})).sort((a,b)=>a.p.y-b.p.y||a.p.x-b.p.x||a.id.localeCompare(b.id));
  // Layout uses logical column spacing. All sprites share a uniform fit factor;
  // individual scaling then row scaling preserves every image's aspect ratio.
  const maxScale=Math.max(1,...entries.map(e=>config.sprites?.[e.enemyId]?.spriteScale??1)),fit=1/maxScale;
  for(const e of entries){const override=config.sprites?.[e.enemyId]??{},scale=config.rowScale[e.p.y]*(override.spriteScale??1)*fit,img=make('img','grid-enemy-sprite');img.src=e.sprite;img.alt=e.name;img.dataset.fx=`enemy:${e.id}`;
    img.style.width=`${Math.min(26,18/(1-config.maxOverlapRatio))*scale}%`;img.style.maxHeight=`${(15/.7)*scale}%`;img.style.left=`${14+18*e.p.x+(override.offsetX??0)}%`;img.style.bottom=`${100-(e.p.y+1)*100/6+(override.offsetY??0)}%`;img.style.zIndex=String(e.p.y*10+e.p.x);if(view.selectedTarget===e.id)img.classList.add('selected');sprites.append(img);
  }scene.append(sprites);
}
