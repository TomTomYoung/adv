# q008 浮かばない棺：詳細・配置・状態変化

[個別ページ一覧](README.md) ／ [カタログへ戻る](../QUEST_CATALOG.md#q008-浮かばない棺) ／ [シナリオ本文](#q008-浮かばない棺) ／ [行為の条件と状態変化](#行為の条件と状態変化) ／ [配置イベント](#配置イベントと操作条件)

作品版 1.25.0。配布JSONから生成した作者向けページ。真相と結末を含む。本編4場面・3結末。

<!-- quest-page-source:7eb2f2a8b4f7008ab233cc426eb4318d6b67d1b99ece833a5bb4ca963081eef5 -->

## 依頼の焦点と分岐の意味

棺の内室、遺体、着脱する外底、食料を別の実体として追う。重すぎる棺が段差に乗り上げた物理原因と、貨物検査・通行税を避けた事情を区別する。

外底の調査は遺族の了承を得て行い、封じた遺体の内室には触れない。食料は遺体と接していないという固定事実を維持する。

informedは食料を分離し、水葬を済ませ、受取人の照会と今回限りの輸送許可を得て届ける。恒久的な免税や制度改定の成立へ広げない。

contractは戦闘後に重い棺を曳き、下流で外底を外して内室を水葬へ戻す。compromiseは棺と遺体を待棺所へ残し、食料だけを渡す。

## 実装範囲と場所

現地イベントの配置と物語状態は実装済み。ただし worldPlaces と story.journey は未定義で、行為内の move は物語上の所在変更である。本文にある施設や通路を実際に歩いて到達する方式には未接続。以下の物語内経路を実マップの座標や移動完了と読み替えない。

`shore`：水葬場の岸。物語上の場所。個別の実座標・施設IDは未割当。

`threshold`：浅瀬の段差。物語上の場所。個別の実座標・施設IDは未割当。

`jetty`：下流の受取桟橋。物語上の場所。個別の実座標・施設IDは未割当。

`office`：検査窓口。物語上の場所。個別の実座標・施設IDは未割当。

`mortuary`：待棺所。物語上の場所。個別の実座標・施設IDは未割当。

`river`：水葬の流れ。物語上の場所。個別の実座標・施設IDは未割当。

### 物語内の接続

水葬場の岸 (`shore`) ↔ 浅瀬の段差 (`threshold`)。

浅瀬の段差 (`threshold`) ↔ 下流の受取桟橋 (`jetty`)。

水葬場の岸 (`shore`) ↔ 検査窓口 (`office`)。

水葬場の岸 (`shore`) ↔ 待棺所 (`mortuary`)。

下流の受取桟橋 (`jetty`) ↔ 水葬の流れ (`river`)。

水葬場の岸 (`shore`) ↔ 水葬の流れ (`river`)。

## 人物・物品と認識

探索隊 (`party`)：集団。初期の所在・保持者は 水葬場の岸 (`shore`)、保存項目は `partyAt`。

ヨル (`yoru`)：人物。初期の所在・保持者は 水葬場の岸 (`shore`)、保存項目は `yoruAt`。葬送組合の担当者。葬儀を終え、下流へ食料も届ける。

棺の遺族 (`family`)：集団。初期の所在・保持者は 水葬場の岸 (`shore`)、保存項目は `familyAt`。水葬を待つ家族。故人を弔い、扱いを自分たちで決める。

棺の担ぎ手 (`bearers`)：集団。初期の所在・保持者は 水葬場の岸 (`shore`)、保存項目は `bearersAt`。葬送作業の担当者。棺と遺体を傷めずに運ぶ。

下流の受取人 (`recipient`)：人物。初期の所在・保持者は 下流の受取桟橋 (`jetty`)、保存項目は `recipientAt`。避難民側の食料受取担当。食料を受け取り、待つ人々へ配る。

輸送検査官 (`inspector`)：人物。初期の所在・保持者は 検査窓口 (`office`)、保存項目は `inspectorAt`。食料輸送の検査担当。今回の荷と届け先を確かめる。

棺の内室 (`coffin`)：物品。初期の所在・保持者は 浅瀬の段差 (`threshold`)、保存項目は `coffinAt`。

封じられた遺体 (`body`)：物品。初期の所在・保持者は 棺の内室 (`coffin`)、保存項目は `bodyAt`。

着脱式の外底 (`outerBase`)：物品。初期の所在・保持者は 棺の内室 (`coffin`)、保存項目は `outerBaseAt`。

隠された食料 (`food`)：物品。初期の所在・保持者は 着脱式の外底 (`outerBase`)、保存項目は `foodAt`。

認識 `cargo`：棺の外底には食料の包みが隠されている。

初期認識：`{}`。固定された過去と探索隊がすでに知る情報は別に扱い、observeの成立で認識を加える。

## 本編の進行とイベントID

本編場面は `q008-S-場面キー`、配置は `q008-P-配置キー`、結末は `q008-E-結末キー`。S・P・Eは文書用の識別子。Fは強制戦闘、Bは戦闘中イベントで、命令に明示されたidがあればそれを使い、ない戦闘には文書用IDを付ける。全11IDが一意で、場面を並べ替えても変わらない。

[q008-S-entry](#q008--entry--水葬場の岸)：水葬場の岸。物語内の場所 `shore`。

選択 `inspect`：遺族の了承を得て棺を岸へ引き戻し、内室を開けず外底を調べる → [q008-S-cargo](#q008--cargo--水葬場の岸)。行為 [`entry_inspect`](#行為-entry_inspect)。

選択 `tow`：水辺の魔物を退け、重い棺を段差の向こうへ曳く → [q008-E-contract](#q008-結末-contract--重い棺を下流へ曳く)。行為 [`entry_tow`](#行為-entry_tow)。戦闘勝利後に行為を確定する。

[q008-S-cargo](#q008--cargo--水葬場の岸)：水葬場の岸。物語内の場所 `shore`。

選択 `declare`：食料を外底から分け、内室の水葬を終えてから輸送許可を申請する → [q008-S-application](#q008--application--検査窓口)。行為 [`cargo_declare`](#行為-cargo_declare)。

選択 `quiet`：遺族に事情を伝えて棺を待棺所へ戻し、受取人を呼びに行く → [q008-S-postponed](#q008--postponed--水葬場の岸)。行為 [`cargo_quiet`](#行為-cargo_quiet)。

[q008-S-application](#q008--application--検査窓口)：検査窓口。物語内の場所 `office`。

選択 `permit`：受取人を窓口へ案内し、今回限りの確認と許可を得てから食料を運ぶ → [q008-E-informed](#q008-結末-informed--水葬と許可された食料輸送)。行為 [`application_permit`](#行為-application_permit)。

[q008-S-postponed](#q008--postponed--水葬場の岸)：水葬場の岸。物語内の場所 `shore`。

選択 `deliver`：受取人と待棺所へ行き、食料だけを受け渡す → [q008-E-compromise](#q008-結末-compromise--水葬を延期して食料を届ける)。行為 [`postponed_deliver`](#行為-postponed_deliver)。

強制戦闘：`q008-F-entry-tow-guard_1`。起動位置と勝敗後の継続は、下記の本編全文のbattle.startを展開した箇所に掲載する。

## 配置イベントと操作条件

配置が保存されていることと、通常プレイで表示されることは同じではない。表示条件・操作条件は別々に評価する。legacyQuestRoutesを要する配置は旧経路用で、現行本編の必須経路へ数えない。

### q008-P-clue_a

浮かばない棺：現場の痕跡。実行ID `q008_clue_a`、起動 `interact`、スクリプト `q008.clue_a`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・操作室・B2 (`region_1_f2`) / (6, 3) / イベント `q008_clue_a`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"and","args":[{"op":"eq","left":{"ref":"quests.q008.stage"},"right":"active"},{"op":"eq","left":{"ref":"flags.legacyQuestRoutes.q008"},"right":true}]}`。操作条件：`true`。

<details>
<summary>この配置の実行スクリプト</summary>

```json
{
  "commands": [
    {
      "op": "narrate",
      "text": "棺から防腐香ではなく燻製肉の匂いがし、釘は外から抜きやすく打たれている。"
    },
    {
      "op": "quest.evidence",
      "quest": "q008",
      "key": "clue_a",
      "text": "棺から防腐香ではなく燻製肉の匂いがし、釘は外から抜きやすく打たれている。"
    }
  ]
}
```

</details>

### q008-P-clue_b

浮かばない棺：記録と証言。実行ID `q008_clue_b`、起動 `interact`、スクリプト `q008.clue_b`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・棺の待避場・B2 (`region_1_lower_landing`) / (5, 1) / イベント `q008_clue_b`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"and","args":[{"op":"eq","left":{"ref":"quests.q008.stage"},"right":"active"},{"op":"eq","left":{"ref":"flags.legacyQuestRoutes.q008"},"right":true}]}`。操作条件：`true`。

<details>
<summary>この配置の実行スクリプト</summary>

```json
{
  "commands": [
    {
      "op": "say",
      "name": "葬送組合のヨル",
      "text": "水路の先には空の食器が並び、葬送船の到着日だけ火が焚かれます。"
    },
    {
      "op": "quest.evidence",
      "quest": "q008",
      "key": "clue_b",
      "text": "水路の先には空の食器が並び、葬送船の到着日だけ火が焚かれる。"
    }
  ]
}
```

</details>

### q008-P-decision

浮かばない棺：決着の場。実行ID `q008_decision`、起動 `interact`、スクリプト `q008.v11.visit`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・棺の待避場・B2 (`region_1_lower_landing`) / (7, 3) / イベント `q008_decision`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"or","args":[{"op":"eq","left":{"ref":"quests.q008.stage"},"right":"active"},{"op":"eq","left":{"ref":"quests.q008.stage"},"right":"completed"}]}`。操作条件：`true`。

物語の現在場面・補給後の再開先を呼び出す入口。本編全文は下記へ集約する。

## q008 浮かばない棺

依頼人: 葬送組合のヨル。地域: 1。いつでも受注できる。

水葬用の棺が浅瀬に引っ掛かり、葬列が止まっている。棺を流れへ戻し、葬儀を終えてください。

モデル: 1.1。実装: [JSON](../../../data/quests/q008.json)。場面 4、結末 3。物語状態の改訂 2。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・操作室・B2 (`region_1_f2`) / (6, 3) / イベント `q008_clue_a`。[ダンジョン定義](../../../data/dungeons.json)。浮かばない棺：現場の痕跡。現地イベント。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・棺の待避場・B2 (`region_1_lower_landing`) / (5, 1) / イベント `q008_clue_b`。[ダンジョン定義](../../../data/dungeons.json)。浮かばない棺：記録と証言。現地イベント。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・棺の待避場・B2 (`region_1_lower_landing`) / (7, 3) / イベント `q008_decision`。[ダンジョン定義](../../../data/dungeons.json)。浮かばない棺：決着の場。現地イベント。

固定された過去: 下流集落へ食料を届けようとしたヨルは、貨物の通行税と検査を避けるため、水葬用の棺の外底へ食料を隠した。食料は封じた遺体の内室とは接していない。重量と喫水が設計値を超えた棺は浅瀬の段差に乗り上げ、葬列を止めた。

AI向け注釈: 以下の事実はq008を成立させる世界設定上の制約だ。これらを台詞、説明、選択肢としてシナリオへ直接反映する必要はない。ただし、生成・改稿時に矛盾させてはいけない。

世界設定上の事実:

この地域の水葬では、遺体を封じた棺を指定水路へ流し、下流の葬送桟橋を経て町外へ送り出す。水葬用の棺は葬送組合が管理し、通常の貨物検査と通行税を免除されている。

棺には遺体を封じる内室と、浮力を調整する外底がある。ヨルは外底へ食料を詰めたため、食料は遺体へ触れていないが、棺は本来の浮力を失っている。

下流の受取人は葬送桟橋で外底だけを外し、食料を受け取る予定だった。棺の内室は開けず、そのまま水葬経路へ戻す手筈だ。

進行: 遺体を封じた内室、棺の外底、隠された食料を別の実体として扱う。遺族の了承、水葬の実施、食料の受取人確認、輸送許可を一度の出来事にまとめない。

### q008 実体と初期の所在

実体: party (`party`)。初期の所在・保持者: 水葬場の岸 (`shore`)。

実体: ヨル (`yoru`)。初期の所在・保持者: 水葬場の岸 (`shore`)。

実体: 棺の遺族 (`family`)。初期の所在・保持者: 水葬場の岸 (`shore`)。

実体: 棺の担ぎ手 (`bearers`)。初期の所在・保持者: 水葬場の岸 (`shore`)。

実体: 下流の受取人 (`recipient`)。初期の所在・保持者: 下流の受取桟橋 (`jetty`)。

実体: 輸送検査官 (`inspector`)。初期の所在・保持者: 検査窓口 (`office`)。

実体: coffin (`coffin`)。初期の所在・保持者: 浅瀬の段差 (`threshold`)。

実体: body (`body`)。初期の所在・保持者: coffin (`coffin`)。

実体: outerBase (`outerBase`)。初期の所在・保持者: coffin (`coffin`)。

実体: food (`food`)。初期の所在・保持者: outerBase (`outerBase`)。

### q008 / entry — 水葬場の岸

実装場面: `q008.v11.entry`。

イベントID: `q008-S-entry`。

登場: ヨル・棺の遺族・棺の担ぎ手。

棺は沈み切らず、段差に腹を掛けている。ヨルが綱を引くと、遺族も持ち上げようとした。下流には受取桟橋がある。

選択 `inspect`: 遺族の了承を得て棺を岸へ引き戻し、内室を開けず外底を調べる

行為: `entry_inspect`。

進行先: [`cargo`](#q008--cargo--水葬場の岸)。

選択 `tow`: 水辺の魔物を退け、重い棺を段差の向こうへ曳く

必要事項: 戦闘・作業と消費は勝利時に確定。

強制戦闘: `guard_1`。

［勝利後］

行為: `entry_tow`。

進行先: [結末 `contract`](#q008-結末-contract--重い棺を下流へ曳く)。

［逃走後］

退路へ戻った。この作業の移動・受け渡し・支払いはまだ確定していない。

［敗北後］

現場から救援された。依頼を再開すると、未完了の作業からやり直せる。

［戦闘の継続ここまで］

### q008 / cargo — 水葬場の岸

実装場面: `q008.v11.cargo`。

イベントID: `q008-S-cargo`。

登場: ヨル・棺の遺族・棺の担ぎ手。

外底の点検口を開くと食料の包みが見えた。遺体を封じた内室には触れていない。ヨルは、葬送用の棺が貨物検査と通行税を免除されるため、下流へ運ぶ食料を隠したと認めた。

選択 `declare`: 食料を外底から分け、内室の水葬を終えてから輸送許可を申請する

行為: `cargo_declare`。

進行先: [`application`](#q008--application--検査窓口)。

選択 `quiet`: 遺族に事情を伝えて棺を待棺所へ戻し、受取人を呼びに行く

行為: `cargo_quiet`。

進行先: [`postponed`](#q008--postponed--水葬場の岸)。

### q008 / application — 検査窓口

実装場面: `q008.v11.application`。

イベントID: `q008-S-application`。

登場: ヨル・輸送検査官。

検査官は今回の包みの量と行先を記録した。恒久的な免税ではなく、この便の臨時許可を審査する。受取人にも照会を取りに行く必要がある。

選択 `permit`: 受取人を窓口へ案内し、今回限りの確認と許可を得てから食料を運ぶ

行為: `application_permit`。

進行先: [結末 `informed`](#q008-結末-informed--水葬と許可された食料輸送)。

### q008 / postponed — 水葬場の岸

実装場面: `q008.v11.postponed`。

イベントID: `q008-S-postponed`。

登場: ヨル・下流の受取人。

受取人を桟橋から連れてきた。遺族は待棺所で待っている。食料はまだ外底に収まり、遺体とは接していない。食料を外せば棺は軽くなるが、葬儀を再開する時刻はまだ決めていない。

選択 `deliver`: 受取人と待棺所へ行き、食料だけを受け渡す

行為: `postponed_deliver`。

進行先: [結末 `compromise`](#q008-結末-compromise--水葬を延期して食料を届ける)。

### q008 結末 informed — 水葬と許可された食料輸送

イベントID: `q008-E-informed`。

遺族の了承を得て、遺体を納めた内室は本来の水葬経路へ送り出した。食料は外底から分け、受取人の照会を経た今回限りの輸送許可で下流集落へ届けた。恒久的な通行税と輸送制度の見直しは申請として残る。

57G / 68EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q008.values.funeral"},"right":true},{"op":"eq","left":{"ref":"stories.q008.values.permit"},"right":true},{"op":"eq","left":{"ref":"stories.q008.values.delivered"},"right":true},{"op":"eq","left":{"ref":"stories.q008.values.bodyAt"},"right":"coffin"},{"op":"eq","left":{"ref":"stories.q008.values.foodAt"},"right":"recipient"}]}`

### q008 結末 contract — 重い棺を下流へ曳く

イベントID: `q008-E-contract`。

棺を浅瀬の段差の先へ曳いた。下流の受取人は葬送桟橋で外底だけを外して食料を受け取り、遺体を封じた内室を水葬経路へ戻した。荷の由来と輸送資格を調べないまま、棺に食料を隠す方法は残った。

77G / 47EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q008.values.funeral"},"right":true},{"op":"eq","left":{"ref":"stories.q008.values.delivered"},"right":true},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q008.values.inspected"},"right":true}},{"op":"eq","left":{"ref":"stories.q008.values.coffinAt"},"right":"river"}]}`

### q008 結末 compromise — 水葬を延期して食料を届ける

イベントID: `q008-E-compromise`。

遺族の了承を得て、棺と遺体は待棺所へ戻した。食料だけを外底から取り出して下流の受取人へ届けた。飢えへの手当てはできたが、水葬は未完了で、食料の輸送許可も得ていない。

37G / 51EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q008.values.postponed"},"right":true},{"op":"eq","left":{"ref":"stories.q008.values.coffinAt"},"right":"mortuary"},{"op":"eq","left":{"ref":"stories.q008.values.delivered"},"right":true},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q008.values.funeral"},"right":true}}]}`

## 状態項目と初期値

`partyAt`：party の所在または保持者。型 `enum`、初期値 `"shore"`、許容値 `["shore","threshold","jetty","office","mortuary","river"]`。

`yoruAt`：yoru の所在または保持者。型 `enum`、初期値 `"shore"`、許容値 `["shore","threshold","jetty","office","mortuary","river"]`。

`familyAt`：family の所在または保持者。型 `enum`、初期値 `"shore"`、許容値 `["shore","threshold","jetty","office","mortuary","river"]`。

`bearersAt`：bearers の所在または保持者。型 `enum`、初期値 `"shore"`、許容値 `["shore","threshold","jetty","office","mortuary","river"]`。

`recipientAt`：recipient の所在または保持者。型 `enum`、初期値 `"jetty"`、許容値 `["shore","threshold","jetty","office","mortuary","river"]`。

`inspectorAt`：inspector の所在または保持者。型 `enum`、初期値 `"office"`、許容値 `["shore","threshold","jetty","office","mortuary","river"]`。

`coffinAt`：遺体を封じた内室の所在・保持者。外底は別に管理する。型 `enum`、初期値 `"threshold"`、許容値 `["shore","threshold","jetty","office","mortuary","river","party","yoru","family","bearers","recipient","inspector","body","outerBase","food"]`。

`bodyAt`：body の所在または保持者。型 `enum`、初期値 `"coffin"`、許容値 `["shore","threshold","jetty","office","mortuary","river","party","yoru","family","bearers","recipient","inspector","coffin","outerBase","food"]`。

`outerBaseAt`：浮力を調整する外底の所在・保持者。型 `enum`、初期値 `"coffin"`、許容値 `["shore","threshold","jetty","office","mortuary","river","party","yoru","family","bearers","recipient","inspector","coffin","body","food"]`。

`foodAt`：外底に隠した食料の所在・保持者。型 `enum`、初期値 `"outerBase"`、許容値 `["shore","threshold","jetty","office","mortuary","river","party","yoru","family","bearers","recipient","inspector","coffin","body","outerBase"]`。

`consent`：consent。型 `boolean`、初期値 `false`。

`inspected`：inspected。型 `boolean`、初期値 `false`。

`permit`：permit。型 `boolean`、初期値 `false`。

`delivered`：delivered。型 `boolean`、初期値 `false`。

`funeral`：funeral。型 `boolean`、初期値 `false`。

`postponed`：postponed。型 `boolean`、初期値 `false`。

`declared`：declared。型 `boolean`、初期値 `false`。

## 行為の条件と状態変化

本文の選択と行為IDを対応させ、効果を実行順で記す。条件式は配布JSONの値。資材・所持金不足では支払いも受け渡しも確定しない。実移動では出発効果と到着効果を分ける。

### 行為 entry_inspect

[q008-S-entry](#q008--entry--水葬場の岸) → [q008-S-cargo](#q008--cargo--水葬場の岸)。条件 `true`。費用：なし。一度だけ確定する。

状態更新：`consent` = `true`。

移動：探索隊 (`party`)・棺の担ぎ手 (`bearers`)。水葬場の岸 (`shore`) → 浅瀬の段差 (`threshold`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：棺の内室 (`coffin`) を 浅瀬の段差 (`threshold`) から 探索隊 (`party`) へ。

移動：探索隊 (`party`)・棺の担ぎ手 (`bearers`)。浅瀬の段差 (`threshold`) → 水葬場の岸 (`shore`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：棺の内室 (`coffin`) を 探索隊 (`party`) から 水葬場の岸 (`shore`) へ。

状態更新：`inspected` = `true`。

認識獲得：探索隊 (`party`) が 隠された食料 (`food`) から `cargo`（棺の外底には食料の包みが隠されている）を知る。観察条件 `true`。

### 行為 entry_tow

[q008-S-entry](#q008--entry--水葬場の岸) → [q008-E-contract](#q008-結末-contract--重い棺を下流へ曳く)。条件 `true`。費用：なし。一度だけ確定する。

移動：探索隊 (`party`)・棺の担ぎ手 (`bearers`)。水葬場の岸 (`shore`) → 浅瀬の段差 (`threshold`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：棺の内室 (`coffin`) を 浅瀬の段差 (`threshold`) から 探索隊 (`party`) へ。

移動：探索隊 (`party`)・棺の担ぎ手 (`bearers`)。浅瀬の段差 (`threshold`) → 下流の受取桟橋 (`jetty`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：着脱式の外底 (`outerBase`) を 棺の内室 (`coffin`) から 下流の受取桟橋 (`jetty`) へ。

受け渡し：隠された食料 (`food`) を 着脱式の外底 (`outerBase`) から 下流の受取人 (`recipient`) へ。

状態更新：`delivered` = `true`。

移動：探索隊 (`party`)・棺の担ぎ手 (`bearers`)。下流の受取桟橋 (`jetty`) → 水葬の流れ (`river`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：棺の内室 (`coffin`) を 探索隊 (`party`) から 水葬の流れ (`river`) へ。

状態更新：`funeral` = `true`。

### 行為 cargo_declare

[q008-S-cargo](#q008--cargo--水葬場の岸) → [q008-S-application](#q008--application--検査窓口)。条件 `true`。費用：なし。一度だけ確定する。

受け渡し：着脱式の外底 (`outerBase`) を 棺の内室 (`coffin`) から 水葬場の岸 (`shore`) へ。

受け渡し：隠された食料 (`food`) を 着脱式の外底 (`outerBase`) から ヨル (`yoru`) へ。

受け渡し：棺の内室 (`coffin`) を 水葬場の岸 (`shore`) から 探索隊 (`party`) へ。

移動：探索隊 (`party`)・棺の遺族 (`family`)・棺の担ぎ手 (`bearers`)。水葬場の岸 (`shore`) → 水葬の流れ (`river`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：棺の内室 (`coffin`) を 探索隊 (`party`) から 水葬の流れ (`river`) へ。

状態更新：`funeral` = `true`。

移動：探索隊 (`party`)・棺の遺族 (`family`)・棺の担ぎ手 (`bearers`)。水葬の流れ (`river`) → 水葬場の岸 (`shore`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

移動：探索隊 (`party`)・ヨル (`yoru`)。水葬場の岸 (`shore`) → 検査窓口 (`office`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`declared` = `true`。

### 行為 cargo_quiet

[q008-S-cargo](#q008--cargo--水葬場の岸) → [q008-S-postponed](#q008--postponed--水葬場の岸)。条件 `true`。費用：なし。一度だけ確定する。

受け渡し：棺の内室 (`coffin`) を 水葬場の岸 (`shore`) から 探索隊 (`party`) へ。

移動：探索隊 (`party`)・棺の遺族 (`family`)・棺の担ぎ手 (`bearers`)。水葬場の岸 (`shore`) → 待棺所 (`mortuary`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：棺の内室 (`coffin`) を 探索隊 (`party`) から 待棺所 (`mortuary`) へ。

状態更新：`postponed` = `true`。

移動：探索隊 (`party`)。待棺所 (`mortuary`) → 水葬場の岸 (`shore`) → 浅瀬の段差 (`threshold`) → 下流の受取桟橋 (`jetty`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

移動：探索隊 (`party`)・下流の受取人 (`recipient`)。下流の受取桟橋 (`jetty`) → 浅瀬の段差 (`threshold`) → 水葬場の岸 (`shore`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 application_permit

[q008-S-application](#q008--application--検査窓口) → [q008-E-informed](#q008-結末-informed--水葬と許可された食料輸送)。条件 `true`。費用：なし。一度だけ確定する。

移動：探索隊 (`party`)。検査窓口 (`office`) → 水葬場の岸 (`shore`) → 浅瀬の段差 (`threshold`) → 下流の受取桟橋 (`jetty`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

移動：探索隊 (`party`)・下流の受取人 (`recipient`)。下流の受取桟橋 (`jetty`) → 浅瀬の段差 (`threshold`) → 水葬場の岸 (`shore`) → 検査窓口 (`office`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`permit` = `true`。

移動：探索隊 (`party`)・下流の受取人 (`recipient`)・ヨル (`yoru`)。検査窓口 (`office`) → 水葬場の岸 (`shore`) → 浅瀬の段差 (`threshold`) → 下流の受取桟橋 (`jetty`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：隠された食料 (`food`) を ヨル (`yoru`) から 下流の受取人 (`recipient`) へ。

状態更新：`delivered` = `true`。

### 行為 postponed_deliver

[q008-S-postponed](#q008--postponed--水葬場の岸) → [q008-E-compromise](#q008-結末-compromise--水葬を延期して食料を届ける)。条件 `true`。費用：なし。一度だけ確定する。

移動：探索隊 (`party`)・下流の受取人 (`recipient`)・ヨル (`yoru`)。水葬場の岸 (`shore`) → 待棺所 (`mortuary`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：隠された食料 (`food`) を 着脱式の外底 (`outerBase`) から 下流の受取人 (`recipient`) へ。

移動：探索隊 (`party`)・下流の受取人 (`recipient`)・ヨル (`yoru`)。待棺所 (`mortuary`) → 水葬場の岸 (`shore`) → 浅瀬の段差 (`threshold`) → 下流の受取桟橋 (`jetty`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`delivered` = `true`。

## 資材不足・戦闘後の再開・保存

現行の作業別資材不足ルートはない。条件付きの選択肢と行為条件は本編全文・行為一覧を参照する。

共通の中断選択肢はない。メッセージ・判断の途中で閉じた場合は通常の保存位置から再開する。戦闘の逃走・敗北後は本編記載の継続命令に従い、勝利後の作業・費用を先に確定しない。q001固有の老人遭遇への巻戻しを、この依頼にも実装済みとは扱わない。

## 編集時の確認事項

曳航前の戦闘で逃走・敗北した場合、移送と引き渡しを済ませない。

岸・段差・下流桟橋・検査窓口・待棺所・水葬の流れを別地点として接続する。物品の入れ子の保持者を確認する。

水葬の完了、食料の到着、輸送許可を別々に照合する。延期の結末で水葬完了を描かない。

以下は改稿・物理接続を行う際の確認観点であり、全項目を実ブラウザで確認済みという記録ではない。今回の検証結果は [PROGRESS.md](../../development/PROGRESS.md) を参照する。

## マップデータと接続定義

実配置へ入口から到達する接続経路上のマップを掲載する。旧経路用の条件付き配置も含むため、全マップの踏破を本編の完了条件とはしない。クエスト配置はeventsから重ね、共通マップのJSONと分ける。

### 灯守の地下水道 の経路

入口：`{"main":{"map":"region_1_f1","point":"entrance"}}`。

`upper_inlet`：第一水路の水密扉。`region_1_f1` (9, 1) ↔ `region_1_canal_a` (1, 1)。接続方式 `watertight_door`。

`upper_landing`：荷揚げ場の水密扉。`region_1_canal_a` (9, 1) ↔ `region_1_landing` (1, 1)。接続方式 `watertight_door`。

`dry_stair`：乾いた階段室。`region_1_landing` (5, 3) ↔ `region_1_f2` (1, 1)。接続方式 `stairs`。

`lower_inlet`：給金箱水路の水密扉。`region_1_f2` (9, 1) ↔ `region_1_canal_c` (1, 1)。接続方式 `watertight_door`。

`lower_landing`：待避場の水密扉。`region_1_canal_c` (9, 1) ↔ `region_1_lower_landing` (1, 1)。接続方式 `watertight_door`。

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

### region_1_f2 の全マップJSON

灯守の地下水道・下層・操作室・B2、11×9セル。[配布JSON](../../../data/maps/region_1_f2.json)。左上(0,0)、xは右、yは下。通行と水位は配布データと迷宮システムの判定に従う。

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
  "id": "region_1_f2",
  "name": "灯守の地下水道・下層・操作室",
  "floor": 2,
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
      "id": "cache",
      "x": 1,
      "y": 3,
      "name": "補給の箱",
      "kind": "chest",
      "trigger": "interact",
      "once": true,
      "safe": true,
      "script": "region_1_f2.cache"
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
      "script": "region_1_f2.fountain"
    },
    {
      "id": "trap",
      "x": 7,
      "y": 3,
      "name": "崩れた石床",
      "kind": "trap",
      "trigger": "enter",
      "once": true,
      "script": "region_1_f2.trap"
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
      "script": "region_1_f2.door",
      "condition": {
        "op": "not",
        "arg": {
          "op": "eq",
          "left": {
            "ref": "flags.region_1_f2_door_open"
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

### region_1_canal_c の全マップJSON

灯守の地下水道・下層・給金箱の水路・B2、11×7セル。[配布JSON](../../../data/maps/region_1_canal_c.json)。左上(0,0)、xは右、yは下。通行と水位は配布データと迷宮システムの判定に従う。

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
  "id": "region_1_canal_c",
  "name": "灯守の地下水道・下層・給金箱の水路",
  "floor": 2,
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

### region_1_lower_landing の全マップJSON

灯守の地下水道・下層・棺の待避場・B2、11×9セル。[配布JSON](../../../data/maps/region_1_lower_landing.json)。左上(0,0)、xは右、yは下。通行と水位は配布データと迷宮システムの判定に従う。

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
  "id": "region_1_lower_landing",
  "name": "灯守の地下水道・下層・棺の待避場",
  "floor": 2,
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
    "id": "q008_clue_a",
    "title": "浮かばない棺：現場の痕跡",
    "points": [
      {
        "map": "region_1_f2",
        "x": 6,
        "y": 3,
        "dungeon": "region_1"
      }
    ],
    "kind": "clue",
    "trigger": "interact",
    "safe": true,
    "script": "q008.clue_a",
    "role": "clue_a",
    "visibleWhen": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q008.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "flags.legacyQuestRoutes.q008"
          },
          "right": true
        }
      ]
    },
    "dungeon": "region_1"
  },
  {
    "id": "q008_clue_b",
    "title": "浮かばない棺：記録と証言",
    "points": [
      {
        "map": "region_1_lower_landing",
        "x": 5,
        "y": 1,
        "dungeon": "region_1"
      }
    ],
    "kind": "clue",
    "trigger": "interact",
    "safe": true,
    "script": "q008.clue_b",
    "role": "clue_b",
    "visibleWhen": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q008.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "flags.legacyQuestRoutes.q008"
          },
          "right": true
        }
      ]
    },
    "dungeon": "region_1"
  },
  {
    "id": "q008_decision",
    "title": "浮かばない棺：決着の場",
    "points": [
      {
        "map": "region_1_lower_landing",
        "x": 7,
        "y": 3,
        "dungeon": "region_1"
      }
    ],
    "kind": "decision",
    "trigger": "interact",
    "safe": true,
    "script": "q008.v11.visit",
    "role": "decision",
    "visibleWhen": {
      "op": "or",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q008.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "quests.q008.stage"
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
    "shore": "水葬場の岸",
    "threshold": "浅瀬の段差",
    "jetty": "下流の受取桟橋",
    "office": "検査窓口",
    "mortuary": "待棺所",
    "river": "水葬の流れ"
  },
  "connections": [
    [
      "shore",
      "threshold"
    ],
    [
      "threshold",
      "jetty"
    ],
    [
      "shore",
      "office"
    ],
    [
      "shore",
      "mortuary"
    ],
    [
      "jetty",
      "river"
    ],
    [
      "shore",
      "river"
    ]
  ],
  "registry": {
    "partyAt": {
      "type": "enum",
      "initial": "shore",
      "values": [
        "shore",
        "threshold",
        "jetty",
        "office",
        "mortuary",
        "river"
      ],
      "meaning": "party の所在または保持者"
    },
    "yoruAt": {
      "type": "enum",
      "initial": "shore",
      "values": [
        "shore",
        "threshold",
        "jetty",
        "office",
        "mortuary",
        "river"
      ],
      "meaning": "yoru の所在または保持者"
    },
    "familyAt": {
      "type": "enum",
      "initial": "shore",
      "values": [
        "shore",
        "threshold",
        "jetty",
        "office",
        "mortuary",
        "river"
      ],
      "meaning": "family の所在または保持者"
    },
    "bearersAt": {
      "type": "enum",
      "initial": "shore",
      "values": [
        "shore",
        "threshold",
        "jetty",
        "office",
        "mortuary",
        "river"
      ],
      "meaning": "bearers の所在または保持者"
    },
    "recipientAt": {
      "type": "enum",
      "initial": "jetty",
      "values": [
        "shore",
        "threshold",
        "jetty",
        "office",
        "mortuary",
        "river"
      ],
      "meaning": "recipient の所在または保持者"
    },
    "inspectorAt": {
      "type": "enum",
      "initial": "office",
      "values": [
        "shore",
        "threshold",
        "jetty",
        "office",
        "mortuary",
        "river"
      ],
      "meaning": "inspector の所在または保持者"
    },
    "coffinAt": {
      "type": "enum",
      "initial": "threshold",
      "values": [
        "shore",
        "threshold",
        "jetty",
        "office",
        "mortuary",
        "river",
        "party",
        "yoru",
        "family",
        "bearers",
        "recipient",
        "inspector",
        "body",
        "outerBase",
        "food"
      ],
      "meaning": "遺体を封じた内室の所在・保持者。外底は別に管理する"
    },
    "bodyAt": {
      "type": "enum",
      "initial": "coffin",
      "values": [
        "shore",
        "threshold",
        "jetty",
        "office",
        "mortuary",
        "river",
        "party",
        "yoru",
        "family",
        "bearers",
        "recipient",
        "inspector",
        "coffin",
        "outerBase",
        "food"
      ],
      "meaning": "body の所在または保持者"
    },
    "outerBaseAt": {
      "type": "enum",
      "initial": "coffin",
      "values": [
        "shore",
        "threshold",
        "jetty",
        "office",
        "mortuary",
        "river",
        "party",
        "yoru",
        "family",
        "bearers",
        "recipient",
        "inspector",
        "coffin",
        "body",
        "food"
      ],
      "meaning": "浮力を調整する外底の所在・保持者"
    },
    "foodAt": {
      "type": "enum",
      "initial": "outerBase",
      "values": [
        "shore",
        "threshold",
        "jetty",
        "office",
        "mortuary",
        "river",
        "party",
        "yoru",
        "family",
        "bearers",
        "recipient",
        "inspector",
        "coffin",
        "body",
        "outerBase"
      ],
      "meaning": "外底に隠した食料の所在・保持者"
    },
    "consent": {
      "type": "boolean",
      "initial": false,
      "meaning": "consent"
    },
    "inspected": {
      "type": "boolean",
      "initial": false,
      "meaning": "inspected"
    },
    "permit": {
      "type": "boolean",
      "initial": false,
      "meaning": "permit"
    },
    "delivered": {
      "type": "boolean",
      "initial": false,
      "meaning": "delivered"
    },
    "funeral": {
      "type": "boolean",
      "initial": false,
      "meaning": "funeral"
    },
    "postponed": {
      "type": "boolean",
      "initial": false,
      "meaning": "postponed"
    },
    "declared": {
      "type": "boolean",
      "initial": false,
      "meaning": "declared"
    }
  },
  "entities": {
    "party": {
      "holder": "partyAt",
      "kind": "group"
    },
    "yoru": {
      "holder": "yoruAt",
      "kind": "person",
      "character": "yoru"
    },
    "family": {
      "holder": "familyAt",
      "kind": "group",
      "character": "family"
    },
    "bearers": {
      "holder": "bearersAt",
      "kind": "group",
      "character": "bearers"
    },
    "recipient": {
      "holder": "recipientAt",
      "kind": "person",
      "character": "recipient"
    },
    "inspector": {
      "holder": "inspectorAt",
      "kind": "person",
      "character": "inspector"
    },
    "coffin": {
      "holder": "coffinAt",
      "kind": "item"
    },
    "body": {
      "holder": "bodyAt",
      "kind": "item"
    },
    "outerBase": {
      "holder": "outerBaseAt",
      "kind": "item"
    },
    "food": {
      "holder": "foodAt",
      "kind": "item"
    }
  },
  "propositions": {
    "cargo": {
      "text": "棺の外底には食料の包みが隠されている"
    }
  },
  "initialKnowledge": {},
  "invariants": [],
  "scenes": {
    "entry": {
      "title": "水葬場の岸",
      "place": "shore",
      "cast": [
        {
          "entity": "yoru"
        },
        {
          "entity": "family"
        },
        {
          "entity": "bearers"
        }
      ],
      "requires": true
    },
    "cargo": {
      "title": "水葬場の岸",
      "place": "shore",
      "cast": [
        {
          "entity": "yoru"
        },
        {
          "entity": "family"
        },
        {
          "entity": "bearers"
        }
      ],
      "requires": true
    },
    "application": {
      "title": "検査窓口",
      "place": "office",
      "cast": [
        {
          "entity": "yoru"
        },
        {
          "entity": "inspector"
        }
      ],
      "requires": true
    },
    "postponed": {
      "title": "水葬場の岸",
      "place": "shore",
      "cast": [
        {
          "entity": "yoru"
        },
        {
          "entity": "recipient"
        }
      ],
      "requires": true
    }
  },
  "actions": {
    "entry_inspect": {
      "from": [
        "entry"
      ],
      "to": "cargo",
      "requires": true,
      "effects": [
        {
          "op": "set",
          "key": "consent",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party",
            "bearers"
          ],
          "path": [
            "shore",
            "threshold"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "coffin",
          "from": "threshold",
          "to": "party"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "bearers"
          ],
          "path": [
            "threshold",
            "shore"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "coffin",
          "from": "party",
          "to": "shore"
        },
        {
          "op": "set",
          "key": "inspected",
          "value": true
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "cargo",
          "source": "food",
          "requires": true
        }
      ],
      "once": true
    },
    "entry_tow": {
      "from": [
        "entry"
      ],
      "ending": "contract",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party",
            "bearers"
          ],
          "path": [
            "shore",
            "threshold"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "coffin",
          "from": "threshold",
          "to": "party"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "bearers"
          ],
          "path": [
            "threshold",
            "jetty"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "outerBase",
          "from": "coffin",
          "to": "jetty"
        },
        {
          "op": "transfer",
          "entity": "food",
          "from": "outerBase",
          "to": "recipient"
        },
        {
          "op": "set",
          "key": "delivered",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party",
            "bearers"
          ],
          "path": [
            "jetty",
            "river"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "coffin",
          "from": "party",
          "to": "river"
        },
        {
          "op": "set",
          "key": "funeral",
          "value": true
        }
      ],
      "once": true
    },
    "cargo_declare": {
      "from": [
        "cargo"
      ],
      "to": "application",
      "requires": true,
      "effects": [
        {
          "op": "transfer",
          "entity": "outerBase",
          "from": "coffin",
          "to": "shore"
        },
        {
          "op": "transfer",
          "entity": "food",
          "from": "outerBase",
          "to": "yoru"
        },
        {
          "op": "transfer",
          "entity": "coffin",
          "from": "shore",
          "to": "party"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "family",
            "bearers"
          ],
          "path": [
            "shore",
            "river"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "coffin",
          "from": "party",
          "to": "river"
        },
        {
          "op": "set",
          "key": "funeral",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party",
            "family",
            "bearers"
          ],
          "path": [
            "river",
            "shore"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "yoru"
          ],
          "path": [
            "shore",
            "office"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "declared",
          "value": true
        }
      ],
      "once": true
    },
    "cargo_quiet": {
      "from": [
        "cargo"
      ],
      "to": "postponed",
      "requires": true,
      "effects": [
        {
          "op": "transfer",
          "entity": "coffin",
          "from": "shore",
          "to": "party"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "family",
            "bearers"
          ],
          "path": [
            "shore",
            "mortuary"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "coffin",
          "from": "party",
          "to": "mortuary"
        },
        {
          "op": "set",
          "key": "postponed",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "mortuary",
            "shore",
            "threshold",
            "jetty"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "recipient"
          ],
          "path": [
            "jetty",
            "threshold",
            "shore"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true
    },
    "application_permit": {
      "from": [
        "application"
      ],
      "ending": "informed",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "office",
            "shore",
            "threshold",
            "jetty"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "recipient"
          ],
          "path": [
            "jetty",
            "threshold",
            "shore",
            "office"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "permit",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party",
            "recipient",
            "yoru"
          ],
          "path": [
            "office",
            "shore",
            "threshold",
            "jetty"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "food",
          "from": "yoru",
          "to": "recipient"
        },
        {
          "op": "set",
          "key": "delivered",
          "value": true
        }
      ],
      "once": true
    },
    "postponed_deliver": {
      "from": [
        "postponed"
      ],
      "ending": "compromise",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party",
            "recipient",
            "yoru"
          ],
          "path": [
            "shore",
            "mortuary"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "food",
          "from": "outerBase",
          "to": "recipient"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "recipient",
            "yoru"
          ],
          "path": [
            "mortuary",
            "shore",
            "threshold",
            "jetty"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "delivered",
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
            "ref": "stories.q008.values.funeral"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q008.values.permit"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q008.values.delivered"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q008.values.bodyAt"
          },
          "right": "coffin"
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q008.values.foodAt"
          },
          "right": "recipient"
        }
      ]
    },
    "contract": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "stories.q008.values.funeral"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q008.values.delivered"
          },
          "right": true
        },
        {
          "op": "not",
          "arg": {
            "op": "eq",
            "left": {
              "ref": "stories.q008.values.inspected"
            },
            "right": true
          }
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q008.values.coffinAt"
          },
          "right": "river"
        }
      ]
    },
    "compromise": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "stories.q008.values.postponed"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q008.values.coffinAt"
          },
          "right": "mortuary"
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q008.values.delivered"
          },
          "right": true
        },
        {
          "op": "not",
          "arg": {
            "op": "eq",
            "left": {
              "ref": "stories.q008.values.funeral"
            },
            "right": true
          }
        }
      ]
    }
  },
  "revision": 2
}
```

</details>

## 編集元と再生成

本編は [authoring/stories-v11-2.mjs](../../../authoring/stories-v11-2.mjs)、配置は [config/quests/q008.events.json](../../../config/quests/q008.events.json)、配布内容は [data/quests/q008.json](../../../data/quests/q008.json)。地形は [config/connected-maps.json](../../../config/connected-maps.json)、接続・給排水は [config/dungeons/region_1.json](../../../config/dungeons/region_1.json)、施設は [config/locations.json](../../../config/locations.json) を参照する。

解説と確認観点は [authoring/quest-page-notes.mjs](../../../authoring/quest-page-notes.mjs)、ページ構成は [tools/quest-page-details.mjs](../../../tools/quest-page-details.mjs) を編集する。本文を手直しする場合は物語原稿へ反映し、`npm run build:scenarios` で配布データも更新する。文書だけの再生成は `npm run build:catalog`、照合は `npm run check:docs`。`npm run build:docs` 単独は個別ページの本文を保持する。
