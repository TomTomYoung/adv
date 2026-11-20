import {story,O,set,give,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

// The wounded gatherer, medicine, litter and the two observed fever stages are independent.
const places={
  bedside:'薬師と眠る採集者のいる現場',
  wash:'傷を洗い検温する足場',
  spore:'胞子の主がいる菌床',
  litter:'担架への移乗場所',
  clinic:'灯帰りの治療所'
};
const dungeon=(key,x,y)=>({kind:'dungeon',dungeon:'region_3',map:'region_3_f1',x,y,event:'q022_green_sleep_'+key});
const world={
  bedside:dungeon('bedside',11,9),
  wash:dungeon('wash',11,7),
  spore:dungeon('spore',9,6),
  litter:dungeon('litter',9,7),
  clinic:{kind:'town',location:'hikarigaeri_medical'}
};
const roles={
  hana:['薬師のハナ','採集者の傷と胞子による治療反応を観察する'],
  patient:['採集者','傷が回復し、無理なく帰路につく']
};
export const greenSleepCharacters=Object.fromEntries(Object.entries(roles).map(([key,[name,goal]])=>{
  const id='e2_green_sleep_'+key;
  return [id,{id,name,goal,quests:key==='hana'?['q022','q030']:['q022'],detail:goal}];
}));

export function greenSleepSource(){
  const s=story(22,places,[]);
  s.enum('patientMobility','immobile',['immobile','assisted','mobile']);
  s.enum('route','pending',['pending','care','carry','force']);
  s.int('round',0,0,2,'傷の処置を終えてから観察した検温の回数');
  s.entity('hana','bedside','e2_green_sleep_hana')
    .entity('patient','bedside','e2_green_sleep_patient',{mobility:'patientMobility'});
  s.entity('stretcher','bedside').entity('bandage','hana')
    .entity('sporeSample','patient').entity('treatmentLog','hana');
  for(const key of [
    'patientOnStretcher','woundClean','woundDressed','guardianDefeated',
    'healingInterrupted','spontaneousAwake','patientAwake','sporesSampled',
    'feverReturned','clinicReceived','recoveryNoted','recorded'
  ])s.bool(key);
  const both=['hana','patient'];
  s.node('entry','bedside',both,
    '薬草を採りに行った人が深く眠っている。額は冷たいが、腕には深い傷があった。胞子は傷の周辺だけへ集まる。薬師ハナは担架と包帯を持っている。「眠りを毒と決めつけず、傷と熱の変化を見よう」。',[
      O('dress','ハナと採集者を洗浄足場へ移し、傷を先に処置する','wash_site'),
      O('wake','胞子の主を追い払うため菌床へ向かう','spore_stage'),
      O('carry','眠ったまま担架で運び、原因を断定せず治療所へ移す','litter_site')
    ]);
  s.node('wash_site','wash',both,
    '患者を担架に載せて洗浄足場へ移した。深い傷が包帯の下でどう変わるかを確かめる。傷はまだ洗われていない。',[
      O('clean','ハナと傷を洗い、異物が残っていないか確かめる','washed',[set('woundClean')])
    ]);
  s.node('washed','wash',both,
    '洗った傷の縁はまだ熱を持つ。ハナが包帯を取り出した。胞子は払わずに残し、包帯と傷を続けて観察する。',[
      O('bandage','傷へ包帯を巻き、最初の体温と呼吸を記録する','watch',[
        give('bandage','hana','patient'),set('woundDressed'),set('round',0)
      ])
    ]);
  s.node('watch','wash',both,[
    when(s.is('round',0),
      '最初の検温では包帯に血が滲んでいる。胞子を払わず、患者の呼吸と熱を確かめた。',
      when(s.is('round',1),
        '次の検温では熱が下がり、傷口が閉じ始めた。ハナは「胞子が傷の熱を引かせているんです」と説明した。',
        '二度目の経過観察で傷の熱が引き、胞子が自分から離れた。本人の指が動いている。')),
    '自然に目が覚めるまで見届けるか、眠ったまま担架で治療所へ搬送するかを選べる。'
  ],[
      O('observe','次の検温まで付き添い、傷と胞子の変化を記録する','watch',[
        set('round',{op:'add',args:[s.v('round'),1]})
      ],{once:false,when:{op:'lt',left:s.v('round'),right:2}}),
      O('awake','二度の観察を終え、本人が自然に目を開けるまで待つ','awoke',[
        set('spontaneousAwake'),set('patientAwake'),set('patientOnStretcher',false),give('stretcher','patient','hana')
      ],{when:s.is('round',2)}),
      O('transport','自然覚醒を待たず、今の治療記録で担架搬送を申し出る','litter_site')
    ]);
  s.node('awoke','wash',both,
    '患者は自分で目を開け、ハナの問いに答えた。胞子は離れ、傷の熱は下がっている。帰路では一人にせず、支えて歩く。',[
      O('escort','本人を支えながら治療所へ案内する','clinic_awake')
    ]);
  s.node('clinic_awake','clinic',both,
    '採集者は隊に肩を借りて歩き、治療所の椅子に腰を下ろした。ハナは二回の検温の記録を開き、採集袋に結ぶ札を取り出した。',[
      O('finish','ハナと診療記録を閉じ、採集袋に「治療中」の札を結ぶ','@informed',[
        set('clinicReceived'),set('recoveryNoted'),set('recorded')
      ])
    ]);
  s.node('litter_site','litter',both,
    when(s.is('woundDressed'),
      '包帯を巻き、検温を続けていた患者を担架の乗降位置へ運んだ。自然に目覚めたわけではないが、治療は続けられる。',
      '患者は眠ったまま担架の位置へ運ばれた。原因を断定せず、傷の状態と周囲の胞子を残して記録する。'),[
      O('sample','患者の近くで採取した胞子をハナへ渡し、搬送前の状態を記録する','sampled',[
        give('sporeSample','patient','hana'),set('sporesSampled')
      ])
    ]);
  s.node('sampled','litter',both,
    'ハナが密閉した採取袋を受け取り、患者の状態を記録した。本人はまだ眠っている。担架を倒さないよう、隊とハナで治療所まで運ぶ。',[
      O('clinic','担架で患者を治療所へ運び、ハナへ引き継ぐ','clinic_asleep')
    ]);
  s.node('clinic_asleep','clinic',both,
    '患者は眠ったまま治療所に着いた。ハナは現場で採った胞子と、包帯を巻いたかどうか、観察を何回したかを一緒に預かった。眠りが毒だとは断定しない。',[
      O('finish','診療記録へ未覚醒の搬送と胞子試料の引渡しを記す','@compromise',[
        set('clinicReceived'),set('recorded')
      ])
    ]);
  s.node('spore_stage','spore',[],
    '採集者の近くへ胞子を送る菌床に、二体の守護者がいる。これを倒しても患者の傷が治ったわけではない。退くか敗北したら菌床はそのままだ。',[
      O('fight','二体の守護者を倒して胞子の主のいる区画を抑える','guardian_down',[
        set('guardianDefeated')
      ],{combat:'guard_3'})
    ]);
  s.node('guardian_down','spore',[],
    '守護者は倒れたが、患者はまだ眠っている。胞子を取り除き無理に起こすのかどうかは、患者のいる場所で判断する。',[
      O('return','眠った採集者のもとへ戻る','force_ready')
    ]);
  s.node('force_ready','bedside',both,
    '胞子が傷を包む範囲はまだ残っている。ハナは患者の胸と腕を押さえて「傷の熱が戻るおそれがある」と警告した。',[
      O('wake','傷の周囲から胞子を払い、眠る患者を起こす','forced_awake',[
        set('healingInterrupted'),set('patientAwake'),set('patientMobility','assisted')
      ])
    ]);
  s.node('forced_awake','bedside',both,
    '採集者は目を開けたが、傷はまだ十分に閉じていない。ハナと隊が腕を支え、治療所まで歩けるようにする。',[
      O('escort','ハナと傷を支え、患者と治療所へ戻る','clinic_force')
    ]);
  s.node('clinic_force','clinic',both,
    '採集者は歩いて治療所に着いた。ハナはまだ閉じきっていない傷に触れ、熱が戻っていないか確かめた。胞子を排除した結果を記録する。',[
      O('report','患者が歩いて帰り、傷の熱が戻ったことを確認する','@contract',[
        set('feverReturned'),set('clinicReceived'),set('recorded')
      ])
    ]);
  const journey=connectWorld(s,world,1);
  journey('entry_dress','wash',{companions:both,depart:[
    set('route','care'),give('stretcher','bedside','patient'),
    set('patientOnStretcher'),set('patientMobility','assisted')
  ]});
  journey('entry_carry','litter',{companions:both,depart:[
    set('route','carry'),give('stretcher','bedside','patient'),
    set('patientOnStretcher'),set('patientMobility','assisted')
  ]});
  journey('entry_wake','spore',{depart:[set('route','force')]});
  journey('watch_transport','litter',{companions:both});
  journey('awoke_escort','clinic',{companions:both});
  journey('sampled_clinic','clinic',{companions:both});
  journey('guardian_down_return','bedside');
  journey('forced_awake_escort','clinic',{companions:both});
  s.story.endings={
    informed:and(s.is('route','care'),s.is('woundClean'),s.is('woundDressed'),s.is('round',2),
      s.is('spontaneousAwake'),s.is('patientAwake'),s.is('clinicReceived'),s.is('recoveryNoted'),
      s.is('patientAt','clinic'),s.is('recorded'),not(s.is('guardianDefeated'))),
    compromise:and(or(s.is('route','care'),s.is('route','carry')),s.is('sporesSampled'),
      s.is('sporeSampleAt','hana'),s.is('patientOnStretcher'),s.is('patientAt','clinic'),
      s.is('clinicReceived'),not(s.is('patientAwake')),s.is('recorded')),
    contract:and(s.is('route','force'),s.is('guardianDefeated'),s.is('healingInterrupted'),
      s.is('patientAwake'),s.is('feverReturned'),s.is('patientAt','clinic'),s.is('clinicReceived'),
      s.is('recorded'),not(s.is('spontaneousAwake')))
  };
  const implies=(key,condition,message)=>s.invariant(key,or(not(s.is(key)),condition),message);
  implies('woundDressed',and(s.is('woundClean'),s.is('bandageAt','patient')),'傷を洗ってから包帯を巻く');
  implies('patientOnStretcher',and(s.is('stretcherAt','patient'),s.is('patientMobility','assisted')),'眠る患者の担架と介助状態を保つ');
  implies('spontaneousAwake',and(s.is('woundDressed'),s.is('round',2),s.is('patientAwake')),'二度の検温を経て自発的に覚醒する');
  implies('guardianDefeated',s.is('route','force'),'胞子の主との戦闘は強行経路だけ');
  implies('healingInterrupted',and(s.is('guardianDefeated'),s.is('patientAwake')),'守護者排除後に胞子の治療を中断して起こす');
  implies('feverReturned',and(s.is('healingInterrupted'),s.is('patientAt','clinic')),'傷の熱が戻ったのは強行覚醒後の帰還時');
  implies('sporesSampled',s.is('sporeSampleAt','hana'),'眠ったまま搬送する経路で胞子の試料を預ける');
  implies('recoveryNoted',and(s.is('spontaneousAwake'),s.is('clinicReceived')),'自然覚醒を見届けて治療所で記録する');
  s.invariant('exclusive-awakening',or(not(s.is('spontaneousAwake')),not(s.is('healingInterrupted'))),'自然覚醒と強行覚醒を同時に確定しない');
  s.invariant('round-limit',or(not(s.is('spontaneousAwake')),s.is('round',2)),'自然覚醒前に二度の経過観察が必要');
  for(const scene of Object.values(s.story.scenes))scene.cast.forEach((cast,i)=>{
    cast.when=s.is(cast.entity+'At',scene.place);
    cast.display={x:scene.cast.length===2?[30,70][i]:50,y:10,scale:1,cardScale:1,layer:i};
  });
  return s.done();
}
