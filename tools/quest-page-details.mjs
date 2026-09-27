import {catalogContentHash,questCatalog,questEventId,questPages} from './quest-catalog.mjs';
import {describePlace} from './location-catalog.mjs';
import {questPageNotes} from '../authoring/quest-page-notes.mjs';

const code=value=>'`'+String(value)+'`';
const json=value=>JSON.stringify(value);
const block=value=>'```json\n'+JSON.stringify(value,null,2)+'\n```';
const slug=text=>text.toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu,'').trim().replace(/\s/g,'-');
const details=(title,value)=>`<details>\n<summary>${title}</summary>\n\n${block(value)}\n\n</details>`;
const currentActionIds=q=>new Set(q.model.graph.flatMap(n=>n.options.map(o=>o.action??`${n.id}_${o.id}`)));
const currentJourneys=q=>Object.entries(q.story.actions).filter(([id,a])=>a.journey&&currentActionIds(q).has(id));
const sceneLink=(q,id)=>q.model.graph.some(n=>n.id===id)
  ?`[${questEventId(q,'S',id)}](#${slug(`${q.id} / ${id} — ${q.story.scenes[id].title}`)})`
  :`${code(id)}（互換場面）`;

export function questPageIndex(data){
  const out=['# q001〜q010 個別クエスト','',
    '[シナリオ文書へ戻る](scenarios/README.md) ／ [全200件のカタログ](QUEST_CATALOG.md)','',
    '本文、選択肢、結末、イベントID、人物・物品の所在、現地配置を各ページへ集約します。q003〜q010には行為ごとの条件・費用・状態変化と、編集時の確認事項も掲載します。','',
    'q001〜q004は探索・施設への実到着に接続済みです。q005〜q010は開始・調査イベントの実配置と物語内の所在管理があり、物語内の各移動の実マップ接続は未整備です。',''];
  for(const [id,file] of Object.entries(questPages)){
    const q=data.quests[id],journeys=currentJourneys(q).length;
    out.push(`[${id} ${q.title}](${file})：${q.model.graph.length}場面・${Object.keys(q.outcomes).length}結末。${journeys?`${journeys}本の実移動行為。`:'各移動の実マップ接続は未整備。'}`,'');
  }
  out.push('## 保守','',
    'ページ本文は配布JSON、解説は [quest-page-notes.mjs](../authoring/quest-page-notes.mjs)、生成器は [quest-page-details.mjs](../tools/quest-page-details.mjs) と [quest-page.mjs](../tools/quest-page.mjs) が正本です。`npm run build:catalog` で再生成します。ゲーム内容を変える場合は物語原稿・配置原稿を編集して `npm run build:scenarios` を実行します。','',
    'q001・q002の既存配置図は [配置図フォルダ](scenarios/quest-maps/) に保持します。`npm run check:docs` で個別ページ、図、索引、本文内リンクを配布内容と照合します。','');
  return out.join('\n');
}

// Include every map on the connection route to a placement; do not equate logical story places with cells.
function relatedMaps(data,q){
  const targets=new Set(q.events.flatMap(e=>e.points.map(p=>p.map)));
  for(const p of Object.values(q.story.worldPlaces??{})){
    if(p.map)targets.add(p.map);
    if(p.location){
      let location=data.locations[p.location];
      while(location?.parent)location=data.locations[location.parent];
      if(location?.dungeonEntrance)targets.add(location.dungeonEntrance.map);
    }
  }
  const all=new Set();
  for(const target of targets){
    const dungeon=data.dungeons[data.maps[target].dungeon],start=dungeon.entries.main.map;
    const queue=[[start]],seen=new Set([start]);let found;
    for(let i=0;i<queue.length;i++){
      const route=queue[i],current=route.at(-1);
      if(current===target){found=route;break;}
      for(const link of dungeon.systems.connections?.links??[]){
        const next=link.a.map===current?link.b.map:link.b.map===current?link.a.map:null;
        if(next&&!seen.has(next)){seen.add(next);queue.push([...route,next]);}
      }
    }
    if(!found)throw Error(`${q.id}: no map route from ${start} to ${target}`);
    for(const id of found)all.add(id);
  }
  return [...all].map(id=>data.maps[id]);
}

export function detailedQuestPageBundle(data,id,events){
  const q=data.quests[id],s=q.story,notes=questPageNotes[id];
  if(!notes)throw Error(`Missing dedicated quest notes: ${id}`);
  const out=[],add=text=>out.push(text,'');
  const entityName=key=>key==='party'?'探索隊':data.characters[s.entities[key]?.character]?.name??notes.entities[key]??s.places[key]??key;
  const named=key=>`${entityName(key)} (${code(key)})`;
  const costs=value=>Object.entries(value??{}).map(([key,n])=>key==='gold'?`${n}G`:`${data.items[key]?.name??key} (${code(key)}) × ${n}`).join('、')||'なし';
  const destination=a=>a.ending?`[${questEventId(q,'E',a.ending)}](#${slug(`${q.id} 結末 ${a.ending} — ${q.outcomes[a.ending].label}`)})`:sceneLink(q,a.to);
  function effect(e){
    let text;
    switch(e.op){
      case 'move':text=`移動：${e.entities.map(named).join('・')}。${e.path.map(named).join(' → ')}。介助者 ${e.assistant?named(e.assistant):'指定なし'}、運搬者 ${e.carrier?named(e.carrier):'指定なし'}。`;break;
      case 'transfer':text=`受け渡し：${named(e.entity)} を ${named(e.from)} から ${named(e.to)} へ。`;break;
      case 'set':text=`状態更新：${code(e.key)} = ${code(json(e.value))}。`;break;
      case 'observe':text=`認識獲得：${named(e.observer)} が ${named(e.source)} から ${code(e.proposition)}（${s.propositions[e.proposition].text}）を知る。観察条件 ${code(json(e.requires??true))}。`;break;
      default:throw Error(`${id}: undocumented story effect ${e.op}`);
    }
    return (e.when===undefined?'':`適用条件 ${code(json(e.when))}。`)+text;
  }
  add(`# ${id} ${q.title}：詳細・配置・状態変化`);
  add(`[個別ページ一覧](scenarios/quests/README.md) ／ [カタログへ戻る](QUEST_CATALOG.md#${slug(`${id} ${q.title}`)}) ／ [シナリオ本文](#${slug(`${id} ${q.title}`)}) ／ [行為の条件と状態変化](#行為の条件と状態変化) ／ [配置イベント](#配置イベントと操作条件)`);
  add(`作品版 ${data.game.version}。配布JSONから生成した作者向けページ。真相と結末を含む。本編${q.model.graph.length}場面・${Object.keys(q.outcomes).length}結末。`);
  add(`<!-- quest-page-source:${catalogContentHash(data)} -->`);
  add('## 依頼の焦点と分岐の意味');add(notes.focus);
  notes.decisions.forEach(add);
  add('## 実装範囲と場所');
  const journeys=currentJourneys(q);
  add(journeys.length
    ?`${journeys.length}本の移動行為を実装済み。選択時は出発の処理だけを確定し、目的のセル・施設へ実際に到着して場面を続ける。同行者と運搬物、移動中の保存を扱う。`
    :'現地イベントの配置と物語状態は実装済み。ただし worldPlaces と story.journey は未定義で、行為内の move は物語上の所在変更である。本文にある施設や通路を実際に歩いて到達する方式には未接続。以下の物語内経路を実マップの座標や移動完了と読み替えない。');
  for(const [key,name] of Object.entries(s.places)){
    const p=s.worldPlaces?.[key];
    add(`${code(key)}：${name}。${p?describePlace(data,p)+'。':key==='transit'?'移動中を示す内部状態。固定セルではない。':'物語上の場所。個別の実座標・施設IDは未割当。'}`);
  }
  if(id==='q004')add('地下関所の入退室・審査往復は [q004実移動の補足](scenarios/Q004_WORLD_ROUTE.md) を参照する。kindがtownの場所でも、waterway_checkpointは町の広場から直接入る施設ではなく地下の戸口につながる室内である。');
  add('### 物語内の接続');
  for(const edge of s.connections)add(`${edge.map(named).join(' ↔ ')}。`);
  add('## 人物・物品と認識');
  for(const [key,e] of Object.entries(s.entities)){
    const c=data.characters[e.character],r=s.registry[e.holder];
    add(`${named(key)}：${({group:'集団',person:'人物',item:'物品'})[e.kind]??e.kind}。初期の所在・保持者は ${named(r.initial)}、保存項目は ${code(e.holder)}。${c?`${c.role}。${c.goal??''}。`:''}`);
  }
  for(const [key,p] of Object.entries(s.propositions))add(`認識 ${code(key)}：${p.text}。`);
  add(`初期認識：${code(json(s.initialKnowledge??{}))}。固定された過去と探索隊がすでに知る情報は別に扱い、observeの成立で認識を加える。`);
  add('## 本編の進行とイベントID');
  add(`本編場面は ${code(id+'-S-場面キー')}、配置は ${code(id+'-P-配置キー')}、結末は ${code(id+'-E-結末キー')}。S・P・Eは文書用の識別子。Fは強制戦闘、Bは戦闘中イベントで、命令に明示されたidがあればそれを使い、ない戦闘には文書用IDを付ける。全${events.length}IDが一意で、場面を並べ替えても変わらない。`);
  for(const node of q.model.graph){
    const scene=s.scenes[node.id];add(`${sceneLink(q,node.id)}：${scene.title}。物語内の場所 ${code(scene.place)}。`);
    for(const o of node.options){
      const a=s.actions[o.action];
      add(`選択 ${code(o.id)}：${o.text} → ${destination(a)}。行為 [${code(o.action)}](#行為-${o.action})。${o.combat?'戦闘勝利後に行為を確定する。':''}${a.journey?'出発後に実到着を待つ。':''}`);
    }
  }
  const battles=events.filter(e=>e.kind==='fieldBattle'||e.kind==='battleEvent');
  for(const event of battles)add(`${event.kind==='fieldBattle'?'強制戦闘':'戦闘中イベント'}：${code(event.id)}。起動位置と勝敗後の継続は、下記の本編全文のbattle.startを展開した箇所に掲載する。`);
  if(!battles.length)add('現行本編に専用の強制戦闘・戦闘中イベントはない。通常の歩行遭遇と旧調査スクリプトは別に扱う。');
  add('## 配置イベントと操作条件');
  add('配置が保存されていることと、通常プレイで表示されることは同じではない。表示条件・操作条件は別々に評価する。legacyQuestRoutesを要する配置は旧経路用で、現行本編の必須経路へ数えない。');
  for(const e of q.events){
    add(`### ${questEventId(q,'P',e.id)}`);
    add(`${e.title}。実行ID ${code(e.id)}、起動 ${code(e.trigger)}、スクリプト ${code(e.script)}。`);
    for(const p of e.points)add(`配置：${describePlace(data,{kind:'dungeon',dungeon:e.dungeon,...p,event:e.id})}。`);
    add(`表示条件：${code(json(e.visibleWhen??true))}。操作条件：${code(json(e.condition??true))}。`);
    if(e.requirement)add(`必要事項：${e.requirement}`);
    if(e.note)add(`調査記録：${e.note.text}。記録の表示条件：${code(json(e.note.when))}。`);
    if(e.script===q.model.entryScript)add('物語の現在場面・補給後の再開先を呼び出す入口。本編全文は下記へ集約する。');
    else add(details('この配置の実行スクリプト',q.scripts[e.script]??data.scripts[e.script]));
  }
  add(questCatalog(data,'',{questId:id}).trimEnd());
  add('## 状態項目と初期値');
  for(const [key,r] of Object.entries(s.registry))add(`${code(key)}：${r.meaning}。型 ${code(r.type)}、初期値 ${code(json(r.initial))}${r.values?`、許容値 ${code(json(r.values))}`:''}${r.min!==undefined?`、範囲 ${r.min}〜${r.max}`:''}。`);
  add('## 行為の条件と状態変化');
  add('本文の選択と行為IDを対応させ、効果を実行順で記す。条件式は配布JSONの値。資材・所持金不足では支払いも受け渡しも確定しない。実移動では出発効果と到着効果を分ける。');
  for(const [key,a] of Object.entries(s.actions)){
    add(`### 行為 ${key}`);
    if(!currentActionIds(q).has(key))add('互換場面の再開参照として保持する行為。現行本編の場面数・移動本数には含めない。');
    add(`${a.from.map(from=>sceneLink(q,from)).join(' / ')} → ${destination(a)}。条件 ${code(json(a.requires??true))}。費用：${costs(a.cost)}。${a.once===false?'条件を満たせば再実行可能。':'一度だけ確定する。'}`);
    if(a.journey){
      add(`移動先：${describePlace(data,s.worldPlaces[a.journey.to])}。同行者：${a.journey.companions.map(named).join('・')||'探索隊のみ'}。`);
      add('出発時の効果：');(a.depart?.length?a.depart.map(effect):['追加効果なし。移動中の記録を保持する。']).forEach(add);
      add('到着時の効果：');
    }
    (a.effects.length?a.effects.map(effect):['追加の状態更新なし。上記の進行先へ移る。']).forEach(add);
  }
  add('## 資材不足・戦闘後の再開・保存');
  const routes=q.model.interruptionRoutes??[];
  if(routes.length)for(const r of routes)add(`${code(r.from)} / 作業 ${code(r.action)}：必要量 ${costs(r.cost)}。不足選択 ${code(r.option)} → ${code(r.shortage)} で未着手のまま探索へ戻る。補給後は ${code(r.resume)} → ${code(r.from)} で作業場面へ戻る。`);
  else add('現行の作業別資材不足ルートはない。条件付きの選択肢と行為条件は本編全文・行為一覧を参照する。');
  add('共通の中断選択肢はない。メッセージ・判断の途中で閉じた場合は通常の保存位置から再開する。戦闘の逃走・敗北後は本編記載の継続命令に従い、勝利後の作業・費用を先に確定しない。q001固有の老人遭遇への巻戻しを、この依頼にも実装済みとは扱わない。');
  add('## 編集時の確認事項');notes.checks.forEach(add);
  add('以下は改稿・物理接続を行う際の確認観点であり、全項目を実ブラウザで確認済みという記録ではない。今回の検証結果は [PROGRESS.md](PROGRESS.md) を参照する。');
  add('## マップデータと接続定義');
  const maps=relatedMaps(data,q),mapIds=new Set(maps.map(m=>m.id)),dungeonIds=new Set(maps.map(m=>m.dungeon));
  add('実配置へ入口から到達する接続経路上のマップを掲載する。旧経路用の条件付き配置も含むため、全マップの踏破を本編の完了条件とはしない。クエスト配置はeventsから重ね、共通マップのJSONと分ける。');
  for(const dungeonId of dungeonIds){
    const d=data.dungeons[dungeonId];
    add(`### ${d.name} の経路`);
    add(`入口：${code(json(d.entries))}。`);
    for(const link of d.systems.connections?.links??[])if(mapIds.has(link.a.map)&&mapIds.has(link.b.map))add(`${code(link.id)}：${link.name}。${code(link.a.map)} (${link.a.x}, ${link.a.y}) ↔ ${code(link.b.map)} (${link.b.x}, ${link.b.y})。接続方式 ${code(link.kind)}。`);
    add(details('入口・接続・給排水の配布定義',{entries:d.entries,connections:d.systems.connections,water:d.systems.water}));
  }
  for(const map of maps){
    add(`### ${map.id} の全マップJSON`);
    add(`${map.name}・B${map.floor}、${map.tiles[0].length}×${map.tiles.length}セル。[配布JSON](../data/maps/${map.id}.json)。左上(0,0)、xは右、yは下。通行と水位は配布データと迷宮システムの判定に従う。`);
    add(details('共通マップの全データ',{...map,objects:map.objects.filter(o=>!o.quest)}));
  }
  const locations=new Set(Object.values(s.worldPlaces??{}).filter(p=>p.location).map(p=>p.location));
  for(const id of [...locations])for(let l=data.locations[id];l?.parent;l=data.locations[l.parent])locations.add(l.parent);
  if(locations.size)add(details('参照施設と親ロケーション',Object.fromEntries([...locations].map(id=>[id,data.locations[id]]))));
  add(details('クエスト専用の全配置と条件',q.events));
  add(details('物語の場所・状態・行為・結末条件の全定義',s));
  add('## 編集元と再生成');
  add(`本編は [authoring/${notes.source}](../authoring/${notes.source})、配置は [config/quests/${id}.events.json](../config/quests/${id}.events.json)、配布内容は [data/quests/${id}.json](../data/quests/${id}.json)。地形は [config/connected-maps.json](../config/connected-maps.json)、接続・給排水は [config/dungeons/region_1.json](../config/dungeons/region_1.json)、施設は [config/locations.json](../config/locations.json) を参照する。`);
  add('解説と確認観点は [authoring/quest-page-notes.mjs](../authoring/quest-page-notes.mjs)、ページ構成は [tools/quest-page-details.mjs](../tools/quest-page-details.mjs) を編集する。本文を手直しする場合は物語原稿へ反映し、`npm run build:scenarios` で配布データも更新する。文書だけの再生成は `npm run build:catalog`、照合は `npm run check:docs`。`npm run build:docs` 単独は個別ページの本文を保持する。');
  return {[questPages[id]]:out.join('\n').replace(/\n{3,}/g,'\n\n').trimEnd()+'\n'};
}
