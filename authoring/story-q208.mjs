import {O,give,set,and} from './story-kit.mjs';
import {episode,person,point,worldRoutes} from './kagaribi-kit.mjs';
const s=episode(208,'誰のための消灯','追悼灯の世話役メア',{rest:'中継広間の小さな追悼台',shelf:'納骨所の私物棚'},{rest:point('kagaribi_relay',9,5),shelf:point('kagaribi_ossuary',7,1)},'皆で偲ぶ場所に、偲ばれたくない関係の名前を置いてよいか。');
person(s,'keeper','rest','メア','私設追悼灯の世話役','亡き職人を仲間として覚えておく','名前を明るく読めるようにすることが遺族にも良い','追悼を迷惑だったと言われること','フユの父を同僚として知る。家庭での暴力については知らない。');
person(s,'daughter','shelf','フユ','追悼された職人の娘','父の追悼への参加を求められずに働く','灯を消してもらう以外に断り方がない','父を許したことにされること','父の職場での働きは否定しないが、自分へ向けた暴力を忘れたくない。');
s.entity('namecard','keeper').entity('screen','shelf').entity('lamp','rest').bool('lampLit',true,'私設の小灯が灯っている').bool('nameVisible',true,'通路から名札が見える').bool('request').bool('installed').enum('choice','none',['none','screen','off','private']);
s.brief='中継広間の小さな追悼灯を消してほしいという申し出が届いた。世話役は納骨所にいる申出人の意向を確かめてほしい。';
s.past=['メアは亡き同僚の名を書いた札を私設の追悼灯へ置いた。フユに相談はしなかった。','父から暴力を受けたフユは追悼への参加を断りたい。追悼灯は普通の小灯であり、迷宮の防護火・中継火とは別物である。'];
s.revealText=s.past.join(' ');s.progression='申出人の意向を聞き、名を隠す覆いを預かる。灯の防護効果を変えず、遮蔽、私設灯の消灯、名札の返却を選ぶ。';
s.node('entry','rest',['keeper'],'メアは小灯の横へ父親の名札を立てていた。「仕事の帰りに、読めるようにしたんです」。フユから届いたのは「消してください」という短い申し出だった。中継火そのものへの苦情ではない。',[
 O('ask','納骨所へ行き、フユに何を避けたいのか聞く','request')]);
s.node('request','shelf',['daughter'],'フユは、父が同僚を助けたことを否定しなかった。「でも、家でされたことまで、それで良かったことにしないで」。灯の前で毎回頭を下げるよう求められるのがつらいという。「隠すか、消すか、札を返して。仲間だった話まで奪う気はない」',[
 O('take','本人が用意した覆いを預かり、三つの希望を世話役へ伝えに戻る','decide')]);
s.node('decide','rest',['keeper'],'メアに申し出を伝えると、彼女は小灯の位置を見た。「ここを通るたび、礼をしてもらっていた」。覚えていたい同僚と、娘が頭を下げる義務は、同じものではなかった。覆いで名を隠すには固定用の縄が要る。',[
 O('screen','縄1本で覆いを固定し、通路から名が見えないようにする','@screen',[give('screen','party','rest'),set('installed'),set('nameVisible',false),set('choice','screen')],{cost:{rope:1}}),
 O('off','世話役の同意を得て私設の小灯を消し、札を伏せて預ける','@off',[give('screen','party','keeper'),set('lampLit',false),set('nameVisible',false),set('choice','off')]),
 O('private','名札を預かり、フユへ返しに行く','return')]);
s.node('return','shelf',['daughter'],'フユの前へ戻った。名札と覆いを持っている。灯を囲む仲間の記憶まで消す約束はしていないが、本人に参加を求める札は持ち帰れた。',[
 O('hand','名札と覆いを返し、公開の追悼から外したことを伝える','@private',[give('namecard','party','daughter'),give('screen','party','daughter'),set('choice','private')])]);
s.end('screen','名前へ頭を下げずに通れる','覆いが固定され、通路から名札が見えなくなった。メアは追悼への参加を通行人へ求めないと決めた。小灯は内側に残り、迷宮の防護や明るさの仕組みは変えていない。',and(s.is('choice','screen'),s.is('lampLit'),s.is('nameVisible',false),s.is('installed'),s.is('screenAt','rest'),s.is('namecardAt','keeper')));
s.end('off','小灯だけを消す','メアは私設の小灯を消し、名札を伏せた。中継火はそのままだ。同僚を忘れたのではなく、ここで毎回誰かを追悼へ巻き込むやり方を止めた。',and(s.is('choice','off'),s.is('lampLit',false),s.is('nameVisible',false),s.is('screenAt','keeper'),s.is('namecardAt','keeper')));
s.end('private','札の置き場所を本人へ返す','名札と覆いはフユの手へ戻った。彼女は札を読まずに布へ包んだ。許したとも、捨てるとも言わなかった。次にどこへ置くかを他人が決めない状態になった。',and(s.is('choice','private'),s.is('nameVisible',false),s.is('namecardAt','daughter'),s.is('screenAt','daughter'),s.is('partyAt','shelf')));
s.routeNotes=[['中継広間の追悼台','防護火とは別の私設小灯への消灯願いを受ける。'],['納骨所の私物棚','フユの意向を聞き、覆いを預かって中継広間へ戻る。'],['中継広間／納骨所','縄1本で遮蔽、私設小灯の消灯、名札の返却を選ぶ。返却の場合は札を運び、本人へ渡す。']];
export default worldRoutes(s,[['entry_ask','shelf'],['request_take','rest',{depart:[give('screen','shelf','party'),set('request')]}],['decide_private','shelf',{depart:[give('namecard','keeper','party'),set('nameVisible',false)]}]]);
