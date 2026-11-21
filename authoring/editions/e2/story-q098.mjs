import {O,set,give,see,and,or,when} from '../../story-kit.mjs';
import {dungeonQuest} from './dungeon-world.mjs';

const quest=dungeonQuest(98,{door:['照会札の扉',9,12],window:['住民の受け渡し窓',9,11],desk:['組合の地図台',9,13],inside:['居住区の内廊下',9,10]},
  {mori:['desk','深層組合のモリ','公開図に記す線と余白の理由を保管する'],resident:['window','避難区の住民','避難路を共有し、家への枝道を伏せる']},
  {dungeon:'region_10',floor:2,prefix:'room',characterIds:{mori:'e2_q094_mori'}});
export const roomCharacters=quest.characters;
export function roomSource(){
  const {s,scene,implies,finish}=quest.create(),is=s.is;
  s.entity('copy','desk');s.enum('drawing','blank',['blank','draft','redacted','full'],'公開候補の地図に載せた範囲');
  s.bool('approved').bool('guardDown').bool('cancelled');
  s.fact('scope','住民は避難路の共有に同意し、自宅の位置を伏せるよう求めた。');
  s.fact('branch','避難路の曲がり角から家へ入る一本が写しに残った。');
  scene('entry','door','扉の下から煮物の匂いがする。封鎖札を返すと「危険」ではなく「照会」とあった。脇に小さな受け渡し窓がある。地図を完成させるなら、まずここで扱いを決める必要がある。',[
    O('ask','窓で尋ねる','scope'),O('blank','余白を残す','declined',[set('cancelled')]),
    O('open','守護者戦','unlocked',[set('guardDown')],{combat:'guard_10',combatRequirement:'要勝利'})]);
  scene('scope','window','窓の内側の人が細い板を出した。避難のときに使う大通りだけが引かれている。「ここなら次に来た人にも知らせて。うちの戸口は載せないでください」。',[O('listen','範囲を聞く','terms',[see('scope','resident')])]);
  scene('terms','window','板の線は非常口で終わる。自宅へ戻る人の線を残すことまでは許されていない。組合の地図台で写しを作り、見せに戻るか、今ここで照会を終えられる。',[
    O('route','写しを作りに行く','draft'),O('withdraw','公開を見送る','withdrawn',[set('cancelled')])]);
  scene('draft','desk','モリが下図を押さえる。非常口へ向かう道を写すと、曲がり角に短い鉛筆の線が一本残った。どこまで出してよいかは、原稿を窓へ持ち帰って確かめる。',[O('trace','下図を写す','proof',[set('drawing','draft'),give('copy','desk','party')])]);
  scene('proof','desk','写しは一行の手にある。モリは掲示枠を空けたまま、住民の返事を待つ。',[O('return','窓へ戻る','review')]);
  scene('review','window','窓に紙を置くと、住民が小指で一本だけたどった。「ここから先はうちの戸です。非常口へ行く人は曲がりません」。折り目の手前に消す箇所が示された。',[O('show','枝道を確かめる','revision',[give('copy','party','resident'),see('branch','resident')])]);
  scene('revision','window','写しは窓の内側にある。枝道を消してから住民に読み返してもらうか、掲示を取り下げて下図を返すことができる。',[
    O('redact','枝道を消す','erased',[set('drawing','redacted')]),O('reject','掲示を取り下げる','withdrawn',[set('cancelled'),give('copy','resident','party')])]);
  scene('erased','window','窓際の消し屑を払う。住民は非常口までの線をなぞり返し、家へ入る枝が消えたところでうなずいた。承認印を押した紙を窓から差し出す。',[O('accept','承認図を受け取る','signed',[set('approved'),give('copy','resident','party')])]);
  scene('signed','window','家の戸口を伏せた一枚が戻った。押された印は、この一枚を掲示するためのものだ。',[O('post','地図台へ','publish')]);
  scene('publish','desk','モリは承認印と余白を見て、写しを掲示枠に合わせた。非常口までの道は、次に来る隊もたどれる。',[O('file','承認図を掲示','@informed',[give('copy','party','desk')])]);
  scene('declined','door','扉を開かず、照会札を元に戻した。空欄を見落としと扱われないよう、モリに理由を伝えに行く。',[O('report','地図台へ','blank')]);
  scene('withdrawn','window',when(s.known('branch'),'掲示を取り下げた写しを、文字が内側に来るよう畳む。窓は閉まり、公開の承認印は空欄のままだ。','住民が板を引き戻した。避難路も家の配置も公示しない。照会を終えたことだけを地図台へ届ける。'),[O('report','地図台へ','blank')]);
  scene('blank','desk',when(is('copyAt','party'),'モリが折った写しを非公開の引出しへ受け取る。掲示図には白い余白と、その場所を公開しなかった理由だけが残る。','モリが地図の余白に照会を終えた日付を記す。踏み込まなかった場所を、見落とした区画として塗りつぶすことはしなかった。'),[
    O('store','写しを保管','@compromise',[give('copy','party','desk')],{when:is('copyAt','party'),visibleWhen:is('copyAt','party')}),
    O('file','余白を記す','@compromise',[],{when:is('copyAt','desk'),visibleWhen:is('copyAt','desk')})]);
  scene('unlocked','door','守護者が退いた。錠に掛かっていた重みが消えたが、地図はまだ空白だ。扉を押し開けて初めて内廊下へ入れる。',[O('enter','内廊下へ','interior')]);
  scene('interior','inside','食器の棚と寝台の間を通る。非常口から外れた細道の突き当たりにも家の戸があった。扉の番号まで野帳に写す間に、奥で荷をくくる音がした。',[O('survey','各戸を写す','surveyed',[set('drawing','full')])]);
  scene('surveyed','inside','野帳に最後の戸口が入った。住民の承認印を得る欄は空いている。地図台に戻れば、全室を踏破した図を登録できる。',[O('report','地図台へ','complete')]);
  scene('complete','desk','モリが野帳から全室の線を地図に写した。避難路だけでなく、家へ通じる枝道も公の図に残る。',[O('file','全室図を登録','@contract')]);
  implies('consent',is('approved'),and(is('drawing','redacted'),s.known('branch'),s.known('scope')),'枝道を除いた図だけに住民の承認がある');
  implies('survey',is('drawing','full'),is('guardDown'),'全室踏破には守護者戦の勝利が必要');
  return finish([['entry_ask','window'],['terms_route','desk'],['proof_return','window'],['signed_post','desk'],['declined_report','desk'],['withdrawn_report','desk'],['unlocked_enter','inside'],['surveyed_report','desk']],
    {informed:and(is('approved'),is('copyAt','desk')),compromise:and(is('cancelled'),is('copyAt','desk'),is('approved',false)),contract:and(is('guardDown'),is('drawing','full'))});
}
