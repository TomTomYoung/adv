import {catalogContentHash,questCatalog,questEventId,questPages} from './quest-catalog.mjs';
import {describePlace} from './location-catalog.mjs';

const code=v=>'`'+v+'`';
const slug=text=>text.toLowerCase().replace(/[^\p{L}\p{N}\p{M}\s_-]/gu,'').trim().replace(/\s/g,'-');
const xml=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
const block=value=>'```json\n'+JSON.stringify(value,null,2)+'\n```';
const rawMap=map=>({...map,objects:map.objects.filter(o=>!o.quest)});
const sceneLink=(q,node)=>`[${questEventId(q,'S',node.id)}](#${slug(`${q.id} / ${node.id} — ${q.story.scenes[node.id].title}`)})`;

// IDs use source keys, not array positions. Inserting a scene never renumbers an event.
export function questPageEvents(q){
  const entries=[
    ...q.model.graph.map(n=>({id:questEventId(q,'S',n.id),kind:'scene',source:n.id,place:q.story.worldPlaces[q.story.scenes[n.id].place]})),
    ...q.events.map(e=>({id:questEventId(q,'P',e.id),kind:'placement',source:e.id,points:e.points})),
    ...q.model.graph.flatMap(n=>{
      const unit=q.model.narrative.units.find(u=>u.id===n.id),place=q.story.worldPlaces[q.story.scenes[n.id].place];
      const battles=[];
      function walk(commands, key){
        for(const c of commands){
          if(c.op==='battle.start'){
            const id=c.id??`${q.id}-F-${key}-${c.encounter}`;
            battles.push({id,kind:'fieldBattle',source:id,place},...(c.events??[]).map(e=>({id:e.id,kind:'battleEvent',source:e.id,place})));
          }
          for(const option of c.options??[])walk(option.commands,`${key}-${option.id}`);
          for(const branch of ['then','else','on_win','on_escape','on_lose','on_interrupt'])if(c[branch])walk(c[branch],`${key}-${branch}`);
        }
      }
      walk(q.scripts[unit.script].commands,n.id);return battles;
    }),
    ...Object.keys(q.outcomes).map(id=>({id:questEventId(q,'E',id),kind:'ending',source:id}))
  ];
  if(new Set(entries.map(e=>e.id)).size!==entries.length)throw Error(`${q.id}: duplicate documentation event ID`);
  return entries;
}

function mapGroups(q,map){
  const groups=new Map();
  const add=(p,id)=>{
    if(p.map!==map.id)return;
    const key=`${p.x},${p.y}`;
    if(map.tiles[p.y]?.[p.x]!=='.')throw Error(`${q.id}/${id}: placement is not walkable`);
    if(!groups.has(key))groups.set(key,{x:p.x,y:p.y,ids:[]});
    groups.get(key).ids.push(id);
  };
  for(const e of questPageEvents(q)){
    if(e.place)add(e.place,e.id);
    for(const p of e.points??[])add(p,e.id);
  }
  return [...groups.values()].sort((a,b)=>a.y-b.y||a.x-b.x).map((g,i)=>({...g,label:String.fromCharCode(65+i)}));
}

export function questMapSvg(data,q,map){
  const groups=mapGroups(q,map),cell=46,left=60,top=150;
  const labelAt=p=>groups.find(g=>g.x===p.x&&g.y===p.y)?.label??`(${p.x}, ${p.y})`;
  const route=[map.entrance,...['entry','dark','branch'].map(id=>q.story.worldPlaces[id])].map(labelAt);
  const lamps=['q001_empty_west','q001_empty_east'].map(id=>labelAt(q.events.find(e=>e.id===id).points.find(p=>p.map===map.id)));
  const x=v=>left+(v+.5)*cell,y=v=>top+(v+.5)*cell;
  const out=[`<svg xmlns="http://www.w3.org/2000/svg" width="1420" height="930" viewBox="0 0 1420 930" role="img" aria-labelledby="title desc">`,
    `<title id="title">${xml(q.id+' '+map.name+' イベント配置')}</title>`,
    '<desc id="desc">配布マップの全セルとクエストの全配置を表示。同じ座標で起きる複数場面は同じ文字の欄に列記。</desc>',
    '<rect width="1420" height="930" fill="#f7f5ef"/>',
    '<style>text{font-family:"Noto Sans CJK JP","Noto Sans JP",sans-serif;fill:#24333c}.id{font-family:monospace;font-size:17px}.small{font-size:17px}</style>'];
  const text=(xx,yy,t,attrs='')=>out.push(`<text x="${xx}" y="${yy}" ${attrs.replace('class="small"','font-size="17"').replace('class="id"','font-family="monospace" font-size="17"')}>${xml(t)}</text>`);
  text(40,48,`${q.id} 帰らない灯番 / ${map.id}`,'font-size="29"');
  text(40,85,`${map.name}・B${map.floor}　${map.tiles[0].length} × ${map.tiles.length} セル`,'font-size="22"');
  text(40,117,'原点は左上 (0, 0) ／ x は右向き、y は下向き','class="small"');
  for(let col=0;col<map.tiles[0].length;col++)text(x(col),top-12,col,'text-anchor="middle" class="small"');
  for(let row=0;row<map.tiles.length;row++){
    text(left-20,y(row)+6,row,'text-anchor="middle" class="small"');
    for(let col=0;col<map.tiles[row].length;col++)out.push(`<rect x="${left+col*cell}" y="${top+row*cell}" width="${cell}" height="${cell}" fill="${map.tiles[row][col]==='#'?'#33464e':'#e7ecdf'}" stroke="#aeb9b4" stroke-width="1"/>`);
  }
  for(const g of groups){
    out.push(`<circle cx="${x(g.x)}" cy="${y(g.y)}" r="17" fill="#076c79" stroke="#fff" stroke-width="2"/>`);
    text(x(g.x),y(g.y)+7,g.label,'text-anchor="middle" font-size="21" style="fill:white"');
  }
  const stairs=Object.values(data.dungeons[map.dungeon].systems).filter(s=>s.use==='map_connections').flatMap(s=>s.links.filter(l=>l.kind==='stairs').flatMap(l=>[l.a,l.b].filter(p=>p.map===map.id).map(p=>({...p,kind:'stairs'}))));
  for(const o of [...map.objects.filter(o=>!o.quest&&o.id!=='exit'),...stairs]){
    out.push(`<rect x="${x(o.x)-12}" y="${y(o.y)-12}" width="24" height="24" rx="3" fill="#bd7842"/>`);
    text(x(o.x),y(o.y)+6,o.kind==='stairs'?'↓':'i','text-anchor="middle" font-size="19" style="fill:white"');
  }
  const fixtures=Object.values(data.dungeons[map.dungeon].systems).flatMap(s=>s.fixtures??[]).filter(f=>f.map===map.id);
  for(const f of fixtures)out.push(`<circle cx="${x(f.x)+15}" cy="${y(f.y)-15}" r="5" fill="#e49a20" stroke="#513a0d"/>`);
  text(60,609,`青丸 ${groups[0].label}–${groups.at(-1).label}：右欄のクエストイベント（同じ座標は同じ文字）`,'class="small"');
  text(60,641,'濃色：壁 # ／ 淡色：通行セル . ／ 黄点：共通火台','class="small"');
  text(60,673,'i：巡回記録 (3, 1) ／ ↓：B2への階段 (13, 7)','class="small"');
  text(60,715,`往路：${route.join(' → ')} ／ 帰路：${[...route].reverse().join(' → ')}`,'font-size="21"');
  text(60,747,`${lamps.join('・')} の壁松明は任意に調べられる。B2はq001の経路外。`,'class="small"');
  text(60,789,`${labelAt(map.entrance)}から町へ：篝火広場 → 灯番組合 → 灯番詰所`,'font-size="21"');
  text(60,821,'町での帰還報告：q001-S-post ／ 結末：q001-E-*','class="small"');
  text(60,871,'文字は配置点の案内。イベントIDは右欄と本文で共通。','class="small"');
  let legendY=151;
  for(const g of groups){
    const scene=q.model.graph.find(n=>{const p=q.story.worldPlaces[q.story.scenes[n.id].place];return p.map===map.id&&p.x===g.x&&p.y===g.y;});
    const event=q.events.find(e=>e.points.some(p=>p.map===map.id&&p.x===g.x&&p.y===g.y));
    const name=(scene?q.story.scenes[scene.id].title:event.title).replace('篝火の迷宮・','');
    text(802,legendY,`${g.label}　(${g.x}, ${g.y}) ${name}`,'font-size="21"');legendY+=27;
    for(const id of g.ids){text(832,legendY,id,'class="id"');legendY+=23;}
    legendY+=22;
  }
  text(802,801,'町：灯番詰所（組合の奥）','font-size="21"');
  text(832,828,questEventId(q,'S','post'),'class="id"');
  Object.keys(q.outcomes).forEach((id,i)=>text(832,851+i*23,questEventId(q,'E',id),'class="id"'));
  out.push('</svg>');return out.join('\n')+'\n';
}

export function questPageBundle(data,id){
  if(id==='q002')return q002PageBundle(data);
  if(id!=='q001'||!questPages[id])throw Error(`No dedicated page configuration for ${id}`);
  const q=data.quests[id],events=questPageEvents(q),out=[];
  const add=text=>out.push(text,'');
  const mapIds=[...new Set(events.flatMap(e=>[...(e.place?.map?[e.place.map]:[]),...(e.points??[]).map(p=>p.map)]))];
  const maps=mapIds.map(id=>data.maps[id]);
  const files={};
  add(`# ${q.id} ${q.title}：マップとイベント`);
  add(`[クエストカタログへ戻る](QUEST_CATALOG.md#q001-帰らない灯番) ／ [シナリオ本文](#q001-帰らない灯番) ／ [配置イベント](#配置イベントと操作条件) ／ [マップデータ](#マップデータと接続定義)`);
  add(`作品版 ${data.game.version}。配布JSONから生成した作者向けページ。真相と結末を含む。`);
  add(`<!-- quest-page-source:${catalogContentHash(data)} -->`);
  add(`本編は${q.model.graph.length}場面、${Object.keys(q.outcomes).length}結末。ダンジョン内の必須経路は${maps.map(m=>code(m.id)).join('・')}の1フロアで、町の篝火広場・灯番組合を経て灯番詰所へ帰還する。町はセルマップではなく、親子関係を持つロケーション間の選択移動で表現する。`);
  add('## イベントIDの規則');
  add('本編の場面は `q001-S-場面キー`、配置物・操作調査は `q001-P-配置キー`、結末は `q001-E-結末キー` を使う。強制戦闘は `q001-F-kuragari`、戦闘中の新人登場は `q001-B-rookie`。全19個がクエスト内で一意。S・P・Eは文書用ID、F・Bは実行データにも記録するID。途中にイベントを追加しても既存IDは変わらない。同じ座標の別場面にも別IDを割り当てる。');
  add('選択肢は所属するイベントIDと選択キーの組で識別する。例：`q001-S-post/repair`。共通の階段、火台、依頼受注機能はマップ・町の機能として区別する。');
  add('## マップとイベント配置');
  for(const map of maps){
    const file=`quest-maps/${q.id}-${map.id}.svg`;
    files[file]=questMapSvg(data,q,map);
    add(`![${map.name}の座標とイベントID](${file})`);
    add(`図の原点は左上の (0, 0)。座標は [${map.id}.json](../data/maps/${map.id}.json) と一致する。enterイベントと物語の到着は実際に配置セルを踏むと開始する。interactイベントは足元か正面から調べられる。`);
    for(const g of mapGroups(q,map))add(`図 ${g.label} (${g.x}, ${g.y})：${g.ids.map(code).join(' / ')}。`);
  }
  const post=q.story.worldPlaces.post,postLocation=data.locations[post.location],guild=data.locations[postLocation.parent],square=data.locations[guild.parent],map=maps[0];
  const exit=map.objects.find(o=>!o.quest&&o.kind==='exit');
  const link=data.dungeons[map.dungeon].systems.connections.links.find(l=>l.a.map===map.id),down={...link.a,script:`connections/${link.id}`},downTarget=link.b;
  add('## 町とマップの接続');
  add('```mermaid\nflowchart TD\n'+[
    `  square["${square.name} / ${square.id}"]`,
    `  guild["${guild.name} / ${guild.id}"]`,
    `  post["${postLocation.name} / q001-S-post / q001-E-informed / q001-E-compromise"]`,
    `  entrance["B1入口 (${exit.x}, ${exit.y}) / ${map.id}"]`,
    '  route["B1巡灯路・支道 / q001-S-entry〜gate"]',
    `  deeper["B2 (${downTarget.x}, ${downTarget.y}) / ${downTarget.map} / q001対象外"]`,
    '  square <--> guild',
    '  guild <--> post',
    '  square <-->|迷宮へ入る・入口階段で戻る| entrance',
    '  entrance <-->|セルを歩く| route',
    `  route -.->|"B1 (${down.x}, ${down.y}) の下り階段・任意"| deeper`
  ].join('\n')+'\n```');
  add(`受注は ${code(guild.id)} の依頼掲示板。受注中の依頼の「迷宮の入口へ向かう（篝火の迷宮）」は町のどの施設からでも使え、迷宮入口 ${code(map.id)} (${map.entrance.x}, ${map.entrance.y}) へ入る。帰路は入口の ${code(exit.script)} を調べて広場へ戻り、組合、詰所の順に訪れる。詰所への実到着で自動的に ${code('q001-S-post')} に進む。`);
  add(`B1 (${down.x}, ${down.y}) の ${code(down.script)} は ${code(downTarget.map)} (${downTarget.x}, ${downTarget.y}) に接続する。q001にはB2・B3の配置イベントがなく、下層への移動は完了条件に含まれない。ダンジョン全体は [data/dungeons.json](../data/dungeons.json) を参照する。`);
  add('## 本編イベントの順序と実移動');
  for(const n of q.model.graph){
    const place=q.story.worldPlaces[q.story.scenes[n.id].place];
    add(`${sceneLink(q,n)}：${q.story.scenes[n.id].title}。${describePlace(data,place)}。`);
    for(const option of n.options){
      const action=q.story.actions[`${n.id}_${option.id}`];
      if(!action)continue;
      const dest=option.to.startsWith('@')?questEventId(q,'E',option.to.slice(1)):questEventId(q,'S',option.to);
      if(action.journey)add(`選択 ${code(option.id)} → ${code(dest)}。行為 ${code(`${n.id}_${option.id}`)} で出発し、${describePlace(data,q.story.worldPlaces[action.journey.to])} に実際に到着して続行する。同行：${action.journey.companions.map(e=>data.characters[q.story.entities[e].character]?.name??e).join('・')||'探索隊のみ'}。`);
      else add(`${n.automatic?'戦闘中の自動行為':'選択'} ${code(option.id)} → ${code(dest)}。同じ地点で進む。`);
    }
  }
  add('新人が入口から巡灯路へ駆けつける救助は、戦闘中イベント `q001-B-rookie` から物語行為 `outage_call` を実行する。帰路の消灯会話を送り終えると `q001-F-kuragari` がくらがりとの戦闘を開始する。1ラウンド終了後（第2ラウンド開始時）に新人が発言し、送ると新品油を1つ消費してくらがり除けの携帯松明を25歩分点灯し、`battle.end` で戦闘を強制終了する。`on_interrupt` から `q001-S-rescue` の現地会話へ進む。探索隊の座標は変えない。');
  add('第1ラウンドで倒す・逃げる・火で撃退する場合も、その終了確定前に同じ新人イベントを1度だけ実行する。勝利や逃走としては記録せず、強制終了を記録し、戦闘報酬は与えない。新人到着前の全滅は通常の敗北・町への帰還となり、救助や油の消費は確定しない。再訪して同じ場面から再挑戦できる。戦闘中のセリフでも保存・再開できる。');
  add('探索隊の往路・老人の介助・救助後の入口への移動・詰所への帰還は、出発を選んだ後にプレイヤーが実際に移動する。命令と配置の一覧は [EVENT_CATALOG.md](EVENT_CATALOG.md)、セルごとの明るさは [FIELD_LIGHTING.md](FIELD_LIGHTING.md) を参照する。');
  add('配置点のIDが同じでも本編場面は異なる。入口は初回の `q001-S-entry` と帰路の `q001-S-gate`、巡灯路は往路の `q001-S-dark`・`q001-S-empty` と帰路の `q001-S-outage`・`q001-S-rescue` が共用する。座標に来るだけで全場面が順番に発生するわけではなく、保存中の場面・移動行為と到着条件に従う。');
  add('## 配置イベントと操作条件');
  for(const e of q.events){
    add(`### ${questEventId(q,'P',e.id)}`);
    add(`${e.title}。実行時イベントID：${code(e.id)}。スクリプト：${code(e.script)}。`);
    for(const p of e.points)add(`配置：${describePlace(data,{kind:'dungeon',dungeon:e.dungeon,...p,event:e.id})}。`);
    add(`起動：${({enter:'指定セルへの進入で自動開始',auto:'条件成立で自動開始',action:'操作メニューから現地調査',interact:'現地で調べる'})[e.trigger]} (${code(e.trigger)})。${e.initialState?`初期状態：${code(e.initialState)}。`:''}`);
    if(e.visibleWhen)add(`表示条件：${code(JSON.stringify(e.visibleWhen))}。`);
    if(e.condition)add(`操作条件：${code(JSON.stringify(e.condition))}。`);
    if(e.fire)add(`壁灯：${code(JSON.stringify(e.fire))}。`);
    if(e.script===q.model.entryScript)add('現在の物語状態に応じた場面を呼び出す共通入口。実際の場面の現在地条件を満たす必要がある。');
    else add(`<details>\n<summary>このイベントの実行スクリプト</summary>\n\n${block(q.scripts[e.script])}\n\n</details>`);
  }
  add(questCatalog(data,'',{questId:q.id}).trimEnd());
  add('## マップデータと接続定義');
  add('以下はこのページを生成した時点の配布データ。壁・通路だけでなく入口・共通物体・既知範囲も掲載する。クエスト専用配置はマップJSONに混ぜず、クエストのeventsから実行時に重ねる。');
  for(const map of maps){
    add(`### ${map.id} の全マップJSON`);
    add(block(rawMap(map)));
  }
  add('### クエスト専用配置データ');add(`<details>\n<summary>q001.events 全配置と条件</summary>\n\n${block(q.events)}\n\n</details>`);
  add('### 町の接続ロケーション');add(block(Object.fromEntries([square,guild,postLocation].map(l=>[l.id,l]))));
  add('### 入口と階段の接続データ');
  add(block({dungeonEntries:data.dungeons[map.dungeon].entries,townRoot:data.game.world.townRoot,connections:data.dungeons[map.dungeon].systems.connections,scripts:{[exit.script]:data.scripts[exit.script]},fireFixtures:Object.values(data.dungeons[map.dungeon].systems).flatMap(s=>s.fixtures??[]).filter(f=>f.map===map.id)}));
  add('### 物語の場所と出発・到着行為');
  add(`<details>\n<summary>worldPlaces と5本の移動行為</summary>\n\n${block({worldPlaces:q.story.worldPlaces,actions:Object.fromEntries(Object.entries(q.story.actions).filter(([,a])=>a.journey))})}\n\n</details>`);
  add('## 編集元と再生成');
  add('本編は [authoring/story-q001.mjs](../authoring/story-q001.mjs)、配置・壁灯・入口の調査は [config/quests/q001.events.json](../config/quests/q001.events.json)、マップは [config/kagaribi-content.json](../config/kagaribi-content.json)、町は [config/locations.json](../config/locations.json) が正本。`npm run build:catalog` でカタログ・このページ・配置図を一緒に生成する。本文を直接改稿した場合は、正本へ取り込んでから再生成する。`npm run build:docs` 単独はこのページの本文を保持する。');
  files[questPages[id]]=out.join('\n').replace(/\n{3,}/g,'\n\n').trimEnd()+'\n';
  return files;
}

// Resolve the actual connected map route instead of repeating coordinates in prose.
function questMapRoute(data, q) {
  const target=q.story.worldPlaces.landing, dungeon=data.dungeons[target.dungeon];
  const start=dungeon.entries.main.map, links=dungeon.systems.connections.links;
  const queue=[[start]], seen=new Set([start]);
  while(queue.length){
    const route=queue.shift(), current=route.at(-1);
    if(current===target.map)return route.map(id=>data.maps[id]);
    for(const link of links){
      const next=link.a.map===current?link.b.map:link.b.map===current?link.a.map:null;
      if(next&&!seen.has(next)){seen.add(next);queue.push([...route,next]);}
    }
  }
  throw Error(`${q.id}: no connected route to landing`);
}

function q002MapSvg(data,q,map){
  const groups=mapGroups(q,map), dungeon=data.dungeons[map.dungeon], cell=42,left=55,top=135;
  const controls=dungeon.systems.water.controls.filter(p=>p.map===map.id);
  const links=dungeon.systems.connections.links.flatMap(l=>[l.a,l.b].filter(p=>p.map===map.id).map(p=>({...p,id:l.id,name:l.name})));
  const objects=map.objects.filter(o=>!o.quest);
  const markers=[...groups.map(g=>({...g,label:g.label,lines:[`${g.label} (${g.x}, ${g.y}) クエスト配置`,...g.ids]})),
    ...controls.map((p,i)=>({...p,label:`P${i+1}`,lines:[`P${i+1} (${p.x}, ${p.y}) ${p.id}`,p.name]})),
    ...links.map((p,i)=>({...p,label:`L${i+1}`,lines:[`L${i+1} (${p.x}, ${p.y}) ${p.id}`,p.name]})),
    ...objects.map((p,i)=>({...p,label:`O${i+1}`,lines:[`O${i+1} (${p.x}, ${p.y}) ${p.id}`,`${p.kind} / ${p.script??'共通物体'}`]}))];
  const height=Math.max(540,165+markers.reduce((n,m)=>n+m.lines.length*23+16,0));
  const out=[`<svg xmlns="http://www.w3.org/2000/svg" width="1160" height="${height}" viewBox="0 0 1160 ${height}" role="img" aria-labelledby="title desc">`,
    `<title id="title">${xml(q.id+' '+map.id+' 座標付き配置図')}</title>`,
    '<desc id="desc">配布マップのセル、クエスト配置、給排水盤、接続口、共通物体を表示。第一水路は外の操作盤で排水してから通行する。</desc>',
    `<rect width="1160" height="${height}" fill="#f7f5ef"/>`,
    '<style>text{font-family:"Noto Sans CJK JP","Noto Sans JP",sans-serif;fill:#24333c}</style>'];
  const text=(x,y,t,size=17)=>out.push(`<text x="${x}" y="${y}" font-size="${size}">${xml(t)}</text>`);
  text(35,42,`${q.id} 骨の荷札 / ${map.id}`,26);text(35,77,map.name,21);
  text(35,106,'左上 (0, 0) ／ x は右、y は下。P：操作盤、L：接続、O：共通物体。',16);
  for(let x=0;x<map.tiles[0].length;x++)text(left+x*cell+14,top-12,x,16);
  for(let y=0;y<map.tiles.length;y++){
    text(left-26,top+y*cell+27,y,16);
    for(let x=0;x<map.tiles[y].length;x++)out.push(`<rect x="${left+x*cell}" y="${top+y*cell}" width="${cell}" height="${cell}" fill="${map.tiles[y][x]==='#'?'#33464e':'#e7ecdf'}" stroke="#aeb9b4"/>`);
  }
  let legendY=top+9;
  for(const marker of markers){
    out.push(`<circle cx="${left+(marker.x+.5)*cell}" cy="${top+(marker.y+.5)*cell}" r="17" fill="${marker.ids?'#076c79':'#bd7842'}"/>`);
    out.push(`<text x="${left+(marker.x+.5)*cell}" y="${top+(marker.y+.5)*cell+5}" font-size="14" text-anchor="middle" style="fill:white">${xml(marker.label)}</text>`);
    for(const line of marker.lines){text(570,legendY,line,16);legendY+=23;}legendY+=16;
  }
  const bottom=top+map.tiles.length*cell+40;
  text(35,bottom,'濃色：壁 # ／ 淡色：通路 .',17);
  text(35,bottom+30,map.id==='region_1_canal_a'?'第一水路：給水中は両端の水密扉が施錠。':'乾いた区画。水路の外から給排水盤を調べる。',17);
  text(35,bottom+60,'地点への接続と起動条件は本文を参照。',17);
  out.push('</svg>');return out.join('\n')+'\n';
}

function q002PageBundle(data){
  const q=data.quests.q002, maps=questMapRoute(data,q), dungeon=data.dungeons[q.story.worldPlaces.landing.dungeon];
  const events=questPageEvents(q), journeys=Object.entries(q.story.actions).filter(([,a])=>a.journey);
  const out=[], files={},add=text=>out.push(text,'');
  add(`# ${q.id} ${q.title}：マップとイベント`);
  add('[クエストカタログへ戻る](QUEST_CATALOG.md#q002-骨の荷札) ／ [シナリオ本文](#q002-骨の荷札) ／ [配置イベント](#配置イベントと操作条件) ／ [マップデータ](#マップデータと接続定義)');
  add(`作品版 ${data.game.version}。配布JSONから生成した作者向けページ。真相と結末を含む。`);
  add(`<!-- quest-page-source:${catalogContentHash(data)} -->`);
  add(`本編は${q.model.graph.length}場面・${Object.keys(q.outcomes).length}結末、物語状態の改訂${q.story.revision}。地下水道の荷揚げ場、医学校の標本室、保険審査所を往復する。${journeys.length}本の移動行為は出発後に実際の場所へ到着して確定する。`);
  add('## 登場人物と証拠');
  add(q.model.world.truth);
  for(const id of ['belt','porter','curator','examiner']){
    const c=data.characters[q.story.entities[id].character];add(`${c.name} (${code(id)})：${c.role}。${c.goal}`);
  }
  add('運搬人は保険加入者本人ではなく、事情を知る証人。台帳・荷札の持参、本人の同意、標本の返却と不正立証を別の事実として扱う。証言によって仕事を失う代償は informed の結末に記録される。');
  add('## イベントIDの規則');
  add(`場面は ${code('q002-S-場面キー')}、配置は ${code('q002-P-配置キー')}、結末は ${code('q002-E-結末キー')}。選択肢は場面IDと選択キーの組で識別する。全${events.length}IDが一意。荷札回収の強制戦闘 ${code('q002-F-entry-tags-guard_1')} は文書用IDで、実行スクリプトは ${code('q002.v11.entry')} の選択 ${code('tags')}、遭遇は ${code('guard_1')}。q002に専用の戦闘中イベントはない。`);
  add('## 町とマップの接続');
  add('受注は灯番組合。受注中の依頼の「迷宮の入口へ向かう（灯守の地下水道）」で、町のどの施設からでも入口へ出発できる。最初の現地会話は荷揚げ場の足元・正面を「調べる」で開始する。q001の必須イベントとは起動方式が異なり、初回の q002_decision は interact。');
  add('```mermaid\nflowchart TD\n  square["篝火広場"]\n  guild["灯番組合・受注"]\n  medical["医学校"]\n  school["標本室・照会と返却"]\n  office["保険審査所・証言と立証"]\n  entry["入口操作室・帰還階段"]\n  canal["第一水路・要排水"]\n  landing["荷揚げ場・骨箱と荷札"]\n  square <--> guild\n  square <--> medical\n  medical <--> school\n  square <--> office\n  square <--> entry\n  entry <-->|水密扉| canal\n  canal <-->|水密扉| landing\n```');
  add('入口操作室 (2, 1) の第一水路の給排水盤 upper_gate を「調べる」で開き、「給水を止めて排水」を選ぶ。入口側 (9, 1) の水密扉から第一水路 (1, 1) へ入り、反対側 (9, 1) から荷揚げ場 (1, 1) に出る。そこから骨箱の現場 (5, 1) まで歩く。全接続は往復可能。');
  add('帰路は同じ水路を戻り、入口操作室 (1, 1) の帰還階段を調べれば無料で広場へ帰れる。帰還コマンドではメッセージ内で費用を確認して町へ戻る。医学校から標本室、または広場から保険審査所へ入ると、移動中の物語が自動で続く。');
  add('岸と浅瀬は物語上の所在 landing / water を区別するが、実マップでは同じ荷揚げ場 (5, 1) の作業範囲として扱う。荷揚げ場の歩行セルは乾燥しており、骨箱を拾うために完全水没中の第一水路へ入る仕様ではない。荷揚げ場から先の排水支路と下層階段はq002の完了条件に含まれない。');
  add('## マップとイベント配置');
  for(const map of maps){
    const name=`quest-maps/${q.id}-${map.id}.svg`;files[name]=q002MapSvg(data,q,map);
    add(`![${map.name}の座標とイベントID](${name})`);
    add(`図の全セルは [${map.id}.json](../data/maps/${map.id}.json) と一致する。`);
    for(const group of mapGroups(q,map))add(`図 ${group.label} (${group.x}, ${group.y})：${group.ids.map(code).join(' / ')}。`);
  }
  add('## 本編イベントの順序と実移動');
  for(const node of q.model.graph){
    const place=q.story.worldPlaces[q.story.scenes[node.id].place];add(`${sceneLink(q,node)}：${describePlace(data,place)}。`);
    for(const option of node.options){
      const action=q.story.actions[option.action],dest=option.to.startsWith('@')?questEventId(q,'E',option.to.slice(1)):questEventId(q,'S',option.to);
      if(action.journey)add(`選択 ${code(option.id)} → ${code(dest)}。行為 ${code(option.action)} で出発し、${describePlace(data,q.story.worldPlaces[action.journey.to])} に実際に到着して自動続行する。同行：${action.journey.companions.map(id=>data.characters[q.story.entities[id].character]?.name??id).join('・')||'探索隊のみ'}。`);
      else add(`選択 ${code(option.id)} → ${code(dest)}。行為 ${code(option.action)}。${option.combat?'戦闘に勝った後に作業を確定する。':'同じ地点で作業・受け渡しを確定する。'}`);
    }
  }
  add('最初に縄1個で箱を引き揚げていれば、標本室でそのまま返却できる。箱を浅瀬に残して照会した場合は運搬人と現地へ戻り、骨と箱を集めて再び標本室へ運ぶ。荷札だけ渡す contract、標本返却で止める compromise、同意と証拠を揃える informed を分ける。');
  add('調べる・帰還・移動はプレイヤーコマンド、本文とシナリオ選択肢はメッセージウィンドウ内に表示する。移動先へ瞬間移動するシナリオ選択肢や、旧「目的地で続きを進める」ボタンは使わない。移動中の保存でも到着前に台帳照合・返却・証言を成立させない。');
  add('## 配置イベントと操作条件');
  for(const event of q.events){
    add(`### ${questEventId(q,'P',event.id)}`);add(`${event.title}。実行ID ${code(event.id)}、スクリプト ${code(event.script)}、起動 ${code(event.trigger)}。`);
    for(const point of event.points)add(`配置：${describePlace(data,{kind:'dungeon',dungeon:event.dungeon,...point,event:event.id})}。`);
    add(`表示条件：${code(JSON.stringify(event.visibleWhen??true))}。操作条件：${code(JSON.stringify(event.condition??true))}。`);
    add('初回と中断再開は現地を調べる。移動行為 school_recover の帰着時は、目的セルへの進入で recovery が自動開始する。移動中は通常の受付イベントを表示せず、到着処理と二重起動しない。');
  }
  add(questCatalog(data,'',{questId:q.id}).trimEnd());
  add('## マップデータと接続定義');
  add('現地と入口を結ぶ3マップの配布JSONを掲載する。クエストの配置は events から実行時に投影するため、マップJSONの共通物体とは分ける。');
  for(const map of maps){add(`### ${map.id} の全マップJSON`);add(block(rawMap(map)));}
  add('### クエスト専用配置データ');add(`<details>\n<summary>q002.events 全配置と条件</summary>\n\n${block(q.events)}\n\n</details>`);
  const locationIds=new Set(['hikarigaeri_guild',...Object.values(q.story.worldPlaces).filter(p=>p.kind==='town').map(p=>p.location)]);
  for(const id of [...locationIds])for(let l=data.locations[id];l?.parent;l=data.locations[l.parent])locationIds.add(l.parent);
  add('### 町の接続ロケーション');add(block(Object.fromEntries([...locationIds].map(id=>[id,data.locations[id]]))));
  add('### 水路と給排水の接続データ');
  add(block({entries:dungeon.entries,water:dungeon.systems.water,connections:dungeon.systems.connections}));
  add('### 物語の場所と出発・到着行為');
  add(`<details>\n<summary>worldPlaces と${journeys.length}本の移動行為</summary>\n\n${block({worldPlaces:q.story.worldPlaces,actions:Object.fromEntries(journeys)})}\n\n</details>`);
  add('## 編集元と再生成');
  add('本編は [authoring/story-q002.mjs](../authoring/story-q002.mjs)、配置は [config/quests/q002.events.json](../config/quests/q002.events.json)、2D地形は [config/connected-maps.json](../config/connected-maps.json)、接続・給排水は [config/dungeons/region_1.json](../config/dungeons/region_1.json)、町は [config/locations.json](../config/locations.json) が正本。実装の全文は [data/quests/q002.json](../data/quests/q002.json)。');
  add('`npm run build:catalog` でカタログ・専用ページ・配置図を一緒に生成する。本文を改稿する場合は原稿へ反映し、`npm run build:scenarios` でゲームデータから再生成する。`npm run build:docs` 単独は本文を保持し、`npm run check:docs` は専用ページと配置図を配布データへ照合する。');
  files[questPages[q.id]]=out.join('\n').replace(/\n{3,}/g,'\n\n').trimEnd()+'\n';return files;
}
