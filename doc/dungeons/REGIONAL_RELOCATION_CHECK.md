# 既存100件の移設前検証

2026-10-26。基点master `091b8085a4d27d1414529f25f1e2eddb43c0194b`。対象はオッドランド候補60件、サロメ候補40件。機械的な実行検証と、実際の移設採用を区別する。

[調査と採用条件](ODDLAND_RELOCATION_AUDIT.md) ／ [検証JSON](REGIONAL_RELOCATION_CHECK.json) ／ [再実行ツール](../../tools/audit-regional-relocation.mjs) ／ [個別の本文・帰路の作業](REGIONAL_RELOCATION_WORK.md)

## 結果と制限

100件・321結末の選択をVMで実行し、2422回の保存再開と2800件の世代別保存移行を確認した。5迷宮の通常出口・帰還印・敗北救助は、現在の所属先である灯帰りへ戻る。

全100件に実座標の `story.worldPlaces` がない。場面間移動・人物同行・受渡しは旧版の文章とフラグで表現され、現地イベントの座標に隊が留まる。今回の検証成功だけを理由に入口・受付を外国へ移さない。地図上の現場・帰路と旧遠征の互換を接続するまでは全件を採用保留とする。

分岐の到達性を調べるため、前提完了はfixture、資金5000G・道具99・高レベルの隊を使い、決定地点へ直接配置する。物語内の戦闘は勝利・可能な逃走・敗北を実行する。現場までの往復・無資金での踏破・自然な成長を今回測ったという意味ではない。選択時に資源0でも続行手段があること、報酬が再訪で重複しないことは別に検査する。

旧e2はq001改稿期、個人80件追加後、越境追加後、第一群10件追加後の4世代を、現在の版別定義と保持された旧bundleから再構成したfixture。ユーザー実保存の収集や過去全リリースの復元ではない。各依頼の未受注・受注済み・迷宮内・本文表示中・選択待ち・環境戦闘中・完了済みを現在のe2へ読み込み、既存フィールドを逐一比較した。新しい国での旧遠征を保証する試験ではない。

`npm run audit:relocation` でJSONと本文を再測定・生成し、`npm run check:relocation` で保存済み結果との一致を確認する。通常の `npm run check` でも専用試験が各依頼の実測値をJSONと照合する。固有装置の操作後の保存・帰還・再出発、入口だけを変更した場合の国表示変更とサロメ施設内保存の拒否は専用試験で別に再現する。

## 個別結果

### 鏡沈みの礼拝堂 → 巡礼台地

礼拝堂・巡礼の現場と周辺出張を区別する。宗教者を聖教会や狂火へ自動所属させない。

#### q031 遅れる祈り

決定地点：`region_4_f1 (11,9)`。場面：entry、night。現行モデル：1.0。実地図への場面接続：未実装。

- contract：break
- compromise：date
- informed：record → repair

#### q032 片目の聖像

決定地点：`region_4_f1 (9,11)`。場面：cell、entry、workshop。現行モデル：1.0。実地図への場面接続：未実装。

- contract：restore
- compromise：plate
- informed：look → opaque → stone

#### q033 映らない巡礼者

決定地点：`region_4_f1 (13,7)`。場面：entry、powder。現行モデル：1.0。実地図への場面接続：未実装。

- compromise：guest
- contract：reject
- informed：cloth → wash

#### q034 赦しの領収書

決定地点：`region_4_f1 (15,5)`。場面：consent、entry、reserved。現行モデル：1.0。実地図への場面接続：未実装。

- contract：recover
- informed：read → separate
- compromise：meeting → arrange

#### q035 鏡の向こうの施し

決定地点：`region_4_f1 (17,3)`。場面：consent、entry、patient。現行モデル：1.0。実地図への場面接続：未実装。

- contract：break
- compromise：table
- meal：deliver → food
- informed：deliver → ask → repair

#### q036 七番目の歌声

決定地点：`region_4_f2 (15,5)`。場面：credit、entry、recording。現行モデル：1.0。実地図への場面接続：未実装。

- contract：cut
- compromise：solo → memorial
- informed：solo → rehearse → program

#### q037 夜だけの告解

決定地点：`region_4_f2 (16,4)`。場面：entry、return。現行モデル：1.0。実地図への場面接続：未実装。

- contract：destroy
- compromise：seal
- informed：move → first → second → third → finish

#### q038 聖水の沈殿

決定地点：`region_4_f2 (13,7)`。場面：entry、filter、water。現行モデル：1.0。実地図への場面接続：未実装。

- contract：purge
- compromise：buy
- informed：sample → filter

#### q039 顔を売る仮面

決定地点：`region_4_f2 (17,3)`。場面：account、entry、owners。現行モデル：1.0。実地図への場面接続：未実装。

- contract：buyer
- compromise：gather → copies
- informed：gather → marks → register

#### q040 砕けない祈り

決定地点：`region_4_f2 (8,13)`。場面：after、entry、shadow、witness。現行モデル：1.0。実地図への場面接続：未実装。

- compromise：isolate
- contract：seal → [戦闘:win]
- informed：listen → copy → defend → [戦闘:win]
- fragment：listen → fight → [戦闘:win] → fragment

#### q131 逆向きの足跡

決定地点：`region_4_f1 (3,1)`。場面：credit、entry、lost、room。現行モデル：1.0。実地図への場面接続：未実装。

- person：test → person
- sample：test → sample
- all：test → both → all
- school：test → both → school

#### q132 宝箱の底の椅子

決定地点：`region_4_f1 (5,1)`。場面：entry、isolate、test。現行モデル：1.0。実地図への場面接続：未実装。

- destroy：destroy → [戦闘:win]
- isolate：room → decoy → seal

#### q133 一段足りない階段

決定地点：`region_4_f1 (6,1)`。場面：entry、platform、warning。現行モデル：1.0。実地図への場面接続：未実装。

- save：weight → save
- stairs：weight → stairs

#### q134 敗者の宝物庫

決定地点：`region_4_f1 (8,1)`。場面：entry、return。現行モデル：1.0。実地図への場面接続：未実装。

- decline：decline
- sword：rule → sword
- parcel：rule → parcel
- break：break → [戦闘:win]

#### q135 水底の朝食

決定地点：`region_4_f1 (9,1)`。場面：entry、reply。現行モデル：1.0。実地図への場面接続：未実装。

- lift：lift
- break：break
- stop：listen → answer

#### q136 翻訳しない扉

決定地点：`region_4_f2 (3,1)`。場面：entry、purpose、record、refused。現行モデル：1.0。実地図への場面接続：未実装。

- study：reply → study
- shelter：reply → shelter
- break：break → [戦闘:win]
- leave：reply → loot → leave

#### q137 燃え残る図書館

決定地点：`region_4_f2 (4,1)`。場面：entry、read。現行モデル：1.0。実地図への場面接続：未実装。

- close：close
- medicine：medicine → page → page → page → carry_medicine
- prepare：medicine → page → page → page → prepare
- family：family → page → page → page → carry_family
- language：language → page → page → page → carry_language

#### q138 行き止まりの探検家

決定地点：`region_4_f2 (5,1)`。場面：entry、pupil。現行モデル：1.0。実地図への場面接続：未実装。

- together：map → together
- talk：map → talk
- solo：map → solo
- correct：map → correct

#### q139 ふたつの出口

決定地点：`region_4_f2 (6,1)`。場面：air、entry、rooms。現行モデル：1.0。実地図への場面接続：未実装。

- many：many
- wounded：measure → wounded
- both：measure → air → tools

#### q140 迷宮の休業日

決定地点：`region_4_f2 (9,1)`。場面：entry、talk。現行モデル：1.0。実地図への場面接続：未実装。

- loot：loot
- treaty：rescue → declare
- close：rescue → close
- leave：rescue → leave

### 黒潮の沈没城 → 旧王領の村

城の水域・浮上・水上出口を接続する。海王や既存の水没を古代の大水門・アダの事件と結び付けない。

#### q061 濡れない海図

決定地点：`region_7_f1 (9,11)`。場面：air、entry。現行モデル：1.0。実地図への場面接続：未実装。

- contract：sea
- compromise：local
- informed：trial → next → rescue

#### q062 王の救命胴衣

決定地点：`region_7_f1 (11,9)`。場面：entry。現行モデル：1.0。実地図への場面接続：未実装。

- informed：names
- compromise：heirs
- contract：treasure

#### q063 潮に逆らう階段

決定地点：`region_7_f1 (13,7)`。場面：balance、entry。現行モデル：1.0。実地図への場面接続：未実装。

- contract：pin
- compromise：vent
- informed：weight → add → fix

#### q064 届く砲声

決定地点：`region_7_f1 (8,12)`。場面：bay、entry、pressure。現行モデル：1.0。実地図への場面接続：未実装。

- contract：break
- informed：before → bell
- compromise：before → schedule

#### q065 水中の火葬

決定地点：`region_7_f1 (15,5)`。場面：entry、tide。現行モデル：1.0。実地図への場面接続：未実装。

- contract：oil
- compromise：shore
- informed：wait → wait → join

#### q066 珊瑚の軍議

決定地点：`region_7_f2 (15,5)`。場面：empty、entry、evacuated。現行モデル：1.0。実地図への場面接続：未実装。

- contract：honor
- compromise：carry → facts
- informed：carry → manifest → rewrite

#### q067 人魚の筆談

決定地点：`region_7_f2 (17,3)`。場面：balanced、entry、surge。現行モデル：1.0。実地図への場面接続：未実装。

- contract：force
- compromise：stop
- informed：small → gate

#### q068 二つの錨

決定地点：`region_7_f2 (8,13)`。場面：entry、raft、secured。現行モデル：1.0。実地図への場面接続：未実装。

- contract：cut
- compromise：fix
- informed：light → rope → cut
- cargo：light → people → abandon

#### q069 海王の通行税

決定地点：`region_7_f2 (9,12)`。場面：entry、passed、work。現行モデル：1.0。実地図への場面接続：未実装。

- compromise：pay → leave
- informed：help → shared
- contract：force → [戦闘:win]

#### q070 沈没城の浮上

決定地点：`region_7_f2 (13,7)`。場面：districts、entry。現行モデル：1.0。実地図への場面接続：未実装。

- compromise：salvage
- contract：all → [戦闘:win]
- informed：divide → evacuate → outer → store → core

#### q161 治さない傷

決定地点：`region_7_f1 (3,1)`。場面：consent、entry。現行モデル：1.0。実地図への場面接続：未実装。

- wait：wait
- heal：wish → sera
- recorded：record → recorded

#### q162 騎士の盾を借りる

決定地点：`region_7_f1 (4,1)`。場面：ceremony、entry、tell。現行モデル：1.0。実地図への場面接続：未実装。

- ceremony：rope → ceremony
- workshop：rope → workshop
- return：rope → return

#### q163 盗賊の初仕事

決定地点：`region_7_f1 (5,1)`。場面：entry、repay。現行モデル：1.0。実地図への場面接続：未実装。

- repair：new
- later：later
- repay：old → agree

#### q164 吟遊詩人抜きの宴

決定地点：`region_7_f1 (6,1)`。場面：entry、prepare、together。現行モデル：1.0。実地図への場面接続：未実装。

- explain：explain
- secret：secret → party
- listen：bring → wait
- song：bring → song

#### q165 仲間を外す依頼

決定地点：`region_7_f1 (8,1)`。場面：entry、private、public。現行モデル：1.0。実地図への場面接続：未実装。

- decline：decline
- open：open → agree
- secret：[イル不在] → private → secret

#### q166 最後の一撃を譲れ

決定地点：`region_7_f2 (3,1)`。場面：entry、interview、report、trial。現行モデル：1.0。実地図への場面接続：未実装。

- retry：rules → train
- joint：rules → battle → [戦闘:win] → honest
- lie：rules → battle → [戦闘:win] → lie
- interview：rules → battle → [戦闘:escape] → honest

#### q167 軍師のいない勝利

決定地点：`region_7_f2 (4,1)`。場面：blocked、entry、report。現行モデル：1.0。実地図への場面接続：未実装。

- retreat：retreat
- ours：ridge → [戦闘:win] → ours
- hers：ridge → [戦闘:win] → hers

#### q168 ふたりでひとり分の報酬

決定地点：`region_7_f2 (5,1)`。場面：adjust、entry、invoice、separated。現行モデル：1.0。実地図への場面接続：未実装。

- pair：pair → wait → pair
- separate：pair → wait → separate
- flex：pair → wait → flex

#### q169 誰にも贈れない指輪

決定地点：`region_7_f2 (8,1)`。場面：entry、friendship、later、recipient、report。現行モデル：1.0。実地図への場面接続：未実装。

- honest：deliver → return → honest
- soft：deliver → message → back → soft
- corrected：deliver → return → lie → admit
- lie：deliver → return → lie → silent

#### q170 別れるための冒険

決定地点：`region_7_f2 (9,1)`。場面：entry、role。現行モデル：1.0。実地図への場面接続：未実装。

- send：send
- holiday：holiday
- role：role → agree

### 星欠けの地下観測所 → 旧王領の周辺

天球儀の状態と帰路を保つ。後半の停戦・捕虜・終戦を最終盤のトルネア侵攻として確定しない。

#### q081 落ちてこない星

決定地点：`region_9_f1 (11,9)`。場面：entry、show。現行モデル：1.0。実地図への場面接続：未実装。

- compromise：delay
- contract：destroy
- informed：project → correct

#### q082 星売りの空瓶

決定地点：`region_9_f1 (13,7)`。場面：entry、label、spent、temperature。現行モデル：1.0。実地図への場面接続：未実装。

- contract：heat
- compromise：refund
- informed：hand → normal → instructions

#### q083 地底の日食

決定地点：`region_9_f1 (15,5)`。場面：entry、scaffold。現行モデル：1.0。実地図への場面接続：未実装。

- contract：stop
- compromise：calendar
- informed：cycle → dates
- repaired：cycle → only

#### q084 帰還信号

決定地点：`region_9_f1 (9,11)`。場面：beacon、crossing、entry。現行モデル：1.0。実地図への場面接続：未実装。

- contract：recover
- compromise：source → handoff
- informed：source → trail → reach

#### q085 方位のない羅針盤

決定地点：`region_9_f1 (17,3)`。場面：entrance、entry、leader、marker。現行モデル：1.0。実地図への場面接続：未実装。

- contract：north
- informed：bag → entrance → exit
- compromise：bag → leader → relay

#### q086 百年前の観測者

決定地点：`region_9_f2 (13,7)`。場面：entry、mail、mapping。現行モデル：1.0。実地図への場面接続：未実装。

- compromise：old
- contract：discard
- informed：reply → repair → table

#### q087 願いを消す流星

決定地点：`region_9_f2 (15,5)`。場面：entry、firststep、ticket。現行モデル：1.0。実地図への場面接続：未実装。

- compromise：notebook
- contract：break
- informed：test → wording → act

#### q088 観測窓の亀裂

決定地点：`region_9_f2 (17,3)`。場面：entry、observe、panel。現行モデル：1.0。実地図への場面接続：未実装。

- compromise：inspection
- contract：metal
- informed：layers → replace → sky

#### q089 逆さまの天球儀

決定地点：`region_9_f2 (8,13)`。場面：dates、entry。現行モデル：1.0。実地図への場面接続：未実装。

- compromise：two
- contract：gears
- informed：turn → wedding → wages → switch

#### q090 空を返す日

決定地点：`region_9_f2 (12,9)`。場面：entry、open、schedule。現行モデル：1.0。実地図への場面接続：未実装。

- compromise：surface
- contract：full → [戦闘:win]
- informed：battery → hour → close
- overrun：battery → hour → longer

#### q181 白い矢筒

決定地点：`region_9_f1 (3,1)`。場面：entry、signal。現行モデル：1.0。実地図への場面接続：未実装。

- rescue：front
- withdraw：withdraw
- meet：ask → meet

#### q182 一発も撃たない砲手

決定地点：`region_9_f1 (4,1)`。場面：entry。現行モデル：1.0。実地図への場面接続：未実装。

- attack：attack
- hold：hold
- light：command → evac → light

#### q183 勝者の洗濯場

決定地点：`region_9_f1 (5,1)`。場面：entry、support。現行モデル：1.0。実地図への場面接続：未実装。

- report：report
- hidden：hidden
- supported：families → goods

#### q184 捕虜の鍋

決定地点：`region_9_f1 (6,1)`。場面：entry、joint。現行モデル：1.0。実地図への場面接続：未実装。

- take：take
- other：other
- joint：joint → agree

#### q185 橋を落とさない理由

決定地点：`region_9_f1 (8,1)`。場面：entry。現行モデル：1.0。実地図への場面接続：未実装。

- boat：boat
- early：early
- families：hold → [戦闘:win]

#### q186 返事のない停戦

決定地点：`region_9_f2 (3,1)`。場面：authority、entry。現行モデル：1.0。実地図への場面接続：未実装。

- local：local
- withdraw：withdraw
- battle：break → [戦闘:win]

#### q187 旗を持たない兵士

決定地点：`region_9_f2 (4,1)`。場面：contract、entry。現行モデル：1.0。実地図への場面接続：未実装。

- army：evac → army
- village：evac → village
- leave：evac → leave

#### q188 帰還兵の席

決定地点：`region_9_f2 (5,1)`。場面：entry、work。現行モデル：1.0。実地図への場面接続：未実装。

- arrived：arrived
- old：talk → old
- share：talk → share
- apart：talk → apart

#### q189 敵国の子守歌

決定地点：`region_9_f2 (6,1)`。場面：entry、explain。現行モデル：1.0。実地図への場面接続：未実装。

- private：private
- hold：hold
- ban：ban
- explain：book → public

#### q190 終戦翌日の魔物

決定地点：`region_9_f2 (9,1)`。場面：cleanup、entry。現行モデル：1.0。実地図への場面接続：未実装。

- evac：evac
- only：battle → [戦闘:win] → only
- collect：battle → [戦闘:win] → site → site → site → store → collect

### 灰時計の書庫 → 灰時計の書庫周辺

既存e2_academy・e2_archive・e2_stacksと入口を統合する。技能貸出と返却、イルの個人連作を維持する。

#### q041 返却日のない本

決定地点：`region_5_f1 (15,5)`。場面：clerk、entry、resident。現行モデル：1.0。実地図への場面接続：未実装。

- contract：recover
- compromise：visit → deadline
- informed：visit → registry → rewrite

#### q042 砂時計の残業

決定地点：`region_5_f1 (17,3)`。場面：entry、sand、shift。現行モデル：1.0。実地図への場面接続：未実装。

- contract：break
- compromise：outside → two
- informed：sample → hours

#### q043 墨を食う火

決定地点：`region_5_f1 (9,12)`。場面：entry、restore。現行モデル：1.0。実地図への場面接続：未実装。

- contract：seal
- informed：valve → restore
- compromise：valve → blanks

#### q044 未来の訃報

決定地点：`region_5_f1 (10,11)`。場面：entry、office、safe。現行モデル：1.0。実地図への場面接続：未実装。

- contract：destroy
- compromise：warn → escape
- informed：office → publish

#### q045 白紙の相続

決定地点：`region_5_f1 (11,10)`。場面：conference、draft、entry。現行モデル：1.0。実地図への場面接続：未実装。

- compromise：witness
- contract：restore
- informed：cool → gather → minutes

#### q046 迷子の索引

決定地点：`region_5_f2 (11,9)`。場面：entry、ferry、rain、river。現行モデル：1.0。実地図への場面接続：未実装。

- contract：straight
- compromise：index → exit
- informed：index → river → ferry → link

#### q047 一頁の戦争

決定地点：`region_5_f2 (13,7)`。場面：entry、home、other、vault。現行モデル：1.0。実地図への場面接続：未実装。

- contract：return
- informed：other → parallel
- compromise：home → vault → deliver

#### q048 眠る校正者

決定地点：`region_5_f2 (15,5)`。場面：entry、final、morning。現行モデル：1.0。実地図への場面接続：未実装。

- contract：break
- compromise：team
- informed：correct → freeze → seal

#### q049 忘却の栞

決定地点：`region_5_f2 (17,3)`。場面：entry、scope、test。現行モデル：1.0。実地図への場面接続：未実装。

- contract：burn
- compromise：map
- informed：remove → split → return

#### q050 止まった終章

決定地点：`region_5_f2 (9,12)`。場面：copies、entry、requests、warehouse。現行モデル：1.0。実地図への場面接続：未実装。

- contract：stop
- compromise：copy → close
- informed：follow → extension → publish

#### q141 音の出ない優勝旗

決定地点：`region_5_f1 (3,1)`。場面：entry、sana。現行モデル：1.0。実地図への場面接続：未実装。

- new：new
- silent：silent
- use：ask → use

#### q142 偽物職人の本物

決定地点：`region_5_f1 (4,1)`。場面：buyer、entry。現行モデル：1.0。実地図への場面接続：未実装。

- refuse：refuse
- refund：tell → refund
- repair：tell → repair

#### q143 辛くない火吹き料理

決定地点：`region_5_f1 (5,1)`。場面：entry、roles。現行モデル：1.0。実地図への場面接続：未実装。

- fire：hire
- taste：taste
- shift：roles → agree

#### q144 祭の悪役

決定地点：`region_5_f1 (6,1)`。場面：entry、play。現行モデル：1.0。実地図への場面接続：未実装。

- retire：retire
- light：trial → light
- wit：trial → wit

#### q145 花を咲かせない庭

決定地点：`region_5_f1 (9,1)`。場面：entry、letter。現行モデル：1.0。実地図への場面接続：未実装。

- now：now
- half：half
- waited：wait → open

#### q146 染め直せない軍服

決定地点：`region_5_f2 (3,1)`。場面：entry、friends。現行モデル：1.0。実地図への場面接続：未実装。

- coat：coat
- keep：keep
- release：friends → release

#### q147 一番遅い配達

決定地点：`region_5_f2 (4,1)`。場面：closed、entry。現行モデル：1.0。実地図への場面接続：未実装。

- quiet：water
- tomorrow：run → tomorrow
- record：run → record

#### q148 贋金より軽い金

決定地点：`region_5_f2 (5,1)`。場面：denied、entry、proof。現行モデル：1.0。実地図への場面接続：未実装。

- remove：remove
- public：test → public
- private：test → private

#### q149 売らない剣

決定地点：`region_5_f2 (6,1)`。場面：entry、user。現行モデル：1.0。実地図への場面接続：未実装。

- collector：collector
- withdraw：withdraw
- user：user → pay

#### q150 大道芸人の弟子

決定地点：`region_5_f2 (8,1)`。場面：accident、audience、company、contracts、entry、repair。現行モデル：1.0。実地図への場面接続：未実装。

- none：practice → cancel
- porter：practice → porter → thief → porter
- thief：practice → porter → thief → thief
- singer：practice → porter → singer → singer
- company：practice → porter → thief → company → agree

### 鉄胎の機関廟 → 遺物管理区・外縁調査道

既存e2_workshop・e2_relic・e2_storageを保持する。ミカの所属組織と機関廟の所有権を新たに断定しない。

#### q071 止まれない門番

決定地点：`region_8_f1 (9,11)`。場面：entry、worker。現行モデル：1.0。実地図への場面接続：未実装。

- compromise：power
- informed：retired → call
- contract：dismantle → [戦闘:win]

#### q072 油の洗礼

決定地点：`region_8_f1 (11,9)`。場面：entry、oil、warm。現行モデル：1.0。実地図への場面接続：未実装。

- contract：discard
- compromise：heat → keep
- informed：oil → separate

#### q073 天使の予備腕

決定地点：`region_8_f1 (13,7)`。場面：copy、entry、support。現行モデル：1.0。実地図への場面接続：未実装。

- contract：take
- informed：brace → recover
- compromise：borrow → return

#### q074 祈祷の順番

決定地点：`region_8_f1 (15,5)`。場面：door、entry、furnace、lock。現行モデル：1.0。実地図への場面接続：未実装。

- compromise：manual
- contract：force → [戦闘:win]
- informed：cool → furnace → correct

#### q075 無給の聖者

決定地点：`region_8_f1 (7,13)`。場面：entry、parts、running。現行モデル：1.0。実地図への場面接続：未実装。

- compromise：share
- contract：rewrite → [戦闘:win]
- informed：gear → deliver → translate
- once：gear → deliver → once

#### q076 鉄の子守歌

決定地点：`region_8_f2 (17,3)`。場面：control、entry、moved。現行モデル：1.0。実地図への場面接続：未実装。

- contract：off
- informed：line → rewire
- compromise：medicine → stop

#### q077 聖痕の配線

決定地点：`region_8_f2 (8,13)`。場面：entry、outage。現行モデル：1.0。実地図への場面接続：未実装。

- compromise：fence
- contract：scrape
- informed：cutpower → lamps

#### q078 部品の記憶

決定地点：`region_8_f2 (13,8)`。場面：bench、entry。現行モデル：1.0。実地図への場面接続：未実装。

- compromise：manual
- contract：erase
- informed：train → hammer → needle → save

#### q079 九十九回の再起動

決定地点：`region_8_f2 (15,6)`。場面：archive、entry、full。現行モデル：1.0。実地図への場面接続：未実装。

- compromise：test → small
- contract：bypass → [戦闘:win]
- informed：test → shutdown → clear

#### q080 鉄胎の継承

決定地点：`region_8_f2 (15,5)`。場面：council、entry。現行モデル：1.0。実地図への場面接続：未実装。

- compromise：minimum
- contract：rule → [戦闘:win]
- informed：council → maintenance → users → guardians → restore

#### q171 足音を持ち帰る

決定地点：`region_8_f1 (3,1)`。場面：entry、watch。現行モデル：1.0。実地図への場面接続：未実装。

- return：begin → return
- evacuate：begin → leave
- loop：begin → rule → ward → loop
- fight：begin → rule → ward → wait → fight → [戦闘:win]

#### q172 名前を返す井戸

決定地点：`region_8_f1 (4,1)`。場面：entry、well。現行モデル：1.0。実地図への場面接続：未実装。

- new：well → new
- seal：well → seal → [戦闘:win]
- restore：mother → market → well → restore

#### q173 夜だけ帰る兵士

決定地点：`region_8_f1 (5,1)`。場面：entry、spirit。現行モデル：1.0。実地図への場面接続：未実装。

- guest：wife → guest
- part：wife → part
- copy：wife → copy

#### q174 泣かない葬列

決定地点：`region_8_f1 (6,1)`。場面：entry、letter。現行モデル：1.0。実地図への場面接続：未実装。

- seal：seal
- rescue：people
- name：hut → name

#### q175 狩人を待つ獣

決定地点：`region_8_f1 (8,1)`。場面：entry、hidden、route、warning。現行モデル：1.0。実地図への場面接続：未実装。

- front：front → [戦闘:win]
- changed：hidden → fight → [戦闘:win]
- drive：fake → guide → warn

#### q176 神様の忘れ物

決定地点：`region_8_f2 (3,1)`。場面：entry、road。現行モデル：1.0。実地図への場面接続：未実装。

- travel：give
- stay：keep
- season：road → agree

#### q177 嘘をつかない鏡

決定地点：`region_8_f2 (4,1)`。場面：entry、proof。現行モデル：1.0。実地図への場面接続：未実装。

- notice：notice
- close：close
- correct：compare → correct
- window：compare → window

#### q178 扉の向こうの明日

決定地点：`region_8_f2 (5,1)`。場面：entry、family、morning。現行モデル：1.0。実地図への場面接続：未実装。

- close：close
- wait：test → wait
- cross：test → daughter

#### q179 墓を増やす庭

決定地点：`region_8_f2 (6,1)`。場面：entry、houses。現行モデル：1.0。実地図への場面接続：未実装。

- burn：begin → cut
- damage：begin → rush
- starve：begin → visit → visit → visit → starve

#### q180 最後の怪談

決定地点：`region_8_f2 (8,1)`。場面：ending、entry。現行モデル：1.0。実地図への場面接続：未実装。

- seal：seal
- ban：ban
- home：scripts → original
- new：scripts → new
