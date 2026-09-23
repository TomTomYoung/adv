# セルレイヤーとプリセット

更新日: 2026-09-23。作品版1.16.0。通常ロードする33件の2Dマップに適用済みです。

## 正本と生成

[authoring/cell-layers.json](../authoring/cell-layers.json) がセル種プリセット・配置・例外上書き・セルイベントとそのスクリプトの正本です。`presets` を `data/cell-types.json`、`events` を `data/cell-events.json`、`scripts` を `data/scripts/cell-events.json`、`maps` を各 `data/maps/*.json` の `cells` へ生成します。既存マップ原稿にある `tiles` は旧生成工程の中間値であり、最終的な通行配置はこの原稿から生成した値で置き換えます。セル配置を変更するときは既存原稿の `tiles` だけを変更しないでください。オブジェクト・接続口の配置は従来の各原稿で管理します。

`npm run build:scenarios` は従来の生成を済ませた後、[build-cell-layers.mjs](../tools/build-cell-layers.mjs) でレイヤーを反映します。全33マップの配置が必須で、欠落・ロードされないマップ・未知プリセット・不正な上書きを拒否します。`config/` への整理と対応する編集HTMLは、ハンドオフの後続作業です。

## レイヤーの独立性

`passage` は `.` が通行可候補、`#` が通行不可です。材質、床、壁の見た目、遮光、水密を含みません。扉・区画水没・固有環境による追加の通行制限は別に判定します。`tiles` はこの通行値だけを文字列へ投影した生成データです。ロード時はプリセット・上書きから得た値との一致を検査します。

`visual.wall` は壁としての表示、`visual.floor` は床面の表示、`visual.opaque` は視線・光を遮る表示です。それぞれ独立しています。`visual.material` はダンジョン素材の `floor` または `wall` を参照します。`visual.image` に画像アセットIDを指定すると、その地点では画像全体を使い、`null` なら素材参照へ戻します。画像を変更しても通行は変わりません。

`parameters.illumination` は0〜8の局所的な明るさの下限です。たいまつの距離減衰結果との大きい方を表示・ミニマップへ渡します。周囲へ放射する光源ではありません。`parameters.water_passable` は水が入れる区画内セルを明示し、通常の区画水没の水面表示に使います。給排水・水密扉・区画全体の入場禁止は引き続き `compartment_water` と `map_connections` が担当します。この値だけでセル間の流体計算や新しい水密境界は生成しません。固有の数値・真偽値・文字列パラメータも追加でき、セルイベントの条件から `cell.parameters.<名前>` を参照できます。

`events` はフィールドイベントIDの配列です。セル種はイベントへの参照だけを持ち、HPの減算や戦闘開始の処理を持ちません。宝箱・人物・火台・レバーは配置物、扉・水門・壁面はエッジ側の定義として管理します。エッジ上のたいまつと調査候補の統合は後続作業です。

## 配置と一点だけの上書き

配置は `legend` が一文字とプリセットIDを結び、`rows` がその文字を並べます。`F` と `W` は配置原稿内の凡例であり、エンジンに固定されたセル種ではありません。現在は `stone_floor` と `stone_wall` の二つを使用し、既存の通行・見た目を保っています。

`overrides` は `x,y` をキーとして、一地点のレイヤーや値だけを上書きします。`visual` と `parameters` は項目単位でマージし、`events` は配列全体を置き換えます。空配列ならその地点のセルイベントを解除します。共有プリセットは変更しません。

次は同じ床の見た目を保ちながら通行だけを拒否する地点と、画像・局所照度だけを変える地点の例です。例の画像IDには実在するアセットを指定してください。

```json
{
  "2,1": {"passage": "#"},
  "3,1": {
    "visual": {"image": "corridor"},
    "parameters": {"illumination": 5}
  }
}
```

## セル進入イベント

イベント定義は `trigger: enter`、スクリプトIDの `script`、一回性の `once`、任意の `condition` を持ちます。実際に占有したセルのイベントだけを取得し、正面のセル、旋回、描画のたびに全配置を走査しません。セル進入後に他の会話が続いている場合は、操作処理が再び待機状態へ戻った時に未処理の候補を再開します。条件が成立しなかった候補は、その入場中の後続操作で再評価されます。

判定順は、既存オブジェクトの進入イベント、旅程の実到着、セルイベント、クエストの条件イベントです。同じセル内のイベントは配列順です。会話・戦闘中には次のイベントを始めません。引数は `map`、`x`、`y`、`event` をスクリプトの `local.args` へ渡します。

`fieldEntry.fired` に `cell:<イベントID>` を保存し、同じ入場中の再実行を防ぎます。`once: false` は再入場ごとに実行可能、`once: true` は `cell/<map>/<x>,<y>/<イベントID>` の実行記録でその地点につき一度です。同じプリセットを別の地点へ置いた場合、その地点は独立して発火します。会話・戦闘中の保存と再開も同じ記録を使います。初期配置・明示された転送も入場として扱います。

毒の沼地を作る場合、プリセットの `events` に `poison_step` を指定し、イベントから次のような通常スクリプトを呼びます。現行のゲーム配置へ毒床を新たに追加したわけではなく、動作例は [cell-layers.test.mjs](../tests/cell-layers.test.mjs) で検証しています。

```json
{
  "events": {
    "poison_step": {"trigger": "enter", "script": "cell.poison_step", "once": false}
  },
  "scripts": {
    "cell.poison_step": {
      "commands": [
        {"op": "actor.damage", "target": "party", "amount": 3},
        {"op": "narrate", "text": "毒の沼地を踏んだ。"}
      ]
    }
  }
}
```

## 状態で変わるレイヤー

植物、封印、取引、浮上装置、動力扉、天球儀と巨獣の地形パッチは、通行値 `tile` と変更後の `layers` を別々に持ちます。破壊壁は開通時に適用する `openedLayers` を持ちます。現在の原稿では変更後の表示・パラメータ・イベント配列を明記し、`tile` の文字から見た目を推測しません。解除時は元のセルプリセットと地点上書きへ戻ります。複数部品が同じ項目を変更すると定義順の後の変更を採用するため、意図しない重複は避けます。

[dungeonCell](../src/core/dungeons.js) が描画とセルイベントへ現在のレイヤーを提供し、`dungeonTile` は通行値だけを提供します。通常のSchemaは [cell-types.schema.json](../data/schemas/cell-types.schema.json)、[cell-events.schema.json](../data/schemas/cell-events.schema.json)、[原稿Schema](../data/schemas/cell-layers-authoring.schema.json)、[マップSchema](../data/schemas/map.schema.json) です。ランタイム検証では参照・寸法・通行投影・イベントとパッチの内容も検査します。

## 退避実装と次の作業

旧3D・旧潮汐マップは従来の意味を [legacy-cell-layers.js](../src/core/legacy-cell-layers.js) の専用アダプターへ隔離しました。通常データの `game.cellLayerVersion: 1` では使いません。退避原稿は変更せず、専用テストも維持します。内容版1.15.0以前のセーブは移行せず、新規開始します。

1.17.0で環境変化の購読・再発条件・くらがりの戦闘開始を共通イベントへ統合しました。`fire_network.danger` は削除し、火は保護状態などの値を提供します。迷宮原稿のfieldEventsから `field.cell.parameters` と `field.illumination` を条件に使えます。[条件付きイベント](scenarios/EVENT_SYSTEM.md)。セル進入イベントを増やす際も、同じ危険を二重登録しないでください。
