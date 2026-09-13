import catalog from './catalog-q011-q020.json' with {type:'json'};
import {eq,and,T} from './scenario-kit.mjs';
const rows=structuredClone(catalog),R=key=>({ref:`flags.flow.__Q__.${key}`}),F=key=>eq(R(key),true);
const setup=(n,initial,agents)=>Object.assign(rows.find(q=>q.id===`q${String(n).padStart(3,'0')}`),{initial,agents});
const scene=(q,id,text,options)=>{const node=q.nodes.find(n=>n.id===id);if(options.length!==node.options.length)throw Error(`${q.id}/${id}: option count`);node.text=text;node.options=node.options.map((o,i)=>({...o,...options[i]}));};
const requireEnds=(q,requirements)=>{for(const [id,requires] of Object.entries(requirements))q.outcomes[id].requires=requires;};
{
 const q=setup(11,{signKnown:false,signDestroyed:false,arrowKnown:false,rescued:false,repainted:false,ropeLaid:false,peopleAt:'safeTunnel'},[
  {id:'mel',name:'メル',goal:'戻らない同僚を連れ帰る'},{id:'colleague',name:'メルの同僚',goal:'迷った坑夫たちを再び一人にしない'}]);
 scene(q,'entry','白い塊は、灯を掲げた人のようにも、ヴェールをかぶった花嫁のようにも見えた。メルの同僚の靴跡は、その前を通って分岐の奥へ続く。台座と指先には塩が厚く積もっていた。',[
  {id:'brush',set:{signKnown:true,arrowKnown:true}},
  {id:'break',set:{signDestroyed:true,arrowKnown:true,rescued:true,peopleAt:'entrance'},textAfter:'砕けた塩の下に台座の矢印が現れた。足跡と重なる方向へ進むと、同僚が迷った坑夫たちと待っている。「一人で戻れば、またはぐれると思った」。全員を分岐の外へ連れ帰った。'},
  {id:'rope',cost:{rope:1},set:{ropeLaid:true,rescued:true,peopleAt:'entrance'},textAfter:'像の正体は決めず、帰路の縄を延ばして足跡を追う。同僚は迷った坑夫たちと安全坑で待っていた。全員に縄をたどってもらい、メルのいる入口へ戻った。'}]);
 scene(q,'sign','塩を払うと、灯を掲げた腕と台座の矢印が同じ坑を指した。避難先を示す標識だった。人の声はその先から聞こえる。像が何か分かっても、坑夫を連れ帰ったことにはならない。',[
  {id:'guide',set:{rescued:true,peopleAt:'entrance',repainted:true},textAfter:'標識の先で同僚と坑夫たちを見つけた。全員を入口へ導いてから、像の腕、矢印、避難先を塗り直した。'},
  {id:'rope',cost:{rope:1},set:{ropeLaid:true,rescued:true,peopleAt:'entrance'},textAfter:'標識の役目は記録した。修復は後日に回し、足跡に沿って縄を延ばして全員の帰路をつないだ。'}]);
 requireEnds(q,{informed:and(F('signKnown'),F('rescued'),F('repainted')),contract:and(F('signDestroyed'),F('rescued')),compromise:and(F('ropeLaid'),F('rescued'))});
}
{
 const q=setup(12,{tested:false,marksSeen:false,ledgerCompared:false,ownerConsent:false,loaned:false,returned:false,selectedOnly:false,toolsAt:'dan'},[
  {id:'dan',name:'ダン',goal:'継いだ工房の名工の仕事を確定して展示する'},{id:'miners',name:'借用を望む坑夫たち',goal:'用途に合う道具を正規に借りる'}]);
 const loan={ownerConsent:true,tested:true,loaned:true,toolsAt:'oneDisplayedTwoOnLoan'};
 scene(q,'entry','ダンが管理する三本には、同じ大きな銘がある。刃の幅と厚みは違う。「親方が鍛えた本物を一本、展示したい」。借用を望む坑夫たちは、まだ道具へ手を伸ばしていない。',[
  {id:'trial',set:{tested:true,toolsAt:'trialGround'}},
  {id:'sharp',set:{selectedOnly:true,returned:true,toolsAt:'oneDisplayedTwoStored'},textAfter:'一度の試し切りで最も鋭かった一本だけを選んだ。ダンはそれを展示へ回し、二本を保管庫に置いた。用途別の比較も製作台帳の照合もしていない。'},
  {id:'lend',set:loan,textAfter:'ダンの了承を得て三本をそれぞれ硬岩、塩層、割れ目で試す。用途に合う二本を貸出帳へ記し、一本は工房の展示へ残した。作り手はまだ確定していない。'}]);
 scene(q,'trial','硬岩には刃先の耐久、塩層には食い込みと剥離、狭い割れ目には細さと取り回しが利いた。一本の切れ味だけで、残りを贋作とは言えない。ダンは、柄の差込口を調べる道具を出した。',[
  {id:'shop',set:{marksSeen:true,toolsAt:'dan'}},
  {id:'lend',set:loan,textAfter:'使い比べた結果をダンへ伝え、貸出の了承を得た。小印と製作台帳は照合せず、一本の展示と二本の貸出を記帳した。'}]);
 scene(q,'makers','柄を外した内側には、それぞれ違う小印があった。大きな工房銘とは別の印だ。ダンは旧工房の製作台帳を開く。「印だけで名前を決めず、ここに残った記録と合わせよう」。',[
  {id:'names',set:{ledgerCompared:true,returned:true,toolsAt:'dan'},textAfter:'小印と用途を台帳の製作記録へ照合すると、親方と二人の弟子の仕事が一つずつ現れた。ダンは三本を受け取り、作り手ごとの展示札を書いた。'},
  {id:'loan',set:loan,textAfter:'小印は記録したが、台帳照合は後日に残した。ダンの了承を得て、用途の合う坑夫へ二本を貸し出した。'}]);
 requireEnds(q,{informed:and(F('tested'),F('marksSeen'),F('ledgerCompared'),F('returned')),contract:and(F('selectedOnly'),F('returned')),compromise:and(F('ownerConsent'),F('tested'),F('loaned'))});
}
{
 const q=setup(13,{rootKnown:false,waterRouteKnown:false,rangeMeasured:false,rootCut:false,miningStopped:false,detourMarked:false,monitoring:false},[
  {id:'sei',name:'セイ',goal:'塩を採る利益と、膨張に対する作業方針を決める'}]);
 scene(q,'entry','塩層がゆっくり張り出し、しばらくすると緩む。小石が切羽の下へ落ちた。セイは採掘を止めている。「薄く剥がして中を見るか、ここを止めるか」。膨張範囲の外には、調査標を置ける足場があった。',[
  {id:'sample',set:{rootKnown:true,waterRouteKnown:true}},
  {id:'stop',set:{miningStopped:true,monitoring:true},textAfter:'膨らむ範囲を外から測って調査標を置いた。中の正体は断定せず、周期と湖面の記録を専門家へ引き継ぎ、今日の採掘を止めた。'},
  {id:'cut',set:{rootKnown:true,rootCut:true},textAfter:'塩層を割ると湿った太根が現れた。セイは周囲の良質な塩を指し、切断を求める。根を切ると膨張は止まった。湖の水を運ぶ根の一本を失い、後日の観測では湖面が徐々に上がった。'}]);
 scene(q,'root','薄く削った塩の下で、生きた根が水を吸って膨らんだ。根は地下湖から地上の巨木へ続いている。セイは析出した塩を手で量った。「これを避ける分、採れる量は減る」。根の外側にも、崩れやすい湖岸があった。',[
  {id:'trace',set:{rangeMeasured:true,detourMarked:true,monitoring:true},textAfter:'根の膨張範囲と湖岸の地盤を測り、両方を避けて迂回坑の線を引いた。周期を記録する場所も膨張範囲の外へ置いた。'},
  {id:'stop',set:{miningStopped:true,monitoring:true},textAfter:'根を切らず、周期と湖面の観測を専門家へ引き継いだ。迂回坑を掘るかも決めず、採掘停止を届け出た。'}]);
 q.outcomes.compromise.text='膨張範囲の外へ調査標を置き、周期と湖面の記録を専門家へ引き継いだ。調査で根を確認していれば、その情報も渡した。セイは採掘停止に不満を残したが、坑夫は危険な切羽へ入らずに済んだ。根を残すか切るか、迂回坑を掘るかは決めていない。';
 requireEnds(q,{informed:and(F('rootKnown'),F('waterRouteKnown'),F('rangeMeasured'),F('detourMarked')),contract:F('rootCut'),compromise:and(F('miningStopped'),F('monitoring'))});
}
{
 const q=setup(14,{opened:false,injuryKnown:false,treated:false,consent:false,registered:false,home:false,workerAt:'underfloor',safeTransport:false,forcedHaul:false},[
  {id:'hodo',name:'ホド',goal:'運行を止め、空荷のはずの貨車の過荷重を確かめる'},{id:'worker',name:'負傷した坑夫',goal:'治療を受けたいが給金控除や坑主の報復を恐れている'},{id:'crew',name:'同じ組の坑夫たち',goal:'仲間を帰宅させ、当日の給金を守る'}]);
 scene(q,'entry','空荷票の付いた貨車が、巻上げの途中で止まっている。ホドは運転綱を外した。「床下に何かある。俺は積んでいない」。床板は閉じたままで、人がいるかも分かっていない。',[
  {id:'unload',set:{opened:true,injuryKnown:true}},
  {id:'haul',set:{forcedHaul:true,workerAt:'home',home:true},textAfter:'床下を開けず、増えた荷重のまま貨車を地上へ巻き上げた。仲間たちは人目のない所で負傷者を降ろし、家へ運んだ。ホドの運行票には床下の人の記録が残らなかった。'}]);
 scene(q,'injured','床下には脚を負傷した坑夫が、固定具もないまま横たわっていた。仲間は給金を守るため隠したと認める。「治療は受けたい。でも、事故を届けた奴の次の持ち場はどうなる」。ホドは人員籠と治療所への搬送を手配できると言った。',[
  {id:'split',set:{safeTransport:true,workerAt:'home',home:true},textAfter:'貨車から担架で降ろし、別の人員籠で地上へ運んだ。仲間が家まで付き添った。鉱山には作業中の負傷として届け出ていない。'},
  {id:'medical',set:{safeTransport:true,workerAt:'clinic',treated:true},textAfter:'治療所へ先に搬送して脚の処置を受けた。本人には、事故の届出が補償審査を開く一方、坑主との関係に不利益を招くおそれも説明した。'}]);
 scene(q,'clinic','処置は済んだ。治療所の受診記録はあるが、鉱山への事故申請はまだ出していない。係員は発生場所と時刻の欄を空け、坑夫本人の返事を待っている。',[
  {id:'register',set:{consent:true,registered:true},textAfter:'坑夫は同意し、切羽の場所、時刻、負傷内容を申告した。家族が治療所へ来た。ホドは安全な人員搬送設備の申請を別に出した。'},
  {id:'quiet',set:{home:true,workerAt:'home'},textAfter:'坑夫は鉱山への届出を見送った。治療所で受けた処置の記録は残し、安全な搬送便で帰宅した。'}]);
 requireEnds(q,{informed:and(F('treated'),F('consent'),F('registered')),contract:and(F('forcedHaul'),F('home')),compromise:and(F('safeTransport'),F('home'))});
}
{
 const q=setup(15,{lostNames:3,restoredNames:0,protected:false,copied:false,recordsChecked:false,familiesChecked:false,waterStudied:false,published:false,blankPublished:false,sealed:false,rosterAt:'underPillar'},[
  {id:'maya',name:'マヤ',goal:'巡礼前に水の由来を確かめ、死者の名簿を守る'}]);
 scene(q,'entry','目元から落ちた塩水が、台座の亀裂を伝って収納室へ入っている。名簿の三名は、来た時点ですでに読めなかった。マヤは残る文字へ乾布をかざす。「今ある名まで消える前に」。',[
  {id:'catch',set:{protected:true,copied:true},textAfter:'受け皿で滴をそらし、原本を乾かしながら読める名前を写した。すでに消えた三名は、止水だけでは戻らなかった。'},
  {id:'exorcise',set:{sealed:true},textAfter:'柱内部の割れ目を塞いで新しい滴を止めた。湿った原本は収納室に残り、乾燥処置も副記録との照合も行っていない。'},
  {id:'chapel',set:{protected:true,rosterAt:'dryRoom'},textAfter:'原本を吸水用の乾布で挟み、乾いた保管室へ移した。筆写も公開も、失われた三名の照合もまだしていない。'}]);
 scene(q,'copy','滴は名簿から外れ、読める名の写しができた。三つの空欄を前に、マヤが事故当時の坑務記録と遺族への照会先を並べた。どちらか一方の記憶だけで埋めることはできない。',[
  {id:'complete',set:{recordsChecked:true,familiesChecked:true,restoredNames:3,waterStudied:true,published:true,rosterAt:'dryRoom'},textAfter:'坑務記録を取り寄せ、遺族の確認と照合した。双方で確認できた三名を復元し、原本では読めなかったことも記した。採取した水と割れ目を調べ、塩層からの水だと分かる資料を添えて公開した。'},
  {id:'missing',set:{blankPublished:true,published:true,rosterAt:'dryRoom'},textAfter:'三名は推測で補わず、空欄と照会先を残した。読める名前と、原本で失われていた事実を公開した。'},
  {id:'deposit',set:{rosterAt:'dryRoom'},textAfter:'公開を見送り、原本と作成済みの写しを乾いた保管室へ預けた。消えた三名は未照合のまま残した。'}]);
 requireEnds(q,{informed:and(F('protected'),F('copied'),F('recordsChecked'),F('familiesChecked'),eq(R('restoredNames'),3),F('waterStudied'),F('published')),contract:F('sealed'),compromise:and(F('protected'),eq(R('rosterAt'),'dryRoom')),missing:and(F('protected'),F('copied'),F('blankPublished'),eq(R('restoredNames'),0))});
}
{
 const q=setup(16,{materialKnown:false,shelterKnown:false,siteChecked:false,peopleMoved:false,powderReturned:false,booksCorrected:false,purchased:false,trial:false,vibrationChecked:false,blasted:false,forceBlasted:false},[
  {id:'nef',name:'ネフ',goal:'火薬の行方を確かめ、採掘を再開する'},{id:'assistant',name:'発破師の助手',goal:'図面にない避難区画を発破の振動から守る'}]);
 const buy={cost:{gold:20},set:{materialKnown:true,powderReturned:true,booksCorrected:true,purchased:true},textAfter:'助手の耐火容器に支給火薬が全量残っていることを確認した。20Gで自費の封止材を工事用資材として買い上げ、火薬を倉へ戻して帳簿を訂正する。避難区画は移さず、発破も再開しなかった。'};
 scene(q,'entry','導火線は燃えたが、岩は割れていない。ネフが支給簿を示す。「装薬した分がない。盗られたのか」。孔には湿った灰色の詰め物が残り、助手の足跡が脇の区画へ続いていた。',[
  {id:'assistant',set:{materialKnown:true,shelterKnown:true},textAfter:'残った詰め物は火薬ではなく、水と粘土を主体とする不燃性の封止材だった。助手を追うと、支給火薬を入れた耐火容器と図面にない避難区画が見つかった。'},
  {id:'blast',set:{blasted:true,forceBlasted:true},textAfter:'疑いだけで魔物を倒し、別の標準火薬を装薬した。退避確認をしないまま発破すると、現行図にない区画へ振動が届いた。住民は割れた食器と寝台を残し、さらに奥へ逃げた。'},
  {id:'buy',...buy}]);
 scene(q,'shelter','古い図にはない部屋に寝台が並ぶ。助手は抜き取った火薬の耐火容器を指した。「売ったんじゃない。ここへ振動を通したくなかった」。ネフは初めて住民を見た。移転候補の区画は、床と支柱、二つの出口を確かめる必要がある。',[
  {id:'warehouse',set:{siteChecked:true},textAfter:'床と補強済みの支柱を点検し、二つの出口まで寝台を通せることを確認した。まだ住民を移したわけではない。'},
  {id:'buy',...buy}]);
 scene(q,'move','移転先の安全と二方向の退路は確認できた。住民はまだ元の区画にいる。ネフは少量の標準火薬を別に用意し、先に全員と寝台を運び出すよう求めた。',[
  {id:'evacuate',need:['siteChecked'],set:{peopleMoved:true,powderReturned:true,booksCorrected:true,trial:true,vibrationChecked:true,blasted:true},textAfter:'住民と寝台を移して到着を確認した。助手は保管火薬を倉へ戻し、無断変更を申告する。少量の試験発破を行い、移転先の振動を測ってから採掘を再開した。'},
  {id:'cancel',...buy}]);
 requireEnds(q,{informed:and(F('siteChecked'),F('peopleMoved'),F('powderReturned'),F('booksCorrected'),F('trial'),F('vibrationChecked')),contract:F('forceBlasted'),compromise:and(F('purchased'),F('powderReturned'),F('booksCorrected'))});
}
{
 const q=setup(17,{recordsCompared:false,remainsKnown:false,emptyKnown:false,peersConsent:false,familyConsulted:false,inscribed:false,removed:false,boxAt:'undergroundTomb'},[
  {id:'family',name:'坑夫遺族会',goal:'遺骨の所在を確かめ、二つの墓の扱いを決める'},{id:'peers',name:'空墓を作った坑夫たち',goal:'回収不能と思った仲間を待った場所を残す'}]);
 const compare={recordsCompared:true,remainsKnown:true,emptyKnown:true};
 const deliver={emptyKnown:true,peersConsent:true,boxAt:'family'};
 scene(q,'entry','地上墓の埋葬記録には事故の後の日付がある。地下には同じ名前の墓があり、墓守は納めた物を見せると言った。救助坑の回収記録も手元にある。二つの墓がある理由は、まだ照合していない。',[
  {id:'family',set:compare,textAfter:'埋葬記録と救助坑の回収記録を合わせ、回収された遺骨が地上墓にあることを確認した。地下墓には弁当箱だけがあり、仲間は遺体を回収できないと思った時に作ったと話した。'},
  {id:'remove',set:{...compare,removed:true,boxAt:'peers'},textAfter:'埋葬記録、回収記録、地下墓の中身を照合し、遺骨が地上にあることを確認した。弁当箱は建立した仲間へ返し、空墓を撤去した。'},
  {id:'box',set:deliver,textAfter:'地下墓を開けた仲間に弁当箱の来歴を聞き、持ち出す了承を得た。家族へ届け、事故直後に作られた弔いの場所の話を伝えた。記録全体の照合や墓の処分までは決めていない。'}]);
 scene(q,'family','仲間が地下の空墓を作った後、別方向の救助坑から遺体が戻っていた。家族は地上の埋葬だけを知っていた。「二つに分けた骨じゃなかったのね」。弁当箱はまだ地下墓にある。',[
  {id:'both',set:{familyConsulted:true,inscribed:true},textAfter:'遺族と建立した仲間の言葉を聞き、空墓であること、作られた時期、建立者の名を刻んだ。家族は地下の弁当箱へ花を供えた。'},
  {id:'box',set:deliver,textAfter:'照合した遺骨の所在は記録に残した。仲間の了承を得て弁当箱を遺族へ渡したが、地下墓の由来の刻字は見送った。'}]);
 q.progression='記録を照合する経路では、二つの墓と回収記録から遺骨の所在を確定する。空墓を撤去する場合も先に照合する。弁当箱だけを届ける場合は仲間の了承を得て、墓の扱いは決めずに残す。';
 requireEnds(q,{informed:and(F('recordsCompared'),F('remainsKnown'),F('familyConsulted'),F('inscribed')),contract:and(F('recordsCompared'),F('emptyKnown'),F('removed')),compromise:and(F('peersConsent'),eq(R('boxAt'),'family'))});
}
{
 const q=setup(18,{scheduleKnown:false,owPresent:false,paymentConfirmed:false,paperReceipt:false,completionLine:false,split:false,dissolved:false,seized:false,tabletAt:'borrower',debtEnded:false},[
  {id:'ow',name:'オウ',goal:'儀礼前に原本を取り戻し、完済を成立させず再請求する'},{id:'borrower',name:'借り手',goal:'用意した最終回の金を払い、借用証を失効させる'},{id:'official',name:'返済役人',goal:'最終支払いと原本の失効を立会人の前で記録する'}]);
 const dissolve={owPresent:true,paymentConfirmed:true,paperReceipt:true,dissolved:true,tabletAt:'dissolved',debtEnded:true};
 scene(q,'entry','借り手は川辺で、塩板を布に包んで待っている。最後の一回分の金は別の袋にあり、返済役人の机はまだ開いていない。オウの依頼は、この板を水へ入れる前に回収することだった。',[
  {id:'copy',set:{scheduleKnown:true}},
  {id:'seize',set:{seized:true,tabletAt:'ow'},textAfter:'支払いの確認前に塩板を回収し、オウへ納めた。オウは儀礼へ出席せず、原本を根拠に残額と延滞金を請求した。借り手が用意していた金を、完済済みとは記録できなかった。'},
  {id:'both',set:{owPresent:true,scheduleKnown:true},textAfter:'オウを川辺へ呼んだ。オウは原本の扱いを見届けるため現れ、借り手と返済役人の前で相談が始まった。'}]);
 scene(q,'ritual','役人は最終回の金額と時刻を帳簿で確かめた。まだ受理印は押していない。借り手が金袋を置く。「払ったあとで、この板をもう請求に使われないようにしたい」。塩板の扱いには債権者の立会いも必要だった。',[
  {id:'dissolve',set:dissolve,textAfter:'オウを呼び、双方の立会いで役人が最後の支払いを受理した。紙に完済印と立会人を記し、原本を水へ沈める。完済記録の写しをオウにも渡した。'},
  {id:'meet',set:{paymentConfirmed:true,owPresent:true},textAfter:'役人が最後の支払いを確認し、受領を記録した。塩板はまだ失効させず、オウを呼んで原本を残す案を相談した。'}]);
 scene(q,'meeting',[T(F('paymentConfirmed'),'最後の金は受理済みだ。二度払う必要はない。','最終回の金は用意されているが、役人の受理はまだだ。'),'オウは川辺に来た。役人は、完済を紙に残して溶かす方法と、完済線を刻んで二分する方法を説明した。借り手とオウはどちらを採るか返事を待っている。'],[
  {id:'split',set:{paymentConfirmed:true,paperReceipt:true,completionLine:true,split:true,tabletAt:'halves',debtEnded:true},textAfter:'未受理なら役人が最終支払いを受け取り、完済を確認した。双方の了承を得て板を横切る完済線を刻み、その線で二分して一片ずつ渡す。双方にも完済記録を残した。'},
  {id:'dissolve',set:dissolve,textAfter:'未受理なら役人が最後の支払いを受け取り、紙へ完済印と立会人を記録した。双方が見守る中で塩板を溶かした。'}]);
 requireEnds(q,{informed:and(F('paymentConfirmed'),F('owPresent'),F('paperReceipt'),F('dissolved'),F('debtEnded')),contract:and(F('seized'),eq(R('tabletAt'),'ow')),compromise:and(F('paymentConfirmed'),F('owPresent'),F('completionLine'),F('split'),F('debtEnded'))});
}
{
 const q=setup(19,{scaleChecked:false,controlSealed:true,sampleOpen:false,driedToConstant:false,moistureKnown:false,recordsCompared:false,contractCompared:false,arrearsCalculated:false,partRefunded:false,dryBasis:false,averageAgreed:false,replaced:false},[
  {id:'ruchi',name:'ルチ',goal:'朝夕の重量差の原因を確かめ、会計を直す'},{id:'owner',name:'坑主',goal:'賃金と販売で有利な計量時刻を使い分ける'},{id:'miners',name:'坑夫たち',goal:'契約に合う給金と、恣意的でない計量を求める'}]);
 scene(q,'entry','同じ袋に付けた朝夕の荷札は、違う重量を示している。ルチは秤を疑っていた。「袋を取り替えた形跡はない」。計量室には基準石、封をした対照袋、試料を取り分ける乾燥皿がある。',[
  {id:'dry',set:{scaleChecked:true,sampleOpen:true,driedToConstant:true,moistureKnown:true},textAfter:'基準石と密封した対照袋の値は安定していた。別に取り分けて開放した同じ試料を量り、時間をかけて乾燥させる。重さが減らなくなるまで量って、失われた水分量を求めた。'},
  {id:'average',set:{averageAgreed:true},textAfter:'同じ荷を朝夕に二度量り、その平均を賃金と販売の双方へ使う契約を取り交わした。秤や水分量の原因調査と、過去の精算は行っていない。'},
  {id:'replace',set:{replaced:true},textAfter:'原因を調べず、新品の秤へ交換した。時間を置くと同じ袋の重量はまた変わり、ルチは新しい調査票を出した。'}]);
 scene(q,'weigh','吸湿性の高い苦汁成分を含む塩鉱石は、開放すれば空気と水分をやり取りした。乾燥室の後は軽く、湿った保管庫の後は重い。秤の故障ではない。ただし重量差だけでは、賃金の未払い額は決まらない。',[
  {id:'books',set:{recordsCompared:true,contractCompared:true,arrearsCalculated:true},textAfter:'保存試料、計量時刻、保管状況を当時の賃金契約と台帳へ照合した。契約は販売と同じ基準での精算だったが、軽い時の重量だけが換算なしで給金に使われていた。確認可能な期間に限り不足額を計算した。'},
  {id:'average',set:{averageAgreed:true},textAfter:'調べた水分変化は記録に残した。過去の精算は行わず、今後の賃金と販売を朝夕二度の平均重量にそろえた。'}]);
 scene(q,'arrears','保存試料と契約単価まで照合できた期間について、不足額の表ができた。記録のない期間は推測で埋めていない。坑主は表を受け取ったが、まだ返金していない。',[
  {id:'settle',set:{partRefunded:true,dryBasis:true},textAfter:'確認可能な不足額を台帳へ載せ、その一部が坑夫へ支払われるのを見届けた。今後は賃金と販売を乾燥重量でそろえる単価に合意した。残額や未確認の期間まで清算済みにはしていない。'},
  {id:'limit',set:{averageAgreed:true},textAfter:'算定した表は残したが、差額を請求せず返金も受けなかった。今後の賃金と販売だけ、朝夕の平均重量で契約した。'}]);
 requireEnds(q,{informed:and(F('scaleChecked'),F('driedToConstant'),F('moistureKnown'),F('recordsCompared'),F('contractCompared'),F('arrearsCalculated'),F('partRefunded'),F('dryBasis')),contract:F('replaced'),compromise:F('averageAgreed')});
}
{
 const q=setup(20,{shiftHeld:false,keysHeld:false,recordsHeld:false,formerAt:'barrier',supportsChecked:false,entranceBraced:false,deepRepaired:false,branchesClosed:false,exitOpen:false,limitedTraffic:false,roleEnded:false,dayServed:false,recruitsSought:false,guardsDefeated:false,crownAt:'keeper'},[
  {id:'mel',name:'メル',goal:'現役坑道の予備出口を安全に使える状態へ戻す'},{id:'keeper',name:'廃坑の王と呼ばれる責任者',goal:'崩落監視と立入り管理を引き継がずには持ち場を離れられない'}]);
 const handover={shiftHeld:true,keysHeld:true,recordsHeld:true,formerAt:'ground',crownAt:'party'};
 const daily={...handover,dayServed:true,recruitsSought:true};
 scene(q,'entry','地上へ続く予備出口には防柵があり、組合が置いた二体の番兵が守っている。冠形の職責標を持つ責任者は、傷んだ支柱を示した。「人をまとめて通したら落ちる。交代か補修の引継ぎを出してくれ」。王の称号は命令書にはなかった。',[
  {id:'relieve',set:handover,textAfter:'交代時刻と監視範囲を正式に記録し、王冠、鍵、監視記録を引き継いだ。番兵が交代記録を受け入れ、前任者は地上へ休みに出た。防柵は閉じたままだ。'},
  {id:'fight',set:{guardsDefeated:true,exitOpen:true,formerAt:'dangerTunnel'},textAfter:'二体の番兵を倒して防柵を破った。支柱は補強していない。責任者は王冠を手放さず、一人で崩落を警告するため坑道へ戻った。'},
  {id:'supports',set:{supportsChecked:true},textAfter:'責任者の案内で地上側の入口と奥の危険支柱を調べた。入口を先に支えて退路を作り、奥へ進みながら補修する図を確認した。'}]);
 scene(q,'shift','前任者は地上で休んでいる。引き継いだ記録には、途切れた交代表と補修図が挟まれていた。メルが巡回の時刻を読む。「明日も最後の一人を残すのか、役目そのものを終わらせるのか」。',[
  {id:'recruit',set:{dayServed:true,recruitsSought:true},textAfter:'一日分の閉鎖監視と巡回を終え、メルと翌日以降の交代者を募った。補修はまだ終わっておらず、出口は閉鎖を続ける。'},
  {id:'repair',set:{supportsChecked:true},textAfter:'補修図と閉鎖記録を確認し、入口と危険支柱を調べた。前任者を勝手に呼び戻さず、引継ぎを受けた側として作業を始める。'}]);
 scene(q,'supports',[T(F('shiftHeld'),'王冠、鍵、監視記録はあなたが引き継いでいる。前任者は地上にいる。','王冠と鍵は責任者が保持している。補修をしない場合は、先に正式な交代記録が要る。'),'まず地上側の入口を補強すれば、奥へ入る者の退路を残せる。その後で危険支柱を交換し、不要な枝坑を閉じれば、避難路と立入り禁止区画を分けられる。'],[
  {id:'brace',need:['supportsChecked'],set:{entranceBraced:true,deepRepaired:true,branchesClosed:true,exitOpen:true,limitedTraffic:true,roleEnded:true,crownAt:'archive',keysHeld:false,recordsHeld:false,formerAt:'ground'},textAfter:'地上側の入口を先に補強し、退路を確保してから奥へ進んだ。危険支柱を交換し、不要な枝坑を閉じ、人数制限付きの避難路として通行を確認する。閉鎖記録を更新し、王冠と監視記録を組合の資料室へ納めた。'},
  {id:'shift',set:daily,textAfter:'未交代なら王冠、鍵、監視記録を正式に引き継いだ。交代済みならその記録を継続し、一日分の閉鎖監視を終えた。メルと次の交代者を募るが、補修も予備出口の開放も済んでいない。'}]);
 requireEnds(q,{informed:and(F('entranceBraced'),F('deepRepaired'),F('branchesClosed'),F('limitedTraffic'),F('roleEnded')),contract:and(F('guardsDefeated'),F('exitOpen')),compromise:and(F('shiftHeld'),F('keysHeld'),F('recordsHeld'),F('dayServed'),F('recruitsSought'))});
}
export default rows;
