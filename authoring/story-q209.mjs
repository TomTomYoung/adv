import {O,give,set,and} from './story-kit.mjs';
import {episode,person,point,worldRoutes} from './kagaribi-kit.mjs';
const s=episode(209,'借り物の武勇','護衛見習いエル',{hall:'煤けた回廊の盾掛け',entry:'巡灯路の帰路札前'},{hall:point('kagaribi_f2',5,1),entry:point('kagaribi_f1',11,1)},'助けたことを、倒したことに言い換えないまま誇れるか。');
person(s,'guard','hall','ゼド','帰還護衛を請ける傭兵','エルの信頼を失わずに護衛の仕事を続ける','討伐をしていない護衛は臆病だと思われる','逃げたことしか覚えられないこと','以前は怪物と戦わず、仲間の盾を借りて荷運び人を帰した。討伐したという噂を訂正しなかった。');
person(s,'pupil','hall','エル','護衛の見習い','師の戦い方を実際に見て覚える','盾に傷があるなら持ち主が敵を倒した証拠だ','憧れた人を嘘つきと呼ぶしかなくなること','討伐の現場は見ていない。噂と借りた盾の傷を根拠にゼドを評価した。');
s.entity('shield','guard').entity('report','pupil').bool('admitted').bool('witnessed').bool('returned').enum('account','none',['none','battle','escort','limited']);
s.brief='護衛見習いが、灰蝋の魔物を倒したという傭兵の実地教習に立ち会ってほしいと頼んできた。';
s.past=['ゼドは過去の帰還護衛で戦わず、仲間から借りた傷のある盾を構えて荷運び人と退いた。討伐したというエルの誤解を訂正しなかった。','盾の古傷はゼドの戦績ではない。今回の戦闘結果を過去の討伐証明へ流用しない。'];
s.revealText=s.past.join(' ');s.progression='見習いの前で護衛と討伐を区別する。今回の戦闘を実演するか、戦わず帰路を教えるか、立会いを断って確認範囲だけ記す。';
s.node('entry','hall',['guard','pupil'],'エルは盾の傷を指して「この一撃で倒したんですよね」と言った。ゼドは盾を裏返した。「倒したところは、見せられない」。誰の盾かを尋ねると、借り物だと認めた。「前は、これで構えて逃がした。それだけだ」',[
 O('battle','過去の噂は訂正した上で、今回の魔物との戦闘に立ち会う','challenge',[set('admitted')]),
 O('escort','討伐の実演をせず、二人と安全確認をしながら巡灯路へ戻る','home'),
 O('limited','教習への立会いを断り、過去の討伐は確認できないと報告へ記す','@limited',[set('admitted'),set('account','limited')])]);
s.node('challenge','hall',['guard','pupil'],'近くをうろつく灰蝋の魔物に探索隊が対処し、ゼドとエルは退路側から手順を見ることになった。「今日倒せたとしても、前に倒した証拠にはならない」とゼドが言う。勝利するまで実演成功とは記せない。',[
 O('fight','探索隊が魔物を退け、二人に今回の戦闘を見届けてもらう','witness',[set('witnessed')],{combat:'kagaribi_wax'})]);
s.node('witness','hall',['guard','pupil'],'今回の魔物を退けた。エルは、探索隊が戦い、ゼドが退路側に立っていたと分けて記した。見ていない過去を埋めるための戦績ではない。',[
 O('sign','今回の探索隊の戦闘とゼドの見届けを、別々に報告へ記す','@battle',[set('account','battle')])]);
s.node('home','entry',['guard','pupil'],'ゼドとエルを伴って巡灯路へ戻った。途中の戦いがあれば探索隊の戦績であり、過去の噂とは別だ。ゼドは曲がり角で立つ位置を教え、エルは「倒すところ」ではなく「戻るところ」の欄を作った。',[
 O('record','歩いて帰った教習を記録し、討伐の噂も本人の言葉で訂正する','@escort',[set('admitted'),set('returned'),set('account','escort')])]);
s.end('battle','今日見た戦いだけを書く','エルの報告には、今回戦った探索隊と見届けた二人の役割が残った。ゼドの過去の討伐は証明されていない。盾の傷を武勇に数えず、それでも次の仕事を頼むかは見習い自身に残した。',and(s.is('account','battle'),s.is('witnessed'),s.is('admitted'),s.is('reportAt','pupil')));
s.end('escort','帰す仕事を教習にする','ゼドは、昔も倒さずに帰したのだとエルへ話した。二人は実際に巡灯路へ戻り、今回の帰路を記録した。噂の武勇は減ったが、帰還護衛として何を教えられるかは見える形になった。',and(s.is('account','escort'),s.is('returned'),s.is('guardAt','entry'),s.is('pupilAt','entry')));
s.end('limited','確認していない武勇には署名しない','エルの報告には、過去の討伐を確認できず、今回の実演にも立ち会っていないと記された。ゼドを試すための戦いは起こさなかった。二人の関係の結論まで、探索隊が代わりに決めることもしなかった。',and(s.is('account','limited'),s.is('witnessed',false),s.is('admitted')));
s.routeNotes=[['煤けた回廊の盾掛け','盾の古傷と討伐の噂を切り分け、ゼドの説明を聞く。'],['煤けた回廊の盾掛け','戦闘を選ぶ場合は探索隊が灰蝋の魔物を退け、今回の観測範囲だけ報告する。立会いを断る経路もある。'],['巡灯路の帰路札前','護衛教習を選ぶ場合は二人と歩いて戻り、帰還の仕事として記録する。']];
export default worldRoutes(s,[['entry_escort','entry',{companions:['guard','pupil'],depart:[set('admitted')]}]]);
