import {O,set,give,and,see} from '../../story-kit.mjs';
import {marketQuest} from './market-world.mjs';

const auction=marketQuest(52,{
  floor:['地下市場の競り場',11,9],seat:['競り場の空席',12,9],store:['買い支え品の倉庫',13,9]
},{
  ume:['floor','競売人のウメ','売り手が望んだ値と実際の落札額を説明する'],
  keeper:['store','倉庫番','棚を埋める競り場の買い支え品を引き渡す']
});
export const auctionCharacters=auction.characters;
export function auctionSource(){
  const {s,scene,implies,finish}=auction.create(),is=s.is;
  s.entity('paddle','seat').enum('mode','automatic',['automatic','limited','stopped','discarded'])
    .enum('observations','none',['none','one','two']).bool('tested').bool('open')
    .enum('notice','none',['none','reserve','budget']).bool('accounted');
  s.fact('threshold','売り手の最低額を超えた時だけ空席の札が下りた。');
  scene('entry','floor','織物の値を読み上げるウメに、空席から一枚の札が応じた。織り手が希望額を耳打ちすると、ウメは品を倉庫番へ渡した。倉庫の扉はもう反物で押し返されている。',[
    O('observe','次の競りを見る','observe'),O('limit','買い支えを制限','budget'),O('warehouse','札を廃棄する','discard')
  ]);
  scene('observe','seat','先代の木札が肘掛けの溝に収まっている。一行が見守る前で買い手が売り手の最低額を超えた。糸が緩み、札は音を立てて下りた。',[
    O('record','動きを記録','bid',[set('observations','one'),see('threshold','seat')])
  ]);
  const policies=[O('stop','自動札を止める','stop'),O('limit','上限を試す','budget')];
  scene('bid','seat','次の品は安値のまま止まり、同じ札が上がった。競り場まで響くウメの声がした。「先代は、安く手放したくない作り手のために、あの席を設けたんです」',[
    O('again','もう一品を見る','second',[set('observations','two')]),...policies
  ]);
  scene('second','seat','欠けた皿で試しても、希望額を超えると木札は下りた。皿は買い手に、買い支えた品は倉庫に運ばれる。空席がいくつも品を欲しがる訳がわかった。',policies.map(o=>({...o})));
  scene('budget','seat','肘掛けの歯止めを、今日買い支えに使える額に合わせた。まだ最低額に届かない一品を掛け、上限に達した所でもう一度鐘を鳴らす。',[
    O('test','上限を試す','trial',[set('mode','limited'),set('tested')])
  ]);
  scene('trial','seat','買い支えの予算が尽きると、安値のままでも札は上がらなかった。ウメは競り台に帳面を開いた。上限を皆に知らせるか、この席の仕掛けを止めるか。',[
    O('keep','上限を掲示する','accounts'),O('off','仕掛けを止める','stop')
  ]);
  scene('accounts','floor','ウメは本日分の上限を板に書き、買い支えた反物の代金と合わせて読み上げた。倉庫に品を入れるたび、売上とは違う欄にこの額が載る。',[
    O('post','会計に記す','@compromise',[set('notice','budget'),set('accounted')])
  ]);
  scene('stop','seat','歯車から糸を外せば、自動札は競りに割り込まない。ウメの台には、売り手が記した最低額の紙がまだ伏せてある。',[
    O('unhook','糸を外す','silent',[set('mode','stopped')])
  ]);
  scene('silent','seat','鐘が鳴っても木札は上がらない。最低額を買い手に示す役目をウメに渡そう。',[
    O('report','競り台へ','sign')
  ]);
  scene('sign','floor','織り手が紙を表に返した。「この値からならお譲りします」。ウメは品の横にその額を掲げる場所を作った。',[
    O('post','最低額を掲示','@informed',[set('notice','reserve')])
  ]);
  scene('discard','seat','倉庫から安くても品を出したいと声が上がった。肘掛けから札を抜き、歯と糸を外す。外した木札を持てば、倉庫番にも仕掛けを解いたと伝えられる。',[
    O('remove','札を廃棄','removed',[set('mode','discarded'),give('paddle','seat','party')])
  ]);
  scene('removed','seat','壊した木札を持って倉庫番に知らせに行く。ここからは倉庫番が鍵を開けなければ品を出せない。',[
    O('unlock','倉庫へ','store')
  ]);
  scene('store','store','倉庫番が木札の残骸を確かめ、扉の内側から反物をほどいた。買い手は通路まで並んでいる。',[
    O('open','倉庫を開放','@contract',[give('paddle','party','keeper'),set('open')])
  ]);
  implies('cost',is('accounted'),and(is('tested'),is('notice','budget')),'試した上限と実際の買い支え費を記載する');
  implies('destroyed',is('open'),and(is('mode','discarded'),is('paddleAt','keeper')),'廃棄した札を確認して開放する');
  return finish([['entry_observe','seat'],['entry_limit','seat'],['entry_warehouse','seat'],['trial_keep','floor'],['silent_report','floor'],['removed_unlock','store']],{
    contract:and(is('open'),is('mode','discarded')),compromise:and(is('mode','limited'),is('accounted')),informed:and(is('mode','stopped'),is('notice','reserve'))
  });
}
