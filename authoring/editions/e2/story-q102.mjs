import {O,set,and,not,when} from '../../story-kit.mjs';
import {canalQuest} from './canal-quarter.mjs';

export default canalQuest(102,{
  tower:['運河の鐘楼','吊った大鐘の下に手鈴と三つの準備札がある。'],
  parlor:['遺族の控え所','列に添える果物を籠に詰めている。'],
  inn:['鐘楼脇の宿','鐘の合図がよく聞こえる宿。','location_tavern'],
  board:['運河の告知板','葬列の時刻を書き込める板。'],
  lane:['葬列の並ぶ道','列の先から鐘楼の綱が見える。']
},{rou:['鐘番ロウ','tower','行商人の家族が望む音で見送りたい'],family:['行商人の遺族','parlor','亡くした人を本人のために送りたい'],eda:['宿主エダ','inn','兵を呼んだ三打の記憶から自分で距離を取る']},(s,scene)=>{
  s.int('time',0,0,3,'準備に使った手数');s.bool('family').bool('inn').bool('notice');s.enum('sound','pending',['pending','bell','hand','silent']);
  const free={op:'lt',left:s.v('time'),right:3},tick=()=>set('time',{op:'add',args:[s.v('time'),1]});
  scene('entry','tower',['rou'],'ロウが綱を手で止めている。「知らせを回せるのはあと三手。今すぐ列を出すこともできます」。鐘楼に三枚の札が掛かる。',[O('begin','準備を始める','prepare')]);
  scene('prepare','tower',['rou'],when(free,'遺族の控え所、宿、告知板へ向かえる。一件を確定するごとに準備札を一枚外す。','三枚の準備札をすべて外した。列が出る。これ以上の訪問や告知は間に合わない。'),[
    O('family','遺族を訪ねる','family',[],{when:and(free,not(s.is('family')))}),O('inn','エダを訪ねる','inn',[],{when:and(free,not(s.is('inn')))}),
    O('notice','時刻を告知する','notice',[],{when:and(free,s.is('family'),not(s.is('notice')))}),O('go','遺族を迎えに','gather',[],{companions:['rou']})]);
  scene('family','parlor',['family'],'「父の里では五打です。誰かの恩返しのために鳴らすのはよしてください」。遺族は酸っぱい果物を籠に入れた。',[O('heard','希望を預かる','prepare',[set('family'),tick()])]);
  scene('inn','inn',['eda'],'「三打で兵が来た。忘れてはいないよ」。エダは列に入る約束をせず、自分で宿の戸を閉めると言った。',[O('heard','宿主の意向を聞く','prepare',[set('inn'),tick()])]);
  scene('notice','board',[],'指定の時刻と五打の予定を書いた札を、通りから読める高さに掛ける。公示に使うのはこの一手だ。',[O('post','掲示して鐘楼へ','prepare',[set('notice'),tick()])]);
  scene('gather','parlor',['family','rou'],'遺族が果物を籠に収めた。ロウは家族が戸を出るまで待ってから、葬列の先へ一緒に歩き出す。',[O('escort','遺族と列へ','send',[],{companions:['family','rou']})]);
  scene('send','lane',['rou','family'],when(s.is('notice'),'時刻を知らせた札の下を列が進む。宿の戸は閉じている。ロウは一行に最後の合図を尋ねた。','告知板には時刻がない。ロウには、突然の音に驚く人がいることを伝えた。遺族の足がそろった。'),[
    O('bell','五打の鐘を選ぶ','ring',[],{when:s.is('family'),companions:['rou']}),O('hand','手鈴で歩く','@hand',[set('sound','hand')]),O('silent','音を添えず歩く','@silent',[set('sound','silent')])]);
  scene('ring','tower',['rou'],'ロウが大鐘の綱を取った。列の果物籠が橋へ出たところで、間を置いて五度鳴らす。',[O('ring','五打を鳴らす','returning',[set('sound','bell')])]);
  scene('returning','tower',['rou'],'五打の余韻が消える。ロウは綱を置き、遺族の待つ列へ戻って歩いて見送ることにした。',[O('join','列へ戻る','farewell',[],{companions:['rou']})]);
  scene('farewell','lane',['rou','family'],'遺族が籠から果物を差し出した。ロウはそれを一つ受け取って、列に並んだ。',[O('walk','ともに見送る','@bell')]);
  return {bell:and(s.is('family'),s.is('sound','bell')),hand:s.is('sound','hand'),silent:s.is('sound','silent')};
});
