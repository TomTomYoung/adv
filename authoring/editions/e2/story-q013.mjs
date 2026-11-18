import {story,O,set,give,see,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';
export const breathingVeinPlaces={face:'膨らむ切羽',outside:'膨張範囲の外の足場',lake:'根が通る地下湖岸',station:'観測記録の引継ぎ所'};
const point=(key,x,y)=>({kind:'dungeon',dungeon:'region_2',map:'region_2_f1',x,y,event:'q013_breathing_vein_'+key});
export const breathingVeinWorld={face:point('face',15,5),outside:point('outside',16,5),lake:point('lake',12,3),station:point('station',13,3)};
export function breathingVeinSource(){
 const s=story(13,breathingVeinPlaces,[['face','outside'],['face','lake'],['outside','lake'],['outside','station'],['station','face']]);
 s.entity('sei','face','e2_breathing_vein_sei').entity('expert','station','e2_breathing_vein_expert').entity('root','face').entity('lakeWater','lake').entity('notes','party');
 for(const key of ['rootKnown','waterRouteKnown','rangeMeasured','rootCut','miningStopped','detourMarked','monitoring','surfaceOpened','cycleRecorded','levelRecorded','rootRangeMeasured','bankMeasured','outsideChecked','markerPlaced','notesDelivered','stopReported','traceReported','cutAgreed','cutWindowReady','saltTaken'])s.bool(key);
 s.enum('route','pending',['pending','sample','stop','trace','cut']);
 s.story.registry.rangeMeasured.meaning='迂回案で根の膨張範囲と湖岸の地盤を計測した。停止案の外からの確認はoutsideCheckedで区別する';
 s.story.registry.detourMarked.meaning='根と弱い湖岸を避ける迂回坑の線を引いた。通路の掘削や恒久的な安全の完成ではない';
 s.fact('root','塩層の内側で生きた太根が吸水して膨らんでいる。動くのは鉱石ではない。');
 s.fact('waterRoute','太根は地下湖から地上の巨木へ水を運ぶ複数の経路の一本である。');
 s.fact('ground','根の膨張範囲の外にも、地下湖岸には崩れやすい地盤がある。');
 const isTrace=s.is('route','trace'),isStop=s.is('route','stop');
 s.node('entry','face',['sei'],'塩層がゆっくり張り出し、しばらくすると緩む。小石が切羽の下へ落ちた。セイは採掘を止めている。「薄く剥がして中を見るか、ここを止めるか」。膨張範囲の外には、調査標を置ける足場があった。',[
  O('sample','表面を薄く削り、塩層の内側を調べる準備をする','sample_ready',[set('route','sample')]),
  O('stop','正体の調査を見送り、採掘停止のための記録を残す','stop_ready',[set('route','stop')]),
  O('cut','塩層を開き、採掘を続ける方法を確かめる','cut_ready',[set('route','cut')])
 ]);
 s.node('sample_ready','face',['sei'],'塩の表面だけを薄く剥がす。奥まで刃を入れず、内側の動きを確かめる。',[
  O('peel','表面を薄く削り、湿った太根を確かめる','root_exposed',[set('surfaceOpened'),set('rootKnown'),see('root','root')])
 ]);
 s.node('root_exposed','face',['sei'],'薄く削った塩の下に、生きた太根が現れた。水を吸うたびに膨らみ、塩層を押している。水がどこから来てどこへ向かうかは、まだ確かめていない。',[
  O('cycle','根の吸水と膨張の周期を記録する','sample_cycle',[set('cycleRecorded')])
 ]);
 s.node('sample_cycle','face',['sei'],'膨張と収縮の周期を記録した。セイは切羽で待つ。根に沿って湖岸へ進み、水の動きを確かめる。',[
  O('lake','観測記録を持って地下湖岸へ向かう','sample_lake')
 ]);
 s.node('sample_lake','lake',[],'太根が水辺を通っている。到着しただけでは水の行先は分からない。湖と根の接するところから、上へ続く根筋をたどる。',[
  O('trace_water','湖から吸い上げられる水と、地上へ続く根筋を確かめる','water_known',[set('waterRouteKnown'),set('levelRecorded'),see('waterRoute','lakeWater'),see('ground','lakeWater')])
 ]);
 s.node('water_known','lake',[],'根は地下湖から地上の巨木へ続いていた。ほかにも水を運ぶ太根がある。根の外側には崩れやすい湖岸もある。観測したことを切羽へ持ち帰る。',[
  O('return','水の経路の記録を持ってセイのいる切羽へ戻る','root')
 ]);
 s.node('root','face',['sei'],'根と水の経路をセイへ伝えた。セイは析出した塩を手で量った。「これを避ける分、採れる量は減る」。根の外側にも、崩れやすい湖岸があった。迂回線を引くには両方を測る必要がある。',[
  O('trace','根と湖岸を避ける迂回線の計測を準備する','trace_ready',[set('route','trace')]),
  O('stop','調べたことを残し、採掘停止の手続きへ進む','stop_ready',[set('route','stop')])
 ]);
 s.node('trace_ready','face',['sei'],'まず膨張範囲の外へ出て、根が押し出す範囲を測る。湖岸の地盤は別に確かめる。',[
  O('outside','計測のため、膨張範囲の外の足場へ向かう','outside_arrival')
 ]);
 s.node('stop_ready','face',['sei'],when(s.is('rootKnown'),'根と水の経路の記録は残っている。採掘を止める届出はまだ出していない。外から観測できる場所を確かめる。','塩層の内側は調べていない。正体を断定せず、外から膨張の範囲と周期を記録する。採掘停止の届出はこれからだ。'),[
  O('outside','膨張範囲の外の足場へ向かう','outside_arrival')
 ]);
 s.node('outside_arrival','outside',[],when(isTrace,'膨張範囲の外の足場へ着いた。周期の記録と照らし合わせ、根が押し出す範囲を測る。','膨張範囲の外の足場へ着いた。内側へ入らず、張り出しの端と周期を確かめる。'),[
  O('measure','根が膨らむ範囲を測り、観測記録へ記す','outside_measured',[set('rootRangeMeasured'),set('cycleRecorded')],{when:isTrace}),
  O('check','外から張り出しの範囲と周期を記録する','outside_measured',[set('outsideChecked'),set('cycleRecorded')],{when:isStop})
 ]);
 s.node('outside_measured','outside',[],'足場から確かめた範囲と周期を書き留めた。次に湖岸で水位を記録する。迂回案では、湖岸の弱い地盤も測る。',[
  O('lake','観測記録を持って湖岸へ向かう','lake_arrival')
 ]);
 s.node('lake_arrival','lake',[],when(isTrace,'湖岸へ着いた。根の膨張範囲を避けるだけでは、この岸の崩れやすさを見落とす。',when(s.is('rootKnown'),'湖岸へ戻った。ここでは水位を記録し、先に調べた根と水の経路の記録へ添える。','湖岸へ着いた。岸から水位を記録する。塩層の内側を調べる作業はしていない。')),[
  O('measure_bank','湖面と岸の地盤を測り、避ける範囲を記す','lake_measured',[set('bankMeasured'),set('levelRecorded'),set('rangeMeasured')],{when:isTrace}),
  O('record_level','湖面の位置を観測記録へ記す','lake_measured',[set('levelRecorded')],{when:isStop})
 ]);
 s.node('lake_measured','lake',[],when(isTrace,'根と湖岸、両方の計測がそろった。まだ迂回線は引いていない。足場へ戻り、記録に沿って線を引く。','周期と湖面の記録がそろった。調査標はまだ置いていない。膨張範囲の外へ戻る。'),[
  O('outside','観測記録を持って外側の足場へ戻る','outside_return')
 ]);
 s.node('outside_return','outside',[],when(isTrace,'足場へ戻った。根の膨張範囲と湖岸の弱い地盤を、両方避ける線を地面へ記す。','足場へ戻った。張り出しの届かない観測位置へ調査標を置く。'),[
  O('line','根と弱い湖岸を避けて迂回坑の線を引く','line_done',[set('detourMarked')],{when:isTrace}),
  O('mark','膨張範囲の外へ調査標を置く','monitor_done',[set('markerPlaced'),set('monitoring')],{when:isStop})
 ]);
 s.node('line_done','outside',[],'迂回坑の線を引いた。坑道を掘り終えたわけではない。周期を記録する位置も、膨張範囲の外へ残す。',[
  O('mark','膨張範囲の外へ観測位置の標を置く','monitor_done',[set('markerPlaced'),set('monitoring')])
 ]);
 s.node('monitor_done','outside',[],'外側に観測の標を置いた。記録はまだ隊が持っている。専門家へ現物を引き渡し、観測を引き継ぐ。',[
  O('station','観測記録を持って引継ぎ所へ向かう','station_arrival')
 ]);
 s.node('station_arrival','station',['expert'],when(s.is('rootKnown'),'専門家のいる引継ぎ所へ着いた。根と水の経路、周期と湖面の記録を手元にそろえる。','専門家のいる引継ぎ所へ着いた。正体を断定していないことを添え、外からの周期と湖面の記録をそろえる。'),[
  O('handover','観測記録の現物を専門家へ渡す','notes_delivered',[give('notes','party','expert'),set('notesDelivered')])
 ]);
 s.node('notes_delivered','station',['expert'],'専門家が観測記録を受け取った。隊は記録を手放した。切羽のセイへ戻り、採掘の扱いを届ける。',[
  O('return','セイのいる切羽へ戻る','report_arrival')
 ]);
 s.node('report_arrival','face',['sei'],when(isTrace,'セイのいる切羽へ戻った。迂回線と観測位置、記録の引継ぎを報告する。','セイのいる切羽へ戻った。観測の引継ぎは済んだが、採掘停止の届出はまだだ。'),[
  O('trace_report','迂回線と観測位置、記録の引継ぎをセイへ報告する','trace_reported',[set('traceReported')],{when:isTrace}),
  O('report','観測の引継ぎを伝え、採掘停止を届け出る','stop_reported',[set('miningStopped'),set('stopReported')],{when:isStop})
 ]);
 s.node('trace_reported','face',['sei'],'セイは採れる塩が減ることに顔をしかめた。根を切らず、膨張範囲と弱い岸を避ける線を残した。これから掘る坑道の完成を報告したのではない。',[
  O('finish','迂回線と観測の引継ぎを確認して終える','@informed')
 ]);
 s.node('stop_reported','face',['sei'],when(s.is('rootKnown'),'採掘停止を届け出た。根を確認した情報も専門家の手元にある。根を切るか残すか、迂回坑を掘るかは決めていない。','採掘停止を届け出た。塩層の正体は未確認のまま、外からの記録を専門家へ渡した。塩層の内側と水の経路は未確認のままだ。'),[
  O('finish','採掘停止と観測の引継ぎを確認して終える','@compromise')
 ]);
 s.node('cut_ready','face',['sei'],'塩層の内側を開く準備をした。切るものの正体はまだ分からない。',[
  O('open','塩層を開いて内側の太根を確かめる','cut_root',[set('surfaceOpened'),set('rootKnown'),see('root','root')])
 ]);
 s.node('cut_root','face',['sei'],'湿った太根が現れた。セイは周囲に析出した良質な塩を指した。「こいつを切れば、ここを採れる」。湖から地上への水の経路は調べていない。',[
  O('agree','セイの求める根の切断に応じる','cut_agreed',[set('cutAgreed')])
 ]);
 s.node('cut_agreed','face',['sei'],'切断する方針を決めたが、根はまだ切っていない。いったん張り出しの外へ退き、緩む様子を確かめる。',[
  O('outside','切断の前に膨張範囲の外へ退く','cut_outside')
 ]);
 s.node('cut_outside','outside',[],'外側の足場へ退いた。次に塩層が緩む様子を見てから切羽へ戻る。',[
  O('wait','塩層が緩むところを確かめる','cut_window',[set('cutWindowReady')])
 ]);
 s.node('cut_window','outside',[],'塩層が緩んだ。切断作業へ戻る。水の経路や湖岸の計測はしていない。',[
  O('return','根を切るため切羽へ戻る','cut_arrival')
 ]);
 s.node('cut_arrival','face',['sei'],'切羽へ戻った。根はまだつながっている。ここで切断を実行する。',[
  O('sever','露出した太根を切断する','cut_done',[set('rootCut')])
 ]);
 s.node('cut_done','face',['sei'],'根を切り、塩層の膨張は止まった。セイが求めた塩はまだ採っていない。',[
  O('take_salt','根の周囲に析出した良質な塩を採る','salt_taken',[set('saltTaken')])
 ]);
 s.node('salt_taken','face',['sei'],'根の周囲から塩を採った。切断した根は元へ戻らない。作業を終えて外側の足場へ退く。',[
  O('outside','採掘を終えて外側の足場へ退く','cut_report')
 ]);
 s.node('cut_report','outside',[],'切断と採塩を終えた。湖への影響は、その場ですべて分かるものではない。後日の観測では湖面が徐々に上がることになる。',[
  O('finish','切断と採塩の結果を確認して終える','@contract')
 ]);
 const route=connectWorld(s,breathingVeinWorld,1);
 for(const [id,to] of [['sample_cycle_lake','lake'],['water_known_return','face'],['trace_ready_outside','outside'],['stop_ready_outside','outside'],['outside_measured_lake','lake'],['lake_measured_outside','outside'],['monitor_done_station','station'],['notes_delivered_return','face'],['cut_agreed_outside','outside'],['cut_window_return','face'],['salt_taken_outside','outside']])route(id,to);
 const delivered=and(s.is('notesDelivered'),s.is('notesAt','expert'),s.is('monitoring'),s.is('partyAt','face'));
 s.story.endings={informed:and(delivered,isTrace,s.is('rootKnown'),s.is('waterRouteKnown'),s.is('rangeMeasured'),s.is('detourMarked'),s.is('traceReported')),compromise:and(delivered,isStop,s.is('miningStopped'),s.is('stopReported')),contract:and(s.is('partyAt','outside'),s.is('rootCut'),s.is('saltTaken'))};
 s.invariant('fixed-people',and(s.is('seiAt','face'),s.is('expertAt','station')),'セイは切羽、専門家は引継ぎ所で待つ');
 s.invariant('water-route',or(not(s.is('waterRouteKnown')),and(s.is('rootKnown'),s.is('cycleRecorded'))),'根の発見と周期の観察後に水の経路を調べる');
 s.invariant('measured',or(not(s.is('rangeMeasured')),and(isTrace,s.is('rootRangeMeasured'),s.is('bankMeasured'))),'根と湖岸の両方を測ってから迂回の計測を完了する');
 s.invariant('line',or(not(s.is('detourMarked')),and(s.is('rangeMeasured'),not(s.is('rootCut')))),'迂回線は根と湖岸の計測後に引き、根を切らない');
 s.invariant('monitor',or(not(s.is('monitoring')),and(s.is('markerPlaced'),s.is('cycleRecorded'),s.is('levelRecorded'))),'周期と湖面の記録を残し、外側へ観測標を置く');
 s.invariant('notes',or(not(s.is('notesDelivered')),and(s.is('notesAt','expert'),s.is('monitoring'))),'記録を渡してから専門家への引継ぎを完了する');
 s.invariant('stop',or(not(s.is('miningStopped')),and(isStop,s.is('notesDelivered'),s.is('stopReported'),not(s.is('detourMarked')),not(s.is('rootCut')))),'停止は記録の引継ぎと届出を経て確定する');
 s.invariant('cut',or(not(s.is('rootCut')),and(s.is('rootKnown'),s.is('cutAgreed'),s.is('cutWindowReady'),s.is('route','cut'),not(s.is('waterRouteKnown')))),'根を確認して切断に応じ、現場で切る。水路の調査は混ぜない');
 s.invariant('salt',or(not(s.is('saltTaken')),s.is('rootCut')),'根を切ってから周囲の塩を採る');
 for(const scene of Object.values(s.story.scenes))for(const c of scene.cast){c.when=s.is(c.entity+'At',scene.place);c.display={x:50,y:10,scale:1,cardScale:1,layer:0};}
 return s.done();
}
export const breathingVeinCharacters=Object.fromEntries([['sei','セイ','塩を採る利益と、膨張に対する作業方針を決める'],['expert','観測を引き継ぐ専門家','周期と湖面の記録を受け取り、調査を引き継ぐ']].map(([key,name,goal])=>['e2_breathing_vein_'+key,{id:'e2_breathing_vein_'+key,name,goal,quests:['q013'],detail:'現行原稿の役割。外見は未設定。専用画像のない人物は名前で表示する。'}]));
