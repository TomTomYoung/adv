import {emitFeedback,setScreenLayer} from './feedback.js';
import {clone,setPath,pathParts} from './expression.js';
export const COMMANDS=new Set(['say','narrate','choice','if','switch','call','return','set','add','flag.set','random.set','random.branch','item.give','item.take','gold.change','actor.heal','actor.damage','actor.restore_mp','party.heal_all','party.join','party.leave','status.apply','status.remove','map.teleport','map.reveal','facing.set','object.state.set','event.mark_done','battle.start','quest.accept','quest.evidence','quest.complete','scene.background','audio.bgm','audio.se','rest','town.return','ending.set','light.refill','effect.play','screen.set','screen.clear','job.change','job.action']);
export function commandsAt(data,frame){
  let commands=data.scripts[frame.script]?.commands;
  for(const part of frame.path) commands=commands?.[part];
  if(!Array.isArray(commands))throw new Error('スクリプト継続位置が不正です');
  return commands;
}
export function pushBranch(engine,frame,index,path){
  engine.state.vm.push({script:frame.script,path:[...frame.path,index,...path],index:0,scope:frame.scope,branch:true,local:clone(frame.local)});
}
export function runScript(engine,id,args={}){
  if(!engine.data.scripts[id])throw new Error(`不明なスクリプト: ${id}`);
  engine.state.vm.push({script:id,path:[],index:0,scope:engine.state.nextScope++,branch:false,local:{args:clone(args)}});pump(engine);
}
export function advanceScript(engine){
  if(engine.state.waiting?.type!=='text')return false;
  engine.state.waiting=null;pump(engine);return true;
}
export function chooseOption(engine,id){
  const wait=engine.state.waiting;if(wait?.type!=='choice')return false;
  const frame=engine.state.vm.at(-1),command=commandsAt(engine.data,frame)[wait.index];
  const optionIndex=command.options.findIndex(o=>o.id===id),option=command.options[optionIndex];
  if(!option||(option.condition&&!engine.value(option.condition)))return false;
  engine.state.waiting=null;engine.log(`選択：${option.text}`);pushBranch(engine,frame,wait.index,['options',optionIndex,'commands']);pump(engine);return true;
}
export function pump(engine){
  const state=engine.state;
  let fuel=engine.data.system.scriptBudget;
  while(state.vm.length&&!state.waiting&&!state.battle){
    if(--fuel<0||state.vm.length>32)throw new Error('スクリプトが実行上限に達しました');
    const frame=state.vm.at(-1),commands=commandsAt(engine.data,frame);
    if(frame.index>=commands.length){state.vm.pop();const parent=state.vm.at(-1);if(frame.branch&&parent?.scope===frame.scope)parent.local=clone(frame.local);continue;}
    const index=frame.index++,c=commands[index],v=x=>engine.value(x),branch=path=>pushBranch(engine,frame,index,path);
    switch(c.op){
      case 'say':case 'narrate':{
        const text=String(v(c.text));state.waiting={type:'text',text,speaker:c.name??c.speaker??''};engine.log(text);break;
      }
      case 'choice':state.waiting={type:'choice',index};break;
      case 'if':branch(v(c.condition)?['then']:['else']);break;
      case 'switch':{const ci=c.cases.findIndex(x=>x.equals===v(c.value));branch(ci>=0?['cases',ci,'commands']:['default']);break;}
      case 'call':{
        const args=Object.fromEntries(Object.entries(c.args??{}).map(([k,val])=>[k,v(val)]));
        if(!engine.data.scripts[c.script])throw new Error(`不明なスクリプト: ${c.script}`);
        state.vm.push({script:c.script,path:[],index:0,scope:state.nextScope++,branch:false,local:{args}});break;
      }
      case 'return':while(state.vm.at(-1)?.scope===frame.scope)state.vm.pop();break;
      case 'set':case 'add':case 'random.set':{
        const root=pathParts(c.target)[0];if(!['flags','vars','local'].includes(root))throw new Error('この状態は専用命令で変更します');
        const target=root==='local'?frame:state;
        const value=c.op==='random.set'?c.min+Math.floor(engine.random()*(c.max-c.min+1)):c.op==='add'?(engine.value({ref:c.target})??0)+v(c.value):v(c.value);
        setPath(target,c.target,value);break;
      }
      case 'flag.set':setPath(state,`flags.${c.key}`,v(c.value));break;
      case 'random.branch':{
        let roll=engine.random()*c.branches.reduce((sum,b)=>sum+b.weight,0),selected=c.branches.length-1;
        for(let i=0;i<c.branches.length;i++){roll-=c.branches[i].weight;if(roll<0){selected=i;break;}}
        branch(['branches',selected,'commands']);break;
      }
      case 'item.give':case 'item.take':engine.give(v(c.item),v(c.count??1)*(c.op==='item.take'?-1:1));break;
      case 'gold.change':state.gold=Math.max(0,state.gold+v(c.amount));break;
      case 'actor.heal':case 'actor.damage':case 'actor.restore_mp':{
        const ids=c.target==='party'?state.members:[v(c.target)];
        const amount=Math.floor(v(c.amount)*(c.op==='actor.damage'&&engine.trapContext()?engine.partyEffect('trapDamage'):1));
        for(const id of ids){const actor=state.actors[id];if(!actor)throw new Error(`不明な隊員: ${id}`);const key=c.op==='actor.restore_mp'?'mp':'hp',max=engine.stats(id)[key];actor[key]=Math.max(0,Math.min(max,actor[key]+amount*(c.op==='actor.damage'?-1:1)));}
        if(state.members.every(id=>state.actors[id].hp<=0)){engine.defeat();return;}
        break;
      }
      case 'job.change':engine.changeJob(c.actor,c.job);break;
      case 'job.action':engine.jobAction(c.actor,c.ability);break;
      case 'party.heal_all':engine.healAll(c.ratio??1);state.light=engine.data.system.lightCapacity;break;
      case 'party.join':if(!state.members.includes(c.actor)&&state.members.length<engine.data.system.maxParty){state.members.push(c.actor);}break;
      case 'party.leave':if(state.members.length>1&&state.members.some(id=>id!==c.actor&&state.actors[id].hp>0))state.members=state.members.filter(id=>id!==c.actor);break;
      case 'status.apply':case 'status.remove':{
        for(const id of c.target==='party'?state.members:[v(c.target)]){const a=state.actors[id];if(c.op==='status.apply'){if(!a.statuses.includes(c.status))a.statuses.push(c.status);}else a.statuses=a.statuses.filter(s=>s!==c.status);}break;
      }
      case 'map.teleport':engine.teleport(c.map,c.x,c.y,c.facing);break;
      case 'map.reveal':engine.reveal(c.radius??2);break;
      case 'light.refill':state.light=engine.data.system.lightCapacity;engine.eventCue('light');break;
      case 'facing.set':state.location.facing=c.direction;break;
      case 'object.state.set':state.objects[`${c.map??state.location.map}/${c.object}`]=c.state;break;
      case 'event.mark_done':state.events[c.event]=1;break;
      case 'battle.start':engine.startBattle(c.encounter,{frame:clone(frame),index,win:'on_win',lose:'on_lose',escape:'on_escape'});break;
      case 'quest.accept':engine.accept(c.quest);break;
      case 'quest.evidence':engine.evidence(c.quest,c.key,c.text);break;
      case 'quest.complete':engine.complete(c.quest,c.outcome);break;
      case 'scene.background':state.presentation.background=c.asset;break;
      case 'audio.bgm':state.presentation.music=c.asset;break;
      case 'audio.se':emitFeedback(engine,{sound:c.asset,at:c.delay??engine.feedback.clock,gain:c.volume??1});break;
      case 'effect.play':emitFeedback(engine,{effects:[c.effect],targets:[c.target??'scene'],at:c.delay??engine.feedback.clock});break;
      case 'screen.set':case 'screen.clear':setScreenLayer(engine,c);break;
      case 'rest':{
        if(state.gold<(c.cost??0)){engine.notify('宿代が足りません。施療所で応急手当を受けられます。');break;}
        engine.eventCue('recovery');state.gold-=c.cost??0;engine.healAll(c.ratio??1);state.light=engine.data.system.lightCapacity;break;
      }
      case 'town.return':engine.returnTown();break;
      case 'ending.set':state.ending={title:c.title,text:c.text};break;
      default:throw new Error(`未対応の命令: ${c.op}`);
    }
  }
}
