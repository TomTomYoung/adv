# 実装引き継ぎ

確認日: 2026-09-19。作品版1.15.0。起点はPR #32反映済みのmaster `f347cca`。作業ブランチは `fix/compact-message-height`。下部の高さを通常28%・最低200pxへ下げ、画像の「足元・正面を調べる」ボタン付近へ上端を揃えました。高さ550px以下は48%を保ちます。実寸ページ送りと枠内スクロールは調整後の領域に追従します。今回はCSSと関連docのみの変更で、内容版・セーブは変更しません。

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

人物演出の仕様は[CHARACTER_STAGING.md](ui/CHARACTER_STAGING.md)です。原稿のstory.scenes.cast.display、またはscene.cast/scene.cast.clear命令で配置し、say.characterで発話者を指定します。物語上の所在と表示の上書きを混同しないでください。presentation.castとspeakerIdは保存対象、本文ページ番号・フォーカス・スクロールはView状態です。発話者の最前面化は座標を変えません。q001の帰還報告では老人とルーキーを左、リネを右に保持します。新規透過素材のプロンプト・ハッシュはassets/source/characters/dialogue-sprites-*.jsonに記録しています。

下部枠は内容量で伸縮させません。scene-view.jsがフォントと実際の本文領域を計測してページを作り、文字サイズ・画面寸法変更後も読み位置を保持します。ResizeObserverは本文要素も監視し、フォント変更だけの再計算を落とさないようにしています。本文をchoiceへ引き継ぐ際に先頭へ戻さないでください。安全な取消先は前ページ移動より優先します。方向キーによる選択とscrollIntoViewの連動、カード表示への切り替えを保持します。

UIの判断基準は[PHILOSOPHY_AND_STATUS.md](ui/PHILOSOPHY_AND_STATUS.md)、文書の入口は[ui/README.md](ui/README.md)です。画面・入力・メッセージ・表示契約・効果とSEの文書をdoc直下へ戻さないでください。`tools/doc-layout.mjs` のuiDocsが生成先を持ち、`check:docs` が旧位置への再出力と索引・参照を検出します。保存原文は今回移動・編集していません。

キー設定は[key-config仕様](ui/KEY_CONFIG.md)を参照してください。`key-bindings.js` は論理操作と物理キー、検査、保存形式の正規化を担当し、`key-config.js` が下書きを編集します。main.jsはsettings.keyBindingsへ保存できた場合だけ現在設定を更新します。`keyboard.js`と`system-controls.js`は同じ割り当てを使います。入力待ちをゲームへ流さず、旧Enter/Spaceのネイティブ決定、文字入力中の文字キー、重複、必須キーの全解除を区別してください。EscとTabの回復経路を維持します。

[KEYBOARD_CONTROLS.md](ui/KEYBOARD_CONTROLS.md)が操作仕様です。`keyboard.js` は共通キーを現在の画面に応じて振り分けます。`view.explorationInput()`が真なら方向入力は直接移動、決定は調査です。それ以外はボタン選択・実行です。会話や選択肢が消えたら「調べる」を初期フォーカスにし、記録・ヘルプを閉じた際もmain.jsからresumeExplorationを呼びます。Tabによる明示的なボタン移動は補助経路とし、方向入力・キャンセル・再描画で探索へ戻します。`focus.js` が有効なボタンへの移動、選択欄の候補一覧、詳細の保持を担当します。`system-controls.js` は記録・ヘルプと新規開始確認の戻り順序を管理します。戦闘の未確定行動と対象はView状態です。選択中にCoreへ送らず、確定時に既存のbattle intentを送ります。キャンセルで逃走・有料帰還・必須判断を代行しないでください。

初期ビューは `SceneView`、従来ビューは `GameView` です。「記録 → 画面配置」で切り替え、settings.viewLayoutへ保存します。`src/view/view-layout.js` が差し替え、同じViewModel・dispatch・セーブを使います。`SceneView` は会話・戦闘・道具・隊・掲示板・地図の既存描画を再利用します。入力の振り分けは `src/view/keyboard.js`、長文分割は `message-pages.js`、背景内配置は `scene-style.css`。描画用ウィンドウの開閉・ページ送りをCoreの進行へ混ぜないでください。[仕様と検証範囲](ui/IN_SCENE_VIEW.md)を参照してください。

システムの記録・ヘルプダイアログは `main.js` で背景枠に合わせ、画面変更・リサイズ・スクロール時に位置を更新します。新ビューの効果は背景枠で切り取り、UIより下へ描きます。切り替え時は効果のタイマー・アニメーション・監視を解放し、同じfeedbackを再生しません。プレビューにも画面配置の選択を追加しました。

シナリオの本文・選択肢は同じメッセージウィンドウ。移動・調べる・帰還はプレイヤーコマンド。固有システムの常設操作パネル、独立した帰還モーダル、目的地で続きを進めるボタンを復活させないでください。Coreは `src/core/player-commands.js` で対象と条件を再判定し、表示・取消だけでは資源を消費しません。

セル進入・実到着の自動処理は `src/core/field-events.js`。q001は enter、q002の初回現地会話は interact、移動行為の帰着は自動です。足元と正面から調べられることを、正面を到着扱いできることと混同しないでください。

通常ロードは2Dマップ33件。地下水道の水路は完全水没時に水密扉で閉じ、乾いた隣区画の操作盤から排水します。単一セルの水壁、上下開口の直上だけに留まる水、完全水没区画への階段接続は認めません。旧3Dの原稿と実装は削除せず `authoring/legacy/2026-09-18-map-layout` と専用試験に保持します。

q001〜q003の物理移動は実装済み、q004〜q200は未完了です。シナリオ内で転移が必要な場合を除き、探索で現地へ到達させます。全200件の地の文は常体、台詞は人物の口調を維持します。内容版の異なるセーブは移行しません。

## 次の作業

1. 今回はローカルChromiumで固定枠・実寸ページ分割・18選択肢・共通キー・三人の配置と従来カードを確認済みです。1280×856、900×700、390×844、320×568、844×390と本文24pxを含みます。再現用はtools/browser-scene-smoke.mjsです。公開反映後の通し操作、全管理画面とキー変更の入力待ち・取消・適用・初期値復帰・再読み込み後の保持、音声は引き続き確認してください。全編の場面に必要な透過spriteと配置はシナリオごとに追加し、関係性を無視した一律配置へ置き換えないでください。
2. q004から物理的な場所・人物と物品の所在・出発・到着を個別に設計します。費用・戦闘・救助・証言は到着前に成立させません。
3. 全200本の文芸監査と、追加100本を含む長期探索の資源・距離・消耗調整を続けます。全世界の時計・NPCスケジュールは未実装です。

新しい変更では `npm run check:docs`、データ参照・静的検査、変更に対応するテストを実行し、生成先・リンク・ゲームデータの不要な差分を確認します。今回の具体的な検証は [PROGRESS.md](PROGRESS.md) に記録します。
