# 既存100件の移設前検証

2026-10-26。基点master `091b8085a4d27d1414529f25f1e2eddb43c0194b`。対象はオッドランド候補60件、サロメ候補40件。機械的な実行検証と、実際の移設採用を区別する。

[調査と採用条件](ODDLAND_RELOCATION_AUDIT.md) ／ [検証JSON](REGIONAL_RELOCATION_CHECK.json) ／ [再実行ツール](../../tools/audit-regional-relocation.mjs) ／ [個別の本文・帰路の作業](REGIONAL_RELOCATION_WORK.md)

この報告は互換切断前の固定fixtureによる歴史的基準。現行の巡礼路・礼拝堂前半10件と保存改訂2は対象外。旧保存互換の条件はユーザー指示により一回限りの切断へ変更した。現在の進捗は[個別作業票](REGIONAL_RELOCATION_WORK.md)を参照する。

## 結果と制限

100件・321結末の選択をVMで実行し、2422回の保存再開と2800件の世代別保存移行を確認した。5迷宮の通常出口・帰還印・敗北救助は、基準時点の所属先である灯帰りへ戻る。

基準時点の全100件に実座標の `story.worldPlaces` がない。場面間移動・人物同行・受渡しは旧版の文章とフラグで表現され、現地イベントの座標に隊が留まる。今回の検証成功だけを理由に入口・受付を外国へ移さない。この時点では地図上の現場・帰路と旧遠征の互換が未接続だった。

分岐の到達性を調べるため、前提完了はfixture、資金5000G・道具99・高レベルの隊を使い、決定地点へ直接配置する。物語内の戦闘は勝利・可能な逃走・敗北を実行する。現場までの往復・無資金での踏破・自然な成長を今回測ったという意味ではない。選択時に資源0でも続行手段があること、報酬が再訪で重複しないことは別に検査する。

旧e2はq001改稿期、個人80件追加後、越境追加後、第一群10件追加後の4世代を、固定した改訂1の版別定義と旧bundleから再構成したfixture。ユーザー実保存の収集や過去全リリースの復元ではない。各依頼の未受注・受注済み・迷宮内・本文表示中・選択待ち・環境戦闘中・完了済みを基準時点のe2へ読み込み、既存フィールドを逐一比較した。新しい国での旧遠征を保証する試験ではない。

`npm run audit:relocation` でJSONと本文を再測定・生成し、`npm run check:relocation` で保存済み結果との一致を確認する。通常の `npm run check` でも専用試験が各依頼の実測値をJSONと照合する。固有装置の操作後の保存・帰還・再出発、入口だけを変更した場合の国表示変更とサロメ施設内保存の拒否は専用試験で別に再現する。

## 個別結果

### 鏡沈みの礼拝堂 → 巡礼台地

礼拝堂・巡礼の現場と周辺出張を区別する。宗教者を聖教会や狂火へ自動所属させない。

#### q031 遅れる祈り

決定地点：`region_4_f1 (11,9)`。場面：entry、night。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：break
1. compromise：date
1. informed：record → repair

#### q032 片目の聖像

決定地点：`region_4_f1 (9,11)`。場面：cell、entry、workshop。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：restore
1. compromise：plate
1. informed：look → opaque → stone

#### q033 映らない巡礼者

決定地点：`region_4_f1 (13,7)`。場面：entry、powder。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. compromise：guest
1. contract：reject
1. informed：cloth → wash

#### q034 赦しの領収書

決定地点：`region_4_f1 (15,5)`。場面：consent、entry、reserved。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：recover
1. informed：read → separate
1. compromise：meeting → arrange

#### q035 鏡の向こうの施し

決定地点：`region_4_f1 (17,3)`。場面：consent、entry、patient。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：break
1. compromise：table
1. meal：deliver → food
1. informed：deliver → ask → repair

#### q036 七番目の歌声

決定地点：`region_4_f2 (15,5)`。場面：credit、entry、recording。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：cut
1. compromise：solo → memorial
1. informed：solo → rehearse → program

#### q037 夜だけの告解

決定地点：`region_4_f2 (16,4)`。場面：entry、return。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：destroy
1. compromise：seal
1. informed：move → first → second → third → finish

#### q038 聖水の沈殿

決定地点：`region_4_f2 (13,7)`。場面：entry、filter、water。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：purge
1. compromise：buy
1. informed：sample → filter

#### q039 顔を売る仮面

決定地点：`region_4_f2 (17,3)`。場面：account、entry、owners。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：buyer
1. compromise：gather → copies
1. informed：gather → marks → register

#### q040 砕けない祈り

決定地点：`region_4_f2 (8,13)`。場面：after、entry、shadow、witness。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. compromise：isolate
1. contract：seal → [戦闘:win]
1. informed：listen → copy → defend → [戦闘:win]
1. fragment：listen → fight → [戦闘:win] → fragment

#### q131 逆向きの足跡

決定地点：`region_4_f1 (3,1)`。場面：credit、entry、lost、room。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. person：test → person
1. sample：test → sample
1. all：test → both → all
1. school：test → both → school

#### q132 宝箱の底の椅子

決定地点：`region_4_f1 (5,1)`。場面：entry、isolate、test。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. destroy：destroy → [戦闘:win]
1. isolate：room → decoy → seal

#### q133 一段足りない階段

決定地点：`region_4_f1 (6,1)`。場面：entry、platform、warning。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. save：weight → save
1. stairs：weight → stairs

#### q134 敗者の宝物庫

決定地点：`region_4_f1 (8,1)`。場面：entry、return。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. decline：decline
1. sword：rule → sword
1. parcel：rule → parcel
1. break：break → [戦闘:win]

#### q135 水底の朝食

決定地点：`region_4_f1 (9,1)`。場面：entry、reply。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. lift：lift
1. break：break
1. stop：listen → answer

#### q136 翻訳しない扉

決定地点：`region_4_f2 (3,1)`。場面：entry、purpose、record、refused。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. study：reply → study
1. shelter：reply → shelter
1. break：break → [戦闘:win]
1. leave：reply → loot → leave

#### q137 燃え残る図書館

決定地点：`region_4_f2 (4,1)`。場面：entry、read。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. close：close
1. medicine：medicine → page → page → page → carry_medicine
1. prepare：medicine → page → page → page → prepare
1. family：family → page → page → page → carry_family
1. language：language → page → page → page → carry_language

#### q138 行き止まりの探検家

決定地点：`region_4_f2 (5,1)`。場面：entry、pupil。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. together：map → together
1. talk：map → talk
1. solo：map → solo
1. correct：map → correct

#### q139 ふたつの出口

決定地点：`region_4_f2 (6,1)`。場面：air、entry、rooms。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. many：many
1. wounded：measure → wounded
1. both：measure → air → tools

#### q140 迷宮の休業日

決定地点：`region_4_f2 (9,1)`。場面：entry、talk。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. loot：loot
1. treaty：rescue → declare
1. close：rescue → close
1. leave：rescue → leave

### 黒潮の沈没城 → 旧王領の村

城の水域・浮上・水上出口を接続する。海王や既存の水没を古代の大水門・アダの事件と結び付けない。

#### q061 濡れない海図

決定地点：`region_7_f1 (9,11)`。場面：air、entry。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：sea
1. compromise：local
1. informed：trial → next → rescue

#### q062 王の救命胴衣

決定地点：`region_7_f1 (11,9)`。場面：entry。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. informed：names
1. compromise：heirs
1. contract：treasure

#### q063 潮に逆らう階段

決定地点：`region_7_f1 (13,7)`。場面：balance、entry。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：pin
1. compromise：vent
1. informed：weight → add → fix

#### q064 届く砲声

決定地点：`region_7_f1 (8,12)`。場面：bay、entry、pressure。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：break
1. informed：before → bell
1. compromise：before → schedule

#### q065 水中の火葬

決定地点：`region_7_f1 (15,5)`。場面：entry、tide。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：oil
1. compromise：shore
1. informed：wait → wait → join

#### q066 珊瑚の軍議

決定地点：`region_7_f2 (15,5)`。場面：empty、entry、evacuated。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：honor
1. compromise：carry → facts
1. informed：carry → manifest → rewrite

#### q067 人魚の筆談

決定地点：`region_7_f2 (17,3)`。場面：balanced、entry、surge。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：force
1. compromise：stop
1. informed：small → gate

#### q068 二つの錨

決定地点：`region_7_f2 (8,13)`。場面：entry、raft、secured。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：cut
1. compromise：fix
1. informed：light → rope → cut
1. cargo：light → people → abandon

#### q069 海王の通行税

決定地点：`region_7_f2 (9,12)`。場面：entry、passed、work。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. compromise：pay → leave
1. informed：help → shared
1. contract：force → [戦闘:win]

#### q070 沈没城の浮上

決定地点：`region_7_f2 (13,7)`。場面：districts、entry。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. compromise：salvage
1. contract：all → [戦闘:win]
1. informed：divide → evacuate → outer → store → core

#### q161 治さない傷

決定地点：`region_7_f1 (3,1)`。場面：consent、entry。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. wait：wait
1. heal：wish → sera
1. recorded：record → recorded

#### q162 騎士の盾を借りる

決定地点：`region_7_f1 (4,1)`。場面：ceremony、entry、tell。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. ceremony：rope → ceremony
1. workshop：rope → workshop
1. return：rope → return

#### q163 盗賊の初仕事

決定地点：`region_7_f1 (5,1)`。場面：entry、repay。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. repair：new
1. later：later
1. repay：old → agree

#### q164 吟遊詩人抜きの宴

決定地点：`region_7_f1 (6,1)`。場面：entry、prepare、together。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. explain：explain
1. secret：secret → party
1. listen：bring → wait
1. song：bring → song

#### q165 仲間を外す依頼

決定地点：`region_7_f1 (8,1)`。場面：entry、private、public。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. decline：decline
1. open：open → agree
1. secret：[イル不在] → private → secret

#### q166 最後の一撃を譲れ

決定地点：`region_7_f2 (3,1)`。場面：entry、interview、report、trial。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. retry：rules → train
1. joint：rules → battle → [戦闘:win] → honest
1. lie：rules → battle → [戦闘:win] → lie
1. interview：rules → battle → [戦闘:escape] → honest

#### q167 軍師のいない勝利

決定地点：`region_7_f2 (4,1)`。場面：blocked、entry、report。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. retreat：retreat
1. ours：ridge → [戦闘:win] → ours
1. hers：ridge → [戦闘:win] → hers

#### q168 ふたりでひとり分の報酬

決定地点：`region_7_f2 (5,1)`。場面：adjust、entry、invoice、separated。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. pair：pair → wait → pair
1. separate：pair → wait → separate
1. flex：pair → wait → flex

#### q169 誰にも贈れない指輪

決定地点：`region_7_f2 (8,1)`。場面：entry、friendship、later、recipient、report。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. honest：deliver → return → honest
1. soft：deliver → message → back → soft
1. corrected：deliver → return → lie → admit
1. lie：deliver → return → lie → silent

#### q170 別れるための冒険

決定地点：`region_7_f2 (9,1)`。場面：entry、role。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. send：send
1. holiday：holiday
1. role：role → agree

### 星欠けの地下観測所 → 旧王領の周辺

天球儀の状態と帰路を保つ。後半の停戦・捕虜・終戦を最終盤のトルネア侵攻として確定しない。

#### q081 落ちてこない星

決定地点：`region_9_f1 (11,9)`。場面：entry、show。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. compromise：delay
1. contract：destroy
1. informed：project → correct

#### q082 星売りの空瓶

決定地点：`region_9_f1 (13,7)`。場面：entry、label、spent、temperature。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：heat
1. compromise：refund
1. informed：hand → normal → instructions

#### q083 地底の日食

決定地点：`region_9_f1 (15,5)`。場面：entry、scaffold。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：stop
1. compromise：calendar
1. informed：cycle → dates
1. repaired：cycle → only

#### q084 帰還信号

決定地点：`region_9_f1 (9,11)`。場面：beacon、crossing、entry。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：recover
1. compromise：source → handoff
1. informed：source → trail → reach

#### q085 方位のない羅針盤

決定地点：`region_9_f1 (17,3)`。場面：entrance、entry、leader、marker。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：north
1. informed：bag → entrance → exit
1. compromise：bag → leader → relay

#### q086 百年前の観測者

決定地点：`region_9_f2 (13,7)`。場面：entry、mail、mapping。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. compromise：old
1. contract：discard
1. informed：reply → repair → table

#### q087 願いを消す流星

決定地点：`region_9_f2 (15,5)`。場面：entry、firststep、ticket。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. compromise：notebook
1. contract：break
1. informed：test → wording → act

#### q088 観測窓の亀裂

決定地点：`region_9_f2 (17,3)`。場面：entry、observe、panel。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. compromise：inspection
1. contract：metal
1. informed：layers → replace → sky

#### q089 逆さまの天球儀

決定地点：`region_9_f2 (8,13)`。場面：dates、entry。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. compromise：two
1. contract：gears
1. informed：turn → wedding → wages → switch

#### q090 空を返す日

決定地点：`region_9_f2 (12,9)`。場面：entry、open、schedule。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. compromise：surface
1. contract：full → [戦闘:win]
1. informed：battery → hour → close
1. overrun：battery → hour → longer

#### q181 白い矢筒

決定地点：`region_9_f1 (3,1)`。場面：entry、signal。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. rescue：front
1. withdraw：withdraw
1. meet：ask → meet

#### q182 一発も撃たない砲手

決定地点：`region_9_f1 (4,1)`。場面：entry。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. attack：attack
1. hold：hold
1. light：command → evac → light

#### q183 勝者の洗濯場

決定地点：`region_9_f1 (5,1)`。場面：entry、support。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. report：report
1. hidden：hidden
1. supported：families → goods

#### q184 捕虜の鍋

決定地点：`region_9_f1 (6,1)`。場面：entry、joint。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. take：take
1. other：other
1. joint：joint → agree

#### q185 橋を落とさない理由

決定地点：`region_9_f1 (8,1)`。場面：entry。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. boat：boat
1. early：early
1. families：hold → [戦闘:win]

#### q186 返事のない停戦

決定地点：`region_9_f2 (3,1)`。場面：authority、entry。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. local：local
1. withdraw：withdraw
1. battle：break → [戦闘:win]

#### q187 旗を持たない兵士

決定地点：`region_9_f2 (4,1)`。場面：contract、entry。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. army：evac → army
1. village：evac → village
1. leave：evac → leave

#### q188 帰還兵の席

決定地点：`region_9_f2 (5,1)`。場面：entry、work。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. arrived：arrived
1. old：talk → old
1. share：talk → share
1. apart：talk → apart

#### q189 敵国の子守歌

決定地点：`region_9_f2 (6,1)`。場面：entry、explain。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. private：private
1. hold：hold
1. ban：ban
1. explain：book → public

#### q190 終戦翌日の魔物

決定地点：`region_9_f2 (9,1)`。場面：cleanup、entry。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. evac：evac
1. only：battle → [戦闘:win] → only
1. collect：battle → [戦闘:win] → site → site → site → store → collect

### 灰時計の書庫 → 灰時計の書庫周辺

既存e2_academy・e2_archive・e2_stacksと入口を統合する。技能貸出と返却、イルの個人連作を維持する。

#### q041 返却日のない本

決定地点：`region_5_f1 (15,5)`。場面：clerk、entry、resident。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：recover
1. compromise：visit → deadline
1. informed：visit → registry → rewrite

#### q042 砂時計の残業

決定地点：`region_5_f1 (17,3)`。場面：entry、sand、shift。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：break
1. compromise：outside → two
1. informed：sample → hours

#### q043 墨を食う火

決定地点：`region_5_f1 (9,12)`。場面：entry、restore。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：seal
1. informed：valve → restore
1. compromise：valve → blanks

#### q044 未来の訃報

決定地点：`region_5_f1 (10,11)`。場面：entry、office、safe。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：destroy
1. compromise：warn → escape
1. informed：office → publish

#### q045 白紙の相続

決定地点：`region_5_f1 (11,10)`。場面：conference、draft、entry。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. compromise：witness
1. contract：restore
1. informed：cool → gather → minutes

#### q046 迷子の索引

決定地点：`region_5_f2 (11,9)`。場面：entry、ferry、rain、river。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：straight
1. compromise：index → exit
1. informed：index → river → ferry → link

#### q047 一頁の戦争

決定地点：`region_5_f2 (13,7)`。場面：entry、home、other、vault。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：return
1. informed：other → parallel
1. compromise：home → vault → deliver

#### q048 眠る校正者

決定地点：`region_5_f2 (15,5)`。場面：entry、final、morning。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：break
1. compromise：team
1. informed：correct → freeze → seal

#### q049 忘却の栞

決定地点：`region_5_f2 (17,3)`。場面：entry、scope、test。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：burn
1. compromise：map
1. informed：remove → split → return

#### q050 止まった終章

決定地点：`region_5_f2 (9,12)`。場面：copies、entry、requests、warehouse。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：stop
1. compromise：copy → close
1. informed：follow → extension → publish

#### q141 音の出ない優勝旗

決定地点：`region_5_f1 (3,1)`。場面：entry、sana。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. new：new
1. silent：silent
1. use：ask → use

#### q142 偽物職人の本物

決定地点：`region_5_f1 (4,1)`。場面：buyer、entry。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. refuse：refuse
1. refund：tell → refund
1. repair：tell → repair

#### q143 辛くない火吹き料理

決定地点：`region_5_f1 (5,1)`。場面：entry、roles。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. fire：hire
1. taste：taste
1. shift：roles → agree

#### q144 祭の悪役

決定地点：`region_5_f1 (6,1)`。場面：entry、play。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. retire：retire
1. light：trial → light
1. wit：trial → wit

#### q145 花を咲かせない庭

決定地点：`region_5_f1 (9,1)`。場面：entry、letter。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. now：now
1. half：half
1. waited：wait → open

#### q146 染め直せない軍服

決定地点：`region_5_f2 (3,1)`。場面：entry、friends。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. coat：coat
1. keep：keep
1. release：friends → release

#### q147 一番遅い配達

決定地点：`region_5_f2 (4,1)`。場面：closed、entry。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. quiet：water
1. tomorrow：run → tomorrow
1. record：run → record

#### q148 贋金より軽い金

決定地点：`region_5_f2 (5,1)`。場面：denied、entry、proof。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. remove：remove
1. public：test → public
1. private：test → private

#### q149 売らない剣

決定地点：`region_5_f2 (6,1)`。場面：entry、user。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. collector：collector
1. withdraw：withdraw
1. user：user → pay

#### q150 大道芸人の弟子

決定地点：`region_5_f2 (8,1)`。場面：accident、audience、company、contracts、entry、repair。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. none：practice → cancel
1. porter：practice → porter → thief → porter
1. thief：practice → porter → thief → thief
1. singer：practice → porter → singer → singer
1. company：practice → porter → thief → company → agree

### 鉄胎の機関廟 → 遺物管理区・外縁調査道

既存e2_workshop・e2_relic・e2_storageを保持する。ミカの所属組織と機関廟の所有権を新たに断定しない。

#### q071 止まれない門番

決定地点：`region_8_f1 (9,11)`。場面：entry、worker。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. compromise：power
1. informed：retired → call
1. contract：dismantle → [戦闘:win]

#### q072 油の洗礼

決定地点：`region_8_f1 (11,9)`。場面：entry、oil、warm。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：discard
1. compromise：heat → keep
1. informed：oil → separate

#### q073 天使の予備腕

決定地点：`region_8_f1 (13,7)`。場面：copy、entry、support。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：take
1. informed：brace → recover
1. compromise：borrow → return

#### q074 祈祷の順番

決定地点：`region_8_f1 (15,5)`。場面：door、entry、furnace、lock。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. compromise：manual
1. contract：force → [戦闘:win]
1. informed：cool → furnace → correct

#### q075 無給の聖者

決定地点：`region_8_f1 (7,13)`。場面：entry、parts、running。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. compromise：share
1. contract：rewrite → [戦闘:win]
1. informed：gear → deliver → translate
1. once：gear → deliver → once

#### q076 鉄の子守歌

決定地点：`region_8_f2 (17,3)`。場面：control、entry、moved。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. contract：off
1. informed：line → rewire
1. compromise：medicine → stop

#### q077 聖痕の配線

決定地点：`region_8_f2 (8,13)`。場面：entry、outage。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. compromise：fence
1. contract：scrape
1. informed：cutpower → lamps

#### q078 部品の記憶

決定地点：`region_8_f2 (13,8)`。場面：bench、entry。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. compromise：manual
1. contract：erase
1. informed：train → hammer → needle → save

#### q079 九十九回の再起動

決定地点：`region_8_f2 (15,6)`。場面：archive、entry、full。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. compromise：test → small
1. contract：bypass → [戦闘:win]
1. informed：test → shutdown → clear

#### q080 鉄胎の継承

決定地点：`region_8_f2 (15,5)`。場面：council、entry。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. compromise：minimum
1. contract：rule → [戦闘:win]
1. informed：council → maintenance → users → guardians → restore

#### q171 足音を持ち帰る

決定地点：`region_8_f1 (3,1)`。場面：entry、watch。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. return：begin → return
1. evacuate：begin → leave
1. loop：begin → rule → ward → loop
1. fight：begin → rule → ward → wait → fight → [戦闘:win]

#### q172 名前を返す井戸

決定地点：`region_8_f1 (4,1)`。場面：entry、well。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. new：well → new
1. seal：well → seal → [戦闘:win]
1. restore：mother → market → well → restore

#### q173 夜だけ帰る兵士

決定地点：`region_8_f1 (5,1)`。場面：entry、spirit。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. guest：wife → guest
1. part：wife → part
1. copy：wife → copy

#### q174 泣かない葬列

決定地点：`region_8_f1 (6,1)`。場面：entry、letter。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. seal：seal
1. rescue：people
1. name：hut → name

#### q175 狩人を待つ獣

決定地点：`region_8_f1 (8,1)`。場面：entry、hidden、route、warning。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. front：front → [戦闘:win]
1. changed：hidden → fight → [戦闘:win]
1. drive：fake → guide → warn

#### q176 神様の忘れ物

決定地点：`region_8_f2 (3,1)`。場面：entry、road。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. travel：give
1. stay：keep
1. season：road → agree

#### q177 嘘をつかない鏡

決定地点：`region_8_f2 (4,1)`。場面：entry、proof。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. notice：notice
1. close：close
1. correct：compare → correct
1. window：compare → window

#### q178 扉の向こうの明日

決定地点：`region_8_f2 (5,1)`。場面：entry、family、morning。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. close：close
1. wait：test → wait
1. cross：test → daughter

#### q179 墓を増やす庭

決定地点：`region_8_f2 (6,1)`。場面：entry、houses。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. burn：begin → cut
1. damage：begin → rush
1. starve：begin → visit → visit → visit → starve

#### q180 最後の怪談

決定地点：`region_8_f2 (8,1)`。場面：ending、entry。基準時点のモデル：1.0。実地図への場面接続：未実装。

1. seal：seal
1. ban：ban
1. home：scripts → original
1. new：scripts → new
