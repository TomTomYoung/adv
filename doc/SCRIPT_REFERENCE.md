# JSON DSL 実装リファレンス

更新日: 2026-09-14。作品版1.7.0の48命令・30式演算子を対象とします。実装は src/core/script.js と expression.js、検証は validation.js、エディター補助は data/schemas/ です。旧設計原本は[legacy](legacy/2026-09-14/JSON_SCRIPT_SPEC.md)へ保存しました。

JSONのデータと許可された式を実行します。任意JavaScript・YAML入力・関数名の文字列評価は受け付けません。

## ファイルとID

`data/game.json` のfilesに読み込むファイルを登録します。databasesは名前からJSONへの対応、maps/quests/scriptsはファイル配列です。マップは単体オブジェクト、共通スクリプトは `{ "scripts": { "id": { "commands": [] } } }`、クエストは自分の情報とscriptsを持ちます。全体でscript IDを重複させないでください。

`data/schemas/` のgame/map/quest/script.schema.jsonはエディター用です。ランタイムとCIでは `src/core/validation.js` の検証器が構造と他ファイルへの参照を確認します。

## 基本の書き方

```json
{
  "scripts": {
    "sample.offer": {
      "commands": [
        { "op": "say", "name": "旅人", "text": "包帯を一つ、貸してもらえますか。" },
        {
          "op": "choice",
          "options": [
            {
              "id": "give",
              "text": "傷薬を渡す",
              "condition": { "op": "has_item", "item": "potion", "count": 1 },
              "requirement": "傷薬1個を消費",
              "commands": [
                { "op": "item.take", "item": "potion", "count": 1 },
                { "op": "flag.set", "key": "helped_traveller", "value": true },
                { "op": "say", "text": "旅人は礼を言って立ち上がりました。" }
              ]
            },
            { "id": "leave", "text": "今は渡さない", "commands": [] }
          ]
        }
      ]
    }
  }
}
```

conditionもvisibleWhenもない選択肢を一つ以上残します。条件を満たさない選択肢は無効表示になり、エンジンでも実行を拒否します。

`visibleWhen` が偽の選択肢は表示しません。`condition` は表示した選択肢の実行条件です。どちらもコアで再検査するため、非表示のIDを送っても実行できません。本文でまだ教えていない結論を、無効ボタンで先に見せないために使います。

## 値と条件式

定数はJSON値、参照は `{ "ref": "vars.completed" }` です。flags/varsはネストしたオブジェクトです。例えば `flags.region_1.open` は `flags: { region_1: { open: true } }` を参照します。ドットを含む単一キーにはしません。

1. 比較: eq / ne / gt / gte / lt / lte / in / contains。leftとrightを指定します。
1. 論理: and / orにはargs配列、notにはarg。
1. 存在: existsにはvalue。
1. 所持: has_item(item,count)、has_member(actor)、has_status(actor,status)。
1. 履歴: event_done(event)、map_discovered(map,x,y)。
1. 計算: add/sub/mul/div/mod/min/max/floor/ceil/round/abs/clamp。args配列です。clampは値・下限・上限、div/modは2引数。ゼロ除算はエラーです。
1. 表示文字列: `{ "format": "所持金は{g}G", "values": { "g": { "ref": "gold" } } }`。

戦闘式にはsource/targetのstats等を追加します。敵AIにはselfとself.hp_ratio・self.roundを追加します。chance/random_intという式は現行では未対応です。乱数が必要なシナリオはrandom.set/random.branchを使用します。

`has_member` は出撃隊への所属だけを判定します。不在は `not`、生存も必要なら `actors.<id>.hp > 0` を組み合わせます。現在HP・MP・職業・状態異常は保存状態から参照できますが、装備・職歴を含む最終能力値を任意人物から読む `actor_stat` はありません。戦闘式の `source.stats` を一般のシナリオ条件でそのまま使えるわけではありません。戦績用の `record_count` と受注時差分は末尾のシナリオ拡張節を参照してください。

## 実装した48命令

命令：say / narrate / 主なフィールドと動作：text、任意でname/speaker。本文を表示し、advanceまで待機

命令：choice / 主なフィールドと動作：options[]のid/text/commands、任意condition/visibleWhen/requirement。chooseまで待機

命令：if / 主なフィールドと動作：condition、then[]、else[]。両枝を配列として定義

命令：switch / 主なフィールドと動作：value、cases[{equals,commands}]、default[]

命令：call / 主なフィールドと動作：script、任意args。新しいlocal.argsを持つ呼出

命令：jump / 主なフィールドと動作：script。現在の呼出を置き換え、localを引き継ぐ。反復しても呼出スタックを積まない

命令：return / 主なフィールドと動作：現在の呼出全体を終了。呼出側の次命令へ

命令：set / add / 主なフィールドと動作：target、value。vars/flags/localだけに直接書込

命令：flag.set / 主なフィールドと動作：key、value。flags領域への書込

命令：random.set / 主なフィールドと動作：target、min、max。閉区間の整数、エンジンのPRNGを使用

命令：random.branch / 主なフィールドと動作：branches[{weight,commands}]。正の重みから一枝を選択

命令：item.give / item.take / 主なフィールドと動作：item、count。上限99、不足する消費は拒否

命令：gold.change / 主なフィールドと動作：amount。所持金は0を下回らない

命令：actor.heal / actor.damage / actor.restore_mp / 主なフィールドと動作：target、amount。targetはactor ID、参照式、またはparty

命令：party.heal_all / 主なフィールドと動作：任意ratio。最低でも最大値×ratioへ回復、毒除去、灯の補充

命令：party.join / party.leave / 主なフィールドと動作：actor。最大5人・最低1人の生存者を維持。joinは既存のHP・MP・状態・装備を保持し、回復しない

命令：status.apply / status.remove / 主なフィールドと動作：target、status。状態異常の追加・削除

命令：map.teleport / 主なフィールドと動作：map、x、y、任意facing。実在する通行可能マスへ移動

命令：map.reveal / 主なフィールドと動作：radius。現在位置の周囲を探索済みにする

命令：facing.set / 主なフィールドと動作：direction。north/east/south/west

命令：object.state.set / 主なフィールドと動作：map、object、state。オブジェクトの永続状態変更

命令：event.mark_done / 主なフィールドと動作：event。イベント完了を保存

命令：battle.start / 主なフィールドと動作：encounter、on_win[]、on_lose[]、on_escape[]

命令：quest.accept / 主なフィールドと動作：quest。受注条件を満たす依頼を受注

命令：quest.evidence / 主なフィールドと動作：quest、key、text。重複しない観察結果を記録

命令：quest.complete / 主なフィールドと動作：quest、outcome。結末・報酬・完了数を確定

命令：scene.background / 主なフィールドと動作：asset。表示に渡す背景ID

命令：audio.bgm / audio.se / 主なフィールドと動作：asset。BGM変更または効果音イベント。audio.seはvolume（0〜1）・delay（0〜5000ms）を省略可能。音はユーザー操作で有効化

命令：effect.play / 主なフィールドと動作：effect、任意のtarget・delay。表示専用の効果を予約

命令：screen.set / 主なフィールドと動作：layer、color、opacity、任意のshade。探索画面の持続レイヤーを保存

命令：screen.clear / 主なフィールドと動作：layer。持続レイヤーを解除

命令：rest / 主なフィールドと動作：任意cost/ratio。料金確認後、回復と毒除去・灯の補充

命令：town.return / 主なフィールドと動作：町へ帰還

命令：ending.set / 主なフィールドと動作：title、text。終幕を手帳へ表示

命令：job.change / job.action / 主なフィールドと動作：actorとjob / ability。職業変更・探索特技の共通検査を実行

命令：story.init / story.scene / story.action / 主なフィールドと動作：questとscene／action。宣言された物語状態を初期化し、場面の同席と行為の成立条件を検査

命令：light.refill / 主なフィールドと動作：灯だけを満タンにする。HPや毒は変更しない

battle.startは勝利・逃走時に、それぞれon_win/on_escapeを実行して呼出側へ戻ります。全滅時は共通の救助・町帰還を行い、敗北した呼出スタックを破棄したうえでon_loseだけを町で実行します。敗北後に元の成功処理へ戻ることはありません。3つの配列を全て定義してください。

回復のratioは「現在値へ加算」ではなく「最大値の何割以上にするか」です。通常回復はactor.healを使ってください。restでお金が足りない場合は回復せず通知し、その後のコマンドへ進みます。料金不足で別の会話にする場合はifでgoldを確認します。

## マップイベント

マップのobjectsにid/x/y/name/kind/trigger/scriptを記します。triggerはenter（移動成功時）またはinteract（足元と正面を調べる時）。condition、once、safe、blocking、initialStateを指定できます。blockする物はopen状態で通行可能になります。

各オブジェクトの実行回数は `events[mapId + "/" + objectId]`、状態は `objects[mapId + "/" + objectId]` に保存されます。これらのopaqueキーをrefのドット記法へ混ぜません。表示条件には別のflags、イベント済み判定にはevent_doneを使います。onceイベントは待機を開始する前に消化済みに記録し、保存・再開時は残りのcommandsを続けます。

イベント呼出にはlocal.args.map/objectが渡ります。アイテムのfield scriptにはlocal.args.targetが渡ります。callの引数値も式として評価されます。

## 依頼を追加する

既存q001.jsonを参考に、新しいid/title/client/brief/locations/outcomes/model/scriptsを用意し、マップに調査イベントを設け、game.files.questsへ登録します。通常のエンジンは件数を固定していません。本作の検査には納品要件として200件のassertがあるため、意図的な増量時はその期待値も更新します。

locationsのroleが証拠キーの一覧にもなります（decision以外）。クエストの獲得証拠キーはそこへ登録してください。ビューはevidenceTotalで実際の調査地点数を表示します。証拠地点がない場面型は「相談・調査」と表示します。

作者用model.world.truthと各結末は未解決時のプレイViewModelへ出しません。ただしJSON自体はブラウザへ配信されます。これは作品データの分離であり、不正解析への秘匿機構ではありません。

## 保存互換性

待機中の継続はscript IDとcommands配列内の位置を参照します。既存scriptの配列順序を変えると古い保存位置が別命令を指す可能性があります。配信済みの作品を構造変更する際はcontentVersionを変え、旧記録を明示的に拒否するか移行コードを追加してください。文章のみの修正なら位置は変わりません。

## 1.3.1の戦績と場面継続

`record_count` は `metric` に battles / wins / escapes / losses / repels / kills / encounters を取り、killsには敵ID、encountersには遭遇IDを `id` として指定します。任意の `sinceQuest` は受注時との差分です。例：

```json
{"op":"gte","left":{"op":"record_count","metric":"kills","id":"moor_wolf","sinceQuest":"q121"},"right":1}
```

撃破は敵個体のHPが0になった時点で一度集計し、途中逃走・敗北でも取り消しません。遭遇勝利は全敵を倒して勝利した時だけ増えます。無戦闘の交渉・誘導・木標競技では増えません。`records` はスクリプトから書換えできません。

未受注で基準点のない差分はundefinedです。旧記録からの移行では `records.historyComplete=false` とし、過去の討伐数をゼロと断定しません。移行後に観測した数だけを集計します。再受注・追跡変更では基準点を取り直しません。

追加依頼の現在場面は `flags.quest.<id>.node`、固有の選択・発言・行動履歴も同じ名前空間へ保存します。`quests.<id>.stage/outcome` と同じ意味のフラグは作りません。反復はjump、完了済み再訪は結果の表示だけにします。outcomesの任意requiresはquest.complete時にも検査します。

旧100件の配信済みscript IDと配列順は互換用に残しています。1.3.0から本文・選択・戦闘待ちを読み込むと、その継続を最後まで進め、次の現地訪問から改稿後の経路へ接続します。

## 1.1.0の戦闘データ拡張

skills.targetはenemy / ally / self / all_enemies / all_allies。敵AI側ではenemiesがプレイヤー隊、alliesが敵側を意味します。全体対象は生存者だけです。MPは対象数によらず一回だけ消費します。

effects.typeにはdamage / heal / guard / status / cleanseに加え、drain_mp（下限0でMP減少）とrestore_mp（上限までMP回復）があります。amountに0以上の固定値、またはformulaにformulasのIDを指定します。技能のeffectsを空配列にすると、消費MPだけを伴う予告・休み行動にできます。

敵AIのtargetはself / random / weakest。self.roundは現在のラウンドです。優先度順に条件・必要MPを満たす規則を採用するので、無料のattackを最低優先度に置きます。実例はdata/enemies.jsonとdata/skills.jsonです。

map.encounterPoolは省略可能です。指定する場合は `[{"encounter":"wild_waterwheel_beaver","weight":40}]` のように正の重みを与えます。省略時は従来のencounterだけを使用します。

1.2.0の演出のJSON例・対象・数値範囲・合成方法は[EFFECT_CATALOG](EFFECT_CATALOG.md)に記載しています。audio.seは一時イベントとなり、旧セーブ内のpresentation.seは再生しません。

## 1.4.0 物語状態の専用命令

命令：story.init / 必須引数：quest / 作用：登録済みの型・初期値で受注中の物語を開始。再訪で初期化し直さない

命令：story.scene / 必須引数：quest, scene / 作用：所在と同席者・遠隔通信の条件を確認して場面を開く

命令：story.action / 必須引数：quest, action / 作用：宣言済みの前提・費用・効果・終了条件を確認し、一括確定

choice.options の `storyAction: {quest, action}` は同じ行為を選択可否の検査に使う。`stories` へ set/add で書き込むことはできない。詳細と効果一覧は [モデル仕様](SCENARIO_MODEL_V11.md) を参照。

## ダンジョンの操作と観察

`dungeon.action` と `dungeon.scene` は画面から送る操作意図です。48命令のJSON DSLに同名のopがあるという意味ではありません。スクリプトから探索技能を使う場合は job.action、現地調査は authoring/dungeon-scenes.json から既存のif・narrate・choice・setへ生成します。

観察記録は flags.dungeonNotes に保存します。dungeonsの永続状態・探索状態は読取りに利用できますが、setで直接書き換えられる領域ではありません。各部品の操作はコアの計画器を通します。詳細は[DUNGEON_ART_AND_SCENARIOS.md](DUNGEON_ART_AND_SCENARIOS.md)へ記載します。

<!-- generated:commands -->

## 実装との照合用一覧

48命令：`story.init` / `story.scene` / `story.action` / `jump` / `say` / `narrate` / `choice` / `if` / `switch` / `call` / `return` / `set` / `add` / `flag.set` / `random.set` / `random.branch` / `item.give` / `item.take` / `gold.change` / `actor.heal` / `actor.damage` / `actor.restore_mp` / `party.heal_all` / `party.join` / `party.leave` / `status.apply` / `status.remove` / `map.teleport` / `map.reveal` / `facing.set` / `object.state.set` / `event.mark_done` / `battle.start` / `quest.accept` / `quest.evidence` / `quest.complete` / `scene.background` / `audio.bgm` / `audio.se` / `rest` / `town.return` / `ending.set` / `light.refill` / `effect.play` / `screen.set` / `screen.clear` / `job.change` / `job.action`。

30式演算子：`record_count` / `eq` / `ne` / `gt` / `gte` / `lt` / `lte` / `and` / `or` / `not` / `exists` / `in` / `contains` / `add` / `sub` / `mul` / `div` / `mod` / `min` / `max` / `floor` / `ceil` / `round` / `abs` / `clamp` / `has_item` / `has_member` / `has_status` / `event_done` / `map_discovered`。

<!-- /generated:commands -->
