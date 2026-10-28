# シナリオ・クエスト文書

2026-09-26: [q004の実移動](Q004_WORLD_ROUTE.md)を実装済み。

作品版1.34.0、確認日2026-10-28。[文書全体へ戻る](../README.md)。シナリオ本文・クエスト・人物・イベント・命令の文書をこのフォルダへ集約します。実行用JSONは `data/`、編集用JSONは `config/`、JavaScriptの物語原稿は `authoring/` に置きます。[正本の対応](../authoring/CONFIG_EDITOR_SOURCES.md)を参照してください。

## シナリオの版

[トルネア・オッドランド・帝国](../world/TORNEA_ODDLAND.md)、[アダと夫](../world/ADA.md)、[仲間の追加設定](../world/COMPANIONS.md)、[地下街と勢力](../world/UNDERGROUND_CITY.md)、[くらがりの浸食](../world/DARKNESS.md)は作者向け資料です。夫の凶行という表向きの説明とアダが実行者である真相を区別し、記憶改ざん、大水門の鍵、最終盤の交代、同行イベントなどを採用設定・構想として記録しています。今回の明示指示により、8人の仲間連作80件を第2版へ追加しました。オッドランド侵攻、大水門の鍵と開放、アダ離脱と夫加入は引き続き保留します。後続の明示指示により、平時の越境と100件の設計に着手しました。[今回の設計範囲](../HANDOFF.md#オッドランドの設計と最終盤の保留)を参照してください。

[SCENARIO_EDITIONS.md](SCENARIO_EDITIONS.md)：初版と第2版の切替、最新版の初期設定、版別の保存と継承範囲。

[SCENARIO_MODEL_V12B.md](SCENARIO_MODEL_V12B.md)：第2版に採用するGAMEBOOKモデルv1.2bの全文。

[editions/README.md](editions/README.md)：改稿版の本文。q001第2版と新作の仲間連作80件を収録し、ほかの209件は初版を継承します。

## 本文と人物

[QUEST_CATALOG.md](QUEST_CATALOG.md)：初版の全210本・659結末の索引。全件に「【ダンジョン名／町名】[場所]：経過」を掲載し、移動・再訪・分岐を概観できます。q001〜q010は個別ページへリンク、q011〜q020・q201〜q210は全文、q021〜q200は概要・経過・結末。

[quests/README.md](quests/README.md)：q001〜q010の個別ページ一覧。本文・選択後の処理・イベントID・場所・分岐・結末を集約。q003〜q010には人物と証拠の所在、行為ごとの条件・費用・状態変化、資材不足時の再開、編集時の確認事項も掲載します。

[CHARACTERS.md](CHARACTERS.md)：初版56人のNPC全員に会話用画像、依頼人索引。仲間の編成は [COMPANION_CATALOG.md](../battle/COMPANION_CATALOG.md)。

[KAGARIBI_TEN_QUESTS.md](KAGARIBI_TEN_QUESTS.md)：篝火迷宮の追加10編。人物の動機・固定過去・介入・結末・編集元。

[KAGARIBI_CHARACTER_ART.md](KAGARIBI_CHARACTER_ART.md)：q201〜q210の全20人に専用の透過画像を接続。原本・制作記録・表示対象・検証範囲。

[ODDLAND_CHARACTER_ART.md](ODDLAND_CHARACTER_ART.md)：国境q291〜q295の12人の専用画。37場面と所持金0Gの計38状態・10結末・第2版だけへの接続・原本と制作記録。残る未制作10人と次のq296。

## 設計と実行

[SALOME_100_QUEST_DESIGN.md](SALOME_100_QUEST_DESIGN.md)：サロメの新規100企画。三学・生活・探索・遺物の10群。初期配分は既存40＋新作60、残る40企画は予備です。

[REGIONAL_QUEST_ALLOCATION.md](REGIONAL_QUEST_ALLOCATION.md)：灯帰り・オッドランド・サロメ各100件の条件付き配分と旧保存の互換。個人80件は別枠。[JSON台帳](REGIONAL_QUEST_ALLOCATION.json)に全IDを記載します。

[ODDLAND_100_QUEST_DESIGN.md](ODDLAND_100_QUEST_DESIGN.md)：オッドランドの新作100件の設計カード。10群の依頼・発見・介入・帰結、受注条件と後続への協力。第一群OD001〜010の[本文・実移動・選択・報酬](editions/e2/ODDLAND_FIRST_TEN.md)を実装済み。残る90企画は設計段階です。

[SCENARIO_DESIGN.md](SCENARIO_DESIGN.md)：モデルの適用範囲、正本、生成手順、常体化と探索到達。

[SCENARIO_MODEL_V11.md](SCENARIO_MODEL_V11.md)：q001〜q010・q201〜q210の人物・物品・所在・行為と結末条件。

[EXPLORATION_AND_PROSE.md](EXPLORATION_AND_PROSE.md)：探索による到達・地の文の常体化、現行への更新と未接続の範囲。

[QUEST_EVENTS.md](QUEST_EVENTS.md)：クエスト固有配置、出現条件と操作条件、調査記録、保存。

[EVENT_CHECKPOINTS.md](EVENT_CHECKPOINTS.md)：全滅時に未完了のイベント区間を取り消す共通チェックポイント。

[EVENT_SYSTEM.md](EVENT_SYSTEM.md)：enter・auto・interact・action、戦闘中イベント、自動到着と重複抑止。

[EVENT_CATALOG.md](EVENT_CATALOG.md)：全クエスト・共通マップの配置と強制戦闘の索引。

[SCRIPT_REFERENCE.md](SCRIPT_REFERENCE.md)：JSON DSLの65命令・31式演算子、状態参照・保存。

## 配置図と保守

配置図は `quest-maps/`。専用ページから各図と配布マップJSONへリンクします。`npm run build:catalog` がカタログ・専用ページ・図を生成し、`npm run check:docs` が内容・配置・ローカルリンクを照合します。改稿時は原稿と配布JSONを同期してから生成してください。

町の共通仕様は [WORLD_LOCATIONS.md](../world/WORLD_LOCATIONS.md)、2D区画は [CONNECTED_2D_MAPS.md](../dungeons/CONNECTED_2D_MAPS.md)、UIは [MESSAGE_AND_COMMAND_WINDOWS.md](../ui/MESSAGE_AND_COMMAND_WINDOWS.md)、作業の引き継ぎは [HANDOFF.md](../HANDOFF.md) を参照してください。

[PROSE_MODEL_V1.md](PROSE_MODEL_V1.md)：GAMEBOOK「読み手の気持ちを考える文章設計モデル 第1版」の全文。

[PROSE_CHECKLIST.md](PROSE_CHECKLIST.md)：GAMEBOOK「邪悪な文章の構造と点検チェックシート」の全文。
