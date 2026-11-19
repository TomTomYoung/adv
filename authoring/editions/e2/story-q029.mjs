import {story,O,set,give,see,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

const places={hive:'赤い蜜の巣箱',office:'買主の契約台',apiary:'隣の養蜂場',depot:'売約先の荷受け台'};
const site=(id,x,y)=>({kind:'dungeon',dungeon:'region_3',map:'region_3_f2',x,y,event:'q029_red_honey_'+id});
const world={hive:site('hive',10,11),office:site('office',8,11),apiary:site('apiary',12,11),depot:site('depot',13,9)};
export const redHoneyCharacters=Object.fromEntries([
  ['mina','養蜂家のミナ','蜂を越冬させ、契約の始末をつける'],
  ['buyer','赤い蜜の買主','約束した樽の納期を売約先と確かめる'],
  ['keeper','隣の養蜂家','赤い蜜の不足分を自分の蜜で補う'],
  ['recipient','売約先の荷受け人','樽の中身と納期を確かめて受け取る']
].map(([key,name,goal])=>{const id='e2_red_honey_'+key;return [id,{id,name,goal,quests:['q029'],detail:goal+'。'}];}));

export function redHoneySource(){
  const s=story(29,places,[]),is=s.is;
  for(const [who,place] of [['mina','hive'],['buyer','office'],['keeper','apiary'],['recipient','depot']])
    s.entity(who,place,'e2_red_honey_'+who);
  // The small share and the remaining winter stores together fill the original order.
  s.entity('share','hive').entity('reserve','hive').entity('alternative','keeper');
  s.bool('returned').bool('guardsDefeated').bool('paid').bool('revised').bool('calendarStarted');
  s.enum('delivery','none',['none','red','mixed'],'荷受け人が実際に受領した蜜');
  s.fact('flowerDate','花期の札と今の巣の様子から、赤い蜜は冬の備蓄だと確認した。');
  s.fact('buyerError','買主が、書き入れた開花時期の一季のずれを認めた。');
  const mina=['mina'],buyer=['buyer'],keeper=['keeper'],receipt=['recipient'],meeting=['buyer','recipient'];
  const repeat={once:false};
  s.node('entry','hive',mina,'養蜂家のミナが空樽を抱えている。「今日、これを一杯にして渡す約束です」。巣門の奥では女王の護衛が赤い蜜の栓を囲んでいる。箱の脇には、花の時期を刻んだ木札が下がっていた。',[
    O('season','花期を調べる','calendar'),O('small','少量を頼む','rim'),
    O('take','護衛と戦う','unguarded',[set('guardsDefeated')],{combat:'guard_3'})
  ]);
  s.node('calendar','hive',mina,'花の刻みがある季節はもう過ぎている。巣門には冬用の狭い口が取り付けられ、虫たちは蜜の栓を内側から固めていた。ミナと木札を裏返す。',[
    O('read','巣と札を照合','marks',[see('flowerDate','hive')],repeat)
  ]);
  s.node('marks','hive',mina,'札の裏の同じ印は、冬を越すために巣に残す蜜を示していた。契約にある花期と合わない。買主の帳面には、どの季節が記されているだろう。',[
    O('buyer','買主を訪ねる','ledger',[],repeat)
  ]);
  s.node('ledger','office',buyer,when(s.known('buyerError'),'買主が訂正を入れた控えをまた開いた。樽の売約先からは、まだ納期を変える返事が来ていない。',
    '帳面の花印は、持ってきた札の写しより一季ずれていた。買主が隣の欄と見比べて、ペンを置いた。'),[
    O('compare','契約を照合','deadline',[see('buyerError','buyer')],repeat)
  ]);
  s.node('deadline','office',buyer,'「開花の季節を書き違えました。でも、この先にもう一軒、樽を待たせている」。買主は売約先の控えを差し出した。事情を一緒に伝えるか、今日届けられる分をそろえるか。',[
    O('explain','売約先へ行く','meeting'),O('small','巣へ少量を取りに','rim',[],repeat)
  ]);
  s.node('meeting','depot',meeting,'買主が一季ずれた控えを広げた。荷受け人は「蜜はどこに？」と空の台を示す。巣門が冬支度を終えたことと、次に花が開く季節を伝える。',[
    O('agree','納期を改める','new_date',[set('revised')])
  ]);
  s.node('new_date','depot',meeting,'荷受け人が次の花期に受け取ると署名した。買主は控えを一枚渡し、先方に残って帳面を書き換える。ミナにも届けよう。',[
    O('hive','巣へ知らせる','new_calendar')
  ]);
  s.node('new_calendar','hive',mina,'蜜の栓はすべて巣にある。ミナは新しい納期を読み、「違約金は私が引き受けます」と言った。地下で次に花を見た日を書けるよう、まっさらな暦を巣の脇に掛ける。',[
    O('mark','暦に記す','@informed',[set('calendarStarted')])
  ]);
  s.node('rim','hive',mina,when(is('returned'),'巣門の外側には、先ほど戻した赤い蜜がある。ミナが同じ小瓶を出した。「ここから分けられるのは、やはりこの瓶の分までです」',
    'ミナが小瓶を巣門に当てる。蜂が退いた外縁の一房だけなら分けてもらえる。奥の越冬分には硬い栓が残っている。'),[
    O('draw','小瓶に分ける','small_load',[give('share','hive','party')],repeat)
  ]);
  s.node('small_load','hive',mina,'瓶は満ちたが、樽に合わせると足元にも届かない。隣の養蜂場には、別の花から採った蜜があるという。小瓶を持って値を聞きに行く。',[
    O('seller','隣の養蜂場へ','offer',[],repeat)
  ]);
  s.node('offer','apiary',keeper,'隣の養蜂家が赤い蜜の小瓶を光に透かした。「これなら、不足分をうちの蜜で埋められる。代は15G。花が違うから、味の違いは先方にも伝えておくれ」。',[
    O('buy','15Gで買う','bought',[give('alternative','keeper','party'),set('paid')],{cost:{gold:15}}),
    O('return','巣へ返しに行く','at_hive',[],repeat)
  ]);
  s.node('at_hive','hive',mina,'戻ってきた瓶をミナが巣の外縁にあてがった。ここで蜜を戻せば、冬の備蓄は小瓶の分まで元に戻る。',[
    O('restore','蜜を巣へ戻す','restored',[give('share','party','hive'),set('returned')],repeat)
  ]);
  s.node('restored','hive',mina,'小瓶が空になり、蜂が栓を固め直した。ミナは花期の札を指した。「今ある分を全部残すなら、先方に見せる日付を確かめておきましょう」',[
    O('season','花期を確かめる','calendar',[],repeat)
  ]);
  s.node('bought','apiary',keeper,'代を受け取った養蜂家が不足分の蜜を渡した。赤い小瓶と色の薄い代替蜜は、一つの注文の別々の荷として売約先へ運ぶ。',[
    O('deliver','荷を運ぶ','mixed_receipt')
  ]);
  s.node('mixed_receipt','depot',receipt,'荷受け人は二つの蜜を別々に味わった。「確かに違う味だ。赤い方が少ないことも札に書こう」。両方を合わせて契約量になることを確かめる。',[
    O('hand','二つを納める','limited',[give('share','party','recipient'),give('alternative','party','recipient'),set('delivery','mixed')])
  ]);
  s.node('limited','depot',receipt,'荷受け人は小瓶の前にだけ赤い札を置いた。この先に出せる赤い蜜は、蜂が分けてくれる量までだ。',[
    O('label','限定品と記す','@compromise')
  ]);
  s.node('unguarded','hive',mina,'護衛が退いた。ミナの空樽を巣の前に据える。外縁の蜜と、奥に栓をした越冬分を合わせれば約束の量になる。まだ樽は空だ。',[
    O('fill','樽に詰める','red_load',[give('share','hive','party'),give('reserve','hive','party')])
  ]);
  s.node('red_load','hive',mina,'樽は赤い蜜だけで一杯になった。ミナは空いた巣房の列を眺めている。樽に蓋をし、待っている荷受け人の所へ運ぶ。',[
    O('deliver','樽を運ぶ','red_receipt')
  ]);
  s.node('red_receipt','depot',receipt,'荷受け人が樽の印を契約書と突き合わせた。「赤い蜜だけで、取り決めどおり一樽」。巣にあれだけいた蜂の春のことは、帳面には書かれていない。',[
    O('hand','樽を納める','@contract',[give('share','party','recipient'),give('reserve','party','recipient'),set('delivery','red')])
  ]);
  const journey=connectWorld(s,world,1);
  journey('marks_buyer','office');journey('deadline_explain','depot',{companions:buyer});journey('deadline_small','hive');
  journey('new_date_hive','hive');journey('small_load_seller','apiary');journey('offer_return','hive');
  journey('bought_deliver','depot');journey('red_load_deliver','depot');
  const intact=and(is('shareAt','hive'),is('reserveAt','hive'));
  s.story.endings={
    informed:and(intact,is('revised'),is('calendarStarted'),not(is('paid')),is('delivery','none')),
    compromise:and(is('paid'),is('delivery','mixed'),is('reserveAt','hive'),is('shareAt','recipient'),is('alternativeAt','recipient')),
    contract:and(is('guardsDefeated'),is('delivery','red'),is('shareAt','recipient'),is('reserveAt','recipient'),not(is('paid')))
  };
  const implies=(id,a,b,message)=>s.invariant(id,or(not(a),b),message);
  implies('admission',s.known('buyerError'),s.known('flowerDate'),'巣の花期と帳面を照合して誤記を確かめる');
  implies('revision',is('revised'),and(intact,s.known('buyerError'),is('buyerAt','depot')),'蜜を巣に残し売約先と納期を改める');
  implies('calendar',is('calendarStarted'),is('revised'),'新しい納期を受け取ったミナが暦を作る');
  implies('reserve',not(is('reserveAt','hive')),is('guardsDefeated'),'越冬分は護衛に勝ってから採る');
  implies('purchase',is('paid'),and(not(is('alternativeAt','keeper')),is('reserveAt','hive')),'支払いと代替蜜の受領は同時に行う');
  implies('unpaid',not(is('paid')),is('alternativeAt','keeper'),'未購入の代替蜜は養蜂家の手元にある');
  implies('full-red',is('delivery','red'),and(is('reserveAt','recipient'),is('shareAt','recipient')),'樽の全量を売約先に届ける');
  implies('mixed',is('delivery','mixed'),and(is('paid'),is('shareAt','recipient'),is('alternativeAt','recipient')),'赤い蜜と代替蜜をそろえて納める');
  for(const scene of Object.values(s.story.scenes))for(const [i,cast] of scene.cast.entries()){
    cast.when=is(cast.entity+'At',scene.place);
    cast.display={x:scene.cast.length===1?50:i===0?33:67,y:10,scale:1,cardScale:1,layer:i};
  }
  return s.done();
}
