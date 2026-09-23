# 複数ダンジョンと固有システムの設計

更新日: 2026-09-18。作品版1.14.0の実装済み構成と拡張方法です。現在の一覧は[DUNGEON_CATALOG.md](DUNGEON_CATALOG.md)へ記載します。

## 編集するデータ

正本は `config/dungeons/*.json`。ダンジョンID、表示名、所属地域、入口、マップ一覧、`systems` を定義します。`npm run build:dungeons` が `data/dungeons.json` とマップ・アイテム・遭遇・スクリプト等を生成します。

現在はJSONを直接編集します。JSON Schemaはエディター補助、ロード時の検証器は参照と座標・値の整合を担当します。YAML入力、GUIフォーム、汎用の条件付きルール言語は未実装です。

## 共通部品

`systems` のキーはダンジョン内の部品ID、`use` は `src/core/dungeons.js` に登録された実装名です。同じ部品を別のダンジョンへ設定値を変えて配置できます。登録済み部品は16種です。通常データは fire_network、map_connections、compartment_water、corrosion、breakable_walls、plant_garden、warp_network、skill_library、market_pacts、air_supply、power_grid、terrain_shift、vector_curse、suppression_zone の14種を使用します。waterworks と voxel_space は退避した旧マップ用としてコードと試験を保持します。

`enabled: false` は部品を無効にします。各部品の `validate`／`validateState` が定義とセーブを検査し、`plan` が対象・費用・条件を調べ、`act` が成立した操作を実行します。入口・退場・移動・戦闘・能力・技能・通行判定のフックを必要に応じて提供します。

プレイヤーが動かす天球儀と、自動的に変わる巨獣の足場は、同じ terrain_shift の manual／random 設定です。鏡は転移の接続、深淵はセルごとのベクトルを定義します。植物は種別・材料・成長時間・地形パッチをデータとして持ちます。

## 状態と持続期間

`state.dungeons.persistent.<dungeon>.systems` は退場後も残る状態です。`state.dungeons.active.systems` は今回の探索だけの状態で、ダンジョンを出ると破棄します。探索番号・歩数・乱数を保存し、再読込でタイミングを引き直しません。

成長植物、開通、浮上、配線などの永続状態と、携帯燃料、貸出技能、空気、警戒、衰弱などの探索状態を部品ごとに定義します。詳細な保存期間は各固有システム仕様を参照してください。

通常移動・ワープ・階段・退場と、地形が足元を塞ぐ場合の扱いも検証します。部品・保存構造を変える場合は内容版を更新します。1.14.0では旧内容版の移行を用意せず、読込エラー時に新規開始します。

## シナリオと表示

現地調査は `config/quests/qXXX.events.json` に定義し、クエストJSONへ集約します。素材は `config/dungeon-art.json` に定義します。マージ済みのPR #8は実状態を読む調査、手帳への記録、画像の割当を追加しています。操作中の本筋のフラグをビューが直接変更する設計にはしません。

Coreの投影をApplicationがViewModelへ変換し、Viewは文字・画像・地図と、許可された操作を表示します。画像の切り出し矩形は表示用データです。装置の費用計算や地形変更をViewへ持たせません。

## 新しい仕組みの追加

既存部品の値・配置・接続・材料の変更ならJSONを編集します。新しいゲーム規則が必要なら `src/core/systems/` に共通部品を実装し、レジストリ、定義検証、保存検証、Schema、投影と操作の一致を追加します。個別のダンジョンIDによる分岐を共通コアへ増やしません。

現行JSONで表現できない規則を、未登録の `use` や任意JavaScriptの文字列として追加してはいけません。汎用ルールエンジンやフォーム編集は、実際の編集負担と必要性を確認してから検討する拡張です。

## 退避した立体区画の保守

voxel_spaceはmap.voxelsの層・六面・移動経路・装置を読みます。区域の水没度、面の開閉、掘削、設置を永続状態へ保存し、planで高さ・距離・経路・費用をまとめて検査します。Coreのvoxels.jsが形状・足場・水平連結区域と下部への水没操作、voxel-validation.jsが配置と保存検証、Applicationのvoxel-projection.jsが現在高の表示を担当します。

通常ロードには立体マップを含めません。保存原稿は `authoring/legacy/2026-09-18-map-layout`、旧編集元は `config/voxel-content.json` です。新規の立体マップにはvoxel_spaceを一つだけ対応させます。従来のterrain_shiftなどの二次元パッチを立体マップへ併用する対応は今回の範囲外です。[定義例と制約](VOXEL_TERRAIN_AND_WATER.md)を参照してください。
