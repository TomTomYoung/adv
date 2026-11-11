# CI・自動テスト総覧

最終確認日: 2026-11-06。対象: `master` の `.github/workflows/*.yml` と `package.json`。

この文書は、advで実行される主要な自動検査について、**何を守るためのテストか、何を実際に検査するか、何を出力するか**をまとめたものです。テスト結果を会話へ持ち込む際の運用は末尾の「会話ログへの持ち込み」を基準にします。

## 変更範囲と成功結果の再利用

文書本文だけのPR・master差分では、通常CIの文書・リンク・生成文書検査だけを行います。対象は `doc/**/*.md`、`README.md`、`AGENTS.md`。実行試験の入力でもある地域移設と出演監査の生成Markdown、および文書内JSONは除外し、通常の検査対象に残します。

ゲーム変更を含むPRへ後から文書だけを追記しても、GitHubのpaths判定ではPR全体が対象になるため、ワークフロー自体は再起動します。各ジョブの開始時に[判定処理](../../tools/ci-scope.mjs)と[共通action](../../.github/actions/ci-plan/action.yml)が、文書本文を除くGitの全ファイルのパス・モード・blob、Node版・OS・CPU・runner imageの指紋を求めます。正本、配布JSON、画像、テスト、実行器、CI設定、不明なファイルを含め、入力の変更は成功結果の再利用を無効にします。

同じジョブ・入力・環境の成功記録が完全一致するときだけ、重い試験・Chromium導入・重複画像生成を省略します。文書検査は常に実行します。再利用元の成功runをActions概要へ残し、スクリーンショットはそのrunのartifactを参照します。cacheへ保存するのは小さな成功記録だけです。すべての試験とartifact保存が成功した後だけ[記録action](../../.github/actions/ci-record/action.yml)を実行し、失敗・中止・文書のみ・cache再利用では新しい成功記録を作りません。完全一致しないcacheや壊れた記録、消失したcacheは検査を省略する根拠にしません。

PRの差分はmerge-baseからHEADまでを判定します。直前コミットだけを見る方法では、先に入れた未検証のゲーム変更を文書追記で隠せるため採用しません。履歴を取得できない場合は検査する側へ倒します。履歴の比較には全commit/treeを取得し、古い画像blobは必要になるまで取得しないpartial cloneを使います。同じPRの古い実行は新しい実行で打ち切りますが、masterへのpushや手動実行は別グループで保持します。

手動のworkflow_dispatchは、cacheがあっても選択ワークフローの検査を実行します。ゲーム変更の初回と入力が変わった場合の全体試験・既存の画面検査範囲は維持します。ローカルでは関連試験から始め、修正がまとまった後に全体試験を一度行います。

[判定の6試験](../../tests/ci-scope.test.mjs)は実Gitリポジトリを作り、文書のみ、ゲーム変更後の文書追記、削除・移動・実行属性、原稿・生成監査・JSON・画像・CI設定、比較履歴不足、環境差、成功記録の欠落・不一致、手動強制を検証します。

参考：[GitHubの差分・paths判定](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)、[cacheの一致条件とPRごとの範囲](https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching)、[actions/cache](https://github.com/actions/cache)。

ブラウザーCIは[Playwright公式コンテナ](https://playwright.dev/docs/docker)の`mcr.microsoft.com/playwright:v1.58.2-noble`を使う。Playwright npmパッケージも1.58.2に固定し、コンテナ内のChromium・OS依存関係・日本語フォントで既存の検査条件を実行する。2026-11-11にrunnerからUbuntuのAzure／標準配布元への名前解決失敗を観測したため、jobごとのAPT導入を廃した。画像タグは[公式一覧](https://mcr.microsoft.com/v2/playwright/tags/list)で確認した。 コンテナとcheckoutの実行ユーザー差は、共通actionでそのjobの`GITHUB_WORKSPACE`だけをGitのsafe.directoryへ登録して扱う。戦闘演出・攻略パーティー試遊も同じCI判定と成功記録を使い、文書検査を維持したまま同一入力を再利用する。

## 1. 通常CI: `.github/workflows/ci.yml`

ワークフロー名: `Validate dungeon RPG`。masterへのpush、pull request、手動実行で起動します。作業ブランチへのpush単独では起動しません。Node.js 22 / Ubuntu上で実行し、ブラウザは使用しません。

### `npm run check:runtime`

**目的**: 配布用runtime情報が、現行のHTML・JS/CSS・JSON・素材と一致していることを保証する。

**検査**: `tools/build-runtime.mjs --check` を実行し、配布revision、参照ファイルのcontent hash、生成済み `runtime.json` と現物の一致を確認する。

**出力**: GitHub Actionsの標準ログと終了コード。通常はartifactを生成しない。差異があれば不一致箇所をログに出して失敗する。

### `node tools/validate.mjs`

**目的**: ゲームデータ、Schema、参照関係、アセット参照を壊した変更を検出する。

**検査**: 全データの構造、IDや相互参照、シナリオ・キャラクター・アセット等の参照整合性を検証する。

**出力**: 標準ログと終了コード。通常はartifactなし。失敗時に検証対象と理由をログへ出す。

### `npm run check:editions`

**目的**: authored scenario editionsと配布用scenario edition JSONの食い違いを検出する。

**検査**: `tools/build-scenario-editions.mjs --check` により、正本から再生成した場合の内容と現在の生成物が一致するか確認する。

**出力**: 標準ログと終了コード。通常はartifactなし。

### `node tools/check-config-editors.mjs`

**目的**: 設定編集ページと、その正本JSON・生成物の不整合を防ぐ。

**検査**: config editorページ、対応するsource JSON、生成済み設定の対応関係を検査する。

**出力**: 標準ログと終了コード。通常はartifactなし。

### `node tools/check-static.mjs`

**目的**: 静的ファイルと、コードから検査可能な表示境界条件を守る。

**検査**: 必要な静的ファイル、参照、view boundaryなどの静的条件を検査する。実ブラウザでの見た目確認そのものではない。

**出力**: 標準ログと終了コード。通常はartifactなし。

### `node tools/check-docs.mjs`

**目的**: 自動生成文書・索引・リンク・配布データの指紋・保存原文の整合性を守る。

**検査**: Markdown、画像・編集画面へのリンク、生成一覧、配置図、配布データ指紋、旧原文ハッシュ等を照合する。

**出力**: 標準ログと終了コード。通常はartifactなし。

### `node --test tests/*.test.mjs`

**目的**: ゲームロジック、シナリオ分岐、保存互換、通常キャンペーン等の回帰をNodeテストで検出する。

**検査**: `tests/*.test.mjs` の全テスト。CI上のstep名は `Exercise all quest branches and a normal campaign`。

**出力**: Node test runnerのTAP系標準出力、成功・失敗件数、終了コード。通常はartifactなし。

## 2. 人物・演出ブラウザCI: `.github/workflows/cast-presentation.yml`

ワークフロー名: `Validate cast presentation in Chromium`。人物、シナリオ、人物画像、関連fixtureやbrowser smokeの変更を含むpull request、または手動実行で起動します。Playwright 1.58.2 + Chromium headless shell + Ubuntu 24.04を使用します。

### `shield-browser` job

**目的**: 沈没城後半のq162〜q165について、人物・グループ・portraitと旧保存移行を個別に確実に確認する。

**検査**:
- q162: `browser-sunken-art-smoke.mjs --shield-only`。盾関連の保存、グループ、portrait。
- q163: `--locksmith-only`。鍵師と店主、現行保存と旧保存。
- q164: `--farewell-only`。客とレン、現行保存と旧保存。
- q165: `--aid-only`。リナとイル、現行保存と旧保存。

**出力**: 標準ログ、各条件のスクリーンショット等。GitHub Actions artifactとして `q162-shield-checkpoints`、`q163-locksmith-checkpoints`、`q164-farewell-checkpoints`、`q165-aid-checkpoints` を保存する。

### `cast-browser` job

**目的**: 人物表示、アニメーション、Scene/Classic、画面幅、旧保存移行を実Chromiumで回帰確認する。

**検査**:
- `browser-cast-smoke.mjs`: native cast animationとscript wait。
- `browser-kagaribi-art-smoke.mjs`: 篝火人物画、両edition、layout、幅。
- `browser-oddland-art-smoke.mjs`: Oddland人物画、両layout、幅。
- `browser-chapel-art-smoke.mjs`: 礼拝堂出演者、migrated saves、両layout、幅。
- `browser-sunken-art-smoke.mjs`: 沈没城出演者、migrated saves、両layout、幅。

**出力**: 標準ログとPNG/JSON checkpoint。artifactは `cast-presentation-checkpoints`、`chapel-scene-checkpoints`、`chapel-classic-checkpoints`、`sunken-cast-checkpoints`。

## 3. ダンジョン・戦闘操作ブラウザCI: `.github/workflows/event-controls.yml`

ワークフロー名: `Validate dungeon and battle controls in Chromium`。view、battle、core/application、config、Schema、関連browser smoke等の変更を含むpull request、または手動実行で起動します。

**目的**: 実ブラウザ上の座標、操作、戦闘、店、探索、Grid/Frontline、設定編集までを一括して回帰確認する。

**個別検査**:
- `browser-event-controls-smoke.mjs`: 固定移動座標とイベント選択。
- `browser-battle-smoke.mjs`: 戦闘開始と攻撃対象座標。
- `browser-kagaribi-smoke.mjs`: 篝火地区と前哨サービス。
- `browser-expedition-smoke.mjs`: 補給所、技能購入、checkpoint出発。
- `browser-shop-smoke.mjs`: 店のスクロール、購入対象者、独立スキル屋。
- `browser-q001-return-smoke.mjs`: q001の複数帰路と共通新人救助。
- `browser-field-skills-smoke.mjs`: 探索技能対象、キーボード安全性、狭幅。
- `browser-generated-dungeon-engine-smoke.mjs`: 生成ダンジョンを実ゲームエンジンで操作。
- `browser-config-smoke.mjs`: config編集。
- `browser-packages-smoke.mjs`: 再利用可能なdungeon package。
- `browser-scouting-smoke.mjs`: scout技能、stun、preemptive action。
- `browser-action-statuses-smoke.mjs`: action statusの持続とsealed controls。
- `browser-grid-smoke.mjs`: Grid陣形、range preview、sprite重なり。
- `browser-frontline-smoke.mjs`: Frontline testerとsilhouette。
- `browser-battle-engine-smoke.mjs`: embedded battle engine playtest。
- `browser-frontline-lifecycle-smoke.mjs`: Frontlineのbody、可変行、remove。

**出力**: 各smokeの標準ログとviewport screenshot/checkpoint。まとめて `dungeon-event-controls-checkpoints` artifactへ保存する。

## 4. 屋内探索ブラウザCI: `.github/workflows/indoor-exploration.yml`

ワークフロー名: `Validate indoor exploration in Chromium`。

**目的**: 屋内・閉鎖空間のマップ表示と水場遷移が、layoutや画面幅によって壊れないことを確認する。

**検査**: `browser-indoor-smoke.mjs` で全enclosed mapとwater transitionを両layout・複数幅で確認する。

`browser-flagless-soldier-cast-smoke.mjs`はq187の28保存点をScene／Classic × 1440／390pxの112条件で検査する。全9場面、住民の退避有無、勝利・逃走・敗北、3結末、勝利後もカドが残ること、将校が任用窓口だけに表示されること、逃走後に再戦と入口帰還が閉じることを含む。[専用6試験](../../tests/flagless-soldier-cast.test.mjs)は全10旅程・戦闘命令・本文・報酬の保持、固定所在、報酬一回性、改訂2保存の全段階再開と改訂1保存の原子的拒否を確認する。ユーザー許可によるq187の互換切断は、旧保存を移行できたとの検証に数えない。

**出力**: 標準ログ、viewport checkpoint。artifactは `indoor-browser-checkpoints`。

## 5. 屋外探索ブラウザCI: `.github/workflows/outdoor-exploration.yml`

ワークフロー名: `Validate outdoor exploration in Chromium`。

**目的**: 屋外マップがlayoutや画面幅によって崩れないことを確認する。

**検査**: `browser-outdoor-smoke.mjs` で全outdoor mapを両layout・複数幅で確認する。

`browser-flagless-soldier-cast-smoke.mjs`はq187の28保存点をScene／Classic × 1440／390pxの112条件で検査する。全9場面、住民の退避有無、勝利・逃走・敗北、3結末、勝利後もカドが残ること、将校が任用窓口だけに表示されること、逃走後に再戦と入口帰還が閉じることを含む。[専用6試験](../../tests/flagless-soldier-cast.test.mjs)は全10旅程・戦闘命令・本文・報酬の保持、固定所在、報酬一回性、改訂2保存の全段階再開と改訂1保存の原子的拒否を確認する。ユーザー許可によるq187の互換切断は、旧保存を移行できたとの検証に数えない。

**出力**: 標準ログ、viewport checkpoint。artifactは `outdoor-browser-checkpoints`。

## 6. 機関廟クエストブラウザCI: `.github/workflows/machine-quests.yml`

ワークフロー名: `Validate machinery quests in Chromium`。

**目的**: 機関廟系列の現場移動・帰路・施設表示が実ブラウザ上で成立することを確認する。

**検査**: `browser-machine-smoke.mjs` でworker return、ward collection、3 homesを両layout・複数幅で歩行確認する。`browser-machine-cast-smoke.mjs` はq173の現行・表示追加前・旧受注の19保存点をScene／Classic × 1440／390pxの76条件で表示する。`--funeral-only` はq174の現行6・表示追加前6・旧受注1の13保存点を同じ組合せの52条件で表示し、娘の非同行・負傷者の救護先・遺書の受渡し・旧受注表示を検査する。`--hunter-only` はq175の現行10・表示追加前10・戦闘再開10・旧受注1の31保存点を124条件で検査し、戦闘前と報告後の見張りの表示を区別する。[専用6試験](../../tests/hunter-cast.test.mjs)では全場面・全旅程・3結末・報酬の一回性、旧戦闘保存の勝利・逃走・敗北・再挑戦、正面戦の逃走不可と不正保存の拒否を検査する。`--god-sandals-only` はq176の現行8・表示追加前8・旧旅程の到着後2・旧受注2の20保存点を80条件で検査する。[専用7試験](../../tests/god-sandals-cast.test.mjs)は全8旅程・3結末・草鞋の受渡し・神の所在・追加3役の保存移行・旧待機本文の保持と到着後の本文修正・不正保存の拒否・報酬の一回性を検査する。`--mirror-only` はq177の現行9・表示追加前9・旧受注2の20保存点を80条件で検査する。[専用6試験](../../tests/truth-mirror-cast.test.mjs)は表示・所在追加以外の配布定義の一致、全7旅程・4結末・証拠の受渡し時点・暫定告知の未確認・遠隔同意後の設定・旧保存の厳密な移行・不正保存の拒否・報酬の一回性を検査する。`--tomorrow-door-only` はq178の現行9・表示追加前9・旧旅程の到着後3・旧受注3の24保存点を96条件で検査する。[専用7試験](../../tests/tomorrow-door-cast.test.mjs)は本文3箇所と表示・所在追加以外の配布定義の一致、全8旅程・5経路・3結末、不可逆の越境、手紙と髪紐の受渡し時点、旧保存の厳密な移行と待機本文の保持、到着後の修正文、不正保存の拒否、q177との同時移行と報酬の一回性を検査する。`--garden-only` はq179の現行17・表示追加前17・旧旅程到着後3・旧受注2の39保存点を156条件で検査する。[専用7試験](../../tests/garden-cast.test.mjs)は全17場面・15旅程・3結末、三家の6訪問順×8応答組合せを新旧保存で検査し、個別の標の保持者・縄の一回消費・焼却と救援の確定時点・報酬の一回性・不正保存の拒否を確認する。`--last-tale-only` はq180の現行9・表示追加前9・旧旅程到着後6・旧受注2の26保存点を104条件で検査する。[専用7試験](../../tests/last-tale-cast.test.mjs)は全9場面・8旅程・4結末、ムイと聞き手の実所在、本文6箇所の確定前後、台本の受渡し、旧待機本文と到着後の修正文、不正保存の拒否、q179との同時移行と報酬の一回性を検査する。人物の所在、呼称だけの表示、同意前のguest選択の無効化、保存再開、本文送り、画面内のラベル配置を確認する。

`browser-flagless-soldier-cast-smoke.mjs`はq187の28保存点をScene／Classic × 1440／390pxの112条件で検査する。全9場面、住民の退避有無、勝利・逃走・敗北、3結末、勝利後もカドが残ること、将校が任用窓口だけに表示されること、逃走後に再戦と入口帰還が閉じることを含む。[専用6試験](../../tests/flagless-soldier-cast.test.mjs)は全10旅程・戦闘命令・本文・報酬の保持、固定所在、報酬一回性、改訂2保存の全段階再開と改訂1保存の原子的拒否を確認する。ユーザー許可によるq187の互換切断は、旧保存を移行できたとの検証に数えない。

**出力**: 標準ログ、viewport checkpoint。歩行側のartifactは `machine-browser-checkpoints`。q173は結果JSONとPNGを `q173-cast-checkpoints` に保存する。q174は `q174-cast-checkpoints`、q175は `q175-cast-checkpoints`、q176は `q176-cast-checkpoints`、q177は `q177-cast-checkpoints`、q178は `q178-cast-checkpoints`、q179は `q179-cast-checkpoints`、q180は `q180-cast-checkpoints` に分離する。成功時は件数と成功だけを報告し、失敗時だけ該当状態の要点を取得する。

## 7. OddlandブラウザCI: `.github/workflows/oddland-quests.yml`

ワークフロー名: `Validate Oddland border and quests in Chromium`。

**目的**: 国境、巡礼路、Oddlandクエスト一式が実際に歩行・進行でき、表示も崩れないことを確認する。

**検査**: `browser-oddland-smoke.mjs` でborder、pilgrimage roads、complete questsを両layout・複数幅で確認する。 `browser-observatory-cast-smoke.mjs` はq181の現行9・表示追加前9・旧受注2の20保存点をScene／Classic × 1440／390pxの80条件で検査する。[専用7試験](../../tests/quiver-cast.test.mjs)は全9場面・8旅程・4経路・3結末、場所別の6役、矢筒の受渡しと報酬の一回性、通達・合意の確定時点、旧待機本文・厳密な移行・不正保存の拒否・q180との共存を確認する。

`browser-gunner-cast-smoke.mjs` はq182の現行11・表示追加前11・旧受注4の26保存点をScene／Classic × 1440／390pxの104条件で検査する。砲の設置点は司令の合意・避難隊との調整の4状態を含む。[専用8試験](../../tests/gunner-cast.test.mjs)は全8場面・8旅程・12経路・3結末、搬入時だけ動くオル、固定所在の司令、実退避する避難隊、魔石の一回消費・保留時の未消費と受渡し、報酬の一回性、搬入途中を含む旧保存・旧受注経路・不正保存の拒否を確認する。

`browser-laundry-cast-smoke.mjs` はq183の現行8・表示追加前8・旧受注2・糧食不足1の19保存点をScene／Classic × 1440／390pxの76条件で検査する。[専用8試験](../../tests/laundry-cast.test.mjs)は全8場面・8旅程・6経路・3結末、2群の固定所在、援助・訂正と軍服・確認書の受渡し、糧食2つの一回費用と不足時の代替経路、報酬の一回性、旧待機本文・厳密な移行・不正保存の拒否・q182との同時移行を確認する。

`browser-pot-cast-smoke.mjs` はq184の現行10・表示追加前10・旧受注2の22保存点をScene／Classic × 1440／390pxの88条件で検査する。倉庫の2経路は食材の所在が異なるため分ける。[専用8試験](../../tests/pot-cast.test.mjs)は全9場面・8旅程・4経路・3結末、4役の実同行と捕虜の出演場面、鍋・別鍋・食材の受渡し、検査と共同炊事の確定時点、報酬の一回性、物語改訂1と旧保存の完全保持、不正所在の拒否、旧受注経路とq183移行との共存を確認する。

`browser-bridge-cast-smoke.mjs` はq185の現行16・表示追加前16・旧受注1の33保存点を両表示・両幅の132条件で検査する。全13場面に加え、逃走・敗北から戻ったguardと39Gで支払えないrentを確認する。4役が同席する狭幅Sceneでは2列の呼称が重ならず、HUDと本文に隠れないことも共通ブラウザ検査で確認する。[専用8試験](../../tests/bridge-cast.test.mjs)は全11旅程・3結末・戦闘中と救助後を含む旧保存の完全保持、40G一回支払・無料帰還、家族・敵兵・舟の実移動と武器の固定所在、封鎖の確定時点、報酬一回性、不正所在の拒否、旧受注の戦闘結果と直接結末を検証する。

`browser-truce-cast-smoke.mjs`はq186の現行20・表示追加前20・旧受注2の42保存点をScene／Classic × 1440／390pxの168条件で検査する。直接合意と限定代理状の交換、逃走後に再戦・再交渉が閉じること、敗北後の再戦、全13場面を含む。[専用8試験](../../tests/truce-cast.test.mjs)は全14旅程・3結末、代理状と物資の出発／到着時の受渡し、負傷者と捕虜の実同行、限定合意、旧保存の待機本文・戦闘・旅程・完了状態、旧受注の直接結末、不正保存の原子的拒否を確認する。

`browser-flagless-soldier-cast-smoke.mjs`はq187の28保存点をScene／Classic × 1440／390pxの112条件で検査する。全9場面、住民の退避有無、勝利・逃走・敗北、3結末、勝利後もカドが残ること、将校が任用窓口だけに表示されること、逃走後に再戦と入口帰還が閉じることを含む。[専用6試験](../../tests/flagless-soldier-cast.test.mjs)は全10旅程・戦闘命令・本文・報酬の保持、固定所在、報酬一回性、改訂2保存の全段階再開と改訂1保存の原子的拒否を確認する。ユーザー許可によるq187の互換切断は、旧保存を移行できたとの検証に数えない。

**出力**: 標準ログ、viewport checkpoint。artifactは `oddland-browser-checkpoints`。q181の結果JSONとPNGは `q181-cast-checkpoints`、q182は `q182-cast-checkpoints`、q183は `q183-cast-checkpoints`、q184は `q184-cast-checkpoints`、q185は `q185-cast-checkpoints`、q186は `q186-cast-checkpoints`、q187は `q187-cast-checkpoints` に分離する。

## 8. SalomeブラウザCI: `.github/workflows/salome-quests.yml`

ワークフロー名: `Validate Salome access and library quests in Chromium`。

**目的**: サロメへの到達、個人・地域図書館クエスト、帰路が実際のブラウザ操作で成立することを確認する。

**検査**: `browser-salome-smoke.mjs` でSalomeまで歩き、personal/regional library questsを完了し、帰還するまでを両layout・複数幅で確認する。

`browser-flagless-soldier-cast-smoke.mjs`はq187の28保存点をScene／Classic × 1440／390pxの112条件で検査する。全9場面、住民の退避有無、勝利・逃走・敗北、3結末、勝利後もカドが残ること、将校が任用窓口だけに表示されること、逃走後に再戦と入口帰還が閉じることを含む。[専用6試験](../../tests/flagless-soldier-cast.test.mjs)は全10旅程・戦闘命令・本文・報酬の保持、固定所在、報酬一回性、改訂2保存の全段階再開と改訂1保存の原子的拒否を確認する。ユーザー許可によるq187の互換切断は、旧保存を移行できたとの検証に数えない。

**出力**: 標準ログ、viewport checkpoint。artifactは `salome-browser-checkpoints`。

## 9. 配信更新・キャッシュブラウザCI: `.github/workflows/runtime-update.yml`

ワークフロー名: `Validate cached runtime updates in Chromium`。

**目的**: キャッシュ済みの旧画面から更新した場合、部分デプロイやscenario edition切替が保存を壊さないことを確認する。

**検査**:
- 最初に `npm run check:runtime` でruntime生成一致を確認。
- `browser-runtime-smoke.mjs`: warm-cache update、partial deployment、欠落・不一致からの回復、保存保持。
- `browser-scenario-editions-smoke.mjs`: scenario selectionとeditionごとの独立save。

**出力**: 標準ログと更新前後のcheckpoint。artifactは `runtime-update-checkpoints` で、`/tmp/adv-runtime-browser` と `/tmp/adv-editions-browser` を保存する。

## 10. `package.json` の統合検査 `npm run check`

ローカルでCI相当をまとめて行う入口。

実行順:
1. `tools/build-runtime.mjs --check`
2. `tools/build-scenario-editions.mjs --check`
3. `tools/validate.mjs`
4. `tools/check-config-editors.mjs`
5. `tools/check-static.mjs`
6. `tools/check-docs.mjs`
7. `node --test tests/*.test.mjs`

Chromium系browser smokeはこのコマンドには含まれず、対応するGitHub Actions workflowまたは個別scriptで実行する。

## 11. 出力の種類

advの自動テスト出力は次の3種類に分ける。

1. **終了状態**: workflow/job/stepのsuccessまたはfailure。
2. **テキストログ**: Node、Playwright、検証scriptが標準出力・標準エラーへ出す診断。
3. **artifact**: Chromium系テストが保存するPNG screenshot、JSON result/checkpoint等。

成功判定だけが必要な場合は1だけを見る。失敗解析では2の**失敗step周辺だけ**を見る。画面差異や人物表示を確認する必要がある場合だけ3の該当画像・JSONを開く。

## 12. 会話ログへの持ち込み

CIやテストの実行量と、ChatGPTの会話へ展開する情報量は別物として扱う。GitHub Actions側で多数のテストを実行しても、それだけでは会話を圧迫しない。圧迫要因は、長大な標準ログ、全stepの詳細、全artifact一覧、画像バイナリ/Base64、不要なJSON全文を会話へ展開することである。

以後の作業では次を標準運用とする。

- 成功時は、workflow/job名、成功したこと、必要なら対象commitだけを記録する。
- 失敗時は、失敗したworkflow/job/stepと、原因特定に必要な前後だけを取得する。
- 成功したstepのログ全文は取得・転記しない。
- artifactは必要なものだけ開き、全画像・全JSONを一括展開しない。
- PNG/WebP等をBase64へ変換して会話やログへ出さない。
- 詳細な検証結果を永続化する必要がある場合は `doc/development/PROGRESS.md` 等へ記録し、会話には要点だけ返す。

## 戦闘の手応えとHP表示（2026-11-09追加）

`tests/battle-playback.test.mjs` は命中前後のHP表示、演出省略による二重実行防止、終了時の操作復帰、再描画・ロード時の予約取消、武器別の通常攻撃、撃破結果を検査します。出力はNode標準の試験件数と成否です。

`.github/workflows/battle-feedback.yml` は `tools/browser-effects-smoke.mjs` をChromiumで実行します。Scene／Classic表示とClassic／Grid／Frontline戦闘の6組、斬撃・強打・刺突・弓の飛翔、命中音と数字の予約差、PC／390px、撃破、軽減・オフ、取消を検査します。結果JSONと代表PNGを7日間のartifactへ保存します。音声アダプターへの発音指示を検査し、スピーカーの聴感評価は行いません。

`tests/battle-impact.test.mjs` は追加の火花・衝撃波・回復・撃破、命中結果の分類、合成SEの音量・同時発音数・予約取消、BGMの一時減音と復帰を検査します。ブラウザー検査は `OfflineAudioContext` で既存SEと合成音を重ねた10種類を実際に生成し、無音・クリッピング・音色の取り違えを検査します。会心・回復・撃破のPNGと波形測定値を既存artifactへ追加します。
