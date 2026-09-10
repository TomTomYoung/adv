import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const read=async f=>JSON.parse(await fs.readFile(path.join(root,f),'utf8'));
const write=async(f,v)=>fs.writeFile(path.join(root,f),JSON.stringify(v,null,2)+'\n');
const source='https://app.notion.com/p/v1-0-3d7c3c1966b381818a0fcb62493abcc3';
const ref=ref=>({ref}),eq=(left,right)=>({op:'eq',left,right}),and=(...args)=>({op:'and',args}),or=(...args)=>({op:'or',args});
const say=text=>({op:'say',text});
const has=(id,key)=>({op:'contains',left:ref(`quests.${id}.evidence`),right:key});

// Add new script IDs instead of rewriting existing continuation paths in 1.3 saves.
export async function buildScenarios(){
 const game=await read('data/game.json');
 const maps=Object.fromEntries(await Promise.all(game.files.maps.map(async f=>{const m=await read(f);return [m.id,m];})));
 const quests=[];
 const authoredHubs=new Set(Array.from({length:100},(_,i)=>`q${i+101}_scene`));
 for(const map of Object.values(maps))map.objects=map.objects.filter(o=>!authoredHubs.has(o.id));
 const oneClueProof={11:'clue_a',13:'clue_b',17:'clue_a',18:'clue_a'};
 for(let n=1;n<=100;n++){
  const id=`q${String(n).padStart(3,'0')}`,q=await read(`data/quests/${id}.json`);
  const evidence=oneClueProof[n]?has(id,oneClueProof[n]):and(has(id,'clue_a'),has(id,'clue_b'));
  const truth=q.model.world.truth;
  // The original decision remains available to already-saved VM frames.
  const old=q.scripts[`${id}.decision`].commands;
  const choice=structuredClone(old.find(c=>c.op==='choice'));
  const informed=choice.options.find(o=>o.id==='informed');
  const rope=n%10===2||n%10===6;
  informed.condition=rope?and(evidence,{op:'has_item',item:'rope'}):evidence;
  informed.visibleWhen=evidence;
  informed.requirement=`${oneClueProof[n]?'現場の根拠を確認':'痕跡と記録を照合'}${rope?'・縄1本（勝利して作業を確定した時に消費）':''}${[0,2,6].includes(n%10)?'・戦闘あり':''}`;
  // Knowledge is disclosed before the choice, even when the player chooses the contract afterwards.
  informed.commands=informed.commands.filter(c=>!(c.op==='say'&&c.text===truth));
  const adjust=list=>list.flatMap(c=>{
   if(c.op==='item.take'&&c.item==='rope')return [];
   if(c.op==='battle.start')return [{...c,on_win:[...(rope?[{op:'item.take',item:'rope',count:1}]:[]),...adjust(c.on_win)],on_escape:adjust(c.on_escape),on_lose:adjust(c.on_lose)}];
   return [c];
  });
  if(rope)informed.commands=adjust(informed.commands);
  // Keep the original outcome labels as stable IDs, while exposing the actual action in the journal.
  for(const key of ['informed','contract','compromise'])q.outcomes[key].label=choice.options.find(o=>o.id===key).text;
  choice.options.splice(-1,0,{id:'question',text:'今の説明では足りないと申し出る',commands:[say(`「まだ決めない、ということですね」${q.client}は依頼書を引き戻した。\n現場の痕跡と記録は、どちらからでも確かめられます。`),{op:'flag.set',key:`quest.${id}.questioned`,value:true}]});
  const decision=`${id}.review`;
  q.scripts[decision]={commands:[old[0],{op:'if',condition:evidence,then:[say(truth),{op:'flag.set',key:`quest.${id}.disclosed`,value:true}],else:[]},choice]};
  // Revisit the result without awarding it again; recall only information actually disclosed.
  q.scripts[`${id}.aftermath`]={commands:[{op:'switch',value:ref(`quests.${id}.outcome`),cases:Object.entries(q.outcomes).map(([key,out])=>({equals:key,commands:[say(out.text),{op:'if',condition:eq(ref(`flags.quest.${id}.questioned`),true),then:[say('依頼人は、あなたが一度判断を保留したことも覚えている。結末の記録と一緒に、その時の問いを聞き直した。')],else:[]}]})),default:[]}]};
  const loc=q.locations.find(l=>l.role==='decision'),obj=maps[loc.map].objects.find(o=>o.id===loc.object);
  obj.condition=or(eq(ref(`quests.${id}.stage`),'active'),eq(ref(`quests.${id}.stage`),'completed'));
  obj.script=`${id}.visit`;
  q.scripts[obj.script]={commands:[{op:'if',condition:eq(ref(`quests.${id}.stage`),'completed'),then:[{op:'jump',script:`${id}.aftermath`}],else:[{op:'jump',script:decision}]}]};
  // q100 depends on the original 99 IDs, not a counter that the new side stories can inflate.
  if(n===100){q.requires=and(...Array.from({length:99},(_,i)=>eq(ref(`quests.q${String(i+1).padStart(3,'0')}.stage`),'completed')));}
  q.model.source=source;q.model.revision='game-scenario-1.0';
  q.model.dramaticQuestion=`${q.outcomes.contract.label}と${q.outcomes.informed.label}の間で、誰が何を引き受けるか。`;
  q.model.reveal.gate=evidence;q.model.reveal.window='判断前。知った後も全ての決着を選べる';
  q.model.reveal.earlyDiscovery='根拠を先に取得した経路も同じ判断へ接続する。異議は無調査でも述べられる';
  q.model.reveal.missedProof='未取得の真相を選択肢へ表示しない。依頼優先・別案・保留は可能';
  q.model.stateRegistry=[{path:`quests.${id}.evidence`,meaning:'取得した観察・証言。真実や人物の内心とは別',initial:[]},{path:`flags.quest.${id}.disclosed`,meaning:'判断前の事情説明を提示した履歴',initial:false},{path:`flags.quest.${id}.questioned`,meaning:'依頼の説明に不足があると口にした履歴。再会で参照',initial:false}];
  q.model.choiceContract={visibleRisk:'既存の戦闘・縄消費を明示。縄は逃走・敗北では消費しない',residue:'結末と判断保留の発言を再会時に参照',reward:'報酬額を正解の判定として扱わない'};
  await write(`data/quests/${id}.json`,q);quests.push(q);
 }
 const references=await read('authoring/reference/index.json');
 const enemies=await read('data/enemies.json'),encounters=await read('data/encounters.json');
 const specs=[];
 for(let i=1;i<=10;i++)specs.push(...(await import(`../authoring/scenarios-${String(i).padStart(2,'0')}.mjs`)).default);
 if(specs.length!==100||new Set(specs.map(s=>s.number)).size!==100)throw Error('100 unique additional scenarios required');
 for(const spec of specs){
  const id=`q${spec.number}`,r=Math.floor((spec.number-101)/10)+1;
  if(spec.encounter){
    const def=spec.encounter,eid=def.enemy;
    enemies[eid]={...structuredClone(enemies[`guard_${r}`]),id:eid,name:def.name,sprite:def.sprite};
    encounters[`story_${spec.number}`]={id:`story_${spec.number}`,text:`${def.name}が行く手に現れた。`,escape:true,enemies:[eid]};
  }
  const draft=references.find(d=>d.number===spec.number),map=maps[`region_${r}_f${spec.number%10<6&&spec.number%10>0?1:2}`];
  const replace=value=>JSON.parse(JSON.stringify(value).replaceAll('__Q__',id));
  const state=key=>`flags.quest.${id}.${key}`,sid=node=>`${id}.scene.${node}`;
  const scripts={},nodes=new Map(spec.nodes.map(n=>[n.id,n]));
  if(nodes.size!==spec.nodes.length||!nodes.has('entry'))throw Error(`${id}: duplicate/missing scene`);
  const outcomes=Object.fromEntries(Object.entries(spec.endings).map(([k,o])=>[k,{...o,gold:o.gold??45+r*12,xp:o.xp??45+r*6}]));
  const render=text=>Array.isArray(text)?text.flatMap(render):typeof text==='string'?(text?[say(text)]:[]):[{op:'if',condition:replace(text.when),then:render(text.yes),else:render(text.no)}];
  const go=to=>{
   if(to.startsWith('@')){const end=to.slice(1);if(!outcomes[end])throw Error(`${id}: missing outcome ${end}`);return [{op:'jump',script:`${id}.end.${end}`}];}
   if(!nodes.has(to))throw Error(`${id}: missing node ${to}`);
   return [{op:'jump',script:sid(to)}];
  };
  const option=o=>{
   const terms=[];
   if(o.when)terms.push(replace(o.when));
   for(const key of o.need??[])terms.push(eq(ref(state(key)),true));
   for(const [key,cost] of Object.entries(o.cost??{}))terms.push(key==='gold'?{op:'gte',left:ref('gold'),right:cost}:{op:'has_item',item:key,count:cost});
   const effects=()=>[
    ...Object.entries(o.cost??{}).map(([k,v])=>k==='gold'?{op:'gold.change',amount:-v}:{op:'item.take',item:k,count:v}),
    ...Object.entries(o.set??{}).map(([k,v])=>({op:'set',target:state(k),value:replace(v)})),
    ...(o.textAfter?render(o.textAfter):[]),...(o.commands??[]).map(replace),...go(o.to)
   ];
   const commands=o.combat?[{op:'battle.start',encounter:o.combat,on_win:effects(),on_escape:[...render(o.escapeText??'退路へ戻った。作戦は確定していない。'),...go(o.escape??'entry')],on_lose:[...render(o.lossText??'地上の救助班が隊を回収した。依頼の場を訪ねれば相談を再開できる。'),...(o.loss?go(o.loss):[])]}]:effects();
   return {id:o.id,text:o.text,...(terms.length?{condition:and(...terms)}:{}),...(o.visible?{visibleWhen:replace(o.visible)}:{}),requirement:[...((o.need??[]).length?['先に関係者との確認が必要']:[]),...Object.entries(o.cost??{}).map(([k,n])=>`${{gold:'G',rope:'縄',ration:'野営糧食',potion:'傷薬',torch:'松明'}[k]??k} ${n}消費`),...(o.combat?['戦闘。勝利時に行為を確定']:[])].join('・'),commands};
  };
  for(const node of spec.nodes){
   const options=node.options.map(option);
   options.push({id:'pause',text:'ここで中断し、同じ場面から再開する',commands:[]});
   scripts[sid(node.id)]={commands:[{op:'set',target:state('node'),value:node.id},...render(node.text),{op:'choice',options}]};
  }
  for(const [end,out] of Object.entries(outcomes))scripts[`${id}.end.${end}`]={commands:[{op:'if',condition:eq(ref(`quests.${id}.stage`),'active'),then:[say(out.text),{op:'quest.complete',quest:id,outcome:end}],else:[]}]};
  scripts[`${id}.visit`]={commands:[{op:'if',condition:eq(ref(`quests.${id}.stage`),'completed'),then:[{op:'switch',value:ref(`quests.${id}.outcome`),cases:Object.entries(outcomes).map(([k,v])=>({equals:k,commands:[say(v.text)]})),default:[]}],else:[{op:'switch',value:ref(state('node')),cases:spec.nodes.map(n=>({equals:n.id,commands:[{op:'jump',script:sid(n.id)}]})),default:[{op:'jump',script:sid('entry')}]}]}]};
  const used=new Set(map.objects.flatMap(o=>[`${o.x},${o.y}`,...(o.kind==='door'?[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>`${o.x+dx},${o.y+dy}`):[])]));
  let point;
  for(let y=1;y<map.tiles.length-1&&!point;y++)for(let x=1;x<map.tiles[y].length-1;x++)if(map.tiles[y][x]==='.'&&!used.has(`${x},${y}`)){point={x,y};break;}
  if(!point)throw Error(`${id}: no free map location`);
  const object=`${id}_scene`;
  map.objects.push({id:object,...point,name:`${draft.title}：${spec.client}`,kind:'decision',quest:id,trigger:'interact',safe:true,condition:or(eq(ref(`quests.${id}.stage`),'active'),eq(ref(`quests.${id}.stage`),'completed')),script:`${id}.visit`});
  const q={schemaVersion:1,id,number:spec.number,title:draft.title,client:spec.client,brief:spec.brief,region:r,type:spec.type??'scene_graph',recommendedLevel:r,requires:null,unlockHint:'いつでも受注できます。場面内の移動は文章と選択で進みます。',locations:[{map:map.id,object,...point,role:'decision'}],outcomes,model:{source,sourceDraft:draft.source,revision:'game-scenario-1.0',world:{truth:draft['展開と開示'],fixedPast:draft['依頼と人物']},agents:[{id:'cast',name:spec.client,beliefsAndGoals:draft['依頼と人物']},{id:'party',name:'冒険者の隊',goal:spec.brief}],conflict:{design:draft['経路']},narrative:{viewpoint:'冒険者の観察と当事者の発言',units:spec.nodes.map(n=>({id:n.id,script:sid(n.id)}))},audience:{initialHypothesis:spec.brief},reveal:{newInformation:draft['展開と開示'],retroactiveTargets:['source.request','source.disclosure'],policy:'各経路で提示した本文だけを後続の選択の根拠とする'},beats:spec.nodes.map(n=>({id:n.id,script:sid(n.id)})),adaptation:{setting:'各地域の地下居住区・周辺集落への出張。場面内の移動は文章で表現',reward:'原稿の修理券・紹介等の報酬は、この版ではギルドの定額金・経験値へ換算。特殊な権利のUIや自動加入は提供しない',npc:'固有NPCは物語内の同行者。戦闘パーティーへ自動追加しない',limits:spec.limits??[]},stateRegistry:[],graph:replace(spec.nodes)},scripts};
  const stateKeys=new Set(['node']);
  for(const node of spec.nodes)for(const o of node.options)for(const k of Object.keys(o.set??{}))stateKeys.add(k);
  q.model.stateRegistry=[...stateKeys].map(k=>({path:state(k),meaning:k==='node'?'中断時の再開場面':`作者原稿の ${k} に対応する選択・発言・行為の履歴`,initial:k==='node'?'entry':'未設定。条件の成立とは扱わない',writer:spec.nodes.filter(n=>n.options.some(o=>Object.hasOwn(o.set??{},k))).map(n=>n.id),scope:'quest',lifetime:'保存データ内に保持'}));
  await write(`data/quests/${id}.json`,q);quests.push(q);
 }
 for(const m of Object.values(maps))await write(`data/maps/${m.id}.json`,m);
 await write('data/enemies.json',enemies);await write('data/encounters.json',encounters);
 game.files.quests=quests.map(q=>`data/quests/${q.id}.json`);
 game.version='1.3.1';game.recordVersion=1;game.subtitle='二百の依頼と、帰還の記録';
 game.migrations['1.3.0']={actors:Object.keys(await read('data/actors.json')),scenarioRevision:true};
 for(const migration of Object.values(game.migrations))migration.quests=quests.filter(q=>q.number<=100).map(q=>q.id);
 await write('data/game.json',game);
 const common=await read('data/scripts/common.json');common.scripts.prologue.commands[1].text=common.scripts.prologue.commands[1].text.replace(/(?:二)?百の依頼/,'二百の依頼');await write('data/scripts/common.json',common);
 const catalog=['# シナリオ一覧','',`全${quests.length}本。既存 q001–q100 を改稿し、新規 q101–q200 を追加。更新日: 2026-09-10。`,``,`設計基準: [ゲームシナリオモデル v1.0](${source})。作者向け一覧のため真相・結末を含みます。`,``,`追加分は町の依頼一覧で受注し、表示された地点を調べると開始します。場面途中は「中断」で探索へ戻り、同じ地点から続けられます。完了後の再訪は後日談のみです。`,``,`q100 は元の99本の完了で解放します。追加100本の完了数では代用できません。`,``,`新規篇の原稿報酬は金・経験値へ換算しました。本文で扱うNPC同行、競技、交渉、儀礼等は場面内の選択として実行します。`,``];
 for(const q of quests){catalog.push(`## ${q.id} ${q.title}`,``,`依頼人: ${q.client}。地域: ${q.region}。${q.unlockHint}`,``,`概要: ${q.brief}`,``,`実装: [シナリオJSON](../data/quests/${q.id}.json)。${q.number>100?`場面 ${q.model.narrative.units.length}、結末 ${Object.keys(q.outcomes).length}。原稿: [Notion](${q.model.sourceDraft})。`:'痕跡・証言・決着・再会。改稿前の継続位置も保存互換用に保持。'}`,``,`真相と人物: ${q.model.world.truth}`,``);for(const [k,o] of Object.entries(q.outcomes))catalog.push(`${k} — ${o.label}（${o.gold}G / ${o.xp}EXP）: ${o.text}`,``);}
 await fs.writeFile(path.join(root,'doc/QUEST_CATALOG.md'),catalog.join('\n'));
 console.log(`Scenarios: ${quests.length} quests, ${quests.reduce((n,q)=>n+Object.keys(q.outcomes).length,0)} endings; ${specs.reduce((n,q)=>n+q.nodes.length,0)} new scenes`);
}
await buildScenarios();
