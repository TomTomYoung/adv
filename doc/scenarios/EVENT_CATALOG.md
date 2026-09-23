# フィールドイベント・戦闘中イベント一覧

作品版 1.18.0。配布データから生成する実装一覧。[q001の位置・全文](QUEST_Q001.md) ／ [イベント仕様](EVENT_SYSTEM.md) ／ [命令仕様](SCRIPT_REFERENCE.md) ／ [セル照明](../FIELD_LIGHTING.md)。

## 実装した処理

1. フィールドの会話・地の文・選択・条件分岐・物語行為・実移動待ち。配置のenter（セル進入）／auto（条件自動）／interact（調査）／action（個別操作）と、出現条件・操作条件・状態・一度限りの記録で起動を制御する。セル進入と物語の到着は正面ではなく足元の実座標で判定する。

2. フィールドの強制戦闘。`battle.start` が現在の命令位置を保存して指定encounterを開始する。勝利・敗北・逃走後はそれぞれ `on_win`・`on_lose`・`on_escape` へ進む。

3. 戦闘中のイベント。`events` の各IDを戦闘開始時 `start`、第2ラウンド以降の開始時 `round_start`、戦闘結果の確定前 `before_end` に判定する。条件成立した未実行イベントを定義順に1件ずつ実行し、各IDは1戦に1度だけ発火する。

4. 戦闘中の会話・選択中は戦闘操作を止める。イベントの末尾まで進めた場合は戦闘または保留中の通常終了処理を再開する。`battle.end` があれば強制終了し、`on_interrupt` からフィールドの会話へ戻れる。

5. 強制終了は `records.interruptions` に記録し、勝利・逃走・撃退回数や戦闘報酬を増やさない。すでに倒した敵の撃破数は保持する。戦闘イベントの実行済みID・現在の命令位置・保留結果を保存し、会話中でも重複せず再開する。

## セルレイヤーからのイベント

通常2Dはセル種と地点上書きのeventsからenterイベントを参照する。判定は実占有セルだけで、既存オブジェクト進入・旅程到着の後、クエスト条件イベントの前。会話・戦闘中は待機し、入場ごとの実行済みIDと地点単位の一回性を保存する。HP減算や戦闘開始は参照先スクリプトで行う。[セル仕様](../CELL_LAYERS.md)。

本編のセルイベント定義は0件。新たな危険床は配置していない。環境変化を購読する迷宮の条件付きイベントは次節を参照。

## 環境変化を購読する迷宮イベント

迷宮原稿のfieldEventsを通知種別と現在の迷宮で索引化し、保留候補だけを定義順に判定する。進入・移動完了・灯火・物体・命令での状態変更を通知し、毎フレーム走査しない。占有セルのレイヤー・合成照度・固有システムの環境値を条件に使う。一回性はonce、入場単位はentry、新しい通知での再評価はchange。保留中の会話・戦闘も保存する。[記法と再発](EVENT_SYSTEM.md)。

`kagaribi/unprotected_kuragari` 火の守りを失った通路のくらがり：購読 `enter` / `move` / `light` / `object` / `state`、再発 `change`、条件 `{"op":"not","arg":{"ref":"field.environment.fires.protected"}}` → `battle` `kuragari_hunt`。[原稿](../../authoring/dungeons/kagaribi.json)。

通常のくらがり襲撃はfire_network.dangerから削除した。火の部品は保護・燃料などの値を提供し、共通イベントが発火と戦闘開始を管理する。普通の火で明るくても魔除けがなければ襲われる。戦闘開始時には保留中の環境battle候補を消費し、同じ歩行から物語戦闘と通常襲撃を二重発火させない。向き変更・コマンドの開閉・取消・戦闘終了だけでは再発しない。

## 専用処理を維持する理由

旅程到着はすでに共通のarriveEventで実座標・町施設と到着効果を処理する。迷宮限定fieldEventsへの重複登録はしない。クエストautoは受注中クエストのautoだけを候補にする。

power_gridの守護者は系統操作・部品接続・戦闘対象装置ID・勝利時の状態更新が一体のため、汎用式への分解による二重管理を避ける。air_supplyの全滅救助はHP更新直後の敗北処理で、条件付き戦闘ではないため専用処理を維持する。水位・腐食・地形変更・通常ランダム遭遇も更新順と乱数規則を維持する。

## 現行q001のイベント

`q001_decision` (2, 1) の新人、`q001_return` (9, 1) の巡灯路・帰路、`q001_elder` (13, 3) の老人はセル進入で自動開始する。進行中の場面・目的地に対応するイベントだけが始まる。上部の目的地と継続ボタンは削除済み。

`q001-F-kuragari`：`kagaribi_f1` (9, 1) の帰路。消灯会話の後、`kuragari_hunt` と強制戦闘。起点は `q001.v11.outage`。

`q001-B-rookie`：同じ位置。第1ラウンド終了後に新人が登場して発言。セリフを送ると `outage_call` で新品油1を消費し、くらがり除けの携帯松明を25歩分点灯。`battle.end` → `on_interrupt` → `q001.v11.rescue` で現地の救助会話へ移る。1ラウンドより早い勝利・逃走・撃退も確定前にこのイベントを通る。到着前の全滅は通常敗北で、救助は未成立のまま再挑戦できる。

## 登録済みの戦闘中イベント

`q001-B-rookie`：`q001.v11.outage` / `commands.3`。判定 `round_start` / `before_end`。条件 `{"op":"or","args":[{"op":"gte","left":{"ref":"battle.round"},"right":2},{"op":"in","left":{"ref":"battle.pendingResult"},"right":["win","escape","repel"]}]}`。命令 `scene.cast` → `say` → `story.action` → `fire.portable.set` → `battle.end`。

## フィールドのクエスト配置一覧

IDはクエストIDと配置IDの組で一意。配置と起動条件の正本は各クエストのevents。表示・操作条件の詳細はリンク先JSONを参照する。

### q001 帰らない灯番

`q001/q001_decision` 入口で待つ新人：`kagaribi_f1` (2, 1)。起動 `enter` → `q001.v11.visit`。[定義](../../data/quests/q001.json)。

`q001/q001_return` 油切れの巡灯路：`kagaribi_f1` (9, 1)。起動 `enter` → `q001.v11.visit`。[定義](../../data/quests/q001.json)。

`q001/q001_elder` 最後の灯の下の老人：`kagaribi_f1` (13, 3)。起動 `enter` → `q001.v11.visit`。[定義](../../data/quests/q001.json)。

`q001/q001_empty_west` 西の壁松明：`kagaribi_f1` (8, 1) north面。起動 `interact` → `q001.wall.q001_empty_west`。[定義](../../data/quests/q001.json)。

`q001/q001_empty_east` 東の壁松明：`kagaribi_f1` (11, 1) north面。起動 `interact` → `q001.wall.q001_empty_east`。[定義](../../data/quests/q001.json)。

`q001/q001_last_lamp` 老人を守る最後の壁松明：`kagaribi_f1` (13, 3) east面。起動 `interact` → `q001.wall.q001_last_lamp`。[定義](../../data/quests/q001.json)。

`q001/kagaribi` 灯を受け渡す準備：`kagaribi_f1` (1, 1)。起動 `action` → `dungeon.scene.kagaribi.v2`。[定義](../../data/quests/q001.json)。

### q002 骨の荷札

`q002/q002_decision` 骨の荷札：地下水道の引き揚げ場：`region_1_landing` (5, 1)。起動 `interact` → `q002.v11.visit`。[定義](../../data/quests/q002.json)。

### q003 逆流する鐘

`q003/q003_decision` 逆流する鐘：決着の場：`region_1_landing` (7, 1)。起動 `interact` → `q003.v11.visit`。[定義](../../data/quests/q003.json)。

`q003/q003_passage` 低い通路に残る通行人：`region_1_inspection` (5, 1)。起動 `interact` → `q003.v11.visit`。[定義](../../data/quests/q003.json)。

### q004 二枚目の通行証

`q004/q004_clue_a` 二枚目の通行証：現場の痕跡：`region_1_f1` (5, 1)。起動 `interact` → `q004.clue_a`。[定義](../../data/quests/q004.json)。

`q004/q004_clue_b` 二枚目の通行証：記録と証言：`region_1_landing` (3, 3)。起動 `interact` → `q004.clue_b`。[定義](../../data/quests/q004.json)。

`q004/q004_decision` 二枚目の通行証：決着の場：`region_1_landing` (7, 3)。起動 `interact` → `q004.v11.visit`。[定義](../../data/quests/q004.json)。

### q005 甘い排水

`q005/q005_clue_a` 甘い排水：現場の痕跡：`region_1_canal_a` (4, 1)。起動 `interact` → `q005.clue_a`。[定義](../../data/quests/q005.json)。

`q005/q005_clue_b` 甘い排水：記録と証言：`region_1_canal_b` (4, 1)。起動 `interact` → `q005.clue_b`。[定義](../../data/quests/q005.json)。

`q005/q005_decision` 甘い排水：決着の場：`region_1_inspection` (7, 3)。起動 `interact` → `q005.v11.visit`。[定義](../../data/quests/q005.json)。

### q006 沈んだ給金箱

`q006/q006_clue_a` 沈んだ給金箱：現場の痕跡：`region_1_f2` (4, 3)。起動 `interact` → `q006.clue_a`。[定義](../../data/quests/q006.json)。

`q006/q006_clue_b` 沈んだ給金箱：記録と証言：`region_1_canal_c` (4, 1)。起動 `interact` → `q006.clue_b`。[定義](../../data/quests/q006.json)。

`q006/q006_decision` 沈んだ給金箱：決着の場：`region_1_canal_c` (7, 1)。起動 `interact` → `q006.v11.visit`。[定義](../../data/quests/q006.json)。

### q007 声を返す壁

`q007/q007_clue_a` 声を返す壁：現場の痕跡：`region_1_canal_c` (5, 1)。起動 `interact` → `q007.clue_a`。[定義](../../data/quests/q007.json)。

`q007/q007_clue_b` 声を返す壁：記録と証言：`region_1_lower_landing` (3, 3)。起動 `interact` → `q007.clue_b`。[定義](../../data/quests/q007.json)。

`q007/q007_decision` 声を返す壁：決着の場：`region_1_lower_landing` (5, 3)。起動 `interact` → `q007.v11.visit`。[定義](../../data/quests/q007.json)。

### q008 浮かばない棺

`q008/q008_clue_a` 浮かばない棺：現場の痕跡：`region_1_f2` (6, 3)。起動 `interact` → `q008.clue_a`。[定義](../../data/quests/q008.json)。

`q008/q008_clue_b` 浮かばない棺：記録と証言：`region_1_lower_landing` (5, 1)。起動 `interact` → `q008.clue_b`。[定義](../../data/quests/q008.json)。

`q008/q008_decision` 浮かばない棺：決着の場：`region_1_lower_landing` (7, 3)。起動 `interact` → `q008.v11.visit`。[定義](../../data/quests/q008.json)。

### q009 鼠の避難路

`q009/q009_clue_a` 鼠の避難路：現場の痕跡：`region_1_lower_landing` (7, 1)。起動 `interact` → `q009.clue_a`。[定義](../../data/quests/q009.json)。

`q009/q009_clue_b` 鼠の避難路：記録と証言：`region_1_canal_d` (4, 1)。起動 `interact` → `q009.clue_b`。[定義](../../data/quests/q009.json)。

`q009/q009_decision` 鼠の避難路：決着の場：`region_1_gatehouse` (5, 1)。起動 `interact` → `q009.v11.visit`。[定義](../../data/quests/q009.json)。

### q010 最後の水門番

`q010/q010_clue_a` 最後の水門番：現場の痕跡：`region_1_canal_d` (6, 1)。起動 `interact` → `q010.clue_a`。[定義](../../data/quests/q010.json)。

`q010/q010_clue_b` 最後の水門番：記録と証言：`region_1_gatehouse` (3, 3)。起動 `interact` → `q010.clue_b`。[定義](../../data/quests/q010.json)。

`q010/q010_decision` 最後の水門番：決着の場：`region_1_gatehouse` (7, 3)。起動 `interact` → `q010.v11.visit`。[定義](../../data/quests/q010.json)。

`q010/region_1` 排水された横道：`region_1_f1` (2, 1)。起動 `action` → `dungeon.scene.region_1.v1`。[定義](../../data/quests/q010.json)。

### q011 塩の花嫁

`q011/q011_clue_a` 塩の花嫁：現場の痕跡：`region_2_f1` (2, 7)。起動 `interact` → `q011.clue_a`。[定義](../../data/quests/q011.json)。

`q011/q011_clue_b` 塩の花嫁：記録と証言：`region_2_f1` (9, 6)。起動 `interact` → `q011.clue_b`。[定義](../../data/quests/q011.json)。

`q011/q011_decision` 塩の花嫁：決着の場：`region_2_f1` (11, 9)。起動 `interact` → `q011.catalog1.visit`。[定義](../../data/quests/q011.json)。

`q011/region_2` 塩壁の向こうの退路：`region_2_f1` (5, 1)。起動 `action` → `dungeon.scene.region_2.v1`。[定義](../../data/quests/q011.json)。

### q012 三つのつるはし

`q012/q012_clue_a` 三つのつるはし：現場の痕跡：`region_2_f1` (1, 8)。起動 `interact` → `q012.clue_a`。[定義](../../data/quests/q012.json)。

`q012/q012_clue_b` 三つのつるはし：記録と証言：`region_2_f1` (11, 4)。起動 `interact` → `q012.clue_b`。[定義](../../data/quests/q012.json)。

`q012/q012_decision` 三つのつるはし：決着の場：`region_2_f1` (13, 7)。起動 `interact` → `q012.catalog1.visit`。[定義](../../data/quests/q012.json)。

### q013 呼吸する鉱脈

`q013/q013_clue_a` 呼吸する鉱脈：現場の痕跡：`region_2_f1` (4, 5)。起動 `interact` → `q013.clue_a`。[定義](../../data/quests/q013.json)。

`q013/q013_clue_b` 呼吸する鉱脈：記録と証言：`region_2_f1` (12, 3)。起動 `interact` → `q013.clue_b`。[定義](../../data/quests/q013.json)。

`q013/q013_decision` 呼吸する鉱脈：決着の場：`region_2_f1` (15, 5)。起動 `interact` → `q013.catalog1.visit`。[定義](../../data/quests/q013.json)。

### q014 帰りの貨車

`q014/q014_clue_a` 帰りの貨車：現場の痕跡：`region_2_f1` (7, 1)。起動 `interact` → `q014.clue_a`。[定義](../../data/quests/q014.json)。

`q014/q014_clue_b` 帰りの貨車：記録と証言：`region_2_f1` (6, 9)。起動 `interact` → `q014.clue_b`。[定義](../../data/quests/q014.json)。

`q014/q014_decision` 帰りの貨車：決着の場：`region_2_f1` (17, 3)。起動 `interact` → `q014.catalog1.visit`。[定義](../../data/quests/q014.json)。

### q015 泣く塩柱

`q015/q015_clue_a` 泣く塩柱：現場の痕跡：`region_2_f1` (6, 3)。起動 `interact` → `q015.clue_a`。[定義](../../data/quests/q015.json)。

`q015/q015_clue_b` 泣く塩柱：記録と証言：`region_2_f1` (14, 1)。起動 `interact` → `q015.clue_b`。[定義](../../data/quests/q015.json)。

`q015/q015_decision` 泣く塩柱：決着の場：`region_2_f1` (9, 11)。起動 `interact` → `q015.catalog1.visit`。[定義](../../data/quests/q015.json)。

### q016 無音の発破

`q016/q016_clue_a` 無音の発破：現場の痕跡：`region_2_f2` (7, 1)。起動 `interact` → `q016.clue_a`。[定義](../../data/quests/q016.json)。

`q016/q016_clue_b` 無音の発破：記録と証言：`region_2_f2` (11, 4)。起動 `interact` → `q016.clue_b`。[定義](../../data/quests/q016.json)。

`q016/q016_decision` 無音の発破：決着の場：`region_2_f2` (9, 11)。起動 `interact` → `q016.catalog1.visit`。[定義](../../data/quests/q016.json)。

### q017 二度掘られた墓

`q017/q017_clue_a` 二度掘られた墓：現場の痕跡：`region_2_f2` (1, 8)。起動 `interact` → `q017.clue_a`。[定義](../../data/quests/q017.json)。

`q017/q017_clue_b` 二度掘られた墓：記録と証言：`region_2_f2` (12, 3)。起動 `interact` → `q017.clue_b`。[定義](../../data/quests/q017.json)。

`q017/q017_decision` 二度掘られた墓：決着の場：`region_2_f2` (11, 9)。起動 `interact` → `q017.catalog1.visit`。[定義](../../data/quests/q017.json)。

### q018 白い借金

`q018/q018_clue_a` 白い借金：現場の痕跡：`region_2_f2` (2, 7)。起動 `interact` → `q018.clue_a`。[定義](../../data/quests/q018.json)。

`q018/q018_clue_b` 白い借金：記録と証言：`region_2_f2` (9, 6)。起動 `interact` → `q018.clue_b`。[定義](../../data/quests/q018.json)。

`q018/q018_decision` 白い借金：決着の場：`region_2_f2` (13, 7)。起動 `interact` → `q018.catalog1.visit`。[定義](../../data/quests/q018.json)。

### q019 底なしの計量器

`q019/q019_clue_a` 底なしの計量器：現場の痕跡：`region_2_f2` (5, 3)。起動 `interact` → `q019.clue_a`。[定義](../../data/quests/q019.json)。

`q019/q019_clue_b` 底なしの計量器：記録と証言：`region_2_f2` (14, 1)。起動 `interact` → `q019.clue_b`。[定義](../../data/quests/q019.json)。

`q019/q019_decision` 底なしの計量器：決着の場：`region_2_f2` (15, 5)。起動 `interact` → `q019.catalog1.visit`。[定義](../../data/quests/q019.json)。

### q020 坑道の王冠

`q020/q020_clue_a` 坑道の王冠：現場の痕跡：`region_2_f2` (3, 6)。起動 `interact` → `q020.clue_a`。[定義](../../data/quests/q020.json)。

`q020/q020_clue_b` 坑道の王冠：記録と証言：`region_2_f2` (6, 9)。起動 `interact` → `q020.clue_b`。[定義](../../data/quests/q020.json)。

`q020/q020_decision` 坑道の王冠：決着の場：`region_2_f2` (17, 3)。起動 `interact` → `q020.catalog1.visit`。[定義](../../data/quests/q020.json)。

### q021 種を盗む鳥

`q021/q021_clue_a` 種を盗む鳥：現場の痕跡：`region_3_f1` (7, 1)。起動 `interact` → `q021.clue_a`。[定義](../../data/quests/q021.json)。

`q021/q021_clue_b` 種を盗む鳥：記録と証言：`region_3_f1` (11, 4)。起動 `interact` → `q021.clue_b`。[定義](../../data/quests/q021.json)。

`q021/q021_decision` 種を盗む鳥：決着の場：`region_3_f1` (10, 10)。起動 `interact` → `q021.flow.visit`。[定義](../../data/quests/q021.json)。

### q022 緑の寝息

`q022/q022_clue_a` 緑の寝息：現場の痕跡：`region_3_f1` (1, 8)。起動 `interact` → `q022.clue_a`。[定義](../../data/quests/q022.json)。

`q022/q022_clue_b` 緑の寝息：記録と証言：`region_3_f1` (9, 6)。起動 `interact` → `q022.clue_b`。[定義](../../data/quests/q022.json)。

`q022/q022_decision` 緑の寝息：決着の場：`region_3_f1` (11, 9)。起動 `interact` → `q022.flow.visit`。[定義](../../data/quests/q022.json)。

### q023 母樹の指輪

`q023/q023_clue_a` 母樹の指輪：現場の痕跡：`region_3_f1` (5, 3)。起動 `interact` → `q023.clue_a`。[定義](../../data/quests/q023.json)。

`q023/q023_clue_b` 母樹の指輪：記録と証言：`region_3_f1` (13, 2)。起動 `interact` → `q023.clue_b`。[定義](../../data/quests/q023.json)。

`q023/q023_decision` 母樹の指輪：決着の場：`region_3_f1` (13, 7)。起動 `interact` → `q023.flow.visit`。[定義](../../data/quests/q023.json)。

### q024 食べられる地図

`q024/q024_clue_a` 食べられる地図：現場の痕跡：`region_3_f1` (3, 6)。起動 `interact` → `q024.clue_a`。[定義](../../data/quests/q024.json)。

`q024/q024_clue_b` 食べられる地図：記録と証言：`region_3_f1` (7, 8)。起動 `interact` → `q024.clue_b`。[定義](../../data/quests/q024.json)。

`q024/q024_decision` 食べられる地図：決着の場：`region_3_f1` (15, 5)。起動 `interact` → `q024.flow.visit`。[定義](../../data/quests/q024.json)。

### q025 地下の雨乞い

`q025/q025_clue_a` 地下の雨乞い：現場の痕跡：`region_3_f1` (4, 5)。起動 `interact` → `q025.clue_a`。[定義](../../data/quests/q025.json)。

`q025/q025_clue_b` 地下の雨乞い：記録と証言：`region_3_f1` (3, 13)。起動 `interact` → `q025.clue_b`。[定義](../../data/quests/q025.json)。

`q025/q025_decision` 地下の雨乞い：決着の場：`region_3_f1` (17, 3)。起動 `interact` → `q025.flow.visit`。[定義](../../data/quests/q025.json)。

### q026 実らない約束

`q026/q026_clue_a` 実らない約束：現場の痕跡：`region_3_f2` (7, 1)。起動 `interact` → `q026.clue_a`。[定義](../../data/quests/q026.json)。

`q026/q026_clue_b` 実らない約束：記録と証言：`region_3_f2` (14, 1)。起動 `interact` → `q026.clue_b`。[定義](../../data/quests/q026.json)。

`q026/q026_decision` 実らない約束：決着の場：`region_3_f2` (17, 3)。起動 `interact` → `q026.flow.visit`。[定義](../../data/quests/q026.json)。

### q027 花粉の身代金

`q027/q027_clue_a` 花粉の身代金：現場の痕跡：`region_3_f2` (1, 8)。起動 `interact` → `q027.clue_a`。[定義](../../data/quests/q027.json)。

`q027/q027_clue_b` 花粉の身代金：記録と証言：`region_3_f2` (3, 13)。起動 `interact` → `q027.clue_b`。[定義](../../data/quests/q027.json)。

`q027/q027_decision` 花粉の身代金：決着の場：`region_3_f2` (15, 5)。起動 `interact` → `q027.flow.visit`。[定義](../../data/quests/q027.json)。

### q028 庭師の空席

`q028/q028_clue_a` 庭師の空席：現場の痕跡：`region_3_f2` (3, 6)。起動 `interact` → `q028.clue_a`。[定義](../../data/quests/q028.json)。

`q028/q028_clue_b` 庭師の空席：記録と証言：`region_3_f2` (5, 11)。起動 `interact` → `q028.clue_b`。[定義](../../data/quests/q028.json)。

`q028/q028_decision` 庭師の空席：決着の場：`region_3_f2` (8, 13)。起動 `interact` → `q028.flow.visit`。[定義](../../data/quests/q028.json)。

### q029 赤い蜜の契約

`q029/q029_clue_a` 赤い蜜の契約：現場の痕跡：`region_3_f2` (5, 3)。起動 `interact` → `q029.clue_a`。[定義](../../data/quests/q029.json)。

`q029/q029_clue_b` 赤い蜜の契約：記録と証言：`region_3_f2` (13, 2)。起動 `interact` → `q029.clue_b`。[定義](../../data/quests/q029.json)。

`q029/q029_decision` 赤い蜜の契約：決着の場：`region_3_f2` (10, 11)。起動 `interact` → `q029.flow.visit`。[定義](../../data/quests/q029.json)。

### q030 根の向こうの朝

`q030/q030_clue_a` 根の向こうの朝：現場の痕跡：`region_3_f2` (5, 4)。起動 `interact` → `q030.clue_a`。[定義](../../data/quests/q030.json)。

`q030/q030_clue_b` 根の向こうの朝：記録と証言：`region_3_f2` (7, 9)。起動 `interact` → `q030.clue_b`。[定義](../../data/quests/q030.json)。

`q030/q030_decision` 根の向こうの朝：決着の場：`region_3_f2` (12, 9)。起動 `interact` → `q030.flow.visit`。[定義](../../data/quests/q030.json)。

`q030/region_3` 根が支える橋：`region_3_f1` (1, 3)。起動 `action` → `dungeon.scene.region_3.v1`。[定義](../../data/quests/q030.json)。

### q031 遅れる祈り

`q031/q031_clue_a` 遅れる祈り：現場の痕跡：`region_4_f1` (7, 1)。起動 `interact` → `q031.clue_a`。[定義](../../data/quests/q031.json)。

`q031/q031_clue_b` 遅れる祈り：記録と証言：`region_4_f1` (7, 8)。起動 `interact` → `q031.clue_b`。[定義](../../data/quests/q031.json)。

`q031/q031_decision` 遅れる祈り：決着の場：`region_4_f1` (11, 9)。起動 `interact` → `q031.flow.visit`。[定義](../../data/quests/q031.json)。

### q032 片目の聖像

`q032/q032_clue_a` 片目の聖像：現場の痕跡：`region_4_f1` (1, 8)。起動 `interact` → `q032.clue_a`。[定義](../../data/quests/q032.json)。

`q032/q032_clue_b` 片目の聖像：記録と証言：`region_4_f1` (9, 6)。起動 `interact` → `q032.clue_b`。[定義](../../data/quests/q032.json)。

`q032/q032_decision` 片目の聖像：決着の場：`region_4_f1` (9, 11)。起動 `interact` → `q032.flow.visit`。[定義](../../data/quests/q032.json)。

### q033 映らない巡礼者

`q033/q033_clue_a` 映らない巡礼者：現場の痕跡：`region_4_f1` (3, 6)。起動 `interact` → `q033.clue_a`。[定義](../../data/quests/q033.json)。

`q033/q033_clue_b` 映らない巡礼者：記録と証言：`region_4_f1` (10, 5)。起動 `interact` → `q033.clue_b`。[定義](../../data/quests/q033.json)。

`q033/q033_decision` 映らない巡礼者：決着の場：`region_4_f1` (13, 7)。起動 `interact` → `q033.flow.visit`。[定義](../../data/quests/q033.json)。

### q034 赦しの領収書

`q034/q034_clue_a` 赦しの領収書：現場の痕跡：`region_4_f1` (5, 3)。起動 `interact` → `q034.clue_a`。[定義](../../data/quests/q034.json)。

`q034/q034_clue_b` 赦しの領収書：記録と証言：`region_4_f1` (6, 9)。起動 `interact` → `q034.clue_b`。[定義](../../data/quests/q034.json)。

`q034/q034_decision` 赦しの領収書：決着の場：`region_4_f1` (15, 5)。起動 `interact` → `q034.flow.visit`。[定義](../../data/quests/q034.json)。

### q035 鏡の向こうの施し

`q035/q035_clue_a` 鏡の向こうの施し：現場の痕跡：`region_4_f1` (5, 4)。起動 `interact` → `q035.clue_a`。[定義](../../data/quests/q035.json)。

`q035/q035_clue_b` 鏡の向こうの施し：記録と証言：`region_4_f1` (11, 4)。起動 `interact` → `q035.clue_b`。[定義](../../data/quests/q035.json)。

`q035/q035_decision` 鏡の向こうの施し：決着の場：`region_4_f1` (17, 3)。起動 `interact` → `q035.flow.visit`。[定義](../../data/quests/q035.json)。

### q036 七番目の歌声

`q036/q036_clue_a` 七番目の歌声：現場の痕跡：`region_4_f2` (7, 1)。起動 `interact` → `q036.clue_a`。[定義](../../data/quests/q036.json)。

`q036/q036_clue_b` 七番目の歌声：記録と証言：`region_4_f2` (13, 2)。起動 `interact` → `q036.clue_b`。[定義](../../data/quests/q036.json)。

`q036/q036_decision` 七番目の歌声：決着の場：`region_4_f2` (15, 5)。起動 `interact` → `q036.flow.visit`。[定義](../../data/quests/q036.json)。

### q037 夜だけの告解

`q037/q037_clue_a` 夜だけの告解：現場の痕跡：`region_4_f2` (5, 3)。起動 `interact` → `q037.clue_a`。[定義](../../data/quests/q037.json)。

`q037/q037_clue_b` 夜だけの告解：記録と証言：`region_4_f2` (12, 3)。起動 `interact` → `q037.clue_b`。[定義](../../data/quests/q037.json)。

`q037/q037_decision` 夜だけの告解：決着の場：`region_4_f2` (16, 4)。起動 `interact` → `q037.flow.visit`。[定義](../../data/quests/q037.json)。

### q038 聖水の沈殿

`q038/q038_clue_a` 聖水の沈殿：現場の痕跡：`region_4_f2` (1, 8)。起動 `interact` → `q038.clue_a`。[定義](../../data/quests/q038.json)。

`q038/q038_clue_b` 聖水の沈殿：記録と証言：`region_4_f2` (14, 1)。起動 `interact` → `q038.clue_b`。[定義](../../data/quests/q038.json)。

`q038/q038_decision` 聖水の沈殿：決着の場：`region_4_f2` (13, 7)。起動 `interact` → `q038.flow.visit`。[定義](../../data/quests/q038.json)。

### q039 顔を売る仮面

`q039/q039_clue_a` 顔を売る仮面：現場の痕跡：`region_4_f2` (3, 6)。起動 `interact` → `q039.clue_a`。[定義](../../data/quests/q039.json)。

`q039/q039_clue_b` 顔を売る仮面：記録と証言：`region_4_f2` (3, 13)。起動 `interact` → `q039.clue_b`。[定義](../../data/quests/q039.json)。

`q039/q039_decision` 顔を売る仮面：決着の場：`region_4_f2` (17, 3)。起動 `interact` → `q039.flow.visit`。[定義](../../data/quests/q039.json)。

`q039/region_4` 仮面を運ぶ鏡路：`region_4_f1` (1, 2) / `region_4_f2` (13, 5)。起動 `action` → `dungeon.scene.region_4.v1`。[定義](../../data/quests/q039.json)。

### q040 砕けない祈り

`q040/q040_clue_a` 砕けない祈り：現場の痕跡：`region_4_f2` (3, 5)。起動 `interact` → `q040.clue_a`。[定義](../../data/quests/q040.json)。

`q040/q040_clue_b` 砕けない祈り：記録と証言：`region_4_f2` (8, 7)。起動 `interact` → `q040.clue_b`。[定義](../../data/quests/q040.json)。

`q040/q040_decision` 砕けない祈り：決着の場：`region_4_f2` (8, 13)。起動 `interact` → `q040.flow.visit`。[定義](../../data/quests/q040.json)。

### q041 返却日のない本

`q041/q041_clue_a` 返却日のない本：現場の痕跡：`region_5_f1` (7, 1)。起動 `interact` → `q041.clue_a`。[定義](../../data/quests/q041.json)。

`q041/q041_clue_b` 返却日のない本：記録と証言：`region_5_f1` (14, 1)。起動 `interact` → `q041.clue_b`。[定義](../../data/quests/q041.json)。

`q041/q041_decision` 返却日のない本：決着の場：`region_5_f1` (15, 5)。起動 `interact` → `q041.flow.visit`。[定義](../../data/quests/q041.json)。

### q042 砂時計の残業

`q042/q042_clue_a` 砂時計の残業：現場の痕跡：`region_5_f1` (1, 8)。起動 `interact` → `q042.clue_a`。[定義](../../data/quests/q042.json)。

`q042/q042_clue_b` 砂時計の残業：記録と証言：`region_5_f1` (12, 3)。起動 `interact` → `q042.clue_b`。[定義](../../data/quests/q042.json)。

`q042/q042_decision` 砂時計の残業：決着の場：`region_5_f1` (17, 3)。起動 `interact` → `q042.flow.visit`。[定義](../../data/quests/q042.json)。

### q043 墨を食う火

`q043/q043_clue_a` 墨を食う火：現場の痕跡：`region_5_f1` (5, 3)。起動 `interact` → `q043.clue_a`。[定義](../../data/quests/q043.json)。

`q043/q043_clue_b` 墨を食う火：記録と証言：`region_5_f1` (3, 13)。起動 `interact` → `q043.clue_b`。[定義](../../data/quests/q043.json)。

`q043/q043_decision` 墨を食う火：決着の場：`region_5_f1` (9, 12)。起動 `interact` → `q043.flow.visit`。[定義](../../data/quests/q043.json)。

### q044 未来の訃報

`q044/q044_clue_a` 未来の訃報：現場の痕跡：`region_5_f1` (2, 7)。起動 `interact` → `q044.clue_a`。[定義](../../data/quests/q044.json)。

`q044/q044_clue_b` 未来の訃報：記録と証言：`region_5_f1` (10, 5)。起動 `interact` → `q044.clue_b`。[定義](../../data/quests/q044.json)。

`q044/q044_decision` 未来の訃報：決着の場：`region_5_f1` (10, 11)。起動 `interact` → `q044.flow.visit`。[定義](../../data/quests/q044.json)。

### q045 白紙の相続

`q045/q045_clue_a` 白紙の相続：現場の痕跡：`region_5_f1` (3, 6)。起動 `interact` → `q045.clue_a`。[定義](../../data/quests/q045.json)。

`q045/q045_clue_b` 白紙の相続：記録と証言：`region_5_f1` (5, 11)。起動 `interact` → `q045.clue_b`。[定義](../../data/quests/q045.json)。

`q045/q045_decision` 白紙の相続：決着の場：`region_5_f1` (11, 10)。起動 `interact` → `q045.flow.visit`。[定義](../../data/quests/q045.json)。

### q046 迷子の索引

`q046/q046_clue_a` 迷子の索引：現場の痕跡：`region_5_f2` (7, 1)。起動 `interact` → `q046.clue_a`。[定義](../../data/quests/q046.json)。

`q046/q046_clue_b` 迷子の索引：記録と証言：`region_5_f2` (11, 4)。起動 `interact` → `q046.clue_b`。[定義](../../data/quests/q046.json)。

`q046/q046_decision` 迷子の索引：決着の場：`region_5_f2` (11, 9)。起動 `interact` → `q046.flow.visit`。[定義](../../data/quests/q046.json)。

### q047 一頁の戦争

`q047/q047_clue_a` 一頁の戦争：現場の痕跡：`region_5_f2` (1, 8)。起動 `interact` → `q047.clue_a`。[定義](../../data/quests/q047.json)。

`q047/q047_clue_b` 一頁の戦争：記録と証言：`region_5_f2` (9, 6)。起動 `interact` → `q047.clue_b`。[定義](../../data/quests/q047.json)。

`q047/q047_decision` 一頁の戦争：決着の場：`region_5_f2` (13, 7)。起動 `interact` → `q047.flow.visit`。[定義](../../data/quests/q047.json)。

### q048 眠る校正者

`q048/q048_clue_a` 眠る校正者：現場の痕跡：`region_5_f2` (5, 3)。起動 `interact` → `q048.clue_a`。[定義](../../data/quests/q048.json)。

`q048/q048_clue_b` 眠る校正者：記録と証言：`region_5_f2` (13, 2)。起動 `interact` → `q048.clue_b`。[定義](../../data/quests/q048.json)。

`q048/q048_decision` 眠る校正者：決着の場：`region_5_f2` (15, 5)。起動 `interact` → `q048.flow.visit`。[定義](../../data/quests/q048.json)。

### q049 忘却の栞

`q049/q049_clue_a` 忘却の栞：現場の痕跡：`region_5_f2` (3, 6)。起動 `interact` → `q049.clue_a`。[定義](../../data/quests/q049.json)。

`q049/q049_clue_b` 忘却の栞：記録と証言：`region_5_f2` (8, 7)。起動 `interact` → `q049.clue_b`。[定義](../../data/quests/q049.json)。

`q049/q049_decision` 忘却の栞：決着の場：`region_5_f2` (17, 3)。起動 `interact` → `q049.flow.visit`。[定義](../../data/quests/q049.json)。

`q049/region_5` 閉じた頁と開いた通路：`region_5_f1` (1, 2)。起動 `action` → `dungeon.scene.region_5.v1`。[定義](../../data/quests/q049.json)。

### q050 止まった終章

`q050/q050_clue_a` 止まった終章：現場の痕跡：`region_5_f2` (6, 3)。起動 `interact` → `q050.clue_a`。[定義](../../data/quests/q050.json)。

`q050/q050_clue_b` 止まった終章：記録と証言：`region_5_f2` (14, 1)。起動 `interact` → `q050.clue_b`。[定義](../../data/quests/q050.json)。

`q050/q050_decision` 止まった終章：決着の場：`region_5_f2` (9, 12)。起動 `interact` → `q050.flow.visit`。[定義](../../data/quests/q050.json)。

### q051 釣銭のない店

`q051/q051_clue_a` 釣銭のない店：現場の痕跡：`region_6_f1` (5, 3)。起動 `interact` → `q051.clue_a`。[定義](../../data/quests/q051.json)。

`q051/q051_clue_b` 釣銭のない店：記録と証言：`region_6_f1` (11, 4)。起動 `interact` → `q051.clue_b`。[定義](../../data/quests/q051.json)。

`q051/q051_decision` 釣銭のない店：決着の場：`region_6_f1` (13, 7)。起動 `interact` → `q051.flow.visit`。[定義](../../data/quests/q051.json)。

### q052 幽霊の競り札

`q052/q052_clue_a` 幽霊の競り札：現場の痕跡：`region_6_f1` (7, 1)。起動 `interact` → `q052.clue_a`。[定義](../../data/quests/q052.json)。

`q052/q052_clue_b` 幽霊の競り札：記録と証言：`region_6_f1` (14, 1)。起動 `interact` → `q052.clue_b`。[定義](../../data/quests/q052.json)。

`q052/q052_decision` 幽霊の競り札：決着の場：`region_6_f1` (11, 9)。起動 `interact` → `q052.flow.visit`。[定義](../../data/quests/q052.json)。

### q053 賞味期限の明日

`q053/q053_clue_a` 賞味期限の明日：現場の痕跡：`region_6_f1` (1, 8)。起動 `interact` → `q053.clue_a`。[定義](../../data/quests/q053.json)。

`q053/q053_clue_b` 賞味期限の明日：記録と証言：`region_6_f1` (3, 13)。起動 `interact` → `q053.clue_b`。[定義](../../data/quests/q053.json)。

`q053/q053_decision` 賞味期限の明日：決着の場：`region_6_f1` (15, 5)。起動 `interact` → `q053.flow.visit`。[定義](../../data/quests/q053.json)。

### q054 夢の質草

`q054/q054_clue_a` 夢の質草：現場の痕跡：`region_6_f1` (3, 5)。起動 `interact` → `q054.clue_a`。[定義](../../data/quests/q054.json)。

`q054/q054_clue_b` 夢の質草：記録と証言：`region_6_f1` (10, 5)。起動 `interact` → `q054.clue_b`。[定義](../../data/quests/q054.json)。

`q054/q054_decision` 夢の質草：決着の場：`region_6_f1` (17, 3)。起動 `interact` → `q054.flow.visit`。[定義](../../data/quests/q054.json)。

### q055 値札のついた影

`q055/q055_clue_a` 値札のついた影：現場の痕跡：`region_6_f1` (3, 6)。起動 `interact` → `q055.clue_a`。[定義](../../data/quests/q055.json)。

`q055/q055_clue_b` 値札のついた影：記録と証言：`region_6_f1` (4, 12)。起動 `interact` → `q055.clue_b`。[定義](../../data/quests/q055.json)。

`q055/q055_decision` 値札のついた影：決着の場：`region_6_f1` (9, 12)。起動 `interact` → `q055.flow.visit`。[定義](../../data/quests/q055.json)。

### q056 閉店後の拍手

`q056/q056_clue_a` 閉店後の拍手：現場の痕跡：`region_6_f2` (5, 3)。起動 `interact` → `q056.clue_a`。[定義](../../data/quests/q056.json)。

`q056/q056_clue_b` 閉店後の拍手：記録と証言：`region_6_f2` (10, 5)。起動 `interact` → `q056.clue_b`。[定義](../../data/quests/q056.json)。

`q056/q056_decision` 閉店後の拍手：決着の場：`region_6_f2` (15, 5)。起動 `interact` → `q056.flow.visit`。[定義](../../data/quests/q056.json)。

### q057 無主の露店

`q057/q057_clue_a` 無主の露店：現場の痕跡：`region_6_f2` (7, 1)。起動 `interact` → `q057.clue_a`。[定義](../../data/quests/q057.json)。

`q057/q057_clue_b` 無主の露店：記録と証言：`region_6_f2` (11, 4)。起動 `interact` → `q057.clue_b`。[定義](../../data/quests/q057.json)。

`q057/q057_decision` 無主の露店：決着の場：`region_6_f2` (13, 7)。起動 `interact` → `q057.flow.visit`。[定義](../../data/quests/q057.json)。

### q058 金貨の病

`q058/q058_clue_a` 金貨の病：現場の痕跡：`region_6_f2` (1, 8)。起動 `interact` → `q058.clue_a`。[定義](../../data/quests/q058.json)。

`q058/q058_clue_b` 金貨の病：記録と証言：`region_6_f2` (13, 2)。起動 `interact` → `q058.clue_b`。[定義](../../data/quests/q058.json)。

`q058/q058_decision` 金貨の病：決着の場：`region_6_f2` (17, 3)。起動 `interact` → `q058.flow.visit`。[定義](../../data/quests/q058.json)。

### q059 一人分の祝宴

`q059/q059_clue_a` 一人分の祝宴：現場の痕跡：`region_6_f2` (3, 5)。起動 `interact` → `q059.clue_a`。[定義](../../data/quests/q059.json)。

`q059/q059_clue_b` 一人分の祝宴：記録と証言：`region_6_f2` (9, 6)。起動 `interact` → `q059.clue_b`。[定義](../../data/quests/q059.json)。

`q059/q059_decision` 一人分の祝宴：決着の場：`region_6_f2` (10, 11)。起動 `interact` → `q059.flow.visit`。[定義](../../data/quests/q059.json)。

### q060 市場の目覚まし

`q060/q060_clue_a` 市場の目覚まし：現場の痕跡：`region_6_f2` (4, 5)。起動 `interact` → `q060.clue_a`。[定義](../../data/quests/q060.json)。

`q060/q060_clue_b` 市場の目覚まし：記録と証言：`region_6_f2` (14, 1)。起動 `interact` → `q060.clue_b`。[定義](../../data/quests/q060.json)。

`q060/q060_decision` 市場の目覚まし：決着の場：`region_6_f2` (11, 10)。起動 `interact` → `q060.flow.visit`。[定義](../../data/quests/q060.json)。

`q060/region_6` 通行を約束する相手：`region_6_f1` (1, 2)。起動 `action` → `dungeon.scene.region_6.v1`。[定義](../../data/quests/q060.json)。

### q061 濡れない海図

`q061/q061_clue_a` 濡れない海図：現場の痕跡：`region_7_f1` (7, 1)。起動 `interact` → `q061.clue_a`。[定義](../../data/quests/q061.json)。

`q061/q061_clue_b` 濡れない海図：記録と証言：`region_7_f1` (14, 1)。起動 `interact` → `q061.clue_b`。[定義](../../data/quests/q061.json)。

`q061/q061_decision` 濡れない海図：決着の場：`region_7_f1` (9, 11)。起動 `interact` → `q061.flow.visit`。[定義](../../data/quests/q061.json)。

### q062 王の救命胴衣

`q062/q062_clue_a` 王の救命胴衣：現場の痕跡：`region_7_f1` (1, 8)。起動 `interact` → `q062.clue_a`。[定義](../../data/quests/q062.json)。

`q062/q062_clue_b` 王の救命胴衣：記録と証言：`region_7_f1` (3, 13)。起動 `interact` → `q062.clue_b`。[定義](../../data/quests/q062.json)。

`q062/q062_decision` 王の救命胴衣：決着の場：`region_7_f1` (11, 9)。起動 `interact` → `q062.flow.visit`。[定義](../../data/quests/q062.json)。

### q063 潮に逆らう階段

`q063/q063_clue_a` 潮に逆らう階段：現場の痕跡：`region_7_f1` (5, 3)。起動 `interact` → `q063.clue_a`。[定義](../../data/quests/q063.json)。

`q063/q063_clue_b` 潮に逆らう階段：記録と証言：`region_7_f1` (13, 2)。起動 `interact` → `q063.clue_b`。[定義](../../data/quests/q063.json)。

`q063/q063_decision` 潮に逆らう階段：決着の場：`region_7_f1` (13, 7)。起動 `interact` → `q063.flow.visit`。[定義](../../data/quests/q063.json)。

### q064 届く砲声

`q064/q064_clue_a` 届く砲声：現場の痕跡：`region_7_f1` (3, 6)。起動 `interact` → `q064.clue_a`。[定義](../../data/quests/q064.json)。

`q064/q064_clue_b` 届く砲声：記録と証言：`region_7_f1` (5, 11)。起動 `interact` → `q064.clue_b`。[定義](../../data/quests/q064.json)。

`q064/q064_decision` 届く砲声：決着の場：`region_7_f1` (8, 12)。起動 `interact` → `q064.flow.visit`。[定義](../../data/quests/q064.json)。

### q065 水中の火葬

`q065/q065_clue_a` 水中の火葬：現場の痕跡：`region_7_f1` (4, 5)。起動 `interact` → `q065.clue_a`。[定義](../../data/quests/q065.json)。

`q065/q065_clue_b` 水中の火葬：記録と証言：`region_7_f1` (7, 9)。起動 `interact` → `q065.clue_b`。[定義](../../data/quests/q065.json)。

`q065/q065_decision` 水中の火葬：決着の場：`region_7_f1` (15, 5)。起動 `interact` → `q065.flow.visit`。[定義](../../data/quests/q065.json)。

### q066 珊瑚の軍議

`q066/q066_clue_a` 珊瑚の軍議：現場の痕跡：`region_7_f2` (1, 8)。起動 `interact` → `q066.clue_a`。[定義](../../data/quests/q066.json)。

`q066/q066_clue_b` 珊瑚の軍議：記録と証言：`region_7_f2` (10, 5)。起動 `interact` → `q066.clue_b`。[定義](../../data/quests/q066.json)。

`q066/q066_decision` 珊瑚の軍議：決着の場：`region_7_f2` (15, 5)。起動 `interact` → `q066.flow.visit`。[定義](../../data/quests/q066.json)。

### q067 人魚の筆談

`q067/q067_clue_a` 人魚の筆談：現場の痕跡：`region_7_f2` (7, 1)。起動 `interact` → `q067.clue_a`。[定義](../../data/quests/q067.json)。

`q067/q067_clue_b` 人魚の筆談：記録と証言：`region_7_f2` (12, 3)。起動 `interact` → `q067.clue_b`。[定義](../../data/quests/q067.json)。

`q067/q067_decision` 人魚の筆談：決着の場：`region_7_f2` (17, 3)。起動 `interact` → `q067.flow.visit`。[定義](../../data/quests/q067.json)。

### q068 二つの錨

`q068/q068_clue_a` 二つの錨：現場の痕跡：`region_7_f2` (3, 6)。起動 `interact` → `q068.clue_a`。[定義](../../data/quests/q068.json)。

`q068/q068_clue_b` 二つの錨：記録と証言：`region_7_f2` (14, 1)。起動 `interact` → `q068.clue_b`。[定義](../../data/quests/q068.json)。

`q068/q068_decision` 二つの錨：決着の場：`region_7_f2` (8, 13)。起動 `interact` → `q068.flow.visit`。[定義](../../data/quests/q068.json)。

### q069 海王の通行税

`q069/q069_clue_a` 海王の通行税：現場の痕跡：`region_7_f2` (5, 3)。起動 `interact` → `q069.clue_a`。[定義](../../data/quests/q069.json)。

`q069/q069_clue_b` 海王の通行税：記録と証言：`region_7_f2` (9, 6)。起動 `interact` → `q069.clue_b`。[定義](../../data/quests/q069.json)。

`q069/q069_decision` 海王の通行税：決着の場：`region_7_f2` (9, 12)。起動 `interact` → `q069.flow.visit`。[定義](../../data/quests/q069.json)。

### q070 沈没城の浮上

`q070/q070_clue_a` 沈没城の浮上：現場の痕跡：`region_7_f2` (4, 5)。起動 `interact` → `q070.clue_a`。[定義](../../data/quests/q070.json)。

`q070/q070_clue_b` 沈没城の浮上：記録と証言：`region_7_f2` (3, 13)。起動 `interact` → `q070.clue_b`。[定義](../../data/quests/q070.json)。

`q070/q070_decision` 沈没城の浮上：決着の場：`region_7_f2` (13, 7)。起動 `interact` → `q070.flow.visit`。[定義](../../data/quests/q070.json)。

`q070/region_7` 一つだけ浮かぶ区画：`region_7_f1` (1, 2)。起動 `action` → `dungeon.scene.region_7.v1`。[定義](../../data/quests/q070.json)。

### q071 止まれない門番

`q071/q071_clue_a` 止まれない門番：現場の痕跡：`region_8_f1` (5, 3)。起動 `interact` → `q071.clue_a`。[定義](../../data/quests/q071.json)。

`q071/q071_clue_b` 止まれない門番：記録と証言：`region_8_f1` (12, 3)。起動 `interact` → `q071.clue_b`。[定義](../../data/quests/q071.json)。

`q071/q071_decision` 止まれない門番：決着の場：`region_8_f1` (9, 11)。起動 `interact` → `q071.flow.visit`。[定義](../../data/quests/q071.json)。

### q072 油の洗礼

`q072/q072_clue_a` 油の洗礼：現場の痕跡：`region_8_f1` (3, 5)。起動 `interact` → `q072.clue_a`。[定義](../../data/quests/q072.json)。

`q072/q072_clue_b` 油の洗礼：記録と証言：`region_8_f1` (13, 2)。起動 `interact` → `q072.clue_b`。[定義](../../data/quests/q072.json)。

`q072/q072_decision` 油の洗礼：決着の場：`region_8_f1` (11, 9)。起動 `interact` → `q072.flow.visit`。[定義](../../data/quests/q072.json)。

### q073 天使の予備腕

`q073/q073_clue_a` 天使の予備腕：現場の痕跡：`region_8_f1` (7, 1)。起動 `interact` → `q073.clue_a`。[定義](../../data/quests/q073.json)。

`q073/q073_clue_b` 天使の予備腕：記録と証言：`region_8_f1` (3, 13)。起動 `interact` → `q073.clue_b`。[定義](../../data/quests/q073.json)。

`q073/q073_decision` 天使の予備腕：決着の場：`region_8_f1` (13, 7)。起動 `interact` → `q073.flow.visit`。[定義](../../data/quests/q073.json)。

### q074 祈祷の順番

`q074/q074_clue_a` 祈祷の順番：現場の痕跡：`region_8_f1` (1, 7)。起動 `interact` → `q074.clue_a`。[定義](../../data/quests/q074.json)。

`q074/q074_clue_b` 祈祷の順番：記録と証言：`region_8_f1` (10, 5)。起動 `interact` → `q074.clue_b`。[定義](../../data/quests/q074.json)。

`q074/q074_decision` 祈祷の順番：決着の場：`region_8_f1` (15, 5)。起動 `interact` → `q074.flow.visit`。[定義](../../data/quests/q074.json)。

### q075 無給の聖者

`q075/q075_clue_a` 無給の聖者：現場の痕跡：`region_8_f1` (1, 8)。起動 `interact` → `q075.clue_a`。[定義](../../data/quests/q075.json)。

`q075/q075_clue_b` 無給の聖者：記録と証言：`region_8_f1` (5, 11)。起動 `interact` → `q075.clue_b`。[定義](../../data/quests/q075.json)。

`q075/q075_decision` 無給の聖者：決着の場：`region_8_f1` (7, 13)。起動 `interact` → `q075.flow.visit`。[定義](../../data/quests/q075.json)。

### q076 鉄の子守歌

`q076/q076_clue_a` 鉄の子守歌：現場の痕跡：`region_8_f2` (7, 1)。起動 `interact` → `q076.clue_a`。[定義](../../data/quests/q076.json)。

`q076/q076_clue_b` 鉄の子守歌：記録と証言：`region_8_f2` (10, 5)。起動 `interact` → `q076.clue_b`。[定義](../../data/quests/q076.json)。

`q076/q076_decision` 鉄の子守歌：決着の場：`region_8_f2` (17, 3)。起動 `interact` → `q076.flow.visit`。[定義](../../data/quests/q076.json)。

### q077 聖痕の配線

`q077/q077_clue_a` 聖痕の配線：現場の痕跡：`region_8_f2` (5, 3)。起動 `interact` → `q077.clue_a`。[定義](../../data/quests/q077.json)。

`q077/q077_clue_b` 聖痕の配線：記録と証言：`region_8_f2` (14, 1)。起動 `interact` → `q077.clue_b`。[定義](../../data/quests/q077.json)。

`q077/q077_decision` 聖痕の配線：決着の場：`region_8_f2` (8, 13)。起動 `interact` → `q077.flow.visit`。[定義](../../data/quests/q077.json)。

### q078 部品の記憶

`q078/q078_clue_a` 部品の記憶：現場の痕跡：`region_8_f2` (2, 7)。起動 `interact` → `q078.clue_a`。[定義](../../data/quests/q078.json)。

`q078/q078_clue_b` 部品の記憶：記録と証言：`region_8_f2` (3, 13)。起動 `interact` → `q078.clue_b`。[定義](../../data/quests/q078.json)。

`q078/q078_decision` 部品の記憶：決着の場：`region_8_f2` (13, 8)。起動 `interact` → `q078.flow.visit`。[定義](../../data/quests/q078.json)。

### q079 九十九回の再起動

`q079/q079_clue_a` 九十九回の再起動：現場の痕跡：`region_8_f2` (3, 5)。起動 `interact` → `q079.clue_a`。[定義](../../data/quests/q079.json)。

`q079/q079_clue_b` 九十九回の再起動：記録と証言：`region_8_f2` (9, 6)。起動 `interact` → `q079.clue_b`。[定義](../../data/quests/q079.json)。

`q079/q079_decision` 九十九回の再起動：決着の場：`region_8_f2` (15, 6)。起動 `interact` → `q079.flow.visit`。[定義](../../data/quests/q079.json)。

### q080 鉄胎の継承

`q080/q080_clue_a` 鉄胎の継承：現場の痕跡：`region_8_f2` (4, 5)。起動 `interact` → `q080.clue_a`。[定義](../../data/quests/q080.json)。

`q080/q080_clue_b` 鉄胎の継承：記録と証言：`region_8_f2` (5, 11)。起動 `interact` → `q080.clue_b`。[定義](../../data/quests/q080.json)。

`q080/q080_decision` 鉄胎の継承：決着の場：`region_8_f2` (15, 5)。起動 `interact` → `q080.flow.visit`。[定義](../../data/quests/q080.json)。

`q080/region_8` 動力の届く範囲：`region_8_f1` (1, 2)。起動 `action` → `dungeon.scene.region_8.v1`。[定義](../../data/quests/q080.json)。

### q081 落ちてこない星

`q081/q081_clue_a` 落ちてこない星：現場の痕跡：`region_9_f1` (7, 1)。起動 `interact` → `q081.clue_a`。[定義](../../data/quests/q081.json)。

`q081/q081_clue_b` 落ちてこない星：記録と証言：`region_9_f1` (12, 3)。起動 `interact` → `q081.clue_b`。[定義](../../data/quests/q081.json)。

`q081/q081_decision` 落ちてこない星：決着の場：`region_9_f1` (11, 9)。起動 `interact` → `q081.flow.visit`。[定義](../../data/quests/q081.json)。

### q082 星売りの空瓶

`q082/q082_clue_a` 星売りの空瓶：現場の痕跡：`region_9_f1` (1, 8)。起動 `interact` → `q082.clue_a`。[定義](../../data/quests/q082.json)。

`q082/q082_clue_b` 星売りの空瓶：記録と証言：`region_9_f1` (14, 1)。起動 `interact` → `q082.clue_b`。[定義](../../data/quests/q082.json)。

`q082/q082_decision` 星売りの空瓶：決着の場：`region_9_f1` (13, 7)。起動 `interact` → `q082.flow.visit`。[定義](../../data/quests/q082.json)。

### q083 地底の日食

`q083/q083_clue_a` 地底の日食：現場の痕跡：`region_9_f1` (5, 3)。起動 `interact` → `q083.clue_a`。[定義](../../data/quests/q083.json)。

`q083/q083_clue_b` 地底の日食：記録と証言：`region_9_f1` (11, 4)。起動 `interact` → `q083.clue_b`。[定義](../../data/quests/q083.json)。

`q083/q083_decision` 地底の日食：決着の場：`region_9_f1` (15, 5)。起動 `interact` → `q083.flow.visit`。[定義](../../data/quests/q083.json)。

### q084 帰還信号

`q084/q084_clue_a` 帰還信号：現場の痕跡：`region_9_f1` (4, 5)。起動 `interact` → `q084.clue_a`。[定義](../../data/quests/q084.json)。

`q084/q084_clue_b` 帰還信号：記録と証言：`region_9_f1` (3, 13)。起動 `interact` → `q084.clue_b`。[定義](../../data/quests/q084.json)。

`q084/q084_decision` 帰還信号：決着の場：`region_9_f1` (9, 11)。起動 `interact` → `q084.flow.visit`。[定義](../../data/quests/q084.json)。

### q085 方位のない羅針盤

`q085/q085_clue_a` 方位のない羅針盤：現場の痕跡：`region_9_f1` (6, 3)。起動 `interact` → `q085.clue_a`。[定義](../../data/quests/q085.json)。

`q085/q085_clue_b` 方位のない羅針盤：記録と証言：`region_9_f1` (5, 11)。起動 `interact` → `q085.clue_b`。[定義](../../data/quests/q085.json)。

`q085/q085_decision` 方位のない羅針盤：決着の場：`region_9_f1` (17, 3)。起動 `interact` → `q085.flow.visit`。[定義](../../data/quests/q085.json)。

### q086 百年前の観測者

`q086/q086_clue_a` 百年前の観測者：現場の痕跡：`region_9_f2` (5, 3)。起動 `interact` → `q086.clue_a`。[定義](../../data/quests/q086.json)。

`q086/q086_clue_b` 百年前の観測者：記録と証言：`region_9_f2` (11, 4)。起動 `interact` → `q086.clue_b`。[定義](../../data/quests/q086.json)。

`q086/q086_decision` 百年前の観測者：決着の場：`region_9_f2` (13, 7)。起動 `interact` → `q086.flow.visit`。[定義](../../data/quests/q086.json)。

### q087 願いを消す流星

`q087/q087_clue_a` 願いを消す流星：現場の痕跡：`region_9_f2` (7, 1)。起動 `interact` → `q087.clue_a`。[定義](../../data/quests/q087.json)。

`q087/q087_clue_b` 願いを消す流星：記録と証言：`region_9_f2` (12, 3)。起動 `interact` → `q087.clue_b`。[定義](../../data/quests/q087.json)。

`q087/q087_decision` 願いを消す流星：決着の場：`region_9_f2` (15, 5)。起動 `interact` → `q087.flow.visit`。[定義](../../data/quests/q087.json)。

### q088 観測窓の亀裂

`q088/q088_clue_a` 観測窓の亀裂：現場の痕跡：`region_9_f2` (1, 8)。起動 `interact` → `q088.clue_a`。[定義](../../data/quests/q088.json)。

`q088/q088_clue_b` 観測窓の亀裂：記録と証言：`region_9_f2` (10, 5)。起動 `interact` → `q088.clue_b`。[定義](../../data/quests/q088.json)。

`q088/q088_decision` 観測窓の亀裂：決着の場：`region_9_f2` (17, 3)。起動 `interact` → `q088.flow.visit`。[定義](../../data/quests/q088.json)。

### q089 逆さまの天球儀

`q089/q089_clue_a` 逆さまの天球儀：現場の痕跡：`region_9_f2` (3, 5)。起動 `interact` → `q089.clue_a`。[定義](../../data/quests/q089.json)。

`q089/q089_clue_b` 逆さまの天球儀：記録と証言：`region_9_f2` (13, 2)。起動 `interact` → `q089.clue_b`。[定義](../../data/quests/q089.json)。

`q089/q089_decision` 逆さまの天球儀：決着の場：`region_9_f2` (8, 13)。起動 `interact` → `q089.flow.visit`。[定義](../../data/quests/q089.json)。

### q090 空を返す日

`q090/q090_clue_a` 空を返す日：現場の痕跡：`region_9_f2` (2, 7)。起動 `interact` → `q090.clue_a`。[定義](../../data/quests/q090.json)。

`q090/q090_clue_b` 空を返す日：記録と証言：`region_9_f2` (9, 6)。起動 `interact` → `q090.clue_b`。[定義](../../data/quests/q090.json)。

`q090/q090_decision` 空を返す日：決着の場：`region_9_f2` (12, 9)。起動 `interact` → `q090.flow.visit`。[定義](../../data/quests/q090.json)。

`q090/region_9` 観測のための足場：`region_9_f1` (1, 2)。起動 `action` → `dungeon.scene.region_9.v1`。[定義](../../data/quests/q090.json)。

### q091 先に帰った足跡

`q091/q091_clue_a` 先に帰った足跡：現場の痕跡：`region_10_f1` (5, 3)。起動 `interact` → `q091.clue_a`。[定義](../../data/quests/q091.json)。

`q091/q091_clue_b` 先に帰った足跡：記録と証言：`region_10_f1` (3, 13)。起動 `interact` → `q091.clue_b`。[定義](../../data/quests/q091.json)。

`q091/q091_decision` 先に帰った足跡：決着の場：`region_10_f1` (9, 12)。起動 `interact` → `q091.flow.visit`。[定義](../../data/quests/q091.json)。

### q092 出口を持つ獣

`q092/q092_clue_a` 出口を持つ獣：現場の痕跡：`region_10_f1` (7, 1)。起動 `interact` → `q092.clue_a`。[定義](../../data/quests/q092.json)。

`q092/q092_clue_b` 出口を持つ獣：記録と証言：`region_10_f1` (5, 11)。起動 `interact` → `q092.clue_b`。[定義](../../data/quests/q092.json)。

`q092/q092_decision` 出口を持つ獣：決着の場：`region_10_f1` (8, 13)。起動 `interact` → `q092.flow.visit`。[定義](../../data/quests/q092.json)。

### q093 名を置く宿

`q093/q093_clue_a` 名を置く宿：現場の痕跡：`region_10_f1` (1, 8)。起動 `interact` → `q093.clue_a`。[定義](../../data/quests/q093.json)。

`q093/q093_clue_b` 名を置く宿：記録と証言：`region_10_f1` (9, 7)。起動 `interact` → `q093.clue_b`。[定義](../../data/quests/q093.json)。

`q093/q093_decision` 名を置く宿：決着の場：`region_10_f1` (10, 11)。起動 `interact` → `q093.flow.visit`。[定義](../../data/quests/q093.json)。

### q094 帰還税

`q094/q094_clue_a` 帰還税：現場の痕跡：`region_10_f1` (3, 5)。起動 `interact` → `q094.clue_a`。[定義](../../data/quests/q094.json)。

`q094/q094_clue_b` 帰還税：記録と証言：`region_10_f1` (11, 4)。起動 `interact` → `q094.clue_b`。[定義](../../data/quests/q094.json)。

`q094/q094_decision` 帰還税：決着の場：`region_10_f1` (12, 9)。起動 `interact` → `q094.flow.visit`。[定義](../../data/quests/q094.json)。

### q095 英雄の空白

`q095/q095_clue_a` 英雄の空白：現場の痕跡：`region_10_f1` (4, 5)。起動 `interact` → `q095.clue_a`。[定義](../../data/quests/q095.json)。

`q095/q095_clue_b` 英雄の空白：記録と証言：`region_10_f1` (11, 5)。起動 `interact` → `q095.clue_b`。[定義](../../data/quests/q095.json)。

`q095/q095_decision` 英雄の空白：決着の場：`region_10_f1` (13, 8)。起動 `interact` → `q095.flow.visit`。[定義](../../data/quests/q095.json)。

### q096 忘れ物の隊列

`q096/q096_clue_a` 忘れ物の隊列：現場の痕跡：`region_10_f2` (7, 1)。起動 `interact` → `q096.clue_a`。[定義](../../data/quests/q096.json)。

`q096/q096_clue_b` 忘れ物の隊列：記録と証言：`region_10_f2` (13, 2)。起動 `interact` → `q096.clue_b`。[定義](../../data/quests/q096.json)。

`q096/q096_decision` 忘れ物の隊列：決着の場：`region_10_f2` (15, 5)。起動 `interact` → `q096.flow.visit`。[定義](../../data/quests/q096.json)。

### q097 生者の点呼

`q097/q097_clue_a` 生者の点呼：現場の痕跡：`region_10_f2` (1, 8)。起動 `interact` → `q097.clue_a`。[定義](../../data/quests/q097.json)。

`q097/q097_clue_b` 生者の点呼：記録と証言：`region_10_f2` (12, 3)。起動 `interact` → `q097.clue_b`。[定義](../../data/quests/q097.json)。

`q097/q097_decision` 生者の点呼：決着の場：`region_10_f2` (17, 3)。起動 `interact` → `q097.flow.visit`。[定義](../../data/quests/q097.json)。

### q098 最後の一室

`q098/q098_clue_a` 最後の一室：現場の痕跡：`region_10_f2` (5, 3)。起動 `interact` → `q098.clue_a`。[定義](../../data/quests/q098.json)。

`q098/q098_clue_b` 最後の一室：記録と証言：`region_10_f2` (14, 1)。起動 `interact` → `q098.clue_b`。[定義](../../data/quests/q098.json)。

`q098/q098_decision` 最後の一室：決着の場：`region_10_f2` (9, 12)。起動 `interact` → `q098.flow.visit`。[定義](../../data/quests/q098.json)。

### q099 帰らぬ者の灯

`q099/q099_clue_a` 帰らぬ者の灯：現場の痕跡：`region_10_f2` (2, 7)。起動 `interact` → `q099.clue_a`。[定義](../../data/quests/q099.json)。

`q099/q099_clue_b` 帰らぬ者の灯：記録と証言：`region_10_f2` (11, 4)。起動 `interact` → `q099.clue_b`。[定義](../../data/quests/q099.json)。

`q099/q099_decision` 帰らぬ者の灯：決着の場：`region_10_f2` (11, 10)。起動 `interact` → `q099.flow.visit`。[定義](../../data/quests/q099.json)。

### q100 百の帰還

`q100/q100_clue_a` 百の帰還：現場の痕跡：`region_10_f2` (3, 6)。起動 `interact` → `q100.clue_a`。[定義](../../data/quests/q100.json)。

`q100/q100_clue_b` 百の帰還：記録と証言：`region_10_f2` (3, 13)。起動 `interact` → `q100.clue_b`。[定義](../../data/quests/q100.json)。

`q100/q100_decision` 百の帰還：決着の場：`region_10_f2` (12, 9)。起動 `interact` → `q100.flow.visit`。[定義](../../data/quests/q100.json)。

`q100/region_10` 逆らった足取り：`region_10_f1` (1, 1)。起動 `action` → `dungeon.scene.region_10.v1`。[定義](../../data/quests/q100.json)。

### q101 三度目の戸締まり

`q101/q101_scene` 三度目の戸締まり：鍵屋の娘ミナ：`region_1_f1` (2, 1)。起動 `interact` → `q101.visit`。[定義](../../data/quests/q101.json)。

### q102 弔鐘は誰のために

`q102/q102_scene` 弔鐘は誰のために：鐘番ロウ：`region_1_f1` (3, 1)。起動 `interact` → `q102.visit`。[定義](../../data/quests/q102.json)。

### q103 一枚多い食券

`q103/q103_scene` 一枚多い食券：料理人トマ：`region_1_f1` (5, 1)。起動 `interact` → `q103.visit`。[定義](../../data/quests/q103.json)。

### q104 雨を売る少年

`q104/q104_scene` 雨を売る少年：花売りの少年：`region_1_f1` (6, 1)。起動 `interact` → `q104.visit`。[定義](../../data/quests/q104.json)。

### q105 花嫁の片方の靴

`q105/q105_scene` 花嫁の片方の靴：婚約者ダン：`region_1_f1` (8, 1)。起動 `interact` → `q105.visit`。[定義](../../data/quests/q105.json)。

### q106 パン泥棒の影

`q106/q106_scene` パン泥棒の影：夜市のパン屋：`region_1_f2` (2, 1)。起動 `interact` → `q106.visit`。[定義](../../data/quests/q106.json)。

### q107 六人目の客

`q107/q107_scene` 六人目の客：宿主モラ：`region_1_f2` (3, 1)。起動 `interact` → `q107.visit`。[定義](../../data/quests/q107.json)。

### q108 猫に付いた懸賞

`q108/q108_scene` 猫に付いた懸賞：魚屋と隣の鳥屋：`region_1_f2` (4, 1)。起動 `interact` → `q108.flow.visit`。[定義](../../data/quests/q108.json)。

### q109 火のない鍛冶場

`q109/q109_scene` 火のない鍛冶場：老鍛冶師エン：`region_1_f2` (5, 1)。起動 `interact` → `q109.visit`。[定義](../../data/quests/q109.json)。

### q110 明日までの英雄

`q110/q110_scene` 明日までの英雄：退役兵イーロ：`region_1_f2` (8, 1)。起動 `interact` → `q110.visit`。[定義](../../data/quests/q110.json)。

### q111 白旗の荷馬車

`q111/q111_scene` 白旗の荷馬車：御者ハンナ：`region_2_f1` (2, 1)。起動 `interact` → `q111.visit`。[定義](../../data/quests/q111.json)。

### q112 置いていく灯

`q112/q112_scene` 置いていく灯：監督リオ：`region_2_f1` (3, 1)。起動 `interact` → `q112.visit`。[定義](../../data/quests/q112.json)。

### q113 雪解けを待たない男

`q113/q113_scene` 雪解けを待たない男：庭師オド：`region_2_f1` (4, 1)。起動 `interact` → `q113.visit`。[定義](../../data/quests/q113.json)。

### q114 二人分の通行料

`q114/q114_scene` 二人分の通行料：旅芸人ネラ：`region_2_f1` (5, 1)。起動 `interact` → `q114.visit`。[定義](../../data/quests/q114.json)。

### q115 追手のいない逃亡

`q115/q115_scene` 追手のいない逃亡：料理人サビ：`region_2_f1` (8, 1)。起動 `interact` → `q115.visit`。[定義](../../data/quests/q115.json)。

### q116 帰り道だけの地図

`q116/q116_scene` 帰り道だけの地図：地図師フェン：`region_2_f2` (2, 1)。起動 `interact` → `q116.visit`。[定義](../../data/quests/q116.json)。

### q117 空の棺の護送

`q117/q117_scene` 空の棺の護送：老騎士ヴァル：`region_2_f2` (3, 1)。起動 `interact` → `q117.visit`。[定義](../../data/quests/q117.json)。

### q118 聞こえない救難笛

`q118/q118_scene` 聞こえない救難笛：川の監視所：`region_2_f2` (4, 1)。起動 `interact` → `q118.visit`。[定義](../../data/quests/q118.json)。

### q119 寝返りの見張り

`q119/q119_scene` 寝返りの見張り：商隊長デク：`region_2_f2` (5, 1)。起動 `interact` → `q119.visit`。[定義](../../data/quests/q119.json)。

### q120 最後尾の旗

`q120/q120_scene` 最後尾の旗：巡礼団の先導役：`region_2_f2` (8, 1)。起動 `interact` → `q120.visit`。[定義](../../data/quests/q120.json)。

### q121 百匹目の狼

`q121/q121_scene` 百匹目の狼：牧場主と老猟師バスク：`region_3_f1` (2, 1)。起動 `interact` → `q121.visit`。[定義](../../data/quests/q121.json)。

### q122 逃げた竜殺し

`q122/q122_scene` 逃げた竜殺し：竜狩りのレク：`region_3_f1` (3, 1)。起動 `interact` → `q122.visit`。[定義](../../data/quests/q122.json)。

### q123 討伐数ゼロの勲章

`q123/q123_scene` 討伐数ゼロの勲章：城門の守備隊長：`region_3_f1` (4, 1)。起動 `interact` → `q123.visit`。[定義](../../data/quests/q123.json)。

### q124 二度死んだ大猪

`q124/q124_scene` 二度死んだ大猪：村の鍛冶屋：`region_3_f1` (5, 1)。起動 `interact` → `q124.visit`。[定義](../../data/quests/q124.json)。

### q125 弓を置く日

`q125/q125_scene` 弓を置く日：森番ユノ：`region_3_f1` (8, 1)。起動 `interact` → `q125.flow.visit`。[定義](../../data/quests/q125.json)。

### q126 獲物のいない狩猟祭

`q126/q126_scene` 獲物のいない狩猟祭：祭主催コル：`region_3_f2` (3, 1)。起動 `interact` → `q126.flow.visit`。[定義](../../data/quests/q126.json)。

### q127 魔物の借金

`q127/q127_scene` 魔物の借金：傭兵組合の帳簿係：`region_3_f2` (4, 1)。起動 `interact` → `q127.visit`。[定義](../../data/quests/q127.json)。

### q128 鎧を食う蛾

`q128/q128_scene` 鎧を食う蛾：武器商ベル：`region_3_f2` (5, 1)。起動 `interact` → `q128.visit`。[定義](../../data/quests/q128.json)。

### q129 傷を見せない隊長

`q129/q129_scene` 傷を見せない隊長：隊長ノエと副官：`region_3_f2` (6, 1)。起動 `interact` → `q129.visit`。[定義](../../data/quests/q129.json)。

### q130 最弱の王

`q130/q130_scene` 最弱の王：案内役の新米テオ：`region_3_f2` (8, 1)。起動 `interact` → `q130.visit`。[定義](../../data/quests/q130.json)。

### q131 逆向きの足跡

`q131/q131_scene` 逆向きの足跡：考古学者シェル：`region_4_f1` (3, 1)。起動 `interact` → `q131.visit`。[定義](../../data/quests/q131.json)。

### q132 宝箱の底の椅子

`q132/q132_scene` 宝箱の底の椅子：財宝庫の管理人：`region_4_f1` (5, 1)。起動 `interact` → `q132.visit`。[定義](../../data/quests/q132.json)。

### q133 一段足りない階段

`q133/q133_scene` 一段足りない階段：建築師ドマ：`region_4_f1` (6, 1)。起動 `interact` → `q133.visit`。[定義](../../data/quests/q133.json)。

### q134 敗者の宝物庫

`q134/q134_scene` 敗者の宝物庫：剣士ザグ：`region_4_f1` (8, 1)。起動 `interact` → `q134.visit`。[定義](../../data/quests/q134.json)。

### q135 水底の朝食

`q135/q135_scene` 水底の朝食：潜水具職人アネ：`region_4_f1` (9, 1)。起動 `interact` → `q135.visit`。[定義](../../data/quests/q135.json)。

### q136 翻訳しない扉

`q136/q136_scene` 翻訳しない扉：言語学者トゥリ：`region_4_f2` (3, 1)。起動 `interact` → `q136.visit`。[定義](../../data/quests/q136.json)。

### q137 燃え残る図書館

`q137/q137_scene` 燃え残る図書館：写本師エル：`region_4_f2` (4, 1)。起動 `interact` → `q137.visit`。[定義](../../data/quests/q137.json)。

### q138 行き止まりの探検家

`q138/q138_scene` 行き止まりの探検家：探索組合：`region_4_f2` (5, 1)。起動 `interact` → `q138.visit`。[定義](../../data/quests/q138.json)。

### q139 ふたつの出口

`q139/q139_scene` ふたつの出口：救助責任者セナ：`region_4_f2` (6, 1)。起動 `interact` → `q139.visit`。[定義](../../data/quests/q139.json)。

### q140 迷宮の休業日

`q140/q140_scene` 迷宮の休業日：探索組合：`region_4_f2` (9, 1)。起動 `interact` → `q140.visit`。[定義](../../data/quests/q140.json)。

### q141 音の出ない優勝旗

`q141/q141_scene` 音の出ない優勝旗：楽団長ポル：`region_5_f1` (3, 1)。起動 `interact` → `q141.visit`。[定義](../../data/quests/q141.json)。

### q142 偽物職人の本物

`q142/q142_scene` 偽物職人の本物：偽宝石職人キオ：`region_5_f1` (4, 1)。起動 `interact` → `q142.visit`。[定義](../../data/quests/q142.json)。

### q143 辛くない火吹き料理

`q143/q143_scene` 辛くない火吹き料理：料理祭の店主メメ：`region_5_f1` (5, 1)。起動 `interact` → `q143.visit`。[定義](../../data/quests/q143.json)。

### q144 祭の悪役

`q144/q144_scene` 祭の悪役：悪竜役のジル：`region_5_f1` (6, 1)。起動 `interact` → `q144.visit`。[定義](../../data/quests/q144.json)。

### q145 花を咲かせない庭

`q145/q145_scene` 花を咲かせない庭：庭師ロマ：`region_5_f1` (9, 1)。起動 `interact` → `q145.visit`。[定義](../../data/quests/q145.json)。

### q146 染め直せない軍服

`q146/q146_scene` 染め直せない軍服：染物屋ニア：`region_5_f2` (3, 1)。起動 `interact` → `q146.visit`。[定義](../../data/quests/q146.json)。

### q147 一番遅い配達

`q147/q147_scene` 一番遅い配達：運送店主：`region_5_f2` (4, 1)。起動 `interact` → `q147.visit`。[定義](../../data/quests/q147.json)。

### q148 贋金より軽い金

`q148/q148_scene` 贋金より軽い金：市場の両替人：`region_5_f2` (5, 1)。起動 `interact` → `q148.visit`。[定義](../../data/quests/q148.json)。

### q149 売らない剣

`q149/q149_scene` 売らない剣：武具商と鍛冶師：`region_5_f2` (6, 1)。起動 `interact` → `q149.visit`。[定義](../../data/quests/q149.json)。

### q150 大道芸人の弟子

`q150/q150_scene` 大道芸人の弟子：曲芸師リッツ：`region_5_f2` (8, 1)。起動 `interact` → `q150.flow.visit`。[定義](../../data/quests/q150.json)。

### q151 暗殺者の遅刻

`q151/q151_scene` 暗殺者の遅刻：領主の側近：`region_6_f1` (3, 1)。起動 `interact` → `q151.visit`。[定義](../../data/quests/q151.json)。

### q152 密書を読ませる仕事

`q152/q152_scene` 密書を読ませる仕事：密偵カナ：`region_6_f1` (4, 1)。起動 `interact` → `q152.visit`。[定義](../../data/quests/q152.json)。

### q153 招待されなかった伯爵

`q153/q153_scene` 招待されなかった伯爵：城の侍従：`region_6_f1` (5, 1)。起動 `interact` → `q153.visit`。[定義](../../data/quests/q153.json)。

### q154 鍵を盗まない泥棒

`q154/q154_scene` 鍵を盗まない泥棒：盗賊エノ：`region_6_f1` (6, 1)。起動 `interact` → `q154.visit`。[定義](../../data/quests/q154.json)。

### q155 味方の密告

`q155/q155_scene` 味方の密告：反乱軍のベルナ：`region_6_f1` (8, 1)。起動 `interact` → `q155.visit`。[定義](../../data/quests/q155.json)。

### q156 降伏しない人質

`q156/q156_scene` 降伏しない人質：外交官救出隊：`region_6_f2` (3, 1)。起動 `interact` → `q156.visit`。[定義](../../data/quests/q156.json)。

### q157 影武者の休日

`q157/q157_scene` 影武者の休日：影武者アリ：`region_6_f2` (4, 1)。起動 `interact` → `q157.visit`。[定義](../../data/quests/q157.json)。

### q158 成功させてはいけない救出

`q158/q158_scene` 成功させてはいけない救出：商会員トルの兄：`region_6_f2` (5, 1)。起動 `interact` → `q158.visit`。[定義](../../data/quests/q158.json)。

### q159 二重に売れた地図

`q159/q159_scene` 二重に売れた地図：二つの探検隊：`region_6_f2` (6, 1)。起動 `interact` → `q159.visit`。[定義](../../data/quests/q159.json)。

### q160 拍手する裏切り者

`q160/q160_scene` 拍手する裏切り者：密偵長：`region_6_f2` (8, 1)。起動 `interact` → `q160.visit`。[定義](../../data/quests/q160.json)。

### q161 治さない傷

`q161/q161_scene` 治さない傷：祈祷師イネ：`region_7_f1` (3, 1)。起動 `interact` → `q161.visit`。[定義](../../data/quests/q161.json)。

### q162 騎士の盾を借りる

`q162/q162_scene` 騎士の盾を借りる：騎士エルド：`region_7_f1` (4, 1)。起動 `interact` → `q162.visit`。[定義](../../data/quests/q162.json)。

### q163 盗賊の初仕事

`q163/q163_scene` 盗賊の初仕事：元盗賊の鍵師ソム：`region_7_f1` (5, 1)。起動 `interact` → `q163.visit`。[定義](../../data/quests/q163.json)。

### q164 吟遊詩人抜きの宴

`q164/q164_scene` 吟遊詩人抜きの宴：帰り火亭の常連：`region_7_f1` (6, 1)。起動 `interact` → `q164.visit`。[定義](../../data/quests/q164.json)。

### q165 仲間を外す依頼

`q165/q165_scene` 仲間を外す依頼：商人リナ：`region_7_f1` (8, 1)。起動 `interact` → `q165.visit`。[定義](../../data/quests/q165.json)。

### q166 最後の一撃を譲れ

`q166/q166_scene` 最後の一撃を譲れ：弟子戦士ルウ：`region_7_f2` (3, 1)。起動 `interact` → `q166.visit`。[定義](../../data/quests/q166.json)。

### q167 軍師のいない勝利

`q167/q167_scene` 軍師のいない勝利：病欠した軍師ユウナの隊：`region_7_f2` (4, 1)。起動 `interact` → `q167.visit`。[定義](../../data/quests/q167.json)。

### q168 ふたりでひとり分の報酬

`q168/q168_scene` ふたりでひとり分の報酬：双子の術師ネムとノム：`region_7_f2` (5, 1)。起動 `interact` → `q168.flow.visit`。[定義](../../data/quests/q168.json)。

### q169 誰にも贈れない指輪

`q169/q169_scene` 誰にも贈れない指輪：騎士マオ：`region_7_f2` (8, 1)。起動 `interact` → `q169.flow.visit`。[定義](../../data/quests/q169.json)。

### q170 別れるための冒険

`q170/q170_scene` 別れるための冒険：旅仲間セフ：`region_7_f2` (9, 1)。起動 `interact` → `q170.visit`。[定義](../../data/quests/q170.json)。

### q171 足音を持ち帰る

`q171/q171_scene` 足音を持ち帰る：靴職人ダイの妻：`region_8_f1` (3, 1)。起動 `interact` → `q171.visit`。[定義](../../data/quests/q171.json)。

### q172 名前を返す井戸

`q172/q172_scene` 名前を返す井戸：織工ルイ：`region_8_f1` (4, 1)。起動 `interact` → `q172.visit`。[定義](../../data/quests/q172.json)。

### q173 夜だけ帰る兵士

`q173/q173_scene` 夜だけ帰る兵士：寡婦テラ：`region_8_f1` (5, 1)。起動 `interact` → `q173.visit`。[定義](../../data/quests/q173.json)。

### q174 泣かない葬列

`q174/q174_scene` 泣かない葬列：村長：`region_8_f1` (6, 1)。起動 `interact` → `q174.visit`。[定義](../../data/quests/q174.json)。

### q175 狩人を待つ獣

`q175/q175_scene` 狩人を待つ獣：猟師ミロの妹：`region_8_f1` (8, 1)。起動 `interact` → `q175.flow.visit`。[定義](../../data/quests/q175.json)。

### q176 神様の忘れ物

`q176/q176_scene` 神様の忘れ物：小さな街道神：`region_8_f2` (3, 1)。起動 `interact` → `q176.visit`。[定義](../../data/quests/q176.json)。

### q177 嘘をつかない鏡

`q177/q177_scene` 嘘をつかない鏡：鏡を売る商人：`region_8_f2` (4, 1)。起動 `interact` → `q177.visit`。[定義](../../data/quests/q177.json)。

### q178 扉の向こうの明日

`q178/q178_scene` 扉の向こうの明日：宿主と旅立つ娘：`region_8_f2` (5, 1)。起動 `interact` → `q178.visit`。[定義](../../data/quests/q178.json)。

### q179 墓を増やす庭

`q179/q179_scene` 墓を増やす庭：墓守：`region_8_f2` (6, 1)。起動 `interact` → `q179.visit`。[定義](../../data/quests/q179.json)。

### q180 最後の怪談

`q180/q180_scene` 最後の怪談：宿主と語り部ムイ：`region_8_f2` (8, 1)。起動 `interact` → `q180.visit`。[定義](../../data/quests/q180.json)。

### q181 白い矢筒

`q181/q181_scene` 白い矢筒：新任の弓兵隊長：`region_9_f1` (3, 1)。起動 `interact` → `q181.visit`。[定義](../../data/quests/q181.json)。

### q182 一発も撃たない砲手

`q182/q182_scene` 一発も撃たない砲手：魔導砲手オル：`region_9_f1` (4, 1)。起動 `interact` → `q182.visit`。[定義](../../data/quests/q182.json)。

### q183 勝者の洗濯場

`q183/q183_scene` 勝者の洗濯場：戦後の洗濯場の係長：`region_9_f1` (5, 1)。起動 `interact` → `q183.visit`。[定義](../../data/quests/q183.json)。

### q184 捕虜の鍋

`q184/q184_scene` 捕虜の鍋：捕虜収容所の料理係：`region_9_f1` (6, 1)。起動 `interact` → `q184.visit`。[定義](../../data/quests/q184.json)。

### q185 橋を落とさない理由

`q185/q185_scene` 橋を落とさない理由：撤退軍と橋守ネヴ：`region_9_f1` (8, 1)。起動 `interact` → `q185.visit`。[定義](../../data/quests/q185.json)。

### q186 返事のない停戦

`q186/q186_scene` 返事のない停戦：交渉官ハス：`region_9_f2` (3, 1)。起動 `interact` → `q186.visit`。[定義](../../data/quests/q186.json)。

### q187 旗を持たない兵士

`q187/q187_scene` 旗を持たない兵士：国境村：`region_9_f2` (4, 1)。起動 `interact` → `q187.visit`。[定義](../../data/quests/q187.json)。

### q188 帰還兵の席

`q188/q188_scene` 帰還兵の席：帰還兵ラフ：`region_9_f2` (5, 1)。起動 `interact` → `q188.visit`。[定義](../../data/quests/q188.json)。

### q189 敵国の子守歌

`q189/q189_scene` 敵国の子守歌：避難所の薬売りアサ：`region_9_f2` (6, 1)。起動 `interact` → `q189.visit`。[定義](../../data/quests/q189.json)。

### q190 終戦翌日の魔物

`q190/q190_scene` 終戦翌日の魔物：兵站係フウ：`region_9_f2` (9, 1)。起動 `interact` → `q190.visit`。[定義](../../data/quests/q190.json)。

### q191 勇者を通さない門

`q191/q191_scene` 勇者を通さない門：名の知られた勇者の従者：`region_10_f1` (3, 1)。起動 `interact` → `q191.visit`。[定義](../../data/quests/q191.json)。

### q192 消えた依頼板

`q192/q192_scene` 消えた依頼板：組合長メナ：`region_10_f1` (4, 1)。起動 `interact` → `q192.visit`。[定義](../../data/quests/q192.json)。

### q193 祈りの届かない場所

`q193/q193_scene` 祈りの届かない場所：谷の若者ルネ：`region_10_f1` (5, 1) / `prayerless_valley_f1` (9, 7)。起動 `interact` → `q193.visit`。[定義](../../data/quests/q193.json)。

`q193/prayerless_valley` 境界の内側の祈り：`prayerless_valley_f1` (4, 1) / `prayerless_valley_f1` (5, 1)。起動 `action` → `dungeon.scene.prayerless_valley.v1`。[定義](../../data/quests/q193.json)。

### q194 売れた故郷

`q194/q194_scene` 売れた故郷：移動集落の住人サナ：`region_10_f1` (6, 1) / `moving_village_f1` (9, 7)。起動 `interact` → `q194.visit`。[定義](../../data/quests/q194.json)。

`q194/moving_village` 暮らしを揺らす足場：`moving_village_f1` (1, 1)。起動 `action` → `dungeon.scene.moving_village.v1`。[定義](../../data/quests/q194.json)。

### q195 魔王の畑

`q195/q195_scene` 魔王の畑：魔王領だった村の農夫：`region_10_f1` (8, 1)。起動 `interact` → `q195.visit`。[定義](../../data/quests/q195.json)。

### q196 英雄の名を消す日

`q196/q196_scene` 英雄の名を消す日：広場の記録係：`region_10_f2` (2, 1)。起動 `interact` → `q196.flow.visit`。[定義](../../data/quests/q196.json)。

### q197 忘れられる勝利

`q197/q197_scene` 忘れられる勝利：封印の記録官エル：`region_10_f2` (3, 1)。起動 `interact` → `q197.visit`。[定義](../../data/quests/q197.json)。

### q198 旅の終わりの道標

`q198/q198_scene` 旅の終わりの道標：道標職人ユノ：`region_10_f2` (5, 1)。起動 `interact` → `q198.flow.visit`。[定義](../../data/quests/q198.json)。

### q199 帰らない依頼人

`q199/q199_scene` 帰らない依頼人：時計師の娘ミル：`region_10_f2` (6, 1)。起動 `interact` → `q199.visit`。[定義](../../data/quests/q199.json)。

### q200 帰還印の向こう側

`q200/q200_scene` 帰還印の向こう側：帰還印の修理師トワ：`region_10_f2` (8, 1)。起動 `interact` → `q200.flow.visit`。[定義](../../data/quests/q200.json)。

## マップ共通の配置一覧

### region_1_f1 灯守の地下水道・上層・入口操作室

`region_1_f1/exit`：(1, 1) `exit`、起動 `interact` → `region_1_f1.exit`。[定義](../../data/maps/region_1_f1.json)。

`region_1_f1/cache`：(1, 3) `chest`、起動 `interact` → `region_1_f1.cache`。[定義](../../data/maps/region_1_f1.json)。

`region_1_f1/fountain`：(5, 3) `fountain`、起動 `interact` → `region_1_f1.fountain`。[定義](../../data/maps/region_1_f1.json)。

`region_1_f1/trap`：(7, 3) `trap`、起動 `enter` → `region_1_f1.trap`。[定義](../../data/maps/region_1_f1.json)。

`region_1_f1/door`：(9, 3) `door`、起動 `interact` → `region_1_f1.door`。[定義](../../data/maps/region_1_f1.json)。

### region_1_f2 灯守の地下水道・下層・操作室

`region_1_f2/cache`：(1, 3) `chest`、起動 `interact` → `region_1_f2.cache`。[定義](../../data/maps/region_1_f2.json)。

`region_1_f2/fountain`：(5, 3) `fountain`、起動 `interact` → `region_1_f2.fountain`。[定義](../../data/maps/region_1_f2.json)。

`region_1_f2/trap`：(7, 3) `trap`、起動 `enter` → `region_1_f2.trap`。[定義](../../data/maps/region_1_f2.json)。

`region_1_f2/door`：(9, 3) `door`、起動 `interact` → `region_1_f2.door`。[定義](../../data/maps/region_1_f2.json)。

### region_2_f1 塩哭きの廃坑・地下1層

`region_2_f1/exit`：(1, 1) `exit`、起動 `interact` → `region_2_f1.exit`。[定義](../../data/maps/region_2_f1.json)。

`region_2_f1/cache`：(1, 4) `chest`、起動 `interact` → `region_2_f1.cache`。[定義](../../data/maps/region_2_f1.json)。

`region_2_f1/fountain`：(3, 13) `fountain`、起動 `interact` → `region_2_f1.fountain`。[定義](../../data/maps/region_2_f1.json)。

`region_2_f1/trap`：(11, 1) `trap`、起動 `enter` → `region_2_f1.trap`。[定義](../../data/maps/region_2_f1.json)。

`region_2_f1/door`：(11, 13) `door`、起動 `interact` → `region_2_f1.door`。[定義](../../data/maps/region_2_f1.json)。

### region_2_f2 塩哭きの廃坑・地下2層

`region_2_f2/cache`：(1, 4) `chest`、起動 `interact` → `region_2_f2.cache`。[定義](../../data/maps/region_2_f2.json)。

`region_2_f2/fountain`：(5, 11) `fountain`、起動 `interact` → `region_2_f2.fountain`。[定義](../../data/maps/region_2_f2.json)。

`region_2_f2/trap`：(3, 10) `trap`、起動 `enter` → `region_2_f2.trap`。[定義](../../data/maps/region_2_f2.json)。

`region_2_f2/door`：(15, 11) `door`、起動 `interact` → `region_2_f2.door`。[定義](../../data/maps/region_2_f2.json)。

### region_3_f1 根喰みの地下庭園・地下1層

`region_3_f1/exit`：(1, 1) `exit`、起動 `interact` → `region_3_f1.exit`。[定義](../../data/maps/region_3_f1.json)。

`region_3_f1/cache`：(1, 4) `chest`、起動 `interact` → `region_3_f1.cache`。[定義](../../data/maps/region_3_f1.json)。

`region_3_f1/fountain`：(5, 11) `fountain`、起動 `interact` → `region_3_f1.fountain`。[定義](../../data/maps/region_3_f1.json)。

`region_3_f1/trap`：(1, 12) `trap`、起動 `enter` → `region_3_f1.trap`。[定義](../../data/maps/region_3_f1.json)。

`region_3_f1/door`：(17, 11) `door`、起動 `interact` → `region_3_f1.door`。[定義](../../data/maps/region_3_f1.json)。

### region_3_f2 根喰みの地下庭園・地下2層

`region_3_f2/cache`：(1, 4) `chest`、起動 `interact` → `region_3_f2.cache`。[定義](../../data/maps/region_3_f2.json)。

`region_3_f2/fountain`：(9, 7) `fountain`、起動 `interact` → `region_3_f2.fountain`。[定義](../../data/maps/region_3_f2.json)。

`region_3_f2/trap`：(4, 9) `trap`、起動 `enter` → `region_3_f2.trap`。[定義](../../data/maps/region_3_f2.json)。

`region_3_f2/door`：(17, 13) `door`、起動 `interact` → `region_3_f2.door`。[定義](../../data/maps/region_3_f2.json)。

### region_4_f1 鏡沈みの礼拝堂・地下1層

`region_4_f1/exit`：(1, 1) `exit`、起動 `interact` → `region_4_f1.exit`。[定義](../../data/maps/region_4_f1.json)。

`region_4_f1/stairs`：(12, 13) `stairs`、起動 `interact` → `region_4_f1.stairs`。[定義](../../data/maps/region_4_f1.json)。

`region_4_f1/cache`：(1, 4) `chest`、起動 `interact` → `region_4_f1.cache`。[定義](../../data/maps/region_4_f1.json)。

`region_4_f1/fountain`：(14, 1) `fountain`、起動 `interact` → `region_4_f1.fountain`。[定義](../../data/maps/region_4_f1.json)。

`region_4_f1/trap`：(5, 7) `trap`、起動 `enter` → `region_4_f1.trap`。[定義](../../data/maps/region_4_f1.json)。

`region_4_f1/door`：(17, 9) `door`、起動 `interact` → `region_4_f1.door`。[定義](../../data/maps/region_4_f1.json)。

### region_4_f2 鏡沈みの礼拝堂・地下2層

`region_4_f2/stairs`：(1, 1) `stairs`、起動 `interact` → `region_4_f2.stairs`。[定義](../../data/maps/region_4_f2.json)。

`region_4_f2/cache`：(1, 4) `chest`、起動 `interact` → `region_4_f2.cache`。[定義](../../data/maps/region_4_f2.json)。

`region_4_f2/fountain`：(7, 9) `fountain`、起動 `interact` → `region_4_f2.fountain`。[定義](../../data/maps/region_4_f2.json)。

`region_4_f2/trap`：(2, 11) `trap`、起動 `enter` → `region_4_f2.trap`。[定義](../../data/maps/region_4_f2.json)。

`region_4_f2/door`：(13, 11) `door`、起動 `interact` → `region_4_f2.door`。[定義](../../data/maps/region_4_f2.json)。

### region_5_f1 灰時計の書庫・地下1層

`region_5_f1/exit`：(1, 1) `exit`、起動 `interact` → `region_5_f1.exit`。[定義](../../data/maps/region_5_f1.json)。

`region_5_f1/stairs`：(17, 8) `stairs`、起動 `interact` → `region_5_f1.stairs`。[定義](../../data/maps/region_5_f1.json)。

`region_5_f1/cache`：(1, 4) `chest`、起動 `interact` → `region_5_f1.cache`。[定義](../../data/maps/region_5_f1.json)。

`region_5_f1/fountain`：(9, 7) `fountain`、起動 `interact` → `region_5_f1.fountain`。[定義](../../data/maps/region_5_f1.json)。

`region_5_f1/trap`：(4, 9) `trap`、起動 `enter` → `region_5_f1.trap`。[定義](../../data/maps/region_5_f1.json)。

`region_5_f1/door`：(13, 9) `door`、起動 `interact` → `region_5_f1.door`。[定義](../../data/maps/region_5_f1.json)。

### region_5_f2 灰時計の書庫・地下2層

`region_5_f2/stairs`：(1, 1) `stairs`、起動 `interact` → `region_5_f2.stairs`。[定義](../../data/maps/region_5_f2.json)。

`region_5_f2/cache`：(2, 3) `chest`、起動 `interact` → `region_5_f2.cache`。[定義](../../data/maps/region_5_f2.json)。

`region_5_f2/fountain`：(5, 11) `fountain`、起動 `interact` → `region_5_f2.fountain`。[定義](../../data/maps/region_5_f2.json)。

`region_5_f2/trap`：(11, 1) `trap`、起動 `enter` → `region_5_f2.trap`。[定義](../../data/maps/region_5_f2.json)。

`region_5_f2/door`：(15, 7) `door`、起動 `interact` → `region_5_f2.door`。[定義](../../data/maps/region_5_f2.json)。

### region_6_f1 眠れる地下市場・地下1層

`region_6_f1/exit`：(1, 1) `exit`、起動 `interact` → `region_6_f1.exit`。[定義](../../data/maps/region_6_f1.json)。

`region_6_f1/stairs`：(14, 11) `stairs`、起動 `interact` → `region_6_f1.stairs`。[定義](../../data/maps/region_6_f1.json)。

`region_6_f1/cache`：(2, 3) `chest`、起動 `interact` → `region_6_f1.cache`。[定義](../../data/maps/region_6_f1.json)。

`region_6_f1/fountain`：(5, 11) `fountain`、起動 `interact` → `region_6_f1.fountain`。[定義](../../data/maps/region_6_f1.json)。

`region_6_f1/trap`：(11, 1) `trap`、起動 `enter` → `region_6_f1.trap`。[定義](../../data/maps/region_6_f1.json)。

`region_6_f1/door`：(17, 11) `door`、起動 `interact` → `region_6_f1.door`。[定義](../../data/maps/region_6_f1.json)。

### region_6_f2 眠れる地下市場・地下2層

`region_6_f2/stairs`：(1, 1) `stairs`、起動 `interact` → `region_6_f2.stairs`。[定義](../../data/maps/region_6_f2.json)。

`region_6_f2/cache`：(2, 3) `chest`、起動 `interact` → `region_6_f2.cache`。[定義](../../data/maps/region_6_f2.json)。

`region_6_f2/fountain`：(3, 13) `fountain`、起動 `interact` → `region_6_f2.fountain`。[定義](../../data/maps/region_6_f2.json)。

`region_6_f2/trap`：(11, 1) `trap`、起動 `enter` → `region_6_f2.trap`。[定義](../../data/maps/region_6_f2.json)。

`region_6_f2/door`：(17, 13) `door`、起動 `interact` → `region_6_f2.door`。[定義](../../data/maps/region_6_f2.json)。

### region_7_f1 黒潮の沈没城・地下1層

`region_7_f1/exit`：(1, 1) `exit`、起動 `interact` → `region_7_f1.exit`。[定義](../../data/maps/region_7_f1.json)。

`region_7_f1/stairs`：(14, 11) `stairs`、起動 `interact` → `region_7_f1.stairs`。[定義](../../data/maps/region_7_f1.json)。

`region_7_f1/cache`：(1, 4) `chest`、起動 `interact` → `region_7_f1.cache`。[定義](../../data/maps/region_7_f1.json)。

`region_7_f1/fountain`：(9, 7) `fountain`、起動 `interact` → `region_7_f1.fountain`。[定義](../../data/maps/region_7_f1.json)。

`region_7_f1/trap`：(4, 9) `trap`、起動 `enter` → `region_7_f1.trap`。[定義](../../data/maps/region_7_f1.json)。

`region_7_f1/door`：(17, 5) `door`、起動 `interact` → `region_7_f1.door`。[定義](../../data/maps/region_7_f1.json)。

### region_7_f2 黒潮の沈没城・地下2層

`region_7_f2/stairs`：(1, 1) `stairs`、起動 `interact` → `region_7_f2.stairs`。[定義](../../data/maps/region_7_f2.json)。

`region_7_f2/cache`：(1, 4) `chest`、起動 `interact` → `region_7_f2.cache`。[定義](../../data/maps/region_7_f2.json)。

`region_7_f2/fountain`：(5, 11) `fountain`、起動 `interact` → `region_7_f2.fountain`。[定義](../../data/maps/region_7_f2.json)。

`region_7_f2/trap`：(3, 10) `trap`、起動 `enter` → `region_7_f2.trap`。[定義](../../data/maps/region_7_f2.json)。

`region_7_f2/door`：(13, 13) `door`、起動 `interact` → `region_7_f2.door`。[定義](../../data/maps/region_7_f2.json)。

### region_8_f1 鉄胎の機関廟・地下1層

`region_8_f1/exit`：(1, 1) `exit`、起動 `interact` → `region_8_f1.exit`。[定義](../../data/maps/region_8_f1.json)。

`region_8_f1/stairs`：(12, 13) `stairs`、起動 `interact` → `region_8_f1.stairs`。[定義](../../data/maps/region_8_f1.json)。

`region_8_f1/cache`：(1, 4) `chest`、起動 `interact` → `region_8_f1.cache`。[定義](../../data/maps/region_8_f1.json)。

`region_8_f1/fountain`：(7, 9) `fountain`、起動 `interact` → `region_8_f1.fountain`。[定義](../../data/maps/region_8_f1.json)。

`region_8_f1/trap`：(2, 11) `trap`、起動 `enter` → `region_8_f1.trap`。[定義](../../data/maps/region_8_f1.json)。

`region_8_f1/door`：(17, 13) `door`、起動 `interact` → `region_8_f1.door`。[定義](../../data/maps/region_8_f1.json)。

### region_8_f2 鉄胎の機関廟・地下2層

`region_8_f2/stairs`：(1, 1) `stairs`、起動 `interact` → `region_8_f2.stairs`。[定義](../../data/maps/region_8_f2.json)。

`region_8_f2/cache`：(2, 3) `chest`、起動 `interact` → `region_8_f2.cache`。[定義](../../data/maps/region_8_f2.json)。

`region_8_f2/fountain`：(6, 10) `fountain`、起動 `interact` → `region_8_f2.fountain`。[定義](../../data/maps/region_8_f2.json)。

`region_8_f2/trap`：(1, 12) `trap`、起動 `enter` → `region_8_f2.trap`。[定義](../../data/maps/region_8_f2.json)。

`region_8_f2/door`：(9, 11) `door`、起動 `interact` → `region_8_f2.door`。[定義](../../data/maps/region_8_f2.json)。

### region_9_f1 星欠けの地下観測所・地下1層

`region_9_f1/exit`：(1, 1) `exit`、起動 `interact` → `region_9_f1.exit`。[定義](../../data/maps/region_9_f1.json)。

`region_9_f1/stairs`：(13, 12) `stairs`、起動 `interact` → `region_9_f1.stairs`。[定義](../../data/maps/region_9_f1.json)。

`region_9_f1/cache`：(2, 3) `chest`、起動 `interact` → `region_9_f1.cache`。[定義](../../data/maps/region_9_f1.json)。

`region_9_f1/fountain`：(7, 9) `fountain`、起動 `interact` → `region_9_f1.fountain`。[定義](../../data/maps/region_9_f1.json)。

`region_9_f1/trap`：(1, 12) `trap`、起動 `enter` → `region_9_f1.trap`。[定義](../../data/maps/region_9_f1.json)。

`region_9_f1/door`：(17, 7) `door`、起動 `interact` → `region_9_f1.door`。[定義](../../data/maps/region_9_f1.json)。

### region_9_f2 星欠けの地下観測所・地下2層

`region_9_f2/stairs`：(1, 1) `stairs`、起動 `interact` → `region_9_f2.stairs`。[定義](../../data/maps/region_9_f2.json)。

`region_9_f2/cache`：(1, 4) `chest`、起動 `interact` → `region_9_f2.cache`。[定義](../../data/maps/region_9_f2.json)。

`region_9_f2/fountain`：(3, 13) `fountain`、起動 `interact` → `region_9_f2.fountain`。[定義](../../data/maps/region_9_f2.json)。

`region_9_f2/trap`：(4, 9) `trap`、起動 `enter` → `region_9_f2.trap`。[定義](../../data/maps/region_9_f2.json)。

`region_9_f2/door`：(13, 13) `door`、起動 `interact` → `region_9_f2.door`。[定義](../../data/maps/region_9_f2.json)。

### region_10_f1 帰還者の深淵・地下1層

`region_10_f1/exit`：(1, 1) `exit`、起動 `interact` → `region_10_f1.exit`。[定義](../../data/maps/region_10_f1.json)。

`region_10_f1/stairs`：(15, 10) `stairs`、起動 `interact` → `region_10_f1.stairs`。[定義](../../data/maps/region_10_f1.json)。

`region_10_f1/cache`：(2, 3) `chest`、起動 `interact` → `region_10_f1.cache`。[定義](../../data/maps/region_10_f1.json)。

`region_10_f1/fountain`：(7, 9) `fountain`、起動 `interact` → `region_10_f1.fountain`。[定義](../../data/maps/region_10_f1.json)。

`region_10_f1/trap`：(11, 1) `trap`、起動 `enter` → `region_10_f1.trap`。[定義](../../data/maps/region_10_f1.json)。

`region_10_f1/door`：(13, 1) `door`、起動 `interact` → `region_10_f1.door`。[定義](../../data/maps/region_10_f1.json)。

### region_10_f2 帰還者の深淵・地下2層

`region_10_f2/stairs`：(1, 1) `stairs`、起動 `interact` → `region_10_f2.stairs`。[定義](../../data/maps/region_10_f2.json)。

`region_10_f2/cache`：(1, 4) `chest`、起動 `interact` → `region_10_f2.cache`。[定義](../../data/maps/region_10_f2.json)。

`region_10_f2/fountain`：(7, 9) `fountain`、起動 `interact` → `region_10_f2.fountain`。[定義](../../data/maps/region_10_f2.json)。

`region_10_f2/trap`：(5, 8) `trap`、起動 `enter` → `region_10_f2.trap`。[定義](../../data/maps/region_10_f2.json)。

`region_10_f2/door`：(13, 11) `door`、起動 `interact` → `region_10_f2.door`。[定義](../../data/maps/region_10_f2.json)。

### kagaribi_f1 篝火の迷宮・灯番の巡回路

`kagaribi_f1/exit`：(1, 1) `exit`、起動 `interact` → `kagaribi.exit`。[定義](../../data/maps/kagaribi_f1.json)。

`kagaribi_f1/history`：(3, 1) `clue`、起動 `interact` → `kagaribi.history`。[定義](../../data/maps/kagaribi_f1.json)。

### kagaribi_f2 篝火の迷宮・消えた灯の回廊

### kagaribi_f3 篝火の迷宮・深火の祭壇

`kagaribi_f3/legend`：(7, 7) `clue`、起動 `interact` → `kagaribi.legend`。[定義](../../data/maps/kagaribi_f3.json)。

### prayerless_valley_f1 祈りの届かない谷

`prayerless_valley_f1/exit`：(1, 1) `exit`、起動 `interact` → `prayerless_valley.exit`。[定義](../../data/maps/prayerless_valley_f1.json)。

### moving_village_f1 巨獣上の移動集落

`moving_village_f1/exit`：(1, 1) `exit`、起動 `interact` → `moving_village.exit`。[定義](../../data/maps/moving_village_f1.json)。

### region_1_canal_a 灯守の地下水道・上層・第一水路

### region_1_landing 灯守の地下水道・上層・荷揚げ場

### region_1_canal_b 灯守の地下水道・上層・排水支路

### region_1_inspection 灯守の地下水道・上層・鐘と浮子の点検室

### region_1_canal_c 灯守の地下水道・下層・給金箱の水路

### region_1_lower_landing 灯守の地下水道・下層・棺の待避場

### region_1_canal_d 灯守の地下水道・下層・避難水路

### region_1_gatehouse 灯守の地下水道・下層・奥の水門詰所

## battle.startの定義位置

現在の進行と旧進行の互換定義を含む全スクリプトの静的索引。ここに載るだけでは現在のクエスト経路から到達するとは限らない。q001の現行経路は上記専用IDを使う。

`q001-F-kuragari`：`q001.v11.outage` / `commands.3` → `kuragari_hunt`、戦闘中イベント `q001-B-rookie`。

`q002.v11.entry/commands.2.options.1.commands.0`：`q002.v11.entry` / `commands.2.options.1.commands.0` → `guard_1`。

`q004.decision/commands.1.options.1.commands.0`：`q004.decision` / `commands.1.options.1.commands.0` → `guard_1`。

`q004.review/commands.2.options.1.commands.0`：`q004.review` / `commands.2.options.1.commands.0` → `guard_1`。

`q004.flow.entry/commands.2.options.2.commands.0`：`q004.flow.entry` / `commands.2.options.2.commands.0` → `guard_1`。

`q004.v11.entry/commands.2.options.1.commands.0`：`q004.v11.entry` / `commands.2.options.1.commands.0` → `guard_1`。

`q005.decision/commands.1.options.0.commands.0`：`q005.decision` / `commands.1.options.0.commands.0` → `guard_1`。

`q005.review/commands.2.options.0.commands.0`：`q005.review` / `commands.2.options.0.commands.0` → `guard_1`。

`q006.decision/commands.1.options.0.commands.2`：`q006.decision` / `commands.1.options.0.commands.2` → `guard_1`。

`q006.decision/commands.1.options.1.commands.0`：`q006.decision` / `commands.1.options.1.commands.0` → `guard_1`。

`q006.review/commands.2.options.0.commands.0`：`q006.review` / `commands.2.options.0.commands.0` → `guard_1`。

`q006.review/commands.2.options.1.commands.0`：`q006.review` / `commands.2.options.1.commands.0` → `guard_1`。

`q006.flow.entry/commands.2.options.1.commands.0`：`q006.flow.entry` / `commands.2.options.1.commands.0` → `guard_1`。

`q006.v11.entry/commands.2.options.0.commands.0`：`q006.v11.entry` / `commands.2.options.0.commands.0` → `guard_1`。

`q007.decision/commands.1.options.0.commands.0`：`q007.decision` / `commands.1.options.0.commands.0` → `guard_1`。

`q007.review/commands.2.options.0.commands.0`：`q007.review` / `commands.2.options.0.commands.0` → `guard_1`。

`q008.decision/commands.1.options.1.commands.0`：`q008.decision` / `commands.1.options.1.commands.0` → `guard_1`。

`q008.review/commands.2.options.1.commands.0`：`q008.review` / `commands.2.options.1.commands.0` → `guard_1`。

`q008.flow.entry/commands.2.options.1.commands.0`：`q008.flow.entry` / `commands.2.options.1.commands.0` → `guard_1`。

`q008.v11.entry/commands.2.options.1.commands.0`：`q008.v11.entry` / `commands.2.options.1.commands.0` → `guard_1`。

`q009.decision/commands.1.options.0.commands.0`：`q009.decision` / `commands.1.options.0.commands.0` → `guard_1`。

`q009.review/commands.2.options.0.commands.0`：`q009.review` / `commands.2.options.0.commands.0` → `guard_1`。

`q009.flow.entry/commands.2.options.1.commands.0`：`q009.flow.entry` / `commands.2.options.1.commands.0` → `guard_1`。

`q009.v11.entry/commands.2.options.1.commands.0`：`q009.v11.entry` / `commands.2.options.1.commands.0` → `guard_1`。

`q010.decision/commands.1.options.0.commands.1`：`q010.decision` / `commands.1.options.0.commands.1` → `boss_1`。

`q010.decision/commands.1.options.1.commands.0`：`q010.decision` / `commands.1.options.1.commands.0` → `boss_1`。

`q010.review/commands.2.options.0.commands.0`：`q010.review` / `commands.2.options.0.commands.0` → `boss_1`。

`q010.review/commands.2.options.1.commands.0`：`q010.review` / `commands.2.options.1.commands.0` → `boss_1`。

`q010.flow.entry/commands.2.options.1.commands.0`：`q010.flow.entry` / `commands.2.options.1.commands.0` → `boss_1`。

`q011.decision/commands.1.options.0.commands.0`：`q011.decision` / `commands.1.options.0.commands.0` → `guard_2`。

`q011.review/commands.2.options.0.commands.0`：`q011.review` / `commands.2.options.0.commands.0` → `guard_2`。

`q012.decision/commands.1.options.0.commands.2`：`q012.decision` / `commands.1.options.0.commands.2` → `guard_2`。

`q012.decision/commands.1.options.1.commands.0`：`q012.decision` / `commands.1.options.1.commands.0` → `guard_2`。

`q012.review/commands.2.options.0.commands.0`：`q012.review` / `commands.2.options.0.commands.0` → `guard_2`。

`q012.review/commands.2.options.1.commands.0`：`q012.review` / `commands.2.options.1.commands.0` → `guard_2`。

`q013.decision/commands.1.options.0.commands.0`：`q013.decision` / `commands.1.options.0.commands.0` → `guard_2`。

`q013.review/commands.2.options.0.commands.0`：`q013.review` / `commands.2.options.0.commands.0` → `guard_2`。

`q014.decision/commands.1.options.1.commands.0`：`q014.decision` / `commands.1.options.1.commands.0` → `guard_2`。

`q014.review/commands.2.options.1.commands.0`：`q014.review` / `commands.2.options.1.commands.0` → `guard_2`。

`q015.decision/commands.1.options.0.commands.0`：`q015.decision` / `commands.1.options.0.commands.0` → `guard_2`。

`q015.review/commands.2.options.0.commands.0`：`q015.review` / `commands.2.options.0.commands.0` → `guard_2`。

`q016.decision/commands.1.options.0.commands.2`：`q016.decision` / `commands.1.options.0.commands.2` → `guard_2`。

`q016.decision/commands.1.options.1.commands.0`：`q016.decision` / `commands.1.options.1.commands.0` → `guard_2`。

`q016.review/commands.2.options.0.commands.0`：`q016.review` / `commands.2.options.0.commands.0` → `guard_2`。

`q016.review/commands.2.options.1.commands.0`：`q016.review` / `commands.2.options.1.commands.0` → `guard_2`。

`q016.flow.entry/commands.2.options.1.commands.0`：`q016.flow.entry` / `commands.2.options.1.commands.0` → `guard_2`。

`q016.catalog1.entry/commands.2.options.1.commands.0`：`q016.catalog1.entry` / `commands.2.options.1.commands.0` → `guard_2`。

`q017.decision/commands.1.options.0.commands.0`：`q017.decision` / `commands.1.options.0.commands.0` → `guard_2`。

`q017.review/commands.2.options.0.commands.0`：`q017.review` / `commands.2.options.0.commands.0` → `guard_2`。

`q018.decision/commands.1.options.1.commands.0`：`q018.decision` / `commands.1.options.1.commands.0` → `guard_2`。

`q018.review/commands.2.options.1.commands.0`：`q018.review` / `commands.2.options.1.commands.0` → `guard_2`。

`q019.decision/commands.1.options.0.commands.0`：`q019.decision` / `commands.1.options.0.commands.0` → `guard_2`。

`q019.review/commands.2.options.0.commands.0`：`q019.review` / `commands.2.options.0.commands.0` → `guard_2`。

`q020.decision/commands.1.options.0.commands.1`：`q020.decision` / `commands.1.options.0.commands.1` → `boss_2`。

`q020.decision/commands.1.options.1.commands.0`：`q020.decision` / `commands.1.options.1.commands.0` → `boss_2`。

`q020.review/commands.2.options.0.commands.0`：`q020.review` / `commands.2.options.0.commands.0` → `boss_2`。

`q020.review/commands.2.options.1.commands.0`：`q020.review` / `commands.2.options.1.commands.0` → `boss_2`。

`q020.flow.entry/commands.2.options.1.commands.0`：`q020.flow.entry` / `commands.2.options.1.commands.0` → `boss_2`。

`q020.catalog1.entry/commands.2.options.1.commands.0`：`q020.catalog1.entry` / `commands.2.options.1.commands.0` → `boss_2`。

`q021.decision/commands.1.options.0.commands.0`：`q021.decision` / `commands.1.options.0.commands.0` → `guard_3`。

`q021.review/commands.2.options.0.commands.0`：`q021.review` / `commands.2.options.0.commands.0` → `guard_3`。

`q021.flow.entry/commands.2.options.1.commands.0`：`q021.flow.entry` / `commands.2.options.1.commands.0` → `guard_3`。

`q022.decision/commands.1.options.0.commands.2`：`q022.decision` / `commands.1.options.0.commands.2` → `guard_3`。

`q022.decision/commands.1.options.1.commands.0`：`q022.decision` / `commands.1.options.1.commands.0` → `guard_3`。

`q022.review/commands.2.options.0.commands.0`：`q022.review` / `commands.2.options.0.commands.0` → `guard_3`。

`q022.review/commands.2.options.1.commands.0`：`q022.review` / `commands.2.options.1.commands.0` → `guard_3`。

`q022.flow.entry/commands.2.options.1.commands.0`：`q022.flow.entry` / `commands.2.options.1.commands.0` → `guard_3`。

`q023.decision/commands.1.options.0.commands.0`：`q023.decision` / `commands.1.options.0.commands.0` → `guard_3`。

`q023.review/commands.2.options.0.commands.0`：`q023.review` / `commands.2.options.0.commands.0` → `guard_3`。

`q024.decision/commands.1.options.1.commands.0`：`q024.decision` / `commands.1.options.1.commands.0` → `guard_3`。

`q024.review/commands.2.options.1.commands.0`：`q024.review` / `commands.2.options.1.commands.0` → `guard_3`。

`q025.decision/commands.1.options.0.commands.0`：`q025.decision` / `commands.1.options.0.commands.0` → `guard_3`。

`q025.review/commands.2.options.0.commands.0`：`q025.review` / `commands.2.options.0.commands.0` → `guard_3`。

`q026.decision/commands.1.options.0.commands.2`：`q026.decision` / `commands.1.options.0.commands.2` → `guard_3`。

`q026.decision/commands.1.options.1.commands.0`：`q026.decision` / `commands.1.options.1.commands.0` → `guard_3`。

`q026.review/commands.2.options.0.commands.0`：`q026.review` / `commands.2.options.0.commands.0` → `guard_3`。

`q026.review/commands.2.options.1.commands.0`：`q026.review` / `commands.2.options.1.commands.0` → `guard_3`。

`q027.decision/commands.1.options.0.commands.0`：`q027.decision` / `commands.1.options.0.commands.0` → `guard_3`。

`q027.review/commands.2.options.0.commands.0`：`q027.review` / `commands.2.options.0.commands.0` → `guard_3`。

`q028.decision/commands.1.options.1.commands.0`：`q028.decision` / `commands.1.options.1.commands.0` → `guard_3`。

`q028.review/commands.2.options.1.commands.0`：`q028.review` / `commands.2.options.1.commands.0` → `guard_3`。

`q029.decision/commands.1.options.0.commands.0`：`q029.decision` / `commands.1.options.0.commands.0` → `guard_3`。

`q029.review/commands.2.options.0.commands.0`：`q029.review` / `commands.2.options.0.commands.0` → `guard_3`。

`q029.flow.entry/commands.2.options.2.commands.0`：`q029.flow.entry` / `commands.2.options.2.commands.0` → `guard_3`。

`q030.decision/commands.1.options.0.commands.1`：`q030.decision` / `commands.1.options.0.commands.1` → `boss_3`。

`q030.decision/commands.1.options.1.commands.0`：`q030.decision` / `commands.1.options.1.commands.0` → `boss_3`。

`q030.review/commands.2.options.0.commands.0`：`q030.review` / `commands.2.options.0.commands.0` → `boss_3`。

`q030.review/commands.2.options.1.commands.0`：`q030.review` / `commands.2.options.1.commands.0` → `boss_3`。

`q030.flow.entry/commands.2.options.2.commands.0`：`q030.flow.entry` / `commands.2.options.2.commands.0` → `boss_3`。

`q031.decision/commands.1.options.0.commands.0`：`q031.decision` / `commands.1.options.0.commands.0` → `guard_4`。

`q031.review/commands.2.options.0.commands.0`：`q031.review` / `commands.2.options.0.commands.0` → `guard_4`。

`q032.decision/commands.1.options.0.commands.2`：`q032.decision` / `commands.1.options.0.commands.2` → `guard_4`。

`q032.decision/commands.1.options.1.commands.0`：`q032.decision` / `commands.1.options.1.commands.0` → `guard_4`。

`q032.review/commands.2.options.0.commands.0`：`q032.review` / `commands.2.options.0.commands.0` → `guard_4`。

`q032.review/commands.2.options.1.commands.0`：`q032.review` / `commands.2.options.1.commands.0` → `guard_4`。

`q033.decision/commands.1.options.0.commands.0`：`q033.decision` / `commands.1.options.0.commands.0` → `guard_4`。

`q033.review/commands.2.options.0.commands.0`：`q033.review` / `commands.2.options.0.commands.0` → `guard_4`。

`q034.decision/commands.1.options.1.commands.0`：`q034.decision` / `commands.1.options.1.commands.0` → `guard_4`。

`q034.review/commands.2.options.1.commands.0`：`q034.review` / `commands.2.options.1.commands.0` → `guard_4`。

`q035.decision/commands.1.options.0.commands.0`：`q035.decision` / `commands.1.options.0.commands.0` → `guard_4`。

`q035.review/commands.2.options.0.commands.0`：`q035.review` / `commands.2.options.0.commands.0` → `guard_4`。

`q036.decision/commands.1.options.0.commands.2`：`q036.decision` / `commands.1.options.0.commands.2` → `guard_4`。

`q036.decision/commands.1.options.1.commands.0`：`q036.decision` / `commands.1.options.1.commands.0` → `guard_4`。

`q036.review/commands.2.options.0.commands.0`：`q036.review` / `commands.2.options.0.commands.0` → `guard_4`。

`q036.review/commands.2.options.1.commands.0`：`q036.review` / `commands.2.options.1.commands.0` → `guard_4`。

`q037.decision/commands.1.options.0.commands.0`：`q037.decision` / `commands.1.options.0.commands.0` → `guard_4`。

`q037.review/commands.2.options.0.commands.0`：`q037.review` / `commands.2.options.0.commands.0` → `guard_4`。

`q038.decision/commands.1.options.1.commands.0`：`q038.decision` / `commands.1.options.1.commands.0` → `guard_4`。

`q038.review/commands.2.options.1.commands.0`：`q038.review` / `commands.2.options.1.commands.0` → `guard_4`。

`q039.decision/commands.1.options.0.commands.0`：`q039.decision` / `commands.1.options.0.commands.0` → `guard_4`。

`q039.review/commands.2.options.0.commands.0`：`q039.review` / `commands.2.options.0.commands.0` → `guard_4`。

`q040.decision/commands.1.options.0.commands.1`：`q040.decision` / `commands.1.options.0.commands.1` → `boss_4`。

`q040.decision/commands.1.options.1.commands.0`：`q040.decision` / `commands.1.options.1.commands.0` → `boss_4`。

`q040.review/commands.2.options.0.commands.0`：`q040.review` / `commands.2.options.0.commands.0` → `boss_4`。

`q040.review/commands.2.options.1.commands.0`：`q040.review` / `commands.2.options.1.commands.0` → `boss_4`。

`q040.flow.entry/commands.2.options.1.commands.0`：`q040.flow.entry` / `commands.2.options.1.commands.0` → `boss_4`。

`q040.flow.witness/commands.2.options.1.commands.0`：`q040.flow.witness` / `commands.2.options.1.commands.0` → `boss_4`。

`q040.flow.shadow/commands.2.options.0.commands.0`：`q040.flow.shadow` / `commands.2.options.0.commands.0` → `boss_4`。

`q041.decision/commands.1.options.0.commands.0`：`q041.decision` / `commands.1.options.0.commands.0` → `guard_5`。

`q041.review/commands.2.options.0.commands.0`：`q041.review` / `commands.2.options.0.commands.0` → `guard_5`。

`q042.decision/commands.1.options.0.commands.2`：`q042.decision` / `commands.1.options.0.commands.2` → `guard_5`。

`q042.decision/commands.1.options.1.commands.0`：`q042.decision` / `commands.1.options.1.commands.0` → `guard_5`。

`q042.review/commands.2.options.0.commands.0`：`q042.review` / `commands.2.options.0.commands.0` → `guard_5`。

`q042.review/commands.2.options.1.commands.0`：`q042.review` / `commands.2.options.1.commands.0` → `guard_5`。

`q043.decision/commands.1.options.0.commands.0`：`q043.decision` / `commands.1.options.0.commands.0` → `guard_5`。

`q043.review/commands.2.options.0.commands.0`：`q043.review` / `commands.2.options.0.commands.0` → `guard_5`。

`q044.decision/commands.1.options.1.commands.0`：`q044.decision` / `commands.1.options.1.commands.0` → `guard_5`。

`q044.review/commands.2.options.1.commands.0`：`q044.review` / `commands.2.options.1.commands.0` → `guard_5`。

`q045.decision/commands.1.options.0.commands.0`：`q045.decision` / `commands.1.options.0.commands.0` → `guard_5`。

`q045.review/commands.2.options.0.commands.0`：`q045.review` / `commands.2.options.0.commands.0` → `guard_5`。

`q046.decision/commands.1.options.0.commands.2`：`q046.decision` / `commands.1.options.0.commands.2` → `guard_5`。

`q046.decision/commands.1.options.1.commands.0`：`q046.decision` / `commands.1.options.1.commands.0` → `guard_5`。

`q046.review/commands.2.options.0.commands.0`：`q046.review` / `commands.2.options.0.commands.0` → `guard_5`。

`q046.review/commands.2.options.1.commands.0`：`q046.review` / `commands.2.options.1.commands.0` → `guard_5`。

`q047.decision/commands.1.options.0.commands.0`：`q047.decision` / `commands.1.options.0.commands.0` → `guard_5`。

`q047.review/commands.2.options.0.commands.0`：`q047.review` / `commands.2.options.0.commands.0` → `guard_5`。

`q048.decision/commands.1.options.1.commands.0`：`q048.decision` / `commands.1.options.1.commands.0` → `guard_5`。

`q048.review/commands.2.options.1.commands.0`：`q048.review` / `commands.2.options.1.commands.0` → `guard_5`。

`q049.decision/commands.1.options.0.commands.0`：`q049.decision` / `commands.1.options.0.commands.0` → `guard_5`。

`q049.review/commands.2.options.0.commands.0`：`q049.review` / `commands.2.options.0.commands.0` → `guard_5`。

`q050.decision/commands.1.options.0.commands.1`：`q050.decision` / `commands.1.options.0.commands.1` → `boss_5`。

`q050.decision/commands.1.options.1.commands.0`：`q050.decision` / `commands.1.options.1.commands.0` → `boss_5`。

`q050.review/commands.2.options.0.commands.0`：`q050.review` / `commands.2.options.0.commands.0` → `boss_5`。

`q050.review/commands.2.options.1.commands.0`：`q050.review` / `commands.2.options.1.commands.0` → `boss_5`。

`q051.decision/commands.1.options.0.commands.0`：`q051.decision` / `commands.1.options.0.commands.0` → `guard_6`。

`q051.review/commands.2.options.0.commands.0`：`q051.review` / `commands.2.options.0.commands.0` → `guard_6`。

`q052.decision/commands.1.options.0.commands.2`：`q052.decision` / `commands.1.options.0.commands.2` → `guard_6`。

`q052.decision/commands.1.options.1.commands.0`：`q052.decision` / `commands.1.options.1.commands.0` → `guard_6`。

`q052.review/commands.2.options.0.commands.0`：`q052.review` / `commands.2.options.0.commands.0` → `guard_6`。

`q052.review/commands.2.options.1.commands.0`：`q052.review` / `commands.2.options.1.commands.0` → `guard_6`。

`q053.decision/commands.1.options.0.commands.0`：`q053.decision` / `commands.1.options.0.commands.0` → `guard_6`。

`q053.review/commands.2.options.0.commands.0`：`q053.review` / `commands.2.options.0.commands.0` → `guard_6`。

`q054.decision/commands.1.options.1.commands.0`：`q054.decision` / `commands.1.options.1.commands.0` → `guard_6`。

`q054.review/commands.2.options.1.commands.0`：`q054.review` / `commands.2.options.1.commands.0` → `guard_6`。

`q055.decision/commands.1.options.0.commands.0`：`q055.decision` / `commands.1.options.0.commands.0` → `guard_6`。

`q055.review/commands.2.options.0.commands.0`：`q055.review` / `commands.2.options.0.commands.0` → `guard_6`。

`q056.decision/commands.1.options.0.commands.2`：`q056.decision` / `commands.1.options.0.commands.2` → `guard_6`。

`q056.decision/commands.1.options.1.commands.0`：`q056.decision` / `commands.1.options.1.commands.0` → `guard_6`。

`q056.review/commands.2.options.0.commands.0`：`q056.review` / `commands.2.options.0.commands.0` → `guard_6`。

`q056.review/commands.2.options.1.commands.0`：`q056.review` / `commands.2.options.1.commands.0` → `guard_6`。

`q057.decision/commands.1.options.0.commands.0`：`q057.decision` / `commands.1.options.0.commands.0` → `guard_6`。

`q057.review/commands.2.options.0.commands.0`：`q057.review` / `commands.2.options.0.commands.0` → `guard_6`。

`q058.decision/commands.1.options.1.commands.0`：`q058.decision` / `commands.1.options.1.commands.0` → `guard_6`。

`q058.review/commands.2.options.1.commands.0`：`q058.review` / `commands.2.options.1.commands.0` → `guard_6`。

`q059.decision/commands.1.options.0.commands.0`：`q059.decision` / `commands.1.options.0.commands.0` → `guard_6`。

`q059.review/commands.2.options.0.commands.0`：`q059.review` / `commands.2.options.0.commands.0` → `guard_6`。

`q059.flow.entry/commands.2.options.1.commands.0`：`q059.flow.entry` / `commands.2.options.1.commands.0` → `guard_6`。

`q060.decision/commands.1.options.0.commands.1`：`q060.decision` / `commands.1.options.0.commands.1` → `boss_6`。

`q060.decision/commands.1.options.1.commands.0`：`q060.decision` / `commands.1.options.1.commands.0` → `boss_6`。

`q060.review/commands.2.options.0.commands.0`：`q060.review` / `commands.2.options.0.commands.0` → `boss_6`。

`q060.review/commands.2.options.1.commands.0`：`q060.review` / `commands.2.options.1.commands.0` → `boss_6`。

`q060.flow.entry/commands.2.options.1.commands.0`：`q060.flow.entry` / `commands.2.options.1.commands.0` → `boss_6`。

`q061.decision/commands.1.options.0.commands.0`：`q061.decision` / `commands.1.options.0.commands.0` → `guard_7`。

`q061.review/commands.2.options.0.commands.0`：`q061.review` / `commands.2.options.0.commands.0` → `guard_7`。

`q062.decision/commands.1.options.0.commands.2`：`q062.decision` / `commands.1.options.0.commands.2` → `guard_7`。

`q062.decision/commands.1.options.1.commands.0`：`q062.decision` / `commands.1.options.1.commands.0` → `guard_7`。

`q062.review/commands.2.options.0.commands.0`：`q062.review` / `commands.2.options.0.commands.0` → `guard_7`。

`q062.review/commands.2.options.1.commands.0`：`q062.review` / `commands.2.options.1.commands.0` → `guard_7`。

`q063.decision/commands.1.options.0.commands.0`：`q063.decision` / `commands.1.options.0.commands.0` → `guard_7`。

`q063.review/commands.2.options.0.commands.0`：`q063.review` / `commands.2.options.0.commands.0` → `guard_7`。

`q064.decision/commands.1.options.1.commands.0`：`q064.decision` / `commands.1.options.1.commands.0` → `guard_7`。

`q064.review/commands.2.options.1.commands.0`：`q064.review` / `commands.2.options.1.commands.0` → `guard_7`。

`q065.decision/commands.1.options.0.commands.0`：`q065.decision` / `commands.1.options.0.commands.0` → `guard_7`。

`q065.review/commands.2.options.0.commands.0`：`q065.review` / `commands.2.options.0.commands.0` → `guard_7`。

`q066.decision/commands.1.options.0.commands.2`：`q066.decision` / `commands.1.options.0.commands.2` → `guard_7`。

`q066.decision/commands.1.options.1.commands.0`：`q066.decision` / `commands.1.options.1.commands.0` → `guard_7`。

`q066.review/commands.2.options.0.commands.0`：`q066.review` / `commands.2.options.0.commands.0` → `guard_7`。

`q066.review/commands.2.options.1.commands.0`：`q066.review` / `commands.2.options.1.commands.0` → `guard_7`。

`q067.decision/commands.1.options.0.commands.0`：`q067.decision` / `commands.1.options.0.commands.0` → `guard_7`。

`q067.review/commands.2.options.0.commands.0`：`q067.review` / `commands.2.options.0.commands.0` → `guard_7`。

`q068.decision/commands.1.options.1.commands.0`：`q068.decision` / `commands.1.options.1.commands.0` → `guard_7`。

`q068.review/commands.2.options.1.commands.0`：`q068.review` / `commands.2.options.1.commands.0` → `guard_7`。

`q069.decision/commands.1.options.0.commands.0`：`q069.decision` / `commands.1.options.0.commands.0` → `guard_7`。

`q069.review/commands.2.options.0.commands.0`：`q069.review` / `commands.2.options.0.commands.0` → `guard_7`。

`q069.flow.entry/commands.2.options.2.commands.0`：`q069.flow.entry` / `commands.2.options.2.commands.0` → `guard_7`。

`q070.decision/commands.1.options.0.commands.1`：`q070.decision` / `commands.1.options.0.commands.1` → `boss_7`。

`q070.decision/commands.1.options.1.commands.0`：`q070.decision` / `commands.1.options.1.commands.0` → `boss_7`。

`q070.review/commands.2.options.0.commands.0`：`q070.review` / `commands.2.options.0.commands.0` → `boss_7`。

`q070.review/commands.2.options.1.commands.0`：`q070.review` / `commands.2.options.1.commands.0` → `boss_7`。

`q070.flow.entry/commands.2.options.1.commands.0`：`q070.flow.entry` / `commands.2.options.1.commands.0` → `boss_7`。

`q071.decision/commands.1.options.0.commands.0`：`q071.decision` / `commands.1.options.0.commands.0` → `guard_8`。

`q071.review/commands.2.options.0.commands.0`：`q071.review` / `commands.2.options.0.commands.0` → `guard_8`。

`q071.flow.entry/commands.2.options.2.commands.0`：`q071.flow.entry` / `commands.2.options.2.commands.0` → `guard_8`。

`q072.decision/commands.1.options.0.commands.2`：`q072.decision` / `commands.1.options.0.commands.2` → `guard_8`。

`q072.decision/commands.1.options.1.commands.0`：`q072.decision` / `commands.1.options.1.commands.0` → `guard_8`。

`q072.review/commands.2.options.0.commands.0`：`q072.review` / `commands.2.options.0.commands.0` → `guard_8`。

`q072.review/commands.2.options.1.commands.0`：`q072.review` / `commands.2.options.1.commands.0` → `guard_8`。

`q073.decision/commands.1.options.0.commands.0`：`q073.decision` / `commands.1.options.0.commands.0` → `guard_8`。

`q073.review/commands.2.options.0.commands.0`：`q073.review` / `commands.2.options.0.commands.0` → `guard_8`。

`q074.decision/commands.1.options.1.commands.0`：`q074.decision` / `commands.1.options.1.commands.0` → `guard_8`。

`q074.review/commands.2.options.1.commands.0`：`q074.review` / `commands.2.options.1.commands.0` → `guard_8`。

`q074.flow.entry/commands.2.options.2.commands.0`：`q074.flow.entry` / `commands.2.options.2.commands.0` → `guard_8`。

`q075.decision/commands.1.options.0.commands.0`：`q075.decision` / `commands.1.options.0.commands.0` → `guard_8`。

`q075.review/commands.2.options.0.commands.0`：`q075.review` / `commands.2.options.0.commands.0` → `guard_8`。

`q075.flow.entry/commands.2.options.2.commands.0`：`q075.flow.entry` / `commands.2.options.2.commands.0` → `guard_8`。

`q076.decision/commands.1.options.0.commands.2`：`q076.decision` / `commands.1.options.0.commands.2` → `guard_8`。

`q076.decision/commands.1.options.1.commands.0`：`q076.decision` / `commands.1.options.1.commands.0` → `guard_8`。

`q076.review/commands.2.options.0.commands.0`：`q076.review` / `commands.2.options.0.commands.0` → `guard_8`。

`q076.review/commands.2.options.1.commands.0`：`q076.review` / `commands.2.options.1.commands.0` → `guard_8`。

`q077.decision/commands.1.options.0.commands.0`：`q077.decision` / `commands.1.options.0.commands.0` → `guard_8`。

`q077.review/commands.2.options.0.commands.0`：`q077.review` / `commands.2.options.0.commands.0` → `guard_8`。

`q078.decision/commands.1.options.1.commands.0`：`q078.decision` / `commands.1.options.1.commands.0` → `guard_8`。

`q078.review/commands.2.options.1.commands.0`：`q078.review` / `commands.2.options.1.commands.0` → `guard_8`。

`q079.decision/commands.1.options.0.commands.0`：`q079.decision` / `commands.1.options.0.commands.0` → `guard_8`。

`q079.review/commands.2.options.0.commands.0`：`q079.review` / `commands.2.options.0.commands.0` → `guard_8`。

`q079.flow.entry/commands.2.options.2.commands.0`：`q079.flow.entry` / `commands.2.options.2.commands.0` → `guard_8`。

`q080.decision/commands.1.options.0.commands.1`：`q080.decision` / `commands.1.options.0.commands.1` → `boss_8`。

`q080.decision/commands.1.options.1.commands.0`：`q080.decision` / `commands.1.options.1.commands.0` → `boss_8`。

`q080.review/commands.2.options.0.commands.0`：`q080.review` / `commands.2.options.0.commands.0` → `boss_8`。

`q080.review/commands.2.options.1.commands.0`：`q080.review` / `commands.2.options.1.commands.0` → `boss_8`。

`q080.flow.entry/commands.2.options.1.commands.0`：`q080.flow.entry` / `commands.2.options.1.commands.0` → `boss_8`。

`q081.decision/commands.1.options.0.commands.0`：`q081.decision` / `commands.1.options.0.commands.0` → `guard_9`。

`q081.review/commands.2.options.0.commands.0`：`q081.review` / `commands.2.options.0.commands.0` → `guard_9`。

`q082.decision/commands.1.options.0.commands.2`：`q082.decision` / `commands.1.options.0.commands.2` → `guard_9`。

`q082.decision/commands.1.options.1.commands.0`：`q082.decision` / `commands.1.options.1.commands.0` → `guard_9`。

`q082.review/commands.2.options.0.commands.0`：`q082.review` / `commands.2.options.0.commands.0` → `guard_9`。

`q082.review/commands.2.options.1.commands.0`：`q082.review` / `commands.2.options.1.commands.0` → `guard_9`。

`q083.decision/commands.1.options.0.commands.0`：`q083.decision` / `commands.1.options.0.commands.0` → `guard_9`。

`q083.review/commands.2.options.0.commands.0`：`q083.review` / `commands.2.options.0.commands.0` → `guard_9`。

`q084.decision/commands.1.options.1.commands.0`：`q084.decision` / `commands.1.options.1.commands.0` → `guard_9`。

`q084.review/commands.2.options.1.commands.0`：`q084.review` / `commands.2.options.1.commands.0` → `guard_9`。

`q085.decision/commands.1.options.0.commands.0`：`q085.decision` / `commands.1.options.0.commands.0` → `guard_9`。

`q085.review/commands.2.options.0.commands.0`：`q085.review` / `commands.2.options.0.commands.0` → `guard_9`。

`q086.decision/commands.1.options.0.commands.2`：`q086.decision` / `commands.1.options.0.commands.2` → `guard_9`。

`q086.decision/commands.1.options.1.commands.0`：`q086.decision` / `commands.1.options.1.commands.0` → `guard_9`。

`q086.review/commands.2.options.0.commands.0`：`q086.review` / `commands.2.options.0.commands.0` → `guard_9`。

`q086.review/commands.2.options.1.commands.0`：`q086.review` / `commands.2.options.1.commands.0` → `guard_9`。

`q087.decision/commands.1.options.0.commands.0`：`q087.decision` / `commands.1.options.0.commands.0` → `guard_9`。

`q087.review/commands.2.options.0.commands.0`：`q087.review` / `commands.2.options.0.commands.0` → `guard_9`。

`q088.decision/commands.1.options.1.commands.0`：`q088.decision` / `commands.1.options.1.commands.0` → `guard_9`。

`q088.review/commands.2.options.1.commands.0`：`q088.review` / `commands.2.options.1.commands.0` → `guard_9`。

`q089.decision/commands.1.options.0.commands.0`：`q089.decision` / `commands.1.options.0.commands.0` → `guard_9`。

`q089.review/commands.2.options.0.commands.0`：`q089.review` / `commands.2.options.0.commands.0` → `guard_9`。

`q090.decision/commands.1.options.0.commands.1`：`q090.decision` / `commands.1.options.0.commands.1` → `boss_9`。

`q090.decision/commands.1.options.1.commands.0`：`q090.decision` / `commands.1.options.1.commands.0` → `boss_9`。

`q090.review/commands.2.options.0.commands.0`：`q090.review` / `commands.2.options.0.commands.0` → `boss_9`。

`q090.review/commands.2.options.1.commands.0`：`q090.review` / `commands.2.options.1.commands.0` → `boss_9`。

`q090.flow.entry/commands.2.options.1.commands.0`：`q090.flow.entry` / `commands.2.options.1.commands.0` → `boss_9`。

`q091.decision/commands.1.options.0.commands.0`：`q091.decision` / `commands.1.options.0.commands.0` → `guard_10`。

`q091.review/commands.2.options.0.commands.0`：`q091.review` / `commands.2.options.0.commands.0` → `guard_10`。

`q092.decision/commands.1.options.0.commands.2`：`q092.decision` / `commands.1.options.0.commands.2` → `guard_10`。

`q092.decision/commands.1.options.1.commands.0`：`q092.decision` / `commands.1.options.1.commands.0` → `guard_10`。

`q092.review/commands.2.options.0.commands.0`：`q092.review` / `commands.2.options.0.commands.0` → `guard_10`。

`q092.review/commands.2.options.1.commands.0`：`q092.review` / `commands.2.options.1.commands.0` → `guard_10`。

`q092.flow.entry/commands.2.options.2.commands.0`：`q092.flow.entry` / `commands.2.options.2.commands.0` → `guard_10`。

`q093.decision/commands.1.options.0.commands.0`：`q093.decision` / `commands.1.options.0.commands.0` → `guard_10`。

`q093.review/commands.2.options.0.commands.0`：`q093.review` / `commands.2.options.0.commands.0` → `guard_10`。

`q094.decision/commands.1.options.1.commands.0`：`q094.decision` / `commands.1.options.1.commands.0` → `guard_10`。

`q094.review/commands.2.options.1.commands.0`：`q094.review` / `commands.2.options.1.commands.0` → `guard_10`。

`q094.flow.entry/commands.2.options.2.commands.0`：`q094.flow.entry` / `commands.2.options.2.commands.0` → `guard_10`。

`q095.decision/commands.1.options.0.commands.0`：`q095.decision` / `commands.1.options.0.commands.0` → `guard_10`。

`q095.review/commands.2.options.0.commands.0`：`q095.review` / `commands.2.options.0.commands.0` → `guard_10`。

`q096.decision/commands.1.options.0.commands.2`：`q096.decision` / `commands.1.options.0.commands.2` → `guard_10`。

`q096.decision/commands.1.options.1.commands.0`：`q096.decision` / `commands.1.options.1.commands.0` → `guard_10`。

`q096.review/commands.2.options.0.commands.0`：`q096.review` / `commands.2.options.0.commands.0` → `guard_10`。

`q096.review/commands.2.options.1.commands.0`：`q096.review` / `commands.2.options.1.commands.0` → `guard_10`。

`q097.decision/commands.1.options.0.commands.0`：`q097.decision` / `commands.1.options.0.commands.0` → `guard_10`。

`q097.review/commands.2.options.0.commands.0`：`q097.review` / `commands.2.options.0.commands.0` → `guard_10`。

`q098.decision/commands.1.options.1.commands.0`：`q098.decision` / `commands.1.options.1.commands.0` → `guard_10`。

`q098.review/commands.2.options.1.commands.0`：`q098.review` / `commands.2.options.1.commands.0` → `guard_10`。

`q098.flow.entry/commands.2.options.2.commands.0`：`q098.flow.entry` / `commands.2.options.2.commands.0` → `guard_10`。

`q099.decision/commands.1.options.0.commands.0`：`q099.decision` / `commands.1.options.0.commands.0` → `guard_10`。

`q099.review/commands.2.options.0.commands.0`：`q099.review` / `commands.2.options.0.commands.0` → `guard_10`。

`q099.flow.entry/commands.2.options.2.commands.0`：`q099.flow.entry` / `commands.2.options.2.commands.0` → `guard_10`。

`q100.decision/commands.1.options.0.commands.1`：`q100.decision` / `commands.1.options.0.commands.1` → `boss_10`。

`q100.decision/commands.1.options.1.commands.0`：`q100.decision` / `commands.1.options.1.commands.0` → `boss_10`。

`q100.review/commands.2.options.0.commands.0`：`q100.review` / `commands.2.options.0.commands.0` → `boss_10`。

`q100.review/commands.2.options.1.commands.0`：`q100.review` / `commands.2.options.1.commands.0` → `boss_10`。

`q100.flow.entry/commands.2.options.1.commands.0`：`q100.flow.entry` / `commands.2.options.1.commands.0` → `boss_10`。

`q111.scene.entry/commands.2.options.0.commands.0`：`q111.scene.entry` / `commands.2.options.0.commands.0` → `guard_2`。

`q112.scene.entry/commands.2.options.0.commands.0`：`q112.scene.entry` / `commands.2.options.0.commands.0` → `guard_2`。

`q119.scene.guard/commands.2.options.0.commands.0`：`q119.scene.guard` / `commands.2.options.0.commands.0` → `guard_2`。

`q121.scene.talk/commands.2.options.0.commands.0`：`q121.scene.talk` / `commands.2.options.0.commands.0` → `story_121`。

`q121.scene.talk/commands.2.options.1.commands.0`：`q121.scene.talk` / `commands.2.options.1.commands.0` → `story_121`。

`q122.scene.nest/commands.2.options.0.commands.0`：`q122.scene.nest` / `commands.2.options.0.commands.0` → `story_122`。

`q123.scene.gate/commands.2.options.1.commands.0`：`q123.scene.gate` / `commands.2.options.1.commands.0` → `story_123`。

`q125.scene.entry/commands.2.options.2.commands.0`：`q125.scene.entry` / `commands.2.options.2.commands.0` → `story_125`。

`q125.scene.entry/commands.2.options.3.commands.0`：`q125.scene.entry` / `commands.2.options.3.commands.0` → `story_125`。

`q125.flow.entry/commands.2.options.1.commands.0`：`q125.flow.entry` / `commands.2.options.1.commands.0` → `story_125`。

`q125.flow.after/commands.2.options.1.commands.0`：`q125.flow.after` / `commands.2.options.1.commands.0` → `story_125`。

`q125.flow.village/commands.2.options.1.commands.0`：`q125.flow.village` / `commands.2.options.1.commands.0` → `story_125`。

`q126.scene.entry/commands.2.options.2.commands.0`：`q126.scene.entry` / `commands.2.options.2.commands.0` → `story_125`。

`q126.flow.entry/commands.2.options.1.commands.0`：`q126.flow.entry` / `commands.2.options.1.commands.0` → `story_125`。

`q127.scene.entry/commands.2.options.0.commands.0`：`q127.scene.entry` / `commands.2.options.0.commands.0` → `story_127`。

`q127.scene.terms/commands.2.options.2.commands.0`：`q127.scene.terms` / `commands.2.options.2.commands.0` → `story_127`。

`q128.scene.entry/commands.2.options.1.commands.0`：`q128.scene.entry` / `commands.2.options.1.commands.0` → `story_128`。

`q128.scene.test/commands.2.options.2.commands.0`：`q128.scene.test` / `commands.2.options.2.commands.0` → `story_128`。

`q129.scene.plan/commands.2.options.0.commands.0`：`q129.scene.plan` / `commands.2.options.0.commands.0` → `story_129`。

`q129.scene.plan/commands.2.options.1.commands.0`：`q129.scene.plan` / `commands.2.options.1.commands.0` → `story_129`。

`q130.scene.entry/commands.2.options.0.commands.0`：`q130.scene.entry` / `commands.2.options.0.commands.0` → `story_130`。

`q130.scene.crown/commands.2.options.1.commands.0`：`q130.scene.crown` / `commands.2.options.1.commands.0` → `story_130`。

`q132.scene.entry/commands.2.options.0.commands.0`：`q132.scene.entry` / `commands.2.options.0.commands.0` → `story_132`。

`q132.scene.test/commands.2.options.1.commands.0`：`q132.scene.test` / `commands.2.options.1.commands.0` → `story_132`。

`q132.scene.isolate/commands.2.options.1.commands.0`：`q132.scene.isolate` / `commands.2.options.1.commands.0` → `story_132`。

`q134.scene.entry/commands.2.options.1.commands.0`：`q134.scene.entry` / `commands.2.options.1.commands.0` → `guard_4`。

`q136.scene.entry/commands.2.options.3.commands.0`：`q136.scene.entry` / `commands.2.options.3.commands.0` → `guard_4`。

`q151.scene.danger/commands.2.options.1.commands.0`：`q151.scene.danger` / `commands.2.options.1.commands.0` → `guard_6`。

`q152.scene.decoy/commands.2.options.1.commands.0`：`q152.scene.decoy` / `commands.2.options.1.commands.0` → `guard_6`。

`q154.scene.keeper/commands.2.options.0.commands.0`：`q154.scene.keeper` / `commands.2.options.0.commands.0` → `guard_6`。

`q155.scene.entry/commands.2.options.0.commands.0`：`q155.scene.entry` / `commands.2.options.0.commands.0` → `guard_6`。

`q166.scene.trial/commands.2.options.0.commands.0`：`q166.scene.trial` / `commands.2.options.0.commands.0` → `story_166`。

`q167.scene.entry/commands.2.options.2.commands.0`：`q167.scene.entry` / `commands.2.options.2.commands.0` → `guard_7`。

`q171.scene.watch/commands.2.options.5.commands.0`：`q171.scene.watch` / `commands.2.options.5.commands.0` → `story_171`。

`q172.scene.well/commands.2.options.2.commands.0`：`q172.scene.well` / `commands.2.options.2.commands.0` → `guard_8`。

`q175.scene.entry/commands.2.options.0.commands.0`：`q175.scene.entry` / `commands.2.options.0.commands.0` → `story_175`。

`q175.scene.entry/commands.2.options.2.commands.0`：`q175.scene.entry` / `commands.2.options.2.commands.0` → `boss_8`。

`q175.flow.entry/commands.2.options.2.commands.0`：`q175.flow.entry` / `commands.2.options.2.commands.0` → `boss_8`。

`q175.flow.hidden/commands.2.options.0.commands.0`：`q175.flow.hidden` / `commands.2.options.0.commands.0` → `story_175`。

`q175.flow.warning/commands.2.options.1.commands.0`：`q175.flow.warning` / `commands.2.options.1.commands.0` → `story_175`。

`q185.scene.entry/commands.2.options.0.commands.0`：`q185.scene.entry` / `commands.2.options.0.commands.0` → `guard_9`。

`q186.scene.entry/commands.2.options.2.commands.0`：`q186.scene.entry` / `commands.2.options.2.commands.0` → `guard_9`。

`q187.scene.entry/commands.2.options.0.commands.0`：`q187.scene.entry` / `commands.2.options.0.commands.0` → `guard_9`。

`q190.scene.entry/commands.2.options.0.commands.0`：`q190.scene.entry` / `commands.2.options.0.commands.0` → `story_190`。

`q191.scene.entry/commands.2.options.1.commands.0`：`q191.scene.entry` / `commands.2.options.1.commands.0` → `guard_10`。

`q193.scene.consent/commands.2.options.1.commands.0`：`q193.scene.consent` / `commands.2.options.1.commands.0` → `guard_10`。

## 再生成

`npm run build:catalog` または `npm run build:docs` で更新する。`npm run check:docs` が配布データとの差異を検出する。
