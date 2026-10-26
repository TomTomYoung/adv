import {extendMachineGeography} from '../authoring/editions/e2/salome/machine-geography.mjs';
import {extendLibraryGeography} from '../authoring/editions/e2/salome/library-geography.mjs';
import {extendLibrarySecondGeography} from '../authoring/editions/e2/salome/library-second-geography.mjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import {geographyFingerprint} from '../src/core/edition-geography.js';
import {locations as previousLocations} from '../authoring/editions/e2/companions/kit.mjs';

const root=path.resolve(import.meta.dirname,'..');
export async function buildSalomeGeography(previous,{check=false}={}){
 const travel=structuredClone(previous.travel),maps={},locations={},patches=[];
 travel.version=2;
 const patch=async(id,changes)=>patches.push({group:'locations',id,sha256:await geographyFingerprint(previousLocations[id]),value:{...structuredClone(previousLocations[id]),...changes}});
 await patch('e2_academy',{parent:null,name:'サロメ・学門前',description:'高台街道を上がると、神学校と魔術協会、機械学会の屋根が見える。書庫の受付と遺物管理室へは広場から進める。坂を下れば灯帰りへ戻れる。'});
 await patch('e2_road',{description:'灯帰りの乗合馬車停留所。行政都市、開拓地、街道の施療院へ向かう人が待っている。サロメへの高台街道と乗合便は、灯帰りの広場から出る。'});
 const add=(id,name,description,background,extra={})=>locations[id]={id,name,parent:'e2_academy',description,background,links:[],...extra};
 add('salome_inn','サロメの下宿屋','空いた寝床で休息し、同行する仲間を相談できる。','location_tavern',{party:true,services:['inn']});
 add('salome_clinic','サロメの施療所','旅人と住民のための施療所。所持金がなくても応急手当を受けられる。','location_medical',{services:['clinic']});
 add('salome_supply','サロメの補給店','縄や薬を買い、公開給油所で携行油を補充できる。預けた油はこの町で保管される。','location_shop',{shop:true});
 add('salome_skills','サロメの教習所','技能宝石を使って仲間ごとに技能を習う。','location_guild');
 add('salome_board','サロメの共同依頼所','書庫と遺物管理室から届く仲間との相談が掲示されている。本人と相談してから、それぞれの受付へ向かう。','location_guild',{quests:true});
 travel.settlements.salome={name:'学術都市サロメ',root:'e2_academy',country:'tornea',shopLocation:'salome_supply',skillShopLocation:'salome_skills',publicSupply:'salome_supply'};
 for(const n of [...Array.from({length:10},(_,i)=>241+i),...Array.from({length:10},(_,i)=>281+i)])travel.questSettlements['q'+n]='salome';
 const specs=[
  ['e2_highland_lower','高台街道・坂下',['###############','#.............#','#######.#####.#','#.............#','#.#####.#######','#.............#','###############']],
  ['e2_highland_upper','高台街道・学門坂',['###############','#.............#','#.#####.#######','#.............#','#######.#####.#','#.............#','###############']]
 ];
 for(const [id,name,tiles] of specs){
  maps[id]={id,name,region:11,dungeon:'salome_road',floor:1,background:'corridor',music:'exploration',encounter:'roaming_5',encounterRate:0,tiles,entrance:{x:1,y:1,facing:'east'},objects:[],cells:{legend:{W:'stone_wall',F:'stone_floor'},rows:tiles.map(r=>r.replaceAll('#','W').replaceAll('.','F')),overrides:{}}};
  for(let y=0;y<tiles.length;y++)for(let x=0;x<tiles[y].length;x++)if(tiles[y][x]==='.')maps[id].cells.overrides[`${x},${y}`]={parameters:{safe:true,illumination:8}};
  travel.mapCountries[id]='tornea';
 }
 const point=(map,x,y,facing='east')=>({kind:'dungeon',dungeon:'salome_road',map,x,y,facing}),town=location=>({kind:'town',location});
 travel.routes.push(
  {id:'salome_road_home',name:'灯帰りから高台街道へ',a:town('hikarigaeri_square'),b:point('e2_highland_lower',1,1)},
  {id:'salome_road_slope',name:'高台街道の坂下と学門坂',a:point('e2_highland_lower',13,5,'west'),b:point('e2_highland_upper',1,1)},
  {id:'salome_road_gate',name:'サロメの学門と高台街道',a:point('e2_highland_upper',13,5,'west'),b:town('e2_academy')}
 );
 travel.shuttles=[{id:'salome_coach',stops:['hikarigaeri','salome'],cost:5}];
 const oldDungeons=JSON.parse(await fs.readFile(path.join(root,'data/dungeons.json'),'utf8'));
 const dungeons={salome_road:{schemaVersion:1,id:'salome_road',name:'サロメへの高台街道',description:'灯帰りと学術都市を結ぶ国内の街道。坂下と学門坂を歩いて往復できる。',region:11,recommendedLevel:1,profile:'classic',entries:{main:{map:'e2_highland_lower',point:'entrance'}},maps:specs.map(s=>s[0]),systems:{},art:structuredClone(oldDungeons.region_5.art)}};
 const bundle={schemaVersion:1,additions:{maps,locations,dungeons},patches,travel};
 await extendLibraryGeography(bundle,previous,oldDungeons);
 extendLibrarySecondGeography(bundle);
 extendMachineGeography(bundle);
 const output=JSON.stringify(bundle,null,2)+'\n',file=path.join(root,'data/scenario-editions/e2/salome-geography.json');
 if(check){if(await fs.readFile(file,'utf8').catch(()=>null)!==output)throw Error('サロメ地理が古くなっています。npm run build:editions を実行してください。');}
 else await fs.writeFile(file,output);
 return bundle;
}
