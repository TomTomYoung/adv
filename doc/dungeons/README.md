# 探索・ダンジョン

2026-10-10: 調査と仕掛けは配置セルでの操作を基本とし、必要な正面アクセスだけを例外として明示しています。探索画面の印も操作位置に合わせます。[調査仕様](../ui/INSPECTION.md)、[地図の未読・次イベント表示](../ui/MINIMAP.md)。

2026-10-01: [篝火の迷宮の拡張](KAGARIBI_EXPANSION.md)。3層9区画、近道、詰所補給と4件の小事件。

2026-09-26: [水路拡張と地下関所](WATERWAY_EXPANSION.md)を実装済み。

確認日: 2026-10-10。作品版1.25.0。[文書全体へ戻る](../README.md)。

[CELL_LAYERS.md](CELL_LAYERS.md)：セル種30種類・共有エッジ4種類と地点ごとの上書き。

[FLOOR_DEPRESSIONS.md](FLOOR_DEPRESSIONS.md)：浅い・深い・底の見えないくぼみと水入り、境界と水面の描画。

[CELL_CATALOG.md](CELL_CATALOG.md)：種類・状態・配置の生成一覧。

[MAP_CELLS_AND_BOUNDARIES.md](MAP_CELLS_AND_BOUNDARIES.md)：四辺の通行・境界、退避3Dと拡張の区別。

[CONNECTED_2D_MAPS.md](CONNECTED_2D_MAPS.md)：39件の2Dマップ、条件付き接続口・水密扉・区画給排水。

[FIELD_LIGHTING.md](FIELD_LIGHTING.md)：距離減衰・遮光・画面とミニマップの照度。

[DUNGEON_CATALOG.md](DUNGEON_CATALOG.md)：13ダンジョンの概要と専用ページへの入口。

[details/README.md](details/README.md)：迷宮ごとの専用ページ。区画・経路・設備・通常遭遇・関連クエスト・保存状態・編集元。

[DUNGEON_SYSTEM_DESIGN.md](DUNGEON_SYSTEM_DESIGN.md)：共通部品・正本・責務・拡張方法。

[DUNGEON_GENERATION.md](DUNGEON_GENERATION.md)：ランダム生成の設計と現在の対応範囲。[統合確認画面](../../dungeon-generation-preview.html)で単一マップの地形・セル生成、候補確認、味方・魔物の設定、実ゲームでの試遊・戦闘に対応。階層別の環境、仕掛け生成と成立検査、候補の保管・比較一覧・採用、原稿一式の出力は未完了。

[DUNGEON_RESTRICTIONS.md](DUNGEON_RESTRICTIONS.md)：トラップ・イベントによる帰還印封印と帰還禁止、発生元別の解除・保存。

[KAGARIBI_DUNGEON.md](KAGARIBI_DUNGEON.md)：火・種火、通常魔物とくらがり、q001イベント戦闘。

[WATERWAYS_SALT_MINE.md](WATERWAYS_SALT_MINE.md)：現行の地下水道、装備個体の塩・洗浄・破壊壁。

[DUNGEON_SYSTEMS.md](DUNGEON_SYSTEMS.md)：植物・鏡・書庫・市場・空気・配電・地形変化・逆流・術制限。

[DUNGEON_ART_AND_SCENARIOS.md](DUNGEON_ART_AND_SCENARIOS.md)：壁面・装置の素材と13件の現地調査。

[VOXEL_TERRAIN_AND_WATER.md](VOXEL_TERRAIN_AND_WATER.md)：通常ロードから退避した立体地形・六面・水没の保守仕様。
