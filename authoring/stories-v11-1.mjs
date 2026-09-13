import {story,O,move,give,set,see,when,and,or,not} from './story-kit.mjs';
const rows=[];
{
 const s=story(1,{entry:'灯路の入口',branch:'杖の音がする支道',post:'灯番詰所'},[['entry','branch'],['entry','post']]);
 s.entity('elder','branch','elder',{mobility:'elderMobility'}).entity('rookie','entry','rookie').entity('rine','post','rine').entity('rescuers','post','rescuers',{kind:'group'}).entity('oldBottle','elder').entity('newBottle','rookie');
 s.enum('elderMobility','assisted',['assisted','mobile'],'老人は意識があるが、帰路には介助が必要').bool('consent').bool('taught').bool('reported').bool('mapped').bool('dawn');
 s.int('oldOil',0,0,2,'老人の油瓶に残る油', 'oldBottle').int('newOil',2,0,2,'新人が受け取った油','newBottle').int('oilUsed',0,0,2,'灯に使った油');
 s.fact('gift','老人は新人に残りの油を渡した').fact('position','二人の位置を直接確認した');
 s.invariant('oil_total',{op:'eq',left:{op:'add',args:[s.v('oldOil'),s.v('newOil'),s.v('oilUsed')]},right:2},'油は受け渡しで増えず、点灯分だけ減る');
 s.past=['交代前、老人は道に迷った新人へ自分の油を渡した。新人は入口へ出たが、老人の名を呼べずにいる。'];
 s.progression='入口の新人、支道の老人、詰所を区別する。先に運んだ老人は詰所に残り、新人との再会では移動しない。';
 const report=[move('party','entry','post'),set('mapped'),set('reported')];
 s.node('entry','entry',['rookie'],'最後の灯の下で、新人が油瓶を抱えている。支道から杖の音が一度した。老人の姿はまだ見えない。',[O('talk','新人に、油瓶と老人のことを尋ねる','rookie',[see('gift','rookie'),set('consent')]),O('clear','暗い支道を掃討し、老人を詰所へ運ぶ','carried',[move('party','entry','branch'),see('position','elder'),move('party elder','branch','entry','post')],{combat:true}),O('map','杖の音がした範囲を地図に記し、詰所へ届ける','report',report)]);
 s.node('rookie','entry',['rookie'],'「油は、あの人にもらいました。僕が帰らないと、叱られると思って」。新人は話し終えると、支道へ同行すると答えた。',[O('together','新人と一緒に支道へ向かう','old',[move('party rookie','entry','branch'),see('position','elder')],{when:s.is('consent')}),O('team','新人には入口で待ってもらい、救助を頼む','report',report)]);
 s.node('old','branch',['elder','rookie'],'老人は壁にもたれ、空の瓶を差し出した。「叱るのは、明るい所へ帰ってからでもできる」。二人とも、あなたと戻ることに同意した。',[O('share','油を一単位ずつ分け、二人を介助して帰路を点灯する','@informed',[{op:'pour',from:'newOil',to:'oldOil',amount:1},{op:'consume',key:'oldOil',amount:1,sink:'oilUsed'},{op:'consume',key:'newOil',amount:1,sink:'oilUsed'},move('party elder rookie','branch','entry','post'),set('taught'),set('reported')]),O('team','二人を支道で待たせ、位置を救助隊へ知らせる','report',[move('party','branch','entry','post'),set('mapped'),set('reported')])]);
 s.node('carried','post',['rine','elder'],'老人を詰所の寝台へ運び入れた。新人は入口に残っている。「私の油はあの子が持っとる」。老人は救出名簿の空欄を指した。',[O('return','老人を詰所に残し、新人を迎えに戻る','reunion',[move('party','post','entry')]),O('contract','老人だけの救出として始末書を提出する','@contract',[set('reported')]),O('team','新人の残る入口を救助隊へ知らせる','report',[set('mapped'),set('reported')])]);
 s.node('reunion','entry',['rookie'],'新人は同じ灯の下で待っていた。老人が詰所にいると伝えると、油瓶を握り直した。「一緒なら、戻れます」。',[O('bring','新人を詰所へ連れて帰る','lesson',[set('consent'),move('party rookie','entry','post')])]);
 s.node('lesson','post',['rine','elder','rookie'],'老人は寝台から新人を呼んだ。今度は帰路の点灯ではなく、詰所の灯を使って油の配り方を教える。',[O('share','二つの瓶に分け、詰所の灯で配分を教え直す','@informed',[{op:'pour',from:'newOil',to:'oldOil',amount:1},{op:'consume',key:'oldOil',amount:1,sink:'oilUsed'},{op:'consume',key:'newOil',amount:1,sink:'oilUsed'},set('taught'),set('reported')])]);
 const rescue=[];for(const who of ['elder','rookie'])for(const p of ['entry','branch'])rescue.push({...move(`rescuers`, 'post','entry',...(p==='branch'?['branch']:[])),when:s.is(`${who}At`,p)},{...move(`rescuers ${who}`,p,...(p==='branch'?['entry']:[]),'post'),assistant:'rescuers',when:s.is(`${who}At`,p)});
 s.node('report','post',['rine','rescuers'],when(s.is('mapped'),'リネは地図に、目で確認した位置と音だけを聞いた範囲を別々に記した。救助隊が引き受ける。夜明けまで、ここで帰還を待つ。','リネは救出名簿を開いた。'),[O('wait','救助隊の帰還と名簿を、夜明けまで確認する','@compromise',[...rescue,set('dawn')])]);
 const home=and(s.is('elderAt','post'),s.is('rookieAt','post'),s.is('partyAt','post'));
 s.end('informed','二人の帰還と油の教え直し','二人が詰所に戻った後、老人は新人を叱る前に油の配り方を教えた。報告を受けたリネが、夜番には予備を含め二瓶持つ規則を記した。',and(home,s.is('taught'),s.is('reported')));
 s.end('contract','老人だけの救出報告','老人は詰所へ戻った。入口の新人は救出名簿に載らず、老人は自分の不始末として始末書を書いた。新人の帰還はまだ確認されていない。',and(s.is('elderAt','post'),s.is('rookieAt','entry'),s.is('reported')));
 s.end('compromise','救助隊へ引き継ぎ、二人の帰還を確認','夜明け、救助隊が未帰還者を連れ戻した。リネの名簿で二人の帰還を確認した。油の教え直しや、新しい携行規則の決定には至っていない。',and(home,s.is('dawn'),s.is('reported')));
 rows.push(s.done());
}
{
 const s=story(2,{landing:'引き揚げ場',water:'浅瀬の荷崩れ',school:'学校の標本室',office:'保険審査所'},[['landing','water'],['landing','school'],['landing','office']]);
 s.entity('belt','landing','belt').entity('porter','school','porter').entity('curator','school','curator').entity('examiner','office','examiner').entity('box','water').entity('bones','box').entity('tags','box').entity('ledger','curator');
 for(const k of ['opened','schoolKnown','witnessConsent','fraudChecked','returned','tagDelivered'])s.bool(k);
 s.fact('number','骨の台座には学校の貸出番号がある').fact('loan','貸出台帳は標本を学校の所有物と示す').fact('fraud','生存している運搬人に死亡保険の請求が出ている');
 s.past=['ベルトは貸出標本を死者の骨に見せかけ、荷札で死亡保険を請求しようとした。運搬人は仕事を失うのを恐れて黙っている。'];s.progression='荷札だけの回収、箱の引き揚げ、学校への照会を分ける。保険不正の確定には台帳・運搬人の同意・審査が必要。';
 s.node('entry','landing',['belt'],'ベルトは水面の箱を指した。「中身は捨てていい。荷札だけ戻してくれ」。浅瀬へ降りれば箱を調べられる。',[O('lift','縄を使って箱ごと引き揚げる','box',[move('party','landing','water'),give('box','water','party'),move('party','water','landing'),set('opened'),see('number','bones')],{cost:{rope:1}}),O('tags','浅瀬の魔物を退け、荷札だけ回収する','tags',[move('party','landing','water'),give('tags','box','party'),move('party','water','landing')],{combat:true}),O('school','浅瀬で台座の番号を写し、学校へ照会する','school',[move('party','landing','water'),see('number','bones'),move('party','water','landing','school'),see('loan','ledger'),set('schoolKnown')])]);
 s.node('box','landing',['belt'],'箱の中の骨は針金で連結され、台座に学校の番号が刻まれている。ベルトは荷札だけを差し出すよう急かした。',[O('school','箱を保持したまま、標本室へ番号を照会する','school',[move('party','landing','school'),see('loan','ledger'),set('schoolKnown')]),O('tags','荷札を外してベルトへ渡す','@contract',[give('tags','box','belt'),give('box','party','belt'),move('belt','landing','water'),give('box','belt','water'),move('belt','water','landing'),set('tagDelivered')])]);
 s.node('tags','landing',['belt'],'荷札はあなたの手にある。箱と骨は浅瀬に残した。ベルトは札を数えるため手を伸ばした。',[O('deliver','荷札だけを渡して依頼を終える','@contract',[give('tags','party','belt'),set('tagDelivered')]),O('inspect','荷札を渡さず、浅瀬の台座を確かめて学校へ行く','school',[move('party','landing','water'),see('number','bones'),move('party','water','landing','school'),see('loan','ledger'),set('schoolKnown')])]);
 const recover=[{...move('party porter','school','landing','water'),when:s.is('boxAt','water')},{...give('box','water','party'),when:s.is('boxAt','water')},{...move('party porter','water','landing','school'),when:s.is('partyAt','water')},give('box','party','curator'),{...give('tags','party','curator'),when:s.is('tagsAt','party')},set('returned')];
 s.node('school','school',['porter','curator'],'標本係は番号を貸出台帳と照合した。「授業の骨です。運搬を頼んだのは、この人」。運搬人は、回収の手伝いには応じたが、保険の話には口をつぐんだ。',[O('recover','運搬人と標本を回収し、学校へ返す','returned',recover)]);
 s.node('returned','school',['porter','curator'],'骨と箱を学校へ返した。標本係が返却を記帳する。運搬人は「証言したら次の仕事がなくなる」と言った。',[O('finish','標本の返却だけで報告を終える','@compromise'),O('consent','不利益も説明し、本人の同意を得て審査所へ同行する','hearing',[set('witnessConsent'),give('ledger','curator','party'),move('party porter','school','landing','office')])]);
 s.node('hearing','office',['porter','examiner'],'審査員が運搬人本人と貸出台帳を確認し、ベルトの請求書と照合した。死亡したとされる人が、目の前で署名する。',[O('file','本人の証言と台帳を受理してもらう','@informed',[see('fraud','examiner'),give('ledger','party','examiner'),set('fraudChecked')])]);
 s.end('informed','証言を伴う不正請求の審査','審査所は標本を死者に見せた請求を止めた。運搬人は同意して証言したが、ベルトからの仕事を失った。返却済みの骨は学校に残る。',and(s.is('returned'),s.is('witnessConsent'),s.is('fraudChecked'),s.known('fraud')));
 s.end('contract','荷札だけの納品','ベルトは荷札を受け取り、箱は浅瀬に残された。あなたは請求書を見ていない。その後、ベルトの死亡保険請求は審査を通った。',and(s.is('tagDelivered'),s.is('tagsAt','belt'),s.is('boxAt','water')));
 s.end('compromise','学校へ標本を返却','箱と骨は学校へ戻った。運搬人の証言は得ず、保険請求の確認は審査所に持ち込まなかった。標本の返却と不正の立証は、別の仕事として残った。',s.is('returned'));
 rows.push(s.done());
}
{
 const s=story(3,{alarm:'低所の鐘室',passage:'冠水しかけた通路',high:'高所の待避場',reservoir:'宿屋裏の貯水槽'},[['alarm','passage'],['alarm','high'],['high','reservoir']]);
 s.entity('sora','alarm','sora').entity('passers','passage','passers',{kind:'group'}).entity('innkeeper','reservoir','innkeeper').entity('seller','reservoir','seller').entity('bell','alarm').entity('float','alarm').entity('watch','high','waterwatch',{kind:'group'});
 for(const k of ['warned','mechanismChecked','causeKnown','agreement','tested','chainCut','relay'])s.bool(k);
 s.fact('mechanism','鐘は増水を正しく知らせている').fact('cause','宿屋の夜間放水が下流へ逆流している');
 s.past=['宿屋の夜間放水量が増え、下流に逆流が生じた。鐘と浮子は故障していない。'];s.progression='通路の退避を先に確保し、鐘の機構・上流の運用・人手の監視を別々に扱う。';
 const warn=[move('party','alarm','passage'),move('party passers','passage','alarm','high'),move('party','high','alarm'),set('warned')];
 s.node('entry','alarm',['sora'],'鐘が鳴るたび、ソラは鎖を押さえる。「鳴り続けたら、誰も聞かなくなる」。低い通路には、まだ荷を運ぶ人がいる。',[O('warn','通行人を高所へ誘導し、低い通路を閉鎖する','safe',warn)]);
 s.node('safe','alarm',['sora'],'通行人は高所へ出た。閉鎖札の向こうで水が階段を上がる。鐘を止めても、水は引かない。',[O('inspect','浮子と鎖を動かして作動を確かめる','mechanism',[see('mechanism','float'),set('mechanismChecked')]),O('cut','閉鎖を維持したまま鐘の鎖を切る','@contract',[set('chainCut')]),O('upstream','水の来る方向をたどり、宿屋裏へ向かう','reservoir',[move('party','alarm','high','reservoir'),see('cause','innkeeper'),set('causeKnown')])]);
 s.node('mechanism','alarm',['sora'],'浮子を持ち上げると鐘が鳴り、下げると止まる。機構は正常だ。ソラは水位線を指した。「直すなら、こっちです」。',[O('upstream','高所の道を通って貯水槽へ向かう','reservoir',[move('party','alarm','high','reservoir'),see('cause','innkeeper'),set('causeKnown')]),O('relay','鐘を高所へ運び、水位を伝える当番を組む','relay',[give('bell','alarm','party'),move('party sora','alarm','high'),give('bell','party','high')])]);
 s.node('reservoir','reservoir',['innkeeper','seller'],'宿屋は夜の水を減らせないと言い、水売りは売上が落ちると言う。貯水槽の開閉記録は、下流の増水時刻と一致した。',[O('agree','夜間の放水量を減らし、残りを時間分散する合意を取る','test',[set('agreement'),move('party','reservoir','high','alarm')]),O('relay','放水は変えず、下流へ戻って人手の警報を整える','relay',[move('party','reservoir','high','alarm'),give('bell','alarm','party'),move('party sora','alarm','high'),give('bell','party','high')])]);
 s.node('test','alarm',['sora'],'取り決めた夜が来た。ソラが浮子を見張り、あなたは時刻と水位を記録する。上流の約束だけで、成功とはしない。',[O('verify','一晩の運用試験を終え、水位と鐘の復帰を確認する','@informed',[set('tested')])]);
 s.node('relay','high',['sora','watch'],'ここに浮子はつながっていない。水位を見る係と鐘を鳴らす係を分け、見張りは危険な通路に降りず、鐘室の高い窓から水位線を読む。',[O('roster','当番の承諾を取り、伝令と鐘の連絡を実地に試す','@compromise',[set('relay')])]);
 s.end('informed','放水の合意と運用試験','夜間放水を減らし、残りを時間分散した。試験の間、水位は危険線を越えず、正常な鐘は静かになった。水売りの売上は減り、宿屋にも給水時刻の制約が残る。',and(s.is('warned'),s.is('agreement'),s.is('tested'),s.is('bellAt','alarm')));
 s.end('contract','通路を閉じて鐘を止める','鎖を切ると鐘は止まった。閉鎖した低い通路には水が流れ込み続ける。ソラは閉鎖札を外さず、機械の警報を失った水位線を見張った。',and(s.is('warned'),s.is('chainCut')));
 s.end('compromise','高所の鐘と見張りの交代制','高所の鐘は人が鳴らす警報になった。水位の監視、伝令、鐘番の当番が引き受けられ、連絡試験を終えた。逆流そのものは残り、人手を絶やせない。',and(s.is('warned'),s.is('bellAt','high'),s.is('relay')));
 rows.push(s.done());
}
{
 const s=story(4,{outside:'関所の外',desk:'公開窓口',cell:'留置室',office:'地上の審査窓口'},[['outside','desk'],['desk','cell'],['outside','office']]);
 s.entity('ina','outside','ina').entity('sister','cell','sister').entity('keeper','desk','passkeeper').entity('reviewer','office','reviewer').entity('original','keeper').entity('copy','ina').entity('register','keeper');
 for(const k of ['windowOpen','truthKnown','sistersConsent','keeperConsent','filed','released','copyInvalid','numberRevoked','provisional'])s.bool(k);
 s.fact('shared','姉妹が一つの資格の原本と写しを分けた').fact('brother','関所番は死んだ兄の名義を使っている');
 s.past=['姉妹は姉の一資格を二枚の紙で使った。関所番自身も死んだ兄の名で働いている。'];s.progression='紙の枚数と資格数を分け、面会窓越しの会話、留置解除、仮証の発行を別の行為として扱う。';
 s.node('entry','outside',['ina'],'イナの通行証は写しだった。「原本は姉が持っていました。今は番人の机です」。留置室の姉へは、窓口で面会を頼む必要がある。',[O('window','イナと公開窓口へ行き、面会窓を開けてもらう','window',[move('party ina','outside','desk'),set('windowOpen'),see('shared','ina')]),O('force','番犬を退け、留置室の錠を破って姉を連れ出す','@contract',[move('party','outside','desk','cell'),move('party sister','cell','desk','outside'),set('released'),set('numberRevoked')],{combat:true})]);
 s.node('window','desk',['ina','keeper',{entity:'sister',mode:'remote',requires:s.is('windowOpen')}],'姉は面会窓の向こうで、自分の資格を妹と分けたと認めた。番人は原本を押さえている。机の公開登録簿には、番人と同じ名の横に死亡印がある。',[O('fine','20Gを払い、写しを失効させて姉を外へ引き取る','@compromise',[give('copy','ina','keeper'),move('sister','cell','desk'),give('original','keeper','sister'),move('sister','desk','outside'),move('party ina','desk','outside'),set('released'),set('copyInvalid')],{cost:{gold:20}}),O('inspect','登録簿の死亡印と本人の説明を照合する','consent',[see('brother','keeper'),set('truthKnown')])]);
 s.node('consent','desk',['ina','keeper',{entity:'sister',mode:'remote',requires:s.is('windowOpen')}],'番人は兄の名で働いていると認めた。イナは「姉だけを罰して、あなたは残るの？」と尋ねる。番人は処分の可能性を聞いた上で、自分も審査を受けると答えた。',[O('file','三人の申告への同意を取り、審査官に現場確認を頼む','review',[set('sistersConsent'),set('keeperConsent'),move('party','desk','outside','office'),set('filed'),move('party reviewer','office','outside','desk')])]);
 s.node('review','desk',['ina','keeper','reviewer',{entity:'sister',mode:'remote',requires:s.is('windowOpen')}],'審査官は地上から同行し、原本・写し・登録簿と三人の申告をその場で照合した。姉妹を別人として受理し、番人の勤務を一時停止する。',[O('issue','別々の仮証の発行と留置解除を見届ける','@informed',[give('copy','ina','reviewer'),give('original','keeper','reviewer'),set('provisional'),set('copyInvalid'),move('sister','cell','desk'),move('party ina sister','desk','outside'),set('released')])]);
 s.end('informed','三人の名義を審査へ戻す','現場確認を経て姉妹それぞれに仮証が発行され、姉は外へ出た。番人は勤務を止められ、兄の名を使った経緯の審査を受ける。正式資格の結論はまだ先にある。',and(s.is('released'),s.is('provisional'),s.is('filed'),s.is('sistersConsent'),s.is('keeperConsent')));
 s.end('contract','錠を破って姉を連れ出す','姉を関所の外へ連れ出した。原本は番人の手元に残り、その番号は取消扱いになった。イナの写しも通行には使えない。姉妹は自由になったが、資格を得たわけではない。',and(s.is('released'),s.is('numberRevoked'),s.is('sisterAt','outside')));
 s.end('compromise','罰金で留置を解く','姉は外へ出て原本を返された。イナの写しは回収・失効した。有効な資格は姉の一つだけで、二人が別々に通行できる状態にはならなかった。',and(s.is('released'),s.is('copyInvalid'),s.is('originalAt','sister'),not(s.is('provisional'))));
 rows.push(s.done());
}
{
 const s=story(5,{drain:'排水作業室',sump:'隣の空き溜め'},[['drain','sump']]);
 s.entity('toto','drain','toto').entity('bed','drain').entity('net','toto');
 s.enum('fungus','growing',['growing','cooled','burned'],'同じ菌床の状態').bool('coldTrial').bool('warmTrial').bool('overflow').bool('pipes').bool('overnight').bool('foodTest').bool('maintenance');
 s.fact('temperature','冷水で増殖が止まり、温水で増殖する');
 s.past=['排水の甘みは菌床に由来する。温かい排水で増殖が進み、管を塞いだ。食用可否は温度試験とは別に確かめる必要がある。'];s.progression='温水の溢水を記憶し、清掃・冷却・移設・一晩の試運転を順に行う。焼いた菌床は再利用しない。';
 s.node('entry','drain',['toto'],'トトが桶に排水を取った。「甘いのは困る。けど、焼けばそれで終わりかな」。管口に柔らかな菌の塊が詰まっている。',[O('cold','一部へ冷水を流し、増殖の変化を見る','cold',[set('coldTrial'),set('fungus','cooled'),see('temperature','bed')]),O('warm','温水を流して反応を確かめる','overflow',[set('warmTrial'),set('overflow')]),O('burn','菌床を焼き、残骸を除去する','@contract',[set('fungus','burned')],{cost:{torch:1}}),O('net','回収網と清掃当番による維持を相談する','net')]);
 s.node('overflow','drain',['toto'],'菌が膨れ、甘い泥水が床へ溢れた。温水を止めても、こぼれた泥は残る。トトは排水口を守り、あなたへ掻き出し道具を渡した。',[O('clean','床の泥を回収してから冷水を試す','cold',[set('overflow',false),set('coldTrial'),set('fungus','cooled'),see('temperature','bed')]),O('net','泥を回収し、網による維持へ切り替える','net',[set('overflow',false)])]);
 s.node('cold','drain',['toto'],'冷水を流すと増殖が止まった。菌床はまだここにある。隣の空き溜めへ移せば排水本管と切り離せるが、配管と運転の確認が要る。',[O('move','トトと菌床を空き溜めへ運び、冷水管を分岐する','test',[give('bed','drain','party'),move('party toto','drain','sump'),give('bed','party','sump'),set('pipes')]),O('net','菌床を残し、回収網と清掃当番を整える','net')]);
 s.node('test','sump',['toto'],'菌床を本管から離した。冷水を流し、一晩、増殖と排水量を測る。味見だけで食料にはしない。',[O('verify','一晩の排水試験と、別採取した樹液の食用試験を終える','@informed',[set('overnight'),set('foodTest')])]);
 s.node('net','drain',['toto'],'トトは網の目と交換時刻を紙に書いた。「毎日ここを回るのは、うちの仕事にする」。あなたが今後も無償で通う約束ではない。',[O('accept','トトの引受けを確認して網を設置する','@compromise',[give('net','toto','drain'),set('maintenance')],{when:not(s.is('overflow'))})]);
 s.end('informed','菌床を分離して運用を確かめる','冷水で管理する別の溜めへ菌床を移し、一晩の試運転で排水本管の流れを確認した。別に採取した樹液は食用試験を通った。トトは維持費を負い、少量の食料を得る。',and(s.is('bedAt','sump'),s.is('pipes'),s.is('overnight'),s.is('foodTest'),not(s.is('overflow')),s.is('fungus','cooled')));
 s.end('contract','菌床を焼却する','菌床を焼いて取り除くと排水は流れた。甘みの由来も失われ、この菌床を食料へ転用する道は閉じた。',s.is('fungus','burned'));
 s.end('compromise','回収網と清掃当番','回収網を設置し、トトが毎日の清掃を引き受けた。菌床は本管側に残る。流れを保つには継続的な手入れが必要で、増殖の原因を除いたわけではない。',and(s.is('maintenance'),s.is('netAt','drain'),not(s.is('overflow'))));
 rows.push(s.done());
}
export default rows;
