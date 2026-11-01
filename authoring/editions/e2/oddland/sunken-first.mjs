import {set,give,move,ref,eq,and} from '../../../story-kit.mjs';

export function sunkenFirstSource(q,{cast=true}={}){
 const x={nodes:structuredClone(q.model.graph),places:{},flags:{},registry:{},entities:{}};
 const node=id=>x.nodes.find(n=>n.id===id),choice=(id,key)=>node(id).options.find(a=>a.id===key);
 const cell=(key,name,map,xp,yp)=>x.places[key]={name,world:{kind:'dungeon',dungeon:'region_7',map,x:xp,y:yp}};
 const town=(key,name,location)=>x.places[key]={name,world:{kind:'town',location}};
 const entity=(id,holder,kind='item')=>x.entities[id]={holder,kind};
 const opt=(id,text,to,extra={})=>({id,text,to,...extra});
 const add=(id,place,text,options)=>{const n={id,place,text,options};x.nodes.push(n);return n;};
 const route=(from,key,to,extra={})=>Object.assign(choice(from,key),{to,...extra});
 const end=(id,place,text,outcome,effects=[])=>add(id,place,text,[opt('finish','現場の結果を確かめ、依頼を終える','@'+outcome,{effects})]);
 const int=(key,max)=>x.registry[key]={type:'integer',initial:0,min:0,max,meaning:key};
 const v=key=>ref(`stories.${q.id}.values.${key}`);
 const transfer=(id,from,to)=>({...give(id,from,to),when:eq(v(id+'At'),from)});
 const p=q.locations.find(p=>p.role==='decision');cell('entry',q.title+'の現場',p.map,p.x,p.y);
 for(const n of x.nodes)n.place='entry';
 if(q.number===61){
  cell('air_one','海図の最初の空気室','region_7_f1',9,5);cell('air_two','海図の次の空気室','region_7_f1',15,3);town('rescue','城内救難図の受取先','royal_rescue');town('harbor','海面の航路を相談する港','royal_harbor');
  int('tested',1);entity('chart','entry');node('air').place='air_one';
  const second=structuredClone(node('air'));second.id='second_air';second.place='air_two';second.options=second.options.filter(a=>a.id!=='next');x.nodes.push(second);
  choice('entry','trial').depart=[give('chart','entry','party')];route('air','next','second_air');
  route('second_air','rescue','rescue_report',{effects:[give('chart','party','rescue')]});
  // The first air room cannot satisfy the two-room trial, even if a caller
  // tries to dispatch the unavailable rescue choice directly.
  route('air','rescue','rescue_report',{effects:[give('chart','party','rescue')]});end('rescue_report','rescue','救難隊へ実際に歩いた二室の図を渡した。外洋の航海図には用いないと欄外へ記す。','informed');
  route('entry','sea','sea_report',{depart:[give('chart','entry','party')],effects:[give('chart','party','harbor')]});end('sea_report','harbor','港で海面の航路として図を渡した。城内の空気室を試した記録は添えていない。','contract');
  choice('entry','local').effects=[give('chart','entry','party')];
  if(cast){
   entity('rescuers','rescue','group');x.entities.rescuers.character='q061_rescuers';
   node('rescue_report').cast=[{entity:'rescuers',x:50}];
  }
 }
 if(q.number===62){
  town('exhibit','外布と名簿の展示室','royal_exhibit');town('witness','遺族の証言室','royal_witness');entity('cloth','entry');entity('manifest','entry');entity('heirs','entry','group');
  route('entry','names','names_shown',{depart:[give('cloth','entry','party'),give('manifest','entry','party')],effects:[give('cloth','party','exhibit'),give('manifest','party','exhibit')]});end('names_shown','exhibit','外布と救助名簿を同じ展示台へ置いた。切り分けた浮きの用途を確かめられる。','informed');
  route('entry','heirs','testimony',{companions:['heirs'],depart:[give('cloth','entry','party')],effects:[give('cloth','party','heirs')]});end('testimony','witness','証言室で遺族へ外布を引き渡し、公開の範囲を相談した。名簿を公開済みにはしない。','compromise');
  route('entry','treasure','treasure_shown',{depart:[give('cloth','entry','party')],effects:[give('cloth','party','exhibit')]});end('treasure_shown','exhibit','豪華な外布だけを展示室へ納めた。救助名簿はこの展示へ持ち込んでいない。','contract');
  if(cast){
   x.entities.heirs.character='q062_heirs';
   for(const id of ['entry','testimony'])node(id).cast=[{entity:'heirs',x:50}];
  }
 }
 if(q.number===63){
  cell('weights','避難梯子の重りの操作足場','region_7_f1',13,9);cell('vent','別の通気孔の足場','region_7_f1',15,7);node('balance').place='weights';int('load',3);x.flags.aligned=false;
  route('balance','fix','aligned',{effects:[set('aligned')]});end('aligned','entry','調整した梯子の入口まで戻り、王室への乗り移りを試した。使用後は浮く避難梯子へ戻す。','informed');
  for(const [from,key] of [['entry','vent'],['balance','detour']])route(from,key,'detour');end('detour','vent','調整をやめて通気孔まで迂回した。帰路として通れる足場を確認する。','compromise');
 }
 if(q.number===64){
  cell('pressure','圧力管と砲声の観測点','region_7_f1',7,9);town('bay','魚群が逃げ込む入り江','royal_bay');town('fishers','時刻表を相談する漁師小屋','royal_fishers');node('pressure').place='pressure';node('bay').place='bay';x.flags.observed=false;x.flags.bell=false;
  choice('entry','before').effects=[set('observed')];choice('bay','mechanism').effects=[set('observed')];
  route('pressure','bell','bell_ready',{effects:[set('bell')]});end('bell_ready','entry','砲の前へ戻って圧力管を鐘へつなぎ、作動を確かめた。','informed');
  for(const [from,key] of [['pressure','schedule'],['bay','fish']])route(from,key,'schedule');end('schedule','fishers','観測した砲声と魚の移動を漁師へ伝え、網を引く時刻を相談した。','compromise');
  if(cast){
   entity('fisher','fishers','group');
   x.entities.fisher.character='q064_fisher';
   node('schedule').cast=[{entity:'fisher',x:50}];
  }
 }
 if(q.number===65){
  cell('supply','油膜をつなぐ供油路','region_7_f1',15,3);town('shore','岸の葬送の場','royal_harbor');node('tide').place='supply';int('phase',2);x.flags.connected=false;entity('lamp','entry');entity('ritualOil','supply');
  choice('entry','wait').depart=[give('lamp','entry','party')];
  route('tide','join','sent',{effects:[set('connected'),give('lamp','party','entry')]});end('sent','entry','供油路をつないだ灯を儀礼の場へ戻し、止まった潮へ送った。','informed');
  route('entry','oil','oil_supply');add('oil_supply','supply','葬送師の供油路から儀礼用の油を受け取る。携行灯の燃料とは別に運ぶ。',[opt('pour','儀礼用の油を灯へ運ぶ','oiled',{depart:[give('ritualOil','supply','party')],effects:[give('ritualOil','party','lamp')]})]);end('oiled','entry','灯の場へ儀礼用の油を運び、火が通るのを確かめた。','contract');
  for(const [from,key] of [['entry','shore'],['tide','return']])route(from,key,'ashore',{depart:[transfer('lamp','entry','party')],effects:[give('lamp','party','shore')]});end('ashore','shore','岸へ灯を持ち帰り、遺族の前へ置いた。','compromise');
  if(cast){
   entity('mourners','shore','group');
   x.entities.mourners.character='q065_mourners';
   node('ashore').cast=[{entity:'mourners',x:50}];
   node('oil_supply').text='葬送師の供油路に儀礼用の油が用意されている。灯まで運ぶ分を確かめた。';
  }
 }
 if(q.number===66){
  town('records','避難便の乗船記録室','royal_archive');town('exhibit','鎧と記録の展示室','royal_exhibit');node('evacuated').place='records';entity('armor','entry');entity('boarding','entry');x.flags.empty=false;
  choice('entry','carry').effects=[set('empty'),give('armor','entry','party')];choice('empty','manifest').depart=[give('boarding','entry','party')];
  for(const [from,key,outcome] of [['entry','honor','contract'],['empty','facts','compromise'],['evacuated','rewrite','informed'],['evacuated','limited','compromise']]){
   const target=from+'_'+key;route(from,key,target,{depart:[transfer('armor','entry','party')],effects:[give('armor','party','exhibit'),transfer('boarding','party','exhibit')]});end(target,'exhibit','鎧を展示室へ運び、ここまでに確認した内容を展示札へ記した。',''+outcome);
  }
 }
 if(q.number===67){
  cell('valve','小さな調圧弁の操作足場','region_7_f2',17,5);cell('gate','大門の操作足場','region_7_f2',13,3);cell('refuge','人魚の退避できる水域','region_7_f2',17,9);node('balanced').place='valve';node('surge').place='gate';entity('mermaid','entry','person');x.flags.balanced=false;x.flags.retried=false;x.flags.opened=false;x.flags.stopped=false;
  Object.assign(choice('entry','small'),{companions:['mermaid'],effects:[set('balanced')]});choice('entry','large').companions=['mermaid'];Object.assign(choice('surge','reset'),{companions:['mermaid'],effects:[set('balanced')]});
  route('balanced','gate','opened',{companions:['mermaid'],effects:[set('opened')]});end('opened','gate','水位が揃ったことを操作足場で確かめ、大門を開いた。','informed');
  route('entry','force','forced');end('forced','gate','大門の操作足場まで来て強制開放した。調圧を済ませた記録は付けない。','contract',[set('opened')]);
  for(const [from,key] of [['entry','stop'],['surge','evacuate']])route(from,key,'stopped',{companions:['mermaid'],effects:[set('stopped')]});
  add('stopped','valve','小弁を閉じて入水を止めた。人魚が移れる水域まで同行する。',[opt('escort','人魚と退避水域へ移る','evacuated',{companions:['mermaid']})]);
  route('balanced','close','stopped',{effects:[set('stopped')]});end('evacuated','refuge','人魚が退避水域へ移ったのを確認した。','compromise');
 }
 if(q.number===68){
  cell('raft_site','軽い綱の先の避難筏','region_7_f2',7,11);cell('boat','別船の乗移り足場','region_7_f2',3,11);cell('drift','切り離され流れた筏','region_7_f2',1,11);node('raft').place='raft_site';node('secured').place='boat';
  // The floating assembly moves as a group; its cargo stays aboard when it
  // drifts independently of the party or is towed alongside the survivors.
  entity('raftVessel','raft_site','group');entity('cargo','raftVessel');entity('survivors','raft_site','group');x.flags.raft=false;
  choice('raft','rope').companions=['survivors','raftVessel'];choice('raft','people').companions=['survivors'];
  choice('entry','cut').effects=[move('raftVessel survivors','raft_site','transit','drift')];
  for(const [key,outcome] of [['cut','informed'],['abandon','cargo'],['fix','compromise']]){route('secured',key,'hoist_'+key);end('hoist_'+key,'entry','吊上げ地点へ戻り、船へ移した人と筏の所在を確かめて作業を終える。',outcome,key==='abandon'?[move('raftVessel','raft_site','transit','drift')]:[]);}
 }
 if(q.number===69){
  cell('passed','料金所を通った先の足場','region_7_f2',7,11);cell('work','城門の補修作業場と交渉席','region_7_f2',9,6);town('report','補修図の引継ぎ先','royal_harbor');node('passed').place='passed';node('work').place='work';entity('diagram','entry');x.flags.paid=false;
  choice('entry','pay').preparation=[set('paid')];choice('entry','pay').depart=[give('diagram','entry','party')];choice('entry','help').depart=[give('diagram','entry','party')];choice('entry','force').combat='guard_7';
  for(const [from,key] of [['passed','leave'],['work','single'],['work','leave']])route(from,key,'reported',{effects:[give('diagram','party','report')]});end('reported','report','港へ補修図を持ち帰り、次の船へ必要な材料を伝えた。','compromise');
  choice('work','single').preparation=[set('paid')];
 }
 if(q.number===70){
  town('harbor','係留索の伸びる港','royal_harbor');town('refuge','港の人の避難先','royal_refuge');cell('outer','外郭の浮上弁','region_7_f2',3,7);cell('store','倉の浮上弁と搬出庫','region_7_f2',7,11);cell('core','中枢の浮上弁','region_7_f2',13,5);entity('portPeople','harbor','group');entity('relic','store');
  for(const key of ['evacuated','outer','store','core'])x.flags[key]=false;
  choice('entry','all').combat='boss_7';route('districts','evacuate','harbor_wait');delete choice('districts','evacuate').set;
  add('harbor_wait','harbor','港の人へ浮上作業を知らせた。係留索のそばから高台へ案内する。',[opt('escort','港の人と高台へ上がる','safe',{companions:['portPeople'],effects:[set('evacuated')]})]);
  add('safe','refuge','港の人が高台へ揃った。ここから制御台へ戻る。',[opt('back','城の制御台へ戻る','districts')]);
  for(const key of ['outer','store']){route('districts',key,key+'_raised');add(key+'_raised',key,key==='outer'?'外郭の弁で浮上を確認した。次は倉の弁を扱う。':'倉の弁で浮上を確認した。中枢は最後に扱う。',[opt('back','制御台へ戻る','districts')]);}
  route('districts','core','core_raised',{effects:[set('core')]});end('core_raised','core','外郭、倉に続いて中枢を浮かせた。港の避難を含む作業記録を確かめる。','informed');
  for(const [from,key] of [['entry','salvage'],['districts','stop']])route(from,key,'salvage');
  add('salvage','store','浮上を止め、搬出庫の重要な遺物を回収する。',[opt('carry','遺物を港へ運び出す','salvaged',{depart:[give('relic','store','party')],effects:[give('relic','party','harbor')]})]);end('salvaged','harbor','港へ遺物を引き渡した。城全体の浮上を完了した記録にはしない。','compromise');
 }
 const rewrite=value=>{
  if(typeof value==='string')return value.replaceAll('$truth',q.model.reveal.newInformation);
  if(Array.isArray(value))return value.map(rewrite);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,v])=>[key,key==='ref'&&v.startsWith(`flags.flow.${q.id}.`)?v.replace(`flags.flow.${q.id}.`,`stories.${q.id}.values.`):rewrite(v)]));return value;
 };
 for(const n of x.nodes){n.text=rewrite(n.text);for(const a of n.options){
  for(const [key,value] of Object.entries(a.set??{})){if(!x.registry[key])x.flags[key]??=false;(a.effects??=[]).push(set(key,rewrite(value)));}delete a.set;
  a.when=rewrite(a.when);a.visible=rewrite(a.visible);if(a.need?.length)a.when=and(a.when??true,...a.need.map(key=>eq(v(key),true)));delete a.need;
 }}
 return x;
}
