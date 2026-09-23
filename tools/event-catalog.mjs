const code=v=>'`'+v+'`';
export function battleSites(data){
 const found=[];
 function walk(value,script,path){
  if(!value||typeof value!=='object')return;
  if(value.op==='battle.start')found.push({script,path,command:value});
  for(const [key,child] of Object.entries(value))if(child&&typeof child==='object')walk(child,script,[...path,key]);
 }
 for(const [id,s] of Object.entries(data.scripts))walk(s.commands,id,['commands']);
 return found;
}
export function eventCatalog(data){
 const out=[],add=s=>out.push(s,'');
 add('# フィールドイベント・戦闘中イベント一覧');
 add(`作品版 ${data.game.version}。配布データから生成する実装一覧。[q001の位置・全文](QUEST_Q001.md) ／ [イベント仕様](EVENT_SYSTEM.md) ／ [命令仕様](SCRIPT_REFERENCE.md) ／ [セル照明](FIELD_LIGHTING.md)。`);
 add('## 実装した処理');
 add('1. フィールドの会話・地の文・選択・条件分岐・物語行為・実移動待ち。配置のenter（セル進入）／auto（条件自動）／interact（調査）／action（個別操作）と、出現条件・操作条件・状態・一度限りの記録で起動を制御する。セル進入と物語の到着は正面ではなく足元の実座標で判定する。');
 add('2. フィールドの強制戦闘。`battle.start` が現在の命令位置を保存して指定encounterを開始する。勝利・敗北・逃走後はそれぞれ `on_win`・`on_lose`・`on_escape` へ進む。');
 add('3. 戦闘中のイベント。`events` の各IDを戦闘開始時 `start`、第2ラウンド以降の開始時 `round_start`、戦闘結果の確定前 `before_end` に判定する。条件成立した未実行イベントを定義順に1件ずつ実行し、各IDは1戦に1度だけ発火する。');
 add('4. 戦闘中の会話・選択中は戦闘操作を止める。イベントの末尾まで進めた場合は戦闘または保留中の通常終了処理を再開する。`battle.end` があれば強制終了し、`on_interrupt` からフィールドの会話へ戻れる。');
 add('5. 強制終了は `records.interruptions` に記録し、勝利・逃走・撃退回数や戦闘報酬を増やさない。すでに倒した敵の撃破数は保持する。戦闘イベントの実行済みID・現在の命令位置・保留結果を保存し、会話中でも重複せず再開する。');
 add('## セルレイヤーからのイベント');
 add('通常2Dはセル種と地点上書きのeventsからenterイベントを参照する。判定は実占有セルだけで、既存オブジェクト進入・旅程到着の後、クエスト条件イベントの前。会話・戦闘中は待機し、入場ごとの実行済みIDと地点単位の一回性を保存する。HP減算や戦闘開始は参照先スクリプトで行う。[セル仕様](CELL_LAYERS.md)。');
 add(`本編のセルイベント定義は${Object.keys(data.cellEvents??{}).length}件。新たな危険床は配置していない。環境変化を購読する迷宮の条件付きイベントは次節を参照。`);
 for(const [id,e] of Object.entries(data.cellEvents??{}))add(`${code(id)}：${code(e.trigger)} → ${code(e.script)}、一回性 ${e.once}。`);
 add('## 環境変化を購読する迷宮イベント');
 add('迷宮原稿のfieldEventsを通知種別と現在の迷宮で索引化し、保留候補だけを定義順に判定する。進入・移動完了・灯火・物体・命令での状態変更を通知し、毎フレーム走査しない。占有セルのレイヤー・合成照度・固有システムの環境値を条件に使う。一回性はonce、入場単位はentry、新しい通知での再評価はchange。保留中の会話・戦闘も保存する。[記法と再発](EVENT_SYSTEM.md)。');
 for(const d of Object.values(data.dungeons??{}))for(const e of d.fieldEvents??[])add(`${code(`${d.id}/${e.id}`)} ${e.title}：購読 ${e.watch.map(code).join(' / ')}、再発 ${code(e.repeat)}、条件 ${code(JSON.stringify(e.condition))} → ${code(e.action.type)} ${code(e.action.encounter??e.action.script)}。[原稿](../authoring/dungeons/${d.id}.json)。`);
 add('通常のくらがり襲撃はfire_network.dangerから削除した。火の部品は保護・燃料などの値を提供し、共通イベントが発火と戦闘開始を管理する。普通の火で明るくても魔除けがなければ襲われる。戦闘開始時には保留中の環境battle候補を消費し、同じ歩行から物語戦闘と通常襲撃を二重発火させない。向き変更・コマンドの開閉・取消・戦闘終了だけでは再発しない。');
 add('## 専用処理を維持する理由');
 add('旅程到着はすでに共通のarriveEventで実座標・町施設と到着効果を処理する。迷宮限定fieldEventsへの重複登録はしない。クエストautoは受注中クエストのautoだけを候補にする。');
 add('power_gridの守護者は系統操作・部品接続・戦闘対象装置ID・勝利時の状態更新が一体のため、汎用式への分解による二重管理を避ける。air_supplyの全滅救助はHP更新直後の敗北処理で、条件付き戦闘ではないため専用処理を維持する。水位・腐食・地形変更・通常ランダム遭遇も更新順と乱数規則を維持する。');
 add('## 現行q001のイベント');
 add('`q001_decision` (2, 1) の新人、`q001_return` (9, 1) の巡灯路・帰路、`q001_elder` (13, 3) の老人はセル進入で自動開始する。進行中の場面・目的地に対応するイベントだけが始まる。上部の目的地と継続ボタンは削除済み。');
 add('`q001-F-kuragari`：`kagaribi_f1` (9, 1) の帰路。消灯会話の後、`kuragari_hunt` と強制戦闘。起点は `q001.v11.outage`。');
 add('`q001-B-rookie`：同じ位置。第1ラウンド終了後に新人が登場して発言。セリフを送ると `outage_call` で新品油1を消費し、くらがり除けの携帯松明を25歩分点灯。`battle.end` → `on_interrupt` → `q001.v11.rescue` で現地の救助会話へ移る。1ラウンドより早い勝利・逃走・撃退も確定前にこのイベントを通る。到着前の全滅は通常敗北で、救助は未成立のまま再挑戦できる。');
 add('## 登録済みの戦闘中イベント');
 const sites=battleSites(data);
 for(const s of sites)for(const e of s.command.events??[])add(`${code(e.id)}：${code(s.script)} / ${code(s.path.join('.'))}。判定 ${e.triggers.map(code).join(' / ')}。条件 ${code(JSON.stringify(e.condition??true))}。命令 ${e.commands.map(c=>code(c.op)).join(' → ')}。`);
 add('## フィールドのクエスト配置一覧');
 add('IDはクエストIDと配置IDの組で一意。配置と起動条件の正本は各クエストのevents。表示・操作条件の詳細はリンク先JSONを参照する。');
 for(const q of Object.values(data.quests)){
  add(`### ${q.id} ${q.title}`);
  for(const e of q.events??[])add(`${code(`${q.id}/${e.id}`)} ${e.title}：${e.points.length?e.points.map(p=>`${code(p.map)} (${p.x}, ${p.y}${p.z===undefined?'':`, ${p.z}`})${p.edge?` ${p.edge}面`:''}`).join(' / '):'セル指定なし'}。起動 ${code(e.trigger)} → ${code(e.script)}。[定義](../data/quests/${q.id}.json)。`);
 }
 add('## マップ共通の配置一覧');
 for(const map of Object.values(data.maps)){
  add(`### ${map.id} ${map.name}`);
  for(const o of map.objects.filter(o=>!o.quest))add(`${code(`${map.id}/${o.id}`)}：(${o.x}, ${o.y}${o.z===undefined?'':`, ${o.z}`}) ${code(o.kind??o.type??'object')}、起動 ${code(o.trigger??'interact')} → ${code(o.script??'地形・装置処理')}。[定義](../data/maps/${map.id}.json)。`);
 }
 add('## battle.startの定義位置');
 add('現在の進行と旧進行の互換定義を含む全スクリプトの静的索引。ここに載るだけでは現在のクエスト経路から到達するとは限らない。q001の現行経路は上記専用IDを使う。');
 for(const s of sites)add(`${code(s.command.id??`${s.script}/${s.path.join('.')}`)}：${code(s.script)} / ${code(s.path.join('.'))} → ${code(s.command.encounter)}${s.command.events?.length?`、戦闘中イベント ${s.command.events.map(e=>code(e.id)).join(' / ')}`:''}。`);
 add('## 再生成');add('`npm run build:catalog` または `npm run build:docs` で更新する。`npm run check:docs` が配布データとの差異を検出する。');
 return out.join('\n');
}
