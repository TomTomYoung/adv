# 旧100件の人物・出演監査

照合日: 2026-10-29。第2版の現場接続済み100件を配布JSONから集計する。出演根拠の精読は2件・8場面まで。集計と精読、素材制作と実装を区別する。

[不足素材](../world/ASSET_BACKLOG.md) ／ [町・シーン切替](../world/SCENE_SWITCH_PLAN.md) ／ [機械可読の全場面一覧](RELOCATED_CAST_AUDIT.json) ／ [精読の正本](../../authoring/relocated-cast-review.mjs) ／ [集計器](../../tools/audit-relocated-cast.mjs)

## 現在の結果

- 753場面中753場面のcastが空。空であることだけから人物画の不足とは判定しない。
- 人物エンティティは延べ98件、そのうちcharacter接続は0件。依頼間の重複や集団を含み、新規人物数ではない。
- 精読8場面のうち、特定人物の同席根拠なし6場面、人物の発言・動作あり2場面。制作候補は2役で、独立人物としての最終確定数ではない。
- 残る745場面は未精読。未精読を「人物なし」や「制作不要」に変換しない。

## 精読済みの依頼

### q031 遅れる祈り

依頼人: 聖歌隊のキリ。[配布JSON](../../data/scenario-editions/e2/q031.json) ／ [現場接続の原稿](../../authoring/editions/e2/oddland/chapel.mjs)。

依頼人は聖歌隊のキリ。q036にも同じ役職・名の依頼人がいるが、q031の現場本文に本人の同席は書かれていない。依頼人欄からcastへ自動追加しない。

夜に聞く声は探索隊が吹き込んだ録音。録音した本人の立ち絵や、亡き家族の肖像を新規NPCとして配置しない。結末の参拝者は場面の固定出演と区別する。

#### entry

場所: `region_4_f1` (11,9)。判定: 特定人物の同席根拠なし。

本文の根拠: 水晶の横には録音用の小さな窪みがある。

録音水晶を調べる場面。探索隊以外の特定人物が同席する記述はない。

描き分け候補: 録音水晶・吹込み用の窪み・日付の機構。人物画の追加は不要。

#### night

場所: `region_4_f1` (11,9)。判定: 特定人物の同席根拠なし。

本文の根拠: 自分の言った日付が流れた。

声は再生された録音。キリや別の話者が現場へ来たと解釈しない。

描き分け候補: 同じ足元で夜の礼拝と録音再生を示す差分。場面内の時間経過として扱う。

次の作業: 人物を追加せず、録音水晶と日付表示の局所差分を制作候補にする。人物監査の次はq033。

### q032 片目の聖像

依頼人: 修復師のサイ。[配布JSON](../../data/scenario-editions/e2/q032.json) ／ [現場接続の原稿](../../authoring/editions/e2/oddland/chapel.mjs)。

依頼人は修復師のサイ。q040にも同じ役職・名の依頼人がいる。q032の石工台の「職人」をサイ本人と同定する記述はなく、匿名の役として保留する。

国境q298の交代員サイ（od_relief）や既存人物の絵へ名前だけで統合しない。囚人と職人には固有名・年齢・性別・外見・他依頼との同一性を追加しない。

囚人は地下牢、職人は石工台でのみ出演根拠がある。聖像前への同行は原稿にない。依頼完了文の修復師・囚人を帰還場面の同席へ変換しない。

小物の表示には未整理点がある。workshop本文では宝玉と石を並べるが、jewelAtはentryから移らない。stoneAtはworkshop→party→entryと受け渡す。宝玉の現物を石工台へ描く前に、本文と保持者の整合方針を決める。今回この状態や本文は変更しない。

- 制作候補 `q032_prisoner`：地下牢の囚人（匿名）。人物定義・所在・cellのcast・専用画が未接続。顔を隠す反応を表現できる構図を検討する。牢や格子は人物画へ固定しない。
- 制作候補 `q032_craftsperson`：石工台の職人（匿名）。人物定義・所在・workshopのcast・専用画が未接続。修復師サイとの同一性は未確定。宝玉と石は人物画へ固定しない。

#### entry

場所: `region_4_f1` (9,11)。判定: 特定人物の同席根拠なし。

本文の根拠: 宝玉は元の棚へ戻っている。

聖像と宝玉を調べる場面。依頼人や職人の同席は書かれていない。

描き分け候補: 片目の聖像・棚の透明な宝玉・覗き管。

#### cell

場所: `region_4_f1` (1,8)。判定: 人物の出演根拠あり。候補: `q032_prisoner`。

本文の根拠: 囚人が「誰が見ている」と顔を隠す。

囚人の発言と動作が明示される。職人・依頼人は加えない。

描き分け候補: 地下牢側から見える覗き窓と囚人。聖像前とは実座標が異なる。

#### workshop

場所: `region_4_f1` (9,6)。判定: 人物の出演根拠あり。候補: `q032_craftsperson`。

本文の根拠: 職人が透明な宝玉と不透明な石を並べた。

石工台の職人の動作が明示される。地下牢の囚人は加えない。

描き分け候補: 石工台と比較する透明な宝玉・不透明な石。

#### fit_stone

場所: `region_4_f1` (9,11)。判定: 特定人物の同席根拠なし。

本文の根拠: 石工台から不透明な目を持ち帰った。

探索隊だけが聖像へ戻る。職人が同行したとは扱わない。

描き分け候補: 未取付の石と塞ぐ覗き管。finish前に修復完了の状態を描かない。

#### fit_original

場所: `region_4_f1` (9,11)。判定: 特定人物の同席根拠なし。

本文の根拠: 透明な宝玉のある棚へ戻った。

探索隊が棚へ戻る。囚人・職人・依頼人を同席させない。

描き分け候補: 棚の宝玉と監視につながる穴。finish前に宝玉の取付完了を描かない。

#### plate

場所: `region_4_f1` (9,11)。判定: 特定人物の同席根拠なし。

本文の根拠: 片目を塞がず保存する方針

聖像前で由来を記す。地下牢の囚人は遠隔地のまま。

描き分け候補: 片目を残した像と由来の銘板。

次の作業: 匿名2役の制作候補を保持し、人物定義・所在・castと専用画を一組で接続する。現段階の監査だけでは出演実装済みと数えない。

## 全100件の集計

次の「人物」はstory.entitiesのkind: personの延べ件数。「精読」は出演根拠の確認範囲で、人物画の接続済み数ではない。

### 礼拝堂

20件・122場面。cast空122場面、人物20件、character接続0件。

- [q031 遅れる祈り](../../data/scenario-editions/e2/q031.json)：2場面、cast空2、人物0。依頼人: 聖歌隊のキリ。精読済み。
- [q032 片目の聖像](../../data/scenario-editions/e2/q032.json)：6場面、cast空6、人物0。依頼人: 修復師のサイ。精読済み。
- [q033 映らない巡礼者](../../data/scenario-editions/e2/q033.json)：5場面、cast空5、人物1。依頼人: 宿坊のウラ。未精読。
- [q034 赦しの領収書](../../data/scenario-editions/e2/q034.json)：3場面、cast空3、人物2。依頼人: 商人のロア。未精読。
- [q035 鏡の向こうの施し](../../data/scenario-editions/e2/q035.json)：3場面、cast空3、人物2。依頼人: 施療人のネイ。未精読。
- [q036 七番目の歌声](../../data/scenario-editions/e2/q036.json)：3場面、cast空3、人物0。依頼人: 聖歌隊のキリ。未精読。
- [q037 夜だけの告解](../../data/scenario-editions/e2/q037.json)：5場面、cast空5、人物3。依頼人: 告解係のオル。未精読。
- [q038 聖水の沈殿](../../data/scenario-editions/e2/q038.json)：7場面、cast空7、人物0。依頼人: 施療人のネイ。未精読。
- [q039 顔を売る仮面](../../data/scenario-editions/e2/q039.json)：3場面、cast空3、人物1。依頼人: 仮面師のチセ。未精読。
- [q040 砕けない祈り](../../data/scenario-editions/e2/q040.json)：7場面、cast空7、人物1。依頼人: 修復師のサイ。未精読。
- [q131 逆向きの足跡](../../data/scenario-editions/e2/q131.json)：7場面、cast空7、人物3。依頼人: 考古学者シェル。未精読。
- [q132 宝箱の底の椅子](../../data/scenario-editions/e2/q132.json)：4場面、cast空4、人物0。依頼人: 財宝庫の管理人。未精読。
- [q133 一段足りない階段](../../data/scenario-editions/e2/q133.json)：5場面、cast空5、人物0。依頼人: 建築師ドマ。未精読。
- [q134 敗者の宝物庫](../../data/scenario-editions/e2/q134.json)：8場面、cast空8、人物3。依頼人: 剣士ザグ。未精読。
- [q135 水底の朝食](../../data/scenario-editions/e2/q135.json)：8場面、cast空8、人物1。依頼人: 潜水具職人アネ。未精読。
- [q136 翻訳しない扉](../../data/scenario-editions/e2/q136.json)：8場面、cast空8、人物0。依頼人: 言語学者トゥリ。未精読。
- [q137 燃え残る図書館](../../data/scenario-editions/e2/q137.json)：9場面、cast空9、人物0。依頼人: 写本師エル。未精読。
- [q138 行き止まりの探検家](../../data/scenario-editions/e2/q138.json)：6場面、cast空6、人物2。依頼人: 探索組合。未精読。
- [q139 ふたつの出口](../../data/scenario-editions/e2/q139.json)：15場面、cast空15、人物0。依頼人: 救助責任者セナ。未精読。
- [q140 迷宮の休業日](../../data/scenario-editions/e2/q140.json)：8場面、cast空8、人物1。依頼人: 探索組合。未精読。

### 沈没城

20件・141場面。cast空141場面、人物15件、character接続0件。

- [q061 濡れない海図](../../data/scenario-editions/e2/q061.json)：5場面、cast空5、人物0。依頼人: 航海士のナギ。未精読。
- [q062 王の救命胴衣](../../data/scenario-editions/e2/q062.json)：4場面、cast空4、人物0。依頼人: 潜水士のナオ。未精読。
- [q063 潮に逆らう階段](../../data/scenario-editions/e2/q063.json)：4場面、cast空4、人物0。依頼人: 城址調査団のミオ。未精読。
- [q064 届く砲声](../../data/scenario-editions/e2/q064.json)：5場面、cast空5、人物0。依頼人: 漁師のハル。未精読。
- [q065 水中の火葬](../../data/scenario-editions/e2/q065.json)：6場面、cast空6、人物0。依頼人: 葬送師のアオ。未精読。
- [q066 珊瑚の軍議](../../data/scenario-editions/e2/q066.json)：7場面、cast空7、人物0。依頼人: 歴史家のオミ。未精読。
- [q067 人魚の筆談](../../data/scenario-editions/e2/q067.json)：7場面、cast空7、人物1。依頼人: 通訳のスイ。未精読。
- [q068 二つの錨](../../data/scenario-editions/e2/q068.json)：7場面、cast空7、人物0。依頼人: 救難船長のトウ。未精読。
- [q069 海王の通行税](../../data/scenario-editions/e2/q069.json)：6場面、cast空6、人物0。依頼人: 漁師のハル。未精読。
- [q070 沈没城の浮上](../../data/scenario-editions/e2/q070.json)：9場面、cast空9、人物0。依頼人: 航海士のナギ。未精読。
- [q161 治さない傷](../../data/scenario-editions/e2/q161.json)：7場面、cast空7、人物1。依頼人: 祈祷師イネ。未精読。
- [q162 騎士の盾を借りる](../../data/scenario-editions/e2/q162.json)：10場面、cast空10、人物2。依頼人: 騎士エルド。未精読。
- [q163 盗賊の初仕事](../../data/scenario-editions/e2/q163.json)：8場面、cast空8、人物2。依頼人: 元盗賊の鍵師ソム。未精読。
- [q164 吟遊詩人抜きの宴](../../data/scenario-editions/e2/q164.json)：7場面、cast空7、人物1。依頼人: 帰り火亭の常連。未精読。
- [q165 仲間を外す依頼](../../data/scenario-editions/e2/q165.json)：7場面、cast空7、人物2。依頼人: 商人リナ。未精読。
- [q166 最後の一撃を譲れ](../../data/scenario-editions/e2/q166.json)：6場面、cast空6、人物1。依頼人: 弟子戦士ルウ。未精読。
- [q167 軍師のいない勝利](../../data/scenario-editions/e2/q167.json)：10場面、cast空10、人物0。依頼人: 病欠した軍師ユウナの隊。未精読。
- [q168 ふたりでひとり分の報酬](../../data/scenario-editions/e2/q168.json)：9場面、cast空9、人物2。依頼人: 双子の術師ネムとノム。未精読。
- [q169 誰にも贈れない指輪](../../data/scenario-editions/e2/q169.json)：6場面、cast空6、人物2。依頼人: 騎士マオ。未精読。
- [q170 別れるための冒険](../../data/scenario-editions/e2/q170.json)：11場面、cast空11、人物1。依頼人: 旅仲間セフ。未精読。

### 地下観測所

20件・179場面。cast空179場面、人物21件、character接続0件。

- [q081 落ちてこない星](../../data/scenario-editions/e2/q081.json)：5場面、cast空5、人物0。依頼人: 観測士のシオ。未精読。
- [q082 星売りの空瓶](../../data/scenario-editions/e2/q082.json)：8場面、cast空8、人物1。依頼人: 商人のエル。未精読。
- [q083 地底の日食](../../data/scenario-editions/e2/q083.json)：6場面、cast空6、人物0。依頼人: 暦職人のツキ。未精読。
- [q084 帰還信号](../../data/scenario-editions/e2/q084.json)：10場面、cast空10、人物0。依頼人: 遭難者家族のマオ。未精読。
- [q085 方位のない羅針盤](../../data/scenario-editions/e2/q085.json)：7場面、cast空7、人物2。依頼人: 探検家のルウ。未精読。
- [q086 百年前の観測者](../../data/scenario-editions/e2/q086.json)：7場面、cast空7、人物0。依頼人: 観測士のシオ。未精読。
- [q087 願いを消す流星](../../data/scenario-editions/e2/q087.json)：5場面、cast空5、人物1。依頼人: 見習いのハク。未精読。
- [q088 観測窓の亀裂](../../data/scenario-editions/e2/q088.json)：10場面、cast空10、人物0。依頼人: 保守員のイチ。未精読。
- [q089 逆さまの天球儀](../../data/scenario-editions/e2/q089.json)：5場面、cast空5、人物0。依頼人: 暦職人のツキ。未精読。
- [q090 空を返す日](../../data/scenario-editions/e2/q090.json)：10場面、cast空10、人物1。依頼人: 遭難者家族のマオ。未精読。
- [q181 白い矢筒](../../data/scenario-editions/e2/q181.json)：9場面、cast空9、人物3。依頼人: 新任の弓兵隊長。未精読。
- [q182 一発も撃たない砲手](../../data/scenario-editions/e2/q182.json)：8場面、cast空8、人物0。依頼人: 魔導砲手オル。未精読。
- [q183 勝者の洗濯場](../../data/scenario-editions/e2/q183.json)：8場面、cast空8、人物0。依頼人: 戦後の洗濯場の係長。未精読。
- [q184 捕虜の鍋](../../data/scenario-editions/e2/q184.json)：9場面、cast空9、人物3。依頼人: 捕虜収容所の料理係。未精読。
- [q185 橋を落とさない理由](../../data/scenario-editions/e2/q185.json)：13場面、cast空13、人物2。依頼人: 撤退軍と橋守ネヴ。未精読。
- [q186 返事のない停戦](../../data/scenario-editions/e2/q186.json)：13場面、cast空13、人物1。依頼人: 交渉官ハス。未精読。
- [q187 旗を持たない兵士](../../data/scenario-editions/e2/q187.json)：9場面、cast空9、人物2。依頼人: 国境村。未精読。
- [q188 帰還兵の席](../../data/scenario-editions/e2/q188.json)：10場面、cast空10、人物3。依頼人: 帰還兵ラフ。未精読。
- [q189 敵国の子守歌](../../data/scenario-editions/e2/q189.json)：8場面、cast空8、人物1。依頼人: 避難所の薬売りアサ。未精読。
- [q190 終戦翌日の魔物](../../data/scenario-editions/e2/q190.json)：19場面、cast空19、人物1。依頼人: 兵站係フウ。未精読。

### 書庫

20件・148場面。cast空148場面、人物28件、character接続0件。

- [q041 返却日のない本](../../data/scenario-editions/e2/q041.json)：8場面、cast空8、人物2。依頼人: 司書のシフ。未精読。
- [q042 砂時計の残業](../../data/scenario-editions/e2/q042.json)：9場面、cast空9、人物0。依頼人: 記録係のテオ。未精読。
- [q043 墨を食う火](../../data/scenario-editions/e2/q043.json)：6場面、cast空6、人物0。依頼人: 写本師のアリ。未精読。
- [q044 未来の訃報](../../data/scenario-editions/e2/q044.json)：7場面、cast空7、人物1。依頼人: 新聞係のユズ。未精読。
- [q045 白紙の相続](../../data/scenario-editions/e2/q045.json)：4場面、cast空4、人物0。依頼人: 代書人のサキ。未精読。
- [q046 迷子の索引](../../data/scenario-editions/e2/q046.json)：5場面、cast空5、人物1。依頼人: 司書のシフ。未精読。
- [q047 一頁の戦争](../../data/scenario-editions/e2/q047.json)：8場面、cast空8、人物2。依頼人: 歴史家のオミ。未精読。
- [q048 眠る校正者](../../data/scenario-editions/e2/q048.json)：7場面、cast空7、人物0。依頼人: 写本師のアリ。未精読。
- [q049 忘却の栞](../../data/scenario-editions/e2/q049.json)：6場面、cast空6、人物1。依頼人: 探検家のルウ。未精読。
- [q050 止まった終章](../../data/scenario-editions/e2/q050.json)：11場面、cast空11、人物0。依頼人: 記録係のテオ。未精読。
- [q141 音の出ない優勝旗](../../data/scenario-editions/e2/q141.json)：7場面、cast空7、人物1。依頼人: 楽団長ポル。未精読。
- [q142 偽物職人の本物](../../data/scenario-editions/e2/q142.json)：4場面、cast空4、人物2。依頼人: 偽宝石職人キオ。未精読。
- [q143 辛くない火吹き料理](../../data/scenario-editions/e2/q143.json)：8場面、cast空8、人物4。依頼人: 料理祭の店主メメ。未精読。
- [q144 祭の悪役](../../data/scenario-editions/e2/q144.json)：8場面、cast空8、人物3。依頼人: 悪竜役のジル。未精読。
- [q145 花を咲かせない庭](../../data/scenario-editions/e2/q145.json)：8場面、cast空8、人物1。依頼人: 庭師ロマ。未精読。
- [q146 染め直せない軍服](../../data/scenario-editions/e2/q146.json)：6場面、cast空6、人物1。依頼人: 染物屋ニア。未精読。
- [q147 一番遅い配達](../../data/scenario-editions/e2/q147.json)：10場面、cast空10、人物0。依頼人: 運送店主。未精読。
- [q148 贋金より軽い金](../../data/scenario-editions/e2/q148.json)：8場面、cast空8、人物2。依頼人: 市場の両替人。未精読。
- [q149 売らない剣](../../data/scenario-editions/e2/q149.json)：7場面、cast空7、人物2。依頼人: 武具商と鍛冶師。未精読。
- [q150 大道芸人の弟子](../../data/scenario-editions/e2/q150.json)：11場面、cast空11、人物5。依頼人: 曲芸師リッツ。未精読。

### 機関廟

20件・163場面。cast空163場面、人物14件、character接続0件。

- [q071 止まれない門番](../../data/scenario-editions/e2/q071.json)：7場面、cast空7、人物1。依頼人: 整備士のフウ。未精読。
- [q072 油の洗礼](../../data/scenario-editions/e2/q072.json)：5場面、cast空5、人物0。依頼人: 機関司祭のイオ。未精読。
- [q073 天使の予備腕](../../data/scenario-editions/e2/q073.json)：8場面、cast空8、人物0。依頼人: 義肢職人のリン。未精読。
- [q074 祈祷の順番](../../data/scenario-editions/e2/q074.json)：7場面、cast空7、人物0。依頼人: 鐘番のユア。未精読。
- [q075 無給の聖者](../../data/scenario-editions/e2/q075.json)：7場面、cast空7、人物0。依頼人: 修繕組合のセリ。未精読。
- [q076 鉄の子守歌](../../data/scenario-editions/e2/q076.json)：6場面、cast空6、人物0。依頼人: 整備士のフウ。未精読。
- [q077 聖痕の配線](../../data/scenario-editions/e2/q077.json)：5場面、cast空5、人物0。依頼人: 機関司祭のイオ。未精読。
- [q078 部品の記憶](../../data/scenario-editions/e2/q078.json)：5場面、cast空5、人物1。依頼人: 義肢職人のリン。未精読。
- [q079 九十九回の再起動](../../data/scenario-editions/e2/q079.json)：5場面、cast空5、人物0。依頼人: 鐘番のユア。未精読。
- [q080 鉄胎の継承](../../data/scenario-editions/e2/q080.json)：7場面、cast空7、人物0。依頼人: 修繕組合のセリ。未精読。
- [q171 足音を持ち帰る](../../data/scenario-editions/e2/q171.json)：15場面、cast空15、人物1。依頼人: 靴職人ダイの妻。未精読。
- [q172 名前を返す井戸](../../data/scenario-editions/e2/q172.json)：10場面、cast空10、人物1。依頼人: 織工ルイ。未精読。
- [q173 夜だけ帰る兵士](../../data/scenario-editions/e2/q173.json)：8場面、cast空8、人物2。依頼人: 寡婦テラ。未精読。
- [q174 泣かない葬列](../../data/scenario-editions/e2/q174.json)：6場面、cast空6、人物1。依頼人: 村長。未精読。
- [q175 狩人を待つ獣](../../data/scenario-editions/e2/q175.json)：10場面、cast空10、人物2。依頼人: 猟師ミロの妹。未精読。
- [q176 神様の忘れ物](../../data/scenario-editions/e2/q176.json)：8場面、cast空8、人物1。依頼人: 小さな街道神。未精読。
- [q177 嘘をつかない鏡](../../data/scenario-editions/e2/q177.json)：9場面、cast空9、人物0。依頼人: 鏡を売る商人。未精読。
- [q178 扉の向こうの明日](../../data/scenario-editions/e2/q178.json)：9場面、cast空9、人物2。依頼人: 宿主と旅立つ娘。未精読。
- [q179 墓を増やす庭](../../data/scenario-editions/e2/q179.json)：17場面、cast空17、人物1。依頼人: 墓守。未精読。
- [q180 最後の怪談](../../data/scenario-editions/e2/q180.json)：9場面、cast空9、人物1。依頼人: 宿主と語り部ムイ。未精読。

## 更新と検査

`node tools/audit-relocated-cast.mjs` で本書とJSONを再生成し、`node tools/audit-relocated-cast.mjs --check` で照合する。通常の `npm run check:docs` とCIでも照合する。精読済み依頼は配布JSON全体のSHA-256を固定し、本文・状態・場所・出演・結末等が変われば精読し直すまで検査を失敗させる。再生成だけで精読印を更新しない。関連依頼人の表記変更、根拠の引用消失、場面の追加・欠落、未定義の候補役も拒否する。

本書の候補IDは監査内だけの識別子。character、story.entities、cast、画像は追加していない。初版・第2版のゲームデータ、本文、移動・同行・費用・報酬、保存改訂2・地理版2は変更しない。q031・q032の局所シーン差分も制作候補の段階である。
