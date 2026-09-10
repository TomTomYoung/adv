import {validatePresentation,colorValid,layerNameValid,targetValid} from './feedback-validation.js';
import {validateJobs} from './job-validation.js';
import {COMMANDS} from './script.js';
import {EXPRESSION_OPS,isRecord,pathParts} from './expression.js';
export function validateContent(data){
  const errors=[],fail=(path,message)=>errors.push(`${path}: ${message}`),reference=(collection,id,path)=>{if(typeof id!=='string'||!Object.hasOwn(collection??{},id))fail(path,`参照先がありません: ${id}`);};
  const expression=(value,path,depth=0)=>{
    if(depth>32){fail(path,'式が深すぎます');return;}
    if(!isRecord(value))return;
    if('ref'in value){try{pathParts(value.ref);}catch(e){fail(path,e.message);}return;}
    if('format'in value){if(typeof value.format!=='string')fail(path,'formatは文字列です');Object.values(value.values??{}).forEach(v=>expression(v,path,depth+1));return;}
    if(!EXPRESSION_OPS.has(value.op))fail(path,`未知の式: ${value.op}`);
    if(['eq','ne','gt','gte','lt','lte','in','contains'].includes(value.op)&&(!Object.hasOwn(value,'left')||!Object.hasOwn(value,'right')))fail(path,'left/rightが必要です');
    if(value.op==='not'&&!Object.hasOwn(value,'arg'))fail(path,'argが必要です');
    if(value.op==='exists'&&!Object.hasOwn(value,'value'))fail(path,'valueが必要です');
    for(const key of ['left','right','arg','value'])if(key in value)expression(value[key],`${path}.${key}`,depth+1);
    if(value.args!==undefined){if(!Array.isArray(value.args))fail(path,'argsは配列です');else value.args.forEach(v=>expression(v,path,depth+1));}
    if(['and','or','add','sub','mul','div','mod','min','max','floor','ceil','round','abs','clamp'].includes(value.op)&&(!Array.isArray(value.args)||!value.args.length))fail(path,'argsが必要です');
    if(value.op==='record_count'){if(!['battles','wins','escapes','losses','kills','encounters'].includes(value.metric))fail(path,'戦績項目不正');if(value.metric==='kills')reference(data.enemies,value.id,path);if(value.metric==='encounters')reference(data.encounters,value.id,path);if(value.sinceQuest)reference(data.quests,value.sinceQuest,path);}
    if(value.op==='has_item')reference(data.items,value.item,path);
    if(value.op==='has_member'||value.op==='has_status')reference(data.actors,value.actor,path);
  };
  const commands=(list,path,depth=0)=>{
    if(!Array.isArray(list)){fail(path,'commandsは配列です');return;}
    if(depth>32){fail(path,'入れ子が深すぎます');return;}
    list.forEach((c,i)=>{
      const at=`${path}[${i}]`;if(!isRecord(c)||!COMMANDS.has(c.op)){fail(at,`未知の命令: ${c?.op}`);return;}
      for(const key of ['condition','value','amount','count','text','target'])if(c[key]!==undefined)expression(c[key],at);
      if(['say','narrate'].includes(c.op)&&typeof c.text!=='string'&&!c.text?.format)fail(at,'本文が必要です');
      if(['call','jump'].includes(c.op))reference(data.scripts,c.script,at);
      if(c.op==='battle.start'){
        reference(data.encounters,c.encounter,at);
        for(const key of ['on_win','on_lose','on_escape'])commands(c[key],`${at}.${key}`,depth+1);
      }
      if(c.op.startsWith('quest.'))reference(data.quests,c.quest,at);
      if(c.op==='quest.complete'&&!data.quests[c.quest]?.outcomes[c.outcome])fail(at,'結末がありません');
      if(['item.give','item.take'].includes(c.op)&&typeof c.item==='string')reference(data.items,c.item,at);
      if(c.count!==undefined&&typeof c.count==='number'&&(!Number.isInteger(c.count)||c.count<1))fail(at,'個数は正の整数です');
      if(c.op==='map.teleport'){
        reference(data.maps,c.map,at);const m=data.maps[c.map];if(m?.tiles[c.y]?.[c.x]===undefined||m?.tiles[c.y]?.[c.x]==='#')fail(at,'移動座標が通行不能です');
        if(c.facing!==undefined&&!['north','east','south','west'].includes(c.facing))fail(at,'方角が不正です');
      }
      if(c.op==='object.state.set'){const map=data.maps[c.map];if(!map?.objects.some(o=>o.id===c.object))fail(at,'object.state.setは実在するmap/objectを指定します');}
      if(c.op==='scene.background')reference(data.assets.images,c.asset,at);
      if(c.op==='audio.bgm')reference(data.assets.audio,c.asset,at);
      if(c.op==='audio.se'){reference(data.assets.audio,c.asset,at);if(c.volume!==undefined&&(!Number.isFinite(c.volume)||c.volume<0||c.volume>1))fail(at,'音量は0〜1です');}
      if(['audio.se','effect.play'].includes(c.op)&&c.delay!==undefined&&(!Number.isFinite(c.delay)||c.delay<0||c.delay>5000))fail(at,'遅延は0〜5000msです');
      if(c.op==='effect.play'){reference(data.effects,c.effect,at);if(c.target!==undefined&&!targetValid(c.target))fail(at,'演出の対象が不正です');if(c.target?.startsWith('actor:'))reference(data.actors,c.target.slice(6),at);}
      if(['screen.set','screen.clear'].includes(c.op)&&!layerNameValid(c.layer))fail(at,'レイヤー名が不正です');
      if(c.op==='screen.set'&&(!colorValid(c.color)||!Number.isFinite(c.opacity)||c.opacity<0||c.opacity>.65||(c.shade!==undefined&&typeof c.shade!=='boolean')))fail(at,'画面レイヤーが不正です');
      if(['status.apply','status.remove'].includes(c.op))reference(data.statuses,c.status,at);
      if(c.op==='job.change'){reference(data.actors,c.actor,at);reference(data.jobs,c.job,at);}
      if(c.op==='job.action'){reference(data.actors,c.actor,at);reference(data.fieldAbilities,c.ability,at);}
      if(c.op==='party.join'||c.op==='party.leave')reference(data.actors,c.actor,at);
      if(['set','add','random.set'].includes(c.op)){try{const p=pathParts(c.target);if(!['vars','flags','local'].includes(p[0]))fail(at,'書込先の領域が不正です');}catch(e){fail(at,e.message);}}
      if(c.op==='flag.set'){try{pathParts(`flags.${c.key}`);}catch(e){fail(at,e.message);}}
      if(c.op==='choice'){
        if(!Array.isArray(c.options)||!c.options.length){fail(at,'選択肢が必要です');return;}
        const ids=new Set();for(const option of c.options){if(!option.id||ids.has(option.id))fail(at,'選択肢IDがないか重複しています');ids.add(option.id);if(typeof option.text!=='string')fail(at,'選択肢本文がありません');if(option.condition)expression(option.condition,at);if(option.visibleWhen)expression(option.visibleWhen,at);commands(option.commands,at,depth+1);}
        if(!c.options.some(o=>o.condition===undefined&&o.visibleWhen===undefined))fail(at,'常に選べる選択肢を1つ以上設けてください');
      }
      if(c.op==='if'){commands(c.then,`${at}.then`,depth+1);commands(c.else,`${at}.else`,depth+1);}
      if(c.op==='switch'){for(const item of c.cases??[])commands(item.commands,at,depth+1);commands(c.default,at,depth+1);}
      if(c.op==='random.branch'){if(!Array.isArray(c.branches)||!c.branches.length)fail(at,'分岐が必要です');for(const b of c.branches??[]){if(!(b.weight>0))fail(at,'weightは正です');commands(b.commands,at,depth+1);}}
    });
  };
  errors.push(...validatePresentation(data),...validateJobs(data));
  if(data.game.schemaVersion!==1)fail('game','schemaVersion未対応');
  reference(data.scripts,data.game.startScript,'game.startScript');
  for(const id of data.game.initial.members)reference(data.actors,id,'initial.members');
  if(data.game.initial.members.length>data.system.maxParty)fail('initial.members','人数超過');
  for(const [id,s] of Object.entries(data.scripts))commands(s.commands,`scripts.${id}`);
  for(const [id,formula] of Object.entries(data.formulas))expression(formula,`formulas.${id}`);
  for(const [id,skill] of Object.entries(data.skills)){
    if(!['enemy','ally','self','all_enemies','all_allies'].includes(skill.target)||!Number.isInteger(skill.mp)||skill.mp<0)fail(id,'スキル対象・MPが不正です');
    for(const effect of skill.effects??[]){if(!['damage','heal','guard','status','cleanse','drain_mp','restore_mp','buff','cover','analyze'].includes(effect.type))fail(id,'未知のスキル効果');if(effect.formula)reference(data.formulas,effect.formula,id);if(effect.status)reference(data.statuses,effect.status,id);if(effect.amount!==undefined&&(!Number.isFinite(effect.amount)||effect.amount<0))fail(id,'効果量が不正です');}
  }
  for(const [id,a] of Object.entries(data.actors)){for(const skill of a.skills)reference(data.skills,skill,id);if(a.portrait)reference(data.assets.images,a.portrait,id);}
  for(const [id,e] of Object.entries(data.enemies)){reference(data.assets.images,e.sprite,id);for(const rule of e.ai){reference(data.skills,rule.skill,id);if(!['self','random','weakest'].includes(rule.target))fail(id,'敵の対象選択が不正です');if(rule.condition)expression(rule.condition,id);}}
  if(data.game.tavern){const ids=data.game.tavern.candidates;if(!Array.isArray(ids)||new Set(ids).size!==ids.length)fail('tavern','候補一覧が不正です');else for(const id of ids)reference(data.actors,id,'tavern');}
  for(const [id,e] of Object.entries(data.encounters)){if(!e.enemies?.length)fail(id,'敵が必要です');for(const enemy of e.enemies??[])reference(data.enemies,enemy,id);}
  for(const [id,item] of Object.entries(data.items)){if(item.script)reference(data.scripts,item.script,id);if(item.battleSkill)reference(data.skills,item.battleSkill,id);}
  for(const good of data.shops.goods){reference(data.items,good.item,'shop');if(!Number.isInteger(good.price)||good.price<0)fail('shop','価格不正');}
  for(const service of data.game.services)reference(data.scripts,service.script,'services');
  for(const region of data.regions)reference(data.maps,region.entrance,'region');
  for(const [id,map] of Object.entries(data.maps)){
    if(id!==map.id||!Array.isArray(map.tiles)||!map.tiles.length){fail(id,'マップ構造不正');continue;}
    const width=map.tiles[0].length;
    if(map.tiles.some(row=>typeof row!=='string'||row.length!==width||/[^#.]/.test(row)))fail(id,'タイルは同じ幅の #/. 文字列です');
    const ids=new Set();for(const object of map.objects){
      if(ids.has(object.id))fail(id,`object ID重複: ${object.id}`);ids.add(object.id);
      if(map.tiles[object.y]?.[object.x]!=='.')fail(id,`object座標不正: ${object.id}`);
      if(!['enter','interact'].includes(object.trigger))fail(id,'トリガーが不正です');
      reference(data.scripts,object.script,id);if(object.condition)expression(object.condition,id);
    }
    reference(data.encounters,map.encounter,id);reference(data.assets.images,map.background,id);reference(data.assets.audio,map.music,id);
    if(map.encounterPool!==undefined){if(!Array.isArray(map.encounterPool)||!map.encounterPool.length)fail(id,'遭遇候補が必要です');else for(const e of map.encounterPool){reference(data.encounters,e.encounter,id);if(!Number.isFinite(e.weight)||e.weight<=0)fail(id,'遭遇重みは正数です');}}
    const start=map.entrance;if(map.tiles[start.y]?.[start.x]!=='.')fail(id,'入口不正');
    // Ignore locked objects when checking geometric connectivity; their scripts unlock them.
    const seen=new Set([`${start.x},${start.y}`]),queue=[[start.x,start.y]];
    for(let n=0;n<queue.length;n++){const [x,y]=queue[n];for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const key=`${x+dx},${y+dy}`;if(map.tiles[y+dy]?.[x+dx]==='.'&&!seen.has(key)){seen.add(key);queue.push([x+dx,y+dy]);}}}
    for(const o of map.objects)if(!seen.has(`${o.x},${o.y}`))fail(id,`到達不能: ${o.id}`);
  }
  for(const [id,q] of Object.entries(data.quests)){
    if(q.schemaVersion!==1||q.id!==id||typeof q.title!=='string')fail(id,'依頼定義不正');
    if(q.requires)expression(q.requires,id);for(const o of Object.values(q.outcomes??{}))if(o.requires)expression(o.requires,id);
    if(!q.model?.world?.truth||!q.model?.agents?.length||!Array.isArray(q.model?.reveal?.retroactiveTargets))fail(id,'シナリオモデルが不足しています');
    if(Object.keys(q.outcomes??{}).length<2)fail(id,'結末は2つ以上必要です');
    for(const [name,outcome] of Object.entries(q.outcomes??{}))if(!outcome.text||!Number.isInteger(outcome.gold)||outcome.gold<0||!Number.isInteger(outcome.xp)||outcome.xp<0)fail(`${id}/${name}`,'結末・報酬不正');
    for(const spot of q.locations??[]){const m=data.maps[spot.map];if(!m?.objects.some(o=>o.id===spot.object))fail(id,'依頼の探索地点がありません');}
  }
  return errors;
}
