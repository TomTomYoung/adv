import {O,set,give,and,not,when} from '../../story-kit.mjs';
import {canalQuest} from './canal-quarter.mjs';

export default canalQuest(105,{
  hall:['婚礼の会場','席と料理を用意してダンが待っている。','location_tavern'],
  bridge:['婚礼の日の運河橋','婚礼の列が待つ橋。水際に靴が一つ浮いている。'],
  shop:['木屑の残る工房','作業場の戸から新しい木屑が続く。','location_shop'],
  bank:['運河の泥道','荷車の轍と片足だけの靴跡が並ぶ。'],
  cart:['荷車の停まる船着場','降ろし切れない荷が車に残る。']
},{dan:['婚約者ダン','hall','リセの無事を確かめ、婚礼後の予定も一緒に決める'],lise:['花嫁リセ','cart','姉に婚礼へ来てほしいが、家業をどう分けるかまだ話せていない'],sister:['荷を運ぶ姉','cart','家業を一人で背負わずに済む分担を決めたい']},(s,scene)=>{
  const again={once:false};s.entity('shoe','bridge');s.bool('reported').bool('work').bool('postponed').bool('returned');
  s.enum('trail','none',['none','shop','canal'],'姉妹を見つけた手がかり');
  scene('entry','hall',['dan'],'ダンが片方だけの足元を指で示した。「橋にリセの靴が浮いてるんです。連れ去られたんでしょうか」。会場に戻って来たときのため、ダンにここで待ってもらう。',[O('bridge','運河橋を調べる','clues')]);
  scene('clues','bridge',[],'橋から片方の靴を引き上げた。工房側に木屑が、泥道には車輪の跡がある。',[
    O('shop','木屑をたどる','shop',[give('shoe','bridge','party'),set('trail','shop')]),O('canal','轍をたどる','bank',[give('shoe','bridge','party'),set('trail','canal')])]);
  scene('shop','shop',[],'敷居の木屑に靴の縁がこすれた。奥は空で、削った材を積んだ車が船着場に出たばかりだった。',[O('follow','荷車を追う','sisters')]);
  scene('bank','bank',[],'轍の脇で片方の靴跡が途切れ、その先に裸足の跡が続く。荷車は船着場で止まった。',[O('follow','足跡を追う','sisters')]);
  scene('sisters','cart',['lise','sister'],when(s.is('reported'),'「無事って伝わったのね」。リセは荷車の柄から手を離し、姉に向き直った。','リセは裸足で姉の荷車を押していた。「式に来てほしい。でも、この荷を明日から誰が運ぶか、まだ話せてないの」。'),[
    O('report','無事を伝えに行く','news',[],{when:not(s.is('reported'))}),O('roles','分担を相談する','roles',[],again),
    O('return','式へ戻る','wedding',[],{companions:['lise']}),O('delay','延期を提案する','delay',[],{companions:['lise']})]);
  scene('news','hall',['dan'],'ダンは椅子を引いたまま待っていた。荷車を押していたこと、靴が脱げてもリセが無事だったことを直接知らせる。',[O('tell','知らせて姉妹のもとへ','sisters',[set('reported')])]);
  scene('roles','cart',['lise','sister'],'姉は週二日だけ荷を運んでほしいと頼んだ。リセは、その日なら婚礼の後も来られると答えた。ダンと曜日を確かめて初めて約束が決まる。',[O('agree','ダンと日取りを確認','calendar',[],{companions:['lise']}),O('back','まだ決めずに戻る','sisters',[],again)]);
  scene('calendar','hall',['dan','lise'],when(s.is('reported'),'ダンは無事の知らせをすでに聞いている。リセと一緒に、姉が頼んだ二日を暦に書き込んだ。','ダンはリセ本人を迎え、無事を確かめた。荷車を押した話を聞き、週二日を一緒に暦に印した。'),[O('confirm','二日を姉に届ける','deliver',[set('reported'),set('work')])]);
  scene('deliver','cart',['sister'],'姉が暦を開いて荷運びの日を読み返した。濡れた靴は修繕に預ける。残った荷を片付ければ、遅れてでも席に着ける。',[O('hand','暦と靴を預ける','ready',[give('shoe','party','sister')])]);
  scene('ready','cart',['sister'],'姉が最後の荷を降ろした。暦と修繕道具をしまうと、婚礼の席まで一緒に来てほしいと頼んだ。',[O('escort','姉と会場へ','arrival',[],{companions:['sister']})]);
  scene('arrival','hall',['dan','lise','sister'],'姉のために空けておいた席に、遅れて本人が着いた。来週の仕事はもう暦にある。リセが椅子を引いた。',[O('seat','姉を席へ案内','@roles')]);
  scene('wedding','hall',['lise','dan'],'リセは自分で式へ戻った。姉の席は空いたまま。落とした靴は乾かし、修繕して届けるためにダンへ預ける。',[O('seat','式を始める','@return',[give('shoe','party','dan'),set('returned')])]);
  scene('delay','hall',['lise','dan'],'リセが延期を申し出ると、ダンは料理を近所へ分ける段取りをつけた。姉のもとに戻れば、来週の荷を書き出す時間がある。',[O('back','姉のもとへ','week',[set('postponed')],{companions:['lise']})]);
  scene('week','cart',['lise','sister'],'荷車の上に来週の紙を広げた。式の日を急いで決める前に、姉妹で最初の仕事を書く。',[O('plan','来週の仕事を書く','@delay',[give('shoe','party','lise')])]);
  return {return:and(s.is('returned'),s.is('liseAt','hall')),roles:and(s.is('work'),s.is('reported'),s.is('shoeAt','sister')),delay:and(s.is('postponed'),s.is('liseAt','cart'))};
});
