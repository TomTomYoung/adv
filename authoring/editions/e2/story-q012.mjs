import {story,O,set,give,see,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';
export const threePicksPlaces={workshop:'ダンの工房',hard:'硬岩の試験箇所',salt:'塩層の試験箇所',crack:'狭い割れ目の試験箇所'};
const point=(key,x,y)=>({kind:'dungeon',dungeon:'region_2',map:'region_2_f1',x,y,event:'q012_three_picks_'+key});
export const threePicksWorld={workshop:point('workshop',13,7),hard:point('hard',11,4),salt:point('salt',15,5),crack:point('crack',17,9)};
// These are outcome roles, not assignments of a maker or a blade shape.
export const pickEntities=['displayPick','otherPickA','otherPickB'];
const hand=(from,to)=>pickEntities.map(id=>give(id,from,to));
export function threePicksSource(){
 const s=story(12,threePicksPlaces,[['workshop','hard'],['hard','salt'],['salt','crack'],['crack','workshop']]);
 s.entity('dan','workshop','e2_three_picks_dan').entity('miners','workshop','e2_three_picks_miners',{kind:'group'}).entity('ledger','dan');
 for(const id of pickEntities)s.entity(id,'dan');
 for(const key of ['tested','marksSeen','ledgerCompared','ownerConsent','loaned','returned','selectedOnly','borrowConsent','borrowed','hardTested','saltTested','crackTested','unloaded','labelsWritten','loanMatched','loanRecorded','displayed','stored'])s.bool(key);
 s.story.registry.returned.meaning='三本の最終返納を確定した。試験後に一時返却して貸出する場合はunloadedで区別する';
 s.enum('toolsAt','dan',['dan','party','trialGround','oneDisplayedTwoStored','oneDisplayedTwoOnLoan'],'原本の最終状態と対応する三本の取扱い。各一本の保持者は別に保存する');
 s.enum('route','pending',['pending','compare','sharp','loan']);
 s.fact('uses','硬岩には刃先の耐久、塩層には食い込みと剥離、狭い割れ目には細さと取り回しが利く。');
 s.fact('marks','柄の差込口内側には、共通の工房銘と異なる小印が一本ずつある。');
 s.fact('makers','製作台帳との照合により、三本は親方と二人の弟子が用途別に作った正規品と分かる。');
 const cast=['dan','miners'],heldBy=who=>and(...pickEntities.map(id=>s.is(id+'At',who)));
 s.node('entry','workshop',cast,'ダンが管理する三本には、同じ大きな銘がある。刃の幅と厚みは違う。「親方が鍛えた本物を一本、展示したい」。借用を望む坑夫たちは、まだ道具へ手を伸ばしていない。',[
  O('trial','三本を用途の違う場所で使い比べる','borrow_request',[set('route','compare')]),
  O('sharp','一度の試し切りで、最も鋭い一本を選ぶ','borrow_request',[set('route','sharp')]),
  O('lend','用途を確かめ、一本の展示と二本の貸出を相談する','borrow_request',[set('route','loan')])
 ]);
 s.node('borrow_request','workshop',cast,'試し掘りへ持ち出すため、ダンに三本を借りたいと伝える。坑夫への貸出は、これとは別に了承を得る必要がある。',[
  O('permission','試験に持ち出す了承をダンから得る','borrow_permitted',[set('borrowConsent')])
 ]);
 s.node('borrow_permitted','workshop',cast,'ダンは試験への持出しを認めた。三本はまだダンが保持している。返す本数を確認して受け取る。',[
  O('take','ダンから三本を受け取る','borrowed',[...hand('dan','party'),set('borrowed'),set('toolsAt','party')])
 ]);
 s.node('borrowed','workshop',cast,'三本を受け取った。ダンと坑夫たちは工房で待つ。まず硬岩のある箇所へ運ぶ。',[
  O('hard','三本を持って硬岩の試験箇所へ向かう','hard_arrival')
 ]);
 s.node('hard_arrival','hard',[],when(s.is('route','sharp'),'硬岩の前へ着いた。一度の試し切りで最も鋭い一本を選ぶ。塩層と狭い割れ目での比較は行わない。','硬岩の前へ着いた。刃先の耐久と使い勝手を三本で比べる。着いただけでは試験は済んでいない。'),[
  O('quick','一度の試し切りで、最も鋭い一本を選ぶ','sharp_tested',[set('selectedOnly')],{when:s.is('route','sharp')}),
  O('test','三本を硬岩で使い、刃先の耐久を記録する','hard_tested',[set('hardTested')],{when:not(s.is('route','sharp'))})
 ]);
 s.node('sharp_tested','hard',[],'一度の試し切りで一本を選んだ。用途別の比較も製作台帳の照合もしていない。残る二本も持ち帰る。',[
  O('return','三本を持ってダンの工房へ戻る','return_arrival')
 ]);
 s.node('hard_tested','hard',[],'硬岩での結果を記録した。まだ塩層と割れ目では試していない。三本を次の箇所へ運ぶ。',[
  O('salt','三本を持って塩層の試験箇所へ向かう','salt_arrival')
 ]);
 s.node('salt_arrival','salt',[],'塩層の前へ着いた。硬岩の結果だけでは、食い込みや剥がれ方の違いは分からない。',[
  O('test','三本を塩層で使い、食い込みと剥離を記録する','salt_tested',[set('saltTested')])
 ]);
 s.node('salt_tested','salt',[],'塩層の結果を記録した。次に狭い割れ目で、細さと取り回しを比べる。',[
  O('crack','三本を持って狭い割れ目へ向かう','crack_arrival')
 ]);
 s.node('crack_arrival','crack',[],'狭い割れ目へ着いた。ここでも三本を使い、前の二箇所との違いを記録する。',[
  O('test','三本を割れ目で使い、用途ごとの結果をまとめる','compared',[set('crackTested'),set('tested'),see('uses','displayPick')])
 ]);
 s.node('compared','crack',[],'硬岩には刃先の耐久、塩層には食い込みと剥離、狭い割れ目には細さと取り回しが利いた。一本の切れ味だけで、残りを贋作とは言えない。三本はまだ隊が持っている。',[
  O('return','三本を持ってダンの工房へ戻る','return_arrival')
 ]);
 s.node('return_arrival','workshop',cast,'三本を持って工房へ戻った。ダンが本数と状態を確かめる。まだ隊が保持しているので、先に引き渡す。',[
  O('unload','三本をダンへ引き渡し、試験結果を伝える','unloaded',[...hand('party','dan'),set('unloaded'),set('toolsAt','dan')])
 ]);
 s.node('unloaded','workshop',cast,when(s.is('route','sharp'),'三本をダンへ渡した。選んだ一本の展示と、残る二本の保管を進める。用途別の比較はしていない。','三本をダンへ渡し、用途別の結果を伝えた。ダンは柄の差込口を調べる道具を出した。坑夫への貸出には、ダンの了承が必要だ。'),[
  O('select','選んだ一本を本物として展示し、二本を保管する','sharp_display',[set('displayed'),set('stored'),set('returned'),set('toolsAt','oneDisplayedTwoStored')],{when:s.is('route','sharp')}),
  O('shop','柄の差込口を調べる準備をする','marks_ready',[],{when:s.is('route','compare')}),
  O('lend','一本を展示し、二本を貸し出す了承を求める','loan_request',[set('route','loan')],{when:not(s.is('route','sharp'))})
 ]);
 s.node('sharp_display','workshop',cast,'ダンは選んだ一本を展示し、二本を贋作と見なしたまま保管した。三本は用途の異なる正規品だが、今回その照合は行われなかった。',[
  O('finish','一本の展示と二本の保管を記録し、仕事を終える','@contract')
 ]);
 s.node('marks_ready','workshop',cast,'ダンが柄を外すための道具を用意した。差込口の内側はまだ確かめていない。',[
  O('inspect','柄を外し、差込口の小印を記録する','makers',[set('marksSeen'),see('marks','displayPick')])
 ]);
 s.node('makers','workshop',cast,'柄を外した内側には、それぞれ違う小印があった。大きな工房銘とは別の印だ。ダンは旧工房の製作台帳を開く。「印だけで名前を決めず、ここに残った記録と合わせよう」。',[
  O('names','小印と用途を製作台帳へ照合する','ledger_ready'),
  O('loan','台帳照合を後日に残し、二本の貸出を相談する','loan_request',[set('route','loan')])
 ]);
 s.node('ledger_ready','workshop',cast,'小印の控えと試験結果を台帳の横に並べた。印と用途の一致を、製作記録で一つずつ確かめる。',[
  O('compare','三本の小印と用途を台帳の製作記録へ照合する','ledger_checked',[set('ledgerCompared'),see('makers','ledger')])
 ]);
 s.node('ledger_checked','workshop',cast,'台帳には親方と二人の弟子の仕事が一つずつ記されていた。大きな銘は三人が使う工房の共通銘だった。ダンは三本すべてを本物として受け取り、展示札を直す。',[
  O('labels','照合した作り手と用途を三本の展示札へ書く','labeled',[set('labelsWritten')])
 ]);
 s.node('labeled','workshop',cast,'作り手ごとの展示札を書いた。三本がダンの手元にそろっていることを確かめ、最終返納の記録を閉じる。',[
  O('finish','三本の返納と展示札を確認し、仕事を終える','@informed',[set('returned')])
 ]);
 s.node('loan_request','workshop',cast,when(s.is('marksSeen'),'小印は記録したが、製作台帳とは照合していない。一本の展示と二本の貸出について、所有者のダンの返事を待つ。','用途ごとの違いは試験で確かめた。作り手は確定していない。一本の展示と二本の貸出について、所有者のダンの返事を待つ。'),[
  O('agree','一本の展示と二本の貸出についてダンの了承を得る','loan_permitted',[set('ownerConsent')])
 ]);
 s.node('loan_permitted','workshop',cast,'ダンは了承した。三本はまだダンの手元にある。坑夫たちの作業箇所と試験結果を照らし合わせ、借りる二本を選ぶ。',[
  O('match','坑夫たちの用途と二本の適性を照らし合わせる','loan_matched',[set('loanMatched')])
 ]);
 s.node('loan_matched','workshop',cast,'用途に合う二本が決まった。作り手を確定したわけではない。貸出帳へ、道具と借り手、用途を記す。',[
  O('record','二本と借り手、用途を貸出帳に記入する','loan_recorded',[set('loanRecorded')])
 ]);
 s.node('loan_recorded','workshop',cast,'貸出帳へ記入した。三本ともまだダンが保持している。工房へ残す一本を先に展示する。',[
  O('display','工房に残す一本を展示へ回す','loan_displayed',[set('displayed')])
 ]);
 s.node('loan_displayed','workshop',cast,'一本は工房の展示に残した。貸出帳に記した二本はまだダンが持っている。坑夫たちへ現物を渡す。',[
  O('handover','ダンから坑夫たちへ二本を引き渡す','loan_delivered',[give('otherPickA','dan','miners'),give('otherPickB','dan','miners'),set('loaned'),set('toolsAt','oneDisplayedTwoOnLoan')])
 ]);
 s.node('loan_delivered','workshop',cast,'坑夫たちは用途に合う二本を受け取った。一本はダンの工房へ展示した。小印と製作台帳の照合は済んでおらず、個々の作り手は未確定のままだ。',[
  O('finish','一本の展示と二本の貸出を確認し、仕事を終える','@compromise')
 ]);
 const route=connectWorld(s,threePicksWorld,1),travel=(id,to)=>route(id,to,{depart:[set('toolsAt','party')],arrive:to==='workshop'?[]:[set('toolsAt','trialGround')]});
 travel('borrowed_hard','hard');travel('hard_tested_salt','salt');travel('salt_tested_crack','crack');travel('compared_return','workshop');travel('sharp_tested_return','workshop');
 const home=and(s.is('partyAt','workshop'),s.is('unloaded'));
 s.story.endings={informed:and(home,s.is('tested'),s.is('marksSeen'),s.is('ledgerCompared'),s.is('labelsWritten'),s.is('returned'),heldBy('dan')),contract:and(home,s.is('selectedOnly'),s.is('returned'),s.is('displayed'),s.is('stored'),heldBy('dan')),compromise:and(home,s.is('ownerConsent'),s.is('tested'),s.is('loanRecorded'),s.is('displayed'),s.is('loaned'),s.is('displayPickAt','dan'),s.is('otherPickAAt','miners'),s.is('otherPickBAt','miners'))};
 s.invariant('fixed-people',and(s.is('danAt','workshop'),s.is('minersAt','workshop')),'ダンと借用を待つ坑夫たちは工房にいる');
 s.invariant('borrow',or(not(or(...pickEntities.map(id=>s.is(id+'At','party')))),s.is('borrowConsent')),'試験の持出しにはダンの了承が必要');
 s.invariant('tested',or(not(s.is('tested')),and(s.is('hardTested'),s.is('saltTested'),s.is('crackTested'))),'三箇所で使い比べて初めて用途を確認する');
 s.invariant('ledger',or(not(s.is('ledgerCompared')),and(s.is('marksSeen'),s.is('tested'))),'小印と用途を調べてから台帳へ照合する');
 s.invariant('returned',or(not(s.is('returned')),and(s.is('unloaded'),heldBy('dan'))),'最終返納した三本はダンが保持する');
 s.invariant('loaned',or(not(s.is('loaned')),and(s.is('ownerConsent'),s.is('loanMatched'),s.is('loanRecorded'),s.is('displayed'),s.is('tested'),s.is('displayPickAt','dan'),s.is('otherPickAAt','miners'),s.is('otherPickBAt','miners'))),'了承・用途照合・記帳後に二本を現物で引き渡す');
 s.invariant('sharp',or(not(s.is('selectedOnly')),and(not(s.is('tested')),not(s.is('ledgerCompared')))),'一本だけを選ぶ経路に用途別試験と台帳照合を混ぜない');
 for(const scene of Object.values(s.story.scenes))scene.cast.forEach((c,i)=>{c.when=s.is(c.entity+'At',scene.place);c.display={x:scene.cast.length===1?50:[25,75][i],y:10,scale:1,cardScale:1,layer:i};});
 return s.done();
}
export const threePicksCharacters=Object.fromEntries([['dan','ダン','継いだ工房の名工の仕事を確定して展示する'],['miners','借用を望む坑夫たち','用途に合う道具を正規に借りる']].map(([key,name,goal])=>['e2_three_picks_'+key,{id:'e2_three_picks_'+key,name,goal,quests:['q012'],detail:'現行原稿の役割。外見と人数は未設定。専用画像のない人物は名前で表示する。'}]));
