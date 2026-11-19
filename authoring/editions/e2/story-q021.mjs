import {story,O,set,give,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

// Seed custody, germination, observation and landowner consent are separate events.
const sites={
  rack:['ユイの種棚と保管簿',10,10],
  trail:['羽根の落ちた通り道',7,1],
  crack:['光の差す亀裂',11,4],
  nest:['巣の魔物が守る棚',15,13],
  bed:['亀裂の隣の育苗床',11,3]
};
const places=Object.fromEntries(Object.entries(sites).map(([key,[name]])=>[key,name]));
const world=Object.fromEntries(Object.entries(sites).map(([key,[,x,y]])=>
  [key,{kind:'dungeon',dungeon:'region_3',map:'region_3_f1',x,y,event:'q021_seed_bird_'+key}]));
export const seedBirdCharacters=Object.fromEntries([
  ['gardener','庭師のユイ','畑の種を戻し、発芽した苗を育てる'],
  ['bird','種を運ぶ鳥','光の差す亀裂へ種を運んで発芽させる']
].map(([key,name,goal])=>{
  const id='e2_seed_bird_'+key;
  return [id,{id,name,goal,quests:['q021'],detail:'根喰みの地下庭園の種と育苗をめぐる役。専用画像のない人物・鳥は名前で表示する。'}];
}));

export function seedBirdSource(){
  const s=story(21,places,[]);
  s.entity('gardener','rack','e2_seed_bird_gardener')
    .entity('bird','crack','e2_seed_bird_bird');
  s.entity('looseSeeds','crack')
    .entity('seedlings','crack')
    .entity('nestSeeds','nest')
    .entity('bedMaterials','rack')
    .entity('seedLedger','gardener');
  for(const key of [
    'trailFound','crackFound','watched','marked','gardenerAgreed',
    'halfRecovered','bedsPrepared','birdShareReserved','recorded',
    'nestVisited','guardsDefeated','nestRecovered','sproutsRemoved','allRecovered'
  ])s.bool(key);
  const yui=['gardener'],atCrack=['bird'],both=['bird','gardener'];
  s.node('entry','rack',yui,
    '種棚の袋は毎朝軽くなる。庭師のユイは網を手に、鳥が一粒くわえて飛ぶのを見た。「食べられたのか、運び去られたのかも分からない。持ち帰れる種と育てる種を確かめてほしい」。種の数を記す保管簿はここに置く。',[
      O('follow','鳥を捕まえず、羽根の落ちた通り道をたどる','trail'),
      O('nest','巣の魔物を追い払い、種を全て回収するため巣へ向かう','nest_before')
    ]);
  s.node('trail','trail',[],
    '羽根が奥の通路の壁際に落ちていた。食べ殻は見当たらない。何度も行き来した足跡が、光の差す亀裂の方へ続く。',[
      O('track','羽根と足跡の向きを確かめ、亀裂へ向かう','crack')
    ]);
  s.node('crack','crack',atCrack,[
    when(s.is('watched'),
      'もう一羽も、くわえた種を光のある土へ置いた。食べ殻は見つからず、運搬先は同じだった。',
      '鳥は種を食べず、亀裂の光へ運んで土に埋めている。すでに芽を出した粒があり、まだ埋まっていない粒も残っている。'),
    '芽を残し、植えられていない分だけ戻すか、育苗する土地としてユイと決めることができる。'
  ],[
      O('wait','もう一度、次の鳥の運搬を見届ける','crack',[set('watched')],{when:not(s.is('watched'))}),
      O('half','新芽を残し、埋まっていない種を半分だけ回収する','half_carried',
        [give('looseSeeds','crack','party'),set('halfRecovered')]),
      O('mark','新芽の位置と光の当たる場所を標示する','marked',[set('marked')])
    ]);
  s.node('marked','crack',atCrack,
    '芽の位置と光の当たる範囲を標示した。標示は工事の完成ではない。種の所有者であるユイに、苗と鳥の分をどう扱うか確かめる。',[
      O('consult','標示した場所をユイへ知らせ、種棚へ戻る','consult')
    ]);
  s.node('consult','rack',yui,when(s.is('watched'),
    '二度の運搬の記録と標示図をユイが読む。「食べたわけじゃないのね。苗を残して育てるか、まだ埋まっていない種だけ返してもらおう」。',
    'ユイが光の位置と芽の標示を確かめた。「鳥が運んだ分も生かす方法を選びたい。育苗床を作るか、種を半分戻すか」。'),[
      O('beds','亀裂の隣に育苗床を作り、鳥と苗の持分を残す','bed_work'),
      O('half','設備を作らず、芽を残して未植付け分だけ返す','half_marked_site')
    ]);
  s.node('half_marked_site','crack',atCrack,
    'ユイが了承した範囲に印が残る。芽を掘り返さず、まだ土に入っていない種だけ選んで袋に収める。',[
      O('collect','未植付けの種を半分回収し、芽を亀裂に残す','half_carried',
        [give('looseSeeds','crack','party'),set('halfRecovered')])
    ]);
  s.node('half_carried','crack',atCrack,
    '新芽は亀裂で育ち続けている。隊の袋には、土に入っていなかった種だけがある。ユイの種棚に戻して、帳簿の記載を確かめる。',[
      O('return','回収した種をユイの種棚へ運ぶ','half_home')
    ]);
  s.node('half_home','rack',yui,when(s.is('marked'),
    'ユイは標示図を脇に置き、半分の種袋の数を確かめた。育苗床は作らず、亀裂の芽をそのまま残す。',
    'ユイは戻った種袋を数えた。亀裂の芽はそのまま残され、持分を分けるための記帳が必要だ。'),[
      O('deliver','回収分をユイに現物で渡し、残した芽と今後の記帳を確定する','@compromise',
        [give('looseSeeds','party','gardener'),set('recorded')])
    ]);
  s.node('bed_work','bed',yui,
    '亀裂の隣は光の届く狭い土だ。ユイと持ち込んだ資材を並べ、鳥が使う通り道を塞がない位置を決める。材料はまだ隊が持っている。',[
      O('build','土を整え、資材を固定して育苗床を作る','built',
        [give('bedMaterials','party','bed'),set('bedsPrepared')])
    ]);
  s.node('built','bed',yui,
    '育苗床の枠は完成した。まだ鳥の運んだ種の置き場と新芽の数を確認していない。ユイとすぐ隣の亀裂を確かめる。',[
      O('crack','ユイと亀裂へ移り、鳥の分と芽を確認する','nursery_check')
    ]);
  s.node('nursery_check','crack',both,
    '鳥は光のある土へ種を置き、新芽は元の場所で育っている。ユイは育苗床で育てる苗を選び、鳥が運ぶ分を残すよう印を付けた。',[
      O('reserve','鳥が使う分と芽を残す区域を確定する','bird_reserved',[set('birdShareReserved')])
    ]);
  s.node('bird_reserved','crack',both,
    '芽のある区画は保護され、育苗床の枠も完成している。ユイは保管簿の盗難欄を書き換えるために種棚へ戻ろうとした。',[
      O('report','ユイと種棚へ戻り、育苗の記録に切り替える','nursery_report')
    ]);
  s.node('nursery_report','rack',yui,
    'ユイが育苗床と鳥の持分を保管簿に記した。亀裂の芽はそのままで、戻す必要のない種は在庫の損失から除外された。',[
      O('finish','育苗床の完成、鳥の分と苗の保全、帳簿の変更を確定する','@informed',[set('recorded')])
    ]);
  s.node('nest_before','nest',[],
    '巣の前の棚にはまだ土へ運ばれていない種がある。奥の足場を二体の守護兵が塞いでいる。戦闘に負けたり逃げたりすれば回収は成立しない。',[
      O('fight','守護兵二体を追い払う','nest_cleared',[set('guardsDefeated')],{combat:'guard_3'})
    ]);
  s.node('nest_cleared','nest',[],
    '守護兵の足場が空いた。巣の棚の種はまだここにある。勝っただけでは保管袋を回収していない。',[
      O('collect','巣の棚から未運搬の種を集め、隊の袋に入れる','nest_collected',
        [give('nestSeeds','nest','party'),set('nestRecovered')])
    ]);
  s.node('nest_collected','nest',[],
    '巣の棚の種は確保した。しかし光のある亀裂にも、すでに鳥が運んだ分と新芽が残っている。「全て戻す」ならそこにも行かなければならない。',[
      O('crack','光の差す亀裂まで行き、残る種を確かめる','crack_contract')
    ]);
  s.node('crack_contract','crack',atCrack,
    '巣から運ばれた種が土に入り、いくつかは芽を出していた。回収を徹底すれば芽も持ち去ることになる。',[
      O('uproot','亀裂に残る未植付け分と芽も全て回収する','contract_carried',
        [give('looseSeeds','crack','party'),give('seedlings','crack','party'),set('sproutsRemoved')])
    ]);
  s.node('contract_carried','crack',atCrack,
    '亀裂から種も芽もなくなった。隊は巣と亀裂の種袋を持っている。ユイの棚へ戻して在庫を戻す。',[
      O('return','全ての種と抜いた苗を種棚へ運ぶ','rack_contract')
    ]);
  s.node('rack_contract','rack',yui,
    'ユイは巣と亀裂から戻った袋の数を確かめる。保管棚は光が届かず、新しい芽を育てる場所ではない。',[
      O('store','種と抜いた苗を棚へ戻し、在庫を回復したことを記帳する','@contract',
        [give('nestSeeds','party','rack'),give('looseSeeds','party','rack'),
         give('seedlings','party','rack'),set('allRecovered'),set('recorded')])
    ]);

  const journey=connectWorld(s,world,1);
  const travel=(action,to,options={})=>journey(action,to,options);
  travel('entry_follow','trail');
  travel('entry_nest','nest',{arrive:[set('nestVisited')]});
  travel('trail_track','crack',{depart:[set('trailFound')],arrive:[set('crackFound')]});
  travel('marked_consult','rack');
  travel('consult_beds','bed',{companions:['gardener'],depart:[set('gardenerAgreed'),give('bedMaterials','rack','party')]});
  travel('consult_half','crack',{depart:[set('gardenerAgreed')]});
  travel('half_carried_return','rack');
  travel('built_crack','crack',{companions:['gardener']});
  travel('bird_reserved_report','rack',{companions:['gardener']});
  travel('nest_collected_crack','crack',{arrive:[set('crackFound')]});
  travel('contract_carried_return','rack');

  s.story.endings={
    informed:and(s.is('marked'),s.is('gardenerAgreed'),s.is('bedsPrepared'),s.is('birdShareReserved'),
      s.is('seedlingsAt','crack'),s.is('looseSeedsAt','crack'),s.is('bedMaterialsAt','bed'),
      s.is('gardenerAt','rack'),s.is('recorded')),
    compromise:and(s.is('halfRecovered'),s.is('looseSeedsAt','gardener'),s.is('seedlingsAt','crack'),
      not(s.is('bedsPrepared')),not(s.is('guardsDefeated')),s.is('recorded')),
    contract:and(s.is('guardsDefeated'),s.is('nestRecovered'),s.is('sproutsRemoved'),s.is('allRecovered'),
      s.is('nestSeedsAt','rack'),s.is('looseSeedsAt','rack'),s.is('seedlingsAt','rack'),
      not(s.is('bedsPrepared')),s.is('recorded'))
  };
  const implies=(key,condition,message)=>s.invariant(key,or(not(s.is(key)),condition),message);
  implies('watched',s.is('crackFound'),'亀裂に到達した後でだけ運搬を再観察する');
  implies('marked',s.is('crackFound'),'発芽位置の標示には亀裂での観察が必要');
  implies('gardenerAgreed',s.is('marked'),'育苗床か半分回収の方針を標示図と照合する');
  implies('halfRecovered',and(s.is('crackFound'),or(s.is('looseSeedsAt','party'),s.is('looseSeedsAt','gardener'))),'まだ植えられていない種の半分を現物回収する');
  implies('bedsPrepared',and(s.is('gardenerAgreed'),s.is('bedMaterialsAt','bed')),'ユイの同意後に育苗床を施工する');
  implies('birdShareReserved',and(s.is('bedsPrepared'),s.is('seedlingsAt','crack'),s.is('looseSeedsAt','crack')),'鳥の持分と芽は亀裂に残る');
  implies('guardsDefeated',s.is('nestVisited'),'巣に行った後の戦闘勝利だけで守護兵を排除する');
  implies('nestRecovered',and(s.is('guardsDefeated'),or(s.is('nestSeedsAt','party'),s.is('nestSeedsAt','rack'))),'戦闘勝利の後に巣の種を現物回収する');
  implies('sproutsRemoved',and(s.is('nestRecovered'),or(s.is('seedlingsAt','party'),s.is('seedlingsAt','rack'))),'徹底回収では亀裂の芽も持ち去る');
  implies('allRecovered',and(s.is('sproutsRemoved'),s.is('nestSeedsAt','rack'),s.is('looseSeedsAt','rack'),s.is('seedlingsAt','rack')),'全回収の記帳は三種の現物を棚に納めてから');
  implies('recorded',or(s.is('halfRecovered'),s.is('birdShareReserved'),s.is('allRecovered')),'種の処置を確定した結果だけを帳簿に記す');
  for(const scene of Object.values(s.story.scenes))scene.cast.forEach((cast,i)=>{
    cast.when=s.is(cast.entity+'At',scene.place);
    cast.display={x:scene.cast.length===2?[30,70][i]:50,y:10,scale:1,cardScale:1,layer:i};
  });
  return s.done();
}
