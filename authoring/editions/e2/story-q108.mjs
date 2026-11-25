import {O, and, move, not, or, set, when} from '../../story-kit.mjs';
import {canalQuest} from './canal-quarter.mjs';

const bounty = canalQuest(108, {
  stall: ['魚屋の売り台', '魚を並べる低い棚が、隣の鳥屋の軒まで続く。', 'location_shop'],
  feeder: ['鳥屋の餌場', '鳥籠の下に餌がこぼれ、鼠の足跡が残っている。', 'location_shop'],
  warehouse: ['魚屋の遠い倉庫', '魚屋が市場を離れたところに借りている倉庫。']
}, {
  seller: ['魚屋', 'stall', '魚を盗まれずに商売したい'],
  keeper: ['鳥屋', 'stall', '鼠を追う猫を手元で守りたい'],
  cat: ['大猫', 'stall', '二軒のあいだで魚を食べ、鼠を追い、昼寝をする']
}, (s, scene) => {
  const everyone = ['seller', 'keeper', 'cat'];
  const toBirds = {companions: ['keeper', 'cat']};
  const toWarehouse = {companions: ['seller', 'cat']};
  s.story.connections.push(['stall', 'feeder']);
  s.bool('fishRoute').bool('ratWork').bool('shelfRaised').bool('caught').bool('caged');
  s.bool('paid').bool('enclosure').bool('declined');
  s.enum('custody', 'none', ['none','fish','bird','shared'], '大猫を預かる店');
  const observed = and(s.is('fishRoute'), s.is('ratWork'));
  s.invariant('paidAfterObservation', or(not(s.is('paid')), observed), '両店で実際に観察してから改修費を支払う。');
  s.invariant('completedRepairs', or(not(s.is('enclosure')), and(s.is('shelfRaised'), s.is('paid'))), '両店の改修には支払いと棚の工事が必要。');

  scene('entry', 'stall', everyone,
    '魚が一尾、大猫の口に消えた。「捕まえてくれたら懸賞を出す。ここから遠い、うちの倉庫で飼うよ」と魚屋。隣の鳥屋が首を振る。「あの子が鼠を追ってくれるのに」。昔の共同仕入れでも、この二人は口を利かなくなった。', [
      O('shelf', '棚を上げて餌場を見る', 'hunting', [set('fishRoute'), set('shelfRaised')], toBirds),
      O('catch', '餌で猫を籠に誘う', 'caught', [set('caught'), set('caged')]),
      O('bird', '鳥屋に預ける', 'protection', [], toBirds),
      O('decline', '懸賞を辞退する', '@decline', [set('declined')])
    ]);
  scene('caught', 'stall', everyone,
    '籠が閉まるなり、二人が別々の名を同時に呼んだ。大猫はどちらにも返事をしない。魚屋は倉庫の鍵を出し、鳥屋は「せめて餌場を見てから決めて」と頼んだ。', [
      O('fish', '魚屋の倉庫へ運ぶ', 'warehouse', [move('keeper', 'stall', 'feeder')], toWarehouse),
      O('rats', '引き渡す前に餌場を見る', 'tracks', [], toBirds),
      O('bird', '鳥屋に預ける', 'protection', [], toBirds),
      O('decline', '籠を開けて懸賞を辞退', '@decline', [set('caged', false), set('declined')])
    ]);
  scene('tracks', 'feeder', ['keeper','cat'],
    '籠の中の猫が耳を立てた。その鼻先を鼠が横切り、鳥の餌に潜り込む。鳥屋が空になった餌入れを見せた。', [
      O('open', '籠を開けて見守る', 'hunting', [set('caged', false)])
    ]);
  scene('hunting', 'feeder', ['keeper','cat'],
    when(s.is('shelfRaised'), '猫が棚に前脚を掛けても、もう魚には届かない。餌場に来た鼠を見つけると、鳥籠の下に飛び込んだ。',
      '籠から出た大猫が、たちまち鼠を餌場の外へ追った。鳥屋が餌入れを置き直す。猫が見張るあいだ、今度は鼠が近づかない。'), [
      O('cost', '両店で改修を相談する', 'inspect', [set('ratWork')], {companions:['keeper']}),
      O('bird', '鳥屋に保護を頼む', 'protection', [set('ratWork')])
    ]);
  scene('inspect', 'stall', ['seller','keeper'],
    when(s.is('shelfRaised'), '売り台の下についた足跡は、持ち上げた棚の手前で途切れている。魚屋はこの高さで棚を固定することにした。',
      '低い棚には猫の濡れた足跡が続き、魚の頭が一つ落ちていた。魚屋が棚板を持ち上げると、売り台まで続いていた足掛かりが途切れた。'), [
      O('check', '棚と餌場の分担を決める', 'agreement', [set('fishRoute')])
    ]);
  scene('agreement', 'stall', ['seller','keeper'],
    '魚屋が棚を受け持ち、鳥屋が餌場を直す。隊の負担は道具代三十。魚屋は倉庫の鍵もまだ持っている。', [
      O('build', '30Gで改修する', 'paid', [set('paid'), set('shelfRaised')], {when:observed, cost:{gold:30}}),
      O('warehouse', '倉庫への引き渡しにする', 'collect', [], {companions:['seller','keeper']}),
      O('bird', '鳥屋の保護に任せる', 'protection', [], {companions:['keeper']}),
      O('decline', '懸賞を辞退する', '@decline', [set('declined')])
    ]);
  scene('paid', 'stall', ['seller','keeper'],
    '道具代を渡すと、魚屋は棚板を高い位置にしっかり留めた。魚を並べ直す音を背に、鳥屋が隣の餌場へ向かう。', [
      O('feeder', '鳥屋と餌場を直しに行く', 'repair', [], {companions:['keeper']})
    ]);
  scene('repair', 'feeder', ['keeper','cat'],
    '鳥屋が餌入れを据え直した。餌が棚の下にこぼれず、猫が鼠を追う場所も空いている。軒越しに魚屋と鳥屋が、どちらも昼寝の場所を一つずつ空けておくと約束した。', [
      O('share', '両店で猫を見守る', '@shared', [set('enclosure'), set('custody','shared')])
    ]);
  scene('collect', 'feeder', everyone,
    '魚屋は倉庫の鍵を持って猫を迎えに来た。鳥屋には鼠対策が残る。魚屋が連れて行く先を、ここでもう一度確かめた。', [
      O('carry', '魚屋と猫を倉庫へ', 'warehouse', [], toWarehouse)
    ]);
  scene('warehouse', 'warehouse', ['seller','cat'],
    '魚屋が倉庫の戸を開けた。売り台からは遠く、ここから鳥屋の餌場へも通えない。魚屋は荷の間に猫の居場所を空けて待った。', [
      O('hand', '魚屋に引き渡す', '@fish', [set('caged',false), set('custody','fish')])
    ]);
  scene('protection', 'feeder', ['keeper','cat'],
    when(s.is('caged'), '鳥屋が籠の戸に手を掛けた。「餌代はうちが持つ」。猫は勝手知った餌場の匂いをかいでいる。',
      '鳥屋が猫のために餌を用意した。「餌代はうちが持つよ」。魚屋との仕入れの話は、まだ折り合っていない。'), [
      O('hand', '鳥屋に引き渡す', '@bird', [set('caged',false), set('custody','bird')])
    ]);
  return {
    shared: and(s.is('enclosure'), s.is('custody','shared'), s.is('catAt','feeder')),
    fish: and(s.is('custody','fish'), s.is('catAt','warehouse')),
    bird: and(s.is('custody','bird'), s.is('catAt','feeder')),
    decline: and(s.is('declined'), s.is('custody','none'), not(s.is('caged')), not(s.is('paid')))
  };
});

// GQ008 also allows walking away from the bounty. The existing three awards stay on their original routes.
bounty.additionalOutcomes = {decline: {label:'懸賞を辞退する', text:'どちらにも猫を引き渡さず、隊は懸賞を辞退した。', gold:0, xp:0}};
export default bounty;
