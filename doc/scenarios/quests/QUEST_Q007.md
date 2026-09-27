# q007 声を返す壁：詳細・配置・状態変化

[個別ページ一覧](README.md) ／ [カタログへ戻る](../QUEST_CATALOG.md#q007-声を返す壁) ／ [シナリオ本文](#q007-声を返す壁) ／ [行為の条件と状態変化](#行為の条件と状態変化) ／ [配置イベント](#配置イベントと操作条件)

作品版 1.24.0。配布JSONから生成した作者向けページ。真相と結末を含む。本編5場面・3結末。

<!-- quest-page-source:c4354a9d88896a8c343371ff855309e8f9cbf3a46b03b860b89db3c9bfe2f760 -->

## 依頼の焦点と分岐の意味

声の主は故人の弟であり、読んでいる手紙の差出人は故人である。声の正体、原本の受け渡し、面会への同意、赦しをそれぞれ独立させる。

故人だけが知る問いに答えられないことは調査の手掛かりである。弟本人がいる伝声室へ行って声の主を確認する。

手紙は弟→探索隊→ミレへ渡す。手紙を届ける同意と、ミレ・弟双方の面会同意は別に扱う。

contractはミレの同意で伝声口を塞ぐ。compromiseは手紙だけを届け、informedは双方が望む面会まで成立させる。面会を赦しや関係修復の完了とは扱わない。

## 実装範囲と場所

現地イベントの配置と物語状態は実装済み。ただし worldPlaces と story.journey は未定義で、行為内の move は物語上の所在変更である。本文にある施設や通路を実際に歩いて到達する方式には未接続。以下の物語内経路を実マップの座標や移動完了と読み替えない。

`port`：地下室の伝声口。物語上の場所。個別の実座標・施設IDは未割当。

`corridor`：保守通路。物語上の場所。個別の実座標・施設IDは未割当。

`booth`：廃番所の伝声室。物語上の場所。個別の実座標・施設IDは未割当。

### 物語内の接続

地下室の伝声口 (`port`) ↔ 保守通路 (`corridor`)。

保守通路 (`corridor`) ↔ 廃番所の伝声室 (`booth`)。

## 人物・物品と認識

探索隊 (`party`)：集団。初期の所在・保持者は 地下室の伝声口 (`port`)、保存項目は `partyAt`。

ミレ (`mire`)：人物。初期の所在・保持者は 地下室の伝声口 (`port`)、保存項目は `mireAt`。酒場で働く遺族。亡夫の声の正体を自分で確かめる。

ミレの夫の弟 (`brother`)：人物。初期の所在・保持者は 廃番所の伝声室 (`booth`)、保存項目は `brotherAt`。手紙を預かる遺族。兄の手紙を届けたいが、ミレに拒まれるのが怖い。

故人の手紙の原本 (`letters`)：物品。初期の所在・保持者は ミレの夫の弟 (`brother`)、保存項目は `lettersAt`。

伝声管 (`pipe`)：物品。初期の所在・保持者は 地下室の伝声口 (`port`)、保存項目は `pipeAt`。

認識 `unanswered`：声は故人だけが知る出来事への問いに答えなかった。

認識 `voice`：夫の声をまねていたのは、その弟。

認識 `letters`：弟は故人の手紙を預かっていた。

初期認識：`{}`。固定された過去と探索隊がすでに知る情報は別に扱い、observeの成立で認識を加える。

## 本編の進行とイベントID

本編場面は `q007-S-場面キー`、配置は `q007-P-配置キー`、結末は `q007-E-結末キー`。S・P・Eは文書用の識別子。Fは強制戦闘、Bは戦闘中イベントで、命令に明示されたidがあればそれを使い、ない戦闘には文書用IDを付ける。全11IDが一意で、場面を並べ替えても変わらない。

[q007-S-entry](#q007--entry--地下室の伝声口)：地下室の伝声口。物語内の場所 `port`。

選択 `reply`：故人だけが知る出来事をミレに尋ね、その問いを壁へ返す → [q007-S-voice](#q007--voice--地下室の伝声口)。行為 [`entry_reply`](#行為-entry_reply)。

選択 `trace`：ミレにここで待ってもらい、保守通路をたどる → [q007-S-booth](#q007--booth--廃番所の伝声室)。行為 [`entry_trace`](#行為-entry_trace)。

選択 `seal`：声を聞き続けるかミレへ尋ね、本人の同意を得て伝声口を塞ぐ → [q007-E-contract](#q007-結末-contract--同意を得て伝声口を塞ぐ)。行為 [`entry_seal`](#行為-entry_seal)。

[q007-S-voice](#q007--voice--地下室の伝声口)：地下室の伝声口。物語内の場所 `port`。

選択 `walk`：問いへの返答を手掛かりに、保守通路から声の主を訪ねる → [q007-S-booth](#q007--booth--廃番所の伝声室)。行為 [`voice_walk`](#行為-voice_walk)。

選択 `seal`：ミレの意思を確かめ、この声のやり取りを終える → [q007-E-contract](#q007-結末-contract--同意を得て伝声口を塞ぐ)。行為 [`voice_seal`](#行為-voice_seal)。

[q007-S-booth](#q007--booth--廃番所の伝声室)：廃番所の伝声室。物語内の場所 `booth`。

選択 `letters`：弟が声の主であることと手紙の差出人を確認し、原本を預かってミレへ戻る → [q007-S-letters](#q007--letters--地下室の伝声口)。行為 [`booth_letters`](#行為-booth_letters)。

[q007-S-letters](#q007--letters--地下室の伝声口)：地下室の伝声口。物語内の場所 `port`。

選択 `meet`：ミレと弟の双方に面会の意思を確かめ、弟を迎えに行く → [q007-S-meeting](#q007--meeting--地下室の伝声口)。行為 [`letters_meet`](#行為-letters_meet)。

選択 `finish`：手紙の受け渡しで区切り、面会は強いない → [q007-E-compromise](#q007-結末-compromise--手紙だけを届ける)。行為 [`letters_finish`](#行為-letters_finish)。

[q007-S-meeting](#q007--meeting--地下室の伝声口)：地下室の伝声口。物語内の場所 `port`。

選択 `finish`：二人の面会を見届け、その場を離れる → [q007-E-informed](#q007-結末-informed--手紙を渡し同意した二人を会わせる)。行為 [`meeting_finish`](#行為-meeting_finish)。

現行本編に専用の強制戦闘・戦闘中イベントはない。通常の歩行遭遇と旧調査スクリプトは別に扱う。

## 配置イベントと操作条件

配置が保存されていることと、通常プレイで表示されることは同じではない。表示条件・操作条件は別々に評価する。legacyQuestRoutesを要する配置は旧経路用で、現行本編の必須経路へ数えない。

### q007-P-clue_a

声を返す壁：現場の痕跡。実行ID `q007_clue_a`、起動 `interact`、スクリプト `q007.clue_a`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・給金箱の水路・B2 (`region_1_canal_c`) / (5, 1) / イベント `q007_clue_a`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"and","args":[{"op":"eq","left":{"ref":"quests.q007.stage"},"right":"active"},{"op":"eq","left":{"ref":"flags.legacyQuestRoutes.q007"},"right":true}]}`。操作条件：`true`。

<details>
<summary>この配置の実行スクリプト</summary>

```json
{
  "commands": [
    {
      "op": "narrate",
      "text": "返事には毎回、同じ箇所で紙をめくる音が混じる。"
    },
    {
      "op": "quest.evidence",
      "quest": "q007",
      "key": "clue_a",
      "text": "返事には毎回、同じ箇所で紙をめくる音が混じる。"
    }
  ]
}
```

</details>

### q007-P-clue_b

声を返す壁：記録と証言。実行ID `q007_clue_b`、起動 `interact`、スクリプト `q007.clue_b`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・棺の待避場・B2 (`region_1_lower_landing`) / (3, 3) / イベント `q007_clue_b`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"and","args":[{"op":"eq","left":{"ref":"quests.q007.stage"},"right":"active"},{"op":"eq","left":{"ref":"flags.legacyQuestRoutes.q007"},"right":true}]}`。操作条件：`true`。

<details>
<summary>この配置の実行スクリプト</summary>

```json
{
  "commands": [
    {
      "op": "say",
      "name": "酒場のミレ",
      "text": "壁の穴から地上の酒場で使う煙草の匂いが流れます。"
    },
    {
      "op": "quest.evidence",
      "quest": "q007",
      "key": "clue_b",
      "text": "壁の穴から地上の酒場で使う煙草の匂いが流れる。"
    }
  ]
}
```

</details>

### q007-P-decision

声を返す壁：決着の場。実行ID `q007_decision`、起動 `interact`、スクリプト `q007.v11.visit`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・棺の待避場・B2 (`region_1_lower_landing`) / (5, 3) / イベント `q007_decision`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"or","args":[{"op":"eq","left":{"ref":"quests.q007.stage"},"right":"active"},{"op":"eq","left":{"ref":"quests.q007.stage"},"right":"completed"}]}`。操作条件：`true`。

物語の現在場面・補給後の再開先を呼び出す入口。本編全文は下記へ集約する。

## q007 声を返す壁

依頼人: 酒場のミレ。地域: 1。いつでも受注できる。

地下の壁から亡夫の声が聞こえると噂されている。声の主を確かめてください。

モデル: 1.1。実装: [JSON](../../../data/quests/q007.json)。場面 5、結末 3。物語状態の改訂 1。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・給金箱の水路・B2 (`region_1_canal_c`) / (5, 1) / イベント `q007_clue_a`。[ダンジョン定義](../../../data/dungeons.json)。声を返す壁：現場の痕跡。現地イベント。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・棺の待避場・B2 (`region_1_lower_landing`) / (3, 3) / イベント `q007_clue_b`。[ダンジョン定義](../../../data/dungeons.json)。声を返す壁：記録と証言。現地イベント。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・棺の待避場・B2 (`region_1_lower_landing`) / (5, 3) / イベント `q007_decision`。[ダンジョン定義](../../../data/dungeons.json)。声を返す壁：決着の場。現地イベント。

固定された過去: ミレの夫は亡くなっている。遺品を整理した夫の弟は、兄が渡せなかった手紙を見つけたが、自分が届ければミレに拒まれることを恐れた。弟は廃番所の伝声室から手紙を読み、兄に似た自分の声を故人の話し方へ寄せて、壁越しにミレへ聞かせていた。

AI向け注釈: 以下の事実はq007を成立させる世界設定上の制約だ。これらを台詞、説明、選択肢としてシナリオへ直接反映する必要はない。ただし、生成・改稿時に矛盾させてはいけない。

世界設定上の事実:

酒場の壁と廃番所は、かつて地下警備に使われた伝声管でつながっている。管は音だけを運び、人が通れる大きさではない。廃番所へは別の保守通路から到達できる。

兄弟は声質が似ており、伝声管による反響と歪みが違いを分かりにくくしている。弟は兄の手紙を読んでいるため内容の一部を知っているが、手紙にない問いへ故人として正確に答えることはできない。

手紙は夫が生前に書いた原本で、弟が保持している。声の応答、手紙の受け渡し、弟との対面は、それぞれ別の出来事だ。

進行: 手紙にない問いへの返答を手掛かりに、声の主を調べる。保守通路で弟と手紙を見つけた後も、手紙の受け渡しと双方の同意を得た面会を分ける。

### q007 実体と初期の所在

実体: party (`party`)。初期の所在・保持者: 地下室の伝声口 (`port`)。

実体: ミレ (`mire`)。初期の所在・保持者: 地下室の伝声口 (`port`)。

実体: ミレの夫の弟 (`brother`)。初期の所在・保持者: 廃番所の伝声室 (`booth`)。

実体: letters (`letters`)。初期の所在・保持者: ミレの夫の弟 (`brother`)。

実体: pipe (`pipe`)。初期の所在・保持者: 地下室の伝声口 (`port`)。

### q007 / entry — 地下室の伝声口

実装場面: `q007.v11.entry`。

イベントID: `q007-S-entry`。

登場: ミレ。

壁の伝声口から、亡くなった夫の声がした。ミレは返事を待っている。横の点検札には、保守通路が廃番所へ続くと書かれていた。

選択 `reply`: 故人だけが知る出来事をミレに尋ね、その問いを壁へ返す

行為: `entry_reply`。

進行先: [`voice`](#q007--voice--地下室の伝声口)。

選択 `trace`: ミレにここで待ってもらい、保守通路をたどる

行為: `entry_trace`。

進行先: [`booth`](#q007--booth--廃番所の伝声室)。

選択 `seal`: 声を聞き続けるかミレへ尋ね、本人の同意を得て伝声口を塞ぐ

行為: `entry_seal`。

進行先: [結末 `contract`](#q007-結末-contract--同意を得て伝声口を塞ぐ)。

### q007 / voice — 地下室の伝声口

実装場面: `q007.v11.voice`。

イベントID: `q007-S-voice`。

登場: ミレ。

ミレが教えた出来事を問うと、壁の向こうは黙った。しばらくして、先ほどと同じ言葉を読み直すような声がした。「あの話を、あの人が忘れるはずないのに」。ミレは伝声口を見つめている。

選択 `walk`: 問いへの返答を手掛かりに、保守通路から声の主を訪ねる

行為: `voice_walk`。

進行先: [`booth`](#q007--booth--廃番所の伝声室)。

選択 `seal`: ミレの意思を確かめ、この声のやり取りを終える

行為: `voice_seal`。

進行先: [結末 `contract`](#q007-結末-contract--同意を得て伝声口を塞ぐ)。

### q007 / booth — 廃番所の伝声室

実装場面: `q007.v11.booth`。

イベントID: `q007-S-booth`。

登場: ミレの夫の弟。

伝声室で夫の弟が手紙を握っていた。「遺品から見つけたんです。僕が届けても、受け取ってもらえないと思って」。兄に似た声で原本を読んでいたと認めた。手紙を届けることには同意したが、会うかどうかはミレにも確かめる必要がある。

選択 `letters`: 弟が声の主であることと手紙の差出人を確認し、原本を預かってミレへ戻る

行為: `booth_letters`。

進行先: [`letters`](#q007--letters--地下室の伝声口)。

### q007 / letters — 地下室の伝声口

実装場面: `q007.v11.letters`。

イベントID: `q007-S-letters`。

登場: ミレ・ミレの夫の弟（遠隔会話）。

ミレの夫の弟の会話条件: `{"op":"eq","left":{"ref":"stories.q007.values.pipeOpen"},"right":true}`

ミレは夫の筆跡を確かめ、手紙を読み終えた。弟が壁の向こうで読んでいたと伝えると、管へ向かって「今度は、自分の言葉で話して」と言った。返事が届いても、二人が会うと決まったわけではない。

選択 `meet`: ミレと弟の双方に面会の意思を確かめ、弟を迎えに行く

行為: `letters_meet`。

進行先: [`meeting`](#q007--meeting--地下室の伝声口)。

選択 `finish`: 手紙の受け渡しで区切り、面会は強いない

行為: `letters_finish`。

進行先: [結末 `compromise`](#q007-結末-compromise--手紙だけを届ける)。

### q007 / meeting — 地下室の伝声口

実装場面: `q007.v11.meeting`。

イベントID: `q007-S-meeting`。

登場: ミレ・ミレの夫の弟。

弟は伝声口の外で、初めて自分の声で謝った。ミレは手紙を閉じた。「返事を決めるのは、私にさせて」。

選択 `finish`: 二人の面会を見届け、その場を離れる

行為: `meeting_finish`。

進行先: [結末 `informed`](#q007-結末-informed--手紙を渡し同意した二人を会わせる)。

### q007 結末 informed — 手紙を渡し、同意した二人を会わせる

イベントID: `q007-E-informed`。

ミレは夫の手紙を受け取り、弟は保守通路を歩いて彼女の前へ出た。双方が望んだ面会は成立したが、弟の行為を許すか、今後も関係を続けるかまでは決まっていない。

57G / 68EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q007.values.delivered"},"right":true},{"op":"eq","left":{"ref":"stories.q007.values.met"},"right":true},{"op":"eq","left":{"ref":"stories.q007.values.mireConsent"},"right":true},{"op":"eq","left":{"ref":"stories.q007.values.brotherConsent"},"right":true},{"op":"eq","left":{"ref":"stories.q007.values.brotherAt"},"right":"port"}]}`

### q007 結末 contract — 同意を得て伝声口を塞ぐ

イベントID: `q007-E-contract`。

ミレが声を聞かないことを選び、伝声口を塞いだ。声は止まった。弟と手紙は廃番所に残り、手紙の受け渡しも二人の対面も成立していない。

77G / 47EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q007.values.sealed"},"right":true},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q007.values.pipeOpen"},"right":true}},{"op":"eq","left":{"ref":"stories.q007.values.mireConsent"},"right":true},{"op":"eq","left":{"ref":"stories.q007.values.lettersAt"},"right":"brother"}]}`

### q007 結末 compromise — 手紙だけを届ける

イベントID: `q007-E-compromise`。

弟から夫の手紙を預かってミレへ届け、弟が声の主だったことも伝えた。弟は廃番所に残った。対面を強いず、返事を決める時間をミレに渡した。

37G / 51EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q007.values.delivered"},"right":true},{"op":"eq","left":{"ref":"stories.q007.values.lettersAt"},"right":"mire"},{"op":"eq","left":{"ref":"stories.q007.values.brotherAt"},"right":"booth"},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q007.values.met"},"right":true}}]}`

## 状態項目と初期値

`partyAt`：party の所在または保持者。型 `enum`、初期値 `"port"`、許容値 `["port","corridor","booth"]`。

`mireAt`：mire の所在または保持者。型 `enum`、初期値 `"port"`、許容値 `["port","corridor","booth"]`。

`brotherAt`：brother の所在または保持者。型 `enum`、初期値 `"booth"`、許容値 `["port","corridor","booth"]`。

`lettersAt`：letters の所在または保持者。型 `enum`、初期値 `"brother"`、許容値 `["port","corridor","booth","party","mire","brother","pipe"]`。

`pipeAt`：pipe の所在または保持者。型 `enum`、初期値 `"port"`、許容値 `["port","corridor","booth","party","mire","brother","letters"]`。

`voiceKnown`：voiceKnown。型 `boolean`、初期値 `false`。

`mireConsent`：mireConsent。型 `boolean`、初期値 `false`。

`brotherConsent`：brotherConsent。型 `boolean`、初期値 `false`。

`lettersConsent`：lettersConsent。型 `boolean`、初期値 `false`。

`sealed`：sealed。型 `boolean`、初期値 `false`。

`met`：met。型 `boolean`、初期値 `false`。

`delivered`：delivered。型 `boolean`、初期値 `false`。

`pipeOpen`：pipeOpen。型 `boolean`、初期値 `true`。

## 行為の条件と状態変化

本文の選択と行為IDを対応させ、効果を実行順で記す。条件式は配布JSONの値。資材・所持金不足では支払いも受け渡しも確定しない。実移動では出発効果と到着効果を分ける。

### 行為 entry_reply

[q007-S-entry](#q007--entry--地下室の伝声口) → [q007-S-voice](#q007--voice--地下室の伝声口)。条件 `true`。費用：なし。一度だけ確定する。

認識獲得：探索隊 (`party`) が 伝声管 (`pipe`) から `unanswered`（声は故人だけが知る出来事への問いに答えなかった）を知る。観察条件 `{"op":"eq","left":{"ref":"stories.q007.values.pipeOpen"},"right":true}`。

### 行為 entry_trace

[q007-S-entry](#q007--entry--地下室の伝声口) → [q007-S-booth](#q007--booth--廃番所の伝声室)。条件 `true`。費用：なし。一度だけ確定する。

移動：探索隊 (`party`)。地下室の伝声口 (`port`) → 保守通路 (`corridor`) → 廃番所の伝声室 (`booth`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

認識獲得：探索隊 (`party`) が ミレの夫の弟 (`brother`) から `voice`（夫の声をまねていたのは、その弟）を知る。観察条件 `true`。

認識獲得：探索隊 (`party`) が 故人の手紙の原本 (`letters`) から `letters`（弟は故人の手紙を預かっていた）を知る。観察条件 `true`。

状態更新：`voiceKnown` = `true`。

### 行為 entry_seal

[q007-S-entry](#q007--entry--地下室の伝声口) → [q007-E-contract](#q007-結末-contract--同意を得て伝声口を塞ぐ)。条件 `true`。費用：なし。一度だけ確定する。

状態更新：`mireConsent` = `true`。

状態更新：`pipeOpen` = `false`。

状態更新：`sealed` = `true`。

### 行為 voice_walk

[q007-S-voice](#q007--voice--地下室の伝声口) → [q007-S-booth](#q007--booth--廃番所の伝声室)。条件 `true`。費用：なし。一度だけ確定する。

移動：探索隊 (`party`)。地下室の伝声口 (`port`) → 保守通路 (`corridor`) → 廃番所の伝声室 (`booth`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

認識獲得：探索隊 (`party`) が ミレの夫の弟 (`brother`) から `voice`（夫の声をまねていたのは、その弟）を知る。観察条件 `true`。

認識獲得：探索隊 (`party`) が 故人の手紙の原本 (`letters`) から `letters`（弟は故人の手紙を預かっていた）を知る。観察条件 `true`。

状態更新：`voiceKnown` = `true`。

### 行為 voice_seal

[q007-S-voice](#q007--voice--地下室の伝声口) → [q007-E-contract](#q007-結末-contract--同意を得て伝声口を塞ぐ)。条件 `true`。費用：なし。一度だけ確定する。

状態更新：`mireConsent` = `true`。

状態更新：`pipeOpen` = `false`。

状態更新：`sealed` = `true`。

### 行為 booth_letters

[q007-S-booth](#q007--booth--廃番所の伝声室) → [q007-S-letters](#q007--letters--地下室の伝声口)。条件 `true`。費用：なし。一度だけ確定する。

状態更新：`lettersConsent` = `true`。

受け渡し：故人の手紙の原本 (`letters`) を ミレの夫の弟 (`brother`) から 探索隊 (`party`) へ。

移動：探索隊 (`party`)。廃番所の伝声室 (`booth`) → 保守通路 (`corridor`) → 地下室の伝声口 (`port`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：故人の手紙の原本 (`letters`) を 探索隊 (`party`) から ミレ (`mire`) へ。

状態更新：`delivered` = `true`。

### 行為 letters_meet

[q007-S-letters](#q007--letters--地下室の伝声口) → [q007-S-meeting](#q007--meeting--地下室の伝声口)。条件 `true`。費用：なし。一度だけ確定する。

状態更新：`mireConsent` = `true`。

状態更新：`brotherConsent` = `true`。

移動：探索隊 (`party`)。地下室の伝声口 (`port`) → 保守通路 (`corridor`) → 廃番所の伝声室 (`booth`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

移動：探索隊 (`party`)・ミレの夫の弟 (`brother`)。廃番所の伝声室 (`booth`) → 保守通路 (`corridor`) → 地下室の伝声口 (`port`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`met` = `true`。

### 行為 letters_finish

[q007-S-letters](#q007--letters--地下室の伝声口) → [q007-E-compromise](#q007-結末-compromise--手紙だけを届ける)。条件 `true`。費用：なし。一度だけ確定する。

追加の状態更新なし。上記の進行先へ移る。

### 行為 meeting_finish

[q007-S-meeting](#q007--meeting--地下室の伝声口) → [q007-E-informed](#q007-結末-informed--手紙を渡し同意した二人を会わせる)。条件 `true`。費用：なし。一度だけ確定する。

追加の状態更新なし。上記の進行先へ移る。

## 資材不足・戦闘後の再開・保存

現行の作業別資材不足ルートはない。条件付きの選択肢と行為条件は本編全文・行為一覧を参照する。

共通の中断選択肢はない。メッセージ・判断の途中で閉じた場合は通常の保存位置から再開する。戦闘の逃走・敗北後は本編記載の継続命令に従い、勝利後の作業・費用を先に確定しない。q001固有の老人遭遇への巻戻しを、この依頼にも実装済みとは扱わない。

## 編集時の確認事項

ミレを伝声口に待たせたまま保守通路から伝声室へ行き、原本を持って戻る経路を維持する。

遠隔会話の成立条件と管の開閉を照合する。片方だけの同意で対面へ進めない。

封鎖後に弟と手紙がミレの元へ移動したことにしない。対面する経路では弟を迎え、保守通路を通って同行させる。

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
    "id": "q007_clue_a",
    "title": "声を返す壁：現場の痕跡",
    "points": [
      {
        "map": "region_1_canal_c",
        "x": 5,
        "y": 1,
        "dungeon": "region_1"
      }
    ],
    "kind": "clue",
    "trigger": "interact",
    "safe": true,
    "script": "q007.clue_a",
    "role": "clue_a",
    "visibleWhen": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q007.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "flags.legacyQuestRoutes.q007"
          },
          "right": true
        }
      ]
    },
    "dungeon": "region_1"
  },
  {
    "id": "q007_clue_b",
    "title": "声を返す壁：記録と証言",
    "points": [
      {
        "map": "region_1_lower_landing",
        "x": 3,
        "y": 3,
        "dungeon": "region_1"
      }
    ],
    "kind": "clue",
    "trigger": "interact",
    "safe": true,
    "script": "q007.clue_b",
    "role": "clue_b",
    "visibleWhen": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q007.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "flags.legacyQuestRoutes.q007"
          },
          "right": true
        }
      ]
    },
    "dungeon": "region_1"
  },
  {
    "id": "q007_decision",
    "title": "声を返す壁：決着の場",
    "points": [
      {
        "map": "region_1_lower_landing",
        "x": 5,
        "y": 3,
        "dungeon": "region_1"
      }
    ],
    "kind": "decision",
    "trigger": "interact",
    "safe": true,
    "script": "q007.v11.visit",
    "role": "decision",
    "visibleWhen": {
      "op": "or",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q007.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "quests.q007.stage"
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
    "port": "地下室の伝声口",
    "corridor": "保守通路",
    "booth": "廃番所の伝声室"
  },
  "connections": [
    [
      "port",
      "corridor"
    ],
    [
      "corridor",
      "booth"
    ]
  ],
  "registry": {
    "partyAt": {
      "type": "enum",
      "initial": "port",
      "values": [
        "port",
        "corridor",
        "booth"
      ],
      "meaning": "party の所在または保持者"
    },
    "mireAt": {
      "type": "enum",
      "initial": "port",
      "values": [
        "port",
        "corridor",
        "booth"
      ],
      "meaning": "mire の所在または保持者"
    },
    "brotherAt": {
      "type": "enum",
      "initial": "booth",
      "values": [
        "port",
        "corridor",
        "booth"
      ],
      "meaning": "brother の所在または保持者"
    },
    "lettersAt": {
      "type": "enum",
      "initial": "brother",
      "values": [
        "port",
        "corridor",
        "booth",
        "party",
        "mire",
        "brother",
        "pipe"
      ],
      "meaning": "letters の所在または保持者"
    },
    "pipeAt": {
      "type": "enum",
      "initial": "port",
      "values": [
        "port",
        "corridor",
        "booth",
        "party",
        "mire",
        "brother",
        "letters"
      ],
      "meaning": "pipe の所在または保持者"
    },
    "voiceKnown": {
      "type": "boolean",
      "initial": false,
      "meaning": "voiceKnown"
    },
    "mireConsent": {
      "type": "boolean",
      "initial": false,
      "meaning": "mireConsent"
    },
    "brotherConsent": {
      "type": "boolean",
      "initial": false,
      "meaning": "brotherConsent"
    },
    "lettersConsent": {
      "type": "boolean",
      "initial": false,
      "meaning": "lettersConsent"
    },
    "sealed": {
      "type": "boolean",
      "initial": false,
      "meaning": "sealed"
    },
    "met": {
      "type": "boolean",
      "initial": false,
      "meaning": "met"
    },
    "delivered": {
      "type": "boolean",
      "initial": false,
      "meaning": "delivered"
    },
    "pipeOpen": {
      "type": "boolean",
      "initial": true,
      "meaning": "pipeOpen"
    }
  },
  "entities": {
    "party": {
      "holder": "partyAt",
      "kind": "group"
    },
    "mire": {
      "holder": "mireAt",
      "kind": "person",
      "character": "mire"
    },
    "brother": {
      "holder": "brotherAt",
      "kind": "person",
      "character": "brother"
    },
    "letters": {
      "holder": "lettersAt",
      "kind": "item"
    },
    "pipe": {
      "holder": "pipeAt",
      "kind": "item"
    }
  },
  "propositions": {
    "unanswered": {
      "text": "声は故人だけが知る出来事への問いに答えなかった"
    },
    "voice": {
      "text": "夫の声をまねていたのは、その弟"
    },
    "letters": {
      "text": "弟は故人の手紙を預かっていた"
    }
  },
  "initialKnowledge": {},
  "invariants": [],
  "scenes": {
    "entry": {
      "title": "地下室の伝声口",
      "place": "port",
      "cast": [
        {
          "entity": "mire"
        }
      ],
      "requires": true
    },
    "voice": {
      "title": "地下室の伝声口",
      "place": "port",
      "cast": [
        {
          "entity": "mire"
        }
      ],
      "requires": true
    },
    "booth": {
      "title": "廃番所の伝声室",
      "place": "booth",
      "cast": [
        {
          "entity": "brother"
        }
      ],
      "requires": true
    },
    "letters": {
      "title": "地下室の伝声口",
      "place": "port",
      "cast": [
        {
          "entity": "mire"
        },
        {
          "entity": "brother",
          "mode": "remote",
          "requires": {
            "op": "eq",
            "left": {
              "ref": "stories.q007.values.pipeOpen"
            },
            "right": true
          }
        }
      ],
      "requires": true
    },
    "meeting": {
      "title": "地下室の伝声口",
      "place": "port",
      "cast": [
        {
          "entity": "mire"
        },
        {
          "entity": "brother"
        }
      ],
      "requires": true
    }
  },
  "actions": {
    "entry_reply": {
      "from": [
        "entry"
      ],
      "to": "voice",
      "requires": true,
      "effects": [
        {
          "op": "observe",
          "observer": "party",
          "proposition": "unanswered",
          "source": "pipe",
          "requires": {
            "op": "eq",
            "left": {
              "ref": "stories.q007.values.pipeOpen"
            },
            "right": true
          }
        }
      ],
      "once": true
    },
    "entry_trace": {
      "from": [
        "entry"
      ],
      "to": "booth",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "port",
            "corridor",
            "booth"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "voice",
          "source": "brother",
          "requires": true
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "letters",
          "source": "letters",
          "requires": true
        },
        {
          "op": "set",
          "key": "voiceKnown",
          "value": true
        }
      ],
      "once": true
    },
    "entry_seal": {
      "from": [
        "entry"
      ],
      "ending": "contract",
      "requires": true,
      "effects": [
        {
          "op": "set",
          "key": "mireConsent",
          "value": true
        },
        {
          "op": "set",
          "key": "pipeOpen",
          "value": false
        },
        {
          "op": "set",
          "key": "sealed",
          "value": true
        }
      ],
      "once": true
    },
    "voice_walk": {
      "from": [
        "voice"
      ],
      "to": "booth",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "port",
            "corridor",
            "booth"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "voice",
          "source": "brother",
          "requires": true
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "letters",
          "source": "letters",
          "requires": true
        },
        {
          "op": "set",
          "key": "voiceKnown",
          "value": true
        }
      ],
      "once": true
    },
    "voice_seal": {
      "from": [
        "voice"
      ],
      "ending": "contract",
      "requires": true,
      "effects": [
        {
          "op": "set",
          "key": "mireConsent",
          "value": true
        },
        {
          "op": "set",
          "key": "pipeOpen",
          "value": false
        },
        {
          "op": "set",
          "key": "sealed",
          "value": true
        }
      ],
      "once": true
    },
    "booth_letters": {
      "from": [
        "booth"
      ],
      "to": "letters",
      "requires": true,
      "effects": [
        {
          "op": "set",
          "key": "lettersConsent",
          "value": true
        },
        {
          "op": "transfer",
          "entity": "letters",
          "from": "brother",
          "to": "party"
        },
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "booth",
            "corridor",
            "port"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "letters",
          "from": "party",
          "to": "mire"
        },
        {
          "op": "set",
          "key": "delivered",
          "value": true
        }
      ],
      "once": true
    },
    "letters_meet": {
      "from": [
        "letters"
      ],
      "to": "meeting",
      "requires": true,
      "effects": [
        {
          "op": "set",
          "key": "mireConsent",
          "value": true
        },
        {
          "op": "set",
          "key": "brotherConsent",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "port",
            "corridor",
            "booth"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "brother"
          ],
          "path": [
            "booth",
            "corridor",
            "port"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "met",
          "value": true
        }
      ],
      "once": true
    },
    "letters_finish": {
      "from": [
        "letters"
      ],
      "ending": "compromise",
      "requires": true,
      "effects": [],
      "once": true
    },
    "meeting_finish": {
      "from": [
        "meeting"
      ],
      "ending": "informed",
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
          "op": "eq",
          "left": {
            "ref": "stories.q007.values.delivered"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q007.values.met"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q007.values.mireConsent"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q007.values.brotherConsent"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q007.values.brotherAt"
          },
          "right": "port"
        }
      ]
    },
    "contract": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "stories.q007.values.sealed"
          },
          "right": true
        },
        {
          "op": "not",
          "arg": {
            "op": "eq",
            "left": {
              "ref": "stories.q007.values.pipeOpen"
            },
            "right": true
          }
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q007.values.mireConsent"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q007.values.lettersAt"
          },
          "right": "brother"
        }
      ]
    },
    "compromise": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "stories.q007.values.delivered"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q007.values.lettersAt"
          },
          "right": "mire"
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q007.values.brotherAt"
          },
          "right": "booth"
        },
        {
          "op": "not",
          "arg": {
            "op": "eq",
            "left": {
              "ref": "stories.q007.values.met"
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

本編は [authoring/stories-v11-2.mjs](../../../authoring/stories-v11-2.mjs)、配置は [config/quests/q007.events.json](../../../config/quests/q007.events.json)、配布内容は [data/quests/q007.json](../../../data/quests/q007.json)。地形は [config/connected-maps.json](../../../config/connected-maps.json)、接続・給排水は [config/dungeons/region_1.json](../../../config/dungeons/region_1.json)、施設は [config/locations.json](../../../config/locations.json) を参照する。

解説と確認観点は [authoring/quest-page-notes.mjs](../../../authoring/quest-page-notes.mjs)、ページ構成は [tools/quest-page-details.mjs](../../../tools/quest-page-details.mjs) を編集する。本文を手直しする場合は物語原稿へ反映し、`npm run build:scenarios` で配布データも更新する。文書だけの再生成は `npm run build:catalog`、照合は `npm run check:docs`。`npm run build:docs` 単独は個別ページの本文を保持する。
