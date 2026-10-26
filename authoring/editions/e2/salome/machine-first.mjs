import {set,give,eq,not} from '../../../story-kit.mjs';
import {machineSource} from './machine-common.mjs';
export function machineFirstSource(q){
 const {x,node,choice,town,cell,entity,opt,add,route,end,v,transfer,finish}=machineSource(q);
 if(q.number===71){
  town('record','退職者の返却記録窓口','machine_registry');cell('worker_room','整備人の作業室',1,5,11);cell('power','門番の外部電源盤',1,12,3);
  entity('returnRecord','record');entity('workerPerson','worker_room','person');entity('stamp','workerPerson');
  route('entry','retired','record');add('record','record','退職者の返却記録を照合した。現役の整備人の番号は別に残す。',[opt('carry','記録を門番へ運んで読み込ませる','worker',{depart:[give('returnRecord','record','party')],effects:[give('returnRecord','party','entry'),set('retiredChecked')]})]);
  route('worker','call','call');add('call','worker_room','整備人を作業室で呼んだ。まだ帰還印は押されていない。',[opt('escort','本人と門番の前へ戻る','returned',{companions:['workerPerson']})]);end('returned','entry','整備人が門番の前へ戻り、自分の帰還印を押した。退職記録と実際の退出を別々に確かめて門番を休ませる。','informed',[give('stamp','workerPerson','entry'),set('returned')]);
  for(const [from,key] of [['entry','power'],['worker','temporary']])route(from,key,'cut');add('cut','power','外部電源を短時間切った。未帰還の番号を消す処理は行わない。',[opt('repair','停止中の門番へ戻って補修する','repaired',{depart:[set('temporaryOff')]})]);end('repaired','entry','停止中に補修を済ませ、電源を戻す。番号の問題は残る。','compromise',[set('temporaryOff',false),set('repaired')]);
  choice('entry','dismantle').effects=[set('dismantled')];
 }
 if(q.number===72){
  cell('cold','下層の冷えた試験台',2,3,5);town('oilshop','適温油を調合する工房','machine_parts');cell('discard','回収油の封止槽',1,13,2);
  entity('oilSample','entry');entity('coldOil','oilshop');node('warm').place='cold';choice('entry','heat').effects=[set('heated')];node('oil').place='oilshop';
  for(const [from,key] of [['entry','oil'],['warm','change']])choice(from,key).depart=[transfer('oilSample','entry','party')];
  route('oil','separate','changed',{depart:[give('coldOil','oilshop','party')]});end('changed','cold','下層用の油を機械へ納め、同じ温度で動作を試す。祈祷の記録と整備の合否を分けて記した。','informed',[give('coldOil','party','cold'),set('oilChanged'),set('ritualSeparated')]);
  route('oil','heat','warm',{effects:[set('heated')]});route('entry','discard','discarded',{depart:[give('oilSample','entry','party')]});end('discarded','discard','現用油を回収槽へ封止した。携行油へは混ぜず、再稼働までの手動の鐘当番を確認する。','contract',[give('oilSample','party','discard'),set('discarded')]);
 }
 if(q.number===73){
  town('smith','腕の複製と支えの工房','machine_hammer');cell('load','避難扉の荷重確認位置',1,7,1);entity('arm','entry');entity('otherArms','entry');entity('copyArm','smith');
  route('entry','brace','brace');add('brace','smith','扉の荷重に合う支えを用意した。腕を外す前に扉へ戻る。',[opt('carry','支えを扉へ運び、荷重を受け替える','support',{effects:[set('supported')]})]);
  node('copy').place='smith';for(const [from,key] of [['entry','borrow'],['support','one']])choice(from,key).depart=[transfer('arm','entry','party')];
  route('copy','return','returned',{depart:[give('copyArm','smith','party')]});end('returned','entry','複製を持って扉へ戻り、借りた原品を元の位置へ据えた。返却を確認して納品する。','compromise',[give('arm','party','entry'),set('returned')]);
  route('copy','support','support',{effects:[set('supported')]});
  route('support','recover','tested',{depart:[transfer('arm','entry','party'),give('otherArms','entry','party')]});add('tested','load','常設の支えに荷重を掛け、扉が開閉できることを確認した。回収した腕を工房へ納める。',[opt('deliver','腕を工房へ運ぶ','recovered',{depart:[set('loadTested')]})]);end('recovered','smith','支えと扉の試験結果を添えて腕を引き渡した。','informed',[give('arm','party','smith'),give('otherArms','party','smith')]);
  route('entry','take','taken',{depart:[give('arm','entry','party'),give('otherArms','entry','party'),set('evacuationBlocked')]});end('taken','smith','三本を工房へ渡した。避難扉には人が支える番が必要になったと申し送る。通常の石段の帰路は塞がない。','contract',[give('arm','party','smith'),give('otherArms','party','smith')]);
 }
 if(q.number===74){
  cell('cooling','冷却を入れる操作盤',1,1,7);cell('furnace_place','試験炉の操作盤',1,10,5);cell('footing','封鎖外の退避足場',1,3,7);town('copy','祈祷書の訂正窓口','library_copy_room');
  node('furnace').place='cooling';node('door').place='furnace_place';node('lock').place='footing';choice('entry','cool').effects=[set('coolingOn')];choice('lock','reset').effects=[set('coolingOn')];choice('furnace','furnace').effects=[set('furnaceOn')];
  route('door','correct','opened');add('opened','entry','冷却、炉の順で起動した灯を確かめ、扉を開いた。試験結果を写本室へ運ぶ。',[opt('correct','ユアへ検証済みの順序を届ける','corrected',{depart:[set('doorOpened')]})]);end('corrected','copy','写本の一節目を試験結果に合わせて訂正し、検証日を記した。','informed',[set('corrected')]);
  for(const [from,key] of [['entry','manual'],['lock','manual'],['furnace','manual'],['door','stop']])route(from,key,'manual');end('manual','entry','炉の停止を確かめ、手動で扉を開く。訂正を決めたことにはしない。','compromise',[set('furnaceOn',false),set('manualOpened')]);
 }
 if(q.number===75){
  town('store','給付票と歯車を照合する部品庫','machine_parts');town('workers','修繕の移管を相談する作業所','machine_registry');town('forms','要求票の翻訳窓口','e2_archive');entity('gearPart','store');entity('requestSheet','entry');entity('workersGroup','workers','group');node('parts').place='store';choice('entry','gear').depart=[give('requestSheet','entry','party')];choice('parts','deliver').depart=[give('gearPart','store','party')];choice('parts','deliver').effects=[give('gearPart','party','entry'),set('supplied')];
  for(const [from,key] of [['entry','share'],['parts','reduce']])route(from,key,'share');add('share','workers','引き受ける作業と人手を相談し、人用の工具を揃えた。部品を補給したという記録は付けない。',[opt('escort','作業者を聖者のいる場所へ案内する','shared',{companions:['workersGroup']})]);end('shared','entry','人が担当の作業を引き受け、聖者の稼働量を下げた。','compromise',[set('workShared')]);
  route('running','translate','translated');add('translated','forms','要求票を部品名と補給先へ翻訳した。次の票が金銭窓口へ行かないよう、原本を部品庫へ届ける。',[opt('deliver','新しい要求票を部品庫へ登録する','registered')]);end('registered','store','部品庫が補給先入りの要求票を受け取った。','informed',[give('requestSheet','party','store'),set('translated')]);
 }
 if(q.number===76){
  cell('control_place','空調信号の操作盤',2,7,1);town('fridge','別回線の薬品冷蔵庫','machine_clinic');town('record','歌の録音保管室','library_copy_room');entity('medicineBox','entry');entity('songRecord','control_place');node('control').place='control_place';node('moved').place='fridge';
  route('entry','medicine','moved',{depart:[give('medicineBox','entry','party')],effects:[give('medicineBox','party','fridge'),set('protected')]});route('control','move','fetch',{when:not(eq(v('protected'),true))});add('fetch','entry','保育室へ戻って薬を受け取った。別の冷蔵庫で受領されるまでは移送を終えていない。',[opt('carry','薬を冷蔵庫へ運ぶ','moved',{depart:[give('medicineBox','entry','party')],effects:[give('medicineBox','party','fridge'),set('protected')]})]);
  route('moved','stop','stopped');end('stopped','entry','薬の移送記録を確認して、人形の歌を止めた。','compromise',[set('stopped')]);route('control','rewire','recorded',{depart:[set('separateCircuit'),give('songRecord','control_place','party')]});end('recorded','record','空調を別回線へ移した試験記録と、歌の録音を預けた。','informed',[give('songRecord','party','record'),set('protected'),set('recorded')]);choice('entry','off').effects=[set('stopped'),set('medicineLost')];
 }
 if(q.number===77){
  cell('clinic','停電した隣の診療室',2,14,1);cell('detour','柵の外を回る巡礼路',2,5,3);entity('lamps','entry');choice('entry','cutpower').effects=[set('outage')];
  route('outage','lamps','delivered',{depart:[give('lamps','entry','party')],effects:[give('lamps','party','clinic'),set('lampsDelivered')]});add('delivered','clinic','診療室で仮灯を受け取り、手元が見えることを確かめた。壁の修理はこれから行う。',[opt('return','放電壁へ戻って絶縁と壁を直す','repaired')]);end('repaired','entry','配線を絶縁して壁を閉じ、試験後に通電を戻した。','informed',[set('repaired'),set('outage',false)]);
  for(const [from,key] of [['entry','fence'],['outage','restore']])route(from,key,'detoured',{depart:[set('fenced'),set('outage',false)]});end('detoured','detour','柵を避ける巡礼路を歩き、入口へ戻る道を確かめて案内札を立てた。','compromise',[set('detourChecked')]);choice('entry','scrape').effects=[set('cosmeticOnly')];
 }
 if(q.number===78){
  town('hammer_place','本人の槌作業台','machine_hammer');town('needle_place','本人の針仕事台','machine_needle');town('record','旧配置と新設定の保管室','machine_registry');entity('userPerson','entry','person');entity('arm','userPerson');entity('oldLayout','entry');
  node('bench').place='hammer_place';choice('entry','train').companions=['userPerson'];choice('entry','train').depart=[give('oldLayout','entry','party')];
  for(const key of ['hammer','needle']){const a=choice('bench',key);a.to=key+'_trial';a.companions=['userPerson'];delete a.set;add(key+'_trial',key==='hammer'?'hammer_place':'needle_place',key==='hammer'?'本人が槌を握り、実際の距離で補正を試す。':'本人が針を持ち、槌とは別の握力と距離を試す。',[opt('return','練習結果を記して相談へ戻る','bench',{effects:[set(key)],...(key==='needle'?{companions:['userPerson']}:{})})]);}
  route('bench','save','saved',{companions:['userPerson']});end('saved','record','本人と二つの練習結果を確認し、新設定を保存した。旧配置は別記録として残す。人物の記憶や仲間の能力は書き換えない。','informed',[give('oldLayout','party','record'),set('saved')]);
 }
 if(q.number===79){
  town('archive_place','九十九件の退避記録室','machine_registry');cell('small_furnace','灯を選ぶ代替小炉',2,3,5);entity('recordBoard','entry');entity('backup','archive_place');node('archive').place='archive_place';choice('entry','test').effects=[set('hundredthObserved')];choice('entry','storage').text='再試験を止め、記録板の満杯表示を調べる';
  choice('full','shutdown').depart=[set('shutdown'),give('recordBoard','entry','party')];choice('full','shutdown').effects=[set('backupVerified')];
  route('archive','clear','restarted',{depart:[set('cleared')]});end('restarted','entry','退避先の九十九件の読取りを確かめた後で板を戻し、終了記録が残るところまで再起動した。','informed',[give('recordBoard','party','entry'),set('saved'),set('shutdown',false)]);
  route('full','small','small',{depart:[set('shutdown')]});route('archive','replace','small',{depart:[give('recordBoard','party','archive_place')]});end('small','small_furnace','中央炉を止めたまま、必要な灯だけを小炉へつないだ。記録板の交換を待つ。','compromise',[set('smallRunning')]);choice('entry','bypass').effects=[set('bypassed')];
 }
 if(q.number===80){
  town('maintenance_place','整備者の承認窓口','machine_registry');town('users_place','利用者の稼働時間相談','salome_inn');cell('guardians_place','避難路を確かめる保護者席',1,7,1);cell('destroy','単独支配鍵の破棄台',2,4,5);entity('singleKey','entry');
  for(const key of ['maintenance','users','guardians']){const a=choice('council',key);a.to=key+'_signed';delete a.set;const text=a.textAfter;delete a.textAfter;add(key+'_signed',key+'_place',text,[opt('return','署名した条件を中枢へ持ち帰る','council',{depart:[set(key)]})]);}
  choice('entry','rule').effects=[give('singleKey','entry','party'),set('singleControl')];
  route('council','restore','destroy',{depart:[give('singleKey','entry','party')]});add('destroy','destroy','三者の署名と役割を照合した。単独で承認を飛ばす鍵だけを破棄する。',[opt('return','短絡鍵を破棄し、中枢へ戻る','restored',{depart:[give('singleKey','party','destroy'),set('singleKeyDestroyed')]})]);end('restored','entry','三つの端子へ署名を接続して短絡を外した。整備・利用・保護の役割を持つ鍵をそれぞれ渡す。','informed',[set('sharedControl')]);
 }
 return finish();
}
