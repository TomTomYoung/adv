# JSON DSL 1.0 実装リファレンス

JSON_SCRIPT_SPEC.mdの設計原本を、現行エンジンが実行できる範囲へ具体化した文書です。JSONの追加・編集だけで新しい場面を記述します。任意JavaScript・YAML文字列・関数名の文字列評価は受け付けません。

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

条件なしの選択肢を一つ以上残します。条件を満たさない選択肢は無効表示になり、エンジンでも実行を拒否します。

## 値と条件式

定数はJSON値、参照は `{ "ref": "vars.completed" }` です。flags/varsはネストしたオブジェクトです。例えば `flags.region_1.open` は `flags: { region_1: { open: true } }` を参照します。ドットを含む単一キーにはしません。

- 比較: eq / ne / gt / gte / lt / lte / in / contains。leftとrightを指定します。
- 論理: and / orにはargs配列、notにはarg。
- 存在: existsにはvalue。
- 所持: has_item(item,count)、has_member(actor)、has_status(actor,status)。
- 履歴: event_done(event)、map_discovered(map,x,y)。
- 計算: add/sub/mul/div/mod/min/max/floor/ceil/round/abs/clamp。args配列です。clampは値・下限・上限、div/modは2引数。ゼロ除算はエラーです。
- 表示文字列: `{ "format": "所持金は{g}G", "values": { "g": { "ref": "gold" } } }`。

戦闘式にはsource/targetのstats等を追加します。敵AIにはselfとself.hp_ratioを追加します。chance/random_intという式は現行では未対応です。乱数が必要なシナリオはrandom.set/random.branchを使用します。

## 実装した39命令

| 命令 | 主なフィールドと動作 |
| --- | --- |
| say / narrate | text、任意でname/speaker。本文を表示し、advanceまで待機 |
| choice | options[]のid/text/commands、任意condition/requirement。chooseまで待機 |
| if | condition、then[]、else[]。両枝を配列として定義 |
| switch | value、cases[{equals,commands}]、default[] |
| call | script、任意args。新しいlocal.argsを持つ呼出 |
| return | 現在の呼出全体を終了。呼出側の次命令へ |
| set / add | target、value。vars/flags/localだけに直接書込 |
| flag.set | key、value。flags領域への書込 |
| random.set | target、min、max。閉区間の整数、エンジンのPRNGを使用 |
| random.branch | branches[{weight,commands}]。正の重みから一枝を選択 |
| item.give / item.take | item、count。上限99、不足する消費は拒否 |
| gold.change | amount。所持金は0を下回らない |
| actor.heal / actor.damage / actor.restore_mp | target、amount。targetはactor ID、参照式、またはparty |
| party.heal_all | 任意ratio。最低でも最大値×ratioへ回復、毒除去、灯の補充 |
| party.join / party.leave | actor。最大5人・最低1人を維持 |
| status.apply / status.remove | target、status。状態異常の追加・削除 |
| map.teleport | map、x、y、任意facing。実在する通行可能マスへ移動 |
| map.reveal | radius。現在位置の周囲を探索済みにする |
| facing.set | direction。north/east/south/west |
| object.state.set | map、object、state。オブジェクトの永続状態変更 |
| event.mark_done | event。イベント完了を保存 |
| battle.start | encounter、on_win[]、on_lose[]、on_escape[] |
| quest.accept | quest。受注条件を満たす依頼を受注 |
| quest.evidence | quest、key、text。重複しない観察結果を記録 |
| quest.complete | quest、outcome。結末・報酬・完了数を確定 |
| scene.background | asset。表示に渡す背景ID |
| audio.bgm / audio.se | asset。BGM変更または効果音イベント。音はユーザー操作で有効化 |
| rest | 任意cost/ratio。料金確認後、回復と毒除去・灯の補充 |
| town.return | 町へ帰還 |
| ending.set | title、text。終幕を手帳へ表示 |
| light.refill | 灯だけを満タンにする。HPや毒は変更しない |

battle.startは勝利・逃走時に、それぞれon_win/on_escapeを実行して呼出側へ戻ります。全滅時は共通の救助・町帰還を行い、敗北した呼出スタックを破棄したうえでon_loseだけを町で実行します。敗北後に元の成功処理へ戻ることはありません。3つの配列を全て定義してください。

回復のratioは「現在値へ加算」ではなく「最大値の何割以上にするか」です。通常回復はactor.healを使ってください。restでお金が足りない場合は回復せず通知し、その後のコマンドへ進みます。料金不足で別の会話にする場合はifでgoldを確認します。

## マップイベント

マップのobjectsにid/x/y/name/kind/trigger/scriptを記します。triggerはenter（移動成功時）またはinteract（足元と正面を調べる時）。condition、once、safe、blocking、initialStateを指定できます。blockする物はopen状態で通行可能になります。

各オブジェクトの実行回数は `events[mapId + "/" + objectId]`、状態は `objects[mapId + "/" + objectId]` に保存されます。これらのopaqueキーをrefのドット記法へ混ぜません。表示条件には別のflags、イベント済み判定にはevent_doneを使います。onceイベントは待機を開始する前に消化済みに記録し、保存・再開時は残りのcommandsを続けます。

イベント呼出にはlocal.args.map/objectが渡ります。アイテムのfield scriptにはlocal.args.targetが渡ります。callの引数値も式として評価されます。

## 依頼を追加する

既存q001.jsonを参考に、新しいid/title/client/brief/locations/outcomes/model/scriptsを用意し、マップに調査イベントを設け、game.files.questsへ登録します。通常のエンジンは件数を固定していません。本作の検査には納品要件として100件のassertがあるため、意図的な増量時はその期待値も更新します。

locationsのroleが証拠キーの一覧にもなります（decision以外）。クエストの獲得証拠キーはそこへ登録してください。現行ビューは本作向けに「手掛かり2つ」と表示するため、別の個数を使う作品ではビューのラベルも変更します。

作者用model.world.truthと各結末は未解決時のプレイViewModelへ出しません。ただしJSON自体はブラウザへ配信されます。これは作品データの分離であり、不正解析への秘匿機構ではありません。

## 保存互換性

待機中の継続はscript IDとcommands配列内の位置を参照します。既存scriptの配列順序を変えると古い保存位置が別命令を指す可能性があります。配信済みの作品を構造変更する際はcontentVersionを変え、旧記録を明示的に拒否するか移行コードを追加してください。文章のみの修正なら位置は変わりません。
