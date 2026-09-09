import {activeActor} from '../core/battle.js';
import {commandsAt} from '../core/script.js';
import {clone} from '../core/expression.js';
const glyphs={exit:'↑',stairs:'⇵',chest:'▣',fountain:'♧',door:'▥',clue:'?',decision:'!',trap:'×'};
export function projectGame(engine){
  const s=engine.state,d=engine.data,map=engine.map(),seen=new Set(s.discovered[map?.id]??[]);
  const actorView=id=>{const a=s.actors[id],def=d.actors[id],stats=engine.stats(id);return {id,name:def.name,class:def.class,role:def.role,color:def.color,bio:def.bio??'',portrait:d.assets.images[def.portrait]??null,hp:a.hp,maxHp:stats.hp,mp:a.mp,maxMp:stats.mp,statuses:a.statuses.map(x=>d.statuses[x].name),stats,skills:def.skills.map(id=>({id,...clone(d.skills[id])})),equipment:Object.fromEntries(Object.entries(a.equipment).map(([slot,item])=>[slot,d.items[item].name])),equipmentSlots:Object.entries(a.equipment).map(([slot,item])=>({slot,name:d.items[item].name,canRemove:s.mode==='town'&&!s.waiting&&(s.inventory[item]??0)<d.system.maxStack}))};};
  const party=s.members.map(actorView),editable=s.mode==='town'&&!s.waiting&&!s.battle;
  const roster=(d.game.tavern?.candidates??Object.keys(d.actors)).map(id=>{const active=s.members.includes(id),aliveAfterRemoval=s.members.some(other=>other!==id&&s.actors[other].hp>0);return {...actorView(id),active,canJoin:editable&&!active&&s.members.length<d.system.maxParty&&(s.actors[id].hp>0||s.members.some(other=>s.actors[other].hp>0)),canLeave:editable&&active&&s.members.length>1&&aliveAfterRemoval,swapCandidates:editable&&!active?s.members.filter(other=>s.actors[id].hp>0||s.members.some(remaining=>remaining!==other&&s.actors[remaining].hp>0)).map(other=>({id:other,name:d.actors[other].name})):[]};});
  const quests=Object.values(d.quests).map(q=>({id:q.id,number:q.number,title:q.title,client:q.client,brief:q.brief,region:q.region,regionName:d.regions.find(r=>r.id===q.region).name,recommendedLevel:q.recommendedLevel,stage:s.quests[q.id].stage,evidenceCount:s.quests[q.id].evidence.length,unlocked:engine.unlocked(q),unlockHint:q.unlockHint,tracked:s.trackedQuest===q.id,locations:clone(q.locations),outcome:s.quests[q.id].outcome?clone(q.outcomes[s.quests[q.id].outcome]):null}));
  let dialog=null;
  if(s.waiting?.type==='text')dialog={type:'text',text:s.waiting.text,speaker:s.waiting.speaker};
  if(s.waiting?.type==='choice'){
    const c=commandsAt(d,s.vm.at(-1))[s.waiting.index];dialog={type:'choice',options:c.options.map(o=>({id:o.id,text:o.text,requirement:o.requirement??'',enabled:!o.condition||Boolean(engine.value(o.condition))}))};
  }
  let battle=null;
  if(s.battle){const actorId=activeActor(engine),actor=actorId?s.actors[actorId]:null;
    battle={background:d.assets.images[s.presentation.background],round:s.battle.round,actorId,actorName:d.actors[actorId]?.name??'',enemies:s.battle.enemies.map(e=>({id:e.instance,name:e.name,hp:e.hp,maxHp:e.stats.hp,sprite:d.assets.images[e.sprite],guarded:e.guard,statuses:e.statuses.map(id=>d.statuses[id].name)})),skills:actorId?d.actors[actorId].skills.map(id=>({id,...clone(d.skills[id]),enabled:actor.mp>=d.skills[id].mp})):[],canEscape:d.encounters[s.battle.encounter].escape,log:clone(s.battle.log),items:Object.entries(s.inventory).filter(([id,n])=>n>0&&d.items[id].battleSkill).map(([id,count])=>({id,name:d.items[id].name,count}))};
  }
  const objects=map?.objects.filter(o=>(!o.condition||engine.value(o.condition))&&!(o.once&&s.events[`${map.id}/${o.id}`])).map(o=>({id:o.id,name:o.name,x:o.x,y:o.y,kind:o.kind,glyph:glyphs[o.kind]??'·',quest:o.quest,open:engine.objectState(o)==='open'}))??[];
  const current=map?objects.filter(o=>o.x===s.location.x&&o.y===s.location.y):[];
  const geometry=map?.tiles.map((row,y)=>Array.from(row,(tile,x)=>engine.walkable(map,x,y)?tile:'#').join(''));
  return {
    title:d.game.title,subtitle:d.game.subtitle,mode:s.mode,steps:s.steps,gold:s.gold,level:s.level,xp:s.xp,nextXp:d.system.xpBase*s.level*(s.level+1),completed:Object.values(s.quests).filter(q=>q.stage==='completed').length,total:quests.length,light:s.light,lightMax:d.system.lightCapacity,
    party,roster,tavern:{name:d.game.tavern?.name??'帰り火亭',description:d.game.tavern?.description??'',maxParty:d.system.maxParty,editable},quests,regions:clone(d.regions),tracked:quests.find(q=>q.id===s.trackedQuest&&q.stage==='active')??null,services:clone(d.game.services),
    inventory:Object.entries(s.inventory).filter(([,n])=>n>0).map(([id,count])=>({id,count,...clone(d.items[id])})),shop:d.shops.goods.map(g=>({id:g.item,name:d.items[g.item].name,description:d.items[g.item].description,price:g.price,canBuy:s.gold>=g.price&&(s.inventory[g.item]??0)<d.system.maxStack})),
    dungeon:map?{name:map.name,region:map.region,floor:map.floor,location:clone(s.location),width:map.tiles[0].length,height:map.tiles.length,cells:map.tiles.map((row,y)=>Array.from(row,(tile,x)=>({x,y,known:seen.has(`${x},${y}`),wall:tile==='#'}))),geometry,objects,here:current,background:d.assets.images[s.presentation.background]??d.assets.images[map.background],color:d.regions[map.region-1].color}:null,
    dialog,battle,busy:Boolean(s.waiting||s.battle),journal:clone(s.journal),log:s.log.slice(-20),notice:s.notice,ending:clone(s.ending),music:d.assets.audio[s.presentation.music]??null,se:s.presentation.se?{url:d.assets.audio[s.presentation.se.asset],revision:s.presentation.se.revision}:null
  };
}
