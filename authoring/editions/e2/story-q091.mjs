import {story,O,set,give,see,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

const places={trail:'深淵の帰り道',bend:'曲がり角の泥床',desk:'案内人の貸出机',rest:'荷を下ろせる岩棚'};
const coordinates={trail:[9,12],bend:[9,13],desk:[9,11],rest:[11,13]};
const noa='e2_abyss_noa';
export const guideNoa={id:noa,name:'案内人のノア',goal:'帰還者の記録を次に同じ装備を借りる隊に役立てる',detail:'帰還者の深淵で貸靴の番号と、前の隊が残した帰還記録を管理している。',quests:['q091']};

export function returningFootprintsSource(){
  const s=story(91,places,[]),is=s.is;
  s.entity('noa','desk',noa).entity('boots','party').entity('journal','noa');
  s.enum('oldTrail','intact',['intact','erased'],'前の隊の足跡が残っているか');
  s.bool('comparisonLine').bool('ownMark').bool('restChecked');
  s.fact('stride','同じ靴底印でも歩幅が異なり、古い列では片足を引きずっている。');
  s.fact('loans','返却済みの前の隊と現在の隊が、同じ貸靴を順に借りた。');
  const desk=[{entity:'noa',when:is('noaAt','desk'),display:{x:50,y:10,scale:1,cardScale:1,layer:0}}];
  s.node('entry','trail',[],'誰もまだ踏み込んでいない曲がり角から、こちらへ向かって靴跡が続く。踵に三つの鋲。借りてきた靴を持ち上げると、欠けた真ん中の鋲まで同じだ。古い列の脇には、まだ誰も踏んでいない泥がある。',[
    O('step','隣に一列歩く','fresh'),O('mark','自分の跡に印','mark'),O('erase','古い跡を消す','erase')
  ]);
  s.node('fresh','bend',[],'古い列の隣を数歩進み、振り返った。自分たちの踵は等間隔に沈んでいる。古い方は二歩ごとに間が詰まり、片方のつま先が次の窪みまで泥を引いていた。',[
    O('compare','歩幅を比べる','stride',[see('stride','bend')])
  ]);
  s.node('stride','bend',[],'引きずった筋の横に、荷を置いたらしい四角い跡もある。自分たちが今つけた列にはどちらもない。靴の貸出番号なら、案内人の机で前に履いた人までたどれる。',[
    O('equipment','貸出机へ','loans'),O('different','自分の列に印','mark')
  ]);
  s.node('loans','desk',desk,'ノアは一行の踵を見て、番号の同じ二行を指した。上の行には前の隊の返却印、下の行には今朝の一行の受領印。靴は台帳どおり、順に二つの隊の足に渡っている。',[
    O('read','帰還記録を読む','previous',[see('loans','noa')])
  ]);
  s.node('previous','desk',desk,'「片足を傷めた一人を支え、肘の高さの岩棚に背負い籠を預けた」。ノアが前の隊の記録をひらいた。棚の端には白い石英の筋が二本あるという。記録はまだノアの手にある。',[
    O('inherit','岩棚を確かめる','shelf'),O('own','自分の列に印','mark')
  ]);
  s.node('shelf','rest',[],'並んだ白い筋に指を置くと、棚の縁に籠の底と同じ幅の擦れがあった。足元では引きずった筋がいったん切れ、その先で二人ぶんの踵が近づいている。負傷者を支え直す場所として、ここなら使える。',[
    O('check','休憩点を照合','checked',[set('restChecked')])
  ]);
  s.node('checked','rest',[],'棚の高さと白い筋を控えた。足跡はそのままにして、記録を持っているノアの机へ戻る。',[O('return','貸出机に戻る','borrow')]);
  s.node('borrow','desk',desk,'白い筋を二本描いて渡すと、ノアは記録の余白にその絵を写した。「次の休み場を探す時は、この頁を開いてください」。今履いている貸靴と同じ番号の帰還記録を差し出した。',[
    O('borrow','記録を借りる','@informed',[give('journal','noa','party')])
  ]);
  s.node('mark','trail',[],when(is('comparisonLine'),
    '一行が曲がり角まで歩いた列の手前に戻った。自分たちの踵の脇だけに短い横線を引けば、引きずった古い筋を次の隊も調べられる。',
    '自分たちがここまで歩いてきた跡の脇に、小石で短い横線を引く。曲がり角から戻ってくる古い列には、小石を触れさせずにおく。'),[
    O('score','横線をつける','@compromise',[set('ownMark')])
  ]);
  s.node('erase','trail',[],'曲がり角から戻る列の前にしゃがんだ。泥をならせば、この帰路を先に通った人の歩き方も、次に来る隊には読み取れなくなる。',[
    O('smooth','古い列をならす','@contract',[set('oldTrail','erased')])
  ]);
  const world=Object.fromEntries(Object.entries(coordinates).map(([key,[x,y]])=>[key,{kind:'dungeon',dungeon:'region_10',map:'region_10_f1',event:'q091_footprints_'+key,x,y}]));
  const journey=connectWorld(s,world,1);
  journey('entry_step','bend',{arrive:[set('comparisonLine')]});journey('stride_equipment','desk');journey('stride_different','trail');
  journey('previous_inherit','rest');journey('previous_own','trail');journey('checked_return','desk');
  s.story.endings={contract:and(is('oldTrail','erased'),not(is('ownMark'))),compromise:and(is('ownMark'),is('oldTrail','intact'),is('journalAt','noa')),
    informed:and(is('restChecked'),is('journalAt','party'),is('bootsAt','party'),is('oldTrail','intact'))};
  s.invariant('loan_order',or(not(s.known('loans')),and(is('comparisonLine'),s.known('stride'))),'歩幅を比べてから貸出履歴を確かめる');
  s.invariant('shelf',or(not(is('restChecked')),s.known('loans')),'記録を読んでから実物の岩棚と照合する');
  s.invariant('journal',or(not(is('journalAt','party')),and(is('restChecked'),s.known('loans'))),'休憩点を確認して机で記録を借りる');
  return s.done();
}
