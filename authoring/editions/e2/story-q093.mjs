import {story,O,set,give,see,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

const sites={desk:['鈴の下の帳場',10,11],first:['一番の客の部屋',11,11],second:['二番の客の部屋',13,11],door:['宿の裏木戸',15,11]};
const people={
  keeper:['宿守のネム','宿帳を管理し、番号で泊まる客を守る。'],
  guestOne:['一番の客','家族の前でもう一度、自分の名前を名乗りたい。'],
  guestTwo:['二番の客','追跡者から身を隠すため、宿の番号を使い続けたい。']
};
const person=id=>'e2_q093_'+id;
export const innCharacters=Object.fromEntries(Object.entries(people).map(([id,[name,goal]])=>[
  person(id),{id:person(id),name,goal,detail:goal,quests:['q093']}
]));

export function innNamesSource(){
  const places=Object.fromEntries(Object.entries(sites).map(([id,[name]])=>[id,name]));
  const s=story(93,places,[]),is=s.is;
  s.entity('keeper','desk',person('keeper')).entity('guestOne','first',person('guestOne')).entity('guestTwo','second',person('guestTwo'));
  s.entity('passOne','keeper').entity('passTwo','keeper');
  s.enum('oneName','sealed',['sealed','returned'],'一番の名の封印');
  s.enum('twoName','sealed',['sealed','returned'],'二番の名の封印');
  s.bool('dated',false,'二番本人が匿名契約の継続に同意し日付を書いた');
  s.enum('ledger','numbered',['numbered','separate','released'],'宿帳の契約の扱い');
  s.bool('issued',false,'番号を記した帰還証二通に宿印を押した');
  s.bool('checked',false,'裏木戸で二人の帰還証を確認した');
  s.fact('terms','宿が名を預かる間は番号で暮らせる。宿帳に追跡者が来ても実名は残らない。');
  s.fact('one','一番の客が希望した返名を済ませた。');
  s.fact('two','二番の客が匿名の継続に自分の意思で同意した。');
  const both=and(s.known('one'),s.known('two'));
  function scene(id,place,cast,text,options,requires=true){
    s.node(id,place,cast.map((entity,i)=>({entity,when:is(entity+'At',place),
      display:{x:cast.length===1?50:[28,72][i],y:10,layer:i,scale:1,cardScale:1}})),text,options,requires);
  }
  scene('entry','desk',['keeper'],'ネムが宿帳を開く。並んでいるのは番号ばかりだ。廊下から、昔の家の間取りを笑って話す声がした。相手が名前を尋ねたとたん、帳場の鈴がひとつ鳴った。話し声が途切れた。',[
    O('contract','契約を聞く','guests',[see('terms','keeper')]),O('release','一律解除','release'),O('certificate','帰還証を作る','passes')
  ]);
  scene('guests','desk',['keeper'],when(both,'一番には名を返し、二番の同意票には日付が入った。ネムは二人の番号の間に定規を置いた。「別々に綴じますか。それとも今日は帰還証を先に？」',
    when(s.known('one'),'一番の名札にはもう封がない。二番の契約票はそのまま残っている。ネムは帰還証も用意できると言う。',
    when(s.known('two'),'二番の継続票に本人の書いた日付がある。一番の名札はまだ封じてある。帳場には帰還証の用紙もある。',
    '「泊まり賃に名前を預かります。追手が来ても宿帳には番号しか残りません」。ネムが追跡者を帰した日の欄を見せる。どうしたいかは、別々の部屋で本人に聞ける。'))),[
    O('one','一番を訪ねる','one',[],{when:not(s.known('one'))}),O('two','二番を訪ねる','two',[],{when:not(s.known('two'))}),
    O('renew','個別に綴じる','file',[],{when:both}),O('paper','帰還証を作る','passes')
  ],s.known('terms'));
  scene('one','first',['guestOne'],'「娘に宛てた手紙です。お父さんより、の一言じゃ、あの子は信じてくれない」。一番の客は空いた署名欄を指す。自分の名で書きたいと、本人が名札の封に手を添えた。',[
    O('restore','名を返す','restored',[set('oneName','returned'),see('one','guestOne')])
  ]);
  scene('restored','first',['guestOne'],'封がほどけた。一番の客は名前を小さく口にし、鈴が鳴らないのを確かめてから手紙に署名した。「これで返事がもらえる」。自分の名を書いた行を、指で何度もたどっている。',[
    O('back','帳場へ戻る','guests')
  ],s.known('one'));
  scene('two','second',['guestTwo'],'戸を細く開けた二番の客は、追手が尋ね歩いている名を口にしなかった。「私は今の番号で泊まります。そう決めたのが私だと分かるようにしてください」。鉛筆と契約票を本人に差し出す。',[
    O('date','継続日を記す','dated',[set('dated'),see('two','guestTwo')])
  ]);
  scene('dated','second',['guestTwo'],'二番の客が自分で日付を入れた。票にあるのは日付と二番の印だけだ。本人は控えを襟元にしまった。扉の外に本名が出ることはない。',[
    O('back','帳場へ戻る','guests')
  ],s.known('two'));
  scene('file','desk',['keeper'],'ネムは一番の欄に返名の受取印を置き、二番の欄には本人の継続日を写した。二枚の契約票を、それぞれの番号の綴じ紐に差し込む。',[
    O('file','二件を登録','@informed',[set('ledger','separate')])
  ],both);
  scene('release','desk',['keeper'],'「この紐を抜けば、みんなの名がいっぺんに戻ります」。ネムの手元から一本の紐が、宿帳のすべての封を通っている。廊下で二番の部屋の掛け金が動いた。',[
    O('undo','全員の封を解く','released',[set('ledger','released'),set('oneName','returned'),set('twoName','returned')])
  ]);
  scene('released','desk',['keeper'],'鈴が続けて鳴り、卓上の札に名前が浮いた。廊下では荷紐を引く音がする。ネムが二番の部屋を指した。',[
    O('visit','二番の部屋へ','pack')
  ],is('ledger','released'));
  scene('pack','second',['guestTwo'],'二番の客は、名の戻った札を裏返し、まとめてあった荷を背負った。「この名で宿を聞かれたら、もう隠れられない」。表の帳場を避けて出たいと言う。',[
    O('leave','裏木戸へ','leaving')
  ]);
  scene('leaving','door',['guestTwo'],'二番の客は木戸の外から表通りをうかがい、別の避難先へ向かう小道を選んだ。ネムに渡す部屋札が、木戸の内側に伏せてある。',[
    O('farewell','出立を見送る','@contract')
  ]);
  scene('passes','desk',['keeper'],when(s.known('one'),'一番には名を返してある。ネムはその名を改めて預かることなく、一番と二番の番号を帰還証に記した。控えと割印を合わせれば裏木戸を通れる。','ネムが帰還証を二枚並べた。宿帳の番号と割印だけで裏木戸を通れる。預けた本名を書く欄はない。どちらの名札にも触れず、本人に一枚ずつ届ける。'),[
    O('stamp','二通を受け取る','stamped',[set('issued'),give('passOne','keeper','party'),give('passTwo','keeper','party')])
  ]);
  scene('stamped','desk',['keeper'],'ネムは割印の片割れを宿帳に残した。一番と二番の証は、まだどちらも一行の手にある。',[
    O('deliver','一番の部屋へ','giveOne')
  ],is('issued'));
  scene('giveOne','first',['guestOne'],when(s.known('one'),'署名を終えた一番の客が手紙を折る。帰還証の宛先は本名を返す前と同じ、一番の番号だ。','一番の客は手紙を懐にしまい、部屋札と帰還証の番号を並べた。名札の封はそのままでも、この証で町へ戻れる。'),[
    O('hand','一番に渡す','firstReady',[give('passOne','party','guestOne')])
  ]);
  scene('firstReady','first',['guestOne'],'一番の客は帰還証を自分の鞄に入れた。二番の分は一行が持ったまま、一緒に隣の部屋へ向かう。',[O('next','二番の部屋へ','giveTwo')]);
  scene('giveTwo','second',['guestOne','guestTwo'],when(s.known('two'),'二番の客は継続票の控えを襟元から出した。帰還証にも同じ番号がある。今日決めた継続の意思は、旅支度をしても記録に残る。','二番の客は番号だけが記された証を裏返した。裏にも本名はない。「これなら通ります」。'),[
    O('hand','二番に渡す','bothReady',[give('passTwo','party','guestTwo')])
  ]);
  scene('bothReady','second',['guestOne','guestTwo'],'二人がそれぞれ自分の証を持った。一番の客が木戸までの道順を確かめ、二番の客が部屋の灯を消した。',[O('gate','裏木戸へ','gate')]);
  scene('gate','door',['guestOne','guestTwo'],'二人は木戸の読み取り板へ順に証を当てた。番号と割印を合わせれば、預けた名を口にせず町へ出られる。木戸の向こうに帰り道が見える。',[
    O('check','通行を確認','@compromise',[set('checked')])
  ]);
  const world=Object.fromEntries(Object.entries(sites).map(([id,[,x,y]])=>[id,{kind:'dungeon',dungeon:'region_10',map:'region_10_f1',event:'q093_inn_'+id,x,y}]));
  const journey=connectWorld(s,world,1);
  journey('guests_one','first');journey('restored_back','desk');
  journey('guests_two','second');journey('dated_back','desk');
  journey('released_visit','second');journey('pack_leave','door',{companions:['guestTwo']});
  journey('stamped_deliver','first');journey('firstReady_next','second',{companions:['guestOne']});
  journey('bothReady_gate','door',{companions:['guestOne','guestTwo']});
  const passesHeld=and(is('passOneAt','guestOne'),is('passTwoAt','guestTwo'));
  s.story.endings={informed:and(both,is('ledger','separate')),contract:and(is('ledger','released'),is('guestTwoAt','door')),
    compromise:and(is('ledger','numbered'),is('checked'),passesHeld,is('guestOneAt','door'),is('guestTwoAt','door'))};
  s.invariant('first_name',or(is('ledger','released'),and(is('oneName','returned'),s.known('one')),and(is('oneName','sealed'),not(s.known('one')))),'本人の返名または全員の解除で一番の名を返す');
  s.invariant('second_name',or(and(is('ledger','released'),is('twoName','returned')),and(not(is('ledger','released')),is('twoName','sealed'))),'二番の名を返すのは一律解除だけ');
  s.invariant('dated',or(and(is('dated'),s.known('two')),and(not(is('dated')),not(s.known('two')))),'二番の同意日は本人への確認と一緒に保存する');
  s.invariant('separate',or(not(is('ledger','separate')),both),'個別登録には両方の意思確認が必要');
  s.invariant('release',or(not(is('ledger','released')),and(is('oneName','returned'),not(is('issued')))),'一律解除では二人とも名を取り戻す');
  const unused=and(not(is('issued')),is('passOneAt','keeper'),is('passTwoAt','keeper'));
  const issued=and(is('issued'),is('ledger','numbered'),or(is('passOneAt','party'),is('passOneAt','guestOne')),
    or(is('passTwoAt','party'),and(is('passTwoAt','guestTwo'),is('passOneAt','guestOne'))));
  s.invariant('passes',or(unused,issued),'発行時に二通を預かり、一番・二番の本人へ順に渡す');
  s.invariant('verified',or(not(is('checked')),and(is('issued'),passesHeld)),'通行確認には本人二人の帰還証が必要');
  return s.done();
}
