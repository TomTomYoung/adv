# doc 全ファイル照合記録

確認日: 2026-09-18。対象はPR #25反映後のmaster `16da1ddc2b82b9b9bb503083295a97609a2ad557`、作品版1.14.0。配布JSON、正本、Core・Application・View、文書生成器を参照しました。古い版番号へ最新の日付だけを追加する方式をやめ、本文の現在の仕様・実装済み範囲を更新しました。

## 現行仕様と履歴

[CURRENT_STATUS.md](CURRENT_STATUS.md)、[SPEC.md](SPEC.md)、[HANDOFF.md](HANDOFF.md)、[PROGRESS.md](PROGRESS.md)、[README.md](README.md)を現行の入口へ整理しました。PR #25は未送信ではなくマージ済みです。内容版1.14.0、10町施設・33件の2Dマップ・200クエスト・629結末、q001改訂4、51命令・31演算子へ照合しました。

旧HANDOFF・PROGRESS・本監査の版別追記は[2026-09-18の保存原文](legacy/2026-09-18/README.md)へコピーし、SHA-256と元コミットをmanifestへ記録しました。従来の2026-09-14保存原文も書き換えていません。

## シナリオ・クエストの整理

[scenarios/README.md](scenarios/README.md)を追加し、カタログ、q001・q002専用ページ、シナリオ設計、状態モデル、探索と常体化、人物、クエストイベント、イベント仕様・一覧、命令リファレンス、配置図をまとめました。data/とauthoring/のゲーム用ファイルは移動していません。

[QUEST_Q002.md](scenarios/QUEST_Q002.md)は現在の骨の荷札を配布JSONから生成します。8場面・3結末、1配置、選択肢内の強制戦闘を含む13個の文書ID、3マップ、6本の移動行為、標本室・審査所、証拠・同意・代償を掲載します。本文をカタログと重複管理せず、カタログからリンクします。q001の町から出発する説明と、両専用ページ・カタログの到着説明も現在の自動進行へ修正しました。

[QUEST_EVENTS.md](scenarios/QUEST_EVENTS.md)は413定義、402物体配置、13操作調査、共通109物体へ更新しました。[SCENARIO_DESIGN.md](scenarios/SCENARIO_DESIGN.md)と[SCENARIO_MODEL_V11.md](scenarios/SCENARIO_MODEL_V11.md)はq002の独立原稿、q001改訂4、実座標同期と移動途中の保存を修正しました。モデルv1.1と作品版1.14.0は別の版です。

## 探索・水・UI

[WORLD_LOCATIONS.md](WORLD_LOCATIONS.md)のq002を旧地下水道 (11, 9) から現在の荷揚げ場 (5, 1) へ修正し、町施設からの直接出発と実到着を記述しました。[CONNECTED_2D_MAPS.md](CONNECTED_2D_MAPS.md)、[MESSAGE_AND_COMMAND_WINDOWS.md](ui/MESSAGE_AND_COMMAND_WINDOWS.md)、[VIEW_CONTRACT.md](ui/VIEW_CONTRACT.md)、[EVENT_SYSTEM.md](scenarios/EVENT_SYSTEM.md)を照合し、廃止した常設操作パネル・到着ボタン・帰還モーダルを現在の操作として案内しません。

[CELL_CATALOG.md](CELL_CATALOG.md)、[MAP_CELLS_AND_BOUNDARIES.md](MAP_CELLS_AND_BOUNDARIES.md)、[WATERWAYS_SALT_MINE.md](WATERWAYS_SALT_MINE.md)、[VOXEL_TERRAIN_AND_WATER.md](VOXEL_TERRAIN_AND_WATER.md)は現行の区画給排水と退避3D・潮汐の範囲を分離しました。[DUNGEON_SYSTEM_DESIGN.md](DUNGEON_SYSTEM_DESIGN.md)は登録16部品と通常使用14部品を区別しました。旧3Dを削除・再導入していません。

[DUNGEON_CATALOG.md](DUNGEON_CATALOG.md)、[DUNGEON_SYSTEMS_1_7.md](DUNGEON_SYSTEMS_1_7.md)、[KAGARIBI_DUNGEON.md](KAGARIBI_DUNGEON.md)、[DUNGEON_ART_AND_SCENARIOS.md](DUNGEON_ART_AND_SCENARIOS.md)、[FIELD_LIGHTING.md](FIELD_LIGHTING.md)の現行範囲・参照を確認しました。[DUNGEON_REVISION_1_9.md](DUNGEON_REVISION_1_9.md)と[DUNGEON_RENDER_REVIEW.md](ui/DUNGEON_RENDER_REVIEW.md)の画像・数値は当時の履歴と明示しました。

## 一覧・素材・検証

[JOB_SYSTEM.md](JOB_SYSTEM.md)、[COMPANION_CATALOG.md](COMPANION_CATALOG.md)、[MONSTER_CATALOG.md](MONSTER_CATALOG.md)、[BALANCE_PLAN.md](BALANCE_PLAN.md)、[SE_CATALOG.md](ui/SE_CATALOG.md)、[EFFECT_CATALOG.md](ui/EFFECT_CATALOG.md)を現在の定義へ照合しました。敵は59、遭遇82、30職、仲間10、NPC36、SE28、効果24。旧バランス計測は再測定した扱いにしていません。

[DATA_SNAPSHOT.json](DATA_SNAPSHOT.json)、[LOCATION_CATALOG.md](LOCATION_CATALOG.md)、[EVENT_CATALOG.md](scenarios/EVENT_CATALOG.md)と各文書の生成部分を更新しました。文書検査はサブフォルダを含むMarkdown・見出し・画像参照・フォルダ索引、保存原文のハッシュ、配布データの指紋、専用ページ・SVGを照合します。生成器は `tools/doc-layout.mjs` の配置を共通利用します。

実行結果と実画面の確認範囲は [PROGRESS.md](PROGRESS.md) に記録します。

## 2026-09-19のUI文書整理

UI関連7文書を[ui/](ui/README.md)へ移し、[根本方針と現状](ui/PHILOSOPHY_AND_STATUS.md)と[キー設定仕様](ui/KEY_CONFIG.md)を追加しました。移動に合わせて文書相互のリンク、効果画像のHTML参照、READMEと生成先の管理を更新しました。過去の保存原文は変更していません。
