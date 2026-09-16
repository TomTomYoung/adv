# ダンジョン素材と現地調査シナリオ

実装対象は、13ダンジョンの壁面・装置素材と、それぞれの仕掛けを観察する現地調査の場面です。操作によって変わった実際の環境を読み、関連する依頼の手帳に記録します。

## 素材

壁面と装置を、それぞれ4列×4行の画像にまとめます。先頭13区画がダンジョン一覧の順番に対応します。壁面の残り3区画は火床・開花した壁・観測環、装置の残り3区画は根橋・荊・昇降蔦です。画像の分割は表示時に行います。区画境界の線を除くため、正規化した矩形で内側を参照します。実際の画像は1254×1254、WebP圧縮後の2枚合計は約535KiBです。

壁面は探索・戦闘中の通路へ、装置は探索パネル・調査場面へ、壁面の見本は行先一覧へ表示します。英語の生成プロンプト、日本語訳、画像のハッシュを assets/source/dungeons に保持します。

## 現地調査

調査地点で関連する依頼を受注済みの場合、探索画面から現地調査を開けます。場面は現在の永続状態・今回の探索状態・現在地を読み、観察できた事実と、まだ確認できない事項を区別して表示します。記録はプレイヤーが選択したときに残します。装置の操作は探索画面の通常操作を使い、その後に再調査できます。

記録は flags.dungeonNotes に保存し、依頼一覧と手帳から再読できます。記録時点の観察なので、退場や装置の再操作で環境が変わっても消えません。再調査の本文は現在の状態から再判定します。

この段階の調査記録は、依頼に付随する現地の観察です。既存の証拠欄・結末条件へ自動加算しません。たとえば水路の水門を閉じた事実だけで、q010の住民避難や水門の安全検査を完了したことにはしません。

## 編集と互換性

素材の正本は authoring/dungeon-art.json、調査を含むクエストイベントの正本は authoring/quests/qXXX.events.json です。対応するクエストJSONへ集約し、ダンジョンからクエストへの逆参照は行いません。編集後は npm run build:dungeons を実行します。[イベントの仕様](QUEST_EVENTS.md)を参照してください。

既存のスクリプト配列は保持し、追加場面は dungeon.scene.* の独立したIDを使います。会話構造を変更する場合は新しい版のIDを追加し、旧スクリプトもクエスト原稿に残してください。保存領域は既存の flags を使い、旧セーブの会話位置や仕掛けの保存形式を変更しません。調査中の保存・再開にも通常の会話機構を使用します。

## 対応一覧

具体的な調査地点・関連依頼・観察条件は実装用JSONから本書の後半へ生成します。編集補助用スキーマは data/schemas/quest-events.schema.json です。

## 表示契約

dungeon.wall と各装置の art は画像URLと正規化した切り出し矩形のみを持ちます。dungeon.scenes に現地調査パネルを追加し、既存の dungeon.systems は仕掛けの一覧として維持します。quest.fieldLinks が調査先、quest.fieldNotes と fieldNotes が記録済みの観察、dialog.fieldScene が調査中の画像・見出しを供給します。画像取得に失敗した際は通路の単色表示と従来の文字記号で操作を継続できます。

## 検証

追加の16テストは、全13ダンジョンの観察成立、未達成時の分岐、調査中の保存・復元、記録の重複防止、帰還後の保持、原稿改版後の旧会話継続、素材のハッシュと切り出し参照を確認します。既存の412テストと合わせた全428テストが成功しました。build:jobs とスキーマの再生成後、data 以下262ファイルのハッシュ一致も確認しています。地下水道・庭園・観測所は実際の描画関数をCanvasへ出力し、壁面と装置の表示を確認しました。ブラウザの実画面での確認は未実施です。

## 床材の割り当て

1.8.0の描画修正で床材の参照を追加しました。authoring/dungeon-art.jsonのfloorを全体の既定値とし、entriesごとのfloorで上書きできます。art.floorは既存の画像IDと正規化した切り出し矩形です。現在は壁アトラスの石材部分を使います。旧素材のファイルは変更していません。水面のマーカーには装置画像を付けず、水深に応じて床へ色と波を重ねます。詳細は[DUNGEON_RENDER_REVIEW.md](DUNGEON_RENDER_REVIEW.md)を参照してください。

<!-- generated:quest-observations -->

### 篝火の迷宮 / 灯を受け渡す準備

正本: [q001](../data/quests/q001.json) の events.kagaribi。調査地点: kagaribi_f1 (1, 1)。

篝火の迷宮で携帯松明の点火を確認した。固定の篝火と携帯燃料を分けて管理する。灯番の所在は引き続き地下水道で調べる。

記録の表示条件: `{"op":"eq","left":{"ref":"flags.dungeonNotes.kagaribi"},"right":true}`。本文・観察条件・選択肢は同じJSONの `dungeon.scene.kagaribi.v1`。

### 灯守の地下水道 / 排水された横道

正本: [q010](../data/quests/q010.json) の events.region_1。調査地点: region_1_f1 (2, 1)。

上層水門を閉じた際、接続する横道が排水されることを確認した。住民の人数確認・縦坑の安全検査・避難は水門番と別途進める。

記録の表示条件: `{"op":"eq","left":{"ref":"flags.dungeonNotes.region_1"},"right":true}`。本文・観察条件・選択肢は同じJSONの `dungeon.scene.region_1.v1`。

### 塩哭きの廃坑 / 塩壁の向こうの退路

正本: [q011](../data/quests/q011.json) の events.region_2。調査地点: region_2_f1 (5, 1)。

入口脇の塩壁を除いた通路を確認した。白い人型の標識を壊した記録ではなく、別地点の退路の記録である。

記録の表示条件: `{"op":"eq","left":{"ref":"flags.dungeonNotes.region_2"},"right":true}`。本文・観察条件・選択肢は同じJSONの `dungeon.scene.region_2.v1`。

### 根喰みの地下庭園 / 根が支える橋

正本: [q030](../data/quests/q030.json) の events.region_3。調査地点: region_3_f1 (1, 3)。

第1層の根橋草が亀裂を渡すまで育ったことを確認した。採取すれば通路も戻る。大根を通した場合の天井の強度は、別の調査が必要だ。

記録の表示条件: `{"op":"eq","left":{"ref":"flags.dungeonNotes.region_3"},"right":true}`。本文・観察条件・選択肢は同じJSONの `dungeon.scene.region_3.v1`。

### 鏡沈みの礼拝堂 / 仮面を運ぶ鏡路

正本: [q039](../data/quests/q039.json) の events.region_4。調査地点: region_4_f1 (1, 2) / region_4_f2 (13, 5)。

鏡を経由する転移を確認した。仮面の移動を調べる際は、歩行経路と鏡の接続先を照合する。所有者や運搬者の特定は証言から行う。

記録の表示条件: `{"op":"eq","left":{"ref":"flags.dungeonNotes.region_4"},"right":true}`。本文・観察条件・選択肢は同じJSONの `dungeon.scene.region_4.v1`。

### 灰時計の書庫 / 閉じた頁と開いた通路

正本: [q049](../data/quests/q049.json) の events.region_5。調査地点: region_5_f1 (1, 2)。

借りた知識で第1層の封印通路を開く手順を確認した。貸出による技の封印と、栞がどの頁を封じたかの調査を分けて記す。

記録の表示条件: `{"op":"eq","left":{"ref":"flags.dungeonNotes.region_5"},"right":true}`。本文・観察条件・選択肢は同じJSONの `dungeon.scene.region_5.v1`。

### 眠れる地下市場 / 通行を約束する相手

正本: [q060](../data/quests/q060.json) の events.region_6。調査地点: region_6_f1 (1, 2)。

入口側の通行取引が成立し、横道が開くことを確認した。この通行権と、市場全体を守る共同保証は別の約束として扱う。

記録の表示条件: `{"op":"eq","left":{"ref":"flags.dungeonNotes.region_6"},"right":true}`。本文・観察条件・選択肢は同じJSONの `dungeon.scene.region_6.v1`。

### 黒潮の沈没城 / 一つだけ浮かぶ区画

正本: [q070](../data/quests/q070.json) の events.region_7。調査地点: region_7_f1 (1, 2)。

第1層の浮上装置1で小区画を浮かせ、空気溜まりと横道ができることを確認した。城の浮上方針を相談するための現地記録として残す。

記録の表示条件: `{"op":"eq","left":{"ref":"flags.dungeonNotes.region_7"},"right":true}`。本文・観察条件・選択肢は同じJSONの `dungeon.scene.region_7.v1`。

### 鉄胎の機関廟 / 動力の届く範囲

正本: [q080](../data/quests/q080.json) の events.region_8。調査地点: region_8_f1 (1, 2)。

門扉系統への通電を確認した。動力を分配する操作と、中枢の命令を承認する署名は異なる手続きとして調べる。

記録の表示条件: `{"op":"eq","left":{"ref":"flags.dungeonNotes.region_8"},"right":true}`。本文・観察条件・選択肢は同じJSONの `dungeon.scene.region_8.v1`。

### 星欠けの地下観測所 / 観測のための足場

正本: [q090](../data/quests/q090.json) の events.region_9。調査地点: region_9_f1 (1, 2)。

天球儀の操作によって通路の配置が変わることを確認した。観測場所への経路は選べるが、生活灯への給電方法は別途確認する。

記録の表示条件: `{"op":"eq","left":{"ref":"flags.dungeonNotes.region_9"},"right":true}`。本文・観察条件・選択肢は同じJSONの `dungeon.scene.region_9.v1`。

### 帰還者の深淵 / 逆らった足取り

正本: [q100](../data/quests/q100.json) の events.region_10。調査地点: region_10_f1 (1, 1)。

流れに逆らう移動で衰弱が蓄積することを確認した。帰還方法を引き継ぐ際は、セルごとの流れと移動方向を併記する。

記録の表示条件: `{"op":"eq","left":{"ref":"flags.dungeonNotes.region_10"},"right":true}`。本文・観察条件・選択肢は同じJSONの `dungeon.scene.region_10.v1`。

### 祈りの届かない谷 / 境界の内側の祈り

正本: [q193](../data/quests/q193.json) の events.prayerless_valley。調査地点: prayerless_valley_f1 (4, 1) / prayerless_valley_f1 (5, 1)。

谷の境界内で、指定された祈り・術の使用と効果が止まる区域を確認した。セイとの相談では、治療場所に加え、病人の意思と移動の負担を確かめる。

記録の表示条件: `{"op":"eq","left":{"ref":"flags.dungeonNotes.prayerless_valley"},"right":true}`。本文・観察条件・選択肢は同じJSONの `dungeon.scene.prayerless_valley.v1`。

### 巨獣上の移動集落 / 暮らしを揺らす足場

正本: [q194](../data/quests/q194.json) の events.moving_village。調査地点: moving_village_f1 (1, 1)。

巨獣の姿勢によって通路が変わることを確認した。故郷の契約を調べる際は、固定された土地の条件だけでなく、移動し続ける生活も確かめる。

記録の表示条件: `{"op":"eq","left":{"ref":"flags.dungeonNotes.moving_village"},"right":true}`。本文・観察条件・選択肢は同じJSONの `dungeon.scene.moving_village.v1`。

<!-- /generated:quest-observations -->
