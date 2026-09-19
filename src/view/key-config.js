import {KEY_ACTIONS,DEFAULT_BINDINGS,changeBinding,copyBindings,eventCode,keyLabel,readKeyConfig,validateBindings} from './key-bindings.js';
import {focusButton} from './focus.js';
const element=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const button=(label,key,callback)=>{const b=element('button',label);b.type='button';b.dataset.focus=key;b.addEventListener('click',callback);return b;};

export function openKeyConfig({dialog,controls,config,onApply,parent}){
  let draft=readKeyConfig(config).config.bindings,capture=null,message='変更は「適用して戻る」で保存する。Escは一段戻る。',first=true;
  const render=()=>{
    controls.open('キー設定',parent);
    const status=element('p',message);status.className='key-config-status';status.setAttribute('role','status');dialog.append(status);
    dialog.append(element('p','ダンジョンの探索中は、上下で前進・後退、左右で方向転換、決定で調べる。会話・選択肢・管理画面では、方向キーで項目を選び、決定で進む。'));
    const content=element('div');content.className='key-config';let group;
    for(const action of KEY_ACTIONS){
      if(group!==action.group){group=action.group;content.append(element('h3',group));}
      const row=element('div');row.className='key-config-row';row.append(element('span',action.name));
      for(const slot of [0,1]){
        const name=slot===0?'主':'副',key=`binding:${action.id}:${slot}`;
        const change=button(`${action.name}・${name}：${capture?.id===action.id&&capture.slot===slot?'入力待ち…':keyLabel(draft[action.id][slot])}`,key,()=>{capture={id:action.id,slot};message=`「${action.name}・${name}」のキーを押す。Escで入力をやめる。`;render();});
        const clear=button(`${name}を解除`,`clear:${action.id}:${slot}`,()=>{capture=null;const result=changeBinding(draft,action.id,slot,null);if(result.ok){draft=result.bindings;message='割り当てを解除した。適用するまで現在の設定は変わらない。';}else message=result.error;render();});
        clear.disabled=draft[action.id][slot]===null||(action.required&&draft[action.id][1-slot]===null);row.append(change,clear);
      }
      content.append(row);
    }
    dialog.append(content,element('p','Escは常にキャンセル、Tabはフォーカス移動に使える。文字入力中はゲームのキー設定を使わない。'));
    const actions=element('div');actions.className='key-config-actions';
    actions.append(button('初期値に戻す','keys:reset',()=>{draft=copyBindings(DEFAULT_BINDINGS);capture=null;message='初期値を下書きに戻した。保存するには「適用して戻る」。';render();}),
      button('適用して戻る','keys:apply',()=>{const error=validateBindings(draft);if(error){message=error;render();return;}if(onApply({version:1,bindings:copyBindings(draft)})===false){message='キー設定を保存できなかった。現在の設定を維持する。';render();return;}controls.back();}));
    const back=button('変更を破棄して戻る','keys:discard',()=>controls.back());back.className='modal-close';actions.append(back);dialog.append(actions);controls.finish();
    if(first){focusButton(content.querySelector('button'));first=false;}
    controls.keyHandler=event=>{
      if(!capture)return false;
      if(event.isComposing||event.key==='Process'||event.key==='Dead'||event.ctrlKey||event.metaKey||event.altKey)return true;
      if(event.key==='Tab'){capture=null;message='キー入力を取り消した。';render();return false;}
      event.preventDefault();if(event.repeat)return true;
      if(eventCode(event)==='Escape'){capture=null;message='キー入力を取り消した。';render();return true;}
      if(event.shiftKey){message='修飾キーとの組み合わせは割り当てできない。';render();return true;}
      const result=changeBinding(draft,capture.id,capture.slot,eventCode(event));
      if(result.ok){draft=result.bindings;capture=null;message='割り当てを変更した。適用するまで現在の設定は変わらない。';}else message=result.error;
      render();return true;
    };
  };
  render();
}
