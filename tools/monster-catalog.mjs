// Catalogs describe loaded definitions and references, not proven playthrough reachability.
export function encounterReferences(data) {
  const refs=Object.fromEntries(Object.keys(data.encounters).map(id=>[id,{maps:[],systems:[],scripts:[]}]));
  const walk=(value,visit,path=[])=>{
    if(!value||typeof value!=='object')return;
    visit(value,path);
    for(const [key,child] of Object.entries(value))walk(child,visit,[...path,key]);
  };
  for(const map of Object.values(data.maps))for(const entry of map.encounterPool?.length?map.encounterPool:[{encounter:map.encounter,weight:null}]){
    if(refs[entry.encounter])refs[entry.encounter].maps.push({id:map.id,name:map.name,weight:entry.weight});
  }
  for(const dungeon of Object.values(data.dungeons))for(const [id,system] of Object.entries(dungeon.systems)){
    if(system.enabled===false)continue;
    walk(system,(value,path)=>{
      if(typeof value.encounter==='string'&&refs[value.encounter])refs[value.encounter].systems.push(`${dungeon.name} / ${id}.${[...path,'encounter'].join('.')}`);
    });
  }
  for(const dungeon of Object.values(data.dungeons))for(const event of dungeon.fieldEvents??[]){
    if(event.action.type==='battle'&&refs[event.action.encounter])refs[event.action.encounter].systems.push(`${dungeon.name} / fieldEvents.${event.id}`);
  }
  for(const [id,script] of Object.entries(data.scripts))walk(script,value=>{
    if(value.op==='battle.start'&&refs[value.encounter]&&!refs[value.encounter].scripts.includes(id))refs[value.encounter].scripts.push(id);
  });
  return refs;
}

function conditionText(value) {
  if(value===undefined||value===null)return '条件なし';
  if(value.op==='and')return value.args.map(conditionText).join('、かつ');
  if(value.op==='eq'&&value.left?.op==='mod'&&value.left.args?.[0]?.ref==='self.round'&&value.left.args[1]===2)return value.right===0?'偶数ラウンド':'奇数ラウンド';
  if(value.left?.ref==='self.round'&&value.op==='eq')return `第${value.right}ラウンド`;
  if(value.left?.ref==='self.hp_ratio'&&typeof value.right==='number'&&['lt','eq'].includes(value.op))return `自身のHPが${value.right*100}％${value.op==='lt'?'未満':'と等しい'}`;
  return `条件式 ${JSON.stringify(value)}`;
}

function targetText(rule,skill) {
  if(skill.target==='all_enemies')return '探索隊の生存者全員';
  if(skill.target==='all_allies')return '敵側の生存者全員';
  if(rule.target==='self'||skill.target==='self')return '自身';
  if(skill.target==='ally')return '敵側でHP割合が最も低い1体';
  return rule.target==='weakest'?'探索隊で現在HPの実数が最も低い1人':'探索隊の生存者からランダムに1人';
}

const shortList=values=>values.length?values.slice(0,6).join('・')+(values.length>6?` ほか${values.length-6}件`:''):'なし';
const stats=value=>Object.entries(value).map(([key,n])=>`${key.toUpperCase()} ${n}`).join(' / ');
const escape=value=>String(value).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');

export function monsterCatalog(data) {
  const enemies=Object.values(data.enemies),refs=encounterReferences(data);
  const idsIn=encounter=>encounter.enemies.map(e=>typeof e==='string'?e:e.id??e.enemy);
  const special=['kuragari','salt_eater','valley_hexer','water_darter','water_predator','water_giant'];
  const groups=[
    ['固有環境の敵',enemies.filter(e=>special.includes(e.id))],
    ['個別デザインの通常魔物',enemies.filter(e=>e.source)],
    ['依頼に追加した敵',enemies.filter(e=>!e.source&&!special.includes(e.id)&&!/^guard_\d+(?:_elite)?$/.test(e.id))],
    ['地域の迷宮獣と守護者',enemies.filter(e=>/^guard_\d+(?:_elite)?$/.test(e.id))]
  ];
  const imageUsers=new Map();
  for(const e of enemies){const file=data.assets.images[e.sprite];if(!imageUsers.has(file))imageUsers.set(file,[]);imageUsers.get(file).push(e.name);}
  const out=['# 魔物一覧と戦闘画像','',
    `作品版${data.game.version}。配布中の敵は${enemies.length}定義、遭遇編成は${Object.keys(data.encounters).length}定義、敵が参照する画像ファイルは${imageUsers.size}点です。敵の定義数と、独自の外見を持つ魔物の数は同じではありません。`,'',
    '敵・技能・画像・通常ロードのマップと迷宮・スクリプトから全文を生成します。数値を重ねて手書きせず、原稿を更新してから `npm run build:docs` で反映します。','',
    ...groups.map(([title,list])=>`[${title}](#${title})：${list.length}定義。`),'',
    '## 現在の読み方','',
    '通常遭遇候補、仕掛けからの参照、スクリプトの戦闘開始命令を分けて記載します。参照は配置・命令の存在を示し、出現条件の成立や全分岐の到達を保証するものではありません。配布DBに残っていても、通常ロードのこれらの経路から呼ばれていない遭遇があります。','',
    'AIは優先度の高い順に、条件成立・MP充足・環境による使用許可を満たした最初の規則を使います。同順位は定義順です。「代表技能」だけでは回復・防御・毒牙・対象選択を説明できないため、以下には全規則を載せます。属性倍率は未指定なら1で、実ダメージには式・防御・環境なども作用します。','',
    '現在のくらがり画像は `wraith` が参照する `assets/images/monsters/wraith.webp` です。同じ画像を地域4・5・9の迷宮獣／守護者、腐肉鬼、足跡の追跡者も共有しています。くらがりだけの専用画像IDへ分離された状態ではありません。旧PNGの保存と現行の参照は[適用記録](../assets/source/characters/recovery-2026-09-24.json)で確認できます。','',
    '旧内容版のセーブは移行しません。地域の迷宮獣・守護者は現行の依頼戦・通常遭遇から参照されているため残っています。保存方針は[SPEC.md](SPEC.md)、調整と旧測定は[BALANCE_PLAN.md](BALANCE_PLAN.md)を参照してください。','',
    '## 編集元','',
    '[config/entities.json](../config/entities.json)：個別デザイン20種の名称・発想・外見・数値・代表技能。AIの組立は[build-entities.mjs](../tools/build-entities.mjs)です。参照した発想元は[RPGエンティティ生成モデル](https://app.notion.com/p/RPG-3d6c3c1966b380489592dbeafc72b9dd)と[魔物100](https://app.notion.com/p/3d6c3c1966b38172b0a6fd15e23be419)です。','',
    '[kagaribi-content.json](../config/kagaribi-content.json)：くらがり。[dungeon-content.json](../config/dungeon-content.json)：水路の魚・ソルトイーター・境渡りの呪詠み。出現・特殊処理の設定は各 `config/dungeons/*.json` です。','',
    '[build-content.mjs](../tools/build-content.mjs)：地域の迷宮獣・守護者。[build-scenarios.mjs](../tools/build-scenarios.mjs)と `authoring/scenarios-*.mjs`：依頼ごとの追加敵。通常遭遇の原稿は[編集先の対応](CONFIG_EDITOR_SOURCES.md)、画像IDと実ファイルの対応は[data/assets.json](../data/assets.json)を確認してください。','',
    ];
  for(const [title,list] of groups){
    out.push(`## ${title}`,'');
    for(const e of list){
      const file=data.assets.images[e.sprite],shared=imageUsers.get(file).filter(name=>name!==e.name);
      out.push(`### ${e.name} (${e.id})`,'',`<img src="../${file}" width="160" alt="${escape(e.name)}">`,'',`画像ID：${e.sprite}。実ファイル：[${file}](../${file})。`,
        `画像共有：${shared.length?shared.join('・'):'他の敵定義との共有なし'}。`,'');
      if(e.ideas)out.push(`発想：${e.ideas.join('＋')}。参照：${e.source}。地域分類：${data.regions.find(r=>r.id===e.region)?.name??e.region}。`,'',`外見：${e.appearance}`,'',`設計上の役割：${e.role}`,'');
      if(e.id==='kuragari')out.push('通常点灯の守りが届かないときは7成功歩ごとに基本22％で歩行抽選し、現状の候補はくらがり100％です。普通の火で通常魔物まで消えることはなく、通常遭遇の完全抑止は深火の効果です。q001の帰路の指定地点の消灯は独立したイベント戦闘です。撃退・救助による強制終了と撃破を区別します。[火と遭遇仕様](KAGARIBI_DUNGEON.md)。','');
      if(e.id==='salt_eater')out.push('塩の蓄積した装備個体があると、廃坑の腐食部品が遭遇候補を切り替えます。敵ラウンド開始時、この敵が生存していれば閾値以上で塩が最も多い装備個体を1個消失させます。これは下記AIの攻撃とは別の `corrosion.battleRound` 処理です。[塩の仕様](WATERWAYS_SALT_MINE.md)。','');
      if(e.id.startsWith('water_'))out.push('旧地下水道の水位に応じて使う魚です。現在の2D区画給排水はこの水位別遭遇を使用しません。敵と遭遇定義は配布DBに残っていますが、退避した旧水道の通常出現と現行の水路を混同しません。','');
      out.push(`基礎能力：${stats(e.stats)}。報酬：${e.rewards.gold}G / ${e.rewards.xp}EXP。`,
        `属性倍率：${Object.entries(e.resist??{}).map(([key,n])=>`${key} ${n}`).join(' / ')||'すべて既定値'}。`,'','AIの選択順：','');
      for(const [i,rule] of [...e.ai].sort((a,b)=>b.priority-a.priority).entries()){
        const skill=data.skills[rule.skill];
        out.push(`${i+1}. 優先度${rule.priority}、${conditionText(rule.condition)}：${skill.name} (${rule.skill})、MP${skill.mp}、対象は${targetText(rule,skill)}。`);
      }
      out.push('','遭遇と参照先：','');
      for(const [id,encounter] of Object.entries(data.encounters).filter(([,c])=>idsIn(c).includes(e.id))){
        const r=refs[id],members=idsIn(encounter),formation=[...new Set(members)].map(id=>`${data.enemies[id].name}×${members.filter(x=>x===id).length}`).join('・');
        out.push(`${id}：${formation}。逃走${encounter.escape?'可':'不可'}。`);
        if(r.maps.length)out.push(`通常遭遇候補：${r.maps.map(m=>`${m.name} (${m.id})、${m.weight===null?'単一候補':`重み${m.weight}`}`).join(' / ')}。`);
        if(r.systems.length)out.push(`仕掛けからの参照：${r.systems.join(' / ')}。`);
        if(r.scripts.length)out.push(`戦闘開始命令：${r.scripts.length}スクリプト。${shortList(r.scripts)}。全配置の照合は[イベント一覧](EVENT_CATALOG.md)を参照してください。`);
        if(!r.maps.length&&!r.systems.length&&!r.scripts.length)out.push('通常ロードのマップ候補・有効な仕掛け・戦闘開始命令からの参照なし。遭遇定義のみ保持しています。');
        out.push('');
      }
    }
  }
  return out.join('\n').trimEnd()+'\n';
}
