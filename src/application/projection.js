import {abilityCategory,personalItems} from './character-profile.js';
import {rosterOrder,partyOrderPlan} from '../core/party-order.js';
import {projectInventory} from './inventory-projection.js';
import {projectCast} from './cast-projection.js';
import {playerCommands,commandDialog} from '../core/player-commands.js';
import {projectWorld} from './world-projection.js';
import {dungeonEntryReason} from '../core/quest-navigation.js';
import {projectQuestNavigation} from './quest-navigation.js';
import {objectVisible} from '../core/quest-events.js';
import {projectDungeonSurfaces} from './dungeon-surfaces.js';
import {projectArt,projectQuestNotes,projectQuestLinks,projectDungeonEvents,projectEventArt} from './dungeon-projection.js';
import {dungeonViews,dungeonPreview,dungeonAbilityReason,dungeonEffectActive} from '../core/dungeons.js';
import {storyCanAct} from '../core/story.js';
import {jobCatalog,projectActorJob,projectBattleSkills,projectEnemyJob} from './job-projection.js';
import {activeActor} from '../core/battle.js';
import {commandsAt} from '../core/script.js';
import {dungeonInterior} from '../core/world.js';
import {clone} from '../core/expression.js';
const glyphs={exit:'↑',stairs:'⇵',chest:'▣',fountain:'♧',door:'▥',clue:'?',decision:'!',trap:'×'};
export function projectGame(engine){
  const s=engine.state,d=engine.data,map=engine.map();
  const actorView=id=>{const a=s.actors[id],def=d.actors[id],stats=engine.stats(id);return {id,name:def.name,class:def.class,role:def.role,color:def.color,bio:def.bio??'',portrait:d.assets.images[def.portrait]??null,hp:a.hp,maxHp:stats.hp,mp:a.mp,maxMp:stats.mp,statuses:a.statuses.map(x=>d.statuses[x].name+(dungeonEffectActive(d,s,'status',x)?'':'（停止中）')),stats,items:personalItems(engine,id),skills:engine.skills(id).map(id=>({id,...clone(d.skills[id]),category:abilityCategory(id)})),equipment:Object.fromEntries(Object.entries(a.equipment).map(([slot,item])=>[slot,d.items[item].name])),equipmentSlots:Object.entries(a.equipment).map(([slot,item])=>({slot,id:item,name:d.items[item].name,description:d.items[item].description,canRemove:(s.mode==='town'&&!dungeonInterior(d,s)||s.members.includes(id))&&!s.waiting&&!s.battle&&(s.inventory[item]??0)<d.system.maxStack}))};};
  const baseActorView=actorView,jobActorView=id=>({...baseActorView(id),...projectActorJob(engine,id)});
  const party=s.members.map(jobActorView),editable=s.mode==='town'&&!dungeonInterior(d,s)&&!s.waiting&&!s.battle;
  const roster=rosterOrder(d,s).map(id=>{const active=s.members.includes(id),aliveAfterRemoval=s.members.some(other=>other!==id&&s.actors[other].hp>0);return {...jobActorView(id),active,canMoveUp:partyOrderPlan(d,s,active?'party':'tavern',id,'up').ok,canMoveDown:partyOrderPlan(d,s,active?'party':'tavern',id,'down').ok,canJoin:editable&&!active&&s.members.length<d.system.maxParty&&(s.actors[id].hp>0||s.members.some(other=>s.actors[other].hp>0)),canLeave:editable&&active&&s.members.length>1&&aliveAfterRemoval,swapCandidates:editable&&!active?s.members.filter(other=>s.actors[id].hp>0||s.members.some(remaining=>remaining!==other&&s.actors[remaining].hp>0)).map(other=>({id:other,name:d.actors[other].name})):[]};});
  const routeLocations=q=>q.model.flowVersion>=2&&!s.flags.legacyQuestRoutes?.[q.id]?q.locations.filter(l=>l.role==='decision'):q.locations;
  const fieldNotes=projectQuestNotes(d,s);
  const canEnter=id=>!dungeonEntryReason(d,s,id);

  const quests=Object.values(d.quests).map(q=>({id:q.id,...projectQuestNavigation(d,s,q),fieldNotes:fieldNotes.filter(n=>n.quest===q.id),fieldLinks:projectQuestLinks(d,s,q.id),number:q.number,title:q.title,client:q.client,brief:q.brief,region:q.region,regionName:d.regions.find(r=>r.id===q.region).name,recommendedLevel:q.recommendedLevel,stage:s.quests[q.id].stage,evidenceCount:s.quests[q.id].evidence.length,evidenceTotal:routeLocations(q).filter(l=>l.role!=='decision').length,unlocked:engine.unlocked(q),unlockHint:q.unlockHint,tracked:s.trackedQuest===q.id,locations:clone(routeLocations(q)),outcome:s.quests[q.id].outcome?clone((s.flags.legacyStoryRoutes?.[q.id]?q.legacyOutcomes??q.outcomes:q.outcomes)[s.quests[q.id].outcome]):null}));
  let dialog=null;
  if(s.waiting?.type==='text')dialog={type:'text',text:s.waiting.text,speaker:s.waiting.speaker,...(s.waiting.speakerId?{speakerId:s.waiting.speakerId}:{})};
  if(s.waiting?.type==='choice'){
    const c=commandsAt(d,s.vm.at(-1))[s.waiting.index];dialog={type:'choice',text:s.waiting.text??'どうする？',speaker:s.waiting.speaker??'',...(s.waiting.speakerId?{speakerId:s.waiting.speakerId}:{}),options:c.options.filter(o=>o.visibleWhen===undefined||engine.value(o.visibleWhen)).map(o=>({id:o.id,text:o.text,requirement:o.requirement??'',enabled:(o.condition===undefined||Boolean(engine.value(o.condition)))&&(!o.storyAction||storyCanAct(engine,o.storyAction.quest,o.storyAction.action))}))};
  }
  if(s.waiting?.type==='choice'&&!s.battle&&s.vm.every(f=>f.index>=commandsAt(d,f).length)){
    const command=commandsAt(d,s.vm.at(-1))[s.waiting.index];
    const cancel=command.options.find(o=>['pause','leave'].includes(o.id)&&o.commands.length===0&&!o.storyAction&&dialog.options.some(v=>v.id===o.id&&v.enabled));
    if(cancel)dialog.cancelId=cancel.id;
  }
  if(s.waiting?.type==='command'){const prompt=commandDialog(engine);dialog={...prompt,options:prompt.options?.map(({id,text,enabled,requirement})=>({id,text,enabled,requirement}))};if(prompt.type==='choice')dialog.cancelId='cancel';else dialog.cancelAdvance=true;}
  if(dialog){const scene=projectCast(engine,dialog);if(scene)dialog.scene=scene;}
  if(dialog)dialog.fieldScene=projectEventArt(d,s);
  let battle=null;
  if(s.battle){const actorId=activeActor(engine),actor=actorId?s.actors[actorId]:null;
    battle={event:s.battle.event?{id:s.battle.event.id}:null,background:d.assets.images[s.presentation.background],round:s.battle.round,actorId,actorName:d.actors[actorId]?.name??'',enemies:s.battle.enemies.map(e=>({id:e.instance,name:e.name,hp:e.hp,maxHp:e.stats.hp,sprite:d.assets.images[e.sprite],guarded:e.guard,statuses:e.statuses.map(id=>d.statuses[id].name+(dungeonEffectActive(d,s,'status',id)?'':'（停止中）')),...projectEnemyJob(engine,e)})),skills:projectBattleSkills(engine,actorId),canEscape:d.encounters[s.battle.encounter].escape,log:clone(s.battle.log),items:Object.entries(s.inventory).filter(([id,n])=>n>0&&d.items[id].battleSkill).map(([id,count])=>({id,name:d.items[id].name,count,target:d.skills[d.items[id].battleSkill]?.target??'ally',enabled:!dungeonAbilityReason(d,s,d.items[id].battleSkill,'battle.skill')&&dungeonEffectActive(d,s,'item',id)}))};
  }
  const objects=map?.objects.filter(o=>(o.z??0)===(s.location?.z??0)&&objectVisible(s,map,o)).map(o=>({id:o.id,name:o.name,x:o.x,y:o.y,kind:o.kind,...(o.edge?{edge:o.edge}:{}),glyph:glyphs[o.kind]??'·',quest:o.quest,open:engine.objectState(o)==='open'}))??[];
  const {systems,wall,floorArt,scenes}=projectDungeonEvents(engine,dungeonViews(d,s).filter(v=>!map?.voxels||v.kind!=='waterworks'));objects.push(...systems.flatMap(system=>system.markers??[]));
  if(map)for(const location of Object.values(d.locations??{})){const entrance=location.dungeonEntrance;if(entrance?.map===map.id)objects.push({id:`interior:${location.id}`,name:location.name,x:entrance.x,y:entrance.y,kind:'door',open:false});}
  const current=map?objects.filter(o=>o.x===s.location.x&&o.y===s.location.y):[];
  const terrain=projectDungeonSurfaces(engine,systems);
  const feedbackTarget=t=>({...clone(t),image:d.assets.images[t.image]??null});
  const feedback={session:engine.feedback.session,revision:engine.feedback.revision,events:engine.feedback.events.map(e=>({...clone(e),sound:e.sound?{url:d.assets.audio[e.sound],gain:e.gain*(d.sounds?.[e.sound]?.gain??1)}:null,targets:e.targets.map(feedbackTarget),...(e.source?{source:feedbackTarget(e.source)}:{})}))};
  const fire=systems.find(system=>system.kind==='fire_network'),light=fire?fire.portable.fuel:s.light,lightMax=fire?fire.portable.capacity:d.system.lightCapacity;
  const shade=d.presentation?.ambient.shade;
  const atmosphere=map?[{color:shade?.color??'#000000',opacity:shade?.opacity??0,shade:true},{color:'#000000',opacity:.65*(1-(terrain.lighting?.current??8)/8),shade:false,lighting:true}]:[];
  atmosphere.push(...Object.values(clone(s.presentation.layers??{})));
  return {
    commands:playerCommands(engine),...projectWorld(engine,dialog),feedback,effects:clone(d.effects??{}),effectAssets:clone(d.assets.images),atmosphere,
    title:d.game.title,subtitle:d.game.subtitle,mode:s.mode,steps:s.steps,gold:s.gold,level:s.level,xp:s.xp,nextXp:d.system.xpBase*s.level*(s.level+1),completed:Object.values(s.quests).filter(q=>q.stage==='completed').length,total:quests.length,light,lightMax,lightLabel:fire?'携帯松明':'灯油',
    party,roster,jobs:jobCatalog(engine),statNames:clone(d.jobProfile?.statNames??{}),tavern:{name:d.game.tavern?.name??'帰り火亭',description:d.game.tavern?.description??'',maxParty:d.system.maxParty,editable},quests,regions:clone(d.regions),dungeons:d.dungeons?Object.values(d.dungeons).sort((a,b)=>a.region-b.region||Object.keys(a.systems).length-Object.keys(b.systems).length).map(v=>({id:v.id,canEnter:canEnter(v.id),art:projectArt(d,v.art?.wall),name:v.name,description:v.description,preview:dungeonPreview(d,v),region:v.region,mapCount:v.maps.length,recommendedLevel:v.recommendedLevel,color:d.regions.find(r=>r.id===v.region)?.color??'#c6ae77'})):null,tracked:quests.find(q=>q.id===s.trackedQuest&&q.stage==='active')??null,services:clone(d.game.services),
    ...projectInventory(engine),
    dungeon:map?{systems,wall,floorArt,scenes,name:map.name,region:map.region,floor:map.floor,location:clone(s.location),width:map.tiles[0].length,height:map.tiles.length,objects,here:current,background:d.assets.images[s.presentation.background]??d.assets.images[map.background],color:d.regions[map.region-1].color,...terrain}:null,
    dialog,battle,fieldNotes,busy:Boolean(s.waiting||s.battle),journal:clone(s.journal),log:s.log.slice(-20),notice:s.notice,ending:clone(s.ending),music:d.assets.audio[s.presentation.music]??null,se:null
  };
}
