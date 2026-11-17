import rows from '../../stories-v11-2.mjs';
import {story,O,give,set,see,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';
import {sluiceMaps,sluiceMap} from './sluice-geography.mjs';

export function sluiceSource(){
  const old=rows.find(s=>s.id==='q010'),s=story(10,{...sluiceMaps},[['control','near'],['near','deep'],['near','landing'],['control','shaft'],['shaft','upper'],['upper','ground'],['control','ground']]);
  for(const key of ['brief','past','authoringNotes','revealText','progression'])s[key]=structuredClone(old[key]);
  s.entity('keeper','control','gatekeeper').entity('rine','ground','rine').entity('nearPeople','near','nearpeople',{kind:'group'}).entity('deepPeople','deep','deeppeople',{kind:'group'}).entity('crew','ground','pumpcrew',{kind:'group'}).entity('book','landing').entity('rescueRope','keeper');
  for(const key of ['shaftChecked','ropeRigged','nearSaved','deepSaved','bookSaved','closed','pumpHandover','testimony','filed','shaftOpened','bottomChecked','topChecked','handoverRequested','crewCalled'])s.bool(key);
  s.story.propositions=structuredClone(old.story.propositions);
  const both=and(s.is('nearSaved'),s.is('deepSaved')),neither=and(not(s.is('nearSaved')),not(s.is('deepSaved'))),partial=and(not(both),not(neither));
  const counts=[when(s.is('nearSaved'),'手前三人は地上で人数確認済み。','手前三人は内側に残っている。'),when(s.is('deepSaved'),'奥二人は地上で人数確認済み。','奥二人は内側に残っている。'),when(s.is('bookSaved'),'帳簿はリネが預かっている。','帳簿は踊り場にある。')];
  s.node('entry','control',['keeper'],old.nodes.find(n=>n.id==='entry').text,[
    O('shaft','旧縦坑の地下側へ向かい、避難路を調べる','shaft_arrival'),
    O('close','五人が残ることを確認し、閉門する','closed',[set('closed')]),
    O('pump','排水隊への引継ぎのため、旧縦坑の地下側へ向かう','shaft_arrival')
  ]);
  s.node('shaft_arrival','shaft',[],'封鎖札の残る旧縦坑の地下側へ着いた。まだ封鎖を解いておらず、足場・換気・縄の固定点も未確認だ。',[
    O('open','封鎖札と入口の留め具を外す','shaft_open',[set('shaftOpened')])
  ]);
  s.node('shaft_open','shaft',[],'縦坑の入口を開けた。開通と安全確認は別だ。地下側の足場、通気、縄を固定する金具を一つずつ調べる。',[
    O('inspect','地下側の足場・換気・固定点を検査する','shaft_ready',[set('bottomChecked')])
  ]);
  s.node('shaft_ready','shaft',[],'地下側を検査した。調査隊が足場を確かめながら上端へ進める。住民を通すのは、地上側も検査してリネへ連絡した後だ。',[
    O('climb','旧縦坑を上り、地上側の検査点へ向かう','upper_arrival')
  ]);
  s.node('upper_arrival','upper',[],'旧縦坑の地上側へ着いた。上端の足場、通気口、縄の固定金具を確認するまでは避難路として供用しない。',[
    O('inspect','地上側の足場・換気・固定点を検査する','upper_ready',[set('topChecked')])
  ]);
  s.node('upper_ready','upper',[],'縦坑の上下端を検査した。地上の救助口でリネに連絡し、避難者の到着を記録する準備を整える。',[
    O('contact','地上の救助口へ歩き、リネを訪ねる','inspection_report')
  ]);
  s.node('inspection_report','ground',['rine'],'リネは帰還名簿を広げている。上下端の検査結果を伝え、ここで避難者の到着人数を確認してもらう。まだ住民は到着していない。',[
    O('register','検査結果を伝え、避難路の供用と到着確認を申し合わせる','inspection_done',[set('shaftChecked')])
  ]);
  s.node('inspection_done','ground',['rine'],'縦坑の検査結果と帰還確認の手順をリネに伝えた。住民の救助に戻るか、依頼していた排水隊を招集する。',[
    O('return','操作室へ戻り、門番に検査結果を伝える','keeper_report',[],{when:not(s.is('handoverRequested'))}),
    O('summon','リネに排水隊の招集を頼む','crew_ready',[set('crewCalled')],{when:s.is('handoverRequested')})
  ]);
  s.node('keeper_report','control',['keeper'],'門番のいる操作室へ戻った。縦坑が避難に使えることを伝え、門番が閉門を待っていた事情を聞く。',[
    O('listen','門番から、未承認工事と閉門を待っていた理由を聞く','operations',[see('delay','keeper')])
  ]);
  s.node('operations','control',['keeper'],['旧縦坑は上下端の検査とリネへの連絡を済ませた。救助と帳簿回収の順番は選べる。',...counts,when(s.is('ropeRigged'),'救助縄は奥の渡りに固定してある。','救助縄は門番が保持している。')],[
    O('near','手前の避難通路へ向かい、三人を迎えに行く','near_arrival',[],{when:not(s.is('nearSaved'))}),
    O('deep','奥二人の救助に使う縄を門番から受け取る','rope_received',[give('rescueRope','keeper','party')],{when:not(s.is('deepSaved'))}),
    O('book','帳簿のある踊り場へ向かう','book_arrival',[],{when:not(s.is('bookSaved'))}),
    O('all','五人の到着記録を確認し、渡りの縄を回収しに行く','rope_recovery',[],{when:both}),
    O('partial','確認済みの組だけを確定し、残る組を断念して閉門する','closed',[set('closed')],{when:partial}),
    O('close','五人が内側に残ることを確認して閉門する','closed',[set('closed')],{when:neither}),
    O('pump','地上のリネを訪ね、排水隊の招集を頼む','crew_request')
  ]);
  s.node('near_arrival','near',['nearPeople'],'手前の三人が通路で待っている。縦坑の安全確認は済んでいるが、三人はまだ地上へ避難していない。',[
    O('escort','三人と合流し、操作室・旧縦坑を通って地上へ同行する','near_ground')
  ]);
  s.node('near_ground','ground',['rine','nearPeople'],'手前三人と地上の救助口へ着いた。リネの名簿で人数を確認してから救助済みと記録する。',[
    O('confirm','リネと三人の人数・帰還を照合する','near_confirmed',[set('nearSaved')])
  ]);
  s.node('near_confirmed','ground',['rine','nearPeople'],'手前三人の地上帰還を名簿へ記した。三人はここに残り、隊は操作室へ戻る。',[
    O('return','三人を地上に残し、操作室へ戻る','operations',[],{once:false})
  ]);
  s.node('rope_received','control',['keeper'],'救助縄を門番から受け取った。縄はまだ隊が持っている。奥の渡りに固定してから二人を迎える。',[
    O('near','手前通路の渡りへ縄を運ぶ','rope_site')
  ]);
  s.node('rope_site','near',[],'奥の区画へ渡る足場の手前に着いた。救助縄は隊が保持している。固定点へ張るまでは渡れない。',[
    O('rig','救助縄を渡りの固定点へ張る','rope_ready',[give('rescueRope','party','near'),set('ropeRigged')])
  ]);
  s.node('rope_ready','near',[],'救助縄を渡りへ固定した。縄を持ち去らず、固定したまま奥の二人を迎えに行く。',[
    O('deep','固定した縄を使い、奥の作業区画へ向かう','deep_arrival')
  ]);
  s.node('deep_arrival','deep',['deepPeople'],'奥の二人を見つけた。渡りの縄を使って手前へ戻り、安全側の操作室と旧縦坑を経て地上へ案内する。',[
    O('escort','二人と合流し、渡り・操作室・旧縦坑を通って地上へ同行する','deep_ground')
  ]);
  s.node('deep_ground','ground',['rine','deepPeople'],'奥二人と地上の救助口へ着いた。渡りの縄は地下に固定したままだ。リネと帰還人数を確認する。',[
    O('confirm','リネと二人の人数・帰還を照合する','deep_confirmed',[set('deepSaved')])
  ]);
  s.node('deep_confirmed','ground',['rine','deepPeople'],'奥二人の帰還を名簿へ記した。二人は地上に残る。救助縄は撤収まで渡りへ固定しておく。',[
    O('return','二人を地上に残し、操作室へ戻る','operations',[],{once:false})
  ]);
  s.node('book_arrival','landing',[],'踊り場に工事の帳簿が残っている。帳簿はまだ回収しておらず、記載内容も確かめていない。',[
    O('take','踊り場から帳簿を回収する','book_held',[give('book','landing','party')])
  ]);
  s.node('book_held','landing',[],'帳簿を隊の荷物に収めた。運ぶ前に記載と承認欄を確かめる。',[
    O('read','工事の記載と検査印・契約印の欄を調べる','book_read',[see('book','book')])
  ]);
  s.node('book_read','landing',[],'帳簿には必要な検査印と契約印が欠けている。帳簿だけで責任を裁定せず、地上で原本を保管してもらう。',[
    O('carry','帳簿を保持して地上のリネへ運ぶ','book_ground')
  ]);
  s.node('book_ground','ground',['rine'],'帳簿を持って地上へ着いた。まだ隊が保持している。リネへ原本を引き渡し、保管先を記録する。',[
    O('deposit','帳簿をリネへ預け、原本の保管を記録する','book_deposited',[give('book','party','rine'),set('bookSaved')])
  ]);
  s.node('book_deposited','ground',['rine'],'帳簿はリネが預かった。門番本人の証言をそろえた調査報告はまだ作っていない。',[
    O('return','帳簿をリネに預けたまま操作室へ戻る','operations',[],{once:false})
  ]);
  s.node('rope_recovery','near',[],'五人全員の地上到着を確認して、渡りへ戻った。救助縄は固定したまま残っている。',[
    O('recover','渡りの救助縄を外して回収する','rope_recovered',[give('rescueRope','near','party'),set('ropeRigged',false)])
  ]);
  s.node('rope_recovered','near',[],'救助縄を回収した。五人は地上におり、奥の渡りを使う避難者は残っていない。操作室へ戻って閉門する。',[
    O('return','回収した縄を持って操作室へ戻る','close_ready')
  ]);
  s.node('close_ready','control',['keeper'],'手前三人・奥二人の帰還と縄の回収が済んだ。門番は安全側の操作室にいる。閉門すると機構が固着し、内側へ戻れなくなる。',[
    O('close','五人の帰還を確認して水門を閉じる','closed',[set('closed')])
  ]);
  s.node('closed','control',['keeper'],['水門を閉じた。機構が固着し、住民側の通路は往復とも通れない。門番と隊は安全側の操作室にいる。',...counts],[
    O('escape','門番と操作梯子を上り、地上へ脱出する','ground')
  ]);
  s.node('crew_request','ground',['rine'],['リネのいる地上救助口へ来た。現在の救助数を伝えて排水隊を招集する。',...counts],[
    O('summon','リネに排水隊の招集を頼む','crew_ready',[set('crewCalled')])
  ]);
  s.node('crew_ready','ground',['rine','crew'],'リネが招集した排水隊が合流した。現場の引継ぎはまだ済んでいない。機材を持つ隊を、検査済みの旧縦坑から操作室へ案内する。',[
    O('escort','排水隊と合流し、旧縦坑を下りて操作室へ案内する','crew_control')
  ]);
  s.node('crew_control','control',['keeper','crew'],['排水隊が操作室へ着いた。救助済み人数、残留者の位置、縦坑の検査、帳簿の保管先を申し送る。',...counts],[
    O('handover','現場の状態を申し送り、排水隊へ引き継ぐ','handover_done',[set('pumpHandover')])
  ]);
  s.node('handover_done','control',['keeper','crew'],'排水隊へ引き継いだ。水門は閉じていない。排水隊は操作室に残り、門番と隊は操作梯子で地上へ出る。',[
    O('escape','排水隊を現場に残し、門番と操作梯子で地上へ出る','ground')
  ]);
  s.node('ground','ground',['keeper','rine'],[when(s.is('closed'),'門番と操作梯子から地上へ脱出した。閉門した水門は固着している。','門番と地上へ出た。水門は開いたまま、排水隊が操作室を引き継いでいる。'),...counts],[
    O('testimony','帳簿と門番本人の証言をリネの報告に載せる','@informed',[set('testimony'),set('filed')],{when:and(s.is('closed'),both,s.is('bookSaved'))}),
    O('rescue','全員の救助報告だけで区切る','@rescued',[],{when:and(s.is('closed'),both)}),
    O('partial','帰還を確認した組だけを報告し、残る組の生死は未確認と記す','@partial',[],{when:and(s.is('closed'),partial)}),
    O('contract','五人の帰還は未確認のまま、閉門の完了を報告する','@contract',[],{when:and(s.is('closed'),neither)}),
    O('pump','現場を引き継いだ排水隊と、確認できた救助数を報告する','@compromise',[],{when:s.is('pumpHandover')})
  ]);
  s.outcomes=structuredClone(old.outcomes);s.story.endings=structuredClone(old.story.endings);
  const world=Object.fromEntries(Object.keys(sluiceMaps).map(key=>[key,{kind:'dungeon',dungeon:'region_1',map:sluiceMap(key),x:3,y:2,event:'q010_sluice_'+key}]));
  const route=connectWorld(s,world,2);
  for(const [key,to] of [['entry_shaft','shaft'],['shaft_ready_climb','upper'],['upper_ready_contact','ground'],['inspection_done_return','control'],['operations_near','near'],['operations_book','landing'],['operations_all','near'],['operations_pump','ground'],['near_confirmed_return','control'],['rope_received_near','near'],['rope_ready_deep','deep'],['deep_confirmed_return','control'],['book_read_carry','ground'],['book_deposited_return','control'],['rope_recovered_return','control']])route(key,to);
  route('entry_pump','shaft',{depart:[set('handoverRequested')]});
  route('near_arrival_escort','ground',{companions:['nearPeople']});route('deep_arrival_escort','ground',{companions:['deepPeople']});
  route('crew_ready_escort','control',{companions:['crew']});
  for(const key of ['closed_escape','handover_done_escape'])route(key,'ground',{companions:['keeper']});
  for(const key of Object.keys(s.story.endings))s.story.endings[key]=and(s.story.endings[key],s.is('partyAt','ground'),s.is('keeperAt','ground'));
  for(const [group,flag] of [['nearPeople','nearSaved'],['deepPeople','deepSaved']])s.invariant(flag,or(not(s.is(flag)),s.is(group+'At','ground')),'名簿確認済みの住民は地上に残る');
  s.invariant('inspections',or(not(s.is('shaftChecked')),and(s.is('shaftOpened'),s.is('bottomChecked'),s.is('topChecked'))),'上下端の検査を終えてから避難路を供用する');
  s.invariant('rope-holder',{op:'eq',left:s.v('ropeRigged'),right:s.is('rescueRopeAt','near')},'固定した縄は渡りに保持する');
  s.invariant('book-holder',{op:'eq',left:s.v('bookSaved'),right:s.is('bookAt','rine')},'預託した帳簿はリネが保持する');
  s.invariant('fixed-rine',s.is('rineAt','ground'),'リネは地上で帰還を確認する');
  s.invariant('handover',or(not(s.is('pumpHandover')),and(s.is('crewCalled'),s.is('crewAt','control'),not(s.is('closed')))),'現場到着後に開いた水門を引き継ぐ');
  for(const scene of Object.values(s.story.scenes))scene.cast=scene.cast.map((c,i)=>({...c,when:s.is(c.entity+'At',scene.place),display:scene.cast.length===1?{x:50,y:10,scale:.7,cardScale:1}:i===0?{x:25,y:3,scale:.5,cardScale:1}:{x:75,y:25,scale:.5,cardScale:1}}));
  return s.done();
}
