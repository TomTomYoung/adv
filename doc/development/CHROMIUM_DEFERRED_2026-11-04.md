# Chromium検証の保留・再開メモ

記録日：2026-11-04。時刻は特記がなければ日本時間です。

## 現在の扱い

ユーザーの「とりあえずchromiumはとばせ。やるべきテストはどっかにメモっとけ。経緯も書いとけ。」という指示により、Chromiumの追加導入と実ブラウザー検証を当面保留します。同じ取得失敗を繰り返して他の作業を止めず、未実施項目として引き継ぎます。検証の保留は合格・実施済みを意味しません。

- 対象：q161「治さない傷」の剣士・祈祷師イネの表示、治療移動、旧保存の復元。
- 回収済みの検証対象：`b569be49b8b4c24079c30427b10b8ff3528e839b`、作業ブランチ `fix/q161-treatment-recovery`。
- 基準：PR #197統合後のmaster `8a13c1c5e8e263ad88dfb34087c2c60dd8a6118e`。
- このメモ作成時、対象のq161変更30ファイルはmaster未統合です。このメモの保存は、その実装の反映や検証完了を意味しません。
- 回収済みコピー：`/workspace/scratch/593cf680836c/adv`、`/workspace/scratch/916cf22e0067/adv`。一時パスなので、再開時に存在・HEAD・差分を確認してください。

2026-11-04追記：[反映コミット](https://github.com/TomTomYoung/adv/commit/cc7a5eba3c277a5efb52b47214a5bb82b7c9adab)でq161のコード・画像・画面用fixtureをmasterへ反映しました。上記のmaster未統合は初回メモ作成時点の履歴です。実ブラウザー検証180条件の保留は継続しています。

## 確認済みの範囲

- 対象コミットの既存 `npm run check` は終了コード0、2,569件成功・失敗0・skip0。後から生ログと終了結果を読み取って確認した結果であり、このメモ作成時に再実行したものではありません。
- q161専用の `tests/treatment-cast.test.mjs` は6件成功・失敗0。移動・保存・条件分岐の成功を、画面検証の代わりにはしません。
- ブラウザーで実施した条件は0件、生成したスクリーンショットは0枚です。

## 未実施のテスト

対象コミットの `tools/treatment-art-fixtures.mjs` にある `treatmentArtFixtures()` が45状態を生成します。現行定義19状態、変更前定義からの旧保存19状態、現場接続前の旧受注経路7状態です。各状態をScene／Classicと幅1440px／390pxで検証し、合計180条件とします。結末は `wait`、`heal`、`recorded` の3種類です。

- [ ] 対象コミットと実行環境を特定し、検証runnerと同じPlaywright解決方法・起動設定でブラウザー単体の起動を確認する。
- [ ] 45状態すべてで保存を読み込み、期待する場面・本文・有効選択肢・禁止選択肢を確認する。現行・移行済み・旧受注経路の保存条件を混同しない。
- [ ] Scene／Classic × PC幅1440px／スマホ幅390pxの180条件を実行する。
- [ ] 剣士5場面とイネの治療場面について、表示する人物・表示しない人物・人物画像の読込・サイズ・透過を確認する。
- [ ] セラの在隊・生存条件、離脱／戦闘不能後の到着と治療の切替に対応する保存・選択肢を確認する。20Gの貸出、実帰着後の録音、同意・保留、記録具の受渡しも既存fixtureの期待値と照合する。
- [ ] 本文の全ページを確認し、Sceneでの顔の遮蔽、横方向のはみ出し、Sceneの縦方向のはみ出し、操作欄の崩れを確認する。
- [ ] ブラウザーのJavaScriptエラー・HTTP取得エラーを確認する。
- [ ] 180枚の画面を保存し、剣士単独・イネ同席・旧保存・旧受注経路の代表画面を両表示方式・両幅で目視する。自動判定だけで目視済みとは記録しない。
- [ ] 実行日、対象コミット、使用環境と版、終了コード、実行条件数、結末数、エラー、成果物、目視対象を記録する。

## 再開手順

現在は実行しません。利用可能なブラウザー環境が整った際に、対象の回収済み変更を確認してから再開します。回収済みのq161実装に含まれる `tools/treatment-art-fixtures.mjs` が必要です。保留メモ作成後のGitHub反映状況は[検証履歴](PROGRESS.md)を確認してください。導入コマンドを無条件に再試行せず、既存実行体と実際の起動結果を先に確認してください。

以下はq161だけを検証するBashの実行例です。対象コミットを含むリポジトリのルートで実行します。出力先は毎回新規に作り、既存の失敗ログを上書きしません。

```bash
set -euo pipefail
git rev-parse HEAD
test -f tools/treatment-art-fixtures.mjs
adv_q161_output="$(mktemp -d /tmp/adv-q161-browser-XXXXXX)"
export ADV_BROWSER_OUTPUT="$adv_q161_output"

node --input-type=module <<'JS' 2>&1 | tee "$ADV_BROWSER_OUTPUT/browser-check.log"
import assert from 'node:assert/strict';
import {treatmentArtFixtures} from './tools/treatment-art-fixtures.mjs';
import {runCharacterArtSmoke} from './tools/character-art-browser.mjs';

const {fixtures, outcomes} = treatmentArtFixtures();
const generations = Object.fromEntries(
  ['current', 'previous', 'accepted-legacy'].map(generation => [
    generation,
    fixtures.filter(f => f.variant.startsWith(`${generation}-`)).length
  ])
);
assert.deepEqual(generations, {current:19, previous:19, 'accepted-legacy':7});
assert.equal(fixtures.length, 45);
assert.deepEqual([...outcomes].sort(), [
  'e2/q161/heal', 'e2/q161/recorded', 'e2/q161/wait'
]);
console.log(JSON.stringify({fixtures:fixtures.length, generations, outcomes,
  expectedChecks:fixtures.length * 4}));
await runCharacterArtSmoke({fixtures, outcomes, group:'sunken', folder:'relocated'});
JS
```

共有runnerがHTTPサーバーを起動するため、別のサーバー起動は不要です。別配置の対応ブラウザーを使う場合は、実体を確認した絶対パスを `ADV_BROWSER_EXECUTABLE` に設定できます。検証用Playwrightは `CODEX_PRIMARY_RUNTIME_NODE_MODULES` があるとそちらを優先するため、手元とCIの版を同一だと仮定しないでください。

成功判定は、コマンド終了コード0、`sunken-art-result.json` の `checks` 180件・`outcomes` 3件・`errors` 空、PNG180枚、必要な目視確認をすべて満たすことです。起動失敗でも `finally` から `checks:[]`・`errors:[]` の結果JSONが出るため、ファイルの存在や `errors` が空であることだけでは合格になりません。

GitHub CIの入口は `.github/workflows/cast-presentation.yml` のPRまたは手動実行です。push単独では起動しません。対象変更のGitHub反映とrunの対象コミットを確認し、環境導入と沈没城の検証ステップの成功を確認します。`node tools/browser-sunken-art-smoke.mjs` は沈没城全体を実行するため、全体件数ではなく `checks` の `quest === 'q161'` が180条件であることも確認してください。

## 経緯

1. 既存の[検証履歴](PROGRESS.md)には、q069作業時にもローカルでブラウザー取得が失敗した記載があります。今回と同じ原因か、毎回発生していたかは確定していません。
2. 2026-11-04 21:28:55、q161画面検証はChromiumの起動時に失敗しました。21:29:13の記録は同じ試行の補足で、2回目の再実行ではありません。実際のエラーは次のとおりです。

   ```text
   browserType.launch: Executable doesn't exist at /root/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell
   ```

3. 手元のPlaywright 1.62.1は既設でしたが、対応するChromium headless shell revision1234がありませんでした。必要だったのは追加ブラウザーの導入であり、OSやNode.jsを一から構築したわけではありません。
4. 21:39:17〜21:39:59、公式CLIの `install --only-shell chromium` を1回実行しました。インストーラー内部で取得を5回試み、終了コード1で失敗しました。展開エラーは `End of central directory record signature not found. Either not a zip file, or file is truncated.` です。
5. 取得先 `https://cdn.playwright.dev/builds/cft/151.0.7922.34/linux64/chrome-headless-shell-linux64.zip` の応答はHTTP 200、`Content-Type: text/html`、195バイトで、本文は `Site Unavailable / Unable to access this site.` でした。ZIPを取得できていません。配布元障害と中継経路の制限のどちらかは未確定です。接続制限の迂回や、取得できていないブラウザーでの再検証は行っていません。
6. 直前の[PR #197のCI](https://github.com/TomTomYoung/adv/actions/runs/41769099735)は、Ubuntu 24.04・Playwright 1.58.2でブラウザー導入と人物表示3,180条件に成功していました。これは別環境・別コミットの結果であり、今回のq161変更や180条件の成功を示すものではありません。
7. その後、ユーザーからChromiumを当面とばし、未実施テストと経緯を残す指示があり、本メモへ引き継ぎました。システムの環境再利用についての質問を作業履歴の話と取り違えた説明もありました。環境が毎回作り直される、毎回失敗する、先行するunknownエラーも今回と同じ原因である、とは断定していません。

## 証拠・元ログ

- 全体検証：`/workspace/scratch/593cf680836c/adv-verification/full-check-result.json` と `full-check.log`。
- 専用試験：`/workspace/scratch/593cf680836c/adv-q161-review-tests.log`。
- 初回ブラウザー失敗：`/workspace/scratch/593cf680836c/adv-verification/browser-q161/` の `browser-check.log`、`status.json`、`sunken-art-result.json`。
- 環境修復と調査：`/workspace/scratch/433b1643f950/adv_environment_repair_20261104.txt`。保存済みログは[こちら](https://chatgpt.com/library?file_id=libfile_3a4347c140a08191b4e84ee382dc172f&account_id=personal)。リンク先は所有者のアクセス権が必要です。
- 各一時ファイルが失われても未実施範囲を復元できるよう、判定・件数・コマンド・原因の確定範囲を本文へ記載しました。
