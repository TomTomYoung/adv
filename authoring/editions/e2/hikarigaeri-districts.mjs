import {geographyFingerprint} from '../../../src/core/edition-geography.js';

const square='hikarigaeri_square',hill='e2_sakashita',wharf='e2_wharf',canal='e2_canal_quarter';

export function buildRiverside(bundle){
  const places=bundle.additions.locations;
  const add=(id,name,parent,description,background='location_square')=>{
    places[id]={id,name,parent,description,background,links:[]};
  };
  add(hill,'坂下町',square,'高台街道へ続く坂のふもとに、学校と役所、舞踊家の家が並ぶ。乗合馬車は坂下の停留所から出る。');
  add(wharf,'荷揚げ河岸',square,'水際に荷を積んだ舟が並ぶ。倉庫と運河の通りの先に、水道の階段と廃坑の搬出口がある。');
  places[hill].choiceOrder=['hikarigaeri_medical','hikarigaeri_skill_shop','hikarigaeri_insurance','hikarigaeri_pass_registry','library_dancer','library_flower_rest','e2_road'];
  places[wharf].choiceOrder=['e2_rat_lane',canal,'hikarigaeri_waterwatch','e2_cart_surface'];
  for(const [id,name] of [['e2_rat_lane','倉庫通り'],['e2_cart_surface','廃坑搬出口'],[canal,'運河通り']]){
    places[id]={...places[id],localName:name,parent:wharf};
  }
  places[canal].description='水路に沿って鍵屋や食堂が並ぶ。地下水道へ下りる階段は荷揚げ河岸にある。';
  const groups=[
    ['e2_canal_locksmith','鍵屋','店先の帳場から作業台が見える。脇の路地を回ると裏口に出る。','location_shop',[
      ['e2_q101_counter','帳場'],['e2_q101_door','裏口'],['e2_q101_bench','作業台']]],
    ['e2_canal_bell_square','鐘楼前','鐘楼の足元に宿と告知板があり、葬列を待つ人々が通りを空けている。','location_square',[
      ['e2_q102_tower','鐘楼'],['e2_q102_parlor','遺族の控え所'],['e2_q102_inn','鐘楼脇の宿'],['e2_q102_board','告知板'],['e2_q102_lane','葬列の並ぶ道']]],
    ['e2_canal_kitchens','炊き出し場','通りに面した配膳口の向こうで、食堂の人々が鍋を火にかけている。','location_tavern',[
      ['e2_q103_pot','配膳口'],['e2_q103_inn','隣の食堂'],['e2_q103_bench','運河沿いの腰掛け'],['e2_q103_kitchen','仕込み場']]],
    ['e2_canal_fountain_square','噴水広場','噴水を囲む露店の前で、通りに面した窓から楽器の音が聞こえる。','location_square',[
      ['e2_q104_stall','花売りの露店'],['e2_q104_fountain','噴水のある辻'],['e2_q104_window','楽師の窓辺']]],
    ['e2_canal_bridgehead','運河橋のたもと','橋の両岸に工房と船着場が向かい合い、婚礼の会場へ道が続く。','location_square',[
      ['e2_q105_hall','婚礼の会場'],['e2_q105_bridge','運河橋'],['e2_q105_shop','工房'],['e2_q105_bank','運河の泥道'],['e2_q105_cart','船着場']]],
    ['e2_canal_night_market','夜市','パンを売る店から、路地の抜け道を通って荷運びの家へ出られる。','location_square',[
      ['e2_q106_bakery','パン屋'],['e2_q106_alley','抜け道'],['e2_q106_door','荷運びの家の戸口'],['e2_q106_table','家族の食卓']]],
    ['e2_canal_mora_inn','モラの宿','帳場の先に食堂があり、配達人の通う戸口が通りに開く。','location_tavern',[
      ['e2_q107_desk','帳場'],['e2_q107_dining','食堂'],['e2_q107_door','配達口'],['e2_q107_room','客室']]],
    ['e2_canal_cat_market','魚屋と鳥屋','隣り合う二軒の店と、魚屋が借りる遠い倉庫へ続く道。','location_shop',[
      ['e2_q108_stall','魚屋の売り台'],['e2_q108_feeder','鳥屋の餌場'],['e2_q108_warehouse','遠い倉庫']]]
  ];
  for(const [id,name,description,background,stops] of groups){
    add(id,name,canal,description,background);
    for(const [child,localName] of stops)places[child]={...places[child],parent:id,localName};
  }
  places.e2_voice_port={...places.e2_voice_port,localName:'地下室の伝声口'};
  places.e2_rat_lane.description='河岸から続く通りに穀倉と共同倉庫が並ぶ。それぞれ別の戸口を持つ。';
  places.e2_two_graves_cemetery={...places.e2_two_graves_cemetery,localName:'裏の墓地'};
}

// Apply the current edition's town entrances after the library and road upgrades.
export async function finishHomeDistricts(bundle,base){
  const patch=async(id,changes)=>{
    const prior=bundle.patches.find(p=>p.group==='locations'&&p.id===id);
    if(prior){Object.assign(prior.value,changes);return;}
    const original=base[id];
    bundle.patches.push({group:'locations',id,sha256:await geographyFingerprint(original),value:{...original,...changes}});
  };
  await patch(square,{localName:'篝火広場',choiceOrder:['hikarigaeri_tavern','hikarigaeri_shop','hikarigaeri_guild',hill,wharf],description:'灯を囲む広場に、帰り火亭と旅道具店、灯番組合の戸口が並ぶ。坂下町や荷揚げ河岸への道が分かれ、迷宮へ下りる階段もここにある。'});
  for(const id of ['hikarigaeri_medical','hikarigaeri_skill_shop','hikarigaeri_insurance','hikarigaeri_pass_registry'])await patch(id,{parent:hill});
  await patch('hikarigaeri_waterwatch',{parent:wharf,localName:'水道待避場'});
  await patch('hikarigaeri_medical_specimens',{localName:'標本室'});
  await patch('e2_road',{parent:hill,localName:'乗合馬車の停留所',description:'行政都市、開拓地、街道の施療院へ向かう馬車が待っている。サロメ行きは初訪問後に利用できる。高台街道を歩くなら坂下町から出発する。'});
  for(const [id,localName] of [['library_dancer','舞踊家の家'],['library_flower_rest','花の静養室']])Object.assign(bundle.additions.locations[id],{parent:hill,localName});
  const departures={
    waterway_surface:[wharf,'地下水道へ下りる'],q010_surface:[wharf,'水門救助口へ'],
    return_cart_surface:['e2_cart_surface','昇降機で廃坑へ'],salome_road_home:[hill,'高台街道へ']
  };
  for(const route of bundle.travel.routes){
    const departure=departures[route.id];if(!departure)continue;
    const side=route.a.kind==='town'?route.a:route.b;
    side.location=departure[0];route.departureLabel=departure[1];
  }
  bundle.travel.settlements.salome.shortName='サロメ';
  bundle.travel.shuttles.find(r=>r.id==='salome_coach').platforms={hikarigaeri:'e2_road'};
}
