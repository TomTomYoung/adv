import {O,set,see,and,or} from '../../story-kit.mjs';
import {dungeonQuest} from './dungeon-world.mjs';

const quest=dungeonQuest(96,{belt:['荷が動きだす運搬床',15,5],cache:['包帯を置く曲がり角',14,5],deep:['奥の空箱',13,5],depot:['町行きの荷受口',15,4]},
  {noa:['belt','案内人のノア','前の隊が残した荷の行先を確かめる'],clerk:['depot','町便の荷受人','回収した袋を数えて町便に載せる']},
  {dungeon:'region_10',floor:2,prefix:'stores',characterIds:{noa:'e2_abyss_noa'}});
export const storesCharacters=quest.characters;
export function storesSource(){
  const {s,scene,implies,finish}=quest.create(),is=s.is;
  s.entity('bag','belt').entity('next','belt');
  s.enum('line','running',['running','stopped','corner','deep'],'運搬床と次便の行先');
  s.enum('swap','none',['none','corner','deep'],'どの補給場所で糧食を一つ交換したか');
  s.bool('posted').bool('shipped');
  s.fact('dates','遭難の多い角に、前の隊の補充日と使った量が書いてある。');
  scene('entry','belt','床板が一枚ずつ傾き、麻袋が角へ送られていく。一番前の袋は口が開き、水筒一本ぶんの窪みがある。ノアが持主の名を探したが、荷札にあるのは日付だけだった。',[
    O('follow','袋を追う','corner'),O('recover','床を止める','stopped',[set('line','stopped')])]);
  scene('corner','cache','袋は壁の窪みで止まった。包帯の切れ端の下に、前の隊の補充日が何行も並ぶ。新しい日付ほど水筒の跡が浅い。落とし物なら、なぜここで少しずつ減るのだろう。',[O('read','補充日を読む','choice',[see('dates','cache')])]);
  scene('choice','cache','前の隊もここで包帯を取り、帰りに水を置いている。次の人に使い方を知らせる札を掛けられる。下段には交換用の古い糧食が一包み。床板は、この角より奥にも続く。',[
    O('label','補給札を掛ける','marked',[set('posted'),set('line','corner')]),
    O('replace','交換','swapped',[set('swap','corner')],{cost:{ration:1},costRequirement:'糧食1個'}),O('route','奥の箱へ','empty')],s.known('dates'));
  scene('marked','cache','札の持主欄に「次に来る人」と記す。袋の口を壁に向けずに置き直すと、曲がってきた人の目に包帯と水が同時に入る。',[O('leave','補給を残す','@informed')]);
  scene('swapped','cache','一行の新しい糧食が、壁の棚に一包みある。引き取った古い包みの紐を切り、日付を回収欄へ写す。水と包帯は次の人が使える。',[O('note','日付を記す','@compromise')],is('swap','corner'));
  scene('empty','deep','奥の箱には配達札だけが引っかかっている。上段は空で、底の点検袋に古い非常食が一包み残っていた。次便をここへ回すか、手持ちの糧食と交換して補給を待てる。',[
    O('redirect','行先札を取る','tag',[set('posted')]),O('fresh','交換','restocked',[set('swap','deep')],{cost:{ration:1},costRequirement:'糧食1個'})]);
  scene('tag','deep','箱の縁に補給の表示を結び、行先を書いた控えを持つ。次便は、まだノアの前の床板に載っている。',[O('back','運搬床へ','switch')]);
  scene('switch','belt','ノアに控えを見せ、次の袋を載せた床板の送り先を奥に合わせる。先に運んだ袋は、手前の角にそのまま残る。',[O('turn','送り先を変える','dispatch',[set('line','deep')])]);
  scene('dispatch','belt','床の矢印が奥を向いた。新しい荷札を付けた次便が動き出す。',[O('escort','次便を追う','delivery')]);
  scene('delivery','deep','次便の袋が、空だった箱の受け板を押し下げた。表示は箱の外から読める。手前に寄った隊にも、ここまで来た隊にも補給が残る。',[O('check','到着を記す','@informed')]);
  scene('restocked','deep','古い包みを引き取り、空だった上段に新しい糧食を置いた。次便の行先札は手前向きのまま。交換した日を箱の内側に書き添える。',[O('note','交換を記す','@compromise')],is('swap','deep'));
  scene('stopped','belt','ノアと床板の留めを掛けた。先頭の袋も次便の袋もここにある。二つを荷台へ載せれば、町へ戻る便に間に合う。',[O('cart','町便へ運ぶ','manifest')],is('line','stopped'));
  scene('manifest','depot','荷受人が二つの袋を町便の網にくくり、受領印を押した。奥の箱へ落ちるはずの荷は、これでなくなる。',[O('ship','町便に渡す','@contract',[set('shipped')])]);
  implies('delivery',is('line','deep'),and(is('posted'),s.known('dates')),'奥への次便は箱に補給表示を付けてから送る');
  implies('swap',or(is('swap','corner'),is('swap','deep')),and(s.known('dates'),is('bagAt','cache'),is('line','running')),'糧食だけを一度交換し、運搬床と元の袋を保持する');
  return finish([['entry_follow','cache',['bag']],['choice_route','deep'],['tag_back','belt'],['dispatch_escort','deep',['next']],['stopped_cart','depot',['bag','next']]],
    {informed:and(is('posted'),is('bagAt','cache'),or(is('line','corner'),and(is('line','deep'),is('nextAt','deep')))),
     compromise:or(is('swap','corner'),is('swap','deep')),contract:and(is('shipped'),is('line','stopped'),is('bagAt','depot'),is('nextAt','depot'))});
}
