# ビューと表示データの契約

更新日: 2026-09-14。作品版1.8.0の立方体地形・素材・現地調査を含みます。

## 境界

データ読込 → GameEngine → projectGame → GameView の向きで情報を渡します。GameViewはJSON互換の表示用スナップショットだけを受け取り、ボタンやキーに相当する操作意図を外へ返します。

`src/view/` から `src/core/` や `src/application/` をimportしないことを静的検査します。ビューはsave/load、乱数、報酬、命令の実行を持ちません。ビューの取替えでゲームの判定を変えないことが目標です。

## デザイン作業

1. HTTPで `view-preview.html` を開きます。
2. 町・酒場・探索・会話・選択肢・戦闘・新種の二体戦・手帳の表示例を切り替えます。
3. 色、書体、本文サイズ、角丸、隊の左右配置を編集してテーマJSONを書き出します。
4. 本番の「記録 → 画面テーマを読み込む」で反映します。

HTMLの構成や絵の大きさまで変える場合は `view.js` と `style.css` を編集します。レイキャストの見え方は `dungeon.js`、許可するテーマ項目は `theme.js` です。この作業でcoreの変更は不要です。

プレビューは `data/view-fixtures.json` の8つの固定スナップショット（全13固有システムの網羅プレビューではありません）を読みます。ゲーム本体や個人のセーブを実行しません。ボタンを押した際は送出する操作を表示します。表示例を最新データから再作成する開発用ツールは `node tools/build-fixtures.mjs` です。生成ツールだけがエンジンを利用し、表示ページからは読み込みません。

## ViewModel

項目：title/subtitle/mode / 内容：作品名、副題、town/dungeon

項目：gold/level/xp/completed/total/light / 内容：数値表示に必要な現在値

項目：party[] / 内容：id、表示名、職業、人物紹介、portrait画像URL、HP/MPと上限、状態異常、能力値、技能、装備名・取外し可否

項目：roster[] / tavern / 内容：候補全員の表示情報、active・canJoin・canLeave・swapCandidates。酒場の名前・説明・定員・編集可否

項目：quests[]/tracked / 内容：公開依頼情報、受注可能か、段階、調査座標、完了済みなら選んだ結末

項目：dungeon / 内容：位置・方角、探索済みセル、描画用geometryと通行可否を持つcells、可視のイベント、画像URL

項目：dialog / 内容：textなら本文と話者、choiceならid/本文/条件説明/enabled

項目：battle / 内容：手番、行動者、敵とHP/画像/guarded、使用可能な技能と道具、逃走可否、ログ

項目：services/inventory/shop / 内容：施設・所持品・購入候補の表示用データ

項目：journal/log/notice/ending / 内容：発見記録、直近ログ、通知、到達した終幕

項目：music / 内容：ブラウザ音声アダプターへ渡すBGM URL

項目：feedback / 内容：session・revisionと一時events。effects・sound URL/gain・targets・at

項目：effects/effectAssets / 内容：表示専用の効果定義と画像URL辞書

項目：atmosphere / 内容：探索画面へ掛ける色・不透明度・shade

model.world.truth、未獲得の手掛かり本文、未選択の結末は公開ViewModelへ含めません。viewが内部stateへ到達する参照も渡しません。

## 操作意図

type：advance / フィールド：なし。本文の続きを進める

type：choose / フィールド：id: 選択肢ID

type：accept / track / フィールド：id: 依頼ID

type：travel / フィールド：dungeon: ダンジョンID。旧region: 地域番号も受け付ける

type：move / フィールド：direction: forward/back/left/right

type：interact / retreat / フィールド：なし

type：service / フィールド：id: 施設操作ID

type：buy / フィールド：item: アイテムID

type：item / equip / フィールド：item、actor

type：party / フィールド：action: join/leave/swap、actor。swap時はreplaceに交代する現隊員ID

type：unequip / フィールド：actor、slot。町で装備を袋へ戻す

type：job.change / フィールド：actor、job: 転職先ID

type：job.action / フィールド：actor、ability: 探索特技ID

type：dungeon.action / フィールド：system、action、target。操作に応じactor、ability、itemなど

type：dungeon.scene / フィールド：id: 現地調査ID

type：battle / フィールド：action: skill/item/escape、該当するskill/itemとtarget

disabledは表示上の案内に過ぎず、GameEngineも同じ条件を検査します。UIから型やIDを改変しても、不足MPや未所持アイテムによる操作を通しません。

保存メニュー・音声・全体キー入力は `src/main.js` と `src/application/audio.js` のブラウザアダプターです。音ボタンはアダプターから渡すラベルを表示し、GameView.updateSound(label)で状態だけを更新できます。別のネイティブUIやCLIを作る場合はGameEngineとprojectGameを再利用し、このアダプターとGameViewを置き換えます。

## テーマ契約

background/surface/raised/ink/muted/accent/border/dangerは6桁のHEX色。fontはserif/sans-serif/monospace。sidebarはleft/right。本文16〜24、角丸0〜20、コンテンツ幅960〜1800を許可します。テーマは任意コード・任意CSS・外部URLを受け付けません。

色の値を自由に変えられるため、書き出したテーマのコントラストと可読性は制作者が確認してください。本番のデータ・戦闘・保存とは独立して適用されます。

## 一時演出

GameViewはdata-fx属性のscene / screen / party / actor:ID / enemy:instanceを表示上の目印にします。EffectsRendererは再描画前の画像位置を保存し、倒れた敵など新しいDOMにない画像にも最後の効果を付けます。演出はbody上の操作を遮らない一時要素とWeb Animations APIを使用し、終了・中断時に取り除きます。元画像とコアの状態は変更しません。

feedbackのsession/revisionが同じ場合は再生しません。通常の描画前に予約・変形を中止し、音声アダプターにもui.cancelFeedbackで同じ取消しを通知します。ui.effectsModeはfull / reduced / offを返します。OSの動き軽減も表示側で扱います。previewは固定データのfeedbackだけを差し替えて、任意の効果を再生します。

## 依頼の調査数と選択肢

questsとtrackedにevidenceTotalを追加しました。証拠地点数が0の依頼は場面内で進行するため「相談・調査」を表示します。evidenceCountを固定値2で割らないでください。選択肢はvisibleWhenを満たすものだけが投影され、conditionに応じたenabledを持ちます。非表示選択肢の本文や作者用modelは渡しません。

## 現行経路と旧セーブの進行地点

quests/trackedのlocationsとevidenceTotalは、現在使用している経路の案内です。個別進行では開始地点だけを投影し、旧二地点を数えません。旧版で進行中の依頼は移行フラグに基づき旧地点を投影します。保存互換用に残る全q.locationsをそのまま画面へ表示しないでください。モデルの本文・真相・未到達場面は引き続き渡しません。

## 会話人物

`dialog.scene` は省略可能で、`title` と `cast` を持つ。cast の要素は `{id, name, role, portrait, remote}`。この場面で表示する人物だけを Application が投影する。View は元の entities、knowledge、作者向け truth を読まない。`remote` は伝声管・面会窓越しの人物で、同席を意味しない。完了後の結果文では最後の場面の人物像を残さない。

## 探索先と篝火

dungeons[]で地域とは独立した探索先を表示します。travelは任意のdungeon IDを受け取り、旧region指定も維持します。dungeon.systems[]のfire_networkにportable、fixtures、保持種火、保護状態、表示倍率、描画用markersを投影します。actions[].intentはdungeon.actionでsystem/action/target、点火スキルではactor/abilityを返します。enabledと理由はコアの同じplanから取得し、実行時に再検査します。lightLabelは携帯松明と灯油を区別します。

## 水位・腐食・破壊壁

dungeon.systems[]はwaterworks（現在の水位・残り刻・既知の区画・近くの装置・待機操作）、corrosion（装備名・累積腐食）、breakable_walls（近くの壁・破壊済み状態・許可された操作）も投影します。waterworks.controls[].actionsとbreakable_walls.walls[].actionsのintentはdungeon.actionでsystem/action/targetを返し、破壊手段に応じitemまたはactor/abilityを付けます。操作条件は同じコアのplanで判定し、実行時にも検査します。

動的地形はdungeon.geometryとcellsへ反映します。開いた壁はfloor、完全水没はcells[].blocked=trueで、当該マスの通行を禁止します。水域は既知のマスだけ青い表示・マーカーにし、固有システムの有無を灯油と火台の判別に流用しません。Viewは周期、腐食計算、資源消費、地形変更を行いません。

## その他の固有システム

追加部品はdungeon.systems[]へtitle、summary、cards（name/text/actions）、actions、markersを投影します。各actionはlabel/intent/enabled/reasonを持ちます。dungeons[].previewは入場前の区域制限です。戦闘中もsummaryを表示でき、battle.items[].enabledで道具の術の使用可否を確認します。停止中の状態異常・戦闘補正は表示名へ「停止中」を付けます。cells[].blockedは一般の通行不能、cells[].waterは水没の描画指定です。波模様の判定にはwaterを使います。

## 職業・技能と表示可否

partyとrosterには、現在職、成長履歴、習得技能、探索特技、装備、転職候補と能力比較を含めます。jobsは職業カタログ、statNamesは能力値の表示名です。転職候補・探索特技・戦闘技能はenabledとreasonを持ちます。src/application/job-projection.js がコアの計画関数から投影し、Viewで成長・料金・使用許可を計算しません。

## ダンジョン素材と現地調査

dungeons[].art、dungeon.wall、各固有システム・カード・マーカーのartは `{url, rect}` です。rectは0〜1の正規化された `{x,y,width,height}` で、同じアトラスの切り出し範囲を表します。ダンジョンの壁面・装置はsrc/application/dungeon-projection.jsで画像IDから表示URLへ解決します。素材がない場合は既存の色・記号による描画を維持します。

dungeon.scenesは現在地または正面で調査できる場面のパネルです。各カードの操作はdungeon.scene意図を返し、コアが距離・会話・戦闘・対象IDを再検査します。会話中はdialog.fieldSceneにtitleとartを渡します。dialog.sceneの人物像とは別項目です。

quests[].fieldLinksは関連する迷宮・調査地点の案内、quests[].fieldNotesはその依頼で獲得済みの観察、fieldNotesは手帳全体の観察一覧です。未獲得の観察本文は投影しません。調査記録を得ても依頼の結末や報酬を自動確定しません。表示と依頼の接続は[DUNGEON_ART_AND_SCENARIOS.md](DUNGEON_ART_AND_SCENARIOS.md)を参照してください。

## 立方体の断面と六面

立体マップではdungeon.voxel=true、z、currentCube、boundariesを追加します。locationはzを含み、cellsは現在の高さだけを投影します。cellsのwaterDepthは0〜3、waterLabelは水深の表示名、floorは足場の有無、edgesは横四面の通行を遮る境界です。geometryは密の立方体だけを壁として扱い、完全水没や穴の通行不可はcells.blockedへ分離します。

boundariesは「x,y/side」をキーにした描画用の壁面です。currentCube.neighborsは六方向のkind（密・空・範囲外）とpassage/water/supportを持ちます。Viewは水深ごとの色・波、穴、境界壁、現在高を表示します。上下を自由に見回す描画ではありません。

voxel_spaceのcards/actionsはvisit/toggle/pump/dig/install/traverseのdungeon.action意図を返します。対象のtarget、必要時のitemまたはactor/abilityを付け、Coreで同じplanを再実行します。リンクを渡るとCoreが終点のzへ移動します。測量とイベント表示も現在高を区別します。
