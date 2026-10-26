export function extendMachineGeography(bundle){
 const {locations,maps,dungeons}=bundle.additions;
 for(const [id,name,parent,description] of [
  ['machine_registry','機関廟の点検・承認窓口','e2_workshop','退職の返却記録、整備と利用の役割、補修当番を照合する。'],
  ['machine_parts','機関廟の補給部品庫','e2_storage','要求票を品番と照らし、実物を受け渡す。'],
  ['machine_clinic','機関廟の薬品保管室','salome_clinic','移送した薬の受領と保冷を確認する。'],
  ['machine_hammer','義肢の槌作業台','e2_workshop','利用者の手の届く位置に工具を並べ、作業の補正を試す。'],
  ['machine_needle','義肢の針仕事台','e2_workshop','槌とは違う距離と握力を記録する。'],
  ['machine_shoes','足音を預かる靴店','e2_academy','家の道を教えずに、境界の護符を受け取る店。'],
  ['machine_home','ダイの家の外戸口','e2_academy','家族は戸の内側で待つ。足音を家へ招く前に対処を相談する。'],
  ['machine_lui','ルイの刺繍工房','e2_workshop','本人が今の呼び名と、取り戻したい記憶を相談する。'],
  ['machine_mother','ルイの母の家','e2_academy','昔の名を知る母が住む。現在の呼び名を決めるのは本人。'],
  ['machine_tera','テラの家','e2_academy','夜の訪問と、後日の家具の置き方を別々に話す家。'],
  ['machine_hut','道化師の小屋','e2_academy','舞台の道具とは別に、役柄を離れた本人の手紙が残る。'],
  ['machine_mirror','遠方の像を映す鏡の店','library_market','像の場所と時刻を調べる間、鏡と取引記録を保管する。'],
  ['machine_family','扉のある宿の家族室','salome_inn','親子が今夜の出発について話す部屋。'],
  ['machine_morning','扉の先の翌朝の部屋','salome_inn','通過後の物語では夜の判断へ戻れない。手紙を宿主へ渡す机がある。'],
  ['machine_scripts','怪談の台本保管庫','e2_archive','散った後半と、未完のまま封じた台本を保管する。']
 ])locations[id]={id,name,parent,description,background:'location_guild',links:[]};
 const tiles=['#################','#...............#','#.#####.#######.#','#...............#','#######.#######.#','#...............#','#.#####.#######.#','#...............#','#################'];
 for(const [suffix,name] of [['outskirts','サロメ外縁の生活道'],['cemetery','サロメ外縁の墓地道'],['valley','サロメ外縁の谷道']]){
  const id='e2_salome_'+suffix;maps[id]={id,name,region:11,dungeon:'salome_road',floor:1,background:'corridor',music:'exploration',encounter:'roaming_8',encounterRate:0,tiles:[...tiles],entrance:{x:1,y:1,facing:'east'},objects:[],cells:{legend:{W:'stone_wall',F:'stone_floor'},rows:tiles.map(r=>r.replaceAll('#','W').replaceAll('.','F')),overrides:{}}};
  for(let y=0;y<tiles.length;y++)for(let x=0;x<tiles[y].length;x++)if(tiles[y][x]==='.')maps[id].cells.overrides[`${x},${y}`]={parameters:{safe:true,illumination:8}};
  dungeons.salome_road.maps.push(id);bundle.travel.mapCountries[id]='tornea';
 }
 const point=(suffix,x,y)=>({kind:'dungeon',dungeon:'salome_road',map:'e2_salome_'+suffix,x,y,facing:'east'});
 bundle.travel.routes.push(
  {id:'machine_outskirts',name:'サロメから外縁の生活道へ',a:{kind:'town',location:'e2_academy'},b:point('outskirts',1,1)},
  {id:'machine_cemetery',name:'外縁の生活道と墓地道',a:point('outskirts',15,7),b:point('cemetery',1,1)},
  {id:'machine_valley',name:'外縁の生活道と谷道',a:point('outskirts',15,1),b:point('valley',1,1)}
 );
}
