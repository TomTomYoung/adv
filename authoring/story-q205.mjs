import {O,give,set,see,and} from './story-kit.mjs';
import {episode,person,point,worldRoutes} from './kagaribi-kit.mjs';
const s=episode(205,'灰を掻く音','炭焼き見習いノノ',{bench:'炭焼き窯の作業台',ash:'炭焼き窯の灰溜まり'},{bench:point('kagaribi_kilns',5,1),ash:point('kagaribi_kilns',11,5)},'受け継ぐことは、師のやり方を変えないことなのか。');
person(s,'pupil','bench','ノノ','炭焼きの見習い','師の仕事を引き継ぐため、配合板を回収する','板さえあれば同じ炭を焼ける','師から独り立ちを認められないこと','今ある木材は昔と違うと気づいたが、配合を変える許しをまだ求めていない。');
person(s,'master','bench','ダン','引退を決めた炭焼き','失敗した配合を弟子へ押しつけない','失敗を見せなければ弟子は別の道へ行ける','最後の仕事で弟子を危険に巻き込むこと','今の湿った木材に古い配合を使って失敗し、板を灰溜まりへ捨てた。');
s.entity('plate','ash').bool('recovered').bool('told').enum('future','open',['open','revise','preserve','stop']);
s.fact('discard','配合板は失くしたのではなく、今の木材では失敗すると知ったダンが捨てた。');
s.brief='炭焼き見習いが、灰を掻く音のする窯の奥へ落ちた配合板を取り戻したがっている。師匠は探すなと言う。';
s.past=['ダンは乾いた木材用の配合を湿った代替材に使い、炭を崩れさせた。失敗した配合を弟子に継がせたくなくて板を灰溜まりへ捨てた。','灰を掻く音は巣材を探す灰虫による。既存の炉守り討伐や火台の記録とは別件である。'];
s.revealText=s.past.join(' ');s.progression='灰虫を退けるか縄で縁から板を引き上げる。板を持って戻り、変えて継ぐ、見本として残す、焼き方の継承を断るという三つの判断をする。';
s.node('entry','bench',['pupil','master'],'ノノは配合板の輪郭を指で描いた。「あれを見ながらなら、同じように焼ける」。ダンは灰のついた袖を払う。「拾わなくていい」。どちらも、最後に板を触ったのが誰かとは言わなかった。',[
 O('go','灰溜まりへ行き、板と音の正体を確かめる','ash')]);
s.node('ash','ash',[],'灰虫が巣材を掻き寄せている。その下に、角が焦げた配合板が見える。虫を退けて拾うか、縁から縄を掛けて引き上げられそうだ。',[
 O('fight','灰虫を退け、板を拾う','recovered',[give('plate','ash','party'),set('recovered')],{combat:'kagaribi_pests'}),
 O('hook','縄1本を灰溜まりへ渡し、板を引き上げる','recovered',[give('plate','ash','party'),set('recovered')],{cost:{rope:1}})]);
s.node('recovered','ash',[],'配合板を手元へ引き寄せた。裏には「今の木では崩れる」とダンの字で書かれていた。古い手順が正しいかどうかは、板を取り戻しただけでは決まらない。',[
 O('return','配合板を持って作業台へ戻る','talk')]);
s.node('talk','bench',['pupil','master'],'ダンは板の裏を見て、捨てたことを認めた。「同じように焼くな。俺がそれで失敗した」。ノノは板を裏返す。「なら、違うところを教えて」。ダンは、今の材料で試すなら自分の名を成功の保証に使わないことを条件にした。',[
 O('revise','失敗の注記を残し、ノノ自身の試験用として板を渡す','@revise',[give('plate','party','pupil'),set('future','revise')]),
 O('preserve','焼く手順として使わず、昔の仕事の見本として師へ返す','@preserve',[give('plate','party','master'),set('future','preserve')]),
 O('stop','ノノに継承を断る意思を確かめ、板を保管場所へ戻す','@stop',[give('plate','party','bench'),set('future','stop')])]);
s.end('revise','違う炭を焼くために継ぐ','ノノは配合板を受け取り、自分の試験であると書き足した。窯を再開したわけでも、成功したわけでもない。師の失敗を隠さず、変えて使う許しを得た。',and(s.is('recovered'),s.is('future','revise'),s.is('plateAt','pupil')));
s.end('preserve','配合を仕事の記憶として返す','板はダンの手へ戻った。古い配合を今の材料へ使わないという条件が添えられた。「使えないから、なかったことにしなくてもいいか」。ノノは、師の最後の失敗も聞ける距離に残った。',and(s.is('future','preserve'),s.is('plateAt','master'),s.is('told')));
s.end('stop','継がないことを本人が決める','ノノは「今は焼く仕事を継がない」と自分で言い、板を作業台へ置いた。ダンが捨てて選択を奪う代わりに、弟子が選んだ。板は残り、将来まで道を閉じたとは約束しなかった。',and(s.is('future','stop'),s.is('plateAt','bench'),s.is('told')));
s.routeNotes=[['炭焼き窯の作業台','ノノの回収依頼とダンの制止を聞く。'],['炭焼き窯の灰溜まり','灰虫との戦闘に勝つか、縄1本で配合板を引き上げる。敗北・逃走では板を取らない。'],['炭焼き窯の作業台','板を持って戻り、師が捨てた理由を聞く。弟子の試験用、師の記憶、継承を断った保管品として渡し先を決める。']];
// 探索隊への依頼報酬。物語内の給金・立替金・私物とは別に精算する。
Object.assign(s.outcomes.revise,{gold:50,xp:280,gems:24});
Object.assign(s.outcomes.preserve,{gold:120,xp:280,gems:16});
Object.assign(s.outcomes.stop,{gold:70,xp:280,gems:20});
export default worldRoutes(s,[['entry_go','ash'],['recovered_return','bench',{arrive:[see('discard','master'),set('told')]}]]);
