import {abilityCategory} from './ability-category.js';
import {depth, living, moveTo, profession, weakest} from './monster-family-field.js';
import {applyStun} from './battle-turns.js';
import {applyStatus, hasActiveStatus, removeStatus} from './status-effects.js';
import {splitSlime} from './battle-reinforcements.js';
import {recordDefeated} from './records.js';

const kind = unit => unit?.family === 'slime' ? profession(unit) : null;
const isOil = u => kind(u) === 'oil';
const relics = ['剣','盾','杖'];
const nearest = (s, units, u) => [...units].sort((a,b)=>Math.abs(depth(s,a)-depth(s,u))-Math.abs(depth(s,b)-depth(s,u)))[0];
const allies = (s,u) => living(s,s.battle.enemies).filter(m=>m!==u);
const party = s => living(s,s.members.map(id=>s.actors[id]));
const inRow = (s,units,row) => units.filter(u=>depth(s,u)===row);
const say = (engine,u,msg) => engine.state.battle.log.push(u.name+'：'+msg);
const phase = (engine,u,value,msg) => {u.tactics.phase=value;say(engine,u,msg);};
const hpRatio = u => u.hp/u.stats.hp;

export function slimeSprite(data,u){
  const t=u.tactics??{};
  const alternate = isOil(u)&&u.statuses.includes('ablaze')?'oil_lit':
    kind(u)==='bottle'&&t.open?'bottle_open':kind(u)==='twins'&&t.half?'twin_half':null;
  return data.assets.images[alternate?'monster_slime_'+alternate:data.enemies[u.id].sprite];
}

export function slimeLabels(u){
  if(!kind(u))return u.tactics?.foam?['泡の盾']:[];
  const t=u.tactics??{};
  const labels={stretch:'伸び上がり',flat:'跳躍準備',floor:'床に貼りつき',bare:'砂鉄を放出',wax:'蝋が溶けている',mirror:'鏡面',core:'核が露出',lean:'倒れ込み準備',puddle:'水たまり',red:'赤い攻撃薬',green:'緑の回復薬'};
  const result=[];
  if(labels[t.phase])result.push(labels[t.phase]);
  if(t.relic)result.push(t.relic+'が浮上');
  if(kind(u)==='strata')result.push(hpRatio(u)>2/3?'砂の層':hpRatio(u)>1/3?'粘土の層':'水の層');
  if(t.phase==='lean')result.push(['前列狙い','中列狙い','後列狙い'][t.row]);
  if(t.air)result.push('膨張 '+t.air+'/3');
  if(kind(u)==='stones')result.push('腹石 '+(3-(t.shots??0)));
  if(t.link)result.push(({thread:'糸つなぎ',parasol:'傘開き',porter:'壺を配達中',bandage:'包帯巻き'})[kind(u)]);
  if(t.stuck)result.push('武器に密着');
  if(t.foam)result.push('泡の盾');
  if(t.half)result.push(t.half==='front'?'前の分体':'後ろの分体');
  return result.filter(Boolean);
}

export function slimeTurn(engine,u,cast){
  const s=engine.state,b=s.battle,t=u.tactics,foes=party(s),mates=allies(s,u);
  if(!foes.length)return;
  const front=Math.min(...foes.map(v=>depth(s,v))),rear=Math.max(...foes.map(v=>depth(s,v)));
  const target=foes[Math.floor(engine.random()*foes.length)],frontRow=inRow(s,foes,front);
  const last=inRow(s,foes,rear)[0], hurt=weakest(mates.filter(v=>v.hp<v.stats.hp));
  const linked=mates.find(v=>v.instance===t.link);
  const use=(targets,id=u.classSkill)=>cast(u,Array.isArray(targets)?targets:[targets],id);
  const attack=(v=target)=>use(v,'attack');
  const step=(v,delta)=>moveTo(engine,v,Math.max(0,Math.min(2,depth(s,v)+delta)));
  switch(kind(u)){
    case 'oil':
      if(hasActiveStatus(engine.data,s,u,'ablaze')){
        use(foes,'slime_burst');u.hp=0;recordDefeated(engine);say(engine,u,'自爆して燃え尽きた。');return;
      }
      return use(target);
    case 'drop':
      if(t.phase==='stretch'){delete t.phase;return use(target);}
      attack();return phase(engine,u,'stretch','体を細長く伸ばした。');
    case 'mochi':
      if(t.phase==='floor'){delete t.phase;say(engine,u,'床から体をはがした。');return;}
      if(!t.phase)return phase(engine,u,'flat','床に薄く広がった。');
      delete t.phase;
      {const hits=use(last);if(hits?.some(h=>h.guarded))phase(engine,u,'floor','跳ね返されて床に貼りついた。');}return;
    case 'berry':
      if(!t.spent&&u.hp<u.stats.hp){t.spent=true;return use(u);}
      return attack();
    case 'bubble': {
      const v=nearest(s,mates.filter(v=>!v.tactics?.foam),u);
      if(!v)return attack();
      (v.tactics??={}).foam=true;say(engine,u,v.name+'を泡で包んだ。');return use(v);
    }
    case 'stones':
      if(t.shots===3)return attack();
      t.shots=(t.shots??0)+1;return use(last);
    case 'iron':
      if(t.phase==='bare'){delete t.phase;say(engine,u,'床の砂鉄を集め直した。');return;}
      phase(engine,u,'bare','針を放ち、丸裸になった。');return use(target);
    case 'wick':
      if(t.phase==='wax'){delete t.phase;return use(frontRow);}
      return attack();
    case 'parasol':
    case 'thread': {
      if(linked)return attack();
      const behind=mates.filter(v=>depth(s,v)>depth(s,u));
      const ward=nearest(s,behind,u);
      if(!ward)return attack();
      t.link=ward.instance;say(engine,u,ward.name+(kind(u)==='thread'?'に糸を結んだ。':'に傘を差しかけた。'));return use(ward);
    }
    case 'mirror':
      if(t.phase==='mirror'){delete t.phase;return attack();}
      return phase(engine,u,'mirror','表面が鏡のように張った。');
    case 'twins': {
      const sibling=mates.find(v=>v.instance===t.twin);
      if(t.half==='rear'&&sibling&&sibling.hp<sibling.stats.hp)return use(sibling,'slime_cure');
      return use(target);
    }
    case 'bandage':
      if(linked&&linked.hp<linked.stats.hp)return use(linked);
      delete t.link;
      if(!hurt)return attack();
      t.link=hurt.instance;say(engine,u,hurt.name+'に巻きついた。');return use(hurt);
    case 'balloon':
      t.air=(t.air??0)+1;
      if(t.air<3){say(engine,u,'空気を吸った（'+t.air+'/3）。');return;}
      t.air=0;
      {const ranks=[...frontRow,...inRow(s,[u,...mates],Math.min(...[u,...mates].map(v=>depth(s,v))))];
       use(ranks);for(const v of ranks)if(v.hp>0)step(v,1);}return;
    case 'porter':
      if(t.spent)return attack();
      if(linked){t.spent=true;delete t.link;return use(linked);}
      delete t.link;
      if(!hurt)return attack();
      t.link=hurt.instance;moveTo(engine,u,depth(s,hurt));say(engine,u,hurt.name+'へ壺を運んでいる。');return;
    case 'strata':
      if(hpRatio(u)>2/3)return use(frontRow);
      return use(frontRow,hpRatio(u)>1/3?'slime_clay':'slime_wave');
    case 'gem':
      if(t.phase==='core'){delete t.phase;return use(target);}
      return phase(engine,u,'core','青い核が浮き上がり、光を集めた。');
    case 'pot':
      if(!t.phase){t.nextGreen=!t.nextGreen;return t.nextGreen?phase(engine,u,'red','釜が赤く煮えた。'):phase(engine,u,'green','釜が緑に煮えた。');}
      {const green=t.phase==='green';delete t.phase;return green?use(hurt??u,'slime_cure'):use(target);}
    case 'falls':
      if(t.phase==='puddle'){delete t.phase;say(engine,u,'流れを集め直した。');return;}
      if(!t.phase){t.row=depth(s,target);return phase(engine,u,'lean',['前','中','後'][t.row]+'列へ傾いた。');}
      {const victims=inRow(s,foes,t.row);delete t.row;phase(engine,u,'puddle','流れ落ちて核が露出した。');
       if(victims.length)use(victims);for(const v of victims)if(v.hp>0)step(v,1);}return;
    case 'abyss': {
      const left=relics.filter(x=>!t.lost?.includes(x));
      if(!left.length)return use(target,'slime_press');
      if(!t.relic){t.relic=left[(t.cycle??0)%left.length];say(engine,u,t.relic+'が浮かんできた。');return;}
      const tool=t.relic;delete t.relic;t.cycle=((t.cycle??0)+1)%3;
      return tool==='剣'?use(frontRow,'slime_relicslash'):tool==='盾'?use(u,'guard'):use(target,'slime_relicspell');
    }
    default:return use(target);
  }
}

// These checks run for each landed strike so follow-up hits can pass a broken bubble.
export function slimeDeflect(engine,source,target,skill,id,projectile,reflect){
  const s=engine.state,t=target.tactics;
  if(!target.instance||source.instance||!t||!skill.effects.some(e=>e.type==='damage'))return false;
  if(t.foam){delete t.foam;say(engine,target,'泡が一撃を受けて割れた。');return true;}
  if(projectile&&allies(s,target).some(u=>kind(u)==='parasol'&&u.tactics.link===target.instance&&depth(s,u)<depth(s,target))){
    say(engine,target,'傘が飛び道具を受け止めた。');return true;
  }
  if(kind(target)==='molt'&&!t.spent){
    t.spent=true;t.shellRow=depth(s,target);moveTo(engine,target,Math.min(2,t.shellRow+1));say(engine,target,'空の外皮を残して身をかわした。');return true;
  }
  if(kind(target)==='mirror'&&t.phase==='mirror'&&abilityCategory(id)==='magic'&&skill.target==='enemy'&&
     (skill.targeting?.area?.shape??'single')==='single'&&(skill.frontlineTargeting?.area?.shape??'single')==='single'){
    delete t.phase;say(engine,target,'鏡面に術が跳ね返った。');reflect();return true;
  }
  return false;
}

export function slimeHitType(data,source,skill,id,physical,projectile){
  const weapon=data.items[source.equipment?.weapon]?.equipmentType;
  const contact=physical&&!projectile&&abilityCategory(id)!=='magic'&&
    !['lob','indirect'].includes(skill.targeting?.trajectory);
  const thrust=physical&&(['pierce','exp_line_thrust','needle_lunge','meteor'].includes(id)||(id==='attack'&&['spear','dagger','bow'].includes(weapon)));
  const heavy=contact&&(id==='power'||id==='stun_break'||skill.effects.some(e=>e.formula==='heavy'));
  const blunt=contact&&(heavy||['fist','staff','tool'].includes(weapon)||(!weapon&&id==='attack'));
  return {contact,thrust,heavy,blunt};
}
export function slimePower(u,hit){
  const t=u.tactics;
  switch(kind(u)){
    case 'bottle':return t.open?1.5:hit.blunt?1:.5;
    case 'iron':return t.phase==='bare'?1.5:1;
    case 'wick':return t.phase==='wax'&&hit.blunt?2:1;
    case 'parasol':return t.link&&hit.contact?1.75:1;
    case 'bandage':return t.link&&hit.blunt?2:1;
    case 'gem':return t.phase==='core'?(hit.blunt?2.5:1):.5;
    case 'falls':return t.phase==='puddle'?2:1;
    default:return 1;
  }
}

export function slimeAfterDamage(engine,source,target,id,element,hit,damage,cast){
  const {state:s,data}=engine, b=s.battle,t=target.tactics;
  if(!source.instance&&id==='attack'){
    const stuck=living(s,b.enemies).find(u=>kind(u)==='sticky'&&u.tactics.stuck===source.id&&u!==target);
    if(stuck){delete stuck.tactics.stuck;stuck.hp=Math.max(0,stuck.hp-damage);say(engine,stuck,'武器ごと叩きつけられた。');recordDefeated(engine);}
  }
  if(!kind(target))return;
  switch(kind(target)){
    case 'oil':
      if(element==='fire'&&target.hp>0&&!hasActiveStatus(data,s,target,'ablaze')){
        removeStatus(target,'oiled');
        if(applyStatus(data,s,target,'ablaze'))say(engine,target,'火だるまになった！');
      }break;
    case 'sticky':
      if(!source.instance&&hit.contact&&!t.spent&&target.hp>0){t.spent=true;t.stuck=source.id;say(engine,target,'武器にくっついた。');}break;
    case 'bottle':
      if(hit.blunt&&!t.open){t.open=true;say(engine,target,'瓶が割れた。');cast(target,inRow(s,party(s),depth(s,source)),'slime_splash');}break;
    case 'wick':
      if(element==='fire'&&target.hp>0)phase(engine,target,'wax','灯芯に火がつき、蝋が溶けた。');break;
    case 'chime':
      if(hit.blunt){for(const e of living(s,b.enemies))removeStatus(e,'sleep');say(engine,target,'鈴の音が響いた。');}break;
    case 'rubber':
      if(id!=='slime_bump'&&hit.blunt&&target.hp>0&&depth(s,target)<2){
        const row=depth(s,target)+1,v=inRow(s,allies(s,target),row)[0];
        if(moveTo(engine,target,row)&&v){say(engine,target,v.name+'に衝突した。');cast(target,[target,v],'slime_bump');}
      }break;
    case 'mirror':if(hit.contact||element==='physical')delete t.phase;break;
    case 'twins':if(!t.half&&target.hp>=2&&hpRatio(target)<=.5)splitSlime(engine,target);break;
    case 'bandage':if(hit.blunt)delete t.link;break;
    case 'beads':(b.familyField.beads??={})[depth(s,target)]=true;say(engine,target,'足元に粒が転がった。');break;
    case 'balloon':
      if(hit.thrust&&t.air){t.air=0;const rear=allies(s,target).filter(v=>depth(s,v)>depth(s,target));
        const v=nearest(s,rear,target);say(engine,target,'背後へ空気が抜けた。');if(v)cast(target,[v],'slime_bump');}break;
    case 'porter':
      if(!target.hp&&!t.spent&&t.link){t.spent=true;delete t.link;
        say(engine,target,'回復壺が割れた。');cast(target,inRow(s,[...party(s),...allies(s,target)],depth(s,target)),'slime_cure');}break;
    case 'gem':if(hit.blunt&&t.phase==='core'){delete t.phase;say(engine,target,'核を打たれ、詠唱が途切れた。');}break;
    case 'pot':
      if(hit.blunt&&t.phase&&target.hp>0){const potion=t.phase;delete t.phase;say(engine,target,'釜がひっくり返った。');
        cast(target,[target],potion==='red'?target.classSkill:'slime_cure');}break;
    case 'abyss':
      if(hit.heavy&&t.relic){(t.lost??=[]).push(t.relic);say(engine,target,t.relic+'が体外へ弾き出された。');delete t.relic;}break;
  }
}

export function slimeMoved(engine,unit,old,row){
  const s=engine.state,f=s.battle?.familyField;
  if(!f||old===row)return;
  if(f.beads?.[row]){delete f.beads[row];applyStun(engine,unit,{count:1});s.battle.log.push('足元の粒で滑った。');}
  if(!unit.instance||row>=old)return;
  for(const u of allies(s,unit)){
    if(kind(u)!=='thread'||u.tactics?.link!==unit.instance)continue;
    delete u.tactics.link;moveTo(engine,u,Math.max(0,depth(s,u)+row-old));
  }
}
export function slimeInitiative(s,u){
  if(!s.battle?.familyField)return 0;
  if(kind(u)==='stones')return (u.tactics.shots??0)*3;
  return !u.instance&&s.battle.enemies.some(e=>e.hp>0&&kind(e)==='sticky'&&e.tactics?.stuck===u.id)?-1000:0;
}
export function oilBurnout(engine,u){
  if(!isOil(u)||!hasActiveStatus(engine.data,engine.state,u,'ablaze'))return;
  u.hp=0;say(engine,u,'巡の終わりに燃え尽きた。');recordDefeated(engine);
}

export function slimeSaveValid(state,u,field){
  const t=u.tactics, units=state.battle.enemies;
  const sameBattle=id=>units.some(e=>e?.instance===id&&e!==u);
  const inRange=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
  if(t.foam!==undefined&&typeof t.foam!=='boolean')return false;
  if(!kind(u))return true;
  if(['open','spent','nextGreen'].some(k=>t[k]!==undefined&&typeof t[k]!=='boolean'))return false;
  if(t.link!==undefined&&!sameBattle(t.link)||t.stuck!==undefined&&!state.members.includes(t.stuck))return false;
  const phases={drop:['stretch'],mochi:['flat','floor'],iron:['bare'],wick:['wax'],mirror:['mirror'],gem:['core'],pot:['red','green'],falls:['lean','puddle']};
  if(t.phase!==undefined&&!phases[kind(u)]?.includes(t.phase))return false;
  for(const [key,max] of [['shots',3],['air',2],['row',2],['shellRow',2],['cycle',2]])if(t[key]!==undefined&&!inRange(t[key],max))return false;
  if(t.relic!==undefined&&!relics.includes(t.relic))return false;
  if(t.lost!==undefined&&(!Array.isArray(t.lost)||new Set(t.lost).size!==t.lost.length||t.lost.some(x=>!relics.includes(x)||x===t.relic)))return false;
  if(t.half!==undefined||t.twin!==undefined){
    if(kind(u)!=='twins'||!['front','rear'].includes(t.half))return false;
    const other=units.find(v=>v?.instance===t.twin&&v!==u);
    if(!other||other.id!==u.id||other.tactics?.twin!==u.instance||other.tactics.half===t.half)return false;
    const parent=t.half==='front'?u:other,child=t.half==='rear'?u:other;
    const joins=state.battle.reinforcements??[],initialCount=units.length-joins.length;
    if(joins[units.indexOf(child)-initialCount]?.caller!==parent.instance)return false;
  }
  return field.beads===undefined||field.beads!==null&&typeof field.beads==='object'&&!Array.isArray(field.beads)&&Object.entries(field.beads).every(([r,v])=>['0','1','2'].includes(r)&&v===true);
}
