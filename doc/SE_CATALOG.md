# SE一覧と制作計画

2026-09-09、実装前に確定した一覧です。28種をAIMusicの固定したMusicCoreとPCM合成器で作成し、単発再生用OGGと編集可能なmusic.jsonを保存します。外部サンプルは使用しません。

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

原稿はauthoring/presentation.json、再生定義はdata/sounds.jsonです。実装済みです。以下に各OGG・編集用データと実測値を記載します。

## 作成した音源

実装中にAIMusicで全28種を合成し、OGGを再デコードして無音・非有限値・クリッピングがないことを確認しました。ピーク値は再生前の音源そのものです。実際の再生音量には全体音量×SE音量×各SEのgainを掛けます。SE音量の初期値は80%です。

| SE | 音源 | 編集用AIMusic | 秒数 | ピーク dBFS | 個別gain |
| --- | --- | --- | --- | --- | --- |
| 石床の足音 | [OGG](../assets/audio/se/se_step.ogg) | [music.json](../assets/source/se/se_step.music.json) | 0.223 | -5.0 | 0.33 |
| 壁への接触 | [OGG](../assets/audio/se/se_bump.ogg) | [music.json](../assets/source/se/se_bump.music.json) | 0.261 | -5.0 | 0.7 |
| 選択 | [OGG](../assets/audio/se/se_select.ogg) | [music.json](../assets/source/se/se_select.music.json) | 0.337 | -5.0 | 0.33 |
| 扉の軋み | [OGG](../assets/audio/se/se_door.ogg) | [music.json](../assets/source/se/se_door.music.json) | 0.401 | -5.0 | 0.7 |
| 宝箱 | [OGG](../assets/audio/se/se_chest.ogg) | [music.json](../assets/source/se/se_chest.music.json) | 0.842 | -5.2 | 0.7 |
| 道具 | [OGG](../assets/audio/se/se_item.ogg) | [music.json](../assets/source/se/se_item.music.json) | 0.403 | -5.1 | 0.7 |
| 装備 | [OGG](../assets/audio/se/se_equip.ogg) | [music.json](../assets/source/se/se_equip.music.json) | 0.733 | -5.0 | 0.7 |
| 酒場の交代 | [OGG](../assets/audio/se/se_join.ogg) | [music.json](../assets/source/se/se_join.music.json) | 0.431 | -5.2 | 0.7 |
| 依頼受注 | [OGG](../assets/audio/se/se_accept.ogg) | [music.json](../assets/source/se/se_accept.music.json) | 0.819 | -5.3 | 0.7 |
| 依頼完了 | [OGG](../assets/audio/se/se_complete.ogg) | [music.json](../assets/source/se/se_complete.music.json) | 0.993 | -5.3 | 0.7 |
| 迷宮へ | [OGG](../assets/audio/se/se_enter.ogg) | [music.json](../assets/source/se/se_enter.music.json) | 0.784 | -5.0 | 0.7 |
| 階段 | [OGG](../assets/audio/se/se_stairs.ogg) | [music.json](../assets/source/se/se_stairs.music.json) | 0.517 | -5.1 | 0.7 |
| 帰還 | [OGG](../assets/audio/se/se_return.ogg) | [music.json](../assets/source/se/se_return.music.json) | 0.888 | -5.2 | 0.7 |
| 罠 | [OGG](../assets/audio/se/se_trap.ogg) | [music.json](../assets/source/se/se_trap.music.json) | 0.331 | -5.6 | 0.7 |
| 斬撃 | [OGG](../assets/audio/se/se_slash.ogg) | [music.json](../assets/source/se/se_slash.music.json) | 0.173 | -5.1 | 0.7 |
| 重打 | [OGG](../assets/audio/se/se_heavy.ogg) | [music.json](../assets/source/se/se_heavy.music.json) | 0.354 | -5.0 | 0.7 |
| 貫通 | [OGG](../assets/audio/se/se_pierce.ogg) | [music.json](../assets/source/se/se_pierce.music.json) | 0.280 | -4.2 | 0.7 |
| 炎 | [OGG](../assets/audio/se/se_fire.ogg) | [music.json](../assets/source/se/se_fire.music.json) | 0.447 | -4.9 | 0.7 |
| 氷 | [OGG](../assets/audio/se/se_ice.ogg) | [music.json](../assets/source/se/se_ice.music.json) | 0.819 | -5.2 | 0.7 |
| 雷 | [OGG](../assets/audio/se/se_lightning.ogg) | [music.json](../assets/source/se/se_lightning.music.json) | 0.284 | -4.8 | 0.7 |
| 回復 | [OGG](../assets/audio/se/se_heal.ogg) | [music.json](../assets/source/se/se_heal.music.json) | 0.958 | -5.3 | 0.7 |
| 毒 | [OGG](../assets/audio/se/se_poison.ogg) | [music.json](../assets/source/se/se_poison.music.json) | 0.381 | -5.2 | 0.7 |
| 防御 | [OGG](../assets/audio/se/se_guard.ogg) | [music.json](../assets/source/se/se_guard.music.json) | 0.749 | -5.0 | 0.7 |
| 勝利 | [OGG](../assets/audio/se/se_victory.ogg) | [music.json](../assets/source/se/se_victory.music.json) | 0.548 | -5.0 | 0.7 |
| 敗北 | [OGG](../assets/audio/se/se_defeat.ogg) | [music.json](../assets/source/se/se_defeat.music.json) | 0.953 | -5.1 | 0.7 |
| 逃走 | [OGG](../assets/audio/se/se_escape.ogg) | [music.json](../assets/source/se/se_escape.music.json) | 0.363 | -5.4 | 0.7 |
| 魔力 | [OGG](../assets/audio/se/se_mana.ogg) | [music.json](../assets/source/se/se_mana.music.json) | 0.482 | -5.1 | 0.7 |
| 敵出現 | [OGG](../assets/audio/se/se_encounter.ogg) | [music.json](../assets/source/se/se_encounter.music.json) | 0.408 | -5.2 | 0.7 |

## 再作成と確認

`node tools/assets/generate-effects.mjs` でSEと連番画像を再作成し、`node tools/build-presentation.mjs` でゲーム用の定義を更新します。原稿の音符は秒単位で、生成器がAIMusicのtickへ変換します。打楽器の音高は各音色の固定値を使います。

SEはAIMusicの出力を発音末尾まで切り詰め、両端5msのフェードとピーク0.55への音量調整を行い、FFmpeg/libvorbisでOGGへ変換します。足音や斬撃は合成打楽器、炎はノイズ系打楽器、雷は短いパルス列で、録音素材ではありません。音色の合成方法と値は原稿・生成器・編集用music.jsonに残しています。

[測定データ](../assets/source/effects-report.json)と[素材の来歴](../assets/PROVENANCE.md)を参照してください。ビュー用プレビューの「SEを試聴」でも個別に鳴らせます。試聴はクリック時だけ始まり、進行や保存を読みません。実ブラウザ・スピーカーでの聴感と再生タイミングは未検証です。
