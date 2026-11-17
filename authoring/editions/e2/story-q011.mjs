import {story,O,set,see,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';
export const saltBridePlaces={entrance:'メルの待つ坑道入口',fork:'白い像のある分岐',safeTunnel:'避難先の安全坑'};
export const saltBrideWorld={
  entrance:{kind:'dungeon',dungeon:'region_2',map:'region_2_f1',x:1,y:1,event:'q011_saltbride_entrance'},
  fork:{kind:'dungeon',dungeon:'region_2',map:'region_2_f1',x:11,y:9,event:'q011_saltbride_fork'},
  safeTunnel:{kind:'dungeon',dungeon:'region_2',map:'e2_saltbride_tunnel',x:3,y:2,event:'q011_saltbride_tunnel'}
};
export function saltBrideSource(){
  const s=story(11,saltBridePlaces,[['entrance','fork'],['fork','safeTunnel']]);
  s.entity('mel','entrance','e2_saltbride_mel').entity('colleague','safeTunnel','e2_saltbride_colleague').entity('people','safeTunnel','e2_saltbride_people',{kind:'group'}).entity('sign','fork');
  for(const key of ['signKnown','signDestroyed','arrowKnown','rescued','repainted','ropeStarted','ropeLaid','found','joined','reported'])s.bool(key);
  s.enum('route','pending',['pending','sign','broken','rope']);
  s.fact('sign','塩の下の人型と腕・台座の矢印は、安全坑を示す古い避難標識である。');
  s.fact('stayed','メルの同僚は助けを呼ぶ声を追い、安全坑で迷った坑夫たちを再び一人にしないため留まっていた。');
  s.node('entry','entrance',['mel'],'メルは坑道入口で同僚の帰りを待っている。「白い像の前を通った靴跡が、分岐の奥へ続いている。見つけたら、ここまで連れてきてほしい」。まず像のある分岐へ向かう。',[
    O('fork','足跡の残る分岐へ向かう','statue')
  ]);
  s.node('statue','fork',[],'白い塊は、灯を掲げた人のようにも、ヴェールをかぶった花嫁のようにも見えた。メルの同僚の靴跡は、その前を通って分岐の奥へ続く。台座と指先には塩が厚く積もっていた。',[
    O('brush','像の腕と台座の塩を払う','brushed'),
    O('break','危険の原因と考え、白い像を砕く','broken',[set('signDestroyed'),set('route','broken')]),
    O('rope','像の正体は決めず、帰路の縄を用意する','rope_prepare',[set('route','rope')])
  ]);
  s.node('brushed','fork',[],'塩を払うと、灯を掲げた腕と台座の矢印が現れた。腕の向き、矢印、その先の坑道を照らし合わせる。',[
    O('read','腕と矢印が指す避難先を確認する','sign',[set('signKnown'),set('arrowKnown'),see('sign','sign')])
  ]);
  s.node('sign','fork',[],'腕と台座の矢印は同じ安全坑を指している。白い像は避難先を示す古い標識だった。人の声はその先から聞こえる。像が何か分かっても、坑夫を連れ帰ったことにはならない。',[
    O('guide','標識を頼りに、安全坑へ迎えに行く','tunnel_arrival'),
    O('rope','修復は後日に回し、帰路の縄を用意する','rope_prepare',[set('route','rope')])
  ]);
  s.node('broken','fork',[],'白い像を砕いた。塩の下から台座の矢印が現れている。永久の目印は失われたが、まだ読み取れる向きを靴跡と照らし合わせる。',[
    O('read','残った台座の矢印と靴跡の向きを確認する','broken_direction',[set('arrowKnown')])
  ]);
  s.node('broken_direction','fork',[],'台座の矢印と靴跡は同じ坑を指している。戻る分岐の形を確かめてから、その先へ向かう。',[
    O('follow','矢印と靴跡をたどって安全坑へ向かう','tunnel_arrival')
  ]);
  s.node('rope_prepare','fork',[],[when(s.is('signKnown'),'標識の役目は確認した。修復は後日に回し、帰路を縄でつなぐ。','像の正体は決めず、足跡を追う帰路を縄でつなぐ。'),'縄はまだ荷物の中だ。分岐の固定点へ結び、そこから足跡に沿って延ばす。'],[
    O('lay','縄1本を取り出し、分岐の固定点へ結ぶ','rope_started',[set('ropeStarted')],{cost:{rope:1}})
  ]);
  s.node('rope_started','fork',[],'縄の端を分岐に固定した。使用した縄を延ばしながら、靴跡の先へ向かう。帰路の敷設はまだ終わっていない。',[
    O('extend','縄を延ばしながら安全坑へ向かう','rope_arrival')
  ]);
  s.node('rope_arrival','safeTunnel',[],'足跡の続く安全坑へ着いた。縄は分岐からここまで延びている。入口側へ引かれて外れないよう、こちらの端も留める。',[
    O('fix','安全坑側の端を固定し、帰路の縄を確認する','tunnel_arrival',[set('ropeLaid')])
  ]);
  s.node('tunnel_arrival','safeTunnel',[],'坑の奥から声がする。灯の届く範囲を確かめ、呼びかけている人を探す。',[
    O('find','声のする奥を照らし、姿を確かめる','found',[set('found')])
  ]);
  s.node('found','safeTunnel',['colleague','people'],'メルの同僚が、迷った坑夫たちと待っていた。まだ帰還はしていない。ここに留まっていた理由と、歩いて戻れる状態かを確かめる。',[
    O('join','事情を聞き、全員と合流する','joined',[set('joined'),see('stayed','colleague')])
  ]);
  s.node('joined','safeTunnel',['colleague','people'],['「助けを呼ぶ声がしたんだ。一人で戻れば、またはぐれると思った」。同僚は坑夫たちと歩いて戻る用意をした。',when(s.is('ropeLaid'),'分岐まで敷いた縄をたどり、全員で引き返す。','確かめた向きと足跡を頼りに、全員で分岐へ引き返す。')],[
    O('escort','同僚と坑夫たちに同行し、分岐へ戻る','fork_return')
  ]);
  s.node('fork_return','fork',['colleague','people'],'全員で分岐へ戻った。メルが待つ坑道入口までは、まだ道が続く。',[
    O('entrance','全員に同行し、メルの待つ入口へ向かう','entrance_arrival')
  ]);
  s.node('entrance_arrival','entrance',['mel','colleague','people'],'メルの待つ入口に着いた。途中ではぐれた人がいないか、同僚と坑夫たち一人ひとりに返事を求める。',[
    O('confirm','メルと全員の帰還を確認する','confirmed',[set('rescued')])
  ]);
  s.node('confirmed','entrance',['mel','colleague','people'],['メルは同僚と坑夫たちの帰還を確認した。全員を入口に残し、選んだ処置の後始末をする。',when(s.is('route','sign'),'避難標識は塩を払っただけだ。分岐へ戻って腕、矢印、避難先の表示を塗り直す。',when(s.is('route','broken'),'恒久的な標識は失われた。分岐の再測量が必要なことを伝える。','帰路の縄は敷いたまま残す。標識の恒久的な修復は済んでいない。'))],[
    O('repair','全員を入口に残し、分岐の標識を直しに戻る','repair_arrival',[],{when:s.is('route','sign')}),
    O('report','今回の救助と、残った課題をメルに伝える','report',[set('reported')],{when:not(s.is('route','sign'))})
  ]);
  s.node('repair_arrival','fork',[],'像の分岐へ戻った。同僚と坑夫たちは入口でメルと待っている。腕の向き、台座の矢印、避難先の表示をここで塗り直す。',[
    O('paint','像の腕・矢印・避難先を塗り直す','repaired',[set('repainted')])
  ]);
  s.node('repaired','fork',[],'塗り直した標示が同じ安全坑を示すことを確かめた。メルのいる入口へ戻り、処置を伝える。',[
    O('return','入口へ戻り、メルに修復を報告する','repair_report')
  ]);
  s.node('repair_report','entrance',['mel','colleague','people'],'メルのいる入口へ戻った。標示を塗り直した場所と、安全坑の方向を伝える。',[
    O('report','標識の修復と避難先をメルに伝える','report',[set('reported')])
  ]);
  s.node('report','entrance',['mel','colleague','people'],when(s.is('route','sign'),'安全坑からの帰還と標示の修復を報告した。',when(s.is('route','broken'),'全員の帰還を報告した。像を砕いた分岐は、次のために測量し直す必要がある。',when(s.is('signKnown'),'全員の帰還と縄の敷設を報告した。像が古い避難標識だったことは伝え、修復は未実施として残した。','全員の帰還と縄の敷設を報告した。像の正体は確認しておらず、恒久的な標示の修復もしていない。'))),[
    O('finish','救助の記録を確定する','@informed',[],{when:s.is('route','sign')}),
    O('finish_broken','今回の救助と再測量の課題を確定する','@contract',[],{when:s.is('route','broken')}),
    O('finish_rope','縄による帰路と修復未実施の記録を確定する','@compromise',[],{when:s.is('route','rope')})
  ]);
  const route=connectWorld(s,saltBrideWorld,1);
  route('entry_fork','fork');route('sign_guide','safeTunnel',{depart:[set('route','sign')]});route('broken_direction_follow','safeTunnel');route('rope_started_extend','safeTunnel');
  route('joined_escort','fork',{companions:['colleague','people']});route('fork_return_entrance','entrance',{companions:['colleague','people']});
  route('confirmed_repair','fork');route('repaired_return','entrance');
  const done=and(s.is('rescued'),s.is('reported'),s.is('partyAt','entrance'),s.is('colleagueAt','entrance'),s.is('peopleAt','entrance'));
  s.story.endings={informed:and(done,s.is('route','sign'),s.is('signKnown'),s.is('repainted')),contract:and(done,s.is('route','broken'),s.is('signDestroyed')),compromise:and(done,s.is('route','rope'),s.is('ropeLaid'))};
  s.invariant('fixed-mel',s.is('melAt','entrance'),'メルは坑道入口で帰還を確認する');
  s.invariant('together',s.is('colleagueAt',s.v('peopleAt')),'同僚は坑夫たちと一緒に留まり、同行して戻る');
  s.invariant('rescued',or(not(s.is('rescued')),and(s.is('colleagueAt','entrance'),s.is('peopleAt','entrance'))),'帰還確認済みの全員は入口に残る');
  s.invariant('repair',or(not(s.is('repainted')),and(s.is('rescued'),s.is('signKnown'),not(s.is('signDestroyed')))),'全員の帰還後に標識を修復する');
  s.invariant('rope',or(not(s.is('ropeLaid')),and(s.is('ropeStarted'),s.is('route','rope'))),'固定点から延ばした一本の縄で帰路をつなぐ');
  for(const scene of Object.values(s.story.scenes))scene.cast.forEach((c,i)=>{c.when=s.is(c.entity+'At',scene.place);c.display={x:scene.cast.length===1?50:scene.cast.length===2?[25,75][i]:[20,50,80][i],y:10,scale:.5,cardScale:1,layer:i};});
  return s.done();
}

export const saltBrideCharacters=Object.fromEntries([['mel','メル','坑道入口で同僚を待ち、帰還を確認する'],['colleague','メルの同僚','迷った坑夫たちを再び一人にしない'],['people','迷った坑夫たち','同僚と安全坑で待ち、一緒に入口へ戻る']].map(([key,name,goal])=>['e2_saltbride_'+key,{id:'e2_saltbride_'+key,name,goal,quests:['q011'],detail:'現行原稿の役割。外見と坑夫の人数は未設定。専用画像のない人物は名前で表示する。'}]));
