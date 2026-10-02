
import {generateDungeonCandidate} from './src/core/dungeon-generator.js';
import {generatedCellAt, generatedCellIdAt} from './src/core/dungeon-cell-painter.js';

const $ = id => document.getElementById(id);
const canvas = $('map');
const ctx = canvas.getContext('2d');
let current;
let player=null;
let labMode='preview';
let engineReady=false;
const engineSync={ready:false,loadedCandidate:null,error:null,battleStarted:false};
const labLayout=$('labLayout');
const engineFrame=$('engineFrame');
let collapsed=new Set();
const [cellSource,actorDefs,enemyDefs,gameDef,systemDef] = await Promise.all([
  fetch('./config/cell-layers.json').then(response=>{if(!response.ok)throw new Error('セル種定義を読み込めません');return response.json();}),
  fetch('./data/actors.json').then(response=>response.json()),
  fetch('./data/enemies.json').then(response=>response.json()),
  fetch('./data/game.json').then(response=>response.json()),
  fetch('./data/system.json').then(response=>response.json()),
]);
const cellTypes = cellSource.presets;
const standaloneEntries = Object.entries(cellTypes).filter(([,preset])=>!preset.parameters?.binding);
const fillSelect=(id,filter,preferred)=>{
  const select=$(id);select.textContent='';
  for(const [value,preset] of standaloneEntries.filter(([,p])=>filter(p))){
    const option=document.createElement('option');option.value=value;option.textContent=`${preset.name} [${value}]`;select.append(option);
  }
  if([...select.options].some(option=>option.value===preferred))select.value=preferred;
};
fillSelect('baseFloor',preset=>preset.passage==='.' && preset.visual?.floor!==false,'stone_floor');
fillSelect('baseWall',preset=>preset.passage==='#' && preset.visual?.wall===true,'stone_wall');
for(const [id,preferred] of [['patchPreset1','shallow_water'],['patchPreset2','ice_floor'],['patchPreset3','poison_swamp'],['patchPreset4','deep_depression_water']]){
  fillSelect(id,()=>true,preferred);
}

const areaNames={any_floor:'床全体',corridor:'通路',room:'部屋',bulge:'こぶ',dead_end:'行き止まり',wall:'壁'};
function updatePatchSummary(index){
  const preset=cellTypes[$('patchPreset'+index)?.value],area=$('patchArea'+index)?.value,density=number('patchDensity'+index),cluster=number('patchCluster'+index);
  const out=$('patchSummary'+index);if(!out||!preset)return;
  out.textContent=`${areaNames[area]??area}へ「${preset.name}」を約${Math.round(density*100)}%、最大${cluster}セルのまとまりで配置`;
}
function buildPartyEditor(){
  const host=$('partyEditor');host.textContent='';
  for(const actor of Object.values(actorDefs)){
    const card=document.createElement('div');card.className='party-card';
    const check=document.createElement('input');check.type='checkbox';check.dataset.partyId=actor.id;check.checked=gameDef.initial.members.includes(actor.id);check.setAttribute('aria-label',actor.name+'を参加させる');
    const name=document.createElement('span');name.className='party-name';name.textContent=`${actor.name} / ${actor.class}`;
    const levelLabel=document.createElement('label');levelLabel.className='party-level';levelLabel.textContent='Lv';
    const level=document.createElement('input');level.type='number';level.min='1';level.max=String(systemDef.maxLevel);level.value='1';level.dataset.partyLevel=actor.id;levelLabel.append(level);
    card.append(check,name,levelLabel);host.append(card);
    check.addEventListener('change',render);level.addEventListener('change',render);
  }
}
function buildEnemyEditor(){
  const entries=Object.values(enemyDefs);
  const preferred=['guard_1','guard_1_elite','kagaribi_soot_rat'];
  for(let i=1;i<=3;i++){
    const select=$('enemyPreset'+i);select.textContent='';
    for(const enemy of entries)select.append(new Option(`${enemy.name} [${enemy.id}]`,enemy.id));
    const wanted=preferred[i-1];if(entries.some(enemy=>enemy.id===wanted))select.value=wanted;
  }
}
buildPartyEditor();buildEnemyEditor();

function number(id){ return Number($(id).value); }
function cellSpecFromForm(){
  const patches=[];
  for(const i of [1,2,3,4]){
    const density=number('patchDensity'+i);
    if(!(density>0))continue;
    patches.push({
      preset:$('patchPreset'+i).value,
      areas:[$('patchArea'+i).value],
      density,
      cluster:{min:1,max:number('patchCluster'+i)},
      minDistanceFromEntry:2,
      preserveCriticalRoute:true,
    });
  }
  return {baseFloor:$('baseFloor').value,baseWall:$('baseWall').value,patches};
}

function partySpecFromForm(){
  const party=[...document.querySelectorAll('[data-party-id]:checked')].map(check=>({
    id:check.dataset.partyId,
    level:Math.max(1,Math.min(systemDef.maxLevel,Number(document.querySelector(`[data-party-level="${check.dataset.partyId}"]`).value)||1)),
  }));
  if(!party.length)throw new Error('味方を1人以上選んでください');
  if(party.length>systemDef.maxParty)throw new Error(`味方は最大${systemDef.maxParty}人です`);
  return party;
}
function encounterSpecFromForm(){
  const enemies=[];
  for(let i=1;i<=3;i++){
    const count=Math.max(0,Math.min(4,number('enemyCount'+i)));
    for(let n=0;n<count;n++)enemies.push($('enemyPreset'+i).value);
  }
  const enabled=$('encounterEnabled').value==='true',rate=number('encounterRate');
  if(enabled&&!enemies.length)throw new Error('遭遇を有効にする場合は魔物を1体以上設定してください');
  if(!Number.isFinite(rate)||rate<0||rate>1)throw new Error('遭遇率は0〜1で指定してください');
  return {enabled,rate,enemies};
}

function layoutFromForm(){
  const mode = $('mode').value;
  const featureAlgorithm=$('featureAlgorithm').value;
  const shapeOptions={
    asymmetry:{enabled:$('asymmetry').checked,strength:number('asymmetryStrength')},
    dropout:{enabled:$('dropout').checked,rate:number('dropoutRate')},
    booleanOps:{enabled:$('booleanOps').checked,count:number('booleanCount')},
    noiseBlend:{enabled:$('noiseBlend').checked,op:'xor',warp:number('noiseWarp'),octaves:4,scale:.22,threshold:-.08},
    noise:{warp:number('noiseWarp'),octaves:4,scale:.22,threshold:-.08},
    cellular:{fill:.48,steps:4},
    randomWalk:{fill:.48},
    voronoi:{fill:.58,sites:8},
  };
  return {
    mode,
    width:number('width'),
    height:number('height'),
    corridorWidth:1,
    extraLoops:{min:1,max:2},
    corridors:{algorithm:$('corridorAlgorithm').value,branchCount:{min:number('corridorBranches'),max:number('corridorBranches')},curvature:number('corridorCurvature'),sampleDensity:6,turnPenalty:.1},
    terrain:{algorithm:$('terrainAlgorithm').value,options:{noise:{warp:number('noiseWarp'),octaves:5,scale:.16,threshold:-.08,centerBias:.45},cellular:{fill:.47,steps:5},randomWalk:{fill:.42},bsp:{depth:4,minLeaf:6},voronoi:{fill:.58,sites:12}}},
    bulges:{
      count:mode==='bulges'?{min:number('bulgeMin'),max:number('bulgeMax')}:{min:0,max:0},
      positions:['along_corridor','dead_end'],
      shapes:[{id:'side_alcove',weight:2},{id:'end_pocket',weight:1}],
      addedArea:{min:number('bulgeAreaMin'),max:number('bulgeAreaMax')},
      minSpacing:3,
      promoteToRoomArea:number('promoteArea'),
      featureAlgorithm,
      shapeOptions,
    },
    rooms:{
      count:mode==='rooms'?{min:number('roomMin'),max:number('roomMax')}:{min:0,max:0},
      shapes:[
        {id:'rectangle',weight:3},
        {id:'l_shape',weight:2},
        {id:'t_shape',weight:1},
        {id:'cross',weight:1},
        {id:'chamfered',weight:2},
        {id:'roundish',weight:1},
      ],
      width:{min:5,max:11},height:{min:5,max:11},minArea:8,wallThickness:1,mirror:true,entrances:{min:1,max:2},featureAlgorithm,shapeOptions,
    },
  };
}

function cellColor(cell,region){
  if(!cell)return '#26343a';
  if(cell.visual?.wall)return '#26343a';
  if(cell.parameters?.bottomless)return '#071018';
  if(cell.parameters?.floor_depth>=1)return '#28485b';
  if(cell.parameters?.water_depth===2)return '#346f8c';
  if(cell.parameters?.water_depth===1)return '#4b92ad';
  if(cell.parameters?.slippery)return '#8ac7d5';
  if(cell.parameters?.fragile)return '#9b7f69';
  if(cell.visual?.surface==='poison')return '#647f3f';
  if(cell.visual?.surface==='earth')return '#8c7353';
  if(cell.visual?.surface==='wood')return '#8b6745';
  if(region==='r')return '#8eb184';
  if(region==='b')return '#c6975a';
  return '#d8d6c8';
}

function draw(candidate){
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cssWidth = Math.max(320, canvas.clientWidth);
  const cssHeight = Math.max(320, Math.round(cssWidth * candidate.height / candidate.width));
  canvas.style.height = `${cssHeight}px`;
  canvas.width = Math.round(cssWidth*dpr);
  canvas.height = Math.round(cssHeight*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.imageSmoothingEnabled = false;
  const cell = Math.min(cssWidth/candidate.width, cssHeight/candidate.height);
  const ox=(cssWidth-cell*candidate.width)/2, oy=(cssHeight-cell*candidate.height)/2;
  ctx.fillStyle='#091015';ctx.fillRect(0,0,cssWidth,cssHeight);
  for(let y=0;y<candidate.height;y++)for(let x=0;x<candidate.width;x++){
    const collapsedHere=collapsed.has(x+','+y);
    if(!collapsedHere){
      const cell=generatedCellAt(candidate,cellTypes,x,y);
      ctx.fillStyle=cellColor(cell,candidate.regions[y][x]);
    }else ctx.fillStyle='#11181c';
    ctx.fillRect(ox+x*cell,oy+y*cell,Math.ceil(cell),Math.ceil(cell));
  }
  const marker=(point,color,label)=>{
    ctx.fillStyle=color;ctx.fillRect(ox+point.x*cell,oy+point.y*cell,Math.ceil(cell),Math.ceil(cell));
    if(cell>=10){ctx.fillStyle='#081016';ctx.font=`bold ${Math.max(9,cell*.58)}px system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,ox+(point.x+.5)*cell,oy+(point.y+.52)*cell)}
  };
  marker(candidate.entry,'#8fd3ff','E');marker(candidate.goal,'#ffcb73','G');
  if(player){
    ctx.beginPath();ctx.arc(ox+(player.x+.5)*cell,oy+(player.y+.5)*cell,Math.max(3,cell*.28),0,Math.PI*2);
    ctx.fillStyle='#ffffff';ctx.fill();ctx.strokeStyle='#081016';ctx.lineWidth=Math.max(1,cell*.08);ctx.stroke();
  }
}

function playtestPayload(){
  return {
    seed:number('seed'),
    candidateIndex:number('candidate'),
    layout:layoutFromForm(),
    cells:cellSpecFromForm(),
    sourceDungeonId:'kagaribi',
    encounters:$('encounterEnabled').value==='true',
    party:partySpecFromForm(),
    encounter:encounterSpecFromForm(),
  };
}
function syncEngine(){
  if(!current||!engineReady||!engineFrame?.contentWindow)return;
  engineSync.error=null;engineSync.loadedCandidate=null;engineSync.battleStarted=false;
  engineFrame.contentWindow.postMessage({type:'adv:dungeon-generation:load',payload:playtestPayload()},location.origin);
}
function setLabMode(mode){
  if(!['preview','play','split'].includes(mode))mode='preview';
  labMode=mode;
  labLayout.className='layout mode-'+mode;
  for(const button of document.querySelectorAll('[data-lab-mode]'))button.setAttribute('aria-pressed',String(button.dataset.labMode===mode));
  try{localStorage.setItem('adv:dungeon-generation:lab-mode',mode);}catch{}
  if(mode!=='preview')syncEngine();
}
for(const button of document.querySelectorAll('[data-lab-mode]'))button.addEventListener('click',()=>setLabMode(button.dataset.labMode));
window.addEventListener('message',event=>{
  if(event.origin!==location.origin||event.source!==engineFrame.contentWindow)return;
  if(event.data?.type==='adv:dungeon-generation:ready'){
    engineReady=true;engineSync.ready=true;syncEngine();return;
  }
  if(event.data?.type==='adv:dungeon-generation:loaded'){
    engineSync.loadedCandidate=event.data.candidateIndex;engineSync.error=null;engineSync.battleStarted=false;return;
  }
  if(event.data?.type==='adv:dungeon-generation:battle-started'){
    engineSync.battleStarted=true;engineSync.error=null;$('battleStatus').textContent='選択した魔物編成で戦闘開始';return;
  }
  if(event.data?.type==='adv:dungeon-generation:error'){
    engineSync.error=event.data.message??'試遊ロード失敗';
  }
});

function render(){
  const status=$('status');
  try{
    for(let i=1;i<=4;i++)updatePatchSummary(i);
    current=generateDungeonCandidate({seed:number('seed'),candidateIndex:number('candidate'),layout:layoutFromForm(),cells:cellSpecFromForm(),cellTypes});
    player={...current.entry};collapsed=new Set();
    draw(current);
    $('floorCount').textContent=current.metrics.floorCount;
    $('routeSteps').textContent=current.metrics.routeSteps;
    $('bulgeCount').textContent=current.metrics.bulgeCount;
    $('roomCount').textContent=current.metrics.roomCount;
    $('json').textContent=JSON.stringify(current,null,2);
    status.classList.remove('error');
    status.textContent=`生成成功 / 接続 ${current.validation.reachable}/${current.validation.floorCount} / 地形 ${current.terrainAlgorithm} / 通路 ${current.corridorAlgorithm} / セル種 ${Object.keys(current.cellSummary??{}).length} / ${current.generatorVersion}`;
    updateWalkStatus('入口から開始');
    window.dungeonGenerationPreview={current,payload:playtestPayload(),syncEngine,setLabMode,engineSync};
    if(labMode!=='preview')syncEngine();
  }catch(error){
    status.classList.add('error');status.textContent=error.message;
  }
}

$('generate').addEventListener('click',render);
$('next').addEventListener('click',()=>{$('candidate').value=String(number('candidate')+1);render()});
$('seedNext').addEventListener('click',()=>{$('seed').value=String(number('seed')+1);$('candidate').value='0';render()});
for(const id of ['terrainAlgorithm','corridorAlgorithm','corridorCurvature','corridorBranches','featureAlgorithm','asymmetry','dropout','booleanOps','noiseBlend','baseFloor','baseWall','patchPreset1','patchDensity1','patchArea1','patchCluster1','patchPreset2','patchDensity2','patchArea2','patchCluster2','patchPreset3','patchDensity3','patchArea3','patchCluster3','patchPreset4','patchDensity4','patchArea4','patchCluster4','encounterEnabled','encounterRate','enemyPreset1','enemyCount1','enemyPreset2','enemyCount2','enemyPreset3','enemyCount3'])$(id).addEventListener('change',render);
$('mode').addEventListener('change',()=>{
  const mode=$('mode').value;
  if(mode==='corridors'){$('width').value='25';$('height').value='21'}
  if(mode==='bulges'){$('width').value='25';$('height').value='21'}
  if(mode==='rooms'){$('width').value='35';$('height').value='29'}
  render();
});

$('startBattle').addEventListener('click',()=>{
  try{
    const encounter=encounterSpecFromForm();if(!encounter.enemies.length)throw new Error('戦闘する魔物を設定してください');
    if(labMode==='preview')setLabMode('split');
    syncEngine();
    const send=()=>engineFrame.contentWindow?.postMessage({type:'adv:dungeon-generation:start-battle'},location.origin);
    if(engineSync.loadedCandidate===number('candidate'))send();
    else{
      const timer=setInterval(()=>{if(engineSync.error){clearInterval(timer);$('battleStatus').textContent=engineSync.error;}else if(engineSync.loadedCandidate===number('candidate')){clearInterval(timer);send();}},50);
      setTimeout(()=>clearInterval(timer),5000);
    }
  }catch(error){$('battleStatus').textContent=error.message;}
});

function liveCell(x,y){
  if(!current||x<0||y<0||x>=current.width||y>=current.height)return null;
  if(collapsed.has(x+','+y))return {id:'collapsed',name:'崩落後の穴',description:'崩れた床。',passage:'#',parameters:{}};
  return generatedCellAt(current,cellTypes,x,y);
}
function updateWalkStatus(prefix=''){
  if(!current||!player)return;
  const cell=liveCell(player.x,player.y);
  const goal=player.x===current.goal.x&&player.y===current.goal.y;
  const eventText=cell?.events?.length?` / イベント ${cell.events.join(', ')}（表示のみ）`:'';
  $('walkStatus').textContent=`${prefix}${prefix?' / ':''}現在 ${player.x},${player.y}${goal?' / 目的地到達':''}${eventText}`;
  $('cellInfo').textContent=cell?`${cell.name} [${cell.id}] / passage=${cell.passage} / ${cell.description??''}`:'';
}
function stepOnce(dx,dy){
  const nx=player.x+dx,ny=player.y+dy;
  const target=liveCell(nx,ny);
  if(!target||target.passage!=='.'){updateWalkStatus(target?`通行不可: ${target.name}`:'範囲外');return false;}
  const previous={...player};
  const previousCell=liveCell(previous.x,previous.y);
  player={x:nx,y:ny};
  if(previousCell?.parameters?.fragile)collapsed.add(previous.x+','+previous.y);
  return true;
}
function movePlayer(dx,dy){
  if(!current||!player)return;
  if(!stepOnce(dx,dy)){draw(current);return;}
  let guard=50;
  while(guard-->0){
    const here=liveCell(player.x,player.y);
    if(!here?.parameters?.slippery)break;
    if(!stepOnce(dx,dy))break;
  }
  updateWalkStatus();
  draw(current);
}
for(const button of document.querySelectorAll('[data-move]'))button.addEventListener('click',()=>{
  const [dx,dy]=button.dataset.move.split(',').map(Number);movePlayer(dx,dy);
});
$('resetWalk').addEventListener('click',()=>{if(current){player={...current.entry};collapsed=new Set();updateWalkStatus('入口へ戻りました');draw(current);}});
window.addEventListener('keydown',event=>{
  if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;
  const map={ArrowUp:[0,-1],w:[0,-1],W:[0,-1],ArrowDown:[0,1],s:[0,1],S:[0,1],ArrowLeft:[-1,0],a:[-1,0],A:[-1,0],ArrowRight:[1,0],d:[1,0],D:[1,0]};
  const delta=map[event.key];if(!delta)return;event.preventDefault();movePlayer(delta[0],delta[1]);
});

window.addEventListener('resize',()=>current&&draw(current));
try{setLabMode(localStorage.getItem('adv:dungeon-generation:lab-mode')??'preview');}catch{setLabMode('preview');}
render();
