import {buttons,closePicker,focusButton,isEditing,moveFocus,visible} from './focus.js';

// All layouts share decision/cancel/navigation; native text inputs keep their keys.
export function handleGameKey(event,{view,model,dispatch,modalOpen=false,activeElement=document.activeElement}){
  if(event.defaultPrevented||modalOpen||event.ctrlKey||event.metaKey||event.altKey||event.isComposing)return;
  const scope=view.inputScope?.()??view.root;
  if(event.key==='Escape'){event.preventDefault();if(!closePicker(view.root))view.cancel?.();return;}
  if(isEditing(activeElement))return;
  if(event.key==='Tab'&&scope?.classList.contains('button-picker')){const nodes=buttons(scope),index=nodes.indexOf(activeElement);event.preventDefault();focusButton(nodes[(index+(event.shiftKey?-1:1)+nodes.length)%nodes.length]);return;}
  if(scope&&moveFocus(scope,event))return;
  if(['Enter',' '].includes(event.key)){
    event.preventDefault();if(event.repeat)return;
    const selected=activeElement?.tagName==='BUTTON'&&view.root.contains(activeElement)&&visible(activeElement)&&(!scope.classList.contains('button-picker')||scope.contains(activeElement))?activeElement:buttons(scope)[0];
    selected?.click();return;
  }
  if(view.handleKey?.(event)||view.blocksGameInput())return;
  if(model.dialog?.type==='choice'&&/^[1-9]$/.test(event.key)){
    event.preventDefault();if(view.canChoose?.()===false)return;
    const option=model.dialog.options[Number(event.key)-1];if(option?.enabled)dispatch({type:'choose',id:option.id});return;
  }
  if(model.dialog||model.battle||view.tab!=='explore')return;
  const direction={w:'forward',s:'back',a:'left',d:'right'}[event.key.toLowerCase()];
  if(direction){event.preventDefault();dispatch({type:'move',direction});}
  else if(event.key.toLowerCase()==='e'){event.preventDefault();dispatch({type:'player.command',id:'interact'});}
}
