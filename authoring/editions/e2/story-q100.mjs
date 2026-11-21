import {O,set,give,see,and,or,not,when,ref,eq} from '../../story-kit.mjs';
import {dungeonQuest} from './dungeon-world.mjs';

const quest=dungeonQuest(100,{gate:['百の帰路を映す門',12,9],archive:['帰還記録の映写台',13,9],table:['公開図の照合卓',14,9],desk:['次の当番への引継所',14,10]},
  {keepers:['desk','帰還者の当番たち','地図、補給、救助の手順を引き受ける'],reader:['table','公開図の照合係','家へ入る枝道を公の図に載せない']},
  {dungeon:'region_10',floor:2,prefix:'hundred'});
export const hundredCharacters=quest.characters;
const outcome=(q,key)=>eq(ref('quests.'+q+'.outcome'),key);
const full=outcome('q098','contract'),approved=outcome('q098','informed');
const first=when(outcome('q001','informed'),'最初の灯には、老人と新人が生きて詰所へ戻った道が映る。一行の経路図を受け取った修繕班が、消えた壁灯に印を付けている。',
  '最初の灯には、老人と新人が生きて帰った詰所が映る。修繕の申し送りをリネに託し、一行は二人のそばに残った。机の端に空の油瓶が二つ並んでいる。');
const room=when(approved,'最後の一室の図には、住民が承認した避難路だけが映る。家へ曲がる細道は白い。',
  when(full,'最後の一室を踏破した図が大きく映る。避難路を外れた先にある住民の戸口まで見えてしまう。','最後の一室のあるところは、理由を書き添えた白い余白として残っている。'));
const contact=when(outcome('q099','informed'),'リネが決めた地下への連絡日を、当番が油の受渡し帳に続けて記した。','地下へ残る人との連絡には未完の欄がある。当番は埋まったふりをせず、次に確かめる仕事として書き写した。');

export function hundredSource(){
  const {s,scene,implies,finish}=quest.create(),is=s.is;
  s.entity('key','gate').entity('copy','table');
  s.enum('scope','unchecked',['unchecked','redacted','respected'],'公開用の写しで守った住民の範囲');
  s.enum('access','undecided',['undecided','limited','shared','exclusive'],'門を誰がどう使えるか');
  s.bool('signed').bool('guardDown');s.fact('routes','門は願いを叶える装置でなく、具体的な帰還方法を次の隊へ渡す。');
  scene('entry','gate','門の向こうに金銀は見えない。灯の分け方、担架を上げた便、帰還者の名を写す壁が、ひとつずつ水面に浮かぶ。門を封じる相談に来た人が、映っているのは自分の帰り道だと気づいた。',[
    O('records','記録を映す','projection'),O('key','守護者戦','defeated',[set('guardDown')],{combat:'boss_10',combatRequirement:'要勝利'}),
    O('limited','通路を制限','restrict')]);
  scene('projection','archive',[first,room,'帰れた人の足跡には、次に同じ場所を通る人のための手順が挟まっている。願いを代わりに叶えるものは一つもない。'],[O('read','帰路を読む','archive',[see('routes','archive')])]);
  scene('archive','archive','百の記録をこのまま保管し、研究と救助の便だけに使うこともできる。次の隊へ渡すなら、原本を開く前に公開する範囲を照合係と決めておく必要がある。',[
    O('privacy','範囲を確かめる','privacy'),O('close','利用を絞る','returnGate')]);
  scene('privacy','table',when(full,'照合係が全室図を机に広げた。避難路の先まで線が入り、家の位置が特定できる。原本を保管したまま、配布用の写しから住宅への枝道を消せる。','照合係が原本の線と余白を指でたどった。承認された範囲と、踏み込まなかった場所を、そのまま次の写しに残せる。'),[
    O('redact','枝道を消す','copy',[set('scope','redacted'),give('copy','table','party')],{when:full,visibleWhen:full}),
    O('respect','範囲を守る','copy',[set('scope','respected'),give('copy','table','party')],{when:not(full),visibleWhen:not(full)}),
    O('limit','公開を見送る','returnGate')]);
  scene('copy','table',when(is('scope','redacted'),'公開用の写しには非常口までの線だけが残った。住居を含む原本は綴じたまま、当番には渡さない。','原本の余白を埋めずに写し取った。承認を得た範囲だけを手渡せるよう、原本と配布用の紙を分ける。'),[O('bring','引継所へ','handoff')]);
  scene('handoff','desk',[contact,'三冊の台帳が開いている。地図を直す人、補給を数える人、救助を指揮する人が、それぞれ自分の欄に署名する場所を空けた。'],[O('sign','当番が署名','signed',[set('signed')])]);
  scene('signed','desk','三つの署名がそろった。公開範囲を確かめた写しを当番に渡すか、署名も記録として保管し、門を救助と研究の便だけに限るかを選ぶ。',[
    O('share','写しを渡す','shared',[give('copy','party','keepers')]),O('seal','署名を保管','filed',[give('copy','party','keepers')])]);
  scene('shared','desk','当番が三冊に同じ受領日を入れた。公開図を握るのは一人の持主ではなく、次の帰還方法を書き足す人たちだ。門には元の鍵が残る。',[O('entrust','共同管理に託す','@informed',[set('access','shared')])]);
  scene('filed','desk','署名と写しを当番の引出しへ入れた。公に配る札は刷らず、門の通用口だけを救助と研究に使うと伝えに行く。',[O('back','門へ戻る','restrict')]);
  scene('returnGate','gate','記録は閉じて保管し、出動を待つ救助便と研究者の名を通用口に残す。まだ最奥の閂には手を掛けていない。',[O('prepare','通用口を確保','restrict')]);
  scene('restrict','gate','救助用の担架が通用口を通れる幅を確かめる。研究者の出入りを記す帳面を掛けた後、最奥だけに閂を下ろす。',[O('bar','最奥を封じる','@compromise',[set('access','limited')])]);
  scene('defeated','gate','深淵の守護者が退いた。鍵はまだ門柱の鉤に掛かっている。誰が手に取るかで、次の帰還を許す人が決まる。',[O('take','門の鍵を取る','held',[give('key','gate','party')])]);
  scene('held','gate','掌に門の鍵がある。帰還者たちの受領欄は空いたまま、一行の名だけを管理者として登録できる。',[O('claim','管理者を登録','@contract',[set('access','exclusive')])]);
  implies('privacy',is('scope','redacted'),and(full,s.known('routes')),'全室図の写しからだけ住宅の枝道を除く');
  implies('respect',is('scope','respected'),and(not(full),s.known('routes')),'承認範囲や余白を維持する');
  implies('signatures',is('signed'),or(is('scope','redacted'),is('scope','respected')),'範囲を確定した写しへの署名を保持する');
  implies('key',is('keyAt','party'),is('guardDown'),'門の守護者に勝ってから鍵を取得する');
  return finish([['entry_records','archive'],['archive_privacy','table'],['archive_close','gate'],['privacy_limit','gate'],['copy_bring','desk'],['filed_back','gate']],
    {informed:and(is('access','shared'),is('signed'),is('copyAt','keepers'),is('keyAt','gate')),compromise:and(is('access','limited'),is('keyAt','gate')),contract:and(is('access','exclusive'),is('keyAt','party'))});
}
