# 灯帰りの迷宮

灯を持ち、仲間を連れ、迷宮から帰る。古典的なダンジョン探索と文章・選択肢のADVを組み合わせたブラウザRPGです。

作品版1.14.0。町10か所・13ダンジョン・33件の2Dマップを接続し、メッセージ内のシナリオ選択肢とプレイヤーコマンドを分離しています。[現状](doc/CURRENT_STATUS.md) ／ [シナリオ・クエスト文書](doc/scenarios/README.md) ／ [q002 骨の荷札](doc/scenarios/QUEST_Q002.md)。

## 遊ぶ

リポジトリのルートをHTTPで配信してください。実行時のnpm依存、外部CDN、APIキー、サーバー側処理はありません。

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

ブラウザで `http://127.0.0.1:8000/` を開きます。Windowsでは `python` でも実行できます。`file://` での直開きはJSON・ES Modulesの読込制約があるため対象外です。

GitHub Pagesでは、このリポジトリの `master` のルートを配信できます。Pagesの公開設定はこの実装では変更していません。非公開リポジトリの配信可否はアカウントの設定を確認してください。

最初は掲示板で「帰らない灯番」を受注し、その場で「迷宮の入口へ向かう（篝火の迷宮）」を押します。広場へ戻る必要はありません。矢印でコマンドを選び、Enterで決定します。W/Sの前後移動とA/Dの方向転換も使えます。新人・老人のイベントは指定セルを踏むと自動開始し、Eで壁灯などの足元・正面を調べます。会話・選択肢・戦闘もEnterと矢印で進められます。メインクエストと手帳に次の目的地が出ます。

初期表示は背景内ビューです。「記録 → 画面配置」で従来表示へ切り替えられます。道具・隊・手帳は背景内に開き、Escapeまたは「閉じる」で戻ります。長文の「次のページ」は表示だけを送り、最後の「続きを読む」で物語を進めます。装備対象・転職先・記録画面の設定も共通の選択・決定・キャンセルで操作できます。「記録 → キー設定」で主キー・副キーを変更し、適用・破棄・初期値復帰ができます。キャンセルを重ねると町では広場、ダンジョンでは探索画面へ戻ります。[表示仕様](doc/ui/IN_SCENE_VIEW.md)、[キー操作](doc/ui/KEYBOARD_CONTROLS.md)。

音は初期設定ではオフです。右上の「音：切」を押し、「音：再生中」を確認してください。「記録」で音量を調整できます。「音：再生待ち」「音：再試行」の場合はボタンをもう一度押します。音の設定は次回にも保存されます。

## 人物の所在を追うシナリオ（1.4.0）

q001〜q010 をシナリオモデル v1.1 で改稿しました。人物と物品の所在、介助、受け渡し、油の残量、救助人数を状態として保存し、行為と結末の成立条件を検査します。36種類のNPC肖像を画像生成で制作し、旧AIPaint素材も保存しています。会話にはその場にいる人物を表示します。伝声管や面会窓越しの人物には「声」と表示します。

[改稿全文](doc/scenarios/QUEST_CATALOG.md#q001-帰らない灯番) ／ [人物一覧・画像](doc/scenarios/CHARACTERS.md) ／ [モデル・保存互換性](doc/scenarios/SCENARIO_MODEL_V11.md)

## 個別に進む依頼を遊ぶ

既存100件も依頼ごとの場面と行動で進むように改稿しました。q101〜q200はいつでも受注できます。依頼一覧から選び、追跡欄の「相談・調査」地点を調べてください。会話内の「中断」で探索へ戻り、同じ地点から続けられます。完了後は同じ場所で後日談を読めます。追加分の完了数は本編q100の解放を代替しません。

[現行シナリオの設計](doc/scenarios/SCENARIO_DESIGN.md) に、参照したNotion原稿、ゲーム化の範囲、保存互換性を記載しています。

## 職業を変える（1.3.0）

「酒場・仲間」で人物の「職業・成長」を開き、30職から転職先を選んで確定します。能力・成長・習得段階・袋へ戻る装備を確認できます。転職は無料ですが回復はせず、過去の成長は保持します。測量・調合は「隊の状態」の探索特技から使用します。

詳細は [職業システム・30職一覧](doc/JOB_SYSTEM.md) と [現在の検証結果](doc/PROGRESS.md) を参照してください。

## 内容

1. 10地域・13ダンジョン、合計33件の2Dマップ。疑似3Dの通路と探索済み地図。
1. 200件の日本語クエスト、579場面・629結末。救助後の再捜索、作業順による損失、実験、交渉、待機、帰還後の応答など、依頼ごとに進行を定義。
1. 4人で開始。酒場「帰り火亭」で10人から最大5人を編成。ターン制戦闘、攻撃・術・防御・回復・毒・逃走、経験値と装備。
1. 町、店、宿、無料の施療所、補給箱、施錠扉、鍵、罠、泉、階段、帰還印。
1. 自動保存、3つの手動記録、JSONファイル書き出し・読込。会話・選択・戦闘中の継続位置も保存。
1. 59の敵定義（追加依頼用13体は既存画像・地域相当の能力を使用）。従来の5種の絵に、新種20体の個別画像と仲間10人の肖像を追加。
1. AIPaintの背景・初期魔物、AIMusicの探索・戦闘ループ曲。BGMは音量を調整した新版を収録。
1. 28種のSE、JSON式の動き8種、8コマ画像アニメーション8種、フィールド演出8種。

最終依頼「百の帰還」は元のq001〜q099の完了で解放されます。全滅しても依頼や手掛かりは失われず、町で回復して再挑戦できます。

## シナリオと画面を作る

作品定義は [data/game.json](data/game.json)、個別クエストは [data/quests](data/quests)、マップは [data/maps](data/maps) にあります。JSONだけで本文、分岐、報酬、戦闘、敵AI、計算式、道具、イベントを変更できます。正式な入力形式はJSONです。

[view-preview.html](view-preview.html) は画面だけをデザインする独立ページです。11種類のサンプル画面を選べ、テーマをJSONへ書き出せます。ゲーム本番の「記録 → 画面テーマを読み込む」で適用します。より大きな構成変更も `src/view/` だけで行えます。

[フィールド・戦闘中イベント一覧](doc/scenarios/EVENT_CATALOG.md) / [セルの明るさ](doc/FIELD_LIGHTING.md)

[仕様・進捗・引き継ぎ](doc/README.md) / [UIの根本方針と現状](doc/ui/PHILOSOPHY_AND_STATUS.md) / [JSON命令リファレンス](doc/scenarios/SCRIPT_REFERENCE.md) / [ビュー契約](doc/ui/VIEW_CONTRACT.md) / [200件の索引](doc/scenarios/QUEST_CATALOG.md) / [素材の来歴](assets/PROVENANCE.md)

[魔物一覧・画像](doc/MONSTER_CATALOG.md) / [戦闘バランス計画・実測](doc/BALANCE_PLAN.md) / [仲間一覧・肖像](doc/COMPANION_CATALOG.md)

[SE一覧・音源](doc/ui/SE_CATALOG.md) / [戦闘・フィールド演出一覧](doc/ui/EFFECT_CATALOG.md)

「記録」でSE音量と演出の通常・軽減・オフを選べます。ビュー用プレビューでは効果を再生し、SEを個別に試聴できます。演出とSEの原稿は `authoring/presentation.json`、素材の再作成は `node tools/assets/generate-effects.mjs`、定義の更新は `node tools/build-presentation.mjs` です。

## 開発確認

Node.js 22以上。依存のインストールは不要です。

```sh
node tools/validate.mjs
node tools/check-static.mjs
node --test tests/*.test.mjs
```

`npm test` でもテストできます。GitHub Actionsにも同じ検査を定義しています。

`authoring/structures-1.mjs`〜`5.mjs` は既存100件の個別進行、`structures-additional.mjs` は追加篇10件の改稿です。`authoring/quests.txt` と `authoring/scenarios-01.mjs`〜`10.mjs` は基礎原稿・旧進行の互換用生成にも使います。生成済みJSONを同梱しているため、遊ぶ際の生成は不要です。

q001の原稿は `authoring/story-q001.mjs`、q002は `authoring/story-q002.mjs`、q003〜q010は `authoring/stories-v11-*.mjs`、人物設定は `authoring/characters.mjs` です。`npm run build:characters` は旧AIPaint素材を再生成し、新しい画像生成肖像への参照を維持します。画像生成用の英語・日本語プロンプトは `assets/source/characters/imagegen-prompts.json` に保存しています。

全200件の再生成は `npm run build:scenarios` です。既存原稿・魔物・演出・職業を生成し、互換用進行、新しい個別進行、マップ配置、一覧、Schemaを順に適用します。`build-content`、`build-entities`、`build-presentation`、`build-jobs` 単体では版やデータが途中段階になるため、通常は `npm run build:scenarios` 全体を実行してください。画面用の表示例は `node tools/build-fixtures.mjs` で更新します。生成先へ直接加えた変更は、再生成前に原稿へ反映してください。

内容版1.14.0は旧セーブを移行しません。自動保存・スロット・ファイルの読込でエラーが出たら、最初から新しい旅を始めます。正常な同版の記録は会話・戦闘を含め再開できます。

元のPhaser屋敷デモはGit履歴に保存されています。旧セーブ `phaserAdventureGameSave` は変更しませんが、新ゲームへは移行しません。
