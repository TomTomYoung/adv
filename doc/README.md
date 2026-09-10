# adv ドキュメント

更新日: 2026-09-10。現行版: 灯帰りの迷宮 1.3.2。

最初に [SPEC.md](SPEC.md)、続いて [PROGRESS.md](PROGRESS.md)、[HANDOFF.md](HANDOFF.md) を読んでください。

| 文書 | 内容 |
| --- | --- |
| [SPEC.md](SPEC.md) | 実装済みのゲーム・データ・戦闘・保存仕様 |
| [PROGRESS.md](PROGRESS.md) | 完成範囲、検証実績、残る制限 |
| [HANDOFF.md](HANDOFF.md) | 次担当の入口、修正箇所、維持すべき条件 |
| [SCRIPT_REFERENCE.md](SCRIPT_REFERENCE.md) | 実行可能なJSON DSLの命令・式・例 |
| [VIEW_CONTRACT.md](VIEW_CONTRACT.md) | エンジンを変更しない画面制作の契約 |
| [QUEST_CATALOG.md](QUEST_CATALOG.md) | 200件・629結末の索引・各場面の行為と接続・分岐ごとの結末 |
| [SCENARIO_IMPLEMENTATION.md](SCENARIO_IMPLEMENTATION.md) | 1.3.2の個別進行・追加篇の改稿・検証・セーブ互換性 |
| [SCENARIO_DESIGN.md](SCENARIO_DESIGN.md) | Notionの五層モデルと実装の対応 |
| [MONSTER_CATALOG.md](MONSTER_CATALOG.md) | 既存の敵と追加20種の姿・発想・代表行動 |
| [BALANCE_PLAN.md](BALANCE_PLAN.md) | 実装前の敵数値・遭遇編成・強さの検証計画 |
| [COMPANION_CATALOG.md](COMPANION_CATALOG.md) | 仲間10人の一覧・酒場の入れ替え・保存移行計画 |
| [JSON_SCRIPT_SPEC.md](JSON_SCRIPT_SPEC.md) | 以前に策定した拡張先を含む設計原本 |

設計原本は実装完了リストではありません。現在受け付ける構文はSCRIPT_REFERENCEと `data/schemas/` を優先してください。

- [SE一覧](SE_CATALOG.md)
- [戦闘・フィールドエフェクト一覧](EFFECT_CATALOG.md)

[職業システム・30職一覧](JOB_SYSTEM.md)：転職、技能、バフ、装備、成長、セーブ移行。

[職業システム実装・検証](JOB_IMPLEMENTATION.md)：操作、コード構成、試験結果、未確認事項。
