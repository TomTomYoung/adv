# ビューだけで画面をデザインする

## 境界

データ読込 → GameEngine → projectGame → GameView の向きで情報を渡します。GameViewはJSON互換の表示用スナップショットだけを受け取り、ボタンやキーに相当する操作意図を外へ返します。

`src/view/` から `src/core/` や `src/application/` をimportしないことを静的検査します。ビューはsave/load、乱数、報酬、命令の実行を持ちません。ビューの取替えでゲームの判定を変えないことが目標です。

## デザイン作業

1. HTTPで `view-preview.html` を開きます。
2. 町・酒場・探索・会話・選択肢・戦闘・新種の二体戦・手帳の表示例を切り替えます。
3. 色、書体、本文サイズ、角丸、隊の左右配置を編集してテーマJSONを書き出します。
4. 本番の「記録 → 画面テーマを読み込む」で反映します。

HTMLの構成や絵の大きさまで変える場合は `view.js` と `style.css` を編集します。レイキャストの見え方は `dungeon.js`、許可するテーマ項目は `theme.js` です。この作業でcoreの変更は不要です。

プレビューは `data/view-fixtures.json` の8つの固定スナップショットを読みます。ゲーム本体や個人のセーブを実行しません。ボタンを押した際は送出する操作を表示します。表示例を最新データから再作成する開発用ツールは `node tools/build-fixtures.mjs` です。生成ツールだけがエンジンを利用し、表示ページからは読み込みません。

## ViewModel

| 項目 | 内容 |
| --- | --- |
| title/subtitle/mode | 作品名、副題、town/dungeon |
| gold/level/xp/completed/total/light | 数値表示に必要な現在値 |
| party[] | id、表示名、職業、人物紹介、portrait画像URL、HP/MPと上限、状態異常、能力値、技能、装備名・取外し可否 |
| roster[] / tavern | 候補全員の表示情報、active・canJoin・canLeave・swapCandidates。酒場の名前・説明・定員・編集可否 |
| quests[]/tracked | 公開依頼情報、受注可能か、段階、調査座標、完了済みなら選んだ結末 |
| dungeon | 位置・方角、探索済みセル、衝突を反映したgeometry、可視のイベント、画像URL |
| dialog | textなら本文と話者、choiceならid/本文/条件説明/enabled |
| battle | 手番、行動者、敵とHP/画像/guarded、使用可能な技能と道具、逃走可否、ログ |
| services/inventory/shop | 施設・所持品・購入候補の表示用データ |
| journal/log/notice/ending | 発見記録、直近ログ、通知、到達した終幕 |
| music | ブラウザ音声アダプターへ渡すBGM URL |
| feedback | session・revisionと一時events。effects・sound URL/gain・targets・at |
| effects/effectAssets | 表示専用の効果定義と画像URL辞書 |
| atmosphere | 探索画面へ掛ける色・不透明度・shade |

model.world.truth、未獲得の手掛かり本文、未選択の結末は公開ViewModelへ含めません。viewが内部stateへ到達する参照も渡しません。

## 操作意図

| type | フィールド |
| --- | --- |
| advance | なし。本文の続きを進める |
| choose | id: 選択肢ID |
| accept / track | id: 依頼ID |
| travel | region: 地域番号 |
| move | direction: forward/back/left/right |
| interact / retreat | なし |
| service | id: 施設操作ID |
| buy | item: アイテムID |
| item / equip | item、actor |
| party | action: join/leave/swap、actor。swap時はreplaceに交代する現隊員ID |
| unequip | actor、slot。町で装備を袋へ戻す |
| battle | action: skill/item/escape、該当するskill/itemとtarget |

disabledは表示上の案内に過ぎず、GameEngineも同じ条件を検査します。UIから型やIDを改変しても、不足MPや未所持アイテムによる操作を通しません。

保存メニュー・音声・全体キー入力は `src/main.js` と `src/application/audio.js` のブラウザアダプターです。音ボタンはアダプターから渡すラベルを表示し、GameView.updateSound(label)で状態だけを更新できます。別のネイティブUIやCLIを作る場合はGameEngineとprojectGameを再利用し、このアダプターとGameViewを置き換えます。

## テーマ契約

background/surface/raised/ink/muted/accent/border/dangerは6桁のHEX色。fontはserif/sans-serif/monospace。sidebarはleft/right。本文16〜24、角丸0〜20、コンテンツ幅960〜1800を許可します。テーマは任意コード・任意CSS・外部URLを受け付けません。

色の値を自由に変えられるため、書き出したテーマのコントラストと可読性は制作者が確認してください。本番のデータ・戦闘・保存とは独立して適用されます。

## 一時演出

GameViewはdata-fx属性のscene / screen / party / actor:ID / enemy:instanceを表示上の目印にします。EffectsRendererは再描画前の画像位置を保存し、倒れた敵など新しいDOMにない画像にも最後の効果を付けます。演出はbody上の操作を遮らない一時要素とWeb Animations APIを使用し、終了・中断時に取り除きます。元画像とコアの状態は変更しません。

feedbackのsession/revisionが同じ場合は再生しません。通常の描画前に予約・変形を中止し、音声アダプターにもui.cancelFeedbackで同じ取消しを通知します。ui.effectsModeはfull / reduced / offを返します。OSの動き軽減も表示側で扱います。previewは固定データのfeedbackだけを差し替えて、任意の効果を再生します。
