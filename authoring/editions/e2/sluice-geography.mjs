import {ref,eq,and,not,or} from '../../story-kit.mjs';

export const sluiceMaps={control:'高所の水門操作室',near:'手前の避難通路',deep:'奥の作業区画',shaft:'旧縦坑・地下側',upper:'旧縦坑・地上側',ground:'地上の救助口',landing:'帳簿のある踊り場'};
export const sluiceMap=key=>'e2_sluice_'+key;
const flag=key=>eq(ref('stories.q010.values.'+key),true);
const at=(key,place)=>eq(ref('stories.q010.values.'+key+'At'),place);
export function extendSluiceGeography(bundle){
  const dungeon=bundle.patches.find(p=>p.group==='dungeons'&&p.id==='region_1').value;
  for(const [key,name] of Object.entries(sluiceMaps)){
    const id=sluiceMap(key),tiles=['#######','#.....#','#.....#','#.....#','#######'];
    const map={id,name,region:1,dungeon:'region_1',floor:['upper','ground'].includes(key)?1:10,background:'corridor',music:'exploration',encounter:'roaming_1',encounterRate:0,tiles,entrance:{x:3,y:2,facing:'east'},objects:[],cells:{legend:{W:'stone_wall',F:'stone_floor'},rows:tiles.map(r=>r.replaceAll('#','W').replaceAll('.','F')),overrides:{}}};
    // This emergency walkway has fixed work lights. The incident is rescue work,
    // and does not introduce random attacks on people waiting for evacuation.
    for(let y=1;y<4;y++)for(let x=1;x<6;x++)map.cells.overrides[`${x},${y}`]={parameters:{safe:true,illumination:8}};
    if(key==='ground')map.outdoor='salome_canal';
    bundle.additions.maps[id]=map;dungeon.maps.push(id);
  }
  const point=(key,x,y)=>({map:sluiceMap(key),x,y,facing:'east'});
  const link=(id,name,a,b,condition,requirement)=>({id:'q010_'+id,name,kind:'stairs',a,b,...(condition?{condition,requirement}:{})});
  dungeon.systems.connections.links.push(
    link('approach','水門詰所と高所操作室の保守階段',{map:'region_1_gatehouse',x:9,y:7,facing:'north'},point('control',1,1)),
    link('gate','非常水門の内側通路',point('control',5,1),point('near',1,1),not(flag('closed')),'閉門した機構が固着している。大規模な工事なしでは内側へ戻れない。'),
    link('shaft_entry','操作室と旧縦坑の地下通路',point('control',1,3),point('shaft',1,1)),
    link('shaft','旧工事用縦坑の昇降路',point('shaft',5,1),point('upper',1,1),and(flag('shaftOpened'),flag('bottomChecked')),'地下側の封鎖解除と足場・換気・固定点の検査が必要。'),
    link('shaft_exit','縦坑の地上側と救助口',point('upper',5,1),point('ground',5,1)),
    link('ladder','門番用の操作梯子',point('control',5,3),point('ground',1,1),not(or(at('nearPeople','transit'),at('deepPeople','transit'),at('crew','transit'))),'操作梯子は門番と調査隊用。住民の避難と排水隊の搬入には旧縦坑を使う。'),
    link('deep','奥の作業区画への渡り',point('near',5,1),point('deep',1,1),flag('ropeRigged'),'渡りの固定点へ救助縄を張る必要がある。'),
    link('book','帳簿の踊り場への階段',point('near',5,3),point('landing',1,1))
  );
  const gate=dungeon.systems.connections.links.find(l=>l.id==='q010_gate');gate.kind='watertight_door';gate.a.side='east';gate.b.side='west';
  bundle.travel.routes.push({id:'q010_surface',name:'灯帰りと水門の地上救助口',a:{kind:'dungeon',dungeon:'region_1',...point('ground',3,3)},b:{kind:'town',location:'hikarigaeri_square'}});
}
