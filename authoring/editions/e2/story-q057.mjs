import {O,set,give,and,when} from '../../story-kit.mjs';
import {marketQuest} from './market-world.mjs';

const stall=marketQuest(57,{
  stall:['交代露店の売台',13,7],till:['露店の勘定台',13,6],evening:['夕番の荷置場',13,5],office:['市場番の詰所',12,5]
},{
  morning:['stall','朝番の売り手','昼番に共同の売上袋を渡す',['till']],
  noon:['till','昼番の売り手','夕番に同じ売上袋を渡す',['evening']],
  late:['evening','夕番の売り手','輪番の届けに仲間の名をそろえる'],
  zen:['office','市場番のゼン','市場で商う人と通る人の申し出を取り次ぐ']
},{floor:2});
export const stallCharacters=stall.characters;
export function stallSource(){
  const {s,scene,implies,finish}=stall.create(),is=s.is;
  s.entity('bag','morning').entity('goods','stall').entity('permit','zen').bool('sawNoon').bool('assent')
    .enum('licence','none',['none','temporary','joint','cleared']);
  scene('entry','stall','朝番の売り手が日除けを張り直した。「店の主なら、私じゃありません」。無主につき撤去と書いた紙が台の脚に貼られている。昼には別の人が売りに立つそうだ。',[
    O('wait','昼番を待つ','handoff'),O('permit','仮の営業札を頼む','permit'),O('clear','商品を撤去する','remove')
  ]);
  scene('handoff','till','昼の鐘が鳴る。朝番は売上袋に最後の釣銭を足し、勘定台に来た昼番にそのまま渡した。「袋まで分けたら、明日の釣銭が作れません」。',[
    O('watch','袋の引継ぎを見る','noon',[give('bag','morning','noon'),set('sawNoon')])
  ]);
  scene('noon','till','昼番も自分の店だとは言わない。夕方はまた別の人がこの袋を持つという。朝番と昼番に、名義と当番を分けて届ける考えを聞いてみる。',[
    O('evening','夕番にも聞く','proposal'),O('permit','期限付き札を頼む','permit')
  ]);
  scene('proposal','till','二人は袋の口紐に通した七人の名札を見せた。「共同の店だと書けるなら。代表は曜日で替わります」。朝番は勘定台に残り、昼番が同じ袋を持って夕番を呼びに行く。',[O('call','夕番の荷置場へ','assembly')]);
  scene('assembly','evening','袋を受け取った夕番が、今日の印を結び目に付けた。「うちの店です、と言えばいいんですね」。朝昼の二人の印の下に、夕番が同じ条件を書き添えた。',[
    O('agree','三人の同意を確認','consent',[give('bag','noon','late'),set('assent')])
  ]);
  scene('consent','evening','三人の届けには共同名義と、曜日ごとの代表が載った。正式に届けるか、七人全員が顔を合わせるまでは仮の営業札で待つか。',[
    O('register','輪番を届ける','register'),O('temporary','期限付きにする','permit')
  ]);
  scene('register','office','ゼンは空白だった店の名義欄に七人の共同露店と記し、代表の欄を曜日で七つに割った。一人が休んでも、店の名義は残る。',[
    O('file','共同名義で登録','@informed',[set('licence','joint')])
  ]);
  scene('permit','office',when(is('assent'),'ゼンは三人の届けを預かり、残りの当番にも確かめる日を空けた。いま出す札には有効期限を書く。','ゼンは名義欄を空けたまま、有効期限のある営業札を書いた。期限までなら売台を開けてよい。'),[
    O('issue','仮札を受け取る','issued',[give('permit','zen','party')])
  ]);
  scene('issued','office','営業札を売台へ届けよう。撤去の紙はまだ脚に貼られている。',[O('bring','売台へ','post')]);
  scene('post','stall','撤去の紙の上に、有効期限も読める高さで営業札を掛ける。閉店後に全員の都合を聞く仕事がゼンに残った。',[
    O('post','営業札を掲げる','@compromise',[give('permit','party','stall'),set('licence','temporary')])
  ]);
  scene('remove','stall','朝番は売上袋を自分の腰に結んだ。撤去の対象は台に並ぶ商品だ。受取数を控えて、商品だけを詰所へ運ぶ。',[
    O('pack','商品をまとめる','loaded',[give('goods','stall','party')])
  ]);
  scene('loaded','stall','台が空き、ここを通れる幅が戻った。商品を預かった数は、詰所でもう一度照らし合わせる。',[O('carry','詰所へ搬入','receipt')]);
  scene('receipt','office','ゼンが控えと商品を照合した。露店の登録を閉じれば、次に商う時は七人それぞれに出店料がかかる。',[
    O('close','撤去を記録','@contract',[give('goods','party','zen'),set('licence','cleared')])
  ]);
  implies('joint',is('licence','joint'),and(is('sawNoon'),is('assent'),is('bagAt','late')),'実際の引継ぎと三人の同意を確かめる');
  return finish([['entry_wait','till',['morning']],['entry_permit','office'],['noon_permit','office'],['proposal_call','evening',['noon']],['consent_register','office'],['consent_temporary','office'],['issued_bring','stall'],['loaded_carry','office']],{
    informed:is('licence','joint'),compromise:and(is('licence','temporary'),is('permitAt','stall')),contract:and(is('licence','cleared'),is('goodsAt','zen'))
  });
}
