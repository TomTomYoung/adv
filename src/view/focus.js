// Shared button navigation. This module has no access to game state.
const directions={ArrowUp:-1,ArrowLeft:-1,ArrowDown:1,ArrowRight:1};
export const isEditing=e=>['INPUT','SELECT','TEXTAREA'].includes(e?.tagName)||e?.isContentEditable;
export function visible(e){
  if(e.disabled||e.closest('[hidden], [inert]')||!e.getClientRects().length)return false;
  for(let p=e.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS'&&!p.open&&!p.querySelector('summary')?.contains(e))return false;
  return true;
}
export const buttons=root=>[...root.querySelectorAll('button')].filter(visible);
export function focusButton(e){e?.focus({preventScroll:true});e?.scrollIntoView?.({block:'nearest',inline:'nearest'});}
export function captureFocus(root){
  const e=document.activeElement,nodes=buttons(root);
  return {key:root.contains(e)?e.dataset.focus:null,index:nodes.indexOf(e),selection:e?.selectionStart,
    scrolls:[...root.querySelectorAll('[data-scroll]')].map(e=>({key:e.dataset.scroll,top:e.scrollTop,left:e.scrollLeft})),
    details:[...root.querySelectorAll('details')].filter(d=>d.open).map(d=>d.querySelector('summary button')?.dataset.focus)};
}
export function restoreFocus(root,snapshot,preferred){
  const e=snapshot?.key?[...root.querySelectorAll('[data-focus]')].find(e=>e.dataset.focus===snapshot.key&&visible(e)):null;
  const target=e??preferred??buttons(root)[Math.max(0,snapshot?.index??0)]??buttons(root)[0];
  focusButton(target);
  if(e&&Number.isInteger(snapshot.selection)&&isEditing(e)&&e.setSelectionRange)e.setSelectionRange(snapshot.selection,snapshot.selection);
}
export function moveFocus(root,event){
  const delta=directions[event.key];if(!delta)return false;
  event.preventDefault();const nodes=buttons(root);if(!nodes.length)return true;
  const current=document.activeElement,index=nodes.indexOf(current);
  if(index<0){focusButton(nodes[0]);return true;}
  const horizontal=['ArrowLeft','ArrowRight'].includes(event.key),r=current.getBoundingClientRect();
  const x=r.left+r.width/2,y=r.top+r.height/2;
  const candidates=nodes.filter(e=>e!==current).map(e=>{const b=e.getBoundingClientRect(),dx=b.left+b.width/2-x,dy=b.top+b.height/2-y;return {e,along:(horizontal?dx:dy)*delta,across:Math.abs(horizontal?dy:dx)};}).filter(c=>c.along>1).sort((a,b)=>(a.along+a.across*3)-(b.along+b.across*3));
  focusButton(candidates[0]?.e??nodes[(index+delta+nodes.length)%nodes.length]);return true;
}
export function closePicker(root){
  const picker=root.querySelector('.button-picker');if(!picker)return false;
  picker._close();return true;
}
export function closeDetails(root){
  const active=document.activeElement?.closest('details');
  const detail=active?.open?active:[...root.querySelectorAll('details')].filter(d=>d.open).at(-1);
  if(!detail)return false;detail.open=false;const toggle=detail.querySelector('summary button');toggle?.setAttribute('aria-expanded','false');focusButton(toggle);return true;
}
export function prepareControls(root){
  // Keep native selects as the value/change source for existing view callbacks.
  for(const select of root.querySelectorAll('select')){
    if(select.hidden)continue;
    const wrap=document.createElement('span');wrap.className='button-select';
    select.parentElement.insertBefore(wrap,select);wrap.append(select);select.hidden=true;
    const label=select.getAttribute('aria-label')||wrap.parentElement.getAttribute('aria-label')||'選択';
    const trigger=document.createElement('button');trigger.type='button';trigger.disabled=select.disabled;
    trigger.dataset.focus=`select:${label}`;trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
    const update=()=>{trigger.textContent=`${label}：${[...select.options].find(o=>o.value===select.value)?.textContent??''}`;};update();
    trigger.addEventListener('click',()=>{
      if(closePicker(root))return;
      const picker=document.createElement('div');picker.className='button-picker';picker.setAttribute('role','dialog');picker.setAttribute('aria-label',label);
      const close=()=>{picker.remove();trigger.setAttribute('aria-expanded','false');focusButton(trigger);};picker._close=close;
      for(const option of select.options){const b=document.createElement('button');b.type='button';b.textContent=option.textContent;b.disabled=option.disabled;b.dataset.value=option.value;b.setAttribute('aria-pressed',String(select.value===option.value));
        b.addEventListener('click',()=>{select.value=option.value;update();close();select.dispatchEvent(new Event('change',{bubbles:true}));});picker.append(b);}
      const cancel=document.createElement('button');cancel.type='button';cancel.textContent='戻る';cancel.addEventListener('click',close);picker.append(cancel);
      wrap.append(picker);trigger.setAttribute('aria-expanded','true');focusButton(buttons(picker).find(b=>b.dataset.value===select.value)??buttons(picker)[0]);
    });wrap.append(trigger);
  }
  const detailCounts=new Map();
  for(const details of root.querySelectorAll('details')){
    const summary=details.querySelector('summary');if(!summary||summary.querySelector('button'))continue;
    const toggle=document.createElement('button');toggle.type='button';toggle.textContent=summary.textContent;toggle.setAttribute('aria-expanded',String(Boolean(details.open)));
    const group=details.closest('[data-control-group]')?.dataset.controlGroup??'',index=detailCounts.get(group)??0;detailCounts.set(group,index+1);toggle.dataset.focus=`details:${group}:${index}`;
    summary.replaceChildren(toggle);summary.tabIndex=-1;
    summary.addEventListener('click',e=>{e.preventDefault();details.open=!details.open;toggle.setAttribute('aria-expanded',String(details.open));focusButton(toggle);});
  }
  const counts=new Map();
  for(const e of root.querySelectorAll('button')){
    if(e.dataset.focus)continue;
    const group=e.closest('[data-control-group]')?.dataset.controlGroup??'';
    const key=`${group}/${e.getAttribute('aria-label')??e.textContent}`,n=counts.get(key)??0;counts.set(key,n+1);e.dataset.focus=`${key}/${n}`;
  }
}
