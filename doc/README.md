# adv ドキュメント

2026-10-15: [篝火の設備復旧・深層探索・宝石と技能の設計案](dungeons/KAGARIBI_PROGRESSION_DESIGN.md)を追加しました。給油キャンプと中継階、1F〜20Fの進行案、経験値・宝石・技能店、追加10依頼の報酬案をまとめています。採用する方向と初期数値案を分けており、ゲーム未実装です。

2026-10-13: ねむり・必中・鈍重・狂暴化・暴発・クリティカル関連4種をLv1〜Lv3付きで追加しました。行動制御・暴発対象変更・命中と独立したクリティカル判定、戦闘限定の解除、状態Lv・期限・回復経過の保存、設定編集と両ビューに接続しています。未指定だった数値と持続条件は[状態一覧](battle/STATUS_CATALOG.md)と[共通仕様](battle/STATUS_EFFECTS.md)に暫定値として明記しました。

2026-10-13: [状態異常カタログ](battle/STATUS_CATALOG.md)の既存9種のLv2・Lv3を実装しました。行動阻害6種はレベル別の自然回復、防御は被ダメージ50%・25%・0%に対応します。

2026-10-12: [進入イベントとトラップ](dungeons/TRAPS_AND_HAZARDS.md)の4発生方式・9パッケージ・漏水／ガス漏れ、[状態異常](battle/STATUS_EFFECTS.md)の共通処理、[トレジャーとサービス](dungeons/DUNGEON_PACKAGES.md)を実装しました。既存の工具箱・町の施設へ適用し、保存・設定編集・生成へ接続しています。詳細は[検証記録](development/PROGRESS.md)を参照してください。

全体確認日: 2026-10-01。ダンジョン情報の更新日: 2026-10-10。作品版1.25.0。[現在の状態](CURRENT_STATUS.md)、[現行仕様](SPEC.md)、[引き継ぎ](HANDOFF.md)から確認してください。

原稿を編集する場合は[統合マップ編集](../config/map.html)と[編集仕様・正本の案内](authoring/README.md)へ進みます。ゲーム用JSONは原稿から生成します。

2026-10-11: [火の仕様](dungeons/FIRE_SYSTEM.md)に、油が照明範囲・燃費・敵避けを担うこと、プレーン油、固定火台の基本バフ、希少な携行火台、初期松明と篝火の固定火台のくらがり避けを追加しました。通常生成時だけの効果合成、移火・給油時の火の効果維持、最後に給油した油の効果への上書きを基準にします。[灯番のクラス仕様](battle/LANTERN_KEEPER.md)では、油攻撃・油の回復や生成・MP種火の戦闘／探索での使い分けを定義しています。採用仕様・検討候補・現行実装を分けており、新仕様のゲーム実装は未対応です。

2026-10-10: [ダンジョンのランダム生成仕様](dungeons/DUNGEON_GENERATION.md)を現在の部分実装へ合わせました。[統合確認画面](../dungeon-generation-preview.html)で地形・セルを生成し、候補の確認、味方・魔物の設定、実ゲームでの試遊と戦闘ができます。階層別の環境設定、仕掛けの生成と成立検査、候補の保管・比較一覧・採用、原稿一式の出力は未完了です。

## 分野別の入口

[dungeons/README.md](dungeons/README.md)：セル・共有エッジ、地形と通行、照明、2D接続、水没、各ダンジョンの仕掛け。[ダンジョンカタログ](dungeons/DUNGEON_CATALOG.md)から13迷宮の専用ページへ進めます。

[world/README.md](world/README.md)：町の施設・場所のID、町と物語の移動。

[scenarios/README.md](scenarios/README.md)：200クエスト、q001〜q010個別ページ、人物、イベント、JSON命令。

[battle/README.md](battle/README.md)：職業、仲間、魔物、戦闘・探索バランス。

[ui/README.md](ui/README.md)：[UI基本哲学](ui/BASIC_PHILOSOPHY.md)と[参考理論](ui/THEORY_REFERENCES.md)、画面の設計方針、共通キー、調査、戦闘コマンド、メッセージ、人物演出・SE。

[authoring/README.md](authoring/README.md)：設定編集HTML、編集先JSON、Pages URL。

[development/README.md](development/README.md)：今回の検査、未確認事項、文書の生成・整理記録、データ集計。

[legacy/README.md](legacy/README.md)：旧仕様・過去の測定と更新前原文。現行仕様とは分けて保存します。

## 文書の保守

同じ仕様は担当分野の文書で更新し、現状と引き継ぎから参照します。完了済み作業を次工程へ残さず、過去の検証は実施日と対象版を保ちます。保存原文は書き換えません。

生成文書の配置は `tools/doc-layout.mjs` で管理します。文書のみの再集計は `npm run build:docs`、クエスト本文・配置図も更新する場合は `npm run build:catalog`、検査は `npm run check:docs` です。詳細は[保守と検証](development/README.md)を参照してください。
