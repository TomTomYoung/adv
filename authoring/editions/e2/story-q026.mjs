import {story,O,set,give,see,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

const places={orchard:'実らない木の列',buyerBed:'買主の畑',donorTree:'隣の果樹',nursery:'果樹園の苗床'};
const site=(key,x,y)=>({kind:'dungeon',dungeon:'region_3',map:'region_3_f2',x,y,event:'q026_orchard_'+key});
const world={orchard:site('orchard',17,3),buyerBed:site('buyer',15,3),donorTree:site('donor',13,3),nursery:site('nursery',17,5)};
export const orchardPromiseCharacters={
  e2_orchard_rei:{id:'e2_orchard_rei',name:'果樹番のレイ',goal:'実らない木をどうするか決める',quests:['q026'],detail:'空の果物籠を持って果樹の列で待っている。'},
  e2_orchard_buyer:{id:'e2_orchard_buyer',name:'接ぎ穂の買主',goal:'穂を返しても自分の畑に植える苗を残す',quests:['q026'],detail:'買い取った品種の花を自分の畑で咲かせた。'},
  e2_orchard_neighbor:{id:'e2_orchard_neighbor',name:'隣の木の持ち主',goal:'自分の木から穂を分ける',quests:['q026'],detail:'違う味の実をつける木を手入れしている。'}
};

export function orchardPromiseSource(){
  const s=story(26,places,[]),is=s.is;
  s.entity('rei','orchard','e2_orchard_rei').entity('buyer','buyerBed','e2_orchard_buyer').entity('neighbor','donorTree','e2_orchard_neighbor');
  s.entity('stock','orchard').entity('original','buyer').entity('alternate','donorTree').entity('replacement','nursery');
  s.enum('stockState','bare',['bare','wood','original','alternate'],'元の台木の処置');
  s.enum('promise','none',['none','declined','party','rei'],'買主と交わした苗の約束とその担当');
  s.enum('season','current',['current','next'],'手入れを続けて迎えた季節');
  s.enum('seedling','unstarted',['unstarted','sown','ready'],'買主用の苗床で確認した生育段階');
  s.bool('permission').bool('budChecked');
  s.fact('terms','買主は花のついた元の穂を見せ、返還の条件に別の苗を求めた。');
  const rei=['rei'],buyer=['buyer'],neighbor=['neighbor'];
  s.node('entry','orchard',rei,'並んだ木のうち、一本だけ籠が空です。レイが葉をよけると、古い接ぎ口の下に売却札が残っていました。台木は生きています。実をつけていた枝だけがありません。',[
    O('buyer','買主を訪ねる','at_buyer'),O('new','別の穂を探す','at_donor'),O('fuel','薪にする','at_stock')
  ]);
  s.node('at_stock','orchard',rei,'レイが空の籠を幹の脇からどけました。「この一本を伐ったら、列のここだけ空きますよ」。鋸を当てる位置を決めます。',[
    O('cut','台木を伐る','wood',[set('stockState','wood')])
  ]);
  s.node('wood','orchard',rei,'切り分けた木を運びやすく束ねました。隣の木の影が、今まで幹のあった土に落ちています。',[
    O('hand','薪を渡す','@contract',[give('stock','orchard','rei')])
  ]);
  s.node('at_buyer','buyerBed',buyer,'買主は花のついた枝を引き寄せました。札に刻んだ印は果樹園で見たものと同じです。「これを戻すなら、うちには何を植えればいい？」',[
    O('ask','条件を聞く','offer',[see('terms','buyer')])
  ]);
  s.node('offer','buyerBed',buyer,'「代わりに苗を一本、うちのために育ててほしい。それなら、この穂を返しましょう」。買主はまだ枝から手を離していません。',[
    O('agree','苗を約束する','promised',[set('promise','party')]),O('decline','断って隣へ','at_donor')
  ]);
  s.node('promised','buyerBed',buyer,'一行が苗を育てると引き受けると、買主は元の穂を切り、切り口を湿った布で包みました。',[
    O('receive','元の穂を受ける','carrying_original',[give('original','buyer','party')])
  ]);
  s.node('carrying_original','buyerBed',buyer,'花のついた元の穂を預かりました。買主は自分の畑に一本分の場所を空けて待ちます。',[
    O('return','台木へ戻る','original_at_stock')
  ]);
  s.node('original_at_stock','orchard',rei,'レイが幹に残った傷を指でなぞりました。預かった穂の切り口を整え、皮のすぐ内側を合わせます。',[
    O('graft','元の穂を接ぐ','grafted',[give('original','party','stock'),set('stockState','original')])
  ]);
  s.node('grafted','orchard',rei,'接ぎ口に布を巻きました。いま見えている花は買主の畑で咲いたものです。根付いたかは、次の芽が動くまで分かりません。レイは苗床の水やり表を開きました。',[
    O('leave','レイに託す','handoff'),O('season','世話を続ける','at_nursery')
  ]);
  s.node('handoff','orchard',rei,'表の余白に、接ぎ口を見る時期と買主の畑の場所を書きました。レイが「芽を見届けるのも、あの人の苗を育てるのも私がやります」と手を差し出しました。',[
    O('entrust','表を渡す','@grafted',[set('promise','rei')])
  ]);
  s.node('at_nursery','nursery',[],'苗床には、買主の分を育てる場所が空いています。接ぎ戻した木とは別に、ここに一粒まいて札を立てます。',[
    O('sow','種をまく','tending',[set('seedling','sown')])
  ]);
  s.node('tending','nursery',[],'買主の名を書いた札の下は、まだ土のままです。水をやり、果樹の列の巻き布も確かめる。この手入れを翌季まで続けます。',[
    O('wait','翌季まで世話','next_season',[set('season','next')])
  ]);
  s.node('next_season','nursery',[],'季節が移りました。買主の札の前で、二枚の葉が土の上に開いています。茎を傷めないように周囲の土をよけます。',[
    O('inspect','苗を確かめる','seedling_ready',[set('seedling','ready')])
  ]);
  s.node('seedling_ready','nursery',[],'札の下の苗は自分の根を張っていました。買主に渡す日まで苗床で育てます。接ぎ戻した穂にも芽が出たか、果樹の列へ戻ります。',[
    O('orchard','接ぎ口へ戻る','check_bud')
  ]);
  s.node('check_bud','orchard',rei,'レイと巻き布を少し緩めました。継ぎ目の上に、去年の花とは違う、小さな緑の芽がのぞいています。空の籠はまだ枝の下です。',[
    O('confirm','新芽を確かめる','@informed',[set('budChecked')])
  ]);
  s.node('at_donor','donorTree',neighbor,when(is('promise','declined'),'元の穂を買主の畑に残し、隣の木を訪ねました。持ち主が「うちの実は、あの木とは味が違いますよ」と手を止めました。',
    '隣の木にはまだ去年の実の名札が掛かっています。「うちの木でよければ、どう使いたいのか聞かせてください」と持ち主が言いました。'),[
    O('ask','穂を分けてと頼む','permitted',[set('permission')])
  ]);
  s.node('permitted','donorTree',neighbor,'レイの台木に接ぎたいと伝えると、持ち主は若い枝を選びました。「この枝をどうぞ。実がなったら味を教えてください」',[
    O('take','別の穂を受ける','carrying_alternate',[give('alternate','donorTree','party')])
  ]);
  s.node('carrying_alternate','donorTree',neighbor,'分けてもらった枝に、隣の木の名札を結びました。この穂が育てば、かつての果物とは違う味になります。',[
    O('return','台木へ運ぶ','alternate_at_stock')
  ]);
  s.node('alternate_at_stock','orchard',rei,'レイが幹に新しい切り口を作りました。隣の木の名札を残したまま、分けてもらった穂をそこへ合わせます。',[
    O('graft','別の穂を接ぐ','@compromise',[give('alternate','party','stock'),set('stockState','alternate')])
  ]);
  const journey=connectWorld(s,world,1);
  journey('entry_buyer','buyerBed');journey('entry_new','donorTree');
  journey('offer_decline','donorTree',{depart:[set('promise','declined')]});
  journey('carrying_original_return','orchard');journey('carrying_alternate_return','orchard');
  journey('grafted_season','nursery');journey('seedling_ready_orchard','orchard');
  const originalGraft=and(is('originalAt','stock'),is('stockState','original'));
  s.story.endings={
    contract:and(is('stockState','wood'),is('stockAt','rei'),is('originalAt','buyer')),
    compromise:and(is('stockState','alternate'),is('alternateAt','stock'),is('permission'),is('originalAt','buyer')),
    grafted:and(originalGraft,is('promise','rei'),is('season','current'),is('seedling','unstarted'),not(is('budChecked'))),
    informed:and(originalGraft,is('promise','party'),is('season','next'),is('seedling','ready'),is('budChecked'))
  };
  const implies=(id,a,b,message)=>s.invariant(id,or(not(a),b),message);
  implies('terms',not(is('promise','none')),s.known('terms'),'条件の受諾と拒否は条件を聞いてから決める');
  implies('released',not(is('originalAt','buyer')),or(is('promise','party'),is('promise','rei')),'元の穂を返してもらうには苗の約束が要る');
  implies('alternate',not(is('alternateAt','donorTree')),and(is('permission'),is('originalAt','buyer')),'代替の枝は許しを得て切り分ける');
  implies('sown',not(is('seedling','unstarted')),and(originalGraft,is('promise','party')),'約束した苗を接ぎ戻した後で育てる');
  implies('next',is('season','next'),not(is('seedling','unstarted')),'種まきと手入れの後で次の季節を迎える');
  implies('ready',is('seedling','ready'),is('season','next'),'苗の育ちを翌季の苗床で確かめる');
  implies('bud',is('budChecked'),and(originalGraft,is('seedling','ready')),'苗床を見てから台木で元の穂の新芽を確かめる');
  for(const scene of Object.values(s.story.scenes))for(const cast of scene.cast){
    cast.when=is(cast.entity+'At',scene.place);
    cast.display={x:50,y:10,scale:1,cardScale:1,layer:0};
  }
  return s.done();
}
