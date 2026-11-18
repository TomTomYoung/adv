import {story, O, set, give, and, or, not, when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

const places = {
  undergroundTomb:'廃坑の地下墓', workshop:'建立した坑夫たちの詰所', surfaceTomb:'礼拝堂裏の地上墓地',
  records:'礼拝堂の坑務記録窓口', families:'礼拝堂の遺族照会室'
};
const cell = (key,x,y) => ({kind:'dungeon',dungeon:'region_2',map:'region_2_f2',x,y,event:'q017_two_graves_'+key});
const world = {
  undergroundTomb:cell('tomb',11,9), workshop:cell('workshop',11,7),
  surfaceTomb:{kind:'town',location:'e2_two_graves_cemetery'}, records:{kind:'town',location:'e2_pillar_records'},
  families:{kind:'town',location:'e2_pillar_families'}
};
export function extendTwoGravesGeography(bundle) {
  const id=world.surfaceTomb.location;
  bundle.additions.locations[id]={id,name:'灯帰りの礼拝堂・裏の墓地',parent:'e2_pillar_archive',links:[],
    background:'location_square',description:'礼拝堂の裏庭に墓石が並ぶ。門の内側の記帳所で墓番が埋葬簿を保管している。'};
}
const roles = {
  keeper:['地下墓の墓守','墓の中身を見届け、建立者が待った場所を伝える'],
  peers:['空墓を作った坑夫たち','仲間の弁当箱と、坑内で皆が待った夜のことを覚えている'],
  sexton:['地上墓地の墓番','埋葬簿と墓標の名を照合して照会に答える'],
  clerk:['坑務記録の係員','救助坑から提出された回収記録の原本を保管する'],
  family:['坑夫の遺族','地上に葬った身内が坑内でどう弔われたかを知る']
};
export const twoGravesCharacters=Object.fromEntries(Object.entries(roles).map(([role,[name,goal]])=>{
  const id='e2_two_graves_'+role;
  return [id,{id,name,goal,quests:['q017'],detail:'塩哭きの廃坑と灯帰りの礼拝堂で会う人物。'}];
}));

export function twoGravesSource() {
  const tomb='undergroundTomb', miners=['keeper','peers'], gathering=[...miners,'family'];
  const s=story(17,places,[[tomb,'workshop'],[tomb,'surfaceTomb'],['surfaceTomb','records'],['records','families'],['records',tomb],['families',tomb]]);
  const starts={keeper:tomb,peers:'workshop',sexton:'surfaceTomb',clerk:'records',family:'families'};
  for(const [role,place] of Object.entries(starts)) s.entity(role,place,'e2_two_graves_'+role);
  s.entity('box',tomb).entity('sharedBox','peers').entity('remains','surfaceTomb').entity('flowers','family');
  s.entity('burialRegister','sexton').entity('recoveryRegister','clerk').entity('burialCopy','sexton').entity('recoveryCopy','clerk');
  s.enum('route','open',['open','compare','remove','deliver','inscribe']);
  for(const key of ['testimony','emptyKnown','burialRead','recoveryRead','recordsCompared','remainsKnown','peersConsent','familyConsulted','wordingAgreed','inscribed','flowersLaid','removed','delivered','sharedPlaced']) s.bool(key);
  const route=value=>s.is('route',value);
  s.node('entry',tomb,['keeper'],'墓標には、地上の墓と同じ坑夫の名がある。墓守が石蓋の縁に手を置いた。「ここを作った連中は、すぐ北の詰所にいる。連中を呼んできてくれるか。ここで待っているよ」。',[
    O('family','二つの墓と埋葬の経緯を調べるため、建立した仲間を訪ねる','miners'),
    O('remove','地下墓を片付けられるか、まず建立した仲間に事情を聞く','miners'),
    O('box','地下墓に納めた弁当箱について、建立した仲間を訪ねる','miners')
  ]);
  s.node('miners','workshop',['peers'],'坑夫たちが共同の弁当箱を囲んでいる。ひとりが自分の匙を置いた。「あいつの箱なら、石の下だ」。',[
    O('listen','事故の晩、なぜ弁当箱を墓に納めたのか聞く','testimony',[set('testimony')])
  ]);
  s.node('testimony','workshop',['peers'],'「崩れた先に手が届かなかった。あいつが毎朝持ってきた箱を納めて、ここで帰りを待ったんだ」。坑夫たちが自分たちの弁当箱を包み、立ち上がった。',[
    O('grave','建立した仲間と地下墓へ戻る','at_lid')
  ]);
  s.node('at_lid',tomb,miners,'墓守が留め金を外し、坑夫たちが石蓋の両端に手を掛けた。中身はまだ見えていない。',[
    O('open','仲間と石蓋を持ち上げ、納められた物を確かめる','opened',[set('emptyKnown')])
  ]);
  s.node('opened',tomb,miners,'窪みに古い弁当箱が一つ。ほかには何もない。片隅に持ち主の名が彫ってある。墓守は蓋を支えたまま、隊の返事を待った。',[
    O('register','弁当箱を残し、地上の墓標と埋葬簿を見に行く','cemetery',[],{when:or(route('compare'),route('remove'))}),
    O('ask','建立した仲間に、遺族へ弁当箱を届けたいと申し出る','permission',[],{when:route('deliver')})
  ]);
  s.node('cemetery','surfaceTomb',['sexton'],'礼拝堂裏の墓標に同じ名がある。門の内の机で、墓番が葬儀の日の埋葬簿を開いた。',[
    O('copy','墓標と埋葬簿の名・日付を読み、該当行の写しを受け取る','burial_read',[set('burialRead'),give('burialCopy','sexton','party')])
  ]);
  s.node('burial_read','surfaceTomb',['sexton'],'埋葬の日は事故より後だった。墓番は原本を引き出しへ戻した。「救助坑の回収簿なら、坑務の窓口に納めてあるよ」。',[
    O('records','埋葬簿の写しを持って坑務記録窓口へ行く','records_desk')
  ]);
  s.node('records_desk','records',['clerk'],'係員が救助坑から提出された回収簿を出した。引き渡し先の欄まで続く一行が、紙の折り目に隠れている。',[
    O('copy','回収簿の氏名・引渡日・引渡先を読み、写しを受け取る','recovery_read',[set('recoveryRead'),give('recoveryCopy','clerk','party')])
  ]);
  s.node('recovery_read','records',['clerk'],'手元には二枚の写しがそろった。墓地に納められた人と、別の救助坑から運ばれた人が同じか、氏名と日付を順にたどれる。',[
    O('compare','回収簿の引渡先と埋葬簿の氏名・日付を照合する','compared',[set('recordsCompared'),set('remainsKnown')])
  ]);
  s.node('compared','records',['clerk'],'同じ人だった。坑内で仲間が空墓を作った後、別の救助坑から遺体が戻り、地上で家族が葬っていた。',[
    O('family','二枚の写しを遺族の照会室に持っていく','family_choice',[],{when:route('compare')}),
    O('grave','撤去前に弁当箱を建立者へ返すため、地下墓に戻る','return_box',[],{when:route('remove')})
  ]);
  s.node('family_choice','families',['family'],'遺族は引渡先の名を指でなぞった。「ここへ迎えに行ったのは私よ。二つに分けた骨じゃなかったのね」。地下の弁当箱は今も石の下にある。',[
    O('both','二つの墓を残すことについて遺族の意向を聞く','consulted',[set('familyConsulted'),set('route','inscribe')]),
    O('box','墓の扱いは決めず、弁当箱を届ける了承を得に行く','permission')
  ]);
  s.node('consulted','families',['family'],'「待ってくれた人の名も残して。私もそこに花を置きたい」。遺族が一束の花を携えた。建立者にはまだ銘文を確かめていない。',[
    O('escort','花を持った遺族と地下墓へ向かう','inscription_draft')
  ]);
  s.node('inscription_draft',tomb,gathering,'墓標を囲んで、坑夫たちがひとりずつ名を告げた。遺族は、回収を待った間にできた墓だと分かる言葉を選んだ。',[
    O('agree','建立者の名と、回収前に空墓を作った経緯を全員で読み合わせる','ready_to_carve',[set('wordingAgreed')])
  ]);
  s.node('ready_to_carve',tomb,gathering,'坑夫たちが下書きの自分の名に触れ、うなずいた。石にはまだ以前の名だけが残っている。',[
    O('carve','確かめた銘文を地下墓の石に刻む','inscribed',[set('inscribed')])
  ]);
  s.node('inscribed',tomb,gathering,'新しい字の溝から石の粉が落ちた。遺族が古い弁当箱に手を添え、持参した花をほどいた。',[
    O('flowers','遺族が弁当箱のそばに花を供えるのを見届ける','offered',[give('flowers','family',tomb),set('flowersLaid')])
  ]);
  s.node('offered',tomb,gathering,'弁当箱の横に花がある。家族と坑夫たちは、事故の晩から今日までのことを新しい銘文の前で話している。',[
    O('finish','二つの墓とそこに残したものを記録する','@informed')
  ]);
  s.node('return_box',tomb,miners,'石蓋の下に当人の弁当箱が残っている。建立した坑夫たちが受け取れるように包みを広げた。',[
    O('lift','地下墓から当人の弁当箱を取り上げる','lifted',[give('box',tomb,'party')])
  ]);
  s.node('lifted',tomb,miners,'弁当箱は隊の手にある。坑夫のひとりが、底の名を見て両手を差し出した。',[
    O('return','当人の弁当箱を建立した仲間に返す','returned',[give('box','party','peers')])
  ]);
  s.node('returned',tomb,miners,'坑夫が箱を抱えて一歩下がった。墓守が何も残っていない窪みを指し、石を運び出す場所を空けた。',[
    O('remove','石を片付けて地下の空墓を撤去する','removed',[set('removed')])
  ]);
  s.node('removed',tomb,miners,'墓標があった所に石の跡だけが残った。坑夫たちは返された弁当箱を抱えている。地上の墓には手を加えていない。',[
    O('finish','地下墓を撤去した結果を記録する','@contract')
  ]);
  s.node('permission',tomb,miners,'古い弁当箱はまだ窪みにある。「家族へ渡すのか」と坑夫のひとりが聞いた。ほかの建立者もそばへ寄ってきた。',[
    O('consent','持ち主の遺族に渡すことを説明し、建立した仲間の了承を得る','consented',[set('peersConsent')])
  ]);
  s.node('consented',tomb,miners,'「あの人に届けてくれ」。坑夫たちがそろってうなずいた。弁当箱はまだ石の下にある。',[
    O('take','底の名を確かめ、当人の弁当箱を預かる','carrying',[give('box',tomb,'party')])
  ]);
  s.node('carrying',tomb,miners,'隊が預かったのは亡くなった坑夫の古い弁当箱だ。坑夫たちの共同の箱は、彼らの傍らにある。',[
    O('deliver','弁当箱を礼拝堂の遺族照会室まで運ぶ','delivery')
  ]);
  s.node('delivery','families',['family'],when(s.is('recordsCompared'),'遺族は二枚の記録を読んだ人だ。今度は隊の包みの中の、使い込まれた弁当箱を見つめている。','遺族は底の名に見覚えがあるという。隊が現地で確かめたのは、地下墓の中身と、そこに箱を納めた仲間の話だ。'),[
    O('hand','当人の弁当箱を手渡し、仲間が帰りを待った夜の話を伝える','delivered',[give('box','party','family'),set('delivered')])
  ]);
  s.node('delivered','families',['family'],'遺族が弁当箱を胸に抱いた。「あそこで、こんなふうに待ってくれていたのね」。隊は受け取ったという返事を預かった。',[
    O('report','弁当箱を受け取ったという返事を地下墓へ持ち帰る','shared_ready')
  ]);
  s.node('shared_ready',tomb,miners,'返事を聞いた坑夫たちは、空いた窪みの前に座った。詰所から持ってきた、自分たちの共同の弁当箱を開いた。',[
    O('place','坑夫たちが共同の弁当箱を空いた場所へ置くのを見届ける','shared_placed',[give('sharedBox','peers',tomb),set('sharedPlaced')])
  ]);
  s.node('shared_placed',tomb,miners,'共同の弁当箱は地下墓に置かれた。元の箱は遺族が持っている。墓標の文面はそのままだ。',[
    O('finish','弁当箱を遺族に届けた結果を記録する','@compromise')
  ]);

  const journey=connectWorld(s,world,1);
  for(const [id,branch] of [['family','compare'],['remove','remove'],['box','deliver']])
    journey('entry_'+id,'workshop',{depart:[set('route',branch)]});
  journey('testimony_grave',tomb,{companions:['peers']});
  journey('opened_register','surfaceTomb');
  journey('burial_read_records','records');
  journey('compared_family','families');
  journey('compared_grave',tomb);
  journey('family_choice_box',tomb,{depart:[set('route','deliver')]});
  journey('consulted_escort',tomb,{companions:['family']});
  journey('carrying_deliver','families');
  journey('delivered_report',tomb);

  const verified=and(s.is('emptyKnown'),s.is('recordsCompared'),s.is('remainsKnown'));
  s.story.endings={
    informed:and(verified,route('inscribe'),s.is('familyConsulted'),s.is('inscribed'),s.is('flowersLaid'),s.is('boxAt',tomb)),
    contract:and(verified,route('remove'),s.is('removed'),s.is('boxAt','peers')),
    compromise:and(route('deliver'),s.is('peersConsent'),s.is('delivered'),s.is('sharedPlaced'),s.is('boxAt','family'))
  };
  s.invariant('originals',and(s.is('remainsAt','surfaceTomb'),s.is('burialRegisterAt','sexton'),s.is('recoveryRegisterAt','clerk')),'遺骨は地上墓にあり、二冊の原本は保管者の手元に残る');
  s.invariant('records',or(not(s.is('remainsKnown')),and(s.is('recordsCompared'),s.is('burialRead'),s.is('recoveryRead'),s.is('emptyKnown'),s.is('burialCopyAt','party'),s.is('recoveryCopyAt','party'))),'二枚の写しと地下墓の中身を確かめてから遺骨の所在を確定する');
  s.invariant('permission',or(not(s.is('peersConsent')),and(route('deliver'),s.is('emptyKnown'),s.is('testimony'))),'建立者が中身を示してから遺族への持出しを認める');
  s.invariant('delivered',or(not(s.is('delivered')),and(s.is('peersConsent'),s.is('boxAt','family'))),'遺族への引渡しには了承と当人の箱が必要');
  s.invariant('substitute',or(not(s.is('sharedPlaced')),and(s.is('delivered'),s.is('sharedBoxAt',tomb))),'共同の箱は当人の箱を引き渡した後、仲間が地下に置く');
  s.invariant('removal',or(not(s.is('removed')),and(verified,s.is('boxAt','peers'),not(s.is('inscribed')))),'当人の箱を建立者へ返してから空墓を撤去する');
  s.invariant('engraving',or(not(s.is('inscribed')),and(verified,s.is('familyConsulted'),s.is('wordingAgreed'),s.is('familyAt',tomb),s.is('boxAt',tomb))),'遺族と建立者が文面を確かめて地下で刻む');
  s.invariant('offering',or(not(s.is('flowersLaid')),and(s.is('inscribed'),s.is('flowersAt',tomb))),'刻字後に遺族が地下で献花する');
  for(const scene of Object.values(s.story.scenes)) scene.cast.forEach((c,i)=>{
    c.when=s.is(c.entity+'At',scene.place);
    const slots=scene.cast.length===3?[13,44,78]:scene.cast.length===2?[30,70]:[50];
    c.display={x:slots[i],y:10,scale:1,cardScale:1,layer:i};
  });
  return s.done();
}
