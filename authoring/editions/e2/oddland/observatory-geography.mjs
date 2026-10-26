// These are destinations of separate inherited requests, not a new shared
// war chronology or an identification of their unnamed countries/armies.
export function extendObservatoryGeography(bundle){
 const {locations,maps,dungeons}=bundle.additions,t=bundle.travel;
 for(const [id,name,parent] of [
  ['observatory_notice','星と天気の告知所'],['observatory_platform','村の地上観測台'],
  ['observatory_vendor','星瓶の店'],['observatory_calendar','暦と予定の窓口'],
  ['observatory_archive','観測記録と歌集の資料室'],['observatory_workshop','観測器の工房'],
  ['observatory_haku','ハクの家'],['observatory_family','帰還信号を待つ家'],
  ['observatory_families','洗濯物を受け取る家々'],['observatory_relief','遺族給付の窓口'],
  ['observatory_muster','帰還記録の受付'],['observatory_home','帰還兵の家'],
  ['observatory_room','妻が個別に話す部屋','observatory_home'],['observatory_backroom','弟が個別に話す部屋','observatory_home'],['observatory_lodging','別居を相談した住まい']
 ])locations[id]={id,name,parent:parent??'oddland_village',description:name+'。訪ねた相手と話し、用件を確かめる。',background:id==='observatory_platform'?'location_square':'location_guild',links:[]};
 const specs=[['front','使者が往復する前線'],['artillery','避難路を見渡す砲台'],['camp','洗濯場と厨房のある収容地'],['bridge','荷車を待つ橋と渡し'],['fort','交渉を求められた砦'],['village','兵士が守った村'],['supply','魔石が残った補給村'],['rescue','救助標から続く上層の水路']];
 for(const [key,name] of specs){
  const id='e2_observatory_'+key,dungeon=key==='rescue'?'observatory_rescue':'observatory_sites';
  const tiles=['###############','#.............#','#.###.###.###.#','#.............#','#.###.###.###.#','#.............#','#.###.###.###.#','#.............#','###############'];
  maps[id]={id,name,region:9,dungeon,floor:1,background:'corridor',music:'exploration',encounter:'roaming_9',encounterRate:0,tiles,entrance:{x:1,y:1,facing:'east'},objects:[],cells:{legend:{W:'stone_wall',F:'stone_floor'},rows:tiles.map(r=>r.replaceAll('#','W').replaceAll('.','F')),overrides:{}}};
  for(let y=0;y<tiles.length;y++)for(let x=0;x<tiles[y].length;x++)if(tiles[y][x]==='.')maps[id].cells.overrides[`${x},${y}`]={parameters:{safe:true,illumination:8}};
  t.mapCountries[id]='oddland';t.mapRegistrations[id]='oddland_entry';
  t.routes.push({id:id+'_surface',name:'旧王領の村と'+name+'の道',a:{kind:'town',location:'oddland_village'},b:{kind:'dungeon',dungeon,map:id,x:1,y:1,facing:'east'}});
 }
 for(const [id,name] of [['observatory_sites','観測所周辺の出張先'],['observatory_rescue','観測所の上層救助水路']]){
  const subset=Object.values(maps).filter(m=>m.dungeon===id);
  dungeons[id]={schemaVersion:1,id,name,description:'旧王領の村から歩いて往復する依頼の現場。入口へ戻れば村への道に出る。',region:9,recommendedLevel:1,profile:'classic',entries:{main:{map:subset[0].id,point:'entrance'}},maps:subset.map(m=>m.id),systems:{},art:structuredClone(dungeons.oddland_roads.art)};
  t.dungeonSettlements[id]='oddland_village';
 }
 const map=maps.e2_observatory_rescue,water=[];
 for(let y=1;y<8;y++)for(let x=1;x<14;x++)if(map.tiles[y][x]==='.')water.push({map:map.id,x,y});
 dungeons.observatory_rescue.systems.air={use:'air_supply',title:'上層救助水路の空気',capacity:64,warning:16,perStep:1,perBattle:1,perRound:1,suffocation:.1,water,pockets:[[1,1,'入口'],[7,3,'担架の通った空気室'],[13,7,'一行の待つ空気室']].map(([x,y,name],i)=>({id:'air_'+i,name,map:map.id,x,y})),devices:[]};
 return bundle;
}
