# 戦闘・隊編成

2026-10-15（4迷宮への拡張）: [4迷宮の敵配置・武器・購入技能](FOUR_DUNGEON_COMBAT_DESIGN.md)。24深層種、16編成、12主、9武器種の4段階更新、32技能と30職の許可候補をまとめました。[80階とLv30までの成長・収支](../dungeons/FOUR_DUNGEON_PROGRESSION_DESIGN.md)に対応する試遊前の設計です。共通機能と12購入技能の実装範囲は[初回実装](../dungeons/EXPEDITION_IMPLEMENTATION.md)を参照し、36武器・深層敵・主・残り13購入技能は未実装です。

2026-10-15: [篝火と全体成長の設計案](../dungeons/KAGARIBI_PROGRESSION_DESIGN.md)。10FでLv15〜16、以後の緩やかな人物Lv成長、敵の宝石ドロップと人物別の技能購入、依頼別の報酬差を記した初案です。設計当時の記録です。宝石と人物別12技能の購入は[1.26.0で実装](../dungeons/EXPEDITION_IMPLEMENTATION.md)し、篝火1〜10F・浅層遭遇・結末別報酬は[1.27.0で接続](../dungeons/KAGARIBI_TEN_FLOORS.md)しました。新EXP曲線と別経路・編成の実戦調整は後続です。

[前中後衛の戦闘とHTMLテスター](FRONTLINE_BATTLE.md)：前後レンジ、4方向の範囲、同時／逐次・反応、反復前進、戦闘不能者の退避、味方の行数変更、排除・ノックバックと本体の重なり。

[Classic/Grid戦闘と開始陣形](GRID_BATTLE.md)：方式切替、陣形編集、射程・範囲・移動、奥行き表示と保存。

現行確認日: 2026-10-23。作品版1.33.0。初版の確認は2026-09-25、作品版1.20.0です。[文書全体へ戻る](../README.md)。

[PROGRESSION_AND_REWARDS.md](PROGRESSION_AND_REWARDS.md)：個別経験値、勝利リザルト、魔物別宝箱、戦闘外の回復。

[STATUS_EFFECTS.md](STATUS_EFFECTS.md)：毒・呪い・濡れ・まひ・くらやみ・各封印・こんらん等の付与、自然回復、行動制限、持ち越しと保存。

[STATUS_CATALOG.md](STATUS_CATALOG.md)：ねむり・必中・鈍重・狂暴化・暴発・クリティカル関連を含む共通管理23種と、防御・スタンのLv1〜Lv3。

[BUFF_CATALOG.md](BUFF_CATALOG.md)：戦闘中の強化補正と付与元。

[DEBUFF_CATALOG.md](DEBUFF_CATALOG.md)：戦闘中の弱体補正と付与元。

[JOB_SYSTEM.md](JOB_SYSTEM.md)：30職、技能・成長・装備・探索特技。

[SCOUT_SKILLS.md](SCOUT_SKILLS.md)：斥候の罠解除・罠発見・奇襲・索敵・哨戒・迷彩・偵察の採用仕様。

[SKILL_LEVELS.md](SKILL_LEVELS.md)：技能Lvと人物Lv・使用回数・武器回数・イベント等を組み合わせる成長条件。

[SKILL_CATALOG.md](SKILL_CATALOG.md)：現行の戦闘スキル・探索スキル。魔法表示に分類される能力は除外。

[MAGIC_CATALOG.md](MAGIC_CATALOG.md)：現行UIで魔法に分類される戦闘・探索能力。

[ITEM_CATALOG.md](ITEM_CATALOG.md)：全アイテムの分類・説明・装備補正・使用情報。

[LANTERN_KEEPER.md](LANTERN_KEEPER.md)：灯番の採用するクラス仕様。油による攻撃、油の回復・生成、敵種別の油取得、MP種火の戦闘・探索での適用。現行実装と未確定の詳細を併記。

[COMPANION_CATALOG.md](COMPANION_CATALOG.md)：仲間10人、初期能力と酒場の編成。

[MONSTER_CATALOG.md](MONSTER_CATALOG.md)：敵84定義、画像と共有先・能力・AIの全規則・出現経路。

[BALANCE_PLAN.md](BALANCE_PLAN.md)：調整対象、測定条件、旧測定と未実施項目。

[REINFORCEMENTS.md](REINFORCEMENTS.md)：3方式共通の有限増援・配置・手番・報酬・保存と、根留めの移動/命中補正。
