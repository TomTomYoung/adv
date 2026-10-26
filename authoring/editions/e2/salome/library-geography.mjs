import {geographyFingerprint} from '../../../../src/core/edition-geography.js';
export async function extendLibraryGeography(bundle,previous,dungeons){
 const t=bundle.travel,locations=bundle.additions.locations;
 const city=bundle.patches.find(p=>p.id==='e2_academy').value;
 city.dungeons=['region_5','region_8'];
 city.description+=' 灰時計の書庫へは閲覧所脇の石段、鉄胎の機関廟へは外縁の作業口から下りる。';
 const home=previous.patches.find(p=>p.id==='hikarigaeri_square').value;
 bundle.patches.push({group:'locations',id:home.id,sha256:await geographyFingerprint(home),value:{...structuredClone(home),dungeons:home.dungeons.filter(id=>!city.dungeons.includes(id))}});
 locations.salome_board.description='書庫・機関廟の地域依頼40件と、イル・ミカの相談を受け付ける。受注した依頼は手帳に残る。';
 for(const [id,route,start] of [['region_5','library_surface',41],['region_8','machine_surface',71]]){
  t.dungeonSettlements[id]='salome';t.previousDungeonSettlements[id]='hikarigaeri';
  for(const m of dungeons[id].maps)t.mapCountries[m]='tornea';
  for(const n of [...Array.from({length:10},(_,i)=>start+i),...Array.from({length:10},(_,i)=>start+100+i)])t.questSettlements['q'+String(n).padStart(3,'0')]='salome';
  t.routes.push({id:route,name:'サロメと'+dungeons[id].name+'の石段',a:{kind:'dungeon',dungeon:id,map:id+'_f1',x:1,y:1,facing:'east'},b:{kind:'town',location:'e2_academy'},exitObject:{map:id+'_f1',id:'exit'}});
 }
 for(const [id,name,parent,description] of [
  ['library_registry','書庫の貸出・居住契約窓口','e2_archive','本の返却と、書庫に暮らす人の契約を別々に記録する。'],
  ['library_clock','書庫の外時計','e2_academy','作業室の砂時計と独立して、通りに向けて時刻を示す時計。'],
  ['library_market','サロメの生活市','e2_academy','訃報に名のある人が日々の仕事を続けている。'],
  ['library_review','予定書の発行・審査窓口','e2_academy','執行予定書の原本と異議申立を扱う窓口。安全な避難先とは別の場所。'],
  ['library_council','相続の協議室','e2_archive','相続人が未成立の文書を確認し、自分たちの意思を記録する。'],
  ['library_deposit','相続財産の保管窓口','e2_academy','分配を急がず、保管費を説明して財産を預かる。'],
  ['library_copy_room','書庫の控え・写本室','e2_archive','退避した控えと写本を照合する。消えた文字を推測で補わない。'],
  ['library_warehouse','書庫の移送先別倉','e2_storage','収蔵期限を迎えた本を箱ごと受け取り、受領札を戻す。'],
  ['library_home_record','依頼国の出張記録室','e2_academy','戦史の編纂に来た依頼国の記録係。史書の国名と現在の所在国は同じとは限らない。'],
  ['library_other_record','相手国の交易市記録室','oddland_market','照会を待つ相手国の記録係。サロメから高台街道と地下水道の関所を通って訪ねる。'],
  ['library_joint','戦史原本の共同保管庫','e2_archive','二国の受領人が原本と同じ内容の写しを確認する。']
 ])locations[id]={id,name,parent,description,background:id==='library_clock'||id==='library_market'?'location_square':'location_guild',links:[]};
 return bundle;
}
