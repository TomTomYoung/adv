import rows from '../../stories-v11-2.mjs';
import {story,O,give,set,see,and} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

export function wageBoxSource(){
  const old=rows.find(s=>s.id==='q006'),s=story(6,{landing:'水路の回収場',water:'箱が沈む浅瀬',shore:'荷役人の待機岸',office:'ガロの事務所'},[['landing','water'],['landing','shore'],['shore','water'],['shore','office']]);
  for(const key of ['brief','past','authoringNotes','revealText','progression'])s[key]=structuredClone(old[key]);
  const prose=id=>old.nodes.find(n=>n.id===id).text;
  s.entity('garo','landing','garo').entity('workers','shore','workers',{kind:'group'}).entity('accused','shore','accused').entity('box','water').entity('ledger','office').entity('stones','box');
  s.story.registry.ledgerAt.meaning='給金台帳と入金台帳を一組で保持する所在';
  for(const k of ['opened','witnessed','ledgerRead','handed','partialPaid','delegated','report'])s.bool(k);
  s.story.propositions=structuredClone(old.story.propositions);
  s.node('entry','landing',['garo'],prose('entry'),[
    O('lift','縄を用意して箱が沈む浅瀬へ向かう','water_private'),
    O('witness','岸の荷役人に共同回収を頼みに行く','workers')
  ]);
  s.node('water_private','water',[],'浅瀬の底に施錠された箱が見える。縄を掛けるには、箱の周りにいる魔物を退けなければならない。まだ箱は引き揚げていない。',[
    O('lift','水路の魔物を退け、補修用の縄1個で箱を引き揚げる','lifted_private',[give('box','water','party')],{cost:{rope:1},combat:true}),
    O('witness','私的な回収を見送り、岸の荷役人に共同回収を頼む','workers')
  ]);
  s.node('lifted_private','water',[],'引き揚げた箱を受け取った。鍵は掛かったままで、中身は見えない。ガロの待つ回収場へ持ち帰る。',[
    O('return','施錠された箱を回収場へ運ぶ','box')
  ]);
  s.node('workers','shore',['workers','accused'],'荷役人たちに箱の沈没位置を伝えた。「道具はある。俺たちも立ち会う」。疑われた荷役人も一緒に立ち上がった。箱はまだ浅瀬に沈んでいる。',[
    O('recover','荷役人たちと道具を持って浅瀬へ向かう','water_joint')
  ]);
  s.node('water_joint','water',['workers','accused'],'箱が沈んだ浅瀬へ荷役人たちと着いた。彼らが回収道具を広げる。箱を取り出す前に、中身を決めつけることはできない。',[
    O('lift','荷役人の道具で一緒に箱を引き揚げる','lifted_joint',[give('box','water','party')])
  ]);
  s.node('lifted_joint','water',['workers','accused'],'施錠された箱を浅瀬から引き揚げた。箱は隊が持ち、荷役人たちと岸へ戻って中身を確かめる。',[
    O('return','荷役人たちと施錠箱を岸へ運ぶ','sealed')
  ]);
  s.node('box','landing',['garo'],prose('box'),[
    O('return','箱を未開封のままガロへ返す','private',[give('box','party','garo'),set('handed')]),
    O('public','箱を保持し、荷役人の待つ岸へ運ぶ','sealed')
  ]);
  s.node('private','landing',['garo'],prose('private'),[
    O('leave','未開封で返した仕事として報告を終える','@contract',[set('report')]),
    O('retract','報告を保留し、箱を返してもらって岸へ運ぶ','sealed')
  ]);
  s.node('sealed','shore',['workers','accused'],'施錠された箱を荷役人たちの前へ置いた。ガロは回収場に鍵を持っている。荷役人が工具を差し出した。「開けるなら、この留め金を外そう」。',[
    O('open','荷役人の工具で留め金を外し、皆の前で箱を開く','accounts',[set('opened'),set('witnessed'),see('stones','stones')])
  ]);
  s.node('accounts','shore',['workers','accused'],prose('accounts'),[
    O('ledger','箱を持って回収場へ戻り、ガロに台帳の確認を求める','summon')
  ]);
  s.node('summon','landing',['garo'],'箱から出た石をガロへ見せ、給金台帳と入金台帳の確認を求めた。荷役人たちは岸で待っている。',[
    O('ask','ガロに同行を求め、一緒に荷役人の待つ岸へ戻る','gather')
  ]);
  s.node('gather','shore',['garo','workers','accused'],'ガロと岸へ戻った。荷役人たちが立ち上がる。二つの台帳は事務所にあり、まだ読んでいない。',[
    O('office','ガロと荷役人たちを伴い、事務所へ向かう','office')
  ]);
  s.node('office','office',['garo','workers','accused'],'事務所の机に給金台帳と入金台帳がある。ガロと荷役人たちが揃う中で、記載を確かめる。',[
    O('read','二つの台帳を読み、公開照合のため受け取る','office_read',[see('wages','ledger'),see('deposits','ledger'),give('ledger','office','party'),set('ledgerRead')])
  ]);
  s.node('office_read','office',['garo','workers','accused'],'給金台帳には未払額が並び、入金台帳には給金箱へ現金を入れた記録がない。箱と二つの台帳を持ち、皆で岸へ戻って照合する。',[
    O('return','ガロと荷役人たちを伴い、箱と台帳を岸へ運ぶ','compare')
  ]);
  s.node('compare','shore',['garo','workers','accused'],'岸へ戻り、石入りの箱と二つの台帳を皆の前へ並べた。それぞれで確認した内容を突き合わせる。',[
    O('compare','石と未払額と入金記録を公開の場で照合する','ledger',[see('debt','ledger',and(s.known('stones'),s.known('wages'),s.known('deposits')))])
  ]);
  s.node('ledger','shore',['garo','workers','accused'],prose('ledger'),[
    O('settle','ガロの荷車と予備工具を岸で売却し、代金による一部払いを見届ける','@informed',[set('partialPaid'),give('box','party','workers'),give('ledger','party','workers'),set('report')]),
    O('delegate','箱と二つの台帳と目撃報告を荷役人へ渡し、交渉を委ねる','@compromise',[give('box','party','workers'),give('ledger','party','workers'),set('delegated'),set('report')])
  ]);
  s.outcomes=structuredClone(old.outcomes);s.story.endings=structuredClone(old.story.endings);
  const point=(name,x,y)=>({kind:'dungeon',dungeon:'region_1',map:'region_1_canal_c',x,y,event:`q006_wage_box_${name}`});
  const route=connectWorld(s,{landing:point('landing',7,1),water:point('water',6,2),shore:point('shore',7,5),office:point('office',3,5)},2);
  route('entry_lift','water');route('entry_witness','shore');route('water_private_witness','shore');
  route('lifted_private_return','landing');route('workers_recover','water',{companions:['workers','accused']});
  route('lifted_joint_return','shore',{companions:['workers','accused']});route('box_public','shore');
  route('private_retract','shore',{depart:[give('box','garo','party'),set('handed',false)]});
  route('accounts_ledger','landing');route('summon_ask','shore',{companions:['garo']});
  route('gather_office','office',{companions:['garo','workers','accused']});route('office_read_return','shore',{companions:['garo','workers','accused']});
  for(const [id,e] of Object.entries(s.story.entities))s.story.registry[e.holder].values=[...Object.keys(s.story.places),...(e.kind==='item'?Object.keys(s.story.entities).filter(key=>key!==id):[])];
  s.story.endings.informed=and(s.story.endings.informed,s.known('debt'),s.is('partyAt','shore'));
  s.story.endings.compromise=and(s.story.endings.compromise,s.known('debt'),s.is('partyAt','shore'));
  s.story.endings.contract=and(s.story.endings.contract,s.is('partyAt','landing'));
  return s;
}
