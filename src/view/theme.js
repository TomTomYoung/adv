export const THEME_DEFAULT={name:'灯と石',background:'#0b1012',surface:'#121b1e',raised:'#1a272b',ink:'#ece9dc',muted:'#a7b6b6',accent:'#dab47a',border:'#344348',danger:'#e99486',font:'serif',radius:3,sidebar:'right',textSize:17,contentWidth:1420};
export const THEME_KEYS=Object.keys(THEME_DEFAULT);
export function validateTheme(value){
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('テーマはJSONオブジェクトです');
  const result={...THEME_DEFAULT};
  for(const key of THEME_KEYS){if(value[key]===undefined)continue;
    if(['background','surface','raised','ink','muted','accent','border','danger'].includes(key)){if(!/^#[0-9a-f]{6}$/i.test(value[key]))throw new Error(`色が不正です: ${key}`);}
    else if(key==='font'&&!['serif','sans-serif','monospace'].includes(value[key]))throw new Error('fontが不正です');
    else if(key==='sidebar'&&!['left','right'].includes(value[key]))throw new Error('sidebarが不正です');
    else if(key==='name'&&(typeof value[key]!=='string'||value[key].length>40))throw new Error('テーマ名が不正です');
    else if(['radius','textSize','contentWidth'].includes(key)){const bounds={radius:[0,20],textSize:[16,24],contentWidth:[960,1800]}[key];if(!Number.isFinite(value[key])||value[key]<bounds[0]||value[key]>bounds[1])throw new Error(`${key}が範囲外です`);}
    result[key]=value[key];
  }
  return result;
}
export function applyTheme(value,root=document.documentElement){
  const theme=validateTheme(value);
  for(const key of ['background','surface','raised','ink','muted','accent','border','danger'])root.style.setProperty(`--${key}`,theme[key]);
  root.style.setProperty('--radius',`${theme.radius}px`);root.style.setProperty('--text-size',`${theme.textSize}px`);root.style.setProperty('--content-width',`${theme.contentWidth}px`);
  root.style.setProperty('--story-font',theme.font==='serif'?'"Yu Mincho", "Hiragino Mincho ProN", serif':theme.font==='sans-serif'?'"Yu Gothic", sans-serif':'monospace');
  root.dataset.sidebar=theme.sidebar;return theme;
}
