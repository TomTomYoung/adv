import notes from '../authoring/dungeon-page-notes.json' with {type:'json'};
import {questEvents} from '../src/core/quest-events.js';

const code=v=>'`'+v+'`';
const slug=v=>v.toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu,'').trim().replace(/\s/g,'-');
const percent=v=>`${Number((v*100).toFixed(2))}％`;
const name=(data,id)=>data.items[id]?.name??data.skills[id]?.name??data.fieldAbilities[id]?.name??data.statuses[id]?.name??data.buffs[id]?.name??id;
const names=(data,ids)=>(ids??[]).map(id=>name(data,id)).join('・')||'なし';
const goods=(data,items)=>Object.entries(items??{}).map(([id,n])=>`${name(data,id)}${n}個`).join('・')||'なし';
const label=file=>({
 'KAGARIBI_EXPANSION.md':'篝火の迷宮の拡張仕様','KAGARIBI_DUNGEON.md':'火・種火・くらがり',
 'DUNGEON_RESTRICTIONS.md':'帰還封印と禁止','EVENT_CHECKPOINTS.md':'イベントの巻き戻し',
 'WATERWAY_EXPANSION.md':'水路拡張と地下関所','CONNECTED_2D_MAPS.md':'2D区画の接続',
 'WATERWAYS_SALT_MINE.md':'給排水・装備の塩・破壊壁','WORLD_LOCATIONS.md':'町とダンジョン室内',
 'scenarios/Q004_WORLD_ROUTE.md':'q004の実移動','DUNGEON_SYSTEMS.md':'固有システムの共通実装',
 'JOB_SYSTEM.md':'職業・技能'
}[file]??file);
export const dungeonPagePath=id=>`dungeons/details/${id}.md`;
export function orderedDungeons(data){
 const ids=Object.keys(notes);
 if(ids.length!==Object.keys(data.dungeons).length||ids.some(id=>!data.dungeons[id]))throw Error('専用ページの解説とダンジョン定義を一致させてください');
 return ids.map(id=>data.dungeons[id]);
}
const mapName=(data,id)=>data.maps[id].name;
const point=(data,p)=>`${mapName(data,p.map)} (${p.x}, ${p.y})`;
const localPoint=p=>`(${p.x}, ${p.y})`;
const systemLabels={fire_network:'火と種火',map_connections:'区画の接続',compartment_water:'区画の給排水',corrosion:'装備への塩の蓄積',breakable_walls:'破壊できる壁',plant_garden:'植物の育成',warp_network:'鏡による転移',skill_library:'技能の貸出',market_pacts:'取引と警戒',air_supply:'空気の残量',power_grid:'動力の配分',terrain_shift:'地形の切り替え',vector_curse:'逆行による衰弱',suppression_zone:'術と効果の遮断'};
const mapsFor=(data,d)=>d.maps.map(id=>data.maps[id]);
const relatedEvents=(data,d)=>questEvents(data).filter(e=>(e.points??[]).some(p=>d.maps.includes(p.map)));
const questLink=q=>Number(q.id.slice(1))<=10?`[${q.id} ${q.title}](QUEST_${q.id.toUpperCase()}.md)`:`[${q.id} ${q.title}](QUEST_CATALOG.md#${slug(q.id+' '+q.title)})`;

export function dungeonCatalog(data,{date=new Date().toISOString().slice(0,10)}={}){
 const ds=orderedDungeons(data),out=['# ダンジョンカタログ','',`更新日: ${date}。作品版${data.game.version}。${ds.length}ダンジョン・${Object.keys(data.maps).length}件の2Dマップ・${Object.keys(data.quests).length}クエスト。`,'',
 'ダンジョン名から専用ページへ進めます。各ページに概要、区画と経路、固有の仕組み、設備と通常遭遇、室内、関連クエスト、保存状態、編集元をまとめています。','',
 '[専用ページ一覧](dungeons/details/README.md) ／ [探索・ダンジョン文書](dungeons/README.md) ／ [現在の状態](CURRENT_STATUS.md)',''];
 for(const [i,d] of ds.entries())out.push(`## ${i+1}. [${d.name}](${dungeonPagePath(d.id)})`,'',`${notes[d.id].summary} 推奨Lv.${d.recommendedLevel}、${d.maps.length}区画。`,'');
 out.push('## 読み方と保守','',
 '掲載数値・配置は現在の配布JSONから生成しています。推奨Lvは迷宮全体の目安です。関連クエストの掲載は現地イベントの配置に基づき、全場面の実移動が接続済みであることを意味しません。物語内の行動を出発・到着へ全面接続した範囲はq001〜q004です。','',
 `[解説原稿](../authoring/dungeon-page-notes.json)と配布データを更新し、${code('npm run build:docs')}でカタログと専用ページをまとめて再生成します。検査は${code('npm run check:docs')}です。ゲームデータを変更した場合は、先に${code('npm run build:dungeons')}等の対応する生成処理を実行してください。`,'',
 '[共通部品の設計](DUNGEON_SYSTEM_DESIGN.md)、[区画接続](CONNECTED_2D_MAPS.md)、[素材と現地調査](DUNGEON_ART_AND_SCENARIOS.md)を参照できます。旧3D・潮汐の退避原稿は現行マップへ数えません。現行内容版のセーブは旧内容版から移行せず、読込に失敗した場合は新規開始します。','');
 return out.join('\n');
}

export function dungeonPageIndex(data){
 return ['# ダンジョン専用ページ','',`作品版${data.game.version}。${orderedDungeons(data).length}迷宮の専用ページです。[カタログ](DUNGEON_CATALOG.md) ／ [探索文書](dungeons/README.md)。`,'',
 ...orderedDungeons(data).flatMap(d=>[`[${d.name}](${dungeonPagePath(d.id)})：${notes[d.id].summary}`,''])].join('\n');
}

function systemRules(data,s){
 switch(s.use){
  case 'fire_network':return [
   `携帯火は最大${s.portable.capacity}成功歩、残り${s.portable.warnings.join('・')}歩で警告します。燃料には${name(data,s.fuelItem)}を使います。火台は${s.fixtures.length}基です。`,
   `守りのない歩行では${data.system.encounterCheckSteps}成功歩ごとに基本${percent(s.threat.encounterRate)}で抽選します。当選後の候補は${s.threat.encounterPool.map(p=>`${data.encounters[p.encounter].enemies.map(id=>data.enemies[id].name).join('・')}（重み${p.weight}）`).join('、')}です。移動中の物語行為に遭遇時の到着条件がある場合は、指定遭遇の当選後に現地の物語イベントへ進みます。消灯だけで即座に戦闘を始める処理ではありません。`,
   ...Object.values(s.effects).map(e=>`${e.name}：${e.description} 通常遭遇率${e.encounterRate}倍、通常敵の能力${e.enemyScale}倍。`)
  ];
  case 'map_connections':return [`接続${s.links.length}本。通常扉・水密扉は接続口の壁面、階段は接続セルで操作します。条件と水没状態は歩行・操作・表示で共通に判定します。`];
  case 'compartment_water':return [`給排水対象は${s.zones.length}水路、操作盤の配置は${s.controls.length}か所です。${s.zones.map(z=>`${mapName(data,z.map)}は初期${z.initiallyFlooded?'水没':'排水済み'}`).join('。')}。`];
  case 'corrosion':return [`戦闘開始ごとに装備個体へ塩${s.perBattle}を加算します。塩${s.eater.threshold}以上で${data.enemies[s.eater.enemy].name}の出現条件を満たします。洗浄地点は${s.washZones.map(p=>point(data,p)).join('、')}です。`];
  case 'breakable_walls':return [`破壊壁${s.walls.length}か所。各壁に使用可能な道具・探索特技を設定し、実行前に距離・資材・MPを検査します。`];
  case 'plant_garden':return [`植床${s.plots.length}か所、植物${Object.keys(s.species).length}種。育苗箱の一度限りの支給は${goods(data,s.supplies)}です。`,
   ...Object.values(s.species).map(v=>`${v.name}：生長${v.growth}行動、半径${v.radius}。${v.description} 材料は${goods(data,v.materials)}、成株の採取は${goods(data,v.harvest)}、未成熟での回収は${goods(data,v.immatureHarvest)}。`)];
  case 'warp_network':return [`鏡${s.portals.length}枚。鏡ごとの実際の移動先を「区画と設備」に掲載します。通常階段の経路は「入口と区画間の移動」を参照してください。`];
  case 'skill_library':return [`書物${s.books.length}冊、封印${s.gates.length}か所。借りられる技能は${names(data,[...new Set(s.books.map(b=>b.skill))])}です。費用は技能・探索特技の定義に従います。`];
  case 'market_pacts':return [`取引${s.offers.length}件。戦闘開始で警戒が増え、警戒${s.closeAt}で店・交渉窓口が閉じます。警戒の上限は${s.maxAlarm}です。`,
   `護衛は${s.escortSteps}歩、通常遭遇率${s.escortRate}倍、通常敵の能力${s.escortEnemyScale}倍です。用心棒の配置は${s.guards.length}か所で、配置ごとの警戒条件を持ちます。`];
  case 'air_supply':return [`空気の最大値は${s.capacity}、警告は${s.warning}以下。水中移動で${s.perStep}、戦闘開始で${s.perBattle}、戦闘ラウンドで${s.perRound}消費します。`,
   `空気0の消費機会には、最大HPの${percent(s.suffocation)}を切り上げた窒息ダメージを受けます。初期補給地点${s.pockets.length}か所、浮上装置${s.devices.length}基です。`];
  case 'power_grid':return [`動力容量${s.capacity}を迷宮全体で共有します。配電盤${s.controls.length}か所、装置${s.devices.length}基。修復は探索ごとに計${s.repairsPerRun}回です。`];
  case 'terrain_shift':return [`地形は${s.states.map(v=>v.name).join('・')}の${s.states.length}種類。初期配置は${s.states.find(v=>v.id===s.initial).name}です。`,
   s.mode==='random'?`変化の間隔は${s.interval.min}〜${s.interval.max}行動で、現在とは別の姿勢を選びます。`:`天球儀${s.controls.length}か所で手動切り替えします。`,
   `切り替え対象は${new Set(s.states.flatMap(v=>v.tiles.map(p=>`${p.map}/${p.x}/${p.y}`))).size}セル。固定足場は${s.refuges.length}か所です。`];
  case 'vector_curse':return [`逆行1歩で${s.perStep}重、上限${s.maxStacks}重。${s.stats.map(v=>({str:'攻撃',vit:'防御',agi:'素早さ',int:'知力'}[v]??v)).join('・')}へ${s.factor}の累積数乗倍を適用します。流れを持つセルは${s.vectors.length}か所です。`];
  case 'suppression_zone':return [`遮断区域${s.cells.length}セル。使用禁止の戦闘技能：${names(data,s.blockedSkills)}。使用禁止の探索特技：${names(data,s.blockedAbilities)}。`,
   `効果停止の技能：${names(data,s.suppressedSkills)}。状態異常：${names(data,s.statuses)}。戦闘補正：${names(data,s.buffs)}。道具・装備：${names(data,s.items)}。`];
  default:throw Error(`専用ページ未対応の部品: ${s.use}`);
 }
}

function equipment(data,s,map){
 const rows=[];
 const add=(p,text)=>{if(p.map===map)rows.push(`${p.name??p.id??'地点'} ${localPoint(p)}${text?`：${text}`:''}。`);};
 for(const p of s.fixtures??[])add(p,`${s.effects[p.effect].name}、範囲${p.radius}、燃料${p.capacity??'無期限'}、初期${p.initiallyLit?'点灯':'消灯'}`);
 for(const p of s.controls??[])add(p,'操作盤');
 for(const p of s.plots??[])add(p,'植床');
 if(s.supply)add(s.supply,'一度限りの育苗資材');
 for(const p of s.portals??[]){const target=s.portals.find(v=>v.id===p.destination);add(p,`移動先は${target.name}／${point(data,target)}`);}
 for(const p of s.books??[])add(p,`借りる技能は${name(data,p.skill)}`);
 for(const p of s.gates??[])add(p,`開門技能は${name(data,p.ability)}`);
 for(const p of s.walls??[])add(p,`使用可能な道具：${names(data,p.items)}／特技：${names(data,p.abilities)}`);
 for(const p of s.offers??[])add(p,`${p.description} 費用${p.gold}G、材料${goods(data,p.cost)}、受け取る品${goods(data,p.output)}`);
 for(const p of s.guards??[])add(p,`警戒${p.alarm}以上で出現`);
 for(const p of s.pockets??[])add(p,'空気補給');
 for(const p of s.devices??[])add(p,s.use==='power_grid'?`必要動力${p.power}、系統${s.controls.find(v=>v.id===p.circuit)?.name??p.circuit}${p.destination?`、移動先${point(data,p.destination)}`:''}`:'浮上により空気補給地点と通路を追加');
 for(const p of s.refuges??[])add(p,'地形変化時の固定足場');
 if(s.threat?.point)add(s.threat.point,'魔物を誘導し、次に踏むセルで戦闘');
 return rows;
}

function routes(data,d){
 const out=[];
 for(const [id,e] of Object.entries(d.entries)){const p=data.maps[e.map][e.point];out.push(`入口${code(id)}：${point(data,{map:e.map,...p})}。`);}
 for(const s of Object.values(d.systems).filter(s=>s.use==='map_connections'))for(const l of s.links)out.push(`${l.name}：${point(data,l.a)} ↔ ${point(data,l.b)}。${l.requirement?`開通条件：${l.requirement}`:l.condition!==undefined?`条件式：${code(JSON.stringify(l.condition))}。`:l.kind==='watertight_door'?'接続先が完全水没している間は通れません。':''}`);
 for(const m of mapsFor(data,d))for(const o of m.objects.filter(o=>!o.quest&&o.kind==='stairs')){
  // Only direct, authored stair transfers are described as unconditional routes.
  for(const c of data.scripts[o.script]?.commands??[])if(c.op==='map.teleport'&&d.maps.includes(c.map))out.push(`${o.name}：${point(data,{map:m.id,...o})} → ${point(data,c)}。`);
 }
 return out;
}

export function dungeonPage(data,id,{date=new Date().toISOString().slice(0,10)}={}){
 const d=data.dungeons[id],n=notes[id];if(!d||!n)throw Error(`専用ページの定義なし: ${id}`);
 const out=[`# ${d.name}`,'',`更新日: ${date}。作品版${data.game.version}。ID ${code(id)}、推奨Lv.${d.recommendedLevel}、${d.maps.length}区画。`,'',
 '[ダンジョンカタログ](DUNGEON_CATALOG.md) ／ [専用ページ一覧](dungeons/details/README.md) ／ [探索文書](dungeons/README.md)','',
 '## 概要と進み方','',d.description,'',...n.guide.flatMap(p=>[p,'']),
 '## 入口と区画間の移動','',...routes(data,d).flatMap(p=>[p,'']),
 '## 固有の仕組みと現在の数値',''];
 for(const s of Object.values(d.systems))out.push(`### ${s.title??systemLabels[s.use]??s.use} (${s.use})`,'',s.enabled===false?'現在は無効です。':'現在有効な部品です。','',...systemRules(data,s).flatMap(v=>[v,'']));
 out.push('## 区画と設備','',`座標は各マップ左上が (0, 0)、xが右、yが下です。通常遭遇は${data.system.encounterCheckSteps}成功歩ごとに抽選し、安全なセルや配置物の地点では止めます。掲載する遭遇率は隊・環境による補正前の値です。固有条件による遭遇の置き換えやシナリオの固定戦闘は別に判定します。`,'');
 for(const m of mapsFor(data,d)){
  out.push(`### ${m.name}`,'',`第${m.floor}層、${m.tiles[0].length}×${m.tiles.length}セル。[配布マップ ${m.id}](../data/maps/${m.id}.json)。`,'');
  const pool=m.encounterPool??(m.encounter?[{encounter:m.encounter,weight:1}]:[]);
  out.push(`通常遭遇率${percent(m.encounterRate??0)}。候補：${pool.map(p=>`${data.encounters[p.encounter].enemies.map(id=>data.enemies[id].name).join('＋')}（重み${p.weight}）`).join('、')||'なし'}。`,'');
  for(const s of Object.values(d.systems))out.push(...equipment(data,s,m.id).flatMap(v=>[v,'']));
  const objects=m.objects.filter(o=>!o.quest&&o.kind!=='stairs');
  if(objects.length)out.push(`固有の配置物：${objects.map(o=>`${o.name} ${localPoint(o)}${o.once?'（一度限り）':''}`).join('、')}。`,'');
 }
 out.push('## 室内と施設','');
 const roots=Object.values(data.locations).filter(l=>l.dungeonEntrance?.dungeon===id);
 if(!roots.length)out.push('この迷宮には、共通ロケーション画面へ入る専用の室内入口はありません。','');
 for(const l of roots){out.push(`${l.name}：${point(data,l.dungeonEntrance)}から入ります。${l.description}`,'');
  const locations=Object.values(data.locations).filter(p=>p.id===l.id||p.parent===l.id);
  for(const p of locations){const services=data.game.services.filter(s=>p.services?.includes(s.id));out.push(`${p.name}の施設機能：${services.map(s=>s.label).join('・')||'専用サービスなし'}。${p.parent?'同じ室内の親施設から移動します。':'退出時は元の戸口へ戻ります。'}`,'');}
 }
 out.push('## 関連クエストと現地調査','','配布イベントがこの迷宮のマップに配置されている依頼です。q001〜q004は物語内の出発・到着を実移動へ接続しています。q005以降は受付や訪問地点の配置を含み、全場面が別々の実座標に接続されているわけではありません。装置を動かしただけで証拠や結末を自動確定しません。','');
 const events=relatedEvents(data,d),ids=[...new Set(events.map(e=>e.quest))].sort();
 for(const qid of ids){const q=data.quests[qid],es=events.filter(e=>e.quest===qid),maps=[...new Set(es.flatMap(e=>e.points.filter(p=>d.maps.includes(p.map)).map(p=>p.map)))];out.push(`${questLink(q)}：${maps.map(mid=>mapName(data,mid)).join('・')}。`,'');}
 if(!ids.length)out.push('現地に配置された番号付き依頼はありません。','');
 for(const e of events.filter(e=>e.note))out.push(`現地調査「${e.title}」／${e.quest}：${e.note.text}`,'',`調査地点：${e.points.filter(p=>d.maps.includes(p.map)).map(p=>point(data,p)).join('、')}。現在の装置状態などが記録条件を満たす必要があります。`,'');
 out.push('## 保存と帰還','',n.persistent,'',`内容版${data.game.version}の同版セーブで再開します。旧内容版は移行せず、読込失敗時は新規開始します。`,'',
 '## 編集元と関連仕様','',`迷宮の正本：[config/dungeons/${id}.json](../config/dungeons/${id}.json)。セル地形：[config/cell-layers.json](../config/cell-layers.json)。追加マップ・道具など：[${id==='kagaribi'?'篝火原稿':'追加コンテンツ原稿'}](../config/${id==='kagaribi'?'kagaribi-content':'dungeon-content'}.json)。${['region_1','region_2','region_3'].includes(id)?' 接続区画の配置は[接続マップ原稿](../config/connected-maps.json)で管理します。':''}`,'',
 'クエスト配置は各 `config/quests/qXXX.events.json`、室内は [config/locations.json](../config/locations.json) を編集します。生成済みの配布JSONと本ページを直接直すと、再生成で上書きされます。','',
 `${n.references.map(file=>`[${label(file)}](${file})`).join(' ／ ')}。`,'',
 '[素材と現地調査](DUNGEON_ART_AND_SCENARIOS.md) ／ [通常敵と特殊な敵](MONSTER_CATALOG.md) ／ [実施済みの検証](PROGRESS.md)。','',
 `文章の正本は[専用ページ解説](../authoring/dungeon-page-notes.json)、組み立ては[生成器](../tools/dungeon-pages.mjs)です。${code('npm run build:docs')}で更新し、${code('npm run check:docs')}でデータとの一致とリンクを検査します。`,'');
 if(n.source)out.push(`[元設定のNotionページ](${n.source})。旧カタログで2026-09-14に照合した出典を継承しています。このページの数値と動作は現在のリポジトリを基準にしています。`,'');
 return out.join('\n');
}

export function dungeonPageBundle(data,options={}){
 return {'DUNGEON_CATALOG.md':dungeonCatalog(data,options),'dungeons/details/README.md':dungeonPageIndex(data),...Object.fromEntries(orderedDungeons(data).map(d=>[dungeonPagePath(d.id),dungeonPage(data,d.id,options)]))};
}
