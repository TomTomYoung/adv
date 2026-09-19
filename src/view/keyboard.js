// Shared input routing. A view can consume local input without advancing play.
export function handleGameKey(event,{view,model,dispatch,menu,modalOpen=false,activeElement=document.activeElement}){
  if(event.defaultPrevented||modalOpen||event.ctrlKey||event.metaKey||event.altKey)return;
  if(view.handleKey?.(event)||view.blocksGameInput())return;
  if(['INPUT','SELECT','TEXTAREA'].includes(activeElement?.tagName)||activeElement?.isContentEditable)return;
  if(event.key==='Escape'){event.preventDefault();menu();return;}
  if(model.dialog?.type==='text'&&['Enter',' '].includes(event.key)&&activeElement?.tagName!=='BUTTON'){event.preventDefault();view.advanceText();return;}
  if(model.dialog?.type==='choice'&&/^[1-9]$/.test(event.key)){
    if(view.canChoose?.()===false){event.preventDefault();return;}
    const option=model.dialog.options[Number(event.key)-1];if(option?.enabled){event.preventDefault();dispatch({type:'choose',id:option.id});}return;
  }
  if(model.dialog||model.battle||view.tab!=='explore')return;
  const direction={w:'forward',ArrowUp:'forward',s:'back',ArrowDown:'back',a:'left',ArrowLeft:'left',d:'right',ArrowRight:'right'}[event.key];
  if(direction){event.preventDefault();dispatch({type:'move',direction});}
  else if(event.key.toLowerCase()==='e'){event.preventDefault();dispatch({type:'player.command',id:'interact'});}
}
