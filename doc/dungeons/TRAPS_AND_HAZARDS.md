# トラップ・ダメージ床・環境危険

実装日: 2026-10-12。作品版1.25.0。セル進入イベントの4方式、9種の標準パッケージ、漏水・ガス漏れを実装した。制作機能の追加であり、既存迷宮へ危険を一括配置する変更ではない。

[セル・エッジ](CELL_LAYERS.md) ／ [状態異常](../battle/STATUS_EFFECTS.md) ／ [火](FIRE_SYSTEM.md) ／ [配置物](DUNGEON_PACKAGES.md)

## 進入イベントの4方式

正本は [config/cell-layers.json](../../config/cell-layers.json) の `events`。新しい `occurrence` と旧来の `once` はどちらか一方を指定する。

発生方式：毎回・無制限 / chance：1 / maxCount：null

発生方式：確率・無制限 / chance：0〜1 / maxCount：null

発生方式：毎回・N回まで / chance：1 / maxCount：正の整数N

発生方式：確率・N回まで / chance：0〜1 / maxCount：正の整数N

`reset` は必須で、`never` は永久消費、`reentry` は迷宮から出て新しい探索を始めたときに回復、`manual` は `cell.event.reset` 命令による再装填。区画移動・室内への出入り・保存再開では回復しない。再装填した足元のイベントは、その場で再発動せず次の進入を待つ。

外れでは発生回数を消費しない。同じ進入中の旋回・描画・後続会話・保存再開で再抽選しない。条件不成立は未判定として残し、条件成立後に一度だけ抽選する。確率0と1では乱数を消費しない。発生回数は `state.events["cell/<map>/<x>,<y>/<id>"]` に保存し、同じ定義を複数セルに置いても各セルで独立する。旧 `once:true/false` は毎回・1回／無制限として保持する。

```json
{
  "trigger": "enter",
  "occurrence": {"chance": 0.25, "maxCount": 3, "reset": "manual"},
  "package": {"kind": "arrow", "damage": 8, "target": "leader"}
}
```

セルの `events` にこの定義のIDを指定する。編集画面の「進入イベントの発生方式」から4方式を選べる。`script` と `package` は排他。パッケージは生成時に `cell.package.<id>` という通常スクリプトへ展開する。

## 標準パッケージ

kind：rockfall / 標準の効果：8ダメージ / 個別に指定するもの：damage、target

kind：cave_in / 標準の効果：24ダメージ＋閉鎖 / 個別に指定するもの：patchesに塞ぐ対象

kind：needle / 標準の効果：衰弱 / 個別に指定するもの：statusesで異常と持続

kind：arrow / 標準の効果：6ダメージ＋衰弱 / 個別に指定するもの：damage、statuses

kind：gas / 標準の効果：重度衰弱 / 個別に指定するもの：statuses

kind：magic_circle / 標準の効果：魔力障害、または指定した魔物との戦闘 / 個別に指定するもの：encounter、statusesで併用も可能

kind：pit / 標準の効果：指定地点への移動 / 個別に指定するもの：destinationのmap/x/y、任意のfacing

kind：explosion / 標準の効果：24ダメージ＋破壊 / 個別に指定するもの：patchesに破壊対象。空配列なら地形変更なし

kind：drip / 標準の効果：現在の火を消す / 個別に指定するもの：extinguish。省略時はportable

ダメージは共通の罠軽減 `trapDamage` を適用する。`target` は `party`（全生存者、既定値）または `leader`（先頭の生存者）。状態異常は免疫・死亡・環境による効果停止を含め、戦闘・通常スクリプトと共通の規則を使う。針・ガス等の標準数値は設定で変更できる。

`statuses` は例として `[{"status":"weakened","duration":{"steps":12,"turns":3}}]`。指定しなければパッケージと状態定義の既定値、空配列なら異常付与なし。`message:false` で標準の結果文を省略できる。追加の `script` は効果・移動・戦闘の後に呼ばれる。

空間参照のない落石・針・矢・ガス・魔法陣・落滴は `trap_rockfall` 等の進入イベントとして登録済み。落盤・落とし穴・爆発は編集画面の種類選択から作成し、各迷宮の対象を明示する。

## 地形変更と落下

`patches` は同じ `map.patch` 処理へ接続する。

対象：セル / 指定例：`{"map":"region_2_f1","x":4,"y":1,"preset":"stone_wall"}`

対象：共有エッジ / 指定例：`{"map":"region_2_f1","edge":"v:4,1","preset":"stone_partition"}`

対象：配置物 / 指定例：`{"map":"region_2_f1","object":"door_id","state":"open"}`（実在するIDを指定）

セルを開く場合は `stone_floor`、エッジを開く場合は `open_passage` などを指定する。セル・エッジ変更は `state.mapChanges`、配置物の変更は既存の `state.objects` へ保存する。再入場・保存再開で維持し、修理時は変更命令で戻す。セル種の置換は通行・外観・遮光・イベントを一式で置き換える。入口や配置物を壁セルで埋める指定は検証で拒否し、足元の壁化は実行しない。専用仕掛けが管理する障害物は、その仕掛けの状態変更を追加スクリプトから行う。

ダメージ・異常・地形変更・消火を処理してから全滅を判定する。全滅時は通常の救助へ戻る。落下先は通常の通行検査を通る。処理順は、配置物の進入イベント→旅程到着／保存された物語到着→セルイベント→クエスト条件→環境条件。会話・戦闘中は後続処理を待つ。

スクリプト内の転送では `fieldEntry.history` に到着履歴を保存する。落とし穴A→B→Aのような循環でも、その移動連鎖で試行済みのイベントを再実行しない。実際の次の歩行で新しい進入となる。

## 火と相互作用する環境危険

各迷宮原稿の `hazards` に、ID、名前、対象セルの `points`、原因が残っている間にtrueとなる `condition` を指定する。修理フラグ等を通常のスクリプトで変更すると解除される。歩数や入場回数で自動解除しない。

```json
{
  "id": "broken_pipe",
  "name": "破損した配管",
  "kind": "gas_leak",
  "points": [{"map":"kagaribi_f1","x":2,"y":1}],
  "condition": {"op":"ne","left":{"ref":"flags.pipeFixed"},"right":true},
  "explosion": {"damage":24,"patches":[]}
}
```

`water_leak` は着火を費用支払前に禁止する。既に点いている火は消さない。`gas_leak` は着火の燃料・MP・種火を消費し、火を点けずに標準爆発を発生させる。両方あるセルでは漏水を優先し、爆発も費用消費も起こさない。固定火台はその設置セル、携行火は現在セルで判定する。技能点火、移火、道具、物語の携行火操作もCore側の同じ判定を通す。撃退技能の引火は戦闘内で被害を処理し、撃退を成功扱いにしない。

今回、点灯した火の持ち込み、隣の火からの延焼、守護範囲の到達では発火させない。点灯中の給油は着火操作に含めない。入場時の支給火も持ち込みとして扱う。

落滴は漏水とは別の進入トラップ。`extinguish` に `portable` または `fire_network` の固定火台IDを指定する。現在の燃料規則に合わせ、消灯時は効果null・燃料0とする。器・油の定義は変更しない。q001の物語壁灯は別の配置物状態であり、通常の固定火台IDと混同しない。

## 編集・生成・検証

進入イベントは [セル編集](../../config/cell-layers.html)、漏水・ガス漏れは各迷宮の編集画面の「環境危険」で編集する。`node tools/build-schemas.mjs` → `npm run build:dungeons` → `npm run check` → `npm run check:docs` で再生成・検査する。状態異常定義は [config/dungeon-content.json](../../config/dungeon-content.json)。

共通処理は [dungeon-packages.js](../../src/core/dungeon-packages.js)、[event-occurrence.js](../../src/core/event-occurrence.js)、[hazard-effects.js](../../src/core/hazard-effects.js)。検証は [dungeon-packages.test.mjs](../../tests/dungeon-packages.test.mjs) と既存のセル・火・物語回帰試験を参照する。
