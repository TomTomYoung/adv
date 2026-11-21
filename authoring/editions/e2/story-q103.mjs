import {O,set,give,and} from '../../story-kit.mjs';
import {canalQuest} from './canal-quarter.mjs';

export default canalQuest(103,{
  pot:['炊き出しの配膳口','鍋の横で券を集める。','location_tavern'],
  inn:['隣の食堂','仕込みの台に昨日の献立が残っている。','location_tavern'],
  bench:['運河沿いの腰掛け','配膳を待つ人が腰を下ろす場所。'],
  kitchen:['炊き出しの仕込み場','二店で鍋と食材を持ち寄れる調理場。','location_tavern']
},{nil:['見習いニル','pot','券と皿を数えて配膳する'],toma:['料理人トマ','pot','受け取る人の希望と明日の材料を確かめる'],host:['隣の食堂の女将','inn','店の仕事を保ちながら老人に食事を届けたい'],elder:['申請を待つ老人','bench','自分が頼んだ欄だけ代筆してもらいたい']},(s,scene)=>{
  const again={once:false};s.entity('form','elder');s.bool('asked').bool('paid').bool('stopped').bool('filed').bool('shared');
  scene('entry','pot',['nil','toma'],'ニルが一枚ずつ食券を光にかざした。最後の一枚だけ、裏から隣の食堂の献立が読める。トマは鍋を見た。「仕込みを分けるなら、調理場はうちが出すよ。でも、材料はどこかで帳尻を合わせないとね」',[O('source','隣の食堂を訪ねる','inn'),O('stop','券を照合する','stop')]);
  scene('inn','inn',['host'],'女将は献立をしまった。「それで、今日の鍋は足りるの？」。字を書けず申請できない人がいる。券を止めるほかに、本人に希望を聞く道と、二店で仕込みを分ける道がある。',[
    O('consent','本人を訪ねる','elder',[],again),O('join','仕込み場へ','joint',[],{...again,companions:['host']}),O('stop','配膳口で照合','stop')]);
  scene('elder','bench',['elder'],'「身の上まで皆に書いてやる気はない。食事の申請だけ、頼めるか」。老人は名前の欄を指し、用紙を膝に置いた。',[
    O('write','申請だけを預かる','write',[set('asked'),give('form','elder','party')]),O('back','相談に戻る','inn',[],again)]);
  scene('write','pot',['nil','toma'],'持ち帰った用紙には本人に頼まれた欄だけが開いている。トマが受け取り、ニルがその名を記した券を皿の横に置く。',[O('file','申請を届ける','@write',[give('form','party','toma'),set('filed')])]);
  scene('joint','kitchen',['host'],'トマが貸すと言った調理場で、女将が前掛けを結んだ。「仕込みはうちの仕事にしておくれ。明日からの手間賃も帳面にね」今日の一鍋を始めるには野営糧食が一つ足りない。',[
    O('food','糧食を一つ渡す','paid',[set('paid')],{cost:{ration:1}}),O('back','食堂へ引き返す','inn',[],{...again,companions:['host']})]);
  scene('paid','kitchen',['host'],'今日の分が鍋に入った。女将は火を見ながら、翌日以降の仕込みを誰が受け持つか、配膳口の帳面にも書いておくよう頼んだ。',[O('roster','配膳口へ','roster')]);
  scene('roster','pot',['toma','nil'],'トマは店に払う仕込み代を記し、明日の当番表を鍋の横に置いた。空いている欄には線を引かずにおく。',[O('record','当番表を置く','@joint',[set('shared')])]);
  scene('stop','pot',['toma','nil'],'ニルが食券の束を取り出した。一枚ずつ照合すれば数は合う。老人の分にとっておいた皿は、まだ配膳口にある。',[O('check','券を照合する','@stop',[set('stopped')])]);
  return {stop:s.is('stopped'),write:and(s.is('asked'),s.is('filed'),s.is('formAt','toma')),joint:and(s.is('paid'),s.is('shared'))};
});
