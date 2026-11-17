import rows from '../../stories-v11-2.mjs';
import {story,O,give,set,see,and,not} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

export function floatingCoffinSource(){
  const old=rows.find(s=>s.id==='q008'),s=story(8,{shore:'水葬場の岸',threshold:'浅瀬の段差',jetty:'下流の受取桟橋',office:'検査窓口',mortuary:'待棺所',river:'水葬の送り出し岸'},[['shore','threshold'],['threshold','jetty'],['shore','office'],['shore','mortuary'],['jetty','river'],['shore','river']]);
  for(const key of ['brief','past','authoringNotes','revealText','progression'])s[key]=structuredClone(old[key]);
  const prose=id=>old.nodes.find(n=>n.id===id).text;
  s.entity('yoru','shore','yoru').entity('family','shore','family',{kind:'group'}).entity('bearers','shore','bearers',{kind:'group'}).entity('recipient','jetty','recipient').entity('inspector','office','inspector').entity('coffin','threshold').entity('body','coffin').entity('outerBase','coffin').entity('food','outerBase');
  for(const key of ['coffinAt','outerBaseAt','foodAt'])s.story.registry[key].meaning=old.story.registry[key].meaning;
  for(const key of ['consent','inspected','permit','delivered','funeral','postponed','declared'])s.bool(key);
  s.story.propositions=structuredClone(old.story.propositions);
  s.node('entry','shore',['yoru','family','bearers'],prose('entry'),[
    O('inspect','内室を開けずに外底を調べたいと伝え、遺族の了承を得る','consented',[set('consent')]),
    O('tow','担ぎ手と浅瀬の段差へ向かい、重い棺を下流へ曳く準備をする','tow_threshold')
  ]);
  s.node('consented','shore',['yoru','family','bearers'],'遺族は、内室を開けずに外底を調べることを了承した。棺はまだ段差に掛かっている。担ぎ手と引き戻しに向かう。',[
    O('retrieve','担ぎ手と浅瀬の段差へ向かう','inspect_threshold')
  ]);
  s.node('inspect_threshold','threshold',['bearers'],'段差に掛かった棺へ着いた。遺族の了承は得ているが、外底はまだ調べていない。担ぎ手が綱を掛け直した。',[
    O('lift','担ぎ手と棺を段差から外し、岸へ運ぶため引き受ける','inspect_lifted',[give('coffin','threshold','party')])
  ]);
  s.node('inspect_lifted','threshold',['bearers'],'棺を段差から外した。内室と外底を付けたまま、担ぎ手と岸へ運ぶ。外底の中身はまだ確かめていない。',[
    O('return','棺を保持し、担ぎ手と水葬場の岸へ戻る','shore_loaded')
  ]);
  s.node('shore_loaded','shore',['yoru','family','bearers'],'棺を持って岸へ戻った。遺族とヨルが待っている。封じた内室を開けず、棺を据えて外底の点検口を調べる。',[
    O('inspect','棺を岸へ据え、内室を開けず外底を点検する','cargo',[give('coffin','party','shore'),set('inspected'),see('cargo','food')])
  ]);
  s.node('cargo','shore',['yoru','family','bearers'],prose('cargo'),[
    O('declare','外底と食料を分け、内室の水葬を先に行う準備をする','separated',[give('outerBase','coffin','shore'),give('food','outerBase','yoru'),give('coffin','shore','party')]),
    O('quiet','遺族に事情を伝え、棺を遺族と担ぎ手とともに待棺所へ運ぶ','mortuary_arrival')
  ]);
  s.node('tow_threshold','threshold',['bearers'],'担ぎ手と段差へ着いた。棺の周りには水辺の魔物がいる。棺を引き出す前に退ける必要がある。',[
    O('tow','水辺の魔物を退け、棺を段差から引き出す','tow_lifted',[give('coffin','threshold','party')],{combat:true})
  ]);
  s.node('tow_lifted','threshold',['bearers'],'魔物を退け、重い棺を段差から外した。内室と外底は付いたままで、中身は調べていない。下流の受取桟橋へ曳いていく。',[
    O('transport','担ぎ手と棺を下流の受取桟橋へ運ぶ','tow_jetty')
  ]);
  s.node('tow_jetty','jetty',['bearers','recipient'],'重い棺を桟橋まで運んだ。受取人が外底の留め具を確かめる。封じた内室には触れず、外底だけを外して荷を受け取るという。',[
    O('unload','受取人に外底だけを外してもらい、食料を引き渡す','tow_unloaded',[give('outerBase','coffin','jetty'),give('food','outerBase','recipient'),set('delivered')])
  ]);
  s.node('tow_unloaded','jetty',['bearers','recipient'],'受取人は食料を受け取り、外底は桟橋に残った。隊が保持する内室には遺体が封じられたままだ。水葬の送り出し岸へ運ぶ。',[
    O('river','担ぎ手と内室を送り出し岸へ運ぶ','tow_river')
  ]);
  s.node('tow_river','river',['bearers'],'内室を送り出し岸まで運んだ。まだ隊が保持しており、水葬は終わっていない。ここから本来の流れへ戻す。',[
    O('release','封じた内室を本来の水葬経路へ送り出す','@contract',[give('coffin','party','river'),set('funeral')])
  ]);
  s.node('separated','shore',['yoru','family','bearers'],'外底は岸に残し、食料はヨルが預かった。封じた内室を隊が持ち、遺族と担ぎ手とともに送り出し岸へ向かう。',[
    O('river','遺族と担ぎ手を伴い、内室を送り出し岸へ運ぶ','funeral_pending')
  ]);
  s.node('funeral_pending','river',['family','bearers'],'遺族と送り出し岸へ着いた。内室はまだ隊が保持している。ヨルは食料を持って水葬場の岸で待っている。',[
    O('release','遺族とともに、内室を本来の水葬経路へ送り出す','funeral_done',[give('coffin','party','river'),set('funeral')])
  ]);
  s.node('funeral_done','river',['family','bearers'],'遺体を封じた内室を流れへ送り出した。水葬は終わったが、食料の輸送許可はまだない。遺族と担ぎ手と岸へ戻る。',[
    O('return','遺族と担ぎ手を伴い、水葬場の岸へ戻る','returned')
  ]);
  s.node('returned','shore',['yoru','family','bearers'],'水葬を終えて岸へ戻った。食料はヨルが持ち、外底は岸にある。遺族と担ぎ手に別れを告げ、ヨルと検査窓口へ行く。',[
    O('apply','食料を持つヨルと検査窓口へ向かう','application_ready')
  ]);
  s.node('application_ready','office',['yoru','inspector'],'ヨルと検査窓口へ着いた。食料はヨルが持っている。今回の荷の量と行先を申告し、臨時の輸送許可を求める。',[
    O('declare','今回の包みと行先を申告し、臨時許可の審査を依頼する','declared',[set('declared')])
  ]);
  s.node('declared','office',['yoru','inspector'],prose('application'),[
    O('fetch','ヨルと食料を窓口に残し、桟橋へ受取人を迎えに行く','applicant_jetty')
  ]);
  s.node('applicant_jetty','jetty',['recipient'],'受取人のいる桟橋へ着いた。検査窓口で今回の食料について照会したいと伝える。ヨルと食料は窓口に残っている。',[
    O('escort','受取人を検査窓口へ案内する','application')
  ]);
  s.node('application','office',['yoru','recipient','inspector'],'受取人と窓口へ戻った。ヨルの包みの量と行先を、受取人の説明と照合する。窓口へ着いただけでは許可は下りていない。',[
    O('permit','受取人への照会を済ませ、今回一便限りの輸送許可を得る','permitted',[set('permit')])
  ]);
  s.node('permitted','office',['yoru','recipient','inspector'],'今回の食料を運ぶ臨時許可が下りた。恒久的な免税や制度の改正ではない。ヨルと受取人を伴い、食料を桟橋へ運ぶ。',[
    O('deliver','食料を持つヨルと受取人を伴い、下流の桟橋へ向かう','permitted_jetty')
  ]);
  s.node('permitted_jetty','jetty',['yoru','recipient'],'今回の許可を得て桟橋へ着いた。食料はまだヨルが持っている。受取人へ引き渡し、この便の配送を終える。',[
    O('deliver','ヨルから受取人へ食料を引き渡す','@informed',[give('food','yoru','recipient'),set('delivered')])
  ]);
  s.node('mortuary_arrival','mortuary',['family','bearers'],'棺を待棺所へ運んだ。封じた内室と外底は付いたまま、まだ隊が保持している。遺族と相談し、ここへ据えて水葬を延期する。',[
    O('postpone','棺を待棺所へ据え、遺族と水葬の延期を確定する','stored',[give('coffin','party','mortuary'),set('postponed')])
  ]);
  s.node('stored','mortuary',['family','bearers'],'棺を待棺所へ据えた。遺族と担ぎ手はここに残る。食料は外底の中にあり、葬儀を再開する時刻は決めていない。隊が下流の受取人を迎えに行く。',[
    O('fetch','遺族と棺を待棺所に残し、桟橋へ受取人を迎えに行く','quiet_jetty')
  ]);
  s.node('quiet_jetty','jetty',['recipient'],'受取人へ、棺が待棺所にあり、水葬を延期したと伝えた。食料を受け取るため同行してもらい、岸で待つヨルと合流する。',[
    O('escort','受取人を伴い、ヨルの待つ水葬場の岸へ戻る','postponed')
  ]);
  s.node('postponed','shore',['yoru','recipient'],prose('postponed'),[
    O('deliver','ヨルと受取人を伴い、食料のある待棺所へ向かう','handover')
  ]);
  s.node('handover','mortuary',['yoru','recipient','family','bearers'],'ヨルと受取人とともに待棺所へ着いた。遺族は棺のそばで待っている。封じた内室に触れず、外底の食料だけを渡す。',[
    O('give','外底から食料だけを取り出し、受取人へ渡す','handed',[give('food','outerBase','recipient')])
  ]);
  s.node('handed','mortuary',['yoru','recipient','family','bearers'],'食料は受取人の手に渡った。棺と遺族は待棺所に残る。ヨルと受取人を伴い、下流の桟橋まで送り届ける。',[
    O('escort','食料を持つ受取人とヨルを伴い、下流の桟橋へ向かう','quiet_arrival')
  ]);
  s.node('quiet_arrival','jetty',['yoru','recipient'],'食料を持つ受取人と下流の桟橋へ着いた。棺と遺族は待棺所に残り、水葬は延期されたままだ。食料の輸送許可も得ていない。',[
    O('finish','食料を届けたことを確かめ、この仕事を終える','@compromise')
  ]);
  s.outcomes=structuredClone(old.outcomes);s.story.endings=structuredClone(old.story.endings);
  const point=(name,x,y)=>({kind:'dungeon',dungeon:'region_1',map:'region_1_lower_landing',x,y,event:`q008_floating_coffin_${name}`});
  const route=connectWorld(s,{shore:point('shore',7,3),threshold:point('threshold',3,5),jetty:point('jetty',9,7),office:point('office',3,1),mortuary:point('mortuary',1,3),river:point('river',5,7)},3);
  const bearers=['bearers'],funeral=['family','bearers'],delivery=['yoru','recipient'];
  route('entry_tow','threshold',{companions:bearers});route('tow_lifted_transport','jetty',{companions:bearers});route('tow_unloaded_river','river',{companions:bearers});
  route('consented_retrieve','threshold',{companions:bearers});route('inspect_lifted_return','shore',{companions:bearers});
  route('separated_river','river',{companions:funeral});route('funeral_done_return','shore',{companions:funeral});route('returned_apply','office',{companions:['yoru']});
  route('declared_fetch','jetty');route('applicant_jetty_escort','office',{companions:['recipient']});route('permitted_deliver','jetty',{companions:delivery});
  route('cargo_quiet','mortuary',{depart:[give('coffin','shore','party')],companions:funeral});route('stored_fetch','jetty');route('quiet_jetty_escort','shore',{companions:['recipient']});
  route('postponed_deliver','mortuary',{companions:delivery});route('handed_escort','jetty',{companions:delivery,arrive:[set('delivered')]});
  for(const [id,e] of Object.entries(s.story.entities))s.story.registry[e.holder].values=[...Object.keys(s.story.places),...(e.kind==='item'?Object.keys(s.story.entities).filter(key=>key!==id):[])];
  s.story.endings.informed=and(s.story.endings.informed,s.is('partyAt','jetty'),s.is('declared'),s.is('coffinAt','river'),s.is('outerBaseAt','shore'));
  s.story.endings.contract=and(s.story.endings.contract,s.is('partyAt','river'),s.is('outerBaseAt','jetty'),s.is('foodAt','recipient'));
  s.story.endings.compromise=and(s.story.endings.compromise,s.is('partyAt','jetty'),not(s.is('permit')),s.is('foodAt','recipient'));
  // Group illustrations contain several faces. Put groups behind the individual
  // speakers, keeping both rows clear of the HUD and dialogue at narrow widths.
  for(const scene of Object.values(s.story.scenes)){
    const groups=scene.cast.filter(c=>['family','bearers'].includes(c.entity)),people=scene.cast.filter(c=>!groups.includes(c));
    if(groups.length&&people.length){
      groups.forEach((c,i)=>c.display={x:groups.length===1?50:[25,75][i],y:25,scale:.5,cardScale:1,layer:i});
      people.forEach((c,i)=>c.display={x:people.length===1?50:[25,75][i],y:3,scale:.5,cardScale:1,layer:10+i});
    }else scene.cast.forEach((c,i)=>c.display={x:scene.cast.length===1?50:scene.cast.length===2?[25,75][i]:[20,50,80][i],y:10,scale:scene.cast.length===1?.75:.5,cardScale:1,layer:i});
  }
  return s;
}
