import {buttons,captureFocus,closePicker,focusButton,isEditing,moveFocus,prepareControls,restoreFocus} from './focus.js';
import {DEFAULT_BINDINGS,NAVIGATION_KEYS,eventCode,keyAction} from './key-bindings.js';

export class SystemControls{
  constructor(dialog,fallback=()=>null,getBindings=()=>DEFAULT_BINDINGS){
    this.dialog=dialog;this.getBindings=getBindings;
    dialog.addEventListener('cancel',event=>{event.preventDefault();this.back();});
    dialog.addEventListener('close',()=>{if(this.opener?.isConnected)focusButton(this.opener);else{const scope=fallback();if(scope)focusButton(buttons(scope)[0]);}this.title=null;});
  }
  open(title,parent=null){
    const d=this.dialog;
    this.snapshot=d.open&&this.title===title?captureFocus(d):null;
    if(parent&&this.title!==title)this.parentSnapshot=captureFocus(d);
    if(!d.open)this.opener=document.activeElement;
    this.parent=parent;this.title=title;this.keyHandler=null;d.replaceChildren();
    const heading=document.createElement('h2');heading.id='dialog-title';heading.textContent=title;d.append(heading);
    if(!d.open)d.showModal();
  }
  finish(){prepareControls(this.dialog);restoreFocus(this.dialog,this.snapshot,this.parent?this.dialog.querySelector('.modal-close'):null);}
  back(){
    if(closePicker(this.dialog))return;
    if(this.parent){const parent=this.parent,snapshot=this.parentSnapshot;this.parent=null;parent();restoreFocus(this.dialog,snapshot);}
    else this.dialog.close();
  }
  handleKey(event){
    if(!this.dialog.open||event.defaultPrevented||event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return false;
    if(this.keyHandler?.(event))return true;
    if(eventCode(event)==='Escape'){event.preventDefault();this.back();return true;}
    if(isEditing(document.activeElement))return true;
    const action=keyAction(event,this.getBindings());
    if(action==='cancel'){event.preventDefault();this.back();return true;}
    const scope=this.dialog.querySelector('.button-picker')??this.dialog;
    if(NAVIGATION_KEYS[action]){moveFocus(scope,{key:NAVIGATION_KEYS[action],preventDefault:()=>event.preventDefault()});return true;}
    if(action==='confirm'){event.preventDefault();if(!event.repeat){const current=document.activeElement;const target=buttons(scope).includes(current)?current:buttons(scope)[0];target?.click();}return true;}
    if(['Enter','Space'].includes(eventCode(event)))event.preventDefault();
    if(event.key==='Tab'&&scope!==this.dialog){const nodes=buttons(scope),index=nodes.indexOf(document.activeElement);event.preventDefault();focusButton(nodes[(index+(event.shiftKey?-1:1)+nodes.length)%nodes.length]);}
    return true;
  }
}
