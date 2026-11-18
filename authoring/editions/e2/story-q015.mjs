import {story,O,set,give,see,and,or,not,when} from '../../story-kit.mjs';
import {connectWorld} from '../../world-story-kit.mjs';

export const weepingPillarPlaces={pillar:'泣く塩柱の前',underPillar:'台座の収納室',crack:'柱内部の割れ目',dryRoom:'礼拝堂の乾いた保管室',records:'坑務記録の照会窓口',families:'遺族への照会室',display:'名簿の公開室'};
const point=(key,x,y)=>({kind:'dungeon',dungeon:'region_2',map:'region_2_f1',x,y,event:'q015_weeping_pillar_'+key});
export const weepingPillarWorld={pillar:point('pillar',9,11),underPillar:point('storage',9,10),crack:point('crack',9,9),dryRoom:{kind:'town',location:'e2_pillar_archive'},records:{kind:'town',location:'e2_pillar_records'},families:{kind:'town',location:'e2_pillar_families'},display:{kind:'town',location:'e2_pillar_display'}};
export const weepingPillarLocations=Object.fromEntries([
 ['archive','灯帰りの礼拝堂・保管室','e2_cart_surface','廃坑の搬出口から続く礼拝堂の乾いた保管室。湿った原本と写しを別々に受け入れる。','location_medical'],
 ['records','礼拝堂・坑務記録窓口','e2_pillar_archive','坑務記録の控えを照会する窓口。記録の回答と遺族の確認は別に扱う。','location_checkpoint'],
 ['families','礼拝堂・遺族の照会室','e2_pillar_archive','遺族が名簿の照合に立ち会う部屋。推測で名前を補うことはしない。','location_square'],
 ['display','礼拝堂・名簿の公開室','e2_pillar_archive','保存した原本の状態と、写しの確認範囲を添えて公開する部屋。','location_square']
].map(([key,name,parent,description,background])=>['e2_pillar_'+key,{id:'e2_pillar_'+key,name,parent,description,background,links:[]}]));
export function extendWeepingPillarGeography(bundle){Object.assign(bundle.additions.locations,structuredClone(weepingPillarLocations));}
export function weepingPillarSource(){
 const s=story(15,weepingPillarPlaces,[['pillar','underPillar'],['pillar','crack'],['underPillar','dryRoom'],['dryRoom','records'],['records','families'],['families','dryRoom'],['dryRoom','crack'],['dryRoom','display']]);
 s.entity('maya','pillar','e2_weeping_pillar_maya').entity('keeper','dryRoom','e2_weeping_pillar_keeper').entity('clerk','records','e2_weeping_pillar_clerk').entity('family','families','e2_weeping_pillar_family');
 s.entity('roster','underPillar').entity('copy','underPillar').entity('sample','crack').entity('record','clerk').entity('confirmation','family').entity('report','party');
 s.enum('route','pending',['pending','copy','chapel','informed','missing','deposit','seal']);
 s.int('lostNames',3,3,3).int('restoredNames',0,0,3);
 for(const k of ['protected','copied','recordsChecked','familiesChecked','waterStudied','published','blankPublished','sealed','diverted','deposited','recordsRequested','familyHeard','sampleCollected','crackInspected','reportReady'])s.bool(k);
 s.fact('names','原本の三名は来訪時点ですでに読めなかった。坑務記録と遺族の確認を照合し、別記録に復元した。');
 s.fact('water','採取した塩水と柱内部の割れ目を調べると、塩層からの水が台座の収納室へ伝わっていた。');
 const route=k=>s.is('route',k),depositRoute=or(route('chapel'),route('deposit'));
 s.node('entry','pillar',['maya'],'目元から落ちた塩水が、台座の亀裂を伝って収納室へ入っている。名簿の三名は、来た時点ですでに読めなかった。マヤは乾布を手にしている。「今ある名まで消える前に」。',[
  O('catch','受け皿で滴をそらし、読める名前を写す方針を選ぶ','tray_ready',[set('route','copy')]),
  O('exorcise','柱内部の割れ目を塞ぐため、調べに向かう','seal_arrival',[set('route','seal')]),
  O('chapel','筆写をせず、原本を保護して礼拝堂へ運ぶ方針を選ぶ','direct_ready',[set('route','chapel')])
 ]);
 s.node('tray_ready','pillar',['maya'],'受け皿はまだ置いていない。台座へ流れる滴を名簿からそらす。',[O('divert','受け皿を据え、滴の流れを名簿からそらす','diverted',[set('diverted')])]);
 s.node('diverted','pillar',['maya'],'滴は収納室から外れた。湿った原本はまだそのままで、三名も読めない。マヤと収納室へ下りる。',[O('storage','マヤと台座の収納室へ向かう','storage_arrival')]);
 s.node('direct_ready','pillar',['maya'],'原本を保管室へ移す方針を決めた。まだ原本には触れていない。マヤと収納室へ下りる。',[O('storage','マヤと原本のある収納室へ向かう','storage_arrival')]);
 s.node('storage_arrival','underPillar',['maya'],'収納室へ着いた。名簿は台座の下で湿っている。まず吸水用の乾布で挟み、残る文字を守る。',[O('protect','原本を乾布で挟み、乾燥と保護の処置をする','protected',[set('protected')])]);
 s.node('protected','underPillar',['maya'],'原本を乾布で保護した。まだ持ち出しておらず、写しも作っていない。',[
  O('copy','読める名前を別紙に写し、三名は空欄のまま残す','copy',[set('copied'),give('copy','underPillar','party')],{when:route('copy')}),
  O('carry','筆写をせず、保護した原本を運ぶ準備をする','pack_ready',[],{when:route('chapel')})
 ]);
 s.node('copy','underPillar',['maya'],'読める名の写しができた。三つの空欄を前に、マヤが坑務記録と遺族への照会先を示す。どちらか一方の記憶だけで埋めることはできない。',[
  O('complete','坑務記録と遺族を照合し、水の由来とともに公開する方針を選ぶ','pack_ready',[set('route','informed')]),
  O('missing','三名を空欄とし、照会先を添えて公開する方針を選ぶ','pack_ready',[set('route','missing')]),
  O('deposit','公開を見送り、原本と写しを保管室へ預ける方針を選ぶ','pack_ready',[set('route','deposit')])
 ]);
 s.node('pack_ready','underPillar',['maya'],'方針を決めた。保護した原本はまだ収納室にある。乾布ごと受け取り、隊が運ぶ。',[O('take','乾布に包んだ原本を受け取る','packed',[give('roster','underPillar','party')])]);
 s.node('packed','underPillar',['maya'],'原本を隊の荷に収めた。マヤも同行する。廃坑の昇降場から地上の搬出口を経て、礼拝堂の保管室へ運ぶ。',[O('archive','マヤと原本を礼拝堂の保管室へ運ぶ','archive_arrival')]);
 s.node('archive_arrival','dryRoom',['maya','keeper'],'乾いた保管室へ着いた。原本はまだ隊の荷にあり、受入れは済んでいない。',[O('deposit','保管係の前で原本を引き渡し、乾いた棚へ預託する','archive_ready',[give('roster','party','dryRoom'),set('deposited')])]);
 s.node('archive_ready','dryRoom',['maya','keeper'],'原本を保管室へ預けた。原本で三名が読めなかった事実は変わらない。マヤと保管係はここに残る。',[
  O('finish','筆写と公開をせず、原本の保護と預託を終える','@compromise',[],{when:route('chapel')}),
  O('store_copy','作成済みの写しも原本と分けて保管室へ渡す','copy_deposited',[give('copy','party','dryRoom')],{when:route('deposit')}),
  O('records','原本を保管室に残し、坑務記録の窓口へ向かう','records_arrival',[],{when:route('informed')}),
  O('prepare','三名の空欄、照会先、後日の訂正方法を公開用の説明紙へ記す','report_ready',[set('reportReady')],{when:route('missing')})
 ]);
 s.node('copy_deposited','dryRoom',['maya','keeper'],'原本と作成済みの写しを、別々に乾いた保管室へ預けた。消えた三名は未照合であり、水の由来も調べていない。',[O('finish','公開を見送り、原本と写しの預託を終える','@compromise')]);
 s.node('records_arrival','records',['clerk'],'坑務記録の窓口へ着いた。窓口の係員へ事故当時の記録を照会する。',[O('request','事故当時の坑務記録を照会する','records_requested',[set('recordsRequested')])]);
 s.node('records_requested','records',['clerk'],'照会を受け付けた係員が記録を探している。回答の受取りと内容の確認はまだ済んでいない。',[O('receive','回答の控えを受け取り、該当する記録を確認する','records_received',[give('record','clerk','party'),set('recordsChecked')])]);
 s.node('records_received','records',['clerk'],'坑務記録の控えを受け取った。三名はまだ復元していない。遺族の確認と照らし合わせるため照会室へ向かう。',[O('families','控えと写しを持ち、遺族への照会室へ向かう','families_arrival')]);
 s.node('families_arrival','families',['family'],'照会室へ着いた。遺族に、原本で三名が読めなかった事情と坑務記録の内容を説明する。',[O('consult','遺族に記録を示し、名前と事故当時の事情を確かめる','family_heard',[set('familyHeard')])]);
 s.node('family_heard','families',['family'],'遺族の話を聞いた。確認内容を記した書面を受け取り、照合する際の根拠として保管する。',[O('receive','遺族が確認した書面を受け取る','evidence_ready',[give('confirmation','family','party'),set('familiesChecked')])]);
 s.node('evidence_ready','families',['family'],'坑務記録の控えと遺族の確認書がそろった。まだ三名を復元していない。保管室へ戻って二つの資料を照合する。',[O('return','二つの資料と写しを持って保管室へ戻る','compare_ready')]);
 s.node('compare_ready','dryRoom',['maya','keeper'],'マヤのいる保管室へ戻った。二つの資料を照合し、双方で確かめられた名前だけを別記録へ復元する。',[O('reconcile','二つの資料を照合して三名を別記録に復元し、根拠資料を預ける','restored',[set('restoredNames',3),give('record','party','dryRoom'),give('confirmation','party','dryRoom'),see('names','maya')])]);
 s.node('restored','dryRoom',['maya'],'三名を別記録に復元した。原本で失われていたことも併記し、原本そのものが読めるようになったとはしない。水の由来を調べるため、隊だけで塩柱の割れ目へ戻る。',[O('water','採取容器を用意し、廃坑の割れ目へ戻る','water_arrival')]);
 s.node('water_arrival','crack',[],'柱内部の割れ目へ着いた。水はまだ採取しておらず、ここへ来ただけでは由来は分からない。',[O('sample','滴る水を容器へ採取し、採取場所を記す','sampled',[give('sample','crack','party'),set('sampleCollected')])]);
 s.node('sampled','crack',[],'試料を採取した。水がどこを通って来るか、割れ目と塩層のつながりを確かめる。',[O('inspect','割れ目と塩層からの水路を調べ、観察記録を残す','crack_checked',[set('crackInspected')])]);
 s.node('crack_checked','crack',[],'割れ目の観察を記録した。試料と照らし合わせる前に由来を断定しない。試料を保管室へ運ぶ。',[O('return','採取した水と観察記録を保管室へ持ち帰る','water_review')]);
 s.node('water_review','dryRoom',['maya'],'試料を持って保管室へ戻った。試料と割れ目の観察記録を照らし合わせ、水の由来を確かめる。',[O('study','塩水の試料と水路の記録を照合し、試料を保管する','water_studied',[set('waterStudied'),give('sample','party','dryRoom'),see('water','maya')])]);
 s.node('water_studied','dryRoom',['maya'],'塩層からの水が割れ目を通って収納室へ伝わっていた。名簿の復元根拠と、水の由来を示す資料を公開用にまとめる。',[O('prepare','原本の欠損、三名の照合根拠、水の由来を説明紙へまとめる','report_ready',[set('reportReady')])]);
 s.node('report_ready','dryRoom',['maya'],when(route('missing'),'読める名前と三つの空欄、照会先、後日の訂正方法をまとめた。名前の復元と水の由来の調査はしていない。','復元した三名の根拠と原本の欠損、水の由来をまとめた。原本と根拠資料は保管室へ残す。'),[O('display','写しと説明紙を公開室へ運ぶ','display_arrival')]);
 s.node('display_arrival','display',[],'公開室へ着いた。写しと説明紙は隊の手元にあり、まだ公開していない。',[O('publish','写しと説明紙を掲示し、確認した範囲を公開する','published',[give('copy','party','display'),give('report','party','display'),set('published'),set('blankPublished',s.is('route','missing'))])]);
 s.node('published','display',[],when(route('missing'),'読める名と三つの空欄を公開した。原本で読めなかった事実と照会先を残し、後日訂正できる。水の由来は未調査である。','原本の欠損と三名の復元根拠、水の由来を示す資料を公開した。原本と根拠資料は保管室にある。'),[
  O('finish','三名を空欄にした公開を終える','@missing',[],{when:route('missing')}),
  O('finish_informed','名簿の照合と水の由来の公開を終える','@informed',[],{when:route('informed')})
 ]);
 s.node('seal_arrival','crack',[],'柱内部の割れ目へ来た。収納室には湿った名簿が残っている。割れ目を塞いでも、失われた三名は戻らない。',[O('seal','割れ目を塞ぎ、新たな滴を止める','sealed',[set('sealed')])]);
 s.node('sealed','crack',[],'新たな滴を止めた。名簿の乾燥処置や筆写はしていない。柱の前のマヤへ報告する。',[O('return','柱の前で待つマヤへ戻る','seal_report')]);
 s.node('seal_report','pillar',['maya'],'マヤへ止水を報告した。湿った原本は収納室に残り、保存処置と三名の照合は未実施である。',[O('finish','止水のみを行ったことを報告して終える','@contract')]);
 const journey=connectWorld(s,weepingPillarWorld,1);
 journey('entry_exorcise','crack',{depart:[set('route','seal')]});
 for(const key of ['diverted_storage','direct_ready_storage'])journey(key,'underPillar',{companions:['maya']});
 journey('packed_archive','dryRoom',{companions:['maya']});
 journey('archive_ready_records','records');journey('records_received_families','families');journey('evidence_ready_return','dryRoom');
 journey('restored_water','crack');journey('crack_checked_return','dryRoom');journey('report_ready_display','display');journey('sealed_return','pillar');
 const archived=and(s.is('protected'),s.is('deposited'),s.is('rosterAt','dryRoom'));
 s.story.endings={contract:and(s.is('sealed'),route('seal'),s.is('partyAt','pillar')),compromise:and(archived,depositRoute,s.is('partyAt','dryRoom'),or(route('chapel'),s.is('copyAt','dryRoom'))),informed:and(archived,s.is('copied'),s.is('recordsChecked'),s.is('familiesChecked'),s.is('restoredNames',3),s.is('waterStudied'),s.is('published'),route('informed')),missing:and(archived,s.is('copied'),s.is('blankPublished'),s.is('restoredNames',0),s.is('published'),route('missing'))};
 s.invariant('lost-names',s.is('lostNames',3),'原本で失われていた三名の事実を保持する');
 s.invariant('copy',or(not(s.is('copied')),and(s.is('protected'),s.is('diverted'))),'滴をそらして保護した原本から読める名を写す');
 s.invariant('archive',or(not(s.is('deposited')),and(s.is('protected'),s.is('rosterAt','dryRoom'))),'原本の現物預託は保護と運搬後に行う');
 s.invariant('restoration',or(s.is('restoredNames',0),and(s.is('restoredNames',3),s.is('recordsChecked'),s.is('familiesChecked'),s.is('recordAt','dryRoom'),s.is('confirmationAt','dryRoom'))),'二系統の根拠を照合してから別記録に三名を復元する');
 s.invariant('water',or(not(s.is('waterStudied')),and(s.is('sampleCollected'),s.is('crackInspected'),s.is('sampleAt','dryRoom'))),'採取と割れ目の調査を照合してから水の由来を確定する');
 s.invariant('publication',or(not(s.is('published')),and(archived,s.is('reportReady'),s.is('copyAt','display'),s.is('reportAt','display'))),'原本を保管し、写しと説明紙の現物を公開する');
 s.invariant('blank',or(not(s.is('blankPublished')),and(route('missing'),s.is('restoredNames',0),not(s.is('recordsChecked')),not(s.is('familiesChecked')),not(s.is('waterStudied')),s.is('published'))),'空欄公開に照合や由来調査を先取りしない');
 s.invariant('seal-only',or(not(route('seal')),and(not(s.is('protected')),not(s.is('copied')),s.is('rosterAt','underPillar'),s.is('restoredNames',0))),'止水だけで原本を保護・移動・復元しない');
 s.invariant('fixed-people',and(s.is('keeperAt','dryRoom'),s.is('clerkAt','records'),s.is('familyAt','families')),'保管係・窓口係・遺族はそれぞれの場所にいる');
 for(const scene of Object.values(s.story.scenes))for(const [i,c] of scene.cast.entries()){
  c.when=s.is(c.entity+'At',scene.place);c.display={x:scene.cast.length===2?[30,70][i]:50,y:10,scale:1,cardScale:1,layer:i};
 }
 return s.done();
}
export const weepingPillarCharacters=Object.fromEntries([['maya','マヤ','残る名を守り、照合した内容と水の由来を区別して伝える'],['keeper','礼拝堂の保管係','原本と写し、照合資料と試料を分けて保管する'],['clerk','坑務記録の係員','事故当時の記録を調べ、照会の回答を渡す'],['family','照会に応じる遺族','失われた三名を坑務記録とともに確かめる']].map(([key,name,goal])=>['e2_weeping_pillar_'+key,{id:'e2_weeping_pillar_'+key,name,goal,quests:['q015'],detail:'原稿の役割を現地の行為に分ける。外見は未設定。専用画像のない人物は名前で表示する。'}]));
