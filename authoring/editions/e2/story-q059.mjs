import {O,set,give,and,when} from '../../story-kit.mjs';
import {marketQuest} from './market-world.mjs';

const feast=marketQuest(59,{
  hall:['祝宴の宴会室',10,11],kitchen:['宴会室の調理場',9,11],pantry:['宴の食糧置場',8,11],queue:['配給の受渡口',7,11]
},{
  host:['hall','祝宴の予約者','招いた人に食事を届ける',['kitchen']],
  kiku:['kitchen','料理人のキク','客に出せる食事を確かめる'],
  guests:['queue','招かれた働き手たち','仕事仲間と食事を分ける']
},{floor:2,characterIds:{kiku:'e2_q053_kiku'}});
export const feastCharacters=feast.characters;
export function feastSource(){
  const {s,scene,implies,finish}=feast.create(),is=s.is;
  s.entity('food','pantry').bool('metGuests').bool('roster').bool('beastDefeated').bool('packed')
    .enum('agreement','reservation',['reservation','cooperative','ration','banquet']);
  scene('entry','hall','予約帳には一人分の名前、卓には百の椀。扉の外で道具袋を持った人たちが待っている。予約者は全額自分につけてくれと言う。食糧置場では木箱を引っかく音がした。',[
    O('prepare','調理場で支度','guests'),O('guard','食糧置場を守る','beast'),O('preserve','保存食に替える','ration')
  ]);
  scene('guests','kitchen','キクが包丁を握ると、外から「野菜なら刻める」「鍋を運べる」と声がした。仕事を失った百人を招いたのは予約者一人だった。みんなが手を貸しても、勘定だけは自分にと頼んでいる。',[
    O('hear','支度を申し合わせる','offer',[set('metGuests')])
  ]);
  scene('offer','kitchen','「今夜の椀を洗えば、明日の朝にもこの鍋を使えますよ」。キクは空いた当番表を出した。今夜限りなら、数日に分けて持てる食事にもできる。',[
    O('share','共同炊事を相談','roster'),O('packs','保存食を用意','ration')
  ]);
  scene('roster','kitchen','予約者は初回の材料費を引き受けた。招かれた人は炊事と片付けに名前を分け、次回の費用は皆で決めると当番表の下に書いた。',[
    O('record','当番案を記す','kitchen',[set('roster')])
  ]);
  scene('kitchen','kitchen','この紙はまだ当番の案だ。予約帳を共同炊事の契約に書き換えるか、今日は保存食だけにするか、キクが予約者の返事を待っている。',[
    O('contract','予約を切り替える','register'),O('rations','今回は配給にする','ration')
  ]);
  scene('register','hall','予約者は宴会室の帳簿を開いた。初回材料費の欄に自分の名を置き、次回からの欄には当番表を綴じる。百人分を一人に請求する予約をここで閉じる。',[
    O('sign','共同炊事を契約','@informed',[set('agreement','cooperative')])
  ]);
  scene('beast','pantry','食糧の木箱に獣が爪を立てている。予約者の名札の付いた箱はまだ閉じたままだ。獣が退けば、予約どおりに宴へ運べる。',[
    O('fight','獣を追い払う','safe',[set('beastDefeated')],{combat:'guard_6',combatRequirement:'勝利後に食糧を搬出'})
  ]);
  scene('safe','pantry','獣が床から飛び退き、棚の奥へ消えた。キクが確認した百人分の箱を一行に託す。勘定はまだ予約者一人の名に付いている。',[
    O('load','百人分を積む','loaded',[give('food','pantry','party')])
  ]);
  scene('loaded','pantry','守り切った食糧を宴会室へ運ぶ。鍋を囲む席は百人分空けてある。',[O('carry','宴会室へ','serve')]);
  scene('serve','hall','待っていた人たちを席へ通した。予約者が「勘定は約束どおり私へ」と言い、百の椀に湯気が立つ。',[
    O('serve','予約通りに開宴','@contract',[give('food','party','hall'),set('agreement','banquet')])
  ]);
  scene('ration','pantry',when(is('roster'),'当番表の案は残し、継続の契約欄は空けておく。今ある百人分を数日に分けられる保存食に仕立てる。','貯蔵棚から百人分を取り出す。宴の大皿に盛る代わりに、一人で持って帰れるよう数日分ずつに包む。'),[
    O('pack','配給分を包む','packages',[give('food','pantry','party'),set('packed')])
  ]);
  scene('packages','pantry','紐を結んだ包みが順に積み上がった。まだ受け取っていない人が、道具袋を抱えて受渡口で待っている。',[O('carry','受渡口へ','give')]);
  scene('give','queue','道具袋の上に包みを一つずつ載せる。百人の列の最後まで食事は行き渡った。',[
    O('give','保存食を配る','@compromise',[give('food','party','guests'),set('agreement','ration')])
  ]);
  implies('roster',is('roster'),is('metGuests'),'手伝える人と支払う人を確認して役割を書く');
  implies('banquet',is('agreement','banquet'),and(is('beastDefeated'),is('foodAt','hall')),'食糧を守ったあと予約通り開催する');
  return finish([['entry_prepare','kitchen',['host']],['entry_guard','pantry'],['entry_preserve','pantry'],['offer_packs','pantry'],['kitchen_contract','hall',['host']],['kitchen_rations','pantry'],['loaded_carry','hall'],['packages_carry','queue']],{
    informed:and(is('agreement','cooperative'),is('roster')),contract:is('agreement','banquet'),compromise:and(is('agreement','ration'),is('packed'),is('foodAt','guests'))
  });
}
