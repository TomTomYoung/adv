import {connectWorld} from './world-story-kit.mjs';
import {story,O,move,give,set,see,when,and,or,not} from './story-kit.mjs';
import q001 from './story-q001.mjs';
import q002 from './story-q002.mjs';
import q004 from './story-q004.mjs';
const rows=[q001,q002];

{
 const s=story(3,{alarm:'低所の鐘室',passage:'冠水しかけた通路',high:'高所の待避場',reservoir:'宿屋裏の汚水槽'},[['alarm','passage'],['alarm','high'],['high','reservoir']]);
 s.entity('sora','alarm','sora').entity('passers','passage','passers',{kind:'group'}).entity('innkeeper','reservoir','innkeeper').entity('seller','reservoir','seller').entity('bell','alarm').entity('float','alarm').entity('watch','high','waterwatch',{kind:'group'});
 for(const k of ['warned','mechanismChecked','causeKnown','agreement','tested','chainCut','relay'])s.bool(k);
 s.fact('mechanism','鐘は増水を正しく知らせている').fact('cause','宿屋の夜間放水が下流へ逆流している');
 s.brief="晴天なのに増水警鐘が鳴ります。地下の鐘を止めてください。";
 s.past=["宿屋の夜間放水量が増え、下流に逆流が生じた。鐘と浮子は故障していない。"];
 s.authoringNotes={"notice":"以下の事実はq003を成立させる世界設定上の制約です。 これらを台詞、説明、選択肢としてシナリオへ直接反映する必要はありません。ただし、生成・改稿時に矛盾させてはいけません。","factsHeading":"世界設定上の事実","facts":["地下都市は上層居住区と下層通路に分かれ、下層通路の脇を古い共同排水路が通っています。","町には十分な上水道がなく、水売りが井戸水を樽で運んで上層施設へ販売します。宿屋は浴場、洗濯場、炊事場を持つ大口需要者です。","宿屋は使用済みの水を汚水槽へ溜め、客が寝た深夜に共同排水路へ放流します。宿屋の規模拡大によって一度の放水量が下流管の処理能力を超え、水が下層通路側へ逆流するようになりました。","下層通路には、排水路の水位上昇を浮子と鎖で検知する機械式警鐘があります。本来は豪雨や水門故障による増水を知らせる設備であり、本件でも故障せず人工的な増水を正しく検知しています。","放水量を減らすと宿屋が購入する水量も減るため、水売りの売上が落ちます。残りの排水を処理能力に合わせて分散するには、給水、浴場使用、洗濯、放水の時間を調整する必要があり、宿屋には給水時刻の制約が残ります。"]};
 s.revealText=s.past.join(' ');s.progression="通路の退避を先に確保し、鐘の機構・上流の運用・人手の監視を別々に扱う。";
 s.node('entry','alarm',['sora'],'鐘が鳴るたび、ソラは鎖を押さえる。「鳴り続けたら、誰も聞かなくなる」。低い通路には、まだ荷を運ぶ人がいる。',[O('warn','低い通路へ向かい、残っている通行人に声を掛ける','warning')]);
 s.node('safe','alarm',['sora'],'通行人は高所へ出た。閉鎖札の向こうで水が階段を上がる。鐘を止めても、水は引かない。',[O('inspect',"浮子と鎖を動かして作動を確かめる",'mechanism',[see('mechanism','float'),set('mechanismChecked')]),O('cut',"閉鎖を維持したまま鐘の鎖を切る",'@contract',[set('chainCut')]),O('upstream',"水の来る方向をたどり、宿屋裏へ向かう",'reservoir')]);
 s.node('mechanism','alarm',['sora'],'浮子を持ち上げると鐘が鳴り、下げると止まる。機構は正常だ。ソラは水位線を指した。「直すなら、こっちです」。',[O('upstream',"高所の道を通って汚水槽へ向かう",'reservoir'),O('relay',"鐘を高所へ運び、水位を伝える当番を組む",'relay')]);
 s.node('reservoir','reservoir',['innkeeper','seller'],'汚水槽の放流記録は、下流の増水時刻と一致した。宿屋は浴場と洗濯場を広げてから、使用済みの水を深夜にまとめて捨てている。「使う水を減らすなら、風呂も洗濯も今まで通りにはいかない」。井戸水を樽で届ける水売りも、注文が減ると困ると答えた。',[O('agree',"夜間の放水量を減らし、残りを時間分散する合意を取る",'test'),O('relay','放水は変えず、鐘室へ戻って鐘とソラを迎えに行く','collect')]);
 s.node('test','alarm',['sora'],'取り決めた夜が来た。ソラが浮子を見張り、あなたは時刻と水位を記録する。上流の約束だけで、成功とはしない。',[O('verify',"一晩の運用試験を終え、水位と鐘の復帰を確認する",'@informed',[set('tested')])]);
 s.node('relay','high',['sora','watch'],'ここに浮子はつながっていない。水位を見る係と鐘を鳴らす係を分け、見張りは危険な通路に降りず、鐘室の高い窓から水位線を読む。',[O('roster',"当番の承諾を取り、伝令と鐘の連絡を実地に試す",'@compromise',[set('relay')])]);
 s.end('informed',"放水の合意と運用試験","夜間放水を減らし、残りを時間分散した。試験の間、水位は危険線を越えず、正常な鐘は静かになった。水売りの売上は減り、宿屋にも給水時刻の制約が残る。",and(s.is('warned'),s.is('agreement'),s.is('tested'),s.is('bellAt','alarm')));
 s.end('contract',"通路を閉じて鐘を止める","鎖を切ると鐘は止まった。閉鎖した低い通路には水が流れ込み続ける。ソラは閉鎖札を外さず、機械の警報を失った水位線を見張った。",and(s.is('warned'),s.is('chainCut')));
 s.end('compromise',"高所の鐘と見張りの交代制","高所の鐘は人が鳴らす警報になった。水位の監視、伝令、鐘番の当番が引き受けられ、連絡試験を終えた。逆流そのものは残り、人手を絶やせない。",and(s.is('warned'),s.is('bellAt','high'),s.is('relay')));
 const route=connectWorld(s,{
  alarm:{kind:'dungeon',dungeon:'region_1',map:'region_1_landing',x:7,y:1,event:'q003_decision'},
  passage:{kind:'dungeon',dungeon:'region_1',map:'region_1_inspection',x:5,y:1,event:'q003_passage'},
  high:{kind:'town',location:'hikarigaeri_waterwatch'},
  reservoir:{kind:'town',location:'hikarigaeri_tavern_cistern'}
 },2);
 s.node('warning','passage',['passers'],'水が荷車の車輪を洗っている。通行人たちは荷を捨てるか迷い、まだ低い通路に残っていた。まず全員を上層の待避場へ連れていく。',[
  O('escort','通行人を連れ、入口を経て上層の待避場へ避難する','evacuated')
 ]);
 s.node('evacuated','high',['passers','watch'],'通行人全員が上層の待避場へ着いた。見張りへ人数と通路の危険を伝え、下り口に閉鎖札を掛ける。鐘の調査には、再び地下の鐘室へ戻る必要がある。',[
  O('return','見張りに避難者を任せ、鐘室へ戻る','safe')
 ]);
 s.node('collect','alarm',['sora'],'鐘室へ戻った。鐘もソラもここにいる。上層へ運ぶなら、まず浮子から鐘を外し、ソラと一緒に持ち出す。',[
  O('carry','鐘を受け取り、ソラと上層の待避場へ運ぶ','relay')
 ]);
 route('entry_warn','passage');
 route('warning_escort','high',{companions:['passers'],arrive:[set('warned')]});
 route('evacuated_return','alarm');
 for(const key of ['safe_upstream','mechanism_upstream'])route(key,'reservoir',{arrive:[see('cause','innkeeper'),set('causeKnown')]});
 route('mechanism_relay','high',{depart:[give('bell','alarm','party')],companions:['sora'],arrive:[give('bell','party','high')]});
 route('reservoir_agree','alarm',{depart:[set('agreement')]});
 route('reservoir_relay','alarm');
 route('collect_carry','high',{depart:[give('bell','alarm','party')],companions:['sora'],arrive:[give('bell','party','high')]});
 rows.push(s.done());
}
rows.push(q004);

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
