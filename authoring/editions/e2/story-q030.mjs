import {story,O,set,give,see,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

const places={garden:'地下庭園の薬草棚',opening:'古い明かり取り',rack:'反射鏡の置き場',surface:'地上の施療院裏の林'};
const site=(id,x,y)=>({kind:'dungeon',dungeon:'region_3',map:'region_3_f2',x,y,event:'q030_root_morning_'+id});
const world={garden:site('garden',12,9),opening:site('opening',10,9),rack:site('rack',9,11),surface:{kind:'town',location:'e2_grove'}};
export const rootMorningCharacters={
  e2_root_morning_residents:{
    id:'e2_root_morning_residents',name:'地下庭園の住民',quests:['q030'],
    goal:'根が天井を押し破る前に皆の行き先を決める',detail:'地下の薬草棚を手入れして暮らしている。'
  }
};

export function rootMorningSource(){
  const s=story(30,places,[]),is=s.is;
  const residents=['hana','residents'],repeat={once:false};
  s.entity('hana','garden','e2_green_sleep_hana').entity('residents','garden','e2_root_morning_residents');
  s.entity('mirror','rack').entity('beds','garden');
  s.bool('braced').bool('postponed').bool('medicineStored');
  s.enum('light','pillar',['pillar','opening'],'日光が当たる場所');
  s.enum('root','growing',['growing','guided','stump','overgrown'],'根の状態');
  s.fact('towardLight','根の白い先端は反射光を追って動く。');

  s.node('entry','garden',residents,when(is('postponed'),
    '荷を解いた住民がハナの薬草棚に集まった。根の白い先は、まだ支柱に落ちる朝日を追っている。次にどうするか、ここで決め直せる。',
    '薬師のハナが棚から鉢を一つ下ろした。頭上で木が鳴る。「下から押してくるんです」。支柱に落ちた朝日の筋へ、太い根が指のように伸びている。住民は鉢を受け取って返事を待った。'),[
    O('brace','天井を調べる','supports',[],repeat),
    O('move','移転を相談','evacuate',[],repeat),
    O('stop','化身と戦う','stump',[set('root','stump')],{combat:'boss_3',combatRequirement:'逃走不可'})
  ]);
  s.node('supports','opening',[],when(is('braced'),
    '明かり取りの両端に、先ほど打った楔が残っている。梁に手を当てても動かない。鏡を置く空間もそのままだ。',
    '明かり取りの縁から砂がこぼれた。根が光へ伸びてここを抜ければ、古い天井ごと持ち上がる。両側の受けに梁を渡し、楔で突っ張る余地がある。'),[
    O('install','梁を固定','light',[set('braced')],{when:not(is('braced'))}),
    O('check','梁を確かめる','light',[],{when:is('braced'),once:false})
  ]);
  s.node('light','opening',[],'楔の頭は梁と面一で、穴の縁は足をかけても沈まない。支柱の光をこちらへ移すには、道具置き場の反射鏡が要る。梁を残して避難の支度に戻ることもできる。',[
    O('guide','鏡を取りに','mirror_rack'),O('evacuate','薬草棚へ戻る','evacuate',[],repeat)
  ]);
  s.node('mirror_rack','rack',[],'道具掛けに、小さな脚の付いた磨き鏡が伏せてある。裏には、朝の日差しで葉を乾かす時に使った角度の印が残っていた。',[
    O('lift','鏡を持つ','mirror_held',[give('mirror','rack','party')])
  ]);
  s.node('mirror_held','rack',[],'鏡を布でくるんだ。光を曲げるには、補強した穴まで運び、朝日が差す高さに脚を立てる必要がある。',[
    O('carry','穴へ運ぶ','align')
  ]);
  s.node('align','opening',[],'梁の上に鏡の脚が届いた。片手で角度を探ると、支柱の光の輪がほどけて穴の内側へ滑る。そこへ光が残るよう、留めねじを締める。',[
    O('aim','鏡を据える','lit',[give('mirror','party','opening'),set('light','opening')])
  ]);
  s.node('lit','opening',[],'光は移った。しばらくすると支柱から白い先端が離れ、穴の縁で光を拾った。梁は鳴らず、根だけが地上の朝へ伸びていく。',[
    O('watch','根を見届ける','@informed',[see('towardLight','opening'),set('root','guided')])
  ]);
  s.node('evacuate','garden',residents,'住民はまだ地下にいる。地上の施療院裏には水の引ける林があるという。「人だけならすぐ。苗床も運ぶなら手を貸してください」とハナが担ぎ棒を差し出した。',[
    O('beds','苗床も運ぶ','packed',[give('beds','garden','party')]),
    O('people','人を先に','people_ready'),O('return','移転を保留','entry',[set('postponed')],repeat)
  ]);
  s.node('packed','garden',residents,'土を崩さずに苗床の箱を担ぎ棒へ縛った。ハナが一行の結び目を引いて確かめ、住民を出口へ並ばせる。箱はまだ一行の手にある。',[
    O('escort','地上へ導く','unload')
  ]);
  s.node('unload','surface',residents,'林で担ぎ棒を肩から下ろす。ハナと住民は地上に着いた。浅く掘った畝に箱を据えれば、地下で育てた薬草の苗がここに根を張れる。',[
    O('plant','苗を下ろす','@compromise',[give('beds','party','surface'),set('root','overgrown')])
  ]);
  s.node('people_ready','garden',residents,'ハナが担ぎ棒を棚へ戻した。苗床を積む時間はない。住民を数え、歩くのが遅い人を先頭にして出口を目指す。',[
    O('escort','地上へ導く','count')
  ]);
  s.node('count','surface',residents,'地上の林で呼び合う声に、一人ずつ返事がある。最後にハナが応え、空の手を開いた。苗床は地下に残した。',[
    O('count','人数を確認','@people',[set('root','overgrown')])
  ]);
  s.node('stump','garden',residents,'化身が倒れ、切り株の年輪から薬になる滴がにじんだ。ハナはまだ空の薬瓶を手にしている。雫を受け、栓をして初めて最後の薬を残せる。',[
    O('bottle','最後の薬を採る','@contract',[set('medicineStored')])
  ]);
  const journey=connectWorld(s,world,1);
  journey('entry_brace','opening');journey('light_guide','rack');journey('light_evacuate','garden');
  journey('mirror_held_carry','opening');journey('packed_escort','surface',{companions:residents});
  journey('people_ready_escort','surface',{companions:residents});
  const atSurface=and(is('hanaAt','surface'),is('residentsAt','surface'));
  const guided=and(is('braced'),is('mirrorAt','opening'),is('light','opening'),s.known('towardLight'));
  s.story.endings={
    informed:and(is('root','guided'),guided),contract:and(is('root','stump'),is('medicineStored')),
    compromise:and(atSurface,is('bedsAt','surface'),is('root','overgrown')),
    people:and(atSurface,is('bedsAt','garden'),is('root','overgrown'))
  };
  const implies=(id,a,b,msg)=>s.invariant(id,or(not(a),b),msg);
  implies('light-source',is('light','opening'),and(is('braced'),is('mirrorAt','opening')),'固定した鏡が補強済みの穴へ光を送る');
  implies('guided',is('root','guided'),guided,'光を移して根が追ったことを確かめる');
  implies('bottle',is('medicineStored'),is('root','stump'),'化身を倒した後の切り株から採薬する');
  implies('nursery',is('bedsAt','surface'),atSurface,'苗床は住民とともに地上へ運んでから降ろす');
  implies('departure',is('root','overgrown'),atSurface,'住民が逃げ切ってから庭を根に渡す');
  for(const scene of Object.values(s.story.scenes))for(const [i,cast] of scene.cast.entries()){
    cast.when=is(cast.entity+'At',scene.place);
    cast.display={x:i===0?32:68,y:10,scale:1,cardScale:1,layer:i};
  }
  return s.done();
}
