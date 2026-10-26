import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {geographyFingerprint} from '../src/core/edition-geography.js';
import {extendChapelSites} from '../authoring/editions/e2/oddland/chapel-sites.mjs';
import {extendPilgrimageGeography} from '../authoring/editions/e2/oddland/pilgrimage-geography.mjs';

const root=path.resolve(import.meta.dirname,'..');
const read=async file=>JSON.parse(await fs.readFile(path.join(root,file),'utf8'));
export async function buildOddlandGeography({check=false}={}){
  const landing=await read('data/maps/region_1_landing.json'),waterway=(await read('data/dungeons.json')).region_1;
  const patchMap=structuredClone(landing),patchDungeon=structuredClone(waterway);
  patchMap.objects.push({id:'oddland_route_sign',name:'交易回廊への道標',x:15,y:3,kind:'clue',trigger:'interact',interactionRange:'here',safe:true,script:'e2_oddland_route_sign'});
  const maps={};
  for(const [id,name,tiles] of [
    ['e2_trade_corridor','乾いた交易回廊',['###########','#.........#','#####.#####','#.........#','###########']],
    ['e2_trade_refuge','交易回廊の退避所',['###########','#.........#','#.###.###.#','#.........#','###########']],
    ['e2_border_customs','オッドランド側の出入窓口',['###########','#.........#','###.###.###','#.........#','###########']]
  ]){
    maps[id]={id,name,region:1,dungeon:'region_1',floor:3,background:'corridor',music:'exploration',encounter:'roaming_1',encounterRate:0,tiles,entrance:{x:1,y:1,facing:'east'},objects:[],cells:{legend:{W:'stone_wall',F:'stone_floor'},rows:tiles.map(row=>row.replaceAll('#','W').replaceAll('.','F')),overrides:{}}};
    // The maintained trade passage has fixed lighting and no random encounters,
    // including when the carried lamp runs dry. Footsteps still consume fuel.
    for(let y=0;y<tiles.length;y++)for(let x=0;x<tiles[y].length;x++)if(tiles[y][x]==='.')maps[id].cells.overrides[`${x},${y}`]={parameters:{safe:true,illumination:8}};
    patchDungeon.maps.push(id);
  }
  const locations={},add=(id,name,parent,description,background,extra={})=>locations[id]={id,name,parent,description,background,links:[],...extra};
  add('oddland_border','オッドランド・国境宿場',null,'石段を上がると、荷車の車輪が鳴る宿場へ出た。背後の出入窓口から交易回廊を戻れば、地下関所と灯帰りへ帰れる。','location_square');
  add('oddland_inn','国境宿場の旅籠','oddland_border','荷を下ろす旅人たちの宿。寝床を借り、同行する仲間を相談できる。','location_tavern',{party:true,services:['inn']});
  add('oddland_clinic','国境宿場の施療所','oddland_border','街道から戻る人のための施療所。所持金がなくても応急手当を受けられる。','location_medical',{services:['clinic']});
  add('oddland_supply','国境宿場の補給店','oddland_border','縄と薬を並べた店。店先の公開給油所では携行油を無料で補充できる。預けた油はこの宿場で保管される。','location_shop',{shop:true});
  add('oddland_skill_shop','国境宿場のスキル屋','oddland_border','技能宝石を使って隊員ごとに教習を受けられる。習得条件は灯帰りの教習所と共通。','location_guild');
  add('oddland_board','国境宿場の共同依頼所','oddland_border','旅人と住民が立ち寄る共同依頼所。国境の両側から届いた依頼と、宿場の暮らしの相談が掲示されている。受注済みの記録は手帳で確認できる。','location_guild',{quests:true});
  const point=(map,x,y,facing='east')=>({kind:'dungeon',dungeon:'region_1',map,x,y,facing});
  const town=location=>({kind:'town',location});
  const bundle={schemaVersion:1,additions:{maps,locations,scripts:{e2_oddland_route_sign:{commands:[{op:'narrate',text:'道標に「オッドランド方面」と刻まれている。探索隊の名を記帳すれば、乾いた交易回廊へ進める。姉妹の地下通行証とは別の、一般の往来のための登録だ。'}]}}},patches:[{group:'maps',id:landing.id,sha256:await geographyFingerprint(landing),value:patchMap},{group:'dungeons',id:waterway.id,sha256:await geographyFingerprint(waterway),value:patchDungeon}],travel:{version:1,home:'hikarigaeri',countries:{tornea:'聖王国トルネア領',border:'国境の交易回廊',oddland:'オッドランド'},settlements:{hikarigaeri:{name:'灯帰り',root:'hikarigaeri_square',country:'tornea',shopLocation:'hikarigaeri_shop',skillShopLocation:'hikarigaeri_skill_shop'},oddland:{name:'オッドランド・国境宿場',root:'oddland_border',country:'oddland',registration:'oddland_entry',shopLocation:'oddland_supply',skillShopLocation:'oddland_skill_shop',publicSupply:'oddland_supply'}},mapRegistrations:{e2_trade_corridor:'oddland_entry',e2_trade_refuge:'oddland_entry',e2_border_customs:'oddland_entry'},dungeonSettlements:{},questSettlements:{},mapCountries:{e2_trade_corridor:'border',e2_trade_refuge:'border',e2_border_customs:'oddland'},routes:[
    {id:'waterway_surface',name:'灯帰りと地下水道の地上階段',a:point('region_1_f1',1,1),b:town('hikarigaeri_square'),exitObject:{map:'region_1_f1',id:'exit'}},
    {id:'oddland_checkpoint',name:'地下関所と交易回廊の通過口',registration:'oddland_entry',a:point('region_1_landing',15,3),b:point('e2_trade_corridor',1,1)},
    {id:'trade_refuge',name:'交易回廊と退避所の通過口',a:point('e2_trade_corridor',9,3,'west'),b:point('e2_trade_refuge',1,1)},
    {id:'border_customs',name:'退避所と外国側出入窓口の通過口',a:point('e2_trade_refuge',9,3,'west'),b:point('e2_border_customs',1,1)},
    {id:'oddland_surface',name:'国境宿場と出入窓口の石段',a:point('e2_border_customs',9,3,'west'),b:town('oddland_border')}
  ]}};
  await extendPilgrimageGeography(bundle,read);
  extendChapelSites(bundle);
  const output=JSON.stringify(bundle,null,2)+'\n',file=path.join(root,'data/scenario-editions/e2/geography.json');
  if(check){if(await fs.readFile(file,'utf8').catch(()=>null)!==output)throw Error('第2版の越境地理が古くなっています。npm run build:editions を実行してください。');}
  else await fs.writeFile(file,output);
  return bundle;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildOddlandGeography({check:process.argv.includes('--check')});
