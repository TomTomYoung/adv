import rows from '../../stories-v11-2.mjs';
import {story,O,move,give,set,see,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

export const ratRouteLocations={
  e2_rat_lane:{id:'e2_rat_lane',name:'灯帰り・倉庫通り',parent:'hikarigaeri_square',description:'地下水道の地上階段から広場へ出ると、穀倉と共同倉庫の並ぶ通りへ続く。二つの倉庫はそれぞれ別の戸口を持つ。',background:'location_square',links:[]},
  e2_rat_granary:{id:'e2_rat_granary',name:'灯帰り・地上穀倉の外室',parent:'e2_rat_lane',description:'地上に建つ穀倉の外室。閉じた内扉の向こうに穀物庫がある。床際の侵入口は地下の分岐に通じる鼠の退路で、人が通る階段とは別である。',background:'location_shop',links:[]},
  e2_rat_store:{id:'e2_rat_store',name:'灯帰り・共同倉庫',parent:'e2_rat_lane',description:'穀倉と同じ通りにある共同倉庫。受入れ係が入出庫帳を管理し、持ち込まれた穀物の数量と受渡しを記録する。',background:'location_shop',links:[]}
};

export function ratRouteSource(){
  const old=rows.find(s=>s.id==='q009'),s=story(9,{junction:'鼠の集まる地下分岐',work:'地下の清掃区画',granary:'地上穀倉の外室',store:'地上の共同倉庫'},[['junction','work'],['junction','granary'],['granary','store']]);
  for(const key of ['brief','past','authoringNotes','revealText','progression'])s[key]=structuredClone(old[key]);
  const prose=id=>old.nodes.find(n=>n.id===id).text;
  s.entity('eda','junction','eda').entity('cleaners','work','cleaners',{kind:'group'}).entity('storekeeper','granary','storekeeper').entity('clerks','store','clerks',{kind:'group'}).entity('rats','granary',null,{kind:'group'}).entity('grain','granary').entity('plans','eda').entity('pillars','junction');
  for(const key of ['structureChecked','causeKnown','zones','holes','verified','hunted','received','ratsCleared','storeConsent'])s.bool(key);
  s.story.propositions=structuredClone(old.story.propositions);
  const survey=[see('plans','plans'),see('structure','pillars',s.known('plans')),set('structureChecked')];
  const inquiry=[see('cause','cleaners'),set('causeKnown')];
  const clearRats=[move('rats','granary','junction','work'),set('ratsCleared')];
  s.node('entry','junction',['eda'],prose('entry'),[
    O('trace','エダの旧図と支柱の測点、亀裂、地下水位を比較する','surveyed',survey),
    O('hunt','地上階段から穀倉へ向かい、外室の群れを追い払う','hunt'),
    O('move','地上階段から穀倉へ向かい、避難搬送を相談する','granary')
  ]);
  s.node('surveyed','junction',['eda'],'旧図と支柱の測点、亀裂、地下水位を比較し、この区画には新しい変位がないと確認した。旧図はエダが保持している。鼠が逃げた原因は、まだ清掃係に確かめていない。',[
    O('work','石灰の跡をたどって地下の清掃区画へ向かう','work_arrival')
  ]);
  s.node('work_arrival','work',['cleaners'],when(s.is('causeKnown'),'清掃区画へ戻った。以前の聞取りと作業の記録を保ち、担当の清掃係へ声を掛ける。','清掃区画に着いた。石灰の袋を持つ清掃係がいる。ここに着いただけでは、鼠が逃げた原因は確かめられていない。'),[
    O('listen','清掃係に、清掃した区画と時期を確かめる','work',inquiry,{once:false})
  ]);
  s.node('work','work',['cleaners'],prose('work'),[
    O('zones','清掃係と次回以降の区画と時期を分ける合意をする','work',[set('zones')],{when:not(s.is('zones'))}),
    O('granary','分岐と地上階段を通り、穀倉の外室へ向かう','granary',[],{once:false})
  ]);
  s.node('granary','granary',['storekeeper'],[
    when(s.is('holes'),'外室への侵入口は塞いである。内扉は引き続き閉めている。',when(s.is('ratsCleared'),'外室の鼠は地下の退路へ逃がした。侵入口はまだ開いており、封鎖は終わっていない。','鼠はまだ外室にいる。穀倉番は内扉を押さえ、穀物との間を守っている。')),
    when(s.is('zones'),'次回からの清掃区画と時期の分散は合意済みだ。','清掃範囲の合意はまだ取っていない。')
  ],[
    O('guide','内扉を閉じたまま、外室の鼠を地下の退路へ誘導する','granary',clearRats,{when:not(s.is('ratsCleared'))}),
    O('holes','外室に鼠が残っていないことを確認して、侵入口を塞ぐ','granary',[set('holes')],{when:and(s.is('ratsCleared'),not(s.is('holes')))}),
    O('work','地上階段を下り、清掃区画へ戻る','work_arrival',[],{once:false}),
    O('verify','地下分岐へ戻り、構造確認と作業の記録を照合する','verification',[],{when:and(s.is('zones'),s.is('holes'))}),
    O('grain','共同倉庫へ歩き、穀物の受入れを相談する','store')
  ]);
  s.node('hunt','granary',['storekeeper'],'地上の穀倉の外室へ着いた。鼠はまだ外室におり、穀倉番が内扉を閉じて穀物を守っている。追払いはこれから行う。',[
    O('hunt','外室で群れを追い払い、内扉を守る','@contract',[...clearRats,set('hunted')],{combat:true})
  ]);
  s.node('verification','junction',['eda'],'清掃の合意と侵入口の封鎖の記録を持って、エダのいる分岐へ戻った。構造物を調べた範囲を確かめ、清掃区画での最後の照合へつなぐ。',[
    O('survey','旧図、支柱の測点、亀裂、地下水位を照合する','verified_structure',survey)
  ]);
  s.node('verified_structure','junction',['eda'],'この区画には新たな構造変位がないことを確かめた。旧図はエダが保持する。清掃係へ戻り、原因と今後の清掃、封鎖の結果を照合する。',[
    O('return','地下の清掃区画へ戻る','final_check')
  ]);
  s.node('final_check','work',['cleaners'],'清掃区画へ戻った。構造確認、次回以降の清掃区画と時期の分散、穀倉の侵入口封鎖は揃っている。今回確認した区画に限って、崩落警戒の扱いを決める。',[
    O('finish','清掃係と記録を照合し、この区画の警戒を解除する','@informed',[...inquiry,set('verified')])
  ]);
  s.node('store','store',['clerks'],'共同倉庫へ着いた。受入れ係が入出庫帳を持っている。穀物はまだ穀倉にあり、受入れの確認も搬送も済んでいない。',[
    O('request','受入れ係と受入れ先・数量照合の手順を確かめる','store_ready',[set('storeConsent')])
  ]);
  s.node('store_ready','store',['clerks'],'受入れ係と穀物の受入れを確認した。係を伴って穀倉へ戻り、穀物を積み込む。まだ受領の記録は付けない。',[
    O('escort','受入れ係と倉庫通りを歩き、穀倉へ戻る','loading')
  ]);
  s.node('loading','granary',['storekeeper','clerks'],'受入れ係と穀倉へ戻った。穀倉番は内扉を守り、外室と穀物庫を隔てている。ここまでに済ませた誘導・封鎖・清掃の合意は保つ。穀物はまだ倉庫側が保持している。',[
    O('load','穀倉番から穀物を預かり、運搬する荷として積み込む','loaded',[give('grain','granary','party')])
  ]);
  s.node('loaded','granary',['storekeeper','clerks'],'穀物を運搬する荷として預かった。穀倉番はこの場に残る。受入れ係と共同倉庫へ運ぶが、穀物の保持者はまだ隊である。',[
    O('transport','穀物を持ち、受入れ係と共同倉庫へ運ぶ','store_arrival')
  ]);
  s.node('store_arrival','store',['clerks'],'穀物を持って共同倉庫に着いた。荷はまだ隊が保持している。受入れ係との数量照合と、入出庫帳への記録を済ませて引き渡す。',[
    O('receive','数量を照合して穀物を引き渡し、共同の入出庫帳へ記録する','@compromise',[give('grain','party','clerks'),set('received')])
  ]);
  s.outcomes=structuredClone(old.outcomes);s.story.endings=structuredClone(old.story.endings);
  const point=(key,x,y)=>({kind:'dungeon',dungeon:'region_1',map:'region_1_f1',x,y,event:'q009_rat_route_'+key});
  const town=location=>({kind:'town',location}),route=connectWorld(s,{junction:point('junction',5,1),work:point('work',3,3),granary:town('e2_rat_granary'),store:town('e2_rat_store')},2);
  for(const [key,to] of [['entry_hunt','granary'],['entry_move','granary'],['surveyed_work','work'],['work_granary','granary'],['granary_work','work'],['granary_verify','junction'],['granary_grain','store'],['verified_structure_return','work']])route(key,to);
  route('store_ready_escort','granary',{companions:['clerks']});route('loaded_transport','store',{companions:['clerks']});
  s.story.endings.contract=and(s.story.endings.contract,s.is('partyAt','granary'));
  s.story.endings.informed=and(s.story.endings.informed,s.is('partyAt','work'));
  s.story.endings.compromise=and(s.story.endings.compromise,s.is('partyAt','store'));
  s.invariant('fixed-workers',and(s.is('edaAt','junction'),s.is('cleanersAt','work'),s.is('storekeeperAt','granary'),s.is('plansAt','eda')),'担当者と旧図の所在を保持する');
  s.invariant('cleared-rats',or(not(s.is('ratsCleared')),s.is('ratsAt','work')),'退けた鼠は地下分岐から清掃区画側へ逃げている');
  s.invariant('sealed-after-clear',or(not(s.is('holes')),s.is('ratsCleared')),'鼠を外室へ閉じ込めたまま封鎖しない');
  s.invariant('receipt-holder',or(not(s.is('received')),and(s.is('grainAt','clerks'),s.is('clerksAt','store'))),'受領時は係と穀物が共同倉庫にいる');
  // A foreground individual and a smaller group remain distinct in Scene;
  // Classic keeps the established card dimensions.
  for(const scene of Object.values(s.story.scenes))scene.cast=scene.cast.map((c,i)=>({...c,display:scene.cast.length===1?{x:50,y:10,scale:.75,cardScale:1}:i===0?{x:25,y:3,scale:.5,cardScale:1}:{x:75,y:25,scale:.5,cardScale:1}}));
  return s.done();
}
