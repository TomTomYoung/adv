import {story,O,set,give,see,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

const places={bench:'採集人の荷置き場',first:'花房の下の分岐',second:'段差の分岐',third:'白い花粉の分岐'};
const site=(id,x,y)=>({kind:'dungeon',dungeon:'region_3',map:'region_3_f1',x,y,event:'q024_edible_map_'+id});
const world={bench:site('bench',15,5),first:site('first',17,5),second:site('second',10,11),third:site('third',5,8)};
export const edibleMapCharacters={
  e2_edible_map_nom:{id:'e2_edible_map_nom',name:'採集人のノム',goal:'奥へ行く人に使える地図を残す',quests:['q024'],detail:'荷置き場で葉の地図と以前の写しを広げている。'},
  e2_edible_map_beginner:{id:'e2_edible_map_beginner',name:'初めての採集人',goal:'自分で帰れる道を覚える',quests:['q024'],detail:'調査に同行して分岐の道標を確かめる。'}
};

export function edibleMapSource(){
  const s=story(24,places,[]);
  s.entity('nom','bench','e2_edible_map_nom').entity('beginner','bench','e2_edible_map_beginner');
  s.entity('leaf','nom').entity('insect','leaf').entity('oldCopy','nom').entity('returnMap','party');
  s.int('walked',0,0,2,'最初の分岐から実際に歩き終えた調査区間の数');
  s.int('copiedLegs',-1,-1,2,'帰路の写しに刻んだ調査区間の数。未作成は−1');
  s.enum('leafType','live',['live','fixed','legend'],'葉の地図の仕上がり');
  for(const key of ['firstNotch','secondNotch','returned','dated'])s.bool(key);
  s.fact('low','最初の分岐では低い道の線が残り、花房側が欠けた。');
  s.fact('high','二番目では高い道の線が残り、低い側が欠けた。');
  s.fact('pollen','三番目でも花粉の濃い通路に重ねた線だけを虫が削った。');
  const both=['nom','beginner'],field=['beginner'],is=s.is;
  s.node('entry','bench',both,'採集人のノムが葉を広げた。道を描いた線を、小さな虫が端からかじっている。「昨日の写しともう違う。奥へ行く人にどっちを渡せばいい？」初めて来た採集人が籠を抱えて待っている。',[
    O('walk','葉を持って歩く','first_site'),
    O('fix','虫を葉から移す','cleared',[give('leaf','nom','party'),give('insect','leaf','bench')])
  ]);
  s.node('cleared','bench',both,'虫を荷台わきの草に移した。ノムの小皿には、採集した葉を固める薬が残っている。まだ柔らかい地図を平らに延ばした。',[
    O('coat','葉を薬で固める','fixed',[set('leafType','fixed')])
  ]);
  s.node('fixed','bench',both,'乾いた葉は縁を持ってもたわまない。今朝の近道がきれいに残った。次に花が開いても、この線はもう変わらない。',[
    O('hand','地図を返す','@contract',[give('leaf','party','nom')])
  ]);
  s.node('first_site','first',field,'最初の分かれ道。片方は花房の下へ潜り、もう片方には花粉が漂う。採集人が葉の向きを通路にそろえた。',[
    O('read','食跡を確かめる','first_choice',[see('low','first')])
  ]);
  s.node('first_choice','first',field,'低い通路に重なる線だけが残った。もう片方の線は虫の顎のところで途切れている。帰り道には荷置き場からここまでの道を使える。',[
    O('safe','低い道をたどる','second_site'),
    O('return','帰路を写す','home_first',[set('copiedLegs',s.v('walked'))])
  ]);
  s.node('second_site','second',field,'低い通路を抜け、次の分岐に出た。振り向くと道標の裏はまっさらだ。同行の採集人が「帰りに迷わないように」と石筆を渡した。',[
    O('mark','道標に写す','second_read',[set('firstNotch')])
  ]);
  s.node('second_read','second',field,'道標には、今歩いた低い道から来たことが刻まれた。目の前には上りと下りの二本がある。',[
    O('read','食跡を確かめる','second_choice',[see('high','second')])
  ]);
  s.node('second_choice','second',field,'今度は上りの線が残り、下りの線が食われている。「低い方を選べばいいんじゃなかったんだ」。採集人が一つ目の印を指でたどった。',[
    O('safe','高い道をたどる','third_site'),
    O('return','帰路を写す','home_second',[set('copiedLegs',s.v('walked'))])
  ]);
  s.node('third_site','third',field,'坂の先の分岐には白い花粉が片側にだけ積もっている。来た方の道標に、一行の靴跡が続いている。',[
    O('mark','道標に写す','third_read',[set('secondNotch')])
  ]);
  s.node('third_read','third',field,'二本目の道標に上り道を記した。採集人が葉を広げ、白く染まった通路と虫を見比べている。',[
    O('read','食跡を確かめる','third_choice',[see('pollen','third')])
  ]);
  s.node('third_choice','third',field,'白い花粉の側だけ、今まさに線が欠けていく。三地点を並べると、高さは違っても虫はいつも花粉の濃い側を食べていた。',[
    O('legend','凡例を書き込む','home_third',[set('leafType','legend')],{when:and(s.known('low'),s.known('high'),s.known('pollen'))}),
    O('return','帰路を写す','home_third',[set('copiedLegs',s.v('walked'))])
  ]);
  s.node('home_third','third',field,when(is('leafType','legend'),
    '葉の余白に「欠けた線は花粉の濃い道。残った線をたどる」と記した。採集人が二番目の分岐を指さす。',
    '歩いて確かめた二つの区間を帰りの紙に写した。花の先の通路は空白にして引き返す。'),[
    O('back','段差まで戻る','home_second')
  ]);
  s.node('home_second','second',field,when(is('copiedLegs',1),
    '採集人の紙には、低い通路をここまでたどった一本だけがある。「この刻みを見れば帰れます」。上りの先は空けておいた。',
    '段差の道標に最初の刻みが見つかった。行きに通った低い道を逆にたどれば、花房の下へ戻れる。'),[
    O('back','花房まで戻る','home_first')
  ]);
  s.node('home_first','first',field,when(is('copiedLegs',0),
    '奥の道はまだ一本も歩いていない。荷置き場からこの分岐までの目印だけを紙に写した。採集人が帰りの向きを確かめる。',
    '花房の陰に最初の足跡が残っていた。採集人は籠を持ち直し、荷置き場への道を自分で指さした。'),[
    O('back','荷置き場へ戻る','home')
  ]);
  s.node('home','bench',both,when(is('leafType','legend'),
    '一行が荷置き場に着くと、ノムが昨日の写しを広げた。虫はまだ生きた葉にいて、凡例の傍らを歩いている。',
    '採集人は自分の足で荷置き場に帰った。帰路を刻んだ紙と、虫が乗ったままの葉が手元にある。'),[
    O('give_leaf','葉をノムに返す','received',[give('leaf','party','nom')],{when:is('leafType','legend')}),
    O('hand','帰路図を渡す','@compromise',[give('leaf','party','nom'),give('returnMap','party','beginner')],{when:not(is('copiedLegs',-1))})
  ]);
  s.node('received','bench',both,'ノムは戻った葉と古い写しを見比べた。「花が開けば線も変わる。これは昨日までの道だ」。写しの隅に筆を当てた。',[
    O('date','写しに日付を記す','@informed',[set('dated')])
  ]);
  const journey=connectWorld(s,world,1), party={companions:field};
  journey('entry_walk','first',{...party,depart:[give('leaf','nom','party')]});
  journey('first_choice_safe','second',{...party,arrive:[set('walked',1)]});
  journey('second_choice_safe','third',{...party,arrive:[set('walked',2)]});
  journey('home_third_back','second',party);
  journey('home_second_back','first',party);
  journey('home_first_back','bench',{...party,arrive:[set('returned')]});
  const home=and(is('returned'),is('beginnerAt','bench'),is('leafAt','nom'));
  s.story.endings={
    contract:and(is('leafType','fixed'),is('leafAt','nom'),is('insectAt','bench'),is('walked',0),not(is('returned'))),
    informed:and(home,is('leafType','legend'),is('insectAt','leaf'),is('dated'),is('oldCopyAt','nom'),is('copiedLegs',-1)),
    compromise:and(home,is('leafType','live'),is('insectAt','leaf'),is('returnMapAt','beginner'),is('copiedLegs',s.v('walked')))
  };
  const implies=(key,premise,consequence,message)=>s.invariant(key,or(not(premise),consequence),message);
  implies('one-mark',is('firstNotch'),and(not(is('walked',0)),s.known('low')),'最初の区間を歩いてから道標に写す');
  implies('two-marks',is('secondNotch'),and(is('walked',2),is('firstNotch'),s.known('high')),'二つ目の道標は上り道の先');
  implies('second-reading',s.known('high'),is('firstNotch'),'二地点目の食跡は実地で読む');
  implies('third-reading',s.known('pollen'),is('secondNotch'),'三地点目の食跡は実地で読む');
  implies('legend',is('leafType','legend'),and(s.known('low'),s.known('high'),s.known('pollen'),is('insectAt','leaf')),'凡例は生きた葉の三地点比較から得る');
  implies('fixed',is('leafType','fixed'),and(is('insectAt','bench'),not(s.known('low'))),'虫を移してから薬で固定する');
  implies('copy-depth',not(is('copiedLegs',-1)),and(is('copiedLegs',s.v('walked')),is('leafType','live'),s.known('low')),'帰路図には確かめた区間だけを刻む');
  implies('dated',is('dated'),and(home,is('leafType','legend')),'ノムが葉を受け取って古い写しに日付を入れる');
  for(const scene of Object.values(s.story.scenes))scene.cast.forEach((cast,i)=>{
    cast.when=is(cast.entity+'At',scene.place);
    cast.display={x:scene.cast.length===2?[30,70][i]:50,y:10,scale:1,cardScale:1,layer:i};
  });
  return s.done();
}
