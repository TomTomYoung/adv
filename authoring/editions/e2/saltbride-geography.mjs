import {geographyFingerprint} from '../../../src/core/edition-geography.js';
export async function extendSaltBrideGeography(bundle,read){
  const original=(await read('data/dungeons.json')).region_2,dungeon=structuredClone(original),id='e2_saltbride_tunnel';
  const tiles=['#######','#.....#','#.....#','#.....#','#######'];
  bundle.additions.maps[id]={id,name:'避難先の安全坑',region:2,dungeon:'region_2',floor:1,background:'corridor',music:'exploration',encounter:'roaming_2',encounterRate:0,tiles,entrance:{x:1,y:1,facing:'east'},objects:[],cells:{legend:{W:'stone_wall',F:'stone_floor'},rows:tiles.map(r=>r.replaceAll('#','W').replaceAll('.','F')),overrides:{}}};
  // The refuge itself is safe; the existing mine approach keeps its hazards and lighting.
  for(let y=1;y<4;y++)for(let x=1;x<6;x++)bundle.additions.maps[id].cells.overrides[`${x},${y}`]={parameters:{safe:true}};
  dungeon.maps.push(id);dungeon.systems.connections.links.push({id:'q011_safe_tunnel',name:'像の分岐と避難先の安全坑',kind:'stairs',a:{map:'region_2_f1',x:11,y:10,facing:'south'},b:{map:id,x:1,y:1,facing:'east'}});
  bundle.patches.push({group:'dungeons',id:'region_2',sha256:await geographyFingerprint(original),value:dungeon});
}
