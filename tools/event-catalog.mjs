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
 add(`作品版 ${data.game.version}。配布データから生成する実装一覧。[q001の位置・全文](QUEST_Q001.md) ／ [命令仕様](SCRIPT_REFERENCE.md) ／ [セル照明](FIELD_LIGHTING.md)。`);
 add('## 実装した処理');
 add('1. フィールドの会話・地の文・選択・条件分岐・物語行為・実移動待ち。配置のinteract／step／actionと、出現条件・操作条件・状態・一度限りの記録で起動を制御する。');
 add('2. フィールドの強制戦闘。`battle.start` が現在の命令位置を保存して指定encounterを開始する。勝利・敗北・逃走後はそれぞれ `on_win`・`on_lose`・`on_escape` へ進む。');
 add('3. 戦闘中のイベント。`events` の各IDを戦闘開始時 `start`、第2ラウンド以降の開始時 `round_start`、戦闘結果の確定前 `before_end` に判定する。条件成立した未実行イベントを定義順に1件ずつ実行し、各IDは1戦に1度だけ発火する。');
 add('4. 戦闘中の会話・選択中は戦闘操作を止める。イベントの末尾まで進めた場合は戦闘または保留中の通常終了処理を再開する。`battle.end` があれば強制終了し、`on_interrupt` からフィールドの会話へ戻れる。');
 add('5. 強制終了は `records.interruptions` に記録し、勝利・逃走・撃退回数や戦闘報酬を増やさない。すでに倒した敵の撃破数は保持する。戦闘イベントの実行済みID・現在の命令位置・保留結果を保存し、会話中でも重複せず再開する。');
 add('## 現行q001のイベント');
 add('`q001-F-kuragari`：`kagaribi_f1` (9, 1) の帰路。消灯会話の後、`kuragari_hunt` と強制戦闘。起点は `q001.v11.outage`。');
 add('`q001-B-rookie`：同じ位置。第1ラウンド終了後に新人が登場して発言。セリフを送ると `outage_call` で新品油1を消費し、くらがり除けの携帯松明を25歩分点灯。`battle.end` → `on_interrupt` → `q001.v11.rescue` で現地の救助会話へ移る。1ラウンドより早い勝利・逃走・撃退も確定前にこのイベントを通る。到着前の全滅は通常敗北で、救助は未成立のまま再挑戦できる。');
 add('## 登録済みの戦闘中イベント');
 const sites=battleSites(data);
 for(const s of sites)for(const e of s.command.events??[])add(`${code(e.id)}：${code(s.script)} / ${code(s.path.join('.'))}。判定 ${e.triggers.map(code).join(' / ')}。条件 ${code(JSON.stringify(e.condition??true))}。命令 ${e.commands.map(c=>code(c.op)).join(' → ')}。`);
 add('## フィールドのクエスト配置一覧');
 add('IDはクエストIDと配置IDの組で一意。配置と起動条件の正本は各クエストのevents。表示・操作条件の詳細はリンク先JSONを参照する。');
 for(const q of Object.values(data.quests)){
  add(`### ${q.id} ${q.title}`);
  for(const e of q.events??[])add(`${code(`${q.id}/${e.id}`)} ${e.title}：${e.points.map(p=>`${code(p.map)} (${p.x}, ${p.y}${p.z===undefined?'':`, ${p.z}`})`).join(' / ')}。起動 ${code(e.trigger)} → ${code(e.script)}。[定義](../data/quests/${q.id}.json)。`);
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
