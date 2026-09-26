# 町・ダンジョン室内ロケーション一覧

配布JSONの場所・親子関係・施設機能から生成します。正本は config/locations.json、生成先は [data/locations.json](../../data/locations.json) です。町と室内は選択肢で移動します。ダンジョン室内は定義されたセルで入室を選び、退出すると同じセルへ戻ります。

[シナリオ一覧](../scenarios/QUEST_CATALOG.md) ／ [ダンジョン一覧](../dungeons/DUNGEON_CATALOG.md) ／ [ワールド接続仕様](WORLD_LOCATIONS.md)

## 灯帰り・篝火広場 (hikarigaeri_square)

迷宮から帰った人々が灯を囲む広場。施設の戸口と、迷宮へ下りる道が見える。

親: 町の起点。子: 旅道具店 (hikarigaeri_shop) / 帰り火亭 (hikarigaeri_tavern) / 灯番組合 (hikarigaeri_guild) / 医学校 (hikarigaeri_medical) / 保険審査所 (hikarigaeri_insurance) / 地下水道上層・待避場 (hikarigaeri_waterwatch) / 通行資格審査所 (hikarigaeri_pass_registry)。追加の移動先: なし。

機能: 会話・調査。

背景: [location_square](../../assets/images/locations/square.webp)。

接続ダンジョン: 篝火の迷宮 (kagaribi) / 巨獣上の移動集落 (moving_village) / 祈りの届かない谷 (prayerless_valley) / 灯守の地下水道 (region_1) / 帰還者の深淵 (region_10) / 塩哭きの廃坑 (region_2) / 根喰みの地下庭園 (region_3) / 鏡沈みの礼拝堂 (region_4) / 灰時計の書庫 (region_5) / 眠れる地下市場 (region_6) / 黒潮の沈没城 (region_7) / 鉄胎の機関廟 (region_8) / 星欠けの地下観測所 (region_9)。

## 旅道具店 (hikarigaeri_shop)

縄、松明、薬。店先で装備を確かめ、次の探索に備える。

親: 灯帰り・篝火広場 (hikarigaeri_square)。子: なし。追加の移動先: なし。

機能: 取引。

背景: [location_shop](../../assets/images/locations/shop.webp)。

## 帰り火亭 (hikarigaeri_tavern)

食卓の灯が揺れる。仲間を探し、宿で身体を休められる。

親: 灯帰り・篝火広場 (hikarigaeri_square)。子: 宿屋裏の汚水槽 (hikarigaeri_tavern_cistern)。追加の移動先: なし。

機能: 編成 / 宿屋で全回復 / 守衛ベルグを訪ねる。

背景: [location_tavern](../../assets/images/locations/tavern.webp)。

## 灯番組合 (hikarigaeri_guild)

掲示板には迷宮で待つ人々からの依頼が並ぶ。

親: 灯帰り・篝火広場 (hikarigaeri_square)。子: 灯番詰所 (hikarigaeri_lamplighter_post)。追加の移動先: なし。

機能: 依頼掲示板。

背景: [location_guild](../../assets/images/locations/guild.webp)。

## 医学校 (hikarigaeri_medical)

石造りの廊下が施療の受付と標本室へ続く。

親: 灯帰り・篝火広場 (hikarigaeri_square)。子: 医学校・標本室 (hikarigaeri_medical_specimens)。追加の移動先: なし。

機能: 施療所で応急手当。

背景: [location_medical](../../assets/images/locations/medical.webp)。

## 医学校・標本室 (hikarigaeri_medical_specimens)

標本の管理番号と貸出台帳を照合する部屋。窓辺には作業用の長机がある。

親: 医学校 (hikarigaeri_medical)。子: なし。追加の移動先: なし。

機能: 会話・調査。

背景: [location_specimens](../../assets/images/locations/specimens.webp)。

参照場面: q002「骨の荷札」 / school。

参照場面: q002「骨の荷札」 / returned。

## 保険審査所 (hikarigaeri_insurance)

届出と請求書が保管される窓口。証言と書類を照合し、記録を残す。

親: 灯帰り・篝火広場 (hikarigaeri_square)。子: なし。追加の移動先: なし。

機能: 会話・調査。

背景: [location_insurance](../../assets/images/locations/insurance.webp)。

参照場面: q002「骨の荷札」 / hearing。

## 灯番詰所 (hikarigaeri_lamplighter_post)

灯番組合の奥にある詰所。リネが巡灯の記録と帰還者の名前を確かめる。

親: 灯番組合 (hikarigaeri_guild)。子: なし。追加の移動先: なし。

機能: 会話・調査。

背景: [location_guild](../../assets/images/locations/guild.webp)。

参照場面: q001「帰らない灯番」 / post。

## 地下水道上層・待避場 (hikarigaeri_waterwatch)

低い通路から上がった者が身を寄せる、町側の待避場。見張りが下り口と水位の報告を受け持つ。

親: 灯帰り・篝火広場 (hikarigaeri_square)。子: なし。追加の移動先: なし。

機能: 会話・調査。

背景: [location_square](../../assets/images/locations/square.webp)。

参照場面: q003「逆流する鐘」 / relay。

参照場面: q003「逆流する鐘」 / evacuated。

## 宿屋裏の汚水槽 (hikarigaeri_tavern_cistern)

宿の裏手にある排水設備。使用済みの水を溜め、決めた時刻に共同排水路へ流している。

親: 帰り火亭 (hikarigaeri_tavern)。子: なし。追加の移動先: なし。

機能: 会話・調査。

背景: [location_tavern](../../assets/images/locations/tavern.webp)。

参照場面: q003「逆流する鐘」 / reservoir。

## 地下関所の詰所 (waterway_checkpoint)

水路に面した石造りの詰所。受付には入退場記録と勤務簿が置かれ、奥の面会窓は留置室につながっている。

親: ダンジョン内の戸口。子: 詰所・留置室前 (waterway_checkpoint_holding)。追加の移動先: なし。

機能: 会話・調査。

背景: [location_checkpoint](../../assets/images/locations/checkpoint.webp)。

入退室地点: 灯守の地下水道 (`region_1`) / 灯守の地下水道・上層・荷揚げ場・B1 (`region_1_landing`) / (13, 3)。[ダンジョン定義](../../data/dungeons.json)。入室・退出は明示的な選択肢で行う。

参照場面: q004「二枚目の通行証」 / duplicate。

参照場面: q004「二枚目の通行証」 / consent。

参照場面: q004「二枚目の通行証」 / review。

参照場面: q004「二枚目の通行証」 / issued。

参照場面: q004「二枚目の通行証」 / fine_release。

参照場面: q004「二枚目の通行証」 / window。

## 詰所・留置室前 (waterway_checkpoint_holding)

受付の奥にある留置室。鉄格子と錠が通路を隔て、面会窓から受付の声が届く。

親: 地下関所の詰所 (waterway_checkpoint)。子: なし。追加の移動先: なし。

機能: 会話・調査。

背景: [location_checkpoint](../../assets/images/locations/checkpoint.webp)。

参照場面: q004「二枚目の通行証」 / force_entry。

参照場面: q004「二枚目の通行証」 / force_freed。

## 通行資格審査所 (hikarigaeri_pass_registry)

地上で住民登録と通行資格を管理する審査窓口。地下関所の勤務簿とは別に、名義人の記録を照合する。

親: 灯帰り・篝火広場 (hikarigaeri_square)。子: なし。追加の移動先: なし。

機能: 会話・調査。

背景: [location_insurance](../../assets/images/locations/insurance.webp)。

参照場面: q004「二枚目の通行証」 / registry。

参照場面: q004「二枚目の通行証」 / filing。

参照場面: q004「二枚目の通行証」 / escort。
