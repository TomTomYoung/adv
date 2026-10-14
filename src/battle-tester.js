import {loadContent} from './core/loader.js';
import {unitKey} from './core/buffs.js';
import {frontlineUnits,depthNames} from './core/battle-frontline.js';
import {testerPreset,createTesterEngine,validateTesterCase,testerPlan,testerCurrentUnit,testerSnapshot} from './application/battle-tester-model.js';
import {renderFrontlineSprites} from './view/battle-frontline.js';
const $=id=>document.getElementById(id),node=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const base=await loadContent();let config=testerPreset(base),engine,saved=null,eventIndex=null,lastPlan=null;
function status(text){$('status').textContent=text;}
function selectOptions(select,entries,value){select.replaceChildren(...entries.map(([id,text])=>new Option(text,id)));if(entries.some(([id])=>id===value))select.value=value;}
function inputField(parent,label,value,type,onChange){const wrap=node('label',label),input=node('input');input.type=type;input.value=String(value);input.addEventListener('change',()=>onChange(type==='number'?Number(input.value):input.value));wrap.append(input);parent.append(wrap);return input;}
function selectField(parent,label,entries,value,onChange){const wrap=node('label',label),select=node('select');selectOptions(select,entries,String(value));select.addEventListener('change',()=>onChange(select.value));wrap.append(select);parent.append(wrap);return select;}
function roster(){
 for(const side of ['allies','enemies']){
  const parent=$(side),db=side==='allies'?base.actors:base.enemies;parent.replaceChildren();
  config[side].forEach((u,index)=>{const row=node('div');row.className='lab-unit';
   selectField(row,'個体',Object.values(db).map(e=>[e.id,e.name]),u.id,v=>u.id=v);
   selectField(row,'段',depthNames.map((n,i)=>[String(i),n]),u.depth,v=>u.depth=Number(v));
   selectField(row,'左右順',Array.from({length:5},(_,i)=>[String(i),String(i+1)]),u.lane,v=>u.lane=Number(v));
   for(const [key,label] of [['hp','HP'],['mp','MP'],['str','力'],['vit','防御'],['int','知力'],['agi','敏捷'],['range','攻撃レンジ']])inputField(row,label,u[key],'number',v=>u[key]=v);
   selectField(row,'状態',[['','なし'],...Object.values(base.statuses).map(s=>[s.id,s.name])],u.status,v=>u.status=v);
   if(side==='enemies')selectField(row,'被弾反応',[['no','なし'],['yes','防御して後続命中を中止']],u.reaction?'yes':'no',v=>u.reaction=v==='yes');
   const remove=node('button','削除');remove.disabled=config[side].length<=1;remove.addEventListener('click',()=>{config[side].splice(index,1);roster();});row.append(remove);parent.append(row);
  });
 }
}
function loadInputs(){
 $('mode').value=config.mode;$('seed').value=config.seed;$('preemptive').value=config.preemptive?.side??'';
 const p=config.profile;for(const [id,value] of [['min-range',p.range.min],['range',p.range.max],['shape',p.area.shape],['resolution',p.resolution],['order',p.order],['series',p.damageSeries.mode],['basis',p.damageSeries.basis],['series-step',p.damageSeries.step],['reevaluate',p.reevaluate],['overlap',config.presentation.overlap]])$(id).value=value;
 $('friendly').checked=p.friendlyFire;config.presentation.rowScale.forEach((v,i)=>$('scale'+i).value=v);roster();
}
function readProfile(){
 const p={...config.profile,range:{min:Number($('min-range').value),max:Number($('range').value)},area:{shape:$('shape').value},resolution:$('resolution').value,order:$('order').value,reevaluate:$('reevaluate').value,friendlyFire:$('friendly').checked,damageSeries:{mode:$('series').value,basis:$('basis').value,start:1,step:Number($('series-step').value)}};
 config.profile=p;if(engine)engine.data.skills.lab_strike.frontlineTargeting=structuredClone(p);return p;
}
function presentation(){return {overlap:Math.max(0,Math.min(.5,Number($('overlap').value))),rowScale:[0,1,2].map(i=>Math.max(.1,Math.min(1.5,Number($('scale'+i).value))))};}
function readCase(){
 readProfile();config.mode=$('mode').value;config.seed=Number($('seed').value);config.preemptive=$('preemptive').value?{side:$('preemptive').value,actions:2}:null;config.presentation=presentation();
 const errors=validateTesterCase(base,config);if(errors.length)throw Error(errors.join('\n'));
 return structuredClone(config);
}
function start(){try{
 const next=readCase();engine=createTesterEngine(base,next);loadEngine(next);saved=null;eventIndex=null;render(true);status('戦闘を開始しました。射程確認と対象選択では手番・MP・乱数を消費しません。');
}catch(e){status(e.message);}}
function units(){return engine?.state.battle?frontlineUnits(engine.state):[];}
function currentSkill(){const value=$('skill').value,source=$('attacker').value;if(value==='participant_attack')return source.startsWith('actor:')?`lab_${source.slice(6)}_attack`:`lab_${source.slice(6)}_attack`;return value;}
function fillSelectors(force=false){
 const entries=units().filter(u=>u.hp>0).map(u=>[unitKey(u),`${u.instance?'敵':'味方'}：${u.name??engine.data.actors[u.id].name}`]);selectOptions($('attacker'),entries,force?testerCurrentUnit(engine):$('attacker').value);selectOptions($('target'),entries,$('target').value||entries.find(([k])=>k.startsWith('enemy:'))?.[0]);
 selectOptions($('skill'),[['lab_strike','設定攻撃'],['participant_attack','個体の攻撃レンジ'],['attack','通常攻撃（武器設定）'],['guard','防御']],$('skill').value);
}
function preview(){
 if(!engine?.state.battle){lastPlan=null;$('preview').textContent='戦闘が終了しました。Resetで再実行できます。';$('execute').disabled=true;return;}
 readProfile();lastPlan=testerPlan(engine,$('attacker').value,currentSkill(),$('target').value);
 const names=lastPlan.targets?.map(u=>u.name??engine.data.actors[u.id].name)??[];$('preview').textContent=`射程：${lastPlan.ok?`成立${lastPlan.requiredRange===undefined?'':`（必要レンジ${lastPlan.requiredRange}）`}`:lastPlan.reason} ／ 巻き込み：${names.join('・')||'なし'}${testerCurrentUnit(engine)!==$('attacker').value?' ／ この個体の手番まで進めてください。':''}`;
 $('execute').disabled=!lastPlan.ok||testerCurrentUnit(engine)!==$('attacker').value;drawBattle();
}
function drawBattle(){
 const display=$('battle-display');display.replaceChildren();display.style.width=Math.max(280,Math.min(1400,Number($('width').value)))+'px';
 const b=engine?.state.battle;if(!b)return;
 const event=eventIndex===null?null:b.frontline?.events[eventIndex],positions=event?.positions??b.frontline?.positions??Object.fromEntries(units().map((u,i)=>[unitKey(u),b.grid?{depth:u.instance?2-b.grid.positions[unitKey(u)].y:b.grid.positions[unitKey(u)].y-3,lane:b.grid.positions[unitKey(u)].x}:{depth:0,lane:i%5}]));
 const enemies=b.enemies.map(e=>({id:e.instance,name:e.name,hp:event?.hp[unitKey(e)]??e.hp,sprite:engine.data.assets.images[e.sprite]}));renderFrontlineSprites(display,enemies,positions,{...presentation(),targets:lastPlan?.targets?.map(unitKey)});
 const counts=[];for(const enemy of [false,true])counts.push(`${enemy?'敵':'味方'}：${depthNames.map((name,depth)=>`${name}${units().filter(u=>Boolean(u.instance)===enemy&&(event?.hp[unitKey(u)]??u.hp)>0&&positions[unitKey(u)]?.depth===depth).length}人`).join(' / ')}`);$('counts').textContent=counts.join('　');
 if($('diagnostics').checked){const grid=node('div');grid.className='lab-diagnostics';for(let y=0;y<6;y++)for(let x=0;x<5;x++){const cell=node('span',`${y<3?'敵':'味方'} ${depthNames[y<3?2-y:y-3]} / 横${x+1}`),keys=units().filter(u=>Boolean(u.instance)===(y<3)&&positions[unitKey(u)]?.lane===x&&positions[unitKey(u)]?.depth===(y<3?2-y:y-3)).map(unitKey);if(lastPlan?.targets?.some(u=>keys.includes(unitKey(u))))cell.className='hit';grid.append(cell);}display.append(grid);}
}
function eventLabel(e){
 if(e.type==='advance')return `T${e.round} ${e.side==='allies'?'味方':'敵'} 前進${e.step}歩目：${e.moves.map(m=>`${m.unit} ${depthNames[m.from.depth]}→${depthNames[m.to.depth]}`).join(' / ')}`;
 if(e.type==='hit')return `T${e.round} 命中${e.index} ${e.target} HP ${e.hpBefore}→${e.hpAfter}・ダメージ${e.damage}・残り${e.remaining}`;
 if(e.type==='reaction')return `反応 ${e.unit} ${e.skill}${e.cancelRemaining?'：後続命中中止要求':''}`;
 if(e.type==='attack_stopped')return `中断：${e.reason}・未実行${e.remaining}`;
 if(e.type==='round_start')return `ターン${e.round}開始`;
 if(e.type==='move')return `${e.unit} ${depthNames[e.from.depth]}→${depthNames[e.to.depth]}`;
 return `${e.type} ${e.skill??''} ${e.reason??''}`;
}
function render(force=false){
 const b=engine?.state.battle;fillSelectors(force);$('round').textContent=b?`ターン ${b.round} ／ ${testerCurrentUnit(engine)??'終了'}`:'戦闘終了';preview();
 const list=$('participants');list.replaceChildren();for(const u of units()){const key=unitKey(u),p=b.frontline?.positions[key],button=node('button',`${u.name??engine.data.actors[u.id].name}${p?'・'+depthNames[p.depth]:''} HP${u.hp} MP${u.mp}`);button.setAttribute('aria-pressed',String(key===$('target').value));button.addEventListener('click',()=>{$('target').value=key;preview();});list.append(button);}
 const log=$('event-log'),events=b?.frontline?.events??[];log.replaceChildren();events.forEach((e,i)=>{const li=node('li',eventLabel(e));if(i===eventIndex)li.className='selected';li.addEventListener('click',()=>{eventIndex=i;render();});log.append(li);});
 if(!events.length)for(const text of b?.log??[])log.append(node('li',text));
 $('event-position').textContent=eventIndex===null?'現在の状態':`イベント ${eventIndex+1} / ${events.length}`;$('debug').textContent=JSON.stringify({state:testerSnapshot(engine),selectedEvent:eventIndex===null?null:events[eventIndex],range:lastPlan?.requiredRange,targets:lastPlan?.targets?.map(unitKey)},null,2);
 window.battleTester={engine,config,start,render,preview,loadEngine,engineSync,get plan(){return lastPlan;},get eventIndex(){return eventIndex;}};
}
function act(fn){try{if(!engine?.state.battle)return;const ok=fn();eventIndex=null;render(true);status(ok===false?'現在の行動は実行できません。':'Coreで行動を確定しました。イベント一覧から各ステップを確認できます。');}catch(e){status(e.message);}}
$('apply-preset').addEventListener('click',()=>{config=testerPreset(base,$('preset').value);loadInputs();status('プリセットを編成へ反映しました。「この編成で開始」を押してください。');});
$('start').addEventListener('click',start);
for(const side of ['allies','enemies'])$('add-'+(side==='allies'?'ally':'enemy')).addEventListener('click',()=>{if(config[side].length>=15)return;const slot=Array.from({length:15},(_,i)=>({depth:Math.floor(i/5),lane:i%5})).find(p=>!config[side].some(u=>u.depth===p.depth&&u.lane===p.lane));const u={...config[side][0],...slot,reaction:false};if(side==='allies')u.id=Object.keys(base.actors).find(id=>!config.allies.some(a=>a.id===id));config[side].push(u);roster();});
for(const id of ['attacker','target','skill','min-range','range','shape','resolution','order','series','basis','series-step','reevaluate','friendly'])$(id).addEventListener('change',preview);
for(const id of ['width','overlap','scale0','scale1','scale2','diagnostics'])$(id).addEventListener('change',drawBattle);
$('execute').addEventListener('click',()=>act(()=>{preview();if(!lastPlan?.ok||testerCurrentUnit(engine)!==$('attacker').value)return false;return engine.dispatch($('attacker').value.startsWith('actor:')?{type:'battle',action:'skill',skill:currentSkill(),target:engine.state.battle.mode==='classic'?$('target').value.replace(/^(actor|enemy):/,''):$('target').value}:{type:'battle.step',skill:currentSkill(),target:engine.state.battle.mode==='classic'?$('target').value.replace(/^(actor|enemy):/,''):$('target').value});}));
$('step').addEventListener('click',()=>act(()=>engine.dispatch({type:'battle.step'})));
$('round-step').addEventListener('click',()=>act(()=>{const round=engine.state.battle.round;for(let n=0;n<80&&engine.state.battle?.round===round;n++)if(!engine.dispatch({type:'battle.step'}))break;return engine.state.battle?.round!==round;}));
$('move').addEventListener('click',()=>act(()=>engine.dispatch({type:'battle',action:'move',to:{depth:Number($('move-depth').value)}})));
$('save').addEventListener('click',()=>{saved=engine?.save();status('このテスター内に戦闘を保存しました。');});$('load').addEventListener('click',()=>{try{if(saved){engine.load(saved);eventIndex=null;render(true);status('保存した行動位置から再開しました。');}}catch(e){status(e.message);}});
$('event-prev').addEventListener('click',()=>{const n=engine?.state.battle?.frontline?.events.length??0;if(n){eventIndex=Math.max(0,(eventIndex??n)-1);render();}});
$('event-next').addEventListener('click',()=>{const n=engine?.state.battle?.frontline?.events.length??0;if(n){eventIndex=Math.min(n-1,eventIndex===null?0:eventIndex+1);render();}});
$('event-latest').addEventListener('click',()=>{eventIndex=null;render();});
$('export').addEventListener('click',()=>{try{const next=readCase();const blob=new Blob([JSON.stringify(next,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=node('a');a.href=url;a.download='battle-case.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){status(e.message);}});
$('import').addEventListener('change',async()=>{try{const file=$('import').files[0];if(!file)return;const next=JSON.parse(await file.text());createTesterEngine(base,next);config=next;loadInputs();start();}catch(e){status(e.message);}});
const engineFrame=$('engine-frame'),engineSync={ready:false,request:0,loaded:0,error:null};let engineCase=null;
function sendEngine(){
 if(!engineSync.ready||!engineCase)return;
 engineSync.request++;engineSync.error=null;$('engine-status').textContent='設定を読み込み中…';
 engineFrame.contentWindow.postMessage({type:'adv:battle-tester:load',request:engineSync.request,config:engineCase,layout:$('engine-layout').value},location.origin);
}
function loadEngine(next=readCase()){engineCase=structuredClone(next);sendEngine();}
function setLabMode(mode){
 document.body.dataset.labMode=mode;
 for(const button of document.querySelectorAll('[data-lab-mode]'))if(button.tagName==='BUTTON')button.setAttribute('aria-pressed',String(button.dataset.labMode===mode));
}
for(const button of document.querySelectorAll('button[data-lab-mode]'))button.addEventListener('click',()=>setLabMode(button.dataset.labMode));
$('engine-load').addEventListener('click',()=>{try{loadEngine();}catch(e){$('engine-status').textContent=e.message;}});
$('engine-layout').addEventListener('change',()=>{
 if(engineSync.ready)engineFrame.contentWindow.postMessage({type:'adv:battle-tester:layout',layout:$('engine-layout').value},location.origin);
});
window.addEventListener('message',event=>{
 if(event.origin!==location.origin||event.source!==engineFrame.contentWindow)return;
 const m=event.data;if(m?.type==='adv:battle-tester:ready'){engineSync.ready=true;sendEngine();return;}
 if(m?.request!==engineSync.request)return;
 if(m.type==='adv:battle-tester:loaded'){engineSync.loaded=m.request;engineSync.error=null;}
 else if(m.type==='adv:battle-tester:error')engineSync.error=m.message;
 else if(m.type!=='adv:battle-tester:status')return;
 $('engine-status').textContent=m.message;
});
loadInputs();start();
engineFrame.contentWindow.postMessage({type:'adv:battle-tester:connect'},location.origin);
