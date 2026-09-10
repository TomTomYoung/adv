const equipmentName={sword:'剣',axe:'斧',spear:'槍',dagger:'短剣',fist:'拳具',bow:'弓',staff:'杖',tool:'道具',instrument:'楽器',heavy:'重装',light:'軽装',robe:'法衣',charm:'護符'};
// This module accepts only detached display data and dispatch callbacks.
const node=(tag,className,text)=>{const e=document.createElement(tag);if(className)e.className=className;if(text!==undefined)e.textContent=text;return e;};
const statLine=(stats,names)=>Object.entries(stats??{}).map(([key,n])=>`${names[key]??key} ${n}`).join(' / ');
export function jobPanel(actor,model,dispatch){
  if(!actor.job||!model.jobs)return null;
  const wrap=node('details','job-panel');wrap.append(node('summary','',`職業・成長：${actor.class}`));
  wrap.append(node('p','muted',`現在職の成長 / 1Lv：${statLine(actor.growth,model.statNames)}`),node('p','',actor.passives.join(' / ')));
  if(actor.growthHistory.length)wrap.append(node('p','muted',`成長履歴：${actor.growthHistory.map(h=>`${h.name} ${h.count}回`).join(' / ')}`));
  const select=node('select');select.setAttribute('aria-label',`${actor.name}の転職先`);
  for(const job of model.jobs)select.append(new Option(`${job.name}${job.id===actor.job?'（現在）':''}`,job.id));
  select.value=actor.job;select.disabled=!model.tavern.editable;
  const details=node('div','job-description'),apply=node('button','primary','この職業へ転職');apply.type='button';
  const refresh=()=>{
    const job=model.jobs.find(j=>j.id===select.value),option=actor.jobOptions.find(o=>o.id===select.value);
    details.replaceChildren(node('p','',job.role),node('p','muted',job.limitation),node('p','',job.passives.join(' / ')),node('p','muted',`成長 / 1Lv：${statLine(job.growth,model.statNames)}`));
    details.append(node('p','muted',`武器：${job.equipment.weapon.map(id=>equipmentName[id]??id).join(' / ')}　防具：${job.equipment.armor.map(id=>equipmentName[id]??id).join(' / ')}`));
    details.append(node('p','',job.grants.map(g=>`Lv${g.level} ${g.name}`).join(' / ')));
    if(option.stats)details.append(node('p','job-preview',`転職後の能力：${statLine(option.stats,model.statNames)}`));
    if(option.returned.length)details.append(node('p','requirement',`袋へ返却：${option.returned.join('・')}`));
    if(option.reason)details.append(node('p','muted',option.reason));
    apply.disabled=!option.enabled;apply.title=option.reason;
  };
  select.addEventListener('change',refresh);apply.addEventListener('click',()=>dispatch({type:'job.change',actor:actor.id,job:select.value}));
  wrap.append(select,details,apply,node('p','muted','転職は無料です。HP・MPは回復せず、過去の成長は変わりません。'));refresh();return wrap;
}
export function fieldSkills(actor,dispatch){
  const wrap=node('div','field-skills');
  for(const ability of actor.fieldAbilities??[]){
    const button=node('button','',`${ability.name} MP${ability.mp}（Lv${ability.level}）`);button.type='button';button.disabled=!ability.enabled;button.title=ability.reason||ability.description;
    button.addEventListener('click',()=>dispatch({type:'job.action',actor:actor.id,ability:ability.id}));wrap.append(button);
    if(!ability.enabled)wrap.append(node('small','muted',ability.reason));
  }
  return wrap;
}
export function buffLabels(actor){
  return [...(actor.buffs??[]).map(b=>`${b.name}・残${b.remaining}敵巡`),...(actor.covering??[]).map(c=>`${c.name}をかばう・残${c.remaining}敵巡`)];
}
