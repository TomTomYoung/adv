# 音・戦闘演出の記述形式

確認日: 2026-11-09。実装の照合先: PR #223、コミット `873aafdb6d5f90b87b443e330d1fbc38558d8f02`。

音は音源・高さ・音量変化・時間・加工・重ね方で、画面演出は形・位置・回転・大きさ・色・透明度の時間変化で記述します。それらを命中などの同じ時刻に結び付けることで、一つの戦闘演出にします。

本書は現行実装の定義と編集場所を説明します。末尾の共通形式案だけは未実装です。既存SEの全28種は[SE一覧](SE_CATALOG.md)、基本表示効果の全34種は[エフェクト一覧](EFFECT_CATALOG.md)を参照してください。

## 1. 記述の段階と編集場所

1. **部品**：一つの音、ノイズ、録音済み素材、動き、色変化、画像の連番など。
2. **組み合わせ**：複数の部品を重ねて、強打音や被弾反動などを作る。
3. **演出のまとまり**：予備動作・音・命中効果・反動を時刻と対象で結び付ける。
4. **ゲームとの接続**：武器・技能と、会心・防御・回復・撃破などの確定した結果から演出を選ぶ。

現在の編集場所は次のとおりです。

- [config/presentation.json](../../config/presentation.json)：既存SEの楽譜、基本効果、音と効果を結ぶ `cues`、武器・技能などの `bindings`。
- [data/sounds.json](../../data/sounds.json)、[data/effects.json](../../data/effects.json)、[data/presentation.json](../../data/presentation.json)：原稿から生成するゲーム用定義。
- [src/application/battle-sound.js](../../src/application/battle-sound.js)：追加合成音の音源・周波数・長さ・音量・開始遅延と、その再生処理。
- [src/battle-accent.js](../../src/battle-accent.js)：確定結果から選ぶ追加演出の種類と色。
- [src/view/battle-impact.js](../../src/view/battle-impact.js)：追加の火花・衝撃波・回復光・撃破粒子の個数、軌道、時間。
- [src/application/audio.js](../../src/application/audio.js)：音量、同時発音数、取消、BGMの一時減音。

以下の例は読みやすさのためJavaScriptのオブジェクト記法で示します。JSONファイルへ保存する場合は `JSON.stringify(value, null, 2)` などでJSON化します。変数宣言やコメントをJSONファイルへ直接書くことはできません。

## 2. 既存SE：音符の並びで記述する

`config/presentation.json` の `sounds` にある、現行の重打音の定義です。

```js
const heavyScore = {
  name: '重打',
  use: '強打・体当たり',
  instrument: 'kick',
  gain: 0.7,
  notes: [
    { pitch: 36, start: 0, seconds: 0.2, velocity: 104 }
  ]
};
```

- 外側のキー `se_heavy`：SEを参照するID。
- `name`：表示・管理用の名前。
- `use`：使用する場面の説明。これだけではゲームへの割り当ては変わりません。
- `instrument`：AIMusic側の音色ID。上例ではキック音です。
- `gain`：完成したSEをゲームで再生するときの音量係数。0〜1です。
- `notes`：音符の配列。同じ `start` なら同時に、異なる `start` なら時間をずらして鳴らします。
- `pitch`：MIDI音高番号。Hzではありません。キックなどの打楽器では、生成器が音色に対応する固定音高へ置き換えます。
- `start`：SE開始から音符開始までの秒数。
- `seconds`：音符自体の長さ。秒単位です。音色の余韻を含む完成ファイルの長さとは異なります。
- `velocity`：音符の強さ。AIMusic側では1〜127の整数です。録音の音圧を直接表す値ではありません。

例えば、現行の回復音は次の3音です。

```js
const healingScore = {
  name: '回復',
  use: '治療・休息',
  instrument: 'bell',
  gain: 0.7,
  notes: [
    { pitch: 76, start: 0, seconds: 0.48, velocity: 104 },
    { pitch: 80, start: 0.085, seconds: 0.264, velocity: 84 },
    { pitch: 83, start: 0.17, seconds: 0.264, velocity: 84 }
  ]
};
```

高い音へ順に移りながら、前の音の余韻へ次の音を重ねます。MIDI音高からHzへの変換は、同梱の合成器では次の式です。

```js
const frequencyHz = pitch => 440 * 2 ** ((pitch - 69) / 12);
```

生成は [generate-effects.mjs](../../tools/assets/generate-effects.mjs) が担当します。楽譜をAIMusicのプロジェクトへ変換し、PCMを生成、ピーク調整と短いフェードを加えてOGGにします。生成器内部では開始秒数・長さを1920倍してtickへ変換します。ゲーム用の登録形式は次の形です。

```js
const heavySound = {
  name: '重打',
  asset: 'se_heavy',
  gain: 0.7
};
```

これは音符の定義ではなく、生成済み音声素材の参照です。`asset` は [data/assets.json](../../data/assets.json) の音声IDに対応します。

## 3. 追加合成音：波形と時間変化で記述する

追加合成音は `battleSoundVoices(kind)` が返す配列です。現在はJavaScript内の定義であり、任意のJSONファイルから読み込む機能はありません。戻り値の各要素が一つの音源になります。

### 3.1 各項目の意味

- `type`：現行プリセットでは `sine` が正弦波、`triangle` が三角波、`noise` がノイズです。
- `frequency`：波形音では開始周波数、ノイズではバンドパスフィルターの中心周波数です。どちらもHz単位ですが、役割が異なります。
- `end`：波形音の終了周波数。Hz単位です。ノイズでは使いません。
- `duration`：その音の開始から減衰終了までの秒数。
- `gain`：その音源の最大振幅の係数。dB値でも、スピーカーの実測音量でもありません。
- `delay`：その演出イベントから音源を開始するまでの秒数。

例えば `frequency: 850` のノイズは、850Hzの単音という意味ではありません。広い周波数を含むノイズから、850Hz付近を通した音です。

### 3.2 強打音の実データ

```js
const heavyVoices = [
  {
    type: 'sine', frequency: 135, end: 42,
    duration: 0.24, gain: 0.16, delay: 0
  },
  {
    type: 'noise', frequency: 850,
    duration: 0.13, gain: 0.10, delay: 0
  },
  {
    type: 'sine', frequency: 68, end: 38,
    duration: 0.20, gain: 0.055, delay: 0.035
  }
];
```

最初の正弦波で低い衝撃を作り、ノイズで接触時の荒さを加え、35ms遅れて別の低音を重ねます。これは既存の `se_heavy` を置き換えるものではなく、その音声と同時に鳴る追加層です。

### 3.3 定義に書かず、再生器側で固定している部分

- 波形音の周波数は、開始値から終了値まで指数的に変化します。周波数の端点は正の値を使います。
- 各音の振幅は0.0001から始まり、4msで `gain` まで線形に上がり、`duration` の終端まで指数的に0.0001へ下がります。現行の全プリセットは4msより長い音です。
- 音源は減衰終了の5ms後に停止します。
- ノイズは固定seed `76431` から作る0.5秒のバッファです。フィルターは `bandpass`、Qは0.65です。ゲーム用乱数は消費しません。
- 音源の開始遅延は0以上、長さは4msより長く、周波数の端点は正の値で記述します。ノイズを0.5秒より長くする場合は、バッファの長さやループ再生への対応も必要です。追加合成音の汎用JSON検証器は現時点ではありません。
- 現行の記述では立上がり時間、フィルターQ、残響、歪みを音ごとに指定できません。変更するには再生器の対応が必要です。
- 元の効果音ファイル、生成式、ノイズ生成法も音の一部です。数字の一覧だけを別の合成方式へ移しても、波形まで同一になるとは限りません。

### 3.4 追加合成音の全プリセット

以下は現行の12分類を、実装と同じ補助関数の引数で表した一覧です。`tone` の引数は開始Hz、終了Hz、秒数、振幅、遅延秒数、波形です。`noise` の引数はフィルター中心Hz、秒数、振幅、遅延秒数です。

```js
const tone = (frequency, end, duration, gain, delay = 0, type = 'sine') =>
  ({ type, frequency, end, duration, gain, delay });
const noise = (frequency, duration, gain, delay = 0) =>
  ({ type: 'noise', frequency, duration, gain, delay });

const soundLayers = {
  swing: [noise(1900, .09, .035)],
  bow: [tone(310, 120, .09, .055, 0, 'triangle')],
  slash: [noise(3200, .075, .10), tone(170, 65, .13, .075)],
  pierce: [noise(4700, .055, .085), tone(980, 350, .10, .055, 0, 'triangle')],
  heavy: [tone(135, 42, .24, .16), noise(850, .13, .10), tone(68, 38, .20, .055, .035)],
  critical: [noise(3900, .09, .13), tone(190, 48, .24, .14), tone(1760, 880, .17, .045, .015, 'triangle')],
  guard: [tone(880, 820, .16, .07, 0, 'triangle'), tone(1320, 1220, .13, .035), noise(4800, .035, .045)],
  heal: [tone(660, 660, .22, .045), tone(880, 880, .22, .04, .055), tone(1320, 1320, .26, .035, .11)],
  fire: [noise(650, .24, .13), tone(115, 40, .24, .09)],
  ice: [tone(1480, 720, .18, .055, 0, 'triangle'), tone(2220, 1100, .15, .035, .025), noise(5900, .07, .06)],
  lightning: [noise(4200, .055, .11), tone(110, 45, .16, .09), noise(3200, .045, .055, .045)],
  defeat: [noise(650, .32, .065), tone(100, 28, .32, .08)]
};
```

`swing` は予備動作の風切り、`bow` は弓の短い音、`slash` は斬撃、`pierce` は刺突、`heavy` は強打、`critical` は会心、`guard` は防御、`heal` は回復、`fire`・`ice`・`lightning` は各属性、`defeat` は撃破の追加層です。

## 4. 画面演出：トラックとキーフレームで記述する

基本形は、効果のIDに `name`、`category`、`duration`、`tracks` を持たせます。次は現行の `hit_shake` です。

```js
const hitShake = {
  name: '小振動',
  category: 'script',
  duration: 280,
  tracks: [{
    kind: 'motion',
    frames: [
      { at: 0, x: 0 },
      { at: 0.2, x: -7 },
      { at: 0.4, x: 6 },
      { at: 0.6, x: -4 },
      { at: 0.8, x: 2 },
      { at: 1, x: 0 }
    ]
  }]
};
```

`duration` はミリ秒です。`at` は秒数ではなく、その効果の開始を0、終了を1とした割合です。この例の `at: 0.2` は開始56ms後を意味します。対象を左右へ振り、振幅を小さくしながら元の位置へ戻します。

### 4.1 動きの指定

`kind: 'motion'` のキーフレームには次を指定できます。

- `at`：0〜1。先頭0、末尾1、途中は昇順で重複なし。
- `x`、`y`：移動量。CSSピクセル単位、各−200〜200。省略時0。
- `rotate`：回転角。度単位、−360〜360。省略時0。
- `skewX`、`skewY`：傾斜角。度単位、各−40〜40。省略時0。
- `scaleX`、`scaleY`：拡大率。各0.1〜3。省略時1。
- `opacity`：不透明度。0〜1。省略時1。

トラック側の `directed: true` は、移動量の向きを攻撃元と対象の位置関係に合わせます。通常のX・Y方向へ動かすときは省略します。

効果の長さは50〜5000ms、トラックは1〜8個、motionのキーフレームは2〜32個です。これらは [feedback-validation.js](../../src/core/feedback-validation.js) と [effects.schema.json](../../data/schemas/effects.schema.json) で検査します。

### 4.2 その他のトラック

- `strike`：`pattern` に `slash`・`blunt`・`pierce`、`color` に色を指定します。斬撃の形などの細部は [battle-effects.js](../../src/view/battle-effects.js) が描きます。
- `projectile`：`color` を指定します。攻撃元から対象へ矢形を飛ばします。飛ぶ時間は外側の `duration` です。
- `sprite`：`asset`、`frames`、`columns`、`cell`、必要なら `scale` を指定します。`asset` は画像素材ID、`cell` は1コマのピクセル寸法です。
- `split`：`axis` に `vertical` または `diagonal`、`distance` に分離距離0〜100、`rotate` に回転角−45〜45を指定します。
- `tint`：`color` と `opacity` で対象へ一時的な色を重ねます。
- `shade`：`color` と `opacity` で周縁側へ色を重ねます。

色は `#RRGGBB`、tint・shadeの不透明度は0〜0.65です。spriteは2〜64コマ、1〜64列、セル8〜512px、拡大率0.1〜3に対応します。効果内の複数トラックは同時に始まり、同じ `duration` を使います。トラックごとの開始遅延は現行JSONにはありません。

現行の回復用連番画像は次の定義です。

```js
const healingRing = {
  name: '治療の輪',
  category: 'animation',
  duration: 560,
  tracks: [{
    kind: 'sprite', asset: 'fx_healing_ring',
    frames: 8, columns: 8, cell: 128, scale: 1.25
  }],
  palette: '#91dbaa'
};
```

`palette` は画像生成側の色指定です。再生時に既存PNGを自動で塗り替える項目ではありません。`category` も制作方式の区分で、実際の再生処理は各トラックの `kind` で決まります。

### 4.3 追加粒子の現在の定義

追加の火花・輪・光・破片は基本34効果とは別に、確定結果から描く処理です。現在はJSONの独立した効果IDではありません。

- 斬撃 `slash`：色 `#ffe4a1`、火花4個、240ms。
- 刺突 `pierce`：色 `#c7eaff`、火花4個、240ms。
- 強打 `heavy`：色 `#ffc078`、火花7個、衝撃波、240ms。
- 会心 `critical`：色 `#ffdf74`、火花10個、衝撃波、300ms。
- 防御 `guard`：色 `#a9d9ff`、火花4個、青い円弧、240ms。
- 回復 `heal`：色 `#9df7c2`、上昇する光8個、光の輪。粒子420ms、輪300ms。
- 炎 `fire`：色 `#ff945d`、火花4個、240ms。
- 氷 `ice`：色 `#aeeaff`、火花4個、240ms。
- 雷 `lightning`：色 `#e8ceff`、火花4個、240ms。
- 撃破 `defeat`：色 `#bda68b`、下方へ散る粒子8個、360ms。

基準サイズは対象表示の幅・高さの大きい方の72%で、45〜140pxへ制限します。輪は倍率0.3から0.9、1.45へ広がり、不透明度0.85から0.6、0へ変化します。粒子は中心付近から外側へ移動し、回復では上昇、撃破では下方への散開に変えます。

重なり順は、反動中のキャラクター、追加の火花・輪と攻撃軌跡、ダメージ数字の順です。Sceneではz-indexが20・21・22、Classicでは追加効果81・数字82です。調整時には、動かしているキャラクターの複写画像に効果が隠れないことを確認します。

## 5. 音と映像を同じ時刻へ結び付ける

### 5.1 cueの定義

`config/presentation.json` の `cues.power` は次の形です。

```js
const powerCue = {
  effects: ['strike_blunt', 'recoil_blunt'],
  sound: 'se_heavy',
  target: 'target',
  gap: 240,
  battle: {
    impact: 130,
    anticipation: 'enemy_advance',
    actorAnticipation: 'actor_strike'
  }
};
```

- `effects`：命中時に再生する基本効果IDの配列。最大8個。
- `sound`：命中時に再生する既存SEのID。
- `target`：対象指定。`target` は呼び出し側から渡す対象です。`scene`・`screen`・`party` などの指定もあります。
- `battle.impact`：その行動の開始から命中までのミリ秒。0〜1000。
- `battle.anticipation`：敵側の予備動作。
- `battle.actorAnticipation`：味方側の予備動作。`battle.anticipation` があるcueで、これを省略した場合には味方用の踏み込みを使います。予備動作を出す条件そのものは `battle.anticipation` の有無です。
- `battle.projectile`：任意の飛翔効果。予備動作と同じ行動開始時刻から再生します。
- `gap`：戦闘では命中後から次の行動開始までの間隔。0〜1000ms。戦闘以外の通常cueでは、そのcueの開始から次のcueまでの間隔です。

強打では開始0msに予備動作、130msにSE・軌跡・反動・火花・HP更新が始まります。追加低音の `delay: 0.035` はこの命中を基準にするので、行動開始165ms後に鳴ります。通常の次行動開始は130＋240＝370ms後です。次の行動と前の演出の余韻が重なることがあります。

撃破時は命中160ms後に消散を開始し、次の行動までの命中後の間隔を最低420msにします。演出全体が終わる時刻は、最後のイベントとその効果の長さ、数字の表示時間から別に決めます。

### 5.2 武器・技能との対応

`bindings.skills` は技能IDからcueへ、`bindings.weapons` は通常攻撃時の武器種からcueへ対応させます。現行の武器対応は次のとおりです。

```js
const weaponCues = {
  sword: 'attack',
  dagger: 'pierce',
  axe: 'power',
  spear: 'pierce',
  bow: 'bow_attack',
  fist: 'power',
  staff: 'power',
  tool: 'power',
  instrument: 'power'
};
```

味方の通常攻撃に装備種の対応があればそれを選び、それ以外は技能のcueを使います。弓は飛翔効果 `arrow_flight` を開始0msから130ms間再生し、命中時に刺突演出へつなぎます。

### 5.3 確定結果を渡すイベント

ゲーム内部の演出イベントには、次のような情報を渡します。これは保存データの入力形式ではなく、一度の行動結果を再生するための内部データの例です。

```js
const impactEvent = {
  at: 130,
  phase: 'impact',
  action: 'アダ・強打',
  effects: ['strike_blunt', 'recoil_blunt'],
  sound: 'se_heavy',
  gain: 1,
  source: { key: 'actor:ada' },
  targets: [{
    key: 'enemy:enemy_0',
    hpBefore: 32, hpAfter: 20, damage: 12,
    critical: false, guarded: false,
    weak: false, resisted: false,
    missed: false, defeated: false,
    statusAdded: [], statusRemoved: []
  }]
};
```

`at` はそのフィードバック列の開始からのミリ秒、`phase` は `windup`・`flight`・`impact`・`defeat` です。回復では `healing`、MP変化では `mpBefore`・`mpAfter` なども渡します。表示用への変換時には、`sound` のIDを音声URLと合成済みの音量係数へ変換します。

追加演出の選択は、予備動作→`swing`、飛翔→`bow`、撃破→`defeat` です。命中では対象ごとに、回避を除外し、回復、防御、会心、強打、炎、氷、雷、刺突、それ以外の斬撃という順に分類します。無ダメージで回復・防御にも該当しない結果は追加音・粒子を出しません。

音はイベント単位で一つの分類を選び、画面効果は各対象に出します。全体攻撃でも人数分の同一SEを重ねません。全対象が回避した場合は命中音と命中効果を出さず、回避表示を残します。

弱点・軽減・状態付与・状態解除は結果表示であり、現在それぞれに独立した追加合成音プリセットはありません。会心と弱点などが同時成立しても、追加音を無制限に積み重ねる仕組みではありません。

## 6. 音量・BGM・取消・軽減設定

- 既存SEの再生音量は、マスター音量×SE音量×SE定義の `gain` ×イベントの `gain` を0〜1へ制限した値です。
- 合成音は各音源のエンベロープに、マスター音量×SE音量を掛けます。既存SE定義の `gain` とイベントの `gain` は、この追加合成音には直接掛かりません。
- 同時発音は既存SEが最大8音、追加合成音が最大24音。上限を超える場合は古い音を止めます。
- 強打・会心・撃破ではBGMを設定音量の64%にし、70ms後72%、110ms後84%、150ms後94%、190ms後100%へ戻します。
- BGMを下げても利用者の音量設定自体は変更しません。演出省略・再描画・ロードで音と予約を止め、BGMを設定音量へ戻します。
- HPの見た目は命中時刻へ揃えます。戦闘計算・支払い・保存は既に確定しており、演出の完了や省略で再計算しません。
- 演出省略はボタン、Enter、Escで行います。音・粒子・BGM復帰の予約も取り消します。
- `reduced` とOSの動き軽減では追加の動く粒子を抑制し、基本効果は控えた表示へ置き換えます。`off` は画面効果を止めます。音の有効・無効は別の設定です。
- Web Audioが利用できない場合も、既存OGGの再生経路は残します。

## 7. 編集・確認の手順

1. 音色・音符を変えるなら `config/presentation.json` の `sounds`、基本の動きなら `effects`、技能との組み合わせなら `cues`・`bindings` を編集します。
2. 追加合成音のHz・長さ・重ね方は `battle-sound.js`、追加粒子の色は `battle-accent.js`、軌道・個数・時間は `battle-impact.js` を編集します。
3. 原稿とゲーム用JSONの同期は [build-presentation.mjs](../../tools/build-presentation.mjs)、音声・連番画像の生成は [generate-effects.mjs](../../tools/assets/generate-effects.mjs) が担当します。後者は全SEと連番画像を再生成します。
4. `build-presentation.mjs` は音・演出以外にも `data/game.json` の版・移行定義やジョブ定義を更新します。現行作品版を意図せず巻き戻していないか、生成差分を確認します。文書だけの変更では実行しません。
5. 配信対象のソース・CSS・データを変えたときは [build-runtime.mjs](../../tools/build-runtime.mjs) で指紋を更新します。必要に応じて原稿側編集画面やデータ集計も対応する生成器で更新します。
6. 音量・命中同期・省略・再描画・保存結果不変と、Scene／Classic、通常／Grid／Frontline、PC／狭い画面、動き軽減・オフを確認します。

関連試験は [battle-impact.test.mjs](../../tests/battle-impact.test.mjs)、[battle-feedback.test.mjs](../../tests/battle-feedback.test.mjs)、[battle-playback.test.mjs](../../tests/battle-playback.test.mjs)、[audio.test.mjs](../../tests/audio.test.mjs)、[presentation.test.mjs](../../tests/presentation.test.mjs) です。実ブラウザー検査は [browser-effects-smoke.mjs](../../tools/browser-effects-smoke.mjs) です。

ブラウザー検査では10種類の既存SE＋合成音を `OfflineAudioContext` で実際に生成し、無音でないこと、ピークがクリッピングへ達しないこと、波形が同一になっていないことを確認します。スピーカーで聴いて自然さ・迫力・聞き疲れを評価する作業とは分けます。

## 8. 共通の外部データ形式へ整理する場合の案（未実装）

現行の既存SE・基本効果はJSONですが、追加合成音と粒子はJavaScript内にあります。共通化するなら、音源・合成音プリセット・表示効果をそれぞれ登録し、それらをIDと時刻で組み合わせる形が考えられます。

例えば演出側は次の記述にできます。以下の `version`・`tracks`・`atMs`・`profile`・`source` などの組み合わせを読み込む機能は、現在のadvにはありません。

```js
const proposedCue = {
  version: 1,
  id: 'heavy_hit',
  tracks: [
    { kind: 'effect', atMs: 0, target: 'source', effect: 'actor_strike' },
    { kind: 'sound', atMs: 130, sound: 'se_heavy' },
    { kind: 'synth', atMs: 130, profile: 'heavy' },
    { kind: 'effect', atMs: 130, target: 'target', effect: 'strike_blunt' },
    { kind: 'effect', atMs: 130, target: 'target', effect: 'recoil_blunt' }
  ]
};
```

- `version`：この共通記述形式の版。
- `id`：演出の名前となるID。
- `tracks`：時刻付きの再生命令。配列順による逐次実行ではなく、各 `atMs` で開始します。
- `kind`：既存音声、合成音プリセット、表示効果のどれを使うか。
- `atMs`：一つの演出の開始からのミリ秒。音源内部の `duration`・`delay` は第3節と同じ秒数として区別します。
- `sound`・`profile`・`effect`：それぞれ別の定義集にあるIDへの参照。
- `target`：呼び出し時に解決する攻撃元または対象。

実装する際は、外部定義の読込と型・範囲・ID参照の検査、内部の秒・ミリ秒変換、既存cueとの互換、取消と動き軽減を共通の再生契約にします。素材や再生APIを変えても、音の部品、合成した音、表示効果、ゲーム結果との対応をそれぞれ差し替えられる構成を目指します。
