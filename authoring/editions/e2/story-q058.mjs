import {O,set,give,and} from '../../story-kit.mjs';
import {marketQuest} from './market-world.mjs';

const exchange=marketQuest(58,{
  bakery:['パン屋の釣銭台',17,3],mill:['粉屋の荷受け口',16,3],dock:['荷役の賃金窓口',15,3],bank:['地下市場の両替台',14,3]
},{
  baker:['bakery','市場のパン屋','受領帳から釣銭が来た順を示す'],
  customer:['bakery','パンを買った客','正規の支払いで受けた金貨を使う'],
  miller:['mill','粉屋','荷役賃とパン屋への支払を照合する'],
  porter:['dock','荷役人','働いた日に払われた賃金の受取を示す'],
  en:['bank','両替商のエン','印のついた金貨の来歴と保管先を確かめる']
},{floor:2});
export const exchangeCharacters=exchange.characters;
export function exchangeSource(){
  const {s,scene,implies,finish}=exchange.create(),is=s.is;
  s.entity('coins','baker').entity('change','customer').entity('bakerMoney','en').entity('customerMoney','en')
    .bool('chain').bool('origin').bool('limited').bool('seized').bool('exchanged');
  scene('entry','bakery','釣銭を受けた客が黒くなった指を前掛けでこすっている。盗人だという声にパン屋が割って入った。自分の金箱にも同じ金貨があると、手のひらを開いて見せた。',[
    O('baker','受領帳をたどる','ledger'),O('exchange','代貨を手配','reserve'),O('seize','黒い金貨を没収','seize')
  ]);
  scene('ledger','mill','パン屋の帳面に載った前の支払人は粉屋だった。粉屋は粉袋に挟んだ荷役賃の控えを取り出した。日付は金袋が盗まれた日と同じだ。',[
    O('match','受領順を照合','chain',[set('chain')])
  ]);
  scene('chain','mill','粉屋からパン屋へ、パン屋から客へ。二つの支払いのつながりは見えた。最初の袋と仕事の対価を区別するには、荷役人が持つ受取を見たい。',[
    O('porter','荷役賃の出所へ','source'),O('stop','代貨に切り替える','reserve')
  ]);
  scene('source','dock','荷役人の受取には積み下ろした袋の数がある。盗難元の控えには、盗まれた袋の目印として「金貨に黒染め」とあった。手の色だけでは、その後のどの支払いで受けたのかわからない。',[
    O('compare','二つの時点を記録','decision',[set('origin')])
  ]);
  scene('decision','dock','袋が持ち出された時刻の下に、荷役賃が払われた時刻を別に書いた。印を付けて調べる範囲を絞るか、記録を預け、まず取引に代貨を出すか。',[
    O('trace','追跡範囲を届ける','trace'),O('hold','代貨で再開する','reserve')
  ]);
  scene('trace','bank','エンは盗まれた袋から動いた取引にだけ調査の印を入れた。荷役賃、粉代、パンの釣銭にはそれぞれの受取を添えて、黒い手の客に道を空ける。',[
    O('file','取引を限定して届ける','@informed',[set('limited')])
  ]);
  scene('reserve','bank','エンは二人分の金額を控え、通常の金貨を別々の包みに用意した。交換なら、パン屋にも客にも同額の代貨を届け、原貨はここへ持ち帰る。',[
    O('count','二組の代貨を預かる','packed',[give('bakerMoney','en','party'),give('customerMoney','en','party')])
  ]);
  scene('packed','bank','包みのひもには違う色が付いている。最初に二人が待つ釣銭台へ向かう。',[O('carry','釣銭台へ','swap')]);
  scene('swap','bakery','パン屋と客がそれぞれ自分の分を数えた。一行は代貨を渡した相手から、同じ額の黒い原貨を受け取る。',[
    O('swap','二人分を交換','return_coins',[give('bakerMoney','party','baker'),give('customerMoney','party','customer'),give('coins','baker','party'),give('change','customer','party'),set('exchanged')])
  ]);
  scene('return_coins','bakery','客は受け取った代貨で買い物に戻った。一行の手元には交換済みの原貨が二組ある。エンの両替台に預けよう。',[O('store','両替台へ','hold')]);
  scene('hold','bank','エンは原貨を受け取り、交換した二人の名と額を書いた封をした。最終的に誰が負担するかは照合のあとに決める。',[
    O('seal','原貨を保管','@compromise',[give('coins','party','en'),give('change','party','en')])
  ]);
  scene('seize','bakery','パン屋は金箱を、客は今しがたの釣銭を差し出した。どちらにも黒い印がある。二人に渡す代貨は用意していない。',[
    O('collect','原貨を押収する','confiscated',[give('coins','baker','party'),give('change','customer','party'),set('seized')])
  ]);
  scene('confiscated','bakery','硬貨を入れた袋を引き寄せると、売台の前から抗議が上がった。押収品を数えてエンへ運ぶ。',[O('bring','両替台へ','impound')]);
  scene('impound','bank','エンは預かった枚数を声に出した。取引の順をたどる欄は空いたまま、袋の口に押収済みの封を掛ける。',[
    O('seal','没収を記録','@contract',[give('coins','party','en'),give('change','party','en')])
  ]);
  implies('origin',is('origin'),is('chain'),'流通順を記した後で盗難と荷役賃を区別する');
  implies('exchange',is('exchanged'),and(is('bakerMoneyAt','baker'),is('customerMoneyAt','customer')),'両者に元の額を渡す');
  return finish([['entry_baker','mill'],['entry_exchange','bank'],['chain_porter','dock'],['chain_stop','bank'],['decision_trace','bank'],['decision_hold','bank'],['packed_carry','bakery'],['return_coins_store','bank'],['confiscated_bring','bank']],{
    informed:and(is('origin'),is('limited'),is('changeAt','customer')),contract:and(is('seized'),is('coinsAt','en'),is('changeAt','en')),compromise:and(is('exchanged'),is('coinsAt','en'),is('changeAt','en'))
  });
}
