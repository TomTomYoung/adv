import {story,O,set,give,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

const places={seat:'先代庭師の作業席',bed:'手入れを待つ苗床',desk:'ユイの記録台'};
const site=(id,x)=>({kind:'dungeon',dungeon:'region_3',map:'region_3_f2',x,y:13,event:'q028_gardener_'+id});
const world={seat:site('seat',8),bed:site('bed',11),desk:site('desk',14)};
export const gardenersSeatCharacters={
  e2_gardener_apprentice:{id:'e2_gardener_apprentice',name:'先代庭師の弟子',goal:'先代に教わった手順を道具の配置と実演で伝える',quests:['q028'],detail:'入口側から順に道具を置くと、次にする仕事を説明できる。'}
};

export function gardenersSeatSource(){
  const s=story(28,places,[]),is=s.is;
  s.entity('yui','desk','e2_seed_bird_gardener').entity('apprentice','seat','e2_gardener_apprentice');
  for(const holder of ['tray','box','front','middle','last'])s.entity(holder,'seat');
  s.entity('plant','bed').entity('jug','tray').entity('knife','tray').entity('tag','tray');
  s.enum('layout','inherited',['inherited','cleared','jug','knife','tag'],'弟子が席で示した配置、または片付けた状態');
  s.enum('scope','none',['none','untouched','warning','water','complete'],'記録に含める実演の範囲');
  s.enum('record','none',['none','written','partial','both'],'ユイが記録台で残した手順');
  for(const k of ['warned','corrected','wet','pruned','tagged','sketch','explained'])s.bool(k);
  const apprentice=['apprentice'],yui=['yui'],both=['yui','apprentice'];
  const swap=[give('jug','apprentice','party'),give('knife','party','apprentice')];
  const clear=['jug','knife','tag'].map(tool=>give(tool,'tray','box'));
  s.node('entry','seat',apprentice,'先代の席には、水差しと小刀と苗札が一緒に載った盆がある。庭師のユイが探していた手順書は見当たらない。弟子が椅子を入口の方へ向けた。「ここから見てください。並べれば、次が分かります」',[
    O('show','実演を頼む','first_tool'),O('rules','文字に替える','pack'),O('preserve','席を保存する','keep_seat')
  ]);
  s.node('pack','seat',apprentice,'空の道具箱を開いた。盆の上の三つをしまえば、次の当番には記録台の文字手順を渡すことになる。',[
    O('clear','道具をしまう','packed',[...clear,set('layout','cleared')])
  ]);
  s.node('packed','seat',apprentice,'蓋を閉めると、弟子が入口へ向けていた椅子だけが残った。いつもの当番表を持って、ユイの記録台へ向かう。',[
    O('desk','記録台へ行く','written')
  ]);
  s.node('written','desk',yui,'ユイは当番ごとに違っていた言い回しをそろえ、見慣れた仕事を文字に起こした。先代が春にどこへ刃を当てたのか、その一行は空いている。',[
    O('file','手順を綴じる','@contract',[set('record','written')])
  ]);
  s.node('keep_seat','seat',apprentice,'盆も椅子もそのまま残すことにした。弟子が、名前の分かる道具を指で示す。ユイには、どこからがまだ聞き取れていないかも伝えよう。',[
    O('desk','記録台へ行く','partial')
  ]);
  s.node('first_tool','seat',apprentice,'弟子は水差しの取っ手を握った。「先生と私は字の代わりにこれを使ったんです。戸を開けた時、いちばん先に手が届くのはここ」。入口側の丸い跡を指した。',[
    O('place','水差しを置く','first_set',[give('jug','tray','front'),set('layout','jug')])
  ]);
  s.node('first_set','seat',apprentice,'水差しが入口側に据わった。「乾いたまま刃を入れたら、根の周りの土が割れます」。苗床では弟子が水差しを持ち、一行は小刀を預かることにした。',[
    O('bed','苗床へ行く','dry')
  ]);
  s.node('dry','bed',apprentice,'表土に細いひびがある。弟子が水差しを持ち、一行の手には鞘に入った小刀がある。まずどちらを使おうか。',[
    O('water','水差しを取る','before_water',swap),
    O('cut','先に刃を出す','stopped',[...swap,set('warned')])
  ]);
  s.node('stopped','bed',apprentice,'鞘から刃を出しかけると、弟子がその手を止めた。「まだです。土ごと細い根が持ち上がってしまう」。小刀は弟子が預かり、水差しをこちらの手に戻した。苗には傷ひとつない。',[
    O('listen','説明を聞く','before_water',[set('corrected')]),O('stop','ここで終える','back_dry')
  ]);
  s.node('back_dry','seat',apprentice,'水を注がずに席へ戻った。借りた道具を元の位置に返す。弟子が示したのは入口側の水差しと、乾いた土で手を止める理由までだ。',[
    O('replace','道具を戻す','limited',[give('jug','party','front'),give('knife','apprentice','tray'),set('scope','warning')])
  ]);
  s.node('limited','seat',apprentice,'水差しの位置と教わった注意を書き留めた。弟子は椅子をそのままにして、次にここを訪ねる人のために席を空けた。',[
    O('desk','記録台へ行く','partial')
  ]);
  s.node('before_water','bed',apprentice,when(is('corrected'),'弟子の説明を聞き、水差しを握り直した。先ほど刃を出しかけた苗の土もまだ乾いている。','小刀を弟子に預け、水差しを受け取った。口を根元へ向ける。土にはまだ水が届いていない。'),[
    O('pour','土を湿らせる','wet_soil',[set('wet')])
  ]);
  s.node('wet_soil','bed',apprentice,'水が染み、苗の根元の土がほぐれた。弟子は小刀を鞘に入れたまま、席の方を指す。「次の二つには、それぞれ置き場所があります」',[
    O('back','席へ戻る','next_tools')
  ]);
  s.node('next_tools','seat',apprentice,'水差しを入口側に返した。弟子は小刀を横に寝かせ、刃を苗床の方へ向ける位置を示した。',[
    O('knife','小刀を並べる','knife_shown',[give('knife','apprentice','middle'),set('layout','knife')])
  ]);
  s.node('knife_shown','seat',apprentice,'小刀の先に、細長い跡が一本ある。「切ったあと、どの苗を手入れしたか分かるように」。弟子は盆から苗札を選んだ。',[
    O('tag','苗札を並べる','order_shown',[give('tag','tray','last'),set('layout','tag')])
  ]);
  s.node('order_shown','seat',apprentice,'入口から順に、水差し、小刀、苗札。三つの置き方がそろった。苗床で実際に済んだ仕事は水やりまでだ。ここまでを記録するか、弟子と最後まで試すか。',[
    O('finish','最後まで試す','tools_drawn',[set('sketch')]),
    O('partial','配置だけ残す','water_note',[set('scope','water')])
  ]);
  s.node('water_note','seat',apprentice,'三つの位置を写し、実際に確かめた水やりの所にだけ印をつけた。小刀と苗札は席に置いたまま、記録を届ける。',[
    O('desk','記録台へ行く','partial')
  ]);
  s.node('tools_drawn','seat',apprentice,'道具を動かす前に、弟子と一緒に三つの輪郭と向きを紙に写した。小刀と苗札を携え、湿らせた苗の所へ戻る。',[
    O('bed','苗床へ戻る','before_prune')
  ]);
  s.node('before_prune','bed',apprentice,'弟子が余分な枝を持ち上げた。水を含んだ土は根に沿って落ち着き、小刀を添えても苗はぐらつかない。',[
    O('prune','枝を剪定する','after_prune',[set('pruned')])
  ]);
  s.node('after_prune','bed',apprentice,'切り口を確かめ、小刀を鞘に収めた。隣にはそっくりの苗がある。弟子が先ほどの札を差し出した。',[
    O('label','苗札を付ける','tagged',[give('tag','apprentice','plant'),set('tagged')])
  ]);
  s.node('tagged','bed',apprentice,'手入れした苗に札が付いた。使った小刀を持って席へ戻り、写しに残した刃の向きと照らし合わせる。',[
    O('back','席へ戻る','finished_seat')
  ]);
  s.node('finished_seat','seat',apprentice,'小刀を元の向きに戻した。苗札そのものは苗床にあり、席にはその輪郭が残る。弟子は写しの入口側をつまんだ。「私がこの順でユイさんに話します」',[
    O('desk','二人で届ける','explain')
  ]);
  s.node('explain','desk',both,'ユイが紙を広げ、弟子に向けて回した。弟子は入口側から指を進め、先に水を使う理由、刃を当てる場所、苗札で残す印を、自分の言葉で順に話した。',[
    O('hear','説明を聞き取る','archive',[set('explained')])
  ]);
  s.node('archive','desk',both,'ユイが聞き取った言葉を、道具の輪郭と並べた。弟子は文字を読まなくても、写しの上で同じ仕事をたどれる。二人で記録に日付を入れる。',[
    O('save','両方を記録する','@informed',[set('scope','complete'),set('record','both')])
  ]);
  s.node('partial','desk',yui,when(is('scope','warning'),'ユイは入口側の水差しを描き、乾いた土で刃を止めた理由を書き添えた。その後の剪定の欄は次の聞き取りのために空ける。',
    when(is('scope','water'),'ユイは三つの配置を受け取り、水やりだけに実施の印をつけた。剪定も札付けも、まだ実演を見ていない。','ユイは教わった道具の名を控えた。先代の席はそのまま残り、残りの手順もあとから確かめられる。')),[
    O('save','ここまで記す','@compromise',[set('record','partial')])
  ]);
  const journey=connectWorld(s,world,1);
  journey('packed_desk','desk');journey('keep_seat_desk','desk',{depart:[set('scope','untouched')]});
  journey('first_set_bed','bed',{companions:apprentice,depart:[give('jug','front','apprentice'),give('knife','tray','party')]});
  journey('stopped_stop','seat',{companions:apprentice});journey('limited_desk','desk');
  journey('wet_soil_back','seat',{companions:apprentice,arrive:[give('jug','party','front')]});
  journey('water_note_desk','desk');
  journey('tools_drawn_bed','bed',{companions:apprentice,depart:[give('knife','middle','party'),give('tag','last','apprentice')]});
  journey('tagged_back','seat',{companions:apprentice,arrive:[give('knife','party','middle')]});
  journey('finished_seat_desk','desk',{companions:apprentice});
  s.story.endings={
    contract:and(is('record','written'),is('layout','cleared'),is('jugAt','box'),is('knifeAt','box'),is('tagAt','box'),not(is('wet'))),
    informed:and(is('record','both'),is('scope','complete'),is('explained'),is('sketch'),is('tagged'),is('tagAt','plant'),is('apprenticeAt','desk')),
    compromise:and(is('record','partial'),or(is('scope','untouched'),is('scope','warning'),is('scope','water')),not(is('pruned')),is('apprenticeAt','seat'))
  };
  const implies=(id,a,b,message)=>s.invariant(id,or(not(a),b),message);
  implies('correction',is('corrected'),is('warned'),'乾いた土で制止されてから訂正を受け入れる');
  implies('prune',is('pruned'),and(is('wet'),is('sketch'),is('layout','tag')),'土を湿らせ、配置を写してから剪定する');
  implies('tag',is('tagged'),and(is('pruned'),is('tagAt','plant')),'剪定した苗に実物の札を付ける');
  implies('account',is('explained'),and(is('tagged'),is('apprenticeAt','desk')),'実演を終えた弟子が記録台で説明する');
  implies('limited',is('scope','warning'),and(is('warned'),not(is('wet')),is('layout','jug')),'制止直後にやめた手順では土は乾いている');
  implies('water-only',is('scope','water'),and(is('wet'),not(is('pruned')),is('tagAt','last')),'水やりまでの実演では苗札は席に残る');
  for(const scene of Object.values(s.story.scenes))for(const [i,cast] of scene.cast.entries()){
    cast.when=is(cast.entity+'At',scene.place);
    cast.display={x:scene.cast.length===1?50:i===0?33:67,y:10,scale:1,cardScale:1,layer:i};
  }
  return s.done();
}
