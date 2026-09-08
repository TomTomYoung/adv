# JSON駆動 ダンジョン探索RPGADV スクリプト仕様

策定日: 2026-09-09

状態: Draft v0.1

対象: `adv` の将来仕様

この文書は、現行の Phaser 3 ADV プロトタイプを、古典的なダンジョン探索RPGとテキストADVを融合したゲームエンジンへ発展させるためのJSONスクリプト仕様です。

基本方針は、ゲーム固有の内容と進行ロジックを可能な限りJSONへ移し、JavaScript側には汎用インタプリタ、描画、入力、音声、永続化、乱数、戦闘解決などの共通実行基盤だけを残すことです。

最終的には、シナリオ担当者がJavaScriptを編集せず、JSONファイルの追加・編集だけで、ダンジョン、会話、探索イベント、罠、宝箱、戦闘、分岐、アイテム取得、仲間加入、ショップ、休息、ボス戦、エンディングまで構築できることを目標とします。

## 1. 想定するゲーム像

想定するのは、以下の要素を持つ古典的なダンジョン探索RPGADVです。

1. 町、拠点、ダンジョンを移動する。
2. ダンジョンは方角を持つマス目または部屋接続型の空間として扱う。
3. 前後左右への移動、方向転換、調べる、使う、話すなどの探索行動を持つ。
4. 扉、鍵、隠し扉、罠、宝箱、階段、落とし穴、泉、祭壇、転送床などが存在する。
5. ランダムエンカウントと固定戦闘が存在する。
6. パーティー、HP、MP、能力値、状態異常、装備、所持品、所持金、経験値を持てる。
7. NPCとの会話や調査イベントはADV形式で文章と選択肢を表示できる。
8. フラグや変数によって同じ場所でも状況が変化する。
9. 一度しか起きないイベント、再発するイベント、確率イベントを定義できる。
10. ゲーム固有のシナリオ進行をJavaScriptへ直接書かない。

画面表現は将来変更可能とし、JSON仕様は2D立ち絵ADV、疑似3Dダンジョン、見下ろしマップのいずれにも依存しすぎないようにします。

## 2. 設計原則

### 2.1 JSONはデータであり、実行コードを含めない

JSON内にJavaScript式を書きません。

禁止例です。

```json
{
  "condition": "gameState.flags.hasKey && player.level > 5"
}
```

この方式は `eval()` が必要となり、安全性、検証性、移植性を損ないます。

条件式や計算式は後述する構造化式DSLで記述します。

### 2.2 ゲーム固有処理はJSONへ置く

例えば「銀の鍵を持っていれば北扉が開く」という仕様はJavaScriptへ書かず、JSONの条件式とコマンドで記述します。

### 2.3 JavaScriptは汎用命令だけを実装する

JavaScript側が知るのは `say`、`choice`、`set`、`battle.start`、`item.give`、`map.move` などの汎用命令です。

「古城地下2階の銀の扉」など、作品固有の名前やイベントIDをJavaScriptへ埋め込みません。

### 2.4 ID参照を基本とする

シーン、マップ、敵、アイテム、スキル、NPC、BGM、画像などは安定したIDで参照します。

表示名を参照キーにしません。

### 2.5 セーブデータとシナリオデータを分離する

JSONシナリオは静的な定義です。

扉が開いた、宝箱を取った、ボスを倒した、という状態はセーブデータ側に保持します。

## 3. 推奨ファイル構成

```text
data/
├─ game.json
├─ system.json
├─ assets.json
├─ formulas.json
├─ actors.json
├─ classes.json
├─ items.json
├─ skills.json
├─ statuses.json
├─ enemies.json
├─ encounter_tables.json
├─ shops.json
├─ maps/
│  ├─ town.json
│  ├─ dungeon_01_f1.json
│  └─ dungeon_01_f2.json
├─ scripts/
│  ├─ prologue.json
│  ├─ town_events.json
│  ├─ dungeon_01_events.json
│  └─ ending.json
└─ schemas/
   ├─ game.schema.json
   ├─ map.schema.json
   ├─ script.schema.json
   └─ database.schema.json
```

小規模作品では1ファイルへまとめても構いません。

エンジンは論理上の構造を重視し、物理ファイル分割には依存しないものとします。

## 4. game.json

`game.json` は作品全体の入口です。

```json
{
  "schema_version": "0.1",
  "game_id": "old_dungeon_demo",
  "title": "古城の地下迷宮",
  "language": "ja",
  "start": {
    "map": "town",
    "position": { "x": 4, "y": 7, "facing": "north" },
    "script": "prologue.start"
  },
  "files": {
    "system": "system.json",
    "assets": "assets.json",
    "formulas": "formulas.json",
    "actors": "actors.json",
    "classes": "classes.json",
    "items": "items.json",
    "skills": "skills.json",
    "statuses": "statuses.json",
    "enemies": "enemies.json",
    "encounters": "encounter_tables.json",
    "shops": "shops.json",
    "maps": [
      "maps/town.json",
      "maps/dungeon_01_f1.json",
      "maps/dungeon_01_f2.json"
    ],
    "scripts": [
      "scripts/prologue.json",
      "scripts/town_events.json",
      "scripts/dungeon_01_events.json",
      "scripts/ending.json"
    ]
  },
  "initial_state": {
    "flags": {},
    "vars": {
      "story.chapter": 0
    },
    "party": ["hero"],
    "gold": 100,
    "inventory": [
      { "item": "potion", "count": 2 }
    ]
  }
}
```

## 5. 状態モデル

ゲーム中に変化する状態は、JSONスクリプトから統一パスで参照できるようにします。

主要な状態領域は以下です。

1. `flags`

   真偽値中心の進行状態です。

2. `vars`

   数値、文字列、IDなどの一般変数です。

3. `party`

   パーティーメンバーと各キャラクター状態です。

4. `inventory`

   所持品と個数です。

5. `equipment`

   装備状態です。

6. `map_state`

   扉、宝箱、罠、発見済みマスなどの状態です。

7. `event_state`

   イベント実行回数、クールダウン、一回限りイベントの消化状態です。

8. `quest_state`

   任意のクエスト進行状態です。

9. `temp`

   セーブ対象外の一時変数です。

10. `local`

   現在実行中のスクリプト呼び出しに限定されるローカル変数です。

例です。

```json
{
  "flags": {
    "story.met_old_man": true,
    "dungeon1.boss_defeated": false
  },
  "vars": {
    "story.chapter": 2,
    "dungeon1.water_level": 1
  }
}
```

## 6. 値の参照

固定値はJSONの通常値として記述します。

状態値を参照する場合は `ref` を使います。

```json
{ "ref": "vars.story.chapter" }
```

```json
{ "ref": "flags.dungeon1.boss_defeated" }
```

```json
{ "ref": "party.hero.hp" }
```

```json
{ "ref": "local.selected_item" }
```

文字列補間は専用の `format` を使います。

```json
{
  "format": "現在の所持金は{gold}Gです。",
  "values": {
    "gold": { "ref": "gold" }
  }
}
```

## 7. 条件式DSL

条件判定は構造化されたJSON式で表現します。

### 7.1 比較

```json
{
  "op": "eq",
  "left": { "ref": "vars.story.chapter" },
  "right": 3
}
```

利用可能な基本比較演算子は以下とします。

```text
eq
ne
gt
gte
lt
lte
in
contains
exists
```

### 7.2 論理演算

```json
{
  "op": "and",
  "args": [
    { "op": "eq", "left": { "ref": "flags.got_silver_key" }, "right": true },
    { "op": "gte", "left": { "ref": "vars.story.chapter" }, "right": 2 }
  ]
}
```

```text
and
or
not
```

を標準とします。

### 7.3 ゲーム状態向け条件

頻出条件は可読性のため専用演算子を持てます。

```json
{ "op": "has_item", "item": "silver_key", "count": 1 }
```

```json
{ "op": "has_member", "actor": "warrior_anna" }
```

```json
{ "op": "has_status", "actor": "hero", "status": "poison" }
```

```json
{ "op": "event_done", "event": "dungeon1.old_man_event" }
```

```json
{ "op": "map_discovered", "map": "dungeon_01_f1", "x": 8, "y": 3 }
```

### 7.4 ランダム条件

```json
{
  "op": "chance",
  "percent": 25
}
```

乱数はエンジン管理のPRNGを使用し、テスト時にはseed固定を可能にします。

## 8. 計算式DSL

ゲーム内計算も任意JavaScriptではなく式ツリーとして表現できます。

```json
{
  "op": "add",
  "args": [
    { "ref": "party.hero.stats.str" },
    5
  ]
}
```

基本演算は以下を想定します。

```text
add
sub
mul
div
mod
min
max
floor
ceil
round
abs
clamp
random_int
```

例えば物理攻撃力をJSON側で定義する場合です。

```json
{
  "id": "physical_attack",
  "formula": {
    "op": "add",
    "args": [
      { "ref": "source.stats.str" },
      { "ref": "source.equipment.weapon.attack" }
    ]
  }
}
```

複雑な式については名前付きformulaを定義し、各スキルや戦闘処理から参照できるようにします。

## 9. スクリプトの基本構造

スクリプトはコマンド列として記述します。

```json
{
  "scripts": {
    "prologue.start": {
      "commands": [
        {
          "op": "scene.background",
          "asset": "mansion_exterior"
        },
        {
          "op": "audio.bgm",
          "asset": "bgm_title",
          "fade_ms": 800
        },
        {
          "op": "say",
          "text": "夕暮れの古城が、谷の向こうに沈んでいた。"
        },
        {
          "op": "choice",
          "options": [
            {
              "text": "城へ向かう",
              "commands": [
                {
                  "op": "map.teleport",
                  "map": "dungeon_01_f1",
                  "x": 2,
                  "y": 9,
                  "facing": "north"
                }
              ]
            },
            {
              "text": "町へ戻る",
              "commands": [
                {
                  "op": "map.teleport",
                  "map": "town",
                  "x": 4,
                  "y": 7,
                  "facing": "south"
                }
              ]
            }
          ]
        }
      ]
    }
  }
}
```

すべてのコマンドは最低限 `op` を持ちます。

## 10. スクリプト実行モデル

スクリプトインタプリタはコマンドを上から順に実行します。

命令は概念上、即時命令と待機命令に分かれます。

即時命令の例です。

```text
set
add
flag.set
item.give
gold.change
```

待機命令の例です。

```text
say
choice
battle.start
shop.open
wait
scene.fade
```

待機命令はユーザー入力やアニメーション完了などを待ってから次へ進みます。

スクリプト呼び出しにはスタックを持ち、`call` と `return` を使用できます。

## 11. 基本フロー命令

### 11.1 say

文章または台詞を表示します。

```json
{
  "op": "say",
  "speaker": "old_man",
  "name": "老人",
  "text": "地下へ行くなら、銀の鍵を探すことだ。",
  "portrait": "old_man_normal"
}
```

`speaker` はキャラクターIDです。

`name` は表示名の上書き用で、省略時はキャラクターデータから取得します。

### 11.2 narrate

地の文を表示します。

```json
{
  "op": "narrate",
  "text": "湿った石壁の向こうから、水の滴る音が聞こえる。"
}
```

### 11.3 choice

選択肢を表示します。

```json
{
  "op": "choice",
  "options": [
    {
      "id": "open",
      "text": "扉を開ける",
      "condition": { "op": "has_item", "item": "silver_key", "count": 1 },
      "commands": [
        { "op": "flag.set", "key": "dungeon1.silver_door_open", "value": true },
        { "op": "say", "text": "銀の鍵が回り、重い扉が開いた。" }
      ]
    },
    {
      "id": "leave",
      "text": "立ち去る",
      "commands": []
    }
  ]
}
```

条件を満たさない選択肢については、作品設定で `hidden` または `disabled` を選べるようにします。

### 11.4 if

```json
{
  "op": "if",
  "condition": { "op": "has_item", "item": "torch", "count": 1 },
  "then": [
    { "op": "say", "text": "松明の光が奥の壁画を照らした。" }
  ],
  "else": [
    { "op": "say", "text": "暗くて何も見えない。" }
  ]
}
```

### 11.5 switch

数値や状態で多分岐する場合に使います。

```json
{
  "op": "switch",
  "value": { "ref": "vars.story.chapter" },
  "cases": [
    { "equals": 1, "commands": [{ "op": "say", "text": "まだ門は閉じている。" }] },
    { "equals": 2, "commands": [{ "op": "say", "text": "門番がこちらを見ている。" }] }
  ],
  "default": [
    { "op": "say", "text": "門は開放されている。" }
  ]
}
```

### 11.6 call

```json
{
  "op": "call",
  "script": "common.heal_fountain",
  "args": {
    "power": 50
  }
}
```

### 11.7 return

```json
{ "op": "return" }
```

### 11.8 jump

スクリプト内ラベルまたは別スクリプトへ制御を移します。

多用すると追跡困難になるため、基本は `call`、`if`、`choice` を優先します。

### 11.9 wait

```json
{
  "op": "wait",
  "ms": 500
}
```

## 12. 状態変更命令

### 12.1 set

```json
{
  "op": "set",
  "target": "vars.dungeon1.water_level",
  "value": 2
}
```

### 12.2 add

```json
{
  "op": "add",
  "target": "vars.story.reputation",
  "value": 1
}
```

### 12.3 flag.set

```json
{
  "op": "flag.set",
  "key": "story.met_old_man",
  "value": true
}
```

### 12.4 random.set

```json
{
  "op": "random.set",
  "target": "local.roll",
  "min": 1,
  "max": 100
}
```

### 12.5 random.branch

```json
{
  "op": "random.branch",
  "branches": [
    {
      "weight": 60,
      "commands": [{ "op": "say", "text": "何も起こらなかった。" }]
    },
    {
      "weight": 30,
      "commands": [{ "op": "item.give", "item": "herb", "count": 1 }]
    },
    {
      "weight": 10,
      "commands": [{ "op": "battle.start", "encounter": "slime_pair" }]
    }
  ]
}
```

## 13. 表示・演出命令

作品固有演出も可能な範囲でJSONから指定します。

```text
scene.background
scene.character.show
scene.character.hide
scene.character.move
scene.clear
scene.fade
scene.flash
scene.shake
scene.transition
ui.window.show
ui.window.hide
audio.bgm
audio.bgm.stop
audio.se
```

例です。

```json
{
  "op": "scene.fade",
  "to": "black",
  "duration_ms": 600
}
```

```json
{
  "op": "audio.se",
  "asset": "se_door_heavy"
}
```

演出命令をスキップ可能にするかどうかは命令ごとに指定可能とします。

## 14. ダンジョンマップ仕様

ダンジョンは基本的に方眼グリッドを標準とします。

必要に応じて部屋接続型の `graph` マップも将来追加できる設計とします。

```json
{
  "id": "dungeon_01_f1",
  "name": "古城地下1階",
  "type": "grid",
  "width": 12,
  "height": 12,
  "default_tile": "wall",
  "start_positions": {
    "entrance": { "x": 2, "y": 10, "facing": "north" }
  },
  "tiles": [
    ["wall", "wall", "wall", "wall"],
    ["wall", "floor", "floor", "wall"],
    ["wall", "floor", "floor", "wall"],
    ["wall", "wall", "wall", "wall"]
  ],
  "objects": [],
  "events": [],
  "encounter_table": "dungeon_01_f1_normal"
}
```

大規模マップでは全セルをオブジェクト化せず、タイル本体とイベントを分離します。

## 15. タイル定義

タイル種別は `system.json` またはマップ内ローカル定義で登録します。

```json
{
  "tile_types": {
    "wall": {
      "walkable": false,
      "opaque": true
    },
    "floor": {
      "walkable": true,
      "opaque": false
    },
    "water": {
      "walkable": false,
      "opaque": false
    },
    "damage_floor": {
      "walkable": true,
      "opaque": false,
      "on_enter": "common.damage_floor"
    }
  }
}
```

## 16. マップオブジェクト

扉、宝箱、NPC、レバーなど、状態を持つものは `objects` として定義します。

```json
{
  "id": "silver_door",
  "type": "door",
  "x": 5,
  "y": 3,
  "facing": "north",
  "state_key": "dungeon1.silver_door",
  "initial_state": "locked",
  "states": {
    "locked": {
      "passable": false,
      "interact_script": "dungeon1.silver_door_locked"
    },
    "open": {
      "passable": true,
      "sprite": "door_open"
    }
  }
}
```

オブジェクト状態はマップJSON自体を書き換えず、セーブデータの `map_state` に保存します。

## 17. イベントトリガー

イベントは「いつ起きるか」と「何を実行するか」を分離します。

標準トリガー候補は以下です。

```text
on_map_enter
on_map_leave
on_enter
on_leave
on_face
on_interact
on_examine
on_use_item
on_turn
on_step
on_battle_win
on_battle_lose
on_rest
```

例です。

```json
{
  "id": "first_steps_message",
  "trigger": {
    "type": "on_enter",
    "x": 2,
    "y": 8
  },
  "once": true,
  "condition": {
    "op": "eq",
    "left": { "ref": "flags.dungeon1.first_message" },
    "right": false
  },
  "script": "dungeon1.first_steps"
}
```

## 18. イベント再実行制御

イベントには再実行方針を指定できます。

```json
{
  "once": true
}
```

```json
{
  "max_runs": 3
}
```

```json
{
  "cooldown_steps": 20
}
```

```json
{
  "cooldown_seconds": 60
}
```

永続イベント回数は `event_state` に記録します。

## 19. 移動命令

### 19.1 map.teleport

```json
{
  "op": "map.teleport",
  "map": "dungeon_01_f2",
  "x": 3,
  "y": 9,
  "facing": "east"
}
```

### 19.2 map.move

強制移動に使います。

```json
{
  "op": "map.move",
  "direction": "forward",
  "steps": 2,
  "forced": true
}
```

### 19.3 map.reveal

```json
{
  "op": "map.reveal",
  "map": "dungeon_01_f1",
  "area": {
    "x": 5,
    "y": 5,
    "radius": 2
  }
}
```

### 19.4 facing.set

```json
{
  "op": "facing.set",
  "direction": "south"
}
```

## 20. 古典ダンジョン向け標準ギミック

以下は専用JavaScriptをシナリオごとに書かず構築できることを必須目標とします。

1. 通常扉
2. 鍵付き扉
3. 一方通行扉
4. 隠し扉
5. 開閉レバー
6. 宝箱
7. 鍵付き宝箱
8. 罠付き宝箱
9. 落とし穴
10. ダメージ床
11. 毒沼
12. 回復の泉
13. MP回復地点
14. セーブ地点
15. 階段
16. 転送床
17. 回転床
18. 強制移動床
19. 暗闇
20. 侵入不可領域
21. 固定敵
22. ボス部屋
23. ランダムエンカウント禁止区域
24. 隠しアイテム
25. 調査でのみ発見できるスイッチ

これらは特殊ケース専用コードではなく、オブジェクト、イベント、条件、コマンドの組み合わせで表現することを原則とします。

## 21. 鍵付き扉の完全例

```json
{
  "scripts": {
    "dungeon1.silver_door_locked": {
      "commands": [
        {
          "op": "if",
          "condition": { "op": "has_item", "item": "silver_key", "count": 1 },
          "then": [
            {
              "op": "choice",
              "options": [
                {
                  "text": "銀の鍵を使う",
                  "commands": [
                    { "op": "audio.se", "asset": "se_key" },
                    { "op": "object.state.set", "object": "silver_door", "state": "open" },
                    { "op": "flag.set", "key": "dungeon1.silver_door_open", "value": true },
                    { "op": "say", "text": "錠が外れた。" }
                  ]
                },
                {
                  "text": "やめる",
                  "commands": []
                }
              ]
            }
          ],
          "else": [
            { "op": "say", "text": "銀色の鍵穴がある。今は開けられそうにない。" }
          ]
        }
      ]
    }
  }
}
```

## 22. 宝箱仕様

宝箱はマップオブジェクトとして状態を持ちます。

```json
{
  "id": "chest_01",
  "type": "chest",
  "x": 8,
  "y": 4,
  "state_key": "dungeon1.chest_01",
  "initial_state": "closed",
  "loot": {
    "items": [
      { "item": "potion", "count": 2 },
      { "item": "silver_key", "count": 1 }
    ],
    "gold": 50
  },
  "trap": "poison_needle"
}
```

宝箱開封時は以下のような標準処理をエンジン側の汎用 `chest.open` 命令で行えるようにします。

```json
{
  "op": "chest.open",
  "object": "chest_01"
}
```

必要なら `before_open_script`、`after_open_script` を設定して固有演出を追加できます。

## 23. 罠仕様

```json
{
  "id": "poison_needle",
  "detect": {
    "formula": "trap_detection",
    "difficulty": 12
  },
  "disarm": {
    "formula": "trap_disarm",
    "difficulty": 15
  },
  "on_trigger": [
    { "op": "audio.se", "asset": "se_needle" },
    { "op": "status.apply", "target": "party.random_alive", "status": "poison" }
  ]
}
```

罠の発見判定や解除判定はformula経由でデータ化します。

## 24. アイテム定義

```json
{
  "id": "silver_key",
  "name": "銀の鍵",
  "type": "key_item",
  "stackable": false,
  "description": "古城地下で使われていた細身の鍵。",
  "use": {
    "field": false,
    "battle": false
  }
}
```

回復薬の例です。

```json
{
  "id": "potion",
  "name": "傷薬",
  "type": "consumable",
  "stackable": true,
  "max_stack": 99,
  "use": {
    "field": true,
    "battle": true,
    "target": "ally",
    "commands": [
      { "op": "actor.heal", "target": { "ref": "context.target" }, "amount": 30 }
    ]
  }
}
```

## 25. 所持品命令

```json
{ "op": "item.give", "item": "potion", "count": 2 }
```

```json
{ "op": "item.take", "item": "silver_key", "count": 1 }
```

```json
{ "op": "gold.change", "amount": 100 }
```

取得時の標準メッセージはシステム設定で自動表示可能とし、必要なら `silent: true` で抑制します。

## 26. キャラクターとパーティー

キャラクターはデータベース定義とランタイム状態を分離します。

```json
{
  "id": "hero",
  "name": "冒険者",
  "class": "fighter",
  "level": 1,
  "base_stats": {
    "hp": 30,
    "mp": 5,
    "str": 8,
    "vit": 7,
    "agi": 6,
    "int": 4,
    "luck": 5
  },
  "skills": ["basic_attack"]
}
```

パーティー操作命令です。

```json
{ "op": "party.join", "actor": "warrior_anna" }
```

```json
{ "op": "party.leave", "actor": "warrior_anna" }
```

```json
{ "op": "party.heal_all" }
```

## 27. 能力値と派生値

能力値名をエンジンへ固定しすぎないことを推奨します。

`system.json` でゲームが使用する能力値を登録し、派生値はformulaで計算します。

```json
{
  "stats": ["hp", "mp", "str", "vit", "agi", "int", "luck"],
  "derived_stats": {
    "attack": "physical_attack",
    "defense": "physical_defense",
    "accuracy": "physical_accuracy",
    "evasion": "physical_evasion"
  }
}
```

## 28. 状態異常

```json
{
  "id": "poison",
  "name": "毒",
  "duration": "persistent",
  "on_turn_end": [
    {
      "op": "actor.damage",
      "target": { "ref": "context.owner" },
      "amount": {
        "op": "max",
        "args": [1, { "op": "floor", "args": [{ "op": "div", "args": [{ "ref": "context.owner.max_hp" }, 10] }] }]
      }
    }
  ]
}
```

状態異常の付与と解除もコマンド化します。

```json
{ "op": "status.apply", "target": "hero", "status": "poison" }
```

```json
{ "op": "status.remove", "target": "hero", "status": "poison" }
```

## 29. 敵定義

```json
{
  "id": "goblin",
  "name": "ゴブリン",
  "level": 2,
  "stats": {
    "hp": 18,
    "mp": 0,
    "str": 6,
    "vit": 4,
    "agi": 5
  },
  "skills": ["basic_attack"],
  "rewards": {
    "exp": 8,
    "gold": 6,
    "drops": [
      { "item": "herb", "chance": 20, "count": 1 }
    ]
  }
}
```

## 30. 敵AI

敵AIも単純なルールベースでJSON記述可能とします。

```json
{
  "ai": [
    {
      "priority": 100,
      "condition": {
        "op": "lt",
        "left": { "ref": "self.hp_ratio" },
        "right": 0.25
      },
      "action": { "skill": "heal_self", "target": "self" }
    },
    {
      "priority": 10,
      "action": { "skill": "basic_attack", "target": "random_alive_enemy" }
    }
  ]
}
```

## 31. スキル定義

```json
{
  "id": "fireball",
  "name": "火球",
  "cost": { "mp": 4 },
  "target": "single_enemy",
  "accuracy": 95,
  "effects": [
    {
      "type": "damage",
      "element": "fire",
      "formula": "magic_damage_small"
    }
  ]
}
```

スキル固有の複雑な演出や追加効果は `commands` を併用できます。

## 32. 戦闘開始

固定戦闘はスクリプトから開始できます。

```json
{
  "op": "battle.start",
  "enemies": [
    { "enemy": "goblin", "count": 2 },
    { "enemy": "goblin_mage", "count": 1 }
  ],
  "can_escape": true,
  "on_win": [
    { "op": "flag.set", "key": "dungeon1.guard_defeated", "value": true },
    { "op": "say", "text": "門を守っていた魔物は倒れた。" }
  ],
  "on_lose": [
    { "op": "call", "script": "common.game_over" }
  ],
  "on_escape": [
    { "op": "say", "text": "一行は通路まで退いた。" }
  ]
}
```

`battle.start` は戦闘終了までスクリプトを待機します。

## 33. エンカウントテーブル

```json
{
  "id": "dungeon_01_f1_normal",
  "step_rate": 0.08,
  "minimum_safe_steps": 3,
  "entries": [
    {
      "weight": 50,
      "enemies": [{ "enemy": "goblin", "count": 2 }]
    },
    {
      "weight": 30,
      "enemies": [{ "enemy": "bat", "count": 3 }]
    },
    {
      "weight": 20,
      "enemies": [
        { "enemy": "goblin", "count": 1 },
        { "enemy": "bat", "count": 2 }
      ]
    }
  ]
}
```

エンカウント率はマップ、区域、状態、装備、スキルから補正可能にします。

## 34. 戦闘イベントフック

ボス戦や特殊戦闘のため、以下のイベントフックを想定します。

```text
on_battle_start
on_round_start
on_round_end
on_actor_turn_start
on_actor_turn_end
on_damage
on_hp_threshold
on_enemy_defeated
on_battle_win
on_battle_lose
```

例えばボスHP半減時の台詞です。

```json
{
  "trigger": "on_hp_threshold",
  "threshold": 0.5,
  "once": true,
  "commands": [
    { "op": "say", "speaker": "boss_knight", "text": "まだだ……まだ終わらぬ。" },
    { "op": "status.apply", "target": "boss_knight", "status": "rage" }
  ]
}
```

## 35. ショップ

ショップ内容もJSON定義します。

```json
{
  "id": "town_item_shop",
  "name": "雑貨屋",
  "buy": [
    { "item": "potion", "price": 20 },
    { "item": "antidote", "price": 15 },
    { "item": "torch", "price": 10 }
  ],
  "sell_rate": 0.5
}
```

```json
{
  "op": "shop.open",
  "shop": "town_item_shop"
}
```

## 36. 宿屋・休息

```json
{
  "op": "rest",
  "cost": 30,
  "restore": {
    "hp": "full",
    "mp": "full"
  },
  "remove_statuses": ["poison", "blind"],
  "advance_time": 8
}
```

## 37. 調べるコマンド

プレイヤーの探索行動として `examine` を標準化します。

プレイヤーが「調べる」を選ぶと、現在位置、向いている方向、対象オブジェクトに対して `on_examine` を解決します。

```json
{
  "id": "wall_inscription",
  "trigger": {
    "type": "on_examine",
    "x": 6,
    "y": 5,
    "facing": "east"
  },
  "script": "dungeon1.read_inscription"
}
```

これにより、通常移動では見つからない隠し要素を作れます。

## 38. アイテム使用による探索イベント

```json
{
  "id": "use_rope_at_pit",
  "trigger": {
    "type": "on_use_item",
    "item": "rope",
    "x": 4,
    "y": 6
  },
  "script": "dungeon1.cross_pit_with_rope"
}
```

イベント側でアイテムを消費するかどうかを決定します。

## 39. 隠し扉

隠し扉は最初からマップ上に存在するが、未発見状態では壁として扱います。

```json
{
  "id": "secret_door_01",
  "type": "secret_door",
  "x": 7,
  "y": 2,
  "facing": "west",
  "discover": {
    "mode": "examine",
    "difficulty": 10,
    "formula": "secret_detection"
  },
  "state_key": "dungeon1.secret_door_01"
}
```

発見後は `map_state` に記録し、再訪時も見えるようにします。

## 40. 階段と転送

```json
{
  "id": "stairs_down_01",
  "type": "stairs",
  "x": 10,
  "y": 2,
  "target": {
    "map": "dungeon_01_f2",
    "x": 10,
    "y": 9,
    "facing": "south"
  }
}
```

転送床も同じ座標遷移プリミティブを使います。

## 41. NPC

```json
{
  "id": "old_man",
  "type": "npc",
  "x": 3,
  "y": 4,
  "portrait": "old_man_normal",
  "interact_script": "town.old_man_talk"
}
```

NPCの会話内容はNPCオブジェクト内に大量記述せず、原則としてscriptへ分離します。

## 42. 会話進行例

```json
{
  "scripts": {
    "town.old_man_talk": {
      "commands": [
        {
          "op": "if",
          "condition": { "op": "event_done", "event": "town.old_man_first" },
          "then": [
            { "op": "say", "speaker": "old_man", "text": "地下の鍵は見つかったかね。" }
          ],
          "else": [
            { "op": "say", "speaker": "old_man", "text": "あの古城へ行くつもりか。" },
            { "op": "say", "speaker": "old_man", "text": "ならば地下の銀の扉を覚えておけ。" },
            { "op": "event.mark_done", "event": "town.old_man_first" }
          ]
        }
      ]
    }
  }
}
```

## 43. クエスト

クエストシステムは必須ではありませんが、汎用状態管理の上に定義可能とします。

```json
{
  "id": "find_missing_scout",
  "name": "消えた斥候",
  "stages": {
    "not_started": {},
    "accepted": {},
    "found": {},
    "completed": {}
  }
}
```

```json
{
  "op": "quest.set",
  "quest": "find_missing_scout",
  "stage": "accepted"
}
```

## 44. 時間

作品が必要とする場合のみゲーム内時間を有効化します。

```json
{
  "time": {
    "enabled": true,
    "minutes_per_step": 5,
    "start": {
      "day": 1,
      "hour": 8,
      "minute": 0
    }
  }
}
```

時間条件も通常の条件式で参照できます。

## 45. 共通スクリプト

頻出処理は共通スクリプト化します。

例です。

```text
common.game_over
common.heal_fountain
common.open_locked_door
common.poison_floor
common.return_to_town
common.rest_party
```

引数付き `call` によって、似たイベントのコピーを減らします。

## 46. スクリプト引数

```json
{
  "op": "call",
  "script": "common.give_treasure",
  "args": {
    "item": "potion",
    "count": 3
  }
}
```

呼び出し先では以下のように参照します。

```json
{ "ref": "local.args.item" }
```

## 47. コンテキスト

イベント実行時、エンジンは読み取り専用の `context` を提供します。

例です。

```text
context.map
context.x
context.y
context.facing
context.object
context.actor
context.target
context.item
context.battle
context.trigger
```

これにより同じ共通スクリプトを複数箇所で利用できます。

## 48. アセット管理

シナリオJSONはファイルパスを直接持つより、アセットIDを参照する方式を推奨します。

```json
{
  "images": {
    "mansion_exterior": "assets/images/mansion_exterior.jpg",
    "old_man_normal": "assets/characters/old_man_normal.png"
  },
  "bgm": {
    "bgm_title": "assets/audio/bgm_title.mp3"
  },
  "se": {
    "se_key": "assets/audio/se_key.mp3"
  }
}
```

ファイル配置を変更してもシナリオJSONを修正せずに済みます。

## 49. セーブ仕様

セーブデータにはシナリオ定義そのものを保存せず、変化した状態を保存します。

```json
{
  "save_version": 1,
  "game_id": "old_dungeon_demo",
  "content_version": "0.1.0",
  "timestamp": "2026-09-09T12:00:00Z",
  "location": {
    "map": "dungeon_01_f1",
    "x": 5,
    "y": 7,
    "facing": "north"
  },
  "flags": {},
  "vars": {},
  "party": {},
  "inventory": {},
  "equipment": {},
  "map_state": {},
  "event_state": {},
  "quest_state": {}
}
```

一時UI状態、現在表示中の文字数、Phaserオブジェクトなどは保存しません。

## 50. JSON Schema

全主要JSONにはJSON Schemaを用意します。

最低限、以下を静的検証します。

1. 必須キーの欠落
2. 型不一致
3. 未知の `op`
4. 不正な方向値
5. 負の個数などの明白な不正値
6. 無効なenum

JSON Schemaだけでは確認できない参照整合性は別のvalidatorで検証します。

## 51. 参照整合性validator

起動前または開発時に以下を検査します。

1. 存在しないscript ID参照
2. 存在しないmap ID参照
3. 存在しないitem ID参照
4. 存在しないenemy ID参照
5. 存在しないactor ID参照
6. 存在しないasset ID参照
7. マップ範囲外座標
8. 同一スコープ内のID重複
9. 到達不能スクリプト候補
10. 永久ループの疑いがあるjump
11. 存在しないobject参照
12. 無効なformula参照

開発モードではエラーを一覧表示し、ゲーム開始前に発見できることを目標とします。

## 52. エラー処理

開発モードでは未知命令や参照切れを原則としてfatal errorにします。

本番モードでは、可能な場合のみ安全なフォールバックを行い、必ずログへ残します。

シナリオ上の重大な参照切れを黙って無視しないことを原則とします。

## 53. バージョニング

JSON仕様には `schema_version` を持たせます。

```json
{
  "schema_version": "0.1"
}
```

互換性を壊す変更ではmajor相当を上げます。

セーブデータには別に `save_version` を持たせ、将来migration可能にします。

## 54. 拡張命令

標準命令だけで足りない場合、エンジンへプラグイン命令を登録できる余地を残します。

```json
{
  "op": "plugin.weather.set",
  "weather": "storm"
}
```

ただし作品固有イベントのたびに独自命令を増やすことは禁止方針とします。

まず既存の条件、状態変更、演出、共通scriptの組み合わせで実現できないか検討します。

## 55. JSONで記述しない領域

可能な限りJSON化しますが、以下はエンジン側JavaScriptの責務とします。

1. Phaser初期化
2. DOMとの接続
3. キーボード、マウス、ゲームパッド入力
4. 描画実体
5. 音声再生実体
6. JSONロード
7. JSON Schema validation実行
8. スクリプトインタプリタ
9. セーブストレージ入出力
10. PRNG実体
11. 戦闘のターン進行器
12. 経路判定と衝突判定
13. アニメーション更新
14. パフォーマンス管理

ただしこれらの設定値やゲーム固有データは可能な限りJSONから受け取ります。

## 56. 現行仕様からの移行

現行 `gameScenario.scenes` は、最初の移行段階では次のように対応できます。

```text
scene_id      -> script ID
text          -> say または narrate
bg_image      -> scene.background
character     -> scene.character.show
bgm           -> audio.bgm
se            -> audio.se
choices       -> choice
next_scene    -> call / map.teleport / script遷移
set_flag      -> flag.set
condition     -> 構造化条件DSL
```

現行の `eval(condition)` は廃止します。

## 57. 最小実装段階

最初から全命令を実装する必要はありません。

第1段階では以下を優先します。

1. 外部JSONロード
2. script registry
3. `say`
4. `choice`
5. `if`
6. `set`
7. `flag.set`
8. `call`
9. `return`
10. `scene.background`
11. `audio.bgm`
12. `audio.se`
13. 安全な条件DSL
14. schema validation
15. 参照整合性validator

第2段階でダンジョン探索を追加します。

1. grid map
2. positionとfacing
3. 移動
4. 衝突
5. map event
6. object state
7. 扉
8. 宝箱
9. 階段
10. 調べる
11. ランダムエンカウント

第3段階でRPGシステムを追加します。

1. actor
2. party
3. item
4. equipment
5. skill
6. enemy
7. battle
8. status
9. formula
10. shop
11. rest

## 58. 最小完成サンプルの受け入れ条件

JSON駆動化の最初の完成条件として、JavaScriptへ作品固有イベントを書かず、JSONだけで以下を作れる状態を目標とします。

1. 町からダンジョンへ入る。
2. 一本道と分岐を歩ける。
3. 壁では進めない。
4. 扉を調べられる。
5. 鍵を宝箱から入手できる。
6. 鍵を持っていると施錠扉を開けられる。
7. 開けた扉の状態が保存される。
8. 罠が発動する。
9. ランダムエンカウントが起きる。
10. 固定敵と戦える。
11. 戦闘勝利でフラグが立つ。
12. フラグによってNPC会話が変化する。
13. 階段で地下2階へ移動できる。
14. ボスを倒すと帰還イベントが起きる。
15. エンディングへ到達できる。
16. セーブして再読込後も状態が維持される。

ここまでをJSONだけで記述できれば、本仕様の核は成立したとみなします。

## 59. 推奨実装構造

JavaScript側は少なくとも次の責務へ分離することを推奨します。

```text
src/
├─ core/
│  ├─ GameState.js
│  ├─ DataRegistry.js
│  ├─ SaveManager.js
│  └─ Random.js
├─ script/
│  ├─ ScriptRunner.js
│  ├─ CommandRegistry.js
│  ├─ ConditionEvaluator.js
│  └─ ExpressionEvaluator.js
├─ dungeon/
│  ├─ MapManager.js
│  ├─ MovementController.js
│  ├─ EventResolver.js
│  └─ ObjectManager.js
├─ battle/
│  ├─ BattleManager.js
│  ├─ ActionResolver.js
│  └─ EnemyAI.js
├─ ui/
│  ├─ AdvWindow.js
│  ├─ ChoiceWindow.js
│  ├─ DungeonView.js
│  └─ Menu.js
└─ main.js
```

`CommandRegistry` は `op` 文字列と汎用ハンドラの対応だけを持ちます。

## 60. 最終目標

本仕様の最終目標は、「エンジンを作る人」と「ゲームを作る人」を分離することです。

エンジン担当は汎用命令を実装します。

ゲーム制作担当はJSONで世界、ダンジョン、敵、アイテム、イベント、文章、分岐、戦闘、報酬を記述します。

新しいダンジョンやシナリオを追加するたびにJavaScript本体を修正する状態を避けます。

理想状態では、作品の大部分は `data/` 以下のJSONと `assets/` 以下の素材だけで成立し、`src/` は複数作品で再利用できる共通ADV/RPGエンジンになります。
