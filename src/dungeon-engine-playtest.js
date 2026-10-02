import {loadContent} from './core/loader.js';
import {GameEngine} from './core/engine.js';
import {generateDungeonCandidate} from './core/dungeon-generator.js';
import {projectGame} from './application/projection.js';
import {installGeneratedDungeon,prepareGeneratedPlaytestEngine,validateGeneratedPlaytestData} from './application/generated-dungeon-engine.js';
import {SceneView} from './view/scene-view.js';
import {handleGameKey} from './view/keyboard.js';
import {applyTheme,THEME_DEFAULT} from './view/theme.js';

const $=id=>document.getElementById(id);
const root=$('app'),status=$('generator-status');
applyTheme(THEME_DEFAULT);
const baseData=await loadContent();
let data,engine,view,candidate,dispatch,currentPayload=null,installed=null;
const ui={
  status:text=>setStatus(text,true),
  menu:()=>setStatus('このページは生成試遊専用です。通常セーブは行いません。'),
  help:()=>setStatus('通常の探索操作です。方向キーで前進・後退・旋回、Enterで調べる/決定。'),
  keyHint:()=> '↑前進 / ↓後退 / ←→旋回 / Enter調べる',
  modalOpen:()=>false,
  cancelFeedback(){},
  effectsMode:()=> 'off',
  soundEnabled:()=>false,
  soundLabel:()=> '音：切',
  sound:()=>setStatus('試遊ページでは音声を切っています。'),
  layoutChanged(){},
};
function setStatus(text,error=false){status.textContent=text;status.style.color=error?'#ffb3aa':'#e8c783';}
function number(id){return Number($(id).value);}
function fillSelect(id,entries,preferred){
  const select=$(id);select.textContent='';
  for(const [value,label] of entries)select.append(new Option(label,value));
  if([...select.options].some(o=>o.value===preferred))select.value=preferred;
}
const standalone=Object.entries(baseData.cellTypes).filter(([,p])=>!p.parameters?.binding);
fillSelect('baseFloor',standalone.filter(([,p])=>p.passage==='.'&&p.visual?.floor!==false).map(([id,p])=>[id,p.name]),'stone_floor');
fillSelect('baseWall',standalone.filter(([,p])=>p.passage==='#'&&p.visual?.wall===true).map(([id,p])=>[id,p.name]),'stone_wall');
for(const [id,preferred] of [['patch1','shallow_water'],['patch2','ice_floor'],['patch3','poison_swamp'],['patch4','deep_depression_water']]){
  fillSelect(id,standalone.map(([value,p])=>[value,`${p.name} [${p.passage}]`]),preferred);
}
fillSelect('sourceDungeon',Object.values(baseData.dungeons).filter(d=>d.art?.wall&&d.art?.floor).map(d=>[d.id,d.name]),'kagaribi');

function generationLayout(){
  const mode=$('mode').value;
  return {
    mode,width:39,height:31,corridorWidth:1,extraLoops:{min:1,max:2},
    corridors:{algorithm:$('corridor').value,branchCount:{min:6,max:9},curvature:.8,sampleDensity:6,turnPenalty:.1},
    terrain:{algorithm:$('terrain').value,options:{noise:{warp:1.1,octaves:5,scale:.16,threshold:-.08,centerBias:.45},cellular:{fill:.47,steps:5},randomWalk:{fill:.44},bsp:{depth:4,minLeaf:6},voronoi:{fill:.58,sites:12}}},
    bulges:{
      count:mode==='bulges'?{min:4,max:7}:{min:0,max:0},positions:['along_corridor','dead_end'],
      shapes:[{id:'side_alcove',weight:2},{id:'end_pocket',weight:1}],addedArea:{min:3,max:14},minSpacing:2,promoteToRoomArea:11,
      featureAlgorithm:'boolean',shapeOptions:{asymmetry:{enabled:true,strength:.55},dropout:{enabled:true,rate:.04},booleanOps:{enabled:true,count:2}},
    },
    rooms:{
      count:mode==='rooms'?{min:5,max:7}:{min:0,max:0},width:{min:5,max:11},height:{min:5,max:11},minArea:8,wallThickness:1,mirror:true,entrances:{min:1,max:3},
      shapes:[{id:'rectangle',weight:2},{id:'l_shape',weight:2},{id:'t_shape',weight:1},{id:'chamfered',weight:1},{id:'roundish',weight:1}],
      featureAlgorithm:'boolean',shapeOptions:{asymmetry:{enabled:true,strength:.5},dropout:{enabled:true,rate:.035},booleanOps:{enabled:true,count:2}},
    },
  };
}
function cellSpec(){
  const presets=[1,2,3,4].map(i=>({preset:$('patch'+i).value,density:number('density'+i)})).filter(v=>v.density>0);
  return {
    baseFloor:$('baseFloor').value,
    baseWall:$('baseWall').value,
    patches:presets.map((p,index)=>({
      ...p,
      areas:index===1?['corridor']:index===2?['room','dead_end']:index===3?['room']:['any_floor'],
      cluster:{min:1,max:index===0?7:4},
      minDistanceFromEntry:3,
      preserveCriticalRoute:true,
    })),
  };
}
function render(){
  const model=projectGame(engine);
  view.render(model);
  window.generatedPlaytest={data,engine,view,candidate,model,dispatch,regenerate,render,payload:currentPayload};
}
function clearStartup(engine){
  engine.state.vm=[];
  engine.state.waiting=null;
  engine.state.battle=null;
  engine.state.battleResult=null;
  engine.state.notice='';
  delete engine.state.presentation.message;
  delete engine.state.presentation.cast;
  delete engine.state.presentation.castCue;
}
async function regenerate(externalPayload=null){
  try{
    setStatus('生成・エンジンロード中…');
    data=structuredClone(baseData);
    currentPayload=externalPayload??{
      seed:number('seed'),
      candidateIndex:number('candidate'),
      layout:generationLayout(),
      cells:cellSpec(),
      sourceDungeonId:$('sourceDungeon').value,
      encounters:$('encounters').checked,
      party:baseData.game.initial.members.map(id=>({id,level:1})),
      encounter:{enabled:$('encounters').checked,rate:.22,enemies:[]},
    };
    candidate=generateDungeonCandidate({
      seed:currentPayload.seed,
      candidateIndex:currentPayload.candidateIndex,
      layout:currentPayload.layout,
      cells:currentPayload.cells,
      cellTypes:data.cellTypes,
    });
    installed=installGeneratedDungeon(data,candidate,{
      sourceDungeonId:currentPayload.sourceDungeonId??'kagaribi',
      encounters:Boolean(currentPayload.encounters),
      encounter:currentPayload.encounter??null,
    });
    const errors=validateGeneratedPlaytestData(data);
    if(errors.length)throw new Error('動的データ検証: '+errors.slice(0,4).join(' / '));
    view?.destroy();
    engine=new GameEngine(data,currentPayload.seed);
    clearStartup(engine);
    prepareGeneratedPlaytestEngine(engine,installed,{party:currentPayload.party??null});
    dispatch=intent=>{
      const changed=engine.dispatch(intent);
      if(changed||engine.state.notice||engine.feedback.events.length)render();
      return changed;
    };
    view=new SceneView(root,dispatch,ui);
    render();
    setStatus(`GameEngineロード済み / ${candidate.generatorVersion} / 床${candidate.metrics.walkableCount??candidate.metrics.floorCount} / セル種${Object.keys(candidate.cellSummary??{}).length}`);
    if(window.parent!==window)window.parent.postMessage({type:'adv:dungeon-generation:loaded',candidateIndex:currentPayload.candidateIndex},location.origin);
  }catch(error){
    console.error(error);setStatus(error.message,true);
    if(window.parent!==window)window.parent.postMessage({type:'adv:dungeon-generation:error',message:error.message},location.origin);
  }
}
$('regenerate').addEventListener('click',()=>regenerate());
$('next').addEventListener('click',()=>{$('candidate').value=String(number('candidate')+1);regenerate();});
window.addEventListener('message',event=>{
  if(event.origin!==location.origin)return;
  if(event.data?.type==='adv:dungeon-generation:load'&&event.data.payload){regenerate(event.data.payload);return;}
  if(event.data?.type==='adv:dungeon-generation:start-battle'){
    try{
      if(!engine||!installed)throw new Error('試遊エンジンが準備できていません');
      if(engine.state.waiting||engine.state.battle)throw new Error('会話・戦闘中は新しい戦闘を開始できません');
      engine.startBattle(installed.encounterId,{win:[],escape:[],lose:[]},{});
      render();
      if(window.parent!==window)window.parent.postMessage({type:'adv:dungeon-generation:battle-started',encounter:installed.encounterId},location.origin);
    }catch(error){
      setStatus(error.message,true);
      if(window.parent!==window)window.parent.postMessage({type:'adv:dungeon-generation:error',message:error.message},location.origin);
    }
  }
});
document.addEventListener('keydown',event=>{
  if(!view||!engine)return;
  if(event.target?.closest('#generator-controls'))return;
  handleGameKey(event,{view,model:view.model,dispatch,modalOpen:false});
});
await regenerate();
if(window.parent!==window)window.parent.postMessage({type:'adv:dungeon-generation:ready'},location.origin);
