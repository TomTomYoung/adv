# adv ドキュメント

更新日: 2026-09-14。対象は作品版1.8.0です。素材・現地調査はPR #8、立方体地形はPR #9、水面・床材の描画修正はPR #10でマージ済みです。今回の作業は2D・3Dのセルと方向別通行の仕様整理です。masterと作業ブランチの反映状況は[CURRENT_STATUS.md](CURRENT_STATUS.md)で確認してください。

最初に[現行仕様](SPEC.md)、[検証・残作業](PROGRESS.md)、[引き継ぎ](HANDOFF.md)を読んでください。[データ集計](DATA_SNAPSHOT.json)は配布JSONから生成します。

## ゲームと実装

[SPEC.md](SPEC.md)：探索・戦闘・隊編成・職業・シナリオ・保存の現行仕様。

[SCRIPT_REFERENCE.md](SCRIPT_REFERENCE.md)：実行可能な48命令、30式演算子、状態参照、保存中の会話の互換性。

[VIEW_CONTRACT.md](VIEW_CONTRACT.md)：ViewModel、操作意図、素材・会話・効果の表示責務。

## ダンジョン

[MAP_CELLS_AND_BOUNDARIES.md](MAP_CELLS_AND_BOUNDARIES.md)：2Dの四辺・3Dの六面、壁セルと境界壁、方向別の進入・退出、現行実装と拡張仕様、2Dの保持方針。

[DUNGEON_RENDER_REVIEW.md](DUNGEON_RENDER_REVIEW.md)：水の壁・床材・装置の向きを修正した記録と描画比較。

[VOXEL_TERRAIN_AND_WATER.md](VOXEL_TERRAIN_AND_WATER.md)：立方体・六面の境界・水量・梯子と上下移動の仕様。

[DUNGEON_CATALOG.md](DUNGEON_CATALOG.md)：13ダンジョンの一覧、固有設定、編集元と出典。

[DUNGEON_SYSTEM_DESIGN.md](DUNGEON_SYSTEM_DESIGN.md)：JSON定義、共通部品、拡張時の責務と未実装の範囲。

[KAGARIBI_DUNGEON.md](KAGARIBI_DUNGEON.md)：火台・携帯松明・種火・くらがり。

[WATERWAYS_SALT_MINE.md](WATERWAYS_SALT_MINE.md)：水位・水門・バルブ、装備腐食、破壊壁。

[DUNGEON_SYSTEMS_1_7.md](DUNGEON_SYSTEMS_1_7.md)：植物、鏡、書庫、市場、空気、配電、地形変化、逆流、境界。

[DUNGEON_ART_AND_SCENARIOS.md](DUNGEON_ART_AND_SCENARIOS.md)：壁面・装置の素材、13件の現地調査、依頼と手帳への接続。

## シナリオと人物

[QUEST_CATALOG.md](QUEST_CATALOG.md)：200本・630結末の現行カタログ。作者向けのため真相を含みます。

[SCENARIO_DESIGN.md](SCENARIO_DESIGN.md)：v1.0／v1.1の適用範囲、編集する原稿、生成順序。

[SCENARIO_MODEL_V11.md](SCENARIO_MODEL_V11.md)：q001〜q010の人物・物品・所在・行為・結末条件。

[SCENARIOS_Q001_Q010_V11.md](SCENARIOS_Q001_Q010_V11.md) ／ [SCENARIOS_Q011_Q020.md](SCENARIOS_Q011_Q020.md)：現在の原稿本文と選択肢。

[CHARACTERS.md](CHARACTERS.md)：36人のNPC定義と生成肖像、その他の依頼人索引。

## 戦闘・隊編成・素材

[JOB_SYSTEM.md](JOB_SYSTEM.md)：30職、習得技能、成長、装備、探索特技。

[COMPANION_CATALOG.md](COMPANION_CATALOG.md)：仲間10人、初期能力、酒場での編成と肖像。

[MONSTER_CATALOG.md](MONSTER_CATALOG.md)：敵55定義、発想と戦闘画像、現行データへの参照。

[BALANCE_PLAN.md](BALANCE_PLAN.md)：現在の調整対象と検証条件、旧版の計測記録の位置。

[SE_CATALOG.md](SE_CATALOG.md) ／ [EFFECT_CATALOG.md](EFFECT_CATALOG.md)：SE28種と表示効果24種の定義・素材・表示契約。

## 文書の保守と履歴

[DOCUMENTATION_AUDIT.md](DOCUMENTATION_AUDIT.md)：今回の全ファイル照合・更新・移動の記録。

[legacy/README.md](legacy/README.md)：日付付きの旧設計・過去の測定結果・更新前の記録。

文書は冒頭への追記だけで済ませず、本文の件数・版・実装済み／未実装の記述を更新します。データから出る一覧は `npm run build:docs` で再生成します。原稿カタログを手直しした場合は、シナリオの正本へ反映してからコンテンツを再生成してください。
