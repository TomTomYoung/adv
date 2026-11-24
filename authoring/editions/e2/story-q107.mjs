import {O, and, give, move, not, or, set} from '../../story-kit.mjs';
import {canalQuest} from './canal-quarter.mjs';

export default canalQuest(107, {
  desk: ['宿主モラの帳場', '食堂からの注文をモラが帳面につける。', 'location_tavern'],
  dining: ['六人分の食卓', '五人の客が囲む卓に、もう一脚の椅子がある。', 'location_tavern'],
  door: ['宿の配達口', '食堂から通りに出る戸口。夜の配達人がここに寄る。'],
  room: ['モラの宿の客室', '食堂の上にある、配達を待って泊まれる部屋。', 'location_tavern']
}, {
  mora: ['宿主モラ', 'desk', '六人分の食事を用意し続けてよいか確かめたい'],
  guests: ['元運送隊の五人', 'dining', '帰らない仲間を待ちながら、これからの旅を決めたい'],
  courier: ['夜の配達人', 'door', '本人の頼みを果たし、住所を明かさずに便りを運ぶ'],
  missing: ['六人目の仲間', 'neighbor', '失敗の借金を抱えたままでも、仲間と話せるか確かめたい']
}, (s, scene) => {
  // Only the courier and the missing traveler use this offstage route.
  s.story.places.neighbor = '隣町';
  s.story.connections.push(['dining', 'door'], ['door', 'neighbor']);
  s.entity('parcel', 'guests').entity('letter', 'guests');
  s.bool('courierSeen').bool('message').bool('slept').bool('reply').bool('meeting');
  s.bool('seated').bool('reported').bool('stopped');
  s.invariant('overnight', or(not(s.is('slept')), s.is('message')), '宿で待つ前に手紙を託す。');
  s.invariant('replyAfterNight', or(not(s.is('reply')), s.is('slept')), '次の配達で返事を受け取る。');
  s.invariant('consentAfterReply', or(not(s.is('meeting')), s.is('reply')), '本人の返事を五人に届けてから再会を決める。');

  scene('entry', 'desk', ['mora'],
    'モラが帳面をこちらに向けた。「お泊まりは五人なのに、夕食は毎晩六人分。あの席には、いつお客さんが来るんでしょう」', [
      O('look', '食堂へ行く', 'dining')
    ]);
  scene('dining', 'dining', ['guests'],
    '一人が「一皿ぶんでも捜し賃に回せたら」と小声で言った。隣の客は空いた椅子を卓に引き寄せる。「ここまで片付けたら、あいつはどこに座るんだ」。夜更け、空席の皿から料理が減り始めた。', [
      O('watch', '空席の皿を見守る', 'seen', [move('courier', 'door', 'dining'), give('parcel', 'guests', 'courier'), set('courierSeen')])
    ]);
  scene('seen', 'dining', ['guests', 'courier'],
    '皿に手を伸ばしたのは、戸口から入ってきた配達人だった。ひと口食べると残りを包み、空いた椅子をそのままにして帰りかけた。', [
      O('courier', '配達口で話を聞く', 'courier', [], {companions: ['courier']}),
      O('stop', 'モラに詮索をやめてもらう', 'stop', [move('courier', 'dining', 'door')])
    ]);
  scene('courier', 'door', ['courier'],
    '「食べきれない分を受け取ってくれって、あの席の人に頼まれた」。本人は隣町で生きている。仕事の失敗で借金を負い、戻るのが怖いという。「住所は売らないよ。手紙なら届ける」', [
      O('alive', '無事だけ伝える', 'news'),
      O('letter', '五人の便りを預かる', 'write'),
      O('stop', '仲介を断る', 'stop')
    ]);
  scene('stop', 'desk', ['mora'],
    'モラは六人分の注文を帳面に残した。「あの席のことは、もうこちらからは聞きません」', [
      O('close', '帳場を辞す', '@stop', [set('stopped')])
    ]);
  scene('news', 'dining', ['guests'],
    '五人に、仲間は生きていると伝えた。誰も住所を聞き出そうとしなかった。一人が空いた皿を重ね、「次の宿からは五人分にしようか」と、ほかの四人を見た。', [
      O('finish', '消息の報告を終える', '@alive', [set('reported')])
    ]);
  scene('write', 'dining', ['guests'],
    '五人は同じ紙に言葉を寄せた。最後の一人が「一度、顔を見て話せるか」と書き、返事を受け取れるよう宿の名を添えた。', [
      O('carry', '手紙を配達口へ', 'hand', [give('letter', 'guests', 'party')])
    ]);
  scene('hand', 'door', ['courier'],
    '配達人が手を出した。「返事をもらえたら、次の配達でここに持ってくるよ」', [
      O('send', '手紙を託して宿へ', 'wait', [give('letter', 'party', 'courier'), move('courier', 'door', 'neighbor'), set('message')])
    ]);
  scene('wait', 'room', [],
    '五人の手紙は配達人に託した。窓の下の配達口はまだ閉じている。今夜はここに泊まるか、もう分かっている無事だけを知らせに行くか。', [
      O('sleep', '一晩泊まって配達口へ', 'delivery', [
        give('letter', 'courier', 'missing'), give('letter', 'missing', 'courier'),
        move('courier', 'neighbor', 'door'), set('slept')
      ], {when: s.is('message')}),
      O('alive', '返事を待たずに報告', 'news')
    ]);
  scene('delivery', 'door', ['courier'],
    '一夜明けて、配達人が五人の手紙を差し出した。折り返した面に別の筆跡がある。「借金が消えなくても、一度話したい」', [
      O('receive', '返事を受け取って食堂へ', 'read', [give('letter', 'courier', 'party'), set('reply')], {when: s.is('slept')})
    ]);
  scene('read', 'dining', ['guests'],
    '返事を読み上げると、さっきは捜し賃の話をした客が、空いた椅子に目をやった。「借金の話でもいい。俺たちも会って話したい」。残る四人もうなずいた。', [
      O('share', '返事を五人に渡す', 'decision', [give('letter', 'party', 'guests'), set('meeting')], {when: s.is('reply')})
    ]);
  scene('decision', 'dining', ['guests'],
    '会いたいという答えは、双方から出た。五人は返事を手元に置いている。ここで仲介を終えるか、配達人に再会の手配まで頼むか。', [
      O('meet', '再会を手配する', 'arrange', [], {when: s.is('meeting')}),
      O('alive', '消息の報告で終える', '@alive', [set('reported')])
    ]);
  scene('arrange', 'door', ['courier'],
    '「五人とも、ここで会いたいって？」。配達人は宿の食堂を振り返った。「分かった。本人にそう伝える」', [
      O('invite', '五人の返事を託す', 'arrival', [move('courier', 'door', 'neighbor'), move('courier missing', 'neighbor', 'door')])
    ]);
  scene('arrival', 'door', ['courier', 'missing'],
    '配達人が宿へ戻った。今度は傍らにもう一人いる。戸口に立ったその人は食堂から聞こえる声に耳を澄まし、自分から一歩、中へ入った。', [
      O('enter', '一緒に食堂へ', 'reunion', [], {companions: ['missing']})
    ]);
  scene('reunion', 'dining', ['guests', 'missing'],
    '五人は椅子を引かずに待った。戻ってきた仲間が背に手を掛け、自分で席を取る。「仕事のことから、話していいか」', [
      O('sit', '六人の食卓を見届ける', '@meet', [set('seated')])
    ]);
  return {
    stop: s.is('stopped'), alive: s.is('reported'),
    meet: and(s.is('meeting'), s.is('missingAt', 'dining'), s.is('seated'))
  };
});
