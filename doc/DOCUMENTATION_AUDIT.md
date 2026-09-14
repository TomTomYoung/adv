# doc 全ファイル照合記録

照合日: 2026-09-14。元のdoc直下31ファイルを、実装head f8bf8a6fbf4c9bba6f126e06b135ea781744586b、配布JSON、原稿、生成器と照合しました。GitHubのmasterはcf2920f6（1.7.0）、素材・現地調査はPR #8の追加です。確認時点の状態は[CURRENT_STATUS.md](CURRENT_STATUS.md)へ記載します。

## 整理結果

現行25ファイルを更新・照合し、旧設計・旧実装記録・旧版の測定結果6ファイルをlegacy/2026-09-14へ移しました。現行文書へ統合した4ファイルも更新前のコピーを保存しています。保存原文の書換えは行わず、日付・元の場所・理由・SHA-256を[移動記録](legacy/2026-09-14/manifest.json)に記載しました。

## ファイルごとの扱い

### BALANCE_PLAN.md

[BALANCE_PLAN.md](BALANCE_PLAN.md)：現行の測定条件・コマンド・固有環境の追加測定範囲を整理。旧版の実測値は履歴へ参照。 更新前の全文は[保存原文](legacy/2026-09-14/BALANCE_PLAN.md)に保持。

### BALANCE_RESULTS.json

[保存原文](legacy/2026-09-14/BALANCE_RESULTS.json)へ移動。version 1.3.0の1200戦の測定値です。現行1.7.0の環境効果を検証した結果へ書き換えることはできません。

### CHARACTERS.md

[CHARACTERS.md](CHARACTERS.md)：36人物とgenerated WebP画像、依頼人索引を照合。正しい内容を保持して書式を統一。

### COMPANION_CATALOG.md

[COMPANION_CATALOG.md](COMPANION_CATALOG.md)：現在の初期職・成長・技能をエンジンから生成。仲間10人と最大5人編成を明記。

### CURRENT_STATUS.md

[CURRENT_STATUS.md](CURRENT_STATUS.md)：master cf2920f6とPR #8の実装head f8bf8a6fを区別し、1.3.1/master・PR #3未マージという旧状況を置換。 更新前の全文は[保存原文](legacy/2026-09-14/CURRENT_STATUS.md)に保持。

### DUNGEON_ART_AND_SCENARIOS.md

[DUNGEON_ART_AND_SCENARIOS.md](DUNGEON_ART_AND_SCENARIOS.md)：13件の観察条件・対応依頼をauthoring/dungeon-scenes.jsonと照合。素材参照と旧会話保持を確認し、正しい本文を維持。

### DUNGEON_CATALOG.md

[DUNGEON_CATALOG.md](DUNGEON_CATALOG.md)：13件の固有設定、深淵の確定済み係数、25マップ、現地調査との接続を更新。

### DUNGEON_SYSTEMS_1_7.md

[DUNGEON_SYSTEMS_1_7.md](DUNGEON_SYSTEMS_1_7.md)：masterへの反映状況と素材・現地調査への参照、検証範囲を更新。

### DUNGEON_SYSTEM_DESIGN.md

[DUNGEON_SYSTEM_DESIGN.md](DUNGEON_SYSTEM_DESIGN.md)：提案中心の本文を登録部品・状態・検証・JSON生成の現行設計へ統合。

### EFFECT_CATALOG.md

[EFFECT_CATALOG.md](EFFECT_CATALOG.md)：24種の表示効果と素材・表示契約を照合し、古いテスト件数を共通記録へ集約。

### HANDOFF.md

[HANDOFF.md](HANDOFF.md)：原稿の正本・生成手順・互換性の約束を更新。実装済みの提案を未実装項目から除外。 更新前の全文は[保存原文](legacy/2026-09-14/HANDOFF.md)に保持。

### JOB_BALANCE_RESULTS.json

[保存原文](legacy/2026-09-14/JOB_BALANCE_RESULTS.json)へ移動。version 1.3.0の職業差し替え360戦の測定値です。現行版で再計測した結果とは区別して保存します。

### JOB_IMPLEMENTATION.md

[保存原文](legacy/2026-09-14/JOB_IMPLEMENTATION.md)へ移動。1.3.0導入時の職業実装・限定的なブラウザ試験の記録です。現行操作と保存仕様はJOB_SYSTEM.mdへ集約しました。

### JOB_SYSTEM.md

[JOB_SYSTEM.md](JOB_SYSTEM.md)：30職と10探索特技を実データから生成。腐食・環境補正・バフの適用順と旧計測の扱いを修正。

### JSON_SCRIPT_SPEC.md

[保存原文](legacy/2026-09-14/JSON_SCRIPT_SPEC.md)へ移動。2026-09-09のPhaser前提の将来設計です。現行48命令と保存形式はSCRIPT_REFERENCE.md・SPEC.mdへ集約しました。

### KAGARIBI_DUNGEON.md

[KAGARIBI_DUNGEON.md](KAGARIBI_DUNGEON.md)：導入時の1.5.0と現在版を区別し、共通検証記録とq001の現地調査へ接続。

### MONSTER_CATALOG.md

[MONSTER_CATALOG.md](MONSTER_CATALOG.md)：20種の発想・個別画像を保持し、旧種を含む55定義の実数値・画像・出現先を生成。

### PROGRESS.md

[PROGRESS.md](PROGRESS.md)：428テストの対象とブラウザ未確認・追加100本の調整範囲を整理。 更新前の全文は[保存原文](legacy/2026-09-14/PROGRESS.md)に保持。

### QUEST_CATALOG.md

[QUEST_CATALOG.md](QUEST_CATALOG.md)：200本・630結末と原稿本文を照合。本文を保持し、作品版・更新日・文書書式を更新。

### README.md

[README.md](README.md)：現行文書と履歴の入口を再編し、各仕様・カタログ・検証記録への参照を更新。

### SCENARIOS_Q001_Q010_V11.md

[SCENARIOS_Q001_Q010_V11.md](SCENARIOS_Q001_Q010_V11.md)：現行の10本の本文・選択肢を保持し、作品版と書式を更新。

### SCENARIOS_Q011_Q020.md

[SCENARIOS_Q011_Q020.md](SCENARIOS_Q011_Q020.md)：現行catalog1の10本の本文・選択肢を保持し、書式を統一。

### SCENARIO_DESIGN.md

[SCENARIO_DESIGN.md](SCENARIO_DESIGN.md)：q001〜q010のv1.1、q011〜q020のcatalog1、残りの個別進行と旧経路を区別。

### SCENARIO_IMPLEMENTATION.md

[保存原文](legacy/2026-09-14/SCENARIO_IMPLEMENTATION.md)へ移動。1.3.2導入時の変更・313件の検証記録です。現在の経路はSCENARIO_DESIGN.md、検証状況はPROGRESS.mdへ集約しました。

### SCENARIO_MODEL_V11.md

[SCENARIO_MODEL_V11.md](SCENARIO_MODEL_V11.md)：作品版・旧保存の移行・q004/q008の互換性・採用中の36人WebP肖像・再生成手順を更新。

### SCENARIO_V11_IMPLEMENTATION.md

[保存原文](legacy/2026-09-14/SCENARIO_V11_IMPLEMENTATION.md)へ移動。1.4.0導入時の検証記録です。その後のカタログ改稿・素材更新を含む現行仕様はSCENARIO_MODEL_V11.mdに記載します。

### SCRIPT_REFERENCE.md

[SCRIPT_REFERENCE.md](SCRIPT_REFERENCE.md)：COMMANDSとEXPRESSION_OPSへ照合。storyの3命令と戦績repelsを含む48命令・30演算子へ更新。

### SE_CATALOG.md

[SE_CATALOG.md](SE_CATALOG.md)：28種のSE定義と実音源参照を照合し、更新日・書式を統一。

### SPEC.md

[SPEC.md](SPEC.md)：作品版1.7.0の探索・隊編成・職業・シナリオ・保存・素材を現行コードに統合。

### VIEW_CONTRACT.md

[VIEW_CONTRACT.md](VIEW_CONTRACT.md)：版ごとの追記を現在のViewModelへ統合。職業・動的地形・素材rect・現地調査・手帳の投影と操作意図を記載。

### WATERWAYS_SALT_MINE.md

[WATERWAYS_SALT_MINE.md](WATERWAYS_SALT_MINE.md)：旧11ダンジョン・23マップの件数を更新し、水位・腐食・破壊壁とq010/q011の調査を対応。

## 保守用に追加したもの

[DATA_SNAPSHOT.json](DATA_SNAPSHOT.json)はgame manifestが列挙するJSONを集計します。ID数、結末数、場面数、命令・演算子・移行版・素材数と入力ファイルのハッシュを記録します。場面はmodel.graphの573件で、story.scenesの互換名を含む49件を重複加算しません。

`npm run build:docs` はデータ一覧とメタデータを更新します。職業・仲間・敵・ダンジョン・命令の生成部分を更新し、作者が書いたシナリオ本文は書き換えません。build:scenarios / build:jobs / build:characters / build:dungeonsも最後に文書を更新します。

`npm run check:docs` は現行文書と履歴索引のローカルリンク、元の文書のハッシュ、現在のデータと集計の一致を検査します。保存した旧本文の相対リンクは当時のdoc直下を基準とするため、現行リンクへの自動書換えの対象にしません。

## 検証結果

2026-09-14に `npm run check` を再実行し、428テスト成功、失敗0、skip 0でした。データ・素材参照と構文・import・View分離の検査も成功しています。

`npm run check:docs` で現行26 Markdown、履歴索引、ルートREADMEのローカルリンクと見出し参照、10原文のSHA-256、配布データ集計の一致を確認しました。保存原文は移動前のGit blobとも全10件一致しています。

`npm run build:docs` を繰り返してdoc以下40ファイルのハッシュが一致しました。独立した作業コピーで `npm run build:scenarios` を実行し、現行Markdown全文、authoring、src、assetsが一致しました。data/items.jsonの発破薬キーの位置だけが末尾へ変わり、全JSON値は一致しています。入力をバイト列で記録するDATA_SNAPSHOTのハッシュにはこの順序差が現れます。

ルートREADMEの移動文書への2参照も現行文書へ修正しました。ゲーム用JSON・原稿・画像・ゲーム処理の変更はありません。旧結果を現行版の実測値へ書き換えておらず、ブラウザの操作確認と長期探索の追加測定は引き続き未実施です。
