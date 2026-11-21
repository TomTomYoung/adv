import {story,O,set,move,see,when,eq,and,or,not} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

const sites={track:['腹を擦った通路',8,13],fork:['灯が届く分かれ道',3,11],gate:['出口の石段下',1,2]};
const crewId='e2_q092_sheltered_crew';
export const shelteredCrew={id:crewId,name:'避難していた隊',goal:'隊員全員で地上に戻る',detail:'移動避難所の腹に乗り込み、扉を内側から叩いて合図している。',quests:['q092']};

export function movingShelterSource(){
  const places=Object.fromEntries(Object.entries(sites).map(([id,[name]])=>[id,name]));
  const s=story(92,places,[['fork','track']]),is=s.is;
  s.entity('shell','track',null,{kind:'group'}).entity('crew','track',crewId);
  s.bool('aboard',true,'隊員が避難所の中にいる').bool('usedLamp',false,'誘導灯を掲げた');
  s.enum('shellState','patrol',['patrol','halted','searching','disabled','docked'],'移動避難所の運行状態');
  s.enum('opening','closed',['closed','hatch','breach'],'隊が降りた開口部');
  s.fact('answer','腹の内側から救助符号の返事があり、避難所番号を確認した。');
  const crew=[{entity:'crew',when:is('aboard',false),display:{x:50,y:10,scale:1,cardScale:1,layer:0}}];
  const repeat={once:false},disembark=opening=>[set('aboard',false),set('opening',opening)];

  s.node('entry','track',[],'重い腹が泥を擦っていく。獣が出口に背を向けたとき、腹板の内側で、こつ、こつ、こつ、と金属が鳴った。足が地面を踏む音とは拍子が違う。分かれ道までなら横を歩ける。',[
    O('signal','三打を返す','echo'),O('lead','灯を掲げる','route'),
    O('cut','外装戦','wreck',[set('shellState','disabled')],{combat:'guard_10',combatRequirement:'要勝利'})
  ]);
  s.node('echo','fork',[],when(s.known('answer'),
    '腹板を三つ叩くと、さっきと同じ間で三打が返った。扉の番号札も灯る。中の隊はまだ乗っている。',
    '三打を返しながら腹板と並ぶと、内側から同じ間で三打が返った。継ぎ目の上で番号札が灯る。泥をぬぐうと、救助人が使う移動避難所の印が出た。'),[
    O('listen','返事を確かめる','reply',[see('answer','fork')],repeat)
  ]);
  s.node('reply','fork',[],'「全員乗っています」。板一枚を隔てて声がした。停止符号を打てば、扉の敷居まで脚が低くなる。灯を掲げたまま先に立てば、乗せたまま出口へ運べる。',[
    O('stop','停止符号を打つ','halt',[set('shellState','halted')]),O('guide','灯で誘導する','route',[set('usedLamp')],repeat)
  ]);
  s.node('route','fork',[],when(s.known('answer'),
    '灯を左右に振ると、腹の番号札が灯の方へ回った。角の向こうへ先に行くと獣は足を止め、灯がもう一度見えるのを待つ。内側では隊員が手すりをつかんでいる。',
    '出口側で灯をかざすと、獣が鼻先をこちらへ向けた。曲がり角の陰に灯を引くと足が止まり、もう一度見せると動き出す。腹を叩く音はまだ続いている。'),[
    O('walk','出口へ先導する','dock'),O('signal','三打を返す','echo',[],repeat)
  ]);
  s.node('halt','fork',[],'停止符号を打ち終えると、獣は膝を折った。地面すれすれまで下りた敷居の裏で留め金が回る。扉が内から少し押され、誰かの指がかかった。',[
    O('open','扉を支える','walking',disembark('hatch'))
  ]);
  s.node('walking','fork',crew,'最後の隊員が両足を泥に下ろした。「ここからは歩けます」。空になった獣の腹で遠くの呼び鈴が鳴った。獣には来た道を空け、一行は隊員と出口へ向かう。',[
    O('escort','歩いて出口へ','safe')
  ]);
  s.node('safe','gate',crew,'石段の下で先頭が仲間の名を読む。最後の一人が返事をした。通路の奥では、次の呼び鈴を追う足音がもう小さくなっている。',[
    O('count','全員を見送る','@informed')
  ]);
  s.node('dock','gate',[],'最後の曲がり角で灯を高く上げると、獣の前脚が出口の石段に揃った。腹の扉が石段の広い踏み面に重なる。内側から掛け金を外す音がした。',[
    O('unload','石段に降ろす','landed',disembark('hatch'))
  ]);
  s.node('landed','gate',crew,'降りて初めて、隊員たちは自分たちを運んだ獣の顔を見た。一人が灯を受けて後ろを照らし、空になった腹に落とし物がないか仲間に声を掛けた。',[
    O('receive','全員を迎える','@compromise')
  ]);
  s.node('wreck','track',[],'外装の脚が止まり、泥に沈んだ。腹の内側から三打がする。継ぎ目を押すと少しだけ口が開く。中の隊員が離れるのを待って、外から救出口を作れる。',[
    O('breach','腹板を開く','freed',disembark('breach'))
  ]);
  s.node('freed','track',crew,'切り開いた腹板を伝って、最後の隊員が外に出た。動かなくなった避難所はこの通路に残る。隊員たちは持てる荷だけを背負い直した。',[
    O('carry','隊と出口へ','recovery')
  ]);
  s.node('recovery','gate',crew,'石段の下で人数が揃った。最後尾の隊員が地図を広げ、腹板を開いた通路に丸をつけた。引き上げ班には、この地図を渡せる。',[
    O('report','救助を届ける','@contract')
  ]);

  for(const scene of ['entry','echo','reply','route'])s.story.scenes[scene].requires=and(is('aboard'),is('shellState','patrol'));
  s.story.scenes.reply.requires=and(s.story.scenes.reply.requires,s.known('answer'));
  s.story.scenes.route.requires=and(s.story.scenes.route.requires,is('usedLamp'));
  s.story.scenes.halt.requires=and(is('aboard'),is('shellState','halted'));
  s.story.scenes.walking.requires=and(is('opening','hatch'),is('shellState','halted'));
  s.story.scenes.safe.requires=and(is('opening','hatch'),is('shellState','searching'));
  s.story.scenes.dock.requires=and(is('aboard'),is('shellState','docked'));
  s.story.scenes.landed.requires=and(is('opening','hatch'),is('shellState','docked'));
  s.story.scenes.wreck.requires=and(is('aboard'),is('shellState','disabled'));
  for(const scene of ['freed','recovery'])s.story.scenes[scene].requires=and(is('opening','breach'),is('shellState','disabled'));

  const world=Object.fromEntries(Object.entries(sites).map(([id,[,x,y]])=>[id,{kind:'dungeon',dungeon:'region_10',map:'region_10_f1',event:'q092_shelter_'+id,x,y}]));
  const journey=connectWorld(s,world,1),riders=['shell','crew'];
  journey('entry_signal','fork',{companions:riders});
  journey('entry_lead','fork',{companions:riders,depart:[set('usedLamp')]});
  journey('route_walk','gate',{companions:riders,arrive:[set('shellState','docked')]});
  journey('walking_escort','gate',{companions:['crew'],depart:[move('shell','fork','track'),set('shellState','searching')]});
  journey('freed_carry','gate',{companions:['crew']});
  const outside=and(is('aboard',false),is('crewAt','gate'));
  s.story.endings={
    informed:and(outside,s.known('answer'),is('opening','hatch'),is('shellState','searching'),is('shellAt','track')),
    compromise:and(outside,is('usedLamp'),is('opening','hatch'),is('shellState','docked'),is('shellAt','gate')),
    contract:and(outside,is('opening','breach'),is('shellState','disabled'),is('shellAt','track'))
  };
  s.invariant('onboard',or(not(is('aboard')),eq(s.v('crewAt'),s.v('shellAt'))),'乗員は降車するまで獣と一緒に移動する');
  s.invariant('opening',eq(s.v('aboard'),is('opening','closed')),'降車した隊にだけ救出口が記録される');
  s.invariant('broken',or(not(is('opening','breach')),is('shellState','disabled')),'守護獣に勝利してから外装を開く');
  s.invariant('halt',or(not(or(is('shellState','halted'),is('shellState','searching'))),s.known('answer')),'返事を聞いてから停止させる');
  return s.done();
}
