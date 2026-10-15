import {O,give,set,and} from './story-kit.mjs';
import {episode,person,point,worldRoutes} from './kagaribi-kit.mjs';
const s=episode(210,'火を待たない人','祭壇で待つスイ',{altar:'深火の祭壇の手前',rest:'最後の巡回路の道具台',entry:'巡灯路の帰り支度場'},{altar:point('kagaribi_f3',9,7),rest:point('kagaribi_last_patrol',9,9),entry:point('kagaribi_f1',13,1)},'願いがかなうと確かめられないまま、帰ることを選んでもよいか。');
person(s,'widow','altar','スイ','亡夫を待つ人','夫への願いを捨てずに、ここを離れる理由を見つける','先に帰れば夫を見捨てたことになる','待った時間が全て無意味だったと思うこと','深火の蘇生伝承を聞いて来たが、蘇生が起きたところは見ていない。遺体はこの場に持ち込んでいない。');
person(s,'maker','rest','リト','火入れの修理人','直した箱を持ち主へ返す','直る品物があることまで諦めてほしくない','箱を直したことで伝承を保証したと思われること','スイの思い出の箱を預かり、蝶番だけを修理した。深火を移す容器ではない。');
s.entity('letter','widow').entity('box','maker').enum('decision','none',['none','letter','ritual','hope']).bool('consent').bool('boxReturned').bool('home');
s.brief='祭壇の手前で待ち続けるスイに、修理を終えた思い出の箱を受け取りに戻ってほしい。本人が帰ると決められるよう同行する。';
s.past=['スイは夫の死後、深火なら死者を戻すという伝承を聞いて祭壇へ来た。蘇生を見た証人や確かめた手順は得ていない。','リトは預かった思い出の箱の蝶番を直した。箱は深火の容器ではなく、蘇生の道具でもない。'];
s.revealText=s.past.join(' ');s.progression='伝承を実証したと断言せず、手紙を納める、普通の灯で区切りをつける、希望を保って帰るという本人の選択を支える。箱の受取りと入口までの同行を実際に行う。';
s.node('entry','altar',['widow'],'スイは夫への手紙を畳み直していた。「戻るとは、誰も確かめていないんでしょう。でも、私が帰ったあとだったら」。修理人が箱を直して待っていると伝えると、初めて背後の通路を見た。',[
 O('letter','手紙を修理した箱へ納めて持ち帰る提案をする','ready',[set('decision','letter'),set('consent')]),
 O('ritual','蘇生の試みとは分け、普通の灯で待つ時間に区切りをつける','ritual'),
 O('hope','伝承を信じるかは決めず、今日は帰ってよいと伝える','ready',[set('decision','hope'),set('consent')])]);
s.node('ritual','altar',['widow'],'スイは「戻ってくる合図にしないなら」とうなずいた。使うのは探索隊の普通の松明で、祭壇の深火は移さない。火を見てから消すまでを、今日の待ち時間の終わりにする。',[
 O('light','松明1本を使って短く灯し、消してから帰り支度をする','ready',[set('decision','ritual'),set('consent')],{cost:{torch:1}})]);
s.node('ready','altar',['widow'],'スイは手紙を懐へ入れた。「箱を取りに行きます」。それは夫のことを忘れる約束ではなく、いま歩き出す返事だった。修理人は最後の巡回路の道具台にいる。',[
 O('walk','スイと祭壇を離れ、修理人の道具台へ歩く','box')]);
s.node('box','rest',['widow','maker'],'リトは箱の蓋を一度開けて見せた。「直したのは蝶番だけです」。スイは開閉する音を聞いた。夫の帰還を確かめる音ではないが、自分が持って帰れる物の音だった。',[
 O('take','スイ本人に修理した箱を受け取ってもらう','packed',[give('box','maker','widow'),set('boxReturned')])]);
s.node('packed','rest',['widow'],'箱はスイの手に戻った。手紙をしまうと決めた場合は、自分で中へ納める。それ以外なら、手紙は本人が持ったまま帰れる。',[
 O('letter','本人の手で手紙を箱へ納め、巡灯路へ同行する','home',[],{when:s.is('decision','letter')}),
 O('return','手紙の扱いを変えず、スイと巡灯路へ戻る','home',[],{when:{op:'ne',left:s.v('decision'),right:'letter'}})]);
s.node('home','entry',['widow'],'巡灯路の帰り支度場へ着いた。スイは自分の箱を置き、手袋を直した。「今日は帰ります」。亡夫が戻ったという知らせはない。帰ったあと、何を信じるかまで決めたとは言わなかった。',[
 O('letter','手紙を納めた箱と本人の到着を確かめ、同行を終える','@letter',[set('home')],{when:s.is('decision','letter')}),
 O('ritual','普通の灯で区切りをつけた本人の帰路を確かめる','@ritual',[set('home')],{when:s.is('decision','ritual')}),
 O('hope','希望を保ったまま帰る本人を見送り、同行を終える','@hope',[set('home')],{when:s.is('decision','hope')})]);
const arrived=and(s.is('home'),s.is('consent'),s.is('boxReturned'),s.is('widowAt','entry'),s.is('partyAt','entry'),s.is('boxAt','widow'));
s.end('letter','手紙の帰る場所を作る','スイは手紙を箱へ納め、巡灯路まで戻った。箱の中身は故人への言葉で、蘇生の証明ではない。待ち続けることだけを、夫との関係の残し方にしなくてよくなった。',and(arrived,s.is('decision','letter'),s.is('letterAt','box')));
s.end('ritual','今日の灯を自分で終える','普通の松明を灯して消したスイは、修理した箱を持って戻った。儀式が夫へ届いたとは確かめていない。それでも、今日の待ち時間を自分で終える行為は、本人が選んで済ませた。',and(arrived,s.is('decision','ritual'),s.is('letterAt','widow')));
s.end('hope','信じる答えを保留して帰る','スイは伝承への望みを捨てると約束せず、箱と手紙を持って戻った。帰ることを、夫を見捨てた証拠にはしなかった。深火が死者を戻すかどうかは、依然として確かめられていない。',and(arrived,s.is('decision','hope'),s.is('letterAt','widow')));
s.routeNotes=[['深火の祭壇の手前','手紙を箱へ納める、普通の松明1本で待つ時間を区切る、希望を保って帰る、のいずれかを本人と決める。'],['最後の巡回路の道具台','本人と歩き、修理人から箱を本人へ返してもらう。手紙を納める経路では箱の内側へ保持先を移す。'],['巡灯路の帰り支度場','スイと実際に入口側へ戻って同行を完了する。深火の取得や蘇生成功は処理しない。']];
export default worldRoutes(s,[['ready_walk','rest',{companions:['widow']}],['packed_letter','entry',{companions:['widow'],depart:[give('letter','widow','box')]}],['packed_return','entry',{companions:['widow']}] ]);
