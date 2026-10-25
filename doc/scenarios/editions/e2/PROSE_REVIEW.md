# 仲間連作第2版の文章レビュー

[連作の入口](COMPANION_QUESTS.md)。[適用したモデル](../../PROSE_MODEL_V1.md)と[構造点検](../../PROSE_CHECKLIST.md)。

8人80件の依頼、現場、全162分岐の実行・結果・帰還を作者自身が点検した。盲検の試読や実読者の感想ではなく、読み順と状態・因果の整合を確認した記録。初稿と置換は [prose-revisions.mjs](../../../../authoring/editions/e2/companions/prose-revisions.mjs) で保存し、対象の一致件数が一件でない場合は生成を拒否する。

## 作品群の確認

救助・捜索・弔い・労働・信仰・踏査・実験・栽培を分けた。全件を真相暴露や罰のある選択にはせず、固定過去の悲劇と選択後に変わる結果を区別した。短編の拠点往復という共通形式は残る。新しい戦闘や迷宮の階層追加はこの80件の実装に含まれない。

ニオの三勢力の支援とミカの先行試験は後続の選択可否に作用する。他の選択の多くは各件の解決・人物の返答・保存されたoutcomeに作用し、独立した都市経済やNPC行動AIを動かすものではない。

## 修正箇所

### q211 濡れていない手配書

初稿：女将が見たのは横顔だけだ。

第2版：女将が見たのは横顔だけで、手配書の傷までは確かめていない。

理由・変更範囲：誤認の根拠を、単に確認不足とするのでなく目撃範囲で示す。

### q213 欠けた留め金

初稿：足場の留め金が一本折れている。

第2版：排水樋の上に渡した足場で、留め金が一本折れている。

理由・変更範囲：足場と樋の位置関係を先に確定する。

### q214 小さな靴の行き先

初稿：靴は姉へ返す箱に入れる。

第2版：アダは姉へ返す靴を、売り物から分けた箱に入れる。

理由・変更範囲：何を誰が分けるかと箱の所属を明示する。

### q216 救われた男の証言

初稿：男は眠りが浅く、質問のたびに扉を見る。

第2版：男はほとんど眠れていないという。質問のたびに、施療院の扉へ目を向ける。

理由・変更範囲：観察できる動作と本人の申告を分ける。

### q218 宛名のない修理代

初稿：金と札を一緒に押さえれば、修理は先送りになる。

第2版：職人は今すぐ修理代が要る。代わりの金を用意せず荷物ごと預かれば、修理は先送りになる。

理由・変更範囲：立替の選択肢があるのに必ず延期になると断定しない。

### q220 次の朝に待つもの

初稿：送り主は名を書いていない。

第2版：便りに送り主の名はない。会えるという話を、アダはまだ誰にも確かめていない。

理由・変更範囲：匿名の情報と確実な面会予定を区別する。

### q221 初めて任せる便り

初稿：届け先は荷揚げ場の炊事係。

第2版：届け先は荷揚げ場の炊事係だ。炊事係は帰郷できない年には、この便を待っているという。

理由・変更範囲：選択前に包みを待つ人の生活を示す。新規の局所設定を一文追加。

### q222 空の寝床を捜す

初稿：他の組にさらわれたのではと苛立っている。

第2版：他の組にさらわれたのではないかと苛立っている。最後に本人を見た者には、まだ話を聞けていない。

理由・変更範囲：誘拐の疑いを事実として読ませず、調査をする理由へつなぐ。

### q225 名前の縫われた上着

初稿：上着だけで弔いを始めないでほしいと頼まれた。

第2版：「上着が見つかっただけなら、まだ捜してほしい」と家族に頼まれた。

理由・変更範囲：依頼人の具体的な希望を、受動的な要約から本人の言葉へ戻す。

### q227 壁灯までの配達

初稿：応援がなければ、避難者の荷を預かって二往復すればよい。

第2版：応援がなければ、避難者の荷を灯のある待避場所に預け、油を先に運んでから取りに戻れる。

理由・変更範囲：二往復の順序と、荷を放置しない場所を選択前に示す。

### q229 窓口を奪う者

初稿：煤鼠団が救援便で名を上げる一方、

第2版：煤鼠団の配達仕事が増える一方、

理由・変更範囲：q227で他組や自力を選んだ経路に、煤鼠団の救援実績を混ぜない。

### q230 地下街の朝の便

初稿：当番でない友人を誘い、

第2版：当番表を確かめ、今日は受付に入らない友人を誘い、

理由・変更範囲：友人が仕事を放棄して配達へ出たという読みを防ぐ。

### q231 祈りを断る患者

初稿：施療院の係は改宗と治療を一緒に案内していたが、

第2版：患者によると、施療院の係は改宗の申込みと治療の受付を続けて説明したという。セラが受付の決まりを確かめると、

理由・変更範囲：患者の体験、係の意図、制度上の条件を混同しない。

### q234 杭を打つ前に

初稿：セラは裁定の権限を持つ司祭へ会う。

第2版：セラは、現地で裁定を見直せる司祭との面会を取りつけた。

理由・変更範囲：出発前に現地での面会を済ませたように読ませない。

### q237 止められなかった晩

初稿：弟子は術具を置いたが、許したとは言わなかった。

第2版：弟子は術具を地面へ置いた。「あいつらを許したわけじゃない」。

理由・変更範囲：身体の行為から、本人が引き受けていない和解へ飛ばない。

### q238 灰を洗う水

初稿：子供を犠牲にした術者の弟子

第2版：子供を犠牲にしようとした術者の弟子

理由・変更範囲：q233の両経路で子供は救出されている。後続の固定過去をその事実と合わせる。

### q240 どちらにも返す鍵

初稿：セラは林の世話役と教会の担当者を招く。

第2版：セラは林の祠で話し合う場を設け、世話役と教会の担当者に来てもらうことにした。

理由・変更範囲：依頼の始まる施療院と、移動先の会合場所を分ける。

### q242 同じ棚の違う朝

初稿：壁は動かない。

第2版：棚がずれた後も、外壁の亀裂は同じ位置に見えた。

理由・変更範囲：世界全体の法則を一度の観察で断定せず、使える観測結果を示す。

### q244 濡れた頁の順番

初稿：一群は未知の術式の稿本、もう一群は地域の出生と死亡の記録だ。

第2版：床の左側には未知の術式の稿本が広がり、配管の下には地域の出生と死亡の記録が張り付いている。

理由・変更範囲：二群の書類と漏水箇所の位置関係を選択前に確定する。

### q245 返却口の向こう

初稿：通路は踏査図にない。

第2版：通路は踏査図にない。イルは受付から点検工具を借り、返却口を調べる支度をした。

理由・変更範囲：現場の選択後に受付の工具が突然現れないよう、出発時に取得する。

### q247 余白に住む訂正者

初稿：訂正は正確だ。

第2版：イルが歩いて確かめた曲がり角では、訂正後の図が実際の道と合っている。

理由・変更範囲：他の訂正まで全面的に保証せず、確認した範囲を示す。

### q250 踏破図の空白

初稿：今回許可された書庫区画の最後の扉に着く。イルは扉の向こうから風が来るのを感じた。ここまでの踏査を完了と報告する準備ができている。

第2版：受付で、イルは今回許可された区画の端を図で確かめた。まだ通っていない扉が一つ残っている。今日はその扉までの帰路を確かめ、区画の踏査を終える予定だ。

理由・変更範囲：到着前の受付で、未到達の扉を実際に見たことにしない。

### q251 昼の避難訓練

初稿：前を見えない者が押し始める。

第2版：列の後方では、荷車が止まったことが見えない。前が空いたと思った住民役が、押して進もうとする。

理由・変更範囲：文法と動作主を直し、押す理由を現場の見え方で示す。

### q254 灯を盗んだ子

初稿：家の油がなく、弟が暗いと泣くからだと言う。

第2版：「家の灯が消えると弟が泣く。油を買いたかった」と子供は言った。

理由・変更範囲：売る行為と家で必要な物の関係を本人の言葉で結ぶ。

### q258 火の外の人影

初稿：呼びかけへ応じるかどうかも分からない。

第2版：見張りの呼び声に影が向きを変えた。しかし名前に応じたのか、音に反応しただけなのかは分からない。

理由・変更範囲：本人性を断定せず、呼び返したくなる具体的な観測を与える。

### q260 備えを渡す日

初稿：訓練場で若い隊員たちが柵を並べている。今日はベルグが指図しない番だ。

第2版：訓練場から、若い隊員たちの準備ができたと知らせが来た。ベルグは今日は指図せずに見ようと、詰所を出る支度をした。

理由・変更範囲：開始地点と訓練場を分け、移動前の現在地を保つ。

### q261 救助の請求書

初稿：共同救済費への申請もできるが、本人の状況を窓口へ伝える必要がある。

第2版：共同救済費への申請もできる。ただし、収入と休業の事情を審査窓口へ伝える必要がある。

理由・変更範囲：曖昧な状況の開示を、選択に必要な情報へ具体化する。

### q264 空になった薬箱

初稿：身内だけで伏せれば、欠品の理由は報告に残らない。

第2版：買い戻しただけでは、どの出動で包帯が足りなかったかを隊は調べられない。

理由・変更範囲：単に報告を正義とするのでなく、報告が必要な救助上の理由を示す。

### q266 知らせを望まない家

初稿：本人を確認できる遺体は見つかっていない。

第2版：指輪と一緒に遺体が見つかったわけではない。

理由・変更範囲：存在しない遺体を指すような曖昧さをなくす。

### q268 同僚が置いてきた槍

初稿：取り残された作業員を運ぶためだった。

第2版：同僚は槍を置き、その手で作業員の担架を持ったのだという。

理由・変更範囲：装備を捨てる必要を、身体の動作として説明する。

### q270 次の出動を待つ椅子

初稿：助けられた人へ奉仕を義務づけたくない。

第2版：「出せない人が、次に助けを呼びにくくならないか」。ルカは家族へ、そう尋ねた。

理由・変更範囲：人物の倫理を作者の評価で閉じず、相手に届く問いにする。

### q271 二人分の処方

初稿：トーマは妻の名にも他の患者と同じ印を付け、

第2版：トーマは妻の名の前で一度手を止めた。それから、他の患者と同じ印を付け、

理由・変更範囲：倫理を守る行為から個人的な願いを消さず、手の動きで残す。

### q274 採集者の咳

初稿：口頭で経路を伝え、後で別の人に確認してもらうこともできる。

第2版：道順を口頭で伝え、別の採集者が知っている区間と照らし合わせることもできる。

理由・変更範囲：帰還前に未踏区間まで確認済みになる時間の飛躍を防ぐ。

### q276 燃える夢から戻る人

初稿：信仰を捨てたとは言わない。

第2版：「信じるのをやめたんじゃない」と本人は言った。

理由・変更範囲：トーマの推測と本人の意思を区別する。

### q278 花畑の入口

初稿：奥へ進むと、探していた薬草が一面に咲く場所に出た。トーマは最初に一輪へ手を伸ばし、すぐ止める。入口の蔓には、狂火が残した新しい結び目がある。

第2版：採集者の記録に、奥で薬草が群生する場所がある。トーマは休息所で道標を確かめ、薬を待つ人のために採集袋を整えた。狂火の足跡も奥へ向かっているという。

理由・変更範囲：花畑への到着を実移動後へ移し、準備の場面として始める。

### q278 花畑の入口

初稿：花畑は広いが、採集路は一本の狭い入口へ集まる。

第2版：入口を抜けると、薬草の花が一面に広がっていた。トーマは一輪へ手を伸ばしかけ、蔓の新しい結び目に気づく。狂火の採集者が使う印だ。花畑は広いが、採集路は一本の狭い入口へ集まる。

理由・変更範囲：到着時に発見の喜びと脅威を渡す。草原の情報を出発前から移動後へ移した。

### q279 根を抱えて戻る

初稿：もう一度花畑へ入る。

第2版：もう一度花畑へ向かう支度をした。

理由・変更範囲：休息所にいる時点と入場後の時点を区別する。

### q280 薬になる花を焼くか

初稿：トーマは採集路の入口に立つ。

第2版：トーマは休息所で、採集者たちに退避の準備を頼んだ。これから入口で、花畑をどうするか決めなければならない。

理由・変更範囲：移動前に入口へ立っている描写を直す。

### q281 動くはずのない針

初稿：外の線を外しただけでは止まらない。

第2版：外の線は蓄力部へ力を補うためのものだった。線を外しても、内側に残った力で針が動く。

理由・変更範囲：残留する力と線の機能を先に示し、現象だけで仕組みを済ませない。

### q283 人の手を待つ扉

初稿：ミカは扉を止め、故障箇所を調べる。

第2版：故障の知らせを受けたミカは、まず担当者に扉を固定してもらった。これから収蔵庫で故障箇所を調べる。

理由・変更範囲：移動前の遠隔の指示と現場の調査を分ける。

### q285 測り違えた零

初稿：ミカはq281で得た減衰の記録を使い、

第2版：ミカは最初の計器で測った、針の振れが小さくなるまでの記録を使い、

理由・変更範囲：プレイヤー向け本文から実装IDを除き、実際の経験を参照する。

### q287 古い失敗の展示

初稿：同じ文明が滅びた記録も保管している。

第2版：その文明で制御を失った機械と、被害を記した文書も保管している。

理由・変更範囲：展示で見せる根拠を、抽象的な歴史認識から具体物へつなぐ。

### q289 保管庫の停電

初稿：試験槽の照明用機械が止まった。助手が遺物の発光部を使えば明るくなると言う。

第2版：試験槽から、照明用機械が止まったと連絡が来た。助手は連絡管を通して、遺物の発光部なら使えそうだと提案する。

理由・変更範囲：管理室にいるミカと試験槽の助手の会話経路を示す。連絡管を局所設定として追加。

### q290 開ける人のための封

初稿：ミカは保管箱を並べる。

第2版：ミカは管理室で引継ぎの記録を揃え、保管箱のある収蔵庫へ向かう支度をした。

理由・変更範囲：記録の準備と実物の確認を別の場所として順に渡す。

## 全件の点検対象

1. q211 濡れていない手配書：entry → survey → result_protect → home_protect → result_quiet → home_quiet。修正1箇所。
1. q212 四つの村の風車：entry → survey → result_restore → home_restore → result_renew → home_renew。修正0箇所。
1. q213 欠けた留め金：entry → survey → result_stop → home_stop → result_brace → home_brace。修正1箇所。
1. q214 小さな靴の行き先：entry → survey → result_pay → home_pay → result_sort → home_sort。修正1箇所。
1. q215 父の巡回路：entry → survey → result_split → home_split → result_widen → home_widen。修正0箇所。
1. q216 救われた男の証言：entry → survey → result_private → home_private → result_escort → home_escort。修正1箇所。
1. q217 水音のする階段：entry → survey → result_walk → home_walk → result_carry → home_carry。修正0箇所。
1. q218 宛名のない修理代：entry → survey → result_tag → home_tag → result_hold → home_hold。修正1箇所。
1. q219 夜番の交代：entry → survey → result_watch → home_watch → result_relay → home_relay。修正0箇所。
1. q220 次の朝に待つもの：entry → survey → result_stay → home_stay → result_continue → home_continue。修正1箇所。
1. q221 初めて任せる便り：entry → survey → result_teach → home_teach → result_direct → home_direct。修正1箇所。
1. q222 空の寝床を捜す：entry → survey → result_return → home_return → result_work → home_work。修正1箇所。
1. q223 巻上機の朝飯：entry → survey → result_workers → home_workers → result_porters → home_porters。修正0箇所。
1. q224 薄い灯油：entry → survey → result_recall → home_recall → result_expose → home_expose。修正0箇所。
1. q225 名前の縫われた上着：entry → survey → result_search → home_search → result_relay → home_relay。修正1箇所。
1. q226 白鷺の倉庫証：entry → survey → result_shared → home_shared → result_lease → home_lease。修正0箇所。
1. q227 壁灯までの配達：entry → survey → result_shuttle → home_shuttle → result_mice → home_mice → result_hooks → home_hooks → result_pots → home_pots。修正1箇所。
1. q228 届かせない手紙：entry → survey → result_offer → home_offer → result_return → home_return。修正0箇所。
1. q229 窓口を奪う者：entry → survey → result_reform → home_reform → result_independent → home_independent。修正1箇所。
1. q230 地下街の朝の便：entry → survey → result_network → home_network → result_council → home_council。修正1箇所。
1. q231 祈りを断る患者：entry → survey → result_escort → home_escort → result_visit → home_visit。修正1箇所。
1. q232 焦げた祈り札：entry → survey → result_witness → home_witness → result_shelter → home_shelter。修正0箇所。
1. q233 祠に結ぶ赤い紐：entry → survey → result_escape → home_escape → result_disable → home_disable。修正0箇所。
1. q234 杭を打つ前に：entry → survey → result_public → home_public → result_records → home_records。修正1箇所。
1. q235 二つの弔い歌：entry → survey → result_together → home_together → result_separate → home_separate。修正0箇所。
1. q236 炉の中の約束：entry → survey → result_craft → home_craft → result_bargain → home_bargain。修正0箇所。
1. q237 止められなかった晩：entry → survey → result_stay → home_stay → result_guard → home_guard。修正1箇所。
1. q238 灰を洗う水：entry → survey → result_supervise → home_supervise → result_relocate → home_relocate。修正1箇所。
1. q239 避難所の戸口：entry → survey → result_rooms → home_rooms → result_open → home_open。修正0箇所。
1. q240 どちらにも返す鍵：entry → survey → result_paired → home_paired → result_choice → home_choice。修正1箇所。
1. q241 借りたままの一冊：entry → survey → result_recover → home_recover → result_preserve → home_preserve。修正0箇所。
1. q242 同じ棚の違う朝：entry → survey → result_floor → home_floor → result_wall → home_wall。修正1箇所。
1. q243 声にしてはいけない索引：entry → survey → result_silent → home_silent → result_record → home_record。修正0箇所。
1. q244 濡れた頁の順番：entry → survey → result_both → home_both → result_delegate → home_delegate。修正1箇所。
1. q245 返却口の向こう：entry → survey → result_hatch → home_hatch → result_platform → home_platform。修正1箇所。
1. q246 持ち出せない一文：entry → survey → result_cycle → home_cycle → result_guide → home_guide。修正0箇所。
1. q247 余白に住む訂正者：entry → survey → result_return → home_return → result_contact → home_contact。修正1箇所。
1. q248 二つ目の読書机：entry → survey → result_trace → home_trace → result_identify → home_identify。修正0箇所。
1. q249 奥へ進むための帰り道：entry → survey → result_train → home_train → result_guide → home_guide。修正0箇所。
1. q250 踏破図の空白：entry → survey → result_mark → home_mark → result_threshold → home_threshold。修正1箇所。
1. q251 昼の避難訓練：entry → survey → result_signal → home_signal → result_shed → home_shed。修正1箇所。
1. q252 友の持っていた笛：entry → survey → result_keep → home_keep → result_survey → home_survey。修正0箇所。
1. q253 消えない影の報告：entry → survey → result_barrier → home_barrier → result_evacuate → home_evacuate。修正0箇所。
1. q254 灯を盗んだ子：entry → survey → result_room → home_room → result_oil → home_oil。修正1箇所。
1. q255 笑う見学者：entry → survey → result_model → home_model → result_refuse → home_refuse。修正0箇所。
1. q256 怖いと言える番：entry → survey → result_pair → home_pair → result_desk → home_desk。修正0箇所。
1. q257 ふさがる避難倉庫：entry → survey → result_lane → home_lane → result_empty → home_empty。修正0箇所。
1. q258 火の外の人影：entry → survey → result_retreat → home_retreat → result_screen → home_screen。修正1箇所。
1. q259 同じ夜を知る者：entry → survey → result_testimony → home_testimony → result_procedure → home_procedure。修正0箇所。
1. q260 備えを渡す日：entry → survey → result_observe → home_observe → result_coach → home_coach。修正1箇所。
1. q261 救助の請求書：entry → survey → result_instalments → home_instalments → result_fund → home_fund。修正1箇所。
1. q262 名乗る救助者：entry → survey → result_caller → home_caller → result_brace → home_brace。修正0箇所。
1. q263 閉じる道の暮らし：entry → survey → result_detour → home_detour → result_relocate → home_relocate。修正0箇所。
1. q264 空になった薬箱：entry → survey → result_report → home_report → result_confess → home_confess。修正1箇所。
1. q265 先に来た金貨：entry → survey → result_parallel → home_parallel → result_widen → home_widen。修正0箇所。
1. q266 知らせを望まない家：entry → survey → result_deposit → home_deposit → result_permission → home_permission。修正1箇所。
1. q267 名の載らない荷役：entry → survey → result_lower → home_lower → result_passage → home_passage。修正0箇所。
1. q268 同僚が置いてきた槍：entry → survey → result_repair → home_repair → result_hook → home_hook。修正1箇所。
1. q269 最後の一人を数える：entry → survey → result_entry → home_entry → result_compare → home_compare。修正0箇所。
1. q270 次の出動を待つ椅子：entry → survey → result_store → home_store → result_meal → home_meal。修正1箇所。
1. q271 二人分の処方：entry → survey → result_sort → home_sort → result_return → home_return。修正1箇所。
1. q272 痛みを忘れる粉：entry → survey → result_ward → home_ward → result_visit → home_visit。修正0箇所。
1. q273 火を見つめる客：entry → survey → result_clinic → home_clinic → result_watch → home_watch。修正0箇所。
1. q274 採集者の咳：entry → survey → result_short → home_short → result_map → home_map。修正1箇所。
1. q275 捨てられた植木鉢：entry → survey → result_pot → home_pot → result_wrap → home_wrap。修正0箇所。
1. q276 燃える夢から戻る人：entry → survey → result_shelter → home_shelter → result_local → home_local。修正1箇所。
1. q277 同じ根の違う使い道：entry → survey → result_trial → home_trial → result_stewards → home_stewards。修正0箇所。
1. q278 花畑の入口：entry → survey → result_survey → home_survey → result_talk → home_talk。修正2箇所。
1. q279 根を抱えて戻る：entry → survey → result_nursery → home_nursery → result_carry → home_carry。修正1箇所。
1. q280 薬になる花を焼くか：entry → survey → result_burn → home_burn → result_coexist → home_coexist。修正1箇所。
1. q281 動くはずのない針：entry → survey → result_measure → home_measure → result_seal → home_seal。修正1箇所。
1. q282 帝国製の手引き：entry → survey → result_compare → home_compare → result_separate → home_separate。修正0箇所。
1. q283 人の手を待つ扉：entry → survey → result_test → home_test → result_manual → home_manual。修正1箇所。
1. q284 温かな石の箱：entry → survey → result_partition → home_partition → result_outside → home_outside。修正0箇所。
1. q285 測り違えた零：entry → survey → result_isolate → home_isolate → result_calibrate → home_calibrate。修正1箇所。
1. q286 部品を取り戻す値段：entry → survey → result_buy → home_buy → result_claim → home_claim。修正0箇所。
1. q287 古い失敗の展示：entry → survey → result_failure → home_failure → result_voices → home_voices。修正1箇所。
1. q288 水を運ぶ古い腕：entry → survey → result_remote → home_remote → result_fixed → home_fixed。修正0箇所。
1. q289 保管庫の停電：entry → survey → result_pause → home_pause → result_warm → home_warm。修正1箇所。
1. q290 開ける人のための封：entry → survey → result_labels → home_labels → result_handover → home_handover。修正1箇所。

修正0箇所の件も本文と選択後の結果を確認対象に含めた。自動試験が保証するのは経路・状態・費用・保存・条件付き支援であり、文章の感情的効果を保証するものではない。
