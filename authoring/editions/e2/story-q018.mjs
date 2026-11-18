import {story, O, set, give, and, or, not, when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

const sites = {
  bank:['搬出口下の川辺','e2_cart_surface','搬出口から続く石段の下。白い板を水に沈める平石が岸にある。'],
  desk:['川辺の返済窓口','e2_white_debt_bank','川を見下ろす一段高い所に記帳台がある。役人が返済簿と受領印を預かる。'],
  pawn:['オウの質屋','e2_rat_lane','倉庫横の路地に面した質屋。奥の棚には預かり物の札が下がる。'],
  door:['借り手の家の戸口','e2_rat_lane','路地の向かいに小さな家がある。戸板に以前の貼り紙の跡が残る。']
};
const id = key => 'e2_white_debt_'+key;
const places = Object.fromEntries(Object.entries(sites).map(([key,[name]])=>[key,name]));
const world = Object.fromEntries(Object.keys(sites).map(key=>[key,{kind:'town',location:id(key)}]));
export function extendWhiteDebtGeography(bundle) {
  for(const [key,[name,parent,description]] of Object.entries(sites)){
    const location=id(key);
    bundle.additions.locations[location]={id:location,name,parent,links:[],background:'location_square',description};
  }
}

const roles = {
  borrower:['借り手','最後の一回分を払い、借用証を失効させる'],
  official:['返済役人','返済の受理と借用証の失効を別々に記録する'],
  ow:['質屋のオウ','川へ沈める前に借用証の原本を取り戻す']
};
export const whiteDebtCharacters=Object.fromEntries(Object.entries(roles).map(([key,[name,goal]])=>
  [id(key),{id:id(key),name,goal,quests:['q018'],detail:'灯帰りの川辺で塩板の借用証をめぐって出会う人物。'}]));

export function whiteDebtSource(){
  const s=story(18,{...places},[]),pair=['borrower','official'],all=[...pair,'ow'];
  s.entity('borrower','bank',id('borrower')).entity('official','desk',id('official')).entity('ow','pawn',id('ow'));
  s.entity('tablet','borrower').entity('installment','borrower').entity('register','official');
  s.entity('borrowerCopy','official').entity('owCopy','official');
  // The original ceases to be an enforceable whole. Its two marked pieces have separate custodians.
  s.entity('dissolved','bank').entity('halves','desk');
  s.entity('borrowerHalf','tablet').entity('owHalf','tablet').entity('redSlip','ow');
  for(const key of ['scheduleKnown','owPresent','paymentConfirmed','paperReceipt','completionLine','split','dissolved','seized','debtEnded','consent','demandWritten','demandPosted'])s.bool(key);
  s.enum('opening','open',['open','copy','both','seize']);
  s.enum('method','undecided',['undecided','dissolve','split']);
  const paid=s.is('paymentConfirmed'),split=s.is('method','split'),water=s.is('method','dissolve');
  const accept=[give('installment','borrower','official'),set('paymentConfirmed')];
  const node=(...args)=>s.node(...args);

  node('entry','bank',['borrower'],'借り手が塩板を包んだ布をひざに置き、もう片方の手で小さな金袋を握っている。「最後の一回分だ。窓口が開いたら一緒に来てくれ」。質屋のオウから頼まれたのは、川に沈める前にその板を持ち帰ることだった。',[
    O('copy','借り手と窓口へ行き、返済の時刻と金額を照合する','ledger'),
    O('both','借り手を窓口まで案内し、先にオウを呼びに行く','waiting'),
    O('seize','支払いの前に塩板を回収する','carrying',[give('tablet','borrower','party'),set('opening','seize'),set('seized')])
  ]);
  node('ledger','desk',pair,'役人が窓を開けた。帳簿には最終回の時刻と金額を書く欄がある。借り手は金袋の口をほどいた。',[
    O('check','帳簿の日付と金額を借り手と照合する','ritual',[set('scheduleKnown')])
  ]);
  node('ritual','desk',pair,'今日の欄にある金額と、袋の中身は一致した。受領欄は空白だ。「板を溶かすなら、オウにもここへ来てもらおう」と役人が言った。',[
    O('dissolve','溶かす儀礼に立ち会うよう、質屋へオウを呼びに行く','shop'),
    O('meet','先に最後の支払いを受理してもらい、原本の扱いをあとで相談する','paid_early',accept)
  ]);
  node('paid_early','desk',pair,'役人が借り手から金を受け取り、受領欄に額を書いた。借り手の手には塩板だけが残った。「この板を手元に残す方法も聞いてみたい」。',[
    O('call','借り手を窓口に残し、質屋へオウを呼びに行く','shop')
  ]);
  node('waiting','desk',pair,'役人は帳簿を開き、今日が最後の返済日であることと、その額を読み上げた。借り手は塩板と金袋を手にしたまま、窓口で待つことにした。',[
    O('call','路地の質屋へオウを呼びに行く','shop')
  ]);
  node('shop','pawn',['ow'],'店ではオウが重りを片付けていた。「借り手が川辺に？　原本をどうするかは私も見届ける」。オウは帳場を閉じて戸口に立った。',[
    O('escort','オウと川辺の返済窓口まで歩く','meeting')
  ]);
  node('meeting','desk',all,when(paid,'「そちらの金はもう受け取ったよ」。役人はオウに受領欄を見せた。残っているのは塩板をどうするかだ。','オウが窓口に並んだ。役人が金額を読み上げる。借り手が金袋を握っていて、受領欄はまだ空いている。'),[
    O('dissolve','三人で原本を川に溶かすことに同意する','agreed',[set('method','dissolve'),set('consent')]),
    O('split','完済線を入れた原本を割り、一片ずつ持つことに同意する','agreed',[set('method','split'),set('consent')],{when:not(water)})
  ]);
  node('agreed','desk',all,when(split,'借り手は塩板を台の上に広げた。「割った線がつながれば、何の板だったか分かる」。オウもそれでよいとうなずいた。','「水をくぐったら、もう字は読めない。紙の写しを一枚もらおう」。オウがそう言い、借り手も役人にうなずいた。'),[
    O('pay','借り手から最後の支払いを受け取り、受領欄に記す','received',accept,{when:not(paid)}),
    O('verify','記入済みの受領欄をオウと確認する','received',[],{when:paid})
  ]);
  node('received','desk',all,'役人が受領欄を指した。最後の金は役人の手元にあり、塩板の文字はまだ読める。二枚の用紙に同じ額と立会人の名を書き入れる。',[
    O('stamp','紙の記録と双方の写しに完済印を押す','stamped',[set('paperReceipt')])
  ]);
  node('stamped','desk',all,'台には役人の帳簿と、印の付いた二枚の写しが並ぶ。塩板がこれきり使えなくなるところまで三人で見届ける。',[
    O('river','借り手・オウ・役人と平石のある川辺に下りる','river',[],{when:water}),
    O('line','台の上で塩板の端から端まで完済線を刻む','marked',[set('completionLine')],{when:split})
  ]);
  node('river','bank',all,'借り手が平石にしゃがみ、塩板を水面のすぐ上で持った。オウと役人からも文字が見えている。',[
    O('sink','借り手が板を水に沈め、文字まで溶けるのを見届ける','melted',[give('tablet','borrower','dissolved'),set('dissolved'),set('debtEnded')])
  ]);
  node('melted','bank',all,'白く濁った水が平石を離れて流れた。借り手が手を開くと板はもうない。役人が川辺で写しを取り出した。',[
    O('borrower','役人から借り手へ完済記録の写しを渡す','water_copy',[give('borrowerCopy','official','borrower')])
  ]);
  node('water_copy','bank',all,'借り手は自分の写しを板の包みに収めた。オウは二枚目の紙の立会人欄を指でたどった。',[
    O('ow','オウにも写しを渡して引渡しを終える','@informed',[give('owCopy','official','ow')])
  ]);
  node('marked','desk',all,'一本の線が板の中央を横切っている。役人は両端の印をオウと借り手に確かめてもらった。板はまだ一枚だ。',[
    O('break','完済線で原本を二分し、役人が二片を預かる','divided',[give('borrowerHalf','tablet','official'),give('owHalf','tablet','official'),give('tablet','borrower','halves'),set('split'),set('debtEnded')])
  ]);
  node('divided','desk',all,'役人の前に二つのかけらがある。断面を合わせると、刻んだ線がひと続きになる。借り手が手を差し出した。',[
    O('borrower','借り手に一片と完済記録の写しを渡す','one_half',[give('borrowerHalf','official','borrower'),give('borrowerCopy','official','borrower')])
  ]);
  node('one_half','desk',all,'借り手は自分の一片を紙で包んだ。役人の手元にもう一片と、オウ宛ての写しが残っている。',[
    O('ow','オウに残る一片と写しを渡す','@compromise',[give('owHalf','official','ow'),give('owCopy','official','ow')])
  ]);
  node('carrying','bank',['borrower'],'隊が塩板を受け取ると、借り手は金袋を手にしたまま立ち尽くした。窓口へ金は渡っていない。',[
    O('shop','塩板を布に包んでオウの質屋へ運ぶ','delivery')
  ]);
  node('delivery','pawn',['ow'],'オウが店の戸を開け、布の上にある借り手の名を読んだ。',[
    O('hand','読めるままの原本をオウに手渡す','claim',[give('tablet','party','ow')])
  ]);
  node('claim','pawn',['ow'],'オウは原本の残額を赤い紙に書き写し、延滞金を書き足した。「今日の分もまだだ」。借り手の家へ持っていくという。',[
    O('door','赤札を持ったオウと借り手の戸口へ行く','notice')
  ]);
  node('notice','door',['ow'],'戸板には古い糊の跡があった。オウがその上に、自分の名で出した請求を押し当てる。金額は質屋で書いたとおりだ。',[
    O('post','オウが戸に貼った赤札と請求主の名を確かめる','@contract',[give('redSlip','ow','door'),set('demandPosted')])
  ]);

  const journey=connectWorld(s,world,1);
  journey('entry_copy','desk',{companions:['borrower'],depart:[set('opening','copy')]});
  journey('entry_both','desk',{companions:['borrower'],depart:[set('opening','both')],arrive:[set('scheduleKnown')]});
  journey('ritual_dissolve','pawn',{depart:[set('method','dissolve')]});
  journey('paid_early_call','pawn');
  journey('waiting_call','pawn');
  journey('shop_escort','desk',{companions:['ow'],arrive:[set('owPresent')]});
  journey('stamped_river','bank',{companions:all});
  journey('carrying_shop','pawn');
  journey('claim_door','door',{companions:['ow'],depart:[set('demandWritten')]});

  const copies=and(s.is('borrowerCopyAt','borrower'),s.is('owCopyAt','ow'));
  const finished=and(paid,s.is('paperReceipt'),s.is('consent'),s.is('owPresent'),s.is('debtEnded'),copies);
  s.story.endings={
    informed:and(finished,s.is('dissolved'),s.is('tabletAt','dissolved')),
    compromise:and(finished,s.is('split'),s.is('borrowerHalfAt','borrower'),s.is('owHalfAt','ow')),
    contract:and(s.is('seized'),s.is('tabletAt','ow'),s.is('redSlipAt','door'),s.is('demandPosted'),not(paid))
  };
  const implies=(key,condition,message)=>s.invariant(key,or(not(s.is(key)),condition),message);
  s.invariant('custody',or(and(paid,s.is('installmentAt','official')),and(not(paid),s.is('installmentAt','borrower'))),'受理済みの最後の返済金は役人が一度だけ預かる');
  implies('paperReceipt',and(paid,s.is('consent'),s.is('owPresent')),'受理と双方の立会いの後に紙の記録を発行する');
  implies('completionLine',and(split,s.is('paperReceipt')),'紙に記録してから原本に完済線を刻む');
  implies('split',and(s.is('completionLine'),s.is('tabletAt','halves'),not(s.is('dissolved'))),'完済線の付いた原本を二分する');
  implies('dissolved',and(water,s.is('paperReceipt'),s.is('tabletAt','dissolved')),'立会いと紙の記録を経て原本を川で溶かす');
  implies('debtEnded',or(s.is('dissolved'),s.is('split')),'最後の返済を受理し、原本を失効させたとき債務が終わる');
  implies('demandPosted',and(s.is('demandWritten'),s.is('tabletAt','ow'),not(paid),not(s.is('debtEnded'))),'原本を受け取ったオウ自身の再請求を戸口に掲示する');
  for(const scene of Object.values(s.story.scenes))scene.cast.forEach((c,i)=>{
    c.when=s.is(c.entity+'At',scene.place);
    c.display={x:({1:[50],2:[30,70],3:[16,50,84]})[scene.cast.length][i],y:10,scale:1,cardScale:1,layer:i};
  });
  return s.done();
}
