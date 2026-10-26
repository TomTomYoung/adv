// The inherited maps and their air/orrery systems stay intact. Only departure,
// reception and surface return change for expeditions begun from the village.
export async function extendRoyalGeography(bundle,read){
 const {locations}=bundle.additions,t=bundle.travel,dungeons=await read('data/dungeons.json');
 const village=locations.oddland_village;
 village.description='畑の間の道が井戸のそばへ出る。海辺へ下る石段は沈没城の潜水口、丘の岩戸は地下観測所へ続く。交易市への帰路は畑の西側だ。';
 village.dungeons=['region_7','region_9'];
 const home=bundle.patches.find(p=>p.group==='locations'&&p.id==='hikarigaeri_square');
 home.value.dungeons=home.value.dungeons.filter(id=>!village.dungeons.includes(id));
 t.previousDungeonSettlements={region_7:'hikarigaeri',region_9:'hikarigaeri'};
 for(const [id,name,description] of [
  ['royal_board','旧王領の村の依頼所','沈没城と地下観測所に関わる40件を受け付ける。受注済みの依頼は手帳へ残る。'],
  ['royal_harbor','旧王領の村の港','潜水口に近い船着場。救助船と吊上げ人が係留索を確かめる。'],
  ['royal_rescue','村の救難隊詰所','城内で確かめた救難図を受け取り、探索の範囲を記録する。'],
  ['royal_exhibit','村の展示室','引き揚げた外布や鎧を、確かめた記録とともに展示する。'],
  ['royal_witness','村の証言室','遺族が資料を受け取り、公開する証言を相談する。'],
  ['royal_archive','村の航路記録室','避難便の乗船札、救助名簿、補修図を保管する。'],
  ['royal_bay','村の入り江','海獣が入れない湾を見渡せる岸。魚群が逃げ込む先を確かめる。'],
  ['royal_fishers','村の漁師小屋','警報の時刻と漁の支度を相談する。'],
  ['royal_refuge','港を見下ろす高台','港から人が退避し、係留索の作業が終わるのを待つ。']
 ])locations[id]={id,name,parent:village.id,description,background:id==='royal_harbor'||id==='royal_bay'||id==='royal_refuge'?'location_square':'location_guild',links:[],...(id==='royal_board'?{quests:true}:{})};
 for(const [id,route,start] of [['region_7','sunken_surface',61],['region_9','observatory_surface',81]]){
  t.dungeonSettlements[id]=village.id;
  for(const map of dungeons[id].maps){t.mapCountries[map]='oddland';t.mapRegistrations[map]='oddland_entry';}
  for(const n of [...Array.from({length:10},(_,i)=>start+i),...Array.from({length:10},(_,i)=>start+100+i)])t.questSettlements['q'+String(n).padStart(3,'0')]=village.id;
  t.routes.push({id:route,name:village.name+'と'+dungeons[id].name+'の石段',a:{kind:'dungeon',dungeon:id,map:id+'_f1',x:1,y:1,facing:'east'},b:{kind:'town',location:village.id},exitObject:{map:id+'_f1',id:'exit'}});
 }
 return bundle;
}
