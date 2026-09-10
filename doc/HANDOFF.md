# 実装引き継ぎ

更新日: 2026-09-10。対象: 灯帰りの迷宮 1.3.1。

## 最初に行うこと

1. READMEとSPEC、PROGRESSを読む。
2. `node tools/validate.mjs`、`node tools/check-static.mjs`、`node --test tests/*.test.mjs` を実行する。
3. HTTP配信でindex.htmlを開く。画面だけの作業はview-preview.htmlから始める。

## 編集する場所

| 変更したいもの | 編集対象 |
| --- | --- |
| 依頼の文章・手掛かり・選択・結果 | authoring/scenarios-*.mjs、tools/build-scenarios.mjs、data/quests/q001.json〜q200.json |
| 地形・扉・調査位置・トリガー | data/maps/*.json |
| 共通イベント・施設・道具の処理 | data/scripts/common.json |
| 戦闘ルールの数値・技能・AI | data/system.json、formulas.json、skills.json、enemies.json、encounters.json |
| 新しい汎用命令 | src/core/script.js、validation.js、対応Schema・テスト |
| 表示データの項目 | src/application/projection.js、VIEW_CONTRACT |
| 見た目と画面操作の配置 | src/view/のみ。ゲームエンジンをimportしない |
| 保存・キーボード | src/main.js |
| 音の状態・曲の切替・再試行 | src/application/audio.js |
| 拡張魔物・仲間の原稿 | authoring/entities.json、tools/build-entities.mjs |

現行の再生成は `npm run build:scenarios` です。`authoring/quests.txt` の既存100行と、`authoring/scenarios-*.mjs` の追加100本を、独立したJSONへコンパイルします。ゲーム起動時に生成やテンプレート展開はしません。生成済みJSONを直接直した後にbuild-contentを走らせると修正が失われるため、再生成する変更か手編集かを最初に決めてください。原稿変更時はbuild:scenarios、続いてbuild-fixturesを実行します。

1.1.0は魔物20体、仲間10人の肖像、酒場編成を追加しました。MONSTER_CATALOG、COMPANION_CATALOG、BALANCE_PLANを実装前にコミットし、後から画像と実測結果を追記しています。追加原稿だけの再生成はbuild-entities、計測はsimulate-balanceです。BGM新版と画像の生成プロンプトはassets/PROVENANCE.mdを参照してください。

1.2.0はSE28種と表示効果24種を追加しました。SE_CATALOGとEFFECT_CATALOGを先にコミットしてあります。原稿はauthoring/presentation.json、データ更新はbuild-presentation、素材作成はtools/assets/generate-effects.mjsです。build-entities/build-contentも最後にpresentationの生成を呼ぶので拡張が消えません。

瞬間演出は保存しないfeedbackへ置き、持続色だけをpresentation.layersへ保存します。旧1.0/1.1セーブの継続位置を変えず移行しています。技能AIやクエストの配列へ演出命令を差し込む場合は、保存中の命令インデックスへの影響に注意してください。ビューでは一時要素・タイマー・画像のvisibilityを必ず片付け、全体技のSEを一度だけ鳴らす契約を維持します。

## 維持する契約

- 作品固有の依頼IDや本文をコアへ追加しない。
- ゲーム状態をビューから直接変更しない。操作はdispatchへ渡す。
- 未知命令・壊れた参照を黙って無視しない。式はevalせず、許可された木構造で評価する。
- 戦闘の報酬はon_winにだけ置く。逃走後は同じイベントへ戻れるようにする。
- スクリプトの待機状態を保存できることを崩さない。分岐内ローカル値と呼出scopeを扱う。
- 保存形式や継続位置の互換性を壊す変更ではcontentVersion/saveVersionを更新し、移行方針を記す。
- コアの乱数にMath.randomを混ぜない。seedと乱数位置を保存する。
- 主たる探索地点を鍵のない側に閉じ込めない。正面の閉じた扉を階段より優先して調べる仕様を維持する。
- 依頼の結末やmodel.world.truthを未解決時のViewModelへ流さない。静的ゲームなのでソースを読んだプレイヤーへの秘匿は保証しない。

## 職業システムの引き継ぎ

JOB_SYSTEMとJOB_IMPLEMENTATIONを読んでください。原稿はauthoring/jobs.json、生成はtools/build-jobs.mjsです。build-content/build-entities/build-presentationからも最後に適用するため、職業・技能を消しません。人物の初期職と職業履歴は別管理です。通常の派生JSONだけを直さず、原稿側を変更してください。

共通技能・職業技能はengine.skillsから列挙し、人物定義の旧skillsから列挙しないでください。レベルをテストで直接変更せずawardを通してください。battleSkillPlan、jobChangePlan、fieldActionPlanが事前検査を担当します。能力・材料・袋を直接書き換える別経路を追加しないでください。

node tools/simulate-balance.mjsとnode tools/simulate-jobs.mjsで計測できます。HTTPでの実起動と音声の最終確認は未完了です。Playwrightを用意した通常環境ではtools/browser-jobs-smoke.pyを使用できます。

## 1.3.1のシナリオ拡張

[SCENARIO_IMPLEMENTATION](SCENARIO_IMPLEMENTATION.md) と [SCENARIO_DESIGN](SCENARIO_DESIGN.md) が今回の実装結果です。以下の提案のうち、戦績・受注時差分・jumpによる場面継続・非表示選択肢・保存移行を実装しました。actor_stat、一般化したObjective/Reward層、世界全体の時計は未実装です。元の提案は検討経緯として下に残します。

## シナリオ条件・フラグ・戦績システムの拡張（1.3.0時点の提案）

現状の式エンジンには `eq/ne/gt/gte/lt/lte/and/or/not/exists/in/contains` と、`has_item`、`has_member`、`has_status`、`event_done`、`map_discovered` があり、`flags` と `vars` の任意パスも条件式から参照できます。選択肢、`if`、クエストの `requires`、マップオブジェクトの `condition` などへ共通利用できるため、条件判定の基礎はできています。

ただし今後のシナリオでは、「特定の魔物を何匹倒した」「特定エンカウントに何回勝った」「この仲間がいる／いない」「特定人物の現在HP、最大HP、STR、AGIなどが一定以上／以下」「特定の状態・イベント・クエスト進行を満たした」といったゲーム状態を横断して参照する必要があります。個別シナリオごとに `vars.foo` を手作業で加算する方式へ寄せず、シナリオ用の状態参照基盤として整理してください。

特に戦績システムを追加してください。戦闘終了時の金・EXP付与だけでは討伐条件を正しく扱えません。ランダムエンカウント、複数体編成、途中逃走、同一エンカウントの再戦でも一貫して集計できることが必要です。保存状態には、少なくとも次のような戦績を持つ案を検討してください。

- 総戦闘回数、勝利数、逃走数、敗北数。
- 魔物IDごとの累計討伐数。
- エンカウントIDごとの勝利回数。
- 必要なら被ダメージ、与ダメージ、使用技能、使用アイテムなどの統計。ただしシナリオ条件に不要なものまで先に肥大化させないこと。
- クエスト開始後の討伐数など「期間限定カウンタ」が必要な場合、累計戦績との差分で表現するか、クエスト側に開始時スナップショットを持つかを比較検討すること。

状態名は `statistics`、`records`、`history` 等を候補とし、`flags` と役割を分離してください。`flags` は世界・シナリオ上の離散状態、`vars` はシナリオ固有の汎用値、戦績はエンジンが自動記録する客観的履歴、と整理するのが望ましいです。戦績を通常スクリプトから任意書換え可能にすると信頼性が落ちるため、原則として戦闘・ゲームシステム側だけが更新し、シナリオからは読み取り専用にする案を優先してください。

シナリオJSONからは、例えば「slimeを5体以上倒した」を累計討伐数への `gte` として表現できるようにしてください。`has_member` は既に存在するので仲間の在否は `not` と組み合わせて表現できます。現状の `actors.<id>.hp/mp/statuses/job` は状態パスから参照できますが、STR/VIT/AGI/INTや最大HP・最大MPは職業・成長・装備から算出されるため、保存値を直接参照するだけでは最終能力値条件になりません。`actor_stat` のような読み取り専用式演算子、または安全な派生値参照機構を追加する案を検討してください。

フラグ管理もシナリオ用に整理・拡張してください。単純な真偽値だけでなく、クエスト進行、人物関係、地域状態、会話既読、世界変化などが増えたときに命名衝突や用途不明の値が乱立しないよう、名前空間・命名規約・責務を定義してください。例として `flags.world.*`、`flags.quest.*`、`flags.actor.*` のような階層化を候補にできますが、既存JSONとの互換性と記述量を比較して決めてください。クエスト自身の `quests.<id>.stage/evidence/outcome` ですでに表現できる状態を重複フラグ化しないことも重要です。

さらに、以下は不足部分として提言・検討してください。実装するかどうかは既存構造との重複、汎用性、セーブ互換性、JSONの記述性を比較して判断し、必要なら設計文書へ切り出してください。

- Objective層。`kill`、`collect`、`member_present`、`member_absent`、`actor_stat`、`event_done`、`reach` 等の典型的なクエスト目的を、毎回低レベル条件式で手書きするだけでなく、宣言的に記述できる仕組みが必要か検討すること。内部的に既存式へコンパイルする方式を優先候補とする。
- Reward層。現状のクエスト結末は自動報酬が `gold` と `xp` 中心で、アイテム付与、加入、解放、フラグ変更などはスクリプト命令で個別記述できます。これらを統一 `rewards` 定義へまとめる価値があるか検討すること。一回性、袋上限、加入上限、失敗時ロールバックも含める。
- Counter層。討伐数以外にも、会話回数、調査回数、特定行動回数などシナリオから参照したいカウンタが増える可能性があります。何でも戦績へ入れず、エンジン自動記録の統計とシナリオ固有カウンタを分けること。
- クエスト進行段階。現在の `available/active/completed` と evidence/outcome だけで、複数段階依頼・途中目標・失敗・期限切れ・再開を十分表現できるか検討すること。必要なら `stage` の意味を単なる受注状態とシナリオ内部段階に分離する。
- 条件の説明可能性。条件式が複雑になると、なぜ選択肢や依頼がロックされているかをUIへ説明しづらくなります。作者向け `requirement` 文字列の手書きだけでよいか、条件式から不足条件を取得する仕組みが必要か検討すること。
- 時間・期限。将来、歩数、戦闘数、休息回数、ゲーム内日数などによる期限付きイベントを扱うなら、先にどの時計を正準状態とするか決めること。現実時刻には依存させない。

実装時は、式演算子を追加するなら `src/core/expression.js`、検証を `src/core/validation.js`、Schema、セーブ検証、単体テストまで同時に更新してください。戦績更新は `battle.js` の勝敗確定箇所を主な入口とし、同じ撃破を二重計上しないこと、逃走時に死亡済みの敵を討伐として数えるかどうかを仕様として明示してください。クエスト固有IDや魔物固有IDをコアロジックへ直書きしてはいけません。

## 次の作業候補

優先はブラウザでの操作・レイキャスト表示・スマートフォン表示・音声の確認です。次にプレイテストの観察から移動距離と遭遇頻度、依頼の文量、地域別の戦闘難度を調整してください。

コンテンツ拡張では、現在の場面グラフを基礎に、複数階をまたぐ追跡や移動NPCを検討できます。新しい仕組みは汎用命令として実装し、個別シナリオの条件はJSONへ置きます。

素材を再生成する場合はassets/PROVENANCE.mdを読んでください。AIPaint/AIMusicを最新版へ無断で差し替えず、固定ソースとの出力差を確認します。

## 移行元

着手時のリポジトリHEADは `1c4962b143e6a84ec9d6a190960c09c24c349f40`。そこにPhaserの屋敷デモと設計原本があります。旧コードを必要とする場合はGit履歴から確認します。新しいゲームを動かすために旧PhaserのCDNや未配置assetsを復活させる必要はありません。
