# セル・地形状態・境界・配置物カタログ

1.14.0では `map_connections` と `compartment_water` が通常の区画接続・水没を担当します。通常ロードに立体マップはありません。末尾の配置索引は現行データ、以下の立体・潮汐水位の説明は退避実装の保守資料です。現行仕様は [CONNECTED_2D_MAPS.md](CONNECTED_2D_MAPS.md) を参照してください。

確認日: 2026-09-18。対象は作品版1.14.0です。現行の配置索引と、保持している旧地形実装の型を区別して整理しています。2Dマップも継続して保守する対象です。

地形データの文字種は `.`（空）と `#`（密）の二つです。水・足場・扉・植物・術の区域などは、地形に重ねる状態や配置物として定義されています。本書の分類名を、新しい `tile` の値としてJSONへ書き込むことはできません。

各方向の名称と判定順は[セルと境界の仕様](MAP_CELLS_AND_BOUNDARIES.md)、区域への水没操作は[立体地形と水](VOXEL_TERRAIN_AND_WATER.md)、固有環境の概要は[ダンジョン一覧](DUNGEON_CATALOG.md)を参照してください。末尾の配置索引には、件数・座標・実際のID・編集元へのリンクを配布データから生成します。

## 共通の読み方

「通行可」は他の条件も満たす場合の候補です。例えば空セルでも閉じた扉や境界があれば入れません。2Dの通常移動は四方、3Dも通常歩行は同じzの四方です。3Dの上下を含む移動には具体的な経路が必要です。

現行の壁セルは全方向から進入不可で、共有面の人物・水の通過設定は両方向共通です。入口に応じたセル内の出口制限や、一方通行の共有面は未実装です。経路リンクの片方向指定は対応済みですが、現在の立体区画の経路は往復可能です。

同じセルが複数項目に該当します。例えば「空・足場あり・腰までの水・ポンプの操作位置」が同時に成立します。分類ごとの件数を足して、マップの総セル数にしないでください。

## 基礎地形と足場

### 2Dの通路セル：tiles = .

四方から進入し、四方へ退出できる基本の空セルです。2Dでは床のある平面として扱い、セル個別の高さや支持面を持ちません。範囲外、壁、閉じた扉、環境の遮断を移動ごとに検査します。全2Dダンジョンに配置されています。

### 2Dの壁セル：tiles = #

1マス全体を占有する壁・岩・土などです。四方すべてから進入不可で、水門のような薄い境界ではありません。破壊壁や地形パッチの対象になっている場所だけ、現在の地形を `.` へ変更できます。画像が壁以外の見た目でも、`#` の間は通常移動できません。

### 退避3Dの密セル：voxels.layers = #

1立方体全体を占有する岩・土・建材です。六方すべてから人物も水も入れません。上の空セルに床、横の空セルに壁、下の空セルに天井を提供します。貯水立坑に配置されています。掘削対象に指定した立方体だけを空へ変更できます。

### 退避3Dの空セル・足場あり：voxels.layers = .

下が密セル、または下面の `support` がtrueである空間です。水没度5以下か潜水準備済みなら、境界と扉が通行可能な限り同じzから歩いて入れます。梯子などの到着先にもなります。足場があっても水没度6以上なら潜水準備が必要です。

### 退避3Dの空セル・足場なし：穴・縦坑・経路途中

地形は `.` ですが、下が空で下面の支持もない空間です。通常歩行での進入・滞在先にはできません。梯子や縄などの経路途中としては通過でき、経路の終点には別途足場が必要です。水は通水境界に従って入り、下方へ流れることがあります。自動落下はありません。

範囲外はセル種ではありません。人物の移動先にはできず、3Dで下向きの通水可能な開口がつながる場合は排水先として扱います。

## 現行の水路区画と退避した水のあるセル

通常の地下水道は `compartment_water` の区画全体を給水・排水し、`map_connections` の水密扉で入場を制御します。給水中の水路への進入は不可、給排水盤は外の乾いた区画に配置します。セル単位の水壁や完全水没区画への開いた上下接続は作りません。以下の0〜10水没度・潜水・潮汐は退避した旧地下水道・立体マップの定義です。沈没城の空気管理は現役です。

### 乾燥：waterDepth = 0

水による移動制限がない状態です。壁・扉・足場による制限は残ります。貯水立坑は初期水没操作が空で、給水操作から水深が変化します。

### 足元まで：waterDepth = 1

水没度1〜3の浅水です。2Dも3Dも表示用waterDepth=1へ変換します。水面は床上へ描画し、壁や不透明な障害物にはしません。地下水道では濡れと能力・魔法への水位補正を受けます。

### 腰まで：waterDepth = 2

水没度4〜6を表示用waterDepth=2へ変換します。6からは潜水の備えが必要です。描画区分と通行のしきい値を混同しません。

### 完全水没：waterDepth = 3

水没度7〜10を表示用waterDepth=3へ変換します。潜水の備えがなければ通行できず、10では溺死判定を行います。梯子・縄の設置だけでは解除しません。水没は視線を遮る石壁へ変換しません。3Dの地形操作で足元が6〜9になれば実在経路で退避します。2Dのフロア増水ではその場で待機でき、どちらも10では備えがなければ全滅処理を行います。

### 退避したフロアの周期水没：waterworks

灯守の地下水道の2D通路全体です。水没度0〜10を、描画上の0〜3へ変換します。フロアに対応する水門・バルブを閉じると止水・排水します。部分的なtidal／channel区画は廃止しました。時刻、潜水準備、濡れ、魔法、溺死は[水道の仕様](WATERWAYS_SALT_MINE.md)を参照してください。

### 潜水通路：air_supply の water

黒潮の沈没城にある、水中でも移動できる固有環境です。表示水深は3ですが、移動・戦闘開始・ラウンドで空気を消費する既存のルールを使います。空気切れで即座に移動不可になる方式ではなく、窒息の損傷を受けます。一般の3D潜水能力を表すセルではありません。

### 空気溜まり・浮上区画：air_supply の pockets

沈没城の水中候補に重ねる空気の残ったセルです。水深表示は0となり、移動時の空気処理や補給操作で空気を上限へ戻します。浮上装置は新しい空気溜まりを加え、指定した別セルも開通させます。水を隣のセルへ再配分する3D排水処理は行いません。

## 状態で通行が変わるセル

### 破壊できる塩壁：breakable_walls

塩哭きの廃坑の指定壁です。未破壊の間は `#`、指定アイテムまたは技能による破壊後は `.` になります。開通状態は退出後も保存されます。通常の壁すべてを自由に壊せるわけではありません。

### 掘削できる密セル：voxels.devices / dig

貯水立坑の指定立方体です。操作位置から隣接する密セルを、発破薬または岩砕きで空へ変更します。掘削後は水を再配分し、上の足場が失われた場合の退避も判定します。操作位置と掘削対象を取り違えないでください。

### 根橋で開通するセル：plant_garden / bridge

対応する植床に根橋草を植え、生長すると対象セルを `.` にします。採取すると変更が解除され、元の地形に戻ります。隊がその橋にいる間の撤去は拒否します。現在の庭園は2Dの通路変更で、橋の下を別立方体として保持する方式ではありません。

### 茨が塞ぐセル：plant_garden / barrier

塞道茨の生長後に対象セルを `#` にする場所です。採取・伐採で元の地形へ戻ります。隊の現在地を塞ぐ生長は、その場で成熟させず延期します。刺さるダメージ床ではなく、通行不可の地形として実装されています。

### 封印を解くと開通するセル：skill_library の gates.tiles

灰時計の書庫に配置された封鎖通路です。本から借りた対応する開門技能を、操作位置で使用すると対象を `.` にします。通路の開通は永続し、貸出技能自体は書庫を出ると返却されます。操作位置は開通対象と別です。

### 取引で開通するセル：market_pacts の offers.tiles

眠れる地下市場の通行料・物々交換で開く通路です。所持金・材料を満たす取引が成立すると対象を `.` にし、契約と開通を永続保存します。購入窓口と護衛窓口には地形変更がないものもあります。

### 用心棒が塞ぐセル：market_pacts の guards

元は通路ですが、警戒値が指定値以上で未排除の用心棒がいる場合に進入を拒否します。戦って勝利すると、その探索中は通れます。既に隊がそのセルにいるときは、その場を壁扱いして閉じ込めません。ダンジョンを出ると警戒・排除状態はリセットされます。

### 動力扉のセル：power_grid / door

鉄胎の機関廟で、対象装置が接続済みかつ系統が通電中なら指定通路を `.` にします。停止・切断では元の地形へ戻ります。通路上に隊がいる間の停止・切断は拒否します。`map.objects` の鍵付き扉や、3Dの共有面の水門とは別の定義です。

### 天球儀で変わるセル：terrain_shift / manual

星欠けの地下観測所の配置パターンに従い、対象セルを `.` または `#` に切り替えます。プレイヤーが操作位置で切替のタイミングを選びます。現在地が塞がる選択は拒否します。現行は2Dの地形変化で、重力ベクトルや落下計算はありません。

### 巨獣の姿勢で変わるセル：terrain_shift / random

巨獣上の移動集落の足場です。歩行や待機で進むカウントに従い、保存された乱数から次の姿勢を選びます。プレイヤーは発生時刻・姿勢を直接指定できません。通行不能になった現在地からは固定乗降台へ退避します。現行の2D用退避であり、3Dの経路探索による退避とは処理が異なります。

## 共有境界の種類

### 開放された境界：面定義なし

3Dで明示されていない共有面は、人物可・水可・支持なしです。密セルや範囲外へ人物が入れるわけではありません。上下の面が開いているだけでは登下降の手段になりません。

### 固定隔壁：basin_side / transfer_wall

貯水立坑の二つの固定面です。初期閉状態で人物不可・水不可・支持なしとなり、両方向を遮断します。JSONに `open` の値もありますが、`operable: false` なのでゲームの開閉操作でその状態へ移りません。

### 開閉水門：basin_gate / transfer_gate

閉状態は人物不可・水不可、開状態は人物可・水可で、支持はありません。開閉に応じて水を再配分します。閉じただけでは残水を消しません。完全水没・足場なしのセルには、水門を開いても歩いて入れません。

### 排水蓋：drain_hatch

閉状態は人物不可・水不可・支持あり、開状態は人物不可・水可・支持なしです。下面の排水を制御し、開くと床としての支持も失われます。開けても人物がそのまま下へ落ちる仕様ではありません。

### 橋の床板：bridge_3 / bridge_4 / bridge_5

上の空セルを支える固定下面です。現行の閉状態は人物不可・水不可・支持ありです。この「人物不可」は床板を上下に貫通できない意味で、床板の上にいる空セルから横へ歩くことはできます。橋の下には別の空間と水を保持します。

## 移動手段と操作位置

### 常設梯子：fixed_ladder

貯水立坑の `kind: ladder`、`access.kind: fixed` の経路です。具体的な三つの空セルをたどり、上の点検橋へ登り、逆向きにも下りられます。経路途中の足場は要求しませんが、閉じた面・密・完全水没と終点の足場を確認します。

### 設置する渡り縄：rope_route

`kind: rope`、`access.kind: install` の経路です。縄を1個消費して設置すると、以後は追加消費なしで往復できます。設置状態は退出後も保存します。未設置の経路を表示していることは、今すぐ渡れることを意味しません。

### 技能による登攀経路：guided_climb

`kind: rope`、`access.kind: skill` の経路です。対応技能を持つ参加中の行動可能な隊員が隊を誘導し、使用時のMPなどを支払います。位置・経路・技能・費用は支払い前に判定します。現在の配置は往復可能です。

### 階渡りツタの植床：plant_garden / vine

2D庭園の植床です。対応するツタが生長すると、操作によって別マップの指定セルへ移動できます。3Dの `kind: vine` の経路とは別で、現在の2Dツタには途中の立方体列がありません。

### 鏡の転移点：warp_network

礼拝堂の空セルにある操作点です。足元か正面から操作し、指定された鏡のセルへ移動します。乗っただけで自動転送せず、移動先が塞がっていれば転送しません。通常の四方隣接とは別の接続です。

### その他の操作位置

火台、植床・育苗箱、2D水門・バルブ、書物・封印の操作位置、取引窓口、配電盤、浮上装置、修復装置、門番機械、天球儀、追跡者の誘導点は、各部品の座標を持つ操作対象です。操作点があるという理由だけでそのセルを壁にしません。足元か正面からの操作を基本とし、3Dの面ハンドルと給水・掘削装置は高さと間の境界も検査します。

昇降機は通電中の装置を操作して別マップへ移ります。貯水立坑への入口も部品の移送操作です。給水ポンプは指定空セルへ水を追加する装置で、設置場所そのものが水源セルになるわけではありません。各操作点と影響先は末尾の索引で区別しています。

書物は隊員自身の技能一つを封じる代わりに別の技能を貸し、一人一冊、退出時に返却します。育苗箱は種・土の初回支給で、受領済み状態を保存します。取引窓口には通行料・物々交換・アイテム購入・護衛雇用の四種類があります。護衛は一定歩数の遭遇率と敵倍率を抑え、通路の地形は変更しません。

配電盤は容量内で系統を切り替えます。接続装置には動力消費があり、部品の取り外し・再接続で構成を変えられます。修復装置は通電と探索ごとの回数制限を満たす場合に隊を回復します。門番機械は起動や接近で戦闘を起こし、その探索中に倒すと再戦を抑えます。谷の誘導点は追跡者を引きつけ、次に移動した地点で戦闘を起こします。

### 現地調査地点：quest.events.points

ダンジョンの仕掛けと依頼をつなぐ調査の操作点です。関連依頼を受注済みまたは完了済みのとき、足元か正面から選びます。実際の仕掛けの状態によって観察文が変わり、条件を満たす観察を手帳へ記録します。調査地点自体は通行を塞がず、`map.objects.kind` の追加種別でもありません。

## 環境の効果が重なるセル

### 火の影響範囲

篝火の迷宮では、燃焼中の火台から通路をたどる距離内に効果があります。壁・閉じた扉を突き抜ける単純な円形範囲ではありません。くらがり除け、遭遇率、敵倍率は火の種類で変わり、燃料切れや消火で失われます。複数の火の遭遇・敵倍率は優先度で選びます。携帯松明の効果は隊に付随し、固定セル種ではありません。

### 生長した植物の影響範囲

解熱胞子・赤蜜花・静謐苔などの周囲に、回復や遭遇率の効果を重ねます。植床は空・育成中・成熟の状態を持ち、歩行や待機で生長します。現行の範囲判定は同じマップのマンハッタン距離で、火台のような壁を迂回する探索は行いません。複数植物の遭遇倍率は乗算し、回復は各植物について処理します。植物の種類と数値は索引へ生成します。

### 流れを持つセル：vector_curse

帰還者の深淵では、各通路に方向ベクトルを持たせます。出発セルのベクトルに逆らう移動が成立すると弱体化を累積します。直交や順方向の移動では追加しません。移動拒否の壁や強制移動の床ではありません。退出まで累積が残り、戻る方向へ踏み出すほど能力が下がります。

### 術の遮断区域：suppression_zone

祈りの届かない谷の指定セルです。人物は通常どおり出入りできますが、区域内では指定技能の使用を拒否し、指定された技能効果・状態・バフ・装備補正を停止します。対象を永久削除するものではなく、区域外では通常の判定へ戻ります。「境界」という名前でも人物を遮断する壁面ではありません。

塩哭きの廃坑の腐食はダンジョン内の戦闘開始に作用し、腐食床という個別セル配置はありません。隊の毒や携帯光源など、場所ではなく人物・隊に属する状態も、独立したセル種には数えません。

未踏査・踏査済みも表示と記録の状態です。未踏査で見えないセルにも地形と通行条件は存在します。投影値の `known`、`blocked`、`opaque`、`floor` はそれぞれ踏査・通行不可・描画上の遮蔽・床の有無を表し、新しい地形文字種にはなりません。

## セル上のイベントオブジェクト

`map.objects.kind` は地形の文字種とは別です。実際の動作は `trigger`、`blocking`、`safe`、`once`、`condition` と呼び出す `script` で決まります。`safe` は通常のランダム遭遇を抑止しますが、罠・呪い・強制戦闘の全般的な免除ではありません。`once` は実行履歴を保存し、一度実行すると再発火しません。

### 出口：exit

現在の配置は通行を妨げず、調べる操作で町へ戻るスクリプトを呼びます。出口セルへ入っただけでは帰還しません。

### 階段：stairs

現在の配置は通行を妨げず、調べる操作で別マップの指定位置へ移ります。貯水立坑から元の水道へ戻る接続も含みます。3Dの `links.kind: stairs` とは別の仕組みです。

### 宝箱・補給箱：chest

現在の配置は調べるとアイテムを受け取る一回限りの箱です。箱セルへの進入は妨げません。支給内容は個別スクリプトにあり、箱種別だけで報酬を固定しません。

### 泉：fountain

現在の配置は調べると隊を回復し、灯を補充する一回限りの泉です。通行できます。貯水量を持つ水セルでも、給水装置でもありません。

### 罠：trap

現在の配置は「崩れた石床」で、進入が成立した後に一回限りのスクリプトを発火します。隊への損傷とニオへの毒を与えます。床の名称や文章に「崩れ」があっても、実際の地形を穴や密セルに変更する処理はありません。損傷は地域と罠軽減の影響を受けます。

### 鍵付き扉：door

現在の配置は `blocking: true`、初期 `locked` の扉です。開くまでセル全体への進入を拒否し、四方の特定側だけを通す設定ではありません。地域の鍵を所持して調べると、スクリプトが状態を `open` にします。開いた後も下地や他の障害物の判定は残ります。

### 手掛かり・点検札：clue

人物の調査・痕跡・記録・点検札などを調べる場所です。現在の配置は通行を妨げません。受注状態や旧経路フラグなどで発火条件が異なり、定義が置かれていることと現在の探索で有効であることは別です。

### 会話・選択・決着地点：decision

依頼の進行や会話・選択肢を開始する場所です。現在の配置は通行を妨げず、調べる操作から個別シナリオへ接続します。種別名が同じでも、内容や分岐を共通の展開に固定しません。

## 配置されていない形式との区別

3Dの経路 `kind` は ladder / stairs / vine / rope / bridge に対応しています。現在の配置は梯子と縄の経路で、3Dのstairs・vine・bridge経路は配置されていません。橋そのものは支持面の床板として存在し、2Dの階段・ツタも別方式で存在します。

人物を止めて水だけ通す固定格子は現行の面設定で表現できますが、専用の固定格子としての配置はありません。水だけ通す状態は排水蓋の開状態に存在します。一方通行境界・入口依存の出口制限は[拡張仕様](MAP_CELLS_AND_BOUNDARIES.md)に記載した段階で、現行セルとして数えません。

## 更新と照合

本文は挙動を説明する正本です。変更時には[エンジン](../src/core/engine.js)、[立体地形](../src/core/voxels.js)、[固有部品](../src/core/systems)、[描画用の投影](../src/application/dungeon-surfaces.js)と照合します。配置・数値・IDの索引は[集計処理](../tools/cell-catalog.mjs)から生成し、新しいダンジョン部品は対応する集計も追加します。集計処理はゲーム状態を書き換えません。

```sh
npm run build:docs
npm run check:docs
```

<!-- generated:cell-inventory -->

## 配布データから生成した配置索引

作品版1.15.0。以下の件数と配置例は npm run build:docs で更新します。配置定義を数えるため、条件不成立・過去経路のオブジェクトも含みます。空・密の件数は元の地形、足場と水深は初期地形状態です。探索後の地形や同時に有効なイベント数ではありません。

2D 33マップ、3D 0マップ、計33マップ。2Dの空は2784セル、密は3447セルです。

### マップ別の基礎地形

[region_1_f1](../data/maps/region_1_f1.json) 灯守の地下水道・上層・入口操作室：2D、空21・密34。

[region_1_f2](../data/maps/region_1_f2.json) 灯守の地下水道・下層・操作室：2D、空21・密34。

[region_2_f1](../data/maps/region_2_f1.json) 塩哭きの廃坑・地下1層：2D、空132・密153。

[region_2_f2](../data/maps/region_2_f2.json) 塩哭きの廃坑・地下2層：2D、空130・密155。

[region_3_f1](../data/maps/region_3_f1.json) 根喰みの地下庭園・地下1層：2D、空129・密156。

[region_3_f2](../data/maps/region_3_f2.json) 根喰みの地下庭園・地下2層：2D、空130・密155。

[region_4_f1](../data/maps/region_4_f1.json) 鏡沈みの礼拝堂・地下1層：2D、空130・密155。

[region_4_f2](../data/maps/region_4_f2.json) 鏡沈みの礼拝堂・地下2層：2D、空132・密153。

[region_5_f1](../data/maps/region_5_f1.json) 灰時計の書庫・地下1層：2D、空128・密157。

[region_5_f2](../data/maps/region_5_f2.json) 灰時計の書庫・地下2層：2D、空127・密158。

[region_6_f1](../data/maps/region_6_f1.json) 眠れる地下市場・地下1層：2D、空132・密153。

[region_6_f2](../data/maps/region_6_f2.json) 眠れる地下市場・地下2層：2D、空131・密154。

[region_7_f1](../data/maps/region_7_f1.json) 黒潮の沈没城・地下1層：2D、空129・密156。

[region_7_f2](../data/maps/region_7_f2.json) 黒潮の沈没城・地下2層：2D、空131・密154。

[region_8_f1](../data/maps/region_8_f1.json) 鉄胎の機関廟・地下1層：2D、空132・密153。

[region_8_f2](../data/maps/region_8_f2.json) 鉄胎の機関廟・地下2層：2D、空131・密154。

[region_9_f1](../data/maps/region_9_f1.json) 星欠けの地下観測所・地下1層：2D、空129・密156。

[region_9_f2](../data/maps/region_9_f2.json) 星欠けの地下観測所・地下2層：2D、空130・密155。

[region_10_f1](../data/maps/region_10_f1.json) 帰還者の深淵・地下1層：2D、空130・密155。

[region_10_f2](../data/maps/region_10_f2.json) 帰還者の深淵・地下2層：2D、空127・密158。

[kagaribi_f1](../data/maps/kagaribi_f1.json) 篝火の迷宮・灯番の巡回路：2D、空60・密75。

[kagaribi_f2](../data/maps/kagaribi_f2.json) 篝火の迷宮・消えた灯の回廊：2D、空57・密78。

[kagaribi_f3](../data/maps/kagaribi_f3.json) 篝火の迷宮・深火の祭壇：2D、空57・密78。

[prayerless_valley_f1](../data/maps/prayerless_valley_f1.json) 祈りの届かない谷：2D、空54・密63。

[moving_village_f1](../data/maps/moving_village_f1.json) 巨獣上の移動集落：2D、空54・密63。

[region_1_canal_a](../data/maps/region_1_canal_a.json) 灯守の地下水道・上層・第一水路：2D、空9・密24。

[region_1_landing](../data/maps/region_1_landing.json) 灯守の地下水道・上層・荷揚げ場：2D、空21・密34。

[region_1_canal_b](../data/maps/region_1_canal_b.json) 灯守の地下水道・上層・排水支路：2D、空9・密24。

[region_1_inspection](../data/maps/region_1_inspection.json) 灯守の地下水道・上層・鐘と浮子の点検室：2D、空21・密34。

[region_1_canal_c](../data/maps/region_1_canal_c.json) 灯守の地下水道・下層・給金箱の水路：2D、空9・密24。

[region_1_lower_landing](../data/maps/region_1_lower_landing.json) 灯守の地下水道・下層・棺の待避場：2D、空21・密34。

[region_1_canal_d](../data/maps/region_1_canal_d.json) 灯守の地下水道・下層・避難水路：2D、空9・密24。

[region_1_gatehouse](../data/maps/region_1_gatehouse.json) 灯守の地下水道・下層・奥の水門詰所：2D、空21・密34。

### セル上のイベント種別

マップ固有とクエストから投影した map.objects は計511定義、8種、配置座標は509か所です。件数はイベント定義数で、別の種別が同じ座標にある場合があります。safe は通常のランダム遭遇判定の抑止であり、仕掛けやスクリプトによる戦闘まで無効にする値ではありません。

`chest`：20定義。進入時0／調べる20、blocking指定0、safe指定20、once指定20。配置例：`cache` region_1_f1 (1,3) ／ `cache` region_1_f2 (1,3)。

`clue`：199定義。進入時0／調べる199、blocking指定0、safe指定194、once指定0。配置例：`q004_clue_a` region_1_f1 (5,1) ／ `q006_clue_a` region_1_f2 (4,3)。

`decision`：205定義。進入時3／調べる202、blocking指定0、safe指定201、once指定0。配置例：`q101_scene` region_1_f1 (2,1) ／ `q102_scene` region_1_f1 (3,1)。

`door`：20定義。進入時0／調べる20、blocking指定20、safe指定20、once指定0。配置例：`door` region_1_f1 (9,3) ／ `door` region_1_f2 (9,3)。

`exit`：13定義。進入時0／調べる13、blocking指定0、safe指定13、once指定0。配置例：`exit` region_1_f1 (1,1) ／ `exit` region_2_f1 (1,1)。

`fountain`：20定義。進入時0／調べる20、blocking指定0、safe指定20、once指定20。配置例：`fountain` region_1_f1 (5,3) ／ `fountain` region_1_f2 (5,3)。

`stairs`：14定義。進入時0／調べる14、blocking指定0、safe指定14、once指定0。配置例：`stairs` region_4_f1 (12,13) ／ `stairs` region_4_f2 (1,1)。

`trap`：20定義。進入時20／調べる0、blocking指定0、safe指定0、once指定20。配置例：`trap` region_1_f1 (7,3) ／ `trap` region_1_f2 (7,3)。

### ダンジョン固有の状態・操作点

#### 篝火の迷宮 (kagaribi)

定義：[kagaribi.json](../authoring/dungeons/kagaribi.json)。

現地調査 `kagaribi` 灯を受け渡す準備：関連q001、操作点kagaribi_f1 (1,1)。

部品 `fires` / `fire_network` 有効。

火台9か所。`entry` kagaribi_f1 (1,1) ／ `calm` kagaribi_f1 (8,5) ／ `crossroads` kagaribi_f1 (9,7) ／ `landing` kagaribi_f2 (1,1) ／ `lure` kagaribi_f2 (7,3) ／ `refuge` kagaribi_f2 (11,7) ／ `deep_landing` kagaribi_f3 (1,1) ／ `last` kagaribi_f3 (7,3) ／ `origin` kagaribi_f3 (7,7)。

火の効果 `ordinary` 普通の火：くらがり除けなし、通常遭遇率×1、敵倍率×1、優先度0。

火の効果 `ward` くらがり除けの火：くらがり除けあり、通常遭遇率×0、敵倍率×1、優先度10。

火の効果 `calm` 鎮めの火：くらがり除けあり、通常遭遇率×0.5、敵倍率×0.6、優先度20。

火の効果 `lure` 呼び寄せの火：くらがり除けあり、通常遭遇率×2、敵倍率×1.6、優先度30。

火の効果 `deep` 深火の種火：くらがり除けあり、通常遭遇率×0、敵倍率×1、優先度40。

部品 `connections` / `map_connections` 有効。

接続 `floor_1_2` 未探索区画への階段：stairs、kagaribi_f1 (13,7) ↔ kagaribi_f2 (1,1)。扉は壁面、階段は乾いた区画内の足場に配置。

接続 `floor_2_3` 未探索区画への階段：stairs、kagaribi_f2 (13,7) ↔ kagaribi_f3 (1,1)。扉は壁面、階段は乾いた区画内の足場に配置。

#### 巨獣上の移動集落 (moving_village)

定義：[moving_village.json](../authoring/dungeons/moving_village.json)。

現地調査 `moving_village` 暮らしを揺らす足場：関連q194、操作点moving_village_f1 (1,1)。

部品 `terrain` / `terrain_shift` 有効。

自動式。初期状態level、対象4セル、3状態。切替間隔3〜7回。

平らな背 (level)：moving_village_f1 (2,2)=# ／ moving_village_f1 (3,2)=. ／ moving_village_f1 (2,4)=. ／ moving_village_f1 (4,2)=#。

右へ傾く背 (right)：moving_village_f1 (2,2)=. ／ moving_village_f1 (3,2)=. ／ moving_village_f1 (2,4)=# ／ moving_village_f1 (4,2)=.。

左へ傾く背 (left)：moving_village_f1 (2,2)=. ／ moving_village_f1 (3,2)=# ／ moving_village_f1 (2,4)=. ／ moving_village_f1 (4,2)=.。

操作点：配置なし。固定退避点：`fixed_deck` moving_village_f1 (1,1)。

#### 祈りの届かない谷 (prayerless_valley)

定義：[prayerless_valley.json](../authoring/dungeons/prayerless_valley.json)。

現地調査 `prayerless_valley` 境界の内側の祈り：関連q193、操作点prayerless_valley_f1 (4,1) ／ prayerless_valley_f1 (5,1)。

部品 `boundary` / `suppression_zone` 有効。

術の遮断区域36セル。配置例：prayerless_valley_f1 (5,1) ／ prayerless_valley_f1 (6,1)。

使用禁止の戦闘技能：手当の祈り (heal)・薬草の霧 (group_heal)・救護の祈り (greater_heal)・清浄の祈り (purify)・聖護の祈り (holy_guard)・祓いの光 (holy_light)・途切れぬ呪詠 (valley_curse)。探索技能：旅の回復祈祷 (field_prayer)。

効果停止の技能：手当の祈り (heal)・薬草の霧 (group_heal)・救護の祈り (greater_heal)・清浄の祈り (purify)・聖護の祈り (holy_guard)・祓いの光 (holy_light)・途切れぬ呪詠 (valley_curse)。状態：帰らぬ呪い (hollow_curse)。バフ：聖護 (holy_guard)。装備・道具：青石の護符 (focus)。

追跡者の誘導点：prayerless_valley_f1 (4,1)。遭遇valley_roamers。

#### 灯守の地下水道 (region_1)

定義：[region_1.json](../authoring/dungeons/region_1.json)。

現地調査 `region_1` 排水された横道：関連q010、操作点region_1_f1 (2,1)。

部品 `water` / `compartment_water` 有効。

密閉水路 `region_1_canal_a`：初期完全水没・進入禁止、給排水弁 `upper_gate`。セルごとの水壁は作らない。

密閉水路 `region_1_canal_b`：初期完全水没・進入禁止、給排水弁 `upper_valve`。セルごとの水壁は作らない。

密閉水路 `region_1_canal_c`：初期完全水没・進入禁止、給排水弁 `lower_gate`。セルごとの水壁は作らない。

密閉水路 `region_1_canal_d`：初期完全水没・進入禁止、給排水弁 `lower_valve`。セルごとの水壁は作らない。

乾いた操作盤：`upper_gate` region_1_f1 (2,1) ／ `upper_gate` region_1_landing (2,1) ／ `upper_valve` region_1_landing (8,1) ／ `upper_valve` region_1_inspection (2,1) ／ `lower_gate` region_1_f2 (8,1) ／ `lower_gate` region_1_lower_landing (2,1) ／ `lower_valve` region_1_lower_landing (8,1) ／ `lower_valve` region_1_gatehouse (2,1)。

部品 `connections` / `map_connections` 有効。

接続 `upper_inlet` 第一水路の水密扉：watertight_door、region_1_f1 (9,1) ↔ region_1_canal_a (1,1)。扉は壁面、階段は乾いた区画内の足場に配置。

接続 `upper_landing` 荷揚げ場の水密扉：watertight_door、region_1_canal_a (9,1) ↔ region_1_landing (1,1)。扉は壁面、階段は乾いた区画内の足場に配置。

接続 `branch_inlet` 排水支路の水密扉：watertight_door、region_1_landing (9,1) ↔ region_1_canal_b (1,1)。扉は壁面、階段は乾いた区画内の足場に配置。

接続 `branch_outlet` 点検室の水密扉：watertight_door、region_1_canal_b (9,1) ↔ region_1_inspection (1,1)。扉は壁面、階段は乾いた区画内の足場に配置。

接続 `dry_stair` 乾いた階段室：stairs、region_1_landing (5,3) ↔ region_1_f2 (1,1)。扉は壁面、階段は乾いた区画内の足場に配置。

接続 `lower_inlet` 給金箱水路の水密扉：watertight_door、region_1_f2 (9,1) ↔ region_1_canal_c (1,1)。扉は壁面、階段は乾いた区画内の足場に配置。

接続 `lower_landing` 待避場の水密扉：watertight_door、region_1_canal_c (9,1) ↔ region_1_lower_landing (1,1)。扉は壁面、階段は乾いた区画内の足場に配置。

接続 `deep_inlet` 避難水路の水密扉：watertight_door、region_1_lower_landing (9,1) ↔ region_1_canal_d (1,1)。扉は壁面、階段は乾いた区画内の足場に配置。

接続 `deep_outlet` 水門詰所の水密扉：watertight_door、region_1_canal_d (9,1) ↔ region_1_gatehouse (1,1)。扉は壁面、階段は乾いた区画内の足場に配置。

#### 帰還者の深淵 (region_10)

定義：[region_10.json](../authoring/dungeons/region_10.json)。

現地調査 `region_10` 逆らった足取り：関連q100、操作点region_10_f1 (1,1)。

部品 `return_flow` / `vector_curse` 有効。

方向ベクトル257セル。(-1,0)=55 ／ (0,-1)=40 ／ (0,1)=81 ／ (1,0)=81。逆向き移動1回で1重加算、上限100、1重ごと×0.6、対象str/vit/agi/int。

#### 塩哭きの廃坑 (region_2)

定義：[region_2.json](../authoring/dungeons/region_2.json)。

現地調査 `region_2` 塩壁の向こうの退路：関連q011、操作点region_2_f1 (5,1)。

部品 `salt` / `corrosion` 有効。

戦闘開始ごとに装備個体へ塩1を加算。塩4以上でソルトイーターの対象。洗浄地点：region_2_f1 (4,1) ／ region_2_f2 (4,1)。

部品 `walls` / `breakable_walls` 有効。

破壊壁4セル：`upper_entry` region_2_f1 (6,1) ／ `upper_crossing` region_2_f1 (3,6) ／ `lower_entry` region_2_f2 (6,1) ／ `lower_crossing` region_2_f2 (10,9)。

部品 `connections` / `map_connections` 有効。

接続 `floor_1_2` 地下二層への階段：stairs、region_2_f1 (13,12) ↔ region_2_f2 (1,1)。扉は壁面、階段は乾いた区画内の足場に配置。

#### 根喰みの地下庭園 (region_3)

定義：[region_3.json](../authoring/dungeons/region_3.json)。

現地調査 `region_3` 根が支える橋：関連q030、操作点region_3_f1 (1,3)。

部品 `garden` / `plant_garden` 有効。

植床6か所、育苗箱region_3_f1 (1,1)。`bridge_1` region_3_f1 (1,3) ／ `barrier_1` region_3_f1 (2,3) ／ `vine_1` region_3_f1 (5,2) ／ `bridge_2` region_3_f2 (1,2) ／ `barrier_2` region_3_f2 (1,3) ／ `vine_2` region_3_f2 (1,5)。

`cool_spore` 解熱胞子：生長3回、半径3、生長後の回復3／遭遇率×1、地形変更なし。対応植床6か所。

`red_nectar` 赤蜜花：生長4回、半径3、生長後の回復0／遭遇率×2、地形変更なし。対応植床6か所。

`quiet_moss` 静謐苔：生長3回、半径3、生長後の回復0／遭遇率×0.5、地形変更なし。対応植床6か所。

`root_bridge` 根橋草：生長5回、半径3、生長後の回復0／遭遇率×1、地形bridge。対応植床2か所。

`thorn_wall` 塞道茨：生長4回、半径3、生長後の回復0／遭遇率×1、地形barrier。対応植床2か所。

`stair_vine` 階渡りツタ：生長6回、半径3、生長後の回復0／遭遇率×1、地形vine。対応植床2か所。

植床 `bridge_1` のbridge：region_3_f1 (1,2)を.。

植床 `barrier_1` のbarrier：region_3_f1 (2,2)を#。

植床 `vine_1` のvine：region_3_f2 (1,1)へ移送。

植床 `bridge_2` のbridge：region_3_f2 (2,2)を.。

植床 `barrier_2` のbarrier：region_3_f2 (2,3)を#。

植床 `vine_2` のvine：region_3_f1 (1,1)へ移送。

部品 `connections` / `map_connections` 有効。

接続 `floor_1_2` 地下二層への階段：stairs、region_3_f1 (14,11) ↔ region_3_f2 (1,1)。扉は壁面、階段は乾いた区画内の足場に配置。

#### 鏡沈みの礼拝堂 (region_4)

定義：[region_4.json](../authoring/dungeons/region_4.json)。

現地調査 `region_4` 仮面を運ぶ鏡路：関連q039、操作点region_4_f1 (1,2) ／ region_4_f2 (13,5)。

部品 `mirrors` / `warp_network` 有効。

鏡 `mirror_1_0` region_4_f1 (1,2) → `mirror_2_1` region_4_f2 (13,5)。到着時の向きsouth。

鏡 `mirror_1_1` region_4_f1 (3,3) → `mirror_2_3` region_4_f2 (17,1)。到着時の向きsouth。

鏡 `mirror_1_2` region_4_f1 (17,4) → `mirror_2_0` region_4_f2 (1,2)。到着時の向きsouth。

鏡 `mirror_1_3` region_4_f1 (17,8) → `mirror_2_2` region_4_f2 (16,13)。到着時の向きsouth。

鏡 `mirror_2_0` region_4_f2 (1,2) → `mirror_1_2` region_4_f1 (17,4)。到着時の向きsouth。

鏡 `mirror_2_1` region_4_f2 (13,5) → `mirror_1_0` region_4_f1 (1,2)。到着時の向きsouth。

鏡 `mirror_2_2` region_4_f2 (16,13) → `mirror_1_3` region_4_f1 (17,8)。到着時の向きsouth。

鏡 `mirror_2_3` region_4_f2 (17,1) → `mirror_1_1` region_4_f1 (3,3)。到着時の向きsouth。

#### 灰時計の書庫 (region_5)

定義：[region_5.json](../authoring/dungeons/region_5.json)。

現地調査 `region_5` 閉じた頁と開いた通路：関連q049、操作点region_5_f1 (1,2)。

部品 `library` / `skill_library` 有効。

書物6か所：`book_1_0` region_5_f1 (1,2) ／ `book_1_1` region_5_f1 (1,5) ／ `book_1_2` region_5_f1 (3,5) ／ `book_2_0` region_5_f2 (1,2) ／ `book_2_1` region_5_f2 (3,3) ／ `book_2_2` region_5_f2 (3,5)。

封印 `seal_1_0` 操作region_5_f1 (3,2)、技能read_path、開通先region_5_f1 (2,2)。

封印 `seal_1_1` 操作region_5_f1 (1,3)、技能read_path、開通先region_5_f1 (2,3)。

封印 `seal_2_0` 操作region_5_f2 (1,3)、技能read_path、開通先region_5_f2 (1,4)。

封印 `seal_2_1` 操作region_5_f2 (3,4)、技能read_path、開通先region_5_f2 (2,4)。

#### 眠れる地下市場 (region_6)

定義：[region_6.json](../authoring/dungeons/region_6.json)。

現地調査 `region_6` 通行を約束する相手：関連q060、操作点region_6_f1 (1,2)。

部品 `market` / `market_pacts` 有効。

取引 `barter` 2か所：`barter_1` region_6_f1 (1,3) ／ `barter_2` region_6_f2 (1,3)。変更先region_6_f1 (1,4) ／ region_6_f2 (1,4)。

取引 `buy` 2か所：`shop_1` region_6_f1 (3,3) ／ `shop_2` region_6_f2 (3,3)。変更先配置なし。

取引 `escort` 2か所：`escort_1` region_6_f1 (2,5) ／ `escort_2` region_6_f2 (5,4)。変更先配置なし。

取引 `toll` 2か所：`toll_1` region_6_f1 (1,2) ／ `toll_2` region_6_f2 (1,2)。変更先region_6_f1 (2,2) ／ region_6_f2 (2,2)。

用心棒4か所：region_6_f1 (2,4) 警戒2以上 ／ region_6_f1 (4,5) 警戒3以上 ／ region_6_f2 (2,4) 警戒2以上 ／ region_6_f2 (4,2) 警戒3以上。閉店は警戒2以上、上限5。

#### 黒潮の沈没城 (region_7)

定義：[region_7.json](../authoring/dungeons/region_7.json)。

現地調査 `region_7` 一つだけ浮かぶ区画：関連q070、操作点region_7_f1 (1,2)。

部品 `air` / `air_supply` 有効。

水中候補258セル、初期空気溜まり24セル。候補から初期空気溜まりを除いた初期水中は234セル。水中候補例：region_7_f1 (1,1) ／ region_7_f1 (3,1)。

浮上装置4か所、追加空気溜まり4セル、開通対象4セル。`float_1_0` region_7_f1 (1,2) ／ `float_1_1` region_7_f1 (1,3) ／ `float_2_0` region_7_f2 (1,2) ／ `float_2_1` region_7_f2 (1,3)。

空気上限36、警告10以下、移動1／戦闘開始2／ラウンド2消費。枯渇時は最大HPの12%相当を切り上げて損傷。

#### 鉄胎の機関廟 (region_8)

定義：[region_8.json](../authoring/dungeons/region_8.json)。

現地調査 `region_8` 動力の届く範囲：関連q080、操作点region_8_f1 (1,2)。

部品 `power` / `power_grid` 有効。

配電盤4か所：`circuit_1_0` region_8_f1 (1,2) ／ `circuit_1_1` region_8_f1 (2,3) ／ `circuit_2_0` region_8_f2 (1,2) ／ `circuit_2_1` region_8_f2 (3,3)。動力容量3。

動力装置 `door` 2か所：`door_1` region_8_f1 (3,4) ／ `door_2` region_8_f2 (1,3)。開通対象region_8_f1 (2,4) ／ region_8_f2 (1,4)。

動力装置 `elevator` 2か所：`elevator_1` region_8_f1 (3,2) ／ `elevator_2` region_8_f2 (1,5)。移送先region_8_f2 (1,1) ／ region_8_f1 (1,1)。

動力装置 `guardian` 2か所：`guardian_1` region_8_f1 (1,5) ／ `guardian_2` region_8_f2 (2,4)。

動力装置 `repair` 2か所：`repair_1` region_8_f1 (4,3) ／ `repair_2` region_8_f2 (6,3)。

#### 星欠けの地下観測所 (region_9)

定義：[region_9.json](../authoring/dungeons/region_9.json)。

現地調査 `region_9` 観測のための足場：関連q090、操作点region_9_f1 (1,2)。

部品 `terrain` / `terrain_shift` 有効。

操作式。初期状態east、対象8セル、2状態。

東星の配置 (east)：region_9_f1 (1,4)=. ／ region_9_f1 (2,4)=# ／ region_9_f1 (3,2)=. ／ region_9_f1 (4,2)=# ／ region_9_f2 (2,2)=. ／ region_9_f2 (2,5)=# ／ region_9_f2 (3,2)=. ／ region_9_f2 (2,6)=#。

西星の配置 (west)：region_9_f1 (1,4)=# ／ region_9_f1 (2,4)=. ／ region_9_f1 (3,2)=# ／ region_9_f1 (4,2)=. ／ region_9_f2 (2,2)=# ／ region_9_f2 (2,5)=. ／ region_9_f2 (3,2)=# ／ region_9_f2 (2,6)=.。

操作点：`orrery_1` region_9_f1 (1,2) ／ `orrery_2` region_9_f2 (1,2)。固定退避点：`refuge_1` region_9_f1 (1,1) ／ `refuge_2` region_9_f2 (1,1)。

### 立体の共有面・経路・装置

<!-- /generated:cell-inventory -->
