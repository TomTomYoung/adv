# UIと操作の設計

更新日: 2026-09-25。UIの目的、現在の実装、操作設定、表示契約をこのフォルダへまとめます。

最初に[根本方針と現状](PHILOSOPHY_AND_STATUS.md)を読み、変更がプレイヤーの行為と共通操作に沿うか確認してください。

[KEYBOARD_CONTROLS.md](KEYBOARD_CONTROLS.md)：探索の直接移動と調査、選択画面の決定・キャンセル・方向選択、フォーカスの引き継ぎ、広場・探索へ戻る順序。

[INSPECTION.md](INSPECTION.md)：便利調べる・任意調べる、消費時の選択、既読の判定、エッジ上のたいまつ。

[KEY_CONFIG.md](KEY_CONFIG.md)：キー割り当ての変更、重複検査、適用と取消、保存と初期化。

[MESSAGE_AND_COMMAND_WINDOWS.md](MESSAGE_AND_COMMAND_WINDOWS.md)：本文と選択肢を統合するメッセージ、探索で行為を選ぶコマンド。

[CHARACTER_STAGING.md](CHARACTER_STAGING.md)：固定高さ・実寸ページ送り・右側のスクロールと、人物の配置・左右反転・発話者・カード表示。

[IN_SCENE_VIEW.md](IN_SCENE_VIEW.md)：背景内表示と従来表示、画面内ウィンドウ、長文、狭い画面の検証。

[SHOP_AND_PREPARATIONS.md](SHOP_AND_PREPARATIONS.md)：ショップの購入先選択、個人の持ち物、使用・受け渡し・装備と保存。

[MINIMAP.md](MINIMAP.md)：正方形の地図素材、暗所の踏査記録、拡大・復帰と入力遮断。

[VIEW_CONTRACT.md](VIEW_CONTRACT.md)：ViewModel、操作意図、素材と表示の責務。

[EFFECT_CATALOG.md](EFFECT_CATALOG.md)：表示効果の定義と描画契約。

[SE_CATALOG.md](SE_CATALOG.md)：効果音の定義、再生条件と音量。

[DUNGEON_RENDER_REVIEW.md](../legacy/2026-09-25/DUNGEON_RENDER_REVIEW.md)：水面・床材・装置の描画修正の履歴。現在の表示確認済み範囲とは区別します。

ゲームの判定は[共通仕様](../SPEC.md)、地形・明度は[セルと境界](../dungeons/MAP_CELLS_AND_BOUNDARIES.md)と[フィールド照明](../dungeons/FIELD_LIGHTING.md)、全体の検証と次工程は[進捗](../development/PROGRESS.md)・[引き継ぎ](../HANDOFF.md)を参照してください。
