# 魔物一覧と追加計画

実装前計画：2026-09-09。追加20種。既存20敵定義を維持し、合計40敵定義とします。各追加種へ個別の戦闘画像を用意します。

参照：[RPGエンティティ生成モデル](https://app.notion.com/p/RPG-3d6c3c1966b380489592dbeafc72b9dd)／[魔物100](https://app.notion.com/p/3d6c3c1966b38172b0a6fd15e23be419)。主発想と追加発想を姿・代表行動へ結びます。名称候補M014の「万華鏡フクロウ」、M017の「ジャックナイフ」を採用し、M015は読みやすい「羅針盤カササギ」としています。

## 追加する魔物

| ID・名称 | 地域 | 参照 | 二つの発想 | 姿 | 実装する行動 |
| --- | --- | --- | --- | --- | --- |
| waterwheel_beaver／水車ビーバー | 灯守の地下水道 | M006 | ビーバー＋水車 | 丸い尾が木と鉄の水車。濡れた茶の毛と幅広い前歯。 | 水の尾で打つ低速の前衛 |
| sluice_crocodile／水門ワニ | 灯守の地下水道 | M024 | ワニ＋水門 | 背の板が縦に立つ水門。苔色の鱗と鉄の蝶番。 | 初手に背の門を閉じて防御する |
| drill_mole／ドリルモグラ | 塩哭きの廃坑 | M002 | モグラ＋回転掘削器 | 鼻先の大きな螺旋ドリルと短い掘削爪。土色の毛。 | 防御の一部を無視する鼻先の突進 |
| ceramic_armadillo／陶器アルマジロ | 塩哭きの廃坑 | M008 | アルマジロ＋陶器 | 白い釉薬の鎧に藍の窯印、欠けた縁から柔らかな腹。 | 殻で物理に耐え、傷つくと丸まる |
| candle_bee／蜜蝋ランプバチ | 根喰みの地下庭園 | M042 | ハチ＋蝋燭 | 蜜蝋の腹と小さな琥珀の火。薄い羽と黒い脚。 | 灯った蜜蝋を飛ばす高速の炎術役 |
| saw_mantis／鋸刃カマキリ | 根喰みの地下庭園 | M041 | カマキリ＋往復のこぎり | 細かな鋸歯の長い鎌、葉に似た緑の胴。 | 薄い守りと強打を持つ攻撃役 |
| kaleidoscope_owl／万華鏡フクロウ | 鏡沈みの礼拝堂 | M014 | フクロウ＋万華鏡 | 紫灰の翼と幾何学的に光る二つの瞳。 | 光の術と翼の防御を交互に使う |
| glass_jellyfish／硝子クラゲ | 鏡沈みの礼拝堂 | M023 | クラゲ＋割れガラス | 亀裂の走る透明な傘と鋭い硝子の触手。 | 物理に強く炎に弱い硝子の刃 |
| type_porcupine／活字ヤマアラシ | 灰時計の書庫 | M011 | ヤマアラシ＋活字 | 針先に活字の角面、黒鉄の針と墨色の毛。 | 活字の針を飛ばす硬い物理役 |
| book_silverfish／書庫シミ | 灰時計の書庫 | M046 | 紙を食べる虫＋書庫の索引 | 銀色の節と栞の背びれ、紙の薄片をかじる口。 | 墨の魔力を食べてMPを削る |
| vault_mouse／金庫ネズミ | 眠れる地下市場 | M013 | ネズミ＋金庫 | 両頬に真鍮の小さな金庫扉と鍵穴。 | 頬の金庫を閉じて耐える |
| patchwork_bagworm／裁縫ミノムシ | 眠れる地下市場 | M049 | ミノムシ＋裁縫 | 色の違う布を縫った袋、糸をつかむ短い脚。 | 傷つくと袋を縫い直して回復する |
| bone_whale／骨くじら | 黒潮の沈没城 | M001 | クジラ＋骨格 | 空洞の巨大な肋骨と尾びれ。青白く光る眼窩。 | 骨片を隊全体へ撒く大型の敵 |
| anchor_squid／碇イカ | 黒潮の沈没城 | M028 | イカ＋錨 | 二本の腕の先が錆びた錨、深紅の胴と垂れる触腕。 | 錨腕の強打と固定姿勢の防御 |
| battery_hermit／蓄電ヤドカリ | 鉄胎の機関廟 | M039 | ヤドカリ＋蓄電器 | 真鍮の殻に二本の電極、青い火花と銅の脚。 | 雷に耐え、放電の後は殻にこもる |
| derail_centipede／脱線ムカデ | 鉄胎の機関廟 | M052 | ムカデ＋列車 | 車輪の脚が並ぶ鉄の節、先頭に小さな前照灯。 | 突進の次の手番は姿勢を立て直す |
| iris_butterfly／虹彩チョウ | 星欠けの地下観測所 | M050 | チョウ＋虹彩絞り | 翅の大きな目玉模様が絞り羽根になっている。 | 光線を絞って撃つ脆い魔術役 |
| compass_magpie／羅針盤カササギ | 星欠けの地下観測所 | M015 | カササギ＋方位磁針 | 黒白の翼、方位磁針のような尾、集めた金属の足輪。 | 尾針で守りの薄い相手を狙う |
| moon_wolf／月輪オオカミ | 帰還者の深淵 | M012 | オオカミ＋環状の刃 | 灰色の狼の首に浮く細い銀の輪。 | 月輪で隊全体を浅く切り、牙で追う |
| jackknife／ジャックナイフ | 帰還者の深淵 | M017 | ツバメ＋折り畳みナイフ | 燕尾と紺の羽、翼の縁に開いた小さな銀刃。 | 高速の単体斬撃。火力と薄い装甲 |

## 世界への接続

実装する戦闘変数はHP・MP・行動順・防御・属性倍率です。全体対象、MP減少・回復、手番数を使ったAI条件を追加します。元の作例の地中移動、壁の破壊、足場の滑り、複数体への分裂、盗品の施錠解除は採用せず、上表の戦闘行動をこの作品向けの別案として実装します。装備やクエストの証拠を敵が勝手に消す処理は設けません。

## 既存の敵

既存IDはクエストと旧セーブの継続に使われるため、その定義と固定戦闘を維持します。通常種と守護者は同じ画像を使う強さの派生です。

| ID | 名称 | 画像 | HP | 攻撃 | 防御 |
| --- | --- | --- | --- | --- | --- |
| guard_1 | 灯守の地下水道の迷宮獣 | slime | 31 | 10 | 4 |
| guard_1_elite | 灯守の地下水道の守護者 | slime | 74 | 13 | 4 |
| guard_2 | 塩哭きの廃坑の迷宮獣 | skeleton | 40 | 12 | 5 |
| guard_2_elite | 塩哭きの廃坑の守護者 | skeleton | 96 | 15 | 5 |
| guard_3 | 根喰みの地下庭園の迷宮獣 | slime | 49 | 14 | 6 |
| guard_3_elite | 根喰みの地下庭園の守護者 | slime | 118 | 17 | 6 |
| guard_4 | 鏡沈みの礼拝堂の迷宮獣 | wraith | 58 | 16 | 7 |
| guard_4_elite | 鏡沈みの礼拝堂の守護者 | wraith | 139 | 19 | 7 |
| guard_5 | 灰時計の書庫の迷宮獣 | wraith | 67 | 18 | 8 |
| guard_5_elite | 灰時計の書庫の守護者 | wraith | 161 | 21 | 8 |
| guard_6 | 眠れる地下市場の迷宮獣 | construct | 76 | 20 | 9 |
| guard_6_elite | 眠れる地下市場の守護者 | construct | 182 | 23 | 9 |
| guard_7 | 黒潮の沈没城の迷宮獣 | dragon | 85 | 22 | 10 |
| guard_7_elite | 黒潮の沈没城の守護者 | dragon | 204 | 25 | 10 |
| guard_8 | 鉄胎の機関廟の迷宮獣 | construct | 94 | 24 | 11 |
| guard_8_elite | 鉄胎の機関廟の守護者 | construct | 226 | 27 | 11 |
| guard_9 | 星欠けの地下観測所の迷宮獣 | wraith | 103 | 26 | 12 |
| guard_9_elite | 星欠けの地下観測所の守護者 | wraith | 247 | 29 | 12 |
| guard_10 | 帰還者の深淵の迷宮獣 | dragon | 112 | 28 | 13 |
| guard_10_elite | 帰還者の深淵の守護者 | dragon | 269 | 31 | 13 |

実装済み：画像一覧は下記、能力値と1,200戦の計測結果は[BALANCE_PLAN.md](BALANCE_PLAN.md)を参照してください。

## 戦闘画像一覧

追加20体の個別画像です。各地域の通常遭遇へ接続し、第二層には同地域の二体組も出現します。既存の依頼戦・ボス定義は保持しています。

| 画像 | 魔物 | 戦闘での見分け方 |
| --- | --- | --- |
| <img src="../assets/images/monsters/waterwheel_beaver.webp" width="160" alt="水車ビーバー"> | 水車ビーバー | 水の尾で打つ低速の前衛 |
| <img src="../assets/images/monsters/sluice_crocodile.webp" width="160" alt="水門ワニ"> | 水門ワニ | 初手に背の門を閉じて防御する |
| <img src="../assets/images/monsters/drill_mole.webp" width="160" alt="ドリルモグラ"> | ドリルモグラ | 防御の一部を無視する鼻先の突進 |
| <img src="../assets/images/monsters/ceramic_armadillo.webp" width="160" alt="陶器アルマジロ"> | 陶器アルマジロ | 殻で物理に耐え、傷つくと丸まる |
| <img src="../assets/images/monsters/candle_bee.webp" width="160" alt="蜜蝋ランプバチ"> | 蜜蝋ランプバチ | 灯った蜜蝋を飛ばす高速の炎術役 |
| <img src="../assets/images/monsters/saw_mantis.webp" width="160" alt="鋸刃カマキリ"> | 鋸刃カマキリ | 薄い守りと強打を持つ攻撃役 |
| <img src="../assets/images/monsters/kaleidoscope_owl.webp" width="160" alt="万華鏡フクロウ"> | 万華鏡フクロウ | 光の術と翼の防御を交互に使う |
| <img src="../assets/images/monsters/glass_jellyfish.webp" width="160" alt="硝子クラゲ"> | 硝子クラゲ | 物理に強く炎に弱い硝子の刃 |
| <img src="../assets/images/monsters/type_porcupine.webp" width="160" alt="活字ヤマアラシ"> | 活字ヤマアラシ | 活字の針を飛ばす硬い物理役 |
| <img src="../assets/images/monsters/book_silverfish.webp" width="160" alt="書庫シミ"> | 書庫シミ | 墨の魔力を食べてMPを削る |
| <img src="../assets/images/monsters/vault_mouse.webp" width="160" alt="金庫ネズミ"> | 金庫ネズミ | 頬の金庫を閉じて耐える |
| <img src="../assets/images/monsters/patchwork_bagworm.webp" width="160" alt="裁縫ミノムシ"> | 裁縫ミノムシ | 傷つくと袋を縫い直して回復する |
| <img src="../assets/images/monsters/bone_whale.webp" width="160" alt="骨くじら"> | 骨くじら | 骨片を隊全体へ撒く大型の敵 |
| <img src="../assets/images/monsters/anchor_squid.webp" width="160" alt="碇イカ"> | 碇イカ | 錨腕の強打と固定姿勢の防御 |
| <img src="../assets/images/monsters/battery_hermit.webp" width="160" alt="蓄電ヤドカリ"> | 蓄電ヤドカリ | 雷に耐え、放電の後は殻にこもる |
| <img src="../assets/images/monsters/derail_centipede.webp" width="160" alt="脱線ムカデ"> | 脱線ムカデ | 突進の次の手番は姿勢を立て直す |
| <img src="../assets/images/monsters/iris_butterfly.webp" width="160" alt="虹彩チョウ"> | 虹彩チョウ | 光線を絞って撃つ脆い魔術役 |
| <img src="../assets/images/monsters/compass_magpie.webp" width="160" alt="羅針盤カササギ"> | 羅針盤カササギ | 尾針で守りの薄い相手を狙う |
| <img src="../assets/images/monsters/moon_wolf.webp" width="160" alt="月輪オオカミ"> | 月輪オオカミ | 月輪で隊全体を浅く切り、牙で追う |
| <img src="../assets/images/monsters/jackknife.webp" width="160" alt="ジャックナイフ"> | ジャックナイフ | 高速の単体斬撃。火力と薄い装甲 |
