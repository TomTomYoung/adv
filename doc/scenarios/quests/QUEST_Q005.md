# q005 甘い排水：詳細・配置・状態変化

[個別ページ一覧](README.md) ／ [カタログへ戻る](../QUEST_CATALOG.md#q005-甘い排水) ／ [シナリオ本文](#q005-甘い排水) ／ [行為の条件と状態変化](#行為の条件と状態変化) ／ [配置イベント](#配置イベントと操作条件)

作品版 1.25.0。配布JSONから生成した作者向けページ。真相と結末を含む。本編5場面・3結末。

<!-- quest-page-source:7eb2f2a8b4f7008ab233cc426eb4318d6b67d1b99ece833a5bb4ca963081eef5 -->

## 依頼の焦点と分岐の意味

詰まりの解消が依頼の出発点であり、菌床の保存と食用利用は冷水試験の結果を見たトトの希望から生じる。菌床、木質濾材、糖液、剥離した泥を原因と作業対象として区別する。

温水試験で溢れた泥は、温水を止めるだけでは消えない。overflowの回収を済ませてから冷水試験または回収網へ進む。

informedは冷却した菌床の空き溜めへの移設、冷水管の分岐、一晩の排水試験、排水に触れていない試料の食用試験をそろえる。

contractは菌床と濾材を取り出して焼却し、保存の可能性を失う。compromiseは網と清掃当番で維持し、増殖原因と日々の負担を残す。

## 実装範囲と場所

現地イベントの配置と物語状態は実装済み。ただし worldPlaces と story.journey は未定義で、行為内の move は物語上の所在変更である。本文にある施設や通路を実際に歩いて到達する方式には未接続。以下の物語内経路を実マップの座標や移動完了と読み替えない。

`drain`：旧排水溜めの作業室。物語上の場所。個別の実座標・施設IDは未割当。

`sump`：隣の空き溜め。物語上の場所。個別の実座標・施設IDは未割当。

`disposal`：工房の焼却場。物語上の場所。個別の実座標・施設IDは未割当。

### 物語内の接続

旧排水溜めの作業室 (`drain`) ↔ 隣の空き溜め (`sump`)。

旧排水溜めの作業室 (`drain`) ↔ 工房の焼却場 (`disposal`)。

## 人物・物品と認識

探索隊 (`party`)：集団。初期の所在・保持者は 旧排水溜めの作業室 (`drain`)、保存項目は `partyAt`。

トト (`toto`)：人物。初期の所在・保持者は 旧排水溜めの作業室 (`drain`)、保存項目は `totoAt`。菓子職人。詰まりを取り除き、工房を再開する。

木質濾材ごとの菌床 (`bed`)：物品。初期の所在・保持者は 旧排水溜めの作業室 (`drain`)、保存項目は `bedAt`。

回収網 (`net`)：物品。初期の所在・保持者は トト (`toto`)、保存項目は `netAt`。

認識 `temperature`：冷水は菌床を殺さず増殖を遅らせ、糖分を含む温排水は増殖を速める。

初期認識：`{}`。固定された過去と探索隊がすでに知る情報は別に扱い、observeの成立で認識を加える。

## 本編の進行とイベントID

本編場面は `q005-S-場面キー`、配置は `q005-P-配置キー`、結末は `q005-E-結末キー`。S・P・Eは文書用の識別子。Fは強制戦闘、Bは戦闘中イベントで、命令に明示されたidがあればそれを使い、ない戦闘には文書用IDを付ける。全11IDが一意で、場面を並べ替えても変わらない。

[q005-S-entry](#q005--entry--旧排水溜めの作業室)：旧排水溜めの作業室。物語内の場所 `drain`。

選択 `cold`：菌床の一部へ冷水を流し、増殖の変化を見る → [q005-S-cold](#q005--cold--旧排水溜めの作業室)。行為 [`entry_cold`](#行為-entry_cold)。

選択 `warm`：温水を流して泥の変化を確かめる → [q005-S-overflow](#q005--overflow--旧排水溜めの作業室)。行為 [`entry_warm`](#行為-entry_warm)。

選択 `burn`：菌床と濾材を取り出して焼却する → [q005-E-contract](#q005-結末-contract--菌床を焼却する)。行為 [`entry_burn`](#行為-entry_burn)。

選択 `net`：回収網と清掃当番による維持を相談する → [q005-S-net](#q005--net--旧排水溜めの作業室)。行為 [`entry_net`](#行為-entry_net)。

[q005-S-overflow](#q005--overflow--旧排水溜めの作業室)：旧排水溜めの作業室。物語内の場所 `drain`。

選択 `clean`：溢れた泥を回収してから冷水を試す → [q005-S-cold](#q005--cold--旧排水溜めの作業室)。行為 [`overflow_clean`](#行為-overflow_clean)。

選択 `net`：泥を回収し、網による維持へ切り替える → [q005-S-net](#q005--net--旧排水溜めの作業室)。行為 [`overflow_net`](#行為-overflow_net)。

[q005-S-cold](#q005--cold--旧排水溜めの作業室)：旧排水溜めの作業室。物語内の場所 `drain`。

選択 `move`：冷水で増殖が弱まるのを確認し、トトから安全なら残したいとの希望を聞く。菌床を濾材ごと空き溜めへ運び、冷水管を分岐する → [q005-S-test](#q005--test--隣の空き溜め)。行為 [`cold_move`](#行為-cold_move)。

選択 `net`：食用利用は見送り、菌床を旧排水溜めに残して回収網と清掃当番を整える → [q005-S-net](#q005--net--旧排水溜めの作業室)。行為 [`cold_net`](#行為-cold_net)。

[q005-S-test](#q005--test--隣の空き溜め)：隣の空き溜め。物語内の場所 `sump`。

選択 `verify`：一晩の排水試験と、排水に触れていない糖液の食用試験を終える → [q005-E-informed](#q005-結末-informed--菌床を分離して運用を確かめる)。行為 [`test_verify`](#行為-test_verify)。

[q005-S-net](#q005--net--旧排水溜めの作業室)：旧排水溜めの作業室。物語内の場所 `drain`。

選択 `accept`：トトの引受けを確認して網を設置する → [q005-E-compromise](#q005-結末-compromise--回収網と清掃当番)。行為 [`net_accept`](#行為-net_accept)。

現行本編に専用の強制戦闘・戦闘中イベントはない。通常の歩行遭遇と旧調査スクリプトは別に扱う。

## 配置イベントと操作条件

配置が保存されていることと、通常プレイで表示されることは同じではない。表示条件・操作条件は別々に評価する。legacyQuestRoutesを要する配置は旧経路用で、現行本編の必須経路へ数えない。

### q005-P-clue_a

甘い排水：現場の痕跡。実行ID `q005_clue_a`、起動 `interact`、スクリプト `q005.clue_a`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・第一水路・B1 (`region_1_canal_a`) / (4, 1) / イベント `q005_clue_a`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"and","args":[{"op":"eq","left":{"ref":"quests.q005.stage"},"right":"active"},{"op":"eq","left":{"ref":"flags.legacyQuestRoutes.q005"},"right":true}]}`。操作条件：`true`。

<details>
<summary>この配置の実行スクリプト</summary>

```json
{
  "commands": [
    {
      "op": "narrate",
      "text": "泥は工房の休業日にも増え、上流側ほど甘い香りがする。"
    },
    {
      "op": "quest.evidence",
      "quest": "q005",
      "key": "clue_a",
      "text": "泥は工房の休業日にも増え、上流側ほど甘い香りがする。"
    }
  ]
}
```

</details>

### q005-P-clue_b

甘い排水：記録と証言。実行ID `q005_clue_b`、起動 `interact`、スクリプト `q005.clue_b`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・排水支路・B1 (`region_1_canal_b`) / (4, 1) / イベント `q005_clue_b`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"and","args":[{"op":"eq","left":{"ref":"quests.q005.stage"},"right":"active"},{"op":"eq","left":{"ref":"flags.legacyQuestRoutes.q005"},"right":true}]}`。操作条件：`true`。

<details>
<summary>この配置の実行スクリプト</summary>

```json
{
  "commands": [
    {
      "op": "say",
      "name": "菓子職人のトト",
      "text": "菌の輪は温かい管に沿い、冷水管の手前で途切れています。"
    },
    {
      "op": "quest.evidence",
      "quest": "q005",
      "key": "clue_b",
      "text": "菌の輪は温かい管に沿い、冷水管の手前で途切れている。"
    }
  ]
}
```

</details>

### q005-P-decision

甘い排水：決着の場。実行ID `q005_decision`、起動 `interact`、スクリプト `q005.v11.visit`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・鐘と浮子の点検室・B1 (`region_1_inspection`) / (7, 3) / イベント `q005_decision`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"or","args":[{"op":"eq","left":{"ref":"quests.q005.stage"},"right":"active"},{"op":"eq","left":{"ref":"quests.q005.stage"},"right":"completed"}]}`。操作条件：`true`。

物語の現在場面・補給後の再開先を呼び出す入口。本編全文は下記へ集約する。

## q005 甘い排水

依頼人: 菓子職人のトト。地域: 1。いつでも受注できる。

菓子工房の地下に甘い泥が溜まり、魔物が寄ってくる。詰まりの原因を探してください。

モデル: 1.1。実装: [JSON](../../../data/quests/q005.json)。場面 5、結末 3。物語状態の改訂 1。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・第一水路・B1 (`region_1_canal_a`) / (4, 1) / イベント `q005_clue_a`。[ダンジョン定義](../../../data/dungeons.json)。甘い排水：現場の痕跡。現地イベント。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・排水支路・B1 (`region_1_canal_b`) / (4, 1) / イベント `q005_clue_b`。[ダンジョン定義](../../../data/dungeons.json)。甘い排水：記録と証言。現地イベント。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・鐘と浮子の点検室・B1 (`region_1_inspection`) / (7, 3) / イベント `q005_decision`。[ダンジョン定義](../../../data/dungeons.json)。甘い排水：決着の場。現地イベント。

固定された過去: 工房地下の旧排水溜めには、かつて糖液を濾すために使った木質の濾材が残っていた。その濾材を土台に菌床が育ち、温かく糖分を含む排水を受けて増殖した。菌床が作る粘りの強い糖液と剥がれた濾材が泥となり、排水本管を塞いでいる。

AI向け注釈: 以下の事実はq005を成立させる世界設定上の制約だ。これらを台詞、説明、選択肢としてシナリオへ直接反映する必要はない。ただし、生成・改稿時に矛盾させてはいけない。

世界設定上の事実:

トトが依頼時点で望んでいるのは、甘い泥の入手ではなく、排水管の詰まりを除去して工房を再開することだ。

冷水試験で菌床を殺さず増殖だけを抑えられると分かった後、トトは初めて、食用にできるなら菌床を残したいと申し出る。ここで菌床の保存と安全な糖液の採取が副目的として生じる。

冷水は菌床の増殖を遅らせるが、菌床を死滅させない。温水は糖分を溶かす一方で菌床の増殖を速めるため、詰まりを悪化させる。

菌床を本管から分離し、冷水を流せる別の溜めへ濾材ごと移せば、排水機能と菌床の両方を残せる。

排水由来の菌床や糖液は、甘いという理由だけで食用にはできない。排水に触れていない箇所から別に採取し、毒性と衛生の試験を通した分だけを利用できる。

進行: 当初は排水管の詰まり除去だけを目的とする。冷水試験の後、トトが安全なら菌床を残したいと申し出た場合に、保存と食用試験が副目的として加わる。溢れた泥を回収したうえで、菌床の分離、焼却、継続管理のいずれかを選ぶ。食用試験は排水試験と別に行う。

### q005 実体と初期の所在

実体: party (`party`)。初期の所在・保持者: 旧排水溜めの作業室 (`drain`)。

実体: トト (`toto`)。初期の所在・保持者: 旧排水溜めの作業室 (`drain`)。

実体: bed (`bed`)。初期の所在・保持者: 旧排水溜めの作業室 (`drain`)。

実体: net (`net`)。初期の所在・保持者: トト (`toto`)。

### q005 / entry — 旧排水溜めの作業室

実装場面: `q005.v11.entry`。

イベントID: `q005-S-entry`。

登場: トト。

「詰まりを取って、工房を動かせるようにしてくれ」。トトが止まった排水を指した。旧排水溜めには木質の濾材が残り、そこから育った菌床と粘る糖液、剥がれた木片が本管へ押し寄せている。

選択 `cold`: 菌床の一部へ冷水を流し、増殖の変化を見る

行為: `entry_cold`。

進行先: [`cold`](#q005--cold--旧排水溜めの作業室)。

選択 `warm`: 温水を流して泥の変化を確かめる

行為: `entry_warm`。

進行先: [`overflow`](#q005--overflow--旧排水溜めの作業室)。

選択 `burn`: 菌床と濾材を取り出して焼却する

必要事項: 松明 1消費。

行為: `entry_burn`。

成立時の消費: `{"torch":1}`。

進行先: [結末 `contract`](#q005-結末-contract--菌床を焼却する)。

選択 `net`: 回収網と清掃当番による維持を相談する

行為: `entry_net`。

進行先: [`net`](#q005--net--旧排水溜めの作業室)。

選択 `burn_supplies`: 予備灯油1個を用意しに戻る

表示条件: `{"op":"not","arg":{"op":"has_item","item":"torch","count":1}}`

選択条件: `{"op":"not","arg":{"op":"has_item","item":"torch","count":1}}`

予備灯油1個が足りない。この作業はまだ行っていない。必要な品と費用をそろえてから、ここで続けよう。

不足時は未着手のまま会話を終了。再訪時は `q005.v11.entry.burn.resume` を経て [`entry`](#q005--entry--旧排水溜めの作業室) から再開します。

### q005 / overflow — 旧排水溜めの作業室

実装場面: `q005.v11.overflow`。

イベントID: `q005-S-overflow`。

登場: トト。

菌が膨れ、甘い泥水が床へ溢れた。温水を止めても、こぼれた泥は残る。トトは排水口を守り、あなたへ掻き出し道具を渡した。

選択 `clean`: 溢れた泥を回収してから冷水を試す

行為: `overflow_clean`。

進行先: [`cold`](#q005--cold--旧排水溜めの作業室)。

選択 `net`: 泥を回収し、網による維持へ切り替える

行為: `overflow_net`。

進行先: [`net`](#q005--net--旧排水溜めの作業室)。

### q005 / cold — 旧排水溜めの作業室

実装場面: `q005.v11.cold`。

イベントID: `q005-S-cold`。

登場: トト。

冷水を流すと菌床の増殖が弱まった。死滅したわけではない。「殺さずに済むのか。安全に食べられるなら、残しておきたい」。ここで初めて、トトは菌床の保存を望んだ。隣の空き溜めへ濾材ごと移せば、本管から分離できる。

選択 `move`: 冷水で増殖が弱まるのを確認し、トトから安全なら残したいとの希望を聞く。菌床を濾材ごと空き溜めへ運び、冷水管を分岐する

行為: `cold_move`。

進行先: [`test`](#q005--test--隣の空き溜め)。

選択 `net`: 食用利用は見送り、菌床を旧排水溜めに残して回収網と清掃当番を整える

行為: `cold_net`。

進行先: [`net`](#q005--net--旧排水溜めの作業室)。

### q005 / test — 隣の空き溜め

実装場面: `q005.v11.test`。

イベントID: `q005-S-test`。

登場: トト。

菌床を濾材ごと空き溜めへ移し、冷水管を分岐した。一晩の排水試験で本管が詰まらないか調べる。食用の試料は排水に触れていない箇所から別に採取し、毒性と衛生を検査する。甘さだけでは判断しない。

選択 `verify`: 一晩の排水試験と、排水に触れていない糖液の食用試験を終える

行為: `test_verify`。

進行先: [結末 `informed`](#q005-結末-informed--菌床を分離して運用を確かめる)。

### q005 / net — 旧排水溜めの作業室

実装場面: `q005.v11.net`。

イベントID: `q005-S-net`。

登場: トト。

本管の手前に網を置き、剥がれた濾材と泥を回収する。トトが網の目と清掃時刻を書いた。「毎日の手入れは、うちで引き受ける」。菌床は旧排水溜めに残り、温排水による増殖も続く。

選択 `accept`: トトの引受けを確認して網を設置する

選択条件: `{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q005.values.overflow"},"right":true}}`

行為: `net_accept`。

行為の前提条件: `{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q005.values.overflow"},"right":true}}`

進行先: [結末 `compromise`](#q005-結末-compromise--回収網と清掃当番)。

### q005 結末 informed — 菌床を分離して運用を確かめる

イベントID: `q005-E-informed`。

菌床を濾材ごと冷水管理の空き溜めへ移し、一晩の試運転で排水本管が詰まらないことを確認した。排水に触れていない箇所から採取した糖液は食用試験を通った。トトは分離槽の維持費を負い、少量の食用糖液を得る。

57G / 68EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q005.values.bedAt"},"right":"sump"},{"op":"eq","left":{"ref":"stories.q005.values.pipes"},"right":true},{"op":"eq","left":{"ref":"stories.q005.values.overnight"},"right":true},{"op":"eq","left":{"ref":"stories.q005.values.foodTest"},"right":true},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q005.values.overflow"},"right":true}},{"op":"eq","left":{"ref":"stories.q005.values.fungus"},"right":"cooled"}]}`

### q005 結末 contract — 菌床を焼却する

イベントID: `q005-E-contract`。

菌床と古い濾材を本管から取り出して焼却すると、排水は流れた。詰まりは解消したが、菌床と糖液を食料へ転用する道も失われた。

77G / 47EXP

物語の結末条件: `{"op":"eq","left":{"ref":"stories.q005.values.fungus"},"right":"burned"}`

### q005 結末 compromise — 回収網と清掃当番

イベントID: `q005-E-compromise`。

本管の手前へ回収網を設置し、トトが毎日の清掃を引き受けた。菌床は旧排水溜めに残るため、流れを保つには継続的な手入れが必要で、温排水による増殖原因を除いたわけではない。

37G / 51EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q005.values.maintenance"},"right":true},{"op":"eq","left":{"ref":"stories.q005.values.netAt"},"right":"drain"},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q005.values.overflow"},"right":true}}]}`

## 状態項目と初期値

`partyAt`：party の所在または保持者。型 `enum`、初期値 `"drain"`、許容値 `["drain","sump","disposal"]`。

`totoAt`：toto の所在または保持者。型 `enum`、初期値 `"drain"`、許容値 `["drain","sump","disposal"]`。

`bedAt`：bed の所在または保持者。型 `enum`、初期値 `"drain"`、許容値 `["drain","sump","disposal","party","toto","net"]`。

`netAt`：net の所在または保持者。型 `enum`、初期値 `"toto"`、許容値 `["drain","sump","disposal","party","toto","bed"]`。

`fungus`：同じ菌床の状態。型 `enum`、初期値 `"growing"`、許容値 `["growing","cooled","burned"]`。

`coldTrial`：coldTrial。型 `boolean`、初期値 `false`。

`warmTrial`：warmTrial。型 `boolean`、初期値 `false`。

`overflow`：overflow。型 `boolean`、初期値 `false`。

`pipes`：pipes。型 `boolean`、初期値 `false`。

`overnight`：overnight。型 `boolean`、初期値 `false`。

`foodTest`：foodTest。型 `boolean`、初期値 `false`。

`maintenance`：maintenance。型 `boolean`、初期値 `false`。

## 行為の条件と状態変化

本文の選択と行為IDを対応させ、効果を実行順で記す。条件式は配布JSONの値。資材・所持金不足では支払いも受け渡しも確定しない。実移動では出発効果と到着効果を分ける。

### 行為 entry_cold

[q005-S-entry](#q005--entry--旧排水溜めの作業室) → [q005-S-cold](#q005--cold--旧排水溜めの作業室)。条件 `true`。費用：なし。一度だけ確定する。

状態更新：`coldTrial` = `true`。

状態更新：`fungus` = `"cooled"`。

認識獲得：探索隊 (`party`) が 木質濾材ごとの菌床 (`bed`) から `temperature`（冷水は菌床を殺さず増殖を遅らせ、糖分を含む温排水は増殖を速める）を知る。観察条件 `true`。

### 行為 entry_warm

[q005-S-entry](#q005--entry--旧排水溜めの作業室) → [q005-S-overflow](#q005--overflow--旧排水溜めの作業室)。条件 `true`。費用：なし。一度だけ確定する。

状態更新：`warmTrial` = `true`。

状態更新：`overflow` = `true`。

### 行為 entry_burn

[q005-S-entry](#q005--entry--旧排水溜めの作業室) → [q005-E-contract](#q005-結末-contract--菌床を焼却する)。条件 `true`。費用：予備灯油 (`torch`) × 1。一度だけ確定する。

受け渡し：木質濾材ごとの菌床 (`bed`) を 旧排水溜めの作業室 (`drain`) から 探索隊 (`party`) へ。

移動：探索隊 (`party`)。旧排水溜めの作業室 (`drain`) → 工房の焼却場 (`disposal`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：木質濾材ごとの菌床 (`bed`) を 探索隊 (`party`) から 工房の焼却場 (`disposal`) へ。

状態更新：`fungus` = `"burned"`。

移動：探索隊 (`party`)。工房の焼却場 (`disposal`) → 旧排水溜めの作業室 (`drain`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 entry_net

[q005-S-entry](#q005--entry--旧排水溜めの作業室) → [q005-S-net](#q005--net--旧排水溜めの作業室)。条件 `true`。費用：なし。一度だけ確定する。

追加の状態更新なし。上記の進行先へ移る。

### 行為 overflow_clean

[q005-S-overflow](#q005--overflow--旧排水溜めの作業室) → [q005-S-cold](#q005--cold--旧排水溜めの作業室)。条件 `true`。費用：なし。一度だけ確定する。

状態更新：`overflow` = `false`。

状態更新：`coldTrial` = `true`。

状態更新：`fungus` = `"cooled"`。

認識獲得：探索隊 (`party`) が 木質濾材ごとの菌床 (`bed`) から `temperature`（冷水は菌床を殺さず増殖を遅らせ、糖分を含む温排水は増殖を速める）を知る。観察条件 `true`。

### 行為 overflow_net

[q005-S-overflow](#q005--overflow--旧排水溜めの作業室) → [q005-S-net](#q005--net--旧排水溜めの作業室)。条件 `true`。費用：なし。一度だけ確定する。

状態更新：`overflow` = `false`。

### 行為 cold_move

[q005-S-cold](#q005--cold--旧排水溜めの作業室) → [q005-S-test](#q005--test--隣の空き溜め)。条件 `true`。費用：なし。一度だけ確定する。

受け渡し：木質濾材ごとの菌床 (`bed`) を 旧排水溜めの作業室 (`drain`) から 探索隊 (`party`) へ。

移動：探索隊 (`party`)・トト (`toto`)。旧排水溜めの作業室 (`drain`) → 隣の空き溜め (`sump`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：木質濾材ごとの菌床 (`bed`) を 探索隊 (`party`) から 隣の空き溜め (`sump`) へ。

状態更新：`pipes` = `true`。

### 行為 cold_net

[q005-S-cold](#q005--cold--旧排水溜めの作業室) → [q005-S-net](#q005--net--旧排水溜めの作業室)。条件 `true`。費用：なし。一度だけ確定する。

追加の状態更新なし。上記の進行先へ移る。

### 行為 test_verify

[q005-S-test](#q005--test--隣の空き溜め) → [q005-E-informed](#q005-結末-informed--菌床を分離して運用を確かめる)。条件 `true`。費用：なし。一度だけ確定する。

状態更新：`overnight` = `true`。

状態更新：`foodTest` = `true`。

### 行為 net_accept

[q005-S-net](#q005--net--旧排水溜めの作業室) → [q005-E-compromise](#q005-結末-compromise--回収網と清掃当番)。条件 `{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q005.values.overflow"},"right":true}}`。費用：なし。一度だけ確定する。

受け渡し：回収網 (`net`) を トト (`toto`) から 旧排水溜めの作業室 (`drain`) へ。

状態更新：`maintenance` = `true`。

## 資材不足・戦闘後の再開・保存

`q005.v11.entry` / 作業 `burn`：必要量 予備灯油 (`torch`) × 1。不足選択 `burn_supplies` → `q005.v11.entry.burn.shortage` で未着手のまま探索へ戻る。補給後は `q005.v11.entry.burn.resume` → `q005.v11.entry` で作業場面へ戻る。

共通の中断選択肢はない。メッセージ・判断の途中で閉じた場合は通常の保存位置から再開する。戦闘の逃走・敗北後は本編記載の継続命令に従い、勝利後の作業・費用を先に確定しない。q001固有の老人遭遇への巻戻しを、この依頼にも実装済みとは扱わない。

## 編集時の確認事項

焼却のたいまつ1個が不足したら未着手で戻す。冷却を死滅と記載しない。

旧排水溜め・空き溜め・焼却場への移動を個別に接続し、運搬者と菌床の保持者を一致させる。

排水試験と食用試験を一方だけで完了させない。溢れた泥を放置したまま維持運用を成立させない。

以下は改稿・物理接続を行う際の確認観点であり、全項目を実ブラウザで確認済みという記録ではない。今回の検証結果は [PROGRESS.md](../../development/PROGRESS.md) を参照する。

## マップデータと接続定義

実配置へ入口から到達する接続経路上のマップを掲載する。旧経路用の条件付き配置も含むため、全マップの踏破を本編の完了条件とはしない。クエスト配置はeventsから重ね、共通マップのJSONと分ける。

### 灯守の地下水道 の経路

入口：`{"main":{"map":"region_1_f1","point":"entrance"}}`。

`upper_inlet`：第一水路の水密扉。`region_1_f1` (9, 1) ↔ `region_1_canal_a` (1, 1)。接続方式 `watertight_door`。

`upper_landing`：荷揚げ場の水密扉。`region_1_canal_a` (9, 1) ↔ `region_1_landing` (1, 1)。接続方式 `watertight_door`。

`branch_inlet`：排水支路の水密扉。`region_1_landing` (9, 1) ↔ `region_1_canal_b` (1, 1)。接続方式 `watertight_door`。

`branch_outlet`：点検室の水密扉。`region_1_canal_b` (9, 1) ↔ `region_1_inspection` (1, 1)。接続方式 `watertight_door`。

<details>
<summary>入口・接続・給排水の配布定義</summary>

```json
{
  "entries": {
    "main": {
      "map": "region_1_f1",
      "point": "entrance"
    }
  },
  "connections": {
    "use": "map_connections",
    "links": [
      {
        "id": "upper_inlet",
        "name": "第一水路の水密扉",
        "kind": "watertight_door",
        "a": {
          "map": "region_1_f1",
          "x": 9,
          "y": 1,
          "side": "east"
        },
        "b": {
          "map": "region_1_canal_a",
          "x": 1,
          "y": 1,
          "side": "west"
        }
      },
      {
        "id": "upper_landing",
        "name": "荷揚げ場の水密扉",
        "kind": "watertight_door",
        "a": {
          "map": "region_1_canal_a",
          "x": 9,
          "y": 1,
          "side": "east"
        },
        "b": {
          "map": "region_1_landing",
          "x": 1,
          "y": 1,
          "side": "west"
        }
      },
      {
        "id": "branch_inlet",
        "name": "排水支路の水密扉",
        "kind": "watertight_door",
        "a": {
          "map": "region_1_landing",
          "x": 9,
          "y": 1,
          "side": "east"
        },
        "b": {
          "map": "region_1_canal_b",
          "x": 1,
          "y": 1,
          "side": "west"
        }
      },
      {
        "id": "branch_outlet",
        "name": "点検室の水密扉",
        "kind": "watertight_door",
        "a": {
          "map": "region_1_canal_b",
          "x": 9,
          "y": 1,
          "side": "east"
        },
        "b": {
          "map": "region_1_inspection",
          "x": 1,
          "y": 1,
          "side": "west"
        }
      },
      {
        "id": "dry_stair",
        "name": "乾いた階段室",
        "kind": "stairs",
        "a": {
          "map": "region_1_landing",
          "x": 5,
          "y": 3,
          "facing": "north"
        },
        "b": {
          "map": "region_1_f2",
          "x": 1,
          "y": 1,
          "facing": "east"
        }
      },
      {
        "id": "lower_inlet",
        "name": "給金箱水路の水密扉",
        "kind": "watertight_door",
        "a": {
          "map": "region_1_f2",
          "x": 9,
          "y": 1,
          "side": "east"
        },
        "b": {
          "map": "region_1_canal_c",
          "x": 1,
          "y": 1,
          "side": "west"
        }
      },
      {
        "id": "lower_landing",
        "name": "待避場の水密扉",
        "kind": "watertight_door",
        "a": {
          "map": "region_1_canal_c",
          "x": 9,
          "y": 1,
          "side": "east"
        },
        "b": {
          "map": "region_1_lower_landing",
          "x": 1,
          "y": 1,
          "side": "west"
        }
      },
      {
        "id": "deep_inlet",
        "name": "避難水路の水密扉",
        "kind": "watertight_door",
        "a": {
          "map": "region_1_lower_landing",
          "x": 9,
          "y": 1,
          "side": "east"
        },
        "b": {
          "map": "region_1_canal_d",
          "x": 1,
          "y": 1,
          "side": "west"
        }
      },
      {
        "id": "deep_outlet",
        "name": "水門詰所の水密扉",
        "kind": "watertight_door",
        "a": {
          "map": "region_1_canal_d",
          "x": 9,
          "y": 1,
          "side": "east"
        },
        "b": {
          "map": "region_1_gatehouse",
          "x": 1,
          "y": 1,
          "side": "west"
        }
      }
    ]
  },
  "water": {
    "use": "compartment_water",
    "zones": [
      {
        "map": "region_1_canal_a",
        "control": "upper_gate",
        "initiallyFlooded": true
      },
      {
        "map": "region_1_canal_b",
        "control": "upper_valve",
        "initiallyFlooded": true
      },
      {
        "map": "region_1_canal_c",
        "control": "lower_gate",
        "initiallyFlooded": true
      },
      {
        "map": "region_1_canal_d",
        "control": "lower_valve",
        "initiallyFlooded": true
      }
    ],
    "controls": [
      {
        "id": "upper_gate",
        "name": "第一水路の給排水盤",
        "map": "region_1_f1",
        "x": 2,
        "y": 1
      },
      {
        "id": "upper_gate",
        "name": "第一水路の給排水盤",
        "map": "region_1_landing",
        "x": 2,
        "y": 1
      },
      {
        "id": "upper_valve",
        "name": "排水支路の給排水盤",
        "map": "region_1_landing",
        "x": 8,
        "y": 1
      },
      {
        "id": "upper_valve",
        "name": "排水支路の給排水盤",
        "map": "region_1_inspection",
        "x": 2,
        "y": 1
      },
      {
        "id": "lower_gate",
        "name": "給金箱水路の給排水盤",
        "map": "region_1_f2",
        "x": 8,
        "y": 1
      },
      {
        "id": "lower_gate",
        "name": "給金箱水路の給排水盤",
        "map": "region_1_lower_landing",
        "x": 2,
        "y": 1
      },
      {
        "id": "lower_valve",
        "name": "避難水路の給排水盤",
        "map": "region_1_lower_landing",
        "x": 8,
        "y": 1
      },
      {
        "id": "lower_valve",
        "name": "避難水路の給排水盤",
        "map": "region_1_gatehouse",
        "x": 2,
        "y": 1
      }
    ]
  }
}
```

</details>

### region_1_f1 の全マップJSON

灯守の地下水道・上層・入口操作室・B1、11×9セル。[配布JSON](../../../data/maps/region_1_f1.json)。左上(0,0)、xは右、yは下。通行と水位は配布データと迷宮システムの判定に従う。

<details>
<summary>共通マップの全データ</summary>

```json
{
  "region": 1,
  "background": "corridor",
  "music": "exploration",
  "encounter": "roaming_1",
  "encounterRate": 0.18,
  "encounterPool": [
    {
      "encounter": "roaming_1",
      "weight": 20
    },
    {
      "encounter": "wild_waterwheel_beaver",
      "weight": 40
    },
    {
      "encounter": "wild_sluice_crocodile",
      "weight": 40
    }
  ],
  "dungeon": "region_1",
  "id": "region_1_f1",
  "name": "灯守の地下水道・上層・入口操作室",
  "floor": 1,
  "tiles": [
    "###########",
    "#.........#",
    "#.###.###.#",
    "#.........#",
    "#.###.###.#",
    "#.....###.#",
    "#.....###.#",
    "#.........#",
    "###########"
  ],
  "objects": [
    {
      "id": "exit",
      "x": 1,
      "y": 1,
      "name": "地上への階段",
      "kind": "exit",
      "trigger": "interact",
      "safe": true,
      "script": "region_1_f1.exit"
    },
    {
      "id": "cache",
      "x": 1,
      "y": 3,
      "name": "補給の箱",
      "kind": "chest",
      "trigger": "interact",
      "once": true,
      "safe": true,
      "script": "region_1_f1.cache"
    },
    {
      "id": "fountain",
      "x": 5,
      "y": 3,
      "name": "休息の泉",
      "kind": "fountain",
      "trigger": "interact",
      "once": true,
      "safe": true,
      "script": "region_1_f1.fountain"
    },
    {
      "id": "trap",
      "x": 7,
      "y": 3,
      "name": "崩れた石床",
      "kind": "trap",
      "trigger": "enter",
      "once": true,
      "script": "region_1_f1.trap"
    },
    {
      "id": "door",
      "x": 9,
      "y": 3,
      "name": "封鎖された小部屋",
      "kind": "door",
      "trigger": "interact",
      "blocking": true,
      "initialState": "locked",
      "safe": true,
      "script": "region_1_f1.door",
      "condition": {
        "op": "not",
        "arg": {
          "op": "eq",
          "left": {
            "ref": "flags.region_1_f1_door_open"
          },
          "right": true
        }
      }
    }
  ],
  "entrance": {
    "x": 1,
    "y": 1,
    "facing": "east"
  },
  "cells": {
    "legend": {
      "W": "stone_wall",
      "F": "stone_floor",
      "S": "shallow_depression_water",
      "D": "deep_depression_water",
      "B": "bottomless_depression_water"
    },
    "rows": [
      "WWWWWWWWWWW",
      "WFFFFFFFFFW",
      "WFWWWFWWWFW",
      "WFFFFFFFFFW",
      "WFWWWFWWWFW",
      "WFSSSFDDDFW",
      "WFSSSFDDDFW",
      "WFFFFFFFFFW",
      "WWWWWWWWWWW"
    ],
    "overrides": {
      "1,1": {
        "parameters": {
          "illumination": 3
        }
      },
      "9,1": {
        "parameters": {
          "illumination": 3
        }
      },
      "1,7": {
        "parameters": {
          "illumination": 3
        }
      }
    }
  }
}
```

</details>

### region_1_canal_a の全マップJSON

灯守の地下水道・上層・第一水路・B1、11×7セル。[配布JSON](../../../data/maps/region_1_canal_a.json)。左上(0,0)、xは右、yは下。通行と水位は配布データと迷宮システムの判定に従う。

<details>
<summary>共通マップの全データ</summary>

```json
{
  "region": 1,
  "background": "corridor",
  "music": "exploration",
  "encounter": "roaming_1",
  "encounterRate": 0.18,
  "encounterPool": [
    {
      "encounter": "roaming_1",
      "weight": 20
    },
    {
      "encounter": "wild_waterwheel_beaver",
      "weight": 40
    },
    {
      "encounter": "wild_sluice_crocodile",
      "weight": 40
    }
  ],
  "dungeon": "region_1",
  "id": "region_1_canal_a",
  "name": "灯守の地下水道・上層・第一水路",
  "floor": 1,
  "tiles": [
    "###########",
    "#.........#",
    "#.........#",
    "#.#######.#",
    "#.#######.#",
    "#.........#",
    "###########"
  ],
  "objects": [],
  "entrance": {
    "x": 1,
    "y": 1,
    "facing": "east"
  },
  "cells": {
    "legend": {
      "W": "stone_wall",
      "F": "stone_floor",
      "S": "shallow_depression_water",
      "D": "deep_depression_water",
      "B": "bottomless_depression_water"
    },
    "rows": [
      "WWWWWWWWWWW",
      "WFFFSSSFFFW",
      "WFSSSSSSSFW",
      "WFDDDDDDDFW",
      "WFDDDDDDDFW",
      "WFFFFFFFFFW",
      "WWWWWWWWWWW"
    ],
    "overrides": {
      "1,1": {
        "parameters": {
          "illumination": 3
        }
      },
      "9,1": {
        "parameters": {
          "illumination": 3
        }
      },
      "1,5": {
        "parameters": {
          "illumination": 3
        }
      }
    }
  }
}
```

</details>

### region_1_landing の全マップJSON

灯守の地下水道・上層・荷揚げ場・B1、17×9セル。[配布JSON](../../../data/maps/region_1_landing.json)。左上(0,0)、xは右、yは下。通行と水位は配布データと迷宮システムの判定に従う。

<details>
<summary>共通マップの全データ</summary>

```json
{
  "region": 1,
  "background": "corridor",
  "music": "exploration",
  "encounter": "roaming_1",
  "encounterRate": 0.18,
  "encounterPool": [
    {
      "encounter": "roaming_1",
      "weight": 20
    },
    {
      "encounter": "wild_waterwheel_beaver",
      "weight": 40
    },
    {
      "encounter": "wild_sluice_crocodile",
      "weight": 40
    }
  ],
  "dungeon": "region_1",
  "id": "region_1_landing",
  "name": "灯守の地下水道・上層・荷揚げ場",
  "floor": 1,
  "tiles": [
    "#################",
    "#.........#######",
    "#.###.###.#######",
    "#...............#",
    "#.###.###.#.#.#.#",
    "#.........#.....#",
    "#.....###.#.#.#.#",
    "#.....###.#.....#",
    "#################"
  ],
  "objects": [],
  "entrance": {
    "x": 1,
    "y": 1,
    "facing": "east"
  },
  "cells": {
    "legend": {
      "W": "stone_wall",
      "F": "stone_floor",
      "S": "shallow_depression_water",
      "D": "deep_depression_water",
      "B": "bottomless_depression_water"
    },
    "rows": [
      "WWWWWWWWWWWWWWWWW",
      "WFFFFFFFFFWWWWWWW",
      "WFWWWFWWWFWWWWWWW",
      "WFFFFFFFFFFFFFFFW",
      "WFWWWFWWWFWFWFWFW",
      "WFSSSFFFFFWFFFFFW",
      "WFSSSFDDDFWFWFWFW",
      "WFFFFFDDDFWFFFFFW",
      "WWWWWWWWWWWWWWWWW"
    ],
    "overrides": {
      "1,1": {
        "parameters": {
          "illumination": 3
        }
      },
      "9,1": {
        "parameters": {
          "illumination": 3
        }
      },
      "1,7": {
        "parameters": {
          "illumination": 3
        }
      }
    }
  }
}
```

</details>

### region_1_canal_b の全マップJSON

灯守の地下水道・上層・排水支路・B1、11×7セル。[配布JSON](../../../data/maps/region_1_canal_b.json)。左上(0,0)、xは右、yは下。通行と水位は配布データと迷宮システムの判定に従う。

<details>
<summary>共通マップの全データ</summary>

```json
{
  "region": 1,
  "background": "corridor",
  "music": "exploration",
  "encounter": "roaming_1",
  "encounterRate": 0.18,
  "encounterPool": [
    {
      "encounter": "roaming_1",
      "weight": 20
    },
    {
      "encounter": "wild_waterwheel_beaver",
      "weight": 40
    },
    {
      "encounter": "wild_sluice_crocodile",
      "weight": 40
    }
  ],
  "dungeon": "region_1",
  "id": "region_1_canal_b",
  "name": "灯守の地下水道・上層・排水支路",
  "floor": 1,
  "tiles": [
    "###########",
    "#.........#",
    "#.........#",
    "#.#######.#",
    "#.#######.#",
    "#.........#",
    "###########"
  ],
  "objects": [],
  "entrance": {
    "x": 1,
    "y": 1,
    "facing": "east"
  },
  "cells": {
    "legend": {
      "W": "stone_wall",
      "F": "stone_floor",
      "S": "shallow_depression_water",
      "D": "deep_depression_water",
      "B": "bottomless_depression_water"
    },
    "rows": [
      "WWWWWWWWWWW",
      "WFFFSSSFFFW",
      "WFSSSSSSSFW",
      "WFDDDDDDDFW",
      "WFDDDDBBBFW",
      "WFFFFFFFFFW",
      "WWWWWWWWWWW"
    ],
    "overrides": {
      "1,1": {
        "parameters": {
          "illumination": 3
        }
      },
      "9,1": {
        "parameters": {
          "illumination": 3
        }
      },
      "1,5": {
        "parameters": {
          "illumination": 3
        }
      }
    }
  }
}
```

</details>

### region_1_inspection の全マップJSON

灯守の地下水道・上層・鐘と浮子の点検室・B1、11×9セル。[配布JSON](../../../data/maps/region_1_inspection.json)。左上(0,0)、xは右、yは下。通行と水位は配布データと迷宮システムの判定に従う。

<details>
<summary>共通マップの全データ</summary>

```json
{
  "region": 1,
  "background": "corridor",
  "music": "exploration",
  "encounter": "roaming_1",
  "encounterRate": 0.18,
  "encounterPool": [
    {
      "encounter": "roaming_1",
      "weight": 20
    },
    {
      "encounter": "wild_waterwheel_beaver",
      "weight": 40
    },
    {
      "encounter": "wild_sluice_crocodile",
      "weight": 40
    }
  ],
  "dungeon": "region_1",
  "id": "region_1_inspection",
  "name": "灯守の地下水道・上層・鐘と浮子の点検室",
  "floor": 1,
  "tiles": [
    "###########",
    "#.........#",
    "#.###.###.#",
    "#.........#",
    "#.###.###.#",
    "#.....###.#",
    "#.....###.#",
    "#.........#",
    "###########"
  ],
  "objects": [],
  "entrance": {
    "x": 1,
    "y": 1,
    "facing": "east"
  },
  "cells": {
    "legend": {
      "W": "stone_wall",
      "F": "stone_floor",
      "S": "shallow_depression_water",
      "D": "deep_depression_water",
      "B": "bottomless_depression_water"
    },
    "rows": [
      "WWWWWWWWWWW",
      "WFFFFFFFFFW",
      "WFWWWFWWWFW",
      "WFFFFFFFFFW",
      "WFWWWFWWWFW",
      "WFSSSFDDDFW",
      "WFSSSFDDDFW",
      "WFFFFFFFFFW",
      "WWWWWWWWWWW"
    ],
    "overrides": {
      "1,1": {
        "parameters": {
          "illumination": 3
        }
      },
      "9,1": {
        "parameters": {
          "illumination": 3
        }
      },
      "1,7": {
        "parameters": {
          "illumination": 3
        }
      }
    }
  }
}
```

</details>

<details>
<summary>クエスト専用の全配置と条件</summary>

```json
[
  {
    "id": "q005_clue_a",
    "title": "甘い排水：現場の痕跡",
    "points": [
      {
        "map": "region_1_canal_a",
        "x": 4,
        "y": 1,
        "dungeon": "region_1"
      }
    ],
    "kind": "clue",
    "trigger": "interact",
    "safe": true,
    "script": "q005.clue_a",
    "role": "clue_a",
    "visibleWhen": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q005.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "flags.legacyQuestRoutes.q005"
          },
          "right": true
        }
      ]
    },
    "dungeon": "region_1"
  },
  {
    "id": "q005_clue_b",
    "title": "甘い排水：記録と証言",
    "points": [
      {
        "map": "region_1_canal_b",
        "x": 4,
        "y": 1,
        "dungeon": "region_1"
      }
    ],
    "kind": "clue",
    "trigger": "interact",
    "safe": true,
    "script": "q005.clue_b",
    "role": "clue_b",
    "visibleWhen": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q005.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "flags.legacyQuestRoutes.q005"
          },
          "right": true
        }
      ]
    },
    "dungeon": "region_1"
  },
  {
    "id": "q005_decision",
    "title": "甘い排水：決着の場",
    "points": [
      {
        "map": "region_1_inspection",
        "x": 7,
        "y": 3,
        "dungeon": "region_1"
      }
    ],
    "kind": "decision",
    "trigger": "interact",
    "safe": true,
    "script": "q005.v11.visit",
    "role": "decision",
    "visibleWhen": {
      "op": "or",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q005.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "quests.q005.stage"
          },
          "right": "completed"
        }
      ]
    },
    "dungeon": "region_1"
  }
]
```

</details>

<details>
<summary>物語の場所・状態・行為・結末条件の全定義</summary>

```json
{
  "version": 1,
  "modelVersion": "1.1",
  "places": {
    "drain": "旧排水溜めの作業室",
    "sump": "隣の空き溜め",
    "disposal": "工房の焼却場"
  },
  "connections": [
    [
      "drain",
      "sump"
    ],
    [
      "drain",
      "disposal"
    ]
  ],
  "registry": {
    "partyAt": {
      "type": "enum",
      "initial": "drain",
      "values": [
        "drain",
        "sump",
        "disposal"
      ],
      "meaning": "party の所在または保持者"
    },
    "totoAt": {
      "type": "enum",
      "initial": "drain",
      "values": [
        "drain",
        "sump",
        "disposal"
      ],
      "meaning": "toto の所在または保持者"
    },
    "bedAt": {
      "type": "enum",
      "initial": "drain",
      "values": [
        "drain",
        "sump",
        "disposal",
        "party",
        "toto",
        "net"
      ],
      "meaning": "bed の所在または保持者"
    },
    "netAt": {
      "type": "enum",
      "initial": "toto",
      "values": [
        "drain",
        "sump",
        "disposal",
        "party",
        "toto",
        "bed"
      ],
      "meaning": "net の所在または保持者"
    },
    "fungus": {
      "type": "enum",
      "initial": "growing",
      "values": [
        "growing",
        "cooled",
        "burned"
      ],
      "meaning": "同じ菌床の状態"
    },
    "coldTrial": {
      "type": "boolean",
      "initial": false,
      "meaning": "coldTrial"
    },
    "warmTrial": {
      "type": "boolean",
      "initial": false,
      "meaning": "warmTrial"
    },
    "overflow": {
      "type": "boolean",
      "initial": false,
      "meaning": "overflow"
    },
    "pipes": {
      "type": "boolean",
      "initial": false,
      "meaning": "pipes"
    },
    "overnight": {
      "type": "boolean",
      "initial": false,
      "meaning": "overnight"
    },
    "foodTest": {
      "type": "boolean",
      "initial": false,
      "meaning": "foodTest"
    },
    "maintenance": {
      "type": "boolean",
      "initial": false,
      "meaning": "maintenance"
    }
  },
  "entities": {
    "party": {
      "holder": "partyAt",
      "kind": "group"
    },
    "toto": {
      "holder": "totoAt",
      "kind": "person",
      "character": "toto"
    },
    "bed": {
      "holder": "bedAt",
      "kind": "item"
    },
    "net": {
      "holder": "netAt",
      "kind": "item"
    }
  },
  "propositions": {
    "temperature": {
      "text": "冷水は菌床を殺さず増殖を遅らせ、糖分を含む温排水は増殖を速める"
    }
  },
  "initialKnowledge": {},
  "invariants": [],
  "scenes": {
    "entry": {
      "title": "旧排水溜めの作業室",
      "place": "drain",
      "cast": [
        {
          "entity": "toto"
        }
      ],
      "requires": true
    },
    "overflow": {
      "title": "旧排水溜めの作業室",
      "place": "drain",
      "cast": [
        {
          "entity": "toto"
        }
      ],
      "requires": true
    },
    "cold": {
      "title": "旧排水溜めの作業室",
      "place": "drain",
      "cast": [
        {
          "entity": "toto"
        }
      ],
      "requires": true
    },
    "test": {
      "title": "隣の空き溜め",
      "place": "sump",
      "cast": [
        {
          "entity": "toto"
        }
      ],
      "requires": true
    },
    "net": {
      "title": "旧排水溜めの作業室",
      "place": "drain",
      "cast": [
        {
          "entity": "toto"
        }
      ],
      "requires": true
    }
  },
  "actions": {
    "entry_cold": {
      "from": [
        "entry"
      ],
      "to": "cold",
      "requires": true,
      "effects": [
        {
          "op": "set",
          "key": "coldTrial",
          "value": true
        },
        {
          "op": "set",
          "key": "fungus",
          "value": "cooled"
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "temperature",
          "source": "bed",
          "requires": true
        }
      ],
      "once": true
    },
    "entry_warm": {
      "from": [
        "entry"
      ],
      "to": "overflow",
      "requires": true,
      "effects": [
        {
          "op": "set",
          "key": "warmTrial",
          "value": true
        },
        {
          "op": "set",
          "key": "overflow",
          "value": true
        }
      ],
      "once": true
    },
    "entry_burn": {
      "from": [
        "entry"
      ],
      "ending": "contract",
      "requires": true,
      "effects": [
        {
          "op": "transfer",
          "entity": "bed",
          "from": "drain",
          "to": "party"
        },
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "drain",
            "disposal"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "bed",
          "from": "party",
          "to": "disposal"
        },
        {
          "op": "set",
          "key": "fungus",
          "value": "burned"
        },
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "disposal",
            "drain"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "cost": {
        "torch": 1
      },
      "once": true
    },
    "entry_net": {
      "from": [
        "entry"
      ],
      "to": "net",
      "requires": true,
      "effects": [],
      "once": true
    },
    "overflow_clean": {
      "from": [
        "overflow"
      ],
      "to": "cold",
      "requires": true,
      "effects": [
        {
          "op": "set",
          "key": "overflow",
          "value": false
        },
        {
          "op": "set",
          "key": "coldTrial",
          "value": true
        },
        {
          "op": "set",
          "key": "fungus",
          "value": "cooled"
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "temperature",
          "source": "bed",
          "requires": true
        }
      ],
      "once": true
    },
    "overflow_net": {
      "from": [
        "overflow"
      ],
      "to": "net",
      "requires": true,
      "effects": [
        {
          "op": "set",
          "key": "overflow",
          "value": false
        }
      ],
      "once": true
    },
    "cold_move": {
      "from": [
        "cold"
      ],
      "to": "test",
      "requires": true,
      "effects": [
        {
          "op": "transfer",
          "entity": "bed",
          "from": "drain",
          "to": "party"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "toto"
          ],
          "path": [
            "drain",
            "sump"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "bed",
          "from": "party",
          "to": "sump"
        },
        {
          "op": "set",
          "key": "pipes",
          "value": true
        }
      ],
      "once": true
    },
    "cold_net": {
      "from": [
        "cold"
      ],
      "to": "net",
      "requires": true,
      "effects": [],
      "once": true
    },
    "test_verify": {
      "from": [
        "test"
      ],
      "ending": "informed",
      "requires": true,
      "effects": [
        {
          "op": "set",
          "key": "overnight",
          "value": true
        },
        {
          "op": "set",
          "key": "foodTest",
          "value": true
        }
      ],
      "once": true
    },
    "net_accept": {
      "from": [
        "net"
      ],
      "ending": "compromise",
      "requires": {
        "op": "not",
        "arg": {
          "op": "eq",
          "left": {
            "ref": "stories.q005.values.overflow"
          },
          "right": true
        }
      },
      "effects": [
        {
          "op": "transfer",
          "entity": "net",
          "from": "toto",
          "to": "drain"
        },
        {
          "op": "set",
          "key": "maintenance",
          "value": true
        }
      ],
      "once": true
    }
  },
  "endings": {
    "informed": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "stories.q005.values.bedAt"
          },
          "right": "sump"
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q005.values.pipes"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q005.values.overnight"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q005.values.foodTest"
          },
          "right": true
        },
        {
          "op": "not",
          "arg": {
            "op": "eq",
            "left": {
              "ref": "stories.q005.values.overflow"
            },
            "right": true
          }
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q005.values.fungus"
          },
          "right": "cooled"
        }
      ]
    },
    "contract": {
      "op": "eq",
      "left": {
        "ref": "stories.q005.values.fungus"
      },
      "right": "burned"
    },
    "compromise": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "stories.q005.values.maintenance"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q005.values.netAt"
          },
          "right": "drain"
        },
        {
          "op": "not",
          "arg": {
            "op": "eq",
            "left": {
              "ref": "stories.q005.values.overflow"
            },
            "right": true
          }
        }
      ]
    }
  }
}
```

</details>

## 編集元と再生成

本編は [authoring/stories-v11-1.mjs](../../../authoring/stories-v11-1.mjs)、配置は [config/quests/q005.events.json](../../../config/quests/q005.events.json)、配布内容は [data/quests/q005.json](../../../data/quests/q005.json)。地形は [config/connected-maps.json](../../../config/connected-maps.json)、接続・給排水は [config/dungeons/region_1.json](../../../config/dungeons/region_1.json)、施設は [config/locations.json](../../../config/locations.json) を参照する。

解説と確認観点は [authoring/quest-page-notes.mjs](../../../authoring/quest-page-notes.mjs)、ページ構成は [tools/quest-page-details.mjs](../../../tools/quest-page-details.mjs) を編集する。本文を手直しする場合は物語原稿へ反映し、`npm run build:scenarios` で配布データも更新する。文書だけの再生成は `npm run build:catalog`、照合は `npm run check:docs`。`npm run build:docs` 単独は個別ページの本文を保持する。
