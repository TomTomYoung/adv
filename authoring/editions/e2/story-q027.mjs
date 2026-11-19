import {story,O,set,give,see,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

const places={loading:'門前の荷置き場',gate:'門番花の敷居',side:'横道の石棚',exit:'門外の荷受け場'};
const site=(id,x,y)=>({kind:'dungeon',dungeon:'region_3',map:'region_3_f2',x,y,event:'q027_pollen_'+id});
const world={loading:site('loading',15,5),gate:site('gate',15,6),side:site('side',15,9),exit:site('exit',13,7)};
export const pollenRansomCharacters={
  e2_pollen_merchant:{id:'e2_pollen_merchant',name:'荷車の商人',goal:'積荷を門外へ届け、運んだ荷の運賃を精算する',quests:['q027'],detail:'銀器と香袋を一つの箱に詰めてきた。'}
};

export function pollenRansomSource(){
  const s=story(27,places,[]),is=s.is;
  s.entity('nom','loading','e2_edible_map_nom').entity('merchant','loading','e2_pollen_merchant');
  s.entity('cart','loading').entity('silver','cart').entity('pouch','cart');
  s.enum('flower','open',['open','shut','aside','cut'],'門番花の向きと通り口');
  s.enum('leftAfter','none',['none','silver','scent','detour'],'香袋を荷から外すと決めた時点');
  s.enum('freight','pending',['pending','partial','full'],'実際に届けた荷に対する運賃');
  s.bool('crossed').bool('scentLabel').bool('undergrowthAtRisk');
  s.fact('silverStill','銀器だけを近づけても花弁は動かなかった。');
  s.fact('scentCloses','香袋を近づけた時に花弁が閉じた。');
  s.fact('withdrawOpens','香袋を引いた時に花弁が開いた。');
  const cartPeople=['nom','merchant'],cartGroup=[...cartPeople,'cart'];
  const atSide=is('pouchAt','side'),atLoading=is('pouchAt','loading');
  const visible=condition=>({when:condition,visibleWhen:condition});
  s.node('entry','loading',cartPeople,'荷車を一歩引くと、重なっていた花弁がほどけた。「銀の箱が惜しいのかな」と商人が言う。採集人のノムが蓋を開けた。中には香袋と、匂いのない銀の皿がある。',[
    O('silver','銀器を試す','silver_test'),O('scent','香袋を試す','scent_test'),O('cut','根元へ行く','at_root')
  ]);
  s.node('silver_test','gate',[],'銀の皿だけを花の前にかざした。皿には花弁の裏まで映っている。縁をゆっくり左右に動かしてみる。',[
    O('observe','反応を確かめる','silver_seen',[see('silverStill','silver')])
  ]);
  s.node('silver_seen','gate',[],'銀色の光が走っても、花は開いたままだ。荷置き場では、商人がまだ香袋の入った箱を押さえている。',[
    O('back','皿を持ち帰る','silver_back')
  ]);
  s.node('silver_back','loading',cartPeople,'皿を箱に戻した。「こいつが一番高いのに」と商人が首をかしげる。残った香袋を試すか、ここに預けて銀器だけを運ぶか。',[
    O('scent','香袋を試す','scent_test'),O('leave','香袋を預ける','cart_ready',[give('pouch','cart','loading'),set('leftAfter','silver')])
  ]);
  s.node('scent_test','gate',[],'花に届く手前で香袋の口をほどく。匂いが薄く流れた。手を伸ばせば、袋だけをいちばん外の花弁へ近づけられる。',[
    O('near','香りを寄せる','scent_shut',[set('flower','shut'),see('scentCloses','pouch')])
  ]);
  s.node('scent_shut','gate',[],'近くの一輪が袋を包もうと曲がり、その後ろの花まで折り重なった。向こう側が見えない。袋の紐はまだ一行の手にある。',[
    O('withdraw','香袋を引く','scent_open',[set('flower','open'),see('withdrawOpens','pouch')])
  ]);
  s.node('scent_open','gate',[],'袋を引くと花弁も離れ、向こうの石がまた見えた。脇には人ひとりが抜けられる横道がある。香りを横へ誘うか、荷置き場へ持ち帰るか。',[
    O('detour','横道へ運ぶ','at_shelf'),O('abandon','荷置き場へ','scent_back')
  ]);
  s.node('scent_back','loading',cartPeople,'商人が荷置き場の棚を空けた。「ここなら門まで匂わない。預けた袋は今日の運賃から引いてくれ」。',[
    O('store','香袋を預ける','cart_ready',[give('pouch','party','loading'),set('leftAfter','scent')])
  ]);
  s.node('at_shelf','side',[],'花の脇を抜け、横道の石棚まで来た。袋を置いて口を広げれば、手を放しても香りはここから漂う。',[
    O('place','石棚に置く','lure_set',[give('pouch','party','side'),set('flower','aside')])
  ]);
  s.node('lure_set','side',[],'花が石棚の方へ首を曲げた。主通路には荷車の幅だけ隙間ができた。香袋を石棚に置いたまま、空いた手を荷置き場に振ってみせる。',[
    O('back','荷車へ戻る','cart_ready')
  ]);
  s.node('cart_ready','loading',cartPeople,when(atSide,'荷車に残るのは銀器だけ。香袋はまだ横道で花を引きつけている。ノムが車輪の止め木を外し、商人と梶棒を握った。',
    '香袋は荷置き場に残した。商人が銀器の箱を押さえ、ノムが車輪の止め木を外した。門の花弁は開いている。'),[
    O('push','敷居まで押す','cart_at_gate')
  ]);
  s.node('cart_at_gate','gate',cartPeople,'車軸が敷居の手前に来た。ノムが片側の車輪を支える。門外には荷受け場が見える。後輪まで通してから荷を数えよう。',[
    O('cross','荷車を通す','across')
  ]);
  s.node('across','exit',cartPeople,when(atSide,'後輪が敷居を越えた。銀器の箱を荷受け場に停めると、横道の石棚にまだ袋の紐が見えた。荷車をここに残して取りに行ける。',
    '後輪が敷居を越えた。荷受け場に着いたのは銀器の箱だけだ。商人とノムが、届けた荷を荷札と突き合わせる。'),[
    O('retrieve','香袋を取りに','at_pouch',[],visible(atSide)),
    O('leave','回収を断る','partial_delivery',[set('leftAfter','detour')],visible(atSide)),
    O('count','銀器を数える','partial_delivery',[],visible(atLoading))
  ]);
  s.node('at_pouch','side',[],'横道の石棚に香袋がある。花の茎は棚の手前まで伸びている。紐を引いて袋の口を結べば、荷車の待つ門外へ戻れる。',[
    O('take','袋を取り上げる','pouch_held',[give('pouch','side','party'),set('flower','open')])
  ]);
  s.node('pouch_held','side',[],'結んだ袋を抱えると、花が石棚からゆっくり離れた。横道からは敷居をまたぎ直さず、荷受け場へ回れる。',[
    O('deliver','荷受け場へ','pouch_at_exit')
  ]);
  s.node('pouch_at_exit','exit',cartPeople,'荷車のそばでノムが荷を受け取る。銀器の箱と、横道から運んだ香袋が初めて門の外でそろった。',[
    O('unload','両方を渡す','full_delivery',[give('pouch','party','exit'),give('silver','cart','exit')])
  ]);
  s.node('full_delivery','exit',cartPeople,'商人は銀器と香袋の両方に受け取りの印をつけた。ノムは次の荷札に欄を一つ足す。「値段は分かっていたもの。今度は匂いも書いておくよ」',[
    O('label','匂いを記す','@informed',[set('scentLabel'),set('freight','full')])
  ]);
  s.node('partial_delivery','exit',cartPeople,when(atSide,'商人は「横道の香袋は置いていこう」と荷札に書き添えた。棚の香りに花が向いているうちに、銀器だけ荷受け場へ下ろす。',
    '荷置き場に預けた香袋の分を、商人が荷札から引いた。ノムが銀器を一枚ずつ下ろして数える。'),[
    O('reckon','運賃を直す','@compromise',[give('silver','cart','exit'),set('freight','partial')])
  ]);
  s.node('at_root','gate',[],'敷居の下に太い根が一本、その周りに花粉をかぶった下草がある。根を断てば道を塞ぐ花も倒れる。荷車はまだ荷置き場で待っている。',[
    O('sever','根を断つ','cut_open',[set('flower','cut'),set('undergrowthAtRisk')])
  ]);
  s.node('cut_open','gate',[],'花の束を脇へ寄せると、通路が開いた。根元の下草には今季の花粉が残っている。次の季節、この株からはもう花粉が落ちてこない。',[
    O('report','開通を知らせる','@contract')
  ]);
  const journey=connectWorld(s,world,1);
  journey('entry_silver','gate',{depart:[give('silver','cart','party')]});
  journey('silver_seen_back','loading',{arrive:[give('silver','party','cart')]});
  for(const action of ['entry_scent','silver_back_scent'])journey(action,'gate',{depart:[give('pouch','cart','party')]});
  journey('scent_open_detour','side');journey('scent_open_abandon','loading');
  journey('lure_set_back','loading');
  journey('cart_ready_push','gate',{companions:cartGroup});
  journey('cart_at_gate_cross','exit',{companions:cartGroup,arrive:[set('crossed')]});
  journey('across_retrieve','side');journey('pouch_held_deliver','exit');journey('entry_cut','gate');
  const atExit=and(is('cartAt','exit'),is('crossed'));
  s.story.endings={
    contract:and(is('flower','cut'),is('undergrowthAtRisk'),is('cartAt','loading'),is('freight','pending')),
    informed:and(atExit,is('silverAt','exit'),is('pouchAt','exit'),is('freight','full'),is('scentLabel')),
    compromise:and(atExit,is('silverAt','exit'),or(atLoading,atSide),not(is('leftAfter','none')),is('freight','partial'))
  };
  const implies=(id,a,b,message)=>s.invariant(id,or(not(a),b),message);
  s.invariant('cart-crew',and(s.is('nomAt',s.v('cartAt')),s.is('merchantAt',s.v('cartAt'))),'商人とノムは荷車と同じ場所にいる');
  implies('closed',is('flower','shut'),and(is('pouchAt','party'),s.known('scentCloses')),'閉じる反応は香袋を近づけて確認する');
  implies('withdraw',s.known('withdrawOpens'),s.known('scentCloses'),'近づけた後で引くと開く');
  implies('lure',is('flower','aside'),and(atSide,s.known('withdrawOpens')),'花を横へ向ける香袋は石棚にある');
  implies('cross',is('crossed'),is('cartAt','exit'),'後輪まで通過した荷車は門外にある');
  implies('left-early',is('leftAfter','silver'),and(atLoading,s.known('silverStill'),not(s.known('scentCloses'))),'銀器だけを試した時点で香袋を預けた');
  implies('left-scent',is('leftAfter','scent'),and(atLoading,s.known('withdrawOpens')),'香袋を試してから荷置き場に預けた');
  implies('left-side',is('leftAfter','detour'),and(atSide,atExit),'荷車を通してから横道の袋の回収を断った');
  implies('receipt',not(is('freight','pending')),and(atExit,is('silverAt','exit')),'届いた荷に対して運賃を決める');
  for(const scene of Object.values(s.story.scenes))for(const [i,cast] of scene.cast.entries()){
    cast.when=is(cast.entity+'At',scene.place);
    cast.display={x:i===0?33:67,y:10,scale:1,cardScale:1,layer:i};
  }
  return s.done();
}
