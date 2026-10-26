import {set,give,eq,not,and,ref} from '../../../story-kit.mjs';
import {machineSource} from './machine-common.mjs';
export function machineSecondSource(q){
 const {x,node,choice,town,cell,field,entity,opt,add,route,end,v,transfer,int,finish}=machineSource(q);
 const intake=(place,text,cast=[])=>{const n=node('entry'),options=n.options,original=n.text;n.text=text;n.options=[opt('visit','依頼人のいる現場へ向かう','onsite',{companions:cast})];add('onsite',place,original,options);return 'onsite';};
 const result=r=>eq(ref(`flags.relocatedBattleResult.${q.id}`),r);
 if(q.number===171){
  town('home','ダイの家の外戸口','machine_home');town('shoes','境界の護符を受け取る靴店','machine_shoes');town('refuge','家族の避難する下宿屋','salome_inn');field('boundary','家から離れた調査の境界','outskirts',3,3);field('rule_place','閉じた輪の境界標','outskirts',7,1);field('test_place','足音の歩行試験路','outskirts',7,5);field('ring','封じの輪を刻む場所','outskirts',13,3);cell('return_path','足音を返す機関廟の入口',1,1,1);
  entity('dai','home','person');entity('family','home','group');entity('wardPaper','shoes');int('time',3);const from=intake('home','機関廟の作業口で、ダイの帰宅路に続く足音の相談を受けた。家の外で本人を訪ねる。');node('watch').place='boundary';choice(from,'begin').companions=['dai'];
  for(const [key,place,text] of [['rule','rule_place','境界標で、閉じた輪を歩かせる規則を確認した。'],['ward','shoes','靴店で支払済みの札を確かめ、輪を封じる護符を受け取った。'],['wait','test_place','帰宅路を避けて一巡歩き、足音の追従を観察した。']]){const a=choice('watch',key);a.to=key+'_done';a.companions=['dai'];if(key==='ward'){a.preparation=[set('wardPaid')];a.effects=[give('wardPaper','shoes','party')];}add(key+'_done',place,text,[opt('return','ダイと調査の境界へ戻る','watch',{companions:['dai']})]);}
  route('watch','loop','ring',{companions:['dai']});add('ring','ring','規則どおりの輪へ足音を導き、護符で封じた。維持の当番を確認して帰宅する。',[opt('home','ダイと家へ戻る','loop_home',{companions:['dai'],depart:[give('wardPaper','party','ring'),set('sealed')]})]);end('loop_home','home','戸口で封じと当番を伝えた。夫婦の話は別にやり直す。','loop',[set('homeReached')]);
  route('watch','return','returned',{companions:['dai']});add('returned','return_path','機関廟へ続く道を歩き、足音を切り離した。',[opt('home','一人分の足音を確かめ、ダイと帰る','return_home',{companions:['dai'],depart:[set('detached')]})]);end('return_home','home','戸口で一人分の音を聞いた妻が、戸を開けた。','return',[set('homeReached')]);
  // The third investigation exposes the threat. Travelling alone does not tick time.
  const fight=choice('watch','fight');delete fight.combat;route('watch','fight','defense',{companions:['dai']});add('defense','home','姿を現した追跡者が家へ迫る。家族の避難路を残して迎える。',[opt('fight','追跡者と戦い、家を守る','defended',{combat:'story_171',recordBattleResult:true,when:and(not(result('escape')),not(result('lose')))}),opt('evacuate','家族と避難する','evacuated',{companions:['dai','family']})]);end('defended','home','追跡者を退け、ダイが妻へ戸口の外で言い直した。','fight',[set('defended')]);
  route('watch','leave','collect_family',{companions:['dai']});add('collect_family','home','家族に脅威と退避先を伝え、必要な荷だけを持つ。',[opt('escort','家族を下宿屋へ案内する','evacuated',{companions:['dai','family']})]);end('evacuated','refuge','家族の到着を確認した。家への道が知られており、対処前には帰れないと報告する。','evacuate',[set('evacuated')]);
 }
 if(q.number===172){
  town('workshop','ルイ本人の刺繍工房','machine_lui');town('mother','母から昔の名を聞く家','machine_mother');town('market','作品の名を確かめる市','library_market');field('well_place','名前を取った井戸','cemetery',7,3);town('water','代わりの水源を手配する窓口','machine_registry');entity('lui','workshop','person');
  const from=intake('workshop','機関廟の相談所でルイの記憶の欠落を聞いた。本人の工房を訪ねる。');
  for(const [key,place,text] of [['mother','mother','母から昔の名と呼んでいた頃の事情を聞いた。'],['market','market','作品の刺繍と出品記録を照合し、本人が選んだ名を確認した。']]){const a=choice(from,key);a.to=key+'_heard';add(key+'_heard',place,text,[opt('return','本人の工房へ戻る',from)]);}
  node('well').place='well_place';choice(from,'well').companions=['lui'];route('well','back',from,{companions:['lui']});route('well','restore','restored_confirm',{companions:['lui'],depart:[set('memoriesReturned')]});add('restored_confirm','workshop','ルイと工房へ戻り、二つの名と過去を取り戻したことを本人に確認する。',[opt('mother','本人と母を訪ね、今の呼び名を伝える','restored',{companions:['lui'],depart:[set('nameConfirmed')]})]);end('restored','mother','母は呼び名を一度間違え、本人が望む今の名へ言い直した。','restore',[set('motherInformed')]);
  route('well','new','named',{companions:['lui']});end('named','workshop','本人が選んだ新しい呼び名を工房へ記した。記憶の欠落は回復済みにしない。','new',[set('newNameChosen')]);
  route('well','seal','water',{companions:['lui'],preparation:[set('wellSealed')]});end('water','water','井戸を封じたことと記憶の未回復を窓口へ伝え、代わりの水場を手配した。','seal',[set('waterArranged')]);
 }
 if(q.number===173){
  town('home','テラの家','machine_tera');field('grave','墓守の精霊との面談場所','cemetery',3,5);entity('tera','home','person');entity('spiritPerson','grave','person');const from=intake('home','夜に帰る姿について、テラの家を訪ねる。本人と精霊の話は別々に聞く。');node('spirit').place='grave';
  route('spirit','wife','wife');add('wife','home','テラに帰ってくる音を失いたくない気持ちを聞いた。客としての滞在は、まだ双方の合意ではない。',[opt('return','墓地へ戻り、精霊と相談する','spirit')]);
  route('spirit','guest','guest_agree',{companions:['spiritPerson']});end('guest_agree','home','精霊とテラの双方に、夫でなく客として暮らす意思を確かめた。精霊は自分の食べたい料理を頼む。','guest',[set('bothAgreed')]);
  route('spirit','part','part_home');end('part_home','home','精霊が墓地へ戻る別れを伝えた。テラが自分で戸を閉じる時刻を決める。','part',[set('parted')]);
  route('spirit','copy','copy_home',{companions:['spiritPerson']});add('copy_home','home','当面は夫の模倣を続ける。後日、家具を動かす話が出た。',[opt('later','家具の置き方について改めて話す','copy_later',{effects:[set('laterVisit')]})]);end('copy_later','home','精霊は家具を動かす相談へ答えられなかった。模倣の安らぎと限界を残す。','copy',[set('imitationContinues')]);
 }
 if(q.number===174){
  field('procession','止まらない葬列と棺','cemetery',9,3);town('hut','道化師の遺書のある小屋','machine_hut');town('rescue','歩けない人の救護先','salome_clinic');entity('letterSheet','hut');entity('injured','procession','group');entity('daughterPerson','procession','person');const from=intake('procession','道化師の葬列が止まらないという知らせを受け、墓地道へ向かう。');node('letter').place='hut';
  for(const [src,key] of [[from,'seal'],['letter','seal']])route(src,key,'sealed');end('sealed','procession','棺を封じて列の動きを止めた。弔いは未完で、土地に怪異が残る。','seal',[set('coffinSealed')]);
  route('letter','name','named',{depart:[give('letterSheet','hut','party')]});end('named','procession','本人の名を遺書で確かめて送り、葬列を終えた。娘に涙や赦しを要求しない。','name',[give('letterSheet','party','procession'),set('mourned')]);route(from,'people','rescued',{companions:['injured']});end('rescued','rescue','歩けない人を救護先へ引き継いだ。葬列そのものは終わっていない。','rescue',[set('rescued')]);
 }
 if(q.number===175){
  field('lair','獣の寝床と訓練標','valley',7,3);town('practice','非公開の稽古場','library_rehearsal');town('public','偽の突撃を見せる広場','library_stage');field('route_place','畑を避けて空ける谷道','valley',11,5);field('warning_place','谷の向こうの集落の見張り場','valley',15,7);entity('miro','lair','person');entity('sister','lair','person');const crew=['miro','sister'];const from=intake('lair','獣の動きを調べるため、ミロの待つ谷へ向かう。');node('hidden').place='practice';node('route').place='public';node('warning').place='route_place';
  for(const [src,key] of [[from,'hidden'],[from,'fake'],['hidden','decoy'],['route','hidden'],['route','guide']])choice(src,key).companions=crew;
  const hidden=choice('hidden','fight');delete hidden.combat;route('hidden','fight','battle',{companions:crew,depart:[set('secretPractice')]});add('battle','lair','非公開で練った戦法を、獣のいる現場で実行する。',[opt('fight','別戦法で獣と戦う','changed',{combat:'story_175'}),opt('retreat','戦場を離れ、非公開の稽古場へ戻る','hidden',{companions:crew})]);end('changed','lair','別戦法で獣を退けた。ミロが妹へ変更の必要を認める。','changed',[set('defeated')]);
  route('warning','warn','warned',{companions:crew});end('warned','warning_place','集落の見張りへ獣の行先を伝え、警戒を引き継いだ。誘導は討伐ではない。','drive',[set('warned')]);choice('route','guide').effects=[set('driven')];delete choice('warning','pursue').combat;route('warning','pursue','pursuit',{companions:crew});add('pursuit','warning_place','獣を谷の先まで追った。現地で戦い、逃れた場合は谷道へ戻れる。',[opt('fight','別戦法で獣を退ける','pursued',{combat:'story_175'}),opt('retreat','戦いを切り上げ、谷道へ戻る','warning',{companions:crew})]);end('pursued','warning_place','追って獣を退け、向こう側の見張りへ結果を伝えた。','changed',[set('defeated'),set('reported')]);
 }
 if(q.number===176){
  field('shrine','草鞋を待つ神の祠','outskirts',3,5);town('priest','司祭と補修当番の窓口','machine_registry');field('road_place','住民が直す道','outskirts',7,7);field('departure','旅立ちの分かれ道','outskirts',15,5);entity('sandals','entry');entity('godPerson','shrine','person');const from=intake('shrine','預かった左右の違う草鞋を持ち、外縁の祠へ向かう。');choice('entry','visit').depart=[give('sandals','entry','party')];node('road').place='priest';
  route(from,'give','travel',{companions:['godPerson'],depart:[give('sandals','party','godPerson')]});route('road','give','return_shrine');add('return_shrine','shrine','補修体制に旅立ちの許可を結び付けず、草鞋を返した。',[opt('seeoff','神と分かれ道まで歩く','travel',{companions:['godPerson'],depart:[give('sandals','party','godPerson')]})]);end('travel','departure','草鞋を履いた神が旅立ち、最初の分かれ道で行商人に道を聞いた。','travel',[set('departed')]);
  choice(from,'keep').effects=[set('heldAsCondition')];route('road','agree','repair');add('repair','road_place','住民と道を点検し、季節ごとの補修当番と司祭の不在告知を確認する。',[opt('return','祠へ戻り、神へ当番と予定を伝える','season_return',{depart:[set('maintenanceAgreed')]})]);add('season_return','shrine','季節ごとに戻る約束を確認し、草鞋を返す。',[opt('seeoff','神を分かれ道まで見送る','season',{companions:['godPerson'],depart:[give('sandals','party','godPerson')]})]);end('season','departure','神が歩き始めた。不在の日があることと補修当番を、祭の予定へ残す。','season',[set('departed'),set('absenceAnnounced')]);
 }
 if(q.number===177){
  town('shop','像を残す鏡の商店','machine_mirror');town('post','場所と日付を照合する配達所','library_post');town('public','客への公開告知窓口','library_review');entity('evidence','shop');entity('mirrorDevice','shop');const from=intake('shop','鏡が未来を映すという宣伝について、配達人から相談を受けた。店で像と説明を確かめる。');node('proof').place='post';choice(from,'compare').depart=[give('evidence','shop','party')];
  for(const key of ['notice','close'])route(from,key,key);for(const key of ['correct','close'])route('proof',key,key);
  end('notice','public','予言としての販売を保留し、像の日時は未確認と告知する。客へ決断を急がないよう伝えた。','notice',[set('noticePosted')]);end('correct','public','配達記録を添えて時差を公開訂正した。客への補償は別の仕事として残す。','correct',[give('evidence','party','public'),set('corrected')]);
  add('close','shop','営業を止め、鏡と取引記録を壊さず保管した。',[opt('notice','営業停止と証拠の保管を窓口へ届ける','closed',{depart:[transfer('evidence','party','shop'),set('closed'),set('evidencePreserved')]})]);end('closed','public','営業停止を告知した。調査前なら像の日時は未確認のまま残す。','close',[set('closurePosted')]);
  route('proof','window','consent');add('consent','post','配達所を通じて、相手側が映す場所の範囲に同意した返事を受け取った。',[opt('return','同意範囲を持ち、店の鏡を設定する','window',{depart:[set('consentReceived')]})]);end('window','shop','同意した場所だけを映す窓として設定し、予言の宣伝を取り下げた。','window',[give('evidence','party','shop'),set('windowConfigured')]);
 }
 if(q.number===178){
  town('family_place','宿の家族の相談室','machine_family');town('morning_place','扉の先の翌朝の部屋','machine_morning');town('host','手紙を受け取る宿主の席','salome_inn');entity('testObject','entry');entity('ribbon','morning_place');entity('letterSheet','morning_place');entity('daughterPerson','family_place','person');entity('parentPerson','family_place','person');node('family').place='family_place';
  choice('entry','test').effects=[set('objectReturned')];route('family','wait','wait_talk');add('wait_talk','family_place','親子で今夜の話をした。扉を使わず普通の朝を待つ。',[opt('morning','朝になってから、親子と部屋へ行く','wait',{companions:['daughterPerson','parentPerson'],depart:[set('talked'),set('ordinaryMorning')]})]);end('wait','morning_place','忘れた髪紐を本人へ渡して送り出す。時刻を越える扉は使わない。','wait',[give('ribbon','morning_place','daughterPerson')]);
  route('family','daughter','daughter_door',{companions:['daughterPerson'],depart:[set('daughterAgreed')]});add('daughter_door','entry','戻れないことを承知した娘が扉を越えた。今夜の話し合いを済ませたことにはしない。',[opt('morning','普通に朝を待ち、手紙のある部屋を訪ねる','morning',{companions:['daughterPerson'],depart:[set('daughterCrossed'),set('nightClosed')]})]);
  route('family','player','player_door',{companions:['daughterPerson'],depart:[set('playerAgreed')]});add('player_door','entry','娘に続いて翌朝へ越える。夜の判断へ戻る行為はない。',[opt('cross','戻れない扉を越えて翌朝へ進む','morning',{companions:['daughterPerson'],depart:[set('playerCrossed'),set('daughterCrossed'),set('nightClosed')]})]);node('morning').place='morning_place';route('morning','finish','delivered',{depart:[give('letterSheet','morning_place','party')]});end('delivered','host','机の手紙を宿主へ渡した。言えなかった話は済んだことにせず、髪紐は忘れ物として残す。','cross',[give('letterSheet','party','host'),set('letterDelivered')]);
  for(const src of ['entry','family'])route(src,'close','closed');end('closed','entry','扉を封じた。人は越えず、明日のことは明日確かめる。','close',[set('doorSealed')]);
 }
 if(q.number===179){
  field('garden','根を伸ばす墓標の庭','cemetery',11,5);field('junction','三家を訪ねる分かれ道','outskirts',7,3);town('rescue','住居被害を引き継ぐ救援窓口','salome_clinic');entity('keeper','garden','person');int('homes',3);const from=intake('garden','墓標から家の床へ根が伸びるという知らせを受け、墓地の庭を調べる。');node('houses').place='junction';choice(from,'begin').companions=['keeper'];
  const visit=choice('houses','visit');node('houses').options=node('houses').options.filter(a=>a!==visit);
  for(let i=1;i<=3;i++){field('house'+i,`墓標を受け取った第${i}家`,'outskirts',i===1?3:i===2?9:13,7);entity('marker'+i,'house'+i);x.flags['house'+i]=false;node('houses').options.unshift(opt('house'+i,`第${i}家で本人の意思を聞く`,'house'+i,{when:not(eq(v('house'+i),true)),companions:['keeper']}));add('house'+i,'house'+i,'本人に根の危険を伝え、標の回収か拒絶の宣言を選んでもらう。',[
   opt('collect','本人の希望で標を回収する','house'+i+'_done',{effects:[give('marker'+i,'house'+i,'party'),set('house'+i),set('homes',{op:'add',args:[v('homes'),1]})]}),
   opt('reject','標を受け入れないという宣言を確認する','house'+i+'_done',{effects:[set('house'+i),set('homes',{op:'add',args:[v('homes'),1]})]})
  ]);add('house'+i+'_done','house'+i,'この家の意思を記録した。他の家の返事を代わりに決めない。',[opt('return','墓守と分かれ道へ戻る','houses',{companions:['keeper']})]);}
  route('houses','starve','starved',{companions:['keeper']});end('starved','garden','三家の拒絶または回収を照合し、枯れた標の見張り当番を決めた。','starve',[set('starved'),...[1,2,3].map(i=>transfer('marker'+i,'party','garden'))]);
  route('houses','cut','cut1',{companions:['keeper'],preparation:[set('ropeUsed')]});for(let i=1;i<=3;i++)add('cut'+i,'house'+i,'家の床と墓標の根の接続を確認し、切り離す。',[opt('cut',i<3?'この家の根を切り、次の家へ向かう':'最後の家の根を切り、庭へ戻る',i<3?'cut'+(i+1):'burned',{companions:['keeper'],depart:[set('root'+i+'Cut')]})]);end('burned','garden','三家への根を全て切り離した後で庭を焼いた。家の修繕が必要な被害は出していない。','burn',[set('burned')]);
  route('houses','rush','rush',{companions:['keeper']});add('rush','garden','根を切らずに庭を焼いたため、つながった住居にも火が届いた。危険の除去と救援を分けて報告する。',[opt('report','墓守と救援窓口へ行く','damaged',{companions:['keeper'],depart:[set('burned'),set('homesDamaged')]})]);end('damaged','rescue','被害の出た家を報告し、住居の修繕を引き受けた。','damage',[set('aidRequested')]);
 }
 if(q.number===180){
  town('tale','語り部と聞き手のいる宿','salome_inn');town('scripts_place','散った台本の保管庫','machine_scripts');town('refuge','聞き手が待つ別室','machine_family');entity('mui','tale','person');entity('listeners','tale','group');entity('scriptPages','scripts_place');const from=intake('tale','未完の怪談の怪物について、語り部ムイのいる宿を訪ねる。');node('ending').place='scripts_place';choice(from,'scripts').companions=['mui'];
  for(const [key,outcome] of [['original','home'],['new','new']]){route('ending',key,'told_'+key,{companions:['mui'],depart:[give('scriptPages','scripts_place','party')]});end('told_'+key,'tale',key==='original'?'聞き手の席を整え、元の帰郷まで語り終えた。討伐したという記録は付けない。':'起きた事実を消さず、遠い宿へ帰る後半を最後まで語った。',''+outcome,[give('scriptPages','party','mui'),set('storyFinished')]);}
  route(from,'seal','sealed_here');route('ending','seal','sealed_here',{companions:['mui']});add('sealed_here','tale','怪異を封じた。話は未完のままなので、聞き手を退避させて台本を管理する。',[opt('escort','ムイと聞き手を別室へ案内する','sealed_refuge',{companions:['mui','listeners'],depart:[set('phenomenonSealed')]})]);add('sealed_refuge','refuge','聞き手の退避を確認した。未完の台本は勝手に開けない保管品にする。',[opt('store','ムイと台本庫へ戻り、保管を確認する','stored',{companions:['mui']})]);end('stored','scripts_place','台本庫に封印の制約を記した。話を完結させたことにはしない。','seal',[set('stored')]);
  route(from,'ban','banned',{companions:['mui','listeners']});end('banned','refuge','語りの禁止を告知し、聞き手を静かな別室へ案内した。未完の話の扱いは後日に残す。','ban',[set('banned')]);
 }
 return finish();
}
