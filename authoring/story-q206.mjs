import {O,give,set,and} from './story-kit.mjs';
import {episode,person,point,worldRoutes} from './kagaribi-kit.mjs';
const s=episode(206,'渡せなかった弁当','差し入れを持つミナ',{entry:'巡灯路の差し入れ台',rest:'中継火の休息所脇'},{entry:point('kagaribi_f1',7,1),rest:point('kagaribi_relay',5,5)},'帰ってほしい気持ちを、仕事を続けろという要求にしてしまわず届けられるか。');
person(s,'sister','entry','ミナ','炊事場で働く姉','弟へ食事を届ける','弟は今日も勤務を続けている','世話を断られ、関係まで切れたと思うこと','弟が退職を申し出たことは知らない。弁当は勤務の対価ではなく差し入れ。');
person(s,'worker','rest','ナギ','退職を申し出た火運び','姉に辞めたことを自分で伝える','弁当を受け取れば仕事を続ける約束になる','心配を裏切ったと責められること','当番を終えて退職を申し出た。今は中継広間で帰る決心がつかずにいる。');
s.entity('meal','sister').bool('explained').bool('resignationTold').enum('delivery','none',['none','gift','returned','together']);
s.brief='ミナが弟のナギへ弁当を届けたがっている。弟は勤務を終えたはずなのに、中継広間から上がってこない。';
s.past=['ナギは当番を終えて退職を申し出たが、姉にはまだ話していない。','ミナは勤務継続を条件にせず弁当を作った。中断中に腐敗や勤務の締切は進めない。'];
s.revealText=s.past.join(' ');s.progression='弁当を預かって弟へ届ける。受け取る意味を確かめ、贈り物として渡す、本人と一緒に戻る、断られたまま返すという異なる帰結を扱う。';
s.node('entry','entry',['sister'],'ミナは包みの結び目を一つ緩めた。「手袋でも開けられるように」。弟がまだ勤務中だと思っている。「返事まで頼むつもりはありません。食べられるなら渡してください」',[
 O('carry','弁当を預かり、中継広間のナギへ届ける','offer')]);
s.node('offer','rest',['worker'],'ナギは包みに触れなかった。「辞めたんです。もらったら、明日も行くってことになる」。当番の引継ぎは済ませたという。帰れないのは道が塞がれたからではなかった。',[
 O('gift','姉は勤務継続を条件にしていなかったと、受け取った言葉を伝える','gift',[set('explained')]),
 O('together','弁当を持ったまま、ナギが自分で話せるよう一緒に入口へ戻る','home'),
 O('return','受取りを断ったことだけを伝えると約束し、弁当を返しに行く','returned')]);
s.node('gift','rest',['worker'],'「続けろとは言ってなかった？」。ミナが実際に言った頼みを伝えると、ナギは結び目の緩んだところへ指を掛けた。「なら、食べたい。辞めた話は、自分でします」',[
 O('hand','仕事の約束にせず、受取りに同意したナギへ弁当を渡す','@gift',[give('meal','party','worker'),set('delivery','gift')])]);
s.node('home','entry',['sister','worker'],'二人でミナの前へ戻った。包みはまだ探索隊が持っている。ナギが先に口を開いた。「明日は、行かない」。ミナは結び目を見てから、弟の顔を見た。「じゃあ、今日はここで食べれば」',[
 O('hand','退職を伝えた本人へ、姉の前で弁当を渡す','@together',[give('meal','party','worker'),set('resignationTold'),set('delivery','together')])]);
s.node('returned','entry',['sister'],'弁当を持ち帰ると、ミナは包みの重さを受け止めるように手を出した。ナギの退職理由を説明する約束はしていない。「受け取らなかった。それだけは、分かった」',[
 O('hand','受取りを断られたことを伝え、弁当をミナへ返す','@returned',[give('meal','party','sister'),set('delivery','returned')])]);
s.end('gift','差し入れを仕事の約束にしない','弁当はナギの手へ渡った。退職を姉へ伝える役目は本人に残した。「食べたい」と言えたことと、明日も働くことを同じ返事にしなかった。',and(s.is('delivery','gift'),s.is('explained'),s.is('mealAt','worker'),s.is('workerAt','rest')));
s.end('together','食べる場所を一緒に戻す','ナギは自分で退職を伝え、入口で弁当を受け取った。ミナが仕事探しまで引き受けたわけではない。それでも、明日の勤務の話をしなくても、一緒に食べる場所は残った。',and(s.is('delivery','together'),s.is('resignationTold'),s.is('workerAt','entry'),s.is('mealAt','worker')));
s.end('returned','拒まれたという返事を持ち帰る','弁当はミナへ戻った。弟の代わりに事情を告白せず、受取りを断ったという返事だけを伝えた。姉の心配は解けていない。ナギにも、黙ったままで済んだという保証は与えなかった。',and(s.is('delivery','returned'),s.is('mealAt','sister'),s.is('workerAt','rest'),s.is('partyAt','entry')));
s.routeNotes=[['巡灯路の差し入れ台','ミナから弁当を預かる。'],['中継火の休息所脇','ナギの退職と受取りをためらう理由を聞く。贈り物として渡す経路はここで完了する。'],['巡灯路の差し入れ台','同行を選んだ場合はナギと戻って本人が退職を伝える。返却を選んだ場合は探索隊だけで弁当を返す。']];
export default worldRoutes(s,[['entry_carry','rest',{depart:[give('meal','sister','party')]}],['offer_together','entry',{companions:['worker']}],['offer_return','entry']]);
