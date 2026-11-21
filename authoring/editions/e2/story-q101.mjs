import {O,set,give,see,and,when} from '../../story-kit.mjs';
import {canalQuest} from './canal-quarter.mjs';

export default canalQuest(101,{
  counter:['鍵屋の帳場','戸に下げた鈴と、夜番のための腰掛けがある。','location_shop'],
  door:['鍵屋の裏口','通りから、閉店後の掛け金を見張れる。'],
  bench:['鍵屋の作業台','引き出しの上に鍵やすりが並ぶ。','location_shop']
},{
  mina:['鍵屋の娘ミナ','counter','自分の店を持ち、父が一人になることも気にかける'],
  garo:['鍵屋の父ガロ','door','娘を送り出す鍵を作りながら、店にいてほしいと願う']
},(s,scene)=>{
  const again={once:false};s.entity('key','garo');s.bool('wish').bool('unlocked').bool('keySeen').bool('promise').bool('reported').bool('silent');
  s.fact('newShop','ミナは店を継ぐより、自分の店を出したい。');
  scene('entry','counter',['mina'],'ミナは裏口の鍵を差し出した。「何も盗られていないんです。でも朝になると、また開いていて」。',[O('wish','店の話を聞く','wish'),O('watch','裏口を見張る','watch')]);
  scene('wish','counter',['mina'],'「自分の看板を掛けたいんです。でも、閉店後に父だけが残るでしょう」。ミナは言い終えてから裏口の方を見た。',[O('listen','希望を聞いて夜番へ','watch',[set('wish'),see('newShop','mina')],again)]);
  scene('watch','door',['garo'],when(s.is('unlocked'),'裏口の掛け金がまた鳴った。ガロが作業台へ戻る足音だ。','夜の通りには誰もいない。鍵が内側から回り、ガロの指が扉を押した。店に入ってきた者はいなかった。'),[
    O('talk','作業台で理由を聞く','father',[set('unlocked')],{companions:['garo']}),O('report','ミナに知らせる','report',[set('unlocked')]),O('quiet','秘密を守る','quiet',[set('unlocked')])]);
  scene('father','bench',['garo'],'ガロは鍵を一本、引き出しから出した。娘の新店の名が彫ってある。「夜番でも口実にしなけりゃ、あの子と飯を食う日までなくなる気がしてな」。',[
    O('wish','ミナに希望を聞く','lateWish',[set('keySeen')],again),O('visit','二人に食事を提案','agreement',[set('keySeen')],{when:s.is('wish'),companions:['garo']}),
    O('report','開錠だけ伝える','report',[set('keySeen')]),O('quiet','事情を伏せる','quiet',[set('keySeen')])]);
  scene('lateWish','counter',['mina'],'ミナは新しい店を借りたいと言った。「水曜なら早く閉められます。でも、継ぐ約束にはしたくないんです」。',[O('listen','希望を聞いて裏口へ','rewatch',[set('wish'),see('newShop','mina')],again)]);
  scene('rewatch','door',[],'掛け金には見覚えのある擦り跡が残る。ガロは作業台で待っている。父の話に戻るか、夜番を終えるかを選べる。',[
    O('talk','作業台へ戻る','father',[],again),O('report','ミナに知らせる','report'),O('quiet','秘密を守る','quiet')]);
  scene('agreement','counter',['mina','garo'],'「店は別々にしたいです」とミナ。ガロは勘定帳の水曜を指した。「じゃ、その晩だけはそっちで飯にしよう」。合意を取り持つか、目撃だけ伝えるかを選べる。',[
    O('agree','水曜の約束を結ぶ','key',[set('promise')]),O('decline','目撃だけを伝える','report')]);
  scene('key','counter',['mina','garo'],'ガロが新店の鍵を帳場に置いた。ミナは自分の手で受け取ると、水曜の仕舞い時を父の帳面に書いた。',[O('hand','鍵を娘へ渡す','@visit',[give('key','garo','mina')])]);
  scene('report','counter',['mina','garo'],'裏口を開けたのはガロ自身だった。ミナにその手つきを伝える。食事の日取りを決める欄は空いたままだ。',[O('tell','目撃を報告する','@report',[set('reported')])]);
  scene('quiet','counter',['mina'],'朝、ミナが夜番の代金を数えた。開錠した人の名を伏せたまま鍵を返す。',[O('finish','夜番を終える','@quiet',[set('silent')])]);
  return {visit:and(s.is('promise'),s.is('wish'),s.is('keyAt','mina')),report:and(s.is('unlocked'),s.is('reported')),quiet:and(s.is('unlocked'),s.is('silent'))};
});
