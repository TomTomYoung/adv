import {O, and, move, not, or, ref, set, when} from '../../story-kit.mjs';
import {canalQuest} from './canal-quarter.mjs';

export default canalQuest(110, {
  fitting: ['祭の衣装部屋', '鏡の前に、英雄の肩掛けが一着用意されている。', 'location_tavern'],
  desk: ['祭係の詰所', '演説の下書きと、行列に並ぶ人の名簿がある。', 'location_shop'],
  lane: ['行列の集合路', '往来を空けた運河沿いの道で、帰還した戦友たちが待っている。'],
  square: ['祭の広場', '行列の先に、小さな演壇と子どもたちの遊び場がある。']
}, {
  iro: ['退役兵イーロ', 'fitting', '一日を戦友と歩き、自分が誇る決断を自分の言葉で扱いたい'],
  steward: ['祭係', 'desk', '町の子どもたちに、勇気が伝わる祭を開きたい'],
  friends: ['帰還した戦友たち', 'lane', '歩みの遅い仲間も一緒に祭へ向かう']
}, (s, scene) => {
  s.story.connections.push(['desk','square']);
  s.bool('retreatStory').bool('heard').bool('recordShared').bool('partialRecord');
  s.int('sharedEscapes',0,0,1e9,'見せた時点の逃走回数');
  s.enum('speech','unset',['unset','legend','retreat','none'],'本人が選んだ紹介');
  s.bool('approved').bool('invited').bool('walkedTogether');
  s.invariant('speechConsent', or(s.is('speech','unset'),s.is('speech','legend'),s.is('approved')), '紹介を変更するにはイーロの同意がいる。');
  s.invariant('invitation', or(not(s.is('invited')),s.is('speech','none')), '皆を英雄席に招くのは演説を取りやめた場合。');

  const withIro={companions:['iro']}, procession={companions:['iro','friends']};
  const again={once:false}, prepare=()=>move('steward','desk','square');
  const count={count:s.v('sharedEscapes')};
  const recordText=when(s.is('partialRecord'),
    {format:'手帳には「記録開始後の逃走は{count}回」とある。イーロは記録の最初の日付を指で押さえた。',values:count},
    {format:'隊の戦績を本人に開く。これまでの逃走は{count}回と書いてある。イーロは回数の下に並ぶ日付に目を落とした。',values:count});
  scene('entry','fitting',['iro'],
    '退役兵イーロが頼んだのは、祭の行列一日だけの護衛だ。祭係の仕立てた肩掛けには「一度も退かなかった英雄」と縫ってある。',[
      O('fit','肩掛けを合わせる','fitted',[set('retreatStory')])
    ]);
  scene('fitted','fitting',['iro'],
    '「私が誇るのは、退くと決めた夜だよ。あれで皆が帰れた」。鏡の中で字が逆さに映る。イーロは襟元を直して、行列の支度を続けた。',[
      O('hear','あの夜の話を聞く','talk',[set('heard')]),
      O('guard','護衛だけを引き受ける','march',[set('speech','legend'),prepare()],withIro)
    ]);
  scene('talk','fitting',['iro'],
    '「帰って点呼したら、いつも最後に返事をする男の声がした。あんなに嬉しい返事はない」。イーロは肩掛けを畳まず、膝に置いた。隊の戦績を見せるかは、こちらに任せている。',[
      O('consult','祭係と相談する','council',[],withIro),
      O('show','自分たちの戦績を見せる','ledger',[
        set('recordShared'),set('sharedEscapes',{op:'record_count',metric:'escapes'}),set('partialRecord',not(ref('records.historyComplete')))
      ])
    ]);
  scene('ledger','fitting',['iro'],recordText,[
    O('listen','イーロの続きを聞く','memory')
  ]);
  scene('memory','fitting',['iro'],
    when(s.is('sharedEscapes',0),'「君らに同じ経験がなくても、あの声のことは話せる」。イーロは、一番遅く帰った戦友が門の名札を裏返したところまで話した。',
      '「記録には、最後の一人を待っていた時間までは書かれないね」。イーロは、友人が門に着くまで冷たくなった夕飯に誰も手を付けなかった話をした。'),[
      O('consult','祭係と相談する','council',[],withIro)
    ]);
  scene('council','desk',['iro','steward'],
    '「子どもたちに、勇気を持ち帰ってほしいんです」。祭係は下書きを二人の間に置いた。イーロが椅子を寄せる。今の紹介で歩くか、帰還の話にするか、仲間を全員招くか。',[
      O('legend','今の紹介で護衛する','march',[set('speech','legend'),prepare()],withIro),
      O('retreat','撤退を演説の中心に提案','askRetreat',[],again),
      O('all','演説をやめて皆を招く案','askAll',[],again)
    ]);
  scene('askRetreat','desk',['iro','steward'],
    '祭係が「皆を連れて帰ると決めた」と下書きを読み直した。イーロがその一行に指を置く。「ここは、私の口からそう話したい」',[
      O('approve','本人の言葉で紹介を決める','march',[set('approved'),set('speech','retreat'),prepare()],withIro),
      O('back','下書きに戻る','council',[],again)
    ]);
  scene('askAll','desk',['iro','steward'],
    '「私一人の演説をやめて、帰ってきた連中を皆、客として呼んでほしい」。イーロが自分で言い、祭係が招待状を差し出した。',[
      O('approve','本人の希望で招待状を預かる','invite',[set('approved'),set('speech','none'),prepare()],withIro),
      O('back','下書きに戻る','council',[],again)
    ]);
  scene('invite','lane',['iro','friends'],
    '集まった戦友にイーロが一人ずつ招待状を渡した。最後の一人は杖をついて来た。「席が足りなきゃ、俺のを使えよ」とイーロが笑った。',[
      O('invite','全員そろって広場へ','seats',[set('invited')],procession)
    ]);
  scene('march','lane',['iro','friends'],
    '行列の先頭を譲って、イーロは杖をついた戦友を待った。護衛隊が歩幅を合わせると、ほかの仲間もその速さで広場へ向かった。',[
      O('walk','戦友に付き添って広場へ','festival',[],procession)
    ]);
  scene('festival','square',['iro','steward','friends'],
    when(s.is('speech','retreat'),'イーロが帰還の夜を話し終えると、祭係は子どもたちに色紐を渡した。全員が出口に着くまで終わらない、帰還路を作る遊びが始まった。',
      '祭係が肩掛けの文字を読み上げると、大きな拍手が起きた。イーロは短く礼を述べ、歩みの遅い友人の隣へ戻った。'),[
      O('finish','友人の隣で護衛を終える','@legend',[set('walkedTogether')],{when:s.is('speech','legend'),visibleWhen:s.is('speech','legend')}),
      O('watch','二人と帰還路を見届ける','@retreat',[set('walkedTogether')],{when:s.is('speech','retreat'),visibleWhen:s.is('speech','retreat')})
    ]);
  scene('seats','square',['iro','steward','friends'],
    '英雄席に並べた椅子が一つ足りない。イーロは演壇から自分の椅子を運び、杖をついた友人に渡して、その隣に立った。',[
      O('seat','仲間たちの席を見届ける','@all',[set('walkedTogether')])
    ]);
  return {
    legend:and(s.is('speech','legend'),s.is('walkedTogether')),
    retreat:and(s.is('speech','retreat'),s.is('approved'),s.is('walkedTogether')),
    all:and(s.is('speech','none'),s.is('approved'),s.is('invited'),s.is('walkedTogether'))
  };
});
