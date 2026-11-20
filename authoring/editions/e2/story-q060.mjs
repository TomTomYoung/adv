import {O,set,give,and,when} from '../../story-kit.mjs';
import {marketQuest} from './market-world.mjs';

const waking=marketQuest(60,{
  gate:['夜市の閉じた出口',11,10],shops:['大店と露店の通り',11,9],test_gate:['荷運び用の試験門',11,11],desk:['夜市の門番詰所',12,11]
},{
  zen:['gate','市場番のゼン','市場で商う人と通る人の申し出を取り次ぐ'],
  merchants:['shops','大店と露店の代表','夜間の守りを保つ契約を相談する'],
  carriers:['test_gate','帰りを待つ荷運び人','守りが続く門から地上へ帰る'],
  clerk:['desk','夜市の時刻係','開ける出口と通れる時刻を掲示する']
},{floor:2,characterIds:{zen:'e2_q057_zen'}});
export const wakingCharacters=waking.characters;
export function wakingSource(){
  const {s,scene,implies,finish}=waking.create(),is=s.is;
  s.entity('pledge','merchants').bool('signed').bool('tested').bool('passed').bool('guardDefeated')
    .enum('gates','closed',['closed','trial','all','rotating','trialTimed','free'])
    .enum('protection','night',['night','trial','joint','lost']).bool('timetable');
  scene('entry','gate','ゼンが地上へ続く格子を押した。夜市を守る灯はともっているが、格子は動かない。荷を下ろした人たちが、向こうに見える朝の道を見ている。',[
    O('guarantors','店の保証を集める','shops'),O('break','番人と対決する','warden'),O('hours','交代通行を決める','schedule')
  ]);
  scene('shops','shops','大店の主人が夜間営業の契約を広げた。「閉じた門が守っているんじゃない。夜の商いを誰が引き受けるかだ」。露店の代表は、両方の店が同じ保証に入るならと署名欄を引き寄せた。',[
    O('sign','双方の署名を預かる','guarantee',[give('pledge','merchants','party'),set('signed')])
  ]);
  scene('guarantee','shops','二つの署名がそろった。これで開門時も保護が続くかは、まだ誰も見ていない。荷運び用の門を一つだけ開けて試すか、契約は保留して時間制を頼める。',[
    O('test','一門で試す','test'),O('hours','時間制にする','schedule')
  ]);
  scene('test','test_gate','帰りを待つ人の先頭で、試験門の金具に二つの署名を合わせた。格子を一本ぶん開ける間も、通りから店の保護灯が見える。',[
    O('unlatch','試験門を開ける','lit',[set('gates','trial'),set('protection','trial')])
  ]);
  scene('lit','test_gate','一人目が門をくぐり、もう一人がその後に続いた。二人が外から手を振っても、奥の露店の灯は消えなかった。',[
    O('verify','通過後の灯を確認','gate',[set('tested'),set('passed')])
  ]);
  scene('gate','test_gate','試したのは荷運び用の一門だけだ。全出口に共同保証をつなぐか、この門だけを決まった時刻に使うか。署名の紙を持って門番詰所へ向かう。',[
    O('open','全出口へつなぐ','register'),O('limited','試験門を時間制に','schedule')
  ]);
  scene('register','desk','時刻係は署名の写しを全出口の保護灯へ回した。ゼンから各門の返事が届く。夜の店の守りを引き受けたまま、地上との道をすべて開ける。',[
    O('open','全門を開放する','@informed',[give('pledge','party','clerk'),set('protection','joint'),set('gates','all')])
  ]);
  scene('schedule','desk',when(is('tested'),'時刻係は試した一門の名だけを板に書いた。この門の保証を使い、通れる時間を皆に配る。',when(is('signed'),'共同保証の署名は預かったまま、まだ適用していない。時刻係は開ける時間を分けた交代通行表を書く。','時刻係は閉まる門ごとに帰りたい人の数を聞いた。一度に通し切れない列を分け、時刻と出口を交代にする。')),[
    O('rotate','交代通行表を配る','@compromise',[set('gates','rotating'),set('timetable')],{when:is('tested',false),visibleWhen:is('tested',false)}),
    O('one','一門の時刻を掲示','@compromise',[set('gates','trialTimed'),set('timetable')],{when:is('tested'),visibleWhen:is('tested')})
  ]);
  scene('warden','gate','格子に触れると結界の番人が立った。ここで戦いを挑めば逃げられない。倒せば出口は自由になる。ゼンは守りが消えた後の夜回りを、店ごとに手配し始めた。',[
    O('fight','番人と戦う','unbound',[set('guardDefeated'),set('protection','lost')],{combat:'boss_6',combatRequirement:'逃走不可'})
  ]);
  scene('unbound','gate','番人の姿が消え、店先の保護灯が一斉に落ちた。格子にはもう結界の重みがない。ゼンと一緒に閂を上げれば人も商品も通れる。',[
    O('lift','格子を開け放つ','@contract',[set('gates','free')])
  ]);
  implies('tested',is('tested'),and(is('signed'),is('passed')),'両者署名後に実際の通過と保護灯を確かめる');
  implies('all',is('gates','all'),and(is('tested'),is('protection','joint'),is('pledgeAt','clerk')),'試験の結果を確認し全門に保証をつなぐ');
  implies('free',is('gates','free'),and(is('guardDefeated'),is('protection','lost')),'番人への勝利後に自由通行にする');
  return finish([['entry_guarantors','shops'],['entry_hours','desk'],['guarantee_test','test_gate'],['guarantee_hours','desk'],['gate_open','desk'],['gate_limited','desk']],{
    informed:is('gates','all'),contract:is('gates','free'),compromise:is('timetable')
  });
}
