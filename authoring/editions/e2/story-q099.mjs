import {O,set,give,see,and,or,not,when} from '../../story-kit.mjs';
import {dungeonQuest} from './dungeon-world.mjs';

const quest=dungeonQuest(99,{lamp:['二人が守る灯',11,10],oil:['油の受渡し棚',11,11],dock:['迎えの綱の巻場',11,9],exit:['家族の待つ昇降口',11,12]},
  {returner:['lamp','帰りたい灯守','家族のいる地上へ帰る',['exit']],resident:['lamp','残りたい灯守','地下に残って灯を整備する',['exit']],rine:['exit','灯番組合のリネ','家族への便りと油を次の便に載せる']},
  {dungeon:'region_10',floor:2,prefix:'beacon'});
export const beaconCharacters=quest.characters;
export function beaconSource(){
  const {s,scene,implies,finish}=quest.create(),is=s.is;
  s.entity('letter','resident').bool('pickup').bool('oilDate').bool('guardDown');
  s.fact('wishes','灯を守る二人のうち、一人は帰還を望み、もう一人は保守のため残る。');
  const option=condition=>({when:condition,visibleWhen:condition});
  scene('entry','lamp','灯皿の下に、持ち主の名と日付を刻んだ小箱がある。遺品だと聞いて来たが、今も一人が油を足し、もう一人が芯を切っている。日付は死亡日なのだろうか。',[
    O('talk','意思を聞く','voices',[see('wishes','resident')]),O('message','便りを預かる','parcel',[give('letter','resident','party')]),
    O('bring','守り手戦','defeated',[set('guardDown')],{combat:'guard_10',combatRequirement:'要勝利'})]);
  scene('voices','lamp',[when(is('pickup'),'迎えの綱には一人分の席札が掛かった。帰りたい灯守は、合図が来るまでここで待つ。','一人が手を止めた。「迎えがあれば、家に帰ります」。相方の道具箱は自分の荷に混ぜなかった。'),
    when(is('oilDate'),'油の棚には次の受渡し日が書いてある。残る灯守はその日を覚えておくという。','もう一人は灯の下を離れない。「私はここで芯を替えます。油と、家からの便りを持って来てください」')],[
    O('returner','迎えを手配','winch',[],option(not(is('pickup')))),O('resident','油棚へ','schedule',[],option(not(is('oilDate')))),
    O('connect','連絡路を結ぶ','agreed',[],{when:and(is('pickup'),is('oilDate')),visibleWhen:and(is('pickup'),is('oilDate'))}),
    O('carry','便りを届ける','parcel',[give('letter','resident','party')])]);
  scene('winch','dock','綱番の札に一人分の空きがある。帰りたい人の分だけ席を押さえ、その人が実際に来るまで空けておく。',[O('book','一席を押さえる','booked',[set('pickup')])]);
  scene('booked','dock','迎えの籠が昇降口に回った。灯のそばで返事を待つ本人に席が取れたと知らせに戻る。',[O('back','灯へ戻る','voices')]);
  scene('schedule','oil','空き缶の横に前回の受領印が残っていた。便りを預ける棚と油を下ろす棚の両方に、残る人と決めた日を記す。',[O('date','受渡日を記す','dated',[set('oilDate')])]);
  scene('dated','oil','次の巡回日が二枚の札に同じ字で入った。灯を守る本人に控えを持ち帰る。',[O('back','灯へ戻る','voices')]);
  scene('agreed','lamp','一人は荷を閉じ、もう一人は油棚の日付を確かめた。二人がそれぞれ選んだことを、昇降口でリネへ伝える。帰りたい一人が綱を握った。',[O('escort','一人を迎えへ','arrived')]);
  scene('arrived','exit','帰りたい灯守が籠に乗った。リネはもう一人の席を数に入れず、地下へ返す油缶に次の日付を貼る。これで灯を消さずに便りが往復する。',[O('link','連絡日を渡す','@informed')]);
  scene('parcel','lamp','小箱の中の遺品と、今生きている人からの便りを別々に包んだ。どちらに誰の名を付けるかを本人が読み返し、包みを一行に託した。二人は灯のそばに残る。',[O('carry','家族の待つ口へ','family')]);
  scene('family','exit','リネが遺品の包みを置き、便りの封を家族へ向けた。名前の横の日付が、死んだ日でなく地下で灯を守り始めた日だと、手紙には書いてある。',[O('hand','便りを渡す','@compromise',[give('letter','party','rine')])]);
  scene('defeated','lamp','守り手が倒れ、出口への道が開いた。二人ともまだ灯皿のそばにいる。保守を続けたい人も荷を閉じ、連れ出される列に入った。',[O('escort','二人を地上へ','forced')]);
  scene('forced','exit','籠から二人が降りた。リネは帰還者を二人と記す。地下で暮らしを立てていた人の荷には、今夜使える家の鍵が一つもない。',[O('report','二人を引き渡す','@contract')]);
  implies('wishes',or(is('pickup'),is('oilDate')),s.known('wishes'),'本人の返事を聞いてから迎えと補充の予定を持つ');
  return finish([['voices_returner','dock'],['booked_back','lamp'],['voices_resident','oil'],['dated_back','lamp'],['agreed_escort','exit',['returner']],['parcel_carry','exit'],['defeated_escort','exit',['returner','resident']]],
    {informed:and(is('pickup'),is('oilDate'),is('returnerAt','exit'),is('residentAt','lamp')),compromise:and(is('letterAt','rine'),is('returnerAt','lamp'),is('residentAt','lamp')),
    contract:and(is('guardDown'),is('returnerAt','exit'),is('residentAt','exit'))});
}
