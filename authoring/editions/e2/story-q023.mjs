import {story,O,set,give,see,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

const places={root:'母樹の根元',shelter:'アセの待つ休み場',board:'住民の通路口'};
const point=(key,x,y)=>({kind:'dungeon',dungeon:'region_3',map:'region_3_f1',x,y,event:'q023_mother_ring_'+key});
const world={root:point('root',13,7),shelter:point('shelter',13,2),board:point('board',5,3)};
export const motherRingCharacters={
  e2_mother_ring_ase:{id:'e2_mother_ring_ase',name:'旅人のアセ',goal:'母が掛けた指輪を取り戻す',quests:['q023'],detail:'地下庭園の休み場で一行を待つ。'},
  e2_mother_ring_keeper:{id:'e2_mother_ring_keeper',name:'通路当番の住民',goal:'通路を使う住民に危険を知らせる',quests:['q023'],detail:'通路口で通行記録と案内板を預かっている。'}
};

export function motherRingSource(){
  const s=story(23,places,[]);
  s.entity('ase','shelter','e2_mother_ring_ase').entity('keeper','board','e2_mother_ring_keeper');
  s.entity('ring','root').entity('copy','party').entity('notes','party').entity('register','keeper').entity('peg','party');
  s.enum('marker','ring',['ring','ringAndPeg','peg','lost'],'今も根の成長を比較できる標識');
  s.enum('reason','pending',['pending','direct','private','warned'],'写しを選んだ時点');
  for(const key of ['measured','aseTold','warned','archived','posted','cutRoot','madeCopy','signed'])s.bool(key);
  s.fact('pressure','根は母の刻んだ線を越え、通路の支柱を押している。');
  s.node('entry','root',[],
    '根に銀の指輪が食い込んでいる。すぐ脇には短い刻みが三本。旅人アセは「母の形見です。内側に私の名があるはず」と休み場で話していた。',[
      O('measure','根の太さを測り、古い目盛と比べる','measured',[set('measured'),see('pressure','root')]),
      O('replica','本物を残し、手持ちの薄い銀板で写しを作る','copied',[set('madeCopy'),set('reason','direct')]),
      O('cut','指輪の食い込んだ根を切る','severed',[set('cutRoot'),set('marker','lost')])
    ]);
  s.node('severed','root',[],'切り口が開き、指輪が緩んだ。刻みのあった根は折れて転がった。もう支柱までの広がりをあの線と比べることはできない。',[
    O('take','切り口から本物の指輪を拾う','recovered',[give('ring','root','party')])
  ]);
  s.node('recovered','root',[],'泥をぬぐうと、輪の内側にアセの名が読めた。休み場へ持ち帰ろう。',[
    O('return','指輪を持ってアセの休み場へ戻る','cut_return')
  ]);
  s.node('cut_return','shelter',['ase'],'アセが両手を差し出した。「この字だ。母が刻んでくれたんです」',[
    O('hand','本物を渡し、根を切ったと伝える','@contract',[give('ring','party','ase')])
  ]);
  s.node('measured','root',[],'糸を根に巻き、その長さを手帳に写した。古い刻みと並べると、根が太った分だけ支柱が傾いている。指輪は母親が毎回同じ場所を測るための目印だった。',[
    O('report','測定手帳を持ってアセのもとへ行く','warning')
  ]);
  s.node('warning','shelter',['ase'],'アセは手帳の二本の線を指でなぞった。「母はここを見張っていたんだ。通路の人に知らせてください。指輪は後でいい」',[
    O('notice','崩落のおそれを知らせに住民の通路口へ行く','at_board'),
    O('leave','指輪は残すと伝え、写しを作りに根元へ戻る','private_copy')
  ]);
  s.node('private_copy','root',[],'指輪は測定した時と同じ位置にある。刻みを動かさず、銀板を輪の外側に当てた。',[
    O('copy','輪の模様を銀板に写す','copied',[set('madeCopy'),set('reason','private')])
  ]);
  s.node('at_board','board',['keeper'],'交替を待つ通路当番が、荷車を止めた。「どこの支柱です？　ここから見えないんです」',[
    O('warn','手帳を開き、危ない支柱の位置を当番に知らせる','warned',[set('warned')])
  ]);
  s.node('warned','board',['keeper'],'当番は支柱の位置を仲間に伝えて通行を止めた。次の当番にも測り方が分かるよう、備え付けの台帳を開く。',[
    O('archive','母の目盛と今日の実測を通路台帳に転記する','archived',[set('archived')])
  ]);
  s.node('archived','board',['keeper'],'台帳に二本の線が並んだ。手帳は一行の手元にある。当番が避難用の迂回路を指さした。',[
    O('post','当番と一緒に避難の道順を通路口に掲げる','posted',[set('posted')])
  ]);
  s.node('posted','board',['keeper'],'案内を読んだ人が別の通路へ向かう。当番はここに残り、後から来る人にも道を教えるという。',[
    O('back','測定手帳を携えて母樹へ戻る','retrieval')
  ]);
  s.node('retrieval','root',[],'古い刻みも指輪も残っている。輪を外すなら、次の当番が同じ高さで測れる目印を先に置ける。',[
    O('remove','指輪の高さに合わせ、新しい測定標を据える','marked',[give('peg','party','root'),set('marker','ringAndPeg')]),
    O('keep','指輪を測定標として残し、銀板に模様を写す','copied',[set('madeCopy'),set('reason','warned')])
  ]);
  s.node('marked','root',[],'地面に打った杭の刻みが輪の高さと重なった。根と輪のすきまに糸を通すと、皮を傷つけずに緩められる。',[
    O('lift','根を傷めず指輪を外して包む','lifted',[give('ring','root','party'),set('marker','peg')])
  ]);
  s.node('lifted','root',[],'根には傷がなく、杭に新しい測定線が残った。包んだ指輪と測定手帳をアセのもとへ運ぼう。',[
    O('return','指輪と測定手帳を休み場へ持ち帰る','safe_return')
  ]);
  s.node('safe_return','shelter',['ase'],'アセは母の古い線と今日の線を見比べた。「指輪を外しても、次の人が測れるんですね」',[
    O('hand','本物の指輪と測定手帳をアセに渡す','@informed',[give('ring','party','ase'),give('notes','party','ase')])
  ]);
  s.node('copied','root',[],'銀板を細い輪に曲げた。指輪の模様が同じ向きに並んでいる。本物は根の刻みの横に残した。',[
    O('return','写しを持ってアセの休み場へ戻る','copy_return')
  ]);
  s.node('copy_return','shelter',['ase'],when(s.is('posted'),
    '「向こうの当番から案内が出たと聞きました」。アセは写しを受け取ろうと手を伸ばした。',
    when(s.is('measured'),'アセは手帳に目を落とした。「母の印は残せたんですね」。通路当番にはまだ知らせていない。',
      '「この模様、覚えています」。アセは銀の写しをのぞき込んだ。根の太さはまだ測っていない。')),[
    O('hand','写しを渡し、記録の最初に母の名を記す','@compromise',[give('copy','party','ase'),set('signed')])
  ]);
  const journey=connectWorld(s,world,1);
  journey('measured_report','shelter',{arrive:[set('aseTold')]});
  journey('warning_notice','board');
  journey('warning_leave','root');
  journey('posted_back','root');
  for(const key of ['recovered_return','lifted_return','copied_return'])journey(key,'shelter');
  const is=s.is, intact=is('ringAt','root');
  s.story.endings={
    contract:and(is('cutRoot'),is('marker','lost'),is('ringAt','ase')),
    informed:and(is('posted'),is('archived'),is('marker','peg'),is('pegAt','root'),is('ringAt','ase'),is('notesAt','ase')),
    compromise:and(intact,is('marker','ring'),is('madeCopy'),is('copyAt','ase'),is('signed'),
      or(and(is('reason','direct'),not(is('measured'))),and(is('reason','private'),is('aseTold'),not(is('warned'))),and(is('reason','warned'),is('posted'))))
  };
  const implies=(key,condition)=>s.invariant(key,or(not(is(key)),condition),key+' の前提を保つ');
  implies('aseTold',and(is('measured'),s.known('pressure')));
  implies('warned',is('aseTold'));
  implies('archived',and(is('warned'),is('registerAt','keeper')));
  implies('posted',is('archived'));
  implies('cutRoot',and(is('marker','lost'),not(is('measured'))));
  implies('madeCopy',and(intact,is('marker','ring')));
  s.invariant('substitute',or(not(or(is('marker','peg'),is('marker','ringAndPeg'))),and(is('pegAt','root'),is('posted'),not(is('cutRoot')))),'新しい測定標は案内を掲げてから根元に据える');
  for(const scene of Object.values(s.story.scenes))for(const cast of scene.cast){
    cast.when=is(cast.entity+'At',scene.place);
    cast.display={x:50,y:10,scale:1,cardScale:1,layer:0};
  }
  return s.done();
}
