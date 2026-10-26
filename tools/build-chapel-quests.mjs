import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {story,O,set,see,ref,eq,and,or} from '../authoring/story-kit.mjs';
import {connectWorld} from '../authoring/world-story-kit.mjs';
import {chapelSecondSource} from '../authoring/editions/e2/oddland/chapel-second.mjs';
import {chapelSource} from '../authoring/editions/e2/oddland/chapel.mjs';
const root=path.resolve(import.meta.dirname,'..');
const done=id=>eq(ref(`quests.${id}.stage`),'completed');
const prose=text=>typeof text==='string'?[{op:'narrate',text}]:text.flatMap(part=>typeof part==='string'?prose(part):[{op:'if',condition:part.when,then:prose(part.yes),else:prose(part.no)}]);
export function compileChapelQuest(first){
 const q=structuredClone(first),x=q.number>=131?chapelSecondSource(first):chapelSource(first),id=q.id,sid=node=>`${id}.pilgrimage.${node}`;
 // Keep payment and combat local; the next explicit action begins the trip.
 for(const n of [...x.nodes])for(const a of n.options){const target=x.nodes.find(t=>t.id===a.to);if(target&&target.place!==n.place&&(a.cost||a.combat)){const ready=`${n.id}_${a.id}_ready`,travel={...a,id:'continue',text:'準備した相手・品物と目的地へ向かう'};delete travel.cost;delete travel.combat;delete travel.when;delete travel.visible;x.nodes.push({id:ready,place:n.place,text:a.combat?'戦いに勝利し、先へ進む道が開いた。次の場所まで歩いて確かめる。':'必要な道具を使って準備を整えた。ここから目的地まで運ぶ。',options:[travel]});a.to=ready;a.effects=[];delete a.depart;delete a.companions;}}
 const s=story(q.number,Object.fromEntries(Object.entries(x.places).map(([key,p])=>[key,p.name])),[]);
 s.enum('resolution','pending',['pending',...Object.keys(q.outcomes)],'現地で実行した解決方法');s.bool('finished',false,'現地の結果を確認して依頼を終えた');
 for(const [key,value] of Object.entries(x.flags))s.bool(key,value,key);
 for(const [key,r] of Object.entries(x.registry??{}))s.story.registry[key]=r;
 for(const [key,e] of Object.entries(x.entities))s.entity(key,e.holder,null,{kind:e.kind});
 s.fact('truth',q.model.reveal.newInformation);
 for(const n of x.nodes)s.node(n.id,n.place,[],n.text,n.options.map(a=>O(a.id,a.text,a.to,[...(a.effects??[]),...(a.to.startsWith('@')?[set('resolution',a.to.slice(1)),set('finished')]:[])],{when:a.when??true,...(a.cost?{cost:a.cost}:{}),once:false})));
 const route=connectWorld(s,Object.fromEntries(Object.entries(x.places).map(([key,p])=>[key,p.world])),1);
 for(const n of x.nodes)for(const a of n.options){
  const target=x.nodes.find(t=>t.id===a.to),action=s.story.actions[`${n.id}_${a.id}`];
  if(typeof target?.text==='string'&&target.text.includes(q.model.reveal.newInformation))action.effects.push(see('truth',target.place));
  if(target&&target.place!==n.place)route(`${n.id}_${a.id}`,target.place,{companions:a.companions??[],depart:a.depart??[],arrive:action.effects});
  else if(a.depart?.length)throw Error(`${id}/${n.id}/${a.id}: departure effects require a journey`);
 }
 for(const [key,o] of Object.entries(q.outcomes)){
  const places=x.nodes.filter(n=>n.options.some(a=>a.to==='@'+key)).map(n=>n.place);
  s.end(key,o.label,o.text,and(s.is('resolution',key),s.is('finished'),or(...[...new Set(places)].map(p=>s.is('partyAt',p)))));
 }
 s.done();
 // Preserve the independent mirror investigation scripts on q039. Obsolete
 // single-cell quest routes are not reachable in this fresh-save-only edition.
 q.scripts=q.number>=131?q.scripts:Object.fromEntries(Object.entries(q.scripts).filter(([key])=>!key.startsWith(id+'.')));
 for(const n of x.nodes){
  const options=n.options.map(a=>{
   const action=`${n.id}_${a.id}`,definition=s.story.actions[action];
   const commands=definition.journey?[{op:'story.journey',quest:id,action}]:[{op:'story.action',quest:id,action},...(a.textAfter?prose(a.textAfter):[]),{op:'jump',script:sid(a.to.startsWith('@')?'end.'+a.to.slice(1):a.to)}];
   if(a.combat&&definition.journey)throw Error('Combat and departure must be separate choices');
   return {id:a.id,text:a.text,storyAction:{quest:id,action},...(a.when?{condition:a.when}:{}),...(a.visible?{visibleWhen:a.visible}:{}),requirement:a.combat?'戦闘。作業・報酬は勝利後に確定する。':a.cost?Object.entries(a.cost).map(([k,v])=>`${k} ${v}消費`).join(' / '):'',commands:a.combat?[{op:'battle.start',encounter:typeof a.combat==='string'?a.combat:'boss_4',on_win:commands,on_escape:[...prose('戦いを切り上げた。作業は確定していない。現場で再開できる。'),...(q.number>=131?[{op:'jump',script:sid(n.id)}]:[])],on_lose:prose('救助班に巡礼台地へ運び出された。現場へ戻れば直前の作業から再開できる。')}]:commands};
  });
  q.scripts[sid(n.id)]={storyQuest:id,commands:[{op:'story.scene',quest:id,scene:n.id},...prose(n.text),{op:'choice',options}]};
 }
 for(const key of Object.keys(q.outcomes))q.scripts[sid('end.'+key)]={commands:[...prose(q.outcomes[key].text),{op:'add',target:'vars.'+key,value:1},{op:'quest.complete',quest:id,outcome:key}]};
 q.scripts[sid('visit')]={commands:[{op:'if',condition:done(id),then:[{op:'switch',value:ref(`quests.${id}.outcome`),cases:Object.entries(q.outcomes).map(([key,o])=>({equals:key,commands:prose(o.text)})),default:[]}],else:[{op:'story.init',quest:id},{op:'switch',value:ref(`stories.${id}.scene`),cases:x.nodes.map(n=>({equals:n.id,commands:[{op:'jump',script:sid(n.id)}]})),default:[{op:'jump',script:sid('entry')}]}]}]};
 const investigations=first.events.filter(e=>e.trigger==='action');
 q.events=[...investigations,...Object.entries(x.places).filter(([,p])=>p.world.kind==='dungeon').map(([key,p])=>({id:`${id}_pilgrim_${key}`,title:p.name,trigger:'interact',kind:'decision',role:key==='entry'?'decision':key,interactionRange:'here',safe:true,visibleWhen:or(eq(ref(`quests.${id}.stage`),'active'),done(id)),script:sid('visit'),points:[{dungeon:p.world.dungeon,map:p.world.map,x:p.world.x,y:p.world.y}]}))];
 if(q.number>=131){
  const legacy=eq(ref(`flags.legacyStoryRoutes.${id}`),true);
  for(const e of q.events)e.visibleWhen=and(e.visibleWhen,{op:'not',arg:legacy});
  q.events=[...first.events.map(e=>({...structuredClone(e),visibleWhen:and(e.visibleWhen,legacy)})),...q.events];
  q.scripts[sid('visit')].commands=[{op:'if',condition:legacy,then:[{op:'jump',script:id+'.visit'}],else:q.scripts[sid('visit')].commands}];
 }
 q.locations=q.number>=131?structuredClone(first.locations):[];q.story=s.story;q.settlement='oddland_plateau';q.receptionLocations=['pilgrim_board'];q.unlockHint=first.unlockHint+' 巡礼台地の依頼所で受注し、現場まで歩いて進める。';
 q.model={...q.model,standard:{id:'game-scenario-model',version:'1.2b',source:'doc/scenarios/SCENARIO_MODEL_V12B.md',adapter:'adv-story-state/1',scope:'既存本文の現場・保持者・到着条件の接続。全文改稿は含めない。'},entryScript:sid('visit'),source:'authoring/editions/e2/oddland/chapel.mjs',edition:{id:'e2',revision:1,inherits:'e1'},narrative:{...q.model.narrative,units:x.nodes.map(n=>({id:n.id,script:sid(n.id)}))},graph:x.nodes.map(n=>({id:n.id,place:n.place,text:n.text,options:n.options.map(a=>({id:a.id,text:a.text,to:a.to,action:`${n.id}_${a.id}`}))})),relocation:{stage:'first-ten',settlement:'oddland_plateau',saveRevision:2,scope:'礼拝堂20件のうち前半10件の実地接続。後半10件はchapel-second.mjsで接続。'}};
 if(q.number>=131){q.model.preserveAcceptedRoute=true;q.model.source='authoring/editions/e2/oddland/chapel-second.mjs';q.model.relocation={stage:'second-ten',settlement:'oddland_plateau',saveRevision:2,scope:'後半10件の実地接続。既に受注済みの改訂2は旧経路を保持。'};}
 return q;
}
function document(quests,{second=false}={}){
 const lines=[`# 鏡沈みの礼拝堂・${second?'後半':'前半'}10件の第2版経路`,'',`2026-10-26。${second?'q131〜140':'q031〜040'}の既存本文・真相・結末・報酬を保持して、実際の場所と同行・受渡しへ接続した。旧本文の全文改稿ではない。礼拝堂20件の受付・入口・現場・帰路を巡礼台地へ接続済み。受注済みの旧経路は保存方針に従って保持する。`,'',
 `[引き継ぎ](../../../HANDOFF.md) ／ [移設作業票](../../../dungeons/REGIONAL_RELOCATION_WORK.md) ／ [原稿](../../../../authoring/editions/e2/oddland/${second?'chapel-second':'chapel'}.mjs) ／ [生成器](../../../../tools/build-chapel-quests.mjs)`,'',
 '## 保存と往復','','前半10件の導入時に第2版の旧セーブ互換を一度切り、保存改訂2とした。後半10件の導入では改訂2を維持し、受注済み・完了済みのq131〜140は旧命令列と経路を保持する。未受注分から新経路を使う。旧VM・戦闘・費用・報酬を初期化しない。改訂2より前のe2は引き続き非対応で、原文を保護する。初版は変更しない。','',
 '国境宿場→石橋の交易市→巡礼台地／旧王領の村を実際に歩く。巡礼台地の依頼所で受注し、礼拝堂へ出発する。通常出口・帰還印・敗北救助は巡礼台地へ戻る。街道は固定照明のある安全経路で、油0・資金0でも往復できる。礼拝堂内の遭遇・鏡・階段は従来どおりで、街道の安全性を迷宮全体の無消耗とは扱わない。','',
 second?'砂の回廊、沈んだ宿、燃え残る図書館、崩落坑道、整備別棟の5マップと6施設を追加した。水底の宿では歩行で空気を消費し、潜水口で補給する。同行NPCは戦闘隊へ加えず、受渡しと救出は到着時に確定する。費用と戦闘は出発前に確定し、その後に移動を開始する。':'一室の会話・録音の試験・合唱・修理台の話合いは同じ座標に置く。地下牢、石工台、病室側、客室、面会室、三軒の返却先、検査台、閉鎖区画は実到着が必要。本文中の昼夜は場面の経過であり、現実のタイマー待ちは設けない。',''];
 for(const q of quests){lines.push(`## ${q.id} ${q.title}`,'',q.brief,'');for(const n of q.model.graph){const p=q.story.worldPlaces[n.place];lines.push(`### ${n.id} — ${q.story.places[n.place]}`,'',p.kind==='town'?`現場：\`${p.location}\``:`現場：\`${p.map} (${p.x},${p.y})\``,'',...(typeof n.text==='string'?[n.text]:n.text.map(p=>typeof p==='string'?p:`条件に応じて：${p.yes} ／ ${p.no}`)),'');for(const a of n.options)lines.push(`1. ${a.id}：${a.text} → ${a.to}`);lines.push('');}for(const [key,o] of Object.entries(q.outcomes))lines.push(`### 結末 ${key}`,'',o.text,'',`報酬：${o.gold}G、${o.xp}EXP。`,'');}
 return lines.join('\n').trimEnd()+'\n';
}
export async function buildChapelQuests({check=false}={}){
 const quests=[];
 for(const n of [...Array.from({length:10},(_,i)=>31+i),...Array.from({length:10},(_,i)=>131+i)]){const id='q'+String(n).padStart(3,'0'),first=JSON.parse(await fs.readFile(path.join(root,'data/quests/'+id+'.json'),'utf8'));quests.push(compileChapelQuest(first));}
 const files=Object.fromEntries(quests.map(q=>['data/scenario-editions/e2/'+q.id+'.json',JSON.stringify(q,null,2)+'\n']));
 files['doc/scenarios/editions/e2/CHAPEL_FIRST_TEN.md']=document(quests.filter(q=>q.number<100));
 files['doc/scenarios/editions/e2/CHAPEL_SECOND_TEN.md']=document(quests.filter(q=>q.number>100),{second:true});
 for(const [file,text] of Object.entries(files)){const target=path.join(root,file);if(check){if(await fs.readFile(target,'utf8').catch(()=>null)!==text)throw Error(file+': chapel generation differs');}else await fs.writeFile(target,text);}
 return quests;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await buildChapelQuests({check:process.argv.includes('--check')});
