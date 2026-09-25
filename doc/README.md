# adv ドキュメント

確認日: 2026-09-25。作品版1.20.0。[現在の状態](CURRENT_STATUS.md)、[現行仕様](SPEC.md)、[引き継ぎ](HANDOFF.md)から確認してください。

原稿を編集する場合は[統合マップ編集](../config/map.html)と[編集仕様・正本の案内](authoring/README.md)へ進みます。ゲーム用JSONは原稿から生成します。

## 分野別の入口

[dungeons/README.md](dungeons/README.md)：セル・共有エッジ、地形と通行、照明、2D接続、水没、各ダンジョンの仕掛け。

[world/README.md](world/README.md)：町の施設・場所のID、町と物語の移動。

[scenarios/README.md](scenarios/README.md)：200クエスト、q001・q002専用ページ、人物、イベント、JSON命令。

[battle/README.md](battle/README.md)：職業、仲間、魔物、戦闘・探索バランス。

[ui/README.md](ui/README.md)：画面の設計方針、共通キー、調査、戦闘コマンド、メッセージ、人物演出・SE。

[authoring/README.md](authoring/README.md)：設定編集HTML、編集先JSON、Pages URL。

[development/README.md](development/README.md)：今回の検査、未確認事項、文書の生成・整理記録、データ集計。

[legacy/README.md](legacy/README.md)：旧仕様・過去の測定と更新前原文。現行仕様とは分けて保存します。

## 文書の保守

同じ仕様は担当分野の文書で更新し、現状と引き継ぎから参照します。完了済み作業を次工程へ残さず、過去の検証は実施日と対象版を保ちます。保存原文は書き換えません。

生成文書の配置は `tools/doc-layout.mjs` で管理します。文書のみの再集計は `npm run build:docs`、クエスト本文・配置図も更新する場合は `npm run build:catalog`、検査は `npm run check:docs` です。詳細は[保守と検証](development/README.md)を参照してください。
