# ダンジョン一覧

更新日: 2026-09-14。対象: 作品版1.8.0。13件の固有システムと素材・現地調査はmasterへ反映済みです。立方体地形と貯水立坑もPR #9でmasterへ反映済みです。今回の作業ブランチは水面・床材の描画を修正しています。全13ダンジョン・26マップ・200クエストです。

設定の編集元は `authoring/dungeons/*.json` です。`npm run build:dungeons` で配信データを生成します。共通の拡張方法は [DUNGEON_SYSTEM_DESIGN.md](DUNGEON_SYSTEM_DESIGN.md) を参照してください。

Notionの [地理・場所](https://app.notion.com/p/3dac3c1966b3814999bedf4b234553b6) と各ページの「ダンジョン固有設定」を2026-09-14に照合しました。既存の物語設定と、ゲームに設定した数値・配置は区別して記載します。

## 既存の固有システム

1. 篝火の迷宮（`kagaribi`）

   火台へ種火を配置し、火の種類に応じた範囲効果を利用します。携帯松明の燃料、くらがり、灯番に対応します。実装済み。設定: `authoring/dungeons/kagaribi.json`。詳細: [KAGARIBI_DUNGEON.md](KAGARIBI_DUNGEON.md)。[Notion](https://app.notion.com/p/3dac3c1966b38057b740df426b57da09)。

2. 灯守の地下水道（`region_1`、従来2階層と貯水立坑の計3マップ）

   入口から入れる貯水立坑を追加しました。高さ-1・0・1の立方体、共有する六面、水門・排水蓋・給水ポンプ、梯子・渡り縄・登攀誘導・掘削を配置しています。設定: `authoring/voxel-content.json`。詳細: [VOXEL_TERRAIN_AND_WATER.md](VOXEL_TERRAIN_AND_WATER.md)。

   周期的な水位変化、水門・バルブによる止水と通水、完全水没セルの通行禁止を扱います。実装済み。設定: `authoring/dungeons/region_1.json`。詳細: [WATERWAYS_SALT_MINE.md](WATERWAYS_SALT_MINE.md)。[Notion](https://app.notion.com/p/3dac3c1966b381f6b53ef67b31a65ebf)。

3. 塩哭きの廃坑（`region_2`、2階層）

   戦闘ごとに装備が腐食し、退出時に解除されます。発破薬・岩砕きで壁を破壊し、開通状態を保存します。実装済み。設定: `authoring/dungeons/region_2.json`。詳細: [WATERWAYS_SALT_MINE.md](WATERWAYS_SALT_MINE.md)。[Notion](https://app.notion.com/p/3dac3c1966b3810e8954cf22aeaafc13)。

## 庭園から移動集落までの固有システム

4. 根喰みの地下庭園（`region_3`）

   種や胞子などを植え、植物を育てます。基本構造は[篝火の迷宮](https://app.notion.com/p/3dac3c1966b38057b740df426b57da09)と同様に、配置した対象の種類に応じて周囲へ効果を与える仕組みとし、植物の種類や扱う素材の豊富さを特徴とします。

   植物ごとに周囲へ与える効果、育成に必要な素材、採取できる素材を設定します。敵を引き寄せる花や回復に利用できる植物など、用途の異なる植物を用意します。

   植物によっては地形も変化します。生長して通路を塞ぎ通行不可にするもの、橋となって通路をつなぐもの、階段の役割を果たすツタを生やすものがあります。

   植物を採取・伐採して取り除くと素材を得られますが、その植物による効果や地形変化は失われます。

   状態: 実装済み。設定: `authoring/dungeons/region_3.json`。[Notion](https://app.notion.com/p/3dac3c1966b38185ba02c5a96de1cd0d)。

5. 鏡沈みの礼拝堂（`region_4`）

   各所の鏡をワープポイントとして配置します。鏡を利用すると、設定された別の地点へ移動します。

   鏡ごとの移動先と接続関係を定義し、ワープを組み合わせて探索するダンジョンとします。

   状態: 実装済み。設定: `authoring/dungeons/region_4.json`。[Notion](https://app.notion.com/p/3dac3c1966b381c7ade8d37c5f844fd8)。

6. 灰時計の書庫（`region_5`）

   特定の本を読むと、その探索中だけ使える技能を得ます。ただし、代わりに自分の技能を一つ「忘却の栞」で封じる必要があります。

   戦闘用の技能を残すか、通路を開くための技能を借りるかを選び、探索に必要な技能を組み替えて進みます。

   書庫を出ると、借りた技能は失われ、封じた自分の技能は元に戻ります。

   状態: 実装済み。設定: `authoring/dungeons/region_5.json`。[Notion](https://app.notion.com/p/3dac3c1966b38108bea6d2319ae0665a)。

7. 眠れる地下市場（`region_6`）

   敵や通路を塞ぐ相手とも取引できます。通行料を払う、品物を渡して別の魔物を追い払わせる、護衛を雇うなど、売買や交渉を攻略手段として使えます。

   戦闘を起こすと周辺の警戒が強まり、店が閉まったり、用心棒が増えたりします。

   状態: 実装済み。設定: `authoring/dungeons/region_6.json`。[Notion](https://app.notion.com/p/3dac3c1966b3810683f5ecb24c746c01)。

8. 黒潮の沈没城（`region_7`）

   水中区画へ潜り、移動や戦闘で空気を消費します。空気の残る部屋では補充できますが、補給地点まで帰れる量を見込んで進む必要があります。

   区画ごとの浮上装置を動かすと、新しい空気の補給地点や出入口ができ、活動範囲が広がります。

   状態: 実装済み。設定: `authoring/dungeons/region_7.json`。[Notion](https://app.notion.com/p/3dac3c1966b381bfab6fc23f7f2f23c3)。

9. 鉄胎の機関廟（`region_8`）

   限られた動力を、昇降機、扉、修復装置などへ振り分けます。

   同じ系統につながった門番機械も起動するため、道を開く操作が敵の起動にもつながります。

   配線の切り替えや部品の取り外しによって、必要な装置だけを動かす方法を探します。

   状態: 実装済み。設定: `authoring/dungeons/region_8.json`。[Notion](https://app.notion.com/p/3dac3c1966b3816e8707e7982104b489)。

10. 星欠けの地下観測所（`region_9`）

   天球儀の操作によって、対応する区画の地形が変化します。

   変化する地形と接続関係を定義し、通行可能な経路や足場を切り替えます。

   プレイヤーが天球儀を操作することで、地形変化を起こすタイミングを選べます。

   状態: 実装済み。設定: `authoring/dungeons/region_9.json`。[Notion](https://app.notion.com/p/3dac3c1966b38156a3e0dd8801998533)。

11. 帰還者の深淵（`region_10`）

   フィールドの各セルにベクトルを定義し、移動方向との関係でデバフを判定します。

   セルに定義されたベクトルに逆らって移動すると、極めて強いデバフが発生します。逆らう移動を繰り返すほどデバフが累積し、急激に弱体化します。

   帰還方向への移動がベクトルに逆らうように配置し、帰ろうとするとデバフが累積するダンジョンとします。

   初期設定では逆行1歩ごとに1重累積し、攻撃・防御・素早さ・知力を0.6の累積数乗倍にします。上限100重で、深淵から退出すると解除されます。HP・MPの上限は変えません。

   状態: 実装済み。設定: `authoring/dungeons/region_10.json`。[Notion](https://app.notion.com/p/3dac3c1966b381b8a90bfba1009b5bdf)。

12. 祈りの届かない谷（`prayerless_valley`）

   谷の内部では、指定された祈祷・呪術・護符の効果が停止します。加えて、特定のスキルや魔法を使用できなくします。

   効果を停止する対象と、使用を禁止するスキル・魔法は個別に定義し、フィールドと戦闘に適用します。境界の外へ出ると、谷による制限は解除されます。

   敵の呪いを止めるために谷へ誘い込む、回復祈祷を使うために境界外へ出るなど、境界を利用した位置取りが攻略に関わります。制限の対象は、境界へ入る前に確認できるようにします。

   状態: 実装済み。設定: `authoring/dungeons/prayerless_valley.json`。[Notion](https://app.notion.com/p/3dac3c1966b3817ab7b4eeb4f70890f1)。

13. 巨獣上の移動集落（`moving_village`）

   巨獣の動きや姿勢の変化に伴い、地形がランダムに変化します。

   足場、通路、建物間の接続などが変わり、通行できる経路が切り替わります。

   地形変化はプレイヤーの操作によらず発生し、プレイヤーはそのタイミングを選べません。

   状態: 実装済み。設定: `authoring/dungeons/moving_village.json`。[Notion](https://app.notion.com/p/3dac3c1966b381e88b2ad3f28cbb6573)。

## 実装方針と確認事項

植物、鏡ワープ、技能貸出、取引・警戒、空気、動力配分、地形変化、ベクトルによる弱体化、境界の効果停止を、再利用可能な部品として実装しました。天球儀と巨獣は同じ地形変化部品を使い、手動操作と自動の乱数進行を設定で切り替えます。

谷と移動集落には、町から選べる専用の探索マップを用意しました。既存10地域の分類と200クエストの進行は維持します。q193・q194の分岐結果は各クエストの選択に従い、探索装置の状態から物語上の結末を確定させません。

未指定の消費量、成長時間、警戒値、空気量、動力容量、変化周期、デバフ係数はJSONで調整できる初期値を置き、[実装仕様](DUNGEON_SYSTEMS_1_7.md)に記載しています。技能や魔法の禁止対象はIDで個別指定し、町での行先選択と境界外でも確認できます。

保存データには設置物・開通・装置などの永続状態と、技能貸出・空気・護衛・逆行デバフなど探索中だけの状態を分けて保持します。旧版のセーブは進行や乱数を保ったまま追加部品を補います。

実際の操作、初期数値、JSON項目、保存期間、検証結果は [DUNGEON_SYSTEMS_1_7.md](DUNGEON_SYSTEMS_1_7.md) を参照してください。

素材と依頼の対応、現地の観察条件は[DUNGEON_ART_AND_SCENARIOS.md](DUNGEON_ART_AND_SCENARIOS.md)を参照してください。GitHub反映状態は[CURRENT_STATUS.md](CURRENT_STATUS.md)へ記載します。

<!-- generated:dungeons -->

## 配布データの構成

篝火の迷宮 (kagaribi)：3マップ。部品：fires=fire_network。現地調査：灯を受け渡す準備 → q001。

巨獣上の移動集落 (moving_village)：1マップ。部品：terrain=terrain_shift。現地調査：暮らしを揺らす足場 → q194。

祈りの届かない谷 (prayerless_valley)：1マップ。部品：boundary=suppression_zone。現地調査：境界の内側の祈り → q193。

灯守の地下水道 (region_1)：3マップ。部品：water=waterworks / space=voxel_space。現地調査：排水された横道 → q010。

帰還者の深淵 (region_10)：2マップ。部品：return_flow=vector_curse。現地調査：逆らった足取り → q100。

塩哭きの廃坑 (region_2)：2マップ。部品：salt=corrosion / walls=breakable_walls。現地調査：塩壁の向こうの退路 → q011。

根喰みの地下庭園 (region_3)：2マップ。部品：garden=plant_garden。現地調査：根が支える橋 → q030。

鏡沈みの礼拝堂 (region_4)：2マップ。部品：mirrors=warp_network。現地調査：仮面を運ぶ鏡路 → q039。

灰時計の書庫 (region_5)：2マップ。部品：library=skill_library。現地調査：閉じた頁と開いた通路 → q049。

眠れる地下市場 (region_6)：2マップ。部品：market=market_pacts。現地調査：通行を約束する相手 → q060。

黒潮の沈没城 (region_7)：2マップ。部品：air=air_supply。現地調査：一つだけ浮かぶ区画 → q070。

鉄胎の機関廟 (region_8)：2マップ。部品：power=power_grid。現地調査：動力の届く範囲 → q080。

星欠けの地下観測所 (region_9)：2マップ。部品：terrain=terrain_shift。現地調査：観測のための足場 → q090。

<!-- /generated:dungeons -->
