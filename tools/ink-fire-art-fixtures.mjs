import assert from 'node:assert/strict';
import {GameEngine} from '../src/core/engine.js';
import {projectGame} from '../src/application/projection.js';
import {data,ready,start,choose,checkpoint,go,drain} from '../tests/library-helpers.mjs';

const accepted=data.previousQuestRoutes.q043;
const acceptedData={...data,quests:{...data.quests,q043:accepted},scripts:{...data.scripts,...accepted.scripts}};
export const q043Routes=[
 {path:['seal'],outcome:'contract'},
 {path:['valve','stop','restore','carry','finish'],outcome:'informed'},
 {path:['valve','stop','blanks','finish'],outcome:'compromise'},
 {path:['valve','stop','close'],outcome:'contract'},
 {path:['copy','blanks','finish'],outcome:'compromise'},
 {path:['copy','close'],outcome:'contract'}
];
export const q043AcceptedRoutes=[
 {path:['seal'],outcome:'contract'},
 {path:['valve','restore'],outcome:'informed'},
 {path:['valve','blanks'],outcome:'compromise'},
 {path:['valve','close'],outcome:'contract'},
 {path:['copy','blanks'],outcome:'compromise'},
 {path:['copy','close'],outcome:'contract'}
];
export const q043PreservedText='薬剤を止めると光が消えた。別室の控えはまだ読める。';
export const q043LostText='写している間に別室へも薬が回り、控えの追記が消えた。今弁を止めても、その文字は戻らない。';
export const q043Truth=data.quests.q043.model.reveal.newInformation;
export function loadQ043(raw){
 const g=new GameEngine(data);g.random=()=>.999999;g.load(raw);const expected=JSON.parse(raw);
 if(!expected.state.stories.q043)(expected.state.flags.legacyStoryRoutes??={}).q043=true;
 assert.deepEqual(JSON.parse(g.save()),expected);checkpoint(g);return g;
}
export function q043Engine(){const g=ready();start(g,'q043');return g;}
export function q043AcceptedEngine(){
 const g=new GameEngine(acceptedData);g.load(ready().save());g.random=()=>.999999;
 go(g,{kind:'town',location:'salome_board'});assert.ok(g.accept('q043'));
 const p=accepted.locations.find(p=>p.role==='decision')??accepted.locations[0];
 go(g,{kind:'dungeon',dungeon:'region_5',map:p.map,x:p.x,y:p.y});g.run(accepted.model.entryScript??'q043.visit');drain(g);return g;
}
export const chooseQ043=(g,id)=>choose(g,'q043',id);
export function captureQ043ConditionalText(g){
 const saves=[],dispatch=g.dispatch.bind(g);
 g.dispatch=intent=>{
  const changed=dispatch(intent);
  if(g.state.waiting?.type==='text'&&[q043PreservedText,q043LostText].includes(projectGame(g).dialog.text))saves.push(g.save());
  return changed;
 };
 return saves;
}

export async function inkFireArtFixtures(){
 const fixtures=[],outcomes=new Set();
 for(const legacy of [false,true]){
  const seen=new Set();
  for(const route of legacy?q043AcceptedRoutes:q043Routes){
   const g=legacy?loadQ043(q043AcceptedEngine().save()):q043Engine(),textSaves=captureQ043ConditionalText(g);
   const observe=()=>{
    if(g.state.quests.q043.stage==='completed')return;
    const scene=legacy?g.state.flags.flow.q043.node:g.state.stories.q043.scene;
    const stopped=legacy?g.state.flags.flow.q043.stopped===true:g.state.stories.q043.values.stopped;
    const variant=(legacy?'accepted-legacy':'current')+'-'+(stopped?'preserved':scene==='entry'||scene==='valve'?'initial':'lost');
    if(seen.has(scene+'/'+variant))return;seen.add(scene+'/'+variant);
    const base={edition:'e2',quest:'q043',scene,variant,cast:[],...(legacy?{absentStoryScene:true}:{})};
    const now=loadQ043(g.save());
    if(scene==='restore'){
     // Read the conditional sentence from its actual script, then all dialogue
     // pages. Test the disabled choice separately at the stable choice wait.
     assert.ok(textSaves.length);const textSave=textSaves.at(-1),textGame=loadQ043(textSave);
     assert.equal(projectGame(textGame).dialog.text,stopped?q043PreservedText:q043LostText);
     fixtures.push({...base,save:textSave,expectedText:(stopped?q043PreservedText:q043LostText)+q043Truth,absentText:stopped?q043LostText:q043PreservedText,availableChoice:stopped?'restore':'blanks'});
     if(!stopped)fixtures.push({...base,variant:variant+'-choice',save:g.save(),expectedText:q043Truth,blockedChoice:'restore',availableChoice:'blanks'});
    }else fixtures.push({...base,save:now.save(),expectedText:projectGame(now).dialog.text,availableChoice:{entry:'copy',valve:'stop',backup:'carry',restored:'finish',blanks:'finish'}[scene]});
   };
   observe();for(const id of route.path){if(legacy){assert.ok(g.dispatch({type:'choose',id}));drain(g);}else chooseQ043(g,id);observe();}
   assert.equal(g.state.quests.q043.outcome,route.outcome);outcomes.add('e2/q043/'+route.outcome);
  }
 }
 return {fixtures,outcomes:[...outcomes]};
}
