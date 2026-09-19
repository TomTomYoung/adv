import {buttons,closePicker,focusButton,isEditing,moveFocus,visible} from './focus.js';
import {DEFAULT_BINDINGS,NAVIGATION_KEYS,eventCode,keyAction} from './key-bindings.js';

// All layouts share decision/cancel/navigation; native text inputs keep their keys.
export function handleGameKey(event,{view,model,dispatch,bindings=DEFAULT_BINDINGS,modalOpen=false,activeElement=document.activeElement}){
  if(event.defaultPrevented||modalOpen||event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return;
  const scope=view.inputScope?.()??view.root;
  const cancel=()=>{event.preventDefault();if(!closePicker(view.root))view.cancel?.();};
  if(eventCode(event)==='Escape'){cancel();return;}
  if(isEditing(activeElement))return;
  const action=keyAction(event,bindings);
  if(action==='cancel'){cancel();return;}
  if(event.key==='Tab'&&scope?.classList.contains('button-picker')){const nodes=buttons(scope),index=nodes.indexOf(activeElement);event.preventDefault();focusButton(nodes[(index+(event.shiftKey?-1:1)+nodes.length)%nodes.length]);return;}
  if(scope&&NAVIGATION_KEYS[action]){moveFocus(scope,{key:NAVIGATION_KEYS[action],preventDefault:()=>event.preventDefault()});return;}
  if(action==='confirm'){
    event.preventDefault();if(event.repeat)return;
    const selected=activeElement?.tagName==='BUTTON'&&view.root.contains(activeElement)&&visible(activeElement)&&(!scope.classList.contains('button-picker')||scope.contains(activeElement))?activeElement:buttons(scope)[0];
    selected?.click();return;
  }
  // Unassigned Enter/Space must not activate a focused native button anyway.
  if(['Enter','Space'].includes(eventCode(event)))event.preventDefault();
  if(view.handleKey?.(event)||view.blocksGameInput())return;
  if(!action&&!event.shiftKey&&model.dialog?.type==='choice'&&/^[1-9]$/.test(event.key)){
    event.preventDefault();if(view.canChoose?.()===false)return;
    const option=model.dialog.options[Number(event.key)-1];if(option?.enabled)dispatch({type:'choose',id:option.id});return;
  }
  if(model.dialog||model.battle||view.tab!=='explore')return;
  const direction={forward:'forward',backward:'back',turnLeft:'left',turnRight:'right'}[action];
  if(direction){event.preventDefault();dispatch({type:'move',direction});}
  else if(action==='inspect'){event.preventDefault();dispatch({type:'player.command',id:'interact'});}
}
