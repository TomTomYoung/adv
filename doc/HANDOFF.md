# 実装引き継ぎ

確認日: 2026-09-18。作品版1.14.0。起点はPR #25反映後のmaster `16da1dd`。今回の作業ブランチは `docs/scenario-pages-refresh` です。ゲーム処理と配布JSONを変えず、現行仕様への文書更新、q002専用ページ、シナリオ系文書の整理を行いました。

## 現在の構成

[CURRENT_STATUS.md](CURRENT_STATUS.md)を現在の反映状態、[SPEC.md](SPEC.md)を共通仕様、[PROGRESS.md](PROGRESS.md)を検証結果の入口にします。版ごとの追記が積み重なっていた旧引き継ぎ・進捗・監査は[2026-09-18の保存原文](legacy/2026-09-18/README.md)へ分離しました。

シナリオ・クエスト系文書は [scenarios/README.md](scenarios/README.md) から参照します。q001・q002の全文は専用ページ、q003〜q020の全文はカタログ、q021〜q200は概要と分岐・結末一覧です。`doc/QUEST_CATALOG.md` など旧配置へ再出力しないでください。画像も `doc/scenarios/quest-maps/` に置きます。

## 正本と生成

1. q001は `authoring/story-q001.mjs`、q002は `authoring/story-q002.mjs`、q003〜q010は `authoring/stories-v11-1.mjs` と `stories-v11-2.mjs`。人物は `authoring/characters.mjs`、共通の状態記法は `authoring/story-kit.mjs`。
2. q011〜q020は `authoring/catalog-q011-q020.json` と対応する生成処理。q021以降は `authoring/structures-*.mjs`、`scenarios-*.mjs`。個別の構造を共通テンプレートへ揃えないでください。
3. 現地イベントは `authoring/quests/qXXX.events.json`。マップは `authoring/connected-maps.json`、篝火は `authoring/kagaribi-content.json`、装置・接続は `authoring/dungeons/*.json`。町は `authoring/locations.json`。
4. 生成済みのdataだけを直さず、原稿を変更して `npm run build:scenarios` を実行します。文書だけなら `npm run build:catalog` でカタログ・専用ページ・図を、`npm run build:docs` で各一覧と集計を更新します。
5. `tools/doc-layout.mjs` が生成先とリンクの相対位置を一元化します。生成器内のMarkdownは従来のdoc直下基準で組み立て、ファイルへ書く際だけ配置に合わせます。`check:docs` はサブフォルダを再帰走査し、各フォルダの索引、参照、生成結果を照合します。

ユーザーがカタログ・専用ページを改稿した場合は、先にその内容を原稿へ取り込んでから再生成します。本文の編集を機械的な再生成で消さないでください。

## 維持する仕様

シナリオの本文・選択肢は同じメッセージウィンドウ。移動・調べる・帰還はプレイヤーコマンド。固有システムの常設操作パネル、独立した帰還モーダル、目的地で続きを進めるボタンを復活させないでください。Coreは `src/core/player-commands.js` で対象と条件を再判定し、表示・取消だけでは資源を消費しません。

セル進入・実到着の自動処理は `src/core/field-events.js`。q001は enter、q002の初回現地会話は interact、移動行為の帰着は自動です。足元と正面から調べられることを、正面を到着扱いできることと混同しないでください。

通常ロードは2Dマップ33件。地下水道の水路は完全水没時に水密扉で閉じ、乾いた隣区画の操作盤から排水します。単一セルの水壁、上下開口の直上だけに留まる水、完全水没区画への階段接続は認めません。旧3Dの原稿と実装は削除せず `authoring/legacy/2026-09-18-map-layout` と専用試験に保持します。

q001〜q003の物理移動は実装済み、q004〜q200は未完了です。シナリオ内で転移が必要な場合を除き、探索で現地へ到達させます。全200件の地の文は常体、台詞は人物の口調を維持します。内容版の異なるセーブは移行しません。

## 次の作業

1. 実ブラウザで本文と選択肢、複数対象の調査、給排水・水密扉、帰還確認、キーボード、狭い画面を確認します。前回は `ERR_BLOCKED_BY_CLIENT` により未確認です。
2. q004から物理的な場所・人物と物品の所在・出発・到着を個別に設計します。費用・戦闘・救助・証言は到着前に成立させません。
3. 全200本の文芸監査と、追加100本を含む長期探索の資源・距離・消耗調整を続けます。全世界の時計・NPCスケジュールは未実装です。

新しい変更では `npm run check:docs`、データ参照・静的検査、変更に対応するテストを実行し、生成先・リンク・ゲームデータの不要な差分を確認します。今回の具体的な検証は [PROGRESS.md](PROGRESS.md) に記録します。
