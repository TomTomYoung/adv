import {GameView} from './view.js';
import {SceneView} from './scene-view.js';
export const VIEW_LAYOUTS={scene:'背景内表示',classic:'従来表示'};
export const normalizeLayout=value=>Object.hasOwn(VIEW_LAYOUTS,value)?value:'scene';
export function replaceView(previous,layout,root,dispatch,ui){
  const next=new (normalizeLayout(layout)==='scene'?SceneView:GameView)(root,dispatch,ui);
  if(previous){
    for(const key of ['tab','shopItem','profileActor','profilePage','partySelection','partyPages','bagActor','dungeonFilter','query','filter','selectedTarget','selectedAlly'])next[key]=previous[key];
    next.effects.key=previous.effects.key;
    previous.destroy();
  }
  root.dataset.view=normalizeLayout(layout);
  return next;
}
