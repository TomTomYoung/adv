# 音・戦闘演出の記述形式

更新日: 2026-11-09。PR #223の音・演出エディター、共通定義形式 version 1 に対応。

音は音源・高さ・音量変化・時間・加工・重ね方で、画面演出は形・位置・回転・大きさ・色・透明度の時間変化で記述します。それらを命中などの同じ時刻に結び付けることで、一つの戦闘演出にします。

本書は現行実装の定義と編集場所を説明します。共通形式の読込・検証・再生と、単体編集画面を実装しています。既存SEの全28種は[SE一覧](SE_CATALOG.md)、基本表示効果の全34種は[エフェクト一覧](EFFECT_CATALOG.md)を参照してください。

## 1. 記述の段階と編集場所

1. 部品：一つの音、ノイズ、録音済み素材、動き、色変化、画像の連番など。
2. 組み合わせ：複数の部品を重ねて、強打音や被弾反動などを作る。
3. 演出のまとまり：予備動作・音・命中効果・反動を時刻と対象で結び付ける。
4. ゲームとの接続：武器・技能と、会心・防御・回復・撃破などの確定した結果から演出を選ぶ。

現在の編集場所は次のとおりです。

1. [config/presentation.json](../../config/presentation.json)：既存SEの楽譜、基本効果、音と効果を結ぶ `cues`、武器・技能などの `bindings`。
1. [data/sounds.json](../../data/sounds.json)、[data/effects.json](../../data/effects.json)、[data/presentation.json](../../data/presentation.json)：原稿から生成するゲーム用定義。
1. [config/battle-presentation.json](../../config/battle-presentation.json)：追加合成音、粒子、軌道、タイムライン、材質、ミキサーの編集元。
1. [battle-presentation-editor.html](../../battle-presentation-editor.html)：単体の試聴・試写、編集、A/B比較、JSON読込・書出。
1. [src/presentation-design.js](../../src/presentation-design.js)：型・範囲・参照の検査と、タイムラインを再生命令へ展開する純粋処理。
1. [data/schemas/battle-presentation.schema.json](../../data/schemas/battle-presentation.schema.json)：JSON Schema。未知の項目を拒否します。
1. [src/application/battle-sound.js](../../src/application/battle-sound.js)：定義からWeb Audioノードを組み立てる再生処理。
1. [src/battle-accent.js](../../src/battle-accent.js)：確定結果から選ぶ追加演出の種類。
1. [src/view/battle-impact.js](../../src/view/battle-impact.js)：追加粒子、曲線軌道、残像、光線の描画処理。値は共通JSONから受け取ります。
1. [src/application/audio.js](../../src/application/audio.js)：音量、同時発音数、取消、BGMの一時減音。

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

1. 外側のキー `se_heavy`：SEを参照するID。
1. `name`：表示・管理用の名前。
1. `use`：使用する場面の説明。これだけではゲームへの割り当ては変わりません。
1. `instrument`：AIMusic側の音色ID。上例ではキック音です。
1. `gain`：完成したSEをゲームで再生するときの音量係数。0〜1です。
1. `notes`：音符の配列。同じ `start` なら同時に、異なる `start` なら時間をずらして鳴らします。
1. `pitch`：MIDI音高番号。Hzではありません。キックなどの打楽器では、生成器が音色に対応する固定音高へ置き換えます。
1. `start`：SE開始から音符開始までの秒数。
1. `seconds`：音符自体の長さ。秒単位です。音色の余韻を含む完成ファイルの長さとは異なります。
1. `velocity`：音符の強さ。AIMusic側では1〜127の整数です。録音の音圧を直接表す値ではありません。

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

編集元は `config/battle-presentation.json` の `profiles` です。各IDに `name`、`voices`、`priority`、`cooldownMs` を指定します。`voices` は1〜12音源を重ねる配列です。

### 3.1 音源の項目と単位

1. `wave`：`sine` 正弦波、`triangle` 三角波、`square` 矩形波、`sawtooth` 鋸歯状波、`noise` ノイズ。
1. `atMs`：この合成音の開始から音源を開始するまでの遅延、0〜5000ms。
1. `durationMs`：音源の長さ、10〜5000ms。残響・反響の尾は別に加算します。
1. `gain`：音源振幅の係数、0〜0.5。dB値やスピーカーの実測音量ではありません。
1. `pitch`：周波数Hzの曲線、20〜20000Hz。ノイズ自体には一定の音高がありません。ノイズに明示的な `filter` がない場合はバンドパスの中心周波数として扱います。
1. `envelope`：`gain` に掛ける音量の曲線、0〜1。
1. `pan`：左右位置、左端−1〜中央0〜右端1。イベントの位置へ加算して範囲内に制限します。
1. `distance`：距離による追加減衰、0〜10。係数は `1 / (1 + distance)`。実際のメートル数ではありません。

曲線は2〜32個の `{ at, value, curve? }` です。`at` は音源の長さを0〜1に正規化した時刻で、開始0・終了1が必要です。途中点の時刻は昇順です。`curve` はその点へ至る補間で、`linear`、`exponential`、`step` を指定します。省略時は線形補間です。指数補間の0は内部で0.0001に置き換え、音源終端後に完全に消音します。

### 3.2 音量と音程の曲線の例

以下は `profiles.charge` に登録済みの溜め音の音源部分です。

```js
const chargeVoice = {
  wave: 'sawtooth', atMs: 0, durationMs: 650, gain: 0.035,
  pitch: [
    { at: 0, value: 110 },
    { at: 0.7, value: 440, curve: 'exponential' },
    { at: 1, value: 220, curve: 'exponential' }
  ],
  envelope: [
    { at: 0, value: 0 },
    { at: 0.7, value: 1 },
    { at: 1, value: 0 }
  ],
  filter: {
    type: 'lowpass', frequency: 700, q: 1.5,
    cutoff: [{ at: 0, value: 350 }, { at: 1, value: 2200 }]
  },
  vibrato: { hz: 7, cents: 25 },
  echo: { delayMs: 100, gain: 0.15, taps: 2 }
};
```

この音源は650msかけて膨らみ、音程が110Hzから440Hzへ上がって220Hzへ下がります。高い周波数を通す範囲も広がり、100ms間隔の反響が2回続きます。

### 3.3 音色加工

1. `filter`：`type`、`frequency`、`q` が必須です。種類は `lowpass`、`highpass`、`bandpass`、`notch`、`peaking`、`lowshelf`、`highshelf`。周波数20〜20000Hz、Qは0.01〜30、任意の `gain` は−24〜24dBです。`cutoff` に周波数曲線を書くと `frequency` の固定値より優先します。
1. `vibrato`：`hz` が揺れの速度0.1〜40Hz、`cents` が音程の振れ幅0〜1200centです。波形音に適用します。
1. `distortion`：0〜50。波形を飽和させる強さ。0は加工なしです。
1. `echo`：`delayMs` は10〜1000ms、`gain` は0〜0.6、`taps` は1〜4回。第n反響の係数は `gain  n`。無限フィードバックを使いません。
1. `reverb`：`durationMs` は20〜1500ms、`mix` は0〜0.5。固定シードの減衰ノイズを使う残響です。

音源→フィルター→歪み→音量曲線→原音と反響・残響→距離減衰→左右定位→SE音量→コンプレッサーの順です。ノイズは0.5秒のバッファをループし、長い音にも対応します。音源・LFO・反響経路は省略・停止時に切断します。

### 3.4 バリエーションと材質

`variation: { cents: 18, gain: 0.04 }` は音程を±18cent、振幅を±4%変えます。`variants` に音源配列を複数追加すると、`voices` を含む候補から一つを選びます。演出専用の決定的な乱数を使い、ゲーム用乱数と保存結果に影響しません。編集画面のA/B比較ではシードを固定します。

基本12種類は `swing`、`bow`、`slash`、`pierce`、`heavy`、`critical`、`guard`、`heal`、`fire`、`ice`、`lightning`、`defeat`。材質6種類は `material_flesh`、`material_metal`、`material_shield`、`material_stone`、`material_wood`、`material_water`。加えて作例 `charge` があり、計19プリセットです。

`materials` は材質名→合成音ID、`materialSprites` は敵画像ID→材質名です。標準では `construct`→金属、`skeleton`→石、`slime`→水、それ以外は肉体です。これは制作上の初期割当で、画像IDごとに変更できます。防御時は盾を優先します。物理命中・会心・防御に材質音を1回重ねます。全体攻撃の各対象ごとに同じ音を増殖させません。

`battleSoundVoices(kind)` は旧コード向けの互換ヘルパーです。新しい曲線・加工・材質の編集には共通JSONを使います。

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

1. `at`：0〜1。先頭0、末尾1、途中は昇順で重複なし。
1. `x`、`y`：移動量。CSSピクセル単位、各−200〜200。省略時0。
1. `rotate`：回転角。度単位、−360〜360。省略時0。
1. `skewX`、`skewY`：傾斜角。度単位、各−40〜40。省略時0。
1. `scaleX`、`scaleY`：拡大率。各0.1〜3。省略時1。
1. `opacity`：不透明度。0〜1。省略時1。

トラック側の `directed: true` は、移動量の向きを攻撃元と対象の位置関係に合わせます。通常のX・Y方向へ動かすときは省略します。

効果の長さは50〜5000ms、トラックは1〜8個、motionのキーフレームは2〜32個です。これらは [feedback-validation.js](../../src/core/feedback-validation.js) と [effects.schema.json](../../data/schemas/effects.schema.json) で検査します。

### 4.2 その他のトラック

1. `strike`：`pattern` に `slash`・`blunt`・`pierce`、`color` に色を指定します。斬撃の形などの細部は [battle-effects.js](../../src/view/battle-effects.js) が描きます。
1. `projectile`：`color` を指定します。攻撃元から対象へ矢形を飛ばします。飛ぶ時間は外側の `duration` です。
1. `sprite`：`asset`、`frames`、`columns`、`cell`、必要なら `scale` を指定します。`asset` は画像素材ID、`cell` は1コマのピクセル寸法です。
1. `split`：`axis` に `vertical` または `diagonal`、`distance` に分離距離0〜100、`rotate` に回転角−45〜45を指定します。
1. `tint`：`color` と `opacity` で対象へ一時的な色を重ねます。
1. `shade`：`color` と `opacity` で周縁側へ色を重ねます。

色は `#RRGGBB`、tint・shadeの不透明度は0〜0.65です。spriteは2〜64コマ、1〜64列、セル8〜512px、拡大率0.1〜3に対応します。各トラックに任意の `atMs` と `durationMs` を指定できます。省略時は開始0ms、長さは効果の `duration` です。開始＋長さは5000ms以内です。`projectile` に `path` を書くと共通定義の曲線軌道IDを使います。

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

追加の火花・輪・光・破片は基本34効果とは別に、確定結果から描く処理です。共通JSONの `particles` に独立したIDで登録します。

1. 斬撃 `slash`：色 `#ffe4a1`、火花4個、240ms。
1. 刺突 `pierce`：色 `#c7eaff`、火花4個、240ms。
1. 強打 `heavy`：色 `#ffc078`、火花7個、衝撃波、240ms。
1. 会心 `critical`：色 `#ffdf74`、火花10個、衝撃波、300ms。
1. 防御 `guard`：色 `#a9d9ff`、火花4個、青い円弧、240ms。
1. 回復 `heal`：色 `#9df7c2`、上昇する光8個、光の輪。粒子420ms、輪300ms。
1. 炎 `fire`：色 `#ff945d`、火花4個、240ms。
1. 氷 `ice`：色 `#aeeaff`、火花4個、240ms。
1. 雷 `lightning`：色 `#e8ceff`、火花4個、240ms。
1. 撃破 `defeat`：色 `#bda68b`、下方へ散る粒子8個、360ms。

粒子の項目は `color`、`count`（1〜32）、`durationMs`（40〜2000）、`size`（1〜40px）、`speed`（0〜800px/s）、`directionDeg`（−360〜360度）、`spreadDeg`（0〜360度）、`gravity`（−1000〜1000px/s²）、`shape`（`spark` / `circle` / `square`）、`scale` と `alpha` の曲線です。角度0は右、90は下、−90は上。速度には固定シードで0.75〜1.25倍の散らばりを付けます。任意の `colors` は `{ at, color }` の配列で、開始0・終了1を含めます。

`ring` は任意で、`durationMs`、倍率 `from` / `to`、`opacity` を指定します。輪の基準サイズは対象表示の幅・高さの大きい方の72%で、45〜140pxへ制限します。粒子の速度・大きさはピクセル基準です。

### 4.4 軌道・残像・光線

`paths` に `name`、`color`、`width` / `height`（px）、`durationMs`、`arc`（−400〜400px）、`trail`（残像0〜12個）を指定します。`arc` は直線から中点でどれだけ上下へ曲げるかで、負は上方向です。`beam: true` は対象まで伸びる直線光線にします。光線では `arc` と `trail` を使用しません。

通常の弓攻撃に使う `arrow`（130ms・上向き18pxの弧・残像3個）、作例の曲射 `arc` と光線 `beam`、組み合わせ作例 `arc_demo` と `beam_demo` を登録しています。全体画面を動かさず、攻撃側と対象の間に描画します。動き軽減・演出オフでは描画しません。

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

1. `effects`：命中時に再生する基本効果IDの配列。最大8個。
1. `sound`：命中時に再生する既存SEのID。
1. `target`：対象指定。`target` は呼び出し側から渡す対象です。`scene`・`screen`・`party` などの指定もあります。
1. `battle.impact`：その行動の開始から命中までのミリ秒。0〜1000。
1. `battle.anticipation`：敵側の予備動作。
1. `battle.actorAnticipation`：味方側の予備動作。`battle.anticipation` があるcueで、これを省略した場合には味方用の踏み込みを使います。予備動作を出す条件そのものは `battle.anticipation` の有無です。
1. `battle.projectile`：任意の飛翔効果。予備動作と同じ行動開始時刻から再生します。
1. `gap`：戦闘では命中後から次の行動開始までの間隔。0〜1000ms。戦闘以外の通常cueでは、そのcueの開始から次のcueまでの間隔です。

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

1. 既存SEの再生音量は、マスター音量×SE音量×SE定義の `gain` ×イベントの `gain` を0〜1へ制限した値です。
1. 合成音は各音源のエンベロープに、マスター音量×SE音量を掛けます。既存SE定義の `gain` とイベントの `gain` は、この追加合成音には直接掛かりません。
1. 同時発音は既存SEが最大8音、追加合成音が最大24音。上限は共通JSONの `mixer` で変更できます。上限では低優先度の音から止め、同じ優先度なら古い音を止めます。再生中の音がすべて高優先度の場合、新しい低優先度音を鳴らしません。
1. 強打・会心・撃破ではBGMを設定音量の64%にし、70ms後から190msまでの4段階で100%へ戻します。`duckGain`、`duckHoldMs`、`duckReleaseMs`、`duckPriority` で設定します。
1. `priority` は0〜100、`cooldownMs` は同じ合成音の再発音を抑える0〜1000msです。`mixer.compressor` はSE全体の `threshold`（dB）、`knee`（dB）、`ratio`、`attack` / `release`（秒）。Web Audio利用時は既存SEも合成音と同じコンプレッサーへ通します。BGMは別経路で減音します。これは最終出力のクリッピングを完全に保証するリミッターではありません。
1. 左右位置は表示対象の画面内位置から取り、飛翔の合成音は攻撃側から対象へ移動します。`spatial: { pan, panEnd, distance }` を指定すると上書きできます。既存SEの定位は発音時の固定位置です。
1. BGMを下げても利用者の音量設定自体は変更しません。演出省略・再描画・ロードで音と予約を止め、BGMを設定音量へ戻します。
1. HPの見た目は命中時刻へ揃えます。戦闘計算・支払い・保存は既に確定しており、演出の完了や省略で再計算しません。
1. 演出省略はボタン、Enter、Escで行います。音・粒子・BGM復帰の予約も取り消します。
1. `reduced` とOSの動き軽減では追加の動く粒子を抑制し、基本効果は控えた表示へ置き換えます。`off` は画面効果を止めます。音の有効・無効は別の設定です。
1. Web Audioが利用できない場合も、既存OGGの再生経路は残します。

## 7. 編集・確認の手順

1. 音色・音符を変えるなら `config/presentation.json` の `sounds`、基本の動きなら `effects`、技能との組み合わせなら `cues`・`bindings` を編集します。
2. 追加合成音・粒子・軌道・タイムライン・材質・ミキサーは `config/battle-presentation.json` または専用編集画面で編集します。編集画面から書き出したJSONをこのファイルへ置き、`npm run build:battle-presentation` を実行します。この生成器は合成音・粒子の定義とスキーマ、配信指紋のみを更新し、作品版やジョブを更新しません。
3. 原稿とゲーム用JSONの同期は [build-presentation.mjs](../../tools/build-presentation.mjs)、音声・連番画像の生成は [generate-effects.mjs](../../tools/assets/generate-effects.mjs) が担当します。後者は全SEと連番画像を再生成します。
4. `build-presentation.mjs` は音・演出以外にも `data/game.json` の版・移行定義やジョブ定義を更新します。現行作品版を意図せず巻き戻していないか、生成差分を確認します。文書だけの変更では実行しません。
5. 配信対象のソース・CSS・データを変えたときは [build-runtime.mjs](../../tools/build-runtime.mjs) で指紋を更新します。必要に応じて原稿側編集画面やデータ集計も対応する生成器で更新します。
6. 音量・命中同期・省略・再描画・保存結果不変と、Scene／Classic、通常／Grid／Frontline、PC／狭い画面、動き軽減・オフを確認します。

関連試験は [presentation-design.test.mjs](../../tests/presentation-design.test.mjs)、[battle-impact.test.mjs](../../tests/battle-impact.test.mjs)、[battle-feedback.test.mjs](../../tests/battle-feedback.test.mjs)、[battle-playback.test.mjs](../../tests/battle-playback.test.mjs)、[audio.test.mjs](../../tests/audio.test.mjs)、[presentation.test.mjs](../../tests/presentation.test.mjs) です。実ブラウザー検査は [browser-effects-smoke.mjs](../../tools/browser-effects-smoke.mjs) です。

ブラウザー検査では10種類の既存SE＋合成音を `OfflineAudioContext` で実際に生成し、無音でないこと、ピークがクリッピングへ達しないこと、波形が同一になっていないことを確認します。スピーカーで聴いて自然さ・迫力・聞き疲れを評価する作業とは分けます。

## 8. 共通形式とタイムライン（実装済み）

ルートは `version: 1`、`profiles`、`particles`、`paths`、`timelines`、`bindings`、`materials`、`materialSprites`、`mixer` です。各定義のIDは英小文字始まりの英小文字・数字・アンダースコア、最大64文字です。完全な読込可能ファイルは [config/battle-presentation.json](../../config/battle-presentation.json) です。

タイムラインは `timelines` のIDごとに `name` と `tracks` を記述します。次は既存の定義集へ追加できる例です。

```js
const heavyHit = {
  name: '振りかぶって強打',
  tracks: [
    { kind: 'effect', atMs: 0, target: 'source', effect: 'actor_strike' },
    { kind: 'sound', atMs: 130, target: 'target', sound: 'se_heavy' },
    { kind: 'synth', atMs: 130, target: 'target', profile: 'heavy' },
    { kind: 'particles', atMs: 130, target: 'target', profile: 'heavy' },
    { kind: 'effect', atMs: 130, target: 'target', effect: 'recoil_blunt' }
  ]
};
```

1. `kind`：`sound`（既存SE）、`synth`（合成音）、`particles`、`path`、`effect`（基本効果）。
1. `atMs`：タイムラインの開始から0〜5000ms。配列順ではなく、この時刻で開始します。
1. `target`：`source`（攻撃側）または `target`（対象側）。
1. `profile`：`synth` / `particles` / `path` の各定義集のID。`effect` は `effect`、`sound` は `sound` のIDを使います。
1. `repeat`：1〜8回。2回以上なら `intervalMs`（20〜2000ms）が必要です。展開後の開始は5000ms以内、タイムライン全体で64命令以内です。
1. `gain`：`sound` の追加音量0〜1。`alternates` に追加の音声IDを1〜8個書くと、`sound` と合わせた候補から演出専用シードで選択します。
1. `priority`：この再生の優先度0〜100。省略時は合成音プリセットの優先度、録音済み音声のみの場合は40です。`cooldownMs` は同じ録音済み音声の連打を抑える0〜1000msです。合成音の再発音間隔は `profiles` の値を使います。
1. `spatial`：左右・距離・終点の上書き。`pan` / `panEnd` は−1〜1、`distance` は0〜10。

`bindings` は結果分類（`heavy`、`critical`、`heal`など）からタイムラインIDへの対応です。このとき `atMs: 0` は既存cueが決めた命中時刻などを意味します。既存の命中時刻130msを再び足すと二重に遅れるため、通常の追加演出は0msで重ねます。上の全体作例は専用プレビューなど、アクション開始を起点に組む場合の例です。既存cueの録音済みSEも残るため、追加タイムラインへ同じSEを記述すると重複再生になります。

`loadPresentationDesign(url)` はJSONを読み、型・範囲・未知項目・曲線の順序・ID参照を検証します。既存SE・基本効果の参照を検査する場合は `{ sounds, effects }` を渡します。`parsePresentationDesign(text, catalogs)` は文字列またはオブジェクトを検査します。エラーでは適用済み設定を置き換えません。音の再生器 `GameAudio.setDesign`、描画器 `EffectsRenderer.setDesign` に同じ検証済み定義を渡して使えます。

[build-battle-presentation.mjs](../../tools/build-battle-presentation.mjs) は原稿から `src/presentation-presets.js` とJSON Schemaを生成します。本編は生成済み定義を読みます。`--check` は原稿・参照・生成結果の一致を検査し、`npm run check` に含まれます。基本効果と音声素材の生成器は従来どおり別です。

## 9. 専用編集画面の使い方

1. [音・戦闘演出の編集](../../battle-presentation-editor.html)で合成音、粒子、軌道・残像、組み合わせを選びます。
2. 再生対象を音と映像・音のみ・映像のみから選択します。材質の追加音、左右位置、距離、音量、動き軽減も切り替えられます。
3. 数値欄で基本値を変更し、詳細JSONで曲線・フィルター・反響・残響・各トラックの開始時刻などを編集して適用します。変更後に再生を有効にすると自動プレビューします。
4. 現在をAに保持してからBを編集し、AとBを交互に再生します。Aを編集へ戻すこともできます。比較用シードは固定です。
5. 再生順序と合成音の波形・ピーク・RMSを確認します。波形は合成音のみで、録音済みSEやBGMを含みません。耳での調整に代わるものではありません。
6. JSONを書き出し、原稿へ反映して生成コマンドを実行します。読込は全体定義を検査してから適用します。ブラウザーを閉じる前に書き出してください。自動保存はありません。

停止・タブを隠す・画面のサイズ変更では、音と映像と予約を取り消します。編集中のJSONは戦闘状態やセーブへ入りません。
