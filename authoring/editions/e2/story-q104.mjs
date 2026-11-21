import {O,set,give,and,when} from '../../story-kit.mjs';
import {canalQuest} from './canal-quarter.mjs';

export default canalQuest(104,{
  stall:['花売りの少年の露店','瓶が並び、一つ分だけ丸い跡が残っている。','location_shop'],
  fountain:['噴水のある辻','噴水の飛沫に桶と屋根の槌の音が混じる。'],
  window:['楽師の窓辺','内側から、短い雨の音が繰り返し聞こえる。']
},{boy:['花売りの少年','stall','雨音の瓶を商品として扱い、値段と貸し方を自分で決める'],vero:['老楽師ベロ','window','故郷の雨音を夜に聞きたい']},(s,scene)=>{
  const together={companions:['boy']};s.entity('bottle','vero');s.bool('rule').bool('paid').bool('lease');
  s.enum('owner','boy',['boy','vero'],'瓶の所有者');s.enum('use','unsettled',['unsettled','returned','gift','overnight']);
  scene('entry','stall',['boy'],'晴天の棚に丸い跡が一つ。少年は空いたところに耳を寄せた。「向こうから、うちの雨が聞こえる」。',[O('sound','水音を追う','sound',[],together),O('ask','仕組みを尋ねる','rule')]);
  scene('rule','stall',['boy'],'少年が別の瓶の口で指を鳴らす。少し待つと瓶だけが同じ音を返した。「初めに聞かせた音を覚えるんだ」。',[O('find','繰り返す音を追う','found',[set('rule')],together)]);
  scene('sound','fountain',['boy'],'噴水の間隔は同じでも風で飛沫がずれる。屋根の槌は次第に近づく。遠い窓からだけ、雨とくしゃみが毎回同じ順で聞こえた。',[O('repeat','くしゃみを追う','found',[],together),O('learn','店で仕組みを聞く','rule',[],together)]);
  scene('found','window',['boy','vero'],when(s.is('rule'),'聞き慣れた繰り返しの先で、ベロが瓶を抱えていた。「故郷の雨だ」。少年は掌を出した。「それでも、売り物だよ」。','また同じくしゃみだ。窓を開けたベロは瓶を離さない。「故郷では、夜になると降った」。少年が値札を見せた。'),[
    O('return','瓶を返してもらう','carrying',[give('bottle','vero','boy')]),
    O('buy','40Gで買う','receipt',[set('paid'),set('owner','vero')],{cost:{gold:40}}),O('lease','貸し方を相談','lease')]);
  scene('lease','window',['boy','vero'],'「朝には返すよ」とベロ。「じゃあ一曲、別の瓶に入れて」。所有者は少年のまま、夜だけ貸す条件がそろった。',[
    O('agree','夜だけ貸す','terms',[set('lease')]),O('return','契約せず返す','carrying',[give('bottle','vero','boy')])]);
  scene('carrying','window',['boy','vero'],'瓶が少年の手に戻った。水音を割らないよう抱えて、少年と露店の棚へ戻る。',[O('shelf','露店へ戻る','shelf',[],together)]);
  scene('shelf','stall',['boy'],'少年が瓶を棚の丸い跡に戻すと、その場所で雨音がまた鳴り始めた。',[O('place','棚に戻す','@return',[give('bottle','boy','stall'),set('use','returned')])]);
  scene('receipt','window',['boy','vero'],'少年が四十枚を数えて包み紙を渡した。ベロの手元の瓶に包みが掛かる。今度はその人自身の持ち物だ。',[O('gift','贈り物を包む','@buy',[set('use','gift')])]);
  scene('terms','window',['boy','vero'],'夜の借り手、朝の返し先、曲を録る瓶。それぞれを少年とベロが確かめる。少年は自分の値札を外さなかった。',[O('record','貸し方を記す','@lease',[set('use','overnight')])]);
  return {return:and(s.is('use','returned'),s.is('bottleAt','stall')),buy:and(s.is('paid'),s.is('owner','vero'),s.is('use','gift')),lease:and(s.is('lease'),s.is('owner','boy'),s.is('use','overnight'))};
});
