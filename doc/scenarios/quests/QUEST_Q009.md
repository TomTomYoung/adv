# q009 鼠の避難路：詳細・配置・状態変化

[個別ページ一覧](README.md) ／ [カタログへ戻る](../QUEST_CATALOG.md#q009-鼠の避難路) ／ [シナリオ本文](#q009-鼠の避難路) ／ [行為の条件と状態変化](#行為の条件と状態変化) ／ [配置イベント](#配置イベントと操作条件)

作品版 1.25.0。配布JSONから生成した作者向けページ。真相と結末を含む。本編3場面・3結末。

<!-- quest-page-source:a91a81b8c75ffc91ff332517fcaaf3827d52c11e475db0a37f5d654154b9b2f2 -->

## 依頼の焦点と分岐の意味

鼠の移動を見て崩落を疑うところから始まるが、原因は広い区画で同時に行われた石灰清掃である。鼠は穀倉の外室におり、内扉の向こうの穀物へはまだ入っていない。

旧図・支柱・亀裂・地下水位の比較で、この区画の構造を調べる。清掃区画と穀倉を往復し、今後の清掃分散と現在の侵入口封鎖を組み合わせる。

informedは構造確認、原因把握、清掃区画・時期の合意、鼠の誘導後の穴の封鎖、最後の照合を必要とする。撒いた石灰を合意だけで消去しない。

contractは外室の群れを追い払う。compromiseは共同倉庫の受入れと数量を確認して穀物を移す。未調査の崩落危険や清掃原因まで解決したことにはしない。

## 実装範囲と場所

現地イベントの配置と物語状態は実装済み。ただし worldPlaces と story.journey は未定義で、行為内の move は物語上の所在変更である。本文にある施設や通路を実際に歩いて到達する方式には未接続。以下の物語内経路を実マップの座標や移動完了と読み替えない。

`junction`：鼠の集まる分岐。物語上の場所。個別の実座標・施設IDは未割当。

`work`：清掃区画。物語上の場所。個別の実座標・施設IDは未割当。

`granary`：穀倉の外室。物語上の場所。個別の実座標・施設IDは未割当。

`store`：共同倉庫。物語上の場所。個別の実座標・施設IDは未割当。

### 物語内の接続

鼠の集まる分岐 (`junction`) ↔ 清掃区画 (`work`)。

鼠の集まる分岐 (`junction`) ↔ 穀倉の外室 (`granary`)。

穀倉の外室 (`granary`) ↔ 共同倉庫 (`store`)。

## 人物・物品と認識

探索隊 (`party`)：集団。初期の所在・保持者は 鼠の集まる分岐 (`junction`)、保存項目は `partyAt`。

エダ (`eda`)：人物。初期の所在・保持者は 鼠の集まる分岐 (`junction`)、保存項目は `edaAt`。地下測量士。鼠の異変と構造物の危険を切り分ける。

清掃係 (`cleaners`)：集団。初期の所在・保持者は 清掃区画 (`work`)、保存項目は `cleanersAt`。石灰消毒の担当者。担当区画を清潔に保つ。

穀倉番 (`storekeeper`)：人物。初期の所在・保持者は 穀倉の外室 (`granary`)、保存項目は `storekeeperAt`。穀物庫の管理者。鼠から穀物を守る。

共同倉庫の受入れ係 (`clerks`)：集団。初期の所在・保持者は 共同倉庫 (`store`)、保存項目は `clerksAt`。数量と配分の記録担当。搬入数と出庫先を公開して管理する。

鼠の群れ (`rats`)：集団。初期の所在・保持者は 穀倉の外室 (`granary`)、保存項目は `ratsAt`。

穀物 (`grain`)：物品。初期の所在・保持者は 穀倉の外室 (`granary`)、保存項目は `grainAt`。

旧図 (`plans`)：物品。初期の所在・保持者は エダ (`eda`)、保存項目は `plansAt`。

支柱 (`pillars`)：物品。初期の所在・保持者は 鼠の集まる分岐 (`junction`)、保存項目は `pillarsAt`。

認識 `plans`：旧図に残された測点と地下水位を確認した。

認識 `structure`：旧図・支柱の測点・亀裂・地下水位を比較し、この区画には新しい変位がないと確認した。

認識 `cause`：一斉に行った石灰清掃が餌場と巣の臭いを失わせ、鼠を穀倉へ追い出した。

初期認識：`{}`。固定された過去と探索隊がすでに知る情報は別に扱い、observeの成立で認識を加える。

## 本編の進行とイベントID

本編場面は `q009-S-場面キー`、配置は `q009-P-配置キー`、結末は `q009-E-結末キー`。S・P・Eは文書用の識別子。Fは強制戦闘、Bは戦闘中イベントで、命令に明示されたidがあればそれを使い、ない戦闘には文書用IDを付ける。全10IDが一意で、場面を並べ替えても変わらない。

[q009-S-entry](#q009--entry--鼠の集まる分岐)：鼠の集まる分岐。物語内の場所 `junction`。

選択 `trace`：旧図、支柱、亀裂、地下水位を比較し、石灰の跡を清掃区画へ追う → [q009-S-work](#q009--work--清掃区画)。行為 [`entry_trace`](#行為-entry_trace)。

選択 `hunt`：穀倉の外室で群れを追い払い、内扉を守る → [q009-E-contract](#q009-結末-contract--穀倉前の群れを追い払う)。行為 [`entry_hunt`](#行為-entry_hunt)。戦闘勝利後に行為を確定する。

選択 `move`：穀倉へ行き、共同倉庫への避難搬送を手配する → [q009-S-granary](#q009--granary--穀倉の外室)。行為 [`entry_move`](#行為-entry_move)。

[q009-S-work](#q009--work--清掃区画)：清掃区画。物語内の場所 `work`。

選択 `zones`：清掃係と次回以降の区画と時期を分ける合意をする → [q009-S-work](#q009--work--清掃区画)。行為 [`work_zones`](#行為-work_zones)。

選択 `granary`：鼠の移動経路をたどり、穀倉の侵入口を確かめに行く → [q009-S-granary](#q009--granary--穀倉の外室)。行為 [`work_granary`](#行為-work_granary)。

[q009-S-granary](#q009--granary--穀倉の外室)：穀倉の外室。物語内の場所 `granary`。

選択 `holes`：外室の鼠を別方向へ誘導してから侵入口を塞ぐ → [q009-S-granary](#q009--granary--穀倉の外室)。行為 [`granary_holes`](#行為-granary_holes)。

選択 `work`：清掃係へ戻り、区画と時期の分け方を決める → [q009-S-work](#q009--work--清掃区画)。行為 [`granary_work`](#行為-granary_work)。

選択 `verify`：構造確認、清掃の合意、侵入口の封鎖を照合する → [q009-E-informed](#q009-結末-informed--清掃範囲と鼠の入口を分ける)。行為 [`granary_verify`](#行為-granary_verify)。

選択 `grain`：共同倉庫の受入れを確認し、穀物を運び込む → [q009-E-compromise](#q009-結末-compromise--穀物を共同倉庫へ移す)。行為 [`granary_grain`](#行為-granary_grain)。

強制戦闘：`q009-F-entry-hunt-guard_1`。起動位置と勝敗後の継続は、下記の本編全文のbattle.startを展開した箇所に掲載する。

## 配置イベントと操作条件

配置が保存されていることと、通常プレイで表示されることは同じではない。表示条件・操作条件は別々に評価する。legacyQuestRoutesを要する配置は旧経路用で、現行本編の必須経路へ数えない。

### q009-P-clue_a

鼠の避難路：現場の痕跡。実行ID `q009_clue_a`、起動 `interact`、スクリプト `q009.clue_a`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・棺の待避場・B2 (`region_1_lower_landing`) / (7, 1) / イベント `q009_clue_a`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"and","args":[{"op":"eq","left":{"ref":"quests.q009.stage"},"right":"active"},{"op":"eq","left":{"ref":"flags.legacyQuestRoutes.q009"},"right":true}]}`。操作条件：`true`。

<details>
<summary>この配置の実行スクリプト</summary>

```json
{
  "commands": [
    {
      "op": "narrate",
      "text": "天井の亀裂は古く、足元の白い粉だけが新しいままだ。"
    },
    {
      "op": "quest.evidence",
      "quest": "q009",
      "key": "clue_a",
      "text": "天井の亀裂は古く、足元の白い粉だけが新しいままだ。"
    }
  ]
}
```

</details>

### q009-P-clue_b

鼠の避難路：記録と証言。実行ID `q009_clue_b`、起動 `interact`、スクリプト `q009.clue_b`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・避難水路・B2 (`region_1_canal_d`) / (4, 1) / イベント `q009_clue_b`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"and","args":[{"op":"eq","left":{"ref":"quests.q009.stage"},"right":"active"},{"op":"eq","left":{"ref":"flags.legacyQuestRoutes.q009"},"right":true}]}`。操作条件：`true`。

<details>
<summary>この配置の実行スクリプト</summary>

```json
{
  "commands": [
    {
      "op": "say",
      "name": "地下測量士のエダ",
      "text": "鼠の足跡は出口全部でなく、穀物庫につながる一本へ集中しています。"
    },
    {
      "op": "quest.evidence",
      "quest": "q009",
      "key": "clue_b",
      "text": "鼠の足跡は出口全部でなく、穀物庫につながる一本へ集中している。"
    }
  ]
}
```

</details>

### q009-P-decision

鼠の避難路：決着の場。実行ID `q009_decision`、起動 `interact`、スクリプト `q009.v11.visit`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・奥の水門詰所・B2 (`region_1_gatehouse`) / (5, 1) / イベント `q009_decision`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"or","args":[{"op":"eq","left":{"ref":"quests.q009.stage"},"right":"active"},{"op":"eq","left":{"ref":"quests.q009.stage"},"right":"completed"}]}`。操作条件：`true`。

物語の現在場面・補給後の再開先を呼び出す入口。本編全文は下記へ集約する。

## q009 鼠の避難路

依頼人: 地下測量士のエダ。地域: 1。いつでも受注できる。

鼠が一斉に地下から地上へ逃げた。崩落の前触れか、別の原因があるのか確かめてください。

モデル: 1.1。実装: [JSON](../../../data/quests/q009.json)。場面 3、結末 3。物語状態の改訂 1。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・棺の待避場・B2 (`region_1_lower_landing`) / (7, 1) / イベント `q009_clue_a`。[ダンジョン定義](../../../data/dungeons.json)。鼠の避難路：現場の痕跡。現地イベント。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・避難水路・B2 (`region_1_canal_d`) / (4, 1) / イベント `q009_clue_b`。[ダンジョン定義](../../../data/dungeons.json)。鼠の避難路：記録と証言。現地イベント。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・下層・奥の水門詰所・B2 (`region_1_gatehouse`) / (5, 1) / イベント `q009_decision`。[ダンジョン定義](../../../data/dungeons.json)。鼠の避難路：決着の場。現地イベント。

固定された過去: 清掃組合が石灰を使った清掃を広い区画で同時に行い、鼠は餌場と巣の臭いを失った。追い出された群れは地上の穀倉へ移動したが、穀倉番が内扉を閉めており、穀物のある室内へはまだ入っていない。鼠の移動と崩落は無関係である。

AI向け注釈: 以下の事実はq009を成立させる世界設定上の制約だ。これらを台詞、説明、選択肢としてシナリオへ直接反映する必要はない。ただし、生成・改稿時に矛盾させてはいけない。

世界設定上の事実:

この地域では、鼠が一斉に地上へ逃げる現象は、落石、空気の流れの変化、地下水の上昇に先行することがあり、崩落警戒の根拠の一つとされている。ただし、鼠の移動だけでは崩落を確定できない。

崩落の有無は、測量士が残した旧図、支柱の測点、亀裂、地下水位を比較して判断する。本件の区画には新しい変位がない。

石灰清掃を区画ごとに時期をずらせば、鼠を一方向へ一斉に追い出さず、罠と封鎖によって移動先を制御できる。穀倉の外室と穀物庫は内扉で分かれている。

進行: 崩落の確認、清掃時期の分散、鼠の侵入口封鎖、穀物移送を独立した状態として扱う。作業順を変えても、実施済みの作業だけを結果へ引き継ぐ。

### q009 実体と初期の所在

実体: party (`party`)。初期の所在・保持者: 鼠の集まる分岐 (`junction`)。

実体: エダ (`eda`)。初期の所在・保持者: 鼠の集まる分岐 (`junction`)。

実体: 清掃係 (`cleaners`)。初期の所在・保持者: 清掃区画 (`work`)。

実体: 穀倉番 (`storekeeper`)。初期の所在・保持者: 穀倉の外室 (`granary`)。

実体: 共同倉庫の受入れ係 (`clerks`)。初期の所在・保持者: 共同倉庫 (`store`)。

実体: rats (`rats`)。初期の所在・保持者: 穀倉の外室 (`granary`)。

実体: grain (`grain`)。初期の所在・保持者: 穀倉の外室 (`granary`)。

実体: plans (`plans`)。初期の所在・保持者: エダ (`eda`)。

実体: pillars (`pillars`)。初期の所在・保持者: 鼠の集まる分岐 (`junction`)。

### q009 / entry — 鼠の集まる分岐

実装場面: `q009.v11.entry`。

イベントID: `q009-S-entry`。

登場: エダ。

エダは鼠の流れを見て「崩れる前触れか」と尋ねた。穀倉番からは、内扉を閉じて持ちこたえていると連絡が来ている。

選択 `trace`: 旧図、支柱、亀裂、地下水位を比較し、石灰の跡を清掃区画へ追う

行為: `entry_trace`。

進行先: [`work`](#q009--work--清掃区画)。

選択 `hunt`: 穀倉の外室で群れを追い払い、内扉を守る

必要事項: 戦闘・作業と消費は勝利時に確定。

強制戦闘: `guard_1`。

［勝利後］

行為: `entry_hunt`。

進行先: [結末 `contract`](#q009-結末-contract--穀倉前の群れを追い払う)。

［逃走後］

退路へ戻った。この作業の移動・受け渡し・支払いはまだ確定していない。

［敗北後］

現場から救援された。依頼を再開すると、未完了の作業からやり直せる。

［戦闘の継続ここまで］

選択 `move`: 穀倉へ行き、共同倉庫への避難搬送を手配する

行為: `entry_move`。

進行先: [`granary`](#q009--granary--穀倉の外室)。

### q009 / work — 清掃区画

実装場面: `q009.v11.work`。

イベントID: `q009-S-work`。

登場: 清掃係。

［条件 `{"op":"eq","left":{"ref":"stories.q009.values.zones"},"right":true}` が成立するとき］

清掃係は合意した区画表を保持している。すでに撒いた石灰は取り消せない。次回から清掃する区画と時期をずらし、鼠の移動先を罠と封鎖で制御する。

［それ以外］

清掃係は石灰の袋を見せた。「全部きれいにするように、と」。鼠を追い出した先は穀倉だった。

［条件分岐ここまで］

選択 `zones`: 清掃係と次回以降の区画と時期を分ける合意をする

選択条件: `{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q009.values.zones"},"right":true}}`

行為: `work_zones`。

行為の前提条件: `{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q009.values.zones"},"right":true}}`

進行先: [`work`](#q009--work--清掃区画)。

選択 `granary`: 鼠の移動経路をたどり、穀倉の侵入口を確かめに行く

行為: `work_granary`。

進行先: [`granary`](#q009--granary--穀倉の外室)。

### q009 / granary — 穀倉の外室

実装場面: `q009.v11.granary`。

イベントID: `q009-S-granary`。

登場: 穀倉番。

［条件 `{"op":"eq","left":{"ref":"stories.q009.values.holes"},"right":true}` が成立するとき］

外室への穴は塞いである。内扉は引き続き閉めている。

［それ以外］

鼠はまだ外室にいる。穀倉番は内扉を押さえ、穀物との間を守っている。

［条件分岐ここまで］

［条件 `{"op":"eq","left":{"ref":"stories.q009.values.zones"},"right":true}` が成立するとき］

次回からの清掃区画と時期の分散は合意済みだ。

［それ以外］

清掃範囲の合意はまだ取っていない。

［条件分岐ここまで］

選択 `holes`: 外室の鼠を別方向へ誘導してから侵入口を塞ぐ

選択条件: `{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q009.values.holes"},"right":true}}`

行為: `granary_holes`。

行為の前提条件: `{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q009.values.holes"},"right":true}}`

進行先: [`granary`](#q009--granary--穀倉の外室)。

選択 `work`: 清掃係へ戻り、区画と時期の分け方を決める

行為: `granary_work`。

進行先: [`work`](#q009--work--清掃区画)。

選択 `verify`: 構造確認、清掃の合意、侵入口の封鎖を照合する

必要事項: 清掃の区画分け・侵入口の封鎖。

選択条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q009.values.zones"},"right":true},{"op":"eq","left":{"ref":"stories.q009.values.holes"},"right":true}]}`

行為: `granary_verify`。

行為の前提条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q009.values.zones"},"right":true},{"op":"eq","left":{"ref":"stories.q009.values.holes"},"right":true}]}`

進行先: [結末 `informed`](#q009-結末-informed--清掃範囲と鼠の入口を分ける)。

選択 `grain`: 共同倉庫の受入れを確認し、穀物を運び込む

行為: `granary_grain`。

進行先: [結末 `compromise`](#q009-結末-compromise--穀物を共同倉庫へ移す)。

### q009 結末 informed — 清掃範囲と鼠の入口を分ける

イベントID: `q009-E-informed`。

旧図、支柱の測点、亀裂、地下水位を比較し、この区画に新しい変位がないことを確認した。石灰清掃が鼠を追い出した経路を突き止め、次回から清掃区画と時期を分け、穀倉の侵入口を塞いだ。この区画の崩落警戒は解除したが、他区画の安全までは断定していない。

57G / 68EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q009.values.structureChecked"},"right":true},{"op":"eq","left":{"ref":"stories.q009.values.causeKnown"},"right":true},{"op":"eq","left":{"ref":"stories.q009.values.zones"},"right":true},{"op":"eq","left":{"ref":"stories.q009.values.holes"},"right":true},{"op":"eq","left":{"ref":"stories.q009.values.verified"},"right":true}]}`

### q009 結末 contract — 穀倉前の群れを追い払う

イベントID: `q009-E-contract`。

外室の群れを追い払い、内扉の向こうの穀物を守った。鼠を一斉に追い出した清掃方法は変わらず、構造物の安全も調べていない。別の出口から群れが戻る可能性が残る。

77G / 47EXP

物語の結末条件: `{"op":"eq","left":{"ref":"stories.q009.values.hunted"},"right":true}`

### q009 結末 compromise — 穀物を共同倉庫へ移す

イベントID: `q009-E-compromise`。

受入れ係と数量を照合し、穀物を共同倉庫へ運び込んだ。共同の入出庫帳で、誰に配られたかが見えるようになった。穀物は当面守られたが、清掃方法、鼠の侵入口、崩落の有無は、実際に確認した範囲を超えて解決したことにはならない。

37G / 51EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q009.values.received"},"right":true},{"op":"eq","left":{"ref":"stories.q009.values.grainAt"},"right":"clerks"}]}`

## 状態項目と初期値

`partyAt`：party の所在または保持者。型 `enum`、初期値 `"junction"`、許容値 `["junction","work","granary","store"]`。

`edaAt`：eda の所在または保持者。型 `enum`、初期値 `"junction"`、許容値 `["junction","work","granary","store"]`。

`cleanersAt`：cleaners の所在または保持者。型 `enum`、初期値 `"work"`、許容値 `["junction","work","granary","store"]`。

`storekeeperAt`：storekeeper の所在または保持者。型 `enum`、初期値 `"granary"`、許容値 `["junction","work","granary","store"]`。

`clerksAt`：clerks の所在または保持者。型 `enum`、初期値 `"store"`、許容値 `["junction","work","granary","store"]`。

`ratsAt`：rats の所在または保持者。型 `enum`、初期値 `"granary"`、許容値 `["junction","work","granary","store"]`。

`grainAt`：grain の所在または保持者。型 `enum`、初期値 `"granary"`、許容値 `["junction","work","granary","store","party","eda","cleaners","storekeeper","clerks","rats","plans","pillars"]`。

`plansAt`：plans の所在または保持者。型 `enum`、初期値 `"eda"`、許容値 `["junction","work","granary","store","party","eda","cleaners","storekeeper","clerks","rats","grain","pillars"]`。

`pillarsAt`：pillars の所在または保持者。型 `enum`、初期値 `"junction"`、許容値 `["junction","work","granary","store","party","eda","cleaners","storekeeper","clerks","rats","grain","plans"]`。

`structureChecked`：structureChecked。型 `boolean`、初期値 `false`。

`causeKnown`：causeKnown。型 `boolean`、初期値 `false`。

`zones`：zones。型 `boolean`、初期値 `false`。

`holes`：holes。型 `boolean`、初期値 `false`。

`verified`：verified。型 `boolean`、初期値 `false`。

`hunted`：hunted。型 `boolean`、初期値 `false`。

`received`：received。型 `boolean`、初期値 `false`。

## 行為の条件と状態変化

本文の選択と行為IDを対応させ、効果を実行順で記す。条件式は配布JSONの値。資材・所持金不足では支払いも受け渡しも確定しない。実移動では出発効果と到着効果を分ける。

### 行為 entry_trace

[q009-S-entry](#q009--entry--鼠の集まる分岐) → [q009-S-work](#q009--work--清掃区画)。条件 `true`。費用：なし。一度だけ確定する。

認識獲得：探索隊 (`party`) が 旧図 (`plans`) から `plans`（旧図に残された測点と地下水位を確認した）を知る。観察条件 `true`。

認識獲得：探索隊 (`party`) が 支柱 (`pillars`) から `structure`（旧図・支柱の測点・亀裂・地下水位を比較し、この区画には新しい変位がないと確認した）を知る。観察条件 `{"op":"contains","left":{"ref":"stories.q009.knowledge.party"},"right":"plans"}`。

状態更新：`structureChecked` = `true`。

移動：探索隊 (`party`)。鼠の集まる分岐 (`junction`) → 清掃区画 (`work`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

認識獲得：探索隊 (`party`) が 清掃係 (`cleaners`) から `cause`（一斉に行った石灰清掃が餌場と巣の臭いを失わせ、鼠を穀倉へ追い出した）を知る。観察条件 `true`。

状態更新：`causeKnown` = `true`。

### 行為 entry_hunt

[q009-S-entry](#q009--entry--鼠の集まる分岐) → [q009-E-contract](#q009-結末-contract--穀倉前の群れを追い払う)。条件 `true`。費用：なし。一度だけ確定する。

移動：探索隊 (`party`)。鼠の集まる分岐 (`junction`) → 穀倉の外室 (`granary`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

移動：鼠の群れ (`rats`)。穀倉の外室 (`granary`) → 鼠の集まる分岐 (`junction`) → 清掃区画 (`work`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`hunted` = `true`。

### 行為 entry_move

[q009-S-entry](#q009--entry--鼠の集まる分岐) → [q009-S-granary](#q009--granary--穀倉の外室)。条件 `true`。費用：なし。一度だけ確定する。

移動：探索隊 (`party`)。鼠の集まる分岐 (`junction`) → 穀倉の外室 (`granary`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 work_zones

[q009-S-work](#q009--work--清掃区画) → [q009-S-work](#q009--work--清掃区画)。条件 `{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q009.values.zones"},"right":true}}`。費用：なし。一度だけ確定する。

状態更新：`zones` = `true`。

### 行為 work_granary

[q009-S-work](#q009--work--清掃区画) → [q009-S-granary](#q009--granary--穀倉の外室)。条件 `true`。費用：なし。条件を満たせば再実行可能。

移動：探索隊 (`party`)。清掃区画 (`work`) → 鼠の集まる分岐 (`junction`) → 穀倉の外室 (`granary`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 granary_holes

[q009-S-granary](#q009--granary--穀倉の外室) → [q009-S-granary](#q009--granary--穀倉の外室)。条件 `{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q009.values.holes"},"right":true}}`。費用：なし。一度だけ確定する。

移動：鼠の群れ (`rats`)。穀倉の外室 (`granary`) → 鼠の集まる分岐 (`junction`) → 清掃区画 (`work`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`holes` = `true`。

### 行為 granary_work

[q009-S-granary](#q009--granary--穀倉の外室) → [q009-S-work](#q009--work--清掃区画)。条件 `true`。費用：なし。条件を満たせば再実行可能。

移動：探索隊 (`party`)。穀倉の外室 (`granary`) → 鼠の集まる分岐 (`junction`) → 清掃区画 (`work`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

認識獲得：探索隊 (`party`) が 清掃係 (`cleaners`) から `cause`（一斉に行った石灰清掃が餌場と巣の臭いを失わせ、鼠を穀倉へ追い出した）を知る。観察条件 `true`。

状態更新：`causeKnown` = `true`。

### 行為 granary_verify

[q009-S-granary](#q009--granary--穀倉の外室) → [q009-E-informed](#q009-結末-informed--清掃範囲と鼠の入口を分ける)。条件 `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q009.values.zones"},"right":true},{"op":"eq","left":{"ref":"stories.q009.values.holes"},"right":true}]}`。費用：なし。一度だけ確定する。

移動：探索隊 (`party`)。穀倉の外室 (`granary`) → 鼠の集まる分岐 (`junction`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

認識獲得：探索隊 (`party`) が 旧図 (`plans`) から `plans`（旧図に残された測点と地下水位を確認した）を知る。観察条件 `true`。

認識獲得：探索隊 (`party`) が 支柱 (`pillars`) から `structure`（旧図・支柱の測点・亀裂・地下水位を比較し、この区画には新しい変位がないと確認した）を知る。観察条件 `{"op":"contains","left":{"ref":"stories.q009.knowledge.party"},"right":"plans"}`。

状態更新：`structureChecked` = `true`。

移動：探索隊 (`party`)。鼠の集まる分岐 (`junction`) → 清掃区画 (`work`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

認識獲得：探索隊 (`party`) が 清掃係 (`cleaners`) から `cause`（一斉に行った石灰清掃が餌場と巣の臭いを失わせ、鼠を穀倉へ追い出した）を知る。観察条件 `true`。

状態更新：`causeKnown` = `true`。

状態更新：`verified` = `true`。

### 行為 granary_grain

[q009-S-granary](#q009--granary--穀倉の外室) → [q009-E-compromise](#q009-結末-compromise--穀物を共同倉庫へ移す)。条件 `true`。費用：なし。一度だけ確定する。

移動：探索隊 (`party`)。穀倉の外室 (`granary`) → 共同倉庫 (`store`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

移動：探索隊 (`party`)・共同倉庫の受入れ係 (`clerks`)。共同倉庫 (`store`) → 穀倉の外室 (`granary`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：穀物 (`grain`) を 穀倉の外室 (`granary`) から 探索隊 (`party`) へ。

移動：探索隊 (`party`)・共同倉庫の受入れ係 (`clerks`)。穀倉の外室 (`granary`) → 共同倉庫 (`store`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：穀物 (`grain`) を 探索隊 (`party`) から 共同倉庫の受入れ係 (`clerks`) へ。

状態更新：`received` = `true`。

## 資材不足・戦闘後の再開・保存

現行の作業別資材不足ルートはない。条件付きの選択肢と行為条件は本編全文・行為一覧を参照する。

共通の中断選択肢はない。メッセージ・判断の途中で閉じた場合は通常の保存位置から再開する。戦闘の逃走・敗北後は本編記載の継続命令に従い、勝利後の作業・費用を先に確定しない。q001固有の老人遭遇への巻戻しを、この依頼にも実装済みとは扱わない。

## 編集時の確認事項

zonesとholesの作業順を変えても、完了済みの作業が再実行されず、必要な照合が抜けない。

構造を調べる経路と直接穀倉へ向かう経路を区別し、結末条件が未調査事項を補ってしまわないことを確認する。

分岐・清掃区画・穀倉・共同倉庫を接続し、穀物を搬出するだけでなく受入れ係への受け渡しまで扱う。

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
    "id": "q009_clue_a",
    "title": "鼠の避難路：現場の痕跡",
    "points": [
      {
        "map": "region_1_lower_landing",
        "x": 7,
        "y": 1,
        "dungeon": "region_1"
      }
    ],
    "kind": "clue",
    "trigger": "interact",
    "safe": true,
    "script": "q009.clue_a",
    "role": "clue_a",
    "visibleWhen": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q009.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "flags.legacyQuestRoutes.q009"
          },
          "right": true
        }
      ]
    },
    "dungeon": "region_1"
  },
  {
    "id": "q009_clue_b",
    "title": "鼠の避難路：記録と証言",
    "points": [
      {
        "map": "region_1_canal_d",
        "x": 4,
        "y": 1,
        "dungeon": "region_1"
      }
    ],
    "kind": "clue",
    "trigger": "interact",
    "safe": true,
    "script": "q009.clue_b",
    "role": "clue_b",
    "visibleWhen": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q009.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "flags.legacyQuestRoutes.q009"
          },
          "right": true
        }
      ]
    },
    "dungeon": "region_1"
  },
  {
    "id": "q009_decision",
    "title": "鼠の避難路：決着の場",
    "points": [
      {
        "map": "region_1_gatehouse",
        "x": 5,
        "y": 1,
        "dungeon": "region_1"
      }
    ],
    "kind": "decision",
    "trigger": "interact",
    "safe": true,
    "script": "q009.v11.visit",
    "role": "decision",
    "visibleWhen": {
      "op": "or",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q009.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "quests.q009.stage"
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
    "junction": "鼠の集まる分岐",
    "work": "清掃区画",
    "granary": "穀倉の外室",
    "store": "共同倉庫"
  },
  "connections": [
    [
      "junction",
      "work"
    ],
    [
      "junction",
      "granary"
    ],
    [
      "granary",
      "store"
    ]
  ],
  "registry": {
    "partyAt": {
      "type": "enum",
      "initial": "junction",
      "values": [
        "junction",
        "work",
        "granary",
        "store"
      ],
      "meaning": "party の所在または保持者"
    },
    "edaAt": {
      "type": "enum",
      "initial": "junction",
      "values": [
        "junction",
        "work",
        "granary",
        "store"
      ],
      "meaning": "eda の所在または保持者"
    },
    "cleanersAt": {
      "type": "enum",
      "initial": "work",
      "values": [
        "junction",
        "work",
        "granary",
        "store"
      ],
      "meaning": "cleaners の所在または保持者"
    },
    "storekeeperAt": {
      "type": "enum",
      "initial": "granary",
      "values": [
        "junction",
        "work",
        "granary",
        "store"
      ],
      "meaning": "storekeeper の所在または保持者"
    },
    "clerksAt": {
      "type": "enum",
      "initial": "store",
      "values": [
        "junction",
        "work",
        "granary",
        "store"
      ],
      "meaning": "clerks の所在または保持者"
    },
    "ratsAt": {
      "type": "enum",
      "initial": "granary",
      "values": [
        "junction",
        "work",
        "granary",
        "store"
      ],
      "meaning": "rats の所在または保持者"
    },
    "grainAt": {
      "type": "enum",
      "initial": "granary",
      "values": [
        "junction",
        "work",
        "granary",
        "store",
        "party",
        "eda",
        "cleaners",
        "storekeeper",
        "clerks",
        "rats",
        "plans",
        "pillars"
      ],
      "meaning": "grain の所在または保持者"
    },
    "plansAt": {
      "type": "enum",
      "initial": "eda",
      "values": [
        "junction",
        "work",
        "granary",
        "store",
        "party",
        "eda",
        "cleaners",
        "storekeeper",
        "clerks",
        "rats",
        "grain",
        "pillars"
      ],
      "meaning": "plans の所在または保持者"
    },
    "pillarsAt": {
      "type": "enum",
      "initial": "junction",
      "values": [
        "junction",
        "work",
        "granary",
        "store",
        "party",
        "eda",
        "cleaners",
        "storekeeper",
        "clerks",
        "rats",
        "grain",
        "plans"
      ],
      "meaning": "pillars の所在または保持者"
    },
    "structureChecked": {
      "type": "boolean",
      "initial": false,
      "meaning": "structureChecked"
    },
    "causeKnown": {
      "type": "boolean",
      "initial": false,
      "meaning": "causeKnown"
    },
    "zones": {
      "type": "boolean",
      "initial": false,
      "meaning": "zones"
    },
    "holes": {
      "type": "boolean",
      "initial": false,
      "meaning": "holes"
    },
    "verified": {
      "type": "boolean",
      "initial": false,
      "meaning": "verified"
    },
    "hunted": {
      "type": "boolean",
      "initial": false,
      "meaning": "hunted"
    },
    "received": {
      "type": "boolean",
      "initial": false,
      "meaning": "received"
    }
  },
  "entities": {
    "party": {
      "holder": "partyAt",
      "kind": "group"
    },
    "eda": {
      "holder": "edaAt",
      "kind": "person",
      "character": "eda"
    },
    "cleaners": {
      "holder": "cleanersAt",
      "kind": "group",
      "character": "cleaners"
    },
    "storekeeper": {
      "holder": "storekeeperAt",
      "kind": "person",
      "character": "storekeeper"
    },
    "clerks": {
      "holder": "clerksAt",
      "kind": "group",
      "character": "clerks"
    },
    "rats": {
      "holder": "ratsAt",
      "kind": "group"
    },
    "grain": {
      "holder": "grainAt",
      "kind": "item"
    },
    "plans": {
      "holder": "plansAt",
      "kind": "item"
    },
    "pillars": {
      "holder": "pillarsAt",
      "kind": "item"
    }
  },
  "propositions": {
    "plans": {
      "text": "旧図に残された測点と地下水位を確認した"
    },
    "structure": {
      "text": "旧図・支柱の測点・亀裂・地下水位を比較し、この区画には新しい変位がないと確認した"
    },
    "cause": {
      "text": "一斉に行った石灰清掃が餌場と巣の臭いを失わせ、鼠を穀倉へ追い出した"
    }
  },
  "initialKnowledge": {},
  "invariants": [],
  "scenes": {
    "entry": {
      "title": "鼠の集まる分岐",
      "place": "junction",
      "cast": [
        {
          "entity": "eda"
        }
      ],
      "requires": true
    },
    "work": {
      "title": "清掃区画",
      "place": "work",
      "cast": [
        {
          "entity": "cleaners"
        }
      ],
      "requires": true
    },
    "granary": {
      "title": "穀倉の外室",
      "place": "granary",
      "cast": [
        {
          "entity": "storekeeper"
        }
      ],
      "requires": true
    }
  },
  "actions": {
    "entry_trace": {
      "from": [
        "entry"
      ],
      "to": "work",
      "requires": true,
      "effects": [
        {
          "op": "observe",
          "observer": "party",
          "proposition": "plans",
          "source": "plans",
          "requires": true
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "structure",
          "source": "pillars",
          "requires": {
            "op": "contains",
            "left": {
              "ref": "stories.q009.knowledge.party"
            },
            "right": "plans"
          }
        },
        {
          "op": "set",
          "key": "structureChecked",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "junction",
            "work"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "cause",
          "source": "cleaners",
          "requires": true
        },
        {
          "op": "set",
          "key": "causeKnown",
          "value": true
        }
      ],
      "once": true
    },
    "entry_hunt": {
      "from": [
        "entry"
      ],
      "ending": "contract",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "junction",
            "granary"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "move",
          "entities": [
            "rats"
          ],
          "path": [
            "granary",
            "junction",
            "work"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "hunted",
          "value": true
        }
      ],
      "once": true
    },
    "entry_move": {
      "from": [
        "entry"
      ],
      "to": "granary",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "junction",
            "granary"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true
    },
    "work_zones": {
      "from": [
        "work"
      ],
      "to": "work",
      "requires": {
        "op": "not",
        "arg": {
          "op": "eq",
          "left": {
            "ref": "stories.q009.values.zones"
          },
          "right": true
        }
      },
      "effects": [
        {
          "op": "set",
          "key": "zones",
          "value": true
        }
      ],
      "once": true
    },
    "work_granary": {
      "from": [
        "work"
      ],
      "to": "granary",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "work",
            "junction",
            "granary"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": false
    },
    "granary_holes": {
      "from": [
        "granary"
      ],
      "to": "granary",
      "requires": {
        "op": "not",
        "arg": {
          "op": "eq",
          "left": {
            "ref": "stories.q009.values.holes"
          },
          "right": true
        }
      },
      "effects": [
        {
          "op": "move",
          "entities": [
            "rats"
          ],
          "path": [
            "granary",
            "junction",
            "work"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "holes",
          "value": true
        }
      ],
      "once": true
    },
    "granary_work": {
      "from": [
        "granary"
      ],
      "to": "work",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "granary",
            "junction",
            "work"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "cause",
          "source": "cleaners",
          "requires": true
        },
        {
          "op": "set",
          "key": "causeKnown",
          "value": true
        }
      ],
      "once": false
    },
    "granary_verify": {
      "from": [
        "granary"
      ],
      "ending": "informed",
      "requires": {
        "op": "and",
        "args": [
          {
            "op": "eq",
            "left": {
              "ref": "stories.q009.values.zones"
            },
            "right": true
          },
          {
            "op": "eq",
            "left": {
              "ref": "stories.q009.values.holes"
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
            "granary",
            "junction"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "plans",
          "source": "plans",
          "requires": true
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "structure",
          "source": "pillars",
          "requires": {
            "op": "contains",
            "left": {
              "ref": "stories.q009.knowledge.party"
            },
            "right": "plans"
          }
        },
        {
          "op": "set",
          "key": "structureChecked",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "junction",
            "work"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "cause",
          "source": "cleaners",
          "requires": true
        },
        {
          "op": "set",
          "key": "causeKnown",
          "value": true
        },
        {
          "op": "set",
          "key": "verified",
          "value": true
        }
      ],
      "once": true
    },
    "granary_grain": {
      "from": [
        "granary"
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
            "granary",
            "store"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "clerks"
          ],
          "path": [
            "store",
            "granary"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "grain",
          "from": "granary",
          "to": "party"
        },
        {
          "op": "move",
          "entities": [
            "party",
            "clerks"
          ],
          "path": [
            "granary",
            "store"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "grain",
          "from": "party",
          "to": "clerks"
        },
        {
          "op": "set",
          "key": "received",
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
            "ref": "stories.q009.values.structureChecked"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q009.values.causeKnown"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q009.values.zones"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q009.values.holes"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q009.values.verified"
          },
          "right": true
        }
      ]
    },
    "contract": {
      "op": "eq",
      "left": {
        "ref": "stories.q009.values.hunted"
      },
      "right": true
    },
    "compromise": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "stories.q009.values.received"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q009.values.grainAt"
          },
          "right": "clerks"
        }
      ]
    }
  }
}
```

</details>

## 編集元と再生成

本編は [authoring/stories-v11-2.mjs](../../../authoring/stories-v11-2.mjs)、配置は [config/quests/q009.events.json](../../../config/quests/q009.events.json)、配布内容は [data/quests/q009.json](../../../data/quests/q009.json)。地形は [config/connected-maps.json](../../../config/connected-maps.json)、接続・給排水は [config/dungeons/region_1.json](../../../config/dungeons/region_1.json)、施設は [config/locations.json](../../../config/locations.json) を参照する。

解説と確認観点は [authoring/quest-page-notes.mjs](../../../authoring/quest-page-notes.mjs)、ページ構成は [tools/quest-page-details.mjs](../../../tools/quest-page-details.mjs) を編集する。本文を手直しする場合は物語原稿へ反映し、`npm run build:scenarios` で配布データも更新する。文書だけの再生成は `npm run build:catalog`、照合は `npm run check:docs`。`npm run build:docs` 単独は個別ページの本文を保持する。
