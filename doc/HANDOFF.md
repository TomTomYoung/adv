# 実装引き継ぎ

更新日: 2026-09-14。対象は作品版1.8.0の立方体地形と貯水立坑です。PR #8・PR #9・PR #10はマージ済みです。水面・床材の修正記録は[DUNGEON_RENDER_REVIEW.md](DUNGEON_RENDER_REVIEW.md)を参照してください。[CURRENT_STATUS.md](CURRENT_STATUS.md)でmasterと作業ブランチの違いを確認し、[SPEC.md](SPEC.md)と[PROGRESS.md](PROGRESS.md)を読んでください。

## 正本と生成

q001〜q010は `authoring/stories-v11-1.mjs` と `stories-v11-2.mjs`、共通記法は `story-kit.mjs` です。所在・物品・同意・情報取得の検査を使います。

q011〜q020は `authoring/catalog-q011-q020.json` と `catalog-q011-q020.mjs` を変更します。`tools/apply-catalog-revisions.mjs` が `.catalog1.*` と対応する結末条件を出力します。

その他の依頼は `authoring/structures-*.mjs`、`structures-additional.mjs`、`scenarios-*.mjs` を確認します。過去の原稿は `quests.txt` と `reference`、旧セーブの固定定義は `compat` です。依頼番号や共通類型から調査手順・戦闘・結末を決める実装を通常経路へ戻さないでください。

ダンジョン定義は `authoring/dungeons/*.json`、追加アイテム・敵・装置・マップは `kagaribi-content.json`、`terrain-content.json`、`dungeon-content.json`、立体地形は `voxel-content.json`、素材と現地調査は `dungeon-scenes.json` です。

職業は `authoring/jobs.json`、敵と仲間は `authoring/entities.json`、NPCは `authoring/characters.mjs`、SEと表示効果は `authoring/presentation.json` が正本です。採用中の画像と出所は `data/assets.json` と `assets/PROVENANCE.md` を確認してください。採用済みの生成肖像を古い小型PNGへ戻さないでください。

## 生成と検証

```sh
npm run build:scenarios
npm run build:docs
npm run check:docs
npm run check
```

全コンテンツの再生成は既存ファイルを広く更新するため、実行前後の差分を確認します。2026-09-14の照合では、build:scenariosによりdata/items.jsonの発破薬キーの位置だけが末尾へ移り、値は一致しました。配布JSONのバイト列を使うDATA_SNAPSHOTのハッシュもその場合は変わります。ダンジョンのみは `npm run build:dungeons`、職業は `npm run build:jobs`、エディター用スキーマは `node tools/build-schemas.mjs`、文書のみは `npm run build:docs` です。

`node tools/build-fixtures.mjs` は data/view-fixtures.json の画面プレビュー用スナップショットを再生成します。文書だけの修正では実行不要です。旧セーブのテストfixtureはこれとは別に保持し、旧版互換の検証資料として扱います。

## 実装時に維持すること

Coreはゲーム状態を所有し、ApplicationはコピーしたViewModelを作り、Viewは表示とdispatchだけを行います。固有の依頼IDを共通コアへ追加せず、条件・本文・分岐を原稿へ置きます。

技能は `engine.skills` と許可計画器で判定します。人物定義の旧 `skills` 配列だけで使用可否を決めません。派生能力は `actorStats`、環境による制限はダンジョンのフックを通します。テストのレベル変更も `award` を使い、成長履歴との整合を保ちます。

失敗した操作でMP・材料だけを先に失わせないでください。戦闘後の作業は勝利時だけ確定し、逃走・敗北・中断で未成立の救助や合意を追加しません。乱数は保存されたPRNGを使います。

旧script ID・配列順・分岐path・呼出scopeを保持します。`legacyQuestRoutes`、`legacyStoryRoutes`、`catalogRevision`、q008の状態改訂を混同しません。現地調査の会話構造を変える場合は原稿の revision を上げ、旧版を残します。

## 立体地形の保守

セル・壁・境界の定義は[MAP_CELLS_AND_BOUNDARIES.md](MAP_CELLS_AND_BOUNDARIES.md)です。2Dの25マップとその四方移動・保存形式を保守対象として残します。方向別境界と入口依存の出口制限は拡張仕様であり、現行JSONへそのまま追加しないでください。導入時には移動・経路・退避・保存・到達性・Viewの許可判定を揃えます。

仕様と確認ルートは[VOXEL_TERRAIN_AND_WATER.md](VOXEL_TERRAIN_AND_WATER.md)です。立体区画はvoxel_spaceの一部品が担当します。閉鎖と排水を同じ処理にせず、水門閉鎖時の残水と水量保存を維持してください。経路途中の完全水没、閉じた面、密の立方体、終点の足場を費用支払い前に検査します。

従来マップの踏査キーはx,y、立体マップはx,y,zです。既存25マップの地形パッチや周期水域を自動変換しません。1.7.0からは既存の水門・周期時刻を保持して不足するspace部品だけを補います。

## 次に残る作業

HTTP経由での起動から、選択・中断再開・帰還・保存再読込までの操作を確認します。スマートフォン幅、画像ロード失敗、BGMとSEの聴感も対象です。

全文監査では人物の目的、得た情報、行為、応答、代償を具体的な選択列で確認します。到達テストの成功を、全200本の文芸的な分化の証明としません。

現地調査は観察を記録する段階です。固有の装置を本筋の救助・搬送・合意・結末へさらに接続する際は、その事実に対応する条件と互換性を原稿側で定義します。

汎用Objective／Reward／Counter、一般シナリオからの最終能力参照、世界共通の時計・NPCスケジュールは未実装です。既にある戦績やq001〜q010の型付き物語状態を再実装する前提で計画しないでください。

文書の古い設計・測定値は [legacy](legacy/README.md) に日付付きで保持しています。現行文書を旧版の記述へ戻さず、コードと配布JSONを照合して更新します。
