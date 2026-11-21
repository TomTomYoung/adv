import {O,set,give,see,and,or,when} from '../../story-kit.mjs';
import {dungeonQuest} from './dungeon-world.mjs';

const quest=dungeonQuest(97,{roll:['担架の点呼場',17,3],gate:['地上側の帰還門',17,5],side:['別口の照会窓',17,4]},
  {yachi:['roll','救助人のヤチ','声と帰還者名簿を一人ずつ突き合わせる'],porter:['roll','運搬人のトワ','荷とは別に自分の帰還を認めてもらう',['gate','side']],crew:['roll','担架の帰還隊','手を貸した運搬人と一緒に帰る',['gate']]},
  {dungeon:'region_10',floor:2,prefix:'roll'});
export const rollCharacters=quest.characters;
export function rollSource(){
  const {s,scene,implies,finish}=quest.create(),is=s.is;
  s.entity('pass','yachi').bool('named').bool('answered');
  s.enum('paper','none',['none','personal','temporary','town','listed'],'門で提出する書類');
  s.fact('witness','隊員が、トワが遭難地点で担架を支えたと証言した。');
  scene('entry','roll','ヤチが名簿の最後の名を呼ぶ。最後の返事が消える前に、担架の後ろからもう一人が答えた。柄を握る手は確かに一人分多い。荷の欄には、増えた担架の重さしか書かれていない。',[
    O('name','本人に聞く','witness'),O('temporary','全員を仮登録','provisional',[set('paper','temporary')]),O('count','名簿どおり','listed',[set('paper','listed')])]);
  scene('witness','roll','「トワです。壁が崩れた角から、一緒に来ました」。担架の隊員がうなずいた。「そこで取っ手を代わってくれた。荷を増やした人じゃない、俺を運んでくれた人だ」。',[O('hear','証言を記す','choice',[see('witness','crew')])]);
  scene('choice','roll','ヤチが荷の欄の隣で筆を止めた。トワの名は聞き取れた。本人の名で隊員欄を一行増やすか、町で本登録するため全員を仮名簿で通すかを決められる。',[
    O('register','名を加える','newRoll',[set('named')]),O('provisional','全員を仮登録','provisional',[set('paper','temporary')])]);
  scene('newRoll','roll','荷の数はそのままにして、隊員の最後に「トワ」と記した。ヤチが指を先頭へ戻す。今度は全員の名を一つずつ呼び、手が挙がるのを待つ。',[O('call','もう一度点呼','answered',[set('answered')])]);
  scene('answered','roll','トワの返事が新しい一行に重なった。ヤチは帰還証に本人の名を写す。ここで本人へ渡すことも、署名した名簿を町へ回して証の発行を預けることもできる。',[
    O('certificate','本人に証を渡す','certified',[set('paper','personal'),give('pass','yachi','porter')]),
    O('town','町に発行を託す','provisional',[set('paper','town')])]);
  scene('certified','roll','トワは自分の名を読んでから証を胸にしまった。担架に掛けた荷札には手を触れなかった。門まで一緒に歩けば、本人がその証を出せる。',[O('escort','全員で門へ','through')]);
  scene('provisional','roll',when(is('named'),'トワの名が入った名簿を町宛てに封じる。正式な証の発行は向こうで行う。今日の通過には全員分の仮札を使う。','ヤチが担架を支える手まで数え直し、一人に一枚ずつ仮札を渡した。最後の一枚も人の欄に綴じ、地下を出た人数を町へ知らせる。'),[O('escort','全員で門へ','through')]);
  scene('through','gate',when(is('paper','personal'),'担架が門を越えた後、トワが荷札とは別に自分の証を差し出した。門の係が本人の欄に帰還印を押す。','最後の仮札まで回収され、担架を支えた人も地上側で列に加わった。正式な証を誰が発行するかは町への申し送りに残る。'),[
    O('check','本人の証を照合','@informed',[],{when:is('paper','personal'),visibleWhen:is('paper','personal')}),
    O('file','仮札を照合','@compromise',[],{when:or(is('paper','temporary'),is('paper','town')),visibleWhen:or(is('paper','temporary'),is('paper','town'))})]);
  scene('listed','roll','名簿の行だけで門の人数を確定した。余った返事の主は別口で事情を説明することになる。ヤチが担架をいったん置かせ、窓までの道を指す。',[O('guide','別口へ案内','outside')]);
  scene('outside','side','トワは照会窓の係に名前と遭難地点を伝え始めた。係は別の書類を探している。担架の列は点呼場で待っている。',[O('back','点呼場へ戻る','remaining')]);
  scene('remaining','roll','ヤチが元の名簿を持ち上げた。そこに載る隊員だけが担架を取り直す。別口へ行った運搬人の場所は列の中に空いたままだ。',[O('escort','記載者を通す','counted')]);
  scene('counted','gate','門で受けた人数は元の名簿と合った。別口の窓はまだ開いている。そこにいる一人は、門の帰還人数に含まれていない。',[O('close','名簿を閉じる','@contract')]);
  implies('name',is('named'),s.known('witness'),'本人と隊員の証言を聞いて記名する');
  implies('answer',is('answered'),is('named'),'名簿を直してから全員を呼ぶ');
  implies('pass',is('passAt','porter'),and(is('answered'),is('paper','personal')),'本人への証は再点呼後に渡す');
  return finish([['certified_escort','gate',['porter','crew']],['provisional_escort','gate',['porter','crew']],['listed_guide','side',['porter']],['outside_back','roll'],['remaining_escort','gate',['crew']]],
    {informed:and(is('porterAt','gate'),is('crewAt','gate'),is('passAt','porter')),compromise:and(is('crewAt','gate'),is('porterAt','gate'),or(is('paper','temporary'),is('paper','town'))),
     contract:and(is('paper','listed'),is('crewAt','gate'),is('porterAt','side'))});
}
