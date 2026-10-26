import {geographyFingerprint} from '../../../../src/core/edition-geography.js';

// Roads are separate from the chapel's mirrors, encounter tables and floor state.
export async function extendPilgrimageGeography(bundle,read){
 const locations=bundle.additions.locations,maps=bundle.additions.maps,t=bundle.travel;
 const add=(id,name,parent,description,background='location_square',extra={})=>locations[id]={id,name,parent,description,background,links:[],...extra};
 for(const [id,name,description] of [
  ['oddland_market','石橋の交易市','石橋の両端に荷が並び、台地へ上がる巡礼者と村へ帰る荷車が道を分ける。国境宿場へ戻る道は橋の西側だ。'],
  ['oddland_plateau','巡礼台地','石段を上がると、礼拝堂の入口と旅人の泊まる家々が見える。祈る人と修繕に来た職人が同じ広場を横切る。'],
  ['oddland_village','旧王領の村','畑の間の道が井戸のそばへ出る。村の人は交易市へ荷を運び、夕方には同じ道を帰ってくる。城と観測所への道はまだ開通していない。']
 ]){
  add(id,name,null,description,'location_square',id==='oddland_plateau'?{dungeons:['region_4']}:{});
  add(id+'_inn',name+'の宿',id,'旅の支度を整え、休息と隊の編成ができる。','location_tavern',{services:['inn'],party:true});
  add(id+'_clinic',name+'の施療所',id,'所持金がなくても応急手当を受けられる。','location_medical',{services:['clinic']});
  add(id+'_supply',name+'の補給店',id,'道具の購入と携行油の補充ができる。預けた油はこの拠点で保管する。','location_shop',{shop:true});
  add(id+'_skills',name+'の教習所',id,'技能宝石を使って隊員ごとの技能を習う。','location_guild');
  t.settlements[id]={name,root:id,country:'oddland',registration:'oddland_entry',shopLocation:id+'_supply',skillShopLocation:id+'_skills',publicSupply:id+'_supply'};
 }
 add('pilgrim_board','巡礼台地の依頼所','oddland_plateau','鏡沈みの礼拝堂に関わる20件の依頼を受け付ける。受注した記録は手帳へ残る。','location_guild',{quests:true});
 add('pilgrim_guesthouse','巡礼者の客室','oddland_plateau','鏡を置かない客室。戸口で声を掛けてから入る。','location_tavern');
 add('pilgrim_meeting','巡礼台地の面会室','oddland_plateau','窓辺に向かい合う椅子がある。書類を掲げる台は片付けてある。','location_guild');
 for(const [key,name] of [['first','一番の受付札の家'],['second','二番の受付札の家'],['third','三番の受付札の家']])add('pilgrim_'+key,name,'oddland_plateau','扉に受付札の番号がある。封を開けずに持ち主を確かめられる。','location_tavern');
 const point=(map,x,y,facing='east')=>({kind:'dungeon',dungeon:'oddland_roads',map,x,y,facing});
 const town=location=>({kind:'town',location});
 const specs=[
  ['e2_market_road','国境宿場から石橋への街道','oddland_border','oddland_market'],
  ['e2_pilgrim_road','石橋から巡礼台地への坂道','oddland_market','oddland_plateau'],
  ['e2_village_road','石橋から旧王領の村への道','oddland_market','oddland_village']
 ];
 for(const [id,name,from,to] of specs){
  const tiles=['###############','#.............#','#######.#####.#','#.............#','#.#####.#######','#.............#','###############'];
  maps[id]={id,name,region:12,dungeon:'oddland_roads',floor:1,background:'corridor',music:'exploration',encounter:'roaming_4',encounterRate:0,tiles,entrance:{x:1,y:1,facing:'east'},objects:[],cells:{legend:{W:'stone_wall',F:'stone_floor'},rows:tiles.map(row=>row.replaceAll('#','W').replaceAll('.','F')),overrides:{}}};
  for(let y=0;y<tiles.length;y++)for(let x=0;x<tiles[y].length;x++)if(tiles[y][x]==='.')maps[id].cells.overrides[`${x},${y}`]={parameters:{safe:true,illumination:8}};
  t.mapCountries[id]='oddland';t.mapRegistrations[id]='oddland_entry';
  t.routes.push({id:id+'_west',name:locations[from].name+'と'+name,a:town(from),b:point(id,1,1)}, {id:id+'_east',name:name+'と'+locations[to].name,a:point(id,13,5,'west'),b:town(to)});
 }
 const dungeons=await read('data/dungeons.json');
 bundle.additions.dungeons={oddland_roads:{schemaVersion:1,id:'oddland_roads',name:'オッドランドの街道',description:'国境宿場から石橋、巡礼台地、旧王領の村へ続く徒歩経路。',region:12,recommendedLevel:1,profile:'classic',entries:{main:{map:'e2_market_road',point:'entrance'}},maps:specs.map(s=>s[0]),systems:{},art:structuredClone(dungeons.region_4.art)}};
 const home=(await read('data/locations.json')).hikarigaeri_square,patched=structuredClone(home);
 patched.dungeons=patched.dungeons.filter(id=>id!=='region_4');
 bundle.patches.push({group:'locations',id:home.id,sha256:await geographyFingerprint(home),value:patched});
 for(const map of dungeons.region_4.maps){t.mapCountries[map]='oddland';t.mapRegistrations[map]='oddland_entry';}
 t.dungeonSettlements.region_4='oddland_plateau';
 for(const n of [...Array.from({length:10},(_,i)=>31+i),...Array.from({length:10},(_,i)=>131+i)])t.questSettlements['q'+String(n).padStart(3,'0')]='oddland_plateau';
 t.routes.push({id:'chapel_surface',name:'巡礼台地と鏡沈みの礼拝堂の階段',a:{kind:'dungeon',dungeon:'region_4',map:'region_4_f1',x:1,y:1,facing:'east'},b:town('oddland_plateau'),exitObject:{map:'region_4_f1',id:'exit'}});
 return bundle;
}
