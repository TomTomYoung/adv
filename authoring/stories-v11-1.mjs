import {story,O,move,give,set,see,when,and,or,not} from './story-kit.mjs';
import q001 from './story-q001.mjs';
const rows=[q001];
{
 const s=story(2,{landing:'引き揚げ場',water:'浅瀬の荷崩れ',school:'医学校の標本室',office:'保険審査所'},[['landing','water'],['landing','school'],['landing','office']]);
 s.entity('belt','landing','belt').entity('porter','school','porter').entity('curator','school','curator').entity('examiner','office','examiner').entity('box','water').entity('bones','water').entity('tags','box').entity('ledger','curator');
 for(const k of ['opened','schoolKnown','witnessConsent','fraudChecked','returned','tagDelivered'])s.bool(k);
 s.fact('number','骨には医学校の管理番号が刻まれている').fact('loan','管理番号と貸出台帳が一致し、持出し許可のない医学校の貸出標本だと確認した');
 s.fact('alteredTag','荷札の宛名には別人の名前へ書き直された跡がある').fact('missingReport','荷札の宛名は審査所にある失踪届の名前と一致する').fact('claim','保険請求書は同じ失踪者の遺体として標本箱を提出するとしている').fact('testimony','運搬人は、失踪者として届けられた保険加入者の生存と、一味がベルトへ標本の偽装を頼んだ経緯を証言した').fact('fraud','標本番号・書き換えられた荷札・失踪届・保険請求書・運搬人の証言を照合し、生存する保険加入者の遺体偽装を立証した');
 s.brief='地下水路へ落ちた骨箱から人骨が流れ出ています。運送人のベルトは、箱に付いていた荷札だけを回収してほしいと依頼しました。';
 s.past=['ベルトは、生存している保険加入者を失踪者として届け出た一味から依頼を受け、医学校の貸出標本を遺体に見せかけようとした。標本を入れた箱には失踪者の名前へ書き換えた荷札が付き、骨には医学校の管理番号が残っている。ベルトは箱を地下水路へ落としたため、偽装の証拠となる荷札だけを先に回収しようとしている。運搬人は事情を知っているが、仕事を失うのを恐れて黙っている。'];
 s.revealText='医学校の貸出標本に失踪者名の荷札を付け、生存する保険加入者の遺体として提出する偽装だった。運搬人は保険加入者本人ではなく、事情を知る証人である。';
 s.progression='荷札だけの回収、骨箱の引き揚げ、標本番号の照会を分ける。保険不正の立証には、標本番号、書き換えられた荷札、失踪届、保険請求書、事情を知る運搬人の証言が必要。';
 const collectBones={...give('bones','water','box'),when:s.is('bonesAt','water')};
 s.node('entry','landing',['belt'],'地下水路の曲がり角で、口の開いた骨箱が浅瀬に引っ掛かっている。流れ出た骨がその周囲に散っていた。ベルトは箱の縁を指した。「荷札だけ戻してくれ。骨は拾わなくていい」。',[
  O('lift','縄を使って骨箱ごと引き揚げる','box',[move('party','landing','water'),collectBones,give('box','water','party'),move('party','water','landing'),set('opened'),see('number','bones')],{cost:{rope:1}}),
  O('tags','浅瀬の魔物を退け、荷札だけ回収する','tags',[move('party','landing','water'),give('tags','box','party'),move('party','water','landing')],{combat:true}),
  O('school','浅瀬の骨に刻まれた管理番号を写し、医学校へ照会する','school',[move('party','landing','water'),see('number','bones'),move('party','water','landing','school'),see('loan','ledger'),set('schoolKnown')])
 ]);
 s.node('box','landing',['belt'],'流れ出た骨を箱へ集め、縄で岸へ引き揚げた。骨には医学校の管理番号があり、荷札の宛名には書き直された跡がある。ベルトが手を出した。「荷札だけくれ。箱は俺が浅瀬へ戻す」。',[
  O('school','骨の管理番号と荷札の宛名を控え、医学校へ照会する','school',[see('alteredTag','tags'),move('party','landing','school'),see('loan','ledger'),set('schoolKnown')]),
  O('tags','荷札を外してベルトへ渡す','@contract',[give('tags','box','belt'),give('box','party','belt'),move('belt','landing','water'),give('box','belt','water'),move('belt','water','landing'),set('tagDelivered')])
 ]);
 s.node('tags','landing',['belt'],'荷札を箱から外して岸へ戻った。骨箱は浅瀬に残っている。ベルトは濡れた札へ手を伸ばした。「それでいい。渡してくれ」。',[
  O('deliver','荷札だけをベルトへ渡して依頼を終える','@contract',[give('tags','party','belt'),set('tagDelivered')]),
  O('inspect','荷札の書き直された跡を調べ、骨の管理番号を確かめる','school',[see('alteredTag','tags'),move('party','landing','water'),see('number','bones'),move('party','water','landing','school'),see('loan','ledger'),set('schoolKnown')])
 ]);
 const recover=[{...move('party porter','school','landing','water'),when:s.is('boxAt','water')},collectBones,{...give('box','water','party'),when:s.is('boxAt','water')},{...move('party porter','water','landing','school'),when:s.is('partyAt','water')},give('box','party','curator'),{...give('tags','box','curator'),when:s.is('tagsAt','box')},{...give('tags','party','curator'),when:s.is('tagsAt','party')},set('returned')];
 s.node('school','school',['porter','curator'],'標本係は骨の管理番号を貸出台帳と照合した。「貸出用の標本です。この持ち出しは許可していません」。呼ばれた運搬人は、ベルトに頼まれて箱を運んだと認め、回収を手伝うと答えた。',[
  O('recover','管理番号から貸出標本だと確認し、箱と骨を医学校へ返す','returned',recover)
 ]);
 s.node('returned','school',['porter','curator'],'箱と骨を医学校へ返し、荷札も一緒に預けた。標本係が番号を確かめて返却を記帳する。運搬人は荷札を見て声を落とした。「名前を書き換えた理由は知っています。でも、証言したらベルトからの仕事はなくなる」。',[
  O('finish','標本の返却だけで報告を終える','@compromise'),
  O('consent','運搬人へ不利益を説明し、本人の同意を得て審査所へ同行する','hearing',[set('witnessConsent'),give('ledger','curator','party'),{...give('tags','box','party'),when:s.is('tagsAt','box')},{...give('tags','curator','party'),when:s.is('tagsAt','curator')},move('party porter','school','landing','office')])
 ]);
 // A pre-revision save at the hearing may still have its tags at the school.
 // The porter must physically collect them before the same inspection can finish.
 const bringFiledTags=[
  {...move('porter','office','landing','school'),when:or(s.is('tagsAt','box'),s.is('tagsAt','curator'))},
  {...give('tags','box','porter'),when:s.is('tagsAt','box')},
  {...give('tags','curator','porter'),when:s.is('tagsAt','curator')},
  {...move('porter','school','landing','office'),when:s.is('porterAt','school')},
  {...give('tags','porter','party'),when:s.is('tagsAt','porter')}
 ];
 const documents=and(s.known('number'),s.known('loan'),s.known('alteredTag'),s.known('missingReport'),s.known('claim'),s.known('testimony'));
 s.node('hearing','office',['porter','examiner'],'審査員は標本の台帳を開き、荷札の提出を求めた。医学校に預けたままなら、運搬人が取りに戻る。失踪届と保険請求書は審査所に保管されている。運搬人は「失踪したという人は生きています。その人の遺体に見せる箱を、一味がベルトに用意させたんです」と話し始めた。',[
  O('file','標本番号、荷札、失踪届、保険請求書を照合し、運搬人の証言を受理してもらう','@informed',[
   ...bringFiledTags,see('alteredTag','tags'),give('tags','party','examiner'),give('ledger','party','examiner'),
   see('missingReport','examiner',s.is('tagsAt','examiner')),see('claim','examiner',s.known('missingReport')),see('testimony','porter',s.is('witnessConsent')),see('fraud','examiner',documents),set('fraudChecked')
  ],{when:and(s.is('returned'),s.is('witnessConsent'),s.is('ledgerAt','party'),s.known('number'),s.known('loan'))})
 ]);
 s.end('informed','証言を伴う不正請求の審査','標本番号、書き換えられた荷札、失踪届、保険請求書が一つの偽装として審査所へ提出された。不正請求は止まり、標本は医学校へ返却された。運搬人は同意して証言したが、ベルトからの仕事を失った。',and(s.is('returned'),s.is('witnessConsent'),s.is('fraudChecked'),s.known('fraud')));
 s.end('contract','荷札だけの納品','ベルトは荷札を受け取り、浅瀬の骨箱は回収されなかった。後日、荷札は別の標本箱に付け直され、失踪者の遺体として保険審査へ提出された。',and(s.is('tagDelivered'),s.is('tagsAt','belt'),s.is('boxAt','water')));
 s.end('compromise','学校へ標本を返却','箱と骨は医学校へ戻り、盗まれた標本の管理番号も確認された。しかし荷札と失踪届の関係、保険請求への関与までは立証されず、不正の追及は別の仕事として残った。',s.is('returned'));
 rows.push(s.done());
}
{
 const s=story(3,{alarm:'低所の鐘室',passage:'冠水しかけた通路',high:'高所の待避場',reservoir:'宿屋裏の汚水槽'},[['alarm','passage'],['alarm','high'],['high','reservoir']]);
 s.entity('sora','alarm','sora').entity('passers','passage','passers',{kind:'group'}).entity('innkeeper','reservoir','innkeeper').entity('seller','reservoir','seller').entity('bell','alarm').entity('float','alarm').entity('watch','high','waterwatch',{kind:'group'});
 for(const k of ['warned','mechanismChecked','causeKnown','agreement','tested','chainCut','relay'])s.bool(k);
 s.fact('mechanism','鐘は増水を正しく知らせている').fact('cause','宿屋の夜間放水が下流へ逆流している');
 s.brief="晴天なのに増水警鐘が鳴ります。地下の鐘を止めてください。";
 s.past=["宿屋の夜間放水量が増え、下流に逆流が生じた。鐘と浮子は故障していない。"];
 s.authoringNotes={"notice":"以下の事実はq003を成立させる世界設定上の制約です。 これらを台詞、説明、選択肢としてシナリオへ直接反映する必要はありません。ただし、生成・改稿時に矛盾させてはいけません。","factsHeading":"世界設定上の事実","facts":["地下都市は上層居住区と下層通路に分かれ、下層通路の脇を古い共同排水路が通っています。","町には十分な上水道がなく、水売りが井戸水を樽で運んで上層施設へ販売します。宿屋は浴場、洗濯場、炊事場を持つ大口需要者です。","宿屋は使用済みの水を汚水槽へ溜め、客が寝た深夜に共同排水路へ放流します。宿屋の規模拡大によって一度の放水量が下流管の処理能力を超え、水が下層通路側へ逆流するようになりました。","下層通路には、排水路の水位上昇を浮子と鎖で検知する機械式警鐘があります。本来は豪雨や水門故障による増水を知らせる設備であり、本件でも故障せず人工的な増水を正しく検知しています。","放水量を減らすと宿屋が購入する水量も減るため、水売りの売上が落ちます。残りの排水を処理能力に合わせて分散するには、給水、浴場使用、洗濯、放水の時間を調整する必要があり、宿屋には給水時刻の制約が残ります。"]};
 s.revealText=s.past.join(' ');s.progression="通路の退避を先に確保し、鐘の機構・上流の運用・人手の監視を別々に扱う。";
 const warn=[move('party','alarm','passage'),move('party passers','passage','alarm','high'),move('party','high','alarm'),set('warned')];
 s.node('entry','alarm',['sora'],'鐘が鳴るたび、ソラは鎖を押さえる。「鳴り続けたら、誰も聞かなくなる」。低い通路には、まだ荷を運ぶ人がいる。',[O('warn',"通行人を高所へ誘導し、低い通路を閉鎖する",'safe',warn)]);
 s.node('safe','alarm',['sora'],'通行人は高所へ出た。閉鎖札の向こうで水が階段を上がる。鐘を止めても、水は引かない。',[O('inspect',"浮子と鎖を動かして作動を確かめる",'mechanism',[see('mechanism','float'),set('mechanismChecked')]),O('cut',"閉鎖を維持したまま鐘の鎖を切る",'@contract',[set('chainCut')]),O('upstream',"水の来る方向をたどり、宿屋裏へ向かう",'reservoir',[move('party','alarm','high','reservoir'),see('cause','innkeeper'),set('causeKnown')])]);
 s.node('mechanism','alarm',['sora'],'浮子を持ち上げると鐘が鳴り、下げると止まる。機構は正常だ。ソラは水位線を指した。「直すなら、こっちです」。',[O('upstream',"高所の道を通って汚水槽へ向かう",'reservoir',[move('party','alarm','high','reservoir'),see('cause','innkeeper'),set('causeKnown')]),O('relay',"鐘を高所へ運び、水位を伝える当番を組む",'relay',[give('bell','alarm','party'),move('party sora','alarm','high'),give('bell','party','high')])]);
 s.node('reservoir','reservoir',['innkeeper','seller'],'汚水槽の放流記録は、下流の増水時刻と一致した。宿屋は浴場と洗濯場を広げてから、使用済みの水を深夜にまとめて捨てている。「使う水を減らすなら、風呂も洗濯も今まで通りにはいかない」。井戸水を樽で届ける水売りも、注文が減ると困ると答えた。',[O('agree',"夜間の放水量を減らし、残りを時間分散する合意を取る",'test',[set('agreement'),move('party','reservoir','high','alarm')]),O('relay',"放水は変えず、下流へ戻って人手の警報を整える",'relay',[move('party','reservoir','high','alarm'),give('bell','alarm','party'),move('party sora','alarm','high'),give('bell','party','high')])]);
 s.node('test','alarm',['sora'],'取り決めた夜が来た。ソラが浮子を見張り、あなたは時刻と水位を記録する。上流の約束だけで、成功とはしない。',[O('verify',"一晩の運用試験を終え、水位と鐘の復帰を確認する",'@informed',[set('tested')])]);
 s.node('relay','high',['sora','watch'],'ここに浮子はつながっていない。水位を見る係と鐘を鳴らす係を分け、見張りは危険な通路に降りず、鐘室の高い窓から水位線を読む。',[O('roster',"当番の承諾を取り、伝令と鐘の連絡を実地に試す",'@compromise',[set('relay')])]);
 s.end('informed',"放水の合意と運用試験","夜間放水を減らし、残りを時間分散した。試験の間、水位は危険線を越えず、正常な鐘は静かになった。水売りの売上は減り、宿屋にも給水時刻の制約が残る。",and(s.is('warned'),s.is('agreement'),s.is('tested'),s.is('bellAt','alarm')));
 s.end('contract',"通路を閉じて鐘を止める","鎖を切ると鐘は止まった。閉鎖した低い通路には水が流れ込み続ける。ソラは閉鎖札を外さず、機械の警報を失った水位線を見張った。",and(s.is('warned'),s.is('chainCut')));
 s.end('compromise',"高所の鐘と見張りの交代制","高所の鐘は人が鳴らす警報になった。水位の監視、伝令、鐘番の当番が引き受けられ、連絡試験を終えた。逆流そのものは残り、人手を絶やせない。",and(s.is('warned'),s.is('bellAt','high'),s.is('relay')));
 rows.push(s.done());
}
{
 const s=story(4,{outside:'関所の外',desk:'公開窓口',cell:'留置室',office:'地上の審査窓口'},[['outside','desk'],['desk','cell'],['outside','office']]);
 s.entity('ina','outside','ina').entity('sister','cell','sister').entity('keeper','desk','passkeeper').entity('reviewer','office','reviewer').entity('original','keeper').entity('copy','ina').entity('register','keeper');
 for(const k of ['windowOpen','truthKnown','sistersConsent','keeperConsent','filed','released','copyInvalid','numberRevoked','provisional'])s.bool(k);
 s.fact('shared','イナが姉の写しで先に入場し、後から同じ番号の原本を提示した姉が拘束された').fact('duty','勤務簿には関所番が申告した勤務名義がある').fact('resident','別管理の住民登録簿では、その名義人は死亡している').fact('brother','関所番は死んだ兄の名義を使っている');
 s.brief="地下関所で姉が拘束されました。姉とイナが持つ通行証には、同じ番号が記されています。";
 s.past=["地下通行資格を持つのは姉だけだった。資格取得前のイナは姉の通行証を写し、姉妹は同じ番号の証を別々に使用した。イナが写しで入場した後、姉が原本を提示したため、同じ番号が同時に使われたと判定され、姉が拘束された。関所番もまた、住民登録上は死亡している兄の就業資格を使って勤務している。"];
 s.authoringNotes={"notice":"以下の事実はq004を成立させる世界設定上の制約です。これらを台詞、説明、選択肢としてシナリオへ直接反映する必要はありません。ただし、生成・改稿時に矛盾させてはいけません。","factsHeading":"世界設定上の事実","facts":["地下通行証は一つの資格と一人の名義に対応し、関所では番号ごとに入退場を記録します。同じ番号の人物が地下にいる間、その番号を使った二人目は通過できません。","イナの持つ証は姉の原本を写した複製です。イナが先に通過したため、後から原本を提示した姉がその場で拘束されました。","関所の通行記録、勤務簿、住民登録簿は別々に管理されています。そのため、関所番が死亡した兄の名義で勤務している事実は、勤務簿だけを見ても発覚しません。"]};
 s.revealText=s.past.join(' ');s.progression="二枚の通行証と入退場記録から姉の拘束理由を確かめる。番人の勤務名義を住民登録簿まで照合した場合だけ、三人の資格問題を同じ審査へ戻せる。";
 s.node('entry','outside',['ina'],'イナは姉の通行証を写した紙を見せた。「先に入ったのは私です。後から来た姉が捕まったと聞いて、引き返してきました」。原本は番人に押収され、姉は留置室にいる。',[
  O('window',"二枚の通行証と入退場記録を照合する",'duplicate',[move('party ina','outside','desk'),set('windowOpen'),see('shared','register')]),
  O('force',"関所の錠を破って姉を連れ出す",'@contract',[move('party','outside','desk','cell'),move('party sister','cell','desk','outside'),set('released'),set('numberRevoked')],{combat:true})
 ]);
 const fine=[give('copy','ina','keeper'),move('sister','cell','desk'),give('original','keeper','sister'),move('sister','desk','outside'),move('party ina','desk','outside'),set('released'),set('copyInvalid')];
 s.node('duplicate','desk',['ina','keeper',{entity:'sister',mode:'remote',requires:s.is('windowOpen')}],'入退場記録には、イナが写しで入場した時刻と、姉の原本が止められた時刻が続いていた。番人は同じ番号を指した。「一人が中にいる間、二人目は通せない」。面会窓の姉も複製を認める。窓口には勤務簿があるが、住民登録簿は地上で別に管理されている。',[
  O('fine',"複製を認め、罰金を納めて姉を引き取る",'@compromise',fine,{cost:{gold:20}}),
  O('inspect',"番人の勤務名義を住民登録簿と照合する",'consent',[see('duty','keeper'),move('party','desk','outside','office'),see('resident','reviewer'),move('party','office','outside','desk'),see('brother','keeper',and(s.known('duty'),s.known('resident'))),set('truthKnown')])
 ]);
 s.node('consent','desk',['ina','keeper',{entity:'sister',mode:'remote',requires:s.is('windowOpen')}],'住民登録簿の死亡記録を伝えると、番人は兄の名で働いていると認めた。イナが姉を見た。「私たちのことも、この人のことも、全部話すの？」。申告すれば、姉妹の資格だけでなく番人の勤務も審査の対象になる。',[
  O('file',"姉妹と番人へ審査の不利益を説明し、三人から申告への同意を取る",'review',[set('sistersConsent'),set('keeperConsent'),move('party','desk','outside','office'),set('filed'),move('party reviewer','office','outside','desk')],{when:s.is('truthKnown')}),
  O('fine',"姉妹の違反だけを処理し、罰金を納める",'@compromise',fine,{cost:{gold:20}})
 ]);
 s.node('review','desk',['ina','keeper','reviewer',{entity:'sister',mode:'remote',requires:s.is('windowOpen')}],'審査官は住民登録の記録を携えて地上から来た。窓口の通行記録、勤務簿、原本と写しを並べ、三人の申告を聞く。姉は自分の資格を使い、イナはその写しを使った。番人の勤務名義は亡兄のものだった。',[
  O('issue',"通行記録、勤務簿、住民登録簿を審査官へ提出し、別々の仮証の発行と姉の釈放を見届ける",'@informed',[give('copy','ina','reviewer'),give('original','keeper','reviewer'),set('provisional'),set('copyInvalid'),move('sister','cell','desk'),move('party ina sister','desk','outside'),set('released')])
 ]);
 s.sceneAliases={window:'duplicate'};
 s.end('informed',"三人の名義を審査へ戻す","通行記録、勤務簿、住民登録簿を照合し、姉妹による通行証の複製・共用と、番人による兄名義の使用を審査へ戻した。現場確認の間、姉妹には別々の仮証が発行され、姉は釈放された。番人は勤務を止められ、兄の名を使った経緯の審査を受ける。三人とも正式資格の結論はまだ先にある。",and(s.is('released'),s.is('provisional'),s.is('filed'),s.is('sistersConsent'),s.is('keeperConsent')));
 s.end('contract',"錠を破って姉を連れ出す","姉を関所の外へ連れ出した。押収された原本は番人の手元に残り、関所破りに使われた番号として取消扱いになった。イナの写しも通行には使えない。姉妹は自由になったが、資格を得たわけではない。",and(s.is('released'),s.is('numberRevoked'),s.is('sisterAt','outside')));
 s.end('compromise',"罰金で留置を解く","姉妹は通行証を複製した事実を認め、罰金を納めた。姉は釈放されて原本を返され、イナの写しは回収・失効した。有効な資格は姉の一つだけで、二人が別々に通行できる状態にはならなかった。番人の名義については審査へ申し立てなかった。",and(s.is('released'),s.is('copyInvalid'),s.is('originalAt','sister'),not(s.is('provisional'))));
 rows.push(s.done());
}
{
 const s=story(5,{drain:'旧排水溜めの作業室',sump:'隣の空き溜め',disposal:'工房の焼却場'},[['drain','sump'],['drain','disposal']]);
 s.entity('toto','drain','toto').entity('bed','drain').entity('net','toto');
 s.enum('fungus','growing',['growing','cooled','burned'],'同じ菌床の状態').bool('coldTrial').bool('warmTrial').bool('overflow').bool('pipes').bool('overnight').bool('foodTest').bool('maintenance');
 s.fact('temperature','冷水は菌床を殺さず増殖を遅らせ、糖分を含む温排水は増殖を速める');
 s.brief="菓子工房の地下に甘い泥が溜まり、魔物が寄ってきます。詰まりの原因を探してください。";
 s.past=["工房地下の旧排水溜めには、かつて糖液を濾すために使った木質の濾材が残っていた。その濾材を土台に菌床が育ち、温かく糖分を含む排水を受けて増殖した。菌床が作る粘りの強い糖液と剥がれた濾材が泥となり、排水本管を塞いでいる。"];
 s.authoringNotes={"notice":"以下の事実はq005を成立させる世界設定上の制約です。これらを台詞、説明、選択肢としてシナリオへ直接反映する必要はありません。ただし、生成・改稿時に矛盾させてはいけません。","factsHeading":"世界設定上の事実","facts":["トトが依頼時点で望んでいるのは、甘い泥の入手ではなく、排水管の詰まりを除去して工房を再開することです。","冷水試験で菌床を殺さず増殖だけを抑えられると分かった後、トトは初めて、食用にできるなら菌床を残したいと申し出ます。ここで菌床の保存と安全な糖液の採取が副目的として生じます。","冷水は菌床の増殖を遅らせますが、菌床を死滅させません。温水は糖分を溶かす一方で菌床の増殖を速めるため、詰まりを悪化させます。","菌床を本管から分離し、冷水を流せる別の溜めへ濾材ごと移せば、排水機能と菌床の両方を残せます。","排水由来の菌床や糖液は、甘いという理由だけで食用にはできません。排水に触れていない箇所から別に採取し、毒性と衛生の試験を通した分だけを利用できます。"]};
 s.revealText=s.past.join(' ');s.progression="当初は排水管の詰まり除去だけを目的とする。冷水試験の後、トトが安全なら菌床を残したいと申し出た場合に、保存と食用試験が副目的として加わる。溢れた泥を回収したうえで、菌床の分離、焼却、継続管理のいずれかを選ぶ。食用試験は排水試験と別に行う。";
 s.node('entry','drain',['toto'],'「詰まりを取って、工房を動かせるようにしてくれ」。トトが止まった排水を指した。旧排水溜めには木質の濾材が残り、そこから育った菌床と粘る糖液、剥がれた木片が本管へ押し寄せている。',[O('cold',"菌床の一部へ冷水を流し、増殖の変化を見る",'cold',[set('coldTrial'),set('fungus','cooled'),see('temperature','bed')]),O('warm',"温水を流して泥の変化を確かめる",'overflow',[set('warmTrial'),set('overflow')]),O('burn',"菌床と濾材を取り出して焼却する",'@contract',[give('bed','drain','party'),move('party','drain','disposal'),give('bed','party','disposal'),set('fungus','burned'),move('party','disposal','drain')],{cost:{torch:1}}),O('net',"回収網と清掃当番による維持を相談する",'net')]);
 s.node('overflow','drain',['toto'],'菌が膨れ、甘い泥水が床へ溢れた。温水を止めても、こぼれた泥は残る。トトは排水口を守り、あなたへ掻き出し道具を渡した。',[O('clean',"溢れた泥を回収してから冷水を試す",'cold',[set('overflow',false),set('coldTrial'),set('fungus','cooled'),see('temperature','bed')]),O('net',"泥を回収し、網による維持へ切り替える",'net',[set('overflow',false)])]);
 s.node('cold','drain',['toto'],'冷水を流すと菌床の増殖が弱まった。死滅したわけではない。「殺さずに済むのか。安全に食べられるなら、残しておきたい」。ここで初めて、トトは菌床の保存を望んだ。隣の空き溜めへ濾材ごと移せば、本管から分離できる。',[O('move',"冷水で増殖が弱まるのを確認し、トトから安全なら残したいとの希望を聞く。菌床を濾材ごと空き溜めへ運び、冷水管を分岐する",'test',[give('bed','drain','party'),move('party toto','drain','sump'),give('bed','party','sump'),set('pipes')]),O('net',"食用利用は見送り、菌床を旧排水溜めに残して回収網と清掃当番を整える",'net')]);
 s.node('test','sump',['toto'],'菌床を濾材ごと空き溜めへ移し、冷水管を分岐した。一晩の排水試験で本管が詰まらないか調べる。食用の試料は排水に触れていない箇所から別に採取し、毒性と衛生を検査する。甘さだけでは判断しない。',[O('verify',"一晩の排水試験と、排水に触れていない糖液の食用試験を終える",'@informed',[set('overnight'),set('foodTest')])]);
 s.node('net','drain',['toto'],'本管の手前に網を置き、剥がれた濾材と泥を回収する。トトが網の目と清掃時刻を書いた。「毎日の手入れは、うちで引き受ける」。菌床は旧排水溜めに残り、温排水による増殖も続く。',[O('accept',"トトの引受けを確認して網を設置する",'@compromise',[give('net','toto','drain'),set('maintenance')],{when:not(s.is('overflow'))})]);
 s.end('informed',"菌床を分離して運用を確かめる","菌床を濾材ごと冷水管理の空き溜めへ移し、一晩の試運転で排水本管が詰まらないことを確認した。排水に触れていない箇所から採取した糖液は食用試験を通った。トトは分離槽の維持費を負い、少量の食用糖液を得る。",and(s.is('bedAt','sump'),s.is('pipes'),s.is('overnight'),s.is('foodTest'),not(s.is('overflow')),s.is('fungus','cooled')));
 s.end('contract',"菌床を焼却する","菌床と古い濾材を本管から取り出して焼却すると、排水は流れた。詰まりは解消したが、菌床と糖液を食料へ転用する道も失われた。",s.is('fungus','burned'));
 s.end('compromise',"回収網と清掃当番","本管の手前へ回収網を設置し、トトが毎日の清掃を引き受けた。菌床は旧排水溜めに残るため、流れを保つには継続的な手入れが必要で、温排水による増殖原因を除いたわけではない。",and(s.is('maintenance'),s.is('netAt','drain'),not(s.is('overflow'))));
 rows.push(s.done());
}
export default rows;
