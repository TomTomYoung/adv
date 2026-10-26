import {set,give,ref,eq} from '../../../story-kit.mjs';
import {observatorySource} from './observatory-common.mjs';

export function observatoryFirstSource(q){
 const {x,node,choice,town,cell,field,entity,opt,add,route,end,v,transfer,finish}=observatorySource(q);
 const p=q.locations.find(p=>p.role==='decision');cell('entry',q.title+'の現場',p.map.endsWith('f1')?1:2,p.x,p.y);
 if(q.number===81){
  town('refuge','避難した人の待つ高台','royal_refuge');town('notice','上映と天気の告知所','observatory_notice');town('sky','実際の空を観測する地上台','observatory_platform');
  route('show','correct','correction');add('correction','refuge','避難先へ来て、天井の上映と実際の天気の違いを伝えた。次は告知所の表示を分ける。',[opt('post','告知所へ訂正を掲示しに行く','posted')]);end('posted','notice','上映と天気の告知を別々に掲示する。','informed',[set('corrected')]);
  for(const [from,key] of [['entry','delay'],['show','postpone']])route(from,key,'observed',{depart:[set('delayed')]});end('observed','sky','地上へ出て空を観測し、延期した盤の記録と並べる。','compromise',[set('observed')]);choice('entry','destroy').effects=[set('destroyed')];
 }
 if(q.number===82){
  town('vendor','星瓶の店の引渡し台','observatory_vendor');entity('bottle','entry');entity('customer','vendor','person');
  route('entry','heat','heated',{effects:[set('spent')]});add('heated','entry','瓶を強く加熱すると、一瞬明るくなって蓄えを使い切った。売る相手に事情を説明する。',[opt('carry','瓶を地上の店へ運ぶ','sold_spent',{depart:[give('bottle','entry','party')]})]);
  choice('temperature','high').effects=[set('spent')];route('spent','sell','sold_spent',{depart:[give('bottle','entry','party')]});end('sold_spent','vendor','光を使い切ったことを説明し、客へ瓶を渡す。','contract',[give('bottle','party','customer')]);
  choice('temperature','normal').effects=[set('normal')];route('label','instructions','sold',{depart:[give('bottle','entry','party')]});end('sold','vendor','適温、光の寿命、再充填の方法を書いた札を瓶に添えて渡す。','informed',[give('bottle','party','customer')]);
  for(const [from,key] of [['entry','refund'],['temperature','refund'],['spent','refund'],['label','return']])route(from,key,'returned',{depart:[give('bottle','entry','party')]});end('returned','vendor','瓶を地上の店へ運んだ。仕組みと、試験で光を使い切った場合はその状態も説明して返品を受け付ける。','compromise',[give('bottle','party','vendor')]);
 }
 if(q.number===83){
  cell('scaffold','保守足場を引き戻す操作点',1,7,3);cell('control','人工太陽の回転制御',1,5,1);town('calendar','過去の日食を注記する暦の窓口','observatory_calendar');node('scaffold').place='scaffold';
  route('entry','stop','stopped');end('stopped','control','回転制御の前で人工太陽を止める。昼夜も止まるので、以後の消灯は手動になる。','contract',[set('stopped')]);
  route('scaffold','dates','removed',{effects:[set('removed')]});add('removed','scaffold','足場を引き戻し、光が戻ったことを確認した。過去の記録を直す窓口へ向かう。',[opt('record','暦の窓口へ撤去と訂正を伝える','corrected')]);end('corrected','calendar','以前の欠けた日も消さず、保守足場による影だったと注記する。','informed');choice('scaffold','only').effects=[set('removed')];
  for(const [from,key] of [['entry','calendar'],['scaffold','shade']])route(from,key,'shade');end('shade','calendar','影が続く時間を暦へ記し、短い薄明の運用を相談する。','compromise');
 }
 if(q.number===84){
  cell('beacon','反復する救助標と矢印',1,3,13);field('crossing','担架の跡がある上層の空気室','rescue',7,3);field('survivors','返事をする一行の空気室','rescue',13,7);town('rescue','専門隊の引継ぎ詰所','royal_rescue');town('family','発信機を待つ家','observatory_family');node('beacon').place='beacon';node('crossing').place='crossing';entity('beaconDevice','beacon');entity('stretcherParty','survivors','group');entity('specialists','rescue','group');entity('chartCopy','rescue');
  route('entry','recover','recovery');add('recovery','beacon','発信地点へ来た。機械だけを持ち帰る場合、本人を見つけたことにはしない。',[opt('carry','発信機を家族へ持ち帰る','recovered',{depart:[give('beaconDevice','beacon','party')]})]);end('recovered','family','反復する発信機を家族へ渡し、本人の行方はまだ分からないと伝える。','contract',[give('beaconDevice','party','family')]);
  route('beacon','trail','route_check');add('route_check','rescue','救助標の矢印を詰所へ伝え、上層水路の入口を確かめる。既に救難図を渡していれば、その写しを借りられる。',[opt('follow','担架の跡を上層の空気室までたどる','crossing',{depart:[{...give('chartCopy','rescue','party'),when:eq(ref('quests.q061.outcome'),'informed')}]})]);
  node('crossing').text[0].yes='救難隊から借りた空気の地図の写しで、担架が通った上層の息継ぎ場所を確認できた。';
  route('crossing','reach','reached');end('reached','survivors','返事を確かめながら次の空気室へ進み、担架の一行と合流した。','informed',[set('reached')]);
  route('beacon','handoff','handoff');end('handoff','rescue','救助標は現場に残し、矢印の向きと場所を専門隊へ引き継ぐ。','compromise');
  route('crossing','call','call_report');choice('crossing','call').text='現在地を専門隊へ届け、現場で到着を待つ';add('call_report','rescue','詰所へ現在地を届けた。専門隊と上層の空気室へ戻る。',[opt('escort','専門隊と空気室へ戻る','expert_arrived',{companions:['specialists']})]);end('expert_arrived','crossing','専門隊が担架の跡のある空気室へ着き、ここから先を引き受けた。','compromise');
 }
 if(q.number===85){
  cell('exit','帰還標を据える入口',1,1,1);cell('corner','針を試す曲がり角',1,7,3);entity('bag','party');entity('marker','bag');entity('compass','party');entity('guide','entry','person');entity('nextGuide','entry','person');const companions=['guide','nextGuide'];
  choice('entry','bag').effects=[give('marker','bag','party')];choice('entry','north').effects=[set('magnetized')];
  node('entrance').place='corner';node('leader').place='corner';route('marker','entrance','place_marker',{companions});
  add('place_marker','exit','帰還標を入口へ置く。先導役の二人と曲がり角へ進み、針の向きを試す。',[opt('walk','標を置き、曲がり角まで歩く','entrance',{companions,depart:[give('marker','party','exit')]})]);
  const leaderTrip={companions,depart:[give('marker','party','guide')],effects:[give('marker','guide','nextGuide')]};Object.assign(choice('marker','leader'),leaderTrip);
  route('entrance','leader','recover_marker',{companions});add('recover_marker','exit','入口へ戻り、置いてあった帰還標を確かめた。今度は動く先導者に持ってもらう。',[opt('leader','標を拾って先導者へ渡し、角で交代を試す','leader',{companions,depart:[give('marker','exit','party'),give('marker','party','guide')],effects:[give('marker','guide','nextGuide')]})]);
  route('leader','entrance','place_marker',{companions,depart:[give('marker','nextGuide','party')]});route('entrance','exit','fixed',{companions});end('fixed','exit','入口へ戻り、標を固定して脱出用具として登録する。','informed',[set('fixed')]);
 }
 if(q.number===86){
  cell('mail','受領歯車の欠けた通信箱',2,11,5);town('archive','旧報告と対応表の保存先','observatory_archive');entity('notice','entry');entity('receiver','mail');entity('reports','entry');node('mail').place='mail';
  choice('entry','reply').depart=[give('notice','entry','party')];choice('entry','reply').effects=[give('notice','party','receiver')];route('mail','repair','repaired',{effects:[set('receiverFixed')]});add('repaired','mail','通信箱の受領歯車を直し、暦改定通知を読み込ませた。観測器の新しい報告を確かめに戻る。',[opt('verify','観測器へ戻って新しい日付を確かめる','mapping')]);
  route('mapping','table','mapped',{depart:[give('reports','entry','party')]});end('mapped','archive','旧報告を資料室へ運び、新旧の対応表とともに保存する。','informed',[give('reports','party','archive')]);
  for(const [from,key] of [['entry','old'],['mail','manual'],['mapping','daily']])route(from,key,'annotate');add('annotate','entry','観測器の報告を旧暦と区別して受け取り、日ごとの注記を付ける。',[opt('save','注記した報告を資料室へ運ぶ','annotated',{depart:[give('reports','entry','party')]})]);end('annotated','archive','旧暦の注記を付けた報告を保存した。新旧の一括対応表は作っていない。','compromise',[give('reports','party','archive')]);choice('entry','discard').effects=[set('discarded')];
 }
 if(q.number===87){
  cell('sky','流星を眺める上映席',2,13,5);town('home','片付ける机のあるハクの家','observatory_haku');entity('haku','entry','person');entity('notebook','party');entity('desk','home');entity('clutter','desk');entity('shelf','home');choice('entry','test').effects=[set('ticketIssued')];choice('ticket','wording').effects=[set('wordingFixed')];choice('entry','break').effects=[set('broken')];
  for(const [from,key] of [['entry','notebook'],['ticket','record'],['firststep','write']])route(from,key,'written',{companions:['haku'],depart:[set('written')]});end('written','sky','ハクと上映席へ来た。手帳に残した願いと、本人が実行したことを区別して読み返す。','compromise');
  route('firststep','act','desk',{companions:['haku']});end('desk','home','ハクと家の机へ戻った。願いを読み返し、最初の一つを棚へ片付ける。','informed',[give('clutter','desk','shelf'),set('firstStep')]);
 }
 if(q.number===88){
  town('workshop','測定板と点検班の工房','observatory_workshop');town('archive','割れた板の教材の保存先','observatory_archive');cell('scope','交換後の窓を使う観測位置',2,17,9);entity('window','entry');entity('cracked','entry');entity('spare','workshop');entity('experts','workshop','group');node('observe').place='scope';choice('entry','layers').effects=[give('cracked','entry','party')];
  route('panel','replace','spare');add('spare','workshop','工房で交換用の測定板を受け取る。耐圧窓は現場に残っている。',[opt('carry','新しい測定板を窓へ運ぶ','install',{depart:[give('spare','workshop','party')]})]);
  add('install','entry','交換用の測定板を窓へ運んだ。ここで取付け、密閉と目盛を点検する。',[opt('test','測定板を交換して点検する','checked',{effects:[give('spare','party','window'),set('checked')]})]);add('checked','entry','密閉と目盛の点検が済んだ。観測位置へ移る。',[opt('observe','観測位置へ向かう','observe')]);
  route('observe','sky','lesson',{depart:[set('observed')]});end('lesson','archive','観測を終え、割れた測定板を資料室へ運んだ。次の点検の教材として残す。','informed',[give('cracked','party','archive')]);
  for(const [from,key] of [['entry','inspection'],['panel','expert']])route(from,key,'experts');add('experts','workshop','工房へ窓全体の点検を依頼した。専門の班と窓へ戻る。',[opt('escort','点検班と窓へ戻る','inspected',{companions:['experts']})]);end('inspected','entry','専門の点検班が窓へ到着した。今夜の観測を中止し、点検の記録を残す。','compromise',[set('checked')]);
  route('observe','cancel','cancelled');end('cancelled','entry','窓へ戻り、点検の記録を保管する。今夜の観測は見送る。','compromise');choice('entry','metal').effects=[set('covered')];
 }
 if(q.number===89){
  town('wedding','婚礼の日を相談する集会所','royal_hall');town('wages','支払日を相談する工房','observatory_workshop');town('calendar','二つの暦を記す窓口','observatory_calendar');choice('entry','turn').effects=[set('south')];choice('entry','gears').effects=[set('ground')];
  for(const key of ['wedding','wages']){route('dates',key,key+'_agreed');add(key+'_agreed',key,key==='wedding'?'婚礼の当事者と集会所で話し、代わりの日を決めた。':'工房の支払窓口で、賃金の支払日を移す合意を得た。',[opt('return','天球儀へ戻る','dates')]);}
  choice('dates','switch').effects=[set('switched')];for(const [from,key] of [['entry','two'],['dates','keep']])route(from,key,'dual');end('dual','calendar','暦の窓口へ来て二つの暦を併記する。飛ぶ月への急な切替はしない。','compromise');
 }
 if(q.number===90){
  cell('battery','封印された蓄電器',2,11,5);cell('sky','蓋の下の観測席',2,9,11);town('surface','地上の観測行の到着先','observatory_platform');node('schedule').place='battery';node('open').place='sky';entity('mao','entry','person');entity('visitors','entry','group');entity('maintenance','entry','group');const all=['mao','visitors'];
  choice('entry','battery').companions=['mao'];route('schedule','hour','reserve',{companions:['mao']});add('reserve','entry','マオと蓋の制御台へ戻った。一時間で閉じる役を決め、生活灯を蓄電器へ切り替える。',[opt('start','生活灯の切替と観測蓋の開放を行う','opened',{effects:[set('backup'),set('lidOpen')]})]);
  add('opened','entry','蓋が開き、生活灯は蓄電器で点いている。名簿を持つマオと観覧者を観測席へ案内する。',[opt('escort','皆で観測席へ向かう','open',{companions:all})]);
  route('open','close','close',{companions:all});end('close','entry','制御台へ戻った。予定内に蓋を閉じ、生活灯を通常電源へ戻す。','informed',[set('lidOpen',false),set('backup',false),set('restored')]);
  route('open','longer','exhausted',{effects:[set('backup',false),set('exhausted')]});add('exhausted','sky','観測を延長し、蓄電が尽きて生活灯が消えた。保守員のいる制御台へ戻る。',[opt('return','観覧者と制御台へ戻る','overrun',{companions:all})]);end('overrun','entry','保守員が制御台で蓋を閉じる。次回は終了役を別に置くことを申し送る。','overrun',[set('lidOpen',false),set('restored')]);
  for(const [from,key] of [['entry','surface'],['schedule','trip']])route(from,key,'assemble',{companions:['mao']});add('assemble','entry','地下の生活灯を保ったまま、地上へ向かう列を集めた。',[opt('escort','マオと列を地上の観測台へ案内する','surface',{companions:all})]);end('surface','surface','皆が地上の観測台へ到着した。地下の給電を変えず、本当の空を見る。','compromise');choice('entry','full').effects=[set('lidOpen'),set('fullPower')];
 }
 return finish();
}
