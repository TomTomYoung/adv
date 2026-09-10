import {freshRecords,snapshotRecords} from './records.js';
import {clone,evaluate,getPath,setPath,random} from './expression.js';
import {startBattle,battleAction} from './battle.js';
import {runScript,advanceScript,chooseOption,pump} from './script.js';
import {validateSave,migrateSave} from './save.js';
import {freshFeedback,beginFeedback,playCue} from './feedback.js';
import {actorStats,initializeJob,recordGrowth,knownSkills,canEquip,changeJob,fieldAction,partyEffect,purchasePrice} from './jobs.js';
export const DIRECTIONS=['north','east','south','west'];
export const DELTAS=[[0,-1],[1,0],[0,1],[-1,0]];

export class GameEngine {
  constructor(data, seed = 20260909) {
    this.data=data;this.feedback=freshFeedback();
    this.state={version:1,gameId:data.game.id,contentVersion:data.game.version,rng:(seed>>>0)||1,mode:'town',location:null,flags:{},vars:{},records:freshRecords(),gold:data.game.initial.gold,xp:0,level:1,steps:0,light:data.system.lightCapacity,members:clone(data.game.initial.members),actors:{},inventory:clone(data.game.initial.inventory),quests:{},objects:{},events:{},discovered:{},journal:[],log:[],vm:[],waiting:null,battle:null,trackedQuest:null,ending:null,presentation:{background:'corridor',music:'exploration'},notice:''};
    for(const actor of Object.values(data.actors)) this.state.actors[actor.id]={id:actor.id,hp:actor.stats.hp,mp:actor.stats.mp,statuses:[],equipment:{}};
    if(data.jobs)for(const actor of Object.values(this.state.actors)){initializeJob(data,actor);const stats=actorStats(data,this.state,actor.id,false);actor.hp=stats.hp;actor.mp=stats.mp;}
    for(const quest of Object.values(data.quests)) this.state.quests[quest.id]={stage:'available',evidence:[],outcome:null};
    this.state.nextScope=1;
    this.run(data.game.startScript);
  }
  cue(id,targets){playCue(this,id,targets);}
  eventCue(event,targets){this.cue(this.data.presentation?.bindings.events[event],targets);}
  context(extra={}) {return {...this.state,local:this.state.vm.at(-1)?.local??{},...extra};}
  value(value,extra={}) {return evaluate(value,this.context(extra));}
  random(){return random(this.state);}
  log(text){this.state.log.push(String(text));this.state.log=this.state.log.slice(-80);}
  notify(text){this.state.notice=text;this.log(text);}
  run(id,args={}){runScript(this,id,args);}
  stats(id) {return actorStats(this.data,this.state,id);}
  skills(id) {return knownSkills(this.data,this.state,id);}
  changeJob(id,job) {return changeJob(this,id,job);}
  jobAction(id,ability) {return fieldAction(this,id,ability);}
  partyEffect(key,neutral=1,mode='min') {return partyEffect(this.data,this.state,key,neutral,mode);}
  price(price) {return purchasePrice(this.data,this.state,price);}
  trapContext() {
    return this.state.vm.some(f=>this.data.maps[f.local?.args?.map]?.objects.some(o=>o.id===f.local?.args?.object&&o.kind==='trap'));
  }
  healAll(ratio=1) {
    for(const id of this.state.members){const actor=this.state.actors[id],stats=this.stats(id);actor.hp=Math.max(actor.hp,Math.ceil(stats.hp*ratio));actor.mp=Math.max(actor.mp,Math.ceil(stats.mp*ratio));actor.statuses=[];}
  }
  award(gold,xp){
    this.state.gold=Math.max(0,this.state.gold+gold);this.state.xp+=xp;
    const old=this.state.level;
    while(this.state.level<this.data.system.maxLevel && this.state.xp>=this.data.system.xpBase*this.state.level*(this.state.level+1)) this.state.level++;
    if(old!==this.state.level){recordGrowth(this.data,this.state,this.state.level-old);this.healAll();this.notify(`隊のレベルが${this.state.level}になりました。`);}
  }
  unlocked(quest){return !quest.requires || Boolean(this.value(quest.requires));}
  give(item,count){
    if(!this.data.items[item]) throw new Error(`不明な道具: ${item}`);
    const next=(this.state.inventory[item]??0)+count;
    if(next<0) throw new Error('所持数が足りません');
    this.state.inventory[item]=Math.min(this.data.system.maxStack,next);
  }
  accept(id){
    const q=this.data.quests[id];if(!q||!this.unlocked(q))return false;
    const qs=this.state.quests[id];if(qs.stage==='completed')return false;
    if(qs.stage==='available')this.state.records.baselines[id]=snapshotRecords(this.state.records);
    qs.stage='active';this.state.trackedQuest=id;
    this.notify(`依頼「${q.title}」を手帳に記しました。`);return true;
  }
  complete(id,outcome){
    const q=this.data.quests[id],qs=this.state.quests[id];
    if(qs.stage!=='active')throw new Error(`受注していない依頼です: ${id}`);
    const ending=q.outcomes[outcome];if(!ending)throw new Error(`不明な結末: ${id}/${outcome}`);
    if(ending.requires!==undefined&&!this.value(ending.requires))throw new Error(`結末の条件を満たしていません: ${id}/${outcome}`);
    qs.stage='completed';qs.outcome=outcome;
    this.state.vars.completed=(this.state.vars.completed??0)+1;
    const key=`region_${q.region}`;this.state.vars[key]=(this.state.vars[key]??0)+1;
    this.award(ending.gold,ending.xp);this.eventCue('complete');
    this.state.journal.push({quest:id,title:q.title,type:'outcome',text:ending.text});
    this.notify(`依頼完了：${q.title} / ${ending.label}（${ending.gold}G・${ending.xp}EXP）`);
  }
  evidence(id,key,text){
    const qs=this.state.quests[id];if(qs.stage!=='active')return;
    if(!qs.evidence.includes(key)){qs.evidence.push(key);this.state.journal.push({quest:id,title:this.data.quests[id].title,type:'evidence',key,text});}
  }
  map(){return this.data.maps[this.state.location?.map];}
  objectState(object){return this.state.objects[`${this.map().id}/${object.id}`]??object.initialState??'ready';}
  objectAt(x,y){return this.map()?.objects.filter(o=>o.x===x&&o.y===y)??[];}
  walkable(map,x,y){
    if(!map||y<0||y>=map.tiles.length||x<0||x>=map.tiles[0].length||map.tiles[y][x]==='#')return false;
    return !map.objects.some(o=>o.x===x&&o.y===y&&o.blocking && (this.state.objects[`${map.id}/${o.id}`]??o.initialState)!=='open');
  }
  reveal(radius=this.partyEffect('revealRadius',1,'max')){
    const loc=this.state.location;if(!loc)return;
    const seen=new Set(this.state.discovered[loc.map]??[]),map=this.map();
    for(let y=loc.y-radius;y<=loc.y+radius;y++)for(let x=loc.x-radius;x<=loc.x+radius;x++)if(y>=0&&y<map.tiles.length&&x>=0&&x<map.tiles[0].length)seen.add(`${x},${y}`);
    this.state.discovered[loc.map]=[...seen];
  }
  teleport(mapId,x,y,facing='north'){
    const map=this.data.maps[mapId];if(!this.walkable(map,x,y))throw new Error(`移動できない座標: ${mapId} ${x},${y}`);
    this.eventCue(this.state.mode==='town'?'enter':'stairs');
    this.state.mode='dungeon';this.state.location={map:mapId,x,y,facing};this.reveal();
    this.state.presentation.background=map.background;this.state.presentation.music=map.music;
  }
  returnTown(emergency=false,quiet=false){
    if(!quiet)this.eventCue('return');
    if(emergency){const cost=Math.ceil(this.state.gold*this.data.system.retreatGoldRate*this.partyEffect('retreatCost'));this.state.gold-=cost;this.notify(`帰還印で脱出しました。救援費 ${cost}G。依頼と手掛かりは維持されます。`);}
    this.state.mode='town';this.state.location=null;this.state.battle=null;this.state.presentation.music='exploration';
  }
  defeat(){
    this.state.gold=Math.floor(this.state.gold*(1-this.data.system.defeatGoldRate));
    this.state.vm=[];this.state.waiting=null;this.returnTown(false,true);this.eventCue('defeat');this.healAll(this.data.system.recoveryRatio);
    this.notify('隊は救助されました。所持金の一部を救援費に充て、町で目覚めました。依頼は再挑戦できます。');
  }
  move(direction){
    if(this.state.mode!=='dungeon'||this.state.waiting)return false;
    const loc=this.state.location,face=DIRECTIONS.indexOf(loc.facing);
    if(direction==='left'||direction==='right'){loc.facing=DIRECTIONS[(face+(direction==='left'?3:1))%4];return true;}
    if(!['forward','back'].includes(direction))return false;
    const [dx,dy]=DELTAS[(face+(direction==='back'?2:0))%4],x=loc.x+dx,y=loc.y+dy;
    if(!this.walkable(this.map(),x,y)){this.notify('石壁か閉ざされた扉です。正面を調べてください。');this.eventCue('bump');return false;}
    loc.x=x;loc.y=y;this.state.steps++;this.eventCue('step');const saveEvery=this.partyEffect('lightSaveEvery',Infinity);if(!Number.isFinite(saveEvery)||this.state.steps%saveEvery!==0)this.state.light=Math.max(0,this.state.light-1);this.reveal();
    for(const id of this.state.members){const actor=this.state.actors[id];if(actor.hp<=0)continue;for(const status of actor.statuses){const damage=this.data.statuses[status]?.stepDamage??0;actor.hp=Math.max(1,actor.hp-damage);}}
    if(this.state.members.some(id=>this.state.actors[id].statuses.includes('poison')))this.eventCue('field_poison');
    if(this.trigger('enter'))return true;
    const map=this.map();
    if(!this.objectAt(x,y).some(o=>o.safe) && this.state.steps%this.data.system.encounterCheckSteps===0 && this.random()<Math.min(1,(map.encounterRate+(this.state.light===0?this.data.system.darkEncounterBonus:0))*this.partyEffect('encounterRate'))){
      let encounter=map.encounter;
      if(map.encounterPool?.length){let roll=this.random()*map.encounterPool.reduce((sum,e)=>sum+e.weight,0);encounter=map.encounterPool.at(-1).encounter;for(const entry of map.encounterPool){roll-=entry.weight;if(roll<0){encounter=entry.encounter;break;}}}
      this.startBattle(encounter,{win:[],escape:[],lose:[]});
    }
    return true;
  }
  trigger(kind){
    const loc=this.state.location;if(!loc)return false;
    const [dx,dy]=DELTAS[DIRECTIONS.indexOf(loc.facing)];
    const at=this.objectAt(loc.x,loc.y),ahead=kind==='interact'?this.objectAt(loc.x+dx,loc.y+dy):[];
    // Closed doors in front take precedence over a reusable stair/fountain at the feet.
    const blockers=ahead.filter(o=>o.blocking&&this.objectState(o)!=='open');
    for(const object of [...blockers,...at,...ahead.filter(o=>!blockers.includes(o))]){
      if(object.trigger!==kind)continue;
      const key=`${loc.map}/${object.id}`;
      if(object.once&&this.state.events[key])continue;
      if(object.condition&&!this.value(object.condition))continue;
      this.state.events[key]=(this.state.events[key]??0)+1;
      this.cue(this.data.presentation?.bindings.objects[object.kind]);
      this.run(object.script,{object:object.id,map:loc.map});return true;
    }
    return false;
  }
  interact(){if(this.state.mode!=='dungeon'||this.state.waiting)return false;if(!this.trigger('interact'))this.notify('足元と正面を調べました。今は新しい発見はありません。');return true;}
  startBattle(id,continuations){startBattle(this,id,continuations);}
  dispatch(intent){
    beginFeedback(this);const changed=this.perform(intent);
    if(changed)this.cue(this.data.presentation?.bindings.actions[intent.type]);
    return changed;
  }
  perform(intent){
    const type=intent?.type;if(typeof type!=='string')return false;
    this.state.notice='';
    if(type==='advance')return advanceScript(this);
    if(type==='choose')return chooseOption(this,intent.id);
    if(type==='battle')return battleAction(this,intent);
    if(this.state.waiting||this.state.battle)return false;
    if(type==='move')return this.move(intent.direction);
    if(type==='interact')return this.interact();
    if(type==='retreat'&&this.state.mode==='dungeon'){this.returnTown(true);return true;}
    if(type==='accept'&&this.state.mode==='town')return this.accept(intent.id);
    if(type==='track'&&this.state.quests[intent.id]?.stage==='active'){this.state.trackedQuest=intent.id;return true;}
    if(type==='travel'&&this.state.mode==='town'){
      const region=this.data.regions.find(r=>r.id===intent.region);if(!region)return false;
      this.state.light=this.data.system.lightCapacity;
      const start=this.data.maps[region.entrance].entrance;this.teleport(region.entrance,start.x,start.y,start.facing);return true;
    }
    if(type==='service'&&this.state.mode==='town'){
      const service=this.data.game.services.find(s=>s.id===intent.id);if(!service)return false;this.run(service.script);return true;
    }
    if(type==='job.change')return this.changeJob(intent.actor,intent.job);
    if(type==='job.action')return this.jobAction(intent.actor,intent.ability);
    if(type==='party')return this.changeParty(intent.action,intent.actor,intent.replace);
    if(type==='unequip')return this.unequip(intent.actor,intent.slot);
    if(type==='buy'&&this.state.mode==='town'){
      const stock=this.data.shops.goods.find(g=>g.item===intent.item);if(!stock||this.state.gold<this.price(stock.price)||(this.state.inventory[intent.item]??0)>=this.data.system.maxStack)return false;
      this.state.gold-=this.price(stock.price);this.give(stock.item,1);this.notify(`${this.data.items[stock.item].name}を購入しました。`);return true;
    }
    if(type==='equip')return this.equip(intent.actor,intent.item);
    if(type==='item')return this.useItem(intent.item,intent.actor);
    return false;
  }
  equip(actorId,itemId){
    const item=this.data.items[itemId],actor=this.state.actors[actorId];
    if(!this.state.members.includes(actorId)||!canEquip(this.data,this.state,actorId,itemId)||!item?.slot||!(this.state.inventory[itemId]>0)||!actor||actor.hp<=0)return false;
    const previous=actor.equipment[item.slot];if(previous&&previous!==itemId&&(this.state.inventory[previous]??0)>=this.data.system.maxStack)return false;
    this.give(itemId,-1);if(previous)this.give(previous,1);actor.equipment[item.slot]=itemId;
    const stats=this.stats(actorId);actor.hp=Math.min(actor.hp,stats.hp);actor.mp=Math.min(actor.mp,stats.mp);return true;
  }
  changeParty(action,actorId,replaceId){
    const s=this.state;if(s.mode!=='town'||s.waiting||s.battle||!this.data.game.tavern?.candidates.includes(actorId))return false;
    const next=[...s.members],at=next.indexOf(actorId);
    if(action==='join'){if(at!==-1||next.length>=this.data.system.maxParty)return false;next.push(actorId);}
    else if(action==='leave'){if(at===-1||next.length===1)return false;next.splice(at,1);}
    else if(action==='swap'){const replaceAt=next.indexOf(replaceId);if(at!==-1||replaceAt===-1)return false;next[replaceAt]=actorId;}
    else return false;
    if(!next.some(id=>s.actors[id].hp>0))return false;
    s.members=next;this.notify(`${this.data.actors[actorId].name}は${action==='leave'?'帰り火亭で待機します':'隊に加わりました'}。`);return true;
  }
  unequip(actorId,slot){
    const s=this.state,a=s.actors[actorId];if(s.mode!=='town'||s.waiting||s.battle||!a)return false;
    const item=a.equipment[slot];if(!item||(s.inventory[item]??0)>=this.data.system.maxStack)return false;
    delete a.equipment[slot];this.give(item,1);const stats=this.stats(actorId);a.hp=Math.min(a.hp,stats.hp);a.mp=Math.min(a.mp,stats.mp);return true;
  }
  useItem(itemId,actorId){
    const item=this.data.items[itemId];if(!item||!item.field||!(this.state.inventory[itemId]>0)||!this.state.members.includes(actorId))return false;
    this.give(itemId,-1);this.eventCue('item');this.run(item.script,{target:actorId});return true;
  }
  save(){return JSON.stringify({saveVersion:1,gameId:this.data.game.id,contentVersion:this.data.game.version,state:clone(this.state)});}
  load(text){
    if(typeof text!=='string'||text.length>this.data.system.maxSaveBytes)throw new Error('セーブのサイズが不正です');
    const save=migrateSave(JSON.parse(text),this.data),errors=validateSave(save,this.data);
    if(errors.length)throw new Error(`セーブを読み込めません：${errors.join(' / ')}`);
    this.state=clone(save.state);this.feedback=freshFeedback();return true;
  }
}
