# adv ドキュメント

更新日: 2026-09-19。対象はPR #27反映済みの作品版1.14.0と、共通キー操作の追加です。通常は33件の2Dマップを読み込み、シナリオ本文と選択肢をメッセージウィンドウへ統合しています。[2D区画接続と水密扉](CONNECTED_2D_MAPS.md)、[現在の状態](CURRENT_STATUS.md)を確認してください。

最初に[現行仕様](SPEC.md)、[検証・残作業](PROGRESS.md)、[引き継ぎ](HANDOFF.md)を読んでください。[データ集計](DATA_SNAPSHOT.json)は配布JSONから生成します。

[MESSAGE_AND_COMMAND_WINDOWS.md](MESSAGE_AND_COMMAND_WINDOWS.md)：プレイヤーコマンドの定義、メッセージ内の選択肢、調査・仕掛け・帰還の共通操作。

[KEYBOARD_CONTROLS.md](KEYBOARD_CONTROLS.md)：決定・キャンセル・十字キー、対象選択、装備・記録、広場・探索へ戻る順序。

## ゲームと実装

[SPEC.md](SPEC.md)：探索・戦闘・隊編成・職業・シナリオ・保存の現行仕様。

[SCRIPT_REFERENCE.md](scenarios/SCRIPT_REFERENCE.md)：実行可能な命令・式演算子、状態参照、会話の保存。

[VIEW_CONTRACT.md](VIEW_CONTRACT.md)：ViewModel、操作意図、素材・会話・効果の表示責務。

[IN_SCENE_VIEW.md](IN_SCENE_VIEW.md)：背景内表示／従来表示の切り替え、一覧ウィンドウ、入力遮断、長文ページ送り、表示検証。

[WORLD_LOCATIONS.md](WORLD_LOCATIONS.md)：町とq001〜q003の実移動、所在・保存・表示・次の展開。

[LOCATION_CATALOG.md](LOCATION_CATALOG.md)：町10か所のID・親子・機能・背景・参照場面。

[EVENT_CATALOG.md](scenarios/EVENT_CATALOG.md)：実装したフィールド・戦闘中イベント、全配置と強制戦闘の定義位置。

[FIELD_LIGHTING.md](FIELD_LIGHTING.md)：距離による0〜8のセル照度、遮蔽、歩行画面とミニマップの表示。

## ダンジョン

[CELL_CATALOG.md](CELL_CATALOG.md)：現在の空・密、足場、水深、地形変化、境界、移動手段、環境効果、イベント種別の仕様と自動集計した配置索引。

[MAP_CELLS_AND_BOUNDARIES.md](MAP_CELLS_AND_BOUNDARIES.md)：2Dの四辺・3Dの六面、壁セルと境界壁、方向別の進入・退出、現行実装と拡張仕様、2Dの保持方針。

[DUNGEON_RENDER_REVIEW.md](DUNGEON_RENDER_REVIEW.md)：水の壁・床材・装置の向きを修正した記録と描画比較。

[VOXEL_TERRAIN_AND_WATER.md](VOXEL_TERRAIN_AND_WATER.md)：立方体・六面の境界・区域の水没・梯子と上下移動の仕様。

[DUNGEON_CATALOG.md](DUNGEON_CATALOG.md)：13ダンジョンの一覧、固有設定、編集元と出典。

[DUNGEON_SYSTEM_DESIGN.md](DUNGEON_SYSTEM_DESIGN.md)：JSON定義、共通部品、拡張時の責務と未実装の範囲。

[KAGARIBI_DUNGEON.md](KAGARIBI_DUNGEON.md)：火台・携帯松明・種火・くらがり。

[WATERWAYS_SALT_MINE.md](WATERWAYS_SALT_MINE.md)：水位・水門・バルブ、装備腐食、破壊壁。

[DUNGEON_SYSTEMS_1_7.md](DUNGEON_SYSTEMS_1_7.md)：植物、鏡、書庫、市場、空気、配電、地形変化、逆流、境界。

[DUNGEON_ART_AND_SCENARIOS.md](DUNGEON_ART_AND_SCENARIOS.md)：壁面・装置の素材、13件の現地調査、依頼と手帳への接続。

## シナリオと人物

[scenarios/README.md](scenarios/README.md)：シナリオ・クエスト・人物・イベント・命令の文書と配置図の入口。

[EXPLORATION_AND_PROSE_1_11.md](scenarios/EXPLORATION_AND_PROSE_1_11.md)：不要転送の除去、q001〜q003の到達待ち、全200件の常体化、残るq004以降。

[QUEST_CATALOG.md](scenarios/QUEST_CATALOG.md)：200本・629結末の現行カタログ。q001・q002は専用ページへのリンク、q003〜q020は実装済みの本文・選択肢・応答・条件・結末を掲載します。作者向けのため真相を含みます。

[QUEST_Q001.md](scenarios/QUEST_Q001.md)：q001「帰らない灯番」の全文、8場面・7配置・2結末と強制戦闘・戦闘中イベントの一意ID、座標付き配置図、町との接続、マップJSONと5本の実移動。

[SCENARIO_DESIGN.md](scenarios/SCENARIO_DESIGN.md)：v1.0／v1.1の適用範囲、編集する原稿、生成順序。

[SCENARIO_MODEL_V11.md](scenarios/SCENARIO_MODEL_V11.md)：q001〜q010の人物・物品・所在・行為・結末条件。

[QUEST_Q002.md](scenarios/QUEST_Q002.md)：q002「骨の荷札」の全文、8場面・3結末、3マップの配置図・接続、標本室と審査所への6本の移動行為。

q001・q002の改稿全文は各専用ページ、q003〜q020は[カタログ](scenarios/QUEST_CATALOG.md)で管理します。旧版の二つの全文文書は再作成しません。

[CHARACTERS.md](scenarios/CHARACTERS.md)：36人のNPC定義と生成肖像、その他の依頼人索引。

## 戦闘・隊編成・素材

[JOB_SYSTEM.md](JOB_SYSTEM.md)：30職、習得技能、成長、装備、探索特技。

[COMPANION_CATALOG.md](COMPANION_CATALOG.md)：仲間10人、初期能力、酒場での編成と肖像。

[MONSTER_CATALOG.md](MONSTER_CATALOG.md)：敵59定義、発想と戦闘画像、現行データへの参照。

[BALANCE_PLAN.md](BALANCE_PLAN.md)：現在の調整対象と検証条件、旧版の計測記録の位置。

[SE_CATALOG.md](SE_CATALOG.md) ／ [EFFECT_CATALOG.md](EFFECT_CATALOG.md)：SE28種と表示効果24種の定義・素材・表示契約。

## 文書の保守と履歴

[DUNGEON_REVISION_1_9.md](DUNGEON_REVISION_1_9.md)：1.9.0導入時の変更記録。現行の地下水道は2D区画仕様を参照。

[DOCUMENTATION_AUDIT.md](DOCUMENTATION_AUDIT.md)：今回の全ファイル照合・更新・移動の記録。

[legacy/README.md](legacy/README.md)：日付付きの旧設計・過去の測定結果・更新前の記録。

文書は冒頭への追記だけで済ませず、本文の件数・版・実装済み／未実装の記述を更新します。データから出る一覧は `npm run build:docs` で再生成します。原稿カタログを手直しした場合は、シナリオの正本へ反映してからコンテンツを再生成してください。

[QUEST_EVENTS.md](scenarios/QUEST_EVENTS.md)：クエスト固有イベントの正本、配置投影、出現・操作条件、調査記録、保存方針。

[フィールド・戦闘イベント仕様](scenarios/EVENT_SYSTEM.md)：セル進入・条件自動・任意調査・戦闘中イベントの発火、保存、q001接続。
