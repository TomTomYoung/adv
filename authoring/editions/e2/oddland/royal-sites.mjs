// Surface scenes belonging to the inherited village stories. The fallen
// bridge is fixed terrain; the island can only be reached by the lake boat.
export function extendRoyalSites(bundle){
 const {locations,maps,dungeons}=bundle.additions,t=bundle.travel;
 for(const [id,name,parent] of [
  ['royal_lender','エルドの家'],['royal_hall','村の集会所'],['royal_shipyard','村の船大工の工房'],
  ['royal_lockshop','修理を依頼した店'],['royal_vault','店の立会い金庫室','royal_lockshop'],
  ['royal_lamp','船大工の魔力灯','royal_shipyard'],['royal_other_lamp','別棟の故障灯','royal_shipyard'],
  ['royal_sender','マオの家'],['royal_recipient','かつての旅仲間の家']
 ])locations[id]={id,name,parent:parent??'oddland_village',description:name+'。用件の相手と作業の結果を確かめる。',background:'location_guild',links:[]};
 const specs=[['bridge','荷車が倒れた橋'],['trial','石喰い獣の試験場'],['fort','落ちた橋と尾根の砦'],['lakeshore','湖の渡し場'],['island','湖の島の野営地']];
 for(const [key,name] of specs){
  const id='e2_royal_'+key,tiles=['###############','#.............#','#.###.###.###.#','#.............#','#.###.###.###.#','#.............#','#.###.###.###.#','#.............#','###############'];
  if(key==='fort')tiles[1]='#.....#.......#';
  maps[id]={id,name,region:7,dungeon:'royal_sites',floor:1,background:'corridor',music:'exploration',encounter:'roaming_7',encounterRate:0,tiles,entrance:{x:1,y:1,facing:'east'},objects:[],cells:{legend:{W:'stone_wall',F:'stone_floor'},rows:tiles.map(r=>r.replaceAll('#','W').replaceAll('.','F')),overrides:{}}};
  for(let y=0;y<tiles.length;y++)for(let x=0;x<tiles[y].length;x++)if(tiles[y][x]==='.')maps[id].cells.overrides[`${x},${y}`]={parameters:{safe:true,illumination:8}};
  t.mapCountries[id]='oddland';t.mapRegistrations[id]='oddland_entry';
  if(key!=='island')t.routes.push({id:id+'_surface',name:'旧王領の村と'+name+'の道',a:{kind:'town',location:'oddland_village'},b:{kind:'dungeon',dungeon:'royal_sites',map:id,x:1,y:1,facing:'east'}});
 }
 t.routes.push({id:'royal_lake_boat',name:'湖岸と島を結ぶ渡し舟',a:{kind:'dungeon',dungeon:'royal_sites',map:'e2_royal_lakeshore',x:13,y:7,facing:'west'},b:{kind:'dungeon',dungeon:'royal_sites',map:'e2_royal_island',x:1,y:1,facing:'east'}});
 t.dungeonSettlements.royal_sites='oddland_village';
 dungeons.royal_sites={schemaVersion:1,id:'royal_sites',name:'旧王領の村の調査地',description:'橋、試験場、砦、湖の渡し場。島へは湖岸から渡し舟で渡る。',region:7,recommendedLevel:1,profile:'classic',entries:{main:{map:'e2_royal_bridge',point:'entrance'}},maps:specs.map(([key])=>'e2_royal_'+key),systems:{},art:structuredClone(dungeons.oddland_roads.art)};
 return bundle;
}
