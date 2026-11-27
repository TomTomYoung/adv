import {battleAlive} from './frontline-lifecycle.js';
import {depth,moveTo,profession,tactics,living} from './monster-family-field.js';
import {feigning,reviveBones,sealBones} from './feigned-death.js';
import {applyStun} from './battle-turns.js';
import {unitKey} from './buffs.js';
import {summonPatrol} from './battle-reinforcements.js';

const skeleton=u=>u?.family==='skeleton';
const disturbed=u=>u.tactics?.lostShield||u.tactics?.lostHead||u.tactics?.ribs>0||u.tactics?.looseArm;
function place(s,u){
  const b=s.battle,key=unitKey(u);
  if(b.frontline){const {lane,depth}=b.frontline.positions[key];return lane+','+depth;}
  if(b.grid){const {x,y}=b.grid.positions[key];return x+','+y;}
  return String(depth(s,u));
}
export function skeletonInterrupted(u){
  if(!skeleton(u))return;
  const t=tactics(u);
  for(const k of ['hook','holding','mark','ready','notes'])delete t[k];
}
export function skeletonGuardBroken(engine,u){
  if(!skeleton(u))return;
  const t=tactics(u),role=profession(u);
  if(role==='buckler')t.lostShield=true;
  if(role==='rustwall'){
    const mate=engine.state.battle.enemies.find(e=>e.hp>0&&depth(engine.state,e)>depth(engine.state,u));
    if(mate&&applyStun(engine,mate,{count:1}))engine.state.battle.log.push(mate.name+'も錆盾につまずいた。');
  }
  skeletonInterrupted(u);
}
export function skeletonCover(s,target,skill){
  if(target?.hp<=0||skill.target!=='enemy'||!skill.effects.some(e=>e.type==='damage'))return;
  const front=s.battle.mode==='frontline'?skill.frontlineTargeting:skill.targeting;
  if(front&&front.area.shape!=='single')return;
  return s.battle.enemies.find(u=>skeleton(u)&&u!==target&&battleAlive(s,u)&&u.guard&&
    !(s.battle.stuns?.[unitKey(u)]>0)&&
    (profession(u)==='royalguard'?target.tactics?.wearsCrown:
    ['rustwall','bullshield'].includes(profession(u))&&depth(s,u)<=depth(s,target)));
}
export function skeletonAfterDamage(engine,target){
  if(!skeleton(target))return;
  const t=tactics(target);
  if(profession(target)==='musician')delete t.notes;
  if(target.hp>0)return;
  skeletonInterrupted(target);
}
export function settleSkeletonCrown(engine){
  const b=engine.state.battle,target=b.enemies.find(u=>feigning(u)&&u.tactics?.wearsCrown);
  if(!target)return;
  const t=tactics(target);
  // Never transfer the crown when the whole formation has fallen.
  if(!t.wearsCrown||b.enemies.some(u=>u.tactics?.passedCrown)||!b.enemies.some(u=>battleAlive(engine.state,u)))return;
  const heir=b.enemies.find(u=>u!==target&&skeleton(u)&&feigning(u));
  if(heir&&reviveBones(engine,heir)){
    t.passedCrown=true;delete t.wearsCrown;tactics(heir).wearsCrown=true;
    b.log.push('王冠が転がり、'+heir.name+'へ移った。');
  }
}
export function skeletonTurn(engine,e,cast){
  const s=engine.state,b=s.battle,t=tactics(e),role=profession(e);
  const foes=living(s,s.members.map(id=>s.actors[id])).sort((a,c)=>depth(s,a)-depth(s,c));
  if(!foes.length)return;
  const allies=living(s,b.enemies).filter(u=>u!==e), fallen=b.enemies.filter(feigning);
  const front=foes[0],back=foes.at(-1),weak=foes.reduce((a,c)=>a.hp<c.hp?a:c);
  const hit=(who=front,id='attack',source=e)=>{if(who?.hp>0)cast(source,[who],id);};
  const special=(who=front)=>hit(who,e.classSkill);
  const guard=()=>hit(e,'guard');
  const say=words=>b.log.push(e.name+'は'+words+'。');
  const pull=u=>moveTo(engine,u,0);
  switch(role){
    case 'blades':
      if(t.looseArm){delete t.looseArm;return special();}
      hit();if(engine.random()<0.35){t.looseArm=true;say('剣ごと抜けた腕を逆手に持った');}return;
    case 'buckler':return t.lostShield||b.round%2===0?hit():guard();
    case 'ribbow':t.ribs=Math.min(3,(t.ribs??0)+1);return special(back);
    case 'skullshot':
      if(t.lostHead){hit();delete t.lostHead;say('頭を拾い直した');return;}
      special(back);t.lostHead=true;return;
    case 'collector':{
      const mate=allies.find(disturbed);
      if(!mate)return hit();
      for(const key of ['lostShield','lostHead','ribs','looseArm'])delete mate.tactics[key];
      say(mate.name+'の骨を拾い直した');return;
    }
    case 'rustwall':return b.round%3===0?hit():guard();
    case 'chainpull':
      if(t.hook){const victim=foes.find(a=>a.id===t.hook);delete t.hook;if(victim){special(victim);if(victim.hp>0)pull(victim);}return;}
      t.hook=back.id;say(engine.data.actors[back.id].name+'に鎖をかけた');return;
    case 'rustpike':return allies.some(u=>u.guard&&depth(s,u)<depth(s,e))?special():hit();
    case 'headless':return special(foes.find(u=>u.id===b.familyField.lastMover)??front);
    case 'keyring':if(!summonPatrol(engine,e))guard();return;
    case 'remnant':return special(weak);
    case 'coffin':case 'lantern':
      if(t.holding){const u=fallen.find(v=>v.instance===t.holding);delete t.holding;if(u){reviveBones(engine,u);return;}}
      if(fallen.length){t.holding=fallen[0].instance;say(fallen[0].name+(role==='coffin'?'を棺に収めた':'を青い灯で照らした'));return;}
      return hit();
    case 'stitcher':
      if(fallen.length>=2&&reviveBones(engine,fallen[0])){
        sealBones(engine,fallen[1]);fallen[0].hp=fallen[0].stats.hp;tactics(fallen[0]).stitched=true;say('二体分の骨を継ぎ合わせた');return;
      }return hit();
    case 'bell':{
      const u=fallen.find(v=>v.tactics?.bellRound!==v.reviveRound);
      if(!u)return hit();
      tactics(u).bellRound=u.reviveRound;say(u.name+'の腕を鐘で動かした');
      if(profession(u)==='chainpull')pull(back);
      const ranged=['ribbow','skullshot','wingbow'].includes(profession(u));
      hit(ranged?back:front,ranged?u.classSkill:e.classSkill);return;
    }
    case 'fourarms':
      for(let i=0;i<Math.ceil(4*e.hp/e.stats.hp)&&front.hp>0&&e.hp>0;i++)special();return;
    case 'centipede':
      if(!t.ready){t.ready=true;say('長い胴を縮めた');return;}
      delete t.ready;return cast(e,[...new Set(foes.map(u=>depth(s,u)))].map(row=>foes.find(u=>depth(s,u)===row)),e.classSkill);
    case 'bullshield':
      if(!t.ready){t.ready=true;return guard();}
      delete t.ready;hit(front);if(front.hp>0)moveTo(engine,front,Math.min(2,depth(s,front)+1));return;
    case 'wingbow':
      if(t.ready){delete t.ready;moveTo(engine,e,depth(s,e)===2?0:2);return;}
      t.ready=true;return special(back);
    case 'twoheads':
      if(!t.ready){t.ready=true;say((t.iceHead&&e.hp>e.stats.hp/2?'青':'赤')+'い眼窩を光らせた');return;}
      delete t.ready;hit(back,t.iceHead&&e.hp>e.stats.hp/2?'skeleton_frost':e.classSkill);t.iceHead=!t.iceHead;return;
    case 'royalguard':return allies.some(u=>u.tactics?.wearsCrown)?guard():hit();
    case 'standard':
      if(!t.ready){t.ready=true;say('黒旗を掲げた');return;}
      delete t.ready;for(const u of [e,...allies].filter(u=>skeleton(u)&&depth(s,u)===depth(s,e)))moveTo(engine,u,Math.max(0,depth(s,u)-1));return;
    case 'musician':{
      t.notes=(t.notes??0)+1;say('肋骨を叩いた（'+t.notes+'/3）');
      if(t.notes===3){delete t.notes;const guard=allies.find(u=>profession(u)==='royalguard');if(guard)hit(front,'attack',guard);}
      return;
    }
    case 'headsman':
      if(!t.mark){t.mark={actor:weak.id,place:place(s,weak)};say(engine.data.actors[weak.id].name+'の足元に処刑の印を刻んだ');return;}
      {const victim=foes.find(u=>place(s,u)===t.mark.place);delete t.mark;if(victim)special(victim);else say('印の上を空振りした');return;}
    case 'crowned':return special(weak);
  }
}
