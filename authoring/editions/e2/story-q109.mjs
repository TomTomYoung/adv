import {O, and, give, not, or, ref, set, when} from '../../story-kit.mjs';
import {canalQuest} from './canal-quarter.mjs';

export default canalQuest(109, {
  yard: ['鍛冶場の搬入口', '河岸から届いた炉材が、壁に沿って積んである。'],
  forge: ['エンの炉場', '冷えた炉の縁に、打ちかけの小さな留め金が並んでいる。', 'location_shop'],
  bench: ['セドの作業台', '炉場と戸一枚隔てた作業台。弟子が一人で鏨を研いでいる。', 'location_shop'],
  counter: ['鍛冶場の店先', '見本の剣を掛けた壁の下に、注文帳と受取台がある。', 'location_shop']
}, {
  en: ['老鍛冶師エン', 'yard', '今の手で続けられる仕事を、自分で選びたい'],
  sedo: ['弟子セド', 'bench', '主作業を習い、いつか独立して自分の銘を打ちたい'],
  buyer: ['注文主', 'counter', '前金を渡した注文に、鍛冶場の返事が欲しい']
}, (s, scene) => {
  s.entity('lining', 'yard').entity('advance', 'en').entity('handle', 'en');
  s.enum('haul', 'unset', ['unset', 'hand', 'cart'], '炉材の運び方');
  s.bool('tremor').bool('samples').bool('lied').bool('corrected');
  s.bool('sedoAgrees').bool('enAgrees').bool('signed').bool('refunded').bool('signDown').bool('toolsChosen');
  s.invariant('informedConsent', or(not(s.is('sedoAgrees')), and(s.is('tremor'), s.is('samples'), or(not(s.is('lied')), s.is('corrected')))), 'セドは師の事情と試作品を知ってから引継ぎを決める。');
  s.invariant('bothSign', or(not(s.is('signed')), and(s.is('sedoAgrees'), s.is('enAgrees'))), '二人の銘は双方が同意してから打つ。');

  const withEn = {companions:['en']}, withSedo = {companions:['sedo']};
  const again = {once:false};
  const load = method => [give('lining','yard','party'), set('haul',method)];
  scene('entry', 'yard', ['en'],
    '「弟子には内緒で、これを中へ頼む」。エンが炉材に手を置いた。火は落ちているのに、材料はもうひと炉ぶん揃っている。脇には小さな荷車もある。', [
      O('hand', '手で運ぶ', 'packing'),
      O('cart', '荷車で運ぶ', 'delivery', load('cart'), withEn)
    ]);
  scene('packing', 'yard', ['en'],
    when({op:'gte',left:ref('leaderStats.str'),right:15},
      '先頭の隊員が試しに持つと、炉材はひと束のまま浮いた。エンが裏戸を押さえて待った。',
      'ひと束では腕が回らない。エンが縄を解き、一人で持てる小分けの束を裏戸まで並べた。'), [
      O('carry', '炉場へ運ぶ', 'delivery', load('hand'), withEn)
    ]);
  scene('delivery', 'forge', ['en'],
    when(s.is('haul','cart'), 'エンが荷車の車輪に木片をかませた。炉の内側にひびはなく、新しい炉材を置ける場所が空いている。',
      '運び終えた炉材を炉の脇にまとめた。欠けたと思っていた炉の縁は、指を滑らせてもなめらかだった。'), [
      O('unload', '炉材を引き渡す', 'order', [give('lining','party','forge')])
    ]);
  scene('order', 'forge', ['en'],
    when(s.is('lied'), 'エンは弟子の作業台の方を見た。「炉のせいにしておけば、あと一日はもつと思ってな」。店先では注文主が返事を待っている。',
      '「セドが聞いたら、炉の修理待ちだと言ってくれ」。エンが紐を結び損ねた。足元には剣よりずっと小さい留め金の試作品がいくつもある。'), [
      O('ask', 'エンに事情を聞く', 'confidence', [set('tremor')]),
      O('lie', '弟子への伝言を預かる', 'message', [], {when:not(s.is('lied')),visibleWhen:not(s.is('lied'))}),
      O('rest', '休業の返金を手伝う', 'refund', [give('advance','en','party')])
    ]);
  scene('message', 'bench', ['sedo'],
    'セドは研ぎかけの鏨を置いた。「火が入らないのはなぜですか。俺には、まだ任せられないってことかな」。手には朝のうちに研ぎ終えた鏨がもう一本ある。', [
      O('return', '修理待ちと伝えて戻る', 'order', [set('lied')])
    ]);
  scene('confidence', 'forge', ['en'],
    'エンは手を開いた。「この震えだ。長い剣を真っすぐに打てない」。炉のせいにして注文を断っていたという。小ぶりな金具を一つ、手のひらに載せてくれた。', [
      O('sample', '留め金を一緒に試す', 'smith', [set('samples')])
    ]);
  scene('smith', 'forge', ['en'],
    'エンの留め金を古い鍋に合わせて引く。取手はびくともしない。「鍋ならまだ十通りは直せる。だが、名剣で知られた店にこれを並べられるかな」', [
      O('pupil', 'セドの希望を聞く', 'pupil', [], again),
      O('tools', '生活道具の注文を取る', 'display', [set('toolsChosen')], withEn),
      O('rest', '休業の返金を手伝う', 'refund', [give('advance','en','party')])
    ]);
  scene('pupil', 'bench', ['sedo'],
    when(and(s.is('lied'),not(s.is('corrected'))), 'セドは「まだ修理待ちなんだろう」と目を伏せた。引継ぎを相談する前に、伝言を訂正する必要がある。',
      '手の震えと試作品のことを聞いたセドは、自分の銘の下書きを見せた。「いつか自分の店を出したい。それでもいいなら、俺は主作業を習いたい」'), [
      O('correct', '先ほどの伝言を訂正する', 'pupil', [set('corrected')], {visibleWhen:and(s.is('lied'),not(s.is('corrected'))),when:and(s.is('lied'),not(s.is('corrected')))}),
      O('agree', '独立を条件に引継ぎを頼む', 'terms', [set('sedoAgrees')], {...withSedo,when:or(not(s.is('lied')),s.is('corrected'))}),
      O('back', 'まだ決めずエンのもとへ', 'smith', [], again)
    ]);
  scene('terms', 'forge', ['en','sedo'],
    '「独り立ちしたくなったら、自分の銘で出ていけ。店のために残る約束はいらん」。エンが空いた炉前を譲り、セドが自分から槌を取った。', [
      O('fire', '二人の条件で火を入れる', 'sign', [set('enAgrees')])
    ]);
  scene('sign', 'forge', ['en','sedo'],
    '火が回る。セドの打つ音を聞きながら、エンは膝の上で指を折って間を数えた。打ち上がった金具に、銘を二つ入れる幅がある。', [
      O('sign', '二人の銘を見届ける', '@inherit', [set('signed')])
    ]);
  scene('display', 'counter', ['en','buyer'],
    'エンは自分で名剣の隣に鍋の取手を置いた。返事を待っていた客が、そちらを手に取る。「同じ取手を、うちの鍋にも付けてもらえるかい」', [
      O('take', '取手の注文を受ける', '@tools', [give('handle','en','buyer')])
    ]);
  scene('refund', 'counter', ['buyer'],
    'エンから預かった前金を注文帳と突き合わせた。注文主が金額を確かめ、受け取りの印を押せるよう帳面をこちらに向けた。', [
      O('refund', '前金を返してセドを呼ぶ', 'close', [give('advance','party','buyer'),set('refunded')])
    ]);
  scene('close', 'bench', ['sedo'],
    '返金の受取印を見て、セドは道具を片付けた。「看板は俺が外すよ」。店を閉じる間の身の振り方は、自分で決めるという。', [
      O('join', 'セドと炉場へ戻る', 'shutter', [], withSedo)
    ]);
  scene('shutter', 'forge', ['en','sedo'],
    '店先への戸に掛かった看板に、セドが手を伸ばした。エンは作り終えた留め金を一つ、弟子の手に置いた。', [
      O('shut', '看板を下ろす', '@rest', [set('signDown')])
    ]);
  return {
    rest: and(s.is('refunded'), s.is('advanceAt','buyer'), s.is('signDown')),
    tools: and(s.is('toolsChosen'), s.is('samples'), s.is('handleAt','buyer')),
    inherit: and(s.is('sedoAgrees'), s.is('enAgrees'), s.is('signed'))
  };
});
