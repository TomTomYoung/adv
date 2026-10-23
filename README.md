# 灯帰りの迷宮

[前中後衛のバトルテスター](battle-tester.html) ／ [操作・設定](doc/battle/FRONTLINE_BATTLE.md)。

灯を持ち、仲間を連れ、迷宮から帰る。古典的なダンジョン探索と文章・選択肢のADVを組み合わせたブラウザRPGです。

[設定JSONの編集画面](config/index.html) ／ [編集・出力の使い方](doc/authoring/CONFIG_EDITORS.md)。

作品版1.29.0（現行説明の照合日: 2026-10-23）。町11か所・ダンジョン室内3か所・13ダンジョン・48件の2Dマップを接続しています。篝火の迷宮は既存9区画のIDと依頼位置を維持して3F配油分岐室を追加し、1〜10Fへ接続しました。4・7・10Fの中継出発、10Fの主、武器18種を追加しています。地下水道も既存10区画を1〜10Fへ接続し、4/7/10F設備と10F水門獣を追加しました。[水道の現行台帳](doc/dungeons/WATERWAY_TEN_FLOORS.md)。廃坑も既存1/2Fを残して3〜10F、洗浄点、4/7/10F設備、10F殻砕き獣、2本の帰路を追加しました。[廃坑の現行台帳](doc/dungeons/MINE_TEN_FLOORS.md)。[ダンジョンカタログと専用ページ](doc/dungeons/DUNGEON_CATALOG.md) ／ [篝火の迷宮の拡張](doc/dungeons/KAGARIBI_EXPANSION.md) ／ [現状](doc/CURRENT_STATUS.md) ／ [シナリオ・クエスト文書](doc/scenarios/README.md)。

## 遊ぶ

[公開版を開く](https://tomtomyoung.github.io/adv/)。手元で配信する場合はリポジトリのルートをHTTPで配信します。実行時のnpm依存、外部CDN、APIキー、サーバー側処理はありません。

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

ブラウザで `http://127.0.0.1:8000/` を開きます。Windowsでは `python` でも実行できます。`file://` での直開きはJSON・ES Modulesの読込制約があるため対象外です。

GitHub Pagesはこの公開リポジトリの `master` のルートを配信しています。最新の配信結果は[Actions](https://github.com/TomTomYoung/adv/actions)で確認できます。

起動時は最新の `runtime.json` を確認し、JavaScriptの依存先・CSS・JSON・画像・音声を配信更新ID付きのURLから読み込みます。通常の再読み込みで新しい公開版へ切り替わり、作品内容版のセーブ互換性とは独立して更新します。配信途中のJS・CSS・JSONの不一致は整合性検証で停止し、保存を上書きしません。「記録」で更新IDを確認できます。コード・配布データ・素材を変更したら `npm run build:runtime` を実行してください。CIは生成忘れを検出します。[配信の保守手順](doc/development/README.md#配信とキャッシュ)。

最初は掲示板で「帰らない灯番」を受注し、その場で「迷宮の入口へ向かう（篝火の迷宮）」を押します。広場へ戻る必要はありません。町では矢印でコマンドを選び、Enterで決定します。ダンジョン探索中は↑/↓で前進・後退、←/→で方向転換し、Enterで配置セルの対象を調べます。壁灯はそのセルで設置面を向きます。W/S/A/DとEも補助キーとして使えます。新人・老人のイベントは指定セルを踏むと自動開始します。会話・選択肢・戦闘もEnterと矢印で進められます。メインクエストと手帳に次の目的地が出ます。

初期表示は背景内ビューです。「記録 → 画面配置」で従来表示へ切り替えられます。道具・隊・手帳は背景内に開き、Escapeまたは「閉じる」で戻ります。長文の「次のページ」は表示だけを送り、最後の「続きを読む」で物語を進めます。装備対象・転職先・記録画面の設定も共通の選択・決定・キャンセルで操作できます。「記録 → キー設定」で主キー・副キーを変更し、適用・破棄・初期値復帰ができます。キャンセルを重ねると町では広場、ダンジョンでは探索画面へ戻ります。[表示仕様](doc/ui/IN_SCENE_VIEW.md)、[キー操作](doc/ui/KEYBOARD_CONTROLS.md)。

音は初期設定ではオフです。右上の「音：切」を押し、「音：再生中」を確認してください。「記録」で音量を調整できます。「音：再生待ち」「音：再試行」の場合はボタンをもう一度押します。音の設定は次回にも保存されます。

## 人物の所在を追うシナリオ

q001〜q010とq201〜q210はシナリオモデル v1.1 で作成しています。人物と物品の所在、介助、受け渡し、油の残量、救助人数を状態として保存し、行為と結末の成立条件を検査します。既存36人のNPC肖像と旧AIPaint素材を保存しています。追加10編の専用NPC20人は名前で登場し、専用肖像・立ち絵は未制作です。会話にはその場にいる人物を表示します。伝声管や面会窓越しの人物には「声」と表示します。

[改稿全文](doc/scenarios/QUEST_CATALOG.md#q001-帰らない灯番) ／ [人物一覧・画像](doc/scenarios/CHARACTERS.md) ／ [モデル・保存互換性](doc/scenarios/SCENARIO_MODEL_V11.md)

## 個別に進む依頼を遊ぶ

既存100件も依頼ごとの場面と行動で進むように改稿しました。q101〜q200はいつでも受注できます。依頼一覧から選び、追跡欄の「相談・調査」地点を調べてください。資材・所持金が不足する作業では、その作業専用の不足経路から探索へ戻ります。補給後は現場で再開できます。完了後は同じ場所で後日談を読めます。追加分の完了数は本編q100の解放を代替しません。

篝火迷宮には追加10編（表示002〜011、固定ID q201〜q210）があります。「帰らない灯番」完了後に順不同で受注できます。[人物・分岐・編集元](doc/scenarios/KAGARIBI_TEN_QUESTS.md)。

内部IDと表示順は分離されており、追加10編は表示002〜011、従来のq002は表示012です。物語内の全行動を実移動へ接続したのはq001〜q004・q201〜q210で、q005〜q200の接続は続く工程です。

[現行シナリオの設計](doc/scenarios/SCENARIO_DESIGN.md) に、参照したNotion原稿、ゲーム化の範囲、保存互換性を記載しています。

## 職業を変える

町のキャラクターカードからプロフィールの「転職」を開き、30職から転職先を選んで確定します。能力・成長・習得段階・袋へ戻る装備を確認できます。転職は無料ですが回復はせず、過去の成長は保持します。測量・調合はプロフィールの「スキル」、祈祷・点火などは「魔法」ページから使用します。「隊の状態」は左上にパーティーのカードと待機、左下に酒場のカードと加入、各右側に選択した人物のプロフィールを表示します。[プロフィールと編成](doc/ui/CHARACTER_PROFILES.md)。

詳細は [職業システム・30職一覧](doc/battle/JOB_SYSTEM.md) と [現在の検証結果](doc/development/PROGRESS.md) を参照してください。

## 給油・中継出発と技能教習

「帰らない灯番」完了後、篝火・地下水道・廃坑・庭園の18設備を修理し、無料給油と中継出発を解放できます。油の隊共通容量は180から270へ増え、戦闘・初回修理・追加10依頼の技能宝石で人物別17技能を購入できます。うち11技能はLv3まで購入可能です。[操作と現在の実装範囲](doc/dungeons/EXPEDITION_IMPLEMENTATION.md)。篝火は1〜10F、10F主、T1/T2武器18種まで接続済みです。通常遭遇・依頼6件・購入を含む18条件で10F復旧後Lv15〜16を確認しました。別経路・編成の消耗調整と4迷宮各20Fへの拡張は続く実装です。

## 戦闘方式

初期設定はClassicです。「記録 → 戦闘方式」からGrid（位置・射程）とFrontline（前中後衛）も選べ、次の戦闘から反映されます。前進、戦闘不能者の退避、陣地の縮小・拡大、排除とノックバックはFrontlineの規則です。[Grid](doc/battle/GRID_BATTLE.md)／[Frontlineとバトルテスター](doc/battle/FRONTLINE_BATTLE.md)。技能・敵編成・消耗の実戦調整は継続します。

## 内容

1. 10地域・13ダンジョン、合計48件の2Dマップ。疑似3Dの通路と探索済み地図。
1. 210件の日本語クエスト、634場面・659結末。救助後の再捜索、作業順による損失、実験、交渉、待機、帰還後の応答など、依頼ごとに進行を定義。
1. 4人で開始。酒場「帰り火亭」で10人から最大5人を編成。ターン制戦闘、攻撃・術・防御・回復・毒・逃走、経験値と装備。
1. 町、店、宿、無料の施療所、補給箱、施錠扉、鍵、罠、泉、階段、帰還印。
1. 自動保存、3つの手動記録、JSONファイル書き出し・読込。会話・選択・戦闘中の継続位置も保存。
1. 66の敵定義。追加依頼用13体は既存画像・地域相当の能力を使い、篝火拡張で7体を追加。共通5画像、新種20体の個別画像と仲間10人の肖像を収録。
1. AIPaintの背景・初期魔物、AIMusicの探索・戦闘ループ曲。BGMは音量を調整した新版を収録。
1. 28種のSEと、JSON式の動き・8コマ画像アニメーション・フィールド効果を含む31の演出定義。

最終依頼「百の帰還」は元のq001〜q099の完了で解放されます。全滅後は町で回復して再挑戦できます。通常の依頼・手掛かりは保持し、q001の救援前だけは共通チェックポイントで未完了区間を巻き戻して老人との再遭遇から進めます。

## シナリオと画面を作る

作品定義は [data/game.json](data/game.json)、個別クエストは [data/quests](data/quests)、マップは [data/maps](data/maps) にあります。JSONだけで本文、分岐、報酬、戦闘、敵AI、計算式、道具、イベントを変更できます。正式な入力形式はJSONです。

[view-preview.html](view-preview.html) は画面だけをデザインする独立ページです。11種類のサンプル画面を選べ、テーマをJSONへ書き出せます。ゲーム本番の「記録 → 画面テーマを読み込む」で適用します。より大きな構成変更も `src/view/` だけで行えます。

[フィールド・戦闘中イベント一覧](doc/scenarios/EVENT_CATALOG.md) / [セルの明るさ](doc/dungeons/FIELD_LIGHTING.md)

[仕様・進捗・引き継ぎ](doc/README.md) / [UIの根本方針と現状](doc/ui/PHILOSOPHY_AND_STATUS.md) / [JSON命令リファレンス](doc/scenarios/SCRIPT_REFERENCE.md) / [ビュー契約](doc/ui/VIEW_CONTRACT.md) / [210件の索引](doc/scenarios/QUEST_CATALOG.md) / [素材の来歴](assets/PROVENANCE.md)

[魔物一覧・画像](doc/battle/MONSTER_CATALOG.md) / [戦闘バランス計画・実測](doc/battle/BALANCE_PLAN.md) / [仲間一覧・肖像](doc/battle/COMPANION_CATALOG.md)

[SE一覧・音源](doc/ui/SE_CATALOG.md) / [戦闘・フィールド演出一覧](doc/ui/EFFECT_CATALOG.md)

「記録」でSE音量と演出の通常・軽減・オフを選べます。ビュー用プレビューでは効果を再生し、SEを個別に試聴できます。演出とSEの原稿は `config/presentation.json`、素材の再作成は `node tools/assets/generate-effects.mjs`、定義の更新は `node tools/build-presentation.mjs` です。

[くぼみ6種類の表示確認](depression-preview.html)では、連結形状・見る方向・照度を切り替えられます。[くぼみの仕様](doc/dungeons/FLOOR_DEPRESSIONS.md)。

## 開発確認

Node.js 22以上。依存のインストールは不要です。

```sh
node tools/validate.mjs
node tools/check-static.mjs
node --test tests/*.test.mjs
```

`npm test` でもテストできます。GitHub Actionsにも同じ検査を定義しています。

`authoring/structures-1.mjs`〜`5.mjs` は既存100件の個別進行、`structures-additional.mjs` は追加篇10件の改稿です。`authoring/quests.txt` と `authoring/scenarios-01.mjs`〜`10.mjs` は基礎原稿・旧進行の互換用生成にも使います。生成済みJSONを同梱しているため、遊ぶ際の生成は不要です。

q001の原稿は `authoring/story-q001.mjs`、q002は `authoring/story-q002.mjs`、q004は `authoring/story-q004.mjs`、残るq003〜q010は `authoring/stories-v11-*.mjs`、追加q201〜q210は `authoring/story-q201.mjs`〜`story-q210.mjs` を `authoring/stories-kagaribi.mjs` で集約します。既存人物は `authoring/characters.mjs`、追加20人は `stories-kagaribi.mjs` の `castCards` が正本です。`npm run build:characters` は旧AIPaint素材を再生成し、新しい画像生成肖像への参照を維持します。画像生成用の英語・日本語プロンプトは `assets/source/characters/imagegen-prompts.json` に保存しています。

全210件の再生成は `npm run build:scenarios` です。既存原稿・魔物・演出・職業を生成し、互換用進行、新しい個別進行、マップ配置、一覧、Schemaを順に適用します。`build-content`、`build-entities`、`build-presentation`、`build-jobs` 単体では版やデータが途中段階になるため、通常は `npm run build:scenarios` 全体を実行してください。画面用の表示例は `node tools/build-fixtures.mjs` で更新します。生成先へ直接加えた変更は、再生成前に原稿へ反映してください。

正常な1.25.0〜1.28.0のセーブを1.29.0へ検証後に移行し、既存進行・装備の塩・設備・購入技能を保持します。1.25〜1.27で地下水道の旧下層へ到達済みなら乾いた階段を開通済みにします。1.28からは内容版だけを更新し、新しい設備・帰路・報酬を付与しません。1.25.0には遠征状態を追加します。既知の追加依頼q201〜q210が全て未登録ならその状態も補完します。その他の内容版と破損セーブは移行せず、自動保存・スロット・ファイルの読込に失敗した場合は新しい旅を始めます。正常な同版の記録は会話・戦闘を含め再開できます。

元のPhaser屋敷デモはGit履歴に保存されています。旧セーブ `phaserAdventureGameSave` は変更しませんが、新ゲームへは移行しません。

現行説明は担当節を更新します。過去の記述・検証条件は[検証履歴](doc/development/PROGRESS.md)と[整理前原文](doc/legacy/2026-10-20/README.md)に保存しています。
