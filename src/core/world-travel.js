import {isRecord} from './expression.js';
import {locationRoot,townRoot,dungeonInterior,atWorldPlace,worldPlaceErrors} from './world.js';
import {dungeonRestrictionReason} from './dungeon-restrictions.js';
import {managesOil,oilRoom} from './expedition-oil.js';

const own=(o,k)=>typeof k==='string'&&Object.hasOwn(o??{},k);
export const freshWorldTravel=data=>({version:1,visited:{[data.worldTravel.home]:true},registrations:{},returnAnchor:data.worldTravel.home,oilStores:{}});
export function townSettlement(data,state){
  if(state.mode!=='town'||dungeonInterior(data,state))return null;
  const root=locationRoot(data,state.townLocation)?.id;
  return Object.entries(data.worldTravel?.settlements??{}).find(([,s])=>s.root===root)?.[0]??null;
}
export function departureSettlementReason(data,state,dungeon){
  if(!data.worldTravel)return '';
  const owner=data.worldTravel.dungeonSettlements[dungeon]??data.worldTravel.home;
  return townSettlement(data,state)===owner?'':`${data.worldTravel.settlements[owner].name}へ徒歩で戻り、そこから出発してください。`;
}
export function questReceptionReason(data,state,quest){
  if(!data.worldTravel)return '';
  const owner=data.worldTravel.questSettlements[quest]??data.worldTravel.home;
  if(townSettlement(data,state)!==owner)return `受付は${data.worldTravel.settlements[owner].name}です。`;
  const desks=data.quests[quest]?.receptionLocations;
  return desks&&!desks.includes(state.townLocation)?`受付は${desks.map(id=>data.locations[id].name).join('・')}です。`:'';
}
export function expeditionFacility(data,state,kind){
  const settlement=data.worldTravel?.settlements[townSettlement(data,state)];
  return state.mode==='town'&&!dungeonInterior(data,state)&&state.townLocation===(settlement?.[kind]??data.expedition?.[kind]);
}
export function rememberDeparture(data,state){
  const id=townSettlement(data,state);if(id&&state.worldTravel)state.worldTravel.returnAnchor=id;
}
export function returnLocation(data,state){return data.worldTravel?.settlements[state.worldTravel?.returnAnchor]?.root??townRoot(data);}

// The departure anchor is already saved for the whole expedition. An expedition
// that began before a relocation keeps its original country and surface exit.
export function legacyExpeditionSettlement(data,state){
  const dungeon=state.dungeons?.active?.id,previous=data.worldTravel?.previousDungeonSettlements?.[dungeon];
  return previous&&state.worldTravel?.returnAnchor===previous?previous:null;
}
function expeditionRoute(data,state,route){
  const previous=legacyExpeditionSettlement(data,state),dungeon=state.dungeons?.active?.id;
  if(!previous||![route.a,route.b].some(p=>p.kind==='dungeon'&&p.dungeon===dungeon))return route;
  const old=data.worldTravel.settlements[previous],owner=data.worldTravel.settlements[data.worldTravel.dungeonSettlements[dungeon]];
  const replace=p=>p.kind==='town'&&p.location===owner.root?{...p,location:old.root}:p;
  return {...route,a:replace(route.a),b:replace(route.b),name:`${old.name}と${data.dungeons[dungeon].name}の旧帰路`};
}

function sideAt(state,route){
  if(atWorldPlace(state,route.a))return {from:route.a,to:route.b};
  if(atWorldPlace(state,route.b))return {from:route.b,to:route.a};
  return null;
}
export function worldCrossPlan(engine,id){
  const {data,state}=engine,definition=data.worldTravel?.routes.find(r=>r.id===id),route=definition&&expeditionRoute(data,state,definition),side=route&&sideAt(state,route);
  if(!route||!side)return {ok:false,reason:'この道の出入口まで歩いてください。'};
  if(state.waiting||state.battle||state.battleResult||state.vm.length)return {ok:false,reason:'会話・戦闘を終えてから通過してください。'};
  const reason=dungeonRestrictionReason(state,'return');if(reason)return {ok:false,reason};
  if(side.from.kind==='town'&&!state.worldTravel.visited[townSettlement(data,state)])return {ok:false,reason:'まだ訪れていない町からは出発できません。'};
  if(side.to.kind==='dungeon'&&!engine.walkable(data.maps[side.to.map],side.to.x,side.to.y))return {ok:false,reason:'接続先の足場が塞がれています。'};
  return {ok:true,route,...side};
}
export function crossWorldRoute(engine,id){
  const p=worldCrossPlan(engine,id);if(!p.ok){engine.notify(p.reason);return false;}
  const {data,state}=engine,registeredNow=p.route.registration&&!state.worldTravel.registrations[p.route.registration];
  if(p.route.registration)state.worldTravel.registrations[p.route.registration]=true;
  if(p.to.kind==='town'){
    const settlement=Object.entries(data.worldTravel.settlements).find(([,s])=>s.root===p.to.location)?.[0];
    state.worldTravel.visited[settlement]=true;
    engine.arriveSettlement(p.to.location);
  }else{
    engine.teleport(p.to.map,p.to.x,p.to.y,p.to.facing??'east');
    engine.finishMove({x:p.to.x,y:p.to.y});
  }
  engine.notify(registeredNow?'探索隊の名を記帳した。乾いた交易回廊を抜け、退避所と外国側の窓口を通れば国境宿場へ出る。戻る時もこの道をたどれる。':p.to.kind==='town'?`${data.locations[p.to.location].name}に着いた。`:`${data.maps[p.to.map].name}へ進んだ。`);
  return true;
}
export function publicSupply(engine){
  const {data,state}=engine,settlement=data.worldTravel?.settlements[townSettlement(data,state)];
  if(!settlement?.publicSupply||state.townLocation!==settlement.publicSupply||state.waiting||state.battle||state.vm.length)return false;
  if(managesOil(state)){
    const e=state.expedition,pour=Math.min(data.system.lightCapacity-e.lamp.fuel,e.reserve);
    e.reserve-=pour;e.lamp.fuel+=pour;
    e.lamp.fuel+=Math.min(data.system.lightCapacity-e.lamp.fuel,oilRoom(data,state));
    e.lamp.effect=e.lamp.fuel?e.lamp.effect:null;e.reserve+=oilRoom(data,state);state.light=e.lamp.fuel;
  }else {state.light=data.system.lightCapacity;if(state.expedition)state.expedition.lamp={fuel:state.light,effect:null};}
  engine.notify('公開給油所で携行灯に油を補充した。手当と宿泊は別の窓口で受けられる。');return true;
}
export function worldTravelView(engine){
  const {data,state}=engine;if(!data.worldTravel)return null;
  const config=data.worldTravel,settlement=config.settlements[townSettlement(data,state)],anchor=config.settlements[state.worldTravel.returnAnchor],legacy=config.settlements[legacyExpeditionSettlement(data,state)],routes=config.routes.map(r=>expeditionRoute(data,state,r));
  const actions=routes.filter(r=>sideAt(state,r)).map(r=>({label:r.registration&&!state.worldTravel.registrations[r.registration]?'探索隊を記帳してオッドランド方面へ進む（無料）':r.name,intent:{type:'world.cross',route:r.id},enabled:worldCrossPlan(engine,r.id).ok,reason:worldCrossPlan(engine,r.id).reason??''}));
  if(settlement?.publicSupply===state.townLocation)actions.push({label:'携行油を補充する（無料）',intent:{type:'world.supply'},enabled:!state.waiting&&!state.battle&&!state.vm.length});
  const country=settlement?.country??legacy?.country??config.mapCountries[state.location?.map]??config.settlements[config.home].country;
  return {country:config.countries[country],settlement:settlement?.name??null,returnAnchor:anchor.name,actions,markers:routes.flatMap(r=>[r.a,r.b].filter(p=>p.kind==='dungeon'&&p.map===state.location?.map).map(p=>({id:`route:${r.id}`,name:r.name,x:p.x,y:p.y,kind:'map_connection',glyph:'⇄',inInteractionRange:atWorldPlace(state,p)})))};
}
export function worldTravelDefinitionErrors(data){
  const d=data.worldTravel;if(!d)return [];
  const errors=[],bad=message=>errors.push(`地域移動: ${message}`),id=x=>typeof x==='string'&&/^[a-z][a-z0-9_]*$/.test(x);
  if(!isRecord(d)||d.version!==1||!isRecord(d.settlements)||!isRecord(d.countries)||!isRecord(d.mapCountries)||!isRecord(d.mapRegistrations)||!isRecord(d.questSettlements)||!isRecord(d.dungeonSettlements)||!Array.isArray(d.routes)||!own(d.settlements,d.home))return ['地域移動: 基本定義不正'];
  const roots=new Set(),ids=new Set(),registrations=new Set(d.routes.filter(isRecord).map(r=>r.registration).filter(Boolean));
  for(const [key,s] of Object.entries(d.settlements)){
    if(!isRecord(s)){bad(`拠点不正 ${key}`);continue;}
    if(!id(key)||!s.name||!own(d.countries,s.country)||!data.locations[s.root]||data.locations[s.root].parent!==null||data.locations[s.root].dungeonEntrance||roots.has(s.root))bad(`拠点不正 ${key}`);
    roots.add(s.root);
    if(s.registration&&!registrations.has(s.registration))bad(`拠点の登録不正 ${key}`);
    for(const key of ['shopLocation','skillShopLocation','publicSupply'])if(s[key]&&(locationRoot(data,s[key])?.id!==s.root||key==='shopLocation'&&!data.locations[s[key]]?.shop))bad(`施設不正 ${s[key]}`);
  }
  if(d.settlements[d.home]?.root!==townRoot(data))bad('開始拠点不正');
  for(const [map,country] of Object.entries(d.mapCountries))if(!data.maps[map]||!own(d.countries,country))bad('マップの国が不正');
  for(const [map,registration] of Object.entries(d.mapRegistrations))if(!data.maps[map]||!registrations.has(registration))bad('マップの登録不正');
  for(const [key,value] of Object.entries(d.questSettlements))if(!data.quests[key]||!own(d.settlements,value))bad('受付拠点不正');
  for(const q of Object.values(data.quests))if(q.receptionLocations&&(!Array.isArray(q.receptionLocations)||!q.receptionLocations.length||q.receptionLocations.some(id=>!data.locations[id]?.quests||locationRoot(data,id)?.id!==d.settlements[d.questSettlements[q.id]??d.home]?.root)))bad(`受付施設不正 ${q.id}`);
  for(const [key,value] of Object.entries(d.dungeonSettlements))if(!data.dungeons[key]||!own(d.settlements,value))bad('出発拠点不正');
  if(d.previousDungeonSettlements!==undefined){
    if(!isRecord(d.previousDungeonSettlements))bad('移設前の出発拠点不正');
    else for(const [key,value] of Object.entries(d.previousDungeonSettlements))if(!data.dungeons[key]||!own(d.settlements,value)||!own(d.dungeonSettlements,key)||d.dungeonSettlements[key]===value)bad('移設前の出発拠点不正');
  }
  for(const r of d.routes){
    if(!isRecord(r)||!id(r.id)||ids.has(r.id)||!r.name){bad('接続ID不正');continue;}ids.add(r.id);
    if(r.registration!==undefined&&!id(r.registration))bad('登録ID不正');
    if(r.exitObject&&!([r.a,r.b].some(p=>p?.kind==='dungeon'&&p.map===r.exitObject.map&&data.maps[p.map]?.objects.some(o=>o.id===r.exitObject.id&&o.x===p.x&&o.y===p.y))))bad('地上出口不正');
    for(const p of [r.a,r.b]){
      errors.push(...worldPlaceErrors(data,p));
      if(p?.kind==='town'&&!roots.has(p.location)||p?.kind==='dungeon'&&!['north','east','south','west'].includes(p.facing))bad('接続先不正');
    }
    if(r.a?.kind==='town'&&r.b?.kind==='town')bad('徒歩経路のない拠点間接続');
    if(r.a?.kind==='dungeon'&&r.b?.kind==='dungeon'&&r.a.dungeon!==r.b.dungeon)bad('探索番号を保持する接続は同一迷宮内に定義してください');
  }
  return errors;
}
export function worldTravelSaveErrors(data,state){
  if(!data.worldTravel)return state.worldTravel===undefined?[]:['この版には地域移動の記録がありません'];
  const t=state.worldTravel,d=data.worldTravel,fail=()=>['地域移動・帰還先の保存状態不正'];
  if(!isRecord(t)||t.version!==1||Object.keys(t).some(k=>!['version','visited','registrations','returnAnchor','oilStores'].includes(k))||!isRecord(t.visited)||!isRecord(t.registrations)||!isRecord(t.oilStores)||!own(d.settlements,t.returnAnchor)||t.visited[t.returnAnchor]!==true||t.visited[d.home]!==true)return fail();
  for(const [id,value] of Object.entries(t.visited))if(!own(d.settlements,id)||value!==true)return fail();
  const registrations=new Set(d.routes.map(r=>r.registration).filter(Boolean));
  if(Object.entries(t.registrations).some(([id,v])=>!registrations.has(id)||v!==true))return fail();
  for(const [id,s] of Object.entries(t.oilStores))if(!own(d.settlements,id)||id===d.home||!own(t.visited,id)||!isRecord(s)||Object.keys(s).sort().join(',')!=='storedBottles,storedOil'||![s.storedOil,s.storedBottles].every(v=>Number.isSafeInteger(v)&&v>=0&&v<=1e9)||!managesOil(state)&&(s.storedOil||s.storedBottles))return fail();
  const map=state.location?.map??dungeonInterior(data,state)?.map;
  if(d.mapRegistrations[map]&&!t.registrations[d.mapRegistrations[map]]&&!legacyExpeditionSettlement(data,state))return fail();
  const active=state.dungeons?.active?.id;
  if(d.previousDungeonSettlements?.[active]&&![d.previousDungeonSettlements[active],d.dungeonSettlements[active]].includes(t.returnAnchor))return fail();
  const here=townSettlement(data,state);if(here&&!t.visited[here])return fail();
  for(const [id,s] of Object.entries(d.settlements))if(s.registration&&t.visited[id]&&!t.registrations[s.registration])return fail();
  return [];
}
