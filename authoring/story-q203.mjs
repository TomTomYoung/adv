import {O,give,set,see,and,eq} from './story-kit.mjs';
import {episode,person,point,worldRoutes} from './kagaribi-kit.mjs';
const s=episode(203,'油の底の水','油商ゲル',{desk:'油蔵の検品台',test:'煤けた回廊の試験皿'},{desk:point('kagaribi_oilstore',9,1),test:point('kagaribi_f2',3,1)},'使える部分がある品を、不良の原因と一緒に引き受けられるか。');
person(s,'seller','desk','ゲル','油の納入商','不良を認めても取引を失わずに済ませる','混入を認めれば水増しと決めつけられる','働いて納めた油まで全て詐欺と呼ばれること','雨ざらしの漏斗を使った。水が入った経緯は知るが、燃焼試験をしていない。');
person(s,'tester','test','ユハ','灯油の検品係','使える量と使えない量を区別して記録する','色だけで品質は保証できない','試験の成功を全樽の保証へ広げられること','試験皿と目盛り管を持つ。納入時の作業は見ていない。');
s.entity('bottle','seller').entity('cup','tester').int('sample',3,0,3,'試料の上澄みを含む総量（目盛り）','bottle').int('portion',0,0,3,'試験皿へ分けた油の量（目盛り）','cup').int('burned',0,0,3,'試験で燃焼した量（目盛り）').bool('tested').enum('disposal','none',['none','returned','limited','public']);
s.invariant('volume',eq({op:'add',args:[s.v('sample'),s.v('portion'),s.v('burned')]},3),'試料の量を増減させず、燃焼分も記録する');
s.fact('water','試料の底に水が分離し、上澄み二目盛りだけが試験に使える。').fact('flame','今回分けた上澄み一目盛りは燃えた。全樽の品質を証明したわけではない。');
s.brief='納入した油に水増しの疑いをかけられた商人が、封じた試料を検品係へ届けてほしいという。';
s.past=['ゲルは屋外に置いた漏斗を乾かさずに使い、納入油へ雨水を混入させた。故意の水増しではない。','試料瓶には上澄み二目盛りと底の水一目盛りが入っている。これは専用試料で、迷宮の既存の火台や所持品の油とは別物である。'];
s.revealText=s.past.join(' ');s.progression='封じた試料を運び、分離を観察する。返却だけでも終えられる。上澄みを分けて松明で試験する場合は、使った量と保証の範囲を残す。';
s.node('entry','desk',['seller'],'ゲルは封をした小瓶を両手で包んでいた。「水を売ったと言われたら、次はありません」。雨の日に漏斗をしまい忘れたことは認める。「燃えるかどうかは、自分の言葉だけで通したくない」',[
 O('carry','試料瓶を預かり、回廊の検品係へ運ぶ','inspect')]);
s.node('inspect','test',['tester'],'ユハは瓶を台に置き、揺れがおさまるのを待った。底に透明な一目盛り、その上に油が二目盛りある。「分かれたね。燃える量は別に試す。試料だけで全樽に判を押すことはできない」',[
 O('return','燃焼試験をせず、分離した試料を商人へ返しに行く','return'),
 O('pour','上澄み二目盛りを試験皿へ分ける','portion',[{op:'pour',from:'sample',to:'portion',amount:2}])]);
s.node('portion','test',['tester'],'試験皿に上澄み二目盛りを分けた。瓶には底の水が一目盛り残っている。ユハは一本の松明で、一目盛りだけを燃やす手順を示した。',[
 O('burn','松明1本を使い、一目盛りの燃焼を試す','result',[{op:'consume',key:'portion',sink:'burned',amount:1},set('tested'),see('flame','tester')],{cost:{torch:1}})]);
s.node('result','test',['tester'],'上澄み一目盛りは燃えた。試験皿に油が一目盛り、瓶に水が一目盛り残る。「使える油もあった。それと納入が適正だったことは、同じじゃない」。ユハは、残った試料をどこへ渡すか尋ねた。',[
 O('limited','残った瓶を商人へ返し、今回の試験範囲だけ伝える','limited'),
 O('public','商人の納入名を添えて瓶を検品係へ預け、混入審査を依頼する','@public',[give('bottle','party','tester'),set('disposal','public')])]);
s.node('return','desk',['seller'],'ゲルは戻ってきた瓶を見た。底の水は、振らなければ隠れない。燃焼試験をしていないことも、油と水が分かれたことも、そのまま伝えられる。',[
 O('hand','未試験であることを告げ、試料を返す','@returned',[give('bottle','party','seller'),set('disposal','returned')])]);
s.node('limited','desk',['seller'],'瓶の中に残ったのは水だけだ。ゲルは一目盛りの水を光へかざした。「燃えた分だけの話、ですね」。残りの油一目盛りはユハの試験皿にあり、全樽の受入れは決まっていない。',[
 O('hand','瓶と試験結果を渡し、全樽の保証はしない','@limited',[give('bottle','party','seller'),set('disposal','limited')])]);
s.end('returned','混入だけを確かめて返す','ゲルに試料瓶を返した。水の混入は確かめたが、燃焼品質は試していない。商人は瓶を振らずに台へ置いた。弁明のために持たせた瓶が、次に説明しなければならない事実になった。',and(s.is('disposal','returned'),s.is('bottleAt','seller'),s.is('sample',3),s.is('burned',0)));
s.end('limited','使えた量を限って伝える','一目盛りの燃焼結果をゲルへ伝え、底の水が残る瓶を返した。取引全体のお墨付きにはしなかった。試験皿の油は検品係が保管し、残りの樽は別に検品する必要がある。',and(s.is('disposal','limited'),s.is('tested'),s.is('burned',1),s.is('bottleAt','seller')));
s.end('public','残った水を審査へ預ける','水の残る瓶をユハへ渡し、納入名を添えた。燃えた一目盛りの結果も、不良の事実も記録に残る。水増しの故意を立証したわけではないが、ゲルには混入の経緯を公に説明する仕事が残った。',and(s.is('disposal','public'),s.is('tested'),s.is('bottleAt','tester'),s.is('sample',1)));
s.routeNotes=[['油蔵の検品台','ゲルから封じた試料瓶を預かる。'],['煤けた回廊の試験皿','水と油の分離を観察。未試験で返すか、上澄み二目盛りを分け、松明1本で一目盛りを燃やす。'],['油蔵／回廊','未試験または限定した結果を瓶とともに商人へ返す。審査を選ぶ場合は瓶を検品係へ渡す。']];
// 探索隊への依頼報酬。物語内の給金・立替金・私物とは別に精算する。
Object.assign(s.outcomes.returned,{gold:90,xp:240,gems:10});
Object.assign(s.outcomes.limited,{gold:50,xp:240,gems:18});
Object.assign(s.outcomes.public,{gold:60,xp:240,gems:24});
export default worldRoutes(s,[['entry_carry','test',{depart:[give('bottle','seller','party')],arrive:[see('water','tester')]}],['inspect_return','desk'],['result_limited','desk']]);
