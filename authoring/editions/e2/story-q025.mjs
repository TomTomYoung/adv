import {story,O,set,give,see,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

const places={square:'祭の歌場',board:'作業台の上り口',platform:'天井の作業台',well:'戻り樋の井戸',field:'祭の畑'};
const site=(key,x,y)=>({kind:'dungeon',dungeon:'region_3',map:'region_3_f1',x,y,event:'q025_rain_song_'+key});
const world={square:site('square',17,3),board:site('board',15,3),platform:site('platform',15,1),well:site('well',17,7),field:site('field',15,9)};
export const rainSongCharacters={
  e2_rain_song_pino:{id:'e2_rain_song_pino',name:'水運びのピノ',goal:'祭の畑へ水を届ける',quests:['q025'],detail:'井戸で手桶と戻り樋を見ている。'},
  e2_rain_song_singer:{id:'e2_rain_song_singer',name:'祭の歌い手',goal:'歌場から水の合図を送る',quests:['q025'],detail:'井戸に礼を言う一節目と、畑を呼ぶ二節目を歌う。'},
  e2_rain_song_grower:{id:'e2_rain_song_grower',name:'畑の世話役',goal:'畝に水を行き渡らせる',quests:['q025'],detail:'畑に待機し、当番を引き受けたときは作業台へ上がる。'}
};

export function rainSongSource(){
  const s=story(25,places,[]),is=s.is;
  s.entity('singer','square','e2_rain_song_singer').entity('pino','well','e2_rain_song_pino').entity('grower','field','e2_rain_song_grower');
  s.entity('pail','pino').entity('roster','board').entity('log','platform');
  s.enum('fieldWater','dry',['dry','rain','flood','pail'],'畑へ実際に届いた水');
  s.enum('bucketStart','none',['none','festival','roster','platform','retry'],'手桶へ切り替えた時点');
  s.enum('bucketLoad','empty',['empty','full','poured'],'手桶を満たして畑に注ぐまで');
  s.enum('lastOpening','none',['none','first','second','forced'],'最後に集水弁を開いた方法');
  for(const k of ['signalled','onDuty','returnedToWell','fieldChecked','accepted','trained','inspectionSet','volunteered','drainNeeded'])s.bool(k);
  s.fact('secondVerse','当番札には二節目に集水弁を開くと記されている。');
  s.fact('returnCourse','一節目に流した水は畑に届かず井戸へ戻った。');
  const singer=['singer'],pino=['pino'],grower=['grower'];
  const rainfall=[set('lastOpening','second'),set('fieldWater','rain')];
  s.node('entry','square',singer,'地下庭園に歌が響く。歌い手が二節目を結んでも、天井の小窓からは一滴も落ちてこない。井戸で水を運ぶピノの頼みで、一行は畑に雨が届かない訳を調べに来た。',[
    O('sing','歌で合図する','signalled',[set('signalled')]),
    O('force','弁を開けに行く','force_site'),
    O('buckets','手桶を使う','well_site')
  ]);
  s.node('signalled','square',singer,'歌い手に合わせて小窓に合図を送った。窓は閉じたまま、返事もない。「昔はあそこで誰かが手を上げてくれたのに」。歌い手が上り口を指した。',[
    O('post','上り口へ行く','at_board')
  ]);
  s.node('at_board','board',[],'はしごの手すりに、古い当番札がひもでくくられている。端の文字は指で何度もなぞられて薄い。',[
    O('read','当番札を読む','attendant',[see('secondVerse','roster')])
  ]);
  s.node('attendant','board',[],'「二節目、畑を呼んだら弁を開く」。歴代の当番が名前を連ねていた。最後の名前の次が空いている。歌は伝わったのに、上で聞く人がいなかったのだ。',[
    O('climb','作業台へ上る','verse'),
    O('carry','手桶に替える','well_site')
  ]);
  s.node('verse','platform',[],'小窓を押し開けると歌場から声が届いた。一節目は井戸への礼、二節目は畑への呼び掛け。弁の取っ手を握ると、歌い手が初めから歌ってくれた。',[
    O('second','二節目で開く','rain',rainfall),
    O('first','一節目で開く','first_open',[set('lastOpening','first'),set('returnedToWell')]),
    O('stop','手桶に替える','well_site')
  ]);
  s.node('first_open','platform',[],'井戸へ礼を言う節で取っ手を引いた。ひと流れで弁は閉じた。畑の散水口は乾いたまま、戻り樋の方で水音がする。',[
    O('check','井戸を見に行く','at_well')
  ]);
  s.node('at_well','well',pino,'戻り樋の下でピノの手桶が揺れている。「いま、ここへ水が落ちましたよ」。井戸の石に新しい水の跡がついていた。',[
    O('trace','戻り水を確かめる','retry',[see('returnCourse','well')])
  ]);
  s.node('retry','well',pino,'一節目では井戸へ戻り、畑には届かないと分かった。歌場から、もう一度二節目を歌おうという声がした。ピノは手桶を空けて待っている。',[
    O('again','作業台へ戻る','again_ready'),
    O('buckets','手桶に替える','well_site',[set('bucketStart','retry')])
  ]);
  s.node('again_ready','platform',[],'窓から手を上げると、歌が井戸への礼から畑への呼び掛けに変わった。今度はその言葉が聞こえるまで待った。',[
    O('second','二節目で開く','rain',rainfall)
  ]);
  s.node('rain','platform',[],'畑を呼ぶ声で取っ手を引いた。ひと流れで弁が閉じ、畑の上の穴から細い雨がそろって落ちた。',[
    O('field','畑へ下りる','field_rain')
  ]);
  s.node('field_rain','field',grower,'世話役が畝の端の土を割った。表面だけでなく、根の先まで色が濃い。「次にあの歌を聞く役は、私がやります」',[
    O('invite','当番を頼む','trainee',[set('fieldChecked'),set('accepted')])
  ]);
  s.node('trainee','field',grower,'世話役は鍬を畝に置いた。「次の祭で迷わないよう、窓からは歌がどう聞こえるか、今のうちに教えてください」',[
    O('guide','一緒に上る','lesson')
  ]);
  s.node('lesson','platform',grower,'世話役が窓辺に立った。一節目は井戸へ、二節目は畑へ。下から届く言葉と取っ手を引く拍を一緒に確かめた。',[
    O('teach','操作を教える','trained',[set('trained')])
  ]);
  s.node('trained','platform',grower,'世話役は畑を呼ぶ言葉を口ずさみ、取っ手に手を添えた。作業台の点検帳を開き、次の祭の前に弁を確かめる日を決める。',[
    O('date','点検日を記す','@informed',[set('inspectionSet')])
  ]);
  s.node('force_site','platform',[],'小窓の奥に集水弁がある。歌の合図を待たず、固い取っ手を持ち上げれば、たまった水を一度に流せそうだ。',[
    O('pry','弁をこじ開ける','flood',[set('lastOpening','forced'),set('fieldWater','flood')])
  ]);
  s.node('flood','platform',[],'弁が跳ね、水が一気に落ちた。畑の端で茶色いしぶきが上がった。',[
    O('field','畑へ下りる','field_flood')
  ]);
  s.node('field_flood','field',grower,'畑は潤ったが、端の畝だけ水に沈んでいた。世話役がそこへ目印を立てる。「ここは別に水を抜かなくちゃいけない」',[
    O('mark','排水箇所を記す','@contract',[set('fieldChecked'),set('drainNeeded')])
  ]);
  s.node('well_site','well',pino,when(is('bucketStart','retry'),'ピノが戻り水の落ちた井戸に手桶を下ろした。今度はこの水を人の手で畑まで運ぶ。',
    'ピノが井戸の縁に手桶を置いた。「歌が終わるまで、ここから畝へ手渡ししていきましょう」'),[
    O('fill','手桶を満たす','filled',[set('bucketLoad','full')])
  ]);
  s.node('filled','well',pino,'ピノが満杯の手桶を引き上げた。持ち手に両手を添えて受け取れば、土の畝まで運べる。',[
    O('take','手桶を受け取る','carrying',[give('pail','pino','party')])
  ]);
  s.node('carrying','well',pino,'水をこぼさないよう、手桶の縁を水平に保った。ピノは井戸に残って次の水をくむ。',[
    O('carry','畑へ運ぶ','field_bucket')
  ]);
  s.node('field_bucket','field',grower,'畝のそばで世話役が待っていた。手桶の水はまだ一滴も畑に注いでいない。',[
    O('pour','畝に水を注ぐ','watered',[set('bucketLoad','poured'),set('fieldWater','pail'),give('pail','party','field')])
  ]);
  s.node('watered','field',grower,'最初の畝に水が染みた。後ろの人も続いて手桶を回す。歌が終わる頃、腕をさする皆を見て、世話役が「来年の当番は私に」と声を上げた。',[
    O('note','名乗りを記す','@compromise',[set('fieldChecked'),set('volunteered')])
  ]);
  const journey=connectWorld(s,world,1);
  journey('entry_force','platform');
  journey('signalled_post','board');
  journey('attendant_climb','platform',{arrive:[set('onDuty')]});
  journey('first_open_check','well');
  journey('retry_again','platform');
  for(const [action,start] of [['entry_buckets','festival'],['attendant_carry','roster'],['verse_stop','platform']])
    journey(action,'well',{depart:[set('bucketStart',start)]});
  for(const action of ['rain_field','flood_field','carrying_carry'])journey(action,'field');
  journey('trainee_guide','platform',{companions:grower});
  s.story.endings={
    informed:and(is('fieldWater','rain'),is('lastOpening','second'),is('fieldChecked'),is('trained'),is('growerAt','platform'),is('inspectionSet')),
    contract:and(is('fieldWater','flood'),is('lastOpening','forced'),is('fieldChecked'),is('drainNeeded'),is('growerAt','field')),
    compromise:and(is('fieldWater','pail'),is('bucketLoad','poured'),is('pailAt','field'),is('fieldChecked'),is('volunteered'),is('growerAt','field'))
  };
  const implies=(id,a,b,message)=>s.invariant(id,or(not(a),b),message);
  implies('duty',is('onDuty'),and(is('signalled'),s.known('secondVerse')),'当番札を読んで作業台へ上がる');
  implies('first',is('returnedToWell'),and(is('onDuty'),or(is('lastOpening','first'),is('lastOpening','second'))),'一節目の戻り水は再操作後も残る');
  implies('return-course',s.known('returnCourse'),is('returnedToWell'),'井戸で実際の戻り水を確認する');
  implies('rain',is('fieldWater','rain'),and(is('lastOpening','second'),is('onDuty')),'畑への雨は二節目の操作で届く');
  implies('flood',is('fieldWater','flood'),is('lastOpening','forced'),'強行した水だけが畝を浸す');
  implies('full',is('bucketLoad','full'),and(not(is('bucketStart','none')),is('fieldWater','dry')),'手桶の運搬中は畑に水は届かない');
  implies('poured',is('bucketLoad','poured'),and(is('fieldWater','pail'),is('pailAt','field')),'運んだ水は畑で手桶を空けたときに届く');
  implies('retry-bucket',is('bucketStart','retry'),s.known('returnCourse'),'誤操作後に手桶へ替えた経緯を保つ');
  implies('trained',is('trained'),and(is('accepted'),is('fieldChecked'),is('growerAt','platform'),is('fieldWater','rain')),'次の当番と作業台で操作を合わせる');
  implies('inspection',is('inspectionSet'),is('trained'),'操作を伝えてから点検日を記す');
  implies('volunteer',is('volunteered'),is('bucketLoad','poured'),'手運びが済んでから来年の当番が名乗る');
  for(const scene of Object.values(s.story.scenes))for(const cast of scene.cast){
    cast.when=is(cast.entity+'At',scene.place);
    cast.display={x:50,y:10,scale:1,cardScale:1,layer:0};
  }
  return s.done();
}
