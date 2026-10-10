# q004 二枚目の通行証：詳細・配置・状態変化

[個別ページ一覧](README.md) ／ [カタログへ戻る](../QUEST_CATALOG.md#q004-二枚目の通行証) ／ [シナリオ本文](#q004-二枚目の通行証) ／ [行為の条件と状態変化](#行為の条件と状態変化) ／ [配置イベント](#配置イベントと操作条件)

作品版 1.25.0。配布JSONから生成した作者向けページ。真相と結末を含む。本編14場面・3結末。

<!-- quest-page-source:bdd6071950c2ab42bcc45b634be698a0e0dbb5742544bee777be5e569b67b5b0 -->

## 依頼の焦点と分岐の意味

姉妹の同じ資格番号の使用と、関所番による亡兄の勤務名義の使用を照合する。二枚の紙を持っていることと、二人に資格があることを区別する。

正規審査は公開窓口→地上の住民登録照会→地下で本人確認と三人の同意→地上で申告→審査官と地下へ戻る→仮証と釈放→外へ退出、の順で進める。

罰金20Gでは姉妹の違反だけを処理する。番人の名義問題を知った後でも選べるが、三人の資格審査が済んだことにはならない。

強行救出は留置室前での戦闘勝利後に釈放と番号取消を確定する。姉の救出、原本の保持者、外への退避を別に追う。

## 実装範囲と場所

9本の移動行為を実装済み。選択時は出発の処理だけを確定し、目的のセル・施設へ実際に到着して場面を続ける。同行者と運搬物、移動中の保存を扱う。

`outside`：関所の外。灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (13, 5) / イベント `q004_decision`。[ダンジョン定義](../../../data/dungeons.json)。

`desk`：公開窓口。地下関所の詰所 (`waterway_checkpoint`)。[ロケーション定義](../../../data/locations.json)。

`cell`：留置室。詰所・留置室前 (`waterway_checkpoint_holding`)。[ロケーション定義](../../../data/locations.json)。

`office`：地上の審査窓口。通行資格審査所 (`hikarigaeri_pass_registry`)。[ロケーション定義](../../../data/locations.json)。

`transit`：移動中（現在地はワールド状態）。移動中を示す内部状態。固定セルではない。

地下関所の入退室・審査往復は [q004実移動の補足](../Q004_WORLD_ROUTE.md) を参照する。kindがtownの場所でも、waterway_checkpointは町の広場から直接入る施設ではなく地下の戸口につながる室内である。

### 物語内の接続

関所の外 (`outside`) ↔ 公開窓口 (`desk`)。

公開窓口 (`desk`) ↔ 留置室 (`cell`)。

関所の外 (`outside`) ↔ 地上の審査窓口 (`office`)。

移動中（現在地はワールド状態） (`transit`) ↔ 関所の外 (`outside`)。

移動中（現在地はワールド状態） (`transit`) ↔ 公開窓口 (`desk`)。

移動中（現在地はワールド状態） (`transit`) ↔ 留置室 (`cell`)。

移動中（現在地はワールド状態） (`transit`) ↔ 地上の審査窓口 (`office`)。

## 人物・物品と認識

探索隊 (`party`)：集団。初期の所在・保持者は 関所の外 (`outside`)、保存項目は `partyAt`。

イナ (`ina`)：人物。初期の所在・保持者は 関所の外 (`outside`)、保存項目は `inaAt`。見習い冒険者。関所に留置された姉を助ける。

イナの姉 (`sister`)：人物。初期の所在・保持者は 留置室 (`cell`)、保存項目は `sisterAt`。留置された通行者。妹を守り、自分も外へ戻る。

関所番 (`keeper`)：人物。初期の所在・保持者は 公開窓口 (`desk`)、保存項目は `keeperAt`。地下関所の係員。兄の名で続けた勤務を失いたくない。

名義審査官 (`reviewer`)：人物。初期の所在・保持者は 地上の審査窓口 (`office`)、保存項目は `reviewerAt`。地上の資格審査担当。本人と資格名義を照合する。

通行証の原本 (`original`)：物品。初期の所在・保持者は 関所番 (`keeper`)、保存項目は `originalAt`。

通行証の写し (`copy`)：物品。初期の所在・保持者は イナ (`ina`)、保存項目は `copyAt`。

通行・勤務の記録 (`register`)：物品。初期の所在・保持者は 関所番 (`keeper`)、保存項目は `registerAt`。

認識 `shared`：イナが姉の写しで先に入場し、後から同じ番号の原本を提示した姉が拘束された。

認識 `duty`：勤務簿には関所番が申告した勤務名義がある。

認識 `resident`：別管理の住民登録簿では、その名義人は死亡している。

認識 `brother`：関所番は死んだ兄の名義を使っている。

初期認識：`{}`。固定された過去と探索隊がすでに知る情報は別に扱い、observeの成立で認識を加える。

## 本編の進行とイベントID

本編場面は `q004-S-場面キー`、配置は `q004-P-配置キー`、結末は `q004-E-結末キー`。S・P・Eは文書用の識別子。Fは強制戦闘、Bは戦闘中イベントで、命令に明示されたidがあればそれを使い、ない戦闘には文書用IDを付ける。全19IDが一意で、場面を並べ替えても変わらない。

[q004-S-entry](#q004--entry--関所の外)：関所の外。物語内の場所 `outside`。

選択 `window`：イナと詰所へ入り、二枚の通行証を照合する → [q004-S-duplicate](#q004--duplicate--公開窓口)。行為 [`entry_window`](#行為-entry_window)。出発後に実到着を待つ。

選択 `force`：詰所へ入り、奥の留置室へ向かう → [q004-S-force_entry](#q004--force_entry--留置室)。行為 [`entry_force`](#行為-entry_force)。出発後に実到着を待つ。

[q004-S-duplicate](#q004--duplicate--公開窓口)：公開窓口。物語内の場所 `desk`。

選択 `fine`：複製を認め、窓口で罰金を納めて姉を引き取る → [q004-S-fine_release](#q004--fine_release--公開窓口)。行為 [`duplicate_fine`](#行為-duplicate_fine)。

選択 `inspect`：番人の勤務名義を控え、地上の通行資格審査所へ向かう → [q004-S-registry](#q004--registry--地上の審査窓口)。行為 [`duplicate_inspect`](#行為-duplicate_inspect)。出発後に実到着を待つ。

[q004-S-registry](#q004--registry--地上の審査窓口)：地上の審査窓口。物語内の場所 `office`。

選択 `return`：死亡記録の写しを携え、地下の詰所へ戻る → [q004-S-consent](#q004--consent--公開窓口)。行為 [`registry_return`](#行為-registry_return)。出発後に実到着を待つ。

[q004-S-consent](#q004--consent--公開窓口)：公開窓口。物語内の場所 `desk`。

選択 `file`：三人に不利益を説明して同意を取り、地上へ申告に行く → [q004-S-filing](#q004--filing--地上の審査窓口)。行為 [`consent_file`](#行為-consent_file)。出発後に実到着を待つ。

選択 `fine`：姉妹の違反だけを処理し、窓口で罰金を納める → [q004-S-fine_release](#q004--fine_release--公開窓口)。行為 [`consent_fine`](#行為-consent_fine)。

[q004-S-filing](#q004--filing--地上の審査窓口)：地上の審査窓口。物語内の場所 `office`。

選択 `submit`：申告書を提出し、地下関所での現場確認を依頼する → [q004-S-escort](#q004--escort--地上の審査窓口)。行為 [`filing_submit`](#行為-filing_submit)。

[q004-S-escort](#q004--escort--地上の審査窓口)：地上の審査窓口。物語内の場所 `office`。

選択 `accompany`：審査官と地下水道を歩き、詰所へ戻る → [q004-S-review](#q004--review--公開窓口)。行為 [`escort_accompany`](#行為-escort_accompany)。出発後に実到着を待つ。

[q004-S-review](#q004--review--公開窓口)：公開窓口。物語内の場所 `desk`。

選択 `issue`：証書を提出し、別々の仮証の発行と姉の釈放を見届ける → [q004-S-issued](#q004--issued--公開窓口)。行為 [`review_issue`](#行為-review_issue)。

[q004-S-issued](#q004--issued--公開窓口)：公開窓口。物語内の場所 `desk`。

選択 `leave`：姉妹と詰所を出て、関所の外へ戻る → [q004-S-issued_outside](#q004--issued_outside--関所の外)。行為 [`issued_leave`](#行為-issued_leave)。出発後に実到着を待つ。

[q004-S-issued_outside](#q004--issued_outside--関所の外)：関所の外。物語内の場所 `outside`。

選択 `finish`：二人の帰路を確かめ、依頼を終える → [q004-E-informed](#q004-結末-informed--三人の名義を審査へ戻す)。行為 [`issued_outside_finish`](#行為-issued_outside_finish)。

[q004-S-fine_release](#q004--fine_release--公開窓口)：公開窓口。物語内の場所 `desk`。

選択 `leave`：姉妹と詰所を出て、関所の外へ戻る → [q004-S-fine_outside](#q004--fine_outside--関所の外)。行為 [`fine_release_leave`](#行為-fine_release_leave)。出発後に実到着を待つ。

[q004-S-fine_outside](#q004--fine_outside--関所の外)：関所の外。物語内の場所 `outside`。

選択 `finish`：姉の原本と二人の帰路を確かめ、依頼を終える → [q004-E-compromise](#q004-結末-compromise--罰金で留置を解く)。行為 [`fine_outside_finish`](#行為-fine_outside_finish)。

[q004-S-force_entry](#q004--force_entry--留置室)：留置室。物語内の場所 `cell`。

選択 `break`：錠を破り、駆けつけた番人を退ける → [q004-S-force_freed](#q004--force_freed--留置室)。行為 [`force_entry_break`](#行為-force_entry_break)。戦闘勝利後に行為を確定する。

[q004-S-force_freed](#q004--force_freed--留置室)：留置室。物語内の場所 `cell`。

選択 `escort`：姉を連れて受付を抜け、関所の外へ戻る → [q004-S-force_outside](#q004--force_outside--関所の外)。行為 [`force_freed_escort`](#行為-force_freed_escort)。出発後に実到着を待つ。

[q004-S-force_outside](#q004--force_outside--関所の外)：関所の外。物語内の場所 `outside`。

選択 `finish`：姉妹の安全を確かめ、依頼を終える → [q004-E-contract](#q004-結末-contract--錠を破って姉を連れ出す)。行為 [`force_outside_finish`](#行為-force_outside_finish)。

強制戦闘：`q004-F-force_entry-break-guard_1`。起動位置と勝敗後の継続は、下記の本編全文のbattle.startを展開した箇所に掲載する。

## 配置イベントと操作条件

配置が保存されていることと、通常プレイで表示されることは同じではない。表示条件・操作条件は別々に評価する。legacyQuestRoutesを要する配置は旧経路用で、現行本編の必須経路へ数えない。

### q004-P-decision

関所の外で待つイナ。実行ID `q004_decision`、起動 `interact`、スクリプト `q004.v11.visit`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (13, 5) / イベント `q004_decision`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"or","args":[{"op":"eq","left":{"ref":"quests.q004.stage"},"right":"active"},{"op":"eq","left":{"ref":"quests.q004.stage"},"right":"completed"}]}`。操作条件：`true`。

物語の現在場面・補給後の再開先を呼び出す入口。本編全文は下記へ集約する。

## q004 二枚目の通行証

依頼人: 見習い冒険者のイナ。地域: 1。いつでも受注できる。

地下関所で姉が拘束された。姉とイナが持つ通行証には、同じ番号が記されている。

モデル: 1.1。実装: [JSON](../../../data/quests/q004.json)。場面 14、結末 3。物語状態の改訂 2。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (13, 5) / イベント `q004_decision`。[ダンジョン定義](../../../data/dungeons.json)。関所の外で待つイナ。現地イベント。

参照施設: `desk` → 地下関所の詰所 (`waterway_checkpoint`)。[ロケーション定義](../../../data/locations.json)。

参照施設: `cell` → 詰所・留置室前 (`waterway_checkpoint_holding`)。[ロケーション定義](../../../data/locations.json)。

参照施設: `office` → 通行資格審査所 (`hikarigaeri_pass_registry`)。[ロケーション定義](../../../data/locations.json)。

固定された過去: 地下通行資格を持つのは姉だけだった。資格取得前のイナは姉の通行証を写し、姉妹は同じ番号の証を別々に使用した。イナが写しで入場した後、姉が原本を提示したため、同じ番号が同時に使われたと判定され、姉が拘束された。関所番もまた、住民登録上は死亡している兄の就業資格を使って勤務している。

AI向け注釈: 以下の事実はq004を成立させる世界設定上の制約だ。これらを台詞、説明、選択肢としてシナリオへ直接反映する必要はない。ただし、生成・改稿時に矛盾させてはいけない。

世界設定上の事実:

地下通行証は一つの資格と一人の名義に対応し、関所では番号ごとに入退場を記録する。同じ番号の人物が地下にいる間、その番号を使った二人目は通過できない。

イナの持つ証は姉の原本を写した複製だ。イナが先に通過したため、後から原本を提示した姉がその場で拘束された。

関所の通行記録、勤務簿、住民登録簿は別々に管理されている。そのため、関所番が死亡した兄の名義で勤務している事実は、勤務簿だけを見ても発覚しない。

進行: 二枚の通行証と入退場記録から姉の拘束理由を確かめる。番人の勤務名義を住民登録簿まで照合した場合だけ、三人の資格問題を同じ審査へ戻せる。

### q004 実体と初期の所在

実体: party (`party`)。初期の所在・保持者: 関所の外 (`outside`)。

実体: イナ (`ina`)。初期の所在・保持者: 関所の外 (`outside`)。

実体: イナの姉 (`sister`)。初期の所在・保持者: 留置室 (`cell`)。

実体: 関所番 (`keeper`)。初期の所在・保持者: 公開窓口 (`desk`)。

実体: 名義審査官 (`reviewer`)。初期の所在・保持者: 地上の審査窓口 (`office`)。

実体: original (`original`)。初期の所在・保持者: 関所番 (`keeper`)。

実体: copy (`copy`)。初期の所在・保持者: イナ (`ina`)。

実体: register (`register`)。初期の所在・保持者: 関所番 (`keeper`)。

### q004 / entry — 関所の外

実装場面: `q004.v11.entry`。

イベントID: `q004-S-entry`。

場面の現在地: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (13, 5) / イベント `q004_decision`。[ダンジョン定義](../../../data/dungeons.json)。

登場: イナ。

イナは姉の通行証を写した紙を見せた。「先に入ったのは私です。後から来た姉が捕まったと聞いて、引き返してきました」。水路脇の戸口が詰所だ。原本は番人に押収され、姉は奥の留置室にいる。

選択 `window`: イナと詰所へ入り、二枚の通行証を照合する

出発: `entry_window`。移動先: 地下関所の詰所 (`waterway_checkpoint`)。[ロケーション定義](../../../data/locations.json)。

この選択は出発処理だけを確定します。町では目的の施設へ入り、ダンジョンでは目的セルを踏むと自動で [`duplicate`](#q004--duplicate--公開窓口) へ進み、到着時の処理を確定します。

選択 `force`: 詰所へ入り、奥の留置室へ向かう

出発: `entry_force`。移動先: 詰所・留置室前 (`waterway_checkpoint_holding`)。[ロケーション定義](../../../data/locations.json)。

この選択は出発処理だけを確定します。町では目的の施設へ入り、ダンジョンでは目的セルを踏むと自動で [`force_entry`](#q004--force_entry--留置室) へ進み、到着時の処理を確定します。

### q004 / duplicate — 公開窓口

実装場面: `q004.v11.duplicate`。

イベントID: `q004-S-duplicate`。

場面の現在地: 地下関所の詰所 (`waterway_checkpoint`)。[ロケーション定義](../../../data/locations.json)。

登場: イナ・関所番・イナの姉（遠隔会話）。

イナの姉の会話条件: `{"op":"eq","left":{"ref":"stories.q004.values.windowOpen"},"right":true}`

受付の入退場記録には、イナが写しで入場した時刻と、姉の原本が止められた時刻が続いていた。番人は同じ番号を指した。「一人が中にいる間、二人目は通せない」。面会窓の姉も複製を認める。勤務簿はここにあるが、住民登録簿は地上の通行資格審査所で別に管理されている。

選択 `fine`: 複製を認め、窓口で罰金を納めて姉を引き取る

必要事項: G 20消費。

行為: `duplicate_fine`。

成立時の消費: `{"gold":20}`。

進行先: [`fine_release`](#q004--fine_release--公開窓口)。

選択 `inspect`: 番人の勤務名義を控え、地上の通行資格審査所へ向かう

出発: `duplicate_inspect`。移動先: 通行資格審査所 (`hikarigaeri_pass_registry`)。[ロケーション定義](../../../data/locations.json)。

この選択は出発処理だけを確定します。町では目的の施設へ入り、ダンジョンでは目的セルを踏むと自動で [`registry`](#q004--registry--地上の審査窓口) へ進み、到着時の処理を確定します。

選択 `fine_supplies`: 20Gを用意しに戻る

表示条件: `{"op":"not","arg":{"op":"gte","left":{"ref":"gold"},"right":20}}`

選択条件: `{"op":"not","arg":{"op":"gte","left":{"ref":"gold"},"right":20}}`

20Gが足りない。この作業はまだ行っていない。必要な品と費用をそろえてから、ここで続けよう。

不足時は未着手のまま会話を終了。再訪時は `q004.v11.duplicate.fine.resume` を経て [`duplicate`](#q004--duplicate--公開窓口) から再開します。

### q004 / registry — 地上の審査窓口

実装場面: `q004.v11.registry`。

イベントID: `q004-S-registry`。

場面の現在地: 通行資格審査所 (`hikarigaeri_pass_registry`)。[ロケーション定義](../../../data/locations.json)。

登場: 名義審査官。

地上の審査窓口で、勤務簿から控えた名義を住民登録簿と照合した。記録上、その名義人はすでに死亡している。これだけでは、地下で働いている番人との関係までは分からない。本人に確かめる必要がある。

選択 `return`: 死亡記録の写しを携え、地下の詰所へ戻る

出発: `registry_return`。移動先: 地下関所の詰所 (`waterway_checkpoint`)。[ロケーション定義](../../../data/locations.json)。

この選択は出発処理だけを確定します。町では目的の施設へ入り、ダンジョンでは目的セルを踏むと自動で [`consent`](#q004--consent--公開窓口) へ進み、到着時の処理を確定します。

### q004 / consent — 公開窓口

実装場面: `q004.v11.consent`。

イベントID: `q004-S-consent`。

場面の現在地: 地下関所の詰所 (`waterway_checkpoint`)。[ロケーション定義](../../../data/locations.json)。

登場: イナ・関所番・イナの姉（遠隔会話）。

イナの姉の会話条件: `{"op":"eq","left":{"ref":"stories.q004.values.windowOpen"},"right":true}`

詰所へ戻り、住民登録簿の死亡記録を示すと、番人は兄の名で働いていると認めた。イナが面会窓の姉を見る。「私たちのことも、この人のことも、全部話すの？」。申告すれば、三人の資格と勤務が審査の対象になる。

選択 `file`: 三人に不利益を説明して同意を取り、地上へ申告に行く

選択条件: `{"op":"eq","left":{"ref":"stories.q004.values.truthKnown"},"right":true}`

出発: `consent_file`。移動先: 通行資格審査所 (`hikarigaeri_pass_registry`)。[ロケーション定義](../../../data/locations.json)。

出発の条件: `{"op":"eq","left":{"ref":"stories.q004.values.truthKnown"},"right":true}`

この選択は出発処理だけを確定します。町では目的の施設へ入り、ダンジョンでは目的セルを踏むと自動で [`filing`](#q004--filing--地上の審査窓口) へ進み、到着時の処理を確定します。

選択 `fine`: 姉妹の違反だけを処理し、窓口で罰金を納める

必要事項: G 20消費。

行為: `consent_fine`。

成立時の消費: `{"gold":20}`。

進行先: [`fine_release`](#q004--fine_release--公開窓口)。

選択 `fine_supplies`: 20Gを用意しに戻る

表示条件: `{"op":"not","arg":{"op":"gte","left":{"ref":"gold"},"right":20}}`

選択条件: `{"op":"not","arg":{"op":"gte","left":{"ref":"gold"},"right":20}}`

20Gが足りない。この作業はまだ行っていない。必要な品と費用をそろえてから、ここで続けよう。

不足時は未着手のまま会話を終了。再訪時は `q004.v11.consent.fine.resume` を経て [`consent`](#q004--consent--公開窓口) から再開します。

### q004 / filing — 地上の審査窓口

実装場面: `q004.v11.filing`。

イベントID: `q004-S-filing`。

場面の現在地: 通行資格審査所 (`hikarigaeri_pass_registry`)。[ロケーション定義](../../../data/locations.json)。

登場: 名義審査官。

審査窓口へ戻った。姉妹と番人の同意を得てきたが、申告はまだ提出していない。三人の名義と、地下に残る原本・写し・通行記録の所在を申告書に記す。

選択 `submit`: 申告書を提出し、地下関所での現場確認を依頼する

行為: `filing_submit`。

進行先: [`escort`](#q004--escort--地上の審査窓口)。

### q004 / escort — 地上の審査窓口

実装場面: `q004.v11.escort`。

イベントID: `q004-S-escort`。

場面の現在地: 通行資格審査所 (`hikarigaeri_pass_registry`)。[ロケーション定義](../../../data/locations.json)。

登場: 名義審査官。

審査官が申告を受理し、住民登録の記録を鞄に収めた。「現物と本人を、地下の窓口で確かめます」。姉妹と番人はまだ詰所にいる。

選択 `accompany`: 審査官と地下水道を歩き、詰所へ戻る

出発: `escort_accompany`。移動先: 地下関所の詰所 (`waterway_checkpoint`)。[ロケーション定義](../../../data/locations.json)。

この選択は出発処理だけを確定します。町では目的の施設へ入り、ダンジョンでは目的セルを踏むと自動で [`review`](#q004--review--公開窓口) へ進み、到着時の処理を確定します。

### q004 / review — 公開窓口

実装場面: `q004.v11.review`。

イベントID: `q004-S-review`。

場面の現在地: 地下関所の詰所 (`waterway_checkpoint`)。[ロケーション定義](../../../data/locations.json)。

登場: イナ・関所番・名義審査官・イナの姉（遠隔会話）。

イナの姉の会話条件: `{"op":"eq","left":{"ref":"stories.q004.values.windowOpen"},"right":true}`

審査官と詰所へ着いた。受付に通行記録、勤務簿、原本と写し、持参した住民登録の記録を並べる。姉は自分の資格を使い、イナはその写しを使った。番人の勤務名義は亡兄のものだった。

選択 `issue`: 証書を提出し、別々の仮証の発行と姉の釈放を見届ける

行為: `review_issue`。

進行先: [`issued`](#q004--issued--公開窓口)。

### q004 / issued — 公開窓口

実装場面: `q004.v11.issued`。

イベントID: `q004-S-issued`。

場面の現在地: 地下関所の詰所 (`waterway_checkpoint`)。[ロケーション定義](../../../data/locations.json)。

登場: イナ・イナの姉・関所番・名義審査官。

留置室の錠が開き、姉が受付へ出てきた。姉妹は別々の仮証を受け取り、元の証と写しは審査官が預かる。番人は勤務を止められ、審査官と詰所に残る。

選択 `leave`: 姉妹と詰所を出て、関所の外へ戻る

出発: `issued_leave`。移動先: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (13, 5) / イベント `q004_decision`。[ダンジョン定義](../../../data/dungeons.json)。

この選択は出発処理だけを確定します。町では目的の施設へ入り、ダンジョンでは目的セルを踏むと自動で [`issued_outside`](#q004--issued_outside--関所の外) へ進み、到着時の処理を確定します。

### q004 / issued_outside — 関所の外

実装場面: `q004.v11.issued_outside`。

イベントID: `q004-S-issued_outside`。

場面の現在地: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (13, 5) / イベント `q004_decision`。[ダンジョン定義](../../../data/dungeons.json)。

登場: イナ・イナの姉。

姉妹と関所の外へ戻った。二人の手には、それぞれ別の仮証がある。正式資格の審査はこれから続く。

選択 `finish`: 二人の帰路を確かめ、依頼を終える

行為: `issued_outside_finish`。

進行先: [結末 `informed`](#q004-結末-informed--三人の名義を審査へ戻す)。

### q004 / fine_release — 公開窓口

実装場面: `q004.v11.fine_release`。

イベントID: `q004-S-fine_release`。

場面の現在地: 地下関所の詰所 (`waterway_checkpoint`)。[ロケーション定義](../../../data/locations.json)。

登場: イナ・イナの姉・関所番。

罰金を納め、イナの写しを渡した。番人が留置室を開け、受付へ来た姉に原本を返す。有効な通行資格は、姉のもの一つだけだ。

選択 `leave`: 姉妹と詰所を出て、関所の外へ戻る

出発: `fine_release_leave`。移動先: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (13, 5) / イベント `q004_decision`。[ダンジョン定義](../../../data/dungeons.json)。

この選択は出発処理だけを確定します。町では目的の施設へ入り、ダンジョンでは目的セルを踏むと自動で [`fine_outside`](#q004--fine_outside--関所の外) へ進み、到着時の処理を確定します。

### q004 / fine_outside — 関所の外

実装場面: `q004.v11.fine_outside`。

イベントID: `q004-S-fine_outside`。

場面の現在地: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (13, 5) / イベント `q004_decision`。[ダンジョン定義](../../../data/dungeons.json)。

登場: イナ・イナの姉。

姉妹を連れて関所の外へ出た。イナの写しは窓口で回収された。二人が別々に地下へ通えるようになったわけではない。

選択 `finish`: 姉の原本と二人の帰路を確かめ、依頼を終える

行為: `fine_outside_finish`。

進行先: [結末 `compromise`](#q004-結末-compromise--罰金で留置を解く)。

### q004 / force_entry — 留置室

実装場面: `q004.v11.force_entry`。

イベントID: `q004-S-force_entry`。

場面の現在地: 詰所・留置室前 (`waterway_checkpoint_holding`)。[ロケーション定義](../../../data/locations.json)。

登場: イナの姉。

受付の奥、留置室の前まで来た。姉は鉄格子の向こうにいる。錠を破れば番人が駆けつける。押収された通行証の原本は、受付に残ったままだ。

選択 `break`: 錠を破り、駆けつけた番人を退ける

必要事項: 戦闘・作業と消費は勝利時に確定。

強制戦闘: `guard_1`。

［勝利後］

行為: `force_entry_break`。

進行先: [`force_freed`](#q004--force_freed--留置室)。

［逃走後］

退路へ戻った。この作業の移動・受け渡し・支払いはまだ確定していない。

［敗北後］

現場から救援された。依頼を再開すると、未完了の作業からやり直せる。

［戦闘の継続ここまで］

### q004 / force_freed — 留置室

実装場面: `q004.v11.force_freed`。

イベントID: `q004-S-force_freed`。

場面の現在地: 詰所・留置室前 (`waterway_checkpoint_holding`)。[ロケーション定義](../../../data/locations.json)。

登場: イナの姉。

錠が壊れ、姉が留置室から出た。イナは関所の外で待っている。原本を取り返す余裕はなく、この番号は関所破りに使われたものとして記録された。

選択 `escort`: 姉を連れて受付を抜け、関所の外へ戻る

出発: `force_freed_escort`。移動先: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (13, 5) / イベント `q004_decision`。[ダンジョン定義](../../../data/dungeons.json)。

この選択は出発処理だけを確定します。町では目的の施設へ入り、ダンジョンでは目的セルを踏むと自動で [`force_outside`](#q004--force_outside--関所の外) へ進み、到着時の処理を確定します。

### q004 / force_outside — 関所の外

実装場面: `q004.v11.force_outside`。

イベントID: `q004-S-force_outside`。

場面の現在地: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (13, 5) / イベント `q004_decision`。[ダンジョン定義](../../../data/dungeons.json)。

登場: イナ・イナの姉。

姉を連れて関所の外へ戻ると、イナが駆け寄った。原本は番人の手元にあり、その番号も写しも、もう通行には使えない。

選択 `finish`: 姉妹の安全を確かめ、依頼を終える

行為: `force_outside_finish`。

進行先: [結末 `contract`](#q004-結末-contract--錠を破って姉を連れ出す)。

### q004 結末 informed — 三人の名義を審査へ戻す

イベントID: `q004-E-informed`。

通行記録、勤務簿、住民登録簿を照合し、姉妹による通行証の複製・共用と、番人による兄名義の使用を審査へ戻した。現場確認の間、姉妹には別々の仮証が発行され、姉は釈放された。番人は勤務を止められ、兄の名を使った経緯の審査を受ける。三人とも正式資格の結論はまだ先にある。

57G / 68EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q004.values.released"},"right":true},{"op":"eq","left":{"ref":"stories.q004.values.provisional"},"right":true},{"op":"eq","left":{"ref":"stories.q004.values.filed"},"right":true},{"op":"eq","left":{"ref":"stories.q004.values.sistersConsent"},"right":true},{"op":"eq","left":{"ref":"stories.q004.values.keeperConsent"},"right":true},{"op":"eq","left":{"ref":"stories.q004.values.partyAt"},"right":"outside"},{"op":"eq","left":{"ref":"stories.q004.values.sisterAt"},"right":"outside"},{"op":"eq","left":{"ref":"stories.q004.values.inaAt"},"right":"outside"}]}`

### q004 結末 contract — 錠を破って姉を連れ出す

イベントID: `q004-E-contract`。

姉を関所の外へ連れ出した。押収された原本は番人の手元に残り、関所破りに使われた番号として取消扱いになった。イナの写しも通行には使えない。姉妹は自由になったが、資格を得たわけではない。

77G / 47EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q004.values.released"},"right":true},{"op":"eq","left":{"ref":"stories.q004.values.numberRevoked"},"right":true},{"op":"eq","left":{"ref":"stories.q004.values.sisterAt"},"right":"outside"},{"op":"eq","left":{"ref":"stories.q004.values.partyAt"},"right":"outside"}]}`

### q004 結末 compromise — 罰金で留置を解く

イベントID: `q004-E-compromise`。

姉妹は通行証を複製した事実を認め、罰金を納めた。姉は釈放されて原本を返され、イナの写しは回収・失効した。有効な資格は姉の一つだけで、二人が別々に通行できる状態にはならなかった。番人の名義については審査へ申し立てなかった。

37G / 51EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q004.values.released"},"right":true},{"op":"eq","left":{"ref":"stories.q004.values.copyInvalid"},"right":true},{"op":"eq","left":{"ref":"stories.q004.values.originalAt"},"right":"sister"},{"op":"not","arg":{"op":"eq","left":{"ref":"stories.q004.values.provisional"},"right":true}},{"op":"eq","left":{"ref":"stories.q004.values.partyAt"},"right":"outside"},{"op":"eq","left":{"ref":"stories.q004.values.sisterAt"},"right":"outside"},{"op":"eq","left":{"ref":"stories.q004.values.inaAt"},"right":"outside"}]}`

## 状態項目と初期値

`partyAt`：party の所在または保持者。型 `enum`、初期値 `"outside"`、許容値 `["outside","desk","cell","office","transit"]`。

`inaAt`：ina の所在または保持者。型 `enum`、初期値 `"outside"`、許容値 `["outside","desk","cell","office","transit"]`。

`sisterAt`：sister の所在または保持者。型 `enum`、初期値 `"cell"`、許容値 `["outside","desk","cell","office","transit"]`。

`keeperAt`：keeper の所在または保持者。型 `enum`、初期値 `"desk"`、許容値 `["outside","desk","cell","office","transit"]`。

`reviewerAt`：reviewer の所在または保持者。型 `enum`、初期値 `"office"`、許容値 `["outside","desk","cell","office","transit"]`。

`originalAt`：original の所在または保持者。型 `enum`、初期値 `"keeper"`、許容値 `["outside","desk","cell","office","transit","party","ina","sister","keeper","reviewer","copy","register"]`。

`copyAt`：copy の所在または保持者。型 `enum`、初期値 `"ina"`、許容値 `["outside","desk","cell","office","transit","party","ina","sister","keeper","reviewer","original","register"]`。

`registerAt`：register の所在または保持者。型 `enum`、初期値 `"keeper"`、許容値 `["outside","desk","cell","office","transit","party","ina","sister","keeper","reviewer","original","copy"]`。

`windowOpen`：windowOpen。型 `boolean`、初期値 `false`。

`truthKnown`：truthKnown。型 `boolean`、初期値 `false`。

`sistersConsent`：sistersConsent。型 `boolean`、初期値 `false`。

`keeperConsent`：keeperConsent。型 `boolean`、初期値 `false`。

`filed`：filed。型 `boolean`、初期値 `false`。

`released`：released。型 `boolean`、初期値 `false`。

`copyInvalid`：copyInvalid。型 `boolean`、初期値 `false`。

`numberRevoked`：numberRevoked。型 `boolean`、初期値 `false`。

`provisional`：provisional。型 `boolean`、初期値 `false`。

## 行為の条件と状態変化

本文の選択と行為IDを対応させ、効果を実行順で記す。条件式は配布JSONの値。資材・所持金不足では支払いも受け渡しも確定しない。実移動では出発効果と到着効果を分ける。

### 行為 entry_window

[q004-S-entry](#q004--entry--関所の外) → [q004-S-duplicate](#q004--duplicate--公開窓口)。条件 `true`。費用：なし。一度だけ確定する。

移動先：地下関所の詰所 (`waterway_checkpoint`)。[ロケーション定義](../../../data/locations.json)。同行者：イナ (`ina`)。

出発時の効果：

追加効果なし。移動中の記録を保持する。

到着時の効果：

移動：探索隊 (`party`)・イナ (`ina`)。移動中（現在地はワールド状態） (`transit`) → 公開窓口 (`desk`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`windowOpen` = `true`。

認識獲得：探索隊 (`party`) が 通行・勤務の記録 (`register`) から `shared`（イナが姉の写しで先に入場し、後から同じ番号の原本を提示した姉が拘束された）を知る。観察条件 `true`。

### 行為 entry_force

[q004-S-entry](#q004--entry--関所の外) → [q004-S-force_entry](#q004--force_entry--留置室)。条件 `true`。費用：なし。一度だけ確定する。

移動先：詰所・留置室前 (`waterway_checkpoint_holding`)。[ロケーション定義](../../../data/locations.json)。同行者：探索隊のみ。

出発時の効果：

追加効果なし。移動中の記録を保持する。

到着時の効果：

移動：探索隊 (`party`)。移動中（現在地はワールド状態） (`transit`) → 留置室 (`cell`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 duplicate_fine

[q004-S-duplicate](#q004--duplicate--公開窓口) / `window`（互換場面） → [q004-S-fine_release](#q004--fine_release--公開窓口)。条件 `true`。費用：20G。一度だけ確定する。

受け渡し：通行証の写し (`copy`) を イナ (`ina`) から 関所番 (`keeper`) へ。

移動：イナの姉 (`sister`)。留置室 (`cell`) → 公開窓口 (`desk`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：通行証の原本 (`original`) を 関所番 (`keeper`) から イナの姉 (`sister`) へ。

状態更新：`released` = `true`。

状態更新：`copyInvalid` = `true`。

### 行為 duplicate_inspect

[q004-S-duplicate](#q004--duplicate--公開窓口) / `window`（互換場面） → [q004-S-registry](#q004--registry--地上の審査窓口)。条件 `true`。費用：なし。一度だけ確定する。

移動先：通行資格審査所 (`hikarigaeri_pass_registry`)。[ロケーション定義](../../../data/locations.json)。同行者：探索隊のみ。

出発時の効果：

認識獲得：探索隊 (`party`) が 関所番 (`keeper`) から `duty`（勤務簿には関所番が申告した勤務名義がある）を知る。観察条件 `true`。

到着時の効果：

移動：探索隊 (`party`)。移動中（現在地はワールド状態） (`transit`) → 地上の審査窓口 (`office`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

認識獲得：探索隊 (`party`) が 名義審査官 (`reviewer`) から `resident`（別管理の住民登録簿では、その名義人は死亡している）を知る。観察条件 `true`。

### 行為 registry_return

[q004-S-registry](#q004--registry--地上の審査窓口) → [q004-S-consent](#q004--consent--公開窓口)。条件 `true`。費用：なし。一度だけ確定する。

移動先：地下関所の詰所 (`waterway_checkpoint`)。[ロケーション定義](../../../data/locations.json)。同行者：探索隊のみ。

出発時の効果：

追加効果なし。移動中の記録を保持する。

到着時の効果：

移動：探索隊 (`party`)。移動中（現在地はワールド状態） (`transit`) → 公開窓口 (`desk`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

認識獲得：探索隊 (`party`) が 関所番 (`keeper`) から `brother`（関所番は死んだ兄の名義を使っている）を知る。観察条件 `{"op":"and","args":[{"op":"contains","left":{"ref":"stories.q004.knowledge.party"},"right":"duty"},{"op":"contains","left":{"ref":"stories.q004.knowledge.party"},"right":"resident"}]}`。

状態更新：`truthKnown` = `true`。

### 行為 consent_file

[q004-S-consent](#q004--consent--公開窓口) → [q004-S-filing](#q004--filing--地上の審査窓口)。条件 `{"op":"eq","left":{"ref":"stories.q004.values.truthKnown"},"right":true}`。費用：なし。一度だけ確定する。

移動先：通行資格審査所 (`hikarigaeri_pass_registry`)。[ロケーション定義](../../../data/locations.json)。同行者：探索隊のみ。

出発時の効果：

状態更新：`sistersConsent` = `true`。

状態更新：`keeperConsent` = `true`。

到着時の効果：

移動：探索隊 (`party`)。移動中（現在地はワールド状態） (`transit`) → 地上の審査窓口 (`office`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 consent_fine

[q004-S-consent](#q004--consent--公開窓口) → [q004-S-fine_release](#q004--fine_release--公開窓口)。条件 `true`。費用：20G。一度だけ確定する。

受け渡し：通行証の写し (`copy`) を イナ (`ina`) から 関所番 (`keeper`) へ。

移動：イナの姉 (`sister`)。留置室 (`cell`) → 公開窓口 (`desk`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：通行証の原本 (`original`) を 関所番 (`keeper`) から イナの姉 (`sister`) へ。

状態更新：`released` = `true`。

状態更新：`copyInvalid` = `true`。

### 行為 filing_submit

[q004-S-filing](#q004--filing--地上の審査窓口) → [q004-S-escort](#q004--escort--地上の審査窓口)。条件 `true`。費用：なし。一度だけ確定する。

状態更新：`filed` = `true`。

### 行為 escort_accompany

[q004-S-escort](#q004--escort--地上の審査窓口) → [q004-S-review](#q004--review--公開窓口)。条件 `true`。費用：なし。一度だけ確定する。

移動先：地下関所の詰所 (`waterway_checkpoint`)。[ロケーション定義](../../../data/locations.json)。同行者：名義審査官 (`reviewer`)。

出発時の効果：

追加効果なし。移動中の記録を保持する。

到着時の効果：

移動：探索隊 (`party`)・名義審査官 (`reviewer`)。移動中（現在地はワールド状態） (`transit`) → 公開窓口 (`desk`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 review_issue

[q004-S-review](#q004--review--公開窓口) → [q004-S-issued](#q004--issued--公開窓口)。条件 `true`。費用：なし。一度だけ確定する。

受け渡し：通行証の写し (`copy`) を イナ (`ina`) から 名義審査官 (`reviewer`) へ。

受け渡し：通行証の原本 (`original`) を 関所番 (`keeper`) から 名義審査官 (`reviewer`) へ。

状態更新：`provisional` = `true`。

状態更新：`copyInvalid` = `true`。

移動：イナの姉 (`sister`)。留置室 (`cell`) → 公開窓口 (`desk`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`released` = `true`。

### 行為 issued_leave

[q004-S-issued](#q004--issued--公開窓口) → [q004-S-issued_outside](#q004--issued_outside--関所の外)。条件 `true`。費用：なし。一度だけ確定する。

移動先：灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (13, 5) / イベント `q004_decision`。[ダンジョン定義](../../../data/dungeons.json)。同行者：イナ (`ina`)・イナの姉 (`sister`)。

出発時の効果：

追加効果なし。移動中の記録を保持する。

到着時の効果：

移動：探索隊 (`party`)・イナ (`ina`)・イナの姉 (`sister`)。移動中（現在地はワールド状態） (`transit`) → 関所の外 (`outside`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 issued_outside_finish

[q004-S-issued_outside](#q004--issued_outside--関所の外) → [q004-E-informed](#q004-結末-informed--三人の名義を審査へ戻す)。条件 `true`。費用：なし。一度だけ確定する。

追加の状態更新なし。上記の進行先へ移る。

### 行為 fine_release_leave

[q004-S-fine_release](#q004--fine_release--公開窓口) → [q004-S-fine_outside](#q004--fine_outside--関所の外)。条件 `true`。費用：なし。一度だけ確定する。

移動先：灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (13, 5) / イベント `q004_decision`。[ダンジョン定義](../../../data/dungeons.json)。同行者：イナ (`ina`)・イナの姉 (`sister`)。

出発時の効果：

追加効果なし。移動中の記録を保持する。

到着時の効果：

移動：探索隊 (`party`)・イナ (`ina`)・イナの姉 (`sister`)。移動中（現在地はワールド状態） (`transit`) → 関所の外 (`outside`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 fine_outside_finish

[q004-S-fine_outside](#q004--fine_outside--関所の外) → [q004-E-compromise](#q004-結末-compromise--罰金で留置を解く)。条件 `true`。費用：なし。一度だけ確定する。

追加の状態更新なし。上記の進行先へ移る。

### 行為 force_entry_break

[q004-S-force_entry](#q004--force_entry--留置室) → [q004-S-force_freed](#q004--force_freed--留置室)。条件 `true`。費用：なし。一度だけ確定する。

状態更新：`released` = `true`。

状態更新：`numberRevoked` = `true`。

### 行為 force_freed_escort

[q004-S-force_freed](#q004--force_freed--留置室) → [q004-S-force_outside](#q004--force_outside--関所の外)。条件 `true`。費用：なし。一度だけ確定する。

移動先：灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (13, 5) / イベント `q004_decision`。[ダンジョン定義](../../../data/dungeons.json)。同行者：イナの姉 (`sister`)。

出発時の効果：

追加効果なし。移動中の記録を保持する。

到着時の効果：

移動：探索隊 (`party`)・イナの姉 (`sister`)。移動中（現在地はワールド状態） (`transit`) → 関所の外 (`outside`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 force_outside_finish

[q004-S-force_outside](#q004--force_outside--関所の外) → [q004-E-contract](#q004-結末-contract--錠を破って姉を連れ出す)。条件 `true`。費用：なし。一度だけ確定する。

追加の状態更新なし。上記の進行先へ移る。

### 行為 window_fine

互換場面の再開参照として保持する行為。現行本編の場面数・移動本数には含めない。

`window`（互換場面） → [q004-S-fine_release](#q004--fine_release--公開窓口)。条件 `true`。費用：20G。一度だけ確定する。

受け渡し：通行証の写し (`copy`) を イナ (`ina`) から 関所番 (`keeper`) へ。

移動：イナの姉 (`sister`)。留置室 (`cell`) → 公開窓口 (`desk`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：通行証の原本 (`original`) を 関所番 (`keeper`) から イナの姉 (`sister`) へ。

状態更新：`released` = `true`。

状態更新：`copyInvalid` = `true`。

### 行為 window_inspect

互換場面の再開参照として保持する行為。現行本編の場面数・移動本数には含めない。

`window`（互換場面） → [q004-S-registry](#q004--registry--地上の審査窓口)。条件 `true`。費用：なし。一度だけ確定する。

移動先：通行資格審査所 (`hikarigaeri_pass_registry`)。[ロケーション定義](../../../data/locations.json)。同行者：探索隊のみ。

出発時の効果：

認識獲得：探索隊 (`party`) が 関所番 (`keeper`) から `duty`（勤務簿には関所番が申告した勤務名義がある）を知る。観察条件 `true`。

到着時の効果：

移動：探索隊 (`party`)。移動中（現在地はワールド状態） (`transit`) → 地上の審査窓口 (`office`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

認識獲得：探索隊 (`party`) が 名義審査官 (`reviewer`) から `resident`（別管理の住民登録簿では、その名義人は死亡している）を知る。観察条件 `true`。

## 資材不足・戦闘後の再開・保存

`q004.v11.duplicate` / 作業 `fine`：必要量 20G。不足選択 `fine_supplies` → `q004.v11.duplicate.fine.shortage` で未着手のまま探索へ戻る。補給後は `q004.v11.duplicate.fine.resume` → `q004.v11.duplicate` で作業場面へ戻る。

`q004.v11.consent` / 作業 `fine`：必要量 20G。不足選択 `fine_supplies` → `q004.v11.consent.fine.shortage` で未着手のまま探索へ戻る。補給後は `q004.v11.consent.fine.resume` → `q004.v11.consent` で作業場面へ戻る。

`q004.v11.window` / 作業 `fine`：必要量 20G。不足選択 `fine_supplies` → `q004.v11.window.fine.shortage` で未着手のまま探索へ戻る。補給後は `q004.v11.window.fine.resume` → `q004.v11.window` で作業場面へ戻る。

共通の中断選択肢はない。メッセージ・判断の途中で閉じた場合は通常の保存位置から再開する。戦闘の逃走・敗北後は本編記載の継続命令に従い、勝利後の作業・費用を先に確定しない。q001固有の老人遭遇への巻戻しを、この依頼にも実装済みとは扱わない。

## 編集時の確認事項

荷揚げ場(13,5)の会話から戸口(13,3)へ歩き、明示的に詰所へ入る。地上審査所での処理を地下で済ませない。

死亡記録を読むだけで兄名義と断定しない。番人本人への照合と、三人への不利益説明・同意を挟む。

罰金不足は未払いのまま補給経路へ進む。審査官の同行・姉の釈放前後・退出時の証書の所在を保存する。

以下は改稿・物理接続を行う際の確認観点であり、全項目を実ブラウザで確認済みという記録ではない。今回の検証結果は [PROGRESS.md](../../development/PROGRESS.md) を参照する。

## マップデータと接続定義

実配置へ入口から到達する接続経路上のマップを掲載する。旧経路用の条件付き配置も含むため、全マップの踏破を本編の完了条件とはしない。クエスト配置はeventsから重ね、共通マップのJSONと分ける。

### 灯守の地下水道 の経路

入口：`{"main":{"map":"region_1_f1","point":"entrance"}}`。

`upper_inlet`：第一水路の水密扉。`region_1_f1` (9, 1) ↔ `region_1_canal_a` (1, 1)。接続方式 `watertight_door`。

`upper_landing`：荷揚げ場の水密扉。`region_1_canal_a` (9, 1) ↔ `region_1_landing` (1, 1)。接続方式 `watertight_door`。

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

<details>
<summary>参照施設と親ロケーション</summary>

```json
{
  "waterway_checkpoint": {
    "id": "waterway_checkpoint",
    "name": "地下関所の詰所",
    "parent": null,
    "description": "水路に面した石造りの詰所。受付には入退場記録と勤務簿が置かれ、奥の面会窓は留置室につながっている。",
    "background": "location_checkpoint",
    "links": [],
    "dungeonEntrance": {
      "dungeon": "region_1",
      "map": "region_1_landing",
      "x": 13,
      "y": 3,
      "facing": "south"
    },
    "enterLabel": "詰所に入る",
    "exitLabel": "詰所を出る"
  },
  "waterway_checkpoint_holding": {
    "id": "waterway_checkpoint_holding",
    "name": "詰所・留置室前",
    "parent": "waterway_checkpoint",
    "description": "受付の奥にある留置室。鉄格子と錠が通路を隔て、面会窓から受付の声が届く。",
    "background": "location_checkpoint",
    "links": []
  },
  "hikarigaeri_pass_registry": {
    "id": "hikarigaeri_pass_registry",
    "name": "通行資格審査所",
    "parent": "hikarigaeri_square",
    "description": "地上で住民登録と通行資格を管理する審査窓口。地下関所の勤務簿とは別に、名義人の記録を照合する。",
    "background": "location_insurance",
    "links": []
  },
  "hikarigaeri_square": {
    "id": "hikarigaeri_square",
    "name": "灯帰り・篝火広場",
    "parent": null,
    "description": "迷宮から帰った人々が灯を囲む広場。施設の戸口と、迷宮へ下りる道が見える。",
    "background": "location_square",
    "links": [],
    "dungeons": [
      "kagaribi",
      "moving_village",
      "prayerless_valley",
      "region_1",
      "region_10",
      "region_2",
      "region_3",
      "region_4",
      "region_5",
      "region_6",
      "region_7",
      "region_8",
      "region_9"
    ]
  }
}
```

</details>

<details>
<summary>クエスト専用の全配置と条件</summary>

```json
[
  {
    "id": "q004_decision",
    "title": "関所の外で待つイナ",
    "points": [
      {
        "map": "region_1_landing",
        "x": 13,
        "y": 5,
        "dungeon": "region_1"
      }
    ],
    "kind": "decision",
    "trigger": "interact",
    "safe": true,
    "script": "q004.v11.visit",
    "role": "decision",
    "visibleWhen": {
      "op": "or",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q004.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "quests.q004.stage"
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
    "outside": "関所の外",
    "desk": "公開窓口",
    "cell": "留置室",
    "office": "地上の審査窓口",
    "transit": "移動中（現在地はワールド状態）"
  },
  "connections": [
    [
      "outside",
      "desk"
    ],
    [
      "desk",
      "cell"
    ],
    [
      "outside",
      "office"
    ],
    [
      "transit",
      "outside"
    ],
    [
      "transit",
      "desk"
    ],
    [
      "transit",
      "cell"
    ],
    [
      "transit",
      "office"
    ]
  ],
  "registry": {
    "partyAt": {
      "type": "enum",
      "initial": "outside",
      "values": [
        "outside",
        "desk",
        "cell",
        "office",
        "transit"
      ],
      "meaning": "party の所在または保持者"
    },
    "inaAt": {
      "type": "enum",
      "initial": "outside",
      "values": [
        "outside",
        "desk",
        "cell",
        "office",
        "transit"
      ],
      "meaning": "ina の所在または保持者"
    },
    "sisterAt": {
      "type": "enum",
      "initial": "cell",
      "values": [
        "outside",
        "desk",
        "cell",
        "office",
        "transit"
      ],
      "meaning": "sister の所在または保持者"
    },
    "keeperAt": {
      "type": "enum",
      "initial": "desk",
      "values": [
        "outside",
        "desk",
        "cell",
        "office",
        "transit"
      ],
      "meaning": "keeper の所在または保持者"
    },
    "reviewerAt": {
      "type": "enum",
      "initial": "office",
      "values": [
        "outside",
        "desk",
        "cell",
        "office",
        "transit"
      ],
      "meaning": "reviewer の所在または保持者"
    },
    "originalAt": {
      "type": "enum",
      "initial": "keeper",
      "values": [
        "outside",
        "desk",
        "cell",
        "office",
        "transit",
        "party",
        "ina",
        "sister",
        "keeper",
        "reviewer",
        "copy",
        "register"
      ],
      "meaning": "original の所在または保持者"
    },
    "copyAt": {
      "type": "enum",
      "initial": "ina",
      "values": [
        "outside",
        "desk",
        "cell",
        "office",
        "transit",
        "party",
        "ina",
        "sister",
        "keeper",
        "reviewer",
        "original",
        "register"
      ],
      "meaning": "copy の所在または保持者"
    },
    "registerAt": {
      "type": "enum",
      "initial": "keeper",
      "values": [
        "outside",
        "desk",
        "cell",
        "office",
        "transit",
        "party",
        "ina",
        "sister",
        "keeper",
        "reviewer",
        "original",
        "copy"
      ],
      "meaning": "register の所在または保持者"
    },
    "windowOpen": {
      "type": "boolean",
      "initial": false,
      "meaning": "windowOpen"
    },
    "truthKnown": {
      "type": "boolean",
      "initial": false,
      "meaning": "truthKnown"
    },
    "sistersConsent": {
      "type": "boolean",
      "initial": false,
      "meaning": "sistersConsent"
    },
    "keeperConsent": {
      "type": "boolean",
      "initial": false,
      "meaning": "keeperConsent"
    },
    "filed": {
      "type": "boolean",
      "initial": false,
      "meaning": "filed"
    },
    "released": {
      "type": "boolean",
      "initial": false,
      "meaning": "released"
    },
    "copyInvalid": {
      "type": "boolean",
      "initial": false,
      "meaning": "copyInvalid"
    },
    "numberRevoked": {
      "type": "boolean",
      "initial": false,
      "meaning": "numberRevoked"
    },
    "provisional": {
      "type": "boolean",
      "initial": false,
      "meaning": "provisional"
    }
  },
  "entities": {
    "party": {
      "holder": "partyAt",
      "kind": "group"
    },
    "ina": {
      "holder": "inaAt",
      "kind": "person",
      "character": "ina"
    },
    "sister": {
      "holder": "sisterAt",
      "kind": "person",
      "character": "sister"
    },
    "keeper": {
      "holder": "keeperAt",
      "kind": "person",
      "character": "passkeeper"
    },
    "reviewer": {
      "holder": "reviewerAt",
      "kind": "person",
      "character": "reviewer"
    },
    "original": {
      "holder": "originalAt",
      "kind": "item"
    },
    "copy": {
      "holder": "copyAt",
      "kind": "item"
    },
    "register": {
      "holder": "registerAt",
      "kind": "item"
    }
  },
  "propositions": {
    "shared": {
      "text": "イナが姉の写しで先に入場し、後から同じ番号の原本を提示した姉が拘束された"
    },
    "duty": {
      "text": "勤務簿には関所番が申告した勤務名義がある"
    },
    "resident": {
      "text": "別管理の住民登録簿では、その名義人は死亡している"
    },
    "brother": {
      "text": "関所番は死んだ兄の名義を使っている"
    }
  },
  "initialKnowledge": {},
  "invariants": [],
  "scenes": {
    "entry": {
      "title": "関所の外",
      "place": "outside",
      "cast": [
        {
          "entity": "ina"
        }
      ],
      "requires": true
    },
    "duplicate": {
      "title": "公開窓口",
      "place": "desk",
      "cast": [
        {
          "entity": "ina"
        },
        {
          "entity": "keeper"
        },
        {
          "entity": "sister",
          "mode": "remote",
          "requires": {
            "op": "eq",
            "left": {
              "ref": "stories.q004.values.windowOpen"
            },
            "right": true
          }
        }
      ],
      "requires": true
    },
    "registry": {
      "title": "地上の審査窓口",
      "place": "office",
      "cast": [
        {
          "entity": "reviewer"
        }
      ],
      "requires": true
    },
    "consent": {
      "title": "公開窓口",
      "place": "desk",
      "cast": [
        {
          "entity": "ina"
        },
        {
          "entity": "keeper"
        },
        {
          "entity": "sister",
          "mode": "remote",
          "requires": {
            "op": "eq",
            "left": {
              "ref": "stories.q004.values.windowOpen"
            },
            "right": true
          }
        }
      ],
      "requires": true
    },
    "filing": {
      "title": "地上の審査窓口",
      "place": "office",
      "cast": [
        {
          "entity": "reviewer"
        }
      ],
      "requires": true
    },
    "escort": {
      "title": "地上の審査窓口",
      "place": "office",
      "cast": [
        {
          "entity": "reviewer"
        }
      ],
      "requires": true
    },
    "review": {
      "title": "公開窓口",
      "place": "desk",
      "cast": [
        {
          "entity": "ina"
        },
        {
          "entity": "keeper"
        },
        {
          "entity": "reviewer"
        },
        {
          "entity": "sister",
          "mode": "remote",
          "requires": {
            "op": "eq",
            "left": {
              "ref": "stories.q004.values.windowOpen"
            },
            "right": true
          }
        }
      ],
      "requires": true
    },
    "issued": {
      "title": "公開窓口",
      "place": "desk",
      "cast": [
        {
          "entity": "ina"
        },
        {
          "entity": "sister"
        },
        {
          "entity": "keeper"
        },
        {
          "entity": "reviewer"
        }
      ],
      "requires": true
    },
    "issued_outside": {
      "title": "関所の外",
      "place": "outside",
      "cast": [
        {
          "entity": "ina"
        },
        {
          "entity": "sister"
        }
      ],
      "requires": true
    },
    "fine_release": {
      "title": "公開窓口",
      "place": "desk",
      "cast": [
        {
          "entity": "ina"
        },
        {
          "entity": "sister"
        },
        {
          "entity": "keeper"
        }
      ],
      "requires": true
    },
    "fine_outside": {
      "title": "関所の外",
      "place": "outside",
      "cast": [
        {
          "entity": "ina"
        },
        {
          "entity": "sister"
        }
      ],
      "requires": true
    },
    "force_entry": {
      "title": "留置室",
      "place": "cell",
      "cast": [
        {
          "entity": "sister"
        }
      ],
      "requires": true
    },
    "force_freed": {
      "title": "留置室",
      "place": "cell",
      "cast": [
        {
          "entity": "sister"
        }
      ],
      "requires": true
    },
    "force_outside": {
      "title": "関所の外",
      "place": "outside",
      "cast": [
        {
          "entity": "ina"
        },
        {
          "entity": "sister"
        }
      ],
      "requires": true
    },
    "window": {
      "title": "公開窓口",
      "place": "desk",
      "cast": [
        {
          "entity": "ina"
        },
        {
          "entity": "keeper"
        },
        {
          "entity": "sister",
          "mode": "remote",
          "requires": {
            "op": "eq",
            "left": {
              "ref": "stories.q004.values.windowOpen"
            },
            "right": true
          }
        }
      ],
      "requires": true
    }
  },
  "actions": {
    "entry_window": {
      "from": [
        "entry"
      ],
      "to": "duplicate",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party",
            "ina"
          ],
          "path": [
            "transit",
            "desk"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "windowOpen",
          "value": true
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "shared",
          "source": "register",
          "requires": true
        }
      ],
      "once": true,
      "journey": {
        "to": "desk",
        "companions": [
          "ina"
        ]
      },
      "depart": []
    },
    "entry_force": {
      "from": [
        "entry"
      ],
      "to": "force_entry",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "transit",
            "cell"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true,
      "journey": {
        "to": "cell",
        "companions": []
      },
      "depart": []
    },
    "duplicate_fine": {
      "from": [
        "duplicate",
        "window"
      ],
      "to": "fine_release",
      "requires": true,
      "effects": [
        {
          "op": "transfer",
          "entity": "copy",
          "from": "ina",
          "to": "keeper"
        },
        {
          "op": "move",
          "entities": [
            "sister"
          ],
          "path": [
            "cell",
            "desk"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "original",
          "from": "keeper",
          "to": "sister"
        },
        {
          "op": "set",
          "key": "released",
          "value": true
        },
        {
          "op": "set",
          "key": "copyInvalid",
          "value": true
        }
      ],
      "cost": {
        "gold": 20
      },
      "once": true
    },
    "duplicate_inspect": {
      "from": [
        "duplicate",
        "window"
      ],
      "to": "registry",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "transit",
            "office"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "resident",
          "source": "reviewer",
          "requires": true
        }
      ],
      "once": true,
      "journey": {
        "to": "office",
        "companions": []
      },
      "depart": [
        {
          "op": "observe",
          "observer": "party",
          "proposition": "duty",
          "source": "keeper",
          "requires": true
        }
      ]
    },
    "registry_return": {
      "from": [
        "registry"
      ],
      "to": "consent",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "transit",
            "desk"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "brother",
          "source": "keeper",
          "requires": {
            "op": "and",
            "args": [
              {
                "op": "contains",
                "left": {
                  "ref": "stories.q004.knowledge.party"
                },
                "right": "duty"
              },
              {
                "op": "contains",
                "left": {
                  "ref": "stories.q004.knowledge.party"
                },
                "right": "resident"
              }
            ]
          }
        },
        {
          "op": "set",
          "key": "truthKnown",
          "value": true
        }
      ],
      "once": true,
      "journey": {
        "to": "desk",
        "companions": []
      },
      "depart": []
    },
    "consent_file": {
      "from": [
        "consent"
      ],
      "to": "filing",
      "requires": {
        "op": "eq",
        "left": {
          "ref": "stories.q004.values.truthKnown"
        },
        "right": true
      },
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "transit",
            "office"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true,
      "journey": {
        "to": "office",
        "companions": []
      },
      "depart": [
        {
          "op": "set",
          "key": "sistersConsent",
          "value": true
        },
        {
          "op": "set",
          "key": "keeperConsent",
          "value": true
        }
      ]
    },
    "consent_fine": {
      "from": [
        "consent"
      ],
      "to": "fine_release",
      "requires": true,
      "effects": [
        {
          "op": "transfer",
          "entity": "copy",
          "from": "ina",
          "to": "keeper"
        },
        {
          "op": "move",
          "entities": [
            "sister"
          ],
          "path": [
            "cell",
            "desk"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "original",
          "from": "keeper",
          "to": "sister"
        },
        {
          "op": "set",
          "key": "released",
          "value": true
        },
        {
          "op": "set",
          "key": "copyInvalid",
          "value": true
        }
      ],
      "cost": {
        "gold": 20
      },
      "once": true
    },
    "filing_submit": {
      "from": [
        "filing"
      ],
      "to": "escort",
      "requires": true,
      "effects": [
        {
          "op": "set",
          "key": "filed",
          "value": true
        }
      ],
      "once": true
    },
    "escort_accompany": {
      "from": [
        "escort"
      ],
      "to": "review",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party",
            "reviewer"
          ],
          "path": [
            "transit",
            "desk"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true,
      "journey": {
        "to": "desk",
        "companions": [
          "reviewer"
        ]
      },
      "depart": []
    },
    "review_issue": {
      "from": [
        "review"
      ],
      "to": "issued",
      "requires": true,
      "effects": [
        {
          "op": "transfer",
          "entity": "copy",
          "from": "ina",
          "to": "reviewer"
        },
        {
          "op": "transfer",
          "entity": "original",
          "from": "keeper",
          "to": "reviewer"
        },
        {
          "op": "set",
          "key": "provisional",
          "value": true
        },
        {
          "op": "set",
          "key": "copyInvalid",
          "value": true
        },
        {
          "op": "move",
          "entities": [
            "sister"
          ],
          "path": [
            "cell",
            "desk"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "released",
          "value": true
        }
      ],
      "once": true
    },
    "issued_leave": {
      "from": [
        "issued"
      ],
      "to": "issued_outside",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party",
            "ina",
            "sister"
          ],
          "path": [
            "transit",
            "outside"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true,
      "journey": {
        "to": "outside",
        "companions": [
          "ina",
          "sister"
        ]
      },
      "depart": []
    },
    "issued_outside_finish": {
      "from": [
        "issued_outside"
      ],
      "ending": "informed",
      "requires": true,
      "effects": [],
      "once": true
    },
    "fine_release_leave": {
      "from": [
        "fine_release"
      ],
      "to": "fine_outside",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party",
            "ina",
            "sister"
          ],
          "path": [
            "transit",
            "outside"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true,
      "journey": {
        "to": "outside",
        "companions": [
          "ina",
          "sister"
        ]
      },
      "depart": []
    },
    "fine_outside_finish": {
      "from": [
        "fine_outside"
      ],
      "ending": "compromise",
      "requires": true,
      "effects": [],
      "once": true
    },
    "force_entry_break": {
      "from": [
        "force_entry"
      ],
      "to": "force_freed",
      "requires": true,
      "effects": [
        {
          "op": "set",
          "key": "released",
          "value": true
        },
        {
          "op": "set",
          "key": "numberRevoked",
          "value": true
        }
      ],
      "once": true
    },
    "force_freed_escort": {
      "from": [
        "force_freed"
      ],
      "to": "force_outside",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party",
            "sister"
          ],
          "path": [
            "transit",
            "outside"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true,
      "journey": {
        "to": "outside",
        "companions": [
          "sister"
        ]
      },
      "depart": []
    },
    "force_outside_finish": {
      "from": [
        "force_outside"
      ],
      "ending": "contract",
      "requires": true,
      "effects": [],
      "once": true
    },
    "window_fine": {
      "from": [
        "window"
      ],
      "to": "fine_release",
      "requires": true,
      "effects": [
        {
          "op": "transfer",
          "entity": "copy",
          "from": "ina",
          "to": "keeper"
        },
        {
          "op": "move",
          "entities": [
            "sister"
          ],
          "path": [
            "cell",
            "desk"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "original",
          "from": "keeper",
          "to": "sister"
        },
        {
          "op": "set",
          "key": "released",
          "value": true
        },
        {
          "op": "set",
          "key": "copyInvalid",
          "value": true
        }
      ],
      "cost": {
        "gold": 20
      },
      "once": true
    },
    "window_inspect": {
      "from": [
        "window"
      ],
      "to": "registry",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "transit",
            "office"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "resident",
          "source": "reviewer",
          "requires": true
        }
      ],
      "once": true,
      "journey": {
        "to": "office",
        "companions": []
      },
      "depart": [
        {
          "op": "observe",
          "observer": "party",
          "proposition": "duty",
          "source": "keeper",
          "requires": true
        }
      ]
    }
  },
  "endings": {
    "informed": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "stories.q004.values.released"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q004.values.provisional"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q004.values.filed"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q004.values.sistersConsent"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q004.values.keeperConsent"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q004.values.partyAt"
          },
          "right": "outside"
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q004.values.sisterAt"
          },
          "right": "outside"
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q004.values.inaAt"
          },
          "right": "outside"
        }
      ]
    },
    "contract": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "stories.q004.values.released"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q004.values.numberRevoked"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q004.values.sisterAt"
          },
          "right": "outside"
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q004.values.partyAt"
          },
          "right": "outside"
        }
      ]
    },
    "compromise": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "stories.q004.values.released"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q004.values.copyInvalid"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q004.values.originalAt"
          },
          "right": "sister"
        },
        {
          "op": "not",
          "arg": {
            "op": "eq",
            "left": {
              "ref": "stories.q004.values.provisional"
            },
            "right": true
          }
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q004.values.partyAt"
          },
          "right": "outside"
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q004.values.sisterAt"
          },
          "right": "outside"
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q004.values.inaAt"
          },
          "right": "outside"
        }
      ]
    }
  },
  "worldPlaces": {
    "outside": {
      "kind": "dungeon",
      "dungeon": "region_1",
      "map": "region_1_landing",
      "x": 13,
      "y": 5,
      "event": "q004_decision"
    },
    "desk": {
      "kind": "town",
      "location": "waterway_checkpoint"
    },
    "cell": {
      "kind": "town",
      "location": "waterway_checkpoint_holding"
    },
    "office": {
      "kind": "town",
      "location": "hikarigaeri_pass_registry"
    }
  },
  "revision": 2
}
```

</details>

## 編集元と再生成

本編は [authoring/story-q004.mjs](../../../authoring/story-q004.mjs)、配置は [config/quests/q004.events.json](../../../config/quests/q004.events.json)、配布内容は [data/quests/q004.json](../../../data/quests/q004.json)。地形は [config/connected-maps.json](../../../config/connected-maps.json)、接続・給排水は [config/dungeons/region_1.json](../../../config/dungeons/region_1.json)、施設は [config/locations.json](../../../config/locations.json) を参照する。

解説と確認観点は [authoring/quest-page-notes.mjs](../../../authoring/quest-page-notes.mjs)、ページ構成は [tools/quest-page-details.mjs](../../../tools/quest-page-details.mjs) を編集する。本文を手直しする場合は物語原稿へ反映し、`npm run build:scenarios` で配布データも更新する。文書だけの再生成は `npm run build:catalog`、照合は `npm run check:docs`。`npm run build:docs` 単独は個別ページの本文を保持する。
