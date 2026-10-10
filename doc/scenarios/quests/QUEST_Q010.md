# q010 最後の水門番：詳細・配置・状態変化

[個別ページ一覧](README.md) ／ [カタログへ戻る](../QUEST_CATALOG.md#q010-最後の水門番) ／ [シナリオ本文](#q010-最後の水門番) ／ [行為の条件と状態変化](#行為の条件と状態変化) ／ [配置イベント](#配置イベントと操作条件)

作品版 1.25.0。配布JSONから生成した作者向けページ。真相と結末を含む。本編3場面・5結末。

<!-- quest-page-source:3a0278c8c3b9b40108076d2eaa70912591726f5c3bb8a49c96eac75a5021c54f -->

## 依頼の焦点と分岐の意味

手前の三人と奥の二人、門番、帳簿、救助縄を分けて追う。住民救助の成否と工事不備の立証は別の達成である。閉門すると工事なしには開け直せない。

救助前に縦坑の上下両端、足場、換気、縄の固定点を確認し、地上のリネへ連絡する。救助・帳簿回収の順は選べる。

奥の救助縄は渡りへ固定して撤収まで残す。全員救助後は五人の地上到着を照合し、縄を回収して閉門し、門番も操作梯子から脱出する。

informedは全員救助に帳簿・門番本人の証言・報告を加える。rescuedは救助報告のみ、partialは一組のみ救助、contractは五人を残して閉門、compromiseは未閉門のまま排水隊へ引き継ぐ。

## 実装範囲と場所

現地イベントの配置と物語状態は実装済み。ただし worldPlaces と story.journey は未定義で、行為内の move は物語上の所在変更である。本文にある施設や通路を実際に歩いて到達する方式には未接続。以下の物語内経路を実マップの座標や移動完了と読み替えない。

`control`：高所の水門操作室。物語上の場所。個別の実座標・施設IDは未割当。

`near`：手前の避難通路。物語上の場所。個別の実座標・施設IDは未割当。

`deep`：奥の作業区画。物語上の場所。個別の実座標・施設IDは未割当。

`shaft`：旧工事用の縦坑。物語上の場所。個別の実座標・施設IDは未割当。

`ground`：地上の救助口。物語上の場所。個別の実座標・施設IDは未割当。

`landing`：帳簿のある踊り場。物語上の場所。個別の実座標・施設IDは未割当。

### 物語内の接続

高所の水門操作室 (`control`) ↔ 手前の避難通路 (`near`)。

手前の避難通路 (`near`) ↔ 奥の作業区画 (`deep`)。

高所の水門操作室 (`control`) ↔ 旧工事用の縦坑 (`shaft`)。

旧工事用の縦坑 (`shaft`) ↔ 地上の救助口 (`ground`)。

手前の避難通路 (`near`) ↔ 帳簿のある踊り場 (`landing`)。

高所の水門操作室 (`control`) ↔ 地上の救助口 (`ground`)。

## 人物・物品と認識

探索隊 (`party`)：集団。初期の所在・保持者は 高所の水門操作室 (`control`)、保存項目は `partyAt`。

水門番 (`keeper`)：人物。初期の所在・保持者は 高所の水門操作室 (`control`)、保存項目は `keeperAt`。老朽水門の操作担当。命令と取り残した住民の間で責任を決める。

リネ (`rine`)：人物。初期の所在・保持者は 地上の救助口 (`ground`)、保存項目は `rineAt`。灯番組合の連絡係。帰還者を名前で数え、取り残しを防ぐ。

手前の住民三人 (`nearPeople`)：集団。初期の所在・保持者は 手前の避難通路 (`near`)、保存項目は `nearPeopleAt`。避難通路で待つ住民。三人で地上へ出る。

奥の住民二人 (`deepPeople`)：集団。初期の所在・保持者は 奥の作業区画 (`deep`)、保存項目は `deepPeopleAt`。作業区画で待つ住民。渡りを越えて地上へ出る。

排水隊 (`crew`)：集団。初期の所在・保持者は 地上の救助口 (`ground`)、保存項目は `crewAt`。閉門を延期する交代班。現場を引き受け、避難の時間を稼ぐ。

補強工事の帳簿 (`book`)：物品。初期の所在・保持者は 帳簿のある踊り場 (`landing`)、保存項目は `bookAt`。

救助縄 (`rescueRope`)：物品。初期の所在・保持者は 水門番 (`keeper`)、保存項目は `rescueRopeAt`。

認識 `delay`：門番は未承認工事を知りながら閉門命令を待ち、住民の避難時間を稼いでいた。

認識 `book`：補強工事の台帳には必要な検査印と契約印が欠けている。

初期認識：`{}`。固定された過去と探索隊がすでに知る情報は別に扱い、observeの成立で認識を加える。

## 本編の進行とイベントID

本編場面は `q010-S-場面キー`、配置は `q010-P-配置キー`、結末は `q010-E-結末キー`。S・P・Eは文書用の識別子。Fは強制戦闘、Bは戦闘中イベントで、命令に明示されたidがあればそれを使い、ない戦闘には文書用IDを付ける。全12IDが一意で、場面を並べ替えても変わらない。

[q010-S-entry](#q010--entry--高所の水門操作室)：高所の水門操作室。物語内の場所 `control`。

選択 `shaft`：縦坑の封鎖を解き、上下両端を検査してリネへ連絡する → [q010-S-operations](#q010--operations--高所の水門操作室)。行為 [`entry_shaft`](#行為-entry_shaft)。

選択 `close`：五人が残ることを確認し、住民救助を断念して閉門する → [q010-E-contract](#q010-結末-contract--住民を救う前に閉門)。行為 [`entry_close`](#行為-entry_close)。

選択 `pump`：縦坑を検査してリネへ連絡し、到着した排水隊へ現場を引き継ぐ → [q010-E-compromise](#q010-結末-compromise--到着した排水隊へ引き継ぐ)。行為 [`entry_pump`](#行為-entry_pump)。

[q010-S-operations](#q010--operations--高所の水門操作室)：高所の水門操作室。物語内の場所 `control`。

選択 `near`：手前の三人を縦坑から地上へ送り、リネに到着を確認する → [q010-S-operations](#q010--operations--高所の水門操作室)。行為 [`operations_near`](#行為-operations_near)。

選択 `deep`：救助縄を張り、奥の二人を地上へ送って到着を確認する → [q010-S-operations](#q010--operations--高所の水門操作室)。行為 [`operations_deep`](#行為-operations_deep)。

選択 `book`：踊り場の帳簿を回収し、地上のリネへ預ける → [q010-S-operations](#q010--operations--高所の水門操作室)。行為 [`operations_book`](#行為-operations_book)。

選択 `all`：五人の到着を照合し、縄を回収して門番に閉門してもらう → [q010-S-ground](#q010--ground--地上の救助口)。行為 [`operations_all`](#行為-operations_all)。

選択 `partial`：救助できた組だけを確定し、残る組を断念して閉門する → [q010-E-partial](#q010-結末-partial--救助済みの組を確定して閉門)。行為 [`operations_partial`](#行為-operations_partial)。

選択 `close`：まだ五人が残る状態で閉門する → [q010-E-contract](#q010-結末-contract--住民を救う前に閉門)。行為 [`operations_close`](#行為-operations_close)。

選択 `pump`：現在の救助数と証拠の所在を伝え、到着した排水隊へ引き継ぐ → [q010-E-compromise](#q010-結末-compromise--到着した排水隊へ引き継ぐ)。行為 [`operations_pump`](#行為-operations_pump)。

[q010-S-ground](#q010--ground--地上の救助口)：地上の救助口。物語内の場所 `ground`。

選択 `testimony`：帳簿と門番本人の証言をリネの報告に載せる → [q010-E-informed](#q010-結末-informed--全員を救い工事の記録と証言を残す)。行為 [`ground_testimony`](#行為-ground_testimony)。

選択 `rescue`：全員の救助報告だけで区切る → [q010-E-rescued](#q010-結末-rescued--全員の救助を完了する)。行為 [`ground_rescue`](#行為-ground_rescue)。

現行本編に専用の強制戦闘・戦闘中イベントはない。通常の歩行遭遇と旧調査スクリプトは別に扱う。

## 配置イベントと操作条件

配置が保存されていることと、通常プレイで表示されることは同じではない。表示条件・操作条件は別々に評価する。legacyQuestRoutesを要する配置は旧経路用で、現行本編の必須経路へ数えない。

### q010-P-clue_a

最後の水門番：現場の痕跡。実行ID `q010_clue_a`、起動 `interact`、スクリプト `q010.clue_a`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・避難水路・B2 (`region_1_canal_d`) / (6, 1) / イベント `q010_clue_a`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"and","args":[{"op":"eq","left":{"ref":"quests.q010.stage"},"right":"active"},{"op":"eq","left":{"ref":"flags.legacyQuestRoutes.q010"},"right":true}]}`。操作条件：`true`。

<details>
<summary>この配置の実行スクリプト</summary>

```json
{
  "commands": [
    {
      "op": "narrate",
      "text": "塗り潰された図面に梯子の穴があり、その先から雨の匂いがする。"
    },
    {
      "op": "quest.evidence",
      "quest": "q010",
      "key": "clue_a",
      "text": "塗り潰された図面に梯子の穴があり、その先から雨の匂いがする。"
    }
  ]
}
```

</details>

### q010-P-clue_b

最後の水門番：記録と証言。実行ID `q010_clue_b`、起動 `interact`、スクリプト `q010.clue_b`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・奥の水門詰所・B2 (`region_1_gatehouse`) / (3, 3) / イベント `q010_clue_b`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"and","args":[{"op":"eq","left":{"ref":"quests.q010.stage"},"right":"active"},{"op":"eq","left":{"ref":"flags.legacyQuestRoutes.q010"},"right":true}]}`。操作条件：`true`。

<details>
<summary>この配置の実行スクリプト</summary>

```json
{
  "commands": [
    {
      "op": "say",
      "name": "灯番組合のリネ",
      "text": "水門番は避難者の人数と同じ数だけ、未使用の安全帯を隠しています。"
    },
    {
      "op": "quest.evidence",
      "quest": "q010",
      "key": "clue_b",
      "text": "水門番は避難者の人数と同じ数だけ、未使用の安全帯を隠している。"
    }
  ]
}
```

</details>

### q010-P-decision

最後の水門番：決着の場。実行ID `q010_decision`、起動 `interact`、スクリプト `q010.v11.visit`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・奥の水門詰所・B2 (`region_1_gatehouse`) / (7, 3) / イベント `q010_decision`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"or","args":[{"op":"eq","left":{"ref":"quests.q010.stage"},"right":"active"},{"op":"eq","left":{"ref":"quests.q010.stage"},"right":"completed"}]}`。操作条件：`true`。

物語の現在場面・補給後の再開先を呼び出す入口。本編全文は下記へ集約する。

### q010-P-region_1

排水された横道。実行ID `region_1`、起動 `action`、スクリプト `dungeon.scene.region_1.v1`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・入口操作室・B1 (`region_1_f1`) / (2, 1) / イベント `region_1`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`true`。操作条件：`{"op":"in","left":{"ref":"quests.q010.stage"},"right":["active","completed"]}`。

必要事項：関連する依頼を受けると調査できる。

調査記録：上層水門を閉じた際、接続する横道が排水されることを確認した。住民の人数確認・縦坑の安全検査・避難は水門番と別途進める。。記録の表示条件：`{"op":"eq","left":{"ref":"flags.dungeonNotes.region_1"},"right":true}`。

<details>
<summary>この配置の実行スクリプト</summary>

```json
{
  "dungeonScene": "region_1",
  "commands": [
    {
      "op": "narrate",
      "text": "上層の水門には横道へ流れ込む水路が接続している。住民の避難方法を考える前に、この操作がどこへ作用するかを確かめる。"
    },
    {
      "op": "if",
      "condition": {
        "op": "eq",
        "left": {
          "ref": "dungeons.persistent.region_1.systems.water.controls.upper_gate"
        },
        "right": false
      },
      "then": [
        {
          "op": "narrate",
          "text": "上層の水門が閉じ、水路へ流入する水が止まっている。排水された横道は通行可能だ。これはこの水路の観察であり、奥の住民五人の避難確認はまだ別に必要となる。"
        },
        {
          "op": "choice",
          "options": [
            {
              "id": "record",
              "text": "確認した事実を依頼の手帳へ記す",
              "condition": {
                "op": "ne",
                "left": {
                  "ref": "flags.dungeonNotes.region_1"
                },
                "right": true
              },
              "commands": [
                {
                  "op": "set",
                  "target": "flags.dungeonNotes.region_1",
                  "value": true
                },
                {
                  "op": "narrate",
                  "text": "現地の観察を手帳に記した。"
                }
              ]
            },
            {
              "id": "leave",
              "text": "探索へ戻る",
              "commands": []
            }
          ]
        }
      ],
      "else": [
        {
          "op": "narrate",
          "text": "上層の水門は開き、水路に水が流れている。探索画面でこの水門を閉じてから、横道の変化を調べられる。"
        }
      ]
    }
  ]
}
```

</details>

## q010 最後の水門番

依頼人: 灯番組合のリネ。地域: 1。この地域の依頼を3件完了すると受注できる。

老朽水門を閉じなければ上層市街へ水が流れ込む。しかし、水門の内側には地下住民が五人残っている。代わりの出口を探してください。

モデル: 1.1。実装: [JSON](../../../data/quests/q010.json)。場面 3、結末 5。物語状態の改訂 1。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・避難水路・B2 (`region_1_canal_d`) / (6, 1) / イベント `q010_clue_a`。[ダンジョン定義](../../../data/dungeons.json)。最後の水門番：現場の痕跡。現地イベント。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・奥の水門詰所・B2 (`region_1_gatehouse`) / (3, 3) / イベント `q010_clue_b`。[ダンジョン定義](../../../data/dungeons.json)。最後の水門番：記録と証言。現地イベント。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・奥の水門詰所・B2 (`region_1_gatehouse`) / (7, 3) / イベント `q010_decision`。[ダンジョン定義](../../../data/dungeons.json)。最後の水門番：決着の場。現地イベント。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・入口操作室・B1 (`region_1_f1`) / (2, 1) / イベント `region_1`。[ダンジョン定義](../../../data/dungeons.json)。排水された横道。操作調査。

固定された過去: 水門の補強工事は契約上の検査と承認を受けておらず、安全性を確認できない。最後まで操作室に残った門番は、その事実を知りながら閉門命令を待ち、内側の住民が逃げる時間を稼いでいる。手前の区画に三人、奥の区画に二人がいる。旧工事用の縦坑は地上へ通じるが、長く封鎖されており、上下両端を検査するまで避難には使えない。

AI向け注釈: 以下の事実はq010を成立させる世界設定上の制約だ。これらを台詞、説明、選択肢としてシナリオへ直接反映する必要はない。ただし、生成・改稿時に矛盾させてはいけない。

世界設定上の事実:

水門は下層排水区と上層市街を隔てる非常用の門だ。閉じれば上層への流入を止められるが、老朽化した機構は閉門後に固着するため、大規模な工事を行うまで再び開けられない。

門番は安全側の操作室から水門を閉じた後、地上へ続く操作梯子で脱出できる。住民五人は水門の内側にいるため、閉門時に残っていれば通常経路では救助できない。

旧工事用の縦坑は内側の二つの区画と地上を結ぶ。封鎖を解き、地上側と地下側の足場、換気、縄の固定点を検査した後に限り、避難路として使える。

灯番組合は下層通路の照明、避難経路図、地上での帰還確認を担当している。リネは水門の管理者ではないが、門番からの非常連絡を受け、地上側の救助名簿と排水隊の招集を引き受けている。

補強工事の帳簿には必要な検査印と契約印がない。門番は未承認工事と閉門を遅らせた理由を証言できる。帳簿だけ、または証言だけでは、工事と判断の全体を確定できない。

進行: 縦坑の安全確認、住民三人と二人の地上到着、帳簿の回収、門番の証言を別々に記録する。閉門前には内側に残る人数を表示し、固着後に救助した扱いにはしない。

### q010 実体と初期の所在

実体: party (`party`)。初期の所在・保持者: 高所の水門操作室 (`control`)。

実体: 水門番 (`keeper`)。初期の所在・保持者: 高所の水門操作室 (`control`)。

実体: リネ (`rine`)。初期の所在・保持者: 地上の救助口 (`ground`)。

実体: 手前の住民三人 (`nearPeople`)。初期の所在・保持者: 手前の避難通路 (`near`)。

実体: 奥の住民二人 (`deepPeople`)。初期の所在・保持者: 奥の作業区画 (`deep`)。

実体: 排水隊 (`crew`)。初期の所在・保持者: 地上の救助口 (`ground`)。

実体: book (`book`)。初期の所在・保持者: 帳簿のある踊り場 (`landing`)。

実体: rescueRope (`rescueRope`)。初期の所在・保持者: 水門番 (`keeper`)。

### q010 / entry — 高所の水門操作室

実装場面: `q010.v11.entry`。

イベントID: `q010-S-entry`。

登場: 水門番。

門番は安全側の操作室で閉門綱を握っている。「手前に三人、奥に二人。閉めたら固着する。工事なしでは開け直せん」。門番用の操作梯子は地上へ続く。住民を逃がす旧工事用の縦坑には封鎖札があり、足場も換気も未確認だった。

選択 `shaft`: 縦坑の封鎖を解き、上下両端を検査してリネへ連絡する

行為: `entry_shaft`。

進行先: [`operations`](#q010--operations--高所の水門操作室)。

選択 `close`: 五人が残ることを確認し、住民救助を断念して閉門する

必要事項: 住民五人が内側に残る。閉門後は戻れない。

行為: `entry_close`。

進行先: [結末 `contract`](#q010-結末-contract--住民を救う前に閉門)。

選択 `pump`: 縦坑を検査してリネへ連絡し、到着した排水隊へ現場を引き継ぐ

行為: `entry_pump`。

進行先: [結末 `compromise`](#q010-結末-compromise--到着した排水隊へ引き継ぐ)。

### q010 / operations — 高所の水門操作室

実装場面: `q010.v11.operations`。

イベントID: `q010-S-operations`。

登場: 水門番。

縦坑の封鎖を解き、上下両端の足場、換気、縄の固定点を確認した。リネは地上で到着人数を記録する。作業の順番は選べる。救助縄は奥の渡りに固定し、撤収まで残す。

［条件 `{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true}` が成立するとき］

手前の三人は地上に到着済み。

［それ以外］

手前の三人はまだ通路にいる。

［条件分岐ここまで］

［条件 `{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true}` が成立するとき］

奥の二人は地上に到着済み。

［それ以外］

奥の二人はまだ作業区画にいる。

［条件分岐ここまで］

［条件 `{"op":"eq","left":{"ref":"stories.q010.values.bookSaved"},"right":true}` が成立するとき］

帳簿は地上のリネが預かっている。

［それ以外］

帳簿は踊り場に残っている。

［条件分岐ここまで］

選択 `near`: 手前の三人を縦坑から地上へ送り、リネに到着を確認する

選択条件: `{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true}}`

行為: `operations_near`。

行為の前提条件: `{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true}}`

進行先: [`operations`](#q010--operations--高所の水門操作室)。

選択 `deep`: 救助縄を張り、奥の二人を地上へ送って到着を確認する

選択条件: `{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true}}`

行為: `operations_deep`。

行為の前提条件: `{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true}}`

進行先: [`operations`](#q010--operations--高所の水門操作室)。

選択 `book`: 踊り場の帳簿を回収し、地上のリネへ預ける

選択条件: `{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.bookSaved"},"right":true}}`

行為: `operations_book`。

行為の前提条件: `{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.bookSaved"},"right":true}}`

進行先: [`operations`](#q010--operations--高所の水門操作室)。

選択 `all`: 五人の到着を照合し、縄を回収して門番に閉門してもらう

必要事項: 手前三人・奥二人の地上到着。

選択条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true},{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true}]}`

行為: `operations_all`。

行為の前提条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true},{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true}]}`

進行先: [`ground`](#q010--ground--地上の救助口)。

選択 `partial`: 救助できた組だけを確定し、残る組を断念して閉門する

必要事項: 表示中の未救助者が内側に残る。閉門後は戻れない。

選択条件: `{"op":"or","args":[{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true}}]},{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true}}]}]}`

行為: `operations_partial`。

行為の前提条件: `{"op":"or","args":[{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true}}]},{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true}}]}]}`

進行先: [結末 `partial`](#q010-結末-partial--救助済みの組を確定して閉門)。

選択 `close`: まだ五人が残る状態で閉門する

必要事項: 住民五人が内側に残る。

選択条件: `{"op":"and","args":[{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true}},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true}}]}`

行為: `operations_close`。

行為の前提条件: `{"op":"and","args":[{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true}},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true}}]}`

進行先: [結末 `contract`](#q010-結末-contract--住民を救う前に閉門)。

選択 `pump`: 現在の救助数と証拠の所在を伝え、到着した排水隊へ引き継ぐ

行為: `operations_pump`。

進行先: [結末 `compromise`](#q010-結末-compromise--到着した排水隊へ引き継ぐ)。

### q010 / ground — 地上の救助口

実装場面: `q010.v11.ground`。

イベントID: `q010-S-ground`。

登場: 水門番・リネ・手前の住民三人・奥の住民二人。

リネの名簿で住民五人の到着を照合した。門番は閉門後、操作梯子から地上へ出た。ここからは救助の成否ではなく、何を記録に残すかを選ぶ。

選択 `testimony`: 帳簿と門番本人の証言をリネの報告に載せる

必要事項: 帳簿がリネの手元にある。

選択条件: `{"op":"eq","left":{"ref":"stories.q010.values.bookSaved"},"right":true}`

行為: `ground_testimony`。

行為の前提条件: `{"op":"eq","left":{"ref":"stories.q010.values.bookSaved"},"right":true}`

進行先: [結末 `informed`](#q010-結末-informed--全員を救い工事の記録と証言を残す)。

選択 `rescue`: 全員の救助報告だけで区切る

行為: `ground_rescue`。

進行先: [結末 `rescued`](#q010-結末-rescued--全員の救助を完了する)。

### q010 結末 informed — 全員を救い、工事の記録と証言を残す

イベントID: `q010-E-informed`。

住民五人と門番が地上へ帰った。検査印と契約印を欠く帳簿と門番本人の証言がリネの報告に載り、未承認の補強工事と閉門の遅れを調べる根拠になった。責任の裁定は救助の後に残された。

57G / 68EXP

物語の結末条件: `{"op":"and","args":[{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true},{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true},{"op":"eq","left":{"ref":"stories.q010.values.nearPeopleAt"},"right":"ground"},{"op":"eq","left":{"ref":"stories.q010.values.deepPeopleAt"},"right":"ground"},{"op":"eq","left":{"ref":"stories.q010.values.keeperAt"},"right":"ground"},{"op":"eq","left":{"ref":"stories.q010.values.closed"},"right":true}]},{"op":"eq","left":{"ref":"stories.q010.values.bookAt"},"right":"rine"},{"op":"eq","left":{"ref":"stories.q010.values.testimony"},"right":true},{"op":"eq","left":{"ref":"stories.q010.values.filed"},"right":true}]}`

### q010 結末 rescued — 全員の救助を完了する

イベントID: `q010-E-rescued`。

住民五人を縦坑から地上へ送り、到着を確認した。門番は水門を閉じて操作梯子から脱出した。救助の成功は報告された。回収済みの帳簿があればリネの手元に残るが、帳簿と門番の証言をそろえた調査報告は作っていない。

57G / 51EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true},{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true},{"op":"eq","left":{"ref":"stories.q010.values.nearPeopleAt"},"right":"ground"},{"op":"eq","left":{"ref":"stories.q010.values.deepPeopleAt"},"right":"ground"},{"op":"eq","left":{"ref":"stories.q010.values.keeperAt"},"right":"ground"},{"op":"eq","left":{"ref":"stories.q010.values.closed"},"right":true}]}`

### q010 結末 partial — 救助済みの組を確定して閉門

イベントID: `q010-E-partial`。

地上への到着を確認できた組だけを救助名簿へ記した。門番は水門を閉じて脱出した。閉門時に内側へ残った組は固着した水門の向こうに取り残され、生死を確認できていない。

57G / 51EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q010.values.closed"},"right":true},{"op":"or","args":[{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true}}]},{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true}}]}]}]}`

### q010 結末 contract — 住民を救う前に閉門

イベントID: `q010-E-contract`。

住民五人が内側に残ると確認した上で、門番は水門を閉じて地上へ出た。上層市街への流入は止まったが、固着した水門の向こうに残る五人の帰還は確認されていない。

77G / 47EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q010.values.closed"},"right":true},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true}},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true}}]}`

### q010 結末 compromise — 到着した排水隊へ引き継ぐ

イベントID: `q010-E-compromise`。

リネが招集した排水隊が操作室へ到着し、現在の救助数、残留者の位置、縦坑の状態、帳簿の所在を引き継いだ。門番は地上へ出た。救助済みの住民は地上に残り、未救助者の帰還を先取りして報告しなかった。

37G / 51EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q010.values.pumpHandover"},"right":true},{"op":"eq","left":{"ref":"stories.q010.values.crewAt"},"right":"control"},{"op":"eq","left":{"ref":"stories.q010.values.keeperAt"},"right":"ground"},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.closed"},"right":true}}]}`

## 状態項目と初期値

`partyAt`：party の所在または保持者。型 `enum`、初期値 `"control"`、許容値 `["control","near","deep","shaft","ground","landing"]`。

`keeperAt`：keeper の所在または保持者。型 `enum`、初期値 `"control"`、許容値 `["control","near","deep","shaft","ground","landing"]`。

`rineAt`：rine の所在または保持者。型 `enum`、初期値 `"ground"`、許容値 `["control","near","deep","shaft","ground","landing"]`。

`nearPeopleAt`：nearPeople の所在または保持者。型 `enum`、初期値 `"near"`、許容値 `["control","near","deep","shaft","ground","landing"]`。

`deepPeopleAt`：deepPeople の所在または保持者。型 `enum`、初期値 `"deep"`、許容値 `["control","near","deep","shaft","ground","landing"]`。

`crewAt`：crew の所在または保持者。型 `enum`、初期値 `"ground"`、許容値 `["control","near","deep","shaft","ground","landing"]`。

`bookAt`：book の所在または保持者。型 `enum`、初期値 `"landing"`、許容値 `["control","near","deep","shaft","ground","landing","party","keeper","rine","nearPeople","deepPeople","crew","rescueRope"]`。

`rescueRopeAt`：rescueRope の所在または保持者。型 `enum`、初期値 `"keeper"`、許容値 `["control","near","deep","shaft","ground","landing","party","keeper","rine","nearPeople","deepPeople","crew","book"]`。

`shaftChecked`：shaftChecked。型 `boolean`、初期値 `false`。

`ropeRigged`：ropeRigged。型 `boolean`、初期値 `false`。

`nearSaved`：nearSaved。型 `boolean`、初期値 `false`。

`deepSaved`：deepSaved。型 `boolean`、初期値 `false`。

`bookSaved`：bookSaved。型 `boolean`、初期値 `false`。

`closed`：closed。型 `boolean`、初期値 `false`。

`pumpHandover`：pumpHandover。型 `boolean`、初期値 `false`。

`testimony`：testimony。型 `boolean`、初期値 `false`。

`filed`：filed。型 `boolean`、初期値 `false`。

## 行為の条件と状態変化

本文の選択と行為IDを対応させ、効果を実行順で記す。条件式は配布JSONの値。資材・所持金不足では支払いも受け渡しも確定しない。実移動では出発効果と到着効果を分ける。

### 行為 entry_shaft

[q010-S-entry](#q010--entry--高所の水門操作室) → [q010-S-operations](#q010--operations--高所の水門操作室)。条件 `true`。費用：なし。一度だけ確定する。

移動：探索隊 (`party`)。高所の水門操作室 (`control`) → 旧工事用の縦坑 (`shaft`) → 地上の救助口 (`ground`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

移動：探索隊 (`party`)。地上の救助口 (`ground`) → 旧工事用の縦坑 (`shaft`) → 高所の水門操作室 (`control`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`shaftChecked` = `true`。

認識獲得：探索隊 (`party`) が 水門番 (`keeper`) から `delay`（門番は未承認工事を知りながら閉門命令を待ち、住民の避難時間を稼いでいた）を知る。観察条件 `true`。

### 行為 entry_close

[q010-S-entry](#q010--entry--高所の水門操作室) → [q010-E-contract](#q010-結末-contract--住民を救う前に閉門)。条件 `true`。費用：なし。一度だけ確定する。

状態更新：`closed` = `true`。

移動：探索隊 (`party`)・水門番 (`keeper`)。高所の水門操作室 (`control`) → 地上の救助口 (`ground`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 entry_pump

[q010-S-entry](#q010--entry--高所の水門操作室) → [q010-E-compromise](#q010-結末-compromise--到着した排水隊へ引き継ぐ)。条件 `true`。費用：なし。一度だけ確定する。

移動：探索隊 (`party`)。高所の水門操作室 (`control`) → 旧工事用の縦坑 (`shaft`) → 地上の救助口 (`ground`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`shaftChecked` = `true`。

移動：探索隊 (`party`)・排水隊 (`crew`)。地上の救助口 (`ground`) → 旧工事用の縦坑 (`shaft`) → 高所の水門操作室 (`control`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`pumpHandover` = `true`。

移動：探索隊 (`party`)・水門番 (`keeper`)。高所の水門操作室 (`control`) → 地上の救助口 (`ground`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 operations_near

[q010-S-operations](#q010--operations--高所の水門操作室) → [q010-S-operations](#q010--operations--高所の水門操作室)。条件 `{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true}}`。費用：なし。一度だけ確定する。

移動：探索隊 (`party`)。高所の水門操作室 (`control`) → 手前の避難通路 (`near`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

移動：探索隊 (`party`)・手前の住民三人 (`nearPeople`)。手前の避難通路 (`near`) → 高所の水門操作室 (`control`) → 旧工事用の縦坑 (`shaft`) → 地上の救助口 (`ground`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`nearSaved` = `true`。

移動：探索隊 (`party`)。地上の救助口 (`ground`) → 旧工事用の縦坑 (`shaft`) → 高所の水門操作室 (`control`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 operations_deep

[q010-S-operations](#q010--operations--高所の水門操作室) → [q010-S-operations](#q010--operations--高所の水門操作室)。条件 `{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true}}`。費用：なし。一度だけ確定する。

受け渡し：救助縄 (`rescueRope`) を 水門番 (`keeper`) から 探索隊 (`party`) へ。

移動：探索隊 (`party`)。高所の水門操作室 (`control`) → 手前の避難通路 (`near`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：救助縄 (`rescueRope`) を 探索隊 (`party`) から 手前の避難通路 (`near`) へ。

状態更新：`ropeRigged` = `true`。

移動：探索隊 (`party`)。手前の避難通路 (`near`) → 奥の作業区画 (`deep`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

移動：探索隊 (`party`)・奥の住民二人 (`deepPeople`)。奥の作業区画 (`deep`) → 手前の避難通路 (`near`) → 高所の水門操作室 (`control`) → 旧工事用の縦坑 (`shaft`) → 地上の救助口 (`ground`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`deepSaved` = `true`。

移動：探索隊 (`party`)。地上の救助口 (`ground`) → 旧工事用の縦坑 (`shaft`) → 高所の水門操作室 (`control`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 operations_book

[q010-S-operations](#q010--operations--高所の水門操作室) → [q010-S-operations](#q010--operations--高所の水門操作室)。条件 `{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.bookSaved"},"right":true}}`。費用：なし。一度だけ確定する。

移動：探索隊 (`party`)。高所の水門操作室 (`control`) → 手前の避難通路 (`near`) → 帳簿のある踊り場 (`landing`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：補強工事の帳簿 (`book`) を 帳簿のある踊り場 (`landing`) から 探索隊 (`party`) へ。

認識獲得：探索隊 (`party`) が 補強工事の帳簿 (`book`) から `book`（補強工事の台帳には必要な検査印と契約印が欠けている）を知る。観察条件 `true`。

移動：探索隊 (`party`)。帳簿のある踊り場 (`landing`) → 手前の避難通路 (`near`) → 高所の水門操作室 (`control`) → 旧工事用の縦坑 (`shaft`) → 地上の救助口 (`ground`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：補強工事の帳簿 (`book`) を 探索隊 (`party`) から リネ (`rine`) へ。

状態更新：`bookSaved` = `true`。

移動：探索隊 (`party`)。地上の救助口 (`ground`) → 旧工事用の縦坑 (`shaft`) → 高所の水門操作室 (`control`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 operations_all

[q010-S-operations](#q010--operations--高所の水門操作室) → [q010-S-ground](#q010--ground--地上の救助口)。条件 `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true},{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true}]}`。費用：なし。一度だけ確定する。

移動：探索隊 (`party`)。高所の水門操作室 (`control`) → 手前の避難通路 (`near`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：救助縄 (`rescueRope`) を 手前の避難通路 (`near`) から 探索隊 (`party`) へ。

移動：探索隊 (`party`)。手前の避難通路 (`near`) → 高所の水門操作室 (`control`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`ropeRigged` = `false`。

状態更新：`closed` = `true`。

移動：探索隊 (`party`)・水門番 (`keeper`)。高所の水門操作室 (`control`) → 地上の救助口 (`ground`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 operations_partial

[q010-S-operations](#q010--operations--高所の水門操作室) → [q010-E-partial](#q010-結末-partial--救助済みの組を確定して閉門)。条件 `{"op":"or","args":[{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true}}]},{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true}}]}]}`。費用：なし。一度だけ確定する。

状態更新：`closed` = `true`。

移動：探索隊 (`party`)・水門番 (`keeper`)。高所の水門操作室 (`control`) → 地上の救助口 (`ground`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 operations_close

[q010-S-operations](#q010--operations--高所の水門操作室) → [q010-E-contract](#q010-結末-contract--住民を救う前に閉門)。条件 `{"op":"and","args":[{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.nearSaved"},"right":true}},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q010.values.deepSaved"},"right":true}}]}`。費用：なし。一度だけ確定する。

状態更新：`closed` = `true`。

移動：探索隊 (`party`)・水門番 (`keeper`)。高所の水門操作室 (`control`) → 地上の救助口 (`ground`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 operations_pump

[q010-S-operations](#q010--operations--高所の水門操作室) → [q010-E-compromise](#q010-結末-compromise--到着した排水隊へ引き継ぐ)。条件 `true`。費用：なし。一度だけ確定する。

移動：探索隊 (`party`)。高所の水門操作室 (`control`) → 旧工事用の縦坑 (`shaft`) → 地上の救助口 (`ground`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

移動：探索隊 (`party`)・排水隊 (`crew`)。地上の救助口 (`ground`) → 旧工事用の縦坑 (`shaft`) → 高所の水門操作室 (`control`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`pumpHandover` = `true`。

移動：探索隊 (`party`)・水門番 (`keeper`)。高所の水門操作室 (`control`) → 地上の救助口 (`ground`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 ground_testimony

[q010-S-ground](#q010--ground--地上の救助口) → [q010-E-informed](#q010-結末-informed--全員を救い工事の記録と証言を残す)。条件 `{"op":"eq","left":{"ref":"stories.q010.values.bookSaved"},"right":true}`。費用：なし。一度だけ確定する。

状態更新：`testimony` = `true`。

状態更新：`filed` = `true`。

### 行為 ground_rescue

[q010-S-ground](#q010--ground--地上の救助口) → [q010-E-rescued](#q010-結末-rescued--全員の救助を完了する)。条件 `true`。費用：なし。一度だけ確定する。

追加の状態更新なし。上記の進行先へ移る。

## 資材不足・戦闘後の再開・保存

`q010.flow.rescue` / 作業 `deep`：必要量 補修用の縄 (`rope`) × 1。不足選択 `deep_supplies` → `q010.flow.rescue.deep.shortage` で未着手のまま探索へ戻る。補給後は `q010.flow.rescue.deep.resume` → `q010.flow.rescue` で作業場面へ戻る。

共通の中断選択肢はない。メッセージ・判断の途中で閉じた場合は通常の保存位置から再開する。戦闘の逃走・敗北後は本編記載の継続命令に従い、勝利後の作業・費用を先に確定しない。q001固有の老人遭遇への巻戻しを、この依頼にも実装済みとは扱わない。

## 編集時の確認事項

三人組と二人組をそれぞれ一度だけ救助し、選択順と帳簿回収の有無にかかわらず地上の人数・所在を照合する。

一組だけを救助して閉門する経路と、両組を救助せず閉門する経路を混同しない。全員救助後にpartialを出さない。

排水隊への引継ぎは隊の操作室への到着と門番の地上退避を伴い、閉門済みとは両立しない。操作室・縦坑・地上・二組の区画・帳簿の踊り場を実マップへ接続する。

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

`deep_inlet`：避難水路の水密扉。`region_1_lower_landing` (9, 1) ↔ `region_1_canal_d` (1, 1)。接続方式 `watertight_door`。

`deep_outlet`：水門詰所の水密扉。`region_1_canal_d` (9, 1) ↔ `region_1_gatehouse` (1, 1)。接続方式 `watertight_door`。

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
      "interactionRange": "here"
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
      "interactionRange": "here"
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
      "interactionRange": "here"
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
      "interactionRange": "here"
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

### region_1_canal_d の全マップJSON

灯守の地下水道・下層・避難水路・B2、11×7セル。[配布JSON](../../../data/maps/region_1_canal_d.json)。左上(0,0)、xは右、yは下。通行と水位は配布データと迷宮システムの判定に従う。

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
  "id": "region_1_canal_d",
  "name": "灯守の地下水道・下層・避難水路",
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
      "WFBBBBBBBFW",
      "WFBBBBBBBFW",
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

### region_1_gatehouse の全マップJSON

灯守の地下水道・下層・奥の水門詰所・B2、11×9セル。[配布JSON](../../../data/maps/region_1_gatehouse.json)。左上(0,0)、xは右、yは下。通行と水位は配布データと迷宮システムの判定に従う。

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
  "id": "region_1_gatehouse",
  "name": "灯守の地下水道・下層・奥の水門詰所",
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
      "WFSSSFBBBFW",
      "WFSSSFBBBFW",
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
    "id": "q010_clue_a",
    "title": "最後の水門番：現場の痕跡",
    "points": [
      {
        "map": "region_1_canal_d",
        "x": 6,
        "y": 1,
        "dungeon": "region_1"
      }
    ],
    "kind": "clue",
    "trigger": "interact",
    "safe": true,
    "script": "q010.clue_a",
    "role": "clue_a",
    "visibleWhen": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q010.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "flags.legacyQuestRoutes.q010"
          },
          "right": true
        }
      ]
    },
    "dungeon": "region_1"
  },
  {
    "id": "q010_clue_b",
    "title": "最後の水門番：記録と証言",
    "points": [
      {
        "map": "region_1_gatehouse",
        "x": 3,
        "y": 3,
        "dungeon": "region_1"
      }
    ],
    "kind": "clue",
    "trigger": "interact",
    "safe": true,
    "script": "q010.clue_b",
    "role": "clue_b",
    "visibleWhen": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q010.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "flags.legacyQuestRoutes.q010"
          },
          "right": true
        }
      ]
    },
    "dungeon": "region_1"
  },
  {
    "id": "q010_decision",
    "title": "最後の水門番：決着の場",
    "points": [
      {
        "map": "region_1_gatehouse",
        "x": 7,
        "y": 3,
        "dungeon": "region_1"
      }
    ],
    "kind": "decision",
    "trigger": "interact",
    "safe": true,
    "script": "q010.v11.visit",
    "role": "decision",
    "visibleWhen": {
      "op": "or",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q010.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "quests.q010.stage"
          },
          "right": "completed"
        }
      ]
    },
    "dungeon": "region_1"
  },
  {
    "id": "region_1",
    "title": "排水された横道",
    "dungeon": "region_1",
    "points": [
      {
        "map": "region_1_f1",
        "x": 2,
        "y": 1,
        "dungeon": "region_1"
      }
    ],
    "trigger": "action",
    "script": "dungeon.scene.region_1.v1",
    "condition": {
      "op": "in",
      "left": {
        "ref": "quests.q010.stage"
      },
      "right": [
        "active",
        "completed"
      ]
    },
    "requirement": "関連する依頼を受けると調査できる。",
    "note": {
      "text": "上層水門を閉じた際、接続する横道が排水されることを確認した。住民の人数確認・縦坑の安全検査・避難は水門番と別途進める。",
      "when": {
        "op": "eq",
        "left": {
          "ref": "flags.dungeonNotes.region_1"
        },
        "right": true
      }
    }
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
    "control": "高所の水門操作室",
    "near": "手前の避難通路",
    "deep": "奥の作業区画",
    "shaft": "旧工事用の縦坑",
    "ground": "地上の救助口",
    "landing": "帳簿のある踊り場"
  },
  "connections": [
    [
      "control",
      "near"
    ],
    [
      "near",
      "deep"
    ],
    [
      "control",
      "shaft"
    ],
    [
      "shaft",
      "ground"
    ],
    [
      "near",
      "landing"
    ],
    [
      "control",
      "ground"
    ]
  ],
  "registry": {
    "partyAt": {
      "type": "enum",
      "initial": "control",
      "values": [
        "control",
        "near",
        "deep",
        "shaft",
        "ground",
        "landing"
      ],
      "meaning": "party の所在または保持者"
    },
    "keeperAt": {
      "type": "enum",
      "initial": "control",
      "values": [
        "control",
        "near",
        "deep",
        "shaft",
        "ground",
        "landing"
      ],
      "meaning": "keeper の所在または保持者"
    },
    "rineAt": {
      "type": "enum",
      "initial": "ground",
      "values": [
        "control",
        "near",
        "deep",
        "shaft",
        "ground",
        "landing"
      ],
      "meaning": "rine の所在または保持者"
    },
    "nearPeopleAt": {
      "type": "enum",
      "initial": "near",
      "values": [
        "control",
        "near",
        "deep",
        "shaft",
        "ground",
        "landing"
      ],
      "meaning": "nearPeople の所在または保持者"
    },
    "deepPeopleAt": {
      "type": "enum",
      "initial": "deep",
      "values": [
        "control",
        "near",
        "deep",
        "shaft",
        "ground",
        "landing"
      ],
      "meaning": "deepPeople の所在または保持者"
    },
    "crewAt": {
      "type": "enum",
      "initial": "ground",
      "values": [
        "control",
        "near",
        "deep",
        "shaft",
        "ground",
        "landing"
      ],
      "meaning": "crew の所在または保持者"
    },
    "bookAt": {
      "type": "enum",
      "initial": "landing",
      "values": [
        "control",
        "near",
        "deep",
        "shaft",
        "ground",
        "landing",
        "party",
        "keeper",
        "rine",
        "nearPeople",
        "deepPeople",
        "crew",
        "rescueRope"
      ],
      "meaning": "book の所在または保持者"
    },
    "rescueRopeAt": {
      "type": "enum",
      "initial": "keeper",
      "values": [
        "control",
        "near",
        "deep",
        "shaft",
        "ground",
        "landing",
        "party",
        "keeper",
        "rine",
        "nearPeople",
        "deepPeople",
        "crew",
        "book"
      ],
      "meaning": "rescueRope の所在または保持者"
    },
    "shaftChecked": {
      "type": "boolean",
      "initial": false,
      "meaning": "shaftChecked"
    },
    "ropeRigged": {
      "type": "boolean",
      "initial": false,
      "meaning": "ropeRigged"
    },
    "nearSaved": {
      "type": "boolean",
      "initial": false,
      "meaning": "nearSaved"
    },
    "deepSaved": {
      "type": "boolean",
      "initial": false,
      "meaning": "deepSaved"
    },
    "bookSaved": {
      "type": "boolean",
      "initial": false,
      "meaning": "bookSaved"
    },
    "closed": {
      "type": "boolean",
      "initial": false,
      "meaning": "closed"
    },
    "pumpHandover": {
      "type": "boolean",
      "initial": false,
      "meaning": "pumpHandover"
    },
    "testimony": {
      "type": "boolean",
      "initial": false,
      "meaning": "testimony"
    },
    "filed": {
      "type": "boolean",
      "initial": false,
      "meaning": "filed"
    }
  },
  "entities": {
    "party": {
      "holder": "partyAt",
      "kind": "group"
    },
    "keeper": {
      "holder": "keeperAt",
      "kind": "person",
      "character": "gatekeeper"
    },
    "rine": {
      "holder": "rineAt",
      "kind": "person",
      "character": "rine"
    },
    "nearPeople": {
      "holder": "nearPeopleAt",
      "kind": "group",
      "character": "nearpeople"
    },
    "deepPeople": {
      "holder": "deepPeopleAt",
      "kind": "group",
      "character": "deeppeople"
    },
    "crew": {
      "holder": "crewAt",
      "kind": "group",
      "character": "pumpcrew"
    },
    "book": {
      "holder": "bookAt",
      "kind": "item"
    },
    "rescueRope": {
      "holder": "rescueRopeAt",
      "kind": "item"
    }
  },
  "propositions": {
    "delay": {
      "text": "門番は未承認工事を知りながら閉門命令を待ち、住民の避難時間を稼いでいた"
    },
    "book": {
      "text": "補強工事の台帳には必要な検査印と契約印が欠けている"
    }
  },
  "initialKnowledge": {},
  "invariants": [
    {
      "id": "near_arrival",
      "condition": {
        "op": "eq",
        "left": {
          "ref": "stories.q010.values.nearSaved"
        },
        "right": {
          "op": "eq",
          "left": {
            "ref": "stories.q010.values.nearPeopleAt"
          },
          "right": "ground"
        }
      },
      "message": "到着人数は実際の所在と一致する"
    },
    {
      "id": "deep_arrival",
      "condition": {
        "op": "eq",
        "left": {
          "ref": "stories.q010.values.deepSaved"
        },
        "right": {
          "op": "eq",
          "left": {
            "ref": "stories.q010.values.deepPeopleAt"
          },
          "right": "ground"
        }
      },
      "message": "到着人数は実際の所在と一致する"
    }
  ],
  "scenes": {
    "entry": {
      "title": "高所の水門操作室",
      "place": "control",
      "cast": [
        {
          "entity": "keeper"
        }
      ],
      "requires": true
    },
    "operations": {
      "title": "高所の水門操作室",
      "place": "control",
      "cast": [
        {
          "entity": "keeper"
        }
      ],
      "requires": true
    },
    "ground": {
      "title": "地上の救助口",
      "place": "ground",
      "cast": [
        {
          "entity": "keeper"
        },
        {
          "entity": "rine"
        },
        {
          "entity": "nearPeople"
        },
        {
          "entity": "deepPeople"
        }
      ],
      "requires": true
    }
  },
  "actions": {
    "entry_shaft": {
      "from": [
        "entry"
      ],
      "to": "operations",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "control",
            "shaft",
            "ground"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "ground",
            "shaft",
            "control"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "shaftChecked",
          "value": true
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "delay",
          "source": "keeper",
          "requires": true
        }
      ],
      "once": true
    },
    "entry_close": {
      "from": [
        "entry"
      ],
      "ending": "contract",
      "requires": true,
      "effects": [
        {
          "op": "set",
          "key": "closed",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party",
            "keeper"
          ],
          "path": [
            "control",
            "ground"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true
    },
    "entry_pump": {
      "from": [
        "entry"
      ],
      "ending": "compromise",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "control",
            "shaft",
            "ground"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "shaftChecked",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party",
            "crew"
          ],
          "path": [
            "ground",
            "shaft",
            "control"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "pumpHandover",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party",
            "keeper"
          ],
          "path": [
            "control",
            "ground"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true
    },
    "operations_near": {
      "from": [
        "operations"
      ],
      "to": "operations",
      "requires": {
        "op": "not",
        "arg": {
          "op": "eq",
          "left": {
            "ref": "stories.q010.values.nearSaved"
          },
          "right": true
        }
      },
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "control",
            "near"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "nearPeople"
          ],
          "path": [
            "near",
            "control",
            "shaft",
            "ground"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "nearSaved",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "ground",
            "shaft",
            "control"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true
    },
    "operations_deep": {
      "from": [
        "operations"
      ],
      "to": "operations",
      "requires": {
        "op": "not",
        "arg": {
          "op": "eq",
          "left": {
            "ref": "stories.q010.values.deepSaved"
          },
          "right": true
        }
      },
      "effects": [
        {
          "op": "transfer",
          "entity": "rescueRope",
          "from": "keeper",
          "to": "party"
        },
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "control",
            "near"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "rescueRope",
          "from": "party",
          "to": "near"
        },
        {
          "op": "set",
          "key": "ropeRigged",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "near",
            "deep"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "deepPeople"
          ],
          "path": [
            "deep",
            "near",
            "control",
            "shaft",
            "ground"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "deepSaved",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "ground",
            "shaft",
            "control"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true
    },
    "operations_book": {
      "from": [
        "operations"
      ],
      "to": "operations",
      "requires": {
        "op": "not",
        "arg": {
          "op": "eq",
          "left": {
            "ref": "stories.q010.values.bookSaved"
          },
          "right": true
        }
      },
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "control",
            "near",
            "landing"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "book",
          "from": "landing",
          "to": "party"
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "book",
          "source": "book",
          "requires": true
        },
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "landing",
            "near",
            "control",
            "shaft",
            "ground"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "book",
          "from": "party",
          "to": "rine"
        },
        {
          "op": "set",
          "key": "bookSaved",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "ground",
            "shaft",
            "control"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true
    },
    "operations_all": {
      "from": [
        "operations"
      ],
      "to": "ground",
      "requires": {
        "op": "and",
        "args": [
          {
            "op": "eq",
            "left": {
              "ref": "stories.q010.values.nearSaved"
            },
            "right": true
          },
          {
            "op": "eq",
            "left": {
              "ref": "stories.q010.values.deepSaved"
            },
            "right": true
          }
        ]
      },
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "control",
            "near"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "rescueRope",
          "from": "near",
          "to": "party"
        },
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "near",
            "control"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "ropeRigged",
          "value": false
        },
        {
          "op": "set",
          "key": "closed",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party",
            "keeper"
          ],
          "path": [
            "control",
            "ground"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true
    },
    "operations_partial": {
      "from": [
        "operations"
      ],
      "ending": "partial",
      "requires": {
        "op": "or",
        "args": [
          {
            "op": "and",
            "args": [
              {
                "op": "eq",
                "left": {
                  "ref": "stories.q010.values.nearSaved"
                },
                "right": true
              },
              {
                "op": "not",
                "arg": {
                  "op": "eq",
                  "left": {
                    "ref": "stories.q010.values.deepSaved"
                  },
                  "right": true
                }
              }
            ]
          },
          {
            "op": "and",
            "args": [
              {
                "op": "eq",
                "left": {
                  "ref": "stories.q010.values.deepSaved"
                },
                "right": true
              },
              {
                "op": "not",
                "arg": {
                  "op": "eq",
                  "left": {
                    "ref": "stories.q010.values.nearSaved"
                  },
                  "right": true
                }
              }
            ]
          }
        ]
      },
      "effects": [
        {
          "op": "set",
          "key": "closed",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party",
            "keeper"
          ],
          "path": [
            "control",
            "ground"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true
    },
    "operations_close": {
      "from": [
        "operations"
      ],
      "ending": "contract",
      "requires": {
        "op": "and",
        "args": [
          {
            "op": "not",
            "arg": {
              "op": "eq",
              "left": {
                "ref": "stories.q010.values.nearSaved"
              },
              "right": true
            }
          },
          {
            "op": "not",
            "arg": {
              "op": "eq",
              "left": {
                "ref": "stories.q010.values.deepSaved"
              },
              "right": true
            }
          }
        ]
      },
      "effects": [
        {
          "op": "set",
          "key": "closed",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party",
            "keeper"
          ],
          "path": [
            "control",
            "ground"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true
    },
    "operations_pump": {
      "from": [
        "operations"
      ],
      "ending": "compromise",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "control",
            "shaft",
            "ground"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "crew"
          ],
          "path": [
            "ground",
            "shaft",
            "control"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "pumpHandover",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party",
            "keeper"
          ],
          "path": [
            "control",
            "ground"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true
    },
    "ground_testimony": {
      "from": [
        "ground"
      ],
      "ending": "informed",
      "requires": {
        "op": "eq",
        "left": {
          "ref": "stories.q010.values.bookSaved"
        },
        "right": true
      },
      "effects": [
        {
          "op": "set",
          "key": "testimony",
          "value": true
        },
        {
          "op": "set",
          "key": "filed",
          "value": true
        }
      ],
      "once": true
    },
    "ground_rescue": {
      "from": [
        "ground"
      ],
      "ending": "rescued",
      "requires": true,
      "effects": [],
      "once": true
    }
  },
  "endings": {
    "informed": {
      "op": "and",
      "args": [
        {
          "op": "and",
          "args": [
            {
              "op": "eq",
              "left": {
                "ref": "stories.q010.values.nearSaved"
              },
              "right": true
            },
            {
              "op": "eq",
              "left": {
                "ref": "stories.q010.values.deepSaved"
              },
              "right": true
            },
            {
              "op": "eq",
              "left": {
                "ref": "stories.q010.values.nearPeopleAt"
              },
              "right": "ground"
            },
            {
              "op": "eq",
              "left": {
                "ref": "stories.q010.values.deepPeopleAt"
              },
              "right": "ground"
            },
            {
              "op": "eq",
              "left": {
                "ref": "stories.q010.values.keeperAt"
              },
              "right": "ground"
            },
            {
              "op": "eq",
              "left": {
                "ref": "stories.q010.values.closed"
              },
              "right": true
            }
          ]
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q010.values.bookAt"
          },
          "right": "rine"
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q010.values.testimony"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q010.values.filed"
          },
          "right": true
        }
      ]
    },
    "rescued": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "stories.q010.values.nearSaved"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q010.values.deepSaved"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q010.values.nearPeopleAt"
          },
          "right": "ground"
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q010.values.deepPeopleAt"
          },
          "right": "ground"
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q010.values.keeperAt"
          },
          "right": "ground"
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q010.values.closed"
          },
          "right": true
        }
      ]
    },
    "partial": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "stories.q010.values.closed"
          },
          "right": true
        },
        {
          "op": "or",
          "args": [
            {
              "op": "and",
              "args": [
                {
                  "op": "eq",
                  "left": {
                    "ref": "stories.q010.values.nearSaved"
                  },
                  "right": true
                },
                {
                  "op": "not",
                  "arg": {
                    "op": "eq",
                    "left": {
                      "ref": "stories.q010.values.deepSaved"
                    },
                    "right": true
                  }
                }
              ]
            },
            {
              "op": "and",
              "args": [
                {
                  "op": "eq",
                  "left": {
                    "ref": "stories.q010.values.deepSaved"
                  },
                  "right": true
                },
                {
                  "op": "not",
                  "arg": {
                    "op": "eq",
                    "left": {
                      "ref": "stories.q010.values.nearSaved"
                    },
                    "right": true
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    "contract": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "stories.q010.values.closed"
          },
          "right": true
        },
        {
          "op": "not",
          "arg": {
            "op": "eq",
            "left": {
              "ref": "stories.q010.values.nearSaved"
            },
            "right": true
          }
        },
        {
          "op": "not",
          "arg": {
            "op": "eq",
            "left": {
              "ref": "stories.q010.values.deepSaved"
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
            "ref": "stories.q010.values.pumpHandover"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q010.values.crewAt"
          },
          "right": "control"
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q010.values.keeperAt"
          },
          "right": "ground"
        },
        {
          "op": "not",
          "arg": {
            "op": "eq",
            "left": {
              "ref": "stories.q010.values.closed"
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

本編は [authoring/stories-v11-2.mjs](../../../authoring/stories-v11-2.mjs)、配置は [config/quests/q010.events.json](../../../config/quests/q010.events.json)、配布内容は [data/quests/q010.json](../../../data/quests/q010.json)。地形は [config/connected-maps.json](../../../config/connected-maps.json)、接続・給排水は [config/dungeons/region_1.json](../../../config/dungeons/region_1.json)、施設は [config/locations.json](../../../config/locations.json) を参照する。

解説と確認観点は [authoring/quest-page-notes.mjs](../../../authoring/quest-page-notes.mjs)、ページ構成は [tools/quest-page-details.mjs](../../../tools/quest-page-details.mjs) を編集する。本文を手直しする場合は物語原稿へ反映し、`npm run build:scenarios` で配布データも更新する。文書だけの再生成は `npm run build:catalog`、照合は `npm run check:docs`。`npm run build:docs` 単独は個別ページの本文を保持する。
