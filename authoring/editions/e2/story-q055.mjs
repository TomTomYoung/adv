import {O,set,give,and,when} from '../../story-kit.mjs';
import {marketQuest} from './market-world.mjs';

const tailor=marketQuest(55,{
  lane:['地下市場の試着通路',9,12],desk:['仕立屋の帳場',9,11],room:['仕立屋の着替え場',10,11]
},{
  miku:['desk','仕立屋のミク','試着の保証金と買い取りの証書を精算する'],
  customer:['lane','試着中の客','自分が代金と思って預けた金の扱いを確かめる',['desk','room']]
});
export const shadowCharacters=tailor.characters;
export function shadowSource(){
  const {s,scene,implies,finish}=tailor.create(),is=s.is;
  s.entity('coat','customer').entity('deposit','miku').bool('readReceipt').bool('wantsPurchase')
    .bool('customerSigned').bool('shopSigned').enum('title','shop',['shop','customer'])
    .enum('mark','tracking',['tracking','cut','released']).enum('payment','held',['held','applied','refunded']);
  scene('entry','lane','仕立てのよい上着を着た客が、足元の値札を振り払っている。札は石畳に落ちた影に縫いつき、客が歩くたびに引きずられた。「お金はちゃんと置いてきましたよ」',[
    O('cut','追跡糸を切る','cut'),O('shop','店で控えを確認','receipt')
  ]);
  scene('cut','lane','上着の裾に残る試着糸から、影の札まで一本の糸が伸びている。客が裾を持ち上げた。帳場の控えにはまだ手が入っていない。',[
    O('snip','糸を断つ','@contract',[set('mark','cut')])
  ]);
  scene('receipt','desk','ミクは控えの折り目をのばした。数字の上に小さく「試着保証金」とある。客が購入代金と思った額だ。上着を戻せば全額返金、買うなら二人の署名で同額を充当できる。',[
    O('read','控えを読み合わせる','decide',[set('readReceipt')])
  ]);
  scene('decide','desk','「同じ額なのに、買ったことにはなっていなかったんですか」。客が袖に指を通したまま、着替え場と帳場を見比べた。',[
    O('return','上着を返す','change'),O('buy','買い取りを希望','purchase',[set('wantsPurchase')])
  ]);
  scene('purchase','desk','客は買いたいと言った。ミクは新しい書面に、預かり金をそのまま代金に回すことと、署名後に追跡札を外すことを書いた。まだ誰の署名も入っていない。',[
    O('sign','売買に署名','countersign',[set('customerSigned')]),O('cancel','購入を取り消す','change')
  ]);
  scene('countersign','desk','客の名の隣に、店側の欄が一つ空いている。ミクは元の保証金と売価が同額であることを指で示し、自分の名を書いた。',[
    O('accept','店の署名を受ける','signed',[set('shopSigned')])
  ]);
  scene('signed','desk','二つの署名が揃った。ミクが預かり金の行に売買証書の番号を書き入れれば、客へ服の所有権が渡る。客はもう財布を開く必要がない。',[
    O('apply','保証金を代金に','sold',[set('payment','applied'),set('title','customer')])
  ]);
  scene('sold','desk','上着は正式に客のものになった。ミクは店の留め具から試着の糸をほどき、影に付いた値札を回収する。',[
    O('release','追跡札を外す','@informed',[set('mark','released')])
  ]);
  scene('change','room',when(is('wantsPurchase'),'買い取りの書面を白紙のまま帳場に残した。客は元の服に着替え、上着を畳んで一行に預ける。','客は預けていた元の服に着替え、上着を畳んで一行に預ける。'),[
    O('fold','上着を預かる','folded',[give('coat','customer','party')])
  ]);
  scene('folded','room','一行が上着を抱え、客と一緒に帳場へ戻る。保証金はミクの引き出しにある。',[O('bring','帳場へ同行','handback')]);
  scene('handback','desk','ミクは裾の番号と元の控えを合わせ、上着を店に受け取った。試着の留め具を外すと影の値札も消えた。',[
    O('hand','上着を引き渡す','refund',[give('coat','party','miku'),set('mark','released')])
  ]);
  scene('refund','desk','掛け台には戻った上着、卓の上には元の保証金。ミクが預かった額を読み、客がその場で数えた。',[
    O('repay','返金に立ち会う','@compromise',[give('deposit','miku','customer'),set('payment','refunded')])
  ]);
  implies('consent',is('shopSigned'),and(is('customerSigned'),is('wantsPurchase')),'購入意思のあと双方が署名する');
  implies('sale',is('title','customer'),and(is('shopSigned'),is('payment','applied')),'両者署名後に保証金を売価に充当する');
  implies('refund',is('payment','refunded'),and(is('coatAt','miku'),is('depositAt','customer')),'返却した現物と保証金受領を照合する');
  return finish([['entry_shop','desk',['customer']],['decide_return','room',['customer']],['purchase_cancel','room',['customer']],['folded_bring','desk',['customer']]],{
    contract:and(is('mark','cut'),is('title','shop'),is('payment','held')),informed:and(is('title','customer'),is('mark','released')),compromise:and(is('payment','refunded'),is('mark','released'))
  });
}
