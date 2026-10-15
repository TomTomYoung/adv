import {O,give,set,see,and} from './story-kit.mjs';
import {episode,person,point,worldRoutes} from './kagaribi-kit.mjs';
const s=episode(202,'片耳の合図','見習い灯番トマ',{entry:'巡灯路の訓練札前',post:'交差路の合図杭'},{entry:point('kagaribi_f1',5,1),post:point('kagaribi_crossroads',7,1)},'合図に従わない人を変えるのか、合図の届き方を変えるのか。');
person(s,'trainee','entry','トマ','別班の見習い灯番','聞き落としを隠さず巡回を続ける','聞こえにくいと認めたら外される','一人前になる機会を失うこと','幼い頃から左耳が聞こえにくい。試験の鐘は左後方から鳴った。q001の新人とは別人。');
person(s,'trainer','post','セナ','合図の教習係','誰が担当しても伝わる手順を決める','返事がなかったのは集中していなかったからだ','配慮を口実に危険な独り立ちを認めること','試験結果は見たが、トマの聴力については聞いていない。');
s.entity('plate','trainer').bool('disclosed').bool('tested').enum('method','none',['none','paired','visual','retrain']);
s.fact('side','左後方の声だけを聞き落とし、正面からの声には答えた。');
s.brief='見習いトマは合図の試験に落ちた。もう一度、教習係のいる交差路まで同行してほしいという。';
s.past=['トマは左耳が聞こえにくいことを申告せず、左後方から鳴らされた試験の鐘に返事をしなかった。セナはそれを不注意だと判断した。'];
s.revealText=s.past[0];s.progression='本人の申告を受けて教習係へ同行する。合図を実際に試し、二人巡回、視覚合図、独り立ち延期のいずれかを訓練札へ記す。';
s.node('entry','entry',['trainee'],'トマは声をかけるたび、右耳をこちらへ向けた。「聞こえなかった、と言うと、聞く気がなかったことになる」。左耳のことを教習係に話すつもりだという。「代わりに言わないで。一緒にいてくれればいい」',[
 O('walk','トマと交差路へ歩く','lesson')]);
s.node('lesson','post',['trainee','trainer'],'トマが左耳のことを話すと、セナは鐘を置いた。「では、どこからなら届くかを調べよう。聞けたふりは要らない」。彼女は正面と左後方から同じ言葉をかける試験を提案した。',[
 O('test','二方向の声と、正面から見せる手の合図を試す','result',[set('disclosed'),set('tested'),see('side','trainee')]),
 O('defer','今日は独り立ちを延期し、訓練札を預けたままにする','@retrain',[set('disclosed'),set('method','retrain')])]);
s.node('result','post',['trainee','trainer'],'左後方の声には応答がなかった。正面の声と手の合図には、トマは一度ずつ答えた。「目でも、背中は見えないね」とセナが言う。二人巡回なら縄の合図を加えられる。視覚合図なら、必ず向き合ってから送る手順を守る必要がある。',[
 O('pair','縄1本を合図用に渡し、二人巡回に限定した訓練札を受け取る','@paired',[give('plate','trainer','trainee'),set('method','paired')],{cost:{rope:1}}),
 O('visual','正面で応答を確認する手順を書き、訓練札をトマに渡す','@visual',[give('plate','trainer','trainee'),set('method','visual')])]);
s.end('paired','縄の返事を待つ','セナは訓練札に「二人巡回」と書いた。縄の引き方は伝えたが、相棒の手配までは終わっていない。トマは札を受け取り、初めて左側から呼ばれたときに「もう一度」と言った。',and(s.is('tested'),s.is('method','paired'),s.is('plateAt','trainee'),s.is('traineeAt','post')));
s.end('visual','向き合ってから送る','トマの札には、正面で合図を送り、相手の応答を待つ手順が加わった。誰も聞こえ方を治してはいない。セナも合図を投げっぱなしにしない責任を引き受けた。',and(s.is('tested'),s.is('method','visual'),s.is('plateAt','trainee')));
s.end('retrain','延期の理由を本人の言葉で残す','訓練札はセナの手元に残った。不注意の一語は取り消され、左側からの合図が届かなかったことと、再試験が必要なことが記された。トマは今日、独り立ちしなかった。',and(s.is('disclosed'),s.is('method','retrain'),s.is('plateAt','trainer'),s.is('traineeAt','post')));
s.routeNotes=[['巡灯路','トマから左耳のことを聞き、本人が説明できるよう交差路へ同行する。'],['交差路の合図杭','申告後に試験を延期するか、方向を変えた声と手の合図を試す。'],['交差路の合図杭','試験結果を受け、縄1本を使う二人巡回か、正面で応答を確認する手順を訓練札に記す。']];
export default worldRoutes(s,[['entry_walk','post',{companions:['trainee']}] ]);
