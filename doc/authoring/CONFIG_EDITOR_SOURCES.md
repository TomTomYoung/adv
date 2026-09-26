# 編集対象JSONと正本の対応

更新日: 2026-09-25。設定編集UIの対象は `config/` 配下の225原稿JSONです。[使い方と仕様](CONFIG_EDITORS.md)、[全225件のPages URL](CONFIG_EDITOR_URLS.md)、[文書索引](../README.md)。

## 統合マップ画面の出力先

[マップ編集](../../config/map.html)では、表示中のマップを保ったまま複数原稿を編集できます。セル・エッジの配置、通行可否、地点の個別設定、共有種類は `config/cell-layers.json`、既存の篝火マップの基本情報・入口・配置物は `config/kagaribi-content.json`、その他の接続済みマップと新規マップは `config/connected-maps.json` に出力します。マップの所属、仕掛け、接続は選択迷宮の `config/dungeons/<ID>.json`、配置イベントとそのローカル処理は所属クエストの `config/quests/qXXX.events.json` です。

マップ新規作成は `connected-maps.json`、`cell-layers.json`、所属迷宮JSONの3件を一括変更します。接続の作成は迷宮JSONへ追加します。画面の「今回の出力対象」と検証後のJSON全文に実際に変更したファイルだけを表示します。

30種類のセル種の名前・用途・通行・表面模様・パラメータは `config/cell-layers.json` の `presets`、毒沼の進入定義は `events.poison_step`、ダメージと本文は `scripts["cell.poison_step"]` です。仕掛け連動の対象座標・必要物品は各迷宮JSONに残し、セル種の中へ複製しません。

マップサイズは `config/cell-layers.json` の `maps.<ID>.rows` と、有効なマップ原稿の `maps.<ID>.tiles` を同時変更します。JavaScript原稿だけにあるマップは、現在の定義を `config/connected-maps.json` へ引き継いで編集します。流れの配列がある場合は対応する迷宮JSONの `vectorRows` も寸法を合わせます。

エッジ種は同じ `config/cell-layers.json` の `edgePresets`、配置は `maps.<ID>.edges`、セルの個別設定は `maps.<ID>.overrides` です。通行可否タブも同じ場所の `passage` を変更し、別のJSONは作りません。生成結果の `data/edge-types.json` と `data/maps/*.json` は直接編集しません。

## 直接編集する原稿

編集したい内容：クエストの配置・起動・表示条件、調査用の会話と処理 / 編集・出力するJSON：`config/quests/q001.events.json` 〜 `config/quests/q200.events.json`（200件） / 対象の主な項目：`events`、`scripts`

編集したい内容：迷宮の基本設定、火・水・装置・接続、条件付きイベント / 編集・出力するJSON：`config/dungeons/*.json`（下記13件） / 対象の主な項目：基本項目、`maps`、`entries`、`systems`、`fieldEvents`

編集したい内容：通常2Dマップの通行・外観・遮光・照度・通水 / 編集・出力するJSON：`config/cell-layers.json` / 対象の主な項目：`presets`、`edgePresets`、`maps.*.legend/rows/overrides/edges`、`events`、`scripts`

編集したい内容：接続済み2Dマップの名前・入口・配置物・遭遇 / 編集・出力するJSON：`config/connected-maps.json` / 対象の主な項目：`maps`。最終的な通行はセル原稿を優先

編集したい内容：篝火マップ、専用道具・魔物・遭遇・処理 / 編集・出力するJSON：`config/kagaribi-content.json` / 対象の主な項目：`maps`、`items`、`enemies`、`encounters`、`scripts`

編集したい内容：追加迷宮の道具・魔物・遭遇・状態・処理・商品 / 編集・出力するJSON：`config/dungeon-content.json` / 対象の主な項目：`items`、`enemies`、`encounters`、`statuses`、`scripts`、`shopGoods`。別原稿に上書きされる `maps` は編集先を案内

編集したい内容：仲間と追加魔物 / 編集・出力するJSON：`config/entities.json` / 対象の主な項目：`actors`、`monsters`

編集したい内容：職業・技能・探索特技・消費・効果・装備 / 編集・出力するJSON：`config/jobs.json` / 対象の主な項目：`jobs`、`skills`、`fieldAbilities`、`buffs`、`items`、`equipmentPatches`、`formulas`、`initialJobs`、`shopGoods`、`profile`、`skillCues`

編集したい内容：町の場所・背景・親子・施設・人物 / 編集・出力するJSON：`config/locations.json` / 対象の主な項目：場所ごとの設定

編集したい内容：視覚効果・音符・演出の組合せ・行動との対応 / 編集・出力するJSON：`config/presentation.json` / 対象の主な項目：`effects`、`sounds`、`cues`、`bindings`、`ambient`

編集したい内容：壁・装置の素材選択、床の切り出し / 編集・出力するJSON：`config/dungeon-art.json` / 対象の主な項目：`entries`、`assets`、`floor`

編集したい内容：q011〜q020の本文・場面・選択肢・結末 / 編集・出力するJSON：`config/catalog-q011-q020.json` / 対象の主な項目：各シナリオの本文、`nodes`、`outcomes`、`authoringNotes`

編集したい内容：地形用道具・商品・旧開口指定 / 編集・出力するJSON：`config/terrain-content.json` / 対象の主な項目：`items`、`shopGoods`、互換設定の `mapOpenings`

編集したい内容：通常配信外の旧3D地形・処理 / 編集・出力するJSON：`config/voxel-content.json` / 対象の主な項目：`maps.*.voxels`、`scripts`。通常2Dゲームには反映されない

迷宮13件は `config/dungeons/` の `kagaribi.json`、`moving_village.json`、`prayerless_valley.json`、`region_1.json`、`region_2.json`、`region_3.json`、`region_4.json`、`region_5.json`、`region_6.json`、`region_7.json`、`region_8.json`、`region_9.json`、`region_10.json` です。

画面を開くと関連JSONも読み込みますが、読み込んだだけでは出力対象にしません。変更があるJSONだけを列挙して出力します。HTMLの入口と最終的な出力が一対一とは限りません。

## 篝火を編集する例

操作：篝火マップの名前・入口・配置物を変える / 出力先：`config/kagaribi-content.json`

操作：床や壁を塗る、地点だけの遮光・照度を変える / 出力先：`config/cell-layers.json`

操作：q001の壁灯の位置・面・表示条件・壁灯の調査文を変える / 出力先：`config/quests/q001.events.json`

操作：火台の位置・範囲・燃料、無防護時の遭遇率と候補、階層接続を変える / 出力先：`config/dungeons/kagaribi.json`

操作：道具や技能を選んで消費数を変える / 出力先：選択肢内の処理なら `config/quests/q001.events.json`、探索特技・戦闘技能なら `config/jobs.json`

操作：老人救出などq001本筋の台詞・進行を変える / 出力先：JSON編集UIの対象外。`authoring/story-q001.mjs` を編集

火台は迷宮の仕掛け、壁灯はクエスト配置であるため、同じ配置図に見えても正本が異なります。配置を選ぶと正本の編集を開きます。旧原稿で上書きされるマップには、有効な原稿を開くボタンを表示します。

新規2Dマップを作る操作は、現在のマップ原稿の `maps`、`cell-layers.json` のセル配置、選択した迷宮JSONの所属 `maps` を一括変更します。作成後は入口・接続口・配置物を指定し、3ファイルをまとめて反映してください。新しい迷宮JSONやクエストJSON自体を増やす機能ではありません。

## 読み取り専用・対象外

`data/` は生成結果です。画像・道具・人物・技能の候補やSchemaを読むために参照しますが、編集画面から `data/maps/`、`data/quests/`、`data/scripts/`、各データベースへ出力しません。`config/shared/catalog.js` と `reference-catalog.js` も生成索引で、編集対象ではありません。

q001は `authoring/story-q001.mjs`、q002は `authoring/story-q002.mjs`、q004は `authoring/story-q004.mjs`、残るq003〜q010は `authoring/stories-v11-1.mjs` と `stories-v11-2.mjs`、q021以降は `authoring/structures-*.mjs` / `scenarios-*.mjs` が本筋の正本です。人物の正本は `authoring/characters.mjs`。これらをJSON原稿へ自動変換する仕様ではありません。該当処理を選んだ場合は参照専用と表示します。

画像・音声のバイナリ制作、制作記録・ハッシュ・プロンプト、テスト用固定JSON、保存原文、互換セーブ、文献索引、`package.json`、生成済みSchemaと文書集計も対象外です。未知の原稿項目は保持し、必要に応じて補助のJSON取り込みで扱います。
