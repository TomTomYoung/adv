# クエスト内イベントとマップへの投影

更新日: 2026-09-16。作品版1.9.0。クエストイベント集約後にq001の本文・モデル・壁灯を改稿しました。

## 正本と編集

クエスト固有の配置と現地調査は `authoring/quests/qXXX.events.json` を編集します。このファイルの `events` と追加の `scripts` は、対応する `data/quests/qXXX.json` に集約されます。本筋の原稿は従来どおり `stories-v11-*.mjs`、`catalog-q011-q020.json`、`structures-*.mjs`、`scenarios-*.mjs` です。配布時には同じクエストJSONの events・scripts・story・outcomes・model から配置、条件、会話、選択肢、分岐、報酬と結末を追えます。

`npm run build:scenarios` で全体を生成します。イベント原稿だけを修正した場合は `npm run build:dungeons` でもクエストへの反映と文書更新が行われます。編集用スキーマは [quest-events.schema.json](../data/schemas/quest-events.schema.json)、配布用は [quest.schema.json](../data/schemas/quest.schema.json) です。

全200クエストに416イベント定義があります。403イベントは405か所へマップオブジェクトを配置し、13イベントは現地で「調べる」から起動します。q193とq194は同じイベントを元のマップと固有ダンジョンの両方に配置するため、定義数と配置数が異なります。

## マップとダンジョンの担当範囲

`data/maps/*.json` は地形・入口・階段・汎用の扉や補給箱など121オブジェクトを保持します。クエスト専用の405オブジェクトは含みません。読込時に loader がクエストの events をマップへ投影し、実行用の map.objects は従来と計526オブジェクトになります。投影は読込内容の中だけで行い、配布マップJSONを書き換えません。

ダンジョンは maps・systems・art・入口を保持します。fieldScenes は廃止しました。ダンジョンからクエストを逆参照せず、クエストイベントの任意の dungeon と points が関連先を指定します。画像区画の正本は `authoring/dungeon-art.json` です。

## イベントの記法

id はクエスト内で一意です。マップへ配置するイベントでは、そのまま object ID にも使います。title は表示名、points は map・x・y・任意の z を持つ配置先です。同一mapに同じIDを二重配置できません。異なる高さでも同じmapの別物体には別IDを付けます。

trigger が enter または interact のイベントは、kind、script、safe、once、blocking、initialState、visibleWhen、condition をマップへ投影します。script は必ず同じクエストの scripts に定義します。role がある地点は追跡欄の locations へ生成されます。

visibleWhen は物体の出現条件です。偽なら表示・操作・通行妨害・遮蔽の対象になりません。condition は操作の有効条件です。visibleWhen が真で condition が偽なら、物体は存在しますがスクリプトは実行しません。false を直接指定しても条件を省略した扱いにはしません。

マップ固有の既存オブジェクトでは、visibleWhen が省略されている場合に従来の condition を出現条件にも用います。クエストの旧 condition は移行時に visibleWhen へ写したため、以前と同じときに出現します。

safe は配置地点の通常遭遇を抑える従来の指定です。イベントの非表示・onceによる消化後も、その地点の安全指定は保持します。環境の危険やスクリプトが起こす戦闘は止めません。安全指定まで出現条件に連動させると旧経路の遭遇・乱数列が変わるため、今回の移行では従来の意味を保ちます。

once は `state.events[map/object]` を参照します。状態は `state.objects[map/object]` を正本とし、未更新時だけ initialState を使います。`object.state.set` で low、empty、lit、extinguished などの空でない文字列を保存できます。q001の壁灯3本をこの形式で配置しています。式 `object_state` は map・object・default から現在値を読みます。任意の fire は effect・radius・litStates を持ち、有効な状態の壁灯だけが火の守護範囲になります。

会話の表示条件と分岐は scripts 内の if／switch、選択肢の表示条件は visibleWhen、選択可否は condition と storyAction、要求表示は requirement、実行内容は commands に定義します。q001以外の既存命令列は、今回の改訂でも保持しています。

## 条件成立で自動的に起動するイベント

trigger が auto のイベントは condition と once: true を持ち、受注中かつ探索中に条件が成立すると自動実行します。points が空配列ならセル指定なし、座標を指定するとそのセルにいることも条件になります。会話・戦闘中は保留し、終了後に再判定します。マップ物体へは投影しません。詳細は[フィールド・戦闘イベント仕様](EVENT_SYSTEM.md)を参照してください。

## 調べるから起動する個別調査

trigger が action のイベントはマップオブジェクトを追加せず、points の足元・正面で「調べる」の対象になります。複数の対象がある場合はメッセージウィンドウ内で選びます。Coreが `{type: quest.event, quest: qXXX, id: イベントID}` に相当する調査を実行します。Core は会話・戦闘・実行中の命令列、出現条件、有効条件、関連ダンジョン、地点と高さ、once を再検査してから script を実行します。

任意の note は text と when を持ちます。when が成立した記録だけを依頼一覧と手帳へ投影します。旧13調査の観察条件・本文・選択肢は同じクエストの scripts に入り、記録済みフラグは従来の `flags.dungeonNotes` を読みます。調査記録を救助や同意などの本筋の成立と取り違えません。

## 旧セーブと改版

内容版1.9.0／セーブ形式1です。旧内容版は移行せず、読込エラー時に新規開始します。q001は旧命令列を削除し、現在の二結末と壁灯調査を生成します。他依頼の本文は変更せず、正常な同版記録で会話位置・イベント回数・調査記録を保持します。

同じ内容版の会話構造を無断で上書きしないでください。構造改稿では内容版またはイベントrevisionを更新します。build:dungeonsは同一IDの異なる追加原稿を拒否します。

## 検証

`tests/quest-events.test.mjs` は1.8.0の改稿対象外スクリプト・オブジェクトの指紋、原稿と配布定義の一致、出現／操作条件の分離、once、状態の保存再読込、13記録の引継ぎ、不正な配置と外部スクリプト参照を検証します。既存の現地調査テストはクエストイベントの操作意図へ移し、13ダンジョンの実状態と旧会話の継続を確認します。
