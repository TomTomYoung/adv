# 灯帰りの迷宮

灯を持ち、仲間を連れ、迷宮から帰る。古典的なダンジョン探索と文章・選択肢のADVを組み合わせたブラウザRPGです。

## 遊ぶ

リポジトリのルートをHTTPで配信してください。実行時のnpm依存、外部CDN、APIキー、サーバー側処理はありません。

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

ブラウザで `http://127.0.0.1:8000/` を開きます。Windowsでは `python` でも実行できます。`file://` での直開きはJSON・ES Modulesの読込制約があるため対象外です。

GitHub Pagesでは、このリポジトリの `master` のルートを配信できます。Pagesの公開設定はこの実装では変更していません。非公開リポジトリの配信可否はアカウントの設定を確認してください。

最初は「帰らない灯番」を受注し、「この迷宮へ」から地下水道に入ります。W/Sで前後移動、A/Dで方向転換、Eで足元・正面を調べます。ボタンでも全操作ができます。右の追跡欄に調査地点の座標が出ます。

音は初期設定ではオフです。右上の「音：切」を押し、「音：再生中」を確認してください。「記録」で音量を調整できます。「音：再生待ち」「音：再試行」の場合はボタンをもう一度押します。音の設定は次回にも保存されます。

## 内容

- 10地域・各2階層、合計20マップ。疑似3Dの通路と探索済み地図。
- 100件の日本語クエスト。現場の痕跡、記録・証言、選択による3つの結末。合計300結末。
- 4人で開始。酒場「帰り火亭」で10人から最大5人を編成。ターン制戦闘、攻撃・術・防御・回復・毒・逃走、経験値と装備。
- 町、店、宿、無料の施療所、補給箱、施錠扉、鍵、罠、泉、階段、帰還印。
- 自動保存、3つの手動記録、JSONファイル書き出し・読込。会話・選択・戦闘中の継続位置も保存。
- 40の敵定義。従来の5種の絵に、新種20体の個別画像と仲間10人の肖像を追加。
- AIPaintの背景・初期魔物、AIMusicの探索・戦闘ループ曲。BGMは音量を調整した新版を収録。
- 28種のSE、JSON式の動き8種、8コマ画像アニメーション8種、フィールド演出8種。

最終依頼「百の帰還」は他の99件完了で解放されます。全滅しても依頼や手掛かりは失われず、町で回復して再挑戦できます。

## シナリオと画面を作る

作品定義は [data/game.json](data/game.json)、個別クエストは [data/quests](data/quests)、マップは [data/maps](data/maps) にあります。JSONだけで本文、分岐、報酬、戦闘、敵AI、計算式、道具、イベントを変更できます。正式な入力形式はJSONです。

[view-preview.html](view-preview.html) は画面だけをデザインする独立ページです。8種類のサンプル画面を選べ、テーマをJSONへ書き出せます。ゲーム本番の「記録 → 画面テーマを読み込む」で適用します。より大きな構成変更も `src/view/` だけで行えます。

[仕様・進捗・引き継ぎ](doc/README.md) / [JSON命令リファレンス](doc/SCRIPT_REFERENCE.md) / [ビュー契約](doc/VIEW_CONTRACT.md) / [100件の索引](doc/QUEST_CATALOG.md) / [素材の来歴](assets/PROVENANCE.md)

[魔物一覧・画像](doc/MONSTER_CATALOG.md) / [戦闘バランス計画・実測](doc/BALANCE_PLAN.md) / [仲間一覧・肖像](doc/COMPANION_CATALOG.md)

[SE一覧・音源](doc/SE_CATALOG.md) / [戦闘・フィールド演出一覧](doc/EFFECT_CATALOG.md)

「記録」でSE音量と演出の通常・軽減・オフを選べます。ビュー用プレビューでは効果を再生し、SEを個別に試聴できます。演出とSEの原稿は `authoring/presentation.json`、素材の再作成は `node tools/assets/generate-effects.mjs`、定義の更新は `node tools/build-presentation.mjs` です。

## 開発確認

Node.js 22以上。依存のインストールは不要です。

```sh
node tools/validate.mjs
node tools/check-static.mjs
node --test tests/*.test.mjs
```

`npm test` でもテストできます。GitHub Actionsにも同じ検査を定義しています。

`authoring/quests.txt` は100件の原稿、`tools/build-content.mjs` は決定的なコンパイラです。通常は生成済みJSONを直接編集して構いません。コンパイラを再実行すると100件のJSON・データベース・マップを原稿から上書きするので、直接加えた修正を先に原稿または生成コードへ反映してください。

追加の魔物・仲間の原稿は `authoring/entities.json`。`node tools/build-entities.mjs` で拡張データを再生成します。build-contentも最後に同じ拡張を適用します。`node tools/simulate-balance.mjs` で1,200戦の計測結果をdocへ書き出します。1.0.0・1.1.0の記録は1.2.0へ自動移行し、既存の進行を保持します。

元のPhaser屋敷デモはGit履歴に保存されています。旧セーブ `phaserAdventureGameSave` は変更しませんが、新ゲームへは移行しません。
