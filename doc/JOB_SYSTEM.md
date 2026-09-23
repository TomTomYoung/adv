# 職業システムと職業一覧

更新日: 2026-09-18。作品版1.14.0の30職と、転職・技能・バフ・装備制限・履歴成長の仕様です。検証状況は[PROGRESS.md](PROGRESS.md)を参照してください。

参照：[RPG職業・ジョブ・クラス生成モデル v1.0](https://app.notion.com/p/3d6c3c1966b381da8284e6cca487b9eb)。モデルの「限定された操作権限」「人物と職業の分離」「付与元と寿命」「支払い前後の検査」を、このゲームのターン制と探索へ適用します。参照ページは設計モデルであり、以下の数値は本作向けの初期調整値です。

## 基本方針

30職すべてを開始時から酒場で選べます。主職は1つ、転職は無料で、町の非会話・非戦闘時のみ行います。待機中の仲間も変更できます。個人の肖像・素の能力・負傷・毒・所持品は保持します。職業技能の持ち越しと副職は採用しません。

隊のLv・EXPは従来どおり共有し、職業の技能段階はLv1/5/10です。独立した職業EXPや周回稼ぎを要求しません。共通技能は攻撃・防御、共通の道具使用と逃走は既存の条件に従います。職業由来の技能は現在の職業・必要Lv・装備・MP・HP・材料・対象を検査してから使います。

成長は仲間ごとの職業履歴へ「どの職で何回Lvが上がったか」を記録します。待機中の仲間も現在の職で同じ回数成長します。能力値は素の値に、履歴から求めた成長（各能力について合算後切捨て）、現在職の加算補正、腐食・効果停止を反映した装備補正を加えます。整数化と下限処理の後、ダンジョンの能力補正、戦闘バフの順に適用します。最大HPは1以上、他能力は0以上です。転職では過去の成長を再配分しません。HP・MPは新しい上限まで切り詰めるだけで回復しません。

装備は武器・防具・護符の3枠を維持し、種類を追加します。転職後に装備できない品は袋へ戻します。戻し先が99個を超えると転職全体を不成立にし、職・HP・MP・在庫を変更しません。標準の旅装でも共通攻撃は使用できます。

## 対応する処理と境界

戦闘技能は既存のダメージ・回復・防御・毒・解毒・MP操作を利用し、能力補正、かばう、魔物解析を追加しています。職業JSONのgrantsは技能ID・API・対象種別・最大対象数・装備中という寿命を一つの許可節として束ねます。別の職の許可節を寄せ集めません。未実装API、未習得技能、未知の補正項目は登録時・使用時に拒否します。任意JavaScriptは実行しません。

かばうは生存する味方一人への単体攻撃だけを、被弾前に引き受けます。全体攻撃は対象外、引受けから別の引受けへの連鎖は行いません。複数候補は隊員順で一人に決めます。一敵巡で失効します。

戦闘バフ・デバフは技能の発動者と職業を付与元に持ち、指定した敵巡数だけ有効です。同種を再使用すると同じ対象の期限を更新します。異種の補正は能力ごとに最大の強化と最大の弱体を各一つ採用し、無制限に重なりません。属性防護も一番強いものを採用します。戦闘終了時に削除します。未行動の味方の順番は速さに応じて再評価しますが、一巡の行動回数は増えません。

薬師の増幅は本人が戦闘で使う傷薬だけです。散布は携行薬箱と傷薬一個、MP4を必要とし、生存する味方のHP割合が低い順（同率は隊員順）で最大三人へ、floor(45×1.25×0.5)=28ずつ回復します。共有の薬定義は変更しません。探索中の通常道具は従来の効能です。錬金術師の調合は傷薬2＋解毒薬1＋MP2を野営糧食1へ変換し、全材料と出力先を確認して一括決済します。

測量は現在階・現在地の半径内の地形だけを明らかにします。魔物解析はこの戦闘の対象一体の能力・耐性だけを記録します。未解析の耐性をViewModelへ先渡ししません。敵の次の行動予知、召喚、盗品移転、物語の鍵を無視する解錠は実装範囲に含めません。

探索・購入の隊効果は参加中かつ生存中の仲間だけから算出し、同種は最良値一つを採用します。灯守は通算成功歩数の3の倍数で灯油消費を省きます。商人は店の購入額を10%割引（端数切上げ）、巡礼者は帰還印の救援費を半減します。敗北時の費用は変えません。罠軽減は罠イベントのactor.damageだけへ適用し、戦闘や血術の代償へ流用しません。

## JSONとファイル構成

原稿はconfig/jobs.json。配布データはjobs.json / job-profile.json / buffs.json / field-abilities.json。人物にはinitialJob、装備にはequipmentTypeを付けます。技能の追加も原稿にまとめ、既存の表示演出・SEへ割り当てます。viewは職業選択・比較・使用不能理由をViewModelだけから描きます。

JobSpecとactor.job / actor.growthHistoryを分離します。職業変更はjob.change意図、探索特技はjob.action意図で要求します。スクリプト側も同名命令から同じ条件検査を通します。移動・装備・戦闘と同様、一般変数setによる自由書込みは許可しません。

旧内容版セーブは移行せず、読込失敗時は新規開始します。同版の職業・成長履歴・装備個体・戦闘補正・継続位置を保存検証します。

## 検証方針

30職すべてに転職し、Lv1/5/10/30の成長・習得・許可装備・実行を検査します。通常資源による本編100クエストの回帰試験を維持します。単発遭遇と職業差し替えの測定条件、および1.3.0の旧測定値は[BALANCE_PLAN.md](BALANCE_PLAN.md)を参照してください。単職一人で全域を攻略できる保証はしません。

未習得、媒体不足、対象不正、MP不足、HP不足、材料不足、袋満杯、職業変更連打、かばう競合、バフ期限、薬の漏出、保存再開を境界テストにします。成長と演出が乱数を消費しないこと、異なる補正の付与元が混ざらないこと、失敗時に一部だけ消費しないことを検査します。実ブラウザの表示・操作確認は別の検証として記録します。

## 固有環境との接続

探索特技は10定義です。火3種、岩砕き、書庫の開門、回復祈祷、測量、3種の調合・加工を含みます。書庫は自分の技能を一つ封じて未習得技能を貸し出し、退場で返却します。谷は指定技能・魔法・道具効果を停止し、深淵の衰弱と塩坑の装備腐食は能力計算へ作用します。使用可否は付与元と環境を合わせて判定します。

## 過去の検証

1.3.0導入時の測定と限定的なブラウザ試験は[旧実装記録](legacy/2026-09-14/JOB_IMPLEMENTATION.md)へ保存しました。現行の検証結果とは区別してください。

<!-- generated:jobs -->

## 現行30職の定義

作品版1.18.0の data/jobs.json から生成。習得Lv・API・材料のある技能は使用時に個別検査します。

### 戦士 (warrior)

構えで力を高め、強打で硬い相手を崩す。

成長/Lv：HP 8 / MP 1.5 / STR 2.4 / VIT 1.2 / AGI 0.2 / INT 1。現在職の加算：なし。
装備：weapon＝sword・axe / armor＝heavy・light / charm＝charm。
習得：Lv1 強打 (battle.skill) / Lv5 戦意高揚 (battle.skill) / Lv10 大薙ぎ (battle.skill) / Lv1 岩砕き (wall.break)。
特性：{"physicalPower":1.05}。術と回復は仲間に頼ります。

### 騎士 (knight)

守る相手を指定し、単体攻撃を引き受けて立て直す。

成長/Lv：HP 9 / MP 1.5 / STR 1.8 / VIT 1.5 / AGI 0.1 / INT 1。現在職の加算：なし。
装備：weapon＝sword・spear / armor＝heavy / charm＝charm。
習得：Lv1 強打 (battle.skill) / Lv1 かばう (battle.skill) / Lv1 盾の壁 (battle.skill) / Lv5 不動の構え (battle.skill)。
特性：{"damageTaken":0.95}。全体攻撃はかばえません。

### 狂戦士 (berserker)

強烈な一撃で削り、自身の守りが落ちる時間を仲間に託す。

成長/Lv：HP 9 / MP 1 / STR 2.8 / VIT 0.8 / AGI 0.3 / INT 0.8。現在職の加算：なし。
装備：weapon＝axe・sword / armor＝light / charm＝charm。
習得：Lv1 強打 (battle.skill) / Lv5 捨て身の一撃 (battle.skill) / Lv10 戦意高揚 (battle.skill)。
特性：{"physicalPower":1.12,"damageTaken":1.1}。被害が増し、長期戦では消耗します。

### 決闘士 (duelist)

速度を整え、身のこなしを用いた一撃を狙う。

成長/Lv：HP 6.5 / MP 2 / STR 1.9 / VIT 0.9 / AGI 0.8 / INT 1.2。現在職の加算：なし。
装備：weapon＝sword・dagger / armor＝light / charm＝charm。
習得：Lv1 流星突き (battle.skill) / Lv5 軽身の構え (battle.skill) / Lv10 貫通突き (battle.skill)。
特性：{"physicalPower":1.04}。重装が使えず、集団戦は不得意です。

### 槍使い (lancer)

単体には貫通、複数には槍を装備して横薙ぎを選ぶ。

成長/Lv：HP 7.5 / MP 1.8 / STR 2.3 / VIT 1 / AGI 0.5 / INT 1。現在職の加算：なし。
装備：weapon＝spear / armor＝light・heavy / charm＝charm。
習得：Lv1 貫通突き (battle.skill) / Lv5 槍の横薙ぎ (battle.skill) / Lv10 不動の構え (battle.skill)。
特性：{"physicalPower":1.04}。横薙ぎは槍が必要です。

### 拳闘士 (monk)

掌打で攻め、呼吸で自分を治療して前線に残る。

成長/Lv：HP 8 / MP 1.5 / STR 2.2 / VIT 1.1 / AGI 0.6 / INT 1。現在職の加算：なし。
装備：weapon＝fist / armor＝light / charm＝charm。
習得：Lv1 崩し掌 (battle.skill) / Lv5 調息 (battle.skill) / Lv10 軽身の構え (battle.skill) / Lv1 岩砕き (wall.break)。
特性：{"healingPower":1.08}。味方全体の救命はできません。

### 狩人 (ranger)

周囲を読み、弓で標的の防御を落として集中攻撃する。

成長/Lv：HP 7 / MP 1.8 / STR 2.1 / VIT 0.9 / AGI 0.7 / INT 1.2。現在職の加算：なし。
装備：weapon＝bow・dagger / armor＝light / charm＝charm。
習得：Lv1 貫通突き (battle.skill) / Lv5 狙いの矢 (battle.skill) / Lv10 一斉射撃 (battle.skill) / Lv1 登攀誘導 (voxel.traverse)。
特性：{"revealRadius":2}。印と一斉射撃には弓が必要です。

### 盗賊 (rogue)

罠の被害を抑え、敵の攻撃力を削って損失を減らす。

成長/Lv：HP 6.5 / MP 2 / STR 1.9 / VIT 0.8 / AGI 0.8 / INT 1.3。現在職の加算：なし。
装備：weapon＝dagger・sword / armor＝light / charm＝charm。
習得：Lv1 毒の刃 (battle.skill) / Lv5 武器落とし (battle.skill) / Lv10 軽身の構え (battle.skill)。
特性：{"trapDamage":0.7}。鍵や物語条件を無視する解錠・盗品複製は行いません。

### 暗殺者 (assassin)

確実な毒を与え、素早い一撃と継続損耗を重ねる。

成長/Lv：HP 6 / MP 2 / STR 2.3 / VIT 0.7 / AGI 0.8 / INT 1.3。現在職の加算：なし。
装備：weapon＝dagger / armor＝light / charm＝charm。
習得：Lv1 毒の刃 (battle.skill) / Lv5 毒針の急所 (battle.skill) / Lv10 流星突き (battle.skill)。
特性：{"physicalPower":1.06}。防御成長が低く、毒が効かない敵に弱いです。

### 斥候 (scout)

遭遇を少し減らし、敵の足を乱して離脱を支える。

成長/Lv：HP 6.5 / MP 2 / STR 1.8 / VIT 0.9 / AGI 0.8 / INT 1.3。現在職の加算：なし。
装備：weapon＝dagger・bow / armor＝light / charm＝charm。
習得：Lv1 毒の刃 (battle.skill) / Lv5 足払い (battle.skill) / Lv10 周辺測量 (map.reveal) / Lv1 登攀誘導 (voxel.traverse)。
特性：{"encounterRate":0.9,"escapeBonus":0.08}。直接火力より行軍の安全を重視します。

### 魔術師 (mage)

相手に合う属性を選び、MPを配分しながら攻める。

成長/Lv：HP 5.5 / MP 3 / STR 1 / VIT 0.7 / AGI 0.3 / INT 2.8。現在職の加算：なし。
装備：weapon＝staff / armor＝robe / charm＝charm。
習得：Lv1 灯火の術 (battle.skill) / Lv5 氷の符 (battle.skill) / Lv10 雷の符 (battle.skill) / Lv1 乾かしの火 (party.dry)。
特性：{"magicPower":1.04}。物理防御とHPの成長が低めです。

### 火術師 (pyromancer)

単体炎術で節約し、敵が多いときに炎嵐へ切り替える。

成長/Lv：HP 5.5 / MP 3 / STR 1 / VIT 0.7 / AGI 0.3 / INT 2.8。現在職の加算：なし。
装備：weapon＝staff / armor＝robe / charm＝charm。
習得：Lv1 灯火の術 (battle.skill) / Lv5 炎嵐 (battle.skill) / Lv10 戦意高揚 (battle.skill) / Lv1 乾かしの火 (party.dry)。
特性：{"elementPower":{"fire":1.15}}。炎耐性の相手には効率が落ちます。

### 氷術師 (cryomancer)

氷で攻撃力を落とし、守りを維持して消耗を抑える。

成長/Lv：HP 6 / MP 2.8 / STR 1 / VIT 0.9 / AGI 0.3 / INT 2.5。現在職の加算：なし。
装備：weapon＝staff / armor＝robe / charm＝charm。
習得：Lv1 氷の符 (battle.skill) / Lv5 氷縛 (battle.skill) / Lv10 護甲刻印 (battle.skill)。
特性：{"elementPower":{"ice":1.12}}。拘束は行動停止ではなく能力低下です。

### 雷術師 (stormcaller)

雷を一点へ落とすか、雷雲を敵全員へ広げるか選ぶ。

成長/Lv：HP 5.5 / MP 3 / STR 1 / VIT 0.7 / AGI 0.5 / INT 2.6。現在職の加算：なし。
装備：weapon＝staff / armor＝robe / charm＝charm。
習得：Lv1 雷の符 (battle.skill) / Lv5 雷雲 (battle.skill) / Lv10 軽身の構え (battle.skill)。
特性：{"elementPower":{"lightning":1.12}}。範囲術はMP消費が大きくなります。

### 魔法剣士 (spellblade)

剣を装備して力と知力を一撃へ合わせ、炎を載せる。

成長/Lv：HP 7 / MP 2.3 / STR 1.9 / VIT 1 / AGI 0.3 / INT 1.9。現在職の加算：なし。
装備：weapon＝sword / armor＝light・heavy / charm＝charm。
習得：Lv1 灯火の術 (battle.skill) / Lv1 強打 (battle.skill) / Lv5 灯火の魔法剣 (battle.skill) / Lv10 護甲刻印 (battle.skill)。
特性：{"magicPower":1.04}。魔法剣には剣が必要で、特化職ほど一軸は伸びません。

### 祈祷師 (priest)

生存者の傷と毒を見て、単体治療と全体治療を選ぶ。

成長/Lv：HP 6.5 / MP 2.8 / STR 1 / VIT 1 / AGI 0.2 / INT 2.5。現在職の加算：なし。
装備：weapon＝staff・tool / armor＝robe・light / charm＝charm。
習得：Lv1 手当の祈り (battle.skill) / Lv1 解毒 (battle.skill) / Lv5 救護の祈り (battle.skill) / Lv10 清浄の祈り (battle.skill) / Lv1 旅の回復祈祷 (party.heal)。
特性：{"healingPower":1.08}。戦闘中の蘇生には対応しません。

### 聖騎士 (paladin)

庇う相手を治療し、隊の守りを整えながら光で反撃する。

成長/Lv：HP 8 / MP 2 / STR 1.7 / VIT 1.3 / AGI 0.1 / INT 1.6。現在職の加算：なし。
装備：weapon＝sword・spear / armor＝heavy / charm＝charm。
習得：Lv1 手当の祈り (battle.skill) / Lv1 かばう (battle.skill) / Lv5 聖護の祈り (battle.skill) / Lv10 祓いの光 (battle.skill)。
特性：{"damageTaken":0.97,"healingPower":1.04}。攻撃・回復の専業よりMP効率を抑えています。

### 薬師 (apothecary)

傷薬を一人へ増幅投与するか、薬箱で最大三人へ分ける。

成長/Lv：HP 6.5 / MP 2.6 / STR 1 / VIT 1 / AGI 0.5 / INT 2.2。現在職の加算：なし。
装備：weapon＝tool・dagger / armor＝robe・light / charm＝charm。
習得：Lv1 手当の祈り (battle.skill) / Lv1 薬草の霧 (battle.skill) / Lv1 解毒 (battle.skill) / Lv5 傷薬散布 (battle.skill) / Lv10 救護の祈り (battle.skill)。
特性：{"itemHealing":1.25}。増幅は本人の戦闘中の傷薬使用だけです。散布は薬箱と傷薬が必要です。

### 錬金術師 (alchemist)

探索中に薬と解毒薬から糧食を調合し、戦闘では灯油を炎へ使う。

成長/Lv：HP 6 / MP 2.7 / STR 1.2 / VIT 0.9 / AGI 0.4 / INT 2.4。現在職の加算：なし。
装備：weapon＝tool・staff / armor＝robe / charm＝charm。
習得：Lv1 灯火の術 (battle.skill) / Lv1 携行食の調合 (inventory.convert) / Lv5 爆炎調合 (battle.skill) / Lv10 解毒 (battle.skill) / Lv1 庭園薬の調合 (inventory.convert) / Lv1 植物繊維の縄編み (inventory.convert)。
特性：{"itemHealing":1.1}。材料・MPを消費します。売却や無料生成はありません。

### 吟遊詩人 (bard)

味方のMPを補い、歌の効果が切れる前後で支援を切り替える。

成長/Lv：HP 6.5 / MP 2.6 / STR 1.3 / VIT 0.9 / AGI 0.6 / INT 1.9。現在職の加算：なし。
装備：weapon＝instrument・dagger / armor＝light・robe / charm＝charm。
習得：Lv1 気付けの節 (battle.skill) / Lv1 手当の祈り (battle.skill) / Lv5 勇戦歌 (battle.skill) / Lv10 行進歌 (battle.skill)。
特性：{"healingPower":1.04}。MP補給は消費より少なく、魔力を増殖できません。

### 軍師 (tactician)

味方の力や速さを引き上げ、未行動の仲間の順番を整える。

成長/Lv：HP 6.5 / MP 2.5 / STR 1.4 / VIT 1 / AGI 0.5 / INT 2。現在職の加算：なし。
装備：weapon＝sword・tool / armor＝light / charm＝charm。
習得：Lv1 奮起の指示 (battle.skill) / Lv5 攻勢指揮 (battle.skill) / Lv10 魔物解析 (battle.skill)。
特性：{"revealRadius":2}。行動回数は増えず、仲間に未習得の術を命じられません。

### 測量士 (surveyor)

現在地の周囲を測り、地図を広げて守りや経路を考える。

成長/Lv：HP 6.5 / MP 2 / STR 1.5 / VIT 1 / AGI 0.6 / INT 1.8。現在職の加算：なし。
装備：weapon＝tool・bow / armor＝light / charm＝charm。
習得：Lv1 周辺測量 (map.reveal) / Lv5 地形を読む (battle.skill) / Lv10 貫通突き (battle.skill)。
特性：{"revealRadius":2}。遠隔移動や依頼の真相・鍵の取得はできません。

### 灯番 (lantern_keeper)

灯と隊を守る。篝火の迷宮では携帯松明や台座を点火し、くらがりを撃退する。

成長/Lv：HP 7 / MP 2.4 / STR 1.4 / VIT 1.1 / AGI 0.2 / INT 2。現在職の加算：なし。
装備：weapon＝tool・staff / armor＝light・robe / charm＝charm。
習得：Lv1 手当の祈り (battle.skill) / Lv5 灯下の庇護 (battle.skill) / Lv10 祓いの光 (battle.skill) / Lv1 くらがり除けの火 (fire.kindling) / Lv5 鎮めの火 (fire.kindling) / Lv10 呼び寄せの火 (fire.kindling) / Lv1 くらがり除けの火 (battle.skill)。
特性：{"lightSaveEvery":3}。節約は成功した移動だけに適用され、灯油は増えません。

### 商人 (merchant)

生存した状態で隊に加わり、割引価格で補給して旅を支える。

成長/Lv：HP 7 / MP 2 / STR 1.5 / VIT 1 / AGI 0.4 / INT 1.8。現在職の加算：なし。
装備：weapon＝tool・dagger / armor＝light / charm＝charm。
習得：Lv1 応急配給 (battle.skill) / Lv5 奮起の指示 (battle.skill) / Lv10 解毒 (battle.skill)。
特性：{"shopDiscount":0.1}。割引は店の購入だけで、重複せず、換金手段もありません。

### 学者 (scholar)

敵を解析して耐性を記録し、解析済みの敵の守りを崩す。

成長/Lv：HP 5.5 / MP 3 / STR 1 / VIT 0.8 / AGI 0.4 / INT 2.6。現在職の加算：なし。
装備：weapon＝staff・tool / armor＝robe / charm＝charm。
習得：Lv1 魔物解析 (battle.skill) / Lv1 灯火の術 (battle.skill) / Lv5 弱点注記 (battle.skill) / Lv10 周辺測量 (map.reveal)。
特性：{"magicPower":1.03}。弱点注記には先行する解析が必要です。

### 祓魔師 (exorcist)

光で攻め、毒を隊全体から取り除いて立て直す。

成長/Lv：HP 6 / MP 2.8 / STR 1.1 / VIT 0.9 / AGI 0.3 / INT 2.4。現在職の加算：なし。
装備：weapon＝staff・sword / armor＝robe・light / charm＝charm。
習得：Lv1 祓いの光 (battle.skill) / Lv1 解毒 (battle.skill) / Lv5 清浄の祈り (battle.skill) / Lv10 聖護の祈り (battle.skill)。
特性：{"elementPower":{"light":1.12}}。光耐性の相手には通常攻撃などへ切り替えます。

### 樹術師 (druid)

毒と根の弱体化で敵の勢いを削り、回復を挟む。

成長/Lv：HP 6.5 / MP 2.6 / STR 1.2 / VIT 1 / AGI 0.3 / INT 2.2。現在職の加算：なし。
装備：weapon＝staff・tool / armor＝robe・light / charm＝charm。
習得：Lv1 毒の刃 (battle.skill) / Lv1 手当の祈り (battle.skill) / Lv5 根の拘束 (battle.skill) / Lv10 救護の祈り (battle.skill) / Lv1 水中行軍 (water.traverse)。
特性：{"healingPower":1.06}。即時火力や重装には向きません。

### 刻印師 (runesmith)

氷と雷を使い分け、刻印で味方の防御と雷耐性を補う。

成長/Lv：HP 7 / MP 2.4 / STR 1.5 / VIT 1.2 / AGI 0.1 / INT 1.8。現在職の加算：なし。
装備：weapon＝tool・staff / armor＝heavy・robe / charm＝charm。
習得：Lv1 氷の符 (battle.skill) / Lv1 雷の符 (battle.skill) / Lv5 護甲刻印 (battle.skill) / Lv10 不動の構え (battle.skill)。
特性：{"damageTaken":0.97}。刻印の重ね掛けで倍率は増殖しません。

### 血術師 (bloodmage)

自分のHPを先払いして闇の術を撃ち、少量を自己回復する。

成長/Lv：HP 7 / MP 2.8 / STR 1 / VIT 0.8 / AGI 0.2 / INT 2.5。現在職の加算：なし。
装備：weapon＝staff・dagger / armor＝robe / charm＝charm。
習得：Lv1 灯火の術 (battle.skill) / Lv5 血の灯 (battle.skill) / Lv10 祓いの光 (battle.skill)。
特性：{"magicPower":1.07}。HPが代償以下なら発動できず、MPも必要です。

### 巡礼者 (pilgrim)

傷を癒やし、隊が消耗したら帰還印の救援費を抑えて戻る。

成長/Lv：HP 7 / MP 2.3 / STR 1.4 / VIT 1.1 / AGI 0.4 / INT 1.7。現在職の加算：なし。
装備：weapon＝staff・tool / armor＝light・robe / charm＝charm。
習得：Lv1 手当の祈り (battle.skill) / Lv5 帰路の祈り (battle.skill) / Lv10 解毒 (battle.skill) / Lv1 旅の回復祈祷 (party.heal)。
特性：{"retreatCost":0.5}。割引は帰還印のみで、敗北時の救援費は変わりません。

## 探索特技13定義

### 周辺測量 (survey)

MP2。現在地の周囲3マスの地形を記録します。鍵・依頼の真相は取得しません。 API: map.reveal。使用場所: dungeon。

### 携行食の調合 (prepare_ration)

MP2と傷薬2個・解毒薬1個を野営糧食1個へ変換します。 API: inventory.convert。使用場所: town / dungeon。

### くらがり除けの火 (kuragari_ward)

篝火の迷宮で携帯松明にくらがり除けの火を灯す。足元・正面の消灯した台座にも探索画面から点火できる。 API: fire.kindling。使用場所: dungeon。

### 鎮めの火 (kindle_calm)

篝火の迷宮で携帯松明に鎮めの火を灯す。足元・正面の消灯した台座にも探索画面から点火できる。 API: fire.kindling。使用場所: dungeon。

### 呼び寄せの火 (kindle_lure)

篝火の迷宮で携帯松明に呼び寄せの火を灯す。足元・正面の消灯した台座にも探索画面から点火できる。 API: fire.kindling。使用場所: dungeon。

### 岩砕き (break_rock)

MP3。正面にある対応する破壊壁を崩し、通路を開きます。 API: wall.break。使用場所: dungeon。

### 余白の開門 (read_path)

MP3。書庫の本から借り、正面の封印に隠れた通路を開きます。 API: archive.unlock。使用場所: dungeon。

### 旅の回復祈祷 (field_prayer)

MP5。生存する隊員全員のHPを18回復。谷の遮断区域では使用できません。 API: party.heal。使用場所: dungeon。

### 庭園薬の調合 (garden_medicine)

MP1と薬効葉2枚・赤い蜜1個から、傷薬2個を作ります。 API: inventory.convert。使用場所: town / dungeon。

### 植物繊維の縄編み (weave_rope)

MP1と植物繊維3個から補修用の縄1個を作ります。 API: inventory.convert。使用場所: town / dungeon。

### 登攀誘導 (climb_route)

立体地形の指定経路で、仲間全員を渡り綱に沿って誘導します。密・閉じた境界・完全水没は通過できません。 API: voxel.traverse。使用場所: dungeon。

### 水中行軍 (water_breath)

MP4。地下水道の探索中、隊全員の移動と呼吸を水没度10まで確保する。 API: water.traverse。使用場所: dungeon。

### 乾かしの火 (dry_clothes)

MP2。水没していない場所で炎を使い、隊全員の濡れを解除する。 API: party.dry。使用場所: town / dungeon。

<!-- /generated:jobs -->

## 1.8.0の登攀誘導

探索特技は11種です。斥候と狩人はLv1でclimb_route（登攀誘導）を使えます。APIはvoxel.traverse、対象はlocation、使用は探索中に限り、MP3を支払う技能者が隊全員を指定経路の終点へ誘導します。経路の空間、境界、水没、終点の足場を検査してから消費します。自由飛行や完全水没の通過を許可する技能ではありません。移動手段と掘削の接続は[立方体地形の仕様](VOXEL_TERRAIN_AND_WATER.md)を参照してください。
