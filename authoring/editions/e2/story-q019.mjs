import {story, O, set, give, and, or, not, when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

const sites={
  scale:['廃坑の計量室',15,5], dry:['計量室北の乾燥室',15,3],
  store:['鉱袋の保管庫',13,5], archive:['保存試料と帳簿の記録室',14,1],
  pay:['坑夫の給金窓口',13,3]
};
const world=Object.fromEntries(Object.entries(sites).map(([key,[,x,y]])=>[key,{
  kind:'dungeon',dungeon:'region_2',map:'region_2_f2',x,y,event:'q019_mine_scale_'+key
}]));
const roles={
  ruchi:['ルチ','朝夕の重量差を追い、同じ荷を同じ条件で量れるようにする'],
  owner:['坑主','賃金と販売に使う計量時刻を決めてきた'],
  miners:['坑夫たち','販売に使った基準と自分たちの給金が合うか確かめる']
};
export const mineScaleCharacters=Object.fromEntries(Object.entries(roles).map(([key,[name,goal]])=>{
  const id='e2_mine_scale_'+key;
  return [id,{id,name,goal,quests:['q019'],detail:'塩哭きの廃坑の計量と給金をめぐって出会う人物。'}];
}));

export function mineScaleSource(){
  const s=story(19,Object.fromEntries(Object.entries(sites).map(([key,[name]])=>[key,name])),[]);
  s.entity('ruchi','scale','e2_mine_scale_ruchi').entity('owner','pay','e2_mine_scale_owner').entity('miners','pay','e2_mine_scale_miners');
  s.entity('control','scale').entity('stone','scale').entity('sample','scale').entity('archiveSample','archive');
  s.entity('ledger','archive').entity('comparison','archive').entity('refund','owner');
  s.entity('platform','scale').entity('spareScale','store').entity('oldScale','platform');
  s.entity('oreLot','scale').entity('rateNotice','pay');
  for(const k of ['scaleChecked','sampleOpen','driedToConstant','moistureKnown','recordsCompared','contractCompared','arrearsCalculated','partRefunded','dryBasis','averageAgreed','replaced','stoneChecked','sealedChecked','absorbed','sampleMatched','reweighed','newInquiry']) s.bool(k);
  s.bool('controlSealed',true);
  for(const k of ['wetReading','firstDryReading','secondDryReading','humidReading']) s.int(k,0,0,60,'同じ皿の風袋を引いた試料の目盛り');
  s.int('verifiedShortfall',0,0,10,'記録がそろった一荷の不足額（G）');
  s.int('paidToMiners',0,0,6,'坑主から坑夫への実際の返金額（G）');
  s.int('outstanding',0,0,10,'確認できた一荷の未精算額（G）');
  const withRuchi=['ruchi'],atDesk=['ruchi','owner','miners'];
  const room=(key,place,body,options)=>s.node(key,place,place==='pay'?atDesk:withRuchi,body,options);

  room('entry','scale','一つの鉱袋から朝と夕の荷札がぶら下がっている。重いのは夕方の札だ。ルチが古い秤の揺れる針を指した。「どっちを給金に書けばいい？　次の荷がもう来るよ」。分銅箱には重さの分かった石があり、隣には口を封じた対照袋が置いてある。',[
    O('dry','基準石を載せて、古い秤の目盛りを確かめる','stone',[set('stoneChecked')]),
    O('average','調査に入る前に、朝夕二回の平均を給金窓口へ提案する','average_terms'),
    O('replace','入荷を止めずに済むよう保管庫へ予備の秤を取りに行く','spare')
  ]);
  room('stone','scale','基準石を下ろしてもう一度載せる。針はどちらも石に刻まれた目盛りで止まり、下ろせば零に戻った。封じた袋には朝に量った値が残っている。',[
    O('control','封を調べ、同じ対照袋を量り直して朝の値と比べる','control',[set('sealedChecked'),set('scaleChecked')])
  ]);
  room('control','scale','封の糸も、対照袋の読みも朝のままだ。ルチが空の乾燥皿を秤に載せ、針を零に合わせた。調べる鉱石は隣の荷から取れる。',[
    O('portion','対照袋を残し、荷から別に取った試料を皿に広げて量る','fresh',[give('sample','scale','ruchi'),set('sampleOpen'),set('wetReading',60)])
  ]);
  room('fresh','scale','同じ皿を使う印にルチが縁を墨でなぞった。開いた試料は六十目。ルチがこぼれないよう皿を両手で持った。',[
    O('dryer','ルチと印の付いた皿を北の乾燥室へ運ぶ','drying')
  ]);
  room('drying','dry','棚に皿を置く。次の荷車が二度通る間、ルチは試料を入れ替えずに待った。',[
    O('weigh','乾燥させた同じ皿を計量室へ戻す','first_weigh')
  ]);
  room('first_weigh','scale','ルチが皿の印を確かめ、最初と同じ秤に載せた。六十目を指していた針は五十目で止まった。もう一度乾かしても同じだろうか。',[
    O('again','五十目を記録し、同じ試料を乾燥室へ戻す','redrying')
  ]);
  room('redrying','dry','同じ棚でさらに一番の間乾かす。皿に付いた墨の印と試料はそのままだ。',[
    O('return','次の読みに備え、試料を計量室へ持ち帰る','second_weigh')
  ]);
  room('second_weigh','scale','空皿の分を差し引き、同じ秤でもう一度読む。針はまた五十目で止まった。ルチが一回目の五十の隣に、二回目の読みを書く場所を空けた。',[
    O('confirm','二回目の五十目を記録し、乾燥前との差十目を確かめる','constant',[set('secondDryReading',50),set('driedToConstant')])
  ]);
  room('constant','scale','乾かしても減らなくなった。ルチは夕方の札を裏返した。荷が売られるまでに通る、湿っぽい保管庫の印がある。',[
    O('store','同じ開放試料を湿った保管庫へ運ぶ','humid_store')
  ]);
  room('humid_store','store','夕方の荷が出るまで、開いた皿を鉱袋の隣に置いた。ルチが棚から下ろすと、石粒の表面に薄い光沢が出ていた。',[
    O('weigh','こぼさずに計量室へ戻し、同じ皿で再計量する','humid_weigh')
  ]);
  room('humid_weigh','scale','読みは五十五目に増えた。ルチが封じた対照袋を載せ直すと、そちらは朝と同じだ。「水気が出入りしたんだ。給金のほうは何を基準に約束したんだろう」。',[
    O('record','乾燥前・乾燥後・保管後の読みを記録する','findings',[set('humidReading',55),set('absorbed'),set('moistureKnown'),give('sample','ruchi','scale')])
  ]);
  room('findings','scale','同じ鉱石でも置き場所と時間で目方が変わる。朝の荷札と夕の荷札だけでは、どれだけ払う約束だったかは分からない。',[
    O('books','当時の保存試料、時刻札、契約と台帳を記録室で調べる','archive'),
    O('average','過去の精算には進まず、今後の朝夕二回計量を提案する','average_terms')
  ]);
  room('archive','archive','引き出しに荷印付きの保存試料が残っていた。ルチが同じ荷印の乾燥票、保管庫の出庫票、給金台帳を並べる。他の日の棚には票の抜けた所がある。',[
    O('match','保存試料の荷印を乾燥試験票と朝夕の時刻札に照合する','matched',[set('sampleMatched'),set('recordsCompared')])
  ]);
  room('matched','archive','記録のそろった一荷は乾燥重量十斤。朝の給金票は十斤、湿った庫を出た夕方の売り札は十二斤。同じ荷の保存試料で、夕方の十二斤が乾燥十斤に当たる記録も確かめられた。',[
    O('contract','当時の契約の単価・換算条件と、実際の支払欄を突き合わせる','terms',[set('contractCompared')])
  ]);
  room('terms','archive','契約は売り札と同じ基準で一斤五G。売った十二斤なら六十Gのところ、給金は朝の十斤をそのまま使って五十Gだった。ほかの荷には換算に必要な票が足りない。',[
    O('compute','確認できた一荷に限り、六十Gと支払済み五十Gの差を表にする','calculated',[set('arrearsCalculated'),set('verifiedShortfall',10),set('outstanding',10),give('comparison','archive','ruchi')])
  ]);
  room('calculated','archive','ルチの手に十Gの差額表がある。誰もまだその金を受け取っていない。元の台帳と保存試料は引き出しに戻した。',[
    O('settle','差額表を給金窓口へ持っていき、坑夫と坑主に精算を求める','claim'),
    O('limit','算定表を保管し、過去の差額を請求せず今後の平均計量だけを提案する','average_terms')
  ]);
  room('claim','pay','坑主と坑夫たちが同じ行を読む。「今日は六Gまでなら渡せる」と坑主が袋を卓に置いた。坑夫は十Gの表と袋を交互に見た。',[
    O('enter','確認額十Gを支払帳に記載し、差額表を窓口に預ける','due',[give('comparison','ruchi','pay')])
  ]);
  room('due','pay','帳面の不足欄は十G、受取欄は空白だ。坑主が自分の袋を開け、坑夫の前に六枚を数えた。',[
    O('refund','坑主から坑夫へ六Gが渡るのを見届け、未精算の四Gを記す','paid',[give('refund','owner','miners'),set('paidToMiners',6),set('outstanding',4),set('partRefunded')])
  ]);
  room('paid','pay','坑夫が六枚を数えて受取欄に印を付けた。四Gは次の欄に残る。「次からは同じ荷を二通りに数えさせないでくれ」。坑主が新しい単価票を開いた。',[
    O('basis','賃金と販売を同じ乾燥重量で計算し、乾燥一斤六Gとする合意を記録する','dry_terms',[set('dryBasis')])
  ]);
  room('dry_terms','pay','坑夫と坑主が同じ単価票に署名した。ルチが計量室へ持ち帰り、秤の横に試料用の皿を据えることになった。',[
    O('return','ルチと計量室へ戻り、単価票と乾燥皿を秤の横に置く','posted')
  ]);
  room('posted','scale','秤の横に、試料を取り分ける皿と乾燥一斤六Gの票が並んだ。記録室のそろわない期間は、未調査のまま綴じてある。',[
    O('finish','返金済みの六G、残額四G、今後の単価を記録して終える','@informed')
  ]);
  room('average_terms','pay',when(s.is('arrearsCalculated'),'ルチは差額表を記録室に残した。「過去の返金は今回の契約には入れない」。坑夫が空白の受取欄を確かめた。',when(s.is('moistureKnown'),'ルチは乾かした試料の値を伝えた。「過去の契約の照合はこれからだ。今後の荷だけ決めよう」。','二枚の荷札を見た坑夫は「朝だけを選べるのは困る」と言った。原因の調査も過去の精算も始まっていない。')),[
    O('sign','同じ荷を朝夕二度量り、平均を今後の給金と販売の両方に使う契約を結ぶ','average_signed',[set('averageAgreed')])
  ]);
  room('average_signed','pay','坑主と坑夫の手元に同じ約定が残った。荷札には二行の目方と平均を書く。坑夫は夕方にも列へ戻ることになった。',[
    O('finish','双方が取り決めを受け取ったことを確認する','@compromise')
  ]);
  room('spare','store','棚に新品の秤が箱のまま置かれている。ルチは「これなら次の荷に間に合う」と運び出すために箱を開けた。',[
    O('carry','予備の秤を預かり、計量室へ運ぶ','install')
  ]);
  room('install','scale','古い秤はまだ台の上にある。ルチは運んできた新品の留め具をほどいた。',[
    O('swap','古い秤を台から下ろし、新品を据え付ける','replacement',[give('oldScale','platform','scale'),give('spareScale','ruchi','platform'),set('replaced')])
  ]);
  room('replacement','scale','ルチが新品で朝の荷を量り、荷印と読みを札に記した。同じ鉱袋をふだんどおり保管庫へ運ぶ。',[
    O('follow','荷印の付いた袋をルチと保管庫まで運び、夕方の出庫を待つ','evening')
  ]);
  room('evening','store','出庫の鐘が鳴った。ルチが同じ荷印と結び目を確かめる。朝の札がまだひもに付いている。',[
    O('return','同じ袋を計量室に持ち帰り、新品の秤に掛ける','changed')
  ]);
  room('changed','scale','新品でも朝の札より重い。「秤は替えたのに」とルチは二つの値を書き取り、もう一枚、調査票を出した。',[
    O('finish','朝夕の値とルチの再調査依頼を受け取る','@contract',[set('newInquiry')])
  ]);

  const journey=connectWorld(s,world,1);
  function travel(action,to,extra={}){journey(action,to,{companions:withRuchi,...extra});}
  travel('entry_average','pay');travel('entry_replace','store');
  const deposit=site=>[give('sample','ruchi',site)],collect=site=>[give('sample',site,'ruchi')];
  travel('fresh_dryer','dry',{arrive:deposit('dry')});travel('drying_weigh','scale',{depart:collect('dry')});
  travel('first_weigh_again','dry',{depart:[set('firstDryReading',50)],arrive:deposit('dry')});
  travel('redrying_return','scale',{depart:collect('dry')});
  travel('constant_store','store',{arrive:deposit('store')});travel('humid_store_weigh','scale',{depart:collect('store')});
  travel('findings_books','archive');travel('findings_average','pay');
  travel('calculated_settle','pay');travel('calculated_limit','pay',{depart:[give('comparison','ruchi','archive')]});
  travel('dry_terms_return','scale',{depart:[give('rateNotice','pay','ruchi')],arrive:[give('rateNotice','ruchi','scale')]});
  travel('spare_carry','scale',{depart:[give('spareScale','store','ruchi')]});
  travel('replacement_follow','store',{depart:[give('oreLot','scale','ruchi')],arrive:[give('oreLot','ruchi','store')]});
  travel('evening_return','scale',{depart:[give('oreLot','store','ruchi')],arrive:[give('oreLot','ruchi','scale'),set('reweighed')]});

  const calculated=and(s.is('recordsCompared'),s.is('contractCompared'),s.is('verifiedShortfall',10));
  s.story.endings={
    informed:and(s.is('partRefunded'),s.is('dryBasis'),s.is('outstanding',4),s.is('sampleAt','scale'),s.is('rateNoticeAt','scale')),
    compromise:and(s.is('averageAgreed'),not(s.is('partRefunded')),s.is('paidToMiners',0)),
    contract:and(s.is('replaced'),s.is('reweighed'),s.is('newInquiry'),not(s.is('scaleChecked')))
  };
  const implies=(key,condition,message)=>s.invariant(key,or(not(s.is(key)),condition),message);
  s.invariant('originals',and(s.is('controlSealed'),s.is('controlAt','scale'),s.is('archiveSampleAt','archive'),s.is('ledgerAt','archive')),'封をした対照袋と記録室の保存試料・台帳をそれぞれ保持する');
  implies('replaced',and(s.is('oldScaleAt','scale'),s.is('spareScaleAt','platform')),'新品の秤を計量台に据える');
  implies('scaleChecked',and(s.is('stoneChecked'),s.is('sealedChecked')),'基準石と密封した対照袋の値を確かめる');
  implies('driedToConstant',and(s.is('sampleOpen'),s.is('wetReading',60),s.is('firstDryReading',50),s.is('secondDryReading',50)),'同じ試料を続けて乾燥・計量して恒量を確かめる');
  implies('moistureKnown',and(s.is('driedToConstant'),s.is('absorbed'),s.is('humidReading',55)),'乾燥後の同じ試料が湿った庫で再び重くなる');
  implies('arrearsCalculated',and(s.is('moistureKnown'),s.is('sampleMatched'),calculated),'当時の契約・保存試料と計量記録のそろった一荷だけを算定する');
  implies('partRefunded',and(s.is('arrearsCalculated'),s.is('refundAt','miners'),s.is('paidToMiners',6),s.is('outstanding',4)),'実際に坑夫が受け取った金を確認額から一度だけ差し引く');
  implies('dryBasis',and(s.is('partRefunded'),not(s.is('averageAgreed'))),'一部返金を見届け、将来の単価を別に合意する');
  for(const scene of Object.values(s.story.scenes))scene.cast.forEach((cast,i)=>{
    cast.when=s.is(cast.entity+'At',scene.place);
    cast.display={x:scene.cast.length===3?[16,50,84][i]:50,y:10,scale:1,cardScale:1,layer:i};
  });
  return s.done();
}
