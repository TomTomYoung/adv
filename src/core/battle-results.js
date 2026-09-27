import {clone,isRecord} from './expression.js';
import {commandsAt,pushBranch,pump} from './script.js';

// Rewards are committed once. The persisted cursor only advances their messages.
export function beginBattleResult(engine,battle){
  const {state:s,data:d}=engine;
  const gold=battle.enemies.reduce((n,e)=>n+e.rewards.gold,0),xp=battle.enemies.reduce((n,e)=>n+e.rewards.xp,0);
  const recipients=s.members.filter(id=>s.actors[id].hp>0);
  const levels=engine.award(gold,xp);
  s.battleResult={encounter:battle.encounter,continuation:clone(battle.continuations),phase:'result',index:0,levels,drops:null};
  s.notice='';delete s.presentation.cast;delete s.presentation.message;
  show(engine,`戦いに勝った！\n${recipients.map(id=>d.actors[id].name).join('、')}は、それぞれ${xp}の経験値を獲得した。\n${gold}ゴールドを手に入れた。`,'戦闘リザルト');
}
function show(engine,text,speaker){
  engine.state.waiting={type:'battle_result',text,speaker};engine.log(text);
}
function nextLevel(engine){
  const r=engine.state.battleResult,row=r.levels[r.index];
  if(!row)return treasure(engine);
  r.phase='level';
  const names=engine.data.jobProfile?.statNames??{};
  const growth=Object.entries(row.growth).filter(([,n])=>n>0).map(([key,n])=>`${names[key]??key}が${n}上がった。`);
  const learned=row.skills.map(id=>`${(engine.data.skills[id]??engine.data.fieldAbilities[id]).name}を使えるようになった。`);
  show(engine,[`${engine.data.actors[row.actor].name}はレベル${row.level}になった！`,...growth,...learned,'HPとMPが全回復した。'].join('\n'),'レベルアップ');
  engine.cue('level_up',[`actor:${row.actor}`]);
}
function treasure(engine){
  const r=engine.state.battleResult,counts={};
  // One independent lottery per defeated monster. A chest groups all winning items.
  for(const id of engine.data.encounters[r.encounter].enemies){
    const drop=engine.data.enemies[id].drop;
    if(drop&&drop.chance>0&&engine.random()<drop.chance)counts[drop.item]=(counts[drop.item]??0)+1;
  }
  r.drops=Object.entries(counts).map(([item,count])=>({item,count}));r.index=0;
  if(!r.drops.length)return finish(engine);
  r.phase='chest';show(engine,'魔物たちは宝箱を落としていった！','宝箱');engine.cue('chest');
}
function nextItem(engine){
  const r=engine.state.battleResult,drop=r.drops[r.index];if(!drop)return finish(engine);
  const room=engine.data.system.maxStack-(engine.state.inventory[drop.item]??0),count=Math.min(room,drop.count),name=engine.data.items[drop.item].name;
  if(count)engine.give(drop.item,count);
  r.phase='item';
  show(engine,[count?`${name}を${count}個、手に入れた！`:'',count<drop.count?`袋がいっぱいで、${name}を${drop.count-count}個持ち帰れなかった。`:''].filter(Boolean).join('\n'),'アイテム獲得');engine.cue('item');
}
function finish(engine){
  const c=engine.state.battleResult.continuation;
  engine.state.battleResult=null;engine.state.waiting=null;
  if(c.frame)pushBranch(engine,c.frame,c.index,[c.win]);
  pump(engine);return true;
}
export function advanceBattleResult(engine){
  const r=engine.state.battleResult;if(!r||engine.state.waiting?.type!=='battle_result')return false;
  if(r.phase==='result')nextLevel(engine);
  else if(r.phase==='level'){r.index++;nextLevel(engine);}
  else if(r.phase==='chest')nextItem(engine);
  else if(r.phase==='item'){r.index++;nextItem(engine);}
  return true;
}
export function battleResultErrors(data,s){
  const r=s.battleResult,fail=()=>['戦闘リザルトの保存状態不正'];
  if(r===null)return s.waiting?.type==='battle_result'?fail():[];
  if(!isRecord(r)||s.battle||s.waiting?.type!=='battle_result'||typeof s.waiting.text!=='string'||typeof s.waiting.speaker!=='string'||!Object.hasOwn(data.encounters,r.encounter)||!['result','level','chest','item'].includes(r.phase)||!Number.isInteger(r.index)||r.index<0||!Array.isArray(r.levels)||r.levels.length>data.system.maxParty*(data.system.maxLevel-1))return fail();
  if(r.levels.some(row=>!isRecord(row)||!s.members.includes(row.actor)||!Number.isInteger(row.level)||row.level<2||row.level>s.actors[row.actor].level||!isRecord(row.growth)||Object.entries(row.growth).some(([key,n])=>!['hp','mp','str','vit','agi','int'].includes(key)||!Number.isInteger(n))||!Array.isArray(row.skills)||row.skills.some(id=>!data.skills[id]&&!data.fieldAbilities?.[id])))return fail();
  if(['result','level'].includes(r.phase)){
    if(r.drops!==null||r.phase==='result'&&r.index!==0||r.phase==='level'&&r.index>=r.levels.length)return fail();
  }else{
    const possible={};for(const id of data.encounters[r.encounter].enemies){const drop=data.enemies[id].drop;if(drop?.chance>0)possible[drop.item]=(possible[drop.item]??0)+1;}
    if(!Array.isArray(r.drops)||!r.drops.length||new Set(r.drops.map(v=>v?.item)).size!==r.drops.length||r.drops.some(v=>!isRecord(v)||!possible[v.item]||!Number.isInteger(v.count)||v.count<1||v.count>possible[v.item])||r.index>=r.drops.length||r.phase==='chest'&&r.index!==0)return fail();
  }
  const c=r.continuation;if(!isRecord(c))return fail();
  if(c.frame){try{const cmd=commandsAt(data,c.frame)[c.index];if(cmd?.op!=='battle.start'||cmd.encounter!==r.encounter||c.win!=='on_win'||c.lose!=='on_lose'||c.escape!=='on_escape'||!s.vm.some(f=>f.script===c.frame.script&&f.scope===c.frame.scope&&f.index===c.index+1&&JSON.stringify(f.path)===JSON.stringify(c.frame.path)))return fail();}catch{return fail();}}
  return [];
}
