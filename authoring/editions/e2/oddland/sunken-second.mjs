import {set,give,move,ref,eq,and,or} from '../../../story-kit.mjs';

export function sunkenSecondSource(q){
 const x={nodes:structuredClone(q.model.graph),places:{},flags:{},registry:{},entities:{}};
 const node=id=>x.nodes.find(n=>n.id===id),choice=(id,key)=>node(id).options.find(a=>a.id===key);
 const town=(key,name,location)=>x.places[key]={name,world:{kind:'town',location}};
 const cell=(key,name,map,xp,yp)=>x.places[key]={name,world:{kind:'dungeon',dungeon:'royal_sites',map:'e2_royal_'+map,x:xp,y:yp}};
 const entity=(id,holder,kind='item')=>x.entities[id]={holder,kind};
 const opt=(id,text,to,extra={})=>({id,text,to,...extra});
 const add=(id,place,text,options)=>{const n={id,place,text,options};x.nodes.push(n);return n;};
 const route=(from,key,to,extra={})=>Object.assign(choice(from,key),{to,...extra});
 const end=(id,place,text,outcome,effects=[])=>add(id,place,text,[opt('finish','相手と結果を確かめ、依頼を終える','@'+outcome,{effects})]);
 const v=key=>ref(`stories.${q.id}.values.${key}`);
 for(const n of x.nodes)n.place='entry';
 if(q.number===161){
  town('entry','傷の治療を相談する証言室','royal_witness');town('archive','記録具を貸す記録室','royal_archive');town('clinic','剣士の治療をする施療所','oddland_village_clinic');entity('patient','entry','person');entity('recorder','archive');
  route('entry','record','borrow');delete choice('entry','record').cost;delete choice('entry','record').set;choice('entry','record').text='記録室へ記録具を借りに行く';
  add('borrow','archive','声を写す記録具の貸出は20G。借りずに相談へ戻ることもできる。',[opt('rent','20Gで記録具を借りる','record_ready',{cost:{gold:20},effects:[give('recorder','archive','party')]}),opt('back','借りずに剣士のもとへ戻る','entry')]);
  add('record_ready','archive','記録具を受け取った。剣士のもとへ運び、同意を確かめて声を写す。',[opt('record','記録具を運び、声を写す','consent',{effects:[set('recorded')]})]);
  for(const key of ['sera','clinic','recorded'])route('consent',key,'treat_'+key,{companions:['patient']});
  const sera=choice('consent','sera').when;
  add('treat_sera','clinic','剣士が施療所へ着き、治療を受ける準備ができた。',[opt('sera','セラに治療を頼む','@heal',{when:sera}),opt('clinic','イネの治療に立ち会う','@heal')]);
  end('treat_clinic','clinic','剣士と施療所へ来た。本人の同意を再確認し、イネの治療に立ち会う。','heal');
  end('treat_recorded','clinic','剣士と施療所へ来た。記録具を本人へ渡してから、治療に立ち会う。','recorded',[give('recorder','party','patient')]);
 }
 if(q.number===162){
  node('entry').id='bridge';cell('bridge','事故の起きた橋','bridge',5,3);cell('bank','救助後の橋の足場','bridge',11,3);town('entry','盾を借りるエルドの家','royal_lender');town('ceremony','姪の成人の式','royal_hall');town('workshop','船大工の工房','royal_shipyard');town('rescue','橋へ応援を出す救難隊','royal_rescue');
  node('bridge').place='bridge';node('tell').place='bank';node('ceremony').place='ceremony';entity('eld','entry','person');entity('shield','eld');entity('niece','ceremony','person');entity('survivors','bridge','group');entity('helpers','rescue','group');
  add('entry','entry','エルドから姪の成人の式へ届ける盾を借りる。橋を通って集会所へ向かう。',[opt('borrow','盾を預かり、橋へ向かう','bridge',{depart:[give('shield','eld','party')]})]);
  choice('bridge','shield').companions=['survivors'];route('bridge','rope','rescued',{companions:['survivors']});
  route('bridge','help','help');add('help','rescue','救難隊へ橋の位置を伝えた。隊と橋へ戻り、荷車の人を渡す。',[opt('return','救難隊と橋へ戻る','help_bridge',{companions:['helpers']})]);
  add('help_bridge','bridge','救難隊が事故の場所へ着いた。人を安全な足場へ案内する。',[opt('rescue','救難隊と救助する','rescued',{companions:['helpers','survivors']})]);
  add('rescued','bank','荷車の人が橋の安全な足場へ移った。盾を式へ届ける。',[opt('ceremony','盾を持って式へ向かう','ceremony')]);
  choice('ceremony','ceremony').effects=[give('shield','party','niece')];route('ceremony','workshop','workshop',{companions:['niece']});end('workshop','workshop','姪と工房へ盾を運び、本人の希望どおり防護板として渡す。','workshop',[give('shield','party','niece')]);
  route('ceremony','return','returned');end('returned','entry','エルドの家へ盾を持ち帰った。傷があれば、そのままの状態で返す。','return',[give('shield','party','eld')]);
 }
 if(q.number===163){
  town('entry','修理の契約を結ぶ店先','royal_lockshop');town('vault','店主が立ち会う金庫室','royal_vault');entity('som','entry','person');entity('owner','entry','person');entity('goods','vault');x.flags.repaired=false;
  for(const [from,key,outcome] of [['entry','new','repair'],['repay','agree','repay']]){
   route(from,key,'work_'+outcome,{companions:['som','owner']});
   add('work_'+outcome,'vault',outcome==='repair'?'店主とソムが金庫室へ来た。別の手段で修理し、所有品を店主と照合する。':'店主の立会いで古い経路を使い、合意した修理を行う。弁償の契約は別に残す。',[opt('repair','修理して所有品を照合する','checked_'+outcome,{effects:[set('repaired')]})]);
   add('checked_'+outcome,'vault','修理と所有品の照合を終えた。品物は金庫室に残し、正面へ戻る。',[opt('return','店主とソムと正面へ戻る','receipt_'+outcome,{companions:['som','owner']})]);end('receipt_'+outcome,'entry','店主の受取印を正面で待ち、修理の代金を受け取る。',outcome);
  }
 }
 if(q.number===164){
  town('entry','レンと客のいる宿','oddland_village_inn');town('prepare','送辞を揃える控室','royal_witness');town('hall','送別会の集会所','royal_hall');entity('renGuest','entry','person');entity('guests','entry','group');node('prepare').place='prepare';node('together').place='hall';
  choice('entry','secret').companions=['guests'];route('prepare','party','invite',{companions:['guests']});
  add('invite','entry','客と宿へ戻り、レンを送別会へ招いた。準備した送辞は会まで伏せておく。',[opt('escort','レンと客と集会所へ向かう','secret_party',{companions:['renGuest','guests']})]);end('secret_party','hall','レンと客が集会所へ揃った。一人ずつ自分の言葉で送辞を伝える。','secret');
  route('entry','explain','rehearse',{companions:['renGuest','guests']});add('rehearse','prepare','レンにも事情を説明し、客の言葉を最後まで聞く練習をした。',[opt('party','皆で集会所へ向かう','explained',{companions:['renGuest','guests']})]);end('explained','hall','練習した皆が集会所へ来た。送辞を聞き、最後に短い歌を頼む。','explain');
  choice('entry','bring').companions=['renGuest','guests'];
 }
 if(q.number===165){
  town('entry','リナとイルのいる宿','oddland_village_inn');town('private','援助を相談する別室','royal_witness');town('public','港の公開商談席','royal_harbor');town('supply','援助の補給を受け取る店','oddland_village_supply');entity('lina','entry','person');entity('ilGuest','entry','person');entity('aid','supply');node('private').place='private';node('public').place='public';
  choice('entry','private').companions=['lina'];choice('entry','open').companions=['lina','ilGuest'];route('private','ask','ask_il',{companions:['lina']});
  add('ask_il','entry','リナと宿へ戻り、イルへ援助の相談を伝えた。隊への参加とは別に、本人も商談へ来る。',[opt('public','双方と公開の商談席へ向かう','public',{companions:['lina','ilGuest']})]);
  route('private','secret','secret_supply',{companions:['lina']});add('secret_supply','supply','リナと補給店へ来た。本人へ説明しないまま援助を受け取る。',[opt('receive','補給を受け取り、宿へ戻る','secret_report',{companions:['lina'],depart:[give('aid','supply','party')]})]);end('secret_report','entry','宿でリナから援助のことを知ったイルに会った。受け取った補給について説明を求められる。','secret');
  route('public','agree','open_supply',{companions:['lina','ilGuest']});end('open_supply','supply','双方の条件を記した契約を持って補給店へ来た。合意した援助を受け取る。','open',[give('aid','supply','party')]);
 }
 if(q.number===166){
  town('entry','師と試験官の受付','royal_archive');cell('trial','ルウが救助する試験場','trial',9,5);node('trial').place='trial';entity('ruu','entry','person');
  for(const key of ['rules','trial'])choice('entry',key).companions=['ruu'];
  // A battle result is recorded by its actual continuation, never by a
  // player-selectable success action. Defeat resumes here after returning.
  const failed=or(eq(ref('flags.relocatedBattleResult.q166'),'escape'),eq(ref('flags.relocatedBattleResult.q166'),'lose'));
  choice('trial','battle').when={op:'not',arg:failed};choice('trial','battle').recordBattleResult=true;choice('trial','battle').companions=['ruu'];delete choice('trial','battle').escape;delete choice('trial','battle').loss;
  choice('trial','train').when={op:'not',arg:failed};route('trial','train','retry_report',{companions:['ruu']});end('retry_report','entry','ルウと試験受付へ戻り、受験の延期を伝える。','retry');
  node('trial').options.push(opt('interview','ルウと撤退の面談へ戻る','interview',{when:failed,companions:['ruu']}));
 }
 if(q.number===167){
  cell('entry','副隊長と避難民の待つ陣地','fort',1,3);cell('bridge','崩れた橋の手前','fort',5,1);cell('enemy','対岸を見渡す偵察点','fort',5,5);cell('ridge','守りの薄い尾根','fort',11,5);cell('fort','奪還する砦','fort',13,1);town('report','帰還報告の救難隊詰所','royal_rescue');town('refuge','避難民を送り届ける高台','royal_refuge');entity('refugees','entry','group');
  for(const key of ['bridge','enemy']){
   route('entry',key,key+'_seen');delete choice('entry',key).textAfter;
   add(key+'_seen',key,key==='bridge'?'橋は既に落ちていた。落ちた橋を歩いて渡る道はない。':'敵は橋の対岸に集中し、尾根の守りは薄い。',[opt('back','陣地へ戻って案を選ぶ','entry')]);
  }
  node('blocked').place='bridge';node('report').place='report';
  const battle=choice('entry','ridge');delete battle.combat;delete battle.escape;delete battle.loss;route('entry','ridge','ridge');
  const failed=or(eq(ref('flags.relocatedBattleResult.q167'),'escape'),eq(ref('flags.relocatedBattleResult.q167'),'lose'));
  add('ridge','ridge','尾根へ来た。ここで守備隊と戦う。撤退した場合は避難民の護衛へ回る。',[opt('battle','尾根の守備隊に対処する','captured',{combat:'guard_7',recordBattleResult:true,when:{op:'not',arg:failed}}),opt('retreat','陣地へ戻り、避難民を護衛する','evacuate')]);
  add('captured','fort','尾根の守備隊を退け、砦へ到達した。奪還の結果を村へ報告する。',[opt('report','救難隊詰所へ帰還する','report')]);
  for(const [from,key] of [['entry','retreat'],['blocked','retreat']])route(from,key,'evacuate');
  add('evacuate','entry','避難民のいる陣地へ戻った。砦の奪還を済ませたことにはせず、村まで護衛する。',[opt('escort','避難民と村の高台へ向かう','safe',{companions:['refugees']})]);end('safe','refuge','避難民が村の高台へ着いた。護衛の成果と砦の未達を別々に報告する。','retreat');
 }
 if(q.number===168){
  town('entry','双子へ修理を頼む工房','royal_shipyard');town('lamp','診断と調整をする魔力灯','royal_lamp');town('other','兄が呼ばれた別棟','royal_other_lamp');town('invoice','料金を相談する港の席','royal_harbor');entity('brother','entry','person');entity('younger','entry','person');entity('bill','lamp');x.flags.repaired=false;
  node('separated').place='lamp';node('adjust').place='lamp';node('invoice').place='invoice';
  choice('entry','pair').companions=['brother','younger'];choice('entry','pair').effects=[move('brother','lamp','transit','other')];choice('entry','roles').companions=['brother','younger'];
  route('separated','wait','fetch_brother');delete choice('separated','wait').set;
  add('fetch_brother','other','別棟で兄の仕事が終わるのを待ち、魔力灯の試験へ呼び戻す。',[opt('return','兄と魔力灯へ戻る','test_both',{companions:['brother']})]);
  route('adjust','both','gather');delete choice('adjust','both').set;
  add('gather','lamp','兄が別棟にいる場合は呼びに行く。ここにいるなら二人で試験を始められる。',[opt('fetch','別棟へ兄を呼びに行く','fetch_brother',{when:eq(v('brotherAt'),'other')}),opt('test','二人で試験を行う','tested',{when:eq(v('brotherAt'),'lamp'),effects:[set('repaired')]})]);
  add('test_both','lamp','兄が魔力灯へ戻った。診断と調整を確かめ、二人で点灯試験を行う。',[opt('test','点灯試験を行う','tested',{effects:[set('repaired')]})]);
  route('adjust','test','tested');
  add('tested','lamp','点灯試験が済んだ。請求書の相談には二人とも立ち会う。',[opt('fetch','別棟へ兄を迎えに行く','fetch_invoice',{when:eq(v('brotherAt'),'other')}),opt('invoice','二人と請求書を持って港へ行く','invoice',{companions:['brother','younger'],depart:[give('bill','lamp','party')]})]);
  add('fetch_invoice','other','修理の完了を兄に伝えた。弟と合流し、今回の仕事と次の契約を相談する。',[opt('return','兄と魔力灯へ戻る','tested',{companions:['brother']})]);
 }
 if(q.number===169){
  town('entry','指輪を預けたマオの家','royal_sender');town('recipient','旅仲間の現在の家','royal_recipient');town('post','後日の手紙を受け取る記録室','royal_archive');entity('mao','entry','person');entity('ring','mao');entity('letter','recipient');entity('messenger','recipient','person');node('recipient').place='recipient';node('friendship').place='recipient';
  choice('entry','deliver').depart=[give('ring','mao','party')];
  for(const key of ['honest','soft'])choice('report',key).effects=[give('ring','party','mao')];choice('later','admit').effects=[give('ring','party','mao')];
  route('report','lie','mail',{depart:[give('letter','recipient','messenger'),move('messenger','recipient','transit','post')]});
  add('mail','post','後日、記録室に受取人からの手紙が届いていた。「指輪はお返ししたはずです」。手紙を預かり、マオへ届ける。',[opt('deliver','手紙を持ってマオへ戻る','later',{depart:[give('letter','messenger','party')],effects:[give('letter','party','mao')]})]);
 }
 if(q.number===170){
  node('entry').id='camp';town('entry','セフと出発する港','royal_harbor');cell('shore','湖の渡し場','lakeshore',13,7);cell('camp','島の古い鍋のある野営地','island',9,5);town('supply','一便の荷を受け取る補給店','oddland_village_supply');entity('sef','entry','person');entity('cargo','supply');entity('pot','camp');node('camp').place='camp';node('role').place='camp';
  add('entry','entry','セフと湖の島を調べに行く約束をした。港から湖岸へ歩き、渡し舟で島へ渡る。',[opt('lake','セフと湖の渡し場へ向かう','shore',{companions:['sef']})]);
  add('shore','shore','湖の渡し場へ着いた。舟で島に渡り、野営地へ向かう。',[opt('island','セフと島の野営地へ向かう','camp',{companions:['sef']})]);
  for(const [from,key,outcome] of [['camp','send','send'],['camp','holiday','holiday'],['role','send','send'],['role','agree','role']])route(from,key,'ashore_'+outcome,{companions:['sef']});
  for(const outcome of ['send','holiday','role']){
   add('ashore_'+outcome,'shore','セフと渡し舟で湖岸へ戻った。'+(outcome==='role'?'約束した一便の荷を受け取りに行く。':'港で別れの支度をする。'),[opt('continue',outcome==='role'?'セフと補給店へ行く':'セフと港へ戻る',outcome==='role'?'cargo':'farewell_'+outcome,{companions:['sef']})]);
   end('farewell_'+outcome,'entry','セフと港へ戻った。'+(outcome==='role'?'運んだ一便の荷を引き渡し、合意した出発日を守って送り出す。':'本人の決めた別れ方で送り出す。'),outcome,outcome==='role'?[give('cargo','party','entry')]:[]);
  }
  add('cargo','supply','セフと約束した一便の補給を受け取る。これを港へ届けてから送り出す。',[opt('carry','一便の荷をセフと港へ運ぶ','farewell_role',{companions:['sef'],depart:[give('cargo','supply','party')]})]);
 }
 const rewrite=value=>{
  if(typeof value==='string')return value.replaceAll('$truth',q.model.reveal.newInformation);
  if(Array.isArray(value))return value.map(rewrite);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,a])=>[key,key==='ref'?a.replace(`flags.quest.${q.id}.`,`stories.${q.id}.values.`).replace(`flags.flow.${q.id}.`,`stories.${q.id}.values.`):rewrite(a)]));return value;
 };
 for(const n of x.nodes){n.text=rewrite(n.text);for(const a of n.options){
  for(const [key,value] of Object.entries(a.set??{})){x.flags[key]??=false;(a.effects??=[]).push(set(key,rewrite(value)));}delete a.set;
  for(const e of [...(a.effects??[]),...(a.preparation??[])])if(e.op==='set'&&!x.registry[e.key])x.flags[e.key]??=false;
  a.when=rewrite(a.when);a.visible=rewrite(a.visible);if(a.need?.length)a.when=and(a.when??true,...a.need.map(key=>eq(v(key),true)));delete a.need;
 }}
 x.places={entry:x.places.entry,...x.places};
 return x;
}
