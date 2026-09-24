import {edgeBetween} from './edge-layers.js';
import {collapseAfterLeaving} from './cell-behaviors.js';
import {closeTo} from './systems/common.js';
import {finishInspection} from './inspection.js';
import {openPlayerCommand,advanceCommand,chooseCommand} from './player-commands.js';
import {freshGear,addGear,equipGear,unequipGear} from './equipment.js';
import {connectionMove} from './systems/map-connections.js';
import {compartmentBlocked} from './systems/compartment-water.js';
import {voxelMapState,voxelAt,voxelKey,faceRules,voxelOccupancyReason,enterVoxelMap} from './voxels.js';
import {freshDungeons,enterDungeon,leaveDungeon,stepDungeon,dungeonReplacesLight,dungeonUseItem,dungeonDanger,dungeonEncounter,dungeonAction,dungeonTile,dungeonBlock,dungeonEffectActive,dungeonAbilityReason,dungeonWaterAccess,dungeonCell} from './dungeons.js';
import {setPortableFire} from './systems/fire-network.js';
import {openQuestEvent,objectVisible,objectBlocks} from './quest-events.js';
import {storyEnding,resumeWorldStory} from './story.js';
import {townRoot,townLocation,syncWorldStories} from './world.js';
import {questEntryPlan} from './quest-navigation.js';
import {processFieldEvents,recordFieldEntry} from './field-events.js';
import {freshFieldReactions,signalFieldChange} from './field-signals.js';
import {freshRecords,snapshotRecords} from './records.js';
import {clone,evaluate,getPath,setPath,random} from './expression.js';
import {startBattle,endBattle,battleAction} from './battle.js';
import {runScript,advanceScript,chooseOption,pump} from './script.js';
import {validateSave,migrateSave} from './save.js';
import {freshFeedback,beginFeedback,playCue} from './feedback.js';
import {actorStats,initializeJob,recordGrowth,knownSkills,canEquip,changeJob,fieldAction,partyEffect,purchasePrice} from './jobs.js';
export const DIRECTIONS=['north','east','south','west'];
export const DELTAS=[[0,-1],[1,0],[0,1],[-1,0]];

export class GameEngine {
  constructor(data, seed = 20260909) {
    this.data=data;this.feedback=freshFeedback();
    this.state={version:1,gameId:data.game.id,contentVersion:data.game.version,gear:freshGear(),rng:(seed>>>0)||1,mode:'town',location:null,townLocation:townRoot(data)??null,journey:null,flags:{},vars:{},stories:{},records:freshRecords(),gold:data.game.initial.gold,xp:0,level:1,steps:0,light:data.system.lightCapacity,members:clone(data.game.initial.members),actors:{},inventory:clone(data.game.initial.inventory),quests:{},objects:{},events:{},discovered:{},journal:[],log:[],vm:[],waiting:null,battle:null,trackedQuest:null,ending:null,presentation:{background:'corridor',music:'exploration'},notice:''};
    for(const [item,count] of Object.entries(this.state.inventory))if(data.items[item]?.slot)addGear(this.state,item,count);
    for(const actor of Object.values(data.actors)) this.state.actors[actor.id]={id:actor.id,hp:actor.stats.hp,mp:actor.stats.mp,statuses:[],equipment:{}};
    if(data.jobs)for(const actor of Object.values(this.state.actors)){initializeJob(data,actor);const stats=actorStats(data,this.state,actor.id,false);actor.hp=stats.hp;actor.mp=stats.mp;}
    for(const quest of Object.values(data.quests)) this.state.quests[quest.id]={stage:'available',evidence:[],outcome:null};
    if(data.game.dungeonVersion)this.state.dungeons=freshDungeons();
    this.state.nextScope=1;
    this.state.fieldEntry=null;
    this.state.inspections={};
    this.state.inspectionActive=null;
    this.state.fieldReactions=freshFieldReactions();
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
    const capped=Math.min(this.data.system.maxStack,next);if(this.data.items[item].slot)addGear(this.state,item,capped-(this.state.inventory[item]??0));
    this.state.inventory[item]=capped;
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
    const ending=storyEnding(this,id,outcome);if(!ending)throw new Error(`不明な結末: ${id}/${outcome}`);
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
  objectAt(x,y,z=this.state.location?.z??0){return this.map()?.objects.filter(o=>o.x===x&&o.y===y&&(o.z??0)===z)??[];}
  walkable(map,x,y,z=map?.id===this.state.location?.map?(this.state.location.z??0):0){
    if(compartmentBlocked(this.data,this.state,map?.id))return false;
    if(map?.voxels){const terrain=voxelMapState(this.data,this.state,map);if(voxelOccupancyReason(map,terrain,{x,y,z},{waterAccess:dungeonWaterAccess(this.data,this.state)}))return false;return !map.objects.some(o=>o.x===x&&o.y===y&&(o.z??0)===z&&objectBlocks(this.state,map,o));}
    if(z!==0)return false;
    if(!map||y<0||y>=map.tiles.length||x<0||x>=map.tiles[0].length||dungeonTile(this.data,this.state,map,x,y)!=='.'||dungeonBlock(this.data,this.state,map,x,y))return false;
    return !map.objects.some(o=>o.x===x&&o.y===y&&objectBlocks(this.state,map,o));
  }
  reveal(radius=this.partyEffect('revealRadius',1,'max')){
    const loc=this.state.location;if(!loc)return;
    const seen=new Set(this.state.discovered[loc.map]??[]),map=this.map();
    for(let y=loc.y-radius;y<=loc.y+radius;y++)for(let x=loc.x-radius;x<=loc.x+radius;x++)if(y>=0&&y<map.tiles.length&&x>=0&&x<map.tiles[0].length)seen.add(map.voxels?`${x},${y},${loc.z??0}`:`${x},${y}`);
    this.state.discovered[loc.map]=[...seen];
  }
  teleport(mapId,x,y,facing='north',z=0){
    const map=this.data.maps[mapId];if(!this.walkable(map,x,y,z))throw new Error(`移動できない座標: ${mapId} ${x},${y}`);
    collapseAfterLeaving(this,this.state.location,{map:mapId,x,y});
    this.eventCue(this.state.mode==='town'?'enter':'stairs');
    if(this.state.dungeons?.active&&!this.data.dungeons[this.state.dungeons.active.id]?.maps.includes(mapId))leaveDungeon(this);
    this.state.mode='dungeon';this.state.townLocation=null;this.state.location={map:mapId,x,y,facing,...(map.voxels?{z}: {})};enterDungeon(this,mapId);enterVoxelMap(this.data,this.state,map);this.reveal();syncWorldStories(this);
    this.state.presentation.background=map.background;this.state.presentation.music=map.music;
    recordFieldEntry(this.state);
    signalFieldChange(this.data,this.state,'enter');
  }
  returnTown(emergency=false,quiet=false){
    collapseAfterLeaving(this,this.state.location,null);
    leaveDungeon(this);
    if(!quiet)this.eventCue('return');
    if(emergency){const cost=Math.ceil(this.state.gold*this.data.system.retreatGoldRate*this.partyEffect('retreatCost'));this.state.gold-=cost;this.notify(`帰還印で脱出した。救援費 ${cost}G。依頼と手掛かりは維持される。`);}
    this.state.mode='town';this.state.townLocation=townRoot(this.data)??null;this.state.location=null;this.state.battle=null;this.state.presentation.music='exploration';this.state.presentation.background=townLocation(this.data,this.state)?.background??'corridor';syncWorldStories(this);
    this.state.fieldEntry=null;
    this.state.fieldReactions=freshFieldReactions();
  }
  defeat(){
    this.state.gold=Math.floor(this.state.gold*(1-this.data.system.defeatGoldRate));
    this.state.vm=[];this.state.waiting=null;this.returnTown(false,true);this.eventCue('defeat');this.healAll(this.data.system.recoveryRatio);
    this.notify('隊は救助されました。所持金の一部を救援費に充て、町で目覚めました。依頼は再挑戦できます。');
  }
  move(direction){
    if(this.state.mode!=='dungeon'||this.state.waiting)return false;
    const loc=this.state.location,face=DIRECTIONS.indexOf(loc.facing);
    if(direction==='left'||direction==='right'){loc.facing=DIRECTIONS[(face+(direction==='left'?3:1))%4];syncWorldStories(this);return true;}
    if(!['forward','back'].includes(direction))return false;
    const [dx,dy]=DELTAS[(face+(direction==='back'?2:0))%4],x=loc.x+dx,y=loc.y+dy;
    const connection=connectionMove(this.data,this.state,DIRECTIONS[(face+(direction==='back'?2:0))%4]);
    if(connection)return dungeonAction(this,connection);
    const map=this.map(),point={x,y,z:loc.z??0};
    if(map.voxels){const terrain=voxelMapState(this.data,this.state,map),reason=voxelOccupancyReason(map,terrain,point,{waterAccess:dungeonWaterAccess(this.data,this.state)})||(!faceRules(map,terrain,loc,point).passage?'境界の壁が閉じています。':'');if(reason){this.notify(reason);this.eventCue('bump');return false;}}
    if(!map.voxels&&edgeBetween(this.data,map,loc,point)?.passage==='#'){this.notify('境界が通行を妨げている。');this.eventCue('bump');return false;}
    if(!this.walkable(map,x,y,point.z)){this.notify(dungeonBlock(this.data,this.state,map,x,y)??'ここへは通行できません。正面を調べてください。');this.eventCue('bump');return false;}
    const moved=this.finishMove(point);let expected=point;
    // Every slide crosses real cells and runs the usual entry / battle pipeline.
    for(let remaining=map.tiles.length+map.tiles[0].length;moved&&remaining>0;remaining--){
      const current=this.state.location;if(this.state.mode!=='dungeon'||current?.map!==map.id||current.x!==expected.x||current.y!==expected.y||this.state.waiting||this.state.battle||this.state.vm.length||this.state.fieldEntry?.fired.length||!dungeonCell(this.data,this.state,map,current.x,current.y)?.parameters.slippery)break;
      if(connectionMove(this.data,this.state,null))break;
      const next={x:current.x+dx,y:current.y+dy};if(!this.walkable(map,next.x,next.y)||edgeBetween(this.data,map,current,next)?.passage==='#')break;this.finishMove(next);expected=next;
    }
    return moved;
  }
  finishMove(point){
    const loc=this.state.location,{x,y}=point,z=point.z??0;
    const from={...loc};collapseAfterLeaving(this,from,{...loc,x,y});loc.x=x;loc.y=y;if(this.map().voxels)loc.z=z;syncWorldStories(this);this.state.steps++;this.eventCue('step');const saveEvery=this.partyEffect('lightSaveEvery',Infinity);if(!dungeonReplacesLight(this.data,this.state)&&(!Number.isFinite(saveEvery)||this.state.steps%saveEvery!==0))this.state.light=Math.max(0,this.state.light-1);this.reveal();
    for(const id of this.state.members){const actor=this.state.actors[id];if(actor.hp<=0)continue;for(const status of actor.statuses){if(!dungeonEffectActive(this.data,this.state,'status',status))continue;const damage=this.data.statuses[status]?.stepDamage??0;actor.hp=Math.max(1,actor.hp-damage);}}
    if(this.state.members.some(id=>this.state.actors[id].statuses.includes('poison')))this.eventCue('field_poison');
    recordFieldEntry(this.state);
    stepDungeon(this,{from,to:{...loc}});
    if(this.state.mode==='dungeon'&&this.state.location===loc)signalFieldChange(this.data,this.state,'enter','move','light');
    if(this.state.waiting||this.state.battle)return true;
    if(this.state.mode!=='dungeon'||loc.map!==from.map||loc.x!==x||loc.y!==y||(loc.z??0)!==z)return true;
    if(processFieldEvents(this))return true;
    if(dungeonDanger(this))return true;
    const map=this.map(),environment=dungeonEncounter(this.data,this.state);
    if(!dungeonCell(this.data,this.state,map,x,y)?.parameters.safe&&!this.objectAt(x,y).some(o=>o.safe) && this.state.steps%this.data.system.encounterCheckSteps===0 && this.random()<Math.min(1,(environment.encounterRate??(map.encounterRate+(this.state.light===0?this.data.system.darkEncounterBonus:0)))*this.partyEffect('encounterRate')*environment.rate)){
      let encounter=map.encounter;
      const pool=environment.encounterPool??map.encounterPool;
      if(pool?.length){let roll=this.random()*pool.reduce((sum,e)=>sum+e.weight,0);encounter=pool.at(-1).encounter;for(const entry of pool){roll-=entry.weight;if(roll<0){encounter=entry.encounter;break;}}}
      encounter=environment.encounter??encounter;
      this.startBattle(encounter,{win:[],escape:[],lose:[]},{enemyScale:environment.enemyScale});
    }
    return true;
  }
  interactionObjects(){return this.triggerCandidates('interact');}
  nearbyObjects(){
    const loc=this.state.location;if(!loc)return [];
    return this.map().objects.filter(o=>closeTo(this.state,{map:loc.map,...o})&&(o.edge||o.x===loc.x&&o.y===loc.y||!edgeBetween(this.data,this.map(),loc,o)?.visual.opaque&&(!this.map().voxels||faceRules(this.map(),voxelMapState(this.data,this.state,this.map()),loc,{x:o.x,y:o.y,z:loc.z}).passage)));
  }
  triggerCandidates(kind){
    const loc=this.state.location;if(!loc)return [];
    const [dx,dy]=DELTAS[DIRECTIONS.indexOf(loc.facing)];
    const at=this.objectAt(loc.x,loc.y),ahead=kind==='interact'&&!edgeBetween(this.data,this.map(),loc,{x:loc.x+dx,y:loc.y+dy})?.visual.opaque&&(!this.map().voxels||faceRules(this.map(),voxelMapState(this.data,this.state,this.map()),loc,{x:loc.x+dx,y:loc.y+dy,z:loc.z}).passage)?this.objectAt(loc.x+dx,loc.y+dy):[];
    // Closed doors in front take precedence over a reusable stair/fountain at the feet.
    const blockers=ahead.filter(o=>o.blocking&&this.objectState(o)!=='open');
    return [...new Set([...blockers,...at,...ahead.filter(o=>!blockers.includes(o))])].filter(object=>(!object.edge||closeTo(this.state,{map:loc.map,...object}))&&objectVisible(this.state,this.map(),object)&&object.trigger===kind&&!(object.once&&this.state.events[`${loc.map}/${object.id}`])&&(object.condition===undefined||this.value(object.condition)));
  }
  trigger(kind,id){
    const loc=this.state.location;
    for(const object of this.triggerCandidates(kind)){
      if(id!==undefined&&object.id!==id)continue;
      const key=`${loc.map}/${object.id}`;
      this.state.events[key]=(this.state.events[key]??0)+1;
      this.cue(this.data.presentation?.bindings.objects[object.kind]);
      const quest=this.data.quests[object.quest];
      if(quest?.story?.worldPlaces&&this.state.quests[quest.id].stage==='active'&&object.script===quest.model.entryScript){
        if(!resumeWorldStory(this,quest.id))this.notify('この場面を進めるには、現在の目的地へ向かう。');
        return true;
      }
      this.run(object.script,{object:object.id,map:loc.map});return true;
    }
    return false;
  }
  interact(){return openPlayerCommand(this,'interact');}
  finishBattle(result,skipEvents=false){endBattle(this,result,skipEvents);}
  startBattle(id,continuations,options){startBattle(this,id,continuations,options);}
  dispatch(intent){
    beginFeedback(this);const commandPrompt=this.state.waiting?.type==='command';const changed=this.perform(intent);
    finishInspection(this);
    if(changed&&!commandPrompt&&this.state.waiting?.type!=='command'){processFieldEvents(this);if(intent.type!=='battle')dungeonDanger(this);this.cue(this.data.presentation?.bindings.actions[intent.type]);}
    return changed;
  }
  perform(intent){
    const type=intent?.type;if(typeof type!=='string')return false;
    this.state.notice='';
    if(type==='advance')return this.state.waiting?.type==='command'?advanceCommand(this):advanceScript(this);
    if(type==='choose')return this.state.waiting?.type==='command'?chooseCommand(this,intent.id):chooseOption(this,intent.id);
    if(type==='battle')return battleAction(this,intent);
    if(this.state.waiting||this.state.battle)return false;
    if(type==='location.move')return this.moveLocation(intent.id);
    if(type==='story.resume')return resumeWorldStory(this,intent.quest);
    if(type==='quest.event')return openQuestEvent(this,intent.quest,intent.id);
    if(type==='dungeon.action')return dungeonAction(this,intent);
    if(type==='move')return this.move(intent.direction);
    if(type==='player.command')return openPlayerCommand(this,intent.id);
    if(type==='interact')return this.interact();
    if(type==='retreat'&&this.state.mode==='dungeon'){this.returnTown(true);return true;}
    if(type==='accept'&&this.state.mode==='town')return this.accept(intent.id);
    if(type==='track'&&this.state.quests[intent.id]?.stage==='active'){this.state.trackedQuest=intent.id;return true;}
    if(type==='quest.travel'){
      const plan=questEntryPlan(this.data,this.state,intent.id);
      if(!plan.ok){this.notify(plan.reason);return false;}
      const mapId=this.data.dungeons[plan.place.dungeon].entries.main.map,start=this.data.maps[mapId].entrance;
      this.state.light=this.data.system.lightCapacity;
      this.teleport(mapId,start.x,start.y,start.facing,start.z??0);return true;
    }
    if(type==='travel'&&this.state.mode==='town'){
      const dungeon=intent.dungeon?this.data.dungeons?.[intent.dungeon]:null;
      if(intent.dungeon&&!dungeon)return false;
      const region=this.data.regions.find(r=>r.id===intent.region);
      const mapId=dungeon?.entries.main.map??region?.entrance;if(!mapId)return false;
      const owner=this.data.maps[mapId].dungeon;
      if(this.data.game.world&&!townLocation(this.data,this.state)?.dungeons?.includes(owner))return false;
      this.state.light=this.data.system.lightCapacity;
      const start=this.data.maps[mapId].entrance;this.teleport(mapId,start.x,start.y,start.facing,start.z??0);return true;
    }
    if(type==='service'&&this.state.mode==='town'){
      const service=this.data.game.services.find(s=>s.id===intent.id);if(!service)return false;
      if(this.data.game.world&&!townLocation(this.data,this.state)?.services?.includes(service.id))return false;
      this.run(service.script);return true;
    }
    if(type==='job.change')return this.changeJob(intent.actor,intent.job);
    if(type==='job.action')return this.jobAction(intent.actor,intent.ability);
    if(type==='party')return this.changeParty(intent.action,intent.actor,intent.replace);
    if(type==='unequip')return this.unequip(intent.actor,intent.slot);
    if(type==='buy'&&this.state.mode==='town'){
      if(this.data.game.world&&!townLocation(this.data,this.state)?.shop)return false;
      const stock=this.data.shops.goods.find(g=>g.item===intent.item);if(!stock||this.state.gold<this.price(stock.price)||(this.state.inventory[intent.item]??0)>=this.data.system.maxStack)return false;
      this.state.gold-=this.price(stock.price);this.give(stock.item,1);this.notify(`${this.data.items[stock.item].name}を購入しました。`);return true;
    }
    if(type==='equip')return this.equip(intent.actor,intent.item);
    if(type==='item')return this.useItem(intent.item,intent.actor);
    return false;
  }
  moveLocation(id){
    const s=this.state,here=townLocation(this.data,s),dest=this.data.locations?.[id];
    if(s.mode!=='town'||s.waiting||s.battle||!here||!dest)return false;
    if(dest.parent!==here.id&&here.parent!==id&&!(here.links??[]).includes(id))return false;
    s.townLocation=id;s.presentation.background=dest.background;syncWorldStories(this);this.notify(dest.description);return true;
  }
  equip(actorId,itemId){
    const item=this.data.items[itemId],actor=this.state.actors[actorId];
    if(!this.state.members.includes(actorId)||!canEquip(this.data,this.state,actorId,itemId)||!item?.slot||!(this.state.inventory[itemId]>0)||!actor||actor.hp<=0)return false;
    const previous=actor.equipment[item.slot];if(previous&&previous!==itemId&&(this.state.inventory[previous]??0)>=this.data.system.maxStack)return false;
    equipGear(this.state,actorId,item.slot,itemId);this.state.inventory[itemId]--;if(previous)this.state.inventory[previous]=(this.state.inventory[previous]??0)+1;actor.equipment[item.slot]=itemId;
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
    unequipGear(s,actorId,slot);delete a.equipment[slot];s.inventory[item]=(s.inventory[item]??0)+1;const stats=this.stats(actorId);a.hp=Math.min(a.hp,stats.hp);a.mp=Math.min(a.mp,stats.mp);return true;
  }
  useItem(itemId,actorId){
    const handled=dungeonUseItem(this,itemId);if(handled!==null)return handled;
    const item=this.data.items[itemId];if(!item||!item.field||!(this.state.inventory[itemId]>0)||!this.state.members.includes(actorId))return false;
    if(!dungeonEffectActive(this.data,this.state,'item',itemId)||item.battleSkill&&dungeonAbilityReason(this.data,this.state,item.battleSkill,'battle.skill')){this.notify('この場所では道具の術を使用できません。');return false;}
    this.give(itemId,-1);this.eventCue('item');this.run(item.script,{target:actorId});return true;
  }
  setPortableFire(command){setPortableFire(this.data,this.state,command);}
  save(){return JSON.stringify({saveVersion:1,gameId:this.data.game.id,contentVersion:this.data.game.version,state:clone(this.state)});}
  load(text){
    if(typeof text!=='string'||text.length>this.data.system.maxSaveBytes)throw new Error('セーブのサイズが不正です');
    const save=migrateSave(JSON.parse(text),this.data),errors=validateSave(save,this.data);
    if(errors.length)throw new Error(`セーブを読み込めません：${errors.join(' / ')}`);
    this.state=clone(save.state);this.feedback=freshFeedback();return true;
  }
}
