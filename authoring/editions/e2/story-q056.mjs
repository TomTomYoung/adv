import {O,set,give,and,when} from '../../story-kit.mjs';
import {marketQuest} from './market-world.mjs';

const theatre=marketQuest(56,{
  seats:['地下劇場の客席',15,5],wings:['舞台袖の操作台',16,5],studio:['奥の稽古場',17,5]
},{
  towa:['seats','舞台主のトワ','公演で聞こえる拍手の出所を観客に知らせる'],
  operator:['wings','舞台係','幕の裏で拍手機械の合図を扱う']
},{floor:2});
export const theatreCharacters=theatre.characters;
export function theatreSource(){
  const {s,scene,implies,finish}=theatre.create(),is=s.is;
  s.entity('machine','wings').entity('stopCard','wings').bool('testedSeats').bool('testedStop').bool('explained')
    .enum('board','unsold',['unsold','allSold','oneOpen']).enum('use','public',['public','broken','practice','manual']);
  scene('entry','seats','最後の客が扉を閉めても、頭上の箱から拍手が降ってくる。トワが廊下の寝台を指した。「あそこまで、ずっと聞こえるんです」。客席の番号板には空席の数だけ「未売」の札がある。',[
    O('sold','全席を売約にする','sold',[set('board','allSold')]),O('break','歯車を壊しに行く','gear'),O('move','稽古場に移す','pack')
  ]);
  scene('sold','seats','最後の札を裏返すと拍手がぴたりと止まった。トワが一席ぶんだけ札をつまんで待っている。',[
    O('uncover','一枚外して試す','silent',[set('board','oneOpen'),set('testedSeats')])
  ]);
  scene('silent','seats','一席を未売に戻した途端、また二つの手が鳴った。空席を数える仕掛けだ。すべてを売約に見せずに静めるなら、係が席番と別に持てる停止札が要る。',[
    O('switch','停止札を作る','switch'),O('practice','稽古用に移す','pack')
  ]);
  scene('gear','wings','幕の裏で二枚の木の手が打ち合っている。舞台係が覆いを開くと、歯車の欠けた所を通る一拍だけ音が飛んだ。',[
    O('snap','駆動輪を壊す','@contract',[set('use','broken')])
  ]);
  scene('switch','wings','舞台係が席番の板から細い紐をたどった。空席を残したまま止められるよう、別の溝に差す停止札を削り、一行に試してくれと言う。',[
    O('make','停止札を受け取る','try',[give('stopCard','wings','party')])
  ]);
  scene('try','wings','新しい札を差したまま、トワが客席で札を裏返す。今度は未売の席があっても木の手が動かない。抜くと音が戻る。',[
    O('verify','停止を確かめる','public',[set('testedStop')])
  ]);
  scene('public','wings','初演の幕がもうすぐ上がる。舞台係は口上の時間を空けた。「木の手も混じると話してから、お客を迎えましょう」。稽古場だけで使うなら機械を運ぶ支度ができる。',[
    O('announce','開演前に説明','address'),O('backstage','稽古場だけで使う','pack')
  ]);
  scene('address','seats','トワが幕の前に立った。空席で鳴る木の手を一度聞かせ、次に停止札を見せる。客は音が途切れた方へ顔を向けた。',[
    O('speak','役割を説明する','announced',[set('explained')])
  ]);
  scene('announced','seats','客はこれで、どちらの拍手かを聴き分けられる。幕の裏で止める係に札を渡しに戻る。',[O('return','舞台係の所へ','handover')]);
  scene('handover','wings','係は片手で幕綱を握り、空いた手を差し出した。今夜から閉店の合図で機械を止められる。',[
    O('give','停止札を託す','@informed',[give('stopCard','party','operator'),set('use','manual')])
  ]);
  scene('pack','wings',when(is('testedStop'),'試した停止札を抜いて機械の箱に収める。舞台の床から箱を外し、稽古場へ運べるようにする。','舞台係が木の手を布で挟み、床から機械の箱を外す。奥の稽古場なら、泊まり客まで音は届かない。'),[
    O('lift','箱を持ち上げる','loaded',[give('machine','wings','party')],{when:is('testedStop',false),visibleWhen:is('testedStop',false)}),
    O('lift_card','札と箱を預かる','loaded',[give('stopCard','party','machine'),give('machine','wings','party')],{when:is('testedStop'),visibleWhen:is('testedStop')})
  ]);
  scene('loaded','wings','箱の持ち手が掌に食い込む。客席にはもう拍手を鳴らす機械はない。床に据えるまでは、稽古場でも鳴らせない。',[O('carry','稽古場へ運ぶ','install')]);
  scene('install','studio','若い役者が稽古台の前を空けた。機械を据えて木の手に挟んだ布を外すと、一礼の間を測る拍手が返ってくる。',[
    O('install','稽古台に据える','@compromise',[give('machine','party','studio'),set('use','practice')])
  ]);
  implies('manual',is('use','manual'),and(is('testedSeats'),is('testedStop'),is('explained'),is('stopCardAt','operator')),'空席と停止を試し、説明後に係へ託す');
  implies('practice',is('use','practice'),is('machineAt','studio'),'稽古場で設置した機械だけを使う');
  return finish([['entry_break','wings'],['entry_move','wings'],['silent_switch','wings'],['silent_practice','wings'],['public_announce','seats'],['announced_return','wings'],['loaded_carry','studio']],{
    informed:is('use','manual'),contract:and(is('use','broken'),is('machineAt','wings')),compromise:is('use','practice')
  });
}
