import {story, O, set, give, move, and, or, not} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

const places = {
  works: 'ネフの作業場', shelter: '図面にない避難区画', refuge: '二つの出口を持つ空き倉',
  store: '支給倉の返却窓口', depths: '奥の未補強区画'
};
const roles = {
  nef: ['ネフ', '消えた支給品と住民の安全を確かめる'],
  aide: ['発破師の助手', '支給品を保管し、図面にない区画の住民を守る'],
  residents: ['避難区画の住民', '寝台と一緒に安心して休める場所へ移る'],
  clerk: ['支給倉の係員', '返却された現物と帳簿を照合する']
};
export const silentBlastCharacters = Object.fromEntries(Object.entries(roles).map(([role, [name, goal]]) => {
  const id = 'e2_silent_blast_' + role;
  return [id, {id, name, goal, quests: ['q016'], detail: '塩哭きの廃坑・地下二層で会う人物。'}];
}));

const cell = (key, x, y) => ({kind:'dungeon', dungeon:'region_2', map:'region_2_f2', x, y, event:'q016_silent_blast_'+key});
const world = {works:cell('works',9,11), shelter:cell('shelter',8,9), refuge:cell('refuge',7,11), store:cell('store',9,7)};

export function silentBlastSource() {
  const s = story(16, places, [['works','store'],['store','shelter'],['shelter','refuge'],['store','refuge'],['refuge','works'],['shelter','depths']]);
  for (const [role, place] of Object.entries({nef:'works', aide:'store', residents:'shelter', clerk:'store'}))
    s.entity(role, place, 'e2_silent_blast_'+role);
  s.entity('beds','shelter').entity('supplies','aide').entity('sealant','aide');
  s.enum('route','open',['open','visit','purchase','evacuate','force']);
  for (const key of ['materialKnown','shelterKnown','siteChecked','peopleMoved','powderReturned','booksCorrected','purchased','trial','vibrationChecked','blasted','forceBlasted','victory','reported','reopened']) s.bool(key);
  const crew = ['nef','aide'];
  const atStore = ['nef','aide','clerk'];
  const atShelter = ['nef','aide','residents'];
  const route = value => s.is('route',value);

  s.node('entry','works',['nef'],'ネフは支給簿を広げた。「使ったはずの品がない。魔物が持ち去ったのか」。助手の足跡は支給倉へ続いている。作業場の奥からは、何かが皿を引きずるような音がする。',[
    O('assistant','助手を訪ね、支給品の行方を聞く','store_visit'),
    O('buy','支給倉へ行き、封止材の買い取りを相談する','trade_arrival'),
    O('blast','疑われている魔物と戦う','won',[set('route','force'),set('victory')],{combat:'guard_2'})
  ]);
  s.node('won','works',['nef'],'魔物は退いた。支給品を盗んだ証拠は出ていない。ネフが古い図面に目を戻した。奥の区画からの返事はまだない。',[
    O('proceed','退避を確認せず、作業を続行する','forced',[set('blasted'),set('forceBlasted'),move('residents','shelter','depths')])
  ]);
  s.node('forced','works',['nef'],'岩壁が開いた。奥へ逃げていく足音が消え、食器の割れる音だけが残った。住民が使っていた寝台は元の区画に残っている。',[
    O('finish','作業の結果をネフと記録する','@contract')
  ]);

  s.node('store_visit','store',atStore,'窓口の脇で助手が容器を抱えている。係員の台帳では、支給品はまだ作業場に出たままだ。',[
    O('ask','助手に容器と封止材を示してもらう','explained',[set('materialKnown')])
  ]);
  s.node('explained','store',atStore,'支給品は全量、助手の手元にあった。封止材は助手が自費で用意した品だった。「なぜかは、向こうを見ればわかります」。',[
    O('follow','ネフと助手について避難区画へ行く','shelter_arrival')
  ]);
  s.node('shelter_arrival','shelter',atShelter,'古い坑道図では、この先は岩壁のはずだった。戸口の向こうには寝台が並び、住民が欠けた皿を片付けている。',[
    O('listen','住民の話を聞き、図面にない住まいを確かめる','shelter_choice',[set('shelterKnown')])
  ]);
  s.node('shelter_choice','shelter',atShelter,'「寝台ごと移れるなら、奥の空き倉を見てほしい」。住民はここで待つ。ネフが空き倉へ続く通路を指した。',[
    O('warehouse','空き倉へ行き、移転先を下見する','inspection_arrival'),
    O('buy','移転を見送り、支給倉で封止材を買い取る相談をする','trade_arrival')
  ]);
  s.node('inspection_arrival','refuge',crew,'空き倉に着いた。床板の継ぎ目と支柱を見て、寝台を通せるか二つの出口まで歩いて確かめる。住民はまだ元の区画にいる。',[
    O('inspect','床と支柱、東西の出口までの通り幅を確認する','inspected',[set('siteChecked')])
  ]);
  s.node('inspected','refuge',crew,'ネフが東の出口から戻り、助手が西の通路から顔を出した。どちらにも寝台が通る。空き倉にはまだ誰の荷物もない。',[
    O('evacuate','住民と寝台を迎えに行く','collect'),
    O('cancel','移転を見送り、支給倉へ戻って買い取りを相談する','trade_arrival')
  ]);
  s.node('collect','shelter',atShelter,'戻ってきた隊に、住民が行き先を聞いた。ネフが二つの出口を説明すると、皆が寝台の横に集まった。',[
    O('take','出発する住民を確かめ、寝台を預かる','ready_move',[give('beds','shelter','party')])
  ]);
  s.node('ready_move','shelter',atShelter,'助手が先に立ち、ネフが最後尾についた。隊が預かった寝台と一緒に、住民が空き倉まで歩く。',[
    O('escort','住民と寝台を空き倉へ運ぶ','moved_arrival')
  ]);
  s.node('moved_arrival','refuge',atShelter,'先頭が空き倉に着き、最後尾のネフも戸をくぐった。寝台は隊が持っている。まだ人数の照合を済ませていない。',[
    O('unload','寝台を所定の場所に下ろす','beds_arranged',[give('beds','party','refuge')])
  ]);
  s.node('beds_arranged','refuge',atShelter,'寝台を並べた。助手が出発時の顔ぶれを一人ずつ読み上げ、点呼を待っている。',[
    O('count','点呼して全員の到着を確認する','counted',[set('peopleMoved')])
  ]);
  s.node('counted','refuge',atShelter,'最後の返事があり、点呼がそろった。住民は寝台と一緒にここに残る。助手は預かった支給品をまだ持っている。',[
    O('store','助手・ネフと返却窓口へ向かう','return_ready')
  ]);

  s.node('trade_arrival','store',atStore,'助手が支給品の容器と私物の封止材を別々に置いた。隊はまだ代金を渡していない。',[
    O('inspect','支給簿と現物を見比べ、買い取る品を確認する','payment',[set('materialKnown')])
  ]);
  s.node('payment','store',atStore,'支給品は全量そろっていた。買い取りの対象は助手が持ち込んだ封止材で、代金は20Gだ。',[
    O('pay','20Gを支払い、封止材を受け取る','return_ready',[set('purchased'),give('sealant','aide','party')],{cost:{gold:20}})
  ]);
  s.node('return_ready','store',atStore,'支給品の容器はまだ助手が持っている。窓口係が支給簿を開き、受け取る場所を空けた。',[
    O('hand_over','助手が支給品を係員に返すのを見届ける','returned',[give('supplies','aide','clerk'),set('powderReturned')])
  ]);
  s.node('returned','store',atStore,'係員は現物を受け取った。帳簿には持ち出し中の印が残っている。助手は、なぜ無断で変更したのかを話し始めた。',[
    O('report','助手の申告を窓口で受け付ける','reported',[set('reported')])
  ]);
  s.node('reported','store',atStore,'係員が申告と受領品を読み合わせた。支給簿の記入欄が開いている。',[
    O('correct','受領記録と支給簿を照合して訂正する','ledger_done',[set('booksCorrected')])
  ]);
  s.node('ledger_done','store',atStore,'係員が訂正した欄に日付を入れた。返却欄に受領印が押されたのを見て、ネフが帳簿を閉じた。',[
    O('finish','買い取りと返却を確認し、作業を休止する','@compromise',[],{when:route('purchase')}),
    O('works','住民の点呼結果を持って作業場へ戻る','trial_ready',[],{when:route('evacuate')})
  ]);
  s.node('trial_ready','works',crew,'ネフは点呼と返却の記録を受け取った。「住民のところで結果を確かめるまでは、採掘を再開しない」。',[
    O('test','ネフの試験に立ち会う','tested',[set('trial'),set('blasted')])
  ]);
  s.node('tested','works',crew,'試験が終わった。移転先からの観測記録はまだ届いていない。ネフが住民の様子を見に行こうと促す。',[
    O('refuge','移転先の観測結果を取りに行く','observation')
  ]);
  s.node('observation','refuge',atShelter,'寝台の横で住民が記録をつけていた。食器は棚に残っている。試験時の記録と住民の話を照らし合わせる。',[
    O('read','観測記録と住民の話を確かめる','observed',[set('vibrationChecked')])
  ]);
  s.node('observed','refuge',atShelter,'観測結果を記録した。住民はここで休めるという。作業場にいる仲間には、まだ再開の知らせを出していない。',[
    O('works','記録を持って作業場へ戻る','restart_ready')
  ]);
  s.node('restart_ready','works',crew,'ネフが記録を読み、助手に作業簿を差し出した。助手が自分の名を書く。',[
    O('finish','観測結果を受けて採掘を再開する','@informed',[set('reopened')])
  ]);

  const journey = connectWorld(s, world, 1);
  journey('entry_assistant','store',{companions:['nef'],depart:[set('route','visit')]});
  journey('entry_buy','store',{companions:['nef'],depart:[set('route','purchase')]});
  journey('explained_follow','shelter',{companions:crew});
  journey('shelter_choice_warehouse','refuge',{companions:crew});
  for(const action of ['shelter_choice_buy','inspected_cancel'])
    journey(action,'store',{companions:crew,depart:[set('route','purchase')]});
  journey('inspected_evacuate','shelter',{companions:crew,depart:[set('route','evacuate')]});
  journey('ready_move_escort','refuge',{companions:[...crew,'residents']});
  journey('counted_store','store',{companions:crew});
  journey('ledger_done_works','works',{companions:crew});
  journey('tested_refuge','refuge',{companions:crew});
  journey('observed_works','works',{companions:crew});

  const returned = and(s.is('powderReturned'),s.is('suppliesAt','clerk'));
  const evacuated = and(s.is('siteChecked'),s.is('residentsAt','refuge'),s.is('bedsAt','refuge'));
  s.story.endings = {
    compromise:and(route('purchase'),s.is('purchased'),returned,s.is('booksCorrected'),s.is('residentsAt','shelter')),
    informed:and(route('evacuate'),s.is('peopleMoved'),returned,s.is('booksCorrected'),s.is('vibrationChecked'),s.is('reopened')),
    contract:and(route('force'),s.is('victory'),s.is('forceBlasted'),s.is('residentsAt','depths'),s.is('bedsAt','shelter'))
  };
  s.invariant('payment',or(not(s.is('purchased')),and(route('purchase'),s.is('materialKnown'),s.is('sealantAt','party'))),'代金は封止材の現物受領と同時に一度だけ支払う');
  s.invariant('count',or(not(s.is('peopleMoved')),evacuated),'点呼には住民と寝台の到着が必要');
  s.invariant('ledger',or(not(s.is('booksCorrected')),and(returned,s.is('reported'))),'現物の返却と助手の申告後に帳簿を訂正する');
  s.invariant('trial',or(not(s.is('trial')),and(s.is('peopleMoved'),s.is('booksCorrected'))),'点呼と帳簿訂正を試験に先行させる');
  s.invariant('restart',or(not(s.is('reopened')),and(s.is('trial'),s.is('vibrationChecked'))),'観測結果を確認してから再開する');
  for (const scene of Object.values(s.story.scenes)) {
    scene.cast.forEach((c,index)=>{
      c.when=s.is(c.entity+'At',scene.place);
      const slots=scene.cast.length===3?[13,44,78]:scene.cast.length===2?[30,70]:[50];
      c.display={x:slots[index],y:10,scale:1,cardScale:1,layer:index};
    });
  }
  return s.done();
}
