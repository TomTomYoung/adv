import {story,O,set,see,eq,ref,and,or,give} from '../../../story-kit.mjs';
import {oddlandCharacterArt,ODDLAND_SCENE_BLOCKING} from '../../../oddland-character-art.mjs';
import {connectWorld} from '../../../world-story-kit.mjs';
export {set,see,eq,ref,and,or,give};
export const completed=n=>eq(ref(`quests.q${n}.stage`),'completed');
export const resolved=(n,value)=>eq(ref(`quests.q${n}.outcome`),value);
export const atLeastThree=()=>or(...Array.from({length:7},(_,i)=>291+i).flatMap((a,i,ns)=>ns.slice(i+1).flatMap((b,j,rest)=>rest.slice(j+1).map(c=>and(completed(a),completed(b),completed(c))))));
const town=(location,name)=>({name,world:{kind:'town',location}}),cell=(map,x,y,name)=>({name,world:{kind:'dungeon',dungeon:'region_1',map,x,y}});
export const places={
 board:town('oddland_board','国境宿場の共同依頼所'),inn:town('oddland_inn','国境宿場の旅籠'),clinic:town('oddland_clinic','国境宿場の施療所'),supply:town('oddland_supply','国境宿場の補給店'),
 yard:town('oddland_cart_yard','国境宿場の荷車溜まり'),canteen:town('oddland_canteen','国境宿場の食堂'),cobbler:town('oddland_cobbler','宿場の靴直し場'),registry:town('oddland_registry','宿場の登録相談室'),warehouse:town('oddland_warehouse','宿場の共同倉庫'),annex:town('oddland_annex','共同倉庫の空き別棟'),oil:town('oddland_oil_yard','補給店裏の油検査場'),
 refuge:cell('e2_trade_refuge',3,3,'交易回廊の退避所・腰掛け'),kitchen:cell('e2_trade_corridor',3,1,'交易回廊のトルネア側炊事場'),salt:cell('e2_trade_corridor',5,3,'交易回廊の濡れた石床'),wash:cell('e2_trade_corridor',7,3,'交易回廊の洗い場'),signals:cell('e2_trade_refuge',7,1,'退避所の荷下ろし壁'),customs:cell('e2_border_customs',7,1,'外国側窓口の当直席')
};
const specs=[
 ['cart_yard','国境宿場の荷車溜まり','oddland_border','荷車は入口を空けて二列に並んでいる。御者は帰りの客を待ち、荷役が車輪の留め木を確かめている。','location_square'],
 ['canteen','国境宿場の食堂','oddland_border','通路側の窓から、煮込みの湯気が流れる。大鍋の脇に、交代で食べる荷役の椀が重ねてある。','location_tavern'],
 ['cobbler','宿場の靴直し場','oddland_border','修繕台には、同じ側の底ばかり傷んだ靴が並ぶ。職人は持ち主が歩いて来る音に耳を澄ませている。','location_shop'],
 ['registry','宿場の登録相談室','oddland_border','出入窓口で確かめきれなかった名前や住所を相談する小部屋。長椅子と、昔の名簿を置く棚がある。','location_guild'],
 ['warehouse','宿場の共同倉庫','oddland_border','食料と油の置き場を通路で分けた共同倉庫。荷を動かす前に、担当者へ声を掛けられる。','location_shop'],
 ['annex','共同倉庫の空き別棟','oddland_warehouse','倉庫の中庭を挟んだ別棟。荷はなく、床の掃除と寝具の用意をすれば人が休める。','location_tavern'],
 ['oil_yard','補給店裏の油検査場','oddland_supply','店の裏庭に、蓋のできる試験灯と返却用の容器が置かれている。地下へ持ち込む油は、ここで売り手と確かめる。','location_shop']
];
export const locations=Object.fromEntries(specs.map(([id,name,parent,description,background])=>['oddland_'+id,{id:'oddland_'+id,name,parent,description,background,links:[]} ]));
export const characters={};
export const person=(key,name,place,goal)=>{characters['od_'+key]={id:'od_'+key,name,goal,role:'国境宿場の住民',detail:'オッドランド第一群の人物。外見・肖像は未制作。',...oddlandCharacterArt('od_'+key)};return {key,name,place,goal};};
export const A=(id,label,to,extra={})=>({id,label,to,...extra});
export const N=(id,place,text,options,extra={})=>({id,place,text,options,...extra});
const render=text=>typeof text==='string'?[{op:'narrate',text}]:text;
export function compileQuest(x){
 const id=`q${x.number}`,keys=[...new Set(x.nodes.map(n=>n.place))],s=story(x.number,Object.fromEntries(keys.map(k=>[k,places[k].name])),[]);
 s.enum('resolution','pending',['pending',...Object.keys(x.ends)],'実行する解決方法');s.bool('finished',false,'現地の結果を確認し、この件を終えた');
 for(const p of x.people??[])s.entity(p.key,p.place,'od_'+p.key);
 for(const [key,holder] of Object.entries(x.items??{}))s.entity(key,holder);
 for(const [key,value] of Object.entries(x.flags??{}))s.bool(key,value,key);
 for(const [key,text] of Object.entries(x.facts??{}))s.fact(key,text);
 for(const n of x.nodes)s.node(n.id,n.place,n.cast??[],n.text,n.options.map(a=>O(a.id,a.label,a.to,[...(a.resolution?[set('resolution',a.resolution)]:[]),...(a.effects??[]),...(a.to.startsWith('@')?[set('finished')]:[])],{...(a.when?{when:a.when}:{}),...(a.cost?{cost:a.cost}:{})})),n.requires??true);
 for(const [scene,positions] of Object.entries(ODDLAND_SCENE_BLOCKING[id]??{}))for(const c of s.story.scenes[scene].cast)c.display=positions[c.entity];
 const route=connectWorld(s,Object.fromEntries(keys.map(k=>[k,places[k].world])),1);
 for(const n of x.nodes)for(const a of n.options){const target=x.nodes.find(t=>t.id===a.to);if(target&&target.place!==n.place){
  const action=s.story.actions[`${n.id}_${a.id}`],effects=action.effects;
  route(`${n.id}_${a.id}`,target.place,{companions:a.companions??[],depart:a.depart??[],arrive:[...effects,...(target.learn??[]).map(f=>see(f,target.place))]});
 }}
 for(const [key,end] of Object.entries(x.ends)){const node=x.nodes.find(n=>n.options.some(a=>a.to==='@'+key));s.end(key,end.label,end.text,and(s.is('resolution',key),s.is('finished'),s.is('partyAt',node.place),...(x.finalFlags??[]).map(k=>s.is(k))));}
 s.done();const sid=n=>`${id}.od.${n}`,scripts={};
 for(const [i,node] of s.nodes.entries())scripts[sid(node.id)]={storyQuest:id,commands:[{op:'story.scene',quest:id,scene:node.id},...render(node.text),{op:'choice',options:node.options.map(o=>({id:o.id,text:o.text,storyAction:{quest:id,action:o.action},...(o.when?{condition:o.when}:{}),requirement:o.cost?Object.entries(o.cost).map(([k,v])=>`${k==='gold'?'G':k} ${v}消費`).join(' / '):'',commands:s.story.actions[o.action].journey?[{op:'story.journey',quest:id,action:o.action}]:[{op:'story.action',quest:id,action:o.action},{op:'jump',script:sid(o.to.startsWith('@')?'end.'+o.to.slice(1):o.to)}]}))}]};
 for(const key of Object.keys(x.ends))scripts[sid('end.'+key)]={commands:[{op:'quest.complete',quest:id,outcome:key}]};
 scripts[sid('visit')]={commands:[{op:'if',condition:completed(x.number),then:[{op:'switch',value:ref(`quests.${id}.outcome`),cases:Object.entries(x.ends).map(([key,end])=>({equals:key,commands:render(end.text)})),default:[]}],else:[{op:'story.init',quest:id},{op:'switch',value:ref(`stories.${id}.scene`),cases:s.nodes.map(n=>({equals:n.id,commands:[{op:'jump',script:sid(n.id)}]})),default:[{op:'jump',script:sid('entry')}]}]}]};
 const events=keys.filter(k=>places[k].world.kind==='dungeon').map(k=>({id:`${id}_${k}`,title:`${x.title} — ${places[k].name}`,trigger:'interact',kind:'decision',interactionRange:'here',safe:true,visibleWhen:eq(ref(`quests.${id}.stage`),'active'),script:sid('visit'),points:[{...places[k].world,kind:undefined}]}));
 return {schemaVersion:1,id,number:x.number,title:x.title,client:x.client,brief:x.brief,region:12,type:'authored_progression',recommendedLevel:3,settlement:'oddland',receptionLocations:['oddland_board'],requires:x.requires??true,unlockHint:x.unlockHint??'オッドランドの共同依頼所で受注。地下関所の登録と現地到着が必要。',events,locations:[],outcomes:Object.fromEntries(Object.entries(x.ends).map(([key,e])=>[key,{label:e.label,text:e.text,gold:e.gold,xp:e.xp,gems:e.gems??0}])),story:s.story,scripts,
 model:{standard:{id:'game-scenario-model',version:'1.2b',source:'https://github.com/TomTomYoung/GAMEBOOK/blob/main/doc/SCENARIO_MODEL_V1_2B.md',adapter:'adv-story-state/1',revision:'2026-10-26',scope:'quest-episode'},entryScript:sid('visit'),world:{truth:x.truth,history:[{id:'before_request',text:x.brief}],initialState:'依頼受注時には現地未調査。人物・物品は各初期位置にあり、解決はpending。'},agents:x.people.map(p=>({id:p.key,name:p.name,goal:p.goal,initialLocation:p.place})),situation:{request:x.brief,obstacle:x.truth},mechanism:{evidence:x.facts??{},resolution:Object.keys(x.ends),cost:'費用は現地の行為で一回だけ消費。移動は実際のセル・施設への到着を検証。'},narrative:{units:s.nodes.map(n=>({id:n.id,script:sid(n.id)}))},graph:s.nodes.map(n=>({id:n.id,text:n.text,options:n.options.map(o=>({id:o.id,text:o.text,to:o.to,action:o.action}))})),reveal:{newInformation:x.truth,retroactiveTargets:['entry'],window:'各現場で人物と物品を確かめてから方法を選ぶ。'},audience:{initialHypothesis:x.brief,experienceIntent:x.title},choiceContract:{resources:'選択肢に記した費用だけを現地で一回消費する。無資金の代案を残す。',residue:'解決方法・保持者・知識・実行済み行為を保存し、後続の協力条件に使う。',interruption:'位置を離れても完了した観察や支払いを消さず、同じ場所で再開する。'},authoring:{revision:2,scenarioSource:'doc/scenarios/SCENARIO_MODEL_V12B.md',proseSource:'doc/scenarios/PROSE_MODEL_V1.md',scope:'OD001〜010。地域配分の初期採用40件のうち10件。最終盤は含めない。',counterfactual:x.counterfactual,review:x.review}}};
}
