import {set,give,eq} from '../../../story-kit.mjs';
import {librarySource} from './library-common.mjs';

export function librarySecondSource(q){
 const {x,node,choice,town,cell,entity,opt,add,route,end,v,finish}=librarySource(q);
 const p=q.locations.find(p=>p.role==='decision');cell('entry',q.title+'の相談卓',p.map.endsWith('f1')?1:2,p.x,p.y);
 const stage=()=>town('stage','祭の本番会場','library_stage');
 if(q.number===141){
  town('laundry','サナが働く洗濯場','library_laundry');town('score','楽譜を整える写本室','library_copy_room');stage();
  entity('sana','laundry','person');entity('banner','entry');entity('scoreSheet','score');
  node('sana').place='laundry';route('entry','ask','sana');
  choice('entry','ask').depart=[give('banner','entry','party')];
  route('sana','use','score_use',{depart:[set('musicAllowed'),set('nameAllowed')]});
  add('score_use','score','使用許可の範囲で対旋律を写し、サナの名を楽譜と演目札へ記した。出演を断った本人は洗濯場に残る。',[opt('carry','許諾された楽譜と旗を本番会場へ運ぶ','performed_use',{depart:[give('scoreSheet','score','party')]})]);
  end('performed_use','stage','楽団へ楽譜と旗を渡した。舞台へ呼ぶ約束は加えず、名を載せた曲を演奏する。','use',[give('banner','party','stage'),give('scoreSheet','party','stage'),set('performed')]);
  for(const from of ['entry','sana'])route(from,'new','score_new',{...(from==='entry'?{depart:[give('banner','entry','party')]}:{})});
  add('score_new','score','今年の新曲を書き上げた。去年の曲の許諾と混ぜず、新しい楽譜で本番に臨む。',[opt('carry','新曲の楽譜と旗を会場へ運ぶ','performed_new',{depart:[give('scoreSheet','score','party')]})]);
  end('performed_new','stage','楽団へ新曲の楽譜と旗を渡し、今年の演奏を始めた。','new',[give('banner','party','stage'),give('scoreSheet','party','stage'),set('performed')]);
  route('entry','silent','performed_silent',{depart:[give('banner','entry','party')]});end('performed_silent','stage','旗を会場へ届け、鳴らさないまま演奏を終える。','silent',[give('banner','party','stage'),set('performed')]);
  x.flags.performerAgreed=false;
 }
 if(q.number===142){
  town('buyer','指輪の買主との面会席','library_buyer');town('repair','名を出す修理工房','library_tailor');
  entity('kio','entry','person');entity('buyerPerson','buyer','person');entity('ring','buyerPerson');
  node('entry').text='キオが鑑定卓へ持参した刻印の拓本と石の見積を調べる。指輪は既に買主の手元にある。\n\n'+node('entry').text;
  node('buyer').place='buyer';for(const key of ['tell','later'])choice('entry',key).companions=['kio'];
  route('buyer','refund','refunded');end('refunded','buyer','キオが買主へ代金を返し、受領を確かめた。指輪を残すと決めたのは買主で、こちらは取り上げない。','refund',[set('refunded')]);
  route('buyer','repair','repair_contract',{companions:['kio','buyerPerson']});end('repair_contract','repair','買主とキオが修理工房へ来た。期間と返済額を修理札へ記し、双方が署名した。指輪は買主が持ち続ける。','repair',[set('repairSigned')]);
  for(const from of ['entry','buyer'])choice(from,'refuse').effects=[set('secretExchangeRefused')];
 }
 if(q.number===143){
  town('hire','代役精霊の紹介所','library_spirits');town('supply','普通の皿を選ぶ生活市','library_market');stage();
  for(const id of ['meme','assistant','spirit'])entity(id,'entry','person');entity('replacement','hire','person');entity('plates','supply');
  const crew=['meme','assistant','spirit'];route('entry','hire','hire',{companions:crew,preparation:[set('hirePaid')]});
  add('hire','hire','代役精霊が支払済みの札を確かめた。元の精霊の休暇を取り消さず、出店まで一緒に向かう。',[opt('escort','代役と店の三人を出店へ案内する','fire_show',{companions:[...crew,'replacement']})]);
  end('fire_show','stage','代役が出店の皿を受け持ち、元の精霊は客席へ座った。炎を出す担当者の到着を確かめて開店する。','fire',[set('resting'),set('served')]);
  for(const from of ['entry','roles'])route(from,'taste','plates',{companions:crew});
  add('plates','supply','生活市で普通の皿を受け取った。精霊に炎を頼まず、料理を盛るために出店へ運ぶ。',[opt('carry','皿と店の三人を出店へ運ぶ','taste_show',{companions:crew,depart:[give('plates','supply','party')]})]);
  end('taste_show','stage','普通の皿で料理を提供した。精霊は客席で休み、助手は炎が出ないことを客へ説明する。','taste',[give('plates','party','stage'),set('resting'),set('served')]);
  route('roles','agree','shift_show',{companions:crew,depart:[set('rolesAgreed')]});end('shift_show','stage','三人が出店へ着き、合意した休憩と担当を掲示した。精霊の休憩時間から交代制を始める。','shift',[set('resting'),set('served')]);
 }
 if(q.number===144){
  town('workshop','衣装の修理工房','library_tailor');town('trial','軽い衣装で試演する稽古場','library_rehearsal');stage();
  entity('jill','entry','person');entity('wardrobe','entry','person');entity('costume','entry');entity('youngActor','trial','person');
  route('entry','trial','repair',{companions:['jill','wardrobe'],depart:[give('costume','entry','party')]});
  add('repair','workshop','破損した衣装と衣装係の申告を確認し、弁償の記録を残した。これとは別に、ジルが試せる軽い衣装へ直す。',[opt('try','直した衣装を持ち、ジルと稽古場へ向かう','play',{companions:['jill','wardrobe'],depart:[set('compensationRecorded'),set('lightened')]})]);node('play').place='trial';
  for(const key of ['light','wit']){route('play',key,'show_'+key,{companions:['jill','wardrobe','youngActor']});end('show_'+key,'stage',key==='light'?'ジルと若手が会場で息を合わせ、軽い衣装で最後まで演じた。衣装係の弁償は別の記録に残る。':'会場へ着き、知恵比べへ変えた芝居を演じた。危険な転倒を続ける条件には戻さない。',key,[give('costume','party','jill'),set('performed')]);}
  route('entry','retire','retire_consent');route('play','retire','retire_after_trial');
  add('retire_consent','entry','ジル本人が今回を最後にしたいと答えた。衣装の破損についても、衣装係の弁償記録を残す。',[opt('stage','本人と衣装を最後の公演へ運ぶ','last_show',{companions:['jill','wardrobe'],depart:[give('costume','entry','party'),set('retireAgreed'),set('compensationRecorded')]})]);
  add('retire_after_trial','trial','試演を終えたジルが、今回を最後にすると決めた。軽い衣装で最後の礼をする。',[opt('stage','本人と最後の公演へ向かう','last_show',{companions:['jill','wardrobe','youngActor'],depart:[set('retireAgreed')]})]);
  end('last_show','stage','会場で最後の公演を終えた。ジルは衣装の頭を外し、自分の顔で観客へ礼をした。','retire',[give('costume','party','jill'),set('performed')]);
 }
 if(q.number===145){
  town('mother','母が暮らす家','library_garden_home');town('garden','覆いのある師の庭','library_garden');town('post','次の便りを受け取る窓口','library_post');
  entity('motherPerson','mother','person');entity('letterSheet','post');entity('flowerDrawing','garden');
  // The original alternatives are asked of the mother in person before any cover is removed.
  const options=node('entry').options;node('entry').options=[opt('visit','母を訪ね、庭を待たせた事情を伝える','mother')];
  add('mother','mother','母に娘との約束と、帰省が延びていることを伝えた。今日の庭をどうするか、本人の希望を聞く。',options);
  route('mother','now','now_garden',{companions:['motherPerson'],depart:[set('motherAgreed')]});
  add('now_garden','garden','母と庭へ着き、希望した覆いを外した。咲いた花を描き、母は次に植えたい花の便りを添えた。',[opt('send','花の絵と母の便りを発送窓口へ届ける','sent',{depart:[give('flowerDrawing','garden','party')],effects:[give('flowerDrawing','party','post')]})]);end('sent','post','窓口が娘宛ての絵と便りを受け付けた。母は今日の庭を楽しんでいる。','now',[set('opened'),set('sent')]);
  route('mother','half','half_garden',{companions:['motherPerson'],depart:[set('motherAgreed')]});end('half_garden','garden','母と庭へ戻り、同意した一部だけの覆いを外す。残る蕾をどうするかは母が管理する。','half',[set('partlyOpened')]);
  route('mother','wait','collect_letter',{depart:[set('waitingAgreed')]});add('collect_letter','post','約束した次の便が届いた。届いた封書を受け取り、開花の判断を先取りせず母へ運ぶ。',[opt('deliver','次便の封書を母へ届ける','letter',{depart:[give('letterSheet','post','party')],effects:[give('letterSheet','party','motherPerson'),set('letterReceived')]})]);node('letter').place='mother';
  route('letter','open','waited_garden',{companions:['motherPerson'],depart:[set('motherAgreed')]});end('waited_garden','garden','手紙を受け取った母と庭へ戻り、待つ期限が過ぎたことを確かめて覆いを外す。','waited',[set('opened')]);route('letter','half','half_garden',{companions:['motherPerson'],depart:[set('motherAgreed')]});
 }
 if(q.number===146){
  town('friends','生き残った同僚の集う酒場','salome_inn');town('dyer','染め直しと仕立ての工房','library_tailor');town('storage','軍服を保管する別倉','library_warehouse');
  entity('veteran','entry','person');entity('uniform','veteran');entity('colleagues','friends','group');node('friends').place='friends';choice('entry','friends').companions=['veteran'];
  route('friends','release','dyed',{companions:['veteran'],depart:[set('bothAgreed')]});
  add('dyed','dyer','本人と同僚の合意を持って染物工房へ戻った。誓約を解き、本人が選んだ色へ染め直した服を返す。',[opt('meet','新しい服を着た本人と再会の酒場へ行く','reunion',{companions:['veteran'],depart:[set('released'),set('dyed')]})]);end('reunion','friends','私服になった本人が酒場へ着き、同僚と顔を合わせた。誓約を解いても再会の約束は残る。','release',[set('reunited')]);
  route('entry','coat','tailored',{companions:['veteran'],depart:[set('cutAgreed')]});end('tailored','dyer','本人の同意を確かめて生地を裁ち、外套に仕立てて返した。裏地の旧色を残し、軍服の形へは戻さない。','coat',[set('cut'),set('tailored')]);
  for(const from of ['entry','friends'])route(from,'keep','stored',{companions:['veteran']});end('stored','storage','本人と保管窓口へ着き、軍服を箱へ収めて預けた。着る日を決める権利は本人に残る。','keep',[give('uniform','veteran','storage'),set('stored')]);
 }
 if(q.number===147){
  x.places.mountain={name:'高台街道の山道側',world:{kind:'dungeon',dungeon:'salome_road',map:'e2_highland_lower',x:13,y:5}};
  x.places.water={name:'サロメの静かな水路沿い',world:{kind:'dungeon',dungeon:'salome_road',map:'e2_salome_canal',x:9,y:3}};
  town('receiver','引退した舞踊家の家','library_dancer');town('rest','翌晩まで花を休める保管室','library_flower_rest');town('record','速達競技の記録受付','library_post');entity('flower','entry');
  x.registry.deliveryMode={type:'enum',initial:'pending',values:['pending','mountain','water','car'],meaning:'選んだ運搬経路'};
  for(const [key,to,mode] of [['run','mountain','mountain'],['water','water','water'],['car','car','car']])route('entry',key,to,{depart:[give('flower','entry','party'),set('deliveryMode',mode)],...(key==='car'?{preparation:[set('carPaid')]}:{})});
  choice('entry','run').effects=[set('flowerClosed')];
  add('mountain','mountain','山道を急いだため花が閉じた。速達記録と、開花を見せる依頼を分けて受取人へ説明する。',[opt('deliver','閉じた花を持ち、受取人を訪ねる','closed')]);node('closed').place='receiver';
  add('water','water','水路沿いを静かに運び、振動を避けた。開花を見せるため、このまま受取人へ向かう。',[opt('deliver','荷を静かに保ち、受取先へ運ぶ','quiet_arrival')]);
  add('car','mountain','借りた懸架車で山道を越えた。吊り台が衝撃を受け止め、花は閉じていない。',[opt('deliver','懸架車から荷を受取先へ運ぶ','quiet_arrival')]);end('quiet_arrival','receiver','受取人の前で花が開くところを確かめ、鉢を渡した。時刻だけで受領済みにはしない。','quiet',[give('flower','party','receiver'),set('delivered')]);
  route('closed','tomorrow','rest',{depart:[set('redeliveryAgreed')],effects:[give('flower','party','rest')]});add('rest','rest','受取人と翌晩への変更を約束し、花を静かな保管室へ預けた。ここで一晩を置き、次の開花を待つ。',[opt('next','翌晩、開き始めた花を再配達する','tomorrow_arrival',{depart:[give('flower','rest','party'),set('overnight'),set('flowerClosed',false)]})]);end('tomorrow_arrival','receiver','翌晩に戻り、受取人が花の開くところを見てから鉢を渡した。','tomorrow',[give('flower','party','receiver'),set('delivered')]);
  route('closed','record','recorded');end('recorded','record','閉じた花を依頼元の窓口へ戻し、速達競技だけを精算した。開花を見せる依頼は未達として記す。','record',[give('flower','party','record'),set('deliveryFailed')]);
 }
 if(q.number===148){
  town('market','秤の置かれた買取台','library_market');town('office','比較実演と返金の審査窓口','library_review');town('storage','回収秤の保管窓口','e2_storage');
  entity('scale','market');entity('coin','market');entity('customer','market','person');entity('egi','market','person');
  // Intake and the actual experiment are separate; the repeated test always uses this same coin.
  const original=node('entry');const options=original.options;original.options=[opt('visit','客と秤師のいる買取台を訪ねる','market')];original.text='書庫の相談卓で、秤師エギの買取について届いた申立を読む。現物と客を市場で確かめる。';add('market','market','貧しい客が謝るたび買取額が下がる。秤師エギは純度の違いだと言った。',options);node('proof').place='market';node('denied').place='office';
  choice('market','accuse').companions=['egi','customer'];
  route('denied','test','market',{companions:['egi','customer']});route('proof','public','public_demo',{companions:['egi','customer'],depart:[give('scale','market','party'),give('coin','market','party')]});
  end('public_demo','office','審査窓口で同じ硬貨を替えずに載せ手だけを替え、目盛りの差を実演した。内心の告白は求めない。装置と比較記録を預け、営業停止と返金手続を始める。','public',[give('scale','party','office'),give('coin','party','customer'),set('demonstrated'),set('refundProcedureStarted')]);
  route('proof','private','private_refund');end('private_refund','market','買取台でこの客の返金を確認する。他の客の被害確定や返金完了を記録へ足さない。','private',[set('oneRefunded')]);
  for(const from of ['market','proof'])route(from,'remove','removed',{depart:[give('scale','market','party')]});route('denied','remove','fetch_scale');add('fetch_scale','market','使用停止の取り決めを持って買取台へ戻った。現物を受け取り、保管先へ運ぶ。',[opt('carry','止めた秤を保管窓口へ運ぶ','removed',{depart:[give('scale','market','party')]})]);end('removed','storage','秤を保管窓口へ渡し、使用停止だけを記録する。過去の被害は未確定として残す。','remove',[give('scale','party','storage'),set('removed')]);
 }
 if(q.number===149){
  town('auction','剣の競売と試持ちの席','library_auction');town('smith','製作費を相談する工房','library_tailor');town('farm','鍬を受け取る農夫の庭','library_garden');town('storage','取り下げ品の保管窓口','e2_storage');
  entity('sword','entry');entity('farmer','auction','person');entity('collector','auction','person');
  const original=node('entry'),options=original.options,text=original.text;original.text='競売へ運ぶ剣を相談卓で受け取った。試持ちの性質は、客が触れる前に会場で説明する。';original.options=[opt('carry','預かった剣を競売の席へ運ぶ','auction',{depart:[give('sword','entry','party')]})];add('auction','auction',text+' 試持ちを終えた客から品物を受け取り、購入先が決まるまで隊が預かる。',options);
  node('user').place='smith';choice('auction','user').companions=['farmer'];route('auction','collector','sold');route('user','collector','sold',{companions:['farmer']});end('sold','auction','競売の席へ剣を持ち、性質を知った収集家の購入意思を確かめて渡す。','collector',[give('sword','party','collector'),set('sold')]);
  route('user','pay','delivered',{companions:['farmer'],preparation:[set('costPaid')]});end('delivered','farm','農夫と庭へ着き、製作費の支払を確かめて道具を渡した。農夫が鍬として使い始める。','user',[give('sword','party','farmer'),set('delivered')]);
  for(const from of ['auction','user'])route(from,'withdraw','withdrawn');end('withdrawn','storage','競売の取下げを届け、剣を保管窓口へ返した。損失を精算し、貸出費用の相談を残す。','withdraw',[give('sword','party','storage'),set('withdrawn')]);
 }
 if(q.number===150){
  town('practice','三人の仕事を見る稽古場','library_rehearsal');stage();town('contracts','出演料と弟子入りの相談窓口','library_registry');town('tools','共有道具の受取工房','library_tailor');
  const cast=['ritz','porterPerson','thiefPerson','singerPerson'];for(const id of cast)entity(id,'entry','person');entity('sharedTools','tools');entity('walletOwner','stage','person');entity('wallet','stage');
  route('entry','practice','practice',{companions:cast});delete choice('entry','practice').set;add('practice','practice','荷役の組立、スリの細かな手仕事、歌手の歌を実際に見せてもらった。公開試演の会場へ向かう。',[opt('stage','三人とリッツを会場へ案内する','accident',{companions:cast,depart:[set('prepared')]})]);choice('entry','stage').companions=cast;
  for(const id of ['accident','repair','audience'])node(id).place='stage';for(const id of ['contracts','company'])node(id).place='contracts';
  for(const a of node('audience').options)a.companions=cast;
  choice('audience','thief').depart=[give('wallet','stage','walletOwner'),set('walletReturned')];
  for(const from of ['accident','repair'])route(from,'cancel','settled',{companions:cast});
  end('settled','contracts','窓口で三人の出演料を精算した。公演の中止や弟子不採用を、手伝った仕事の無価値さへ読み替えない。','none',[set('feesSettled')]);
  route('contracts','none','settled');route('company','decline','settled');
  for(const role of ['porter','thief','singer'])choice('contracts',role).effects=[set(role+'Agreed'),set('feesSettled')];
  route('company','agree','tools',{companions:cast,preparation:[set('toolsPaid')]});add('tools','tools','合意した交代制を道具の注文へ添え、支払済みの共有道具を受け取った。道具と三人を会場へ戻す。',[opt('carry','共有道具を運び、三人と一座を始める','formed',{companions:cast,depart:[give('sharedTools','tools','party')]})]);end('formed','stage','三人が会場へ戻り、共有道具を受け取った。固定の裏方を押しつけず、合意した役割で一座を始める。','company',[give('sharedTools','party','stage'),set('companyAgreed'),set('feesSettled')]);
 }
 return finish();
}
