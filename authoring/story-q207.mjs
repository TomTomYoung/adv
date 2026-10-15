import {O,give,set,see,and} from './story-kit.mjs';
import {episode,person,point,worldRoutes} from './kagaribi-kit.mjs';
const s=episode(207,'二人で持つ測り竿','測量師オセ',{base:'最後の巡回路の基準石',mark:'最後の巡回路の測点'},{base:point('kagaribi_last_patrol',5,1),mark:point('kagaribi_last_patrol',9,7)},'正しい数字を出すために、誰の手を借りたかまで記録できるか。');
person(s,'surveyor','base','オセ','独立した測量師','誤った通路幅を訂正する','助手の支えを認めたら一人で仕事を受けられなくなる','手の震えを知られ、契約を失うこと','前回は震える手で竿を斜めに持ち、狭い値を記した。');
person(s,'assistant','base','ハル','測量の助手','自分の測定を確認する機会を得る','師は自分の読みを信用していない','働きを名前のない手伝いとして消されること','前回の竿の傾きを見ており、基準石で確認しようと提案した。');
s.entity('rod','surveyor').entity('sheet','surveyor').bool('calibrated').bool('remeasured').bool('joint').enum('filing','none',['none','joint','withdrawn','unverified']);
s.fact('tilt','基準石で竿を合わせると、オセ一人では先端が傾き、ハルが支えると目盛りが合う。');
s.brief='最後の巡回路の幅が、二人の測量で食い違った。測量師は前の数値を確かめる同行者を求めている。';
s.past=['前回のオセの測定は手の震えで竿が傾き、実際より狭い値になった。ハルは別の値を得たが、正式な図面には採用されなかった。','この依頼中に通路そのものは動かない。既存の地図や通路幅を変更する作業ではなく、二人の測量票を扱う。'];
s.revealText=s.past.join(' ');s.progression='基準石で測り方を検証し、二人を測点へ伴う。再測定の共同署名、旧値の撤回、再測定をしない未確認返却を選ぶ。';
s.node('entry','base',['surveyor','assistant'],'オセは測り竿の端を自分の足に押しつけていた。「場所が悪かっただけだ」。ハルは基準石を指す。「まず、ここで同じ長さになるか」。二人の紙は、通路が狭いかどうかより先に食い違っている。',[
 O('check','基準石で、一人持ちと二人持ちを比べる','calibrated',[set('calibrated'),see('tilt','assistant')]),
 O('unverified','追加測定を引き受けず、食い違いを未確認として記す','@unverified',[set('filing','unverified')])]);
s.node('calibrated','base',['surveyor','assistant'],'オセ一人では竿の先が揺れた。ハルが支えると基準石の目盛りに合った。「数字は、手の持ち主まで書くのか」とオセが言う。「一人で測った数字にするなら」とハルは答えた。',[
 O('go','二人と測り竿を伴い、実際の測点へ行く','measure')]);
s.node('measure','mark',['surveyor','assistant'],'測点へ着いた。ハルが竿の先端を支え、オセが目盛りを読む準備をする。前の紙はオセの手元にある。二人の関与を隠したまま、新しい数値だけ得ることは引き受けない。',[
 O('read','二人の作業で通路幅を測り直す','result',[set('remeasured'),set('joint')])]);
s.node('result','mark',['surveyor','assistant'],'測り直した値はハルの旧値と一致した。オセの紙の狭い値は採用できない。「図面には二人の名を出すか、俺の前の値を引っ込めるかだな」。ハルは新しい値の脇に署名する場所を空けた。',[
 O('joint','二人の名で測量票を訂正し、ハルへ控えを渡す','@joint',[give('sheet','surveyor','assistant'),set('filing','joint')]),
 O('withdraw','旧値の撤回だけを記し、新図面の提出は保留する','@withdrawn',[set('filing','withdrawn')])]);
s.end('joint','数字と、支えた手を記す','オセとハルは同じ測量票に名を記した。控えはハルが持つ。一人で測ったという看板は守らなかったが、二人で確かめた数値を、次に図面へ移せる形で残した。',and(s.is('filing','joint'),s.is('remeasured'),s.is('joint'),s.is('sheetAt','assistant'),s.is('assistantAt','mark')));
s.end('withdrawn','間違った値を先に引く','オセは旧値を撤回し、測量票を持ち帰ることにした。二人の再測定は済んだが、新図面としての提出は保留した。誰の仕事として出すかを決めないまま、誤った数値だけが使われ続けることは止めた。',and(s.is('filing','withdrawn'),s.is('remeasured'),s.is('sheetAt','surveyor')));
s.end('unverified','測っていないと書く','二つの数値の食い違いを未確認と記した。通路が動いたとも、どちらかが正しいとも保証しない。オセの紙もハルの読みも、その場では決着しなかった。',and(s.is('filing','unverified'),s.is('remeasured',false),s.is('partyAt','base')));
s.routeNotes=[['最後の巡回路の基準石','食い違いを未確認のまま返すか、二人の竿の持ち方を比較する。'],['最後の巡回路の測点','検証後、二人と測点へ歩き、共同で測り直す。'],['最後の巡回路の測点','二人の名を載せる訂正か、旧値を撤回して新図面を保留する処理を行う。']];
export default worldRoutes(s,[['calibrated_go','mark',{companions:['surveyor','assistant']}] ]);
