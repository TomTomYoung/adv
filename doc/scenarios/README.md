# シナリオ・クエスト文書

作品版1.14.0、確認日2026-09-18。[文書全体へ戻る](../README.md)。シナリオ本文・クエスト・人物・イベント・命令の文書をこのフォルダへ集約します。ゲーム実行用JSONと編集原稿は従来どおりdata/・authoring/に置きます。

## 本文と人物

[QUEST_CATALOG.md](QUEST_CATALOG.md)：全200本・629結末の索引。q001・q002は専用ページへリンク、q003〜q020は全文、q021〜q200は概要・進行・結末。

[QUEST_Q001.md](QUEST_Q001.md)：帰らない灯番。8場面・2結末、巡灯路の配置図、強制戦闘・戦闘中イベント、5本の実移動。

[QUEST_Q002.md](QUEST_Q002.md)：骨の荷札。8場面・3結末、入口から荷揚げ場までの3マップ、標本室・審査所との6本の移動行為、証拠・同意・受け渡し。

[CHARACTERS.md](CHARACTERS.md)：36人のNPC・肖像、依頼人索引。仲間の編成は [COMPANION_CATALOG.md](../COMPANION_CATALOG.md)。

## 設計と実行

[SCENARIO_DESIGN.md](SCENARIO_DESIGN.md)：モデルの適用範囲、正本、生成手順、常体化と探索到達。

[SCENARIO_MODEL_V11.md](SCENARIO_MODEL_V11.md)：q001〜q010の人物・物品・所在・行為と結末条件。

[EXPLORATION_AND_PROSE_1_11.md](EXPLORATION_AND_PROSE_1_11.md)：探索による到達・地の文の常体化、現行への更新と未接続の範囲。

[QUEST_EVENTS.md](QUEST_EVENTS.md)：クエスト固有配置、出現条件と操作条件、調査記録、保存。

[EVENT_SYSTEM.md](EVENT_SYSTEM.md)：enter・auto・interact・action、戦闘中イベント、自動到着と重複抑止。

[EVENT_CATALOG.md](EVENT_CATALOG.md)：全クエスト・共通マップの配置と強制戦闘の索引。

[SCRIPT_REFERENCE.md](SCRIPT_REFERENCE.md)：JSON DSLの51命令・31式演算子、状態参照・保存。

## 配置図と保守

配置図は `quest-maps/`。専用ページから各図と配布マップJSONへリンクします。`npm run build:catalog` がカタログ・専用ページ・図を生成し、`npm run check:docs` が内容・配置・ローカルリンクを照合します。改稿時は原稿と配布JSONを同期してから生成してください。

町の共通仕様は [WORLD_LOCATIONS.md](../WORLD_LOCATIONS.md)、2D区画は [CONNECTED_2D_MAPS.md](../CONNECTED_2D_MAPS.md)、UIは [MESSAGE_AND_COMMAND_WINDOWS.md](../ui/MESSAGE_AND_COMMAND_WINDOWS.md)、作業の引き継ぎは [HANDOFF.md](../HANDOFF.md) を参照してください。
