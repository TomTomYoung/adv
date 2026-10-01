# q003 逆流する鐘：詳細・配置・状態変化

[個別ページ一覧](README.md) ／ [カタログへ戻る](../QUEST_CATALOG.md#q003-逆流する鐘) ／ [シナリオ本文](#q003-逆流する鐘) ／ [行為の条件と状態変化](#行為の条件と状態変化) ／ [配置イベント](#配置イベントと操作条件)

作品版 1.25.0。配布JSONから生成した作者向けページ。真相と結末を含む。本編9場面・3結末。

<!-- quest-page-source:7eb2f2a8b4f7008ab233cc426eb4318d6b67d1b99ece833a5bb4ca963081eef5 -->

## 依頼の焦点と分岐の意味

依頼は鐘を止めることだが、最初に解決すべき問題は低所に残る人の避難である。警報装置の正常動作、逆流の原因、運用変更の実証を別々の段階として扱う。

避難を済ませてから、鎖を切る、放水を改める、人の当番で警報を維持する、の三つへ分岐する。contractでも避難は省略しない。

informedは宿屋の夜間放水量を減らし、残りを時間分散する合意と一晩の運用試験を必要とする。水売りの注文減と宿屋の営業上の負担を残す。

compromiseは鐘を高所へ運び、浮子との接続を失った代わりに水位監視と伝令の当番を組む。宿屋で交渉をやめた場合も、鐘室に鐘とソラを迎えに戻る。

## 実装範囲と場所

9本の移動行為を実装済み。選択時は出発の処理だけを確定し、目的のセル・施設へ実際に到着して場面を続ける。同行者と運搬物、移動中の保存を扱う。

`alarm`：低所の鐘室。灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (7, 1) / イベント `q003_decision`。[ダンジョン定義](../../../data/dungeons.json)。

`passage`：冠水しかけた通路。灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・鐘と浮子の点検室・B1 (`region_1_inspection`) / (5, 1) / イベント `q003_passage`。[ダンジョン定義](../../../data/dungeons.json)。

`high`：高所の待避場。地下水道上層・待避場 (`hikarigaeri_waterwatch`)。[ロケーション定義](../../../data/locations.json)。

`reservoir`：宿屋裏の汚水槽。宿屋裏の汚水槽 (`hikarigaeri_tavern_cistern`)。[ロケーション定義](../../../data/locations.json)。

`transit`：移動中（現在地はワールド状態）。移動中を示す内部状態。固定セルではない。

### 物語内の接続

低所の鐘室 (`alarm`) ↔ 冠水しかけた通路 (`passage`)。

低所の鐘室 (`alarm`) ↔ 高所の待避場 (`high`)。

高所の待避場 (`high`) ↔ 宿屋裏の汚水槽 (`reservoir`)。

移動中（現在地はワールド状態） (`transit`) ↔ 低所の鐘室 (`alarm`)。

移動中（現在地はワールド状態） (`transit`) ↔ 冠水しかけた通路 (`passage`)。

移動中（現在地はワールド状態） (`transit`) ↔ 高所の待避場 (`high`)。

移動中（現在地はワールド状態） (`transit`) ↔ 宿屋裏の汚水槽 (`reservoir`)。

## 人物・物品と認識

探索隊 (`party`)：集団。初期の所在・保持者は 低所の鐘室 (`alarm`)、保存項目は `partyAt`。

ソラ (`sora`)：人物。初期の所在・保持者は 低所の鐘室 (`alarm`)、保存項目は `soraAt`。水門役人。警報の信頼を取り戻す。

通行人たち (`passers`)：集団。初期の所在・保持者は 冠水しかけた通路 (`passage`)、保存項目は `passersAt`。低い通路の利用者。荷とともに安全な通路へ出る。

宿屋の主人 (`innkeeper`)：人物。初期の所在・保持者は 宿屋裏の汚水槽 (`reservoir`)、保存項目は `innkeeperAt`。私設汚水槽の管理者。宿の営業と湯替えを維持する。

水売り (`seller`)：人物。初期の所在・保持者は 宿屋裏の汚水槽 (`reservoir`)、保存項目は `sellerAt`。井戸水を樽で届ける商人。水の商いによる収入を保つ。

警鐘 (`bell`)：物品。初期の所在・保持者は 低所の鐘室 (`alarm`)、保存項目は `bellAt`。

浮子 (`float`)：物品。初期の所在・保持者は 低所の鐘室 (`alarm`)、保存項目は `floatAt`。

水位見張り当番 (`watch`)：集団。初期の所在・保持者は 高所の待避場 (`high`)、保存項目は `watchAt`。水位観測と伝令の担当。高所の鐘へ水位を伝える。

認識 `mechanism`：鐘は増水を正しく知らせている。

認識 `cause`：宿屋の夜間放水が下流へ逆流している。

初期認識：`{}`。固定された過去と探索隊がすでに知る情報は別に扱い、observeの成立で認識を加える。

## 本編の進行とイベントID

本編場面は `q003-S-場面キー`、配置は `q003-P-配置キー`、結末は `q003-E-結末キー`。S・P・Eは文書用の識別子。Fは強制戦闘、Bは戦闘中イベントで、命令に明示されたidがあればそれを使い、ない戦闘には文書用IDを付ける。全14IDが一意で、場面を並べ替えても変わらない。

[q003-S-entry](#q003--entry--低所の鐘室)：低所の鐘室。物語内の場所 `alarm`。

選択 `warn`：低い通路へ向かい、残っている通行人に声を掛ける → [q003-S-warning](#q003--warning--冠水しかけた通路)。行為 [`entry_warn`](#行為-entry_warn)。出発後に実到着を待つ。

[q003-S-safe](#q003--safe--低所の鐘室)：低所の鐘室。物語内の場所 `alarm`。

選択 `inspect`：浮子と鎖を動かして作動を確かめる → [q003-S-mechanism](#q003--mechanism--低所の鐘室)。行為 [`safe_inspect`](#行為-safe_inspect)。

選択 `cut`：閉鎖を維持したまま鐘の鎖を切る → [q003-E-contract](#q003-結末-contract--通路を閉じて鐘を止める)。行為 [`safe_cut`](#行為-safe_cut)。

選択 `upstream`：水の来る方向をたどり、宿屋裏へ向かう → [q003-S-reservoir](#q003--reservoir--宿屋裏の汚水槽)。行為 [`safe_upstream`](#行為-safe_upstream)。出発後に実到着を待つ。

[q003-S-mechanism](#q003--mechanism--低所の鐘室)：低所の鐘室。物語内の場所 `alarm`。

選択 `upstream`：高所の道を通って汚水槽へ向かう → [q003-S-reservoir](#q003--reservoir--宿屋裏の汚水槽)。行為 [`mechanism_upstream`](#行為-mechanism_upstream)。出発後に実到着を待つ。

選択 `relay`：鐘を高所へ運び、水位を伝える当番を組む → [q003-S-relay](#q003--relay--高所の待避場)。行為 [`mechanism_relay`](#行為-mechanism_relay)。出発後に実到着を待つ。

[q003-S-reservoir](#q003--reservoir--宿屋裏の汚水槽)：宿屋裏の汚水槽。物語内の場所 `reservoir`。

選択 `agree`：夜間の放水量を減らし、残りを時間分散する合意を取る → [q003-S-test](#q003--test--低所の鐘室)。行為 [`reservoir_agree`](#行為-reservoir_agree)。出発後に実到着を待つ。

選択 `relay`：放水は変えず、鐘室へ戻って鐘とソラを迎えに行く → [q003-S-collect](#q003--collect--低所の鐘室)。行為 [`reservoir_relay`](#行為-reservoir_relay)。出発後に実到着を待つ。

[q003-S-test](#q003--test--低所の鐘室)：低所の鐘室。物語内の場所 `alarm`。

選択 `verify`：一晩の運用試験を終え、水位と鐘の復帰を確認する → [q003-E-informed](#q003-結末-informed--放水の合意と運用試験)。行為 [`test_verify`](#行為-test_verify)。

[q003-S-relay](#q003--relay--高所の待避場)：高所の待避場。物語内の場所 `high`。

選択 `roster`：当番の承諾を取り、伝令と鐘の連絡を実地に試す → [q003-E-compromise](#q003-結末-compromise--高所の鐘と見張りの交代制)。行為 [`relay_roster`](#行為-relay_roster)。

[q003-S-warning](#q003--warning--冠水しかけた通路)：冠水しかけた通路。物語内の場所 `passage`。

選択 `escort`：通行人を連れ、入口を経て上層の待避場へ避難する → [q003-S-evacuated](#q003--evacuated--高所の待避場)。行為 [`warning_escort`](#行為-warning_escort)。出発後に実到着を待つ。

[q003-S-evacuated](#q003--evacuated--高所の待避場)：高所の待避場。物語内の場所 `high`。

選択 `return`：見張りに避難者を任せ、鐘室へ戻る → [q003-S-safe](#q003--safe--低所の鐘室)。行為 [`evacuated_return`](#行為-evacuated_return)。出発後に実到着を待つ。

[q003-S-collect](#q003--collect--低所の鐘室)：低所の鐘室。物語内の場所 `alarm`。

選択 `carry`：鐘を受け取り、ソラと上層の待避場へ運ぶ → [q003-S-relay](#q003--relay--高所の待避場)。行為 [`collect_carry`](#行為-collect_carry)。出発後に実到着を待つ。

現行本編に専用の強制戦闘・戦闘中イベントはない。通常の歩行遭遇と旧調査スクリプトは別に扱う。

## 配置イベントと操作条件

配置が保存されていることと、通常プレイで表示されることは同じではない。表示条件・操作条件は別々に評価する。legacyQuestRoutesを要する配置は旧経路用で、現行本編の必須経路へ数えない。

### q003-P-decision

逆流する鐘：決着の場。実行ID `q003_decision`、起動 `interact`、スクリプト `q003.v11.visit`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (7, 1) / イベント `q003_decision`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"or","args":[{"op":"eq","left":{"ref":"quests.q003.stage"},"right":"active"},{"op":"eq","left":{"ref":"quests.q003.stage"},"right":"completed"}]}`。操作条件：`true`。

物語の現在場面・補給後の再開先を呼び出す入口。本編全文は下記へ集約する。

### q003-P-passage

低い通路に残る通行人。実行ID `q003_passage`、起動 `interact`、スクリプト `q003.v11.visit`。

配置：灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・鐘と浮子の点検室・B1 (`region_1_inspection`) / (5, 1) / イベント `q003_passage`。[ダンジョン定義](../../../data/dungeons.json)。

表示条件：`{"op":"eq","left":{"ref":"quests.q003.stage"},"right":"active"}`。操作条件：`true`。

物語の現在場面・補給後の再開先を呼び出す入口。本編全文は下記へ集約する。

## q003 逆流する鐘

依頼人: 水門役人のソラ。地域: 1。いつでも受注できる。

晴天なのに増水警鐘が鳴る。地下の鐘を止めてください。

モデル: 1.1。実装: [JSON](../../../data/quests/q003.json)。場面 9、結末 3。物語状態の改訂 2。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (7, 1) / イベント `q003_decision`。[ダンジョン定義](../../../data/dungeons.json)。逆流する鐘：決着の場。現地イベント。

実配置: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・鐘と浮子の点検室・B1 (`region_1_inspection`) / (5, 1) / イベント `q003_passage`。[ダンジョン定義](../../../data/dungeons.json)。低い通路に残る通行人。現地イベント。

参照施設: `high` → 地下水道上層・待避場 (`hikarigaeri_waterwatch`)。[ロケーション定義](../../../data/locations.json)。

参照施設: `reservoir` → 宿屋裏の汚水槽 (`hikarigaeri_tavern_cistern`)。[ロケーション定義](../../../data/locations.json)。

固定された過去: 宿屋の夜間放水量が増え、下流に逆流が生じた。鐘と浮子は故障していない。

AI向け注釈: 以下の事実はq003を成立させる世界設定上の制約だ。 これらを台詞、説明、選択肢としてシナリオへ直接反映する必要はない。ただし、生成・改稿時に矛盾させてはいけない。

世界設定上の事実:

地下都市は上層居住区と下層通路に分かれ、下層通路の脇を古い共同排水路が通っている。

町には十分な上水道がなく、水売りが井戸水を樽で運んで上層施設へ販売する。宿屋は浴場、洗濯場、炊事場を持つ大口需要者だ。

宿屋は使用済みの水を汚水槽へ溜め、客が寝た深夜に共同排水路へ放流する。宿屋の規模拡大によって一度の放水量が下流管の処理能力を超え、水が下層通路側へ逆流するようになった。

下層通路には、排水路の水位上昇を浮子と鎖で検知する機械式警鐘がある。本来は豪雨や水門故障による増水を知らせる設備であり、本件でも故障せず人工的な増水を正しく検知している。

放水量を減らすと宿屋が購入する水量も減るため、水売りの売上が落ちる。残りの排水を処理能力に合わせて分散するには、給水、浴場使用、洗濯、放水の時間を調整する必要があり、宿屋には給水時刻の制約が残る。

進行: 通路の退避を先に確保し、鐘の機構・上流の運用・人手の監視を別々に扱う。

### q003 実体と初期の所在

実体: party (`party`)。初期の所在・保持者: 低所の鐘室 (`alarm`)。

実体: ソラ (`sora`)。初期の所在・保持者: 低所の鐘室 (`alarm`)。

実体: 通行人たち (`passers`)。初期の所在・保持者: 冠水しかけた通路 (`passage`)。

実体: 宿屋の主人 (`innkeeper`)。初期の所在・保持者: 宿屋裏の汚水槽 (`reservoir`)。

実体: 水売り (`seller`)。初期の所在・保持者: 宿屋裏の汚水槽 (`reservoir`)。

実体: bell (`bell`)。初期の所在・保持者: 低所の鐘室 (`alarm`)。

実体: float (`float`)。初期の所在・保持者: 低所の鐘室 (`alarm`)。

実体: 水位見張り当番 (`watch`)。初期の所在・保持者: 高所の待避場 (`high`)。

### q003 / entry — 低所の鐘室

実装場面: `q003.v11.entry`。

イベントID: `q003-S-entry`。

場面の現在地: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (7, 1) / イベント `q003_decision`。[ダンジョン定義](../../../data/dungeons.json)。

登場: ソラ。

鐘が鳴るたび、ソラは鎖を押さえる。「鳴り続けたら、誰も聞かなくなる」。低い通路には、まだ荷を運ぶ人がいる。

選択 `warn`: 低い通路へ向かい、残っている通行人に声を掛ける

出発: `entry_warn`。移動先: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・鐘と浮子の点検室・B1 (`region_1_inspection`) / (5, 1) / イベント `q003_passage`。[ダンジョン定義](../../../data/dungeons.json)。

この選択は出発処理だけを確定します。町では目的の施設へ入り、ダンジョンでは目的セルを踏むと自動で [`warning`](#q003--warning--冠水しかけた通路) へ進み、到着時の処理を確定します。

### q003 / safe — 低所の鐘室

実装場面: `q003.v11.safe`。

イベントID: `q003-S-safe`。

場面の現在地: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (7, 1) / イベント `q003_decision`。[ダンジョン定義](../../../data/dungeons.json)。

登場: ソラ。

通行人は高所へ出た。閉鎖札の向こうで水が階段を上がる。鐘を止めても、水は引かない。

選択 `inspect`: 浮子と鎖を動かして作動を確かめる

行為: `safe_inspect`。

進行先: [`mechanism`](#q003--mechanism--低所の鐘室)。

選択 `cut`: 閉鎖を維持したまま鐘の鎖を切る

行為: `safe_cut`。

進行先: [結末 `contract`](#q003-結末-contract--通路を閉じて鐘を止める)。

選択 `upstream`: 水の来る方向をたどり、宿屋裏へ向かう

出発: `safe_upstream`。移動先: 宿屋裏の汚水槽 (`hikarigaeri_tavern_cistern`)。[ロケーション定義](../../../data/locations.json)。

この選択は出発処理だけを確定します。町では目的の施設へ入り、ダンジョンでは目的セルを踏むと自動で [`reservoir`](#q003--reservoir--宿屋裏の汚水槽) へ進み、到着時の処理を確定します。

### q003 / mechanism — 低所の鐘室

実装場面: `q003.v11.mechanism`。

イベントID: `q003-S-mechanism`。

場面の現在地: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (7, 1) / イベント `q003_decision`。[ダンジョン定義](../../../data/dungeons.json)。

登場: ソラ。

浮子を持ち上げると鐘が鳴り、下げると止まる。機構は正常だ。ソラは水位線を指した。「直すなら、こっちです」。

選択 `upstream`: 高所の道を通って汚水槽へ向かう

出発: `mechanism_upstream`。移動先: 宿屋裏の汚水槽 (`hikarigaeri_tavern_cistern`)。[ロケーション定義](../../../data/locations.json)。

この選択は出発処理だけを確定します。町では目的の施設へ入り、ダンジョンでは目的セルを踏むと自動で [`reservoir`](#q003--reservoir--宿屋裏の汚水槽) へ進み、到着時の処理を確定します。

選択 `relay`: 鐘を高所へ運び、水位を伝える当番を組む

出発: `mechanism_relay`。移動先: 地下水道上層・待避場 (`hikarigaeri_waterwatch`)。[ロケーション定義](../../../data/locations.json)。

この選択は出発処理だけを確定します。町では目的の施設へ入り、ダンジョンでは目的セルを踏むと自動で [`relay`](#q003--relay--高所の待避場) へ進み、到着時の処理を確定します。

### q003 / reservoir — 宿屋裏の汚水槽

実装場面: `q003.v11.reservoir`。

イベントID: `q003-S-reservoir`。

場面の現在地: 宿屋裏の汚水槽 (`hikarigaeri_tavern_cistern`)。[ロケーション定義](../../../data/locations.json)。

登場: 宿屋の主人・水売り。

汚水槽の放流記録は、下流の増水時刻と一致した。宿屋は浴場と洗濯場を広げてから、使用済みの水を深夜にまとめて捨てている。「使う水を減らすなら、風呂も洗濯も今まで通りにはいかない」。井戸水を樽で届ける水売りも、注文が減ると困ると答えた。

選択 `agree`: 夜間の放水量を減らし、残りを時間分散する合意を取る

出発: `reservoir_agree`。移動先: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (7, 1) / イベント `q003_decision`。[ダンジョン定義](../../../data/dungeons.json)。

この選択は出発処理だけを確定します。町では目的の施設へ入り、ダンジョンでは目的セルを踏むと自動で [`test`](#q003--test--低所の鐘室) へ進み、到着時の処理を確定します。

選択 `relay`: 放水は変えず、鐘室へ戻って鐘とソラを迎えに行く

出発: `reservoir_relay`。移動先: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (7, 1) / イベント `q003_decision`。[ダンジョン定義](../../../data/dungeons.json)。

この選択は出発処理だけを確定します。町では目的の施設へ入り、ダンジョンでは目的セルを踏むと自動で [`collect`](#q003--collect--低所の鐘室) へ進み、到着時の処理を確定します。

### q003 / test — 低所の鐘室

実装場面: `q003.v11.test`。

イベントID: `q003-S-test`。

場面の現在地: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (7, 1) / イベント `q003_decision`。[ダンジョン定義](../../../data/dungeons.json)。

登場: ソラ。

取り決めた夜が来た。ソラが浮子を見張り、あなたは時刻と水位を記録する。上流の約束だけで、成功とはしない。

選択 `verify`: 一晩の運用試験を終え、水位と鐘の復帰を確認する

行為: `test_verify`。

進行先: [結末 `informed`](#q003-結末-informed--放水の合意と運用試験)。

### q003 / relay — 高所の待避場

実装場面: `q003.v11.relay`。

イベントID: `q003-S-relay`。

場面の現在地: 地下水道上層・待避場 (`hikarigaeri_waterwatch`)。[ロケーション定義](../../../data/locations.json)。

登場: ソラ・水位見張り当番。

ここに浮子はつながっていない。水位を見る係と鐘を鳴らす係を分け、見張りは危険な通路に降りず、鐘室の高い窓から水位線を読む。

選択 `roster`: 当番の承諾を取り、伝令と鐘の連絡を実地に試す

行為: `relay_roster`。

進行先: [結末 `compromise`](#q003-結末-compromise--高所の鐘と見張りの交代制)。

### q003 / warning — 冠水しかけた通路

実装場面: `q003.v11.warning`。

イベントID: `q003-S-warning`。

場面の現在地: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・鐘と浮子の点検室・B1 (`region_1_inspection`) / (5, 1) / イベント `q003_passage`。[ダンジョン定義](../../../data/dungeons.json)。

登場: 通行人たち。

水が荷車の車輪を洗っている。通行人たちは荷を捨てるか迷い、まだ低い通路に残っていた。まず全員を上層の待避場へ連れていく。

選択 `escort`: 通行人を連れ、入口を経て上層の待避場へ避難する

出発: `warning_escort`。移動先: 地下水道上層・待避場 (`hikarigaeri_waterwatch`)。[ロケーション定義](../../../data/locations.json)。

この選択は出発処理だけを確定します。町では目的の施設へ入り、ダンジョンでは目的セルを踏むと自動で [`evacuated`](#q003--evacuated--高所の待避場) へ進み、到着時の処理を確定します。

### q003 / evacuated — 高所の待避場

実装場面: `q003.v11.evacuated`。

イベントID: `q003-S-evacuated`。

場面の現在地: 地下水道上層・待避場 (`hikarigaeri_waterwatch`)。[ロケーション定義](../../../data/locations.json)。

登場: 通行人たち・水位見張り当番。

通行人全員が上層の待避場へ着いた。見張りへ人数と通路の危険を伝え、下り口に閉鎖札を掛ける。鐘の調査には、再び地下の鐘室へ戻る必要がある。

選択 `return`: 見張りに避難者を任せ、鐘室へ戻る

出発: `evacuated_return`。移動先: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (7, 1) / イベント `q003_decision`。[ダンジョン定義](../../../data/dungeons.json)。

この選択は出発処理だけを確定します。町では目的の施設へ入り、ダンジョンでは目的セルを踏むと自動で [`safe`](#q003--safe--低所の鐘室) へ進み、到着時の処理を確定します。

### q003 / collect — 低所の鐘室

実装場面: `q003.v11.collect`。

イベントID: `q003-S-collect`。

場面の現在地: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (7, 1) / イベント `q003_decision`。[ダンジョン定義](../../../data/dungeons.json)。

登場: ソラ。

鐘室へ戻った。鐘もソラもここにいる。上層へ運ぶなら、まず浮子から鐘を外し、ソラと一緒に持ち出す。

選択 `carry`: 鐘を受け取り、ソラと上層の待避場へ運ぶ

出発: `collect_carry`。移動先: 地下水道上層・待避場 (`hikarigaeri_waterwatch`)。[ロケーション定義](../../../data/locations.json)。

この選択は出発処理だけを確定します。町では目的の施設へ入り、ダンジョンでは目的セルを踏むと自動で [`relay`](#q003--relay--高所の待避場) へ進み、到着時の処理を確定します。

### q003 結末 informed — 放水の合意と運用試験

イベントID: `q003-E-informed`。

夜間放水を減らし、残りを時間分散した。試験の間、水位は危険線を越えず、正常な鐘は静かになった。水売りの売上は減り、宿屋にも給水時刻の制約が残る。

57G / 68EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q003.values.warned"},"right":true},{"op":"eq","left":{"ref":"stories.q003.values.agreement"},"right":true},{"op":"eq","left":{"ref":"stories.q003.values.tested"},"right":true},{"op":"eq","left":{"ref":"stories.q003.values.bellAt"},"right":"alarm"}]}`

### q003 結末 contract — 通路を閉じて鐘を止める

イベントID: `q003-E-contract`。

鎖を切ると鐘は止まった。閉鎖した低い通路には水が流れ込み続ける。ソラは閉鎖札を外さず、機械の警報を失った水位線を見張った。

77G / 47EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q003.values.warned"},"right":true},{"op":"eq","left":{"ref":"stories.q003.values.chainCut"},"right":true}]}`

### q003 結末 compromise — 高所の鐘と見張りの交代制

イベントID: `q003-E-compromise`。

高所の鐘は人が鳴らす警報になった。水位の監視、伝令、鐘番の当番が引き受けられ、連絡試験を終えた。逆流そのものは残り、人手を絶やせない。

37G / 51EXP

物語の結末条件: `{"op":"and","args":[{"op":"eq","left":{"ref":"stories.q003.values.warned"},"right":true},{"op":"eq","left":{"ref":"stories.q003.values.bellAt"},"right":"high"},{"op":"eq","left":{"ref":"stories.q003.values.relay"},"right":true}]}`

## 状態項目と初期値

`partyAt`：party の所在または保持者。型 `enum`、初期値 `"alarm"`、許容値 `["alarm","passage","high","reservoir","transit"]`。

`soraAt`：sora の所在または保持者。型 `enum`、初期値 `"alarm"`、許容値 `["alarm","passage","high","reservoir","transit"]`。

`passersAt`：passers の所在または保持者。型 `enum`、初期値 `"passage"`、許容値 `["alarm","passage","high","reservoir","transit"]`。

`innkeeperAt`：innkeeper の所在または保持者。型 `enum`、初期値 `"reservoir"`、許容値 `["alarm","passage","high","reservoir","transit"]`。

`sellerAt`：seller の所在または保持者。型 `enum`、初期値 `"reservoir"`、許容値 `["alarm","passage","high","reservoir","transit"]`。

`bellAt`：bell の所在または保持者。型 `enum`、初期値 `"alarm"`、許容値 `["alarm","passage","high","reservoir","transit","party","sora","passers","innkeeper","seller","float","watch"]`。

`floatAt`：float の所在または保持者。型 `enum`、初期値 `"alarm"`、許容値 `["alarm","passage","high","reservoir","transit","party","sora","passers","innkeeper","seller","bell","watch"]`。

`watchAt`：watch の所在または保持者。型 `enum`、初期値 `"high"`、許容値 `["alarm","passage","high","reservoir","transit"]`。

`warned`：warned。型 `boolean`、初期値 `false`。

`mechanismChecked`：mechanismChecked。型 `boolean`、初期値 `false`。

`causeKnown`：causeKnown。型 `boolean`、初期値 `false`。

`agreement`：agreement。型 `boolean`、初期値 `false`。

`tested`：tested。型 `boolean`、初期値 `false`。

`chainCut`：chainCut。型 `boolean`、初期値 `false`。

`relay`：relay。型 `boolean`、初期値 `false`。

## 行為の条件と状態変化

本文の選択と行為IDを対応させ、効果を実行順で記す。条件式は配布JSONの値。資材・所持金不足では支払いも受け渡しも確定しない。実移動では出発効果と到着効果を分ける。

### 行為 entry_warn

[q003-S-entry](#q003--entry--低所の鐘室) → [q003-S-warning](#q003--warning--冠水しかけた通路)。条件 `true`。費用：なし。一度だけ確定する。

移動先：灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・鐘と浮子の点検室・B1 (`region_1_inspection`) / (5, 1) / イベント `q003_passage`。[ダンジョン定義](../../../data/dungeons.json)。同行者：探索隊のみ。

出発時の効果：

追加効果なし。移動中の記録を保持する。

到着時の効果：

移動：探索隊 (`party`)。移動中（現在地はワールド状態） (`transit`) → 冠水しかけた通路 (`passage`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 safe_inspect

[q003-S-safe](#q003--safe--低所の鐘室) → [q003-S-mechanism](#q003--mechanism--低所の鐘室)。条件 `true`。費用：なし。一度だけ確定する。

認識獲得：探索隊 (`party`) が 浮子 (`float`) から `mechanism`（鐘は増水を正しく知らせている）を知る。観察条件 `true`。

状態更新：`mechanismChecked` = `true`。

### 行為 safe_cut

[q003-S-safe](#q003--safe--低所の鐘室) → [q003-E-contract](#q003-結末-contract--通路を閉じて鐘を止める)。条件 `true`。費用：なし。一度だけ確定する。

状態更新：`chainCut` = `true`。

### 行為 safe_upstream

[q003-S-safe](#q003--safe--低所の鐘室) → [q003-S-reservoir](#q003--reservoir--宿屋裏の汚水槽)。条件 `true`。費用：なし。一度だけ確定する。

移動先：宿屋裏の汚水槽 (`hikarigaeri_tavern_cistern`)。[ロケーション定義](../../../data/locations.json)。同行者：探索隊のみ。

出発時の効果：

追加効果なし。移動中の記録を保持する。

到着時の効果：

移動：探索隊 (`party`)。移動中（現在地はワールド状態） (`transit`) → 宿屋裏の汚水槽 (`reservoir`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

認識獲得：探索隊 (`party`) が 宿屋の主人 (`innkeeper`) から `cause`（宿屋の夜間放水が下流へ逆流している）を知る。観察条件 `true`。

状態更新：`causeKnown` = `true`。

### 行為 mechanism_upstream

[q003-S-mechanism](#q003--mechanism--低所の鐘室) → [q003-S-reservoir](#q003--reservoir--宿屋裏の汚水槽)。条件 `true`。費用：なし。一度だけ確定する。

移動先：宿屋裏の汚水槽 (`hikarigaeri_tavern_cistern`)。[ロケーション定義](../../../data/locations.json)。同行者：探索隊のみ。

出発時の効果：

追加効果なし。移動中の記録を保持する。

到着時の効果：

移動：探索隊 (`party`)。移動中（現在地はワールド状態） (`transit`) → 宿屋裏の汚水槽 (`reservoir`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

認識獲得：探索隊 (`party`) が 宿屋の主人 (`innkeeper`) から `cause`（宿屋の夜間放水が下流へ逆流している）を知る。観察条件 `true`。

状態更新：`causeKnown` = `true`。

### 行為 mechanism_relay

[q003-S-mechanism](#q003--mechanism--低所の鐘室) → [q003-S-relay](#q003--relay--高所の待避場)。条件 `true`。費用：なし。一度だけ確定する。

移動先：地下水道上層・待避場 (`hikarigaeri_waterwatch`)。[ロケーション定義](../../../data/locations.json)。同行者：ソラ (`sora`)。

出発時の効果：

受け渡し：警鐘 (`bell`) を 低所の鐘室 (`alarm`) から 探索隊 (`party`) へ。

到着時の効果：

移動：探索隊 (`party`)・ソラ (`sora`)。移動中（現在地はワールド状態） (`transit`) → 高所の待避場 (`high`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：警鐘 (`bell`) を 探索隊 (`party`) から 高所の待避場 (`high`) へ。

### 行為 reservoir_agree

[q003-S-reservoir](#q003--reservoir--宿屋裏の汚水槽) → [q003-S-test](#q003--test--低所の鐘室)。条件 `true`。費用：なし。一度だけ確定する。

移動先：灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (7, 1) / イベント `q003_decision`。[ダンジョン定義](../../../data/dungeons.json)。同行者：探索隊のみ。

出発時の効果：

状態更新：`agreement` = `true`。

到着時の効果：

移動：探索隊 (`party`)。移動中（現在地はワールド状態） (`transit`) → 低所の鐘室 (`alarm`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 reservoir_relay

[q003-S-reservoir](#q003--reservoir--宿屋裏の汚水槽) → [q003-S-collect](#q003--collect--低所の鐘室)。条件 `true`。費用：なし。一度だけ確定する。

移動先：灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (7, 1) / イベント `q003_decision`。[ダンジョン定義](../../../data/dungeons.json)。同行者：探索隊のみ。

出発時の効果：

追加効果なし。移動中の記録を保持する。

到着時の効果：

移動：探索隊 (`party`)。移動中（現在地はワールド状態） (`transit`) → 低所の鐘室 (`alarm`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 test_verify

[q003-S-test](#q003--test--低所の鐘室) → [q003-E-informed](#q003-結末-informed--放水の合意と運用試験)。条件 `true`。費用：なし。一度だけ確定する。

状態更新：`tested` = `true`。

### 行為 relay_roster

[q003-S-relay](#q003--relay--高所の待避場) → [q003-E-compromise](#q003-結末-compromise--高所の鐘と見張りの交代制)。条件 `true`。費用：なし。一度だけ確定する。

状態更新：`relay` = `true`。

### 行為 warning_escort

[q003-S-warning](#q003--warning--冠水しかけた通路) → [q003-S-evacuated](#q003--evacuated--高所の待避場)。条件 `true`。費用：なし。一度だけ確定する。

移動先：地下水道上層・待避場 (`hikarigaeri_waterwatch`)。[ロケーション定義](../../../data/locations.json)。同行者：通行人たち (`passers`)。

出発時の効果：

追加効果なし。移動中の記録を保持する。

到着時の効果：

移動：探索隊 (`party`)・通行人たち (`passers`)。移動中（現在地はワールド状態） (`transit`) → 高所の待避場 (`high`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

状態更新：`warned` = `true`。

### 行為 evacuated_return

[q003-S-evacuated](#q003--evacuated--高所の待避場) → [q003-S-safe](#q003--safe--低所の鐘室)。条件 `true`。費用：なし。一度だけ確定する。

移動先：灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (7, 1) / イベント `q003_decision`。[ダンジョン定義](../../../data/dungeons.json)。同行者：探索隊のみ。

出発時の効果：

追加効果なし。移動中の記録を保持する。

到着時の効果：

移動：探索隊 (`party`)。移動中（現在地はワールド状態） (`transit`) → 低所の鐘室 (`alarm`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

### 行為 collect_carry

[q003-S-collect](#q003--collect--低所の鐘室) → [q003-S-relay](#q003--relay--高所の待避場)。条件 `true`。費用：なし。一度だけ確定する。

移動先：地下水道上層・待避場 (`hikarigaeri_waterwatch`)。[ロケーション定義](../../../data/locations.json)。同行者：ソラ (`sora`)。

出発時の効果：

受け渡し：警鐘 (`bell`) を 低所の鐘室 (`alarm`) から 探索隊 (`party`) へ。

到着時の効果：

移動：探索隊 (`party`)・ソラ (`sora`)。移動中（現在地はワールド状態） (`transit`) → 高所の待避場 (`high`)。介助者 探索隊 (`party`)、運搬者 探索隊 (`party`)。

受け渡し：警鐘 (`bell`) を 探索隊 (`party`) から 高所の待避場 (`high`) へ。

## 資材不足・戦闘後の再開・保存

現行の作業別資材不足ルートはない。条件付きの選択肢と行為条件は本編全文・行為一覧を参照する。

共通の中断選択肢はない。メッセージ・判断の途中で閉じた場合は通常の保存位置から再開する。戦闘の逃走・敗北後は本編記載の継続命令に従い、勝利後の作業・費用を先に確定しない。q001固有の老人遭遇への巻戻しを、この依頼にも実装済みとは扱わない。

## 編集時の確認事項

通行人の待避場への到着前にwarnedを成立させない。鐘室へ戻るまでは浮子の調査を完了させない。

鐘の運搬はalarm→party→highの受け渡しとソラの同行を伴う。宿屋に鐘やソラが現れない。

agreementとtestedを混同しない。鐘と浮子の故障を原因として書き換えない。

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
<summary>参照施設と親ロケーション</summary>

```json
{
  "hikarigaeri_waterwatch": {
    "id": "hikarigaeri_waterwatch",
    "name": "地下水道上層・待避場",
    "parent": "hikarigaeri_square",
    "description": "低い通路から上がった者が身を寄せる、町側の待避場。見張りが下り口と水位の報告を受け持つ。",
    "background": "location_square",
    "links": []
  },
  "hikarigaeri_tavern_cistern": {
    "id": "hikarigaeri_tavern_cistern",
    "name": "宿屋裏の汚水槽",
    "parent": "hikarigaeri_tavern",
    "description": "宿の裏手にある排水設備。使用済みの水を溜め、決めた時刻に共同排水路へ流している。",
    "background": "location_tavern",
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
  },
  "hikarigaeri_tavern": {
    "id": "hikarigaeri_tavern",
    "name": "帰り火亭",
    "parent": "hikarigaeri_square",
    "description": "食卓の灯が揺れる。仲間を探し、宿で身体を休められる。",
    "background": "location_tavern",
    "links": [],
    "party": true,
    "services": [
      "inn",
      "recruit"
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
    "id": "q003_decision",
    "title": "逆流する鐘：決着の場",
    "points": [
      {
        "map": "region_1_landing",
        "x": 7,
        "y": 1,
        "dungeon": "region_1"
      }
    ],
    "kind": "decision",
    "trigger": "interact",
    "safe": true,
    "script": "q003.v11.visit",
    "role": "decision",
    "visibleWhen": {
      "op": "or",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "quests.q003.stage"
          },
          "right": "active"
        },
        {
          "op": "eq",
          "left": {
            "ref": "quests.q003.stage"
          },
          "right": "completed"
        }
      ]
    },
    "dungeon": "region_1"
  },
  {
    "id": "q003_passage",
    "title": "低い通路に残る通行人",
    "points": [
      {
        "map": "region_1_inspection",
        "x": 5,
        "y": 1,
        "dungeon": "region_1"
      }
    ],
    "kind": "decision",
    "trigger": "interact",
    "script": "q003.v11.visit",
    "visibleWhen": {
      "op": "eq",
      "left": {
        "ref": "quests.q003.stage"
      },
      "right": "active"
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
    "alarm": "低所の鐘室",
    "passage": "冠水しかけた通路",
    "high": "高所の待避場",
    "reservoir": "宿屋裏の汚水槽",
    "transit": "移動中（現在地はワールド状態）"
  },
  "connections": [
    [
      "alarm",
      "passage"
    ],
    [
      "alarm",
      "high"
    ],
    [
      "high",
      "reservoir"
    ],
    [
      "transit",
      "alarm"
    ],
    [
      "transit",
      "passage"
    ],
    [
      "transit",
      "high"
    ],
    [
      "transit",
      "reservoir"
    ]
  ],
  "registry": {
    "partyAt": {
      "type": "enum",
      "initial": "alarm",
      "values": [
        "alarm",
        "passage",
        "high",
        "reservoir",
        "transit"
      ],
      "meaning": "party の所在または保持者"
    },
    "soraAt": {
      "type": "enum",
      "initial": "alarm",
      "values": [
        "alarm",
        "passage",
        "high",
        "reservoir",
        "transit"
      ],
      "meaning": "sora の所在または保持者"
    },
    "passersAt": {
      "type": "enum",
      "initial": "passage",
      "values": [
        "alarm",
        "passage",
        "high",
        "reservoir",
        "transit"
      ],
      "meaning": "passers の所在または保持者"
    },
    "innkeeperAt": {
      "type": "enum",
      "initial": "reservoir",
      "values": [
        "alarm",
        "passage",
        "high",
        "reservoir",
        "transit"
      ],
      "meaning": "innkeeper の所在または保持者"
    },
    "sellerAt": {
      "type": "enum",
      "initial": "reservoir",
      "values": [
        "alarm",
        "passage",
        "high",
        "reservoir",
        "transit"
      ],
      "meaning": "seller の所在または保持者"
    },
    "bellAt": {
      "type": "enum",
      "initial": "alarm",
      "values": [
        "alarm",
        "passage",
        "high",
        "reservoir",
        "transit",
        "party",
        "sora",
        "passers",
        "innkeeper",
        "seller",
        "float",
        "watch"
      ],
      "meaning": "bell の所在または保持者"
    },
    "floatAt": {
      "type": "enum",
      "initial": "alarm",
      "values": [
        "alarm",
        "passage",
        "high",
        "reservoir",
        "transit",
        "party",
        "sora",
        "passers",
        "innkeeper",
        "seller",
        "bell",
        "watch"
      ],
      "meaning": "float の所在または保持者"
    },
    "watchAt": {
      "type": "enum",
      "initial": "high",
      "values": [
        "alarm",
        "passage",
        "high",
        "reservoir",
        "transit"
      ],
      "meaning": "watch の所在または保持者"
    },
    "warned": {
      "type": "boolean",
      "initial": false,
      "meaning": "warned"
    },
    "mechanismChecked": {
      "type": "boolean",
      "initial": false,
      "meaning": "mechanismChecked"
    },
    "causeKnown": {
      "type": "boolean",
      "initial": false,
      "meaning": "causeKnown"
    },
    "agreement": {
      "type": "boolean",
      "initial": false,
      "meaning": "agreement"
    },
    "tested": {
      "type": "boolean",
      "initial": false,
      "meaning": "tested"
    },
    "chainCut": {
      "type": "boolean",
      "initial": false,
      "meaning": "chainCut"
    },
    "relay": {
      "type": "boolean",
      "initial": false,
      "meaning": "relay"
    }
  },
  "entities": {
    "party": {
      "holder": "partyAt",
      "kind": "group"
    },
    "sora": {
      "holder": "soraAt",
      "kind": "person",
      "character": "sora"
    },
    "passers": {
      "holder": "passersAt",
      "kind": "group",
      "character": "passers"
    },
    "innkeeper": {
      "holder": "innkeeperAt",
      "kind": "person",
      "character": "innkeeper"
    },
    "seller": {
      "holder": "sellerAt",
      "kind": "person",
      "character": "seller"
    },
    "bell": {
      "holder": "bellAt",
      "kind": "item"
    },
    "float": {
      "holder": "floatAt",
      "kind": "item"
    },
    "watch": {
      "holder": "watchAt",
      "kind": "group",
      "character": "waterwatch"
    }
  },
  "propositions": {
    "mechanism": {
      "text": "鐘は増水を正しく知らせている"
    },
    "cause": {
      "text": "宿屋の夜間放水が下流へ逆流している"
    }
  },
  "initialKnowledge": {},
  "invariants": [],
  "scenes": {
    "entry": {
      "title": "低所の鐘室",
      "place": "alarm",
      "cast": [
        {
          "entity": "sora"
        }
      ],
      "requires": true
    },
    "safe": {
      "title": "低所の鐘室",
      "place": "alarm",
      "cast": [
        {
          "entity": "sora"
        }
      ],
      "requires": true
    },
    "mechanism": {
      "title": "低所の鐘室",
      "place": "alarm",
      "cast": [
        {
          "entity": "sora"
        }
      ],
      "requires": true
    },
    "reservoir": {
      "title": "宿屋裏の汚水槽",
      "place": "reservoir",
      "cast": [
        {
          "entity": "innkeeper"
        },
        {
          "entity": "seller"
        }
      ],
      "requires": true
    },
    "test": {
      "title": "低所の鐘室",
      "place": "alarm",
      "cast": [
        {
          "entity": "sora"
        }
      ],
      "requires": true
    },
    "relay": {
      "title": "高所の待避場",
      "place": "high",
      "cast": [
        {
          "entity": "sora"
        },
        {
          "entity": "watch"
        }
      ],
      "requires": true
    },
    "warning": {
      "title": "冠水しかけた通路",
      "place": "passage",
      "cast": [
        {
          "entity": "passers"
        }
      ],
      "requires": true
    },
    "evacuated": {
      "title": "高所の待避場",
      "place": "high",
      "cast": [
        {
          "entity": "passers"
        },
        {
          "entity": "watch"
        }
      ],
      "requires": true
    },
    "collect": {
      "title": "低所の鐘室",
      "place": "alarm",
      "cast": [
        {
          "entity": "sora"
        }
      ],
      "requires": true
    }
  },
  "actions": {
    "entry_warn": {
      "from": [
        "entry"
      ],
      "to": "warning",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "transit",
            "passage"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true,
      "journey": {
        "to": "passage",
        "companions": []
      },
      "depart": []
    },
    "safe_inspect": {
      "from": [
        "safe"
      ],
      "to": "mechanism",
      "requires": true,
      "effects": [
        {
          "op": "observe",
          "observer": "party",
          "proposition": "mechanism",
          "source": "float",
          "requires": true
        },
        {
          "op": "set",
          "key": "mechanismChecked",
          "value": true
        }
      ],
      "once": true
    },
    "safe_cut": {
      "from": [
        "safe"
      ],
      "ending": "contract",
      "requires": true,
      "effects": [
        {
          "op": "set",
          "key": "chainCut",
          "value": true
        }
      ],
      "once": true
    },
    "safe_upstream": {
      "from": [
        "safe"
      ],
      "to": "reservoir",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "transit",
            "reservoir"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "cause",
          "source": "innkeeper",
          "requires": true
        },
        {
          "op": "set",
          "key": "causeKnown",
          "value": true
        }
      ],
      "once": true,
      "journey": {
        "to": "reservoir",
        "companions": []
      },
      "depart": []
    },
    "mechanism_upstream": {
      "from": [
        "mechanism"
      ],
      "to": "reservoir",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "transit",
            "reservoir"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "observe",
          "observer": "party",
          "proposition": "cause",
          "source": "innkeeper",
          "requires": true
        },
        {
          "op": "set",
          "key": "causeKnown",
          "value": true
        }
      ],
      "once": true,
      "journey": {
        "to": "reservoir",
        "companions": []
      },
      "depart": []
    },
    "mechanism_relay": {
      "from": [
        "mechanism"
      ],
      "to": "relay",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party",
            "sora"
          ],
          "path": [
            "transit",
            "high"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "bell",
          "from": "party",
          "to": "high"
        }
      ],
      "once": true,
      "journey": {
        "to": "high",
        "companions": [
          "sora"
        ]
      },
      "depart": [
        {
          "op": "transfer",
          "entity": "bell",
          "from": "alarm",
          "to": "party"
        }
      ]
    },
    "reservoir_agree": {
      "from": [
        "reservoir"
      ],
      "to": "test",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "transit",
            "alarm"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true,
      "journey": {
        "to": "alarm",
        "companions": []
      },
      "depart": [
        {
          "op": "set",
          "key": "agreement",
          "value": true
        }
      ]
    },
    "reservoir_relay": {
      "from": [
        "reservoir"
      ],
      "to": "collect",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "transit",
            "alarm"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true,
      "journey": {
        "to": "alarm",
        "companions": []
      },
      "depart": []
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
          "key": "tested",
          "value": true
        }
      ],
      "once": true
    },
    "relay_roster": {
      "from": [
        "relay"
      ],
      "ending": "compromise",
      "requires": true,
      "effects": [
        {
          "op": "set",
          "key": "relay",
          "value": true
        }
      ],
      "once": true
    },
    "warning_escort": {
      "from": [
        "warning"
      ],
      "to": "evacuated",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party",
            "passers"
          ],
          "path": [
            "transit",
            "high"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "set",
          "key": "warned",
          "value": true
        }
      ],
      "once": true,
      "journey": {
        "to": "high",
        "companions": [
          "passers"
        ]
      },
      "depart": []
    },
    "evacuated_return": {
      "from": [
        "evacuated"
      ],
      "to": "safe",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party"
          ],
          "path": [
            "transit",
            "alarm"
          ],
          "assistant": "party",
          "carrier": "party"
        }
      ],
      "once": true,
      "journey": {
        "to": "alarm",
        "companions": []
      },
      "depart": []
    },
    "collect_carry": {
      "from": [
        "collect"
      ],
      "to": "relay",
      "requires": true,
      "effects": [
        {
          "op": "move",
          "entities": [
            "party",
            "sora"
          ],
          "path": [
            "transit",
            "high"
          ],
          "assistant": "party",
          "carrier": "party"
        },
        {
          "op": "transfer",
          "entity": "bell",
          "from": "party",
          "to": "high"
        }
      ],
      "once": true,
      "journey": {
        "to": "high",
        "companions": [
          "sora"
        ]
      },
      "depart": [
        {
          "op": "transfer",
          "entity": "bell",
          "from": "alarm",
          "to": "party"
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
            "ref": "stories.q003.values.warned"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q003.values.agreement"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q003.values.tested"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q003.values.bellAt"
          },
          "right": "alarm"
        }
      ]
    },
    "contract": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "stories.q003.values.warned"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q003.values.chainCut"
          },
          "right": true
        }
      ]
    },
    "compromise": {
      "op": "and",
      "args": [
        {
          "op": "eq",
          "left": {
            "ref": "stories.q003.values.warned"
          },
          "right": true
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q003.values.bellAt"
          },
          "right": "high"
        },
        {
          "op": "eq",
          "left": {
            "ref": "stories.q003.values.relay"
          },
          "right": true
        }
      ]
    }
  },
  "worldPlaces": {
    "alarm": {
      "kind": "dungeon",
      "dungeon": "region_1",
      "map": "region_1_landing",
      "x": 7,
      "y": 1,
      "event": "q003_decision"
    },
    "passage": {
      "kind": "dungeon",
      "dungeon": "region_1",
      "map": "region_1_inspection",
      "x": 5,
      "y": 1,
      "event": "q003_passage"
    },
    "high": {
      "kind": "town",
      "location": "hikarigaeri_waterwatch"
    },
    "reservoir": {
      "kind": "town",
      "location": "hikarigaeri_tavern_cistern"
    }
  },
  "revision": 2
}
```

</details>

## 編集元と再生成

本編は [authoring/stories-v11-1.mjs](../../../authoring/stories-v11-1.mjs)、配置は [config/quests/q003.events.json](../../../config/quests/q003.events.json)、配布内容は [data/quests/q003.json](../../../data/quests/q003.json)。地形は [config/connected-maps.json](../../../config/connected-maps.json)、接続・給排水は [config/dungeons/region_1.json](../../../config/dungeons/region_1.json)、施設は [config/locations.json](../../../config/locations.json) を参照する。

解説と確認観点は [authoring/quest-page-notes.mjs](../../../authoring/quest-page-notes.mjs)、ページ構成は [tools/quest-page-details.mjs](../../../tools/quest-page-details.mjs) を編集する。本文を手直しする場合は物語原稿へ反映し、`npm run build:scenarios` で配布データも更新する。文書だけの再生成は `npm run build:catalog`、照合は `npm run check:docs`。`npm run build:docs` 単独は個別ページの本文を保持する。
