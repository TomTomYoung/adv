# SE一覧と制作計画

2026-09-09、実装前の一覧です。28種をAIMusicの固定したMusicCoreとPCM合成器で作成し、単発再生用OGGと編集可能なmusic.jsonを保存します。外部サンプルは使用しません。

| ID | SE | 再生する場面 | 合成音色 |
| --- | --- | --- | --- |
| se_step | 石床の足音 | 移動成功 | kick |
| se_bump | 壁への接触 | 移動できないとき | bass |
| se_select | 選択 | 本文送り・選択肢 | pluck |
| se_door | 扉の軋み | 扉を調べる | bass |
| se_chest | 宝箱 | 補給箱 | bell |
| se_item | 道具 | 購入・道具使用 | pluck |
| se_equip | 装備 | 装備・取外し | bell |
| se_join | 酒場の交代 | 加入・待機・交代 | pluck |
| se_accept | 依頼受注 | 受注 | bell |
| se_complete | 依頼完了 | 報告・結末 | bell |
| se_enter | 迷宮へ | 入場 | pad |
| se_stairs | 階段 | 階層移動 | pluck |
| se_return | 帰還 | 町へ帰る | bell |
| se_trap | 罠 | 罠作動 | snare |
| se_slash | 斬撃 | 剣・鋸・刃 | hat |
| se_heavy | 重打 | 強打・体当たり | kick |
| se_pierce | 貫通 | 突き・針 | pulse |
| se_fire | 炎 | 炎系技能 | snare |
| se_ice | 氷 | 氷系技能 | bell |
| se_lightning | 雷 | 雷系技能 | pulse |
| se_heal | 回復 | 治療・休息 | bell |
| se_poison | 毒 | 毒刃・毒の消耗 | bass |
| se_guard | 防御 | 守りを固める | bell |
| se_victory | 勝利 | 戦闘勝利 | pulse |
| se_defeat | 敗北 | 救助・敗北 | pad |
| se_escape | 逃走 | 戦闘から離れる | pluck |
| se_mana | 魔力 | MP回復・減少 | flute |
| se_encounter | 敵出現 | 戦闘開始 | bass |

音は既存の音ボタンと音量設定に従います。SEはBGMと別に音量を調整でき、音量0・音オフでは鳴りません。移動・UI音は小さめに設定し、同時発音は最大8、演出の予約は新しい操作・ロードで破棄します。再描画だけでは同じ音を繰り返しません。

原稿はauthoring/presentation.json、再生定義はdata/sounds.jsonです。実装後に各OGGへのリンク・実測秒数・ピークを追記します。
