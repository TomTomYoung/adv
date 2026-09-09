import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const write=async(file,value)=>{const dest=path.join(root,file);await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(dest,JSON.stringify(value,null,2)+'\n');};
const rows=(await fs.readFile(path.join(root,'authoring/quests.txt'),'utf8')).split('\n').filter(l=>l&&!l.startsWith('#')).map(l=>l.split('|'));
if(rows.length!==100||rows.some(r=>r.length!==12))throw Error('Exactly 100 authored 12-column quests are required');
const say=text=>({op:'say',text}), ref=value=>({ref:value}), eq=(left,right)=>({op:'eq',left,right}),gte=(left,right)=>({op:'gte',left,right}),and=(...args)=>({op:'and',args});
const active=id=>eq(ref(`quests.${id}.stage`),'active');
const scripts={};
const script=(id,commands)=>{if(scripts[id])throw Error(`duplicate ${id}`);scripts[id]={commands};return id;};
const regions=[
 ['灯守の地下水道','灯が消えた町の足元。水音と、まだ帰らない人の声。','slime','#72b2ac'],
 ['塩哭きの廃坑','白い坑道に残るのは、富より重い仕事の記録。','skeleton','#bdaca0'],
 ['根喰みの地下庭園','陽の届かない庭で、育てるものと刈るものを選ぶ。','slime','#8ab977'],
 ['鏡沈みの礼拝堂','祈りと仕掛け。そのどちらにも、人の願いがある。','wraith','#b6a4d7'],
 ['灰時計の書庫','閉じられた本の先にも、誰かの暮らしが続いている。','wraith','#c6ae77'],
 ['眠れる地下市場','名、夢、釣銭。取引に載らない値打ちを探す。','construct','#cd9567'],
 ['黒潮の沈没城','水の下に沈んだのは、城だけではなかった。','dragon','#75adc9'],
 ['鉄胎の機関廟','古い命令と新しい暮らしのあいだで、歯車が軋む。','construct','#9aaeb5'],
 ['星欠けの地下観測所','天井の星を読み、その向こうにある空を考える。','wraith','#8f9ee0'],
 ['帰還者の深淵','歩いてきた道を、次の隊へ渡すための最後の潜行。','dragon','#d2b066']
].map(([name,description,enemy,color],i)=>({id:i+1,name,description,enemy,color,entrance:`region_${i+1}_f1`,recommendedLevel:i+1}));
const actors={
 ada:{id:'ada',name:'アダ',class:'剣士',role:'前衛・安定した斬撃',stats:{hp:56,mp:10,str:15,vit:7,agi:8,int:4},skills:['attack','power','guard'],color:'#ce9f70'},
 nio:{id:'nio',name:'ニオ',class:'斥候',role:'先手・罠の観察',stats:{hp:40,mp:14,str:12,vit:5,agi:15,int:7},skills:['attack','venom','guard'],color:'#86b998'},
 sera:{id:'sera',name:'セラ',class:'祈祷師',role:'治療・解毒',stats:{hp:42,mp:24,str:9,vit:5,agi:7,int:13},skills:['attack','heal','cleanse','guard'],color:'#c8b8dc'},
 il:{id:'il',name:'イル',class:'魔術師',role:'炎術・守りを貫く',stats:{hp:35,mp:26,str:8,vit:4,agi:10,int:16},skills:['attack','fire','guard'],color:'#88aaca'},
 berg:{id:'berg',name:'ベルグ',class:'守衛',role:'五人目・粘り強い前衛',stats:{hp:68,mp:8,str:14,vit:10,agi:4,int:4},skills:['attack','power','guard'],color:'#b3b0a3'}
};
const formula=(op,...args)=>({op,args});
const formulas={
 physical:formula('max',1,formula('sub',ref('source.stats.str'),formula('floor',formula('div',ref('target.stats.vit'),2)))),
 heavy:formula('max',2,formula('sub',formula('mul',ref('source.stats.str'),1.7),ref('target.stats.vit'))),
 fire:formula('max',3,formula('sub',formula('add',formula('mul',ref('source.stats.int'),1.6),4),formula('floor',formula('div',ref('target.stats.vit'),3)))),
 heal:formula('add',16,formula('mul',ref('source.stats.int'),1.3))
};
const skills={
 attack:{name:'攻撃',mp:0,target:'enemy',description:'武器で敵1体を攻撃します。',effects:[{type:'damage',formula:'physical',element:'physical'}]},
 power:{name:'強打',mp:3,target:'enemy',description:'MP3。敵1体に重い一撃。',effects:[{type:'damage',formula:'heavy',element:'physical'}]},
 fire:{name:'灯火の術',mp:4,target:'enemy',description:'MP4。敵1体へ魔力で攻撃。',effects:[{type:'damage',formula:'fire',element:'fire'}]},
 heal:{name:'手当の祈り',mp:4,target:'ally',description:'MP4。生存する味方1人を回復。',effects:[{type:'heal',formula:'heal'}]},
 guard:{name:'防御',mp:0,target:'self',description:'次の敵行動終了まで受けるダメージを半減。',effects:[{type:'guard'}]},
 venom:{name:'毒の刃',mp:3,target:'enemy',description:'MP3。攻撃と毒の付与。',effects:[{type:'damage',formula:'physical',element:'physical'},{type:'status',status:'poison',chance:0.8}]},
 poison_bite:{name:'毒牙',mp:0,target:'enemy',description:'毒を持つ噛みつき。',effects:[{type:'damage',formula:'physical',element:'physical'},{type:'status',status:'poison',chance:0.25}]},
 cleanse:{name:'解毒',mp:2,target:'ally',description:'MP2。味方1人の毒を取り除きます。',effects:[{type:'cleanse'}]},
 potion:{name:'傷薬',mp:0,target:'ally',effects:[{type:'heal',amount:45}]},
 antidote:{name:'解毒薬',mp:0,target:'ally',effects:[{type:'cleanse'}]}
};
const items={
 potion:{id:'potion',name:'傷薬',description:'味方1人のHPを45回復。倒れた仲間にも野営中は使用できます。',type:'consumable',field:true,script:'item.potion',battleSkill:'potion'},
 antidote:{id:'antidote',name:'解毒薬',description:'味方1人の毒を取り除きます。',type:'consumable',field:true,script:'item.antidote',battleSkill:'antidote'},
 ration:{id:'ration',name:'野営糧食',description:'探索中も使用可能。隊全員のHPを25、MPを8回復。',type:'consumable',field:true,script:'item.ration'},
 torch:{id:'torch',name:'予備灯油',description:'灯の残量を満たし、周囲の地図を少し広く記録します。',type:'consumable',field:true,script:'item.torch'},
 rope:{id:'rope',name:'補修用の縄',description:'一部の依頼で確実な救助・修理を行うために消費します。',type:'material'},
 iron_sword:{id:'iron_sword',name:'鉄の剣',description:'攻撃力+5。誰でも装備可能。',type:'equipment',slot:'weapon',stats:{str:5}},
 mail:{id:'mail',name:'鎖帷子',description:'防御力+4。誰でも装備可能。',type:'equipment',slot:'armor',stats:{vit:4}},
 focus:{id:'focus',name:'青石の護符',description:'知力+5。誰でも装備可能。',type:'equipment',slot:'charm',stats:{int:5}}
};
for(let r=1;r<=10;r++)items[`key_${r}`]={id:`key_${r}`,name:`${regions[r-1].name}の鍵`,description:'この地域の封鎖扉を開けます。消費しません。',type:'key'};
script('prologue',[say('灯を持って、帰ってくる。\n\n迷宮の口に築かれた町、灯帰り。ここでは剣の腕と同じほど、道を記し、話を聞き、仲間を連れて帰る力が買われます。'),say('ギルドの机に百の依頼が積まれています。\n\nまずは「帰らない灯番」を受注し、地下水道へ。記号のある足元、または正面を調べてください。手掛かりは冒険手帳に残ります。')]);
script('service.inn',[{op:'rest',cost:24},say('灯を整え、町で一晩を過ごしました。手当の結果は隊の状態で確認できます。')]);
script('service.clinic',[{op:'rest',cost:0,ratio:0.35},say('施療所で応急手当を受けました。HP・MPは最低35%まで戻り、毒は治ります。所持金がなくても再出発できます。')]);
script('service.recruit',[{op:'if',condition:{op:'has_member',actor:'berg'},then:[say('ベルグはすでにあなたの隊にいます。')],else:[say('守衛ベルグが机の上の地図を見ています。「五人目が必要なら、次の帰り道を一緒に覚えよう」'),{op:'choice',options:[{id:'join',text:'ベルグを隊へ迎える',commands:[{op:'party.join',actor:'berg'},say('ベルグが隊へ加わりました。')]},{id:'later',text:'今の隊で進む',commands:[]}]}]}]);
script('item.potion',[{op:'actor.heal',target:ref('local.args.target'),amount:45}]);
script('item.antidote',[{op:'status.remove',target:ref('local.args.target'),status:'poison'}]);
script('item.ration',[{op:'actor.heal',target:'party',amount:25},{op:'actor.restore_mp',target:'party',amount:8},say('小さな灯を囲み、糧食を分けました。HP25・MP8回復。')]);
script('item.torch',[{op:'call',script:'common.refill_light'},{op:'map.reveal',radius:3},say('灯油を足しました。灯の届く範囲を地図へ書き込みます。')]);
// A dedicated light command does not alter HP, MP, or statuses.
script('common.refill_light',[{op:'light.refill'}]);
const enemies={},encounters={};
for(const region of regions){
  const r=region.id;
  for(const boss of [false,true]){
    const id=`guard_${r}${boss?'_elite':''}`,hp=(22+r*9)*(boss?2.4:1);
    enemies[id]={id,name:`${region.name}の${boss?'守護者':'迷宮獣'}`,sprite:region.enemy,stats:{hp:Math.round(hp),mp:boss?20:8,str:8+r*2+(boss?3:0),vit:3+r,agi:5+r,int:6+r*2},resist:{fire:region.enemy==='slime'?1.3:1,physical:region.enemy==='construct'?0.85:1},rewards:{gold:5+r*2,xp:8+r*3},ai:[...(boss?[{priority:30,condition:{op:'lt',left:ref('self.hp_ratio'),right:0.3},skill:'heal',target:'self'}]:[]),{priority:20,condition:eq(ref('self.hp_ratio'),1),skill:r%3===0?'poison_bite':'attack',target:'weakest'},{priority:10,skill:r%2===0?'power':'attack',target:'random'},{priority:0,skill:'attack',target:'random'}]};
  }
  encounters[`roaming_${r}`]={id:`roaming_${r}`,text:'石床を引っ掻く音。通路を巡る迷宮獣が、灯の中へ入ってきました。',escape:true,enemies:[`guard_${r}`]};
  encounters[`guard_${r}`]={id:`guard_${r}`,text:'奥の足場を迷宮の守護者が塞ぎます。道を通すには、戦い抜くか退くかを選ぶ必要があります。',escape:true,enemies:[`guard_${r}`,`guard_${r}`]};
  encounters[`boss_${r}`]={id:`boss_${r}`,text:'古い命令に縛られた守護者が立ち上がりました。隊の灯を消さず、この場を越えてください。',escape:false,enemies:[`guard_${r}_elite`, `guard_${r}`]};
}
function maze(seed){
  const width=19,height=15,grid=Array.from({length:height},()=>Array(width).fill('#'));
  let state=seed;const rand=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
  const stack=[[1,1]];grid[1][1]='.';
  while(stack.length){const [x,y]=stack.at(-1),options=[[2,0],[-2,0],[0,2],[0,-2]].filter(([dx,dy])=>x+dx>0&&x+dx<width-1&&y+dy>0&&y+dy<height-1&&grid[y+dy][x+dx]==='#');if(!options.length){stack.pop();continue;}const [dx,dy]=options[Math.floor(rand()*options.length)];grid[y+dy/2][x+dx/2]='.';grid[y+dy][x+dx]='.';stack.push([x+dx,y+dy]);}
  for(let n=0;n<14;n++){const x=1+Math.floor(rand()*(width-2)),y=1+Math.floor(rand()*(height-2));if(grid[y][x]==='#'&&((grid[y][x-1]==='.'&&grid[y][x+1]==='.')||(grid[y-1][x]==='.'&&grid[y+1][x]==='.')))grid[y][x]='.';}
  return grid.map(row=>row.join(''));
}
const maps={},questFiles=[];
for(const region of regions){for(let floor=1;floor<=2;floor++){
  const id=`region_${region.id}_f${floor}`,tiles=maze(7919*region.id+floor*113),cells=[];
  for(let y=1;y<tiles.length-1;y++)for(let x=1;x<tiles[0].length-1;x++)if(tiles[y][x]==='.'&&(x!==1||y!==1))cells.push({x,y});
  cells.sort((a,b)=>(a.x+a.y)-(b.x+b.y)||a.x-b.x);
  maps[id]={id,region:region.id,floor,name:`${region.name}・地下${floor}層`,tiles,entrance:{x:1,y:1,facing:'east'},background:'corridor',music:'exploration',encounter:`roaming_${region.id}`,encounterRate:0.18,objects:[],_cells:cells};
}}
const take=(map,ratio=0.5)=>map._cells.splice(Math.min(map._cells.length-1,Math.floor(map._cells.length*ratio)),1)[0];
for(const region of regions){const r=region.id,first=maps[`region_${r}_f1`],second=maps[`region_${r}_f2`],stairs=take(first,0.9);
  first.objects.push({id:'exit',x:1,y:1,name:'地上への階段',kind:'exit',trigger:'interact',safe:true,script:script(`${first.id}.exit`,[say('灯帰りの町へ戻りました。'),{op:'town.return'}])});
  first.objects.push({id:'stairs',...stairs,name:'地下二層への階段',kind:'stairs',trigger:'interact',safe:true,script:script(`${first.id}.stairs`,[{op:'map.teleport',map:second.id,x:1,y:1,facing:'east'}])});
  second.objects.push({id:'stairs',x:1,y:1,name:'地下一層への階段',kind:'stairs',trigger:'interact',safe:true,script:script(`${second.id}.stairs`,[{op:'map.teleport',map:first.id,...stairs,facing:'west'}])});
  for(const map of [first,second]){
    const chest=take(map,0.03),fountain=take(map,0.48),trap=take(map,0.3);
    const leafIndex=map._cells.findLastIndex(({x,y})=>[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>map.tiles[y+dy]?.[x+dx]==='.').length===1&&[...map.objects,chest,fountain,trap].every(p=>Math.abs(p.x-x)+Math.abs(p.y-y)>1));
    const door=map._cells.splice(leafIndex>=0?leafIndex:map._cells.length-1,1)[0];
    // Reserve the square in front of the door so interact never competes with a quest/stair there.
    map._cells=map._cells.filter(p=>Math.abs(p.x-door.x)+Math.abs(p.y-door.y)>1);
    map.objects.push({id:'cache',...chest,name:'補給の箱',kind:'chest',trigger:'interact',once:true,safe:true,script:script(`${map.id}.cache`,[{op:'item.give',item:'potion',count:2},{op:'item.give',item:'ration',count:1},{op:'item.give',item:`key_${r}`,count:1},say('箱には傷薬二つ、糧食一つ、この地域の鍵が残されていました。')])});
    map.objects.push({id:'fountain',...fountain,name:'休息の泉',kind:'fountain',trigger:'interact',once:true,safe:true,script:script(`${map.id}.fountain`,[{op:'party.heal_all'},say('清い泉で傷を洗いました。隊は全回復し、灯も整いました。この泉は今回一度だけ使えます。')])});
    map.objects.push({id:'trap',...trap,name:'崩れた石床',kind:'trap',trigger:'enter',once:true,script:script(`${map.id}.trap`,[say('石床が崩れ、細い棘が靴を掠めました。'),{op:'actor.damage',target:'party',amount:4+r},{op:'status.apply',target:'nio',status:'poison'},say('ニオは毒を受けています。解毒薬かセラの術、町の施療所で治せます。')])});
    // A locked cache, rather than a mandatory chokepoint, keeps every quest reachable before obtaining the key.
    map.objects.push({id:'door',...door,name:'封鎖された小部屋',kind:'door',trigger:'interact',blocking:true,initialState:'locked',safe:true,script:script(`${map.id}.door`,[{op:'if',condition:{op:'has_item',item:`key_${r}`},then:[{op:'object.state.set',map:map.id,object:'door',state:'open'},{op:'gold.change',amount:40+r*5},say('鍵を回し、封鎖を解きました。部屋に残された硬貨を回収します。')],else:[say('錠が掛かっています。補給箱に、この地域の鍵がありそうです。')]}])});
    // Event gates use nested flags, while object state remains an opaque map/object key for persistence.
    const doorObj=map.objects.at(-1);doorObj.condition={op:'not',arg:eq(ref(`flags.${map.id}_door_open`),true)};
    scripts[`${map.id}.door`].commands[0].then.unshift({op:'flag.set',key:`${map.id}_door_open`,value:true});
  }
}
const types=['investigation','rescue','mechanism','negotiation','resource','escort','testimony','ritual','survey','finale'];
const operators=['causeSwap','evidenceRecode','ruleReveal','referenceSwap','frameShift','pathHide','identitySplit','valueInvert','observerSwap','frameShift'];
for(let i=0;i<rows.length;i++){
  const n=i+1,id=`q${String(n).padStart(3,'0')}`,r=Math.floor(i/10)+1,index=i%10,floor=index<5?1:2,map=maps[`region_${r}_f${floor}`],type=types[index];
  const [title,client,brief,truth,clueA,clueB,actionA,outA,actionB,outB,actionC,outC]=rows[i];
  const own={},put=(suffix,commands)=>{const sid=`${id}.${suffix}`;own[sid]={commands};return sid;};
  const reward=45+r*12;
  const outcomes={informed:{label:'事情を踏まえた決着',text:outA,gold:reward,xp:60+r*8},contract:{label:'依頼を優先した決着',text:outB,gold:reward+20,xp:40+r*7},compromise:{label:'別の道による決着',text:outC,gold:Math.floor(reward*0.65),xp:45+r*6}};
  const finish=outcome=>[
    {op:'add',target:`vars.${outcome}`,value:1},say(outcomes[outcome].text),{op:'quest.complete',quest:id,outcome},
    ...(n===100?[{op:'ending.set',title:outcome==='informed'?'道を次へ渡す者':outcome==='contract'?'迷宮の鍵を持つ者':'灯を守って帰る者',text:outcomes[outcome].text},say('百の依頼が、百の帰還の記録になりました。\n\n終幕のあとも町と迷宮へ戻れます。冒険手帳には、あなたが選んだ結末が残っています。')]:[])
  ];
  const fight=(outcome,boss=false)=>({op:'battle.start',encounter:`${boss?'boss':'guard'}_${r}`,on_win:finish(outcome),on_lose:[],on_escape:[say('退路は開いています。準備を整えて、この場所で再び判断できます。')]});
  const clueCondition=and({op:'contains',left:ref(`quests.${id}.evidence`),right:'clue_a'},{op:'contains',left:ref(`quests.${id}.evidence`),right:'clue_b'});
  const useRope=index===1||index===5;
  const informedCommands=[say(truth),...(useRope?[{op:'item.take',item:'rope',count:1}]:[]),...(index===1||index===5||index===9?[fight('informed',index===9)]:finish('informed'))];
  const choices=[{id:'informed',text:actionA,condition:useRope?and(clueCondition,{op:'has_item',item:'rope'}):clueCondition,requirement:`手掛かり2つ${useRope?'・補修用の縄1本（消費）':''}${[1,5,9].includes(index)?'・戦闘あり':''}`,commands:informedCommands},{id:'contract',text:actionB,requirement:`戦闘あり${index===9?'・逃走不可':''}`,commands:[fight('contract',index===9)]},{id:'compromise',text:actionC,requirement:'戦闘を伴わない決着',commands:finish('compromise')},{id:'leave',text:'まだ決めず、調査を続ける',commands:[]}];
  // Alternate presentation order and testimony framing across quest types, retaining separate evidence nodes.
  const locations=[];
  for(const [j,key,text] of [[0,'clue_a',clueA],[1,'clue_b',clueB]]){
    const point=take(map,j===0?0.12:0.45),sid=put(key,[{op:j===0?'narrate':'say',...(j===1?{name:client}:{}),text},{op:'quest.evidence',quest:id,key,text}]);
    const object=`${id}_${key}`;
    map.objects.push({id:object,...point,name:`${title}：${j===0?'現場の痕跡':'記録と証言'}`,kind:'clue',quest:id,trigger:'interact',safe:true,condition:and(active(id),{op:'not',arg:{op:'contains',left:ref(`quests.${id}.evidence`),right:key}}),script:sid});
    locations.push({map:map.id,object,...point,role:key});
  }
  const point=take(map,0.72),object=`${id}_decision`,sid=put('decision',[say(`${title}\n\n${brief}\n\nこの場所で、依頼の行方を決められます。`),{op:'choice',options:index%2?choices:[choices[1],choices[0],choices[2],choices[3]]}]);
  map.objects.push({id:object,...point,name:`${title}：決着の場`,kind:'decision',quest:id,trigger:'interact',safe:true,condition:active(id),script:sid});locations.push({map:map.id,object,...point,role:'decision'});
  const quest={schemaVersion:1,id,number:n,title,client,brief,region:r,type,recommendedLevel:r,requires:n===100?gte(ref('vars.completed'),99):index===9?gte(ref(`vars.region_${r}`),3):null,unlockHint:n===100?'他の99件を完了すると受注できます。':index===9?'この地域の依頼を3件完了すると受注できます。':'いつでも受注できます。',locations,outcomes,
    model:{source:'https://app.notion.com/p/20260908-3d5c3c1966b3814c8e26ef30c00862e4',world:{truth,history:[{id:'e0',event:truth,causes:[]},{id:'e1',event:brief,causes:['e0']},{id:'e2',event:'冒険者が現場と記録を観察し、依頼の扱いを決める',causes:['e1']}]},agents:[{id:'client',name:client,observation:brief,belief:brief,goal:actionB},{id:'party',name:'冒険者の隊',observation:'探索開始時点では依頼文だけを知る',goal:'生存して帰還し、得た情報に基づいて決着を選ぶ',resources:['hp','mp','rope','gold']}],conflict:{request:actionB,alternative:actionA,cost:useRope?'補修用の縄と戦闘リスク':'依頼の即時達成と、事情を確かめる手間・利害の調整'},narrative:{viewpoint:'冒険者の限定視点',units:[{id:'brief',sourceEvent:'e1'},{id:'clue_a',sourceEvent:'e0',text:clueA},{id:'clue_b',sourceEvent:'e0',text:clueB},{id:'decision',sourceEvent:'e2'}]},audience:{initialHypothesis:brief,openQuestion:`${title}の問題は何から生じ、誰が費用を負うか`},reveal:{operator:operators[index],newInformation:truth,retroactiveTargets:['clue_a','clue_b'],gate:clueCondition},beats:[{id:'observation',changes:['knowledge'],script:`${id}.clue_a`},{id:'reinterpretation',changes:['belief'],script:`${id}.clue_b`},{id:'resolution',changes:['world','relationship'],script:`${id}.decision`}]},scripts:own};
  const file=`data/quests/${id}.json`;await write(file,quest);questFiles.push(file);
}
for(const map of Object.values(maps)){delete map._cells;await write(`data/maps/${map.id}.json`,map);}
await write('data/actors.json',actors);await write('data/formulas.json',formulas);await write('data/skills.json',skills);await write('data/items.json',items);await write('data/regions.json',regions);await write('data/enemies.json',enemies);await write('data/encounters.json',encounters);
await write('data/statuses.json',{poison:{name:'毒',stepDamage:1,turnDamage:3}});
await write('data/system.json',{maxParty:5,maxStack:99,maxLevel:30,xpBase:40,lightCapacity:90,encounterCheckSteps:7,darkEncounterBonus:0.15,guardRate:0.5,escapeRate:0.78,retreatGoldRate:0.08,defeatGoldRate:0.15,recoveryRatio:0.35,scriptBudget:1000,maxSaveBytes:2000000,growth:{hp:7,mp:2,str:2,vit:1,agi:0,int:2}});
await write('data/shops.json',{name:'旅支度の店',goods:[{item:'potion',price:14},{item:'antidote',price:8},{item:'ration',price:20},{item:'torch',price:6},{item:'rope',price:12},{item:'iron_sword',price:95},{item:'mail',price:85},{item:'focus',price:95}]});
await write('data/assets.json',{images:{corridor:'assets/images/dungeon-corridor.png',slime:'assets/images/slime.png',skeleton:'assets/images/skeleton.png',wraith:'assets/images/wraith.png',construct:'assets/images/construct.png',dragon:'assets/images/dragon.png'},audio:{exploration:'assets/audio/exploration.ogg',battle:'assets/audio/battle.ogg'}});
await write('data/scripts/common.json',{scripts});
await write('data/game.json',{schemaVersion:1,id:'lantern-archive',version:'1.0.0',title:'灯帰りの迷宮',subtitle:'百の依頼と、帰還の記録',startScript:'prologue',initial:{gold:120,members:['ada','nio','sera','il'],inventory:{potion:5,antidote:3,ration:3,torch:3,rope:3}},services:[{id:'inn',label:'宿屋で全回復',detail:'24G。隊全員のHP・MP・毒を回復。',script:'service.inn'},{id:'clinic',label:'施療所で応急手当',detail:'無料。HP・MPを最低35%に戻し、毒を治療。',script:'service.clinic'},{id:'recruit',label:'守衛ベルグを訪ねる',detail:'五人目の仲間を迎えます。',script:'service.recruit'}],files:{databases:Object.fromEntries(['actors','system','formulas','skills','items','regions','enemies','encounters','statuses','shops','assets'].map(id=>[id,`data/${id}.json`])),maps:Object.keys(maps).map(id=>`data/maps/${id}.json`),quests:questFiles,scripts:['data/scripts/common.json']}});
console.log(`Built ${rows.length} quests / ${Object.keys(maps).length} maps / 300 quest scripts + ${Object.keys(scripts).length} common scripts`);
const {applyEntityExpansion}=await import('./build-entities.mjs');
await applyEntityExpansion();
