# q006 沈んだ給金箱：詳細・配置・状態変化

[個別ページ一覧](README.md) ／ [カタログへ戻る](../QUEST_CATALOG.md#q006-沈んだ給金箱) ／ [シナリオ本文](#q006-沈んだ給金箱) ／ [行為の条件と状態変化](#行為の条件と状態変化) ／ [配置イベント](#配置イベントと操作条件)

作品版 1.25.0。配布JSONから生成した作者向けページ。真相と結末を含む。本編5場面・3結末。

<!-- quest-page-source:a91a81b8c75ffc91ff332517fcaaf3827d52c11e475db0a37f5d654154b9b2f2 -->

## 依頼の焦点と分岐の意味

回収を依頼するガロ自身が盗難に見せかけた当事者である。石入りの箱という観察だけでは、盗まれたのか最初から金がなかったのかは確定しない。

縄を使う回収は戦闘勝利後に確定する。荷役人の道具と協力で回収する経路もあり、私的な返却を選んだ後も報告を終える前なら箱を返してもらえる。

給金台帳と入金台帳は一組の実体ledgerとして管理する。箱・台帳・目撃報告をそろえ、未払額と入金の不存在を照合する。

informedはガロの説明撤回と私物売却による一部払いまで確認する。compromiseは証拠を荷役人へ引き渡すところまでで、支払いの成立を保証しない。

## 実装範囲と場所

現地イベントの配置と物語状態は実装済み。ただし worldPlaces と story.journey は未定義で、行為内の move は物語上の所在変更である。本文にある施設や通路を実際に歩いて到達する方式には未接続。以下の物語内経路を実マップの座標や移動完了と読み替えない。

`landing`：水路の回収場。物語上の場所。個別の実座標・施設IDは未割当。

`water`：箱が沈む浅瀬。物語上の場所。個別の実座標・施設IDは未割当。

`shore`：荷役人の待機岸。物語上の場所。個別の実座標・施設IDは未割当。

`office`：ガロの事務所。物語上の場所。個別の実座標・施設IDは未割当。

### 物語内の接続

水路の回収場 (`landing`) ↔ 箱が沈む浅瀬 (`water`)。

水路の回収場 (`landing`) ↔ 荷役人の待機岸 (`shore`)。

荷役人の待機岸 (`shore`) ↔ ガロの事務所 (`office`)。

## 人物・物品と認識

探索隊 (`party`)：集団。初期の所在・保持者は 水路の回収場 (`landing`)、保存項目は `partyAt`。

ガロ (`garo`)：人物。初期の所在・保持者は 水路の回収場 (`landing`)、保存項目は `garoAt`。工事頭。未払いを隠し、石入りの給金箱を未開封で取り戻す。

工事の職人たち (`workers`)：集団。初期の所在・保持者は 荷役人の待機岸 (`shore`)、保存項目は `workersAt`。未払い給金を待つ集団。未払いを受け取り、仲間への疑いを解く。

疑われた荷役人 (`accused`)：人物。初期の所在・保持者は 荷役人の待機岸 (`shore`)、保存項目は `accusedAt`。給金箱の紛失を責められた人。盗みの疑いを晴らす。

給金箱 (`box`)：物品。初期の所在・保持者は 箱が沈む浅瀬 (`water`)、保存項目は `boxAt`。

給金台帳・入金台帳の一組 (`ledger`)：物品。初期の所在・保持者は ガロの事務所 (`office`)、保存項目は `ledgerAt`。

箱に詰められた石 (`stones`)：物品。初期の所在・保持者は 給金箱 (`box`)、保存項目は `stonesAt`。

認識 `stones`：給金箱に金ではなく石が入っていた。

認識 `wages`：給金台帳には職人ごとの未払額がある。

認識 `deposits`：入金台帳には給金箱へ現金を入れた記録がない。

認識 `debt`：石入りの箱と給金台帳・入金台帳を照合し、盗難ではなく最初から未払いだったと分かった。

初期認識：`{}`。固定された過去と探索隊がすでに知る情報は別に扱い、observeの成立で認識を加える。

## 本編の進行とイベントID

本編場面は `q006-S-場面キー`、配置は `q006-P-配置キー`、結末は `q006-E-結末キー`。S・P・Eは文書用の識別子。Fは強制戦闘、Bは戦闘中イベントで、命令に明示されたidがあればそれを使い、ない戦闘には文書用IDを付ける。全12IDが一意で、場面を並べ替えても変わらない。

[q006-S-entry](#q006--entry--水路の回収場)：水路の回収場。物語内の場所 `landing`。

選択 `lift`：縄で箱を引き上げ、水路の魔物を退ける → [q006-S-box](#q006--box--水路の回収場)。行為 [`entry_lift`](#行為-entry_lift)。戦闘勝利後に行為を確定する。

選択 `witness`：荷役人に沈没位置を伝え、彼らの道具で一緒に回収する → [q006-S-accounts](#q006--accounts--荷役人の待機岸)。行為 [`entry_witness`](#行為-entry_witness)。

[q006-S-box](#q006--box--水路の回収場)：水路の回収場。物語内の場所 `landing`。

選択 `return`：箱を未開封のままガロへ返す → [q006-S-private](#q006--private--水路の回収場)。行為 [`box_return`](#行為-box_return)。

選択 `public`：箱を保持し、荷役人の前で開く → [q006-S-accounts](#q006--accounts--荷役人の待機岸)。行為 [`box_public`](#行為-box_public)。

[q006-S-private](#q006--private--水路の回収場)：水路の回収場。物語内の場所 `landing`。

選択 `leave`：未開封で返した仕事として報告を終える → [q006-E-contract](#q006-結末-contract--給金箱を私的に返す)。行為 [`private_leave`](#行為-private_leave)。

選択 `retract`：報告を保留し、箱を返してもらって荷役人の前へ運ぶ → [q006-S-accounts](#q006--accounts--荷役人の待機岸)。行為 [`private_retract`](#行為-private_retract)。

[q006-S-accounts](#q006--accounts--荷役人の待機岸)：荷役人の待機岸。物語内の場所 `shore`。

選択 `ledger`：箱の石を確認し、ガロに同行を求めて事務所の二つの台帳を確かめる → [q006-S-ledger](#q006--ledger--荷役人の待機岸)。行為 [`accounts_ledger`](#行為-accounts_ledger)。

[q006-S-ledger](#q006--ledger--荷役人の待機岸)：荷役人の待機岸。物語内の場所 `shore`。

選択 `settle`：ガロの私物売却による一部払いを全員の前で成立させる → [q006-E-informed](#q006-結末-informed--台帳を開き一部払いを成立させる)。行為 [`ledger_settle`](#行為-ledger_settle)。

選択 `delegate`：箱と二つの台帳と目撃報告を荷役人へ渡し、交渉を委ねる → [q006-E-compromise](#q006-結末-compromise--証拠を荷役人へ引き渡す)。行為 [`ledger_delegate`](#行為-ledger_delegate)。

強制戦闘：`q006-F-entry-lift-guard_1`。起動位置と勝敗後の継続は、下記の本編全文のbattle.startを展開した箇所に掲載する。

## 配置イベントと操作条件

配置が保存されていることと、通常プレイで表示されることは同じではない。表示条件・操作条件は別々に評価する。legacyQuestRoutesを要する配置は旧経路用で、現行本編の必須経路へ数えない。

### q006-P-clue_a

沈んだ給金箱：現場の痕跡。実行ID `q006_clue_a`、起動 `interact`、スクリプト `q006.clue_a`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・操作室・B2 (`region_1_f2`) / (4, 3) / イベント `q006_clue_a`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"and","args":[{"op":"eq","left":{"ref":"quests.q006.stage"},"right":"active"},{"op":"eq","left":{"ref":"flags.legacyQuestRoutes.q006"},"right":true}]}`。操作条件：`true`。

<details>
<summary>この配置の実行スクリプト</summary>

```json
{
  "commands": [
    {
      "op": "narrate",
      "text": "箱へ結ばれた縄は切れずにほどかれ、工事頭専用の結びが残っている。"
    },
    {
      "op": "quest.evidence",
      "quest": "q006",
      "key": "clue_a",
      "text": "箱へ結ばれた縄は切れずにほどかれ、工事頭専用の結びが残っている。"
    }
  ]
}
```

</details>

### q006-P-clue_b

沈んだ給金箱：記録と証言。実行ID `q006_clue_b`、起動 `interact`、スクリプト `q006.clue_b`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・給金箱の水路・B2 (`region_1_canal_c`) / (4, 1) / イベント `q006_clue_b`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"and","args":[{"op":"eq","left":{"ref":"quests.q006.stage"},"right":"active"},{"op":"eq","left":{"ref":"flags.legacyQuestRoutes.q006"},"right":true}]}`。操作条件：`true`。

<details>
<summary>この配置の実行スクリプト</summary>

```json
{
  "commands": [
    {
      "op": "say",
      "name": "工事頭のガロ",
      "text": "箱の重さの記録は銀貨入りより軽く、中には石の音がします。"
    },
    {
      "op": "quest.evidence",
      "quest": "q006",
      "key": "clue_b",
      "text": "箱の重さの記録は銀貨入りより軽く、中には石の音がする。"
    }
  ]
}
```

</details>

### q006-P-decision

沈んだ給金箱：決着の場。実行ID `q006_decision`、起動 `interact`、スクリプト `q006.v11.visit`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・給金箱の水路・B2 (`region_1_canal_c`) / (7, 1) / イベント `q006_decision`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"or","args":[{"op":"eq","left":{"ref":"quests.q006.stage"},"right":"active"},{"op":"eq","left":{"ref":"quests.q006.stage"},"right":"completed"}]}`。操作条件：`true`。

物語の現在場面・補給後の再開先を呼び出す入口。本編全文は下記へ集約する。

## q006 沈んだ給金箱

依頼人: 工事頭のガロ。地域: 1。いつでも受注できる。

職人の給金を入れた箱が水路へ沈み、最後に箱を運んだ荷役人が疑われている。箱を回収してください。

モデル: 1.1。実装: [JSON](../../../data/quests/q006.json)。場面 5、結末 3。物語状態の改訂 1。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・操作室・B2 (`region_1_f2`) / (4, 3) / イベント `q006_clue_a`。[ダンジョン定義](../../../data/dungeons.json)。沈んだ給金箱：現場の痕跡。現地イベント。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・給金箱の水路・B2 (`region_1_canal_c`) / (4, 1) / イベント `q006_clue_b`。[ダンジョン定義](../../../data/dungeons.json)。沈んだ給金箱：記録と証言。現地イベント。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・給金箱の水路・B2 (`region_1_canal_c`) / (7, 1) / イベント `q006_decision`。[ダンジョン定義](../../../data/dungeons.json)。沈んだ給金箱：決着の場。現地イベント。

固定された過去: 工事費を使い切ったガロには、職人へ払う給金が残っていなかった。ガロは空の給金箱へ石を詰め、最後に箱を扱った荷役人の作業場所近くへ沈め、運搬中の盗難に見せかけた。職人たちから第三者による捜索を求められたため、ガロは箱を開けず自分へ返す条件で冒険者へ回収を依頼した。

AI向け注釈: 以下の事実はq006を成立させる世界設定上の制約だ。これらを台詞、説明、選択肢としてシナリオへ直接反映する必要はない。ただし、生成・改稿時に矛盾させてはいけない。

世界設定上の事実:

給金箱は施錠されており、回収者は依頼人へ未開封で返すのが通常だ。ガロはこの慣行を利用し、石入りの箱を私的に回収して処分するつもりだ。

疑われた荷役人は最後に空箱を所定位置まで運んだが、給金を受け取っておらず、箱を沈めてもいない。

事務所の給金台帳には職人ごとの未払額があり、入金台帳には給金箱へ現金を入れた記録がない。石入りの箱と二つの台帳を公開の場で照合すれば、盗難ではなく最初から未払いだったと立証できる。

進行: 箱を私的に返すと中身を隠せる。公開の場で箱を開き、給金台帳と入金台帳を照合した場合だけ、盗難ではなく未払いの偽装だったと確定する。

### q006 実体と初期の所在

実体: party (`party`)。初期の所在・保持者: 水路の回収場 (`landing`)。

実体: ガロ (`garo`)。初期の所在・保持者: 水路の回収場 (`landing`)。

実体: 工事の職人たち (`workers`)。初期の所在・保持者: 荷役人の待機岸 (`shore`)。

実体: 疑われた荷役人 (`accused`)。初期の所在・保持者: 荷役人の待機岸 (`shore`)。

実体: box (`box`)。初期の所在・保持者: 箱が沈む浅瀬 (`water`)。

実体: ledger (`ledger`)。初期の所在・保持者: ガロの事務所 (`office`)。

実体: stones (`stones`)。初期の所在・保持者: box (`box`)。

### q006 / entry — 水路の回収場

実装場面: `q006.v11.entry`。

イベントID: `q006-S-entry`。

登場: ガロ。

「鍵は私が持つ。開けずに返してくれ」。ガロが施錠された給金箱の沈没位置を指した。岸では職人たちが第三者による捜索を求めている。最後に空箱を運んだ荷役人へ、疑いの目が集まっていた。

選択 `lift`: 縄で箱を引き上げ、水路の魔物を退ける

必要事項: 縄 1消費 ／ 戦闘・作業と消費は勝利時に確定。

強制戦闘: `guard_1`。

［勝利後］

行為: `entry_lift`。

成立時の消費: `{"rope":1}`。

進行先: [`box`](#q006--box--水路の回収場)。

［逃走後］

退路へ戻った。この作業の移動・受け渡し・支払いはまだ確定していない。

［敗北後］

現場から救援された。依頼を再開すると、未完了の作業からやり直せる。

［戦闘の継続ここまで］

選択 `witness`: 荷役人に沈没位置を伝え、彼らの道具で一緒に回収する

行為: `entry_witness`。

進行先: [`accounts`](#q006--accounts--荷役人の待機岸)。

選択 `lift_supplies`: 補修用の縄1個を用意しに戻る

表示条件: `{"op":"not","arg":{"op":"has_item","item":"rope","count":1}}`

選択条件: `{"op":"not","arg":{"op":"has_item","item":"rope","count":1}}`

補修用の縄1個が足りない。この作業はまだ行っていない。必要な品と費用をそろえてから、ここで続けよう。

不足時は未着手のまま会話を終了。再訪時は `q006.v11.entry.lift.resume` を経て [`entry`](#q006--entry--水路の回収場) から再開します。

### q006 / box — 水路の回収場

実装場面: `q006.v11.box`。

イベントID: `q006-S-box`。

登場: ガロ。

引き揚げた箱には鍵が掛かったままだ。中身はまだ確かめていない。ガロが受け取ろうと手を伸ばす。「依頼は回収だ。中は私が確認する」。

選択 `return`: 箱を未開封のままガロへ返す

行為: `box_return`。

進行先: [`private`](#q006--private--水路の回収場)。

選択 `public`: 箱を保持し、荷役人の前で開く

行為: `box_public`。

進行先: [`accounts`](#q006--accounts--荷役人の待機岸)。

### q006 / private — 水路の回収場

実装場面: `q006.v11.private`。

イベントID: `q006-S-private`。

登場: ガロ。

未開封の箱はガロの足元にある。岸から「中身を見せてくれ」と声が届いた。ガロは箱を抱え直した。ここで立ち去れば、中身を確かめる機会は失われる。

選択 `leave`: 未開封で返した仕事として報告を終える

行為: `private_leave`。

進行先: [結末 `contract`](#q006-結末-contract--給金箱を私的に返す)。

選択 `retract`: 報告を保留し、箱を返してもらって荷役人の前へ運ぶ

行為: `private_retract`。

進行先: [`accounts`](#q006--accounts--荷役人の待機岸)。

### q006 / accounts — 荷役人の待機岸

実装場面: `q006.v11.accounts`。

イベントID: `q006-S-accounts`。

登場: 工事の職人たち・疑われた荷役人。

荷役人たちの前で箱を開けると、金の代わりに石が出た。「俺が運んだ時は空だった」。疑われた荷役人が言う。石だけでは、金が盗まれたのか、最初から入っていなかったのかは決まらない。事務所の給金台帳と入金台帳を確かめる必要がある。

選択 `ledger`: 箱の石を確認し、ガロに同行を求めて事務所の二つの台帳を確かめる

行為: `accounts_ledger`。

進行先: [`ledger`](#q006--ledger--荷役人の待機岸)。

### q006 / ledger — 荷役人の待機岸

実装場面: `q006.v11.ledger`。

イベントID: `q006-S-ledger`。

登場: ガロ・工事の職人たち・疑われた荷役人。

給金台帳には未払額が並び、入金台帳には箱へ現金を入れた記録がない。石入りの箱と合わせると、盗難という説明は成り立たなかった。ガロは口をつぐんでいる。箱と二つの台帳は、あなたが保持している。

選択 `settle`: ガロの私物売却による一部払いを全員の前で成立させる

行為: `ledger_settle`。

進行先: [結末 `informed`](#q006-結末-informed--台帳を開き一部払いを成立させる)。

選択 `delegate`: 箱と二つの台帳と目撃報告を荷役人へ渡し、交渉を委ねる

行為: `ledger_delegate`。

進行先: [結末 `compromise`](#q006-結末-compromise--証拠を荷役人へ引き渡す)。

### q006 結末 informed — 台帳を開き一部払いを成立させる

イベントID: `q006-E-informed`。

石入りの箱、給金台帳、入金台帳を職人全員の前で照合し、ガロは盗難の説明を撤回した。ガロは自分の荷車と予備工具を売って給金の一部を払った。荷役人への疑いは解けたが、残額と工事の停止が残る。

57G / 68EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q006.values.witnessed"},"right":true},{"op":"eq","left":{"ref":"stories.q006.values.ledgerRead"},"right":true},{"op":"eq","left":{"ref":"stories.q006.values.partialPaid"},"right":true},{"op":"eq","left":{"ref":"stories.q006.values.report"},"right":true}]}`

### q006 結末 contract — 給金箱を私的に返す

イベントID: `q006-E-contract`。

未開封の箱を受け取ったガロは、盗難で給金が失われたという説明を続けた。箱の中身も入金台帳も公開されず、疑われた荷役人への疑いは解けなかった。

77G / 47EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q006.values.boxAt"},"right":"garo"},{"op":"eq","left":{"ref":"stories.q006.values.report"},"right":true},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q006.values.witnessed"},"right":true}}]}`

### q006 結末 compromise — 証拠を荷役人へ引き渡す

イベントID: `q006-E-compromise`。

荷役人は石入りの箱、給金台帳、入金台帳、沈没位置の目撃報告を受け取り、自分たちで支払い交渉を始めた。不正を追及する材料は渡ったが、ガロによる説明の撤回と実際の支払いまでは確認していない。

37G / 51EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q006.values.delegated"},"right":true},{"op":"eq","left":{"ref":"stories.q006.values.boxAt"},"right":"workers"},{"op":"eq","left":{"ref":"stories.q006.values.ledgerAt"},"right":"workers"},{"op":"eq","left":{"ref":"stories.q006.values.ledgerRead"},"right":true}]}`

## 状態項目と初期値

`partyAt`：party の所在または保持者。型 `enum`、初期値 `"landing"`、許容値 `["landing","water","shore","office"]`。

`garoAt`：garo の所在または保持者。型 `enum`、初期値 `"landing"`、許容値 `["landing","water","shore","office"]`。

`workersAt`：workers の所在または保持者。型 `enum`、初期値 `"shore"`、許容値 `["landing","water","shore","office"]`。

`accusedAt`：accused の所在または保持者。型 `enum`、初期値 `"shore"`、許容値 `["landing","water","shore","office"]`。

`boxAt`：box の所在または保持者。型 `enum`、初期値 `"water"`、許容値 `["landing","water","shore","office","party","garo","workers","accused","ledger","stones"]`。

`ledgerAt`：給金台帳と入金台帳を一組で保持する所在。型 `enum`、初期値 `"office"`、許容値 `["landing","water","shore","office","party","garo","workers","accused","box","stones"]`。

`stonesAt`：stones の所在または保持者。型 `enum`、初期値 `"box"`、許容値 `["landing","water","shore","office","party","garo","workers","accused","box","ledger"]`。

`opened`：opened。型 `boolean`、初期値 `false`。

`witnessed`：witnessed。型 `boolean`、初期値 `false`。

`ledgerRead`：ledgerRead。型 `boolean`、初期値 `false`。

`handed`：handed。型 `boolean`、初期値 `false`。

`partialPaid`：partialPaid。型 `boolean`、初期値 `false`。

`delegated`：delegated。型 `boolean`、初期値 `false`。

`report`：report。型 `boolean`、初期値 `false`。

## 行為の条件と状態変化

本文の選択と行為IDを対応させ、効果を実行順で記す。条件式は配布JSONの値。資材・所持金不足では支払いも受け渡しも確定しない。実移動では出発効果と到着効果を分ける。

### 行為 entry_lift

[q006-S-entry](#q006--entry--水路の回収場) → [q006-S-box](#q006--box--水路の回収場)。条件 `true`。費用：補修用の縄 (`rope`) × 1。一度だけ確定する。

移動：探索隊 (`party`)。水路の回収場 (`landing`) → 箱が沈む浅瀬 (`water`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：給金箱 (`box`) を 箱が沈む浅瀬 (`water`) から 探索隊 (`party`) へ。

移動：探索隊 (`party`)。箱が沈む浅瀬 (`water`) → 水路の回収場 (`landing`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 entry_witness

[q006-S-entry](#q006--entry--水路の回収場) → [q006-S-accounts](#q006--accounts--荷役人の待機岸)。条件 `true`。費用：なし。一度だけ確定する。

移動：探索隊 (`party`)。水路の回収場 (`landing`) → 荷役人の待機岸 (`shore`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

移動：探索隊 (`party`)・工事の職人たち (`workers`)・疑われた荷役人 (`accused`)。荷役人の待機岸 (`shore`) → 水路の回収場 (`landing`) → 箱が沈む浅瀬 (`water`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：給金箱 (`box`) を 箱が沈む浅瀬 (`water`) から 探索隊 (`party`) へ。

移動：探索隊 (`party`)・工事の職人たち (`workers`)・疑われた荷役人 (`accused`)。箱が沈む浅瀬 (`water`) → 水路の回収場 (`landing`) → 荷役人の待機岸 (`shore`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`opened` = `true`。

状態更新：`witnessed` = `true`。

認識獲得：探索隊 (`party`) が 箱に詰められた石 (`stones`) から `stones`（給金箱に金ではなく石が入っていた）を知る。観察条件 `true`。

### 行為 box_return

[q006-S-box](#q006--box--水路の回収場) → [q006-S-private](#q006--private--水路の回収場)。条件 `true`。費用：なし。一度だけ確定する。

受け渡し：給金箱 (`box`) を 探索隊 (`party`) から ガロ (`garo`) へ。

状態更新：`handed` = `true`。

### 行為 box_public

[q006-S-box](#q006--box--水路の回収場) → [q006-S-accounts](#q006--accounts--荷役人の待機岸)。条件 `true`。費用：なし。一度だけ確定する。

移動：探索隊 (`party`)。水路の回収場 (`landing`) → 荷役人の待機岸 (`shore`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`opened` = `true`。

認識獲得：探索隊 (`party`) が 箱に詰められた石 (`stones`) から `stones`（給金箱に金ではなく石が入っていた）を知る。観察条件 `true`。

状態更新：`witnessed` = `true`。

### 行為 private_leave

[q006-S-private](#q006--private--水路の回収場) → [q006-E-contract](#q006-結末-contract--給金箱を私的に返す)。条件 `true`。費用：なし。一度だけ確定する。

状態更新：`report` = `true`。

### 行為 private_retract

[q006-S-private](#q006--private--水路の回収場) → [q006-S-accounts](#q006--accounts--荷役人の待機岸)。条件 `true`。費用：なし。一度だけ確定する。

受け渡し：給金箱 (`box`) を ガロ (`garo`) から 探索隊 (`party`) へ。

状態更新：`handed` = `false`。

移動：探索隊 (`party`)。水路の回収場 (`landing`) → 荷役人の待機岸 (`shore`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`opened` = `true`。

認識獲得：探索隊 (`party`) が 箱に詰められた石 (`stones`) から `stones`（給金箱に金ではなく石が入っていた）を知る。観察条件 `true`。

状態更新：`witnessed` = `true`。

### 行為 accounts_ledger

[q006-S-accounts](#q006--accounts--荷役人の待機岸) → [q006-S-ledger](#q006--ledger--荷役人の待機岸)。条件 `true`。費用：なし。一度だけ確定する。

移動：探索隊 (`party`)。荷役人の待機岸 (`shore`) → 水路の回収場 (`landing`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

移動：探索隊 (`party`)・ガロ (`garo`)。水路の回収場 (`landing`) → 荷役人の待機岸 (`shore`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

移動：探索隊 (`party`)・ガロ (`garo`)・工事の職人たち (`workers`)・疑われた荷役人 (`accused`)。荷役人の待機岸 (`shore`) → ガロの事務所 (`office`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

認識獲得：探索隊 (`party`) が 給金台帳・入金台帳の一組 (`ledger`) から `wages`（給金台帳には職人ごとの未払額がある）を知る。観察条件 `true`。

認識獲得：探索隊 (`party`) が 給金台帳・入金台帳の一組 (`ledger`) から `deposits`（入金台帳には給金箱へ現金を入れた記録がない）を知る。観察条件 `true`。

認識獲得：探索隊 (`party`) が 給金台帳・入金台帳の一組 (`ledger`) から `debt`（石入りの箱と給金台帳・入金台帳を照合し、盗難ではなく最初から未払いだったと分かった）を知る。観察条件 `{"op":"and","args":[{"op":"contains","left":{"ref":"stories.q006.knowledge.party"},"right":"stones"},{"op":"contains","left":{"ref":"stories.q006.knowledge.party"},"right":"wages"},{"op":"contains","left":{"ref":"stories.q006.knowledge.party"},"right":"deposits"}]}`。

受け渡し：給金台帳・入金台帳の一組 (`ledger`) を ガロの事務所 (`office`) から 探索隊 (`party`) へ。

状態更新：`ledgerRead` = `true`。

移動：探索隊 (`party`)・ガロ (`garo`)・工事の職人たち (`workers`)・疑われた荷役人 (`accused`)。ガロの事務所 (`office`) → 荷役人の待機岸 (`shore`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 ledger_settle

[q006-S-ledger](#q006--ledger--荷役人の待機岸) → [q006-E-informed](#q006-結末-informed--台帳を開き一部払いを成立させる)。条件 `true`。費用：なし。一度だけ確定する。

状態更新：`partialPaid` = `true`。

受け渡し：給金箱 (`box`) を 探索隊 (`party`) から 工事の職人たち (`workers`) へ。

受け渡し：給金台帳・入金台帳の一組 (`ledger`) を 探索隊 (`party`) から 工事の職人たち (`workers`) へ。

状態更新：`report` = `true`。

### 行為 ledger_delegate

[q006-S-ledger](#q006--ledger--荷役人の待機岸) → [q006-E-compromise](#q006-結末-compromise--証拠を荷役人へ引き渡す)。条件 `true`。費用：なし。一度だけ確定する。

受け渡し：給金箱 (`box`) を 探索隊 (`party`) から 工事の職人たち (`workers`) へ。

受け渡し：給金台帳・入金台帳の一組 (`ledger`) を 探索隊 (`party`) から 工事の職人たち (`workers`) へ。

状態更新：`delegated` = `true`。

状態更新：`report` = `true`。

## 資材不足・戦闘後の再開・保存

`q006.decision` / 作業 `informed`：必要量 補修用の縄 (`rope`) × 1。不足選択 `informed_supplies` → `q006.decision.informed.shortage` で未着手のまま探索へ戻る。補給後は `q006.decision.informed.resume` → `q006.decision` で作業場面へ戻る。

`q006.review` / 作業 `informed`：必要量 補修用の縄 (`rope`) × 1。不足選択 `informed_supplies` → `q006.review.informed.shortage` で未着手のまま探索へ戻る。補給後は `q006.review.informed.resume` → `q006.review` で作業場面へ戻る。

`q006.flow.entry` / 作業 `lift`：必要量 補修用の縄 (`rope`) × 1。不足選択 `lift_supplies` → `q006.flow.entry.lift.shortage` で未着手のまま探索へ戻る。補給後は `q006.flow.entry.lift.resume` → `q006.flow.entry` で作業場面へ戻る。

`q006.v11.entry` / 作業 `lift`：必要量 補修用の縄 (`rope`) × 1。不足選択 `lift_supplies` → `q006.v11.entry.lift.shortage` で未着手のまま探索へ戻る。補給後は `q006.v11.entry.lift.resume` → `q006.v11.entry` で作業場面へ戻る。

共通の中断選択肢はない。メッセージ・判断の途中で閉じた場合は通常の保存位置から再開する。戦闘の逃走・敗北後は本編記載の継続命令に従い、勝利後の作業・費用を先に確定しない。q001固有の老人遭遇への巻戻しを、この依頼にも実装済みとは扱わない。

## 編集時の確認事項

縄不足・戦闘逃走・敗北では回収と縄消費を確定させない。

未開封の返却後は箱をガロが保持し、撤回経路では受け取り直す。石の発見だけで盗難の説明を否定しない。

回収場・浅瀬・荷役人の岸・事務所を結び、箱と二台帳を引き渡す前に所持状態を確認する。残額と工事停止を結末に残す。

以下は改稿・物理接続を行う際の確認観点であり、全項目を実ブラウザで確認済みという記録ではない。今回の検証結果は [PROGRESS.md](../../development/PROGRESS.md) を参照する。

## マップデータと接続定義

実配置へ入口から到達する接続経路上のマップを掲載する。旧経路用の条件付き配置も含むため、全マップの踏破を本編の完了条件とはしない。クエスト配置はeventsから重ね、共通マップのJSONと分ける。

### 灯守の地下水道 の経路

入口：`{"main":{"map":"region_1_f1","point":"entrance"}}`。

`upper_inlet`：第一水路の水密扉。`region_1_f1` (9, 1) ↔ `region_1_canal_a` (1, 1)。接続方式 `watertight_door`。

`upper_landing`：荷揚げ場の水密扉。`region_1_canal_a` (9, 1) ↔ `region_1_landing` (1, 1)。接続方式 `watertight_door`。

`dry_stair`：乾いた階段室。`region_1_landing` (5, 3) ↔ `region_1_f2` (1, 1)。接続方式 `stairs`。

`lower_inlet`：給金箱水路の水密扉。`region_1_f2` (9, 1) ↔ `region_1_canal_c` (1, 1)。接続方式 `watertight_door`。

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
      "script": "region_1_f1.exit",
      "interactionRange": "here"
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
      "script": "region_1_f1.cache",
      "interactionRange": "here-or-front"
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
      "script": "region_1_f1.fountain",
      "interactionRange": "here-or-front"
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
      },
      "interactionRange": "front"
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
      "script": "region_1_f2.cache",
      "interactionRange": "here-or-front"
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
      "script": "region_1_f2.fountain",
      "interactionRange": "here-or-front"
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
      },
      "interactionRange": "front"
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

<details>
<summary>クエスト専用の全配置と条件</summary>

```json
[
  {
    "id": "q006_clue_a",
    "title": "沈んだ給金箱：現場の痕跡",
    "points": [
      {
        "map": "region_1_f2",
        "x": 4,
        "y": 3,
        "dungeon": "region_1"
      }
    ],
    "kind": "clue",
    "trigger": "interact",
    "safe": true,
    "script": "q006.clue_a",
    "role": "clue_a",
    "visibleWhen": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q006.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "flags.legacyQuestRoutes.q006"
          },
          "right": true
        }
      ]
    },
    "dungeon": "region_1"
  },
  {
    "id": "q006_clue_b",
    "title": "沈んだ給金箱：記録と証言",
    "points": [
      {
        "map": "region_1_canal_c",
        "x": 4,
        "y": 1,
        "dungeon": "region_1"
      }
    ],
    "kind": "clue",
    "trigger": "interact",
    "safe": true,
    "script": "q006.clue_b",
    "role": "clue_b",
    "visibleWhen": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q006.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "flags.legacyQuestRoutes.q006"
          },
          "right": true
        }
      ]
    },
    "dungeon": "region_1"
  },
  {
    "id": "q006_decision",
    "title": "沈んだ給金箱：決着の場",
    "points": [
      {
        "map": "region_1_canal_c",
        "x": 7,
        "y": 1,
        "dungeon": "region_1"
      }
    ],
    "kind": "decision",
    "trigger": "interact",
    "safe": true,
    "script": "q006.v11.visit",
    "role": "decision",
    "visibleWhen": {
      "op": "or",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q006.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "quests.q006.stage"
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
    "landing": "水路の回収場",
    "water": "箱が沈む浅瀬",
    "shore": "荷役人の待機岸",
    "office": "ガロの事務所"
  },
  "connections": [
    [
      "landing",
      "water"
    ],
    [
      "landing",
      "shore"
    ],
    [
      "shore",
      "office"
    ]
  ],
  "registry": {
    "partyAt": {
      "type": "enum",
      "initial": "landing",
      "values": [
        "landing",
        "water",
        "shore",
        "office"
      ],
      "meaning": "party の所在または保持者"
    },
    "garoAt": {
      "type": "enum",
      "initial": "landing",
      "values": [
        "landing",
        "water",
        "shore",
        "office"
      ],
      "meaning": "garo の所在または保持者"
    },
    "workersAt": {
      "type": "enum",
      "initial": "shore",
      "values": [
        "landing",
        "water",
        "shore",
        "office"
      ],
      "meaning": "workers の所在または保持者"
    },
    "accusedAt": {
      "type": "enum",
      "initial": "shore",
      "values": [
        "landing",
        "water",
        "shore",
        "office"
      ],
      "meaning": "accused の所在または保持者"
    },
    "boxAt": {
      "type": "enum",
      "initial": "water",
      "values": [
        "landing",
        "water",
        "shore",
        "office",
        "party",
        "garo",
        "workers",
        "accused",
        "ledger",
        "stones"
      ],
      "meaning": "box の所在または保持者"
    },
    "ledgerAt": {
      "type": "enum",
      "initial": "office",
      "values": [
        "landing",
        "water",
        "shore",
        "office",
        "party",
        "garo",
        "workers",
        "accused",
        "box",
        "stones"
      ],
      "meaning": "給金台帳と入金台帳を一組で保持する所在"
    },
    "stonesAt": {
      "type": "enum",
      "initial": "box",
      "values": [
        "landing",
        "water",
        "shore",
        "office",
        "party",
        "garo",
        "workers",
        "accused",
        "box",
        "ledger"
      ],
      "meaning": "stones の所在または保持者"
    },
    "opened": {
      "type": "boolean",
      "initial": false,
      "meaning": "opened"
    },
    "witnessed": {
      "type": "boolean",
      "initial": false,
      "meaning": "witnessed"
    },
    "ledgerRead": {
      "type": "boolean",
      "initial": false,
      "meaning": "ledgerRead"
    },
    "handed": {
      "type": "boolean",
      "initial": false,
      "meaning": "handed"
    },
    "partialPaid": {
      "type": "boolean",
      "initial": false,
      "meaning": "partialPaid"
    },
    "delegated": {
      "type": "boolean",
      "initial": false,
      "meaning": "delegated"
    },
    "report": {
      "type": "boolean",
      "initial": false,
      "meaning": "report"
    }
  },
  "entities": {
    "party": {
      "holder": "partyAt",
      "kind": "group"
    },
    "garo": {
      "holder": "garoAt",
      "kind": "person",
      "character": "garo"
    },
    "workers": {
      "holder": "workersAt",
      "kind": "group",
      "character": "workers"
    },
    "accused": {
      "holder": "accusedAt",
      "kind": "person",
      "character": "accused"
    },
    "box": {
      "holder": "boxAt",
      "kind": "item"
    },
    "ledger": {
      "holder": "ledgerAt",
      "kind": "item"
    },
    "stones": {
      "holder": "stonesAt",
      "kind": "item"
    }
  },
  "propositions": {
    "stones": {
      "text": "給金箱に金ではなく石が入っていた"
    },
    "wages": {
      "text": "給金台帳には職人ごとの未払額がある"
    },
    "deposits": {
      "text": "入金台帳には給金箱へ現金を入れた記録がない"
    },
    "debt": {
      "text": "石入りの箱と給金台帳・入金台帳を照合し、盗難ではなく最初から未払いだったと分かった"
    }
  },
  "initialKnowledge": {},
  "invariants": [],
  "scenes": {
    "entry": {
      "title": "水路の回収場",
      "place": "landing",
      "cast": [
        {
          "entity": "garo"
        }
      ],
      "requires": true
    },
    "box": {
      "title": "水路の回収場",
      "place": "landing",
      "cast": [
        {
          "entity": "garo"
        }
      ],
      "requires": true
    },
    "private": {
      "title": "水路の回収場",
      "place": "landing",
      "cast": [
        {
          "entity": "garo"
        }
      ],
      "requires": true
    },
    "accounts": {
      "title": "荷役人の待機岸",
      "place": "shore",
      "cast": [
        {
          "entity": "workers"
        },
        {
          "entity": "accused"
        }
      ],
      "requires": true
    },
    "ledger": {
      "title": "荷役人の待機岸",
      "place": "shore",
      "cast": [
        {
          "entity": "garo"
        },
        {
          "entity": "workers"
        },
        {
          "entity": "accused"
        }
      ],
      "requires": true
    }
  },
  "actions": {
    "entry_lift": {
      "from": [
        "entry"
      ],
      "to": "box",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "landing",
            "water"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "box",
          "from": "water",
          "to": "party"
        },
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "water",
            "landing"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "cost": {
        "rope": 1
      },
      "once": true
    },
    "entry_witness": {
      "from": [
        "entry"
      ],
      "to": "accounts",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "landing",
            "shore"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "workers",
            "accused"
          ],
          "path": [
            "shore",
            "landing",
            "water"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "box",
          "from": "water",
          "to": "party"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "workers",
            "accused"
          ],
          "path": [
            "water",
            "landing",
            "shore"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "opened",
          "value": true
        },
        {
          "op": "set",
          "key": "witnessed",
          "value": true
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "stones",
          "source": "stones",
          "requires": true
        }
      ],
      "once": true
    },
    "box_return": {
      "from": [
        "box"
      ],
      "to": "private",
      "requires": true,
      "effects": [
        {
          "op": "transfer",
          "entity": "box",
          "from": "party",
          "to": "garo"
        },
        {
          "op": "set",
          "key": "handed",
          "value": true
        }
      ],
      "once": true
    },
    "box_public": {
      "from": [
        "box"
      ],
      "to": "accounts",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "landing",
            "shore"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "opened",
          "value": true
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "stones",
          "source": "stones",
          "requires": true
        },
        {
          "op": "set",
          "key": "witnessed",
          "value": true
        }
      ],
      "once": true
    },
    "private_leave": {
      "from": [
        "private"
      ],
      "ending": "contract",
      "requires": true,
      "effects": [
        {
          "op": "set",
          "key": "report",
          "value": true
        }
      ],
      "once": true
    },
    "private_retract": {
      "from": [
        "private"
      ],
      "to": "accounts",
      "requires": true,
      "effects": [
        {
          "op": "transfer",
          "entity": "box",
          "from": "garo",
          "to": "party"
        },
        {
          "op": "set",
          "key": "handed",
          "value": false
        },
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "landing",
            "shore"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "opened",
          "value": true
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "stones",
          "source": "stones",
          "requires": true
        },
        {
          "op": "set",
          "key": "witnessed",
          "value": true
        }
      ],
      "once": true
    },
    "accounts_ledger": {
      "from": [
        "accounts"
      ],
      "to": "ledger",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "shore",
            "landing"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "garo"
          ],
          "path": [
            "landing",
            "shore"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "garo",
            "workers",
            "accused"
          ],
          "path": [
            "shore",
            "office"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "wages",
          "source": "ledger",
          "requires": true
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "deposits",
          "source": "ledger",
          "requires": true
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "debt",
          "source": "ledger",
          "requires": {
            "op": "and",
            "args": [
              {
                "op": "contains",
                "left": {
                  "ref": "stories.q006.knowledge.party"
                },
                "right": "stones"
              },
              {
                "op": "contains",
                "left": {
                  "ref": "stories.q006.knowledge.party"
                },
                "right": "wages"
              },
              {
                "op": "contains",
                "left": {
                  "ref": "stories.q006.knowledge.party"
                },
                "right": "deposits"
              }
            ]
          }
        },
        {
          "op": "transfer",
          "entity": "ledger",
          "from": "office",
          "to": "party"
        },
        {
          "op": "set",
          "key": "ledgerRead",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party",
            "garo",
            "workers",
            "accused"
          ],
          "path": [
            "office",
            "shore"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true
    },
    "ledger_settle": {
      "from": [
        "ledger"
      ],
      "ending": "informed",
      "requires": true,
      "effects": [
        {
          "op": "set",
          "key": "partialPaid",
          "value": true
        },
        {
          "op": "transfer",
          "entity": "box",
          "from": "party",
          "to": "workers"
        },
        {
          "op": "transfer",
          "entity": "ledger",
          "from": "party",
          "to": "workers"
        },
        {
          "op": "set",
          "key": "report",
          "value": true
        }
      ],
      "once": true
    },
    "ledger_delegate": {
      "from": [
        "ledger"
      ],
      "ending": "compromise",
      "requires": true,
      "effects": [
        {
          "op": "transfer",
          "entity": "box",
          "from": "party",
          "to": "workers"
        },
        {
          "op": "transfer",
          "entity": "ledger",
          "from": "party",
          "to": "workers"
        },
        {
          "op": "set",
          "key": "delegated",
          "value": true
        },
        {
          "op": "set",
          "key": "report",
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
            "ref": "stories.q006.values.witnessed"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q006.values.ledgerRead"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q006.values.partialPaid"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q006.values.report"
          },
          "right": true
        }
      ]
    },
    "contract": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "stories.q006.values.boxAt"
          },
          "right": "garo"
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q006.values.report"
          },
          "right": true
        },
        {
          "op": "not",
          "arg": {
            "op": "eq",
            "left": {
              "ref": "stories.q006.values.witnessed"
            },
            "right": true
          }
        }
      ]
    },
    "compromise": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "stories.q006.values.delegated"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q006.values.boxAt"
          },
          "right": "workers"
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q006.values.ledgerAt"
          },
          "right": "workers"
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q006.values.ledgerRead"
          },
          "right": true
        }
      ]
    }
  }
}
```

</details>

## 編集元と再生成

本編は [authoring/stories-v11-2.mjs](../../../authoring/stories-v11-2.mjs)、配置は [config/quests/q006.events.json](../../../config/quests/q006.events.json)、配布内容は [data/quests/q006.json](../../../data/quests/q006.json)。地形は [config/connected-maps.json](../../../config/connected-maps.json)、接続・給排水は [config/dungeons/region_1.json](../../../config/dungeons/region_1.json)、施設は [config/locations.json](../../../config/locations.json) を参照する。

解説と確認観点は [authoring/quest-page-notes.mjs](../../../authoring/quest-page-notes.mjs)、ページ構成は [tools/quest-page-details.mjs](../../../tools/quest-page-details.mjs) を編集する。本文を手直しする場合は物語原稿へ反映し、`npm run build:scenarios` で配布データも更新する。文書だけの再生成は `npm run build:catalog`、照合は `npm run check:docs`。`npm run build:docs` 単独は個別ページの本文を保持する。
