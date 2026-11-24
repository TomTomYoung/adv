import {O, and, move, not, set, when} from '../../story-kit.mjs';
import {canalQuest} from './canal-quarter.mjs';

export default canalQuest(106, {
  bakery: ['夜市のパン屋', '通りに面した売り台に焼きたてのパンが並ぶ。', 'location_shop'],
  alley: ['夜市の抜け道', '店の裏で道が狭まり、戸口の下に小さな隙間が開いている。'],
  door: ['荷運びの男の戸口', '夜勤を終えた荷運びの男の家。奥から食器の音が聞こえる。'],
  table: ['荷運びの家の食卓', '家族が夕食を取る卓に、パンを分ける皿がある。', 'location_tavern']
}, {
  baker: ['パン屋の店主', 'bakery', '夜市のパンを守りたい'],
  shadow: ['影', 'bakery', '主人が口にできない空腹を満たしたい'],
  mage: ['術師', 'alley', '影を封じることと主人に戻すことの違いを伝える'],
  porter: ['荷運びの男', 'door', '食事を抜いたことで家族に心配をかけたくない'],
  family: ['荷運びの家族', 'table', '本人と食卓を囲みたい']
}, (s, scene) => {
  const household = ['porter', 'shadow', 'family'];
  s.story.connections.push(['bakery', 'alley'], ['alley', 'door']);
  s.bool('theft').bool('owner').bool('rule').bool('admitted').bool('shared');
  s.bool('deferred').bool('guarded').bool('retried');
  s.enum('shadowState', 'loose', ['loose', 'sealed', 'rejoined'], '影の封印・帰還');
  const mealReady = and(s.is('owner'), s.is('rule'), s.is('admitted'));

  scene('entry', 'bakery', ['baker', 'shadow'],
    'パンが一つ、売り台から落ちた。拾おうとした店主の手をすり抜けて、地面を走っていく。その下に、かぎ爪のような黒い輪郭だけが見えた。', [
      O('chase', 'パンを追う', 'trail', [set('theft'), move('shadow', 'bakery', 'alley')])
    ]);
  scene('trail', 'alley', ['mage', 'shadow'],
    '隊が通れない隙間に影が身を縮めた。パンを抱え直した手の甲に、白く抜けた傷跡がある。術師が隙間を指した。「ここなら封じられる。代金は三十だ」', [
      O('owner', '隙間の向こうを回る', 'hands', [move('shadow', 'alley', 'door')]),
      O('seal', '30Gで影を封じる', 'sealed', [set('shadowState', 'sealed')], {cost: {gold: 30}}),
      O('guard', 'パン屋を見張る', 'watch')
    ]);
  scene('sealed', 'alley', ['mage', 'shadow'],
    '隙間にかかった罠の中で、影の手が止まった。術師は封じ目を確かめた。主人の空腹は、そのままだという。', [
      O('report', '店主に知らせる', 'report')
    ]);
  scene('report', 'bakery', ['baker'], '店主は売り台のパンを数えた。今度は一つも減っていない。', [
    O('finish', '捕縛を報告する', '@seal')
  ]);

  scene('hands', 'door', ['porter', 'shadow'],
    '戸口で荷運びの男が眠っている。膝から垂れた手の横に、パンを抱えた影の手が並んだ。傷の形も、親指からの長さも同じだった。', [
      O('compare', '男に声をかける', 'owner', [set('owner')])
    ]);
  scene('owner', 'door', ['porter', 'shadow'],
    when(s.is('retried'), '一晩見張ったあと、もう一度戸口を訪ねた。男は起きていた。昨日とは違って、自分から影の手を見た。',
      '男は目を覚まし、自分の手を握った。「夜勤の日は食べずに寝るんだ。家族には足りてると言った。……今は、言いたくない」'), [
      O('learn', '術師に戻し方を聞く', 'rule'),
      O('guard', '話を切り上げて店へ', 'watch', [set('deferred')], {once: false})
    ]);
  scene('rule', 'alley', ['mage'],
    '「あの影が欲しがるのは、本人が欲しくないと言い張ったものだ。誰かが代わりに食べさせても戻らない。腹が減ったと、まず自分で言わなくちゃ」', [
      O('back', '男に伝える', 'invite', [set('rule')])
    ]);
  scene('invite', 'door', ['porter', 'shadow'],
    '話を聞いた男は家の奥を見た。「俺から言うよ。一緒に来てくれるか」。男が立つと、離れていた影も食卓の方へ動いた。', [
      O('ask', '男と食卓へ', 'supper', [], {companions: ['porter', 'shadow']})
    ]);
  scene('supper', 'table', household,
    '家族の手が止まった。男は空いた皿に目を落としたまま、しばらく黙っていた。隊は、男が口を開くのを待った。', [
      O('admit', '本人の言葉を待つ', 'meal', [set('admitted')])
    ]);
  scene('meal', 'table', household,
    '「腹が減った」。家族は男を責めず、隣の席を空けた。売り台から盗まれたパンとは別に、隊の糧食を一つ出せば、みんなで分けられる。', [
      O('eat', '糧食を一つ分ける', 'fed', [set('shared'), set('shadowState', 'rejoined')], {when: mealReady, cost: {ration: 1}}),
      O('guard', '食事を家族に任せて店へ', 'watch')
    ]);
  scene('fed', 'table', household,
    '男が自分の分を食べると、床に伸びていた指が足元に収まった。「夜勤を少し減らせないか、話してみるよ」。家族がうなずいた。', [
      O('finish', '食卓を囲む', '@meal')
    ]);

  scene('watch', 'bakery', ['baker'],
    when(s.is('guarded'), '店主が棚の取り置きを指した。昨晩、隊が守った店のパンだ。',
      '店主は残りのパンを売り台から下ろした。ここで夜を明かせば、今夜の分は守れる。'), [
      O('keep', '夜明けまで見張る', 'dawn', [set('guarded')], {when: not(s.is('guarded')), visibleWhen: not(s.is('guarded'))}),
      O('finish', '昨晩の見張りを報告', '@guard', [], {when: s.is('guarded'), visibleWhen: s.is('guarded')})
    ]);
  scene('dawn', 'bakery', ['baker'], 'パンが減らないまま夜が明けた。店主は翌晩の分を棚に取り置いた。', [
    O('finish', '見張りを報告する', '@guard'),
    O('retry', '男ともう一度話す', 'owner', [set('retried')], {when: s.is('deferred'), visibleWhen: s.is('deferred')})
  ]);
  return {
    seal: s.is('shadowState', 'sealed'),
    guard: s.is('guarded'),
    meal: and(mealReady, s.is('shared'), s.is('shadowState', 'rejoined'))
  };
});
