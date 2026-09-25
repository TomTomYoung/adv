# 保守・検証記録

[文書全体へ戻る](../README.md)。現行の進捗と過去の検証を区別します。

[PROGRESS.md](PROGRESS.md)：今回実行した検査、過去の実ブラウザ確認、残作業。

[DOCUMENTATION_AUDIT.md](DOCUMENTATION_AUDIT.md)：2026-09-25のフォルダ整理・仕様照合・生成器対応。

[DATA_SNAPSHOT.json](DATA_SNAPSHOT.json)：配布manifestのID数・内容版・指紋の自動集計。

## 再生成する範囲

`npm run build:docs` は現行の配布JSONを読み、データ集計・人物・町・イベント一覧と各文書の生成部分を更新します。ゲーム内容を再生成する処理ではありません。

`npm run build:catalog` はクエストカタログ・専用ページ・配置図を配布JSONから生成し、文書と編集画面の参照を更新します。カタログの独自改稿がある場合は、正本へ反映してから実行します。

原稿を変更した場合は[編集先の対応](../authoring/CONFIG_EDITOR_SOURCES.md)に従って `build:scenarios` 等を実行します。配布JSONだけを直したり、保存済みfixtureや旧原文を再生成したりしません。

## 検査と履歴

`npm run check:docs` はフォルダ索引、Markdown・画像・編集画面のリンク、生成一覧と配置図、配布データの指紋、旧原文のハッシュを照合します。`npm run check:config` は225原稿と対応HTMLを検査します。

ゲーム側の変更は `npm run check` と必要な実画面確認を行い、結果をPROGRESSへまとめます。古い結果は実施時の版・条件を保持し、今回再実行した結果へ混ぜません。現在の方針と次工程は[HANDOFF.md](../HANDOFF.md)へ一度だけ記載します。
