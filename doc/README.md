# adv ドキュメント

現行説明の照合日: 2026-10-23。作品版1.31.0。[現在の状態](CURRENT_STATUS.md)、[現行仕様](SPEC.md)、[採用仕様と次工程](HANDOFF.md)から確認してください。実施時点の履歴は[検証記録](development/PROGRESS.md)、整理前の本文は[保存原文](legacy/2026-10-20/README.md)に分けます。

## 現在の実装と続く設計

[給油・中継所・技能教習](dungeons/EXPEDITION_IMPLEMENTATION.md)は4迷宮の21設備に接続済みです。篝火1〜10F・10F主・武器18種を接続済みです。容量180→270、無料給油、次回の中継出発、技能宝石、人物別18技能と11技能のLv2/Lv3購入を利用できます。[帰路・成長の測定](dungeons/KAGARIBI_TEN_FLOORS.md)は近道・依頼逆順・弓装備を含む60条件まで確認し、[地下水道の1〜10F](dungeons/WATERWAY_TEN_FLOORS.md)も経路・設備・主を接続しました。[廃坑1〜10F](dungeons/MINE_TEN_FLOORS.md)も洗浄・帰路・設備・主を接続しました。[庭園の栽培経路](dungeons/GARDEN_SHALLOW_ROUTES.md)は1〜10F・4/7F設備・固定帰路まで接続しました。庭園10Fの大剪定虫・有限増援・種床設備・根留めも接続しました。

[4迷宮・各20FとLv30までの進行設計](dungeons/FOUR_DUNGEON_PROGRESSION_DESIGN.md)と[敵・武器・購入技能の設計](battle/FOUR_DUNGEON_COMBAT_DESIGN.md)は、篝火・地下水道・廃坑・庭園の80階を対象とする後続計画です。残る40階（4迷宮それぞれの1〜10F地形を除く。各10F主も実装済み）・Lv15以後の新EXP曲線・24深層敵・8主・T3/T4武器18種・14購入技能・深層帰路は未実装です。[篝火単独の初案](dungeons/KAGARIBI_PROGRESSION_DESIGN.md)は設計経緯として保持します。

[篝火の追加10編](scenarios/KAGARIBI_TEN_QUESTS.md)はq201〜q210、表示002〜011です。45場面・30結末の実移動を接続済みで、専用20NPCの絵は未制作です。全210クエストのうち、物語内の全行動を実移動へ接続した範囲はq001〜q004・q201〜q210です。

[Grid](battle/GRID_BATTLE.md)と[Frontline](battle/FRONTLINE_BATTLE.md)はClassicと共存します。Frontlineの可変行数・戦闘不能者退避・排除・ノックバックまで実装し、本編の具体的な編成・技能・数値を調整する段階です。[状態異常](battle/STATUS_EFFECTS.md)のLv1〜Lv3、[斥候技能](battle/SCOUT_SKILLS.md)、先制・スタンも実装済みです。

[進入イベントとトラップ](dungeons/TRAPS_AND_HAZARDS.md)、[トレジャーとサービス](dungeons/DUNGEON_PACKAGES.md)は共通部品へ接続済みです。[火の仕様](dungeons/FIRE_SYSTEM.md)と[灯番](battle/LANTERN_KEEPER.md)では、現在の燃料処理と、火台・油の効果合成や油攻撃・生成などの採用仕様を区別しています。

[ランダム生成器](dungeons/DUNGEON_GENERATION.md)は地形・セルの生成と[実ゲーム試遊](../dungeon-generation-preview.html)に対応します。階層別環境、仕掛け生成と成立検査、候補の保管・比較・採用、原稿一式出力は未完了です。

原稿の編集は[統合マップ編集](../config/map.html)と[編集仕様・正本の案内](authoring/README.md)へ進みます。設定JSONは237件で、ゲーム用JSONと文書は正本から生成します。

## 分野別の入口

[dungeons/README.md](dungeons/README.md)：セル・共有エッジ、地形と通行、照明、2D接続、水没、各ダンジョンの仕掛け。[ダンジョンカタログ](dungeons/DUNGEON_CATALOG.md)から13迷宮の専用ページへ進めます。

[world/README.md](world/README.md)：町の施設・場所のID、町と物語の移動。

[scenarios/README.md](scenarios/README.md)：210クエスト、q001〜q010個別ページ、人物、イベント、JSON命令。

[battle/README.md](battle/README.md)：職業、仲間、魔物、戦闘・探索バランス。

[ui/README.md](ui/README.md)：[UI基本哲学](ui/BASIC_PHILOSOPHY.md)と[参考理論](ui/THEORY_REFERENCES.md)、画面の設計方針、共通キー、調査、戦闘コマンド、メッセージ、人物演出・SE。

[authoring/README.md](authoring/README.md)：設定編集HTML、編集先JSON、Pages URL。

[development/README.md](development/README.md)：今回の検査、未確認事項、文書の生成・整理記録、データ集計。

[legacy/README.md](legacy/README.md)：旧仕様・過去の測定と更新前原文。現行仕様とは分けて保存します。

## 文書の保守

同じ仕様は担当分野の本文を更新し、現状と引き継ぎから参照します。冒頭への日付付き追記だけで古い本文を残す更新は行いません。完了済み作業を次工程へ残さず、過去の検証は実施日と対象版を保ちます。保存原文は書き換えません。

生成文書の配置は `tools/doc-layout.mjs` で管理します。文書のみの再集計は `npm run build:docs`、クエスト本文・配置図も更新する場合は `npm run build:catalog`、検査は `npm run check:docs` です。詳細は[保守と検証](development/README.md)を参照してください。
