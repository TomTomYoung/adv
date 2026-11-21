import {story,O,set,see,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

const sites={box:['巻上機の納付口',12,9],office:['部品帳と秤の窓口',11,9],lower:['下の担架乗場',13,9],upper:['上の荷受け桟橋',13,7]};
const roles={
  mori:['深層組合のモリ','修理費を確保し、救助を待つ人を上へ送る。'],
  clerk:['巻上機の徴収係','秤と納付箱の額を照合して巻上機を運転する。'],
  wounded:['帰還を待つ負傷者たち','担架と一緒に巻上機に乗り、上の桟橋で救助を受ける。']
};
const person=id=>'e2_q094_'+id;
export const taxCharacters=Object.fromEntries(Object.entries(roles).map(([id,[name,goal]])=>[
  person(id),{id:person(id),name,goal,detail:goal,quests:['q094']}
]));

export function returnTaxSource(){
  const places=Object.fromEntries(Object.entries(sites).map(([id,[name]])=>[id,name]));
  const s=story(94,places,[]),is=s.is;
  s.entity('mori','office',person('mori')).entity('clerk','office',person('clerk')).entity('wounded','lower',person('wounded'));
  s.enum('payment','none',['none','advance','afterReview'],'待機者分30Gをいつ受領したか');
  s.enum('tariff','flat',['flat','shared','freeToday'],'人と荷の料金をどう扱うか');
  s.enum('rescue','waiting',['waiting','aboard','ashore'],'乗場で待機・籠に乗った・上で降りた');
  s.bool('guardStopped',false,'徴税の番機が戦闘で停止した');
  s.bool('receiptFiled',false,'モリが30Gの立替を記帳した');
  s.fact('costs','納付箱から修理部品を買う一方、負傷者の担架にも宝物と同じ重量税が掛かっていた。');
  const paid=not(is('payment','none')),ashore=is('rescue','ashore'),shared=is('tariff','shared');
  const eligible=condition=>({when:condition,visibleWhen:condition});
  function scene(id,place,actors,text,options,requires=true){
    s.node(id,place,actors.map((entity,i)=>({entity,when:is(entity+'At',place),
      display:{x:actors.length===1?50:[28,72][i],y:10,scale:1,cardScale:1,layer:i}})),text,options,requires);
  }
  const desk=['mori','clerk'],riders=['wounded'];
  scene('entry','box',[],'空の籠が戻ってきたのに、下から上げてくれと声がする。納付口の針は「担架分、三十」。歯車は回っている。番機だけが籠の掛け金を押さえたままだ。隣の窓口から、油のにじんだ部品帳が見える。',[
    O('advance','立替','paidBox',[set('payment','advance')],{cost:{gold:30}}),
    O('cost','帳簿を見る','books'),O('free','番機戦','stopped',[set('guardStopped')],{combat:'guard_10',combatRequirement:'要勝利'})
  ]);
  scene('paidBox','box',[],'最後の一枚が箱に落ちると、待機札に三十の受領印がついた。掛け金が上がる。担架を呼ぶ綱はまだ揺れていない。乗場へ行けば、この一便を出せる。',[
    O('board','下の乗場へ','board')
  ],is('payment','advance'));
  scene('books','office',desk,when(ashore,
    '上の桟橋から届いた到着札を、モリが待機欄から外した。徴収係は空いたところに次の担架を描く。「明日この人が無一文なら、またここで止まります」',
    '徴収係が納品書を開く。昨日の入金の横には、同額の軸受を買った印があった。モリの待機欄には、担架に載った人の番号だけが残っている。'),[
    O('inspect','重さ表を照合','budget',[see('costs','clerk')])
  ]);
  scene('budget','office',desk,when(ashore,
    '徴収係は、すでに上げた担架の三十に線を引いた。「この便は精算済みです」。隣の欄で、人を上げる費用と、宝物を量って運ぶ費用を分けて試算できる。',
    '空の担架と鉱石袋に同じ分銅を載せると、どちらにも同じ額が出た。モリは二つの欄を引く。救助便は組合の共同費へ、宝物は実際の荷重へ。この分け方なら軸受代も残る。'),[
    O('change','料金を改定','adopted',[set('tariff','shared')]),
    O('pay','本日分','paidDesk',[set('payment','afterReview')],{...eligible(not(paid)),cost:{gold:30}}),
    O('leave','立替を記帳','receipt',[],eligible(is('payment','advance')))
  ],s.known('costs'));
  scene('paidDesk','office',desk,'徴収係が窓口側から納付箱に三十を入れた。モリは今日の担架にだけ受領印を押す。明日の料金表はそのままだ。まだ下にいる人を迎えに行く。',[
    O('board','下の乗場へ','board')
  ],is('payment','afterReview'));
  scene('adopted','office',desk,when(ashore,
    'モリが新しい表を綴じた。今日の三十は受領済みの行に一度だけ残り、次の担架からは共同費の行に入る。上の桟橋からは全員を受け取ったという札が戻っている。',
    '徴収係が人用の鉤から料金札を外し、荷鉤の下にだけ分銅を残した。モリが救助便の共同費を帳簿に開く。最初にその欄を使う担架は、まだ下で待っている。'),[
    O('board','下の乗場へ','board',[],eligible(not(ashore))),
    O('file','新表を登録','@informed',[],eligible(ashore))
  ],shared);
  scene('stopped','box',[],'番機の車輪が止まり、納付箱の投入口が暗くなった。籠を動かす巻上機は別の軸で回っている。止まった爪から掛け金を外せば、今日は無銭で籠を使える。',[
    O('open','掛け金を外す','opened',[set('tariff','freeToday')])
  ],is('guardStopped'));
  scene('opened','box',[],'納付口に今日の開放札を掛けた。荷運びたちが空の籠を下へ返す。修理部品の次の支払先を決める欄は、まだ空いている。',[
    O('board','下の乗場へ','board')
  ],is('tariff','freeToday'));
  scene('board','lower',riders,'下の乗場で、最初の担架が毛布の端を籠に掛けて待っていた。空いたところに次の担架を寄せる。車輪が縁に引っかからないように、一行が渡し板を押さえた。',[
    O('load','全員を乗せる','aboard',[set('rescue','aboard')])
  ],and(is('rescue','waiting'),or(paid,shared,is('tariff','freeToday'))));
  scene('aboard','lower',riders,'最後の担架が籠に収まり、下の乗場から合図の綱が二度引かれた。受け手がいるのは上の桟橋だ。',[
    O('rise','籠と上へ','landing')
  ],is('rescue','aboard'));
  scene('landing','upper',riders,'籠が桟橋と同じ高さで止まった。担架の留め帯はまだ掛かっている。渡し板を桟橋へ倒し、一人ずつ毛布を受け取ってもらう。',[
    O('unload','全員を降ろす','returned',[set('rescue','ashore')])
  ],is('rescue','aboard'));
  scene('returned','upper',riders,when(is('payment','advance'),
    '空の籠が下へ戻る。上の係が到着札を返した。受領印と札を窓口へ持っていけば、今日払った分だけを記録できる。明日も人を上げられるよう、重さ表を調べる道もある。',
    when(shared,'上の係が全員を数えた。救助便の共同費で最初の担架を上げた印が、荷物の目方とは別の欄に入る。',
    when(is('guardStopped'),'納付口を通った人が肩を貸し合って桟橋を空けた。今日は無料で上がれた。籠の軸受を来週どう買うか、下の係が相談を始めている。','モリへ返す到着札に、最後の担架の番号が入った。今日の三十と突き合わせて、立替を一度だけ記帳できる。'))),[
    O('receipt','立替を記帳','receipt',[],eligible(paid)),O('reform','重さ表へ','books',[],eligible(is('payment','advance'))),
    O('file','窓口へ戻る','adopted',[],eligible(shared)),O('finish','開放を報告','@contract',[],eligible(is('tariff','freeToday')))
  ],ashore);
  scene('receipt','office',desk,'モリは到着札と納付箱の受領印を重ねた。待機欄から消えた番号と、立替の三十が合う。帳簿にその額と便名を一行だけ残す。',[
    O('record','三十を記帳','@compromise',[set('receiptFiled')])
  ],and(ashore,paid));
  const world=Object.fromEntries(Object.entries(sites).map(([id,[,x,y]])=>[id,{kind:'dungeon',dungeon:'region_10',map:'region_10_f1',event:'q094_tax_'+id,x,y}]));
  const journey=connectWorld(s,world,1);
  journey('entry_cost','office');journey('paidBox_board','lower');journey('paidDesk_board','lower');
  journey('adopted_board','lower');journey('opened_board','lower');journey('aboard_rise','upper',{companions:['wounded']});
  journey('returned_receipt','office');journey('returned_reform','office');journey('returned_file','office');
  s.story.endings={informed:and(shared,s.known('costs'),ashore),contract:and(is('tariff','freeToday'),is('guardStopped'),ashore),
    compromise:and(ashore,paid,is('receiptFiled'),is('tariff','flat'))};
  s.invariant('paid',or(not(paid),and(not(is('guardStopped')),or(not(is('payment','afterReview')),s.known('costs')))),'立替は番機戦と別であり、窓口での支払いには照合が先行する');
  s.invariant('shared',or(not(shared),and(s.known('costs'),not(is('guardStopped')),not(is('payment','afterReview')))),'新表は費用を照合してから登録する');
  s.invariant('open',or(not(is('tariff','freeToday')),is('guardStopped')),'番機に勝ってから開放する');
  s.invariant('rescue',or(and(is('rescue','waiting'),is('woundedAt','lower')),
    and(is('rescue','aboard'),or(is('woundedAt','lower'),is('woundedAt','transit'),is('woundedAt','upper'))),
    and(ashore,is('woundedAt','upper'))),'降ろした担架は上の桟橋に残る');
  s.invariant('passage',or(is('rescue','waiting'),paid,shared,is('tariff','freeToday')),'立替・制度変更・開放のいずれかで担架を乗せる');
  s.invariant('receipt',or(not(is('receiptFiled')),and(ashore,paid,is('tariff','flat'))),'到着と支払いの両方を確認して立替を記帳する');
  return s.done();
}
