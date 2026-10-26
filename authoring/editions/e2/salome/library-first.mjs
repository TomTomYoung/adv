import {set,give,ref,eq} from '../../../story-kit.mjs';
import {librarySource} from './library-common.mjs';
export function libraryFirstSource(q){
 const {x,node,choice,town,cell,entity,opt,add,route,end,v,transfer,finish}=librarySource(q);
 const p=q.locations.find(p=>p.role==='decision');cell('entry',q.title+'の現場',p.map.endsWith('f1')?1:2,p.x,p.y);
 if(q.number===41){
  cell('resident','住所印のある居室',1,7,1);town('registry','本の返却と居住契約の窓口','library_registry');
  entity('book','entry');entity('borrower','resident','person');entity('clerk','registry','person');node('resident').place='resident';node('clerk').place='resident';
  route('entry','recover','recovered',{depart:[give('book','entry','party')]});end('recovered','registry','回収した本を窓口へ渡す。住所の住人は訪ねていない。','contract',[give('book','party','registry')]);
  route('resident','registry','invite');add('invite','registry','窓口へ居住の意思を伝えた。司書を借り手の部屋へ案内する。',[opt('escort','司書と住所印の部屋へ戻る','clerk',{companions:['clerk']})]);
  route('resident','deadline','collect');route('clerk','temporary','collect');add('collect','entry','借り手と期限を決め、本の置き場所へ戻った。本人が本を窓口へ返す。',[opt('return','本人と本を返却窓口へ運ぶ','returned',{companions:['borrower'],depart:[give('book','entry','borrower')]})]);
  // The resident first comes from their room to the book's actual location.
  choice('resident','deadline').companions=['borrower'];choice('clerk','temporary').companions=['borrower'];
  end('returned','registry','本人が本を返した。本の返却を記し、居住する部屋の契約は改めて結ぶ。','compromise',[give('book','borrower','registry'),set('leaseRenewed')]);
  route('clerk','rewrite','registered',{companions:['borrower','clerk']});end('registered','registry','司書と住人が窓口へ到着した。本の貸出と人の居住を別の台帳へ記す。','informed',[set('registered')]);
 }
 if(q.number===42){
  town('clock','書庫の外時計','library_clock');cell('relief','交代者の待つ休息棚',1,7,1);entity('reliefCrew','relief','group');node('shift').place='entry';
  route('entry','outside','outside');add('outside','clock','通りの時計を確かめると、交代時刻を過ぎていた。作業室へ時刻を伝える。',[opt('tell','作業室へ戻り、確認した時刻を告げる','shift',{effects:[set('outsideChecked')]})]);
  route('sand','hours','record_clock');add('record_clock','clock','乾いた砂で測った長さを外時計と照合し、超過した労働時間を記録した。交代者を呼びに行く。',[opt('call','休息棚で交代者へ記録を渡す','relief')]);
  add('relief','relief','記録を見た交代者が仕事を引き継ぐ。本人たちと作業室へ戻る。',[opt('escort','交代者を作業室へ案内する','shifted',{companions:['reliefCrew']})]);end('shifted','entry','交代者が作業室へ着いた。超過分の記録を管理者へ渡し、外の鐘も交代の目安にする。','informed',[set('hoursRecorded'),set('shifted')]);
  for(const from of ['shift','sand'])route(from,'two','two_clock');add('two_clock','clock','外時計を確認し、砂時計より早い方を交代時刻にする取り決めを持ち帰る。',[opt('agree','作業室で二時計の契約を結ぶ','agreed')]);end('agreed','entry','作業室で二つの時計を確認する契約を結んだ。外へ出ただけで勤務が終わったことにはしない。','compromise',[set('twoClocks')]);choice('entry','break').effects=[set('broken')];
 }
 if(q.number===43){
  cell('valve','保存薬の噴霧弁',1,5,3);town('copy','退避する控えの照合室','library_copy_room');entity('backup','copy');entity('restored','entry');
  route('entry','valve','valve');add('valve','valve','噴霧弁の前へ来た。ここで止めれば、別室の控えへ薬が回るのを防げる。',[opt('stop','弁を閉じて文字の残りを確かめる','restore',{effects:[set('stopped')]})]);delete choice('entry','valve').set;
  choice('entry','copy').effects=[set('lost')];
  route('restore','restore','backup');add('backup','copy','薬が届く前に残った控えを照合し、乾いた箱へ収めた。元の棚へ運ぶ。',[opt('carry','控えを元の棚へ運んで追記を戻す','restored',{depart:[give('backup','copy','party')]})]);end('restored','entry','無傷の控えと照合して追記を戻す。消えた内容を推測で埋めてはいない。','informed',[give('backup','party','entry'),set('restored')]);
  route('restore','blanks','blanks');end('blanks','copy','読める内容を控えの照合室へ残し、失われた部分を空欄として明記する。薬が回った後の追記は復元しない。','compromise',[set('blanks')]);
  for(const [from,key] of [['entry','seal'],['restore','close']])choice(from,key).effects=[set('sealed')];
 }
 if(q.number===44){
  town('person','名のある人のいる生活市','library_market');town('refuge','本人が選んだ避難先','salome_inn');town('office','予定書の発行・審査窓口','library_review');
  entity('subject','person','person');entity('notice','party');entity('discard','entry');node('safe').place='person';node('office').place='office';
  route('safe','escape','escaped',{companions:['subject']});end('escaped','refuge','本人が選んだ別の宿へ送り届ける。避難を審査の完了とは扱わない。','compromise',[set('protected')]);
  route('safe','appeal','protected',{companions:['subject'],effects:[set('protected')]});delete choice('safe','appeal').set;add('protected','refuge','本人を宿へ送り、安全を確かめて署名を受け取った。窓口へ審査を請求する。',[opt('appeal','署名した申立を窓口へ届ける','office',{effects:[set('appealed')]})]);
  // A later office visit returns to the person's actual refuge, not an old market marker.
  route('office','warn','locate');add('locate','office','本人がまだ生活市にいるか、既に宿へ避難したかを確かめた。',[opt('market','生活市へ本人を訪ねる','safe',{when:eq(v('subjectAt'),'person')}),opt('refuge','避難先で本人へ原本を示す','safe_refuge',{when:eq(v('subjectAt'),'refuge')})]);
  add('safe_refuge','refuge','本人は署名した申立の扱いを確かめた。今夜はこの宿に留まる。',[opt('leave','避難までで引き受けた仕事を終える','@compromise'),opt('appeal','署名した審査請求を窓口へ届ける','office',{effects:[set('appealed')]})]);
  choice('office','publish').effects=[set('reviewRequested')];choice('entry','destroy').effects=[give('notice','party','discard'),set('destroyed')];
 }
 if(q.number===45){
  town('council','相続人の協議室','library_council');town('deposit','財産の保管窓口','library_deposit');entity('draft','entry');entity('heirs','entry','group');node('conference').place='council';choice('entry','cool').effects=[set('unsigned')];
  choice('draft','gather').companions=['heirs'];choice('draft','gather').depart=[give('draft','entry','party')];
  for(const [from,key] of [['entry','witness'],['draft','hold'],['conference','deposit']])route(from,key,'deposited',{companions:['heirs'],depart:[transfer('draft','entry','party')]});
  end('deposited','deposit','保管窓口で費用を聞き、財産の受領を確かめる。文書は未成立のまま、証人の確認を続ける。','compromise',[give('draft','party','deposit'),set('held')]);choice('conference','minutes').effects=[give('draft','party','council'),set('minutes')];choice('entry','restore').effects=[set('treatedAsFinal')];
 }
 if(q.number===46){
  cell('rain','雨の年の旧書名札',2,7,1);cell('river','川の暦の旧書名札',2,9,6);cell('ferry','渡し守の記録と三冊',2,13,7);cell('exit','出口札の着く階段',2,1,1);entity('reader','entry','person');
  for(const id of ['rain','river','ferry'])node(id).place=id;
  for(const n of x.nodes)for(const a of n.options)if(!a.to.startsWith('@'))a.companions=['reader'];
  for(const id of ['rain','river','ferry'])route(id,'exit','guided',{companions:['reader'],depart:[set(id+'Exit')]});end('guided','exit','追加した出口札をたどり、読者と階段へ戻った。索引の循環自体は残っている。','compromise');
  choice('rain','river').effects=[set('rainRead')];choice('river','ferry').effects=[set('riverRead')];choice('ferry','link').effects=[set('linked')];choice('entry','straight').effects=[set('straightened')];
 }
 if(q.number===47){
  town('home','依頼国の出張記録室','library_home_record');town('other','相手国の交易市記録室','library_other_record');town('vault','二国の共同保管庫','library_joint');
  node('home').place='home';node('other').place='other';node('vault').place='vault';entity('pages','entry');entity('homeCopy','vault');entity('otherCopy','vault');entity('homeRecipient','vault','person');entity('otherRecipient','vault','person');
  choice('entry','home').text='依頼国の在サロメ記録係に交換頁を読んでもらう';choice('entry','other').text='交易市に滞在する相手国の記録係を先に訪ねる';choice('home','other').text='高台街道と地下水道の関所を通り、交易市の相手国記録係へ照会する';
  for(const key of ['home','other'])choice('entry',key).depart=[give('pages','entry','party')];
  route('entry','return','returned',{depart:[give('pages','entry','party')]});end('returned','home','依頼国に都合のよい頁だけを記録係へ戻した。他方への照会はしていない。','contract',[give('pages','party','home')]);
  route('other','parallel','parallel');route('vault','publish','parallel');add('parallel','vault','双方の勝利記述と撤退条件を同じ紙面へ併記した。同じ写しを二つ用意し、各記録係へ運ぶ。',[opt('deliver','原本を共同庫へ置き、写しを依頼国の記録係へ運ぶ','home_delivered',{depart:[give('pages','party','vault'),give('homeCopy','vault','party'),give('otherCopy','vault','party')],effects:[give('homeCopy','party','home')]})]);
  add('home_delivered','home','依頼国の記録係が同じ内容の写しを受け取った。もう一方を交易市へ届ける。',[opt('other','交易市の相手国記録係へ届ける','other_delivered',{effects:[give('otherCopy','party','other')]})]);end('other_delivered','other','相手国の記録係も同じ写しを受け取った。両方の編纂机に同じ記述が届き、それぞれの読み方について対話が始まる。','informed',[set('bothDelivered')]);
  choice('vault','deliver').effects=[give('pages','party','vault'),give('homeCopy','vault','homeRecipient'),give('otherCopy','vault','otherRecipient'),set('bothReceived')];
 }
 if(q.number===48){
  town('morning','翌朝の原稿を受け取る写本室','library_copy_room');town('contract','新規追加を分ける契約窓口','library_registry');node('morning').place='morning';node('final').place='contract';entity('team','morning','group');
  route('morning','again','again');delete choice('morning','again').textAfter;add('again','entry','校正台へ戻り、追加された一字を直した。次の朝の原稿を確かめに行く。',[opt('next','翌朝の原稿を写本室で確認する','morning')]);
  route('final','seal','sealed');end('sealed','entry','新規追加を別契約にした署名を校正台へ戻し、残る誤字を直して最終稿を封印する。','informed',[set('additionsClosed'),set('sealed')]);
  for(const [from,key] of [['entry','team'],['morning','team'],['final','continue']])route(from,key,'team');add('team','morning','写本室で交代の校正者を集めた。新しい紙の追加も含めて処理する。',[opt('escort','交代者と校正台へ向かう','team_work',{companions:['team']})]);end('team_work','entry','交代者が校正台へ到着し、分担して一晩の誤字をゼロにする。','compromise',[set('teamWorked')]);choice('entry','break').effects=[set('broken')];
 }
 if(q.number===49){
  cell('map','壁に残された帰路の見取図',2,7,1);town('registry','封印範囲の修正を受け取る窓口','library_registry');entity('document','entry');entity('mapCopy','map');entity('luu','entry','person');
  choice('scope','split').effects=[set('separateMap')];
  for(const [from,key] of [['entry','map'],['scope','leave'],['test','undo']])route(from,key,'map',{companions:['luu']});add('map','map','文書を元の保管場所へ残し、壁の見取図を別紙へ写した。帰路を封じる操作は行わない。',[opt('return','道順の写しを持ち、ルウと窓口へ戻る','returned',{companions:['luu'],depart:[give('mapCopy','map','party')]})]);end('returned','registry','ルウと帰着し、道順の写しを示す。封じた文書は持ち出していない。','compromise',[give('mapCopy','party','registry')]);
  route('test','return','reported',{companions:['luu'],depart:[give('document','entry','party')]});end('reported','registry','別紙の道順で帰着し、機密だけを封じた文書と封印範囲の修正を窓口へ渡す。','informed',[give('document','party','registry'),set('reported')]);choice('entry','burn').effects=[set('burned')];
 }
 if(q.number===50){
  town('warehouse','別倉の受領棚','library_warehouse');town('requests','延長を申請する窓口','library_registry');town('copies','写本班の照合室','library_copy_room');town('notice','書庫受付の移送先掲示','e2_archive');
  node('warehouse').place='warehouse';node('requests').place='requests';node('copies').place='copies';entity('firstBox','entry');entity('otherBooks','entry');entity('unfinished','entry');entity('copySet','copies');
  choice('entry','follow').depart=[give('firstBox','entry','party')];choice('entry','follow').effects=[give('firstBox','party','warehouse')];
  for(const [from,key] of [['entry','copy'],['warehouse','copy'],['requests','cancel']])route(from,key,'prepare_copies');
  add('prepare_copies','entry','閉架の棚へ戻り、写本班へ渡す原本を確かめた。延長を取り下げた二冊も含めて運ぶ。',[opt('carry','原本を写本室へ運び、一冊ずつ照合する','copies',{depart:[transfer('firstBox','entry','party'),transfer('firstBox','warehouse','party'),transfer('otherBooks','entry','party'),transfer('unfinished','entry','party')],effects:[give('firstBox','party','copies'),give('otherBooks','party','copies'),give('unfinished','party','copies'),set('copied')]})]);
  // The first box already received by the warehouse must be retrieved there.
  const collect=choice('prepare_copies','carry');delete collect.depart;delete collect.effects;route('prepare_copies','carry','fetch_box',{depart:[transfer('otherBooks','entry','party'),transfer('unfinished','entry','party'),transfer('firstBox','entry','party')]});
  add('fetch_box','warehouse','別倉の受領棚を確認する。先に着いた箱があれば引き取り、まだなら携行してきた箱と一緒に写本室へ運ぶ。',[opt('copy','原本を写本室へ運んで照合する','copies',{depart:[transfer('firstBox','warehouse','party')],effects:[give('firstBox','party','copies'),give('otherBooks','party','copies'),give('unfinished','party','copies'),set('copied')]})]);
  node('copies').text='写本班が分担し、一箱ずつ照合した。原本の移送は、これから別倉の受領棚で確かめる。';
  route('copies','close','closed',{depart:[give('firstBox','copies','party'),give('otherBooks','copies','party'),give('unfinished','copies','party')]});end('closed','warehouse','全ての原本を別倉へ運び、最後の箱の受領を確かめた。写本は照合室に残る。','compromise',[give('firstBox','party','warehouse'),give('otherBooks','party','warehouse'),give('unfinished','party','warehouse')]);
  route('requests','publish','select');add('select','entry','閉架の棚へ戻り、未完の二冊を延長分として分ける。残る本だけを搬送する。',[opt('carry','通常分を別倉へ送り、延長分を残す','delivered',{depart:[transfer('otherBooks','entry','party'),transfer('firstBox','entry','party')],effects:[transfer('otherBooks','party','warehouse'),transfer('firstBox','party','warehouse'),set('extended')]})]);
  // If copying was chosen first, restore the two extended books at their shelf.
  route('copies','address','return_extended',{depart:[give('firstBox','copies','party'),give('otherBooks','copies','party'),give('unfinished','copies','party')]});add('return_extended','entry','原本を閉架の棚へ戻した。未完の二冊を選び直して延長を求める。',[opt('request','窓口で二冊の延長を申請する','requests',{depart:[give('firstBox','party','entry'),give('otherBooks','party','entry'),give('unfinished','party','entry')]})]);
  add('delivered','warehouse','通常分の受領を確認した。未完の二冊は元の棚で延長し、移送先とともに入口へ掲示する。',[opt('post','書庫受付へ戻り、移送先と二冊を掲示する','posted')]);end('posted','notice','通常分の移送先と、延長して棚に残る二冊を掲示した。','informed',[set('posted')]);choice('entry','stop').effects=[set('clockFixed')];
 }
 return finish();
}
