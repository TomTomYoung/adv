# 保守・検証記録

[文書全体へ戻る](../README.md)。現行の進捗と過去の検証を区別します。

[PROGRESS.md](PROGRESS.md)：今回実行した検査、過去の実ブラウザ確認、残作業。

[DOCUMENTATION_AUDIT.md](DOCUMENTATION_AUDIT.md)：2026-09-25のフォルダ整理・仕様照合・生成器対応。

[DATA_SNAPSHOT.json](DATA_SNAPSHOT.json)：配布manifestのID数・内容版・指紋の自動集計。

## 再生成する範囲

`npm run build:editions` は版別原稿から第2版の差分JSON・専用本文を生成し、文書集計と配信指紋を更新します。`npm run check:editions` は生成結果を変更せず照合します。現在はq001が対象で、初版原稿と配布JSONを上書きしません。[版の仕様](../scenarios/SCENARIO_EDITIONS.md)。

`npm run build:docs` は現行の配布JSONを読み、データ集計・人物・魔物・町・イベント一覧と各文書の生成部分を更新します。ゲーム内容を再生成する処理ではありません。

`npm run build:catalog` はクエストカタログ・専用ページ・配置図を配布JSONから生成し、文書と編集画面の参照を更新します。カタログの独自改稿がある場合は、正本へ反映してから実行します。

篝火の攻略・経済測定は `node tools/measure-kagaribi-campaign.mjs --routes --summary` で60条件を再現できます。[条件と読み方](../dungeons/KAGARIBI_TEN_FLOORS.md)、[2026-10-22の測定値](KAGARIBI_ROUTE_MEASUREMENTS.json)。短縮経路でも部材・歩行・通常戦闘・買物を実行し、収入やHP/MPを直接補充しません。

`npm run build:stories` は現行データを基点にv1.1原稿・迷宮・Schema・カタログ・配信情報を更新します。q201〜q210の報酬変更にはこの経路を使います。旧基礎生成器から全件を作る `build:scenarios` は、2026-10-20時点で既存配布のシナリオ・素材等に広範な差分を生じるため、その再現性修復は別工程です。今回その差分は採用していません。

原稿を変更した場合は[編集先の対応](../authoring/CONFIG_EDITOR_SOURCES.md)に従って `build:scenarios` 等を実行します。配布JSONだけを直したり、保存済みfixtureや旧原文を再生成したりしません。

## 配信とキャッシュ

`npm run build:runtime` は `index.html`・`src/` のJS/CSS・`data/` のJSON・参照素材のSHA-256から `runtime.json` を生成します。コードだけの変更でも必ず更新します。`build:config`（およびそれを呼ぶ各生成コマンド）では最後に自動生成します。`npm run check:runtime` とCIは生成結果が現物と一致することを検査します。

作品版は共通システムのセーブ互換性、シナリオ版は本文と進行の分離に使い、配信更新IDはキャッシュの識別に使います。キャッシュ対策のために作品版を上げて既存セーブを無効化しません。`index.html` は毎回異なるURLで起動スクリプトを取得し、起動スクリプトは `no-store` と毎回異なるURLで配信情報を取得します。import mapで全JS依存先を同じ更新IDのURLへ向け、CSS・JSONにも同じIDを付けます。JS・CSS・JSONには起動ごとの識別子も付け、配信途中に取得した不一致ファイルがキャッシュに残っていても再読み込みで回復できるようにします。画像・音声は配信更新IDでキャッシュを再利用します。JSはimport mapのintegrity、CSSはSRI、JSONはFetchのintegrityで配信情報の指紋と照合します。画像と音声も版付きURLを使います。import map非対応ブラウザでは起動を停止します。import mapのintegrityの強制はブラウザの対応に依存します。

更新ファイルが不足・不一致なら古いデータにフォールバックせず起動を止めます。JSONの読込と内容検証が全件完了するまでセーブの復元・上書きを開始しません。公開元のデプロイ自体が未完了の場合は、その完了前に新しい版を取得することはできません。配信設定は従来のmasterからのPages配信のままです。開いたままのゲームを途中で自動更新せず、次の再読み込みで更新します。

`tools/browser-runtime-smoke.mjs` は実 `index.html` を `/adv/` 以下で配信し、長期キャッシュを保持した通常再読み込みでJS依存先・CSS・JSONが一緒に更新されることと、セーブが同一であることを確認します。燃料補充後の南帰路イベント、配信情報・JS・CSS・JSONの欠落／不一致時の保存保持、390pxでの起動も検証します。不一致の解消後はキャッシュを消さず同じブラウザで再読み込みし、保存した位置から再開できることも確認します。

[廃坑の旧実攻略測定](MINE_ROUTE_MEASUREMENTS.json)は1.29.0の篝火後12条件、[低位編成追加後の72条件](MINE_SHALLOW_MEASUREMENTS.json)は1.34.0です。[実装と制限](../dungeons/MINE_TEN_FLOORS.md)に洗浄・帰路・旧保存の条件を記録しています。

庭園の栽培あり/なしの比較は `node tools/measure-garden-campaign.mjs --matrix` で再現します。[24条件の測定値](GARDEN_ROUTE_MEASUREMENTS.json)と[栽培経路の条件・範囲](../dungeons/GARDEN_SHALLOW_ROUTES.md)を参照してください。10F主は測定に含みません。

ブラウザーCIの3ワークフローはPlaywright 1.58.2とUbuntu 24.04を組にして固定します。`ubuntu-latest` が26.04へ変わると、そのPlaywright版はChromium headless shellの依存導入を拒否しました。検査を省略せず、対応する実行OSを使います。

## 検査と履歴

`npm run check:docs` はフォルダ索引、Markdown・画像・編集画面のリンク、生成一覧と配置図、配布データの指紋、旧原文のハッシュを照合します。`npm run check:config` は237原稿と対応HTMLを検査します。

手書きの説明が現在の実装と一致するかは、自動検査だけでは判定しません。操作範囲・配置数・実装済み機能が変わったときは、担当の仕様書と解説原稿に加え、[現状](../CURRENT_STATUS.md)、[文書の入口](../README.md)、分野別の入口、[引き継ぎ](../HANDOFF.md)の説明も照合します。設計上の予定は現在の対応範囲と区別し、保存原文や過去の検証結果は実施時の内容を保持します。

ゲーム側の変更は、両シナリオ版の内容・生成一致・文書・試験を含む `npm run check` と必要な実画面確認を行い、結果をPROGRESSへまとめます。古い結果は実施時の版・条件を保持し、今回再実行した結果へ混ぜません。現在の方針と次工程は[HANDOFF.md](../HANDOFF.md)へ一度だけ記載します。

2026-10-22の地下水道実攻略は `node tools/measure-waterway-campaign.mjs --matrix` で再現します。[12条件の測定値](WATERWAY_ROUTE_MEASUREMENTS.json)と[条件・範囲](../dungeons/WATERWAY_TEN_FLOORS.md)を参照してください。
