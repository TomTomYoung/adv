import {createHash} from 'node:crypto';
import {describePlace,questPlaces} from './location-catalog.mjs';

const json=value=>JSON.stringify(value);
const code=value=>'`'+String(value)+'`';
const slug=text=>text.toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu,'').trim().replace(/\s/g,'-');
const detailed=q=>q.number<=20;
const sceneTitle=(q,node)=>`${q.id} / ${node.id}${q.story?.scenes[node.id]?.title?' — '+q.story.scenes[node.id].title:''}`;
const endingTitle=(q,id)=>`${q.id} 結末 ${id} — ${q.outcomes[id].label}`;

// Fingerprint the distributed implementation, not intermediate authoring drafts.
export function catalogContentHash(data){
  return createHash('sha256').update(json({version:data.game.version,quests:data.quests,characters:data.characters,locations:data.locations,dungeons:data.dungeons,maps:data.maps})).digest('hex');
}

export function questCatalog(data,date){
  const quests=Object.values(data.quests).sort((a,b)=>a.number-b.number);
  const out=['# シナリオ一覧','',`全 ${quests.length} 本・${quests.reduce((n,q)=>n+Object.keys(q.outcomes).length,0)} 結末。作品版 ${data.game.version}。更新日: ${date}。`,'',
    `<!-- quest-catalog-source:${catalogContentHash(data)} -->`,'',
    'q001〜q020の改稿全文を各項目へ統合しました。本文・選択肢・選択後の応答・条件分岐・戦闘後の継続は、配布JSONの現在の場面スクリプトから掲載しています。q021〜q200は従来の概要・進行一覧・結末を掲載します。作者向けのため真相と結末を含みます。','',
    'q001〜q010はモデルv1.1と状態モデルadv-story-state/1、q011〜q020はモデルv1.0のcatalog1改稿です。過去の命令列や別名を現行場面として重複掲載しません。条件はJSON式をそのまま記載し、選択の表示条件と成立条件、行為の条件、結末の条件を区別します。','',
    '物語行為の詳細な所在・介助・費用・不変条件は各実装JSONのstoryを参照してください。「行為」は成立時に一括確定します。中断は場面を保持し、戦闘後の作業と支払いは勝利した場合だけ確定します。','',
    '[人物一覧](CHARACTERS.md) ／ [状態モデル](SCENARIO_MODEL_V11.md) ／ [シナリオ設計と編集手順](SCENARIO_DESIGN.md)','',
    '現在の実装から明示的に更新するコマンドは npm run build:catalog です。カタログへ直接加えた改稿は、先にauthoringの正本へ反映してから再生成してください。npm run build:docs は本文を上書きしません。',''];
  const add=text=>out.push(text,'');
  const condition=(label,value)=>{if(value!==undefined&&value!==true)add(`${label}: ${code(json(value))}`);};
  const target=(q,id)=>{
    const scene=q.model.narrative.units.find(n=>n.script===id);
    if(scene){const node=q.model.graph.find(n=>n.id===scene.id);if(!node)throw Error(`${q.id}: missing graph node ${scene.id}`);return `[${code(scene.id)}](#${slug(sceneTitle(q,node))})`;}
    const prefix=q.model.entryScript.replace(/visit$/,'end.');
    if(id.startsWith(prefix)&&q.outcomes[id.slice(prefix.length)]){const key=id.slice(prefix.length);return `[結末 ${code(key)}](#${slug(endingTitle(q,key))})`;}
    throw Error(`${q.id}: unrecognized current scene target ${id}`);
  };
  function commands(q,list,{inChoice=false}={}){
    for(const c of list){
      switch(c.op){
        case 'say':case 'narrate':add(c.text);break;
        case 'choice':
          for(const o of c.options){
            add(`選択 ${code(o.id)}: ${o.text}`);
            if(o.requirement)add(`必要事項: ${o.requirement}。`);
            condition('表示条件',o.visibleWhen);condition('選択条件',o.condition);
            if(!o.commands.length)add('中断して現在の場面を保持します。');
            commands(q,o.commands,{inChoice:true});
          }
          break;
        case 'if':
          add(`［条件 ${code(json(c.condition))} が成立するとき］`);commands(q,c.then??[],{inChoice});
          if(c.else?.length){add('［それ以外］');commands(q,c.else,{inChoice});}
          add('［条件分岐ここまで］');break;
        case 'battle.start':
          add(`戦闘: ${code(c.encounter)}。`);
          for(const [key,label] of [['on_win','勝利後'],['on_escape','逃走後'],['on_lose','敗北後']]){add(`［${label}］`);commands(q,c[key]??[],{inChoice:true});}
          add('［戦闘の継続ここまで］');break;
        case 'jump':add(`進行先: ${target(q,c.script)}。`);break;
        case 'story.journey':{
          const a=q.story.actions[c.action],place=q.story.worldPlaces[a.journey.to];
          add(`出発: ${code(c.action)}。移動先: ${describePlace(data,place)}。`);condition('出発の条件',a.requires);
          add(`この選択は出発処理だけを確定します。実際に目的地へ移動し、「目的地で続きを進める」を選んでから [${code(a.to)}](#${slug(sceneTitle(q,q.model.graph.find(n=>n.id===a.to)))}) へ進み、到着時の処理を確定します。`);break;
        }
        case 'story.action':{
          const a=q.story.actions[c.action];if(!a)throw Error(`${q.id}: missing action ${c.action}`);
          add(`行為: ${code(c.action)}。`);condition('行為の前提条件',a.requires);
          if(a.cost)add(`成立時の消費: ${code(json(a.cost))}。`);break;
        }
        case 'story.scene':{
          const scene=q.story.scenes[c.scene];condition('場面の成立条件',scene.requires);
          const name=c=>data.characters[q.story.entities[c.entity]?.character]?.name??c.entity;
          if(scene.cast?.length)add(`登場: ${scene.cast.map(c=>name(c)+(c.mode==='remote'?'（遠隔会話）':'')).join('・')}。`);
          for(const c of scene.cast??[])condition(`${name(c)}の会話条件`,c.requires);break;
        }
        case 'set':if(inChoice)add(`状態更新: ${code(c.target)} = ${code(json(c.value))}。`);break;
        case 'item.take':add(`消費: ${code(c.item)} × ${c.count}。`);break;
        case 'gold.change':add(`所持金の変化: ${c.amount}G。`);break;
        case 'map.teleport':add(`現地の移動: ${code(c.map)} (${c.x}, ${c.y}${c.z===undefined?'':', '+c.z})。`);break;
        case 'town.return':add('現地の移動: 町へ帰還します。');break;
        case 'fire.portable.set':add(`携行火: 燃料 ${c.fuel}、効果 ${code(c.effect??'消灯')}。`);break;
        case 'object.state.set':add(`物体の状態: ${code(c.map+'/'+c.object)} → ${code(c.state)}。`);break;
        default:throw Error(`${q.id}: catalog renderer needs support for ${c.op}`);
      }
    }
  }
  for(const q of quests){
    add(`## ${q.id} ${q.title}`);
    add(`依頼人: ${q.client}。地域: ${q.region}。${q.unlockHint}`);add(q.brief);
    add(`モデル: ${q.model.standard.version}。実装: [JSON](../data/quests/${q.id}.json)。場面 ${q.model.graph?.length??0}、結末 ${Object.keys(q.outcomes).length}。${q.story?`物語状態の改訂 ${q.story.revision??1}。`:''}`);
    for(const line of questPlaces(data,q))add(line);
    add(`固定された過去: ${q.model.world.truth}`);
    const notes=q.model.world.authoringNotes;
    if(notes){add(`AI向け注釈: ${notes.notice}`);add(`${notes.factsHeading??'事実'}:`);for(const fact of notes.facts)add(fact);}
    if(!detailed(q)){
      for(const [id,o] of Object.entries(q.outcomes))add(`${id} — ${o.label}（${o.gold}G / ${o.xp}EXP）: ${o.text}`);
      add(`進行: ${q.model.progression??'各場面の選択に従う。'}`);
      for(const n of q.model.graph??[])out.push(`1. ${n.id}: ${n.options.map(o=>`${o.text} → ${o.to}${o.combat?'［戦闘］':''}`).join(' / ')}`);
      out.push('');continue;
    }
    add(`進行: ${q.model.progression??'各場面の選択に従います。'}`);
    if(q.story){
        add(`### ${q.id} 実体と初期の所在`);
        for(const [id,e] of Object.entries(q.story.entities)){
          const holder=q.story.registry[e.holder].initial;
          add(`実体: ${data.characters[e.character]?.name??id} (${code(id)})。初期の所在・保持者: ${q.story.places[holder]??data.characters[q.story.entities[holder]?.character]?.name??holder} (${code(holder)})。`);
        }
    }
    for(const node of q.model.graph){
        const unit=q.model.narrative.units.find(u=>u.id===node.id),script=q.scripts[unit?.script];
        if(!script)throw Error(`${q.id}: missing implemented scene ${node.id}`);
        add(`### ${sceneTitle(q,node)}`);add(`実装場面: ${code(unit.script)}。`);
        const place=q.story?.worldPlaces?.[q.story.scenes[node.id]?.place];
        if(place)add(`場面の現在地: ${describePlace(data,place)}。`);
        commands(q,script.commands);
    }
    for(const [id,o] of Object.entries(q.outcomes)){
      add(`### ${endingTitle(q,id)}`);add(o.text);add(`${o.gold}G / ${o.xp}EXP`);condition('結末の成立条件',o.requires);condition('物語の結末条件',q.story?.endings[id]);
    }
  }
  return out.join('\n').replace(/\n{3,}/g,'\n\n').trimEnd()+'\n';
}
