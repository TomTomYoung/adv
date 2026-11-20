import {O,set,give,and,when} from '../../story-kit.mjs';
import {marketQuest} from './market-world.mjs';

const market=marketQuest(53,{
  dock:['地下市場の荷受け台',15,5],rack:['食糧庫の箱棚',16,5],kitchen:['市場食堂の厨房口',17,5]
},{
  clerk:['dock','荷受け係','入荷の日付と納品先を記す'],
  kiku:['kitchen','料理人のキク','客に出せる食事を確かめる']
});
export const foodCharacters=market.characters;
export function foodSource(){
  const {s,scene,implies,finish}=market.create(),is=s.is;
  s.entity('locker','rack').entity('fresh','rack').entity('old','rack').bool('dawn').bool('sorted').bool('datesFixed')
    .bool('replacement').bool('dinersTold').bool('chefLoss');
  scene('entry','dock','昨日来た木箱にも、今朝来た木箱にも、札には「賞味期限は明日」とある。荷受け係は納品書の欄を空けたまま、厨房から戻ってくる空の荷車を指した。',[
    O('night','夜明けを待つ','night'),O('sort','箱を検める','inspect'),O('deliver','札のまま納品','load'),O('isolate','全箱を隔離','isolate')
  ]);
  scene('night','dock','夜番の灯が消えた。箱は一つも動いていないのに、日付札の小窓だけがカチリと送り直される。今日も読みは「明日」だ。',[
    O('watch','札を確かめる','sign',[set('dawn')])
  ]);
  scene('sign','dock','荷受け係が古い伝票を出した。同じ文字の下に、何日も前の荷がある。「箱を開けますか。それとも全部ここで止めますか」',[
    O('sort','箱を検める','inspect'),O('quarantine','全箱を隔離','isolate')
  ]);
  scene('inspect','rack','底板の匂いも中身の張りも違う。新しい箱は青紐で、納められない古い箱は茶紐で束ね、棚の反対側へ寄せる。',[
    O('divide','二組に分ける','sorting',[set('sorted')])
  ]);
  scene('sorting','rack','青紐の箱は使える。札の文字はどちらも「明日」のままだ。今の入荷日を残すか、新しい便が来るまで両方を止めるか。',[
    O('dates','入荷日を固定','dates'),O('none','両方とも隔離','isolate')
  ]);
  scene('dates','dock','荷受け係が二枚の伝票を広げ、受領した日を箱番号の横に書いた。食堂へ出せる番号には青い丸を付ける。',[
    O('write','日付を掲示','posted',[set('datesFixed')])
  ]);
  scene('posted','dock','固定した日付と箱番号を照合した。棚から厨房に運ぶのは青紐の箱だけだ。',[
    O('fetch','青紐の棚へ','usable')
  ]);
  scene('usable','rack','茶紐を解かず、青紐の束だけを荷車へ積んだ。',[
    O('take','使える箱を積む','loaded_fresh',[give('fresh','rack','party')])
  ]);
  scene('loaded_fresh','rack','荷車を厨房口へ押していく。古い箱は棚に残っている。',[O('carry','厨房へ','receive_fresh')]);
  scene('receive_fresh','kitchen','キクが青い丸と箱番号を読み合わせた。「これなら二つの鍋にしよう」。残りのかまどから薪を下ろす。',[
    O('hand','使える箱を渡す','@informed',[give('fresh','party','kiku')])
  ]);
  scene('load','rack','出発の鐘が鳴った。「明日」の札を読み上げ、二組の箱を封を切らずに荷車へ載せる。',[
    O('take','全箱を積む','loaded',[give('fresh','rack','party'),give('old','rack','party')])
  ]);
  scene('loaded','rack','荷受け係の伝票には全箱納品とある。一行が荷車を押し、厨房へ向かう。',[O('carry','厨房へ','receive_all')]);
  scene('receive_all','kitchen','キクが納品を受けて古い箱を開けた。酸っぱい匂いに眉を寄せ、自分の財布から廃棄代を出した。',[
    O('settle','納品を確定','@contract',[give('fresh','party','kiku'),give('old','party','kitchen'),set('chefLoss')])
  ]);
  scene('isolate','rack',when(is('sorted'),'青紐も茶紐も隔離戸の内側へ納める。','封を開けず、期限札の同じ箱をすべて隔離戸の内側へ納める。'),[
    O('seal','隔離戸を閉める','sealed',[give('fresh','rack','locker'),give('old','rack','locker')])
  ]);
  scene('sealed','rack','隔離戸に鍵を掛けた。代わりの便がいつ届くか、厨房口でキクと手配する。',[O('order','厨房へ','replacement')]);
  scene('replacement','kitchen','キクは次の便に注文を入れ、食事を待つ客の卓へ向き直った。遅れる理由と、待てない人が返金を受ける場所を先に伝える。',[
    O('notify','手配を知らせる','@compromise',[set('replacement'),set('dinersTold')])
  ]);
  implies('fixed',is('datesFixed'),is('sorted'),'選別した二組の入荷日を掲示する');
  implies('replacement',is('replacement'),and(is('freshAt','locker'),is('oldAt','locker')),'全箱隔離後に代替便を手配する');
  return finish([['entry_sort','rack'],['entry_deliver','rack'],['entry_isolate','rack'],['sign_sort','rack'],['sign_quarantine','rack'],['sorting_dates','dock'],['posted_fetch','rack'],['loaded_fresh_carry','kitchen'],['loaded_carry','kitchen'],['sealed_order','kitchen']],{
    informed:and(is('datesFixed'),is('freshAt','kiku'),is('oldAt','rack')),contract:and(is('chefLoss'),is('freshAt','kiku'),is('oldAt','kitchen')),compromise:and(is('replacement'),is('dinersTold'))
  });
}
