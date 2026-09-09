# 実装引き継ぎ

更新日: 2026-09-09。対象: 灯帰りの迷宮 1.1.0。

## 最初に行うこと

1. READMEとSPEC、PROGRESSを読む。
2. `node tools/validate.mjs`、`node tools/check-static.mjs`、`node --test tests/*.test.mjs` を実行する。
3. HTTP配信でindex.htmlを開く。画面だけの作業はview-preview.htmlから始める。

## 編集する場所

| 変更したいもの | 編集対象 |
| --- | --- |
| 依頼の文章・手掛かり・選択・結果 | data/quests/q001.json〜q100.json |
| 地形・扉・調査位置・トリガー | data/maps/*.json |
| 共通イベント・施設・道具の処理 | data/scripts/common.json |
| 戦闘ルールの数値・技能・AI | data/system.json、formulas.json、skills.json、enemies.json、encounters.json |
| 新しい汎用命令 | src/core/script.js、validation.js、対応Schema・テスト |
| 表示データの項目 | src/application/projection.js、VIEW_CONTRACT |
| 見た目と画面操作の配置 | src/view/のみ。ゲームエンジンをimportしない |
| 保存・キーボード | src/main.js |
| 音の状態・曲の切替・再試行 | src/application/audio.js |
| 拡張魔物・仲間の原稿 | authoring/entities.json、tools/build-entities.mjs |

現行の生成コードは `authoring/quests.txt` の100行を、独立したJSONへコンパイルします。ゲーム起動時に生成やテンプレート展開はしません。生成済みJSONを直接直した後にbuild-contentを走らせると修正が失われるため、再生成する変更か手編集かを最初に決めてください。原稿変更時はbuild-content、続いてbuild-fixtures、必要ならbuild-schemasを実行します。

1.1.0は魔物20体、仲間10人の肖像、酒場編成を追加しました。MONSTER_CATALOG、COMPANION_CATALOG、BALANCE_PLANを実装前にコミットし、後から画像と実測結果を追記しています。追加原稿だけの再生成はbuild-entities、計測はsimulate-balanceです。BGM新版と画像の生成プロンプトはassets/PROVENANCE.mdを参照してください。

## 維持する契約

- 作品固有の依頼IDや本文をコアへ追加しない。
- ゲーム状態をビューから直接変更しない。操作はdispatchへ渡す。
- 未知命令・壊れた参照を黙って無視しない。式はevalせず、許可された木構造で評価する。
- 戦闘の報酬はon_winにだけ置く。逃走後は同じイベントへ戻れるようにする。
- スクリプトの待機状態を保存できることを崩さない。分岐内ローカル値と呼出scopeを扱う。
- 保存形式や継続位置の互換性を壊す変更ではcontentVersion/saveVersionを更新し、移行方針を記す。
- コアの乱数にMath.randomを混ぜない。seedと乱数位置を保存する。
- 主たる探索地点を鍵のない側に閉じ込めない。正面の閉じた扉を階段より優先して調べる仕様を維持する。
- 依頼の結末やmodel.world.truthを未解決時のViewModelへ流さない。静的ゲームなのでソースを読んだプレイヤーへの秘匿は保証しない。

## 次の作業候補

優先はブラウザでの操作・レイキャスト表示・スマートフォン表示・音声の確認です。次にプレイテストの観察から移動距離と遭遇頻度、依頼の文量、地域別の戦闘難度を調整してください。

コンテンツ拡張では、共通の三地点構成を維持したまま、順序依存の手掛かり、複数階をまたぐ追跡、期限や移動NPCを追加できます。新しい仕組みは汎用命令として実装し、個別シナリオの条件はJSONへ置きます。

素材を再生成する場合はassets/PROVENANCE.mdを読んでください。AIPaint/AIMusicを最新版へ無断で差し替えず、固定ソースとの出力差を確認します。

## 移行元

着手時のリポジトリHEADは `1c4962b143e6a84ec9d6a190960c09c24c349f40`。そこにPhaserの屋敷デモと設計原本があります。旧コードを必要とする場合はGit履歴から確認します。新しいゲームを動かすために旧PhaserのCDNや未配置assetsを復活させる必要はありません。
