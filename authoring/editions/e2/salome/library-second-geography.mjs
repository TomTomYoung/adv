export function extendLibrarySecondGeography(bundle){
 const {locations,maps,dungeons}=bundle.additions;
 for(const [id,name,parent,description] of [
  ['library_laundry','サロメの共同洗濯場','e2_academy','洗濯物を絞る音と仕事中の歌が聞こえる。出演の相談は曲の利用とは別に受け付ける。'],
  ['library_stage','サロメの祭の舞台','e2_academy','楽団の演奏、芝居、料理の出店、大道芸の公演を行う広場。'],
  ['library_buyer','指輪の買主の面会室','e2_academy','贈呈前の机と、祝いの後に当事者で話す席がある。'],
  ['library_tailor','サロメの染物・修理工房','e2_workshop','染め直し、衣装修理、道具の製作と受渡しを扱う。'],
  ['library_spirits','祭の代役精霊紹介所','e2_academy','代役の担当と休暇を相談し、本人を出店へ案内する。'],
  ['library_rehearsal','サロメの稽古場','e2_academy','観客の入る本番とは別に、衣装や得意な仕事を試す。'],
  ['library_garden_home','庭を待つ母の家','e2_academy','娘からの便りと、今日の庭を楽しむ本人の予定がある。'],
  ['library_garden','サロメ外縁の庭と畑','e2_academy','師の管理する蕾の庭と、農夫が道具を使う畑が並ぶ。'],
  ['library_post','サロメの便り・配送受付','e2_academy','届いた便りと発送する絵、配達の時刻と荷の状態を記録する。'],
  ['library_auction','サロメの道具競売所','e2_academy','品物の性質を説明してから試持ちと購入の意思を確かめる。'],
  ['library_dancer','灯帰りの引退した舞踊家の家','hikarigaeri_square','高台街道の坂下に暮らす舞踊家。夜咲きの花は開くところから見たい。'],
  ['library_flower_rest','灯帰りの花の静養室','hikarigaeri_square','振動を避けて鉢を休め、翌晩の再配達を待つ部屋。']
 ])locations[id]={id,name,parent,description,background:['library_stage','library_garden'].includes(id)?'location_square':'location_guild',links:[]};
 const id='e2_salome_canal',tiles=['#################','#...............#','###############.#','#...............#','#.###############','#...............#','#################'];
 maps[id]={id,name:'サロメの水路沿い',region:11,dungeon:'salome_road',floor:1,background:'corridor',music:'exploration',encounter:'roaming_5',encounterRate:0,tiles,entrance:{x:1,y:1,facing:'east'},objects:[],cells:{legend:{W:'stone_wall',F:'stone_floor'},rows:tiles.map(r=>r.replaceAll('#','W').replaceAll('.','F')),overrides:{}}};
 for(let y=0;y<tiles.length;y++)for(let x=0;x<tiles[y].length;x++)if(tiles[y][x]==='.')maps[id].cells.overrides[`${x},${y}`]={parameters:{safe:true,illumination:8}};
 dungeons.salome_road.maps.push(id);bundle.travel.mapCountries[id]='tornea';
 const point=(map,x,y)=>({kind:'dungeon',dungeon:'salome_road',map,x,y,facing:'east'});
 bundle.travel.routes.push(
  {id:'salome_canal_city',name:'サロメから静かな水路沿いへ',a:{kind:'town',location:'e2_academy'},b:point(id,1,1)},
  {id:'salome_canal_lower',name:'水路沿いと高台街道の坂下',a:point(id,15,5),b:point('e2_highland_lower',13,5)}
 );
}
