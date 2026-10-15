const make=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls??'';if(text!==undefined)e.textContent=text;return e;};
const button=(text,key,fn)=>{const e=make('button','',text);e.type='button';e.dataset.focus=key;e.addEventListener('click',fn);return e;};
const depths=['前衛','中衛','後衛'];
const imageCache=new Map();
export function spritePixels(url){
 if(imageCache.has(url))return imageCache.get(url);
 const promise=new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);const d=ctx.getImageData(0,0,c.width,c.height).data;let x0=c.width,y0=c.height,x1=-1,y1=-1;
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(d[(y*c.width+x)*4+3]>32){x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}
  if(x1<0)reject(Error('空のスプライト'));else resolve({img,x:x0,y:y0,width:x1-x0+1,height:y1-y0+1});
 };img.onerror=()=>reject(Error('スプライトを読み込めません'));img.src=url;});imageCache.set(url,promise);return promise;
}
export function layoutFrontlineSprites(entries,width,height,{rowScale=[1,.85,.7],overlap=.33}={}){
 const rows=[0,1,2].map(depth=>entries.filter(e=>e.depth===depth).sort((a,b)=>a.lane-b.lane||a.id.localeCompare(b.id)).map(e=>({...e,h:height*.48*rowScale[depth]*(e.scale??1),w:height*.48*rowScale[depth]*(e.scale??1)*e.bounds.width/e.bounds.height})));
 const span=row=>row.reduce((n,e,i)=>n+e.w-(i?overlap*Math.min(e.w,row[i-1].w):0),0),fit=Math.min(1,...rows.filter(r=>r.length).map(r=>(width-20)/span(r)),...rows.flat().map(e=>height*.48*rowScale[e.depth]/e.h));
 return rows.flatMap((row,depth)=>{let left=(width-span(row)*fit)/2;return row.map((e,i)=>{if(i)left-=overlap*Math.min(e.w,row[i-1].w)*fit;const result={...e,left,top:height*([.94,.70,.44][depth])-e.h*fit,width:e.w*fit,height:e.h*fit,z:(2-depth)*100+i};left+=e.w*fit;return result;});});
}
export function renderFrontlineSprites(parent,enemies,positions,options={}){
 const stage=make('div','frontline-stage');stage.setAttribute('aria-label','前衛・中衛・後衛の敵');parent.append(stage);
 for(const depth of [2,1,0]){const row=make('span','frontline-row-label',depths[depth]);row.style.top=`${[87,63,37][depth]}%`;stage.append(row);}
 const entries=enemies.filter(e=>e.state?e.state!=='removed':e.hp>0).map(e=>({...e,...positions[`enemy:${e.id}`]})),canvases=new Map();
 for(const e of entries){const c=make('canvas','frontline-sprite');c.dataset.fx=`enemy:${e.id}`;c.dataset.unit=`enemy:${e.id}`;if(e.state==='down')c.classList.add('frontline-down');c.setAttribute('role','img');c.setAttribute('aria-label',`${e.name}・${depths[e.depth]}${e.state==='down'?'・戦闘不能':''}`);if(options.targets?.includes(`enemy:${e.id}`))c.classList.add('affected');stage.append(c);canvases.set(e.id,c);}
 if(typeof Image==='undefined'){stage.ready=Promise.resolve(stage);return stage;}
 const ready=Promise.all(entries.map(async e=>({...e,bounds:await spritePixels(e.sprite)}))).then(loaded=>{
  const draw=()=>{if(!stage.isConnected)return;const r=stage.getBoundingClientRect(),layout=layoutFrontlineSprites(loaded,r.width,r.height,options);
   for(const e of layout){const c=canvases.get(e.id),b=e.bounds;c.width=b.width;c.height=b.height;c.getContext('2d').drawImage(b.img,b.x,b.y,b.width,b.height,0,0,b.width,b.height);Object.assign(c.style,{left:e.left+'px',top:e.top+'px',width:e.width+'px',height:e.height+'px',zIndex:String(e.z)});c.dataset.depth=e.depth;c.dataset.lane=e.lane;c.dataset.sourceRatio=String(b.width/b.height);}
   stage.dataset.ready='true';
  };draw();if(typeof ResizeObserver!=='undefined'){const observer=new ResizeObserver(()=>{if(!stage.isConnected)observer.disconnect();else draw();});observer.observe(stage);}return stage;
 }).catch(error=>{stage.dataset.error=error.message;stage.append(make('p','',error.message));});
 stage.ready=ready;return stage;
}
export function frontlineScene(view,parent,m){
 const f=m.battle.frontline,pending=view.pendingBattleAction,entry=pending?(pending.intent.action==='item'?m.battle.items.find(x=>x.id===pending.intent.item):m.battle.skills.find(x=>x.id===pending.intent.skill)):null,choice=entry?.choices?.find(x=>x.id===view.gridChoice);
 renderFrontlineSprites(parent,m.battle.enemies,f.positions,{...f.presentation,targets:choice?.targets});
 const summary=make('div','frontline-party');summary.append(make('span','',`味方の陣地：${f.rows}行`));for(let depth=0;depth<f.rows;depth++){const units=f.units.filter(u=>!u.enemy&&u.state!=='removed'&&u.depth===depth);summary.append(make('span','',`${depths[depth]}：${units.map(u=>u.name+(u.state==='down'?'（戦闘不能）':'')).join('・')||'なし'}`));}const removed=f.units.filter(u=>!u.enemy&&u.state==='removed');if(removed.length)summary.append(make('span','','戦闘離脱：'+removed.map(u=>u.name).join('・')));parent.append(summary);
}
export function renderFrontlineControls(view,parent,m){
 const pending=view.pendingBattleAction,moving=pending.intent.action==='move',entry=moving?null:pending.intent.action==='item'?m.battle.items.find(x=>x.id===pending.intent.item):m.battle.skills.find(x=>x.id===pending.intent.skill),choices=moving?m.battle.frontline.moves:entry?.choices??[],selected=choices.find(c=>c.id===view.gridChoice);
 parent.append(make('h3','battle-menu-title',moving?'移動する段':`${pending.name}の対象`));const list=make('div','battle-targets frontline-targets');
 for(const c of choices){const b=button(c.name+(c.enabled?'':' ×'),`front:choice:${c.id}`,()=>{view.gridChoice=c.id;view.render(m);view.root.querySelector(`[data-focus="front:choice:${c.id}"]`)?.focus({preventScroll:true});});b.className='battle-target'+(c.enabled?'':' unavailable');b.title=c.reason;b.setAttribute('aria-pressed',String(selected===c));list.append(b);}
 if(selected)list.append(make('p','frontline-choice-info',moving?(selected.enabled?'移動して1手番を終えます。':selected.reason):`${selected.enabled?`必要レンジ ${selected.requiredRange}`:selected.reason} ／ 効果対象：${selected.targetNames.join('・')||'なし'}`));
 else list.append(make('p','','対象を選ぶと射程と巻き込みを確認できます。'));
 const confirm=button(moving?'移動を確定':'実行','front:confirm',()=>{const intent={...pending.intent,...(moving?{to:{depth:selected.depth}}:{target:selected.id})};view.pendingBattleAction=null;view.gridChoice=null;view.act(intent);});confirm.disabled=!selected?.enabled;list.append(confirm,button('戻る','battle:back',()=>view.cancel()));parent.append(list);
}
export function renderFrontlineFormation(view,parent,m){
 const section=make('section','panel-content frontline-formation');section.append(make('h2','','前中後衛の開始陣形'),make('p','','人物ごとに段を選びます。左右順は範囲攻撃の補助設定です。Gridの陣形は変更しません。'));
 for(const a of m.party){const p=m.frontlineFormation[a.id],row=make('div','frontline-formation-person');row.append(make('strong','',a.name));
  for(const depth of [0,1,2]){const b=button(depths[depth],`front-formation:${a.id}:${depth}`,()=>{view.act({type:'party.frontline.set',actor:a.id,depth,lane:p.lane});view.root.querySelector(`[data-focus="front-formation:${a.id}:${depth}"]`)?.focus();});b.disabled=!m.formation.editable;b.setAttribute('aria-pressed',String(p.depth===depth));row.append(b);}
  const label=make('label','','左右順 '),select=make('select');select.setAttribute('aria-label',`${a.name}の左右順`);for(let lane=0;lane<5;lane++){const o=make('option','',String(lane+1));o.value=String(lane);select.append(o);}select.value=p.lane;select.disabled=!m.formation.editable;select.addEventListener('change',()=>view.act({type:'party.frontline.set',actor:a.id,depth:p.depth,lane:Number(select.value)}));label.append(select);row.append(label);section.append(row);
 }section.append(button('隊の状態へ戻る','front-formation:back',()=>{view.frontlineFormationOpen=false;view.render(m);}));parent.append(section);
}
