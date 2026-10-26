// Separate sites around the plateau; their names do not redefine the old
// anonymous realms, rulers or factions in the inherited stories.
export function extendChapelSites(bundle){
 const {locations,maps,dungeons}=bundle.additions,t=bundle.travel;
 for(const [id,name,description] of [
  ['pilgrim_union','巡礼台地の探索組合','帰還報告と救助班への引継ぎを受け付ける。'],
  ['pilgrim_master','巡礼台地の剣の師の家','剣の持主が返却を待つ。'],
  ['pilgrim_parcel_owner','巡礼台地の預かり物の持主宅','庫番の預かり物を本人へ届ける家。'],
  ['pilgrim_workshop','巡礼台地の人形工房','水底から運び出した人形を乾かし、次の仕事を教える。'],
  ['pilgrim_archive','巡礼台地の資料受入室','火の収まった本を預かり、次の救出のための情報を残す。'],
  ['pilgrim_rescue','巡礼台地の救助詰所','救助の応援と負傷者の引継ぎを行う。']
 ])locations[id]={id,name,parent:'oddland_plateau',description,background:'location_guild',links:[]};
 const specs=[
  ['e2_sand_gallery','砂の回廊と休息所','pilgrim_sites'],
  ['e2_burnt_library','燃え残る図書館','pilgrim_sites'],
  ['e2_rescue_tunnel','崩落坑道の救助区画','pilgrim_sites'],
  ['e2_chapel_works','礼拝堂の整備別棟','pilgrim_sites'],
  ['e2_sunken_inn','沈んだ宿の潜水口と食堂','pilgrim_sunken_inn']
 ];
 for(const [id,name,dungeon] of specs){
  const tiles=['###############','#.............#','#.###.###.###.#','#.............#','#.###.###.###.#','#.............#','#.###.###.###.#','#.............#','###############'];
  maps[id]={id,name,region:4,dungeon,floor:1,background:'corridor',music:'exploration',encounter:'roaming_4',encounterRate:0,tiles,entrance:{x:1,y:1,facing:'east'},objects:[],cells:{legend:{W:'stone_wall',F:'stone_floor'},rows:tiles.map(row=>row.replaceAll('#','W').replaceAll('.','F')),overrides:{}}};
  for(let y=0;y<tiles.length;y++)for(let x=0;x<tiles[y].length;x++)if(tiles[y][x]==='.')maps[id].cells.overrides[`${x},${y}`]={parameters:{safe:true,illumination:8}};
  t.mapCountries[id]='oddland';t.mapRegistrations[id]='oddland_entry';
  t.routes.push({id:id+'_surface',name:'巡礼台地と'+name+'の道',a:{kind:'town',location:'oddland_plateau'},b:{kind:'dungeon',dungeon,map:id,x:1,y:1,facing:'east'}});
 }
 for(const [id,name] of [['pilgrim_sites','巡礼台地の調査地'],['pilgrim_sunken_inn','水底の宿']])dungeons[id]={schemaVersion:1,id,name,description:'巡礼台地から歩いて入る調査地。地上への道は入口へ戻る。',region:4,recommendedLevel:1,profile:'classic',entries:{main:{map:specs.find(s=>s[2]===id)[0],point:'entrance'}},maps:specs.filter(s=>s[2]===id).map(s=>s[0]),systems:{},art:structuredClone(dungeons.oddland_roads.art)};
 const map=maps.e2_sunken_inn,water=[];
 for(let y=1;y<8;y++)for(let x=1;x<14;x++)if(map.tiles[y][x]==='.'&&!(x===1&&y===1))water.push({map:map.id,x,y});
 dungeons.pilgrim_sunken_inn.systems.air={use:'air_supply',title:'水底の宿の空気',capacity:64,warning:16,perStep:1,perBattle:1,perRound:1,suffocation:.1,water,pockets:[{id:'shore',name:'潜水口の空気',map:map.id,x:1,y:1}],devices:[]};
 return bundle;
}
