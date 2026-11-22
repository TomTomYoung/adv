# SE一覧と再生仕様

音符・波形・音量変化・重ね方の記述例と追加合成音の全プリセットは[音・戦闘演出の記述形式](SOUND_AND_EFFECT_FORMAT.md)を参照してください。

2026-11-22現在、本編には56種の収録SEがあります。28種はAIMusicで合成したOGGです。残る28種はADV用に制作したWAVです。

味方は `se_chip_ally`、敵は `se_chip_enemy` で攻撃を予告します。通常の斬撃が命中すると `se_chip_contact` が鳴ります。[味方の開始音](../../assets/audio/se/se_chip_ally.wav) ／ [敵の開始音](../../assets/audio/se/se_chip_enemy.wav) ／ [命中音](../../assets/audio/se/se_chip_contact.wav)

旧版は `se_ally_call` と `se_enemy_warning` の号令に `se_thick_blade` の命中音を組み合わせます。[A03 戦列の号令](../../assets/audio/auditions/windup-20/A03.wav) ／ [E07 魔将の宣告](../../assets/audio/auditions/windup-20/E07.wav) ／ [01 厚刃の一閃](../../assets/audio/auditions/attack-v1/01_atsuba.wav)

## 通常攻撃の実戦録音

旧版の号令とFC風の採用版で、同じセーブからアダの通常攻撃と敵の反撃を1回ずつ録音しました。戦闘BGMを含むステレオ原音です。比較動画では旧版、採用版の順に再生します。[4秒の比較動画](../../assets/audio/auditions/battle-turn-fc/comparison.mp4) ／ [旧版のWAV](../../assets/audio/auditions/battle-turn-fc/previous.wav) ／ [採用版のWAV](../../assets/audio/auditions/battle-turn-fc/adopted.wav)

参考にしたのは初代『ドラゴンクエスト』北米NES版の攻撃前の合図です。ADV用の3音は[生成スクリプト](../../tools/assets/generate-chip-battle.py)から再生成できます。採用版の録音で開始音から命中音までを測ると、味方は約229ms、敵は約238msでした。[本編の変更（PR #332）](https://github.com/TomTomYoung/adv/pull/332) ／ [録音に使った戦闘・音量設定](../../tools/browser-battle-mix.mjs) ／ [音と演出の設定方法](SOUND_AND_EFFECT_FORMAT.md)

試作した味方の開始音10種、敵の開始音10種、命中音10種は各試聴ページから確認できます。[開始音20種](../../assets/audio/auditions/windup-20/index.html) ／ [命中音10種](../../sound-library.html?kind=sample#catalog)

## 技能・魔法の採用音

戦闘技能102件に22種の専用音を割り当てました。[技能・魔法22音の試聴](../../sound-library.html?kind=se&search=se_skill_#catalog)で音を選ぶと、対象の技名と音源ファイルが表示されます。検索欄に「炎嵐」「祓いの光」などの技名を入力して探せます。[22音の生成スクリプト](../../tools/assets/generate-skill-sounds.py)

### 通常攻撃から引き継いだ設計

味方の予告は高く、敵の予告は低く鳴ります。攻撃すると分かった瞬間と、攻撃が当たった瞬間を別々に聞き取れます。味方の通常攻撃では198msの合図が止んだ約32ms後が命中です。この短い隙間に続く粗いノイズが、着弾の瞬間を際立たせます。空振りではその打点が消えるので、音だけでも結果を判別できます。

技能の音も、最初の数十msで動きを聞き分けられるように作りました。強打は低い二段打ち、突きは上昇音を金属音で止め、連射は三つの短音をずらします。氷の符は結晶が二度鳴って割れ、氷縛は三本の氷針が下って低く崩れます。回復は丸い三音が上がり、大回復は四音目を和音で支えます。全体技の打点は対象全員で一回です。複数の相手に効いても同じ破裂音で音量が膨らみません。

炎嵐・爆炎調合は三連の炸裂、雷雲・渡り雷は放電の後に低い雷鳴が残ります。祓いの光には上昇する倍音と硬い打点、根の拘束には木の割れる音と低い振動、血の灯には半音で沈む脈を割り当てました。通常攻撃、防御、傷薬、解毒薬には従来の音を使います。

## 収録SE一覧

ID：se_step / SE：石床の足音 / 再生する場面：移動成功 / 合成音色：kick

ID：se_bump / SE：壁への接触 / 再生する場面：移動できないとき / 合成音色：bass

ID：se_select / SE：選択 / 再生する場面：本文送り・選択肢 / 合成音色：pluck

ID：se_door / SE：扉の軋み / 再生する場面：扉を調べる / 合成音色：bass

ID：se_chest / SE：宝箱 / 再生する場面：補給箱 / 合成音色：bell

ID：se_item / SE：道具 / 再生する場面：購入・道具使用 / 合成音色：pluck

ID：se_equip / SE：装備 / 再生する場面：装備・取外し / 合成音色：bell

ID：se_join / SE：酒場の交代 / 再生する場面：加入・待機・交代 / 合成音色：pluck

ID：se_accept / SE：依頼受注 / 再生する場面：受注 / 合成音色：bell

ID：se_complete / SE：依頼完了 / 再生する場面：報告・結末 / 合成音色：bell

ID：se_enter / SE：迷宮へ / 再生する場面：入場 / 合成音色：pad

ID：se_stairs / SE：階段 / 再生する場面：階層移動 / 合成音色：pluck

ID：se_return / SE：帰還 / 再生する場面：町へ帰る / 合成音色：bell

ID：se_trap / SE：罠 / 再生する場面：罠作動 / 合成音色：snare

ID：se_slash / SE：斬撃 / 再生する場面：剣・鋸・刃 / 合成音色：hat

ID：se_heavy / SE：重打 / 再生する場面：強打・体当たり / 合成音色：kick

ID：se_pierce / SE：貫通 / 再生する場面：突き・針 / 合成音色：pulse

ID：se_fire / SE：炎 / 再生する場面：炎系技能 / 合成音色：snare

ID：se_ice / SE：氷 / 再生する場面：氷系技能 / 合成音色：bell

ID：se_lightning / SE：雷 / 再生する場面：雷系技能 / 合成音色：pulse

ID：se_heal / SE：回復 / 再生する場面：治療・休息 / 合成音色：bell

ID：se_poison / SE：毒 / 再生する場面：毒刃・毒の消耗 / 合成音色：bass

ID：se_guard / SE：防御 / 再生する場面：守りを固める / 合成音色：bell

ID：se_victory / SE：勝利 / 再生する場面：戦闘勝利 / 合成音色：pulse

ID：se_defeat / SE：敗北 / 再生する場面：救助・敗北 / 合成音色：pad

ID：se_escape / SE：逃走 / 再生する場面：戦闘から離れる / 合成音色：pluck

ID：se_mana / SE：魔力 / 再生する場面：MP回復・減少 / 合成音色：flute

ID：se_encounter / SE：敵出現 / 再生する場面：戦闘開始 / 合成音色：bass

音は既存の音ボタンと音量設定に従います。SEはBGMと別に音量を調整でき、音量0・音オフでは鳴りません。移動・UI音は小さめに設定し、同時発音は最大8、演出の予約は新しい操作・ロードで破棄します。再描画だけでは同じ音を繰り返しません。

原稿はconfig/presentation.json、再生定義はdata/sounds.jsonです。実装済みです。以下に各OGG・編集用データと実測値を記載します。

## 作成した音源

実装中にAIMusicで全28種を合成し、OGGを再デコードして無音・非有限値・クリッピングがないことを確認しました。ピーク値は再生前の音源そのものです。実際の再生音量には全体音量×SE音量×各SEのgainを掛けます。SE音量の初期値は80%です。

SE：石床の足音 / 音源：[OGG](../../assets/audio/se/se_step.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_step.music.json) / 秒数：0.223 / ピーク dBFS：-5.0 / 個別gain：0.33

SE：壁への接触 / 音源：[OGG](../../assets/audio/se/se_bump.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_bump.music.json) / 秒数：0.261 / ピーク dBFS：-5.0 / 個別gain：0.7

SE：選択 / 音源：[OGG](../../assets/audio/se/se_select.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_select.music.json) / 秒数：0.337 / ピーク dBFS：-5.0 / 個別gain：0.33

SE：扉の軋み / 音源：[OGG](../../assets/audio/se/se_door.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_door.music.json) / 秒数：0.401 / ピーク dBFS：-5.0 / 個別gain：0.7

SE：宝箱 / 音源：[OGG](../../assets/audio/se/se_chest.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_chest.music.json) / 秒数：0.842 / ピーク dBFS：-5.2 / 個別gain：0.7

SE：道具 / 音源：[OGG](../../assets/audio/se/se_item.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_item.music.json) / 秒数：0.403 / ピーク dBFS：-5.1 / 個別gain：0.7

SE：装備 / 音源：[OGG](../../assets/audio/se/se_equip.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_equip.music.json) / 秒数：0.733 / ピーク dBFS：-5.0 / 個別gain：0.7

SE：酒場の交代 / 音源：[OGG](../../assets/audio/se/se_join.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_join.music.json) / 秒数：0.431 / ピーク dBFS：-5.2 / 個別gain：0.7

SE：依頼受注 / 音源：[OGG](../../assets/audio/se/se_accept.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_accept.music.json) / 秒数：0.819 / ピーク dBFS：-5.3 / 個別gain：0.7

SE：依頼完了 / 音源：[OGG](../../assets/audio/se/se_complete.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_complete.music.json) / 秒数：0.993 / ピーク dBFS：-5.3 / 個別gain：0.7

SE：迷宮へ / 音源：[OGG](../../assets/audio/se/se_enter.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_enter.music.json) / 秒数：0.784 / ピーク dBFS：-5.0 / 個別gain：0.7

SE：階段 / 音源：[OGG](../../assets/audio/se/se_stairs.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_stairs.music.json) / 秒数：0.517 / ピーク dBFS：-5.1 / 個別gain：0.7

SE：帰還 / 音源：[OGG](../../assets/audio/se/se_return.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_return.music.json) / 秒数：0.888 / ピーク dBFS：-5.2 / 個別gain：0.7

SE：罠 / 音源：[OGG](../../assets/audio/se/se_trap.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_trap.music.json) / 秒数：0.331 / ピーク dBFS：-5.6 / 個別gain：0.7

SE：斬撃 / 音源：[OGG](../../assets/audio/se/se_slash.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_slash.music.json) / 秒数：0.173 / ピーク dBFS：-5.1 / 個別gain：0.7

SE：重打 / 音源：[OGG](../../assets/audio/se/se_heavy.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_heavy.music.json) / 秒数：0.354 / ピーク dBFS：-5.0 / 個別gain：0.7

SE：貫通 / 音源：[OGG](../../assets/audio/se/se_pierce.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_pierce.music.json) / 秒数：0.280 / ピーク dBFS：-4.2 / 個別gain：0.7

SE：炎 / 音源：[OGG](../../assets/audio/se/se_fire.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_fire.music.json) / 秒数：0.447 / ピーク dBFS：-4.9 / 個別gain：0.7

SE：氷 / 音源：[OGG](../../assets/audio/se/se_ice.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_ice.music.json) / 秒数：0.819 / ピーク dBFS：-5.2 / 個別gain：0.7

SE：雷 / 音源：[OGG](../../assets/audio/se/se_lightning.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_lightning.music.json) / 秒数：0.284 / ピーク dBFS：-4.8 / 個別gain：0.7

SE：回復 / 音源：[OGG](../../assets/audio/se/se_heal.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_heal.music.json) / 秒数：0.958 / ピーク dBFS：-5.3 / 個別gain：0.7

SE：毒 / 音源：[OGG](../../assets/audio/se/se_poison.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_poison.music.json) / 秒数：0.381 / ピーク dBFS：-5.2 / 個別gain：0.7

SE：防御 / 音源：[OGG](../../assets/audio/se/se_guard.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_guard.music.json) / 秒数：0.749 / ピーク dBFS：-5.0 / 個別gain：0.7

SE：勝利 / 音源：[OGG](../../assets/audio/se/se_victory.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_victory.music.json) / 秒数：0.548 / ピーク dBFS：-5.0 / 個別gain：0.7

SE：敗北 / 音源：[OGG](../../assets/audio/se/se_defeat.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_defeat.music.json) / 秒数：0.953 / ピーク dBFS：-5.1 / 個別gain：0.7

SE：逃走 / 音源：[OGG](../../assets/audio/se/se_escape.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_escape.music.json) / 秒数：0.363 / ピーク dBFS：-5.4 / 個別gain：0.7

SE：魔力 / 音源：[OGG](../../assets/audio/se/se_mana.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_mana.music.json) / 秒数：0.482 / ピーク dBFS：-5.1 / 個別gain：0.7

SE：敵出現 / 音源：[OGG](../../assets/audio/se/se_encounter.ogg) / 編集用AIMusic：[music.json](../../assets/source/se/se_encounter.music.json) / 秒数：0.408 / ピーク dBFS：-5.2 / 個別gain：0.7

## 再作成と確認

`node tools/assets/generate-effects.mjs` でSEと連番画像を再作成し、`node tools/build-presentation.mjs` でゲーム用の定義を更新します。原稿の音符は秒単位で、生成器がAIMusicのtickへ変換します。打楽器の音高は各音色の固定値を使います。

SEはAIMusicの出力を発音末尾まで切り詰め、両端5msのフェードとピーク0.55への音量調整を行い、FFmpeg/libvorbisでOGGへ変換します。足音や斬撃は合成打楽器、炎はノイズ系打楽器、雷は短いパルス列で、録音素材ではありません。音色の合成方法と値は原稿・生成器・編集用music.jsonに残しています。

[測定データ](../../assets/source/effects-report.json)と[素材の来歴](../../assets/PROVENANCE.md)を参照してください。ビュー用プレビューの「SEを試聴」でも個別に鳴らせます。試聴はクリック時だけ始まり、進行や保存を読みません。戦闘の発音指示と命中表示のタイミングはChromiumで確認しました（[検証記録](../development/PROGRESS.md)）。スピーカーでの聴感と実際の音声出力遅延は未確認です。
