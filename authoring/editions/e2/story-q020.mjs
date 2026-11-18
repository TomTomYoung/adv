import {story,O,set,give,move,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

// q020: the duty token, the keys and the monitoring book are three actual objects.
// Each change of custody is a single action; travel never transfers them implicitly.
const places={
  barrier:'予備出口の防柵と番兵',
  mouth:'予備出口・地上側の支柱',
  deep:'予備出口・奥の危険支柱',
  branch:'閉鎖対象の枝坑',
  patrol:'閉鎖監視の巡回地点',
  registry:'坑道組合の交代受付',
  surface:'廃坑・地上の搬出口',
  archive:'坑道組合の監視記録資料室',
  danger:'補修前の危険坑道'
};
const dungeon=(key,x,y)=>({kind:'dungeon',dungeon:'region_2',map:'region_2_f2',x,y,event:'q020_crown_'+key});
const world={
  barrier:dungeon('barrier',17,3),
  mouth:dungeon('mouth',17,1),
  deep:dungeon('deep',11,1),
  branch:dungeon('branch',17,9),
  patrol:dungeon('patrol',17,7),
  registry:{kind:'town',location:'e2_crown_registry'},
  surface:{kind:'town',location:'e2_cart_surface'},
  archive:{kind:'town',location:'e2_crown_archive'}
};
export function extendCrownGeography(bundle){
  const locations={
    e2_crown_registry:{
      name:'坑道組合・予備出口交代受付',parent:'e2_cart_surface',
      description:'予備出口の閉鎖監視、交代時刻、鍵の受領を記入する窓口。申出と正式受理は別の欄で扱う。'
    },
    e2_crown_archive:{
      name:'坑道組合・監視記録資料室',parent:'e2_crown_registry',
      description:'閉鎖・補修・人数制限の記録を保管する資料室。職責標、監視簿、鍵は役目が終わってから預かる。'
    }
  };
  for(const [id,location] of Object.entries(locations))
    bundle.additions.locations[id]={id,...location,background:'location_guild',links:[]};
}
const roles={
  keeper:['廃坑の王と呼ばれる責任者','引継ぎの成立まで防柵と崩落監視を守る'],
  clerk:['坑道組合の受付係','交代の受理と補修後の通行制限を記録する'],
  guards:['組合の番兵二体','組合の交代表と防柵を守る']
};
export const crownCharacters=Object.fromEntries(Object.entries(roles).map(([key,[name,goal]])=>{
  const id='e2_crown_'+key;
  return [id,{id,name,goal,quests:['q020'],detail:'坑道組合の予備出口に関わる人物または番兵。専用人物画像のない役は名前で表示する。'}];
}));

export function crownSource(){
  const s=story(20,places,[['barrier','danger']]);
  s.entity('keeper','barrier','e2_crown_keeper')
    .entity('clerk','registry','e2_crown_clerk')
    .entity('guards','barrier','e2_crown_guards',{kind:'group'});
  s.entity('crown','keeper').entity('keys','keeper')
    .entity('monitorBook','keeper').entity('repairPlan','keeper')
    .entity('register','clerk');
  for(const key of [
    'handoverRequested','handoverAccepted','handoverCompleted','shiftHeld',
    'keysHeld','recordsHeld','entranceInspected','deepInspected','supportsChecked',
    'entranceBraced','deepRepaired','branchesClosed','exitOpen','limitedTraffic',
    'roleEnded','recordUpdated','dayServed','recruitsSought','guardsDefeated'
  ])s.bool(key);
  s.enum('formerAt','barrier',['barrier','ground','dangerTunnel']);
  s.enum('opening','closed',['closed','limited','forced']);
  const atGuard=['keeper','guards'];
  const atRegistry=['clerk'];
  s.node('entry','barrier',atGuard,
    '地上へ続く予備出口の防柵には、組合が置いた番兵二体がいる。冠形の職責標を持った責任者が傷んだ支柱を示す。「交代者か補修計画が決まるまで、人をまとめて通せない」。坑夫のメルは同行せず、代表への依頼書を隊に預けている。',[
      O('relieve','組合へ交代の申出を届ける','register_request'),
      O('supports','責任者と地上側の入口から支柱を調べる','guided_mouth'),
      O('fight','番兵二体と戦って防柵を破る','guards_down',[set('guardsDefeated')],{combat:'boss_2'})
    ]);
  s.node('register_request','registry',atRegistry,
    '交代表は前任者の名で止まっている。係員が監視範囲と引継ぎ時刻を確かめた。「申し出ただけでは責任者は帰せません。受付印を押したあと、現地で王冠と鍵、監視簿を受け取ってください」。',[
      O('accept','交代者と監視時刻を正式登録し、受理印を受ける','accepted',[set('handoverAccepted')])
    ]);
  s.node('accepted','registry',atRegistry,
    '係員は交代の受理欄に印を押した。責任者はまだ防柵におり、王冠・鍵・監視簿はその手元に残っている。',[
      O('return','受理票を持って防柵の責任者へ戻る','handover_site')
    ]);
  s.node('handover_site','barrier',atGuard,
    '受付の印を見て番兵が槍を下げた。責任者は王冠、予備出口の鍵、監視簿、補修図をそれぞれ並べる。記録が受理されても、まだ品物は渡されていない。',[
      O('receive','王冠・鍵・監視簿・補修図を現物で引き継ぐ','received',[
        give('crown','keeper','party'),give('keys','keeper','party'),
        give('monitorBook','keeper','party'),give('repairPlan','keeper','party'),
        set('shiftHeld'),set('keysHeld'),set('recordsHeld'),set('handoverCompleted')
      ])
    ]);
  s.node('received','barrier',atGuard,
    '四つの現物は隊の手元にある。責任者が交代欄の署名を確かめた。「地上で眠ってもいいか」。防柵は閉じたまま、番兵は正式な交代者に従う。',[
      O('escort','前任者を地上の搬出口まで見送り、休息を確かめる','rested')
    ]);
  s.node('rested','surface',['keeper'],
    '前任者は地上の詰所で横になった。防柵の監視は交代者の責任になり、鍵と記録は隊が預かっている。メルの依頼書には「明日の人員」か「補修で役目を終えるか」を選ぶ欄がある。',[
      O('recruit','閉鎖監視の一日分の巡回を引き受ける','watch_start'),
      O('repair','引き継いだ図と記録を手に、入口から補修箇所を調べる','solo_mouth')
    ]);
  s.node('guided_mouth','mouth',['keeper'],
    '責任者と防柵の上手へ歩いた。地上側の入口では支柱が沈み、補修前に奥へ入る者の退路を狭めている。',[
      O('inspect','入口の支柱と退路を点検し、奥の危険区画へ進む','guided_deep')
    ]);
  s.node('guided_deep','deep',['keeper'],
    '責任者が亀裂のある奥の支柱を示す。入口側を先に支え、ここを交換した後で不要な枝坑を閉じる図だ。責任者はまだ王冠と鍵を持っている。',[
      O('measure','入口と奥の調査結果を記録し、防柵へ戻る','guided_back')
    ]);
  s.node('guided_back','barrier',atGuard,
    '入口と奥の支柱を調べ終えた。責任者は防柵で待つ。ここから補修を始めるか、先に交代を正式登録するかを決める。',[
      O('brace','入口側から補修を始める','brace_mouth'),
      O('shift','補修を延期し、組合で一日の交代を申し出る','register_request')
    ]);
  s.node('solo_mouth','mouth',[],
    '受理済みの交代記録と補修図を読み合わせる。前任者は地上で休んでおり、調査のために呼び戻さない。まず地上側の支柱を点検する。',[
      O('inspect','入口の支柱と退路を点検して奥へ進む','solo_deep')
    ]);
  s.node('solo_deep','deep',[],
    '補修図と記録の寸法を実際の支柱に合わせる。入口が沈んだままでは奥の支柱を交換できない。',[
      O('measure','奥の支柱を点検し、図に調査結果を記して防柵へ戻る','solo_back')
    ]);
  s.node('solo_back','barrier',['guards'],
    '調査結果を記録した。前任者は地上に残り、王冠と鍵はすでに隊にある。補修を実施するか、一日分の監視を続けるかを決める。',[
      O('brace','入口側から補修を始める','brace_mouth'),
      O('shift','閉鎖を維持して一日分の巡回へ進む','watch_start')
    ]);
  s.node('watch_start','patrol',[],
    '防柵は閉じている。交代者は記録の時刻に合わせて足場と支柱を巡回し、異常を監視簿に書く。',[
      O('patrol','閉鎖したまま一日分の監視と巡回を終える','watch_done',[set('dayServed')])
    ]);
  s.node('watch_done','patrol',[],
    '監視簿には一日分の時刻と点検結果が記入された。予備出口は未補修で、一般の通行には使えない。',[
      O('report','監視記録を持って組合の受付へ戻る','recruit_desk')
    ]);
  s.node('recruit_desk','registry',atRegistry,
    '係員が一日分の監視簿を読んだ。メルからは次の交代者を募るための案内が届いている。補修費用はまだ決まらない。',[
      O('recruit','翌日以降の短時間交代を募り、閉鎖を維持して報告する','@compromise',[set('recruitsSought')])
    ]);
  s.node('brace_mouth','mouth',[],
    '地上側の入口に戻った。補修図の最初の欄はここだ。奥へ進む前に支柱を補強し、退路を確保する。',[
      O('brace','入口側の支柱を据え直し、固定と退路を確認する','braced',[set('entranceBraced')])
    ]);
  s.node('braced','mouth',[],
    '入口の支柱は固定されたが、奥の支柱と枝坑は危険なままだ。防柵はまだ開けられない。',[
      O('deep','補修図を持って奥の危険支柱へ進む','repair_deep')
    ]);
  s.node('repair_deep','deep',[],
    '入口側の補強が退路を支えている。奥の傷んだ支柱を交換し、荷重が新しい材へ渡るのを確かめる。',[
      O('replace','奥の危険支柱を交換し、取り付けと荷重を確認する','repaired',[set('deepRepaired')])
    ]);
  s.node('repaired','deep',[],
    '奥の危険支柱を交換した。枝坑が開いたままでは補修した出口へ人が集まるため、不要な枝坑の閉鎖が必要だ。',[
      O('branch','不要な枝坑の分岐まで歩く','close_branch')
    ]);
  s.node('close_branch','branch',[],
    '使わない枝坑の奥に古い通行札が残る。ここを塞いで立入り禁止範囲を分ける。',[
      O('seal','枝坑を閉鎖し、通行札と封鎖位置を記録する','sealed',[set('branchesClosed')])
    ]);
  s.node('sealed','branch',[],
    '地上側、奥の支柱、枝坑の処置が別々に記録できた。まだ防柵そのものは閉じている。',[
      O('return','防柵へ戻り、人数制限の下で開放してよいか確認する','open_check')
    ]);
  s.node('open_check','barrier',atGuard,
    '補修図の三つの欄に施工印がある。番兵は防柵を開ける前に、通行人数と閉鎖区画の境界を確認した。職責標の保持者は交代済みかどうかで異なる。',[
      O('open_keeper','責任者から現物を預かり、人数制限付き避難路を開ける','open_with_keeper',[
        give('crown','keeper','party'),give('keys','keeper','party'),
        give('monitorBook','keeper','party'),give('repairPlan','keeper','party'),
        set('exitOpen'),set('limitedTraffic'),set('opening','limited')
      ],{when:not(s.is('shiftHeld'))}),
      O('open_shifted','預かっている鍵と記録で人数制限付き避難路を開ける','open_shifted',[
        set('exitOpen'),set('limitedTraffic'),set('opening','limited')
      ],{when:s.is('shiftHeld')})
    ]);
  s.node('open_with_keeper','barrier',['keeper'],
    '安全を確かめた防柵は、人数制限付き避難路として開いた。責任者から預かった王冠と記録を返納し、常駐の役目を終わらせる手続が残っている。',[
      O('escort','責任者を組合の交代受付まで送り、閉鎖終了を届ける','archive_register')
    ]);
  s.node('open_shifted','barrier',[],
    '入口と奥、枝坑の補修を終え、人数制限付きで防柵を開けた。前任者は地上で休んでいる。交代時に引き継いだ現物と記録を返納する。',[
      O('file','閉鎖監視の終了を届けに組合へ行く','archive_register')
    ]);
  s.node('archive_register','registry',atRegistry,
    '係員が三つの補修記録と人数制限を確認する。王冠を返納する前に、交代表を終わらせる記録を作らなければならない。',[
      O('record','補修内容・通行人数・閉鎖終了日を登録する','recorded',[set('recordUpdated')])
    ]);
  s.node('recorded','registry',atRegistry,
    '終了の記録が受理された。王冠・鍵・監視簿はまだ隊の手元にあり、隣の資料室の預かり簿は空白だ。',[
      O('archive','王冠・鍵・監視簿と補修図を資料室へ運ぶ','archive_site')
    ]);
  s.node('archive_site','archive',[],
    '資料室の棚には職責標と監視簿を別々に収める場所がある。閉鎖終了の受理印を照合し、現物四点を預ける。',[
      O('deposit','王冠・鍵・監視簿・補修図を納め、常駐の役目の終了を確定する','@informed',[
        give('crown','party','archive'),give('keys','party','archive'),
        give('monitorBook','party','archive'),give('repairPlan','party','archive'),
        set('keysHeld',false),set('recordsHeld',false),set('roleEnded')
      ])
    ]);
  s.node('guards_down','barrier',['keeper'],
    '二体の番兵が倒れた。防柵はまだ閉じ、支柱は補修されていない。責任者は崩落を警告しようと王冠を握った。',[
      O('break','防柵を破って出口を開き、責任者が危険坑道へ戻るのを見届ける','breached',[
        set('exitOpen'),set('opening','forced'),
        move('keeper','barrier','danger'),set('formerAt','dangerTunnel')
      ])
    ]);
  s.node('breached','barrier',[],
    '防柵は破られ、人は通れる。しかし支柱の危険は残り、通行人数も管理されない。王冠と監視簿は責任者が持ったまま危険坑道へ戻った。',[
      O('finish','補修なしの強行開放として報告する','@contract')
    ]);

  const journey=connectWorld(s,world,1);
  const travel=(action,to,options={})=>journey(action,to,options);
  travel('entry_relieve','registry',{depart:[set('handoverRequested')]});
  travel('entry_supports','mouth',{companions:['keeper']});
  travel('accepted_return','barrier');
  travel('received_escort','surface',{companions:['keeper'],arrive:[set('formerAt','ground')]});
  travel('rested_recruit','patrol');
  travel('rested_repair','mouth');
  travel('guided_mouth_inspect','deep',{companions:['keeper'],depart:[set('entranceInspected')]});
  travel('guided_deep_measure','barrier',{companions:['keeper'],depart:[set('deepInspected'),set('supportsChecked')]});
  travel('guided_back_brace','mouth');
  travel('guided_back_shift','registry',{depart:[set('handoverRequested')]});
  travel('solo_mouth_inspect','deep',{depart:[set('entranceInspected')]});
  travel('solo_deep_measure','barrier',{depart:[set('deepInspected'),set('supportsChecked')]});
  travel('solo_back_brace','mouth');
  travel('solo_back_shift','patrol');
  travel('watch_done_report','registry');
  travel('braced_deep','deep');
  travel('repaired_branch','branch');
  travel('sealed_return','barrier');
  travel('open_with_keeper_escort','registry',{companions:['keeper'],arrive:[set('formerAt','ground')]});
  travel('open_shifted_file','registry');
  travel('recorded_archive','archive');

  s.story.endings={
    compromise:and(s.is('shiftHeld'),s.is('keysHeld'),s.is('recordsHeld'),s.is('dayServed'),s.is('recruitsSought'),not(s.is('exitOpen'))),
    informed:and(s.is('entranceBraced'),s.is('deepRepaired'),s.is('branchesClosed'),s.is('limitedTraffic'),s.is('roleEnded'),s.is('crownAt','archive'),s.is('monitorBookAt','archive')),
    contract:and(s.is('guardsDefeated'),s.is('exitOpen'),s.is('opening','forced'),s.is('crownAt','keeper'),not(s.is('entranceBraced')))
  };
  const implies=(name,condition,message)=>s.invariant(name,or(not(s.is(name)),condition),message);
  s.invariant('custody',and(s.is('crownAt',s.v('keysAt')),s.is('keysAt',s.v('monitorBookAt'))),'王冠・鍵・監視簿は同じ責任者または保管者の下にある');
  implies('handoverAccepted',s.is('handoverRequested'),'受理より前に交代の申出が必要');
  implies('handoverCompleted',and(s.is('handoverAccepted'),s.is('shiftHeld'),or(s.is('crownAt','party'),s.is('crownAt','archive'))),'交代表を受理し、現物を渡してから交代が成立する');
  implies('shiftHeld',s.is('handoverCompleted'),'正式な引継ぎがなければ交代は成立しない');
  implies('supportsChecked',and(s.is('entranceInspected'),s.is('deepInspected')),'入口と奥を両方点検してから補修図を確定する');
  implies('deepRepaired',s.is('entranceBraced'),'退路を確保してから奥の支柱を交換する');
  implies('branchesClosed',s.is('deepRepaired'),'奥の補修が済んでから枝坑を閉じる');
  implies('limitedTraffic',and(s.is('entranceBraced'),s.is('deepRepaired'),s.is('branchesClosed'),s.is('exitOpen'),s.is('opening','limited')),'三段階の補修後にだけ制限付きで通行できる');
  implies('recordUpdated',and(s.is('limitedTraffic'),s.is('opening','limited')),'開放を確認してから閉鎖終了を記録する');
  implies('roleEnded',and(s.is('recordUpdated'),s.is('crownAt','archive'),s.is('keysAt','archive'),s.is('monitorBookAt','archive')),'記録受理と王冠・鍵・監視簿の現物預託で役目を終える');
  implies('dayServed',and(s.is('shiftHeld'),not(s.is('exitOpen'))),'一日の当番中は防柵を閉じたままにする');
  implies('recruitsSought',s.is('dayServed'),'実際の巡回を済ませてから後任を募る');
  s.invariant('opening',or(
    and(s.is('opening','closed'),not(s.is('exitOpen'))),
    and(s.is('opening','limited'),s.is('limitedTraffic'),s.is('exitOpen'),not(s.is('guardsDefeated'))),
    and(s.is('opening','forced'),s.is('guardsDefeated'),s.is('exitOpen'),not(s.is('limitedTraffic')))
  ),'閉鎖・安全な制限開放・強行開放を別の状態として保持する');
  s.invariant('former',or(
    and(s.is('formerAt','barrier'),or(...['barrier','mouth','deep','transit'].map(p=>s.is('keeperAt',p)))),
    and(s.is('formerAt','ground'),or(...['surface','registry','transit'].map(p=>s.is('keeperAt',p)))),
    and(s.is('formerAt','dangerTunnel'),s.is('keeperAt','danger'))
  ),'責任者の所在と交代・撤退状態が一致する');
  for(const scene of Object.values(s.story.scenes))scene.cast.forEach((cast,i)=>{
    cast.when=s.is(cast.entity+'At',scene.place);
    cast.display={x:scene.cast.length===2?[30,70][i]:50,y:10,scale:1,cardScale:1,layer:i};
  });
  return s.done();
}
