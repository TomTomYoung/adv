import {set,give,move,ref,eq,and,not} from '../../../story-kit.mjs';

export function chapelSecondSource(q){
 const x={nodes:structuredClone(q.model.graph),places:{},flags:{},registry:{},entities:{}};
 const node=id=>x.nodes.find(n=>n.id===id),choice=(id,key)=>node(id).options.find(a=>a.id===key);
 const cell=(key,name,map,xp,yp)=>x.places[key]={name,world:{kind:'dungeon',dungeon:map.startsWith('region_4')?'region_4':map==='e2_sunken_inn'?'pilgrim_sunken_inn':'pilgrim_sites',map,x:xp,y:yp}};
 const town=(key,name,location)=>x.places[key]={name,world:{kind:'town',location}};
 const entity=(id,holder,kind='item')=>x.entities[id]={holder,kind};
 const add=(id,place,text,options)=>{const n={id,place,text,options};x.nodes.push(n);return n;};
 const opt=(id,text,to,extra={})=>({id,text,to,...extra});
 const route=(from,key,to,extra={})=>Object.assign(choice(from,key),{to,...extra});
 const end=(id,place,text,outcome,effects=[])=>add(id,place,text,[opt('finish','現場の結果を確かめ、依頼を終える','@'+outcome,{effects})]);
 const held=(id,at)=>eq(ref(`stories.${q.id}.values.${id}At`),at);
 const transfer=(id,from,to)=>({...give(id,from,to),when:held(id,from)});
 const p=q.locations.find(p=>p.role==='decision');cell('entry',q.title+'の現場',p.map,p.x,p.y);
 for(const n of x.nodes)n.place='entry';
 if(q.number===131){
  cell('entry','砂の回廊の釘の目印','e2_sand_gallery',3,1);cell('room','砂の回廊の避難室','e2_sand_gallery',11,7);cell('lost','回廊の入口へ戻る足跡','e2_sand_gallery',1,1);town('report','シェルの帰還報告','pilgrim_union');
  node('room').place='room';node('lost').place='lost';node('credit').place='report';entity('teacher','room','person');entity('sample','room');entity('sher','entry','person');entity('porter','entry','person');
  for(const [n,k] of [['entry','test'],['entry','tracks'],['lost','test']])choice(n,k).companions=['sher','porter'];
  route('room','person','person_home',{companions:['teacher','sher','porter']});end('person_home','report','師を組合の帰還受付へ引き渡した。標本は避難室に残り、その位置を記録する。','person');
  route('room','sample','sample_home',{companions:['sher','porter'],depart:[give('sample','room','party')],effects:[give('sample','party','report')]});end('sample_home','report','標本を受付へ置き、師の避難室と通った道を救助班へ伝えた。師を救出済みにはしない。','sample');
  Object.assign(choice('room','both'),{companions:['teacher','sher','porter'],depart:[give('sample','room','party')],effects:[give('sample','party','report')]});
 }
 if(q.number===132){
  cell('station','宝箱の外の詰所記録','region_4_f1',7,3);cell('seal','宝箱から隔てた囮と封鎖口','region_4_f1',7,1);node('test').place='station';node('isolate').place='seal';entity('box','entry');entity('decoy','station');
  Object.assign(choice('test','decoy'),{depart:[give('decoy','station','party')],effects:[give('decoy','party','seal')]});
  for(const from of ['test','isolate']){route(from,'destroy','fight');delete choice(from,'destroy').combat;}
  add('fight','entry','宝箱の前へ戻った。詰所の人を安全な側へ退かせてから討伐する。',[opt('destroy','宝箱と戦う','@destroy',{combat:'story_132',escape:'entry'})]);
  x.flags.signal=false;x.flags.sealed=false;choice('isolate','seal').effects=[set('sealed')];
 }
 if(q.number===133){
  cell('platform','棺を載せる荷台','region_4_f1',7,3);node('platform').place='platform';x.flags.weightChecked=false;x.flags.fixed=false;
  choice('entry','weight').effects=[set('weightChecked')];choice('entry','fix').effects=[set('fixed')];
  route('platform','save','drawing');end('drawing','entry','階段の上へ戻り、図面へ実測した重量条件を記した。参拝者にも読める位置へ掲げる。','save');
  route('platform','stairs','stairs');end('stairs','entry','荷台の構造を記録し、石工と通常の参拝階段への改修を終えた。','stairs');
 }
 if(q.number===134){
  cell('keeper','庫番の返却受付','region_4_f1',9,5);cell('vault','宝物庫の内側','region_4_f1',11,5);town('master','剣の持主の家','pilgrim_master');town('owner','預かり物の持主宅','pilgrim_parcel_owner');
  node('return').place='keeper';entity('zag','entry','person');entity('master','master','person');entity('owner','owner','person');entity('sword','zag');entity('practice','master');entity('parcel','keeper');entity('receipt','owner');
  choice('entry','rule').companions=['zag'];route('entry','break','broken');end('broken','vault','番人を退けた穴から庫へ入った。品々の名札にある持主は変わっていない。','break');
  route('return','sword','sword_home',{companions:['zag'],effects:[give('sword','zag','master'),give('practice','master','zag')]});end('sword_home','master','ザグが師へ剣を返し、別の練習剣を受け取るところを見届けた。','sword');
  route('return','parcel','delivered',{depart:[give('parcel','keeper','party')],effects:[give('parcel','party','owner'),give('receipt','owner','party')]});
  add('delivered','owner','持主が品を受け取り、受領証を渡した。これを庫番へ持ち帰る。',[opt('back','受領証を庫番へ届ける','receipt',{effects:[give('receipt','party','keeper')]})]);
  add('receipt','keeper','庫番は受領証と名簿を照合し、庫の内側を指した。',[opt('enter','正式な受領者として庫へ入る','parcel_end')]);end('parcel_end','vault','庫番と持主のない品を確かめて受け取った。','parcel');
 }
 if(q.number===135){
  cell('entry','沈んだ宿の食堂','e2_sunken_inn',11,5);cell('shore','宿へ潜る地上の足場','e2_sunken_inn',1,1);town('workshop','地上の人形工房','pilgrim_workshop');town('union','魔石の受取窓口','pilgrim_union');
  entity('doll','entry');entity('stone','entry');entity('ane','entry','person');
  for(const from of ['entry','reply'])route(from,'lift','surfaced',{companions:['ane'],depart:[give('doll','entry','party')]});
  add('surfaced','shore','人形とアネが地上の足場へ上がった。空気を補充し、工房へ運ぶ準備を整える。',[opt('workshop','アネと人形を工房へ運ぶ','retrained',{companions:['ane'],effects:[give('doll','party','workshop')]})]);end('retrained','workshop','職人の前へ人形を据え、新しい宿の仕事を一つずつ教えた。','lift');
  route('entry','break','stone_report',{depart:[give('stone','entry','party')]});end('stone_report','union','組合の受取窓口へ魔石を納めた。人形を移設した報告にはしない。','break',[give('stone','party','union')]);
  route('reply','back','refill',{companions:['ane']});add('refill','shore','地上の足場で息を整えた。宿の食堂へ戻るかどうかを確かめる。',[opt('dive','アネと食堂へ潜り直す','entry',{companions:['ane']})]);
 }
 if(q.number===136){
  cell('record','辞書と録音石の台','region_4_f2',5,3);cell('study','扉の奥の記録室','region_4_f2',5,5);cell('shelter','扉の奥の宿直室','region_4_f2',7,5);cell('breach','破られた別の入口','region_4_f2',3,5);node('record').place='record';
  x.registry.name={type:'enum',initial:'unspoken',values:['unspoken','real','alias'],meaning:'来訪帳へ実際に名乗った名前'};
  route('purpose','study','study');end('study','study','扉の案内どおり記録室まで来た。研究に使う机へ記録を置く。','study');
  route('purpose','shelter','shelter');end('shelter','shelter','案内された宿直室へ着き、保存食を受け取った。','shelter');
  route('entry','break','breached');end('breached','breach','守護者を退けた穴を通った。来訪帳の許可欄は空白のままにし、損傷を記録する。','break');
 }
 if(q.number===137){
  cell('entry','図書館の選書棚','e2_burnt_library',3,1);cell('read','他の本を開かず読む机','e2_burnt_library',7,3);cell('exit','図書館の封鎖口','e2_burnt_library',1,1);town('archive','本の受入室','pilgrim_archive');town('union','追加の救出の相談先','pilgrim_union');node('read').place='read';
  x.registry.book={type:'enum',initial:'none',values:['none','medicine','family','language'],meaning:'今回選んだ一冊'};x.registry.pages={type:'integer',initial:0,min:0,max:3,meaning:'選んだ本の読解段階'};
  for(const key of ['medicine','family','language']){
   entity(key,'entry');x.registry[key+'Pages']={type:'integer',initial:0,min:0,max:3,meaning:key+'の読解履歴'};
   Object.assign(choice('entry',key),{depart:[give(key,'entry','party')],effects:[give(key,'party','read')]});
   (choice('read','page').effects??=[]).push({...set(key+'Pages',{op:'add',args:[ref(`stories.${q.id}.values.${key}Pages`),1]}),when:eq(ref(`stories.${q.id}.values.book`),key)});
   route('read','carry_'+key,'carry_'+key,{depart:[give(key,'read','party')]});end('carry_'+key,'archive','冷たくなった一冊を受入室へ届けた。残る二冊は救出済みとして数えない。',key,[give(key,'party','archive')]);
  }
  route('read','prepare','prepare_book',{depart:['medicine','family','language'].map(k=>transfer(k,'read','party')),effects:['medicine','family','language'].map(k=>transfer(k,'party','archive'))});
  add('prepare_book','archive','読了した一冊を受入室へ預けた。追加の人員と道具を組合へ求める。',[opt('request','組合へ救出の準備を申請する','requested')]);end('requested','union','次の救出に必要な人員と道具を申請した。残る本は図書館にある。','prepare');
  route('entry','close','closed');route('read','close','replace_book',{depart:['medicine','family','language'].map(k=>transfer(k,'read','party')),effects:['medicine','family','language'].map(k=>transfer(k,'party','entry'))});
  add('replace_book','entry','読んでいた本を閉じて棚へ戻した。入口へ退き、危険区画を封鎖する。',[opt('seal','封鎖口へ戻る','closed')]);end('closed','exit','全員が外へ出たことを確かめ、火の区画を閉じた。','close');
 }
 if(q.number===138){
  cell('entry','訂正する地図と足跡','e2_sand_gallery',5,1);cell('pupil','イラの休息所','e2_sand_gallery',3,7);cell('beyond','休息所の先の調査地点','e2_sand_gallery',13,7);town('union','ナルのいる探索組合','pilgrim_union');node('pupil').place='pupil';entity('ira','pupil','person');entity('narl','union','person');entity('map','party');
  route('pupil','together','explored',{companions:['ira']});end('explored','beyond','共同の発見として記す範囲を合意してから、イラと休息所の先を調べた。','together');
  route('pupil','talk','call');add('call','union','組合でナルへイラの居場所と意向を伝えた。本人の返答を聞くため、休息所まで同行する。',[opt('escort','ナルとイラの休息所へ戻る','mediated',{companions:['narl']})]);end('mediated','pupil','二人が同じ休息所で話した。礼と抗議を別々に聞き、訂正図をイラへ渡した。','talk',[give('map','party','ira')]);
  choice('pupil','solo').effects=[give('map','party','ira'),move('ira','pupil','transit','beyond')];
  route('pupil','correct','reported');end('reported','union','訂正した地図を組合へ持ち帰り、確認できた範囲だけを報告した。','correct',[give('map','party','union')]);
 }
 if(q.number===139){
  cell('entry','救助坑道の分岐','e2_rescue_tunnel',1,1);cell('crowded','声の多い側の室','e2_rescue_tunnel',11,3);cell('wounded','声を出せない負傷者の室','e2_rescue_tunnel',11,7);cell('pump','低い側の排水口','e2_rescue_tunnel',3,5);cell('air','両室へ通じる送気口','e2_rescue_tunnel',7,5);town('rescue','地上の救助詰所','pilgrim_rescue');node('rooms').place='wounded';node('air').place='air';
  entity('crowd','crowded','group');entity('injured','wounded','group');entity('helpers','rescue','group');x.flags.drained=false;x.flags.ventilated=false;x.flags.crowdRescued=false;x.flags.injuredRescued=false;
  route('entry','measure','listen');add('listen','crowded','声の多い側の振動を測った。反響だけでは人数を決めず、低い側の室も確かめる。',[opt('other','低い側の室を確かめる','rooms')]);
  for(const from of ['entry','rooms'])route(from,'many','many_ready');add('many_ready','crowded','多い側の組を掘り出した。残る室へ連絡を保ったまま、地上の詰所へ連れて行く。',[opt('escort','多い側の組を詰所へ連れて行く','many_home',{companions:['crowd'],effects:[set('crowdRescued')]})]);end('many_home','rescue','多い側の組が詰所へ着いた。負傷者の室は救援の継続として引き継ぐ。','many');
  route('rooms','wounded','wounded_home',{companions:['injured'],effects:[set('injuredRescued')]});end('wounded_home','rescue','負傷者を詰所の班へ引き渡した。もう一室の救援を続けるよう伝える。','wounded');
  route('rooms','air','drain',{effects:[set('drained')]});add('drain','pump','排水口へ着き、水の流れを外へ逃がした。送気口は別の作業地点だ。',[opt('ventilate','送気口へ行って両室へ空気を送る','air',{effects:[set('ventilated')]})]);
  route('air','tools','collect_injured');route('air','help','request_help');
  add('request_help','rescue','送気を保ったまま詰所へ応援を求めた。まだ二室を救出済みとは報告しない。',[opt('return','応援班と負傷者の室へ戻る','collect_injured_help',{companions:['helpers']})]);
  for(const suffix of ['', '_help']){
   add('collect_injured'+suffix,'wounded','負傷者を支えられる状態にし、もう一室へ向かう。',[opt('next','負傷者を伴って声の多い室へ向かう','collect_crowd'+suffix,{companions:['injured',...(suffix?['helpers']:[])]})]);
   add('collect_crowd'+suffix,'crowded','二室の生存者が揃った。地上までの救出は、詰所に着いてから確定する。',[opt('escort','二室の生存者を地上へ連れて行く','both_home',{companions:['injured','crowd',...(suffix?['helpers']:[])],effects:[set('injuredRescued'),set('crowdRescued')]})]);
  }
  end('both_home','rescue','二室の生存者が地上の詰所へ着いた。各人を救助班へ引き継いだ。','both');
 }
 if(q.number===140){
  cell('entry','整備別棟の休業札','e2_chapel_works',1,1);cell('treasure','別棟の財宝庫','e2_chapel_works',11,3);cell('accident','整備員の事故現場','e2_chapel_works',3,7);cell('maintenance','隊長ボロの整備区画','e2_chapel_works',11,7);town('union','探索組合の申告受付','pilgrim_union');node('talk').place='maintenance';entity('goods','treasure');entity('worker','accident','person');x.flags.helped=false;x.flags.declared=false;
  route('entry','loot','take');add('take','treasure','止まった罠の先の庫へ着いた。回収した品を携え、地上へ退く。',[opt('leave','持出品を持って組合へ帰る','looted',{depart:[give('goods','treasure','party')]})]);end('looted','union','回収品を持って帰着した。入域の許可を得たことにはしない。','loot');
  route('entry','rescue','accident');add('accident','accident','倒れた整備員を作業場所から引き出した。隊長の区画へ支えて運ぶ。',[opt('carry','整備員をボロの区画へ運ぶ','talk',{companions:['worker'],effects:[set('helped')]})]);
  route('talk','declare','declared',{effects:[set('declared')]});end('declared','union','入域制限と持出申告の協定を組合へ届けた。持出品がない今回の記録も記した。','treaty');
  route('talk','close','closed');end('closed','union','修理期間の閉鎖を組合へ提案し、受理されたことを確かめた。','close');
  route('talk','leave','left');end('left','union','別棟を出て組合へ帰り、調査した範囲だけを引き継いだ。','leave');
 }
 const rewrite=value=>{if(Array.isArray(value))return value.map(rewrite);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,k==='ref'&&v.startsWith(`flags.quest.${q.id}.`)?v.replace(`flags.quest.${q.id}.`,`stories.${q.id}.values.`):rewrite(v)]));return value;};
 for(const n of x.nodes){n.text=rewrite(n.text);for(const a of n.options){for(const [key,value] of Object.entries(a.set??{})){if(!x.registry[key])x.flags[key]??=false;(a.effects??=[]).push(set(key,rewrite(value)));}delete a.set;a.when=rewrite(a.when);a.visible=rewrite(a.visible);}}
 return x;
}
