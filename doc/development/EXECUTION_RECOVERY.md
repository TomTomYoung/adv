# 作業ログとGitの再開

記録日：2026-11-05。時刻は日本時間です。

ユーザーから、一つの作業ごとにログを残すよう指示がありました。2026-11-04のログ原本には作業の開始・結果と具体的な失敗が残っていましたが、翌日の回答では原本を読まず、履歴の検索要約だけから原因不明と返していました。原本確認と再開手順を作業の一部にします。

## 記録で確認した問題

### F015：コミットの再構成

2026-11-04 22:46:33、ローカルGitの同期で次のエラーが記録されています。

```text
AssertionError: Cannot reconstruct exact commit; leaving refs unchanged
```

その処理はコミットの日時オフセットを `+0000` として組み立てていました。直後の照合では、元のauthor/committerのオフセットはいずれも `+0900` でした。APIで同じ瞬間を示す日時が取得できても、コミットの元のバイト列をそのまま取得したことにはなりません。

今後は、標準のGit操作で取得した実コミットを使用します。Git接続が使えずGitHubツールを使用する場合は、GitHub上の既存コミットSHAとtreeを基点に変更を作成し、取得していないローカル履歴を再現したことにしません。対象コミットが手元に存在しなければ、作業コピーの作成は明確なエラーで止めます。

### F017：既存ブランチの扱い

2026-11-04 22:48:34、同期処理でメッセージのない `AssertionError` が記録されています。後続の記録では、既に存在していた `fix/q161-treatment-recovery` を考慮せず、ref変更前に停止したと説明されています。

同じリポジトリ・ブランチ・コミットの作業コピーなら再利用します。別のコミットや別のリポジトリなら、観測した値を含む衝突エラーとして返します。作業中のファイルやブランチを強制的に上書きしません。

### 今回のログ保存で判明した引数上限

2026-11-05の調査中、GitHubの再帰treeの応答全文をシェルコマンドへ埋め込み、プロセス作成が `Argument list too long (os error 7)` で拒否されました。GitHubの読み取り自体は完了し、ログを書き込むプロセスの作成が失敗しています。

大きい応答はファイルへ保存してパスで参照します。標準出力・標準エラーは実行中にファイルへ流し、終了後に全文をコマンド引数へ戻しません。入力・結果が大きい外部操作もJSONファイルで受け渡します。

### unknown表示との関係

上記のローカルエラーと、ユーザーが画面で見た `unknown` 表示の対応は確認できていません。取得できた例外と、取得できないプラットフォーム内部の情報を区別します。この変更はChatGPTのサーバー内部を修復したことを意味しません。

## 実行と記録

[work-session.mjs](../../tools/work-session.mjs)は、コマンドの開始を保存してから起動し、終了後に状態・終了コード・取得できた例外を保存します。標準出力と標準エラーはそれぞれファイルに残します。作業IDと試行番号は既存の記録を上書きしない単位です。

外部ツールの呼び出しでは、呼び出し前に開始を記録し、応答の取得後に結果を記録します。途中で応答を取得できなくなった操作は終了記録がない状態で残ります。次の開始時に未完了一覧を確認し、対象の実状態を照合します。開始だけの記録を成功扱いしません。

ログの保存先には作業ごとの独立したディレクトリを指定し、コードや素材の作業先と分けます。認証情報をログへ含めません。実行器はローカルの記録を同期書込みしますが、外部の永続保存先への同期は作業者が行います。外部更新の直前と直後には、記録を永続保存してから次へ進みます。

### コマンドの実行例

次の内容を `run-request.json` に保存します。パスは実際の作業場所に置き換えます。

```json
{
  "logDir": "/absolute/task/logs",
  "operation": "verify-workflow-repair",
  "attempt": "1",
  "cwd": "/absolute/adv",
  "command": ["node", "--test", "tests/work-session.test.mjs", "tests/prepare-worktree.test.mjs"],
  "timeoutMs": 60000
}
```

```bash
node tools/work-session.mjs run --request /absolute/task/run-request.json
node tools/work-session.mjs pending --log-dir /absolute/task/logs
```

操作ごとの `start.json`、`result.json`、`stdout.log`、`stderr.log` は、指定したログディレクトリの作業ID・試行番号の下に保存します。同じID・試行番号を再利用して上書きせず、再試行が必要と判断した場合だけ別の試行番号を使います。

### 外部ツールの記録例

呼び出し前のJSONには `logDir`、`operation`、`attempt`、`cwd` と `kind: "external"`、必要な対象情報を `context` として保存します。`begin` の成功と開始記録の永続保存を確認してから対象を呼び出します。

```bash
node tools/work-session.mjs begin --request /absolute/task/api-begin.json
```

応答を取得できたら、同じ作業ID・試行番号に対して、`status` と結果を持つJSONファイルを作り `finish` で閉じます。成功なら `status: "succeeded"`、失敗なら `status: "failed"` と取得できたエラーを記録します。応答が不明な場合は成功・失敗の結果を捏造せず、未完了として対象の読み直しへ進みます。

```bash
node tools/work-session.mjs finish --request /absolute/task/api-finish.json
```

大きい結果はJSONファイルの `result` に入れられます。プログラムへ渡すコマンド引数はファイルパスだけです。

## Gitの作業コピー

[prepare-worktree.mjs](../../tools/prepare-worktree.mjs)は、指定した実コミットの存在、リポジトリ、ブランチ、作業先を照合します。既存作業を再利用する場合も、HEADが指定したコミットと一致するか確認します。作業ツリーの未コミット・未追跡ファイルは保持します。

この処理はネットワーク接続やコミットの再構成を行いません。GitHubから取得したSHAだけがあり、対応するローカルオブジェクトがない状態では、標準のGit接続でそのオブジェクトを取得するか、GitHubツールを使う作業経路で継続してください。制限された接続経路を迂回しません。

```bash
node tools/prepare-worktree.mjs \
  --repo /absolute/existing-repository \
  --worktree /absolute/task/adv \
  --branch fix/execution-recovery \
  --commit "$ADV_OBSERVED_COMMIT"
```

このコマンドも上記の実行器の `command` 配列として実行し、実行前後を残します。`ADV_OBSERVED_COMMIT` には事前に確認した完全なSHAを設定します。JSONの `command` 配列ではシェル変数は展開されないので、そのSHAを文字列として指定してください。既存のブランチがその値と異なる場合、別の名前・場所を選ぶ前に、どちらの作業を続けるのかを既存記録から確認してください。

## 検証

専用の回帰試験は [work-session.test.mjs](../../tests/work-session.test.mjs) と [prepare-worktree.test.mjs](../../tests/prepare-worktree.test.mjs) です。大量出力、終了失敗、起動不能、途中停止、同名作業の再実行、既存ブランチの再利用、異なるブランチ・作業コピーの保持、日時オフセットを持つ実コミットを扱います。

```bash
node --test tests/work-session.test.mjs tests/prepare-worktree.test.mjs
```

既存CIの `node --test tests/*.test.mjs` にも含まれます。これらは作業支援用の試験で、ゲームのブラウザー表示試験ではありません。q161のChromium検証は2026-11-05のユーザー指示で再開し、180条件と代表画面の目視を完了しました。[実行結果と過去の保留記録](CHROMIUM_DEFERRED_2026-11-04.md)を参照してください。

## 証拠

F015/F017と今回の調査・修正の記録は、既存の [adv_environment_repair_20261104.txt](https://chatgpt.com/library?file_id=libfile_3a4347c140a08191b4e84ee382dc172f&account_id=personal) に追記します。原本の既存部分と過去の失敗は削除しません。記録へのアクセスには所有者の権限が必要です。
