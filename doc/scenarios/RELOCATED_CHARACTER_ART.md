# 移設旧100件の人物画と出演

2026-10-29。第2版の礼拝堂q032「片目の聖像」に匿名2役を接続した。[出演監査](RELOCATED_CAST_AUDIT.md) ／ [不足素材](../world/ASSET_BACKLOG.md) ／ [場面切替](../world/SCENE_SWITCH_PLAN.md) ／ [検証履歴](../development/PROGRESS.md)。

## 接続した人物と場面

- 地下牢の囚人 `q032_prisoner`：人物エンティティ `prisoner`、所在 `cell`。地下牢の `cell` 場面だけに出演する。
- 石工台の職人 `q032_craftsperson`：人物エンティティ `craftsperson`、所在 `workshop`。石工台の `workshop` 場面だけに出演する。

2人は持ち場に残る。聖像前の `entry`、`fit_stone`、`fit_original`、`plate` は人物表示なし。依頼人の修復師サイと匿名職人の同一性は確定せず、国境の交代員サイの画像も使わない。外見・年齢感・服装は今回の美術設定で、本文にない固有名や経歴を追加しない。

[人物と画像の正本](../../authoring/relocated-character-art.mjs)から、第2版の既存地域bundleへ2人を追加する。国境22人とは別枠で、bundleの人物数は24、全第2版は88。初版の人物・依頼は変更しない。[礼拝堂原稿](../../authoring/editions/e2/oddland/chapel.mjs)のcharacter・castを[共通生成器](../../tools/compile-relocated-quest.mjs)へ渡す。

## 画像と制作記録

内蔵image_genで1024×1536の透過PNGを各1枚生成し、アルファを保持した可逆WebPを配布する。英語プロンプト、日本語訳、原本・配布画像のパス、寸法、透明度、SHA-256は[生成記録](../../assets/source/characters/chapel-q032-2026-10-29.json)へ保存した。

- 囚人：[PNG原本](../../assets/source/characters/chapel-q032-2026-10-29/q032_prisoner.png) ／ [配布WebP](../../assets/images/characters/relocated/q032_prisoner.webp)。細身で短い暗色の髪、灰色の服と茶の肩掛け、口元へ添えた手。
- 職人：[PNG原本](../../assets/source/characters/chapel-q032-2026-10-29/q032_craftsperson.png) ／ [配布WebP](../../assets/images/characters/relocated/q032_craftsperson.webp)。灰の混じる髪と髭、緑の服と赤茶の前掛け、道具を持たない両手。

肖像と立ち絵を1画像で共用する。牢の格子・聖像・宝玉・石・道具を人物画へ固定せず、現場差分の制作を分ける。明暗の下地で輪郭を目視し、PNGとWebPの復号RGBA一致を確認した。画像登録は173→175、音声30、計205ファイル。登録には `npm run build:relocated-character-art` を使う。

## 本文と保持者

石工台の本文を「不透明な石を台に置く」「元の宝玉は棚にある」と整理した。既存の `jewelAt: entry` を保ち、宝玉を探索隊や石工台へ移したことにはしない。石は従来どおり `workshop→party→entry` と移り、取付完了前の表示へ完成状態を固定しない。

行動、5経路、3結末、報酬、実到着先、所持品、隊は維持する。報酬は契約113G・68EXP、事情を踏まえた修復93G・92EXP、妥協60G・69EXP。新たな同行・道具商品・町・移動経路は追加しない。像の片目、覗き管、棚、石、宝玉、銘板の背景・小物差分は未制作。

## 保存互換

q032の個別物語改訂を1→2へ進め、[配布前の依頼](../../tests/fixtures/e2-q032-before-cast.json)と一致する旧物語定義を移行元に保持する。旧保存を検証した後に `prisonerAt: cell` と `craftspersonAt: workshop` だけを追加する。欠落・不正な保持者・未知の値・未記録の行為は補正せず、失敗時は原文を保持する。

第2版の読込経路でも、明示された個別物語改訂を適用するよう[保存処理](../../src/core/save.js)を修正した。受注済みの旧経路を使う依頼が同じ保存にある場合、その経路で検証したうえで個別改訂と地理移行を行う。保存改訂2・地理版2・作品版1.34.0は維持する。

旧セーブの待機本文は保存された文面をそのまま再開するため、石工台の旧表現も一度は残る。新たにその場面へ入ると修正済みの本文を使う。選択待ち、移動中、完了後の進行を巻き戻さず、VM・報酬・道具欄・隊を初期化しない。

## 検証範囲

[専用8試験](../../tests/chapel-cast.test.mjs)で、旧定義の一致、全5経路・6場面・3結末、実移動・保持者・一回の報酬、不正保存の原子的な拒否、地理版1と受注済み旧q131を含む同時移行、Scene／Classicの投影を確認する。既存の礼拝堂経路試験も継続する。

[表示用状態](../../tools/chapel-art-fixtures.mjs)は現在の保存6場面と旧保存からの移行6場面、計12状態。[Chromium検査](../../tools/browser-chapel-art-smoke.mjs)はScene／Classic×1440／390pxの48条件、3結末を対象とする。人物のID・画像・透過・横はみ出し・保存再開・石工台の本文と選択肢、Sceneの顔72点を照合する。既存の国境404条件・篝火456条件と合わせ908条件・84結末。実行結果と画面の目視範囲は検証履歴とPRに記録する。

## 残る人物・場面

旧100件は753場面中751場面のcastが空、延べ100人物エンティティ中2件のcharacterが接続済み。q031〜q033の13場面を精読し、出演根拠あり7、特定人物の同席根拠なし6、未精読740。空のcast数を新規画像の必要点数と同一視しない。

次の制作候補はq033「映らない巡礼者」の匿名巡礼者1役、`entry`・`powder`・`guest`・`wash`・`clean` の5場面。依頼人ウラと同一視せず、既存の同行・保持者を使う。客室で外套を椅子へ掛ける本文と `cloakAt: pilgrim` の保持を、衣服・小物表示の実装前に整理する。鏡前・洗い場・客室の局所背景も未制作。人物監査はq034から継続する。
