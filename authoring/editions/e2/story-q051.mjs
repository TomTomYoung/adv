import {story,O,set,give,see,and,or,not} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

const places={shop:'地下市場の売台',hall:'閉店後の共同食堂',bench:'市場出口の腰掛け'};
const site=(name,x,y)=>({kind:'dungeon',dungeon:'region_6',map:'region_6_f1',x,y,event:'q051_change_'+name});
const world={shop:site('shop',13,7),hall:site('hall',10,7),bench:site('bench',12,5)};
const roles={
  kono:['行商人のコノ','初めて買う客にも釣銭の行先がわかるようにする'],
  seller:['市場の店主','店と共同食堂の勘定をつける'],
  cook:['食堂の賄い役','食事に使った分とまだ使える分を取り違えずに精算する'],
  customer:['初来店の客','説明を聞いていない釣銭を受け取る']
};
export const changeCounterCharacters=Object.fromEntries(Object.entries(roles).map(([key,[name,goal]])=>{
  const id='e2_change_'+key;return [id,{id,name,goal,detail:goal+'。',quests:['q051']}];
}));

export function changeCounterSource(){
  const s=story(51,places,[]),is=s.is;
  for(const [who,place] of [['kono','shop'],['seller','shop'],['cook','hall'],['customer','bench']])
    s.entity(who,place,'e2_change_'+who);
  s.entity('change','seller').entity('ticket','cook').entity('sign','kono');
  s.bool('closed').bool('deskOpen').bool('customerInformed').bool('optIn');
  s.enum('regular','prepaid',['prepaid','served'],'常連の前払いが食事に充てられたか');
  s.fact('matchingNumbers','店の控えと席札を照合し、常連の前払いが食事になったことを確かめた。');
  const shop=['kono','seller'],hall=['seller','cook'],bench=['customer'];
  s.node('entry','shop',shop,'初めて店に来た客が、品物と番号のついた控えを持って出口の腰掛けへ向かった。釣銭はまだ店主の小箱にある。「あの人は椀の印の意味を知りませんよ」とコノが呼び止める。店主は閉店後なら帳面を見せると言った。',[
    O('wait','閉店を待つ','closing',[set('closed')]),O('recover','返金を求める','till')
  ]);
  s.node('till','shop',shop,'「食事を頼んだ覚えのない人の分です」。コノが控えの番号を読み、店主は同じ番号の包みを小箱から出した。客は出口の腰掛けで待っている。',[
    O('collect','釣銭を預かる','cash_in_hand',[give('change','seller','party')])
  ]);
  s.node('cash_in_hand','shop',shop,'一行が預かったのは初来店の客の釣銭だけだ。店主は今夜火にかける鍋を一つ、台の下へ戻した。',[
    O('deliver','客の所へ','direct_receipt')
  ]);
  s.node('direct_receipt','bench',bench,'客が控えを広げた。包みの番号と合っている。客は食事を頼んでいないと言い、釣銭を待って手を差し出した。',[
    O('pay','釣銭を返す','@contract',[give('change','party','customer')])
  ]);
  s.node('closing','shop',shop,'店主が覆い布を掛け、椀の印のある控えと釣銭の小箱を持った。「鍋の数を決めるのは向こうです」。コノに売台を任せ、閉店した店から一緒に食堂へ向かう。',[
    O('follow','食堂へ同行','service')
  ]);
  s.node('service','hall',hall,'賄い役の帳面には、常連と初来店の客が別の番号で載っている。常連が席札を渡すと、一杯の湯気が卓へ運ばれた。店の控えと照合してその一食に印をつける。',[
    O('record','席札を照合','meal',[set('regular','served'),see('matchingNumbers','cook')])
  ]);
  s.node('meal','hall',hall,'常連の席札には食事済みの印がついた。その隣の番号には印がない。「あの人にはここへ来る理由を話していない」。店主が小箱の包みを指した。',[
    O('seat','精算席を作る','reserve',[give('change','seller','cook')]),
    O('refund','返金に向かう','refund_load',[give('change','seller','party')])
  ]);
  s.node('reserve','hall',hall,'賄い役は未使用の包みを精算用の引き出しへ移した。売台の仕組みはそのままでも、ここで控えを出せば、食事か返金を選べるようにする。',[
    O('place','精算札を置く','@compromise',[give('ticket','cook','hall'),set('deskOpen')])
  ]);
  s.node('refund_load','hall',hall,'賄い役は食事済みの行に指を置いたまま、未使用の番号だけを読み上げた。一行は店主から預かったその包みを、持ち主の所へ運ぶ。',[
    O('deliver','客の所へ','refund_receipt')
  ]);
  s.node('refund_receipt','bench',bench,'控えの番号を見せてもらい、食堂で使えば一食分になるはずだったと伝えた。「その話なら買う時に聞きたかった。今日はお金でお願いします」。',[
    O('pay','釣銭を返す','paid',[give('change','party','customer'),set('customerInformed')])
  ]);
  s.node('paid','bench',bench,'客は包みの中身を数え、控えの余白に受領の印を入れた。釣銭はもう客の手にある。食堂には印を知らせればよい。',[
    O('report','食堂へ報告','consent')
  ]);
  s.node('consent','hall',hall,'店主は返金済みの番号を帳面に写した。「前払いで食べたい人もいます。次から売る時に尋ねるか、ここで精算するか」。賄い役は食事済みの札を別の束にしまった。',[
    O('optin','売台で選べるように','sign_shop'),O('desk','食堂で精算','desk_setup')
  ]);
  s.node('desk_setup','hall',hall,'返金済みの番号に二度目の支払いはない。賄い役は新しく来る人のため、椀と硬貨の絵を描いた札を精算席に用意した。',[
    O('place','精算札を置く','@compromise',[give('ticket','cook','hall'),set('deskOpen')])
  ]);
  s.node('sign_shop','shop',shop,'店主が売台に戻ると、コノが値札の前を一枚ぶん空けていた。買い物だけならその場で釣銭を返し、望んだ人だけが食堂分を預ける。コノがその二つを書き分けた。',[
    O('hang','説明札を掲げる','@informed',[give('sign','kono','shop'),set('optIn')])
  ]);
  const journey=connectWorld(s,world,1);
  journey('cash_in_hand_deliver','bench');journey('closing_follow','hall',{companions:['seller']});
  journey('refund_load_deliver','bench');journey('paid_report','hall');
  journey('consent_optin','shop',{companions:['seller']});
  const charged=is('regular','served'),paid=is('changeAt','customer'),reserved=is('changeAt','cook');
  s.story.endings={
    contract:and(paid,not(is('closed')),not(is('deskOpen')),not(is('optIn'))),
    compromise:and(charged,is('deskOpen'),is('ticketAt','hall'),or(reserved,and(paid,is('customerInformed')))),
    informed:and(charged,paid,is('optIn'),is('customerInformed'),is('signAt','shop'),is('sellerAt','shop'))
  };
  const implies=(id,a,b,msg)=>s.invariant(id,or(not(a),b),msg);
  implies('served',charged,and(is('closed'),s.known('matchingNumbers')),'閉店後に常連の席札と食事の記録を照合する');
  implies('receipt',is('customerInformed'),and(charged,paid),'食堂の仕組みを伝えて本人へ未使用分を返す');
  implies('reserve',reserved,charged,'常連の食事を精算してから未使用分を食堂に預ける');
  implies('desk',is('deskOpen'),and(is('ticketAt','hall'),not(is('optIn'))),'精算席の札は食堂に置く');
  implies('sign',is('optIn'),and(is('signAt','shop'),paid,not(is('deskOpen'))),'未説明分を返して売台に参加札を掲げる');
  for(const scene of Object.values(s.story.scenes))for(const [i,cast] of scene.cast.entries()){
    cast.when=is(cast.entity+'At',scene.place);
    cast.display={x:scene.cast.length===1?50:i===0?32:68,y:10,scale:1,cardScale:1,layer:i};
  }
  return s.done();
}
