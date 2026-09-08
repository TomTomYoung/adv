# adv ハンドオフ

最終更新: 2026-09-09

対象ブランチ: `master`

この文書は、次担当が現状把握からやり直さず、そのまま続きを実装するための引き継ぎ資料です。

## 1. 現状

本リポジトリは Phaser 3.60.0 を利用したブラウザ向け分岐型ADVのプロトタイプです。

実コードは現状 `index.html` に集約されています。

シーン表示、文字送り、選択肢、フラグ、BGM/SE呼び出し、メニュー、localStorage セーブ/ロードまでの基礎はあります。

ただしシナリオは未完成です。

定義済みシーンは6件、全選択肢は17件です。

17選択肢中9件が、存在しない8種類の scene ID を参照しています。

未定義IDは以下です。

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

また `assets/` ディレクトリは存在せず、画像・音声はコード上の参照だけです。

## 2. 最初に読むもの

作業前に次の順番で確認してください。

1. `doc/SPEC.md`
2. `doc/PROGRESS.md`
3. `index.html`
4. この `doc/HANDOFF.md`

`SPEC.md` は現行コードの事実、`PROGRESS.md` は完成・未完成の判定、この文書は次の作業順を扱います。

## 3. 推奨する次の作業順

### P0-1. シナリオリンク切れを解消する

最初にここを直してください。

方法は2通りあります。

A. 現在の選択肢を維持し、未定義8シーンを追加する。

B. 試作を小さく保つなら、未定義 `next_scene` を既存シーンまたは新設の共通終端シーンへ付け替える。

次のマイルストーンを「最後まで遊べる短編」とするなら A を推奨します。

最低でも各分岐に結果を与え、その後に別分岐へ合流するか、明示的な ending へ到達させてください。

受け入れ条件:

```text
全 choices.next_scene が gameScenario.scenes 内に存在する
どの選択肢を押しても console に scene not found が出ない
少なくとも1つの ending へ到達できる
ending からタイトルへ戻る、または再開方法が明示される
```

### P0-2. 起動時 scenario validator を追加する

シナリオ追加だけで終わらせず、同じ事故を防ぐ validator を入れてください。

最低限、次を検証します。

1. scenes の key と `scene.scene_id` が一致する。
2. `text` が文字列である。
3. `choices` が存在する場合は配列である。
4. 各 choice に `text` と `next_scene` がある。
5. 全 `next_scene` が既存 scene ID を参照する。
6. `set_flag` が存在する場合は object である。
7. `condition` が存在する場合は対応可能な形式である。

開発中は不整合があれば `console.error` だけで続行せず、一覧を出したうえでゲーム開始を止める方式が安全です。

例として `validateScenario(gameScenario)` を Phaser 起動前または `create()` 冒頭で呼べる構造にしてください。

### P0-3. `eval()` を廃止する

現在の `evaluateCondition(condition)` は `eval()` を使っています。

将来、シナリオを JSON や外部編集へ移した場合に任意JavaScript実行を許すことになるため、ここは早めに変更してください。

最小構成では、条件を構造化データにします。

例:

```js
condition: {
  flag: 'has_key',
  op: 'eq',
  value: true
}
```

評価側は許可した演算子だけを処理します。

第一段階で対応する演算子は以下程度で十分です。

```text
eq
neq
gt
gte
lt
lte
exists
not_exists
```

必要になってから `all` / `any` を追加してください。

受け入れ条件:

```text
コードベースから eval(condition) が消えている
フラグtrue/falseで選択肢の有効・無効が切り替わる実例がある
不正な condition は false 扱いまたは validation error になる
```

### P0-4. フラグ分岐を実際のシナリオで1本通す

現在はフラグ機構だけ存在し、実用例がありません。

たとえば以下のような流れを1本作ってください。

```text
library で鍵を取得
set_flag: has_key = true
↓
entrance_hall または upstairs
↓
has_key が true のときだけ特定選択肢を有効化
```

これで `set_flag`、condition、save/load の3機能を一度に実証できます。

## 4. 次に行う構造整理

### P1-1. シナリオとゲームロジックを分離する

現状は `index.html` に全責務があります。

すぐに大規模フレームワークへ移行する必要はありません。

GitHub Pages でそのまま配信できる静的構成を維持しつつ、最低限次の分離を推奨します。

```text
/
├─ index.html
├─ js/
│  ├─ scenario.js
│  ├─ game.js
│  ├─ scenario-validator.js
│  └─ save.js
├─ assets/
│  ├─ images/
│  ├─ ui/
│  └─ audio/
└─ doc/
```

シナリオを JSON にする場合は、ローカルファイル直開きでは fetch 制約が出るため、GitHub Pages やローカルHTTPサーバーでの実行を前提化してください。

単純さを優先するなら、まず `scenario.js` として JavaScript オブジェクトを分離するだけでも十分です。

### P1-2. フォールバック処理を整理する

現在は Phaser のロード呼び出しを `try/catch` で囲む処理が多数あります。

ファイル404等は通常 Loader の `loaderror` イベントで扱うため、同期例外用 `try/catch` とアセット欠落処理を分けてください。

推奨方針:

```text
preload では必要アセットを通常登録
loaderror で failed key を記録
create で存在確認
存在しない key だけ fallback texture / dummy audio を使う
```

SoundManager 自体の `play` / `get` を上書きする方式は影響範囲が大きいため、ゲーム側の `playBgm()` / `playSe()` が「存在すれば再生、なければ何もしない」を担当する形のほうが安全です。

### P1-3. セーブ形式に version を追加する

現状のセーブ形式は以下です。

```js
{
  currentSceneId,
  flags,
  timestamp
}
```

次のように version を追加してください。

```js
{
  version: 1,
  currentSceneId,
  flags,
  timestamp
}
```

ロード時には最低限次を検証してください。

```text
JSONとして読める
version が対応範囲内
currentSceneId が現行scenarioに存在する
flags がobject
```

破損時はゲームを停止せず、ユーザーへセーブデータが無効であることを表示してください。

## 5. UI / 操作の次段階

### P1-4. 設定画面を実装する

現在は alert のみです。

最初に必要なのは以下で十分です。

```text
文字送り速度
BGM音量
SE音量
閉じる
```

値は localStorage にゲーム進行セーブとは別キーで保存してください。

### P2-1. レスポンシブ対応

現状は 800x600 固定です。

Phaser Scale Manager を使う場合は、まず以下の方向が適切です。

```text
mode: Phaser.Scale.FIT
autoCenter: Phaser.Scale.CENTER_BOTH
base size: 800x600
```

UI座標は当面800x600の論理座標を維持できます。

## 6. アセット方針

コードが現在期待しているアセット名は `doc/SPEC.md` を参照してください。

アセット導入時は、最初から全素材を揃える必要はありません。

優先順位は以下です。

1. 背景6枚
2. ghost 1枚
3. UI素材
4. BGM
5. SE

ただしフォールバック描画を残し、「アセットが1枚欠けてもゲーム全体が落ちない」ことは維持してください。

## 7. テスト方針

この規模では、最初から大掛かりなE2E基盤を入れるより scenario validator の自動検査を先に入れるべきです。

最低テスト項目:

```text
全 scene ID が一意
scene key と scene_id が一致
全 next_scene が解決可能
開始シーン start が存在
少なくとも1つの終端またはendingが存在
条件式schemaが正しい
セーブ対象sceneが存在
```

ブラウザ手動確認項目:

```text
初回ロード
文字送り
文字送りスキップ
全選択肢
全シーン到達
メニュー開閉
セーブ
ページ再読込
ロード
フラグ分岐
アセット404時の継続
音声あり環境でBGM切替
```

## 8. 推奨マイルストーン

### Phase 4A: Traversable Demo

目的: 全分岐が壊れず、最低1エンディングまで到達する。

完了条件:

```text
リンク切れ0
validator導入
endingあり
```

### Phase 4B: Stateful Demo

目的: フラグによって分岐が変わる。

完了条件:

```text
eval廃止
フラグ取得イベントあり
条件付き選択肢あり
save/load後もフラグ維持
```

### Phase 4C: Presentable Demo

目的: 人に見せられる試作品にする。

完了条件:

```text
主要画像配置
最低限のBGM/SE
設定画面
レスポンシブ表示
README起動手順
```

## 9. 作業時に避けるべきこと

1. 未定義シーンを増やしたまま機能追加を優先しないこと。

2. `eval()` ベースの条件式を拡張しないこと。

3. SoundManager 全体の monkey patch をさらに複雑化しないこと。

4. シナリオデータを増やす前に validator を入れず、手作業だけで遷移整合性を管理しないこと。

5. セーブ形式を変更する際に version を付けず上書きしないこと。

6. 現在の fallback を削除して、アセット欠落だけで起動不能にしないこと。

## 10. 次担当が最初に行う具体的タスク

最初のPRまたは作業単位は、以下に限定することを推奨します。

```text
Task 1
未定義8シーンを補完して全next_sceneを有効化

Task 2
validateScenario() を追加し、リンク切れを起動時検出

Task 3
eval条件を構造化condition evaluatorへ置換

Task 4
鍵取得などのフラグ分岐を1本実装

Task 5
セーブデータにversionを追加しvalidation
```

ここまでで、現在の「機能デモ」から「状態を持ち最後まで遊べる短編ADVエンジン試作」へ進められます。

## 11. 現在の前提

```text
default branch: master
framework: Phaser 3.60.0
runtime: browser
build step: none
package manager: none
scenario storage: index.html内JavaScript object
save storage: localStorage
save key: phaserAdventureGameSave
screen logical size: 800x600
issues: 0
pull requests: 0
```

## 12. 最後に

現状は捨てるべきコードではありません。

ADVに必要な基本部品はすでに一通り存在するため、次に重要なのは新機能を増やすことより、シナリオグラフの整合性、安全な条件分岐、セーブ互換性、アセットロードを固めることです。

まず Phase 4A を完成させ、その後にシナリオ規模や演出機能を広げるのが最も手戻りの少ない順序です。