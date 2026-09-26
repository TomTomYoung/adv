import {jobPanel,buffLabels} from './jobs.js';
import {focusButton} from './focus.js';
const make=(tag,className,text)=>{const e=document.createElement(tag);e.className=className??'';if(text!==undefined)e.textContent=text;return e;};
const button=(label,key,fn,disabled=false)=>{const b=make('button','',label);b.type='button';b.dataset.focus=key;b.disabled=disabled;b.addEventListener('click',fn);return b;};
const slots={weapon:'武器',armor:'防具',charm:'装飾品'};
const stats={hp:'最大HP',mp:'最大MP',str:'力',vit:'防御',agi:'素早さ',int:'知力'};
function refocus(view,key){focusButton([...view.root.querySelectorAll('[data-focus]')].find(e=>e.dataset.focus===key&&!e.disabled));}
export function characterCard(view,actor,key,selected,fn){
  const card=button('',key,fn);card.className='character-card'+(actor.hp<=0?' fallen':'');card.setAttribute('aria-pressed',String(selected));
  const body=make('span','character-card-values');body.append(make('span','character-card-name',actor.name),make('span','',`HP ${actor.hp}/${actor.maxHp}`),make('span','',`MP ${actor.mp}/${actor.maxMp}`));
  card.append(view.portrait(actor,'character-card-portrait'),body);return card;
}
function profile(view,actor,m,{context,page='overview',jobs=false,onPage}){
  const panel=make('section','character-profile');panel.dataset.profile=context;panel.dataset.actor=actor.id;panel.setAttribute('aria-label',`${actor.name}のプロフィール`);
  const tabs=make('nav','profile-tabs');tabs.dataset.scroll=`profile-tabs:${context}`;tabs.setAttribute('aria-label',`${actor.name}のプロフィールページ`);
  for(const [id,label] of [['overview','プロフィール'],...(jobs?[['jobs','転職']]:[]),['skills','スキル'],['magic','魔法'],['items','所持アイテム']]){
    const key=`profile:${context}:${id}`,b=button(label,key,()=>{onPage(id);view.render(view.model);refocus(view,key);});b.setAttribute('aria-current',page===id?'page':'false');tabs.append(b);
  }
  panel.append(tabs);const content=make('div','profile-content');content.dataset.scroll=`profile:${context}:${actor.id}:${page}`;panel.append(content);
  if(page==='overview'){
    const head=make('div','profile-heading'),text=make('div');text.append(make('h3','',actor.name),make('p','profile-job',actor.class),make('p','',actor.role));head.append(view.portrait(actor,'profile-portrait'),text);content.append(head);
    if(actor.bio)content.append(make('p','profile-bio',actor.bio));
    content.append(make('p','profile-vitals',`HP ${actor.hp}/${actor.maxHp}　MP ${actor.mp}/${actor.maxMp}`));
    const parameters=make('dl','profile-parameters');for(const [key,value] of Object.entries(actor.stats??{}))parameters.append(make('dt','',m.statNames?.[key]??stats[key]??key),make('dd','',String(value)));content.append(parameters);
    if(actor.statuses?.length)content.append(make('p','requirement',actor.statuses.join('・')));
    if(buffLabels(actor).length)content.append(make('p','',buffLabels(actor).join(' / ')));
    content.append(make('h4','','戦闘時アクション'));const actions=make('div','profile-action-list');for(const skill of actor.skills??[])actions.append(make('span','badge',`${skill.name}${skill.mp?` MP${skill.mp}`:''}`));content.append(actions);
    content.append(make('h4','','装備'));for(const [slot,label] of Object.entries(slots))content.append(make('p','profile-equipment',`${label}：${actor.equipment?.[slot]??'なし'}`));
  }else if(page==='jobs'){
    content.append(make('h3','',`${actor.name}の転職`));const jobsPanel=jobPanel(actor,m,intent=>view.act(intent));if(jobsPanel){jobsPanel.open=true;content.append(jobsPanel);}
  }else if(page==='items'){
    content.append(make('h3','',`${actor.name}の所持アイテム`));
    if(!actor.items?.length)content.append(make('p','empty','所持アイテムはありません。'));
    for(const item of actor.items??[]){const row=make('article','profile-entry');row.append(make('h4','',`${item.name} ×${item.count}`),make('p','',item.description));content.append(row);}
  }else{
    content.append(make('h3','',`${actor.name}の${page==='magic'?'魔法':'スキル'}`));
    const entries=[...(actor.skills??[]).filter(s=>(s.category??'skills')===page).map(s=>({...s,battle:true})),...(actor.fieldAbilities??[]).filter(s=>(s.category??'skills')===page)];
    if(!entries.length)content.append(make('p','empty',`習得している${page==='magic'?'魔法':'スキル'}はありません。`));
    for(const ability of entries){const row=make('article','profile-entry');row.append(make('h4','',`${ability.name}　MP${ability.mp??0}`),make('p','',ability.description));
      if(ability.battle)row.append(make('small','muted','戦闘時に使用'));
      else{row.append(button('使う',`profile:${context}:use:${ability.id}`,()=>view.act({type:'job.action',actor:actor.id,ability:ability.id}),!ability.enabled));if(ability.reason)row.append(make('small','requirement',ability.reason));}
      content.append(row);
    }
  }
  return panel;
}
export function renderCharacter(view,parent,m){
  const actor=(m.roster??m.party).find(a=>a.id===view.profileActor)??m.party[0];
  if(!actor)return;view.profileActor=actor.id;
  const section=make('section','panel-content character-page');section.append(profile(view,actor,m,{context:'town',page:view.profilePage??'overview',jobs:m.mode==='town',onPage:page=>{view.profilePage=page;}}));parent.append(section);
}
export function renderParty(view,parent,m){
  const section=make('section','panel-content party-board');section.setAttribute('aria-label','隊の状態');
  view.partySelection??={};view.partyPages??={};
  for(const [group,title,actors] of [['party','パーティー',m.party.map(a=>(m.roster??[]).find(r=>r.id===a.id)??a)],['tavern','酒場',(m.roster??[]).filter(a=>!a.active)]]){
    if(group==='tavern'&&m.mode!=='town')continue;
    if(!actors.some(a=>a.id===view.partySelection[group])){view.partySelection[group]=actors[0]?.id??null;view.partyPages[group]='overview';}
    const selected=actors.find(a=>a.id===view.partySelection[group]),choices=make('section',`party-picker ${group}-picker`);choices.setAttribute('aria-label',`${title}キャラクター選択`);
    choices.append(make('h3','',`${title}　${actors.length}${group==='party'?` / ${m.tavern?.maxParty??5}`:''}人`));
    const cards=make('div','party-card-list');cards.dataset.scroll=`roster:${group}`;
    for(const actor of actors){const key=`roster:${group}:${actor.id}`;cards.append(characterCard(view,actor,key,actor===selected,()=>{view.partySelection[group]=actor.id;view.partyPages[group]='overview';view.render(view.model);refocus(view,key);}));}choices.append(cards);
    if(!actors.length)cards.append(make('p','empty','酒場で待つ仲間はいません。'));
    if(m.mode==='town')choices.append(button(group==='party'?'待機':'加入',`roster:${group}:apply`,()=>view.act({type:'party',action:group==='party'?'leave':'join',actor:selected.id}),!selected||!(group==='party'?selected.canLeave:selected.canJoin)));
    section.append(choices);
    const details=make('section',`party-detail ${group}-detail`);details.setAttribute('aria-label',`${title}キャラクタープロフィール`);
    if(selected)details.append(profile(view,selected,m,{context:group,page:view.partyPages[group]??'overview',onPage:page=>{view.partyPages[group]=page;}}));else details.append(make('p','empty','表示するキャラクターがいません。'));
    section.append(details);
  }
  parent.append(section);
}
