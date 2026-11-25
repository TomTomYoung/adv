import {O, and, give, not, or, set, when} from '../../story-kit.mjs';
import {facilityQuest} from './facility-quest.mjs';

export const pass = {
  id:'e2_wagon_pass', parent:'e2_cart_surface', name:'農具返却の峠道', background:'location_square', links:[],
  description:'廃坑の搬出口で荷車が出発を待つ。本道と川の渡しは、峠の検問で合流する。'
};

const wagonQuest = facilityQuest(111, pass.id, {
  depot:['荷馬車の荷倉','峠へ向け、持ち主に返す農具を荷造りしている。','location_shop'],
  road:['峠の本道','車輪の跡が峠へ続く。道の脇から渡しへ下りられる。'],
  ferry:['迂回の渡し','荷馬車ごと川を渡せる平底の舟が着く。'],
  gate:['峠の検問','農具の刻印を載せた台帳が、番兵の机に開いている。'],
  workshop:['峠の職人小屋','職人が道具を作った時の刻印の控えを取っている。','location_shop'],
  village:['返却先の村','農具を待つ人が、荷を下ろせるよう庭を空けている。']
}, {
  hanna:['御者ハンナ','depot','荷をそろえて持ち主へ返したい'],
  gus:['元兵士グス','depot','自分のしたことに、どんな形で責任を持つか決めたい'],
  guard:['検問の番兵','gate','農具の由来を台帳で確かめたい'],
  smith:['峠の職人','workshop','柄に残る刻印を自分の控えと照合する'],
  owner:['農具の持ち主','village','返ってきた農具を一つずつ確かめたい']
}, (s,scene)=>{
  s.entity('wagon','hanna').entity('tools','wagon').entity('rubbing','wagon').entity('cloth','wagon');
  s.enum('flag','unset',['unset','white','covered'],'白い布の掲げ方');
  s.enum('form','unset',['unset','anonymous','named'],'受取人へ伝える名義');
  for(const k of ['cleared','marks','consulted','appraised','confession','consent','repairDate','stored'])s.bool(k);
  s.invariant('namedConsent',or(not(s.is('form','named')),and(s.is('confession'),s.is('consent'))),'グスが自分から承諾したときにだけ名前を伝える。');
  s.invariant('rightfulOwner',or(not(s.is('toolsAt','owner')),and(s.is('marks'),not(s.is('form','unset')))),'刻印を照合してから持ち主に返す。');
  const crew=['hanna','gus'], convoy={companions:crew};
  const handed=and(s.is('toolsAt','owner'),s.is('clothAt','owner'));
  scene('entry','depot',crew,
    'ハンナの荷馬車に並ぶのは、かつて徴発された鍬や鋤だ。「息子を失くした旦那様が、それでも返したいって」。グスは白い布を下ろし、鍬の柄の焼印を親指で隠した。',[
      O('flag','白旗を掲げて本道へ','ambush',[set('flag','white')],convoy),
      O('ferry','旗を包んで渡しへ','landing',[set('flag','covered')],convoy)
    ]);
  scene('ambush','road',crew,'坂の上で野盗が荷馬車を止めた。ハンナは手綱を握ったまま、渡しへ下る道も確かめた。',[
    O('fight','荷馬車を守る','clear',[set('cleared')],{combat:'guard_2',escapeVia:'ambush_detour',combatRequirement:'勝てば本道が開く。逃げた場合は渡しへ回る。'}),
    O('detour','白旗を包んで渡しへ','landing',[set('flag','covered')],convoy)
  ]);
  scene('clear','road',crew,'車輪の前から人影が消えた。ハンナが荷紐を確かめる。白い布は荷台の上に残っている。',[
    O('advance','本道から検問へ','inspection',[],convoy)
  ]);
  scene('landing','ferry',crew,'舟が岸につくと、グスが包んだ白布を膝に抱えた。「名前さえ聞かれなければ」。農具はひとつも荷台から落ちていない。',[
    O('cross','荷馬車で川を渡る','inspection',[],convoy),
    O('home','荷を持ち帰る','home',[],convoy)
  ]);
  scene('inspection','gate',[...crew,'guard'],
    when(s.is('flag','white'),'白旗を見た番兵は武器を下げたまま近づいた。「どなたの鍬だい」。見ているのは旗より、柄の端の焼印だ。',
      '番兵が先に荷馬車を止めた。「布はそのままでいい。柄の印を台帳と合わせよう」。グスの親指の下に、二筋の刻みがある。'),[
      O('match','刻印を台帳と照合する','matched',[set('marks')]),
      O('smith','職人に印の写しを持っていく','request',[give('rubbing','wagon','party')]),
      O('home','荷を持ち帰る','home',[],convoy)
    ]);
  scene('request','workshop',['smith'],'柄の印を写した紙を広げると、職人は古い帳面の束を出した。「照合する間、荷馬車は検問で待たせておくれ」。',[
    O('leave','写しを預けて検問へ','waiting',[give('rubbing','party','smith'),set('consulted')])
  ]);
  scene('waiting','gate',[...crew,'guard'],'荷と二人は検問で待っていた。番兵は引渡しの欄を空けたままにした。写しはまだ職人の手元にある。',[
    O('collect','職人の照合結果を受け取りに行く','result')
  ]);
  scene('result','workshop',['smith'],'職人が写しの隣に、同じ印の控えと持ち主の名を書き添えた。「この二筋は、うちで打った鍬の印だよ」。',[
    O('bring','照合した写しを検問へ','proof',[give('rubbing','smith','party'),set('appraised')])
  ]);
  scene('proof','gate',[...crew,'guard'],'番兵は職人の控えと荷台の農具を一つずつ突き合わせた。柄に残る二筋が控えの印と重なる。',[
    O('confirm','写しを戻して照合を終える','matched',[give('rubbing','party','wagon'),set('marks')])
  ]);
  scene('matched','gate',[...crew,'guard'],'番兵が持ち主の名を読み上げると、グスが柄から指を離した。「その家から持ち出したのは俺たちだ。白い布を下ろしたくなったのは、そのせいだ」',[
    O('hear','グスの話を聞く','decision',[set('confession')])
  ]);
  scene('decision','gate',[...crew,'guard'],'農具の持ち主は分かった。ハンナは「誰の名も出さずに返せるよ」と伝え、グスの言葉を待った。',[
    O('anonymous','名前を出さず村へ','handover',[set('form','anonymous')],convoy),
    O('name','グスの意思を聞く','offer',[set('consent')]),
    O('home','返却を次便に延ばす','home',[],convoy)
  ]);
  scene('offer','gate',[...crew,'guard'],'「俺の名で返してくれ。壊れた柄を直しに来る話も、俺からする」。グスは受取帳に書く自分の名を、番兵に一字ずつ伝えた。',[
    O('agree','申し出を受けて村へ','handover',[set('form','named')],convoy),
    O('anonymous','農具だけを返しに行く','handover',[set('form','anonymous')],convoy)
  ]);
  scene('handover','village',[...crew,'owner'],'受取人は荷台の前で、鍬の柄の印に指を置いた。「うちのだ」。ハンナが荷紐をほどくと、受取人は白い布も引き取って洗濯紐に掛けた。口の開いた、古い枕カバーだった。',[
    O('unload','農具を持ち主に渡す','receipt',[give('tools','wagon','owner'),give('cloth','wagon','owner')])
  ]);
  scene('receipt','village',[...crew,'owner'],
    when(s.is('form','named'),'グスが名乗ると、礼の言葉の隣から「なぜ今になった」と声がした。彼は両方を聞いて、受取帳を開いた。','受取人は数え終えた鍬を軒下へ運んだ。帳面に残すのは農具の数だけだ。グスは洗濯紐の下を黙って通った。'),[
      O('date','次の修繕日を記す','@named',[set('repairDate')],{when:s.is('form','named'),visibleWhen:s.is('form','named')}),
      O('finish','匿名の受取を見届ける','@anonymous',[],{when:s.is('form','anonymous'),visibleWhen:s.is('form','anonymous')})
    ]);
  scene('home','depot',crew,'ハンナは荷馬車を元の倉に寄せた。農具は次便に載せられるよう、受け取り手ごとに置く場所を空けてある。',[
    O('store','農具を倉へ戻す','@home',[give('tools','wagon','depot'),give('cloth','wagon','depot'),set('stored')])
  ]);
  return {
    home:and(s.is('stored'),s.is('toolsAt','depot'),s.is('form','unset')),
    anonymous:and(handed,s.is('form','anonymous')),named:and(handed,s.is('form','named'),s.is('repairDate'))
  };
});
export default wagonQuest;
