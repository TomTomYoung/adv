import {story,O,set,give,see,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

const sites={
  desk:['テオの名簿机',13,8],rack:['返却装備の掛場',12,7],
  archive:['帰還日誌の綴じ台',11,7],wall:['記念碑の石壁',10,7]
};
const teo='e2_q095_teo',mason='e2_q095_mason';
export const memorialCharacters={
  [teo]:{id:teo,name:'記録係のテオ',detail:'帰還者の署名と同じ日の引継ぎ札を保管している。',goal:'名簿と帰還時の記録を突き合わせ、記念物に残す内容を決める。',quests:['q095']},
  [mason]:{id:mason,name:'記念碑の石工',detail:'石壁で下書きと帰還者の銘を刻む。',goal:'届けられた原稿を石に写し、帰還者が読める形に仕上げる。',quests:['q095']}
};

export function heroMemorialSource(){
  const places=Object.fromEntries(Object.entries(sites).map(([id,[name]])=>[id,name]));
  const s=story(95,places,[]),is=s.is;
  s.entity('teo','desk',teo).entity('mason','wall',mason).entity('strip','rack').entity('sheet','teo');
  s.enum('form','blank',['blank','wall','actions','statue'],'記念壁・行動記録・一人の像のどの原稿か');
  s.bool('finished',false,'石への刻字または日誌への綴じ込みを終えた');
  s.fact('fittings','同じ肩当てを異なる肩幅に直した跡があり、引継ぎ札に三つの時刻と署名がある。');
  s.fact('relays','三人の署名はそれぞれ名簿の本名に対応し、一人が次の人へ先頭役を渡していた。');
  const draft=form=>[set('form',form),give('sheet','teo','party')];
  const deskCast=[{entity:'teo',when:is('teoAt','desk')}],wallCast=[{entity:'mason',when:is('masonAt','wall')}];
  s.node('entry','desk',deskCast,'「像の顔を決めてほしいんです」。テオが開いた帰還者名簿には三人の名があり、英雄という名はない。脇にある日誌には、道を探した手、けが人の手を縫った手、最後まで灯を掲げた手が、それぞれ描き留めてある。',[
    O('timeline','時刻を調べる','equipment'),O('all','行動を残す','entries'),O('single','一人を選ぶ','model')
  ]);
  s.node('equipment','rack',[],'返却された肩当ての裏をのぞく。同じ革帯に三列の縫い穴があり、留め金を端まで動かすと、汗の跡が三か所に分かれた。吊り紐には、一刻ずつ違う三枚の引継ぎ札が細紐でひと綴りにされている。',[
    O('read','引継ぎ札を読む','tags',[see('fittings','rack')])
  ]);
  s.node('tags','rack',[],'朝の札にイサ、昼にネリ、夕にロク。昼の札の裏には、朝の札と同じ手で「渡した」と書いてある。札をひと綴りのまま外せば、名前の筆跡を机の名簿と見比べられる。',[
    O('take','札を外す','carrying',[give('strip','rack','party')])
  ],s.known('fittings'));
  s.node('carrying','rack',[],'三枚の順に紐を通し直して手に収めた。肩当ては掛け釘に戻した。誰が何を引き受けたのかは、テオの机に残る日誌と名簿を開けば読める。',[
    O('back','名簿机へ','compare')
  ],is('stripAt','party'));
  s.node('compare','desk',deskCast,'テオが札を置く幅だけ名簿を空けた。朝、昼、夕の列へ、一枚ずつ署名を合わせる。イサが見つけた道をネリが引き取り、ネリが縫い終えた手にロクが灯を持たせている。',[
    O('match','署名を照合','names',[give('strip','party','teo'),see('relays','teo')])
  ],is('stripAt','party'));
  s.node('names','desk',deskCast,'三人分の筆跡が合った。「英雄、と一つ書けば、その次の人に替わったところが消えますね」。テオは札を名簿に挟んだ。交代した三人を並べて壁に彫ることも、肩書を付けずに行動だけを日誌へ綴ることもできる。',[
    O('wall','三人の記念壁','wallDraft',draft('wall')),O('actions','行動を残す','entries')
  ],s.known('relays'));
  s.node('wallDraft','desk',deskCast,'紙にはイサ、ネリ、ロクの名が横に並び、その下を朝から夕までの線が貫いている。テオの原稿を受け取った。まだ石壁には、胸像を置くための枠だけが引いてある。',[
    O('deliver','石壁へ','stone')
  ],is('form','wall'));
  s.node('entries','desk',deskCast,when(s.known('relays'),
    'テオは引継ぎ札を挟んだまま、日誌から道探しと手当てと灯の記述を写した。三人の署名を照合した記録は名簿に残し、日誌には各人が実際にしたことを綴る。',
    'テオが日誌の三枚を机に広げた。一枚には水を避ける足場の絵、次には縫い目をつけた手、その次には灯の下で出口をくぐる列。絵の脇にはそれぞれ、イサ、ネリ、ロクと名がある。'),[
    O('copy','三人の行動を写す','pages',draft('actions'))
  ]);
  s.node('pages','desk',deskCast,'テオから三人分の写しを受け取った。上端には帰還日だけを入れ、肩書の欄を空けてある。綴じ台へ運べば、元の日誌と同じ日付のところに差し込める。',[
    O('carry','綴じ台へ','binding')
  ],is('form','actions'));
  s.node('binding','archive',[],'帰還日の糸をゆるめると、ちょうど三枚が収まった。一枚ごとに、イサが足場を見つけたこと、ネリが傷を縫ったこと、ロクが帰り道を照らしたことが読める。',[
    O('bind','日誌に綴じる','@compromise',[give('sheet','party','archive'),set('finished')])
  ],and(is('sheetAt','party'),is('form','actions')));
  s.node('model','desk',deskCast,'最後の頁で灯を高く掲げているのはロクだ。テオがその横顔だけを紙に写した。「この顔で注文すれば、あとの二人は台座に入りません」。机にはまだ下絵がある。',[
    O('select','ロクの像を発注','portrait',draft('statue'))
  ]);
  s.node('portrait','desk',deskCast,'一人分の肖像を受け取った。石工の枠に合う大きさで、銘はロクひとり。もとの日誌には、ほかの二人が帰り道で何をしたかも残っている。',[
    O('deliver','石壁へ','stone')
  ],is('form','statue'));
  s.node('stone','wall',wallCast,when(is('form','wall'),
    '石工が胸像の枠をぬぐい、石壁の端まで水平に糸を張った。「名前の順はこの紙どおりでいいね」。原稿を受け取ろうと、石粉のついた手を拭いている。',
    '石工は灯をかかげる横顔の下絵に、台座と同じ幅の枠を当てた。「この顔に、この人の名だね」。手を差し出した石工の後ろに、空いた台座が一つある。'),[
    O('hand','原稿を渡す','carving',[give('sheet','party','mason')])
  ],and(is('sheetAt','party'),or(is('form','wall'),is('form','statue'))));
  s.node('carving','wall',wallCast,when(is('form','wall'),
    '石工の手元にある下書きどおり、朝のイサ、昼のネリ、夕のロクが一枚の壁に並んだ。名前の下には先頭を引き渡した時刻が二つ刻まれている。石粉を払えば三人分が一緒に読める。',
    '石工は原稿を脇に置いて、灯を持つロクの胸像を台座に据えた。正面には一人分の銘がある。芯まで貫いたノミの跡に、もう二人分の銘を差し込む余白はない。'),[
    O('unveil','壁の名を公開','@informed',[set('finished')],{when:is('form','wall'),visibleWhen:is('form','wall')}),
    O('dedicate','像の銘を公開','@contract',[set('finished')],{when:is('form','statue'),visibleWhen:is('form','statue')})
  ],is('sheetAt','mason'));
  const world=Object.fromEntries(Object.entries(sites).map(([id,[,x,y]])=>[id,{kind:'dungeon',dungeon:'region_10',map:'region_10_f1',event:'q095_memorial_'+id,x,y}]));
  const journey=connectWorld(s,world,1);
  journey('entry_timeline','rack');journey('carrying_back','desk');journey('pages_carry','archive');
  journey('wallDraft_deliver','wall');journey('portrait_deliver','wall');
  s.story.endings={
    informed:and(is('finished'),is('form','wall'),s.known('relays'),is('sheetAt','mason')),
    compromise:and(is('finished'),is('form','actions'),is('sheetAt','archive')),
    contract:and(is('finished'),is('form','statue'),is('sheetAt','mason'))
  };
  s.invariant('custody',and(is('teoAt','desk'),is('masonAt','wall'),or(is('stripAt','rack'),is('stripAt','party'),is('stripAt','teo'))),'テオは名簿机、石工は石壁に残り、引継ぎ札は掛場から一行を経てテオへ渡る');
  s.invariant('strip',and(or(is('stripAt','rack'),s.known('fittings')),or(not(s.known('relays')),is('stripAt','teo')),or(not(is('stripAt','teo')),s.known('relays'))),'署名を照合した札はテオの名簿に残る');
  s.invariant('sheet',or(and(is('form','blank'),is('sheetAt','teo')),and(is('form','actions'),or(is('sheetAt','party'),is('sheetAt','archive'))),and(or(is('form','wall'),is('form','statue')),or(is('sheetAt','party'),is('sheetAt','mason')))),'原稿と受け渡し先を保持する');
  s.invariant('wall',or(not(is('form','wall')),s.known('relays')),'全員の記念壁には署名の照合が必要');
  s.invariant('completion',or(not(is('finished')),is('sheetAt','archive'),is('sheetAt','mason')),'綴じ込みか石工への引き渡しを済ませて公開する');
  return s.done();
}
