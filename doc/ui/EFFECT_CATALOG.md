# 戦闘・フィールドエフェクト一覧

確認日: 2026-09-25。作品版1.20.0、表示効果24種。

2026-09-09に確定した一覧を実装済みです。スクリプト式8種・連番画像8種・フィールド8種を登録しています。既存の青緑と琥珀色の画面、古典的なピクセル演出に合わせます。

ID：hit_shake / 効果：小振動 / 基準時間：280 ms / 方式：JSONの動き・色・分割だけ

ID：heavy_shake / 効果：強い振動 / 基準時間：420 ms / 方式：JSONの動き・色・分割だけ

ID：spin / 効果：回転 / 基準時間：460 ms / 方式：JSONの動き・色・分割だけ

ID：skew / 効果：スキュ / 基準時間：400 ms / 方式：JSONの動き・色・分割だけ

ID：squash / 効果：伸縮 / 基準時間：380 ms / 方式：JSONの動き・色・分割だけ

ID：split_vertical / 効果：縦切断 / 基準時間：430 ms / 方式：JSONの動き・色・分割だけ

ID：split_diagonal / 効果：斜め切断 / 基準時間：430 ms / 方式：JSONの動き・色・分割だけ

ID：fade_out / 効果：消散 / 基準時間：480 ms / 方式：JSONの動き・色・分割だけ

ID：slash_arc / 効果：斬撃の弧 / 基準時間：560 ms / 方式：8コマの透過PNGシート

ID：impact_burst / 効果：打撃の火花 / 基準時間：560 ms / 方式：8コマの透過PNGシート

ID：fire_burst / 効果：炎の噴出 / 基準時間：560 ms / 方式：8コマの透過PNGシート

ID：ice_shards / 効果：氷片の飛散 / 基準時間：560 ms / 方式：8コマの透過PNGシート

ID：lightning_arc / 効果：枝分かれする雷 / 基準時間：560 ms / 方式：8コマの透過PNGシート

ID：healing_ring / 効果：治療の輪 / 基準時間：560 ms / 方式：8コマの透過PNGシート

ID：poison_cloud / 効果：毒の雲 / 基準時間：560 ms / 方式：8コマの透過PNGシート

ID：mana_orbit / 効果：魔力の軌道 / 基準時間：560 ms / 方式：8コマの透過PNGシート

ID：field_shake / 効果：地響き / 基準時間：420 ms / 方式：JSONの動き・色・分割だけ

ID：field_damage / 効果：被害の赤色化 / 基準時間：650 ms / 方式：JSONの動き・色・分割だけ

ID：field_dark / 効果：暗転 / 基準時間：650 ms / 方式：JSONの動き・色・分割だけ

ID：field_shade / 効果：周辺シェード / 基準時間：650 ms / 方式：JSONの動き・色・分割だけ

ID：field_reveal / 効果：発見の光 / 基準時間：650 ms / 方式：JSONの動き・色・分割だけ

ID：field_recover / 効果：泉・休息の光 / 基準時間：650 ms / 方式：JSONの動き・色・分割だけ

ID：field_transition / 効果：移動の暗幕 / 基準時間：650 ms / 方式：JSONの動き・色・分割だけ

ID：field_poison / 効果：毒の紫色化 / 基準時間：650 ms / 方式：JSONの動き・色・分割だけ

## 定義と合成

スクリプト式はJSONのキーフレーム（位置・角度・スキュ・伸縮・不透明度）、色の重ね合わせ、二分割の表示で定義します。画像式はAIPaintの図形命令から8コマの透過画像を作り、PNGシートとして再生します。斬撃・炎・氷片等は抽象的な戦闘記号です。切断は画像の見た目だけを分割し、元画像や敵データを変更しません。

一つのcueへ複数effectと一つのSEを指定でき、同じ開始時刻で動作します。技能とcueの対応もJSONです。effect.playでシナリオから単独再生でき、audio.seで単発音を指定できます。遅延は同じ入力処理の開始からのミリ秒です。

## フィールド

壁・罠は振動、罠は赤、毒歩行は紫、階層移動・帰還は暗幕、宝箱や補給は光、泉・休息は緑の回復演出へ接続します。灯油が25以下になると暗さが徐々に増し、周辺シェードは探索画面だけに掛けます。補充すれば暗さは戻ります。screen.set / screen.clearではシナリオ独自の持続色・シェードを最大4層まで指定でき、保存・復元します。

## ビューと進行の分離

ゲームは対象・演出ID・タイミングだけを通知し、DOMや描画APIを呼びません。表示側が実行する演出はゲームのHP・報酬・乱数・継続位置を変更しません。演出の完了待ちで入力を止めません。瞬間的な演出とSEはセーブしないため、ロード直後の再発火を防ぎます。倒した敵の最後の斬撃は直前の画像位置を使って表示します。

OSの動きを減らす設定と、ゲームの演出設定に対応します。軽減時は大きな変形・切断・振動を省き、一回の薄い色変化に置き換えます。短い明滅の反復は使用しません。

実装済みです。以下に画像シート、JSON例、技能対応一覧と検証結果を記載します。

## 画像アニメーション

全8種、各8コマ、1コマ128×128、シート1024×128の透過PNGです。左から右へ560msで再生します。AIPaintの図形命令で発生・広がり・消散を描き分けています。

アニメーション：斬撃の弧 / コマ一覧：<img src="../../assets/effects/fx_slash_arc.png" width="512" alt="slash_arcの8コマ"> / AIPaint命令：[命令JSON](../../assets/source/effects/fx_slash_arc.paint.commands.json)

アニメーション：打撃の火花 / コマ一覧：<img src="../../assets/effects/fx_impact_burst.png" width="512" alt="impact_burstの8コマ"> / AIPaint命令：[命令JSON](../../assets/source/effects/fx_impact_burst.paint.commands.json)

アニメーション：炎の噴出 / コマ一覧：<img src="../../assets/effects/fx_fire_burst.png" width="512" alt="fire_burstの8コマ"> / AIPaint命令：[命令JSON](../../assets/source/effects/fx_fire_burst.paint.commands.json)

アニメーション：氷片の飛散 / コマ一覧：<img src="../../assets/effects/fx_ice_shards.png" width="512" alt="ice_shardsの8コマ"> / AIPaint命令：[命令JSON](../../assets/source/effects/fx_ice_shards.paint.commands.json)

アニメーション：枝分かれする雷 / コマ一覧：<img src="../../assets/effects/fx_lightning_arc.png" width="512" alt="lightning_arcの8コマ"> / AIPaint命令：[命令JSON](../../assets/source/effects/fx_lightning_arc.paint.commands.json)

アニメーション：治療の輪 / コマ一覧：<img src="../../assets/effects/fx_healing_ring.png" width="512" alt="healing_ringの8コマ"> / AIPaint命令：[命令JSON](../../assets/source/effects/fx_healing_ring.paint.commands.json)

アニメーション：毒の雲 / コマ一覧：<img src="../../assets/effects/fx_poison_cloud.png" width="512" alt="poison_cloudの8コマ"> / AIPaint命令：[命令JSON](../../assets/source/effects/fx_poison_cloud.paint.commands.json)

アニメーション：魔力の軌道 / コマ一覧：<img src="../../assets/effects/fx_mana_orbit.png" width="512" alt="mana_orbitの8コマ"> / AIPaint命令：[命令JSON](../../assets/source/effects/fx_mana_orbit.paint.commands.json)

## 技能と演出・SEの対応

1回の技能につき1つのcueを発行します。全体技は対象全員へ同時に画像効果を適用しますが、SEは1回です。敵の行動は180ms間隔で開始し、表示の長い余韻は重なります。操作を続けた場合は前の演出を打ち切り、次の操作を優先します。

技能：攻撃（attack） / cue：attack / 効果：斬撃の弧＋小振動 / SE：斬撃

技能：強打（power） / cue：power / 効果：打撃の火花＋強い振動 / SE：重打

技能：灯火の術（fire） / cue：fire / 効果：炎の噴出＋小振動 / SE：炎

技能：手当の祈り（heal） / cue：heal / 効果：治療の輪 / SE：回復

技能：防御（guard） / cue：guard / 効果：伸縮 / SE：防御

技能：毒の刃（venom） / cue：venom / 効果：毒の雲＋小振動 / SE：毒

技能：解毒（cleanse） / cue：cleanse / 効果：治療の輪＋伸縮 / SE：回復

技能：貫通突き（pierce） / cue：pierce / 効果：斬撃の弧＋スキュ / SE：貫通

技能：氷の符（ice） / cue：ice / 効果：氷片の飛散＋スキュ / SE：氷

技能：雷の符（lightning） / cue：lightning / 効果：枝分かれする雷＋小振動 / SE：雷

技能：薬草の霧（group_heal） / cue：heal / 効果：治療の輪 / SE：回復

技能：盾の壁（party_guard） / cue：guard / 効果：伸縮 / SE：防御

技能：気付けの節（inspire） / cue：mana / 効果：魔力の軌道 / SE：魔力

技能：水車の尾（water_tail） / cue：power / 効果：打撃の火花＋強い振動 / SE：重打

技能：水門落とし（gate_slam） / cue：power / 効果：打撃の火花＋強い振動 / SE：重打

技能：螺旋突進（drill_thrust） / cue：pierce / 効果：斬撃の弧＋スキュ / SE：貫通

技能：殻の体当たり（shell_roll） / cue：roll / 効果：打撃の火花＋回転 / SE：重打

技能：蜜蝋の火（wax_flame） / cue：fire / 効果：炎の噴出＋小振動 / SE：炎

技能：引き鋸（saw_cut） / cue：cut / 効果：斬撃の弧＋斜め切断 / SE：斬撃

技能：虹彩光線（iris_ray） / cue：lightning / 効果：枝分かれする雷＋小振動 / SE：雷

技能：硝子の刃（glass_shards） / cue：cut / 効果：斬撃の弧＋斜め切断 / SE：斬撃

技能：活字の針（type_needles） / cue：pierce / 効果：斬撃の弧＋スキュ / SE：貫通

技能：墨すすり（ink_sip） / cue：drain / 効果：魔力の軌道＋スキュ / SE：魔力

技能：金庫の歯（vault_bite） / cue：power / 効果：打撃の火花＋強い振動 / SE：重打

技能：縫い直し（stitch_mend） / cue：heal / 効果：治療の輪 / SE：回復

技能：肋骨の雨（bone_rain） / cue：power / 効果：打撃の火花＋強い振動 / SE：重打

技能：碇打ち（anchor_strike） / cue：power / 効果：打撃の火花＋強い振動 / SE：重打

技能：殻の放電（discharge） / cue：lightning / 効果：枝分かれする雷＋小振動 / SE：雷

技能：列車突進（rail_charge） / cue：power / 効果：打撃の火花＋強い振動 / SE：重打

技能：尾針突き（needle_lunge） / cue：pierce / 効果：斬撃の弧＋スキュ / SE：貫通

技能：月輪払い（moon_sweep） / cue：cut / 効果：斬撃の弧＋斜め切断 / SE：斬撃

技能：すれ違い斬り（blade_pass） / cue：cut / 効果：斬撃の弧＋斜め切断 / SE：斬撃

技能：姿勢を立て直す（recover_stance） / cue：guard / 効果：伸縮 / SE：防御

技能：毒牙（poison_bite） / cue：venom / 効果：毒の雲＋小振動 / SE：毒

技能：傷薬（potion） / cue：heal / 効果：治療の輪 / SE：回復

技能：解毒薬（antidote） / cue：cleanse / 効果：治療の輪＋伸縮 / SE：回復

## JSONで作る

`data/effects.json`に追加するスクリプト式の例です。durationはミリ秒、atは0〜1です。JavaScriptやCSS文字列の埋め込みはせず、許可された数値だけを使います。

```json
{
  "turn_and_skew": {
    "name": "回りながら歪む",
    "category": "script",
    "duration": 500,
    "tracks": [
      {
        "kind": "motion",
        "frames": [
          {"at": 0, "rotate": 0, "skewX": 0},
          {"at": 0.5, "rotate": 180, "skewX": 16},
          {"at": 1, "rotate": 360, "skewX": 0}
        ]
      }
    ]
  }
}
```

シナリオから使う例です。同じdelayならSEと効果が同時刻に予約されます。効果を再生する命令自体は待機せず、narrateやchoiceがプレイヤーの入力を待ちます。

```json
{
  "scripts": {
    "example.rumble": {
      "commands": [
        {"op": "screen.set", "layer": "mist", "color": "#344652", "opacity": 0.3, "shade": true},
        {"op": "effect.play", "effect": "field_shake", "target": "scene", "delay": 0},
        {"op": "audio.se", "asset": "se_trap", "volume": 0.8, "delay": 0},
        {"op": "effect.play", "effect": "field_damage", "target": "scene", "delay": 180},
        {"op": "narrate", "text": "石の向こうから振動が伝わり、薄い靄が灯を包んだ。"},
        {"op": "screen.clear", "layer": "mist"}
      ]
    }
  }
}
```

演出のtargetはscene（探索画面。町では主画面）、screen（主画面）、party（隊の欄）、actor:adaのような仲間ID、enemy:enemy_0のような戦闘内の敵IDです。切断は画像対象で使用します。画像のない対象では薄い色の効果へ置き換えます。screen.setの持続色は探索・戦闘の景色に重ね、町には持続表示しません。

motionのキーはx/y（±200px）、rotate（±360度）、skewX/skewY（±40度）、scaleX/scaleY（0.1〜3）、opacity（0〜1）。開始at=0、終了at=1とし、昇順に2〜32コマを記述します。tint/shadeはcolorとopacity（0〜0.65）、splitはaxis（vertical/diagonal）・distance（0〜100px）・rotate（±45度）、spriteはasset・frames・columns・cell・scaleを指定します。1効果は最大8トラック、50〜5000ms、1入力処理は最大64イベント、遅延は最大5000msです。

音と効果をまとめる定義は `data/presentation.json` のcues、技能・道具・移動との対応はbindingsです。原稿から再生成する場合はconfig/presentation.jsonを編集してください。`data/schemas/effects.schema.json`、`sounds.schema.json`、`script.schema.json`と実行時検証器が形式と参照を検査します。

## 表示だけを調整する

[ビュー用プレビュー](../../view-preview.html)で表示例と効果・対象を選び、「演出を再生」を押します。「新種の二体戦」なら切断・振動を敵の画像で確認できます。SEの選択と試聴も同じページにあります。画像配置・クリップ・再生方法の変更はsrc/view/effects.jsとstyle.cssで行い、ゲームの判定は変更しません。

## 検証結果と範囲

現行の全469テストに表示効果の検証を含みます。演出の有無で同じ入力・seedから同じ保存状態になること、持続レイヤー、予約取消し、SE重複防止、不正な定義の拒否を検査しています。最新の全体検証は[PROGRESS.md](../development/PROGRESS.md)を参照してください。

全8シートをデコードし、透過と64コマの非空・差異を検査しました。SE全28種はOGGをデコードして音量・有限値を測定しました。実ブラウザ上の動き、端末での聴感、OSの動き軽減との連携は未検証です。
