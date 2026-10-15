import {battleAlive,frontlineState,frontlineRows,frontlineObjectErrors} from '../core/frontline-lifecycle.js';
import {GameEngine} from '../core/engine.js';
import {frontlineTargetingErrors,frontlineProfile,frontlineTargetPlan} from '../core/frontline-targeting.js';
import {battleSkillPlan,activeActor,continuePreemptive} from '../core/battle.js';
import {frontlineUnits,frontPosition} from '../core/battle-frontline.js';
import {unitKey} from '../core/buffs.js';
import {applyStatus} from '../core/status-effects.js';
export const testerProfile=(overrides={})=>({aim:'unit',range:{min:1,max:5},allyRange:{min:0,max:2},area:{shape:'single'},friendlyFire:false,maxAffected:30,resolution:'simultaneous',order:'front_to_back',reevaluate:'alive',damageSeries:{mode:'constant',basis:'power',start:1,step:0},...overrides});
export function testerPreset(data,name='ranks'){
 const actor=id=>({id,depth:0,lane:0,hp:500,mp:100,str:30,vit:8,int:30,agi:20,range:1,status:''}),eid=Object.keys(data.enemies)[0],enemy=(i,depth=0,lane=i)=>({id:eid,depth,lane,hp:500,mp:100,str:20,vit:4,int:20,agi:10,range:1,status:'',reaction:false});
 const allies=data.game.initial.members.slice(0,2).map((id,i)=>({...actor(id),lane:i*4}));let enemies=[enemy(0,0,0),enemy(1,0,4),enemy(2,1,2),enemy(3,2,2)];
 if(name==='rear_only'){allies.splice(1);allies[0].depth=2;enemies=[enemy(0,2,2)];}
 if(name==='no_front'){allies[0].depth=1;allies[1].depth=2;enemies=[enemy(0,1,0),enemy(1,2,2)];}
 if(name==='front_rear'){allies[1].depth=2;enemies=[enemy(0,0,2),enemy(1,2,2)];}
 if(name==='crowd')enemies=Array.from({length:5},(_,i)=>enemy(i,0,i));
 if(name==='widths'){const ids=[...new Map(Object.values(data.enemies).map(e=>[e.sprite,e.id])).values()];enemies=Array.from({length:5},(_,i)=>({...enemy(i),id:ids[i%ids.length]}));}
 if(name==='cross')enemies=[enemy(0,0,2),enemy(1,1,2),enemy(2,1,1),enemy(3,1,3),enemy(4,2,2),enemy(5,2,3)];
 if(name==='interrupt'){enemies=Array.from({length:3},(_,i)=>({...enemy(i),reaction:i===0}));}
 if(['body_retreat','revive_expand'].includes(name)){
  const ids=Object.keys(data.actors).slice(0,6);allies.splice(0,allies.length,...ids.map((id,i)=>({...actor(id),depth:i===5?(name==='body_retreat'?1:2):0,lane:i%5,down:name==='body_retreat'?i<5:i>0})));
 }
 if(name==='two_rows'){allies[1].depth=1;}
 if(name==='zombies'){enemies=[{...enemy(0,0,0),down:true,remain:true},enemy(1,1,0),enemy(2,2,2)];}
 return {version:1,seed:20261014,mode:'frontline',allies,enemies,profile:testerProfile({area:{shape:name==='cross'?'cross4':name==='interrupt'?'row':'single'},resolution:name==='interrupt'?'sequential':'simultaneous'}),presentation:{overlap:.33,rowScale:[1,.85,.7]},preemptive:null};
}
export function validateTesterCase(data,c){
 const errors=[];if(c?.version!==1||!['classic','grid','frontline'].includes(c.mode)||!Number.isInteger(c.seed))return ['テストケースの版・方式・シードが不正です。'];
 for(const [side,db] of [['allies',data.actors],['enemies',data.enemies]]){
  const rows=c[side];if(!Array.isArray(rows)||rows.length<1||rows.length>15){errors.push(`${side}: 個体数は1〜15です。`);continue;}
  const slots=new Set();for(const u of rows){if(!db[u.id]||!Number.isInteger(u.depth)||u.depth<0||u.depth>2||!Number.isInteger(u.lane)||u.lane<0||u.lane>4||slots.has(`${u.depth},${u.lane}`))errors.push(`${side}: 個体・段・左右順が不正または重複しています。`);slots.add(`${u.depth},${u.lane}`);for(const k of ['hp','mp','str','vit','int','agi','range'])if(!Number.isInteger(u[k])||u[k]<(k==='hp'||k==='range'?1:0)||u[k]>(k==='range'?5:9999))errors.push(`${side}: ${k}が範囲外です。`);if(u.status&&!data.statuses[u.status])errors.push('状態異常が不正です。');}
 }
 for(const u of [...(c.allies??[]),...(c.enemies??[])])for(const k of ['down','remain'])if(u[k]!==undefined&&typeof u[k]!=='boolean')errors.push('戦闘不能・残留指定不正');
 if(c.mode!=='frontline'&&[...(c.allies??[]),...(c.enemies??[])].some(u=>u.down||u.remain))errors.push('戦闘不能・残留の開始設定はFrontline専用です。');
 errors.push(...frontlineObjectErrors(c.objects));
 if(c.knockback&&(!Number.isInteger(c.knockback.distance)||c.knockback.distance<1||c.knockback.distance>3||!Number.isInteger(c.knockback.collisionDamage)||c.knockback.collisionDamage<0||c.knockback.collisionDamage>9999))errors.push('ノックバック設定不正');
 if(new Set(c.allies?.map(u=>u.id)).size!==c.allies?.length)errors.push('味方人物が重複しています。');
 if(c.presentation&&(!Number.isFinite(c.presentation.overlap)||c.presentation.overlap<0||c.presentation.overlap>.5||!Array.isArray(c.presentation.rowScale)||c.presentation.rowScale.length!==3||c.presentation.rowScale.some(v=>!Number.isFinite(v)||v<=0||v>1.5)))errors.push('描画設定不正');
 errors.push(...frontlineTargetingErrors(c.profile));return errors;
}
export function createTesterEngine(base,config,{manualTurns=true}={}){
 const errors=validateTesterCase(base,config);if(errors.length)throw Error(errors.join('\n'));
 const data=structuredClone(base);data.game.initial.members=config.allies.map(u=>u.id);data.system.maxParty=15;
 const configureSkill=(id,u)=>{data.skills[id]={name:'検証用通常攻撃',mp:0,target:'enemy',effects:[{type:'damage',formula:'physical',element:'physical'}],frontlineTargeting:testerProfile({range:{min:1,max:u.range}})};};
 data.skills.lab_strike={name:'設定攻撃',mp:2,maxTargets:8,target:'enemy',effects:[{type:'damage',formula:'physical',element:'physical'}],frontlineTargeting:structuredClone(config.profile)};
 const labSkills={
 lab_revive:{name:'検証：復活',target:'ally',states:['down'],effects:[{type:'heal',amount:100}]},
 lab_remove:{name:'検証：敵を排除',target:'enemy',states:['alive','down'],effects:[{type:'frontline_remove'}]},
 lab_exile:{name:'検証：味方を排除',target:'ally',states:['alive','down'],effects:[{type:'frontline_remove'}]},
 lab_push:{name:'検証：敵を押す',target:'enemy',effects:[{type:'frontline_knockback',...(config.knockback??{distance:1,collisionDamage:25})}]},
 lab_push_ally:{name:'検証：味方を押す',target:'ally',effects:[{type:'frontline_knockback',...(config.knockback??{distance:1,collisionDamage:25})}]},
 lab_corpse_mp:{name:'検証：戦闘不能者のMP回復',target:'ally',states:['down'],effects:[{type:'restore_mp',amount:10}]}
 };
 if(config.mode==='frontline')for(const [id,{states,...skill}] of Object.entries(labSkills))data.skills[id]={...skill,mp:0,frontlineTargeting:testerProfile({targetStates:states??['alive']})};
 const grants=id=>[id,'lab_strike',...(config.mode==='frontline'?Object.keys(labSkills):[])].map(skill=>({skill,level:1,api:'battle.skill',target:data.skills[skill].target,maxTargets:8,lifetime:'equipped'}));
 for(const u of config.allies){const spec=data.actors[u.id],job=structuredClone(data.jobs[spec.initialJob]),jid=`lab_${u.id}`,sid=`lab_${u.id}_attack`;configureSkill(sid,u);job.id=jid;job.stats=Object.fromEntries(Object.keys(job.stats).map(k=>[k,0]));job.grants.push(...grants(sid));data.jobs[jid]=job;spec.initialJob=jid;Object.assign(spec.stats,Object.fromEntries(['hp','mp','str','vit','int','agi'].map(k=>[k,u[k]])));}
 const enemyIds=config.enemies.map((u,i)=>{const id=`lab_enemy_${i}`,sid=id+'_attack';configureSkill(sid,u);const e=structuredClone(data.enemies[u.id]);e.frontlineDefeat=u.remain?'remain':'remove';e.id=id;e.name+=` ${i+1}`;Object.assign(e.stats,Object.fromEntries(['hp','mp','str','vit','int','agi'].map(k=>[k,u[k]])));e.ai=[{skill:sid,priority:1,target:'weakest'}];delete e.preemptive;data.enemies[id]=e;return id;});
 data.encounters.lab_battle={...(config.mode==='frontline'?{frontlineObjects:structuredClone(config.objects??[]),frontlineDown:[...config.allies.filter(u=>u.down).map(u=>'actor:'+u.id),...config.enemies.flatMap((u,i)=>u.down?['enemy:enemy_'+i]:[])]}:{}),text:'バトルテスター',escape:true,enemies:enemyIds,battleMode:config.mode,frontlinePositions:config.enemies.map(({depth,lane})=>({depth,lane})),enemyPositions:config.enemies.map(({depth,lane})=>({x:lane,y:2-depth})),frontlineReactions:Object.fromEntries(config.enemies.flatMap((u,i)=>u.reaction?[[`enemy:enemy_${i}`,[{on:'onHit',skill:'guard',cancelRemaining:true}]]]:[])),...(config.preemptive?{preemptive:config.preemptive}:{})};
 const engine=new GameEngine(data,config.seed);engine.state.vm=[];engine.state.waiting=null;engine.state.battle=null;engine.state.battleResult=null;engine.state.rng=(config.seed>>>0)||1;engine.state.partyFormation=Object.fromEntries(config.allies.map(({id,depth,lane})=>[id,{x:lane,y:depth}]));engine.state.partyFrontlineFormation=Object.fromEntries(config.allies.map(({id,depth,lane})=>[id,{depth,lane}]));
 delete engine.state.presentation.message;delete engine.state.presentation.cast;delete engine.state.presentation.castCue;
 for(const u of config.allies){const a=engine.state.actors[u.id];a.hp=u.hp;a.mp=u.mp;a.statuses=[];if(u.status)applyStatus(data,engine.state,a,u.status);}
 engine.startBattle('lab_battle',{win:[],lose:[],escape:[]},{manualTurns:true});
 for(let i=0;i<config.enemies.length;i++)if(engine.state.battle&&config.enemies[i].status)applyStatus(data,engine.state,engine.state.battle?.enemies[i],config.enemies[i].status);
 // Install all statuses before allowing the normal queue (including enemy
 // initiative/preemptive actions) to advance. Diagnostic pacing is the default.
 if(!manualTurns&&engine.state.battle){delete engine.state.battle.manualTurns;continuePreemptive(engine);}
 return engine;
}
export function testerCurrentUnit(engine){const b=engine.state.battle;if(!b)return null;const actor=activeActor(engine);if(actor)return 'actor:'+actor;if(b.preemptive?.side==='enemies')return unitKey(b.enemies.filter(e=>battleAlive(engine.state,e)).sort((a,c)=>c.stats.agi-a.stats.agi)[0]);return b.turnQueue?.[b.turnIndex]??null;}
export function testerPlan(engine,sourceKey,skillId,targetKey){
 const source=frontlineUnits(engine.state).find(u=>unitKey(u)===sourceKey);if(!source)return {ok:false,reason:'行動者を選択してください。'};
 if(!source.instance)return battleSkillPlan(engine,source.id,skillId,engine.state.battle.mode==='classic'?targetKey?.replace(/^(actor|enemy):/,''):targetKey);
 if(engine.state.battle.mode==='frontline')return frontlineTargetPlan(engine,source,engine.data.skills[skillId],skillId,targetKey,{limit:8});
 return {ok:false,reason:'敵の指定攻撃プレビューはFrontlineで利用できます。'};
}
export function testerSnapshot(engine){const b=engine.state.battle;return b?{round:b.round,queue:b.turnQueue,index:b.turnIndex,rng:engine.state.rng,rows:frontlineRows(engine.state),removed:structuredClone(b.frontline?.removed??{}),objects:structuredClone(b.frontline?.objects??[]),current:testerCurrentUnit(engine),positions:structuredClone(b.frontline?.positions??b.grid?.positions??{}),units:frontlineUnits(engine.state).map(u=>({key:unitKey(u),hp:u.hp,mp:u.mp,state:frontlineState(engine.state,u),position:frontPosition(engine.state,u)}))}:null;}
