import {GameView} from './view.js';
import {THEME_DEFAULT,applyTheme} from './theme.js';
const select=document.querySelector('#fixture'),fields=document.querySelector('#theme-fields'),status=document.querySelector('#preview-status');
let theme={...THEME_DEFAULT};
const response=await fetch('data/view-fixtures.json');if(!response.ok)throw new Error('表示例を読み込めません');const fixtures=await response.json();
const show=text=>{status.textContent=text;};
const view=new GameView(document.querySelector('#app'),intent=>{show(`表示側が送る操作: ${JSON.stringify(intent)}`);return true;},{status:show,menu:()=>show('本番では記録メニューを表示します。'),help:()=>show('この画面は表示のみのプレビューです。'),retreat:()=>show('帰還操作をゲームへ送ります。'),sound:()=>show('音声再生は本番画面で確認できます。'),soundEnabled:()=>false});
function render(){view.tab=select.value==='tavern'?'party':select.value==='town'?'quests':select.value==='journal'?'journal':'explore';view.render(structuredClone(fixtures[select.value]));}
for(const [key,label] of Object.entries({background:'背景',surface:'面',raised:'ボタン',ink:'本文',muted:'補助',accent:'強調',border:'枠線'})){
  const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.type='color';input.value=theme[key];input.addEventListener('input',()=>{theme[key]=input.value;applyTheme(theme);});wrap.append(input);fields.append(wrap);
}
for(const [key,label,options] of [['font','書体',[['serif','明朝'],['sans-serif','ゴシック'],['monospace','等幅']]],['sidebar','隊の位置',[['right','右'],['left','左']]]]){
  const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('select');for(const [value,text] of options)input.append(new Option(text,value));input.value=theme[key];input.addEventListener('change',()=>{theme[key]=input.value;applyTheme(theme);});wrap.append(input);fields.append(wrap);
}
for(const [key,label,min,max] of [['textSize','本文',16,24],['radius','角丸',0,20]]){
  const wrap=document.createElement('label');wrap.textContent=label;const input=document.createElement('input');input.type='number';input.min=String(min);input.max=String(max);input.value=String(theme[key]);input.style.width='65px';input.addEventListener('change',()=>{theme[key]=Math.max(min,Math.min(max,Number(input.value)));applyTheme(theme);});wrap.append(input);fields.append(wrap);
}
select.addEventListener('change',render);
document.querySelector('#export-theme').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(theme,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='view-theme.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);show('本番画面の「記録 → 画面テーマを読み込む」で適用できます。');});
applyTheme(theme);render();

// Effect previews use detached ViewModel data only.
let demoRevision=0;
const demo=document.createElement('div');demo.className='designer-fields';const effectSelect=document.createElement('select');effectSelect.setAttribute('aria-label','演出の種類');
const effectDefinitions=fixtures.town.effects??{},effectAssets=fixtures.town.effectAssets??{};
for(const [id,effect] of Object.entries(effectDefinitions))effectSelect.append(new Option(effect.name,id));
const targetSelect=document.createElement('select');targetSelect.setAttribute('aria-label','演出の対象');for(const [id,name] of [['scene','探索画面'],['enemy','敵'],['actor','仲間']])targetSelect.append(new Option(name,id));
const play=document.createElement('button');play.textContent='演出を再生';play.addEventListener('click',()=>{const m=structuredClone(fixtures[select.value]);let target={key:'scene'};
 if(targetSelect.value==='enemy'){const enemy=m.battle?.enemies.find(e=>e.hp>0);if(!enemy){show('「新種の二体戦」など、敵のいる表示例を選んでください。');return;}target={key:`enemy:${enemy.id}`,image:enemy.sprite};}
 if(targetSelect.value==='actor'){const a=m.party[0];target={key:`actor:${a.id}`,image:a.portrait};}
 m.effects=effectDefinitions;m.effectAssets=effectAssets;m.feedback={session:'manual-preview',revision:++demoRevision,events:[{effects:[effectSelect.value],targets:[target],at:0,sound:null}]};view.render(m);show(`${effectDefinitions[effectSelect.value].name}の表示例です。`);
});
demo.append(effectSelect,targetSelect,play);document.querySelector('.designer-bar').append(demo);
