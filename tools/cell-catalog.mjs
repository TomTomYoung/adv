import {questEvents} from '../src/core/quest-events.js';
import {emptyVoxels,freshVoxelState,hasFooting,voxelDepth} from '../src/core/voxels.js';

// Documentation inventory: count authored records separately from runtime states.
export function cellCatalogInventory(data){
  const out=['## 配布データから生成した配置索引','',`作品版${data.game.version}。以下の件数と配置例は npm run build:docs で更新します。配置定義を数えるため、条件不成立・過去経路のオブジェクトも含みます。通行可・不可の件数は元の通行投影、足場と水深は初期地形状態です。探索後の地形や同時に有効なイベント数ではありません。`,''];
  const maps=Object.values(data.maps),flat=maps.filter(m=>!m.voxels),cubic=maps.filter(m=>m.voxels);
  const countTiles=(layers,tile)=>layers.reduce((n,layer)=>n+layer.reduce((n,row)=>n+Array.from(row).filter(c=>c===tile).length,0),0);
  const point=p=>`${p.map??''}${p.map?' ':''}(${p.x},${p.y}${p.z===undefined?'':','+p.z})`;
  const code=value=>'`'+value+'`';
  const mapLink=id=>`[${id}](../data/maps/${id}.json)`;
  const locations=ps=>ps.length?ps.map(p=>`${p.id?'`'+p.id+'` ':''}${point(p)}`).join(' ／ '):'配置なし';
  const unique=ps=>new Set(ps.map(p=>`${p.map}/${p.x},${p.y},${p.z??0}`)).size;
  const sample=ps=>locations(ps.slice(0,2));
  const grouped=(records,key)=>Object.fromEntries([...new Set(records.map(r=>r[key]))].sort().map(k=>[k,records.filter(r=>r[key]===k)]));
  const names=(ids,defs)=>ids.map(id=>`${defs[id]?.name??id} (${id})`).join('・')||'なし';
  const bits=r=>`人物${r.passage?'可':'不可'}・水${r.water?'可':'不可'}・支持${r.support?'あり':'なし'}`;
  const line=s=>out.push(s,'');
  line(`2D ${flat.length}マップ、3D ${cubic.length}マップ、計${maps.length}マップ。2Dの通行可は${countTiles(flat.map(m=>m.tiles),'.')}セル、通行不可は${countTiles(flat.map(m=>m.tiles),'#')}セルです。`);
  out.push('### セル種プリセット','');
  for(const [id,p] of Object.entries(data.cellTypes??{}))line(`${code(id)}：通行 ${code(p.passage)}、表示 ${code(JSON.stringify(p.visual))}、環境 ${code(JSON.stringify(p.parameters))}、セルイベント ${p.events.map(code).join('・')||'なし'}。`);
  out.push('### マップ別の基礎地形','');
  for(const m of maps){
    if(!m.voxels){line(`${mapLink(m.id)} ${m.name}：2D、通行可${countTiles([m.tiles],'.')}・通行不可${countTiles([m.tiles],'#')}。`);continue;}
    const state=freshVoxelState(m),empty=emptyVoxels(m,state),standing=empty.filter(p=>hasFooting(m,state,p));
    line(`${mapLink(m.id)} ${m.name}：3D、z=${m.voxels.minZ}〜${m.voxels.minZ+m.voxels.layers.length-1}、空${empty.length}・密${countTiles(m.voxels.layers,'#')}。空の内訳は初期足場あり${standing.length}・なし${empty.length-standing.length}。水深0/1/2/3の初期セル数は${[0,1,2,3].map(n=>empty.filter(p=>voxelDepth(state,p)===n).length).join('/')}。`);
  }
  const objects=maps.flatMap(m=>m.objects.map(o=>({...o,map:m.id}))),objectGroups=grouped(objects,'kind');
  out.push('### セル上のイベント種別','');
  line(`マップ固有とクエストから投影した map.objects は計${objects.length}定義、${Object.keys(objectGroups).length}種、配置座標は${unique(objects)}か所です。件数はイベント定義数で、別の種別が同じ座標にある場合があります。safe は通常のランダム遭遇判定の抑止であり、仕掛けやスクリプトによる戦闘まで無効にする値ではありません。`);
  for(const [kind,entries] of Object.entries(objectGroups)){
    line(`${code(kind)}：${entries.length}定義。進入時${entries.filter(o=>o.trigger==='enter').length}／調べる${entries.filter(o=>o.trigger==='interact').length}、blocking指定${entries.filter(o=>o.blocking).length}、safe指定${entries.filter(o=>o.safe).length}、once指定${entries.filter(o=>o.once).length}。配置例：${sample(entries)}。`);
  }
  out.push('### ダンジョン固有の状態・操作点','');
  const handlers={
    map_connections(s){for(const l of s.links)line(`接続 ${code(l.id)} ${l.name}：${l.kind}、${point(l.a)} ↔ ${point(l.b)}。扉は壁面、階段は乾いた区画内の足場に配置。`);},
    compartment_water(s){for(const z of s.zones)line(`密閉水路 ${code(z.map)}：初期${z.initiallyFlooded?'完全水没・進入禁止':'排水済み'}、給排水弁 ${code(z.control)}。セルごとの水壁は作らない。`);line(`乾いた操作盤：${locations(s.controls)}。`);},
    fire_network(s){
      line(`火台${s.fixtures.length}か所。${locations(s.fixtures)}。`);
      for(const [id,e] of Object.entries(s.effects))line(`火の効果 ${code(id)} ${e.name}：くらがり除け${e.repels?'あり':'なし'}、通常遭遇率×${e.encounterRate}、敵倍率×${e.enemyScale}、優先度${e.priority}。`);
    },
    waterworks(s){
      for(const f of s.floors)line(`フロア ${code(f.map)}：通路全体が一律の水没度0〜10。制御：${f.controls.join('・')}。`);
      line(`周期：${s.phases.map(p=>`${p.name} ${p.duration}刻／内部水位${p.level}`).join(' → ')}。制御点${s.controls.length}か所：${locations(s.controls)}。`);
    },
    breakable_walls(s){line(`破壊壁${s.walls.length}セル：${locations(s.walls)}。`);},
    corrosion(s){line(`戦闘開始ごとに装備個体へ塩${s.perBattle}を加算。塩${s.eater.threshold}以上でソルトイーターの対象。洗浄地点：${locations(s.washZones)}。`);},
    plant_garden(s){
      line(`植床${s.plots.length}か所、育苗箱${point(s.supply)}。${locations(s.plots)}。`);
      for(const [id,p] of Object.entries(s.species)){
        const candidates=s.plots.filter(plot=>!p.terrain||plot.terrain[p.terrain]);
        line(`${code(id)} ${p.name}：生長${p.growth}回、半径${p.radius}、生長後の回復${p.heal}／遭遇率×${p.encounterRate}、地形${p.terrain??'変更なし'}。対応植床${candidates.length}か所。`);
      }
      for(const plot of s.plots)for(const [kind,changes] of Object.entries(plot.terrain))line(`植床 ${code(plot.id)} の${kind}：${Array.isArray(changes)?changes.map(p=>`${point(p)}を${p.tile}`).join(' ／ '):`${point(changes)}へ移送`}。`);
    },
    terrain_shift(s){
      line(`${s.mode==='manual'?'操作式':'自動式'}。初期状態${s.initial}、対象${unique(s.states.flatMap(p=>p.tiles))}セル、${s.states.length}状態。${s.interval?`切替間隔${s.interval.min}〜${s.interval.max}回。`:''}`);
      for(const state of s.states)line(`${state.name} (${state.id})：${state.tiles.map(p=>`${point(p)}=${p.tile}`).join(' ／ ')}。`);
      line(`操作点：${locations(s.controls)}。固定退避点：${locations(s.refuges)}。`);
    },
    warp_network(s){
      for(const p of s.portals){const dest=s.portals.find(q=>q.id===p.destination);line(`鏡 ${code(p.id)} ${point(p)} → ${code(dest.id)} ${point(dest)}。到着時の向き${dest.facing??'north'}。`);}
    },
    skill_library(s){
      line(`書物${s.books.length}か所：${locations(s.books)}。`);
      for(const g of s.gates)line(`封印 ${code(g.id)} 操作${point(g)}、技能${g.ability}、開通先${locations(g.tiles)}。`);
    },
    market_pacts(s){
      for(const [kind,offers] of Object.entries(grouped(s.offers,'kind')))line(`取引 ${code(kind)} ${offers.length}か所：${locations(offers)}。変更先${locations(offers.flatMap(o=>o.tiles))}。`);
      line(`用心棒${s.guards.length}か所：${s.guards.map(g=>`${point(g)} 警戒${g.alarm}以上`).join(' ／ ')}。閉店は警戒${s.closeAt}以上、上限${s.maxAlarm}。`);
    },
    air_supply(s){
      const pocketKeys=new Set(s.pockets.map(p=>`${p.map}/${p.x},${p.y}`));
      line(`水中候補${unique(s.water)}セル、初期空気溜まり${unique(s.pockets)}セル。候補から初期空気溜まりを除いた初期水中は${unique(s.water.filter(p=>!pocketKeys.has(`${p.map}/${p.x},${p.y}`)))}セル。水中候補例：${sample(s.water)}。`);
      line(`浮上装置${s.devices.length}か所、追加空気溜まり${unique(s.devices.flatMap(d=>d.pockets))}セル、開通対象${unique(s.devices.flatMap(d=>d.tiles))}セル。${locations(s.devices)}。`);
      line(`空気上限${s.capacity}、警告${s.warning}以下、移動${s.perStep}／戦闘開始${s.perBattle}／ラウンド${s.perRound}消費。枯渇時は最大HPの${s.suffocation*100}%相当を切り上げて損傷。`);
    },
    power_grid(s){
      line(`配電盤${s.controls.length}か所：${locations(s.controls)}。動力容量${s.capacity}。`);
      for(const [kind,devices] of Object.entries(grouped(s.devices,'kind')))line(`動力装置 ${code(kind)} ${devices.length}か所：${locations(devices)}。${kind==='door'?`開通対象${locations(devices.flatMap(d=>d.tiles))}。`:kind==='elevator'?`移送先${locations(devices.map(d=>d.destination))}。`:''}`);
    },
    vector_curse(s){
      line(`方向ベクトル${unique(s.vectors)}セル。${Object.entries(grouped(s.vectors.map(v=>({...v,direction:`${v.dx},${v.dy}`})),'direction')).map(([dir,vs])=>`(${dir})=${vs.length}`).join(' ／ ')}。逆向き移動1回で${s.perStep}重加算、上限${s.maxStacks}、1重ごと×${s.factor}、対象${s.stats.join('/')}。`);
    },
    suppression_zone(s){
      line(`術の遮断区域${unique(s.cells)}セル。配置例：${sample(s.cells)}。`);
      line(`使用禁止の戦闘技能：${names(s.blockedSkills,data.skills)}。探索技能：${names(s.blockedAbilities,data.fieldAbilities)}。`);
      line(`効果停止の技能：${names(s.suppressedSkills,data.skills)}。状態：${names(s.statuses,data.statuses)}。バフ：${names(s.buffs,data.buffs)}。装備・道具：${names(s.items,data.items)}。`);
      if(s.threat)line(`追跡者の誘導点：${point(s.threat.point)}。遭遇${s.threat.encounter}。`);
    },
    voxel_space(s){line(`立体対象：${s.maps.map(mapLink).join('・')}。入口${s.portals.length}か所：${s.portals.map(p=>`${point(p.at)} → ${point(p.destination)}`).join(' ／ ')}。六面と経路は次の立体配置索引を参照してください。`);}
  };
  for(const dungeon of Object.values(data.dungeons)){
    out.push(`#### ${dungeon.name} (${dungeon.id})`,'');
    line(`定義：[${dungeon.id}.json](../config/dungeons/${dungeon.id}.json)。`);
    for(const scene of questEvents(data).filter(e=>e.dungeon===dungeon.id&&e.note))line(`現地調査 ${code(scene.id)} ${scene.title}：関連${scene.quest}、操作点${locations(scene.points)}。`);
    for(const [id,s] of Object.entries(dungeon.systems)){
      if(!handlers[s.use])throw Error(`セルカタログの集計を追加してください: ${s.use}`);
      line(`部品 ${code(id)} / ${code(s.use)} ${s.enabled===false?'無効':'有効'}。`);handlers[s.use](s);
    }
  }
  out.push('### 立体の共有面・経路・装置','');
  for(const m of cubic){
    line(`${mapLink(m.id)}：面${m.voxels.faces.length}、経路${m.voxels.links.length}、装置${m.voxels.devices.length}。`);
    for(const f of m.voxels.faces)line(`面 ${code(f.id)} ${f.name}：${point(f.at)}/${f.side}。${f.operable?`開閉可、初期${f.initiallyOpen?'開':'閉'}、操作${point(f.handle)}`:`固定${f.initiallyOpen?'開':'閉'}（反対の状態は操作で使用しません）`}。閉：${bits(f.closed)}。開：${bits(f.open)}。人物・水の各値は両方向共通です。`);
    for(const l of m.voxels.links)line(`経路 ${code(l.id)} ${l.name}：${l.kind}、${l.bidirectional?'往復可':'順方向のみ'}。${l.path.map(point).join(' → ')}。利用${l.access.kind}${l.access.item?`／${l.access.item}×${l.access.count}`:l.access.ability?`／${l.access.ability}`:''}。`);
    for(const d of m.voxels.devices)line(`装置 ${code(d.id)} ${d.name}：${d.kind}、操作${point(d.at)}、対象${point(d.target)}。${d.kind==='pump'?`区域の水没度を${d.amount}段階上げる操作。`:`材料${d.item}×${d.count}${d.ability?`または技能${d.ability}`:''}。`}`);
    const unused=['ladder','stairs','vine','rope','bridge'].filter(kind=>!m.voxels.links.some(l=>l.kind===kind));
    line(`経路kindとして対応済みで、このマップに配置のないもの：${unused.join('・')||'なし'}。橋の床板という共有面は、bridge経路の配置数に加算しません。`);
  }
  return out.join('\n');
}
