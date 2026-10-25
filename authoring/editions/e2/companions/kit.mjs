import {story,O,set,see,eq,ref,and} from '../../../story-kit.mjs';
import {connectWorld} from '../../../world-story-kit.mjs';
import {localAgents,goals} from './design.mjs';

export const names={ada:'アダ',nio:'ニオ',sera:'セラ',il:'イル',berg:'ベルグ',luka:'ルカ',toma:'トーマ',mika:'ミカ'};
export const resolved=(number,outcome)=>eq(ref(`quests.q${number}.outcome`),outcome);
export const completed=number=>eq(ref(`quests.q${number}.stage`),'completed');
// Authoring tuples carry actual prose, never generated combinations of plot words.
export const C=(id,label,action,result,closing,extra={})=>({id,label,action,result,closing,...extra});
export const Q=(number,title,base,site,entry,clue,choices,extra={})=>({number,title,base,site,entry,clue,choices,...extra});
const locationsSpec=[
 ['road','領内街道・乗合馬車の停留所','hikarigaeri_square','灯帰りを出た乗合馬車が、高台へ延びる街道を進む。行政都市と学術都市へは、それぞれ別の道をたどる。都市間の移動はこの停留所を経由する。'],
 ['admin','行政都市・水門警備隊庁舎','road','街道の坂を上った先に、領主直轄の庁舎がある。巡回の地図を掛けた廊下を、隊員と治水の技師が行き来している。'],
 ['academy','学術都市・共同広場','road','街道の分岐から学術都市へ向かう。高台に神学校、魔術協会、機械学会の建物が並ぶ。'],
 ['underground','地下街・配達屋の辻','hikarigaeri_waterwatch','待避場から階段を下り、巡灯路沿いに進むと地下街へ着く。煮炊きの湯気の向こうを、荷役と配達人が行き交う。'],
 ['docks','地下街・荷揚げ場','underground','荷揚げ場は配達屋の辻から低い通路を抜けた先にある。鉄鉤組の荷役が交代で巻上機を回している。'],
 ['market','地下街・赤壺の市場','underground','屋台には油壺と食料が積まれている。市場の外れから、遺品を運ぶ骨拾い衆の小路が分かれる。'],
 ['culvert','地下街外縁・排水回廊','underground','地下街を離れた回廊では、排水管に並んで壁灯が続く。ここから先は、住民も巡灯の間隔を確かめて歩く。'],
 ['settlement','開拓地・仮設集会所','road','馬車道を外れ、開拓地の集会所へ着く。水害の生存者と、新しく畑を開く家族が同じ炉を使っている。'],
 ['levee','開拓地・旧堤の作業道','settlement','集会所から旧堤を歩く。通常の排水樋、墓地へ分かれる小道、石切場の救助口が並んでいる。'],
 ['chapel','街道の共同施療院','road','街道沿いの施療院には、聖教会の礼拝室と、土地の薬草師も使う診察室がある。'],
 ['grove','施療院裏の林と祠','chapel','施療院の裏道を上ると古い祠がある。林には土地の術者が出入りし、住民も薬草や薪を取りに来る。'],
 ['archive','学術都市・灰時計の書庫受付','academy','巨大な書庫の安全が確認された入口区画。踏査の受付から、ダンジョン化した書架へ下りる。'],
 ['stacks','灰時計の書庫・踏査回廊','archive','書庫の階段を下り、調査標のある回廊へ進む。棚や閲覧室ごとの踏査を、受付で確認した範囲で行う。'],
 ['workshop','学術都市・遺物管理室','academy','機械学会の奥にある管理室。作業台は、遺物を調べる試験槽と、収蔵庫へ通じている。'],
 ['relic','遺物管理室・隔離試験槽','workshop','重い扉を閉めて試験槽へ入る。試験台の周りに柵があり、壁際の台から計器を読める。持ち込んだ機器の名と、今日の担当者が札に記されている。'],
 ['storage','遺物管理室・収蔵庫','workshop','管理室の奥にある収蔵庫。扉の可動域を空け、保管箱の封と注意札を確かめて入る。'],
 ['rescue','灯帰り・救助隊詰所','hikarigaeri_guild','担架と交代用の靴を置く救助隊の詰所。出動を待つ者が、依頼人の来る扉を見ている。'],
 ['watch','灯帰り外縁・避難訓練場','hikarigaeri_waterwatch','待避場から外縁の訓練場へ歩く。壁灯の間隔と避難者の流れを、通路と同じ幅の柵で確かめられる。'],
 ['herbs','薬草探索路・迷宮の休息所','chapel','施療院から荷車道を進み、薬草が見つかる迷宮の入口へ下りる。地元の採集者が休息所に道標を残している。'],
 ['garden','薬草探索路・奥の花畑','herbs','休息所から道標をたどった先に、地熱のある花畑が広がる。入口側の乾いた蔓が、採集路の天井を覆っている。']
];
export const locations=Object.fromEntries(locationsSpec.map(([id,name,parent,description])=>['e2_'+id,{id:'e2_'+id,name,parent:locationsSpec.some(l=>l[0]===parent)?'e2_'+parent:parent,description,background:['archive','stacks','workshop','relic'].includes(id)?'location_specimens':'location_square',links:[]} ]));
const loc=key=>locations['e2_'+key]?{kind:'town',location:'e2_'+key}:{kind:'town',location:key};
const placeName=key=>locations['e2_'+key]?.name??key;
const render=text=>typeof text==='string'?[{op:'narrate',text}]:text;

export function compileEpisode(source,actor,index){
 const x=source,id=`q${x.number}`,previous=x.number-1,member={op:'has_member',actor:actor==='mika'?'mica':actor};
 const s=story(x.number,{base:placeName(x.base),site:placeName(x.site)},[['base','site']]);
 s.entity('companion','base',`e2_${actor}`);s.enum('resolution','pending',['pending',...x.choices.map(c=>c.id)],'実行して帰還する解決方法');
 s.bool('examined',false,'現場の事情を確認した');s.fact('finding',x.clue);
 s.node('entry','base',['companion'],x.entry,[O('go',x.depart??'現場へ向かう','survey')],member);
 s.node('survey','site',['companion'],x.clue,x.choices.map(c=>O(c.id,c.label,`result_${c.id}`,[set('resolution',c.id)],{when:and(member,s.known('finding'),...(c.when?[c.when]:[])),...(c.cost?{cost:c.cost}:{})})),and(member,s.is('examined')));
 for(const c of x.choices){
   s.node(`result_${c.id}`,'site',['companion'],`${c.action}\n\n${c.result}`,[O('return',x.returnLabel??'依頼の出発地点へ戻る',`home_${c.id}`)],and(member,s.is('resolution',c.id)));
   s.node(`home_${c.id}`,'base',['companion'],c.closing,[O('finish','この件を終える',`@${c.id}`)],and(member,s.is('resolution',c.id)));
   s.end(c.id,c.label,c.closing,and(s.is('resolution',c.id),s.is('partyAt','base')));
 }
 const route=connectWorld(s,{base:loc(x.base),site:loc(x.site)},1);
 route('entry_go','site',{companions:['companion'],arrive:[see('finding','site'),set('examined')]});
 for(const c of x.choices)route(`result_${c.id}_return`,'base',{companions:['companion']});
 s.done();const sid=n=>`${id}.e2.${n}`,scripts={};
 for(const node of s.nodes)scripts[sid(node.id)]={storyQuest:id,commands:[{op:'story.scene',quest:id,scene:node.id},...render(node.text),{op:'choice',options:node.options.map(o=>({id:o.id,text:o.text,storyAction:{quest:id,action:o.action},...(o.when?{condition:o.when}:{}),requirement:o.cost?Object.entries(o.cost).map(([k,v])=>`${k==='gold'?'G':k} ${v}消費`).join(' / '):'',commands:s.story.actions[o.action].journey?[{op:'story.journey',quest:id,action:o.action}]:[{op:'story.action',quest:id,action:o.action},{op:'jump',script:sid(o.to.startsWith('@')?'end.'+o.to.slice(1):o.to)}]}))}]};
 for(const c of x.choices)scripts[sid('end.'+c.id)]={commands:[{op:'quest.complete',quest:id,outcome:c.id}]};
 scripts[sid('visit')]={commands:[{op:'if',condition:completed(x.number),then:[{op:'switch',value:ref(`quests.${id}.outcome`),cases:x.choices.map(c=>({equals:c.id,commands:render(c.closing)})),default:[]}],else:[{op:'story.init',quest:id},{op:'switch',value:ref(`stories.${id}.scene`),cases:s.nodes.map(n=>({equals:n.id,commands:[{op:'jump',script:sid(n.id)}]})),default:[{op:'jump',script:sid('entry')}]}]}]};
 return {schemaVersion:1,id,number:x.number,title:x.title,client:names[actor],brief:x.entry,region:11,type:'authored_progression',recommendedLevel:2,
  requiredParty:[member.actor],requires:and(member,...(index?[completed(previous)]:[])),unlockHint:`${names[actor]}を編成${index?`し、q${previous}を完了`:''}。開始地点：${placeName(x.base)}`,
  events:[],locations:[],outcomes:Object.fromEntries(x.choices.map((c,i)=>[c.id,{label:c.label,text:c.closing,gold:c.gold??10,xp:5,gems:0}])),story:s.story,scripts,
  model:{standard:{id:'game-scenario-model',version:'1.2b',source:'https://github.com/TomTomYoung/GAMEBOOK/blob/main/doc/SCENARIO_MODEL_V1_2B.md',adapter:'adv-story-state/1',revision:'2026-10-25',scope:'quest-episode'},entryScript:sid('visit'),companion:actor==='mika'?'mica':actor,
   world:{truth:x.truth??x.clue,history:[{id:'local_background',text:x.entry}],initialState:'出発地点に探索隊と同行者。現場の情報は未観察、解決はpending。'},
   agents:[{id:actor,name:names[actor],goal:goals[actor],initialLocation:'base',response:x.choices.map(c=>c.closing)},{id:'local',name:localAgents[actor][index][0],goal:localAgents[actor][index][1],response:x.choices.map(c=>({action:c.id,observableResponse:c.result}))},...(x.agents??[])],
   situation:{request:x.entry,obstacle:x.clue},mechanism:{evidence:'現場への到着時にfindingを観察し、本文で提示する。',resolution:x.choices.map(c=>({id:c.id,execution:c.action,confirmation:c.result,cost:c.cost??{},requires:c.when??true}))},
   narrative:{units:s.nodes.map(n=>({id:n.id,script:sid(n.id)}))},graph:s.nodes.map(n=>({id:n.id,text:n.text,options:n.options.map(o=>({id:o.id,text:o.text,to:o.to,action:o.action}))})),
   reveal:{newInformation:x.clue,retroactiveTargets:['entry'],window:'現場への到着と観察後。記憶や伝聞は証明と区別する。'},audience:{initialHypothesis:x.entry,experienceIntent:x.focus??x.title},
   choiceContract:{resources:'現場の行為を実行してから帰還する。費用はaction.costで一回だけ消費。',residue:'各outcomeを保存し、後続依頼の協力条件として参照する。',interruption:'場所を離れても完了した観察・選択は巻き戻さない。移動後は到着地点で再開する。'},
   authoring:{revision:2,scenarioSource:'doc/scenarios/SCENARIO_MODEL_V12B.md',proseSource:'doc/scenarios/PROSE_MODEL_V1.md',scope:'仲間連作。オッドランド侵攻・大水門開放・古代鍵取得・アダ離脱・夫の加入を含めない。',counterfactual:x.counterfactual??'現場で提示した各方法を実行可能にする。未選択の方法を実行済みにはしない。',review:x.review??null}}
 };
}
