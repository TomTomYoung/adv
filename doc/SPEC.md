# adv 現行仕様

最終調査日: 2026-09-09

この文書は、現行 `index.html` の実装を基準にした As-Is 仕様です。将来仕様ではなく、現在コード上に存在する機能と挙動を記録します。

## 1. プロジェクト概要

本作は Phaser 3 を利用したブラウザ向け分岐型アドベンチャーゲームの試作です。

現時点ではビルド工程を持たず、`index.html` 単体で HTML、CSS、シナリオデータ、ゲームロジックを保持しています。

Phaser は jsDelivr CDN から `3.60.0` を読み込みます。

ゲーム画面サイズは 800x600 固定です。

表示言語は日本語です。

## 2. 現在のファイル構成

調査時点の実体は以下です。

```text
/
└─ index.html
```

コード内では以下のアセットを参照しますが、調査時点ではリポジトリ内に存在しません。

```text
assets/
├─ splash.jpg
├─ images/
│  ├─ mansion_exterior.jpg
│  ├─ entrance_hall.jpg
│  ├─ mansion_garden.jpg
│  ├─ strange_plants.jpg
│  ├─ library.jpg
│  ├─ dining_room.jpg
│  └─ ghost.png
├─ ui/
│  ├─ text_window.png
│  ├─ choice_button.png
│  ├─ menu_button.png
│  └─ menu_bg.png
└─ audio/
   ├─ bgm_title.mp3
   ├─ bgm_mansion.mp3
   ├─ bgm_garden.mp3
   ├─ bgm_ghost.mp3
   ├─ se_click.mp3
   ├─ se_door_close.mp3
   ├─ se_wind.mp3
   └─ se_ghost.mp3
```

## 3. Phaser 設定

ゲーム生成設定は以下です。

```text
renderer: Phaser.AUTO
width: 800
height: 600
parent: game-container
backgroundColor: #000
scene callbacks: preload / create / update
```

`update()` は存在しますが、現在は実質的な処理を持ちません。

## 4. シナリオデータ

シナリオは `gameScenario.scenes` に JavaScript オブジェクトとして埋め込まれています。

現在定義済みの scene ID は6件です。

1. `start`
2. `entrance_hall`
3. `outside_investigation`
4. `strange_plants`
5. `left_door`
6. `right_door`

### 4.1 シーン構造

現行コードが扱うシーン属性は以下です。

```js
{
  scene_id: string,
  text: string,
  bg_image: string,
  character: string,
  bgm: string,
  se: string,
  choices: Array,
  set_flag: object // optional
}
```

`bgm`、`se`、`set_flag` はシーンによって省略可能です。

### 4.2 選択肢構造

```js
{
  text: string,
  next_scene: string,
  condition: string, // optional
  set_flag: object   // optional
}
```

`condition` が存在すると `evaluateCondition()` に渡されます。

`set_flag` が存在すると、選択時に `gameState.flags` に値を書き込みます。

### 4.3 現在のシーン遷移

```text
start
├─ entrance_hall
│  ├─ upstairs                [未定義]
│  ├─ left_door
│  │  ├─ bookshelves          [未定義]
│  │  ├─ read_book            [未定義]
│  │  └─ entrance_hall
│  └─ right_door
│     ├─ portrait             [未定義]
│     ├─ take_candle          [未定義]
│     └─ entrance_hall
└─ outside_investigation
   ├─ strange_plants
   │  ├─ smell_plants         [未定義]
   │  ├─ touch_plants         [未定義]
   │  └─ pond                 [未定義]
   ├─ pond                    [未定義]
   └─ entrance_hall
```

未定義の遷移先は8種類です。

```text
upstairs
pond
smell_plants
touch_plants
bookshelves
read_book
portrait
take_candle
```

現行17選択肢のうち9選択肢が未定義シーンへ遷移します。

未定義シーンが指定されると `showScene()` は console error を出して return するため、その場から正常なシーン遷移は行われません。

## 5. ゲーム状態

グローバルな状態は `gameState` に保持されます。

```js
{
  currentScene,
  flags,
  textSpeed,
  isTextAnimating,
  isChoicesShown,
  currentChar,
  textTimer,
  currentBgm,
  textContent,
  currentChoices
}
```

初期文字送り速度は1文字あたり50msです。

## 6. 画面構成

画面には以下の主要要素があります。

1. 背景
2. キャラクター
3. テキストウィンドウ
4. 本文テキスト
5. 次へインジケーター `▼`
6. 選択肢コンテナ
7. メニューボタン
8. メニュー画面

テキストウィンドウは概ね画面下部に配置されます。

キャラクター画像がない場合は半透明の円が代替表示として使われます。

## 7. テキスト表示

`animateText()` が1文字ずつ本文を表示します。

文字送り中に次へ操作を行うと `completeTextAnimation()` により全文を即時表示します。

全文表示後にもう一度次へ操作を行うと選択肢を表示します。

選択肢は画面中央付近に縦方向に配置され、300ms のフェードインを行います。選択肢ごとに100msずつ表示開始をずらします。

## 8. 入力

現在の入力は以下です。

1. `ENTER`

   文字送りスキップ、または選択肢表示。

2. `SPACE`

   `ENTER` と同じ。

3. `ESC`

   メニュー開閉。

4. マウスまたはポインター

   `▼`、選択肢、メニューボタン、メニュー項目を操作可能です。

メニュー表示中は `handleNextClick()` による本文進行を無効化します。

## 9. 選択肢条件とフラグ

シーンまたは選択肢に `set_flag` を設定すると `gameState.flags` に反映されます。

選択肢に `condition` がある場合、条件を満たさない選択肢は透明度0.5で表示され、クリック不能になります。

ただし現行 `evaluateCondition()` は文字列を `eval()` で直接評価します。

この方式は任意コード実行につながるため、外部シナリオデータを受け入れる設計へ進める場合は仕様変更が必要です。

現行の6シーンでは `condition` と `set_flag` は実質的に利用されていません。

## 10. 背景表示

背景画像が利用可能な場合は Phaser Image の texture を切り替えます。

背景遷移時は500msでフェードアウトし、texture を変更後、500msでフェードインします。

画像が利用できず Rectangle 背景を使っている場合は、scene の `bg_image` キーに対応した単色へ変更します。

現在定義されている代替色は以下の6背景です。

```text
mansion_exterior
entrance_hall
mansion_garden
strange_plants
library
dining_room
```

## 11. キャラクター表示

scene の `character` が空文字の場合は非表示です。

値がある場合はキャラクターを表示し、500msでフェードインします。

現在使用されているキャラクターキーは `ghost` のみです。

## 12. BGM / SE

シーンに `bgm` があり、現在BGMと異なる場合は `changeBgm()` を呼びます。

旧BGMを停止し、新BGMを loop=true、volume=0.7 で再生する設計です。

シーンに `se` がある場合は volume=0.7 で再生します。

クリック時は `se_click` を再生します。

ロード失敗を許容するためダミーサウンドと SoundManager のラッパー処理がありますが、現状アセット自体が存在しないため、実音声再生は前提にできません。

## 13. メニュー

メニュー項目は以下です。

1. セーブ
2. ロード
3. 設定
4. 閉じる

`設定` は未実装で、現在は `alert('設定画面は実装中です')` のみです。

## 14. セーブ / ロード

セーブ先はブラウザの `localStorage` です。

キーは以下です。

```text
phaserAdventureGameSave
```

保存内容は以下です。

```js
{
  currentSceneId,
  flags,
  timestamp
}
```

ロード時は `flags` を復元し、`currentSceneId` を `showScene()` に渡します。

現状は単一スロットです。

セーブデータのバージョン番号、schema validation、破損データ回復、複数スロットはありません。

## 15. アセット欠落時のフォールバック

コードは画像や音声が存在しない状況でもゲームを継続させることを意図しています。

画像については単色背景、矩形UI、円形キャラクターなどを生成します。

音声については空実装のダミーオブジェクトを用意しています。

ただし Phaser Loader の `load.image()` や `load.audio()` はファイル欠落時にその場で同期例外を投げる方式ではないため、`try/catch` の一部は実際のロード失敗検出としては機能しません。ロード失敗は `loaderror` イベントで発生します。

したがってフォールバック処理は「意図は実装されているが、実ブラウザ環境で整理・再検証が必要な部分」と位置付けます。

## 16. 現行仕様に含まれないもの

以下は現在実装されていません。

1. 完結したシナリオ
2. 未定義遷移の補完
3. 設定画面
4. 音量設定
5. 文字速度変更UI
6. 複数セーブスロット
7. オートモード
8. バックログ
9. 既読スキップ
10. CG・回想・章管理
11. シナリオ外部ファイル化
12. シナリオschema validation
13. 安全な条件式DSL
14. レスポンシブ表示
15. テスト
16. CI
17. README による起動手順
18. 実アセット一式

## 17. 現時点での位置付け

現在の成果物は、Phaser 3 でADVに必要な基本部品を組んだ「Phase 3 プロトタイプ」です。

エンジン骨格としては、シーン表示、文字送り、選択肢、フラグ、音声呼び出し、セーブ/ロード、メニューまで到達しています。

一方でシナリオグラフが未完であるため、ゲームとしての最小完成条件にはまだ達していません。