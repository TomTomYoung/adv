import {battleAlive} from './frontline-lifecycle.js';
import {statusControl,rollActionStatus} from './status-effects.js';
import {chooseHerbalistMedicine} from './medicines.js';
import {goblinTrap} from './battle-traps.js';
import {applyGuard,guarded,stunned} from './battle-turns.js';
import {unitKey} from './buffs.js';
import {breakDefense,depth,familyAfterMove,label,living,moveTo,profession,recordFamilyDeaths,tactics,weakest} from './monster-family-field.js';

// A class turn uses the ordinary damage, status, cue and reward pipeline. Only
// target selection, cooperation and the class's persistent commitments live here.
export function familyTurn(engine,e,{cast,order},bonus=false) {
  const s=engine.state,b=s.battle,f=b.familyField,t=tactics(e),job=profession(e);
  const foes=living(s,s.members.map(id=>s.actors[id])),all=living(s,b.enemies),mates=all.filter(u=>u!==e);
  if (!foes.length) return;
  const byDepth=(a,c)=>depth(s,a)-depth(s,c);
  const front=[...foes].sort(byDepth)[0], back=[...foes].sort(byDepth).at(-1);
  const enemyById=id=>foes.find(v=>v.id===id);
  const mate=job=>mates.find(u=>profession(u)===job);
  const random=foes[Math.floor(engine.random()*foes.length)];
  const focuser=e.family==='goblin'&&enemyById(f.focus);
  const target=focuser||random;
  const say=msg=>b.log.push(e.name+'：'+msg);
  const use=(units,skill=e.classSkill,who=e)=>{
    const list=(Array.isArray(units)?units:[units]).filter(u=>u&&u.hp>0);
    if (list.length) return cast(who,list,skill);
  };
  const attack=(u=target)=>use(u,'attack');
  const signal=()=>{say(engine.data.skills[e.classSkill].name);use(e);};
  const row=d=>foes.filter(u=>depth(s,u)===d);
  const nextRank=(u,r)=>{
    const old=depth(s,u);
    if (moveTo(engine,u,r)) familyAfterMove(engine,u,old,(hunter,victim)=>use(victim,'attack',hunter));
  };
  const cover=u=>{
    if (!u||u===e||t.cover===u.instance) return attack();
    t.cover=u.instance; say(u.name+'をかばう。'); use(u);
  };
  const ready=(wait=1,d=depth(s,front))=>{
    if (!t.windup) t.windup={left:wait,row:d};
    if (t.windup.left>0) {
      t.windup.left--;
      say(['前列','中列','後列'][t.windup.row]+'へ構える。'+(wait===2?'予鈴。':''));
      return null;
    }
    const r=t.windup.row;delete t.windup;return r;
  };
  const nominate=()=>mates.find(u=>!['king','herald','marshal','steward'].includes(profession(u)))??mates[0];
  const command=u=>{
    if (!u||bonus) return attack();
    say(u.name+'に号令。');order(u);
  };
  const corpse=()=>f.deaths.map(id=>b.enemies.find(u=>u.instance===id)).find(u=>u&&u!==e&&!t.honored?.includes(u.instance));
  const honor=u=>(t.honored??=[]).push(u.instance);
  const inheritedSkill=u=>{
    if (u.tactics?.lastSpecial) return u.tactics.lastSpecial;
    if (engine.data.skills[u.classSkill]?.effects.some(effect=>effect.type==='damage')) return u.classSkill;
    return u.tactics?.lastAttack??'attack';
  };
  recordFamilyDeaths(engine);
  if (t.clay) {
    const doctor=all.find(u=>u.instance===t.clay);
    delete t.clay;
    if (doctor) {say('薬泥の中で一手休んだ。');use(e,doctor.classSkill,doctor);return;}
  }
  if (t.rest) {delete t.rest;say('起き上がった。');return;}
  if (f.bridge&&f.bridge!==e.instance) {delete f.bridge;attack(back);return;}
  if (focuser&&e.instance!==f.piper) {delete f.focus;if(job==='slinger')use(focuser);else attack(focuser);return;}
  if (f.crown===e.instance&&job!=='king'&&!bonus&&b.round%2===1) return command(nominate());
  switch(job) {
    case 'slinger': return use(back);
    case 'trapper': {
      const trap=goblinTrap(engine,e,all,foes);
      return trap?use(trap.target,trap.id):use(target);
    }
    case 'dagger': return use(enemyById(f.lastVictim)??target);
    case 'herbalist': {
      if(t.spent)return attack();
      const dose=chooseHerbalistMedicine(engine,e,all);
      if(!dose)return attack();
      if(use(dose.target,dose.id))t.spent=true;
      return;
    }
    case 'cook': {
      const u=weakest(all);
      if (!t.spent&&u.hp<u.stats.hp) {t.spent=true;use(u);if(job==='cook')applyGuard(b,e);return;}
      return attack();
    }
    case 'piper': {
      const rats=mates.filter(u=>['plague_rat','kagaribi_soot_rat'].includes(engine.data.enemies[u.id].species??u.id));
      if((engine.data.enemies[e.id].level??e.levelBand)>=12 && rats.length){
        if(!use(e,'hamelin'))return;
        say('ハーメルン！ '+label(engine,target)+'を狙え。');
        for(const rat of rats){
          if(!battleAlive(s,target)||!battleAlive(s,e))break;
          if(!battleAlive(s,rat)||stunned(b,rat)||statusControl(engine.data,s,rat)||rollActionStatus(engine,rat,'actionFailureChance'))continue;
          const species=engine.data.enemies[rat.id].species??rat.id;
          use(target,species==='plague_rat'?'plague_bite':'attack',rat);
        }
        return;
      }
      f.focus=target.id;f.piper=e.instance;return signal();
    }
    case 'cleaver':
    case 'stoker':
    case 'hex':
      if (!t.windup) t.mark=target.id;
      if (ready()!==null) use(enemyById(t.mark)??target);
      return;
    case 'hunter': return use(target);
    case 'drummer':
    case 'smith': return mates.length?use(mates.find(u=>u.stats.str===Math.max(...mates.map(v=>v.stats.str)))):attack();
    case 'diviner': f.omen=target.id;return signal();
    case 'club':
    case 'ram':
    case 'summit':
    case 'avalanche':
    case 'mountainking':
    case 'charger': {
      const d=ready(1,depth(s,job==='avalanche'?back:front));
      if (d===null) {if(job==='charger')t.rage=3;return;}
      const victims=row(d);
      if (job==='ram') victims.forEach(u=>breakDefense(engine,u));
      use(victims);
      if(job==='charger')t.rage=0;
      return;
    }
    case 'rock':
    case 'cart':
      if(t.spent)return attack(job==='cart'?back:target);
      t.spent=true;return use(job==='rock'?back:front);
    case 'gate':
    case 'shield':
    case 'warden': return cover([...mates].sort(byDepth).at(-1));
    case 'wrestler':
      use(front);if(front.hp>0)nextRank(front,Math.min(2,depth(s,front)+1));moveTo(engine,e,0);return;
    case 'bell':
    case 'greatbell':
      if(ready(job==='greatbell'?2:1)!==null)use(foes.filter(u=>job==='bell'||!guarded(b,u)));
      return;
    case 'spear':return use(front);
    case 'standard':
      if(t.flag)return attack();
      t.flag=true;return signal();
    case 'sergeant': {
      const u=mates.find(u=>depth(s,u)!==tactics(u).home);
      if(!u)return attack();moveTo(engine,u,u.tactics.home);return signal();
    }
    case 'engineer': {
      const spear=mate('spear');
      if (!spear||t.spent)return attack();
      t.spent=true;cover(spear);use(front,spear.classSkill,spear);return;
    }
    case 'shieldsmith': {
      const u=mates.find(u=>u.tactics?.spent&&!u.tactics?.cover&&['double','engineer','cook','gate','shield'].includes(profession(u)))??mates.find(u=>!u.tactics?.cover);
      if(!u)return attack();
      tactics(u).cover=(mates.find(v=>v!==u)??e).instance;
      applyGuard(b,u);return signal();
    }
    case 'charcoal':
      if(f.smokeUntil>=b.round)return attack();
      f.smokeUntil=b.round+1;return signal();
    case 'quarry': {
      const u=enemyById(t.mark)??front;
      if(t.mark===u.id){breakDefense(engine,u);delete t.mark;return use(u);}
      t.mark=u.id;return attack(u);
    }
    case 'roller':t.rest=true;return use(row(depth(s,front)));
    case 'wall':
      if(t.wall!==undefined)return attack();
      t.wall=depth(s,weakest(mates)??e);say('石壁を築いた。');return use(weakest(mates)??e);
    case 'statue':t.watching=true;return signal();
    case 'flute': {
      const u=mates.find(v=>v.tactics?.rest);
      if(!u)return attack();delete u.tactics.rest;say(u.name+'が跳ね起きた。');return signal();
    }
    case 'snuffer':
      if(f.darkUntil!==undefined&&b.round<=f.darkUntil+1)return attack();
      f.darkUntil=b.round+1;return signal();
    case 'firefly':
      if(enemyById(f.firefly))return attack(enemyById(f.firefly));f.firefly=target.id;return signal();
    case 'shadow':return f.darkUntil+1===b.round?use(target):attack();
    case 'thief':return f.darkUntil>=b.round?use(back):attack();
    case 'owl':
      if(f.owl)return attack();f.owl=(weakest(mates)??e).instance;return signal();
    case 'mud':f.mud[depth(s,front)]=b.round+2;return use(row(depth(s,front)));
    case 'harpoon':
      if(use(back)?.some(hit=>hit.blocked))return;
      if(back.hp>0){nextRank(back,0);if(f.mud[0]>=b.round){const m=mate('mud');if(m)use(back,m.classSkill,m);}}return;
    case 'hound': {
      const u=foes.find(v=>f.mud[depth(s,v)]>=b.round);
      return u?use(u):attack();
    }
    case 'ferry': {
      const u=weakest(mates);
      if(!u)return attack();nextRank(u,depth(s,u)===0?2:0);return signal();
    }
    case 'doctor': {
      const u=weakest(all);
      if(u.hp===u.stats.hp||tactics(u).clay)return attack();
      tactics(u).clay=e.instance;say(u.name+'を薬泥で包んだ。');return;
    }
    case 'brawler':
    case 'firewalker': use(target);t.rage=0;return;
    case 'breaker': {
      const u=foes.find(v=>guarded(b,v));
      if(!u)return attack();breakDefense(engine,u);use(u);t.rage=0;return;
    }
    case 'peacemaker': {
      const u=[...all].filter(v=>v.tactics?.rage>0&&v.hp<v.stats.hp).sort((a,c)=>c.tactics.rage-a.tactics.rage)[0];
      if(!u)return attack();const rage=u.tactics.rage;u.tactics.rage=0;
      use(u);u.hp=Math.min(u.stats.hp,u.hp+Math.ceil(u.stats.hp*rage/12));return;
    }
    case 'heavyshield': {
      const u=[...mates].sort(byDepth).at(-1);
      if(!u)return attack();const old=depth(s,e);moveTo(engine,e,depth(s,u));moveTo(engine,u,old);return cover(u);
    }
    case 'double':
      if(t.spent||!mates.length)return attack();t.spent=true;return cover(weakest(mates));
    case 'chain':
      if(foes.length<2||f.chain)return attack();f.chain=[unitKey(front),unitKey(foes.find(v=>v!==front))];return signal();
    case 'maskmaker': {
      const u=mate('double');
      if(!u?.tactics?.spent||u.tactics.cover)return attack();delete u.tactics.spent;return signal();
    }
    case 'cadence':for(const u of all)moveTo(engine,u,2-depth(s,u));return signal();
    case 'greatshield':
      if(t.wall!==undefined)return attack();t.wall=depth(s,e);return signal();
    case 'axe': {
      const u=foes.find(v=>f.broken[unitKey(v)]>=b.round);
      if(!u)return use(target);use(u);if(u.hp>0)use(u);return;
    }
    case 'armorer': {
      const u=all.find(v=>f.broken[unitKey(v)]>=b.round)??weakest(mates.filter(v=>!b.buffs.some(entry=>entry.target===unitKey(v)&&entry.id==='mine_vein_ward')));
      if(!u)return attack();
      delete f.broken[unitKey(u)];return use(u);
    }
    case 'marshal': {
      const at=b.turnQueue?.findIndex((key,i)=>i>=b.turnIndex&&mates.some(u=>unitKey(u)===key));
      if(bonus||at===undefined||at<0)return attack();
      const [key]=b.turnQueue.splice(at,1);return command(mates.find(u=>unitKey(u)===key));
    }
    case 'twinclubs':return use(target);
    case 'quarrel': // The ash thrower retains the original class ID for saved battles.
      if (t.spent) return attack();
      t.spent = true;
      return use(row(depth(s, front)));
    case 'singer':
      if(!all.some(u=>u.hp<u.stats.hp))return attack();
      if(ready()!==null)use(all);return;
    case 'king':
      f.ordered=nominate()?.instance;f.orderRound=b.round;return command(nominate());
    case 'guard':return cover(all.find(v=>v.instance===(f.falseUntil>=b.round?f.falseCrown:f.crown))??e);
    case 'herald': {
      const u=mates.find(v=>v.instance!==f.ordered&&!['king','herald'].includes(profession(v)));
      if(!f.ordered||f.orderRound!==b.round||t.echo===b.round)return attack();
      t.echo=b.round;return command(u);
    }
    case 'jester':
      if(f.falseUntil>=b.round)return attack();f.falseCrown=e.instance;f.falseUntil=b.round;return signal();
    case 'steward': {
      if(all.some(u=>u.instance===f.crown))return attack();
      const u=nominate()??e;f.crown=u.instance;say(u.name+'に王冠を渡した。');return signal();
    }
    case 'bonemask': {
      const dead=f.deaths.map(id=>b.enemies.find(v=>v.instance===id)).find(u=>u&&u!==e);
      return use(target,dead?inheritedSkill(dead):e.classSkill);
    }
    case 'grave': {
      const u=corpse();if(!u)return attack();honor(u);return use(weakest(mates)??e);
    }
    case 'poet':
    case 'spirit': {
      const dead=corpse();if(!dead)return attack();honor(dead);
      const id=inheritedSkill(dead);
      say(dead.name+'の'+engine.data.skills[id].name+'。');return use(target,id,job==='spirit'?dead:e);
    }
    case 'chief':return use(target);
    case 'bridge':
      if(!mates.length||f.bridge)return attack();f.bridge=e.instance;return signal();
    default:throw Error('未知の魔物職種 '+e.classSkill);
  }
}
