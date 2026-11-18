import {story,O,set,move,give,see,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

export const returnCartPlaces={cargo:'停止した貨車の足場',cage:'人員籠の乗り場',surface:'地上の搬出口',clinic:'坑夫の治療所',home:'坑夫の家の戸口'};
const point=(key,x,y)=>({kind:'dungeon',dungeon:'region_2',map:'region_2_f1',x,y,event:'q014_return_cart_'+key});
export const returnCartWorld={cargo:point('cargo',17,3),cage:point('cage',17,2),surface:{kind:'town',location:'e2_cart_surface'},clinic:{kind:'town',location:'e2_cart_clinic'},home:{kind:'town',location:'e2_cart_home'}};
export const returnCartLocations={
 e2_cart_surface:{id:'e2_cart_surface',name:'廃坑・地上の搬出口',parent:'hikarigaeri_square',description:'廃坑の昇降場から運ばれた荷を受ける場所。人員便と貨物便は分かれている。広場脇から治療所と坑夫の家へ道が続く。',background:'location_checkpoint',links:[]},
 e2_cart_clinic:{id:'e2_cart_clinic',name:'廃坑側の治療所',parent:'e2_cart_surface',description:'廃坑の負傷者を受け入れる治療所。受診と処置の記録、鉱山への事故申請は別に扱う。',background:'location_medical',links:[]},
 e2_cart_home:{id:'e2_cart_home',name:'坑夫の家の戸口',parent:'e2_cart_surface',description:'搬出口から続く道沿いの家。帰宅した坑夫を仲間が家の中へ引き継ぐ。',background:'location_square',links:[]}
};
export function extendReturnCartGeography(bundle){
 Object.assign(bundle.additions.locations,structuredClone(returnCartLocations));
 bundle.travel.routes.push({id:'return_cart_surface',name:'廃坑の昇降場と灯帰り側の搬出口',a:{kind:'dungeon',dungeon:'region_2',map:'region_2_f1',x:17,y:1,facing:'south'},b:{kind:'town',location:'hikarigaeri_square'}});
}
export function returnCartSource(){
 const s=story(14,returnCartPlaces,[['cargo','cage'],['cargo','surface'],['cage','surface'],['surface','clinic'],['surface','home'],['clinic','home']]);
 s.entity('hodo','cargo','e2_return_cart_hodo').entity('patient','cargo','e2_return_cart_patient',{mobility:'patientMobility'}).entity('crew','cargo','e2_return_cart_crew').entity('clerk','clinic','e2_return_cart_clerk').entity('family','home','e2_return_cart_family').entity('form','party');
 s.enum('patientMobility','assisted',['assisted']);
 s.enum('workerAt','underfloor',['underfloor','stretcher','cage','surface','clinic','home']);
 s.enum('route','pending',['pending','haul','split','medical','register','quiet']);
 for(const k of ['opened','injuryKnown','treated','consent','registered','home','safeTransport','forcedHaul','secured','stretcherReady','onStretcher','inCage','surfaceReached','offloaded','clinicAccepted','explained','formFilled','familyArrived','equipmentRequested','returnConfirmed'])s.bool(k);
 s.fact('injury','脚を負傷した坑夫を仲間が貨車の床下に隠した。正規の搬送記録なしの早退で給金を減らされることを恐れた。');
 s.fact('claim','受診記録と鉱山への事故申請は別である。本人の同意を得て申告すると補償審査が始まるが、不利益を受けるおそれもある。');
 const route=k=>s.is('route',k);
 const all=['hodo','patient','crew'];
 s.node('entry','cargo',['hodo'],'空荷票の付いた貨車が、巻上げの途中で止まっている。ホドは運転綱を外した。「床下に何かある。俺は積んでいない」。床板は閉じたままで、人がいるかも分かっていない。',[
  O('unload','貨車を固定して床下を調べる準備をする','secured',[set('secured')]),
  O('haul','床下を開けず、増えた荷重のまま巻き上げる方針を選ぶ','haul_ready',[set('route','haul')])
 ]);
 s.node('secured','cargo',['hodo'],'貨車を固定した。まだ床板は閉じている。床下に何があるかを確かめる。',[O('open','床板を開き、床下を確かめる','injured',[set('opened'),set('injuryKnown'),see('injury','patient')])]);
 s.node('injured','cargo',all,'床下には脚を負傷した坑夫が、固定具もないまま横たわっていた。仲間は給金を守るため隠したと認める。「治療は受けたい。でも、事故を届けた奴の次の持ち場はどうなる」。ホドは人員籠と治療所への搬送を手配できると言った。',[
  O('split','鉱山への届出を見送り、安全な人員便で帰す準備をする','transport_ready',[set('route','split')]),
  O('medical','治療所へ先に運ぶ準備をする','transport_ready',[set('route','medical')])
 ]);
 s.node('transport_ready','cargo',all,'行き先を決めた。坑夫はまだ床下にいる。まず担架を整え、足を支えて移す。',[O('stretcher','担架を整えて受け入れる準備をする','stretcher_ready',[set('stretcherReady')])]);
 s.node('stretcher_ready','cargo',all,'担架を床下の脇へ置いた。まだ坑夫を降ろしていない。',[O('lift','脚を支えて床下から担架へ移す','stretcher_loaded',[set('onStretcher'),set('workerAt','stretcher')])]);
 s.node('stretcher_loaded','cargo',all,'坑夫を担架へ移した。貨車の床下は空になった。ホドを貨車の足場に残し、隊と仲間が人員籠へ運ぶ。',[O('cage','仲間と担架を運び、人員籠の乗り場へ向かう','cage_arrival')]);
 s.node('cage_arrival','cage',['patient','crew'],'人員籠の乗り場へ着いた。坑夫はまだ担架の上で、籠には乗せていない。',[O('board','貨車とは別の人員籠へ担架を載せる','cage_loaded',[set('inCage'),set('workerAt','cage')])]);
 s.node('cage_loaded','cage',['patient','crew'],'人員籠に担架を載せた。まだ地上には着いていない。仲間とともに人員便で昇降場を通り、地上の搬出口へ向かう。',[O('surface','人員便で地上の搬出口へ運ぶ','surface_arrival')]);
 s.node('surface_arrival','surface',['patient','crew'],'人員便が地上へ着いた。坑夫は籠に載せた担架の上にいる。ここで降ろしてから、行き先へ運ぶ。',[O('unload','地上で担架を降ろし、次の搬送に備える','surface_ready',[set('offloaded'),set('inCage',false),set('workerAt','surface')])]);
 s.node('surface_ready','surface',['patient','crew'],when(route('split'),'安全な人員便で地上へ運んだ。治療や事故の届出は行っていない。仲間と家まで担架を運ぶ。','地上で担架を降ろした。処置はまだ受けていない。治療所へ先に運び、受け入れを頼む。'),[
  O('home','仲間と坑夫の家まで担架を運ぶ','home_arrival',[],{when:route('split')}),
  O('clinic','仲間と治療所まで担架を運ぶ','clinic_arrival',[],{when:route('medical')})
 ]);
 s.node('clinic_arrival','clinic',['patient','crew','clerk'],'治療所へ着いた。到着しただけで処置が済んだわけではない。係員へ引き継ぎ、受診を頼む。',[O('admit','治療所へ坑夫を引き継ぎ、受診の記録を作る','clinic_accepted',[set('clinicAccepted'),set('workerAt','clinic')])]);
 s.node('clinic_accepted','clinic',['patient','crew','clerk'],'受診の記録を作り、坑夫を治療所へ引き継いだ。仲間は家へ連絡に戻る。脚の処置はこれからだ。',[O('treat','脚の処置を受け、治療所の処置記録を残す','treated',[set('treated'),move('crew','clinic','home')])]);
 s.node('treated','clinic',['patient','clerk'],'脚の処置は済んだ。治療所の受診・処置の記録は残る。鉱山への事故申請はまだ出していない。',[O('explain','補償審査の開始と不利益のおそれを本人へ説明する','clinic',[set('explained'),see('claim','clerk')])]);
 s.node('clinic','clinic',['patient','clerk'],'事故を届ければ補償審査が始まる一方、坑主との関係に不利益を招くおそれも説明した。係員は発生場所と時刻の欄を空け、坑夫本人の返事を待っている。',[
  O('register','本人の意思を確かめ、鉱山への届出の同意を得る','consented',[set('route','register'),set('consent')]),
  O('quiet','本人の意思を受け、鉱山への届出を見送る','quiet_ready',[set('route','quiet')])
 ]);
 s.node('consented','clinic',['patient','clerk'],'坑夫は届出に同意した。まだ申請は提出していない。本人の言葉で発生場所、時刻、負傷内容を記す。',[O('fill','本人と発生場所・時刻・負傷内容を申請書へ記す','form_ready',[set('formFilled')])]);
 s.node('form_ready','clinic',['patient','clerk'],'申請書に本人の申告を記した。書面はまだ隊の手元にあり、鉱山への登録は済んでいない。',[O('submit','本人と申請書を係員へ渡し、鉱山への負傷搬送を登録する','registered',[give('form','party','clerk'),set('registered')])]);
 s.node('registered','clinic',['patient','clerk'],'鉱山への負傷搬送を登録した。給金控除と補償の審査が始まる。支払いや坑主の処罰が決まったわけではない。家へ連絡した仲間から、家族が来るとの返事があった。',[O('family','治療所で家族の到着を待ち、看病を引き継ぐ','family_arrival',[move('family','home','clinic'),set('familyArrived')])]);
 s.node('family_arrival','clinic',['patient','clerk','family'],'家族が治療所へ着いた。坑夫は治療所に残り、家族が看病できる。ホドは貨車の足場にいる。隊が登録したことを伝えに戻る。',[O('hodo','坑夫を家族に託し、ホドのいる貨車の足場へ戻る','hodo_arrival')]);
 s.node('hodo_arrival','cargo',['hodo'],'ホドのいる貨車の足場へ戻った。負傷搬送を登録したことと、人員便の設備の不足を伝える。',[O('request','登録を報告し、ホドに手すりと固定帯の設備申請を出してもらう','equipment_requested',[set('equipmentRequested')])]);
 s.node('equipment_requested','cargo',['hodo'],'ホドは人員搬送用の籠へ手すりと固定帯を付ける申請を出した。取付けが済んだわけではない。治療所へ戻り、申請したことを本人へ伝える。',[O('return','治療所の坑夫と家族へ戻る','report_arrival')]);
 s.node('report_arrival','clinic',['patient','family'],'治療所へ戻った。坑夫は帰宅せず、家族の看病を受けている。補償は審査中、設備は申請した段階である。',[O('finish','設備申請を伝え、負傷搬送の登録と看病の引継ぎを確認する','@informed')]);
 s.node('quiet_ready','clinic',['patient','clerk'],'鉱山への届出を見送った。受診と処置の記録は消さない。坑夫を担架に乗せ、家へ運ぶ準備をする。',[O('prepare','処置を受けた坑夫を帰宅用の担架へ移す','quiet_loaded',[set('onStretcher')])]);
 s.node('quiet_loaded','clinic',['patient'],'処置の記録を残し、帰宅用の担架へ移した。まだ家には着いていない。',[O('home','処置を受けた坑夫を担架で家へ運ぶ','home_arrival')]);
 s.node('home_arrival','home',['patient'],when(s.is('treated'),'処置を受けた坑夫を家の戸口まで運んだ。鉱山への事故申請は行っていない。中で待つ仲間へ引き継ぐ。','仲間と坑夫を家の戸口まで運んだ。治療は受けず、事故の届出も行っていない。ここで家の中への引継ぎを確かめる。'),[O('confirm','仲間への引継ぎと坑夫の帰宅を確認する','home_confirmed',[set('workerAt','home'),set('home'),set('returnConfirmed')])]);
 s.node('home_confirmed','home',['patient','crew'],when(s.is('treated'),'坑夫の帰宅を確認した。治療所の処置記録は残り、鉱山への事故申請は出していない。','坑夫の帰宅を確認した。床下搬送はやめられたが、治療と事故の届出は行っていない。'),[O('finish','帰宅を見届けて終える','@compromise')]);
 s.node('haul_ready','cargo',['hodo'],'床下を開けず巻き上げる方針を選んだ。貨車はまだ停止位置にある。人員便へ積み替える作業はしていない。',[O('raise','床下を開けず貨物便を巻き上げ、地上の搬出口へ向かう','haul_surface')]);
 s.node('haul_surface','surface',[],'過荷重の貨車が地上へ着いた。床板は開けず、隊とホドは床下の人を確認していない。仲間たちは人目のない所へ貨車を寄せた。',[O('offload','荷場で待ち、仲間たちに荷下ろしを任せる','haul_offloaded',[set('offloaded'),set('workerAt','surface')])]);
 s.node('haul_offloaded','surface',[],'隊が荷場に残る間に、仲間たちは人目のない所で床下の負傷者を降ろした。正規の人員搬送や受診の記録は作っていない。仲間たちが家へ運び終えるまで待つ。',[O('wait','荷場に残り、仲間たちの帰宅の報告を待つ','haul_home',[{...move('crew patient','surface','home'),assistant:'crew'},set('workerAt','home'),set('home'),set('returnConfirmed')])]);
 s.node('haul_home','surface',[],'仲間たちから家へ着いたとの報告が来た。ホドの運行票には床下の人の記録が残らなかった。隊は床下を調べず、負傷の事情を確かめていない。',[O('finish','巻上げと仲間たちの報告を受けて終える','@contract')]);
 const journey=connectWorld(s,returnCartWorld,1);
 journey('stretcher_loaded_cage','cage',{companions:['patient','crew']});
 journey('cage_loaded_surface','surface',{companions:['patient','crew'],arrive:[set('surfaceReached'),set('safeTransport')]});
 journey('surface_ready_home','home',{companions:['patient','crew']});
 journey('surface_ready_clinic','clinic',{companions:['patient','crew']});
 journey('quiet_loaded_home','home',{companions:['patient']});
 journey('family_arrival_hodo','cargo');journey('equipment_requested_return','clinic');
 journey('haul_ready_raise','surface',{companions:['patient','crew'],arrive:[set('forcedHaul'),set('surfaceReached')]});
 s.story.endings={informed:and(s.is('treated'),s.is('consent'),s.is('registered'),s.is('familyArrived'),s.is('equipmentRequested'),s.is('workerAt','clinic'),s.is('partyAt','clinic')),compromise:and(s.is('safeTransport'),s.is('home'),s.is('returnConfirmed'),s.is('partyAt','home')),contract:and(s.is('forcedHaul'),s.is('home'),s.is('returnConfirmed'),s.is('partyAt','surface'))};
 s.invariant('discovery',or(not(s.is('injuryKnown')),and(s.is('opened'),s.is('secured'))),'床下を固定して開いてから負傷者を発見する');
 s.invariant('safe-transport',or(not(s.is('safeTransport')),and(s.is('injuryKnown'),s.is('stretcherReady'),s.is('surfaceReached'),not(s.is('forcedHaul')))),'別の人員籠で地上へ到着してから安全な搬送を確定する');
 s.invariant('treatment',or(not(s.is('treated')),and(s.is('safeTransport'),s.is('clinicAccepted'))),'地上から治療所へ搬送し、受診後に処置する');
 s.invariant('consent',or(not(s.is('consent')),and(s.is('treated'),s.is('explained'))),'処置と説明を経て本人の同意を得る');
 s.invariant('registration',or(not(s.is('registered')),and(s.is('consent'),s.is('formFilled'),s.is('formAt','clerk'),not(s.is('home')))),'本人と作った書面を提出して登録し、治療所に残る');
 s.invariant('family',or(not(s.is('familyArrived')),and(s.is('registered'),s.is('familyAt','clinic'))),'登録後に家族が治療所へ来る');
 s.invariant('equipment',or(not(s.is('equipmentRequested')),and(s.is('registered'),s.is('familyArrived'))),'登録後にホドへ報告し、設備の申請を行う');
 s.invariant('haul-unknown',or(not(route('haul')),and(not(s.is('opened')),not(s.is('injuryKnown')),not(s.is('treated')),not(s.is('safeTransport')))),'床下を開けない経路に発見や安全搬送を混ぜない');
 s.invariant('home',or(not(s.is('home')),and(s.is('patientAt','home'),s.is('workerAt','home'),s.is('returnConfirmed'),not(s.is('registered')))),'帰宅を確認して初めて完了する');
 s.invariant('fixed-people',and(s.is('hodoAt','cargo'),s.is('clerkAt','clinic')),'ホドは貨車、係員は治療所にいる');
 for(const scene of Object.values(s.story.scenes))for(const [i,c] of scene.cast.entries()){
  c.when=and(s.is(c.entity+'At',scene.place),c.entity==='patient'?s.is('injuryKnown'):true,c.entity==='family'?s.is('familyArrived'):true);
  c.display={x:scene.cast.length===3?[14,50,86][i]:scene.cast.length===2?[30,70][i]:50,y:10,scale:1,cardScale:1,layer:i};
 }
 return s.done();
}
export const returnCartCharacters=Object.fromEntries([['hodo','ホド','貨車の過荷重を確かめ、人員搬送を手配する'],['patient','負傷した坑夫','治療を受けたいが、不利益を恐れている'],['crew','同じ組の坑夫たち','負傷した仲間の帰宅と給金を守る'],['clerk','治療所の係員','受診記録と本人の同意に基づく事故申請を扱う'],['family','坑夫の家族','登録後に治療所を訪れ、看病する']].map(([key,name,goal])=>['e2_return_cart_'+key,{id:'e2_return_cart_'+key,name,goal,quests:['q014'],detail:'現行原稿の役割。外見は未設定。専用画像のない人物は名前で表示する。'}]));
